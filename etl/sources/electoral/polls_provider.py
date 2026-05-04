"""
Polls Provider — Bloque 6.

Carga encuestas electorales desde CSV/Excel/API manual.
Normaliza pollster, fechas, muestra, metodología, partidos.
Calcula PollQualityScore.
"""
from __future__ import annotations

import logging
from datetime import date
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Mapeo de columnas esperadas → aliases aceptables
_COL_MAP: dict[str, list[str]] = {
    "pollster":          ["pollster", "encuestadora", "empresa", "instituto", "house", "firma"],
    "publication_date":  ["publication_date", "fecha_publicacion", "fecha", "date", "published"],
    "fieldwork_start":   ["fieldwork_start", "inicio_campo", "campo_inicio", "start_date"],
    "fieldwork_end":     ["fieldwork_end", "fin_campo", "campo_fin", "end_date"],
    "sample_size":       ["sample_size", "muestra", "n", "sample", "entrevistas"],
    "methodology":       ["methodology", "metodologia", "method", "metodo"],
    "client":            ["client", "cliente", "medio", "media"],
    "source":            ["source", "fuente"],
    "url":               ["url", "raw_url", "link"],
}

# Partidos reconocidos en columnas de la encuesta
_PARTY_COLUMNS = ["PP", "PSOE", "VOX", "SUMAR", "JUNTS", "ERC", "PNV", "EH Bildu", "CC", "BNG",
                  "CS", "UP", "IU", "Podemos", "Ciudadanos", "Más País", "CUP", "NA+"]


def load_polls_from_csv(
    path: str,
    source: str = "manual",
    geography: str = "ES",
    encoding: str = "utf-8",
) -> tuple[list, list]:
    """
    Carga encuestas y estimaciones desde un CSV.

    Formato esperado (columnas mínimas):
        pollster, publication_date, [sample_size], [methodology],
        PP, PSOE, VOX, SUMAR, [...]

    Returns:
        (polls, estimates) listas de Poll y PollEstimate.
    """
    import csv
    from etl.sources.electoral.schemas import Poll, PollEstimate
    from etl.sources.electoral.electoral_adapter import normalize_party_id, normalize_date

    path_obj = Path(path)
    if not path_obj.exists():
        logger.error("polls_provider: fichero no encontrado: %s", path)
        return [], []

    polls: list[Poll] = []
    estimates: list[PollEstimate] = []

    try:
        with open(path_obj, encoding=encoding, errors="replace") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                return [], []

            # Mapear columnas
            col_map = _map_columns(list(reader.fieldnames))

            for i, row in enumerate(reader):
                try:
                    pollster = _get_col(row, col_map, "pollster", f"Encuestadora_{i}")
                    pub_date_raw = _get_col(row, col_map, "publication_date", "")
                    pub_date = normalize_date(pub_date_raw) or date.today()

                    poll_id = f"{source}_{pollster}_{pub_date}".replace(" ", "_")

                    poll = Poll(
                        source=source,
                        poll_id=poll_id,
                        pollster=pollster.strip(),
                        fieldwork_start=normalize_date(_get_col(row, col_map, "fieldwork_start", "")),
                        fieldwork_end=normalize_date(_get_col(row, col_map, "fieldwork_end", "")),
                        publication_date=pub_date,
                        geography=geography,
                        sample_size=_safe_int(_get_col(row, col_map, "sample_size", "")),
                        methodology=_get_col(row, col_map, "methodology", "") or None,
                        client=_get_col(row, col_map, "client", "") or None,
                        raw_url=_get_col(row, col_map, "url", "") or None,
                    )
                    polls.append(poll)

                    # Extraer estimaciones por partido
                    for field in reader.fieldnames:
                        party_id = normalize_party_id(field)
                        if field in _PARTY_COLUMNS or party_id != field:
                            raw_val = row.get(field, "").strip()
                            if not raw_val:
                                continue
                            try:
                                share = float(raw_val.replace(",", "."))
                                if 0 < share <= 100:
                                    estimates.append(PollEstimate(
                                        poll_id=poll_id,
                                        party_id=party_id,
                                        vote_share=share,
                                    ))
                            except ValueError:
                                pass

                except Exception as exc:
                    logger.debug("polls_provider row %d error: %s", i, exc)

    except Exception as exc:
        logger.error("polls_provider.load_polls_from_csv: %s", exc)

    logger.info("polls_provider: cargados %d polls, %d estimaciones desde %s",
                len(polls), len(estimates), path)
    return polls, estimates


