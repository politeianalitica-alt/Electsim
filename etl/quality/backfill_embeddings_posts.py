from __future__ import annotations

from sqlalchemy import text

from agents.llm import get_embedding_client
from db.session import SessionLocal

BATCH_SIZE = 128


def backfill_embeddings() -> int:
    client = get_embedding_client()
    updated = 0
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
        for row in rows:
            emb = client.embed_text(str(row["texto"]))
            session.execute(
                text("UPDATE posts_redes_sociales SET embedding = CAST(:emb AS vector) WHERE id = :id"),
                {"emb": emb, "id": row["id"]},
            )
            updated += 1
        session.commit()
    return updated


if __name__ == "__main__":
    print({"updated": backfill_embeddings()})
