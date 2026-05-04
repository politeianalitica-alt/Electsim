"""
Data Operations Core — Bloque 8.

Sistema nervioso operativo de ElectSim:
  source_registry    → fuentes registradas
  pipeline_registry  → pipelines definidos
  run_logger         → ejecuciones de pipelines
  quality_checks     → checks de calidad de datos
  freshness          → frescura de datos por módulo
  cache_manager      → gestión de caché HTTP
  raw_manifest       → registro de archivos brutos
  lineage            → linaje entre objetos
  backfill           → backfill y retry
  health_monitor     → salud global del sistema
"""
from etl.operations.schemas import (
    SourceDefinition,
    PipelineDefinition,
    PipelineRun,
    DataQualityCheck,
    DataQualityResult,
    SourceHealth,
    RawDataManifest,
    DataLineage,
    BackfillRequest,
    RetryPolicy,
)

__all__ = [
    "SourceDefinition",
    "PipelineDefinition",
    "PipelineRun",
    "DataQualityCheck",
    "DataQualityResult",
    "SourceHealth",
    "RawDataManifest",
    "DataLineage",
    "BackfillRequest",
    "RetryPolicy",
]
