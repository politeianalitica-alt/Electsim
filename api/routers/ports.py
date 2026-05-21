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


@router.get("/data-sources/status")
def data_sources_status_endpoint() -> dict[str, Any]:
    """Estado de las fuentes externas conectables (live/synth/degraded).

    Devuelve un payload por fuente para que el frontend pinte un banner
    claro indicando qué datos son reales vs sintéticos.
    Nunca lanza · todas las comprobaciones fallan cerradas.
    """
    import os
    sources: list[dict[str, Any]] = []

    # AIS · WebSocket AISstream
    try:
        from etl.sources.ports.ais_client import is_realtime_available
        live = bool(is_realtime_available())
        sources.append({
            "key": "aisstream",
            "label": "AIS · AISstream",
            "category": "vessel_positions",
            "live": live,
            "reason": (
                "AISSTREAM_API_KEY configurada"
                if live
                else "Sin AISSTREAM_API_KEY · usando posiciones sintéticas"
            ),
            "env_hint": "AISSTREAM_API_KEY",
        })
    except Exception as exc:
        sources.append({
            "key": "aisstream", "label": "AIS · AISstream",
            "category": "vessel_positions", "live": False,
            "reason": f"error: {exc}", "env_hint": "AISSTREAM_API_KEY",
        })

    # Comtrade
    try:
        from etl.sources.ports.comtrade_client import has_api_key, is_real_api_available
        avail = bool(is_real_api_available())
        has_key = bool(has_api_key())
        sources.append({
            "key": "comtrade",
            "label": "UN Comtrade",
            "category": "trade_flows",
            "live": avail,
            "reason": (
                f"API alcanzable · key {'configurada' if has_key else 'ausente (anon free tier)'}"
                if avail
                else "Forzado a seed (COMTRADE_FORCE_SEED=1) o httpx no instalado"
            ),
            "env_hint": "COMTRADE_API_KEY (opcional)",
        })
    except Exception as exc:
        sources.append({
            "key": "comtrade", "label": "UN Comtrade",
            "category": "trade_flows", "live": False,
            "reason": f"error: {exc}", "env_hint": "COMTRADE_API_KEY",
        })

    # Eurostat Comext
    try:
        # Comext no requiere key; chequeamos que la dep eurostat_connector esté importable
        from etl.ingestion.connectors import eurostat_connector  # noqa: F401
        sources.append({
            "key": "comext",
            "label": "Eurostat Comext",
            "category": "trade_flows_eu",
            "live": True,
            "reason": "API pública sin key · EU↔EU",
            "env_hint": None,
        })
    except Exception:
        sources.append({
            "key": "comext", "label": "Eurostat Comext",
            "category": "trade_flows_eu", "live": False,
            "reason": "conector Eurostat no disponible · usando seed Comext",
            "env_hint": None,
        })

    # Yahoo Finance (freight)
    has_yahoo = False
    yahoo_reason = "ninguno"
    try:
        from etl.sources.commodities.prices import YahooFinanceClient  # noqa: F401
        has_yahoo = True
        yahoo_reason = "YahooFinanceClient disponible · ^BDI intentado en live"
    except Exception as exc:
        yahoo_reason = f"YahooFinanceClient no importable: {exc}"
    sources.append({
        "key": "yahoo_freight",
        "label": "Yahoo Finance · Freight",
        "category": "freight",
        "live": has_yahoo,
        "reason": yahoo_reason,
        "env_hint": None,
    })

    # ACLED
    has_acled = bool(os.environ.get("ACLED_API_KEY") and os.environ.get("ACLED_EMAIL"))
    sources.append({
        "key": "acled",
        "label": "ACLED · Eventos geopolíticos",
        "category": "chokepoint_risk",
        "live": has_acled,
        "reason": (
            "ACLED_API_KEY + ACLED_EMAIL configurados"
            if has_acled
            else "Sin credenciales · risk_score usa solo base (sin boost por eventos)"
        ),
        "env_hint": "ACLED_API_KEY + ACLED_EMAIL",
    })

    # OpenSanctions / compliance
    try:
        from agents.tools import compliance_tools  # noqa: F401
        os_url = os.environ.get("OPENSANCTIONS_API_URL", "")
        sources.append({
            "key": "opensanctions",
            "label": "OpenSanctions API",
            "category": "sanctions",
            "live": bool(os_url),
            "reason": (
                f"OPENSANCTIONS_API_URL={os_url}"
                if os_url
                else "Sin URL configurada · usando OFAC/EU/UN consolidados como fallback"
            ),
            "env_hint": "OPENSANCTIONS_API_URL",
        })
    except Exception as exc:
        sources.append({
            "key": "opensanctions", "label": "OpenSanctions API",
            "category": "sanctions", "live": False,
            "reason": f"compliance_tools no importable: {exc}",
            "env_hint": "OPENSANCTIONS_API_URL",
        })

    # OFAC + EU + UN consolidated lists · XML públicos sin auth
    for key, label, url in (
        ("ofac_sdn", "OFAC SDN (Treasury USA)",
         "https://www.treasury.gov/ofac/downloads/sdn.xml"),
        ("eu_consolidated", "EU Consolidated Sanctions",
         "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content"),
        ("un_sc", "UN Security Council Sanctions",
         "https://scsanctions.un.org/resources/xml/en/consolidated.xml"),
    ):
        sources.append({
            "key": key,
            "label": label,
            "category": "sanctions",
            "live": True,
            "reason": f"XML público sin auth · {url}",
            "env_hint": None,
        })

    # GLEIF LEI
    sources.append({
        "key": "gleif",
        "label": "GLEIF · LEI / corporate ID",
        "category": "corporate",
        "live": True,
        "reason": "API pública sin auth · https://api.gleif.org/api/v1/",
        "env_hint": None,
    })

    # ECB Statistical Data Warehouse
    sources.append({
        "key": "ecb_sdw",
        "label": "ECB Statistical Data Warehouse",
        "category": "macro_fx",
        "live": True,
        "reason": "API pública sin auth · https://data-api.ecb.europa.eu/",
        "env_hint": None,
    })

    # World Bank commodities
    sources.append({
        "key": "world_bank_commodities",
        "label": "World Bank · Commodity Price Indices",
        "category": "freight",
        "live": True,
        "reason": "API pública sin auth · indicators PNRG/PFOOD/PMETA",
        "env_hint": None,
    })

    # GPSJam
    sources.append({
        "key": "gpsjam",
        "label": "GPSJam · GNSS jamming map",
        "category": "gnss_risk",
        "live": True,
        "reason": "GeoJSON público diario · gpsjam.org",
        "env_hint": None,
    })

    # EMSC sismicidad
    sources.append({
        "key": "emsc",
        "label": "EMSC · Eventos sísmicos",
        "category": "geophysical_risk",
        "live": True,
        "reason": "FDSN público sin auth · seismicportal.eu",
        "env_hint": None,
    })

    # GIE AGSI+ gas storage
    has_gie_key = bool(os.environ.get("GIE_API_KEY"))
    sources.append({
        "key": "gie_agsi",
        "label": "GIE AGSI+ · Gas storage EU",
        "category": "energy_storage",
        "live": True,
        "reason": (
            "GIE_API_KEY configurada (premium)" if has_gie_key
            else "Anónimo · acceso básico (registro gratuito recomendado)"
        ),
        "env_hint": "GIE_API_KEY (opcional)",
    })

    n_live = sum(1 for s in sources if s["live"])
    return {
        "n_sources": len(sources),
        "n_live": n_live,
        "all_live": n_live == len(sources),
        "any_live": n_live > 0,
        "items": sources,
    }


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

    Estricto live · sólo devuelve KPIs si AIS está disponible. Sin AIS los
    puertos vienen con `available=False` y los counters a `null` (el frontend
    los muestra como pendientes de live, no como datos sintéticos).
    """
    try:
        import os
        from etl.sources.ports.catalog import list_ports
        from etl.sources.ports.ais_client import is_realtime_available
        ais_live = bool(is_realtime_available())
        # Optar a sintético solo si el usuario lo pide explícitamente
        allow_synth = os.environ.get("PORTS_ALLOW_SYNTH") == "1"

        ports = list_ports(region=region)[:limit]
        items: list[dict[str, Any]] = []
        for p in ports:
            base: dict[str, Any] = {**p}
            if ais_live:
                # AIS real · port_intel calcula congestión a partir de vessels en zona
                try:
                    from etl.sources.ports.port_intel import port_snapshot as _ps
                    snap = _ps(p["slug"])
                    k = snap.get("kpis_24h") or {}
                    base.update({
                        "vessels_anchored": k.get("vessels_anchored"),
                        "arrivals_24h": k.get("arrivals_24h"),
                        "congestion_pct": k.get("congestion_pct"),
                        "data_source": "aisstream",
                        "available": True,
                    })
                except Exception as exc:
                    logger.debug("port_snapshot live falló %s: %s", p["slug"], exc)
                    base.update({
                        "vessels_anchored": None,
                        "arrivals_24h": None,
                        "congestion_pct": None,
                        "data_source": "aisstream_error",
                        "available": False,
                    })
            elif allow_synth:
                h = abs(hash(p["slug"]))
                base.update({
                    "vessels_anchored": (h % 80) + 5,
                    "arrivals_24h": (h // 80 % 40) + 2,
                    "congestion_pct": (h // 3200 % 50) + 10,
                    "data_source": "synthetic",
                    "available": True,
                })
            else:
                base.update({
                    "vessels_anchored": None,
                    "arrivals_24h": None,
                    "congestion_pct": None,
                    "data_source": "requires_aisstream",
                    "available": False,
                })
            items.append(base)

        data_source = "aisstream" if ais_live else ("synthetic" if allow_synth else "requires_aisstream")
        note = None
        if not ais_live and not allow_synth:
            note = (
                "AISSTREAM_API_KEY no configurada · KPIs en blanco. "
                "Defina la key en backend para activar live, o ponga "
                "PORTS_ALLOW_SYNTH=1 para volver al modo demo sintético."
            )
        return {
            "n_items": len(items),
            "items": items,
            "data_source": data_source,
            "ais_live": ais_live,
            "note": note,
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


@router.get("/vessels/{imo}/screen")
def vessel_screen_endpoint(imo: str) -> dict[str, Any]:
    """Screening sanciones marítimas (OFAC/UE/UN vía OpenSanctions)."""
    try:
        from etl.sources.ports.sanctions_maritime import screen_vessel
        res = screen_vessel(imo)
        if not res.get("ok"):
            raise HTTPException(status_code=404, detail=res.get("error", "no vessel"))
        return res
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("vessel_screen falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


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


@router.get("/freight/snapshot")
def freight_snapshot_endpoint() -> dict[str, Any]:
    """Snapshot 6 freight indices (BDI + sub-índices + FBX)."""
    try:
        from etl.sources.ports.freight_rates import snapshot_all
        return snapshot_all()
    except Exception as exc:
        logger.exception("freight_snapshot falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/freight/{index_slug}/price")
def freight_price_endpoint(
    index_slug: str,
    range_: str = Query("1y", alias="range"),
) -> dict[str, Any]:
    """Serie histórica de un freight index (OHLC + KPIs)."""
    try:
        from etl.sources.ports.freight_rates import get_price
        res = get_price(index_slug, range_=range_)
        if "error" in res:
            raise HTTPException(status_code=404, detail=res["error"])
        return res
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("freight_price falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/chokepoints")
def chokepoints_list_endpoint(
    days: int = Query(30, ge=1, le=180),
) -> dict[str, Any]:
    """6 corredores marítimos + risk_score actual (con ACLED si disponible)."""
    try:
        from etl.sources.ports.chokepoints import all_chokepoints_risk
        return all_chokepoints_risk(days=days)
    except Exception as exc:
        logger.exception("chokepoints_list falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/chokepoints/{slug}")
def chokepoint_detail_endpoint(
    slug: str,
    days: int = Query(30, ge=1, le=180),
) -> dict[str, Any]:
    """Detalle corredor + eventos ACLED recientes en bbox."""
    try:
        from etl.sources.ports.chokepoints import compute_risk_score
        res = compute_risk_score(slug, days=days)
        if "error" in res:
            raise HTTPException(status_code=404, detail=res["error"])
        return res
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("chokepoint_detail falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/sanctions/screen")
def sanctions_screen_endpoint(req: SanctionsScreenRequest) -> dict[str, Any]:
    """Batch screening de vessels (por IMO) y/o operadores (por nombre)."""
    try:
        from etl.sources.ports.sanctions_maritime import screen_batch
        return screen_batch(vessels=req.vessels, operators=req.operators)
    except Exception as exc:
        logger.exception("sanctions_screen falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# Conectores reales sin auth · OFAC/EU/UN · GLEIF · ECB · WB · GPSJam · EMSC · GIE
# ─────────────────────────────────────────────────────────────────

@router.get("/sanctions/consolidated/search")
def sanctions_consolidated_search(
    q: str = Query(..., min_length=2, description="Nombre o alias a buscar"),
    limit: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    """Busca en OFAC SDN + EU Consolidated + UN SC consolidadas."""
    try:
        from etl.sources.ports.sanctions_lists import search_consolidated
        hits = search_consolidated(q, limit=limit)
        return {"ok": True, "query": q, "n_hits": len(hits), "items": hits}
    except Exception as exc:
        logger.exception("sanctions_consolidated_search falló")
        return {"ok": False, "query": q, "n_hits": 0, "items": [], "error": str(exc)}


@router.get("/sanctions/consolidated/status")
def sanctions_consolidated_status() -> dict[str, Any]:
    """Disponibilidad y tamaño de las 3 listas consolidadas."""
    try:
        from etl.sources.ports.sanctions_lists import list_availability
        return {"ok": True, "lists": list_availability()}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "lists": {}}


@router.get("/corporate/gleif/search")
def gleif_search(
    name: str = Query(..., min_length=2),
    limit: int = Query(5, ge=1, le=20),
) -> dict[str, Any]:
    """Resuelve operador → LEI vía GLEIF (público sin auth)."""
    try:
        from etl.sources.ports.gleif_client import search_entity
        items = search_entity(name, limit=limit)
        return {"ok": True, "query": name, "n_items": len(items), "items": items}
    except Exception as exc:
        return {"ok": False, "query": name, "items": [], "error": str(exc)}


@router.get("/corporate/gleif/{lei}")
def gleif_detail(lei: str, include_parent: bool = True) -> dict[str, Any]:
    """Detalle LEI + ultimate parent opcional."""
    try:
        from etl.sources.ports.gleif_client import get_lei, get_ultimate_parent
        info = get_lei(lei)
        if info is None:
            raise HTTPException(status_code=404, detail=f"LEI {lei} no encontrado")
        out = {"ok": True, **info}
        if include_parent:
            out["ultimate_parent"] = get_ultimate_parent(lei)
        return out
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/macro/ecb/fx/{currency}")
def ecb_fx_series(currency: str, last_n: int = Query(24, ge=1, le=240)) -> dict[str, Any]:
    """Tipos de cambio EUR↔CURRENCY (mensual)."""
    try:
        from etl.sources.ports.ecb_client import fx_series
        series = fx_series(currency.upper(), last_n=last_n)
        return {
            "ok": True,
            "currency": currency.upper(),
            "n_points": len(series),
            "series": series,
            "data_source": "ecb_sdw",
        }
    except Exception as exc:
        return {"ok": False, "currency": currency.upper(), "series": [], "error": str(exc)}


@router.get("/freight/world-bank")
def world_bank_commodities_snapshot() -> dict[str, Any]:
    """Snapshot 4 indices commodity World Bank (energy/food/metals/agri)."""
    try:
        from etl.sources.ports.world_bank_commodities import snapshot_all
        return snapshot_all()
    except Exception as exc:
        return {"ok": False, "n_items": 0, "items": [], "error": str(exc)}


@router.get("/freight/world-bank/{slug}")
def world_bank_series(slug: str, per_page: int = Query(60, ge=1, le=240)) -> dict[str, Any]:
    """Serie histórica de un index World Bank."""
    try:
        from etl.sources.ports.world_bank_commodities import fetch_series, INDICATORS
        if slug not in INDICATORS:
            raise HTTPException(status_code=404, detail=f"{slug} no es un index conocido")
        series = fetch_series(slug, per_page=per_page)
        return {
            "ok": True,
            "slug": slug,
            "indicator": INDICATORS[slug],
            "n_points": len(series),
            "series": series,
            "data_source": "world_bank",
        }
    except HTTPException:
        raise
    except Exception as exc:
        return {"ok": False, "slug": slug, "series": [], "error": str(exc)}


@router.get("/gnss/jamming/latest")
def gpsjam_latest() -> dict[str, Any]:
    """Último GeoJSON GPSJam disponible (D-1..D-5)."""
    try:
        from etl.sources.ports.gpsjam_client import fetch_latest_available
        data = fetch_latest_available()
        if not data:
            return {"ok": False, "reason": "GPSJam no disponible (red o sin datos recientes)", "features": []}
        return {"ok": True, "date": data.get("date"), "n_features": len(data.get("features") or []), "geojson": data}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


@router.get("/seismic/recent")
def seismic_recent(
    min_mag: float = Query(4.0, ge=2.0, le=10.0),
    days: int = Query(30, ge=1, le=180),
    limit: int = Query(200, ge=1, le=1000),
) -> dict[str, Any]:
    """Eventos sísmicos recientes globales (EMSC)."""
    try:
        from etl.sources.ports.emsc_client import recent_events
        events = recent_events(min_mag=min_mag, days=days, limit=limit)
        return {"ok": True, "n_items": len(events), "items": events, "data_source": "emsc"}
    except Exception as exc:
        return {"ok": False, "n_items": 0, "items": [], "error": str(exc)}


@router.get("/energy/gas-storage")
def gas_storage_eu() -> dict[str, Any]:
    """Niveles gas storage EU (GIE AGSI+)."""
    try:
        from etl.sources.ports.gie_agsi_client import eu_storage_summary
        res = eu_storage_summary()
        return {"ok": True, **res, "data_source": "gie_agsi"}
    except Exception as exc:
        return {"ok": False, "n_items": 0, "items": [], "error": str(exc)}


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
