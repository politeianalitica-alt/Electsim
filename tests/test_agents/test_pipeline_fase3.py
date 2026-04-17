from unittest.mock import MagicMock, patch

import pandas as pd

import pipelines.fase3_agentes as f3


def test_pipeline_sin_perfiles_no_lanza_tareas(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    eng = MagicMock()
    orig = f3.task_simular_encuesta_cis.fn
    try:
        spy = MagicMock()
        f3.task_simular_encuesta_cis.fn = spy
        with patch("pipelines.fase3_agentes.create_engine", return_value=eng):
            with patch("pipelines.fase3_agentes.verificar_perfiles_en_bd", return_value=False):
                f3.run_fase3()
        spy.assert_not_called()
    finally:
        f3.task_simular_encuesta_cis.fn = orig


def test_pipeline_stub_completo(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    eng = MagicMock()
    o_cis = f3.task_simular_encuesta_cis.fn
    o_camp = f3.task_simular_campana_ejemplo.fn
    o_prop = f3.task_propagacion_red.fn
    o_res = f3.task_generar_resumen_fase3.fn
    try:

        def cis_fn(e):
            return pd.DataFrame({"perfil_cluster_id": [0]}), pd.DataFrame(
                {
                    "pregunta_codigo": ["P1"],
                    "resultado_agregado": [{}],
                    "n_perfiles": [1],
                    "ns_nc_pct": [0.0],
                }
            )

        def camp_fn(e):
            from agents.simulador_campana import ReaccionPerfil

            return [
                ReaccionPerfil(0, "PP", 5.0, 1.0, [], [], "", 10.0),
            ], 1

        def prop_fn(r, sid, e):
            return None

        def res_fn(e):
            return None

        f3.task_simular_encuesta_cis.fn = cis_fn
        f3.task_simular_campana_ejemplo.fn = camp_fn
        f3.task_propagacion_red.fn = prop_fn
        f3.task_generar_resumen_fase3.fn = res_fn

        with patch("pipelines.fase3_agentes.create_engine", return_value=eng):
            with patch("pipelines.fase3_agentes.verificar_perfiles_en_bd", return_value=True):
                f3.run_fase3()
    finally:
        f3.task_simular_encuesta_cis.fn = o_cis
        f3.task_simular_campana_ejemplo.fn = o_camp
        f3.task_propagacion_red.fn = o_prop
        f3.task_generar_resumen_fase3.fn = o_res
