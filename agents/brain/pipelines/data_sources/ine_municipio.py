"""
INE API wrapper para municipios y CCAA.

INE expone una API JSON pública sin auth en:
  https://servicios.ine.es/wstempus/js/ES/

Endpoints útiles:
  · DATOS_TABLA · obtiene datos de una tabla concreta filtrados por código
  · DATOS_MUNICIPIO · población actual de un municipio
  · OPERACIONES_DISPONIBLES · catálogo
  · TABLAS_OPERACION · tablas de una operación

API:
  fetch_poblacion_municipio(cod_ine) → {poblacion, fecha, hombres, mujeres}
  fetch_evolucion_poblacion(cod_ine) → lista [{anio, valor}]
  fetch_renta_municipio(cod_ine)     → {renta_media_hogar, anio}
  fetch_piramide_poblacional(cod_ine) → lista de PiramideTramo
  fetch_extranjeros_municipio(cod_ine) → {pct, nacionalidades}
"""
from __future__ import annotations

import logging
from typing import Any

from ._http import http_get_json

logger = logging.getLogger(__name__)

INE_BASE = "https://servicios.ine.es/wstempus/js/ES"


def fetch_poblacion_municipio(cod_ine: str) -> dict[str, Any]:
    """Población actual del municipio."""
    if not cod_ine or len(cod_ine) < 5:
        return {"ok": False, "error": "cod_ine inválido"}
    # Padron continuo, tabla 2879 (cambia con el tiempo; usamos un fallback)
    url = f"{INE_BASE}/DATOS_TABLA/2852"
    params = {"tip": "AM", "nult": "1", "Mun": cod_ine}
    data = http_get_json(url, params=params, ttl_seconds=86400)
    if not data or not isinstance(data, list):
        return {"ok": False, "error": "ine no responde"}
    pob_total = None
    fecha = ""
    for item in data:
        nombre = str(item.get("Nombre") or "").lower()
        if "total" in nombre or "ambos" in nombre:
            arr = item.get("Data") or []
            if arr:
                pob_total = arr[0].get("Valor")
                fecha = arr[0].get("Anyo", "")
                break
    return {
        "ok": pob_total is not None,
        "poblacion_total": pob_total,
        "fecha": fecha,
    }


def fetch_evolucion_poblacion(cod_ine: str, *, max_periodos: int = 25) -> list[dict[str, Any]]:
    """Serie histórica de población (uno por año disponible)."""
    if not cod_ine:
        return []
    url = f"{INE_BASE}/DATOS_TABLA/2852"
    params = {"tip": "AM", "nult": str(int(max_periodos)), "Mun": cod_ine}
    data = http_get_json(url, params=params, ttl_seconds=86400)
    if not data or not isinstance(data, list):
        return []
    serie: list[dict[str, Any]] = []
    for item in data:
        nombre = str(item.get("Nombre") or "").lower()
        if "total" not in nombre and "ambos" not in nombre:
            continue
        for d in item.get("Data") or []:
            serie.append({
                "anio": d.get("Anyo"),
                "valor": d.get("Valor"),
            })
        break
    return sorted(serie, key=lambda x: x.get("anio") or 0)


def fetch_renta_municipio(cod_ine: str) -> dict[str, Any]:
    """Renta neta media por hogar (Atlas distribución de renta INE).

    Tabla típica para municipios: 30896 (Renta media por hogar).
    """
    if not cod_ine:
        return {"ok": False}
    url = f"{INE_BASE}/DATOS_TABLA/30896"
    params = {"tip": "AM", "nult": "1", "Mun": cod_ine}
    data = http_get_json(url, params=params, ttl_seconds=86400)
    if not data or not isinstance(data, list) or not data:
        return {"ok": False, "error": "ine sin datos"}
    arr = data[0].get("Data") or []
    if not arr:
        return {"ok": False}
    return {
        "ok": True,
        "renta_media_hogar": arr[0].get("Valor"),
        "anio": arr[0].get("Anyo"),
    }