def load_polls_from_excel(
    path: str,
    sheet: int | str = 0,
    source: str = "manual",
    geography: str = "ES",
) -> tuple[list, list]:
    """Carga encuestas desde Excel (XLSX/ODS)."""
    try:
        import pandas as pd
        df = pd.read_excel(path, sheet_name=sheet)
        # Exportar a CSV temporal y reutilizar load_polls_from_csv
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
            df.to_csv(f, index=False)
            tmp_path = f.name
        result = load_polls_from_csv(tmp_path, source=source, geography=geography)
        os.unlink(tmp_path)
        return result
    except ImportError:
        logger.error("pandas/openpyxl no instalado — no se puede cargar Excel.")
        return [], []
    except Exception as exc:
        logger.error("load_polls_from_excel: %s", exc)
        return [], []


def load_polls_from_wikipedia(geography: str = "ES") -> tuple[list, list]:
    """
    Carga encuestas desde el extractor de Wikipedia si está disponible.
    Graceful degradation: devuelve ([], []) si no está disponible.
    """
    try:
        from etl.sources.wikipedia_polls import WikipediaPollsScraper
        scraper = WikipediaPollsScraper()
        raw = scraper.fetch()
        if not raw:
            return [], []
        return _normalize_wikipedia_polls(raw)
    except Exception as exc:
        logger.debug("load_polls_from_wikipedia: %s", exc)
        return [], []


def _normalize_wikipedia_polls(raw: list[dict]) -> tuple[list, list]:
    """Normaliza el formato de Wikipedia polls al schema Poll/PollEstimate."""
    from etl.sources.electoral.schemas import Poll, PollEstimate
    from etl.sources.electoral.electoral_adapter import normalize_party_id, normalize_date

    polls = []
    estimates = []
    for i, item in enumerate(raw):
        try:
            pub_date = normalize_date(item.get("date", "")) or date.today()
            pollster = item.get("pollster", f"Wikipedia_{i}")
            poll_id = f"wikipedia_{pollster}_{pub_date}".replace(" ", "_")

            poll = Poll(
                source="wikipedia",
                poll_id=poll_id,
                pollster=pollster,
                publication_date=pub_date,
                sample_size=_safe_int(item.get("n")),
            )
            polls.append(poll)

            for key, val in item.items():
                if key in ("date", "pollster", "n", "source"):
                    continue
                party_id = normalize_party_id(key)
                try:
                    share = float(str(val).replace(",", ".").replace("%", ""))
                    if 0 < share <= 100:
                        estimates.append(PollEstimate(
                            poll_id=poll_id,
                            party_id=party_id,
                            vote_share=share,
                        ))
                except (ValueError, TypeError):
                    pass
        except Exception:
            continue
    return polls, estimates


# ── Helpers ───────────────────────────────────────────────────────────────────

def _map_columns(fieldnames: list[str]) -> dict[str, str]:
    """Mapea nombres de columna al nombre canónico."""
    result: dict[str, str] = {}
    lower_map = {f.lower().strip(): f for f in fieldnames}
    for canonical, aliases in _COL_MAP.items():
        for alias in aliases:
            if alias.lower() in lower_map:
                result[canonical] = lower_map[alias.lower()]
                break
    return result


def _get_col(row: dict, col_map: dict, key: str, default: str = "") -> str:
    col = col_map.get(key)
    if col and col in row:
        return str(row[col]).strip()
    return default


def _safe_int(val: Any) -> int | None:
    if val is None or str(val).strip() in ("", "nan", "None"):
        return None
    try:
        return int(float(str(val).replace(",", "")))
    except (ValueError, TypeError):
        return None
