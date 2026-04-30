"""Señales vivas para el Centro de Operaciones.

Este módulo agrega datos ya existentes en ElectSim: alertas, riesgo,
noticias, fact-checks, agenda institucional, nowcasting y memoria de campaña.
La UI de D10 y los endpoints API consumen estas funciones.
"""

from __future__ import annotations

import json
import math
import re
import time
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from functools import wraps
from typing import Any

import pandas as pd

from etl.logger import get_logger

logger = get_logger(__name__)


def _ttl_cache(seconds: int = 60, maxsize: int = 128):
    """Cache TTL ligero para evitar repetir scrapers/API en cada rerun."""
    def decorator(func):
        cache: dict[Any, tuple[float, Any]] = {}

        @wraps(func)
        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            now = time.monotonic()
            hit = cache.get(key)
            if hit and now - hit[0] < seconds:
                return hit[1]
            value = func(*args, **kwargs)
            if len(cache) >= maxsize:
                oldest_key = min(cache, key=lambda k: cache[k][0])
                cache.pop(oldest_key, None)
            cache[key] = (now, value)
            return value

        wrapper.cache_clear = cache.clear
        return wrapper

    return decorator


_DEFAULT_WORKSPACES: list[dict[str, Any]] = [
    {
        "id": "iberdrola",
        "db_id": None,
        "nombre": "IBERDROLA",
        "sector": "Energía y regulación",
        "tipo": "Public Affairs",
        "ambito": "nacional",
        "terms": ["iberdrola", "energia", "energía", "renovable", "electricidad", "nuclear"],
    },
    {
        "id": "pp-euro",
        "db_id": None,
        "nombre": "PP — EURO",
        "sector": "Partido político",
        "tipo": "Campaña / oposición",
        "ambito": "nacional",
        "terms": ["pp", "feijoo", "feijóo", "partido popular", "populares"],
    },
    {
        "id": "repsol",
        "db_id": None,
        "nombre": "REPSOL",
        "sector": "Riesgo regulatorio",
        "tipo": "Public Affairs",
        "ambito": "nacional",
        "terms": ["repsol", "energia", "energía", "carburante", "petroleo", "petróleo"],
    },
    {
        "id": "fide",
        "db_id": None,
        "nombre": "FUNDACIÓN FIDE",
        "sector": "Think tank / jurídico",
        "tipo": "Inteligencia institucional",
        "ambito": "nacional",
        "terms": ["fide", "fundacion", "fundación", "justicia", "ley", "juridico", "jurídico"],
    },
    {
        "id": "ayto-madrid",
        "db_id": None,
        "nombre": "AYTO. MADRID",
        "sector": "Gestión política local",
        "tipo": "Asuntos públicos",
        "ambito": "local",
        "terms": ["madrid", "ayuntamiento", "almeida", "comunidad de madrid"],
    },
]


_STOPWORDS = {
    "sobre", "desde", "entre", "para", "ante", "tras", "gobierno", "partido",
    "politica", "política", "espana", "españa", "dice", "sera", "será",
    "hace", "nuevo", "nueva", "presidente", "ministro", "ministra",
}


def _norm(value: Any) -> str:
    txt = unicodedata.normalize("NFKD", str(value or "").lower())
    txt = "".join(ch for ch in txt if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", txt).strip()


def _slug(value: Any) -> str:
    txt = _norm(value)
    txt = re.sub(r"[^a-z0-9]+", "-", txt).strip("-")
    return txt or "workspace"


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return float(default)
        out = float(value)
        return out if math.isfinite(out) else float(default)
    except Exception:
        return float(default)


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(round(_safe_float(value, default)))
    except Exception:
        return int(default)


def _to_datetime(value: Any) -> datetime | None:
    dt = pd.to_datetime(value, errors="coerce", utc=True)
    if pd.isna(dt):
        return None
    return dt.to_pydatetime()


def _iso(value: Any) -> str | None:
    dt = _to_datetime(value)
    return dt.isoformat() if dt else None


def _match_workspace(text: str, workspace: dict[str, Any]) -> bool:
    haystack = _norm(text)
    terms = [_norm(t) for t in (workspace.get("terms") or []) if str(t).strip()]
    if not terms:
        return True
    return any(term and term in haystack for term in terms)


def _jsonable(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_jsonable(v) for v in value]
    if isinstance(value, tuple):
        return [_jsonable(v) for v in value]
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, datetime):
        return value.isoformat()
    if value is not None and not isinstance(value, (dict, list, tuple, str)):
        try:
            if bool(pd.isna(value)):
                return None
        except Exception:
            pass
    return value


