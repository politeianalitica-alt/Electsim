"""
Capa 8 — PoliteiaMasterOrchestrator.

Orquesta todas las capas de analisis (1-7) para producir un analisis
completo de inteligencia politica dado un conjunto de textos de entrada.

Pipeline:
  1. Extraccion (capa 1): entidades, hechos, señales
  2. Clasificacion (capa 5): taxonomia y relevancia
  3. Contexto (capa 6): enriquecimiento historico
  4. Analisis estrategico (capa 2): por actor
  5. Analisis multi-motor (capa 7): posicion, coalicion, narrativa, riesgo
  6. Sintesis (capa 3): briefing, alertas

El orchestrator respeta el CircuitBreaker del OllamaEngine —
si Ollama no esta disponible, retorna un resultado degradado
con lo que se pudo calcular de forma deterministica.
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from agents.analysis.extractor import ExtractionResult, StructuredExtractor
from agents.analysis.layer5_classifier import ClassificationBatch, IntelligenceClassifier
from agents.analysis.layer6_context import ContextAnalyzer, EnrichedAssessment
from agents.analysis.layer7_strategic import StrategicAnalysis7, StrategicAnalyzer7
from agents.analysis.ollama_engine import OllamaEngine
from agents.analysis.strategic_analyzer import StrategicAnalyzer, StrategicAssessment
from agents.analysis.synthesis_engine import DailyBriefing, IntelAlert, SynthesisEngine

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tipos de entrada/salida del orchestrator
# ---------------------------------------------------------------------------

@dataclass
class OrchestratorInput:
    texts: list[str]                          # textos a analizar
    focus_actors: list[str] = field(default_factory=list)  # actores de interes
    market_id: str = "ES"
    sector_ids: list[str] = field(default_factory=lambda: ["PARTY"])
    poll_data: dict[str, float] = field(default_factory=dict)
    economic_data: dict[str, Any] = field(default_factory=dict)
    geopolitical_summary: str = ""
    briefing_type: str = "morning_briefing"
    run_deep_analysis: bool = True            # ejecutar capas 6 y 7


@dataclass
class OrchestratorOutput:
    extraction: ExtractionResult | None = None
    classification: ClassificationBatch | None = None
    assessments: list[StrategicAssessment] = field(default_factory=list)
    enriched_assessments: list[EnrichedAssessment] = field(default_factory=list)
    deep_analyses: list[StrategicAnalysis7] = field(default_factory=list)
    briefing: DailyBriefing | None = None
    alerts: list[IntelAlert] = field(default_factory=list)
    elapsed_seconds: float = 0.0
    errors: list[str] = field(default_factory=list)
    is_degraded: bool = False

    def has_critical_alerts(self) -> bool:
        return any(a.level == "CRITICO" for a in self.alerts)

    def summary_line(self) -> str:
        actors = len(self.assessments)
        signals = len(self.classification.signals) if self.classification else 0
        return (
            f"Actores: {actors} | Señales: {signals} | "
            f"Alertas: {len(self.alerts)} | Tiempo: {self.elapsed_seconds:.1f}s"
        )


# ---------------------------------------------------------------------------
# PoliteiaMasterOrchestrator
# ---------------------------------------------------------------------------

class PoliteiaMasterOrchestrator:
    """
    Orchestrator maestro de inteligencia politica.

    Uso tipico (en un worker de Celery o en un endpoint FastAPI):

        async with OllamaEngine(market_id=workspace.market_id) as engine:
            orch = PoliteiaMasterOrchestrator(engine)
            result = await orch.run(OrchestratorInput(
                texts=noticias_del_dia,
                focus_actors=["Pedro Sanchez", "Alberto Feijoo"],
                poll_data={"PSOE": 28.5, "PP": 33.2},
            ))
            if result.briefing:
                guardar_briefing(result.briefing)
            for alert in result.alerts:
                enviar_notificacion(alert)
    """

    def __init__(self, engine: OllamaEngine) -> None:
        self._engine = engine
        self._extractor = StructuredExtractor(engine)
        self._classifier = IntelligenceClassifier(engine)
        self._strategic = StrategicAnalyzer(engine)
        self._context = ContextAnalyzer(engine)
        self._strategic7 = StrategicAnalyzer7(engine)
        self._synthesis = SynthesisEngine(engine)

    async def run(self, input_: OrchestratorInput) -> OrchestratorOutput:
        """
        Ejecuta el pipeline completo de inteligencia.

        Orden de capas:
          1. Extraccion (todos los textos combinados)
          2. Clasificacion de señales
          3. Analisis estrategico por actor (paralelo)
          4. Enriquecimiento con contexto (paralelo, si run_deep_analysis)
          5. Analisis multi-motor capa 7 (paralelo, si run_deep_analysis)
          6. Sintesis (briefing + alertas)
        """
        t_start = time.monotonic()
        output = OrchestratorOutput()
        errors: list[str] = []

        # Verificar disponibilidad
        if not await self._engine.is_available():
            logger.warning("OllamaEngine no disponible — pipeline degradado")
            output.is_degraded = True
            output.errors = ["OllamaEngine no disponible"]
            output.elapsed_seconds = time.monotonic() - t_start
            return output

        # Actualizar actores en clasificador
        self._classifier = IntelligenceClassifier(
            self._engine,
            actors=input_.focus_actors,
            market_id=input_.market_id,
        )

        # --- Capa 1: Extraccion ---
        combined_text = "\n\n".join(t[:2000] for t in input_.texts[:20])
        try:
            extraction = await self._extractor.extract(combined_text)
            output.extraction = extraction
        except Exception as exc:
            errors.append(f"Extraccion: {exc}")
            extraction = ExtractionResult()
            output.is_degraded = True

        # --- Capa 5: Clasificacion ---
        if extraction.signals:
            try:
                classification = await self._classifier.classify_batch(extraction.signals)
                output.classification = classification
            except Exception as exc:
                errors.append(f"Clasificacion: {exc}")

        # --- Capa 2: Analisis estrategico por actor ---
        actors_to_analyze = input_.focus_actors or extraction.entities.all_actors()[:5]
        if actors_to_analyze:
            assess_tasks = [
                self._strategic.analyze(
                    actor=actor,
                    extraction=extraction,
                    context="\n".join(input_.texts[:3]),
                )
                for actor in actors_to_analyze[:6]
            ]
            assess_results = await asyncio.gather(*assess_tasks, return_exceptions=True)
            assessments = [
                r for r in assess_results if isinstance(r, StrategicAssessment)
            ]
            output.assessments = assessments
            errors.extend([
                f"Analisis {actors_to_analyze[i]}: {r}"
                for i, r in enumerate(assess_results)
                if isinstance(r, Exception)
            ])

        # --- Capas 6 y 7: Solo si run_deep_analysis ---
        if input_.run_deep_analysis and output.assessments:
            # Capa 6: Enriquecimiento
            enrich_tasks = [
                self._context.enrich(
                    assessment=a,
                    context_docs=input_.texts[:5],
                    economic_data=input_.economic_data,
                    geopolitical_summary=input_.geopolitical_summary,
                )
                for a in output.assessments
            ]
            enrich_results = await asyncio.gather(*enrich_tasks, return_exceptions=True)
            enriched = [r for r in enrich_results if isinstance(r, EnrichedAssessment)]
            output.enriched_assessments = enriched

            # Capa 7: Analisis multi-motor
            deep_tasks = [
                self._strategic7.analyze(
                    actor=e.base.actor,
                    enriched=e,
                    poll_data=input_.poll_data,
                    competing_actors=actors_to_analyze,
                    run_scenarios=True,
                )
                for e in enriched[:4]  # Limitar para no sobrecargar
            ]
            deep_results = await asyncio.gather(*deep_tasks, return_exceptions=True)
            output.deep_analyses = [
                r for r in deep_results if isinstance(r, StrategicAnalysis7)
            ]

        # --- Capa 3: Sintesis ---
        try:
            briefing = await self._synthesis.morning_briefing(
                assessments=output.assessments,
                raw_signals=extraction.signals,
                market_context=f"Mercado: {input_.market_id} | Sectores: {input_.sector_ids}",
            )
            output.briefing = briefing
            output.alerts = briefing.alerts
        except Exception as exc:
            errors.append(f"Sintesis: {exc}")

        # Alertas adicionales por señales de alta urgencia
        if extraction.signals:
            high_urgency = [s for s in extraction.signals if s.urgency == "alta"]
            if high_urgency:
                try:
                    extra_alert = await self._synthesis.generate_alert(
                        signals=high_urgency,
                        context=combined_text[:500],
                    )
                    if extra_alert:
                        output.alerts.append(extra_alert)
                except Exception as exc:
                    errors.append(f"Alerta extra: {exc}")

        output.errors = errors
        output.elapsed_seconds = time.monotonic() - t_start
        logger.info(
            "PoliteiaMasterOrchestrator completado: %s", output.summary_line()
        )
        return output
