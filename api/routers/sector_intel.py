"""Router /api/v1/sector-intel — capa unificada Visual-Oscar para Sprints 7-15.

Cada endpoint devuelve un payload normalizado para que el componente
`<SectorIntelPanel>` de Visual Oscar lo pinte sin lógica condicional pesada.

Endpoints:
  GET /api/v1/sector-intel/banca/overview      · regulatory_obligations banca + CNMV
  GET /api/v1/sector-intel/farma/overview      · pharma_signals activas + AEMPS
  GET /api/v1/sector-intel/defensa/overview    · defense_programs + próximos hitos
  GET /api/v1/sector-intel/vivienda/overview   · housing_markets ZMT + tensión
  GET /api/v1/sector-intel/telecom/overview    · telecom_operators + última subasta
  GET /api/v1/sector-intel/infraestructuras/overview · infra_projects retrasados
  GET /api/v1/sector-intel/turismo/overview    · tourism_destinations en presión
  GET /api/v1/sector-intel/agro/overview       · ENESA + EU CAP indicadores

Schema común (SectorIntelOverview):
  {
    sector: str,
    headline_kpis: [{label, value, sub, color?}],
    alerts: [{slug, title, severity, kind, url?}],
    table: {columns: [...], rows: [...]},
    sources: [str, ...],
    generado_en: iso8601
  }
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sector-intel", tags=["sector-intel"])


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


# ─────────────────────────────────────────────────────────────────
# BANCA
# ─────────────────────────────────────────────────────────────────

@router.get("/banca/overview")
def banca_overview() -> dict[str, Any]:
    try:
        from etl.sources.regulatory.service import list_obligations, upcoming_deadlines
        obls = list_obligations(sector="banca", limit=20) or []
        soon = upcoming_deadlines(days_ahead=365) or []
        # Normalizar fechas
        def _norm(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
            out = []
            for r in rows:
                d = dict(r)
                for k in ("compliance_deadline", "publication_date", "entry_into_force"):
                    v = d.get(k)
                    if v is not None and hasattr(v, "isoformat"):
                        d[k] = v.isoformat()
                out.append(d)
            return out
        obls = _norm(obls)
        soon = _norm(soon)

        critical = sum(1 for o in obls if o.get("severity") == "critical")
        in_progress = sum(1 for o in obls if o.get("status") == "in_progress")

        return {
            "sector": "banca",
            "headline_kpis": [
                {"label": "Obligaciones banca", "value": str(len(obls)), "sub": "regulatorias activas"},
                {"label": "Críticas", "value": str(critical), "color": "#dc2626", "sub": "severity=critical"},
                {"label": "En curso", "value": str(in_progress), "color": "#f59e0b"},
                {"label": "Plazo < 12m", "value": str(len([s for s in soon if s.get("sector") == "banca"])), "color": "#7c3aed"},
            ],
            "alerts": [
                {
                    "slug": o.get("slug"),
                    "title": o.get("title"),
                    "severity": o.get("severity"),
                    "kind": "regulatory",
                    "url": o.get("url_oficial"),
                }
                for o in obls if o.get("severity") in ("critical", "high")
            ][:8],
            "table": {
                "columns": ["Obligación", "Severidad", "Status", "Deadline"],
                "rows": [
                    [o.get("title"), o.get("severity"), o.get("status"), o.get("compliance_deadline") or "—"]
                    for o in obls
                ],
            },
            "sources": ["regulatory_obligations (S7)", "CNMV", "BdE"],
            "generado_en": _now(),
        }
    except Exception as exc:
        logger.exception("banca_overview falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# FARMA
# ─────────────────────────────────────────────────────────────────

@router.get("/farma/overview")
def farma_overview() -> dict[str, Any]:
    try:
        from etl.sources.pharma.service import list_signals, active_signals
        all_signals = list_signals(limit=50) or []
        active = active_signals(severity_min="medium") or []
        def _norm(rows):
            out = []
            for r in rows:
                d = dict(r)
                for k in ("detected_at", "resolved_at"):
                    v = d.get(k)
                    if v is not None and hasattr(v, "isoformat"):
                        d[k] = v.isoformat()
                out.append(d)
            return out
        all_signals = _norm(all_signals)
        active = _norm(active)

        critical = sum(1 for s in active if s.get("severity") == "critical")
        shortages = sum(1 for s in active if s.get("signal_kind") == "shortage")

        return {
            "sector": "farma",
            "headline_kpis": [
                {"label": "Señales activas", "value": str(len(active))},
                {"label": "Críticas", "value": str(critical), "color": "#dc2626"},
                {"label": "Shortages", "value": str(shortages), "color": "#f59e0b"},
                {"label": "Total tracker", "value": str(len(all_signals))},
            ],
            "alerts": [
                {
                    "slug": s.get("slug"),
                    "title": s.get("product_name"),
                    "severity": s.get("severity"),
                    "kind": s.get("signal_kind"),
                    "url": s.get("url_oficial"),
                }
                for s in active if s.get("severity") in ("critical", "high")
            ][:8],
            "table": {
                "columns": ["Producto", "Tipo", "Severidad", "Status", "Detectado"],
                "rows": [
                    [s.get("product_name"), s.get("signal_kind"), s.get("severity"),
                     s.get("status"), s.get("detected_at") or "—"]
                    for s in active
                ],
            },
            "sources": ["pharma_signals (S8)", "AEMPS CIMA", "EMA"],
            "generado_en": _now(),
        }
    except Exception as exc:
        logger.exception("farma_overview falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# DEFENSA
# ─────────────────────────────────────────────────────────────────

@router.get("/defensa/overview")
def defensa_overview() -> dict[str, Any]:
    try:
        from etl.sources.defense.programs_service import list_programs, upcoming_milestones
        progs = list_programs(limit=50) or []
        ms = upcoming_milestones(days_ahead=365) or []
        def _norm(rows):
            out = []
            for r in rows:
                d = dict(r)
                for k in ("planned_end_date", "next_milestone_date"):
                    v = d.get(k)
                    if v is not None and hasattr(v, "isoformat"):
                        d[k] = v.isoformat()
                out.append(d)
            return out
        progs = _norm(progs)
        ms = _norm(ms)
        total_budget = sum(p.get("budget_committed_eur") or 0 for p in progs)
        in_prod = sum(1 for p in progs if p.get("status") == "produccion")

        return {
            "sector": "defensa",
            "headline_kpis": [
                {"label": "Programas activos", "value": str(len(progs))},
                {"label": "En producción", "value": str(in_prod), "color": "#16a34a"},
                {"label": "Próximos hitos (12m)", "value": str(len(ms)), "color": "#7c3aed"},
                {"label": "Presupuesto total", "value": f"{total_budget / 1_000_000_000:.1f} B€"},
            ],
            "alerts": [
                {
                    "slug": m.get("slug"),
                    "title": f"{m.get('name')} · {m.get('next_milestone')}",
                    "severity": "medium",
                    "kind": "milestone",
                    "date": m.get("next_milestone_date"),
                }
                for m in ms[:8]
            ],
            "table": {
                "columns": ["Programa", "Dominio", "Estado", "Próximo hito", "Fecha"],
                "rows": [
                    [p.get("name"), p.get("domain"), p.get("status"),
                     p.get("next_milestone") or "—", p.get("next_milestone_date") or "—"]
                    for p in progs[:20]
                ],
            },
            "sources": ["defense_programs (S11)", "EDA", "NATO", "MINISDEF"],
            "generado_en": _now(),
        }
    except Exception as exc:
        logger.exception("defensa_overview falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# VIVIENDA
# ─────────────────────────────────────────────────────────────────

@router.get("/vivienda/overview")
def vivienda_overview() -> dict[str, Any]:
    try:
        from etl.sources.housing.markets_service import list_markets, tension_alerts
        mkts = list_markets(limit=50) or []
        tension = tension_alerts(min_yoy_alquiler_pct=8.0, min_esfuerzo_pct=35.0) or []
        zmt_count = sum(1 for m in mkts if m.get("zona_mercado_tensionado"))

        avg_yoy_alq = (
            sum((m.get("yoy_precio_alquiler_pct") or 0) for m in mkts) / len(mkts)
            if mkts else 0
        )

        return {
            "sector": "vivienda",
            "headline_kpis": [
                {"label": "Mercados monitorizados", "value": str(len(mkts))},
                {"label": "ZMT (Ley 12/2023)", "value": str(zmt_count), "color": "#7c3aed"},
                {"label": "Tensión alta", "value": str(len(tension)), "color": "#dc2626"},
                {"label": "Subida alquiler media", "value": f"{avg_yoy_alq:.1f}%",
                 "color": "#dc2626" if avg_yoy_alq > 7 else "#374151"},
            ],
            "alerts": [
                {
                    "slug": m.get("slug"),
                    "title": f"{m.get('name')} · alquiler +{m.get('yoy_precio_alquiler_pct')}%",
                    "severity": "high",
                    "kind": "tension",
                }
                for m in tension[:8]
            ],
            "table": {
                "columns": ["Mercado", "CCAA", "Precio venta €/m²", "Alquiler €/mes", "YoY alq %", "ZMT"],
                "rows": [
                    [m.get("name"), m.get("ccaa"), m.get("precio_m2_venta_eur"),
                     m.get("precio_alquiler_eur_mes"), m.get("yoy_precio_alquiler_pct"),
                     "Sí" if m.get("zona_mercado_tensionado") else "No"]
                    for m in mkts
                ],
            },
            "sources": ["housing_markets (S13)", "Catastro", "Registradores", "INE IPV"],
            "generado_en": _now(),
        }
    except Exception as exc:
        logger.exception("vivienda_overview falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# TELECOM
# ─────────────────────────────────────────────────────────────────

@router.get("/telecom/overview")
def telecom_overview() -> dict[str, Any]:
    try:
        from etl.sources.telecom.operators_service import list_operators, market_share_summary
        from etl.sources.telecom.spectrum import list_spectrum_auctions
        ops = list_operators(limit=20) or []
        ms = market_share_summary()
        completed = list_spectrum_auctions(status="completada")
        completed_sorted = sorted(completed, key=lambda a: a.get("year") or 0, reverse=True)
        last_auction = completed_sorted[0] if completed_sorted else None

        incumbentes = sum(1 for o in ops if o.get("kind") == "incumbente")
        total_subs_movil = sum(o.get("subscribers_movil") or 0 for o in ops)

        return {
            "sector": "telecom",
            "headline_kpis": [
                {"label": "Operadores tracked", "value": str(len(ops))},
                {"label": "Incumbentes", "value": str(incumbentes)},
                {
                    "label": "Total clientes móvil",
                    "value": f"{total_subs_movil / 1_000_000:.1f}M",
                    "color": "#7c3aed",
                },
                {
                    "label": "Última subasta espectro",
                    "value": last_auction["band"] if last_auction else "—",
                    "sub": str(last_auction["year"]) if last_auction else "",
                },
            ],
            "alerts": [
                {
                    "slug": o["slug"],
                    "title": f"{o['name']} · cuota móvil {o.get('market_share_pct')}%",
                    "severity": "medium",
                    "kind": "market_share",
                }
                for o in (ms.get("top_movil") or [])[:5]
            ],
            "table": {
                "columns": ["Operador", "Tipo", "Cuota móvil %", "Cuota fija %", "Clientes móvil", "Ingresos M€"],
                "rows": [
                    [o.get("name"), o.get("kind"),
                     o.get("market_share_movil_pct"), o.get("market_share_fijo_pct"),
                     o.get("subscribers_movil"), o.get("annual_revenue_eur_m")]
                    for o in ops
                ],
            },
            "sources": ["telecom_operators (S12)", "CNMC", "BEREC", "Subastas SETSI"],
            "generado_en": _now(),
        }
    except Exception as exc:
        logger.exception("telecom_overview falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# INFRAESTRUCTURAS
# ─────────────────────────────────────────────────────────────────

@router.get("/infraestructuras/overview")
def infra_overview() -> dict[str, Any]:
    try:
        from etl.sources.infra.service import list_projects, delayed_projects
        projects = list_projects(limit=50) or []
        delayed = delayed_projects(min_delay_months=12) or []
        def _norm(rows):
            out = []
            for r in rows:
                d = dict(r)
                for k in ("planned_end_date", "original_end_date"):
                    v = d.get(k)
                    if v is not None and hasattr(v, "isoformat"):
                        d[k] = v.isoformat()
                out.append(d)
            return out
        projects = _norm(projects)
        delayed = _norm(delayed)
        in_obras = sum(1 for p in projects if p.get("status") == "en_obras")
        total_budget = sum(p.get("budget_current_eur") or 0 for p in projects) / 1_000_000_000

        return {
            "sector": "infraestructuras",
            "headline_kpis": [
                {"label": "Proyectos monitorizados", "value": str(len(projects))},
                {"label": "En obras", "value": str(in_obras), "color": "#16a34a"},
                {"label": "Retrasados ≥ 1 año", "value": str(len(delayed)), "color": "#dc2626"},
                {"label": "Presupuesto total", "value": f"{total_budget:.1f} B€"},
            ],
            "alerts": [
                {
                    "slug": p.get("slug"),
                    "title": f"{p.get('name')} · retraso {p.get('delay_months')}m · sobrecoste {p.get('sobrecoste_pct')}%",
                    "severity": "high" if (p.get("delay_months") or 0) >= 60 else "medium",
                    "kind": "delayed",
                }
                for p in delayed[:8]
            ],
            "table": {
                "columns": ["Proyecto", "Tipo", "Organismo", "Estado", "Fin previsto", "Presupuesto vigente"],
                "rows": [
                    [p.get("name"), p.get("kind"), p.get("owner_organism"),
                     p.get("status"), p.get("planned_end_date") or "—",
                     p.get("budget_current_eur")]
                    for p in projects
                ],
            },
            "sources": ["infra_projects (S10)", "TED EU", "PLACE", "MITMS"],
            "generado_en": _now(),
        }
    except Exception as exc:
        logger.exception("infra_overview falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# TURISMO
# ─────────────────────────────────────────────────────────────────

@router.get("/turismo/overview")
def turismo_overview() -> dict[str, Any]:
    try:
        from etl.sources.tourism.destinations_service import list_destinations, pressure_alerts
        from etl.sources.tourism.aena_puertos import list_aena_traffic, list_cruise_ports
        dests = list_destinations(limit=50) or []
        pressure = pressure_alerts() or []
        top_airports = list_aena_traffic(top_n=5)
        total_pax = sum(a.get("pax_2024_m") or 0 for a in list_aena_traffic(top_n=15))
        total_cruise = sum(p.get("cruise_pax_2024_m") or 0 for p in list_cruise_ports())
        criticos = sum(1 for d in pressure if d.get("presion_turistica") == "critico")

        return {
            "sector": "turismo",
            "headline_kpis": [
                {"label": "Destinos monitorizados", "value": str(len(dests))},
                {"label": "En presión alta/crítica", "value": str(len(pressure)), "color": "#dc2626"},
                {"label": "Pax aeropuertos top 15", "value": f"{total_pax:.1f}M", "color": "#7c3aed"},
                {"label": "Pax cruceros top 5", "value": f"{total_cruise:.2f}M"},
            ],
            "alerts": [
                {
                    "slug": d.get("slug"),
                    "title": f"{d.get('name')} · presión {d.get('presion_turistica')}",
                    "severity": "high" if d.get("presion_turistica") == "critico" else "medium",
                    "kind": "saturacion",
                }
                for d in pressure[:8]
            ],
            "table": {
                "columns": ["Destino", "CCAA", "Tipo", "Visitantes 2024 k", "YoY %", "Presión", "Regulación VT"],
                "rows": [
                    [d.get("name"), d.get("ccaa"), d.get("kind"),
                     d.get("visitors_2024_k"), d.get("yoy_visitors_pct"),
                     d.get("presion_turistica"), d.get("regulacion_pisos_turisticos")]
                    for d in dests
                ],
            },
            "sources": ["tourism_destinations (S15)", "INE FRONTUR/ETR/EGATUR", "AENA", "Puertos del Estado"],
            "generado_en": _now(),
        }
    except Exception as exc:
        logger.exception("turismo_overview falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# AGRO
# ─────────────────────────────────────────────────────────────────

@router.get("/agro/overview")
def agro_overview() -> dict[str, Any]:
    """Agro · ENESA + commodities relacionadas."""
    try:
        from etl.sources.agro.mapa_enesa import ENESA_PLAN_2024
        from etl.sources.commodities.catalog import list_commodities

        plan = ENESA_PLAN_2024
        lineas = plan.get("lineas_principales", [])
        top_loss = sorted(lineas, key=lambda x: x.get("siniestralidad_pct", 0), reverse=True)[:5]
        cereales = [c for c in list_commodities("grains")]
        oils = [c for c in list_commodities("oils") if "es" in c["slug"] or "milling" in c["slug"]]

        return {
            "sector": "agro",
            "headline_kpis": [
                {"label": "Plan ENESA presupuesto", "value": f"{plan.get('presupuesto_subvenciones_eur', 0) / 1_000_000:.0f}M€"},
                {
                    "label": "Siniestralidad global",
                    "value": f"{plan.get('siniestralidad_global_pct', 0)}%",
                    "color": "#dc2626" if plan.get("siniestralidad_global_pct", 0) > 100 else "#374151",
                },
                {"label": "Líneas seguro", "value": str(len(lineas))},
                {"label": "Commodities granos", "value": str(len(cereales))},
            ],
            "alerts": [
                {
                    "slug": (l.get("linea") or "").lower().replace(" ", "_"),
                    "title": f"{l.get('linea')} · siniestralidad {l.get('siniestralidad_pct')}%",
                    "severity": "high" if l.get("siniestralidad_pct", 0) > 150 else "medium",
                    "kind": "seguros",
                }
                for l in top_loss
            ],
            "table": {
                "columns": ["Línea", "Primas €", "Indemnizaciones €", "Siniestralidad %"],
                "rows": [
                    [l.get("linea"), l.get("primas_eur"), l.get("indemnizaciones_eur"),
                     l.get("siniestralidad_pct")]
                    for l in lineas
                ],
            },
            "sources": ["ENESA Plan 2024 (S14)", "FEGA", "Eurostat agro", "Commodities (Vesper-style)"],
            "generado_en": _now(),
        }
    except Exception as exc:
        logger.exception("agro_overview falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# ENERGIA · usa briefing sectorial existente (S6) + commodities energy
# ─────────────────────────────────────────────────────────────────

@router.get("/energia/overview")
def energia_overview() -> dict[str, Any]:
    """Energía · cruza commodities energy + briefing sectorial existente."""
    try:
        from etl.sources.commodities.catalog import list_commodities
        from etl.sources.commodities.prices import get_yahoo_client

        energy_commodities = list_commodities("energy")
        client = get_yahoo_client()
        snapshots = []
        for c in energy_commodities[:10]:
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

        # KPIs: claves Brent / TTF / Henry Hub si disponibles
        brent = next((s for s in snapshots if s["slug"] == "brent_crude"), None)
        ttf = next((s for s in snapshots if s["slug"] == "natgas_ttf"), None)
        nh = next((s for s in snapshots if s["slug"] == "natgas_henry_hub"), None)
        coal = next((s for s in snapshots if s["slug"] == "coal_api2"), None)

        # Alertas: variaciones absolutas > 3%
        alerts = [
            {
                "slug": s["slug"],
                "title": f"{s['name']} · variación {s.get('change_pct')}%",
                "severity": "high" if abs(s.get("change_pct") or 0) > 5
                            else "medium" if abs(s.get("change_pct") or 0) > 3
                            else "info",
                "kind": "price_move",
            }
            for s in snapshots
            if s.get("change_pct") is not None and abs(s["change_pct"]) > 3
        ][:6]

        return {
            "sector": "energia",
            "headline_kpis": [
                {
                    "label": "Brent",
                    "value": f"{brent['last_price']:.2f} USD/bbl" if brent and brent.get("last_price") else "—",
                    "color": "#dc2626" if (brent or {}).get("change_pct", 0) > 2 else "#374151",
                    "sub": f"{brent.get('change_pct')}%" if brent and brent.get("change_pct") is not None else "",
                },
                {
                    "label": "TTF Gas EU",
                    "value": f"{ttf['last_price']:.2f} EUR/MWh" if ttf and ttf.get("last_price") else "—",
                    "color": "#dc2626" if (ttf or {}).get("change_pct", 0) > 2 else "#374151",
                    "sub": f"{ttf.get('change_pct')}%" if ttf and ttf.get("change_pct") is not None else "",
                },
                {
                    "label": "Henry Hub",
                    "value": f"{nh['last_price']:.3f} USD/MMBtu" if nh and nh.get("last_price") else "—",
                    "sub": f"{nh.get('change_pct')}%" if nh and nh.get("change_pct") is not None else "",
                },
                {
                    "label": "Carbón API2",
                    "value": f"{coal['last_price']:.0f} USD/t" if coal and coal.get("last_price") else "—",
                },
            ],
            "alerts": alerts,
            "table": {
                "columns": ["Commodity", "Exchange", "Último", "Var %", "Unidad"],
                "rows": [
                    [s["name"], s["exchange"], s.get("last_price"),
                     s.get("change_pct"), s["unit"]]
                    for s in snapshots
                ],
            },
            "sources": ["commodities catalog (S14)", "Yahoo Finance v8", "ICE TTF/Brent"],
            "generado_en": _now(),
        }
    except Exception as exc:
        logger.exception("energia_overview falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/index")
def sectors_index() -> dict[str, Any]:
    """Índice rápido de qué sectores tienen overview disponible."""
    return {
        "available": [
            "banca", "farma", "defensa", "vivienda",
            "telecom", "infraestructuras", "turismo", "agro", "energia",
        ],
        "generado_en": _now(),
    }
