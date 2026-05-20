"""Sanciones marítimas · wrapper de compliance + OpenSanctions.

Sprint P5 del módulo Puertos.

Adapta `agents.tools.compliance_tools:compliance_screen` y
`agents.tools.compliance_tools:opensanctions_search` a shape vessel-aware:
  - screen_vessel(imo) · busca por IMO+nombre buque+operador en OFAC/EU/UN
  - screen_operator(name) · busca el operador como company/legal entity
  - screen_batch(vessels?, operators?) · ejecuta múltiples y agrega

Falla cerrado: si compliance no es importable o falla, devuelve
status='unavailable' con la entrada limpia (CLEAR) por defecto · no rompe
flujos UI.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _safe_screen(name: str, schema_kind: str = "Vessel") -> dict[str, Any]:
    """Llamada segura a compliance_screen con fallback."""
    try:
        from agents.tools.compliance_tools import compliance_screen
        # compliance_screen acepta Person/Company/Organization/LegalEntity.
        # Para Vessel mapeamos a LegalEntity (OpenSanctions usa este schema
        # para barcos sancionados también).
        kind = schema_kind if schema_kind in (
            "Person", "Company", "Organization", "LegalEntity"
        ) else "LegalEntity"
        return compliance_screen(name=name, schema_kind=kind, threshold=0.55)
    except Exception as exc:
        logger.debug("compliance_screen fallback: %s", exc)
        return {
            "risk_score": 0,
            "risk_level": "CLEAR",
            "sources": [],
            "summary": {"note": "compliance no disponible"},
            "partial": True,
            "error": str(exc),
        }


def _safe_opensanctions(query: str) -> list[dict[str, Any]]:
    """Búsqueda directa OpenSanctions · devuelve hits crudos."""
    try:
        from agents.tools.compliance_tools import opensanctions_search
        res = opensanctions_search(query=query, limit=10)
        if isinstance(res, dict):
            return res.get("hits") or res.get("results") or []
        return res if isinstance(res, list) else []
    except Exception as exc:
        logger.debug("opensanctions_search fallback: %s", exc)
        return []


# ─────────────────────────────────────────────────────────────────
# API pública
# ─────────────────────────────────────────────────────────────────

def screen_vessel(imo: str) -> dict[str, Any]:
    """Screening sanciones para un buque por IMO.

    Estrategia · multi-query (IMO, nombre, operador) y agrega el peor risk_score:
      1. compliance_screen(name=nombre_buque, schema='LegalEntity')
      2. compliance_screen(name=operador, schema='Company')
      3. opensanctions_search(query=IMO) · hits directos por IMO

    Returns:
        {
          imo, vessel_name, operator, flag_iso,
          hit: bool, risk_score [0-100], risk_level,
          sources: [...],
          checks: [{query, type, risk_score, n_hits}, ...]
        }
    """
    from .vessels_seed import get_vessel

    v = get_vessel(imo)
    if v is None:
        return {
            "ok": False,
            "imo": imo,
            "error": f"vessel '{imo}' no existe en catálogo",
        }

    checks: list[dict[str, Any]] = []
    max_score = 0
    worst_level = "CLEAR"
    all_sources: list[dict[str, Any]] = []

    # 1. Nombre del buque · LegalEntity
    res_name = _safe_screen(v["name"], schema_kind="LegalEntity")
    score = int(res_name.get("risk_score", 0))
    checks.append({
        "query": v["name"], "type": "vessel_name",
        "risk_score": score, "risk_level": res_name.get("risk_level", "CLEAR"),
        "n_hits": len(res_name.get("sources", [])),
    })
    if score > max_score:
        max_score, worst_level = score, res_name.get("risk_level", "CLEAR")
    all_sources.extend(res_name.get("sources", []))

    # 2. Operador · Company
    if v.get("operator"):
        res_op = _safe_screen(v["operator"], schema_kind="Company")
        score = int(res_op.get("risk_score", 0))
        checks.append({
            "query": v["operator"], "type": "operator",
            "risk_score": score, "risk_level": res_op.get("risk_level", "CLEAR"),
            "n_hits": len(res_op.get("sources", [])),
        })
        if score > max_score:
            max_score, worst_level = score, res_op.get("risk_level", "CLEAR")
        all_sources.extend(res_op.get("sources", []))

    # 3. OpenSanctions directo por IMO
    imo_hits = _safe_opensanctions(v["imo"])
    if imo_hits:
        # Hits directos por IMO son muy fuertes (matching ID estable)
        boost = 80
        checks.append({
            "query": v["imo"], "type": "imo_direct",
            "risk_score": boost, "risk_level": "HIGH",
            "n_hits": len(imo_hits),
        })
        if boost > max_score:
            max_score, worst_level = boost, "HIGH"
        all_sources.extend(imo_hits)

    return {
        "ok": True,
        "imo": v["imo"],
        "vessel_name": v["name"],
        "operator": v["operator"],
        "flag_iso": v["flag_iso"],
        "type": v["type"],
        "hit": max_score >= 60,
        "risk_score": max_score,
        "risk_level": worst_level,
        "sources": all_sources[:30],  # cap razonable
        "checks": checks,
    }


def screen_operator(name: str) -> dict[str, Any]:
    """Screening directo de un operador/armador."""
    res = _safe_screen(name, schema_kind="Company")
    return {
        "ok": True,
        "operator": name,
        "risk_score": int(res.get("risk_score", 0)),
        "risk_level": res.get("risk_level", "CLEAR"),
        "hit": int(res.get("risk_score", 0)) >= 60,
        "sources": res.get("sources", []),
        "summary": res.get("summary", {}),
    }


def screen_batch(
    vessels: list[str] | None = None,
    operators: list[str] | None = None,
) -> dict[str, Any]:
    """Batch screening · útil para checks bulk antes de aceptar carga."""
    out_vessels: list[dict[str, Any]] = []
    out_operators: list[dict[str, Any]] = []

    for imo in (vessels or []):
        out_vessels.append(screen_vessel(imo))

    for name in (operators or []):
        out_operators.append(screen_operator(name))

    n_hits_v = sum(1 for v in out_vessels if v.get("hit"))
    n_hits_o = sum(1 for o in out_operators if o.get("hit"))

    return {
        "ok": True,
        "vessels": out_vessels,
        "operators": out_operators,
        "summary": {
            "n_vessels_checked": len(out_vessels),
            "n_vessels_hit": n_hits_v,
            "n_operators_checked": len(out_operators),
            "n_operators_hit": n_hits_o,
            "any_hit": (n_hits_v + n_hits_o) > 0,
        },
    }


__all__ = ["screen_vessel", "screen_operator", "screen_batch"]
