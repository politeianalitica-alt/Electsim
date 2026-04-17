"""
fecha_parser.py
Parsea fechas en formatos típicos de agendas políticas españolas.
NUNCA devuelve datetime.now() como fallback — devuelve None si no puede parsear.
"""

from __future__ import annotations

import re
from datetime import date, time
from zoneinfo import ZoneInfo

TZ_MADRID = ZoneInfo("Europe/Madrid")

MESES_ES = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
    "ene": 1,
    "feb": 2,
    "mar": 3,
    "abr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "ago": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dic": 12,
}

DIAS_ES = {
    "lunes", "martes", "miércoles", "miercoles", "jueves",
    "viernes", "sábado", "sabado", "domingo",
}


def _from_dmy(d: int, mes_str: str, a: int) -> date | None:
    mes = MESES_ES.get(mes_str.lower().strip())
    if not mes:
        return None
    try:
        return date(a, mes, d)
    except ValueError:
        return None


def _from_my(mes_str: str, a: int) -> date | None:
    mes = MESES_ES.get(mes_str.lower().strip())
    if not mes:
        return None
    try:
        return date(a, mes, 1)
    except ValueError:
        return None


def parse_fecha(texto: str | None) -> date | None:
    """
    Extrae la primera fecha válida del texto.
    Devuelve None si no encuentra nada parseable.
    """
    if not texto:
        return None

    txt = re.sub(r"\s+", " ", str(texto)).strip()

    # "lunes, 14 de abril de 2025" / "14 de abril de 2025"
    m = re.search(r"(?:\w+,?\s+)?(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})", txt, re.IGNORECASE)
    if m:
        f = _from_dmy(int(m.group(1)), m.group(2), int(m.group(3)))
        if f:
            return f

    # "14/04/2025" o "14-04-2025"
    m = re.search(r"(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})", txt)
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            pass

    # "2025-04-14" o "2025/04/14"
    m = re.search(r"(\d{4})[/\-](\d{2})[/\-](\d{2})", txt)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            pass

    # "14 abril 2025" (sin "de")
    m = re.search(r"(\d{1,2})\s+([a-záéíóú]+)\s+(\d{4})", txt, re.IGNORECASE)
    if m:
        f = _from_dmy(int(m.group(1)), m.group(2), int(m.group(3)))
        if f:
            return f

    # "abril 2025" -> 1er día del mes
    m = re.search(r"\b([a-záéíóú]+)\s+(\d{4})\b", txt, re.IGNORECASE)
    if m:
        f = _from_my(m.group(1), int(m.group(2)))
        if f:
            return f

    return None


def parse_hora(texto: str | None) -> time | None:
    """Extrae la primera hora del texto. Devuelve None si no encuentra."""
    if not texto:
        return None
    txt = str(texto)

    # 10:30 / 10:30:00 / 10:30 h
    m = re.search(r"(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*h(?:oras?)?)?", txt, re.IGNORECASE)
    if m:
        h = int(m.group(1))
        mi = int(m.group(2))
        s = int(m.group(3) or 0)
        try:
            return time(h, mi, s)
        except ValueError:
            pass

    # 10h30 / 10h
    m = re.search(r"(\d{1,2})h(\d{2})?", txt, re.IGNORECASE)
    if m:
        h = int(m.group(1))
        mi = int(m.group(2) or 0)
        try:
            return time(h, mi, 0)
        except ValueError:
            pass

    return None


def parse_fecha_rango(texto: str | None) -> tuple[date | None, date | None]:
    """
    Para rangos como "14-16 de abril de 2025" o "14 al 16 de abril de 2025".
    Devuelve (fecha_inicio, fecha_fin). Si no hay rango, devuelve (f, f).
    """
    if not texto:
        return None, None

    txt = str(texto)
    m = re.search(
        r"(\d{1,2})\s*(?:al?|[-–])\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})",
        txt,
        re.IGNORECASE,
    )
    if m:
        d1, d2, mes, y = m.groups()
        inicio = _from_dmy(int(d1), mes, int(y))
        fin = _from_dmy(int(d2), mes, int(y))
        return inicio, fin

    f = parse_fecha(txt)
    return f, f
