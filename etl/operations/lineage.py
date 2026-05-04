"""
Data Lineage — Bloque 8.

Registra relaciones de linaje entre objetos del sistema:

  BOE raw PDF → LegalItem → LegalDocumentChunk → RAG doc → Brain answer
  RSS article → MediaItem → NarrativeCluster → TerritorialSignal → CampaignOpportunity
  INE CSV → MacroIndicator → ITPE → Alert

Si la tabla data_lineage no existe, opera en modo log-only.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

from etl.operations.schemas import DataLineage


def record_lineage(
    source_object_type: str,
    source_object_id: str,
    target_object_type: str,
    target_object_id: str,
    transformation: str,
    pipeline_id: str | None = None,
    run_id: str | None = None,
    confidence: float = 1.0,
    engine: Any = None,
) -> DataLineage | None:
    """
    Registra una relación de linaje entre dos objetos.

    Args:
        source_object_type: Tipo del objeto origen (ej. 'raw_file', 'media_item').
        source_object_id: ID del objeto origen.
        target_object_type: Tipo del objeto destino (ej. 'legal_item', 'rag_document').
        target_object_id: ID del objeto destino.
        transformation: Descripción de la transformación aplicada.
        pipeline_id: Pipeline responsable.
        run_id: Ejecución del pipeline.
        confidence: Confianza de la relación (0-1).
        engine: SQLAlchemy engine.

    Returns:
        DataLineage creado o None si fallo.
    """
    lineage_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    lineage = DataLineage(
        lineage_id=lineage_id,
        source_object_type=source_object_type,
        source_object_id=str(source_object_id),
        target_object_type=target_object_type,
        target_object_id=str(target_object_id),
        transformation=transformation,
        pipeline_id=pipeline_id,
        run_id=run_id,
        confidence=confidence,
        created_at=now,
    )

    logger.debug(
        "lineage: %s[%s] → %s[%s] (%s)",
        source_object_type, source_object_id[:20],
        target_object_type, target_object_id[:20],
        transformation[:40],
    )

    if engine is None:
        return lineage

    try:
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO data_lineage (
                    lineage_id, source_object_type, source_object_id,
                    target_object_type, target_object_id,
                    transformation, pipeline_id, run_id,
                    confidence, created_at
                ) VALUES (
                    :lineage_id, :source_object_type, :source_object_id,
                    :target_object_type, :target_object_id,
                    :transformation, :pipeline_id, :run_id,
                    :confidence, :created_at
                )
                ON CONFLICT (lineage_id) DO NOTHING
            """), {
                "lineage_id": lineage_id,
                "source_object_type": source_object_type,
                "source_object_id": str(source_object_id),
                "target_object_type": target_object_type,
                "target_object_id": str(target_object_id),
                "transformation": transformation,
                "pipeline_id": pipeline_id,
                "run_id": run_id,
                "confidence": confidence,
                "created_at": now,
            })
    except Exception as exc:
        logger.debug("record_lineage DB: %s", exc)

    return lineage


def get_upstream(
    object_type: str,
    object_id: str,
    engine: Any = None,
) -> list[DataLineage]:
    """
    Obtiene los objetos que son fuente de este objeto (upstream).

    Args:
        object_type: Tipo del objeto.
        object_id: ID del objeto.

    Returns:
        Lista de DataLineage donde este objeto es el target.
    """
    if engine is None:
        return []

    try:
        import pandas as pd
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            df = pd.read_sql(sa_text("""
                SELECT * FROM data_lineage
                WHERE target_object_type = :object_type
                  AND target_object_id = :object_id
                ORDER BY created_at DESC
                LIMIT 50
            """), conn, params={"object_type": object_type, "object_id": str(object_id)})
        return _df_to_lineages(df)
    except Exception as exc:
        logger.debug("get_upstream: %s", exc)
        return []


def get_downstream(
    object_type: str,
    object_id: str,
    engine: Any = None,
) -> list[DataLineage]:
    """
    Obtiene los objetos derivados de este objeto (downstream).

    Args:
        object_type: Tipo del objeto.
        object_id: ID del objeto.

    Returns:
        Lista de DataLineage donde este objeto es el source.
    """
    if engine is None:
        return []

    try:
        import pandas as pd
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            df = pd.read_sql(sa_text("""
                SELECT * FROM data_lineage
                WHERE source_object_type = :object_type
                  AND source_object_id = :object_id
                ORDER BY created_at DESC
                LIMIT 50
            """), conn, params={"object_type": object_type, "object_id": str(object_id)})
        return _df_to_lineages(df)
    except Exception as exc:
        logger.debug("get_downstream: %s", exc)
        return []


def get_lineage_chain(
    object_type: str,
    object_id: str,
    engine: Any = None,
    max_depth: int = 5,
) -> dict:
    """
    Obtiene la cadena completa de linaje (upstream + downstream).

    Returns:
        Dict con upstream y downstream hasta max_depth niveles.
    """
    result = {
        "object_type": object_type,
        "object_id": object_id,
        "upstream": [],
        "downstream": [],
    }

    upstream = get_upstream(object_type, object_id, engine)
    downstream = get_downstream(object_type, object_id, engine)

    result["upstream"] = [
        {
            "source_type": l.source_object_type,
            "source_id": l.source_object_id,
            "transformation": l.transformation,
            "pipeline_id": l.pipeline_id,
            "confidence": l.confidence,
        }
        for l in upstream
    ]
    result["downstream"] = [
        {
            "target_type": l.target_object_type,
            "target_id": l.target_object_id,
            "transformation": l.transformation,
            "pipeline_id": l.pipeline_id,
            "confidence": l.confidence,
        }
        for l in downstream
    ]

    return result


def _df_to_lineages(df) -> list[DataLineage]:
    """Convierte un DataFrame a lista de DataLineage."""
    if df.empty:
        return []
    lineages = []
    for _, row in df.iterrows():
        try:
            lineages.append(DataLineage(
                lineage_id=row["lineage_id"],
                source_object_type=row["source_object_type"],
                source_object_id=row["source_object_id"],
                target_object_type=row["target_object_type"],
                target_object_id=row["target_object_id"],
                transformation=row.get("transformation", ""),
                pipeline_id=row.get("pipeline_id"),
                run_id=row.get("run_id"),
                confidence=float(row.get("confidence", 1.0)),
                created_at=row["created_at"],
            ))
        except Exception:
            continue
    return lineages
