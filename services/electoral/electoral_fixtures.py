"""Demo fixtures for the electoral intelligence module."""
from __future__ import annotations
import math

from api.schemas.electoral import (
    PartyProjection, CoalitionScenarioRich, KingmakerParty,
    VotingRecord, ElectoralKpiItem, ElectoralOverviewResponse,
    HemicycleSeat, SwingSimResult,
)


# ── Party projections ─────────────────────────────────────────────────────────

DEMO_PARTIES: list[PartyProjection] = [
    PartyProjection(code="PP",    name="Partido Popular",           seats=137, seats_low=128, seats_high=146, pct_vote=33.0, pct_vote_prev=28.1, seat_trend="gaining", color="#1F77FF", ideology_score=6.8, is_governing=False, bloc="right"),
    PartyProjection(code="PSOE",  name="Partido Socialista",        seats=121, seats_low=112, seats_high=130, pct_vote=31.7, pct_vote_prev=29.0, seat_trend="stable",  color="#E03A3E", ideology_score=3.8, is_governing=True,  bloc="left"),
    PartyProjection(code="VOX",   name="VOX",                       seats=33,  seats_low=28,  seats_high=40,  pct_vote=12.4, pct_vote_prev=15.1, seat_trend="losing",  color="#5BC035", ideology_score=9.1, is_governing=False, bloc="right"),
    PartyProjection(code="Sumar", name="Sumar",                     seats=27,  seats_low=22,  seats_high=32,  pct_vote=12.3, pct_vote_prev=None,  seat_trend="stable",  color="#D81E5B", ideology_score=1.8, is_governing=True,  bloc="left"),
    PartyProjection(code="Junts", name="Junts per Catalunya",       seats=7,   seats_low=5,   seats_high=9,   pct_vote=1.6,  pct_vote_prev=1.8,  seat_trend="stable",  color="#00C2A8", ideology_score=5.0, is_governing=False, bloc="nationalist"),
    PartyProjection(code="ERC",   name="Esquerra Republicana",      seats=7,   seats_low=5,   seats_high=9,   pct_vote=2.0,  pct_vote_prev=3.6,  seat_trend="losing",  color="#F4B400", ideology_score=2.5, is_governing=False, bloc="nationalist"),
    PartyProjection(code="Bildu", name="EH Bildu",                  seats=6,   seats_low=5,   seats_high=8,   pct_vote=1.4,  pct_vote_prev=1.0,  seat_trend="gaining", color="#A4D65E", ideology_score=1.5, is_governing=False, bloc="left"),
    PartyProjection(code="PNV",   name="PNV",                       seats=5,   seats_low=4,   seats_high=7,   pct_vote=1.0,  pct_vote_prev=1.2,  seat_trend="stable",  color="#1D8042", ideology_score=5.5, is_governing=False, bloc="nationalist"),
    PartyProjection(code="BNG",   name="BNG",                       seats=1,   seats_low=1,   seats_high=2,   pct_vote=0.6,  pct_vote_prev=0.4,  seat_trend="gaining", color="#7AC143", ideology_score=2.0, is_governing=False, bloc="nationalist"),
    PartyProjection(code="Otros", name="Otros",                     seats=6,   seats_low=4,   seats_high=8,   pct_vote=3.0,  pct_vote_prev=3.0,  seat_trend="stable",  color="#94A3B8", ideology_score=5.0, is_governing=False, bloc=None),
]

# ── Coalitions ────────────────────────────────────────────────────────────────

