"""
Router /api/narratives — análisis de narrativas con marco metodológico.

Marco teórico aplicado (Entman 1993 + Lakoff 2004):
1. Problem definition (¿qué problema se construye?)
2. Causal interpretation (¿quién es el responsable según el frame?)
3. Moral evaluation (¿qué juicio implícito se emite?)
4. Treatment recommendation (¿qué solución sugiere?)
5. Metaphor / cognitive framing (¿qué metáfora estructura el discurso?)

Categorías macro (basadas en NRC + Lakoff issue-clusters):
- economia          (precio, inflación, mercado, empleo)
- politica_interior (gobierno, oposición, parlamento, coalición)
- politica_exterior (UE, EEUU, OTAN, geopolítica)
- seguridad         (defensa, orden público, terrorismo)
- justicia          (TC, fiscalía, lawfare, amnistía)
- territorial       (CCAA, independentismo, financiación)
- identidad         (memoria, género, inmigración, religión)
- sociedad          (vivienda, sanidad, educación)
- tecnologia        (IA, redes, regulación digital)
- medioambiente     (energía, transición, clima)

Endpoints:
  GET  /api/narratives/analysis        — narrativas detectadas + framework Entman aplicado
  GET  /api/narratives/categories      — distribución por categoría
  GET  /api/narratives/by-region       — narrativas por CCAA (España) y país (Europa)
  POST /api/narratives/deep-analyze    — análisis profundo on-demand de una narrativa
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime
from typing import Any

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/narratives", tags=["narratives"])

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "60"))
OLLAMA_MODEL_PRIORITY = ["politeia-brain:latest", "qwen2.5:7b", "llama3.2:3b"]


def _ollama_model() -> str:
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        if r.is_success:
            available = {m["name"] for m in r.json().get("models", [])}
            for m in OLLAMA_MODEL_PRIORITY:
                if m in available:
                    return m
    except Exception:
        pass
    return OLLAMA_MODEL_PRIORITY[-1]


def _conn():
    """psycopg connection a la DB principal."""
    import psycopg
    from config.settings import get_settings
    s = get_settings()
    raw = s.database_url_raw
    dsn = re.sub(r"postgresql\+\w+://", "postgresql://", raw)
    return psycopg.connect(dsn)


# ── Categorización heurística ────────────────────────────────────────────────
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "economia":          ["economia", "ipc", "inflacion", "empleo", "paro", "ibex", "mercado", "fiscal", "presupuesto", "deuda", "déficit", "salario", "vivienda", "alquiler", "hipoteca", "banco", "fondo"],
    "politica_interior": ["gobierno", "moncloa", "psoe", "pp", "vox", "sumar", "podemos", "coalicion", "investidura", "mocion", "censura", "pleno", "congreso", "senado"],
    "politica_exterior": ["ue", "europa", "bruselas", "eeuu", "trump", "biden", "otan", "rusia", "ucrania", "china", "geopolitic", "exterior", "diplomac", "marruecos", "sahara", "internacional", "relaciones internacionales"],
    "seguridad":         ["defensa", "ejercito", "guardia civil", "policia", "terrorism", "yihad", "seguridad", "fronter", "ceuta", "melilla", "narco"],
    "justicia":          ["justicia", "tc", "tribunal", "fiscal", "lawfare", "amnistia", "judicial", "juez", "magistrado", "constitucional", "corrupcion"],
    "territorial":       ["catalu", "catalan", "vasco", "euskadi", "galicia", "ccaa", "autonomic", "independent", "nacionalist", "andaluc", "madrid", "valencia", "balear", "canari"],
    "identidad":         ["memoria", "genero", "feminis", "machis", "lgtb", "inmigra", "migrant", "religion", "iglesia", "islam", "cultura"],
    "sociedad":          ["sanidad", "educacion", "universidad", "hospital", "salud", "salud_publica", "vivienda", "pension", "jubilacion", "natalidad", "demografi"],
    "tecnologia":        ["tecnologia", "ia", "inteligencia artificial", "digital", "ciber", "redes", "datos", "privacidad"],
    "medioambiente":     ["medioambiente", "energia", "renovable", "transicion", "clima", "co2", "emisiones", "sostenib"],
}


def _categorize(topic: str, summary: str = "", category: str | None = None) -> str:
    """Asigna categoría basándose en keywords. Si la noticia ya trae ai_category, la usa."""
    if category and category != "otro":
        # Mapeo desde ai_category de Ollama a nuestras macro-categorías
        m = {
            "politica_interior":  "politica_interior",
            "politica_exterior":  "politica_exterior",
            "economia":           "economia",
            "seguridad_defensa":  "seguridad",
            "justicia":           "justicia",
            "sociedad":           "sociedad",
            "tecnologia":         "tecnologia",
            "medioambiente":      "medioambiente",
            "energia":            "medioambiente",
            "salud":              "sociedad",
        }
        if category in m:
            return m[category]
    text = f"{topic} {summary}".lower()
    scores: dict[str, int] = {}
    for cat, kws in CATEGORY_KEYWORDS.items():
        scores[cat] = sum(1 for k in kws if k in text)
    if not scores or max(scores.values()) == 0:
        return "otros"
    return max(scores.items(), key=lambda x: x[1])[0]


# ── Endpoint principal: análisis con framework ────────────────────────────────
@router.get("/analysis")
def narratives_analysis(
    hours_back: int = Query(72, ge=1, le=720),
    min_articles_per_cluster: int = Query(2, ge=1, le=10),
    deep: bool = Query(False, description="Si True, llama Ollama por cluster (lento)"),
):
    """Detecta narrativas activas agrupando por topic + entidades."""
    out: dict[str, Any] = {
        "narratives": [], "categories_dist": {}, "total_clusters": 0, "hours_back": hours_back,
        "framework": "Entman 1993 + Lakoff 2004",
        "categories": list(CATEGORY_KEYWORDS.keys()) + ["otros"],
    }

    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                # Top topics + sus artículos asociados
                cur.execute("""
                    SELECT unnest(ai_topics) AS topic, id, title, ai_summary, ai_analysis,
                           ai_sentiment, ai_relevance, ai_spain_impact, ai_category,
                           ai_entities, source_name, source_country, scraped_at
                    FROM news_articles
                    WHERE scraped_at > NOW() - (%s || ' hours')::interval
                      AND ai_topics IS NOT NULL
                      AND array_length(ai_topics, 1) > 0
                """, [str(hours_back)])
                rows = cur.fetchall()

        if not rows:
            return out

        # Cluster por topic (case-insensitive, normalizado)
        clusters: dict[str, list[dict]] = {}
        for r in rows:
            topic_raw = (r[0] or "").strip().lower()
            if not topic_raw:
                continue
            # Normalizar: "salud_publica" → "salud publica"
            topic_norm = re.sub(r"[_\-]+", " ", topic_raw).strip()
            clusters.setdefault(topic_norm, []).append({
                "id": r[1], "title": r[2], "summary": r[3], "analysis": r[4],
                "sentiment": r[5], "relevance": r[6], "spain_impact": r[7],
                "category_orig": r[8], "entities": r[9],
                "source_name": r[10], "source_country": r[11],
                "scraped_at": r[12].isoformat() if r[12] else None,
            })

        # Filter clusters with enough mass
        valid = {t: arts for t, arts in clusters.items() if len(arts) >= min_articles_per_cluster}
        out["total_clusters"] = len(valid)

        narratives = []
        cat_dist: dict[str, int] = {}
        for topic, articles in sorted(valid.items(), key=lambda x: -len(x[1])):
            # Aggregar
            sentiments = [a["sentiment"] for a in articles if a["sentiment"]]
            sent_counter: dict[str, int] = {}
            for s in sentiments:
                sent_counter[s] = sent_counter.get(s, 0) + 1
            dominant_sent = max(sent_counter.items(), key=lambda x: x[1])[0] if sent_counter else "neutro"
            sent_polarity = sent_counter.get("positivo", 0) - sent_counter.get("negativo", 0)
            avg_relevance = sum(a["relevance"] for a in articles if a["relevance"]) / max(1, sum(1 for a in articles if a["relevance"]))

            # Impactos España
            high_impact = sum(1 for a in articles if a["spain_impact"] in ("alto", "critico"))

            # Categorías originales más frecuentes
            cat_counter: dict[str, int] = {}
            for a in articles:
                if a.get("category_orig"):
                    cat_counter[a["category_orig"]] = cat_counter.get(a["category_orig"], 0) + 1
            orig_cat = max(cat_counter.items(), key=lambda x: x[1])[0] if cat_counter else None

            sample_summary = next((a["summary"] for a in articles if a.get("summary")), "")
            category = _categorize(topic, sample_summary, orig_cat)
            cat_dist[category] = cat_dist.get(category, 0) + 1

            # Entidades agregadas (merge top 5)
            personas: dict[str, int] = {}
            organizaciones: dict[str, int] = {}
            for a in articles:
                ent = a.get("entities") or {}
                if isinstance(ent, dict):
                    for p in (ent.get("personas") or [])[:8]:
                        personas[p] = personas.get(p, 0) + 1
                    for o in (ent.get("organizaciones") or [])[:8]:
                        organizaciones[o] = organizaciones.get(o, 0) + 1

            top_personas = sorted(personas.items(), key=lambda x: -x[1])[:5]
            top_orgs = sorted(organizaciones.items(), key=lambda x: -x[1])[:5]

            # Geografía: contar países
            country_counter: dict[str, int] = {}
            for a in articles:
                if a.get("source_country"):
                    country_counter[a["source_country"]] = country_counter.get(a["source_country"], 0) + 1

            # Velocity: artículos en último 24h vs 24h-72h
            now = datetime.now()
            recent_24h = sum(1 for a in articles if a.get("scraped_at") and (now - datetime.fromisoformat(a["scraped_at"].replace("Z", "+00:00") if a["scraped_at"].endswith("Z") else a["scraped_at"]).replace(tzinfo=None)).total_seconds() < 86400)
            velocity = "subiendo" if recent_24h > len(articles) / 2 else "estable" if recent_24h > 0 else "bajando"

            # Top 3 artículos representativos (mayor relevancia)
            sorted_articles = sorted(articles, key=lambda a: (a.get("relevance") or 0), reverse=True)
            samples = [{
                "id":         a["id"],
                "title":      a["title"],
                "source":     a["source_name"],
                "summary":    (a.get("summary") or "")[:200],
                "sentiment":  a["sentiment"],
                "relevance":  a["relevance"],
                "spain_impact": a["spain_impact"],
            } for a in sorted_articles[:3]]

            narrative = {
                "topic":              topic,
                "category":           category,
                "n_articles":         len(articles),
                "n_sources":          len({a["source_name"] for a in articles}),
                "dominant_sentiment": dominant_sent,
                "sentiment_polarity": sent_polarity,
                "avg_relevance":      round(avg_relevance, 1),
                "high_impact_count":  high_impact,
                "velocity":           velocity,
                "recent_24h":         recent_24h,
                "top_personas":       [{"name": n, "cnt": c} for n, c in top_personas],
                "top_orgs":           [{"name": n, "cnt": c} for n, c in top_orgs],
                "countries":          [{"name": n, "cnt": c} for n, c in sorted(country_counter.items(), key=lambda x: -x[1])[:5]],
                "samples":            samples,
                "first_seen":         min(a["scraped_at"] for a in articles if a["scraped_at"]) if any(a["scraped_at"] for a in articles) else None,
                "last_seen":          max(a["scraped_at"] for a in articles if a["scraped_at"]) if any(a["scraped_at"] for a in articles) else None,
            }

            # Si deep=True llamamos Ollama por narrativa con framework Entman
            if deep and len(articles) >= 2:
                framework = _entman_lakoff_analysis(topic, articles[:5])
                narrative["framework_analysis"] = framework

            narratives.append(narrative)

        # Ordenar por relevancia × volumen
        narratives.sort(key=lambda n: -(n["n_articles"] * (n["avg_relevance"] or 1) + n["high_impact_count"] * 5))

        out["narratives"] = narratives
        out["categories_dist"] = cat_dist
        return out
    except Exception as e:
        out["error"] = str(e)
        return out


def _entman_lakoff_analysis(topic: str, articles: list[dict]) -> dict[str, Any]:
    """Aplica el framework Entman + Lakoff via Ollama."""
    titles_summaries = "\n".join(
        f"- ({a.get('source_name', '?')}) {a['title']}: {(a.get('summary') or '')[:200]}"
        for a in articles
    )
    prompt = f"""Eres un analista de narrativas políticas con doctorado en CDA.
