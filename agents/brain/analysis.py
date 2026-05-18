"""
Bloque 2 — Analysis · 5 tools del GroqBrain.

Razonamiento profundo sobre piezas de contenido (titulares, transcripciones,
posts, comunicados):

  · analyze_sentiment_deep         — sentimiento + emoción + intensidad + diana
  · analyze_narrative              — qué historia se está construyendo
  · analyze_discourse              — figuras retóricas y técnicas argumentativas
  · detect_disinformation_signals  — flags de desinformación o manipulación
  · analyze_media_bias             — sesgo editorial vs línea política

Devuelve dict normalizado (ok, result, confidence, sources, ...).
"""
from __future__ import annotations

from typing import Any


class AnalysisMixin:
    """Bloque 2 · Análisis profundo de contenido."""

    # ─────────────────────────────────────────────────────────────
    def analyze_sentiment_deep(
        self,
        *,
        text: str,
        actor: str = "",
        topic: str = "",
        context: str = "",
    ) -> dict[str, Any]:
        """Sentimiento contextual con emociones y diana política.

        No es la regresión léxica de `agents/sentiment_pipeline.py`: aquí el
        brain razona sobre intención, marco emocional y a quién beneficia /
        perjudica el discurso.

        Devuelve: {valence, intensity, dominant_emotions, target, beneficiaries,
                   victims, frames, ...}
        """
        return self._call(
            "analysis_sentiment_deep",
            {
                "text": (text or "")[:6000],
                "actor": actor,
                "topic": topic,
                "context": context,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def analyze_narrative(
        self,
        *,
        pieces: list[str] | str,
        topic: str = "",
        time_window: str = "última semana",
    ) -> dict[str, Any]:
        """Identifica la narrativa que se está construyendo a partir de varias
        piezas relacionadas (titulares, posts, comunicados).

        Devuelve: {narrative_name, core_claim, supporting_arguments, characters,
                   plot_arc, attack_vectors, counter_narratives, ...}
        """
        return self._call(
            "analysis_narrative",
            {
                "pieces": pieces if isinstance(pieces, list) else [str(pieces)][:25],
                "topic": topic,
                "time_window": time_window,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def analyze_discourse(
        self,
        *,
        text: str,
        speaker: str = "",
        venue: str = "",
    ) -> dict[str, Any]:
        """Analiza figuras retóricas, marcos cognitivos y técnicas argumentativas
        (Lakoff, Aristóteles, debate parlamentario español).

        Devuelve: {rhetorical_devices, frames, fallacies, ethos_logos_pathos,
                   audience_target, register, ...}
        """
        return self._call(
            "analysis_discourse",
            {
                "text": (text or "")[:6000],
                "speaker": speaker,
                "venue": venue,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def detect_disinformation_signals(
        self,
        *,
        text: str,
        source: str = "",
        url: str = "",
        cross_check_summary: str = "",
    ) -> dict[str, Any]:
        """Detecta señales de desinformación, manipulación o fabricación.

        Inspirado en checklists de Newtral / EFE Verifica / FactCheck.org.
        NO afirma "es falso", solo señala patrones de riesgo y propone
        verificación humana.

        Devuelve: {risk_level, signals: [{type, evidence, severity}],
                   recommended_checks, similar_known_hoaxes, ...}
        """
        return self._call(
            "analysis_disinformation_signals",
            {
                "text": (text or "")[:6000],
                "source": source,
                "url": url,
                "cross_check_summary": cross_check_summary,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def analyze_media_bias(
        self,
        *,
        media_name: str,
        recent_pieces: list[str] | str,
        topic: str = "",
    ) -> dict[str, Any]:
        """Cuantifica el sesgo editorial de un medio en un tema concreto.

        Devuelve: {ideological_lean, framing_pattern, selection_bias,
                   word_choice_bias, source_diversity, comparison_to_avg, ...}
        """
        return self._call(
            "analysis_media_bias",
            {
                "media_name": media_name,
                "recent_pieces": recent_pieces if isinstance(recent_pieces, list) else [str(recent_pieces)],
                "topic": topic,
            },
        )
