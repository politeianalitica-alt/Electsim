"""
Agent Runner — ejecuta agentes tipados del Politeia Brain.

Agentes disponibles:
  LegalImpactAgent      — análisis de impacto de normas BOE/Congreso
  MediaNarrativeAgent   — análisis de narrativas mediáticas
  BriefingAgent         — genera briefing ejecutivo diario
  ActorProfileAgent     — perfil mediático y legislativo de un actor
  ElectoralScenarioAgent — proyección de escaños y coaliciones
  SystemDiagnosticAgent — estado del sistema Brain

El runner NO usa CrewAI/AutoGen/LangChain.
Es un orquestador simple y trazable: Context → Prompt → LLM → EvidencePack → Log.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

from .schemas import AgentRunRequest, AgentRunResult, EvidencePack, ToolCallRecord

logger = logging.getLogger(__name__)


class AgentRunner:
    """
    Ejecuta AgentRunRequests y devuelve AgentRunResults trazables.

    Uso::

        runner = AgentRunner()
        result = runner.run(AgentRunRequest(
            agent_name="LegalImpactAgent",
            task="¿Qué normas críticas han salido esta semana?",
            module="legislativo",
        ))
    """

    def run(self, request: AgentRunRequest) -> AgentRunResult:
        """Ejecuta un agente y devuelve resultado completo."""
        t0 = time.monotonic()
        logger.info("AgentRunner.run: %s / %s", request.agent_name, request.task[:60])

        agent_fn = _AGENT_REGISTRY.get(request.agent_name, _run_general_agent)

        try:
            result = agent_fn(request)
        except Exception as exc:
            logger.error("AgentRunner error en %s: %s", request.agent_name, exc)
            result = AgentRunResult(
                run_id=request.run_id,
                agent_name=request.agent_name,
                task=request.task,
                module=request.module,
                answer=f"_Error ejecutando el agente: {exc}_",
                evidence_pack=EvidencePack(query=request.task),
                status="error",
                error=str(exc),
            )

        result.latency_ms = int((time.monotonic() - t0) * 1000)

        # Log
        try:
            from .run_logger import log_agent_run
            log_agent_run(result)
        except Exception as exc:
            logger.debug("log_agent_run: %s", exc)

        return result

    def run_many(
        self, requests: list[AgentRunRequest]
    ) -> list[AgentRunResult]:
        """Ejecuta múltiples agentes secuencialmente."""
        return [self.run(req) for req in requests]


# ── Agentes ────────────────────────────────────────────────────────────────────

def _run_legal_impact_agent(request: AgentRunRequest) -> AgentRunResult:
    """LegalImpactAgent: análisis de normas BOE e iniciativas."""
    from .context_builder import ContextBuilder
    from .llm_gateway import get_gateway
    from .evidence_pack import build_evidence_pack
    from .prompts import build_agent_messages
    from .rag_indexer import semantic_search

    module = request.module or "legislativo"
    ctx = ContextBuilder().build(module, request.task, mode=request.mode)

    # RAG
    rag_evidence = []
    if request.allow_rag:
        rag_evidence = semantic_search(request.task, domains=["legislativo"], k=6)
        ctx.retrieved_evidence = rag_evidence

    # Tools
    tools_used: list[str] = []
    legal_items: list[dict] = []
    if request.allow_tools:
        try:
            from agents.tools.legislative_tools import get_recent_boe_items
            legal_items = get_recent_boe_items(days=7, limit=8)
            tools_used.append("get_recent_boe_items")
        except Exception:
            pass

    messages = build_agent_messages(request.task, ctx, "LegalImpactAgent")
    gw = get_gateway("legal")
    answer = gw.complete(messages, task_type="legal")

    ep = build_evidence_pack(
        query=request.task,
        rag_results=[{"id": e.id, "text": e.snippet, "metadata": e.metadata} for e in rag_evidence],
        legal_items=legal_items[:5],
        tools_used=tools_used,
        model_used=gw._route.model,
        provider=gw._route.provider,
        confidence=0.75 if rag_evidence or legal_items else 0.4,
    )

    return AgentRunResult(
        run_id=request.run_id,
        agent_name="LegalImpactAgent",
        task=request.task,
        module=module,
        answer=answer,
        evidence_pack=ep,
        tools_used=tools_used,
        model_used=gw._route.model,
        provider=gw._route.provider,
        confidence=ep.confidence,
    )


def _run_media_narrative_agent(request: AgentRunRequest) -> AgentRunResult:
    """MediaNarrativeAgent: análisis de narrativas mediáticas."""
    from .context_builder import ContextBuilder
    from .llm_gateway import get_gateway
    from .evidence_pack import build_evidence_pack
    from .prompts import build_agent_messages
    from .rag_indexer import semantic_search

    ctx = ContextBuilder().build("medios", request.task, mode=request.mode)
    rag_evidence = []
    if request.allow_rag:
        rag_evidence = semantic_search(request.task, domains=["medios"], k=6)
        ctx.retrieved_evidence = rag_evidence

    tools_used: list[str] = []
    media_items: list[dict] = []
    narratives: list[dict] = []
    if request.allow_tools:
        try:
            from agents.tools.media_tools import get_recent_narratives, fetch_rss_now
            narratives = get_recent_narratives(hours=24, limit=8)
            tools_used.append("get_recent_narratives")
        except Exception:
            pass

    messages = build_agent_messages(request.task, ctx, "MediaNarrativeAgent")
    gw = get_gateway("media")
    answer = gw.complete(messages, task_type="media")

    ep = build_evidence_pack(
        query=request.task,
        rag_results=[{"id": e.id, "text": e.snippet, "metadata": e.metadata} for e in rag_evidence],
        narrative_clusters=narratives[:5],
        tools_used=tools_used,
        model_used=gw._route.model,
        provider=gw._route.provider,
        confidence=0.7 if rag_evidence or narratives else 0.35,
    )

    return AgentRunResult(
        run_id=request.run_id,
        agent_name="MediaNarrativeAgent",
        task=request.task,
        module="medios",
        answer=answer,
        evidence_pack=ep,
        tools_used=tools_used,
        model_used=gw._route.model,
        provider=gw._route.provider,
        confidence=ep.confidence,
    )


def _run_briefing_agent(request: AgentRunRequest) -> AgentRunResult:
    """BriefingAgent: genera briefing ejecutivo diario."""
    from .context_builder import ContextBuilder
    from .llm_gateway import get_gateway
    from .evidence_pack import build_evidence_pack
    from .prompts import build_agent_messages

    ctx = ContextBuilder().build("general", request.task, mode="deep")

    tools_used: list[str] = []
    legal_items: list[dict] = []
    narratives: list[dict] = []

    try:
        from agents.tools.legislative_tools import get_recent_boe_items
        legal_items = get_recent_boe_items(days=1, impact_filter=["CRÍTICO", "ALTO"])
        tools_used.append("get_recent_boe_items")
    except Exception:
        pass

    try:
        from agents.tools.media_tools import get_recent_narratives
        narratives = get_recent_narratives(hours=24, limit=8)
        tools_used.append("get_recent_narratives")
    except Exception:
        pass

    messages = build_agent_messages(request.task or "Genera el briefing ejecutivo del día.", ctx, "BriefingAgent")
    gw = get_gateway("deep")
    answer = gw.complete(messages, task_type="deep")

    ep = build_evidence_pack(
        query=request.task,
        legal_items=legal_items[:5],
        narrative_clusters=narratives[:5],
        tools_used=tools_used,
        model_used=gw._route.model,
        provider=gw._route.provider,
        confidence=0.8 if legal_items or narratives else 0.4,
    )

    return AgentRunResult(
        run_id=request.run_id,
        agent_name="BriefingAgent",
        task=request.task,
        module="general",
        answer=answer,
        evidence_pack=ep,
        tools_used=tools_used,
        model_used=gw._route.model,
        provider=gw._route.provider,
        confidence=ep.confidence,
    )


def _run_system_diagnostic_agent(request: AgentRunRequest) -> AgentRunResult:
    """SystemDiagnosticAgent: estado del sistema."""
    from .llm_gateway import get_gateway
    from .rag_indexer import rag_status
    from .evidence_pack import EvidencePack
    from .prompts import SYSTEM_DIAGNOSTIC_SYSTEM

    gw = get_gateway("system")
    gw_status = gw.status()
    rag_st = rag_status()

    report_lines = [
        f"## Estado del sistema Politeia Brain\n",
        f"**Ollama**: {'✅ activo' if gw_status.get('ollama_available') else '❌ inactivo'}",
        f"**Modelo activo**: {gw_status.get('ollama_model', '—')}",
        f"**Embeddings**: {gw_status.get('embedding_model', '—')}",
        f"**Chroma**: {'✅ disponible' if rag_st.get('chroma_available') else '❌ no disponible'}",
        f"**Documentos indexados**: {rag_st.get('chroma_count', 0):,}",
        f"**LiteLLM**: {'habilitado' if gw_status.get('litellm_enabled') else 'deshabilitado'}",
        f"**Claude fallback**: {'disponible' if gw_status.get('claude_available') else 'no configurado'}",
    ]

    answer = "\n".join(report_lines)

    return AgentRunResult(
        run_id=request.run_id,
        agent_name="SystemDiagnosticAgent",
        task=request.task,
        module="sistema",
        answer=answer,
        evidence_pack=EvidencePack(query=request.task, model_used="system", confidence=1.0),
        model_used="system",
        confidence=1.0,
    )


def _run_general_agent(request: AgentRunRequest) -> AgentRunResult:
    """Agente general: responde con contexto del módulo correspondiente."""
    from .context_builder import ContextBuilder
    from .llm_gateway import get_gateway
    from .evidence_pack import build_evidence_pack
    from .prompts import build_chat_messages
    from .rag_indexer import semantic_search
    from .model_router import get_route_for_module

    module = request.module or "general"
    ctx = ContextBuilder().build(module, request.task, mode=request.mode)

    rag_evidence = []
    if request.allow_rag and request.task:
        rag_evidence = semantic_search(request.task, k=5)
        ctx.retrieved_evidence = rag_evidence

    route = get_route_for_module(module)
    messages = build_chat_messages(request.task, ctx)
    gw = get_gateway(route.task_type)
    answer = gw.complete(messages, task_type=route.task_type)

    ep = build_evidence_pack(
        query=request.task,
        rag_results=[{"id": e.id, "text": e.snippet, "metadata": e.metadata} for e in rag_evidence],
        model_used=gw._route.model,
        provider=gw._route.provider,
        confidence=0.6 if rag_evidence else 0.3,
    )

    return AgentRunResult(
        run_id=request.run_id,
        agent_name=request.agent_name or "GeneralAgent",
        task=request.task,
        module=module,
        answer=answer,
        evidence_pack=ep,
        model_used=gw._route.model,
        provider=gw._route.provider,
        confidence=ep.confidence,
    )


# ── Registro de agentes ───────────────────────────────────────────────────────

_AGENT_REGISTRY = {
    "LegalImpactAgent":       _run_legal_impact_agent,
    "MediaNarrativeAgent":    _run_media_narrative_agent,
    "BriefingAgent":          _run_briefing_agent,
    "SystemDiagnosticAgent":  _run_system_diagnostic_agent,
    "GeneralAgent":           _run_general_agent,
}

AVAILABLE_AGENTS = list(_AGENT_REGISTRY.keys())


# ── Singleton ─────────────────────────────────────────────────────────────────

_runner_instance: AgentRunner | None = None


def get_runner() -> AgentRunner:
    global _runner_instance
    if _runner_instance is None:
        _runner_instance = AgentRunner()
    return _runner_instance
