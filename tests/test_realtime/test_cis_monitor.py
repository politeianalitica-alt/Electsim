from unittest.mock import patch

from sqlalchemy import text

from etl.realtime.cis_monitor import CISMonitor, ya_procesado


def test_dry_run_no_hace_request(monkeypatch, sqlite_engine):
    monkeypatch.setenv("ELECTSIM_DRY_RUN", "true")
    called = []

    real_get = __import__("requests").Session.get

    def _track(self, *a, **k):
        called.append(a[0] if a else "")
        return real_get(self, *a, **k)

    with patch("requests.Session.get", _track):
        m = CISMonitor("cis", sqlite_engine)
        m.run()
    assert called == []


def test_ya_procesado_true(sqlite_engine):
    with sqlite_engine.begin() as conn:
        conn.execute(text("INSERT INTO fuentes_encuesta (nombre) VALUES ('CIS')"))
        conn.execute(
            text(
                """
                INSERT INTO encuestas (fuente_id, numero_estudio, titulo, tipo_encuesta)
                VALUES (1, '3890', 'Barómetro 3890', 'barometro')
                """
            )
        )
    assert ya_procesado("3890", sqlite_engine) is True
    assert ya_procesado("9999", sqlite_engine) is False
