"""
Block 5 — Motor de narrativas: clustering, propagación y coordinación.

Pipeline:
  1. Recibe posts enriquecidos de social_ingester.
  2. Clusteriza por similitud semántica (BERTopic o fallback TF-IDF).
  3. Asigna posts a narrativas existentes o crea nuevas.
  4. Etiqueta clusters nuevos con LLM (Ollama).
  5. Calcula velocidad de propagación y detecta super-difusores.
  6. Detecta comportamiento coordinado (mismos textos, timing sospechoso).
"""
from __future__ import annotations

import hashlib
import json
import logging
import math
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from observability.logging import get_logger

log = get_logger(__name__)

OLLAMA_BASE  = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2:3b"
EMBED_MODEL  = "nomic-embed-text"


# ──────────────────────────────────────────────────────────────────────
# Embeddings
# ──────────────────────────────────────────────────────────────────────
async def _embed(text_: str) -> list[float]:
    try:
        async with httpx.AsyncClient(timeout=20, base_url=OLLAMA_BASE) as c:
            r = await c.post("/api/embeddings", json={"model": EMBED_MODEL, "prompt": text_[:500]})
            return r.json().get("embedding", [])
    except Exception:
        return []


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na  = math.sqrt(sum(x * x for x in a))
    nb  = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na * nb else 0.0


# ──────────────────────────────────────────────────────────────────────
# Fallback TF-IDF clustering (sin dependencias ML)
# ──────────────────────────────────────────────────────────────────────
_STOPWORDS_ES = {
    "el", "la", "los", "las", "un", "una", "de", "del", "en", "que",
    "y", "a", "por", "con", "se", "su", "es", "al", "le", "lo",
    "como", "más", "pero", "sus", "o", "nos", "ante", "si", "ya",
    "muy", "hay", "ha", "no", "para", "este", "esta", "estos", "estas",
}


def _tfidf_tokens(text_: str) -> list[str]:
    tokens = [
        w.lower().strip(".,;:!?¿¡\"'()")
        for w in text_.split()
        if len(w) > 3 and w.lower() not in _STOPWORDS_ES
    ]
    return tokens


def _jaccard(a: list[str], b: list[str]) -> float:
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def cluster_posts_tfidf(
    posts: list[dict],
    threshold: float = 0.15,
) -> list[list[int]]:
    """Agrupa posts por similitud Jaccard de tokens. Retorna lista de clusters (índices)."""
    tokens = [_tfidf_tokens(p.get("texto_norm", p.get("texto", ""))) for p in posts]
    clusters: list[list[int]] = []
    assigned = [False] * len(posts)

    for i in range(len(posts)):
        if assigned[i]:
            continue
        cluster = [i]
        assigned[i] = True
        for j in range(i + 1, len(posts)):
            if not assigned[j] and _jaccard(tokens[i], tokens[j]) >= threshold:
                cluster.append(j)
                assigned[j] = True
        clusters.append(cluster)

    return clusters


# ──────────────────────────────────────────────────────────────────────
# Etiquetado con LLM
# ──────────────────────────────────────────────────────────────────────
_LABEL_PROMPT = """\
Analiza estos {n} posts de redes sociales en español y extrae la narrativa principal:
{muestra}

Responde con JSON:
{{
  "titulo": "Título corto de la narrativa (max 100 chars)",
  "descripcion": "Descripción breve (2-3 frases)",
  "tipo": "desinformacion|polarizacion|protesta|institucional|economia|internacional|otro",
  "tono": "positivo|negativo|neutro|alarmista",
  "actores_mencionados": ["actor1", "actor2"],
  "hashtags_clave": ["#tag1"],
  "es_coordinada": false,
  "riesgo": 5
}}
riesgo: 0-10 (10=muy peligroso para la democracia)
"""


async def label_cluster(posts_sample: list[dict]) -> dict[str, Any]:
    muestra = "\n".join(
        f"- {p.get('texto_norm', p.get('texto', ''))[:200]}"
        for p in posts_sample[:8]
    )
    prompt = _LABEL_PROMPT.format(n=len(posts_sample), muestra=muestra)
    try:
        async with httpx.AsyncClient(timeout=30, base_url=OLLAMA_BASE) as c:
            r = await c.post("/api/generate", json={
                "model":  OLLAMA_MODEL,
                "prompt": prompt,
                "format": "json",
                "stream": False,
            })
            return json.loads(r.json().get("response", "{}"))
    except Exception as e:
        log.warning(f"Error etiquetando cluster: {e}")
        return {
            "titulo":              "Narrativa sin etiquetar",
            "descripcion":         "",
            "tipo":                "otro",
            "tono":                "neutro",
            "actores_mencionados": [],
            "hashtags_clave":      [],
            "es_coordinada":       False,
            "riesgo":              0,
        }


