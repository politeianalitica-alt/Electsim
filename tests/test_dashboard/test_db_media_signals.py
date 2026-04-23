from __future__ import annotations

import datetime as dt

import numpy as np
import pandas as pd

import dashboard.db as db


def test_cargar_tracking_palabras_clave_detecta_momentum(monkeypatch):
    hoy = dt.date.today()
    rows = pd.DataFrame(
        [
            {
                "fecha": hoy,
                "fuente": "elpais",
                "sentimiento": -0.4,
                "texto": "Crisis de vivienda tensiona al Gobierno",
            },
            {
                "fecha": hoy,
                "fuente": "elmundo",
                "sentimiento": -0.2,
                "texto": "Vivienda y alquiler en crisis politica",
            },
            {
                "fecha": hoy - dt.timedelta(days=1),
                "fuente": "abc",
                "sentimiento": -0.1,
                "texto": "La vivienda centra el debate",
            },
            {
                "fecha": hoy - dt.timedelta(days=8),
                "fuente": "elpais",
                "sentimiento": 0.1,
                "texto": "Economia internacional y turismo",
            },
        ]
    )

    monkeypatch.setattr(db, "_table_exists", lambda *_args, **_kwargs: True)

    def _fake_q(sql, params=None, conn=None):
        if "FROM article" in sql:
            return rows
        return pd.DataFrame()

    monkeypatch.setattr(db, "_q", _fake_q)

    out = db.cargar_tracking_palabras_clave(dias=14, ventana_reciente=3, min_menciones=2, top_n=20)
    assert not out.empty
    assert "palabra" in out.columns
    assert "momentum_ratio" in out.columns
    assert "vivienda" in set(out["palabra"].tolist())


def test_extract_keywords_filtra_stopwords():
    toks = db._extract_keywords("El gobierno y la politica para todos")
    assert "gobierno" not in toks
    assert "para" not in toks


def test_cargar_alertas_prensa_dinamicas_tolera_nan_en_campos_enteros(monkeypatch):
    db.cargar_alertas_prensa_dinamicas.clear()

    monkeypatch.setattr(
        db,
        "cargar_momentum_sentimiento_partidos",
        lambda **_kwargs: pd.DataFrame(),
    )
    monkeypatch.setattr(
        db,
        "cargar_temas_trending",
        lambda **_kwargs: pd.DataFrame(),
    )
    monkeypatch.setattr(
        db,
        "cargar_source_health",
        lambda: pd.DataFrame(
            [
                {
                    "source_id": "elpais",
                    "status": "degraded",
                    "errors_count": np.nan,
                    "freshness_lag_s": np.nan,
                }
            ]
        ),
    )
    monkeypatch.setattr(
        db,
        "cargar_scraper_incidents",
        lambda **_kwargs: pd.DataFrame(
            [
                {
                    "source_id": "elmundo",
                    "error_type": "timeout",
                    "severity": "major",
                    "occurrence_count": np.nan,
                    "last_seen": "2026-04-23 17:00:00",
                }
            ]
        ),
    )

    out = db.cargar_alertas_prensa_dinamicas(dias=14, ventana_reciente=3)
    assert not out.empty
    assert "detalle" in out.columns
    detalles = " ".join(out["detalle"].astype(str).tolist())
    assert "lag=0s" in detalles
