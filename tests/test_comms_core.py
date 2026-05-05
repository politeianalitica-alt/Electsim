"""
Tests — Communications Core (Bloque 16).

pytest tests/test_comms_core.py -v
"""
from __future__ import annotations

import pytest
from datetime import datetime, timedelta


class TestSchemas:
    def test_content_asset_defaults(self):
        from communications.schemas import ContentAsset
        a = ContentAsset(title="Test", asset_type="tweet", body_markdown="Hola mundo")
        assert a.status == "draft"
        assert a.language == "es"
        assert a.asset_id.startswith("ast_")

    def test_message_frame_defaults(self):
        from communications.schemas import MessageFrame
        f = MessageFrame(title="Test Frame", core_claim="La energía sube un 20%")
        assert f.frame_type == "data_insight"
        assert f.tone == "analytical"
        assert f.frame_id.startswith("frm_")

    def test_content_performance_engagement_rate_clamped(self):
        from communications.schemas import ContentPerformance
        p = ContentPerformance(
            content_asset_id="a1", channel_id="c1",
            engagement_rate=1.5,  # debe quedar en 1.0
        )
        assert p.engagement_rate == 1.0

    def test_publication_job_manual_by_default(self):
        from communications.schemas import PublicationJob
        j = PublicationJob(content_asset_id="a1", channel_id="c1")
        assert j.requires_manual_publish is True
        assert j.status == "queued"


class TestChannelRegistry:
    def test_seed_default_channels(self):
        from communications.channel_registry import seed_default_channels, list_channels
        seed_default_channels(tenant_id="test_ch_t")
        channels = list_channels(tenant_id="test_ch_t")
        assert len(channels) >= 1

    def test_create_channel(self):
        from communications.channel_registry import create_channel, get_channel
        ch = create_channel(name="Test Channel", channel_type="other", tenant_id="test_ch_t2")
        assert ch.channel_id is not None
        fetched = get_channel(ch.channel_id)
        assert fetched is not None
        assert fetched.name == "Test Channel"

    def test_channel_requires_approval_by_default(self):
        from communications.channel_registry import create_channel
        ch = create_channel(name="LinkedIn Test", channel_type="linkedin", tenant_id="t1")
        assert ch.requires_approval is True
        assert ch.supports_direct_publish is False


class TestMessageStudio:
    def test_create_message_frame(self):
        from communications.message_studio import create_message_frame
        f = create_message_frame(
            title="Energía y geopolítica",
            core_claim="La dependencia energética aumenta el riesgo geopolítico.",
            supporting_points=["Punto 1", "Punto 2"],
            tenant_id="studio_t",
        )
        assert f.frame_id is not None
        assert f.title == "Energía y geopolítica"
        assert len(f.supporting_points) == 2

    def test_generate_content_asset_from_frame(self):
        from communications.message_studio import create_message_frame, generate_content_asset
        f = create_message_frame(title="Test Asset", core_claim="Claim de prueba", tenant_id="studio_t2")
        asset = generate_content_asset(frame_id=f.frame_id, asset_type="linkedin_post", tenant_id="studio_t2")
        assert asset.asset_id is not None
        assert asset.asset_type == "linkedin_post"
        assert "Test Asset" in asset.body_markdown or "Claim" in asset.body_markdown

    def test_adapt_message_truncates_tweet(self):
        from communications.message_studio import adapt_message_to_channel
        long_text = "A" * 400
        result = adapt_message_to_channel(long_text, "twitter_x")
        assert len(result) <= 280


class TestSocialPostBuilder:
    def test_build_linkedin_post_respects_basic_structure(self):
        from communications.schemas import MessageFrame
        from communications.social_post_builder import build_linkedin_post
        f = MessageFrame(
            title="Vivienda en España",
            core_claim="El acceso a la vivienda es el principal problema para jóvenes.",
            supporting_points=["Punto A", "Punto B"],
        )
        asset = build_linkedin_post(f)
        assert asset.asset_type == "linkedin_post"
        assert "Vivienda" in asset.body_markdown
        assert len(asset.body_markdown) <= 3000

    def test_tweet_builder_respects_character_limit(self):
        from communications.schemas import MessageFrame
        from communications.social_post_builder import build_tweet
        f = MessageFrame(
            title="Test",
            core_claim="X" * 350,  # más largo que el límite de tweet
        )
        asset = build_tweet(f)
        assert len(asset.body_markdown) <= 280

    def test_build_thread_returns_multiple_tweets(self):
        from communications.schemas import MessageFrame
        from communications.social_post_builder import build_thread
        f = MessageFrame(
            title="Hilo sobre regulación",
            core_claim="La regulación energética cambia el panorama.",
            supporting_points=["Punto 1", "Punto 2", "Punto 3", "Punto 4"],
        )
        tweets = build_thread(f, max_tweets=5)
        assert len(tweets) >= 2
        for t in tweets:
            assert len(t.body_markdown) <= 280