Aplica el framework de Entman (1993) + Lakoff (2004) a la siguiente narrativa emergente.

NARRATIVA: "{topic}"
ARTÍCULOS REPRESENTATIVOS:
{titles_summaries}

Responde SOLO con JSON válido. Análisis riguroso, conciso, en español.

{{
  "problem_definition":     "¿Qué problema construye esta narrativa? (1-2 frases)",
  "causal_interpretation":  "¿A quién/qué señala como causa? (1-2 frases)",
  "moral_evaluation":       "¿Qué juicio moral implícito emite? (1 frase)",
  "treatment_recommendation":"¿Qué solución sugiere o demanda? (1 frase)",
  "dominant_metaphor":      "Metáfora cognitiva subyacente (Lakoff): ej. 'guerra', 'familia', 'mercado', 'enfermedad'",
  "frame_label":            "Etiqueta breve del frame (3-5 palabras)",
  "actors_protagonist":     ["actor que aparece como héroe/víctima"],
  "actors_antagonist":      ["actor que aparece como villano/responsable"],
  "ideological_lean":       "izquierda|centro|derecha|transversal",
  "narrative_velocity":     "emergente|consolidada|en_declive",
  "counter_frame_suggested":"Cómo contraargumentar este frame (1 frase)",
  "strategic_recommendation":"Recomendación estratégica de comunicación (1 frase)"
}}"""

    try:
        with httpx.Client(timeout=OLLAMA_TIMEOUT) as cli:
            r = cli.post(f"{OLLAMA_BASE_URL}/api/generate", json={
                "model": _ollama_model(),
                "prompt": prompt,
                "format": "json",
                "stream": False,
                "options": {"temperature": 0.3},
            })
            if not r.is_success:
                return {"error": f"ollama {r.status_code}"}
            response = r.json().get("response", "")
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                # Try to extract JSON from response
                m = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response)
                if m:
                    try:
                        return json.loads(m.group())
                    except Exception:
                        return {"error": "json_parse_failed", "raw": response[:300]}
                return {"error": "no_json", "raw": response[:300]}
    except Exception as e:
        return {"error": str(e)[:200]}


@router.get("/categories")
def categories_distribution(hours_back: int = Query(72, ge=1, le=720)):
    """Distribución de noticias por macro-categoría."""
    out = {"distribution": {}, "categories": list(CATEGORY_KEYWORDS.keys()) + ["otros"]}
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT title, ai_summary, ai_category, COUNT(*) OVER ()
                    FROM news_articles
                    WHERE scraped_at > NOW() - (%s || ' hours')::interval
                """, [str(hours_back)])
                rows = cur.fetchall()
        dist: dict[str, int] = {}
        for r in rows:
            cat = _categorize(r[0] or "", r[1] or "", r[2])
            dist[cat] = dist.get(cat, 0) + 1
        out["distribution"] = dist
        out["total"] = sum(dist.values())
        return out
    except Exception as e:
        return {"error": str(e), **out}


