"""
Router /api/geopolitica — vista de Geopolítica (apps/web).

Endpoints diseñados para la pestaña /geopolitica:
- /country-risk    → riesgo país calculado desde news_articles + GPR baseline
- /events          → eventos internacionales recientes
- /spain-presence  → presencia España (datos versionados)
- /kpis            → eventos críticos 24h, países en escalada, etc.

Datos:
- news_articles (Ollama analysis con source_country, ai_spain_impact, ai_geo_*)
- noticias_prensa (fallback)
- Tabla estática versionada para spain-presence (territorios)
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

import requests

_log = logging.getLogger(__name__)

from fastapi import APIRouter, Depends
from sqlalchemy import text

from api.dependencies import get_db

# ── geo_helpers opcional ──────────────────────────────────────────────────────
try:
    import sys
    from pathlib import Path as _Path
    _ROOT_GH = _Path(__file__).resolve().parents[2]
    if str(_ROOT_GH) not in sys.path:
        sys.path.insert(0, str(_ROOT_GH))
    from dashboard.utils.geo_helpers import (
        get_osint_filtered as _get_osint,
        get_osint_stats as _get_osint_stats,
        get_alertas_nivel as _get_alertas,
        get_count_alertas as _get_count_alertas,
        get_impactos_filtered as _get_impactos,
        get_riesgo_pais as _get_riesgo_pais,
        get_presencia_espanola as _get_presencia,
        get_stats_geo as _get_stats_geo,
        get_paises_mas_mencionados as _get_paises_top,
    )
    _GEO_HELPERS_OK = True
except Exception:
    _GEO_HELPERS_OK = False

router = APIRouter(prefix="/geopolitica", tags=["geopolitica"])


# ── Países base (calibrados con GPR Index aproximado) ─────────────────────────
COUNTRY_BASELINE = {
    "Russia":        {"code": "RU", "risk": 78, "status": "war"},
    "Ukraine":       {"code": "UA", "risk": 92, "status": "war"},
    "Israel":        {"code": "IL", "risk": 75, "status": "war"},
    "Palestine":     {"code": "PS", "risk": 88, "status": "war"},
    "Iran":          {"code": "IR", "risk": 72, "status": "tense"},
    "China":         {"code": "CN", "risk": 58, "status": "tense"},
    "USA":           {"code": "US", "risk": 50, "status": "watch"},
    "United States": {"code": "US", "risk": 50, "status": "watch"},
    "Morocco":       {"code": "MA", "risk": 45, "status": "watch"},
    "Algeria":       {"code": "DZ", "risk": 48, "status": "watch"},
    "Turkey":        {"code": "TR", "risk": 55, "status": "tense"},
    "Venezuela":     {"code": "VE", "risk": 60, "status": "tense"},
    "United Kingdom":{"code": "GB", "risk": 28, "status": "watch"},
    "France":        {"code": "FR", "risk": 32, "status": "watch"},
    "Germany":       {"code": "DE", "risk": 22, "status": "watch"},
    "Italy":         {"code": "IT", "risk": 26, "status": "watch"},
    "North Korea":   {"code": "KP", "risk": 80, "status": "tense"},
    "Syria":         {"code": "SY", "risk": 82, "status": "war"},
    "Lebanon":       {"code": "LB", "risk": 70, "status": "tense"},
    "Egypt":         {"code": "EG", "risk": 42, "status": "watch"},
    "Mexico":        {"code": "MX", "risk": 50, "status": "watch"},
    "Argentina":     {"code": "AR", "risk": 38, "status": "watch"},
}


# ── /country-risk ─────────────────────────────────────────────────────────────
@router.get("/country-risk")
def country_risk(db=Depends(get_db)) -> list[dict[str, Any]]:
    """Riesgo país calculado desde news_articles + baseline GPR.

    score = baseline_risk * 0.4 + news_intensity * 0.6
    news_intensity = min(100, n_articles_7d × 4 + n_negative_7d × 6 + n_high_impact × 10)
    """
    out: list[dict] = []
    try:
        # Recoger conteos por país en últimos 7d
        rows = db.execute(text("""
            SELECT
                source_country,
                COUNT(*) AS n,
                COUNT(*) FILTER (WHERE ai_sentiment='negativo') AS n_neg,
                COUNT(*) FILTER (WHERE ai_spain_impact IN ('alto','critico')) AS n_high,
                AVG(CASE WHEN ai_sentiment='negativo' THEN -1 WHEN ai_sentiment='positivo' THEN 1 ELSE 0 END)::float AS avg_sent
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '7 days'
              AND source_country IS NOT NULL
            GROUP BY source_country
        """)).mappings().all()
        country_news = {r["source_country"]: r for r in rows}

        # Pull also baseline (14-7d ago) for delta_7d
        rows_prev = db.execute(text("""
            SELECT source_country, COUNT(*) AS n
            FROM news_articles
            WHERE scraped_at < NOW() - INTERVAL '7 days'
              AND scraped_at > NOW() - INTERVAL '14 days'
              AND source_country IS NOT NULL
            GROUP BY source_country
        """)).mappings().all()
        prev_n = {r["source_country"]: int(r["n"] or 0) for r in rows_prev}

        # Build country_risk for known countries (baseline + news intensity)
        seen = set()
        for cname, base in COUNTRY_BASELINE.items():
            news = country_news.get(cname)
            if news:
                n = int(news["n"] or 0)
                n_neg = int(news["n_neg"] or 0)
                n_high = int(news["n_high"] or 0)
                intensity = min(100, n * 4 + n_neg * 6 + n_high * 10)
            else:
                n, n_neg, n_high, intensity = 0, 0, 0, 0

            # Composite: 40% baseline + 60% news intensity (or just baseline if no news)
            if intensity > 0:
                risk = round(base["risk"] * 0.4 + intensity * 0.6)
            else:
                risk = base["risk"]

            # Status adjustment based on recent news
            status = base["status"]
            if n_high >= 3:
                status = "war" if status != "war" else "war"
            elif intensity >= 60:
                status = "tense" if status == "watch" else status

            # Delta 7d
            n_prev = prev_n.get(cname, 0)
            delta_7d = n - n_prev

            out.append({
                "code":      base["code"],
                "name":      cname,
                "risk":      max(0, min(100, risk)),
                "status":    status,
                "delta_7d":  delta_7d,
                "n_articles_7d": n,
                "n_negative":   n_neg,
                "n_high_impact": n_high,
            })
            seen.add(cname)

        # Add countries from news that aren't in baseline
        for cname, news in country_news.items():
            if cname in seen or cname == "Spain":
                continue
            n = int(news["n"] or 0)
            n_neg = int(news["n_neg"] or 0)
            n_high = int(news["n_high"] or 0)
            if n < 2:
                continue
            intensity = min(100, n * 4 + n_neg * 6 + n_high * 10)
            status = "tense" if intensity >= 60 else "watch"
            n_prev = prev_n.get(cname, 0)
            out.append({
                "code":         cname[:2].upper(),
                "name":         cname,
                "risk":         intensity,
                "status":       status,
                "delta_7d":     n - n_prev,
                "n_articles_7d": n,
                "n_negative":   n_neg,
                "n_high_impact": n_high,
            })

        # Sort by risk desc
        out.sort(key=lambda x: -x["risk"])
        return out[:18]
    except Exception:
        # Fallback al baseline puro
        return [{
            "code": v["code"], "name": k, "risk": v["risk"], "status": v["status"], "delta_7d": 0,
            "n_articles_7d": 0, "n_negative": 0, "n_high_impact": 0,
        } for k, v in list(COUNTRY_BASELINE.items())[:14]]


# ── /events ───────────────────────────────────────────────────────────────────
@router.get("/events")
def geo_events(limit: int = 20, db=Depends(get_db)) -> list[dict[str, Any]]:
    """Eventos internacionales recientes con impacto España."""
    out: list[dict] = []
    try:
        rows = db.execute(text("""
            SELECT id, title, url, source_name, source_country,
                   ai_summary, ai_relevance, ai_sentiment, ai_spain_impact, ai_category, ai_urgency,
                   ai_geo_location, scraped_at
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '7 days'
              AND (
                ai_category IN ('politica_exterior','seguridad_defensa')
                OR ai_spain_impact IN ('alto','critico')
                OR (source_country IS NOT NULL AND source_country != 'Spain')
              )
              AND ai_relevance >= 4
            ORDER BY
              CASE ai_spain_impact WHEN 'critico' THEN 0 WHEN 'alto' THEN 1 ELSE 2 END,
              ai_relevance DESC,
              scraped_at DESC
            LIMIT :limit
        """), {"limit": limit}).mappings().all()

        for r in rows:
            # Tipo: derivado de category/urgency
            ev_type = "Crisis"
            cat = r.get("ai_category") or ""
            if "exterior" in cat or "diplomac" in (r.get("title") or "").lower():
                ev_type = "Diplomático"
            elif "seguridad" in cat or "defensa" in cat:
                ev_type = "Seguridad"
            elif r.get("ai_urgency") in ("inmediata", "24h"):
                ev_type = "Urgente"

            # Impact 0-100
            relevance = float(r.get("ai_relevance") or 5)
            impact = int(min(100, relevance * 10 + (15 if r.get("ai_spain_impact") in ("alto", "critico") else 0)))

            # Country: prefer ai_geo_location, fallback source_country
            country = r.get("ai_geo_location") or r.get("source_country") or "Internacional"
            # Limpiar pais (puede venir como "España, Madrid")
            country = country.split(",")[0].strip()[:30]

            out.append({
                "date":         r["scraped_at"].isoformat() if r["scraped_at"] else None,
                "country":      country,
                "type":         ev_type,
                "description":  r.get("ai_summary") or r["title"],
                "impact":       impact,
                "url":          r.get("url"),
                "source":       r.get("source_name"),
                "spain_impact": r.get("ai_spain_impact"),
                "title":        r["title"],
            })
        return out
    except Exception:
        return []


# ── /spain-presence ───────────────────────────────────────────────────────────
@router.get("/spain-presence")
def spain_presence() -> list[dict[str, Any]]:
    """Presencia España en territorios clave (datos MAE/OSINT versionados).

    Se podría consultar BD si hubiera tabla `spain_presence_territories`.
    Por ahora datos curados con timestamp del último update.
    """
    last_update = "2026-04-15"
    return [
        {"territory": "Sahel (Mali / Níger)",      "status": "Misión EUTM-Mali suspendida tras golpe",          "level": "low",    "last_updated": last_update, "context": "Pérdida de capacidad de inteligencia regional"},
        {"territory": "Marruecos",                 "status": "Reunión bilateral pospuesta sin fecha",            "level": "medium", "last_updated": last_update, "context": "Tensiones por Sáhara y migración"},
        {"territory": "Argelia",                   "status": "Relaciones gas estabilizadas",                     "level": "high",   "last_updated": last_update, "context": "30% del gas natural importado"},
        {"territory": "Ucrania",                   "status": "Apoyo militar y entrenamiento sostenido",          "level": "high",   "last_updated": last_update, "context": "Más de 60 instructores y suministro de equipo"},
        {"territory": "Iraq (Operación Inherent)", "status": "Contingente desplegado en Bagdad y Erbil",         "level": "high",   "last_updated": last_update, "context": "300 efectivos en formación de fuerzas iraquíes"},
        {"territory": "Líbano (FINUL)",            "status": "Fuerza de paz con efectivos rotacionales",         "level": "high",   "last_updated": last_update, "context": "650 militares en el sur del país"},
        {"territory": "Indo-Pacífico",             "status": "Despliegue naval limitado 2025-2026",              "level": "low",    "last_updated": last_update, "context": "Foro UE-ASEAN: posible ampliación"},
        {"territory": "Latinoamérica",             "status": "Diplomacia económica + Cumbre Iberoamericana",      "level": "medium", "last_updated": last_update, "context": "Foco en transición energética y migración"},
    ]


# ── /kpis ─────────────────────────────────────────────────────────────────────
@router.get("/kpis")
def geo_kpis(db=Depends(get_db)) -> dict[str, Any]:
    """KPIs agregados: eventos críticos 24h, países escalada, conflictos activos."""
    try:
        # Eventos críticos 24h
        n_criticos = db.execute(text("""
            SELECT COUNT(*) FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '24 hours'
              AND (ai_spain_impact = 'critico' OR ai_urgency = 'inmediata')
        """)).scalar() or 0

        # Países con escalada (más artículos en 7d que en 7d previo)
        rows = db.execute(text("""
            WITH cur AS (
                SELECT source_country, COUNT(*) AS n
                FROM news_articles
                WHERE scraped_at > NOW() - INTERVAL '7 days' AND source_country IS NOT NULL
                GROUP BY source_country
            ),
            prev AS (
                SELECT source_country, COUNT(*) AS n
                FROM news_articles
                WHERE scraped_at < NOW() - INTERVAL '7 days'
                  AND scraped_at > NOW() - INTERVAL '14 days'
                  AND source_country IS NOT NULL
                GROUP BY source_country
            )
            SELECT cur.source_country
            FROM cur LEFT JOIN prev USING (source_country)
            WHERE cur.n > COALESCE(prev.n, 0) * 1.5 AND cur.n >= 3
        """)).mappings().all()
        n_escalada = len(rows)

        # Conflictos activos = países en status 'war' del baseline
        n_conflictos = sum(1 for v in COUNTRY_BASELINE.values() if v["status"] == "war")

        # Fuentes internacionales activas
        n_fuentes_int = db.execute(text("""
            SELECT COUNT(DISTINCT source_name)
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '7 days'
              AND source_country NOT IN ('Spain', NULL)
        """)).scalar() or 0

        # Impacto España alto en 7d
        n_impact_es = db.execute(text("""
            SELECT COUNT(*) FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '7 days'
              AND ai_spain_impact IN ('alto','critico')
        """)).scalar() or 0

        return {
            "eventos_criticos_24h":   int(n_criticos),
            "paises_escalada_7d":     int(n_escalada),
            "conflictos_activos":     int(n_conflictos),
            "fuentes_internacionales": int(n_fuentes_int),
            "impacto_espana_alto_7d": int(n_impact_es),
            "updated_at":             datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        return {
            "eventos_criticos_24h":  0,
            "paises_escalada_7d":    0,
            "conflictos_activos":    sum(1 for v in COUNTRY_BASELINE.values() if v["status"] == "war"),
            "fuentes_internacionales": 0,
            "impacto_espana_alto_7d": 0,
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "error": str(e),
        }


# ── /geo-stats ────────────────────────────────────────────────────────────────
@router.get("/geo-stats")
def geo_stats_combined() -> dict[str, Any]:
    """Stats globales del módulo + conteo de alertas por nivel."""
    stats: dict = {}
    alertas_count: dict = {}
    if _GEO_HELPERS_OK:
        try:
            stats = _get_stats_geo()
        except Exception:
            pass
        try:
            alertas_count = _get_count_alertas()
        except Exception:
            pass
    return {"stats": stats, "alertas_count": alertas_count}


# ── /riesgo-pais ──────────────────────────────────────────────────────────────
@router.get("/riesgo-pais")
def riesgo_pais_geo(
    interes_min: float = 0.3,
    limit: int = 30,
) -> dict[str, Any]:
    """Riesgo país desde geo_helpers (DB → JSON store → demo)."""
    data: list = []
    if _GEO_HELPERS_OK:
        try:
            data = _get_riesgo_pais(interes_min=interes_min, limit=limit) or []
        except Exception:
            pass
    return {"data": data}


# ── /presencia-espanola-geo ───────────────────────────────────────────────────
@router.get("/presencia-espanola-geo")
def presencia_espanola_geo() -> dict[str, Any]:
    """Presencia española en el mundo desde geo_helpers."""
    data: list = []
    if _GEO_HELPERS_OK:
        try:
            data = _get_presencia() or []
        except Exception:
            pass
    return {"data": data}


# ── /osint-feed ───────────────────────────────────────────────────────────────
@router.get("/osint-feed")
def osint_feed(
    horas: int = 24,
    urgencia_min: int = 1,
    relevancia_min: float = 0.3,
    categoria: Optional[str] = None,
    limit: int = 60,
) -> dict[str, Any]:
    """Feed OSINT filtrado desde geo_helpers."""
    data: list = []
    if _GEO_HELPERS_OK:
        try:
            data = _get_osint(
                horas=horas,
                urgencia_min=urgencia_min,
                relevancia_min=relevancia_min,
                categoria=categoria if categoria and categoria != "todas" else None,
                limit=limit,
            ) or []
        except Exception:
            pass
    return {"data": data}


# ── /osint-stats ──────────────────────────────────────────────────────────────
@router.get("/osint-stats")
def osint_stats_endpoint() -> dict[str, Any]:
    """Estadísticas del corpus OSINT."""
    if _GEO_HELPERS_OK:
        try:
            return _get_osint_stats() or {}
        except Exception:
            pass
    return {}


# ── /alertas-geo ──────────────────────────────────────────────────────────────
@router.get("/alertas-geo")
def alertas_geo(
    nivel: Optional[str] = None,
    limite: int = 50,
    solo_no_leidas: bool = False,
) -> dict[str, Any]:
    """Alertas geopolíticas filtradas."""
    data: list = []
    if _GEO_HELPERS_OK:
        try:
            data = _get_alertas(
                nivel=nivel if nivel and nivel != "todas" else None,
                limite=limite,
                solo_no_leidas=solo_no_leidas,
            ) or []
        except Exception:
            pass
    return {"data": data}


# ── /impactos-geo ─────────────────────────────────────────────────────────────
@router.get("/impactos-geo")
def impactos_geo(
    dimension: Optional[str] = None,
    severidad_min: int = 1,
    limit: int = 30,
) -> dict[str, Any]:
    """Impactos domésticos filtrados."""
    data: list = []
    if _GEO_HELPERS_OK:
        try:
            data = _get_impactos(
                dimension=dimension if dimension and dimension != "todas" else None,
                severidad_min=severidad_min,
                limit=limit,
            ) or []
        except Exception:
            pass
    return {"data": data}


# ── /paises-top ───────────────────────────────────────────────────────────────
@router.get("/paises-top")
def paises_top(horas: int = 24, top_n: int = 10) -> dict[str, Any]:
    """Países más mencionados en OSINT."""
    data: list = []
    if _GEO_HELPERS_OK:
        try:
            data = _get_paises_top(horas=horas, top_n=top_n) or []
        except Exception:
            pass
    return {"data": data}


# ── /gdelt-events ─────────────────────────────────────────────────────────────
_GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc"
_GDELT_QUERIES = [
    "Spain geopolitics",
    "España política exterior",
    "Marruecos España",
    "OTAN España",
]


@router.get("/gdelt-events")
def gdelt_events(
    keyword: str = "Spain geopolitics OR España geopolítica",
    hours: int = 24,
    maxrecords: int = 15,
) -> dict[str, Any]:
    """
    Eventos en tiempo real desde la API gratuita de GDELT Project.
    No requiere API key. Devuelve artículos de noticias relevantes para España.
    """
    params = {
        "query": keyword,
        "mode": "artlist",
        "maxrecords": maxrecords,
        "format": "json",
        "timespan": f"{hours}H",
        "sort": "DateDesc",
        "sourcelang": "Spanish OR English",
    }
    try:
        resp = requests.get(_GDELT_BASE, params=params, timeout=8)
        resp.raise_for_status()
        payload = resp.json()
        articles = payload.get("articles") or []
        # Normalise to the GeoEvent shape the frontend expects
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
        return {"data": events, "source": "gdelt"}
    except Exception as exc:
        _log.warning("GDELT fetch failed: %s", exc)
        return {"data": [], "source": "gdelt", "error": str(exc)}


# ── /events ───────────────────────────────────────────────────────────────────
@router.get("/events")
def events_feed(limit: int = 12, db: Any = Depends(get_db)) -> dict[str, Any]:
    """
    Feed de eventos geopolíticos recientes.
    Intenta news_articles primero, cae a GDELT si no hay datos.
    """
    data: list = []

    # 1. Try news_articles table
    try:
        rows = db.execute(
            text("""
                SELECT
                    na.title,
                    na.summary        AS description,
                    na.url,
                    na.source_name    AS source,
                    na.source_country AS country,
                    na.published_at   AS date,
                    COALESCE(na.ai_spain_impact::text, 'medio') AS spain_impact,
                    COALESCE(na.ai_relevance, 60)::int           AS impact,
                    COALESCE(na.category, 'Internacional')        AS type
                FROM news_articles na
                WHERE na.published_at >= NOW() - INTERVAL '48 hours'
                  AND (
                      na.ai_spain_impact IN ('critico','alto','medio')
                      OR na.source_country IN ('MA','DZ','RU','UA','IR','TR','VE','CN')
                  )
                ORDER BY na.published_at DESC
                LIMIT :limit
            """),
            {"limit": limit},
        ).fetchall()
        data = [dict(r._mapping) for r in rows]
    except Exception as exc:
        _log.warning("news_articles query failed: %s", exc)

    if data:
        return {"data": data}

    # 2. Fall back to GDELT
    return gdelt_events(hours=48, maxrecords=limit)
