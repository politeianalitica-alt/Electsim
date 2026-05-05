"""Tests para workspace_intelligence.workspace_service."""
from __future__ import annotations

import pytest
from datetime import datetime


# ── Importación del módulo bajo prueba ────────────────────────────────────────
from workspace_intelligence.workspace_service import (
    WorkspaceContext,
    list_workspaces,
    get_workspace_context,
    get_workspace_kpis,
    get_activity_feed,
    create_workspace_issue_from_alert,
    _demo_activity_feed,
    _WORKSPACES,
)

_WS_ID = "ws_espana_2026"
_TENANT = "demo"


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_list_workspaces_returns_list():
    result = list_workspaces(_TENANT)
    assert isinstance(result, list)


def test_get_workspace_context_returns_object():
    ctx = get_workspace_context(_WS_ID, _TENANT)
    assert isinstance(ctx, WorkspaceContext)


def test_workspace_context_mode():
    ctx = get_workspace_context(_WS_ID, _TENANT)
    assert isinstance(ctx.mode, str)
    assert len(ctx.mode) > 0


def test_workspace_kpis_structure():
    kpis = get_workspace_kpis(_WS_ID, _TENANT)
    assert isinstance(kpis, dict)


def test_workspace_kpis_has_required_keys():
    kpis = get_workspace_kpis(_WS_ID, _TENANT)
    required_keys = {
        "issues_open",
        "issues_this_week",
        "actions_pending",
        "actions_completed_this_week",
        "decisions_logged",
        "team_active",
    }
    assert required_keys.issubset(kpis.keys())


def test_activity_feed_returns_list():
    feed = get_activity_feed(_WS_ID, _TENANT)
    assert isinstance(feed, list)


def test_activity_feed_items_have_required_keys():
    feed = get_activity_feed(_WS_ID, _TENANT)
    if feed:
        item = feed[0]
        assert "timestamp" in item
        assert "actor" in item
        assert "action_type" in item
        assert "description" in item


def test_create_workspace_issue_from_alert():
    issue_id = create_workspace_issue_from_alert(
        workspace_id=_WS_ID,
        tenant_id=_TENANT,
        alert_title="Alerta de prueba",
        alert_body="Cuerpo de la alerta de prueba.",
        level="critical",
    )
    assert isinstance(issue_id, str)
    assert len(issue_id) > 0


def test_list_workspaces_for_demo_tenant():
    result = list_workspaces(_TENANT)
    assert len(result) >= 1
    ids = [ws["id"] for ws in result]
    assert _WS_ID in ids


def test_workspace_context_top_issues():
    ctx = get_workspace_context(_WS_ID, _TENANT)
    assert isinstance(ctx.top_issues, list)
    assert len(ctx.top_issues) >= 1


def test_workspace_context_next_best_actions():
    ctx = get_workspace_context(_WS_ID, _TENANT)
    assert isinstance(ctx.next_best_actions, list)
    assert len(ctx.next_best_actions) >= 1


def test_workspace_kpis_all_ints():
    kpis = get_workspace_kpis(_WS_ID, _TENANT)
    for key, value in kpis.items():
        assert isinstance(value, int), f"KPI '{key}' deberia ser int, got {type(value)}"


def test_workspace_context_has_team_info():
    ctx = get_workspace_context(_WS_ID, _TENANT)
    assert isinstance(ctx.team_members, int)
    assert ctx.team_members >= 0


def test_demo_activity_feed_count():
    feed = _demo_activity_feed()
    assert isinstance(feed, list)
    assert len(feed) == 10