DEMO_COALITIONS: list[CoalitionScenarioRich] = [
    CoalitionScenarioRich(
        id="c1", name="Gobierno de progreso (actual)",
        members=["PSOE", "Sumar", "ERC", "Bildu", "PNV", "BNG"],
        total_seats=167, majority_threshold=176, has_majority=False,
        probability=62, stability_score=41, ideological_distance=32,
        conflicts=["Memoria democrática", "Financiación CCAA", "Amnistía"],
        enablers=["Política social", "Transición ecológica"],
        scenario_type="minority_govt", seats_above_majority=-9,
    ),
    CoalitionScenarioRich(
        id="c2", name="Bloque de derechas PP+VOX",
        members=["PP", "VOX"],
        total_seats=170, majority_threshold=176, has_majority=False,
        probability=71, stability_score=48, ideological_distance=28,
        conflicts=["Política UE", "Agenda climática", "Política exterior"],
        enablers=["Seguridad", "Economía liberal", "Inmigración"],
        scenario_type="minority_govt", seats_above_majority=-6,
    ),
    CoalitionScenarioRich(
        id="c3", name="Investidura con Junts (progreso ampliado)",
        members=["PSOE", "Sumar", "Junts", "ERC", "PNV", "Bildu"],
        total_seats=173, majority_threshold=176, has_majority=False,
        probability=48, stability_score=28, ideological_distance=52,
        conflicts=["Catalunya independencia", "Reforma fiscal", "Estado federal"],
        enablers=["Inversión territorial", "Autogobierno"],
        scenario_type="minority_govt", seats_above_majority=-3,
    ),
    CoalitionScenarioRich(
        id="c4", name="Gran coalición PP+PSOE",
        members=["PP", "PSOE"],
        total_seats=258, majority_threshold=176, has_majority=True,
        probability=12, stability_score=35, ideological_distance=30,
        conflicts=["Incompatibilidad política", "Bases electorales contrarias"],
        enablers=["Estabilidad institucional", "Reforma constitucional"],
        scenario_type="grand_coalition", seats_above_majority=82,
    ),
]

# ── Kingmakers ────────────────────────────────────────────────────────────────

DEMO_KINGMAKERS: list[KingmakerParty] = [
    KingmakerParty(code="Junts", name="Junts per Catalunya", seats=7, color="#00C2A8",
                   coalition_appearances=2, leverage_score=78,
                   key_demands=["Amnistía total", "Referéndum acordado", "Financiación singular"],
                   compatible_blocs=["left", "nationalist"]),
    KingmakerParty(code="PNV",   name="PNV",                seats=5, color="#1D8042",
                   coalition_appearances=3, leverage_score=65,
                   key_demands=["Transferencias pendientes", "Concierto económico", "Cupo vasco"],
                   compatible_blocs=["left", "nationalist", "center"]),
    KingmakerParty(code="ERC",   name="ERC",                seats=7, color="#F4B400",
                   coalition_appearances=2, leverage_score=55,
                   key_demands=["Referéndum vinculante", "Inversión ferroviaria", "Lengua"],
                   compatible_blocs=["left", "nationalist"]),
]

# ── Voting records ─────────────────────────────────────────────────────────────

DEMO_VOTING_RECORDS: list[VotingRecord] = [
    VotingRecord(id="v1", topic="Reforma fiscal progresiva", date="2026-03-15",
                 votes={"PSOE":"S","PP":"N","VOX":"N","Sumar":"S","Junts":"A","ERC":"S","Bildu":"S","PNV":"A"},
                 result="rejected", category="fiscal"),
    VotingRecord(id="v2", topic="Ley de Vivienda", date="2026-02-28",
                 votes={"PSOE":"S","PP":"N","VOX":"N","Sumar":"S","Junts":"N","ERC":"S","Bildu":"S","PNV":"S"},
                 result="approved", category="social"),
    VotingRecord(id="v3", topic="RDL Fondos UE Next Generation", date="2026-01-20",
                 votes={"PSOE":"S","PP":"A","VOX":"N","Sumar":"S","Junts":"S","ERC":"S","Bildu":"S","PNV":"S"},
                 result="approved", category="economic"),
    VotingRecord(id="v4", topic="Ley de Memoria Democrática", date="2025-12-10",
                 votes={"PSOE":"S","PP":"N","VOX":"N","Sumar":"S","Junts":"A","ERC":"S","Bildu":"S","PNV":"S"},
                 result="approved", category="social"),
    VotingRecord(id="v5", topic="Presupuestos Generales 2026", date="2026-04-01",
                 votes={"PSOE":"S","PP":"N","VOX":"N","Sumar":"S","Junts":"N","ERC":"N","Bildu":"A","PNV":"A"},
                 result="rejected", category="fiscal"),
    VotingRecord(id="v6", topic="Defensa y OTAN 2% PIB", date="2026-03-05",
                 votes={"PSOE":"S","PP":"S","VOX":"S","Sumar":"N","Junts":"A","ERC":"N","Bildu":"N","PNV":"S"},
                 result="approved", category="defense"),
    VotingRecord(id="v7", topic="Salario Mínimo Interprofesional", date="2026-02-10",
                 votes={"PSOE":"S","PP":"N","VOX":"N","Sumar":"S","Junts":"A","ERC":"S","Bildu":"S","PNV":"S"},
                 result="approved", category="labor"),
    VotingRecord(id="v8", topic="Ley de Amnistía", date="2026-01-15",
                 votes={"PSOE":"S","PP":"N","VOX":"N","Sumar":"S","Junts":"S","ERC":"S","Bildu":"S","PNV":"A"},
                 result="approved", category="constitutional"),
    VotingRecord(id="v9", topic="Reforma laboral (reversión parcial)", date="2025-11-20",
                 votes={"PSOE":"S","PP":"N","VOX":"N","Sumar":"S","Junts":"N","ERC":"S","Bildu":"S","PNV":"N"},
                 result="rejected", category="labor"),
    VotingRecord(id="v10", topic="Sanidad pública (inversión CCAA)", date="2025-10-30",
                 votes={"PSOE":"S","PP":"A","VOX":"N","Sumar":"S","Junts":"S","ERC":"S","Bildu":"S","PNV":"S"},
                 result="approved", category="health"),
]

