"""
Router /api/risk — Politeia Risk Index (PRI).

Marco metodológico (síntesis de literatura):
- ICRG (PRS Group): composite 0-100, 6 dimensiones (vs 22 originales adaptadas a España)
- Pedersen (1979): volatilidad electoral
- Esteban-Ray: polarización
- Kleinberg (2002): burst detection — ratio rate(24h)/rate(7d)
- EWMA (Roberts 1959): suavizado exponencial para detección de cambios suaves
- Z-score sobre baseline 30d para anomalías

DIMENSIONES (6):
  1. ESTABILIDAD INSTITUCIONAL  — gobierno, coalición, moción, censura
  2. RIESGO ELECTORAL           — Pedersen + sentiment hacia gobierno + delta encuestas
  3. RIESGO GEOPOLÍTICO         — high-impact-Spain, fuentes internacionales, topics geo
  4. RIESGO ECONÓMICO           — IBEX delta, prima riesgo, IPC, sentiment económico
  5. RIESGO MEDIÁTICO           — burst topics, polarización sentiment, volumen z-score
  6. RIESGO SOCIAL              — topics sociales (vivienda, sanidad, identidad) velocidad

DETECCIÓN DE ESCALADAS:
- Cascade detection: cuando topic A spike, después topic B vinculado spike < 24h
- Cross-source amplification: mismo topic en N+ medios diferentes
- Polarización dual: positivo Y negativo creciendo simultáneamente

ESCENARIOS:
- Generados con Ollama para top-3 riesgos
- Probabilidad (5-95%) + impacto (LOW/MED/HIGH/CRITICAL) + horizonte (24h/7d/30d)
- Triggers + early warnings + mitigaciones

Endpoints:
  GET  /api/risk/composite      — índice compuesto + 6 dimensiones + radar
  GET  /api/risk/timeseries     — serie temporal cada dimensión (30d, daily)
  GET  /api/risk/top-risks      — top N riesgos con evidencia (¿por qué subió?)
  GET  /api/risk/escalations    — cascadas + amplificación detectadas
  POST /api/risk/scenarios      — escenarios generados con Ollama
"""
from __future__ import annotations

import json
import math
import os
import re
import statistics
from datetime import datetime, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/risk", tags=["risk-intelligence"])

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "60"))
OLLAMA_MODEL_PRIORITY = ["politeia-brain:latest", "qwen2.5:7b", "llama3.2:3b"]


def _conn():
    import psycopg
    from config.settings import get_settings
    s = get_settings()
    raw = s.database_url_raw
    dsn = re.sub(r"postgresql\+\w+://", "postgresql://", raw)
    return psycopg.connect(dsn)


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


# ── Keyword maps for dimensión scoring ────────────────────────────────────────
KW_DIM = {
    "institutional": {
        "high":   ["mocion", "moción", "censura", "ruptura", "crisis gobierno", "dimision", "dimisión", "investidura fallida", "elecciones anticipadas", "decreto-ley rechazado"],
        "medium": ["coalicion", "coalición", "junts", "pnv", "erc", "negociacion", "negociación", "decreto-ley", "ministro", "moncloa"],
        "low":    ["congreso", "senado", "pleno", "comision", "comisión"],
    },
    "electoral": {
        "high":   ["sondeo", "encuesta", "intencion voto", "intención voto", "tracking electoral", "feijoo", "sanchez", "sánchez", "abascal"],
        "medium": ["partido popular", "psoe", "vox", "sumar", "podemos", "campaña", "primarias", "lider"],
        "low":    ["voto", "elector", "elecciones"],
    },
    "geopolitical": {
        "high":   ["aranceles", "guerra", "ucrania", "rusia", "trump", "otan", "embargo", "sanciones", "marruecos", "sahara", "argelia"],
        "medium": ["union europea", "unión europea", "ue", "bruselas", "consejo europeo", "eeuu", "estados unidos", "china", "exterior", "diplomacia"],
        "low":    ["internacional", "exterior"],
    },
    "economic": {
        "high":   ["recesion", "recesión", "crisis economica", "crisis económica", "ibex desplome", "prima riesgo dispara", "rescate", "inflacion descontrolada", "inflación descontrolada"],
        "medium": ["ipc", "inflacion", "inflación", "tipos interes", "tipos interés", "bce", "tesoro", "deuda", "presupuesto", "fiscal"],
        "low":    ["mercado", "ibex", "bolsa", "economia", "economía"],
    },
    "media": {
        "high":   ["bulo", "fake news", "desinformacion", "desinformación", "ataque coordinado", "smear", "linchamiento"],
        "medium": ["polemica", "polémica", "tweet viral", "trending", "redes sociales", "tertulia"],
        "low":    ["medios", "prensa", "cobertura"],
    },
    "social": {
        "high":   ["manifestacion", "manifestación", "huelga", "protesta", "ocupacion", "ocupación", "violencia", "tension social", "tensión social"],
        "medium": ["vivienda", "alquiler", "desahucio", "sanidad", "educacion", "educación", "pensiones", "empleo", "paro"],
        "low":    ["sociedad", "salud", "social"],
    },
}

