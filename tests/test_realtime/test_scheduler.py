from unittest.mock import patch

from pipelines.realtime_scheduler import flow_alertas, flow_macro_monitor, flow_prensa_encuestas


def test_flow_prensa_dry_run(monkeypatch, sqlite_engine):
    monkeypatch.setenv("ELECTSIM_DRY_RUN", "true")
    with patch("pipelines.realtime_scheduler.get_engine", return_value=sqlite_engine):
        flow_prensa_encuestas()
    from sqlalchemy import text

    with sqlite_engine.connect() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM encuestas_tracking")).scalar()
    assert int(n) == 0


def test_flow_macro_dry_run(monkeypatch, sqlite_engine):
    monkeypatch.setenv("ELECTSIM_DRY_RUN", "true")
    with patch("pipelines.realtime_scheduler.get_engine", return_value=sqlite_engine):
        flow_macro_monitor()


def test_flow_alertas_sin_pendientes(monkeypatch, sqlite_engine):
    monkeypatch.setenv("ELECTSIM_DRY_RUN", "true")
    with patch("pipelines.realtime_scheduler.get_engine", return_value=sqlite_engine):
        flow_alertas()
