"""
Capa 1 — StructuredExtractor.

Extrae entidades, hechos y señales de inteligencia de texto crudo.
Tres layers:
  L1a  Entidades nombradas (personas, org, lugares, temas)
  L1b  Hechos verificables (declaraciones con actor + accion + objeto + fecha)
  L1c  Señales de inteligencia (tipo, urgencia, actores implicados, confianza)

Usa OllamaEngine como motor LLM. Diseñado para ser llamado por capa 2
y por el orchestrator.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from agents.analysis.ollama_engine import OllamaEngine

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tipos de salida
# ---------------------------------------------------------------------------

@dataclass
class NamedEntities:
    personas: list[str] = field(default_factory=list)
    organizaciones: list[str] = field(default_factory=list)
    lugares: list[str] = field(default_factory=list)
    temas: list[str] = field(default_factory=list)
    partidos: list[str] = field(default_factory=list)

    def all_actors(self) -> list[str]:
        return list(set(self.personas + self.organizaciones + self.partidos))


@dataclass
class VerifiedFact:
    actor: str
    action: str
    object_: str
    date_hint: str = ""
    source_text: str = ""
    confidence: float = 0.7


@dataclass
class IntelSignal:
    signal_type: str          # declaracion, movimiento, alianza, ruptura, crisis, regulacion
    urgency: str              # alta, media, baja
    actors: list[str] = field(default_factory=list)
    summary: str = ""
    confidence: float = 0.6
    tags: list[str] = field(default_factory=list)


@dataclass
class ExtractionResult:
    entities: NamedEntities = field(default_factory=NamedEntities)
    facts: list[VerifiedFact] = field(default_factory=list)
    signals: list[IntelSignal] = field(default_factory=list)
    raw_text_len: int = 0
    model_used: str = ""

    def has_content(self) -> bool:
        return bool(
            self.entities.all_actors()
            or self.facts
            or self.signals
        )


# ---------------------------------------------------------------------------
# StructuredExtractor
# ---------------------------------------------------------------------------

_ENTITY_SCHEMA = """{
  "personas": ["nombre completo"],
  "organizaciones": ["nombre org"],
  "lugares": ["lugar"],
  "temas": ["tema/keyword"],
  "partidos": ["partido politico"]
}"""

_FACT_SCHEMA = """{
  "hechos": [
    {"actor": "...", "accion": "...", "objeto": "...", "fecha": "...", "confianza": 0.8}
  ]
}"""

_SIGNAL_SCHEMA = """{
  "señales": [
    {
      "tipo": "declaracion|movimiento|alianza|ruptura|crisis|regulacion",
      "urgencia": "alta|media|baja",
      "actores": ["..."],
      "resumen": "...",
      "confianza": 0.7,
      "etiquetas": ["..."]
    }
  ]
}"""


class StructuredExtractor:
    """
    Extractor de informacion estructurada a partir de texto politico.

    Uso:
        engine = OllamaEngine()
        async with engine:
            extractor = StructuredExtractor(engine)
            result = await extractor.extract(texto)
            print(result.entities.personas)
            print(result.signals)
    """

    def __init__(self, engine: OllamaEngine) -> None:
        self._engine = engine

    # ------------------------------------------------------------------
    # Layer 1a — Entidades nombradas
    # ------------------------------------------------------------------

    async def extract_entities(self, text: str) -> NamedEntities:
        """Extrae entidades nombradas del texto."""
        if not text or not text.strip():
            return NamedEntities()

        prompt = (
            "Extrae todas las entidades nombradas del siguiente texto politico en espanol.\n"
            f"Schema esperado: {_ENTITY_SCHEMA}\n\n"
            f"Texto:\n{text[:3000]}"
        )

        data = await self._engine.extract_json(
            role="entidades",
            prompt=prompt,
            schema_hint=_ENTITY_SCHEMA,
        )

        return NamedEntities(
            personas=self._clean_list(data.get("personas", [])),
            organizaciones=self._clean_list(data.get("organizaciones", [])),
            lugares=self._clean_list(data.get("lugares", [])),
            temas=self._clean_list(data.get("temas", [])),
            partidos=self._clean_list(data.get("partidos", [])),
        )

    # ------------------------------------------------------------------
    # Layer 1b — Hechos verificables
    # ------------------------------------------------------------------

    async def extract_facts(self, text: str) -> list[VerifiedFact]:
        """Extrae declaraciones y hechos verificables."""
        if not text or not text.strip():
            return []

        prompt = (
            "Extrae los hechos verificables del siguiente texto politico.\n"
            "Un hecho verificable tiene: actor, accion, objeto, fecha (si se menciona).\n"
            f"Schema: {_FACT_SCHEMA}\n\n"
            f"Texto:\n{text[:3000]}"
        )

        data = await self._engine.extract_json(
            role="entidades",
            prompt=prompt,
            schema_hint=_FACT_SCHEMA,
        )

        facts = []
        for raw in data.get("hechos", [])[:10]:
            if not isinstance(raw, dict):
                continue
            facts.append(VerifiedFact(
                actor=str(raw.get("actor", ""))[:100],
                action=str(raw.get("accion", ""))[:200],
                object_=str(raw.get("objeto", ""))[:200],
                date_hint=str(raw.get("fecha", ""))[:50],
                source_text=text[:200],
                confidence=float(raw.get("confianza", 0.7)),
            ))
        return facts

    # ------------------------------------------------------------------
    # Layer 1c — Señales de inteligencia
    # ------------------------------------------------------------------

    async def extract_signals(self, text: str) -> list[IntelSignal]:
        """Extrae señales de inteligencia politica del texto."""
        if not text or not text.strip():
            return []

        prompt = (
            "Analiza el siguiente texto y extrae señales de inteligencia politica.\n"
            "Una señal es un evento, declaracion o movimiento con implicaciones estrategicas.\n"
            f"Schema: {_SIGNAL_SCHEMA}\n\n"
            f"Texto:\n{text[:4000]}"
        )

        data = await self._engine.extract_json(
            role="clasificar",
            prompt=prompt,
            schema_hint=_SIGNAL_SCHEMA,
        )

        signals = []
        for raw in data.get("señales", [])[:8]:
            if not isinstance(raw, dict):
                continue
            signals.append(IntelSignal(
                signal_type=str(raw.get("tipo", "declaracion")),
                urgency=str(raw.get("urgencia", "media")),
                actors=self._clean_list(raw.get("actores", [])),
                summary=str(raw.get("resumen", ""))[:500],
                confidence=float(raw.get("confianza", 0.6)),
                tags=self._clean_list(raw.get("etiquetas", [])),
            ))
        return signals

    # ------------------------------------------------------------------
    # Pipeline completo
    # ------------------------------------------------------------------

    async def extract(self, text: str, include_facts: bool = True) -> ExtractionResult:
        """
        Pipeline completo de extraccion (layers 1a + 1b + 1c).

        Para texto corto o cuando la latencia importa, usar
        include_facts=False para omitir la extraccion de hechos.
        """
        if not text:
            return ExtractionResult()

        import asyncio

        tasks = [
            self.extract_entities(text),
            self.extract_signals(text),
        ]
        if include_facts:
            tasks.append(self.extract_facts(text))  # type: ignore[arg-type]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        entities = results[0] if isinstance(results[0], NamedEntities) else NamedEntities()
        signals = results[1] if isinstance(results[1], list) else []
        facts: list[VerifiedFact] = []
        if include_facts and len(results) > 2:
            facts = results[2] if isinstance(results[2], list) else []

        model_used = self._engine.model_for_role("entidades")

        return ExtractionResult(
            entities=entities,
            facts=facts,
            signals=signals,
            raw_text_len=len(text),
            model_used=model_used,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _clean_list(items: Any) -> list[str]:
        if not isinstance(items, list):
            return []
        return [str(i)[:100] for i in items[:15] if i]
