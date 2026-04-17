"""
Quality checks inspired by election-reporting ETL patterns.

Usage:
    python -m etl.quality.election_reporting_checks
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from sqlalchemy import create_engine, text


@dataclass
class CheckResult:
    check: str
    status: str
    detail: str


def run_checks(engine) -> list[CheckResult]:
    checks: list[CheckResult] = []
    with engine.connect() as conn:
        dup_urls = conn.execute(
            text(
                """
                SELECT COUNT(*) FROM (
                    SELECT url FROM noticias_prensa
                    GROUP BY url
                    HAVING COUNT(*) > 1
                ) t
                """
            )
        ).scalar() or 0
        checks.append(
            CheckResult(
                check="noticias_prensa.url_unique",
                status="ok" if int(dup_urls) == 0 else "warning",
                detail=f"duplicados={int(dup_urls)}",
            )
        )

        sin_sent = conn.execute(
            text(
                """
                SELECT COUNT(*) FROM noticias_prensa
                WHERE sentimiento_score IS NULL
                  AND fecha_publicacion >= CURRENT_DATE - INTERVAL '7 days'
                """
            )
        ).scalar() or 0
        checks.append(
            CheckResult(
                check="noticias_prensa.sentimiento_completo_7d",
                status="ok" if int(sin_sent) == 0 else "warning",
                detail=f"sin_sentimiento={int(sin_sent)}",
            )
        )

        encuestas_recientes = conn.execute(
            text(
                """
                SELECT COUNT(*) FROM encuestas_tracking
                WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '60 days'
                """
            )
        ).scalar() or 0
        checks.append(
            CheckResult(
                check="encuestas_tracking.freshness_60d",
                status="ok" if int(encuestas_recientes) > 0 else "warning",
                detail=f"encuestas_60d={int(encuestas_recientes)}",
            )
        )

        perfiles = conn.execute(text("SELECT COUNT(*) FROM perfiles_votante")).scalar() or 0
        checks.append(
            CheckResult(
                check="perfiles_votante.min_count",
                status="ok" if int(perfiles) >= 8 else "warning",
                detail=f"perfiles={int(perfiles)} (objetivo>=8)",
            )
        )
    return checks


def persist_log(engine, checks: list[CheckResult]) -> None:
    sql = text(
        """
        INSERT INTO scraping_log (fuente, tipo, estado, n_registros_nuevos, error_mensaje)
        VALUES (:fuente, 'quality', :estado, 0, :detail)
        """
    )
    with engine.begin() as conn:
        for c in checks:
            conn.execute(
                sql,
                {
                    "fuente": f"quality::{c.check}",
                    "estado": "ok" if c.status == "ok" else "warning",
                    "detail": c.detail,
                },
            )


def main() -> None:
    engine = create_engine(
        os.environ.get(
            "DATABASE_URL",
            "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana",
        )
    )
    checks = run_checks(engine)
    persist_log(engine, checks)
    for c in checks:
        print(f"[{c.status}] {c.check} -> {c.detail}")


if __name__ == "__main__":
    main()

