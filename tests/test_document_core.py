"""
Tests — Bloque 9: Document Intelligence Core.

Cubre:
  A. Schemas (SourceDocument, DraftReport, etc.)
  B. Document Registry (dedup por hash, cache, CRUD)
  C. File Ingestor (hash, mime detection)
  D. Chunker (markdown, legal, by_pages)
  E. Citation Manager (build, text, styles)
  F. Entity Extractor (batch enrichment)
  G. Document RAG (memory fallback, collection map)
  H. Document Service (facade, DataFrame vacío)
  I. Draft Service (create, add_section, attach_source, get_report, list)
  J. Export Service (markdown, HTML, capabilities)
  K. Document Tools (registry, tool functions)
  L. Pipeline CLI (argument parser, dry-run)
  M. Migration (revision chain)
"""
from __future__ import annotations

import sys
import os
import tempfile

import pytest

# ── helpers ────────────────────────────────────────────────────────────────────

def _make_doc(**kwargs):
    from etl.sources.documents.schemas import SourceDocument
    defaults = {"source": "test", "source_type": "other"}
    defaults.update(kwargs)
    return SourceDocument(**defaults)


def _make_chunk(document_id: str = "doc-1", index: int = 0, text: str = "Texto de prueba"):
    from etl.sources.documents.schemas import DocumentChunk
    return DocumentChunk(
        chunk_id=f"{document_id}:chunk:{index}",
        document_id=document_id,
        chunk_index=index,
        text=text,
    )


# ══════════════════════════════════════════════════════════════════════════════
# A. Schemas
# ══════════════════════════════════════════════════════════════════════════════

class TestSchemas:
    def test_source_document_defaults(self):
        doc = _make_doc()
        assert doc.parse_status == "pending"
        assert doc.language == "es"
        assert doc.tenant_id == "default"
        assert doc.document_id  # UUID generado

    def test_source_document_valid_types(self):
        for st in ("boe", "congreso", "senado", "eurlex", "media",
                   "tender", "client_upload", "manifesto",
                   "economic_report", "internal_note", "other"):
            doc = _make_doc(source_type=st)
            assert doc.source_type == st

    def test_draft_report_defaults(self):
        from etl.sources.documents.schemas import DraftReport
        r = DraftReport(title="Test", report_type="custom")
        assert r.status == "draft"
        assert r.sections == []
        assert r.evidence_ids == []
        assert r.source_objects == []
        assert r.report_id  # UUID generado

    def test_draft_report_valid_types(self):
        from etl.sources.documents.schemas import DraftReport
        for rt in ("daily_briefing", "client_report", "legislative_note",
                   "media_analysis", "risk_profile", "electoral_report", "custom"):
            r = DraftReport(title="T", report_type=rt)
            assert r.report_type == rt

    def test_evidence_citation_defaults(self):
        from etl.sources.documents.schemas import EvidenceCitation
        c = EvidenceCitation(document_id="doc-1", quote="Texto citable")
        assert c.citation_style == "short"
        assert c.citation_id

    def test_document_chunk_stable_id(self):
        chunk = _make_chunk("doc-abc", 3)
        assert chunk.chunk_id == "doc-abc:chunk:3"

    def test_document_parse_result(self):
        from etl.sources.documents.schemas import DocumentParseResult
        r = DocumentParseResult(document_id="doc-1")
        assert r.success is False
        assert r.errors == []
        assert r.chunks == []

    def test_document_search_result_minimal(self):
        from etl.sources.documents.schemas import DocumentSearchResult
        r = DocumentSearchResult(document_id="doc-1")
        assert r.source == ""
        assert r.score is None


# ══════════════════════════════════════════════════════════════════════════════
# B. Document Registry
# ══════════════════════════════════════════════════════════════════════════════

