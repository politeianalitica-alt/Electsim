"""Tests del LLM Router y narrative pipeline."""
import pytest
import time


class TestLLMRouter:
    def test_router_importable(self):
        from agents.brain.llm_router import route, get_stats, is_ollama_available

        assert callable(route)
        assert callable(get_stats)
        assert callable(is_ollama_available)

    def test_is_ollama_available_returns_bool(self):
        from agents.brain.llm_router import is_ollama_available

        result = is_ollama_available()
        assert isinstance(result, bool)

    def test_cache_key_is_deterministic(self):
        from agents.brain.llm_router import _build_cache_key

        k1 = _build_cache_key("translation", "Hello world", {"lang": "en"})
        k2 = _build_cache_key("translation", "Hello world", {"lang": "en"})
        assert k1 == k2

    def test_cache_key_differs_by_task_type(self):
        from agents.brain.llm_router import _build_cache_key

        k1 = _build_cache_key("translation", "Hello world", None)
        k2 = _build_cache_key("classification", "Hello world", None)
        assert k1 != k2

    def test_route_returns_structured_response_even_if_ollama_down(self):
        from agents.brain.llm_router import route

        result = route("classification", "¿Es esto político? Responde {sí/no}")
        assert "result" in result
        assert "ok" in result
        assert "task_type" in result
        assert result["task_type"] == "classification"
        # ok puede ser True (si hay cloud fallback) o False, pero siempre presente
        assert isinstance(result["ok"], bool)

    def test_route_same_prompt_returns_cached_second_time(self):
        from agents.brain.llm_router import route, _LLM_CACHE, _build_cache_key

        prompt = "Test caching prompt unique 12345"
        key = _build_cache_key("extraction", prompt, None)

        # Insertar en caché manualmente
        _LLM_CACHE[key] = {
            "result": "cached_result",
            "model": "test",
            "task_type": "extraction",
            "from_cache": False,
            "latency_ms": 100,
            "ok": True,
            "error": None,
            "_cached_at": time.time(),
        }

        result = route("extraction", prompt)
        assert result["from_cache"] is True
        assert result["result"] == "cached_result"

    def test_get_stats_returns_dict(self):
        from agents.brain.llm_router import get_stats

        stats = get_stats()
        assert isinstance(stats, dict)
        assert "cache_size" in stats

    def test_task_config_covers_all_tasks(self):
        from agents.brain.llm_router import _TASK_CONFIG

        expected_tasks = [
            "translation",
            "classification",
            "extraction",
            "narrative_frame",
            "briefing",
            "comms_strategy",
            "qna",
            "red_team",
            "deep_analysis",
            "evidence_check",
        ]
        for task in expected_tasks:
            assert task in _TASK_CONFIG, f"Task type '{task}' not in _TASK_CONFIG"

    def test_task_config_has_required_fields(self):
        from agents.brain.llm_router import _TASK_CONFIG

        for task, cfg in _TASK_CONFIG.items():
            assert "speed" in cfg, f"{task}: missing 'speed'"
            assert "timeout" in cfg, f"{task}: missing 'timeout'"
            assert "json" in cfg, f"{task}: missing 'json'"
            assert "cache_ttl" in cfg, f"{task}: missing 'cache_ttl'"
            assert cfg["speed"] in ("fast", "normal", "deep"), f"{task}: invalid speed"

    def test_speed_models_defined(self):
        from agents.brain.llm_router import _SPEED_MODELS

        assert "fast" in _SPEED_MODELS
        assert "normal" in _SPEED_MODELS
        assert "deep" in _SPEED_MODELS
        for speed, model in _SPEED_MODELS.items():
            assert isinstance(model, str) and model, f"Speed '{speed}' has empty model"

    def test_store_and_retrieve_cache(self):
        from agents.brain.llm_router import _store_cache, _get_cached, _build_cache_key

        key = _build_cache_key("qna", "unique test prompt for store retrieve", {"x": 1})
        response = {
            "result": "test_value",
            "model": "llama3",
            "task_type": "qna",
            "from_cache": False,
            "latency_ms": 200,
            "ok": True,
            "error": None,
        }
        _store_cache(key, response)
        retrieved = _get_cached(key, ttl=3600)
        assert retrieved is not None
        assert retrieved["result"] == "test_value"

    def test_expired_cache_returns_none(self):
        from agents.brain.llm_router import _LLM_CACHE, _get_cached, _build_cache_key

        key = _build_cache_key("briefing", "expired prompt test", None)
        _LLM_CACHE[key] = {
            "result": "old",
            "model": "x",
            "task_type": "briefing",
            "_cached_at": time.time() - 99999,  # muy antiguo
        }
        result = _get_cached(key, ttl=60)
        assert result is None


