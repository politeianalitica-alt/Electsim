from unittest.mock import MagicMock, patch

import pandas as pd

from models.estadisticos import pedersen as ped


def _engine_connect_mock():
    engine = MagicMock()
    cm = MagicMock()
    cm.__enter__.return_value = MagicMock()
    cm.__exit__.return_value = None
    engine.connect.return_value = cm
    return engine


def test_interpretar_pedersen_bordes():
    assert "BAJA" in ped.interpretar_pedersen(5.0)
    assert "MODERADA" in ped.interpretar_pedersen(15.0)
    assert "ALTA" in ped.interpretar_pedersen(25.0)
    assert "MUY ALTA" in ped.interpretar_pedersen(35.0)


def test_pedersen_manual_tres_elecciones():
    # Tres fechas; mismos dos partidos; transición 50/50 -> 40/60 -> 30/70
    df = pd.DataFrame(
        {
            "fecha": pd.to_datetime(
                ["2000-01-01", "2000-01-01", "2004-01-01", "2004-01-01", "2008-01-01", "2008-01-01"]
            ),
            "siglas": ["A", "B", "A", "B", "A", "B"],
            "pct_voto": [50.0, 50.0, 40.0, 60.0, 30.0, 70.0],
        }
    )
    engine = _engine_connect_mock()

    with patch("models.estadisticos.pedersen.pd.read_sql", return_value=df):
        out = ped.calcular_pedersen_serie(engine)

    assert len(out) == 2
    # Primer par: |50-40|+|50-60| = 20 -> /2 = 10
    assert abs(float(out.iloc[0]["volatilidad_total"]) - 10.0) < 1e-6
    # Segundo par: |40-30|+|60-70| = 20 -> /2 = 10
    assert abs(float(out.iloc[1]["volatilidad_total"]) - 10.0) < 1e-6
