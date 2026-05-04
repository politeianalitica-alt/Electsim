"""
agents/brain — Politeia Brain Core.

Componentes originales:
  ollama_client.py          OllamaClient simplificado
  analyst_brain.py          AnalystBrain — insights proactivos
  context_engine.py         ContextEngine — contexto en background
  web_ingestion/            Extraccion web, RSS, DuckDuckGo

Bloque 3 — nuevos:
  schemas.py                Pydantic: EvidenceItem, EvidencePack, BrainContext, AgentRunRequest/Result
  llm_gateway.py            Puerta LLM: Ollama → LiteLLM → Claude
  model_router.py           Selección de modelo por task_type
  context_builder.py        Contexto por módulo (legislativo, medios, electoral…)
  rag_indexer.py            Indexa Bloques 1+2 en ChromaDB, búsqueda semántica
  evidence_pack.py          Builders de EvidenceItem/EvidencePack
  agent_runner.py           Ejecuta agentes tipados y trazables
  run_logger.py             Log de ejecuciones en BD + memoria
  prompts.py                Plantillas de prompts por agente
"""

# Re-exports para uso cómodo
from .schemas import (
    EvidenceItem, EvidencePack, BrainContext,
    AgentRunRequest, AgentRunResult, ToolCallRecord,
    ModelRoute, RAGDocumentRef,
)
from .llm_gateway import LLMGateway, get_gateway
from .model_router import get_route, get_route_for_module
from .agent_runner import AgentRunner, get_runner, AVAILABLE_AGENTS
from .rag_indexer import semantic_search, index_all, rag_status
from .context_builder import ContextBuilder, get_context_builder

__all__ = [
    "EvidenceItem", "EvidencePack", "BrainContext",
    "AgentRunRequest", "AgentRunResult", "ToolCallRecord",
    "ModelRoute", "RAGDocumentRef",
    "LLMGateway", "get_gateway",
    "get_route", "get_route_for_module",
    "AgentRunner", "get_runner", "AVAILABLE_AGENTS",
    "semantic_search", "index_all", "rag_status",
    "ContextBuilder", "get_context_builder",
]
