"""
GroqBrain · Cerebro razonador transversal de Politeia.

Facade central que expone 29 herramientas LLM organizadas en 7 bloques:

  Bloque 1 — Ingestion (5 tools)     · IngestionMixin
  Bloque 2 — Analysis (5 tools)      · AnalysisMixin
  Bloque 3 — Forecasting (5 tools)   · ForecastingMixin
  Bloque 4 — Intelligence (5 tools)  · IntelligenceMixin
  Bloque 5 — Content (5 tools)       · ContentMixin
  Bloque 6 — Memory (3 tools)        · MemoryMixin
  Bloque 7 — Orchestrator (1 tool)   · OrchestratorMixin (political_query · ReAct)

Diseño:
  · Usa `OpenAIChatClient` de agents/llm.py (Groq via OpenAI-compat).
  · `_call(prompt_name, variables, response_format)` es el único punto de
    entrada — carga prompt de prompt_templates/, sustituye variables, llama
    al LLM (JSON mode opcional), parsea, captura excepciones y devuelve
    siempre un dict normalizado.
  · Cada tool de cada bloque delega en `_call()` y nunca crashea.
  · Filosofía: si hay datos → Groq interpreta; si hay decisión → Groq razona;
    si hay output → Groq explica. Nunca opaco, siempre auditable.

Uso típico:

    from agents.brain import get_groq_brain
    brain = get_groq_brain()
    out = brain.analyze_sentiment_deep("texto…", actor="Pedro Sánchez")
    if out["ok"]:
        st.json(out["result"])
        st.caption(f"confianza={out['confidence']:.2f} · {out['tokens_used']} tokens")
"""
from __future__ import annotations

import json
import logging
import re
import time
from pathlib import Path
from threading import Lock
from typing import Any

from agents.llm import OpenAIChatClient

logger = logging.getLogger(__name__)

# Ruta a las plantillas de prompts (un .txt por tool)
_PROMPT_DIR = Path(__file__).resolve().parent / "prompt_templates"


# ─────────────────────────────────────────────────────────────────
# Utilidades de parsing
# ─────────────────────────────────────────────────────────────────

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", re.DOTALL)
_FIRST_JSON_RE = re.compile(r"(\{.*\}|\[.*\])", re.DOTALL)


def _extract_json(raw: str) -> Any:
    """Intenta extraer JSON de la respuesta del LLM con varias estrategias.

    1. Parse directo (LLM siguió JSON mode).
    2. Buscar bloque ```json … ```.
    3. Primer { … } o [ … ] del texto.
    Devuelve el objeto Python o None si no se consigue.
    """
    if not raw:
        return None
    text = raw.strip()
    # 1) directo
    try:
        return json.loads(text)
    except (ValueError, TypeError):
        pass
    # 2) fenced
    m = _JSON_FENCE_RE.search(text)
    if m:
        try:
            return json.loads(m.group(1))
        except (ValueError, TypeError):
            pass
    # 3) primer objeto
    m = _FIRST_JSON_RE.search(text)
    if m:
        try:
            return json.loads(m.group(1))
        except (ValueError, TypeError):
            pass
    return None


def _estimate_tokens(text: str) -> int:
    """Estimación rápida de tokens (~4 chars por token sin tiktoken)."""
    if not text:
        return 0
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        return max(1, len(text) // 4)


def _normalize_result(
    *,
    raw: str,
    parsed: Any,
    prompt_name: str,
    model: str,
    latency_ms: int,
    tokens_used: int,
    ok: bool,
    error: str | None = None,
    from_fallback: bool = False,
) -> dict[str, Any]:
    """Forma estándar de respuesta de toda herramienta del brain."""
    result: Any = parsed if parsed is not None else raw
    confidence = 0.0
    sources: list[str] = []
    reasoning_steps: list[str] = []

    if isinstance(parsed, dict):
        # El LLM puede devolver estos campos en su JSON — los promovemos
        try:
            confidence = float(parsed.get("confidence", 0.0) or 0.0)
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))
        srcs = parsed.get("sources") or parsed.get("evidence") or []
        if isinstance(srcs, list):
            sources = [str(x) for x in srcs][:20]
        rs = parsed.get("reasoning_steps") or parsed.get("reasoning") or []
        if isinstance(rs, list):
            reasoning_steps = [str(x) for x in rs][:15]
        elif isinstance(rs, str):
            reasoning_steps = [rs]

    return {
        "ok": bool(ok),
        "result": result,
        "raw": raw,
        "confidence": confidence,
        "sources": sources,
        "reasoning_steps": reasoning_steps,
        "model": model,
        "tokens_used": int(tokens_used),
        "latency_ms": int(latency_ms),
        "prompt_name": prompt_name,
        "from_fallback": bool(from_fallback),
        "error": error,
    }


# ─────────────────────────────────────────────────────────────────
# Cliente
# ─────────────────────────────────────────────────────────────────

