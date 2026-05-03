"""
Constructor del grafo de poder en Neo4j (Bloque 3).

Cada articulo con dos o mas entidades resueltas genera aristas
de co-mencion. Ollama infiere el tipo de relacion (ALIANZA, CONFLICTO, etc.)
a partir del contexto compartido.

Usa MERGE para que el grafo sea acumulativo:
  - Nodos: (:Entidad {qid, nombre, tipo})
  - Aristas: [:RELACION {tipo, peso, ultimo_articulo, sentimiento}]

Si Neo4j no esta disponible, las aristas se almacenan en PostgreSQL
en una tabla de respaldo (entity_graph_edges) para que el dashboard
pueda seguir funcionando.

Variables de entorno:
  NEO4J_URI      — bolt://localhost:7687
  NEO4J_USER     — neo4j
  NEO4J_PASSWORD — password
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

from .models import GraphEdge, RelationType

log = logging.getLogger(__name__)

_NEO4J_URI      = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
_NEO4J_USER     = os.getenv("NEO4J_USER",     "neo4j")
_NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL    = os.getenv("GRAPH_OLLAMA_MODEL", "politeia-brain:latest")


# ---------------------------------------------------------------------------
# Inferencia del tipo de relacion con Ollama
# ---------------------------------------------------------------------------

_RELATION_PROMPT = """\
Dado el siguiente contexto de un articulo periodistico espanol,
clasifica la relacion entre las dos entidades mencionadas.

ENTIDAD A: {a}
ENTIDAD B: {b}
CONTEXTO: {ctx}

Tipos de relacion disponibles:
  ALIANZA       — cooperacion explicita, acuerdo, apoyo mutuo
  CONFLICTO     — enfrentamiento, critica directa, oposicion
  SUBORDINACION — jerarquia, dependencia, mandato
  COALICION     — alianza de gobierno o electoral
  ACUSACION     — acusacion formal o informal de delito o irregularidad
  NEGOCIACION   — dialogo en curso, negociacion, mediacion
  COAUTORIA     — autoria conjunta de propuesta o declaracion
  NEUTRAL       — co-mencion sin relacion clara

Responde solo con el tipo exacto (una palabra en mayusculas)."""


def _infer_relation(
    entity_a: str,
    entity_b: str,
    context: str,
) -> RelationType:
    """Usa Ollama para inferir el tipo de relacion entre dos entidades."""
    prompt = _RELATION_PROMPT.format(
        a=entity_a, b=entity_b, ctx=context[:400]
    )
    try:
        import httpx  # type: ignore
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                f"{_OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": _OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0},
                },
            )
            resp.raise_for_status()
            answer = resp.json().get("response", "").strip().upper().split()[0]
            try:
                return RelationType(answer)
            except ValueError:
                return RelationType.NEUTRAL
    except Exception as exc:
        log.debug("Error infiriendo relacion: %s", exc)
        return RelationType.NEUTRAL


# ---------------------------------------------------------------------------
# Cliente Neo4j
# ---------------------------------------------------------------------------

def _get_neo4j_driver():
    """Retorna un driver Neo4j o None si no esta disponible."""
    try:
        from neo4j import GraphDatabase  # type: ignore
        driver = GraphDatabase.driver(_NEO4J_URI, auth=(_NEO4J_USER, _NEO4J_PASSWORD))
        driver.verify_connectivity()
        return driver
    except ImportError:
        log.debug("neo4j-driver no instalado; usando fallback PostgreSQL")
    except Exception as exc:
        log.debug("Neo4j no disponible: %s; usando fallback PostgreSQL", exc)
    return None


# ---------------------------------------------------------------------------
# MERGE en Neo4j
# ---------------------------------------------------------------------------

def _merge_neo4j(driver, edges: list[GraphEdge]) -> int:
    """Inserta o actualiza aristas en Neo4j usando MERGE."""
    merged = 0
    with driver.session() as session:
        for e in edges:
            session.run(
                """
                MERGE (a:Entidad {qid: $src})
                MERGE (b:Entidad {qid: $tgt})
                MERGE (a)-[r:RELACION {tipo: $rtype}]->(b)
                ON CREATE SET
                    r.peso           = 1,
                    r.sentimiento    = $sent,
                    r.ultimo_at      = $pub_at,
                    r.ultimo_articulo = $url
                ON MATCH SET
                    r.peso           = r.peso + 1,
                    r.sentimiento    = (r.sentimiento + $sent) / 2.0,
                    r.ultimo_at      = $pub_at,
                    r.ultimo_articulo = $url
                """,
                src=e.source_qid,
                tgt=e.target_qid,
                rtype=e.relation_type.value,
                sent=e.sentiment,
                pub_at=e.published_at.isoformat() if e.published_at else "",
                url=e.article_url[:200],
            )
            merged += 1
    return merged


# ---------------------------------------------------------------------------
# Fallback PostgreSQL
# ---------------------------------------------------------------------------

def _merge_postgres(edges: list[GraphEdge], conn) -> int:
    """
    Upsert de aristas en la tabla entity_graph_edges (si existe).
    No necesita Neo4j.
    """
    inserted = 0
    try:
        with conn.cursor() as cur:
            # Asegurar que la tabla existe (idempotente)
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS entity_graph_edges (
                    id          BIGSERIAL PRIMARY KEY,
                    source_qid  VARCHAR(20) NOT NULL,
                    target_qid  VARCHAR(20) NOT NULL,
                    rel_type    VARCHAR(20) NOT NULL,
                    peso        INTEGER DEFAULT 1,
                    sentimiento FLOAT DEFAULT 0,
                    ultimo_at   TIMESTAMPTZ,
                    ultimo_url  TEXT,
                    UNIQUE (source_qid, target_qid, rel_type)
                )
                """
            )
            for e in edges:
                cur.execute(
                    """
                    INSERT INTO entity_graph_edges
                        (source_qid, target_qid, rel_type, peso, sentimiento, ultimo_at, ultimo_url)
                    VALUES (%s, %s, %s, 1, %s, %s, %s)
                    ON CONFLICT (source_qid, target_qid, rel_type) DO UPDATE SET
                        peso        = entity_graph_edges.peso + 1,
                        sentimiento = (entity_graph_edges.sentimiento + EXCLUDED.sentimiento) / 2.0,
                        ultimo_at   = EXCLUDED.ultimo_at,
                        ultimo_url  = EXCLUDED.ultimo_url
                    """,
                    (
                        e.source_qid,
                        e.target_qid,
                        e.relation_type.value,
                        e.sentiment,
                        e.published_at,
                        e.article_url[:200],
                    ),
                )
                inserted += 1
    except Exception as exc:
        log.warning("Error en fallback postgres graph: %s", exc)
    return inserted


