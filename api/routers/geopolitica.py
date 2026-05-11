"""
Router /api/geopolitica — Inteligencia Geopolítica en tiempo real.

Fuentes de datos (prioridad):
1. noticias_prensa  — 2100+ artículos españoles hasta HOY, keywords internacionales
2. news_articles    — 100 artículos internacionales (UK/Spain), auto-widen 30d
3. GDELT API        — feed mundial en tiempo real (cacheado 30 min, rate-limited)

Endpoints:
- /riesgo           → riesgo país calculado desde noticias_prensa
- /events           → eventos internacionales recientes (multi-fuente)
- /presencia        → presencia España en el mundo (extraída de noticias)
- /kpis             → KPIs geopolíticos del día
- /stats            → alias /kpis + conteos adicionales
- /osint            → feed OSINT (noticias internacionales filtradas)
- /alertas          → alertas de alta urgencia
- /impactos         → impactos domésticos de geopolítica
- /think-tanks      → análisis cualitativos de fuentes premium
- /ccaa             → datos CCAA (stub, sin datos disponibles)
- /gdelt-events     → feed GDELT directo (con caché)
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta
from typing import Any, Optional

import requests

_log = logging.getLogger(__name__)

from fastapi import APIRouter, Depends
from sqlalchemy import text

from api.dependencies import get_db

router = APIRouter(prefix="/geopolitica", tags=["geopolitica"])

# ── GDELT in-memory cache ─────────────────────────────────────────────────────
_GDELT_CACHE: dict[str, tuple[float, Any]] = {}   # key → (ts, data)
_GDELT_TTL  = 1800  # 30 min
_GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc"
_GDELT_LAST_CALL: float = 0.0
_GDELT_MIN_INTERVAL = 6.0   # seconds between calls


def _gdelt_fetch(keyword: str, hours: int = 48, maxrecords: int = 15) -> list[dict]:
    """Fetch from GDELT with in-memory cache and rate limiting."""
    global _GDELT_LAST_CALL
    cache_key = f"{keyword}:{hours}:{maxrecords}"
    now = time.time()

    # Serve from cache if fresh
    if cache_key in _GDELT_CACHE:
        ts, data = _GDELT_CACHE[cache_key]
        if now - ts < _GDELT_TTL:
            return data

    # Rate limit: wait if called too recently
    elapsed = now - _GDELT_LAST_CALL
    if elapsed < _GDELT_MIN_INTERVAL:
        return _GDELT_CACHE.get(cache_key, (0, []))[1]   # stale cache OK

    _GDELT_LAST_CALL = now
    params = {
        "query":      keyword,
        "mode":       "artlist",
        "maxrecords": maxrecords,
        "format":     "json",
        "timespan":   f"{hours}H",
        "sort":       "DateDesc",
    }
    try:
        resp = requests.get(_GDELT_BASE, params=params, timeout=8)
        if resp.status_code == 429:
            _log.warning("GDELT rate limited")
            return _GDELT_CACHE.get(cache_key, (0, []))[1]
        resp.raise_for_status()
        payload = resp.json()
        articles = payload.get("articles") or []
        events = []
        for art in articles[:maxrecords]:
            events.append({
                "title":        art.get("title", "")[:160],
                "description":  art.get("title", ""),
                "url":          art.get("url"),
                "source":       art.get("domain", "GDELT"),
                "country":      art.get("sourcecountry", "Internacional"),
                "type":         "Internacional",
                "date":         art.get("seendate", ""),
                "impact":       60,
                "spain_impact": "medio",
            })
        _GDELT_CACHE[cache_key] = (now, events)
        return events
    except Exception as exc:
        _log.warning("GDELT fetch failed: %s", exc)
        return _GDELT_CACHE.get(cache_key, (0, []))[1]


# ── Country keyword mapping (for noticias_prensa extraction) ──────────────────
COUNTRY_KEYWORDS: dict[str, dict] = {
    "Rusia":          {"code": "RU", "kw": ["Rusia", "ruso", "rusa", "Kremlin", "Moscú", "Putin", "Wagner"], "structural_risk": 78},
    "Ucrania":        {"code": "UA", "kw": ["Ucrania", "ucraniano", "ucraniana", "Zelenski", "Kiev", "Odesa", "Mariúpol"], "structural_risk": 88},
    "Israel":         {"code": "IL", "kw": ["Israel", "israelí", "Netanyahu", "Tel Aviv", "TSAHAL"], "structural_risk": 72},
    "Palestina":      {"code": "PS", "kw": ["Palestina", "palestino", "palestina", "Gaza", "Hamas", "Cisjordania", "UNRWA"], "structural_risk": 85},
    "Irán":           {"code": "IR", "kw": ["Irán", "iraní", "Teherán", "Khamenei", "Jamenei", "IRGC"], "structural_risk": 68},
    "China":          {"code": "CN", "kw": ["China", "chino", "china", "Pekín", "Xi Jinping", "PCCh", "Shanghái"], "structural_risk": 55},
    "Estados Unidos": {"code": "US", "kw": ["Estados Unidos", "Trump", "Biden", "Washington", "EE.UU.", "EEUU", "Casa Blanca", "Pentágono"], "structural_risk": 42},
    "Marruecos":      {"code": "MA", "kw": ["Marruecos", "marroquí", "marroquíes", "Rabat", "Mohamed VI", "Sahara Occidental"], "structural_risk": 48},
    "Argelia":        {"code": "DZ", "kw": ["Argelia", "argelino", "argelina", "Argel", "Tebboune"], "structural_risk": 45},
    "Turquía":        {"code": "TR", "kw": ["Turquía", "turco", "turca", "Erdogan", "Erdoğan", "Ankara"], "structural_risk": 52},
    "Venezuela":      {"code": "VE", "kw": ["Venezuela", "venezolano", "venezolana", "Maduro", "Caracas"], "structural_risk": 62},
    "Corea del Norte":{"code": "KP", "kw": ["Corea del Norte", "Kim Jong", "norcoreano", "Pyongyang"], "structural_risk": 78},
    "Siria":          {"code": "SY", "kw": ["Siria", "sirio", "siria", "Damasco", "Al Asad"], "structural_risk": 75},
    "Líbano":         {"code": "LB", "kw": ["Líbano", "libanés", "libanesa", "Beirut", "Hezbolá", "Hizbulá"], "structural_risk": 65},
    "Mali":           {"code": "ML", "kw": ["Mali", "Malí", "Sahel", "EUTM", "Bamako", "Wagner Sahel"], "structural_risk": 70},
    "Irak":           {"code": "IQ", "kw": ["Irak", "iraquí", "Bagdad", "Mosul", "kurdo", "kurdos"], "structural_risk": 60},
    "Afganistán":     {"code": "AF", "kw": ["Afganistán", "afgano", "afgana", "Kabul", "talibán"], "structural_risk": 80},
    "Myanmar":        {"code": "MM", "kw": ["Myanmar", "Birmania", "Rangún", "junta militar birmana"], "structural_risk": 72},
    "Arabia Saudí":   {"code": "SA", "kw": ["Arabia Saudí", "Arabia Saudi", "saudí", "Riad", "MBS", "OPEP"], "structural_risk": 40},
    "Taiwán":         {"code": "TW", "kw": ["Taiwán", "Taiwan", "Taipei", "estrecho de Taiwán"], "structural_risk": 60},
    "Francia":        {"code": "FR", "kw": ["Francia", "francés", "francesa", "París", "Macron", "Élysée"], "structural_risk": 28},
    "Alemania":       {"code": "DE", "kw": ["Alemania", "alemán", "alemana", "Berlín", "Scholz", "Bundestag"], "structural_risk": 18},
    "Reino Unido":    {"code": "GB", "kw": ["Reino Unido", "British", "Sunak", "Londres", "Brexit"], "structural_risk": 22},
    "México":         {"code": "MX", "kw": ["México", "mexicano", "mexicana", "Ciudad de México", "Sheinbaum"], "structural_risk": 48},
}


def _all_country_kw_cond() -> str:
    """Build word-boundary condition matching any country keyword from COUNTRY_KEYWORDS.

    Uses _kw_cond for each country's first 2 keywords to avoid false positives.
    Also includes key multi-word geopolitical phrases.
    """
    all_kw: list[str] = []
    for cfg in COUNTRY_KEYWORDS.values():
        all_kw.extend(cfg["kw"][:2])
    # Add unambiguous multi-word geopolitical terms
    all_kw += [
        "Estados Unidos", "Corea del Norte", "Arabia Saudí",
        "OTAN", "NATO", "política exterior", "diplomacia exterior",
        "Unión Europea", "misión militar",
    ]
    return _kw_cond(all_kw)


def _build_country_query(lookback_days: int = 30) -> str:
    """Build SQL for extracting per-country article counts from noticias_prensa."""
    return f"""
        WITH period AS (
            SELECT
                titular,
                sentimiento_score,
                fecha_publicacion,
                fuente
            FROM noticias_prensa
            WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '{lookback_days} days'
        ),
        prev AS (
            SELECT titular, sentimiento_score
            FROM noticias_prensa
            WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '{lookback_days * 2} days'
              AND fecha_publicacion < CURRENT_DATE - INTERVAL '{lookback_days} days'
        )
        SELECT
            COUNT(*) AS n_recent,
            (SELECT COUNT(*) FROM prev) AS n_prev,
            AVG(sentimiento_score) AS avg_sent
        FROM period
    """


def _kw_cond(kw_list: list[str]) -> str:
    """Build word-boundary-aware conditions for noticias_prensa.titular.

    For single-word keywords, uses PostgreSQL regex with space/start/end anchors
    to avoid false positives (e.g. 'Irán' matching 'vivirán').
    For multi-word keywords, uses ILIKE substring (space context prevents ambiguity).
    """
    parts = []
    for kw in kw_list:
        if " " in kw:
            # Multi-word: substring match is fine
            escaped = kw.replace("'", "''")
            parts.append(f"titular ILIKE '%{escaped}%'")
        else:
            # Single word: require word boundary via regex
            # Only escape chars that are special in PostgreSQL POSIX regex
            escaped = (kw
                .replace("'", "''")      # SQL escape
                .replace("\\", "\\\\")   # regex backslash
                .replace(".", "\\.")     # regex dot
                .replace("+", "\\+")     # regex plus
                .replace("(", "\\(")
                .replace(")", "\\)")
            )
            # Anchor: preceded by space/start, followed by space/punctuation/end
            parts.append(
                f"titular ~* '(^|[[:space:]]){escaped}([[:space:]]|[,.:;!?]|$)'"
            )
    return " OR ".join(parts) if parts else "FALSE"


def _get_country_articles(db: Any, country_cfg: dict, days: int = 30) -> dict:
    """Get article counts and sentiment for a country from noticias_prensa."""
    kw_list = country_cfg["kw"]
    # Build word-boundary conditions
    conditions = _kw_cond(kw_list)
    try:
        row = db.execute(text(f"""
            SELECT
                COUNT(*) FILTER (WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '{days} days') AS n_recent,
                COUNT(*) FILTER (WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '{days * 2} days'
                                   AND fecha_publicacion < CURRENT_DATE - INTERVAL '{days} days') AS n_prev,
                AVG(sentimiento_score) FILTER (WHERE fecha_publicacion >= CURRENT_DATE - INTERVAL '{days} days') AS avg_sent,
                COUNT(*) FILTER (WHERE sentimiento_score < -0.3
                                   AND fecha_publicacion >= CURRENT_DATE - INTERVAL '{days} days') AS n_neg
            FROM noticias_prensa
            WHERE ({conditions})
        """)).mappings().fetchone()
        return {
            "n_recent": int(row["n_recent"] or 0),
            "n_prev":   int(row["n_prev"] or 0),
            "avg_sent": float(row["avg_sent"] or 0.0),
            "n_neg":    int(row["n_neg"] or 0),
        }
    except Exception:
        return {"n_recent": 0, "n_prev": 0, "avg_sent": 0.0, "n_neg": 0}


# ── /riesgo — country risk from noticias_prensa ───────────────────────────────
@router.get("/riesgo")
def country_risk(db=Depends(get_db)) -> list[dict[str, Any]]:
    """
    Riesgo país calculado dinámicamente desde noticias_prensa.
    Fórmula: risk = structural_risk * 0.35 + news_intensity * 0.65
    news_intensity = min(100, n_articles*3 + n_neg*5 + neg_sentiment*20)
    """
    out: list[dict] = []
    days = 30  # look at last 30 days of noticias

    for cname, cfg in COUNTRY_KEYWORDS.items():
        stats = _get_country_articles(db, cfg, days=days)
        n = stats["n_recent"]
        n_prev = stats["n_prev"]
        n_neg = stats["n_neg"]
        avg_sent = stats["avg_sent"]
        struct = cfg["structural_risk"]

        # News intensity: articles * coverage, negative sentiment amplifies
        if n > 0:
            intensity = min(100, n * 3 + n_neg * 5 + max(0, -avg_sent) * 20)
            # Composite: structural floor + news signal
            risk = round(struct * 0.35 + intensity * 0.65)
        else:
            # No news: use structural risk alone (lower weight, less certain)
            risk = round(struct * 0.6)

        # Trend delta
        delta = n - n_prev

        # Status from composite risk
        if risk >= 70:
            status = "war"
        elif risk >= 50:
            status = "tense"
        else:
            status = "watch"

        out.append({
            "code":           cfg["code"],
            "name":           cname,
            "risk":           max(0, min(100, risk)),
            "status":         status,
            "delta_7d":       delta,
            "n_articles_30d": n,
            "n_negative":     n_neg,
            "avg_sentiment":  round(avg_sent, 3),
            "structural_risk": struct,
            "has_data":       n > 0,
        })

    out.sort(key=lambda x: (-x["risk"], -x["n_articles_30d"]))
    return out[:20]


# Alias for old frontend
@router.get("/country-risk")
def country_risk_alias(db=Depends(get_db)) -> list[dict[str, Any]]:
    return country_risk(db)


# ── /events — eventos internacionales multi-fuente ────────────────────────────
@router.get("/events")
def geo_events(limit: int = 20, db=Depends(get_db)) -> dict[str, Any]:
    """
    Eventos internacionales recientes.
    Fuente 1: noticias_prensa con keywords internacionales (fresca, hasta hoy)
    Fuente 2: news_articles (auto-widen si stale)
    Fuente 3: GDELT (cacheado 30min)
    """
    events: list[dict] = []

    # ── Source 1: noticias_prensa internacional ───────────────────────────────
    try:
        # Use word-boundary aware conditions for all country keywords
        kw_conditions = _all_country_kw_cond()

        rows = db.execute(text(f"""
            SELECT titular, fuente, sentimiento_score, fecha_publicacion, resumen
            FROM noticias_prensa
            WHERE ({kw_conditions})
              AND fecha_publicacion >= CURRENT_DATE - INTERVAL '14 days'
            ORDER BY fecha_publicacion DESC
            LIMIT :limit
        """), {"limit": limit}).mappings().all()

        for r in rows:
            # Detect which country this is about
            titular = r.get("titular") or ""
            country = "Internacional"
            for cname, cfg in COUNTRY_KEYWORDS.items():
                if any(kw.lower() in titular.lower() for kw in cfg["kw"][:3]):
                    country = cname
                    break

            sent = float(r.get("sentimiento_score") or 0)
            impact = int(min(100, 50 + max(0, -sent) * 30 + 10))

            events.append({
                "date":        r["fecha_publicacion"].isoformat() if r["fecha_publicacion"] else None,
                "country":     country,
                "type":        "Noticias",
                "title":       titular,
                "description": r.get("resumen") or titular,
                "source":      r.get("fuente"),
                "impact":      impact,
                "spain_impact": "alto" if sent < -0.5 else "medio",
                "url":         None,
            })
    except Exception as e:
        _log.warning("noticias_prensa events error: %s", e)

    # ── Source 2: news_articles (auto-widen) ─────────────────────────────────
    if len(events) < limit // 2:
        try:
            # Try last 30 days
            rows2 = db.execute(text("""
                SELECT title, source_name, source_country,
                       ai_summary, ai_relevance, ai_spain_impact, ai_category,
                       scraped_at, url
                FROM news_articles
                WHERE scraped_at > NOW() - INTERVAL '30 days'
                  AND source_country IS NOT NULL
                  AND source_country != 'Spain'
                ORDER BY scraped_at DESC
                LIMIT :limit
            """), {"limit": limit - len(events)}).mappings().all()

            for r in rows2:
                events.append({
                    "date":        r["scraped_at"].isoformat() if r["scraped_at"] else None,
                    "country":     r.get("source_country") or "Internacional",
                    "type":        "Internacional",
                    "title":       r["title"],
                    "description": r.get("ai_summary") or r["title"],
                    "source":      r.get("source_name"),
                    "impact":      int(float(r.get("ai_relevance") or 50) * 10),
                    "spain_impact": r.get("ai_spain_impact") or "medio",
                    "url":         r.get("url"),
                })
        except Exception as e:
            _log.warning("news_articles events error: %s", e)

    # ── Source 3: GDELT (if still not enough) ────────────────────────────────
    if len(events) < 5:
        gdelt = _gdelt_fetch("España geopolitica OR Spain geopolitics", hours=72, maxrecords=10)
        events.extend(gdelt)

    # Sort by date, return top limit
    def parse_date(e: dict) -> datetime:
        try:
            d = e.get("date")
            if not d:
                return datetime.min
            return datetime.fromisoformat(d.replace("Z", "+00:00"))
        except Exception:
            return datetime.min

    events.sort(key=parse_date, reverse=True)
    return {"data": events[:limit]}


# ── /kpis & /stats ─────────────────────────────────────────────────────────────
@router.get("/kpis")
@router.get("/stats")
def geo_kpis(db=Depends(get_db)) -> dict[str, Any]:
    """
    KPIs geopolíticos del día calculados desde noticias_prensa.
    Usa ventana 7 días (no 24h) para evitar días con pocos datos.
    """
    try:
        # Use word-boundary aware conditions for all country keywords
        kw_cond = _all_country_kw_cond()

        # Articles today
        n_hoy = db.execute(text(f"""
            SELECT COUNT(*) FROM noticias_prensa
            WHERE ({kw_cond})
              AND fecha_publicacion = CURRENT_DATE
        """)).scalar() or 0

        # Articles last 7 days
        n_7d = db.execute(text(f"""
            SELECT COUNT(*) FROM noticias_prensa
            WHERE ({kw_cond})
              AND fecha_publicacion >= CURRENT_DATE - 7
        """)).scalar() or 0

        # Countries with escalating coverage (more articles than week before)
        escalating_rows = db.execute(text(f"""
            WITH recent AS (
                SELECT COUNT(*) AS n FROM noticias_prensa
                WHERE ({kw_cond}) AND fecha_publicacion >= CURRENT_DATE - 7
            ),
            prev AS (
                SELECT COUNT(*) AS n FROM noticias_prensa
                WHERE ({kw_cond})
                  AND fecha_publicacion >= CURRENT_DATE - 14
                  AND fecha_publicacion < CURRENT_DATE - 7
            )
            SELECT (SELECT n FROM recent) AS n_recent, (SELECT n FROM prev) AS n_prev
        """)).fetchone()
        n_recent_trend = int(escalating_rows[0] or 0) if escalating_rows else 0
        n_prev_trend   = int(escalating_rows[1] or 0) if escalating_rows else 0
        paises_escalada = 1 if n_recent_trend > n_prev_trend * 1.2 else 0

        # Count active conflict countries (risk >= 70 in structural)
        n_conflictos = sum(1 for cfg in COUNTRY_KEYWORDS.values() if cfg["structural_risk"] >= 70)

        # Fuentes internacionales activas (last 7d in news_articles)
        n_fuentes_int = db.execute(text("""
            SELECT COUNT(DISTINCT source_name) FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '30 days'
              AND source_country IS NOT NULL
        """)).scalar() or 0

        # High-impact articles in noticias_prensa (sentiment < -0.5)
        n_criticos = db.execute(text(f"""
            SELECT COUNT(*) FROM noticias_prensa
            WHERE ({kw_cond})
              AND sentimiento_score < -0.5
              AND fecha_publicacion >= CURRENT_DATE - 7
        """)).scalar() or 0

        # Active alerts = high-urgency unique countries in last 14d
        alertas_count = {
            "CRITICO": db.execute(text(f"""
                SELECT COUNT(DISTINCT titular) FROM noticias_prensa
                WHERE ({kw_cond}) AND sentimiento_score < -0.6
                  AND fecha_publicacion >= CURRENT_DATE - 7
            """)).scalar() or 0,
            "ALTO": db.execute(text(f"""
                SELECT COUNT(DISTINCT titular) FROM noticias_prensa
                WHERE ({kw_cond}) AND sentimiento_score BETWEEN -0.6 AND -0.3
                  AND fecha_publicacion >= CURRENT_DATE - 7
            """)).scalar() or 0,
            "MEDIO": db.execute(text(f"""
                SELECT COUNT(DISTINCT titular) FROM noticias_prensa
                WHERE ({kw_cond}) AND sentimiento_score BETWEEN -0.3 AND 0
                  AND fecha_publicacion >= CURRENT_DATE - 7
            """)).scalar() or 0,
        }

        return {
            "eventos_criticos_hoy":     int(n_hoy),
            "eventos_criticos_24h":     int(n_hoy),  # alias
            "articulos_internacionales_7d": int(n_7d),
            "paises_escalada_7d":       int(paises_escalada),
            "conflictos_activos":       int(n_conflictos),
            "fuentes_internacionales":  int(n_fuentes_int),
            "impacto_espana_alto_7d":   int(n_criticos),
            "alertas_activas":          int(alertas_count["CRITICO"] + alertas_count["ALTO"]),
            "paises_monitorizados":     len(COUNTRY_KEYWORDS),
            "presencia_activa":         8,   # Spain has 8 key presence zones
            "alertas_count":            alertas_count,
            "trend_delta":              n_recent_trend - n_prev_trend,
            "updated_at":               datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        _log.error("geo_kpis error: %s", e)
        return {
            "eventos_criticos_hoy":     0,
            "eventos_criticos_24h":     0,
            "articulos_internacionales_7d": 0,
            "paises_escalada_7d":       0,
            "conflictos_activos":       6,
            "fuentes_internacionales":  0,
            "impacto_espana_alto_7d":   0,
            "alertas_activas":          0,
            "paises_monitorizados":     len(COUNTRY_KEYWORDS),
            "presencia_activa":         8,
            "alertas_count":            {"CRITICO": 0, "ALTO": 0, "MEDIO": 0},
            "trend_delta":              0,
            "updated_at":               datetime.utcnow().isoformat() + "Z",
            "error":                    str(e),
        }


# Alias: /geo-stats (for geo_stats combined)
@router.get("/geo-stats")
def geo_stats_combined(db=Depends(get_db)) -> dict[str, Any]:
    return {"stats": geo_kpis(db), "alertas_count": {}}


# ── /osint — feed OSINT internacional ────────────────────────────────────────
@router.get("/osint")
@router.get("/osint-feed")
def osint_feed(
    horas: int = 168,   # 7 days default (not 24h)
    limit: int = 40,
    db=Depends(get_db),
) -> dict[str, Any]:
    """
    Feed OSINT: noticias internacionales recientes de noticias_prensa.
    """
    kw_cond = _all_country_kw_cond()

    try:
        rows = db.execute(text(f"""
            SELECT id, titular, fuente, sentimiento_score, fecha_publicacion, resumen,
                   relevancia_score
            FROM noticias_prensa
            WHERE ({kw_cond})
              AND fecha_publicacion >= CURRENT_DATE - INTERVAL '{horas // 24 + 1} days'
            ORDER BY fecha_publicacion DESC, relevancia_score DESC NULLS LAST
            LIMIT :limit
        """), {"limit": limit}).mappings().all()

        data = []
        for i, r in enumerate(rows):
            titular = r.get("titular") or ""
            # Detect country
            country = "Internacional"
            for cname, cfg in COUNTRY_KEYWORDS.items():
                if any(kw.lower() in titular.lower() for kw in cfg["kw"][:3]):
                    country = cname
                    break

            sent = float(r.get("sentimiento_score") or 0)
            urgencia = 5 if sent < -0.6 else 4 if sent < -0.3 else 3

            data.append({
                "id":        str(r.get("id") or i),
                "titulo":    titular,
                "fuente":    r.get("fuente"),
                "fecha":     r["fecha_publicacion"].isoformat() if r["fecha_publicacion"] else None,
                "urgencia":  urgencia,
                "categoria": country,
                "resumen":   r.get("resumen") or titular,
                "relevancia_espana": float(r.get("relevancia_score") or 0.5),
                "paises_detectados": [country] if country != "Internacional" else [],
                "temas_detectados":  [],
                "fuente_tipo":       "prensa",
            })

        return {"data": data}
    except Exception as e:
        _log.error("osint_feed error: %s", e)
        return {"data": [], "error": str(e)}


# ── /alertas — alertas de alta urgencia ──────────────────────────────────────
@router.get("/alertas")
@router.get("/alertas-geo")
def alertas_geo(
    nivel: Optional[str] = None,
    limite: int = 30,
    db=Depends(get_db),
) -> dict[str, Any]:
    """
    Alertas geopolíticas: artículos de alta negatividad internacional.
    Nivel CRITICO: sentimiento < -0.6
    Nivel ALTO: sentimiento entre -0.6 y -0.35
    Nivel MEDIO: sentimiento entre -0.35 y -0.1
    """
    kw_cond = _all_country_kw_cond()

    # Build nivel filter
    if nivel == "CRITICO" or nivel == "critico":
        sent_filter = "AND sentimiento_score < -0.6"
    elif nivel == "ALTO" or nivel == "alto":
        sent_filter = "AND sentimiento_score BETWEEN -0.6 AND -0.35"
    elif nivel == "MEDIO" or nivel == "medio":
        sent_filter = "AND sentimiento_score BETWEEN -0.35 AND -0.1"
    else:
        sent_filter = "AND sentimiento_score < -0.1"

    try:
        rows = db.execute(text(f"""
            SELECT id, titular, fuente, sentimiento_score, fecha_publicacion, resumen
            FROM noticias_prensa
            WHERE ({kw_cond})
              {sent_filter}
              AND fecha_publicacion >= CURRENT_DATE - 14
            ORDER BY sentimiento_score ASC, fecha_publicacion DESC
            LIMIT :limite
        """), {"limite": limite}).mappings().all()

        data = []
        for i, r in enumerate(rows):
            titular = r.get("titular") or ""
            sent = float(r.get("sentimiento_score") or 0)

            if sent < -0.6:
                nivel_alerta = "CRITICO"
            elif sent < -0.35:
                nivel_alerta = "ALTO"
            else:
                nivel_alerta = "MEDIO"

            # Detect countries
            paises = []
            for cname, cfg in COUNTRY_KEYWORDS.items():
                if any(kw.lower() in titular.lower() for kw in cfg["kw"][:3]):
                    paises.append(cname)

            data.append({
                "id":                 str(r.get("id") or i),
                "titulo":             titular,
                "nivel":              nivel_alerta,
                "fecha":              r["fecha_publicacion"].isoformat() if r["fecha_publicacion"] else None,
                "paises":             paises,
                "descripcion_corta":  (r.get("resumen") or titular)[:150],
                "descripcion":        r.get("resumen") or titular,
                "fuente":             r.get("fuente"),
                "probabilidad":       None,
                "horizonte":          "inmediato",
                "confianza_sistema":  abs(sent),
            })

        return {"data": data}
    except Exception as e:
        _log.error("alertas_geo error: %s", e)
        return {"data": [], "error": str(e)}


# ── /impactos — impactos domésticos ──────────────────────────────────────────
@router.get("/impactos")
@router.get("/impactos-geo")
def impactos_geo(
    dimension: Optional[str] = None,
    severidad_min: int = 1,
    limit: int = 20,
    db=Depends(get_db),
) -> dict[str, Any]:
    """
    Impactos domésticos de geopolítica: artículos sobre cómo afecta a España.
    Dimensiones: energia, migracion, seguridad, comercio, diplomatica
    """
    # Dimension keywords
    dim_keywords = {
        "energia":     ["gas", "petróleo", "energía", "Argelia", "gasoducto", "OPEP", "electricidad", "nuclear"],
        "migracion":   ["migración", "migrantes", "refugiados", "Marruecos", "frontera", "irregular", "Ceuta", "Melilla"],
        "seguridad":   ["OTAN", "defensa", "ejército", "terrorismo", "amenaza", "armamento", "base militar"],
        "comercio":    ["aranceles", "China", "comercio", "exportaciones", "importaciones", "inversión", "sanción"],
        "diplomatica": ["embajada", "diplomacia", "Exteriores", "ministro exterior", "visita oficial", "cumbre"],
    }

    if dimension and dimension in dim_keywords:
        target_kw = dim_keywords[dimension]
        kw_cond = " OR ".join([f"titular ILIKE '%{kw}%'" for kw in target_kw])
    else:
        # All dimensions
        all_kw = [kw for kws in dim_keywords.values() for kw in kws]
        kw_cond = " OR ".join([f"titular ILIKE '%{kw}%'" for kw in all_kw[:40]])

    try:
        rows = db.execute(text(f"""
            SELECT id, titular, fuente, sentimiento_score, fecha_publicacion, resumen,
                   relevancia_score
            FROM noticias_prensa
            WHERE ({kw_cond})
              AND fecha_publicacion >= CURRENT_DATE - 30
            ORDER BY ABS(sentimiento_score) DESC, fecha_publicacion DESC
            LIMIT :limit
        """), {"limit": limit}).mappings().all()

        data = []
        for i, r in enumerate(rows):
            titular = r.get("titular") or ""
            sent = float(r.get("sentimiento_score") or 0)

            # Detect dimension
            detected_dim = "diplomatica"
            for dim, kws in dim_keywords.items():
                if any(kw.lower() in titular.lower() for kw in kws):
                    detected_dim = dim
                    break

            # Severity 1-5
            severidad = min(5, max(1, int(abs(sent) * 5) + 1))

            if severidad < severidad_min:
                continue

            # Countries
            paises_origen = []
            for cname, cfg in COUNTRY_KEYWORDS.items():
                if any(kw.lower() in titular.lower() for kw in cfg["kw"][:3]):
                    paises_origen.append(cname)

            data.append({
                "id":              str(r.get("id") or i),
                "titulo":          titular,
                "dimension":       detected_dim,
                "severidad":       severidad,
                "horizonte":       "corto_plazo",
                "descripcion":     r.get("resumen") or titular,
                "paises_origen":   paises_origen,
                "escenario_base":  None,
                "escenario_adverso": None,
            })

        return {"data": data}
    except Exception as e:
        _log.error("impactos_geo error: %s", e)
        return {"data": [], "error": str(e)}


# ── /think-tanks — análisis cualitativos ──────────────────────────────────────
@router.get("/think-tanks")
def think_tanks(
    limit: int = 15,
    db=Depends(get_db),
) -> dict[str, Any]:
    """
    Análisis de think-tanks: artículos de fuentes premium (elpais, elmundo, expansion)
    sobre geopolítica con alta relevancia.
    """
    kw_cond = _all_country_kw_cond()

    try:
        rows = db.execute(text(f"""
            SELECT id, titular, fuente, sentimiento_score, fecha_publicacion, resumen,
                   relevancia_score
            FROM noticias_prensa
            WHERE ({kw_cond})
              AND fuente IN ('elpais', 'elmundo', 'expansion', 'abc', 'lavanguardia', 'elconfidencial')
              AND fecha_publicacion >= CURRENT_DATE - 30
              AND relevancia_score >= 0.5
            ORDER BY relevancia_score DESC NULLS LAST, fecha_publicacion DESC
            LIMIT :limit
        """), {"limit": limit}).mappings().all()

        data = []
        for i, r in enumerate(rows):
            titular = r.get("titular") or ""
            sent = float(r.get("sentimiento_score") or 0)
            relevancia = float(r.get("relevancia_score") or 0.5)

            paises = []
            for cname, cfg in COUNTRY_KEYWORDS.items():
                if any(kw.lower() in titular.lower() for kw in cfg["kw"][:3]):
                    paises.append(cname)

            data.append({
                "id":                str(r.get("id") or i),
                "titulo":            titular,
                "fuente":            r.get("fuente"),
                "fuente_tipo":       "prensa_opinion",
                "fecha":             r["fecha_publicacion"].isoformat() if r["fecha_publicacion"] else None,
                "url":               None,
                "resumen":           r.get("resumen") or titular,
                "urgencia":          5 if sent < -0.5 else 4 if sent < -0.2 else 3,
                "relevancia_espana": relevancia,
                "paises_detectados": paises,
                "temas_detectados":  [],
            })

        # Supplement with GDELT if not enough
        if len(data) < 5:
            gdelt = _gdelt_fetch("España geopolítica OR Spain foreign policy", hours=72, maxrecords=8)
            for art in gdelt:
                data.append({
                    "id":                f"gdelt_{len(data)}",
                    "titulo":            art.get("title", ""),
                    "fuente":            art.get("source", "GDELT"),
                    "fuente_tipo":       "internacional",
                    "fecha":             art.get("date"),
                    "url":               art.get("url"),
                    "resumen":           art.get("description", ""),
                    "urgencia":          3,
                    "relevancia_espana": 0.6,
                    "paises_detectados": [],
                    "temas_detectados":  [],
                })

        return {"data": data}
    except Exception as e:
        _log.error("think_tanks error: %s", e)
        return {"data": [], "error": str(e)}


# ── /presencia — presencia España en el mundo (extraída de noticias) ──────────
@router.get("/presencia")
@router.get("/spain-presence")
def spain_presence(db=Depends(get_db)) -> Any:
    """
    Presencia España extraída de noticias_prensa recientes.
    Detecta menciones de España en contextos internacionales.
    Devuelve lista de puntos de presencia + KPIs.
    """
    presence_zones = {
        "Ucrania":        {"lat": 49.0, "lon": 32.0, "cat": "militar",     "iso3": "UKR", "code": "UA"},
        "Líbano":         {"lat": 33.9, "lon": 35.5, "cat": "militar",     "iso3": "LBN", "code": "LB"},
        "Irak":           {"lat": 33.3, "lon": 44.4, "cat": "militar",     "iso3": "IRQ", "code": "IQ"},
        "Marruecos":      {"lat": 33.9, "lon": -6.9, "cat": "diplomatica", "iso3": "MAR", "code": "MA"},
        "Argelia":        {"lat": 36.7, "lon": 3.1,  "cat": "energetica",  "iso3": "DZA", "code": "DZ"},
        "Mali":           {"lat": 12.6, "lon": -8.0, "cat": "militar",     "iso3": "MLI", "code": "ML"},
        "México":         {"lat": 19.4, "lon": -99.1,"cat": "empresarial", "iso3": "MEX", "code": "MX"},
        "Estados Unidos": {"lat": 38.9, "lon": -77.0,"cat": "diplomatica", "iso3": "USA", "code": "US"},
        "China":          {"lat": 39.9, "lon": 116.4,"cat": "empresarial", "iso3": "CHN", "code": "CN"},
        "Brasil":         {"lat": -15.8,"lon": -47.9,"cat": "empresarial", "iso3": "BRA", "code": "BR"},
    }

    # Count how many recent articles mention each zone
    data: list[dict] = []
    total_efectivos = 0
    total_diaspora = 0
    total_inversion = 0

    for zone_name, zone_cfg in presence_zones.items():
        cfg = COUNTRY_KEYWORDS.get(zone_name, {"kw": [zone_name]})
        kw = cfg["kw"][:2]
        kw_cond = " OR ".join([f"titular ILIKE '%{kw_}%'" for kw_ in kw])

        try:
            row = db.execute(text(f"""
                SELECT COUNT(*) AS n, AVG(sentimiento_score) AS avg_sent
                FROM noticias_prensa
                WHERE ({kw_cond})
                  AND fecha_publicacion >= CURRENT_DATE - 30
            """)).mappings().fetchone()
            n = int(row["n"] or 0)
            sent = float(row["avg_sent"] or 0)
        except Exception:
            n, sent = 0, 0.0

        # Score relevancia based on news coverage
        score_relevancia = min(1.0, n / 20.0 + 0.3)

        cat = zone_cfg["cat"]

        # Approximate values
        if cat == "militar":
            valor = 300 if zone_name == "Líbano" else 100
            unidad = "efectivos"
            total_efectivos += valor
        elif cat == "diaspora":
            valor = 50000
            unidad = "residentes"
            total_diaspora += valor
        elif cat == "empresarial":
            valor = 500
            unidad = "mill_eur"
            total_inversion += valor
        else:
            valor = 1
            unidad = "embajada"

        titulo_desc = {
            "militar":     f"Misión militar española en {zone_name}",
            "energetica":  f"Suministro energético desde {zone_name}",
            "empresarial": f"Inversión empresarial española en {zone_name}",
            "diplomatica": f"Relación diplomática con {zone_name}",
            "diaspora":    f"Comunidad española en {zone_name}",
        }.get(cat, f"Presencia española en {zone_name}")

        data.append({
            "id":               zone_name.lower().replace(" ", "_"),
            "pais":             zone_name,
            "iso3":             zone_cfg["iso3"],
            "lat":              zone_cfg["lat"],
            "lon":              zone_cfg["lon"],
            "categoria":        cat,
            "titulo":           titulo_desc,
            "actor":            "España",
            "descripcion":      f"{n} artículos en los últimos 30 días sobre España y {zone_name}",
            "valor":            valor,
            "unidad":           unidad,
            "score_relevancia": round(score_relevancia, 2),
            "n_articulos_30d":  n,
            "avg_sentiment":    round(sent, 3),
            "last_updated":     datetime.utcnow().strftime("%Y-%m-%d"),
        })

    data.sort(key=lambda x: -x["score_relevancia"])

    kpis = {
        "efectivos":       total_efectivos,
        "diaspora":        total_diaspora or 1_500_000,  # ~1.5M españoles en el exterior
        "inversion_mill_eur": total_inversion or 2000,
        "embajadas":       len([d for d in data if d["categoria"] == "diplomatica"]),
        "fuentes_energia": len([d for d in data if d["categoria"] == "energetica"]),
    }

    return {"data": data, "kpis": kpis}


# ── /ccaa — datos CCAA (stub) ─────────────────────────────────────────────────
@router.get("/ccaa")
def ccaa_geo(db=Depends(get_db)) -> dict[str, Any]:
    """CCAA geopolitical exposure (stub — no regional data available)."""
    return {"data": []}


# ── /paises-top — países más mencionados ──────────────────────────────────────
@router.get("/paises-top")
def paises_top(horas: int = 168, top_n: int = 10, db=Depends(get_db)) -> dict[str, Any]:
    """Países más mencionados en noticias_prensa internacional."""
    days = max(1, horas // 24)
    results = []
    for cname, cfg in COUNTRY_KEYWORDS.items():
        kw = cfg["kw"][:2]
        kw_cond = " OR ".join([f"titular ILIKE '%{kw_}%'" for kw_ in kw])
        try:
            n = db.execute(text(f"""
                SELECT COUNT(*) FROM noticias_prensa
                WHERE ({kw_cond})
                  AND fecha_publicacion >= CURRENT_DATE - {days}
            """)).scalar() or 0
            if n > 0:
                results.append({
                    "pais": cname,
                    "iso": cfg["code"],
                    "n": int(n),
                    "structural_risk": cfg["structural_risk"],
                })
        except Exception:
            pass

    results.sort(key=lambda x: -x["n"])
    return {"data": results[:top_n]}


# ── /gdelt-events — feed GDELT directo ────────────────────────────────────────
@router.get("/gdelt-events")
def gdelt_events(
    keyword: str = "Spain geopolitics OR España geopolítica",
    hours: int = 48,
    maxrecords: int = 15,
) -> dict[str, Any]:
    """Eventos en tiempo real desde GDELT (cacheado 30 min)."""
    events = _gdelt_fetch(keyword, hours=hours, maxrecords=maxrecords)
    return {"data": events, "source": "gdelt", "cached": True}
