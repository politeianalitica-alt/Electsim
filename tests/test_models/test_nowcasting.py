from datetime import datetime, timedelta

import pandas as pd

from models.estadisticos import nowcasting as nc


def test_peso_encuesta_decae_con_tiempo():
    ref = datetime(2026, 1, 15)
    reciente = ref - timedelta(days=5)
    vieja = ref - timedelta(days=30)
    p1 = nc.calcular_peso_encuesta(reciente, 1000, "CIS", fecha_referencia=ref)
    p2 = nc.calcular_peso_encuesta(vieja, 1000, "CIS", fecha_referencia=ref)
    assert p1 > p2


def test_agregacion_sin_encuestas():
    df = pd.DataFrame(columns=["fecha", "casa", "n", "partido", "porcentaje"])
    out = nc.agregar_encuestas(df)
    assert out.empty


def test_correccion_house_effects_gad3_pp():
    ref = datetime(2026, 6, 1)
    df = pd.DataFrame(
        {
            "fecha": [ref, ref],
            "casa": ["GAD3", "GAD3"],
            "n": [1000, 1000],
            "partido": ["PP", "PSOE"],
            "porcentaje": [30.0, 28.0],
        }
    )
    out = nc.agregar_encuestas(df, fecha_ref=ref)
    pp = out[out["partido"] == "PP"]["estimacion_pct"].iloc[0]
    # Sesgo PP +0.8 se resta antes de agregar → PP baja respecto a 30
    assert pp < 30.0
