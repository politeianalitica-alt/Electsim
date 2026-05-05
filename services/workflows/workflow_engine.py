"""Workflow Engine — ElectSim. Wizards guiados para tareas comunes."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class WorkflowStep(BaseModel):
    """Un paso individual de un workflow guiado."""

    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    description: str
    instruction: str
    input_type: str = "text"  # text/select/multiselect/checkbox/file/data_picker
    required: bool = True
    options: list[str] = Field(default_factory=list)
    validator: str = ""
    default_value: Any = None


class Workflow(BaseModel):
    """Definición de un workflow / wizard."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str
    category: str
    estimated_time_minutes: int
    steps: list[WorkflowStep]
    output_description: str


class WorkflowRun(BaseModel):
    """Ejecución activa o completada de un workflow."""

    model_config = ConfigDict(extra="forbid")

    workflow_id: str
    run_id: str
    tenant_id: str
    user_id: str
    started_at: datetime
    completed_at: datetime | None = None
    current_step: int = 0
    step_data: dict[str, Any] = Field(default_factory=dict)
    status: str = "in_progress"  # in_progress / completed / abandoned
    output: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Workflow registry
# ---------------------------------------------------------------------------


def _wf_rapid_briefing() -> Workflow:
    return Workflow(
        id="rapid_briefing",
        name="Briefing rápido para reunión",
        description="Genera un briefing ejecutivo en 5 minutos para una reunión inminente.",
        category="briefings",
        estimated_time_minutes=5,
        output_description="Documento de briefing con contexto, asuntos clave y datos.",
        steps=[
            WorkflowStep(
                id="contexto",
                title="Contexto de la reunión",
                description="Define el motivo y formato.",
                instruction="Describe brevemente el motivo, fecha y formato de la reunión.",
                input_type="text",
            ),
            WorkflowStep(
                id="audiencia",
                title="Audiencia",
                description="Identifica a los asistentes.",
                instruction="Lista de asistentes principales y sus perfiles.",
                input_type="text",
            ),
            WorkflowStep(
                id="asuntos",
                title="Asuntos clave",
                description="Tres o cuatro temas principales.",
                instruction="Enumera los asuntos más importantes a tratar.",
                input_type="multiselect",
                options=["Electoral", "Económico", "Mediático", "Legislativo", "Territorial", "Crisis"],
            ),
            WorkflowStep(
                id="datos",
                title="Datos a incluir",
                description="Selecciona indicadores y tablas.",
                instruction="Marca qué datos quieres adjuntar al briefing.",
                input_type="multiselect",
                options=["Encuestas", "Sentimiento medios", "Iniciativas legislativas", "Riesgos", "Stakeholders"],
            ),
            WorkflowStep(
                id="tono",
                title="Tono del documento",
                description="Define el registro.",
                instruction="Selecciona el tono adecuado.",
                input_type="select",
                options=["Neutral", "Estratégico", "Defensivo", "Proactivo"],
                default_value="Neutral",
            ),
            WorkflowStep(
                id="generar",
                title="Generar briefing",
                description="Confirma para producir el documento.",
                instruction="Revisa y confirma para generar el briefing final.",
                input_type="checkbox",
                default_value=False,
            ),
        ],
    )


def _wf_crisis_response() -> Workflow:
    return Workflow(
        id="crisis_response",
        name="Respuesta a crisis comunicacional",
        description="Plan de respuesta rápida ante crisis: mensaje, argumentos y canales.",
        category="comunicacion",
        estimated_time_minutes=10,
        output_description="Plan de crisis con mensaje principal, argumentos y plan de canal.",
        steps=[
            WorkflowStep(id="descripcion", title="Descripción de la crisis", description="Qué ocurrió.", instruction="Describe qué ha pasado y cuándo.", input_type="text"),
            WorkflowStep(id="severidad", title="Severidad", description="Nivel de impacto.", instruction="Selecciona la severidad.", input_type="select", options=["Baja", "Media", "Alta", "Crítica"]),
            WorkflowStep(id="portavoz", title="Portavoz", description="Quien comunica.", instruction="Indica el portavoz designado.", input_type="text"),
            WorkflowStep(id="mensaje", title="Mensaje principal", description="Idea fuerza.", instruction="Resume en 1-2 frases el mensaje central.", input_type="text"),
            WorkflowStep(id="argumentos", title="Tres argumentos", description="Pruebas y razonamiento.", instruction="Lista los tres argumentos clave.", input_type="text"),
            WorkflowStep(id="preguntas", title="Preguntas hostiles", description="Preparación de respuestas.", instruction="Anticipa preguntas hostiles y respuestas.", input_type="text"),
            WorkflowStep(id="canales", title="Canales", description="Selecciona los canales de difusión.", instruction="Marca los canales adecuados.", input_type="multiselect", options=["Prensa", "Redes sociales", "Newsletter", "Comunicado interno", "Rueda de prensa"]),
            WorkflowStep(id="review", title="Revisión final", description="Aprobación.", instruction="Confirma la aprobación humana antes de publicar.", input_type="checkbox", default_value=False),
        ],
    )