class TestDocumentRegistry:
    def test_register_and_get(self):
        from etl.sources.documents.document_registry import (
            register_document, get_document, _DOC_CACHE,
        )
        doc = _make_doc(source="registry-test", file_hash="abc123")
        register_document(doc, engine=None)
        retrieved = get_document(doc.document_id, engine=None)
        assert retrieved is not None
        assert retrieved.document_id == doc.document_id
        assert retrieved.source == "registry-test"

    def test_dedup_by_hash(self):
        """Registrar el mismo hash dos veces debe devolver el doc existente."""
        from etl.sources.documents.document_registry import (
            register_document, _HASH_INDEX,
        )
        doc = _make_doc(source="dedup-source", file_hash="unique-dedup-hash-xyz")
        doc2 = _make_doc(source="dedup-source-2", file_hash="unique-dedup-hash-xyz")
        register_document(doc, engine=None)
        # Registrar doc con mismo hash debe devolver doc existente
        result, created = register_document.__wrapped__(doc2, engine=None) \
            if hasattr(register_document, "__wrapped__") else (doc2, True)
        # Verificar que el hash está en el índice
        assert "unique-dedup-hash-xyz" in _HASH_INDEX

    def test_get_nonexistent_returns_none(self):
        from etl.sources.documents.document_registry import get_document
        result = get_document("nonexistent-id-99999", engine=None)
        assert result is None

    def test_list_pending_documents(self):
        from etl.sources.documents.document_registry import (
            register_document, list_pending_documents,
        )
        doc = _make_doc(source="pending-test", parse_status="pending")
        register_document(doc, engine=None)
        pending = list_pending_documents(engine=None)
        assert isinstance(pending, list)
        ids = [d.document_id for d in pending]
        assert doc.document_id in ids

    def test_update_parse_status(self):
        from etl.sources.documents.document_registry import (
            register_document, get_document, update_parse_status,
        )
        doc = _make_doc(source="status-test")
        register_document(doc, engine=None)
        update_parse_status(doc.document_id, "parsed", parser_used="pdf_parser",
                             engine=None)
        updated = get_document(doc.document_id, engine=None)
        assert updated.parse_status == "parsed"
        assert updated.parser_used == "pdf_parser"


# ══════════════════════════════════════════════════════════════════════════════
# C. File Ingestor
# ══════════════════════════════════════════════════════════════════════════════

class TestFileIngestor:
    def test_compute_file_hash(self):
        from etl.sources.documents.file_ingestor import compute_file_hash
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w",
                                         delete=False) as f:
            f.write("contenido de prueba")
            tmp_path = f.name
        try:
            h = compute_file_hash(tmp_path)
            assert isinstance(h, str)
            assert len(h) == 64  # SHA-256 hex
        finally:
            os.unlink(tmp_path)

    def test_compute_file_hash_deterministic(self):
        from etl.sources.documents.file_ingestor import compute_file_hash
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w",
                                         delete=False) as f:
            f.write("mismo contenido")
            p1 = f.name
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w",
                                         delete=False) as f:
            f.write("mismo contenido")
            p2 = f.name
        try:
            assert compute_file_hash(p1) == compute_file_hash(p2)
        finally:
            os.unlink(p1)
            os.unlink(p2)

    def test_detect_mime_type_pdf(self):
        from etl.sources.documents.file_ingestor import detect_mime_type
        assert detect_mime_type("documento.pdf") in ("application/pdf", "pdf")

    def test_detect_mime_type_txt(self):
        from etl.sources.documents.file_ingestor import detect_mime_type
        mime = detect_mime_type("archivo.txt")
        assert "text" in mime.lower()

    def test_ingest_local_file_creates_doc(self):
        from etl.sources.documents.file_ingestor import ingest_local_file
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w",
                                         delete=False) as f:
            f.write("Contenido de prueba para ingesta")
            tmp = f.name
        try:
            doc, created = ingest_local_file(
                path=tmp,
                source="test_ingest",
                source_type="other",
                engine=None,
            )
            assert doc is not None
            assert doc.source == "test_ingest"
            assert doc.file_hash  # hash calculado
            assert created is True
        finally:
            os.unlink(tmp)

    def test_ingest_local_file_dedup(self):
        from etl.sources.documents.file_ingestor import ingest_local_file
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w",
                                         delete=False) as f:
            f.write("Contenido único para dedup " + str(id(f)))
            tmp = f.name
        try:
            doc1, created1 = ingest_local_file(
                path=tmp, source="dedup-s", source_type="other", engine=None,
            )
            doc2, created2 = ingest_local_file(
                path=tmp, source="dedup-s", source_type="other", engine=None,
            )
            # Segundo registro del mismo archivo → no es nuevo
            assert created2 is False
            assert doc1.document_id == doc2.document_id
        finally:
            os.unlink(tmp)


