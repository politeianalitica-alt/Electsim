"""
Capa 3 — NLP processor for `noticias_prensa`.

DESIGN PRINCIPLE: every heavy library import is OPTIONAL. If transformers /
torch / sentence-transformers / bertopic are missing, every function returns
silently (no error, no exception). This makes the module safe to deploy in
serverless contexts (Vercel) where these libs would be too heavy.

Recommended setup for the backend host (Railway / EC2 / local):
    pip install transformers torch sentence-transformers bertopic scikit-learn

Without these installed, run_nlp_pipeline() simply skips and marks
`nlp_procesado=TRUE` with a "lib_missing" sentinel so the row isn't
retried infinitely.

Public API:
    - run_nlp_pipeline(batch_size=50) -> dict
    - run_topic_clustering(n_articles=500) -> dict
    - nlp_available() -> bool
"""
from __future__ import annotations

import json
import logging
import re
import threading
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ── Optional heavy imports ────────────────────────────────────────────────

_HAS_TRANSFORMERS = False
_HAS_SENT_TRANS = False
_HAS_BERTOPIC = False

try:
    import torch  # noqa: F401
    import transformers  # noqa: F401
    _HAS_TRANSFORMERS = True
except Exception:
    pass

try:
    import sentence_transformers  # noqa: F401
    _HAS_SENT_TRANS = True
except Exception:
    pass

try:
    import bertopic  # noqa: F401
    _HAS_BERTOPIC = True
except Exception:
    pass


def nlp_available() -> dict:
    return {
        "transformers": _HAS_TRANSFORMERS,
        "sentence_transformers": _HAS_SENT_TRANS,
        "bertopic": _HAS_BERTOPIC,
    }


# ── Model registry (lazy + thread-safe) ───────────────────────────────────

class _Registry:
    _instances: dict[str, Any] = {}
    _lock = threading.Lock()

    def get(self, key: str, loader) -> Any:
        if key in self._instances:
            return self._instances[key]
        with self._lock:
            if key not in self._instances:
                try:
                    self._instances[key] = loader()
                except Exception as exc:
                    logger.warning("Failed loading NLP model %s: %s", key, exc)
                    self._instances[key] = None
            return self._instances[key]


_registry = _Registry()


def _load_sentiment_es():
    if not _HAS_TRANSFORMERS:
        return None
    from transformers import pipeline
    return pipeline(
        "text-classification",
        model="finiteautomata/beto-sentiment-analysis",
        device=-1, truncation=True, max_length=512,
    )


def _load_sentiment_multi():
    if not _HAS_TRANSFORMERS:
        return None
    from transformers import pipeline
    return pipeline(
        "text-classification",
        model="lxyuan/distilbert-base-multilingual-cased-sentiments-student",
        device=-1, truncation=True, max_length=512,
    )


def _load_ner():
    if not _HAS_TRANSFORMERS:
        return None
    from transformers import pipeline
    return pipeline(
        "ner", model="mrm8488/bert-spanish-cased-finetuned-ner",
        aggregation_strategy="simple",
        device=-1, truncation=True, max_length=512,
    )


def _load_embedder():
    if not _HAS_SENT_TRANS:
        return None
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")


# ── Sentiment ──────────────────────────────────────────────────────────────

_SENT_SCORE = {"POS": 1.0, "NEG": -1.0, "NEU": 0.0,
               "positive": 1.0, "negative": -1.0, "neutral": 0.0}
_SENT_LABEL = {"POS": "positivo", "NEG": "negativo", "NEU": "neutro",
               "positive": "positivo", "negative": "negativo", "neutral": "neutro"}


def _run_sentiment(text: str, idioma: str) -> tuple[float, str]:
    if not text or len(text.strip()) < 10:
        return 0.0, "neutro"
    pipe = _registry.get(
        "sentiment_es" if idioma == "es" else "sentiment_multi",
        _load_sentiment_es if idioma == "es" else _load_sentiment_multi,
    )
    if pipe is None:
        return 0.0, "neutro"
    try:
        result = pipe(text[:512])[0]
        label = result.get("label", "NEU")
        conf = float(result.get("score", 0))
        return round(_SENT_SCORE.get(label, 0.0) * conf, 4), _SENT_LABEL.get(label, "neutro")
    except Exception as exc:
        logger.debug("sentiment err: %s", exc)
        return 0.0, "neutro"


