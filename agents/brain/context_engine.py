"""
ContextEngine — Motor de contexto en background.

Mantiene un contexto actualizado del entorno politico que el Brain
puede usar para responder preguntas del analista con informacion reciente.

Operacion:
  - Refresca el contexto cada N minutos (configurable)
  - Almacena en memoria un dict de contexto por categoria
  - Expone get_context() para el sidebar

Categorias de contexto:
  economic    — datos macro del dia
  legislative — noticias del Congreso/Senado/BOE
  political   — encuestas, declaraciones, movimientos
  geopolitical — eventos internacionales relevantes
  actors      — estado actual de actores monitorizados
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_REFRESH_MINUTES = 30


@dataclass
class ContextSnapshot:
    """Snapshot del contexto en un momento dado."""
    category: str
    data: dict[str, Any]
    updated_at: datetime = field(
        default_factory=lambda: datetime.now(tz=timezone.utc)
    )
    source_count: int = 0

    def age_minutes(self) -> float:
        delta = datetime.now(tz=timezone.utc) - self.updated_at
        return delta.total_seconds() / 60


class ContextEngine:
    """
    Motor de contexto en background para el Brain.

    Uso:
        engine = ContextEngine(ollama_engine, refresh_minutes=30)
        await engine.start()  # inicia el loop de refresco

        # En el sidebar:
        ctx = engine.get_context("political")
        print(ctx.data)

        await engine.stop()  # detiene el loop
    """

    def __init__(
        self,
        ollama_engine: Any,
        refresh_minutes: int = _DEFAULT_REFRESH_MINUTES,
        actors: list[str] | None = None,
        market_id: str = "ES",
    ) -> None:
        self._engine = ollama_engine
        self._refresh_minutes = refresh_minutes
        self._actors = actors or []
        self._market_id = market_id
        self._context: dict[str, ContextSnapshot] = {}
        self._task: asyncio.Task | None = None  # type: ignore[type-arg]
        self._running = False

    async def start(self) -> None:
        """Inicia el loop de refresco en background."""
        self._running = True
        await self._refresh_all()  # Primer refresco inmediato
        self._task = asyncio.create_task(self._refresh_loop())
        logger.info("ContextEngine iniciado (refresh cada %dm)", self._refresh_minutes)

    async def stop(self) -> None:
        """Detiene el loop de refresco."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("ContextEngine detenido")

    async def _refresh_loop(self) -> None:
        while self._running:
            await asyncio.sleep(self._refresh_minutes * 60)
            if self._running:
                try:
                    await self._refresh_all()
                except Exception as exc:
                    logger.warning("ContextEngine refresh error: %s", exc)

    async def _refresh_all(self) -> None:
        """Refresca todas las categorias de contexto."""
        logger.debug("ContextEngine: refrescando contexto")
        tasks = [
            self._refresh_political(),
            self._refresh_economic(),
            self._refresh_legislative(),
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _refresh_political(self) -> None:
        """Refresca contexto politico desde feeds y busqueda."""
        from agents.brain.web_ingestion.feed_monitor import FeedMonitor

        try:
            async with FeedMonitor(actors=self._actors) as monitor:
                result = await monitor.check(max_per_feed=10)

            actor_summaries: dict[str, Any] = {}
            for actor, items in result.actor_mentions.items():
                actor_summaries[actor] = {
                    "mentions_today": len(items),
                    "recent_titles": [i.title for i in items[:3]],
                    "trending": actor in result.trending_actors,
                }

            self._context["political"] = ContextSnapshot(
                category="political",
                data={
                    "actors": actor_summaries,
                    "trending": result.trending_actors,
                    "new_items": result.new_items_count,
                },
                source_count=result.sources_checked,
            )
        except Exception as exc:
            logger.debug("_refresh_political error: %s", exc)

    async def _refresh_economic(self) -> None:
        """Refresca contexto economico con datos sinteticos (o BD si disponible)."""
        try:
            # Intentar desde BD
            from etl.sources.economic_sources import EconomicDataAggregator
            from datetime import date, timedelta

            async with EconomicDataAggregator(include_omie=False) as agg:
                points = await agg.fetch_all(
                    start=date.today() - timedelta(days=7)
                )
            indicator_dict = EconomicDataAggregator.to_indicator_dict(points)
            self._context["economic"] = ContextSnapshot(
                category="economic",
                data=indicator_dict,
                source_count=len(set(p.source for p in points)),
            )
        except Exception as exc:
            logger.debug("_refresh_economic: %s", exc)

    async def _refresh_legislative(self) -> None:
        """Refresca contexto legislativo (placeholder — conectar con BOE ETL)."""
        self._context["legislative"] = ContextSnapshot(
            category="legislative",
            data={"status": "pendiente_integracion_boe"},
            source_count=0,
        )

    # ------------------------------------------------------------------
    # API publica
    # ------------------------------------------------------------------

    def get_context(self, category: str = "political") -> ContextSnapshot | None:
        """Retorna el snapshot de contexto mas reciente para una categoria."""
        return self._context.get(category)

    def get_all_context(self) -> dict[str, ContextSnapshot]:
        """Retorna todos los snapshots de contexto."""
        return dict(self._context)

    def get_context_summary(self) -> str:
        """
        Genera un resumen de texto del contexto actual.
        Util para inyectar en prompts del Brain.
        """
        parts = []
        for cat, snapshot in self._context.items():
            age = snapshot.age_minutes()
            parts.append(f"[{cat.upper()}] (hace {age:.0f}min): {snapshot.data}")
        return "\n".join(parts) if parts else "Contexto no disponible."

    def is_fresh(self, category: str, max_age_minutes: float | None = None) -> bool:
        """True si el contexto es reciente."""
        snapshot = self._context.get(category)
        if not snapshot:
            return False
        limit = max_age_minutes or self._refresh_minutes * 1.5
        return snapshot.age_minutes() <= limit
