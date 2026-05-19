"""5 recipes canónicas del workflow registry.

Cada recipe es una `Workflow` declarativa. Para añadir una nueva,
declárala como constante a continuación y aparecerá automáticamente
vía `list_workflows()`.

Las recipes están diseñadas con tools que realmente existen en el
GroqBrain (verificadas en agents/brain/*.py). El runner falla con
mensaje claro si una tool referenciada no existe.
"""
from __future__ import annotations

from agents.workflows.schemas import Workflow, WorkflowStep


# ─────────────────────────────────────────────────────────────────
# 1 · Briefing matinal sectorial
# ─────────────────────────────────────────────────────────────────

BRIEFING_MATINAL = Workflow(
    slug="briefing_matinal_sectorial",
    title="Briefing matinal sectorial",
    description=(
        "Síntesis matinal de un sector concreto: clasifica entidades, analiza "
        "narrativa dominante y compone un SITREP listo para la inbox del directivo."
    ),
    category="briefing",
    inputs_schema={
        "sector": "Nombre del sector (defensa, energia, banca…)",
        "context_text": "Bloque de texto de contexto (notas del analista o titulares)",
    },
    output_field="brief",
    steps=[
        WorkflowStep(
            id="extract_entities",
            tool="extract_political_entities",
            description="Extrae actores, partidos, leyes y eventos del contexto",
            input_template={"text": "${context_text}", "context": "sector=${sector}"},
            output_to="entities",
        ),
        WorkflowStep(
            id="narrative",
            tool="analyze_narrative",
            description="Identifica la narrativa dominante del sector",
            input_template={
                "pieces": ["${context_text}"],
                "topic": "sector ${sector}",
                "time_window": "última semana",
            },
            output_to="narrative",
            depends_on=["entities"],
        ),
        WorkflowStep(
            id="brief",
            tool="interpret_simulation_results",
            description="Compila los hallazgos en un SITREP estructurado",
            input_template={
                "simulation_type": "briefing_sitrep",
                "inputs_summary": "sector=${sector} · contexto=${context_text}",
                "results_payload": {
                    "entities": "${entities}",
                    "narrative": "${narrative}",
                },
                "audience": "analista político senior",
            },
            output_to="brief",
            depends_on=["narrative"],
        ),
    ],
)


# ─────────────────────────────────────────────────────────────────
# 2 · Análisis adversarial (war room)
# ─────────────────────────────────────────────────────────────────

ANALISIS_ADVERSARIAL = Workflow(
    slug="analisis_adversarial",
    title="Análisis adversarial · war room",
    description=(
        "Perfil del rival + investigación de oposición + escenarios de respuesta. "
        "Producto final apto para preparar debates o estrategias de contraste."
    ),
    category="intelligence",
    inputs_schema={
        "target_actor": "Nombre del actor target (ej. 'Pedro Sánchez')",
        "client_position": "Posición del cliente (ej. 'oposición conservadora')",
        "known_facts": "Hechos conocidos como contexto (puede ser texto largo)",
    },
    output_field="war_room_brief",
    steps=[
        WorkflowStep(
            id="profile",
            tool="build_actor_profile",
            description="Perfil 360º del actor target",
            input_template={
                "actor_name": "${target_actor}",
                "role": "",
                "known_facts": "${known_facts}",
                "recent_statements": [],
            },
            output_to="profile",
        ),
        WorkflowStep(
            id="opposition",
            tool="opposition_research",
            description="Vectores de ataque y respuestas predichas (con audit trail)",
            input_template={
                "target_actor": "${target_actor}",
                "client_position": "${client_position}",
                "recent_actions": [],
                "time_window": "últimos 6 meses",
                "requester_id": "${actor_id}",
                "purpose": "Workflow analisis_adversarial · war room",
            },
            output_to="opposition",
            depends_on=["profile"],
            on_error="continue",  # opp_research puede fallar por rate limit · seguimos
        ),
        WorkflowStep(
            id="forecast_response",
            tool="forecast_political_scenario",
            description="Escenarios de respuesta probable del target",
            input_template={
                "topic": "Respuesta probable de ${target_actor} ante ataque desde ${client_position}",
                "current_situation": "${known_facts}",
                "time_horizon": "1-3 meses",
                "constraints": [],
            },
            output_to="forecast",
            depends_on=["profile"],
        ),
        WorkflowStep(
            id="war_room_brief",
            tool="interpret_simulation_results",
            description="Compila perfil + opposition research + escenarios en un brief",
            input_template={
                "simulation_type": "war_room_brief",
                "inputs_summary": "target=${target_actor} cliente=${client_position}",
                "results_payload": {
                    "profile": "${profile}",
                    "opposition": "${opposition}",
                    "forecast": "${forecast}",
                },
                "audience": "war room · jefe de campaña",
            },
            output_to="war_room_brief",
            depends_on=["forecast"],
        ),
    ],
)