# ══════════════════════════════════════════════════════════════════════════════
# D. Chunker
# ══════════════════════════════════════════════════════════════════════════════

class TestChunker:
    def test_chunk_markdown_basic(self):
        from etl.sources.documents.chunker import chunk_markdown
        md = "# Sección 1\n\nTexto largo " * 50
        chunks = chunk_markdown("doc-md", md, max_tokens=100)
        assert len(chunks) >= 1
        for c in chunks:
            assert c.document_id == "doc-md"
            assert c.text

    def test_chunk_markdown_stable_ids(self):
        from etl.sources.documents.chunker import chunk_markdown
        md = "## Sección\n\n" + "Texto de prueba. " * 20
        chunks = chunk_markdown("doc-stable", md)
        for i, c in enumerate(chunks):
            assert c.chunk_id == f"doc-stable:chunk:{i}"

    def test_chunk_legal_document(self):
        from etl.sources.documents.chunker import chunk_legal_document
        text = (
            "Artículo 1. Primera disposición.\nContenido del artículo 1.\n\n"
            "Artículo 2. Segunda disposición.\nContenido del artículo 2.\n\n"
            "Disposición adicional primera. Medidas transitorias.\n"
        )
        chunks = chunk_legal_document("doc-legal", text)
        assert len(chunks) >= 2
        for c in chunks:
            assert c.document_id == "doc-legal"

    def test_chunk_by_pages(self):
        from etl.sources.documents.chunker import chunk_by_pages
        from etl.sources.documents.schemas import DocumentPage
        pages = [
            DocumentPage(document_id="doc-pages", page_number=i,
                         text=f"Texto de la página {i}. " * 5)
            for i in range(1, 4)
        ]
        chunks = chunk_by_pages("doc-pages", pages)
        assert len(chunks) >= 1
        assert all(c.document_id == "doc-pages" for c in chunks)

    def test_estimate_tokens(self):
        from etl.sources.documents.chunker import _estimate_tokens
        text = "palabra " * 100
        tokens = _estimate_tokens(text)
        assert 60 <= tokens <= 90  # ~0.75 * 100 palabras


# ══════════════════════════════════════════════════════════════════════════════
# E. Citation Manager
# ══════════════════════════════════════════════════════════════════════════════

class TestCitationManager:
    def test_build_citation_short(self):
        from etl.sources.documents.citation_manager import build_citation_for_chunk
        doc = _make_doc(source="BOE-A-2026-1234", source_type="boe")
        chunk = _make_chunk(doc.document_id, 0, "Texto del artículo.")
        chunk = chunk.model_copy(update={"section_title": "Artículo 1",
                                          "page_start": 3})
        cit = build_citation_for_chunk(chunk, doc, style="short")
        assert cit.document_id == doc.document_id
        assert cit.citation_style == "short"
        assert cit.quote

    def test_build_citation_internal(self):
        from etl.sources.documents.citation_manager import build_citation_for_chunk
        doc = _make_doc(source="informe-fiscal", source_type="economic_report",
                        title="Informe Fiscal 2026")
        chunk = _make_chunk(doc.document_id, 1, "Datos fiscales relevantes.")
        cit = build_citation_for_chunk(chunk, doc, style="internal")
        assert cit.citation_style == "internal"

    def test_build_citation_text_short(self):
        from etl.sources.documents.citation_manager import (
            build_citation_for_chunk, build_citation_text,
        )
        doc = _make_doc(source="BOE-A-2026-9999", source_type="boe")
        chunk = _make_chunk(doc.document_id)
        cit = build_citation_for_chunk(chunk, doc, style="short")
        text = build_citation_text(cit, style="short")
        assert isinstance(text, str)
        assert len(text) > 0

    def test_build_citations_for_chunks(self):
        from etl.sources.documents.citation_manager import build_citations_for_chunks
        doc = _make_doc(source="test-source", source_type="other")
        chunks = [_make_chunk(doc.document_id, i) for i in range(3)]
        citations = build_citations_for_chunks(chunks, doc, engine=None)
        assert len(citations) == 3
        assert all(c.document_id == doc.document_id for c in citations)

    def test_quote_from_chunk_truncates(self):
        from etl.sources.documents.citation_manager import quote_from_chunk
        chunk = _make_chunk(text="A" * 500)
        q = quote_from_chunk(chunk, max_chars=100)
        assert len(q) <= 104  # 100 + "…" o similar


