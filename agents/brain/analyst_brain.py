"""
AnalystBrain — Motor de insights proactivos.

El AnalystBrain combina el FeedMonitor, SearchAgent y OllamaEngine
para generar insights proactivos sin que el analista tenga que pedirlos:

  1. Detecta picos de cobertura en feeds RSS
  2. Busca contexto adicional via DuckDuckGo
  3. Extrae señales de inteligencia del corpus acumulado
  4. Genera un insight proactivo via LLM
  5. Almacena en la cola de insights para el sidebar

El AnalystBrain corre en background (via ContextEngine).
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ProactiveInsight:
    actor: str
    trigger: str              # pico_cobertura, señal_alta, trending_topic
    insight: str
    confidence: float = 0.7
    sources: list[str] = field(default_factory=list)
    generated_at: str = field(
        default_factory=lambda: datetime.now(tz=timezone.utc).isoformat()
    )
    is_read: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "actor": self.actor,
            "trigger": self.trigger,
            "insight": self.insight,
            "confidence": self.confidence,
            "sources": self.sources,
            "generated_at": self.generated_at,
        }


class AnalystBrain:
    """
    Motor de insights proactivos.

    Uso:
        async with BrainOllamaClient() as engine:
            brain = AnalystBrain(engine)
            insights = await brain.run_cycle(
                actors=["Pedro Sanchez", "Feijoo"]
            )
            for insight in insights:
                print(f"[{insight.actor}] {insight.insight}")
    """

    def __init__(
        self,
        engine: Any,
        actors: list[str] | None = None,
        min_spike_threshold: int = 3,
    ) -> None:
        self._engine = engine
        self._actors = actors or []
        self._min_spike = min_spike_threshold
        self._insight_queue: list[ProactiveInsight] = []

    async def run_cycle(
        self,
        actors: list[str] | None = None,
        max_insights: int = 5,
    ) -> list[ProactiveInsight]:
        """
        Ejecuta un ciclo de monitoreo y genera insights proactivos.

        Args:
            actors: actores a monitorear (override)
            max_insights: maximo de insights a generar por ciclo

        Returns:
            lista de insights proactivos nuevos
        """
        from agents.brain.web_ingestion.feed_monitor import FeedMonitor
        from agents.brain.web_ingestion.search_agent import SearchAgent
        from agents.analysis.extractor import StructuredExtractor

        target_actors = actors or self._actors
        if not target_actors:
            return []

        insights: list[ProactiveInsight] = []

        # Monitorear feeds
        async with FeedMonitor(actors=target_actors) as monitor:
            feed_result = await monitor.check()

        # Procesar actores con pico de cobertura
        for actor in feed_result.trending_actors[:max_insights]:
            actor_items = feed_result.items_for_actor(actor)
            texts = [
                f"{item.title}. {item.summary}"
                for item in actor_items[:10]
            ]

            if not texts:
                continue

            try:
                insight = await self._generate_insight(
                    actor=actor,
                    texts=texts,
                    trigger="pico_cobertura",
                    n_mentions=len(actor_items),
                )
                if insight:
                    insights.append(insight)
            except Exception as exc:
                logger.debug("AnalystBrain insight %s: %s", actor, exc)

        # Buscar contexto adicional para actores sin pico pero de interes
        remaining_actors = [
            a for a in target_actors
            if a not in feed_result.trending_actors
        ][:2]

        search_agent = SearchAgent()
        for actor in remaining_actors:
            try:
                search_result = await search_agent.search_actor(
                    actor, max_results=5
                )
                if search_result.results:
                    texts = [
                        f"{r.title}. {r.snippet}"
                        for r in search_result.results
                    ]
                    insight = await self._generate_insight(
                        actor=actor,
                        texts=texts,
                        trigger="busqueda_proactiva",
                        n_mentions=len(search_result.results),
                    )
                    if insight:
                        insights.append(insight)
            except Exception as exc:
                logger.debug("AnalystBrain search %s: %s", actor, exc)

        self._insight_queue.extend(insights)
        return insights

    async def _generate_insight(
        self,
        actor: str,
        texts: list[str],
        trigger: str,
        n_mentions: int = 0,
    ) -> ProactiveInsight | None:
        if not texts or not self._engine:
            return None

        combined = "\n".join(f"- {t[:200]}" for t in texts[:8])
        prompt = (
            f"Genera un insight politico proactivo sobre {actor}.\n"
            f"Trigger: {trigger} ({n_mentions} menciones)\n\n"
            f"Textos recientes:\n{combined}\n\n"
            f"El insight debe ser de 60-80 palabras, directo, "
            f"con implicacion estrategica clara para un analista politico."
        )

        try:
            text = await self._engine.generate(
                role="analisis",
                prompt=prompt,
                temperature=0.5,
            )
            if not text or len(text.split()) < 5:
                return None

            return ProactiveInsight(
                actor=actor,
                trigger=trigger,
                insight=text[:500],
                confidence=0.7 if trigger == "pico_cobertura" else 0.5,
                sources=[f"feed_monitor:{trigger}"],
            )
        except Exception as exc:
            logger.debug("_generate_insight LLM error: %s", exc)
            return None

    def get_unread_insights(self) -> list[ProactiveInsight]:
        """Retorna los insights no leidos de la cola."""
        return [i for i in self._insight_queue if not i.is_read]

    def mark_read(self, actor: str) -> None:
        """Marca como leidos todos los insights de un actor."""
        for i in self._insight_queue:
            if i.actor == actor:
                i.is_read = True

    def clear_read(self) -> None:
        """Elimina insights leidos de la cola."""
        self._insight_queue = [i for i in self._insight_queue if not i.is_read]
