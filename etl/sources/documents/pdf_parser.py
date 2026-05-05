"""
PDF Parser — Bloque 9 (fallback).

Parsea PDFs con pypdf (texto rápido) y pdfplumber (páginas + tablas).
No rompe si las dependencias no están instaladas.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from etl.sources.documents.schemas import (
        ParsedDocument, DocumentPage, ExtractedTable,
    )

logger = logging.getLogger(__name__)

_PYPDF_OK = False
_PDFPLUMBER_OK = False

try:
    import pypdf  # noqa: F401
    _PYPDF_OK = True
except ImportError:
    pass

try:
    import pdfplumber  # noqa: F401
    _PDFPLUMBER_OK = True
except ImportError:
    pass


def parse_pdf(path: str | Path) -> "ParsedDocument":
    """
    Parsea un PDF. Estrategia:
      1. pdfplumber (texto + tablas por página)
      2. pypdf (texto rápido)
      3. stub vacío con warning
    """
    from etl.sources.documents.schemas import ParsedDocument

    path = Path(path)
    document_id = path.stem
    now = datetime.now(timezone.utc)

    if _PDFPLUMBER_OK:
        return _parse_with_pdfplumber(path, document_id, now)
    elif _PYPDF_OK:
        return _parse_with_pypdf(path, document_id, now)
    else:
        return ParsedDocument(
            document_id=document_id,
            parser_used="pdf_fallback",
            warnings=["pypdf y pdfplumber no instalados. Instala: pip install pypdf pdfplumber"],
            parsed_at=now,
        )


def _parse_with_pypdf(path: Path, document_id: str, now: datetime) -> "ParsedDocument":
    """Parsing básico con pypdf."""
    from etl.sources.documents.schemas import ParsedDocument
    try:
        import pypdf as _pypdf
        reader = _pypdf.PdfReader(str(path))
        texts = []
        for page in reader.pages:
            try:
                texts.append(page.extract_text() or "")
            except Exception:
                texts.append("")

        full_text = "\n\n".join(t for t in texts if t.strip())
        word_count = len(full_text.split())
        title = None
        try:
            info = reader.metadata
            if info and info.title:
                title = str(info.title)
        except Exception:
            pass

        return ParsedDocument(
            document_id=document_id,
            title=title,
            plain_text=full_text,
            markdown=full_text,
            page_count=len(reader.pages),
            word_count=word_count,
            quality_score=0.6 if full_text else 0.1,
            parser_used="pypdf",
            parsed_at=now,
        )
    except Exception as exc:
        logger.warning("_parse_with_pypdf %s: %s", path, exc)
        return ParsedDocument(
            document_id=document_id,
            parser_used="pypdf",
            warnings=[f"pypdf error: {exc}"],
            parsed_at=now,
        )


def _parse_with_pdfplumber(path: Path, document_id: str, now: datetime) -> "ParsedDocument":
    """Parsing mejorado con pdfplumber."""
    from etl.sources.documents.schemas import ParsedDocument
    try:
        import pdfplumber as _pdfplumber
        with _pdfplumber.open(str(path)) as pdf:
            texts = []
            page_count = len(pdf.pages)
            table_count = 0

            for pg in pdf.pages:
                try:
                    txt = pg.extract_text() or ""
                    tables = pg.extract_tables() or []
                    table_count += len(tables)
                    texts.append(txt)
                except Exception:
                    texts.append("")

        full_text = "\n\n".join(t for t in texts if t.strip())
        word_count = len(full_text.split())

        return ParsedDocument(
            document_id=document_id,
            plain_text=full_text,
            markdown=full_text,
            page_count=page_count,
            word_count=word_count,
            table_count=table_count,
            quality_score=0.75 if full_text else 0.2,
            parser_used="pdfplumber",
            parsed_at=now,
        )
    except Exception as exc:
        logger.warning("_parse_with_pdfplumber %s: %s", path, exc)
        return _parse_with_pypdf(path, document_id, now) if _PYPDF_OK else ParsedDocument(
            document_id=document_id,
            parser_used="pdf_fallback",
            warnings=[f"pdfplumber error: {exc}"],
            parsed_at=now,
        )


def parse_pdf_pages(path: str | Path) -> list["DocumentPage"]:
    """Extrae páginas de un PDF."""
    from etl.sources.documents.schemas import DocumentPage
    path = Path(path)
    document_id = path.stem
    pages = []

    if _PDFPLUMBER_OK:
        try:
            import pdfplumber as _pdfplumber
            with _pdfplumber.open(str(path)) as pdf:
                for i, pg in enumerate(pdf.pages, 1):
                    try:
                        text = pg.extract_text() or ""
                        pages.append(DocumentPage(
                            document_id=document_id,
                            page_number=i,
                            text=text,
                            markdown=text,
                        ))
                    except Exception:
                        pages.append(DocumentPage(
                            document_id=document_id,
                            page_number=i,
                        ))
        except Exception as exc:
            logger.debug("parse_pdf_pages pdfplumber: %s", exc)

    elif _PYPDF_OK:
        try:
            import pypdf as _pypdf
            reader = _pypdf.PdfReader(str(path))
            for i, pg in enumerate(reader.pages, 1):
                try:
                    text = pg.extract_text() or ""
                    pages.append(DocumentPage(
                        document_id=document_id,
                        page_number=i,
                        text=text,
                        markdown=text,
                    ))
                except Exception:
                    pages.append(DocumentPage(
                        document_id=document_id,
                        page_number=i,
                    ))
        except Exception as exc:
            logger.debug("parse_pdf_pages pypdf: %s", exc)

    return pages


def extract_pdf_tables(path: str | Path) -> list["ExtractedTable"]:
    """Extrae tablas de un PDF con pdfplumber."""
    from etl.sources.documents.schemas import ExtractedTable
    path = Path(path)
    document_id = path.stem
    tables = []

    if not _PDFPLUMBER_OK:
        return tables

    try:
        import pdfplumber as _pdfplumber
        with _pdfplumber.open(str(path)) as pdf:
            for page_num, pg in enumerate(pdf.pages, 1):
                try:
                    raw_tables = pg.extract_tables() or []
                    for t_idx, raw_table in enumerate(raw_tables):
                        if not raw_table:
                            continue
                        try:
                            import pandas as pd
                            headers = raw_table[0] if raw_table else []
                            rows = raw_table[1:] if len(raw_table) > 1 else []
                            df = pd.DataFrame(rows, columns=headers)
                            df_json = df.to_dict(orient="records")
                            markdown = _df_to_markdown(df)
                        except Exception:
                            df_json = {}
                            markdown = None

                        tables.append(ExtractedTable(
                            document_id=document_id,
                            page_number=page_num,
                            table_index=t_idx,
                            dataframe_json={"records": df_json},
                            markdown=markdown,
                            extraction_method="pdfplumber",
                            confidence=0.7,
                        ))
                except Exception:
                    pass
    except Exception as exc:
        logger.debug("extract_pdf_tables: %s", exc)

    return tables


def _df_to_markdown(df) -> str:
    """Convierte DataFrame a markdown table."""
    try:
        lines = ["| " + " | ".join(str(c) for c in df.columns) + " |"]
        lines.append("|" + " --- |" * len(df.columns))
        for _, row in df.head(20).iterrows():
            lines.append("| " + " | ".join(str(v) for v in row) + " |")
        return "\n".join(lines)
    except Exception:
        return ""
