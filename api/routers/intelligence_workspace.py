"""
Router /intelligence (workspace artefacts) — notebooks, canvas, evidence,
sources, drafts, watchlists, team, hypotheses.

Diseño:
  CRUD genérico para los 8 dominios. Cada uno usa una tabla independiente
  (intel_notebook, intel_canvas, …) creada en la migración 0059.

  El frontend visual-oscar (`app/api/intelligence/<dominio>/route.ts`) hace
  proxy a estos endpoints. La idea es que `_mock.ts` desaparezca y todo
  pase por backend real con persistencia.

Convenciones:
  - `workspace_id` viene por query (default='default') para multitenant suave.
  - Todas las respuestas tienen forma { items: [...] } para listas, o el objeto
    directo para detalles. Esto se alinea con el cliente tipado del frontend.
  - Si la tabla está vacía, devolvemos { items: [] } sin error.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime
from typing import Any, Optional

import psycopg
from fastapi import APIRouter, HTTPException, Query
from psycopg.rows import dict_row
from pydantic import BaseModel, Field

from config.settings import get_settings

router = APIRouter(prefix="/api/intelligence", tags=["intelligence-workspace"])
_settings = get_settings()


def _dsn() -> str:
    raw = _settings.database_url_raw
    return re.sub(r"postgresql\+\w+://", "postgresql://", raw)


def _conn():
    return psycopg.connect(_dsn(), row_factory=dict_row)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ─────────────────────────────────────────────────────────────────────────────
#  Schemas Pydantic — entradas comunes a todos los dominios
# ─────────────────────────────────────────────────────────────────────────────


class NotebookIn(BaseModel):
    title: str
    description: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    status: str = "draft"
    pinned: bool = False
    owner_id: Optional[str] = None
    data: dict[str, Any] = Field(default_factory=dict)


class CanvasIn(BaseModel):
    title: str
    description: Optional[str] = None
    nodes: list[Any] = Field(default_factory=list)
    edges: list[Any] = Field(default_factory=list)
    owner_id: Optional[str] = None
    data: dict[str, Any] = Field(default_factory=dict)


class EvidenceIn(BaseModel):
    title: str
    summary: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = None
    evidence_type: str = "article"
    relevance: float = 0.5
    tags: list[str] = Field(default_factory=list)
    data: dict[str, Any] = Field(default_factory=dict)


class SourceIn(BaseModel):
    name: str
    url: Optional[str] = None
    kind: str = "rss"
    sector: Optional[str] = None
    trust_score: float = 0.5
    active: bool = True
    tags: list[str] = Field(default_factory=list)
    data: dict[str, Any] = Field(default_factory=dict)


class DraftIn(BaseModel):
    title: str
    kind: str = "memo"
    audience: Optional[str] = None
    status: str = "draft"
    body: Optional[str] = None
    evidence_ids: list[str] = Field(default_factory=list)
    owner_id: Optional[str] = None
    data: dict[str, Any] = Field(default_factory=dict)


class WatchlistIn(BaseModel):
    name: str
    description: Optional[str] = None
    members: list[Any] = Field(default_factory=list)
    rules: dict[str, Any] = Field(default_factory=dict)
    severity: str = "medium"
    active: bool = True
    data: dict[str, Any] = Field(default_factory=dict)


class HypothesisIn(BaseModel):
    claim: str
    confidence: float = 0.5
    status: str = "open"
    evidence_ids: list[str] = Field(default_factory=list)
    counter_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    owner_id: Optional[str] = None
    data: dict[str, Any] = Field(default_factory=dict)


class TeamMemberIn(BaseModel):
    name: str
    email: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    permissions: list[str] = Field(default_factory=list)
    active: bool = True
    data: dict[str, Any] = Field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
#  CRUD genérico — DRY para los 8 dominios
# ─────────────────────────────────────────────────────────────────────────────


def _select_list(table: str, workspace_id: str, order_by: str, limit: int) -> list[dict]:
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                f"SELECT * FROM {table} WHERE workspace_id = %s ORDER BY {order_by} DESC LIMIT %s",
                (workspace_id, limit),
            )
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    except Exception:
        # Tabla puede no existir aún (migración 0059 no aplicada): devolver vacío.
        return []


def _select_one(table: str, id_: str) -> Optional[dict]:
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(f"SELECT * FROM {table} WHERE id = %s", (id_,))
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception:
        return None


def _delete_one(table: str, id_: str) -> bool:
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(f"DELETE FROM {table} WHERE id = %s RETURNING id", (id_,))
            return cur.fetchone() is not None
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────────────────────
#  Notebooks
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/notebooks")
def list_notebooks(workspace_id: str = "default", limit: int = Query(100, le=500)):
    items = _select_list("intel_notebook", workspace_id, "updated_at", limit)
    return {"items": items, "total": len(items)}


@router.get("/notebooks/{notebook_id}")
def get_notebook(notebook_id: str):
    nb = _select_one("intel_notebook", notebook_id)
    if not nb:
        raise HTTPException(404, "notebook_not_found")
    blocks = _select_list_blocks(notebook_id)
    nb["blocks"] = blocks
    return nb


def _select_list_blocks(notebook_id: str) -> list[dict]:
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                "SELECT * FROM intel_notebook_block WHERE notebook_id = %s ORDER BY position ASC",
                (notebook_id,),
            )
            return [dict(r) for r in cur.fetchall()]
    except Exception:
        return []


@router.post("/notebooks")
def create_notebook(payload: NotebookIn, workspace_id: str = "default"):
    nb_id = _new_id("nb")
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO intel_notebook (id, workspace_id, title, description, tags, status, pinned, owner_id, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                """,
                (
                    nb_id, workspace_id, payload.title, payload.description,
                    json.dumps(payload.tags), payload.status, payload.pinned,
                    payload.owner_id, json.dumps(payload.data),
                ),
            )
            return dict(cur.fetchone())
    except Exception as e:
        raise HTTPException(500, f"create_notebook_failed: {e}")


