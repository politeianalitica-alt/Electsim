"""
politeia_os.narratives — Capa 4: Deteccion y analisis de narrativas mediaticas.

Modulos:
  models              — dataclasses Narrative, NarrativeActor, DiffusionVector
  detector            — clustering BERTopic y matching contra narrativas existentes
  frame_extractor     — extraccion del frame narrativo via Ollama
  emotion_classifier  — clasificacion de emocion dominante (pysentimiento + Ollama)
  diffusion_analyzer  — patron de difusion y deteccion de coordinacion
  lifecycle_tracker   — ciclo vital con series temporales (scipy)
  territory_mapper    — mapeo territorial por CCAA y provincia
  pipeline            — orquestacion Prefect (narrative-detection-flow)

Uso rapido:
    from politeia_os.narratives.pipeline import narrative_detection_flow
    run_log = narrative_detection_flow()

    # Para briefings (Bloque 3):
    from politeia_os.narratives.pipeline import get_active_narratives
    top3 = get_active_narratives(limit=3, hours=24)
"""

from .models import (  # noqa: F401
    DiffusionVector,
    Narrative,
    NarrativeActor,
    NarrativeRunLog,
)
from .pipeline import (  # noqa: F401
    narrative_detection_flow,
    get_active_narratives,
)

__all__ = [
    "Narrative",
    "NarrativeActor",
    "DiffusionVector",
    "NarrativeRunLog",
    "narrative_detection_flow",
    "get_active_narratives",
]
