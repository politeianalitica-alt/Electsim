"""
Parser Router — Bloque 9.

Selecciona el parser adecuado por MIME type / extensión.
Estrategia:
  1. Docling si habilitado (PDF/DOCX/PPTX/XLSX)
  2. Parser específico según extensión
  3. Si todo falla → parse_status=failed + warning

Nunca rompe el pipeline.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Extensiones soportadas
_MIME_TO_PARSER = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/msword": "docx",
    "application/vnd.ms-excel": "xlsx",
    "text/html": "html",
    "text/markdown": "md",
    "text/plain": "txt",
    "text/csv": "txt",
}

_EXT_TO_PARSER = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".doc": "docx",
    ".xlsx": "xlsx",
    ".xls": "xlsx",
    ".pptx": "pptx",
    ".ppt": "pptx",
    ".html": "html",
    ".htm": "html",
    ".md": "md",
    ".markdown": "md",
    ".txt": "txt",
    ".csv": "txt",
    ".json": "txt",
    ".xml": "html",
}


def select_parser(path: str | Path, mime_type: str | None = None) -> str:
    """
    Devuelve el tipo de parser a usar: 'pdf', 'docx', 'xlsx', 'pptx', 'html', 'md', 'txt'.
    """
    path = Path(path)

    # Por MIME type primero
    if mime_type:
        for m, p in _MIME_TO_PARSER.items():
            if mime_type.startswith(m):
                return p

    # Por extensión
    ext = path.suffix.lower()
    return _EXT_TO_PARSER.get(ext, "txt")


def parse_document(
    path: str | Path,
    source_document=None,
    engine: Any = None,
) -> "ParsedDocument":
    """
    Parsea un documento seleccionando el parser apropiado.

    Args:
        path: Ruta al archivo.
        source_document: SourceDocument (para acceder a mime_type y document_id).
        engine: SQLAlchemy engine (para actualizar estado).

    Returns:
        ParsedDocument con resultado del parsing.
    """
    from etl.sources.documents.schemas import ParsedDocument
    from etl.sources.documents.docling_parser import is_docling_enabled

    path = Path(path)
    document_id = source_document.document_id if source_document else path.stem
    mime_type = source_document.mime_type if source_document else None

    parser_type = select_parser(path, mime_type)

    # Intentar Docling primero para formatos compatibles
    if is_docling_enabled() and parser_type in ("pdf", "docx", "pptx", "xlsx"):
        try:
            from etl.sources.documents.docling_parser import parse_with_docling
            result = parse_with_docling(path)
            if result.markdown or result.plain_text:
                result = result.model_copy(update={"document_id": document_id})
                _update_status(document_id, "parsed", "docling", engine)
                return result
        except Exception as exc:
            logger.debug("parse_document docling fallback: %s", exc)

    # Parsers específicos
    try:
        result = _dispatch_parser(parser_type, path, document_id)
        status = "parsed" if (result.markdown or result.plain_text) else "failed"
        if result.warnings and not (result.markdown or result.plain_text):
            status = "partial"
        _update_status(document_id, status, result.parser_used, engine)
        return result
    except Exception as exc:
        logger.warning("parse_document %s type=%s: %s", path, parser_type, exc)
        _update_status(document_id, "failed", parser_type, engine)
        return ParsedDocument(
            document_id=document_id,
            parser_used=f"{parser_type}_error",
            warnings=[f"parse error: {exc}"],
        )


def _dispatch_parser(parser_type: str, path: Path, document_id: str) -> "ParsedDocument":
    """Despacha al parser correcto."""
    from etl.sources.documents.schemas import ParsedDocument

    if parser_type == "pdf":
        from etl.sources.documents.pdf_parser import parse_pdf
        result = parse_pdf(path)
    elif parser_type == "docx":
        from etl.sources.documents.office_parser import parse_docx
        result = parse_docx(path)
    elif parser_type == "xlsx":
        from etl.sources.documents.office_parser import parse_xlsx
        result, _ = parse_xlsx(path)
    elif parser_type == "pptx":
        from etl.sources.documents.office_parser import parse_pptx
        result = parse_pptx(path)
    elif parser_type == "html":
        from etl.sources.documents.html_markdown_parser import parse_html
        result = parse_html(path)
    elif parser_type == "md":
        from etl.sources.documents.html_markdown_parser import parse_markdown
        result = parse_markdown(path)
    else:
        from etl.sources.documents.html_markdown_parser import parse_text
        result = parse_text(path)

    return result.model_copy(update={"document_id": document_id})


def _update_status(document_id: str, status: str, parser_used: str, engine: Any) -> None:
    """Actualiza el estado de parsing en el registro."""
    try:
        from etl.sources.documents.document_registry import update_parse_status
        update_parse_status(document_id, status, parser_used=parser_used, engine=engine)
    except Exception as exc:
        logger.debug("_update_status: %s", exc)
