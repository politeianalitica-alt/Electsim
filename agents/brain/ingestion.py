"""
Bloque 1 — Ingestion · 5 tools del GroqBrain.

Antes de tocar BD, el brain razona sobre las fuentes:

  · identify_source_relevance   — ¿esta fuente debería entrar al sistema?
  · extract_political_entities  — actores/partidos/leyes/eventos mencionados
  · classify_document           — tipo (BOE, prensa, dictamen, RRSS, tweet...)
  · detect_source_change        — ¿una fuente conocida ha cambiado de tono?
  · discover_new_sources        — ¿qué fuentes desconocidas mencionan X tema?

Cada tool delega en `self._call()` (GroqBrainBase) y devuelve dict normalizado:
    {ok, result, confidence, sources, reasoning_steps, model, tokens_used, ...}
"""
from __future__ import annotations

from typing import Any


class IngestionMixin:
    """Bloque 1 · Razonamiento sobre ingesta de fuentes."""

    # ─────────────────────────────────────────────────────────────
    def identify_source_relevance(
        self,
        *,
        source_url: str,
        source_title: str = "",
        source_excerpt: str = "",
        topic_focus: str = "política española",
    ) -> dict[str, Any]:
        """Razona si una fuente desconocida debe ser ingestada al sistema.

        Devuelve: {relevant: bool, score: 0..1, category, rationale, risks}
        """
        return self._call(
            "ingestion_identify_source_relevance",
            {
                "source_url": source_url,
                "source_title": source_title,
                "source_excerpt": (source_excerpt or "")[:3000],
                "topic_focus": topic_focus,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def extract_political_entities(
        self,
        *,
        text: str,
        context: str = "",
    ) -> dict[str, Any]:
        """Extrae entidades políticas estructuradas del texto.

        Devuelve: {actors, parties, institutions, laws, events, locations,
                   topics, dates_mentioned}
        """
        return self._call(
            "ingestion_extract_entities",
            {"text": (text or "")[:8000], "context": context},
        )

    # ─────────────────────────────────────────────────────────────
    def classify_document(
        self,
        *,
        text: str,
        url: str = "",
        title: str = "",
    ) -> dict[str, Any]:
        """Clasifica el documento por tipo, registro y nivel de credibilidad.

        Devuelve: {doc_type, register, credibility_tier, languages, ...}
        Categorías: BOE, ley_organica, dictamen, sentencia, prensa_diaria,
        prensa_partidista, blog_opinión, RRSS_oficial, RRSS_anónimo,
        nota_de_prensa, informe_técnico, transcripción, otro.
        """
        return self._call(
            "ingestion_classify_document",
            {
                "text": (text or "")[:6000],
                "url": url,
                "title": title,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def detect_source_change(
        self,
        *,
        source_name: str,
        baseline_summary: str,
        recent_samples: list[str] | str,
    ) -> dict[str, Any]:
        """Detecta deriva en una fuente conocida (cambio editorial/tono).

        Devuelve: {changed: bool, dimensions, severity, examples, drivers}
        """
        return self._call(
            "ingestion_detect_source_change",
            {
                "source_name": source_name,
                "baseline_summary": baseline_summary,
                "recent_samples": recent_samples,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def discover_new_sources(
        self,
        *,
        topic: str,
        existing_sources: list[str] | None = None,
        region_focus: str = "España",
    ) -> dict[str, Any]:
        """Sugiere fuentes que aún no están en BD pero cubren un tema.

        Devuelve: {candidates: [{name, url, why, tier}], gaps_detected}
        """
        return self._call(
            "ingestion_discover_new_sources",
            {
                "topic": topic,
                "existing_sources": existing_sources or [],
                "region_focus": region_focus,
            },
        )