def _git_amigos():
    """Import diferido del puente local para no penalizar el arranque."""
    try:
        from dashboard.services import git_amigos_bridge

        return git_amigos_bridge
    except Exception as exc:
        logger.debug("Git Amigos no disponible: %s", exc)
        return None


def _row_value(row: dict[str, Any], *names: str, default: Any = None) -> Any:
    for name in names:
        if name in row and row.get(name) is not None:
            return row.get(name)
    return default


@_ttl_cache(seconds=60, maxsize=2)
def list_workspaces() -> list[dict[str, Any]]:
    """Lista workspaces/clientes.

    Prioriza la tabla `clientes`. Si no existe o está vacía, usa workspaces
    locales conocidos, pero todo su estado se calcula con señales vivas.
    """
    try:
        from dashboard.services import campana

        df = campana.listar_clientes(solo_activos=True)
        if df is not None and not df.empty:
            out: list[dict[str, Any]] = []
            for _, row in df.iterrows():
                nombre = str(row.get("nombre") or "Cliente")
                tipo = str(row.get("tipo") or "workspace")
                ambito = str(row.get("ambito") or "nacional")
                terms = [nombre, *[t for t in re.split(r"[\s—,-]+", nombre) if len(t) >= 3]]
                out.append(
                    {
                        "id": f"cliente-{int(row.get('id'))}",
                        "db_id": int(row.get("id")),
                        "nombre": nombre,
                        "sector": tipo,
                        "tipo": tipo,
                        "ambito": ambito,
                        "terms": terms,
                    }
                )
            return out
    except Exception as exc:
        logger.warning("No se pudieron cargar clientes DB: %s", exc)
    return [dict(ws) for ws in _DEFAULT_WORKSPACES]


def get_workspace(workspace_id: str | int | None) -> dict[str, Any]:
    workspaces = list_workspaces()
    if workspace_id is None:
        return workspaces[0]
    target = str(workspace_id)
    for ws in workspaces:
        if str(ws.get("id")) == target or str(ws.get("db_id")) == target:
            return ws
    return workspaces[0]


def _normalizar_noticia(item: dict[str, Any]) -> dict[str, Any]:
    titulo = str(_row_value(item, "titulo", "titular", "title", default="Sin título"))
    resumen = str(_row_value(item, "resumen", "summary", "description", default="") or "")
    fuente = str(_row_value(item, "medio", "fuente", "source_id", "source", default="RSS") or "RSS")
    fecha_raw = _row_value(item, "fecha", "fecha_publicacion", "published_at", "created_at", default="")
    fecha_dt = _to_datetime(fecha_raw)
    partidos = _row_value(item, "partidos", "partidos_mencionados", "partidos_json", default=[])
    if isinstance(partidos, str):
        partidos = [p.strip() for p in partidos.replace(";", ",").split(",") if p.strip()]
    elif not isinstance(partidos, list):
        partidos = []
    sent = _safe_float(_row_value(item, "sentimiento", "sentimiento_score", default=0.0), 0.0)
    return {
        "id": str(_row_value(item, "id", "url", default=titulo))[:220],
        "titulo": titulo,
        "resumen": resumen,
        "fuente": fuente,
        "url": str(_row_value(item, "url", "url_canonical", default="") or ""),
        "fecha": fecha_dt.isoformat() if fecha_dt else str(fecha_raw or ""),
        "fecha_dt": fecha_dt,
        "categoria": str(_row_value(item, "tema", "categoria", default="general") or "general"),
        "partidos": partidos,
        "sentimiento": sent,
        "texto": f"{titulo} {resumen} {fuente} {' '.join(partidos)}",
    }


@_ttl_cache(seconds=180, maxsize=8)
def load_live_news(limit: int = 100) -> list[dict[str, Any]]:
    """Noticias reales desde crawler/RSS/BD, en ese orden."""
    items: list[dict[str, Any]] = []
    try:
        from dashboard.services.news_crawler import cargar_noticias

        items = cargar_noticias(max_noticias=limit) or []
    except Exception:
        items = []
    if not items:
        try:
            from dashboard.services.rss_feeds import cargar_noticias_rss

            items = cargar_noticias_rss(max_noticias=limit) or []
        except Exception:
            items = []
    if not items:
        try:
            from dashboard import db

            df = db.cargar_noticias_recientes(dias=7, limit=limit)
            items = df.to_dict("records") if df is not None and not df.empty else []
        except Exception:
            items = []
    return [_normalizar_noticia(dict(item)) for item in items[:limit]]


