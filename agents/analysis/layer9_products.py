"""
Capa 9 — IntelligenceProductFactory.

Convierte los resultados del PoliteiaMasterOrchestrator en productos
de inteligencia consumibles por los clientes finales:

  PRODUCT_WAR_ROOM       — briefing tactual para sala de guerra de campaña
  PRODUCT_MORNING_BRIEF  — digest matutino para directivos
  PRODUCT_RISK_REPORT    — informe de riesgos para compliance/legal
  PRODUCT_ACTOR_DOSSIER  — dossier completo de un actor
  PRODUCT_SCENARIO_MAP   — mapa de escenarios para decision-making

Cada producto tiene un formato de salida especifico (Markdown, JSON, dict).
Los productos son serializables para guardarse en BD o enviarse por API.
"""
from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

from agents.analysis.layer8_orchestrator import OrchestratorOutput
from agents.analysis.layer7_strategic import Scenario, StrategicAnalysis7
from agents.analysis.strategic_analyzer import StrategicAssessment

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tipos de productos
# ---------------------------------------------------------------------------

PRODUCT_WAR_ROOM = "WAR_ROOM"
PRODUCT_MORNING_BRIEF = "MORNING_BRIEF"
PRODUCT_RISK_REPORT = "RISK_REPORT"
PRODUCT_ACTOR_DOSSIER = "ACTOR_DOSSIER"
PRODUCT_SCENARIO_MAP = "SCENARIO_MAP"


@dataclass
class IntelProduct:
    product_type: str
    title: str
    content: str                       # contenido principal en Markdown
    metadata: dict[str, Any] = field(default_factory=dict)
    generated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    market_id: str = "ES"
    actors_covered: list[str] = field(default_factory=list)
    alert_count: int = 0
    word_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "product_type": self.product_type,
            "title": self.title,
            "content": self.content,
            "metadata": self.metadata,
            "generated_at": self.generated_at,
            "market_id": self.market_id,
            "actors_covered": self.actors_covered,
            "alert_count": self.alert_count,
            "word_count": self.word_count,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# IntelligenceProductFactory
# ---------------------------------------------------------------------------

