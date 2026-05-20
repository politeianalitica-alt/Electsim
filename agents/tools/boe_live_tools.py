"""Tools BOE en tiempo real para el Brain (Sprint 2 · S2.1).

> **Sprint 2 · S2.1** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 2`)

Politeia ya tiene `BOEClient` (en `etl/sources/legislative/boe_client.py`) que
consulta la API oficial del BOE (datos abiertos). Lo que faltaba: exponerlo
como tools registradas en el Brain para que el copiloto pueda invocarlas en
conversaciones del analista.

Diferencia con `agents/tools/legislative_tools.py` (que tambien existe):
  - `legislative_tools.py` → consulta NUESTRA BD (datos ya ingestados)
  - `boe_live_tools.py`    → consulta la API del BOE EN TIEMPO REAL

Caso de uso típico:
  Analista pregunta al Brain: "¿hay novedades del BOE de hoy sobre fiscalidad?"
  → Brain invoca `boe_sumario_hoy()` o `boe_search_consolidated('IRPF')`
  → resultado vuelve sin esperar al pipeline de ingesta

Inspirado en el repo `gits amigos/MCP-BOE-main` (4165 LOC, 4 tools MCP).
NO copiamos su código · reusamos nuestro BOEClient que ya funciona.

Las funciones siguen el patron del registro de tools:
  - Devuelven dict (o lista de dicts) JSON-serializable
  - Falla cerrado: devuelven `{"error": str}` en caso de fallo
  - Sin excepciones hacia el Brain
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# Singleton del cliente BOE
# ────────────────────────────────────────────────────────────────────

_CLIENT: Any | None = None


def _get_client() -> Any | None:
    """Devuelve el BOEClient singleton, lazy-init."""
    global _CLIENT
    if _CLIENT is None:
        try:
            from etl.sources.legislative.boe_client import BOEClient
            _CLIENT = BOEClient()
        except Exception as exc:
            logger.warning("boe_live_tools: BOEClient no disponible · %s", exc)
            _CLIENT = None
    return _CLIENT


# ────────────────────────────────────────────────────────────────────
# Tools registradas en el Brain
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("boe_sumario")
def boe_sumario(fecha: str | None = None) -> dict[str, Any]:
    """Devuelve el sumario completo del BOE en una fecha (default: hoy).

    Args:
      fecha: 'YYYY-MM-DD' o None para hoy.

    Returns:
      {
        "fecha": "2026-05-19",
        "n_items": 47,
        "items": [
          {"id": "BOE-A-2026-12345", "titulo": "...", "seccion": "I",
           "departamento": "Ministerio de Hacienda", "epigrafe": "Disposiciones generales",
           "url_html": "...", "url_pdf": "..."},
          ...
        ],
        "error": null
      }
    """
    client = _get_client()
    if client is None:
        return {"error": "BOEClient no disponible", "items": [], "fecha": fecha, "n_items": 0}

    target_date = fecha or date.today().isoformat()
    sumario = client.get_sumario(target_date)
    if sumario is None:
        return {
            "fecha": target_date,
            "n_items": 0,
            "items": [],
            "error": f"Sumario no disponible para {target_date}",
        }

    items = client.extract_items_from_sumario(sumario)
    return {
        "fecha": target_date,
        "n_items": len(items),
        "items": items[:100],  # limite razonable para LLM
        "error": None,
    }


@ToolRegistry.register("boe_search_consolidated")
def boe_search_consolidated(
    query: str,
    pagina: int = 1,
) -> dict[str, Any]:
    """Busca en la legislacion consolidada (>50.000 normas vigentes).

    Args:
      query: texto libre (ej. 'IRPF', 'Ley Vivienda 2023', 'protección de datos').
      pagina: número de página (1-based, 20 resultados por página).

    Returns:
      {
        "query": "IRPF",
        "pagina": 1,
        "total": 234,
        "items": [{"id": "...", "titulo": "...", "rango": "...", "fecha": "..."}],
        "error": null,
      }
    """
    client = _get_client()
    if client is None:
        return {"error": "BOEClient no disponible", "items": [], "query": query, "total": 0}

    if not query or not query.strip():
        return {"error": "query vacía", "items": [], "query": query, "total": 0}

    result = client.search_consolidated(query.strip(), pagina=pagina)
    if result is None:
        return {
            "query": query,
            "pagina": pagina,
            "items": [],
            "total": 0,
            "error": "Búsqueda falló o sin resultados",
        }

    # Normalizamos diferentes formatos de respuesta del BOE
    items_raw = result.get("items") or result.get("documentos") or []
    if isinstance(items_raw, dict):
        items_raw = [items_raw]

    items: list[dict[str, Any]] = []
    for it in items_raw[:20]:
        items.append({
            "id": it.get("identificador") or it.get("id") or "",
            "titulo": it.get("titulo") or it.get("texto") or "",
            "rango": it.get("rango") or it.get("rangoNorma") or "",
            "fecha": it.get("fechaPublicacion") or it.get("fecha") or "",
            "url": it.get("urlHtml") or it.get("url") or "",
        })

    return {
        "query": query,
        "pagina": pagina,
        "total": int(result.get("total", len(items))),
        "items": items,
        "error": None,
    }


@ToolRegistry.register("boe_get_norma")
def boe_get_norma(doc_id: str) -> dict[str, Any]:
    """Descarga metadatos completos de una norma BOE concreta.

    Args:
      doc_id: identificador BOE, ej. 'BOE-A-2026-12345' (norma puntual)
              o id de legislacion consolidada (ej. 'BOE-A-1985-12666' para LO 6/1985).

    Returns:
      {
        "id": "BOE-A-2026-12345",
        "titulo": "...",
        "rango": "Real Decreto-ley",
        "fecha_publicacion": "...",
        "fecha_disposicion": "...",
        "departamento": "...",
        "url_html": "...",
        "url_pdf": "...",
        "texto_disponible": true,
        "error": null,
      }
    """
    client = _get_client()
    if client is None:
        return {"error": "BOEClient no disponible", "id": doc_id}

    if not doc_id or not doc_id.strip():
        return {"error": "doc_id vacío", "id": ""}

    doc_id = doc_id.strip()

    # Intento 1: norma puntual (sumario diario o decreto-ley)
    doc = client.get_documento(doc_id)
    if doc is None:
        # Intento 2: ley consolidada
        doc = client.get_consolidated_law(doc_id)
        if doc is None:
            return {
                "id": doc_id,
                "error": f"Documento {doc_id} no encontrado en BOE",
            }

    # Aplanamos campos comunes
    metadatos = doc.get("data") or doc.get("documento") or doc
    return {
        "id": doc_id,
        "titulo": metadatos.get("titulo") or metadatos.get("title") or "",
        "rango": metadatos.get("rango") or metadatos.get("rangoNorma") or "",
        "fecha_publicacion": metadatos.get("fechaPublicacion") or metadatos.get("fecha_publicacion") or "",
        "fecha_disposicion": metadatos.get("fechaDisposicion") or metadatos.get("fecha_disposicion") or "",
        "departamento": metadatos.get("departamento") or metadatos.get("departamentoEmisor") or "",
        "url_html": metadatos.get("urlHtml") or metadatos.get("url_html") or "",
        "url_pdf": metadatos.get("urlPdf") or metadatos.get("url_pdf") or "",
        "texto_disponible": bool(metadatos.get("texto") or metadatos.get("html")),
        "error": None,
    }


@ToolRegistry.register("boe_novedades_ultimos_dias")
def boe_novedades_ultimos_dias(
    days: int = 7,
    filtro_titulo: str | None = None,
) -> dict[str, Any]:
    """Compila novedades del BOE de los ultimos N dias en una sola tool.

    Util para resumenes diarios o briefings: el Brain pregunta una vez y
    obtiene la cobertura semanal completa.

    Args:
      days: numero de dias hacia atras (max 30 por seguridad).
      filtro_titulo: substring opcional para filtrar items por titulo
                     (ej. 'fiscal', 'sanidad', 'energia').

    Returns:
      {
        "rango": "2026-05-12 → 2026-05-19",
        "n_dias_consultados": 7,
        "n_items_total": 312,
        "items_filtrados": 24,
        "items": [...],
        "error": null,
      }
    """
    client = _get_client()
    if client is None:
        return {"error": "BOEClient no disponible", "items": [], "n_items_total": 0}

    days = max(1, min(days, 30))
    today = date.today()
    all_items: list[dict[str, Any]] = []

    for offset in range(days):
        fecha = today - timedelta(days=offset)
        sumario = client.get_sumario(fecha)
        if sumario is None:
            continue
        items = client.extract_items_from_sumario(sumario)
        for it in items:
            it["fecha_consulta"] = fecha.isoformat()
        all_items.extend(items)

    filtrados = all_items
    if filtro_titulo:
        ft = filtro_titulo.lower().strip()
        filtrados = [
            it for it in all_items
            if ft in (it.get("titulo") or "").lower()
        ]

    return {
        "rango": f"{(today - timedelta(days=days-1)).isoformat()} → {today.isoformat()}",
        "n_dias_consultados": days,
        "n_items_total": len(all_items),
        "items_filtrados": len(filtrados),
        "items": filtrados[:50],  # limite practico para LLM
        "filtro_titulo": filtro_titulo,
        "error": None,
    }


# ────────────────────────────────────────────────────────────────────
# API pública (compatibilidad import directo)
# ────────────────────────────────────────────────────────────────────

__all__ = [
    "boe_sumario",
    "boe_search_consolidated",
    "boe_get_norma",
    "boe_novedades_ultimos_dias",
]