def workspace_news(workspace_id: str | int | None, limit: int = 40) -> list[dict[str, Any]]:
    ws = get_workspace(workspace_id)
    news = load_live_news(max(limit * 3, 60))
    matched = [n for n in news if _match_workspace(n.get("texto", ""), ws)]
    return (matched or news)[:limit]


@_ttl_cache(seconds=60, maxsize=8)
def _recent_alert_rows(limit: int = 80) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc)
    try:
        from dashboard import db

        df = db.cargar_alertas(solo_no_leidas=True, limit=limit)
        if df is not None and not df.empty:
            for item in df.to_dict("records"):
                dt = _to_datetime(item.get("created_at"))
                # Las seeds antiguas sin pagina_relevante no deben dominar la sala.
                if dt and (now - dt).days > 45 and not item.get("pagina_relevante"):
                    continue
                rows.append(item)
    except Exception:
        pass

    try:
        from dashboard import db

        df_dyn = db.cargar_alertas_prensa_dinamicas(dias=14, ventana_reciente=3)
        if df_dyn is not None and not df_dyn.empty:
            for item in df_dyn.to_dict("records"):
                rows.append(
                    {
                        "tipo": item.get("tipo", "prensa"),
                        "severidad": item.get("severidad", "WARNING"),
                        "titulo": item.get("titulo", "Alerta de prensa"),
                        "descripcion": item.get("detalle", ""),
                        "created_at": datetime.now(timezone.utc),
                        "fuente": "prensa_dinamica",
                    }
                )
    except Exception:
        pass
    return rows[:limit]


@_ttl_cache(seconds=60, maxsize=32)
def signal_alertas(workspace_id: str | int | None) -> dict[str, Any]:
    ws = get_workspace(workspace_id)
    rows = _recent_alert_rows()
    matched = [
        r for r in rows
        if _match_workspace(f"{r.get('titulo','')} {r.get('descripcion','')} {r.get('tipo','')}", ws)
    ]
    if not matched:
        matched = rows[:12]

    git = _git_amigos()
    if git is not None:
        try:
            matched.extend(git.alerts(limit=5))
        except Exception as exc:
            logger.debug("No se pudieron agregar alertas Git Amigos: %s", exc)

    severities = [str(r.get("severidad") or "INFO").upper() for r in matched]
    crit = sum(1 for s in severities if s in {"CRITICAL", "CRITICO", "CRÍTICO"})
    elev = sum(1 for s in severities if s in {"WARNING", "ALTA", "HIGH"})
    mod = sum(1 for s in severities if s not in {"CRITICAL", "CRITICO", "CRÍTICO", "WARNING", "ALTA", "HIGH"})
    ultima = next((r for r, s in zip(matched, severities) if s in {"CRITICAL", "CRITICO", "CRÍTICO"}), matched[0] if matched else None)
    return {
        "criticas": crit,
        "elevadas": elev,
        "moderadas": mod,
        "total": len(matched),
        "ultima_critica": _jsonable(ultima) if ultima else None,
        "items": [_jsonable(r) for r in matched[:8]],
    }


@_ttl_cache(seconds=60, maxsize=32)
def signal_riesgo(workspace_id: str | int | None) -> dict[str, Any]:
    _ = get_workspace(workspace_id)
    score = None
    nivel = "sin_datos"
    componentes: dict[str, float] = {}
    delta = None
    fecha = None
    try:
        from dashboard import db

        df_idx = db.cargar_indices_politeia()
        if df_idx is not None and not df_idx.empty:
            row = None
            for code in ("ITEP", "ICGE", "ICED", "IRP"):
                cand = df_idx[df_idx.get("indice_codigo", "").astype(str).str.upper() == code]
                if not cand.empty:
                    row = cand.iloc[0]
                    break
            if row is None:
                row = df_idx.iloc[0]
            score = _safe_float(row.get("valor"), 0.0)
            sem = str(row.get("semaforo") or "").upper()
            nivel = "critico"if sem in {"ROJO", "CRITICAL"} else "alto"if sem in {"AMARILLO", "WARNING"} else "bajo"
            delta = _safe_float(row.get("variacion_7d"), 0.0) if row.get("variacion_7d") is not None else None
            fecha = str(row.get("fecha_calculo") or "")
            raw_comp = row.get("componentes_json")
            if isinstance(raw_comp, str):
                raw_comp = json.loads(raw_comp)
            if isinstance(raw_comp, dict):
                componentes = {str(k): round(_safe_float(v), 1) for k, v in raw_comp.items()}
    except Exception as exc:
        logger.warning("signal_riesgo indices: %s", exc)

    if score is None:
        try:
            from dashboard import db

            df_risk = db.cargar_indicadores_riesgo()
            if df_risk is not None and not df_risk.empty:
                row = df_risk.iloc[0]
                raw_score = _safe_float(row.get("indice_compuesto"), 0.0)
                score = raw_score * 10 if raw_score <= 10 else raw_score
                nivel = "critico"if score >= 70 else "alto"if score >= 40 else "bajo"
                fecha = str(row.get("fecha_calculo") or "")
                raw_comp = row.get("dimensiones_json")
                if isinstance(raw_comp, str):
                    raw_comp = json.loads(raw_comp)
                if isinstance(raw_comp, dict):
                    componentes = {str(k): round((_safe_float(v) * 10 if _safe_float(v) <= 10 else _safe_float(v)), 1) for k, v in raw_comp.items()}
        except Exception:
            pass
    git = _git_amigos()
    git_risk: dict[str, Any] = {}
    if git is not None:
        try:
            git_risk = git.risk_components()
            for key, value in git_risk.get("componentes", {}).items():
                componentes[f"git_{key}"] = round(_safe_float(value), 1)
        except Exception as exc:
            logger.debug("No se pudo calcular riesgo Git Amigos: %s", exc)

    score = round(_safe_float(score, 0.0), 1)
    if git_risk and score <= 0:
        score = round(_safe_float(git_risk.get("score")), 1)
        nivel = "critico"if score >= 70 else "alto"if score >= 40 else "bajo"
    return {
        "score": score,
        "delta_24h": delta,
        "nivel": nivel,
        "componentes": componentes,
        "fecha": fecha,
        "git_amigos": git_risk,
    }


