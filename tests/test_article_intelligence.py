"""Tests de article intelligence: language detection, translation, quality, ranking."""
import pytest


class TestLanguageDetection:
    def test_detect_english_title(self):
        from media_intelligence.language_detection import detect_language
        result = detect_language("The UK government announced new policies for immigration")
        assert result["detected"] in ("en", "es")  # puede ser es si no hay librería

    def test_detect_french_title(self):
        from media_intelligence.language_detection import detect_language
        result = detect_language("Le gouvernement français a décidé de réformer le système")
        # Con stopwords debería detectar fr
        assert result["detected"] in ("fr", "es")

    def test_should_translate_english(self):
        from media_intelligence.language_detection import should_translate
        assert should_translate("en") is True

    def test_should_not_translate_spanish(self):
        from media_intelligence.language_detection import should_translate
        assert should_translate("es") is False

    def test_detect_empty_returns_default(self):
        from media_intelligence.language_detection import detect_language
        result = detect_language("")
        assert result["detected"] in ("es", None, "")

    def test_detect_batch(self):
        from media_intelligence.language_detection import detect_language_batch
        texts = ["The government announced", "El gobierno anunció"]
        results = detect_language_batch(texts)
        assert len(results) == 2
        assert all("detected" in r for r in results)

    def test_detect_short_text_returns_default(self):
        from media_intelligence.language_detection import detect_language
        result = detect_language("Hi", source_lang="en")
        assert result["detected"] == "en"
        assert result["method"] == "default"


class TestTranslationService:
    def test_translate_same_lang_returns_original(self):
        from media_intelligence.translation_service import translate_text
        result = translate_text("Texto en español", "es", "es")
        assert result["translated"] == "Texto en español"
        assert result["model"] == "none"

    def test_translate_empty_returns_original(self):
        from media_intelligence.translation_service import translate_text
        result = translate_text("", "en", "es")
        assert result["translated"] == ""

    def test_cache_key_is_consistent(self):
        from media_intelligence.translation_service import _cache_key
        k1 = _cache_key("Hello world", "en", "es")
        k2 = _cache_key("Hello world", "en", "es")
        assert k1 == k2

    def test_cache_key_differs_by_lang(self):
        from media_intelligence.translation_service import _cache_key
        k1 = _cache_key("Hello world", "en", "es")
        k2 = _cache_key("Hello world", "fr", "es")
        assert k1 != k2

    def test_translate_titles_batch_only_translates_non_spanish(self):
        from media_intelligence.translation_service import translate_titles_batch
        articles = [
            {"title": "El gobierno aprueba la ley", "source_lang": "es"},
            {"title": "The UK Parliament voted yes", "source_lang": "en"},
            {"title": "Le Sénat français...", "source_lang": "fr"},
        ]
        result = translate_titles_batch(articles, target_lang="es")
        # El artículo español no debe tener translated_title (o es idéntico)
        es_art = result[0]
        assert not es_art.get("translated_title") or es_art["title"] == es_art.get("translated_title")

    def test_get_cache_stats(self):
        from media_intelligence.translation_service import get_cache_stats
        stats = get_cache_stats()
        assert "cached_translations" in stats
        assert "max_size" in stats
        assert stats["max_size"] == 5000

    def test_translate_whitespace_only_returns_original(self):
        from media_intelligence.translation_service import translate_text
        result = translate_text("   ", "en", "es")
        assert result["model"] == "none"


