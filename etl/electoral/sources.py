from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Callable

import pandas as pd
from sqlalchemy import text

from etl.electoral.quality import validate_geography_rows, validate_poll_rows, validate_results_frame
from etl.electoral.runtime import ElectoralIngestionRuntime, SourceOutcome
from etl.logger import get_logger
from etl.realtime.cis_monitor import CISMonitor, obtener_estudios_recientes, procesar_nuevo_estudio, ya_procesado
from etl.realtime.prensa_encuestas import (
    FUENTES as PRENSA_FUENTES,
    PrensaEncuestasScraper,
    buscar_articulos_recientes,
    insertar_en_resultados_agregados,
    procesar_articulo,
)
from etl.sources.cis_barometro import CISBarometroExtractor
from etl.sources.ine_geografia import INEGeografiaExtractor
from etl.sources.interior_resultados import CONGRESO_FECHAS, InteriorResultadosExtractor
from etl.sources.wikipedia_polls import (
    URLS as WIKIPOLL_URLS,
    _clean_party_col,
    _detect_columns,
    _ensure_casa_y_fuente,
    _ensure_pregunta_intencion,
    _fetch_tables,
    _parse_fieldwork_date,
    _parse_sample,
    _pct_to_float,
    _pick_best_table,
    _upsert_encuesta,
)

logger = get_logger(__name__)


@dataclass(frozen=True)
class SourceSpec:
    source_id: str
    source_type: str
    cadence_hours: int
    supports_incremental: bool
    refresh_strategy: str
    precedence_rank: int
    description: str
    runner: Callable[..., SourceOutcome]
def _matches_range(value: date | datetime | None, since: date | None, until: date | None) -> bool:
    if value is None:
        return since is None and until is None
    cur = value.date() if isinstance(value, datetime) else value
    if since and cur < since:
        return False
    if until and cur > until:
        return False
    return True


def _existing_count(engine, table_name: str) -> int:
    with engine.connect() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar() or 0)


def _ensure_question(conn, encuesta_id: int, texto: str = "Intención de voto (CIS)") -> int:
    row = conn.execute(
        text(
            """
            SELECT id FROM preguntas_encuesta
            WHERE encuesta_id = :encuesta_id
              AND categoria_tematica = 'intencion_voto'
            LIMIT 1
            """
        ),
        {"encuesta_id": encuesta_id},
    ).first()
    if row:
        return int(row[0])
    new_id = conn.execute(
        text(
            """
            INSERT INTO preguntas_encuesta (
                encuesta_id, texto_pregunta, categoria_tematica, tipo_respuesta
            ) VALUES (
                :encuesta_id, :texto, 'intencion_voto', 'CERRADA_UNICA'
            )
            RETURNING id
            """
        ),
        {"encuesta_id": encuesta_id, "texto": texto},
    ).scalar_one()
    return int(new_id)


def _upsert_resultado_agregado(
    conn,
    *,
    encuesta_id: int,
    pregunta_id: int,
    categoria: str,
    porcentaje: float,
    frecuencia_abs: int | None = None,
) -> tuple[int, int]:
    existing = conn.execute(
        text(
            """
            SELECT id, porcentaje, frecuencia_abs
            FROM resultados_agregados_encuesta
            WHERE encuesta_id = :encuesta_id
              AND pregunta_id = :pregunta_id
              AND categoria = :categoria
              AND COALESCE(subgrupo, '') = ''
            LIMIT 1
            """
        ),
        {
            "encuesta_id": encuesta_id,
            "pregunta_id": pregunta_id,
            "categoria": categoria,
        },
    ).mappings().first()
    if existing:
        changed = (
            float(existing["porcentaje"] or 0) != float(porcentaje)
            or int(existing["frecuencia_abs"] or 0) != int(frecuencia_abs or 0)
        )
        if changed:
            conn.execute(
                text(
                    """
                    UPDATE resultados_agregados_encuesta
                    SET porcentaje = :porcentaje,
                        frecuencia_abs = :frecuencia_abs
                    WHERE id = :id
                    """
                ),
                {
                    "id": int(existing["id"]),
                    "porcentaje": porcentaje,
                    "frecuencia_abs": frecuencia_abs,
                },
            )
            return 0, 1
        return 0, 0

    conn.execute(
        text(
            """
            INSERT INTO resultados_agregados_encuesta (
                encuesta_id, pregunta_id, categoria, porcentaje, frecuencia_abs
            ) VALUES (
                :encuesta_id, :pregunta_id, :categoria, :porcentaje, :frecuencia_abs
            )
            """
        ),
        {
            "encuesta_id": encuesta_id,
            "pregunta_id": pregunta_id,
            "categoria": categoria,
            "porcentaje": porcentaje,
            "frecuencia_abs": frecuencia_abs,
        },
    )
    return 1, 0