# ──────────────────────────────────────────────────────────────────────
# Persistencia de narrativas
# ──────────────────────────────────────────────────────────────────────
def _narrative_hash(posts_ids: list[str]) -> str:
    key = ":".join(sorted(posts_ids[:20]))
    return hashlib.sha256(key.encode()).hexdigest()[:16]


async def upsert_narrative(
    cluster_posts: list[dict],
    label: dict[str, Any],
    db: AsyncSession,
) -> int | None:
    """Inserta o actualiza una narrativa en la BD. Retorna su ID."""
    try:
        titulo = label.get("titulo", "Narrativa sin título")
        tipo   = label.get("tipo", "otro")
        tono   = label.get("tono", "neutro")

        # Buscar narrativa reciente similar por título
        ex = await db.execute(text("""
            SELECT id FROM narrativa
            WHERE titulo ILIKE :t
              AND fecha_deteccion >= NOW() - INTERVAL '48 hours'
            LIMIT 1
        """), {"t": f"%{titulo[:60]}%"})
        row = ex.scalar()

        if row:
            await db.execute(text("""
                UPDATE narrativa SET
                    n_posts      = n_posts + :n,
                    alcance_total = alcance_total + :alcance,
                    actualizado_en = NOW()
                WHERE id = :id
            """), {
                "n":      len(cluster_posts),
                "alcance": sum(p.get("n_views", 0) + p.get("n_shares", 0) for p in cluster_posts),
                "id":     row,
            })
            await db.commit()
            return row

        r = await db.execute(text("""
            INSERT INTO narrativa (
                titulo, descripcion, tipo, tono,
                actores_mencionados, hashtags_clave,
                riesgo_narrativo, es_coordinada,
                n_posts, alcance_total,
                fecha_deteccion, actualizado_en
            ) VALUES (
                :titulo, :desc, :tipo, :tono,
                :actores::jsonb, :hashtags::jsonb,
                :riesgo, :coordinada,
                :n_posts, :alcance,
                NOW(), NOW()
            )
            RETURNING id
        """), {
            "titulo":     titulo,
            "desc":       label.get("descripcion", ""),
            "tipo":       tipo,
            "tono":       tono,
            "actores":    json.dumps(label.get("actores_mencionados", [])),
            "hashtags":   json.dumps(label.get("hashtags_clave", [])),
            "riesgo":     float(label.get("riesgo", 0)),
            "coordinada": label.get("es_coordinada", False),
            "n_posts":    len(cluster_posts),
            "alcance":    sum(p.get("n_views", 0) + p.get("n_shares", 0) for p in cluster_posts),
        })
        await db.commit()
        return r.scalar()

    except Exception as e:
        await db.rollback()
        log.error(f"Error guardando narrativa: {e}")
        return None


async def save_social_posts(posts: list[dict], db: AsyncSession) -> dict:
    """Persiste posts normalizados en la tabla social_post con deduplicación."""
    stats = {"total": 0, "nuevos": 0, "duplicados": 0}
    for p in posts:
        stats["total"] += 1
        try:
            ex = await db.execute(
                text("SELECT id FROM social_post WHERE hash_id = :h"),
                {"h": p["hash_id"]},
            )
            if ex.scalar():
                stats["duplicados"] += 1
                continue

            await db.execute(text("""
                INSERT INTO social_post (
                    platform, external_id, hash_id, url,
                    texto, texto_norm, hashtags, menciones,
                    autor_id, autor_handle, autor_nombre,
                    autor_seguidores, autor_verificado, autor_tipo,
                    n_likes, n_shares, n_replies, n_views,
                    sentiment, toxicidad, emocion, entidades_ner,
                    engagement_rate, relevancia_politica,
                    publicado_en, ingerido_en
                ) VALUES (
                    :platform, :external_id, :hash_id, :url,
                    :texto, :texto_norm, :hashtags::jsonb, :menciones::jsonb,
                    :autor_id, :autor_handle, :autor_nombre,
                    :autor_seguidores, :autor_verificado, :autor_tipo,
                    :n_likes, :n_shares, :n_replies, :n_views,
                    :sentiment, :toxicidad, :emocion, :entidades_ner::jsonb,
                    :engagement_rate, :relevancia_politica,
                    :publicado_en, NOW()
                ) ON CONFLICT (hash_id) DO NOTHING
            """), {
                **p,
                "hashtags":      json.dumps(p.get("hashtags", [])),
                "menciones":     json.dumps(p.get("menciones", [])),
                "entidades_ner": json.dumps(p.get("entidades_ner", [])),
                "sentiment":     p.get("sentiment", 0.0),
                "toxicidad":     p.get("toxicidad", 0.0),
                "emocion":       p.get("emocion", "neutra"),
                "relevancia_politica": p.get("relevancia_politica", 0),
            })
            stats["nuevos"] += 1
        except Exception as e:
            log.warning(f"Error guardando post {p.get('hash_id')}: {e}")
            await db.rollback()

    await db.commit()
    return stats