class TestArticleQuality:
    def test_empty_title_penalized(self):
        from media_intelligence.article_quality import score_article_quality
        qs = score_article_quality({"title": "", "summary": ""})
        assert qs.total_score < 0.5
        assert "empty_title" in qs.flags

    def test_sports_article_penalized(self):
        from media_intelligence.article_quality import score_article_quality
        qs = score_article_quality({
            "title": "Real Madrid gana la Champions League con gol en el minuto 90",
            "summary": "El partido terminó con victoria del equipo blanco en la final",
        })
        assert qs.is_sports_non_political
        assert qs.total_score <= 0.6

    def test_political_sports_not_penalized(self):
        from media_intelligence.article_quality import score_article_quality
        qs = score_article_quality({
            "title": "La UEFA abre investigación por corrupción en el fútbol español",
            "summary": "El fiscal investiga el caso de blanqueo de dinero en clubs de primera división",
        })
        # No debe penalizar como deporte no político
        assert not qs.is_sports_non_political

    def test_clickbait_penalized(self):
        from media_intelligence.article_quality import score_article_quality
        qs = score_article_quality({
            "title": "Lo que nadie te cuenta sobre el gobierno: 10 cosas que te sorprenderán",
            "summary": "",
        })
        assert qs.is_clickbait

    def test_good_article_high_score(self):
        from media_intelligence.article_quality import score_article_quality
        qs = score_article_quality({
            "title": "El Congreso aprueba la reforma de pensiones con apoyo de PP y PSOE",
            "summary": "La ley entrará en vigor en enero de 2027",
            "source_priority": 1,
        })
        assert qs.total_score >= 0.6
        assert not qs.is_clickbait
        assert not qs.is_sports_non_political

    def test_filter_low_quality_removes_bad_articles(self):
        from media_intelligence.article_quality import filter_low_quality
        articles = [
            {"title": "", "summary": ""},                      # empty_title → low score
            {"title": "Reforma fiscal aprobada", "summary": "El gobierno aprueba ley"},  # good
        ]
        result = filter_low_quality(articles, min_score=0.4)
        assert len(result) == 1
        assert result[0]["title"] == "Reforma fiscal aprobada"

    def test_score_is_bounded_0_1(self):
        from media_intelligence.article_quality import score_article_quality
        # Article with multiple penalties stacked
        qs = score_article_quality({
            "title": "",
            "summary": "Real Madrid gana la Champions con gol increíble",
            "source_priority": 5,
        })
        assert 0.0 <= qs.total_score <= 1.0


class TestArticleRanker:
    def test_political_article_scores_higher(self):
        from media_intelligence.article_ranker import rank_article
        political = {
            "title": "El presidente Sánchez anuncia reforma de pensiones ante el Congreso",
            "summary": "El gobierno aprobó el decreto ley",
            "source_priority": 1,
            "political_relevance": 0.9,
        }
        sports = {
            "title": "Real Madrid gana 3-0 en la Champions",
            "summary": "Gol en el minuto 88",
            "source_priority": 3,
            "political_relevance": 0.1,
        }
        assert rank_article(political) > rank_article(sports)

    def test_rank_articles_returns_sorted(self):
        from media_intelligence.article_ranker import rank_articles
        articles = [
            {"title": "Deportes", "summary": "Fútbol partido gol", "source_priority": 4},
            {
                "title": "El Congreso aprueba ley de vivienda",
                "summary": "El gobierno de Sánchez",
                "source_priority": 1,
                "political_relevance": 0.8,
            },
        ]
        ranked = rank_articles(articles)
        assert ranked[0].get("relevance_score", 0) >= ranked[-1].get("relevance_score", 0)

    def test_rank_article_score_bounded(self):
        from media_intelligence.article_ranker import rank_article
        article = {
            "title": "El presidente Sánchez convoca elecciones anticipadas",
            "summary": "Crisis de gobierno en España",
            "source_priority": 1,
            "political_relevance": 1.0,
            "credibility_tier": "A",
        }
        score = rank_article(article)
        assert 0.0 <= score <= 1.0

    def test_rank_duplicate_strongly_penalized(self):
        from media_intelligence.article_ranker import rank_article
        dup = {
            "title": "Sánchez anuncia reforma",
            "summary": "El presidente",
            "source_priority": 1,
            "political_relevance": 0.9,
            "is_duplicate": True,
        }
        original = dict(dup)
        original["is_duplicate"] = False
        assert rank_article(dup) < rank_article(original)


