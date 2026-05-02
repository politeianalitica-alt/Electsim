"""
Capa 7 — StrategicAnalyzer7.

Analisis estrategico multi-motor con ThreadPoolExecutor para operaciones
CPU-intensivas (clustering, scoring) y OllamaEngine para LLM.

Seis motores:
  M1  PositionEngine     — posicionamiento ideologico en espacio bidimensional
  M2  CoalitionEngine    — viabilidad de coaliciones y alianzas
  M3  NarrativeEngine    — dominancia narrativa y frames discursivos
  M4  RiskEngine         — scoring de riesgos multidimensional
  M5  OpportunityEngine  — ventanas de oportunidad por timing
  M6  ScenarioEngine     — escenarios futuros (optimista, base, pesimista)

Los motores M1-M4 son mayormente deterministicos (datos + reglas).
M5-M6 usan LLM para generacion de escenarios.
"""
from __future__ import annotations

import asyncio
import logging
import math
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any

from agents.analysis.layer6_context import EnrichedAssessment
from agents.analysis.ollama_engine import OllamaEngine

logger = logging.getLogger(__name__)

_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="strategy7")

# ---------------------------------------------------------------------------
# Tipos de salida de cada motor
# ---------------------------------------------------------------------------

@dataclass
class IdeologicalPosition:
    actor: str
    economic_axis: float = 0.0      # -1.0 intervencionismo .. 1.0 liberalismo
    social_axis: float = 0.0        # -1.0 progresismo .. 1.0 conservadurismo
    nearest_cluster: str = "centro"
    distance_to_centrist: float = 0.0


@dataclass
class CoalitionViability:
    actors: list[str] = field(default_factory=list)
    viability_score: float = 0.5
    ideological_distance: float = 0.0
    blocking_factors: list[str] = field(default_factory=list)
    enabling_factors: list[str] = field(default_factory=list)
    estimated_seats: int = 0


@dataclass
class NarrativeDominance:
    actor: str
    dominant_frames: list[str] = field(default_factory=list)
    contested_frames: list[str] = field(default_factory=list)
    narrative_score: float = 0.5    # 0=dominado, 1=dominante
    media_valence: str = "neutro"   # positivo, neutro, negativo


@dataclass
class RiskScore:
    actor: str
    composite_score: float = 0.5    # 0=sin riesgo, 1=maximo riesgo
    dimensions: dict[str, float] = field(default_factory=dict)
    trend: str = "estable"          # creciente, decreciente, estable


@dataclass
class OpportunityWindow:
    title: str
    window_type: str               # temporal, estructural, coyuntural
    opens_in: str = "inmediato"    # inmediato, semanas, meses
    closes_in: str = "meses"
    actors_benefited: list[str] = field(default_factory=list)
    required_actions: list[str] = field(default_factory=list)
    expected_gain: str = ""


@dataclass
class Scenario:
    name: str                      # optimista, base, pesimista
    probability: float = 0.33
    description: str = ""
    key_events: list[str] = field(default_factory=list)
    electoral_impact: str = ""


@dataclass
class StrategicAnalysis7:
    actor: str
    position: IdeologicalPosition | None = None
    coalitions: list[CoalitionViability] = field(default_factory=list)
    narrative: NarrativeDominance | None = None
    risk_score: RiskScore | None = None
    opportunities: list[OpportunityWindow] = field(default_factory=list)
    scenarios: list[Scenario] = field(default_factory=list)
    synthesis: str = ""
    engines_run: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Motores individuales (implementacion simplificada con LLM)
# ---------------------------------------------------------------------------

_POSITION_7_SCHEMA = """{
  "eje_economico": 0.2,
  "eje_social": -0.3,
  "cluster_mas_cercano": "centroizquierda",
  "distancia_al_centro": 0.36
}"""

_COALITION_SCHEMA = """{
  "coaliciones": [
    {
      "actores": ["PP", "Vox"],
      "viabilidad": 0.4,
      "distancia_ideologica": 0.6,
      "factores_bloqueo": ["..."],
      "factores_habilitadores": ["..."],
      "escanos_estimados": 176
    }
  ]
}"""

_NARRATIVE_SCHEMA = """{
  "frames_dominantes": ["seguridad", "economia"],
  "frames_en_disputa": ["migracion"],
  "score_narrativo": 0.6,
  "valencia_mediatica": "positivo|neutro|negativo"
}"""

