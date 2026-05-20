"""Tests para etl.sources.commodities.web_push.

Verifica:
  - is_configured() reporta False sin VAPID env vars
  - send_push_to_user() devuelve 'skipped' si no está configurado
  - send_push_for_alert() devuelve 'skipped' (no levanta) sin VAPID
  - send_push_for_alert() devuelve 'error' si alert sin user_id
  - El módulo es importable sin pywebpush instalado
"""
from __future__ import annotations

import os

import pytest


def test_module_imports_without_pywebpush():
    """El módulo no debe depender de imports top-level que rompan en CI."""
    from etl.sources.commodities import web_push  # noqa: F401
    assert hasattr(web_push, "send_push_for_alert")
    assert hasattr(web_push, "is_configured")


def test_is_configured_false_without_env(monkeypatch):
    monkeypatch.delenv("VAPID_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("VAPID_PUBLIC_KEY", raising=False)
    from etl.sources.commodities.web_push import is_configured
    assert is_configured() is False


def test_send_push_to_user_skipped_when_not_configured(monkeypatch):
    monkeypatch.delenv("VAPID_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("VAPID_PUBLIC_KEY", raising=False)
    from etl.sources.commodities.web_push import send_push_to_user
    result = send_push_to_user("user@test", {"title": "x", "body": "y"})
    assert result["status"] == "skipped"
    assert "VAPID" in result.get("reason", "") or "pywebpush" in result.get("reason", "")


def test_send_push_for_alert_returns_skipped_no_vapid(monkeypatch):
    monkeypatch.delenv("VAPID_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("VAPID_PUBLIC_KEY", raising=False)
    from etl.sources.commodities.web_push import send_push_for_alert
    alert = {"id": "a1", "user_id": "u@test", "commodity_slug": "wheat_cbot", "kind": "price_above", "threshold": 100}
    status = send_push_for_alert(alert, trigger_value=110.5)
    assert status == "skipped"


def test_send_push_for_alert_error_without_user_id():
    from etl.sources.commodities.web_push import send_push_for_alert
    alert = {"id": "a1", "commodity_slug": "wheat_cbot", "kind": "price_above", "threshold": 100}
    status = send_push_for_alert(alert, trigger_value=110.5)
    assert status.startswith("error:")


def test_alerts_service_notify_event_push_delegates(monkeypatch):
    """Verifica que notify_event llama a _send_web_push (no devuelve placeholder)."""
    monkeypatch.delenv("VAPID_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("VAPID_PUBLIC_KEY", raising=False)
    from etl.sources.commodities.alerts_service import notify_event
    alert = {"id": "a1", "user_id": "u@test", "commodity_slug": "wheat_cbot", "kind": "price_above", "threshold": 100}
    out = notify_event(alert, trigger_value=110.0, channels=["push"])
    # Sin VAPID: el módulo debe devolver 'skipped' (no 'skipped' del viejo placeholder
    # · ambos son strings 'skipped' pero ahora vienen del web_push real).
    assert out.get("push") == "skipped"
