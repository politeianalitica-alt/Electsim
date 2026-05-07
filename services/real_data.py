"""
services/real_data.py — Direct DB queries for FastAPI endpoints.

Pure SQLAlchemy, no Streamlit cache dependency.  All functions return
JSON-serializable Python dicts/lists and never raise — return empty
structure on any DB error so callers can fall through to static defaults
only when the DB is genuinely unavailable.
"""
from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

# ── engine ────────────────────────────────────────────────────────────────────

_engine: Engine | None = None


def _get_engine() -> Engine | None:
    global _engine
    if _engine is not None:
        return _engine
    dsn = os.getenv("DATABASE_URL", "")
    if not dsn:
        return None
    try:
        _engine = create_engine(dsn, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        return _engine
    except Exception:
        return None


def _serialize(v: Any) -> Any:
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v


def _row(row: Any) -> dict:
    return {k: _serialize(v) for k, v in row._mapping.items()}


# ── Electoral ─────────────────────────────────────────────────────────────────

_PARTY_COLORS = {
    "PP": "#1F77FF", "PSOE": "#E03A3E", "VOX": "#5BC035",
    "SUMAR": "#D81E5B", "Sumar": "#D81E5B",
    "JUNTS": "#00C2A8", "ERC": "#F4B400", "PNV": "#1D8042",
    "BILDU": "#A4D65E", "EH Bildu": "#A4D65E", "BNG": "#7AC143",
}


def get_nowcasting() -> list[dict]:
    """Latest vote estimate per party — newest fecha_estimacion."""
    engine = _get_engine()
    if not engine:
        return []
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT
                    p.siglas           AS partido,
                    p.ideologia,
                    e.estimacion_pct,
                    e.ic_95_inf,
                    e.ic_95_sup,
                    e.fecha_estimacion,
                    e.n_encuestas,
                    e.modelo
                FROM estimaciones_voto_agregadas e
                JOIN partidos p ON p.id = e.partido_id
                WHERE e.fecha_estimacion = (
                    SELECT MAX(fecha_estimacion) FROM estimaciones_voto_agregadas
                )
                ORDER BY e.estimacion_pct DESC NULLS LAST
            """)).fetchall()
            result = []
            for r in rows:
                d = _row(r)
                d["color"] = _PARTY_COLORS.get(d.get("partido", ""), "#94A3B8")
                result.append(d)
            return result
    except Exception:
        return []


def get_nowcasting_serie(partido: str, dias: int = 90) -> list[dict]:
    """Time series for one party (siglas, case-insensitive)."""
    engine = _get_engine()
    if not engine:
        return []
    since = date.today() - timedelta(days=dias)
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT e.fecha_estimacion, e.estimacion_pct, e.ic_95_inf, e.ic_95_sup
                FROM estimaciones_voto_agregadas e
                JOIN partidos p ON p.id = e.partido_id
                WHERE LOWER(p.siglas) = LOWER(:partido)
                  AND e.fecha_estimacion >= :since
                ORDER BY e.fecha_estimacion ASC
            """), {"partido": partido, "since": since}).fetchall()
            return [_row(r) for r in rows]
    except Exception:
        return []


# ── Media / Noticias ──────────────────────────────────────────────────────────

def get_top_noticias(limit: int = 10, dias: int = 30) -> list[dict]:
    """Top noticias_prensa sorted by relevancia_score then recency."""
    engine = _get_engine()
    if not engine:
        return []
    since = date.today() - timedelta(days=dias)
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT
                    id::text, titular, fuente, url, fecha_publicacion,
                    sentimiento_label, sentimiento_score,
                    relevancia_score, categoria, resumen, partidos_mencionados
                FROM noticias_prensa
                WHERE fecha_publicacion >= :since
                  AND titular IS NOT NULL
                  AND LENGTH(titular) > 10
                ORDER BY relevancia_score DESC NULLS LAST, fecha_publicacion DESC
                LIMIT :limit
            """), {"since": since, "limit": limit}).fetchall()
            result = []
            for r in rows:
                d = _row(r)
                d["relevance_score"] = d.pop("relevancia_score", None)
                d["source"] = d.pop("fuente", None)
                d["title"] = d.pop("titular", "")
                result.append(d)
            return result
    except Exception:
        return []


def get_top_news_articles(limit: int = 10, dias: int = 7) -> list[dict]:
    """Top news_articles sorted by ai_relevance then recency."""
    engine = _get_engine()
    if not engine:
        return []
    since = datetime.now(timezone.utc) - timedelta(days=dias)
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT
                    id::text, title, source_name, url, published_at,
                    ai_sentiment, ai_relevance, ai_summary, ai_category,
                    ai_spain_impact
                FROM news_articles
                WHERE published_at >= :since
                  AND title IS NOT NULL
                  AND LENGTH(title) > 10
                  AND (source_country = 'ES' OR ai_spain_impact > 5)
                ORDER BY ai_relevance DESC NULLS LAST, published_at DESC
                LIMIT :limit
            """), {"since": since, "limit": limit}).fetchall()
            return [_row(r) for r in rows]
    except Exception:
        return []


