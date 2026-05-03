"""
Enriquecedor de perfiles de entidades (Bloque 3).

Para cada entidad con menciones recientes:
  1. Agrega estadisticas de menciones (count 24h/7d, sentimiento medio)
  2. Extrae keywords de los contextos usando YAKE
  3. Identifica co-entidades mas frecuentes
  4. Genera perfil narrativo via Ollama
  5. Calcula tono primario via pysentimiento (o fallback por sentimiento)
  6. Actualiza entities_canonical.perfil_json en BD
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from .models import EntityProfile

log = logging.getLogger(__name__)

_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL    = os.getenv("ENRICHER_OLLAMA_MODEL", "politeia-brain:latest")
_OLLAMA_TEMP     = 0.25   # algo de variedad para perfiles narrativos


# ---------------------------------------------------------------------------
# Extraccion de keywords (YAKE)
# ---------------------------------------------------------------------------

def _extract_keywords(texts: list[str], top_n: int = 10) -> list[str]:
    """Extrae keywords de una lista de textos usando YAKE."""
    combined = " ".join(texts)[:5000]
    try:
        import yake  # type: ignore
        extractor = yake.KeywordExtractor(
            lan="es", n=2, dedupLim=0.7, top=top_n, features=None
        )
        keywords = extractor.extract_keywords(combined)
        return [kw for kw, _ in keywords]
    except ImportError:
        log.debug("yake no disponible; keywords omitidos")
    except Exception as exc:
        log.warning("Error extrayendo keywords: %s", exc)
    return []


# ---------------------------------------------------------------------------
# Calculo de tono (pysentimiento o fallback)
# ---------------------------------------------------------------------------

def _compute_tone(sentiment_avg: float, contexts: list[str]) -> str:
    """
    Calcula el tono primario.
    Intenta usar pysentimiento; si no esta disponible, usa el sentimiento.
    """
    # Intentar pysentimiento sobre los primeros 5 contextos
    try:
        import sys
        sys.path.insert(0, str(
            __import__("pathlib").Path(__file__).parents[3]
            / "gits amigos" / "pysentimiento-master" / "src"
        ))
        from pysentimiento import create_analyzer  # type: ignore
        analyzer = create_analyzer(task="sentiment", lang="es")
        tones = []
        for ctx in contexts[:5]:
            result = analyzer.predict(ctx[:512])
            tones.append(result.output)
        if tones:
            from collections import Counter
            return Counter(tones).most_common(1)[0][0]
    except Exception:
        pass

    # Fallback por umbral de sentimiento numerico
    if sentiment_avg >= 0.2:
        return "positivo"
    if sentiment_avg <= -0.2:
        return "negativo"
    return "neutral"


# ---------------------------------------------------------------------------
# Generacion de perfil narrativo con Ollama
# ---------------------------------------------------------------------------

def _generate_profile_narrative(
    nombre: str,
    tipo: str,
    cargo: Optional[str],
    contexts: list[str],
    keywords: list[str],
    mention_count: int,
) -> str:
    """Genera un parrafo de perfil narrativo para la entidad."""
    ctx_sample = " | ".join(contexts[:4])
    kw_str = ", ".join(keywords[:8]) if keywords else "sin datos"

    prompt = f"""\
Genera un perfil analitico breve (3-4 oraciones) de esta entidad politica
basandote en sus apariciones recientes en medios espanoles.

ENTIDAD: {nombre} ({tipo})
CARGO: {cargo or "no especificado"}
MENCIONES RECIENTES: {mention_count}
PALABRAS CLAVE: {kw_str}
CONTEXTOS: {ctx_sample[:600]}

