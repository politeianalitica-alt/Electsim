from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from agents.llm import get_embedding_client


def semantic_search_posts(
    session: Session,
    query: str,
    *,
    tenant_id: str = "default",
    limit: int = 10,
    min_score: float | None = None,
    filters: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    client = get_embedding_client()
    embedding = client.embed_text(query)
    params: dict[str, Any] = {"vec": embedding, "limit": int(limit)}
    where = ["embedding IS NOT NULL"]
    filter_map = {"plataforma": "plataforma", "partido_id": "partido_id", "autor_tipo": "autor_tipo"}

    # tenant_id aún no existe en todas las instalaciones; aplicarlo solo cuando esté disponible
    if tenant_id:
        try:
            session.execute(text("SELECT tenant_id FROM posts_redes_sociales LIMIT 1"))
            where.append("tenant_id = :tenant_id")
            params["tenant_id"] = tenant_id
        except Exception:
            pass

    for key, value in (filters or {}).items():
        column = filter_map.get(key)
        if not column:
            continue
        pname = f"f_{key}"
        where.append(f"{column} = :{pname}")
        params[pname] = value

    sql = text(
        f"""
        SELECT
          id,
          texto,
          plataforma,
          partido_id,
          fecha_publicacion,
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
