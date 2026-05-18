"""
Declarations Intelligence · servicio silencioso para enriquecer la ingesta
de declaraciones (`etl/sources/declaraciones_fetcher.py` y similares).

Cada declaración entra cruda con quien la emite + texto. Este pipeline:
  · Extrae contexto                 — venue, fecha, destinatario, response/init
  · Clasifica tipo                  — propuesta | ataque | defensa | posicionamiento | slip | globo
  · Contrasta con histórico         — detecta contradicción con declaraciones previas
                                       del mismo actor sobre el mismo tema
  · Detecta cambios de posición     — y los etiqueta como hito político

El analista nunca ve el pipeline; ve la declaración con metadata útil.

Uso típico:

    from agents.brain.pipelines.declarations_intelligence import DeclarationsIntelligence
    di = DeclarationsIntelligence()
    enriched = di.enrich(
        speaker="Pedro Sánchez",
        quote="No habrá amnistía mientras yo sea presidente.",
        venue="Congreso de los Diputados",
        date_iso="2026-02-15",
        topic="amnistía",
        speaker_history=[  # lista de declaraciones previas del mismo actor sobre amnistía
            {"date": "2023-09-12", "quote": "...", "venue": "..."},
        ],
    )
    if enriched.contradicts_previous:
        # → flag para el analista (no para auto-publicar)
        ...
"""
from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Estructuras
# ─────────────────────────────────────────────────────────────────

@dataclass
class EnrichedDeclaration:
    """Declaración con metadata política derivada."""

    # Crudo
    speaker: str
    quote: str
    venue: str = ""
    date_iso: str | None = None
    topic: str = ""

    # Contexto extraído
    addressee: str = ""           # a quién va dirigida
    is_response: bool = False
    response_to: str = ""         # qué actor/declaración previa
    declaration_type: str = ""    # propuesta | ataque | defensa | posicionamiento | slip | globo

    # Análisis
    strategic_intent: str = ""    # movilizar | desactivar | atacar | tranquilizar | seducir | desinformar
    frames: list[str] = field(default_factory=list)
    audience_target: str = ""
    rhetorical_devices: list[str] = field(default_factory=list)
    fallacies: list[dict[str, str]] = field(default_factory=list)

    # Contradicción
    contradicts_previous: bool = False
    contradiction_details: list[dict[str, Any]] = field(default_factory=list)
    position_change_detected: bool = False
    position_change_summary: str = ""

    # Trazas
    ok: bool = False
    error: str | None = None
    tokens_used: int = 0
    latency_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ─────────────────────────────────────────────────────────────────
# Pipeline
# ─────────────────────────────────────────────────────────────────

