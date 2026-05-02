"""
Capa 0 — OllamaEngine.

Motor LLM local unificado para todo el stack de inteligencia.
Wrappea agents/ollama/ollama_client.py con:
  - Seleccion de modelo por rol (resumen, entidades, analisis, embed)
  - CircuitBreaker para proteger contra fallos en cascada
  - Batch embeddings con concurrencia controlada
  - Forzado JSON con reintentos
  - Contexto de workspace (market_id, sector_ids) para prompts adaptativos

El CircuitBreaker vive en memoria de proceso.
Limitacion conocida: en entornos multi-worker (Celery), cada proceso
tiene su propio estado — no hay coordinacion global. Para coordinacion
global, mover el estado a Redis (no implementado aqui).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "120"))

_ROLE_MODELS: dict[str, str] = {
    "resumen":    os.getenv("OLLAMA_MODEL_RESUMEN",   "qwen3:8b"),
    "entidades":  os.getenv("OLLAMA_MODEL_ENTIDADES", "llama3.2:3b"),
    "analisis":   os.getenv("OLLAMA_MODEL_ANALISIS",  "gemma3:12b"),
    "embed":      os.getenv("OLLAMA_MODEL_EMBED",     "nomic-embed-text"),
    "rapido":     os.getenv("OLLAMA_MODEL_RAPIDO",    "llama3.2:3b"),
    "briefing":   os.getenv("OLLAMA_MODEL_BRIEFING",  "gemma3:12b"),
    "clasificar": os.getenv("OLLAMA_MODEL_CLASIFICAR","llama3.2:3b"),
    "estrategia": os.getenv("OLLAMA_MODEL_ESTRATEGIA","gemma3:12b"),
}

_RE_THINK = re.compile(r"<think>.*?</think>", re.DOTALL)

# ---------------------------------------------------------------------------
# CircuitBreaker
# ---------------------------------------------------------------------------

class CircuitState(Enum):
    CLOSED = "closed"      # Normal: peticiones pasan
    OPEN = "open"          # Fallo: peticiones bloqueadas
    HALF_OPEN = "half_open"  # Prueba: una peticion de prueba


@dataclass
class CircuitBreaker:
    """
    CircuitBreaker en memoria para proteger llamadas a Ollama.

    Estados:
      CLOSED -> OPEN cuando failures >= failure_threshold en una ventana
      OPEN -> HALF_OPEN cuando recovery_timeout ha expirado
      HALF_OPEN -> CLOSED si la llamada de prueba tiene exito
      HALF_OPEN -> OPEN si la llamada de prueba falla
    """

    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _failures: int = field(default=0, init=False)
    _last_failure_time: float = field(default=0.0, init=False)
    _opened_at: float = field(default=0.0, init=False)

    @property
    def state(self) -> CircuitState:
        if self._state == CircuitState.OPEN:
            if time.monotonic() - self._opened_at >= self.recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                logger.info("CircuitBreaker -> HALF_OPEN")
        return self._state

    def is_open(self) -> bool:
        return self.state == CircuitState.OPEN

    def allow_request(self) -> bool:
        s = self.state
        if s == CircuitState.CLOSED:
            return True
        if s == CircuitState.HALF_OPEN:
            return True
        return False

    def record_success(self) -> None:
        if self._state == CircuitState.HALF_OPEN:
            logger.info("CircuitBreaker -> CLOSED (recuperado)")
        self._state = CircuitState.CLOSED
        self._failures = 0

    def record_failure(self) -> None:
        self._failures += 1
        self._last_failure_time = time.monotonic()
        if self._failures >= self.failure_threshold:
            if self._state != CircuitState.OPEN:
                self._opened_at = time.monotonic()
                logger.warning(
                    "CircuitBreaker -> OPEN tras %d fallos", self._failures
                )
            self._state = CircuitState.OPEN

    def reset(self) -> None:
        self._state = CircuitState.CLOSED
        self._failures = 0


# ---------------------------------------------------------------------------
# OllamaEngine
# ---------------------------------------------------------------------------

class OllamaEngineError(RuntimeError):
    """Error del motor Ollama (circuit abierto o fallo de red)."""


class OllamaEngine:
    """
    Motor LLM unificado para el stack de inteligencia de Politeia.

    Uso:
        engine = OllamaEngine()
        async with engine:
            texto = await engine.generate("analisis", prompt)
            entidades = await engine.extract_json("entidades", prompt, schema)
            embeddings = await engine.embed_batch(textos)

    El engine es reutilizable entre requests dentro de una misma corrutina.
    Para uso en Celery workers, crear una instancia por tarea (no compartir
    entre tareas concurrentes sin sincronizacion).
    """

    def __init__(
        self,
        base_url: str = OLLAMA_BASE_URL,
        circuit_breaker: CircuitBreaker | None = None,
        market_id: str = "ES",
        sector_ids: list[str] | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._cb = circuit_breaker or CircuitBreaker()
        self._market_id = market_id
        self._sector_ids = sector_ids or ["PARTY"]
        self._session: Any = None

    async def __aenter__(self) -> "OllamaEngine":
        try:
            import httpx
            self._session = httpx.AsyncClient(
                timeout=OLLAMA_TIMEOUT,
                follow_redirects=True,
            )
        except ImportError:
            logger.warning("httpx no disponible — OllamaEngine en modo degradado")
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._session:
            await self._session.aclose()
            self._session = None

    # ------------------------------------------------------------------
    # Seleccion de modelo
    # ------------------------------------------------------------------

    def model_for_role(self, role: str) -> str:
        """Devuelve el modelo configurado para un rol dado."""
        return _ROLE_MODELS.get(role, _ROLE_MODELS["analisis"])

    # ------------------------------------------------------------------
    # Healthcheck
    # ------------------------------------------------------------------

    async def is_available(self) -> bool:
        """True si Ollama responde y el circuit no esta abierto."""
        if self._cb.is_open():
            return False
        if not self._session:
            return False
        try:
            resp = await self._session.get(
                f"{self._base_url}/api/tags", timeout=5.0
            )
            return resp.status_code == 200
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Llamada base con circuit breaker
    # ------------------------------------------------------------------

    async def _chat_raw(
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        response_format: dict[str, str] | None = None,
    ) -> str:
        if not self._cb.allow_request():
            raise OllamaEngineError(
                f"CircuitBreaker OPEN — Ollama no disponible ({self._cb._failures} fallos)"
            )
        if not self._session:
            raise OllamaEngineError("OllamaEngine no iniciado (usar como context manager)")

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": False,
        }
        if response_format:
            payload["response_format"] = response_format

        try:
            resp = await self._session.post(
                f"{self._base_url}/v1/chat/completions",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            self._cb.record_success()
            return _RE_THINK.sub("", str(content)).strip()
        except OllamaEngineError:
            raise
        except Exception as exc:
            self._cb.record_failure()
            raise OllamaEngineError(f"Fallo llamada Ollama ({model}): {exc}") from exc

    # ------------------------------------------------------------------
    # API publica
    # ------------------------------------------------------------------

    async def generate(
        self,
        role: str,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.3,
        model: str | None = None,
    ) -> str:
        """
        Genera texto con el modelo asignado al rol.

        Args:
            role: clave de _ROLE_MODELS (resumen, analisis, briefing, ...)
            prompt: mensaje de usuario
            system: system prompt opcional
            temperature: temperatura del modelo
            model: forzar modelo especifico (sobreescribe role)
        """
        modelo = model or self.model_for_role(role)
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt[:8000]})

        for attempt in range(3):
            try:
                return await self._chat_raw(modelo, messages, temperature)
            except OllamaEngineError:
                if attempt == 2:
                    raise
                await asyncio.sleep(1.5 ** attempt)
        return ""

    async def extract_json(
        self,
        role: str,
        prompt: str,
        schema_hint: str = "",
        system: str | None = None,
        max_retries: int = 3,
    ) -> dict[str, Any]:
        """
        Genera JSON estructurado con reintentos y forzado de formato.

        Args:
            role: rol del modelo
            prompt: instruccion de extraccion
            schema_hint: descripcion del schema esperado (ej: '{"clave": "valor"}')
            system: system prompt opcional
            max_retries: reintentos ante JSON invalido
        """
        modelo = self.model_for_role(role)
        sys_content = (
            system or
            f"Responde SOLO con JSON valido. Schema: {schema_hint}" if schema_hint
            else "Responde SOLO con JSON valido."
        )
        messages: list[dict[str, str]] = [
            {"role": "system", "content": sys_content},
            {"role": "user", "content": prompt[:6000]},
        ]

        for attempt in range(max_retries):
            try:
                raw = await self._chat_raw(
                    modelo, messages, temperature=0.0,
                    response_format={"type": "json_object"},
                )
                return self._parse_json(raw)
            except (OllamaEngineError, ValueError) as exc:
                if attempt == max_retries - 1:
                    logger.warning("extract_json agoto reintentos: %s", exc)
                    return {}
                await asyncio.sleep(0.5)
        return {}

    def _parse_json(self, text: str) -> dict[str, Any]:
        """Parsea JSON con fallback por regex."""
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                pass
        raise ValueError(f"JSON no parseado: {text[:100]}")

    # ------------------------------------------------------------------
    # Embeddings
    # ------------------------------------------------------------------

    async def embed(self, text: str) -> list[float]:
        """Embedding 768d via nomic-embed-text."""
        if not self._session or not text:
            return []
        if not self._cb.allow_request():
            return []
        try:
            resp = await self._session.post(
                f"{self._base_url}/api/embed",
                json={"model": self.model_for_role("embed"), "input": text[:8192]},
            )
            resp.raise_for_status()
            data = resp.json()
            embeddings = data.get("embeddings", [[]])
            self._cb.record_success()
            if embeddings and isinstance(embeddings[0], list):
                return [float(x) for x in embeddings[0]]
            return [float(x) for x in embeddings]
        except Exception as exc:
            self._cb.record_failure()
            logger.debug("embed error: %s", exc)
            return []

    async def embed_batch(
        self,
        texts: list[str],
        concurrency: int = 4,
    ) -> list[list[float]]:
        """Embeddings para un lote con concurrencia controlada."""
        sem = asyncio.Semaphore(concurrency)

        async def _one(t: str) -> list[float]:
            async with sem:
                return await self.embed(t)

        results = await asyncio.gather(*[_one(t) for t in texts], return_exceptions=True)
        return [r if isinstance(r, list) else [] for r in results]

    # ------------------------------------------------------------------
    # Context info
    # ------------------------------------------------------------------

    @property
    def market_id(self) -> str:
        return self._market_id

    @property
    def sector_ids(self) -> list[str]:
        return self._sector_ids

    @property
    def circuit_state(self) -> str:
        return self._cb.state.value
