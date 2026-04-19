<<<<<<< HEAD
"""Clientes LLM: stub (tests/offline) y OpenAI compatible vía HTTPX (sin SDK obligatorio)."""

=======
>>>>>>> 6fda6ff (agentes 1)
from __future__ import annotations

import json
import logging
import os
<<<<<<< HEAD
from typing import Any, Protocol, runtime_checkable
=======
import random
import time
from typing import Any, Callable
>>>>>>> 6fda6ff (agentes 1)

import httpx

logger = logging.getLogger(__name__)

<<<<<<< HEAD

@runtime_checkable
class LLMClient(Protocol):
    def complete(self, messages: list[dict[str, str]], **kwargs: Any) -> str: ...


class StubLLMClient:
    """Respuesta fija con formato CoT para tests y entornos sin API."""

    modelo: str = "stub"

    def complete(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        return (
            "### Deliberación\n"
            "Priorizo la economía familiar y la percepción de estabilidad. "
            "Dudo entre opciones de centro y mi bloque habitual.\n\n"
            "### Respuesta final\n"
            "Me inclinaría por quien transmita más gestión competente, sin un compromiso cerrado."
        )


class OpenAIChatClient:
    """``chat.completions`` OpenAI (o compatible) usando HTTPX."""
=======
_RETRIABLE_STATUS = {429, 500, 502, 503, 504}
_MAX_RETRIES = 4
_BASE_DELAY = 1.5  # segundos


def _with_retry(fn: Callable[..., str], *args: Any, **kwargs: Any) -> str:
    """
    Ejecuta fn(*args, **kwargs) con exponential backoff + jitter.
    Reintenta en HTTPStatusError retriable y TimeoutException.
    """
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            return fn(*args, **kwargs)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code not in _RETRIABLE_STATUS:
                raise
            last_exc = exc
        except httpx.TimeoutException as exc:
            last_exc = exc
        delay = _BASE_DELAY * (2 ** attempt) + random.uniform(0, 0.5)
        logger.warning(
            "LLM retry %s/%s tras error %s — esperando %.1fs",
            attempt + 1,
            _MAX_RETRIES,
            last_exc,
            delay,
        )
        time.sleep(delay)
    if last_exc is None:
        raise RuntimeError("_with_retry agotado sin excepción capturada")
    raise last_exc


class OpenAIChatClient:
    """Cliente OpenAI Chat Completions compatible con el runner de agentes."""
>>>>>>> 6fda6ff (agentes 1)

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        timeout_s: float = 120.0,
    ) -> None:
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.model = model or os.environ.get("ELECTSIM_OPENAI_MODEL", "gpt-4o-mini")
<<<<<<< HEAD
        self.base_url = (base_url or os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")).rstrip(
            "/"
        )
=======
        self.base_url = (base_url or os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")).rstrip("/")
        self.timeout_s = timeout_s

    @property
    def modelo(self) -> str:
        return self.model

    def _post_once(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY no definida")

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": float(kwargs.get("temperature", 0.4)),
            "max_tokens": int(kwargs.get("max_tokens", 1024)),
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        with httpx.Client(timeout=self.timeout_s) as client:
            r = client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                content=json.dumps(payload),
            )
            r.raise_for_status()
        data = r.json()
        try:
            return str(data["choices"][0]["message"]["content"] or "")
        except (KeyError, IndexError, TypeError) as e:
            logger.error("Respuesta OpenAI inesperada: %s", data)
            raise RuntimeError("Formato de respuesta OpenAI inválido") from e

    def complete(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        return _with_retry(self._post_once, messages, **kwargs)


class AnthropicChatClient:
    """
    Cliente para Anthropic Messages API.
    Requiere ANTHROPIC_API_KEY.
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout_s: float = 120.0,
    ) -> None:
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
        self.model = model or os.environ.get("ELECTSIM_ANTHROPIC_MODEL", "claude-haiku-4-5")
        self.timeout_s = timeout_s

    @property
    def modelo(self) -> str:
        return self.model

    def _post_once(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        if not self.api_key:
            raise RuntimeError("ANTHROPIC_API_KEY no definida")

        system_content = ""
        user_messages: list[dict[str, str]] = []
        for m in messages:
            role = m.get("role", "user")
            content = str(m.get("content", ""))
            if role == "system":
                system_content = content
            else:
                # Anthropic acepta roles user/assistant
                safe_role = role if role in {"user", "assistant"} else "user"
                user_messages.append({"role": safe_role, "content": content})

        payload: dict[str, Any] = {
            "model": self.model,
            "max_tokens": int(kwargs.get("max_tokens", 1024)),
            "temperature": float(kwargs.get("temperature", 0.4)),
            "messages": user_messages,
        }
        if system_content:
            payload["system"] = system_content

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

        with httpx.Client(timeout=self.timeout_s) as client:
            r = client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                content=json.dumps(payload),
            )
            r.raise_for_status()
        data = r.json()
        try:
            content = data.get("content", [])
            if isinstance(content, list):
                texts = [str(x.get("text", "")) for x in content if isinstance(x, dict)]
                return "\n".join(t for t in texts if t).strip()
            if isinstance(content, dict):
                return str(content.get("text", ""))
            raise KeyError("content")
        except (KeyError, IndexError, TypeError) as e:
            logger.error("Respuesta Anthropic inesperada: %s", data)
            raise RuntimeError("Formato de respuesta Anthropic inválido") from e

    def complete(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        return _with_retry(self._post_once, messages, **kwargs)


class OllamaClient:
    """
    Cliente para Ollama local.
    No usa retry por defecto.
    """

    def __init__(
        self,
        model: str | None = None,
        base_url: str | None = None,
        timeout_s: float = 180.0,
    ) -> None:
        self.model = model or os.environ.get("ELECTSIM_OLLAMA_MODEL", "llama3")
        self.base_url = (base_url or os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")
>>>>>>> 6fda6ff (agentes 1)
        self.timeout_s = timeout_s

    @property
    def modelo(self) -> str:
        return self.model

    def complete(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
<<<<<<< HEAD
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY no definida")
        url = f"{self.base_url}/chat/completions"
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": float(kwargs.get("temperature", 0.4)),
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        with httpx.Client(timeout=self.timeout_s) as client:
            r = client.post(url, headers=headers, content=json.dumps(payload))
            r.raise_for_status()
            data = r.json()
        try:
            return str(data["choices"][0]["message"]["content"] or "")
        except (KeyError, IndexError) as e:
            logger.error("Respuesta OpenAI inesperada: %s", data)
            raise RuntimeError("Formato de respuesta OpenAI inválido") from e
=======
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": float(kwargs.get("temperature", 0.4))},
        }
        with httpx.Client(timeout=self.timeout_s) as client:
            r = client.post(f"{self.base_url}/api/chat", content=json.dumps(payload))
            r.raise_for_status()
        data = r.json()
        try:
            return str(data["message"]["content"] or "")
        except (KeyError, TypeError) as e:
            logger.error("Respuesta Ollama inesperada: %s", data)
            raise RuntimeError("Formato de respuesta Ollama inválido") from e


class StubLLMClient:
    """Cliente fake para tests offline."""

    def __init__(self, fixed_response: str = "RESPUESTA: NS/NC") -> None:
        self.fixed_response = fixed_response
        self.model = "stub-llm"

    @property
    def modelo(self) -> str:
        return self.model

    def complete(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        _ = messages, kwargs
        return str(self.fixed_response)
>>>>>>> 6fda6ff (agentes 1)
