import json
from unittest.mock import MagicMock

import pandas as pd
import pytest
from sqlalchemy import text

from etl.realtime.base import BaseRealTimeScraper
from etl.realtime.macro_monitor import MacroMonitor, fetch_ine_serie, upsert_indicador


def test_fetch_ine_serie_mock(monkeypatch, sqlite_engine):
    sample = {
        "Data": [
            {"Fecha": "202301", "Dato": "101,2", "Secreto": ""},
            {"Fecha": "202302", "Dato": "102", "Secreto": "S"},
        ]
    }
    scraper = BaseRealTimeScraper("t", sqlite_engine)
    monkeypatch.setenv("ELECTSIM_DRY_RUN", "false")

    def fake_get(url, **kwargs):
        r = MagicMock()
        r.json = lambda: sample
        r.headers = {"Content-Type": "application/json"}
        r.content = json.dumps(sample).encode()
        r.status_code = 200
        r.raise_for_status = lambda: None
        return r

    monkeypatch.setattr(scraper, "get", fake_get)
    df = fetch_ine_serie("http://example.com", scraper)
    assert list(df.columns) == ["fecha", "valor"]
    assert len(df) == 1
    assert float(df.iloc[0]["valor"]) == pytest.approx(101.2)


def test_upsert_nuevo_registro(sqlite_engine):
    df = pd.DataFrame(
        [{"fecha": pd.Timestamp("2020-01-01"), "valor": 1.5}],
    )
    n, u = upsert_indicador(
        df, "ipc_general", "mensual", sqlite_engine, dry_run=False
    )
    assert n == 1 and u == 0


def test_upsert_duplicado_sin_cambio(sqlite_engine):
    df = pd.DataFrame([{"fecha": pd.Timestamp("2020-02-01"), "valor": 2.0}])
    upsert_indicador(df, "ipc_general", "mensual", sqlite_engine, dry_run=False)
    n, u = upsert_indicador(df, "ipc_general", "mensual", sqlite_engine, dry_run=False)
    assert n == 0 and u == 0


def test_upsert_duplicado_con_cambio(sqlite_engine):
    df = pd.DataFrame([{"fecha": pd.Timestamp("2020-03-01"), "valor": 3.0}])
    upsert_indicador(df, "ipc_general", "mensual", sqlite_engine, dry_run=False)
    df2 = pd.DataFrame([{"fecha": pd.Timestamp("2020-03-01"), "valor": 4.0}])
    n, u = upsert_indicador(df2, "ipc_general", "mensual", sqlite_engine, dry_run=False)
    assert n == 0 and u == 1


def test_dry_run_no_escribe(sqlite_engine):
    df = pd.DataFrame([{"fecha": pd.Timestamp("2020-04-01"), "valor": 9.0}])
    n, u = upsert_indicador(
        df, "ipc_general", "mensual", sqlite_engine, dry_run=True
    )
    assert n == 0 and u == 0
    with sqlite_engine.connect() as conn:
        c = conn.execute(
            text("SELECT COUNT(*) FROM indicadores_macroeconomicos")
        ).scalar()
    assert int(c) == 0


def test_macro_monitor_dry_run(monkeypatch, sqlite_engine):
    monkeypatch.setenv("ELECTSIM_DRY_RUN", "true")
    m = MacroMonitor("macro", sqlite_engine)
    stats = m.run()
    assert all(v.get("nuevos", 0) == 0 for v in stats.values())