def _wf_actor_dossier() -> Workflow:
    return Workflow(
        id="actor_dossier",
        name="Crear dossier de actor político",
        description="Construye un dossier completo de un actor político.",
        category="actores",
        estimated_time_minutes=15,
        output_description="Dossier exportable con perfil, posiciones, declaraciones, conexiones y riesgos.",
        steps=[
            WorkflowStep(id="actor_name", title="Nombre del actor", description="Identificación.", instruction="Nombre completo del actor político.", input_type="text"),
            WorkflowStep(id="tipo", title="Tipo de actor", description="Categoría.", instruction="Selecciona el tipo.", input_type="select", options=["Político", "Periodista", "Empresario", "Sindicalista", "Académico", "Otro"]),
            WorkflowStep(id="biografia", title="Biografía clave", description="Hitos profesionales.", instruction="Resumen biográfico breve.", input_type="text"),
            WorkflowStep(id="posiciones", title="Posiciones recientes", description="Postura sobre temas relevantes.", instruction="Lista las posiciones públicas más recientes.", input_type="text"),
            WorkflowStep(id="declaraciones", title="Declaraciones clave", description="Citas relevantes.", instruction="Selecciona declaraciones clave para el dossier.", input_type="data_picker"),
            WorkflowStep(id="conexiones", title="Conexiones", description="Red de relaciones.", instruction="Identifica conexiones relevantes.", input_type="text"),
            WorkflowStep(id="riesgos", title="Riesgos asociados", description="Vulnerabilidades.", instruction="Riesgos reputacionales o políticos asociados.", input_type="text"),
            WorkflowStep(id="exportar", title="Exportar", description="Formato de salida.", instruction="Selecciona el formato de exportación.", input_type="select", options=["PDF", "DOCX", "Markdown"], default_value="PDF"),
        ],
    )


def _wf_narrative_response() -> Workflow:
    return Workflow(
        id="narrative_response",
        name="Plan de respuesta a narrativa rival",
        description="Construye un contraframe y plan de mensajes ante una narrativa rival.",
        category="narrativas",
        estimated_time_minutes=8,
        output_description="Plan con contraframe, mensajes, pruebas, portavoces y calendario.",
        steps=[
            WorkflowStep(id="origen", title="Narrativa origen", description="Quién la impulsa.", instruction="Identifica origen y vehículo de la narrativa.", input_type="text"),
            WorkflowStep(id="frame_rival", title="Frame rival", description="Marco interpretativo.", instruction="Resume el frame del rival.", input_type="text"),
            WorkflowStep(id="contraframe", title="Contraframe propuesto", description="Marco alternativo.", instruction="Define el contraframe propio.", input_type="text"),
            WorkflowStep(id="mensajes", title="Tres mensajes", description="Mensajes derivados.", instruction="Tres mensajes que sostienen el contraframe.", input_type="text"),
            WorkflowStep(id="pruebas", title="Pruebas y datos", description="Evidencia de apoyo.", instruction="Lista pruebas o datos que respaldan los mensajes.", input_type="text"),
            WorkflowStep(id="portavoces", title="Portavoces", description="Quién lo dice.", instruction="Selecciona los portavoces adecuados.", input_type="text"),
            WorkflowStep(id="calendario", title="Calendario de despliegue", description="Cuándo y dónde.", instruction="Define la secuencia temporal.", input_type="text"),
        ],
    )