_OPPORTUNITY_7_SCHEMA = """{
  "ventanas": [
    {
      "titulo": "...",
      "tipo": "temporal|estructural|coyuntural",
      "apertura": "inmediato|semanas|meses",
      "cierre": "semanas|meses|años",
      "actores_beneficiados": ["..."],
      "acciones_requeridas": ["..."],
      "ganancia_esperada": "..."
    }
  ]
}"""

_SCENARIO_SCHEMA = """{
  "escenarios": [
    {
      "nombre": "optimista|base|pesimista",
      "probabilidad": 0.33,
      "descripcion": "...",
      "eventos_clave": ["..."],
      "impacto_electoral": "..."
    }
  ]
}"""


class StrategicAnalyzer7:
    """
    Analisis estrategico multi-motor de capa 7.

    Combina analisis deterministico (posicion ideologica basada en datos)
    con LLM (escenarios, oportunidades narrativas).
    """

    def __init__(
        self,
        engine: OllamaEngine,
        market_id: str = "ES",
    ) -> None:
        self._engine = engine
        self._market_id = market_id

    async def analyze(
        self,
        actor: str,
        enriched: EnrichedAssessment | None = None,
        poll_data: dict[str, float] | None = None,
        competing_actors: list[str] | None = None,
        run_scenarios: bool = True,
    ) -> StrategicAnalysis7:
        """
        Ejecuta los 6 motores de analisis estrategico.

        Args:
            actor: actor principal a analizar
            enriched: assessment enriquecido de capa 6
            poll_data: datos de encuesta {actor: porcentaje}
            competing_actors: lista de actores del mercado
            run_scenarios: si ejecutar el motor de escenarios (lento)
        """
        context_text = self._build_context_text(enriched)

        # Motores 1-5 en paralelo
        tasks = {
            "M1": self._run_position(actor, poll_data or {}, context_text),
            "M2": self._run_coalition(actor, competing_actors or [], poll_data or {}, context_text),
            "M3": self._run_narrative(actor, context_text),
            "M4": self._run_risk(actor, enriched, context_text),
            "M5": self._run_opportunities(actor, context_text),
        }
        if run_scenarios:
            tasks["M6"] = self._run_scenarios(actor, poll_data or {}, context_text)

        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        keys = list(tasks.keys())

        output: dict[str, Any] = {}
        engines_run = []
        for i, key in enumerate(keys):
            result = results[i]
            if not isinstance(result, Exception):
                output[key] = result
                engines_run.append(key)
            else:
                logger.warning("Motor %s fallo: %s", key, result)

        # Sintesis
        synthesis = await self._synthesize(actor, output, context_text)

        return StrategicAnalysis7(
            actor=actor,
            position=output.get("M1"),
            coalitions=output.get("M2", []),
            narrative=output.get("M3"),
            risk_score=output.get("M4"),
            opportunities=output.get("M5", []),
            scenarios=output.get("M6", []),
            synthesis=synthesis,
            engines_run=engines_run,
        )

    # ------------------------------------------------------------------
    # Motor M1 — Posicion ideologica
    # ------------------------------------------------------------------

    async def _run_position(
        self, actor: str, poll_data: dict[str, float], context: str
    ) -> IdeologicalPosition:
        prompt = (
            f"Determina la posicion ideologica de {actor} en dos ejes:\n"
            f"  eje_economico: -1.0 (intervencionismo) a 1.0 (liberalismo)\n"
            f"  eje_social: -1.0 (progresismo) a 1.0 (conservadurismo)\n\n"
            f"Encuestas disponibles: {poll_data}\n"
            f"Contexto: {context[:1500]}\n\n"
            f"Schema: {_POSITION_7_SCHEMA}"
        )
        data = await self._engine.extract_json(
            role="analisis", prompt=prompt, schema_hint=_POSITION_7_SCHEMA
        )
        ec = float(data.get("eje_economico", 0.0))
        sc = float(data.get("eje_social", 0.0))
        dist = math.sqrt(ec ** 2 + sc ** 2)
        return IdeologicalPosition(
            actor=actor,
            economic_axis=ec,
            social_axis=sc,
            nearest_cluster=str(data.get("cluster_mas_cercano", "centro"))[:50],
            distance_to_centrist=float(data.get("distancia_al_centro", dist)),
        )

    # ------------------------------------------------------------------
    # Motor M2 — Coaliciones
    # ------------------------------------------------------------------

    async def _run_coalition(
        self,
        actor: str,
        competing: list[str],
        poll_data: dict[str, float],
        context: str,
    ) -> list[CoalitionViability]:
        if not competing:
            return []
        competing_str = ", ".join(competing[:8])
        prompt = (
            f"Analiza las posibles coaliciones de {actor} con: {competing_str}\n"
            f"Datos de encuesta: {poll_data}\n"
            f"Contexto: {context[:1000]}\n\n"
            f"Schema: {_COALITION_SCHEMA}"
        )
        data = await self._engine.extract_json(
            role="analisis", prompt=prompt, schema_hint=_COALITION_SCHEMA
        )
        coalitions = []
        for raw in (data.get("coaliciones") or [])[:5]:
            if not isinstance(raw, dict):
                continue
            coalitions.append(CoalitionViability(
                actors=self._clean_list(raw.get("actores", [])),
                viability_score=float(raw.get("viabilidad", 0.5)),
                ideological_distance=float(raw.get("distancia_ideologica", 0.5)),
                blocking_factors=self._clean_list(raw.get("factores_bloqueo", [])),
                enabling_factors=self._clean_list(raw.get("factores_habilitadores", [])),
                estimated_seats=int(raw.get("escanos_estimados", 0)),
            ))
        return coalitions

    # ------------------------------------------------------------------
    # Motor M3 — Narrativa
    # ------------------------------------------------------------------

    async def _run_narrative(self, actor: str, context: str) -> NarrativeDominance:
        prompt = (
            f"Analiza la dominancia narrativa de {actor} en el debate politico actual.\n"
            f"Contexto: {context[:2000]}\n\n"
            f"Schema: {_NARRATIVE_SCHEMA}"
        )
        data = await self._engine.extract_json(
            role="analisis", prompt=prompt, schema_hint=_NARRATIVE_SCHEMA
        )
        return NarrativeDominance(
            actor=actor,
            dominant_frames=self._clean_list(data.get("frames_dominantes", [])),
            contested_frames=self._clean_list(data.get("frames_en_disputa", [])),
            narrative_score=float(data.get("score_narrativo", 0.5)),
            media_valence=str(data.get("valencia_mediatica", "neutro")),
        )

    # ------------------------------------------------------------------
    # Motor M4 — Scoring de riesgo
    # ------------------------------------------------------------------

    async def _run_risk(
        self, actor: str, enriched: EnrichedAssessment | None, context: str
    ) -> RiskScore:
        base_risks = {}
        if enriched and enriched.base.risks:
            for r in enriched.base.risks:
                base_risks[r.category] = r.probability

        # Score compuesto (promedio ponderado por severidad)
        severity_weights = {"critico": 1.0, "alto": 0.75, "medio": 0.5, "bajo": 0.25}
        if enriched and enriched.base.risks:
            scores = []
            for r in enriched.base.risks:
                w = severity_weights.get(r.severity, 0.5)
                scores.append(r.probability * w)
            composite = sum(scores) / len(scores) if scores else 0.5
        else:
            composite = 0.5

        # Tendencia basada en señales de contexto
        trend = "estable"
        if enriched:
            high_signals = [
                s for s in enriched.base.context_signals * [None]  # type: ignore
            ]
            # Simplified: use assessment trend
            if enriched.base.trend.direction == "ascendente":
                trend = "decreciente"
            elif enriched.base.trend.direction == "descendente":
                trend = "creciente"

        return RiskScore(
            actor=actor,
            composite_score=min(1.0, composite),
            dimensions=base_risks,
            trend=trend,
        )

    # ------------------------------------------------------------------
    # Motor M5 — Oportunidades
    # ------------------------------------------------------------------

    async def _run_opportunities(
        self, actor: str, context: str
    ) -> list[OpportunityWindow]:
        prompt = (
            f"Identifica ventanas de oportunidad estrategica para {actor}.\n"
            f"Contexto: {context[:2000]}\n\n"
            f"Schema: {_OPPORTUNITY_7_SCHEMA}"
        )
        data = await self._engine.extract_json(
            role="estrategia", prompt=prompt, schema_hint=_OPPORTUNITY_7_SCHEMA
        )
        windows = []
        for raw in (data.get("ventanas") or [])[:5]:
            if not isinstance(raw, dict):
                continue
            windows.append(OpportunityWindow(
                title=str(raw.get("titulo", ""))[:100],
                window_type=str(raw.get("tipo", "coyuntural")),
                opens_in=str(raw.get("apertura", "inmediato")),
                closes_in=str(raw.get("cierre", "meses")),
                actors_benefited=self._clean_list(raw.get("actores_beneficiados", [])),
                required_actions=self._clean_list(raw.get("acciones_requeridas", [])),
                expected_gain=str(raw.get("ganancia_esperada", ""))[:200],
            ))
        return windows

    # ------------------------------------------------------------------
    # Motor M6 — Escenarios
    # ------------------------------------------------------------------

    async def _run_scenarios(
        self, actor: str, poll_data: dict[str, float], context: str
    ) -> list[Scenario]:
        prompt = (
            f"Genera 3 escenarios futuros (optimista, base, pesimista) para {actor}.\n"
            f"Datos de encuesta: {poll_data}\n"
            f"Contexto: {context[:1500]}\n\n"
            f"Schema: {_SCENARIO_SCHEMA}\n"
            f"Las probabilidades deben sumar 1.0."
        )
        data = await self._engine.extract_json(
            role="estrategia", prompt=prompt, schema_hint=_SCENARIO_SCHEMA
        )
        scenarios = []
        for raw in (data.get("escenarios") or [])[:3]:
            if not isinstance(raw, dict):
                continue
            scenarios.append(Scenario(
                name=str(raw.get("nombre", "base")),
                probability=float(raw.get("probabilidad", 0.33)),
                description=str(raw.get("descripcion", ""))[:400],
                key_events=self._clean_list(raw.get("eventos_clave", [])),
                electoral_impact=str(raw.get("impacto_electoral", ""))[:200],
            ))
        return scenarios

    # ------------------------------------------------------------------
    # Sintesis
    # ------------------------------------------------------------------

    async def _synthesize(
        self, actor: str, output: dict[str, Any], context: str
    ) -> str:
        parts = [f"Actor: {actor}"]

        pos: IdeologicalPosition | None = output.get("M1")
        if pos:
            parts.append(
                f"Posicion: {pos.nearest_cluster} "
                f"(eco={pos.economic_axis:.2f}, soc={pos.social_axis:.2f})"
            )

        risk: RiskScore | None = output.get("M4")
        if risk:
            parts.append(f"Riesgo compuesto: {risk.composite_score:.2f} ({risk.trend})")

        narrative: NarrativeDominance | None = output.get("M3")
        if narrative:
            parts.append(
                f"Narrativa: score={narrative.narrative_score:.2f}, "
                f"valencia={narrative.media_valence}"
            )

        scenarios: list[Scenario] = output.get("M6", [])
        if scenarios:
            base_scenario = next((s for s in scenarios if s.name == "base"), None)
            if base_scenario:
                parts.append(f"Escenario base: {base_scenario.description[:100]}")

        context_block = "\n".join(parts)
        prompt = (
            f"Sintetiza el siguiente analisis estrategico de {actor} en 100-120 palabras.\n\n"
            f"{context_block}\n\nContexto adicional: {context[:500]}\n\n"
            f"Directo, orientado a decision."
        )
        return await self._engine.generate(role="briefing", prompt=prompt, temperature=0.3)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_context_text(enriched: EnrichedAssessment | None) -> str:
        if not enriched:
            return ""
        parts = []
        base = enriched.base
        parts.append(f"Tendencia: {base.trend.direction}")
        parts.append(f"Resumen: {base.executive_summary[:300]}")
        if enriched.economic_context:
            parts.append(f"Economia: {enriched.economic_context[:200]}")
        if enriched.geopolitical_context:
            parts.append(f"Geopolitica: {enriched.geopolitical_context[:200]}")
        if enriched.actor_profile:
            p = enriched.actor_profile
            parts.append(f"Perfil: {p.party} | Pos ideologica: {p.ideology_position:.2f}")
        return "\n".join(parts)

    @staticmethod
    def _clean_list(items: Any) -> list[str]:
        if not isinstance(items, list):
            return []
        return [str(i)[:100] for i in items[:10] if i]