@_ttl_cache(seconds=300, maxsize=32)
def signal_legislativo(workspace_id: str | int | None) -> dict[str, Any]:
    ws = get_workspace(workspace_id)
    rows: list[dict[str, Any]] = []
    try:
        from dashboard import db

        df = db.cargar_boe_publicaciones(dias=3, limit=50, solo_alta_media=True)
        if df is not None and not df.empty:
            for row in df.to_dict("records"):
                text = f"{row.get('titulo','')} {row.get('resumen','')} {row.get('departamento','')}"
                if _match_workspace(text, ws):
                    rows.append(row)
            if not rows:
                rows = df.head(6).to_dict("records")
    except Exception:
        rows = []
    top = [
        {
            "titulo": str(r.get("titulo") or "Norma sin título")[:180],
            "fecha": str(r.get("fecha") or ""),
            "relevancia": str(r.get("relevancia") or ""),
            "url": str(r.get("url_html") or ""),
        }
        for r in rows[:3]
    ]
    git_items: list[dict[str, Any]] = []
    git = _git_amigos()
    if git is not None:
        try:
            query = " ".join(str(t) for t in (ws.get("terms") or []))
            git_items = git.legislative_signals(query=query, limit=5)
            for item in git_items[: max(0, 3 - len(top))]:
                top.append(
                    {
                        "titulo": str(item.get("title") or item.get("label") or "Fuente legislativa Git Amigos")[:180],
                        "fecha": "local",
                        "relevancia": item.get("label", "Git Amigos"),
                        "url": "",
                    }
                )
        except Exception as exc:
            logger.debug("No se pudieron agregar señales legislativas Git Amigos: %s", exc)
    return {
        "nuevas_normas_24h": len(rows) + len(git_items),
        "tramitaciones_activas": len(top),
        "top3_relevantes": top,
        "git_amigos": git_items[:5],
    }


@_ttl_cache(seconds=180, maxsize=32)
def signal_medios(workspace_id: str | int | None) -> dict[str, Any]:
    news = workspace_news(workspace_id, limit=80)
    words: Counter[str] = Counter()
    for item in news:
        for token in re.findall(r"[A-Za-zÁÉÍÓÚáéíóúÑñüÜ]{5,}", _norm(item.get("titulo", ""))):
            if token not in _STOPWORDS:
                words[token] += 1
    top_word, top_n = words.most_common(1)[0] if words else ("sin datos", 0)
    factchecks = _factchecks(workspace_id, limit=20)
    max_level = "critico"if any("FALSO"in str(f.get("verdict", "")).upper() for f in factchecks) else "alto"if factchecks else "bajo"
    git_osint: list[dict[str, Any]] = []
    git = _git_amigos()
    if git is not None:
        try:
            query = " ".join(str(t) for t in (get_workspace(workspace_id).get("terms") or []))
            git_osint = git.osint_signals(query=query, limit=5)
            if git_osint and top_word == "sin datos":
                top_word = str(git_osint[0].get("label") or "osint")
                top_n = max(top_n, len(git_osint))
                max_level = "alto"
        except Exception as exc:
            logger.debug("No se pudieron agregar señales OSINT Git Amigos: %s", exc)
    return {
        "narrativas_activas": len([w for w, n in words.items() if n >= 2]),
        "nivel_amenaza_max": max_level,
        "top_narrativa": {"label": top_word, "n_piezas": int(top_n), "velocidad": int(top_n)},
        "noticias": [_jsonable(n) for n in news[:8]],
        "factchecks": [_jsonable(f) for f in factchecks[:5]],
        "git_amigos": git_osint,
    }