def _wf_weekly_planning() -> Workflow:
    return Workflow(
        id="weekly_planning",
        name="Planificación semanal del equipo",
        description="Coordina la semana del equipo: hitos, prioridades, asignaciones y entregables.",
        category="equipo",
        estimated_time_minutes=20,
        output_description="Plan semanal con hitos, asignaciones, entregables y revisión.",
        steps=[
            WorkflowStep(id="hitos", title="Hitos de la semana", description="Eventos relevantes.", instruction="Lista hitos políticos, mediáticos y legislativos.", input_type="text"),
            WorkflowStep(id="riesgos", title="Riesgos identificados", description="Riesgos a vigilar.", instruction="Identifica riesgos previsibles.", input_type="text"),
            WorkflowStep(id="prioridades", title="Prioridades", description="Top 3-5 prioridades.", instruction="Define las prioridades principales.", input_type="text"),
            WorkflowStep(id="asignaciones", title="Asignaciones", description="Quién hace qué.", instruction="Asigna responsables a cada prioridad.", input_type="text"),
            WorkflowStep(id="entregables", title="Entregables", description="Productos esperados.", instruction="Lista entregables y plazos.", input_type="text"),
            WorkflowStep(id="revision", title="Revisión", description="Punto de control.", instruction="Define cuándo se revisará el plan.", input_type="text"),
        ],
    )


def _wf_press_conference_prep() -> Workflow:
    return Workflow(
        id="press_conference_prep",
        name="Preparación rueda de prensa",
        description="Preparación completa de rueda de prensa: mensaje, puntos, preguntas, soundbites.",
        category="comunicacion",
        estimated_time_minutes=15,
        output_description="Documento de preparación con mensajes, soundbites y Q&A.",
        steps=[
            WorkflowStep(id="tema", title="Tema de la rueda", description="Asunto principal.", instruction="Define el tema central.", input_type="text"),
            WorkflowStep(id="mensaje_central", title="Mensaje central", description="Idea fuerza.", instruction="Una sola frase con el mensaje central.", input_type="text"),
            WorkflowStep(id="puntos_clave", title="Tres puntos clave", description="Soporte argumental.", instruction="Tres puntos que sostienen el mensaje.", input_type="text"),
            WorkflowStep(id="qa", title="Seis preguntas hostiles + respuestas", description="Anticipación Q&A.", instruction="Anticipa seis preguntas duras y prepara respuestas.", input_type="text"),
            WorkflowStep(id="soundbites", title="Soundbites", description="Frases memorables.", instruction="Diseña soundbites para titulares.", input_type="text"),
            WorkflowStep(id="ensayo", title="Ensayo", description="Confirmación de ensayo.", instruction="Confirma que se ha realizado un ensayo previo.", input_type="checkbox", default_value=False),
        ],
    )


def _wf_election_simulation() -> Workflow:
    return Workflow(
        id="election_simulation",
        name="Simulación de escenario electoral",
        description="Lanza una simulación electoral con escenario base y modificadores.",
        category="electoral",
        estimated_time_minutes=10,
        output_description="Simulación con métricas y análisis de escaños.",
        steps=[
            WorkflowStep(id="escenario_base", title="Escenario base", description="Punto de partida.", instruction="Selecciona el escenario base.", input_type="select", options=["Encuesta promedio", "Última oleada CIS", "Resultado anterior"]),
            WorkflowStep(id="modificadores", title="Modificadores", description="Ajustes al escenario.", instruction="Define modificadores (movilización, transferencia, eventos).", input_type="text"),
            WorkflowStep(id="metricas", title="Métricas a simular", description="Qué medir.", instruction="Selecciona métricas.", input_type="multiselect", options=["Escaños", "Voto", "Mayorías", "Coaliciones viables", "Sensibilidad"]),
            WorkflowStep(id="ejecutar", title="Ejecutar simulación", description="Lanzar.", instruction="Confirma para ejecutar la simulación.", input_type="checkbox", default_value=False),
            WorkflowStep(id="analisis", title="Análisis", description="Lectura de resultados.", instruction="Anota interpretaciones del resultado.", input_type="text", required=False),
        ],
    )


