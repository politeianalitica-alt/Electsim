"""Helper unificado · PDF/URL → texto Markdown estructurado (Sprint 1 · S1.4).

> **Sprint 1 · S1.4** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 1`)

Antes de este helper, cada conector (BOE, Congreso, Moncloa) gestionaba la
descarga + parsing PDF a mano con codigo duplicado. Este modulo unifica:

  PDF URL o ruta → docling (si habilitado) → markitdown (si habilitado)
                  → pdfplumber (fallback) → texto plano

Cualquier conector puede llamar `pdf_to_markdown(url)` y obtener el contenido
listo para meter en `NormalizedItem.body`. Sin saber nada de los parsers.

Uso tipico desde un conector:
```python
from etl.sources.documents.pdf_to_text import pdf_to_markdown

item = NormalizedItem(
    source="boe",
    item_id="BOE-A-2026-12345",
    title=titulo,
    body=pdf_to_markdown(pdf_url),  # ← extrae el contenido del PDF
    published_at=fecha,
    url=item_url,
    pdf_url=pdf_url,
)
```

Falla cerrado: si todos los parsers fallan, devuelve string vacio (no rompe
el conector). El item se persiste con body="" y el analista puede revisar
luego (queda flag en logs).
"""
from __future__ import annotations

import logging
import os
import tempfile
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Limites de seguridad
_MAX_PDF_BYTES = 50 * 1024 * 1024   # 50 MB · suficiente para BOE/sentencias/contratos
_DOWNLOAD_TIMEOUT_S = 30


def pdf_to_markdown(
    pdf_url_or_path: str,
    *,
    max_bytes: int = _MAX_PDF_BYTES,
    timeout_s: int = _DOWNLOAD_TIMEOUT_S,
) -> str:
    """Convierte un PDF (URL o ruta local) a Markdown estructurado.

    Pipeline:
      1. Si es URL → descargar a archivo temporal (con limite + timeout)
      2. Probar Docling (si habilitado · mejor en tablas/layout)
      3. Probar Markitdown (si habilitado · universal)
      4. Probar pdfplumber (fallback · siempre disponible)
      5. Si todos fallan → string vacio + log warning

    Args:
      pdf_url_or_path: URL http(s):// o ruta absoluta a fichero PDF
      max_bytes: limite de descarga (anti-DoS)
      timeout_s: timeout de descarga
    """
    if not pdf_url_or_path:
        return ""

    pdf_url_or_path = pdf_url_or_path.strip()
    if not pdf_url_or_path:
        return ""

    # 1. Resolver a ruta local
    local_path = _resolve_to_local_path(pdf_url_or_path, max_bytes, timeout_s)
    if local_path is None:
        return ""

    try:
        # 2. Docling primero (mejor calidad en tablas + layout BOE/sentencias)
        markdown = _try_docling(local_path)
        if markdown:
            return markdown

        # 3. Markitdown segundo (universal · cubre PDF tambien)
        markdown = _try_markitdown(local_path)
        if markdown:
            return markdown

        # 4. pdfplumber como fallback (siempre disponible en deps)
        markdown = _try_pdfplumber(local_path)
        if markdown:
            return markdown

        logger.warning("pdf_to_markdown: todos los parsers fallaron · %s", pdf_url_or_path)
        return ""

    finally:
        # Limpieza · si descargamos a temp, borrar
        if pdf_url_or_path.startswith(("http://", "https://")) and local_path.exists():
            try:
                local_path.unlink()
            except OSError:
                pass


# ────────────────────────────────────────────────────────────────────────
# Helpers · resolucion + parsers individuales
# ────────────────────────────────────────────────────────────────────────