@_ttl_cache(seconds=120, maxsize=32)
def signal_electoral(workspace_id: str | int | None) -> dict[str, Any]:
    ws = get_workspace(workspace_id)
    try:
        from dashboard import db

        df = db.cargar_nowcasting()
    except Exception:
        df = pd.DataFrame()
    if df is None or df.empty:
        return {"ultimo_nowcasting_fecha": None, "nueva_encuesta_hoy": False, "snapshot": []}
    rows = df.sort_values("estimacion_pct", ascending=False).to_dict("records")
    matched = [
        r for r in rows
        if _match_workspace(f"{r.get('partido_siglas','')} {r.get('partido_nombre','')}", ws)
    ]
    focus = matched[0] if matched else rows[0]
    fecha = str(focus.get("fecha_calculo") or "")
    today = datetime.now().date().isoformat()
    snapshot = [
        {
            "partido": str(r.get("partido_siglas") or ""),
            "pct": round(_safe_float(r.get("estimacion_pct")), 2),
            "encuestas": _safe_int(r.get("n_encuestas"), 0),
        }
        for r in rows[:6]
    ]
    return {
        "ultimo_nowcasting_fecha": fecha,
        "nueva_encuesta_hoy": fecha.startswith(today),
        "partido_focus": str(focus.get("partido_siglas") or ""),
        "estimacion_focus": round(_safe_float(focus.get("estimacion_pct")), 2),
        "snapshot": snapshot,
    }


