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

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text

from api.dependencies import get_db

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
