"""Tests unitarios para calidad_datos (sin BD real — usa mocks)."""

import pytest
from unittest.mock import MagicMock, patch

import pandas as pd

from validation.calidad_datos import (
    Check,
    _check_encuestas,
    _check_macroeconomicos,
    _check_perfiles_votante,
    _check_resultados_electorales,
    run_calidad_datos,
)


def _mock_engine_with_data(data_by_query: dict):
    """Crea un engine mock que devuelve DataFrames según el texto de la query."""
    engine = MagicMock()
    conn = MagicMock().__enter__.return_value

    def mock_execute(query, params=None):
        q_str = str(query)
        for key, df in data_by_query.items():
            if key in q_str:
                result = MagicMock()
                result.scalar.return_value = True
                return result
        return MagicMock()

    engine.connect.return_value.__enter__ = lambda s: conn
    engine.connect.return_value.__exit__ = MagicMock(return_value=False)
    return engine


class TestCheckResultadosElectorales:
    @patch("validation.calidad_datos._tabla_existe", return_value=False)
    def test_tabla_no_existe(self, mock_existe):
        engine = MagicMock()
        checks = _check_resultados_electorales(engine)
        assert len(checks) == 1
        assert not checks[0].ok
        assert "tabla_existe" in checks[0].nombre

    @patch("validation.calidad_datos._tabla_existe", return_value=True)
    @patch("validation.calidad_datos._read")
    def test_datos_validos(self, mock_read, mock_existe):
        mock_read.return_value = pd.DataFrame({
            "votos_candidatura_pct": [35.2, 28.5, 15.1, 10.3],
            "escanos": [137, 122, 33, 23],
        })
        engine = MagicMock()
        checks = _check_resultados_electorales(engine)
        ok_checks = [c for c in checks if c.ok]
        assert len(ok_checks) == len(checks)

    @patch("validation.calidad_datos._tabla_existe", return_value=True)
    @patch("validation.calidad_datos._read")
    def test_votos_fuera_rango(self, mock_read, mock_existe):
        mock_read.return_value = pd.DataFrame({
            "votos_candidatura_pct": [35.2, 150.0, -5.0],  # Valores inválidos
            "escanos": [137, 122, -1],
        })
        engine = MagicMock()
        checks = _check_resultados_electorales(engine)
        fail_checks = [c for c in checks if not c.ok]
        assert len(fail_checks) > 0  # Hay fallos


class TestCheckPerfilesVotante:
    @patch("validation.calidad_datos._tabla_existe", return_value=True)
    @patch("validation.calidad_datos._read")
    def test_pocos_clusters(self, mock_read, mock_existe):
        mock_read.return_value = pd.DataFrame({
            "cluster_id": [0, 1],
            "peso": [0.5, 0.5],
            "n_respondentes": [500, 500],
        })
        engine = MagicMock()
        checks = _check_perfiles_votante(engine)
        min_check = next((c for c in checks if c.nombre == "min_3_clusters"), None)
        assert min_check is not None
        assert not min_check.ok  # Solo 2 clusters

    @patch("validation.calidad_datos._tabla_existe", return_value=True)
    @patch("validation.calidad_datos._read")
    def test_pesos_incorrectos(self, mock_read, mock_existe):
        mock_read.return_value = pd.DataFrame({
            "cluster_id": [0, 1, 2, 3],
            "peso": [0.3, 0.3, 0.3, 0.3],  # Suman 1.2
            "n_respondentes": [300, 300, 300, 300],
        })
        engine = MagicMock()
        checks = _check_perfiles_votante(engine)
        peso_check = next((c for c in checks if c.nombre == "pesos_suman_1"), None)
        assert peso_check is not None
        assert not peso_check.ok


class TestRunCalidadDatos:
    @patch("validation.calidad_datos._tabla_existe", return_value=False)
    @patch("validation.calidad_datos._guardar_reporte")
    def test_tablas_no_existen(self, mock_guardar, mock_existe):
        engine = MagicMock()
        reporte = run_calidad_datos(engine, guardar_bd=False)
        assert reporte.n_fail > 0
        assert reporte.semaforo in {"verde", "amarillo", "rojo"}
        assert 0 <= reporte.pct_completitud_global <= 100

    def test_reporte_tiene_resumen(self):
        engine = MagicMock()
        with patch("validation.calidad_datos._tabla_existe", return_value=False), \
             patch("validation.calidad_datos._guardar_reporte"):
            reporte = run_calidad_datos(engine, guardar_bd=False)
        assert isinstance(reporte.resumen, str)
        assert len(reporte.resumen) > 0
