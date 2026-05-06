from __future__ import annotations

import logging
import os

from fastapi import APIRouter

from api.schemas.coalition import CoalitionOverview, CoalitionScenario, PartySeatItem

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/coalition", tags=["coalition"])

_PARTY_COLORS: dict[str, str] = {
    "PP": "#1F77FF", "PSOE": "#E03A3E", "VOX": "#5BC035",
    "Sumar": "#D81E5B", "Junts": "#00C2A8", "ERC": "#F4B400",
    "Bildu": "#A4D65E", "PNV": "#1D8042", "BNG": "#7AC143",
    "Otros": "#94A3B8", "Cs": "#F97316", "UP": "#6B21A8",
}
_DEFAULT_COLOR = "#94A3B8"

_FALLBACK_PARTIES: list[PartySeatItem] = [
    PartySeatItem(code="PP",    name="Partido Popular",              seats=137, color="#1F77FF", pct_vote=33.0),
    PartySeatItem(code="PSOE",  name="Partido Socialista",           seats=121, color="#E03A3E", pct_vote=31.7),
    PartySeatItem(code="VOX",   name="VOX",                          seats=33,  color="#5BC035", pct_vote=12.4),
    PartySeatItem(code="Sumar", name="Sumar",                        seats=27,  color="#D81E5B", pct_vote=12.3),
    PartySeatItem(code="Junts", name="Junts per Catalunya",          seats=7,   color="#00C2A8", pct_vote=1.6),
    PartySeatItem(code="ERC",   name="Esquerra Republicana",         seats=7,   color="#F4B400", pct_vote=2.0),
    PartySeatItem(code="Bildu", name="EH Bildu",                     seats=6,   color="#A4D65E", pct_vote=1.4),
    PartySeatItem(code="PNV",   name="Partido Nacionalista Vasco",   seats=5,   color="#1D8042", pct_vote=1.0),
    PartySeatItem(code="BNG",   name="Bloque Nacionalista Galego",   seats=1,   color="#7AC143", pct_vote=0.6),
    PartySeatItem(code="Otros", name="Otros",                        seats=6,   color="#94A3B8", pct_vote=3.0),
]

_KNOWN_SCENARIOS: list[dict] = [
    {"members": ["PSOE", "Sumar", "ERC", "Bildu", "PNV", "BNG"], "distance": 28, "probability": 62, "conflicts": ["Memoria democrática", "Financiación CCAA"]},
    {"members": ["PP", "VOX"], "distance": 18, "probability": 71, "conflicts": ["Política UE", "Agenda climática"]},
    {"members": ["PSOE", "Sumar", "Junts", "ERC", "PNV", "Bildu"], "distance": 38, "probability": 48, "conflicts": ["Catalunya independencia", "Reforma fiscal"]},
    {"members": ["PP", "VOX", "Junts"], "distance": 52, "probability": 22, "conflicts": ["Idioma", "Inmigración", "Modelo Estado"]},
    {"members": ["PP", "PSOE"], "distance": 45, "probability": 12, "conflicts": ["Coalición improbable", "Bloqueo electoral"]},
]


def _build_coalitions(parties: list[PartySeatItem], majority_threshold: int) -> list[CoalitionScenario]:
    seat_map = {p.code: p.seats for p in parties}
    coalitions: list[CoalitionScenario] = []
    for scenario in _KNOWN_SCENARIOS:
        members: list[str] = scenario["members"]
        total = sum(seat_map.get(m, 0) for m in members)
        coalitions.append(
            CoalitionScenario(
                members=members,
                total=total,
                majority=total >= majority_threshold,
                distance=scenario["distance"],
                probability=scenario["probability"],
                conflicts=scenario["conflicts"],
            )
        )
    coalitions.sort(key=lambda c: c.probability, reverse=True)
    return coalitions


def _demo_overview() -> CoalitionOverview:
    return CoalitionOverview(
        parties=_FALLBACK_PARTIES,
        coalitions=_build_coalitions(_FALLBACK_PARTIES, 176),
        election_date=None,
        total_seats=350,
        majority_threshold=176,
        mode="demo",
    )


@router.get("/overview", response_model=CoalitionOverview)
def get_coalition_overview() -> CoalitionOverview:
    try:
        import psycopg2

        dsn = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, fecha::text FROM elecciones WHERE tipo = 'congreso' ORDER BY fecha DESC LIMIT 1"
                )
                elec_row = cur.fetchone()
                if not elec_row:
                    raise ValueError("No elections in DB")
                elec_id, elec_date = elec_row

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
                seat_rows = cur.fetchall()
                if not seat_rows:
                    raise ValueError("No seat data")

        parties: list[PartySeatItem] = [
            PartySeatItem(
                code=siglas,
                name=nombre,
                seats=escanos,
                color=_PARTY_COLORS.get(siglas, _DEFAULT_COLOR),
                pct_vote=round(pct or 0.0, 2),
            )
            for siglas, nombre, escanos, pct in seat_rows
        ]
        total_seats = sum(p.seats for p in parties)
        majority = (total_seats // 2) + 1
        return CoalitionOverview(
            parties=parties,
            coalitions=_build_coalitions(parties, majority),
            election_date=elec_date,
            total_seats=total_seats,
            majority_threshold=majority,
            mode="real",
        )

    except Exception as exc:
        log.warning("coalition overview DB error, returning demo: %s", exc)
        return _demo_overview()