def _wikipedia_rows(max_rows: int | None = None) -> pd.DataFrame:
    tables = _fetch_tables(WIKIPOLL_URLS)
    df = _pick_best_table(tables)
    if df is None or df.empty:
        return pd.DataFrame()
    if isinstance(df.columns, pd.MultiIndex):
        cols = []
        for idx, col in enumerate(df.columns):
            parts = [str(part) for part in col if str(part) != "nan" and "Unnamed" not in str(part)]
            cols.append(" ".join(parts).strip() or f"_col{idx}")
        df.columns = cols

    mapping = _detect_columns(df)
    col_pollster = mapping["pollster"] or df.columns[0]
    col_date = mapping["date"]
    col_sample = mapping["sample"]
    party_cols: dict[str, str] = {}
    alias_map = {
        "PP": "PP",
        "PSOE": "PSOE",
        "VOX": "VOX",
        "SUMAR": "SUMAR",
        "SUMAR ": "SUMAR",
        "ERC": "ERC",
        "JUNTS": "JUNTS",
        "EH BILDU": "EH_BILDU",
        "PNV": "PNV",
        "BNG": "BNG",
        "CC": "CC",
        "UPN": "UPN",
    }
    for col in df.columns:
        clean = _clean_party_col(col).upper()
        if clean in alias_map:
            party_cols[col] = alias_map[clean]

    rows: list[dict[str, Any]] = []
    iterable = df.head(max_rows).iterrows() if max_rows else df.iterrows()
    for _, row in iterable:
        pollster = _clean_party_col(row.get(col_pollster))
        if not pollster or pollster.lower() in {"nan", "election", "elecciones"}:
            continue
        fieldwork_end = _parse_fieldwork_date(row.get(col_date)) if col_date else None
        published = fieldwork_end or date.today()
        sample = _parse_sample(row.get(col_sample)) if col_sample else None
        poll_key = f"{pollster}|{published.isoformat()}|{sample or 0}"
        for col, party in party_cols.items():
            pct = _pct_to_float(row.get(col))
            if pct is None:
                continue
            rows.append(
                {
                    "poll_key": poll_key,
                    "pollster": pollster,
                    "fecha_publicacion": published,
                    "fecha_campo_fin": fieldwork_end,
                    "n_entrevistas": sample,
                    "partido": party,
                    "porcentaje": pct,
                }
            )
    return pd.DataFrame(rows)


def _cycles_for_mode(config, mode: str, since: date | None, until: date | None) -> tuple[tuple[int, int], ...]:
    base = config.full_elections if mode == "full" else config.daily_elections
    if not since and not until:
        return base
    selected = []
    for cycle in base:
        elec_date = CONGRESO_FECHAS[cycle][0]
        if _matches_range(elec_date, since, until):
            selected.append(cycle)
    return tuple(selected)