# ── Macro ─────────────────────────────────────────────────────────────────────

def get_macro_ultimo() -> dict:
    """Most recent row from indicadores_macroeconomicos."""
    engine = _get_engine()
    if not engine:
        return {}
    try:
        with engine.connect() as conn:
            row = conn.execute(text("""
                SELECT
                    fecha, ipc_general, ipc_subyacente, tasa_paro,
                    pib_per_capita, crecimiento_pib,
                    prima_riesgo_bono10, euribor_12m,
                    deficit_publico_pib, deuda_publica_pib,
                    ibex35_cierre, tipo_referencia_bce, fuente
                FROM indicadores_macroeconomicos
                ORDER BY fecha DESC
                LIMIT 1
            """)).fetchone()
            if not row:
                return {}
            return _row(row)
    except Exception:
        return {}


# ── Risk ──────────────────────────────────────────────────────────────────────

def get_risk_overview(limit: int = 6) -> list[dict]:
    """Recent political risk reports."""
    engine = _get_engine()
    if not engine:
        return []
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT fecha_calculo, indice_compuesto, semaforo,
                       dimensiones_json, drivers_json
                FROM informes_riesgo_politico
                ORDER BY fecha_calculo DESC
                LIMIT :limit
            """), {"limit": limit}).fetchall()
            return [_row(r) for r in rows]
    except Exception:
        return []


def get_risk_latest() -> dict:
    """Single most-recent risk report."""
    rows = get_risk_overview(limit=1)
    return rows[0] if rows else {}


# ── Coaliciones ───────────────────────────────────────────────────────────────

def get_coaliciones() -> list[dict]:
    """All coalition analyses ordered by viability."""
    engine = _get_engine()
    if not engine:
        return []
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT partidos_coalicion, escanos_totales,
                       distancia_ideologica, score_viabilidad, es_minima
                FROM analisis_coaliciones
                ORDER BY score_viabilidad DESC NULLS LAST
            """)).fetchall()
            result = []
            for r in rows:
                d = _row(r)
                members_raw = d.get("partidos_coalicion") or ""
                d["members"] = [m.strip() for m in members_raw.split("+") if m.strip()]
                prob = d.get("score_viabilidad") or 0
                d["probability"] = round(float(prob) * 100) if float(prob) <= 1 else int(prob)
                result.append(d)
            return result
    except Exception:
        return []


# ── Alerts ────────────────────────────────────────────────────────────────────

def get_alertas(limit: int = 20, solo_no_leidas: bool = False) -> list[dict]:
    """Alerts from alertas_sistema."""
    engine = _get_engine()
    if not engine:
        return []
    try:
        with engine.connect() as conn:
            where = "WHERE leida = FALSE" if solo_no_leidas else ""
            rows = conn.execute(text(f"""
                SELECT id::text, tipo, severidad, titulo, descripcion,
                       leida, created_at, pagina_relevante, fuente
                FROM alertas_sistema
                {where}
                ORDER BY created_at DESC
                LIMIT :limit
            """), {"limit": limit}).fetchall()
            result = []
            for r in rows:
                d = _row(r)
                sev = (d.get("severidad") or "INFO").upper()
                d["level"] = {"CRITICAL": "critical", "WARNING": "high", "INFO": "medium"}.get(sev, "low")
                d["title"] = d.pop("titulo", "") or ""
                d["body"] = d.pop("descripcion", "") or ""
                d["source"] = d.pop("fuente", "") or d.get("tipo", "sistema") or "sistema"
                d["read"] = d.pop("leida", False)
                d.setdefault("category", d.get("tipo", "general"))
                result.append(d)
            return result
    except Exception:
        return []


# ── BOE ───────────────────────────────────────────────────────────────────────

def get_boe_items(limit: int = 10, dias: int = 30) -> list[dict]:
    """Recent BOE publications."""
    engine = _get_engine()
    if not engine:
        return []
    try:
        with engine.connect() as conn:
            cols = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='boe_publication' ORDER BY ordinal_position"
            )).fetchall()
            col_names = [c[0] for c in cols]
            since = date.today() - timedelta(days=dias)
            # Build a safe SELECT with the actual columns
            safe_cols = [c for c in col_names if c in (
                "id", "identificador", "titulo", "tipo_norma", "rango",
                "fecha_disposicion", "fecha_publicacion", "url",
                "departamento", "materias", "texto_resumido"
            )]
            if not safe_cols:
                safe_cols = col_names[:10]
            select_expr = ", ".join(safe_cols)
            date_col = "fecha_publicacion" if "fecha_publicacion" in col_names else "fecha_disposicion" if "fecha_disposicion" in col_names else None
            if date_col:
                rows = conn.execute(text(f"""
                    SELECT {select_expr} FROM boe_publication
                    WHERE {date_col} >= :since
                    ORDER BY {date_col} DESC
                    LIMIT :limit
                """), {"since": since, "limit": limit}).fetchall()
            else:
                rows = conn.execute(text(f"""
                    SELECT {select_expr} FROM boe_publication
                    ORDER BY id DESC LIMIT :limit
                """), {"limit": limit}).fetchall()
            return [_row(r) for r in rows]
    except Exception:
        return []


