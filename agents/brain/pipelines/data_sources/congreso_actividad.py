"""
Congreso de los Diputados · actividad parlamentaria de un diputado.

El Congreso publica datos abiertos en:
  · https://www.congreso.es/busqueda-de-diputados
  · https://www.congreso.es/opendata
  · APIs JSON (semi-públicas) bajo /opendata-api-server/

API de este módulo:
  · find_diputado_id(nombre, legislatura?) → id_diputado o None
  · fetch_iniciativas(id_diputado, max=50) → [{tipo, titulo, fecha, ...}]
  · fetch_votaciones_clave(id_diputado, max=30) → [{fecha, titulo, voto, ...}]
  · fetch_intervenciones(id_diputado, max=20) → [{fecha, titulo, organo, ...}]
  · fetch_comisiones(id_diputado) → [{comision, rol, desde}]
  · fetch_perfil(id_diputado) → {circunscripcion, partido_actual, n_legislatura}

Sin clave API. Caché TTL larga (24h). Si el portal cambia el HTML, las
funciones devuelven listas vacías sin levantar.
"""
from __future__ import annotations

import logging
import re
import urllib.parse
from typing import Any

from ._http import http_get_json, http_get_text

logger = logging.getLogger(__name__)

CONGRESO_BASE = "https://www.congreso.es"
CONGRESO_OPENDATA = "https://www.congreso.es/opendata-api-server"


def find_diputado_id(nombre: str, *, legislatura: str = "XV") -> str | None:
    """Busca el `idDiputado` por nombre en la legislatura dada.

    Estrategia: scraping de la página de búsqueda HTML, extracción del
    primer link `/busqueda-de-diputados?p_p_id=...&_pageId=...&...idDiputado=NNN`.
    """
    if not nombre:
        return None
    query = urllib.parse.quote_plus(nombre)
    url = (
        f"{CONGRESO_BASE}/busqueda-de-diputados?"
        f"p_p_id=diputadomodule&p_p_state=normal&"
        f"_diputadomodule_text={query}&_diputadomodule_legis={legislatura}"
    )
    html = http_get_text(url, ttl_seconds=21600)
    if not html:
        return None
    # Buscamos pattern típico ?idDiputado=NNN o data-id-diputado="NNN"
    m = re.search(r"idDiputado[\"=]\s*[\"']?(\d+)", html)
    if m:
        return m.group(1)
    return None


def fetch_perfil_diputado(id_diputado: str, *,
                          legislatura: str = "XV") -> dict[str, Any]:
    """Perfil básico del diputado (circunscripción, partido, grupo)."""
    if not id_diputado:
        return {}
    url = (
        f"{CONGRESO_OPENDATA}/api/datos-diputados/datos-diputado/"
        f"{id_diputado}/{legislatura}"
    )
    data = http_get_json(url, ttl_seconds=86400)
    if not data or not isinstance(data, dict):
        return {}
    return {
        "id_diputado": id_diputado,
        "nombre": data.get("nombre") or "",
        "circunscripcion": data.get("circunscripcion") or "",
        "partido": data.get("partido") or "",
        "grupo_parlamentario": data.get("grupoParlamentario") or "",
        "fecha_alta": (data.get("fechaAlta") or "")[:10],
        "fecha_baja": (data.get("fechaBaja") or "")[:10],
        "twitter": data.get("twitter") or "",
        "facebook": data.get("facebook") or "",
        "instagram": data.get("instagram") or "",
        "foto_url": data.get("urlFoto") or "",
    }


def fetch_iniciativas(id_diputado: str, *, max_items: int = 50,
                      legislatura: str = "XV") -> list[dict[str, Any]]:
    """Iniciativas legislativas (preguntas, proposiciones, mociones)."""
    if not id_diputado:
        return []
    url = (
        f"{CONGRESO_OPENDATA}/api/iniciativa/iniciativas-diputado/"
        f"{id_diputado}/{legislatura}"
    )
    data = http_get_json(url, ttl_seconds=43200)
    if not data:
        return []
    items = data if isinstance(data, list) else (data.get("iniciativas") or [])
    out: list[dict[str, Any]] = []
    for it in items[:int(max_items)]:
        if not isinstance(it, dict):
            continue
        out.append({
            "tipo": it.get("tipoIniciativa") or it.get("tipo") or "",
            "titulo": it.get("objeto") or it.get("titulo") or "",
            "fecha": (it.get("fechaPresentacion") or "")[:10],
            "estado": it.get("situacionActual") or "",
            "url": it.get("urlIniciativa") or "",
            "expediente": it.get("expediente") or "",
        })
    return out


