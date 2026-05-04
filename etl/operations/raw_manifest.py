"""
Raw Data Manifest — Bloque 8.

Registro de archivos brutos ingestados con trazabilidad completa:
  - path, formato, tamaño, checksum SHA-256
  - fuente, run_id, fecha, n_registros
  - inmutabilidad garantizada (immutable=True)

Si la tabla raw_data_manifest no existe, opera en modo log-only.
"""
from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

from etl.operations.schemas import RawDataManifest


def compute_checksum(path: Path) -> str:
    """
    Calcula el checksum SHA-256 de un archivo.

    Args:
        path: Ruta al archivo.

    Returns:
        Checksum SHA-256 en hexadecimal.
    """
    sha256 = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
    except Exception as exc:
        logger.debug("compute_checksum %s: %s", path, exc)
        return "checksum_error"


def register_raw_file(
    source_id: str,
    path: Path,
    run_id: str | None = None,
    record_count: int | None = None,
    engine: Any = None,
) -> RawDataManifest:
    """
    Registra un archivo bruto en el manifiesto.

    Args:
        source_id: ID de la fuente.
        path: Ruta al archivo bruto.
        run_id: ID de la ejecución de pipeline (opcional).
        record_count: Número de registros (opcional).
        engine: SQLAlchemy engine (None → log-only).

    Returns:
        RawDataManifest creado.
    """
    path = Path(path)
    manifest_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Calcular metadatos del archivo
    size_bytes = 0
    checksum = "not_computed"
    file_format = path.suffix.lstrip(".") or "unknown"

    if path.exists():
        try:
            size_bytes = path.stat().st_size
            checksum = compute_checksum(path)
        except Exception as exc:
            logger.debug("register_raw_file stat: %s", exc)
    else:
        logger.warning("register_raw_file: archivo no existe: %s", path)

    manifest = RawDataManifest(
        manifest_id=manifest_id,
        source_id=source_id,
        run_id=run_id,
        path=str(path),
        file_format=file_format,
        size_bytes=size_bytes,
        checksum=checksum,
        record_count=record_count,
        extracted_at=now,
        immutable=True,
    )

    logger.info(
        "raw_manifest: %s source=%s size=%.1fKB records=%s",
        path.name, source_id, size_bytes / 1024, record_count or "?"
    )

    # Persistir en BD si disponible
    if engine is not None:
        try:
            import json
            from sqlalchemy import text as sa_text
            with engine.begin() as conn:
                conn.execute(sa_text("""
                    INSERT INTO raw_data_manifest (
                        manifest_id, source_id, run_id, path,
                        file_format, size_bytes, checksum,
                        record_count, extracted_at, immutable, metadata
                    ) VALUES (
                        :manifest_id, :source_id, :run_id, :path,
                        :file_format, :size_bytes, :checksum,
                        :record_count, :extracted_at, :immutable, :metadata::jsonb
                    )
                    ON CONFLICT (manifest_id) DO NOTHING
                """), {
                    "manifest_id": manifest_id,
                    "source_id": source_id,
                    "run_id": run_id,
                    "path": str(path),
                    "file_format": file_format,
                    "size_bytes": size_bytes,
                    "checksum": checksum,
                    "record_count": record_count,
                    "extracted_at": now,
                    "immutable": True,
                    "metadata": json.dumps({}),
                })
        except Exception as exc:
            logger.debug("register_raw_file DB: %s", exc)

    return manifest


def list_raw_files(
    source_id: str | None = None,
    limit: int = 100,
    engine: Any = None,
) -> list[RawDataManifest]:
    """
    Lista archivos brutos registrados.

    Args:
        source_id: Filtrar por fuente.
        limit: Máximo de resultados.
        engine: SQLAlchemy engine.

    Returns:
        Lista de RawDataManifest.
    """
    if engine is None:
        return []

    try:
        import pandas as pd
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            df = pd.read_sql(sa_text("""
                SELECT manifest_id, source_id, run_id, path,
                       file_format, size_bytes, checksum,
                       record_count, extracted_at, immutable
                FROM raw_data_manifest
                WHERE (:source_id IS NULL OR source_id = :source_id)
                ORDER BY extracted_at DESC
                LIMIT :limit
            """), conn, params={"source_id": source_id, "limit": limit})

        if df.empty:
            return []

        manifests = []
        for _, row in df.iterrows():
            try:
                manifests.append(RawDataManifest(
                    manifest_id=row["manifest_id"],
                    source_id=row["source_id"],
                    run_id=row.get("run_id"),
                    path=row["path"],
                    file_format=row.get("file_format", "unknown"),
                    size_bytes=int(row.get("size_bytes", 0)),
                    checksum=row.get("checksum", ""),
                    record_count=row.get("record_count"),
                    extracted_at=row["extracted_at"],
                    immutable=bool(row.get("immutable", True)),
                ))
            except Exception:
                continue
        return manifests

    except Exception as exc:
        logger.debug("list_raw_files: %s", exc)
        return []
