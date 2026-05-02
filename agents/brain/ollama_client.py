"""
OllamaClient del Brain — wrapper del OllamaEngine para el brain layer.

Reexporta OllamaEngine con defaults del brain:
  - Modelo de analisis: gemma3:12b (briefings, insights proactivos)
  - Streaming habilitado para la UI del sidebar
  - Fallback a politeia-brain:latest si los modelos base no estan disponibles
"""
from __future__ import annotations

import logging
import os
from typing import Any, AsyncGenerator

from agents.analysis.ollama_engine import OllamaEngine, CircuitBreaker

logger = logging.getLogger(__name__)

BRAIN_MODEL = os.getenv("OLLAMA_BRAIN_MODEL", "politeia-brain:latest")
FALLBACK_MODEL = os.getenv("OLLAMA_MODEL_ANALISIS", "gemma3:12b")


class BrainOllamaClient(OllamaEngine):
    """
    OllamaClient especializado para el Brain layer.

    Extiende OllamaEngine con:
      - Streaming de texto para la UI
      - Seleccion automatica de modelo (politeia-brain > gemma3:12b > llama3.2:3b)
      - Prefijo de sistema orientado a analista politico
    """

    SYSTEM_PROMPT = (
        "Eres Politeia, un asistente de inteligencia politica experto en "
        "politica espanola y europea. Eres directo, preciso y no usas emojis. "
        "Citas datos cuando estan disponibles y señalas incertidumbres explicitamente."
    )

    def __init__(
        self,
        base_url: str | None = None,
        market_id: str = "ES",
        sector_ids: list[str] | None = None,
    ) -> None:
        from agents.analysis.ollama_engine import OLLAMA_BASE_URL
        super().__init__(
            base_url=base_url or OLLAMA_BASE_URL,
            market_id=market_id,
            sector_ids=sector_ids or ["PARTY"],
        )

    async def select_model(self) -> str:
        """Selecciona el mejor modelo disponible."""
        available = await self.listar_modelos()
        if BRAIN_MODEL in available:
            return BRAIN_MODEL
        if FALLBACK_MODEL in available:
            return FALLBACK_MODEL
        return self.model_for_role("analisis")

    async def listar_modelos(self) -> list[str]:
        """Lista modelos disponibles en Ollama."""
        if not self._session:
            return []
        try:
            resp = await self._session.get(f"{self._base_url}/api/tags", timeout=5.0)
            resp.raise_for_status()
            data = resp.json()
            return [m["name"] for m in data.get("models", [])]
        except Exception:
            return []

    async def chat_stream(
        self,
        prompt: str,
        system: str | None = None,
        model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Streaming de respuesta para la UI del sidebar.

        Genera tokens incrementales mientras el modelo responde.
        Si el streaming falla, retorna la respuesta completa en un chunk.
        """
        if not self._session:
            yield "Ollama no disponible."
            return

        if not self._cb.allow_request():
            yield "Motor de IA no disponible temporalmente."
            return

        modelo = model or await self.select_model()
        messages: list[dict[str, str]] = []
        if system or self.SYSTEM_PROMPT:
            messages.append({"role": "system", "content": system or self.SYSTEM_PROMPT})
        messages.append({"role": "user", "content": prompt[:6000]})

        try:
            async with self._session.stream(
                "POST",
                f"{self._base_url}/v1/chat/completions",
                json={
                    "model": modelo,
                    "messages": messages,
                    "temperature": 0.4,
                    "stream": True,
                },
            ) as resp:
                resp.raise_for_status()
                import json
                async for line in resp.aiter_lines():
                    if not line or line == "data: [DONE]":
                        continue
                    if line.startswith("data: "):
                        try:
                            chunk = json.loads(line[6:])
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield delta
                        except (json.JSONDecodeError, KeyError):
                            continue
            self._cb.record_success()
        except Exception as exc:
            self._cb.record_failure()
            logger.debug("chat_stream error: %s — usando fallback", exc)
            # Fallback a respuesta completa
            try:
                response = await self.generate(
                    role="analisis",
                    prompt=prompt,
                    system=system or self.SYSTEM_PROMPT,
                )
                yield response
            except Exception:
                yield "Error al generar respuesta."

    async def quick_insight(self, topic: str) -> str:
        """Genera un insight rapido sobre un tema (max 60 palabras)."""
        prompt = (
            f"Genera un insight politico conciso (maximo 60 palabras) sobre: {topic}"
        )
        return await self.generate(
            role="rapido",
            prompt=prompt,
            system=self.SYSTEM_PROMPT,
            temperature=0.5,
        )
