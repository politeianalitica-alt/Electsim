from __future__ import annotations

import httpx

from agents.llm import StubLLMClient, _with_retry
from agents.prompts import build_system_prompt, parse_chain_of_thought
from agents.simulador_cis import _COLUMNAS_MICRODATOS_PERMITIDAS, _SQL_MICRODATOS


def test_stub_llm_complete_returns_string() -> None:
    llm = StubLLMClient(fixed_response="RESPUESTA: PSOE")
    out = llm.complete([{"role": "user", "content": "hola"}])
    assert isinstance(out, str)
    assert "PSOE" in out


def test_build_system_prompt_full_and_empty() -> None:
    full = {
        "descripcion_perfil_llm": "Votante urbano progresista.",
        "label": "Joven urbano",
        "cluster_id": 1001,
        "edad_media": 29.7,
        "ideologia_media": 3.2,
        "n_respondentes": 120,
        "peso_demografico_pct": 4.5,
        "ccaa": "Madrid",
        "clase_social": "media",
        "nivel_educativo": "universitario",
        "distribucion_voto_json": {"SUMAR": 40.0, "PSOE": 35.0, "PP": 10.0},
    }
    p1 = build_system_prompt(full)
    assert isinstance(p1, str)
    assert "Descripción del perfil" in p1
    assert "Distribución de voto histórica" in p1

    empty = {}
    p2 = build_system_prompt(empty)
    assert isinstance(p2, str)
    assert len(p2) > 20


def test_parse_chain_of_thought_ok_and_fallback() -> None:
    ok = "### Deliberación\nEl coste de vida me preocupa.\n### Respuesta final\nPSOE"
    deliberacion, respuesta = parse_chain_of_thought(ok)
    assert respuesta == "PSOE"
    assert "coste de vida" in deliberacion.lower()

    bad = "texto libre sin formato"
    deliberacion_bad, respuesta_bad = parse_chain_of_thought(bad)
    assert deliberacion_bad == ""
    assert respuesta_bad == "texto libre sin formato"


def test_with_retry_recovers_after_timeouts() -> None:
    state = {"n": 0}

    def flaky() -> str:
        state["n"] += 1
        if state["n"] < 3:
            raise httpx.TimeoutException("timeout")
        return "ok"

    out = _with_retry(flaky)
    assert out == "ok"
    assert state["n"] == 3


def test_sql_microdatos_covers_whitelist() -> None:
    assert _COLUMNAS_MICRODATOS_PERMITIDAS.issubset(set(_SQL_MICRODATOS.keys()))