def fetch_votaciones_diputado(id_diputado: str, *, max_items: int = 30,
                              legislatura: str = "XV") -> list[dict[str, Any]]:
    """Votaciones individuales del diputado (cómo votó en cada texto)."""
    if not id_diputado:
        return []
    url = (
        f"{CONGRESO_OPENDATA}/api/votacion/votos-diputado/"
        f"{id_diputado}/{legislatura}"
    )
    data = http_get_json(url, ttl_seconds=43200)
    if not data:
        return []
    items = data if isinstance(data, list) else (data.get("votos") or [])
    out: list[dict[str, Any]] = []
    for it in items[:int(max_items)]:
        if not isinstance(it, dict):
            continue
        out.append({
            "fecha": (it.get("fecha") or it.get("fechaVotacion") or "")[:10],
            "titulo": it.get("titulo") or it.get("objetoVotacion") or "",
            "voto": _normalizar_voto(it.get("voto") or it.get("sentido")),
            "resultado_global": it.get("resultado") or "",
            "url": it.get("url") or "",
        })
    return out


def fetch_intervenciones(id_diputado: str, *, max_items: int = 20,
                         legislatura: str = "XV") -> list[dict[str, Any]]:
    """Intervenciones en pleno y comisiones (Diario de Sesiones)."""
    if not id_diputado:
        return []
    url = (
        f"{CONGRESO_OPENDATA}/api/sesion/intervenciones-diputado/"
        f"{id_diputado}/{legislatura}"
    )
    data = http_get_json(url, ttl_seconds=43200)
    if not data:
        return []
    items = data if isinstance(data, list) else (data.get("intervenciones") or [])
    out: list[dict[str, Any]] = []
    for it in items[:int(max_items)]:
        if not isinstance(it, dict):
            continue
        out.append({
            "fecha": (it.get("fecha") or "")[:10],
            "titulo": it.get("asunto") or it.get("titulo") or "",
            "organo": it.get("organo") or "Pleno",
            "tipo": it.get("tipoIntervencion") or "intervención",
            "url_diario_sesiones": it.get("urlDiario") or "",
            "resumen": (it.get("resumen") or "")[:600],
        })
    return out


def fetch_comisiones(id_diputado: str, *,
                     legislatura: str = "XV") -> list[dict[str, Any]]:
    """Comisiones a las que pertenece el diputado y su rol."""
    if not id_diputado:
        return []
    url = (
        f"{CONGRESO_OPENDATA}/api/comision/comisiones-diputado/"
        f"{id_diputado}/{legislatura}"
    )
    data = http_get_json(url, ttl_seconds=43200)
    if not data:
        return []
    items = data if isinstance(data, list) else (data.get("comisiones") or [])
    out: list[dict[str, Any]] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        out.append({
            "comision": it.get("nombre") or it.get("comision") or "",
            "rol": it.get("cargo") or "vocal",
            "fecha_alta": (it.get("fechaAlta") or "")[:10],
            "fecha_baja": (it.get("fechaBaja") or "")[:10],
        })
    return out


def fetch_actividad_completa(
    id_diputado: str, *,
    legislatura: str = "XV",
) -> dict[str, Any]:
    """Bundle completo: perfil + iniciativas + votaciones + intervenciones + comisiones."""
    if not id_diputado:
        return {"ok": False, "error": "id_diputado vacío"}
    return {
        "ok": True,
        "perfil": fetch_perfil_diputado(id_diputado, legislatura=legislatura),
        "iniciativas": fetch_iniciativas(id_diputado, legislatura=legislatura),
        "votaciones": fetch_votaciones_diputado(id_diputado, legislatura=legislatura),
        "intervenciones": fetch_intervenciones(id_diputado, legislatura=legislatura),
        "comisiones": fetch_comisiones(id_diputado, legislatura=legislatura),
    }


def _normalizar_voto(v: Any) -> str:
    """Normaliza distintos formatos de voto a strings predecibles."""
    if v is None:
        return ""
    s = str(v).strip().lower()
    if s in {"1", "si", "sí", "favor", "a favor"}:
        return "a favor"
    if s in {"2", "no", "contra", "en contra"}:
        return "en contra"
    if s in {"3", "abst", "abstencion", "abstención"}:
        return "abstención"
    if s in {"0", "no vot", "no votó", "ausente"}:
        return "ausente"
    return s
