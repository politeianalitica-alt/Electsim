"""Validaciones con Great Expectations sobre DataFrames de ingesta."""

import pandas as pd
import pytest
from great_expectations.dataset import PandasDataset


def validate_microdatos_cis(df: pd.DataFrame) -> bool:
    ge_df = PandasDataset(df)
    ge_df.expect_column_values_to_be_between("edad", min_value=18, max_value=110)
    ge_df.expect_column_values_to_be_between("escala_ideologica", min_value=1, max_value=10)
    ge_df.expect_column_values_to_be_between("valoracion_gobierno", min_value=0, max_value=10)
    ge_df.expect_column_values_to_be_between("peso_muestral", min_value=0.01, max_value=20.0)
    ge_df.expect_column_values_to_not_be_null("peso_muestral")
    ge_df.expect_column_values_to_not_be_null("encuesta_numero")
    ge_df.expect_column_values_to_be_in_set(
        "grupo_edad",
        ["18-24", "25-34", "35-44", "45-54", "55-64", "65+", "nan"],
    )
    ge_df.expect_column_values_to_be_in_set("sexo", ["H", "M", "O", None])
    result = ge_df.validate()
    return bool(result.success)


def validate_resultados_electorales(df: pd.DataFrame) -> bool:
    ge_df = PandasDataset(df)
    ge_df.expect_column_values_to_be_between("porcentaje", min_value=0, max_value=100)
    ge_df.expect_column_values_to_be_between("participacion", min_value=0, max_value=100)
    ge_df.expect_column_values_to_not_be_null("votos")
    ge_df.expect_column_values_to_be_between("votos", min_value=0, max_value=12_000_000)
    result = ge_df.validate()
    return bool(result.success)


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