def fetch_piramide_poblacional(cod_ine: str) -> list[dict[str, Any]]:
    """Pirámide poblacional · grupos quinquenales hombre/mujer.

    Datos del Padrón (tabla 2879). Devolvemos lista de tramos:
    [{edad_min, edad_max, hombres, mujeres}]
    """
    if not cod_ine:
        return []
    url = f"{INE_BASE}/DATOS_TABLA/2879"
    params = {"tip": "AM", "nult": "1", "Mun": cod_ine}
    data = http_get_json(url, params=params, ttl_seconds=86400)
    if not data or not isinstance(data, list):
        return []

    # Estructura: cada item tiene "Nombre" con sexo + edad + municipio
    tramos: dict[tuple[int, int], dict[str, int]] = {}
    for item in data:
        nombre = str(item.get("Nombre") or "")
        sexo = None
        if "hombre" in nombre.lower():
            sexo = "hombres"
        elif "mujer" in nombre.lower():
            sexo = "mujeres"
        if not sexo:
            continue
        # Buscar tramo "0-4", "5-9", etc. o "85 y más"
        import re
        m = re.search(r"(\d+)\s*[-–]\s*(\d+)", nombre)
        if m:
            tramo = (int(m.group(1)), int(m.group(2)))
        elif "100" in nombre and "más" in nombre.lower():
            tramo = (100, 120)
        elif "85" in nombre and "más" in nombre.lower():
            tramo = (85, 120)
        else:
            continue
        arr = item.get("Data") or []
        if not arr:
            continue
        v = arr[0].get("Valor")
        if v is None:
            continue
        if tramo not in tramos:
            tramos[tramo] = {"hombres": 0, "mujeres": 0}
        tramos[tramo][sexo] = int(v) if v else 0
    out = []
    for (mn, mx), counts in sorted(tramos.items()):
        out.append({
            "edad_min": mn,
            "edad_max": mx,
            "hombres": counts["hombres"],
            "mujeres": counts["mujeres"],
        })
    return out


def fetch_indicadores_demograficos(cod_ine: str) -> dict[str, Any]:
    """Indicadores demográficos (natalidad, mortalidad, envejecimiento).

    No siempre hay datos a nivel municipio · si solo hay provincia, devolvemos
    None en los campos. La función agregar puede usar provincia para fallback.
    """
    if not cod_ine:
        return {}
    out: dict[str, Any] = {}

    # Tabla 1419 · Indicadores demográficos básicos
    url = f"{INE_BASE}/DATOS_TABLA/1419"
    params = {"tip": "AM", "nult": "1", "Mun": cod_ine}
    data = http_get_json(url, params=params, ttl_seconds=86400)
    if data and isinstance(data, list):
        for item in data:
            nombre = str(item.get("Nombre") or "").lower()
            arr = item.get("Data") or []
            if not arr:
                continue
            v = arr[0].get("Valor")
            if "natalidad" in nombre and "tasa" in nombre:
                out["tasa_natalidad"] = v
            elif "mortalidad" in nombre and "tasa" in nombre:
                out["tasa_mortalidad"] = v
            elif "envejecimiento" in nombre:
                out["indice_envejecimiento"] = v
            elif "dependencia" in nombre:
                out["tasa_dependencia"] = v
    return out


def fetch_paro_provincia(cod_provincia: str) -> dict[str, Any]:
    """Tasa de paro provincial (EPA, los municipios usan provincia)."""
    if not cod_provincia:
        return {"ok": False}
    # Tabla EPA 3996 ·  paro registrado por provincia
    url = f"{INE_BASE}/DATOS_TABLA/3996"
    params = {"tip": "AM", "nult": "1", "Prov": str(cod_provincia).zfill(2)}
    data = http_get_json(url, params=params, ttl_seconds=86400)
    if not data or not isinstance(data, list):
        return {"ok": False}
    for item in data:
        nombre = str(item.get("Nombre") or "").lower()
        if "tasa" in nombre and "paro" in nombre and "ambos" in nombre:
            arr = item.get("Data") or []
            if arr:
                return {
                    "ok": True,
                    "tasa_paro_pct": arr[0].get("Valor"),
                    "anio": arr[0].get("Anyo"),
                }
    return {"ok": False}
