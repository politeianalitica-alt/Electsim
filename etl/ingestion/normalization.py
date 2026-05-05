"""Utilidades de normalización cross-source para textos, partidos, actores, URLs y fechas."""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime
from typing import Dict
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

# Cargar alias de partidos desde dashboard.shared con degradación elegante.
try:  # pragma: no cover - depende del entorno
    from dashboard.shared import _PARTY_ALIASES as _SHARED_PARTY_ALIASES  # type: ignore
except Exception:  # pragma: no cover
    _SHARED_PARTY_ALIASES = None

_FALLBACK_PARTY_ALIASES: Dict[str, str] = {
    "psoe": "PSOE",
    "partido socialista": "PSOE",
    "partido socialista obrero español": "PSOE",
    "partido socialista obrero espanol": "PSOE",
    "pp": "PP",
    "partido popular": "PP",
    "vox": "VOX",
    "sumar": "SUMAR",
    "podemos": "PODEMOS",
    "unidas podemos": "PODEMOS",
    "unidas-podemos": "PODEMOS",
    "cs": "CS",
    "ciudadanos": "CS",
    "erc": "ERC",
    "esquerra republicana": "ERC",
    "junts": "JUNTS",
    "junts per catalunya": "JUNTS",
    "pnv": "PNV",
    "eaj-pnv": "PNV",
    "bildu": "EH BILDU",
    "eh bildu": "EH BILDU",
    "bng": "BNG",
    "cup": "CUP",
}


_TITLES_RE = re.compile(
    r"^(?:sr\.|sra\.|sres\.|sras\.|don|doña|d\.|dña\.|excmo\.|excma\.|"
    r"ilmo\.|ilma\.|hon\.|sr|sra|dr\.|dra\.|prof\.)\s+",
    re.IGNORECASE,
)

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_INVISIBLE_RE = re.compile(r"[​-‏‪-‮﻿\xad]")
_WHITESPACE_RE = re.compile(r"\s+")

_TRACKING_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "utm_name",
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "ref",
    "ref_src",
    "_ga",
    "_gl",
    "igshid",
    "yclid",
}

_MONTHS_ES = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "setiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}


def normalize_text(text: str) -> str:
    """Limpia HTML, normaliza unicode (NFKC), elimina invisibles y colapsa espacios."""

    if not text:
        return ""
    out = str(text)
    out = _HTML_TAG_RE.sub(" ", out)
    out = unicodedata.normalize("NFKC", out)
    out = _INVISIBLE_RE.sub("", out)
    out = out.replace(" ", " ")
    out = _WHITESPACE_RE.sub(" ", out)
    return out.strip()


def _strip_accents(text: str) -> str:
    nfd = unicodedata.normalize("NFD", text)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def normalize_party_name(name: str) -> str:
    """Devuelve la forma canónica del partido. Usa alias compartidos si están disponibles."""

    if not name:
        return ""
    cleaned = normalize_text(name).strip().strip(".,;:")
    key = _strip_accents(cleaned).lower().strip()
    aliases = _SHARED_PARTY_ALIASES if isinstance(_SHARED_PARTY_ALIASES, dict) else None
    if aliases:
        for alias, canonical in aliases.items():
            try:
                alias_key = _strip_accents(str(alias)).lower().strip()
            except Exception:
                continue
            if alias_key == key:
                return canonical
    if key in _FALLBACK_PARTY_ALIASES:
        return _FALLBACK_PARTY_ALIASES[key]
    return cleaned.upper() if len(cleaned) <= 6 else cleaned


def normalize_actor_name(name: str) -> str:
    """Quita títulos, normaliza acentos y devuelve el primer apellido compuesto cuando aplique."""

    if not name:
        return ""
    cleaned = normalize_text(name)
    while True:
        new = _TITLES_RE.sub("", cleaned).strip()
        if new == cleaned:
            break
        cleaned = new
    parts = cleaned.split()
    if len(parts) >= 4:
        # Heurística: nombre simple + dos apellidos -> mantener nombre + primer apellido.
        # "Pedro Sánchez Pérez-Castejón" (3 tokens) ya queda como "Pedro Sánchez".
        cleaned = " ".join(parts[: len(parts) - 2 + 1])
    elif len(parts) == 3:
        cleaned = " ".join(parts[:2])
    return cleaned.strip()


