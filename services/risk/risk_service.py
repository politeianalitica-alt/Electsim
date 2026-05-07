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
    """Full risk overview from informes_riesgo_politico + alertas_sistema."""
    import os
    from sqlalchemy import create_engine, text as sqla_text
    dsn = os.getenv("DATABASE_URL", _DSN)
    try:
        engine = create_engine(dsn, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        with engine.connect() as conn:
            # Latest risk report
            risk_row = conn.execute(sqla_text("""
                SELECT fecha_calculo, indice_compuesto, semaforo, dimensiones_json, drivers_json
                FROM informes_riesgo_politico
                ORDER BY fecha_calculo DESC LIMIT 1
            """)).fetchone()
            if not risk_row:
                return get_demo_overview()

            indice = float(risk_row._mapping["indice_compuesto"] or 6.0)
            global_score = int(round(indice * 10))  # 0–10 scale → 0–100
            semaforo = str(risk_row._mapping["semaforo"] or "amarillo")
            level = {"verde": "low", "amarillo": "medium", "rojo": "high"}.get(semaforo, "medium")

            # Spark: last 6 reports for trend line
            spark_rows = conn.execute(sqla_text("""
                SELECT indice_compuesto FROM informes_riesgo_politico
                ORDER BY fecha_calculo DESC LIMIT 30
            """)).fetchall()
            spark_vals = [int(round(float(r[0] or 6.0) * 10)) for r in reversed(spark_rows)]
            if len(spark_vals) < 2:
                spark_vals = DEMO_SPARK

            trend_delta = spark_vals[-1] - spark_vals[-2] if len(spark_vals) >= 2 else 0

            # Alerts count by severity
            crit_count = conn.execute(sqla_text(
                "SELECT COUNT(*) FROM alertas_sistema WHERE severidad='CRITICAL'"
            )).scalar() or 0
            warn_count = conn.execute(sqla_text(
                "SELECT COUNT(*) FROM alertas_sistema WHERE severidad='WARNING'"
            )).scalar() or 0
            total_alerts = int(crit_count) + int(warn_count)

        from api.schemas.risk import RiskKpiItem
        kpis = [
            RiskKpiItem(label="Score global", value=global_score, color="amber" if global_score < 75 else "red", delta=trend_delta),
            RiskKpiItem(label="Crisis activas", value=int(crit_count), color="red", delta=0),
            RiskKpiItem(label="Señales críticas", value=int(warn_count), color="amber", delta=0),
            RiskKpiItem(label="Indicadores en verde", value=max(0, 10 - total_alerts), color="green", delta=0),
        ]
        return RiskOverviewResponse(
            global_score=global_score, level=level,
            trend=trend_from_delta(trend_delta), trend_delta=trend_delta,
            kpis=kpis, dimensions=DEMO_DIMENSIONS,
            crisis_signals=[], top_signals=[], early_warnings=[],
            spark=spark_vals, mode="real",
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
