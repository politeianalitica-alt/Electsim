from __future__ import annotations

import logging
import os
from datetime import date, timedelta

from fastapi import APIRouter

from api.schemas.geopolitica import (
    CountryRiskItem,
    GeoEventItem,
    GeoKpiItem,
    GeoOverview,
    PresenceItem,
)

router = APIRouter(prefix="/api/geopolitica", tags=["geopolitica"])
log = logging.getLogger(__name__)

_ISO3_TO_ISO2: dict[str, str] = {
    "UKR": "UA", "RUS": "RU", "PSE": "PS", "ISR": "IL", "SYR": "SY",
    "IRQ": "IQ", "IRN": "IR", "MAR": "MA", "DZA": "DZ", "LBY": "LY",
    "MLI": "ML", "BFA": "BF", "NER": "NE", "NGA": "NG", "TCD": "TD",
    "VEN": "VE", "MEX": "MX", "COL": "CO", "CHN": "CN", "TWN": "TW",
    "TUR": "TR", "LBN": "LB", "YEM": "YE", "SAU": "SA", "SDN": "SD",
}

_DEMO_EVENTS = [
    GeoEventItem(event_id="d1", country="Ucrania", country_iso3="UKR", event_date="2026-05-06", event_type="Conflicto", severity="CRITICAL", description="Ofensiva en frente este — actividad artillera intensa", fatalities=12, impact=88),
    GeoEventItem(event_id="d2", country="Gaza/Palestina", country_iso3="PSE", event_date="2026-05-06", event_type="Conflicto", severity="CRITICAL", description="Operación terrestre continúa — negociaciones suspendidas", fatalities=47, impact=92),
    GeoEventItem(event_id="d3", country="Marruecos", country_iso3="MAR", event_date="2026-05-05", event_type="Diplomático", severity="MEDIUM", description="Movimientos navales en aguas próximas a Ceuta", fatalities=0, impact=64),
    GeoEventItem(event_id="d4", country="Venezuela", country_iso3="VEN", event_date="2026-05-05", event_type="Crisis", severity="MEDIUM", description="Protestas post-electorales; oposición denuncia represión", fatalities=3, impact=52),
]

_DEMO_COUNTRIES = [
    CountryRiskItem(code="UA", iso3="UKR", name="Ucrania", risk=92, status="war", trend="stable"),
    CountryRiskItem(code="PS", iso3="PSE", name="Gaza/Palestina", risk=95, status="war", trend="rising"),
    CountryRiskItem(code="RU", iso3="RUS", name="Rusia", risk=88, status="war", trend="stable"),
    CountryRiskItem(code="IR", iso3="IRN", name="Irán", risk=76, status="tense", trend="rising"),
    CountryRiskItem(code="ML", iso3="MLI", name="Sahel (Mali)", risk=84, status="war", trend="stable"),
    CountryRiskItem(code="MA", iso3="MAR", name="Marruecos", risk=58, status="tense", trend="stable"),
    CountryRiskItem(code="VE", iso3="VEN", name="Venezuela", risk=68, status="tense", trend="stable"),
    CountryRiskItem(code="CN", iso3="CHN", name="China", risk=62, status="watch", trend="rising"),
    CountryRiskItem(code="TR", iso3="TUR", name="Turquía", risk=51, status="watch", trend="stable"),
]

_DEMO_PRESENCE = [
    PresenceItem(territory="Sáhara Occidental", status="Disputa diplomática activa", level="high", category="diplomatic"),
    PresenceItem(territory="Gibraltar", status="Acuerdo post-Brexit en negociación", level="medium", category="diplomatic"),
    PresenceItem(territory="Ceuta y Melilla", status="Presión migratoria estable", level="medium", category="territorial"),
    PresenceItem(territory="Argelia — Medgaz", status="8 Gm³/año — contrato vigente", level="high", category="energy"),
    PresenceItem(territory="Líbano — UNIFIL", status="~600 efectivos militares españoles", level="high", category="military"),
    PresenceItem(territory="OTAN flanco sur", status="Compromiso 2% PIB defensa pendiente", level="medium", category="defense"),
]


def _demo_kpis(events: list[GeoEventItem], countries: list[CountryRiskItem]) -> list[GeoKpiItem]:
    n_critical = sum(1 for e in events if e.severity == "CRITICAL")
    n_war = sum(1 for c in countries if c.status == "war")
    avg_risk = int(sum(c.risk for c in countries) / len(countries)) if countries else 0
    return [
        GeoKpiItem(label="Eventos críticos (7d)", value=n_critical, color="red"),
        GeoKpiItem(label="Países en guerra", value=n_war, color="red"),
        GeoKpiItem(label="Riesgo medio global", value=avg_risk, color="amber"),
        GeoKpiItem(label="Focos activos monitorizados", value=len(countries), color="blue"),
    ]


def _demo_overview() -> GeoOverview:
    return GeoOverview(
        kpis=_demo_kpis(_DEMO_EVENTS, _DEMO_COUNTRIES),
        events=_DEMO_EVENTS,
        countries=_DEMO_COUNTRIES,
        presence=_DEMO_PRESENCE,
        mode="demo",
    )


