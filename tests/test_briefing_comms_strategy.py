"""Tests de briefing editorial engine y communications strategy engine."""
from __future__ import annotations
import pytest


class TestBriefingEditorialEngine:
    def test_engine_importable(self):
        from services.intelligence.briefing_editorial_engine import (
            build_briefing_context, generate_executive_briefing, validate_briefing_quality
        )
        assert callable(build_briefing_context)
        assert callable(generate_executive_briefing)
        assert callable(validate_briefing_quality)

    def test_select_briefing_news_importable(self):
        from services.intelligence.briefing_editorial_engine import select_briefing_news
        assert callable(select_briefing_news)

    def test_build_context_returns_dict(self):
        from services.intelligence.briefing_editorial_engine import build_briefing_context
        ctx = build_briefing_context(tenant_id="test")
        assert isinstance(ctx, dict)
        assert "top_news" in ctx
        assert "narratives" in ctx
        assert "risks" in ctx
        assert "actors" in ctx
        assert "legislative" in ctx
        assert "workspace_context" in ctx
        assert "mode" in ctx
        assert "errors" in ctx

    def test_build_context_mode_is_valid(self):
        from services.intelligence.briefing_editorial_engine import build_briefing_context
        ctx = build_briefing_context(tenant_id="test")
        assert ctx["mode"] in ("real", "fallback", "demo")

    def test_build_context_with_workspace_id(self):
        from services.intelligence.briefing_editorial_engine import build_briefing_context
        # Should not raise even if workspace service unavailable
        ctx = build_briefing_context(tenant_id="test", workspace_id="ws_123")
        assert isinstance(ctx, dict)

    def test_generate_briefing_returns_structured_dict(self):
        from services.intelligence.briefing_editorial_engine import generate_executive_briefing
        ctx = {
            "top_news": [{"title": "Test news", "source_name": "El País", "translated_title": "Noticia test"}],
            "narratives": [],
            "risks": [],
            "mode": "fallback",
        }
        briefing = generate_executive_briefing(ctx, tenant_id="test")
        assert isinstance(briefing, dict)
        assert "title" in briefing
        assert "date" in briefing
        assert "generated_at" in briefing
        assert "top_news" in briefing
        assert "mode" in briefing
        assert "tenant_id" in briefing

    def test_generate_briefing_with_empty_context(self):
        from services.intelligence.briefing_editorial_engine import generate_executive_briefing
        briefing = generate_executive_briefing({}, tenant_id="test")
        assert isinstance(briefing, dict)
        assert "title" in briefing

    def test_generate_briefing_with_full_context(self):
        from services.intelligence.briefing_editorial_engine import generate_executive_briefing
        ctx = {
            "top_news": [
                {"title": "Reforma fiscal aprobada", "source_name": "El Mundo", "translated_title": "Reforma fiscal"},
                {"title": "Elecciones en Madrid", "source_name": "El País"},
            ],
            "narratives": [
                {"frame_label": "Crisis de vivienda", "lifecycle": "creciente", "article_count": 45},
            ],
            "risks": [{"title": "Alerta energética", "descripcion": "Subida de precios"}],
            "mode": "fallback",
        }
        briefing = generate_executive_briefing(ctx, tenant_id="test")
        assert isinstance(briefing, dict)
        assert briefing["top_news"] == ctx["top_news"]
        assert briefing["narratives"] == ctx["narratives"]

    def test_validate_briefing_empty_has_issues(self):
        from services.intelligence.briefing_editorial_engine import validate_briefing_quality
        result = validate_briefing_quality({"executive_summary": "", "top_news": [], "mode": "demo"})
        assert isinstance(result, dict)
        assert "valid" in result
        assert "issues" in result
        assert "quality_score" in result
        # Empty summary + no news = invalid
        assert not result["valid"] or "no_news" in result["issues"] or "missing_executive_summary" in result["issues"]

    def test_validate_briefing_with_data_is_valid(self):
        from services.intelligence.briefing_editorial_engine import validate_briefing_quality
        result = validate_briefing_quality({
            "executive_summary": "El gobierno ha aprobado una nueva reforma fiscal con impacto positivo.",
            "top_news": [{"title": "Noticia relevante"}],
            "mode": "real",
        })
        assert result["valid"] is True
        assert result["quality_score"] > 0.5

    def test_validate_briefing_demo_mode_flagged(self):
        from services.intelligence.briefing_editorial_engine import validate_briefing_quality
        result = validate_briefing_quality({
            "executive_summary": "Resumen real",
            "top_news": [{"title": "Noticia"}],
            "mode": "demo",
        })
        assert "demo_mode" in result["issues"]
        # But still valid (demo_mode is not a blocking issue)
        assert result["valid"] is True

    def test_select_briefing_news_returns_list(self):
        from services.intelligence.briefing_editorial_engine import select_briefing_news
        articles = [{"title": f"Noticia {i}", "source_name": "El País"} for i in range(10)]
        result = select_briefing_news(articles, n=5)
        assert isinstance(result, list)
        assert len(result) <= 5

    def test_quality_score_between_0_and_1(self):
        from services.intelligence.briefing_editorial_engine import validate_briefing_quality
        for briefing in [
            {},
            {"executive_summary": "Test", "top_news": [], "mode": "real"},
            {"executive_summary": "Test", "top_news": [{"title": "n"}], "mode": "real"},
        ]:
            result = validate_briefing_quality(briefing)
            assert 0.0 <= result["quality_score"] <= 1.0


