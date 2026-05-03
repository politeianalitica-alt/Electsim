"""
Almacen de embeddings para resolucion de entidades (Bloque 2).

Usa sentence-transformers (paraphrase-multilingual-mpnet-base-v2) para
representar cada entidad canonical y cada mencion de entrada como vectores
de 768 dimensiones. La similitud coseno entre mencion y candidatos determina
el ranking.

El indice se construye una vez al inicio del pipeline (load_index)
y se reutiliza en todos los batches de resolucion.

Persistencia:
  - Los embeddings se almacenan en entities_canonical.embedding (JSONB array)
  - En memoria se mantiene una matriz numpy para busqueda rapida
"""
from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from typing import Optional

import numpy as np

from .models import Candidate

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Modelo de embeddings
# ---------------------------------------------------------------------------

_MODEL_NAME = "paraphrase-multilingual-mpnet-base-v2"


@lru_cache(maxsize=1)
def _load_model():
    """Carga el modelo sentence-transformers (singleton)."""
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        model = SentenceTransformer(_MODEL_NAME)
        log.info("SentenceTransformer cargado: %s", _MODEL_NAME)
        return model
    except ImportError:
        log.warning("sentence-transformers no disponible; embedding desactivado")
        return None
    except Exception as exc:
        log.warning("Error cargando SentenceTransformer: %s", exc)
        return None


def embed(texts: list[str]) -> Optional[np.ndarray]:
    """
    Genera embeddings para una lista de textos.

    Returns:
      Matriz numpy (N, 768) o None si el modelo no esta disponible.
    """
    model = _load_model()
    if model is None:
        return None
    try:
        vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return np.array(vecs, dtype=np.float32)
    except Exception as exc:
        log.warning("Error generando embeddings: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Indice en memoria
# ---------------------------------------------------------------------------

class EmbeddingIndex:
    """
    Indice de embeddings de entidades canonicas.

    Se carga desde la BD (entities_canonical.embedding)
    y permite busqueda por similitud coseno.
    """

    def __init__(self) -> None:
        self._qids:   list[str] = []
        self._names:  list[str] = []
        self._tipos:  list[str] = []
        self._matrix: Optional[np.ndarray] = None  # (N, 768)

    def load_from_db(self) -> int:
        """
        Carga embeddings desde entities_canonical.
        Si una entidad no tiene embedding, genera uno a partir del nombre_oficial.

        Returns:
          Numero de entidades en el indice.
        """
        import psycopg  # type: ignore
        url = os.environ.get("DATABASE_URL", "")
        rows = []
        try:
            with psycopg.connect(url) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT qid, nombre_oficial, tipo, embedding
                        FROM entities_canonical
                        WHERE activo = TRUE
                        ORDER BY qid
                        """
                    )
                    rows = cur.fetchall()
        except Exception as exc:
            log.error("Error cargando entidades para embedding: %s", exc)
            return 0

        qids, names, tipos, existing_vecs, missing_idx = [], [], [], [], []
        for i, row in enumerate(rows):
            qid, nombre, tipo, emb_json = row
            qids.append(qid)
            names.append(nombre)
            tipos.append(tipo)
            if emb_json:
                try:
                    vec = np.array(emb_json, dtype=np.float32)
                    existing_vecs.append((i, vec))
                except Exception:
                    missing_idx.append(i)
            else:
                missing_idx.append(i)

        # Generar embeddings faltantes
        if missing_idx:
            texts_to_embed = [names[i] for i in missing_idx]
            new_vecs = embed(texts_to_embed)
            if new_vecs is not None:
                for j, i in enumerate(missing_idx):
                    existing_vecs.append((i, new_vecs[j]))
                # Persistir en BD los nuevos embeddings
                self._persist_embeddings(
                    [(qids[i], new_vecs[j].tolist()) for j, i in enumerate(missing_idx)]
                )

        if not existing_vecs:
            log.warning("EmbeddingIndex: ningun embedding disponible")
            return 0

        # Construir matriz ordenada por indice original
        existing_vecs.sort(key=lambda x: x[0])
        valid_indices = [i for i, _ in existing_vecs]
        matrix = np.stack([v for _, v in existing_vecs])

        self._qids   = [qids[i]  for i in valid_indices]
        self._names  = [names[i] for i in valid_indices]
        self._tipos  = [tipos[i] for i in valid_indices]
        self._matrix = matrix

        log.info("EmbeddingIndex: %d entidades indexadas", len(self._qids))
        return len(self._qids)

    def _persist_embeddings(self, pairs: list[tuple[str, list]]) -> None:
        """Guarda embeddings generados en entities_canonical.embedding."""
        import psycopg  # type: ignore
        url = os.environ.get("DATABASE_URL", "")
        try:
            with psycopg.connect(url) as conn:
                with conn.cursor() as cur:
                    for qid, vec in pairs:
                        cur.execute(
                            "UPDATE entities_canonical SET embedding = %s WHERE qid = %s",
                            (json.dumps(vec), qid),
                        )
        except Exception as exc:
            log.warning("Error persistiendo embeddings: %s", exc)

    def search(
        self,
        surface_norm: str,
        context: str = "",
        top_k: int = 5,
        min_score: float = 0.50,
    ) -> list[Candidate]:
        """
        Busca las top_k entidades mas similares a la mencion.

        Texto de consulta: surface_norm + " " + context[:200]
        para dar mas informacion al modelo.
        """
        if self._matrix is None or len(self._qids) == 0:
            return []

        query_text = f"{surface_norm} {context[:200]}".strip()
        query_vec = embed([query_text])
        if query_vec is None:
            return []

        # Similitud coseno (vectores ya normalizados)
        scores = (self._matrix @ query_vec[0]).tolist()

        # Ranking
        ranked = sorted(
            zip(self._qids, self._names, self._tipos, scores),
            key=lambda x: x[3],
            reverse=True,
        )

        candidates = []
        for qid, nombre, tipo, score in ranked[:top_k]:
            if score < min_score:
                break
            candidates.append(
                Candidate(
                    qid=qid,
                    nombre_oficial=nombre,
                    tipo=tipo,
                    score=float(score),
                )
            )
        return candidates

    @property
    def ready(self) -> bool:
        return self._matrix is not None and len(self._qids) > 0


# ---------------------------------------------------------------------------
# Singleton de indice
# ---------------------------------------------------------------------------

_index: Optional[EmbeddingIndex] = None


def get_index() -> EmbeddingIndex:
    """Devuelve el indice global, creandolo si no existe."""
    global _index
    if _index is None:
        _index = EmbeddingIndex()
    return _index


def load_index() -> int:
    """Carga o recarga el indice desde BD."""
    idx = get_index()
    return idx.load_from_db()
