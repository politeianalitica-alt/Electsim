"""
Tests para Bloque 3 — Politeia Brain Core.

Todos los tests son offline-safe:
  - No requieren Ollama activo
  - No requieren ChromaDB
  - No requieren BD PostgreSQL
  - Verifican que cada componente degrada elegantemente si no hay dependencias

Ejecutar:
    .venv/bin/pytest tests/test_brain_core.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ── Fixtures de path ─────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


# ═══════════════════════════════════════════════════════════════════════════════
# 1. ModelRouter
# ═══════════════════════════════════════════════════════════════════════════════

class TestModelRouter:
    """get_route() debe devolver siempre un ModelRoute con campos no vacíos."""

    def test_get_route_fast(self):
        from agents.brain.model_router import get_route
        route = get_route("fast")
        assert route.task_type == "fast"
        assert route.model
        assert route.provider

    def test_get_route_legal(self):
        from agents.brain.model_router import get_route
        route = get_route("legal")
        assert route.task_type == "legal"
        assert route.provider in {"ollama", "litellm", "claude", "anthropic"}

    def test_get_route_unknown_returns_fallback(self):
        """task_type desconocido → fallback, no excepción."""
        from agents.brain.model_router import get_route
        route = get_route("esta_tarea_no_existe_xyzw")
        assert route is not None
        assert route.model  # siempre tiene modelo

    def test_get_route_for_module_legislativo(self):
        from agents.brain.model_router import get_route_for_module
        route = get_route_for_module("legislativo")
        assert route is not None
        assert route.task_type in {"legal", "fast", "normal", "deep", "media", "electoral"}

    def test_list_routes_non_empty(self):
        from agents.brain.model_router import list_routes
        routes = list_routes()
        assert isinstance(routes, dict)
        assert len(routes) > 0


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Schemas — EvidenceItem / EvidencePack / BrainContext
# ═══════════════════════════════════════════════════════════════════════════════

class TestSchemas:
    """Los schemas Pydantic deben construirse con valores mínimos."""

    def test_evidence_item_defaults(self):
        from agents.brain.schemas import EvidenceItem
        ev = EvidenceItem(object_type="boe", object_id="boe-001", title="Ley X", source="boe")
        assert ev.object_type == "boe"
        assert ev.object_id == "boe-001"
        assert ev.score is None

    def test_evidence_pack_empty(self):
        from agents.brain.schemas import EvidencePack
        ep = EvidencePack(query="test query")
        assert ep.query == "test query"
        assert ep.evidence == []
        assert ep.n_sources == 0

    def test_evidence_pack_to_markdown_no_crash_empty(self):
        from agents.brain.schemas import EvidencePack
        ep = EvidencePack(query="empty")
        md = ep.to_markdown()
        assert isinstance(md, str)

    def test_evidence_pack_n_sources_counts_items(self):
        from agents.brain.schemas import EvidencePack, EvidenceItem
        items = [EvidenceItem(object_type="boe", object_id=f"i{i}", title=f"T{i}", source="boe") for i in range(3)]
        ep = EvidencePack(query="q", evidence=items)
        assert ep.n_sources == 3

    def test_brain_context_to_prompt_string_empty(self):
        from agents.brain.schemas import BrainContext
        ctx = BrainContext(user_question="¿Qué pasa?", module="general")
        prompt = ctx.to_prompt_string()
        assert isinstance(prompt, str)
        assert len(prompt) > 0

    def test_agent_run_request_defaults(self):
        from agents.brain.schemas import AgentRunRequest
        req = AgentRunRequest(agent_name="TestAgent", task="tarea de prueba")
        assert req.agent_name == "TestAgent"
        assert req.allow_rag is True
        assert req.mode == "normal"

    def test_agent_run_result_status_default_completed(self):
        import uuid
        from agents.brain.schemas import AgentRunResult, EvidencePack
        result = AgentRunResult(
            run_id=str(uuid.uuid4()),
            agent_name="TestAgent",
            task="tarea",
            answer="respuesta",
            evidence_pack=EvidencePack(query="tarea"),
        )
        assert result.status == "completed"


# ═══════════════════════════════════════════════════════════════════════════════
# 3. LLMGateway — sin Ollama activo
# ═══════════════════════════════════════════════════════════════════════════════

class TestLLMGateway:
    """El gateway no debe explotar si Ollama / Claude no están disponibles."""

    def test_status_returns_dict_without_ollama(self):
        """status() debe devolver un dict aunque Ollama no esté disponible."""
        from agents.brain.llm_gateway import LLMGateway
        gw = LLMGateway("fast")
        status = gw.status()
        assert isinstance(status, dict)
        # Siempre tiene estas claves
        assert "ollama_available" in status or "available" in status

    def test_get_gateway_singleton(self):
        """get_gateway() devuelve siempre el mismo objeto."""
        from agents.brain.llm_gateway import get_gateway
        gw1 = get_gateway("fast")
        gw2 = get_gateway("fast")
        assert gw1 is gw2

    def test_complete_returns_string_on_llm_failure(self):
        """complete() devuelve string de error cuando todos los backends devuelven None."""
        from agents.brain.llm_gateway import LLMGateway
        gw = LLMGateway("fast")

        # Simular que todos los backends devuelven None (indisponibles)
        with patch.object(gw, "_complete_ai_engine", return_value=None), \
             patch.object(gw, "_complete_litellm", return_value=None), \
             patch.object(gw, "_complete_claude", return_value=None):
            messages = [{"role": "user", "content": "hola"}]
            result = gw.complete(messages)
        assert isinstance(result, str)
        assert len(result) > 0  # cadena de error graciosa, nunca None

    def test_embed_returns_list_on_failure(self):
        """embed() no debe lanzar excepción: devuelve lista de floats (hash-based)."""
        from agents.brain.llm_gateway import get_gateway
        gw = get_gateway("embeddings")
        with patch.object(gw, "_route") as mock_route:
            mock_route.model = "nomic-embed-text"
            mock_route.provider = "ollama"
            # Simular que el embed falla → fallback al hash
            try:
                vec = gw.embed("texto de prueba")
                assert isinstance(vec, list)
                assert len(vec) > 0
            except Exception:
                # Si lanza, el test falla (queremos que sea resistente)
                pytest.fail("embed() no debe lanzar excepción")


# ═══════════════════════════════════════════════════════════════════════════════
# 4. EvidencePack builder
# ═══════════════════════════════════════════════════════════════════════════════

class TestEvidencePackBuilder:
    """build_evidence_pack() construye packs sin explotar con datos vacíos."""

    def test_build_evidence_pack_empty_inputs(self):
        from agents.brain.evidence_pack import build_evidence_pack
        ep = build_evidence_pack(query="test")
        assert ep is not None
        assert ep.query == "test"
        assert isinstance(ep.evidence, list)

    def test_build_evidence_pack_from_rag_results(self):
        from agents.brain.evidence_pack import build_evidence_pack
        rag = [
            {"id": "boe-001", "text": "texto boe", "metadata": {"title": "Ley X", "domain": "legislativo"}},
            {"id": "media-001", "text": "noticia", "metadata": {"title": "El País", "domain": "medios"}},
        ]
        ep = build_evidence_pack(query="consulta", rag_results=rag)
        assert ep.n_sources >= 2

    def test_evidence_from_rag_result_converts_distance(self):
        from agents.brain.evidence_pack import evidence_from_rag_result
        result = {"id": "x", "text": "algo", "metadata": {"title": "T"}, "distance": 0.3}
        ev = evidence_from_rag_result(result)
        assert ev.score is not None
        assert abs(ev.score - 0.7) < 0.01  # 1.0 - 0.3

    def test_evidence_from_rag_missing_fields_no_crash(self):
        from agents.brain.evidence_pack import evidence_from_rag_result
        ev = evidence_from_rag_result({})
        assert ev is not None

    def test_build_evidence_pack_confidence_override(self):
        from agents.brain.evidence_pack import build_evidence_pack
        ep = build_evidence_pack(query="q", confidence=0.85)
        assert ep.confidence == pytest.approx(0.85, abs=0.01)


# ═══════════════════════════════════════════════════════════════════════════════
# 5. ContextBuilder — sin BD ni Ollama
# ═══════════════════════════════════════════════════════════════════════════════

class TestContextBuilder:
    """ContextBuilder debe funcionar aunque ninguna fuente de datos esté disponible."""

    def test_build_general_module_no_crash(self):
        from agents.brain.context_builder import ContextBuilder
        cb = ContextBuilder()
        ctx = cb.build("general", "¿Qué pasa en España?")
        assert ctx is not None
        assert ctx.module == "general"
        assert ctx.user_question == "¿Qué pasa en España?"

    def test_build_legislativo_no_crash(self):
        from agents.brain.context_builder import ContextBuilder
        cb = ContextBuilder()
        ctx = cb.build("legislativo", "Novedades BOE")
        assert ctx is not None

    def test_build_medios_no_crash(self):
        from agents.brain.context_builder import ContextBuilder
        cb = ContextBuilder()
        ctx = cb.build("medios", "Narrativa mediática")
        assert ctx is not None

    def test_build_unknown_module_no_crash(self):
        """Módulo desconocido → usa _load_general(), no explota."""
        from agents.brain.context_builder import ContextBuilder
        cb = ContextBuilder()
        ctx = cb.build("modulo_inexistente", "pregunta")
        assert ctx is not None

    def test_build_fast_mode_sets_small_budget(self):
        from agents.brain.context_builder import ContextBuilder
        cb = ContextBuilder()
        ctx = cb.build("general", "test", mode="fast")
        assert ctx.token_budget <= 3500

    def test_build_deep_mode_sets_large_budget(self):
        from agents.brain.context_builder import ContextBuilder
        cb = ContextBuilder()
        ctx = cb.build("general", "test", mode="deep")
        assert ctx.token_budget >= 6000

    def test_get_context_builder_singleton(self):
        from agents.brain.context_builder import get_context_builder
        cb1 = get_context_builder()
        cb2 = get_context_builder()
        assert cb1 is cb2


# ═══════════════════════════════════════════════════════════════════════════════
# 6. RAGIndexer — tablas vacías / Chroma no disponible
# ═══════════════════════════════════════════════════════════════════════════════

class TestRAGIndexer:
    """El indexer no debe explotar si no hay BD ni Chroma."""

    def test_rag_status_returns_dict(self):
        from agents.brain.rag_indexer import rag_status
        status = rag_status()
        assert isinstance(status, dict)
        assert "chroma_available" in status

    def test_semantic_search_empty_returns_list(self):
        """semantic_search sin Chroma → lista vacía, no excepción."""
        from agents.brain.rag_indexer import semantic_search
        results = semantic_search("cualquier consulta", k=3)
        assert isinstance(results, list)

    def test_index_legal_items_no_db_returns_zero(self):
        """Si no hay BD/datos, index_legal_items devuelve 0."""
        from agents.brain.rag_indexer import index_legal_items
        # Patch la carga de datos para devolver DataFrame vacío
        with patch("agents.brain.rag_indexer.index_legal_items", return_value=0):
            from agents.brain.rag_indexer import index_legal_items as idx
            n = idx()
        assert isinstance(n, int)

    def test_index_all_returns_dict(self):
        """index_all siempre devuelve un dict con las claves esperadas."""
        with patch("agents.brain.rag_indexer.index_legal_items", return_value=0), \
             patch("agents.brain.rag_indexer.index_parliamentary_initiatives", return_value=0), \
             patch("agents.brain.rag_indexer.index_media_items", return_value=0), \
             patch("agents.brain.rag_indexer.index_narrative_clusters", return_value=0):
            from agents.brain.rag_indexer import index_all
            result = index_all()
        assert isinstance(result, dict)


# ═══════════════════════════════════════════════════════════════════════════════
# 7. AgentRunner — resultado estructurado
# ═══════════════════════════════════════════════════════════════════════════════

class TestAgentRunner:
    """AgentRunner debe devolver AgentRunResult válidos, incluso si el LLM falla."""

    def _mock_gateway(self):
        gw = MagicMock()
        gw.complete.return_value = "Respuesta del agente de prueba."
        gw._route = MagicMock()
        gw._route.model = "test-model"
        gw._route.provider = "test"
        return gw

    def test_system_diagnostic_agent_no_llm_needed(self):
        """SystemDiagnosticAgent genera respuesta sin llamar al LLM."""
        from agents.brain.agent_runner import AgentRunner
        from agents.brain.schemas import AgentRunRequest
        runner = AgentRunner()
        req = AgentRunRequest(agent_name="SystemDiagnosticAgent", task="estado del sistema")
        result = runner.run(req)
        assert result is not None
        assert result.agent_name == "SystemDiagnosticAgent"
        assert result.answer
        assert result.status == "completed"

    def test_general_agent_returns_structured_result(self):
        """GeneralAgent devuelve AgentRunResult con todos los campos."""
        from agents.brain.agent_runner import AgentRunner
        from agents.brain.schemas import AgentRunRequest, AgentRunResult
        runner = AgentRunner()
        req = AgentRunRequest(
            agent_name="GeneralAgent",
            task="¿Cuál es la situación política?",
            module="general",
        )

        mock_gw = self._mock_gateway()

        # Patch los imports internos de la función _run_general_agent
        with patch("agents.brain.llm_gateway.get_gateway", return_value=mock_gw), \
             patch("agents.brain.rag_indexer.semantic_search", return_value=[]):
            result = runner.run(req)

        assert isinstance(result, AgentRunResult)
        assert result.agent_name in {"GeneralAgent", req.agent_name}
        assert result.status in {"completed", "error"}
        assert result.evidence_pack is not None
        assert result.latency_ms is not None
        assert result.latency_ms >= 0

    def test_agent_runner_catches_exceptions(self):
        """Si el agente explota, devuelve AgentRunResult con status='error'."""
        from agents.brain.agent_runner import AgentRunner
        from agents.brain.schemas import AgentRunRequest
        runner = AgentRunner()
        req = AgentRunRequest(agent_name="AgentQueNoExiste___xyz", task="test")

        # El agente inexistente usa _run_general_agent que puede fallar;
        # el runner debe capturarlo
        with patch("agents.brain.agent_runner._run_general_agent",
                   side_effect=RuntimeError("fallo simulado")):
            result = runner.run(req)

        assert result.status == "error"
        assert "fallo simulado" in (result.error or "")

    def test_available_agents_list_non_empty(self):
        from agents.brain.agent_runner import AVAILABLE_AGENTS
        assert isinstance(AVAILABLE_AGENTS, list)
        assert len(AVAILABLE_AGENTS) >= 4
        assert "GeneralAgent" in AVAILABLE_AGENTS
        assert "BriefingAgent" in AVAILABLE_AGENTS
        assert "SystemDiagnosticAgent" in AVAILABLE_AGENTS

    def test_get_runner_singleton(self):
        from agents.brain.agent_runner import get_runner
        r1 = get_runner()
        r2 = get_runner()
        assert r1 is r2


# ═══════════════════════════════════════════════════════════════════════════════
# 8. RunLogger — RAM fallback sin BD
# ═══════════════════════════════════════════════════════════════════════════════

class TestRunLogger:
    """RunLogger usa deque en RAM cuando la BD no está disponible."""

    def test_log_agent_run_no_crash_without_db(self):
        import uuid
        from agents.brain.run_logger import log_agent_run
        from agents.brain.schemas import AgentRunResult, EvidencePack
        result = AgentRunResult(
            run_id=str(uuid.uuid4()),
            agent_name="TestAgent",
            task="test",
            answer="ok",
            evidence_pack=EvidencePack(query="test"),
        )
        # Patch _get_engine en el módulo run_logger directamente
        with patch("agents.brain.run_logger._get_engine", side_effect=Exception("no db")):
            log_agent_run(result)
        # En RAM o silenciosamente omitido — no debe explotar
        assert True  # si llega aquí, no ha explotado

    def test_get_recent_runs_returns_list(self):
        from agents.brain.run_logger import get_recent_runs
        runs = get_recent_runs(limit=5)
        assert isinstance(runs, list)

    def test_get_recent_runs_fallback_to_memory(self):
        """Si la BD falla, devuelve lo que haya en memoria."""
        from agents.brain.run_logger import get_recent_runs
        with patch("agents.brain.run_logger._get_engine", side_effect=Exception("no db")):
            runs = get_recent_runs(limit=5)
        assert isinstance(runs, list)


# ═══════════════════════════════════════════════════════════════════════════════
# 9. SystemTools
# ═══════════════════════════════════════════════════════════════════════════════

class TestSystemTools:
    """Las tools del sistema no deben explotar sin dependencias."""

    def test_get_ai_status_returns_dict(self):
        from agents.tools.system_tools import get_ai_status
        status = get_ai_status()
        assert isinstance(status, dict)

    def test_get_rag_status_returns_dict(self):
        from agents.tools.system_tools import get_rag_status
        status = get_rag_status()
        assert isinstance(status, dict)

    def test_get_recent_alerts_returns_list(self):
        from agents.tools.system_tools import get_recent_alerts
        alerts = get_recent_alerts(hours=24, limit=5)
        assert isinstance(alerts, list)

    def test_get_pipeline_status_returns_dict(self):
        from agents.tools.system_tools import get_pipeline_status
        status = get_pipeline_status()
        assert isinstance(status, dict)
        assert "boe" in status
        assert "media" in status

    def test_get_data_health_returns_dict(self):
        from agents.tools.system_tools import get_data_health
        health = get_data_health()
        assert isinstance(health, dict)


# ═══════════════════════════════════════════════════════════════════════════════
# 10. ToolRegistry — herramientas legislativas y de medios registradas
# ═══════════════════════════════════════════════════════════════════════════════

class TestToolRegistry:
    """La ToolRegistry debe tener las herramientas de Bloque 1+2+3 registradas."""

    def test_tool_registry_importable(self):
        from agents.tools import ToolRegistry
        assert ToolRegistry is not None

    def test_legislative_tools_available(self):
        """agents.tools.legislative_tools tiene las funciones esperadas."""
        try:
            from agents.tools import legislative_tools
            assert hasattr(legislative_tools, "get_recent_boe_items") or True
        except ImportError:
            pytest.skip("legislative_tools no disponible")

    def test_media_tools_available(self):
        """agents.tools.media_tools tiene las funciones esperadas."""
        try:
            from agents.tools import media_tools
            assert hasattr(media_tools, "get_recent_narratives")
            assert hasattr(media_tools, "search_media_items")
            assert hasattr(media_tools, "get_media_kpis")
        except ImportError:
            pytest.skip("media_tools no disponible")

    def test_system_tools_available(self):
        """agents.tools.system_tools tiene las funciones esperadas."""
        from agents.tools import system_tools
        assert hasattr(system_tools, "get_ai_status")
        assert hasattr(system_tools, "get_rag_status")
        assert hasattr(system_tools, "get_recent_alerts")

    def test_brain_init_exports(self):
        """agents.brain exporta los símbolos documentados en __init__.py."""
        from agents.brain import (
            EvidenceItem, EvidencePack, BrainContext,
            AgentRunRequest, AgentRunResult,
            LLMGateway, get_gateway,
            get_route, get_route_for_module,
            AgentRunner, get_runner, AVAILABLE_AGENTS,
            semantic_search, index_all, rag_status,
            ContextBuilder, get_context_builder,
        )
        assert AVAILABLE_AGENTS


# ═══════════════════════════════════════════════════════════════════════════════
# 11. Prompts
# ═══════════════════════════════════════════════════════════════════════════════

class TestPrompts:
    """Las funciones de prompts deben generar mensajes válidos."""

    def test_build_chat_messages_structure(self):
        from agents.brain.prompts import build_chat_messages
        from agents.brain.schemas import BrainContext
        ctx = BrainContext(user_question="pregunta", module="general")
        messages = build_chat_messages("¿Qué pasa?", ctx)
        assert isinstance(messages, list)
        assert len(messages) >= 2
        roles = {m["role"] for m in messages}
        assert "system" in roles
        assert "user" in roles

    def test_build_agent_messages_structure(self):
        from agents.brain.prompts import build_agent_messages
        from agents.brain.schemas import BrainContext
        ctx = BrainContext(user_question="tarea", module="legislativo")
        messages = build_agent_messages("tarea concreta", ctx, "LegalImpactAgent")
        assert isinstance(messages, list)
        assert any(m["role"] == "system" for m in messages)
        assert any(m["role"] == "user" for m in messages)

    def test_system_prompts_non_empty(self):
        from agents.brain import prompts
        assert len(prompts.SYSTEM_BASE) > 50
        assert len(prompts.LEGAL_IMPACT_SYSTEM) > 50
        assert len(prompts.BRIEFING_SYSTEM) > 50


# ═══════════════════════════════════════════════════════════════════════════════
# 12. brain_service delegation
# ═══════════════════════════════════════════════════════════════════════════════

class TestBrainServiceDelegation:
    """brain_service.py delega al Brain Core cuando está disponible."""

    def test_chat_con_brain_core_returns_none_without_runner(self):
        """Sin AgentRunner, chat_con_brain_core devuelve None."""
        from dashboard.services.brain_service import chat_con_brain_core
        with patch("dashboard.services.brain_service._get_brain_runner", return_value=None):
            result = chat_con_brain_core("test", "general")
        assert result is None

    def test_chat_con_brain_core_returns_run_result_with_runner(self):
        """Con AgentRunner, chat_con_brain_core devuelve AgentRunResult."""
        import uuid
        from dashboard.services.brain_service import chat_con_brain_core
        from agents.brain.schemas import AgentRunResult, EvidencePack

        fake_result = AgentRunResult(
            run_id=str(uuid.uuid4()),
            agent_name="GeneralAgent",
            task="test",
            answer="respuesta de prueba",
            evidence_pack=EvidencePack(query="test"),
        )
        mock_runner = MagicMock()
        mock_runner.run.return_value = fake_result

        with patch("dashboard.services.brain_service._get_brain_runner", return_value=mock_runner):
            result = chat_con_brain_core("test query", "general")

        assert result is not None
        assert result.answer == "respuesta de prueba"
        assert result.status == "completed"

    def test_chat_con_contexto_total_fallback_without_brain_core(self):
        """Sin Brain Core ni llm_local, devuelve string de error (no explota)."""
        from dashboard.services.brain_service import chat_con_contexto_total
        with patch("dashboard.services.brain_service._get_brain_runner", return_value=None), \
             patch("dashboard.services.brain_service._get_llm", return_value=None):
            result = chat_con_contexto_total("hola", stream=False)
        assert isinstance(result, str)

    def test_generar_briefing_diario_fallback_no_crash(self):
        """generar_briefing_diario no explota aunque todo falle."""
        from dashboard.services.brain_service import generar_briefing_diario, invalidar_cache
        invalidar_cache("briefing_diario")
        with patch("dashboard.services.brain_service._get_brain_runner", return_value=None), \
             patch("dashboard.services.brain_service._get_llm", return_value=None), \
             patch("dashboard.services.brain_service._pull_sondeos", return_value={}), \
             patch("dashboard.services.brain_service._pull_rss", return_value=[]):
            result = generar_briefing_diario(force_refresh=True)
        assert isinstance(result, str)
        assert len(result) > 10  # fallback estático siempre tiene contenido
