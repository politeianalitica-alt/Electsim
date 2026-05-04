"""
Tests del Bloque 2 Core Medios & Narrativa.

Cubre:
  - Schemas Pydantic (MediaSource, RawMediaItem, MediaItem, NarrativeCluster)
  - MediaAdapter: hash, deduplicación, fecha, limpieza HTML
  - Análisis de sentimiento (modo fast)
  - ActorMentionExtractor
  - TopicClassifier
  - NarrativeClusterer: fingerprint scoring y asignación
  - MediaMonitor: dry_run sin BD
  - RSSMediaClient: parse XML
  - media_core service: no crash sin BD

100% offline — no HTTP, no BD.
"""
from __future__ import annotations

import pytest
from datetime import datetime, timezone


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def raw_media_item():
    from etl.sources.media.schemas import RawMediaItem
    return RawMediaItem(
        source="El País",
        source_url="https://elpais.com",
        source_region="local_spain",
        source_country="Spain",
        source_lat=40.42,
        source_lon=-3.70,
        title="Pedro Sánchez anuncia una reforma fiscal histórica",
        url="https://elpais.com/politica/2026-05-01/sanchez-reforma-fiscal.html",
        published_raw="Thu, 01 May 2026 09:00:00 +0200",
        summary="El presidente del Gobierno ha anunciado una reforma del IRPF que afectará a las grandes fortunas.",
        language="es",
    )


@pytest.fixture
def media_adapter():
    from etl.sources.media.media_adapter import MediaAdapter
    return MediaAdapter()


@pytest.fixture
def extractor():
    from etl.sources.media.actor_mentions import ActorMentionExtractor
    return ActorMentionExtractor()


@pytest.fixture
def clusterer():
    from etl.sources.media.narrative_clusterer import NarrativeClusterer
    return NarrativeClusterer(min_score=1.0)


# ── Tests de Schemas ──────────────────────────────────────────────────────────

class TestMediaSchemas:

    def test_media_source_from_feed_dict(self):
        from etl.sources.media.schemas import MediaSource
        d = {
            "name": "El País",
            "url": "https://elpais.com",
            "rss": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
            "geo_region": "local_spain",
            "country": "Spain",
            "lat": 40.42,
            "lon": -3.70,
            "lang": "es",
        }
        src = MediaSource.from_feed_dict(d)
        assert src.name == "El País"
        assert src.rss is not None
        assert src.language == "es"
        assert src.lat == 40.42

    def test_raw_media_item_defaults(self):
        from etl.sources.media.schemas import RawMediaItem
        item = RawMediaItem(source="test", title="Título de prueba")
        assert item.language == "es"
        assert item.url == ""
        assert item.raw_payload == {}

    def test_media_item_to_db_dict_has_required_fields(self):
        from etl.sources.media.schemas import MediaItem
        item = MediaItem(
            source="El País",
            title="Test title",
            content_hash="abc123",
            title_hash="def456",
        )
        d = item.to_db_dict()
        assert "source" in d
        assert "content_hash" in d
        assert "title" in d
        assert "actors" in d
        assert "raw_payload" in d
        assert isinstance(d["actors"], list)

    def test_narrative_cluster_risk_levels(self):
        from etl.sources.media.schemas import NarrativeCluster
        cluster = NarrativeCluster(id="test", label="Test", risk_level="CRÍTICO")
        assert cluster.risk_level == "CRÍTICO"

    def test_narrative_cluster_item_fields(self):
        from etl.sources.media.schemas import NarrativeClusterItem
        ci = NarrativeClusterItem(cluster_id="crisis_economica", content_hash="abc", score=4.5)
        assert ci.cluster_id == "crisis_economica"
        assert ci.score == 4.5


# ── Tests de MediaAdapter ─────────────────────────────────────────────────────

