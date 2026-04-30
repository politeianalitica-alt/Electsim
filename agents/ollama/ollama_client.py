"""
Ollama Client — Cliente asincrono para servidor Ollama local.

Endpoint: http://localhost:11434/v1 (OpenAI-compatible API)

Modelos configurados:
  - qwen3:8b         — resumenes (produce <think>...</think> que se eliminan)
  - llama3.2:3b      — extraccion de entidades (JSON structured output)
  - nomic-embed-text — embeddings 768d
  - gemma3:12b       — analisis profundo / briefings automaticos

Retry automatico con backoff exponencial.
Healthcheck antes de cada operacion critica.

Sin emojis. Compatible con git amigos.
"""
from __future__ import annotations

import asyncio
import functools
import json
import logging
import os
import re
import time
from typing import Any, Callable

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "120"))
OLLAMA_MAX_RETRIES = int(os.getenv("OLLAMA_MAX_RETRIES", "3"))

MODEL_RESUMEN    = os.getenv("OLLAMA_MODEL_RESUMEN",    "qwen3:8b")
MODEL_ENTIDADES  = os.getenv("OLLAMA_MODEL_ENTIDADES",  "llama3.2:3b")
MODEL_EMBED      = os.getenv("OLLAMA_MODEL_EMBED",      "nomic-embed-text")
MODEL_ANALISIS   = os.getenv("OLLAMA_MODEL_ANALISIS",   "gemma3:12b")

# Regex para eliminar bloques de razonamiento de qwen3
_RE_THINK = re.compile(r"<think>.*?</think>", re.DOTALL)

# ---------------------------------------------------------------------------
# Decorador de retry con backoff exponencial
# ---------------------------------------------------------------------------

def retry_async(max_retries: int = 3, base_delay: float = 1.0) -> Callable:
    """Decorador que reintenta una corutina con backoff exponencial."""
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exc: Exception | None = None
            for attempt in range(max_retries):
                try:
                    return await fn(*args, **kwargs)
                except Exception as exc:
                    last_exc = exc
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)
                        logger.debug("retry_async %s attempt %d/%d: %s — esperando %.1fs",
                                     fn.__name__, attempt + 1, max_retries, exc, delay)
                        await asyncio.sleep(delay)
            logger.warning("%s agotados %d reintentos: %s", fn.__name__, max_retries, last_exc)
            raise last_exc  # type: ignore[misc]
        return wrapper
    return decorator


# ---------------------------------------------------------------------------
# Cliente
# ---------------------------------------------------------------------------

