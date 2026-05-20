"""Markitdown Parser · conversor universal a Markdown (Sprint 1 · S1.3).

> **Sprint 1 · S1.3** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 1`)

Markitdown (Microsoft AutoGen) es un conversor universal a Markdown:
PDF, DOCX, XLSX, PPTX, HTML, EPUB, imagenes (con OCR), audio (Whisper),
YouTube transcripts, CSV/JSON/XML, ZIP. Disenado para alimentar LLMs.

**Diferencia con Docling:**
  - Docling (IBM): especializado en PDFs cientificos/legales · mejor en
    tablas complejas + layout + figuras. Mas pesado (TorchVision + tables).
  - Markitdown (MS): universal y ligero · mejor para HTML/DOCX/XLSX/audio.

**Politica:** usar markitdown para formatos ligeros (HTML, DOCX, XLSX, EPUB,
audio, imagenes), usar docling para PDFs complejos (BOE, sentencias, contratos
con tablas anidadas). El router en `parser_router.py` decide.

**Activacion:** opcional vía pip install markitdown[all]. Si no esta
instalado, las funciones devuelven `unavailable=True` sin romper.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_MARKITDOWN_OK = False
_MARKITDOWN_AVAILABLE_MSG = "Markitdown no instalado. Instala: pip install 'markitdown[all]'"

try:
    from markitdown import MarkItDown  # type: ignore
    _MARKITDOWN_OK = True
except ImportError:
    MarkItDown = None  # type: ignore[assignment, misc]


def is_markitdown_enabled() -> bool:
    """Markitdown habilitado si esta instalado Y env var activada (o auto)."""
    if not _MARKITDOWN_OK:
        return False
    flag = os.getenv("ELECTSIM_DOCUMENTS_USE_MARKITDOWN", "auto").strip().lower()
    return flag in {"true", "1", "yes", "auto"}


@lru_cache(maxsize=1)
def _get_markitdown() -> Any | None:
    """Singleton del MarkItDown con configuracion compartida."""
    if not is_markitdown_enabled() or MarkItDown is None:
        return None
    try:
        return MarkItDown()
    except Exception as exc:
        logger.warning("markitdown_parser: error inicializando · %s", exc)
        return None


# ────────────────────────────────────────────────────────────────────────
# API publica (compatible con docling_parser y office_parser existentes)
# ────────────────────────────────────────────────────────────────────────

def parse_file(file_path: str | Path) -> dict[str, Any]:
    """Convierte un fichero a Markdown estructurado.

    Soporta: PDF, DOCX, XLSX, PPTX, HTML, EPUB, imagen (OCR), audio, JSON,
    XML, CSV, ZIP, YouTube URL.

    Output:
    ```
    {
        "ok": bool,
        "markdown": str,
        "metadata": {file_size, mime_type, parsed_at, source_path},
        "format": "markitdown",
        "error": str | None,
    }
    ```
    """
    md = _get_markitdown()
    if md is None:
        return {
            "ok": False,
            "unavailable": True,
            "error": _MARKITDOWN_AVAILABLE_MSG,
            "markdown": "",
            "metadata": {},
            "format": "markitdown",
        }
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        return {
            "ok": False,
            "error": f"Fichero no existe: {path}",
            "markdown": "",
            "metadata": {},
            "format": "markitdown",
        }
    try:
        result = md.convert(str(path))
        return {
            "ok": True,
            "markdown": str(result.text_content or ""),
            "metadata": {
                "file_size": path.stat().st_size,
                "source_path": str(path),
                "parsed_at": datetime.now(timezone.utc).isoformat(),
                "title": getattr(result, "title", "") or "",
            },
            "format": "markitdown",
            "error": None,
        }
    except Exception as exc:
        logger.warning("markitdown_parser.parse_file · %s · %s", path, exc)
        return {
            "ok": False,
            "error": str(exc),
            "markdown": "",
            "metadata": {"source_path": str(path)},
            "format": "markitdown",
        }


def parse_url(url: str) -> dict[str, Any]:
    """Convierte una URL (HTML, YouTube, PDF online) a Markdown.

    Util para ingestar contenido web sin descargar manualmente.
    """
    md = _get_markitdown()
    if md is None:
        return {
            "ok": False,
            "unavailable": True,
            "error": _MARKITDOWN_AVAILABLE_MSG,
            "markdown": "",
            "metadata": {},
            "format": "markitdown",
        }
    try:
        result = md.convert(url)
        return {
            "ok": True,
            "markdown": str(result.text_content or ""),
            "metadata": {
                "source_url": url,
                "parsed_at": datetime.now(timezone.utc).isoformat(),
                "title": getattr(result, "title", "") or "",
            },
            "format": "markitdown",
            "error": None,
        }
    except Exception as exc:
        logger.warning("markitdown_parser.parse_url · %s · %s", url, exc)
        return {
            "ok": False,
            "error": str(exc),
            "markdown": "",
            "metadata": {"source_url": url},
            "format": "markitdown",
        }
