from models.escenarios.morfologico import (
    EJES_ELECTORALES_ESPAÑA,
    INCOMPATIBILIDADES,
    Eje,
    generar_escenarios,
)


def test_coherencia_cero_descartada():
    eje_a = Eje("e1", "e1", [{"id": "recesion", "prob": 0.5}, {"id": "ok", "prob": 0.5}])
    eje_b = Eje("e2", "e2", [{"id": "expansion", "prob": 0.5}, {"id": "x", "prob": 0.5}])
    inc = {("recesion", "expansion"): 10.0}
    out = generar_escenarios([eje_a, eje_b], inc, top_n=50)
    for esc in out:
        s = {esc.estado_por_eje["e1"]["id"], esc.estado_por_eje["e2"]["id"]}
        assert not ("recesion" in s and "expansion" in s)


def test_probabilidades_suman_1():
    out = generar_escenarios(EJES_ELECTORALES_ESPAÑA, INCOMPATIBILIDADES, top_n=100)
    s = sum(e.probabilidad for e in out)
    assert abs(s - 1.0) < 1e-6


def test_top_n_respetado():
    out = generar_escenarios(EJES_ELECTORALES_ESPAÑA, INCOMPATIBILIDADES, top_n=5)
    assert len(out) == 5
