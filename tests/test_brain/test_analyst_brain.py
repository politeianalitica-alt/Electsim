"""
Tests para agents/brain/ — AnalystBrain, ContextEngine, FeedMonitor, BrainOllamaClient.

No requieren Ollama ni conexion a internet — feeds y LLM mockeados.
"""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.brain.analyst_brain import AnalystBrain, ProactiveInsight
from agents.brain.context_engine import ContextEngine, ContextSnapshot


# ---------------------------------------------------------------------------
# ProactiveInsight
# ---------------------------------------------------------------------------

class TestProactiveInsight:
    def test_to_dict(self):
        insight = ProactiveInsight(
            actor="Pedro Sanchez",
            trigger="pico_cobertura",
            insight="El presidente anuncio medidas fiscales.",
            confidence=0.8,
            sources=["feed_monitor:pico_cobertura"],
        )
        d = insight.to_dict()
        assert d["actor"] == "Pedro Sanchez"
        assert d["trigger"] == "pico_cobertura"
        assert d["confidence"] == 0.8
        assert "generated_at" in d

    def test_is_read_default_false(self):
        insight = ProactiveInsight(
            actor="Test", trigger="test", insight="texto"
        )
        assert insight.is_read is False


# ---------------------------------------------------------------------------
# AnalystBrain
# ---------------------------------------------------------------------------

