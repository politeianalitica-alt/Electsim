"""
Tests para agents/analysis/extractor.py

Usa OllamaEngine mockeado — no requiere Ollama real.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from agents.analysis.extractor import (
    ExtractionResult,
    IntelSignal,
    NamedEntities,
    StructuredExtractor,
    VerifiedFact,
)
from agents.analysis.ollama_engine import OllamaEngine


def make_mock_engine(json_return: dict | None = None, text_return: str = "") -> OllamaEngine:
    """Crea un OllamaEngine mockeado."""
    engine = MagicMock(spec=OllamaEngine)
    engine.extract_json = AsyncMock(return_value=json_return or {})
    engine.generate = AsyncMock(return_value=text_return)
    engine.model_for_role = MagicMock(return_value="llama3.2:3b")
    return engine


class TestNamedEntities:
    def test_all_actors_combines_personas_and_partidos(self):
        entities = NamedEntities(
            personas=["Pedro Sanchez"],
            organizaciones=["PSOE"],
            partidos=["PP"],
        )
        actors = entities.all_actors()
        assert "Pedro Sanchez" in actors
        assert "PP" in actors

    def test_all_actors_deduplicates(self):
        entities = NamedEntities(
            personas=["Pedro Sanchez"],
            partidos=["Pedro Sanchez"],
        )
        actors = entities.all_actors()
        assert actors.count("Pedro Sanchez") == 1

    def test_empty_entities(self):
        entities = NamedEntities()
        assert entities.all_actors() == []


class TestIntelSignal:
    def test_default_values(self):
        signal = IntelSignal(signal_type="declaracion", urgency="alta")
        assert signal.actors == []
        assert signal.confidence == 0.6


class TestExtractionResult:
    def test_has_content_with_signals(self):
        result = ExtractionResult(
            signals=[IntelSignal("declaracion", "alta", summary="texto")]
        )
        assert result.has_content() is True

    def test_has_content_empty(self):
        result = ExtractionResult()
        assert result.has_content() is False

    def test_has_content_with_entities(self):
        result = ExtractionResult(
            entities=NamedEntities(personas=["Sanchez"])
        )
        assert result.has_content() is True


class TestStructuredExtractor:
    @pytest.mark.asyncio
    async def test_extract_entities_parses_json(self):
        engine = make_mock_engine(json_return={
            "personas": ["Pedro Sanchez", "Alberto Feijoo"],
            "organizaciones": ["PSOE", "PP"],
            "lugares": ["Madrid"],
            "temas": ["economia", "reforma"],
            "partidos": ["PSOE"],
        })
        extractor = StructuredExtractor(engine)
        entities = await extractor.extract_entities("texto de prueba sobre politica")

        assert "Pedro Sanchez" in entities.personas
        assert "PSOE" in entities.organizaciones
        assert "Madrid" in entities.lugares

    @pytest.mark.asyncio
    async def test_extract_entities_empty_text(self):
        engine = make_mock_engine()
        extractor = StructuredExtractor(engine)
        entities = await extractor.extract_entities("")
        assert entities.personas == []
        assert entities.organizaciones == []

    @pytest.mark.asyncio
    async def test_extract_facts_parses_json(self):
        engine = make_mock_engine(json_return={
            "hechos": [
                {
                    "actor": "Pedro Sanchez",
                    "accion": "anuncia",
                    "objeto": "reforma fiscal",
                    "fecha": "2026-05-01",
                    "confianza": 0.9,
                }
            ]
        })
        extractor = StructuredExtractor(engine)
        facts = await extractor.extract_facts("texto politico")

        assert len(facts) == 1
        assert facts[0].actor == "Pedro Sanchez"
        assert facts[0].action == "anuncia"
        assert facts[0].confidence == 0.9

    @pytest.mark.asyncio
    async def test_extract_facts_empty_text(self):
        engine = make_mock_engine()
        extractor = StructuredExtractor(engine)
        facts = await extractor.extract_facts("")
        assert facts == []

    @pytest.mark.asyncio
    async def test_extract_signals_parses_json(self):
        engine = make_mock_engine(json_return={
            "señales": [
                {
                    "tipo": "alianza",
                    "urgencia": "alta",
                    "actores": ["PSOE", "Sumar"],
                    "resumen": "Acuerdo de investidura",
                    "confianza": 0.8,
                    "etiquetas": ["coalicion", "gobierno"],
                }
            ]
        })
        extractor = StructuredExtractor(engine)
        signals = await extractor.extract_signals("texto sobre alianzas")

        assert len(signals) == 1
        assert signals[0].signal_type == "alianza"
        assert signals[0].urgency == "alta"
        assert "PSOE" in signals[0].actors

    @pytest.mark.asyncio
    async def test_extract_signals_invalid_type_fallback(self):
        engine = make_mock_engine(json_return={
            "señales": [
                {"tipo": "tipo_invalido", "urgencia": "media", "resumen": "test"}
            ]
        })
        extractor = StructuredExtractor(engine)
        signals = await extractor.extract_signals("texto")
        assert len(signals) == 1
        # Tipo invalido se acepta (no hay validacion estricta en extractor)

    @pytest.mark.asyncio
    async def test_extract_pipeline_returns_result(self):
        entity_json = {
            "personas": ["Sanchez"],
            "organizaciones": [],
            "lugares": [],
            "temas": ["economia"],
            "partidos": ["PSOE"],
        }
        signal_json = {
            "señales": [
                {"tipo": "declaracion", "urgencia": "alta", "resumen": "nueva medida", "actores": ["Sanchez"]}
            ]
        }
        fact_json = {
            "hechos": [
                {"actor": "Sanchez", "accion": "propone", "objeto": "medida", "fecha": "hoy", "confianza": 0.7}
            ]
        }

        call_count = 0
        returns = [entity_json, signal_json, fact_json]

        async def side_effect(*args, **kwargs):
            nonlocal call_count
            result = returns[call_count % len(returns)]
            call_count += 1
            return result

        engine = make_mock_engine()
        engine.extract_json = AsyncMock(side_effect=side_effect)

        extractor = StructuredExtractor(engine)
        result = await extractor.extract("texto politico completo", include_facts=True)

        assert isinstance(result, ExtractionResult)
        assert result.raw_text_len > 0

    @pytest.mark.asyncio
    async def test_extract_without_facts(self):
        engine = make_mock_engine(json_return={
            "personas": [], "organizaciones": [], "lugares": [],
            "temas": [], "partidos": [], "señales": []
        })
        extractor = StructuredExtractor(engine)
        result = await extractor.extract("texto", include_facts=False)
        assert isinstance(result, ExtractionResult)

    def test_clean_list_filters_empty(self):
        result = StructuredExtractor._clean_list(["a", "", None, "b"])
        assert result == ["a", "b"]

    def test_clean_list_non_list_input(self):
        result = StructuredExtractor._clean_list("no es lista")
        assert result == []

    def test_clean_list_truncates_long_strings(self):
        long_string = "x" * 200
        result = StructuredExtractor._clean_list([long_string])
        assert len(result[0]) == 100
