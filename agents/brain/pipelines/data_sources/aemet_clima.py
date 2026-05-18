"""
AEMET · datos meteorológicos por municipio.

API oficial: https://opendata.aemet.es/centrodedescargas/inicio
Requiere clave gratuita registrándose en opendata.aemet.es y se pasa por
header `api_key`. Sin clave, devolvemos estructura vacía sin levantar.

Variables disponibles:
  · Predicción 7 días por municipio (temp, precipitación, viento)
  · Datos climatológicos históricos por estación

API:
  · fetch_prediccion_municipio(cod_ine, dias=7) → list[{fecha, temp_max, temp_min, precip, viento}]
  · fetch_alertas_meteorologicas(cod_provincia) → list[alertas]
"""
from __future__ import annotations

import logging
import os
from typing import Any

from ._http import http_get_json

logger = logging.getLogger(__name__)

AEMET_BASE = "https://opendata.aemet.es/opendata/api"


def _key() -> str:
    return os.environ.get("AEMET_API_KEY", "").strip()


def fetch_prediccion_municipio(cod_ine: str, *, dias: int = 7) -> list[dict[str, Any]]:
    """Predicción 7 días por municipio (INE 5 dígitos)."""
    if not _key() or not cod_ine:
        return []
    url = f"{AEMET_BASE}/prediccion/especifica/municipio/diaria/{cod_ine}"
    # AEMET devuelve un puntero a JSON real en `datos`
    meta = http_get_json(
        url + f"?api_key={_key()}",
        ttl_seconds=3600,
    )
    if not meta or not isinstance(meta, dict) or not meta.get("datos"):
        return []
    data = http_get_json(meta["datos"], ttl_seconds=3600)
    if not data or not isinstance(data, list) or not data:
        return []
    pred = (data[0] or {}).get("prediccion", {}).get("dia") or []
    out: list[dict[str, Any]] = []
    for d in pred[:int(dias)]:
        if not isinstance(d, dict):
            continue
        out.append({
            "fecha": str(d.get("fecha", ""))[:10],
            "temp_max": (d.get("temperatura") or {}).get("maxima"),
            "temp_min": (d.get("temperatura") or {}).get("minima"),
            "prob_precip_pct": _max_prob_precip(d),
            "estado_cielo": _desc_cielo(d),
            "viento_kmh": _max_viento(d),
            "uv_max": d.get("uvMax"),
        })
    return out


def fetch_alertas_meteorologicas(cod_provincia: str) -> list[dict[str, Any]]:
    """Alertas meteorológicas activas en una provincia (avisos AEMET)."""
    if not _key() or not cod_provincia:
        return []
    url = f"{AEMET_BASE}/avisos_cap/ultimoelaborado/area/{str(cod_provincia).zfill(2)}"
    meta = http_get_json(url + f"?api_key={_key()}", ttl_seconds=900)
    if not meta or not meta.get("datos"):
        return []
    data = http_get_json(meta["datos"], ttl_seconds=900)
    if not data or not isinstance(data, dict):
        return []
    # AEMET avisos CAP · estructura compleja, sacamos campos clave
    items = data.get("avisos") or []
    return [
        {
            "fenomeno": a.get("fenomeno"),
            "severidad": a.get("severidad"),
            "inicio": a.get("fecha_inicio"),
            "fin": a.get("fecha_fin"),
            "descripcion": (a.get("descripcion") or "")[:300],
        }
        for a in items if isinstance(a, dict)
    ]


def _max_prob_precip(d: dict[str, Any]) -> int | None:
    arr = d.get("probPrecipitacion") or []
    if not arr:
        return None
    valores = [int(x.get("value") or 0) for x in arr if isinstance(x, dict)]
    return max(valores) if valores else None


def _desc_cielo(d: dict[str, Any]) -> str:
    arr = d.get("estadoCielo") or []
    if not arr:
        return ""
    return str(arr[0].get("descripcion", "")) if arr else ""


def _max_viento(d: dict[str, Any]) -> int | None:
    arr = d.get("viento") or []
    if not arr:
        return None
    velocidades = [int(x.get("velocidad") or 0) for x in arr if isinstance(x, dict)]
    return max(velocidades) if velocidades else None