class TestBriefingPDFExporter:
    def test_exporter_importable(self):
        from services.intelligence.briefing_pdf_exporter import export_briefing_pdf
        assert callable(export_briefing_pdf)

    def test_build_html_importable(self):
        from services.intelligence.briefing_pdf_exporter import _build_html
        assert callable(_build_html)

    def test_build_html_returns_string(self):
        from services.intelligence.briefing_pdf_exporter import _build_html
        briefing = {
            "date": "5 de mayo de 2026",
            "executive_summary": "Resumen de prueba",
            "top_news": [{"title": "Noticia test", "source_name": "El País"}],
            "narratives": [{"frame_label": "Crisis", "lifecycle": "emergente"}],
            "critical_signals": "Señal 1",
            "recommendations": "Recomendación 1",
            "mode": "demo",
        }
        html = _build_html(briefing, "executive")
        assert isinstance(html, str)
        assert "BRIEFING" in html.upper()
        assert "5 de mayo de 2026" in html

    def test_build_html_all_types(self):
        from services.intelligence.briefing_pdf_exporter import _build_html
        for btype in ["executive", "client", "campaign", "crisis"]:
            html = _build_html({"date": "2026-05-05"}, btype)
            assert isinstance(html, str)
            assert len(html) > 100

    def test_export_with_demo_briefing(self):
        from services.intelligence.briefing_pdf_exporter import export_briefing_pdf
        briefing = {
            "title": "Test Briefing",
            "date": "5 de mayo de 2026",
            "executive_summary": "Test resumen ejecutivo para validar el exportador.",
            "what_changed": "Test cambios observados hoy.",
            "top_news": [{"title": "Test news", "source_name": "El País"}],
            "narratives": [],
            "risks": [],
            "critical_signals": "Test señales críticas",
            "recommendations": "Test recomendaciones estratégicas",
            "strategic_questions": "¿Qué hacer ahora?",
            "mode": "demo",
        }
        # Si reportlab no está instalado, devuelve None sin error
        result = export_briefing_pdf(briefing, "executive")
        assert result is None or isinstance(result, bytes)

    def test_export_returns_none_gracefully_if_no_lib(self):
        from services.intelligence.briefing_pdf_exporter import export_briefing_pdf
        # No debe lanzar excepción con briefing vacío
        result = export_briefing_pdf({}, "executive")
        assert result is None or isinstance(result, bytes)

    def test_export_all_briefing_types(self):
        from services.intelligence.briefing_pdf_exporter import export_briefing_pdf
        briefing = {"date": "5 de mayo de 2026", "executive_summary": "Test", "mode": "demo"}
        for btype in ["executive", "client", "campaign", "crisis"]:
            result = export_briefing_pdf(briefing, btype)
            assert result is None or isinstance(result, bytes)

    def test_export_with_news_and_narratives(self):
        from services.intelligence.briefing_pdf_exporter import export_briefing_pdf
        briefing = {
            "date": "5 de mayo de 2026",
            "executive_summary": "Resumen con datos reales simulados.",
            "what_changed": "Cambios detectados hoy.",
            "top_news": [
                {"title": "Reforma fiscal", "source_name": "El País", "relevance_score": 0.95},
                {"title": "Elecciones Andalucía", "source_name": "El Mundo", "relevance_score": 0.87},
            ],
            "narratives": [
                {"frame_label": "Crisis vivienda", "lifecycle": "creciente", "is_demo": False,
                 "central_claim": "Los precios suben por la especulación"},
                {"frame_label": "Demo narrative", "lifecycle": "estable", "is_demo": True},
            ],
            "critical_signals": "Subida de precios energía en 12%",
            "recommendations": "Monitorizar mercado energético",
            "strategic_questions": "¿Cuándo intervenir?",
            "mode": "fallback",
        }
        result = export_briefing_pdf(briefing, "executive")
        assert result is None or isinstance(result, bytes)


