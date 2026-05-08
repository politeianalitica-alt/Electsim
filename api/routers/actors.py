"""
Router /api/actors — Actor Intelligence API
============================================

Endpoints:
  GET  /api/actors                       — listado con filtros
  GET  /api/actors/graph                 — nodos + edges para D3 force
  GET  /api/actors/{id}                  — detalle
  GET  /api/actors/{id}/mentions         — noticias asociadas
  GET  /api/actors/{id}/narratives       — narrativas asociadas
  GET  /api/actors/{id}/history          — serie de relevancia
  POST /api/actors                       — crear manualmente
  POST /api/actors/trigger-discovery     — disparar auto-discovery + ingest
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text

from api.dependencies import get_db
from services.intelligence.actor_engine import ActorEngine, PARTY_COLORS

router = APIRouter(prefix="/api/actors", tags=["actors"])


# ── Schemas ──────────────────────────────────────────────────────────────────
class ActorOut(BaseModel):
    id: str
    name: str
    party: Optional[str] = None
    party_color: str = "#94A3B8"
    role: Optional[str] = None
    bio: Optional[str] = None
    source: str = "manual"
    relevance_score: float = 0.0
    exposure: float = 0.0
    approval: float = 0.0
    sentiment: str = "stable"
    mention_count_24h: int = 0
    mention_count_7d: int = 0
    is_active: bool = True
    auto_created: bool = False
    created_at: str
    updated_at: str


class GraphOut(BaseModel):
    nodes: list[dict]
    edges: list[dict]


class MentionOut(BaseModel):
    id: str
    title: str
    url: Optional[str] = None
    source: Optional[str] = None
    published_at: Optional[str] = None
    sentiment: Optional[float] = None
    relevance: float = 0.5
    summary: Optional[str] = None


class NarrativeOut(BaseModel):
    id: str
    frame_label: str
    description: Optional[str] = None
    lifecycle: str
    velocity: str
    intensity: float
    first_seen_at: str
    last_seen_at: str


class CreateActorReq(BaseModel):
    name: str
    party: str = "Independiente"
    role: str = ""
    bio: str = ""


# ── Helpers ──────────────────────────────────────────────────────────────────
def _row_to_actor(r: dict) -> dict:
    return {
        "id":                str(r["id"]),
        "name":              r["name"],
        "party":             r.get("party"),
        "party_color":       r.get("party_color") or "#94A3B8",
        "role":              r.get("role"),
        "bio":               r.get("bio"),
        "source":            r.get("source", "manual"),
        "relevance_score":   float(r.get("relevance_score") or 0),
        "exposure":          float(r.get("exposure") or 0),
        "approval":          float(r.get("approval") or 0),
        "sentiment":         r.get("sentiment") or "stable",
        "mention_count_24h": int(r.get("mention_count_24h") or 0),
        "mention_count_7d":  int(r.get("mention_count_7d") or 0),
        "is_active":         bool(r.get("is_active", True)),
        "auto_created":      bool(r.get("auto_created", False)),
        "created_at":        r["created_at"].isoformat() if r.get("created_at") else "",
        "updated_at":        r["updated_at"].isoformat() if r.get("updated_at") else "",
    }


# ── Endpoints ────────────────────────────────────────────────────────────────
@router.get("", response_model=list[ActorOut])
def list_actors(
    partido: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=200),
    only_active: bool = True,
    db=Depends(get_db),
):
    where = []
    params: dict[str, Any] = {"lim": limit}
    if only_active:
        where.append("is_active = TRUE")
    if partido:
        where.append("party = :partido")
        params["partido"] = partido
    if search:
        where.append("LOWER(name) LIKE :search")
        params["search"] = f"%{search.lower()}%"

    sql = f"""
        SELECT * FROM actors
        {("WHERE " + " AND ".join(where)) if where else ""}
        ORDER BY relevance_score DESC, name ASC
        LIMIT :lim
    """
    rows = db.execute(text(sql), params).mappings().all()
    return [_row_to_actor(dict(r)) for r in rows]


@router.get("/graph", response_model=GraphOut)
def actor_graph(
    min_weight: float = Query(0.05, ge=0.0, le=1.0),
    relation_type: Optional[str] = None,
    partido: Optional[str] = None,
    limit_nodes: int = Query(80, ge=10, le=200),
    db=Depends(get_db),
):
    """Returns nodes + edges para grafo D3 force-directed."""
    where_actor = ["is_active = TRUE"]
    params_a: dict[str, Any] = {"lim": limit_nodes}
    if partido:
        where_actor.append("party = :partido")
        params_a["partido"] = partido

    actors = db.execute(text(f"""
        SELECT id, name, party, party_color, role, relevance_score, exposure,
               sentiment, mention_count_24h
        FROM actors
        WHERE {" AND ".join(where_actor)}
        ORDER BY relevance_score DESC, mention_count_7d DESC
        LIMIT :lim
    """), params_a).mappings().all()

    if not actors:
        return {"nodes": [], "edges": []}

    actor_ids = [str(a["id"]) for a in actors]
    nodes = [{
        "id":            str(a["id"]),
        "name":          a["name"],
        "party":         a.get("party") or "—",
        "color":         a.get("party_color") or "#94A3B8",
        "role":          a.get("role") or "",
        "relevance":     float(a.get("relevance_score") or 0),
        "exposure":      float(a.get("exposure") or 0),
        "sentiment":     a.get("sentiment") or "stable",
        "mentions_24h":  int(a.get("mention_count_24h") or 0),
        "group":         a.get("party") or "—",
    } for a in actors]

    # Edges con filtro
    where_edge = ["r.weight >= :w", "r.actor_a_id = ANY(:ids)", "r.actor_b_id = ANY(:ids)"]
    params_e: dict[str, Any] = {"w": min_weight, "ids": actor_ids}
    if relation_type:
        where_edge.append("r.relation_type = :rt")
        params_e["rt"] = relation_type

    edges_rows = db.execute(text(f"""
        SELECT r.id, r.actor_a_id, r.actor_b_id, r.relation_type, r.weight, r.direction
        FROM actor_relations r
        WHERE {" AND ".join(where_edge)}
        ORDER BY r.weight DESC
        LIMIT 400
    """), params_e).mappings().all()

    edges = [{
        "id":     str(e["id"]),
        "source": str(e["actor_a_id"]),
        "target": str(e["actor_b_id"]),
        "type":   e["relation_type"],
        "weight": float(e["weight"]),
        "label":  e["relation_type"],
    } for e in edges_rows]

    return {"nodes": nodes, "edges": edges}


@router.get("/{actor_id}", response_model=ActorOut)
def get_actor(actor_id: str, db=Depends(get_db)):
    row = db.execute(text("SELECT * FROM actors WHERE id::text = :id"),
                     {"id": actor_id}).mappings().fetchone()
    if not row:
        raise HTTPException(404, "Actor not found")
    return _row_to_actor(dict(row))


@router.get("/{actor_id}/mentions", response_model=list[MentionOut])
def get_actor_mentions(actor_id: str, limit: int = Query(20, le=100), db=Depends(get_db)):
    rows = db.execute(text("""
        SELECT * FROM actor_mentions
        WHERE actor_id::text = :id
        ORDER BY published_at DESC NULLS LAST
        LIMIT :lim
    """), {"id": actor_id, "lim": limit}).mappings().all()
    out = []
    for r in rows:
        out.append({
            "id":          str(r["id"]),
            "title":       r["title"],
            "url":         r.get("url"),
            "source":      r.get("source"),
            "published_at": r["published_at"].isoformat() if r.get("published_at") else None,
            "sentiment":   float(r["sentiment"]) if r.get("sentiment") is not None else None,
            "relevance":   float(r.get("relevance") or 0.5),
            "summary":     r.get("summary"),
        })
    return out


@router.get("/{actor_id}/narratives", response_model=list[NarrativeOut])
def get_actor_narratives(actor_id: str, db=Depends(get_db)):
    rows = db.execute(text("""
        SELECT * FROM actor_narratives
        WHERE actor_id::text = :id
        ORDER BY last_seen_at DESC
        LIMIT 50
    """), {"id": actor_id}).mappings().all()
    out = []
    for r in rows:
        out.append({
            "id":            str(r["id"]),
            "frame_label":   r["frame_label"],
            "description":   r.get("description"),
            "lifecycle":     r.get("lifecycle") or "emergente",
            "velocity":      r.get("velocity") or "estable",
            "intensity":     float(r.get("intensity") or 0.5),
            "first_seen_at": r["first_seen_at"].isoformat() if r.get("first_seen_at") else "",
            "last_seen_at":  r["last_seen_at"].isoformat() if r.get("last_seen_at") else "",
        })
    return out


@router.get("/{actor_id}/history")
def get_actor_history(actor_id: str, n: int = Query(30, le=120), db=Depends(get_db)):
    rows = db.execute(text("""
        SELECT score, recorded_at FROM actor_relevance_history
        WHERE actor_id::text = :id
        ORDER BY recorded_at DESC LIMIT :n
    """), {"id": actor_id, "n": n}).mappings().all()
    return [{"score": float(r["score"] or 0), "date": r["recorded_at"].isoformat() if r.get("recorded_at") else None}
            for r in rows]


@router.post("", response_model=ActorOut, status_code=201)
def create_actor(body: CreateActorReq, db=Depends(get_db)):
    party_color = PARTY_COLORS.get(body.party, "#94A3B8")
    try:
        row = db.execute(text("""
            INSERT INTO actors (name, party, party_color, role, bio, source)
            VALUES (:n, :p, :c, :r, :b, 'manual')
            RETURNING *
        """), {"n": body.name, "p": body.party, "c": party_color, "r": body.role, "b": body.bio}).mappings().fetchone()
        db.commit()
        return _row_to_actor(dict(row))
    except Exception as e:
        try: db.rollback()
        except Exception: pass
        # Si ya existe, devolver el existente
        row = db.execute(text("SELECT * FROM actors WHERE name = :n"), {"n": body.name}).mappings().fetchone()
        if row:
            return _row_to_actor(dict(row))
        raise HTTPException(500, f"create_actor failed: {e}")


@router.post("/trigger-discovery")
def trigger_discovery(
    lookback_hours: int = Query(48, ge=1, le=168),
    min_mentions: int = Query(3, ge=1, le=20),
    db=Depends(get_db),
):
    """Dispara: ingest de mentions + auto-discovery + recompute scores + relations.
    Idempotente."""
    engine = ActorEngine(conn=db)
    ingest = engine.ingest_news_articles_mentions(lookback_hours=lookback_hours)
    new_ids = engine.discover_new_actors_from_news(lookback_hours=lookback_hours, min_mentions=min_mentions)
    scores = engine.recompute_actor_scores()
    relations = engine.rebuild_relations_from_cooccurrence(window_days=30)
    return {
        "created": len(new_ids),
        "ids": new_ids,
        "ingest": ingest,
        "scores": scores,
        "relations": relations,
    }
