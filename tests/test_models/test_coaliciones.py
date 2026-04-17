from models.estrategicos.coaliciones import (
    coaliciones_ganadoras_minimas,
    ley_dhondt,
    valor_shapley,
)


def test_dhondt_conocido():
    votos = {"A": 40, "B": 30, "C": 20, "D": 10}
    esc = ley_dhondt(votos, 5)
    assert esc == {"A": 2, "B": 2, "C": 1, "D": 0}


def test_cgm_simple():
    # A solo gana; B+C suman exactamente 176
    esc = {"A": 180, "B": 100, "C": 76}
    cgm = coaliciones_ganadoras_minimas(esc)
    tuples = {tuple(sorted(c["coalicion"])) for c in cgm}
    assert ("A",) in tuples
    assert tuple(sorted(("B", "C"))) in tuples


def test_shapley_simetria():
    # Dos jugadores idénticos 90+90=180>=176; ambos imprescindibles
    partidos = ["A", "B"]
    esc = {"A": 90, "B": 90}
    sh = valor_shapley(partidos, esc)
    assert abs(sh["A"] - sh["B"]) < 1e-6