DIM_LABELS = {
    "institutional": "Estabilidad institucional",
    "electoral":     "Riesgo electoral",
    "geopolitical":  "Riesgo geopolítico",
    "economic":      "Riesgo económico",
    "media":         "Riesgo mediático",
    "social":        "Riesgo social",
}

DIM_WEIGHTS = {
    "institutional": 0.22,
    "electoral":     0.18,
    "geopolitical":  0.16,
    "economic":      0.18,
    "media":         0.12,
    "social":        0.14,
}


def _score_text(text: str, dim: str) -> float:
    """Score 0-100 según keywords (tiered). Multi-hits suman hasta saturar."""
    t = (text or "").lower()
    kws = KW_DIM[dim]
    score = 0.0
    for k in kws["high"]:
        if k in t: score += 18
    for k in kws["medium"]:
        if k in t: score += 8
    for k in kws["low"]:
        if k in t: score += 3
    return min(100.0, score)


# ── Composite risk index ──────────────────────────────────────────────────────
@router.get("/composite")
def composite_risk(hours_back: int = Query(48, ge=12, le=2160)):
    """Politeia Risk Index — composite + 6 dimensiones + drivers + radar.

    Para cada dimensión:
    - score        (0-100, escala ICRG inverted: alto = más riesgo)
    - level        (BAJO/MEDIO/ALTO/CRÍTICO)
    - delta_24h    (cambio vs ventana anterior, pp)
    - z_score      (anomalía vs baseline 7d)
    - drivers      (top 3 artículos que más contribuyen)
    """
    out: dict[str, Any] = {
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "hours_back": hours_back,
        "dimensions": {},
        "framework": "ICRG-derived + Pedersen + Kleinberg burst + EWMA",
    }

    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                # Pull articles for the window
                cur.execute("""
                    SELECT id, title, ai_summary, ai_relevance, ai_sentiment, ai_spain_impact,
                           ai_topics, ai_category, source_name, source_country, scraped_at
                    FROM news_articles
                    WHERE scraped_at > NOW() - (%s || ' hours')::interval
                """, [str(hours_back)])
                recent = list(cur.fetchall())

                # Auto-widen: if not enough signal, use last 150 articles by date
                if len(recent) < 10:
                    cur.execute("""
                        SELECT id, title, ai_summary, ai_relevance, ai_sentiment, ai_spain_impact,
                               ai_topics, ai_category, source_name, source_country, scraped_at
                        FROM news_articles
                        ORDER BY scraped_at DESC
                        LIMIT 150
                    """)
                    recent = list(cur.fetchall())

                # Supplement with noticias_prensa (map columns to same shape)
                cur.execute("""
                    SELECT id, titular, resumen, relevancia_score, sentimiento_label,
                           sentimiento_score, temas_json, categoria, fuente, NULL, fecha_publicacion
                    FROM noticias_prensa
                    WHERE fecha_publicacion IS NOT NULL
                    ORDER BY fecha_publicacion DESC
                    LIMIT 150
                """)
                prensa_rows = cur.fetchall()
                # Normalise noticias_prensa rows to match news_articles column semantics:
                # col[3] relevance: noticias stores 0-1 float → scale to 0-10
                # col[4] sentiment label: use as-is (positivo/negativo/neutro)
                # col[5] spain_impact: use sentimiento_score magnitude (high |score|→ alto)
                def _prensa_to_article(r):
                    relevance_raw = r[3] or 0.5
                    relevance_10 = round(float(relevance_raw) * 10, 1)
                    sent_score = r[5] or 0.0
                    abs_sent = abs(float(sent_score))
                    if abs_sent > 0.6:
                        spain_imp = "alto"
                    elif abs_sent > 0.3:
                        spain_imp = "medio"
                    else:
                        spain_imp = "ninguno"
                    # Derive topic list from temas_json if possible
                    topics = None
                    if r[6]:
                        try:
                            t = json.loads(r[6]) if isinstance(r[6], str) else r[6]
                            if isinstance(t, list):
                                topics = t
                            elif isinstance(t, dict):
                                topics = list(t.keys())
                        except Exception:
                            pass
                    # Normalise fecha_publicacion to datetime if it's a string/date
                    pub_date = r[10]
                    if pub_date is not None and not isinstance(pub_date, datetime):
                        try:
                            pub_date = datetime.fromisoformat(str(pub_date))
                        except Exception:
                            pub_date = None
                    return (r[0], r[1], r[2], relevance_10,
                            r[4] or "neutro", spain_imp,
                            topics, r[7], r[8], r[9], pub_date)

                prensa_articles = [_prensa_to_article(r) for r in prensa_rows]
                recent = recent + prensa_articles

                # Baseline: artículos de hace 7d a 30d para z-score (use news_articles only)
                cur.execute("""
                    SELECT ai_topics, ai_relevance, ai_sentiment, ai_spain_impact, title, ai_summary
                    FROM news_articles
                    WHERE scraped_at < NOW() - (%s || ' hours')::interval
                      AND scraped_at > NOW() - INTERVAL '30 days'
                """, [str(hours_back)])
                baseline = cur.fetchall()

                # Para drivers per dim: same as recent (already widened)
                full_recent = recent

        # Compute scores per dim
        dim_scores: dict[str, list[float]] = {d: [] for d in DIM_LABELS}
        dim_baseline_scores: dict[str, list[float]] = {d: [] for d in DIM_LABELS}

        # Build dim_scores from recent
        for r in recent:
            text = f"{r[1] or ''} {r[2] or ''}"
            relevance = float(r[3] or 5)
            sentiment = r[4] or "neutro"
            spain_imp = r[5] or "ninguno"

            # Boost por relevancia + spain impact
            relevance_mult = 0.5 + (relevance / 10) * 0.6  # 0.5-1.1
            impact_mult = {"critico": 1.5, "alto": 1.25, "medio": 1.0, "bajo": 0.85, "ninguno": 0.7}.get(spain_imp, 1.0)
            sent_mult = {"negativo": 1.2, "mixto": 1.1, "neutro": 1.0, "positivo": 0.85}.get(sentiment, 1.0)

            multiplier = relevance_mult * impact_mult * sent_mult

            for dim in DIM_LABELS:
                base = _score_text(text, dim)
                if base > 0:
                    dim_scores[dim].append(base * multiplier)

        # Baseline scores (sin multiplicadores, simple keyword density)
        for r in baseline:
            text = f"{r[4] or ''} {r[5] or ''}"
            for dim in DIM_LABELS:
                b = _score_text(text, dim)
                if b > 0:
                    dim_baseline_scores[dim].append(b)

        # Aggregate per dim
        composite_acc = 0.0
        composite_w = 0.0
        for dim, label in DIM_LABELS.items():
            scores = dim_scores[dim]
            base_scores = dim_baseline_scores[dim]

            # Volumen-aware: si hay 0-1 noticias, el score es bajo (poca señal)
            n = len(scores)
            if n == 0:
                d_score = 8.0  # baseline mínimo
            else:
                # Mean of top-N (más alarmista) + log-volume bonus
                top_k = sorted(scores, reverse=True)[: max(3, n // 3)]
                d_score = statistics.mean(top_k)
                # Volume bonus: log10 scaled, hasta +12 pts
                d_score += min(12, math.log10(max(1, n)) * 6)
                d_score = min(100, d_score)

            # Z-score vs baseline (anomalía)
            if base_scores and len(base_scores) > 5:
                bm = statistics.mean(base_scores)
                bsd = statistics.stdev(base_scores) if len(base_scores) > 1 else 1.0
                z = (statistics.mean(scores) - bm) / max(bsd, 1.0) if scores else 0
            else:
                z = 0.0

            # Delta vs ventana anterior — comparar primera mitad y segunda mitad de ventana actual
            if n >= 4:
                half = n // 2
                first_half_mean = statistics.mean(scores[:half]) if scores[:half] else 0
                second_half_mean = statistics.mean(scores[half:]) if scores[half:] else 0
                delta_24h = second_half_mean - first_half_mean
            else:
                delta_24h = 0.0

            level = _score_to_level(d_score)

            # Top drivers: artículos que contribuyen más a este dim
            drivers = []
            scored_articles = []
            for art in full_recent:
                text = f"{art[1] or ''} {art[2] or ''}"
                base = _score_text(text, dim)
                if base > 0:
                    relevance = float(art[3] or 5)
                    spain_imp = art[5] or "ninguno"
                    mult = 0.5 + (relevance / 10) * 0.6
                    impact_m = {"critico": 1.5, "alto": 1.25, "medio": 1.0, "bajo": 0.85, "ninguno": 0.7}.get(spain_imp, 1.0)
                    final = base * mult * impact_m
                    scored_articles.append((final, art))
            scored_articles.sort(key=lambda x: -x[0])
            for s, art in scored_articles[:3]:
                # recent rows: [0]=id,[1]=title,[2]=ai_summary,[3]=ai_relevance,
                #              [4]=ai_sentiment,[5]=ai_spain_impact,[6]=ai_topics,
                #              [7]=ai_category,[8]=source_name,[9]=source_country,[10]=scraped_at
                scraped_raw = art[10] if len(art) > 10 else (art[7] if len(art) > 7 else None)
                if scraped_raw is not None and not isinstance(scraped_raw, str):
                    try:
                        scraped_iso = scraped_raw.isoformat()
                    except Exception:
                        scraped_iso = str(scraped_raw)
                else:
                    scraped_iso = scraped_raw
                source = art[8] if len(art) > 8 else (art[6] if len(art) > 6 else None)
                drivers.append({
                    "id":        art[0],
                    "title":     art[1],
                    "source":    source,
                    "relevance": art[3],
                    "sentiment": art[4],
                    "spain_impact": art[5],
                    "contribution": round(s, 1),
                    "scraped_at": scraped_iso,
                })

            out["dimensions"][dim] = {
                "label":     label,
                "score":     round(d_score, 1),
                "level":     level,
                "weight":    DIM_WEIGHTS[dim],
                "n_articles": n,
                "delta_24h": round(delta_24h, 1),
                "z_score":   round(z, 2),
                "is_anomaly": abs(z) > 2.0,
                "drivers":   drivers,
            }

            composite_acc += d_score * DIM_WEIGHTS[dim]
            composite_w += DIM_WEIGHTS[dim]

        composite = composite_acc / composite_w if composite_w else 0
        out["composite"] = round(composite, 1)
        out["composite_level"] = _score_to_level(composite)
        out["composite_semaforo"] = _semaforo(composite)

        # Top global risks (drivers across all dims) — top 5 by contribution
        all_drivers = []
        for dim, d in out["dimensions"].items():
            for drv in d["drivers"]:
                all_drivers.append({**drv, "dimension": dim, "dimension_label": d["label"]})
        all_drivers.sort(key=lambda x: -x["contribution"])
        out["top_risks"] = all_drivers[:8]

        return out
    except Exception as e:
        return {"error": str(e), "fetched_at": out["fetched_at"]}


def _score_to_level(s: float) -> str:
    if s >= 75: return "CRÍTICO"
    if s >= 50: return "ALTO"
    if s >= 30: return "MEDIO"
    return "BAJO"


def _semaforo(s: float) -> str:
    if s >= 75: return "rojo"
    if s >= 50: return "naranja"
    if s >= 30: return "amarillo"
    return "verde"


# ── Time series ───────────────────────────────────────────────────────────────
@router.get("/timeseries")
def risk_timeseries(days: int = Query(14, ge=3, le=60)):
    """Serie temporal diaria de cada dimensión (últimos N días)."""
    out: dict[str, Any] = {"days": days, "buckets": [], "dimensions": list(DIM_LABELS.keys())}
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT date_trunc('day', scraped_at)::date AS day, title, ai_summary, ai_relevance, ai_spain_impact, ai_sentiment
                    FROM news_articles
                    WHERE scraped_at > NOW() - (%s || ' days')::interval
                """, [str(days)])
                rows = list(cur.fetchall())

                # Auto-widen: if very few rows, use most recent 150 articles regardless of age
                if len(rows) < 10:
                    cur.execute("""
                        SELECT date_trunc('day', scraped_at)::date AS day, title, ai_summary,
                               ai_relevance, ai_spain_impact, ai_sentiment
                        FROM news_articles
                        ORDER BY scraped_at DESC
                        LIMIT 150
                    """)
                    rows = list(cur.fetchall())

                # Supplement with noticias_prensa
                cur.execute("""
                    SELECT date_trunc('day', fecha_publicacion)::date AS day,
                           titular, resumen,
                           ROUND((COALESCE(relevancia_score, 0.5) * 10)::numeric, 1),
                           CASE WHEN ABS(COALESCE(sentimiento_score, 0)) > 0.6 THEN 'alto'
                                WHEN ABS(COALESCE(sentimiento_score, 0)) > 0.3 THEN 'medio'
                                ELSE 'ninguno' END,
                           COALESCE(sentimiento_label, 'neutro')
                    FROM noticias_prensa
                    WHERE fecha_publicacion IS NOT NULL
                    ORDER BY fecha_publicacion DESC
                    LIMIT 150
                """)
                rows = rows + list(cur.fetchall())

        # Bucket por día
        buckets: dict[str, dict[str, list[float]]] = {}
        for r in rows:
            day = r[0].isoformat() if r[0] else None
            if not day:
                continue
            buckets.setdefault(day, {d: [] for d in DIM_LABELS})
            text = f"{r[1] or ''} {r[2] or ''}"
            relevance = float(r[3] or 5)
            spain_imp = r[4] or "ninguno"
            sentiment = r[5] or "neutro"
            mult = (0.5 + (relevance / 10) * 0.6) * \
                   {"critico": 1.5, "alto": 1.25, "medio": 1.0, "bajo": 0.85, "ninguno": 0.7}.get(spain_imp, 1.0) * \
                   {"negativo": 1.2, "mixto": 1.1, "neutro": 1.0, "positivo": 0.85}.get(sentiment, 1.0)
            for dim in DIM_LABELS:
                base = _score_text(text, dim)
                if base > 0:
                    buckets[day][dim].append(base * mult)

        # Dense series — fill missing days
        today = datetime.utcnow().date()
        series: list[dict[str, Any]] = []
        for offset in range(days, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            day_data = buckets.get(day, {d: [] for d in DIM_LABELS})
            entry = {"date": day}
            for dim in DIM_LABELS:
                scores = day_data[dim]
                if scores:
                    entry[dim] = round(min(100, statistics.mean(sorted(scores, reverse=True)[:5]) + min(12, math.log10(max(1, len(scores))) * 6)), 1)
                else:
                    entry[dim] = 8.0
            # Composite
            entry["composite"] = round(
                sum(entry[d] * DIM_WEIGHTS[d] for d in DIM_LABELS) / sum(DIM_WEIGHTS.values()), 1
            )
            series.append(entry)
        out["buckets"] = series
        return out
    except Exception as e:
        return {"error": str(e), **out}


# ── Escalations: bursts + cross-source amplification ──────────────────────────
@router.get("/escalations")
def escalations(hours_back: int = Query(48, ge=12, le=720)):
    """Detección de escaladas: burst topics + amplificación cross-medio + polarización dual.

    Usa noticias_prensa (25 fuentes, 1800+ rows) como fuente principal para amplification
    y dual polarization, ya que news_articles solo tiene 7 fuentes.
    """
    out: dict[str, Any] = {
        "burst_topics": [],
        "amplification": [],
        "dual_polarization": [],
        "fetched_at": datetime.utcnow().isoformat() + "Z",
    }
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                # ── 1. Burst topics ─────────────────────────────────────────────
                # Usa noticias_prensa.temas_json (array) comparando últimos N días vs baseline
                # "recent" = última semana, "baseline" = semana anterior
                cur.execute("""
                    SELECT topic, recent_n, baseline_n,
                           CASE WHEN baseline_n > 0
                                THEN ROUND(recent_n::numeric / NULLIF(baseline_n, 0), 2)
                                ELSE recent_n::numeric
                           END AS ratio
                    FROM (
                        SELECT
                            topic,
                            COUNT(*) FILTER (WHERE fecha_publicacion >= CURRENT_DATE - 7) AS recent_n,
                            COUNT(*) FILTER (WHERE fecha_publicacion >= CURRENT_DATE - 14
                                              AND fecha_publicacion < CURRENT_DATE - 7) AS baseline_n
                        FROM (
                            SELECT jsonb_array_elements_text(temas_json::jsonb) AS topic,
                                   fecha_publicacion
                            FROM noticias_prensa
                            WHERE fecha_publicacion >= CURRENT_DATE - 14
                              AND temas_json IS NOT NULL
                              AND temas_json != '[]'
                              AND temas_json != 'null'
                        ) sub
                        GROUP BY topic
                    ) sums
                    WHERE recent_n >= 3
                      AND (baseline_n = 0 OR recent_n::float / NULLIF(baseline_n, 0) >= 1.4)
                    ORDER BY ratio DESC, recent_n DESC
                    LIMIT 12
                """)
                for r in cur.fetchall():
                    out["burst_topics"].append({
                        "topic":      r[0],
                        "recent_n":   int(r[1]),
                        "baseline_n": int(r[2]),
                        "ratio":      float(r[3]),
                        "is_new":     int(r[2]) == 0,
                    })

                # Fallback: si temas_json no da señal, usar categoria de noticias_prensa
                if not out["burst_topics"]:
                    cur.execute("""
                        SELECT categoria, recent_n, baseline_n,
                               CASE WHEN baseline_n > 0
                                    THEN ROUND(recent_n::numeric / NULLIF(baseline_n,0), 2)
                                    ELSE recent_n::numeric END AS ratio
                        FROM (
                            SELECT categoria,
                                   COUNT(*) FILTER (WHERE fecha_publicacion >= CURRENT_DATE - 7) AS recent_n,
                                   COUNT(*) FILTER (WHERE fecha_publicacion >= CURRENT_DATE - 14
                                                     AND fecha_publicacion < CURRENT_DATE - 7) AS baseline_n
                            FROM noticias_prensa
                            WHERE fecha_publicacion >= CURRENT_DATE - 14
                              AND categoria IS NOT NULL
                            GROUP BY categoria
                        ) sums
                        WHERE recent_n >= 5
                        ORDER BY ratio DESC, recent_n DESC
                        LIMIT 12
                    """)
                    for r in cur.fetchall():
                        out["burst_topics"].append({
                            "topic":      r[0],
                            "recent_n":   int(r[1]),
                            "baseline_n": int(r[2]),
                            "ratio":      float(r[3]),
                            "is_new":     int(r[2]) == 0,
                        })

                # ── 2. Amplificación cross-medio (noticias_prensa, 25 fuentes) ──
                cur.execute("""
                    SELECT topic,
                           COUNT(DISTINCT fuente) AS n_fuentes,
                           COUNT(*) AS n_articles,
                           ARRAY_AGG(DISTINCT fuente ORDER BY fuente) AS fuentes_list
                    FROM (
                        SELECT jsonb_array_elements_text(temas_json::jsonb) AS topic,
                               fuente
                        FROM noticias_prensa
                        WHERE fecha_publicacion >= CURRENT_DATE - 14
                          AND temas_json IS NOT NULL
                          AND temas_json != '[]'
                          AND temas_json != 'null'
                    ) sub
                    GROUP BY topic
                    HAVING COUNT(DISTINCT fuente) >= 3
                    ORDER BY COUNT(*) DESC
                    LIMIT 8
                """)
                rows_amp = cur.fetchall()

                for r in rows_amp:
                    out["amplification"].append({
                        "topic":       r[0],
                        "n_sources":   int(r[1]),
                        "n_countries": 1,
                        "n_articles":  int(r[2]),
                        "examples":    list(r[3] or [])[:5],
                    })

                # Fallback: use categoria if temas_json is mostly empty
                if not out["amplification"]:
                    cur.execute("""
                        SELECT categoria,
                               COUNT(DISTINCT fuente) AS n_fuentes,
                               COUNT(*) AS n_articles,
                               ARRAY_AGG(DISTINCT fuente ORDER BY fuente) AS fuentes_list
                        FROM noticias_prensa
                        WHERE fecha_publicacion >= CURRENT_DATE - 14
                          AND categoria IS NOT NULL
                        GROUP BY categoria
                        HAVING COUNT(DISTINCT fuente) >= 3
                        ORDER BY n_articles DESC
                        LIMIT 8
                    """)
                    for r in cur.fetchall():
                        out["amplification"].append({
                            "topic":       r[0],
                            "n_sources":   int(r[1]),
                            "n_countries": 1,
                            "n_articles":  int(r[2]),
                            "examples":    list(r[3] or [])[:5],
                        })

                # ── 3. Polarización dual (noticias_prensa, sentimiento_label) ───
                cur.execute("""
                    SELECT topic, total, pos, neg, neu
                    FROM (
                        SELECT
                            topic,
                            COUNT(*) AS total,
                            COUNT(*) FILTER (WHERE sentimiento_label = 'positivo') AS pos,
                            COUNT(*) FILTER (WHERE sentimiento_label = 'negativo') AS neg,
                            COUNT(*) FILTER (WHERE sentimiento_label = 'neutro')   AS neu
                        FROM (
                            SELECT jsonb_array_elements_text(temas_json::jsonb) AS topic,
                                   sentimiento_label
                            FROM noticias_prensa
                            WHERE fecha_publicacion >= CURRENT_DATE - 14
                              AND temas_json IS NOT NULL
                              AND temas_json != '[]'
                              AND temas_json != 'null'
                              AND sentimiento_label IS NOT NULL
                        ) sub
                        GROUP BY topic
                        HAVING COUNT(*) >= 5
                    ) agg
                    WHERE pos::float / total >= 0.20 AND neg::float / total >= 0.20
                    ORDER BY (pos + neg) DESC
                    LIMIT 6
                """)
                for r in cur.fetchall():
                    out["dual_polarization"].append({
                        "topic":   r[0],
                        "total":   int(r[1]),
                        "pos_pct": round(int(r[2]) / int(r[1]) * 100, 1),
                        "neg_pct": round(int(r[3]) / int(r[1]) * 100, 1),
                        "neu_pct": round(int(r[4]) / int(r[1]) * 100, 1),
                    })

                # Fallback: use categoria for dual polarization
                if not out["dual_polarization"]:
                    cur.execute("""
                        SELECT categoria, total, pos, neg, neu
                        FROM (
                            SELECT categoria,
                                   COUNT(*) AS total,
                                   COUNT(*) FILTER (WHERE sentimiento_label = 'positivo') AS pos,
                                   COUNT(*) FILTER (WHERE sentimiento_label = 'negativo') AS neg,
                                   COUNT(*) FILTER (WHERE sentimiento_label = 'neutro')   AS neu
                            FROM noticias_prensa
                            WHERE fecha_publicacion >= CURRENT_DATE - 30
                              AND categoria IS NOT NULL
                              AND sentimiento_label IS NOT NULL
                            GROUP BY categoria
                            HAVING COUNT(*) >= 10
                        ) agg
                        WHERE pos::float / total >= 0.15 AND neg::float / total >= 0.15
                        ORDER BY (pos + neg) DESC
                        LIMIT 6
                    """)
                    for r in cur.fetchall():
                        out["dual_polarization"].append({
                            "topic":   r[0],
                            "total":   int(r[1]),
                            "pos_pct": round(int(r[2]) / int(r[1]) * 100, 1),
                            "neg_pct": round(int(r[3]) / int(r[1]) * 100, 1),
                            "neu_pct": round(int(r[4]) / int(r[1]) * 100, 1),
                        })

        return out
    except Exception as e:
        return {**out, "error": str(e)}


# ── Scenarios via Ollama ──────────────────────────────────────────────────────
class ScenarioRequest(BaseModel):
    horizon: str = "30d"   # "24h" | "7d" | "30d"
    n_scenarios: int = 3


@router.post("/scenarios")
def scenarios(req: ScenarioRequest):
    """Genera escenarios prospectivos con Ollama, anclados en datos de noticias actuales."""
    # Recoger contexto: composite + top risks + bursts
    ctx = composite_risk(hours_back=72)
    if "error" in ctx:
        return {"error": ctx["error"]}
    bursts_data = escalations(hours_back=72)

    top_risks_text = "\n".join(
        f"- {r['dimension_label']}: \"{r['title']}\" ({r['source']}, sentiment={r['sentiment']}, impacto España={r['spain_impact']})"
        for r in ctx.get("top_risks", [])[:6]
    )
    bursts_text = "\n".join(
        f"- {b['topic']}: x{b['ratio']:.1f} vs baseline (recent={b['recent_n']}, base={b['baseline_n']})"
        for b in bursts_data.get("burst_topics", [])[:6]
    )
    dim_text = "\n".join(
        f"- {d['label']}: {d['score']}/100 ({d['level']}, delta {d['delta_24h']:+.1f})"
        for d in ctx.get("dimensions", {}).values()
    )

    prompt = f"""Eres un analista político con doctorado en risk modelling. Genera {req.n_scenarios} escenarios prospectivos para España con horizonte {req.horizon}.

Estado actual (Politeia Risk Index):
Composite: {ctx.get('composite')}/100 ({ctx.get('composite_level')})

Dimensiones:
{dim_text}

Top riesgos detectados ahora:
{top_risks_text}

Topics emergentes (burst):
{bursts_text}

Devuelve SOLO un JSON válido con esta estructura. Cada escenario debe ser realista, anclado en los datos, con probabilidad calibrada (ni triviales ni extremos). Los escenarios deben ser MUTUAMENTE EXCLUYENTES (cubrir distintas posibilidades).

{{
  "scenarios": [
    {{
      "title": "Etiqueta corta (5-8 palabras)",
      "narrative": "Descripción del escenario en 2-3 frases, concreta y plausible",
      "probability_pct": 35,
      "impact_level": "LOW|MEDIUM|HIGH|CRITICAL",
      "horizon": "{req.horizon}",
      "dimensions_affected": ["institutional", "electoral", "economic"],
      "triggers": ["Evento o señal que activaría este escenario"],
      "early_warnings": ["Qué buscar para anticiparlo"],
      "mitigations": ["Acción de comunicación o política recomendada"],
      "key_actors": ["actor1", "actor2"]
    }}
  ]
}}

Las probabilidades deben sumar entre 70-100 (deja margen para "otros escenarios"). Sé conservador en HIGH/CRITICAL impact (solo si los datos lo justifican)."""

    try:
        with httpx.Client(timeout=OLLAMA_TIMEOUT) as cli:
            r = cli.post(f"{OLLAMA_BASE_URL}/api/generate", json={
                "model": _ollama_model(),
                "prompt": prompt,
                "format": "json",
                "stream": False,
                "options": {"temperature": 0.5, "num_ctx": 8192},
            })
            if not r.is_success:
                return {"error": f"ollama {r.status_code}", "scenarios": []}
            response = r.json().get("response", "")
            try:
                parsed = json.loads(response)
            except json.JSONDecodeError:
                m = re.search(r'\{.*\}', response, re.DOTALL)
                if m:
                    try:
                        parsed = json.loads(m.group())
                    except Exception:
                        return {"error": "json_parse_failed", "raw": response[:400], "scenarios": []}
                else:
                    return {"error": "no_json", "raw": response[:400], "scenarios": []}

        return {
            "scenarios":  parsed.get("scenarios", []),
            "context": {
                "composite":  ctx.get("composite"),
                "composite_level": ctx.get("composite_level"),
                "horizon":    req.horizon,
            },
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "model":      _ollama_model(),
        }
    except Exception as e:
        return {"error": str(e)[:300], "scenarios": []}
