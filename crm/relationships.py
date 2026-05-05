"""CRM Relationships — Bloque 15."""
from __future__ import annotations
import json, logging, uuid
from typing import Any
from crm.schemas import Relationship
logger = logging.getLogger(__name__)
_RELATIONSHIPS: dict[str, Relationship] = {}

def add_relationship(rel: Relationship) -> Relationship:
    _RELATIONSHIPS[rel.relationship_id] = rel
    try:
        conn = _get_conn()
        if conn is None: return rel
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO crm_relationships (
                    relationship_id, source_object_type, source_object_id,
                    target_object_type, target_object_id, relationship_type,
                    confidence, evidence, start_date, end_date, source, tenant_id
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (relationship_id) DO NOTHING
            """, (
                rel.relationship_id, rel.source_object_type, rel.source_object_id,
                rel.target_object_type, rel.target_object_id, rel.relationship_type,
                rel.confidence, json.dumps(rel.evidence),
                rel.start_date, rel.end_date, rel.source, rel.tenant_id,
            ))
        conn.commit()
    except Exception as exc:
        logger.warning("add_relationship DB error: %s", exc)
    return rel

def get_relationships(object_type: str, object_id: str, tenant_id: str = "default") -> list[Relationship]:
    try:
        conn = _get_conn()
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM crm_relationships
                    WHERE (source_object_type=%s AND source_object_id=%s)
                       OR (target_object_type=%s AND target_object_id=%s)
                """, (object_type, object_id, object_type, object_id))
                return [_row_to_rel(r, cur.description) for r in cur.fetchall()]
    except Exception as exc:
        logger.debug("get_relationships DB error: %s", exc)
    return [r for r in _RELATIONSHIPS.values()
            if (r.source_object_type == object_type and r.source_object_id == object_id)
            or (r.target_object_type == object_type and r.target_object_id == object_id)]

def get_relationship_graph(object_type: str, object_id: str, depth: int = 2) -> dict:
    """Returns nodes and edges for a relationship graph."""
    nodes: dict[str, dict] = {f"{object_type}:{object_id}": {"id": object_id, "type": object_type, "depth": 0}}
    edges: list[dict] = []
    to_expand = [(object_type, object_id, 0)]
    while to_expand:
        ot, oid, d = to_expand.pop(0)
        if d >= depth: continue
        for rel in get_relationships(ot, oid):
            src_key = f"{rel.source_object_type}:{rel.source_object_id}"
            tgt_key = f"{rel.target_object_type}:{rel.target_object_id}"
            edges.append({"source": src_key, "target": tgt_key, "type": rel.relationship_type, "confidence": rel.confidence})
            if tgt_key not in nodes:
                nodes[tgt_key] = {"id": rel.target_object_id, "type": rel.target_object_type, "depth": d+1}
                to_expand.append((rel.target_object_type, rel.target_object_id, d+1))
    return {"nodes": list(nodes.values()), "edges": edges}

def find_bridge_contacts(topic: str | None = None, sector: str | None = None) -> list[dict]:
    """Finds contacts that bridge multiple relationship clusters."""
    from collections import Counter
    connection_count: Counter = Counter()
    for rel in _RELATIONSHIPS.values():
        if rel.source_object_type == "contact":
            connection_count[rel.source_object_id] += 1
        if rel.target_object_type == "contact":
            connection_count[rel.target_object_id] += 1
    top = [{"contact_id": cid, "connection_count": cnt} for cid, cnt in connection_count.most_common(10)]
    return top

def infer_relationships_from_actor_graph(object_id: str) -> list[Relationship]:
    """Tries to infer relationships from the actor graph (Bloque 4)."""
    try:
        from etl.sources.actores.actor_repository import get_actor_relations
        relations = get_actor_relations(object_id)
        result = []
        for r in (relations or []):
            rel = Relationship(
                source_object_type="organization",
                source_object_id=object_id,
                target_object_type="organization",
                target_object_id=r.get("target_id", "unknown"),
                relationship_type="influences",
                confidence=0.4,
                source="actor_graph_inference",
            )
            result.append(rel)
        return result
    except Exception:
        return []

def _get_conn() -> Any:
    try:
        from db.database import get_db_connection; return get_db_connection()
    except Exception: return None

def _row_to_rel(row: tuple, description: Any) -> Relationship:
    cols = [d[0] for d in description]; d = dict(zip(cols, row))
    ev = d.get("evidence") or []
    if isinstance(ev, str): ev = json.loads(ev)
    return Relationship(
        relationship_id=d["relationship_id"],
        source_object_type=d.get("source_object_type", "contact"),
        source_object_id=d.get("source_object_id", ""),
        target_object_type=d.get("target_object_type", "organization"),
        target_object_id=d.get("target_object_id", ""),
        relationship_type=d.get("relationship_type", "unknown"),
        confidence=float(d.get("confidence", 0.5)),
        evidence=ev,
        start_date=d.get("start_date"),
        end_date=d.get("end_date"),
        source=d.get("source", "manual"),
        tenant_id=d.get("tenant_id", "default"),
    )
