"""Tests de las correcciones G1-G8 + I1-I8 + A1-A10.

No hace llamadas reales a Groq — sólo verifica que las funciones helper,
las constantes y los disclaimers/audit-trails funcionan correctamente
sin red.
"""
from __future__ import annotations

import os
import pytest


# ─── G1+G8: modelos vigentes ────────────────────────────────────────

def test_groq_models_no_contiene_mixtral_discontinuado():
    from agents.brain.groq_client import _GROQ_MODELS, list_groq_models
    for tier, model in _GROQ_MODELS.items():
        assert "mixtral-8x7b-32768" not in model, f"tier {tier} aún apunta a mixtral discontinuado"
    # G8 · gemma2-9b-it ahora sí está en el dict (tier 'classify')
    assert _GROQ_MODELS["classify"] == "gemma2-9b-it"
    # Snapshot devuelve copia
    snap = list_groq_models()
    snap["fast"] = "TAMPERED"
    assert _GROQ_MODELS["fast"] != "TAMPERED"


def test_groq_model_overrides_via_env(monkeypatch):
    """Permite overrides via GROQ_MODEL_FAST=..."""
    monkeypatch.setenv("GROQ_MODEL_FAST", "test-fast-override")
    # Recargar el módulo es complicado · verificamos sólo el patrón
    import importlib
    from agents.brain import groq_client
    importlib.reload(groq_client)
    assert groq_client._GROQ_MODELS["fast"] == "test-fast-override"


# ─── G3: acepta OPENAI_API_KEY o GROQ_API_KEY ───────────────────────

def test_groq_acepta_openai_api_key_como_fallback(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "gsk_test_dummy")
    import importlib
    from agents.brain import groq_client
    importlib.reload(groq_client)
    assert groq_client.is_groq_available() is True
    assert groq_client._get_api_key() == "gsk_test_dummy"


