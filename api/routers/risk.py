# api/routers/risk.py
from __future__ import annotations

import os
from datetime import date, timedelta
from statistics import median

from fastapi import APIRouter

from api.schemas.risk_overview import RiskKpiItem, RiskOverview, RiskSignalItem

router = APIRouter(prefix="/api/risk", tags=["risk"])

_DEMO_SPARK = [52, 55, 51, 58, 60, 57, 63, 61, 66, 64, 62, 67, 65, 68, 70, 67, 72, 69, 74, 71, 73, 75, 72, 76, 74, 71, 68, 72, 74, 71]


def _fetch_sparkline(dsn: str) -> list[int]:
    """Fetch 30-day risk sparkline from signal_politeia. Falls back to _DEMO_SPARK."""
    import psycopg2

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    DATE(created_at) AS day,
                    COUNT(*) AS n,
                    AVG(urgencia)::float AS avg_u
                FROM signal_politeia
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at)
                """
            )
            rows = cur.fetchall()

    if not rows:
        return _DEMO_SPARK

    day_scores: dict[str, int] = {}
    for row in rows:
        day_str = row[0].isoformat() if hasattr(row[0], "isoformat") else str(row[0])
        n = float(row[1])
        avg_u = float(row[2]) if row[2] is not None else 1.0
        score = int(min(round(n * avg_u * 2.5), 100))
        day_scores[day_str] = score

    known_values = list(day_scores.values())
    median_val = int(median(known_values)) if known_values else 50

    today = date.today()
    result: list[int] = []
    for offset in range(29, -1, -1):
        day = today - timedelta(days=offset)
        result.append(day_scores.get(day.isoformat(), median_val))

    return result


def _demo_risk() -> RiskOverview:
    return RiskOverview(
        global_score=67,
        level="alto",
        kpis=[
            RiskKpiItem(label="Riesgo político", value=72, color="red"),
            RiskKpiItem(label="Riesgo legislativo", value=58, color="amber"),
            RiskKpiItem(label="Riesgo mediático", value=61, color="amber"),
            RiskKpiItem(label="Estabilidad coalición", value=44, color="blue"),
        ],
        signals=[
            RiskSignalItem(title="Fractura en pacto de investidura", description="Tensiones crecientes entre socios de gobierno amenazan estabilidad legislativa.", probability=68, impact="Alto"),
            RiskSignalItem(title="Escalada judicial anti-gobierno", description="Nuevas causas judiciales contra miembros del ejecutivo en tribunales superiores.", probability=55, impact="Alto"),
            RiskSignalItem(title="Bloqueo presupuestario 2027", description="Sin mayoría estable, la aprobación de presupuestos generales es incierta.", probability=74, impact="Alto"),
            RiskSignalItem(title="Fragmentación territorial", description="Tensiones entre CCAA y gobierno central en financiación y competencias.", probability=61, impact="Medio"),
            RiskSignalItem(title="Volatilidad electoral anticipada", description="Escenario de elecciones anticipadas con probabilidad creciente.", probability=42, impact="Alto"),
        ],
        spark=_DEMO_SPARK,
        trend_delta=5,
        mode="fallback",
    )


@router.get("/overview", response_model=RiskOverview)
def get_risk_overview() -> RiskOverview:
    try:
        import psycopg2

        dsn = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")
        with psycopg2.connect(dsn) as conn:
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

                cur.execute(
                    "SELECT COUNT(*) FROM legislation WHERE status = 'pending' AND published_at >= NOW() - INTERVAL '30 days'"
                )
                n_pendientes = (cur.fetchone() or [0])[0] or 0

        score = (
            min(float(n_criticas) * 5.0, 30.0)
            + min(float(n_leyes) * 3.0, 20.0)
            + (1.0 - max(float(sent_medio), -1.0)) * 10.0
            + min(float(n_pendientes) * 0.5, 15.0)
            + 15.0
        )
        score_int = int(round(min(max(score, 0.0), 100.0)))
        level = "alto" if score_int > 65 else "medio" if score_int > 35 else "bajo"

        # Try to get signals from analysis hub
        signals: list[RiskSignalItem] = []
        try:
            from services.analysis.analysis_hub import collect_cross_domain_signals  # type: ignore
            hub_signals = collect_cross_domain_signals("24h")
            for s in hub_signals[:5]:
                signals.append(RiskSignalItem(
                    title=s.get("title", ""),
                    description=s.get("summary", ""),
                    probability=int(s.get("confidence", 0.5) * 100),
                    impact="Alto" if s.get("severity") == "critical" else "Medio" if s.get("severity") == "high" else "Bajo",
                ))
        except Exception:
            pass

        kpis = [
            RiskKpiItem(label="Riesgo político", value=min(int(n_criticas * 10), 100), color="red"),
            RiskKpiItem(label="Riesgo legislativo", value=min(int(n_leyes * 8), 100), color="amber"),
            RiskKpiItem(label="Sentimiento político", value=int((1.0 - float(sent_medio)) * 50), color="amber"),
            RiskKpiItem(label="Iniciativas pendientes", value=min(int(n_pendientes * 2), 100), color="blue"),
        ]

        try:
            real_spark = _fetch_sparkline(dsn)
        except Exception:
            real_spark = _DEMO_SPARK

        return RiskOverview(
            global_score=score_int,
            level=level,
            kpis=kpis,
            signals=signals if signals else _demo_risk().signals,
            spark=real_spark,
            trend_delta=0,
            mode="real",
        )
    except Exception:
        return _demo_risk()