@router.put("/notebooks/{notebook_id}")
def update_notebook(notebook_id: str, payload: NotebookIn):
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                """
                UPDATE intel_notebook
                SET title = %s, description = %s, tags = %s, status = %s,
                    pinned = %s, data = %s, updated_at = now()
                WHERE id = %s RETURNING *
                """,
                (
                    payload.title, payload.description, json.dumps(payload.tags),
                    payload.status, payload.pinned, json.dumps(payload.data), notebook_id,
                ),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "notebook_not_found")
            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"update_failed: {e}")


@router.delete("/notebooks/{notebook_id}")
def delete_notebook(notebook_id: str):
    if not _delete_one("intel_notebook", notebook_id):
        raise HTTPException(404, "notebook_not_found")
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
#  Canvas
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/canvas")
def list_canvas(workspace_id: str = "default", limit: int = Query(100, le=500)):
    items = _select_list("intel_canvas", workspace_id, "updated_at", limit)
    return {"items": items, "total": len(items)}


@router.get("/canvas/{canvas_id}")
def get_canvas(canvas_id: str):
    c = _select_one("intel_canvas", canvas_id)
    if not c:
        raise HTTPException(404, "canvas_not_found")
    return c


@router.post("/canvas")
def create_canvas(payload: CanvasIn, workspace_id: str = "default"):
    cid = _new_id("cnv")
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO intel_canvas (id, workspace_id, title, description, nodes, edges, owner_id, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                """,
                (
                    cid, workspace_id, payload.title, payload.description,
                    json.dumps(payload.nodes), json.dumps(payload.edges),
                    payload.owner_id, json.dumps(payload.data),
                ),
            )
            return dict(cur.fetchone())
    except Exception as e:
        raise HTTPException(500, f"create_canvas_failed: {e}")


@router.delete("/canvas/{canvas_id}")
def delete_canvas(canvas_id: str):
    if not _delete_one("intel_canvas", canvas_id):
        raise HTTPException(404, "canvas_not_found")
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
#  Evidencias
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/evidencias")
def list_evidence(workspace_id: str = "default", limit: int = Query(100, le=500)):
    items = _select_list("intel_evidence", workspace_id, "captured_at", limit)
    return {"items": items, "total": len(items)}


@router.get("/evidencias/{evidence_id}")
def get_evidence(evidence_id: str):
    e = _select_one("intel_evidence", evidence_id)
    if not e:
        raise HTTPException(404, "evidence_not_found")
    return e


@router.post("/evidencias")
def create_evidence(payload: EvidenceIn, workspace_id: str = "default"):
    eid = _new_id("ev")
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO intel_evidence (id, workspace_id, title, summary, url, source,
                    evidence_type, relevance, tags, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                """,
                (
                    eid, workspace_id, payload.title, payload.summary, payload.url, payload.source,
                    payload.evidence_type, payload.relevance, json.dumps(payload.tags),
                    json.dumps(payload.data),
                ),
            )
            return dict(cur.fetchone())
    except Exception as e:
        raise HTTPException(500, f"create_evidence_failed: {e}")


@router.delete("/evidencias/{evidence_id}")
def delete_evidence(evidence_id: str):
    if not _delete_one("intel_evidence", evidence_id):
        raise HTTPException(404, "evidence_not_found")
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
#  Fuentes
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/fuentes")
def list_sources(workspace_id: str = "default", limit: int = Query(200, le=1000)):
    items = _select_list("intel_source", workspace_id, "last_seen_at NULLS LAST, created_at", limit)
    return {"items": items, "total": len(items)}


@router.get("/fuentes/{source_id}")
def get_source(source_id: str):
    s = _select_one("intel_source", source_id)
    if not s:
        raise HTTPException(404, "source_not_found")
    return s