class GroqBrainBase:
    """Base con el método `_call()` que todas las mixins de tools usan."""

    def __init__(
        self,
        client: OpenAIChatClient | None = None,
        *,
        default_temperature: float = 0.3,
        default_max_tokens: int = 4096,
        system_prompt: str | None = None,
    ) -> None:
        self.client = client or OpenAIChatClient()
        self.default_temperature = default_temperature
        self.default_max_tokens = default_max_tokens
        self.system_prompt = system_prompt or (
            "Eres Politeia Brain, un razonador político senior. "
            "Respondes en español, eres objetivo, citas evidencias, "
            "diferencias hechos de opiniones y no inventas datos. "
            "Cuando se te pida JSON, devuelves SOLO JSON válido."
        )

    # ─── carga de prompts ───────────────────────────────────────
    def _load_prompt(self, prompt_name: str) -> str:
        path = _PROMPT_DIR / f"{prompt_name}.txt"
        if not path.exists():
            raise FileNotFoundError(f"Prompt no encontrado: {path}")
        return path.read_text(encoding="utf-8")

    def _render_prompt(self, template: str, variables: dict[str, Any]) -> str:
        """Substituye {{var}} en la plantilla. Robusto a llaves de JSON ejemplo."""
        out = template
        for key, val in (variables or {}).items():
            placeholder = "{{" + str(key) + "}}"
            if isinstance(val, (dict, list)):
                rendered = json.dumps(val, ensure_ascii=False, indent=2)
            else:
                rendered = str(val) if val is not None else ""
            out = out.replace(placeholder, rendered)
        return out

    # ─── punto de entrada único ─────────────────────────────────
    def _call(
        self,
        prompt_name: str,
        variables: dict[str, Any] | None = None,
        *,
        response_format: str | None = "json_object",
        temperature: float | None = None,
        max_tokens: int | None = None,
        extra_system: str | None = None,
    ) -> dict[str, Any]:
        """Carga prompt, llama LLM, parsea, devuelve dict estándar.

        Nunca lanza excepciones — captura y devuelve `ok=False` + error.
        """
        t0 = time.time()
        model = getattr(self.client, "modelo", "unknown")
        try:
            template = self._load_prompt(prompt_name)
        except FileNotFoundError as e:
            return _normalize_result(
                raw="", parsed=None, prompt_name=prompt_name, model=model,
                latency_ms=int((time.time() - t0) * 1000), tokens_used=0,
                ok=False, error=str(e),
            )

        user_content = self._render_prompt(template, variables or {})
        system = self.system_prompt
        if extra_system:
            system = f"{system}\n\n{extra_system}"

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ]
        kwargs: dict[str, Any] = {
            "temperature": float(temperature if temperature is not None else self.default_temperature),
            "max_tokens": int(max_tokens if max_tokens is not None else self.default_max_tokens),
        }
        if response_format == "json_object":
            kwargs["response_format"] = "json_object"

        try:
            raw = self.client.complete(messages, **kwargs)
        except Exception as e:
            logger.exception("brain._call('%s') falló", prompt_name)
            return _normalize_result(
                raw="", parsed=None, prompt_name=prompt_name, model=model,
                latency_ms=int((time.time() - t0) * 1000), tokens_used=0,
                ok=False, error=f"{type(e).__name__}: {str(e)[:300]}",
            )

        tokens = _estimate_tokens(user_content) + _estimate_tokens(raw)
        latency_ms = int((time.time() - t0) * 1000)

        if response_format == "json_object":
            parsed = _extract_json(raw)
            if parsed is None:
                # Devolvemos el raw como result pero marcamos fallback
                return _normalize_result(
                    raw=raw, parsed=None, prompt_name=prompt_name, model=model,
                    latency_ms=latency_ms, tokens_used=tokens, ok=True,
                    error="json_parse_failed", from_fallback=True,
                )
            return _normalize_result(
                raw=raw, parsed=parsed, prompt_name=prompt_name, model=model,
                latency_ms=latency_ms, tokens_used=tokens, ok=True,
            )

        # Texto libre (briefings, generaciones largas)
        return _normalize_result(
            raw=raw, parsed=raw, prompt_name=prompt_name, model=model,
            latency_ms=latency_ms, tokens_used=tokens, ok=True,
        )


# ─────────────────────────────────────────────────────────────────
# Ensamblaje del GroqBrain final (con todos los bloques)
# ─────────────────────────────────────────────────────────────────

def _build_groq_brain_class():
    """Importa todos los mixins y construye la clase final.

    Hacemos esto en función para evitar imports circulares al cargar
    el paquete `agents.brain` (los mixins importan GroqBrainBase).
    """
    from agents.brain.ingestion import IngestionMixin
    from agents.brain.analysis import AnalysisMixin
    from agents.brain.forecasting import ForecastingMixin
    from agents.brain.intelligence import IntelligenceMixin
    from agents.brain.content import ContentMixin
    from agents.brain.memory_tools import MemoryToolsMixin
    from agents.brain.orchestrator import OrchestratorMixin

    class GroqBrain(
        IngestionMixin,
        AnalysisMixin,
        ForecastingMixin,
        IntelligenceMixin,
        ContentMixin,
        MemoryToolsMixin,
        OrchestratorMixin,
        GroqBrainBase,
    ):
        """Cerebro razonador transversal — 29 tools sobre Groq/LLaMA 3.3 70B."""
        pass

    return GroqBrain


# Singleton
_BRAIN_LOCK = Lock()
_BRAIN_INSTANCE = None


def get_groq_brain():
    """Devuelve la instancia singleton de GroqBrain (lazy)."""
    global _BRAIN_INSTANCE
    if _BRAIN_INSTANCE is None:
        with _BRAIN_LOCK:
            if _BRAIN_INSTANCE is None:
                klass = _build_groq_brain_class()
                _BRAIN_INSTANCE = klass()
    return _BRAIN_INSTANCE


def reset_groq_brain() -> None:
    """Reinicia el singleton (útil para tests)."""
    global _BRAIN_INSTANCE
    with _BRAIN_LOCK:
        _BRAIN_INSTANCE = None
