# api/routers/legislative.py
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Query

from api.schemas.legislative import (
    BoeItem,
    BoeResponse,
    Initiative,
    InitiativesResponse,
    LegislativeKpis,
)

router = APIRouter(prefix="/api/legislative", tags=["legislative"])


# ── Demo fallbacks ──────────────────────────────────────────────────────────

def _demo_boe() -> BoeResponse:
    today = date.today().isoformat()
    return BoeResponse(
        date=today,
        mode="fallback",
        total=5,
        items=[
            BoeItem(title="RD 312/2026 ayudas autónomos digitalización", section="I. Disposiciones generales", department="Ministerio de Industria", date=today, type="Real Decreto", relevance="alta"),
            BoeItem(title="Orden HAC/450/2026 plazo declaración renta", section="I. Disposiciones generales", department="Hacienda", date=today, type="Orden", relevance="alta"),
            BoeItem(title="Resolución BOE Salud Pública vacunación", section="III. Otras disposiciones", department="Sanidad", date=today, type="Resolución", relevance="media"),
            BoeItem(title="Convocatoria becas Ministerio Educación 2026", section="III. Otras disposiciones", department="Educación", date=today, type="Convocatoria", relevance="media"),
            BoeItem(title="Convenio colectivo construcción nacional", section="III. Otras disposiciones", department="Trabajo", date=today, type="Convenio", relevance="baja"),
        ],
    )


def _demo_initiatives() -> InitiativesResponse:
    items = [
        Initiative(id="1", title="Ley de Vivienda 2025 (reforma)", type="Proyecto de Ley", proponent="Gobierno", status="Comisión", urgency="high"),
        Initiative(id="2", title="Reforma fiscal SICAV/SOCIMI", type="Proyecto de Ley", proponent="Hacienda", status="Pleno", urgency="high"),
        Initiative(id="3", title="Ley Memoria Democrática (modificación)", type="Proposición de Ley", proponent="PSOE-Sumar", status="Enmiendas", urgency="medium"),
        Initiative(id="4", title="Real Decreto-ley fondos UE 2026", type="Real Decreto-ley", proponent="Moncloa", status="Convalidación", urgency="high"),
        Initiative(id="5", title="Ley audiovisual (RTVE financiación)", type="Proyecto de Ley", proponent="Cultura", status="Ponencia", urgency="medium"),
        Initiative(id="6", title="Reforma reglamento Congreso", type="Proposición no de Ley", proponent="Mesa", status="Debate", urgency="low"),
    ]
    return InitiativesResponse(items=items, mode="fallback", total=6, active=6, critical=3)


def _demo_kpis() -> LegislativeKpis:
    return LegislativeKpis(
        active_initiatives=187,
        approved_this_month=23,
        critical_tramitation=9,
        upcoming_votes=14,
        mode="fallback",
    )


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/boe", response_model=BoeResponse)
def get_boe(limit: int = Query(10, ge=1, le=50)) -> BoeResponse:
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
            for r in raw
            if r.get("titulo")
        ]
        if not items:
            return _demo_boe()
        return BoeResponse(
            items=items[:limit],
            date=date.today().isoformat(),
            mode="real",
            total=len(items),
        )
    except Exception:
        return _demo_boe()


@router.get("/initiatives", response_model=InitiativesResponse)
def get_initiatives(limit: int = Query(20, ge=1, le=100)) -> InitiativesResponse:
    try:
        from etl.institucional.congreso_iniciativas import fetch_iniciativas  # type: ignore
        all_items: list[dict] = []
        for tipo in ("proposicion-ley", "proyecto-ley"):
            all_items.extend(fetch_iniciativas(tipo, n=limit))
        if not all_items:
            return _demo_initiatives()
        items = [
            Initiative(
                id=str(r.get("id", i)),
                title=r.get("titulo", r.get("title", "Iniciativa sin título")),
                type=r.get("tipo", r.get("initiative_type", "")),
                proponent=r.get("proponent_party", r.get("proponente", "")),
                status=r.get("status", "Pendiente"),
                submitted_at=str(r.get("submitted_at", r.get("fecha", ""))),
                urgency=(
                    "high" if r.get("urgencia", 0) >= 4
                    else "medium" if r.get("urgencia", 0) >= 2
                    else "low"
                ),
            )
            for i, r in enumerate(all_items[:limit])
        ]
        active = len([x for x in items if x.status not in ("Aprobada", "Rechazada", "Retirada")])
        critical = len([x for x in items if x.urgency == "high"])
        return InitiativesResponse(
            items=items, mode="real", total=len(items), active=active, critical=critical
        )
    except Exception:
        return _demo_initiatives()


@router.get("/kpis", response_model=LegislativeKpis)
def get_legislative_kpis() -> LegislativeKpis:
    try:
        from etl.institucional.congreso_iniciativas import fetch_iniciativas  # type: ignore
        items = fetch_iniciativas("proposicion-ley", n=100) + fetch_iniciativas("proyecto-ley", n=100)
        if not items:
            return _demo_kpis()
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
        return _demo_kpis()