class IntelligenceProductFactory:
    """
    Fabrica de productos de inteligencia a partir de OrchestratorOutput.

    Uso:
        factory = IntelligenceProductFactory(market_id="ES")
        products = factory.create_all(orchestrator_output)
        for p in products:
            guardar_en_bd(p)
    """

    def __init__(self, market_id: str = "ES") -> None:
        self._market_id = market_id

    def create_all(
        self,
        output: OrchestratorOutput,
        products: list[str] | None = None,
    ) -> list[IntelProduct]:
        """
        Crea todos los productos (o los especificados) a partir del output.

        Args:
            output: resultado del PoliteiaMasterOrchestrator
            products: lista de tipos de producto a crear (None = todos)
        """
        to_create = set(products or [
            PRODUCT_MORNING_BRIEF,
            PRODUCT_WAR_ROOM,
            PRODUCT_RISK_REPORT,
            PRODUCT_SCENARIO_MAP,
        ])

        result = []

        if PRODUCT_MORNING_BRIEF in to_create:
            p = self._morning_brief(output)
            if p:
                result.append(p)

        if PRODUCT_WAR_ROOM in to_create:
            p = self._war_room(output)
            if p:
                result.append(p)

        if PRODUCT_RISK_REPORT in to_create:
            p = self._risk_report(output)
            if p:
                result.append(p)

        if PRODUCT_SCENARIO_MAP in to_create:
            p = self._scenario_map(output)
            if p:
                result.append(p)

        # Dossiers por actor (uno por actor con analisis profundo)
        if PRODUCT_ACTOR_DOSSIER in to_create:
            for deep in output.deep_analyses:
                p = self._actor_dossier(deep, output)
                if p:
                    result.append(p)

        return result

    def create_actor_dossier(
        self,
        actor: str,
        output: OrchestratorOutput,
    ) -> IntelProduct | None:
        """Crea un dossier especifico para un actor."""
        deep = next(
            (d for d in output.deep_analyses if d.actor == actor), None
        )
        if deep:
            return self._actor_dossier(deep, output)
        # Fallback con solo el assessment basico
        assessment = next(
            (a for a in output.assessments if a.actor == actor), None
        )
        if assessment:
            return self._assessment_to_basic_dossier(assessment)
        return None

    # ------------------------------------------------------------------
    # Productos
    # ------------------------------------------------------------------

    def _morning_brief(self, output: OrchestratorOutput) -> IntelProduct | None:
        if not output.briefing:
            return None

        b = output.briefing
        actors = b.actors_covered

        content = b.to_markdown()
        if output.alerts:
            alert_lines = []
            for a in output.alerts[:5]:
                alert_lines.append(f"- **[{a.level}]** {a.title}")
            content += "\n\n## Alertas Activas\n\n" + "\n".join(alert_lines)

        return IntelProduct(
            product_type=PRODUCT_MORNING_BRIEF,
            title=b.title,
            content=content,
            metadata={
                "briefing_type": b.briefing_type,
                "sections": [s["title"] for s in b.sections],
                "elapsed_seconds": output.elapsed_seconds,
            },
            market_id=self._market_id,
            actors_covered=actors,
            alert_count=len(output.alerts),
            word_count=b.word_count,
        )

    def _war_room(self, output: OrchestratorOutput) -> IntelProduct | None:
        """War Room: version tactual orientada a campaña."""
        if not output.assessments:
            return None

        lines = ["# WAR ROOM — Inteligencia Tactica", ""]

        # Alertas criticas primero
        critical = [a for a in output.alerts if a.level == "CRITICO"]
        if critical:
            lines += ["## ALERTAS CRITICAS", ""]
            for a in critical:
                lines.append(f"**{a.title}**")
                lines.append(a.body[:300])
                if a.requires_action:
                    lines.append("*REQUIERE ACCION INMEDIATA*")
                lines.append("")

        # Estado de cada actor
        lines += ["## Estado de Actores", ""]
        for assessment in output.assessments[:5]:
            trend_icon = {
                "ascendente": "[+]",
                "descendente": "[-]",
                "estable": "[=]",
                "volatil": "[!]",
            }.get(assessment.trend.direction, "[?]")

            lines.append(f"### {trend_icon} {assessment.actor}")
            lines.append(assessment.executive_summary[:200])

            top_risks = assessment.top_risks(2)
            if top_risks:
                lines.append(f"Riesgos: {' | '.join(r.description[:50] for r in top_risks)}")
            lines.append("")

        # Señales de alta urgencia
        if output.extraction and output.extraction.signals:
            high = [s for s in output.extraction.signals if s.urgency == "alta"]
            if high:
                lines += ["## Señales Alta Urgencia", ""]
                for s in high[:5]:
                    lines.append(f"- [{s.signal_type}] {s.summary[:120]}")
                lines.append("")

        content = "\n".join(lines)
        actors_covered = [a.actor for a in output.assessments]

        return IntelProduct(
            product_type=PRODUCT_WAR_ROOM,
            title="War Room — Inteligencia Tactica",
            content=content,
            metadata={"critical_alerts": len(critical)},
            market_id=self._market_id,
            actors_covered=actors_covered,
            alert_count=len(output.alerts),
            word_count=len(content.split()),
        )

    def _risk_report(self, output: OrchestratorOutput) -> IntelProduct | None:
        if not output.assessments:
            return None

        lines = ["# Informe de Riesgos — Inteligencia Politica", ""]

        for assessment in output.assessments:
            if not assessment.risks:
                continue
            lines.append(f"## {assessment.actor}")
            for risk in sorted(
                assessment.risks,
                key=lambda r: {"critico": 0, "alto": 1, "medio": 2, "bajo": 3}.get(r.severity, 4)
            ):
                lines.append(
                    f"- **[{risk.severity.upper()}]** [{risk.category}] "
                    f"{risk.description[:200]}"
                )
                if risk.mitigation:
                    lines.append(f"  Mitigacion: {risk.mitigation[:100]}")
            lines.append("")

        # Deep risk scores
        for deep in output.deep_analyses:
            if deep.risk_score:
                rs = deep.risk_score
                lines.append(
                    f"**{deep.actor}** — Score compuesto: {rs.composite_score:.2f} "
                    f"| Tendencia: {rs.trend}"
                )

        if not any(a.risks for a in output.assessments):
            return None

        content = "\n".join(lines)
        return IntelProduct(
            product_type=PRODUCT_RISK_REPORT,
            title="Informe de Riesgos Politicos",
            content=content,
            market_id=self._market_id,
            actors_covered=[a.actor for a in output.assessments],
            word_count=len(content.split()),
        )

    def _scenario_map(self, output: OrchestratorOutput) -> IntelProduct | None:
        all_scenarios: list[tuple[str, list[Scenario]]] = [
            (d.actor, d.scenarios)
            for d in output.deep_analyses
            if d.scenarios
        ]
        if not all_scenarios:
            return None

        lines = ["# Mapa de Escenarios", ""]

        for actor, scenarios in all_scenarios:
            lines.append(f"## {actor}")
            for sc in scenarios:
                prob_pct = f"{sc.probability*100:.0f}%"
                lines.append(f"### [{prob_pct}] {sc.name.upper()}")
                lines.append(sc.description[:300])
                if sc.key_events:
                    lines.append(f"Eventos clave: {' | '.join(sc.key_events[:3])}")
                if sc.electoral_impact:
                    lines.append(f"Impacto electoral: {sc.electoral_impact[:100]}")
                lines.append("")

        content = "\n".join(lines)
        return IntelProduct(
            product_type=PRODUCT_SCENARIO_MAP,
            title="Mapa de Escenarios Politicos",
            content=content,
            market_id=self._market_id,
            actors_covered=[a for a, _ in all_scenarios],
            word_count=len(content.split()),
        )

    def _actor_dossier(
        self,
        deep: StrategicAnalysis7,
        output: OrchestratorOutput,
    ) -> IntelProduct:
        assessment = next(
            (a for a in output.assessments if a.actor == deep.actor), None
        )

        lines = [f"# Dossier: {deep.actor}", ""]

        if assessment:
            lines += ["## Posicion y Tendencia", "", assessment.executive_summary, ""]

        if deep.position:
            pos = deep.position
            lines += [
                "## Posicionamiento Ideologico",
                f"Cluster: {pos.nearest_cluster}",
                f"Eje economico: {pos.economic_axis:.2f}",
                f"Eje social: {pos.social_axis:.2f}",
                "",
            ]

        if deep.narrative:
            n = deep.narrative
            lines += [
                "## Dominancia Narrativa",
                f"Score: {n.narrative_score:.2f} | Valencia mediatica: {n.media_valence}",
                f"Frames dominantes: {', '.join(n.dominant_frames[:5])}",
                "",
            ]

        if deep.coalitions:
            lines += ["## Coaliciones Viables", ""]
            for c in deep.coalitions[:3]:
                actors_str = " + ".join(c.actors[:4])
                lines.append(
                    f"- {actors_str}: viabilidad={c.viability_score:.2f} "
                    f"| escanos={c.estimated_seats}"
                )
            lines.append("")

        if assessment and assessment.risks:
            lines += ["## Riesgos Principales", ""]
            for r in assessment.top_risks(3):
                lines.append(f"- **[{r.severity}]** {r.description[:150]}")
            lines.append("")

        if deep.scenarios:
            lines += ["## Escenarios", ""]
            for sc in deep.scenarios:
                lines.append(f"**{sc.name.upper()}** ({sc.probability*100:.0f}%): {sc.description[:200]}")
            lines.append("")

        if deep.synthesis:
            lines += ["## Sintesis", "", deep.synthesis, ""]

        content = "\n".join(lines)
        return IntelProduct(
            product_type=PRODUCT_ACTOR_DOSSIER,
            title=f"Dossier: {deep.actor}",
            content=content,
            metadata={
                "engines_run": deep.engines_run,
                "opportunities_count": len(deep.opportunities),
            },
            market_id=self._market_id,
            actors_covered=[deep.actor],
            word_count=len(content.split()),
        )

    def _assessment_to_basic_dossier(self, assessment: StrategicAssessment) -> IntelProduct:
        lines = [
            f"# Dossier basico: {assessment.actor}", "",
            "## Resumen Ejecutivo", "",
            assessment.executive_summary, "",
            "## Riesgos", "",
        ]
        for r in assessment.risks[:5]:
            lines.append(f"- **[{r.severity}]** {r.description[:150]}")
        content = "\n".join(lines)
        return IntelProduct(
            product_type=PRODUCT_ACTOR_DOSSIER,
            title=f"Dossier: {assessment.actor}",
            content=content,
            market_id=self._market_id,
            actors_covered=[assessment.actor],
            word_count=len(content.split()),
        )