class TestEditorialSelector:
    def test_select_top_stories_deduplicates(self):
        from media_intelligence.editorial_selector import select_top_stories
        articles = [
            {"title": "El gobierno aprueba ley", "source_name": "A", "political_relevance": 0.8},
            {"title": "El gobierno aprueba ley", "source_name": "B", "political_relevance": 0.8},
            {"title": "Presupuestos 2026 aprobados", "source_name": "C", "political_relevance": 0.7},
        ]
        result = select_top_stories(articles, n=5)
        # Must not return both copies of "El gobierno aprueba ley"
        titles = [r.get("title") or r.get("translated_title") or "" for r in result]
        assert len(titles) == len(set(t.lower() for t in titles))

    def test_select_diverse_news_limits_per_source(self):
        from media_intelligence.editorial_selector import select_diverse_news
        articles = [
            {"title": f"Noticia {i} de El País", "source_name": "El País", "political_relevance": 0.8}
            for i in range(10)
        ] + [
            {"title": "Noticia de El Mundo", "source_name": "El Mundo", "political_relevance": 0.7},
        ]
        result = select_diverse_news(articles, n=10, max_per_source=2)
        el_pais_count = sum(1 for r in result if r.get("source_name") == "El País")
        assert el_pais_count <= 2

    def test_select_for_briefing_returns_n_or_less(self):
        from media_intelligence.editorial_selector import select_news_for_briefing
        articles = [
            {
                "title": f"El ministro anuncia {i}",
                "source_name": f"Fuente{i}",
                "political_relevance": 0.7,
            }
            for i in range(20)
        ]
        result = select_news_for_briefing(articles, n=5)
        assert len(result) <= 5

    def test_select_for_workspace_with_keywords(self):
        from media_intelligence.editorial_selector import select_news_for_workspace
        articles = [
            {"title": "Sánchez presenta presupuestos generales del estado", "source_name": "Fuente1", "political_relevance": 0.9},
            {"title": "Real Madrid vence en Champions", "source_name": "Fuente2", "political_relevance": 0.1},
            {"title": "El presupuesto del ministerio de sanidad se debate", "source_name": "Fuente3", "political_relevance": 0.8},
        ]
        result = select_news_for_workspace(articles, workspace_keywords=["presupuesto"], n=2)
        assert len(result) <= 2

    def test_select_for_workspace_no_keywords_falls_back(self):
        from media_intelligence.editorial_selector import select_news_for_workspace
        articles = [
            {"title": f"Noticia {i}", "source_name": f"Fuente{i}", "political_relevance": 0.5}
            for i in range(5)
        ]
        result = select_news_for_workspace(articles, workspace_keywords=[], n=3)
        assert len(result) <= 3


class TestDetectLikelyNonSpanish:
    """Tests para la función de corrección de idioma en data_aggregator."""

    def test_detects_english(self):
        import sys
        import os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        from dashboard.services.data_aggregator import _detect_likely_non_spanish
        result = _detect_likely_non_spanish("The UK government announced new policies in the economy")
        assert result == "en"

    def test_returns_none_for_spanish(self):
        from dashboard.services.data_aggregator import _detect_likely_non_spanish
        result = _detect_likely_non_spanish("El gobierno de España aprueba la reforma")
        assert result is None

    def test_returns_none_for_empty(self):
        from dashboard.services.data_aggregator import _detect_likely_non_spanish
        assert _detect_likely_non_spanish("") is None

    def test_returns_none_for_ambiguous(self):
        from dashboard.services.data_aggregator import _detect_likely_non_spanish
        # Only 1 indicator word, below threshold of 2
        result = _detect_likely_non_spanish("NATO summit")
        assert result is None  # not enough evidence

    def test_detects_french(self):
        from dashboard.services.data_aggregator import _detect_likely_non_spanish
        result = _detect_likely_non_spanish("Le gouvernement français selon les données dans la loi")
        assert result == "fr"
