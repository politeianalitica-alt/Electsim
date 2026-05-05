"""
Chunker — Bloque 9.

Divide documentos en chunks citables:
  - chunk_markdown(): respeta secciones de Markdown
  - chunk_by_pages(): un chunk por página
  - chunk_legal_document(): respeta artículos, títulos, disposiciones

Cada chunk tiene:
  - chunk_id estable: {document_id}:chunk:{index}
  - section_title extraída
  - page_start / page_end cuando disponible
  - citation_ref
"""
from __future__ import annotations

import re
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from etl.sources.documents.schemas import DocumentChunk, DocumentPage

logger = logging.getLogger(__name__)

# Expresiones regulares para documentos legales
_ARTICLE_RE = re.compile(
    r"^(art[íi]culo\s+\d+[\.\-]?|art\.\s*\d+|cap[íi]tulo\s+[IVXivx\d]+|"
    r"t[íi]tulo\s+[IVXivx\d]+|disposici[oó]n\s+(?:adicional|transitoria|final|derogatoria)"
    r"(?:\s+(?:primera|segunda|tercera|cuarta|quinta|sexta|s[eé]ptima|octava|novena|décima|\d+\.?))?|"
    r"anex[oi]\s+[IVXivx\d]*|secci[oó]n\s+\d+|p[áa]rrafo\s+\d+)",
    re.IGNORECASE | re.MULTILINE,
)

_HEADING_RE = re.compile(r"^#{1,6}\s+(.+)$", re.MULTILINE)


def _estimate_tokens(text: str) -> int:
    """Estimación rápida: ~0.75 tokens por palabra."""
    return int(len(text.split()) * 0.75)


def _make_chunk_id(document_id: str, index: int) -> str:
    return f"{document_id}:chunk:{index}"


def chunk_markdown(
    document_id: str,
    markdown: str,
    max_tokens: int = 800,
    overlap_tokens: int = 120,
) -> list["DocumentChunk"]:
    """
    Divide Markdown en chunks respetando secciones (#, ##, ###).

    Args:
        document_id: ID del documento.
        markdown: Contenido Markdown completo.
        max_tokens: Máximo de tokens por chunk (estimado).
        overlap_tokens: Solapamiento entre chunks.
    """
    from etl.sources.documents.schemas import DocumentChunk

    if not markdown or not markdown.strip():
        return []

    chunks = []
    # Dividir por headings
    sections = _split_by_headings(markdown)

    chunk_idx = 0
    current_section = None
    buffer = []
    buffer_tokens = 0

    for title, content in sections:
        if title:
            current_section = title

        content_tokens = _estimate_tokens(content)

        if content_tokens > max_tokens:
            # Flush buffer
            if buffer:
                chunks.append(_make_document_chunk(
                    document_id, chunk_idx, "\n\n".join(buffer), current_section
                ))
                chunk_idx += 1
                buffer = []
                buffer_tokens = 0

            # Dividir sección larga
            sub_chunks = _split_text(content, max_tokens, overlap_tokens)
            for sub in sub_chunks:
                chunks.append(_make_document_chunk(
                    document_id, chunk_idx, sub, current_section
                ))
                chunk_idx += 1
        else:
            if buffer_tokens + content_tokens > max_tokens and buffer:
                chunks.append(_make_document_chunk(
                    document_id, chunk_idx, "\n\n".join(buffer), current_section
                ))
                chunk_idx += 1
                buffer = []
                buffer_tokens = 0

            buffer.append(content)
            buffer_tokens += content_tokens

    if buffer:
        chunks.append(_make_document_chunk(
            document_id, chunk_idx, "\n\n".join(buffer), current_section
        ))

    return chunks


def chunk_legal_document(
    document_id: str,
    text: str,
    max_tokens: int = 800,
) -> list["DocumentChunk"]:
    """
    Divide un documento legal (BOE, BOCG) respetando artículos,
    títulos, disposiciones y anexos.
    """
    from etl.sources.documents.schemas import DocumentChunk

    if not text or not text.strip():
        return []

    # Encontrar posiciones de artículos/secciones
    matches = list(_ARTICLE_RE.finditer(text))

    if not matches:
        # Si no hay estructura legal clara, usar chunk_markdown
        return chunk_markdown(document_id, text, max_tokens=max_tokens)

    chunks = []
    chunk_idx = 0

    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        section_text = text[start:end].strip()
        section_title = match.group(0).strip()

        if not section_text:
            continue

        if _estimate_tokens(section_text) <= max_tokens:
            chunks.append(_make_document_chunk(
                document_id, chunk_idx, section_text, section_title,
                citation_ref=_legal_citation_ref(document_id, section_title),
            ))
            chunk_idx += 1
        else:
            sub_chunks = _split_text(section_text, max_tokens, overlap_tokens=80)
            for j, sub in enumerate(sub_chunks):
                chunks.append(_make_document_chunk(
                    document_id, chunk_idx, sub,
                    f"{section_title} (parte {j+1})",
                    citation_ref=_legal_citation_ref(document_id, section_title),
                ))
                chunk_idx += 1

    # Texto antes del primer match
    if matches and matches[0].start() > 0:
        preamble = text[:matches[0].start()].strip()
        if preamble:
            chunks.insert(0, _make_document_chunk(
                document_id, -1, preamble, "Preámbulo"
            ))
            # Re-indexar
            for c in chunks:
                c.chunk_index += 1

    return chunks


