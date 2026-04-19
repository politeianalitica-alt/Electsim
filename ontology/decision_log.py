from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import text


@dataclass(slots=True)
class DecisionRecord:
    object_type: str | None
    object_id: str | None
    action_name: str
    input_params: dict[str, Any]
    output_summary: str
    user_id: str
    tenant_id: str
    created_at: datetime


class DecisionLogger:
    def __init__(self, session_factory):
        self._session_factory = session_factory

    def log_decision(
        self,
        *,
        object_type: str | None,
        object_id: str | None,
        action_name: str,
        input_params: dict[str, Any],
        output_summary: str,
        user_id: str,
        tenant_id: str,
    ) -> None:
        record = DecisionRecord(
            object_type=object_type,
            object_id=object_id,
            action_name=action_name,
            input_params=input_params,
            output_summary=output_summary,
            user_id=user_id,
            tenant_id=tenant_id,
            created_at=datetime.utcnow(),
        )
        sql = text(
            """
            INSERT INTO decision_log
              (object_type, object_id, action_name, input_params, output_summary, user_id, tenant_id, created_at)
            VALUES
              (:object_type, :object_id, :action_name, CAST(:input_params AS JSONB), :output_summary, :user_id, :tenant_id, :created_at)
            """
        )
        with self._session_factory() as session:
            session.execute(
                sql,
                {
                    "object_type": record.object_type,
                    "object_id": record.object_id,
                    "action_name": record.action_name,
                    "input_params": __import__("json").dumps(record.input_params, ensure_ascii=False),
                    "output_summary": record.output_summary,
                    "user_id": record.user_id,
                    "tenant_id": record.tenant_id,
                    "created_at": record.created_at,
                },
            )
            session.commit()