# ---------------------------------------------------------------------------
# Extraccion de aristas desde entity_mentions
# ---------------------------------------------------------------------------

def extract_edges_from_articles(conn, lookback_hours: int = 24) -> list[GraphEdge]:
    """
    Lee entity_mentions y genera aristas para pares de entidades
    co-mencionadas en el mismo articulo.
    """
    edges: list[GraphEdge] = []
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    a.qid, b.qid,
                    a.article_url,
                    a.published_at,
                    a.sentiment,
                    a.context_window
                FROM entity_mentions a
                JOIN entity_mentions b
                    ON a.article_url = b.article_url
                   AND a.qid < b.qid   -- evitar duplicados A-B / B-A
                WHERE a.published_at >= NOW() - INTERVAL '%s hours'
                  AND a.qid IS NOT NULL AND b.qid IS NOT NULL
                LIMIT 500
                """,
                (lookback_hours,),
            )
            rows = cur.fetchall()
    except Exception as exc:
        log.warning("Error extrayendo aristas: %s", exc)
        return []

    # Obtener nombres de entidades para el prompt de relacion
    qid_to_name: dict[str, str] = {}
    all_qids = set()
    for row in rows:
        all_qids.add(row[0])
        all_qids.add(row[1])

    if all_qids:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT qid, nombre_oficial FROM entities_canonical WHERE qid = ANY(%s)",
                    (list(all_qids),),
                )
                for r in cur.fetchall():
                    qid_to_name[r[0]] = r[1]
        except Exception:
            pass

    for row in rows:
        src_qid, tgt_qid, article_url, pub_at, sentiment, context = row
        src_name = qid_to_name.get(src_qid, src_qid)
        tgt_name = qid_to_name.get(tgt_qid, tgt_qid)

        # Inferir tipo de relacion
        rel_type = _infer_relation(src_name, tgt_name, context or "")

        edges.append(
            GraphEdge(
                source_qid=src_qid,
                target_qid=tgt_qid,
                relation_type=rel_type,
                article_url=article_url or "",
                published_at=pub_at,
                sentiment=float(sentiment or 0.0),
                context=context or "",
            )
        )

    return edges


# ---------------------------------------------------------------------------
# Funcion principal
# ---------------------------------------------------------------------------

def build_graph(conn, lookback_hours: int = 24) -> dict[str, int]:
    """
    Extrae aristas y las persiste en Neo4j (o fallback PostgreSQL).

    Returns:
      {"edges_extracted": N, "edges_merged": M}
    """
    edges = extract_edges_from_articles(conn, lookback_hours)
    log.info("graph_builder: %d aristas extraidas", len(edges))

    if not edges:
        return {"edges_extracted": 0, "edges_merged": 0}

    merged = 0
    driver = _get_neo4j_driver()
    if driver:
        try:
            merged = _merge_neo4j(driver, edges)
            driver.close()
        except Exception as exc:
            log.warning("Error en Neo4j MERGE: %s; usando fallback", exc)
            merged = _merge_postgres(edges, conn)
    else:
        merged = _merge_postgres(edges, conn)

    return {"edges_extracted": len(edges), "edges_merged": merged}
