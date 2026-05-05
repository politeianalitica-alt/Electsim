"""
File Ingestor — Bloque 9.

Ingesta de archivos locales y URLs:
  - Calcula file_hash (SHA-256)
  - Detecta MIME type
  - Copia a data/raw/documents/{source}/
  - Registra SourceDocument
  - Registra raw_data_manifest si Bloque 8 existe (no rompe si no)
"""
from __future__ import annotations

import hashlib
import logging
import mimetypes
import shutil
import uuid
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_DATA_ROOT = Path("data/raw/documents")


def compute_file_hash(path: Path) -> str:
    """SHA-256 del archivo."""
    sha256 = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
    except Exception as exc:
        logger.debug("compute_file_hash %s: %s", path, exc)
        return f"hash_error_{uuid.uuid4().hex[:8]}"


def detect_mime_type(path: Path) -> str | None:
    """Detecta el MIME type por extensión."""
    mime, _ = mimetypes.guess_type(str(path))
    if mime:
        return mime
    # Fallbacks por extensión
    ext = path.suffix.lower()
    _MAP = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".html": "text/html",
        ".htm": "text/html",
        ".md": "text/markdown",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".json": "application/json",
        ".xml": "application/xml",
    }
    return _MAP.get(ext)


def _copy_to_storage(src: Path, source: str) -> Path:
    """Copia el archivo a data/raw/documents/{source}/."""
    dest_dir = _DATA_ROOT / source
    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / src.name
        if not dest.exists():
            shutil.copy2(src, dest)
        return dest
    except Exception as exc:
        logger.debug("_copy_to_storage: %s", exc)
        return src


def _register_raw_manifest(
    source_id: str,
    path: Path,
    document_id: str,
    engine: Any,
) -> None:
    """Registra en raw_data_manifest si Bloque 8 existe."""
    try:
        from etl.operations.raw_manifest import register_raw_file
        register_raw_file(
            source_id=source_id,
            path=path,
            run_id=None,
            record_count=None,
            engine=engine,
        )
    except Exception:
        pass  # Bloque 8 opcional


def ingest_local_file(
    path: str | Path,
    source: str,
    source_type: str,
    metadata: dict | None = None,
    title: str | None = None,
    source_url: str | None = None,
    language: str = "es",
    copy_to_storage: bool = True,
    engine: Any = None,
) -> tuple:
    """
    Ingesta un archivo local.

    Returns:
        (SourceDocument, created: bool)
    """
    from etl.sources.documents.schemas import SourceDocument
    from etl.sources.documents.document_registry import register_document

    src_path = Path(path)
    if not src_path.exists():
        logger.warning("ingest_local_file: archivo no encontrado: %s", path)
        # Crear documento con estado de error para no romper el pipeline
        doc = SourceDocument(
            source=source,
            source_type=source_type,
            file_name=src_path.name,
            file_path=str(path),
            source_url=source_url,
            title=title or src_path.stem,
            file_hash=f"missing_{uuid.uuid4().hex[:8]}",
            mime_type=detect_mime_type(src_path),
            language=language,
            parse_status="failed",
            raw_payload={"error": "file_not_found", **(metadata or {})},
        )
        return register_document(doc, engine=engine)

    # Calcular hash
    file_hash = compute_file_hash(src_path)
    mime_type = detect_mime_type(src_path)
    file_size = src_path.stat().st_size

    # Copiar a almacenamiento
    stored_path = _copy_to_storage(src_path, source) if copy_to_storage else src_path

    doc = SourceDocument(
        source=source,
        source_type=source_type,
        file_name=src_path.name,
        file_path=str(stored_path),
        source_url=source_url,
        title=title or src_path.stem,
        file_hash=file_hash,
        mime_type=mime_type,
        file_size_bytes=file_size,
        language=language,
        parse_status="pending",
        raw_payload=metadata or {},
    )

    result = register_document(doc, engine=engine)

    # Registrar en raw_data_manifest (Bloque 8, opcional)
    if result[1]:  # created=True
        _register_raw_manifest(source, stored_path, doc.document_id, engine)

    return result


def ingest_url(
    url: str,
    source: str,
    source_type: str,
    metadata: dict | None = None,
    title: str | None = None,
    language: str = "es",
    engine: Any = None,
) -> tuple:
    """
    Ingesta un documento desde URL.
    Descarga el archivo y lo procesa como ingest_local_file.

    Returns:
        (SourceDocument, created: bool)
    """
    import tempfile
    from etl.sources.documents.schemas import SourceDocument
    from etl.sources.documents.document_registry import register_document

    try:
        import requests
        resp = requests.get(url, timeout=30, stream=True)
        resp.raise_for_status()

        # Detectar extensión por Content-Type o URL
        content_type = resp.headers.get("content-type", "").split(";")[0].strip()
        ext = _mime_to_ext(content_type) or Path(url.split("?")[0]).suffix or ".bin"

        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            for chunk in resp.iter_content(65536):
                tmp.write(chunk)
            tmp_path = Path(tmp.name)

        result = ingest_local_file(
            path=tmp_path,
            source=source,
            source_type=source_type,
            metadata={**(metadata or {}), "original_url": url},
            title=title,
            source_url=url,
            language=language,
            copy_to_storage=True,
            engine=engine,
        )
        tmp_path.unlink(missing_ok=True)
        return result

    except Exception as exc:
        logger.warning("ingest_url %s: %s", url, exc)
        doc = SourceDocument(
            source=source,
            source_type=source_type,
            source_url=url,
            title=title or url,
            file_hash=f"url_error_{uuid.uuid4().hex[:8]}",
            language=language,
            parse_status="failed",
            raw_payload={"error": str(exc), **(metadata or {})},
        )
        return register_document(doc, engine=engine)


def _mime_to_ext(mime: str) -> str:
    """Convierte MIME type a extensión de archivo."""
    _MAP = {
        "application/pdf": ".pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
        "text/html": ".html",
        "text/plain": ".txt",
        "text/markdown": ".md",
        "text/csv": ".csv",
    }
    return _MAP.get(mime, "")
