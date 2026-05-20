"""Builder de briefing sectorial extendido · S7-S15 + S6 unificados.

Combina en un único payload:
  · briefing S6 (BOE + BDNS + TED + actores reguladores + KPIs)
  · tracker específico del sector (Sprints 7-15):
      banca            → regulatory_obligations
      farma            → pharma_signals activas
      defensa          → defense_programs + próximos hitos
      vivienda         → housing_markets ZMT + tensión
      telecom          → telecom_operators + última subasta espectro
      infraestructuras → infra_projects retrasados
      turismo          → tourism_destinations en presión
      agroalimentario  → ENESA Plan + commodities granos/aceites
      energia          → commodities energy live (Brent/TTF/Henry Hub)

Falla cerrado: cada bloque tiene su try/except · si una pieza falla,
el resto del briefing sigue · señaliza error en `errors[]`.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Adapters por sector · cada uno devuelve un dict normalizado:
#   {key: str, label: str, kpis: [{label, value}], items: [...], source: str}
# ─────────────────────────────────────────────────────────────────

def _tracker_banca() -> dict[str, Any]:
    from etl.sources.regulatory.service import list_obligations, upcoming_deadlines
    obls = list_obligations(sector="banca", limit=20) or []
    soon = upcoming_deadlines(days_ahead=365) or []
    critical = [o for o in obls if o.get("severity") == "critical"]
    return {
        "key": "regulatory_obligations",
        "label": "Obligaciones regulatorias banca",
        "source": "S7 · regulatory_obligations",
        "kpis": [
            {"label": "Obligaciones tracked", "value": len(obls)},
            {"label": "Críticas", "value": len(critical)},
            {"label": "Próximas <12m", "value": len([s for s in soon if s.get("sector") == "banca"])},
        ],
        "items": [
            {
                "slug": o.get("slug"),
                "title": o.get("title"),
                "severity": o.get("severity"),
                "status": o.get("status"),
                "deadline": (
                    o["compliance_deadline"].isoformat()
                    if o.get("compliance_deadline") and hasattr(o["compliance_deadline"], "isoformat")
                    else o.get("compliance_deadline")
                ),
                "url": o.get("url_oficial"),
            }
            for o in obls[:10]
        ],
    }


def _tracker_farma() -> dict[str, Any]:
    from etl.sources.pharma.service import list_signals, active_signals
    all_signals = list_signals(limit=50) or []
    active = active_signals(severity_min="medium") or []
    critical = [s for s in active if s.get("severity") == "critical"]
    shortages = [s for s in active if s.get("signal_kind") == "shortage"]
    return {
        "key": "pharma_signals",
        "label": "Señales farma activas",
        "source": "S8 · pharma_signals",
        "kpis": [
            {"label": "Señales activas", "value": len(active)},
            {"label": "Críticas", "value": len(critical)},
            {"label": "Shortages", "value": len(shortages)},
            {"label": "Total tracked", "value": len(all_signals)},
        ],
        "items": [
            {
                "slug": s.get("slug"),
                "title": s.get("product_name"),
                "severity": s.get("severity"),
                "kind": s.get("signal_kind"),
                "status": s.get("status"),
                "detected_at": (
                    s["detected_at"].isoformat()
                    if s.get("detected_at") and hasattr(s["detected_at"], "isoformat")
                    else s.get("detected_at")
                ),
                "url": s.get("url_oficial"),
            }
            for s in active[:10]
        ],
    }


def _tracker_defensa() -> dict[str, Any]:
    from etl.sources.defense.programs_service import list_programs, upcoming_milestones
    progs = list_programs(limit=50) or []
    ms = upcoming_milestones(days_ahead=365) or []
    total_budget = sum(p.get("budget_committed_eur") or 0 for p in progs) / 1e9
    in_prod = [p for p in progs if p.get("status") == "produccion"]
    return {
        "key": "defense_programs",
        "label": "Programas defensa + hitos",
        "source": "S11 · defense_programs",
        "kpis": [
            {"label": "Programas activos", "value": len(progs)},
            {"label": "En producción", "value": len(in_prod)},
            {"label": "Hitos < 12m", "value": len(ms)},
            {"label": "Presupuesto B€", "value": round(total_budget, 1)},
        ],
        "items": [
            {
                "slug": m.get("slug"),
                "title": f"{m.get('name')} · {m.get('next_milestone')}",
                "domain": m.get("domain"),
                "status": m.get("status"),
                "milestone_date": (
                    m["next_milestone_date"].isoformat()
                    if m.get("next_milestone_date") and hasattr(m["next_milestone_date"], "isoformat")
                    else m.get("next_milestone_date")
                ),
                "budget_eur": m.get("budget_committed_eur"),
            }
            for m in ms[:10]
        ],
    }


def _tracker_vivienda() -> dict[str, Any]:
    from etl.sources.housing.markets_service import list_markets, tension_alerts
    mkts = list_markets(limit=50) or []
    tension = tension_alerts(min_yoy_alquiler_pct=8.0, min_esfuerzo_pct=35.0) or []
    zmt_count = sum(1 for m in mkts if m.get("zona_mercado_tensionado"))
    avg_yoy = (
        sum((m.get("yoy_precio_alquiler_pct") or 0) for m in mkts) / len(mkts)
        if mkts else 0
    )
    return {
        "key": "housing_markets",
        "label": "Mercados vivienda · tensión + ZMT",
        "source": "S13 · housing_markets",
        "kpis": [
            {"label": "Mercados tracked", "value": len(mkts)},
            {"label": "ZMT activas", "value": zmt_count},
            {"label": "Tensión alta", "value": len(tension)},
            {"label": "Subida alquiler media %", "value": round(avg_yoy, 1)},
        ],
        "items": [
            {
                "slug": m.get("slug"),
                "title": f"{m.get('name')} · alquiler +{m.get('yoy_precio_alquiler_pct')}%",
                "ccaa": m.get("ccaa"),
                "esfuerzo_pct": m.get("esfuerzo_hogares_pct"),
                "zmt": m.get("zona_mercado_tensionado"),
            }
            for m in tension[:10]
        ],
    }


def _tracker_telecom() -> dict[str, Any]:
    from etl.sources.telecom.operators_service import list_operators, market_share_summary
    from etl.sources.telecom.spectrum import list_spectrum_auctions
    ops = list_operators(limit=20) or []
    ms = market_share_summary()
    completed = list_spectrum_auctions(status="completada")
    last_auction = sorted(completed, key=lambda a: a.get("year") or 0, reverse=True)[0] if completed else None
    total_subs = sum(o.get("subscribers_movil") or 0 for o in ops)
    return {
        "key": "telecom_operators",
        "label": "Operadores telecom + espectro",
        "source": "S12 · telecom_operators",
        "kpis": [
            {"label": "Operadores tracked", "value": len(ops)},
            {"label": "Clientes móvil totales (M)", "value": round(total_subs / 1e6, 1)},
            {
                "label": "Última subasta",
                "value": f"{last_auction['band']} ({last_auction['year']})" if last_auction else "—",
            },
            {"label": "Top cuota móvil %", "value": (ms.get("top_movil") or [{}])[0].get("market_share_pct", 0)},
        ],
        "items": [
            {
                "slug": o.get("slug"),
                "title": o.get("name"),
                "kind": o.get("kind"),
                "market_share_movil_pct": o.get("market_share_movil_pct"),
                "market_share_fijo_pct": o.get("market_share_fijo_pct"),
                "revenue_m_eur": o.get("annual_revenue_eur_m"),
            }
            for o in ops[:10]
        ],
    }


def _tracker_infraestructuras() -> dict[str, Any]:
    from etl.sources.infra.service import list_projects, delayed_projects
    projects = list_projects(limit=50) or []
    delayed = delayed_projects(min_delay_months=12) or []
    in_obras = [p for p in projects if p.get("status") == "en_obras"]
    total_budget = sum(p.get("budget_current_eur") or 0 for p in projects) / 1e9
    return {
        "key": "infra_projects",
        "label": "Proyectos infraestructura críticos",
        "source": "S10 · infra_projects",
        "kpis": [
            {"label": "Proyectos tracked", "value": len(projects)},
            {"label": "En obras", "value": len(in_obras)},
            {"label": "Retrasados ≥1a", "value": len(delayed)},
            {"label": "Presupuesto B€", "value": round(total_budget, 1)},
        ],
        "items": [
            {
                "slug": p.get("slug"),
                "title": p.get("name"),
                "kind": p.get("kind"),
                "owner": p.get("owner_organism"),
                "delay_months": p.get("delay_months"),
                "sobrecoste_pct": p.get("sobrecoste_pct"),
            }
            for p in delayed[:10]
        ],
    }


def _tracker_turismo() -> dict[str, Any]:
    from etl.sources.tourism.destinations_service import list_destinations, pressure_alerts
    from etl.sources.tourism.aena_puertos import list_aena_traffic, list_cruise_ports
    dests = list_destinations(limit=50) or []
    pressure = pressure_alerts() or []
    total_pax = sum(a.get("pax_2024_m") or 0 for a in list_aena_traffic(top_n=15))
    total_cruise = sum(p.get("cruise_pax_2024_m") or 0 for p in list_cruise_ports())
    criticos = [d for d in pressure if d.get("presion_turistica") == "critico"]
    return {
        "key": "tourism_destinations",
        "label": "Destinos turísticos + saturación",
        "source": "S15 · tourism_destinations",
        "kpis": [
            {"label": "Destinos tracked", "value": len(dests)},
            {"label": "Presión alta/crítica", "value": len(pressure)},
            {"label": "Pax aeropuertos top 15 (M)", "value": round(total_pax, 1)},
            {"label": "Pax cruceros top 5 (M)", "value": round(total_cruise, 2)},
        ],
        "items": [
            {
                "slug": d.get("slug"),
                "title": f"{d.get('name')} · presión {d.get('presion_turistica')}",
                "ccaa": d.get("ccaa"),
                "regulacion": d.get("regulacion_pisos_turisticos"),
                "tasa_eur": float(d.get("tasa_turistica_eur") or 0),
                "yoy_visitors_pct": d.get("yoy_visitors_pct"),
            }
            for d in pressure[:10]
        ],
    }


def _tracker_agro() -> dict[str, Any]:
    from etl.sources.agro.mapa_enesa import ENESA_PLAN_2024
    from etl.sources.commodities.catalog import list_commodities
    plan = ENESA_PLAN_2024
    lineas = plan.get("lineas_principales") or []
    top_loss = sorted(lineas, key=lambda x: x.get("siniestralidad_pct", 0), reverse=True)[:5]
    grains = list_commodities("grains")
    oils = [c for c in list_commodities("oils") if "es" in c["slug"] or "milling" in c["slug"]]
    return {
        "key": "agro_indicators",
        "label": "ENESA + commodities agro",
        "source": "S14 · ENESA Plan + commodities catalog",
        "kpis": [
            {"label": "ENESA presupuesto M€", "value": round((plan.get("presupuesto_subvenciones_eur", 0) / 1e6), 0)},
            {"label": "Siniestralidad global %", "value": plan.get("siniestralidad_global_pct", 0)},
            {"label": "Granos tracked", "value": len(grains)},
            {"label": "Aceites ES tracked", "value": len(oils)},
        ],
        "items": [
            {
                "slug": (l.get("linea") or "").lower().replace(" ", "_"),
                "title": l.get("linea"),
                "primas_eur": l.get("primas_eur"),
                "indemnizaciones_eur": l.get("indemnizaciones_eur"),
                "siniestralidad_pct": l.get("siniestralidad_pct"),
            }
            for l in top_loss
        ],
    }


def _tracker_energia() -> dict[str, Any]:
    """Snapshot live de commodities energía · Brent, TTF, Henry Hub, Carbón."""
    from etl.sources.commodities.catalog import list_commodities
    from etl.sources.commodities.prices import get_yahoo_client
    items = list_commodities("energy")
    client = get_yahoo_client()
    snapshots: list[dict[str, Any]] = []
    for c in items[:10]:
        ticker = c.get("yahoo_ticker")
        if not ticker:
            snapshots.append({**c, "last_price": None, "change_pct": None})
            continue
        snap = client.quote_snapshot(ticker) or {}
        snapshots.append({
            **c,
            "last_price": snap.get("last_price"),
            "change_pct": snap.get("change_pct"),
            "currency": snap.get("currency"),
        })

    brent = next((s for s in snapshots if s["slug"] == "brent_crude"), None)
    ttf = next((s for s in snapshots if s["slug"] == "natgas_ttf"), None)
    nh = next((s for s in snapshots if s["slug"] == "natgas_henry_hub"), None)
    coal = next((s for s in snapshots if s["slug"] == "coal_api2"), None)

    def _fmt(c: dict[str, Any] | None) -> str:
        if not c or c.get("last_price") is None:
            return "—"
        return f"{c['last_price']:.2f} ({c.get('change_pct') or 0:+.2f}%)"

    return {
        "key": "energy_commodities",
        "label": "Commodities energía live",
        "source": "S14 · commodities catalog + Yahoo Finance",
        "kpis": [
            {"label": "Brent USD/bbl", "value": _fmt(brent)},
            {"label": "TTF EUR/MWh", "value": _fmt(ttf)},
            {"label": "Henry Hub USD/MMBtu", "value": _fmt(nh)},
            {"label": "Carbón API2 USD/t", "value": _fmt(coal)},
        ],
        "items": [
            {
                "slug": s["slug"],
                "title": s["name"],
                "exchange": s["exchange"],
                "last_price": s.get("last_price"),
                "change_pct": s.get("change_pct"),
                "unit": s["unit"],
            }
            for s in snapshots
        ],
    }


# Mapeo sector_id Politeia → tracker function. Acepta alias.
TRACKER_FUNCTIONS: dict[str, Any] = {
    "banca": _tracker_banca,
    "farma": _tracker_farma,
    "salud": _tracker_farma,
    "defensa": _tracker_defensa,
    "vivienda": _tracker_vivienda,
    "inmobiliario": _tracker_vivienda,
    "telecom": _tracker_telecom,
    "telecomunicaciones": _tracker_telecom,
    "infraestructuras": _tracker_infraestructuras,
    "transporte": _tracker_infraestructuras,
    "turismo": _tracker_turismo,
    "agroalimentario": _tracker_agro,
    "agricultura": _tracker_agro,
    "energia": _tracker_energia,
}


def build_sector_tracker(sector_id: str) -> dict[str, Any]:
    """Punto de entrada · devuelve sección 'tracker' del briefing extended.

    Returns:
      {key, label, source, kpis: [...], items: [...]} ó
      {key: 'none', label: 'Sin tracker', ...} si el sector no tiene S7-S15.
    """
    fn = TRACKER_FUNCTIONS.get(sector_id.lower())
    if fn is None:
        return {
            "key": "none",
            "label": "Sin tracker S7-S15",
            "source": "—",
            "kpis": [],
            "items": [],
            "warning": f"sector '{sector_id}' no tiene tracker dedicado en S7-S15",
        }
    try:
        return fn()
    except Exception as exc:
        logger.exception("tracker %s falló · %s", sector_id, exc)
        return {
            "key": "error",
            "label": "Tracker error",
            "source": "—",
            "kpis": [],
            "items": [],
            "error": str(exc),
        }


def build_briefing_extended(
    sector_id: str,
    *,
    days_back: int = 7,
    use_llm: bool = False,
) -> dict[str, Any]:
    """Briefing extended · combina briefing S6 (BOE+BDNS+TED) con tracker S7-S15.

    Args:
      sector_id: alias soportados: banca, farma, defensa, vivienda, telecom,
        infraestructuras, turismo, agroalimentario, energia, + alias.
      days_back: ventana temporal del briefing S6.
      use_llm: incluir resumen LLM del briefing S6 base.

    Returns:
      {
        sector_id, sector_name, days_back, generated_at,
        # del briefing S6:
        kpis, actores, score, bdns, ted, boe, executive_summary,
        # nuevo (S7-S15):
        tracker: {key, label, source, kpis, items},
        sources: {...}, errors: [...]
      }
    """
    # 1. Briefing S6 base (BOE + BDNS + TED + actores + KPIs)
    try:
        from api.routers.sectores import get_sector_briefing
        base = get_sector_briefing(sector_id, days_back=days_back, use_llm=use_llm)
    except Exception as exc:
        logger.warning("briefing S6 base falló para %s · %s", sector_id, exc)
        base = {
            "sector_id": sector_id,
            "errors": [f"briefing_base: {exc}"],
            "sources": {},
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        if not base.get("kpis"):
            base["kpis"] = []

    # 2. Tracker S7-S15 (failure-isolated)
    tracker = build_sector_tracker(sector_id)
    base["tracker"] = tracker
    sources = base.setdefault("sources", {})
    sources["tracker"] = "ok" if tracker.get("key") not in ("none", "error") else (
        "none" if tracker.get("key") == "none" else "error"
    )
    if tracker.get("error"):
        base.setdefault("errors", []).append(f"tracker: {tracker['error']}")

    base["briefing_version"] = "extended_v1"
    return base


__all__ = [
    "TRACKER_FUNCTIONS",
    "build_sector_tracker",
    "build_briefing_extended",
]