El perfil debe describir el rol actual, los temas asociados y el tono
meditatico reciente. Escribe en espanol, tercera persona, sin emojis.
Solo el texto del perfil, sin titulos ni formato adicional."""

    try:
        import httpx  # type: ignore
        with httpx.Client(timeout=20) as client:
            resp = client.post(
                f"{_OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": _OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": _OLLAMA_TEMP},
                },
            )
            resp.raise_for_status()
            return resp.json().get("response", "").strip()
    except Exception as exc:
        log.debug("Error generando perfil narrativo para %s: %s", nombre, exc)

    # Fallback: perfil minimo sin LLM
    return (
        f"{nombre} es una entidad de tipo {tipo} con {mention_count} "
        f"menciones recientes en medios espanoles. "
        f"Temas asociados: {kw_str}."
    )


# ---------------------------------------------------------------------------
# Funcion principal de enriquecimiento
# ---------------------------------------------------------------------------

def enrich_entity(qid: str, conn) -> Optional[EntityProfile]:
    """
    Construye y guarda el perfil enriquecido de una entidad.

    Args:
      qid:  QID de la entidad
      conn: conexion psycopg v3 activa

    Returns:
      EntityProfile o None si la entidad no tiene menciones suficientes.
    """
    with conn.cursor() as cur:
        # Datos basicos
        cur.execute(
            "SELECT id, nombre_oficial, tipo, cargo_actual FROM entities_canonical WHERE qid = %s",
            (qid,),
        )
        row = cur.fetchone()
        if row is None:
            return None
        entity_db_id, nombre, tipo, cargo = row

        # Estadisticas de menciones 24h
        cur.execute(
            """
            SELECT COUNT(*), AVG(sentiment)
            FROM entity_mentions
            WHERE qid = %s AND published_at >= NOW() - INTERVAL '24 hours'
            """,
            (qid,),
        )
        r24 = cur.fetchone() or (0, 0.0)
        count_24h = int(r24[0] or 0)
        avg_sent_24h = float(r24[1] or 0.0)

        # Estadisticas de menciones 7d
        cur.execute(
            """
            SELECT COUNT(*), AVG(sentiment)
            FROM entity_mentions
            WHERE qid = %s AND published_at >= NOW() - INTERVAL '7 days'
            """,
            (qid,),
        )
        r7 = cur.fetchone() or (0, 0.0)
        count_7d = int(r7[0] or 0)
        avg_sent_7d = float(r7[1] or 0.0)

        if count_7d == 0:
            return None   # sin datos suficientes

        # Contextos recientes (para keywords y tono)
        cur.execute(
            """
            SELECT context_window FROM entity_mentions
            WHERE qid = %s AND published_at >= NOW() - INTERVAL '7 days'
              AND context_window IS NOT NULL
            LIMIT 20
            """,
            (qid,),
        )
        contexts = [r[0] for r in cur.fetchall() if r[0]]

        # Co-entidades mas frecuentes
        cur.execute(
            """
            SELECT unnested_qid, COUNT(*) AS cnt
            FROM (
                SELECT jsonb_array_elements_text(co_entities) AS unnested_qid
                FROM entity_mentions
                WHERE qid = %s AND published_at >= NOW() - INTERVAL '7 days'
            ) sub
            WHERE unnested_qid != %s
            GROUP BY unnested_qid
            ORDER BY cnt DESC
            LIMIT 5
            """,
            (qid, qid),
        )
        top_co = [r[0] for r in cur.fetchall()]

    # Keywords
    keywords = _extract_keywords(contexts)

    # Tono
    tone = _compute_tone(avg_sent_24h, contexts)

    # Perfil narrativo
    narrative = _generate_profile_narrative(
        nombre=nombre,
        tipo=tipo,
        cargo=cargo,
        contexts=contexts,
        keywords=keywords,
        mention_count=count_7d,
    )

    profile = EntityProfile(
        qid=qid,
        nombre_oficial=nombre,
        tipo=tipo,
        cargo_actual=cargo,
        mention_count_24h=count_24h,
        mention_count_7d=count_7d,
        avg_sentiment_24h=avg_sent_24h,
        avg_sentiment_7d=avg_sent_7d,
        tone_primary=tone,
        top_keywords=keywords,
        top_co_entities=top_co,
        perfil_narrativo=narrative,
        enriched_at=datetime.now(timezone.utc),
    )

    # Persistir perfil_json
    perfil_dict = {
        "mention_count_24h":  count_24h,
        "mention_count_7d":   count_7d,
        "avg_sentiment_24h":  avg_sent_24h,
        "avg_sentiment_7d":   avg_sent_7d,
        "tone_primary":       tone,
        "top_keywords":       keywords,
        "top_co_entities":    top_co,
        "perfil_narrativo":   narrative,
        "enriched_at":        datetime.now(timezone.utc).isoformat(),
    }
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE entities_canonical SET perfil_json = %s WHERE qid = %s",
            (json.dumps(perfil_dict), qid),
        )

    return profile
