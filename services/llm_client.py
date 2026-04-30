"""
LLMClient v2 — Cliente unificado para el stack LLM local.

Routing automatico por tarea:
  clasificacion/resumen    -> electsim-fast  (Qwen 14B, latencia baja)
  analisis/plan/chat       -> electsim-analysis (Qwen 72B, contexto 128K)
  embeddings               -> electsim-embed (nomic-embed-text)

Backend: LiteLLM proxy (http://litellm-proxy:4000) que enruta a vLLM u Ollama.
Fallback automatico si LiteLLM no disponible: OllamaClient directo.

Salida estructurada: analyze_structured() valida la respuesta contra un
Pydantic model — relanza ValidationError si el JSON no encaja.

Sin emojis. Sin proveedores de pago.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Literal, Optional, Type, TypeVar

from pydantic import BaseModel, ValidationError

from observability.otel import get_tracer
from observability.metrics import LLMMetrics, measure_ms
from observability.logging import get_logger as _get_structured_logger

logger = logging.getLogger(__name__)
_slog = _get_structured_logger("services.llm_client")
_tracer = get_tracer(__name__)

T = TypeVar("T", bound=BaseModel)

# ---------------------------------------------------------------------------
# Tipos de tarea
# ---------------------------------------------------------------------------

TASK_ANALYSIS = "analysis"
TASK_CLASSIFICATION = "classification"
TASK_SUMMARY = "summary"
TASK_PLAN = "plan"
TASK_CHAT = "chat"

_FAST_TASKS = {TASK_CLASSIFICATION, TASK_SUMMARY}

# Modelo de desarrollo/fallback cuando LiteLLM no esta disponible
_DEV_MODEL = "electsim-dev"

# ---------------------------------------------------------------------------
# Helper: limpiar JSON de bloques de razonamiento
# ---------------------------------------------------------------------------

_RE_THINK = re.compile(r"<think>.*?</think>", re.DOTALL)
_RE_FENCE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def _clean_json_response(raw: str) -> str:
    """Limpia la respuesta del modelo para extraer JSON valido."""
    # Elimina razonamiento interno (qwen3, deepseek)
    cleaned = _RE_THINK.sub("", raw).strip()
    # Elimina code fences ```json ... ```
    fence_match = _RE_FENCE.search(cleaned)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    # Si sigue sin ser JSON puro, busca el primer { ... }
    if not cleaned.startswith("{") and not cleaned.startswith("["):
        m = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if m:
            cleaned = m.group(0)
    return cleaned


# ---------------------------------------------------------------------------
# LLMClient
# ---------------------------------------------------------------------------

class LLMClient:
    """
    Cliente LLM unificado con routing automatico y salida estructurada.

    Uso basico:
        client = LLMClient()
        result = await client.analyze_structured(prompt, MySchema)

    Instanciacion con config explicita:
        client = LLMClient(base_url="http://localhost:4000", api_key="...")
    """

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        model_analysis: str | None = None,
        model_fast: str | None = None,
        model_embed: str | None = None,
        timeout: float = 120.0,
    ) -> None:
        from config.settings import get_settings
        cfg = get_settings()

        self._base_url = (base_url or cfg.litellm_base_url).rstrip("/")
        self._api_key = api_key or cfg.litellm_api_key
        self._model_analysis = model_analysis or cfg.llm_model_analysis
        self._model_fast = model_fast or cfg.llm_model_fast
        self._model_embed = model_embed or cfg.llm_model_embed
        self._timeout = timeout

    # ------------------------------------------------------------------
    # Routing
    # ------------------------------------------------------------------

    def _select_model(self, task_type: str, context_tokens: int = 0) -> str:
        """
        Selecciona el modelo optimo segun la tarea.

        context_tokens > 16000 fuerza el modelo analysis (128K ctx).
        """
        if context_tokens > 16000:
            return self._model_analysis
        if task_type in _FAST_TASKS:
            return self._model_fast
        return self._model_analysis

    # ------------------------------------------------------------------
    # Llamada base via LiteLLM o fallback httpx directo
    # ------------------------------------------------------------------

    async def _complete(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.2,
        response_json: bool = False,
        cache: bool = False,
        _task_type: str = "unknown",
    ) -> str:
        """Llamada al LLM con fallback a OllamaClient si LiteLLM no disponible."""
        # 1. Intentar via LiteLLM (acompletion)
        try:
            return await self._complete_litellm(
                model=model,
                messages=messages,
                temperature=temperature,
                response_json=response_json,
                cache=cache,
                _task_type=_task_type,
            )
        except Exception as exc:
            logger.info("LiteLLM no disponible (%s) — fallback a Ollama directo", exc)

        # 2. Fallback: OllamaClient directo (sin metricas de tokens — Ollama no las expone)
        with measure_ms() as t:
            try:
                result = await self._complete_ollama_direct(messages, temperature)
            except Exception as exc:
                LLMMetrics.record_call(
                    model=model,
                    task_type=_task_type,
                    latency_ms=t.elapsed_ms,
                    error=type(exc).__name__,
                )
                raise
        LLMMetrics.record_call(model=model, task_type=_task_type, latency_ms=t.elapsed_ms)
        return result

    async def _complete_litellm(
        self,
        model: str,
        messages: list[dict],
        temperature: float,
        response_json: bool,
        cache: bool,
        _task_type: str = "unknown",
    ) -> str:
        """Usa el modulo litellm si esta instalado."""
        try:
            from litellm import acompletion
        except ImportError:
            raise RuntimeError("litellm no instalado")

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "api_base": self._base_url,
            "api_key": self._api_key,
            "temperature": temperature,
            "timeout": self._timeout,
        }
        if response_json:
            kwargs["response_format"] = {"type": "json_object"}
        if not cache:
            kwargs["caching"] = False

        with measure_ms() as t:
            try:
                response = await acompletion(**kwargs)
            except Exception as exc:
                LLMMetrics.record_call(
                    model=model,
                    task_type=_task_type,
                    latency_ms=t.elapsed_ms,
                    error=type(exc).__name__,
                )
                raise

        usage = getattr(response, "usage", None)
        tokens_in = getattr(usage, "prompt_tokens", 0) or 0
        tokens_out = getattr(usage, "completion_tokens", 0) or 0
        LLMMetrics.record_call(
            model=model,
            task_type=_task_type,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            latency_ms=t.elapsed_ms,
        )

        content = response.choices[0].message.content
        return str(content) if content else ""

    async def _complete_ollama_direct(
        self,
        messages: list[dict],
        temperature: float,
    ) -> str:
        """Fallback: llama directo a Ollama via OllamaClient existente."""
        from agents.ollama.ollama_client import OllamaClient
        async with OllamaClient() as ollama:
            ok = await ollama.healthcheck()
            if not ok:
                raise RuntimeError("Ollama no disponible")
            # Construye prompt desde messages
            user_msg = " ".join(
                m.get("content", "") for m in messages if m.get("role") == "user"
            )
            system_msg = " ".join(
                m.get("content", "") for m in messages if m.get("role") == "system"
            )
            return await ollama.chat_con_contexto(
                system_prompt=system_msg,
                user_message=user_msg,
                temperature=temperature,
            )

    # ------------------------------------------------------------------
    # API de alto nivel
    # ------------------------------------------------------------------

    async def analyze_structured(
        self,
        prompt: str,
        schema: Type[T],
        task_type: str = TASK_ANALYSIS,
        temperature: float = 0.2,
        context_tokens: int = 0,
        cache: bool = False,
        system_prompt: str | None = None,
    ) -> T:
        """
        Ejecuta una tarea LLM con salida JSON validado contra un Pydantic schema.

        Lanza ValidationError si el modelo no puede parsear la respuesta.
        Lanza RuntimeError si todos los backends estan caidos.
        """
        model = self._select_model(task_type, context_tokens)
        messages = _build_messages(prompt, system_prompt, schema)

        with _tracer.start_as_current_span("llm.analyze_structured") as span:
            span.set_attribute("llm.model", model)
            span.set_attribute("llm.task_type", task_type)
            span.set_attribute("llm.schema", schema.__name__)
            span.set_attribute("llm.context_tokens", context_tokens)

            try:
                raw = await self._complete(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    response_json=True,
                    cache=cache,
                    _task_type=task_type,
                )
            except Exception as exc:
                span.set_attribute("llm.error", str(exc))
                span.record_exception(exc)
                raise

            cleaned = _clean_json_response(raw)

            try:
                result = schema.model_validate_json(cleaned)
                span.set_attribute("llm.retried", False)
                return result
            except (ValidationError, json.JSONDecodeError) as exc:
                # Un reintento con prompt mas explicito
                _slog.warning(
                    "llm_parse_retry",
                    model=model,
                    task_type=task_type,
                    schema=schema.__name__,
                    error=str(exc),
                )
                span.set_attribute("llm.retried", True)
                retry_prompt = (
                    f"{prompt}\n\n"
                    "IMPORTANTE: Responde SOLO con JSON valido que siga exactamente este schema:\n"
                    f"{json.dumps(schema.model_json_schema(), ensure_ascii=False, indent=2)}"
                )
                raw2 = await self._complete(
                    model=model,
                    messages=_build_messages(retry_prompt, system_prompt, schema),
                    temperature=0.0,
                    response_json=True,
                    cache=False,
                    _task_type=task_type,
                )
                cleaned2 = _clean_json_response(raw2)
                return schema.model_validate_json(cleaned2)

    async def classify(
        self,
        text: str,
        schema: Type[T],
        system_prompt: str | None = None,
    ) -> T:
        """Clasificacion rapida (usa electsim-fast, temperatura 0)."""
        return await self.analyze_structured(
            prompt=text,
            schema=schema,
            task_type=TASK_CLASSIFICATION,
            temperature=0.0,
            system_prompt=system_prompt,
        )

    async def summarize(
        self,
        text: str,
        schema: Type[T],
        system_prompt: str | None = None,
    ) -> T:
        """Resumen con output estructurado (usa electsim-fast)."""
        return await self.analyze_structured(
            prompt=text,
            schema=schema,
            task_type=TASK_SUMMARY,
            temperature=0.2,
            system_prompt=system_prompt,
        )

    async def chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        context_tokens: int = 0,
    ) -> str:
        """Chat libre (sin schema). Retorna el string de respuesta."""
        model = self._select_model(TASK_CHAT, context_tokens)
        with _tracer.start_as_current_span("llm.chat") as span:
            span.set_attribute("llm.model", model)
            span.set_attribute("llm.task_type", TASK_CHAT)
            span.set_attribute("llm.context_tokens", context_tokens)
            return await self._complete(
                model=model,
                messages=messages,
                temperature=temperature,
                response_json=False,
                _task_type=TASK_CHAT,
            )

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """
        Genera embeddings para una lista de textos.
        Retorna lista de vectores float.
        """
        # 1. Intentar via LiteLLM
        try:
            from litellm import aembedding
            response = await aembedding(
                model=self._model_embed,
                input=texts,
                api_base=self._base_url,
                api_key=self._api_key,
                timeout=self._timeout,
            )
            return [item["embedding"] for item in response.data]
        except Exception as exc:
            logger.info("LiteLLM embed fallido (%s) — fallback a Ollama", exc)

        # 2. Fallback: Ollama embed directo
        from agents.ollama.ollama_client import OllamaClient
        async with OllamaClient() as ollama:
            return await ollama.embed_lote(texts)

    async def healthcheck(self) -> dict[str, bool]:
        """Comprueba disponibilidad de cada backend."""
        import httpx
        results: dict[str, bool] = {}

        # LiteLLM proxy
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self._base_url}/health")
                results["litellm_proxy"] = resp.status_code < 400
        except Exception:
            results["litellm_proxy"] = False

        # Ollama directo
        from agents.ollama.ollama_client import OllamaClient
        async with OllamaClient() as ollama:
            results["ollama_direct"] = await ollama.healthcheck()

        return results


# ---------------------------------------------------------------------------
# Factory: instancia global lazy
# ---------------------------------------------------------------------------

_client_instance: LLMClient | None = None


def get_llm_client() -> LLMClient:
    """Retorna la instancia global del LLMClient (singleton lazy)."""
    global _client_instance
    if _client_instance is None:
        _client_instance = LLMClient()
    return _client_instance


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _build_messages(
    prompt: str,
    system_prompt: str | None,
    schema: type | None = None,
) -> list[dict[str, str]]:
    """Construye la lista de mensajes para la API de chat."""
    messages: list[dict[str, str]] = []

    sys_parts = []
    if system_prompt:
        sys_parts.append(system_prompt)
    if schema is not None:
        sys_parts.append(
            "Responde EXCLUSIVAMENTE con JSON valido. "
            "No incluyas texto explicativo antes ni despues del JSON."
        )

    if sys_parts:
        messages.append({"role": "system", "content": " ".join(sys_parts)})

    messages.append({"role": "user", "content": prompt})
    return messages
