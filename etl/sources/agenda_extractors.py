"""
agenda_extractors.py
Extractores de agenda por parser_hint.
"""

from __future__ import annotations

import json
import re
from email.utils import parsedate_to_datetime

import feedparser

try:
    from bs4 import BeautifulSoup
except Exception:  # pragma: no cover - entorno sin bs4
    BeautifulSoup = None

from etl.logger import get_logger
from etl.sources.lideres_config import Lider
from etl.utils.fecha_parser import parse_fecha, parse_hora

logger = get_logger(__name__)


def _base_evento(lider: Lider, url: str) -> dict:
    return {
        "lider_id": lider.lider_id,
        "partido": lider.partido,
        "nombre_lider": lider.nombre,
        "cargo": lider.cargo,
        "titulo_evento": "",
        "descripcion": None,
        "lugar": None,
        "fecha_evento": None,
        "hora_inicio": None,
        "hora_fin": None,
        "tipo_evento": "acto_publico",
        "es_publico": True,
        "url_fuente": url,
        "fuente_id": url,
        "raw_html": None,
    }


def _inferir_tipo(texto: str) -> str:
    t = (texto or "").lower()
    if any(k in t for k in ["rueda de prensa", "nota de prensa", "declaraciones"]):
        return "rueda_prensa"
    if any(k in t for k in ["pleno", "sesión plenaria", "sesion plenaria", "debate", "investidura"]):
        return "pleno"
    if any(k in t for k in ["viaje", "desplazamiento", "visita oficial", "bilateral"]):
        return "viaje_oficial"
    if any(k in t for k in ["reunión", "reunion", "encuentro", "despacho", "recibe a"]):
        return "reunion"
    if any(k in t for k in ["mitin", "acto de partido", "campaña", "campana", "rally"]):
        return "acto_partido"
    if any(k in t for k in ["comisión", "comision", "comparecencia", "comparece"]):
        return "comparecencia"
    return "acto_publico"


def extract_moncloa_presidente(content: str, lider: Lider, url: str) -> list[dict]:
    if BeautifulSoup is None:
        return []
    soup = BeautifulSoup(content, "html.parser")
    eventos: list[dict] = []

    tabla = soup.find("table", class_=re.compile(r"agenda|actividades", re.I)) or soup.find("table")
    if not tabla:
        return _extract_divs_genericos(content, lider, url)

    filas = tabla.find_all("tr")
    if not filas:
        return []
    filas = filas[1:] if len(filas) > 1 else filas

    for fila in filas:
        celdas = fila.find_all(["td", "th"])
        if len(celdas) < 2:
            continue

        texto_completo = " ".join(c.get_text(" ", strip=True) for c in celdas)
        if len(celdas) >= 4:
            fecha_raw = celdas[0].get_text(" ", strip=True)
            hora_raw = celdas[1].get_text(" ", strip=True)
            desc_raw = celdas[2].get_text(" ", strip=True)
            lugar_raw = celdas[3].get_text(" ", strip=True)
        elif len(celdas) == 3:
            fecha_raw = celdas[0].get_text(" ", strip=True)
            hora_raw = ""
            desc_raw = celdas[1].get_text(" ", strip=True)
            lugar_raw = celdas[2].get_text(" ", strip=True)
        else:
            fecha_raw = celdas[0].get_text(" ", strip=True)
            hora_raw = ""
            desc_raw = " ".join(c.get_text(" ", strip=True) for c in celdas[1:])
            lugar_raw = ""

        fecha = parse_fecha(fecha_raw) or parse_fecha(texto_completo)
        if not fecha:
            continue

        ev = _base_evento(lider, url)
        ev.update(
            {
                "titulo_evento": desc_raw[:500],
                "descripcion": desc_raw[:2000] if desc_raw else None,
                "lugar": lugar_raw or None,
                "fecha_evento": fecha,
                "hora_inicio": parse_hora(hora_raw) or parse_hora(desc_raw),
                "tipo_evento": _inferir_tipo(desc_raw),
                "raw_html": str(fila)[:5000],
            }
        )
        eventos.append(ev)
    return eventos


def extract_rss_generico(content: str, lider: Lider, url: str) -> list[dict]:
    feed = feedparser.parse(content)
    eventos: list[dict] = []
    for entry in feed.entries:
        titulo = str(getattr(entry, "title", "") or "")
        resumen = str(getattr(entry, "summary", "") or "")
        link = str(getattr(entry, "link", url) or url)
        texto = f"{titulo} {resumen}".strip()

        fecha = None
        for campo in ("published", "updated", "dc_date"):
            raw = getattr(entry, campo, None)
            if not raw:
                continue
            try:
                fecha = parsedate_to_datetime(str(raw)).date()
                break
            except Exception:
                fecha = parse_fecha(str(raw))
                if fecha:
                    break
        if not fecha:
            fecha = parse_fecha(titulo) or parse_fecha(resumen)
        if not fecha:
            continue

        ev = _base_evento(lider, url)
        ev.update(
            {
                "titulo_evento": titulo[:500],
                "descripcion": resumen[:2000] if resumen else None,
                "fecha_evento": fecha,
                "hora_inicio": parse_hora(resumen) or parse_hora(titulo),
                "tipo_evento": _inferir_tipo(texto),
                "url_fuente": link,
                "raw_html": None,
            }
        )
        eventos.append(ev)
    return eventos


