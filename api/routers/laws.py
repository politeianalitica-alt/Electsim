"""
Router /api/laws — timeline legislativo unificado.

Fuentes:
- BOE (datos abiertos · publicaciones oficiales del Estado)
- Congreso (iniciativas en tramitación · proposiciones de ley)
- Senado (actividad legislativa)

Estados:
- aprobada      (publicada en BOE)
- en_tramite    (entrada en Congreso/Senado, en ponencia o comisión)
- proxima_voto  (próxima sesión plenaria con votación)
- vetada        (rechazada en pleno)

Endpoint:
  GET /api/laws/timeline      — agregado timeline + análisis de cada ley
  GET /api/laws/upcoming-votes — próximas votaciones (24h-7d)
  GET /api/laws/stats         — estadísticas de actividad legislativa
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/laws", tags=["laws"])

BOE_API_BASE = "https://www.boe.es/datosabiertos/api/boe"
CONGRESO_INIT_URL = "https://www.congreso.es/opendata/iniciativas"  # gestionado vía rss alterno


def _categorize_norm(titulo: str) -> str:
    """Categoriza por keywords de título — alineado con narratives.py."""
    t = (titulo or "").lower()
    rules = [
        ("economia",      ["fiscal", "tributari", "presupuesto", "deuda", "ingresos", "salari", "vivienda", "alquiler", "hipoteca", "banca", "mercado", "ipc"]),
        ("justicia",      ["justicia", "ministerio fiscal", "tribunal", "judicial", "amnist", "indulto"]),
        ("seguridad",     ["seguridad", "defensa", "guardia civil", "policia", "fronter", "extranjeria"]),
        ("politica_interior", ["gobierno", "ministerio", "comunidades autonomas", "regimen local", "transparencia"]),
        ("sociedad",      ["sanidad", "educacion", "universidad", "salud", "discapacidad", "depend", "infancia", "mayores"]),
        ("medioambiente", ["medio ambiente", "energia", "renovable", "transicion", "clima", "emisiones", "residuos"]),
        ("territorial",   ["catalu", "vasco", "galicia", "balear", "canari", "ceuta", "melilla", "estatuto"]),
        ("identidad",     ["genero", "feminis", "lgtb", "memoria democrat", "inmigra", "religion"]),
        ("tecnologia",    ["digital", "datos", "intelig", "ciberse", "telecomunicacion"]),
    ]
    for cat, kws in rules:
        if any(k in t for k in kws):
            return cat
    return "otros"


def _norm_type(text: str) -> str:
    """Normaliza tipo: Ley Orgánica, RDL, RD, Ley, etc."""
    t = (text or "").upper()
    if "LEY ORGÁNICA" in t or "LO " in t[:5]:
        return "Ley Orgánica"
    if "REAL DECRETO-LEY" in t or "RDL" in t:
        return "RDL"
    if "REAL DECRETO" in t or t.startswith("RD "):
        return "RD"
    if "DIRECTIVA" in t:
        return "Directiva UE"
    if "REGLAMENTO" in t:
        return "Reglamento"
    if "RESOLUCIÓN" in t or "RESOLUCION" in t:
        return "Resolución"
    if "ORDEN" in t:
        return "Orden"
    if "LEY" in t:
        return "Ley"
    return "Otra"


def _impact_score(titulo: str, tipo: str, seccion: str | None = None) -> int:
    """Heurístico 1-100: leyes orgánicas + RDL + tributaria > otros."""
    score = 30
    t_up = (titulo or "").upper()
    if tipo in ("Ley Orgánica", "Ley"):
        score += 25
    elif tipo == "RDL":
        score += 20
    elif tipo == "RD":
        score += 5
    # Áreas de alto impacto
    if any(k in t_up for k in ["FISCAL", "TRIBUTARIA", "PRESUPUESTOS"]):
        score += 20
    if any(k in t_up for k in ["AMNIST", "INDULTO", "JUSTICIA"]):
        score += 15
    if any(k in t_up for k in ["VIVIENDA", "ALQUILER"]):
        score += 12
    if seccion in ("1", "2A"):
        score += 10
    return min(100, score)


def _fetch_boe_recent(days: int = 30) -> list[dict]:
    """BOE summary endpoint — últimas N publicaciones de sección I (disposiciones generales)."""
    out = []
    today = date.today()
    headers = {"Accept": "application/json", "User-Agent": "politeia/1.0"}
    try:
        with httpx.Client(timeout=8.0, headers=headers) as cli:
            for offset in range(days):
                d = today - timedelta(days=offset)
                if d.weekday() >= 5:  # skip weekends — BOE no publica
                    continue
                ymd = d.strftime("%Y%m%d")
                url = f"{BOE_API_BASE}/sumario/{ymd}"
                r = cli.get(url)
                if not r.is_success:
                    continue
                try:
                    data = r.json()
                except Exception:
                    continue

                # Estructura: data.sumario.diario[].seccion[].departamento[].epigrafe[].item[]
                sumario = data.get("data", {}).get("sumario") or data.get("sumario") or {}
                diarios = sumario.get("diario") if isinstance(sumario, dict) else None
                if not isinstance(diarios, list):
                    diarios = [diarios] if diarios else []

                for diario in diarios:
                    secciones = (diario or {}).get("seccion") or []
                    if not isinstance(secciones, list):
                        secciones = [secciones]
                    for sec in secciones:
                        sec_codigo = (sec or {}).get("codigo")
                        # Solo 1 (disposiciones generales) y 2A (autoridades y personal)
                        if sec_codigo not in ("1", "2A", "2B"):
                            continue
                        deps = (sec or {}).get("departamento") or []
                        if not isinstance(deps, list):
                            deps = [deps]
                        for dep in deps:
                            dep_nombre = (dep or {}).get("nombre", "")
                            epigrafes = (dep or {}).get("epigrafe") or []
                            if not isinstance(epigrafes, list):
                                epigrafes = [epigrafes]
                            for epi in epigrafes:
                                items = (epi or {}).get("item") or []
                                if not isinstance(items, list):
                                    items = [items]
                                for item in items:
                                    if not isinstance(item, dict):
                                        continue
                                    titulo = item.get("titulo", "").strip()
                                    if not titulo:
                                        continue
                                    out.append({
                                        "id":         item.get("identificador") or item.get("id"),
                                        "titulo":     titulo,
                                        "fecha":      d.isoformat(),
                                        "tipo":       _norm_type(titulo),
                                        "seccion":    sec_codigo,
                                        "departamento": dep_nombre,
                                        "url":        item.get("url_pdf", {}).get("texto") if isinstance(item.get("url_pdf"), dict) else item.get("url"),
                                        "url_html":   item.get("url_html"),
                                        "estado":     "aprobada",
                                        "categoria":  _categorize_norm(titulo),
                                        "impact":     _impact_score(titulo, _norm_type(titulo), sec_codigo),
                                    })
                if len(out) > 80:
                    break
                if offset > 14 and len(out) > 30:
                    break
    except Exception as e:
        return [{"_error": str(e)}]
    return out


def _fetch_congreso_iniciativas() -> list[dict]:
    """Iniciativas en tramitación desde el RSS abierto del Congreso.

    Endpoint: https://www.congreso.es/wc/rss/iniciativas
    Si falla, devolvemos demos plausibles (no inventados — basados en agenda real).
    """
    feeds = [
        "https://www.congreso.es/wc/rss/iniciativas",
        "https://www.congreso.es/web/wc/rss/iniciativas",
    ]
    items: list[dict] = []
    headers = {"User-Agent": "politeia/1.0", "Accept": "application/rss+xml,application/xml,*/*"}
    try:
        import feedparser
        for url in feeds:
            with httpx.Client(timeout=6.0, headers=headers) as cli:
                r = cli.get(url)
                if not r.is_success:
                    continue
            parsed = feedparser.parse(r.text)
            for entry in parsed.entries[:40]:
                title = getattr(entry, "title", "")
                if not title:
                    continue
                pub = getattr(entry, "published_parsed", None)
                fecha = date(pub.tm_year, pub.tm_mon, pub.tm_mday).isoformat() if pub else date.today().isoformat()
                items.append({
                    "id":         getattr(entry, "id", "") or getattr(entry, "link", "")[-40:],
                    "titulo":     title,
                    "fecha":      fecha,
                    "tipo":       _norm_type(title),
                    "estado":     "en_tramite",
                    "url":        getattr(entry, "link", ""),
                    "departamento": "Congreso de los Diputados",
                    "categoria":  _categorize_norm(title),
                    "impact":     _impact_score(title, _norm_type(title)),
                })
            if items:
                break
    except Exception:
        pass

    # Si no hay datos del Congreso, devolver lista vacía (no fabricar leyes)
    return items


def _next_pleno_dates() -> list[dict]:
    """Próximas sesiones plenarias estimadas.
    Estimación: martes/miércoles/jueves ordinarios. Sin scrape tabla calendario por ahora.
    """
    today = date.today()
    out = []
    for offset in range(1, 10):
        d = today + timedelta(days=offset)
        if d.weekday() in (1, 2, 3):  # ma, mi, ju
            out.append({
                "fecha": d.isoformat(),
                "dia_semana": ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"][d.weekday()],
            })
        if len(out) >= 4:
            break
    return out


@router.get("/timeline")
def laws_timeline(days: int = Query(21, ge=7, le=60), limit: int = Query(60, ge=10, le=200)):
    """Timeline unificado: BOE aprobadas + Congreso en trámite, ordenadas por fecha desc."""
    boe = _fetch_boe_recent(days=days)
    congreso = _fetch_congreso_iniciativas()

    all_items = (boe + congreso)
    # Filtrar items con error
    all_items = [x for x in all_items if not x.get("_error")]

    # Sort by fecha desc, then impact desc
    all_items.sort(key=lambda x: (x.get("fecha", ""), x.get("impact", 0)), reverse=True)
    all_items = all_items[:limit]

    # Stats por categoría / estado / tipo
    stats = {
        "total":       len(all_items),
        "by_estado":   {},
        "by_categoria":{},
        "by_tipo":     {},
        "high_impact": sum(1 for x in all_items if x.get("impact", 0) >= 70),
    }
    for x in all_items:
        for key in ("estado", "categoria", "tipo"):
            v = x.get(key, "?")
            stats[f"by_{key}"][v] = stats[f"by_{key}"].get(v, 0) + 1

    return {
        "items":           all_items,
        "stats":           stats,
        "next_plenos":     _next_pleno_dates(),
        "fetched_at":      datetime.utcnow().isoformat() + "Z",
        "sources":         ["BOE datos abiertos", "Congreso RSS iniciativas"],
    }


@router.get("/upcoming-votes")
def upcoming_votes():
    """Próximas votaciones plenarias estimadas + iniciativas en cola."""
    return {
        "next_plenos":  _next_pleno_dates(),
        "fetched_at":   datetime.utcnow().isoformat() + "Z",
    }


@router.get("/stats")
def laws_stats(days: int = Query(30, ge=7, le=90)):
    """Stats agregadas del periodo."""
    boe = [x for x in _fetch_boe_recent(days=days) if not x.get("_error")]
    out = {
        "total_aprobadas":  len(boe),
        "by_categoria":     {},
        "by_tipo":          {},
        "by_dept":          {},
        "high_impact":      sum(1 for x in boe if x.get("impact", 0) >= 70),
        "days":             days,
    }
    for x in boe:
        for key in ("categoria", "tipo", "departamento"):
            v = x.get(key, "?")
            out[f"by_{key}"][v] = out[f"by_{key}"].get(v, 0) + 1
    return out
