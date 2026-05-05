"""
0046 — Document Intelligence Core (Bloque 9).

Crea las tablas del módulo documental:
  source_documents, parsed_documents, document_pages,
  document_chunks, extracted_tables, evidence_citations,
  draft_reports.

Patrón: expand-only (columnas nullable, ON CONFLICT DO NOTHING).
RLS habilitado en todas las tablas con política tenant_isolation_*.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ARRAY, UUID

# Alembic metadata
revision = "0046"
down_revision = "0045"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. source_documents ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS source_documents (
            document_id     TEXT        PRIMARY KEY,
            title           TEXT,
            source          TEXT        NOT NULL,
            source_type     TEXT        NOT NULL DEFAULT 'other',
            source_url      TEXT,
            file_path       TEXT,
            file_hash       TEXT,
            mime_type       TEXT,
            language        TEXT        NOT NULL DEFAULT 'es',
            page_count      INTEGER,
            word_count      INTEGER,
            parse_status    TEXT        NOT NULL DEFAULT 'pending',
            parser_used     TEXT,
            metadata        JSONB       NOT NULL DEFAULT '{}',
            tenant_id       TEXT        NOT NULL DEFAULT 'default',
            fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            parsed_at       TIMESTAMPTZ,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_source_documents_source_type
            ON source_documents (source_type)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_source_documents_parse_status
            ON source_documents (parse_status)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_source_documents_file_hash
            ON source_documents (file_hash)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_source_documents_tenant
            ON source_documents (tenant_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_source_documents_fetched_at
            ON source_documents (fetched_at DESC)
    """)

    op.execute("ALTER TABLE source_documents ENABLE ROW LEVEL SECURITY")
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'source_documents'
                  AND policyname = 'tenant_isolation_source_documents'
            ) THEN
                CREATE POLICY tenant_isolation_source_documents
                    ON source_documents
                    USING (tenant_id = current_setting('app.tenant_id', TRUE));
            END IF;
        END $$
    """)

    # ── 2. parsed_documents ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS parsed_documents (
            document_id     TEXT        PRIMARY KEY
                            REFERENCES source_documents (document_id) ON DELETE CASCADE,
            title           TEXT,
            markdown        TEXT,
            plain_text      TEXT,
            structured_json JSONB       NOT NULL DEFAULT '{}',
            page_count      INTEGER     DEFAULT 0,
            word_count      INTEGER     DEFAULT 0,
            table_count     INTEGER     DEFAULT 0,
            parser_used     TEXT,
            parser_version  TEXT,
            quality_score   REAL        DEFAULT 0.0,
            warnings        TEXT[]      DEFAULT '{}',
            parsed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    # ── 3. document_pages ────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS document_pages (
            id              BIGSERIAL   PRIMARY KEY,
            document_id     TEXT        NOT NULL
                            REFERENCES source_documents (document_id) ON DELETE CASCADE,
            page_number     INTEGER     NOT NULL,
            text            TEXT,
            markdown        TEXT,
            bbox            JSONB       NOT NULL DEFAULT '{}',
            images          JSONB       NOT NULL DEFAULT '[]',
            tables          INTEGER[]   DEFAULT '{}',
            raw_payload     JSONB       NOT NULL DEFAULT '{}',
            UNIQUE (document_id, page_number)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_document_pages_document
            ON document_pages (document_id)
    """)

    # ── 4. document_chunks ───────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS document_chunks (
            chunk_id        TEXT        PRIMARY KEY,
            document_id     TEXT        NOT NULL
                            REFERENCES source_documents (document_id) ON DELETE CASCADE,
            chunk_index     INTEGER     NOT NULL,
            section_title   TEXT,
            page_start      INTEGER,
            page_end        INTEGER,
            text            TEXT        NOT NULL,
            token_count     INTEGER     DEFAULT 0,
            topics          TEXT[]      DEFAULT '{}',
            entities        TEXT[]      DEFAULT '{}',
            sectors         TEXT[]      DEFAULT '{}',
            citation_ref    TEXT,
            embedding_id    TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_document_chunks_document
            ON document_chunks (document_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_document_chunks_section
            ON document_chunks (section_title)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_document_chunks_fts
            ON document_chunks
            USING GIN (to_tsvector('spanish', text))
    """)

    # ── 5. extracted_tables ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS extracted_tables (
            table_id        TEXT        PRIMARY KEY,
            document_id     TEXT        NOT NULL
                            REFERENCES source_documents (document_id) ON DELETE CASCADE,
            table_title     TEXT,
            sheet_name      TEXT,
            page_number     INTEGER,
            row_count       INTEGER     DEFAULT 0,
            col_count       INTEGER     DEFAULT 0,
            headers         TEXT[]      DEFAULT '{}',
            raw_data        JSONB       NOT NULL DEFAULT '[]',
            confidence_score REAL       DEFAULT 0.0,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_extracted_tables_document
            ON extracted_tables (document_id)
    """)

    # ── 6. evidence_citations ────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS evidence_citations (
            citation_id     TEXT        PRIMARY KEY,
            document_id     TEXT        NOT NULL
                            REFERENCES source_documents (document_id) ON DELETE CASCADE,
            chunk_id        TEXT,
            table_id        TEXT,
            source_label    TEXT,
            title           TEXT,
            page_number     INTEGER,
            section_title   TEXT,
            quote           TEXT,
            citation_style  TEXT        NOT NULL DEFAULT 'short',
            tenant_id       TEXT        NOT NULL DEFAULT 'default',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_evidence_citations_document
            ON evidence_citations (document_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_evidence_citations_chunk
            ON evidence_citations (chunk_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_evidence_citations_tenant
            ON evidence_citations (tenant_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_evidence_citations_created
            ON evidence_citations (created_at DESC)
    """)

    op.execute("ALTER TABLE evidence_citations ENABLE ROW LEVEL SECURITY")
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'evidence_citations'
                  AND policyname = 'tenant_isolation_evidence_citations'
            ) THEN
                CREATE POLICY tenant_isolation_evidence_citations
                    ON evidence_citations
                    USING (tenant_id = current_setting('app.tenant_id', TRUE));
            END IF;
        END $$
    """)

    # ── 7. draft_reports ─────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS draft_reports (
            report_id       TEXT        PRIMARY KEY,
            title           TEXT        NOT NULL,
            report_type     TEXT        NOT NULL DEFAULT 'custom',
            status          TEXT        NOT NULL DEFAULT 'draft',
            client_id       TEXT,
            tenant_id       TEXT        NOT NULL DEFAULT 'default',
            sections        JSONB       NOT NULL DEFAULT '[]',
            evidence_ids    TEXT[]      DEFAULT '{}',
            source_objects  JSONB       NOT NULL DEFAULT '[]',
            created_by      TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_draft_reports_type
            ON draft_reports (report_type)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_draft_reports_status
            ON draft_reports (status)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_draft_reports_tenant
            ON draft_reports (tenant_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_draft_reports_updated
            ON draft_reports (updated_at DESC)
    """)

    op.execute("ALTER TABLE draft_reports ENABLE ROW LEVEL SECURITY")
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'draft_reports'
                  AND policyname = 'tenant_isolation_draft_reports'
            ) THEN
                CREATE POLICY tenant_isolation_draft_reports
                    ON draft_reports
                    USING (tenant_id = current_setting('app.tenant_id', TRUE));
            END IF;
        END $$
    """)


def downgrade() -> None:
    # Eliminar en orden inverso por dependencias FK
    op.execute("DROP TABLE IF EXISTS draft_reports CASCADE")
    op.execute("DROP TABLE IF EXISTS evidence_citations CASCADE")
    op.execute("DROP TABLE IF EXISTS extracted_tables CASCADE")
    op.execute("DROP TABLE IF EXISTS document_chunks CASCADE")
    op.execute("DROP TABLE IF EXISTS document_pages CASCADE")
    op.execute("DROP TABLE IF EXISTS parsed_documents CASCADE")
    op.execute("DROP TABLE IF EXISTS source_documents CASCADE")
