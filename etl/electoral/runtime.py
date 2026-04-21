from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import text

from etl.logger import get_logger

logger = get_logger(__name__)


@dataclass
class SourceOutcome:
    source_id: str
    status: str
    records_read: int = 0
    records_inserted: int = 0
    records_updated: int = 0
    records_rejected: int = 0
    records_deduplicated: int = 0
    warnings: list[dict[str, Any]] = field(default_factory=list)
    errors: list[dict[str, Any]] = field(default_factory=list)
    validation: dict[str, Any] = field(default_factory=dict)
    raw_snapshot_path: str | None = None
    watermark_before: str | None = None
    watermark_after: str | None = None
    extra_metrics: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def skipped(cls, source_id: str, reason: str) -> "SourceOutcome":
        return cls(
            source_id=source_id,
            status="skipped",
            warnings=[{"code": "skipped", "message": reason}],
        )


class ElectoralIngestionRuntime:
    def __init__(self, engine, config) -> None:
        self.engine = engine
        self.config = config

    def now(self) -> datetime:
        return datetime.now(timezone.utc)

    def start_run(
        self,
        *,
        mode: str,
        triggered_by: str,
        requested_from: date | None = None,
        requested_to: date | None = None,
    ) -> str:
        run_id = uuid.uuid4().hex
        with self.engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO ingestion_run (
                        run_id, pipeline_name, mode, requested_from, requested_to,
                        triggered_by, status, started_at
                    ) VALUES (
                        :run_id, :pipeline_name, :mode, :requested_from, :requested_to,
                        :triggered_by, 'running', NOW()
                    )
                    """
                ),
                {
                    "run_id": run_id,
                    "pipeline_name": self.config.pipeline_name,
                    "mode": mode,
                    "requested_from": requested_from,
                    "requested_to": requested_to,
                    "triggered_by": triggered_by,
                },
            )
        return run_id

    def finish_run(self, run_id: str, *, status: str, error_summary: str | None = None) -> None:
        with self.engine.begin() as conn:
            conn.execute(
                text(
                    """
                    UPDATE ingestion_run
                    SET status = :status,
                        error_summary = :error_summary,
                        finished_at = NOW()
                    WHERE run_id = :run_id
                    """
                ),
                {"run_id": run_id, "status": status, "error_summary": error_summary},
            )

    def get_watermark(self, source_id: str) -> str | None:
        with self.engine.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT watermark_value
                    FROM ingestion_watermark
                    WHERE pipeline_name = :pipeline_name
                      AND source_id = :source_id
                    """
                ),
                {"pipeline_name": self.config.pipeline_name, "source_id": source_id},
            ).first()
        return str(row[0]) if row and row[0] is not None else None

    def update_watermark(self, source_id: str, watermark_value: str | None, *, full_refresh: bool = False) -> None:
        with self.engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO ingestion_watermark (
                        pipeline_name, source_id, watermark_value, last_success_at, last_full_refresh_at
                    ) VALUES (
                        :pipeline_name, :source_id, :watermark_value, NOW(),
                        CASE WHEN :full_refresh THEN NOW() ELSE NULL END
                    )
                    ON CONFLICT (pipeline_name, source_id)
                    DO UPDATE SET
                        watermark_value = EXCLUDED.watermark_value,
                        last_success_at = NOW(),
                        last_full_refresh_at = CASE
                            WHEN :full_refresh THEN NOW()
                            ELSE ingestion_watermark.last_full_refresh_at
                        END
                    """
                ),
                {
                    "pipeline_name": self.config.pipeline_name,
                    "source_id": source_id,
                    "watermark_value": watermark_value,
                    "full_refresh": full_refresh,
                },
            )

    def previous_success_metrics(self, source_id: str) -> dict[str, Any]:
        with self.engine.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT records_read, records_inserted, records_updated, extra_metrics_json, validation_json
                    FROM ingestion_run_source
                    WHERE source_id = :source_id
                      AND status = 'success'
                    ORDER BY finished_at DESC NULLS LAST
                    LIMIT 1
                    """
                ),
                {"source_id": source_id},
            ).mappings().first()
        if not row:
            return {}
        extra = {}
        validation = {}
        try:
            extra = json.loads(row["extra_metrics_json"] or "{}")
        except Exception:
            extra = {}
        try:
            validation = json.loads(row["validation_json"] or "{}")
        except Exception:
            validation = {}
        metrics = {"row_count": int(row["records_read"] or 0)}
        metrics.update(extra.get("metrics", {}))
        metrics.update(validation.get("metrics", {}))
        metrics["records_inserted"] = int(row["records_inserted"] or 0)
        metrics["records_updated"] = int(row["records_updated"] or 0)
        return metrics

    def persist_source_result(
        self,
        run_id: str,
        *,
        source_id: str,
        source_type: str,
        extraction_mode: str,
        precedence_rank: int,
        supports_incremental: bool,
        outcome: SourceOutcome,
    ) -> None:
        warnings_json = json.dumps(outcome.warnings, ensure_ascii=False)
        errors_json = json.dumps(outcome.errors, ensure_ascii=False)
        validation_json = json.dumps(outcome.validation, ensure_ascii=False)
        extra_metrics_json = json.dumps(outcome.extra_metrics, ensure_ascii=False)
        with self.engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO ingestion_run_source (
                        run_id, source_id, source_type, extraction_mode,
                        precedence_rank, supports_incremental, status,
                        raw_snapshot_path, watermark_before, watermark_after,
                        records_read, records_inserted, records_updated,
                        records_rejected, records_deduplicated,
                        warnings_count, warnings_json, errors_json,
                        validation_json, extra_metrics_json,
                        started_at, finished_at
                    ) VALUES (
                        :run_id, :source_id, :source_type, :extraction_mode,
                        :precedence_rank, :supports_incremental, :status,
                        :raw_snapshot_path, :watermark_before, :watermark_after,
                        :records_read, :records_inserted, :records_updated,
                        :records_rejected, :records_deduplicated,
                        :warnings_count, :warnings_json, :errors_json,
                        :validation_json, :extra_metrics_json,
                        NOW(), NOW()
                    )
                    """
                ),
                {
                    "run_id": run_id,
                    "source_id": source_id,
                    "source_type": source_type,
                    "extraction_mode": extraction_mode,
                    "precedence_rank": precedence_rank,
                    "supports_incremental": supports_incremental,
                    "status": outcome.status,
                    "raw_snapshot_path": outcome.raw_snapshot_path,
                    "watermark_before": outcome.watermark_before,
                    "watermark_after": outcome.watermark_after,
                    "records_read": outcome.records_read,
                    "records_inserted": outcome.records_inserted,
                    "records_updated": outcome.records_updated,
                    "records_rejected": outcome.records_rejected,
                    "records_deduplicated": outcome.records_deduplicated,
                    "warnings_count": len(outcome.warnings),
                    "warnings_json": warnings_json,
                    "errors_json": errors_json,
                    "validation_json": validation_json,
                    "extra_metrics_json": extra_metrics_json,
                },
            )

        self.persist_scraping_log(source_id, outcome)
        self.persist_source_health(source_id, source_type, outcome)

    def persist_scraping_log(self, source_id: str, outcome: SourceOutcome) -> None:
        with self.engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO scraping_log (
                        fuente, tipo, estado, n_registros_nuevos, n_registros_duplicados, error_mensaje
                    ) VALUES (
                        :fuente, 'electoral_ingestion', :estado, :nuevos, :deduplicados, :error
                    )
                    """
                ),
                {
                    "fuente": source_id,
                    "estado": outcome.status,
                    "nuevos": outcome.records_inserted,
                    "deduplicados": outcome.records_deduplicated,
                    "error": "\n".join(err.get("message", "") for err in outcome.errors)[:5000],
                },
            )

    def persist_source_health(self, source_id: str, source_type: str, outcome: SourceOutcome) -> None:
        status = "ok"
        if outcome.status not in {"success", "skipped"}:
            status = "failing"
        elif outcome.warnings:
            status = "degraded"
        with self.engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO source_health (
                        source_id, source_type, fecha, articles_count, errors_count, status, checked_at
                    ) VALUES (
                        :source_id, :source_type, CURRENT_DATE, :count, :errors_count, :status, NOW()
                    )
                    ON CONFLICT (source_id, fecha)
                    DO UPDATE SET
                        source_type = EXCLUDED.source_type,
                        articles_count = EXCLUDED.articles_count,
                        errors_count = EXCLUDED.errors_count,
                        status = EXCLUDED.status,
                        checked_at = NOW()
                    """
                ),
                {
                    "source_id": source_id,
                    "source_type": source_type,
                    "count": outcome.records_read,
                    "errors_count": len(outcome.errors),
                    "status": status,
                },
            )

    def snapshot_json(self, run_id: str, source_id: str, payload: Any, suffix: str = "raw") -> str:
        source_dir = self.config.raw_root / source_id / run_id
        source_dir.mkdir(parents=True, exist_ok=True)
        path = source_dir / f"{suffix}.json"
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2, default=str),
            encoding="utf-8",
        )
        return str(path)

    def snapshot_frame(self, run_id: str, source_id: str, frame: pd.DataFrame, suffix: str = "raw") -> str:
        source_dir = self.config.raw_root / source_id / run_id
        source_dir.mkdir(parents=True, exist_ok=True)
        path = source_dir / f"{suffix}.json"
        records = frame.to_dict(orient="records")
        path.write_text(json.dumps(records, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        return str(path)
