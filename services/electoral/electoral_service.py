"""Electoral service — DB query with graceful fixtures fallback."""
from __future__ import annotations

import logging
import os

from api.schemas.electoral import (
    ElectoralOverviewResponse,
    SwingSimulateRequest,
    SwingSimResult,
    ElectoralBriefingRequest,
    ElectoralBriefingResponse,
    PartyProjection,
)

log = logging.getLogger(__name__)

_DSN = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")

_PARTY_COLORS: dict[str, str] = {
    "PP": "#1F77FF", "PSOE": "#E03A3E", "VOX": "#5BC035",
    "Sumar": "#D81E5B", "Junts": "#00C2A8", "ERC": "#F4B400",
    "Bildu": "#A4D65E", "PNV": "#1D8042", "BNG": "#7AC143",
    "Otros": "#94A3B8",
}
_IDEOLOGY: dict[str, float] = {
    "Sumar": 1.8, "Bildu": 1.5, "ERC": 2.5, "BNG": 2.0, "PSOE": 3.8,
    "PNV": 5.5, "Junts": 5.0, "Otros": 5.0, "PP": 6.8, "VOX": 9.1,
}
_BLOC: dict[str, str] = {
    "PP": "right", "VOX": "right", "PSOE": "left", "Sumar": "left",
    "Bildu": "left", "ERC": "nationalist", "Junts": "nationalist",
    "PNV": "nationalist", "BNG": "nationalist",
}
_GOVERNING = {"PSOE", "Sumar"}