# ── NER ────────────────────────────────────────────────────────────────────

_NER_TYPES = {"PER", "ORG", "LOC", "MISC"}
_NER_BLOCKLIST = {"españa", "spain", "europa", "ue", "estado"}


def _run_ner(titulo: str, resumen: str) -> dict:
    pipe = _registry.get("ner", _load_ner)
    if pipe is None:
        return {}
    combined = f"{titulo}. {resumen or ''}"[:512].strip()
    if not combined:
        return {}
    try:
        raw = pipe(combined)
    except Exception as exc:
        logger.debug("ner err: %s", exc)
        return {}
    grouped: dict[str, list[dict]] = {}
    seen: set[str] = set()
    for ent in raw:
        etype = (ent.get("entity_group") or "").upper()
        if etype not in _NER_TYPES:
            continue
        word = (ent.get("word") or "").replace("##", "").strip(" .,;:")
        if len(word) < 2 or word.lower() in _NER_BLOCKLIST:
            continue
        k = word.lower()
        if k in seen:
            continue
        seen.add(k)
        grouped.setdefault(etype, []).append({
            "texto": word, "score": round(float(ent.get("score", 0)), 4),
        })
    for et in grouped:
        grouped[et] = sorted(grouped[et], key=lambda x: -x["score"])[:10]
    return grouped


# ── Embedding ──────────────────────────────────────────────────────────────

def _run_embedding(titulo: str, resumen: str) -> Optional[list[float]]:
    model = _registry.get("embedder", _load_embedder)
    if model is None:
        return None
    text = f"{titulo or ''} {resumen or ''}"[:512]
    try:
        emb = model.encode(text, normalize_embeddings=True)
        return emb.tolist()
    except Exception as exc:
        logger.debug("embedding err: %s", exc)
        return None


# ── DB helpers ────────────────────────────────────────────────────────────

def _engine() -> Any:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


# ── Main NLP pipeline ─────────────────────────────────────────────────────

