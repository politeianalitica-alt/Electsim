from __future__ import annotations

import datetime as dt

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