def get_overview() -> ElectoralOverviewResponse:
    """Fetch live electoral data from DB; fall back to demo fixtures."""
    from services.electoral.electoral_fixtures import get_demo_overview, DEMO_COALITIONS, DEMO_KPIS, DEMO_KINGMAKERS, DEMO_VOTING_RECORDS
    from services.electoral.electoral_scoring import compute_coalition_viability

    try:
        import psycopg2
        with psycopg2.connect(_DSN) as conn:
            with conn.cursor() as cur:
                # Latest national congress election
                cur.execute(
                    "SELECT id, fecha::text FROM elecciones WHERE tipo='congreso' ORDER BY fecha DESC LIMIT 1"
                )
                row = cur.fetchone()
                if not row:
                    raise ValueError("No elections in DB")
                elec_id, elec_date = row

                cur.execute(
                    """
                    SELECT p.siglas, p.nombre_completo, SUM(r.escanos)::int, AVG(r.porcentaje)::float
                    FROM resultados_electorales r
                    JOIN partidos p ON p.id = r.partido_id
                    WHERE r.eleccion_id = %s
                    GROUP BY p.id, p.siglas, p.nombre_completo
                    HAVING SUM(r.escanos) > 0
                    ORDER BY SUM(r.escanos) DESC
                    """,
                    (elec_id,),
                )
                rows = cur.fetchall()
                if not rows:
                    raise ValueError("No seat data")

        parties = [
            PartyProjection(
                code=siglas, name=nombre, seats=escanos,
                seats_low=max(0, escanos - 8), seats_high=escanos + 8,
                pct_vote=round(pct or 0.0, 2),
                seat_trend="stable",
                color=_PARTY_COLORS.get(siglas, "#94A3B8"),
                ideology_score=_IDEOLOGY.get(siglas, 5.0),
                is_governing=(siglas in _GOVERNING),
                bloc=_BLOC.get(siglas),
            )
            for siglas, nombre, escanos, pct in rows
        ]
        total_seats = sum(p.seats for p in parties)
        majority = (total_seats // 2) + 1

        return ElectoralOverviewResponse(
            parties=parties,
            coalitions=DEMO_COALITIONS,  # coalition scenarios are always computed from fixtures
            kingmakers=DEMO_KINGMAKERS,
            voting_records=DEMO_VOTING_RECORDS,
            kpis=DEMO_KPIS,
            total_seats=total_seats,
            majority_threshold=majority,
            election_date=elec_date,
            election_type="congreso",
            governing_parties=list(_GOVERNING),
            mode="real",
        )

    except Exception as exc:
        log.warning("electoral overview DB error, returning demo: %s", exc)
        return get_demo_overview()


def simulate_swing(req: SwingSimulateRequest) -> SwingSimResult:
    """Apply a vote swing and return updated seat projections."""
    from services.electoral.electoral_fixtures import DEMO_PARTIES
    from services.electoral.electoral_scoring import swing_seats

    base = req.base_parties or DEMO_PARTIES
    swings_data = [{"party_code": s.party_code, "delta_pct": s.delta_pct} for s in req.swings]
    base_data = [{"code": p.code, "pct_vote": p.pct_vote, "seats": p.seats} for p in base]

    new_seats_map = swing_seats(base_data, swings_data, total_seats=350)

    updated_parties: list[PartyProjection] = []
    seat_changes: dict[str, int] = {}
    for p in base:
        new_s = new_seats_map.get(p.code, p.seats)
        delta = new_s - p.seats
        seat_changes[p.code] = delta
        updated_parties.append(p.model_copy(update={
            "seats": new_s,
            "seats_low": max(0, new_s - 6),
            "seats_high": new_s + 6,
            "seat_trend": "gaining" if delta > 2 else "losing" if delta < -2 else "stable",
        }))

    # Describe coalition impacts
    swing_parties = {s.party_code for s in req.swings}
    coalition_impact = [
        f"Cambios de {', '.join(swing_parties)} afectan viabilidad de bloques izquierda/derecha"
    ]

    return SwingSimResult(
        parties=updated_parties,
        seat_changes=seat_changes,
        coalition_impact=coalition_impact,
    )


def generate_briefing(req: ElectoralBriefingRequest) -> ElectoralBriefingResponse:
    """Generate an electoral briefing; try LLM, fall back to template."""
    try:
        from services.llm_client import chat_completion  # type: ignore[import]
        overview = get_overview()
        prompt = (
            f"Genera un briefing electoral en español sobre: {req.focus}.\n"
            f"Partidos principales: {', '.join(p.code + '(' + str(p.seats) + 'esc)' for p in overview.parties[:6])}.\n"
            f"Coalición actual: {overview.coalitions[0].name if overview.coalitions else 'sin coalición'}.\n"
            f"Contexto adicional: {req.extra_context or 'ninguno'}.\n"
            "Responde en markdown con secciones: ## Situación, ## Riesgos, ## Recomendaciones."
        )
        answer = chat_completion(prompt, max_tokens=600)
        return ElectoralBriefingResponse(
            briefing=answer,
            key_points=["Análisis basado en datos electorales recientes"],
            risk_indicators=["Inestabilidad legislativa", "Posible moción de censura"],
            mode="real",
        )
    except Exception as exc:
        log.warning("Electoral briefing LLM error, returning template: %s", exc)
        return ElectoralBriefingResponse(
            briefing=(
                "## Situación electoral\n\n"
                "El gobierno de coalición PSOE-Sumar opera en minoría con 167 escaños, "
                "a 9 escaños de la mayoría absoluta (176). La estabilidad depende de los "
                "partidos nacionalistas y su capacidad de negociar legislación presupuestaria.\n\n"
                "## Riesgos principales\n\n"
                "- Ruptura de la coalición por tensiones en materia fiscal\n"
                "- Bloqueo presupuestario si Junts o PNV retiran apoyo\n"
                "- Avance del PP en intención de voto (+3pp en últimas encuestas)\n\n"
                "## Recomendaciones estratégicas\n\n"
                "- Monitorizar posicionamiento de Junts en votaciones clave\n"
                "- Activar mesa de negociación con PNV antes de votación de cuentas\n"
                "- Preparar comunicación proactiva sobre logros de legislatura"
            ),
            key_points=[
                "Gobierno en minoría a 9 escaños de mayoría absoluta",
                "PP lidera intención de voto con 33% (+4.9pp vs anterior legislatura)",
                "Junts y PNV son kingmakers en cualquier escenario de investidura",
            ],
            risk_indicators=[
                "Inestabilidad presupuestaria alta",
                "Riesgo de elecciones anticipadas moderado",
            ],
            mode="demo",
        )
