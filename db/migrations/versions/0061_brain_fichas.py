"""brain fichas dinámicas · 5 tablas brain_*

Revision ID: 0061_brain_fichas
Revises: 0060
Create Date: 2026-05-18

Crea las tablas que `agents/brain/pipelines/persistence*.py` consultan:
  · brain_fichas_territoriales   — ficha completa de municipio/CCAA (12 bloques)
  · brain_fichas_politicos       — ficha completa de político (12 bloques)
  · brain_territory_profiles     — perfil enriquecido (capa de lectura existente)
  · brain_actor_dossiers         — dossier de actor (capa de lectura existente)
  · brain_actor_graph_edges      — edges del grafo de actores
  · brain_actor_proposals        — actores descubiertos pendientes de revisión

Idempotente con IF NOT EXISTS (sirve aunque ya hayan sido creadas por la
auto-creación de los persisters).
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0061_brain_fichas"
down_revision = None  # ajustar al previous head durante el merge
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS brain_fichas_territoriales (
            id            TEXT PRIMARY KEY,
            tipo          TEXT,
            nombre        TEXT,
            ccaa          TEXT,
            content_json  TEXT,
            completeness  REAL,
            n_bloques_ok  INT,
            created_at    TIMESTAMPTZ DEFAULT NOW(),
            updated_at    TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_brain_fichas_terr_tipo ON brain_fichas_territoriales(tipo);
        CREATE INDEX IF NOT EXISTS ix_brain_fichas_terr_nombre ON brain_fichas_territoriales(nombre);

        CREATE TABLE IF NOT EXISTS brain_fichas_politicos (
            id            TEXT PRIMARY KEY,
            qid           TEXT,
            nombre        TEXT,
            partido       TEXT,
            cargo_actual  TEXT,
            content_json  TEXT,
            completeness  REAL,
            score_influencia REAL,
            n_bloques_ok  INT,
            created_at    TIMESTAMPTZ DEFAULT NOW(),
            updated_at    TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_brain_fichas_pol_qid ON brain_fichas_politicos(qid);
        CREATE INDEX IF NOT EXISTS ix_brain_fichas_pol_partido ON brain_fichas_politicos(partido);
        CREATE INDEX IF NOT EXISTS ix_brain_fichas_pol_score ON brain_fichas_politicos(score_influencia DESC);

        CREATE TABLE IF NOT EXISTS brain_territory_profiles (
            id           SERIAL PRIMARY KEY,
            tipo         TEXT,
            nombre       TEXT,
            ccaa         TEXT,
            provincia    TEXT,
            url_wikipedia TEXT,
            content_json TEXT,
            confidence   REAL,
            completeness REAL,
            created_at   TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(tipo, nombre, ccaa)
        );

        CREATE TABLE IF NOT EXISTS brain_actor_dossiers (
            id           SERIAL PRIMARY KEY,
            actor_name   TEXT,
            depth        TEXT,
            content_json TEXT,
            confidence   REAL,
            completeness REAL,
            created_at   TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_brain_dossiers_actor ON brain_actor_dossiers(LOWER(actor_name));

        CREATE TABLE IF NOT EXISTS brain_issue_dossiers (
            id           SERIAL PRIMARY KEY,
            issue_name   TEXT,
            depth        TEXT,
            content_json TEXT,
            confidence   REAL,
            completeness REAL,
            created_at   TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS brain_actor_graph_edges (
            id              SERIAL PRIMARY KEY,
            actor_from      TEXT,
            actor_to        TEXT,
            actor_from_name TEXT,
            actor_to_name   TEXT,
            relation_type   TEXT,
            valence         REAL,
            strength        REAL,
            directionality  TEXT,
            date_iso        TEXT,
            source          TEXT,
            evidence_text   TEXT,
            confidence      REAL,
            created_at      TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_brain_edges_from ON brain_actor_graph_edges(actor_from);
        CREATE INDEX IF NOT EXISTS ix_brain_edges_to ON brain_actor_graph_edges(actor_to);
        CREATE INDEX IF NOT EXISTS ix_brain_edges_type ON brain_actor_graph_edges(relation_type);

        CREATE TABLE IF NOT EXISTS brain_actor_proposals (
            id                  SERIAL PRIMARY KEY,
            surface_canonical   TEXT UNIQUE,
            proposed_name       TEXT,
            proposed_actor_id   TEXT,
            mention_count       INTEGER,
            wiki_found          BOOLEAN,
            wiki_url            TEXT,
            is_political_figure BOOLEAN,
            suggested_role      TEXT,
            suggested_party     TEXT,
            confidence          REAL,
            content_json        TEXT,
            reviewed            BOOLEAN DEFAULT FALSE,
            approved            BOOLEAN DEFAULT FALSE,
            created_at          TIMESTAMPTZ DEFAULT NOW()
        );
    """)


def downgrade() -> None:
    op.execute("""
        DROP TABLE IF EXISTS brain_actor_proposals;
        DROP TABLE IF EXISTS brain_actor_graph_edges;
        DROP TABLE IF EXISTS brain_issue_dossiers;
        DROP TABLE IF EXISTS brain_actor_dossiers;
        DROP TABLE IF EXISTS brain_territory_profiles;
        DROP TABLE IF EXISTS brain_fichas_politicos;
        DROP TABLE IF EXISTS brain_fichas_territoriales;
    """)
