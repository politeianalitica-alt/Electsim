"""Persistencia de turnos en ``agent_memory_log``."""

from __future__ import annotations

import json
from typing import Any, Mapping

from sqlalchemy import text


def insert_memory_entry(
    engine,
    *,
    session_id: str,
    role: str,
    content: str,
    kind: str = "turn",
    perfil_id: int | None = None,
    cluster_id: int | None = None,
    modelo: str | None = None,
    metadata: Mapping[str, Any] | None = None,
) -> None:
    meta_s = json.dumps(dict(metadata), ensure_ascii=False) if metadata else None
    stmt = text(
        """
        INSERT INTO agent_memory_log (
            session_id, perfil_id, cluster_id, role, kind, content, metadata_json, modelo
        ) VALUES (
            :session_id, :perfil_id, :cluster_id, :role, :kind, :content, :metadata_json, :modelo
        )
        """
    )
    with engine.begin() as conn:
        conn.execute(
            stmt,
            {
                "session_id": session_id,
                "perfil_id": perfil_id,
                "cluster_id": cluster_id,
                "role": role,
                "kind": kind,
                "content": content,
                "metadata_json": meta_s,
                "modelo": modelo,
            },
        )