class TestGuardrails:
    def test_guardrails_detects_unsupported_claim(self):
        from communications.comms_guardrails import detect_unsupported_claims
        content = "según estudios, el mercado crecerá un 50% este año"
        flags = detect_unsupported_claims(content, evidence_ids=[])
        assert len(flags) >= 1

    def test_guardrails_no_flags_with_evidence(self):
        from communications.comms_guardrails import detect_unsupported_claims
        content = "según estudios, el mercado crecerá"
        flags = detect_unsupported_claims(content, evidence_ids=["INE_2024", "Eurostat"])
        assert len(flags) == 0

    def test_full_guardrail_check_returns_check_object(self):
        from communications.schemas import ContentAsset
        from communications.comms_guardrails import run_full_guardrail_check
        asset = ContentAsset(
            title="Test", asset_type="press_note",
            body_markdown="Nota de prensa con contenido estándar.",
        )
        check = run_full_guardrail_check(asset)
        assert check.content_asset_id == asset.asset_id
        assert isinstance(check.flags, list)


class TestApprovalWorkflow:
    def test_approval_required_for_press_note(self):
        from communications.schemas import ContentAsset
        from communications.comms_guardrails import require_human_approval
        from communications.message_studio import save_asset
        asset = ContentAsset(
            title="Nota de prensa test", asset_type="press_note",
            body_markdown="Contenido estándar.",
        )
        save_asset(asset)
        result = require_human_approval(asset.asset_id)
        assert result is True

    def test_request_approval_creates_pending(self):
        from communications.schemas import ContentAsset
        from communications.message_studio import save_asset
        from communications.approval_workflow import request_approval, get_pending_approvals
        asset = ContentAsset(
            title="Test approval", asset_type="linkedin_post",
            body_markdown="Post de prueba", tenant_id="appr_t",
        )
        save_asset(asset)
        approval = request_approval(asset.asset_id, requested_by="user1", tenant_id="appr_t")
        assert approval.approval_status == "pending"
        pending = get_pending_approvals(tenant_id="appr_t")
        assert any(a.approval_id == approval.approval_id for a in pending)


class TestPublicationQueue:
    def test_publication_queue_manual_by_default(self):
        from communications.schemas import ContentAsset
        from communications.message_studio import save_asset
        from communications.publication_queue import queue_publication, get_publication_queue
        asset = ContentAsset(
            title="Test pub", asset_type="tweet",
            body_markdown="Tweet de prueba", status="approved",
            tenant_id="pub_t",
        )
        save_asset(asset)
        job = queue_publication(asset.asset_id, "chn_test", tenant_id="pub_t")
        assert job.requires_manual_publish is True
        queue = get_publication_queue(tenant_id="pub_t")
        assert any(j.publication_id == job.publication_id for j in queue)


class TestTemplates:
    def test_list_templates_returns_all(self):
        from communications.template_library import list_templates
        templates = list_templates()
        assert len(templates) >= 10

    def test_render_template_basic(self):
        from communications.template_library import render_template
        result = render_template("data_insight_tweet", {
            "insight": "El paro baja al 10%",
            "data": "EPA Q1 2026",
            "source": "INE",
        })
        assert "El paro" in result
        assert "INE" in result

    def test_render_template_unknown_returns_placeholder(self):
        from communications.template_library import render_template
        result = render_template("nonexistent_template", {})
        assert "no encontrado" in result.lower()


class TestServiceLayer:
    def test_comms_core_empty_db_does_not_crash(self):
        from dashboard.services.comms_core import (
            cargar_comms_kpis, cargar_content_assets,
            cargar_pending_approvals, cargar_editorial_calendar,
            cargar_publication_queue, cargar_channels,
        )
        assert isinstance(cargar_comms_kpis(), dict)
        assert isinstance(cargar_content_assets(), list)
        assert isinstance(cargar_pending_approvals(), list)
        assert isinstance(cargar_editorial_calendar(), list)
        assert isinstance(cargar_publication_queue(), list)
        assert isinstance(cargar_channels(), list)


class TestCommsTools:
    def test_comms_tools_registered(self):
        from agents.tools.comms_tools import COMMS_TOOLS
        assert len(COMMS_TOOLS) >= 8
        names = {t["name"] for t in COMMS_TOOLS}
        assert "generate_linkedin_post" in names
        assert "generate_twitter_thread" in names
        assert "generate_qna_pack" in names
        assert "recommend_content_for_alert" in names
        assert "get_editorial_calendar" in names

    def test_generate_linkedin_post_tool(self):
        from agents.tools.comms_tools import COMMS_TOOLS
        tool = next(t for t in COMMS_TOOLS if t["name"] == "generate_linkedin_post")
        result = tool["function"](topic="Energía renovable", core_claim="Las renovables crecen un 30%")
        assert isinstance(result, dict)
        assert "asset_id" in result or "error" in result

    def test_generate_qna_tool(self):
        from agents.tools.comms_tools import COMMS_TOOLS
        tool = next(t for t in COMMS_TOOLS if t["name"] == "generate_qna_pack")
        result = tool["function"](topic="vivienda")
        assert isinstance(result, dict)
        assert "asset_id" in result or "error" in result
