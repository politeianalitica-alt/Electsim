import pandas as pd

from models.riesgos.stress_testing import EscenarioStress, stress_test_completo


def _base_est():
    return pd.DataFrame(
        {
            "partido": ["PSOE", "SUMAR", "PP"],
            "estimacion_pct": [30.0, 25.0, 45.0],
            "ic_95_inf": [28.0, 23.0, 43.0],
            "ic_95_sup": [32.0, 27.0, 47.0],
        }
    )


def test_impacto_negativo_reduce_escanos():
    base = _base_est()
    esc = EscenarioStress(
        nombre="neg",
        descripcion="",
        probabilidad_ocurrencia=1.0,
        impacto_por_partido={"PSOE": -5.0, "SUMAR": -5.0},
        riesgo_ruptura_coalicion=0.0,
    )
    out = stress_test_completo(base, ["PSOE", "SUMAR"], escenarios=[esc])
    row = out.iloc[0]
    assert row["escanos_coalicion_stress"] < row["escanos_coalicion_base"]


def test_sin_impacto_no_cambia():
    base = _base_est()
    esc = EscenarioStress(
        nombre="cero",
        descripcion="",
        probabilidad_ocurrencia=1.0,
        impacto_por_partido={},
        riesgo_ruptura_coalicion=0.0,
    )
    out = stress_test_completo(base, ["PSOE", "SUMAR"], escenarios=[esc])
    row = out.iloc[0]
    assert abs(row["escanos_coalicion_stress"] - row["escanos_coalicion_base"]) < 1e-6


def test_pierden_mayoria_flag():
    # 26 + 24.571 = 50.571% nacional → (50.571/100)*350 = 177.0 escaños de coalición
    base = pd.DataFrame(
        {
            "partido": ["PSOE", "SUMAR", "PP"],
            "estimacion_pct": [26.0, 24.571, 49.429],
            "ic_95_inf": [25.0, 23.5, 48.0],
            "ic_95_sup": [27.0, 25.5, 50.5],
        }
    )
    esc = EscenarioStress(
        nombre="baja",
        descripcion="",
        probabilidad_ocurrencia=1.0,
        impacto_por_partido={"PSOE": -4.0, "SUMAR": -4.0},
        riesgo_ruptura_coalicion=0.0,
    )
    out = stress_test_completo(base, ["PSOE", "SUMAR"], escenarios=[esc])
    assert bool(out.iloc[0]["pierden_mayoria"]) is True
