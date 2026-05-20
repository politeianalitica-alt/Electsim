"""Router /api/v1/ports — módulo Puertos & Comercio Global · MVP Sprint 1.

Clona la arquitectura de `api/routers/commodities.py` para inteligencia
de comercio físico mundial. Cubre 4 secciones del roadmap:

  1. Flujos físicos · AIS + congestión + port calls       (P2 sprint)
  2. Comercio declarado · UN Comtrade + Eurostat Comext   (P3 sprint)
  3. Fletes & corredores · BDI + chokepoints              (P4 sprint)
  4. Sanciones marítimas · screening de buques/operadores (P5 sprint)

En P1 (este sprint) se exponen los endpoints de catálogo + snapshot stub.
Los demás endpoints quedan registrados pero devuelven 501 hasta que el sprint
correspondiente los implemente.

Las alertas portuarias reusan `/api/v1/commodities/alerts*` con `commodity_slug`
mágico `__port_<event>__` (decisión MVP · evita duplicar tabla en sprint 1).
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/ports", tags=["ports"])


# ─────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────

class SanctionsScreenRequest(BaseModel):
    vessels: list[str] | None = Field(default=None, description="Lista de IMO")
    operators: list[str] | None = Field(default=None, description="Nombres de operadores")


# ─────────────────────────────────────────────────────────────────
# Catálogo
# ─────────────────────────────────────────────────────────────────

@router.get("/catalog")
def list_ports_endpoint(
    country: str | None = Query(None, description="ISO-2 país, ej. 'ES'"),
    type_: str | None = Query(None, alias="type", description="container|bulk|tanker|multipurpose|cruise"),
    region: str | None = Query(None, description="europa|asia_pacifico|norteamerica|oriente_medio|espana"),
) -> dict[str, Any]:
    """Lista los 40 puertos del catálogo seed."""
    try:
        from etl.sources.ports.catalog import list_ports
        items = list_ports(country=country, type_=type_, region=region)
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        logger.exception("list_ports falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/catalog/vessels")
def list_vessels_endpoint(
    type_: str | None = Query(None, alias="type",
                              description="container|tanker|bulk|lng|roro|cruise|fishing|offshore"),
    flag: str | None = Query(None, description="ISO-2 bandera"),
    operator: str | None = Query(None, description="Nombre operador (substring)"),
) -> dict[str, Any]:
    """Lista los 50 buques seed (demo/dev cuando no hay AISSTREAM_API_KEY)."""
    try:
        from etl.sources.ports.vessels_seed import list_vessels
        items = list_vessels(type_=type_, flag=flag, operator=operator)
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        logger.exception("list_vessels falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# Snapshot dashboard
# ─────────────────────────────────────────────────────────────────

@router.get("/snapshot-all")
def snapshot_all_endpoint(
    region: str | None = Query(None),
    limit: int = Query(40, ge=1, le=100),
) -> dict[str, Any]:
    """Snapshot live del dashboard maestro · congestión + arrivals últimas 24h.

    P1 (stub): devuelve catálogo con KPIs sintéticos consistentes (basados
    en hash determinista del slug) para que la UI pueda dibujarse de inmediato.
    P2 reemplaza con datos AIS reales del `port_intel` módulo.
    """
    try:
        from etl.sources.ports.catalog import list_ports
        ports = list_ports(region=region)[:limit]
        items = []
        for p in ports:
            # KPIs sintéticos deterministas (seed = hash del slug)
            h = abs(hash(p["slug"]))
            vessels_anchored = (h % 80) + 5             # 5..85
            arrivals_24h = (h // 80 % 40) + 2           # 2..42
            congestion_pct = (h // 3200 % 50) + 10      # 10..60
            items.append({
                **p,
                "vessels_anchored": vessels_anchored,
                "arrivals_24h": arrivals_24h,
                "congestion_pct": congestion_pct,
                "data_source": "synthetic",
                "available": True,
            })
        return {
            "n_items": len(items),
            "items": items,
            "data_source": "synthetic",
            "note": "P1 stub · datos sintéticos. AIS real en sprint P2.",
        }
    except Exception as exc:
        logger.exception("snapshot_all falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# Endpoints diferidos a sprints siguientes · 501 explícito
# (definidos ANTES de /{port_slug} para que FastAPI los priorice)
# ─────────────────────────────────────────────────────────────────

@router.get("/vessels/{imo}")
def vessel_lookup_endpoint(imo: str) -> dict[str, Any]:
    """Metadata + última posición del buque (AIS BD si hay, sintético si no)."""
    try:
        from etl.sources.ports.ais_client import get_vessel_position
        pos = get_vessel_position(imo)
        if pos is None:
            raise HTTPException(status_code=404, detail=f"vessel '{imo}' no existe")
        return pos
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("vessel_lookup falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/vessels/{imo}/track")
def vessel_track_endpoint(
    imo: str,
    hours: int = Query(24, ge=1, le=720),
    max_points: int = Query(200, ge=10, le=1000),
) -> dict[str, Any]:
    """Track AIS · puntos cronológicos en las últimas N horas."""
    try:
        from etl.sources.ports.ais_client import get_vessel_track
        points = get_vessel_track(imo, hours=hours, max_points=max_points)
        return {"imo": imo, "hours": hours, "n_points": len(points), "points": points}
    except Exception as exc:
        logger.exception("vessel_track falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/vessels/{imo}/screen", status_code=501)
def vessel_screen_endpoint(imo: str) -> dict[str, Any]:
    """[P5] Screening sanciones."""
    raise HTTPException(status_code=501, detail="diferido a sprint P5 (sanctions_maritime)")


@router.get("/trade/bilateral")
def trade_bilateral_endpoint(
    reporter: str = Query(..., min_length=2, max_length=3),
    partner: str = Query(..., min_length=2, max_length=3),
    hs: str | None = Query(None, description="HS code · 2-8 dígitos. None=totales"),
    period: str | None = Query(None, description="YYYY-MM. None=último disponible"),
    flow: str | None = Query(None, description="export|import. None=ambos"),
    source: str = Query("auto", description="comtrade|comext|auto (intenta comext si EU+EU)"),
) -> dict[str, Any]:
    """Comercio bilateral · cache + Comtrade/Comext + seed demo."""
    try:
        from etl.sources.ports.comext_client import bilateral_eu
        from etl.sources.ports.comtrade_client import bilateral_trade

        # Auto · si ambos son UE preferir Comext (más granular)
        # Lista EU-27 + UK histórico para clasificar; lo demás → Comtrade
        EU_27_ISO2 = {"AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR",
                      "HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK",
                      "SI","ES","SE","GB"}
        EU_27_ISO3 = {"AUT","BEL","BGR","HRV","CYP","CZE","DNK","EST","FIN","FRA",
                      "DEU","GRC","HUN","IRL","ITA","LVA","LTU","LUX","MLT","NLD",
                      "POL","PRT","ROU","SVK","SVN","ESP","SWE","GBR"}
        eu_codes = EU_27_ISO2 | EU_27_ISO3
        rep_up, par_up = reporter.upper(), partner.upper()
        if source == "auto":
            if rep_up in eu_codes and par_up in eu_codes:
                use_source = "comext"
            else:
                use_source = "comtrade"
        else:
            use_source = source

        if use_source == "comext":
            res = bilateral_eu(reporter, partner, hs_code=hs, period_ym=period, flow_kind=flow)
        else:
            res = bilateral_trade(reporter, partner, hs_code=hs, period_ym=period, flow_kind=flow)
        return {**res, "use_source": use_source}
    except Exception as exc:
        logger.exception("trade_bilateral falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/trade/spain-flows")
def trade_spain_flows_endpoint(
    hs: str | None = Query(None),
    period: str | None = Query(None),
    flow: str | None = Query(None, description="export|import. None=ambos"),
) -> dict[str, Any]:
    """Atajo España · todos los partners vía Comext."""
    try:
        from etl.sources.ports.comext_client import spain_flows
        return spain_flows(hs_code=hs, period_ym=period, flow_kind=flow)
    except Exception as exc:
        logger.exception("trade_spain_flows falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/trade/top-partners")
def trade_top_partners_endpoint(
    reporter: str = Query(..., min_length=2, max_length=3),
    flow: str = Query("export"),
    period: str | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
) -> dict[str, Any]:
    """Top N partners comerciales por valor (USD)."""
    try:
        from etl.sources.ports.comtrade_client import top_partners
        return top_partners(reporter, period_ym=period, flow_kind=flow, limit=limit)
    except Exception as exc:
        logger.exception("trade_top_partners falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/freight/snapshot", status_code=501)
def freight_snapshot_endpoint() -> dict[str, Any]:
    """[P4] Snapshot BDI + VLCC + FBX."""
    raise HTTPException(status_code=501, detail="diferido a sprint P4 (freight_rates)")


@router.get("/freight/{index_slug}/price", status_code=501)
def freight_price_endpoint(
    index_slug: str,
    range_: str = Query("1y", alias="range"),
) -> dict[str, Any]:
    """[P4] Serie histórica freight index."""
    raise HTTPException(status_code=501, detail="diferido a sprint P4 (freight_rates)")


@router.get("/chokepoints", status_code=501)
def chokepoints_list_endpoint() -> dict[str, Any]:
    """[P4] Lista corredores + risk_score actual."""
    raise HTTPException(status_code=501, detail="diferido a sprint P4 (chokepoints)")


@router.get("/chokepoints/{slug}", status_code=501)
def chokepoint_detail_endpoint(slug: str) -> dict[str, Any]:
    """[P4] Detalle corredor + eventos ACLED recientes."""
    raise HTTPException(status_code=501, detail="diferido a sprint P4 (chokepoints)")


@router.post("/sanctions/screen", status_code=501)
def sanctions_screen_endpoint(req: SanctionsScreenRequest) -> dict[str, Any]:
    """[P5] Batch screening vessels + operators."""
    raise HTTPException(status_code=501, detail="diferido a sprint P5 (sanctions_maritime)")


# ─────────────────────────────────────────────────────────────────
# Endpoints anidados sobre /{port_slug} · primero los específicos,
# luego el genérico al final para no caparlos
# ─────────────────────────────────────────────────────────────────

@router.get("/{port_slug}/vessels")
def port_vessels_endpoint(
    port_slug: str,
    radius_nm: float = Query(20.0, gt=0, le=200),
    limit: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    """Buques en/cerca puerto · BD AIS o sintético si no hay datos."""
    try:
        from etl.sources.ports.ais_client import get_vessels_near
        items = get_vessels_near(port_slug, radius_nm=radius_nm, limit=limit)
        return {"port_slug": port_slug, "n_vessels": len(items), "items": items}
    except Exception as exc:
        logger.exception("port_vessels falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{port_slug}/calls")
def port_calls_endpoint(
    port_slug: str,
    days_back: int = Query(7, ge=1, le=90),
    limit: int = Query(100, ge=1, le=500),
) -> dict[str, Any]:
    """Histórico port calls (arrivals + departures)."""
    try:
        from etl.sources.ports.port_intel import port_calls
        items = port_calls(port_slug, days_back=days_back, limit=limit)
        return {"port_slug": port_slug, "days_back": days_back,
                "n_items": len(items), "items": items}
    except Exception as exc:
        logger.exception("port_calls falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{port_slug}/congestion")
def port_congestion_endpoint(
    port_slug: str,
    days: int = Query(30, ge=1, le=180),
) -> dict[str, Any]:
    """Serie diaria de vessels-anchored y avg wait."""
    try:
        from etl.sources.ports.port_intel import port_congestion
        return port_congestion(port_slug, days=days)
    except Exception as exc:
        logger.exception("port_congestion falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{port_slug}")
def port_overview_endpoint(port_slug: str) -> dict[str, Any]:
    """Detalle puerto · metadata + KPIs 24h. (DEBE ir al final · catch-all)"""
    try:
        from etl.sources.ports.catalog import get_port
        p = get_port(port_slug)
        if p is None:
            raise HTTPException(status_code=404, detail=f"puerto '{port_slug}' no existe")
        h = abs(hash(port_slug))
        return {
            **p,
            "kpis_24h": {
                "vessels_anchored": (h % 80) + 5,
                "arrivals_24h": (h // 80 % 40) + 2,
                "departures_24h": (h // 3200 % 40) + 2,
                "congestion_pct": (h // 6400 % 50) + 10,
                "avg_wait_hours": round((h // 12800 % 40) / 2.0 + 4.0, 1),
            },
            "data_source": "synthetic",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("port_overview falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
