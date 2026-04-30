"""
Geo Helpers — Funciones de acceso a datos geopolíticos para el dashboard.
Todas las funciones usan @st.cache_data con TTL apropiado.
Patrón: DB primero → JSON store fallback → datos demo.

Funciones principales:
  - get_osint_filtered()       → items OSINT con filtros
  - get_alertas_nivel()        → alertas por nivel/estado
  - get_impactos_filtered()    → impactos domésticos
  - get_eventos_acled()        → eventos ACLED recientes
  - get_riesgo_pais()          → scores de riesgo por país
  - get_presencia_espanola()   → presencia española en el mundo
  - get_trending_topics_geo()  → temas en tendencia OSINT
  - get_briefing_diario()      → briefing Ollama del día
  - search_osint_semantic()    → búsqueda RAG semántica
  - get_stats_geo()            → estadísticas agregadas del módulo
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[2]
_DATA = _ROOT / "dashboard" / "data"


# ── Helpers internos ──────────────────────────────────────────────────────────

def _iso_to_human(iso: str | None) -> str:
    if not iso:
        return "—"
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).strftime("%d/%m %H:%M")
    except Exception:
        return str(iso)[:16]


def _load_json_store(filename: str, default: Any = None) -> Any:
    """Carga un JSON store desde dashboard/data/."""
    path = _DATA / filename
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning("geo_helpers: error leyendo %s: %s", filename, e)
    return default if default is not None else []


# ── OSINT ─────────────────────────────────────────────────────────────────────

def get_osint_filtered(
    horas: int = 24,
    urgencia_min: int = 1,
    relevancia_min: float = 0.0,
    categoria: str | None = None,
    pais: str | None = None,
    limit: int = 100,
    solo_no_procesados: bool = False,
) -> list[dict]:
    """
    Retorna items OSINT con filtros aplicados.
    TTL: 5 minutos (cacheado por Streamlit).
    Fuente: DB → osint_geo.json → demo data.
    """
    # Intentar via scraper_osint_advanced (que ya maneja DB/JSON/demo)
    try:
        from etl.sources.geo.scraper_osint_advanced import get_items_recent
        items = get_items_recent(
            horas=horas,
            urgencia_min=urgencia_min,
            relevancia_min=relevancia_min,
            limit=limit * 2,  # Pedir más para filtrar después
        )
    except Exception:
        items = _load_json_store("osint_geo.json", [])

    # Filtros adicionales
    if categoria:
        items = [i for i in items if i.get("categoria") == categoria]
    if pais:
        items = [i for i in items
                 if pais in i.get("paises_mencionados", [])
                 or i.get("pais") == pais]
    if solo_no_procesados:
        items = [i for i in items if not i.get("procesado_llm", False)]

    return items[:limit]


def get_osint_stats() -> dict[str, Any]:
    """Estadísticas de ítems OSINT: total, por urgencia, por categoría."""
    items = _load_json_store("osint_geo.json", [])
    desde_24h = datetime.now(timezone.utc) - timedelta(hours=24)

    recientes = [
        i for i in items
        if i.get("fecha_publicacion", "") > desde_24h.isoformat()
    ]

    por_urgencia: dict[int, int] = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    por_categoria: dict[str, int] = {}
    for item in items:
        urg = int(item.get("urgencia", 1))
        por_urgencia[urg] = por_urgencia.get(urg, 0) + 1
        cat = item.get("categoria", "sin_categoria") or "sin_categoria"
        por_categoria[cat] = por_categoria.get(cat, 0) + 1

    return {
        "total": len(items),
        "ultimas_24h": len(recientes),
        "procesados_llm": sum(1 for i in items if i.get("procesado_llm", False)),
        "por_urgencia": por_urgencia,
        "por_categoria": por_categoria,
        "ultima_actualizacion": max(
            (i.get("fecha_scraping", "") for i in items), default=""
        ),
    }


# ── Alertas ───────────────────────────────────────────────────────────────────

def get_alertas_nivel(
    nivel: str | None = None,
    limite: int = 20,
    solo_no_leidas: bool = False,
) -> list[dict]:
    """
    Retorna alertas geopolíticas filtradas por nivel.
    Fuente: alertas_geo.json → Signal Engine.
    """
    try:
        from agents.geo.signal_engine_geo import get_engine
        engine = get_engine()
        return engine.get_alertas_activas(
            nivel=nivel,
            limite=limite,
            solo_no_leidas=solo_no_leidas,
        )
    except Exception:
        alertas = _load_json_store("alertas_geo.json", [])
        if nivel:
            alertas = [a for a in alertas if a.get("nivel") == nivel]
        if solo_no_leidas:
            alertas = [a for a in alertas if not a.get("leida", False)]
        return alertas[:limite]


def get_count_alertas(solo_criticas: bool = False) -> dict[str, int]:
    """Conteo de alertas por nivel. Útil para badges en la UI."""
    try:
        from agents.geo.signal_engine_geo import get_engine
        return get_engine().resumen_alertas()
    except Exception:
        alertas = _load_json_store("alertas_geo.json", [])
        conteo: dict[str, int] = {"CRITICO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0}
        for a in alertas:
            n = a.get("nivel", "BAJO")
            if n in conteo:
                conteo[n] += 1
        return conteo


# ── Impacto doméstico ─────────────────────────────────────────────────────────

def get_impactos_filtered(
    dimension: str | None = None,
    severidad_min: int = 1,
    limite: int = 50,
) -> list[dict]:
    """
    Retorna impactos domésticos sobre España desde la DB o JSON store.
    """
    # Intentar DB
    try:
        from etl.base_extractor import BaseExtractor
        ext = BaseExtractor.__new__(BaseExtractor)
        ext._init_engine()
        if ext.engine:
            import pandas as pd
            query = (
                "SELECT * FROM impacto_domestico "
                f"WHERE severidad >= {severidad_min} "
            )
            if dimension:
                query += f"AND dimension = '{dimension}' "
            query += "ORDER BY severidad DESC, creado_en DESC LIMIT " + str(limite)
            df = pd.read_sql(query, ext.engine)
            if not df.empty:
                return df.to_dict("records")
    except Exception:
        pass

    # Fallback: JSON
    impactos = _load_json_store("impactos_domesticos.json", [])
    if dimension:
        impactos = [i for i in impactos if i.get("dimension") == dimension]
    impactos = [i for i in impactos if int(i.get("severidad", 1)) >= severidad_min]
    return impactos[:limite]


# ── ACLED ─────────────────────────────────────────────────────────────────────

def get_eventos_acled(
    days: int = 30,
    pais: str | None = None,
    tipo_evento: str | None = None,
    relevancia_min: float = 0.2,
    limite: int = 200,
) -> list[dict]:
    """
    Retorna eventos ACLED recientes con filtros.
    Fuente: ACLEDScraper.get_eventos_recientes() → demo data.
    """
    try:
        from etl.sources.geo.scraper_acled import ACLEDScraper
        scraper = ACLEDScraper()
        eventos = scraper.get_eventos_recientes(days=days)
    except Exception:
        try:
            from etl.sources.geo.scraper_acled import _DEMO_EVENTOS
            eventos = list(_DEMO_EVENTOS)
        except Exception:
            return []

    # Filtros
    if pais:
        eventos = [e for e in eventos if e.get("pais") == pais or e.get("iso3") == pais]
    if tipo_evento:
        eventos = [e for e in eventos if e.get("tipo_evento") == tipo_evento]

    relevancia_key = "relevancia_es"if "relevancia_es"in (eventos[0] if eventos else {}) else "relevancia_espana"
    eventos = [e for e in eventos if float(e.get(relevancia_key, 0)) >= relevancia_min]

    return eventos[:limite]


def get_eventos_acled_por_pais(days: int = 30) -> dict[str, list[dict]]:
    """Agrupa eventos ACLED por país ISO3."""
    from collections import defaultdict
    eventos = get_eventos_acled(days=days, relevancia_min=0.1)
    por_pais: dict[str, list[dict]] = defaultdict(list)
    for e in eventos:
        iso3 = e.get("pais", e.get("iso3", "UNK"))
        por_pais[iso3].append(e)
    return dict(por_pais)


# ── Riesgo país ───────────────────────────────────────────────────────────────

def get_riesgo_pais(
    interes_min: float = 0.0,
    limit: int = 50,
) -> list[dict]:
    """
    Retorna scores de riesgo por país.
    Fuente: DB riesgo_pais → JSON seed data.
    """
    # Intentar DB
    try:
        from etl.base_extractor import BaseExtractor
        import pandas as pd
        ext = BaseExtractor.__new__(BaseExtractor)
        ext._init_engine()
        if ext.engine:
            df = pd.read_sql(
                f"SELECT * FROM riesgo_pais WHERE interes_espana >= {interes_min} "
                f"ORDER BY score_total DESC LIMIT {limit}",
                ext.engine,
            )
            if not df.empty:
                return df.to_dict("records")
    except Exception:
        pass

    # Fallback: datos hardcoded de la migración
    return _SEED_RIESGO_PAIS


def get_pais_detail(iso3: str) -> dict | None:
    """Retorna detalle completo de un país."""
    paises = get_riesgo_pais(limit=100)
    for p in paises:
        if p.get("pais") == iso3:
            return p
    return None


# ── Presencia española en el mundo ────────────────────────────────────────────

def get_presencia_espanola(
    tipo: str | None = None,
    relevancia_min: float = 0.0,
) -> list[dict]:
    """
    Retorna puntos de presencia española en el mundo (mapa).
    Fuente: DB espana_mundo → seed data.
    """
    try:
        from etl.base_extractor import BaseExtractor
        import pandas as pd
        ext = BaseExtractor.__new__(BaseExtractor)
        ext._init_engine()
        if ext.engine:
            query = f"SELECT * FROM espana_mundo WHERE relevancia >= {relevancia_min} AND activo = TRUE"
            if tipo:
                query += f"AND tipo_presencia = '{tipo}'"
            query += "ORDER BY relevancia DESC"
            df = pd.read_sql(query, ext.engine)
            if not df.empty:
                return df.to_dict("records")
    except Exception:
        pass

    presencia = list(_SEED_ESPANA_MUNDO)
    if tipo:
        presencia = [p for p in presencia if p.get("tipo_presencia") == tipo]
    if relevancia_min:
        presencia = [p for p in presencia if float(p.get("relevancia", 0)) >= relevancia_min]
    return presencia


# ── Trending topics ───────────────────────────────────────────────────────────

def get_trending_topics_geo(
    horas: int = 24,
    top_n: int = 10,
) -> list[dict]:
    """
    Calcula los temas en tendencia del corpus OSINT reciente.
    Retorna lista de {"tema": str, "count": int, "urgencia_media": float}.
    """
    from collections import Counter
    items = get_osint_filtered(horas=horas, urgencia_min=1, relevancia_min=0.3, limit=200)

    topic_counts: Counter = Counter()
    topic_urgencia: dict[str, list[float]] = {}

    for item in items:
        temas = item.get("temas", [])
        urgencia = float(item.get("urgencia", 1))
        for tema in temas:
            if tema and tema not in ("gdelt", "rss"):
                topic_counts[tema] += 1
                topic_urgencia.setdefault(tema, []).append(urgencia)

    trending = []
    for tema, count in topic_counts.most_common(top_n):
        urgencias = topic_urgencia.get(tema, [1])
        trending.append({
            "tema": tema,
            "count": count,
            "urgencia_media": round(sum(urgencias) / len(urgencias), 2),
        })

    return trending


def get_paises_mas_mencionados(horas: int = 24, top_n: int = 10) -> list[dict]:
    """Países más mencionados en el corpus OSINT reciente."""
    from collections import Counter
    items = get_osint_filtered(horas=horas, urgencia_min=1, relevancia_min=0.3, limit=200)

    pais_counts: Counter = Counter()
    for item in items:
        for pais in item.get("paises_mencionados", []):
            if pais:
                pais_counts[pais] += 1

    return [
        {"pais": p, "menciones": c}
        for p, c in pais_counts.most_common(top_n)
    ]


# ── Briefing diario ───────────────────────────────────────────────────────────

def get_briefing_diario() -> dict | None:
    """
    Retorna el briefing geopolítico más reciente.
    Fuente: dashboard/data/briefing_geo_latest.json.
    """
    return _load_json_store("briefing_geo_latest.json", None)


# ── Búsqueda semántica RAG ────────────────────────────────────────────────────

def search_osint_semantic(query: str, top_k: int = 5) -> str:
    """
    Búsqueda RAG semántica en el corpus OSINT.
    Usa ChromaDB si disponible, fallback a keywords.
    """
    try:
        from agents.geo.enricher_ollama import buscar_con_rag
        items = get_osint_filtered(horas=168, urgencia_min=1, relevancia_min=0.3, limit=100)
        return buscar_con_rag(query, items_contexto=items, top_k=top_k)
    except Exception as exc:
        logger.warning("search_osint_semantic error: %s", exc)
        return f"Error en búsqueda semántica: {exc}"


# ── Análisis de país ──────────────────────────────────────────────────────────

def get_analisis_pais_llm(iso3: str, nombre: str) -> str:
    """Genera análisis profundo de un país con Ollama (sin caché — costoso)."""
    try:
        from agents.geo.enricher_ollama import generar_analisis_pais
        eventos = get_eventos_acled(days=30, pais=iso3, limite=10)
        return generar_analisis_pais(iso3, nombre, eventos)
    except Exception as exc:
        return f"Error generando análisis: {exc}"


# ── Stats globales del módulo ─────────────────────────────────────────────────

def get_stats_geo() -> dict[str, Any]:
    """Estadísticas globales del módulo geopolítico para el sidebar/header."""
    try:
        osint_stats = get_osint_stats()
        alertas_count = get_count_alertas()
        eventos_acled = get_eventos_acled(days=7, relevancia_min=0.4)

        return {
            "osint_total": osint_stats.get("total", 0),
            "osint_24h": osint_stats.get("ultimas_24h", 0),
            "alertas_criticas": alertas_count.get("CRITICO", 0),
            "alertas_altas": alertas_count.get("ALTO", 0),
            "eventos_acled_7d": len(eventos_acled),
            "ultima_actualizacion": osint_stats.get("ultima_actualizacion", ""),
        }
    except Exception:
        return {
            "osint_total": 0,
            "osint_24h": 0,
            "alertas_criticas": 0,
            "alertas_altas": 0,
            "eventos_acled_7d": 0,
            "ultima_actualizacion": "",
        }


# ── Seed data de fallback ─────────────────────────────────────────────────────

_SEED_RIESGO_PAIS: list[dict] = [
    {"pais": "DZA", "nombre": "Argelia",       "interes_espana": 0.95, "score_total": 6.5,
     "riesgo_tendencia": "estable", "lat_capital": 36.7, "lon_capital": 3.0,
     "flag_emoji": "", "tipo_interes": ["energia", "gas", "migracion"],
     "empresas_espanolas": ["Repsol", "Naturgy", "Enagas"]},
    {"pais": "MAR", "nombre": "Marruecos",     "interes_espana": 0.92, "score_total": 5.5,
     "riesgo_tendencia": "estable", "lat_capital": 33.9, "lon_capital": -6.9,
     "flag_emoji": "", "tipo_interes": ["migracion", "energia", "comercio"],
     "empresas_espanolas": ["IAG-Iberia", "ONCF"]},
    {"pais": "UKR", "nombre": "Ucrania",       "interes_espana": 0.88, "score_total": 9.0,
     "riesgo_tendencia": "subiendo", "lat_capital": 50.4, "lon_capital": 30.5,
     "flag_emoji": "", "tipo_interes": ["seguridad", "otan", "energia"],
     "empresas_espanolas": ["Iberdrola", "Repsol"]},
    {"pais": "LBY", "nombre": "Libia",         "interes_espana": 0.85, "score_total": 8.0,
     "riesgo_tendencia": "subiendo", "lat_capital": 32.9, "lon_capital": 13.2,
     "flag_emoji": "", "tipo_interes": ["migracion", "petroleo"],
     "empresas_espanolas": ["Repsol"]},
    {"pais": "VEN", "nombre": "Venezuela",     "interes_espana": 0.80, "score_total": 7.5,
     "riesgo_tendencia": "estable", "lat_capital": 8.0, "lon_capital": -66.0,
     "flag_emoji": "", "tipo_interes": ["diaspora", "energia"],
     "empresas_espanolas": ["Repsol", "BBVA", "Santander"]},
    {"pais": "RUS", "nombre": "Rusia",         "interes_espana": 0.85, "score_total": 9.5,
     "riesgo_tendencia": "subiendo", "lat_capital": 55.7, "lon_capital": 37.6,
     "flag_emoji": "", "tipo_interes": ["energia", "seguridad"],
     "empresas_espanolas": ["Naturgy", "Repsol"]},
    {"pais": "MLI", "nombre": "Mali",          "interes_espana": 0.78, "score_total": 8.5,
     "riesgo_tendencia": "subiendo", "lat_capital": 12.7, "lon_capital": -8.0,
     "flag_emoji": "", "tipo_interes": ["seguridad", "defensa", "sahel"],
     "empresas_espanolas": ["EUTM-Mali"]},
    {"pais": "MEX", "nombre": "México",        "interes_espana": 0.78, "score_total": 4.5,
     "riesgo_tendencia": "subiendo", "lat_capital": 19.4, "lon_capital": -99.1,
     "flag_emoji": "", "tipo_interes": ["comercio", "empresarial", "diaspora"],
     "empresas_espanolas": ["BBVA", "Santander", "Telefónica", "IAG"]},
    {"pais": "TUR", "nombre": "Turquía",       "interes_espana": 0.75, "score_total": 6.5,
     "riesgo_tendencia": "estable", "lat_capital": 39.9, "lon_capital": 32.9,
     "flag_emoji": "", "tipo_interes": ["otan", "comercio", "energia"],
     "empresas_espanolas": ["Santander", "Inditex", "IAG"]},
    {"pais": "PSE", "nombre": "Palestina",     "interes_espana": 0.75, "score_total": 9.0,
     "riesgo_tendencia": "subiendo", "lat_capital": 31.9, "lon_capital": 35.2,
     "flag_emoji": "", "tipo_interes": ["diplomacia", "derechos_humanos"],
     "empresas_espanolas": []},
    {"pais": "IRN", "nombre": "Irán",          "interes_espana": 0.70, "score_total": 8.0,
     "riesgo_tendencia": "subiendo", "lat_capital": 35.7, "lon_capital": 51.4,
     "flag_emoji": "", "tipo_interes": ["energia", "nuclear"],
     "empresas_espanolas": []},
    {"pais": "COL", "nombre": "Colombia",      "interes_espana": 0.70, "score_total": 5.5,
     "riesgo_tendencia": "subiendo", "lat_capital": 4.7, "lon_capital": -74.1,
     "flag_emoji": "", "tipo_interes": ["comercio", "empresarial"],
     "empresas_espanolas": ["Telefónica", "ISS"]},
    {"pais": "NER", "nombre": "Níger",         "interes_espana": 0.70, "score_total": 8.5,
     "riesgo_tendencia": "subiendo", "lat_capital": 13.5, "lon_capital": 2.1,
     "flag_emoji": "", "tipo_interes": ["migracion", "sahel"],
     "empresas_espanolas": []},
    {"pais": "BRA", "nombre": "Brasil",        "interes_espana": 0.72, "score_total": 4.0,
     "riesgo_tendencia": "estable", "lat_capital": -15.8, "lon_capital": -47.9,
     "flag_emoji": "", "tipo_interes": ["comercio", "empresarial", "diaspora"],
     "empresas_espanolas": ["Santander", "Telefónica", "Iberdrola"]},
    {"pais": "IRQ", "nombre": "Iraq",          "interes_espana": 0.65, "score_total": 7.0,
     "riesgo_tendencia": "estable", "lat_capital": 33.3, "lon_capital": 44.4,
     "flag_emoji": "", "tipo_interes": ["petroleo", "energia"],
     "empresas_espanolas": ["Repsol", "Técnicas Reunidas"]},
    {"pais": "BFA", "nombre": "Burkina Faso",  "interes_espana": 0.65, "score_total": 8.0,
     "riesgo_tendencia": "subiendo", "lat_capital": 12.4, "lon_capital": -1.5,
     "flag_emoji": "", "tipo_interes": ["sahel", "migracion"],
     "empresas_espanolas": []},
    {"pais": "SAU", "nombre": "Arabia Saudí",  "interes_espana": 0.65, "score_total": 5.0,
     "riesgo_tendencia": "estable", "lat_capital": 24.7, "lon_capital": 46.7,
     "flag_emoji": "", "tipo_interes": ["energia", "comercio", "inversion"],
     "empresas_espanolas": ["OHL", "Indra", "Técnicas Reunidas"]},
]

_SEED_ESPANA_MUNDO: list[dict] = [
    {"pais": "MLI", "tipo_presencia": "militar",     "descripcion": "Misión EUTM Mali — entrenamiento FFAA malienses",
     "actor_espanol": "Ejército de Tierra", "lat": 12.7, "lon": -8.0,   "relevancia": 0.9},
    {"pais": "IRQ", "tipo_presencia": "militar",     "descripcion": "Misión OTAN Iraq — entrenamiento FFAA iraquíes",
     "actor_espanol": "Ejército de Tierra", "lat": 33.3, "lon": 44.4,  "relevancia": 0.8},
    {"pais": "LBN", "tipo_presencia": "militar",     "descripcion": "UNIFIL ONU Líbano — ~650 efectivos españoles",
     "actor_espanol": "Ejército de Tierra", "lat": 33.3, "lon": 35.5,  "relevancia": 0.9},
    {"pais": "LVA", "tipo_presencia": "militar",     "descripcion": "Batallón multinacional OTAN — Letonia",
     "actor_espanol": "Ejército de Tierra", "lat": 56.9, "lon": 24.1,  "relevancia": 0.85},
    {"pais": "DZA", "tipo_presencia": "energetica",  "descripcion": "Gasoducto Medgaz — 10 bcm/año gas argelino",
     "actor_espanol": "Naturgy/Enagas",     "lat": 36.7, "lon": 3.0,   "relevancia": 0.95},
    {"pais": "DZA", "tipo_presencia": "energetica",  "descripcion": "Gasoducto TransMed (vía Italia)",
     "actor_espanol": "Enagas",             "lat": 36.5, "lon": 5.0,   "relevancia": 0.9},
    {"pais": "QAT", "tipo_presencia": "energetica",  "descripcion": "Contratos GNL Qatar — diversificación energética",
     "actor_espanol": "Naturgy/Repsol",     "lat": 25.3, "lon": 51.5,  "relevancia": 0.8},
    {"pais": "MEX", "tipo_presencia": "empresarial", "descripcion": "BBVA México — mayor filial del grupo BBVA",
     "actor_espanol": "BBVA",              "lat": 19.4, "lon": -99.1,  "relevancia": 0.85},
    {"pais": "BRA", "tipo_presencia": "empresarial", "descripcion": "Santander Brasil — ~25% beneficio del grupo",
     "actor_espanol": "Santander",         "lat": -15.8, "lon": -47.9, "relevancia": 0.85},
    {"pais": "GBR", "tipo_presencia": "diplomatica", "descripcion": "Cuestión Gibraltar — negociación UE-UK",
     "actor_espanol": "MAEC",             "lat": 36.1, "lon": -5.4,   "relevancia": 0.85},
    {"pais": "MAR", "tipo_presencia": "diplomatica", "descripcion": "Relación bilateral España-Marruecos normalizada (2022)",
     "actor_espanol": "MAEC",             "lat": 33.9, "lon": -6.9,   "relevancia": 0.9},
    {"pais": "ARG", "tipo_presencia": "diaspora",    "descripcion": "Mayor comunidad española en Latinoamérica (~300k)",
     "actor_espanol": "MAEC",             "lat": -34.6, "lon": -58.4, "relevancia": 0.8},
    {"pais": "FRA", "tipo_presencia": "diaspora",    "descripcion": "~330.000 españoles residentes en Francia",
     "actor_espanol": "MAEC",             "lat": 48.9, "lon": 2.3,    "relevancia": 0.8},
    {"pais": "DEU", "tipo_presencia": "diaspora",    "descripcion": "~150.000 españoles residentes en Alemania",
     "actor_espanol": "MAEC",             "lat": 52.5, "lon": 13.4,   "relevancia": 0.75},
    {"pais": "LBY", "tipo_presencia": "energetica",  "descripcion": "Operaciones Repsol en cuenca petrolífera libia",
     "actor_espanol": "Repsol",           "lat": 29.0, "lon": 17.0,   "relevancia": 0.8},
]
