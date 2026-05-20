"""Brain tools sector Farma · Sprint 8 · S8.4.

> **Sprint 8 · S8.4** (`docs/ROADMAP_GITS_AMIGOS.md §8 Sprint 8 · Farma`)

Expone capacidades AEMPS/CIMA + EMA + tracker pharma_signals al Brain.

Tools:
  - aemps_cima_buscar(nombre, laboratorio, practiv1)
  - aemps_ficha_medicamento(nregistro)
  - aemps_problemas_suministro(nombre, practiv1)
  - ema_alertas(feed)                        · news/shortages/epar/referrals
  - pharma_signal(slug)
  - list_pharma_signals(source, kind, status, severity)
  - active_pharma_signals(severity_min)

Falla cerrado: excepciones → {"error": str, ...vacío}.
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# AEMPS / CIMA
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("aemps_cima_buscar")
def aemps_cima_buscar(
    nombre: str | None = None,
    laboratorio: str | None = None,
    practiv1: str | None = None,
    limit: int = 25,
) -> dict[str, Any]:
    """Busca medicamentos en CIMA (catálogo oficial AEMPS).

    Args:
      nombre: nombre comercial.
      laboratorio: titular autorización.
      practiv1: principio activo DCI.
      limit: tamaño página (default 25).

    Returns:
      {"n_results": int, "results": [...], "total": int, "error": str | None}
    """
    try:
        from etl.sources.spain.aemps_cima import get_aemps_client
        client = get_aemps_client()
        data = client.buscar_medicamento(
            nombre=nombre,
            laboratorio=laboratorio,
            practiv1=practiv1,
            pagesize=limit,
        )
        if data.get("error"):
            return {"n_results": 0, "results": [], "error": data["error"]}
        results = data.get("resultados", []) or []
        return {
            "n_results": len(results),
            "total": data.get("totalFilas", len(results)),
            "results": results,
            "error": None,
        }
    except Exception as exc:
        return {"n_results": 0, "results": [], "error": str(exc)}


@ToolRegistry.register("aemps_ficha_medicamento")
def aemps_ficha_medicamento(nregistro: str) -> dict[str, Any]:
    """Ficha técnica completa de un medicamento por nº registro AEMPS."""
    try:
        from etl.sources.spain.aemps_cima import get_aemps_client
        client = get_aemps_client()
        ficha = client.ficha_medicamento(nregistro)
        if ficha.get("error"):
            return {"nregistro": nregistro, "error": ficha["error"]}
        ficha["error"] = None
        return ficha
    except Exception as exc:
        return {"nregistro": nregistro, "error": str(exc)}


@ToolRegistry.register("aemps_problemas_suministro")
def aemps_problemas_suministro(
    nombre: str | None = None,
    practiv1: str | None = None,
    limit: int = 25,
) -> dict[str, Any]:
    """Alertas activas de desabastecimiento en CIMA.

    Crítico para clientes farma/distribución: detecta medicamentos
    sin suministro normal en farmacias españolas.
    """
    try:
        from etl.sources.spain.aemps_cima import get_aemps_client
        client = get_aemps_client()
        data = client.problemas_suministro(
            nombre=nombre, practiv1=practiv1, pagesize=limit,
        )
        if data.get("error"):
            return {"n_results": 0, "results": [], "error": data["error"]}
        results = data.get("resultados", []) or []
        return {
            "n_results": len(results),
            "results": results,
            "error": None,
        }
    except Exception as exc:
        return {"n_results": 0, "results": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# EMA · feeds RSS
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("ema_alertas")
def ema_alertas(feed: str = "shortages", limit: int = 25) -> dict[str, Any]:
    """Últimos items del feed RSS oficial EMA.

    Args:
      feed: 'news' (general) | 'shortages' (desabastecimientos UE)
            | 'epar' (autorizaciones) | 'referrals' (revisiones).
      limit: máximo items.

    Returns:
      {"feed": str, "n_items": int, "items": [...]}
    """
    try:
        from etl.sources.eu.ema import get_ema_client, _EMA_FEEDS
        if feed not in _EMA_FEEDS:
            return {
                "feed": feed,
                "n_items": 0,
                "items": [],
                "error": f"feed '{feed}' no válido · usa {list(_EMA_FEEDS)}",
            }
        client = get_ema_client()
        items = client.fetch_feed(feed)[:max(1, limit)]
        for it in items:
            pd = it.get("pub_date")
            if pd is not None and hasattr(pd, "isoformat"):
                it["pub_date"] = pd.isoformat()
        return {"feed": feed, "n_items": len(items), "items": items, "error": None}
    except Exception as exc:
        return {"feed": feed, "n_items": 0, "items": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# pharma_signals · tracker interno
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("pharma_signal")
def pharma_signal(slug: str) -> dict[str, Any]:
    """Detalle de una señal farma por slug.

    Slugs de ejemplo en seed: shortage_ozempic_es_2025, shortage_amoxicilina_es_2025,
    shortage_metilfenidato_es_2024, epar_leqembi_2025, referral_pseudoefedrina_2024,
    recall_ranitidina_es, genericization_keytruda_2028, shortage_insulina_humana_es.
    """
    try:
        from etl.sources.pharma import get_signal
        row = get_signal(slug)
        if row is None:
            return {"error": f"Señal '{slug}' no encontrada", "slug": slug}
        for k in ("detected_at", "resolved_at"):
            v = row.get(k)
            if v is not None and hasattr(v, "isoformat"):
                row[k] = v.isoformat()
        row["error"] = None
        return row
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("list_pharma_signals")
def list_pharma_signals(
    source: str | None = None,
    signal_kind: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """Lista señales farma con filtros.

    Args:
      source: 'aemps', 'ema', 'fda', 'manual'.
      signal_kind: 'shortage', 'recall', 'epar', 'referral', 'genericization', 'pricing'.
      status: 'active', 'monitoring', 'resolved', 'archived'.
      severity: 'info', 'medium', 'high', 'critical'.
    """
    try:
        from etl.sources.pharma import list_signals
        rows = list_signals(
            source=source, signal_kind=signal_kind,
            status=status, severity=severity, limit=limit,
        )
        for r in rows:
            for k in ("detected_at", "resolved_at"):
                v = r.get(k)
                if v is not None and hasattr(v, "isoformat"):
                    r[k] = v.isoformat()
        return {
            "n_items": len(rows),
            "items": rows,
            "filters": {
                "source": source, "signal_kind": signal_kind,
                "status": status, "severity": severity,
            },
            "error": None,
        }
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("active_pharma_signals")
def active_pharma_signals(severity_min: str = "medium") -> dict[str, Any]:
    """Señales farma activas con severidad ≥ umbral (panel alertas).

    Args:
      severity_min: umbral mínimo · 'info' incluye todo, 'critical' solo lo más grave.

    Returns:
      {"severity_min": str, "n_items": int, "items": [..., days_active]}
    """
    try:
        from etl.sources.pharma import active_signals
        rows = active_signals(severity_min=severity_min)
        for r in rows:
            v = r.get("detected_at")
            if v is not None and hasattr(v, "isoformat"):
                r["detected_at"] = v.isoformat()
        return {
            "severity_min": severity_min,
            "n_items": len(rows),
            "items": rows,
            "error": None,
        }
    except Exception as exc:
        return {"severity_min": severity_min, "n_items": 0, "items": [], "error": str(exc)}


__all__ = [
    "aemps_cima_buscar",
    "aemps_ficha_medicamento",
    "aemps_problemas_suministro",
    "ema_alertas",
    "pharma_signal",
    "list_pharma_signals",
    "active_pharma_signals",
]
