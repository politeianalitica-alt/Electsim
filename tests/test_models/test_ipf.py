import numpy as np
import pandas as pd

from models.estadisticos import ipf as ipf_mod


def test_ipf_converge_ccaa():
    rng = np.random.default_rng(0)
    ccaa = rng.choice(["01", "02", "03"], size=100)
    df = pd.DataFrame({"ccaa_codigo_ine": ccaa, "peso_muestral": 1.0})
    marginals = pd.Series({"01": 0.5, "02": 0.3, "03": 0.2})
    out = ipf_mod.ipf_calibration(df, {"ccaa_codigo_ine": marginals}, max_iter=500, tolerance=1e-8)
    w = out.groupby("ccaa_codigo_ine")["peso_ipf"].sum()
    w = w / w.sum()
    for c in marginals.index:
        assert abs(w[c] - marginals[c]) < 0.001


def test_pesos_normalizados_suma_n():
    df = pd.DataFrame({"x": [1, 2, 3], "peso_muestral": 1.0})
    out = ipf_mod.ipf_calibration(df, {}, weight_col="peso_muestral")
    assert abs(out["peso_ipf"].sum() - len(df)) < 1e-6


def test_sin_marginals_sin_cambio_relevante():
    df = pd.DataFrame({"a": [1, 2], "peso_muestral": 2.0})
    out = ipf_mod.ipf_calibration(df, {}, weight_col="peso_muestral")
    assert (out["peso_ipf"] == df["peso_muestral"]).all()