def _wf_stakeholder_outreach() -> Workflow:
    return Workflow(
        id="stakeholder_outreach",
        name="Plan de outreach a stakeholders",
        description="Diseño de campaña dirigida a stakeholders con mensaje, canal y KPIs.",
        category="crm",
        estimated_time_minutes=12,
        output_description="Plan de outreach con segmento, canal, mensaje, calendario y KPIs.",
        steps=[
            WorkflowStep(id="objetivo", title="Objetivo", description="Resultado buscado.", instruction="Define el objetivo del outreach.", input_type="text"),
            WorkflowStep(id="segmento", title="Segmento", description="A quién dirigirse.", instruction="Selecciona el segmento de stakeholders.", input_type="text"),
            WorkflowStep(id="canal", title="Canal", description="Vehículo de contacto.", instruction="Selecciona el canal principal.", input_type="select", options=["Email", "Reunión", "Llamada", "Evento", "Carta"]),
            WorkflowStep(id="mensaje", title="Mensaje personalizado", description="Contenido.", instruction="Redacta el mensaje base personalizable.", input_type="text"),
            WorkflowStep(id="calendario", title="Calendario", description="Secuencia temporal.", instruction="Define el calendario de envío.", input_type="text"),
            WorkflowStep(id="kpis", title="KPIs", description="Métricas de éxito.", instruction="Lista los KPIs que medirán el éxito.", input_type="text"),
        ],
    )


_WORKFLOWS: dict[str, Workflow] = {
    wf.id: wf
    for wf in [
        _wf_rapid_briefing(),
        _wf_crisis_response(),
        _wf_actor_dossier(),
        _wf_narrative_response(),
        _wf_weekly_planning(),
        _wf_press_conference_prep(),
        _wf_election_simulation(),
        _wf_stakeholder_outreach(),
    ]
}


_RUNS: dict[str, WorkflowRun] = {}


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------


def list_workflows(category: str | None = None) -> list[Workflow]:
    """Lista todos los workflows registrados, opcionalmente filtrados por categoría."""
    items = list(_WORKFLOWS.values())
    if category:
        items = [w for w in items if w.category == category]
    return items


def get_workflow(workflow_id: str) -> Workflow | None:
    """Devuelve un workflow por id, o None si no existe."""
    return _WORKFLOWS.get(workflow_id)


def start_workflow(workflow_id: str, tenant_id: str, user_id: str) -> WorkflowRun:
    """Crea una nueva ejecución activa de un workflow."""
    wf = get_workflow(workflow_id)
    if wf is None:
        raise ValueError(f"Workflow desconocido: {workflow_id}")
    run = WorkflowRun(
        workflow_id=workflow_id,
        run_id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        user_id=user_id,
        started_at=datetime.utcnow(),
    )
    _RUNS[run.run_id] = run
    return run


def submit_step(run_id: str, step_data: dict[str, Any]) -> WorkflowRun:
    """Avanza el run al siguiente paso, guardando los datos del paso actual."""
    run = _RUNS.get(run_id)
    if run is None:
        raise ValueError(f"Run desconocido: {run_id}")
    if run.status != "in_progress":
        raise ValueError(f"Run {run_id} no está activo (status={run.status})")
    wf = get_workflow(run.workflow_id)
    if wf is None:
        raise ValueError(f"Workflow desconocido: {run.workflow_id}")
    step = wf.steps[run.current_step]
    run.step_data[step.id] = step_data
    run.current_step += 1
    if run.current_step >= len(wf.steps):
        run.status = "completed"
        run.completed_at = datetime.utcnow()
    return run


def complete_workflow(run_id: str, output: dict[str, Any]) -> WorkflowRun:
    """Marca el run como completado y registra la salida final."""
    run = _RUNS.get(run_id)
    if run is None:
        raise ValueError(f"Run desconocido: {run_id}")
    run.status = "completed"
    run.completed_at = datetime.utcnow()
    run.output = output
    return run


def abandon_workflow(run_id: str) -> WorkflowRun:
    """Marca el run como abandonado."""
    run = _RUNS.get(run_id)
    if run is None:
        raise ValueError(f"Run desconocido: {run_id}")
    run.status = "abandoned"
    run.completed_at = datetime.utcnow()
    return run


def get_user_active_runs(user_id: str) -> list[WorkflowRun]:
    """Devuelve todos los runs activos del usuario."""
    return [r for r in _RUNS.values() if r.user_id == user_id and r.status == "in_progress"]
