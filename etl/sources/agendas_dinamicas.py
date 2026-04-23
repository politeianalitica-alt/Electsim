"""Agregador ligero de agendas institucionales (España + UE).

Objetivo:
- Devolver eventos estructurados para dashboard sin romper la UI.
- Priorizar contenido real (HTML/RSS oficiales) con tolerancia a fallos.
- Mantener dependencias mínimas (`requests`, `bs4`, `feedparser`).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, date as date_type, timezone
from io import BytesIO
import json
import re
from typing import Any
from urllib.parse import urlencode

import feedparser
import requests
from etl.logger import get_logger
from etl.utils.fecha_parser import parse_hora
try:
    from bs4 import BeautifulSoup
except Exception:  # pragma: no cover - fallback en entornos sin bs4
    BeautifulSoup = None

UTC = timezone.utc
logger = get_logger(__name__)
MESES_ES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}
_DIAS_ES = {
    "lunes", "martes", "miércoles", "miercoles",
    "jueves", "viernes", "sábado", "sabado", "domingo",
}
_DIAS_EN = {"mon", "monday", "tue", "tuesday", "wed", "wednesday", "thu", "thursday", "fri", "friday", "sat", "saturday", "sun", "sunday"}


@dataclass
class AgendaSource:
    nombre: str
    modo: str  # html | rss | json
    url: str


def _clean_text(value: Any) -> str:
    txt = re.sub(r"\s+", " ", str(value or "")).strip()
    return txt


def _infer_tipo(texto: str) -> str:
    t = (texto or "").lower()
    if any(k in t for k in ["comisión", "comision", "pleno", "senado", "congreso", "parlamento"]):
        return "parlamento"
    if any(k in t for k in ["cumbre", "ue", "europe", "europeo", "internacional"]):
        return "exterior"
    if any(k in t for k in ["rueda de prensa", "comparecencia", "declaración", "declaracion"]):
        return "comunicación"
    if any(k in t for k in ["consejo de ministros", "reunión", "reunion", "audiencia", "acto"]):
        return "institucional"
    return "agenda_oficial"


def _infer_actor(texto: str, fuente: str) -> str:
    t = (texto or "").lower()
    mapping = [
        ("pedro sánchez", "Pedro Sánchez"),
        ("pedro sanchez", "Pedro Sánchez"),
        ("feijóo", "Alberto Núñez Feijóo"),
        ("feijoo", "Alberto Núñez Feijóo"),
        ("abascal", "Santiago Abascal"),
        ("yolanda díaz", "Yolanda Díaz"),
        ("yolanda diaz", "Yolanda Díaz"),
        ("rey", "Casa Real"),
        ("congreso", "Congreso de los Diputados"),
        ("senado", "Senado de España"),
        ("parlamento europeo", "Parlamento Europeo"),
        ("moncloa", "Gobierno de España"),
    ]
    for needle, actor in mapping:
        if needle in t:
            return actor
    if "moncloa" in fuente.lower():
        return "Gobierno de España"
    return fuente


def _extract_lugar(texto: str) -> str:
    t = _clean_text(texto)
    m = re.search(r"\b(en|de)\s+([A-ZÁÉÍÓÚÑ][^.,;]{3,60})", t)
    if m:
        return _clean_text(m.group(2))
    return ""


def parse_fecha_es(texto: str) -> date_type | None:
    """
    Parsea fechas en formatos españoles habituales.
    Devuelve None si no puede parsear.
    """
    if not texto or not isinstance(texto, str):
        return None
    raw = texto.strip()
    if not raw:
        return None

    # RSS/Atom internacional (ej. Thu, 23 Apr 2026 12:23:14 GMT).
    for fmt in (
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S GMT",
        "%a, %d %b %Y %H:%M:%S %Z",
    ):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue

    txt = raw.lower()
    for dia in _DIAS_ES:
        txt = re.sub(rf"^{re.escape(dia)},?\s*", "", txt)
    for dia in _DIAS_EN:
        txt = re.sub(rf"^{re.escape(dia)},?\s*", "", txt)
    txt = txt.strip()

    m = re.search(r"(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\s+(?:de\s+)?(\d{4})", txt)
    if m:
        dia_n = int(m.group(1))
        mes_s = m.group(2)
        anio_n = int(m.group(3))
        mes_n = MESES_ES.get(mes_s)
        if mes_n:
            try:
                return date_type(anio_n, mes_n, dia_n)
            except ValueError:
                pass

    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y", "%Y/%m/%d"):
        try:
            return datetime.strptime(txt, fmt).date()
        except ValueError:
            continue

    # Último fallback: extraer YYYY-MM-DD si viene incrustado.
    m_iso = re.search(r"(\d{4}-\d{2}-\d{2})", raw)
    if m_iso:
        try:
            return datetime.strptime(m_iso.group(1), "%Y-%m-%d").date()
        except ValueError:
            pass
    return None


def _to_iso_day(fecha_txt: str) -> str | None:
    parsed = parse_fecha_es(_clean_text(fecha_txt))
    return parsed.strftime("%Y-%m-%d") if parsed else None


def _fetch(url: str, timeout: int) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (PoliteiaAgendaBot/1.0)",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.7",
    }
    r = requests.get(url, timeout=timeout, headers=headers)
    r.raise_for_status()
    r.encoding = r.encoding or "utf-8"
    return r.text


def _fetch_feed_safe(url: str, timeout: int = 12) -> feedparser.FeedParserDict:
    try:
        content = _fetch(url, timeout=timeout)
        return feedparser.parse(BytesIO(content.encode("utf-8")))
    except Exception as exc:
        msg = str(exc)
        if "403" in msg or "404" in msg:
            logger.info("RSS no disponible (esperable) [%s]: %s", url, msg)
        else:
            logger.warning("RSS no disponible [%s]: %s", url, msg)
        return feedparser.FeedParserDict()


def _parse_rss(source: AgendaSource, max_items: int) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    feed = _fetch_feed_safe(source.url, timeout=12)
    for e in getattr(feed, "entries", [])[: max_items * 2]:
        titulo = _clean_text(getattr(e, "title", ""))
        if not titulo:
            continue
        resumen = _clean_text(getattr(e, "summary", ""))
        link = _clean_text(getattr(e, "link", ""))
        fecha_raw = _clean_text(getattr(e, "published", "") or getattr(e, "updated", ""))
        fecha_pub = parse_fecha_es(fecha_raw) or parse_fecha_es(titulo)
        if fecha_pub is None:
            logger.warning("No se pudo parsear fecha '%s' en RSS %s — evento descartado", fecha_raw, source.nombre)
            continue
        actor = _infer_actor(f"{titulo} {resumen}", source.nombre)
        out.append(
            {
                "fuente": source.nombre,
                "titulo": titulo[:240],
                "resumen": (resumen or titulo)[:700],
                "fecha": fecha_raw[:32],
                "fecha_publicacion": fecha_pub.strftime("%Y-%m-%d"),
                "tipo": _infer_tipo(f"{titulo} {resumen}"),
                "actor": actor,
                "lugar": _extract_lugar(f"{titulo} {resumen}"),
                "enlace": link,
                "url": link,
                "cita": (resumen or titulo)[:220],
            }
        )
    return out[:max_items]


def _parse_html(
    source: AgendaSource,
    max_items: int,
    timeout: int,
    fallback_day: str | None = None,
) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    if BeautifulSoup is None:
        # Degradación elegante: sin bs4 seguimos sirviendo fuentes RSS.
        return out
    html = _fetch(source.url, timeout=timeout)
    soup = BeautifulSoup(html, "html.parser")
    selectors = [
        "article",
        "li",
        "tr",
        "div.evento",
        "div.agenda",
        "div.item",
        "section article",
    ]
    seen: set[str] = set()
    for sel in selectors:
        for node in soup.select(sel):
            txt = _clean_text(node.get_text(" ", strip=True))
            if len(txt) < 24:
                continue
            title_node = node.select_one("h1, h2, h3, h4, strong, a")
            titulo = _clean_text(title_node.get_text(" ", strip=True) if title_node else txt[:160])
            if len(titulo) < 8:
                continue
            link_node = node.select_one("a[href]")
            link = _clean_text(link_node.get("href", "")) if link_node else ""
            if link.startswith("/"):
                base = re.match(r"^https?://[^/]+", source.url)
                if base:
                    link = f"{base.group(0)}{link}"

            key = f"{titulo.lower()}|{txt[:90].lower()}"
            if key in seen:
                continue
            seen.add(key)

            h = parse_hora(txt)
            hora = h.strftime("%H:%M") if h else ""
            has_hour_hint = bool(h or re.search(r"\b\d{1,2}:\d{2}\b|\bhoras?\b", txt.lower()))
            fecha_base = _to_iso_day(txt) or _to_iso_day(titulo)
            if not fecha_base:
                # Muchos sitios publican agenda diaria con hora pero sin fecha explícita
                # en cada item. Usamos día fallback para no perder esos eventos.
                if has_hour_hint:
                    fecha_base = fallback_day or date_type.today().strftime("%Y-%m-%d")
                else:
                    logger.debug("No se pudo parsear fecha '%s' — evento descartado (%s)", titulo[:80], source.nombre)
                    continue
            fecha = f"{fecha_base} {hora}".strip() if fecha_base else ""
            actor = _infer_actor(f"{titulo} {txt}", source.nombre)
            out.append(
                {
                    "fuente": source.nombre,
                    "titulo": titulo[:240],
                    "resumen": txt[:700],
                    "fecha": fecha,
                    "fecha_publicacion": fecha_base,
                    "tipo": _infer_tipo(f"{titulo} {txt}"),
                    "actor": actor,
                    "lugar": _extract_lugar(txt),
                    "enlace": link,
                    "url": link,
                    "cita": txt[:220],
                }
            )
            if len(out) >= max_items:
                return out
    return out[:max_items]


def _parse_json(source: AgendaSource, max_items: int, timeout: int) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    body = _fetch(source.url, timeout=timeout)
    payload = json.loads(body)
    items = payload if isinstance(payload, list) else payload.get("data", payload.get("items", []))
    seen: set[str] = set()
    for item in items[: max_items * 2]:
        titulo = _clean_text(item.get("title") or item.get("titulo") or item.get("name") or "")
        if not titulo:
            continue
        resumen = _clean_text(item.get("summary") or item.get("descripcion") or item.get("description") or "")
        link = _clean_text(item.get("url") or item.get("link") or "")
        fecha_raw = _clean_text(item.get("date") or item.get("fecha") or item.get("createdDate") or item.get("updated"))
        fecha_pub = _to_iso_day(fecha_raw)
        if not fecha_pub:
            logger.warning("No se pudo parsear fecha '%s' — evento descartado (%s)", fecha_raw, source.nombre)
            continue
        key = f"{titulo.lower()}|{fecha_pub}|{source.nombre.lower()}"
        if key in seen:
            continue
        seen.add(key)
        txt = f"{titulo} {resumen}".strip()
        out.append(
            {
                "fuente": source.nombre,
                "titulo": titulo[:240],
                "resumen": (resumen or titulo)[:700],
                "fecha": fecha_raw[:32],
                "fecha_publicacion": fecha_pub,
                "tipo": _infer_tipo(txt),
                "actor": _infer_actor(txt, source.nombre),
                "lugar": _extract_lugar(txt),
                "enlace": link,
                "url": link,
                "cita": (resumen or titulo)[:220],
            }
        )
        if len(out) >= max_items:
            break
    return out[:max_items]


def fetch_all_agendas(max_items_per_source: int = 10, timeout: int = 18) -> list[dict[str, str]]:
    """Devuelve agenda unificada para dashboard.

    Estructura de cada evento:
    - fuente, titulo, resumen, fecha, fecha_publicacion
    - tipo, actor, lugar, enlace/url, cita
    """
    today = datetime.now(tz=UTC).strftime("%Y%m%d")
    moncloa_agenda = f"https://www.lamoncloa.gob.es/gobierno/agenda/paginas/agenda.aspx?{urlencode({'d': today})}"

    sources = [
        AgendaSource("Moncloa", "html", moncloa_agenda),
        AgendaSource("Congreso API", "json", "https://www.congreso.es/rest/api/initiative?lang=es&pageSize=15"),
        AgendaSource("Senado", "html", "https://www.senado.es/web/actividadparlamentaria/actualidad/agenda/index.html"),
        AgendaSource("Parlamento Europeo", "rss", "https://www.europarl.europa.eu/rss/doc/plenary/es.xml"),
        AgendaSource("Consejo Europeo", "rss", "https://www.consilium.europa.eu/es/feed/press-releases/"),
        AgendaSource("Moncloa RSS", "rss", "https://www.lamoncloa.gob.es/Paginas/index-rss.aspx"),
        AgendaSource("Casa Real RSS", "rss", "https://casareal.es/ES/Prensa/noticias/Paginas/subhome-rss.xml"),
    ]

    all_rows: list[dict[str, str]] = []
    for src in sources:
        try:
            if src.modo == "rss":
                rows = _parse_rss(src, max_items=max_items_per_source)
            elif src.modo == "json":
                rows = _parse_json(src, max_items=max_items_per_source, timeout=timeout)
            else:
                rows = _parse_html(
                    src,
                    max_items=max_items_per_source,
                    timeout=timeout,
                    fallback_day=datetime.now(tz=UTC).strftime("%Y-%m-%d"),
                )
            all_rows.extend(rows)
        except Exception as exc:
            # Degradación elegante: una fuente caída no rompe el agregado.
            msg = str(exc)
            if "403" in msg or "404" in msg:
                logger.info("Fuente no disponible (esperable) [%s]: %s", src.nombre, msg)
            else:
                logger.warning("Fuente fallida [%s]: %s", src.nombre, msg)
            continue

    dedup: dict[str, dict[str, str]] = {}
    for row in all_rows:
        titulo = _clean_text(row.get("titulo", ""))
        fecha = _clean_text(row.get("fecha_publicacion", "") or row.get("fecha", ""))
        fuente = _clean_text(row.get("fuente", ""))
        if not titulo:
            continue
        key = f"{fuente}|{titulo.lower()}|{fecha}"
        dedup[key] = row

    rows = list(dedup.values())
    rows.sort(key=lambda r: (_to_iso_day(str(r.get("fecha_publicacion", ""))) or "1900-01-01", str(r.get("fecha", ""))), reverse=True)
    return rows