# ── KPIs ──────────────────────────────────────────────────────────────────────

DEMO_KPIS: list[ElectoralKpiItem] = [
    ElectoralKpiItem(label="Escaños PP (lider)", value=137, unit="diputados", color="text-blue1", trend="+9"),
    ElectoralKpiItem(label="Prob. estabilidad gobierno", value=41, unit="%", color="text-amber1", trend="-4"),
    ElectoralKpiItem(label="Distancia mayoría", value=9, unit="escaños", color="text-red1", trend="-2"),
    ElectoralKpiItem(label="Kingmakers activos", value=3, unit="partidos", color="text-cyan1", trend="stable"),
]


# ── Hemicycle seat builder ────────────────────────────────────────────────────

def build_hemicycle(parties: list[PartyProjection], total_seats: int = 350) -> list[HemicycleSeat]:
    """
    Build 350 HemicycleSeat objects arranged in 8 concentric semicircular rings.
    Parties ordered left-to-right by ideology_score.
    """
    IDEO_ORDER = ["Sumar", "Bildu", "ERC", "BNG", "PSOE", "PNV", "Junts", "Otros", "PP", "VOX"]
    sorted_parties = sorted(parties, key=lambda p: (
        IDEO_ORDER.index(p.code) if p.code in IDEO_ORDER else 99
    ))

    # Build colour sequence
    colors: list[tuple[str, str]] = []  # (party_code, color)
    for p in sorted_parties:
        for _ in range(p.seats):
            colors.append((p.code, p.color))
    while len(colors) < total_seats:
        colors.append(("Otros", "#94A3B8"))

    # Ring seat distribution (weighted: outer rings get more seats)
    rings = 8
    cx, cy = 250.0, 230.0
    total_weight = sum(range(1, rings + 1))
    ring_counts: list[int] = []
    for r in range(rings):
        ring_counts.append(round(((r + 1) / total_weight) * total_seats))
    diff = total_seats - sum(ring_counts)
    ring_counts[-1] += diff

    seats: list[HemicycleSeat] = []
    idx = 0
    for r, count in enumerate(ring_counts):
        radius = 70.0 + r * 22.0
        for s in range(count):
            angle = math.pi - (s / max(count - 1, 1)) * math.pi
            x = cx + radius * math.cos(angle)
            y = cy - radius * math.sin(angle)
            party_code, color = colors[idx] if idx < len(colors) else ("Otros", "#94A3B8")
            seats.append(HemicycleSeat(idx=idx, ring=r, position=s, party_code=party_code, color=color, x=round(x, 2), y=round(y, 2)))
            idx += 1
    return seats


def get_demo_overview() -> ElectoralOverviewResponse:
    """Return the full demo ElectoralOverviewResponse."""
    return ElectoralOverviewResponse(
        parties=DEMO_PARTIES,
        coalitions=DEMO_COALITIONS,
        kingmakers=DEMO_KINGMAKERS,
        voting_records=DEMO_VOTING_RECORDS,
        kpis=DEMO_KPIS,
        total_seats=350,
        majority_threshold=176,
        election_date=None,
        election_type="congreso",
        governing_parties=["PSOE", "Sumar"],
        mode="demo",
    )
