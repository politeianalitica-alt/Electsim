<<<<<<< HEAD
"""Persistencia de turnos en ``agent_memory_log``."""

from __future__ import annotations

import json
from typing import Any, Mapping

from sqlalchemy import text


def insert_memory_entry(
    engine,
=======
from __future__ import annotations

import json
import logging
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def _json_dumps_safe(payload: Any) -> str:
    try:
        return json.dumps(payload, ensure_ascii=False)
    except Exception:
        return "{}"


def log_memory_turn(
    engine: Engine,
>>>>>>> 6fda6ff (agentes 1)
    *,
    session_id: str,
    role: str,
    content: str,
    kind: str = "turn",
<<<<<<< HEAD
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
=======
    cluster_id: int | None = None,
    perfil_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    modelo: str | None = None,
) -> None:
    """Inserta un turno en agent_memory_log.

    Esta función es idempotente a nivel de errores: si falla, registra warning y continúa.
    """
    sql = text(
        """
        INSERT INTO agent_memory_log
            (perfil_id, cluster_id, session_id, role, kind, content, metadata_json, modelo)
        VALUES
            (:perfil_id, :cluster_id, :session_id, :role, :kind, :content, :metadata_json, :modelo)
        """
    )
    params = {
        "perfil_id": perfil_id,
        "cluster_id": cluster_id,
        "session_id": session_id,
        "role": role,
        "kind": kind,
        "content": str(content or ""),
        "metadata_json": _json_dumps_safe(metadata or {}),
        "modelo": modelo,
    }
    try:
        with engine.begin() as conn:
            conn.execute(sql, params)
    except Exception as exc:  # pragma: no cover - no romper simulación por logging
        logger.warning("No se pudo escribir en agent_memory_log: %s", exc)


def get_session_turns(
    engine: Engine,
    session_id: str,
    kind: str | None = None,
    role: str | None = None,
) -> list[dict]:
    """
    Devuelve todos los turnos de una sesión, ordenados por id ASC.
    Filtros opcionales por kind y/o role.
    """
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


def get_simulation_responses(
    engine: Engine,
    nombre_simulacion: str,
) -> set[tuple[int, str]]:
    """
    Devuelve el conjunto de (cluster_id, pregunta_codigo) ya completados
    para una simulación. Usado para checkpoint/resume en simulador_cis.
    """
    sql = text(
        """
        SELECT cluster_id, metadata_json
        FROM agent_memory_log
        WHERE session_id = :sid AND kind = 'survey_response'
        """
    )
    sid = f"{nombre_simulacion}_survey"
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"sid": sid})

    resultado: set[tuple[int, str]] = set()
    for _, r in df.iterrows():
        try:
            raw_meta = r.get("metadata_json")
            if isinstance(raw_meta, dict):
                meta = raw_meta
            else:
                meta = json.loads(raw_meta or "{}")
            pc = str(meta.get("pregunta_codigo") or "").strip()
            cid = int(r.get("cluster_id"))
            if pc:
                resultado.add((cid, pc))
        except Exception:
            continue
    return resultado


def list_sessions(engine: Engine, limit: int = 50) -> list[dict]:
    """
    Lista las últimas `limit` sesiones únicas con su fecha de inicio y fin.
    """
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
>>>>>>> 6fda6ff (agentes 1)
