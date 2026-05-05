"""Tests para el sistema de integraciones externas de ElectSim.

Todos los tests pasan sin variables de entorno configuradas (modo fallback/demo).
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


# ── Fixtures: asegurar que no hay variables de entorno de integraciones ────────

@pytest.fixture(autouse=True)
def clear_integration_env_vars(monkeypatch):
    """Elimina variables de entorno de integraciones para todos los tests."""
    vars_to_clear = [
        "GOOGLE_SERVICE_ACCOUNT_JSON",
        "GOOGLE_DRIVE_FOLDER_ID",
        "GITHUB_TOKEN",
        "GITHUB_ORG",
        "SLACK_BOT_TOKEN",
        "SLACK_WEBHOOK_URL",
        "NOTION_TOKEN",
    ]
    for var in vars_to_clear:
        monkeypatch.delenv(var, raising=False)


# ── Registry ───────────────────────────────────────────────────────────────────

def test_registry_has_four_integrations():
    """El registry debe contener exactamente 4 integraciones."""
    from integrations.registry import INTEGRATION_REGISTRY

    assert len(INTEGRATION_REGISTRY) == 4
    expected_ids = {"google_drive", "github", "slack", "notion"}
    assert set(INTEGRATION_REGISTRY.keys()) == expected_ids


def test_integration_info_model():
    """IntegrationInfo debe construirse correctamente con campos requeridos."""
    from integrations.registry import IntegrationInfo, IntegrationStatus

    info = IntegrationInfo(
        id="test",
        name="Test Integration",
        description="Una integracion de prueba",
        status=IntegrationStatus.not_configured,
        env_var_required="TEST_TOKEN",
    )
    assert info.id == "test"
    assert info.name == "Test Integration"
    assert info.documents_synced == 0
    assert info.error_message == ""
    assert info.last_sync is None


def test_get_all_statuses_returns_list():
    """get_all_integration_statuses debe devolver una lista de 4 elementos."""
    from integrations.registry import get_all_integration_statuses

    statuses = get_all_integration_statuses()
    assert isinstance(statuses, list)
    assert len(statuses) == 4


def test_get_integration_status_not_configured():
    """Sin variables de entorno, todas las integraciones deben ser not_configured."""
    from integrations.registry import get_integration_status, IntegrationStatus

    for integration_id in ("google_drive", "github", "slack", "notion"):
        info = get_integration_status(integration_id)
        assert info is not None
        status_val = info.status if isinstance(info.status, str) else info.status.value
        assert status_val == "not_configured", (
            f"{integration_id} deberia ser not_configured, fue {status_val}"
        )


def test_is_integration_available_false_when_no_env():
    """Sin variables de entorno, ninguna integracion debe estar disponible."""
    from integrations.registry import is_integration_available

    for integration_id in ("google_drive", "github", "slack", "notion"):
        assert is_integration_available(integration_id) is False, (
            f"{integration_id} no deberia estar disponible sin env vars"
        )


# ── Google Drive ───────────────────────────────────────────────────────────────

def test_drive_connector_not_configured():
    """is_configured() de Google Drive debe ser False sin env var."""
    from integrations.google_drive_connector import is_configured

    assert is_configured() is False


def test_drive_list_files_returns_demo_when_not_configured():
    """list_drive_files() debe devolver documentos demo sin credenciales."""
    from integrations.google_drive_connector import list_drive_files

    docs = list_drive_files()
    assert isinstance(docs, list)
    assert len(docs) > 0


def test_drive_demo_files_count():
    """Los archivos demo de Drive deben ser exactamente 5."""
    from integrations.google_drive_connector import _demo_drive_files

    demos = _demo_drive_files()
    assert len(demos) == 5


def test_drive_document_model():
    """DriveDocument debe construirse con los campos correctos."""
    from integrations.google_drive_connector import DriveDocument

    now = datetime.now(tz=timezone.utc)
    doc = DriveDocument(
        id="abc123",
        name="Informe Electoral.pdf",
        mime_type="application/pdf",
        size_bytes=102_400,
        created_at=now,
        modified_at=now,
    )
    assert doc.id == "abc123"
    assert doc.name == "Informe Electoral.pdf"
    assert doc.size_bytes == 102_400
    assert doc.text_content == ""
    assert doc.web_view_link == ""
    assert doc.source_folder == ""


# ── GitHub ─────────────────────────────────────────────────────────────────────

def test_github_not_configured():
    """is_configured() de GitHub debe ser False sin GITHUB_TOKEN."""
    from integrations.github_connector import is_configured

    assert is_configured() is False


def test_github_list_repos_returns_demo():
    """list_org_repos() debe devolver repos demo sin credenciales."""
    from integrations.github_connector import list_org_repos

    repos = list_org_repos()
    assert isinstance(repos, list)
    assert len(repos) > 0


def test_github_demo_repos_count():
    """Los repos demo de GitHub deben ser exactamente 4."""
    from integrations.github_connector import _demo_repos

    demos = _demo_repos()
    assert len(demos) == 4


def test_github_repo_model():
    """GitHubRepo debe construirse con los campos correctos."""
    from integrations.github_connector import GitHubRepo

    now = datetime.now(tz=timezone.utc)
    repo = GitHubRepo(
        id=9999,
        name="mi-repo",
        full_name="org/mi-repo",
        updated_at=now,
    )
    assert repo.id == 9999
    assert repo.full_name == "org/mi-repo"
    assert repo.stars == 0
    assert repo.open_issues == 0
    assert repo.topics == []
    assert repo.is_private is False


# ── Slack ──────────────────────────────────────────────────────────────────────

def test_slack_not_configured():
    """is_configured() de Slack debe ser False sin tokens."""
    from integrations.slack_connector import is_configured

    assert is_configured() is False


def test_slack_send_returns_false_when_not_configured():
    """Todas las funciones de envio deben devolver False sin credenciales."""
    from integrations.slack_connector import (
        send_alert,
        send_briefing_summary,
        send_simple_message,
    )

    assert send_alert("#canal", "Alerta test", "Cuerpo de prueba", "high") is False
    assert send_briefing_summary("#canal", "Resumen del dia", "2026-05-05") is False
    assert send_simple_message("#canal", "Mensaje de prueba") is False


# ── Enum values ────────────────────────────────────────────────────────────────

def test_integration_status_enum_values():
    """IntegrationStatus debe tener los 4 valores especificados."""
    from integrations.registry import IntegrationStatus

    assert IntegrationStatus.connected.value == "connected"
    assert IntegrationStatus.disconnected.value == "disconnected"
    assert IntegrationStatus.error.value == "error"
    assert IntegrationStatus.not_configured.value == "not_configured"