def run_ine_geografia_source(
    engine,
    runtime: ElectoralIngestionRuntime,
    config,
    *,
    run_id: str,
    mode: str,
    since: date | None,
    until: date | None,
) -> SourceOutcome:
    del since, until
    watermark_before = runtime.get_watermark("ine_geografia")
    previous_metrics = runtime.previous_success_metrics("ine_geografia")
    extractor = INEGeografiaExtractor()
    raw = extractor.extract()
    snapshot_path = runtime.snapshot_json(run_id, "ine_geografia", raw)
    clean = extractor.transform(raw)
    combined = []
    for level, frame in clean.items():
        tmp = frame.copy()
        tmp["level"] = level
        combined.append(tmp)
    combined_df = pd.concat(combined, ignore_index=True, sort=False) if combined else pd.DataFrame()
    report = validate_geography_rows(
        combined_df,
        config.volume_drop_warn_pct,
        previous_metrics=previous_metrics,
    )
    before = sum(_existing_count(engine, table) for table in ("comunidades_autonomas", "provincias", "municipios"))
    extractor.load_to_db(clean)
    after = sum(_existing_count(engine, table) for table in ("comunidades_autonomas", "provincias", "municipios"))
    records_read = int(len(combined_df))
    inserted = max(after - before, 0)
    updated = max(records_read - inserted, 0)
    warnings = [
        {
            "code": issue.code,
            "message": issue.message,
            "observed": issue.observed,
            "threshold": issue.threshold,
        }
        for issue in report.warnings
    ]
    errors = [
        {
            "code": issue.code,
            "message": issue.message,
            "observed": issue.observed,
            "threshold": issue.threshold,
        }
        for issue in report.issues
        if issue.level == "error"
    ]
    return SourceOutcome(
        source_id="ine_geografia",
        status="success" if not errors else "warning",
        records_read=records_read,
        records_inserted=inserted,
        records_updated=updated,
        warnings=warnings,
        errors=errors,
        validation=report.to_jsonable(),
        raw_snapshot_path=snapshot_path,
        watermark_before=watermark_before,
        watermark_after=date.today().isoformat(),
        extra_metrics={
            "metrics": {
                "ccaa_rows": int(len(clean["ccaa"])),
                "prov_rows": int(len(clean["provincias"])),
                "muni_rows": int(len(clean["municipios"])),
            }
        },
    )


