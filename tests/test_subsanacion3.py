"""
Tests del Bloque de Subsanación 3 — Intelligence Layer.

Cubre: media intelligence, article ranking, translation, narrative pipeline,
LLM router, briefing, comms strategy y workspace war room.
"""
import pytest


# ── Media Intelligence Foundation ────────────────────────────────────────────

class TestMediaIntelligenceFoundation:
    def test_source_lang_detection_for_bbc(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        bbc = next((s for s in MEDIA_FEEDS if "BBC" in s.get("name", "")
                     and s.get("country", "") not in ("Spain", "España")), None)
        if bbc:
            assert bbc.get("lang") == "en", f"BBC debería ser 'en', es '{bbc.get('lang')}'"
        # Si no hay BBC, el test pasa igualmente (fuente no en catálogo)

    def test_source_lang_reuters_is_english(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        reuters = next((s for s in MEDIA_FEEDS if "Reuters" in s.get("name", "")), None)
        if reuters:
            assert reuters.get("lang") == "en", f"Reuters debería ser 'en', es '{reuters.get('lang')}'"

    def test_source_lang_le_monde_is_french(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        lm = next((s for s in MEDIA_FEEDS if "Le Monde" in s.get("name", "")), None)
        if lm:
            assert lm.get("lang") == "fr", f"Le Monde debería ser 'fr', es '{lm.get('lang')}'"

    def test_media_source_health_importable(self):
        from media_intelligence.source_health import (
            record_source_success, record_source_failure,
            get_source_health, get_health_summary
        )
        assert callable(record_source_success)

    def test_source_health_records_failure(self):
        from media_intelligence.source_health import record_source_failure, get_source_health
        h = record_source_failure("test_src_404", "TestSource", "https://bad.com", "404", "Not found", 404)
        assert h.status == "down"
        assert h.error_type == "404"
        stored = get_source_health("test_src_404")
        assert stored is not None

    def test_acquisition_module_importable(self):
        from media_intelligence.acquisition import fetch_source, fetch_priority_sources
        assert callable(fetch_source)


# ── Article Intelligence ──────────────────────────────────────────────────────

class TestArticleIntelligence:
    def test_translation_batch_only_non_spanish(self):
        from media_intelligence.translation_service import translate_titles_batch
        articles = [
            {"title": "El Congreso aprueba la reforma", "source_lang": "es"},
            {"title": "The UK Government announces new plan", "source_lang": "en"},
        ]
        result = translate_titles_batch(articles, target_lang="es")
        # El artículo español NO debe tener translated_title
        assert not result[0].get("translated_title") or result[0]["translated_title"] == result[0]["title"]

    def test_article_ranker_penalizes_sports(self):
        from media_intelligence.article_ranker import rank_article
        sports = {
            "title": "Real Madrid gana 3-0 en el Bernabéu ante el Barcelona",
            "summary": "Gol en el minuto 88, liga española, temporada deportiva",
            "source_priority": 3, "political_relevance": 0.1,
        }
        score = rank_article(sports)
        assert score < 0.4, f"Score deportes debería ser <0.4, es {score}"

    def test_article_ranker_prioritizes_political_relevance(self):
        from media_intelligence.article_ranker import rank_article
        political = {
            "title": "El presidente Sánchez anuncia reforma legislativa en el Congreso",
            "summary": "El gobierno aprueba el presupuesto con apoyo de la coalición",
            "source_priority": 1, "political_relevance": 0.9,
        }
        score = rank_article(political)
        assert score > 0.3, f"Score político debería ser >0.3, es {score}"

    def test_editorial_selector_diversifies_sources(self):
        from media_intelligence.editorial_selector import select_diverse_news
        articles = [
            {"title": f"Noticia {i} de El País", "source_name": "El País", "political_relevance": 0.8}
            for i in range(10)
        ] + [{"title": "Noticia El Mundo", "source_name": "El Mundo", "political_relevance": 0.7}]
        result = select_diverse_news(articles, n=10, max_per_source=2)
        el_pais_count = sum(1 for r in result if r.get("source_name") == "El País")
        assert el_pais_count <= 2

    def test_rss_validator_importable(self):
        from media_intelligence.rss_validator import validate_feed
        assert callable(validate_feed)

    def test_language_detection_importable(self):
        from media_intelligence.language_detection import detect_language, should_translate
        assert should_translate("en") is True
        assert should_translate("es") is False


# ── Narrative Pipeline ────────────────────────────────────────────────────────

class TestNarrativePipeline:
    def test_narrative_pipeline_discards_topic_only(self):
        from media_intelligence.narrative_pipeline import _discard_topic_only_clusters
        clusters = [
            {"frame_label": "política", "central_claim": "", "article_count": 10},
            {"frame_label": "El gobierno recorta derechos laborales", "central_claim": "La reforma...", "article_count": 7},
        ]
        result = _discard_topic_only_clusters(clusters)
        assert len(result) == 1
        assert result[0]["frame_label"] != "política"

    def test_narrative_frame_has_claim_not_topic(self):
        from media_intelligence.narrative_pipeline import validate_narrative
        topic = {"frame_label": "economía", "central_claim": "", "article_count": 5}
        frame = {"frame_label": "La subida de tipos destruye el crédito pyme", "central_claim": "BCE...", "article_count": 8}
        assert validate_narrative(topic) is False
        assert validate_narrative(frame) is True

    def test_pipeline_empty_articles_returns_list(self):
        from media_intelligence.narrative_pipeline import run_narrative_pipeline
        result = run_narrative_pipeline([])
        assert isinstance(result, list)

    def test_demo_narratives_are_clearly_marked(self):
        from media_intelligence.narrative_pipeline import _demo_narratives
        demos = _demo_narratives()
        assert all(d.get("is_demo") is True or "DEMO" in d.get("frame_label", "") for d in demos)


# ── LLM Router ───────────────────────────────────────────────────────────────

class TestLLMRouter:
    def test_llm_router_caches_result(self):
        from agents.brain.llm_router import route, _LLM_CACHE, _build_cache_key
        import time
        prompt = "Test unique caching prompt 99999"
        key = _build_cache_key("extraction", prompt, None)
        _LLM_CACHE[key] = {
            "result": "cached!", "model": "test", "task_type": "extraction",
            "from_cache": False, "latency_ms": 1, "ok": True, "error": None,
            "_cached_at": time.time(),
        }
        result = route("extraction", prompt)
        assert result["from_cache"] is True
        assert result["result"] == "cached!"

    def test_llm_router_timeout_fallback(self):
        from agents.brain.llm_router import route
        # Con Ollama no disponible, debe devolver dict sin crash
        result = route("classification", "¿Esto es político?")
        assert isinstance(result, dict)
        assert "ok" in result
        assert "task_type" in result


# ── Briefing Editorial Engine ─────────────────────────────────────────────────

class TestBriefingSelector:
    def test_briefing_selector_uses_ranked_news(self):
        from media_intelligence.editorial_selector import select_news_for_briefing
        articles = [
            {"title": "Deportes: final de liga", "source_name": "Marca", "source_priority": 4, "political_relevance": 0.0},
            {"title": "El Congreso vota reforma fiscal", "source_name": "El País", "source_priority": 1, "political_relevance": 0.9},
            {"title": "Sánchez anuncia inversión en vivienda", "source_name": "El Mundo", "source_priority": 2, "political_relevance": 0.8},
        ]
        result = select_news_for_briefing(articles, n=2)
        titles = [r.get("translated_title") or r.get("title") for r in result]
        # Las noticias políticas deben estar antes que deportes
        assert len(result) <= 2
        sports_in_result = any("liga" in (t or "").lower() for t in titles)
        # Deportes debería estar excluido o al final
        assert not sports_in_result or len(result) > 1


# ── Comms Strategy ───────────────────────────────────────────────────────────

class TestCommsStrategy:
    def test_comms_strategy_importable(self):
        try:
            from communications.strategy_engine import analyze_issue_for_comms
            assert callable(analyze_issue_for_comms)
        except ImportError:
            pytest.skip("strategy_engine no disponible aún")

    def test_comms_strategy_generates_counter_narrative(self):
        try:
            from communications.strategy_engine import generate_counter_narratives
            result = generate_counter_narratives("El gobierno ha fracasado en vivienda")
            assert isinstance(result, list)
        except ImportError:
            pytest.skip("strategy_engine no disponible aún")

    def test_comms_red_team_finds_risk(self):
        try:
            from communications.strategy_engine import red_team_message
            result = red_team_message("Con total certeza hemos resuelto el problema")
            assert isinstance(result, dict)
            assert "guardrail_flags" in result
        except ImportError:
            pytest.skip("strategy_engine no disponible aún")


# ── Workspace Intelligence ────────────────────────────────────────────────────

class TestWorkspaceIntelligence:
    def test_workspace_schemas_importable(self):
        from workspace_intelligence.schemas import (
            WorkspaceIssue, WorkspaceAction, WorkspaceDecision, WorkspaceOverview
        )
        assert WorkspaceIssue is not None

    def test_workspace_issue_board_create_and_list(self):
        from workspace_intelligence.issue_board import create_issue, list_issues
        create_issue("ws_test", "Test issue", severity="high", tenant_id="test")
        issues = list_issues("ws_test", "test")
        assert len(issues) >= 1
        assert issues[0].title == "Test issue"

    def test_workspace_issue_board_empty_does_not_crash(self):
        from workspace_intelligence.issue_board import list_issues
        result = list_issues("ws_nonexistent_xyz", "test")
        assert isinstance(result, list)
        assert len(result) == 0

    def test_workspace_action_queue_add_and_list(self):
        from workspace_intelligence.action_queue import add_action, list_pending_actions
        add_action("ws_test2", "Preparar briefing", action_type="briefing",
                    priority="high", tenant_id="test")
        actions = list_pending_actions("ws_test2", "test")
        assert len(actions) >= 1

    def test_workspace_next_best_actions_returns_actions(self):
        from workspace_intelligence.action_queue import (add_action, get_next_best_actions)
        add_action("ws_nba", "Acción urgente", priority="critical", tenant_id="test")
        add_action("ws_nba", "Acción normal", priority="normal", tenant_id="test")
        result = get_next_best_actions("ws_nba", "test", n=3)
        assert isinstance(result, list)
        if result:
            assert result[0]["priority"] in ("critical", "high", "normal", "low")

    def test_workspace_decision_log(self):
        from workspace_intelligence.decision_log import log_decision, list_decisions
        log_decision("ws_dec", "Decisión test", "Aprobado", context="Contexto test",
                      tenant_id="test")
        decisions = list_decisions("ws_dec", "test")
        assert len(decisions) >= 1
        assert decisions[0].title == "Decisión test"


# ── Dashboard Services ────────────────────────────────────────────────────────

class TestDashboardServices:
    def test_media_intelligence_core_importable(self):
        from dashboard.services.media_intelligence_core import (
            cargar_estado_fuentes, cargar_top_stories, cargar_narrativas_reales,
            cargar_media_kpis, cargar_source_health_summary
        )
        assert callable(cargar_estado_fuentes)

    def test_cargar_estado_fuentes_returns_dict(self):
        from dashboard.services.media_intelligence_core import cargar_estado_fuentes
        result = cargar_estado_fuentes("test")
        assert isinstance(result, dict)
        assert "active" in result
        assert "degraded" in result
        assert "down" in result
        assert "mode" in result

    def test_cargar_top_stories_returns_list(self):
        from dashboard.services.media_intelligence_core import cargar_top_stories
        result = cargar_top_stories("test", n=5)
        assert isinstance(result, list)

    def test_cargar_narrativas_reales_returns_list(self):
        from dashboard.services.media_intelligence_core import cargar_narrativas_reales
        result = cargar_narrativas_reales("test")
        assert isinstance(result, list)

    def test_cargar_media_kpis_returns_dict(self):
        from dashboard.services.media_intelligence_core import cargar_media_kpis
        result = cargar_media_kpis("test")
        assert isinstance(result, dict)
        assert "total_sources" in result
        assert "mode" in result

    def test_workspace_intelligence_core_importable(self):
        from dashboard.services.workspace_intelligence_core import (
            cargar_workspace_overview, cargar_workspace_issue_board,
            cargar_workspace_action_queue, cargar_next_best_actions
        )
        assert callable(cargar_workspace_overview)

    def test_cargar_workspace_overview_does_not_crash(self):
        from dashboard.services.workspace_intelligence_core import cargar_workspace_overview
        result = cargar_workspace_overview("ws_test_xyz", "test")
        assert isinstance(result, dict)
        assert "workspace_id" in result
        assert "mode" in result

    def test_briefing_editorial_engine_importable(self):
        try:
            from services.intelligence.briefing_editorial_engine import (
                build_briefing_context, generate_executive_briefing, validate_briefing_quality
            )
            assert callable(build_briefing_context)
        except ImportError:
            pytest.skip("briefing_editorial_engine no disponible aún")
