"""
Tools legislativas para Politeia Brain / agentes IA.

Estas funciones son el puente entre el Core Legislativo y el sistema de agentes.
Cada función devuelve datos normalizados listos para consumo LLM.

Conecta con:
    dashboard.services.legislative_core  (datos BD)
    etl.sources.legislative.boe_client   (BOE en tiempo real)
    etl.sources.legislative.boe_adapter  (clasificación)
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)


def search_legal_items(
    query: str,
    limit: int = 10,
    source: str | None = None,
) -> list[dict[str, Any]]:
    """
    Busca ítems legislativos (BOE + Congreso) por texto libre.

    Args:
        query: texto a buscar.
        limit: máximo de resultados.
        source: 'boe' | 'congreso' | None (ambos).

    Returns:
        list[dict] con campos: tipo_fuente, titulo, tipo, fecha, impacto, url.
    """
    try:
        from dashboard.services.legislative_core import buscar_items_legislativos
        df = buscar_items_legislativos(query, limit=limit)
        if df.empty:
            return []
        if source:
            df = df[df.get("tipo_fuente", "") == source]
        return df.fillna("").to_dict("records")
    except Exception as exc:
        logger.warning("search_legal_items: %s", exc)
        return []


def get_recent_boe_items(
    days: int = 7,
    impact_filter: list[str] | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """
    Retorna ítems BOE recientes, opcionalmente filtrados por nivel de impacto.

    Args:
        days: días atrás desde hoy.
        impact_filter: ['CRÍTICO', 'ALTO', 'MEDIO', 'BAJO', 'INFORMATIVO'] o None.
        limit: máximo de resultados.

    Returns:
        list[dict] con campos: source_id, titulo, legal_rank, departamento,
        seccion, publication_date, impacto, sectors, url_html.
    """
    try:
        from dashboard.services.legislative_core import cargar_boe_reciente
        df = cargar_boe_reciente(limit=limit, days=days, impact_filter=impact_filter)
        if df.empty:
            return []
        return df.fillna("").to_dict("records")
    except Exception as exc:
        logger.warning("get_recent_boe_items: %s", exc)
        return []


def get_recent_parliamentary_initiatives(
    days: int = 30,
    tipos: list[str] | None = None,
    legislatura: str = "15",
    limit: int = 20,
) -> list[dict[str, Any]]:
    """
    Retorna iniciativas parlamentarias recientes.

    Args:
        days: ventana temporal.
        tipos: ['PL', 'PPL', 'PNL', …] o None.
        legislatura: número de legislatura.
        limit: máximo de resultados.

    Returns:
        list[dict] con campos: source_id, initiative_type, title,
        presented_date, status, impact_level, sectors.
    """
    try:
        from dashboard.services.legislative_core import cargar_iniciativas_recientes
        df = cargar_iniciativas_recientes(limit=limit, days=days, tipos=tipos, legislatura=legislatura)
        if df.empty:
            return []
        return df.fillna("").to_dict("records")
    except Exception as exc:
        logger.warning("get_recent_parliamentary_initiatives: %s", exc)
        return []


def summarize_legislative_item(item_id: str) -> str:
    """
    Genera un resumen estructurado de un ítem legislativo para el agente.

    Busca primero en legal_items, luego en parliamentary_initiatives.
    Devuelve texto Markdown listo para consumo del LLM.

    Args:
        item_id: 'BOE-A-2026-XXXXX' o source_id del Congreso.

    Returns:
        str con resumen Markdown o mensaje de error.
    """
    # 1. Buscar en legal_items
    try:
        from dashboard.services.legislative_core import _safe_read_sql
        df = _safe_read_sql("""
            SELECT title, legal_rank, department, section,
                   publication_date, impact_level, sectors, summary, url_html
            FROM legal_items
            WHERE source_id = :sid
            LIMIT 1
        """, {"sid": item_id})
        if not df.empty:
            r = df.iloc[0]
            sectors_str = ", ".join(r.get("sectors") or []) or "—"
            return (
                f"## {r['title']}\n\n"
                f"**Rango legal**: {r.get('legal_rank') or '—'}  \n"
                f"**Departamento**: {r.get('department') or '—'}  \n"
                f"**Sección BOE**: {r.get('section') or '—'}  \n"
                f"**Publicación**: {r.get('publication_date') or '—'}  \n"
                f"**Impacto**: {r.get('impact_level') or '—'}  \n"
                f"**Sectores**: {sectors_str}  \n\n"
                f"{r.get('summary') or '_Sin resumen disponible._'}  \n\n"
                f"[Ver en BOE]({r.get('url_html') or 'https://boe.es'})"
            )
    except Exception as exc:
        logger.debug("summarize_legislative_item (BOE): %s", exc)

    # 2. Buscar en parliamentary_initiatives
    try:
        from dashboard.services.legislative_core import _safe_read_sql
        df = _safe_read_sql("""
            SELECT title, initiative_type, legislature, presented_date,
                   status, result, impact_level, sectors, authors, raw_url
            FROM parliamentary_initiatives
            WHERE source_id = :sid
            LIMIT 1
        """, {"sid": item_id})
        if not df.empty:
            r = df.iloc[0]
            sectors_str = ", ".join(r.get("sectors") or []) or "—"
            authors_str = "—"
            try:
                import json
                authors = json.loads(r["authors"]) if isinstance(r.get("authors"), str) else (r.get("authors") or [])
                if authors:
                    authors_str = ", ".join(a.get("name", "") for a in authors[:4] if a.get("name"))
            except Exception:
                pass
            return (
                f"## {r['title']}\n\n"
                f"**Tipo**: {r.get('initiative_type') or '—'}  \n"
                f"**Legislatura**: {r.get('legislature') or '—'}  \n"
                f"**Presentación**: {r.get('presented_date') or '—'}  \n"
                f"**Estado**: {r.get('status') or '—'}  \n"
                f"**Resultado**: {r.get('result') or 'Pendiente'}  \n"
                f"**Impacto**: {r.get('impact_level') or '—'}  \n"
                f"**Sectores**: {sectors_str}  \n"
                f"**Autores**: {authors_str}  \n\n"
                f"[Ver en Congreso]({r.get('raw_url') or 'https://congreso.es'})"
            )
    except Exception as exc:
        logger.debug("summarize_legislative_item (Congreso): %s", exc)

    return f"_No se encontró información para el ítem '{item_id}'._"


def get_legislative_kpis() -> dict[str, Any]:
    """
    Retorna los KPIs del módulo legislativo para el agente.

    Returns:
        dict con: boe_hoy, boe_criticos, iniciativas_mes, hay_datos, etc.
    """
    try:
        from dashboard.services.legislative_core import cargar_kpis_legislativos
        return cargar_kpis_legislativos()
    except Exception as exc:
        logger.warning("get_legislative_kpis: %s", exc)
        return {"hay_datos": False}


def classify_text_impact(titulo: str, seccion: str = "", departamento: str = "") -> str:
    """
    Clasifica el impacto de un texto legislativo con reglas deterministas.
    Útil para el agente cuando analiza texto externo.

    Returns:
        'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO' | 'INFORMATIVO'
    """
    try:
        from etl.sources.legislative.boe_adapter import clasificar_impacto
        return clasificar_impacto(titulo, seccion, departamento)
    except Exception:
        return "INFORMATIVO"


def get_boe_today_from_api() -> list[dict[str, Any]]:
    """
    Descarga el sumario BOE del día directamente desde la API (no desde BD).
    Útil para el agente en modo tiempo real sin depender de ingesta previa.
    """
    try:
        from etl.sources.legislative.boe_client import BOEClient
        from etl.sources.legislative.boe_adapter import BOEAdapter
        client = BOEClient()
        adapter = BOEAdapter()
        sumario = client.get_sumario()
        if not sumario:
            return []
        raw_items = BOEClient.extract_items_from_sumario(sumario)
        legal_items = adapter.adapt_many(raw_items)
        return [
            {
                "source_id": li.source_id,
                "titulo": li.title,
                "rango": li.legal_rank,
                "departamento": li.department,
                "seccion": li.section,
                "impacto": li.impact_level,
                "sectores": li.sectors,
                "url": li.url_html,
            }
            for li in legal_items
        ]
    except Exception as exc:
        logger.warning("get_boe_today_from_api: %s", exc)
        return []