class TestAnalystBrain:
    def _make_engine(self, text_return="Insight de prueba sobre el actor politico."):
        engine = MagicMock()
        engine.generate = AsyncMock(return_value=text_return)
        return engine

    def test_get_unread_insights_empty(self):
        engine = self._make_engine()
        brain = AnalystBrain(engine, actors=["Sanchez"])
        assert brain.get_unread_insights() == []

    def test_mark_read(self):
        engine = self._make_engine()
        brain = AnalystBrain(engine, actors=["Sanchez"])
        brain._insight_queue = [
            ProactiveInsight("Sanchez", "pico_cobertura", "texto"),
            ProactiveInsight("Feijoo", "busqueda", "texto2"),
        ]
        brain.mark_read("Sanchez")
        unread = brain.get_unread_insights()
        assert len(unread) == 1
        assert unread[0].actor == "Feijoo"

    def test_clear_read(self):
        engine = self._make_engine()
        brain = AnalystBrain(engine, actors=["Sanchez"])
        brain._insight_queue = [
            ProactiveInsight("Sanchez", "pico", "texto", is_read=True),
            ProactiveInsight("Feijoo", "pico", "texto2", is_read=False),
        ]
        brain.clear_read()
        assert len(brain._insight_queue) == 1
        assert brain._insight_queue[0].actor == "Feijoo"

    @pytest.mark.asyncio
    async def test_generate_insight_empty_texts(self):
        engine = self._make_engine()
        brain = AnalystBrain(engine)
        result = await brain._generate_insight("Sanchez", [], "pico_cobertura")
        assert result is None

    @pytest.mark.asyncio
    async def test_generate_insight_returns_insight(self):
        engine = self._make_engine(
            "Sanchez enfrenta presion mediatica por reforma fiscal. Implica riesgo electoral."
        )
        brain = AnalystBrain(engine)
        result = await brain._generate_insight(
            "Sanchez",
            ["Sanchez anuncia reforma", "Criticas a Sanchez"],
            "pico_cobertura",
            n_mentions=5,
        )
        assert result is not None
        assert result.actor == "Sanchez"
        assert result.trigger == "pico_cobertura"
        assert result.confidence == 0.7

    @pytest.mark.asyncio
    async def test_generate_insight_short_response_returns_none(self):
        engine = self._make_engine("Ok")
        brain = AnalystBrain(engine)
        result = await brain._generate_insight(
            "Sanchez", ["texto"], "pico_cobertura"
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_run_cycle_no_actors(self):
        engine = self._make_engine()
        brain = AnalystBrain(engine, actors=[])
        insights = await brain.run_cycle()
        assert insights == []


# ---------------------------------------------------------------------------
# ContextSnapshot
# ---------------------------------------------------------------------------

class TestContextSnapshot:
    def test_age_minutes_fresh(self):
        snapshot = ContextSnapshot(
            category="political",
            data={"actors": {}},
            updated_at=datetime.now(tz=timezone.utc),
        )
        assert snapshot.age_minutes() < 1.0

    def test_age_minutes_old(self):
        from datetime import timedelta
        old_time = datetime.now(tz=timezone.utc) - timedelta(minutes=45)
        snapshot = ContextSnapshot(
            category="political",
            data={},
            updated_at=old_time,
        )
        assert snapshot.age_minutes() >= 44.0


# ---------------------------------------------------------------------------
# ContextEngine
# ---------------------------------------------------------------------------

class TestContextEngine:
    def _make_engine(self):
        engine = MagicMock()
        engine.generate = AsyncMock(return_value="contexto de prueba")
        return engine

    def test_get_context_missing_returns_none(self):
        engine = self._make_engine()
        ctx = ContextEngine(engine)
        assert ctx.get_context("inexistente") is None

    def test_is_fresh_no_data(self):
        engine = self._make_engine()
        ctx = ContextEngine(engine)
        assert ctx.is_fresh("political") is False

    def test_get_context_summary_empty(self):
        engine = self._make_engine()
        ctx = ContextEngine(engine)
        summary = ctx.get_context_summary()
        assert "no disponible" in summary.lower()

    def test_get_all_context_empty(self):
        engine = self._make_engine()
        ctx = ContextEngine(engine)
        all_ctx = ctx.get_all_context()
        assert all_ctx == {}

    @pytest.mark.asyncio
    async def test_refresh_legislative_sets_context(self):
        engine = self._make_engine()
        ctx = ContextEngine(engine)
        await ctx._refresh_legislative()
        snapshot = ctx.get_context("legislative")
        assert snapshot is not None
        assert snapshot.category == "legislative"

    @pytest.mark.asyncio
    async def test_start_stop(self):
        engine = self._make_engine()
        ctx = ContextEngine(engine, refresh_minutes=9999)  # No refrescar en tests

        # Mock los refreshes para no hacer llamadas reales
        ctx._refresh_all = AsyncMock()

        await ctx.start()
        assert ctx._running is True

        await ctx.stop()
        assert ctx._running is False


# ---------------------------------------------------------------------------
# BrainOllamaClient
# ---------------------------------------------------------------------------

class TestBrainOllamaClient:
    def test_system_prompt_defined(self):
        from agents.brain.ollama_client import BrainOllamaClient
        assert len(BrainOllamaClient.SYSTEM_PROMPT) > 50

    def test_inherits_from_ollama_engine(self):
        from agents.brain.ollama_client import BrainOllamaClient
        from agents.analysis.ollama_engine import OllamaEngine
        assert issubclass(BrainOllamaClient, OllamaEngine)

    @pytest.mark.asyncio
    async def test_is_available_false_without_server(self):
        from agents.brain.ollama_client import BrainOllamaClient
        async with BrainOllamaClient(base_url="http://localhost:19999") as client:
            result = await client.is_available()
        assert result is False

    @pytest.mark.asyncio
    async def test_listar_modelos_empty_without_session(self):
        from agents.brain.ollama_client import BrainOllamaClient
        client = BrainOllamaClient()
        models = await client.listar_modelos()
        assert models == []


# ---------------------------------------------------------------------------
# FeedMonitor
# ---------------------------------------------------------------------------

class TestFeedMonitorUnit:
    def test_monitoring_result_has_spike(self):
        from agents.brain.web_ingestion.feed_monitor import MonitoringResult, FeedItem
        from datetime import datetime, timezone

        items = [
            FeedItem("elpais", f"Sanchez anuncio {i}", f"http://test.com/{i}",
                     datetime.now(tz=timezone.utc))
            for i in range(5)
        ]
        result = MonitoringResult(
            items=items,
            actor_mentions={"Pedro Sanchez": items},
            trending_actors=["Pedro Sanchez"],
            new_items_count=5,
            sources_checked=3,
        )
        assert result.has_spike("Pedro Sanchez", threshold=3) is True
        assert result.has_spike("Feijoo", threshold=1) is False

    def test_feed_item_hash(self):
        from agents.brain.web_ingestion.feed_monitor import FeedItem
        from datetime import datetime, timezone
        item = FeedItem("elpais", "Titulo test", "http://test.com", datetime.now(tz=timezone.utc))
        assert len(item.content_hash) == 12

    def test_items_for_actor_missing(self):
        from agents.brain.web_ingestion.feed_monitor import MonitoringResult
        result = MonitoringResult()
        assert result.items_for_actor("actor_inexistente") == []


# ---------------------------------------------------------------------------
# URLExtractor unit tests
# ---------------------------------------------------------------------------

class TestURLExtractorUnit:
    def test_get_domain(self):
        from agents.brain.web_ingestion.url_extractor import URLExtractor
        assert URLExtractor._get_domain("https://www.elpais.com/articulo/123") == "elpais.com"
        assert URLExtractor._get_domain("https://elmundo.es/") == "elmundo.es"

    def test_clean_text(self):
        from agents.brain.web_ingestion.url_extractor import URLExtractor
        text = "  texto   con   espacios  \n\n\n  multiples  "
        cleaned = URLExtractor._clean_text(text)
        assert "   " not in cleaned
        assert "\n\n\n" not in cleaned

    def test_web_page_is_useful(self):
        from agents.brain.web_ingestion.url_extractor import WebPage
        page = WebPage(url="http://test.com", text="x " * 150, word_count=150)
        assert page.is_useful is True

    def test_web_page_not_useful_with_error(self):
        from agents.brain.web_ingestion.url_extractor import WebPage
        page = WebPage(url="http://test.com", word_count=500, error="timeout")
        assert page.is_useful is False

    def test_web_page_content_hash(self):
        from agents.brain.web_ingestion.url_extractor import WebPage
        page = WebPage(url="http://test.com", text="texto de prueba " * 20)
        h = page.content_hash()
        assert len(h) == 12


# ---------------------------------------------------------------------------
# SearchAgent unit tests
# ---------------------------------------------------------------------------

class TestSearchAgentUnit:
    @pytest.mark.asyncio
    async def test_search_fallback_without_ddg(self):
        from agents.brain.web_ingestion.search_agent import SearchAgent
        agent = SearchAgent()
        # Sin duckduckgo_search instalado, retorna resultados de fallback
        session = await agent.search("Pedro Sanchez economia")
        assert session.query == "Pedro Sanchez economia"
        # Los resultados pueden ser de fallback o reales
        assert isinstance(session.results, list)
