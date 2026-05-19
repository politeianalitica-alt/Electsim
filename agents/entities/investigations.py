"""InvestigationRepository · workspace investigation-centric (Pilar 2).

Una Investigation es el contenedor de trabajo del analista. Reemplaza el
modelo previo de "12 secciones planas" del workspace por un caso de
trabajo que agrupa:

  - Entidades fijadas (pinned)
  - Evidencias ingresadas (Admiralty)
  - Hipótesis (ACH)
  - Bloques de notebook
  - Estados de canvas
  - Versiones de briefings

Y un audit trail completo de las acciones del analista (analyst_events).

RLS lite (no PG-RLS, lógica en aplicación): filtramos siempre por
`owner_id` o `collaborators`. Compartir = añadir a `collaborators`.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from sqlalchemy import text as sql_text

from agents.entities.schemas import (
    Investigation, InvestigationCreate, InvestigationUpdate,
    PinnedEntity, Artifact, ArtifactCreate, AnalystEvent,
    InvestigationDetail, EntitySummary,
    EntityBacklinks, InvestigationRef, ArtifactRef,
)
from agents.entities.resolver import slugify
from agents.entities.repository import _get_engine, _json_dumps

logger = logging.getLogger(__name__)


class InvestigationRepository:
    """Acceso CRUD + pinned + artifacts + audit a investigations."""

    def __init__(self, engine=None) -> None:
        self.engine = engine or _get_engine()

    def _ensure_engine(self):
        if self.engine is None:
            self.engine = _get_engine()
        if self.engine is None:
            raise RuntimeError("InvestigationRepository: no engine (DATABASE_URL?)")
        # Auto-init de tablas en primer uso
        try:
            from agents.entities._schema import ensure_ontology_tables
            ensure_ontology_tables(self.engine)
        except Exception as exc:
            logger.debug("auto-init ontology (investigations): %s", exc)
        return self.engine

    # ─────────────────────────────────────────────────────────────
    # Investigation CRUD
    # ─────────────────────────────────────────────────────────────
    def create(self, data: InvestigationCreate) -> Investigation:
        engine = self._ensure_engine()
        slug = data.slug or slugify(data.title)
        with engine.begin() as conn:
            row = conn.execute(
                sql_text("""
                    INSERT INTO investigations
                        (slug, title, description, owner_id, status, tags,
                         payload, collaborators)
                    VALUES (:slug, :title, :description, :owner_id, :status, :tags,
                            CAST(:payload AS JSONB), :collaborators)
                    RETURNING *
                """),
                {
                    "slug": slug,
                    "title": data.title,
                    "description": data.description or "",
                    "owner_id": data.owner_id,
                    "status": data.status,
                    "tags": list(data.tags or []),
                    "payload": _json_dumps(data.payload or {}),
                    "collaborators": list(data.collaborators or []),
                },
            ).first()
            self._record_event(
                conn, investigation_id=row.id, actor_id=data.owner_id,
                verb="create_investigation", target_kind="investigation",
                target_id=row.id, payload={"title": data.title},
            )
        return _row_to_investigation(row)

    def update(self, inv_id: int, patch: InvestigationUpdate, *, actor_id: str) -> Investigation | None:
        engine = self._ensure_engine()
        sets: list[str] = []
        params: dict[str, Any] = {"id": inv_id}
        for field, value in patch.model_dump(exclude_unset=True).items():
            if field == "payload" and value is not None:
                sets.append("payload = investigations.payload || CAST(:payload AS JSONB)")
                params["payload"] = _json_dumps(value)
                continue
            sets.append(f"{field} = :{field}")
            params[field] = value
        if not sets:
            return self.get(inv_id)
        sets.append("updated_at = NOW()")
        sql = f"UPDATE investigations SET {', '.join(sets)} WHERE id = :id RETURNING *"
        with engine.begin() as conn:
            row = conn.execute(sql_text(sql), params).first()
            if row:
                self._record_event(
                    conn, investigation_id=inv_id, actor_id=actor_id,
                    verb="update_investigation",
                    target_kind="investigation", target_id=inv_id,
                    payload={"fields": list(patch.model_dump(exclude_unset=True).keys())},
                )
        return _row_to_investigation(row) if row else None

    def archive(self, inv_id: int, *, actor_id: str) -> bool:
        engine = self._ensure_engine()
        with engine.begin() as conn:
            r = conn.execute(
                sql_text("""
                    UPDATE investigations
                    SET status = 'archived', archived_at = NOW(), updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": inv_id},
            )
            ok = bool(r.rowcount)
            if ok:
                self._record_event(
                    conn, investigation_id=inv_id, actor_id=actor_id,
                    verb="archive_investigation",
                    target_kind="investigation", target_id=inv_id,
                )
        return ok

    def get(self, inv_id: int) -> Investigation | None:
        engine = self._ensure_engine()
        with engine.connect() as conn:
            row = conn.execute(
                sql_text("SELECT * FROM investigations WHERE id = :id"),
                {"id": inv_id},
            ).first()
        return _row_to_investigation(row) if row else None

    def get_by_slug(self, slug: str) -> Investigation | None:
        engine = self._ensure_engine()
        with engine.connect() as conn:
            row = conn.execute(
                sql_text("SELECT * FROM investigations WHERE slug = :slug"),
                {"slug": slug},
            ).first()
        return _row_to_investigation(row) if row else None

    def list_for_owner(
        self, owner_id: str, *,
        status: str | None = "active",
        limit: int = 50,
    ) -> list[Investigation]:
        engine = self._ensure_engine()
        clauses = ["(owner_id = :oid OR :oid = ANY(collaborators))"]
        params: dict[str, Any] = {"oid": owner_id, "limit": limit}
        if status:
            clauses.append("status = :status")
            params["status"] = status
        sql = (
            f"SELECT * FROM investigations WHERE {' AND '.join(clauses)} "
            "ORDER BY updated_at DESC LIMIT :limit"
        )
        with engine.connect() as conn:
            rows = conn.execute(sql_text(sql), params).all()
        return [_row_to_investigation(r) for r in rows]

    # ─────────────────────────────────────────────────────────────
    # Pinned entities
    # ─────────────────────────────────────────────────────────────
    def pin_entity(
        self, *, investigation_id: int, entity_id: int,
        pinned_by: str, note: str = "", position: int = 0,
    ) -> PinnedEntity:
        engine = self._ensure_engine()
        with engine.begin() as conn:
            row = conn.execute(
                sql_text("""
                    INSERT INTO inv_pinned
                        (investigation_id, entity_id, position, note, pinned_by)
                    VALUES (:inv, :ent, :pos, :note, :by)
                    ON CONFLICT (investigation_id, entity_id) DO UPDATE SET
                        position = EXCLUDED.position,
                        note = COALESCE(NULLIF(EXCLUDED.note, ''), inv_pinned.note)
                    RETURNING *
                """),
                {
                    "inv": investigation_id, "ent": entity_id,
                    "pos": position, "note": note, "by": pinned_by,
                },
            ).first()
            self._record_event(
                conn, investigation_id=investigation_id, actor_id=pinned_by,
                verb="pin_entity", target_kind="entity", target_id=entity_id,
                entity_id=entity_id,
            )
        return _row_to_pinned(row)

    def unpin_entity(self, *, investigation_id: int, entity_id: int, actor_id: str) -> bool:
        engine = self._ensure_engine()
        with engine.begin() as conn:
            r = conn.execute(
                sql_text("""
                    DELETE FROM inv_pinned
                    WHERE investigation_id = :inv AND entity_id = :ent
                """),
                {"inv": investigation_id, "ent": entity_id},
            )
            ok = bool(r.rowcount)
            if ok:
                self._record_event(
                    conn, investigation_id=investigation_id, actor_id=actor_id,
                    verb="unpin_entity", target_kind="entity",
                    target_id=entity_id, entity_id=entity_id,
                )
        return ok

    def list_pinned(self, investigation_id: int, *, hydrate: bool = True) -> list[PinnedEntity]:
        engine = self._ensure_engine()
        with engine.connect() as conn:
            if hydrate:
                rows = conn.execute(sql_text("""
                    SELECT p.*,
                           e.id AS e_id, e.kind AS e_kind, e.slug AS e_slug,
                           e.qid AS e_qid, e.display_name AS e_display_name,
                           e.tags AS e_tags
                    FROM inv_pinned p
                    JOIN entities e ON e.id = p.entity_id
                    WHERE p.investigation_id = :inv
                    ORDER BY p.position ASC, p.pinned_at ASC
                """), {"inv": investigation_id}).all()
            else:
                rows = conn.execute(sql_text("""
                    SELECT * FROM inv_pinned
                    WHERE investigation_id = :inv
                    ORDER BY position ASC, pinned_at ASC
                """), {"inv": investigation_id}).all()
        return [_row_to_pinned(r, hydrate=hydrate) for r in rows]

    # ─────────────────────────────────────────────────────────────
    # Artifacts (notebook, hypothesis, evidence, canvas, brief)
    # ─────────────────────────────────────────────────────────────
    def add_artifact(
        self, investigation_id: int, data: ArtifactCreate,
    ) -> Artifact:
        engine = self._ensure_engine()
        with engine.begin() as conn:
            row = conn.execute(
                sql_text("""
                    INSERT INTO inv_artifacts
                        (investigation_id, artifact_kind, title, payload,
                         position, entity_refs, author_id, parent_id)
                    VALUES (:inv, :kind, :title, CAST(:payload AS JSONB),
                            :pos, :refs, :author, :parent)
                    RETURNING *
                """),
                {
                    "inv": investigation_id,
                    "kind": data.artifact_kind, "title": data.title,
                    "payload": _json_dumps(data.payload or {}),
                    "pos": data.position,
                    "refs": list(data.entity_refs or []),
                    "author": data.author_id,
                    "parent": data.parent_id,
                },
            ).first()
            self._record_event(
                conn, investigation_id=investigation_id, actor_id=data.author_id,
                verb=f"add_{data.artifact_kind}",
                target_kind="artifact", target_id=row.id,
                payload={"title": data.title},
            )
        return _row_to_artifact(row)

    def list_artifacts(
        self,
        investigation_id: int,
        *,
        kind: str | None = None,
        include_archived: bool = False,
    ) -> list[Artifact]:
        engine = self._ensure_engine()
        clauses = ["investigation_id = :inv"]
        params: dict[str, Any] = {"inv": investigation_id}
        if kind:
            clauses.append("artifact_kind = :kind")
            params["kind"] = kind
        if not include_archived:
            clauses.append("archived_at IS NULL")
        sql = (
            f"SELECT * FROM inv_artifacts WHERE {' AND '.join(clauses)} "
            "ORDER BY artifact_kind ASC, position ASC, created_at ASC"
        )
        with engine.connect() as conn:
            rows = conn.execute(sql_text(sql), params).all()
        return [_row_to_artifact(r) for r in rows]

    # ─────────────────────────────────────────────────────────────
    # Detail hidratada
    # ─────────────────────────────────────────────────────────────
    def get_detail(self, inv_id: int) -> InvestigationDetail | None:
        inv = self.get(inv_id)
        if not inv:
            return None
        pinned = self.list_pinned(inv_id, hydrate=True)
        artifacts = self.list_artifacts(inv_id)
        events = self.recent_events(inv_id, limit=30)
        counts = {
            "pinned": len(pinned),
            "notebook_blocks": sum(1 for a in artifacts if a.artifact_kind == "notebook_block"),
            "evidence": sum(1 for a in artifacts if a.artifact_kind == "evidence"),
            "hypotheses": sum(1 for a in artifacts if a.artifact_kind == "hypothesis"),
            "brief_versions": sum(1 for a in artifacts if a.artifact_kind == "brief_version"),
            "events": len(events),
        }
        return InvestigationDetail(
            **inv.model_dump(),
            pinned=pinned,
            artifacts=artifacts,
            recent_events=events,
            counts=counts,
        )

    # ─────────────────────────────────────────────────────────────
    # Audit / events
    # ─────────────────────────────────────────────────────────────
    def _record_event(
        self, conn, *, investigation_id: int | None, actor_id: str,
        verb: str, target_kind: str | None = None,
        target_id: int | None = None, entity_id: int | None = None,
        payload: dict | None = None,
    ) -> None:
        conn.execute(
            sql_text("""
                INSERT INTO analyst_events
                    (investigation_id, actor_id, verb, target_kind,
                     target_id, entity_id, payload)
                VALUES (:inv, :actor, :verb, :tk, :tid, :eid, CAST(:payload AS JSONB))
            """),
            {
                "inv": investigation_id, "actor": actor_id,
                "verb": verb, "tk": target_kind, "tid": target_id,
                "eid": entity_id,
                "payload": _json_dumps(payload or {}),
            },
        )

    def record_event(
        self,
        *,
        investigation_id: int | None,
        actor_id: str, verb: str,
        target_kind: str | None = None,
        target_id: int | None = None,
        entity_id: int | None = None,
        payload: dict | None = None,
    ) -> None:
        engine = self._ensure_engine()
        with engine.begin() as conn:
            self._record_event(
                conn,
                investigation_id=investigation_id, actor_id=actor_id, verb=verb,
                target_kind=target_kind, target_id=target_id, entity_id=entity_id,
                payload=payload,
            )

    # ─────────────────────────────────────────────────────────────
    # Backlinks · investigaciones / artifacts que mencionan una entity
    # ─────────────────────────────────────────────────────────────
    def backlinks_for_entity(
        self,
        entity_id: int,
        *,
        owner_id: str | None = None,
        limit: int = 50,
    ) -> EntityBacklinks:
        """Devuelve dónde aparece una entity dentro del workspace.

        Resiliente: si las tablas no existen aún (BD fresca sin alembic
        upgrade), devuelve listas vacías en lugar de propagar el error.

        El filtro por `owner_id` aplica RLS lite: solo se cuentan
        investigaciones del propio analista (o donde es collaborator).
        Si owner_id=None devuelve todo (uso interno).
        """
        try:
            engine = self._ensure_engine()
        except RuntimeError:
            return EntityBacklinks(entity_id=entity_id)

        rls = ""
        params: dict[str, Any] = {"eid": entity_id, "limit": limit}
        if owner_id:
            rls = " AND (i.owner_id = :oid OR :oid = ANY(i.collaborators))"
            params["oid"] = owner_id

        try:
            with engine.connect() as conn:
                # 1) Investigations donde la entity está pinned
                inv_rows = conn.execute(
                    sql_text(f"""
                        SELECT i.id, i.slug, i.title, i.status, i.updated_at,
                               p.position AS pinned_position, p.note AS pinned_note
                        FROM investigations i
                        JOIN inv_pinned p ON p.investigation_id = i.id
                        WHERE p.entity_id = :eid
                          AND i.archived_at IS NULL{rls}
                        ORDER BY i.updated_at DESC
                        LIMIT :limit
                    """),
                    params,
                ).all()

                # 2) Artifacts que referencian la entity (via entity_refs array)
                art_rows = conn.execute(
                    sql_text(f"""
                        SELECT a.id, a.investigation_id, a.artifact_kind,
                               COALESCE(NULLIF(a.title, ''), 'sin título') AS title,
                               a.updated_at,
                               i.slug AS investigation_slug,
                               i.title AS investigation_title
                        FROM inv_artifacts a
                        JOIN investigations i ON i.id = a.investigation_id
                        WHERE :eid = ANY(a.entity_refs)
                          AND a.archived_at IS NULL
                          AND i.archived_at IS NULL{rls}
                        ORDER BY a.updated_at DESC
                        LIMIT :limit
                    """),
                    params,
                ).all()
        except Exception as exc:
            logger.debug("backlinks_for_entity: query falló (tablas inexistentes?): %s", exc)
            return EntityBacklinks(entity_id=entity_id)

        investigations = [
            InvestigationRef.model_validate({**dict(r._mapping)})
            for r in inv_rows
        ]
        artifact_refs = [
            ArtifactRef.model_validate({**dict(r._mapping)})
            for r in art_rows
        ]
        return EntityBacklinks(
            entity_id=entity_id,
            investigations=investigations,
            artifact_refs=artifact_refs,
            total_pinned=len(investigations),
            total_artifact_refs=len(artifact_refs),
        )

    def recent_events(self, investigation_id: int, *, limit: int = 30) -> list[AnalystEvent]:
        engine = self._ensure_engine()
        with engine.connect() as conn:
            rows = conn.execute(
                sql_text("""
                    SELECT * FROM analyst_events
                    WHERE investigation_id = :inv
                    ORDER BY ts DESC
                    LIMIT :limit
                """),
                {"inv": investigation_id, "limit": limit},
            ).all()
        return [_row_to_event(r) for r in rows]


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def _row_to_investigation(row: Any) -> Investigation:
    m = dict(row._mapping)
    m["tags"] = list(m.get("tags") or [])
    m["collaborators"] = list(m.get("collaborators") or [])
    m["payload"] = dict(m.get("payload") or {})
    return Investigation.model_validate(m)


def _row_to_pinned(row: Any, *, hydrate: bool = False) -> PinnedEntity:
    m = dict(row._mapping)
    if hydrate and m.get("e_id"):
        entity = EntitySummary(
            id=m["e_id"], kind=m["e_kind"], slug=m["e_slug"],
            qid=m.get("e_qid"), display_name=m["e_display_name"],
            tags=list(m.get("e_tags") or []),
        )
        m["entity"] = entity
    return PinnedEntity.model_validate(m)


def _row_to_artifact(row: Any) -> Artifact:
    m = dict(row._mapping)
    m["payload"] = dict(m.get("payload") or {})
    m["entity_refs"] = list(m.get("entity_refs") or [])
    return Artifact.model_validate(m)


def _row_to_event(row: Any) -> AnalystEvent:
    m = dict(row._mapping)
    m["payload"] = dict(m.get("payload") or {})
    return AnalystEvent.model_validate(m)


_INV_REPO: InvestigationRepository | None = None


def get_investigation_repository() -> InvestigationRepository:
    global _INV_REPO
    if _INV_REPO is None:
        _INV_REPO = InvestigationRepository()
    return _INV_REPO


def reset_investigation_repository() -> None:
    global _INV_REPO
    _INV_REPO = None