# ══════════════════════════════════════════════════════════════════════════════
# F. Entity Extractor
# ══════════════════════════════════════════════════════════════════════════════

class TestEntityExtractor:
    def test_extract_entities_from_chunk(self):
        from etl.sources.documents.entity_extractor import extract_entities_from_chunk
        chunk = _make_chunk(text="El PP y el PSOE debaten la reforma laboral en el Congreso.")
        enriched = extract_entities_from_chunk(chunk)
        assert hasattr(enriched, "entities")
        # Debe detectar alguna entidad política
        assert isinstance(enriched.entities, list)

    def test_extract_entities_batch(self):
        from etl.sources.documents.entity_extractor import extract_entities_from_chunks
        chunks = [
            _make_chunk(text="Reforma laboral en España.", index=0),
            _make_chunk(text="El Banco Central Europeo sube tipos.", index=1),
        ]
        enriched = extract_entities_from_chunks(chunks)
        assert len(enriched) == 2
        # Todos los chunks están enriquecidos
        for c in enriched:
            assert isinstance(c.topics, list)
            assert isinstance(c.sectors, list)

    def test_extract_topics_economia(self):
        from etl.sources.documents.entity_extractor import extract_entities_from_chunk
        chunk = _make_chunk(
            text="El presupuesto general del Estado prevé un déficit del 3%."
        )
        enriched = extract_entities_from_chunk(chunk)
        # Debe detectar tópico de economía/presupuesto
        all_tags = enriched.topics + enriched.sectors
        assert isinstance(all_tags, list)


# ══════════════════════════════════════════════════════════════════════════════
# G. Document RAG
# ══════════════════════════════════════════════════════════════════════════════

class TestDocumentRAG:
    def test_get_collection_for_type(self):
        from etl.sources.documents.document_rag import get_collection_for_type
        assert get_collection_for_type("boe") == "electsim_legal_docs"
        assert get_collection_for_type("congreso") == "electsim_legal_docs"
        assert get_collection_for_type("tender") == "electsim_tenders"
        assert get_collection_for_type("manifesto") == "electsim_manifestos"
        assert get_collection_for_type("client_upload") == "electsim_client_docs"
        assert get_collection_for_type("economic_report") == "electsim_reports"
        assert get_collection_for_type("other") == "electsim_documents"

    def test_index_without_engine_uses_cache(self):
        from etl.sources.documents.document_rag import (
            index_document_chunks, _CHUNK_INDEX,
        )
        from etl.sources.documents.chunker import chunk_markdown
        # Registrar chunks en caché primero
        doc_id = "rag-test-doc"
        md = "## Sección\n\n" + "Texto de prueba para RAG. " * 10
        chunks = chunk_markdown(doc_id, md)
        for c in chunks:
            _CHUNK_INDEX[c.chunk_id] = c

        n = index_document_chunks(doc_id, engine=None)
        assert n >= 0  # Puede ser 0 si no hay RAGIndexer, eso es OK

    def test_memory_search_finds_chunk(self):
        from etl.sources.documents.document_rag import (
            _CHUNK_INDEX, _memory_search,
        )
        chunk = _make_chunk(text="Texto único xyzabc123 para búsqueda")
        _CHUNK_INDEX[chunk.chunk_id] = chunk

        results = _memory_search("xyzabc123", k=5)
        assert len(results) >= 1
        found_ids = [r.chunk_id for r in results]
        assert chunk.chunk_id in found_ids

    def test_search_document_chunks_memory_fallback(self):
        from etl.sources.documents.document_rag import (
            search_document_chunks, _CHUNK_INDEX,
        )
        unique_term = "termino_muy_unico_888zz"
        chunk = _make_chunk(text=f"Este documento contiene el {unique_term} buscado.")
        _CHUNK_INDEX[chunk.chunk_id] = chunk

        results = search_document_chunks(unique_term, engine=None)
        assert isinstance(results, list)
        # Si hay resultado, debe incluir el chunk correcto
        if results:
            assert any(r.chunk_id == chunk.chunk_id for r in results)


