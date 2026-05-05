"""
Document Monitor — Bloque 9.

Orquesta el pipeline completo de ingesta y procesamiento documental:
  1. register_document
  2. compute_file_hash
  3. parse_document
  4. extract_pages + tables
  5. chunk_document
  6. extract_entities
  7. create_citations
  8. persist_all
  9. index_to_rag
  10. create_alerts
  11. record_lineage
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class DocumentMonitor:
    """
    Orquesta el pipeline documental completo.

    Args:
        engine: SQLAlchemy engine.
        dry_run: Si True, no persiste nada en BD.
    """

    def __init__(self, engine: Any = None, dry_run: bool = False) -> None:
        self.engine = engine
        self.dry_run = dry_run

    def process_file(
        self,
        path: str | Path,
        source: str,
        source_type: str,
        title: str | None = None,
        source_url: str | None = None,
        metadata: dict | None = None,
        language: str = "es",
    ) -> "DocumentParseResult":
        """
        Procesa un archivo local de principio a fin.

        Returns:
            DocumentParseResult con todos los objetos generados.
        """
        from etl.sources.documents.schemas import DocumentParseResult
        from etl.sources.documents.file_ingestor import ingest_local_file
        from etl.sources.documents.parser_router import parse_document

        result = DocumentParseResult(document_id="")
        errors = []

        # 1. Ingestar
        try:
            doc, created = ingest_local_file(
                path=path, source=source, source_type=source_type,
                metadata=metadata, title=title, source_url=source_url,
                language=language,
                engine=None if self.dry_run else self.engine,
            )
            result = result.model_copy(update={
                "document_id": doc.document_id,
                "source_document": doc,
            })
        except Exception as exc:
            errors.append(f"ingest: {exc}")
            result = result.model_copy(update={"errors": errors})
            return result

        # 2. Parsear
        try:
            parsed = parse_document(
                path=path,
                source_document=result.source_document,
                engine=None if self.dry_run else self.engine,
            )
            result = result.model_copy(update={"parsed_document": parsed})
        except Exception as exc:
            errors.append(f"parse: {exc}")

        # 3. Extraer páginas y tablas
        try:
            pages, tables = self._extract_pages_tables(path, result.document_id,
                                                        result.source_document)
            result = result.model_copy(update={"pages": pages, "tables": tables})
        except Exception as exc:
            errors.append(f"extract: {exc}")

        # 4. Chunking
        try:
            chunks = self._create_chunks(result)
            result = result.model_copy(update={"chunks": chunks})
        except Exception as exc:
            errors.append(f"chunk: {exc}")

        # 5. Extraer entidades
        try:
            from etl.sources.documents.entity_extractor import extract_entities_from_chunks
            enriched = extract_entities_from_chunks(result.chunks)
            result = result.model_copy(update={"chunks": enriched})
        except Exception as exc:
            errors.append(f"entities: {exc}")

        # 6. Persistir
        if not self.dry_run:
            self._persist_all(result)

        # 7. Crear citas
        try:
            if result.source_document and result.chunks:
                from etl.sources.documents.citation_manager import build_citations_for_chunks
                citations = build_citations_for_chunks(
                    result.chunks, result.source_document,
                    engine=None if self.dry_run else self.engine,
                )
                result = result.model_copy(update={"citations": citations})
        except Exception as exc:
            errors.append(f"citations: {exc}")

        # 8. Indexar en RAG
        if not self.dry_run:
            try:
                from etl.sources.documents.document_rag import index_document_chunks
                index_document_chunks(result.document_id, engine=self.engine)
            except Exception as exc:
                errors.append(f"rag: {exc}")

        # 9. Alertas
        if not self.dry_run:
            self._create_alerts(result)

        # 10. Linaje
        if not self.dry_run:
            self._record_lineage(result)

        result = result.model_copy(update={
            "success": bool(result.parsed_document and
                           (result.parsed_document.markdown or result.parsed_document.plain_text)),
            "errors": errors,
        })
        logger.info(
            "DocumentMonitor.process_file: %s → %d chunks, %d tables, success=%s",
            result.document_id, len(result.chunks), len(result.tables), result.success,
        )
        return result

    def process_pending(self, limit: int = 20) -> list:
        """Procesa documentos con parse_status='pending'."""
        from etl.sources.documents.document_registry import list_pending_documents

        pending = list_pending_documents(engine=self.engine)[:limit]
        results = []

        for doc in pending:
            if doc.file_path:
                try:
                    r = self.process_file(
                        path=doc.file_path,
                        source=doc.source,
                        source_type=doc.source_type,
                    )
                    results.append(r)
                except Exception as exc:
                    logger.warning("process_pending %s: %s", doc.document_id, exc)

        return results

    def _extract_pages_tables(self, path, document_id: str, source_doc) -> tuple:
        """Extrae páginas y tablas según el tipo de archivo."""
        from pathlib import Path as _Path
        path = _Path(path)
        ext = path.suffix.lower()
        pages = []
        tables = []

        if ext == ".pdf":
            try:
                from etl.sources.documents.pdf_parser import parse_pdf_pages, extract_pdf_tables
                pages = parse_pdf_pages(path)
                tables = extract_pdf_tables(path)
                for p in pages:
                    p = p.model_copy(update={"document_id": document_id})
                for t in tables:
                    t = t.model_copy(update={"document_id": document_id})
            except Exception as exc:
                logger.debug("_extract_pages_tables pdf: %s", exc)
        elif ext in (".xlsx", ".xls"):
            try:
                from etl.sources.documents.office_parser import parse_xlsx
                _, tables = parse_xlsx(path)
                for t in tables:
                    t = t.model_copy(update={"document_id": document_id})
            except Exception as exc:
                logger.debug("_extract_pages_tables xlsx: %s", exc)

        return pages, tables

    def _create_chunks(self, result) -> list:
        """Crea chunks a partir del documento parseado."""
        from etl.sources.documents.chunker import chunk_markdown, chunk_legal_document, chunk_by_pages

        doc_id = result.document_id
        parsed = result.parsed_document
        pages = result.pages
        source_type = result.source_document.source_type if result.source_document else "other"

        if not parsed:
            return []

        # Documentos legales: chunker especializado
        if source_type in ("boe", "congreso", "senado", "eurlex"):
            text = parsed.plain_text or parsed.markdown or ""
            if text:
                return chunk_legal_document(doc_id, text)

        # Por páginas si hay suficientes
        if len(pages) > 1:
            return chunk_by_pages(doc_id, pages)

        # Por Markdown
        md = parsed.markdown or parsed.plain_text or ""
        if md:
            return chunk_markdown(doc_id, md)

        return []

    def _persist_all(self, result) -> None:
        """Persiste todos los objetos del resultado en BD."""
        if not result.parsed_document or self.engine is None:
            return

        # Parsed document
        try:
            self._persist_parsed_document(result)
        except Exception as exc:
            logger.debug("_persist_all parsed: %s", exc)

        # Pages
        try:
            self._persist_pages(result.pages)
        except Exception as exc:
            logger.debug("_persist_all pages: %s", exc)

        # Tables
        try:
            from etl.sources.documents.table_extractor import persist_tables
            persist_tables(result.tables, engine=self.engine)
        except Exception as exc:
            logger.debug("_persist_all tables: %s", exc)

        # Chunks
        try:
            from etl.sources.documents.chunker import persist_chunks
            persist_chunks(result.chunks, engine=self.engine)
        except Exception as exc:
            logger.debug("_persist_all chunks: %s", exc)

    def _persist_parsed_document(self, result) -> None:
        import json
        from sqlalchemy import text as sa_text
        parsed = result.parsed_document
        with self.engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO parsed_documents (
                    document_id, title, markdown, plain_text, structured_json,
                    page_count, word_count, table_count, parser_used,
                    parser_version, quality_score, warnings, parsed_at
                ) VALUES (
                    :document_id, :title, :markdown, :plain_text, :structured_json::jsonb,
                    :page_count, :word_count, :table_count, :parser_used,
                    :parser_version, :quality_score, :warnings, :parsed_at
                )
                ON CONFLICT (document_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    markdown = EXCLUDED.markdown,
                    plain_text = EXCLUDED.plain_text,
                    parser_used = EXCLUDED.parser_used,
                    quality_score = EXCLUDED.quality_score,
                    parsed_at = EXCLUDED.parsed_at
            """), {
                "document_id": result.document_id,
                "title": parsed.title,
                "markdown": parsed.markdown,
                "plain_text": parsed.plain_text,
                "structured_json": json.dumps(parsed.structured_json),
                "page_count": parsed.page_count,
                "word_count": parsed.word_count,
                "table_count": parsed.table_count,
                "parser_used": parsed.parser_used,
                "parser_version": parsed.parser_version,
                "quality_score": parsed.quality_score,
                "warnings": parsed.warnings,
                "parsed_at": parsed.parsed_at,
            })

    def _persist_pages(self, pages: list) -> None:
        if not pages or self.engine is None:
            return
        import json
        from sqlalchemy import text as sa_text
        for page in pages:
            try:
                with self.engine.begin() as conn:
                    conn.execute(sa_text("""
                        INSERT INTO document_pages (
                            document_id, page_number, text, markdown,
                            bbox, images, tables, raw_payload
                        ) VALUES (
                            :doc_id, :page_num, :text, :markdown,
                            :bbox::jsonb, :images::jsonb, :tables, :raw_payload::jsonb
                        )
                        ON CONFLICT (document_id, page_number) DO NOTHING
                    """), {
                        "doc_id": page.document_id,
                        "page_num": page.page_number,
                        "text": page.text,
                        "markdown": page.markdown,
                        "bbox": json.dumps(page.bbox or {}),
                        "images": json.dumps(page.images or []),
                        "tables": page.tables or [],
                        "raw_payload": json.dumps(page.raw_payload or {}),
                    })
            except Exception as exc:
                logger.debug("_persist_pages item: %s", exc)

    def _create_alerts(self, result) -> None:
        """Crea alertas del sistema para eventos documentales importantes."""
        try:
            from sqlalchemy import text as sa_text
            import json

            if not result.success:
                _create_system_alert(
                    tipo="document_parse_failed",
                    severidad="ADVERTENCIA",
                    titulo=f"Documento no parseado: {result.document_id[:50]}",
                    descripcion=f"El documento '{result.document_id}' falló en el parsing.",
                    datos={"document_id": result.document_id, "pagina_relevante": "operaciones"},
                    engine=self.engine,
                )
            elif result.tables:
                _create_system_alert(
                    tipo="document_table_extracted",
                    severidad="INFO",
                    titulo=f"Tablas extraídas: {result.document_id[:50]}",
                    descripcion=f"Se extrajeron {len(result.tables)} tablas del documento.",
                    datos={
                        "document_id": result.document_id,
                        "table_count": len(result.tables),
                        "pagina_relevante": "briefings",
                    },
                    engine=self.engine,
                )
        except Exception as exc:
            logger.debug("_create_alerts: %s", exc)

    def _record_lineage(self, result) -> None:
        """Registra linaje del documento en el sistema de Bloque 8."""
        try:
            from etl.operations.lineage import record_lineage
            if result.source_document:
                record_lineage(
                    source_object_type="source",
                    source_object_id=result.source_document.source,
                    target_object_type="document",
                    target_object_id=result.document_id,
                    transformation="document_ingest",
                    engine=self.engine,
                )
        except Exception:
            pass  # Bloque 8 opcional


def _create_system_alert(
    tipo: str,
    severidad: str,
    titulo: str,
    descripcion: str,
    datos: dict,
    engine: Any,
) -> None:
    """Crea una alerta en alertas_sistema."""
    if engine is None:
        return
    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO alertas_sistema (tipo, severidad, titulo, descripcion, datos, activa)
                VALUES (:tipo, :severidad, :titulo, :descripcion, :datos::jsonb, TRUE)
            """), {
                "tipo": tipo, "severidad": severidad,
                "titulo": titulo, "descripcion": descripcion,
                "datos": json.dumps(datos),
            })
    except Exception as exc:
        logger.debug("_create_system_alert: %s", exc)
