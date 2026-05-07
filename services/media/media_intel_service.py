"""
services/media/media_intel_service.py
Media & Narrative Intelligence — real DB queries.
All functions return JSON-serializable dicts/lists, never raise.
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


def _s(v: Any) -> Any:
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v


def _row(r: Any) -> dict:
    return {k: _s(v) for k, v in r._mapping.items()}


# ── Bias config (source name → ideology position 0=left 10=right) ─────────────
_BIAS_MAP: dict[str, float] = {
    "elpais": 3.5, "el país": 3.5, "el pais": 3.5,
    "eldiario": 2.1, "eldiario.es": 2.1, "el diario": 2.1,
    "publico": 1.8, "público": 1.8,
    "20minutos": 5.0, "20 minutos": 5.0,
    "lavanguardia": 5.0, "la vanguardia": 5.0,
    "expansion": 6.5, "expansión": 6.5,
    "elmundo": 7.0, "el mundo": 7.0,
    "abc": 8.2,
    "larazon": 8.8, "la razón": 8.8, "la razon": 8.8,
    "europapress": 5.0, "europa press": 5.0,
    "rtve": 5.0, "rne": 5.0,
    "cope": 6.5,
    "cadena ser": 3.8, "ser": 3.8,
    "okdiario": 9.2, "ok diario": 9.2,
    "infolibre": 2.5,
    "senado": 5.0, "parlamento europeo": 5.0,
}

_BIAS_LABELS = {
    (0, 2.5): "izquierda",
    (2.5, 4.0): "centroizquierda",
    (4.0, 6.0): "centro",
    (6.0, 7.5): "centroderecha",
    (7.5, 10.1): "derecha",
}

_BIAS_COLORS = {
    "izquierda": "#E03A3E",
    "centroizquierda": "#F59E0B",
    "centro": "#94A3B8",
    "centroderecha": "#3B82F6",
    "derecha": "#1F77FF",
}

def _bias_label(score: float) -> str:
    for (lo, hi), label in _BIAS_LABELS.items():
        if lo <= score < hi:
            return label
    return "centro"

def _bias_color(label: str) -> str:
    return _BIAS_COLORS.get(label, "#94A3B8")

def _source_bias(fuente: str) -> tuple[float, str, str]:
    key = (fuente or "").lower().strip()
    score = _BIAS_MAP.get(key, 5.0)
    label = _bias_label(score)
    return score, label, _bias_color(label)


# Gotham-style narrative fingerprints
_NARRATIVA_FINGERPRINTS: list[dict] = [
    {"nombre": "Crisis económica y coste de vida", "marco": "economico", "tension": "alta",
     "target": "Clase media asalariada", "ideologia": "transversal",
     "keywords": {"inflacion": 3, "precio": 2, "ipc": 3, "coste": 2, "paro": 3,
                  "desempleo": 3, "pib": 2, "recesion": 3, "prima": 2, "deuda": 2,
                  "deficit": 2, "salario": 2, "sueldo": 2, "hipoteca": 2, "euribor": 3, "aranceles": 3}},
    {"nombre": "Corrupción e integridad institucional", "marco": "moralidad", "tension": "alta",
     "target": "Votantes desencantados", "ideologia": "transversal",
     "keywords": {"corrupcion": 4, "imputado": 3, "investigado": 3, "juicio": 2,
                  "tribunal": 2, "fraude": 3, "malversacion": 4, "soborno": 4,
                  "trama": 3, "prevaricacion": 4, "comision": 2}},
    {"nombre": "Independentismo y tensión territorial", "marco": "conflicto", "tension": "alta",
     "target": "Ciudadanía catalana y vasca", "ideologia": "izquierda",
     "keywords": {"independencia": 4, "catalu": 3, "referendum": 4, "generalitat": 3,
                  "puigdemont": 3, "junts": 2, "erc": 2, "bildu": 2, "pnv": 2,
                  "pais vasco": 2, "euskadi": 2, "singular": 2, "estatut": 3}},
    {"nombre": "Inmigración y asilo", "marco": "conflicto", "tension": "alta",
     "target": "Electorado clase trabajadora", "ideologia": "derecha",
     "keywords": {"inmigracion": 4, "inmigrante": 3, "migracion": 3, "patera": 4,
                  "cayuco": 4, "mena": 4, "canarias": 2, "ceuta": 3, "melilla": 3,
                  "frontera": 2, "asilo": 2, "refugiado": 2, "expulsion": 3}},
    {"nombre": "Vivienda y acceso al alquiler", "marco": "interes_humano", "tension": "media",
     "target": "Jóvenes 25-40 en ciudades", "ideologia": "izquierda",
     "keywords": {"vivienda": 4, "alquiler": 4, "piso": 2, "hipoteca": 2, "emancipacion": 3,
                  "especulacion": 3, "turistica": 2, "airbnb": 3, "desahucio": 3,
                  "ley de vivienda": 4, "joven": 2}},
    {"nombre": "Polarización política y bloqueo", "marco": "conflicto", "tension": "media",
     "target": "Ciudadanía general", "ideologia": "transversal",
     "keywords": {"polarizacion": 4, "crispacion": 3, "bloqueo": 3, "ruptura": 2,
                  "enfrentamiento": 2, "bronca": 2, "mocion": 3, "investidura": 3,
                  "sanchez": 2, "feijoo": 2, "gobierno": 1, "oposicion": 1}},
    {"nombre": "Reforma fiscal y presupuestos", "marco": "economico", "tension": "media",
     "target": "Contribuyentes y empresas", "ideologia": "centroderecha",
     "keywords": {"presupuesto": 4, "irpf": 4, "impuesto": 3, "reforma": 2,
                  "grandes fortunas": 4, "patrimonio": 3, "hacienda": 3,
                  "recaudacion": 3, "tipo marginal": 4, "amnistia fiscal": 4}},
    {"nombre": "Sanidad pública y listas de espera", "marco": "interes_humano", "tension": "baja",
     "target": "Pacientes y trabajadores sanitarios", "ideologia": "izquierda",
     "keywords": {"sanidad": 4, "sanitario": 3, "hospital": 2, "lista de espera": 4,
                  "urgencias": 3, "atencion primaria": 4, "privatizacion": 3,
                  "colapso": 2, "huelga medicos": 3}},
    {"nombre": "Política exterior y geopolítica", "marco": "estrategia", "tension": "media",
     "target": "Opinión pública europeísta", "ideologia": "transversal",
     "keywords": {"otan": 3, "ucrania": 3, "rusia": 2, "gaza": 3, "israel": 2,
                  "palestina": 2, "china": 2, "aranceles": 3, "diplomacia": 2,
                  "cumbre": 2, "defensa": 2, "alianza": 2}},
    {"nombre": "Clima y transición energética", "marco": "interes_humano", "tension": "baja",
     "target": "Jóvenes y activistas", "ideologia": "izquierda",
     "keywords": {"clima": 3, "climatico": 3, "energia": 2, "renovable": 3, "solar": 2,
                  "emision": 3, "co2": 3, "sequi": 3, "inundacion": 2, "dana": 3,
                  "transicion": 2, "contaminacion": 2}},
    {"nombre": "Derechos laborales y SMI", "marco": "moralidad", "tension": "baja",
     "target": "Trabajadores y sindicatos", "ideologia": "izquierda",
     "keywords": {"jornada": 3, "smi": 4, "salario minimo": 4, "sindicato": 3,
                  "ccoo": 3, "ugt": 3, "huelga": 3, "convenio": 2,
                  "precariedad": 3, "feminismo": 2, "igualdad": 2}},
    {"nombre": "Seguridad y orden público", "marco": "conflicto", "tension": "media",
     "target": "Ciudadanía preocupada por seguridad", "ideologia": "derecha",
     "keywords": {"seguridad": 2, "delito": 3, "crimen": 3, "policia": 2,
                  "robo": 3, "violencia": 2, "terrorismo": 4, "banda": 3,
                  "narcotrafic": 4, "orden publico": 3}},
]

_EMOTION_MAP = {
    "economico": "ansiedad", "moralidad": "indignación", "conflicto": "tensión",
    "interes_humano": "preocupación", "estrategia": "incertidumbre",
}


# ── KPIs ──────────────────────────────────────────────────────────────────────
def get_kpis() -> dict:
    engine = _get_engine()
    if not engine:
        return {"total_articulos": 0, "fuentes_activas": 0,
                "articulos_internacionales": 0, "narrativas_detectadas": 0, "mode": "unavailable"}
    try:
        with engine.connect() as conn:
            total_es = conn.execute(text("SELECT COUNT(*) FROM noticias_prensa")).scalar() or 0
            total_int = conn.execute(text("SELECT COUNT(*) FROM news_articles")).scalar() or 0
            fuentes = conn.execute(text(
                "SELECT COUNT(DISTINCT fuente) FROM noticias_prensa WHERE fecha_publicacion >= NOW() - INTERVAL '7 days'"
            )).scalar() or 0
            hoy = conn.execute(text(
                "SELECT COUNT(*) FROM noticias_prensa WHERE fecha_publicacion = CURRENT_DATE"
            )).scalar() or 0
        return {
            "total_articulos": int(total_es),
            "articulos_hoy": int(hoy),
            "fuentes_activas": int(fuentes),
            "articulos_internacionales": int(total_int),
            "narrativas_detectadas": len(_NARRATIVA_FINGERPRINTS),
            "mode": "real",
        }
    except Exception:
        return {"total_articulos": 0, "fuentes_activas": 0,
                "articulos_internacionales": 0, "narrativas_detectadas": 0, "mode": "error"}


# ── Feed unificado ─────────────────────────────────────────────────────────────
def get_feed(
    category: str | None = None,
    bias: str | None = None,
    partido: str | None = None,
    scope: str = "all",   # "spain" | "international" | "all"
    page: int = 1,
    page_size: int = 20,
) -> dict:
    engine = _get_engine()
    if not engine:
        return {"items": [], "total": 0, "page": page, "page_size": page_size, "mode": "unavailable"}

    try:
        with engine.connect() as conn:
            items: list[dict] = []

            # Spanish articles (noticias_prensa)
            if scope in ("spain", "all"):
                conds = ["1=1"]
                params: dict = {}
                if category:
                    conds.append("categoria = :cat")
                    params["cat"] = category
                if partido:
                    conds.append("(partidos_mencionados ILIKE :partido OR partidos_mencionados ILIKE :partido2)")
                    params["partido"] = f"%{partido}%"
                    params["partido2"] = f"{partido}%"
                where = " AND ".join(conds)
                rows = conn.execute(text(f"""
                    SELECT id::text, fuente, titular, url, fecha_publicacion,
                           categoria, partidos_mencionados, sentimiento_score,
                           sentimiento_label, relevancia_score, resumen
                    FROM noticias_prensa
                    WHERE {where}
                    ORDER BY COALESCE(relevancia_score, 0) DESC NULLS LAST,
                             fecha_publicacion DESC NULLS LAST
                    LIMIT 200
                """), params).fetchall()

                for r in rows:
                    m = r._mapping
                    fuente = str(m["fuente"] or "")
                    bscore, blabel, bcolor = _source_bias(fuente)
                    if bias and blabel != bias:
                        continue
                    sent = float(m["sentimiento_score"] or 0)
                    items.append({
                        "id": str(m["id"]),
                        "title": str(m["titular"] or ""),
                        "source": fuente,
                        "url": str(m["url"] or ""),
                        "date": str(m["fecha_publicacion"] or ""),
                        "category": str(m["categoria"] or "generalista"),
                        "parties": str(m["partidos_mencionados"] or ""),
                        "sentiment_score": sent,
                        "sentiment_label": str(m["sentimiento_label"] or ("positivo" if sent > 0.1 else "negativo" if sent < -0.1 else "neutro")),
                        "relevance": float(m["relevancia_score"] or 0.5),
                        "summary": str(m["resumen"] or ""),
                        "bias_score": bscore,
                        "bias_label": blabel,
                        "bias_color": bcolor,
                        "scope": "spain",
                    })

            # International articles (news_articles)
            if scope in ("international", "all") and not bias and not partido and not category:
                int_rows = conn.execute(text("""
                    SELECT id::text, title, source_name, url, published_at,
                           source_country, source_region, ai_relevance, ai_sentiment,
                           ai_summary, ai_category, ai_geo_lat, ai_geo_lon
                    FROM news_articles
                    ORDER BY ai_relevance DESC NULLS LAST, published_at DESC NULLS LAST
                    LIMIT 100
                """)).fetchall()
                for r in int_rows:
                    m = r._mapping
                    items.append({
                        "id": f"int_{m['id']}",
                        "title": str(m["title"] or ""),
                        "source": str(m["source_name"] or ""),
                        "url": str(m["url"] or ""),
                        "date": str(m["published_at"] or "")[:10],
                        "category": str(m["ai_category"] or "internacional"),
                        "parties": "",
                        "sentiment_score": 0.0,
                        "sentiment_label": str(m["ai_sentiment"] or "neutro"),
                        "relevance": float(m["ai_relevance"] or 5) / 10.0,
                        "summary": str(m["ai_summary"] or ""),
                        "bias_score": 5.0,
                        "bias_label": "centro",
                        "bias_color": "#94A3B8",
                        "scope": "international",
                        "country": str(m["source_country"] or ""),
                        "region": str(m["source_region"] or ""),
                    })

        # Sort by relevance
        items.sort(key=lambda x: x["relevance"], reverse=True)
        total = len(items)
        start = (page - 1) * page_size
        return {
            "items": items[start: start + page_size],
            "total": total,
            "page": page,
            "page_size": page_size,
            "mode": "real",
        }
    except Exception:
        return {"items": [], "total": 0, "page": page, "page_size": page_size, "mode": "error"}


# ── Bias spectrum ──────────────────────────────────────────────────────────────
def get_bias_spectrum() -> list[dict]:
    engine = _get_engine()
    try:
        rows_db: list[dict] = []
        if engine:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT m.nombre, m.ideologia_percibida, m.tipo,
                           m.grupo_mediatico, m.audiencia_mensual_m,
                           COUNT(n.id) as article_count,
                           AVG(n.sentimiento_score)::numeric(5,3) as avg_sentiment
                    FROM medios_comunicacion m
                    LEFT JOIN noticias_prensa n ON LOWER(n.fuente) = LOWER(m.nombre)
                       OR LOWER(n.fuente) LIKE '%' || LOWER(SPLIT_PART(m.nombre, ' ', 1)) || '%'
                    GROUP BY m.nombre, m.ideologia_percibida, m.tipo,
                             m.grupo_mediatico, m.audiencia_mensual_m
                    ORDER BY m.audiencia_mensual_m DESC NULLS LAST
                """)).fetchall()
                rows_db = [_row(r) for r in rows]

        # Map ideology to numeric position
        _IDEOL_POS = {
            "izquierda": 1.0, "centroizquierda": 3.2, "centro": 5.0,
            "centroderecha": 6.8, "derecha": 9.0, "nacionalista": 5.5,
        }
        result = []
        for r in rows_db:
            ideo = str(r.get("ideologia_percibida") or "centro")
            pos = _IDEOL_POS.get(ideo, 5.0)
            result.append({
                "name": str(r.get("nombre") or ""),
                "ideology": ideo,
                "ideology_pos": pos,
                "ideology_color": _bias_color(ideo),
                "tipo": str(r.get("tipo") or ""),
                "grupo": str(r.get("grupo_mediatico") or ""),
                "audiencia": float(r.get("audiencia_mensual_m") or 0),
                "article_count": int(r.get("article_count") or 0),
                "avg_sentiment": float(r.get("avg_sentiment") or 0),
            })
        return result
    except Exception:
        return []