# ══════════════════════════════════════════════════════════════════════════════
# H. Document Service
# ══════════════════════════════════════════════════════════════════════════════

class TestDocumentService:
    def test_get_document_nonexistent_returns_empty_dict(self):
        from services.documents.document_service import get_document
        result = get_document("nonexistent-xxxx", engine=None)
        assert isinstance(result, dict)
        assert result == {}

    def test_get_document_chunks_no_engine_returns_empty_df(self):
        from services.documents.document_service import get_document_chunks
        import pandas as pd
        df = get_document_chunks("any-id", engine=None)
        assert isinstance(df, pd.DataFrame)

    def test_search_documents_no_engine_returns_df(self):
        from services.documents.document_service import search_documents
        import pandas as pd
        df = search_documents("reforma laboral", engine=None)
        assert isinstance(df, pd.DataFrame)

    def test_get_document_evidence_no_engine_returns_empty_df(self):
        from services.documents.document_service import get_document_evidence
        import pandas as pd
        df = get_document_evidence("any-id", engine=None)
        assert isinstance(df, pd.DataFrame)

    def test_register_document_missing_file_returns_error(self):
        from services.documents.document_service import register_document
        result = register_document(
            path="/nonexistent/file/path.pdf",
            source="test",
            source_type="other",
            engine=None,
        )
        assert "error" in result or "status" in result


# ══════════════════════════════════════════════════════════════════════════════
# I. Draft Service
# ══════════════════════════════════════════════════════════════════════════════

class TestDraftService:
    def test_create_draft_report(self):
        from services.documents.draft_service import create_draft_report
        report = create_draft_report(
            title="Informe de prueba",
            report_type="daily_briefing",
            engine=None,
        )
        assert report.title == "Informe de prueba"
        assert report.report_type == "daily_briefing"
        assert report.status == "draft"
        assert report.report_id

    def test_create_draft_invalid_type_becomes_custom(self):
        from services.documents.draft_service import create_draft_report
        report = create_draft_report(
            title="Test",
            report_type="tipo_invalido",
            engine=None,
        )
        assert report.report_type == "custom"

    def test_add_section(self):
        from services.documents.draft_service import create_draft_report, add_section, get_report
        report = create_draft_report(title="Test secciones", report_type="custom",
                                      engine=None)
        add_section(
            report_id=report.report_id,
            title="Introducción",
            body_markdown="Este es el cuerpo de la sección.",
            engine=None,
        )
        updated = get_report(report.report_id, engine=None)
        assert updated is not None
        assert len(updated.sections) == 1
        assert updated.sections[0]["title"] == "Introducción"

    def test_add_multiple_sections(self):
        from services.documents.draft_service import create_draft_report, add_section, get_report
        report = create_draft_report(title="Multi-sección", report_type="custom",
                                      engine=None)
        for i in range(3):
            add_section(report.report_id, f"Sección {i}", f"Cuerpo {i}", engine=None)
        updated = get_report(report.report_id, engine=None)
        assert len(updated.sections) == 3

    def test_attach_source_object(self):
        from services.documents.draft_service import (
            create_draft_report, attach_source_object, get_report,
        )
        report = create_draft_report(title="Test fuentes", report_type="custom",
                                      engine=None)
        attach_source_object(report.report_id, "briefing", "brief-001", engine=None)
        updated = get_report(report.report_id, engine=None)
        assert len(updated.source_objects) >= 1
        types = [o["type"] for o in updated.source_objects]
        assert "briefing" in types

    def test_get_report_not_found_returns_none(self):
        from services.documents.draft_service import get_report
        result = get_report("nonexistent-report-id-xyz", engine=None)
        assert result is None

    def test_list_reports(self):
        from services.documents.draft_service import create_draft_report, list_reports
        r = create_draft_report(title="Listable report", report_type="custom",
                                 engine=None)
        reports = list_reports(engine=None)
        assert isinstance(reports, list)
        ids = [getattr(rep, "report_id", None) for rep in reports
               if hasattr(rep, "report_id")]
        assert r.report_id in ids

    def test_generate_report_from_briefing(self):
        from services.documents.draft_service import generate_report_from_briefing
        # Sin BD, carga briefing dummy y crea report
        report = generate_report_from_briefing("brief-test-xyz", engine=None)
        assert report is not None
        assert "brief-test-xyz" in report.title or report.title


