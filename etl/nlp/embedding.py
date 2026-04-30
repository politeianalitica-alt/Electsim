"""
Generacion de embeddings para el pipeline event-driven.

Prioridad:
  1. OllamaClient (nomic-embed-text, 768d) — produccion
  2. SentenceTransformer paraphrase-multilingual-MiniLM-L12-v2 — fallback local
  3. Hash deterministico simple — fallback sin dependencias (solo para tests)

Retorna dict {"embedding": List[float], "dim": int, "model_name": str}
"""
from __future__ import annotations

import hashlib
import logging
import math
from typing import Any

logger = logging.getLogger(__name__)

_sbert_model: Any = None
_NOMIC_DIM = 768
_SBERT_DIM = 384


def embed_text(text: str) -> dict | None:
    """
    Genera embedding para el texto.

    Retorna None si ningun backend esta disponible (no detiene el pipeline).
    """
    if not text or not text.strip():
        return None

    # 1. Ollama (async no disponible aqui — usamos httpx sync si procede)
    result = _embed_with_ollama_sync(text)
    if result:
        return result

    # 2. SentenceTransformer local
    result = _embed_with_sbert(text)
    if result:
        return result

    # 3. Fallback hash (solo para tests / entornos sin modelos)
    return _embed_with_hash(text)


async def embed_text_async(text: str) -> dict | None:
    """Version async: intenta primero OllamaClient real, luego sync fallbacks."""
    if not text or not text.strip():
        return None

    try:
        from agents.ollama.ollama_client import OllamaClient
        client = OllamaClient()
        vector = await client.embed(text)
        if vector and len(vector) > 0:
            return {
                "embedding": vector,
                "dim": len(vector),
                "model_name": "nomic-embed-text",
            }
    except Exception as exc:
        logger.debug("Ollama embed async fallido: %s", exc)

    # Fallback sync
    result = _embed_with_sbert(text)
    return result or _embed_with_hash(text)


def _embed_with_ollama_sync(text: str) -> dict | None:
    """Llama a Ollama /api/embeddings de forma sincrona via httpx."""
    try:
        import httpx
        from config.settings import get_settings
        settings = get_settings()
        resp = httpx.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text[:2000]},
            timeout=15.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            vec = data.get("embedding", [])
            if vec:
                return {"embedding": vec, "dim": len(vec), "model_name": "nomic-embed-text"}
    except Exception as exc:
        logger.debug("Ollama sync embed fallido: %s", exc)
    return None


def _embed_with_sbert(text: str) -> dict | None:
    global _sbert_model
    try:
        if _sbert_model is None:
            from sentence_transformers import SentenceTransformer
            _sbert_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
            logger.info("SentenceTransformer MiniLM cargado")
        vec = _sbert_model.encode(text[:512]).tolist()
        return {"embedding": vec, "dim": len(vec), "model_name": "paraphrase-multilingual-MiniLM-L12-v2"}
    except Exception as exc:
        logger.debug("SentenceTransformer fallido: %s", exc)
    return None


def _embed_with_hash(text: str) -> dict:
    """
    Fallback deterministico: vector unitario de 64 dims derivado del sha256 del texto.
    Util para tests y desarrollo sin modelos.
    """
    digest = hashlib.sha256(text.encode()).digest()
    # Convierte bytes a floats en [-1, 1]
    raw = [(b / 127.5) - 1.0 for b in digest]
    # Normaliza a vector unitario
    norm = math.sqrt(sum(x * x for x in raw)) or 1.0
    vec = [round(x / norm, 6) for x in raw]
    return {"embedding": vec, "dim": len(vec), "model_name": "hash-fallback"}
