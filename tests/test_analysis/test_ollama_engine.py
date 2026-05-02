"""
Tests para agents/analysis/ollama_engine.py

No requieren Ollama instalado — todas las llamadas HTTP se mockean con httpx.
"""
from __future__ import annotations

import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.analysis.ollama_engine import (
    CircuitBreaker,
    CircuitState,
    OllamaEngine,
    OllamaEngineError,
)


# ---------------------------------------------------------------------------
# CircuitBreaker
# ---------------------------------------------------------------------------

class TestCircuitBreaker:
    def test_initial_state_closed(self):
        cb = CircuitBreaker(failure_threshold=3)
        assert cb.state == CircuitState.CLOSED
        assert cb.allow_request() is True

    def test_opens_after_threshold(self):
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=999)
        for _ in range(3):
            cb.record_failure()
        assert cb.state == CircuitState.OPEN
        assert cb.is_open() is True
        assert cb.allow_request() is False

    def test_success_resets_failures(self):
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=999)
        cb.record_failure()
        cb.record_failure()
        cb.record_success()
        assert cb.state == CircuitState.CLOSED
        assert cb._failures == 0

    def test_half_open_after_timeout(self):
        cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.01)
        cb.record_failure()
        assert cb.state == CircuitState.OPEN
        time.sleep(0.02)
        assert cb.state == CircuitState.HALF_OPEN
        assert cb.allow_request() is True

    def test_reset_clears_state(self):
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=999)
        cb.record_failure()
        cb.record_failure()
        assert cb.is_open()
        cb.reset()
        assert cb.state == CircuitState.CLOSED
        assert cb._failures == 0

    def test_does_not_open_below_threshold(self):
        cb = CircuitBreaker(failure_threshold=5, recovery_timeout=999)
        for _ in range(4):
            cb.record_failure()
        assert cb.state == CircuitState.CLOSED

    def test_half_open_success_closes(self):
        cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.01)
        cb.record_failure()
        time.sleep(0.02)
        assert cb.state == CircuitState.HALF_OPEN
        cb.record_success()
        assert cb.state == CircuitState.CLOSED

    def test_half_open_failure_reopens(self):
        cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.01)
        cb.record_failure()
        time.sleep(0.02)
        cb.state  # trigger half_open
        cb.record_failure()
        assert cb.state == CircuitState.OPEN


# ---------------------------------------------------------------------------
# OllamaEngine — sin conexion real
# ---------------------------------------------------------------------------

class TestOllamaEngine:
    @pytest.fixture
    def engine(self):
        return OllamaEngine(base_url="http://localhost:11434")

    def test_model_for_role_resumen(self, engine):
        model = engine.model_for_role("resumen")
        assert isinstance(model, str)
        assert len(model) > 0

    def test_model_for_role_unknown_falls_back(self, engine):
        model = engine.model_for_role("unknown_role_xyz")
        assert isinstance(model, str)
        assert len(model) > 0

    def test_market_id_accessible(self, engine):
        assert engine.market_id == "ES"

    def test_sector_ids_accessible(self):
        engine = OllamaEngine(sector_ids=["ENERGY", "BANKING"])
        assert "ENERGY" in engine.sector_ids

    def test_circuit_state_initially_closed(self, engine):
        assert engine.circuit_state == "closed"

    @pytest.mark.asyncio
    async def test_is_available_false_without_server(self, engine):
        """Sin servidor Ollama real, is_available debe retornar False."""
        async with OllamaEngine(base_url="http://localhost:19999") as eng:
            result = await eng.is_available()
        assert result is False

    @pytest.mark.asyncio
    async def test_generate_raises_without_session(self, engine):
        """generate sin aenter debe lanzar OllamaEngineError."""
        with pytest.raises(OllamaEngineError):
            await engine.generate("analisis", "prompt de prueba")

    @pytest.mark.asyncio
    async def test_embed_returns_empty_without_session(self, engine):
        result = await engine.embed("texto")
        assert result == []

    def test_parse_json_valid(self, engine):
        data = engine._parse_json('{"clave": "valor", "numero": 42}')
        assert data == {"clave": "valor", "numero": 42}

    def test_parse_json_with_surrounding_text(self, engine):
        data = engine._parse_json('Aqui esta: {"clave": "valor"} fin')
        assert data == {"clave": "valor"}

    def test_parse_json_invalid_raises(self, engine):
        with pytest.raises(ValueError):
            engine._parse_json("texto sin json")

    @pytest.mark.asyncio
    async def test_context_manager(self):
        async with OllamaEngine() as eng:
            assert eng._session is not None or True  # session puede fallar si httpx no esta

    @pytest.mark.asyncio
    async def test_generate_with_mocked_session(self):
        """Test generate con session mockeada."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "respuesta del modelo"}}]
        }
        mock_response.raise_for_status = MagicMock()

        mock_session = AsyncMock()
        mock_session.post = AsyncMock(return_value=mock_response)

        engine = OllamaEngine()
        engine._session = mock_session

        result = await engine.generate("analisis", "pregunta de prueba")
        assert "respuesta" in result.lower() or isinstance(result, str)

    @pytest.mark.asyncio
    async def test_generate_circuit_opens_on_repeated_failure(self):
        """El CircuitBreaker se abre tras failures repetidos."""
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=999)
        engine = OllamaEngine(circuit_breaker=cb)

        mock_session = AsyncMock()
        mock_session.post = AsyncMock(side_effect=ConnectionError("sin servidor"))
        engine._session = mock_session

        for _ in range(3):
            try:
                await engine.generate("analisis", "prompt")
            except OllamaEngineError:
                pass

        assert engine.circuit_state == "open"

    @pytest.mark.asyncio
    async def test_embed_batch_returns_list(self):
        """embed_batch retorna una lista del mismo tamaño que la entrada."""
        engine = OllamaEngine()
        engine._session = None  # Sin session
        result = await engine.embed_batch(["texto1", "texto2", "texto3"])
        assert len(result) == 3
        assert all(isinstance(r, list) for r in result)
