"""
Performance Tracker — Bloque 16.

Registro y análisis de métricas de contenido.
Fase inicial: registro manual e importación CSV.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from communications.schemas import ContentPerformance

logger = logging.getLogger(__name__)

_PERFORMANCE: dict[str, ContentPerformance] = {}


def record_content_performance(performance: ContentPerformance) -> ContentPerformance:
    _PERFORMANCE[performance.performance_id] = performance
    _persist_performance(performance)
    return performance


def get_asset_performance(asset_id: str) -> list[ContentPerformance]:
    return [p for p in _PERFORMANCE.values() if p.content_asset_id == asset_id]


def import_performance_csv(path: str, tenant_id: str = "default") -> dict[str, Any]:
    """Importa métricas de performance desde un CSV."""
    try:
        import pandas as pd
        df = pd.read_csv(path)
        imported = 0
        errors = 0
        for _, row in df.iterrows():
            try:
                perf = ContentPerformance(
                    content_asset_id=str(row.get("asset_id", "")),
                    channel_id=str(row.get("channel_id", "unknown")),
                    measured_at=pd.to_datetime(row.get("measured_at", datetime.utcnow())),
                    impressions=int(row["impressions"]) if "impressions" in row and row["impressions"] == row["impressions"] else None,
                    engagements=int(row["engagements"]) if "engagements" in row and row["engagements"] == row["engagements"] else None,
                    clicks=int(row["clicks"]) if "clicks" in row and row["clicks"] == row["clicks"] else None,
                    engagement_rate=float(row["engagement_rate"]) if "engagement_rate" in row else None,
                )
                record_content_performance(perf)
                imported += 1
            except Exception as exc:
                logger.debug("import_performance_csv row error: %s", exc)
                errors += 1
        return {"imported": imported, "errors": errors}
    except Exception as exc:
        logger.warning("import_performance_csv: %s", exc)
        return {"imported": 0, "errors": 1, "error": str(exc)}


def compute_channel_performance(channel_id: str, days: int = 30) -> dict[str, Any]:
    cutoff = datetime.utcnow() - timedelta(days=days)
    records = [p for p in _PERFORMANCE.values()
               if p.channel_id == channel_id and p.measured_at >= cutoff]
    if not records:
        return {"channel_id": channel_id, "records": 0}
    return {
        "channel_id": channel_id,
        "records": len(records),
        "total_impressions": sum(p.impressions or 0 for p in records),
        "total_engagements": sum(p.engagements or 0 for p in records),
        "total_clicks": sum(p.clicks or 0 for p in records),
        "avg_engagement_rate": round(sum(p.engagement_rate or 0 for p in records) / len(records), 4),
    }


def compute_message_frame_performance(frame_id: str) -> dict[str, Any]:
    from communications.message_studio import list_assets
    assets = list_assets(limit=999)
    frame_assets = [a for a in assets if a.message_frame_id == frame_id]
    asset_ids = {a.asset_id for a in frame_assets}
    records = [p for p in _PERFORMANCE.values() if p.content_asset_id in asset_ids]
    if not records:
        return {"frame_id": frame_id, "assets": len(frame_assets), "records": 0}
    return {
        "frame_id": frame_id,
        "assets": len(frame_assets),
        "records": len(records),
        "total_impressions": sum(p.impressions or 0 for p in records),
        "avg_engagement_rate": round(sum(p.engagement_rate or 0 for p in records) / len(records), 4),
    }


def detect_content_outliers(days: int = 30) -> list[dict[str, Any]]:
    """Detecta contenidos con performance excepcionalmente alta o baja."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    records = [p for p in _PERFORMANCE.values() if p.measured_at >= cutoff]
    if len(records) < 3:
        return []
    rates = [p.engagement_rate or 0 for p in records]
    avg = sum(rates) / len(rates)
    std_proxy = (sum((r - avg) ** 2 for r in rates) / len(rates)) ** 0.5
    outliers = []
    for p in records:
        rate = p.engagement_rate or 0
        if abs(rate - avg) > 2 * std_proxy:
            outliers.append({
                "performance_id": p.performance_id,
                "asset_id": p.content_asset_id,
                "engagement_rate": rate,
                "type": "high" if rate > avg else "low",
                "deviation": round(abs(rate - avg) / max(std_proxy, 0.001), 2),
            })
    return outliers


def _persist_performance(p: ContentPerformance) -> None:
    try:
        import json
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO content_performance
                   (performance_id, content_asset_id, channel_id, measured_at,
                    impressions, engagements, clicks, shares, comments, opens, replies,
                    engagement_rate, click_rate, sentiment_score, narrative_shift_score, raw_payload)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (performance_id) DO NOTHING""",
                (p.performance_id, p.content_asset_id, p.channel_id, p.measured_at,
                 p.impressions, p.engagements, p.clicks, p.shares, p.comments_count,
                 p.opens, p.replies, p.engagement_rate, p.click_rate,
                 p.sentiment_score, p.narrative_shift_score, json.dumps(p.raw_payload)),
            )
        conn.commit()
    except Exception as exc:
        logger.debug("_persist_performance: %s", exc)