# ── Sentiment heatmap (by party × date) ───────────────────────────────────────
def get_sentiment_heatmap() -> dict:
    engine = _get_engine()
    if not engine:
        return {"rows": [], "parties": [], "dates": [], "mode": "unavailable"}
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT fecha, entidad, n_noticias,
                       sentimiento_medio, pct_positivo, pct_negativo
                FROM sentimiento_prensa_diario
                WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
                ORDER BY fecha ASC, n_noticias DESC
            """)).fetchall()
        data = [_row(r) for r in rows]
        parties = sorted({r["entidad"] for r in data})
        dates = sorted({str(r["fecha"])[:10] for r in data})
        return {"rows": data, "parties": parties, "dates": dates, "mode": "real"}
    except Exception:
        return {"rows": [], "parties": [], "dates": [], "mode": "error"}


# ── Narratives (keyword fingerprint scoring) ───────────────────────────────────
def get_narratives() -> list[dict]:
    engine = _get_engine()
    articles: list[str] = []
    articles_recent: list[str] = []
    try:
        if engine:
            with engine.connect() as conn:
                rows = conn.execute(text("""
                    SELECT titular, resumen, categoria, fecha_publicacion
                    FROM noticias_prensa
                    ORDER BY fecha_publicacion DESC NULLS LAST
                    LIMIT 500
                """)).fetchall()
                for r in rows:
                    m = r._mapping
                    text_blob = f"{m['titular'] or ''} {m['resumen'] or ''}".lower()
                    articles.append(text_blob)
                    # Recent = last 7 days
                    if m["fecha_publicacion"] and str(m["fecha_publicacion"]) >= str(date.today() - timedelta(days=7)):
                        articles_recent.append(text_blob)
    except Exception:
        pass

    results = []
    for fp in _NARRATIVA_FINGERPRINTS:
        # Score all articles
        total_score = 0.0
        article_count = 0
        for blob in articles:
            score = sum(weight * blob.count(kw) for kw, weight in fp["keywords"].items())
            if score > 0:
                article_count += 1
                total_score += score

        recent_score = sum(
            sum(weight * blob.count(kw) for kw, weight in fp["keywords"].items())
            for blob in articles_recent
        )
        all_score = total_score / max(len(articles), 1)
        recent_norm = recent_score / max(len(articles_recent), 1)

        if all_score < 0.05 and article_count < 2:
            continue

        # Velocity: compare recent vs overall
        velocity = "up" if recent_norm > all_score * 1.2 else "down" if recent_norm < all_score * 0.6 else "stable"

        # Lifecycle
        if all_score > 2.0:
            lifecycle = "peak"
        elif all_score > 0.8:
            lifecycle = "active"
        elif recent_norm > all_score:
            lifecycle = "emergence"
        else:
            lifecycle = "decline"

        emotion = _EMOTION_MAP.get(fp["marco"], "tensión")
        results.append({
            "nombre": fp["nombre"],
            "marco": fp["marco"],
            "tension": fp["tension"],
            "target": fp["target"],
            "ideologia": fp["ideologia"],
            "article_count": article_count,
            "score": round(all_score, 3),
            "velocity": velocity,
            "lifecycle": lifecycle,
            "dominant_emotion": emotion,
            "recommended_action": _recommend(lifecycle, velocity, fp["nombre"]),
            "mode": "real" if articles else "demo",
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:12]


def _recommend(lifecycle: str, velocity: str, nombre: str) -> str:
    if lifecycle == "peak" and velocity == "up":
        return f"Máxima atención: '{nombre}' está en su pico con velocidad ascendente. Respuesta comunicativa urgente."
    if lifecycle == "emergence":
        return f"Narrativa emergente '{nombre}'. Actuar antes de que alcance el pico mediático."
    if lifecycle == "decline":
        return f"'{nombre}' en declive. Evitar reavivar con declaraciones innecesarias."
    return f"Monitorizar evolución de '{nombre}' y preparar argumentario de respuesta."


# ── Map data ──────────────────────────────────────────────────────────────────
def get_map_world() -> list[dict]:
    """news_articles grouped by country with centroids."""
    engine = _get_engine()
    if not engine:
        return []
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT source_country, source_region,
                       COUNT(*) as article_count,
                       AVG(ai_relevance)::numeric(4,1) as avg_relevance,
                       AVG(ai_geo_lat) as lat,
                       AVG(ai_geo_lon) as lon
                FROM news_articles
                WHERE source_country IS NOT NULL
                GROUP BY source_country, source_region
                ORDER BY article_count DESC
            """)).fetchall()
        return [_row(r) for r in rows]
    except Exception:
        return []


