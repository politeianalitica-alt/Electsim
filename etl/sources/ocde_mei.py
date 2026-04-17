"""
OCDE Main Economic Indicators (MEI) — ElectSim España
Descarga confianza de consumidor y empresarial para España vía SDMX-JSON.

Documentación: https://data.oecd.org/api/sdmx-json-documentation/
Endpoint:      https://stats.oecd.org/SDMX-JSON/data/MEI/<key>

Series objetivo (Spain / ESP):
  - LOCOBSNO -> 'Confianza consumidor OCDE'
  - LOCOBSBS -> 'Confianza empresarial OCDE'

Uso:
    DATABASE_URL=postgresql+psycopg://... python -m etl.sources.ocde_mei
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

OCDE_BASE = "https://stats.oecd.org/SDMX-JSON/data/MEI/"
TIMEOUT = 30
HEADERS = {"User-Agent": "ElectSim/1.0 (ocde-mei-scraper)", "Accept": "application/json"}

SERIES = [
    {
        "key": "ESP.LOCOBSNO.ST.M",
        "indicador": "Confianza consumidor OCDE",
        "unidad": "índice",
    },
    {
        "key": "ESP.LOCOBSBS.ST.M",
        "indicador": "Confianza empresarial OCDE",
        "unidad": "índice",
    },
]


# -------- Parsers ----------------------------------------------------------
def _parse_time_label(label: str) -> date | None:
    if not label:
        return None
    s = str(label).strip()
    try:
        if "Q" in s:
            s2 = s.replace("-", "")
            year = int(s2[:4])
            q = int(s2[-1])
            return date(year, (q - 1) * 3 + 1, 1)
        if len(s) == 4 and s.isdigit():
            return date(int(s), 1, 1)
        if len(s) == 7 and s[4] == "-":
            return datetime.strptime(s, "%Y-%m").date()
        if len(s) >= 10:
            return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except Exception:
        return None
    return None


def _extract_observations(payload: dict) -> list[tuple[date, float]]:
    """Extrae (fecha, valor) de un payload SDMX-JSON estándar.

    Busca structure.dimensions.observation[0].values -> lista de {id,name}.
    dataSets[0].series -> dict con clave '0:0:0:0' (o similar) cuyo
    observations es un dict de 'N' -> [valor, ...].
    """
    try:
        structure = payload.get("structure") or {}
        dimensions = structure.get("dimensions") or {}
        obs_dims = dimensions.get("observation") or []
        if not obs_dims:
            return []
        time_values = obs_dims[0].get("values") or []

        datasets = payload.get("dataSets") or []
        if not datasets:
            return []
        series = datasets[0].get("series") or {}
        if not series:
            # algunos payloads exponen 'observations' directamente
            observations = datasets[0].get("observations") or {}
            out: list[tuple[date, float]] = []
            for k, v in observations.items():
                try:
                    idx = int(k.split(":")[-1])
                    label = time_values[idx].get("id") or time_values[idx].get("name")
                    fecha = _parse_time_label(label)
                    if fecha is None:
                        continue
                    val = v[0] if isinstance(v, list) else v
                    if val is None:
                        continue
                    out.append((fecha, float(val)))
                except Exception:
                    continue
            out.sort(key=lambda x: x[0], reverse=True)
            return out

        out = []
        # Solo debería haber una serie por filtro específico
        for _series_key, series_data in series.items():
            observations = series_data.get("observations") or {}
            for k, v in observations.items():
                try:
                    idx = int(k)
                    label = time_values[idx].get("id") or time_values[idx].get("name")
                    fecha = _parse_time_label(label)
                    if fecha is None:
                        continue
                    val = v[0] if isinstance(v, list) else v
                    if val is None:
                        continue
                    out.append((fecha, float(val)))
                except Exception:
                    continue
        out.sort(key=lambda x: x[0], reverse=True)
        return out
    except Exception as exc:
        logger.debug("extract_observations error: %s", exc)
        return []


# -------- HTTP -------------------------------------------------------------
def fetch_series(key: str) -> dict | None:
    url = OCDE_BASE + key + "/all"
    params = {"contentType": "json"}
    try:
        r = requests.get(url, params=params, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            logger.warning("OCDE %s HTTP %s", key, r.status_code)
            return None
        return r.json()
    except Exception as exc:
        logger.warning("OCDE %s error: %s", key, exc)
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
    try:
        with engine.begin() as conn:
            conn.execute(UPSERT_SQL, params)
        return True
    except IntegrityError:
        pass
    except Exception as exc:
        logger.debug("upsert on conflict fallo %s %s: %s", indicador, fecha, exc)

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
def ingest_ocde_mei(engine, max_rows: int = 200) -> dict:
    out: dict[str, Any] = {"ok": True, "n_rows": 0, "datasets": {}}
    try:
        for s in SERIES:
            payload = fetch_series(s["key"])
            if not payload:
                out["datasets"][s["key"]] = {"rows": 0, "error": "fetch"}
                continue
            obs = _extract_observations(payload)
            obs = obs[:max_rows]
            n = 0
            for fecha, valor in obs:
                ok = upsert_indicador(
                    engine,
                    indicador=s["indicador"],
                    fecha=fecha,
                    valor=valor,
                    unidad=s["unidad"],
                    fuente="OCDE",
                )
                if ok:
                    n += 1
            out["datasets"][s["key"]] = {"rows": n, "indicador": s["indicador"]}
            out["n_rows"] += n
            logger.info("OCDE MEI %s -> %d filas", s["key"], n)
        return out
    except Exception as exc:
        logger.exception("ingest_ocde_mei error")
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
    res = ingest_ocde_mei(eng)
    print(f"OCDE MEI completado: {res}")