@_ttl_cache(seconds=180, maxsize=32)
def signal_geopolitica(workspace_id: str | int | None) -> dict[str, Any]:
    """
    Señales geopolíticas para el Centro de Operaciones.
    Fuente primaria: módulo geo (alertas_geo.json + osint_geo.json + ACLED demo).
    Fallback: keyword matching en noticias de workspace.
    """
    # ── Fuente primaria: módulo geo v2 ────────────────────────────────────────
    alertas_criticas: list[dict] = []
    osint_urgentes: list[dict] = []
    paises_top_osint: list[dict] = []
    acled_count = 0
    riesgo_max: dict[str, Any] = {}

    try:
        from dashboard.utils.geo_helpers import (
            get_alertas_nivel,
            get_count_alertas,
            get_osint_filtered,
            get_paises_mas_mencionados,
            get_riesgo_pais,
            get_eventos_acled,
        )
        # Alertas activas CRITICO + ALTO
        alertas_criticas = get_alertas_nivel(nivel="CRITICO", limite=3)
        alertas_altas = get_alertas_nivel(nivel="ALTO", limite=3)
        alertas_count_map = get_count_alertas()

        # OSINT urgentes (urgencia >= 4)
        osint_urgentes = get_osint_filtered(horas=24, urgencia_min=4, relevancia_min=0.6, limit=5)

        # Países más mencionados
        paises_top_osint = get_paises_mas_mencionados(horas=24, top_n=5)

        # Eventos ACLED recientes
        eventos_acled = get_eventos_acled(days=7, relevancia_min=0.5, limite=5)
        acled_count = len(eventos_acled)

        # País con mayor riesgo × interés
        paises_riesgo = get_riesgo_pais(interes_min=0.6, limit=3)
        if paises_riesgo:
            top_p = max(paises_riesgo, key=lambda p: float(p.get("score_total", 0)) * float(p.get("interes_espana", 0)))
            riesgo_max = {
                "pais": top_p.get("nombre", top_p.get("pais", "")),
                "score": float(top_p.get("score_total", 0)),
                "tendencia": top_p.get("riesgo_tendencia", "estable"),
                "flag": top_p.get("flag_emoji", "🌍"),
            }

        # Determinar nivel global basado en alertas
        if alertas_count_map.get("CRITICO", 0) > 0:
            nivel_global = "critico"
        elif alertas_count_map.get("ALTO", 0) >= 2:
            nivel_global = "alto"
        elif alertas_count_map.get("ALTO", 0) > 0 or alertas_count_map.get("MEDIO", 0) >= 3:
            nivel_global = "medio"
        else:
            nivel_global = "bajo"

        total_señales = (
            len(osint_urgentes) +
            alertas_count_map.get("CRITICO", 0) +
            alertas_count_map.get("ALTO", 0) +
            acled_count
        )

        return {
            "señales_relevantes_24h": total_señales,
            "pais_top": riesgo_max.get("pais") or (paises_top_osint[0]["pais"] if paises_top_osint else None),
            "nivel_top": nivel_global,
            "alertas_criticas": len(alertas_criticas),
            "alertas_altas": len(alertas_altas) if "alertas_altas" in dir() else alertas_count_map.get("ALTO", 0),
            "osint_urgentes": len(osint_urgentes),
            "acled_eventos": acled_count,
            "riesgo_max": riesgo_max,
            "items": [
                {"region": p["pais"], "n": p["menciones"]}
                for p in paises_top_osint[:5]
            ],
            "alertas_resumen": [
                {
                    "titulo": a.get("titulo", "")[:100],
                    "nivel": a.get("nivel", ""),
                    "creada_en": a.get("creada_en", "")[:16],
                }
                for a in (alertas_criticas + (alertas_altas if "alertas_altas" in dir() else []))[:4]
            ],
            "git_amigos": [],
            "fuente": "geo_module_v2",
        }
    except Exception as exc:
        logger.debug("geo_module_v2 no disponible, fallback a keywords: %s", exc)

    # ── Fallback: keyword matching en noticias ───────────────────────────────
    keywords = {
        "UE": ["ue", "union europea", "bruselas", "europeo"],
        "EEUU": ["eeuu", "trump", "washington", "arancel"],
        "Rusia/Ucrania": ["rusia", "ucrania", "zelenski", "putin"],
        "Oriente Medio": ["gaza", "israel", "iran", "palestina"],
        "Marruecos": ["marruecos", "sahara", "rabat"],
        "Argelia": ["argelia", "gas", "medgaz", "tlemcen"],
        "Sahel": ["sahel", "mali", "niger", "burkina", "yihad"],
    }
    news = workspace_news(workspace_id, limit=80)
    counts: Counter[str] = Counter()
    for item in news:
        text = _norm(f"{item.get('titulo','')} {item.get('resumen','')}")
        for region, terms in keywords.items():
            if any(_norm(t) in text for t in terms):
                counts[region] += 1
    git_geo: list[dict[str, Any]] = []
    git = _git_amigos()
    if git is not None:
        try:
            query = " ".join(str(t) for t in (get_workspace(workspace_id).get("terms") or []))
            git_geo = git.geopolitical_signals(query=query, limit=5)
            for item in git_geo:
                counts[str(item.get("pais") or item.get("label") or "Git Amigos")] += 1
        except Exception as exc_git:
            logger.debug("No se pudieron agregar señales geopolíticas Git Amigos: %s", exc_git)
    top = counts.most_common(1)[0] if counts else (None, 0)
    return {
        "señales_relevantes_24h": int(sum(counts.values())),
        "pais_top": top[0],
        "nivel_top": "alto" if top[1] >= 4 else "medio" if top[1] else "bajo",
        "alertas_criticas": 0,
        "alertas_altas": 0,
        "osint_urgentes": 0,
        "acled_eventos": 0,
        "riesgo_max": {},
        "items": [{"region": k, "n": int(v)} for k, v in counts.most_common(5)],
        "alertas_resumen": [],
        "git_amigos": git_geo,
        "fuente": "keyword_fallback",
    }