# ─────────────────────────────────────────────────────────────────
# 3 · Viabilidad coalición · análisis profundo
# ─────────────────────────────────────────────────────────────────

COALITION_DEEP = Workflow(
    slug="coalition_deep",
    title="Viabilidad coalición · análisis profundo",
    description=(
        "Aritmética + ideología + escenarios de tensión interna + durabilidad "
        "estimada. Para directivos de gabinete o consultoras electorales."
    ),
    category="forecast",
    inputs_schema={
        "proposed_coalition": "Lista de slugs de partidos (ej. ['psoe', 'sumar'])",
        "seats_by_party": "Dict slug → escaños (ej. {'psoe': 121, 'sumar': 31})",
        "context": "Contexto político actual",
        "chamber": "congreso (default), senado o slug de CCAA",
    },
    output_field="recommendation",
    steps=[
        WorkflowStep(
            id="viability",
            tool="analyze_coalition_viability",
            description="Viabilidad con check aritmético + LLM cualitativo",
            input_template={
                "proposed_coalition": "${proposed_coalition}",
                "seats_by_party": "${seats_by_party}",
                "context": "${context}",
                "red_lines": {},
                "chamber": "${chamber}",
            },
            output_to="viability",
        ),
        WorkflowStep(
            id="stress_scenarios",
            tool="forecast_political_scenario",
            description="Escenarios de tensión / ruptura interna",
            input_template={
                "topic": "Tensiones internas en coalición ${proposed_coalition}",
                "current_situation": "${context}",
                "time_horizon": "6-12 meses",
                "constraints": [],
            },
            output_to="stress",
            depends_on=["viability"],
        ),
        WorkflowStep(
            id="recommendation",
            tool="interpret_simulation_results",
            description="Recomendaciones operativas para sostener la coalición",
            input_template={
                "simulation_type": "coalition_recommendation",
                "inputs_summary": "coalition=${proposed_coalition} chamber=${chamber}",
                "results_payload": {
                    "viability": "${viability}",
                    "stress_scenarios": "${stress}",
                },
                "audience": "jefe de gabinete · directivo de partido",
            },
            output_to="recommendation",
            depends_on=["stress_scenarios"],
        ),
    ],
)


# ─────────────────────────────────────────────────────────────────
# 4 · Narrative drift monitor · detección de cambios de marco
# ─────────────────────────────────────────────────────────────────

NARRATIVE_DRIFT = Workflow(
    slug="narrative_drift_monitor",
    title="Monitor de deriva narrativa",
    description=(
        "Detecta si el marco mediático sobre un tema/actor ha cambiado en la "
        "última semana respecto al baseline anterior. Útil para alertas tempranas."
    ),
    category="narrative",
    inputs_schema={
        "topic": "Tema o actor a monitorizar",
        "baseline_pieces": "Lista de piezas del periodo baseline",
        "recent_pieces": "Lista de piezas del periodo reciente",
    },
    output_field="drift_brief",
    steps=[
        WorkflowStep(
            id="baseline_narrative",
            tool="analyze_narrative",
            description="Narrativa del periodo baseline",
            input_template={
                "pieces": "${baseline_pieces}",
                "topic": "${topic}",
                "time_window": "baseline anterior",
            },
            output_to="baseline_narrative",
        ),
        WorkflowStep(
            id="recent_narrative",
            tool="analyze_narrative",
            description="Narrativa del periodo reciente",
            input_template={
                "pieces": "${recent_pieces}",
                "topic": "${topic}",
                "time_window": "última semana",
            },
            output_to="recent_narrative",
        ),
        WorkflowStep(
            id="drift_brief",
            tool="interpret_simulation_results",
            description="Compara ambas narrativas y emite brief de drift",
            input_template={
                "simulation_type": "narrative_drift",
                "inputs_summary": "tema=${topic}",
                "results_payload": {
                    "baseline": "${baseline_narrative}",
                    "recent": "${recent_narrative}",
                },
                "audience": "analista de medios",
            },
            output_to="drift_brief",
            depends_on=["baseline_narrative", "recent_narrative"],
        ),
    ],
)