def test_groq_no_disponible_sin_ninguna_key(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    import importlib
    from agents.brain import groq_client
    importlib.reload(groq_client)
    assert groq_client.is_groq_available() is False


# ─── G5: cache con TTL temporal ─────────────────────────────────────

def test_groq_cache_expira_por_tiempo():
    from agents.brain import groq_client
    groq_client.clear_groq_cache()
    fake_entry = {
        "ok": True, "result": "cached", "model": "test",
        "from_cache": False, "latency_ms": 1, "error": "",
    }
    cache_key = "test_key_g5"
    # Inyectamos directamente
    groq_client._cache_set(cache_key, fake_entry)
    # Hit dentro de TTL
    hit = groq_client._cache_get(cache_key, ttl_s=10)
    assert hit is not None
    assert hit["from_cache"] is True
    # Expirado
    miss = groq_client._cache_get(cache_key, ttl_s=0)
    assert miss is None
    groq_client.clear_groq_cache()


# ─── I1: rate-limiter funciona ──────────────────────────────────────

def test_rate_limiter_permite_ráfagas_dentro_de_la_ventana():
    from agents.brain.groq_client import _acquire_rate_slot, _GROQ_RATE_HISTORY
    _GROQ_RATE_HISTORY.clear()
    # Las primeras N llamadas (N ≤ 30) deben pasar sin esperar
    for i in range(5):
        ok = _acquire_rate_slot(timeout=2.0)
        assert ok, f"slot {i} no disponible"
    _GROQ_RATE_HISTORY.clear()


# ─── I3: validación de URLs de discover_new_sources ─────────────────

def test_http_head_check_url_invalida():
    from agents.brain.ingestion import _http_head_check
    status, err = _http_head_check("http://no-existe-nunca.example.invalid", timeout=2.0)
    assert status == 0
    assert err  # debe contener el error


# ─── I4: tokens en español ──────────────────────────────────────────

def test_estimate_tokens_spanish_no_subestima_25pct(monkeypatch):
    # Forzamos el path sin tiktoken
    import sys
    real = sys.modules.pop("tiktoken", None)
    sys.modules["tiktoken"] = None  # type: ignore
    try:
        from agents.brain.groq_brain import _estimate_tokens
        text = "El gobierno de España aprobó hoy la reforma del Reglamento del Congreso de los Diputados."
        tokens = _estimate_tokens(text)
        chars = len(text)
        # Antes era chars // 4 → ~22 tokens. Ahora chars / 3.3 → ~27 tokens.
        # La nueva estimación debe ser ≥ antigua (no subestimar para ES)
        assert tokens >= chars // 4
    finally:
        if real is not None:
            sys.modules["tiktoken"] = real
        else:
            sys.modules.pop("tiktoken", None)


# ─── A1: política de truncado unificada ─────────────────────────────

def test_constantes_truncado_son_consistentes():
    from agents.brain.analysis import (
        MAX_TEXT_SENTIMENT, MAX_TEXT_DISCOURSE, MAX_TEXT_DISINFO,
    )
    # Misma política para tools con texto largo
    assert MAX_TEXT_SENTIMENT == 8000
    assert MAX_TEXT_DISCOURSE == 8000
    assert MAX_TEXT_DISINFO == 8000


def test_truncate_with_flag():
    from agents.brain.analysis import _truncate_with_flag
    t, tr, n = _truncate_with_flag("abc", 100)
    assert t == "abc" and not tr and n == 3
    t, tr, n = _truncate_with_flag("a" * 9000, 5000)
    assert tr and n == 9000 and len(t) == 5000


def test_limit_pieces_dropea_excedentes_y_trunca():
    from agents.brain.analysis import _limit_pieces
    pcs, meta = _limit_pieces(
        ["a" * 3000] * 30,
        max_pieces=10,
        max_chars_per_piece=500,
    )
    assert len(pcs) == 10
    assert meta["pieces_total"] == 30
    assert meta["pieces_used"] == 10
    assert meta["dropped_pieces"] == 20
    assert meta["truncated_pieces"] == 10
    assert all(len(p) == 500 for p in pcs)


def test_limit_pieces_acepta_string_y_none():
    from agents.brain.analysis import _limit_pieces
    pcs, meta = _limit_pieces("solo un string", max_pieces=5, max_chars_per_piece=100)
    assert len(pcs) == 1
    pcs, meta = _limit_pieces(None, max_pieces=5, max_chars_per_piece=100)
    assert pcs == []


# ─── A2/A6/A8: disclaimers ──────────────────────────────────────────

def test_llm_disclaimer_estructura():
    from agents.brain.forecasting import _llm_disclaimer
    d = _llm_disclaimer(has_quantitative_base=False)
    assert d["generated_by_llm"] is True
    assert d["requires_human_review"] is True
    assert d["has_quantitative_base"] is False


# ─── A5: validación aritmética coalición ────────────────────────────

def test_parliament_sizes_incluye_congreso_y_ccaa():
    from agents.brain.forecasting import PARLIAMENT_SIZES, _majority_threshold
    assert PARLIAMENT_SIZES["congreso"] == 350
    assert _majority_threshold(PARLIAMENT_SIZES["congreso"]) == 176
    assert _majority_threshold(PARLIAMENT_SIZES["madrid"]) == 68
    # 17 CCAA + 2 ciudades autónomas + congreso + senado + europeo_es = 22
    assert len(PARLIAMENT_SIZES) >= 20


# ─── A3: opposition_research requiere audit ────────────────────────

def test_opposition_research_falla_sin_requester_id():
    from agents.brain.intelligence import IntelligenceMixin

    class _Stub(IntelligenceMixin):
        def _call(self, *a, **kw):
            return {"ok": True, "result": {}}

    s = _Stub()
    out = s.opposition_research(
        target_actor="X", client_position="Y",
        requester_id="", purpose="",
    )
    assert out["ok"] is False
    assert "audit_required" in out["error"]


def test_opposition_research_rate_limit():
    from agents.brain.intelligence import IntelligenceMixin, _RATE_COUNTERS
    _RATE_COUNTERS.clear()

    class _Stub(IntelligenceMixin):
        def _call(self, *a, **kw):
            return {"ok": True, "result": {}, "raw": "", "confidence": 0.0,
                    "sources": [], "reasoning_steps": [], "model": "test",
                    "tokens_used": 0, "latency_ms": 1,
                    "prompt_name": "intel_opposition_research",
                    "from_fallback": False, "error": ""}

    s = _Stub()
    os.environ.pop("POLITEIA_OPPRES_DAILY_LIMIT", None)
    # Default 5 · la 6ª debe ser rechazada
    for i in range(5):
        out = s.opposition_research(
            target_actor=f"Actor{i}", client_position="X",
            requester_id="tester", purpose="unit test",
        )
        assert out.get("ok") in (True, False)
    out6 = s.opposition_research(
        target_actor="ActorN", client_position="X",
        requester_id="tester", purpose="unit test",
    )
    assert out6["ok"] is False
    assert "rate_limited" in out6["error"]
    _RATE_COUNTERS.clear()