class DeclarationsIntelligence:
    """Servicio invisible que enriquece declaraciones políticas."""

    # Mapeo strategic_intent → declaration_type
    _INTENT_TO_TYPE = {
        "atacar":       "ataque",
        "defender":     "defensa",
        "movilizar":    "posicionamiento",
        "tranquilizar": "posicionamiento",
        "seducir":      "propuesta",
        "desinformar":  "slip",
        "globo":        "globo_sonda",
    }

    def __init__(self, *, brain: Any = None) -> None:
        self._brain = brain

    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception as exc:
            logger.warning("DeclarationsIntelligence: brain no disponible (%s)", exc)
            self._brain = None
        return self._brain

    # ─────────────────────────────────────────────────────────────
    def enrich(
        self,
        *,
        speaker: str,
        quote: str,
        venue: str = "",
        date_iso: str | None = None,
        topic: str = "",
        speaker_history: list[dict[str, Any]] | None = None,
    ) -> EnrichedDeclaration:
        """Enriquece una declaración. Nunca lanza."""
        enriched = EnrichedDeclaration(
            speaker=speaker, quote=quote, venue=venue,
            date_iso=date_iso, topic=topic,
        )
        if not quote or not str(quote).strip():
            enriched.error = "quote vacía"
            return enriched

        brain = self._get_brain()
        if brain is None:
            enriched.error = "brain no disponible"
            return enriched

        # 1) Análisis discursivo: clasifica intent, frames, dispositivos
        try:
            disc = brain.analyze_discourse(
                text=quote, speaker=speaker, venue=venue,
            )
        except Exception as exc:
            enriched.error = f"analyze_discourse: {type(exc).__name__}"
            return enriched

        if disc.get("ok") and isinstance(disc.get("result"), dict):
            r = disc["result"]
            enriched.strategic_intent = str(r.get("strategic_intent") or "")
            enriched.audience_target = str(r.get("audience_target") or "")
            fr = r.get("frames") or []
            if isinstance(fr, list):
                enriched.frames = [
                    (x.get("frame") if isinstance(x, dict) else str(x))
                    for x in fr if x
                ][:6]
            rd = r.get("rhetorical_devices") or []
            if isinstance(rd, list):
                enriched.rhetorical_devices = [
                    (x.get("device") if isinstance(x, dict) else str(x))
                    for x in rd if x
                ][:5]
            fl = r.get("fallacies") or []
            if isinstance(fl, list):
                enriched.fallacies = [x for x in fl if isinstance(x, dict)][:5]
            enriched.declaration_type = self._INTENT_TO_TYPE.get(
                enriched.strategic_intent, "posicionamiento",
            )
            enriched.tokens_used += int(disc.get("tokens_used") or 0)
            enriched.latency_ms += int(disc.get("latency_ms") or 0)
        else:
            enriched.error = disc.get("error") or "analyze_discourse no devolvió result"
            return enriched

        # 2) Detección de contradicción con histórico
        if speaker_history:
            self._detect_contradictions(enriched, speaker_history, brain=brain)

        enriched.ok = True
        return enriched

    # ─────────────────────────────────────────────────────────────
    def _detect_contradictions(
        self,
        enriched: EnrichedDeclaration,
        history: list[dict[str, Any]],
        *,
        brain: Any,
    ) -> None:
        """Usa el brain para comparar la declaración actual con su histórico."""
        if not history:
            return
        # Construimos baseline summary y muestras recientes
        summary = (
            f"Declaraciones previas de {enriched.speaker} sobre {enriched.topic or 'política general'}:"
        )
        samples = []
        for h in history[:8]:
            dt = h.get("date") or h.get("date_iso") or ""
            qt = (h.get("quote") or "")[:300]
            vn = h.get("venue") or ""
            samples.append(f"[{dt} · {vn}] {qt}")
        try:
            out = brain.detect_source_change(
                source_name=f"{enriched.speaker} (histórico declaraciones)",
                baseline_summary=summary,
                recent_samples=samples + [
                    f"[ACTUAL · {enriched.date_iso or ''} · {enriched.venue}] {enriched.quote[:300]}"
                ],
            )
        except Exception as exc:
            logger.warning("detect_source_change falló: %s", exc)
            return
        if not out.get("ok"):
            return
        r = out.get("result")
        if not isinstance(r, dict):
            return
        changed = bool(r.get("changed"))
        severity = str(r.get("severity") or "")
        # detect_source_change devuelve "ninguna|leve|moderada|alta"
        if changed and severity in {"moderada", "alta"}:
            enriched.contradicts_previous = True
            enriched.contradiction_details = (
                [x for x in (r.get("examples") or []) if isinstance(x, dict)][:5]
            )
            enriched.position_change_detected = severity == "alta"
            dimensions = r.get("dimensions") or []
            drivers = r.get("drivers") or []
            enriched.position_change_summary = (
                f"Cambio {severity} detectado. "
                f"Dimensiones: {', '.join(map(str, dimensions[:3]))}. "
                f"Drivers plausibles: {', '.join(map(str, drivers[:3]))}."
            )
        enriched.tokens_used += int(out.get("tokens_used") or 0)
        enriched.latency_ms += int(out.get("latency_ms") or 0)