class TestCommsStrategyEngine:
    def test_engine_importable(self):
        from communications.strategy_engine import (
            analyze_issue_for_comms, build_message_triangle,
            generate_counter_narratives, generate_hostile_qna,
            red_team_message, recommend_channel_mix
        )
        assert callable(analyze_issue_for_comms)
        assert callable(build_message_triangle)
        assert callable(generate_counter_narratives)
        assert callable(generate_hostile_qna)
        assert callable(red_team_message)
        assert callable(recommend_channel_mix)

    def test_analyze_issue_returns_structured_dict(self):
        from communications.strategy_engine import analyze_issue_for_comms
        result = analyze_issue_for_comms("Crisis de vivienda en España")
        assert isinstance(result, dict)
        assert "issue" in result
        assert "rival_frame" in result
        assert "own_frame" in result
        assert "central_message" in result
        assert "three_arguments" in result
        assert "hostile_questions" in result
        assert "counter_narrative" in result
        assert "recommended_channel" in result
        assert "timing" in result
        assert "mode" in result
        assert "generated_at" in result

    def test_analyze_issue_mode_is_valid(self):
        from communications.strategy_engine import analyze_issue_for_comms
        result = analyze_issue_for_comms("Reforma fiscal")
        assert result["mode"] in ("real", "demo")

    def test_analyze_issue_never_crashes(self):
        from communications.strategy_engine import analyze_issue_for_comms
        for issue in ["", "vivienda", "reforma fiscal", "A" * 500]:
            result = analyze_issue_for_comms(issue)
            assert isinstance(result, dict)

    def test_analyze_issue_with_context(self):
        from communications.strategy_engine import analyze_issue_for_comms
        ctx = {"actor": "PP", "region": "Cataluña", "urgency": "alta"}
        result = analyze_issue_for_comms("Crisis territorial", context=ctx)
        assert isinstance(result, dict)
        assert result["issue"] == "Crisis territorial"

    def test_build_message_triangle_returns_dict(self):
        from communications.strategy_engine import build_message_triangle
        result = build_message_triangle("Vivienda asequible")
        assert isinstance(result, dict)
        assert "central_message" in result
        assert "issue" in result
        assert "audience" in result

    def test_build_message_triangle_with_audience(self):
        from communications.strategy_engine import build_message_triangle
        result = build_message_triangle("Empleo juvenil", audience="jovenes_18_30")
        assert isinstance(result, dict)
        assert result["audience"] == "jovenes_18_30"

    def test_red_team_returns_dict(self):
        from communications.strategy_engine import red_team_message
        result = red_team_message("El gobierno ha resuelto el problema de la vivienda")
        assert isinstance(result, dict)
        assert "guardrail_flags" in result
        assert "message" in result
        assert "mode" in result

    def test_red_team_never_crashes(self):
        from communications.strategy_engine import red_team_message
        for msg in ["", "Test mensaje", "A" * 600]:
            result = red_team_message(msg)
            assert isinstance(result, dict)

    def test_red_team_with_asset_types(self):
        from communications.strategy_engine import red_team_message
        for atype in ["press_note", "linkedin", "newsletter", "email"]:
            result = red_team_message("Mensaje de prueba para red team.", asset_type=atype)
            assert isinstance(result, dict)

    def test_recommend_channel_mix_crisis(self):
        from communications.strategy_engine import recommend_channel_mix
        channels = recommend_channel_mix("Crisis energética", urgency="crisis")
        assert isinstance(channels, list)
        assert len(channels) > 0
        assert channels[0]["channel"] in ("press_note", "twitter_x", "email", "linkedin")
        assert channels[0]["priority"] == 1

    def test_recommend_channel_mix_all_urgencies(self):
        from communications.strategy_engine import recommend_channel_mix
        for urgency in ["crisis", "alta", "normal", "baja"]:
            channels = recommend_channel_mix("Test issue", urgency=urgency)
            assert isinstance(channels, list)
            assert len(channels) > 0

    def test_recommend_channel_mix_unknown_urgency(self):
        from communications.strategy_engine import recommend_channel_mix
        # Debería retornar default (normal) sin crash
        channels = recommend_channel_mix("Test", urgency="desconocida")
        assert isinstance(channels, list)
        assert len(channels) > 0

    def test_generate_hostile_qna_returns_list(self):
        from communications.strategy_engine import generate_hostile_qna
        result = generate_hostile_qna("vivienda", n_questions=3)
        assert isinstance(result, list)

    def test_generate_hostile_qna_never_crashes(self):
        from communications.strategy_engine import generate_hostile_qna
        for issue in ["", "vivienda", "A" * 300]:
            result = generate_hostile_qna(issue, n_questions=2)
            assert isinstance(result, list)

    def test_counter_narratives_returns_list(self):
        from communications.strategy_engine import generate_counter_narratives
        result = generate_counter_narratives("El gobierno ha fallado en vivienda")
        assert isinstance(result, list)
        assert len(result) > 0

    def test_counter_narratives_with_own_position(self):
        from communications.strategy_engine import generate_counter_narratives
        result = generate_counter_narratives(
            "El gobierno ha fallado en vivienda",
            own_position="Hemos invertido más que ningún gobierno anterior"
        )
        assert isinstance(result, list)
        assert len(result) > 0

    def test_counter_narratives_never_crashes(self):
        from communications.strategy_engine import generate_counter_narratives
        for frame in ["", "Frame rival", "A" * 400]:
            result = generate_counter_narratives(frame)
            assert isinstance(result, list)

    def test_demo_mode_fields_present(self):
        """En modo demo todas las claves clave deben estar presentes."""
        from communications.strategy_engine import analyze_issue_for_comms
        result = analyze_issue_for_comms("Test issue")
        required_keys = [
            "issue", "rival_frame", "own_frame", "central_message",
            "three_arguments", "evidence_needed", "risks",
            "hostile_questions", "answers", "counter_narrative",
            "recommended_channel", "timing", "do_not_say",
            "success_metric", "generated_at", "mode",
        ]
        for key in required_keys:
            assert key in result, f"Missing key: {key}"

    def test_three_arguments_is_list(self):
        from communications.strategy_engine import analyze_issue_for_comms
        result = analyze_issue_for_comms("Política energética")
        assert isinstance(result["three_arguments"], list)

    def test_hostile_questions_is_list(self):
        from communications.strategy_engine import analyze_issue_for_comms
        result = analyze_issue_for_comms("Reforma pensiones")
        assert isinstance(result["hostile_questions"], list)