class TestMediaAdapter:

    def test_adapts_raw_item(self, media_adapter, raw_media_item):
        item = media_adapter.adapt(raw_media_item)
        assert item.source == "El País"
        assert "Sánchez" in item.title
        assert item.content_hash != ""
        assert len(item.content_hash) == 64  # SHA-256

    def test_title_hash_differs_from_content_hash(self, media_adapter, raw_media_item):
        item = media_adapter.adapt(raw_media_item)
        # content_hash es del título normalizado, title_hash del exacto
        assert item.content_hash != item.title_hash  # normalmente difieren

    def test_parses_published_at(self, media_adapter, raw_media_item):
        item = media_adapter.adapt(raw_media_item)
        assert item.published_at is not None
        assert item.published_at.year == 2026
        assert item.published_at.month == 5

    def test_strips_html_from_summary(self, media_adapter):
        from etl.sources.media.schemas import RawMediaItem
        raw = RawMediaItem(
            source="test",
            title="Título",
            summary="<p>Texto con <strong>HTML</strong> embebido</p>",
        )
        item = media_adapter.adapt(raw)
        assert "<p>" not in (item.summary or "")
        assert "Texto con" in (item.summary or "")

    def test_deduplication_in_adapt_many(self, media_adapter, raw_media_item):
        items = media_adapter.adapt_many([raw_media_item, raw_media_item, raw_media_item])
        assert len(items) == 1  # duplicados eliminados

    def test_adapt_many_no_dedup(self, media_adapter, raw_media_item):
        items = media_adapter.adapt_many([raw_media_item, raw_media_item], deduplicate=False)
        assert len(items) == 2

    def test_truncates_long_title(self, media_adapter):
        from etl.sources.media.schemas import RawMediaItem
        raw = RawMediaItem(source="test", title="A" * 5000)
        item = media_adapter.adapt(raw)
        assert len(item.title) <= 2000

    def test_handles_missing_fields(self, media_adapter):
        from etl.sources.media.schemas import RawMediaItem
        raw = RawMediaItem(source="test", title="Minimal")
        item = media_adapter.adapt(raw)
        assert item.published_at is None
        assert item.url == ""
        assert item.summary is None


# ── Tests de Sentimiento ──────────────────────────────────────────────────────

class TestSentiment:

    def test_positivo(self):
        from etl.sources.media.sentiment import analyze_sentiment
        sig = analyze_sentiment("El gobierno logra un acuerdo histórico de crecimiento y éxito")
        assert sig.sentiment_label == "positivo"
        assert sig.sentiment_score > 0

    def test_negativo(self):
        from etl.sources.media.sentiment import analyze_sentiment
        sig = analyze_sentiment("Crisis grave de corrupción, fraude y escándalo político")
        assert sig.sentiment_label == "negativo"
        assert sig.sentiment_score < 0

    def test_neutral(self):
        from etl.sources.media.sentiment import analyze_sentiment
        sig = analyze_sentiment("El pleno del congreso debate la iniciativa parlamentaria")
        assert sig.sentiment_label in ("positivo", "negativo", "neutral")

    def test_empty_text_returns_neutral(self):
        from etl.sources.media.sentiment import analyze_sentiment
        sig = analyze_sentiment("")
        assert sig.sentiment_label == "neutral"

    def test_returns_text_signal(self):
        from etl.sources.media.sentiment import analyze_sentiment
        from etl.sources.media.schemas import TextSignal
        sig = analyze_sentiment("Test texto")
        assert isinstance(sig, TextSignal)
        assert sig.analysis_mode == "fast"

    def test_toxicity_score_range(self):
        from etl.sources.media.sentiment import analyze_sentiment
        sig = analyze_sentiment("El corrupto traidor es un estúpido idiota")
        assert 0.0 <= (sig.toxicity_score or 0) <= 1.0


# ── Tests de ActorMentionExtractor ────────────────────────────────────────────

class TestActorMentions:

    def test_detects_sanchez(self, extractor):
        mentions = extractor.extract("Pedro Sánchez anuncia nuevas medidas económicas")
        names = [m.actor_name for m in mentions]
        assert "Pedro Sánchez" in names

    def test_detects_party(self, extractor):
        parties = extractor.extract_parties("El PP y el PSOE negociaron durante horas")
        assert "PP" in parties
        assert "PSOE" in parties

    def test_detects_institution(self, extractor):
        institutions = extractor.extract_institutions("El Congreso aprobó la reforma por mayoría")
        assert "Congreso de los Diputados" in institutions

    def test_no_false_positives_on_empty(self, extractor):
        mentions = extractor.extract("")
        assert mentions == []

    def test_mention_count_above_one(self, extractor):
        text = "Sánchez habló. Sánchez insistió. Sánchez confirmó."
        mentions = extractor.extract(text)
        sanchez = next((m for m in mentions if m.actor_name == "Pedro Sánchez"), None)
        assert sanchez is not None
        assert sanchez.mention_count >= 3

    def test_returns_media_actor_mention_type(self, extractor):
        from etl.sources.media.schemas import MediaActorMention
        mentions = extractor.extract("El PP votó en contra", content_hash="test123")
        assert all(isinstance(m, MediaActorMention) for m in mentions)
        if mentions:
            assert mentions[0].content_hash == "test123"


