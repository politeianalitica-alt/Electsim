"""
Docling Parser — Bloque 9 (opcional).

Parsing avanzado con Docling: layout, tablas, OCR, exportación Markdown.
Solo activo si ELECTSIM_DOCUMENTS_USE_DOCLING=true y docling instalado.

Si Docling no está disponible, las funciones devuelven unavailable=True
sin romper el pipeline.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

_DOCLING_OK = False
_DOCLING_AVAILABLE_MSG = "Docling no instalado. Instala: pip install docling"

try:
    import docling  # noqa: F401
    _DOCLING_OK = True
except ImportError:
    pass


def is_docling_enabled() -> bool:
    """Docling está habilitado si está instalado Y la variable de entorno está activada."""
    env = os.getenv("ELECTSIM_DOCUMENTS_USE_DOCLING", "false").lower()
    return _DOCLING_OK and env in ("true", "1", "yes")


def parse_with_docling(path: str | Path) -> "ParsedDocument":
    """
    Parsea un documento con Docling (PDF/DOCX/PPTX/XLSX/HTML).

    Returns ParsedDocument con markdown, structured_json, páginas y tablas.
    Si Docling no está disponible o falla, devuelve stub con warning.
    """
    from etl.sources.documents.schemas import ParsedDocument
    path = Path(path)
    now = datetime.now(timezone.utc)

    if not is_docling_enabled():
        return ParsedDocument(
            document_id=path.stem,
            parser_used="docling",
            warnings=[_DOCLING_AVAILABLE_MSG if not _DOCLING_OK
                      else "Docling desactivado. Activa ELECTSIM_DOCUMENTS_USE_DOCLING=true"],
            parsed_at=now,
        )

    try:
        from docling.document_converter import DocumentConverter

        converter = DocumentConverter()
        result = converter.convert(str(path))
        doc = result.document

        # Exportar a Markdown
        try:
            markdown = doc.export_to_markdown()
        except Exception:
            markdown = None

        # Exportar a texto plano
        try:
            plain_text = doc.export_to_text()
        except Exception:
            plain_text = markdown or ""

        # Metadatos
        page_count = None
        try:
            page_count = len(doc.pages) if hasattr(doc, "pages") else None
        except Exception:
            pass

        word_count = len(plain_text.split()) if plain_text else None

        # JSON estructurado (metadata del documento)
        structured = {}
        try:
            structured = result.document.model_dump() if hasattr(result.document, "model_dump") else {}
        except Exception:
            pass

        return ParsedDocument(
            document_id=path.stem,
            title=path.stem,
            markdown=markdown,
            plain_text=plain_text,
            structured_json=structured,
            page_count=page_count,
            word_count=word_count,
            quality_score=0.92,
            parser_used="docling",
            parser_version=_get_docling_version(),
            parsed_at=now,
        )

    except Exception as exc:
        logger.warning("parse_with_docling %s: %s", path, exc)
        return ParsedDocument(
            document_id=path.stem,
            parser_used="docling",
            warnings=[f"docling error: {exc}"],
            parsed_at=now,
        )


def extract_docling_tables(path: str | Path) -> list["ExtractedTable"]:
    """
    Extrae tablas de un documento con Docling.

    Returns:
        Lista de ExtractedTable. Vacía si Docling no disponible.
    """
    from etl.sources.documents.schemas import ExtractedTable
    path = Path(path)
    tables = []

    if not is_docling_enabled():
        return tables

    try:
        from docling.document_converter import DocumentConverter
        converter = DocumentConverter()
        result = converter.convert(str(path))
        doc = result.document

        table_idx = 0
        for item in doc.tables if hasattr(doc, "tables") else []:
            try:
                import pandas as pd
                df = pd.DataFrame(item.data)
                tables.append(ExtractedTable(
                    document_id=path.stem,
                    table_index=table_idx,
                    dataframe_json={"records": df.to_dict(orient="records")},
                    extraction_method="docling",
                    confidence=0.9,
                ))
                table_idx += 1
            except Exception as exc:
                logger.debug("extract_docling_tables item: %s", exc)

    except Exception as exc:
        logger.debug("extract_docling_tables: %s", exc)

    return tables


def extract_docling_pages(path: str | Path) -> list["DocumentPage"]:
    """
    Extrae páginas de un documento con Docling.

    Returns:
        Lista de DocumentPage. Vacía si Docling no disponible.
    """
    from etl.sources.documents.schemas import DocumentPage
    path = Path(path)
    pages = []

    if not is_docling_enabled():
        return pages

    try:
        from docling.document_converter import DocumentConverter
        converter = DocumentConverter()
        result = converter.convert(str(path))
        doc = result.document

        if hasattr(doc, "pages"):
            for i, page in enumerate(doc.pages, 1):
                try:
                    text = getattr(page, "text", None) or ""
                    pages.append(DocumentPage(
                        document_id=path.stem,
                        page_number=i,
                        text=text,
                        markdown=text,
                    ))
                except Exception:
                    pages.append(DocumentPage(
                        document_id=path.stem,
                        page_number=i,
                    ))

    except Exception as exc:
        logger.debug("extract_docling_pages: %s", exc)

    return pages


def _get_docling_version() -> str | None:
    try:
        import docling
        return getattr(docling, "__version__", None)
    except Exception:
        return None