@router.get("/by-region")
def narratives_by_region(hours_back: int = Query(72, ge=1, le=720)):
    """Narrativas geográficamente segmentadas: España (CCAA) + Europa (país)."""
    out = {"spain_ccaa": {}, "europe": {}}

    # Mapeo CCAA → keywords (para detectar mención de CCAA en titles/summaries)
    CCAA_KW: dict[str, list[str]] = {
        "Madrid":             ["madrid"],
        "Cataluña":           ["catalun", "catalan", "barcelona"],
        "Andalucía":          ["andaluc", "sevilla", "malaga", "granada"],
        "C. Valenciana":      ["valencia", "alicante", "castellon"],
        "Galicia":            ["galicia", "santiago", "coruña", "vigo"],
        "Castilla y León":    ["valladolid", "salamanca", "burgos", "leon", "castilla y leon"],
        "País Vasco":         ["vasco", "bilbao", "san sebastian", "donosti", "euskadi"],
        "Castilla-La Mancha": ["castilla-la mancha", "toledo", "albacete", "ciudad real"],
        "Canarias":           ["canari", "tenerife", "las palmas"],
        "Murcia":             ["murcia", "cartagena"],
        "Asturias":           ["asturias", "oviedo", "gijon"],
        "Extremadura":        ["extremad", "badajoz", "caceres"],
        "Aragón":             ["aragon", "zaragoza"],
        "Baleares":           ["balear", "mallorca", "palma", "menorca", "ibiza"],
        "Navarra":            ["navarra", "pamplona", "iruña"],
        "La Rioja":           ["rioja", "logroño"],
        "Cantabria":          ["cantabria", "santander"],
    }

    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                # Para cada CCAA, contar artículos que la mencionen + sentiment + top topics
                for ccaa, kws in CCAA_KW.items():
                    pattern = "|".join(kws)
                    cur.execute("""
                        SELECT
                            COUNT(*) AS n,
                            COUNT(*) FILTER (WHERE ai_sentiment='positivo') AS pos,
                            COUNT(*) FILTER (WHERE ai_sentiment='negativo') AS neg,
                            COUNT(*) FILTER (WHERE ai_sentiment='neutro') AS neu,
                            ARRAY(
                                SELECT topic FROM (
                                    SELECT unnest(ai_topics) AS topic
                                    FROM news_articles na2
                                    WHERE na2.scraped_at > NOW() - (%s || ' hours')::interval
                                      AND (na2.title ~* %s OR na2.ai_summary ~* %s OR na2.ai_geo_location ~* %s)
                                ) t
                                GROUP BY topic
                                ORDER BY COUNT(*) DESC
                                LIMIT 5
                            ) AS top_topics
                        FROM news_articles
                        WHERE scraped_at > NOW() - (%s || ' hours')::interval
                          AND (title ~* %s OR ai_summary ~* %s OR ai_geo_location ~* %s)
                    """, [str(hours_back), pattern, pattern, pattern, str(hours_back), pattern, pattern, pattern])
                    row = cur.fetchone()
                    if row and (row[0] or 0) > 0:
                        n = int(row[0])
                        out["spain_ccaa"][ccaa] = {
                            "n": n,
                            "pos": int(row[1] or 0),
                            "neg": int(row[2] or 0),
                            "neu": int(row[3] or 0),
                            "sent_score": round((int(row[1] or 0) - int(row[2] or 0)) / max(1, n), 2),
                            "top_topics": list(row[4] or [])[:5],
                        }

                # Europa: agregamos por source_country (source ya está clasificado)
                cur.execute("""
                    SELECT source_country, COUNT(*) AS n,
                           COUNT(*) FILTER (WHERE ai_sentiment='positivo') AS pos,
                           COUNT(*) FILTER (WHERE ai_sentiment='negativo') AS neg,
                           COUNT(*) FILTER (WHERE ai_spain_impact IN ('alto','critico')) AS spain_imp,
                           ARRAY_AGG(DISTINCT title ORDER BY title) FILTER (WHERE ai_relevance >= 6) AS sample_titles
                    FROM news_articles
                    WHERE scraped_at > NOW() - (%s || ' hours')::interval
                      AND source_country IS NOT NULL
                    GROUP BY source_country
                    ORDER BY n DESC
                """, [str(hours_back)])
                for r in cur.fetchall():
                    country = r[0]
                    out["europe"][country] = {
                        "n":          int(r[1]),
                        "pos":        int(r[2] or 0),
                        "neg":        int(r[3] or 0),
                        "spain_imp":  int(r[4] or 0),
                        "sample_titles": (r[5] or [])[:3],
                    }
        return out
    except Exception as e:
        return {"error": str(e), **out}