# ── Eventos ACLED ─────────────────────────────────────────────────────────────

def get_eventos_acled(dias: int = 7, limit: int = 20) -> list[dict]:
    """Recent geopolitical events from eventos_acled."""
    engine = _get_engine()
    if not engine:
        return []
    try:
        with engine.connect() as conn:
            cols = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='eventos_acled' ORDER BY ordinal_position LIMIT 20"
            )).fetchall()
            col_names = [c[0] for c in cols]
            since = date.today() - timedelta(days=dias)
            date_col = next((c for c in ["fecha_evento", "event_date", "fecha"] if c in col_names), None)
            if not date_col:
                return []
            safe_cols = [c for c in col_names if c in (
                "id", "fecha_evento", "event_date", "pais", "country",
                "tipo_evento", "event_type", "actores", "descripcion",
                "notas", "notes", "fatalities", "bajas", "latitude", "longitude",
                "impacto_espana", "region"
            )]
            select_expr = ", ".join(safe_cols) if safe_cols else "*"
            rows = conn.execute(text(f"""
                SELECT {select_expr} FROM eventos_acled
                WHERE {date_col} >= :since
                ORDER BY {date_col} DESC
                LIMIT :limit
            """), {"since": since, "limit": limit}).fetchall()
            return [_row(r) for r in rows]
    except Exception:
        return []


# ── Ticker ────────────────────────────────────────────────────────────────────

def build_ticker_data() -> list[dict]:
    """
    Build real ticker items from DB:
    - Top 3 party vote estimates
    - Latest risk index + color
    - Latest macro: IPC, prima riesgo
    - Most recent relevant alert
    Returns list of {text, category, color} dicts.
    """
    items: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()

    # Vote estimates
    estimates = get_nowcasting()
    for est in estimates[:4]:
        partido = est.get("partido", "")
        pct = est.get("estimacion_pct")
        if pct is not None:
            color = est.get("color", "#00D4FF")
            items.append({"text": f"{partido} {float(pct):.1f}%", "category": "electoral", "color": color, "priority": 2, "timestamp": now})

    # Macro
    macro = get_macro_ultimo()
    if macro:
        ipc = macro.get("ipc_general")
        if ipc is not None:
            items.append({"text": f"IPC {float(ipc):.1f}%", "category": "economic", "color": "#94A3B8", "priority": 3, "timestamp": now})
        prima = macro.get("prima_riesgo_bono10")
        if prima is not None:
            items.append({"text": f"Prima riesgo {int(prima)} pb", "category": "economic", "color": "#94A3B8", "priority": 3, "timestamp": now})
        euribor = macro.get("euribor_12m")
        if euribor is not None:
            items.append({"text": f"Euribor 12m {float(euribor):.2f}%", "category": "economic", "color": "#94A3B8", "priority": 3, "timestamp": now})

    # Risk
    risk = get_risk_latest()
    if risk:
        idx = risk.get("indice_compuesto")
        sem = risk.get("semaforo", "")
        if idx is not None:
            risk_colors = {"rojo": "#EF4444", "amarillo": "#F59E0B", "verde": "#10B981"}
            rcolor = risk_colors.get(sem, "#F59E0B")
            items.append({"text": f"Riesgo político {float(idx):.1f}/10 ({sem})", "category": "risk", "color": rcolor, "priority": 2, "timestamp": now})

    # Alerts
    alerts = get_alertas(limit=3, solo_no_leidas=True)
    for a in alerts[:2]:
        sev = (a.get("severidad") or "INFO").upper()
        acolor = "#EF4444" if sev == "CRITICAL" else "#F59E0B" if sev == "WARNING" else "#3B82F6"
        items.append({"text": a.get("titulo", ""), "category": "alert", "color": acolor, "priority": 1, "timestamp": a.get("created_at", now)})

    # Top noticia
    noticias = get_top_noticias(limit=3, dias=7)
    for n in noticias[:2]:
        title = (n.get("title") or n.get("titular") or "")[:80]
        if title:
            items.append({"text": title, "category": "media", "color": "#10B981", "priority": 4, "timestamp": n.get("fecha_publicacion", now)})

    return items