def extract_partido_web_generico(content: str, lider: Lider, url: str) -> list[dict]:
    if BeautifulSoup is None:
        return []
    soup = BeautifulSoup(content, "html.parser")
    eventos: list[dict] = []

    candidatos = soup.find_all(class_=re.compile(r"agenda|event|acto|item|card", re.I))
    if not candidatos:
        candidatos = soup.find_all(["article", "li", "div"], limit=80)

    for bloque in candidatos:
        texto = bloque.get_text(" ", strip=True)
        if len(texto) < 15:
            continue
        fecha = parse_fecha(texto)
        if not fecha:
            continue

        titulo_tag = bloque.find(re.compile(r"^h[2-5]$")) or bloque.find("strong") or bloque.find("a")
        titulo = titulo_tag.get_text(strip=True) if titulo_tag else texto[:150]
        if not titulo:
            continue

        lugar = None
        m_lugar = re.search(r"(?:en|@|lugar:?)\s+([A-ZÁÉÍÓÚÑ][^,\n]{3,50})", texto, re.IGNORECASE)
        if m_lugar:
            lugar = m_lugar.group(1).strip()

        ev = _base_evento(lider, url)
        ev.update(
            {
                "titulo_evento": titulo[:500],
                "descripcion": texto[:2000],
                "lugar": lugar,
                "fecha_evento": fecha,
                "hora_inicio": parse_hora(texto),
                "tipo_evento": _inferir_tipo(texto),
                "raw_html": str(bloque)[:5000],
            }
        )
        eventos.append(ev)
    return eventos


def extract_congreso_api(content: str, lider: Lider, url: str) -> list[dict]:
    try:
        data = json.loads(content)
    except Exception:
        return []
    items = data if isinstance(data, list) else data.get("data", data.get("items", []))
    eventos: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        fecha_raw = str(item.get("date") or item.get("fecha") or item.get("createdDate") or "")
        fecha = parse_fecha(fecha_raw)
        if not fecha:
            continue
        titulo = str(item.get("title") or item.get("titulo") or "").strip()
        if not titulo:
            continue
        descripcion = item.get("summary") or item.get("resumen")
        enlace = item.get("url") or item.get("link") or url
        ev = _base_evento(lider, url)
        ev.update(
            {
                "titulo_evento": titulo[:500],
                "descripcion": str(descripcion)[:2000] if descripcion else None,
                "fecha_evento": fecha,
                "tipo_evento": _inferir_tipo(titulo),
                "url_fuente": str(enlace),
                "raw_html": json.dumps(item, ensure_ascii=False),
            }
        )
        eventos.append(ev)
    return eventos


def _extract_divs_genericos(content: str, lider: Lider, url: str) -> list[dict]:
    if BeautifulSoup is None:
        return []
    soup = BeautifulSoup(content, "html.parser")
    texto_pagina = soup.get_text(" ", strip=True)
    patron = re.compile(
        r"(\d{1,2}\s+de\s+\w+\s+de\s+\d{4}|\d{1,2}[/\-]\d{1,2}[/\-]\d{4})"
        r"(.{10,400}?)(?=\d{1,2}\s+de\s+|\d{1,2}[/\-]|\Z)",
        re.DOTALL | re.IGNORECASE,
    )

    eventos: list[dict] = []
    for m in patron.finditer(texto_pagina):
        fecha = parse_fecha(m.group(1))
        if not fecha:
            continue
        titulo = re.sub(r"\s+", " ", m.group(2)).strip()[:300]
        if len(titulo) < 10:
            continue
        ev = _base_evento(lider, url)
        ev.update(
            {
                "titulo_evento": titulo,
                "fecha_evento": fecha,
                "hora_inicio": parse_hora(titulo),
                "tipo_evento": _inferir_tipo(titulo),
            }
        )
        eventos.append(ev)
    return eventos


EXTRACTORES = {
    "moncloa_presidente": extract_moncloa_presidente,
    "rss_generico": extract_rss_generico,
    "pp_web": extract_partido_web_generico,
    "ministerio_agenda": extract_partido_web_generico,
    "partido_web_generico": extract_partido_web_generico,
    "congreso_api": extract_congreso_api,
    "congreso_agenda_html": extract_partido_web_generico,
}


def dispatch(parser_hint: str, content: str, lider: Lider, url: str) -> list[dict]:
    fn = EXTRACTORES.get(parser_hint, _extract_divs_genericos)
    try:
        eventos = fn(content, lider, url)
        # Seguridad adicional: descartar filas sin fecha/título.
        return [e for e in eventos if e.get("fecha_evento") is not None and e.get("titulo_evento")]
    except Exception as e:  # pragma: no cover - degradación defensiva
        logger.error("[EXTRACTOR ERROR] %s / %s: %s", lider.lider_id, parser_hint, e, exc_info=True)
        return []