def run_nlp_pipeline(batch_size: int = 50) -> dict:
    eng = _engine()
    if eng is None:
        return {"processed": 0, "skipped": 0, "errors": 0, "error": "db_unreachable"}
    from sqlalchemy import text as sa_text

    if not (_HAS_TRANSFORMERS or _HAS_SENT_TRANS):
        # Mark a batch as nlp_procesado=TRUE so they're not retried infinitely
        with eng.begin() as c:
            res = c.execute(sa_text("""
                UPDATE noticias_prensa
                SET nlp_procesado = TRUE, fecha_nlp = NOW(),
                    sentiment_label = COALESCE(sentiment_label, 'neutro'),
                    sentiment_score = COALESCE(sentiment_score, 0)
                WHERE id IN (
                    SELECT id FROM noticias_prensa
                    WHERE procesado = TRUE
                      AND (nlp_procesado IS NULL OR nlp_procesado = FALSE)
                      AND duplicado_de IS NULL
                    LIMIT :n
                )
            """), {"n": batch_size})
        return {
            "processed": 0, "skipped": res.rowcount or 0, "errors": 0,
            "note": "nlp_libs_not_installed; rows marked as processed with neutral defaults",
            "libs": nlp_available(),
        }

    with eng.connect() as c:
        rows = c.execute(sa_text("""
            SELECT id, titulo_clean, resumen_clean, idioma, fuente_id
            FROM noticias_prensa
            WHERE procesado = TRUE
              AND (nlp_procesado IS NULL OR nlp_procesado = FALSE)
              AND duplicado_de IS NULL
              AND titulo_clean IS NOT NULL
            ORDER BY fecha_publicacion DESC NULLS LAST
            LIMIT :n
        """), {"n": batch_size}).fetchall()

    if not rows:
        return {"processed": 0, "skipped": 0, "errors": 0, "libs": nlp_available()}

    processed = errors = 0
    with eng.begin() as c:
        for row in rows:
            try:
                titulo  = row[1] or ""
                resumen = row[2] or ""
                idioma  = row[3] or "es"
                full    = f"{titulo}. {resumen}"
                score, label = _run_sentiment(full, idioma)
                entidades = _run_ner(titulo, resumen)
                embedding = _run_embedding(titulo, resumen)
                c.execute(sa_text("""
                    UPDATE noticias_prensa SET
                        sentiment_score = :s, sentiment_label = :l,
                        entidades       = :ent,
                        embedding       = :emb,
                        nlp_procesado   = TRUE,
                        fecha_nlp       = NOW()
                    WHERE id = :id
                """), {
                    "id": int(row[0]), "s": score, "l": label,
                    "ent": json.dumps(entidades, ensure_ascii=False) if entidades else None,
                    "emb": json.dumps(embedding) if embedding else None,
                })
                processed += 1
            except Exception as exc:
                logger.debug("nlp row %s err: %s", row[0], exc)
                errors += 1
    return {
        "processed": processed, "errors": errors,
        "libs": nlp_available(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Topic clustering ──────────────────────────────────────────────────────

def run_topic_clustering(n_articles: int = 500) -> dict:
    if not (_HAS_BERTOPIC and _HAS_SENT_TRANS):
        return {"skipped": True, "reason": "bertopic_or_sent_transformers_missing"}
    eng = _engine()
    if eng is None:
        return {"skipped": True, "reason": "db_unreachable"}
    from sqlalchemy import text as sa_text
    with eng.connect() as c:
        rows = c.execute(sa_text("""
            SELECT id, titulo_clean, resumen_clean
            FROM noticias_prensa
            WHERE procesado = TRUE
              AND duplicado_de IS NULL
              AND titulo_clean IS NOT NULL
              AND fecha_publicacion >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY fecha_publicacion DESC NULLS LAST
            LIMIT :n
        """), {"n": n_articles}).fetchall()
    if len(rows) < 20:
        return {"skipped": True, "reason": "insufficient_data", "count": len(rows)}
    ids = [int(r[0]) for r in rows]
    docs = [f"{r[1]} {r[2] or ''}" for r in rows]
    embedder = _registry.get("embedder", _load_embedder)
    if embedder is None:
        return {"skipped": True, "reason": "embedder_load_failed"}
    try:
        import numpy as np  # noqa: F401
        from bertopic import BERTopic
        from sklearn.feature_extraction.text import CountVectorizer
        embeddings = embedder.encode(docs, batch_size=32, show_progress_bar=False, normalize_embeddings=True)
        spanish_stop = ["que","de","en","el","la","los","las","un","una","con","por","para","del","sus","como","más","este","esta","pero","son","han","fue","hay","año","años","muy","también","sobre","entre","cuando","sin","todo","todos","desde","hasta","ser","tiene","cada","tras","ante","bajo","según","donde","siendo","gobierno","españa","partido"]
        vectorizer = CountVectorizer(ngram_range=(1, 2), stop_words=spanish_stop, min_df=2, max_features=5000)
        topic_model = BERTopic(
            embedding_model=embedder, vectorizer_model=vectorizer,
            nr_topics="auto", min_topic_size=5, verbose=False,
        )
        topics, _ = topic_model.fit_transform(docs, embeddings)
    except Exception as exc:
        return {"skipped": True, "reason": f"clustering_failed:{type(exc).__name__}:{exc}"}
    # Persist top-5 keywords per article
    labels: dict[int, list[str]] = {}
    for t_id in set(topics):
        if t_id == -1:
            continue
        try:
            words = topic_model.get_topic(t_id)
            labels[t_id] = [w for w, _ in (words or [])[:5]]
        except Exception:
            labels[t_id] = []
    with eng.begin() as c:
        for aid, t_id in zip(ids, topics):
            kw = labels.get(t_id, [])
            c.execute(sa_text("UPDATE noticias_prensa SET topicos = :kw WHERE id = :id"),
                      {"id": aid, "kw": kw if kw else None})
    return {
        "articles": len(docs),
        "topics_found": len([t for t in set(topics) if t != -1]),
        "outliers": sum(1 for t in topics if t == -1),
    }
