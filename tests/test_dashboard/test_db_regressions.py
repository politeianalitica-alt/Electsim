from __future__ import annotations

import dashboard.db as db


def test_macro_sql_map_incluye_tasa_paro():
    assert db._MACRO_SQL_MAP.get("tasa_paro") == "tasa_paro"


def test_cargar_snapshots_analogia_sin_cliente_no_usa_null_filter(monkeypatch):
    captured: dict = {}

    monkeypatch.setattr(db, "_table_exists", lambda _name: True)

    def _fake_q(sql, params=None, conn=None):
        captured["sql"] = sql
        captured["params"] = params
        return db.pd.DataFrame()

    monkeypatch.setattr(db, "_q", _fake_q)
    db.cargar_snapshots_analogia(cliente_id=None, limite=5)

    assert "IS NULL OR cliente_id" not in captured["sql"]
    assert captured["params"] == {"limite": 5}


def test_cargar_snapshots_analogia_con_cliente_filtra_por_cliente(monkeypatch):
    captured: dict = {}

    monkeypatch.setattr(db, "_table_exists", lambda _name: True)

    def _fake_q(sql, params=None, conn=None):
        captured["sql"] = sql
        captured["params"] = params
        return db.pd.DataFrame()

    monkeypatch.setattr(db, "_q", _fake_q)
    db.cargar_snapshots_analogia(cliente_id=7, limite=3)

    assert "WHERE cliente_id = :cliente_id" in captured["sql"]
    assert captured["params"] == {"cliente_id": 7, "limite": 3}
