"""Tests para workflow_engine, command_palette, premium_animations y keyboard_shortcuts."""

from __future__ import annotations

import pytest

from dashboard.components.command_palette import (
    Command,
    get_command_categories,
    register_command,
    search_commands,
    _COMMANDS,
)
from dashboard.ui.keyboard_shortcuts import KEYBOARD_SHORTCUTS
from dashboard.ui.premium_animations import (
    PREMIUM_CSS,
    fade_in_div,
    loading_skeleton,
)
from services.workflows.workflow_engine import (
    abandon_workflow,
    complete_workflow,
    get_user_active_runs,
    get_workflow,
    list_workflows,
    start_workflow,
    submit_step,
)


# ---------------------------------------------------------------------------
# Workflow tests
# ---------------------------------------------------------------------------


def test_list_workflows_returns_all() -> None:
    items = list_workflows()
    assert len(items) >= 8


def test_get_workflow_known() -> None:
    wf = get_workflow("rapid_briefing")
    assert wf is not None
    assert wf.id == "rapid_briefing"
    assert len(wf.steps) > 0


def test_start_workflow_creates_run() -> None:
    run = start_workflow("rapid_briefing", tenant_id="t1", user_id="u1")
    assert run.workflow_id == "rapid_briefing"
    assert run.status == "in_progress"
    assert run.current_step == 0


def test_submit_step_advances() -> None:
    run = start_workflow("rapid_briefing", tenant_id="t1", user_id="u_step")
    updated = submit_step(run.run_id, {"value": "Reunión interna"})
    assert updated.current_step == 1
    assert "contexto" in updated.step_data


def test_complete_workflow_marks_completed() -> None:
    run = start_workflow("rapid_briefing", tenant_id="t1", user_id="u_complete")
    completed = complete_workflow(run.run_id, output={"foo": "bar"})
    assert completed.status == "completed"
    assert completed.output == {"foo": "bar"}
    assert completed.completed_at is not None


def test_abandon_workflow_marks_abandoned() -> None:
    run = start_workflow("crisis_response", tenant_id="t1", user_id="u_abandon")
    abandoned = abandon_workflow(run.run_id)
    assert abandoned.status == "abandoned"
    assert abandoned.completed_at is not None


def test_get_user_active_runs_filters() -> None:
    user_id = "u_active_unique"
    start_workflow("rapid_briefing", tenant_id="t1", user_id=user_id)
    start_workflow("actor_dossier", tenant_id="t1", user_id=user_id)
    runs = get_user_active_runs(user_id)
    assert len(runs) == 2
    assert all(r.status == "in_progress" for r in runs)


def test_registered_workflows_count_8() -> None:
    items = list_workflows()
    assert len(items) == 8
    ids = {w.id for w in items}
    expected = {
        "rapid_briefing", "crisis_response", "actor_dossier", "narrative_response",
        "weekly_planning", "press_conference_prep", "election_simulation",
        "stakeholder_outreach",
    }
    assert expected.issubset(ids)


# ---------------------------------------------------------------------------
# Command palette tests
# ---------------------------------------------------------------------------


def test_search_empty_returns_default_list() -> None:
    results = search_commands("", limit=5)
    assert len(results) == 5


def test_search_match_label() -> None:
    results = search_commands("Briefings", limit=5)
    assert any("Briefing" in c.label for c in results)


def test_search_fuzzy_keyword() -> None:
    results = search_commands("workspace", limit=10)
    assert any("workspace" in (c.label.lower() + " ".join(c.keywords)) for c in results)


def test_get_command_categories_unique() -> None:
    cats = get_command_categories()
    assert len(cats) == len(set(cats))
    assert "Workflows" in cats


def test_register_custom_command() -> None:
    initial = len(_COMMANDS)
    cmd = Command(
        id="custom_test_cmd",
        label="Custom test",
        category="Test",
        action_type="open_modal",
        action_target="test_target",
    )
    register_command(cmd)
    assert len(_COMMANDS) == initial + 1
    found = search_commands("Custom test", limit=3)
    assert any(c.id == "custom_test_cmd" for c in found)


def test_all_commands_have_ids() -> None:
    for c in _COMMANDS:
        assert c.id and isinstance(c.id, str)


def test_all_commands_have_action_type() -> None:
    valid = {"navigate", "run_workflow", "open_modal", "external"}
    for c in _COMMANDS:
        assert c.action_type in valid


# ---------------------------------------------------------------------------
# Premium animations tests
# ---------------------------------------------------------------------------


def test_premium_css_not_empty() -> None:
    assert PREMIUM_CSS.strip()
    assert "<style>" in PREMIUM_CSS


def test_premium_css_contains_keyframes() -> None:
    assert "@keyframes fadeInUp" in PREMIUM_CSS
    assert "@keyframes shimmer" in PREMIUM_CSS
    assert "@keyframes pulse-cyan" in PREMIUM_CSS


def test_loading_skeleton_returns_string() -> None:
    out = loading_skeleton(height="20px", count=2)
    assert isinstance(out, str)
    assert "skeleton" in out
    assert out.count("skeleton") >= 2


def test_fade_in_div_wraps_content() -> None:
    wrapped = fade_in_div("<p>hello</p>", delay_ms=100)
    assert "<p>hello</p>" in wrapped
    assert "fadeInUp" in wrapped


# ---------------------------------------------------------------------------
# Keyboard shortcuts tests
# ---------------------------------------------------------------------------


def test_shortcuts_dict_not_empty() -> None:
    assert len(KEYBOARD_SHORTCUTS) >= 12


def test_shortcuts_has_cmd_k() -> None:
    assert "Cmd+K / Ctrl+K" in KEYBOARD_SHORTCUTS


def test_shortcuts_has_g_then_h() -> None:
    assert "G then H" in KEYBOARD_SHORTCUTS