class OllamaClient:
    """
    Cliente asincrono para Ollama en localhost.

    Uso:
        async with OllamaClient() as client:
            resumen = await client.resumir_noticia(texto)
            entidades = await client.extraer_entidades(texto)
            emb = await client.embed(texto)
    """

    def __init__(self, base_url: str = OLLAMA_BASE_URL) -> None:
        self._base_url = base_url.rstrip("/")
        self._session: Any = None

    async def __aenter__(self) -> "OllamaClient":
        try:
            import httpx
            self._session = httpx.AsyncClient(
                timeout=OLLAMA_TIMEOUT,
                follow_redirects=True,
            )
        except ImportError:
            logger.warning("httpx no instalado — OllamaClient degradado")
        return self

    async def __aexit__(self, *args: Any) -> None:
        if self._session:
            await self._session.aclose()

    # ------------------------------------------------------------------
    # Healthcheck
    # ------------------------------------------------------------------

    async def healthcheck(self) -> bool:
        """Verifica que el servidor Ollama esta disponible."""
        if not self._session:
            return False
        try:
            resp = await self._session.get(f"{self._base_url}/api/tags", timeout=5.0)
            return resp.status_code == 200
        except Exception:
            return False

    # ------------------------------------------------------------------
    # API de chat (OpenAI-compatible)
    # ------------------------------------------------------------------

    async def _chat(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.3,
        response_format: dict | None = None,
    ) -> str:
        """Llamada base a la API de chat de Ollama."""
        if not self._session:
            return ""

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": False,
        }
        if response_format:
            payload["response_format"] = response_format

        resp = await self._session.post(
            f"{self._base_url}/v1/chat/completions",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return str(content)

    # ------------------------------------------------------------------
    # Resumen de noticia (qwen3:8b)
    # ------------------------------------------------------------------

    @retry_async(max_retries=OLLAMA_MAX_RETRIES)
    async def resumir_noticia(
        self,
        texto: str,
        max_palabras: int = 80,
        idioma: str = "es",
    ) -> str:
        """
        Resume una noticia en max_palabras palabras.
        Elimina bloques <think>...</think> del output de qwen3.
        """
        if not texto or not texto.strip():
            return ""

        prompt = (
            f"Resume la siguiente noticia en maximo {max_palabras} palabras en {idioma}. "
            f"Solo el resumen, sin introduccion ni comentarios.\n\nNoticia:\n{texto[:3000]}"
        )
        raw = await self._chat(
            model=MODEL_RESUMEN,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        # Eliminar razonamiento interno de qwen3
        limpio = _RE_THINK.sub("", raw).strip()
        return limpio[:max_palabras * 6]  # Limite de seguridad por caracteres

    # ------------------------------------------------------------------
    # Extraccion de entidades (llama3.2:3b, JSON)
    # ------------------------------------------------------------------

    @retry_async(max_retries=OLLAMA_MAX_RETRIES)
    async def extraer_entidades(self, texto: str) -> dict:
        """
        Extrae entidades nombradas del texto.
        Retorna {personas: [...], organizaciones: [...], lugares: [...], temas: [...]}.
        """
        if not texto or not texto.strip():
            return {"personas": [], "organizaciones": [], "lugares": [], "temas": []}

        prompt = (
            "Extrae entidades del siguiente texto en espanol. "
            "Responde SOLO con JSON valido con las claves: "
            "'personas' (lista de nombres de personas), "
            "'organizaciones' (lista de organizaciones/partidos), "
            "'lugares' (lista de lugares/paises), "
            "'temas' (lista de temas/keywords). "
            "Maximo 10 elementos por lista.\n\n"
            f"Texto:\n{texto[:2000]}"
        )

        raw = await self._chat(
            model=MODEL_ENTIDADES,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            response_format={"type": "json_object"},
        )

        limpio = _RE_THINK.sub("", raw).strip()
        return self._parsear_json_entidades(limpio)

    def _parsear_json_entidades(self, texto: str) -> dict:
        """Parsea JSON de entidades con fallback robusto."""
        default = {"personas": [], "organizaciones": [], "lugares": [], "temas": []}
        if not texto:
            return default

        # Intentar parse directo
        try:
            data = json.loads(texto)
            return {
                "personas": [str(p)[:100] for p in data.get("personas", [])[:10]],
                "organizaciones": [str(o)[:100] for o in data.get("organizaciones", [])[:10]],
                "lugares": [str(l)[:100] for l in data.get("lugares", [])[:10]],
                "temas": [str(t)[:100] for t in data.get("temas", [])[:10]],
            }
        except json.JSONDecodeError:
            pass

        # Intentar extraer JSON del texto con regex
        m = re.search(r"\{.*?\}", texto, re.DOTALL)
        if m:
            try:
                data = json.loads(m.group(0))
                return {
                    "personas": [str(p)[:100] for p in data.get("personas", [])[:10]],
                    "organizaciones": [str(o)[:100] for o in data.get("organizaciones", [])[:10]],
                    "lugares": [str(l)[:100] for l in data.get("lugares", [])[:10]],
                    "temas": [str(t)[:100] for t in data.get("temas", [])[:10]],
                }
            except json.JSONDecodeError:
                pass

        logger.debug("extraer_entidades: JSON no parseado: %s...", texto[:100])
        return default

    # ------------------------------------------------------------------
    # Embeddings (nomic-embed-text)
    # ------------------------------------------------------------------

    @retry_async(max_retries=OLLAMA_MAX_RETRIES)
    async def embed(self, texto: str) -> list[float]:
        """
        Genera embedding 768d para un texto.
        Usa la API de embeddings de Ollama (/api/embed).
        """
        if not self._session or not texto:
            return []

        try:
            resp = await self._session.post(
                f"{self._base_url}/api/embed",
                json={"model": MODEL_EMBED, "input": texto[:8192]},
            )
            resp.raise_for_status()
            data = resp.json()
            embeddings = data.get("embeddings", [[]])
            if embeddings and isinstance(embeddings[0], list):
                return [float(x) for x in embeddings[0]]
            return [float(x) for x in embeddings]
        except Exception as exc:
            logger.debug("embed error: %s", exc)
            return []

    async def embed_lote(
        self,
        textos: list[str],
        max_concurrente: int = 4,
    ) -> list[list[float]]:
        """Genera embeddings para un lote de textos (concurrencia limitada)."""
        sem = asyncio.Semaphore(max_concurrente)

        async def _embed_uno(texto: str) -> list[float]:
            async with sem:
                return await self.embed(texto)

        resultados = await asyncio.gather(
            *[_embed_uno(t) for t in textos],
            return_exceptions=True,
        )
        return [
            res if isinstance(res, list) else []
            for res in resultados
        ]

    # ------------------------------------------------------------------
    # Analisis profundo (gemma3:12b)
    # ------------------------------------------------------------------

    @retry_async(max_retries=2)
    async def chat_con_contexto(
        self,
        system_prompt: str,
        user_message: str,
        context_docs: list[str] | None = None,
        model: str | None = None,
        temperature: float = 0.4,
    ) -> str:
        """
        Chat general con contexto RAG opciones.
        Usado para briefings y preguntas sobre actores.
        """
        modelo = model or MODEL_ANALISIS
        messages: list[dict] = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        # Construir mensaje con contexto
        contenido = user_message
        if context_docs:
            contexto_str = "\n\n---\n\n".join(context_docs[:5])
            contenido = f"Contexto relevante:\n{contexto_str}\n\nPregunta: {user_message}"

        messages.append({"role": "user", "content": contenido})

        raw = await self._chat(model=modelo, messages=messages, temperature=temperature)
        limpio = _RE_THINK.sub("", raw).strip()
        return limpio

    # ------------------------------------------------------------------
    # Briefing automatico (gemma3:12b)
    # ------------------------------------------------------------------

    @retry_async(max_retries=2)
    async def generar_briefing_actor(
        self,
        nombre_actor: str,
        noticias_recientes: list[str],
        perfil_base: str = "",
    ) -> str:
        """
        Genera un briefing automatico sobre un actor politico.
        Activado cuando el actor aparece en >10 noticias en 24h.
        """
        n = len(noticias_recientes)
        noticias_str = "\n".join(f"- {n}" for n in noticias_recientes[:20])

        prompt = (
            f"Eres un analista politico experto en politica espanola. "
            f"Genera un briefing conciso (maximo 300 palabras) sobre {nombre_actor} "
            f"basado en las siguientes {n} noticias recientes.\n\n"
            f"Perfil base: {perfil_base[:500] if perfil_base else 'No disponible'}\n\n"
            f"Noticias recientes:\n{noticias_str}\n\n"
            f"El briefing debe incluir: situacion actual, temas dominantes, "
            f"tono mediático y relevancia politica."
        )

        raw = await self._chat(
            model=MODEL_ANALISIS,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        limpio = _RE_THINK.sub("", raw).strip()
        return limpio[:3000]

    # ------------------------------------------------------------------
    # Info del servidor
    # ------------------------------------------------------------------

    async def listar_modelos(self) -> list[str]:
        """Lista los modelos disponibles en el servidor Ollama."""
        if not self._session:
            return []
        try:
            resp = await self._session.get(f"{self._base_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            return [m["name"] for m in data.get("models", [])]
        except Exception as exc:
            logger.debug("listar_modelos error: %s", exc)
            return []


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio as _asyncio

    async def _demo() -> None:
        async with OllamaClient() as client:
            ok = await client.healthcheck()
            print(f"Ollama disponible: {ok}")
            if ok:
                modelos = await client.listar_modelos()
                print(f"Modelos: {modelos}")
                resumen = await client.resumir_noticia(
                    "El presidente del Gobierno Pedro Sanchez ha anunciado hoy nuevas medidas "
                    "para reducir el deficit presupuestario en 2026 mediante una reforma fiscal.",
                    max_palabras=30,
                )
                print(f"Resumen: {resumen}")

    _asyncio.run(_demo())
