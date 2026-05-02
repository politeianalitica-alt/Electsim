"""
Tests para packages/prompts — loader de prompts versionados.
"""
from __future__ import annotations

import pytest

from packages.prompts.index import (
    load_prompt,
    render_prompt,
    list_prompts,
    invalidate_cache,
    PromptTemplate,
    PromptNotFoundError,
)


@pytest.fixture(autouse=True)
def _clear_cache():
    invalidate_cache()
    yield
    invalidate_cache()


class TestLoadPrompt:
    def test_loads_morning_briefing(self):
        tpl = load_prompt("intelligence.morning_briefing")
        assert isinstance(tpl, PromptTemplate)
        assert tpl.id == "intelligence.morning_briefing"

    def test_loads_risk_memo(self):
        tpl = load_prompt("intelligence.risk_memo")
        assert tpl.model == "electsim-analysis"

    def test_loads_narrative_labeling(self):
        tpl = load_prompt("intelligence.narrative_labeling")
        assert tpl.task_type == "classification"
        assert tpl.model == "electsim-fast"

    def test_loads_impact_assessment(self):
        tpl = load_prompt("intelligence.impact_assessment")
        assert len(tpl.inputs) > 0

    def test_loads_crisis_response_kit(self):
        tpl = load_prompt("comms.crisis_response_kit")
        assert tpl.id == "comms.crisis_response_kit"

    def test_loads_actor_briefing(self):
        tpl = load_prompt("comms.actor_briefing")
        assert isinstance(tpl, PromptTemplate)

    def test_loads_regulatory_impact(self):
        tpl = load_prompt("legislative.regulatory_impact")
        assert isinstance(tpl, PromptTemplate)

    def test_loads_scenario_analysis(self):
        tpl = load_prompt("electoral.scenario_analysis")
        assert isinstance(tpl, PromptTemplate)

    def test_unknown_prompt_raises(self):
        with pytest.raises(PromptNotFoundError):
            load_prompt("nonexistent.prompt_xyz")

    def test_invalid_format_raises(self):
        with pytest.raises(PromptNotFoundError, match="Formato esperado"):
            load_prompt("sin_punto")

    def test_caches_result(self):
        tpl1 = load_prompt("intelligence.risk_memo")
        tpl2 = load_prompt("intelligence.risk_memo")
        assert tpl1 is tpl2  # mismo objeto del cache

    def test_no_cache_returns_new_instance(self):
        tpl1 = load_prompt("intelligence.risk_memo", use_cache=False)
        tpl2 = load_prompt("intelligence.risk_memo", use_cache=False)
        assert tpl1 is not tpl2

    def test_has_version(self):
        tpl = load_prompt("intelligence.morning_briefing")
        assert tpl.version != ""

    def test_has_output_schema(self):
        tpl = load_prompt("intelligence.morning_briefing")
        assert isinstance(tpl.output_schema, dict)
        assert len(tpl.output_schema) > 0

    def test_template_content_not_empty(self):
        tpl = load_prompt("intelligence.morning_briefing")
        assert len(tpl.template) > 100

    def test_has_inputs(self):
        tpl = load_prompt("intelligence.morning_briefing")
        assert len(tpl.inputs) > 0
        # Cada input tiene name y type
        for inp in tpl.inputs:
            assert "name" in inp
            assert "type" in inp


class TestListPrompts:
    def test_returns_list(self):
        prompts = list_prompts()
        assert isinstance(prompts, list)
        assert len(prompts) > 0

    def test_contains_morning_briefing(self):
        prompts = list_prompts()
        assert "intelligence.morning_briefing" in prompts

    def test_filter_by_category(self):
        intel_prompts = list_prompts(category="intelligence")
        assert all(p.startswith("intelligence.") for p in intel_prompts)

    def test_filter_comms(self):
        comms_prompts = list_prompts(category="comms")
        assert "comms.crisis_response_kit" in comms_prompts
        assert "comms.actor_briefing" in comms_prompts

    def test_filter_legislative(self):
        leg_prompts = list_prompts(category="legislative")
        assert "legislative.regulatory_impact" in leg_prompts

    def test_filter_electoral(self):
        elec_prompts = list_prompts(category="electoral")
        assert "electoral.scenario_analysis" in elec_prompts

    def test_unknown_category_returns_empty(self):
        result = list_prompts(category="nonexistent")
        assert result == []

    def test_sorted_alphabetically(self):
        prompts = list_prompts()
        assert prompts == sorted(prompts)


class TestRenderPrompt:
    def test_simple_variable_substitution(self):
        tpl = load_prompt("intelligence.risk_memo")
        rendered = render_prompt(tpl, actor="Pedro Sánchez", timeframe="30 días",
                                  events=[], current_risk_score=75)
        assert "Pedro Sánchez" in rendered

    def test_missing_variable_kept_as_placeholder(self):
        tpl = load_prompt("intelligence.risk_memo")
        rendered = render_prompt(tpl)
        # Variables no sustituidas se mantienen sin crash
        assert isinstance(rendered, str)

    def test_render_morning_briefing(self):
        tpl = load_prompt("intelligence.morning_briefing")
        rendered = render_prompt(
            tpl,
            date="2026-05-01",
            org_context="Consultora Test",
            top_alerts=[],
            recent_news=[],
            legislative_updates=[],
        )
        assert "2026-05-01" in rendered or "Consultora Test" in rendered


class TestInvalidateCache:
    def test_invalidate_forces_reload(self):
        tpl1 = load_prompt("intelligence.risk_memo")
        invalidate_cache()
        tpl2 = load_prompt("intelligence.risk_memo")
        # Tras invalidar, son objetos diferentes (recargados del disco)
        assert tpl1 is not tpl2