@router.post("/fuentes")
def create_source(payload: SourceIn, workspace_id: str = "default"):
    sid = _new_id("src")
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO intel_source (id, workspace_id, name, url, kind, sector,
                    trust_score, active, tags, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                """,
                (
                    sid, workspace_id, payload.name, payload.url, payload.kind, payload.sector,
                    payload.trust_score, payload.active, json.dumps(payload.tags),
                    json.dumps(payload.data),
                ),
            )
            return dict(cur.fetchone())
    except Exception as e:
        raise HTTPException(500, f"create_source_failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
#  Drafts
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/drafts")
def list_drafts(workspace_id: str = "default", limit: int = Query(100, le=500)):
    items = _select_list("intel_draft", workspace_id, "updated_at", limit)
    return {"items": items, "total": len(items)}


@router.get("/drafts/{draft_id}")
def get_draft(draft_id: str):
    d = _select_one("intel_draft", draft_id)
    if not d:
        raise HTTPException(404, "draft_not_found")
    return d


@router.post("/drafts")
def create_draft(payload: DraftIn, workspace_id: str = "default"):
    did = _new_id("drf")
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO intel_draft (id, workspace_id, title, kind, audience, status,
                    body, evidence_ids, owner_id, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                """,
                (
                    did, workspace_id, payload.title, payload.kind, payload.audience, payload.status,
                    payload.body, json.dumps(payload.evidence_ids), payload.owner_id,
                    json.dumps(payload.data),
                ),
            )
            return dict(cur.fetchone())
    except Exception as e:
        raise HTTPException(500, f"create_draft_failed: {e}")


@router.put("/drafts/{draft_id}")
def update_draft(draft_id: str, payload: DraftIn):
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                """
                UPDATE intel_draft
                SET title = %s, kind = %s, audience = %s, status = %s, body = %s,
                    evidence_ids = %s, data = %s, updated_at = now()
                WHERE id = %s RETURNING *
                """,
                (
                    payload.title, payload.kind, payload.audience, payload.status, payload.body,
                    json.dumps(payload.evidence_ids), json.dumps(payload.data), draft_id,
                ),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "draft_not_found")
            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"update_failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
#  Watchlists
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/watchlists")
def list_watchlists(workspace_id: str = "default", limit: int = Query(100, le=500)):
    items = _select_list("intel_watchlist", workspace_id, "updated_at", limit)
    return {"items": items, "total": len(items)}


@router.post("/watchlists")
def create_watchlist(payload: WatchlistIn, workspace_id: str = "default"):
    wid = _new_id("wl")
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO intel_watchlist (id, workspace_id, name, description, members,
                    rules, severity, active, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                """,
                (
                    wid, workspace_id, payload.name, payload.description,
                    json.dumps(payload.members), json.dumps(payload.rules), payload.severity,
                    payload.active, json.dumps(payload.data),
                ),
            )
            return dict(cur.fetchone())
    except Exception as e:
        raise HTTPException(500, f"create_watchlist_failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
#  Hypotheses
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/hipotesis")
def list_hypotheses(workspace_id: str = "default", limit: int = Query(100, le=500)):
    items = _select_list("intel_hypothesis", workspace_id, "updated_at", limit)
    return {"items": items, "total": len(items)}


@router.post("/hipotesis")
def create_hypothesis(payload: HypothesisIn, workspace_id: str = "default"):
    hid = _new_id("hyp")
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO intel_hypothesis (id, workspace_id, claim, confidence, status,
                    evidence_ids, counter_ids, tags, owner_id, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                """,
                (
                    hid, workspace_id, payload.claim, payload.confidence, payload.status,
                    json.dumps(payload.evidence_ids), json.dumps(payload.counter_ids),
                    json.dumps(payload.tags), payload.owner_id, json.dumps(payload.data),
                ),
            )
            return dict(cur.fetchone())
    except Exception as e:
        raise HTTPException(500, f"create_hypothesis_failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
#  Team
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/team")
def list_team(workspace_id: str = "default", limit: int = Query(100, le=500)):
    items = _select_list("intel_team_member", workspace_id, "joined_at", limit)
    return {"items": items, "total": len(items)}


@router.post("/team")
def create_team_member(payload: TeamMemberIn, workspace_id: str = "default"):
    tid = _new_id("tm")
    try:
        with _conn() as cn, cn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO intel_team_member (id, workspace_id, name, email, role, avatar_url,
                    permissions, active, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                """,
                (
                    tid, workspace_id, payload.name, payload.email, payload.role, payload.avatar_url,
                    json.dumps(payload.permissions), payload.active, json.dumps(payload.data),
                ),
            )
            return dict(cur.fetchone())
    except Exception as e:
        raise HTTPException(500, f"create_team_member_failed: {e}")