# ── On-demand deep analysis ───────────────────────────────────────────────────
class DeepAnalyzeRequest(BaseModel):
    topic: str
    hours_back: int = 168  # 1 week


@router.post("/deep-analyze")
def deep_analyze(req: DeepAnalyzeRequest):
    """Análisis profundo de UNA narrativa específica con framework Entman/Lakoff."""
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                pattern = req.topic.replace("_", " ").lower()
                cur.execute("""
                    SELECT title, ai_summary, source_name, ai_sentiment, ai_relevance, scraped_at
                    FROM news_articles
                    WHERE scraped_at > NOW() - (%s || ' hours')::interval
                      AND (
                        EXISTS (SELECT 1 FROM unnest(ai_topics) t WHERE LOWER(REPLACE(t, '_', ' ')) = %s)
                        OR title ~* %s OR ai_summary ~* %s
                      )
                    ORDER BY ai_relevance DESC NULLS LAST
                    LIMIT 8
                """, [str(req.hours_back), pattern, pattern, pattern])
                articles = [{
                    "title":   r[0],
                    "summary": r[1],
                    "source_name": r[2],
                    "sentiment": r[3],
                    "relevance": r[4],
                    "scraped_at": r[5].isoformat() if r[5] else None,
                } for r in cur.fetchall()]
        if not articles:
            return {"error": "no articles found for this narrative"}
        framework = _entman_lakoff_analysis(req.topic, articles)
        return {
            "topic":     req.topic,
            "n_articles": len(articles),
            "framework": framework,
            "samples":   articles[:5],
        }
    except Exception as e:
        return {"error": str(e)}
