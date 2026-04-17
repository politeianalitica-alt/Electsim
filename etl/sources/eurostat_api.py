"""
Eurostat REST API — ElectSim España
Descarga indicadores macro para España desde Eurostat (JSON-stat 2.0).

Documentación: https://ec.europa.eu/eurostat/web/main/data/web-services
Base URL:      https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/

Series objetivo:
  - HICP (prc_hicp_manr)  -> 'HICP anual (%)'
  - Paro  (une_rt_m)      -> 'Tasa paro (%)'
  - PIB   (namq_10_gdp)   -> 'PIB trimestral (M€)'

Uso:
    DATABASE_URL=postgresql+psycopg://... python -m etl.sources.eurostat_api
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime
from typing import Any

import requests
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

EUROSTAT_BASE = (
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
)
TIMEOUT = 30
HEADERS = {"User-Agent": "ElectSim/1.0 (eurostat-scraper)"}


# -------- Datasets objetivo ------------------------------------------------
DATASETS = [
    {
        "code": "prc_hicp_manr",
        "indicador": "HICP anual (%)",
        "unidad": "%",
        "params": {
            "geo": "ES",
            "coicop": "CP00",
            "unit": "RCH_A",
            "format": "JSON",
            "lang": "EN",
        },
    },
    {
        "code": "une_rt_m",
        "indicador": "Tasa paro (%)",
        "unidad": "%",
        "params": {
            "geo": "ES",
            "s_adj": "SA",
            "age": "TOTAL",
            "sex": "T",
            "unit": "PC_ACT",
            "format": "JSON",
            "lang": "EN",
        },
    },
    {
        "code": "namq_10_gdp",
        "indicador": "PIB trimestral (M€)",
        "unidad": "M€",
        "params": {
            "geo": "ES",
            "na_item": "B1GQ",
            "unit": "CLV10_MNAC",
            "s_adj": "SCA",
            "format": "JSON",
            "lang": "EN",
        },
    },
]


# -------- JSON-stat parser -------------------------------------------------
def _parse_time_label(label: str) -> date | None:
    """Convierte etiquetas Eurostat (YYYY, YYYY-MM, YYYY-Qn) a date."""
    if not label:
        return None
    s = str(label).strip()
    try:
        if "Q" in s:  # 2024Q1 o 2024-Q1
            s2 = s.replace("-", "")
            year = int(s2[:4])
            q = int(s2[-1])
            month = (q - 1) * 3 + 1
            return date(year, month, 1)
        if len(s) == 4 and s.isdigit():
            return date(int(s), 1, 1)
        if len(s) == 7 and s[4] == "-":  # YYYY-MM
            return datetime.strptime(s, "%Y-%m").date()
        if len(s) >= 10:
            return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except Exception:
        return None
    return None


def _iter_jsonstat_observations(payload: dict) -> list[tuple[date, float]]:
    """Devuelve [(fecha, valor)] desde un payload JSON-stat 2.0 de Eurostat.

    Estructura:
      dimension: {dim: {category: {index: {label: pos}, label: {label: nombre}}}}
      id:        [dim1, dim2, ...]
      size:      [s1, s2, ...]
      value:     {"flat_pos": number, ...}
    """
    if not isinstance(payload, dict):
        return []
    dims = payload.get("id") or payload.get("dimension", {}).get("id") or []
    size = payload.get("size") or []
    value = payload.get("value") or {}
    dimension = payload.get("dimension") or {}
    if not dims or not size or not value:
        return []

    # Localizar dimensión 'time'
    try:
        time_idx = dims.index("time")
    except ValueError:
        # algunos datasets usan 'TIME_PERIOD'
        time_idx = None
        for i, d in enumerate(dims):
            if d.lower().startswith("time"):
                time_idx = i
                break
        if time_idx is None:
            return []

    time_dim = dimension.get(dims[time_idx], {})
    time_cat = time_dim.get("category", {})
    time_index = time_cat.get("index", {})
    # index puede ser dict {label: pos} o lista [label, ...]
    if isinstance(time_index, list):
        pos_to_label = {i: lab for i, lab in enumerate(time_index)}
    else:
        pos_to_label = {int(pos): lab for lab, pos in time_index.items()}

    # Tamaño total y strides
    total = 1
    for s in size:
        total *= int(s)
    strides = [1] * len(size)
    for i in range(len(size) - 2, -1, -1):
        strides[i] = strides[i + 1] * int(size[i + 1])

    out: list[tuple[date, float]] = []
    for key, val in value.items():
        try:
            flat = int(key)
        except (TypeError, ValueError):
            continue
        if val is None:
            continue
        # decodificar flat -> coords
        rem = flat
        coords = []
        for st in strides:
            coords.append(rem // st)
            rem = rem % st
        t_pos = coords[time_idx]
        label = pos_to_label.get(t_pos)
        fecha = _parse_time_label(label) if label is not None else None
        if fecha is None:
            continue
        try:
            out.append((fecha, float(val)))
        except (TypeError, ValueError):
            continue
    # ordenar por fecha descendente
    out.sort(key=lambda x: x[0], reverse=True)
    return out


# -------- HTTP -------------------------------------------------------------
def fetch_dataset(code: str, params: dict) -> dict | None:
    url = EUROSTAT_BASE + code
    try:
        r = requests.get(url, params=params, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            logger.warning("Eurostat %s HTTP %s", code, r.status_code)
            return None
        return r.json()
    except Exception as exc:
        logger.warning("Eurostat %s error: %s", code, exc)
        return None


# -------- DB upsert --------------------------------------------------------
UPSERT_SQL = text(
    """
    INSERT INTO indicadores_sociales
        (indicador, valor, unidad, fecha, ccaa_id, fuente)
    VALUES
        (:indicador, :valor, :unidad, :fecha, NULL, :fuente)
    ON CONFLICT (indicador, fecha, ccaa_id)
    DO UPDATE SET valor = EXCLUDED.valor, unidad = EXCLUDED.unidad
    """
)

# Fallback cuando ccaa_id=NULL hace que ON CONFLICT no dispare (índice no-parcial)
SELECT_EXISTS_SQL = text(
    """
    SELECT 1 FROM indicadores_sociales
    WHERE indicador = :indicador AND fecha = :fecha AND ccaa_id IS NULL
    LIMIT 1
    """
)

UPDATE_NULL_SQL = text(
    """
    UPDATE indicadores_sociales
       SET valor = :valor, unidad = :unidad, fuente = :fuente
     WHERE indicador = :indicador AND fecha = :fecha AND ccaa_id IS NULL
    """
)

INSERT_NULL_SQL = text(
    """
    INSERT INTO indicadores_sociales
        (indicador, valor, unidad, fecha, ccaa_id, fuente)
    VALUES
        (:indicador, :valor, :unidad, :fecha, NULL, :fuente)
    """
)


def upsert_indicador(
    engine,
    indicador: str,
    fecha: date,
    valor: float,
    unidad: str,
    fuente: str,
) -> bool:
    params = {
        "indicador": indicador,
        "valor": valor,
        "unidad": unidad,
        "fecha": fecha,
        "fuente": fuente,
    }
    # Estrategia 1: ON CONFLICT (funciona si el índice unique es parcial sobre NULL)
    try:
        with engine.begin() as conn:
            conn.execute(UPSERT_SQL, params)
        return True
    except IntegrityError:
        pass
    except Exception as exc:
        logger.debug("upsert on conflict fallo %s %s: %s", indicador, fecha, exc)

    # Estrategia 2: select + update/insert manual
    try:
        with engine.begin() as conn:
            exists = conn.execute(SELECT_EXISTS_SQL, params).scalar()
            if exists:
                conn.execute(UPDATE_NULL_SQL, params)
            else:
                conn.execute(INSERT_NULL_SQL, params)
        return True
    except IntegrityError:
        return False
    except Exception as exc:
        logger.debug("upsert manual fallo %s %s: %s", indicador, fecha, exc)
        return False


# -------- Orquestador -----------------------------------------------------
def ingest_eurostat(engine, max_rows_per_dataset: int = 200) -> dict:
    out: dict[str, Any] = {"ok": True, "n_rows": 0, "datasets": {}}
    try:
        for ds in DATASETS:
            code = ds["code"]
            payload = fetch_dataset(code, ds["params"])
            if not payload:
                out["datasets"][code] = {"rows": 0, "error": "fetch"}
                continue
            obs = _iter_jsonstat_observations(payload)
            obs = obs[:max_rows_per_dataset]
            n = 0
            for fecha, valor in obs:
                ok = upsert_indicador(
                    engine,
                    indicador=ds["indicador"],
                    fecha=fecha,
                    valor=valor,
                    unidad=ds["unidad"],
                    fuente="Eurostat",
                )
                if ok:
                    n += 1
            out["datasets"][code] = {"rows": n, "indicador": ds["indicador"]}
            out["n_rows"] += n
            logger.info("Eurostat %s -> %d filas", code, n)
        return out
    except Exception as exc:
        logger.exception("ingest_eurostat error")
        return {"ok": False, "error": str(exc), "n_rows": out.get("n_rows", 0)}


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana",
    )
    eng = create_engine(db_url)
    res = ingest_eurostat(eng)
    print(f"Eurostat completado: {res}")
