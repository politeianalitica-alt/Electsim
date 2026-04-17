from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from agents.llm import StubLLMClient
from agents.prompts import build_system_prompt
from agents.runner import AgentTurnResult, VoterAgent, parse_chain_of_thought


def test_build_system_prompt_contains_descripcion():
    perfil = {
        "cluster_id": 2,
        "label": "cluster_2",
        "descripcion_perfil_llm": "Persona de Valladolid, preocupada por el empleo juvenil.",
        "edad_media": 44.0,
        "ideologia_media": 5.2,
    }
    s = build_system_prompt(perfil)
    assert "Valladolid" in s
    assert "### Deliberación" in s
    assert "cluster_2" in s


def test_build_system_prompt_sin_descripcion_usa_fallback():
    s = build_system_prompt({"cluster_id": 0, "label": "x"})
    assert "No hay descripción detallada" in s


def test_parse_chain_of_thought_estructura():
    text = (
        "### Deliberación\n"
        "Analizo precio de la luz y confianza en el gobierno.\n\n"
        "### Respuesta final\n"
        "Me preocupa más la factura que los debates partidistas."
    )
    d, f = parse_chain_of_thought(text)
    assert "precio de la luz" in d
    assert "factura" in f


def test_parse_chain_of_thought_sin_marcadores():
    d, f = parse_chain_of_thought("Solo una frase suelta.")
    assert d == ""
    assert f == "Solo una frase suelta."


def _perfil_fixture():
    return {
        "id": 101,
        "cluster_id": 7,
        "label": "cluster_7",
        "n_respondentes": 50,
        "peso_demografico_pct": 12.5,
        "edad_media": 48.0,
        "ideologia_media": 6.0,
        "distribucion_voto_json": "{}",
        "descripcion_perfil_llm": "Perfil de prueba.",
    }


def test_voter_agent_turn_contract_stub():
    engine = MagicMock()
    with patch("agents.runner.load_perfil_por_cluster", return_value=_perfil_fixture()):
        agent = VoterAgent(engine, 7, llm=StubLLMClient())
        out = agent.run_turn("¿Qué opinas de subir el SMI?", persist=False)

    assert isinstance(out, AgentTurnResult)
    assert out.cluster_id == 7
    assert out.perfil_id == 101
    assert out.session_id
    assert len(out.deliberation) > 10
    assert len(out.final_reply) > 5
    assert "Priorizo" in out.deliberation or "economía" in out.deliberation.lower()


def test_run_turn_persist_llama_cuatro_inserts():
    engine = MagicMock()
    conn = MagicMock()
    begin_cm = MagicMock()
    begin_cm.__enter__.return_value = conn
    begin_cm.__exit__.return_value = None
    engine.begin.return_value = begin_cm

    with patch("agents.runner.load_perfil_por_cluster", return_value=_perfil_fixture()):
        agent = VoterAgent(engine, 7, llm=StubLLMClient())
        agent.run_turn("test", persist=True)

    assert conn.execute.call_count == 4


def test_extra_context_prefija_usuario():
    engine = MagicMock()
    llm = MagicMock()
    llm.complete = MagicMock(return_value=StubLLMClient().complete([]))
    llm.modelo = "stub"

    with patch("agents.runner.load_perfil_por_cluster", return_value=_perfil_fixture()):
        agent = VoterAgent(engine, 7, llm=llm)
        agent.run_turn("¿Tu voto?", persist=False, extra_context="IPC sube un punto.")

    call_msgs = llm.complete.call_args[0][0]
    assert any("IPC" in m["content"] for m in call_msgs if m["role"] == "user")


def test_load_perfil_por_cluster_none_si_vacio():
    engine = MagicMock()
    cm = MagicMock()
    cm.__enter__.return_value = MagicMock()
    cm.__exit__.return_value = None
    engine.connect.return_value = cm
    with patch("agents.runner.pd.read_sql", return_value=pd.DataFrame()):
        from agents.runner import load_perfil_por_cluster as load_p

        assert load_p(engine, 999) is None


def test_voter_agent_raise_si_no_perfil():
    engine = MagicMock()
    with patch("agents.runner.load_perfil_por_cluster", return_value=None):
        with pytest.raises(ValueError, match="No existe"):
            VoterAgent(engine, 42, llm=StubLLMClient())
