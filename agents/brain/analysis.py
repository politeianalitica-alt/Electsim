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

────────────────────────────────────────────────────────────────────────────
A1 · POLÍTICA DE TRUNCADO (unificada · única fuente de verdad)
────────────────────────────────────────────────────────────────────────────
Todas las tools de análisis que reciben texto largo aplican estas constantes
para que el comportamiento sea predecible. Cuando se trunca, el output
incluye `truncated=True` y `original_chars` para que el caller decida si
necesita chunking. Esto reemplaza los antiguos límites inconsistentes
(`[:6000]` en unas tools, `[:8000]` en otras, sin avisar al caller).
"""
from __future__ import annotations

from typing import Any

# A1 · Política de truncado unificada (en chars · ~2500-3000 tokens en ES)
MAX_TEXT_SENTIMENT: int = 8000
MAX_TEXT_NARRATIVE_PIECE: int = 1500
MAX_TEXT_NARRATIVE_TOTAL: int = 32000
MAX_TEXT_DISCOURSE: int = 8000
MAX_TEXT_DISINFO: int = 8000
MAX_TEXT_BIAS_PIECE: int = 1500
MAX_PIECES_NARRATIVE: int = 25
MAX_PIECES_BIAS: int = 25


def _truncate_with_flag(text: str, limit: int) -> tuple[str, bool, int]:
    """Devuelve (texto_truncado, truncated_flag, original_chars)."""
    if not text:
        return "", False, 0
    n = len(text)
    return (text[:limit], n > limit, n)


def _limit_pieces(pieces: Any, *, max_pieces: int, max_chars_per_piece: int) -> tuple[list[str], dict[str, Any]]:
    """Normaliza una lista de piezas con límites duros.

    Devuelve (lista_normalizada, meta) con meta = {
      pieces_total, pieces_used, dropped_pieces, chars_total, truncated_pieces
    }.
    """
    if pieces is None:
        return [], {"pieces_total": 0, "pieces_used": 0, "dropped_pieces": 0,
                    "chars_total": 0, "truncated_pieces": 0}
    if not isinstance(pieces, list):
        pieces = [str(pieces)]
    total = len(pieces)
    used = pieces[:max_pieces]
    dropped = max(0, total - len(used))
    truncated_pieces = 0
    normalized: list[str] = []
    chars_total = 0
    for p in used:
        s = str(p or "")
        if len(s) > max_chars_per_piece:
            s = s[:max_chars_per_piece]
            truncated_pieces += 1
        normalized.append(s)
        chars_total += len(s)
    meta = {
        "pieces_total": total,
        "pieces_used": len(used),
        "dropped_pieces": dropped,
        "chars_total": chars_total,
        "truncated_pieces": truncated_pieces,
    }
    return normalized, meta


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

        A1 · Trunca a `MAX_TEXT_SENTIMENT` y añade `truncated`/`original_chars`.

        Devuelve: {valence, intensity, dominant_emotions, target, beneficiaries,
                   victims, frames, truncated, original_chars, ...}
        """
        truncated_text, truncated, original_chars = _truncate_with_flag(text or "", MAX_TEXT_SENTIMENT)
        result = self._call(
            "analysis_sentiment_deep",
            {
                "text": truncated_text,
                "actor": actor,
                "topic": topic,
                "context": context,
            },
        )
        return _attach_truncation_meta(result, truncated, original_chars, MAX_TEXT_SENTIMENT)

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

        A4 · Limita cada pieza a `MAX_TEXT_NARRATIVE_PIECE` chars y el total
        de piezas a `MAX_PIECES_NARRATIVE`. Si `chars_total` se acerca al
        contexto del modelo (32k chars ≈ ~10k tokens en ES), reduce
        adicionalmente para no degradar la calidad por context-overflow.

        Devuelve: {narrative_name, core_claim, supporting_arguments, characters,
                   plot_arc, attack_vectors, counter_narratives,
                   pieces_meta: {pieces_total, pieces_used, dropped_pieces,
                                 chars_total, truncated_pieces}}
        """
        normalized, meta = _limit_pieces(
            pieces,
            max_pieces=MAX_PIECES_NARRATIVE,
            max_chars_per_piece=MAX_TEXT_NARRATIVE_PIECE,
        )
        # A4 · Segundo cap por chars_total para no saturar contexto
        while meta["chars_total"] > MAX_TEXT_NARRATIVE_TOTAL and normalized:
            removed = normalized.pop()
            meta["chars_total"] -= len(removed)
            meta["pieces_used"] -= 1
            meta["dropped_pieces"] += 1

        result = self._call(
            "analysis_narrative",
            {
                "pieces": normalized,
                "topic": topic,
                "time_window": time_window,
            },
        )
        if isinstance(result, dict) and isinstance(result.get("result"), dict):
            result["result"]["pieces_meta"] = meta
        return result

    # ─────────────────────────────────────────────────────────────
    def analyze_discourse(
        self,
        *,
        text: str,
        speaker: str = "",
        venue: str = "",
    ) -> dict[str, Any]:
        """Analiza figuras retóricas, marcos cognitivos y técnicas argumentativas.

        A10 · Limitación documentada del marco analítico:
        El modelo aplica el marco Lakoff (frames cognitivos) + Aristóteles
        (ethos/logos/pathos), que son frameworks anglosajones. Para discurso
        parlamentario español hay convenciones específicas (interpelaciones,
        ruegos y preguntas, tratamientos «su señoría», alusiones reglamentarias)
        que LLaMA 3.3 70B conoce de forma parcial al no estar entrenado
        predominantemente en corpus parlamentario español. Los resultados de
        esta tool deben validarse por analista humano cuando se aplican al
        discurso institucional español.

        Devuelve: {rhetorical_devices, frames, fallacies, ethos_logos_pathos,
                   audience_target, register, ..., framework_limitation: str}
        """
        truncated_text, truncated, original_chars = _truncate_with_flag(text or "", MAX_TEXT_DISCOURSE)
        result = self._call(
            "analysis_discourse",
            {
                "text": truncated_text,
                "speaker": speaker,
                "venue": venue,
            },
        )
        result = _attach_truncation_meta(result, truncated, original_chars, MAX_TEXT_DISCOURSE)
        # A10 · disclaimer del framework
        if isinstance(result, dict) and isinstance(result.get("result"), dict):
            result["result"]["framework_limitation"] = (
                "Análisis basado en marco Lakoff + Aristóteles (origen anglosajón). "
                "Para discurso parlamentario español, validar manualmente las convenciones "
                "específicas (interpelaciones, alusiones reglamentarias, registro de su señoría)."
            )
        return result

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

        A7 · Si `cross_check_summary` está vacío o es `not_available`, el
        resultado se etiqueta `cross_check_status='absent'` para que el
        analista sepa que `risk_level` se calculó solo sobre el texto, sin
        contraste con otras fuentes.

        Devuelve: {risk_level, signals: [{type, evidence, severity}],
                   recommended_checks, similar_known_hoaxes,
                   cross_check_status, truncated, original_chars, ...}
        """
        truncated_text, truncated, original_chars = _truncate_with_flag(text or "", MAX_TEXT_DISINFO)
        normalized_summary = (cross_check_summary or "").strip()
        result = self._call(
            "analysis_disinformation_signals",
            {
                "text": truncated_text,
                "source": source,
                "url": url,
                "cross_check_summary": normalized_summary or "not_available",
            },
        )
        result = _attach_truncation_meta(result, truncated, original_chars, MAX_TEXT_DISINFO)
        if isinstance(result, dict) and isinstance(result.get("result"), dict):
            absent = (not normalized_summary) or normalized_summary.lower() == "not_available"
            result["result"]["cross_check_status"] = "absent" if absent else "provided"
            if absent:
                result["result"]["limitation"] = (
                    "risk_level estimado solo sobre el texto del documento, sin contraste "
                    "con otras fuentes — requiere verificación humana antes de cualquier acción."
                )
        return result

    # ─────────────────────────────────────────────────────────────
    def analyze_media_bias(
        self,
        *,
        media_name: str,
        recent_pieces: list[str] | str,
        topic: str = "",
    ) -> dict[str, Any]:
        """Cuantifica el sesgo editorial de un medio en un tema concreto.

        A9 · Limita las piezas con los mismos topes que `analyze_narrative`
        (`MAX_PIECES_BIAS`, `MAX_TEXT_BIAS_PIECE`) para evitar 413
        payload-too-large y degradación de calidad por context-overflow.

        Devuelve: {ideological_lean, framing_pattern, selection_bias,
                   word_choice_bias, source_diversity, comparison_to_avg,
                   pieces_meta: {...}}
        """
        normalized, meta = _limit_pieces(
            recent_pieces,
            max_pieces=MAX_PIECES_BIAS,
            max_chars_per_piece=MAX_TEXT_BIAS_PIECE,
        )
        result = self._call(
            "analysis_media_bias",
            {
                "media_name": media_name,
                "recent_pieces": normalized,
                "topic": topic,
            },
        )
        if isinstance(result, dict) and isinstance(result.get("result"), dict):
            result["result"]["pieces_meta"] = meta
        return result


# ─────────────────────────────────────────────────────────────────
# Helper compartido para inyectar metadata de truncado en el output
# ─────────────────────────────────────────────────────────────────

def _attach_truncation_meta(
    result: dict[str, Any] | None,
    truncated: bool,
    original_chars: int,
    limit: int,
) -> dict[str, Any]:
    if not isinstance(result, dict):
        return {"ok": False, "result": None}
    inner = result.get("result")
    if not isinstance(inner, dict):
        inner = {"raw_text": inner}
        result["result"] = inner
    inner["truncated"] = bool(truncated)
    inner["original_chars"] = int(original_chars)
    inner["chars_analyzed"] = min(int(original_chars), int(limit))
    return result