def chunk_by_pages(
    document_id: str,
    pages: list["DocumentPage"],
    max_tokens: int = 800,
) -> list["DocumentChunk"]:
    """
    Crea chunks a partir de páginas del documento.
    Una página puede dividirse en múltiples chunks si es muy larga.
    """
    from etl.sources.documents.schemas import DocumentChunk

    if not pages:
        return []

    chunks = []
    chunk_idx = 0

    for page in pages:
        text = page.text or page.markdown or ""
        if not text.strip():
            continue

        if _estimate_tokens(text) <= max_tokens:
            chunks.append(_make_document_chunk(
                document_id, chunk_idx, text,
                page_start=page.page_number,
                page_end=page.page_number,
            ))
            chunk_idx += 1
        else:
            sub_chunks = _split_text(text, max_tokens, overlap_tokens=80)
            for sub in sub_chunks:
                chunks.append(_make_document_chunk(
                    document_id, chunk_idx, sub,
                    page_start=page.page_number,
                    page_end=page.page_number,
                ))
                chunk_idx += 1

    return chunks


def persist_chunks(chunks: list, engine=None) -> int:
    """Persiste chunks en la tabla document_chunks."""
    if not chunks or engine is None:
        return 0

    saved = 0
    try:
        import json
        from sqlalchemy import text as sa_text
        for chunk in chunks:
            try:
                with engine.begin() as conn:
                    conn.execute(sa_text("""
                        INSERT INTO document_chunks (
                            chunk_id, document_id, chunk_index, section_title,
                            page_start, page_end, text, token_count,
                            topics, entities, sectors, citation_ref, metadata
                        ) VALUES (
                            :chunk_id, :document_id, :chunk_index, :section_title,
                            :page_start, :page_end, :text, :token_count,
                            :topics, :entities, :sectors, :citation_ref, :metadata::jsonb
                        )
                        ON CONFLICT (chunk_id) DO NOTHING
                    """), {
                        "chunk_id": chunk.chunk_id,
                        "document_id": chunk.document_id,
                        "chunk_index": chunk.chunk_index,
                        "section_title": chunk.section_title,
                        "page_start": chunk.page_start,
                        "page_end": chunk.page_end,
                        "text": chunk.text,
                        "token_count": chunk.token_count,
                        "topics": chunk.topics or [],
                        "entities": chunk.entities or [],
                        "sectors": chunk.sectors or [],
                        "citation_ref": chunk.citation_ref,
                        "metadata": json.dumps(chunk.metadata),
                    })
                saved += 1
            except Exception as exc:
                logger.debug("persist_chunks item: %s", exc)
    except Exception as exc:
        logger.debug("persist_chunks: %s", exc)

    return saved


# ── Helpers internos ───────────────────────────────────────────────────────────

def _make_document_chunk(
    document_id: str,
    index: int,
    text: str,
    section_title: str | None = None,
    page_start: int | None = None,
    page_end: int | None = None,
    citation_ref: str | None = None,
) -> "DocumentChunk":
    from etl.sources.documents.schemas import DocumentChunk
    return DocumentChunk(
        chunk_id=_make_chunk_id(document_id, index),
        document_id=document_id,
        chunk_index=index,
        text=text,
        section_title=section_title,
        page_start=page_start,
        page_end=page_end,
        token_count=_estimate_tokens(text),
        citation_ref=citation_ref,
    )


def _split_by_headings(markdown: str) -> list[tuple[str | None, str]]:
    """Divide Markdown en secciones (título, contenido)."""
    sections = []
    lines = markdown.split("\n")
    current_title = None
    current_lines = []

    for line in lines:
        heading = _HEADING_RE.match(line)
        if heading:
            if current_lines:
                sections.append((current_title, "\n".join(current_lines).strip()))
            current_title = heading.group(1).strip()
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        sections.append((current_title, "\n".join(current_lines).strip()))

    return sections


def _split_text(text: str, max_tokens: int, overlap_tokens: int = 80) -> list[str]:
    """Divide texto largo en bloques con solapamiento."""
    words = text.split()
    max_words = int(max_tokens / 0.75)
    overlap_words = int(overlap_tokens / 0.75)

    if len(words) <= max_words:
        return [text]

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + max_words, len(words))
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words))
        if end == len(words):
            break
        start = end - overlap_words

    return chunks


def _legal_citation_ref(document_id: str, section_title: str) -> str:
    """Genera referencia de cita para sección legal."""
    # Intentar extraer ID del BOE del document_id
    parts = document_id.split(":")
    doc_ref = parts[-1] if len(parts) > 1 else document_id
    return f"{doc_ref}, {section_title[:80]}"