# ── Tests de TopicClassifier ──────────────────────────────────────────────────

class TestTopicClassifier:

    def test_detecta_economia(self):
        from etl.sources.media.topic_classifier import classify_topics
        topics = classify_topics("El paro sube y el IPC se dispara en el primer trimestre")
        assert "economía" in topics

    def test_detecta_vivienda(self):
        from etl.sources.media.topic_classifier import classify_topics
        topics = classify_topics("El precio del alquiler alcanza máximos históricos en Madrid")
        assert "vivienda" in topics

    def test_max_4_topics(self):
        from etl.sources.media.topic_classifier import classify_topics
        texto = "economía paro inflación vivienda alquiler sanidad hospital energía clima terrorismo"
        topics = classify_topics(texto)
        assert len(topics) <= 4

    def test_returns_empty_on_empty_text(self):
        from etl.sources.media.topic_classifier import classify_topics
        assert classify_topics("") == []

    def test_detecta_politica(self):
        from etl.sources.media.topic_classifier import classify_topics
        topics = classify_topics("El Congreso debate la reforma constitucional del gobierno")
        assert "política" in topics


# ── Tests de NarrativeClusterer ───────────────────────────────────────────────

class TestNarrativeClusterer:

    def test_assign_cluster_economia(self, clusterer):
        from etl.sources.media.schemas import MediaItem
        item = MediaItem(
            source="test",
            title="Inflación y paro suben: crisis económica profunda en España",
            content_hash="abc001",
        )
        items, cluster_items = clusterer.assign_clusters([item])
        assert len(cluster_items) >= 1
        assert items[0].narrative_cluster_id is not None

    def test_assign_fingerprint_cluster_direct(self):
        from etl.sources.media.narrative_clusterer import assign_fingerprint_cluster
        cid, score = assign_fingerprint_cluster(
            "La corrupción y el fraude dominan la agenda política"
        )
        assert cid == "corrupcion"
        assert score > 0

    def test_no_cluster_for_irrelevant_text(self):
        from etl.sources.media.narrative_clusterer import assign_fingerprint_cluster
        cid, score = assign_fingerprint_cluster("El tiempo será soleado mañana en la costa")
        assert cid is None or score == 0.0

    def test_fingerprints_have_ids(self):
        from etl.sources.media.narrative_clusterer import NARRATIVA_FINGERPRINTS
        for fp in NARRATIVA_FINGERPRINTS:
            assert "id" in fp
            assert "nombre" in fp
            assert "keywords" in fp

    def test_build_cluster_summaries(self, clusterer, media_adapter):
        from etl.sources.media.schemas import RawMediaItem, MediaItem, NarrativeClusterItem
        items = [
            MediaItem(source="test", title="Inflación y paro: crisis en España", content_hash=f"h{i}")
            for i in range(3)
        ]
        cluster_items = [
            NarrativeClusterItem(cluster_id="crisis_economica", content_hash=f"h{i}", score=3.0)
            for i in range(3)
        ]
        for item in items:
            item.narrative_cluster_id = "crisis_economica"
        clusters = clusterer.build_cluster_summaries(items, cluster_items)
        assert any(c.id == "crisis_economica" for c in clusters)


# ── Tests de MediaMonitor (dry_run) ──────────────────────────────────────────

