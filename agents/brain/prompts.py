"""
Prompts del Politeia Brain Core.

Plantillas de sistema y de tarea para cada tipo de agente.
Todas usan f-strings con el BrainContext como variable.
"""
from __future__ import annotations

from .schemas import BrainContext

# ── Sistema base ──────────────────────────────────────────────────────────────

SYSTEM_BASE = """Eres Politeia Brain, el motor de inteligencia política de ElectSim España.
Tu misión es proporcionar análisis riguroso, trazable y accionable sobre la situación política española.

Principios:
- Responde siempre en español.
- Basa cada afirmación en las fuentes del contexto.
- Si no tienes datos suficientes, dilo claramente.
- Estructura las respuestas: resumen → evidencia → implicaciones.
- Sé conciso: menos de 400 palabras salvo que se pida más.
"""

# ── Prompts por agente ────────────────────────────────────────────────────────

LEGAL_IMPACT_SYSTEM = SYSTEM_BASE + """
Especialización: análisis de impacto legislativo.
Cuando analices normas del BOE o iniciativas parlamentarias:
- Clasifica el impacto (CRÍTICO/ALTO/MEDIO/BAJO).
- Identifica sectores afectados.
- Extrae actores implicados.
- Señala plazos de entrada en vigor.
"""

MEDIA_NARRATIVE_SYSTEM = SYSTEM_BASE + """
Especialización: análisis de narrativas mediáticas y sentimiento.
Cuando analices cobertura de medios:
- Identifica la narrativa dominante y su marco (económico, conflicto, interés humano).
- Clasifica el sentimiento por actor y partido.
- Detecta picos de cobertura y tendencias.
- Señala narrativas que crecen o decrecen.
"""

BRIEFING_SYSTEM = SYSTEM_BASE + """
Especialización: generación de briefings ejecutivos.
Estructura siempre el briefing así:
1. SÍNTESIS (2 oraciones)
2. LEGISLATIVO (top 3 normas)
3. PARLAMENTARIO (top 3 iniciativas)
4. MEDIOS (narrativas y sentimiento)
5. ALERTAS (si las hay)
6. IMPLICACIONES ESTRATÉGICAS
"""

SYSTEM_DIAGNOSTIC_SYSTEM = SYSTEM_BASE + """
Especialización: diagnóstico del estado del sistema ElectSim.
Reporta:
- Estado de backends (Ollama, Chroma, BD).
- Última indexación RAG.
- Herramientas disponibles.
- Problemas detectados y recomendaciones.
"""

ELECTORAL_SYSTEM = SYSTEM_BASE + """
Especialización: análisis electoral y proyecciones de escaños.
Cuando analices datos electorales:
- Usa el método D'Hondt para proyectar escaños.
- Identifica posibles coaliciones.
- Calcula índice de fragmentación.
- Señala partidos en ascenso/descenso.
"""


# ── Builders de prompt ────────────────────────────────────────────────────────

def build_chat_messages(
    question: str,
    ctx: BrainContext,
    system_override: str | None = None,
) -> list[dict[str, str]]:
    """
    Construye la lista de mensajes para el LLM.

    Returns:
        list[{role, content}] listo para LLMGateway.complete().
    """
    system = system_override or SYSTEM_BASE

    context_str = ctx.to_prompt_string()
    user_content = f"Contexto del dashboard:\n{context_str}\n\nPregunta: {question}"

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]


def build_agent_messages(
    task: str,
    ctx: BrainContext,
    agent_name: str = "general",
) -> list[dict[str, str]]:
    """Construye mensajes para un agente específico."""
    system_map = {
        "LegalImpactAgent":     LEGAL_IMPACT_SYSTEM,
        "MediaNarrativeAgent":  MEDIA_NARRATIVE_SYSTEM,
        "BriefingAgent":        BRIEFING_SYSTEM,
        "SystemDiagnosticAgent": SYSTEM_DIAGNOSTIC_SYSTEM,
        "ElectoralScenarioAgent": ELECTORAL_SYSTEM,
    }
    system = system_map.get(agent_name, SYSTEM_BASE)

    context_str = ctx.to_prompt_string()
    user_content = f"Contexto:\n{context_str}\n\nTarea: {task}"

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
