"""
Detector de eventos para el mapa de inteligencia.

Un evento != una noticia RSS. Un evento es un hecho corroborado por
>=2 fuentes distintas, con territorializacion real y relevancia calculada.

Pipeline:
  1. Filtrado inicial — texto suficiente, record_type valido, ventana 72h
  2. Agrupacion por similitud — reutiliza embeddings de narrative_engine
  3. Calculo de relevancia — score 0-10 basado en n_fuentes, n_articulos,
     politicos detectados, velocidad de propagacion
  4. Geolocalizacion — extrae entidad geografica del cluster
  5. Traduccion de titulos — langdetect + Ollama/litellm si idioma != es
  6. Eventos relacionados — similitud coseno entre centroides
  7. Salida — events_map.csv con solo eventos score>=3, lat!=null, n_fuentes>=2
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

from .geo_index import lookup_coords, SPAIN_CCAA_COORDS, SPAIN_PROVINCE_COORDS

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------

_ANALYSIS_DIR  = Path(os.environ.get("POLITEIA_BASE_DIR", ".")) / "data" / "analysis"
_LLM_BASE_URL  = os.environ.get("LITELLM_BASE_URL", "http://litellm-proxy:4000")
_LLM_MODEL     = os.environ.get("NARRATIVE_LLM_MODEL", "electsim-fast")
_OLLAMA_URL    = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL  = os.environ.get("NARRATIVE_OLLAMA_MODEL", "llama3.1:8b")

_MIN_RELEVANCE    = 3.0     # score minimo para aparecer en mapa
_MIN_SOURCES_EVT  = 2       # fuentes minimas para ser evento
_SIM_GROUP        = 0.75    # similitud coseno para agrupar articulos
_SIM_RELATED      = 0.60    # similitud coseno para eventos relacionados
_LOOKBACK_H       = 72      # horas de ventana

_EXCLUDED_TYPES = {
    "catalog_dataset", "ine_series_or_node", "socrata_row",
}

# Categorias de urgencia por score
_URGENCIA = {
    (7.0, 10.1): "alta",
    (4.5, 7.0):  "media",
    (0.0, 4.5):  "baja",
}


# ---------------------------------------------------------------------------
# PASO 1 — Filtrado inicial
# ---------------------------------------------------------------------------

def _filter_for_events(df: pd.DataFrame) -> pd.DataFrame:
    """Filtra articulos aptos para deteccion de eventos."""
    if df.empty:
        return pd.DataFrame()

    cutoff = datetime.now(timezone.utc) - timedelta(hours=_LOOKBACK_H)

    # Excluir tipos estructurados
    if "record_type" in df.columns:
        df = df[~df["record_type"].fillna("").isin(_EXCLUDED_TYPES)].copy()

    # Filtrar por fecha
    if "published_at" in df.columns:
        def _to_dt(v: Any) -> Optional[datetime]:
            if pd.isna(v) or v is None:
                return None
            try:
                return pd.to_datetime(v, utc=True, errors="coerce").to_pydatetime()
            except Exception:
                return None

        df = df.copy()
        df["_pub_dt"] = df["published_at"].apply(_to_dt)
        df = df[df["_pub_dt"].notna() & (df["_pub_dt"] >= cutoff)]

    # Filtrar por longitud de texto
    if "_pub_dt" not in df.columns:
        df = df.copy()
        df["_pub_dt"] = None

    if "text_len" not in df.columns:
        full = (
            df.get("title", pd.Series(dtype=str)).fillna("") + " " +
            df.get("summary", pd.Series(dtype=str)).fillna("") + " " +
            df.get("body", pd.Series(dtype=str)).fillna("")
        )
        df = df.copy()
        df["text_len"] = full.str.split().str.len().fillna(0).astype(int)

    df = df[df["text_len"] >= 100].copy()
    return df.reset_index(drop=True)


# ---------------------------------------------------------------------------
# PASO 2 — Agrupacion por similitud (reutilizar embeddings de narrative_engine)
# ---------------------------------------------------------------------------

def _load_embeddings_from_cache(analysis_dir: Path) -> Optional[np.ndarray]:
    """Carga embeddings persistidos por narrative_engine si existen."""
    emb_path = analysis_dir / "_narrative_embeddings.npy"
    if emb_path.exists():
        try:
            return np.load(str(emb_path))
        except Exception as exc:
            log.debug("No se pudieron cargar embeddings cache: %s", exc)
    return None


def _embed_texts_local(texts: list[str]) -> np.ndarray:
    """Genera embeddings usando el modelo local (reutilizando el de narrative_engine)."""
    try:
        from analytics.narrative_engine import embed_corpus  # type: ignore
        return embed_corpus(texts)
    except Exception as exc:
        log.debug("embed_corpus no disponible: %s", exc)
        return np.zeros((len(texts), 1), dtype=np.float32)


def _cosine_sim_matrix(A: np.ndarray, B: np.ndarray) -> np.ndarray:
    """Similitud coseno entre todas las filas de A y B (vectores normalizados)."""
    if A.shape[1] == 1 or B.shape[1] == 1:
        return np.zeros((len(A), len(B)))
    return np.clip(A @ B.T, -1.0, 1.0)


def _group_by_similarity(
    df: pd.DataFrame,
    embeddings: np.ndarray,
    threshold: float = _SIM_GROUP,
) -> list[list[int]]:
    """
    Agrupa indices de articulos por similitud coseno.

    Usa greedy clustering: cada articulo va al grupo cuyo centroide
    tiene similitud >= threshold. Si no hay grupo apto, crea uno nuevo.
    """
    if len(df) == 0:
        return []

    # Si no hay embeddings reales, agrupar por title hash (dedup naive)
    if embeddings.shape[1] == 1:
        return _group_by_title_similarity(df)

    groups: list[list[int]]  = []
    centroids: list[np.ndarray] = []

    for i in range(len(df)):
        vec = embeddings[i]
        placed = False
        for g_idx, centroid in enumerate(centroids):
            sim = float(np.dot(vec, centroid))
            if sim >= threshold:
                groups[g_idx].append(i)
                # Actualizar centroide
                n = len(groups[g_idx])
                centroids[g_idx] = (centroid * (n - 1) + vec) / n
                norm = np.linalg.norm(centroids[g_idx])
                if norm > 0:
                    centroids[g_idx] /= norm
                placed = True
                break
        if not placed:
            groups.append([i])
            centroids.append(vec.copy())

    return groups


def _group_by_title_similarity(df: pd.DataFrame) -> list[list[int]]:
    """Fallback: agrupa articulos con titulo muy similar usando difflib."""
    import difflib
    titles = df["title"].fillna("").astype(str).tolist()
    assigned = [-1] * len(titles)
    groups: list[list[int]] = []

    for i, ti in enumerate(titles):
        placed = False
        for g_idx, group in enumerate(groups):
            rep = titles[groups[g_idx][0]]
            ratio = difflib.SequenceMatcher(None, ti.lower()[:80], rep.lower()[:80]).ratio()
            if ratio >= 0.60:
                groups[g_idx].append(i)
                placed = True
                break
        if not placed:
            groups.append([i])

    return groups


# ---------------------------------------------------------------------------
# PASO 3 — Score de relevancia
# ---------------------------------------------------------------------------

def _relevance_score(group_df: pd.DataFrame) -> float:
    """
    Calcula relevancia del evento en escala 0-10.

    - n_fuentes_distintas × 1.5  (max 4.5 pts)
    - n_articulos × 0.3          (max 2 pts)
    - presencia de politicos/partidos (0 o 2 pts)
    - velocidad propagacion <6h  (0 o 2 pts)
    """
    src_col = "source_key" if "source_key" in group_df.columns else "source_label"
    n_src  = group_df[src_col].nunique() if src_col in group_df.columns else 1
    n_art  = len(group_df)

    pts_src   = min(n_src * 1.5, 4.5)
    pts_art   = min(n_art * 0.3, 2.0)

    # Politicos / partidos detectados
    pts_pols = 0.0
    for col in ("politicians", "parties"):
        if col in group_df.columns:
            has_ent = group_df[col].apply(
                lambda x: bool(x) if isinstance(x, list) else bool(x)
            ).any()
            if has_ent:
                pts_pols = 2.0
                break

    # Velocidad: ¿varios articulos en < 6h desde el primero?
    pts_vel = 0.0
    if "_pub_dt" in group_df.columns and len(group_df) >= 2:
        dts = group_df["_pub_dt"].dropna().sort_values()
        if len(dts) >= 2:
            delta_h = (dts.iloc[-1] - dts.iloc[0]).total_seconds() / 3600
            if delta_h <= 6:
                pts_vel = 2.0

    return round(pts_src + pts_art + pts_pols + pts_vel, 2)


def _urgencia_from_score(score: float) -> str:
    """Mapea score numerico a etiqueta alta/media/baja."""
    for (lo, hi), label in _URGENCIA.items():
        if lo <= score < hi:
            return label
    return "baja"


# ---------------------------------------------------------------------------
# PASO 4 — Geolocalizacion
# ---------------------------------------------------------------------------

_GEO_KEYWORDS: dict[str, tuple[float, float]] = {}

def _build_geo_keywords() -> dict[str, tuple[float, float]]:
    """Construye diccionario keyword→coords combinando CCAA + provincias + capitales."""
    if _GEO_KEYWORDS:
        return _GEO_KEYWORDS
    from analytics.geo_index import WORLD_CAPITALS
    combined = {}
    combined.update({k.replace("_", " "): v for k, v in SPAIN_CCAA_COORDS.items()})
    combined.update({k.replace("_", " "): v for k, v in SPAIN_PROVINCE_COORDS.items()})
    combined.update({k.replace("_", " "): v for k, v in WORLD_CAPITALS.items()})
    _GEO_KEYWORDS.update(combined)
    return _GEO_KEYWORDS


def _geolocate_group(group_df: pd.DataFrame) -> tuple[Optional[float], Optional[float], str, str]:
    """
    Extrae coordenadas del grupo de articulos.

    Prioridad:
    1. Campo `territory` / `ccaa` del articulo representativo
    2. Keywords geograficos en el titulo del articulo representativo
    3. None, None si no se puede determinar
    """
    geo_kws = _build_geo_keywords()

    # 1. Campo territory / ccaa
    for col in ("territory", "ccaa", "region"):
        if col not in group_df.columns:
            continue
        vals = group_df[col].dropna().astype(str)
        for val in vals:
            if val and val.lower() not in ("nan", "none", ""):
                coords = lookup_coords(val)
                if coords:
                    pais = "España" if val.lower() in {k.replace("_"," ") for k in SPAIN_CCAA_COORDS} else val
                    return coords[0], coords[1], val, pais

    # 2. Keywords en titulo del articulo mas reciente
    latest = (
        group_df.sort_values("_pub_dt", ascending=False)
        if "_pub_dt" in group_df.columns
        else group_df
    ).iloc[0]

    title = str(latest.get("title") or "").lower()
    for kw, (lat, lon) in geo_kws.items():
        if kw in title:
            is_spain = any(kw == k.replace("_", " ") for k in SPAIN_CCAA_COORDS)
            pais = "España" if is_spain else kw.title()
            return lat, lon, kw.title(), pais

    return None, None, "", ""


# ---------------------------------------------------------------------------
# PASO 5 — Traduccion de titulos
# ---------------------------------------------------------------------------

def _detect_language(text: str) -> str:
    """Detecta el idioma del texto; retorna 'es' si no puede determinarlo."""
    try:
        from langdetect import detect  # type: ignore
        return detect(text[:500])
    except ImportError:
        log.debug("langdetect no instalado; asumiendo idioma 'es'")
        return "es"
    except Exception:
        return "es"


def _translate_to_spanish(title: str, lang: str) -> str:
    """
    Traduce el titulo al español via litellm/Ollama.

    Si la traduccion falla, retorna el titulo original marcado con [ORIG].
    """
    prompt = (
        f"Traduce este titular al español, manteniendo tono y nombres propios. "
        f"Responde SOLO con el titular traducido, sin explicaciones:\n{title}"
    )
    # Intentar litellm
    try:
        import httpx  # type: ignore
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                f"{_LLM_BASE_URL}/chat/completions",
                json={
                    "model":    _LLM_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens":  100,
                },
            )
            resp.raise_for_status()
            translated = resp.json()["choices"][0]["message"]["content"].strip()
            if translated:
                return translated
    except Exception:
        pass

    # Ollama directo
    try:
        import httpx  # type: ignore
        with httpx.Client(timeout=45) as client:
            resp = client.post(
                f"{_OLLAMA_URL}/api/chat",
                json={
                    "model": _OLLAMA_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 80},
                },
            )
            resp.raise_for_status()
            translated = resp.json()["message"]["content"].strip()
            if translated:
                return translated
    except Exception as exc:
        log.debug("Traduccion Ollama fallida: %s", exc)

    return f"[ORIG] {title}"


# ---------------------------------------------------------------------------
# PASO 6 — Eventos relacionados
# ---------------------------------------------------------------------------

def _find_related_events(
    event_centroids: dict[str, np.ndarray],
    target_id: str,
    top_k: int = 3,
) -> list[str]:
    """Encuentra los top_k eventos mas relacionados por similitud coseno entre centroides."""
    if len(event_centroids) < 2:
        return []
    target_vec = event_centroids.get(target_id)
    if target_vec is None or target_vec.shape[0] == 1:
        return []

    scores: list[tuple[str, float]] = []
    for eid, vec in event_centroids.items():
        if eid == target_id or vec.shape[0] != target_vec.shape[0]:
            continue
        sim = float(np.dot(target_vec, vec))
        if sim >= _SIM_RELATED:
            scores.append((eid, sim))

    scores.sort(key=lambda x: x[1], reverse=True)
    return [eid for eid, _ in scores[:top_k]]


# ---------------------------------------------------------------------------
# Orquestador principal
# ---------------------------------------------------------------------------

def detect_events(
    df: pd.DataFrame,
    analysis_dir: Optional[Path] = None,
) -> pd.DataFrame:
    """
    Detecta eventos corroborados en el DataFrame y retorna events_map.csv.

    Aplica todos los pasos: filtrado, agrupacion, relevancia, geo, traduccion,
    relacionados. Solo eventos con score>=3, lat!=None, n_fuentes>=2.
    """
    if analysis_dir is None:
        analysis_dir = _ANALYSIS_DIR

    log.info("detect_events: iniciando con %d filas", len(df))
    filtered = _filter_for_events(df)
    if filtered.empty:
        log.warning("detect_events: ningun articulo paso el filtro inicial")
        return pd.DataFrame()

    # Cargar embeddings (del cache narrative_engine o generar nuevos)
    embeddings = _load_embeddings_from_cache(analysis_dir)
    if embeddings is not None and len(embeddings) == len(filtered):
        log.info("detect_events: reutilizando embeddings de narrative_engine")
    else:
        log.info("detect_events: generando embeddings propios para %d textos", len(filtered))
        texts = (
            filtered.get("title", pd.Series(dtype=str)).fillna("") + " " +
            filtered.get("summary", pd.Series(dtype=str)).fillna("")
        ).tolist()
        embeddings = _embed_texts_local(texts)

    # Agrupacion
    groups = _group_by_similarity(filtered, embeddings, _SIM_GROUP)
    log.info("detect_events: %d grupos formados", len(groups))

    # Calcular centroides de cada grupo
    event_centroids: dict[str, np.ndarray] = {}
    event_rows: list[dict] = []

    for group_indices in groups:
        group_df = filtered.iloc[group_indices].copy()

        src_col  = "source_key" if "source_key" in group_df.columns else "source_label"
        n_fuentes = group_df[src_col].nunique() if src_col in group_df.columns else 1
        n_art     = len(group_df)

        # Filtro de corroboracion minima
        if n_fuentes < _MIN_SOURCES_EVT:
            continue

        score = _relevance_score(group_df)
        if score < _MIN_RELEVANCE:
            continue

        # Geolocalizacion
        lat, lon, territorio, pais = _geolocate_group(group_df)
        if lat is None:
            continue  # sin geolocalizacion, no va al mapa

        # Articulo representativo: el mas reciente
        rep = (
            group_df.sort_values("_pub_dt", ascending=False)
            if "_pub_dt" in group_df.columns
            else group_df
        ).iloc[0]

        titulo_orig = str(rep.get("title") or rep.get("summary") or "")[:200]
        lang_orig   = str(rep.get("language") or _detect_language(titulo_orig))

        # Traducir si no es español
        if lang_orig.startswith("es"):
            titulo_es = titulo_orig
        else:
            titulo_es = _translate_to_spanish(titulo_orig, lang_orig)

        # Fechas
        primera_mencion = None
        ultima_mencion  = None
        if "_pub_dt" in group_df.columns:
            dts = group_df["_pub_dt"].dropna()
            if not dts.empty:
                primera_mencion = dts.min().isoformat()
                ultima_mencion  = dts.max().isoformat()

        # Actores
        actor_principal = None
        if "politicians" in group_df.columns:
            pols = group_df["politicians"].dropna()
            flat = [p for lst in pols for p in (lst if isinstance(lst, list) else [lst]) if p]
            if flat:
                from collections import Counter
                actor_principal = Counter(flat).most_common(1)[0][0]

        # Categoria principal
        cat_col = "category" if "category" in group_df.columns else "document_type"
        cat = "general"
        if cat_col in group_df.columns:
            cat_vals = group_df[cat_col].dropna().astype(str)
            if not cat_vals.empty:
                from collections import Counter
                cat = Counter(cat_vals).most_common(1)[0][0]

        # Sources
        source_names = group_df[src_col].dropna().unique().tolist()[:5] if src_col in group_df.columns else []

        # Event ID
        eid = hashlib.sha1(f"{titulo_orig}{primera_mencion}".encode()).hexdigest()[:10]

        # Centroide del grupo para eventos relacionados
        if embeddings.shape[1] > 1:
            group_vecs = embeddings[group_indices]
            centroid   = group_vecs.mean(axis=0)
            norm       = np.linalg.norm(centroid)
            if norm > 0:
                centroid /= norm
            event_centroids[eid] = centroid

        event_rows.append({
            "event_id":            eid,
            "titulo_es":           titulo_es,
            "titulo_original":     titulo_orig,
            "idioma_original":     lang_orig,
            "lat":                 lat,
            "lon":                 lon,
            "territorio":          territorio,
            "pais":                pais,
            "n_articulos":         n_art,
            "n_fuentes":           n_fuentes,
            "relevancia_score":    score,
            "urgencia":            _urgencia_from_score(score),
            "categoria_principal": cat,
            "narrativas_asociadas": "",
            "eventos_relacionados": "",
            "actor_principal":     actor_principal,
            "resumen_ia":          "",
            "primera_mencion":     primera_mencion,
            "ultima_mencion":      ultima_mencion,
            "source_names":        json.dumps(source_names, ensure_ascii=False),
        })

    if not event_rows:
        log.warning("detect_events: ningun evento paso todos los filtros")
        return pd.DataFrame()

    events_df = pd.DataFrame(event_rows)

    # Paso 6: eventos relacionados
    for idx, row in events_df.iterrows():
        related = _find_related_events(event_centroids, row["event_id"])
        events_df.at[idx, "eventos_relacionados"] = json.dumps(related)

    # Guardar
    analysis_dir.mkdir(parents=True, exist_ok=True)
    events_df.to_csv(analysis_dir / "events_map.csv", index=False)

    log.info(
        "detect_events: %d eventos en mapa (score>=%.1f, n_fuentes>=%d, lat!=null)",
        len(events_df), _MIN_RELEVANCE, _MIN_SOURCES_EVT,
    )
    return events_df