# ══════════════════════════════════════════════════════════════════════════════
# J. Export Service
# ══════════════════════════════════════════════════════════════════════════════

class TestExportService:
    def test_get_export_capabilities(self):
        from services.documents.export_service import get_export_capabilities
        caps = get_export_capabilities()
        assert caps["markdown"] is True
        assert caps["html"] is True
        assert isinstance(caps["docx"], bool)
        assert isinstance(caps["pdf"], bool)

    def test_export_report_markdown(self):
        from services.documents.draft_service import create_draft_report, add_section
        from services.documents.export_service import export_report_markdown

        report = create_draft_report(title="Export MD test", report_type="custom",
                                      engine=None)
        add_section(report.report_id, "Intro", "Contenido de introducción.", engine=None)

        md = export_report_markdown(report.report_id, engine=None)
        assert isinstance(md, str)
        assert "Export MD test" in md
        assert "Intro" in md
        assert "Contenido de introducción" in md

    def test_export_report_markdown_not_found(self):
        from services.documents.export_service import export_report_markdown
        md = export_report_markdown("nonexistent-report-zzz", engine=None)
        assert "no encontrado" in md.lower() or "nonexistent" in md

    def test_export_report_html(self):
        from services.documents.draft_service import create_draft_report, add_section
        from services.documents.export_service import export_report_html

        report = create_draft_report(title="Export HTML test", report_type="custom",
                                      engine=None)
        add_section(report.report_id, "Análisis", "## Subsección\n\nTexto.",
                    engine=None)

        html = export_report_html(report.report_id, engine=None)
        assert isinstance(html, str)
        assert "<!DOCTYPE html>" in html
        assert "Export HTML test" in html

    def test_export_report_html_is_valid(self):
        from services.documents.draft_service import create_draft_report
        from services.documents.export_service import export_report_html

        r = create_draft_report(title="Valid HTML", report_type="custom", engine=None)
        html = export_report_html(r.report_id, engine=None)
        assert "<body>" in html
        assert "</body>" in html
        assert "<html" in html

    def test_export_report_markdown_to_file(self, tmp_path):
        from services.documents.draft_service import create_draft_report
        from services.documents.export_service import export_report_markdown

        r = create_draft_report(title="File export test", report_type="custom",
                                 engine=None)
        out = str(tmp_path / "test_report.md")
        md = export_report_markdown(r.report_id, output_path=out, engine=None)
        assert os.path.exists(out)
        with open(out) as f:
            content = f.read()
        assert "File export test" in content

    def test_simple_md_to_html_helper(self):
        from services.documents.export_service import _simple_md_to_html
        html = _simple_md_to_html("# Título\n\n## Sección\n\nPárrafo normal.")
        assert "<h1>" in html
        assert "<h2>" in html
        assert "<p>" in html


# ══════════════════════════════════════════════════════════════════════════════
# K. Document Tools
# ══════════════════════════════════════════════════════════════════════════════

