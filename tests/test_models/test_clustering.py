import numpy as np
import pandas as pd
from unittest.mock import MagicMock, patch

from models.estadisticos.clustering_votantes import (
    ENCODING_MAPS,
    _generar_descripcion,
    encodificar_variables,
    generar_perfiles,
)


def test_encodificar_variables():
    df = pd.DataFrame({"estudios": ["universitarios"], "tamano_habitat": ["<2000"]})
    out = encodificar_variables(df)
    assert int(out["estudios_num"].iloc[0]) == ENCODING_MAPS["estudios_num"]["universitarios"]
    assert int(out["tamano_habitat_num"].iloc[0]) == 1


def test_descripcion_no_vacia():
    c = pd.Series({"escala_ideologica": 7.5, "edad": 52.0, "valoracion_gobierno": 3.0, "tamano_habitat_num": 4.0})
    d = {"PP": 0.6, "VOX": 0.2}
    s = _generar_descripcion(c, d)
    assert len(s) >= 50


def test_generar_perfiles_mock():
    rng = np.random.default_rng(42)
    n = 200
    df = pd.DataFrame(
        {
            "id": range(n),
            "escala_ideologica": rng.uniform(1, 10, n),
            "edad": rng.integers(18, 80, n),
            "valoracion_gobierno": rng.uniform(0, 10, n),
            "intencion_voto": rng.choice(["PP", "PSOE"], n),
            "peso_muestral": np.ones(n),
        }
    )
    engine = MagicMock()
    conn_cm = MagicMock()
    conn_cm.__enter__.return_value = MagicMock()
    conn_cm.__exit__.return_value = None
    engine.connect.return_value = conn_cm
    begin_cm = MagicMock()
    begin_cm.__enter__.return_value = MagicMock()
    begin_cm.__exit__.return_value = None
    engine.begin.return_value = begin_cm

    with patch("models.estadisticos.clustering_votantes.pd.read_sql", return_value=df):
        out = generar_perfiles(engine, n_clusters=4)

    assert not out.empty
    assert "peso_demografico_pct" in out.columns
    assert abs(float(out["peso_demografico_pct"].sum()) - 100.0) < 1.0