def normalize_url(url: str) -> str:
    """Quita parámetros de tracking, normaliza protocolo y baja el host a minúsculas."""

    if not url:
        return ""
    raw = url.strip()
    if not raw:
        return ""
    if "://" not in raw:
        raw = "https://" + raw
    parsed = urlparse(raw)
    scheme = parsed.scheme.lower() or "https"
    if scheme == "http":
        scheme = "https"
    netloc = parsed.netloc.lower()
    query = [
        (k, v)
        for k, v in parse_qsl(parsed.query, keep_blank_values=True)
        if k.lower() not in _TRACKING_PARAMS
    ]
    new_query = urlencode(query)
    path = parsed.path or ""
    if path.endswith("/") and len(path) > 1:
        path = path.rstrip("/")
    return urlunparse((scheme, netloc, path, parsed.params, new_query, ""))


def normalize_date_string(date_str: str) -> str | None:
    """Parsea fechas comunes en español y devuelve ISO YYYY-MM-DD o None."""

    if not date_str:
        return None
    raw = normalize_text(str(date_str)).strip()
    if not raw:
        return None
    # ISO directo.
    try:
        dt = datetime.fromisoformat(raw[:19].replace("Z", ""))
        return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
    # YYYY-MM-DD
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", raw)
    if m:
        y, mo, d = (int(x) for x in m.groups())
        try:
            return datetime(y, mo, d).strftime("%Y-%m-%d")
        except ValueError:
            return None
    # DD/MM/YYYY o DD-MM-YYYY
    m = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$", raw)
    if m:
        d, mo, y = (int(x) for x in m.groups())
        try:
            return datetime(y, mo, d).strftime("%Y-%m-%d")
        except ValueError:
            return None
    # "5 de mayo de 2026"
    m = re.match(
        r"^(\d{1,2})\s+de\s+([A-Za-zñÑáéíóúÁÉÍÓÚ]+)\s+de\s+(\d{4})$",
        raw,
        re.IGNORECASE,
    )
    if m:
        d = int(m.group(1))
        month_word = _strip_accents(m.group(2)).lower()
        y = int(m.group(3))
        mo = _MONTHS_ES.get(month_word)
        if mo:
            try:
                return datetime(y, mo, d).strftime("%Y-%m-%d")
            except ValueError:
                return None
    return None


_NEWSPAPER_PATTERNS = {
    "elpais": re.compile(r"/(\d{4}-\d{2}-\d{2})/([a-z0-9-]+)\.html"),
    "elmundo": re.compile(r"/(\d{4}/\d{2}/\d{2})/([a-f0-9]+)\.html"),
    "abc": re.compile(r"-(\d+)\.html"),
    "lavanguardia": re.compile(r"-(\d{6,})\.html"),
}


def extract_canonical_id(url: str, source: str) -> str | None:
    """Extrae un id canónico del artículo a partir de la URL para fuentes conocidas."""

    if not url or not source:
        return None
    src = source.lower().strip().replace(" ", "").replace(".", "")
    pat = _NEWSPAPER_PATTERNS.get(src)
    if not pat:
        # Heurística: último segmento alfanumérico largo.
        path = urlparse(url).path
        m = re.search(r"([a-z0-9][a-z0-9-]{6,})(?:\.html?|/?)$", path, re.IGNORECASE)
        if m:
            return m.group(1)
        return None
    m = pat.search(url)
    if not m:
        return None
    return "_".join(m.groups()).replace("/", "-")


__all__ = [
    "normalize_text",
    "normalize_party_name",
    "normalize_actor_name",
    "normalize_url",
    "normalize_date_string",
    "extract_canonical_id",
]
