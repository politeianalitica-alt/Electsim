"""
Router /api/risk — vista de Riesgo (apps/web).

Endpoints diseñados para la pestaña /riesgo del frontend Next.js dark
(apps/web). Distinto del Politeia Risk Index profesional (risk_intelligence.py)
que sirve a apps/visual-oscar.

Shape de respuesta optimizada para componentes existentes:
- summary  → score 0-100 + 4 KPIs dimensionales + banda
- heatmap  → matriz dimensión × severidad
- signals  → top N señales con probabilidad/impacto
- history  → serie temporal del score compuesto
- snapshot → fuerza recálculo (POST)

Tablas usadas (con fallback a noticias_prensa + news_articles):
- riesgo_historico (hypertable timescale, fallback a tabla normal)
- noticias_prensa  (1865 rows, sentimiento_score, relevancia_score, categoria)
- news_articles    (Ollama analysis, ai_relevance, ai_sentiment, ai_spain_impact)
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text

from api.dependencies import get_db

router = APIRouter(prefix="/risk", tags=["risk"])

# ── Mapeo categorías → dimensiones de riesgo ──────────────────────────────────
CATEGORY_TO_DIM = {
    "politica":          "Electoral",
    "politica_interior": "Electoral",
    "elecciones":        "Electoral",
    "encuestas":         "Electoral",
    "legislativo":       "Legislativo",
    "boe":               "Legislativo",
    "justicia":          "Legislativo",
    "media":             "Comunicación",
    "redes":             "Comunicación",
    "narrativa":         "Comunicación",
    "geopolitica":       "Geopolítico",
    "internacional":     "Geopolítico",
    "politica_exterior": "Geopolítico",
    "seguridad":         "Geopolítico",
    "seguridad_defensa": "Geopolítico",
    "economia":          "Económico",
    "mercados":          "Económico",
    "energia":           "Económico",
}

DIMENSIONS = ["Electoral", "Comunicación", "Legislativo", "Geopolítico", "Económico"]
SEVERITIES = ["Alta", "Media", "Baja"]


def _categorize(category: str | None, title: str = "") -> str:
    """Mapea categoría/keywords a dimensión."""
    if category and category in CATEGORY_TO_DIM:
        return CATEGORY_TO_DIM[category]
    text_l = (title or "").lower()
    if any(k in text_l for k in ("psoe", "pp ", "vox", "sumar", "encuesta", "elecciones")):
        return "Electoral"
    if any(k in text_l for k in ("congreso", "senado", "ley ", "decreto", "tribunal", "fiscal")):
        return "Legislativo"
    if any(k in text_l for k in ("ucrania", "rusia", "trump", "ue ", "marruecos", "otan")):
        return "Geopolítico"
    if any(k in text_l for k in ("ipc", "bce", "ibex", "deuda", "inflación", "paro")):
        return "Económico"
    return "Comunicación"


def _severity(relevance: float | None, sentiment: float | None, spain_impact: str | None = None) -> str:
    """Asigna severidad según relevancia + sentiment + impacto España."""
    rel = relevance or 5.0
    sent = sentiment if sentiment is not None else 0.0
    if spain_impact in ("alto", "critico"):
        return "Alta"
    if rel >= 8 or sent <= -0.5:
        return "Alta"
    if rel >= 6 or sent <= -0.2:
        return "Media"
    return "Baja"


def _band(score: float) -> str:
    if score >= 75: return "Crítico"
    if score >= 60: return "Elevado"
    if score >= 40: return "Moderado"
    if score >= 20: return "Bajo"
    return "Mínimo"


def _kpi_color(value: int) -> str:
    if value >= 75: return "red"
    if value >= 50: return "amber"
    if value >= 25: return "blue"
    return "green"


# ── /summary ──────────────────────────────────────────────────────────────────
@router.get("/summary")
def risk_summary(db=Depends(get_db)) -> dict[str, Any]:
    """Score compuesto + 4 KPIs dimensionales + banda + confianza."""
    try:
        # Intentar leer última fila de riesgo_historico
        try:
            row = db.execute(text("""
                SELECT score, banda, confianza, componentes, fecha
                FROM riesgo_historico
                ORDER BY fecha DESC LIMIT 1
            """)).mappings().fetchone()
        except Exception:
            row = None

        if row and row["score"] is not None:
            comp = row.get("componentes") or {}
            if isinstance(comp, str):
                import json
                try: comp = json.loads(comp)
                except Exception: comp = {}
            score = float(row["score"])
            banda = row["banda"] or _band(score)
            confianza = float(row["confianza"] or 1.0)
            kpis = comp.get("kpis", [])
            updated_at = row["fecha"].isoformat() if hasattr(row["fecha"], "isoformat") else str(row["fecha"])
            # Si el snapshot guardado no tiene KPIs (e.g. seed data), recalcular en vivo
            if not kpis:
                _, _, _, kpis, _ = _compute_live(db)
        else:
            # Calcular en vivo desde news_articles + noticias_prensa
            score, banda, confianza, kpis, updated_at = _compute_live(db)

        return {
            "score":      round(score, 1),
            "banda":      banda,
            "confianza":  round(confianza, 2),
            "kpis":       kpis,
            "updated_at": updated_at,
            "mode":       "real",
        }
    except Exception as e:
        # Fallback demo
        return {
            "score": 25.8, "banda": "Bajo", "confianza": 0.5,
            "kpis": [
                {"label": "Riesgo electoral",    "value": 22, "color": "blue",  "delta": -2.1},
                {"label": "Riesgo legislativo",  "value": 28, "color": "amber", "delta": +1.5},
                {"label": "Riesgo mediático",    "value": 18, "color": "blue",  "delta": -0.8},
                {"label": "Riesgo geopolítico",  "value": 35, "color": "amber", "delta": +3.2},
            ],
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "mode": "fallback",
            "error": str(e),
        }


def _compute_live(db) -> tuple[float, str, float, list[dict], str]:
    """Calcula score en vivo desde news_articles + noticias_prensa."""
    # Pull señales recientes (24h, 7d, 30d ventanas)
    rows_24h = []
    rows_7d = []
    try:
        rows_24h = db.execute(text("""
            SELECT title, ai_summary, ai_relevance, ai_sentiment, ai_spain_impact, ai_category, scraped_at
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '24 hours'
        """)).mappings().all()

        rows_7d = db.execute(text("""
            SELECT title, ai_summary, ai_relevance, ai_sentiment, ai_spain_impact, ai_category, scraped_at
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '7 days'
        """)).mappings().all()
    except Exception:
        pass

    # Bucket por dimensión + severidad
    dim_severity: dict[str, dict[str, int]] = {d: {"Alta": 0, "Media": 0, "Baja": 0} for d in DIMENSIONS}
    for r in rows_7d:
        dim = _categorize(r.get("ai_category"), r.get("title") or "")
        sent_val = -1.0 if r.get("ai_sentiment") == "negativo" else 0.5 if r.get("ai_sentiment") == "positivo" else 0.0
        sev = _severity(r.get("ai_relevance"), sent_val, r.get("ai_spain_impact"))
        dim_severity[dim][sev] += 1

    # KPIs por dimensión: pondera Alta×3 + Media×1 + Baja×0.3
    kpi_dim_map = {
        "Riesgo electoral":    "Electoral",
        "Riesgo legislativo":  "Legislativo",
        "Riesgo mediático":    "Comunicación",
        "Riesgo geopolítico":  "Geopolítico",
    }

    # Compute prev period KPI for delta
    rows_prev = []
    try:
        rows_prev = db.execute(text("""
            SELECT title, ai_relevance, ai_sentiment, ai_spain_impact, ai_category
            FROM news_articles
            WHERE scraped_at < NOW() - INTERVAL '7 days'
              AND scraped_at > NOW() - INTERVAL '14 days'
        """)).mappings().all()
    except Exception:
        pass

    prev_dim_severity: dict[str, dict[str, int]] = {d: {"Alta": 0, "Media": 0, "Baja": 0} for d in DIMENSIONS}
    for r in rows_prev:
        dim = _categorize(r.get("ai_category"), r.get("title") or "")
        sent_val = -1.0 if r.get("ai_sentiment") == "negativo" else 0.5 if r.get("ai_sentiment") == "positivo" else 0.0
        sev = _severity(r.get("ai_relevance"), sent_val, r.get("ai_spain_impact"))
        prev_dim_severity[dim][sev] += 1

    def _dim_score(sev_counts: dict[str, int]) -> int:
        weighted = sev_counts["Alta"] * 8 + sev_counts["Media"] * 3 + sev_counts["Baja"] * 0.6
        return min(100, int(weighted + 5))  # baseline + scaling

    kpis = []
    for label, dim in kpi_dim_map.items():
        val = _dim_score(dim_severity[dim])
        prev_val = _dim_score(prev_dim_severity[dim])
        delta = val - prev_val
        kpis.append({
            "label":  label,
            "value":  val,
            "color":  _kpi_color(val),
            "delta":  delta,
        })

    # Composite: weighted average con peso por dimensión (Electoral + Legislativo más peso)
    weights = {"Riesgo electoral": 0.28, "Riesgo legislativo": 0.27, "Riesgo geopolítico": 0.25, "Riesgo mediático": 0.20}
    weighted_sum = sum(k["value"] * weights[k["label"]] for k in kpis)
    score = weighted_sum

    n_24h = len(rows_24h)
    confianza = min(1.0, max(0.3, n_24h / 30))   # 0.3-1.0 según volumen 24h

    return score, _band(score), confianza, kpis, datetime.utcnow().isoformat() + "Z"


# ── /heatmap ──────────────────────────────────────────────────────────────────
@router.get("/heatmap")
def risk_heatmap(db=Depends(get_db)) -> dict[str, Any]:
    """Cuenta señales activas agrupadas por (dimensión, severidad) últimos 7d."""
    matrix: dict[str, dict[str, int]] = {d: {s: 0 for s in SEVERITIES} for d in DIMENSIONS}
    try:
        rows = db.execute(text("""
            SELECT title, ai_relevance, ai_sentiment, ai_spain_impact, ai_category
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '7 days'
        """)).mappings().all()

        for r in rows:
            dim = _categorize(r.get("ai_category"), r.get("title") or "")
            sent_val = -1.0 if r.get("ai_sentiment") == "negativo" else 0.5 if r.get("ai_sentiment") == "positivo" else 0.0
            sev = _severity(r.get("ai_relevance"), sent_val, r.get("ai_spain_impact"))
            matrix[dim][sev] += 1

        # Complementar con noticias_prensa si hay pocas señales
        if sum(sum(v.values()) for v in matrix.values()) < 30:
            try:
                rows_p = db.execute(text("""
                    SELECT titular, sentimiento_score, relevancia_score, categoria
                    FROM noticias_prensa
                    WHERE fecha_publicacion > CURRENT_DATE - INTERVAL '7 days'
                    LIMIT 200
                """)).mappings().all()
                for r in rows_p:
                    dim = _categorize(r.get("categoria"), r.get("titular") or "")
                    sev = _severity(r.get("relevancia_score"), r.get("sentimiento_score"))
                    matrix[dim][sev] += 1
            except Exception:
                pass
    except Exception:
        pass

    return {"dimensions": DIMENSIONS, "severities": SEVERITIES, "matrix": matrix}


# ── /signals ──────────────────────────────────────────────────────────────────
@router.get("/signals")
def risk_signals(top: int = Query(5, ge=1, le=30), db=Depends(get_db)) -> list[dict[str, Any]]:
    """Top N señales por (relevancia × sentiment_negative × impact)."""
    out: list[dict] = []
    try:
        rows = db.execute(text("""
            SELECT id, title, url, source_name, ai_summary, ai_analysis,
                   ai_relevance, ai_sentiment, ai_spain_impact, ai_category, ai_urgency,
                   scraped_at
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL '7 days'
              AND ai_relevance IS NOT NULL
            ORDER BY
              CASE ai_spain_impact WHEN 'critico' THEN 0 WHEN 'alto' THEN 1 WHEN 'medio' THEN 2 ELSE 3 END,
              ai_relevance DESC,
              CASE ai_sentiment WHEN 'negativo' THEN 0 WHEN 'mixto' THEN 1 ELSE 2 END,
              scraped_at DESC
            LIMIT :top
        """), {"top": top}).mappings().all()

        for r in rows:
            relevance = float(r.get("ai_relevance") or 5)
            spain_imp = r.get("ai_spain_impact") or "ninguno"
            sentiment_str = r.get("ai_sentiment") or "neutro"

            # Probability: base 50% + boost por impact + relevance
            prob = 50.0
            if spain_imp == "critico": prob += 30
            elif spain_imp == "alto":  prob += 20
            elif spain_imp == "medio": prob += 8
            prob += min(20, (relevance - 5) * 5)
            prob = max(15, min(95, int(prob)))

            impact_label = "Crítico" if spain_imp == "critico" else "Alto" if spain_imp == "alto" else "Medio" if spain_imp == "medio" else "Bajo"

            dim = _categorize(r.get("ai_category"), r.get("title") or "")

            out.append({
                "title":       r["title"],
                "probability": prob,
                "impact":      impact_label,
                "description": (r.get("ai_summary") or r.get("ai_analysis") or "")[:240],
                "area":        dim.lower(),
                "url":         r.get("url"),
                "source":      r.get("source_name"),
                "sentiment":   sentiment_str,
                "scraped_at":  r["scraped_at"].isoformat() if r["scraped_at"] else None,
            })
    except Exception:
        pass

    # Si no hay suficientes señales reales, completar con noticias_prensa
    if len(out) < top:
        try:
            rows_p = db.execute(text("""
                SELECT id, titular, fuente, sentimiento_score, relevancia_score, categoria
                FROM noticias_prensa
                WHERE relevancia_score IS NOT NULL
                ORDER BY relevancia_score DESC, fecha_publicacion DESC NULLS LAST
                LIMIT :top
            """), {"top": top - len(out)}).mappings().all()
            for r in rows_p:
                rel = float(r.get("relevancia_score") or 0.5) * 100  # 0-100
                sent = float(r.get("sentimiento_score") or 0)
                prob = max(20, min(85, int(rel - sent * 20)))
                impact = "Alto" if rel > 70 else "Medio" if rel > 40 else "Bajo"
                dim = _categorize(r.get("categoria"), r.get("titular") or "")
                out.append({
                    "title":       r["titular"],
                    "probability": prob,
                    "impact":      impact,
                    "description": "",
                    "area":        dim.lower(),
                    "url":         None,
                    "source":      r.get("fuente"),
                })
        except Exception:
            pass

    return out[:top]


# ── /history ──────────────────────────────────────────────────────────────────
@router.get("/history")
def risk_history(days: int = Query(30, ge=7, le=180), db=Depends(get_db)) -> list[dict[str, Any]]:
    """Serie temporal del score compuesto. Lee riesgo_historico si existe, calcula sintético si no."""
    out: list[dict] = []
    try:
        # Try riesgo_historico (real)
        try:
            rows = db.execute(text("""
                SELECT date_trunc('day', fecha)::date AS day,
                       AVG(score)::float AS score
                FROM riesgo_historico
                WHERE fecha > NOW() - (:d || ' days')::interval
                GROUP BY day ORDER BY day ASC
            """), {"d": str(days)}).mappings().all()
            if rows:
                out = [{"date": r["day"].isoformat() if hasattr(r["day"], "isoformat") else str(r["day"]),
                        "score": round(float(r["score"]), 1)} for r in rows]
        except Exception:
            pass

        if not out:
            # Sintético: contar señales de alta severidad por día desde news_articles
            try:
                rows = db.execute(text("""
                    SELECT date_trunc('day', scraped_at)::date AS day,
                           COUNT(*) FILTER (WHERE ai_spain_impact IN ('alto','critico') OR ai_relevance >= 8) AS high,
                           COUNT(*) FILTER (WHERE ai_relevance >= 5) AS med,
                           COUNT(*) AS total
                    FROM news_articles
                    WHERE scraped_at > NOW() - (:d || ' days')::interval
                    GROUP BY day ORDER BY day ASC
                """), {"d": str(days)}).mappings().all()
                for r in rows:
                    high = int(r["high"] or 0)
                    med = int(r["med"] or 0)
                    score = min(100, high * 6 + med * 1.2 + 5)
                    out.append({
                        "date":  r["day"].isoformat() if hasattr(r["day"], "isoformat") else str(r["day"]),
                        "score": round(score, 1),
                    })
            except Exception:
                pass
    except Exception:
        pass

    # Densificar — si no hay datos para algún día, interpolar
    if out:
        from datetime import date
        today = date.today()
        date_map = {d["date"]: d["score"] for d in out}
        dense: list[dict] = []
        last_score = out[0]["score"] if out else 25.0
        for offset in range(days, -1, -1):
            day = (today - timedelta(days=offset)).isoformat()
            if day in date_map:
                last_score = date_map[day]
            dense.append({"date": day, "score": last_score})
        return dense

    # Final fallback: serie sintética con baseline
    today = datetime.utcnow().date()
    return [{"date": (today - timedelta(days=i)).isoformat(), "score": 25.0 + (i % 7) * 2.0} for i in range(days, -1, -1)]


# ── POST /snapshot ────────────────────────────────────────────────────────────
@router.post("/snapshot")
def risk_snapshot(db=Depends(get_db)) -> dict[str, Any]:
    """Recalcula el score y guarda snapshot en riesgo_historico."""
    try:
        score, banda, confianza, kpis, ts = _compute_live(db)
        import json
        try:
            db.execute(text("""
                INSERT INTO riesgo_historico (fecha, score, banda, confianza, componentes)
                VALUES (NOW(), :score, :banda, :conf, :comp::jsonb)
            """), {
                "score": score, "banda": banda, "conf": confianza,
                "comp":  json.dumps({"kpis": kpis}),
            })
            db.commit()
        except Exception as e:
            return {"ok": False, "error": str(e), "score": round(score, 1)}
        return {"ok": True, "score": round(score, 1), "banda": banda, "ts": ts}
    except Exception as e:
        return {"ok": False, "error": str(e)}