# ─────────────────────────────────────────────────────────────────
# 5 · Crisis playbook
# ─────────────────────────────────────────────────────────────────

CRISIS_PLAYBOOK = Workflow(
    slug="crisis_playbook",
    title="Playbook de crisis · plan de acción",
    description=(
        "Recibe un evento crítico (escándalo, decisión judicial, ruptura) y "
        "genera un playbook con stakeholders + escenarios + opciones de respuesta."
    ),
    category="crisis",
    inputs_schema={
        "event_description": "Descripción del evento (ej. 'Dimisión de Mazón tras DANA')",
        "affected_actor": "Actor afectado o cliente",
        "sectors_at_risk": "Lista de sectores en riesgo",
        "context": "Contexto adicional · titulares, fechas, antecedentes",
    },
    output_field="playbook",
    steps=[
        WorkflowStep(
            id="entities",
            tool="extract_political_entities",
            description="Extrae actores, leyes, lugares mencionados",
            input_template={
                "text": "${event_description}\n\n${context}",
                "context": "crisis · actor=${affected_actor}",
            },
            output_to="entities",
        ),
        WorkflowStep(
            id="disinfo_check",
            tool="detect_disinformation_signals",
            description="Comprueba si hay señales de desinformación rodeando el evento",
            input_template={
                "text": "${event_description}\n\n${context}",
                "source": "",
                "url": "",
                "cross_check_summary": "",
            },
            output_to="disinfo",
            on_error="continue",
        ),
        WorkflowStep(
            id="scenarios",
            tool="forecast_political_scenario",
            description="3-5 escenarios de evolución (base · optimista · pesimista · tail)",
            input_template={
                "topic": "Evolución de la crisis: ${event_description}",
                "current_situation": "${context}",
                "time_horizon": "1-3 meses",
                "constraints": [],
            },
            output_to="scenarios",
            depends_on=["entities"],
        ),
        WorkflowStep(
            id="electoral_risk",
            tool="assess_electoral_risk",
            description="Impacto electoral esperado sobre el actor afectado",
            input_template={
                "party": "${affected_actor}",
                "risk_event": "${event_description}",
                "polls_summary": "",
                "narrative_context": "${context}",
            },
            output_to="electoral_risk",
            on_error="continue",
        ),
        WorkflowStep(
            id="playbook",
            tool="interpret_simulation_results",
            description="Playbook completo · opciones de respuesta priorizadas",
            input_template={
                "simulation_type": "crisis_playbook",
                "inputs_summary": "evento=${event_description} actor=${affected_actor}",
                "results_payload": {
                    "entities": "${entities}",
                    "disinfo": "${disinfo}",
                    "scenarios": "${scenarios}",
                    "electoral_risk": "${electoral_risk}",
                },
                "audience": "comité de crisis · dirección política",
            },
            output_to="playbook",
            depends_on=["scenarios"],
        ),
    ],
)


# ─────────────────────────────────────────────────────────────────
# Registry
# ─────────────────────────────────────────────────────────────────

WORKFLOWS: dict[str, Workflow] = {
    BRIEFING_MATINAL.slug: BRIEFING_MATINAL,
    ANALISIS_ADVERSARIAL.slug: ANALISIS_ADVERSARIAL,
    COALITION_DEEP.slug: COALITION_DEEP,
    NARRATIVE_DRIFT.slug: NARRATIVE_DRIFT,
    CRISIS_PLAYBOOK.slug: CRISIS_PLAYBOOK,
}


def list_workflows() -> list[Workflow]:
    """Lista todas las recipes registradas."""
    return list(WORKFLOWS.values())


def get_workflow(slug: str) -> Workflow | None:
    return WORKFLOWS.get(slug)
