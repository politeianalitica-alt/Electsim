# services/legislative/legislative_service.py
"""
Main legislative service.
Tries to load real data from ETL modules; falls back gracefully to demo fixtures.
"""
from __future__ import annotations
import logging
from datetime import date

from api.schemas.legislative import (
    BoeItem, LegislativeKpis, LegislativeItem, LegislativeItemsResponse,
    LegislativeOverviewResponse, CalendarItem, LegislativeItemDetail,
    LegislativeEvent, SectorImpact, ActorLegislativePosition, LegislativeEvidence,
)
from services.legislative.legislative_fixtures import (
    DEMO_ITEMS, DEMO_CALENDAR, DEMO_BOE, DEMO_HEATMAP, DEMO_KPIS,
    get_demo_overview, get_demo_items,
)
from services.legislative.legislative_scoring import urgency_sort_key

log = logging.getLogger(__name__)


def get_overview() -> LegislativeOverviewResponse:
    """Assemble overview response. Tries real ETL data; falls back to demo."""
    try:
        kpis = _fetch_kpis()
        critical_items = _fetch_critical_items()
        calendar = _fetch_calendar()
        boe = _fetch_boe(5)
        overall_mode = "real" if kpis.mode == "real" else "fallback"
        return LegislativeOverviewResponse(
            kpis=kpis,
            critical_items=critical_items[:8],
            calendar_week=calendar,
            boe_today=boe,
            heatmap=DEMO_HEATMAP,
            mode=overall_mode,
        )
    except Exception:
        log.warning("legislative_service.get_overview: falling back to demo", exc_info=True)
        return get_demo_overview()


def get_items(
    page: int = 1,
    page_size: int = 20,
    urgency: str | None = None,
    sector: str | None = None,
    jurisdiction: str | None = None,
    search: str | None = None,
) -> LegislativeItemsResponse:
    """Return paginated legislative items with optional filtering."""
    try:
        items = list(DEMO_ITEMS)
        if urgency:
            items = [i for i in items if i.urgency == urgency]
        if sector:
            items = [i for i in items if i.primary_sector == sector]
        if jurisdiction:
            items = [i for i in items if i.jurisdiction == jurisdiction]
        if search:
            q = search.lower()
            items = [i for i in items if q in i.title.lower() or q in " ".join(i.tags).lower()]
        items.sort(key=lambda x: urgency_sort_key(x.urgency))
        total = len(items)
        start = (page - 1) * page_size
        return LegislativeItemsResponse(
            items=items[start:start + page_size],
            total=total,
            page=page,
            page_size=page_size,
            mode="demo",
        )
    except Exception:
        log.warning("legislative_service.get_items: error", exc_info=True)
        return get_demo_items(page, page_size)


def get_item_detail(item_id: str) -> LegislativeItemDetail | None:
    """Return full detail for one legislative item."""
    item = next((i for i in DEMO_ITEMS if i.id == item_id), None)
    if item is None:
        return None
    return LegislativeItemDetail(
        **item.model_dump(),
        full_title=item.title,
        summary=(
            f"Esta iniciativa legislativa está en fase '{item.stage_label}'. "
            f"El impacto estimado en el sector {item.primary_sector} es de {item.impact_score}/100. "
            f"Monitorizar activamente para anticipar cambios regulatorios."
        ),
        objetivos=[
            f"Establecer un marco regulatorio claro para el sector {item.primary_sector}",
            "Garantizar la seguridad jurídica de los actores afectados",
            "Armonizar la normativa española con los estándares europeos",
        ],
        timeline=[
            LegislativeEvent(
                date=item.submitted_at or date.today().isoformat(),
                description="Presentación de la iniciativa",
                institution="camara_baja",
                stage="presentacion",
            ),
            LegislativeEvent(
                date=item.last_activity or date.today().isoformat(),
                description=f"Última actividad: {item.stage_label}",
                institution=item.institution,
                stage=item.current_stage,
            ),
        ],
        sector_impacts=[
            SectorImpact(
                sector=item.primary_sector,
                sector_label=item.primary_sector.replace("_", " ").title(),
                impact_level="alto" if item.impact_score >= 70 else "medio" if item.impact_score >= 45 else "bajo",
                impact_score=item.impact_score,
                summary=f"Impacto regulatorio significativo en el sector {item.primary_sector}. "
                        f"Las empresas deberán adaptar sus modelos de negocio.",
            ),
        ],
        actor_positions=[
            ActorLegislativePosition(
                actor_name="Partido Socialista",
                party="PSOE",
                party_color="#E03A3E",
                position="favor" if item.is_government else "neutro",
                statement="Apoyamos esta iniciativa como parte de nuestra agenda legislativa.",
            ),
            ActorLegislativePosition(
                actor_name="Partido Popular",
                party="PP",
                party_color="#1F77FF",
                position="contra" if item.is_government else "favor",
                statement="Revisaremos el texto para asegurar la seguridad jurídica.",
            ),
            ActorLegislativePosition(
                actor_name="Sumar",
                party="Sumar",
                party_color="#9B59B6",
                position="favor",
                statement="Exigimos mayor ambición en los objetivos de esta iniciativa.",
            ),
        ],
        evidence=[
            LegislativeEvidence(
                source="BOE / Congreso de los Diputados",
                excerpt=f"Texto de la iniciativa: {item.title}",
                date=item.submitted_at or date.today().isoformat(),
                url=item.boe_url,
            ),
        ],
        analyst_note=(
            f"Iniciativa de {'alto' if item.impact_score >= 70 else 'medio'} impacto para el sector "
            f"{item.primary_sector}. Urgencia: {item.urgency}. "
            f"Recomendamos monitorizar el avance en comisión y la posición de los grupos parlamentarios clave."
        ),
    )


