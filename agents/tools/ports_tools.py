"""Brain tools · Módulo Puertos & Comercio Global.

Sprint P5. Expone 9 tools al Brain LLM:

  port_catalog(country?, type_?)               · lista puertos
  port_snapshot(port_slug)                     · KPIs ricos puerto
  port_calls(port_slug, days_back=7)           · histórico escalas
  vessel_lookup(imo)                           · metadata + última posición
  vessel_screen(imo)                           · sanciones marítimas
  bilateral_trade(reporter_iso3, partner_iso3, hs?, period?, flow?)
  spain_trade_briefing(period_ym?)             · top partners + top HS España
  freight_snapshot()                           · BDI/VLCC/FBX + signal
  chokepoint_risk(chokepoint_slug?)            · score o todos

Todas las tools degradan gracefully: si la dependencia subyacente falla,
devuelven `{error: "...", ...}` sin levantar.
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Catálogo y snapshot
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("port_catalog")
def port_catalog(
    country: str | None = None,
    type_: str | None = None,
    region: str | None = None,
) -> dict[str, Any]:
    """Lista puertos críticos del comercio mundial · filtros opcionales."""
    try:
        from etl.sources.ports.catalog import list_ports
        items = list_ports(country=country, type_=type_, region=region)
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        return {"error": str(exc), "n_items": 0, "items": []}


@ToolRegistry.register("port_snapshot")
def port_snapshot(port_slug: str) -> dict[str, Any]:
    """KPIs ricos del puerto · congestión, vessels, top operadores, mix carga."""
    try:
        from etl.sources.ports.port_intel import port_snapshot as _ps
        return _ps(port_slug)
    except Exception as exc:
        return {"error": str(exc)}


@ToolRegistry.register("port_calls")
def port_calls(
    port_slug: str,
    days_back: int = 7,
    limit: int = 100,
) -> dict[str, Any]:
    """Histórico de escalas (arrivals/departures) en un puerto."""
    try:
        from etl.sources.ports.port_intel import port_calls as _pc
        items = _pc(port_slug, days_back=days_back, limit=limit)
        return {"port_slug": port_slug, "n_items": len(items), "items": items}
    except Exception as exc:
        return {"error": str(exc), "items": []}


# ─────────────────────────────────────────────────────────────────
# Vessels
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("vessel_lookup")
def vessel_lookup(imo: str) -> dict[str, Any]:
    """Metadata + última posición conocida del buque."""
    try:
        from etl.sources.ports.ais_client import get_vessel_position
        res = get_vessel_position(imo)
        if res is None:
            return {"error": f"vessel '{imo}' no existe"}
        return res
    except Exception as exc:
        return {"error": str(exc)}


@ToolRegistry.register("vessel_screen")
def vessel_screen(imo: str) -> dict[str, Any]:
    """Screening sanciones marítimas para un buque (OFAC/UE/UN)."""
    try:
        from etl.sources.ports.sanctions_maritime import screen_vessel
        return screen_vessel(imo)
    except Exception as exc:
        return {"error": str(exc), "ok": False}


# ─────────────────────────────────────────────────────────────────
# Comercio declarado
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("bilateral_trade")
def bilateral_trade(
    reporter_iso: str,
    partner_iso: str,
    hs_code: str | None = None,
    period_ym: str | None = None,
    flow_kind: str | None = None,
) -> dict[str, Any]:
    """Comercio bilateral (UN Comtrade o Comext para EU↔EU)."""
    try:
        # Routing simple: si ambos UE → Comext, sino Comtrade
        from etl.sources.ports.comext_client import bilateral_eu
        from etl.sources.ports.comtrade_client import bilateral_trade as _ct

        EU_27 = {"ES","DE","FR","IT","PT","NL","BE","GB","IE","PL","GR","AT","DK",
                 "FI","SE","CZ","RO","HU","BG","HR","SK","SI","LT","LV","EE",
                 "LU","MT","CY",
                 "ESP","DEU","FRA","ITA","PRT","NLD","BEL","GBR","IRL","POL",
                 "GRC","AUT","DNK","FIN","SWE","CZE","ROU","HUN","BGR","HRV",
                 "SVK","SVN","LTU","LVA","EST","LUX","MLT","CYP"}
        r_up, p_up = reporter_iso.upper(), partner_iso.upper()
        if r_up in EU_27 and p_up in EU_27:
            return bilateral_eu(reporter_iso, partner_iso, hs_code=hs_code,
                                period_ym=period_ym, flow_kind=flow_kind)
        return _ct(reporter_iso, partner_iso, hs_code=hs_code,
                   period_ym=period_ym, flow_kind=flow_kind)
    except Exception as exc:
        return {"error": str(exc), "items": [], "n_items": 0}


@ToolRegistry.register("spain_trade_briefing")
def spain_trade_briefing(period_ym: str | None = None) -> dict[str, Any]:
    """Briefing comercio exterior España · top partners + top HS."""
    try:
        from etl.sources.ports.comext_client import spain_flows
        from etl.sources.ports.comtrade_client import top_partners

        flows = spain_flows(period_ym=period_ym)
        top_export = top_partners("ESP", period_ym=period_ym, flow_kind="export", limit=5)
        top_import = top_partners("ESP", period_ym=period_ym, flow_kind="import", limit=5)

        # Top HS aggregation desde Comext seed
        hs_agg: dict[str, float] = {}
        for it in flows.get("items", []):
            hs = it.get("hs_code")
            if hs:
                hs_agg[hs] = hs_agg.get(hs, 0) + (it.get("value_usd") or 0)
        top_hs = sorted(hs_agg.items(), key=lambda kv: kv[1], reverse=True)[:5]

        return {
            "ok": True,
            "period_ym": period_ym or "2024-12",
            "top_export_partners": top_export.get("items", []),
            "top_import_partners": top_import.get("items", []),
            "top_hs_chapters": [{"hs_code": k, "value_usd": v} for k, v in top_hs],
            "n_flow_items": flows.get("n_items", 0),
        }
    except Exception as exc:
        return {"error": str(exc), "ok": False}


# ─────────────────────────────────────────────────────────────────
# Fletes y chokepoints
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("freight_snapshot")
def freight_snapshot() -> dict[str, Any]:
    """Snapshot 6 freight indices (BDI + sub-índices + FBX)."""
    try:
        from etl.sources.ports.freight_rates import snapshot_all
        return snapshot_all()
    except Exception as exc:
        return {"error": str(exc), "n_items": 0, "items": []}


@ToolRegistry.register("chokepoint_risk")
def chokepoint_risk(chokepoint_slug: str | None = None, days: int = 30) -> dict[str, Any]:
    """Risk score corredor concreto, o todos si slug=None."""
    try:
        from etl.sources.ports.chokepoints import (
            all_chokepoints_risk, compute_risk_score,
        )
        if chokepoint_slug:
            return compute_risk_score(chokepoint_slug, days=days)
        return all_chokepoints_risk(days=days)
    except Exception as exc:
        return {"error": str(exc)}


__all__ = [
    "port_catalog",
    "port_snapshot",
    "port_calls",
    "vessel_lookup",
    "vessel_screen",
    "bilateral_trade",
    "spain_trade_briefing",
    "freight_snapshot",
    "chokepoint_risk",
]
