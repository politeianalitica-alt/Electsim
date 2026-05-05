"""Tests de media_intelligence foundation — schemas, source_health, acquisition."""
import pytest


class TestSchemas:
    def test_media_source_health_defaults(self):
        from media_intelligence.schemas import MediaSourceHealth
        h = MediaSourceHealth(source_id="s1", source_name="Test")
        assert h.status == "unknown"
        assert h.articles_last_24h == 0

    def test_media_article_fields(self):
        from media_intelligence.schemas import MediaArticle
        a = MediaArticle(
            article_id="art1",
            source_id="s1",
            source_name="El País",
            title="Test",
            url="https://elpais.com/test",
        )
        assert a.lang == "es"
        assert a.parser_used == "rss"

    def test_media_source_profile_defaults(self):
        from media_intelligence.schemas import MediaSourceProfile
        p = MediaSourceProfile(source_id="p1", name="Test", url="https://test.com")
        assert p.lang == "es"
        assert p.source_priority == 3
        assert p.credibility_tier == "B"

    def test_article_relevance_score(self):
        from media_intelligence.schemas import ArticleRelevanceScore
        rs = ArticleRelevanceScore(article_id="art1", total_score=0.75)
        assert rs.total_score == 0.75
        assert rs.political_relevance == 0.0

    def test_article_quality_score_flags(self):
        from media_intelligence.schemas import ArticleQualityScore
        qs = ArticleQualityScore(article_id="art1", total_score=0.5, flags=["clickbait"])
        assert "clickbait" in qs.flags


class TestSourceHealth:
    def test_record_success(self):
        from media_intelligence.source_health import record_source_success, get_source_health
        h = record_source_success("src_bbc", "BBC", "https://bbc.co.uk/rss", 12, "rss")
        assert h.status == "active"
        assert h.articles_last_24h == 12
        stored = get_source_health("src_bbc")
        assert stored is not None

    def test_record_failure_404(self):
        from media_intelligence.source_health import record_source_failure
        h = record_source_failure("src_bad", "BadSource", "https://bad.com/rss", "404", "Not found", 404)
        assert h.status == "down"
        assert h.error_type == "404"

    def test_record_failure_timeout(self):
        from media_intelligence.source_health import record_source_failure
        h = record_source_failure("src_slow", "SlowSource", None, "timeout", "Request timed out")
        assert h.status == "degraded"

    def test_record_failure_403_needs_html(self):
        from media_intelligence.source_health import record_source_failure
        h = record_source_failure("src_blocked", "Blocked", "https://blocked.com/rss", "403", "Forbidden", 403)
        assert h.status == "blocked"
        assert h.needs_html_scraper is True

    def test_health_summary(self):
        from media_intelligence.source_health import get_health_summary, record_source_success
        record_source_success("src_x", "X", None, 5)
        summary = get_health_summary()
        assert "total" in summary
        assert "active" in summary

    def test_list_active_sources(self):
        from media_intelligence.source_health import record_source_success, list_active_sources
        record_source_success("src_active_1", "Active1", None, 3)
        actives = list_active_sources()
        assert any(h.source_id == "src_active_1" for h in actives)

    def test_list_degraded_sources(self):
        from media_intelligence.source_health import record_source_failure, list_degraded_sources
        record_source_failure("src_deg_1", "Degraded1", None, "timeout", "Slow")
        degraded = list_degraded_sources()
        assert any(h.source_id == "src_deg_1" for h in degraded)


class TestMediaSourcesLang:
    def test_bbc_has_english_lang(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        bbc = next(
            (s for s in MEDIA_FEEDS if "BBC" in s.get("name", "") and "Spain" not in s.get("country", "") and "Brazil" not in s.get("country", "")),
            None,
        )
        if bbc:
            assert bbc.get("lang") == "en", f"BBC lang debería ser 'en', es '{bbc.get('lang')}'"

    def test_le_monde_has_french_lang(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        lm = next((s for s in MEDIA_FEEDS if "Le Monde" in s.get("name", "") and "Afrique" not in s.get("name", "") and "Diplomatique" not in s.get("name", "")), None)
        if lm:
            assert lm.get("lang") == "fr", f"Le Monde debería ser 'fr', es '{lm.get('lang')}'"

    def test_reuters_has_english_lang(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        reuters = next((s for s in MEDIA_FEEDS if "Reuters" in s.get("name", "")), None)
        if reuters:
            assert reuters.get("lang") == "en", f"Reuters debería ser 'en', es '{reuters.get('lang')}'"

    def test_financial_times_has_english_lang(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        ft = next((s for s in MEDIA_FEEDS if "Financial Times" in s.get("name", "")), None)
        if ft:
            assert ft.get("lang") == "en", f"Financial Times debería ser 'en', es '{ft.get('lang')}'"

    def test_der_spiegel_has_german_lang(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        spiegel = next((s for s in MEDIA_FEEDS if "Der Spiegel" in s.get("name", "")), None)
        if spiegel:
            assert spiegel.get("lang") == "de", f"Der Spiegel debería ser 'de', es '{spiegel.get('lang')}'"

    def test_la_repubblica_has_italian_lang(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        rep = next((s for s in MEDIA_FEEDS if "La Repubblica" in s.get("name", "")), None)
        if rep:
            assert rep.get("lang") == "it", f"La Repubblica debería ser 'it', es '{rep.get('lang')}'"

    def test_folha_has_portuguese_lang(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        folha = next((s for s in MEDIA_FEEDS if "Folha" in s.get("name", "")), None)
        if folha:
            assert folha.get("lang") == "pt", f"Folha de São Paulo debería ser 'pt', es '{folha.get('lang')}'"

    def test_al_jazeera_english_has_en_lang(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        aje = next((s for s in MEDIA_FEEDS if "Al Jazeera English" in s.get("name", "")), None)
        if aje:
            assert aje.get("lang") == "en", f"Al Jazeera English debería ser 'en', es '{aje.get('lang')}'"

    def test_al_jazeera_arabic_has_ar_lang(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        aja = next((s for s in MEDIA_FEEDS if "Al Jazeera Arabic" in s.get("name", "")), None)
        if aja:
            assert aja.get("lang") == "ar", f"Al Jazeera Arabic debería ser 'ar', es '{aja.get('lang')}'"

    def test_no_international_source_has_wrong_spanish(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        wrong = []
        intl_keywords = [
            "BBC", "Guardian", "Reuters", "Financial Times", "Le Monde", "Le Figaro",
            "Der Spiegel", "Die Zeit", "La Repubblica", "Corriere", "Folha", "O Globo",
            "Nikkei", "Washington Post", "New York Times", "The Economist",
        ]
        for src in MEDIA_FEEDS:
            name = src.get("name", "")
            if any(kw in name for kw in intl_keywords) and src.get("lang") == "es":
                wrong.append(name)
        assert len(wrong) == 0, f"Fuentes internacionales con lang='es' incorrecto: {wrong}"

    def test_spain_sources_still_have_spanish(self):
        from dashboard.services.media_sources import MEDIA_FEEDS
        spanish_names = ["El País", "El Mundo", "ABC", "La Vanguardia", "El Confidencial"]
        for name in spanish_names:
            src = next((s for s in MEDIA_FEEDS if s.get("name") == name), None)
            if src:
                assert src.get("lang") == "es", f"{name} debería seguir siendo 'es'"
