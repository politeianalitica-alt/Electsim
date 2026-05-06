# services/risk/risk_fixtures.py
"""
Rich demo fixtures for the Risk & Crisis Intelligence module.
All items use mode="demo".
"""
from __future__ import annotations
from api.schemas.risk import (
    RiskDimension, RiskDriver, RiskEvidence, RiskSignal, CrisisSignal,
    EarlyWarningIndicator, RiskScenario, RiskTimelinePoint,
    RiskKpiItem, RiskOverviewResponse, RiskSignalsResponse,
)

# ── Dimensions ────────────────────────────────────────────────────
DEMO_DIMENSIONS: list[RiskDimension] = [
    RiskDimension(
        domain="legislative", label="Riesgo Legislativo", score=68, weight=0.18,
        trend="rising", velocity="moderate", severity="high",
        drivers=[
            RiskDriver(label="Iniciativas en tramitación urgente", contribution=45, trend="rising"),
            RiskDriver(label="BOE: decretos de urgencia", contribution=30, trend="stable"),
        ],
        evidence=[RiskEvidence(source="Congreso.es", excerpt="9 iniciativas en tramitación urgente", date="2026-05-05", confidence=0.9)],
        mode="demo",
    ),
    RiskDimension(
        domain="media", label="Riesgo Mediático", score=61, weight=0.18,
        trend="stable", velocity="moderate", severity="high",
        drivers=[
            RiskDriver(label="Narrativas negativas hacia gobierno", contribution=52, trend="rising"),
            RiskDriver(label="Cobertura de corrupción", contribution=28, trend="stable"),
        ],
        mode="demo",
    ),
    RiskDimension(
        domain="coalition", label="Riesgo de Coalición", score=74, weight=0.15,
        trend="rising", velocity="fast", severity="high",
        drivers=[
            RiskDriver(label="Tensión PSOE-Sumar por política laboral", contribution=48, trend="rising"),
            RiskDriver(label="Dependencia de Junts para mayorías", contribution=36, trend="rising"),
        ],
        evidence=[RiskEvidence(source="El País", excerpt="Cuarta crisis de coalición en 2026", date="2026-05-04", confidence=0.88)],
        mode="demo",
    ),
    RiskDimension(
        domain="actors", label="Riesgo de Actores", score=55, weight=0.12,
        trend="stable", velocity="slow", severity="medium",
        drivers=[
            RiskDriver(label="Aprobación presidencial en mínimos", contribution=40, trend="falling"),
            RiskDriver(label="Fragmentación liderazgo oposición", contribution=25, trend="stable"),
        ],
        mode="demo",
    ),
    RiskDimension(
        domain="economic", label="Riesgo Económico", score=48, weight=0.12,
        trend="stable", velocity="slow", severity="medium",
        drivers=[
            RiskDriver(label="Déficit presupuestario creciente", contribution=38, trend="rising"),
            RiskDriver(label="Inflación moderada persistente", contribution=22, trend="stable"),
        ],
        mode="demo",
    ),
    RiskDimension(
        domain="geopolitical", label="Riesgo Geopolítico", score=72, weight=0.10,
        trend="rising", velocity="fast", severity="high",
        drivers=[
            RiskDriver(label="Aranceles UE-EEUU impacto España", contribution=44, trend="rising"),
            RiskDriver(label="Sáhara Occidental tensión bilateral", contribution=30, trend="stable"),
        ],
        mode="demo",
    ),
    RiskDimension(
        domain="territorial", label="Riesgo Territorial", score=63, weight=0.07,
        trend="stable", velocity="slow", severity="high",
        drivers=[
            RiskDriver(label="Tensión financiación autonómica", contribution=50, trend="rising"),
            RiskDriver(label="Movimiento independentista catalán", contribution=35, trend="stable"),
        ],
        mode="demo",
    ),
    RiskDimension(
        domain="system", label="Riesgo Sistémico", score=42, weight=0.08,
        trend="falling", velocity="slow", severity="medium",
        drivers=[
            RiskDriver(label="Desconfianza institucional", contribution=45, trend="stable"),
            RiskDriver(label="Polarización electoral", contribution=35, trend="falling"),
        ],
        mode="demo",
    ),
]

# ── KPIs ──────────────────────────────────────────────────────────
DEMO_KPIS: list[RiskKpiItem] = [
    RiskKpiItem(label="Score global", value=67, color="amber", delta=3, trend="rising"),
    RiskKpiItem(label="Crisis activas", value=3, color="red", delta=1, trend="rising"),
    RiskKpiItem(label="Señales críticas", value=8, color="red", delta=2, trend="rising"),
    RiskKpiItem(label="Indicadores en verde", value=4, color="green", delta=-1, trend="falling"),
]

