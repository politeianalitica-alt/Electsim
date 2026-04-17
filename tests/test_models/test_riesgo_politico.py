from unittest.mock import MagicMock, patch

from models.riesgos import riesgo_politico as rp


def test_semaforo_bajo():
    engine = MagicMock()
    with patch.multiple(
        rp,
        calcular_riesgo_inestabilidad_gubernamental=lambda _e: 20.0,
        calcular_riesgo_economico_social=lambda _e: 20.0,
        calcular_riesgo_territorial=lambda _e: 20.0,
        calcular_riesgo_polarizacion=lambda _e: 20.0,
        calcular_riesgo_institucional=lambda _e: 20.0,
        _persistir_informe=lambda *_a, **_k: None,
    ):
        inf = rp.generar_informe_riesgo_politico(engine)
    assert inf["semaforo"] == "BAJO"


def test_semaforo_alto():
    engine = MagicMock()
    with patch.multiple(
        rp,
        calcular_riesgo_inestabilidad_gubernamental=lambda _e: 70.0,
        calcular_riesgo_economico_social=lambda _e: 70.0,
        calcular_riesgo_territorial=lambda _e: 70.0,
        calcular_riesgo_polarizacion=lambda _e: 70.0,
        calcular_riesgo_institucional=lambda _e: 70.0,
        _persistir_informe=lambda *_a, **_k: None,
    ):
        inf = rp.generar_informe_riesgo_politico(engine)
    assert inf["semaforo"] == "ALTO"


def test_riesgo_polarizacion_mock_bimodal_vs_uniform():
    def make_engine(fetch_tuple):
        engine = MagicMock()
        conn = MagicMock()
        res = MagicMock()
        res.fetchone.return_value = fetch_tuple
        conn.execute.return_value = res
        cm = MagicMock()
        cm.__enter__.return_value = conn
        cm.__exit__.return_value = None
        engine.connect.return_value = cm
        return engine

    r_bio = rp.calcular_riesgo_polarizacion(make_engine((4.2, 35.0, 32.0)))
    r_uni = rp.calcular_riesgo_polarizacion(make_engine((2.0, 10.0, 10.0)))
    assert r_bio > r_uni