class TestMediaMonitorDryRun:

    def test_dry_run_returns_stats(self, monkeypatch):
        """MediaMonitor en dry_run no debe crashear ni necesitar BD."""
        from etl.sources.media.media_monitor import MediaMonitor

        # Mock RSSMediaClient.fetch_all para no hacer requests reales
        from etl.sources.media import rss_client
        monkeypatch.setattr(
            rss_client.RSSMediaClient,
            "fetch_all",
            lambda self, **kw: [],
        )
        monitor = MediaMonitor(engine=None, dry_run=True)
        stats = monitor.run()
        assert "n_fetched" in stats
        assert "n_new" in stats
        assert stats["n_fetched"] == 0

    def test_dry_run_with_mock_items(self, monkeypatch):
        from etl.sources.media.media_monitor import MediaMonitor
        from etl.sources.media.schemas import RawMediaItem
        from etl.sources.media import rss_client

        mock_items = [
            RawMediaItem(source="Test", title=f"Artículo {i}", url=f"https://test.com/{i}")
            for i in range(5)
        ]
        monkeypatch.setattr(
            rss_client.RSSMediaClient,
            "fetch_all",
            lambda self, **kw: mock_items,
        )
        monitor = MediaMonitor(engine=None, dry_run=True)
        stats = monitor.run(run_clustering=True)
        assert stats["n_fetched"] == 5
        assert stats["n_new"] == 5  # dry_run account all as new


# ── Tests del parser RSS XML ──────────────────────────────────────────────────

class TestRSSParser:

    def test_parses_rss2_feed(self):
        from etl.sources.media.rss_client import _parse_rss_xml
        xml = """<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <item>
              <title>Noticia de prueba</title>
              <link>https://example.com/1</link>
              <description>Resumen de la noticia</description>
              <pubDate>Mon, 01 May 2026 10:00:00 +0000</pubDate>
            </item>
            <item>
              <title>Segunda noticia</title>
              <link>https://example.com/2</link>
            </item>
          </channel>
        </rss>"""
        items = _parse_rss_xml(xml, "test_source")
        assert len(items) == 2
        assert items[0]["title"] == "Noticia de prueba"
        assert items[0]["url"] == "https://example.com/1"
        assert items[0]["summary"] == "Resumen de la noticia"

    def test_parses_atom_feed(self):
        from etl.sources.media.rss_client import _parse_rss_xml
        xml = """<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Atom Test</title>
          <entry>
            <title>Entrada atom</title>
            <link href="https://example.com/atom1"/>
            <published>2026-05-01T10:00:00Z</published>
            <summary>Resumen atom</summary>
          </entry>
        </feed>"""
        items = _parse_rss_xml(xml, "atom_source")
        assert len(items) == 1
        assert items[0]["title"] == "Entrada atom"

    def test_handles_malformed_xml(self):
        from etl.sources.media.rss_client import _parse_rss_xml
        items = _parse_rss_xml("<not valid xml >>>", "bad_source")
        assert items == []

    def test_skips_items_without_title(self):
        from etl.sources.media.rss_client import _parse_rss_xml
        xml = """<rss version="2.0"><channel>
            <item><link>https://x.com</link></item>
            <item><title>Con título</title><link>https://x.com/2</link></item>
        </channel></rss>"""
        items = _parse_rss_xml(xml, "test")
        assert len(items) == 1

    def test_respects_max_items(self):
        from etl.sources.media.rss_client import _parse_rss_xml
        items_xml = "".join(
            f"<item><title>Item {i}</title><link>https://x.com/{i}</link></item>"
            for i in range(30)
        )
        xml = f"<rss version='2.0'><channel>{items_xml}</channel></rss>"
        items = _parse_rss_xml(xml, "test", max_items=5)
        assert len(items) == 5


# ── Tests del servicio sin BD ─────────────────────────────────────────────────

class TestMediaCoreServiceNoDB:

    def test_cargar_kpis_no_crash(self):
        from dashboard.services.media_core import cargar_kpis_medios
        kpis = cargar_kpis_medios()
        assert isinstance(kpis, dict)
        assert "hay_datos" in kpis

    def test_cargar_media_items_no_crash(self):
        from dashboard.services.media_core import cargar_media_items_recientes
        import pandas as pd
        df = cargar_media_items_recientes(limit=10)
        assert isinstance(df, pd.DataFrame)

    def test_cargar_narrativas_no_crash(self):
        from dashboard.services.media_core import cargar_narrativas_activas
        import pandas as pd
        df = cargar_narrativas_activas()
        assert isinstance(df, pd.DataFrame)

    def test_buscar_no_crash(self):
        from dashboard.services.media_core import buscar_media_items
        import pandas as pd
        df = buscar_media_items("vivienda")
        assert isinstance(df, pd.DataFrame)

    def test_cargar_alertas_no_crash(self):
        from dashboard.services.media_core import cargar_alertas_medios
        import pandas as pd
        df = cargar_alertas_medios()
        assert isinstance(df, pd.DataFrame)
