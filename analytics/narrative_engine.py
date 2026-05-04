"""
Motor de deteccion de narrativas mediaticas reales.

Reemplaza el value_counts() sobre topic tags RSS con clustering semantico real:
  1. build_narrative_corpus  — filtra y prepara el texto de los articulos
  2. embed_corpus            — sentence-transformers multilingue (768d)
  3. cluster_narratives      — UMAP + HDBSCAN; fallback KMeans si no disponibles
  4. extract_frame_with_llm  — Ollama/litellm extrae el frame narrativo
  5. compute_narrative_lifecycle — metricas de difusion y ciclo vital
  6. run_narrative_detection  — orquestador principal; escribe CSV de salida
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------

_ANALYSIS_DIR = Path(os.environ.get("POLITEIA_BASE_DIR", ".")) / "data" / "analysis"
_LLM_MODEL    = os.environ.get("NARRATIVE_LLM_MODEL", "electsim-fast")
_LLM_BASE_URL = os.environ.get("LITELLM_BASE_URL", "http://litellm-proxy:4000")
_OLLAMA_URL   = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL = os.environ.get("NARRATIVE_OLLAMA_MODEL", "llama3.1:8b")

# Record types que contienen discurso mediatico (excluir datos estructurados)
_DISCOURSE_TYPES = {
    "rss_item", "atom_entry", "html_item",
    "agenda_evento", "boe_item", "noticia_rss",
}
_EXCLUDED_TYPES = {
    "catalog_dataset", "ine_series_or_node", "socrata_row",
}

_EMBED_MODEL    = "paraphrase-multilingual-mpnet-base-v2"
_MIN_CLUSTER    = 5     # articulos minimos para crear narrativa
_MIN_SOURCES    = 3     # fuentes unicas minimas
_LOOKBACK_DAYS  = 2     # ventana deslizante
_UMAP_COMPONENTS = 5
_COORD_WINDOW_H  = 6.0  # ventana de coordinacion (horas)
_COORD_MIN_SRC   = 3    # fuentes minimas para flag coordinacion

# ---------------------------------------------------------------------------
# PASO 1 — Preparacion del corpus
# ---------------------------------------------------------------------------

def build_narrative_corpus(df: pd.DataFrame, min_words: int = 30) -> pd.DataFrame:
    """Filtra articulos discursivos con suficiente texto y concatena fulltext."""
    if df.empty:
        return pd.DataFrame()

    # Excluir record_types estructurados
    if "record_type" in df.columns:
        mask = ~df["record_type"].fillna("").isin(_EXCLUDED_TYPES)
        df = df[mask].copy()

    # Solo tipos discursivos si la columna existe
    if "record_type" in df.columns:
        discourse_mask = df["record_type"].fillna("").apply(
            lambda rt: rt in _DISCOURSE_TYPES or rt.startswith("rss") or rt.startswith("atom")
        )
        df = df[discourse_mask].copy()

    if df.empty:
        return pd.DataFrame()

    # Ventana temporal
    if "published_at" in df.columns:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=_LOOKBACK_DAYS)

        def _to_dt(v: Any) -> Optional[datetime]:
            if pd.isna(v) or v is None:
                return None
            try:
                dt = pd.to_datetime(v, utc=True, errors="coerce")
                return dt.to_pydatetime() if not pd.isna(dt) else None
            except Exception:
                return None

        df = df.copy()
        df["_pub_dt"] = df["published_at"].apply(_to_dt)
        df = df[df["_pub_dt"].notna() & (df["_pub_dt"] >= cutoff)]

    if df.empty:
        log.info("build_narrative_corpus: ningun articulo en ventana %dd", _LOOKBACK_DAYS)
        return pd.DataFrame()

    # Fulltext = title + summary + body (limpio)
    def _build_fulltext(row: pd.Series) -> str:
        parts = [
            str(row.get("title") or ""),
            str(row.get("summary") or ""),
            str(row.get("body") or ""),
        ]
        combined = " ".join(p for p in parts if p.strip())
        combined = re.sub(r"\s+", " ", combined).strip()
        return combined

    df = df.copy()
    df["fulltext"] = df.apply(_build_fulltext, axis=1)

    # Filtrar por longitud minima
    df["word_count"] = df["fulltext"].str.split().str.len().fillna(0).astype(int)
    df = df[df["word_count"] >= min_words].copy()

    log.info("build_narrative_corpus: %d articulos aptos", len(df))
    return df.reset_index(drop=True)


# ---------------------------------------------------------------------------
# PASO 2 — Embedding semantico multilingue
# ---------------------------------------------------------------------------

_embed_model_cache: Any = None


def _load_embed_model() -> Any:
    """Carga sentence-transformers (singleton); retorna None si no disponible."""
    global _embed_model_cache
    if _embed_model_cache is not None:
        return _embed_model_cache
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        _embed_model_cache = SentenceTransformer(_EMBED_MODEL)
        log.info("SentenceTransformer cargado: %s", _EMBED_MODEL)
        return _embed_model_cache
    except ImportError:
        log.warning("sentence-transformers no instalado. Añadir a requirements.txt")
        return None
    except Exception as exc:
        log.warning("Error cargando SentenceTransformer: %s", exc)
        return None


def embed_corpus(texts: list[str]) -> np.ndarray:
    """
    Genera embeddings 768d para una lista de textos con el modelo multilingue.

    Retorna zeros (N, 1) si el modelo no esta disponible — el clustering
    caera al fallback TF-IDF+KMeans automaticamente.
    """
    model = _load_embed_model()
    if model is None:
        return np.zeros((len(texts), 1), dtype=np.float32)
    try:
        vecs = model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
            batch_size=32,
        )
        return np.array(vecs, dtype=np.float32)
    except Exception as exc:
        log.warning("Error generando embeddings: %s", exc)
        return np.zeros((len(texts), 1), dtype=np.float32)


# ---------------------------------------------------------------------------
# PASO 3 — Clustering
# ---------------------------------------------------------------------------

def _cluster_umap_hdbscan(embeddings: np.ndarray) -> np.ndarray:
    """Clustering principal: UMAP reduccion + HDBSCAN."""
    from umap import UMAP          # type: ignore
    from hdbscan import HDBSCAN    # type: ignore

    n_samples = len(embeddings)
    n_neighbors = min(15, max(2, n_samples // 3))

    reduced = UMAP(
        n_components=min(_UMAP_COMPONENTS, n_samples - 1),
        n_neighbors=n_neighbors,
        min_dist=0.0,
        metric="cosine",
        random_state=42,
    ).fit_transform(embeddings)

    labels = HDBSCAN(
        min_cluster_size=_MIN_CLUSTER,
        min_samples=3,
        metric="euclidean",
        cluster_selection_method="eom",
    ).fit_predict(reduced)

    return labels


def _cluster_tfidf_kmeans(texts: list[str], n_clusters: int = 8) -> np.ndarray:
    """Fallback: TF-IDF + KMeans cuando UMAP/HDBSCAN no estan disponibles."""
    from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore
    from sklearn.cluster import KMeans  # type: ignore

    n_clusters = min(n_clusters, max(2, len(texts) // _MIN_CLUSTER))
    vec = TfidfVectorizer(max_features=5000, min_df=2, ngram_range=(1, 2))
    try:
        X = vec.fit_transform(texts)
    except ValueError:
        return np.full(len(texts), -1, dtype=int)

    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    return km.fit_predict(X)


def cluster_narratives(
    embeddings: np.ndarray,
    texts: list[str] | None = None,
) -> np.ndarray:
    """
    Agrupa articulos en clusters narrativos.

    Usa UMAP+HDBSCAN; degrada a TF-IDF+KMeans si no estan disponibles.
    Articulos con label=-1 son ruido (noticias aisladas, no narrativa).
    """
    if len(embeddings) < _MIN_CLUSTER:
        log.info("cluster_narratives: corpus demasiado pequeño (%d art.)", len(embeddings))
        return np.full(len(embeddings), -1, dtype=int)

    # Si embedding es trivial (fallback sin modelo) ir directo a TF-IDF
    if embeddings.shape[1] == 1:
        log.info("cluster_narratives: sin embeddings reales, usando TF-IDF+KMeans")
        return _cluster_tfidf_kmeans(texts or [""] * len(embeddings))

    try:
        labels = _cluster_umap_hdbscan(embeddings)
        n_clusters = len(set(labels) - {-1})
        log.info("cluster_narratives: %d clusters HDBSCAN (ruido=%d)", n_clusters, (labels == -1).sum())
        return labels
    except ImportError:
        log.warning("umap-learn/hdbscan no instalados — fallback KMeans. Añadir a requirements.txt")
    except Exception as exc:
        log.warning("HDBSCAN error (%s) — fallback KMeans", exc)

    return _cluster_tfidf_kmeans(texts or [""] * len(embeddings))


# ---------------------------------------------------------------------------
# PASO 4 — Extraccion del frame con LLM
# ---------------------------------------------------------------------------

_FRAME_SYSTEM = """\
Eres un analista de inteligencia política experto en análisis de marcos
interpretativos (framing analysis). Tu tarea es identificar la narrativa común
que subyace a un conjunto de artículos periodísticos."""

_FRAME_USER = """\
Analiza estos {n} titulares periodísticos que provienen de múltiples fuentes independientes:

{titulares}

Responde en JSON con exactamente esta estructura:
{{
  "frame_label": "título de la narrativa en 4-6 palabras, específico y accionable",
  "frame_description": "una frase que explica el encuadre interpretativo, no el tema",
  "actor_principal": "quién ejecuta o protagoniza (nombre propio si posible)",
  "actor_objetivo": "sobre quién recae la acción (o null)",
  "emocion_dominante": "una de: indignacion|miedo|esperanza|orgullo|desprecio|desconfianza|solidaridad|urgencia",
  "tipo_frame": "una de: diagnostico|pronostico|motivacional|evaluativo",
  "terminos_clave": ["término1", "término2", "término3"],
  "audiencia_objetivo": "segmento de población al que apela esta narrativa",
  "es_narrativa_valida": true
}}

IMPORTANTE: "frame_label" debe ser una narrativa específica, NO una categoría temática.
MAL: "Política exterior y geopolítica" | BIEN: "España aislada en el debate europeo de defensa"
MAL: "Economía" | BIEN: "El gobierno traslada el coste de la inflación a las clases medias"
MAL: "Inmigración" | BIEN: "Medios de derechas unifican relato sobre colapso del sistema de acogida"

Solo responde con el JSON, sin texto adicional."""


def extract_frame_with_llm(cluster_articles: pd.DataFrame) -> dict:
    """
    Extrae el frame narrativo de un cluster via LLM (litellm → Ollama fallback).

    Recibe el DataFrame del cluster y devuelve un dict con los campos del frame.
    """
    headlines = cluster_articles["title"].dropna().astype(str).tolist()[:10]
    if not headlines:
        headlines = cluster_articles["fulltext"].fillna("").str[:120].tolist()[:5]

    titulares_str = "\n".join(f"- {h}" for h in headlines)
    prompt_user   = _FRAME_USER.format(n=len(headlines), titulares=titulares_str)

    # Intentar litellm primero
    raw = _call_litellm(prompt_user)
    if not raw:
        raw = _call_ollama_direct(prompt_user)

    return _parse_frame_json(raw, headlines)


def _call_litellm(prompt: str) -> str:
    """Llama al proxy litellm con el modelo configurado; retorna string vacio si falla."""
    try:
        import httpx  # type: ignore
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                f"{_LLM_BASE_URL}/chat/completions",
                json={
                    "model":    _LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": _FRAME_SYSTEM},
                        {"role": "user",   "content": prompt},
                    ],
                    "temperature": 0.2,
                    "max_tokens":  500,
                },
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        log.debug("litellm frame extractor falló (%s), intentando Ollama directo", exc)
        return ""


def _call_ollama_direct(prompt: str) -> str:
    """Llama directamente a Ollama como fallback de litellm."""
    try:
        import httpx  # type: ignore
        with httpx.Client(timeout=90) as client:
            resp = client.post(
                f"{_OLLAMA_URL}/api/chat",
                json={
                    "model": _OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": _FRAME_SYSTEM},
                        {"role": "user",   "content": prompt},
                    ],
                    "stream": False,
                    "options": {"temperature": 0.2, "num_predict": 500},
                },
            )
            resp.raise_for_status()
            return resp.json()["message"]["content"].strip()
    except Exception as exc:
        log.warning("Ollama directo también falló: %s", exc)
        return ""


def _parse_frame_json(raw: str, headlines: list[str]) -> dict:
    """Parsea la respuesta JSON del LLM; genera frame heuristico si falla."""
    # Buscar bloque JSON en el texto
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(0))
            # Validar campo obligatorio
            if data.get("frame_label") and data.get("es_narrativa_valida", True):
                return data
        except json.JSONDecodeError:
            pass

    # Fallback heuristico: construir frame desde los titulares
    log.debug("_parse_frame_json: JSON invalido — usando frame heuristico")
    return {
        "frame_label":        _heuristic_frame_label(headlines),
        "frame_description":  "Narrativa detectada por clustering semantico",
        "actor_principal":    None,
        "actor_objetivo":     None,
        "emocion_dominante":  "desconfianza",
        "tipo_frame":         "evaluativo",
        "terminos_clave":     _top_terms(headlines, n=3),
        "audiencia_objetivo": "opinion publica general",
        "es_narrativa_valida": True,
    }


def _heuristic_frame_label(headlines: list[str]) -> str:
    """Genera un label de frame por frecuencia de terminos significativos."""
    stop = {
        "de", "la", "el", "en", "y", "a", "los", "las", "del", "al",
        "un", "una", "con", "por", "para", "que", "se", "es", "su",
        "lo", "le", "no", "si", "ha", "han", "the", "of", "in", "and",
        "que", "como", "más", "pero", "este", "esta", "este", "esta",
    }
    from collections import Counter
    words: list[str] = []
    for h in headlines:
        words.extend(
            w.lower().strip(".,;:\"'()[]¡!¿?")
            for w in h.split()
            if len(w) > 3 and w.lower() not in stop
        )
    if not words:
        return "narrativa emergente sin etiquetar"
    top = Counter(words).most_common(4)
    return " ".join(w for w, _ in top)


def _top_terms(headlines: list[str], n: int = 3) -> list[str]:
    """Extrae los n terminos mas frecuentes de los titulares."""
    label = _heuristic_frame_label(headlines)
    return label.split()[:n]


# ---------------------------------------------------------------------------
# PASO 5 — Ciclo vital y difusion
# ---------------------------------------------------------------------------

def compute_narrative_lifecycle(cluster_df: pd.DataFrame) -> dict:
    """Calcula metricas temporales, de difusion y flag de coordinacion del cluster."""
    lifecycle: dict = {
        "primera_deteccion":    None,
        "ultima_deteccion":     None,
        "menciones_acumuladas": len(cluster_df),
        "fuentes_unicas":       0,
        "patron_difusion":      "organico",
        "posible_coordinacion": False,
        "ciclo_vital":          "emergente",
        "velocidad_difusion_h": 0.0,
    }

    # Fuentes unicas
    src_col = "source_key" if "source_key" in cluster_df.columns else "source_label"
    if src_col in cluster_df.columns:
        lifecycle["fuentes_unicas"] = cluster_df[src_col].nunique()

    # Series temporales
    if "_pub_dt" in cluster_df.columns:
        valid_dates = cluster_df["_pub_dt"].dropna()
        if not valid_dates.empty:
            primera = valid_dates.min()
            ultima  = valid_dates.max()
            lifecycle["primera_deteccion"] = primera.isoformat()
            lifecycle["ultima_deteccion"]  = ultima.isoformat()
            lifecycle["velocidad_difusion_h"] = round(
                (ultima - primera).total_seconds() / 3600, 2
            )

            # Ciclo vital
            dias_activa = (ultima - primera).days
            serie_diaria = (
                cluster_df["_pub_dt"].dt.normalize()
                .value_counts()
                .sort_index()
            )
            lifecycle["ciclo_vital"] = _classify_ciclo(
                dias_activa, len(cluster_df), serie_diaria
            )

            # Patron difusion
            if "territory" in cluster_df.columns or "scope" in cluster_df.columns:
                lifecycle["patron_difusion"] = _infer_patron(cluster_df)

    # Deteccion de coordinacion
    lifecycle["posible_coordinacion"] = _detect_coordination(cluster_df)

    return lifecycle


def _classify_ciclo(dias: int, n_articulos: int, serie: pd.Series) -> str:
    """Clasifica el estado del ciclo vital del cluster."""
    if dias <= 1 and n_articulos < 10:
        return "emergente"
    if dias <= 3:
        return "creciente"
    if len(serie) >= 3:
        vals = serie.values
        if vals[-1] < vals.max() * 0.3:
            return "declinante"
        if vals[-1] >= vals.max() * 0.7:
            return "plateau"
    return "creciente"


def _infer_patron(cluster_df: pd.DataFrame) -> str:
    """Infiere el patron de difusion: bottom_up / top_down / coordinado / organico."""
    scope_col = "scope" if "scope" in cluster_df.columns else "territory"
    if scope_col not in cluster_df.columns:
        return "organico"

    scopes = cluster_df[scope_col].fillna("nacional").str.lower()
    local_count    = scopes.isin({"local", "comarcal", "provincial"}).sum()
    national_count = scopes.isin({"nacional", "national"}).sum()
    total = len(scopes)

    if total < 2:
        return "organico"
    if local_count / total >= 0.6 and national_count > 0:
        return "bottom_up"
    if national_count / total >= 0.6 and local_count > 0:
        return "top_down"

    # Coordinacion simultanea (multiplos scopes en primera hora)
    if "_pub_dt" in cluster_df.columns:
        sorted_df = cluster_df.sort_values("_pub_dt")
        t0 = sorted_df["_pub_dt"].iloc[0]
        first_hour = sorted_df[
            (sorted_df["_pub_dt"] - t0).dt.total_seconds() <= 3600
        ]
        if first_hour[scope_col].nunique() >= 3:
            return "coordinado"

    return "organico"


def _detect_coordination(cluster_df: pd.DataFrame) -> bool:
    """Detecta si >= 3 fuentes del mismo nicho publican en < 6h."""
    nicho_col = "nicho" if "nicho" in cluster_df.columns else None
    if nicho_col is None or "_pub_dt" not in cluster_df.columns:
        return False

    df_valid = cluster_df[cluster_df["_pub_dt"].notna() & cluster_df[nicho_col].notna()].copy()
    if len(df_valid) < _COORD_MIN_SRC:
        return False

    df_valid = df_valid.sort_values("_pub_dt")
    window = timedelta(hours=_COORD_WINDOW_H)

    for _, row in df_valid.iterrows():
        t0     = row["_pub_dt"]
        nicho  = row[nicho_col]
        window_df = df_valid[
            (df_valid["_pub_dt"] >= t0) &
            (df_valid["_pub_dt"] <= t0 + window) &
            (df_valid[nicho_col] == nicho)
        ]
        src_col = "source_key" if "source_key" in window_df.columns else "source_label"
        if window_df[src_col].nunique() >= _COORD_MIN_SRC:
            log.info(
                "_detect_coordination: nicho='%s', %d fuentes en %.1fh",
                nicho, window_df[src_col].nunique(), _COORD_WINDOW_H,
            )
            return True
    return False


# ---------------------------------------------------------------------------
# PASO 6 — Guardar resultados
# ---------------------------------------------------------------------------

def save_narratives(
    narratives: list[dict],
    output_dir: Path,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Guarda narratives.csv y narrative_articles.csv en output_dir.

    Retorna (df_narratives, df_articles).
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    rows_narr: list[dict] = []
    rows_art:  list[dict] = []

    for narr in narratives:
        nid = narr["narrative_id"]
        rows_narr.append({
            "narrative_id":          nid,
            "frame_label":           narr.get("frame_label", ""),
            "frame_description":     narr.get("frame_description", ""),
            "actor_principal":       narr.get("actor_principal"),
            "actor_objetivo":        narr.get("actor_objetivo"),
            "emocion_dominante":     narr.get("emocion_dominante", ""),
            "tipo_frame":            narr.get("tipo_frame", ""),
            "terminos_clave":        json.dumps(narr.get("terminos_clave", []), ensure_ascii=False),
            "audiencia_objetivo":    narr.get("audiencia_objetivo", ""),
            "primera_deteccion":     narr.get("primera_deteccion"),
            "menciones_acumuladas":  narr.get("menciones_acumuladas", 0),
            "fuentes_unicas":        narr.get("fuentes_unicas", 0),
            "ciclo_vital":           narr.get("ciclo_vital", "emergente"),
            "patron_difusion":       narr.get("patron_difusion", "organico"),
            "posible_coordinacion":  narr.get("posible_coordinacion", False),
            "velocidad_difusion_h":  narr.get("velocidad_difusion_h", 0.0),
            "n_articulos_ids":       narr.get("n_articulos_ids", 0),
        })
        for aid in narr.get("article_ids", []):
            rows_art.append({"narrative_id": nid, "article_id": aid})

    df_narr = pd.DataFrame(rows_narr)
    df_art  = pd.DataFrame(rows_art)

    df_narr.to_csv(output_dir / "narratives.csv", index=False)
    df_art.to_csv(output_dir / "narrative_articles.csv", index=False)
    log.info("save_narratives: %d narrativas en %s", len(df_narr), output_dir)
    return df_narr, df_art


# ---------------------------------------------------------------------------
# Orquestador principal
# ---------------------------------------------------------------------------

def run_narrative_detection(
    df: pd.DataFrame,
    output_dir: Optional[Path] = None,
) -> pd.DataFrame:
    """
    Orquestador completo: corpus → embeddings → clustering → frame LLM → CSV.

    Reemplaza el value_counts() de topics en politeia_spain_pipeline.py.
    Retorna df de narrativas detectadas (puede estar vacio si corpus insuficiente).
    """
    if output_dir is None:
        output_dir = _ANALYSIS_DIR

    log.info("run_narrative_detection: iniciando...")

    # Paso 1: corpus
    corpus = build_narrative_corpus(df)
    if corpus.empty or len(corpus) < _MIN_CLUSTER:
        log.warning(
            "run_narrative_detection: corpus insuficiente (%d art., min=%d)",
            len(corpus), _MIN_CLUSTER,
        )
        return pd.DataFrame()

    texts = corpus["fulltext"].tolist()

    # Paso 2: embeddings
    log.info("run_narrative_detection: generando embeddings para %d textos", len(texts))
    embeddings = embed_corpus(texts)
    corpus["_embedding_idx"] = range(len(corpus))

    # Paso 3: clustering
    labels = cluster_narratives(embeddings, texts)
    corpus["_cluster"] = labels

    # Guardar embeddings en corpus para reutilizacion por event_detector
    # (serializar como lista para que event_detector pueda leerlos)
    corpus["_emb_available"] = embeddings.shape[1] > 1

    # Paso 4 + 5: por cada cluster valido, extraer frame y lifecycle
    unique_labels = [l for l in np.unique(labels) if l != -1]
    log.info("run_narrative_detection: %d clusters detectados", len(unique_labels))

    narratives: list[dict] = []

    for label in unique_labels:
        cluster_mask = corpus["_cluster"] == label
        cluster_df   = corpus[cluster_mask].copy()

        n_arts    = len(cluster_df)
        src_col   = "source_key" if "source_key" in cluster_df.columns else "source_label"
        n_sources = cluster_df[src_col].nunique() if src_col in cluster_df.columns else 1

        if n_arts < _MIN_CLUSTER or n_sources < _MIN_SOURCES:
            log.debug(
                "Cluster %d: descartado (art=%d, fuentes=%d)",
                label, n_arts, n_sources,
            )
            continue

        # Frame LLM
        frame_data = extract_frame_with_llm(cluster_df)
        if not frame_data.get("es_narrativa_valida", True):
            log.debug("Cluster %d: LLM marco como no valido — descartado", label)
            continue

        # Lifecycle
        lifecycle = compute_narrative_lifecycle(cluster_df)

        # ID unico basado en frame_label + primera_deteccion
        nid = hashlib.sha1(
            f"{frame_data.get('frame_label','')}{lifecycle.get('primera_deteccion','')}".encode()
        ).hexdigest()[:12]

        # article_ids
        id_col = "record_id" if "record_id" in cluster_df.columns else cluster_df.index.name or "index"
        article_ids = cluster_df["record_id"].tolist() if "record_id" in cluster_df.columns else []

        narr = {
            "narrative_id":         nid,
            **frame_data,
            **lifecycle,
            "article_ids":          article_ids,
            "n_articulos_ids":      len(article_ids),
            "cluster_label":        int(label),
        }
        narratives.append(narr)
        log.info(
            "Narrativa detectada: '%s' (%d art., %d fuentes, ciclo=%s)",
            frame_data.get("frame_label", "?"),
            n_arts, n_sources,
            lifecycle.get("ciclo_vital", "?"),
        )

    if not narratives:
        log.warning("run_narrative_detection: ningun cluster paso los filtros de calidad")
        return pd.DataFrame()

    df_narr, _ = save_narratives(narratives, output_dir)

    # Persistir el corpus con labels para que event_detector lo reutilice
    _persist_corpus_for_events(corpus, embeddings, output_dir)

    return df_narr


def _persist_corpus_for_events(
    corpus: pd.DataFrame,
    embeddings: np.ndarray,
    output_dir: Path,
) -> None:
    """Guarda corpus con cluster labels y embeddings para reutilizacion por event_detector."""
    try:
        cols_to_save = [
            c for c in corpus.columns
            if c not in ("fulltext", "_embedding_idx", "_emb_available")
        ]
        corpus[cols_to_save].to_parquet(
            output_dir / "_narrative_corpus.parquet", index=False
        )
        if embeddings.shape[1] > 1:
            np.save(str(output_dir / "_narrative_embeddings.npy"), embeddings)
        log.debug("Corpus y embeddings persistidos en %s", output_dir)
    except Exception as exc:
        log.debug("No se pudo persistir corpus para events: %s", exc)