def _fetch_kpis() -> LegislativeKpis:
    """Try real ETL; fall back to demo KPIs."""
    try:
        from etl.institucional.congreso_iniciativas import fetch_iniciativas  # type: ignore
        items = fetch_iniciativas("proposicion-ley", n=100) + fetch_iniciativas("proyecto-ley", n=100)
        if not items:
            return DEMO_KPIS
        active = len([x for x in items if x.get("status") not in ("Aprobada", "Rechazada", "Retirada")])
        critical = len([x for x in items if x.get("urgencia", 0) >= 4])
        return LegislativeKpis(
            active_initiatives=active,
            approved_this_month=len([x for x in items if x.get("status") == "Aprobada"]),
            critical_tramitation=critical,
            upcoming_votes=0,
            mode="real",
        )
    except Exception:
        return DEMO_KPIS


def _fetch_critical_items() -> list[LegislativeItem]:
    """Try to load items from ETL; fall back to demo."""
    try:
        from etl.institucional.congreso_iniciativas import fetch_iniciativas  # type: ignore
        raw = fetch_iniciativas("proyecto-ley", n=50) + fetch_iniciativas("proposicion-ley", n=50)
        if not raw:
            return [i for i in DEMO_ITEMS if i.urgency in ("critical", "high")]
        items = []
        for r in raw[:20]:
            try:
                urgencia_raw = int(r.get("urgencia", 0))
                urgency = "critical" if urgencia_raw >= 5 else "high" if urgencia_raw >= 3 else "medium" if urgencia_raw >= 1 else "low"
                items.append(LegislativeItem(
                    id=str(r.get("id", "")),
                    title=r.get("titulo", r.get("title", "Sin título")),
                    short_title=str(r.get("titulo", ""))[:40],
                    procedure_type=_map_tipo(r.get("tipo", r.get("initiative_type", ""))),
                    procedure_label=r.get("tipo", r.get("initiative_type", "")),
                    proponent=r.get("proponent_party", r.get("proponente", "")),
                    current_stage="comision",
                    stage_label=r.get("status", "En tramitación"),
                    urgency=urgency,
                    submitted_at=str(r.get("submitted_at", r.get("fecha", ""))),
                    impact_score=min(70 + urgencia_raw * 5, 100),
                    status=r.get("status", "En tramitación"),
                ))
            except Exception:
                continue
        return items if items else [i for i in DEMO_ITEMS if i.urgency in ("critical", "high")]
    except Exception:
        return [i for i in DEMO_ITEMS if i.urgency in ("critical", "high")]


def _fetch_calendar() -> list[CalendarItem]:
    """Calendar — no ETL yet, return demo."""
    return DEMO_CALENDAR


def _fetch_boe(limit: int) -> list[BoeItem]:
    """Try real BOE RSS; fall back to demo."""
    try:
        from etl.institucional.boe_rss import fetch_boe_items  # type: ignore
        raw = fetch_boe_items(limit=limit)
        items = [
            BoeItem(
                boe_no=r.get("boe_no"),
                title=r.get("titulo", ""),
                section=r.get("seccion", ""),
                department=r.get("departamento", ""),
                date=r.get("fecha", date.today().isoformat()),
                url=r.get("url_html"),
                type=r.get("tipo", ""),
                relevance=r.get("relevancia", "media"),
            )
            for r in raw if r.get("titulo")
        ]
        return items[:limit] if items else DEMO_BOE[:limit]
    except Exception:
        return DEMO_BOE[:limit]


def _map_tipo(tipo: str) -> str:
    """Map Spanish tipo label to ProcedureType literal."""
    mapping = {
        "Proyecto de Ley": "proyecto_ley",
        "Proposición de Ley": "proposicion_ley",
        "Real Decreto-ley": "real_decreto_ley",
        "Real Decreto": "real_decreto",
        "Proposición no de Ley": "proposicion_no_ley",
    }
    return mapping.get(tipo, "proposicion_ley")