# ── Crisis signals ────────────────────────────────────────────────
DEMO_CRISIS: list[CrisisSignal] = [
    CrisisSignal(
        crisis_id="cr01", title="Ruptura de coalición de gobierno",
        description="Tensiones entre PSOE y Sumar por la reforma laboral podrían desencadenar crisis de gobierno en menos de 30 días.",
        severity="critical", probability=42,
        domains_affected=["coalition", "legislative", "actors"],
        time_to_impact="2-4 semanas",
        recommended_action="Monitorizar votaciones en Congreso y declaraciones de Yolanda Díaz.",
        evidence_count=12,
    ),
    CrisisSignal(
        crisis_id="cr02", title="Bloqueo presupuestario 2027",
        description="Sin mayoría estable, la aprobación de los PGE 2027 es incierta. Riesgo de prórroga presupuestaria.",
        severity="high", probability=68,
        domains_affected=["legislative", "economic", "coalition"],
        time_to_impact="3-6 meses",
        recommended_action="Seguir negociaciones con partidos minoritarios en Comisión de Hacienda.",
        evidence_count=8,
    ),
    CrisisSignal(
        crisis_id="cr03", title="Escalada aranceles UE-EEUU",
        description="Posibles aranceles del 25% sobre exportaciones españolas clave (automoción, agroalimentario).",
        severity="high", probability=55,
        domains_affected=["economic", "geopolitical"],
        time_to_impact="1-3 meses",
        recommended_action="Monitorizar negociaciones Comisión Europea con Administración Trump.",
        evidence_count=6,
    ),
]

# ── Top risk signals ──────────────────────────────────────────────
DEMO_SIGNALS: list[RiskSignal] = [
    RiskSignal(
        signal_id="sg01", title="Fractura pacto de investidura",
        description="Tensiones crecientes entre socios de gobierno amenazan estabilidad legislativa.",
        domain="coalition", severity="critical", probability=68, impact=82,
        velocity="fast", time_horizon="30d",
        actors_involved=["Pedro Sánchez", "Yolanda Díaz", "Carles Puigdemont"],
        created_at="2026-05-05", mode="demo",
    ),
    RiskSignal(
        signal_id="sg02", title="Caso judicial contra ministro",
        description="Nueva causa en Tribunal Supremo contra miembro del ejecutivo por presunta corrupción.",
        domain="actors", severity="high", probability=55, impact=71,
        velocity="moderate", time_horizon="7d",
        created_at="2026-05-04", mode="demo",
    ),
    RiskSignal(
        signal_id="sg03", title="Reforma laboral bloqueada",
        description="La reforma de la jornada laboral de 37.5h no obtiene mayoría en votación del Congreso.",
        domain="legislative", severity="high", probability=61, impact=64,
        velocity="moderate", time_horizon="7d",
        created_at="2026-05-03", mode="demo",
    ),
    RiskSignal(
        signal_id="sg04", title="Narrativa anti-amnistía en alza",
        description="Medios conservadores amplifican relato sobre inconstitucionalidad de la Ley de Amnistía.",
        domain="media", severity="medium", probability=74, impact=58,
        velocity="fast", time_horizon="24h",
        created_at="2026-05-05", mode="demo",
    ),
    RiskSignal(
        signal_id="sg05", title="Tensión Madrid-Estado por financiación",
        description="Ayuso amenaza con recurso al TC si avanza el modelo de financiación singular para Cataluña.",
        domain="territorial", severity="high", probability=58, impact=69,
        velocity="slow", time_horizon="30d",
        created_at="2026-05-02", mode="demo",
    ),
]

# ── Early warning indicators ──────────────────────────────────────
DEMO_WARNINGS: list[EarlyWarningIndicator] = [
    EarlyWarningIndicator(
        indicator_id="ew01", label="Tensión de coalición", status="red",
        value=74, threshold=60, domain="coalition",
        description="Índice de cohesión intrapartidista y tensión entre socios.",
        trend="rising", last_updated="2026-05-05",
    ),
    EarlyWarningIndicator(
        indicator_id="ew02", label="Aprobación presidencial", status="red",
        value=38, threshold=40, domain="actors",
        description="Aprobación pública del Presidente del Gobierno.",
        trend="falling", last_updated="2026-05-04",
    ),
    EarlyWarningIndicator(
        indicator_id="ew03", label="Iniciativas urgentes BOE", status="yellow",
        value=55, threshold=50, domain="legislative",
        description="Volumen de RDLs y trámites de urgencia en el Congreso.",
        trend="rising", last_updated="2026-05-05",
    ),
    EarlyWarningIndicator(
        indicator_id="ew04", label="Sentimiento mediático", status="yellow",
        value=42, threshold=50, domain="media",
        description="Índice de sentimiento positivo hacia el gobierno en medios nacionales.",
        trend="falling", last_updated="2026-05-05",
    ),
    EarlyWarningIndicator(
        indicator_id="ew05", label="Riesgo geopolítico exterior", status="yellow",
        value=65, threshold=60, domain="geopolitical",
        description="Score agregado de tensiones exteriores con impacto en España.",
        trend="rising", last_updated="2026-05-05",
    ),
    EarlyWarningIndicator(
        indicator_id="ew06", label="Deuda pública / PIB", status="green",
        value=35, threshold=60, domain="economic",
        description="Ratio deuda-PIB normalizado (0=óptimo, 100=crisis).",
        trend="stable", last_updated="2026-05-01",
    ),
]