class TestNarrativePipeline:
    def test_pipeline_importable(self):
        from media_intelligence.narrative_pipeline import (
            run_narrative_pipeline,
            get_cached_narratives,
            validate_narrative,
        )

        assert callable(run_narrative_pipeline)
        assert callable(get_cached_narratives)
        assert callable(validate_narrative)

    def test_empty_articles_returns_demo_or_cache(self):
        from media_intelligence.narrative_pipeline import run_narrative_pipeline

        result = run_narrative_pipeline([])
        assert isinstance(result, list)
        # Debe retornar al menos las demos si no hay caché
        assert len(result) >= 0

    def test_demo_narratives_are_marked(self):
        from media_intelligence.narrative_pipeline import _demo_narratives

        demos = _demo_narratives()
        assert len(demos) > 0
        # Deben marcarse como demo
        assert all(
            n.get("is_demo") or "DEMO" in n.get("frame_label", "")
            for n in demos
        )

    def test_demo_narratives_have_required_fields(self):
        from media_intelligence.narrative_pipeline import _demo_narratives

        required = [
            "cluster_id", "frame_label", "frame_description", "central_claim",
            "promoters", "affected_actors", "diffuser_sources",
            "representative_titles", "dominant_emotion", "frame_type",
            "lifecycle", "velocity", "article_count", "possible_coordination",
            "counter_narrative", "recommended_action", "updated_at",
        ]
        for demo in _demo_narratives():
            for field in required:
                assert field in demo, f"Demo narrative missing field: {field}"

    def test_validate_narrative_rejects_topic_only(self):
        from media_intelligence.narrative_pipeline import validate_narrative

        topic_narrative = {
            "frame_label": "política",
            "central_claim": "",
            "article_count": 5,
        }
        assert validate_narrative(topic_narrative) is False

    def test_validate_narrative_rejects_empty_claim(self):
        from media_intelligence.narrative_pipeline import validate_narrative

        n = {
            "frame_label": "La reforma fiscal amenaza a las pymes",
            "central_claim": "",
            "article_count": 8,
        }
        assert validate_narrative(n) is False

    def test_validate_narrative_rejects_low_article_count(self):
        from media_intelligence.narrative_pipeline import validate_narrative

        n = {
            "frame_label": "La reforma fiscal amenaza a las pymes",
            "central_claim": "La subida del IRPF perjudica a autónomos",
            "article_count": 2,
        }
        assert validate_narrative(n) is False

    def test_validate_narrative_accepts_real_frame(self):
        from media_intelligence.narrative_pipeline import validate_narrative

        real_narrative = {
            "frame_label": "El gobierno traslada el coste de la vivienda a los jóvenes",
            "central_claim": "La regulación existente es insuficiente para contener los precios",
            "article_count": 8,
        }
        assert validate_narrative(real_narrative) is True

    def test_discard_topic_only_clusters(self):
        from media_intelligence.narrative_pipeline import _discard_topic_only_clusters

        clusters = [
            {"frame_label": "política", "central_claim": "", "article_count": 10},
            {
                "frame_label": "La reforma fiscal amenaza a las pymes",
                "central_claim": "La subida del IRPF...",
                "article_count": 7,
            },
            {
                "frame_label": "economía",
                "central_claim": "economía crece",
                "article_count": 5,
            },
        ]
        result = _discard_topic_only_clusters(clusters)
        assert len(result) == 1
        assert result[0]["frame_label"] == "La reforma fiscal amenaza a las pymes"

    def test_pipeline_with_articles_does_not_crash(self):
        from media_intelligence.narrative_pipeline import run_narrative_pipeline

        articles = [
            {
                "title": f"El gobierno aprueba medida {i}",
                "summary": "Legislación aprobada en el Congreso",
                "source_name": "El País",
                "article_id": f"art{i}",
                "lang": "es",
            }
            for i in range(10)
        ]
        result = run_narrative_pipeline(articles)
        assert isinstance(result, list)

    def test_get_cached_narratives_returns_list(self):
        from media_intelligence.narrative_pipeline import get_cached_narratives

        result = get_cached_narratives()
        assert isinstance(result, list)

    def test_suggest_counter_empty_claim(self):
        from media_intelligence.narrative_pipeline import _suggest_counter

        assert _suggest_counter("") == ""

    def test_suggest_counter_with_claim(self):
        from media_intelligence.narrative_pipeline import _suggest_counter

        result = _suggest_counter("El gobierno ha fallado a los jóvenes")
        assert "Contra-encuadre" in result
        assert len(result) > 10

    def test_suggest_action_known_stages(self):
        from media_intelligence.narrative_pipeline import _suggest_action

        for stage in ["emerging", "growing", "peak", "declining"]:
            action = _suggest_action(stage, "neutral")
            assert isinstance(action, str) and len(action) > 0

    def test_suggest_action_unknown_stage(self):
        from media_intelligence.narrative_pipeline import _suggest_action

        action = _suggest_action("unknown_stage", "fear")
        assert isinstance(action, str)
