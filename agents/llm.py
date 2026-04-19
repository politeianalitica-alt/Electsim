from __future__ import annotations

import json
import logging
import os
import random
import time
from typing import Any, Callable

import httpx
try:
    import tiktoken
except Exception:  # pragma: no cover - opcional en entornos mínimos
    tiktoken = None

logger = logging.getLogger(__name__)

_RETRIABLE_STATUS = {429, 500, 502, 503, 504}
_MAX_RETRIES = 4
_BASE_DELAY = 1.5


def _with_retry(fn: Callable[..., str], *args: Any, **kwargs: Any) -> str:
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
        delay = _BASE_DELAY * (2**attempt) + random.uniform(0.0, 0.5)
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
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        timeout_s: float = 120.0,
    ) -> None:
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.model = model or os.environ.get("ELECTSIM_OPENAI_MODEL", "gpt-4o-mini")
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
    def __init__(
        self,
        model: str | None = None,
        base_url: str | None = None,
        timeout_s: float = 180.0,
    ) -> None:
        self.model = model or os.environ.get("ELECTSIM_OLLAMA_MODEL", "llama3")
        self.base_url = (base_url or os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")
        self.timeout_s = timeout_s

    @property
    def modelo(self) -> str:
        return self.model

    def complete(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
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

    def __init__(self, fixed_response: str | None = None) -> None:
        self.fixed_response = fixed_response or (
            "### Deliberación\n"
            "Priorizo economía del hogar, empleo y estabilidad institucional para decidir mi voto.\n\n"
            "### Respuesta final\n"
            "Regular"
        )
        self.model = "stub-llm"

    @property
    def modelo(self) -> str:
        return self.model

    def complete(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        _ = messages, kwargs
        return str(self.fixed_response)


class EmbeddingClient:
    def __init__(self, api_key: str | None = None, model: str | None = None, base_url: str | None = None) -> None:
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.model = model or os.environ.get("ELECTSIM_EMBEDDING_MODEL", "text-embedding-3-small")
        self.base_url = (base_url or os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")).rstrip("/")
        self._encoding = tiktoken.get_encoding("cl100k_base") if tiktoken is not None else None

    def _truncate_for_embeddings(self, text_input: str, max_tokens: int = 8000) -> str:
        if self._encoding is None:
            # fallback aproximado si tiktoken no está instalado
            return text_input[:24000]
        tokens = self._encoding.encode(text_input)
        if len(tokens) <= max_tokens:
            return text_input
        return self._encoding.decode(tokens[:max_tokens])

    def embed_text(self, text_input: str) -> list[float]:
        text_input = self._truncate_for_embeddings(str(text_input))
        if not self.api_key:
            # fallback estable para entornos sin clave (tests locales)
            seed = sum(ord(ch) for ch in text_input) % 997
            return [((seed + i) % 97) / 97.0 for i in range(1536)]
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": self.model, "input": text_input}
        with httpx.Client(timeout=60.0) as client:
            response = client.post(f"{self.base_url}/embeddings", headers=headers, content=json.dumps(payload))
            response.raise_for_status()
        data = response.json()
        return list(data["data"][0]["embedding"])

    async def embed_text_async(self, text_input: str) -> list[float]:
        text_input = self._truncate_for_embeddings(str(text_input))
        if not self.api_key:
            seed = sum(ord(ch) for ch in text_input) % 997
            return [((seed + i) % 97) / 97.0 for i in range(1536)]
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": self.model, "input": text_input}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/embeddings", headers=headers, content=json.dumps(payload))
            response.raise_for_status()
        data = response.json()
        return list(data["data"][0]["embedding"])


_embedding_client: EmbeddingClient | None = None


def get_embedding_client() -> EmbeddingClient:
    global _embedding_client
    if _embedding_client is None:
        _embedding_client = EmbeddingClient()
    return _embedding_client
