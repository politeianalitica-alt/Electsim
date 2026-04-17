import pandas as pd

from models.escenarios.monte_carlo_escanos import simular_congreso


def test_dhondt_integrado_mayoria_fuerte():
    estimaciones = pd.DataFrame(
        {
            "partido": ["FUERTE", "OTRO"],
            "estimacion_pct": [62.0, 38.0],
            "ic_95_inf": [61.0, 37.0],
            "ic_95_sup": [63.0, 39.0],
        }
    )
    escanos_prov = {"99": 350}
    factor = pd.DataFrame()
    out = simular_congreso(
        estimaciones, escanos_prov, factor, n_simulaciones=2000, seed=123
    )
    row = out[out["partido"] == "FUERTE"].iloc[0]
    assert row["prob_mayoria_absoluta"] > 0.9


def test_barrera_electoral():
    estimaciones = pd.DataFrame(
        {
            "partido": ["PEQUE", "GRANDE"],
            "estimacion_pct": [2.0, 98.0],
            "ic_95_inf": [1.5, 97.5],
            "ic_95_sup": [2.5, 98.5],
        }
    )
    escanos_prov = {"99": 50}
    factor = pd.DataFrame()
    out = simular_congreso(
        estimaciones, escanos_prov, factor, n_simulaciones=1500, seed=7
    )
    peq = out[out["partido"] == "PEQUE"]["escanos_media"].iloc[0]
    assert peq < 1.0


def test_reproducibilidad():
    estimaciones = pd.DataFrame(
        {
            "partido": ["A", "B"],
            "estimacion_pct": [55.0, 45.0],
            "ic_95_inf": [52.0, 42.0],
            "ic_95_sup": [58.0, 48.0],
        }
    )
    escanos_prov = {"01": 10, "02": 12}
    factor = pd.DataFrame({"01": [1.0, 1.0], "02": [1.0, 1.0]}, index=["A", "B"])
    r1 = simular_congreso(estimaciones, escanos_prov, factor, n_simulaciones=100, seed=999)
    r2 = simular_congreso(estimaciones, escanos_prov, factor, n_simulaciones=100, seed=999)
    pd.testing.assert_frame_equal(r1.reset_index(drop=True), r2.reset_index(drop=True))
