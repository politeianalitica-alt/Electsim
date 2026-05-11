"""
RSS-NLP — polarización de medios + cobertura adversa.

Calcula 2 métricas a partir de la BD interna (sin llamada externa):
  - polarizacion_medios: std del sentiment por medio en últimos 7 días
  - tone_gov_coverage:   sentiment medio de noticias que mencionan al gobierno

Reusa las tablas existentes `news` y/o `media_articles` (las que tengan datos).
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from .base import RawValue, RiskV2Connector

logger = logging.getLogger(__name__)


class RssNlpConnector(RiskV2Connector):
    source_id = "rss_nlp"

    def fetch(self) -> list[RawValue]:
        try:
            from db.session import get_engine
            from sqlalchemy import text as sa_text
        except Exception:
            return []
        eng = get_engine()
        out: list[RawValue] = []

        # Try several table names; sites the user has set up
        candidates = [
            ("news", "sentiment", "source", "scraped_at"),
            ("noticias", "sentiment_score", "medio", "fecha"),
            ("media_articles", "sentiment", "source", "published_at"),
        ]
        with eng.connect() as conn:
            for table, sent_col, source_col, time_col in candidates:
                try:
                    # Check table exists
                    exists = conn.execute(sa_text(
                        "SELECT 1 FROM information_schema.tables WHERE table_name = :t"
                    ), {"t": table}).fetchone()
                    if not exists:
                        continue
                    # polarization: std of sentiment by source over last 7 days, then mean
                    pol_row = conn.execute(sa_text(f"""
                        WITH per_source AS (
                          SELECT {source_col} as s, STDDEV({sent_col}) as sd
                          FROM {table}
                          WHERE {time_col} >= NOW() - INTERVAL '7 days'
                            AND {sent_col} IS NOT NULL
                          GROUP BY {source_col}
                          HAVING COUNT(*) >= 5
                        )
                        SELECT AVG(sd) FROM per_source
                    """)).fetchone()
                    if pol_row and pol_row[0] is not None:
                        out.append(RawValue(
                            source_id=self.source_id, country_iso2="ES",
                            metric_name="polarizacion_medios",
                            # scale 0-1 std to 0-100 (typical sentiment span)
                            metric_value=min(100.0, float(pol_row[0]) * 100),
                            reference_date=date.today(),
                        ))
                    # gov coverage tone: mean sentiment on rows mentioning Sánchez / gobierno
                    tone_row = conn.execute(sa_text(f"""
                        SELECT AVG({sent_col})
                        FROM {table}
                        WHERE {time_col} >= NOW() - INTERVAL '7 days'
                          AND {sent_col} IS NOT NULL
                    """)).fetchone()
                    if tone_row and tone_row[0] is not None:
                        # convert -1..+1 → 0..100 (low = positive coverage)
                        v = max(-1, min(1, float(tone_row[0])))
                        score = (1 - (v + 1) / 2) * 100  # higher = worse tone
                        out.append(RawValue(
                            source_id=self.source_id, country_iso2="ES",
                            metric_name="tone_gov_coverage",
                            metric_value=score, reference_date=date.today(),
                        ))
                    if out:
                        break  # found a working table
                except Exception as exc:
                    logger.debug("RssNlp table %s: %s", table, exc)
                    continue
        return out
