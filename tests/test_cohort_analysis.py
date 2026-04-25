"""Tests para dashboard/models/cohort_analysis.py."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
import pytest

from dashboard.models.cohort_analysis import (
    CohortAnalyzer,
    _weighted_freq,
    _goodman_kruskal_tau,
    calibrate_llm_output,
    auto_segment,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _make_df(n: int = 500, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "sexo":                rng.choice([1, 2], n),
        "edad":                rng.integers(18, 80, n),
        "estudios":            rng.choice([1, 2, 3, 4, 5, 6, 7], n),
        "ccaa":                rng.choice(range(1, 20), n),
        "escideol":            rng.choice([*range(1, 11), 98, 99], n),
        "intencion_voto_grupo": rng.choice(["PP", "PSOE", "VOX", "SUMAR", "NS/NC"], n),
        "recuerdo_voto":       rng.choice(["PP", "PSOE", "VOX", "SUMAR", "Abs"], n),
        "clase_subjetiva":     rng.choice([1, 2, 3, 4], n),
        "peso":                rng.uniform(0.5, 1.5, n),
    })


# ── _weighted_freq ────────────────────────────────────────────────────────────

def test_weighted_freq_suma_100():
    s = pd.Series(["A", "A", "B", "C"])
    w = pd.Series([1.0, 1.0, 1.0, 1.0])
    freq = _weighted_freq(s, w)
    assert abs(freq.sum() - 100.0) < 0.01

def test_weighted_freq_sin_pesos():
    s = pd.Series(["A", "A", "B"])
    freq = _weighted_freq(s)
    assert abs(freq["A"] - 66.67) < 0.1

def test_weighted_freq_serie_vacia():
    freq = _weighted_freq(pd.Series(dtype=object))
    assert freq.empty


# ── _goodman_kruskal_tau ──────────────────────────────────────────────────────

def test_tau_perfecto():
    tabla = np.array([[10, 0], [0, 10]], dtype=float)
    tau = _goodman_kruskal_tau(tabla)
    assert abs(tau - 1.0) < 1e-6

def test_tau_independencia():
    tabla = np.array([[5, 5], [5, 5]], dtype=float)
    tau = _goodman_kruskal_tau(tabla)
    assert abs(tau) < 1e-6

def test_tau_tabla_vacia():
    tau = _goodman_kruskal_tau(np.zeros((2, 2)))
    assert tau == 0.0


# ── CohortAnalyzer ────────────────────────────────────────────────────────────

def test_analyzer_vote_distribution_suma_100():
    df = _make_df()
    a = CohortAnalyzer(df)
    voto = a.vote_distribution()
    assert abs(sum(voto.values()) - 100.0) < 0.1

def test_analyzer_filter_reduce_n():
    df = _make_df()
    a  = CohortAnalyzer(df)
    af = a.filter({"sexo": 1})
    assert af.key_stats()["n_respondentes"] < len(df)

def test_analyzer_key_stats_campos():
    df = _make_df()
    stats = CohortAnalyzer(df).key_stats()
    for key in ["n_respondentes", "escideol_media", "edad_media", "pct_mujeres"]:
        assert key in stats

def test_analyzer_ideology_distribution_keys_1_a_10():
    df = _make_df()
    ideo = CohortAnalyzer(df).ideology_distribution()
    for k in ideo.keys():
        assert 1 <= int(k) <= 10, f"Clave ideo fuera de rango: {k}"

def test_analyzer_filter_rango_edad():
    df = _make_df()
    a  = CohortAnalyzer(df).filter({"edad": (25, 35)})
    stats = a.key_stats()
    assert stats["n_respondentes"] > 0


# ── calibrate_llm_output ─────────────────────────────────────────────────────

def test_calibrate_alpha_0_puro_llm():
    llm = {"PP": 60.0, "PSOE": 40.0}
    emp = {"PP": 30.0, "PSOE": 70.0}
    result = calibrate_llm_output(llm, emp, alpha=0.0)
    assert abs(result["PP"] - 60.0) < 1.0

def test_calibrate_alpha_1_puro_empirico():
    llm = {"PP": 60.0, "PSOE": 40.0}
    emp = {"PP": 30.0, "PSOE": 70.0}
    result = calibrate_llm_output(llm, emp, alpha=1.0)
    assert abs(result["PP"] - 30.0) < 1.0

def test_calibrate_suma_100():
    llm = {"PP": 50.0, "PSOE": 30.0, "VOX": 20.0}
    emp = {"PP": 33.0, "PSOE": 28.0, "VOX": 12.0, "SUMAR": 10.0}
    result = calibrate_llm_output(llm, emp, alpha=0.5)
    assert abs(sum(result.values()) - 100.0) < 0.5


# ── auto_segment ──────────────────────────────────────────────────────────────

def test_auto_segment_devuelve_perfiles():
    df = _make_df(n=1000)
    perfiles = auto_segment(df, n_perfiles=4)
    assert len(perfiles) >= 1

def test_auto_segment_pesos_positivos():
    df = _make_df(n=1000)
    perfiles = auto_segment(df, n_perfiles=4)
    for p in perfiles:
        assert p.get("peso", 0) >= 0