def _severity_from_fatalities(fatalities: int) -> str:
    if fatalities > 50:
        return "CRITICAL"
    if fatalities > 10:
        return "HIGH"
    return "MEDIUM"


def _status_from_risk(risk: int) -> str:
    if risk >= 75:
        return "war"
    if risk >= 50:
        return "tense"
    if risk >= 30:
        return "watch"
    return "stable"


def _normalize_trend(raw: str | None) -> str:
    if not raw:
        return "stable"
    raw_lower = raw.lower()
    if raw_lower in ("rising", "subiendo", "up", "aumentando"):
        return "rising"
    if raw_lower in ("falling", "bajando", "down", "cayendo"):
        return "falling"
    return "stable"


def _get_presence() -> list[PresenceItem]:
    try:
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence  # type: ignore
        raw = get_spanish_presence(country_iso3=None)
        items: list[PresenceItem] = []
        for sp in raw:
            level = "high" if sp.relevance_score >= 0.7 else "medium" if sp.relevance_score >= 0.4 else "low"
            territory = sp.country_name or sp.country_iso3
            if sp.actor_name:
                territory = f"{territory} — {sp.actor_name}"
            items.append(PresenceItem(
                territory=territory,
                status=sp.description or sp.category,
                level=level,
                category=sp.category,
            ))
        return items if items else _DEMO_PRESENCE
    except Exception as exc:
        log.warning("get_spanish_presence failed: %s", exc)
        return _DEMO_PRESENCE


@router.get("/overview", response_model=GeoOverview)
def get_geopolitica_overview() -> GeoOverview:
    try:
        import psycopg2  # type: ignore

        dsn = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")
        cutoff = (date.today() - timedelta(days=7)).isoformat()

        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id::text, pais, pais_nombre, fecha::text,
                           tipo_evento, fatalities, relevancia_es, notas
                    FROM eventos_acled
                    WHERE fecha >= %s
                    ORDER BY relevancia_es DESC, fecha DESC
                    LIMIT 20
                    """,
                    (cutoff,),
                )
                event_rows = cur.fetchall() or []

                cur.execute(
                    """
                    SELECT pais, nombre, score_total, interes_espana, riesgo_tendencia
                    FROM riesgo_pais
                    ORDER BY score_total DESC
                    LIMIT 15
                    """
                )
                country_rows = cur.fetchall() or []

        if not event_rows and not country_rows:
            raise ValueError("DB empty")

        events: list[GeoEventItem] = []
        for row in event_rows:
            (eid, pais, pais_iso3, fecha, tipo, fatalities, relevancia, notas) = row
            iso3 = pais_iso3 or ""
            fat = int(fatalities or 0)
            rel = float(relevancia or 0.0)
            events.append(GeoEventItem(
                event_id=str(eid),
                country=pais or "",
                country_iso3=iso3,
                event_date=str(fecha),
                event_type=tipo or "",
                severity=_severity_from_fatalities(fat),
                description=notas or tipo or "",
                fatalities=fat,
                impact=int(min(rel * 100, 100)),
            ))

        countries: list[CountryRiskItem] = []
        for row in country_rows:
            (pais, nombre, score_total, interes, tendencia) = row
            iso3 = str(pais or "")
            risk = int(round(float(score_total or 0)))
            countries.append(CountryRiskItem(
                code=_ISO3_TO_ISO2.get(iso3, iso3[:2].upper() if iso3 else ""),
                iso3=iso3,
                name=nombre or iso3,
                risk=risk,
                status=_status_from_risk(risk),
                trend=_normalize_trend(tendencia),
            ))

        presence = _get_presence()

        return GeoOverview(
            kpis=_demo_kpis(events, countries),
            events=events,
            countries=countries,
            presence=presence,
            mode="real",
        )

    except Exception as exc:
        log.warning("geopolitica DB query failed (%s), trying ETL fallback", exc)

    # ETL fallback
    try:
        from etl.sources.geopolitics.acled_client import fetch_acled_events  # type: ignore

        raw_events = fetch_acled_events(limit=10)
        events = []
        for ge in raw_events:
            fat = int(ge.fatalities or 0)
            iso3 = ge.country_iso3 or ""
            events.append(GeoEventItem(
                event_id=ge.event_id,
                country=ge.country,
                country_iso3=iso3,
                event_date=ge.event_date.isoformat(),
                event_type=ge.event_type,
                severity=ge.severity,
                description=getattr(ge, "description", ge.event_type),
                fatalities=fat,
                impact=_severity_from_fatalities(fat) and 60,
            ))

        presence = _get_presence()
        return GeoOverview(
            kpis=_demo_kpis(events or _DEMO_EVENTS, _DEMO_COUNTRIES),
            events=events or _DEMO_EVENTS,
            countries=_DEMO_COUNTRIES,
            presence=presence,
            mode="fallback",
        )

    except Exception as etl_exc:
        log.warning("ETL fallback also failed (%s), returning demo data", etl_exc)
        return _demo_overview()
