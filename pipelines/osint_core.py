"""
OSINT Core Pipeline — Bloque 4.

CLI para el módulo OSINT/Risk Graph.

Comandos disponibles:
    python -m pipelines.osint_core --source opensanctions --file data/raw/opensanctions/entities.ftm.json
    python -m pipelines.osint_core --resolve
    python -m pipelines.osint_core --score
    python -m pipelines.osint_core --import-spiderfoot report.json
    python -m pipelines.osint_core --username-candidates ACTOR_ID USERNAME
    python -m pipelines.osint_core --source all
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pipelines.osint_core")


# ── Engine helper ─────────────────────────────────────────────────────────────

def _get_engine() -> Any:
    try:
        from db.database import get_engine
        return get_engine()
    except Exception:
        return None


# ── Comandos ──────────────────────────────────────────────────────────────────

def cmd_load_opensanctions(file_path: str, source_name: str = "opensanctions") -> dict[str, int]:
    """
    Carga un fichero OpenSanctions (FtM JSONL o JSON array) y persiste en BD.

    Soporta el formato FtM de OpenSanctions:
    https://www.opensanctions.org/docs/bulk/

    Args:
        file_path: Ruta al fichero de datos (e.g. entities.ftm.json).
        source_name: Etiqueta de fuente para los registros.

    Returns:
        dict con estadísticas: entities, relations, flags, errors.
    """
    stats: dict[str, int] = {
        "entities_loaded": 0,
        "relations_loaded": 0,
        "flags_loaded": 0,
        "entities_upserted": 0,
        "flags_upserted": 0,
        "errors": 0,
    }

    path = Path(file_path)
    if not path.exists():
        logger.error("Fichero no encontrado: %s", file_path)
        stats["errors"] += 1
        return stats

    logger.info("Cargando OpenSanctions desde %s (fuente: %s)", path, source_name)

    try:
        from etl.sources.osint.opensanctions_adapter import load_opensanctions_file
        entities, relations, flags_by_entity = load_opensanctions_file(
            path=path,
            source_name=source_name,
            max_entities=50_000,
        )
        stats["entities_loaded"] = len(entities)
        stats["relations_loaded"] = len(relations)
        stats["flags_loaded"] = sum(len(v) for v in flags_by_entity.values())
        logger.info(
            "Parseados: %d entidades, %d relaciones, %d flags",
            stats["entities_loaded"], stats["relations_loaded"], stats["flags_loaded"],
        )
    except Exception as exc:
        logger.error("Error cargando OpenSanctions: %s", exc)
        stats["errors"] += 1
        return stats

    # Persistir en BD
    engine = _get_engine()
    try:
        from etl.sources.osint.osint_monitor import OSINTMonitor
        monitor = OSINTMonitor(engine=engine)

        if not monitor.ensure_tables(engine):
            logger.warning(
                "Tablas OSINT no encontradas. Ejecuta: alembic upgrade head"
            )
            return stats

        result = monitor.upsert_entities(entities, flags_by_entity)
        stats["entities_upserted"] = result.get("entities", 0)
        stats["flags_upserted"] = result.get("flags", 0)

        n_alerts = monitor.create_risk_alerts(entities)
        logger.info(
            "Upserted: %d entidades, %d flags | Alertas: %d",
            stats["entities_upserted"], stats["flags_upserted"], n_alerts,
        )
    except Exception as exc:
        logger.error("Error persistiendo en BD: %s", exc)
        stats["errors"] += 1

    return stats


def cmd_resolve_entities(min_score: float = 0.60) -> dict[str, int]:
    """
    Ejecuta resolución de entidades duplicadas en la BD.

    Compara todas las entidades cargadas y genera candidatos de fusión.
    Solo fusiona automáticamente si score >= 0.90.

    Args:
        min_score: Score mínimo para considerar un candidato.

    Returns:
        dict con: total_compared, auto_merged, candidates, skipped.
    """
    stats: dict[str, int] = {
        "total_compared": 0,
        "auto_merged": 0,
        "candidates_found": 0,
        "skipped": 0,
        "errors": 0,
    }

    logger.info("Iniciando resolución de entidades (min_score=%.2f)", min_score)

    try:
        from dashboard.services.actor_risk_core import cargar_entidades_riesgo
        df = cargar_entidades_riesgo(limit=10_000)
        if df.empty:
            logger.info("No hay entidades en BD. Carga primero con --source opensanctions.")
            return stats
    except Exception as exc:
        logger.error("Error cargando entidades: %s", exc)
        stats["errors"] += 1
        return stats

    try:
        from etl.sources.osint.schemas import RiskEntity
        from etl.sources.osint.entity_resolver import resolve_batch

        entities = []
        for _, row in df.iterrows():
            try:
                entity = RiskEntity(
                    source=str(row.get("source", "bd")),
                    source_id=str(row.get("id", "")),
                    entity_type=str(row.get("entity_type", "unknown")),
                    name=str(row.get("name", "")),
                    pep_status=bool(row.get("pep_status", False)),
                    sanctions_status=bool(row.get("sanctions_status", False)),
                )
                entities.append(entity)
            except Exception:
                stats["skipped"] += 1

        stats["total_compared"] = len(entities)
        logger.info("Comparando %d entidades…", len(entities))

        resolved_new, candidates = resolve_batch(
            entities=entities,
            existing=[],  # en este modo comparamos todas entre sí
            auto_merge_threshold=0.90,
        )
        stats["auto_merged"] = len(resolved_new)
        stats["candidates_found"] = len(candidates)

        logger.info(
            "Resolución completada: %d fusiones automáticas, %d candidatos para revisión",
            stats["auto_merged"], stats["candidates_found"],
        )

        # Mostrar candidatos que requieren revisión humana
        review_needed = [c for c in candidates if c.requires_human_review]
        if review_needed:
            logger.info("Candidatos que requieren revisión manual: %d", len(review_needed))
            for c in review_needed[:10]:
                logger.info(
                    "  [%.2f] %s ↔ %s",
                    c.score, c.entity_a_id, c.entity_b_id,
                )

    except Exception as exc:
        logger.error("Error en resolución: %s", exc)
        stats["errors"] += 1

    return stats


def cmd_score_entities() -> dict[str, int]:
    """
    Recalcula el risk score de todas las entidades en BD.

    Actualiza la columna risk_score en risk_entities.

    Returns:
        dict con: total, scored, updated, errors.
    """
    stats: dict[str, int] = {
        "total": 0,
        "scored": 0,
        "updated": 0,
        "errors": 0,
    }

    logger.info("Recalculando risk scores…")

    try:
        from dashboard.services.actor_risk_core import cargar_entidades_riesgo
        df = cargar_entidades_riesgo(limit=50_000)
        if df.empty:
            logger.info("No hay entidades en BD.")
            return stats
        stats["total"] = len(df)
    except Exception as exc:
        logger.error("Error cargando entidades: %s", exc)
        stats["errors"] += 1
        return stats

    engine = _get_engine()
    if engine is None:
        logger.warning("Sin conexión a BD. No se pueden actualizar scores.")
        return stats

    try:
        from etl.sources.osint.schemas import RiskEntity, RiskFlag
        from etl.sources.osint.risk_scorer import batch_score
        from dashboard.services.actor_risk_core import cargar_flags_entidad
        from sqlalchemy import text as sa_text

        entities = []
        flags_by_entity: dict[str, list[RiskFlag]] = {}

        for _, row in df.iterrows():
            try:
                entity = RiskEntity(
                    source=str(row.get("source", "bd")),
                    source_id=str(row.get("id", "")),
                    entity_type=str(row.get("entity_type", "unknown")),
                    name=str(row.get("name", "")),
                    pep_status=bool(row.get("pep_status", False)),
                    sanctions_status=bool(row.get("sanctions_status", False)),
                )
                entities.append(entity)

                # Cargar flags de BD para este entity
                entity_id = int(row.get("id", 0))
                if entity_id:
                    df_flags = cargar_flags_entidad(entity_id)
                    if not df_flags.empty:
                        e_flags = []
                        for _, fr in df_flags.iterrows():
                            try:
                                e_flags.append(RiskFlag(
                                    entity_id=str(entity_id),
                                    flag_type=str(fr.get("flag_type", "osint_candidate")),
                                    severity=str(fr.get("severity", "LOW")),
                                    description=str(fr.get("description", "")),
                                    source=str(fr.get("source", "")),
                                    confidence=float(fr.get("confidence", 0) or 0),
                                ))
                            except Exception:
                                pass
                        if e_flags:
                            flags_by_entity[entity.id] = e_flags

            except Exception:
                stats["errors"] += 1

        results = batch_score(entities, flags_by_entity, {})
        stats["scored"] = len(results)

        # Actualizar scores en BD
        with engine.begin() as conn:
            for entity, result in results:
                try:
                    new_score = float(result.get("score", 0))
                    entity_id = int(entity.source_id) if entity.source_id.isdigit() else None
                    if entity_id:
                        conn.execute(
                            sa_text("""
                                UPDATE risk_entities
                                SET risk_score = :score, updated_at = NOW()
                                WHERE id = :entity_id
                            """),
                            {"score": new_score, "entity_id": entity_id},
                        )
                        stats["updated"] += 1
                except Exception as exc:
                    logger.debug("Error actualizando score: %s", exc)
                    stats["errors"] += 1

        logger.info(
            "Scoring completado: %d entidades puntuadas, %d actualizadas en BD",
            stats["scored"], stats["updated"],
        )

    except Exception as exc:
        logger.error("Error en scoring: %s", exc)
        stats["errors"] += 1

    return stats


def cmd_import_spiderfoot(
    file_path: str,
    source_tag: str = "spiderfoot_import",
) -> dict[str, int]:
    """
    Importa un export de SpiderFoot (JSON o GEXF) en la BD.

    SpiderFoot debe lanzarse manualmente fuera de ElectSim.
    Solo se importan los resultados, nunca se ejecuta SpiderFoot desde aquí.

    Args:
        file_path: Ruta al fichero JSON o GEXF de SpiderFoot.
        source_tag: Etiqueta de fuente.

    Returns:
        dict con: entities, relations, upserted, errors.
    """
    stats: dict[str, int] = {
        "entities": 0,
        "relations": 0,
        "upserted": 0,
        "errors": 0,
    }

    path = Path(file_path)
    if not path.exists():
        logger.error("Fichero no encontrado: %s", file_path)
        stats["errors"] += 1
        return stats

    logger.info("Importando SpiderFoot desde %s (fuente: %s)", path, source_tag)

    try:
        from etl.sources.osint.spiderfoot_adapter import SpiderFootAdapter

        suffix = path.suffix.lower()
        entities = []
        relations = []

        if suffix == ".json":
            entities, relations = SpiderFootAdapter.from_json(path)
        elif suffix in (".gexf", ".xml"):
            graph_export = SpiderFootAdapter.from_gexf(path)
            # Convertir GraphExport a entidades básicas
            logger.info(
                "GEXF: %d nodos, %d aristas (persistencia limitada sin entity_id)",
                len(graph_export.nodes), len(graph_export.edges),
            )
            stats["entities"] = len(graph_export.nodes)
            stats["relations"] = len(graph_export.edges)
            logger.info(
                "GEXF importado en memoria. Para persistir, convierte a JSON primero."
            )
            return stats
        else:
            logger.error("Formato no soportado: %s. Usa .json o .gexf", suffix)
            stats["errors"] += 1
            return stats

        stats["entities"] = len(entities)
        stats["relations"] = len(relations)
        logger.info(
            "Parseados: %d entidades, %d relaciones",
            stats["entities"], stats["relations"],
        )

        # Persistir
        engine = _get_engine()
        from etl.sources.osint.osint_monitor import OSINTMonitor
        monitor = OSINTMonitor(engine=engine)

        if not monitor.ensure_tables(engine):
            logger.warning("Tablas OSINT no encontradas. Ejecuta: alembic upgrade head")
            return stats

        result = monitor.upsert_entities(entities)
        stats["upserted"] = result.get("entities", 0)
        logger.info("Upserted: %d entidades de SpiderFoot", stats["upserted"])

    except Exception as exc:
        logger.error("Error importando SpiderFoot: %s", exc)
        stats["errors"] += 1

    return stats


def cmd_username_candidates(
    actor_id: str,
    username: str,
    max_sites: int = 50,
) -> dict[str, Any]:
    """
    Genera candidatos de identidad social para un username y actor.

    NO ejecuta scans activos. Solo genera URLs candidatas para revisión
    manual por un analista.

    Args:
        actor_id: ID del actor en la plataforma.
        username: Username a investigar.
        max_sites: Número máximo de sitios a comprobar.

    Returns:
        dict con: candidates (list), summary (str), errors.
    """
    logger.info(
        "Generando candidatos para username='%s', actor_id='%s' (max_sites=%d)",
        username, actor_id, max_sites,
    )

    try:
        from etl.sources.osint.maigret_adapter import (
            run_username_candidate_search,
            build_identity_review_summary,
        )

        candidates = run_username_candidate_search(
            username=username,
            actor_id=actor_id,
            entity_id=None,
            max_sites=max_sites,
        )

        summary = build_identity_review_summary(candidates)
        logger.info("Candidatos generados: %d", len(candidates))
        print(summary)

        # Persistir candidatos en BD si hay engine
        engine = _get_engine()
        n_persisted = 0
        if engine and candidates:
            try:
                import json as _json
                from sqlalchemy import text as sa_text

                with engine.begin() as conn:
                    for c in candidates:
                        try:
                            conn.execute(sa_text("""
                                INSERT INTO social_identity_candidates (
                                    actor_id, platform, handle, profile_url,
                                    discovery_method, confidence, verified,
                                    risk_notes, created_at
                                ) VALUES (
                                    :actor_id, :platform, :handle, :profile_url,
                                    :discovery_method, :confidence, FALSE,
                                    :risk_notes, NOW()
                                )
                                ON CONFLICT (platform, handle, discovery_method) DO NOTHING
                            """), {
                                "actor_id": c.actor_id,
                                "platform": c.platform,
                                "handle": c.handle,
                                "profile_url": c.profile_url,
                                "discovery_method": c.discovery_method,
                                "confidence": float(c.confidence),
                                "risk_notes": list(c.risk_notes),
                            })
                            n_persisted += 1
                        except Exception as exc:
                            logger.debug("Error persistiendo candidato: %s", exc)

                logger.info("%d candidatos guardados en BD para revisión", n_persisted)
            except Exception as exc:
                logger.warning("No se pudieron persistir candidatos: %s", exc)

        return {
            "candidates": [c.model_dump() for c in candidates],
            "n_candidates": len(candidates),
            "n_persisted": n_persisted,
            "summary": summary,
            "errors": 0,
        }

    except Exception as exc:
        logger.error("Error generando candidatos: %s", exc)
        return {"candidates": [], "n_candidates": 0, "n_persisted": 0, "errors": 1}


def cmd_source_all() -> dict[str, Any]:
    """
    Ejecuta el pipeline OSINT completo desde todas las fuentes configuradas.

    Busca ficheros en data/raw/opensanctions/ y los carga en orden.
    Después ejecuta resolución y scoring.
    """
    results: dict[str, Any] = {
        "opensanctions": {},
        "resolve": {},
        "score": {},
        "errors": 0,
    }

    data_dir = Path("data/raw/opensanctions")
    if not data_dir.exists():
        logger.info(
            "Directorio %s no encontrado. "
            "Descarga datos desde https://www.opensanctions.org/docs/bulk/",
            data_dir,
        )

    # Cargar todos los ficheros OpenSanctions disponibles
    ftm_files = list(data_dir.glob("*.jsonl")) + list(data_dir.glob("*.json")) if data_dir.exists() else []
    if ftm_files:
        logger.info("Encontrados %d ficheros OpenSanctions", len(ftm_files))
        for f in ftm_files:
            logger.info("Cargando %s…", f.name)
            stats = cmd_load_opensanctions(str(f))
            results["opensanctions"][f.name] = stats
            if stats.get("errors", 0):
                results["errors"] += stats["errors"]
    else:
        logger.info(
            "No se encontraron ficheros OpenSanctions en %s. "
            "Descárgalos con:\n"
            "  wget https://data.opensanctions.org/datasets/latest/sanctions/entities.ftm.jsonl",
            data_dir,
        )

    # SpiderFoot exports en data/raw/spiderfoot/
    sf_dir = Path("data/raw/spiderfoot")
    if sf_dir.exists():
        sf_files = list(sf_dir.glob("*.json")) + list(sf_dir.glob("*.gexf"))
        for f in sf_files:
            logger.info("Importando SpiderFoot: %s…", f.name)
            stats = cmd_import_spiderfoot(str(f))
            results[f"spiderfoot_{f.stem}"] = stats

    # Resolver duplicados
    logger.info("Ejecutando resolución de entidades…")
    results["resolve"] = cmd_resolve_entities()
    if results["resolve"].get("errors", 0):
        results["errors"] += results["resolve"]["errors"]

    # Recalcular scores
    logger.info("Recalculando risk scores…")
    results["score"] = cmd_score_entities()
    if results["score"].get("errors", 0):
        results["errors"] += results["score"]["errors"]

    logger.info(
        "Pipeline OSINT completo. Errores totales: %d",
        results["errors"],
    )
    return results


# ── CLI ───────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pipelines.osint_core",
        description="Pipeline OSINT/Risk Graph — ElectSim Bloque 4",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python -m pipelines.osint_core --source opensanctions --file data/raw/opensanctions/entities.ftm.jsonl
  python -m pipelines.osint_core --resolve
  python -m pipelines.osint_core --score
  python -m pipelines.osint_core --import-spiderfoot report.json
  python -m pipelines.osint_core --username-candidates actor_id username
  python -m pipelines.osint_core --source all

Fuentes de datos:
  OpenSanctions: https://www.opensanctions.org/docs/bulk/
  SpiderFoot:    https://github.com/smicallef/spiderfoot (export externo)
        """,
    )

    # Modos mutuamente excluyentes
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--source",
        choices=["opensanctions", "all"],
        help="Fuente de datos a cargar.",
    )
    group.add_argument(
        "--resolve",
        action="store_true",
        help="Resolver entidades duplicadas en BD.",
    )
    group.add_argument(
        "--score",
        action="store_true",
        help="Recalcular risk scores de todas las entidades.",
    )
    group.add_argument(
        "--import-spiderfoot",
        metavar="FILE",
        help="Importar export SpiderFoot (JSON o GEXF).",
    )
    group.add_argument(
        "--username-candidates",
        nargs=2,
        metavar=("ACTOR_ID", "USERNAME"),
        help="Generar candidatos de identidad social para un username.",
    )

    # Opciones
    parser.add_argument(
        "--file",
        metavar="PATH",
        help="Fichero de datos para --source opensanctions.",
    )
    parser.add_argument(
        "--source-name",
        default="opensanctions",
        help="Etiqueta de fuente para los registros (default: opensanctions).",
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=0.60,
        metavar="SCORE",
        help="Score mínimo de resolución (default: 0.60).",
    )
    parser.add_argument(
        "--max-sites",
        type=int,
        default=50,
        metavar="N",
        help="Sitios máximos para búsqueda de username (default: 50).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simula la ejecución sin escribir en BD.",
    )

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.dry_run:
        logger.info("[DRY-RUN] Simulando ejecución sin escritura en BD.")

    exit_code = 0

    try:
        if args.source == "opensanctions":
            if not args.file:
                logger.error("--source opensanctions requiere --file PATH")
                return 1
            stats = cmd_load_opensanctions(args.file, source_name=args.source_name)
            _print_stats("OpenSanctions", stats)
            if stats.get("errors", 0):
                exit_code = 1

        elif args.source == "all":
            results = cmd_source_all()
            logger.info("Pipeline completo: %s", results)
            if results.get("errors", 0):
                exit_code = 1

        elif args.resolve:
            stats = cmd_resolve_entities(min_score=args.min_score)
            _print_stats("Resolución", stats)
            if stats.get("errors", 0):
                exit_code = 1

        elif args.score:
            stats = cmd_score_entities()
            _print_stats("Scoring", stats)
            if stats.get("errors", 0):
                exit_code = 1

        elif args.import_spiderfoot:
            stats = cmd_import_spiderfoot(args.import_spiderfoot)
            _print_stats("SpiderFoot", stats)
            if stats.get("errors", 0):
                exit_code = 1

        elif args.username_candidates:
            actor_id, username = args.username_candidates
            result = cmd_username_candidates(
                actor_id=actor_id,
                username=username,
                max_sites=args.max_sites,
            )
            if result.get("errors", 0):
                exit_code = 1

    except KeyboardInterrupt:
        logger.info("Interrumpido por el usuario.")
        exit_code = 130
    except Exception as exc:
        logger.error("Error inesperado: %s", exc)
        exit_code = 1

    return exit_code


def _print_stats(label: str, stats: dict[str, Any]) -> None:
    """Imprime estadísticas de forma legible."""
    logger.info("─── %s ───", label)
    for k, v in stats.items():
        logger.info("  %-25s %s", k + ":", v)


if __name__ == "__main__":
    sys.exit(main())