# ── Spark (30-day history) ────────────────────────────────────────
DEMO_SPARK: list[int] = [
    52, 55, 51, 58, 60, 57, 63, 61, 66, 64,
    62, 67, 65, 68, 70, 67, 72, 69, 74, 71,
    73, 75, 72, 76, 74, 71, 68, 72, 74, 67,
]

# ── Scenarios ─────────────────────────────────────────────────────
DEMO_SCENARIOS: list[RiskScenario] = [
    RiskScenario(
        scenario_id="sc01", title="Crisis de gobierno antes del verano",
        description="Ruptura de la coalición por acumulación de tensiones en reforma laboral y presupuestos.",
        probability=35, impact=90, time_horizon="30d", risk_score=68,
        domains=["coalition", "legislative"],
        triggers=["Derrota en votación presupuestaria", "Dimisión de ministro Sumar"],
        mitigations=["Acuerdo parcial en reforma laboral", "Reunión de urgencia de la coalición"],
    ),
    RiskScenario(
        scenario_id="sc02", title="Elecciones anticipadas en otoño 2026",
        description="Convocatoria de elecciones generales anticipadas si no se estabiliza la coalición.",
        probability=28, impact=95, time_horizon="90d", risk_score=72,
        domains=["coalition", "actors", "legislative"],
        triggers=["Moción de censura", "Pérdida de mayoría presupuestaria"],
        mitigations=["Nuevo acuerdo con Junts", "Renovación del equipo ministerial"],
    ),
    RiskScenario(
        scenario_id="sc03", title="Impacto aranceles EEUU en sector agroalimentario",
        description="Aranceles del 25% sobre exportaciones españolas causan recesión sectorial.",
        probability=48, impact=72, time_horizon="90d", risk_score=61,
        domains=["economic", "geopolitical"],
        triggers=["Fracaso negociación UE-EEUU", "Represalia comercial"],
        mitigations=["Diversificación mercados exportadores", "Fondo compensatorio EU"],
    ),
]

# ── Timeline ──────────────────────────────────────────────────────
DEMO_TIMELINE: list[RiskTimelinePoint] = [
    RiskTimelinePoint(date="2026-05-05", score=67, event="Tensión coalición: voto reforma laboral", severity="high"),
    RiskTimelinePoint(date="2026-05-01", score=64, event=None, severity="medium"),
    RiskTimelinePoint(date="2026-04-25", score=71, event="Caso judicial contra ministro", severity="high"),
    RiskTimelinePoint(date="2026-04-20", score=68, event=None, severity="medium"),
    RiskTimelinePoint(date="2026-04-15", score=74, event="Anuncio aranceles EEUU", severity="critical"),
    RiskTimelinePoint(date="2026-04-10", score=65, event=None, severity="medium"),
    RiskTimelinePoint(date="2026-04-05", score=62, event="Acuerdo parcial reforma laboral", severity="medium"),
    RiskTimelinePoint(date="2026-04-01", score=59, event=None, severity="medium"),
]


def get_demo_overview() -> RiskOverviewResponse:
    return RiskOverviewResponse(
        global_score=67, level="high", trend="rising", trend_delta=3,
        kpis=DEMO_KPIS,
        dimensions=DEMO_DIMENSIONS,
        crisis_signals=DEMO_CRISIS,
        top_signals=DEMO_SIGNALS[:4],
        early_warnings=DEMO_WARNINGS,
        spark=DEMO_SPARK,
        mode="demo",
    )


def get_demo_signals(
    domain: str | None = None,
    severity: str | None = None,
    limit: int = 20,
) -> RiskSignalsResponse:
    signals = list(DEMO_SIGNALS)
    if domain:
        signals = [s for s in signals if s.domain == domain]
    if severity:
        signals = [s for s in signals if s.severity == severity]
    return RiskSignalsResponse(
        signals=signals[:limit], total=len(signals),
        domain=domain, severity=severity, mode="demo",
    )
