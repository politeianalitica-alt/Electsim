"""
Capa 6 — ContextAnalyzer.

Enriquece señales y analisis con contexto historico, comparativo y geopolitico.
Fuentes de contexto (todas opcionales, fallback a texto si no disponibles):
  - Base de datos de actores (DB lookup)
  - Memoria de sesion (conversaciones previas)
  - Contexto economico (datos macro)
  - Analogias historicas (patrones similares en el pasado)

La capa 6 no genera nueva inteligencia: enriquece la existente.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from agents.analysis.ollama_engine import OllamaEngine
from agents.analysis.strategic_analyzer import StrategicAssessment

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tipos
# ---------------------------------------------------------------------------

@dataclass
class HistoricalAnalogy:
    period: str
    description: str
    similarity_score: float = 0.5
    outcome: str = ""
    lessons: list[str] = field(default_factory=list)


@dataclass
class ActorProfile:
    name: str
    party: str = ""
    role: str = ""
    ideology_position: float = 0.0   # -1.0 (izda) a 1.0 (dcha)
    approval_trend: str = "estable"
    key_issues: list[str] = field(default_factory=list)
    known_alliances: list[str] = field(default_factory=list)
    known_adversaries: list[str] = field(default_factory=list)
    recent_controversies: list[str] = field(default_factory=list)


@dataclass
class EnrichedAssessment:
    base: StrategicAssessment
    actor_profile: ActorProfile | None = None
    historical_analogies: list[HistoricalAnalogy] = field(default_factory=list)
    geopolitical_context: str = ""
    economic_context: str = ""
    enrichment_sources: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# ContextAnalyzer
# ---------------------------------------------------------------------------

_ANALOGY_SCHEMA = """{
  "analogias": [
    {
      "periodo": "2008-2012",
      "descripcion": "...",
      "similitud": 0.7,
      "desenlace": "...",
      "lecciones": ["..."]
    }
  ]
}"""

_PROFILE_SCHEMA = """{
  "partido": "...",
  "cargo": "...",
  "posicion_ideologica": 0.0,
  "tendencia_aprobacion": "ascendente|descendente|estable",
  "temas_clave": ["..."],
  "alianzas_conocidas": ["..."],
  "adversarios_conocidos": ["..."],
  "controversias_recientes": ["..."]
}"""


class ContextAnalyzer:
    """
    Enriquece evaluaciones estrategicas con contexto historico y comparativo.

    Uso:
        async with OllamaEngine() as engine:
            ctx = ContextAnalyzer(engine)
            enriched = await ctx.enrich(assessment, context_docs=docs)
    """

    def __init__(
        self,
        engine: OllamaEngine,
        market_id: str = "ES",
    ) -> None:
        self._engine = engine
        self._market_id = market_id

    async def enrich(
        self,
        assessment: StrategicAssessment,
        context_docs: list[str] | None = None,
        economic_data: dict[str, Any] | None = None,
        geopolitical_summary: str = "",
    ) -> EnrichedAssessment:
        """
        Enriquece un assessment estrategico con contexto adicional.

        Args:
            assessment: assessment base de StrategicAnalyzer
            context_docs: documentos de contexto (noticias, historico, etc.)
            economic_data: datos economicos relevantes (PIB, desempleo, etc.)
            geopolitical_summary: resumen de contexto geopolitico
        """
        import asyncio

        docs_text = "\n\n".join((context_docs or [])[:5])
        economic_text = self._format_economic(economic_data or {})

        profile_task = self._build_actor_profile(assessment.actor, docs_text)
        analogy_task = self._find_analogies(assessment, docs_text)

        profile, analogies = await asyncio.gather(
            profile_task, analogy_task, return_exceptions=True
        )

        actor_profile = profile if isinstance(profile, ActorProfile) else None
        historical_analogies = analogies if isinstance(analogies, list) else []

        sources = ["strategic_assessment"]
        if context_docs:
            sources.append(f"{len(context_docs)} context_docs")
        if economic_data:
            sources.append("economic_data")
        if geopolitical_summary:
            sources.append("geopolitical_summary")

        return EnrichedAssessment(
            base=assessment,
            actor_profile=actor_profile,
            historical_analogies=historical_analogies,
            geopolitical_context=geopolitical_summary,
            economic_context=economic_text,
            enrichment_sources=sources,
        )

    async def _build_actor_profile(
        self, actor: str, context: str
    ) -> ActorProfile:
        prompt = (
            f"Basandote en el contexto disponible, genera un perfil de {actor} "
            f"en la politica {self._market_id}.\n\n"
            f"Contexto:\n{context[:2000]}\n\n"
            f"Schema: {_PROFILE_SCHEMA}"
        )
        data = await self._engine.extract_json(
            role="analisis", prompt=prompt, schema_hint=_PROFILE_SCHEMA
        )
        return ActorProfile(
            name=actor,
            party=str(data.get("partido", ""))[:100],
            role=str(data.get("cargo", ""))[:100],
            ideology_position=float(data.get("posicion_ideologica", 0.0)),
            approval_trend=str(data.get("tendencia_aprobacion", "estable")),
            key_issues=self._clean_list(data.get("temas_clave", [])),
            known_alliances=self._clean_list(data.get("alianzas_conocidas", [])),
            known_adversaries=self._clean_list(data.get("adversarios_conocidos", [])),
            recent_controversies=self._clean_list(data.get("controversias_recientes", [])),
        )

    async def _find_analogies(
        self, assessment: StrategicAssessment, context: str
    ) -> list[HistoricalAnalogy]:
        prompt = (
            f"Encuentra analogias historicas para la situacion de {assessment.actor}.\n"
            f"Tendencia actual: {assessment.trend.direction}\n"
            f"Riesgos: {'; '.join(r.description[:60] for r in assessment.risks[:3])}\n"
            f"Contexto historico disponible:\n{context[:1500]}\n\n"
            f"Schema: {_ANALOGY_SCHEMA}\n"
            f"Identifica 1-3 analogias historicas relevantes para la politica espanola."
        )
        data = await self._engine.extract_json(
            role="analisis", prompt=prompt, schema_hint=_ANALOGY_SCHEMA
        )
        analogies = []
        for raw in (data.get("analogias") or [])[:3]:
            if not isinstance(raw, dict):
                continue
            analogies.append(HistoricalAnalogy(
                period=str(raw.get("periodo", ""))[:50],
                description=str(raw.get("descripcion", ""))[:300],
                similarity_score=float(raw.get("similitud", 0.5)),
                outcome=str(raw.get("desenlace", ""))[:200],
                lessons=self._clean_list(raw.get("lecciones", [])),
            ))
        return analogies

    @staticmethod
    def _format_economic(data: dict[str, Any]) -> str:
        if not data:
            return ""
        lines = []
        for k, v in list(data.items())[:8]:
            lines.append(f"{k}: {v}")
        return "\n".join(lines)

    @staticmethod
    def _clean_list(items: Any) -> list[str]:
        if not isinstance(items, list):
            return []
        return [str(i)[:100] for i in items[:10] if i]