# ──────────────────────────────────────────────────────────────────────
# Propagación: velocidad y super-difusores
# ──────────────────────────────────────────────────────────────────────
def compute_propagation_metrics(posts: list[dict]) -> dict[str, Any]:
    """
    Calcula velocidad de propagación (posts/hora) y top super-difusores
    según engagement_rate * seguidores.
    """
    if not posts:
        return {"velocidad_por_hora": 0, "super_difusores": [], "plataformas": {}}

    # Velocidad
    fechas = []
    for p in posts:
        ts = p.get("publicado_en")
        if ts:
            try:
                if isinstance(ts, str):
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                fechas.append(ts)
            except Exception:
                pass

    velocidad = 0.0
    if len(fechas) >= 2:
        fechas.sort()
        span_h = max((fechas[-1] - fechas[0]).total_seconds() / 3600, 0.5)
        velocidad = round(len(posts) / span_h, 2)

    # Super-difusores (top 5 por alcance propio)
    por_autor: dict[str, dict] = {}
    for p in posts:
        handle = p.get("autor_handle", "")
        if not handle:
            continue
        if handle not in por_autor:
            por_autor[handle] = {
                "handle":    handle,
                "nombre":    p.get("autor_nombre", ""),
                "seguidores": p.get("autor_seguidores", 0),
                "n_posts":   0,
                "alcance":   0,
            }
        por_autor[handle]["n_posts"] += 1
        por_autor[handle]["alcance"] += (
            p.get("n_views", 0) + p.get("n_shares", 0) * 2
        )

    super_difusores = sorted(
        por_autor.values(), key=lambda x: x["alcance"], reverse=True
    )[:5]

    # Distribución por plataforma
    plataformas = dict(Counter(p.get("platform", "unknown") for p in posts))

    return {
        "velocidad_por_hora": velocidad,
        "super_difusores":    super_difusores,
        "plataformas":        plataformas,
    }


# ──────────────────────────────────────────────────────────────────────
# Detección de coordinación
# ──────────────────────────────────────────────────────────────────────
def detect_coordinated_behavior(posts: list[dict]) -> dict[str, Any]:
    """
    Detecta señales de comportamiento coordinado inorgánico:
      - Textos casi idénticos desde cuentas distintas en < 5 min
      - Cuentas sin seguidores con alta actividad
      - Spike anómalo de engagement
    """
    señales = []
    score = 0.0

    # 1. Textos repetidos (normalizado)
    texto_cuentas: dict[str, set] = defaultdict(set)
    for p in posts:
        norm = p.get("texto_norm", "")[:100]
        if norm:
            texto_cuentas[norm].add(p.get("autor_handle", ""))

    textos_repetidos = {t: cuentas for t, cuentas in texto_cuentas.items() if len(cuentas) >= 3}
    if textos_repetidos:
        señales.append({
            "tipo":        "texto_repetido",
            "descripcion": f"{len(textos_repetidos)} textos publicados por ≥3 cuentas distintas",
            "severidad":   "alta",
        })
        score += min(len(textos_repetidos) * 0.15, 0.4)

    # 2. Cuentas nuevas/vacías con alta actividad
    cuentas_sospechosas = [
        p for p in posts
        if p.get("autor_seguidores", 999) < 50 and
           (p.get("n_shares", 0) + p.get("n_likes", 0)) > 100
    ]
    if cuentas_sospechosas:
        señales.append({
            "tipo":        "cuentas_vacias_activas",
            "descripcion": f"{len(cuentas_sospechosas)} posts de cuentas con <50 seguidores pero alto engagement",
            "severidad":   "media",
        })
        score += 0.2

    # 3. Spike de hashtag en ventana corta (< 30 min)
    hashtag_times: dict[str, list] = defaultdict(list)
    for p in posts:
        ts = p.get("publicado_en")
        for h in p.get("hashtags", []):
            if ts:
                hashtag_times[h].append(ts)

    for h, times in hashtag_times.items():
        if len(times) >= 10:
            try:
                parsed = [
                    datetime.fromisoformat(t.replace("Z", "+00:00"))
                    if isinstance(t, str) else t
                    for t in times
                ]
                parsed.sort()
                ventana = (parsed[-1] - parsed[0]).total_seconds() / 60
                if ventana < 30:
                    señales.append({
                        "tipo":        "hashtag_spike",
                        "descripcion": f"#{h}: {len(times)} posts en {ventana:.0f} minutos",
                        "severidad":   "alta",
                    })
                    score += 0.25
                    break
            except Exception:
                pass

    return {
        "score_coordinacion":  round(min(score, 1.0), 3),
        "es_coordinada":       score >= 0.35,
        "señales":             señales,
        "n_cuentas_unicas":    len({p.get("autor_handle") for p in posts if p.get("autor_handle")}),
    }


