"""
Official Electoral Results Provider — Bloque 6.

Carga resultados electorales oficiales desde:
  1. CSV/Excel local (formato normalizado o crudo).
  2. Directorio de resultados históricos.
  3. Delegación futura a infoelectoral.es API.

Normaliza a ElectionResult / Election.
"""
from __future__ import annotations

import csv
import logging
from datetime import date
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Mapeo de columnas esperadas → aliases
_RESULT_COL_MAP: dict[str, list[str]] = {
    "election_id":    ["election_id", "eleccion_id", "election"],
    "geography_id":   ["geography_id", "provincia", "circunscripcion", "geography", "geo_id"],
    "party_id":       ["party_id", "partido", "party", "siglas"],
    "votes":          ["votes", "votos", "total_votos", "num_votos"],
    "vote_share":     ["vote_share", "porcentaje", "pct", "share", "%_voto"],
    "seats":          ["seats", "escanos", "diputados", "n_escanos"],
    "seats_share":    ["seats_share", "%_escanos", "pct_escanos"],
}

_ELECTION_COL_MAP: dict[str, list[str]] = {
    "election_id":   ["election_id", "id"],
    "election_date": ["election_date", "fecha", "date", "fecha_eleccion"],
    "election_type": ["election_type", "tipo", "type", "tipo_eleccion"],
    "geography":     ["geography", "ambito", "scope"],
    "name":          ["name", "nombre", "descripcion"],
    "turnout":       ["turnout", "participacion", "participation", "participacion_pct"],
    "census_size":   ["census_size", "censo", "n_electores"],
}


def load_results_from_csv(
    path: str,
    election_id: str | None = None,
    geography: str = "ES",
    encoding: str = "utf-8",
) -> list:
    """
    Carga resultados electorales desde CSV.

    Columnas mínimas esperadas:
        geography_id (o province), party_id, vote_share (o votes)

    Args:
        path: Ruta al fichero CSV.
        election_id: Si None, se intenta leer de la columna election_id.
        geography: Código geográfico de ámbito (ej. "ES", "CAT").

    Returns:
        Lista de ElectionResult.
    """
    from etl.sources.electoral.schemas import ElectionResult
    from etl.sources.electoral.electoral_adapter import normalize_party_id, normalize_vote_share

    path_obj = Path(path)
    if not path_obj.exists():
        logger.error("official_results_provider: fichero no encontrado: %s", path)
        return []

    results: list[ElectionResult] = []

    try:
        with open(path_obj, encoding=encoding, errors="replace") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                return []

            col_map = _map_columns(list(reader.fieldnames), _RESULT_COL_MAP)

            for i, row in enumerate(reader):
                try:
                    eid = (
                        election_id
                        or _get_col(row, col_map, "election_id", "")
                        or "unknown"
                    )
                    geo_id = _get_col(row, col_map, "geography_id", geography)
                    party_raw = _get_col(row, col_map, "party_id", "")
                    if not party_raw:
                        continue

                    party_id = normalize_party_id(party_raw)

                    # Votos
                    votes_raw = _get_col(row, col_map, "votes", "")
                    votes: int | None = None
                    if votes_raw:
                        try:
                            votes = int(float(votes_raw.replace(",", "")))
                        except ValueError:
                            pass

                    # Porcentaje
                    share_raw = _get_col(row, col_map, "vote_share", "")
                    vote_share: float | None = None
                    if share_raw:
                        try:
                            raw_f = float(share_raw.replace(",", ".").replace("%", ""))
                            vote_share = normalize_vote_share(raw_f)
                        except ValueError:
                            pass

                    # Escaños
                    seats_raw = _get_col(row, col_map, "seats", "")
                    seats: int | None = None
                    if seats_raw:
                        try:
                            seats = int(float(seats_raw))
                        except ValueError:
                            pass

                    seats_share_raw = _get_col(row, col_map, "seats_share", "")
                    seats_share: float | None = None
                    if seats_share_raw:
                        try:
                            raw_ss = float(seats_share_raw.replace(",", ".").replace("%", ""))
                            seats_share = normalize_vote_share(raw_ss)
                        except ValueError:
                            pass

                    results.append(ElectionResult(
                        election_id=eid,
                        geography_id=geo_id,
                        geography_type="province",
                        party_id=party_id,
                        votes=votes,
                        vote_share=vote_share,
                        seats=seats,
                        seats_share=seats_share,
                    ))

                except Exception as exc:
                    logger.debug("results row %d error: %s", i, exc)

    except Exception as exc:
        logger.error("load_results_from_csv: %s", exc)

    logger.info(
        "official_results_provider: cargados %d resultados desde %s",
        len(results), path
    )
    return results


