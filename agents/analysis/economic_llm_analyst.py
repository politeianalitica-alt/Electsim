"""
EconomicLLMAnalyst — Analisis LLM de datos economicos.

Convierte datos numericos economicos (series temporales, forecasts, ITPE)
en narrativas comprensibles para analistas politicos:

  - Analisis de coyuntura economica (200 palabras)
  - Interpretacion politica de los datos macro
  - Identificacion de riesgos economicos con implicacion electoral
  - Generacion de mensajes de campaña basados en datos economicos
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from agents.analysis.economic_forecasting import EnsembleForecast, ForecastResult
from agents.analysis.economic_timeseries import ProcessedSeries, TimeSeriesSummary
from agents.analysis.itpe_engine import ITPESnapshot
from agents.analysis.ollama_engine import OllamaEngine

logger = logging.getLogger(__name__)


@dataclass
class EconomicNarrative:
    headline: str
    coyunctura: str
    interpretacion_politica: str
    riesgos_electorales: list[str] = field(default_factory=list)
    mensajes_campaña: dict[str, str] = field(default_factory=dict)
    itpe_commentary: str = ""


class EconomicLLMAnalyst:
    """
    Analista LLM de datos economicos.

    Uso:
        async with OllamaEngine() as engine:
            analyst = EconomicLLMAnalyst(engine)
            narrative = await analyst.analyze(
                summaries=summaries,
                itpe=snapshot,
                forecasts=forecasts,
            )
    """

    def __init__(self, engine: OllamaEngine) -> None:
        self._engine = engine

    async def analyze(
        self,
        summaries: list[TimeSeriesSummary] | None = None,
        itpe: ITPESnapshot | None = None,
        forecasts: list[ForecastResult] | None = None,
        political_context: str = "",
        actors: list[str] | None = None,
    ) -> EconomicNarrative:
        """
        Genera una narrativa economica completa.

        Args:
            summaries: resumenes de series temporales
            itpe: snapshot del ITPE
            forecasts: resultados de forecasting
            political_context: contexto politico adicional
            actors: actores para los que generar mensajes de campaña
        """
        import asyncio

        data_block = self._build_data_block(summaries, itpe, forecasts)

        coyunctura_task = self._generate_coyunctura(data_block)
        interpretacion_task = self._generate_interpretacion(data_block, political_context)
        riesgos_task = self._generate_riesgos_electorales(data_block)

        results = await asyncio.gather(
            coyunctura_task, interpretacion_task, riesgos_task,
            return_exceptions=True
        )

        coyunctura = results[0] if isinstance(results[0], str) else ""
        interpretacion = results[1] if isinstance(results[1], str) else ""
        riesgos_raw = results[2] if isinstance(results[2], str) else ""

        # Parsear riesgos como lista
        riesgos = [
            line.lstrip("- •").strip()
            for line in riesgos_raw.split("\n")
            if line.strip() and not line.strip().startswith("#")
        ][:6]

        # Mensajes de campaña por actor
        mensajes: dict[str, str] = {}
        if actors:
            msg_tasks = [
                self._generate_campaign_message(actor, data_block, political_context)
                for actor in actors[:4]
            ]
            msg_results = await asyncio.gather(*msg_tasks, return_exceptions=True)
            for i, actor in enumerate(actors[:4]):
                if isinstance(msg_results[i], str):
                    mensajes[actor] = msg_results[i]

        # Commentary ITPE
        itpe_commentary = ""
        if itpe:
            itpe_commentary = await self._generate_itpe_commentary(itpe)

        # Headline
        headline = await self._generate_headline(coyunctura, itpe)

        return EconomicNarrative(
            headline=headline,
            coyunctura=coyunctura,
            interpretacion_politica=interpretacion,
            riesgos_electorales=riesgos,
            mensajes_campaña=mensajes,
            itpe_commentary=itpe_commentary,
        )

    async def _generate_coyunctura(self, data_block: str) -> str:
        prompt = (
            "Genera un analisis de coyuntura economica de 180-220 palabras "
            "sobre los siguientes datos de la economia espanola.\n\n"
            f"Datos:\n{data_block}\n\n"
            "El analisis debe ser tecnico pero comprensible, orientado a "
            "un analista politico, no a un economista."
        )
        return await self._engine.generate(role="briefing", prompt=prompt, temperature=0.4)

    async def _generate_interpretacion(self, data_block: str, political_context: str) -> str:
        prompt = (
            "Interpreta el impacto politico de los siguientes datos economicos.\n\n"
            f"Datos economicos:\n{data_block}\n\n"
            f"Contexto politico:\n{political_context[:500] or 'No especificado'}\n\n"
            "Responde en 150-200 palabras. Enfocate en: "
            "como afectan estos datos al gobierno, a la oposicion y "
            "a la intencion de voto de los ciudadanos."
        )
        return await self._engine.generate(role="analisis", prompt=prompt, temperature=0.3)

    async def _generate_riesgos_electorales(self, data_block: str) -> str:
        prompt = (
            "Lista los 4-6 principales riesgos electorales derivados "
            "de la situacion economica actual.\n\n"
            f"Datos:\n{data_block}\n\n"
            "Formato: una lista con guion por riesgo. "
            "Ser concreto y cuantificar cuando sea posible."
        )
        return await self._engine.generate(role="analisis", prompt=prompt, temperature=0.2)

    async def _generate_campaign_message(
        self, actor: str, data_block: str, political_context: str
    ) -> str:
        prompt = (
            f"Genera un mensaje de campaña economico de 60-80 palabras para {actor}.\n\n"
            f"Datos economicos:\n{data_block[:1000]}\n\n"
            f"Contexto: {political_context[:300]}\n\n"
            f"El mensaje debe ser persuasivo, basado en los datos reales, "
            f"y adaptado al perfil ideologico tipico de {actor}."
        )
        return await self._engine.generate(role="briefing", prompt=prompt, temperature=0.6)

    async def _generate_itpe_commentary(self, itpe: ITPESnapshot) -> str:
        dims_text = "\n".join(
            f"  {d.name}: {d.score:.0f}/100 — {', '.join(d.drivers[:2]) or 'sin alertas'}"
            for d in itpe.dimensions
        )
        delta_text = ""
        if itpe.delta_7d is not None:
            delta_text = f"Cambio 7d: {itpe.delta_7d:+.1f} puntos"

        prompt = (
            f"Comenta el Indice de Tension Politico-Economica (ITPE) en 80-100 palabras.\n\n"
            f"ITPE: {itpe.itpe_score:.1f}/100 — Nivel: {itpe.itpe_level.upper()}\n"
            f"{delta_text}\n"
            f"Dimensiones:\n{dims_text}\n\n"
            f"El comentario debe explicar que significa este nivel y "
            f"que implicaciones tiene para la estabilidad del gobierno."
        )
        return await self._engine.generate(role="analisis", prompt=prompt, temperature=0.3)

    async def _generate_headline(
        self, coyunctura: str, itpe: ITPESnapshot | None
    ) -> str:
        itpe_text = ""
        if itpe:
            itpe_text = f"ITPE: {itpe.itpe_score:.0f}/100 ({itpe.itpe_level})"

        prompt = (
            f"Genera un titular periodistico de 10-15 palabras que resuma "
            f"la situacion economica.\n\n"
            f"{itpe_text}\n"
            f"Coyunctura: {coyunctura[:200]}\n\n"
            f"El titular debe ser directo, informativo y neutral."
        )
        return await self._engine.generate(role="rapido", prompt=prompt, temperature=0.5)

    @staticmethod
    def _build_data_block(
        summaries: list[TimeSeriesSummary] | None,
        itpe: ITPESnapshot | None,
        forecasts: list[ForecastResult] | None,
    ) -> str:
        parts = []

        if summaries:
            parts.append("INDICADORES ACTUALES:")
            for s in summaries[:8]:
                pct_text = f" (YoY: {s.pct_change_yoy:+.1f}%)" if s.pct_change_yoy else ""
                parts.append(
                    f"  {s.indicator} [{s.geo}]: {s.latest_value:.2f}{s.unit} "
                    f"— tendencia: {s.trend}{pct_text}"
                )

        if itpe:
            parts.append(
                f"\nITPE: {itpe.itpe_score:.1f}/100 ({itpe.itpe_level.upper()})"
            )
            for d in itpe.dimensions:
                if d.drivers:
                    parts.append(f"  {d.name}: {d.score:.0f}/100 — {d.drivers[0]}")

        if forecasts:
            parts.append("\nPROYECCIONES (proximos 12 meses):")
            for fc in forecasts[:4]:
                if fc.is_available and fc.points:
                    last_point = fc.points[-1]
                    parts.append(
                        f"  {fc.indicator} [{fc.geo}]: "
                        f"proyeccion={last_point.value:.2f} "
                        f"[{last_point.lower_bound:.2f}, {last_point.upper_bound:.2f}]"
                        f" ({fc.model})"
                    )

        return "\n".join(parts) if parts else "Sin datos economicos disponibles."
