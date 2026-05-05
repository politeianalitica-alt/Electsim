"""
HTML / Markdown / TXT Parser — Bloque 9.

Parsea HTML, Markdown y texto plano.
Usa BeautifulSoup si está disponible. No rompe si falta.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

_BS4_OK = False
try:
    from bs4 import BeautifulSoup  # noqa: F401
    _BS4_OK = True
except ImportError:
    pass


def parse_html(path: str | Path) -> "ParsedDocument":
    """Parsea un archivo HTML extrayendo texto limpio."""
    from etl.sources.documents.schemas import ParsedDocument
    path = Path(path)
    now = datetime.now(timezone.utc)

    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        if _BS4_OK:
            text, markdown = _html_to_text_bs4(content)
        else:
            text = _strip_html_simple(content)
            markdown = text

        return ParsedDocument(
            document_id=path.stem,
            title=_extract_html_title(content),
            plain_text=text,
            markdown=markdown,
            word_count=len(text.split()),
            quality_score=0.7 if text else 0.1,
            parser_used="html_parser",
            parsed_at=now,
        )
    except Exception as exc:
        logger.warning("parse_html %s: %s", path, exc)
        return ParsedDocument(
            document_id=path.stem,
            parser_used="html_parser",
            warnings=[str(exc)],
            parsed_at=now,
        )


def parse_html_string(html: str, document_id: str = "doc") -> "ParsedDocument":
    """Parsea una cadena HTML."""
    from etl.sources.documents.schemas import ParsedDocument
    now = datetime.now(timezone.utc)
    if _BS4_OK:
        text, markdown = _html_to_text_bs4(html)
    else:
        text = _strip_html_simple(html)
        markdown = text

    return ParsedDocument(
        document_id=document_id,
        plain_text=text,
        markdown=markdown,
        word_count=len(text.split()),
        parser_used="html_parser",
        parsed_at=now,
    )


def parse_markdown(path: str | Path) -> "ParsedDocument":
    """Parsea un archivo Markdown."""
    from etl.sources.documents.schemas import ParsedDocument
    path = Path(path)
    now = datetime.now(timezone.utc)

    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        plain = _md_to_plain(content)
        title = _extract_md_title(content)

        return ParsedDocument(
            document_id=path.stem,
            title=title,
            plain_text=plain,
            markdown=content,
            word_count=len(plain.split()),
            quality_score=0.9,
            parser_used="markdown_parser",
            parsed_at=now,
        )
    except Exception as exc:
        logger.warning("parse_markdown %s: %s", path, exc)
        return ParsedDocument(
            document_id=path.stem,
            parser_used="markdown_parser",
            warnings=[str(exc)],
            parsed_at=now,
        )


def parse_text(path: str | Path) -> "ParsedDocument":
    """Parsea un archivo de texto plano."""
    from etl.sources.documents.schemas import ParsedDocument
    path = Path(path)
    now = datetime.now(timezone.utc)

    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        return ParsedDocument(
            document_id=path.stem,
            title=path.stem,
            plain_text=content,
            markdown=content,
            word_count=len(content.split()),
            quality_score=0.85,
            parser_used="text_parser",
            parsed_at=now,
        )
    except Exception as exc:
        logger.warning("parse_text %s: %s", path, exc)
        return ParsedDocument(
            document_id=path.stem,
            parser_used="text_parser",
            warnings=[str(exc)],
            parsed_at=now,
        )


# ── Helpers ────────────────────────────────────────────────────────────────────

def _html_to_text_bs4(html: str) -> tuple[str, str]:
    """Extrae texto y markdown básico de HTML con BeautifulSoup."""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

        # Eliminar scripts y estilos
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        # Texto plano
        text = soup.get_text(separator="\n", strip=True)
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Markdown básico
        md_lines = []
        for tag in soup.find_all(["h1", "h2", "h3", "h4", "p", "li", "table"]):
            name = tag.name
            content = tag.get_text(strip=True)
            if not content:
                continue
            if name == "h1":
                md_lines.append(f"# {content}")
            elif name == "h2":
                md_lines.append(f"## {content}")
            elif name == "h3":
                md_lines.append(f"### {content}")
            elif name == "h4":
                md_lines.append(f"#### {content}")
            elif name == "li":
                md_lines.append(f"- {content}")
            elif name == "p":
                md_lines.append(content)

        markdown = "\n\n".join(md_lines)
        return text, markdown
    except Exception as exc:
        logger.debug("_html_to_text_bs4: %s", exc)
        return _strip_html_simple(html), _strip_html_simple(html)


def _strip_html_simple(html: str) -> str:
    """Elimina tags HTML con regex (fallback sin bs4)."""
    text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&[a-zA-Z]+;", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def _extract_html_title(html: str) -> str | None:
    """Extrae el título de un documento HTML."""
    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if match:
        return _strip_html_simple(match.group(1)).strip()[:200]
    # Fallback: primer h1
    match = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.IGNORECASE | re.DOTALL)
    if match:
        return _strip_html_simple(match.group(1)).strip()[:200]
    return None


def _md_to_plain(markdown: str) -> str:
    """Convierte Markdown a texto plano básico."""
    text = re.sub(r"#{1,6}\s+", "", markdown)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = re.sub(r"`(.*?)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_md_title(markdown: str) -> str | None:
    """Extrae el primer encabezado # como título."""
    match = re.search(r"^#\s+(.+)$", markdown, re.MULTILINE)
    return match.group(1).strip() if match else None