def load_election_meta_from_csv(
    path: str,
    encoding: str = "utf-8",
) -> list:
    """
    Carga metadatos de elecciones desde CSV.

    Returns:
        Lista de Election.
    """
    from etl.sources.electoral.schemas import Election
    from etl.sources.electoral.electoral_adapter import normalize_date

    path_obj = Path(path)
    if not path_obj.exists():
        logger.error("official_results_provider: fichero no encontrado: %s", path)
        return []

    elections: list[Election] = []

    try:
        with open(path_obj, encoding=encoding, errors="replace") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                return []

            col_map = _map_columns(list(reader.fieldnames), _ELECTION_COL_MAP)

            for i, row in enumerate(reader):
                try:
                    eid = _get_col(row, col_map, "election_id", "")
                    if not eid:
                        continue

                    date_raw = _get_col(row, col_map, "election_date", "")
                    election_date = normalize_date(date_raw) or date.today()

                    turnout_raw = _get_col(row, col_map, "turnout", "")
                    turnout: float | None = None
                    if turnout_raw:
                        try:
                            t = float(turnout_raw.replace(",", ".").replace("%", ""))
                            turnout = t if t <= 1.0 else t / 100.0
                        except ValueError:
                            pass

                    census_raw = _get_col(row, col_map, "census_size", "")
                    census: int | None = None
                    if census_raw:
                        try:
                            census = int(float(census_raw.replace(",", "")))
                        except ValueError:
                            pass

                    elections.append(Election(
                        election_id=eid,
                        election_date=election_date,
                        election_type=_get_col(row, col_map, "election_type", "national"),
                        geography=_get_col(row, col_map, "geography", "ES"),
                        name=_get_col(row, col_map, "name", eid) or eid,
                        turnout=turnout,
                        census_size=census,
                    ))

                except Exception as exc:
                    logger.debug("election meta row %d error: %s", i, exc)

    except Exception as exc:
        logger.error("load_election_meta_from_csv: %s", exc)

    return elections


def load_results_from_excel(
    path: str,
    results_sheet: int | str = 0,
    election_id: str | None = None,
    geography: str = "ES",
) -> list:
    """Carga resultados desde Excel (XLSX/ODS)."""
    try:
        import pandas as pd
        import tempfile, os

        df = pd.read_excel(path, sheet_name=results_sheet)
        with tempfile.NamedTemporaryFile(
            suffix=".csv", delete=False, mode="w", encoding="utf-8"
        ) as f:
            df.to_csv(f, index=False)
            tmp_path = f.name

        result = load_results_from_csv(tmp_path, election_id=election_id, geography=geography)
        os.unlink(tmp_path)
        return result

    except ImportError:
        logger.error("pandas/openpyxl no instalado — no se puede cargar Excel.")
        return []
    except Exception as exc:
        logger.error("load_results_from_excel: %s", exc)
        return []


def load_results_from_directory(
    directory: str,
    pattern: str = "*.csv",
    geography: str = "ES",
) -> tuple[list, list]:
    """
    Carga resultados electorales desde un directorio de CSV.
    Cada fichero se interpreta como una elección (nombre del fichero = election_id).

    Returns:
        (all_elections, all_results) tupla de listas.
    """
    from etl.sources.electoral.schemas import Election
    from etl.sources.electoral.electoral_adapter import normalize_date

    dir_path = Path(directory)
    if not dir_path.is_dir():
        logger.warning("official_results_provider: directorio no existe: %s", directory)
        return [], []

    all_elections: list[Election] = []
    all_results: list = []

    for csv_file in sorted(dir_path.glob(pattern)):
        election_id = csv_file.stem  # nombre sin extensión

        # Intentar extraer fecha del nombre (ej. "congreso_2023-07-23")
        parts = election_id.split("_")
        election_date = date.today()
        for part in reversed(parts):
            parsed = _try_parse_date(part)
            if parsed:
                election_date = parsed
                break

        election_type = "national"
        if "autonomica" in election_id or "regional" in election_id:
            election_type = "regional"
        elif "europea" in election_id or "euro" in election_id:
            election_type = "european"
        elif "municipal" in election_id or "local" in election_id:
            election_type = "local"

        results = load_results_from_csv(str(csv_file), election_id=election_id, geography=geography)
        if results:
            all_elections.append(Election(
                election_id=election_id,
                election_date=election_date,
                election_type=election_type,
                geography=geography,
                name=election_id.replace("_", " ").title(),
            ))
            all_results.extend(results)

    logger.info(
        "official_results_provider: directorio %s → %d elecciones, %d resultados",
        directory, len(all_elections), len(all_results)
    )
    return all_elections, all_results


def build_national_aggregate(
    results: list,
    election_id: str,
    method: str = "dhondt",
) -> dict[str, int]:
    """
    Agrega resultados provinciales en escaños nacionales usando D'Hondt.

    Args:
        results: Lista de ElectionResult con datos provinciales.
        election_id: Filtro por elección.
        method: Método de asignación.

    Returns:
        {party_id: total_seats}
    """
    from etl.sources.electoral.seat_allocator import (
        allocate_seats_by_province,
        SPAIN_SEATS_BY_PROVINCE,
    )

    # Agrupar por provincia
    province_shares: dict[str, dict[str, float]] = {}
    for r in results:
        if r.election_id != election_id:
            continue
        if r.vote_share is None:
            continue
        if r.geography_id not in province_shares:
            province_shares[r.geography_id] = {}
        province_shares[r.geography_id][r.party_id] = r.vote_share

    if not province_shares:
        return {}

    # Usar escaños oficiales de España si disponible, sino inferir
    seats_map = {
        prov: SPAIN_SEATS_BY_PROVINCE.get(prov, 0)
        for prov in province_shares
    }

    return allocate_seats_by_province(province_shares, seats_map, method=method)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _map_columns(fieldnames: list[str], col_map_def: dict[str, list[str]]) -> dict[str, str]:
    result: dict[str, str] = {}
    lower_map = {f.lower().strip(): f for f in fieldnames}
    for canonical, aliases in col_map_def.items():
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


def _try_parse_date(s: str) -> date | None:
    from etl.sources.electoral.electoral_adapter import normalize_date
    try:
        return normalize_date(s)
    except Exception:
        return None
