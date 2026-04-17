import pandas as pd
from unittest.mock import MagicMock, patch

from agents.simulador_cis import (
    CUESTIONARIO_CIS_BASICO,
    PreguntaCIS,
    _build_pregunta_prompt,
    _parsear_respuesta,
    agregar_respuestas,
    simular_encuesta,
)


def test_build_pregunta_prompt_escala():
    p = PreguntaCIS("X", "Escala ideológica?", "escala_1_10", [], "escala_ideologica")
    s = _build_pregunta_prompt(p)
    assert "1" in s and "10" in s


def test_build_pregunta_prompt_categorica():
    p = PreguntaCIS("Y", "Problema?", "categorica", ["A", "B", "C"], "x")
    s = _build_pregunta_prompt(p)
    assert "A" in s and "B" in s and "C" in s


def test_parsear_escala_valida():
    p = PreguntaCIS("P1", "t", "escala_1_10", [], "e")
    assert _parsear_respuesta("7\nPorque soy de derechas", p) == "7"


def test_parsear_escala_invalida():
    p = PreguntaCIS("P1", "t", "escala_1_10", [], "e")
    assert _parsear_respuesta("No sé\nnada", p) == "NS/NC"


def test_parsear_categorica():
    p = PreguntaCIS("P5", "t", "categorica", ["Vivienda", "Paro"], "vp")
    assert _parsear_respuesta("Vivienda\nEs el mayor problema", p) == "Vivienda"


def test_parsear_opcion_parcial():
    p = PreguntaCIS("P5", "t", "categorica", ["Vivienda", "Paro"], "vp")
    assert _parsear_respuesta("vivi\nbreve", p) == "Vivienda"


def test_agregar_respuestas_escala():
    df = pd.DataFrame(
        {
            "pregunta_codigo": ["P1", "P1", "P1"],
            "variable_bd": ["escala_ideologica"] * 3,
            "tipo": ["escala_1_10"] * 3,
            "respuesta_parseada": ["4", "6", "8"],
            "peso": [0.2, 0.3, 0.5],
        }
    )
    out = agregar_respuestas(df)
    media = out.iloc[0]["resultado_agregado"]["media_ponderada"]
    assert abs(float(media) - 6.6) < 0.05


def test_agregar_respuestas_categorica_suma_100():
    df = pd.DataFrame(
        {
            "pregunta_codigo": ["P5", "P5", "P5"],
            "variable_bd": ["primer_problema_españa"] * 3,
            "tipo": ["categorica"] * 3,
            "respuesta_parseada": ["Paro", "Paro", "Vivienda"],
            "peso": [10.0, 20.0, 70.0],
        }
    )
    out = agregar_respuestas(df)
    dist = out.iloc[0]["resultado_agregado"]
    assert abs(sum(dist.values()) - 100.0) < 0.1


def test_simular_encuesta_stub():
    df_perfiles = pd.DataFrame(
        [
            {
                "id": 1,
                "cluster_id": 0,
                "label": "a",
                "n_respondentes": 10,
                "peso_demografico_pct": 50.0,
                "edad_media": 40.0,
                "ideologia_media": 5.0,
                "distribucion_voto_json": "{}",
                "descripcion_perfil_llm": "x",
            },
            {
                "id": 2,
                "cluster_id": 1,
                "label": "b",
                "n_respondentes": 10,
                "peso_demografico_pct": 50.0,
                "edad_media": 41.0,
                "ideologia_media": 6.0,
                "distribucion_voto_json": "{}",
                "descripcion_perfil_llm": "y",
            },
        ]
    )

    class FakeAgent:
        def __init__(self, eng, cid, llm=None):
            self.cid = cid

        def run_turn(self, msg, **kw):
            from agents.runner import AgentTurnResult

            return AgentTurnResult(
                session_id="s",
                cluster_id=self.cid,
                perfil_id=1,
                deliberation="delib",
                final_reply="Regular\nok",
                raw_assistant="raw",
                system_prompt="sys",
            )

    engine = MagicMock()
    with patch("agents.simulador_cis.listar_perfiles", return_value=df_perfiles):
        with patch("agents.simulador_cis.VoterAgent", FakeAgent):
            out = simular_encuesta(
                CUESTIONARIO_CIS_BASICO[:2],
                engine,
                n_perfiles=None,
                usar_rag=False,
            )

    assert len(out) == 2 * 2
