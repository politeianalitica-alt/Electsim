"""Clientes LLM: stub (tests/offline) y OpenAI compatible vía HTTPX (sin SDK obligatorio)."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Protocol, runtime_checkable

import httpx

logger = logging.getLogger(__name__)


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

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        timeout_s: float = 120.0,
    ) -> None:
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.model = model or os.environ.get("ELECTSIM_OPENAI_MODEL", "gpt-4o-mini")
        self.base_url = (base_url or os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")).rstrip(
            "/"
        )
        self.timeout_s = timeout_s

    @property
    def modelo(self) -> str:
        return self.model

    def complete(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
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