def _resolve_to_local_path(
    pdf_url_or_path: str,
    max_bytes: int,
    timeout_s: int,
) -> Optional[Path]:
    """Si es URL · descarga a temp. Si es path · valida que existe."""
    if pdf_url_or_path.startswith(("http://", "https://")):
        try:
            # Whitelist scheme + content type · evitar SSRF basico
            req = urllib.request.Request(
                pdf_url_or_path,
                headers={"User-Agent": "Politeia-DocFetcher/1.0"},
            )
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                ctype = resp.headers.get("Content-Type", "").lower()
                if "pdf" not in ctype and not pdf_url_or_path.lower().endswith(".pdf"):
                    logger.debug("pdf_to_markdown: content-type=%s · skip", ctype)
                    return None
                content_length = resp.headers.get("Content-Length")
                if content_length and int(content_length) > max_bytes:
                    logger.warning("pdf_to_markdown: PDF demasiado grande %s · skip", content_length)
                    return None
                # Descarga a temp
                tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
                tmp_path = Path(tmp.name)
                downloaded = 0
                chunk = resp.read(65536)
                while chunk:
                    downloaded += len(chunk)
                    if downloaded > max_bytes:
                        tmp.close()
                        tmp_path.unlink(missing_ok=True)
                        logger.warning("pdf_to_markdown: PDF excedio %d bytes · abortado", max_bytes)
                        return None
                    tmp.write(chunk)
                    chunk = resp.read(65536)
                tmp.close()
                return tmp_path
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            logger.warning("pdf_to_markdown: descarga fallida %s · %s", pdf_url_or_path, exc)
            return None

    # Path local
    path = Path(pdf_url_or_path)
    if not path.exists() or not path.is_file():
        return None
    if path.stat().st_size > max_bytes:
        logger.warning("pdf_to_markdown: PDF local demasiado grande · %s", path)
        return None
    return path


def _try_docling(path: Path) -> str:
    """Intenta extraer con Docling. String vacio si no disponible/falla."""
    try:
        from etl.sources.documents.docling_parser import is_docling_enabled, parse_with_docling
    except ImportError:
        return ""
    if not is_docling_enabled():
        return ""
    try:
        result = parse_with_docling(path)
        return getattr(result, "markdown", "") or getattr(result, "plain_text", "") or ""
    except Exception as exc:
        logger.debug("pdf_to_markdown.docling: %s · %s", path.name, exc)
        return ""


def _try_markitdown(path: Path) -> str:
    """Intenta extraer con Markitdown. String vacio si no disponible/falla."""
    try:
        from etl.sources.documents.markitdown_parser import is_markitdown_enabled, parse_file
    except ImportError:
        return ""
    if not is_markitdown_enabled():
        return ""
    try:
        result = parse_file(path)
        if result.get("ok"):
            return str(result.get("markdown", ""))
    except Exception as exc:
        logger.debug("pdf_to_markdown.markitdown: %s · %s", path.name, exc)
    return ""


def _try_pdfplumber(path: Path) -> str:
    """Fallback con pdfplumber · siempre disponible. String vacio si falla."""
    try:
        import pdfplumber  # type: ignore
    except ImportError:
        return ""
    try:
        out_pages: list[str] = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                txt = page.extract_text() or ""
                if txt.strip():
                    out_pages.append(txt.strip())
        return "\n\n".join(out_pages)
    except Exception as exc:
        logger.debug("pdf_to_markdown.pdfplumber: %s · %s", path.name, exc)
        return ""


# ────────────────────────────────────────────────────────────────────────
# API alternativa: bytes en memoria (no temp file)
# ────────────────────────────────────────────────────────────────────────

def pdf_bytes_to_markdown(pdf_bytes: bytes) -> str:
    """Convierte bytes de PDF en memoria a Markdown.

    Util cuando ya descargamos el PDF en el cliente (ej. respuesta de una API).
    Internamente crea un fichero temporal y llama a pdf_to_markdown.
    """
    if not pdf_bytes:
        return ""
    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp_path = Path(tmp.name)
    try:
        tmp.write(pdf_bytes)
        tmp.close()
        result = pdf_to_markdown(str(tmp_path))
        return result
    finally:
        tmp_path.unlink(missing_ok=True)