def run_interior_results_source(
    engine,
    runtime: ElectoralIngestionRuntime,
    config,
    *,
    run_id: str,
    mode: str,
    since: date | None,
    until: date | None,
) -> SourceOutcome:
    cycles = _cycles_for_mode(config, mode, since, until)
    if not cycles:
        return SourceOutcome.skipped("interior_resultados", "No hay ciclos electorales en el rango solicitado")

    watermark_before = runtime.get_watermark("interior_resultados")
    previous_metrics = runtime.previous_success_metrics("interior_resultados")
    raw_frames: list[pd.DataFrame] = []
    read_rows = 0
    inserted_total = 0
    updated_total = 0
    dedup_total = 0
    warnings: list[dict[str, Any]] = []
    validation_payloads: list[dict[str, Any]] = []

    for year, month in cycles:
        extractor = InteriorResultadosExtractor(año=year, mes=month)
        raw_df = extractor.extract()
        clean_df = extractor.transform(raw_df)
        raw_df = raw_df.copy()
        raw_df["election_cycle"] = f"{year}:{month:02d}"
        raw_frames.append(raw_df)
        before_n = 0
        before_votes = 0
        with engine.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT COUNT(*), COALESCE(SUM(re.votos), 0)
                    FROM resultados_electorales re
                    JOIN elecciones e ON e.id = re.eleccion_id
                    WHERE e.fecha = :fecha AND e.vuelta = :vuelta
                    """
                ),
                {"fecha": extractor.fecha_eleccion, "vuelta": extractor.vuelta},
            ).first()
            if row:
                before_n = int(row[0] or 0)
                before_votes = int(row[1] or 0)

        before_unique = len(clean_df)
        clean_df = clean_df.drop_duplicates(
            subset=["codigo_provincia", "codigo_partido", "fecha_eleccion"],
            keep="last",
        )
        dedup_total += before_unique - len(clean_df)
        report = validate_results_frame(
            clean_df,
            config.volume_drop_warn_pct,
            previous_metrics=previous_metrics,
        )
        validation_payloads.append(report.to_jsonable())
        extractor.load_to_db(clean_df)
        with engine.connect() as conn:
            after = conn.execute(
                text(
                    """
                    SELECT COUNT(*), COALESCE(SUM(re.votos), 0)
                    FROM resultados_electorales re
                    JOIN elecciones e ON e.id = re.eleccion_id
                    WHERE e.fecha = :fecha AND e.vuelta = :vuelta
                    """
                ),
                {"fecha": extractor.fecha_eleccion, "vuelta": extractor.vuelta},
            ).first()
        after_n = int(after[0] or 0) if after else 0
        after_votes = int(after[1] or 0) if after else 0
        inserted = max(after_n - before_n, 0)
        updated = max(len(clean_df) - inserted, 0)
        if before_votes > 0:
            delta_votes = abs(after_votes - before_votes) / max(before_votes, 1)
            if delta_votes > config.results_change_warn_pct:
                warnings.append(
                    {
                        "code": "results_changed",
                        "message": f"Cambios detectados en resultados oficiales {year}:{month:02d}",
                        "observed": round(delta_votes, 6),
                        "threshold": config.results_change_warn_pct,
                    }
                )
        warnings.extend(
            {
                "code": issue.code,
                "message": issue.message,
                "observed": issue.observed,
                "threshold": issue.threshold,
            }
            for issue in report.warnings
        )
        read_rows += int(len(clean_df))
        inserted_total += inserted
        updated_total += updated

    snapshot_path = runtime.snapshot_frame(
        run_id,
        "interior_resultados",
        pd.concat(raw_frames, ignore_index=True, sort=False) if raw_frames else pd.DataFrame(),
    )
    return SourceOutcome(
        source_id="interior_resultados",
        status="success",
        records_read=read_rows,
        records_inserted=inserted_total,
        records_updated=updated_total,
        records_deduplicated=dedup_total,
        warnings=warnings,
        validation={"reports": validation_payloads},
        raw_snapshot_path=snapshot_path,
        watermark_before=watermark_before,
        watermark_after=max(CONGRESO_FECHAS[cycle][0] for cycle in cycles).isoformat(),
        extra_metrics={"metrics": {"cycles": [f"{y}:{m:02d}" for y, m in cycles]}},
    )


def run_wikipedia_polls_source(
    engine,
    runtime: ElectoralIngestionRuntime,
    config,
    *,
    run_id: str,
    mode: str,
    since: date | None,
    until: date | None,
) -> SourceOutcome:
    del mode
    watermark_before = runtime.get_watermark("wikipedia_polls")
    previous_metrics = runtime.previous_success_metrics("wikipedia_polls")
    rows = _wikipedia_rows()
    if rows.empty:
        return SourceOutcome(
            source_id="wikipedia_polls",
            status="warning",
            warnings=[{"code": "no_rows", "message": "Wikipedia no devolvió tablas útiles"}],
            watermark_before=watermark_before,
        )
    if since or until:
        rows = rows[
            rows["fecha_publicacion"].apply(lambda value: _matches_range(value, since, until))
        ].copy()
    before_len = len(rows)
    rows = rows.drop_duplicates(subset=["poll_key", "partido"], keep="last").reset_index(drop=True)
    deduped = before_len - len(rows)
    snapshot_path = runtime.snapshot_frame(run_id, "wikipedia_polls", rows)
    report = validate_poll_rows(
        rows,
        config.volume_drop_warn_pct,
        previous_metrics=previous_metrics,
    )
    inserted = 0
    updated = 0
    with engine.begin() as conn:
        grouped = rows.groupby("poll_key", sort=False)
        for _, group in grouped:
            first = group.iloc[0]
            _, fuente_id = _ensure_casa_y_fuente(engine, str(first["pollster"]))
            if fuente_id is None:
                continue
            encuesta_id = _upsert_encuesta(
                engine,
                fuente_id,
                first["fecha_campo_fin"],
                first["fecha_publicacion"],
                int(first["n_entrevistas"]) if pd.notna(first["n_entrevistas"]) else None,
            )
            if encuesta_id is None:
                continue
            pregunta_id = _ensure_pregunta_intencion(engine, encuesta_id)
            for _, item in group.iterrows():
                ins, upd = _upsert_resultado_agregado(
                    conn,
                    encuesta_id=encuesta_id,
                    pregunta_id=pregunta_id,
                    categoria=str(item["partido"]),
                    porcentaje=float(item["porcentaje"]),
                    frecuencia_abs=0,
                )
                inserted += ins
                updated += upd
    warnings = [
        {
            "code": issue.code,
            "message": issue.message,
            "observed": issue.observed,
            "threshold": issue.threshold,
        }
        for issue in report.warnings
    ]
    errors = [
        {
            "code": issue.code,
            "message": issue.message,
            "observed": issue.observed,
            "threshold": issue.threshold,
        }
        for issue in report.issues
        if issue.level == "error"
    ]
    max_date = rows["fecha_publicacion"].max()
    return SourceOutcome(
        source_id="wikipedia_polls",
        status="success" if not errors else "warning",
        records_read=int(len(rows)),
        records_inserted=inserted,
        records_updated=updated,
        records_deduplicated=deduped,
        warnings=warnings,
        errors=errors,
        validation=report.to_jsonable(),
        raw_snapshot_path=snapshot_path,
        watermark_before=watermark_before,
        watermark_after=max_date.isoformat() if pd.notna(max_date) else None,
        extra_metrics={"metrics": {"polls": int(rows["poll_key"].nunique())}},
    )


def _materialize_cis_polls(engine, study_rows: list[dict[str, Any]]) -> tuple[int, int, int, list[dict[str, Any]], pd.DataFrame]:
    inserted = 0
    updated = 0
    microdata_rows = 0
    warnings: list[dict[str, Any]] = []
    poll_rows: list[dict[str, Any]] = []
    if not study_rows:
        return inserted, updated, microdata_rows, warnings, pd.DataFrame()

    with engine.begin() as conn:
        for row in study_rows:
            path_str = str(row.get("url_microdatos") or "").strip()
            if not path_str:
                warnings.append(
                    {
                        "code": "missing_microdata_path",
                        "message": f"El estudio CIS {row['numero_estudio']} no tiene ruta a microdatos",
                    }
                )
                continue
            path = Path(path_str)
            if not path.exists():
                warnings.append(
                    {
                        "code": "microdata_not_found",
                        "message": f"No se encontró el fichero SAV para {row['numero_estudio']}",
                    }
                )
                continue
            try:
                extractor = CISBarometroExtractor(str(row["numero_estudio"]), path)
                df = extractor.transform(extractor.extract())
            except Exception as exc:
                warnings.append(
                    {
                        "code": "microdata_parse_failed",
                        "message": f"Error parseando microdatos CIS {row['numero_estudio']}: {exc}",
                    }
                )
                continue
            if df.empty or "intencion_voto" not in df.columns:
                warnings.append(
                    {
                        "code": "missing_vote_intention",
                        "message": f"El estudio CIS {row['numero_estudio']} no expone intención de voto usable",
                    }
                )
                continue
            weights = pd.to_numeric(df.get("peso_muestral"), errors="coerce").fillna(1.0)
            votes = df["intencion_voto"].astype(str).str.strip()
            valid = votes.ne("") & votes.notna() & ~votes.isin({"nan", "NS", "NC", "NINGUNO"})
            grouped = (
                pd.DataFrame({"partido": votes[valid], "peso": weights[valid]})
                .groupby("partido", as_index=False)["peso"]
                .sum()
            )
            if grouped.empty:
                continue
            total = float(grouped["peso"].sum())
            grouped["porcentaje"] = grouped["peso"] / max(total, 1.0) * 100.0
            pregunta_id = _ensure_question(conn, int(row["id"]))
            for _, item in grouped.iterrows():
                poll_rows.append(
                    {
                        "poll_key": f"cis|{row['numero_estudio']}",
                        "partido": str(item["partido"]),
                        "fecha_publicacion": row.get("fecha_publicacion"),
                        "porcentaje": round(float(item["porcentaje"]), 3),
                    }
                )
                ins, upd = _upsert_resultado_agregado(
                    conn,
                    encuesta_id=int(row["id"]),
                    pregunta_id=pregunta_id,
                    categoria=str(item["partido"]),
                    porcentaje=round(float(item["porcentaje"]), 3),
                    frecuencia_abs=int(round(float(item["peso"]))),
                )
                inserted += ins
                updated += upd
            microdata_rows += int(len(df))
    return inserted, updated, microdata_rows, warnings, pd.DataFrame(poll_rows)


def run_cis_monitor_source(
    engine,
    runtime: ElectoralIngestionRuntime,
    config,
    *,
    run_id: str,
    mode: str,
    since: date | None,
    until: date | None,
) -> SourceOutcome:
    del mode
    watermark_before = runtime.get_watermark("cis_monitor")
    previous_metrics = runtime.previous_success_metrics("cis_monitor")
    scraper = CISMonitor("cis_monitor", engine)
    studies = obtener_estudios_recientes(scraper, n_paginas=2)
    snapshot_path = runtime.snapshot_json(run_id, "cis_monitor", studies)
    new_detected = 0
    skipped = 0
    for study in studies:
        numero = str(study.get("numero_estudio") or "")
        if not numero:
            continue
        if ya_procesado(numero, engine):
            skipped += 1
            continue
        try:
            if procesar_nuevo_estudio(numero, study.get("titulo") or "", study.get("url_datos") or "", scraper):
                new_detected += 1
        except Exception as exc:
            logger.warning("No se pudo procesar estudio CIS %s: %s", numero, exc)
    with engine.connect() as conn:
        query = text(
            """
            SELECT enc.id, enc.numero_estudio, enc.fecha_publicacion, enc.url_microdatos
            FROM encuestas enc
            JOIN fuentes_encuesta fe ON fe.id = enc.fuente_id
            WHERE fe.nombre = 'CIS'
              AND enc.disponible_microdatos = true
            ORDER BY enc.fecha_publicacion DESC NULLS LAST, enc.id DESC
            """
        )
        study_rows = [dict(row) for row in conn.execute(query).mappings()]
    if since or until:
        study_rows = [
            row
            for row in study_rows
            if _matches_range(row.get("fecha_publicacion"), since, until)
        ]
    inserted, updated, microdata_rows, materialize_warnings, poll_df = _materialize_cis_polls(engine, study_rows)
    report = (
        validate_poll_rows(
            poll_df,
            config.volume_drop_warn_pct,
            previous_metrics=previous_metrics,
        )
        if not poll_df.empty
        else None
    )
    warnings = [{"code": "studies_skipped", "message": f"Estudios ya existentes: {skipped}"}]
    warnings.extend(materialize_warnings)
    if report:
        warnings.extend(
            {
                "code": issue.code,
                "message": issue.message,
                "observed": issue.observed,
                "threshold": issue.threshold,
            }
            for issue in report.warnings
        )
    max_date = None
    if study_rows:
        parsed_dates = [row.get("fecha_publicacion") for row in study_rows if row.get("fecha_publicacion")]
        if parsed_dates:
            max_date = max(parsed_dates)
    return SourceOutcome(
        source_id="cis_monitor",
        status="success",
        records_read=int(len(poll_df) if not poll_df.empty else len(study_rows)),
        records_inserted=inserted + new_detected,
        records_updated=updated,
        warnings=warnings,
        validation=report.to_jsonable() if report else {},
        raw_snapshot_path=snapshot_path,
        watermark_before=watermark_before,
        watermark_after=max_date.isoformat() if max_date else None,
        extra_metrics={
            "metrics": {
                "studies_detected": len(studies),
                "studies_new": new_detected,
                "microdata_rows": microdata_rows,
            }
        },
    )


def run_prensa_encuestas_source(
    engine,
    runtime: ElectoralIngestionRuntime,
    config,
    *,
    run_id: str,
    mode: str,
    since: date | None,
    until: date | None,
) -> SourceOutcome:
    del mode
    watermark_before = runtime.get_watermark("prensa_encuestas")
    previous_metrics = runtime.previous_success_metrics("prensa_encuestas")
    scraper = PrensaEncuestasScraper("prensa_encuestas", engine)
    raw_articles: list[dict[str, Any]] = []
    processed_rows: list[dict[str, Any]] = []
    before_tracking = _existing_count(engine, "encuestas_tracking")
    for fuente in PRENSA_FUENTES:
        for article in buscar_articulos_recientes(fuente, scraper, dias=7):
            if _matches_range(article.get("fecha_publicacion"), since, until):
                raw_articles.append(article)
                parsed = procesar_articulo(article, scraper)
                if parsed:
                    processed_rows.append(parsed)
    snapshot_path = runtime.snapshot_json(run_id, "prensa_encuestas", raw_articles)
    with engine.connect() as conn:
        ids = [
            int(row[0])
            for row in conn.execute(
                text(
                    """
                    SELECT id
                    FROM encuestas_tracking
                    WHERE procesada = false
                      AND confianza_parseo >= 0.5
                    ORDER BY id
                    """
                )
            )
        ]
    materialized = 0
    for tracking_id in ids:
        try:
            if insertar_en_resultados_agregados(tracking_id, engine):
                materialized += 1
        except Exception as exc:
            logger.warning("No se pudo materializar encuesta de prensa %s: %s", tracking_id, exc)
    after_tracking = _existing_count(engine, "encuestas_tracking")
    normalized_rows: list[dict[str, Any]] = []
    for row in processed_rows:
        try:
            party_map = json.loads(row.get("partido_datos_json") or "{}")
        except Exception:
            party_map = {}
        for party, pct in party_map.items():
            normalized_rows.append(
                {
                    "poll_key": str(row.get("url") or ""),
                    "partido": str(party),
                    "fecha_publicacion": row.get("fecha_publicacion"),
                    "porcentaje": float(pct),
                }
            )
    normalized_df = pd.DataFrame(normalized_rows)
    report = (
        validate_poll_rows(
            normalized_df,
            config.volume_drop_warn_pct,
            previous_metrics=previous_metrics,
        )
        if not normalized_df.empty
        else None
    )
    max_date = None
    if raw_articles:
        max_date = max(article.get("fecha_publicacion") for article in raw_articles if article.get("fecha_publicacion"))
    return SourceOutcome(
        source_id="prensa_encuestas",
        status="success",
        records_read=int(len(normalized_df) if not normalized_df.empty else len(raw_articles)),
        records_inserted=max(after_tracking - before_tracking, 0),
        records_updated=max(len(processed_rows) - max(after_tracking - before_tracking, 0), 0),
        warnings=[
            {
                "code": "polls_materialized",
                "message": f"Encuestas de prensa materializadas en modelo interno: {materialized}",
            }
        ],
        validation=report.to_jsonable() if report else {},
        raw_snapshot_path=snapshot_path,
        watermark_before=watermark_before,
        watermark_after=max_date.isoformat() if max_date else None,
        extra_metrics={"metrics": {"articles_seen": len(raw_articles), "materialized": materialized}},
    )


def refresh_nowcasting(engine) -> dict[str, Any]:
    from models.estadisticos.nowcasting import agregar_encuestas, cargar_encuestas_bd, guardar_estimaciones

    raw = cargar_encuestas_bd(engine)
    if raw.empty:
        return {"ok": False, "reason": "sin_encuestas"}
    est = agregar_encuestas(raw)
    guardar_estimaciones(est, engine)
    return {
        "ok": True,
        "encuestas": int(len(raw)),
        "partidos_estimados": int(len(est)),
    }


SOURCES: tuple[SourceSpec, ...] = (
    SourceSpec(
        source_id="ine_geografia",
        source_type="electoral",
        cadence_hours=24 * 7,
        supports_incremental=False,
        refresh_strategy="full_refresh_controlled",
        precedence_rank=100,
        description="Geografía INE. Fuente oficial para territorios y claves de agregación.",
        runner=run_ine_geografia_source,
    ),
    SourceSpec(
        source_id="interior_resultados",
        source_type="electoral",
        cadence_hours=24,
        supports_incremental=False,
        refresh_strategy="full_refresh_controlled",
        precedence_rank=100,
        description="Resultados oficiales del Ministerio del Interior. Fuente prioritaria para voto/escaños.",
        runner=run_interior_results_source,
    ),
    SourceSpec(
        source_id="wikipedia_polls",
        source_type="electoral",
        cadence_hours=24,
        supports_incremental=False,
        refresh_strategy="full_refresh_controlled",
        precedence_rank=60,
        description="Encuestas publicadas agregadas en Wikipedia. Complementa, nunca sustituye, a CIS.",
        runner=run_wikipedia_polls_source,
    ),
    SourceSpec(
        source_id="cis_monitor",
        source_type="electoral",
        cadence_hours=24,
        supports_incremental=True,
        refresh_strategy="incremental",
        precedence_rank=90,
        description="Monitor CIS con microdatos oficiales cuando están disponibles.",
        runner=run_cis_monitor_source,
    ),
    SourceSpec(
        source_id="prensa_encuestas",
        source_type="electoral",
        cadence_hours=24,
        supports_incremental=True,
        refresh_strategy="incremental",
        precedence_rank=30,
        description="Encuestas citadas por prensa. Solo complemento de menor precedencia.",
        runner=run_prensa_encuestas_source,
    ),
)


def source_registry() -> dict[str, SourceSpec]:
    return {spec.source_id: spec for spec in SOURCES}
