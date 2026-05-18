"""
Smoke tests del GroqBrain — sin conexión real a Groq.

Cubren:
  · Carga del singleton + mixins.
  · Las 29 tools devuelven dict normalizado (ok=True con mock).
  · _extract_json funciona en sus 3 modos (directo / fenced / primero).
  · _call captura excepciones (no crashea).
  · Plantilla faltante devuelve ok=False, error claro.
  · Cada bloque exporta su mixin con los métodos esperados.

Para ejecutar:
    .venv/bin/pytest agents/brain/tests/test_brain_smoke.py -v
"""
from __future__ import annotations

import json
from typing import Any

import pytest

from agents.brain.groq_brain import (
    GroqBrainBase,
    _build_groq_brain_class,
    _extract_json,
    _normalize_result,
    reset_groq_brain,
)


# ─────────────────────────────────────────────────────────────────
# Fake client
# ─────────────────────────────────────────────────────────────────

class FakeChatClient:
    """Cliente mock que devuelve JSON canned o un texto para markdown."""

    def __init__(self, response_payload: Any = None, raises: Exception | None = None):
        self.response_payload = response_payload
        self.raises = raises
        self.calls: list[dict[str, Any]] = []

    @property
    def modelo(self) -> str:
        return "fake-llama-3.3-70b"

    def complete(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        self.calls.append({"messages": messages, "kwargs": kwargs})
        if self.raises:
            raise self.raises
        if isinstance(self.response_payload, (dict, list)):
            return json.dumps(self.response_payload, ensure_ascii=False)
        return str(self.response_payload or "")


def _make_brain(response_payload: Any = None, raises: Exception | None = None):
    reset_groq_brain()
    klass = _build_groq_brain_class()
    return klass(client=FakeChatClient(response_payload=response_payload, raises=raises))


# ─────────────────────────────────────────────────────────────────
# _extract_json
# ─────────────────────────────────────────────────────────────────

class TestExtractJSON:
    def test_direct_object(self):
        assert _extract_json('{"a": 1}') == {"a": 1}

    def test_direct_array(self):
        assert _extract_json("[1,2,3]") == [1, 2, 3]

    def test_fenced(self):
        raw = 'aquí va la respuesta:\n```json\n{"a": 2}\n```\nfin'
        assert _extract_json(raw) == {"a": 2}

    def test_first_object_in_text(self):
        raw = 'preámbulo {"x": 5} epílogo'
        assert _extract_json(raw) == {"x": 5}

    def test_empty(self):
        assert _extract_json("") is None
        assert _extract_json("texto sin json") is None


# ─────────────────────────────────────────────────────────────────
# _normalize_result
# ─────────────────────────────────────────────────────────────────

class TestNormalize:
    def test_promotes_confidence_sources(self):
        parsed = {"confidence": 0.7, "sources": ["a", "b"], "reasoning_steps": ["paso 1"]}
        out = _normalize_result(
            raw="{}", parsed=parsed, prompt_name="x",
            model="m", latency_ms=10, tokens_used=5, ok=True,
        )
        assert out["confidence"] == 0.7
        assert out["sources"] == ["a", "b"]
        assert out["reasoning_steps"] == ["paso 1"]
        assert out["ok"] is True
        assert out["error"] is None

    def test_confidence_clamped(self):
        out = _normalize_result(
            raw="{}", parsed={"confidence": 2.0}, prompt_name="x",
            model="m", latency_ms=10, tokens_used=5, ok=True,
        )
        assert out["confidence"] == 1.0

    def test_handles_non_dict_parsed(self):
        out = _normalize_result(
            raw="texto libre", parsed="texto libre", prompt_name="x",
            model="m", latency_ms=10, tokens_used=5, ok=True,
        )
        assert out["confidence"] == 0.0
        assert out["sources"] == []


# ─────────────────────────────────────────────────────────────────
# _call con templates reales
# ─────────────────────────────────────────────────────────────────

class TestCall:
    def test_call_with_existing_prompt_json(self):
        brain = _make_brain({"valence": -0.5, "confidence": 0.8, "sources": ["x"]})
        out = brain._call(
            "analysis_sentiment_deep",
            {"text": "hola", "actor": "X", "topic": "Y", "context": ""},
        )
        assert out["ok"] is True
        assert out["confidence"] == 0.8
        assert out["sources"] == ["x"]
        assert out["model"] == "fake-llama-3.3-70b"
        assert out["error"] is None
        assert out["from_fallback"] is False

    def test_call_with_missing_prompt(self):
        brain = _make_brain({"ok": True})
        out = brain._call("prompt_que_no_existe", {})
        assert out["ok"] is False
        assert "no encontrado" in (out["error"] or "").lower()

    def test_call_with_client_exception(self):
        brain = _make_brain(raises=RuntimeError("boom"))
        out = brain._call("analysis_sentiment_deep", {"text": "x"})
        assert out["ok"] is False
        assert "boom" in (out["error"] or "")

    def test_call_with_bad_json_fallback(self):
        brain = _make_brain(response_payload="esto no es json válido")
        out = brain._call("analysis_sentiment_deep", {"text": "x"})
        # ok=True porque la llamada se hizo; from_fallback=True porque no parseó
        assert out["ok"] is True
        assert out["from_fallback"] is True
        assert out["error"] == "json_parse_failed"

    def test_call_with_free_text(self):
        brain = _make_brain(response_payload="# Markdown extenso\n\nContenido…")
        out = brain._call(
            "content_war_room_summary",
            {"situation": "x", "signals": [], "adversary_moves": [],
             "client_assets": [], "time_pressure": "24h"},
            response_format=None,
        )
        assert out["ok"] is True
        assert "Markdown" in out["result"]


# ─────────────────────────────────────────────────────────────────
# Catálogo: las 29 tools existen y son llamables
# ─────────────────────────────────────────────────────────────────

EXPECTED_TOOLS = {
    # Bloque 1 — Ingestion
    "identify_source_relevance":      {"source_url": "https://x", "source_title": "t", "source_excerpt": "e"},
    "extract_political_entities":     {"text": "PSOE y PP debaten…"},
    "classify_document":              {"text": "lorem", "url": "https://x", "title": "t"},
    "detect_source_change":           {"source_name": "ABC", "baseline_summary": "x", "recent_samples": ["a", "b"]},
    "discover_new_sources":           {"topic": "vivienda", "existing_sources": ["el_pais"]},
    # Bloque 2 — Analysis
    "analyze_sentiment_deep":         {"text": "discurso"},
    "analyze_narrative":              {"pieces": ["p1", "p2"], "topic": "amnistía"},
    "analyze_discourse":              {"text": "intervención"},
    "detect_disinformation_signals":  {"text": "bulo sospechoso"},
    "analyze_media_bias":             {"media_name": "X", "recent_pieces": ["a"], "topic": "y"},
    # Bloque 3 — Forecasting
    "interpret_simulation_results":   {"simulation_type": "monte_carlo", "inputs_summary": "x", "results_payload": {"a": 1}},
    "forecast_political_scenario":    {"topic": "ruptura coalición", "current_situation": "x"},
    "analyze_coalition_viability":    {"proposed_coalition": ["PSOE", "Sumar"], "seats_by_party": {"PSOE": 121, "Sumar": 27}},
    "assess_electoral_risk":          {"party": "PP", "risk_event": "filtración"},
    "interpret_nowcasting":           {"nowcast_payload": {"PSOE": 30}},
    # Bloque 4 — Intelligence
    "build_actor_profile":            {"actor_name": "Pedro Sánchez", "role": "Presidente"},
    "opposition_research":            {"target_actor": "Feijóo", "client_position": "gobierno"},
    "analyze_legislative_position":   {"actor_or_party": "PNV", "law_or_topic": "presupuestos"},
    "geopolitical_impact":            {"event": "alza energética", "region": "España"},
    "analyze_soft_vote":              {"party": "Vox"},
    # Bloque 5 — Content
    "generate_briefing":              {"title": "Briefing", "date": "2026-05-18", "sections_context": "x"},
    "generate_alert":                 {"event": "filtración", "urgency": "alta"},
    "draft_communication":            {"comm_type": "tweet", "objective": "responder", "key_messages": ["m1"]},
    "generate_war_room_summary":      {"situation": "x", "signals": [], "adversary_moves": [], "client_assets": []},
    "generate_macro_political_synthesis": {"macro_indicators": {"pib": 2.1}, "political_events": ["x"]},
    # Bloque 6 — Memory
    "search_institutional_memory":    {"query": "qué pasó en 2018", "retrieved_items": [{"id": 1, "text": "x"}]},
    "validate_prediction":            {"prediction_summary": "x", "prediction_date": "2025-01-01", "observed_outcome": "y", "observed_date": "2025-06-01"},
    "extract_lessons_learned":        {"event_summary": "x", "actions_taken": ["a"], "outcomes": ["o"]},
    # Bloque 7 — Orchestrator (NOTA: NO la llamamos aquí porque internamente
    # construye un ReactAgent que sí hace llamadas reales; testeada aparte.)
}


class TestCatalog:
    def test_count_29_methods_excluding_orchestrator(self):
        # 5*5 + 3 = 28 tools de Bloques 1-6, + political_query = 29
        assert len(EXPECTED_TOOLS) == 28
        klass = _build_groq_brain_class()
        instance = klass(client=FakeChatClient(response_payload={"ok": True}))
        assert hasattr(instance, "political_query")
        for name in EXPECTED_TOOLS:
            assert hasattr(instance, name), f"falta tool {name}"
            assert callable(getattr(instance, name)), f"{name} no es callable"

    @pytest.mark.parametrize("tool_name,kwargs", list(EXPECTED_TOOLS.items()))
    def test_each_tool_returns_normalized_dict(self, tool_name, kwargs):
        # JSON canned con confidence/sources para validar normalización
        payload = {"ok": True, "confidence": 0.5, "sources": ["s1"], "reasoning_steps": ["r1"]}
        brain = _make_brain(payload)
        result = getattr(brain, tool_name)(**kwargs)
        # Forma normalizada
        assert isinstance(result, dict)
        for required_key in ("ok", "result", "confidence", "sources",
                             "reasoning_steps", "model", "tokens_used",
                             "latency_ms", "prompt_name", "error"):
            assert required_key in result, f"{tool_name} no devuelve clave {required_key}"
        # Casos JSON deben tener ok=True y model conocido
        assert result["ok"] is True
        assert result["model"] == "fake-llama-3.3-70b"

    def test_tool_never_crashes_on_llm_error(self):
        brain = _make_brain(raises=RuntimeError("simulated network failure"))
        out = brain.analyze_sentiment_deep(text="hola")
        assert out["ok"] is False
        assert "simulated network failure" in (out["error"] or "")
        # Aún así devuelve dict normalizado
        assert "model" in out


# ─────────────────────────────────────────────────────────────────
# Ensamblaje y singleton
# ─────────────────────────────────────────────────────────────────

class TestAssembly:
    def test_mixins_combined_via_mro(self):
        klass = _build_groq_brain_class()
        names = [c.__name__ for c in klass.__mro__]
        for required in ("IngestionMixin", "AnalysisMixin", "ForecastingMixin",
                         "IntelligenceMixin", "ContentMixin", "MemoryToolsMixin",
                         "OrchestratorMixin", "GroqBrainBase"):
            assert required in names, f"falta mixin {required} en MRO"

    def test_singleton_pattern(self):
        from agents.brain.groq_brain import get_groq_brain
        reset_groq_brain()
        # Cuidado: get_groq_brain construye con OpenAIChatClient real → solo lo
        # llamamos si OPENAI_API_KEY está disponible. Si no, comprobamos la
        # construcción del singleton de forma indirecta.
        import os
        if not os.environ.get("OPENAI_API_KEY"):
            pytest.skip("OPENAI_API_KEY no disponible — no construimos singleton real")
        a = get_groq_brain()
        b = get_groq_brain()
        assert a is b
        reset_groq_brain()
        c = get_groq_brain()
        assert c is not a
