"""
Capa 3 — SynthesisEngine.

Sintetiza los resultados de extraccion y analisis estrategico en:
  - Briefings diarios (morning_briefing, evening_digest)
  - Alertas de inteligencia (inmediatas, periodicas)
  - Respuestas RAG (retrieval-augmented generation sobre contexto de workspace)
  - Narrativas de campaña

Requiere OllamaEngine. El acceso a BD/RAG es opcional (modo degradado
si no hay contexto disponible).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from agents.analysis.ollama_engine import OllamaEngine
from agents.analysis.strategic_analyzer import StrategicAssessment

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tipos de salida
# ---------------------------------------------------------------------------

@dataclass
class IntelAlert:
    alert_id: str
    level: str              # CRITICO, ALTO, MEDIO, BAJO
    title: str
    body: str
    actors: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    source_count: int = 0
    requires_action: bool = False


@dataclass
class DailyBriefing:
    briefing_type: str      # morning_briefing, evening_digest, weekly_report
    title: str
    executive_summary: str
    sections: list[dict[str, str]] = field(default_factory=list)
    alerts: list[IntelAlert] = field(default_factory=list)
    actors_covered: list[str] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    word_count: int = 0

    def to_markdown(self) -> str:
        lines = [f"# {self.title}", "", self.executive_summary, ""]
        for section in self.sections:
            title = section.get("title", "")
            body = section.get("body", "")
            lines += [f"## {title}", "", body, ""]
        if self.alerts:
            lines += ["## Alertas", ""]
            for a in self.alerts:
                lines.append(f"**[{a.level}]** {a.title}: {a.body[:200]}")
        return "\n".join(lines)


@dataclass
class RAGResponse:
    question: str
    answer: str
    sources_used: int = 0
    confidence: float = 0.7
    model_used: str = ""


# ---------------------------------------------------------------------------
# SynthesisEngine
# ---------------------------------------------------------------------------

_ALERT_SCHEMA = """{
  "nivel": "CRITICO|ALTO|MEDIO|BAJO",
  "titulo": "...",
  "cuerpo": "...",
  "actores": ["..."],
  "etiquetas": ["..."],
  "requiere_accion": true
}"""

_BRIEFING_SECTIONS = [
    ("Situacion politica", "Resumen del panorama politico actual"),
    ("Actores destacados", "Movimientos y declaraciones clave de los principales actores"),
    ("Señales de alerta", "Riesgos e indicadores tempranos detectados"),
    ("Oportunidades", "Ventanas de oportunidad identificadas"),
    ("Contexto economico", "Datos economicos relevantes para el analisis politico"),
]


class SynthesisEngine:
    """
    Motor de sintesis de inteligencia politica.

    Combina señales, analisis y contexto RAG para producir
    productos de inteligencia consumibles (briefings, alertas, respuestas).

    Uso:
        async with OllamaEngine() as engine:
            synth = SynthesisEngine(engine)

            briefing = await synth.morning_briefing(
                assessments=[assessment1, assessment2],
                raw_signals=signals,
                market_context="Mercado ES, sector PARTY"
            )

            alert = await synth.generate_alert(signals_alta_urgencia)
    """

    def __init__(
        self,
        engine: OllamaEngine,
        market_id: str = "ES",
    ) -> None:
        self._engine = engine
        self._market_id = market_id

    # ------------------------------------------------------------------
    # Morning Briefing
    # ------------------------------------------------------------------

    async def morning_briefing(
        self,
        assessments: list[StrategicAssessment] | None = None,
        raw_signals: list[Any] | None = None,
        market_context: str = "",
        date_label: str | None = None,
    ) -> DailyBriefing:
        """
        Genera el briefing matutino de inteligencia politica.

        Args:
            assessments: analisis estrategicos de actores clave
            raw_signals: señales de inteligencia crudas del dia
            market_context: descripcion del mercado/contexto
            date_label: fecha del briefing (default: hoy)
        """
        date_str = date_label or datetime.utcnow().strftime("%Y-%m-%d")
        actors = [a.actor for a in (assessments or [])]

        context_block = self._build_context(assessments, raw_signals, market_context)

        import asyncio

        sections_tasks = [
            self._generate_section(title, hint, context_block)
            for title, hint in _BRIEFING_SECTIONS
        ]
        summary_task = self._generate_executive_summary(context_block, actors)

        results = await asyncio.gather(*sections_tasks, summary_task, return_exceptions=True)

        sections = []
        for i, (title, _) in enumerate(_BRIEFING_SECTIONS):
            body = results[i] if isinstance(results[i], str) else ""
            sections.append({"title": title, "body": body})

        exec_summary = results[-1] if isinstance(results[-1], str) else ""

        # Alertas criticas
        critical_assessments = [a for a in (assessments or []) if a.has_critical_risk()]
        alerts = []
        for ca in critical_assessments[:3]:
            alert = await self._assessment_to_alert(ca)
            alerts.append(alert)

        briefing_text = exec_summary + " ".join(s["body"] for s in sections)
        word_count = len(briefing_text.split())

        return DailyBriefing(
            briefing_type="morning_briefing",
            title=f"Briefing Inteligencia Politica — {date_str}",
            executive_summary=exec_summary,
            sections=sections,
            alerts=alerts,
            actors_covered=actors,
            word_count=word_count,
        )

    # ------------------------------------------------------------------
    # Alertas
    # ------------------------------------------------------------------

    async def generate_alert(
        self,
        signals: list[Any],
        actor: str = "",
        context: str = "",
    ) -> IntelAlert | None:
        """
        Genera una alerta de inteligencia a partir de señales de alta urgencia.
        Retorna None si las señales no justifican una alerta.
        """
        if not signals:
            return None

        high_urgency = [s for s in signals if getattr(s, "urgency", "") == "alta"]
        if not high_urgency:
            return None

        signals_text = "\n".join(
            f"- {getattr(s, 'summary', str(s))[:150]}"
            for s in high_urgency[:5]
        )

        prompt = (
            f"Genera una alerta de inteligencia politica basada en estas señales.\n"
            f"Actor principal: {actor or 'Multiples actores'}\n"
            f"Señales:\n{signals_text}\n"
            f"Contexto: {context[:500]}\n\n"
            f"Schema: {_ALERT_SCHEMA}"
        )

        data = await self._engine.extract_json(
            role="clasificar",
            prompt=prompt,
            schema_hint=_ALERT_SCHEMA,
        )

        if not data:
            return None

        import hashlib
        alert_id = hashlib.sha1(signals_text.encode()).hexdigest()[:12]

        return IntelAlert(
            alert_id=alert_id,
            level=str(data.get("nivel", "MEDIO")),
            title=str(data.get("titulo", "Alerta sin titulo"))[:150],
            body=str(data.get("cuerpo", ""))[:800],
            actors=self._clean_list(data.get("actores", [])),
            tags=self._clean_list(data.get("etiquetas", [])),
            source_count=len(high_urgency),
            requires_action=bool(data.get("requiere_accion", False)),
        )

    # ------------------------------------------------------------------
    # RAG
    # ------------------------------------------------------------------

    async def rag_query(
        self,
        question: str,
        context_docs: list[str],
        system_context: str = "",
    ) -> RAGResponse:
        """
        Responde una pregunta usando documentos de contexto (RAG).

        Args:
            question: pregunta del analista
            context_docs: fragmentos de documentos recuperados
            system_context: contexto del workspace (market, sector)
        """
        if not question:
            return RAGResponse(question="", answer="Pregunta vacia.", confidence=0.0)

        system = (
            "Eres un analista politico experto. Responde la pregunta basandote "
            "EXCLUSIVAMENTE en los documentos de contexto proporcionados. "
            "Si la informacion no esta en el contexto, indicicalo explicitamente. "
            f"{system_context}"
        )

        answer = await self._engine.generate(
            role="analisis",
            prompt=question,
            system=system,
            temperature=0.3,
        )

        # Override: use chat_with_context style
        if context_docs:
            docs_block = "\n\n---\n\n".join(d[:1000] for d in context_docs[:5])
            full_prompt = (
                f"Documentos de contexto:\n{docs_block}\n\n"
                f"Pregunta: {question}"
            )
            answer = await self._engine.generate(
                role="analisis",
                prompt=full_prompt,
                system=system,
                temperature=0.3,
            )

        return RAGResponse(
            question=question,
            answer=answer,
            sources_used=len(context_docs),
            confidence=0.75 if context_docs else 0.4,
            model_used=self._engine.model_for_role("analisis"),
        )

    # ------------------------------------------------------------------
    # Helpers privados
    # ------------------------------------------------------------------

    def _build_context(
        self,
        assessments: list[StrategicAssessment] | None,
        signals: list[Any] | None,
        market_context: str,
    ) -> str:
        parts = []
        if market_context:
            parts.append(f"MERCADO: {market_context}")

        if assessments:
            for a in assessments[:5]:
                parts.append(
                    f"ACTOR: {a.actor} | Tendencia: {a.trend.direction} | "
                    f"Riesgos: {len(a.risks)} | Resumen: {a.executive_summary[:200]}"
                )

        if signals:
            high = [s for s in signals if getattr(s, "urgency", "") == "alta"]
            parts.append(f"SEÑALES ALTA URGENCIA: {len(high)}")
            for s in high[:5]:
                parts.append(f"  [{getattr(s,'signal_type','')}] {getattr(s,'summary','')[:100]}")

        return "\n".join(parts)

    async def _generate_section(
        self, title: str, hint: str, context: str
    ) -> str:
        prompt = (
            f"Escribe la seccion '{title}' del briefing de inteligencia politica.\n"
            f"Guia: {hint}\n\n"
            f"Contexto disponible:\n{context[:2000]}\n\n"
            f"Maximo 150 palabras. Directo y orientado a decision."
        )
        return await self._engine.generate(role="briefing", prompt=prompt, temperature=0.4)

    async def _generate_executive_summary(
        self, context: str, actors: list[str]
    ) -> str:
        actors_str = ", ".join(actors[:5]) if actors else "actores del mercado"
        prompt = (
            f"Genera un resumen ejecutivo de 80-100 palabras para el briefing matutino.\n"
            f"Actores principales cubiertos: {actors_str}\n\n"
            f"Contexto:\n{context[:1500]}\n\n"
            f"El resumen debe capturar lo mas urgente del dia."
        )
        return await self._engine.generate(role="briefing", prompt=prompt, temperature=0.3)

    async def _assessment_to_alert(self, assessment: StrategicAssessment) -> IntelAlert:
        top_risk = assessment.top_risks(1)
        risk_desc = top_risk[0].description if top_risk else "Riesgo no especificado"

        import hashlib
        alert_id = hashlib.sha1(
            (assessment.actor + risk_desc).encode()
        ).hexdigest()[:12]

        return IntelAlert(
            alert_id=alert_id,
            level="ALTO" if not assessment.has_critical_risk() else "CRITICO",
            title=f"Alerta estrategica: {assessment.actor}",
            body=f"{assessment.executive_summary[:400]} | Riesgo principal: {risk_desc[:200]}",
            actors=[assessment.actor],
            tags=[r.category for r in assessment.risks[:3]],
            source_count=assessment.context_signals,
            requires_action=assessment.has_critical_risk(),
        )

    @staticmethod
    def _clean_list(items: Any) -> list[str]:
        if not isinstance(items, list):
            return []
        return [str(i)[:100] for i in items[:10] if i]