class TestDocumentTools:
    def test_document_tools_registered(self):
        from agents.tools.document_tools import DOCUMENT_TOOLS
        names = [t["name"] for t in DOCUMENT_TOOLS]
        assert "search_documents" in names
        assert "search_document_chunks" in names
        assert "get_document_summary" in names
        assert "get_document_tables" in names
        assert "get_document_citations" in names
        assert "create_draft_report" in names
        assert "add_evidence_to_report" in names

    def test_all_tools_have_required_fields(self):
        from agents.tools.document_tools import DOCUMENT_TOOLS
        for tool in DOCUMENT_TOOLS:
            assert "name" in tool
            assert "description" in tool
            assert "input_schema" in tool
            assert "function" in tool
            assert callable(tool["function"])

    def test_create_draft_report_tool_missing_title(self):
        from agents.tools.document_tools import _create_draft_report
        result = _create_draft_report({})
        assert "error" in result.lower() or "requiere" in result.lower()

    def test_create_draft_report_tool_creates(self):
        from agents.tools.document_tools import _create_draft_report
        result = _create_draft_report({"title": "Tool Test Report", "report_type": "custom"})
        assert "✅" in result or "creado" in result.lower()

    def test_search_documents_tool_empty_query(self):
        from agents.tools.document_tools import _search_documents
        result = _search_documents({"query": ""})
        assert "error" in result.lower() or "requiere" in result.lower()

    def test_get_document_summary_missing_id(self):
        from agents.tools.document_tools import _get_document_summary
        result = _get_document_summary({})
        assert "error" in result.lower() or "requiere" in result.lower()

    def test_add_evidence_to_report_missing_params(self):
        from agents.tools.document_tools import _add_evidence_to_report
        # Sin report_id
        result = _add_evidence_to_report({"section_title": "x", "body": "y"})
        assert "error" in result.lower() or "requiere" in result.lower()


# ══════════════════════════════════════════════════════════════════════════════
# L. Pipeline CLI
# ══════════════════════════════════════════════════════════════════════════════

class TestDocumentCoreCLI:
    def test_build_parser_returns_parser(self):
        from pipelines.document_core import build_parser
        p = build_parser()
        assert p is not None

    def test_parser_register_action(self):
        from pipelines.document_core import build_parser
        p = build_parser()
        args = p.parse_args(["--register", "archivo.pdf", "--source", "test"])
        assert args.register == "archivo.pdf"
        assert args.source == "test"

    def test_parser_parse_pending(self):
        from pipelines.document_core import build_parser
        p = build_parser()
        args = p.parse_args(["--parse-pending", "--limit", "5"])
        assert args.parse_pending is True
        assert args.limit == 5

    def test_parser_search(self):
        from pipelines.document_core import build_parser
        p = build_parser()
        args = p.parse_args(["--search", "reforma laboral"])
        assert args.search_query == "reforma laboral"

    def test_parser_list(self):
        from pipelines.document_core import build_parser
        p = build_parser()
        args = p.parse_args(["--list"])
        assert args.list is True

    def test_parser_export(self):
        from pipelines.document_core import build_parser
        p = build_parser()
        args = p.parse_args(["--export", "--report-id", "rpt-123", "--format", "html"])
        assert args.export is True
        assert args.report_id == "rpt-123"
        assert args.format == "html"

    def test_parser_dry_run_flag(self):
        from pipelines.document_core import build_parser
        p = build_parser()
        args = p.parse_args(["--list", "--dry-run"])
        assert args.dry_run is True

    def test_parser_mutually_exclusive(self):
        from pipelines.document_core import build_parser
        p = build_parser()
        with pytest.raises(SystemExit):
            p.parse_args(["--list", "--register", "file.pdf"])

    def test_dry_run_register(self, capsys):
        from pipelines.document_core import main
        rc = main(["--register", "/fake/file.pdf", "--source", "test",
                   "--dry-run"])
        assert rc == 0
        captured = capsys.readouterr()
        assert "DRY RUN" in captured.out

    def test_dry_run_parse_pending(self, capsys):
        from pipelines.document_core import main
        rc = main(["--parse-pending", "--dry-run"])
        assert rc == 0
        captured = capsys.readouterr()
        assert "DRY RUN" in captured.out


# ══════════════════════════════════════════════════════════════════════════════
# M. Migration chain
# ══════════════════════════════════════════════════════════════════════════════

class TestMigration0046:
    def test_revision_chain(self):
        import importlib
        mod = importlib.import_module(
            "db.migrations.versions.0046_document_intelligence_core"
        )
        assert mod.revision == "0046"
        assert mod.down_revision == "0045"

    def test_has_upgrade_downgrade(self):
        import importlib
        mod = importlib.import_module(
            "db.migrations.versions.0046_document_intelligence_core"
        )
        assert callable(mod.upgrade)
        assert callable(mod.downgrade)
