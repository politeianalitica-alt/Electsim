"""
AI Sidebar — Componente Streamlit de inteligencia asistida.

Integra el AnalystBrain en el sidebar de Streamlit:
  - Chat con Politeia (modelo local via Ollama)
  - Insights proactivos (picos de cobertura, alertas)
  - Contexto economico resumido
  - Acceso rapido a briefing del dia

Uso (en cualquier pagina Streamlit):
    from dashboard.components.ai_sidebar import render_ai_sidebar
    render_ai_sidebar()

El sidebar mantiene el estado de la conversacion en st.session_state.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
BRAIN_MODEL = os.getenv("OLLAMA_BRAIN_MODEL", "politeia-brain:latest")


def render_ai_sidebar(
    actors: list[str] | None = None,
    market_id: str = "ES",
    show_insights: bool = True,
    show_context: bool = True,
    max_history: int = 10,
) -> None:
    """
    Renderiza el sidebar de inteligencia en Streamlit.

    Args:
        actors: actores a monitorizar para insights proactivos
        market_id: mercado para contexto
        show_insights: mostrar insights proactivos
        show_context: mostrar contexto economico
        max_history: historial maximo de mensajes del chat
    """
    try:
        import streamlit as st
    except ImportError:
        logger.error("streamlit no instalado")
        return

    with st.sidebar:
        st.markdown("### Politeia Intelligence")
        st.caption(f"Mercado: {market_id} | Modelo: {BRAIN_MODEL}")

        # ------------------------------------------------------------------
        # Tab: Chat
        # ------------------------------------------------------------------
        tab_chat, tab_insights, tab_context = st.tabs(["Chat", "Insights", "Contexto"])

        with tab_chat:
            _render_chat(st, max_history)

        with tab_insights:
            if show_insights:
                _render_insights(st, actors or _default_actors(), market_id)
            else:
                st.caption("Insights desactivados")

        with tab_context:
            if show_context:
                _render_context(st, market_id)
            else:
                st.caption("Contexto desactivado")


def _render_chat(st: Any, max_history: int) -> None:
    """Renderiza el chat con el Brain."""
    if "brain_messages" not in st.session_state:
        st.session_state.brain_messages = []
        st.session_state.brain_messages.append({
            "role": "assistant",
            "content": "Politeia activo. Pregunta sobre actores, datos o tendencias.",
        })

    # Historial
    for msg in st.session_state.brain_messages[-max_history:]:
        role = msg["role"]
        with st.chat_message(role):
            st.markdown(msg["content"])

    # Input del usuario
    if user_input := st.chat_input("Pregunta a Politeia..."):
        st.session_state.brain_messages.append({
            "role": "user", "content": user_input
        })
        with st.chat_message("user"):
            st.markdown(user_input)

        # Respuesta del Brain
        with st.chat_message("assistant"):
            response_placeholder = st.empty()
            full_response = _get_brain_response(user_input, st)
            response_placeholder.markdown(full_response)

        st.session_state.brain_messages.append({
            "role": "assistant", "content": full_response
        })


def _get_brain_response(user_input: str, st: Any) -> str:
    """Obtiene respuesta del Brain (sincrono para Streamlit)."""
    try:
        response = asyncio.run(_async_brain_response(user_input))
        return response
    except RuntimeError:
        # Si ya hay un event loop activo (entornos jupyter/streamlit cloud)
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, _async_brain_response(user_input))
            try:
                return future.result(timeout=120)
            except Exception as exc:
                logger.debug("brain response error: %s", exc)
                return "Error al conectar con el modelo de IA local."
    except Exception as exc:
        logger.debug("_get_brain_response error: %s", exc)
        return f"Error: {exc}"


async def _async_brain_response(user_input: str) -> str:
    """Version async de la respuesta del Brain."""
    from agents.brain.ollama_client import BrainOllamaClient

    async with BrainOllamaClient() as client:
        available = await client.is_available()
        if not available:
            return (
                "El modelo de IA local no esta disponible. "
                "Verifica que Ollama este ejecutandose en localhost:11434."
            )

        return await client.generate(
            role="analisis",
            prompt=user_input,
            system=BrainOllamaClient.SYSTEM_PROMPT,
            temperature=0.4,
        )


def _render_insights(st: Any, actors: list[str], market_id: str) -> None:
    """Renderiza los insights proactivos."""
    if st.button("Actualizar insights", key="refresh_insights"):
        with st.spinner("Analizando feeds..."):
            insights = _fetch_insights(actors, market_id)
            st.session_state.brain_insights = insights

    insights = st.session_state.get("brain_insights", [])

    if not insights:
        st.caption("Sin insights nuevos. Pulsa 'Actualizar insights'.")
        return

    for insight in insights[:5]:
        actor = insight.get("actor", "?")
        trigger = insight.get("trigger", "")
        text = insight.get("insight", "")
        confidence = insight.get("confidence", 0.5)

        with st.expander(f"{actor} [{trigger}]"):
            st.markdown(text)
            st.progress(confidence, text=f"Confianza: {confidence:.0%}")


def _fetch_insights(actors: list[str], market_id: str) -> list[dict[str, Any]]:
    """Obtiene insights del AnalystBrain."""
    try:
        return asyncio.run(_async_fetch_insights(actors, market_id))
    except Exception as exc:
        logger.debug("_fetch_insights error: %s", exc)
        return []


async def _async_fetch_insights(actors: list[str], market_id: str) -> list[dict[str, Any]]:
    from agents.brain.analyst_brain import AnalystBrain
    from agents.brain.ollama_client import BrainOllamaClient

    async with BrainOllamaClient(market_id=market_id) as engine:
        brain = AnalystBrain(engine, actors=actors)
        insights = await brain.run_cycle(actors=actors)

    return [i.to_dict() for i in insights]


def _render_context(st: Any, market_id: str) -> None:
    """Renderiza el contexto economico y politico actual."""
    if st.button("Actualizar contexto", key="refresh_context"):
        with st.spinner("Cargando datos..."):
            context = _fetch_context()
            st.session_state.brain_context = context

    context = st.session_state.get("brain_context", {})

    if not context:
        st.caption("Sin datos de contexto. Pulsa 'Actualizar contexto'.")
        return

    # Economico
    eco = context.get("economic", {})
    if eco:
        st.markdown("**Indicadores economicos**")
        for k, v in list(eco.items())[:6]:
            if isinstance(v, (int, float)):
                st.metric(label=k.replace("_", " ").title(), value=f"{v:.2f}")

    # Politico
    pol = context.get("political", {})
    if pol:
        trending = pol.get("trending", [])
        if trending:
            st.markdown("**Actores en tendencia**")
            for actor in trending[:5]:
                st.markdown(f"- {actor}")


def _fetch_context() -> dict[str, Any]:
    """Obtiene el contexto actual del ContextEngine."""
    try:
        return asyncio.run(_async_fetch_context())
    except Exception as exc:
        logger.debug("_fetch_context error: %s", exc)
        return {}


async def _async_fetch_context() -> dict[str, Any]:
    from agents.brain.context_engine import ContextEngine
    from agents.brain.ollama_client import BrainOllamaClient

    async with BrainOllamaClient() as engine:
        ctx_engine = ContextEngine(engine, refresh_minutes=60)
        await ctx_engine._refresh_political()
        await ctx_engine._refresh_economic()

    all_ctx = ctx_engine.get_all_context()
    return {cat: snapshot.data for cat, snapshot in all_ctx.items()}


def _default_actors() -> list[str]:
    return [
        "Pedro Sanchez",
        "Alberto Nunez Feijoo",
        "Santiago Abascal",
        "Yolanda Diaz",
    ]
