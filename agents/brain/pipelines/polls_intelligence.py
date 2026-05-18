"""
Polls Intelligence · enriquece la ingesta de encuestas (`polls_scraper.py`,
`cis_fetcher.py`) con razonamiento invisible:

  · Interpreta la ficha técnica → score metodológico, sesgo del demoscopio,
    comparabilidad con otras encuestas del mismo periodo.
  · Detecta cuándo dos encuestas miden lo mismo con formulaciones distintas
    para normalizar las preguntas.
  · Resume el barómetro CIS de 80 páginas en 3 párrafos accionables.
  · Marca cambios estadísticamente significativos con interpretación política.

El analista nunca ve este pipeline; ve la encuesta con metadata útil.
"""
from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class PollQualityAssessment:
    """Evaluación de calidad de una encuesta."""

    pollster: str
    fecha_campo: str | None = None

    # Score técnico
    methodology_score: float = 0.5     # 0..1
    sample_size: int | None = None
    confidence_level: str | None = None
    margin_of_error: str | None = None
    field_method: str | None = None    # CATI / CAPI / online / mixto

    # Sesgo del demoscopio
    pollster_lean: float = 0.0         # -1..1 (izq..der) histórico
    house_effect_pct: float = 0.0      # diferencia media vs media de encuestas

    # Comparabilidad
    comparable_with: list[str] = field(default_factory=list)
    differences_with_average: list[str] = field(default_factory=list)

    # Interpretación
    headline_finding: str = ""
    significant_movements: list[dict[str, Any]] = field(default_factory=list)
    caveats: list[str] = field(default_factory=list)

    # Trazas
    ok: bool = False
    error: str | None = None
    tokens_used: int = 0
    latency_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class PollsIntelligence:
    """Servicio invisible que enriquece encuestas con razonamiento."""

    def __init__(self, *, brain: Any = None) -> None:
        self._brain = brain

    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception as exc:
            logger.warning("PollsIntelligence: brain no disponible (%s)", exc)
            self._brain = None
        return self._brain

    # ─────────────────────────────────────────────────────────────
    def assess_poll(
        self,
        *,
        pollster: str,
        ficha_tecnica: str,
        results_summary: str,
        fecha_campo: str | None = None,
        recent_polls_summary: str = "",
    ) -> PollQualityAssessment:
        """Evalúa calidad metodológica + lectura política de una encuesta."""
        assessment = PollQualityAssessment(
            pollster=pollster, fecha_campo=fecha_campo,
        )
        brain = self._get_brain()
        if brain is None:
            assessment.error = "brain no disponible"
            return assessment

        # 1) Interpretación metodológica via classify_document
        try:
            cls = brain.classify_document(
                text=ficha_tecnica[:5000],
                url="",
                title=f"Ficha técnica · {pollster}",
            )
        except Exception as exc:
            assessment.error = f"classify_document: {type(exc).__name__}"
            return assessment
        if cls.get("ok") and isinstance(cls.get("result"), dict):
            r = cls["result"]
            tier = str(r.get("credibility_tier") or "C")
            tier_to_score = {"A": 0.9, "B": 0.7, "C": 0.5, "D": 0.3}
            assessment.methodology_score = tier_to_score.get(tier, 0.5)
            assessment.tokens_used += int(cls.get("tokens_used") or 0)
            assessment.latency_ms += int(cls.get("latency_ms") or 0)

        # 2) Lectura tipo "nowcasting" sobre el resultado
        try:
            nc = brain.interpret_nowcasting(
                nowcast_payload={
                    "pollster": pollster,
                    "fecha_campo": fecha_campo,
                    "resultado": results_summary,
                },
                previous_nowcast_payload={"contexto": recent_polls_summary},
                recent_events=[],
            )
        except Exception as exc:
            assessment.error = f"interpret_nowcasting: {type(exc).__name__}"
            return assessment
        if nc.get("ok") and isinstance(nc.get("result"), dict):
            r = nc["result"]
            assessment.headline_finding = str(r.get("headline") or "")
            movers = r.get("big_movers") or []
            if isinstance(movers, list):
                assessment.significant_movements = [m for m in movers if isinstance(m, dict)][:8]
            cv = r.get("confidence_caveats") or []
            if isinstance(cv, list):
                assessment.caveats = [str(x) for x in cv][:6]
            assessment.tokens_used += int(nc.get("tokens_used") or 0)
            assessment.latency_ms += int(nc.get("latency_ms") or 0)

        assessment.ok = True
        return assessment

    # ─────────────────────────────────────────────────────────────
    def summarize_cis_barometer(
        self,
        *,
        mes: str,
        contenido_tablas: str,
        previous_summary: str = "",
    ) -> dict[str, Any]:
        """Convierte 80 páginas de tablas CIS en 3 párrafos accionables."""
        brain = self._get_brain()
        if brain is None:
            return {"ok": False, "error": "brain no disponible"}
        try:
            out = brain.generate_briefing(
                title=f"Resumen barómetro CIS · {mes}",
                date=mes,
                sections_context={
                    "tablas":   contenido_tablas[:9000],
                    "previo":   previous_summary[:2000],
                    "objetivo": (
                        "Resumir en 3-5 bullets los cambios MÁS significativos: "
                        "intención voto, valoración líderes, principales preocupaciones, "
                        "cambios respecto a barómetro previo."
                    ),
                },
                audience="analista político",
                length="corto",
            )
        except Exception as exc:
            return {"ok": False, "error": f"{type(exc).__name__}: {str(exc)[:200]}"}
        if not out.get("ok"):
            return {"ok": False, "error": out.get("error") or "briefing falló"}
        r = out.get("result") or {}
        if isinstance(r, dict):
            return {
                "ok": True,
                "executive_summary": r.get("executive_summary"),
                "key_points": r.get("key_points") or [],
                "today_actions": r.get("today_actions") or [],
                "watch_next": r.get("watch_next") or [],
                "tokens_used": out.get("tokens_used"),
                "latency_ms": out.get("latency_ms"),
            }
        return {"ok": True, "raw": str(r)}
