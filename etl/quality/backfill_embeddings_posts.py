from __future__ import annotations

import time

from sqlalchemy import text

from agents.llm import get_embedding_client
from db.session import SessionLocal

BATCH_SIZE = 256


def backfill_embeddings(max_batches: int | None = None, sleep_seconds: float = 0.05) -> int:
    client = get_embedding_client()
    updated = 0
    batches = 0
    while True:
        with SessionLocal() as session:
            rows = session.execute(
                text(
                    """
                    SELECT id, texto
                    FROM posts_redes_sociales
                    WHERE embedding IS NULL AND texto IS NOT NULL
                    ORDER BY id
                    LIMIT :limit
                    """
                ),
                {"limit": BATCH_SIZE},
            ).mappings().all()
            if not rows:
                break
            for row in rows:
                emb = client.embed_text(str(row["texto"]))
                session.execute(
                    text("UPDATE posts_redes_sociales SET embedding = CAST(:emb AS vector) WHERE id = :id"),
                    {"emb": emb, "id": row["id"]},
                )
                updated += 1
            session.commit()
        batches += 1
        if max_batches is not None and batches >= max_batches:
            break
        if sleep_seconds > 0:
            time.sleep(sleep_seconds)
    return updated


if __name__ == "__main__":
    print({"updated": backfill_embeddings()})
