"""
agents/brain — Politeia Brain Core.

Componentes originales:
  ollama_client.py          OllamaClient simplificado
  analyst_brain.py          AnalystBrain — insights proactivos
  context_engine.py         ContextEngine — contexto en background
  web_ingestion/            Extraccion web, RSS, DuckDuckGo

Bloque 3 — runtime de agentes tipados:
  schemas.py                Pydantic: EvidenceItem, EvidencePack, BrainContext, AgentRunRequest/Result
  llm_gateway.py            Puerta LLM: Ollama → LiteLLM → Claude
  model_router.py           Selección de modelo por task_type
  context_builder.py        Contexto por módulo (legislativo, medios, electoral…)
  rag_indexer.py            Indexa Bloques 1+2 en ChromaDB, búsqueda semántica
  evidence_pack.py          Builders de EvidenceItem/EvidencePack
  agent_runner.py           Ejecuta agentes tipados y trazables
  run_logger.py             Log de ejecuciones en BD + memoria
  prompts.py                Plantillas de prompts por agente

GroqBrain — cerebro razonador transversal (29 tools, 7 bloques):
  groq_brain.py             GroqBrainBase + ensamblador + singleton
  ingestion.py              Bloque 1 (5 tools)
  analysis.py               Bloque 2 (5 tools)
  forecasting.py            Bloque 3 (5 tools)
  intelligence.py           Bloque 4 (5 tools)
  content.py                Bloque 5 (5 tools)
  memory_tools.py           Bloque 6 (3 tools)
  orchestrator.py           Bloque 7 (1 tool — political_query ReAct)
  prompt_templates/         Plantillas .txt por tool
  tests/                    Tests smoke con mocks
"""

# Re-exports originales
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

# Re-exports GroqBrain (lazy: la clase final se construye al primer get_groq_brain())
from .groq_brain import (
    GroqBrainBase,
    get_groq_brain,
    reset_groq_brain,
)

__all__ = [
    # Existentes
    "EvidenceItem", "EvidencePack", "BrainContext",
    "AgentRunRequest", "AgentRunResult", "ToolCallRecord",
    "ModelRoute", "RAGDocumentRef",
    "LLMGateway", "get_gateway",
    "get_route", "get_route_for_module",
    "AgentRunner", "get_runner", "AVAILABLE_AGENTS",
    "semantic_search", "index_all", "rag_status",
    "ContextBuilder", "get_context_builder",
    # GroqBrain
    "GroqBrainBase", "get_groq_brain", "reset_groq_brain",
]
