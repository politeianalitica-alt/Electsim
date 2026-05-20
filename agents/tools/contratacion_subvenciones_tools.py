"""Tools BDNS + TED + Senado en tiempo real para el Brain (Sprint 3 · S3.6).

> **Sprint 3 · S3.6** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 3`)

Politeia ya tiene conectores para BDNS, TED, Congreso, Senado e infoelectoral.
Lo que faltaba: exponerlos como tools registradas en el Brain para que el
copiloto pueda invocarlos en conversaciones con el analista.

Tools nuevas en este módulo:
  - bdns_search_convocatorias(query, fechas) → subvenciones públicas España
  - bdns_search_concesiones(beneficiario)    → quien recibió qué
  - ted_search_licitaciones(sector, fechas)  → licitaciones europeas
  - senado_actividad(tipo, dias)             → enmiendas, mociones, preguntas Senado
  - congreso_votaciones(legislatura, max)    → votaciones del Congreso

Las tools delegan a los conectores ya implementados (no duplica código).
Siguen el contrato del ToolRegistry: devuelven dict JSON-serializable,
falla cerrado con {"error": str}.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# BDNS · Subvenciones España
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("bdns_search_convocatorias")
def bdns_search_convocatorias(
    descripcion: str | None = None,
    days_back: int = 30,
    max_items: int = 20,
) -> dict[str, Any]:
    """Busca convocatorias de subvenciones públicas en España (BDNS).

    Cobertura: TODAS las subvenciones de Estado + CCAA + Ayuntamientos +
    Universidades + Organismos públicos desde 2013.

    Args:
      descripcion: texto en el título (ej. 'I+D+i', 'vivienda', 'agroalimentario')
      days_back: días hacia atrás desde hoy (default 30)
      max_items: máximo de resultados (max 50)

    Returns:
      {
        "n_items": int,
        "rango": "YYYY-MM-DD → YYYY-MM-DD",
        "convocatorias": [
          {"id": "...", "descripcion": "...", "organo": "...",
           "importe": float, "fecha": "...", "fecha_fin_plazo": "..."},
          ...
        ],
        "error": null,
      }
    """
    try:
        from etl.sources.spain.bdns import get_bdns_client
    except ImportError as exc:
        return {"error": f"BDNS client no disponible: {exc}", "convocatorias": [], "n_items": 0}

    client = get_bdns_client()
    if client._session is None:
        return {"error": "BDNSClient sin sesión HTTP", "convocatorias": [], "n_items": 0}

    # BDNS por defecto ordena por más reciente · si pedimos sin fecha
    # nos llegan las últimas convocatorias publicadas. Para days_back<7
    # NO pasamos fechas (la API rechaza ventanas muy estrechas).
    today = date.today()
    fecha_desde: str | None = None
    if days_back >= 7:
        fecha_desde = (today - timedelta(days=min(days_back, 365))).isoformat()

    items = client.search_convocatorias(
        descripcion=descripcion,
        fecha_desde=fecha_desde,
        fecha_hasta=today.isoformat() if fecha_desde else None,
        page=0,
        page_size=min(max_items, 50),
    )

    out = []
    for raw in items[:max_items]:
        out.append({
            "id": str(raw.get("numeroConvocatoria") or raw.get("id") or ""),
            "descripcion": str(raw.get("descripcion") or "")[:300],
            "organo": str(raw.get("nivel1") or raw.get("desOrgano") or raw.get("organo") or ""),
            "importe": raw.get("presupuestoTotal") or raw.get("importe") or 0,
            "fecha": str(raw.get("fechaRecepcion") or raw.get("fecha_publicacion") or ""),
            "fecha_fin_plazo": str(raw.get("fechaFinPlazo") or raw.get("fecha_fin_plazo") or ""),
            "instrumento": str(raw.get("instrumento") or ""),
            "mrr": bool(raw.get("mrr")),  # Mecanismo Recuperación y Resiliencia (PRTR)
        })

    return {
        "rango": f"{fecha_desde} → {today.isoformat()}",
        "descripcion_filtro": descripcion or "",
        "n_items": len(out),
        "convocatorias": out,
        "error": None,
    }


@ToolRegistry.register("bdns_search_concesiones")
def bdns_search_concesiones(
    beneficiario: str | None = None,
    days_back: int = 90,
    max_items: int = 20,
) -> dict[str, Any]:
    """Busca concesiones de subvenciones (quien recibió qué) en BDNS.

    Args:
      beneficiario: NIF o nombre del beneficiario
      days_back: días hacia atrás
      max_items: max resultados

    Returns:
      Lista de resoluciones con {beneficiario, importe, organo, fecha}.
    """
    try:
        from etl.sources.spain.bdns import get_bdns_client
    except ImportError as exc:
        return {"error": str(exc), "concesiones": [], "n_items": 0}

    client = get_bdns_client()
    if client._session is None:
        return {"error": "BDNSClient sin sesión HTTP", "concesiones": [], "n_items": 0}

    today = date.today()
    fecha_desde = (today - timedelta(days=max(1, min(days_back, 365)))).isoformat()

    items = client.search_concesiones(
        beneficiario=beneficiario,
        fecha_desde=fecha_desde,
        fecha_hasta=today.isoformat(),
        page=0,
        page_size=min(max_items, 50),
    )

    out = []
    for raw in items[:max_items]:
        out.append({
            "id": str(raw.get("id") or ""),
            "beneficiario": str(raw.get("beneficiario") or raw.get("razonSocial") or ""),
            "importe": raw.get("importe") or 0,
            "organo": str(raw.get("desOrgano") or raw.get("organo") or ""),
            "fecha": str(raw.get("fechaConcesion") or raw.get("fecha") or ""),
            "convocatoria": str(raw.get("numeroConvocatoria") or ""),
        })

    return {
        "rango": f"{fecha_desde} → {today.isoformat()}",
        "beneficiario_filtro": beneficiario or "",
        "n_items": len(out),
        "concesiones": out,
        "error": None,
    }


# ────────────────────────────────────────────────────────────────────
# TED · Licitaciones europeas
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("ted_search_licitaciones")
def ted_search_licitaciones(
    sector: str | None = None,
    days_back: int = 30,
    country: str = "ESP",
    max_items: int = 20,
) -> dict[str, Any]:
    """Busca licitaciones públicas europeas (TED).

    Args:
      sector: clave de CPV_BY_SECTOR (energia, farma, defensa,
              infraestructuras, telecom, transporte, agroalimentario,
              vivienda, educacion) o None para todos los sectores.
      days_back: días hacia atrás
      country: ISO alpha-3 (ESP default)
      max_items: max resultados

    Returns:
      Lista de notices con {publication_number, title, buyer, deadline,
      importe_estimado, url, cpv_codes}.
    """
    try:
        from etl.sources.eu.ted import get_ted_client, CPV_BY_SECTOR
    except ImportError as exc:
        return {"error": str(exc), "licitaciones": [], "n_items": 0}

    client = get_ted_client()
    if client._session is None:
        return {"error": "TEDClient sin sesión HTTP", "licitaciones": [], "n_items": 0}

    cpv_codes = None
    if sector:
        cpv_codes = CPV_BY_SECTOR.get(sector.lower())
        if cpv_codes is None:
            return {
                "error": f"Sector '{sector}' no reconocido · sectores válidos: {list(CPV_BY_SECTOR.keys())}",
                "licitaciones": [],
                "n_items": 0,
            }

    today = date.today()
    fecha_desde = (today - timedelta(days=max(1, min(days_back, 90)))).isoformat()

    result = client.search_notices(
        country=country,
        date_from=fecha_desde,
        date_to=today.isoformat(),
        cpv_codes=cpv_codes,
        page=1,
        page_size=min(max_items, 50),
    )
    if not result:
        return {"error": "TED API sin respuesta", "licitaciones": [], "n_items": 0}

    notices = result.get("notices") or result.get("results") or []
    out = []
    for raw in notices[:max_items]:
        title_obj = raw.get("notice-title") or raw.get("noticeTitle") or {}
        title = title_obj.get("spa") if isinstance(title_obj, dict) else str(title_obj)
        if isinstance(title_obj, dict) and not title:
            title = title_obj.get("eng") or next(iter(title_obj.values()), "")

        buyer = raw.get("buyer-name") or raw.get("buyerName") or ""
        if isinstance(buyer, dict):
            buyer = buyer.get("spa") or buyer.get("eng") or next(iter(buyer.values()), "")

        out.append({
            "id": str(raw.get("publication-number") or ""),
            "title": str(title or "")[:300],
            "buyer": str(buyer)[:240],
            "fecha": str(raw.get("publication-date") or ""),
            "deadline": str(raw.get("deadline-date-lots") or ""),
            "cpv_codes": raw.get("classification-cpv") or [],
        })

    return {
        "rango": f"{fecha_desde} → {today.isoformat()}",
        "country": country,
        "sector": sector or "todos",
        "n_items": len(out),
        "licitaciones": out,
        "error": None,
    }


# ────────────────────────────────────────────────────────────────────
# Congreso · ya tenemos congreso_client · solo exponemos a Brain
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("congreso_votaciones")
def congreso_votaciones(
    legislatura: int | None = None,
    max_items: int = 20,
) -> dict[str, Any]:
    """Devuelve votaciones recientes del Congreso de los Diputados.

    Args:
      legislatura: número de legislatura (None = actual)
      max_items: max resultados

    Returns:
      Lista de votaciones del Congreso.
    """
    try:
        from etl.sources.parliament.congreso_client import CongresoClient
    except ImportError as exc:
        return {"error": str(exc), "votaciones": [], "n_items": 0}

    try:
        client = CongresoClient()
        result = client.get_votaciones(legislatura=legislatura, limit=max_items)
        if not result:
            return {"votaciones": [], "n_items": 0, "error": "Sin resultados"}
        # Normalizar formato
        votaciones = result if isinstance(result, list) else result.get("items", [])
        return {
            "legislatura": legislatura,
            "n_items": len(votaciones),
            "votaciones": votaciones[:max_items],
            "error": None,
        }
    except Exception as exc:
        return {"error": str(exc), "votaciones": [], "n_items": 0}


@ToolRegistry.register("congreso_iniciativas")
def congreso_iniciativas(
    tipo: str | None = None,
    legislatura: int | None = None,
    max_items: int = 20,
) -> dict[str, Any]:
    """Devuelve iniciativas legislativas del Congreso.

    Args:
      tipo: 'ley', 'rdley', 'rdleg', 'pnl' (proposición no de ley), etc.
      legislatura: número de legislatura
      max_items: max resultados
    """
    try:
        from etl.sources.parliament.congreso_client import CongresoClient
    except ImportError as exc:
        return {"error": str(exc), "iniciativas": [], "n_items": 0}

    try:
        client = CongresoClient()
        result = client.get_iniciativas(
            tipo=tipo,
            legislatura=legislatura,
            limit=max_items,
        )
        items = result if isinstance(result, list) else (result or {}).get("items", []) if result else []
        return {
            "legislatura": legislatura,
            "tipo": tipo or "todas",
            "n_items": len(items),
            "iniciativas": items[:max_items],
            "error": None,
        }
    except Exception as exc:
        return {"error": str(exc), "iniciativas": [], "n_items": 0}


# ────────────────────────────────────────────────────────────────────
# Senado · ya tenemos senado_api.py · solo exponemos a Brain
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("senado_actividad")
def senado_actividad(
    tipo: str | None = None,
    max_items: int = 20,
) -> dict[str, Any]:
    """Devuelve actividad reciente del Senado.

    Args:
      tipo: filtro por tipo (enmienda, mocion, pregunta, interpelacion, proyecto)
      max_items: max resultados

    Returns:
      Lista de items del Senado.
    """
    try:
        # senado_api.py tiene funciones a nivel módulo, no clase
        from etl.sources import senado_api  # type: ignore
    except ImportError as exc:
        return {"error": str(exc), "items": [], "n_items": 0}

    # Intentar varias APIs del módulo · falla cerrado
    items: list[dict[str, Any]] = []
    try:
        # Buscar función pública del módulo
        if hasattr(senado_api, "fetch_recent"):
            items = senado_api.fetch_recent(tipo=tipo, limit=max_items) or []  # type: ignore[attr-defined]
        elif hasattr(senado_api, "get_recent"):
            items = senado_api.get_recent(tipo=tipo, limit=max_items) or []  # type: ignore[attr-defined]
        else:
            return {
                "error": "API senado_api sin función fetch_recent/get_recent",
                "items": [],
                "n_items": 0,
                "hint": "revisar etl/sources/senado_api.py y exponer fetch_recent",
            }
    except Exception as exc:
        return {"error": str(exc), "items": [], "n_items": 0}

    return {
        "tipo": tipo or "todos",
        "n_items": len(items),
        "items": items[:max_items],
        "error": None,
    }


__all__ = [
    "bdns_search_convocatorias",
    "bdns_search_concesiones",
    "ted_search_licitaciones",
    "congreso_votaciones",
    "congreso_iniciativas",
    "senado_actividad",
]
