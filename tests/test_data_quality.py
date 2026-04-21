"""Validaciones ligeras sobre DataFrames de ingesta sin Great Expectations."""

import pandas as pd
import pytest


def validate_microdatos_cis(df: pd.DataFrame) -> bool:
    if not df["edad"].between(18, 110).all():
        return False
    if not df["escala_ideologica"].between(1, 10).all():
        return False
    if not df["valoracion_gobierno"].between(0, 10).all():
        return False
    if not df["peso_muestral"].between(0.01, 20.0).all():
        return False
    if df["peso_muestral"].isnull().any():
        return False
    if df["encuesta_numero"].isnull().any():
        return False
    if not df["grupo_edad"].isin(
        ["18-24", "25-34", "35-44", "45-54", "55-64", "65+", "nan"]
    ).all():
        return False
    if not df["sexo"].isin(["H", "M", "O", None]).all():
        return False
    return True


def validate_resultados_electorales(df: pd.DataFrame) -> bool:
    if not df["porcentaje"].between(0, 100).all():
        return False
    if not df["participacion"].between(0, 100).all():
        return False
    if df["votos"].isnull().any():
        return False
    if not df["votos"].between(0, 12_000_000).all():
        return False
    return True


def test_validate_microdatos_cis_synthetic():
    df = pd.DataFrame(
        {
            "edad": [25, 45],
            "escala_ideologica": [5.0, 6.0],
            "valoracion_gobierno": [5.0, 7.0],
            "peso_muestral": [1.0, 1.2],
            "encuesta_numero": ["3437", "3437"],
            "grupo_edad": ["25-34", "45-54"],
            "sexo": ["H", "M"],
        }
    )
    assert validate_microdatos_cis(df) is True


def test_validate_resultados_electorales_synthetic():
    df = pd.DataFrame(
        {
            "porcentaje": [25.5, 30.0],
            "participacion": [70.0, 68.0],
            "votos": [100000, 120000],
        }
    )
    assert validate_resultados_electorales(df) is True


@pytest.mark.skip(reason="Requiere PostgreSQL con esquema aplicado")
def test_db_connection_placeholder():
    pass
