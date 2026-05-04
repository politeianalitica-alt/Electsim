"""
LLM Gateway — puerta de entrada unificada a modelos de lenguaje.

Wrapper sobre agents.ai_engine.AIEngine que:
  - Usa AIEngine/Ollama por defecto (sin dependencias extra)
  - Soporta LiteLLM como proxy opcional (ELECTSIM_AI_ENABLE_LITELLM=true)
  - Soporta Claude/OpenAI como fallback cloud
  - Degrada sin romper si ningún backend está disponible
  - Expone: complete(), stream_complete(), embed(), status()
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any, Generator, Iterator

from .model_router import ModelRoute, get_route

logger = logging.getLogger(__name__)

# ── Configuración ─────────────────────────────────────────────────────────────

_ENABLE_LITELLM     = os.getenv("ELECTSIM_AI_ENABLE_LITELLM", "false").lower() == "true"
_LITELLM_BASE_URL   = os.getenv("ELECTSIM_LITELLM_BASE_URL",  "http://localhost:4000")
_ANTHROPIC_API_KEY  = os.getenv("ANTHROPIC_API_KEY", "")
_OPENAI_API_KEY     = os.getenv("OPENAI_API_KEY", "")

# ── Lazy AIEngine singleton ───────────────────────────────────────────────────

_ai_engine_instance: Any = None


def _get_ai_engine() -> Any:
    """Obtiene el AIEngine singleton (lazy)."""
    global _ai_engine_instance
    if _ai_engine_instance is None:
        try:
            from agents.ai_engine import get_ai_engine
            _ai_engine_instance = get_ai_engine()
        except Exception as exc:
            logger.warning("LLMGateway: AIEngine no disponible: %s", exc)
            _ai_engine_instance = None
    return _ai_engine_instance


# ── LLMGateway ────────────────────────────────────────────────────────────────

class LLMGateway:
    """
    Puerta de entrada unificada a modelos de lenguaje.

    Prioridad:
      1. AIEngine/Ollama local (por defecto)
      2. LiteLLM proxy (si ELECTSIM_AI_ENABLE_LITELLM=true)
      3. Claude API (fallback cloud si ANTHROPIC_API_KEY)
      4. Respuesta de error elegante (nunca crash)

    Uso::

        gw = LLMGateway()
        resp = gw.complete([{"role":"user","content":"Hola"}], task_type="fast")
    """

    def __init__(self, task_type: str = "normal") -> None:
        self.task_type = task_type
        self._route: ModelRoute = get_route(task_type)

    # ── complete ──────────────────────────────────────────────────────────────

    def complete(
        self,
        messages: list[dict[str, Any]],
        task_type: str | None = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> str:
        """
        Genera una respuesta completa (no streaming).

        Args:
            messages: lista de {role, content}.
            task_type: overrides el task_type del constructor.
            stream: ignorado aquí (usa stream_complete() para streaming).

        Returns:
            str con la respuesta, nunca None.
        """
        route = get_route(task_type or self.task_type)
        t0 = time.monotonic()

        # 1. LiteLLM (si habilitado)
        if _ENABLE_LITELLM:
            result = self._complete_litellm(messages, route)
            if result is not None:
                logger.debug("LLMGateway: LiteLLM OK en %.1fms", (time.monotonic() - t0) * 1000)
                return result

        # 2. AIEngine/Ollama local
        result = self._complete_ai_engine(messages, route)
        if result is not None:
            logger.debug("LLMGateway: AIEngine OK en %.1fms", (time.monotonic() - t0) * 1000)
            return result

        # 3. Claude API fallback
        if _ANTHROPIC_API_KEY and route.fallback_provider == "anthropic":
            result = self._complete_claude(messages, route)
            if result is not None:
                logger.debug("LLMGateway: Claude fallback OK en %.1fms", (time.monotonic() - t0) * 1000)
                return result

        logger.warning("LLMGateway: todos los backends fallaron para task_type=%s", route.task_type)
        return "_Sin respuesta disponible. Ollama no está activo o el modelo no está cargado._"

    def stream_complete(
        self,
        messages: list[dict[str, Any]],
        task_type: str | None = None,
        **kwargs: Any,
    ) -> Generator[str, None, None]:
        """Streaming: genera tokens uno a uno via Ollama."""
        route = get_route(task_type or self.task_type)
        ai = _get_ai_engine()
        if ai is None:
            yield self.complete(messages, task_type)
            return

        try:
            prompt = self._messages_to_prompt(messages)
            model = ai.resolve_ollama_model(route.model)
            for chunk in ai.ollama_chat_stream(prompt, model=model, **route.params):
                yield chunk
        except Exception as exc:
            logger.debug("stream_complete fallback: %s", exc)
            yield self.complete(messages, task_type)

    # ── embed ─────────────────────────────────────────────────────────────────

    def embed(self, texts: list[str]) -> list[list[float]]:
        """
        Genera embeddings para una lista de textos.
        Usa AIEngine (Ollama nomic-embed-text → sentence-transformers → hash fallback).
        """
        ai = _get_ai_engine()
        if ai is None:
            # Fallback determinista
            from agents.ai_engine import _stable_hash_embedding
            return [_stable_hash_embedding(t) for t in texts]
        try:
            return ai.embed(texts)
        except Exception as exc:
            logger.debug("embed fallback: %s", exc)
            from agents.ai_engine import _stable_hash_embedding
            return [_stable_hash_embedding(t) for t in texts]

    # ── status ────────────────────────────────────────────────────────────────

    def status(self) -> dict[str, Any]:
        """Devuelve estado del gateway (backends disponibles, modelo activo…)."""
        ai = _get_ai_engine()
        ai_status = ai.status() if ai else {}

        return {
            "provider": "ai_engine" if ai else "none",
            "ollama_available": ai_status.get("ollama_available", False),
            "ollama_model": ai_status.get("ollama_model", "—"),
            "embedding_model": ai_status.get("embedding_model", "—"),
            "chroma_available": ai_status.get("chroma_available", False),
            "chroma_count": ai_status.get("chroma_count", 0),
            "litellm_enabled": _ENABLE_LITELLM,
            "litellm_url": _LITELLM_BASE_URL if _ENABLE_LITELLM else None,
            "claude_available": bool(_ANTHROPIC_API_KEY),
            "task_type": self.task_type,
            "model_route": self._route.model_dump(),
        }

    # ── backends internos ─────────────────────────────────────────────────────

    def _complete_ai_engine(
        self, messages: list[dict[str, Any]], route: ModelRoute
    ) -> str | None:
        ai = _get_ai_engine()
        if ai is None or not ai.is_ollama_available():
            return None
        try:
            prompt = self._messages_to_prompt(messages)
            model = ai.resolve_ollama_model(route.model)
            params = {k: v for k, v in route.params.items() if k != "task_type"}
            return ai.ollama_chat(prompt, model=model, **params)
        except Exception as exc:
            logger.debug("_complete_ai_engine error: %s", exc)
            return None

    def _complete_litellm(
        self, messages: list[dict[str, Any]], route: ModelRoute
    ) -> str | None:
        try:
            import litellm  # noqa: F401
            response = litellm.completion(
                model=f"ollama/{route.model}",
                messages=messages,
                api_base=_LITELLM_BASE_URL,
                timeout=30,
            )
            return response.choices[0].message.content or None
        except Exception as exc:
            logger.debug("_complete_litellm error: %s", exc)
            return None

    def _complete_claude(
        self, messages: list[dict[str, Any]], route: ModelRoute
    ) -> str | None:
        if not _ANTHROPIC_API_KEY:
            return None
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=_ANTHROPIC_API_KEY)
            model = route.fallback_model or "claude-3-5-sonnet-20241022"
            # Separar system messages
            system_msgs = [m["content"] for m in messages if m.get("role") == "system"]
            user_msgs = [m for m in messages if m.get("role") != "system"]
            system = "\n".join(system_msgs) if system_msgs else "Eres Politeia Brain, asistente de inteligencia política."
            response = client.messages.create(
                model=model,
                max_tokens=route.params.get("num_predict", 700),
                system=system,
                messages=user_msgs,
            )
            return response.content[0].text if response.content else None
        except Exception as exc:
            logger.debug("_complete_claude error: %s", exc)
            return None

    @staticmethod
    def _messages_to_prompt(messages: list[dict[str, Any]]) -> str:
        """Convierte lista de mensajes a prompt simple para Ollama."""
        parts: list[str] = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                parts.append(f"Sistema: {content}")
            elif role == "assistant":
                parts.append(f"Asistente: {content}")
            else:
                parts.append(f"Usuario: {content}")
        return "\n\n".join(parts)


# ── Singleton y shortcut ──────────────────────────────────────────────────────

_gateway_instance: LLMGateway | None = None


def get_gateway(task_type: str = "normal") -> LLMGateway:
    """Devuelve un LLMGateway. Crea uno si no existe."""
    global _gateway_instance
    if _gateway_instance is None or _gateway_instance.task_type != task_type:
        _gateway_instance = LLMGateway(task_type=task_type)
    return _gateway_instance
