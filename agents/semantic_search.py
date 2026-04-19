from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from agents.llm import get_embedding_client

_SCHEMA_VALIDATED = False


def validate_semantic_schema(session: Session) -> None:
    expected = {"embedding", "tenant_id"}
    rows = session.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'posts_redes_sociales'
            """
        )
    ).fetchall()
    cols = {r[0] for r in rows}
    missing = expected - cols
    if missing:
        raise RuntimeError(f"posts_redes_sociales sin columnas requeridas: {sorted(missing)}")


def semantic_search_posts(
    session: Session,
    query: str,
    *,
    tenant_id: str = "default",
    limit: int = 10,
    min_score: float | None = None,
    filters: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    global _SCHEMA_VALIDATED
    if not _SCHEMA_VALIDATED:
        validate_semantic_schema(session)
        _SCHEMA_VALIDATED = True
    client = get_embedding_client()
    embedding = client.embed_text(query)
    params: dict[str, Any] = {"vec": embedding, "limit": int(limit), "tenant_id": tenant_id}
    where = ["embedding IS NOT NULL", "tenant_id = :tenant_id"]
    filter_map = {"plataforma": "plataforma", "partido_id": "partido_id", "autor_tipo": "autor_tipo", "idioma": "idioma"}

    for key, value in (filters or {}).items():
        column = filter_map.get(key)
        if not column:
            continue
        pname = f"f_{key}"
        where.append(f"{column} = :{pname}")
        params[pname] = value

    ts_query = str((filters or {}).get("q", "")).strip()
    if ts_query:
        params["ts_query"] = ts_query
        where.append("to_tsvector('spanish', coalesce(texto,'')) @@ plainto_tsquery('spanish', :ts_query)")

    sql = text(
        f"""
        SELECT id, texto, plataforma, partido_id, fecha_publicacion,
               (embedding <=> CAST(:vec AS vector)) AS distance
        FROM posts_redes_sociales
        WHERE {' AND '.join(where)}
        ORDER BY embedding <=> CAST(:vec AS vector)
        LIMIT :limit
        """
    )
    rows = session.execute(sql, params).mappings().all()
    results: list[dict[str, Any]] = []
    for row in rows:
        score = float(1.0 - float(row["distance"]))
        if min_score is not None and score < min_score:
            continue
        results.append(
            {
                "id": row["id"],
                "texto": row["texto"],
                "plataforma": row["plataforma"],
                "partido_id": row["partido_id"],
                "fecha_publicacion": row["fecha_publicacion"],
                "distance": float(row["distance"]),
                "score": score,
            }
        )
    return results
