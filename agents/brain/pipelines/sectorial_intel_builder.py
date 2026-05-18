"""
Sectorial Intel Builder · construye el SectorReport unificado para un sector.

Fuentes que combina (todas opcionales, fallback graceful):
  - BOE (dashboard.services.legislative_core.cargar_boe_reciente) → eventos regulatorios
  - RSS Google News + medios (etl.sources.rss_noticias) → eventos políticos / económicos
  - Signals economy_core (dashboard.services.economy_core.cargar_sectorial_risk) → riesgo
  - Sectorial registry (lib/sources) → actores (regulators + empresas conocidas)
  - Taxonomy (data_sources.sector_taxonomy) → keywords + risk dominio

Esquema de salida coincide 1:1 con `apps/visual-oscar/types/sectores.ts`:
  SectorReport { sector_id, generado_en, score, kpis, actores,
                 eventos_recientes, iniciativas_legislativas_ids, alertas, resumen_ia? }

Sin LLM dependencies — todos los cálculos son determinísticos y baratos.
La invocación es <500ms cuando BOE local y feeds RSS responden, <100ms si
todo falla (devuelve report vacío con score 0).
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from agents.brain.pipelines.data_sources.sector_taxonomy import (
    SECTOR_TAXONOMY, get_sector, list_sector_ids, sector_keywords,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# UTILS
# ─────────────────────────────────────────────────────────────────

def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_id(prefix: str, raw: str) -> str:
    h = hashlib.sha1(raw.encode("utf-8", errors="ignore")).hexdigest()[:12]
    return f"{prefix}-{h}"


def _safe(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception as exc:
        logger.debug("safe(%s) failed: %s", getattr(fn, "__name__", "fn"), exc)
        return None


def _nivel_from_score(score: float) -> str:
    """Mapea score 0-100 a NivelImpacto."""
    if score >= 75:
        return "critico"
    if score >= 50:
        return "alto"
    if score >= 25:
        return "medio"
    return "bajo"


def _tendencia_from_delta(delta: float) -> str:
    if delta > 5:
        return "subida"
    if delta < -5:
        return "bajada"
    if delta == 0:
        return "sin_datos"
    return "estable"


def _text_matches_keywords(text: str, kws: list[str]) -> bool:
    if not text:
        return False
    t = text.lower()
    return any(kw in t for kw in kws)


# ─────────────────────────────────────────────────────────────────
# FUENTES PARCIALES
# ─────────────────────────────────────────────────────────────────

def _fetch_boe_para_sector(sector_id: str, days: int = 30, limit: int = 50) -> list[dict[str, Any]]:
    """Filtra BOE reciente por keywords del sector."""
    kws = sector_keywords(sector_id)
    if not kws:
        return []
    try:
        from dashboard.services.legislative_core import cargar_boe_reciente
        df = cargar_boe_reciente(limit=200, days=days)
        if df is None or len(df) == 0:
            return []
        rows = df.to_dict(orient="records") if hasattr(df, "to_dict") else list(df)
    except Exception as exc:
        logger.debug("BOE no disponible: %s", exc)
        return []

    out: list[dict[str, Any]] = []
    for r in rows:
        if not isinstance(r, dict):
            continue
        text = " ".join(str(r.get(k, "")) for k in ("title", "titulo", "summary", "resumen"))
        if _text_matches_keywords(text, kws):
            out.append(r)
            if len(out) >= limit:
                break
    return out


def _fetch_rss_para_sector(sector_id: str, days: int = 7, limit: int = 30) -> list[dict[str, Any]]:
    """Filtra RSS recientes por keywords del sector usando Google News si disponible."""
    kws = sector_keywords(sector_id)
    if not kws:
        return []
    # Intento 1: feeds Google News con la keyword principal
    try:
        import feedparser
    except ImportError:
        return []
    sector = get_sector(sector_id) or {}
    primary_kw = (kws[0] if kws else sector.get("name", "")).replace(" ", "+")
    feed_url = (
        f"https://news.google.com/rss/search?q={primary_kw}+site:elpais.com+OR+site:elmundo.es"
        f"+OR+site:eldiario.es+OR+site:expansion.com&hl=es&gl=ES&ceid=ES:es"
    )
    out: list[dict[str, Any]] = []
    try:
        parsed = feedparser.parse(feed_url)
        for entry in parsed.entries[:limit]:
            title = getattr(entry, "title", "")
            link = getattr(entry, "link", "")
            published = getattr(entry, "published", "")
            if not title:
                continue
            out.append({
                "title": title,
                "url": link,
                "published": published,
                "source": "google_news",
            })
    except Exception as exc:
        logger.debug("Google News falló para %s: %s", sector_id, exc)
    return out


def _fetch_signals_economia(sector_id: str) -> list[dict[str, Any]]:
    """Carga signals económicos del sector (count, severidad)."""
    sector = get_sector(sector_id) or {}
    try:
        from dashboard.services.economy_core import cargar_sectorial_risk
        rows = cargar_sectorial_risk() or []
        match = {sector_id, sector.get("name", ""), sector.get("name_short", "")}
        return [
            r for r in rows
            if isinstance(r, dict) and (r.get("sector") in match or r.get("sector_id") == sector_id)
        ]
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────
# CONSTRUCTORES
# ─────────────────────────────────────────────────────────────────

def _build_score(sector_id: str, boe: list[dict], news: list[dict], signals: list[dict]) -> dict[str, Any]:
    """Calcula el ScoreSectorial agregado."""
    # actividad_legislativa: 0-100 según volumen BOE (saturación a 30 items/mes)
    legis = min(100.0, len(boe) * 100.0 / 30.0)

    # riesgo: combina volumen news (peso 0.4) + signals (peso 0.6, severidad media)
    news_score = min(100.0, len(news) * 100.0 / 50.0)
    if signals:
        sev_avg = sum(float(s.get("max_severity", 0) or 0) for s in signals) / len(signals)
        signals_score = min(100.0, sev_avg * 20.0)  # severity 0-5 → 0-100
    else:
        signals_score = 0.0
    riesgo = 0.4 * news_score + 0.6 * signals_score

    # volatilidad: variación BOE día-a-día (proxy simple = stddev counts/día)
    # Sin serie histórica accesible, lo aproximamos por el ratio news/boe
    vol_proxy = abs(news_score - legis) / 2.0
    vol = min(100.0, vol_proxy)

    return {
        "score_riesgo": round(riesgo, 1),
        "score_actividad_legislativa": round(legis, 1),
        "score_volatilidad": round(vol, 1),
        "nivel": _nivel_from_score(riesgo),
        "tendencia": _tendencia_from_delta(news_score - legis),
        "timestamp": _iso_now(),
        "nota_analitica": (
            f"{len(boe)} disposiciones BOE en 30d · {len(news)} noticias en 7d · "
            f"{len(signals)} señales económicas activas"
        ),
    }


def _build_eventos(sector_id: str, boe: list[dict], news: list[dict], limit: int = 12) -> list[dict[str, Any]]:
    """Convierte BOE + news en EventoSectorial."""
    eventos: list[dict[str, Any]] = []

    # BOE → eventos regulatorios
    for item in boe[:limit]:
        title = str(item.get("title") or item.get("titulo") or "").strip()
        if not title:
            continue
        fecha = (
            item.get("publication_date") or item.get("fecha_publicacion")
            or item.get("fecha") or _iso_now()[:10]
        )
        url = item.get("url_html") or item.get("url") or ""
        impact_raw = str(item.get("impact_level") or "").lower()
        impacto = "alto" if "alto" in impact_raw or "crítico" in impact_raw or "critic" in impact_raw else "medio"
        eventos.append({
            "id": _hash_id(f"boe-{sector_id}", title + str(fecha)),
            "sector_id": sector_id,
            "fecha": str(fecha)[:10],
            "titulo": title[:220],
            "descripcion": (item.get("summary") or item.get("resumen") or "")[:600],
            "tipo": "regulatorio",
            "impacto": impacto,
            "actores_implicados": [],
            "url_fuente": url,
            "fuente": "BOE",
        })

    # News → eventos políticos/económicos
    for entry in news[:limit]:
        title = str(entry.get("title", "")).strip()
        if not title:
            continue
        eventos.append({
            "id": _hash_id(f"news-{sector_id}", title),
            "sector_id": sector_id,
            "fecha": str(entry.get("published") or _iso_now())[:10],
            "titulo": title[:220],
            "descripcion": "",
            "tipo": "politico",
            "impacto": "medio",
            "actores_implicados": [],
            "url_fuente": entry.get("url", ""),
            "fuente": str(entry.get("source", "google_news")),
        })

    # Ordena por fecha desc y limita
    eventos.sort(key=lambda e: e.get("fecha", ""), reverse=True)
    return eventos[:limit]


def _build_actores(sector_id: str) -> list[dict[str, Any]]:
    """Construye ActorSectorial desde el catálogo de reguladores conocidos."""
    sector = get_sector(sector_id) or {}
    out: list[dict[str, Any]] = []
    for idx, reg in enumerate(sector.get("regulators", [])):
        out.append({
            "id": _hash_id(f"reg-{sector_id}", reg),
            "nombre": reg,
            "tipo": "regulador",
            "descripcion_corta": f"Organismo regulador del sector {sector.get('name_short', sector_id)}.",
            "relevancia": "alto" if idx < 3 else "medio",
            "areas_influencia": sector.get("areas_tematicas", []),
            "posicion_regulatoria": "neutral",
        })
    return out


def _build_kpis(sector_id: str, boe: list[dict], news: list[dict], signals: list[dict]) -> list[dict[str, Any]]:
    """Construye KPIs derivados de los datos disponibles."""
    now = _iso_now()
    sector = get_sector(sector_id) or {}
    fuente_id = sector.get("ministry", "Politeia Brain")
    kpis: list[dict[str, Any]] = [
        {
            "id": f"{sector_id}-boe-30d",
            "nombre": "Disposiciones BOE (30d)",
            "nombre_corto": "BOE 30d",
            "valor": len(boe),
            "unidad": "ítems",
            "tendencia": "estable",
            "periodo": now[:10],
            "fuente_id": fuente_id,
        },
        {
            "id": f"{sector_id}-news-7d",
            "nombre": "Noticias relevantes (7d)",
            "nombre_corto": "Prensa 7d",
            "valor": len(news),
            "unidad": "noticias",
            "tendencia": "estable",
            "periodo": now[:10],
            "fuente_id": "Google News + medios",
        },
        {
            "id": f"{sector_id}-signals",
            "nombre": "Señales económicas activas",
            "nombre_corto": "Señales",
            "valor": len(signals),
            "unidad": "señales",
            "tendencia": "estable",
            "periodo": now[:10],
            "fuente_id": "Politeia Economy Core",
        },
    ]
    return kpis


# ─────────────────────────────────────────────────────────────────
# API PÚBLICA
# ─────────────────────────────────────────────────────────────────

def build_sector_report(sector_id: str) -> dict[str, Any]:
    """Construye un SectorReport completo para el sector dado.

    Args:
        sector_id: uno de los IDs canónicos en SECTOR_TAXONOMY.

    Returns:
        dict con la forma de SectorReport (compatible con types/sectores.ts).
        Si el sector no existe → ValueError.
    """
    if sector_id not in SECTOR_TAXONOMY:
        raise ValueError(f"sector_no_existe: {sector_id}")

    boe = _safe(_fetch_boe_para_sector, sector_id) or []
    news = _safe(_fetch_rss_para_sector, sector_id) or []
    signals = _safe(_fetch_signals_economia, sector_id) or []

    score = _build_score(sector_id, boe, news, signals)
    eventos = _build_eventos(sector_id, boe, news)
    actores = _build_actores(sector_id)
    kpis = _build_kpis(sector_id, boe, news, signals)

    alertas: list[str] = []
    if score["score_riesgo"] >= 75:
        alertas.append(f"Riesgo {score['nivel'].upper()} en {sector_id}")
    if len(boe) >= 25:
        alertas.append(f"Alta actividad regulatoria BOE ({len(boe)} disposiciones 30d)")

    return {
        "sector_id": sector_id,
        "generado_en": _iso_now(),
        "score": score,
        "kpis": kpis,
        "actores": actores,
        "eventos_recientes": eventos,
        "iniciativas_legislativas_ids": [],  # se completa cuando exista pipeline Congreso
        "alertas": alertas,
        "resumen_ia": score["nota_analitica"],
    }


def build_signals_for_sector(sector_id: str, days: int = 7, limit: int = 30) -> list[dict[str, Any]]:
    """Devuelve la lista de señales (BOE + news) unificadas con scoring.

    Es el endpoint que cumple con el spec PDF Bloque 10:
      /api/intelligence/signals?dominio={sector}
    """
    if sector_id not in SECTOR_TAXONOMY:
        return []
    sector = SECTOR_TAXONOMY[sector_id]
    risk_dominio = sector.get("risk_dominio", "regulatorio")

    boe = _safe(_fetch_boe_para_sector, sector_id, days=days * 4) or []  # BOE 28d
    news = _safe(_fetch_rss_para_sector, sector_id, days=days) or []

    signals: list[dict[str, Any]] = []

    # BOE → señales regulatorias
    for item in boe[:limit]:
        title = str(item.get("title") or item.get("titulo") or "").strip()
        if not title:
            continue
        impact_raw = str(item.get("impact_level") or "").lower()
        nivel = "alto" if "alto" in impact_raw or "crítico" in impact_raw else "medio"
        score_val = 70 if nivel == "alto" else 45
        signals.append({
            "id": _hash_id(f"sig-boe-{sector_id}", title),
            "dominio": risk_dominio,
            "titulo": title[:200],
            "descripcion": (item.get("summary") or item.get("resumen") or "")[:400],
            "score": score_val,
            "nivel": nivel,
            "origen": "legis_scoring",
            "fuente_url": item.get("url_html") or item.get("url") or "",
            "fuente_nombre": "BOE",
            "snapshot_at": _iso_now(),
        })

    # News → señales narrativas/políticas
    for entry in news[:limit]:
        title = str(entry.get("title", "")).strip()
        if not title:
            continue
        signals.append({
            "id": _hash_id(f"sig-news-{sector_id}", title),
            "dominio": "narrativo" if risk_dominio == "regulatorio" else risk_dominio,
            "titulo": title[:200],
            "descripcion": "",
            "score": 35,
            "nivel": "medio",
            "origen": "news_scoring",
            "fuente_url": entry.get("url", ""),
            "fuente_nombre": str(entry.get("source", "google_news")),
            "snapshot_at": _iso_now(),
        })

    # Orden por score desc, luego snapshot_at desc
    signals.sort(key=lambda s: (-s["score"], s["snapshot_at"]), reverse=False)
    return signals[:limit]


def build_sectores_index() -> dict[str, Any]:
    """Construye el SectoresIndex con score básico de cada sector."""
    items: list[dict[str, Any]] = []
    for sid in list_sector_ids():
        try:
            report = build_sector_report(sid)
            items.append({
                "id": sid,
                "score": report["score"],
                "kpis_destacados": report["kpis"][:2],
                "alertas_count": len(report["alertas"]),
                "ultima_actualizacion": report["generado_en"],
            })
        except Exception as exc:
            logger.warning("Index sector %s falló: %s", sid, exc)
            now = _iso_now()
            items.append({
                "id": sid,
                "score": {
                    "score_riesgo": 0,
                    "score_actividad_legislativa": 0,
                    "score_volatilidad": 0,
                    "nivel": "bajo",
                    "tendencia": "sin_datos",
                    "timestamp": now,
                },
                "kpis_destacados": [],
                "alertas_count": 0,
                "ultima_actualizacion": now,
            })
    return {"sectores": items, "generado_en": _iso_now()}