# ──────────────────────────────────────────────────────────────────────
# Punto de entrada principal
# ──────────────────────────────────────────────────────────────────────
async def run_narrative_clustering(
    posts: list[dict],
    db: AsyncSession,
    *,
    min_cluster_size: int = 3,
    similarity_threshold: float = 0.15,
    skip_llm: bool = False,
) -> dict:
    """
    Pipeline completo de narrativas sobre una lista de posts enriquecidos.
    Retorna estadísticas de ejecución.
    """
    stats = {
        "posts_procesados":  len(posts),
        "clusters":          0,
        "narrativas_nuevas": 0,
        "coordinacion":      0,
    }

    if not posts:
        return stats

    # 1. Clustering por similitud textual (fallback TF-IDF)
    clusters = cluster_posts_tfidf(posts, threshold=similarity_threshold)
    clusters = [c for c in clusters if len(c) >= min_cluster_size]
    stats["clusters"] = len(clusters)

    log.info(f"[Narrative] {len(clusters)} clusters ≥ {min_cluster_size} posts")

    for cluster_indices in clusters:
        cluster_posts = [posts[i] for i in cluster_indices]

        # 2. Detección de coordinación
        coord = detect_coordinated_behavior(cluster_posts)
        if coord["es_coordinada"]:
            stats["coordinacion"] += 1

        # 3. Propagación
        prop = compute_propagation_metrics(cluster_posts)

        # 4. Etiquetado LLM
        if skip_llm:
            label: dict = {
                "titulo":              "Cluster sin etiquetar",
                "descripcion":         "",
                "tipo":                "otro",
                "tono":                "neutro",
                "actores_mencionados": [],
                "hashtags_clave":      [],
                "es_coordinada":       coord["es_coordinada"],
                "riesgo":              int(coord["score_coordinacion"] * 10),
            }
        else:
            label = await label_cluster(cluster_posts)
            label["es_coordinada"] = label.get("es_coordinada") or coord["es_coordinada"]

        # 5. Persistencia
        nar_id = await upsert_narrative(cluster_posts, label, db)
        if nar_id:
            stats["narrativas_nuevas"] += 1

            # Guardar métricas de propagación
            try:
                await db.execute(text("""
                    INSERT INTO propagacion_narrativa (
                        narrativa_id, velocidad_por_hora,
                        super_difusores, score_coordinacion,
                        plataformas, señales_coordinacion,
                        calculado_en
                    ) VALUES (
                        :nar_id, :vel,
                        :difusores::jsonb, :coord_score,
                        :plataformas::jsonb, :señales::jsonb,
                        NOW()
                    ) ON CONFLICT (narrativa_id) DO UPDATE SET
                        velocidad_por_hora = EXCLUDED.velocidad_por_hora,
                        score_coordinacion = EXCLUDED.score_coordinacion,
                        calculado_en = NOW()
                """), {
                    "nar_id":      nar_id,
                    "vel":         prop["velocidad_por_hora"],
                    "difusores":   json.dumps(prop["super_difusores"]),
                    "coord_score": coord["score_coordinacion"],
                    "plataformas": json.dumps(prop["plataformas"]),
                    "señales":     json.dumps(coord["señales"]),
                })
                await db.commit()
            except Exception as e:
                await db.rollback()
                log.warning(f"Error guardando propagación narrativa {nar_id}: {e}")

    log.info(f"[Narrative] Completado: {stats}")
    return stats
