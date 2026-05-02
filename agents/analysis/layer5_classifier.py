"""
Capa 5 — IntelligenceClassifier.

Clasifica señales de inteligencia en taxonomias predefinidas y
asigna scores de relevancia por actor, sector y mercado.

Taxonomias:
  Tipo:      legislativa, electoral, economica, mediatica, geopolitica,
             judicial, regulatoria, social, seguridad, diplomatica
  Subtipo:   especifico a cada tipo (ver _SUBTYPES)
  Impacto:   inmediato, corto_plazo, medio_plazo, largo_plazo
  Audiencia: partido, candidato, gobierno, oposicion, empresas, ciudadania
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from agents.analysis.extractor import IntelSignal
from agents.analysis.ollama_engine import OllamaEngine

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Taxonomia
# ---------------------------------------------------------------------------

_VALID_TYPES = {
    "legislativa", "electoral", "economica", "mediatica", "geopolitica",
    "judicial", "regulatoria", "social", "seguridad", "diplomatica",
}

_SUBTYPES: dict[str, list[str]] = {
    "legislativa": ["ley_aprobada", "proposicion_ley", "decreto", "reforma_constitucional"],
    "electoral":   ["sondeo", "candidatura", "campaña", "resultado", "alianza_electoral"],
    "economica":   ["presupuesto", "empleo", "inflacion", "pib", "deuda", "banca"],
    "mediatica":   ["polemica", "viral", "crisis_reputacional", "declaracion", "entrevista"],
    "geopolitica": ["conflicto", "sancion", "tratado", "migracion", "seguridad_energetica"],
    "judicial":    ["condena", "investigacion", "sentencia", "recurso", "imputacion"],
    "regulatoria": ["normativa_ue", "transposicion", "multa", "autorizacion"],
    "social":      ["manifestacion", "huelga", "encuesta_social", "desigualdad"],
    "seguridad":   ["terrorismo", "crimen_organizado", "ciberataque", "orden_publico"],
    "diplomatica": ["reunion_bilateral", "visita_estado", "acuerdo_internacional"],
}

_IMPACT_LEVELS = ["inmediato", "corto_plazo", "medio_plazo", "largo_plazo"]
_AUDIENCES = ["partido", "candidato", "gobierno", "oposicion", "empresas", "ciudadania"]


@dataclass
class ClassifiedSignal:
    original: IntelSignal
    intel_type: str = "mediatica"
    subtype: str = ""
    impact_horizon: str = "corto_plazo"
    audiences: list[str] = field(default_factory=list)
    relevance_scores: dict[str, float] = field(default_factory=dict)
    classification_confidence: float = 0.6


@dataclass
class ClassificationBatch:
    signals: list[ClassifiedSignal] = field(default_factory=list)
    high_relevance: list[ClassifiedSignal] = field(default_factory=list)
    by_type: dict[str, list[ClassifiedSignal]] = field(default_factory=dict)

    def filter_by_type(self, intel_type: str) -> list[ClassifiedSignal]:
        return [s for s in self.signals if s.intel_type == intel_type]

    def top_n(self, actor: str, n: int = 5) -> list[ClassifiedSignal]:
        scored = [
            s for s in self.signals
            if s.relevance_scores.get(actor, 0) > 0
        ]
        return sorted(
            scored, key=lambda s: s.relevance_scores.get(actor, 0), reverse=True
        )[:n]


# ---------------------------------------------------------------------------
# IntelligenceClassifier
# ---------------------------------------------------------------------------

_CLASSIFY_SCHEMA = """{
  "tipo": "legislativa|electoral|economica|mediatica|geopolitica|judicial|regulatoria|social|seguridad|diplomatica",
  "subtipo": "...",
  "horizonte_impacto": "inmediato|corto_plazo|medio_plazo|largo_plazo",
  "audiencias": ["partido", "gobierno"],
  "relevancia_actores": {"actor1": 0.8, "actor2": 0.5},
  "confianza": 0.7
}"""


class IntelligenceClassifier:
    """
    Clasifica señales de inteligencia en taxonomias predefinidas.

    Uso:
        async with OllamaEngine() as engine:
            clf = IntelligenceClassifier(engine, actors=["Sanchez", "Feijoo"])
            batch = await clf.classify_batch(signals)
            print(batch.filter_by_type("electoral"))
    """

    def __init__(
        self,
        engine: OllamaEngine,
        actors: list[str] | None = None,
        market_id: str = "ES",
    ) -> None:
        self._engine = engine
        self._actors = actors or []
        self._market_id = market_id

    async def classify(self, signal: IntelSignal) -> ClassifiedSignal:
        """Clasifica una señal individual."""
        actors_hint = ", ".join(self._actors[:10]) if self._actors else "varios"

        prompt = (
            f"Clasifica la siguiente señal de inteligencia politica.\n"
            f"Actores de interes: {actors_hint}\n"
            f"Mercado: {self._market_id}\n\n"
            f"Señal:\n"
            f"  Tipo original: {signal.signal_type}\n"
            f"  Urgencia: {signal.urgency}\n"
            f"  Resumen: {signal.summary}\n"
            f"  Actores: {', '.join(signal.actors)}\n\n"
            f"Schema: {_CLASSIFY_SCHEMA}"
        )

        data = await self._engine.extract_json(
            role="clasificar",
            prompt=prompt,
            schema_hint=_CLASSIFY_SCHEMA,
        )

        intel_type = str(data.get("tipo", "mediatica"))
        if intel_type not in _VALID_TYPES:
            intel_type = "mediatica"

        subtype = str(data.get("subtipo", ""))
        impact = str(data.get("horizonte_impacto", "corto_plazo"))
        if impact not in _IMPACT_LEVELS:
            impact = "corto_plazo"

        raw_audiences = data.get("audiencias", [])
        audiences = [a for a in (raw_audiences if isinstance(raw_audiences, list) else []) if a in _AUDIENCES]

        raw_relevance = data.get("relevancia_actores", {})
        relevance = {}
        if isinstance(raw_relevance, dict):
            for actor, score in raw_relevance.items():
                try:
                    relevance[str(actor)] = min(1.0, max(0.0, float(score)))
                except (TypeError, ValueError):
                    pass

        return ClassifiedSignal(
            original=signal,
            intel_type=intel_type,
            subtype=subtype,
            impact_horizon=impact,
            audiences=audiences,
            relevance_scores=relevance,
            classification_confidence=float(data.get("confianza", 0.6)),
        )

    async def classify_batch(
        self, signals: list[IntelSignal], concurrency: int = 4
    ) -> ClassificationBatch:
        """Clasifica un lote de señales con concurrencia controlada."""
        import asyncio

        sem = asyncio.Semaphore(concurrency)

        async def _classify_one(s: IntelSignal) -> ClassifiedSignal:
            async with sem:
                try:
                    return await self.classify(s)
                except Exception as exc:
                    logger.warning("classify_batch error: %s", exc)
                    return ClassifiedSignal(original=s)

        classified = await asyncio.gather(*[_classify_one(s) for s in signals])
        classified_list = list(classified)

        # Organizar batch
        high_rel = [
            c for c in classified_list
            if any(v >= 0.7 for v in c.relevance_scores.values())
            or c.original.urgency == "alta"
        ]

        by_type: dict[str, list[ClassifiedSignal]] = {}
        for c in classified_list:
            by_type.setdefault(c.intel_type, []).append(c)

        return ClassificationBatch(
            signals=classified_list,
            high_relevance=high_rel,
            by_type=by_type,
        )
