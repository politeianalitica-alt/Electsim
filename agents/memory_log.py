from __future__ import annotations

import json
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine


def log_memory_turn(
    engine: Engine,
    *,
    session_id: str,
    role: str,
    content: str,
    kind: str = "turn",
    cluster_id: int | None = None,
    perfil_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    modelo: str | None = None,
) -> None:
    sql = text(
        """
        INSERT INTO agent_memory_log
            (perfil_id, cluster_id, session_id, role, kind, content, metadata_json, modelo)
        VALUES
            (:perfil_id, :cluster_id, :session_id, :role, :kind, :content, :metadata_json, :modelo)
        """
    )
    with engine.begin() as conn:
        conn.execute(
            sql,
            {
                "perfil_id": perfil_id,
                "cluster_id": cluster_id,
                "session_id": session_id,
                "role": role,
                "kind": kind,
                "content": str(content or ""),
                "metadata_json": json.dumps(metadata or {}, ensure_ascii=False),
                "modelo": modelo,
            },
        )


def get_session_turns(
    engine: Engine,
    session_id: str,
    kind: str | None = None,
    role: str | None = None,
) -> list[dict]:
    wheres = ["session_id = :sid"]
    params: dict[str, Any] = {"sid": session_id}
    if kind:
        wheres.append("kind = :kind")
        params["kind"] = kind
    if role:
        wheres.append("role = :role")
        params["role"] = role
    sql = text(
        "SELECT id, session_id, perfil_id, cluster_id, role, kind, "
        "content, metadata_json, modelo, created_at "
        f"FROM agent_memory_log WHERE {' AND '.join(wheres)} ORDER BY id ASC"
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params=params)
    return df.to_dict(orient="records")


def get_simulation_responses(engine: Engine, nombre_simulacion: str) -> set[tuple[int, str]]:
    sql = text(
        """
        SELECT cluster_id, metadata_json
        FROM agent_memory_log
        WHERE session_id = :sid AND kind = 'survey_response'
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"sid": f"{nombre_simulacion}_survey"})
    out: set[tuple[int, str]] = set()
    for _, r in df.iterrows():
        try:
            meta = json.loads(r.get("metadata_json") or "{}")
            pc = str(meta.get("pregunta_codigo") or "").strip()
            cid = int(r.get("cluster_id"))
            if pc:
                out.add((cid, pc))
        except Exception:
            continue
    return out


def list_sessions(engine: Engine, limit: int = 50) -> list[dict]:
    sql = text(
        """
        SELECT session_id,
               MIN(created_at) AS inicio,
               MAX(created_at) AS fin,
               COUNT(*) AS n_turnos,
               MAX(modelo) AS modelo
        FROM agent_memory_log
        GROUP BY session_id
        ORDER BY MAX(created_at) DESC
        LIMIT :lim
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"lim": int(limit)})
    return df.to_dict(orient="records")
