"""
Tests del BriefingEngine.
Todos mock-based, sin BD ni LLM real.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.intelligence.models import BriefingSection, MorningBriefing


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_engine(llm=None, repo=None, session=None):
    from services.intelligence.briefing_engine import BriefingEngine
    if llm is None:
        llm = MagicMock()
    return BriefingEngine(llm=llm, ontology_repo=repo, db_session=session)


def _make_mock_briefing(client_id: str = "c-001", date: str = "2026-04-30") -> MorningBriefing:
    return MorningBriefing(
        client_id=client_id,
        date=date,
        key_changes=["Cambio 1", "Cambio 2"],
        sections=[
            BriefingSection(title="Politica Interior", body_markdown="Situacion estable."),
            BriefingSection(title="Riesgos", body_markdown="Tension moderada."),
        ],
        executive_summary="Dia tranquilo en politica espanola.",
        risk_delta=-2.5,
    )


# ---------------------------------------------------------------------------
# Tests de build_briefing_prompt
# ---------------------------------------------------------------------------

class TestBuildBriefingPrompt:
    def test_includes_client_id_in_prompt(self):
        engine = _make_engine()

        async def _run():
            return await engine.build_briefing_prompt(
                client_id="cliente-test",
                market_code="spain",
                since=datetime(2026, 4, 29, tzinfo=timezone.utc),
                until=datetime(2026, 4, 30, tzinfo=timezone.utc),
            )

        prompt = asyncio.run(_run())
        assert "cliente-test" in prompt

    def test_includes_market_code(self):
        engine = _make_engine()

        async def _run():
            return await engine.build_briefing_prompt(
                client_id="c-001",
                market_code="spain",
                since=datetime(2026, 4, 29, tzinfo=timezone.utc),
                until=datetime(2026, 4, 30, tzinfo=timezone.utc),
            )

        prompt = asyncio.run(_run())
        assert "spain" in prompt

    def test_includes_client_profile_when_provided(self):
        engine = _make_engine()
        profile = {"sector": "energia", "intereses": ["regulacion", "impuestos"]}

        async def _run():
            return await engine.build_briefing_prompt(
                client_id="c-002",
                market_code="spain",
                since=datetime(2026, 4, 29, tzinfo=timezone.utc),
                until=datetime(2026, 4, 30, tzinfo=timezone.utc),
                client_profile=profile,
            )

        prompt = asyncio.run(_run())
        assert "energia" in prompt

    def test_includes_alerts_from_db(self):
        """Con alertas devueltas por la BD, el prompt las incluye."""
        engine = _make_engine(session=MagicMock())

        # Mock del metodo interno que consulta alertas
        mock_alerts = [
            {"description": "Alerta critica de coalicion", "severity": "high"},
            {"description": "Pico de sentimiento negativo", "severity": "critical"},
        ]

        async def _run():
            with patch.object(
                engine, "_fetch_recent_alerts", new=AsyncMock(return_value=mock_alerts)
            ), patch.object(
                engine, "_fetch_active_narratives", new=AsyncMock(return_value=[])
            ), patch.object(
                engine, "_fetch_parliamentary_events", new=AsyncMock(return_value=[])
            ):
                return await engine.build_briefing_prompt(
                    client_id="c-003",
                    market_code="spain",
                    since=datetime(2026, 4, 29, tzinfo=timezone.utc),
                    until=datetime(2026, 4, 30, tzinfo=timezone.utc),
                )

        prompt = asyncio.run(_run())
        assert "Alerta critica" in prompt
        assert "HIGH" in prompt or "high" in prompt.lower()

    def test_includes_narratives_from_db(self):
        engine = _make_engine(session=MagicMock())
        mock_narratives = [
            {"label": "Desinformacion electoral", "threat_level": "crisis", "description": "Narrativa falsa sobre el voto."}
        ]

        async def _run():
            with patch.object(engine, "_fetch_recent_alerts", new=AsyncMock(return_value=[])), \
                 patch.object(engine, "_fetch_active_narratives", new=AsyncMock(return_value=mock_narratives)), \
                 patch.object(engine, "_fetch_parliamentary_events", new=AsyncMock(return_value=[])):
                return await engine.build_briefing_prompt(
                    client_id="c-004",
                    market_code="spain",
                    since=datetime(2026, 4, 29, tzinfo=timezone.utc),
                    until=datetime(2026, 4, 30, tzinfo=timezone.utc),
                )

        prompt = asyncio.run(_run())
        assert "Desinformacion electoral" in prompt
        assert "crisis" in prompt.lower()

    def test_prompt_includes_json_schema_instruction(self):
        engine = _make_engine()

        async def _run():
            return await engine.build_briefing_prompt(
                client_id="c-005",
                market_code="spain",
                since=datetime(2026, 4, 29, tzinfo=timezone.utc),
                until=datetime(2026, 4, 30, tzinfo=timezone.utc),
            )

        prompt = asyncio.run(_run())
        # El prompt debe incluir instruccion de formato JSON
        assert "key_changes" in prompt
        assert "sections" in prompt

    def test_long_prompt_is_truncated(self):
        from services.intelligence.briefing_engine import _MAX_CONTEXT_CHARS
        engine = _make_engine()

        # Crear alertas con texto muy largo para forzar truncacion
        huge_alerts = [{"description": "X" * 5000, "severity": "high"}] * 10

        async def _run():
            with patch.object(engine, "_fetch_recent_alerts", new=AsyncMock(return_value=huge_alerts)), \
                 patch.object(engine, "_fetch_active_narratives", new=AsyncMock(return_value=[])), \
                 patch.object(engine, "_fetch_parliamentary_events", new=AsyncMock(return_value=[])):
                return await engine.build_briefing_prompt(
                    client_id="c-006", market_code="spain",
                    since=datetime(2026, 4, 29, tzinfo=timezone.utc),
                    until=datetime(2026, 4, 30, tzinfo=timezone.utc),
                )

        prompt = asyncio.run(_run())
        assert len(prompt) <= _MAX_CONTEXT_CHARS + 50  # margen para el marcador de truncacion


# ---------------------------------------------------------------------------
# Tests de generate_morning_briefing
# ---------------------------------------------------------------------------

class TestGenerateMorningBriefing:
    def test_returns_morning_briefing(self):
        mock_llm = MagicMock()
        expected = _make_mock_briefing()

        async def _fake_analyze(*args, **kwargs):
            return expected

        mock_llm.analyze_structured = _fake_analyze
        engine = _make_engine(llm=mock_llm)

        async def _run():
            with patch.object(engine, "build_briefing_prompt", new=AsyncMock(return_value="prompt")):
                return await engine.generate_morning_briefing(
                    client_id="c-001",
                    market_code="spain",
                    target_date=datetime(2026, 4, 30, tzinfo=timezone.utc),
                )

        result = asyncio.run(_run())
        assert isinstance(result, MorningBriefing)
        assert result.client_id == "c-001"
        assert result.date == "2026-04-30"

    def test_sections_present(self):
        mock_llm = MagicMock()
        expected = _make_mock_briefing()

        async def _fake_analyze(*args, **kwargs):
            return expected

        mock_llm.analyze_structured = _fake_analyze
        engine = _make_engine(llm=mock_llm)

        async def _run():
            with patch.object(engine, "build_briefing_prompt", new=AsyncMock(return_value="p")):
                return await engine.generate_morning_briefing(
                    client_id="c-001", market_code="spain"
                )

        result = asyncio.run(_run())
        assert len(result.sections) >= 1
        assert result.sections[0].title
        assert result.sections[0].body_markdown

    def test_persistence_called_with_session(self):
        """Si hay sesion, _persist_briefing debe llamarse."""
        mock_llm = MagicMock()
        expected = _make_mock_briefing()

        async def _fake_analyze(*args, **kwargs):
            return expected

        mock_llm.analyze_structured = _fake_analyze
        mock_session = MagicMock()
        mock_repo = MagicMock()
        mock_repo.upsert_object_from_pipeline = MagicMock(return_value="uuid-123")

        engine = _make_engine(llm=mock_llm, repo=mock_repo, session=mock_session)

        persisted: list = []

        async def _fake_persist(briefing):
            persisted.append(briefing)

        async def _run():
            with patch.object(engine, "build_briefing_prompt", new=AsyncMock(return_value="p")), \
                 patch.object(engine, "_persist_briefing", new=_fake_persist):
                return await engine.generate_morning_briefing(
                    client_id="c-001", market_code="spain"
                )

        asyncio.run(_run())
        assert len(persisted) == 1
        assert persisted[0].client_id == "c-001"

    def test_uses_today_when_no_target_date(self):
        mock_llm = MagicMock()

        async def _fake_analyze(*args, **kwargs):
            return _make_mock_briefing(date=datetime.now(timezone.utc).strftime("%Y-%m-%d"))

        mock_llm.analyze_structured = _fake_analyze
        engine = _make_engine(llm=mock_llm)

        async def _run():
            with patch.object(engine, "build_briefing_prompt", new=AsyncMock(return_value="p")):
                return await engine.generate_morning_briefing(
                    client_id="c-001", market_code="spain"
                )

        result = asyncio.run(_run())
        assert result.date == datetime.now(timezone.utc).strftime("%Y-%m-%d")
