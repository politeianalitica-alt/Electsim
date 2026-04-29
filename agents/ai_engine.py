"""Motor comun de IA local para Politeia/ElectionSim.

Integra tres piezas operativas:
- embeddings locales para busqueda semantica;
- ChromaDB persistente como memoria vectorial;
- chat/razonamiento local via Ollama.

El modulo esta pensado para ser seguro en produccion local: si Chroma,
Ollama o sentence-transformers no estan disponibles, degrada a busqueda
heuristica/embeddings deterministas sin romper pipelines ni dashboard.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Generator, Iterable

import httpx
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")
DEFAULT_CHROMA_DIR = _ROOT / "data" / "processed" / "chroma_store"
DEFAULT_OLLAMA_URL = "http://localhost:11434"
DEFAULT_OLLAMA_MODEL = os.environ.get("ELECTSIM_OLLAMA_MODEL", "qwen2.5:7b")
DEFAULT_OLLAMA_EMBED_MODEL = "nomic-embed-text"
DEFAULT_ST_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
FALLBACK_OLLAMA_MODELS = ("politeia-brain:latest", "qwen2.5:7b", "llama3.2:3b")


def _env_bool(name: str, default: bool = True) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return str(value).strip().lower() not in {"0", "false", "no", "off"}


def _safe_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _slug(value: str) -> str:
    out = "".join(ch.lower() if ch.isalnum() else "_" for ch in str(value))
    while "__" in out:
        out = out.replace("__", "_")
    return out.strip("_") or "default"


def _stable_hash_embedding(text: str, *, dim: int = 768) -> list[float]:
    """Fallback local determinista cuando no hay backend de embeddings."""
    vector = [0.0] * dim
    tokens = str(text or "").lower().split()
    if not tokens:
        return vector
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8", errors="ignore")).digest()
        idx = int.from_bytes(digest[:4], "big") % dim
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[idx] += sign
    norm = sum(x * x for x in vector) ** 0.5 or 1.0
    return [round(x / norm, 8) for x in vector]


def _match_model_name(candidate: str, available: list[str]) -> str | None:
    candidate = str(candidate or "").strip()
    if not candidate:
        return None
    if candidate in available:
        return candidate
    base = candidate.split(":", 1)[0]
    for model in available:
        if model.split(":", 1)[0] == base:
            return model
    return None


@dataclass(slots=True)
class AIEngineStatus:
    ollama: bool
    model: str
    embedding_backend: str
    embedding_model: str
    chroma: bool
    collection: str
    vector_count: int
    chroma_dir: str


class AIEngine:
    """Motor local reusable desde dashboard, pipelines, scrapers y API."""

    def __init__(
        self,
        *,
        chroma_dir: str | Path | None = None,
        collection_name: str | None = None,
        embedding_backend: str | None = None,
        ollama_model: str | None = None,
    ) -> None:
        self.chroma_dir = Path(chroma_dir or os.environ.get("ELECTSIM_CHROMA_DIR", DEFAULT_CHROMA_DIR)).expanduser()
        if not self.chroma_dir.is_absolute():
            self.chroma_dir = (_ROOT / self.chroma_dir).resolve()
        self.chroma_dir.mkdir(parents=True, exist_ok=True)

        self.ollama_base_url = os.environ.get("OLLAMA_BASE_URL", DEFAULT_OLLAMA_URL).rstrip("/")
        self.ollama_model = ollama_model or os.environ.get("ELECTSIM_OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
        self.ollama_embed_model = os.environ.get("ELECTSIM_OLLAMA_EMBEDDING_MODEL", DEFAULT_OLLAMA_EMBED_MODEL)
        self.st_model_name = os.environ.get("ELECTSIM_ST_EMBED_MODEL", DEFAULT_ST_MODEL)
        self.embedding_backend = (embedding_backend or os.environ.get("ELECTSIM_AI_EMBEDDING_BACKEND", "ollama")).strip().lower()
        self.embedding_dim = _safe_int("ELECTSIM_AI_EMBEDDING_DIM", 768)
        default_collection = f"electsim_docs_{_slug(self.embedding_backend)}_{_slug(self.embedding_model_name)}"
        self.collection_name = collection_name or os.environ.get("ELECTSIM_CHROMA_COLLECTION", default_collection)
        self._chroma_client: Any | None = None
        self._collection: Any | None = None
        self._sentence_model: Any | None = None
        self._ollama_models_cache: list[str] | None = None

    @property
    def embedding_model_name(self) -> str:
        if self.embedding_backend in {"sentence-transformers", "sentence_transformers", "st"}:
            return self.st_model_name
        if self.embedding_backend == "ollama":
            return self.ollama_embed_model
        return f"hash-{self.embedding_dim}"

    @property
    def chroma(self) -> Any | None:
        if self._chroma_client is not None:
            return self._chroma_client
        if not _env_bool("ELECTSIM_AI_ENABLE_CHROMA", True):
            return None
        try:
            import chromadb  # type: ignore
            from chromadb.config import Settings  # type: ignore

            self._chroma_client = chromadb.PersistentClient(
                path=str(self.chroma_dir),
                settings=Settings(anonymized_telemetry=False),
            )
        except Exception as exc:
            logger.warning("ChromaDB no disponible; memoria semantica desactivada: %s", exc)
            self._chroma_client = None
        return self._chroma_client

    @property
    def collection(self) -> Any | None:
        if self._collection is not None:
            return self._collection
        chroma = self.chroma
        if chroma is None:
            return None
        try:
            self._collection = chroma.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
        except Exception as exc:
            logger.warning("No se pudo abrir coleccion Chroma %s: %s", self.collection_name, exc)
            self._collection = None
        return self._collection

    def status(self) -> dict[str, Any]:
        collection = self.collection
        vector_count = 0
        if collection is not None:
            try:
                vector_count = int(collection.count())
            except Exception:
                vector_count = 0
        status = AIEngineStatus(
            ollama=self.is_ollama_available(),
            model=self.resolve_ollama_model(),
            embedding_backend=self.embedding_backend,
            embedding_model=self.embedding_model_name,
            chroma=collection is not None,
            collection=self.collection_name,
            vector_count=vector_count,
            chroma_dir=str(self.chroma_dir),
        )
        return {
            "ollama": status.ollama,
            "model": status.model,
            "embedding_backend": status.embedding_backend,
            "embedding_model": status.embedding_model,
            "chroma": status.chroma,
            "collection": status.collection,
            "vector_count": status.vector_count,
            "chroma_dir": status.chroma_dir,
        }

    def is_ollama_available(self) -> bool:
        return bool(self._ollama_model_names())

    def resolve_ollama_model(self, preferred: str | None = None) -> str:
        """Devuelve un modelo instalado si el configurado no existe localmente."""
        requested = str(preferred or self.ollama_model or "").strip()
        candidates = [requested, *FALLBACK_OLLAMA_MODELS]
        available = self._ollama_model_names()
        if not available:
            return requested or DEFAULT_OLLAMA_MODEL
        for candidate in dict.fromkeys(c for c in candidates if c):
            resolved = _match_model_name(candidate, available)
            if resolved:
                return resolved
        return available[0]

    def _ollama_model_names(self) -> list[str]:
        if self._ollama_models_cache:
            return self._ollama_models_cache
        try:
            response = httpx.get(f"{self.ollama_base_url}/api/tags", timeout=2.0)
            response.raise_for_status()
            data = response.json()
            models = []
            for item in data.get("models", []) or []:
                if isinstance(item, dict):
                    name = str(item.get("name") or item.get("model") or "").strip()
                    if name:
                        models.append(name)
            self._ollama_models_cache = models
            return models
        except Exception:
            return []

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        backend = self.embedding_backend
        if backend == "ollama":
            embeddings = self._embed_ollama(texts)
            if embeddings:
                return embeddings
            embeddings = self._embed_sentence_transformers(texts)
            if embeddings:
                return embeddings
        elif backend in {"sentence-transformers", "sentence_transformers", "st"}:
            embeddings = self._embed_sentence_transformers(texts)
            if embeddings:
                return embeddings
            embeddings = self._embed_ollama(texts)
            if embeddings:
                return embeddings
        return [_stable_hash_embedding(text, dim=self.embedding_dim) for text in texts]

    def _embed_ollama(self, texts: list[str]) -> list[list[float]] | None:
        payload = {
            "model": self.ollama_embed_model,
            "input": texts,
            "keep_alive": os.environ.get("ELECTSIM_OLLAMA_KEEP_ALIVE", "30m"),
        }
        try:
            response = httpx.post(f"{self.ollama_base_url}/api/embed", json=payload, timeout=180.0)
            if response.status_code == 404:
                # Compatibilidad con servidores Ollama antiguos.
                out: list[list[float]] = []
                for text in texts:
                    r = httpx.post(
                        f"{self.ollama_base_url}/api/embeddings",
                        json={"model": self.ollama_embed_model, "prompt": text},
                        timeout=180.0,
                    )
                    r.raise_for_status()
                    emb = r.json().get("embedding")
                    if not isinstance(emb, list):
                        return None
                    out.append([float(x) for x in emb])
                return out
            response.raise_for_status()
            data = response.json()
            embeddings = data.get("embeddings")
            if isinstance(embeddings, list) and len(embeddings) == len(texts):
                return [[float(x) for x in emb] for emb in embeddings]
            embedding = data.get("embedding")
            if isinstance(embedding, list) and len(texts) == 1:
                return [[float(x) for x in embedding]]
        except Exception as exc:
            logger.debug("Embeddings Ollama no disponibles: %s", exc)
        return None

    def _embed_sentence_transformers(self, texts: list[str]) -> list[list[float]] | None:
        try:
            if self._sentence_model is None:
                from sentence_transformers import SentenceTransformer  # type: ignore

                self._sentence_model = SentenceTransformer(self.st_model_name)
            embeddings = self._sentence_model.encode(texts, normalize_embeddings=True)
            return embeddings.tolist()
        except Exception as exc:
            logger.debug("Embeddings sentence-transformers no disponibles: %s", exc)
            return None

    def upsert_documents(self, docs: list[dict[str, Any]]) -> int:
        collection = self.collection
        if collection is None or not docs:
            return 0
        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict[str, Any]] = []
        for doc in docs:
            doc_id = str(doc.get("id") or hashlib.sha256(json.dumps(doc, sort_keys=True, default=str).encode()).hexdigest()[:24])
            text = self._document_text(doc)
            if not text:
                continue
            ids.append(doc_id)
            documents.append(text[:3000])
            metadatas.append(self._metadata(doc))
        if not ids:
            return 0
        embeddings = self.embed(documents)
        inserted = 0
        for start in range(0, len(ids), 100):
            end = start + 100
            collection.upsert(
                ids=ids[start:end],
                embeddings=embeddings[start:end],
                documents=documents[start:end],
                metadatas=metadatas[start:end],
            )
            inserted += len(ids[start:end])
        return inserted

    def semantic_search(self, query: str, *, k: int = 8, domain: str | None = None) -> list[dict[str, Any]]:
        collection = self.collection
        if collection is None:
            return []
        try:
            count = int(collection.count())
        except Exception:
            count = 0
        if count <= 0:
            return []
        query_embedding = self.embed([query])[0]
        domain_filter = str(domain or "").strip()
        where = {"domain": domain_filter} if domain_filter else None
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=max(1, min(int(k), count)),
            where=where,
            include=["documents", "metadatas", "distances"],
        )
        out: list[dict[str, Any]] = []
        ids = (results.get("ids") or [[]])[0]
        documents = (results.get("documents") or [[]])[0]
        metadatas = (results.get("metadatas") or [[]])[0]
        distances = (results.get("distances") or [[]])[0]
        for doc_id, document, metadata, distance in zip(ids, documents, metadatas, distances):
            score = 1.0 - float(distance)
            out.append(
                {
                    "id": doc_id,
                    "score": round(score, 4),
                    "source": metadata.get("source"),
                    "title": metadata.get("title"),
                    "summary": metadata.get("summary") or str(document)[:360],
                    "snippet": str(document)[:500],
                    "url": metadata.get("url"),
                    "published_at": metadata.get("published_at"),
                    "domain": metadata.get("domain"),
                    "topics": _loads_list(metadata.get("topics")),
                    "semantic": True,
                }
            )
        return out

    def ollama_chat_stream(
        self,
        system: str,
        user: str,
        *,
        model: str | None = None,
        temperature: float = 0.25,
        max_tokens: int | None = None,
    ) -> Generator[str, None, None]:
        payload = {
            "model": self.resolve_ollama_model(model),
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": True,
            "keep_alive": os.environ.get("ELECTSIM_OLLAMA_KEEP_ALIVE", "30m"),
            "options": {
                "temperature": temperature,
                "num_ctx": _safe_int("ELECTSIM_OLLAMA_NUM_CTX", 8192),
                "num_predict": int(max_tokens or os.environ.get("ELECTSIM_BACK_MANAGER_MAX_TOKENS", 700)),
            },
        }
        try:
            with httpx.stream("POST", f"{self.ollama_base_url}/api/chat", json=payload, timeout=240.0) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line:
                        continue
                    chunk = json.loads(line)
                    token = str((chunk.get("message") or {}).get("content") or "")
                    if token:
                        yield token
                    if chunk.get("done"):
                        break
        except Exception as exc:
            yield f"Ollama no esta disponible o no pudo responder: {exc}"

    def ollama_chat(
        self,
        system: str,
        user: str,
        *,
        model: str | None = None,
        temperature: float = 0.25,
        max_tokens: int | None = None,
    ) -> str:
        return "".join(self.ollama_chat_stream(system, user, model=model, temperature=temperature, max_tokens=max_tokens)).strip()

    def reason_dashboard(self, context_data: dict[str, Any], insight_type: str = "general") -> str:
        prompts = {
            "electoral": "Analiza tendencias electorales, momentum de partidos, riesgos de coalicion y senales de cambio.",
            "economic": "Evalua indicadores economicos y su impacto electoral potencial.",
            "media": "Analiza narrativas mediaticas, asimetrias entre partidos y focos de riesgo reputacional.",
            "risk": "Evalua riesgos politicos y escenarios probables a corto plazo.",
            "pipeline": "Evalua el resultado de un pipeline: calidad, fallos, decisiones y siguiente accion operativa.",
            "general": "Analiza estos datos del dashboard y extrae decisiones operativas.",
        }
        system = (
            "Eres Politeia Brain, analista politico y gerente local del backend. "
            "Responde en espanol con hechos, inferencias y acciones. No inventes datos."
        )
        data = json.dumps(context_data, ensure_ascii=False, default=str)[:5000]
        user = f"{prompts.get(insight_type, prompts['general'])}\n\nDatos:\n{data}"
        if not self.is_ollama_available():
            return ""
        return self.ollama_chat(system, user, temperature=0.2, max_tokens=500)

    def _document_text(self, doc: dict[str, Any]) -> str:
        parts = [
            str(doc.get("title") or ""),
            str(doc.get("summary") or ""),
            str(doc.get("text") or "")[:2500],
            " ".join(str(x) for x in (doc.get("topics") or [])),
            " ".join(str(x) for x in (doc.get("keywords") or [])),
        ]
        return " ".join(part for part in parts if part).strip()

    def _metadata(self, doc: dict[str, Any]) -> dict[str, Any]:
        topics = doc.get("topics") or []
        sentiment = doc.get("sentiment") or doc.get("ai_sentiment") or {}
        return {
            "source": str(doc.get("source") or ""),
            "domain": str(doc.get("domain") or ""),
            "published_at": str(doc.get("published_at") or ""),
            "url": str(doc.get("url") or ""),
            "title": str(doc.get("title") or "")[:300],
            "summary": str(doc.get("summary") or "")[:700],
            "topics": json.dumps(topics, ensure_ascii=False, default=str)[:1000],
            "sentiment": json.dumps(sentiment, ensure_ascii=False, default=str)[:800],
            "indexed_at": str(doc.get("ingested_at") or int(time.time())),
        }


def _loads_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(x) for x in value]
    if not value:
        return []
    try:
        parsed = json.loads(str(value))
        if isinstance(parsed, list):
            return [str(x) for x in parsed]
    except Exception:
        pass
    return []


@lru_cache(maxsize=1)
def get_ai_engine() -> AIEngine:
    return AIEngine()


def upsert_documents(docs: Iterable[dict[str, Any]]) -> int:
    return get_ai_engine().upsert_documents(list(docs))
