"""
Monitor de medios en tiempo real.

Extiende BaseRealTimeScraper con shim de fallback.
Orquesta: RSS fetch → normalización → sentimiento → actores → tópicos → clustering → upsert.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# ── Shim de BaseRealTimeScraper ───────────────────────────────────────────────

try:
    from etl.realtime.base import BaseRealTimeScraper as _RealBase
    _HAS_REAL_BASE = True
except Exception:
    _RealBase = None  # type: ignore[assignment]
    _HAS_REAL_BASE = False


class _ShimBase:
    """Shim mínimo cuando etl.realtime no está disponible."""

    def __init__(self, nombre: str = "monitor", engine: Any = None, **kwargs: Any) -> None:
        self.nombre = nombre
        self._log = logging.getLogger(nombre)

    def _alert(self, title: str, body: str, level: str = "INFO") -> None:
        self._log.warning("[ALERT][%s] %s — %s", level, title, body)


_Base = _RealBase if _HAS_REAL_BASE else _ShimBase  # type: ignore[assignment]


# ── MediaMonitor ──────────────────────────────────────────────────────────────

class MediaMonitor(_Base):  # type: ignore[valid-type]
    """
    Monitor de medios: descarga feeds RSS, enriquece artículos y los persiste.

    Orquesta el pipeline completo:
        RSSClient → MediaAdapter → Sentiment → ActorMentions → Topics →
        NarrativeClusterer → upsert BD → alertas
    """

    def __init__(
        self,
        engine: Any = None,
        dry_run: bool = False,
        **kwargs: Any,
    ) -> None:
        try:
            super().__init__(nombre="media_monitor", engine=engine, **kwargs)
        except TypeError:
            # Shim path
            super().__init__(nombre="media_monitor", **kwargs)
        self.engine = engine
        self.dry_run = dry_run

    # ── Pipeline principal ────────────────────────────────────────────────────

    def run(
        self,
        max_per_source: int = 20,
        region_filter: str | None = None,
        language_filter: str | None = None,
        run_clustering: bool = True,
    ) -> dict[str, Any]:
        """
        Ejecuta el pipeline completo de medios.

        Args:
            max_per_source: artículos máximos por fuente RSS.
            region_filter: filtrar fuentes por región.
            language_filter: filtrar fuentes por idioma.
            run_clustering: si True, asigna narrativas a los artículos.

        Returns:
            dict con stats: n_fetched, n_new, n_dup, n_errors, n_clustered.
        """
        from .rss_client import RSSMediaClient
        from .media_adapter import MediaAdapter
        from .sentiment import analyze_sentiment
        from .actor_mentions import ActorMentionExtractor
        from .topic_classifier import classify_topics
        from .narrative_clusterer import NarrativeClusterer

        stats: dict[str, Any] = {
            "n_fetched": 0, "n_new": 0, "n_dup": 0,
            "n_errors": 0, "n_clustered": 0,
            "started_at": datetime.now(timezone.utc).isoformat(),
        }

        # 1. Fetch RSS
        logger.info("MediaMonitor: iniciando fetch RSS")
        client = RSSMediaClient()
        raw_items = client.fetch_all(
            max_per_source=max_per_source,
            region_filter=region_filter,
            language_filter=language_filter,
        )
        stats["n_fetched"] = len(raw_items)
        if not raw_items:
            logger.warning("MediaMonitor: no se obtuvieron artículos")
            return stats

        # 2. Normalizar
        adapter = MediaAdapter()
        items = adapter.adapt_many(raw_items, deduplicate=True)

        # 3. Enriquecer: sentimiento + actores + temas
        extractor = ActorMentionExtractor()
        sentiment_mode = os.getenv("ELECTSIM_MEDIA_SENTIMENT_MODE", "fast")

        for item in items:
            try:
                text = " ".join(filter(None, [item.title, item.summary]))
                # Sentimiento
                sig = analyze_sentiment(text, mode=sentiment_mode)
                item.sentiment_label = sig.sentiment_label
                item.sentiment_score = sig.sentiment_score
                item.emotion_label = sig.emotion_label
                item.toxicity_score = sig.toxicity_score
                # Actores / partidos / instituciones
                item.actors = extractor.extract_names(text)
                item.parties = extractor.extract_parties(text)
                item.institutions = extractor.extract_institutions(text)
                # Temas
                item.topics = classify_topics(text)
            except Exception as exc:
                logger.debug("Enriquecimiento error %s: %s", item.title[:40], exc)
                stats["n_errors"] += 1

        # 4. Clustering narrativo
        cluster_items = []
        if run_clustering:
            clusterer = NarrativeClusterer()
            items, cluster_items = clusterer.assign_clusters(items)
            stats["n_clustered"] = sum(1 for i in items if i.narrative_cluster_id)

        # 5. Upsert en BD
        if not self.dry_run and self.engine is not None:
            n_new, n_dup = self._upsert_media_items(items)
            stats["n_new"] = n_new
            stats["n_dup"] = n_dup
            if cluster_items:
                self._upsert_cluster_items(cluster_items)
        else:
            logger.info(
                "MediaMonitor dry_run: %d artículos listos (no se persiste)",
                len(items),
            )
            stats["n_new"] = len(items)

        # 6. Alertas por toxicidad alta o narrativa crítica
        self._emit_alerts(items)

        stats["finished_at"] = datetime.now(timezone.utc).isoformat()
        logger.info(
            "MediaMonitor.run: %d fetch → %d new / %d dup / %d clustered",
            stats["n_fetched"], stats["n_new"], stats["n_dup"], stats["n_clustered"],
        )
        return stats

    # ── Upsert BD ─────────────────────────────────────────────────────────────

    def _upsert_media_items(self, items: list[Any]) -> tuple[int, int]:
        """
        Inserta artículos en media_items.
        ON CONFLICT (content_hash) DO UPDATE — devuelve (n_new, n_dup).
        """
        if not items or self.engine is None:
            return 0, 0
        try:
            from sqlalchemy import text as sa_text
            n_new = n_dup = 0
            with self.engine.begin() as conn:
                for item in items:
                    d = item.to_db_dict()
                    sql = sa_text("""
                        INSERT INTO media_items (
                            source, source_url, source_region, source_country,
                            source_lat, source_lon, title, url, canonical_url,
                            published_at, author, summary, text, language,
                            content_hash, title_hash, actors, parties,
                            institutions, sectors, topics, sentiment_label,
                            sentiment_score, emotion_label, toxicity_score,
                            narrative_cluster_id, impact_level, raw_payload, fetched_at
                        ) VALUES (
                            :source, :source_url, :source_region, :source_country,
                            :source_lat, :source_lon, :title, :url, :canonical_url,
                            :published_at, :author, :summary, :text, :language,
                            :content_hash, :title_hash, :actors, :parties,
                            :institutions, :sectors, :topics, :sentiment_label,
                            :sentiment_score, :emotion_label, :toxicity_score,
                            :narrative_cluster_id, :impact_level,
                            CAST(:raw_payload AS JSONB), :fetched_at
                        )
                        ON CONFLICT (content_hash) DO UPDATE
                            SET sentiment_label = EXCLUDED.sentiment_label,
                                sentiment_score = EXCLUDED.sentiment_score,
                                narrative_cluster_id = COALESCE(EXCLUDED.narrative_cluster_id, media_items.narrative_cluster_id),
                                fetched_at = EXCLUDED.fetched_at
                        RETURNING (xmax = 0) AS is_new
                    """)
                    try:
                        row = conn.execute(sa_text(str(sql)), d).fetchone()
                        if row and row[0]:
                            n_new += 1
                        else:
                            n_dup += 1
                    except Exception as exc:
                        logger.debug("upsert error item %s: %s", d.get("content_hash", "")[:8], exc)
            return n_new, n_dup
        except Exception as exc:
            logger.error("_upsert_media_items failed: %s", exc)
            return 0, 0

    def _upsert_cluster_items(self, cluster_items: list[Any]) -> None:
        """Inserta relaciones cluster ↔ artículo."""
        if not cluster_items or self.engine is None:
            return
        try:
            from sqlalchemy import text as sa_text
            with self.engine.begin() as conn:
                for ci in cluster_items:
                    conn.execute(sa_text("""
                        INSERT INTO narrative_cluster_items (cluster_id, content_hash, score)
                        VALUES (:cluster_id, :content_hash, :score)
                        ON CONFLICT (cluster_id, content_hash) DO UPDATE
                            SET score = EXCLUDED.score
                    """), {"cluster_id": ci.cluster_id, "content_hash": ci.content_hash, "score": ci.score})
        except Exception as exc:
            logger.debug("_upsert_cluster_items error: %s", exc)

    # ── Alertas ───────────────────────────────────────────────────────────────

    def _emit_alerts(self, items: list[Any]) -> None:
        """Emite alertas para artículos con toxicidad alta."""
        for item in items:
            if (item.toxicity_score or 0) >= 0.7:
                self._alert(
                    title=f"Alta toxicidad: {item.source}",
                    body=item.title[:120],
                    level="ALTO",
                )

    # ── Bootstrap tabla ───────────────────────────────────────────────────────

    @staticmethod
    def ensure_table(engine: Any) -> None:
        """
        Crea la tabla media_items si no existe (bootstrap/tests sin Alembic).
        """
        try:
            from sqlalchemy import text as sa_text
            with engine.begin() as conn:
                conn.execute(sa_text("""
                    CREATE TABLE IF NOT EXISTS media_items (
                        id BIGSERIAL PRIMARY KEY,
                        source TEXT NOT NULL,
                        source_url TEXT,
                        source_region TEXT,
                        source_country TEXT,
                        source_lat DOUBLE PRECISION,
                        source_lon DOUBLE PRECISION,
                        title TEXT NOT NULL,
                        url TEXT DEFAULT '',
                        canonical_url TEXT,
                        published_at TIMESTAMPTZ,
                        author TEXT,
                        summary TEXT,
                        text TEXT,
                        language TEXT DEFAULT 'es',
                        content_hash TEXT NOT NULL UNIQUE,
                        title_hash TEXT,
                        actors TEXT[] DEFAULT '{}',
                        parties TEXT[] DEFAULT '{}',
                        institutions TEXT[] DEFAULT '{}',
                        sectors TEXT[] DEFAULT '{}',
                        topics TEXT[] DEFAULT '{}',
                        sentiment_label TEXT,
                        sentiment_score DOUBLE PRECISION,
                        emotion_label TEXT,
                        toxicity_score DOUBLE PRECISION,
                        narrative_cluster_id TEXT,
                        impact_level TEXT DEFAULT 'INFORMATIVO',
                        raw_payload JSONB DEFAULT '{}',
                        fetched_at TIMESTAMPTZ DEFAULT NOW()
                    )
                """))
                logger.info("ensure_table: media_items OK")
        except Exception as exc:
            logger.debug("ensure_table: %s", exc)