@_ttl_cache(seconds=300, maxsize=32)
def _factchecks(workspace_id: str | int | None, limit: int = 20) -> list[dict[str, Any]]:
    ws = get_workspace(workspace_id)
    rows: list[dict[str, Any]] = []
    try:
        from dashboard import db

        df = db.cargar_fact_checks(dias=30, limit=limit)
        rows = df.to_dict("records") if df is not None and not df.empty else []
    except Exception:
        rows = []
    if not rows:
        try:
            from etl.sources.factcheck_feeds import fetch_all_factchecks

            rows = fetch_all_factchecks(limit_per_source=max(3, limit // 4))
        except Exception:
            rows = []
    out = []
    for row in rows:
        text = f"{row.get('titular','')} {row.get('resumen','')} {row.get('claim_text','')} {row.get('partidos_json','')} {row.get('temas_json','')}"
        if _match_workspace(text, ws):
            out.append(row)
    return (out or rows)[:limit]


@_ttl_cache(seconds=60, maxsize=32)
def all_signals(workspace_id: str | int | None) -> dict[str, Any]:
    return {
        "riesgo": signal_riesgo(workspace_id),
        "alertas": signal_alertas(workspace_id),
        "legislativo": signal_legislativo(workspace_id),
        "medios": signal_medios(workspace_id),
        "electoral": signal_electoral(workspace_id),
        "geopolitica": signal_geopolitica(workspace_id),
    }


@_ttl_cache(seconds=60, maxsize=32)
def workspace_status(workspace_id: str | int | None) -> dict[str, Any]:
    signals = all_signals(workspace_id)
    estado = workspace_estado_ahora(workspace_id, signals=signals)
    return {
        "workspace_id": str(get_workspace(workspace_id).get("id")),
        "alertas_criticas": signals["alertas"]["criticas"],
        "alertas_total": signals["alertas"]["total"],
        "riesgo": signals["riesgo"]["score"],
        "riesgo_nivel": signals["riesgo"]["nivel"],
        "proximo_deadline": estado["proximos_eventos"][0]["label"] if estado["proximos_eventos"] else None,
        "borradores_activos": estado["borradores_activos"],
        "noticias_activas": len(signals["medios"].get("noticias", [])),
    }


@_ttl_cache(seconds=300, maxsize=2)
def _agenda_source_rows(limit: int = 80) -> list[dict[str, Any]]:
    """Carga la agenda viva una sola vez y deja el filtrado al workspace."""
    rows: list[dict[str, Any]] = []
    try:
        from dashboard import db

        df = db.cargar_agenda_institucional(dias_atras=0, dias_adelante=14, limit=limit)
        if df is not None and not df.empty:
            rows = [dict(row, _agenda_source="db") for row in df.to_dict("records")]
    except Exception:
        pass

    if not rows:
        try:
            from etl.sources.agendas_dinamicas import fetch_all_agendas

            rows = fetch_all_agendas(max_items_per_source=4, timeout=8)
            rows = [dict(row, _agenda_source="feed") for row in rows]
        except Exception:
            pass

    return rows[:limit]


def _agenda_event_from_row(row: dict[str, Any], idx: int) -> dict[str, Any]:
    if row.get("_agenda_source") == "db":
        return {
            "id": f"agenda-{idx}",
            "label": str(row.get("title") or "Evento institucional")[:120],
            "fecha": str(row.get("event_date") or ""),
            "hora": str(row.get("time_start") or "")[:5],
            "tipo": str(row.get("event_type") or "institucional"),
            "fuente": str(row.get("source_id") or ""),
            "url": str(row.get("source_url") or ""),
            "match_text": f"{row.get('title','')} {row.get('description','')} {row.get('main_actor','')} {row.get('party_id','')} {row.get('topic','')}",
        }
    return {
        "id": f"feed-agenda-{idx}",
        "label": str(row.get("titulo") or "Evento institucional")[:120],
        "fecha": str(row.get("fecha_publicacion") or row.get("fecha") or "")[:10],
        "hora": "",
        "tipo": str(row.get("tipo") or "institucional"),
        "fuente": str(row.get("fuente") or "agenda"),
        "url": str(row.get("url") or ""),
        "match_text": f"{row.get('titulo','')} {row.get('resumen','')} {row.get('fuente','')}",
    }


@_ttl_cache(seconds=300, maxsize=32)
def _calendar_events(workspace_id: str | int | None, limit: int = 8) -> list[dict[str, Any]]:
    ws = get_workspace(workspace_id)
    all_events = [_agenda_event_from_row(row, idx) for idx, row in enumerate(_agenda_source_rows(limit=80))]
    matched = [event for event in all_events if _match_workspace(event.get("match_text", ""), ws)]
    selected = matched or all_events
    return [{k: v for k, v in event.items() if k != "match_text"} for event in selected[:limit]]


def workspace_estado_ahora(workspace_id: str | int | None, *, signals: dict[str, Any] | None = None) -> dict[str, Any]:
    signals = signals or all_signals(workspace_id)
    eventos = _calendar_events(workspace_id, limit=6)
    tareas = []
    alertas = signals["alertas"]
    if alertas["criticas"] > 0:
        tareas.append({"id": "t-alertas", "titulo": "Revisar alertas críticas", "prioridad": "alta"})
    if signals["legislativo"]["nuevas_normas_24h"] > 0:
        tareas.append({"id": "t-boe", "titulo": "Valorar impacto normativo", "prioridad": "media"})
    if signals["medios"]["nivel_amenaza_max"] in {"critico", "alto"}:
        tareas.append({"id": "t-medios", "titulo": "Preparar respuesta narrativa", "prioridad": "media"})
    return {
        "alertas_activas": int(alertas["total"]),
        "riesgo": signals["riesgo"]["score"],
        "borradores_activos": 0,
        "notas_count": 0,
        "canvas_activos": 1 if signals["medios"]["noticias"] else 0,
        "proximos_eventos": eventos,
        "tareas_pendientes": tareas,
    }


@_ttl_cache(seconds=60, maxsize=32)
def workspace_timeline(workspace_id: str | int | None, limit: int = 30) -> dict[str, Any]:
    ws = get_workspace(workspace_id)
    items: list[dict[str, Any]] = []
    for row in signal_alertas(workspace_id).get("items", []):
        items.append(
            {
                "id": f"alerta-{len(items)}",
                "tipo": "alerta_disparada",
                "icono": "",
                "titulo": str(row.get("titulo") or "Alerta")[:180],
                "meta": str(row.get("severidad") or "INFO"),
                "created_at": _iso(row.get("created_at")) or datetime.now(timezone.utc).isoformat(),
                "url": "",
            }
        )
    for row in workspace_news(workspace_id, limit=12):
        items.append(
            {
                "id": f"news-{row.get('id')}",
                "tipo": "noticia_relevante",
                "icono": "",
                "titulo": row.get("titulo"),
                "meta": row.get("fuente"),
                "created_at": row.get("fecha") or datetime.now(timezone.utc).isoformat(),
                "url": row.get("url"),
            }
        )
    for ev in _calendar_events(workspace_id, limit=8):
        items.append(
            {
                "id": ev.get("id"),
                "tipo": "evento_agenda",
                "icono": "",
                "titulo": ev.get("label"),
                "meta": ev.get("fuente") or ev.get("tipo"),
                "created_at": ev.get("fecha") or datetime.now(timezone.utc).isoformat(),
                "url": ev.get("url"),
            }
        )
    for fc in _factchecks(workspace_id, limit=6):
        items.append(
            {
                "id": f"fact-{len(items)}",
                "tipo": "factcheck",
                "icono": "⚠",
                "titulo": str(fc.get("titular") or fc.get("titulo") or "Verificación")[:180],
                "meta": str(fc.get("verdict") or fc.get("source_id") or "fact-check"),
                "created_at": _iso(fc.get("published_at")) or datetime.now(timezone.utc).isoformat(),
                "url": str(fc.get("url") or ""),
            }
        )
    git = _git_amigos()
    if git is not None:
        try:
            for idx, doc in enumerate(git.legislative_signals(query=" ".join(ws.get("terms") or []), limit=5)):
                items.append(
                    {
                        "id": f"git-amigos-{idx}",
                        "tipo": "norma_relevante",
                        "icono": "",
                        "titulo": str(doc.get("title") or doc.get("label") or "Fuente Git Amigos")[:180],
                        "meta": str(doc.get("label") or doc.get("repo") or "Git Amigos"),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "url": "",
                    }
                )
        except Exception:
            pass
    items.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return {"workspace": ws, "items": [_jsonable(item) for item in items[:limit]]}


@_ttl_cache(seconds=120, maxsize=32)
def morning_briefing(workspace_id: str | int | None) -> dict[str, Any]:
    ws = get_workspace(workspace_id)
    signals = all_signals(workspace_id)
    timeline = workspace_timeline(workspace_id, limit=6)["items"]
    bullets = [
        f"Riesgo operativo: {signals['riesgo']['score']}/100 ({signals['riesgo']['nivel']}).",
        f"Alertas activas: {signals['alertas']['total']} ({signals['alertas']['criticas']} críticas).",
        f"Narrativa dominante: {signals['medios']['top_narrativa']['label']} ({signals['medios']['top_narrativa']['n_piezas']} piezas).",
        f"Señales legislativas: {signals['legislativo']['nuevas_normas_24h']} normas o tramitaciones relevantes.",
    ]
    git = _git_amigos()
    if git is not None:
        try:
            summary = git.summary_for_module("D10")
            bullets.append(
                f"Git Amigos: {summary['repos_disponibles']}/{summary['repos_catalogados']} repos locales activos como fuentes de apoyo."
            )
        except Exception:
            pass
    return {
        "workspace_id": ws["id"],
        "titulo": f"Morning briefing — {ws['nombre']}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "bullets": bullets,
        "timeline": timeline,
    }


@_ttl_cache(seconds=60, maxsize=8)
def global_activity(limit: int = 8) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for ws in list_workspaces():
        try:
            tl = workspace_timeline(ws["id"], limit=3).get("items", [])
            for item in tl:
                item = dict(item)
                item["workspace"] = ws["nombre"]
                items.append(item)
        except Exception:
            continue
    items.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return items[:limit]


def api_payload(value: Any) -> Any:
    """Convierte payloads con pandas/datetime a JSON estándar."""
    return _jsonable(value)
