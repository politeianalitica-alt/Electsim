"""Agregador ligero de agendas institucionales (España + UE).

Objetivo:
- Devolver eventos estructurados para dashboard sin romper la UI.
- Priorizar contenido real (HTML/RSS oficiales) con tolerancia a fallos.
- Mantener dependencias mínimas (`requests`, `bs4`, `feedparser`).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import re
from typing import Any
from urllib.parse import urlencode

import feedparser
import requests
from bs4 import BeautifulSoup

UTC = timezone.utc


@dataclass
class AgendaSource:
    nombre: str
    modo: str  # html | rss
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


def _to_iso_day(fecha_txt: str) -> str:
    s = _clean_text(fecha_txt)
    if not s:
        return ""
    patterns = (
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%Y-%m-%dT%H:%M:%S",
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
    )
    for fmt in patterns:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except Exception:
            continue
    m = re.search(r"(\d{4}-\d{2}-\d{2})", s)
    if m:
        return m.group(1)
    m2 = re.search(r"(\d{2}/\d{2}/\d{4})", s)
    if m2:
        try:
            return datetime.strptime(m2.group(1), "%d/%m/%Y").strftime("%Y-%m-%d")
        except Exception:
            pass
    return ""


def _fetch(url: str, timeout: int) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (PoliteiaAgendaBot/1.0)",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.7",
    }
    r = requests.get(url, timeout=timeout, headers=headers)
    r.raise_for_status()
    r.encoding = r.encoding or "utf-8"
    return r.text


def _parse_rss(source: AgendaSource, max_items: int) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    feed = feedparser.parse(source.url)
    for e in getattr(feed, "entries", [])[: max_items * 2]:
        titulo = _clean_text(getattr(e, "title", ""))
        if not titulo:
            continue
        resumen = _clean_text(getattr(e, "summary", ""))
        link = _clean_text(getattr(e, "link", ""))
        fecha_raw = _clean_text(getattr(e, "published", "") or getattr(e, "updated", ""))
        actor = _infer_actor(f"{titulo} {resumen}", source.nombre)
        out.append(
            {
                "fuente": source.nombre,
                "titulo": titulo[:240],
                "resumen": (resumen or titulo)[:700],
                "fecha": fecha_raw[:32],
                "fecha_publicacion": _to_iso_day(fecha_raw) or _to_iso_day(titulo),
                "tipo": _infer_tipo(f"{titulo} {resumen}"),
                "actor": actor,
                "lugar": _extract_lugar(f"{titulo} {resumen}"),
                "enlace": link,
                "url": link,
                "cita": (resumen or titulo)[:220],
            }
        )
    return out[:max_items]


def _parse_html(source: AgendaSource, max_items: int, timeout: int) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
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

            m_hora = re.search(r"\b([01]?\d|2[0-3])[:.][0-5]\d\b", txt)
            hora = m_hora.group(0).replace(".", ":") if m_hora else ""
            fecha = f"{datetime.now(tz=UTC).strftime('%Y-%m-%d')} {hora}".strip()
            actor = _infer_actor(f"{titulo} {txt}", source.nombre)
            out.append(
                {
                    "fuente": source.nombre,
                    "titulo": titulo[:240],
                    "resumen": txt[:700],
                    "fecha": fecha,
                    "fecha_publicacion": datetime.now(tz=UTC).strftime("%Y-%m-%d"),
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
        AgendaSource("Congreso", "html", "https://www.congreso.es/agenda"),
        AgendaSource("Senado", "html", "https://www.senado.es/web/actividadparlamentaria/actualidad/agenda/index.html"),
        AgendaSource("Parlamento Europeo", "html", "https://www.europarl.europa.eu/plenary/es/agendas.html"),
        AgendaSource("Moncloa RSS", "rss", "https://www.lamoncloa.gob.es/Paginas/index-rss.aspx"),
        AgendaSource("Congreso RSS", "rss", "https://www.congreso.es/web/guest/rss"),
        AgendaSource("Casa Real RSS", "rss", "https://casareal.es/ES/Prensa/noticias/Paginas/subhome-rss.xml"),
    ]

    all_rows: list[dict[str, str]] = []
    for src in sources:
        try:
            if src.modo == "rss":
                rows = _parse_rss(src, max_items=max_items_per_source)
            else:
                rows = _parse_html(src, max_items=max_items_per_source, timeout=timeout)
            all_rows.extend(rows)
        except Exception:
            # Degradación elegante: una fuente caída no rompe el agregado.
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

