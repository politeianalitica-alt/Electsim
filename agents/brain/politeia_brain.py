"""
Politeia Brain — ElectSim.

Servicio central de IA: enruta peticiones al mejor modelo disponible
(Ollama -> Groq -> Anthropic) con contexto politico enriquecido.
"""
from __future__ import annotations

import logging
import time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """Eres Politeia Brain, el asistente de inteligencia política de ElectSim España.
Eres un analista político senior especializado en el sistema político español, elecciones, \
legislación parlamentaria, partidos políticos y estrategia de comunicación política.

REGLAS ABSOLUTAS:
- Siempre respondes en español con terminología política precisa.
- Nunca tomas partido político ni favoreces ninguna formación.
- Si no tienes datos suficientes, lo indicas explícitamente.
- Usas markdown en TODAS tus respuestas: **negrita**, listas con •, secciones con ##.

ESTRUCTURA OBLIGATORIA DE TU ANÁLISIS (úsala siempre):
**Estado actual** — hechos verificables, datos concretos, cifras cuando las tengas.
**Riesgos** — amenazas identificadas con probabilidad estimada cuando sea posible.
**Oportunidades** — vectores de cambio o ventanas de acción.
**Acción recomendada** — qué debe hacerse o monitorizarse en las próximas 72h.

CONTEXTO QUE TIENES DISPONIBLE:
- Nowcasting electoral en tiempo real (intención de voto por partido)
- Alertas activas del sistema de señales políticas
- Narrativas mediáticas activas (medios, OSINT, redes)
- Actividad legislativa (Congreso, BOE, Senado)
- Índice de riesgo político multidimensional
- Mapa de actores e influencias
- Datos macroeconómicos relevantes

Integra siempre el contexto de plataforma cuando te lo proporcionen.
Sé conciso pero completo. No repitas la pregunta. Ve directo al análisis.
Responde únicamente con texto markdown, nunca con JSON ni dicts de Python."""

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class BrainQuery(BaseModel):
    """Peticion al Politeia Brain."""

    model_config = ConfigDict(str_strip_whitespace=True)

    question: str
    context: str = Field(default="")
    user_id: str = Field(default="")
    workspace_id: str = Field(default="default")
    conversation_history: list[dict[str, Any]] = Field(default_factory=list)


class BrainResponse(BaseModel):
    """Respuesta del Politeia Brain."""

    model_config = ConfigDict()

    answer: str
    model_used: str
    latency_ms: int
    from_cache: bool
    ok: bool
    error: str = Field(default="")
    context_used: bool = Field(default=False)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _build_prompt(query: BrainQuery) -> str:
    """Construye el prompt completo con historial, contexto y pregunta actual."""
    parts: list[str] = []

    # Contexto externo (datos de plataforma)
    if query.context.strip():
        parts.append("=== CONTEXTO DE LA PLATAFORMA ===")
        parts.append(query.context.strip())
        parts.append("=== FIN CONTEXTO ===")
        parts.append("")

    # Historial de conversacion (ultimos 6 intercambios = 12 mensajes)
    history = query.conversation_history[-12:] if query.conversation_history else []
    if history:
        parts.append("=== HISTORIAL DE CONVERSACION ===")
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            label = "Usuario" if role == "user" else "Brain"
            parts.append(f"{label}: {content}")
        parts.append("=== FIN HISTORIAL ===")
        parts.append("")

    # Pregunta actual
    parts.append(f"Usuario: {query.question}")

    return "\n".join(parts)


