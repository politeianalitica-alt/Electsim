import logging
from unittest.mock import MagicMock, patch

from agents.llm import StubLLMClient
from agents.prompts import build_system_prompt
from agents.runner import build_context_aware_prompt, run_turn


def _perfil():
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


def test_build_context_aware_prompt_sin_engine():
    p = _perfil()
    assert build_context_aware_prompt(p, None) == build_system_prompt(p)


def test_build_context_aware_prompt_con_extra():
    p = _perfil()
    eng = MagicMock()
    with patch("agents.runner.construir_extra_context", return_value="Linea macro.\nLinea red."):
        s = build_context_aware_prompt(p, eng)
    assert "--- CONTEXTO ACTUAL ---" in s
    assert "Linea macro." in s


def test_run_turn_sin_engine_igual_que_antes():
    engine = MagicMock()
    with patch("agents.runner.load_perfil_por_cluster", return_value=_perfil()):
        out = run_turn(engine, 7, "hola", llm=StubLLMClient(), persist=False, rag_engine=None)
    assert out.system_prompt == build_system_prompt(_perfil())


def test_run_turn_con_engine_mock():
    engine = MagicMock()
    with patch("agents.runner.load_perfil_por_cluster", return_value=_perfil()):
        with patch("agents.runner.construir_extra_context", return_value="CONTEXTO_DE_PRUEBA_RAG"):
            out = run_turn(engine, 7, "ping", llm=StubLLMClient(), persist=False, rag_engine=engine)
    assert "CONTEXTO_DE_PRUEBA_RAG" in out.system_prompt


def test_run_turn_engine_falla(caplog):
    caplog.set_level(logging.WARNING)
    engine = MagicMock()
    with patch("agents.runner.load_perfil_por_cluster", return_value=_perfil()):
        with patch(
            "agents.runner.construir_extra_context",
            side_effect=RuntimeError("BD caída"),
        ):
            out = run_turn(engine, 7, "x", llm=StubLLMClient(), persist=False, rag_engine=engine)
    assert "CONTEXTO ACTUAL" not in out.system_prompt
    assert out.system_prompt == build_system_prompt(_perfil())
    assert any("RAG omitido" in r.message for r in caplog.records)
