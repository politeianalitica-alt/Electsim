"""
Capa 2 — StrategicAnalyzer.

Analisis estrategico de un actor politico dado un conjunto de señales
extraidas por el StructuredExtractor.

Produce:
  - Posicion actual del actor en el espacio politico
  - Tendencias clave (ascendente, descendente, estable)
  - Riesgos detectados (reputacional, electoral, regulatorio, judicial)
  - Oportunidades (alianzas potenciales, mensajes ganadores, timing)
  - Resumen ejecutivo de 100-150 palabras

Requiere OllamaEngine inicializado.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from agents.analysis.extractor import ExtractionResult, IntelSignal
from agents.analysis.ollama_engine import OllamaEngine

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tipos
# ---------------------------------------------------------------------------

@dataclass
class RiskItem:
    category: str          # reputacional, electoral, regulatorio, judicial, operacional
    description: str
    severity: str          # critico, alto, medio, bajo
    probability: float = 0.5
    mitigation: str = ""


@dataclass
class Opportunity:
    type_: str             # alianza, mensaje, timing, vacío_discursivo, voto_disponible
    description: str
    actors_involved: list[str] = field(default_factory=list)
    window: str = "corto"  # corto, medio, largo


@dataclass
class ActorTrend:
    direction: str = "estable"  # ascendente, descendente, estable, volatil
    drivers: list[str] = field(default_factory=list)
    confidence: float = 0.6


@dataclass
class StrategicAssessment:
    actor: str
    position_summary: str = ""
    trend: ActorTrend = field(default_factory=ActorTrend)
    risks: list[RiskItem] = field(default_factory=list)
    opportunities: list[Opportunity] = field(default_factory=list)
    executive_summary: str = ""
    context_signals: int = 0
    model_used: str = ""

    def top_risks(self, n: int = 3) -> list[RiskItem]:
        severity_order = {"critico": 0, "alto": 1, "medio": 2, "bajo": 3}
        return sorted(
            self.risks,
            key=lambda r: (severity_order.get(r.severity, 4), -r.probability),
        )[:n]

    def has_critical_risk(self) -> bool:
        return any(r.severity == "critico" for r in self.risks)


# ---------------------------------------------------------------------------
# StrategicAnalyzer
# ---------------------------------------------------------------------------

_POSITION_SCHEMA = """{
  "posicion": "descripcion de la posicion actual del actor",
  "tendencia": {
    "direccion": "ascendente|descendente|estable|volatil",
    "drivers": ["razon1", "razon2"],
    "confianza": 0.7
  }
}"""

_RISK_SCHEMA = """{
  "riesgos": [
    {
      "categoria": "reputacional|electoral|regulatorio|judicial|operacional",
      "descripcion": "...",
      "severidad": "critico|alto|medio|bajo",
      "probabilidad": 0.6,
      "mitigacion": "..."
    }
  ]
}"""

_OPPORTUNITY_SCHEMA = """{
  "oportunidades": [
    {
      "tipo": "alianza|mensaje|timing|vacio_discursivo|voto_disponible",
      "descripcion": "...",
      "actores": ["..."],
      "ventana": "corto|medio|largo"
    }
  ]
}"""


class StrategicAnalyzer:
    """
    Analiza estrategicamente un actor politico a partir de señales de inteligencia.

    Uso:
        async with OllamaEngine() as engine:
            analyzer = StrategicAnalyzer(engine)
            assessment = await analyzer.analyze(
                actor="Pedro Sanchez",
                extraction=result,
                context="Contexto geopolitico y economico actual..."
            )
    """

    def __init__(self, engine: OllamaEngine) -> None:
        self._engine = engine

    async def analyze(
        self,
        actor: str,
        extraction: ExtractionResult | None = None,
        context: str = "",
        signals: list[IntelSignal] | None = None,
    ) -> StrategicAssessment:
        """
        Genera un analisis estrategico completo del actor.

        Args:
            actor: nombre del actor politico
            extraction: resultado del StructuredExtractor (opcional)
            context: texto de contexto adicional (noticias, datos, etc.)
            signals: señales de inteligencia adicionales
        """
        all_signals = list(signals or [])
        if extraction:
            all_signals.extend(extraction.signals)

        signals_text = self._format_signals(all_signals)
        actor_mentions = self._actor_context(actor, extraction)

        import asyncio

        position_task = self._analyze_position(actor, signals_text, context, actor_mentions)
        risks_task = self._analyze_risks(actor, signals_text, context)
        opps_task = self._analyze_opportunities(actor, signals_text, context)

        position_data, risks_data, opps_data = await asyncio.gather(
            position_task, risks_task, opps_task, return_exceptions=True
        )

        # Parse position & trend
        position_summary = ""
        trend = ActorTrend(direction="estable")
        if isinstance(position_data, dict):
            position_summary = str(position_data.get("posicion", ""))[:500]
            td = position_data.get("tendencia", {})
            if isinstance(td, dict):
                trend = ActorTrend(
                    direction=str(td.get("direccion", "estable")),
                    drivers=self._clean_list(td.get("drivers", [])),
                    confidence=float(td.get("confianza", 0.6)),
                )

        # Parse risks
        risks: list[RiskItem] = []
        if isinstance(risks_data, dict):
            for r in risks_data.get("riesgos", [])[:6]:
                if isinstance(r, dict):
                    risks.append(RiskItem(
                        category=str(r.get("categoria", "reputacional")),
                        description=str(r.get("descripcion", ""))[:300],
                        severity=str(r.get("severidad", "medio")),
                        probability=float(r.get("probabilidad", 0.5)),
                        mitigation=str(r.get("mitigacion", ""))[:200],
                    ))

        # Parse opportunities
        opps: list[Opportunity] = []
        if isinstance(opps_data, dict):
            for o in opps_data.get("oportunidades", [])[:5]:
                if isinstance(o, dict):
                    opps.append(Opportunity(
                        type_=str(o.get("tipo", "mensaje")),
                        description=str(o.get("descripcion", ""))[:300],
                        actors_involved=self._clean_list(o.get("actores", [])),
                        window=str(o.get("ventana", "corto")),
                    ))

        # Executive summary
        summary = await self._executive_summary(
            actor, position_summary, trend, risks, opps, all_signals
        )

        return StrategicAssessment(
            actor=actor,
            position_summary=position_summary,
            trend=trend,
            risks=risks,
            opportunities=opps,
            executive_summary=summary,
            context_signals=len(all_signals),
            model_used=self._engine.model_for_role("estrategia"),
        )

    # ------------------------------------------------------------------
    # Sub-analisis
    # ------------------------------------------------------------------

    async def _analyze_position(
        self,
        actor: str,
        signals_text: str,
        context: str,
        actor_mentions: str,
    ) -> dict[str, Any]:
        prompt = (
            f"Analiza la posicion estrategica actual de {actor} en la politica espanola.\n\n"
            f"Señales de inteligencia recientes:\n{signals_text[:2000]}\n\n"
            f"Apariciones del actor:\n{actor_mentions[:1000]}\n\n"
            f"Contexto adicional:\n{context[:1000]}\n\n"
            f"Schema de respuesta: {_POSITION_SCHEMA}"
        )
        return await self._engine.extract_json(
            role="estrategia", prompt=prompt, schema_hint=_POSITION_SCHEMA
        )

    async def _analyze_risks(
        self, actor: str, signals_text: str, context: str
    ) -> dict[str, Any]:
        prompt = (
            f"Identifica los riesgos estrategicos para {actor} en base a estas señales.\n\n"
            f"Señales:\n{signals_text[:2000]}\n\n"
            f"Contexto:\n{context[:800]}\n\n"
            f"Schema: {_RISK_SCHEMA}"
        )
        return await self._engine.extract_json(
            role="estrategia", prompt=prompt, schema_hint=_RISK_SCHEMA
        )

    async def _analyze_opportunities(
        self, actor: str, signals_text: str, context: str
    ) -> dict[str, Any]:
        prompt = (
            f"Identifica las oportunidades estrategicas para {actor}.\n\n"
            f"Señales:\n{signals_text[:2000]}\n\n"
            f"Contexto:\n{context[:800]}\n\n"
            f"Schema: {_OPPORTUNITY_SCHEMA}"
        )
        return await self._engine.extract_json(
            role="estrategia", prompt=prompt, schema_hint=_OPPORTUNITY_SCHEMA
        )

    async def _executive_summary(
        self,
        actor: str,
        position: str,
        trend: ActorTrend,
        risks: list[RiskItem],
        opps: list[Opportunity],
        signals: list[IntelSignal],
    ) -> str:
        risk_str = "; ".join(f"{r.severity}: {r.description[:80]}" for r in risks[:3])
        opp_str = "; ".join(o.description[:80] for o in opps[:2])
        high_signals = [s for s in signals if s.urgency == "alta"]

        prompt = (
            f"Genera un resumen ejecutivo de 120-150 palabras sobre {actor}.\n\n"
            f"Posicion: {position[:300]}\n"
            f"Tendencia: {trend.direction} (drivers: {', '.join(trend.drivers[:3])})\n"
            f"Riesgos principales: {risk_str[:400]}\n"
            f"Oportunidades: {opp_str[:300]}\n"
            f"Señales de alta urgencia: {len(high_signals)}\n\n"
            f"El resumen debe ser directo, sin adornos, orientado a decision."
        )
        return await self._engine.generate(
            role="briefing", prompt=prompt, temperature=0.4
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _format_signals(signals: list[IntelSignal]) -> str:
        if not signals:
            return "Sin señales disponibles."
        lines = []
        for s in signals[:10]:
            actors = ", ".join(s.actors[:3]) if s.actors else "N/A"
            lines.append(
                f"[{s.urgency.upper()}] {s.signal_type}: {s.summary[:100]} "
                f"(actores: {actors})"
            )
        return "\n".join(lines)

    @staticmethod
    def _actor_context(actor: str, extraction: ExtractionResult | None) -> str:
        if not extraction:
            return ""
        mentioned = any(
            actor.lower() in p.lower()
            for p in extraction.entities.personas + extraction.entities.organizaciones
        )
        facts_about = [
            f for f in extraction.facts
            if actor.lower() in f.actor.lower()
        ]
        if not mentioned and not facts_about:
            return f"{actor} no aparece explicitamente en el texto analizado."
        lines = []
        for f in facts_about[:5]:
            lines.append(f"{f.actor}: {f.action} — {f.object_}")
        return "\n".join(lines) if lines else f"{actor} mencionado en el texto."

    @staticmethod
    def _clean_list(items: Any) -> list[str]:
        if not isinstance(items, list):
            return []
        return [str(i)[:100] for i in items[:10] if i]
