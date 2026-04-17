from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import text

from etl.realtime.alertas import (
    enviar_slack,
    enviar_telegram,
    formatear_alerta_texto,
    procesar_alertas_pendientes,
)


def test_formatear_critical():
    t = formatear_alerta_texto(
        {
            "severidad": "CRITICAL",
            "titulo": "X",
            "descripcion": "Y",
            "created_at": None,
        }
    )
    assert "🚨" in t


def test_formatear_warning():
    t = formatear_alerta_texto(
        {
            "severidad": "WARNING",
            "titulo": "W",
            "descripcion": "Z",
            "created_at": None,
        }
    )
    assert "⚠️" in t


def test_enviar_slack_mock():
    alerta = {
        "severidad": "WARNING",
        "titulo": "t",
        "descripcion": "d",
        "datos_json": None,
        "created_at": None,
    }
    with patch("etl.realtime.alertas.requests.post") as p:
        p.return_value = MagicMock(ok=True)
        assert enviar_slack(alerta, "https://hooks.slack.com/x") is True


def test_enviar_telegram_mock():
    alerta = {
        "severidad": "CRITICAL",
        "titulo": "t",
        "descripcion": "d",
        "created_at": None,
    }
    with patch("etl.realtime.alertas.requests.post") as p:
        p.return_value = MagicMock(ok=True)
        assert enviar_telegram(alerta, "TOKEN", "123") is True


def test_procesar_sin_canales(monkeypatch, sqlite_engine):
    monkeypatch.delenv("ELECTSIM_SMTP_HOST", raising=False)
    monkeypatch.delenv("ELECTSIM_SLACK_WEBHOOK", raising=False)
    monkeypatch.delenv("ELECTSIM_TELEGRAM_TOKEN", raising=False)
    monkeypatch.delenv("ELECTSIM_TELEGRAM_CHAT_ID", raising=False)
    with sqlite_engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO alertas_sistema (tipo, severidad, titulo, descripcion, leida)
                VALUES ('error_scraper', 'INFO', 'Test', 'Msg', 0)
                """
            )
        )
    n = procesar_alertas_pendientes(sqlite_engine)
    assert n > 0
    with sqlite_engine.connect() as conn:
        pend = conn.execute(
            text("SELECT COUNT(*) FROM alertas_sistema WHERE leida = 0")
        ).scalar()
    assert int(pend) == 0