def get_map_europe() -> list[dict]:
    """European news with country-level aggregation."""
    engine = _get_engine()
    if not engine:
        return []
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT source_country,
                       COUNT(*) as article_count,
                       AVG(ai_relevance)::numeric(4,1) as avg_relevance,
                       SUM(CASE WHEN ai_spain_impact IS NOT NULL AND ai_spain_impact != '' THEN 1 ELSE 0 END) as spain_impact_count
                FROM news_articles
                WHERE source_region = 'europe' OR source_country IN ('Spain','France','Germany','Italy','UK','Portugal','Belgium','Netherlands','Poland','Romania','Sweden','Austria','Switzerland','Norway','Finland','Denmark')
                GROUP BY source_country
                ORDER BY article_count DESC
            """)).fetchall()
        return [_row(r) for r in rows]
    except Exception:
        return []


def get_map_spain_ccaa() -> list[dict]:
    """Spanish CCAA narrative distribution using medios regional attribution."""
    engine = _get_engine()
    if not engine:
        return _ccaa_demo()
    try:
        with engine.connect() as conn:
            # Get articles by source, join to medios_comunicacion → ccaa
            rows = conn.execute(text("""
                SELECT ca.codigo_ine, ca.nombre as ccaa_nombre,
                       COUNT(n.id) as article_count,
                       AVG(n.sentimiento_score)::numeric(4,3) as avg_sentiment,
                       STRING_AGG(DISTINCT n.categoria, ',') as categorias,
                       STRING_AGG(DISTINCT n.partidos_mencionados, ',') as partidos
                FROM comunidades_autonomas ca
                LEFT JOIN medios_comunicacion mc ON mc.ccaa_id = ca.id
                LEFT JOIN noticias_prensa n ON LOWER(n.fuente) LIKE '%' || LOWER(SPLIT_PART(mc.nombre,' ',1)) || '%'
                GROUP BY ca.codigo_ine, ca.nombre
                ORDER BY article_count DESC NULLS LAST
            """)).fetchall()
            data = [_row(r) for r in rows]

        # If very sparse, supplement with national data distributed by category
        if sum(r["article_count"] or 0 for r in data) < 5:
            return _ccaa_demo()

        return [
            {
                **r,
                "article_count": int(r.get("article_count") or 0),
                "avg_sentiment": float(r.get("avg_sentiment") or 0),
                "dominant_narrative": _ccaa_narrative(str(r.get("categorias") or "")),
            }
            for r in data
        ]
    except Exception:
        return _ccaa_demo()


def _ccaa_narrative(categorias: str) -> str:
    cats = categorias.lower()
    if "vivienda" in cats:
        return "Vivienda y alquiler"
    if "politica" in cats:
        return "Polarización política"
    if "economia" in cats:
        return "Economía y empleo"
    if "justicia" in cats:
        return "Corrupción e integridad"
    if "inmigracion" in cats:
        return "Inmigración"
    return "Agenda general"


def _ccaa_demo() -> list[dict]:
    """Static fallback with representative CCAA data."""
    return [
        {"codigo_ine": "01", "ccaa_nombre": "Andalucía", "article_count": 45, "avg_sentiment": -0.1, "dominant_narrative": "Economía y empleo"},
        {"codigo_ine": "02", "ccaa_nombre": "Aragón", "article_count": 12, "avg_sentiment": 0.0, "dominant_narrative": "Agenda general"},
        {"codigo_ine": "03", "ccaa_nombre": "Asturias", "article_count": 8, "avg_sentiment": 0.0, "dominant_narrative": "Economía y empleo"},
        {"codigo_ine": "04", "ccaa_nombre": "Baleares", "article_count": 14, "avg_sentiment": 0.1, "dominant_narrative": "Vivienda y alquiler"},
        {"codigo_ine": "05", "ccaa_nombre": "Canarias", "article_count": 18, "avg_sentiment": -0.2, "dominant_narrative": "Inmigración"},
        {"codigo_ine": "06", "ccaa_nombre": "Cantabria", "article_count": 6, "avg_sentiment": 0.0, "dominant_narrative": "Agenda general"},
        {"codigo_ine": "07", "ccaa_nombre": "Castilla-La Mancha", "article_count": 10, "avg_sentiment": 0.0, "dominant_narrative": "Agenda general"},
        {"codigo_ine": "08", "ccaa_nombre": "Castilla y León", "article_count": 13, "avg_sentiment": 0.0, "dominant_narrative": "Polarización política"},
        {"codigo_ine": "09", "ccaa_nombre": "Cataluña", "article_count": 62, "avg_sentiment": -0.15, "dominant_narrative": "Independentismo territorial"},
        {"codigo_ine": "10", "ccaa_nombre": "Extremadura", "article_count": 7, "avg_sentiment": 0.0, "dominant_narrative": "Agenda general"},
        {"codigo_ine": "11", "ccaa_nombre": "Galicia", "article_count": 16, "avg_sentiment": 0.05, "dominant_narrative": "Economía y empleo"},
        {"codigo_ine": "12", "ccaa_nombre": "La Rioja", "article_count": 4, "avg_sentiment": 0.0, "dominant_narrative": "Agenda general"},
        {"codigo_ine": "13", "ccaa_nombre": "Madrid", "article_count": 85, "avg_sentiment": -0.05, "dominant_narrative": "Polarización política"},
        {"codigo_ine": "14", "ccaa_nombre": "Murcia", "article_count": 9, "avg_sentiment": 0.0, "dominant_narrative": "Agenda general"},
        {"codigo_ine": "15", "ccaa_nombre": "Navarra", "article_count": 7, "avg_sentiment": 0.0, "dominant_narrative": "Independentismo territorial"},
        {"codigo_ine": "16", "ccaa_nombre": "País Vasco", "article_count": 22, "avg_sentiment": 0.05, "dominant_narrative": "Independentismo territorial"},
        {"codigo_ine": "17", "ccaa_nombre": "Valencia", "article_count": 28, "avg_sentiment": -0.1, "dominant_narrative": "Corrupción e integridad"},
    ]


# ── Source health ──────────────────────────────────────────────────────────────
def get_source_health() -> dict:
    engine = _get_engine()
    if not engine:
        return {"sources": [], "active": 0, "degraded": 0, "down": 0, "mode": "unavailable"}
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT fuente, COUNT(*) as n,
                       MAX(fecha_publicacion) as last_seen,
                       AVG(sentimiento_score)::numeric(4,3) as avg_sent
                FROM noticias_prensa
                GROUP BY fuente ORDER BY n DESC
            """)).fetchall()
        today = date.today()
        sources = []
        active = degraded = down = 0
        for r in rows:
            m = r._mapping
            last = m["last_seen"]
            if last is None:
                status = "down"; down += 1
            elif (today - last).days <= 1:
                status = "active"; active += 1
            elif (today - last).days <= 7:
                status = "degraded"; degraded += 1
            else:
                status = "down"; down += 1
            bscore, blabel, bcolor = _source_bias(str(m["fuente"] or ""))
            sources.append({
                "name": str(m["fuente"]),
                "articles": int(m["n"]),
                "last_seen": str(last) if last else "",
                "status": status,
                "avg_sentiment": float(m["avg_sent"] or 0),
                "bias_label": blabel,
                "bias_color": bcolor,
            })
        return {"sources": sources, "active": active, "degraded": degraded, "down": down, "mode": "real"}
    except Exception:
        return {"sources": [], "active": 0, "degraded": 0, "down": 0, "mode": "error"}