def _demo_answer(question: str) -> str:
    """Devuelve una respuesta de demostracion realista en espanol."""
    q_lower = question.lower()

    if "pp" in q_lower or "partido popular" in q_lower:
        respuesta = (
            "Segun las ultimas encuestas disponibles en el sistema, el Partido Popular "
            "mantiene una posicion de primera fuerza a nivel nacional con estimaciones "
            "en torno al 32-35% del voto, lo que se traduciria en aproximadamente 135-145 "
            "escanos segun el modelo D'Hondt de ElectSim. La tendencia es de estabilidad "
            "con ligera mejora en municipios medianos. La principal vulnerabilidad del PP "
            "es la competencia de Vox por el electorado conservador en algunas comunidades."
        )
    elif "psoe" in q_lower:
        respuesta = (
            "El PSOE aparece en las encuestas procesadas por ElectSim en torno al 28-30% "
            "del voto estimado, lo que equivale a 110-120 escanos. El partido mantiene "
            "su base electoral en grandes urbes y zonas de tradicion socialista, pero "
            "enfrenta presion de Sumar en el electorado progresista urbano. La participacion "
            "electoral y la movilizacion del voto de izquierda seran factores determinantes "
            "en cualquier convocatoria electoral."
        )
    elif "presupuesto" in q_lower or "economia" in q_lower:
        respuesta = (
            "El contexto economico y presupuestario tiene implicaciones politicas directas. "
            "La aprobacion de los Presupuestos Generales del Estado es un indicador clave "
            "de la estabilidad del gobierno de coalicion: sin mayoria absoluta, el ejecutivo "
            "depende de pactos parlamentarios con grupos de la periferia. ElectSim monitoriza "
            "los indicadores macroeconomicos (IPC, desempleo, prima de riesgo) como proxies "
            "del ciclo electoral, dado que la economia es consistentemente el primer factor "
            "de voto segun el CIS."
        )
    else:
        respuesta = (
            "La situacion politica espanola se caracteriza actualmente por un parlamento "
            "altamente fragmentado que requiere acuerdos multipartidistas para cualquier "
            "iniciativa legislativa relevante. ElectSim monitoriza continuamente los "
            "indicadores clave: sondeos electorales, actividad parlamentaria en el Congreso "
            "y el Senado, agenda del BOE, y narrativas mediaticas dominantes. Para un "
            "analisis especifico, reformula la pregunta con el actor, partido o dimension "
            "politica de interes (electoral, legislativa, de riesgo, etc.)."
        )

    return (
        respuesta
        + "\n\n[Respuesta de demostracion — conecta Ollama o configura GROQ_API_KEY "
        "para respuestas en tiempo real.]"
    )


# ---------------------------------------------------------------------------
# LLM routing
# ---------------------------------------------------------------------------


def _try_llm_router(query: BrainQuery, full_prompt: str) -> BrainResponse | None:
    """Intenta enrutar via llm_router. Retorna None si falla."""
    try:
        from agents.brain.llm_router import route  # type: ignore[import]

        context_dict: dict[str, Any] = {}
        if query.context:
            context_dict["platform_context"] = query.context[:2000]

        start = time.time()
        result = route("qna", full_prompt, context=context_dict if context_dict else None)
        latency_ms = int((time.time() - start) * 1000)

        if result.get("ok") and result.get("result"):
            return BrainResponse(
                answer=str(result["result"]),
                model_used=result.get("model", "llm_router"),
                latency_ms=latency_ms,
                from_cache=bool(result.get("from_cache", False)),
                ok=True,
                context_used=bool(query.context.strip()),
            )
    except Exception as exc:
        log.debug("llm_router failed: %s", exc)

    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def ask_brain(query: BrainQuery) -> BrainResponse:
    """
    Funcion principal: envia una consulta al Politeia Brain.

    Orden de intentos:
    1. llm_router (Ollama -> Groq -> Anthropic segun disponibilidad)
    2. Respuesta de demostracion
    """
    start_total = time.time()

    full_prompt = _build_prompt(query)

    # Intento 1: llm_router
    response = _try_llm_router(query, full_prompt)
    if response is not None:
        return response

    # Fallback: demo
    latency_ms = int((time.time() - start_total) * 1000)
    return BrainResponse(
        answer=_demo_answer(query.question),
        model_used="demo",
        latency_ms=latency_ms,
        from_cache=False,
        ok=True,
        context_used=bool(query.context.strip()),
    )


def get_available_model() -> str:
    """Retorna el nombre del modelo disponible en orden de preferencia."""
    # Comprobar Ollama
    try:
        import urllib.request

        req = urllib.request.Request(
            "http://localhost:11434/api/tags",
            method="GET",
        )
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=2) as resp:
            if resp.status == 200:
                return "Ollama (local)"
    except Exception:
        pass

    # Comprobar Groq
    try:
        from agents.brain.groq_client import is_groq_available  # type: ignore[import]

        if is_groq_available():
            return "Groq (cloud)"
    except Exception:
        pass

    # Comprobar Anthropic
    try:
        import os

        if os.environ.get("ANTHROPIC_API_KEY", "").strip():
            return "Anthropic Claude"
    except Exception:
        pass

    return "Demo (sin modelo)"


def is_brain_available() -> bool:
    """True si hay al menos un modelo LLM configurado y disponible."""
    return get_available_model() != "Demo (sin modelo)"
