"""Tests para las métricas de validación."""

import numpy as np
import pytest

from validation.metricas import (
    brier_score,
    calcular_metricas_completas,
    comparar_modelos,
    cobertura_intervalo,
    crps_gaussiano,
    curva_calibracion,
    mae,
    rmse,
)


class TestBrierScore:
    def test_perfecto(self):
        """Predicción perfecta → BS = 0."""
        p = np.array([[0.6, 0.3, 0.1]])
        o = np.array([[0.6, 0.3, 0.1]])
        assert brier_score(p, o) == pytest.approx(0.0, abs=1e-9)

    def test_peor_caso(self):
        """Predicción opuesta → BS alto."""
        p = np.array([[1.0, 0.0], [0.0, 1.0]])
        o = np.array([[0.0, 1.0], [1.0, 0.0]])
        assert brier_score(p, o) > 0.5

    def test_normaliza_vectores(self):
        """Normaliza automáticamente si no suman 1."""
        p = np.array([[3.0, 1.0]])  # suman 4
        o = np.array([[0.75, 0.25]])
        # Después de normalizar, predicción = real → BS ≈ 0
        assert brier_score(p, o) == pytest.approx(0.0, abs=1e-6)

    def test_multiples_elecciones(self):
        p = np.array([[0.5, 0.3, 0.2], [0.4, 0.4, 0.2]])
        o = np.array([[0.5, 0.3, 0.2], [0.45, 0.35, 0.2]])
        assert 0 <= brier_score(p, o) <= 2


class TestRMSE:
    def test_sin_error(self):
        assert rmse([1, 2, 3], [1, 2, 3]) == pytest.approx(0.0)

    def test_conocido(self):
        assert rmse([0, 0], [3, 4]) == pytest.approx(np.sqrt(12.5))


class TestMAE:
    def test_sin_error(self):
        assert mae([1, 2, 3], [1, 2, 3]) == pytest.approx(0.0)

    def test_conocido(self):
        assert mae([0, 0, 0], [1, 2, 3]) == pytest.approx(2.0)


class TestCRPS:
    def test_prediccion_exacta(self):
        """CRPS mínimo cuando la predicción exacta coincide con observación."""
        score = crps_gaussiano([5.0], [0.01], [5.0])  # sigma muy pequeño
        assert score < 0.02

    def test_sigma_cero_approx(self):
        """Con sigma muy grande → CRPS alto."""
        score_grande = crps_gaussiano([5.0], [10.0], [5.0])
        score_peq = crps_gaussiano([5.0], [0.1], [5.0])
        assert score_grande > score_peq


class TestCobertura:
    def test_todos_dentro(self):
        lo = [0, 1, 2]
        hi = [5, 6, 7]
        real = [2, 3, 4]
        assert cobertura_intervalo(lo, hi, real) == pytest.approx(1.0)

    def test_ninguno_dentro(self):
        lo = [10, 10]
        hi = [20, 20]
        real = [1, 2]
        assert cobertura_intervalo(lo, hi, real) == pytest.approx(0.0)


class TestCurvasCalibracion:
    def test_devuelve_bins(self):
        p = np.linspace(0, 1, 100)
        o = np.linspace(0, 1, 100)
        bins = curva_calibracion(p, o)
        assert len(bins) > 0
        for b in bins:
            assert "bin_centro" in b
            assert "fraccion_pred" in b
            assert "fraccion_real" in b
            assert "n" in b

    def test_bins_no_vacios(self):
        p = np.array([0.1, 0.1, 0.9, 0.9])
        o = np.array([0.1, 0.1, 0.9, 0.9])
        bins = curva_calibracion(p, o, n_bins=5)
        assert all(b["n"] > 0 for b in bins)


class TestCalcularMetricasCompletas:
    def test_devuelve_resultado(self):
        p = np.array([[0.6, 0.3, 0.1], [0.4, 0.4, 0.2]])
        r = np.array([[0.55, 0.32, 0.13], [0.42, 0.38, 0.2]])
        resultado = calcular_metricas_completas(p, r)
        assert resultado.brier_score >= 0
        assert resultado.rmse >= 0
        assert resultado.mae >= 0
        assert resultado.crps >= 0
        assert resultado.n_obs == 2

    def test_con_intervalos(self):
        p = np.array([[0.5, 0.5]])
        r = np.array([[0.5, 0.5]])
        inf = np.array([[0.4, 0.4]])
        sup = np.array([[0.6, 0.6]])
        resultado = calcular_metricas_completas(p, r, inferior_95=inf, superior_95=sup)
        assert resultado.cobertura_95ci == pytest.approx(1.0)


class TestCompararModelos:
    def test_ordena_por_brier(self):
        from validation.metricas import ResultadoMetricas
        m1 = ResultadoMetricas(brier_score=0.05, rmse=0.03, mae=0.02, crps=0.04,
                               cobertura_95ci=0.95, calibracion=[], n_obs=10)
        m2 = ResultadoMetricas(brier_score=0.12, rmse=0.05, mae=0.04, crps=0.08,
                               cobertura_95ci=0.90, calibracion=[], n_obs=10)
        tabla = comparar_modelos({"modelo_b": m2, "modelo_a": m1})
        assert tabla[0]["modelo"] == "modelo_a"
        assert tabla[1]["modelo"] == "modelo_b"
