"""Ontology unificada (entities + entity_links) + Investigations workspace.

Revision ID: 0063
Revises: 0062
Create Date: 2026-05-18

Crea el core del modelo Object-Centric estilo Palantir Gotham:

  entities         · objeto canónico (persona, partido, ley, evento, territorio,
                     medio, documento, sector, narrativa, tema). Cualquier entidad
                     del dominio Politeia se referencia por su entity_id interno.
                     Conserva qid Wikidata cuando exista y slug humano legible.

  entity_links     · relaciones tipadas entre entities (member_of, president_of,
                     votes_for, mentions, located_in, criticizes, ...).
                     Con confidence + evidencia (URL o entity_id de documento).

  investigations   · caso/investigación de un analista. Contenedor de trabajo:
                     pinned_entities + evidence + hypotheses + notebook + canvas
                     + briefs + audit. La unidad de "trabajo analítico" en el
                     workspace, no las páginas sueltas.

  inv_pinned       · entidades fijadas a una investigación.
  inv_artifacts    · artefactos de trabajo (notebook_block, hypothesis, evidence,
                     canvas_state, brief_version) con tipo + payload jsonb.
  analyst_events   · audit + timeline · cada acción del analista (verb + target).

Todo con `valid_from`/`valid_to` para temporalidad real (ej. "presidente de la
Junta hasta 2018" coexiste con "presidente de la Junta desde 2018").
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0063"
down_revision = "0062"
branch_labels = None
depends_on = None


# ─────────────────────────────────────────────────────────────────
# UP
# ─────────────────────────────────────────────────────────────────

def upgrade() -> None:
    # ── entities ─────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS entities (
            id           BIGSERIAL PRIMARY KEY,
            kind         TEXT NOT NULL,
            slug         TEXT NOT NULL,
            qid          TEXT,
            display_name TEXT NOT NULL,
            aliases      TEXT[] DEFAULT ARRAY[]::TEXT[],
            payload      JSONB DEFAULT '{}'::jsonb,
            tags         TEXT[] DEFAULT ARRAY[]::TEXT[],
            confidence   REAL DEFAULT 1.0,
            source       TEXT DEFAULT 'curated',
            valid_from   TIMESTAMPTZ,
            valid_to     TIMESTAMPTZ,
            created_at   TIMESTAMPTZ DEFAULT NOW(),
            updated_at   TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT entities_kind_slug_unique UNIQUE (kind, slug)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_entities_kind ON entities(kind)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_entities_qid ON entities(qid) WHERE qid IS NOT NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_entities_display_lower ON entities(LOWER(display_name))")
    op.execute("CREATE INDEX IF NOT EXISTS ix_entities_payload ON entities USING GIN (payload)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_entities_tags ON entities USING GIN (tags)")

    # ── entity_links ─────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS entity_links (
            id           BIGSERIAL PRIMARY KEY,
            src_id       BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
            dst_id       BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
            link_kind    TEXT NOT NULL,
            confidence   REAL DEFAULT 1.0,
            evidence_url TEXT,
            evidence_id  BIGINT REFERENCES entities(id) ON DELETE SET NULL,
            payload      JSONB DEFAULT '{}'::jsonb,
            valid_from   TIMESTAMPTZ,
            valid_to     TIMESTAMPTZ,
            created_at   TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT entity_links_unique UNIQUE (src_id, dst_id, link_kind, valid_from)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_entity_links_src ON entity_links(src_id, link_kind)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_entity_links_dst ON entity_links(dst_id, link_kind)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_entity_links_kind ON entity_links(link_kind)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_entity_links_active ON entity_links(src_id, link_kind) WHERE valid_to IS NULL")

    # ── investigations ───────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS investigations (
            id           BIGSERIAL PRIMARY KEY,
            slug         TEXT NOT NULL UNIQUE,
            title        TEXT NOT NULL,
            description  TEXT DEFAULT '',
            owner_id     TEXT NOT NULL,
            status       TEXT NOT NULL DEFAULT 'active',
            tags         TEXT[] DEFAULT ARRAY[]::TEXT[],
            payload      JSONB DEFAULT '{}'::jsonb,
            collaborators TEXT[] DEFAULT ARRAY[]::TEXT[],
            created_at   TIMESTAMPTZ DEFAULT NOW(),
            updated_at   TIMESTAMPTZ DEFAULT NOW(),
            archived_at  TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_investigations_owner ON investigations(owner_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_investigations_status ON investigations(status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_investigations_tags ON investigations USING GIN (tags)")

    # ── inv_pinned (entidades fijadas a una investigación) ──────
    op.execute("""
        CREATE TABLE IF NOT EXISTS inv_pinned (
            id              BIGSERIAL PRIMARY KEY,
            investigation_id BIGINT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
            entity_id       BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
            position        INTEGER NOT NULL DEFAULT 0,
            note            TEXT DEFAULT '',
            pinned_by       TEXT NOT NULL,
            pinned_at       TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT inv_pinned_unique UNIQUE (investigation_id, entity_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_inv_pinned_inv ON inv_pinned(investigation_id, position)")

    # ── inv_artifacts (notebook block, evidence, hypothesis, ...) ─
    op.execute("""
        CREATE TABLE IF NOT EXISTS inv_artifacts (
            id               BIGSERIAL PRIMARY KEY,
            investigation_id BIGINT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
            artifact_kind    TEXT NOT NULL,
            title            TEXT DEFAULT '',
            payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
            position         INTEGER NOT NULL DEFAULT 0,
            entity_refs      BIGINT[] DEFAULT ARRAY[]::BIGINT[],
            author_id        TEXT NOT NULL,
            version          INTEGER NOT NULL DEFAULT 1,
            parent_id        BIGINT REFERENCES inv_artifacts(id) ON DELETE SET NULL,
            created_at       TIMESTAMPTZ DEFAULT NOW(),
            updated_at       TIMESTAMPTZ DEFAULT NOW(),
            archived_at      TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_inv_artifacts_inv_kind ON inv_artifacts(investigation_id, artifact_kind, position)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_inv_artifacts_entity_refs ON inv_artifacts USING GIN (entity_refs)")

    # ── analyst_events (audit trail · timeline reproducible) ────
    op.execute("""
        CREATE TABLE IF NOT EXISTS analyst_events (
            id               BIGSERIAL PRIMARY KEY,
            investigation_id BIGINT REFERENCES investigations(id) ON DELETE CASCADE,
            actor_id         TEXT NOT NULL,
            verb             TEXT NOT NULL,
            target_kind      TEXT,
            target_id        BIGINT,
            entity_id        BIGINT REFERENCES entities(id) ON DELETE SET NULL,
            payload          JSONB DEFAULT '{}'::jsonb,
            ts               TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyst_events_inv_ts ON analyst_events(investigation_id, ts DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyst_events_actor ON analyst_events(actor_id, ts DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyst_events_entity ON analyst_events(entity_id) WHERE entity_id IS NOT NULL")


# ─────────────────────────────────────────────────────────────────
# DOWN · cuidadoso, no destruimos sin condición
# ─────────────────────────────────────────────────────────────────

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS analyst_events CASCADE")
    op.execute("DROP TABLE IF EXISTS inv_artifacts CASCADE")
    op.execute("DROP TABLE IF EXISTS inv_pinned CASCADE")
    op.execute("DROP TABLE IF EXISTS investigations CASCADE")
    op.execute("DROP TABLE IF EXISTS entity_links CASCADE")
    op.execute("DROP TABLE IF EXISTS entities CASCADE")
