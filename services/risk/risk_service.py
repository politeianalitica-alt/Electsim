# services/risk/risk_service.py
"""
Main orchestrator for the Risk & Crisis Intelligence domain.
Tries DB → falls back to fixtures on any exception.
"""
from __future__ import annotations

import os
from typing import Optional

from api.schemas.risk import (
    RiskOverviewResponse, RiskSignalsResponse,
    RiskAnalysisRequest, RiskAnalysisResponse,
    RiskSignal,
)
from services.risk.risk_fixtures import (
    get_demo_overview, get_demo_signals,
    DEMO_SPARK, DEMO_DIMENSIONS,
)
from services.risk.risk_scoring import (
    score_signal, severity_from_score, global_score_from_dimensions,
    trend_from_delta, indicator_status_from_score,
)

_DSN = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")


def _fetch_spark(dsn: str) -> list[int]:
    """Fetch 30-day risk sparkline from signal_politeia."""
    import psycopg2
    from datetime import date, timedelta
    from statistics import median

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT DATE(created_at)::text, COUNT(*) AS n, AVG(urgencia)::float AS avg_u
                   FROM signal_politeia
                   WHERE created_at >= NOW() - INTERVAL '30 days'
                   GROUP BY DATE(created_at) ORDER BY DATE(created_at)"""
            )
            rows = cur.fetchall()

    if not rows:
        return DEMO_SPARK

    day_scores: dict[str, int] = {}
    for row in rows:
        n = float(row[1])
        avg_u = float(row[2]) if row[2] is not None else 1.0
        day_scores[str(row[0])] = int(min(round(n * avg_u * 2.5), 100))

    median_val = int(median(day_scores.values())) if day_scores else 50
    today = date.today()
    return [day_scores.get((today - timedelta(days=i)).isoformat(), median_val) for i in range(29, -1, -1)]


def get_overview() -> RiskOverviewResponse:
    """Full risk overview with DB fallback."""
    try:
        import psycopg2
        with psycopg2.connect(_DSN) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM signal_politeia WHERE created_at >= NOW() - INTERVAL '24 hours' AND urgencia >= 4"
                )
                n_criticas = (cur.fetchone() or [0])[0] or 0

                cur.execute(
                    "SELECT COUNT(*) FROM legislation WHERE published_at >= NOW() - INTERVAL '7 days' AND ai_impact_level = 'high'"
                )
                n_leyes = (cur.fetchone() or [0])[0] or 0

                cur.execute(
                    "SELECT AVG(sentimiento_actual) FROM persona_publica WHERE activo = TRUE AND tipo = 'politico'"
                )
                sent_row = cur.fetchone()
                sent_medio = float((sent_row or [None])[0] or 0.0)

        dim_scores = {
            "legislative": int(min(n_leyes * 8, 100)),
            "media": int((1.0 - max(sent_medio, -1.0)) * 50),
            "coalition": 70,
            "actors": int(min(n_criticas * 5, 80)),
            "economic": 45,
            "geopolitical": 65,
            "territorial": 60,
            "system": 40,
        }
        global_score = global_score_from_dimensions(dim_scores)
        if global_score == 0:
            return get_demo_overview()

        spark = _fetch_spark(_DSN)
        trend_delta = global_score - (spark[-2] if len(spark) >= 2 else global_score)
        level = severity_from_score(global_score)

        from api.schemas.risk import RiskKpiItem
        kpis = [
            RiskKpiItem(label="Score global", value=global_score, color="amber" if global_score < 75 else "red", delta=trend_delta),
            RiskKpiItem(label="Crisis activas", value=min(n_criticas, 10), color="red"),
            RiskKpiItem(label="Señales críticas", value=min(int(n_leyes), 20), color="red"),
            RiskKpiItem(label="Indicadores en verde", value=3, color="green"),
        ]
        return RiskOverviewResponse(
            global_score=global_score, level=level,
            trend=trend_from_delta(trend_delta), trend_delta=trend_delta,
            kpis=kpis, dimensions=DEMO_DIMENSIONS,
            crisis_signals=[], top_signals=[], early_warnings=[],
            spark=spark, mode="real",
        )
    except Exception:
        return get_demo_overview()


def get_signals(
    domain: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 20,
) -> RiskSignalsResponse:
    """Get risk signals with optional filters."""
    try:
        import psycopg2
        conditions = ["created_at >= NOW() - INTERVAL '30 days'"]
        params: list = []
        if severity and severity in ("critical", "high"):
            conditions.append("urgencia >= 4")
        where = " AND ".join(conditions)
        with psycopg2.connect(_DSN) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""SELECT id::text, titulo, descripcion, urgencia, created_at::text
                        FROM signal_politeia WHERE {where}
                        ORDER BY urgencia DESC NULLS LAST, created_at DESC LIMIT %s""",
                    params + [limit],
                )
                rows = cur.fetchall()

        if not rows:
            return get_demo_signals(domain, severity, limit)

        signals = [
            RiskSignal(
                signal_id=str(r[0]), title=r[1] or "",
                description=r[2] or "",
                domain="legislative",
                severity=severity_from_score(int(min(float(r[3] or 1) * 20, 100))),
                probability=int(min(float(r[3] or 1) * 20, 100)),
                impact=int(min(float(r[3] or 1) * 20, 100)),
                created_at=str(r[4]) if r[4] else "", mode="real",
            )
            for r in rows
        ]
        return RiskSignalsResponse(signals=signals, total=len(signals), domain=domain, severity=severity, mode="real")
    except Exception:
        return get_demo_signals(domain, severity, limit)


def analyze_risk(req: RiskAnalysisRequest) -> RiskAnalysisResponse:
    """LLM-powered risk analysis. Falls back to demo."""
    overview = get_overview()

    try:
        from services.llm_client import chat_completion  # type: ignore
        system = (
            "Eres Politeia Brain, analista senior de riesgos políticos españoles. "
            "Analiza con rigor y objetividad. Responde en español, máximo 300 palabras. "
            "Proporciona análisis concreto con recomendaciones accionables."
        )
        ctx = (
            f"Score de riesgo global: {overview.global_score}/100 (nivel: {overview.level})\n"
            f"Tendencia: {overview.trend} ({overview.trend_delta:+d} puntos)\n"
            f"Horizonte temporal: {req.time_horizon}\n"
            f"Dominio de interés: {req.domain or 'todos'}\n"
        )
        if req.context:
            ctx += f"Contexto adicional: {req.context}\n"

        answer = chat_completion(system=system, user=f"{ctx}\n\nPregunta: {req.question}")
        return RiskAnalysisResponse(
            question=req.question, answer=answer,
            global_score=overview.global_score,
            key_risks=[s.title for s in overview.top_signals[:3]],
            recommendations=[],
            model_used="politeia-brain", mode="real",
        )
    except Exception:
        top_risks = [s.title for s in overview.top_signals[:3]]
        answer = (
            f"[Demo] Score de riesgo: {overview.global_score}/100. "
            f"Principales riesgos: {', '.join(top_risks) if top_risks else 'Ver panel de señales'}. "
            "Para análisis detallado se requiere el módulo Brain activo."
        )
        return RiskAnalysisResponse(
            question=req.question, answer=answer,
            global_score=overview.global_score,
            key_risks=top_risks,
            recommendations=["Monitorizar coalición de gobierno", "Seguir trámites legislativos urgentes"],
            model_used="demo", mode="demo",
        )
