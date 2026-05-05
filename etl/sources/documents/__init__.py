"""
etl.sources.documents — Bloque 9: Document Intelligence Core.

Módulo de parseo, chunking, citas y evidencias documentales.
"""
from etl.sources.documents.schemas import (
    SourceDocument,
    ParsedDocument,
    DocumentPage,
    DocumentChunk,
    ExtractedTable,
    EvidenceCitation,
    DraftReport,
    DocumentParseResult,
    DocumentSearchResult,
)

__all__ = [
    "SourceDocument",
    "ParsedDocument",
    "DocumentPage",
    "DocumentChunk",
    "ExtractedTable",
    "EvidenceCitation",
    "DraftReport",
    "DocumentParseResult",
    "DocumentSearchResult",
]
