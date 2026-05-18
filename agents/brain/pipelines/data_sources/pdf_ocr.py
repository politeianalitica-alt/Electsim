"""
OCR / extracción de texto de declaraciones de bienes (PDF) del Portal de
Transparencia del Congreso y Senado.

Estrategia en cascada (descendente · usa la primera que está instalada):
  1. `pdfplumber`     · ideal para PDFs nativos (no escaneados)
  2. `PyMuPDF (fitz)` · backup rápido
  3. `pdfminer.six`   · backup puro Python sin C deps
  4. `pytesseract`    · OCR real para PDFs escaneados (requiere tesseract-ocr)
  5. Fallback: devuelve {ok: False, error: "no pdf reader available"}

Parser regex multi-pattern para extraer:
  · patrimonio_bruto_eur          (total declarado)
  · salario_anual_oficial_eur     (importe declarado por su cargo)
  · bienes (lista tipada)
      tipo: inmueble | cuenta | acciones | deuda | vehículo
  · actividades_complementarias

NUNCA crashea: si pdfplumber no está, prueba PyMuPDF; si tampoco, devuelve
{ok: False}. El caller pinta "no extraído" en la UI.
"""
from __future__ import annotations

import io
import logging
import re
import urllib.request
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Descarga PDF + extracción de texto
# ─────────────────────────────────────────────────────────────────

def _download_pdf_bytes(url: str, *, timeout_s: float = 30.0) -> bytes | None:
    if not url:
        return None
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "PoliteiaBrain/1.0 (politeia-visual-oscar.vercel.app)",
            "Accept": "application/pdf, */*",
        })
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            return resp.read()
    except Exception as exc:
        logger.warning("PDF download falló %s: %s", url[:80], exc)
        return None


def extract_text_from_pdf(pdf_url: str) -> dict[str, Any]:
    """Extrae texto plano de un PDF · cascada de backends.

    Devuelve `{ok, text, backend, n_pages, error}`.
    """
    data = _download_pdf_bytes(pdf_url)
    if not data:
        return {"ok": False, "error": "download_failed", "text": "", "backend": ""}

    # 1) pdfplumber
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages_text = []
            for p in pdf.pages:
                t = p.extract_text() or ""
                pages_text.append(t)
            txt = "\n".join(pages_text)
            if txt.strip():
                return {"ok": True, "text": txt, "backend": "pdfplumber",
                        "n_pages": len(pdf.pages)}
    except ImportError:
        pass
    except Exception as exc:
        logger.debug("pdfplumber falló: %s", exc)

    # 2) PyMuPDF (fitz)
    try:
        import fitz  # type: ignore  · PyMuPDF
        doc = fitz.open(stream=data, filetype="pdf")
        txt = "\n".join(p.get_text() or "" for p in doc)
        if txt.strip():
            return {"ok": True, "text": txt, "backend": "pymupdf",
                    "n_pages": doc.page_count}
    except ImportError:
        pass
    except Exception as exc:
        logger.debug("pymupdf falló: %s", exc)

    # 3) pdfminer.six
    try:
        from pdfminer.high_level import extract_text  # type: ignore
        txt = extract_text(io.BytesIO(data))
        if txt and txt.strip():
            return {"ok": True, "text": txt, "backend": "pdfminer",
                    "n_pages": None}
    except ImportError:
        pass
    except Exception as exc:
        logger.debug("pdfminer falló: %s", exc)

    # 4) pytesseract (PDF escaneado)
    try:
        import pytesseract  # type: ignore
        from pdf2image import convert_from_bytes  # type: ignore
        imgs = convert_from_bytes(data, dpi=200)
        txt = "\n".join(pytesseract.image_to_string(img, lang="spa") for img in imgs)
        if txt.strip():
            return {"ok": True, "text": txt, "backend": "pytesseract",
                    "n_pages": len(imgs)}
    except ImportError:
        pass
    except Exception as exc:
        logger.debug("pytesseract falló: %s", exc)

    return {"ok": False, "error": "no_pdf_backend_installed",
            "text": "", "backend": "",
            "hint": "Instala pdfplumber o PyMuPDF o pdfminer.six"}


# ─────────────────────────────────────────────────────────────────
# Parser regex de declaración de bienes
# ─────────────────────────────────────────────────────────────────

# Patrones para distintos campos (Congreso usa plantilla LibreOffice típica)
_PATRONES_PATRIMONIO = [
    re.compile(r"patrimonio\s+(?:total\s+)?(?:bruto|neto)?\s*[:=]?\s*([\d\.,]+)\s*(?:€|euros?)",
                re.IGNORECASE),
    re.compile(r"(?:total|importe)\s+(?:del?\s+)?patrimonio\s*[:=]?\s*([\d\.,]+)",
                re.IGNORECASE),
]
_PATRONES_SALARIO = [
    re.compile(r"(?:retribuci[oó]n|salario|sueldo|asignaci[oó]n)\s+(?:bruta\s+)?anual\s*[:=]?\s*([\d\.,]+)",
                re.IGNORECASE),
    re.compile(r"(?:ingresos\s+totales\s+brutos\s+(?:percibidos\s+)?(?:en\s+el\s+(?:ejercicio|a[ñn]o))?)\s*[:=]?\s*([\d\.,]+)",
                re.IGNORECASE),
]
_PATRONES_AÑO = re.compile(r"(?:ejercicio|año|periodo)\s+(20\d{2})", re.IGNORECASE)


def _parse_importe_eur(raw: str) -> float | None:
    """Parsea importes en formato español o inglés.

    Reglas:
      · Formato español: "350.000" = 350 000 (miles con punto)
      · Formato español decimal: "1.234.567,89"
      · Formato inglés: "1,234,567.89"
    Heurística: si hay coma y punto, el separador decimal es el último.
    Si solo hay punto, miramos si está seguido de 3 dígitos exactos →
    asumimos miles (formato español). Si no, decimal.
    Si solo hay coma → decimal español.
    """
    if not raw:
        return None
    s = raw.strip().replace(" ", "").replace("€", "").replace("EUR", "")
    if not s:
        return None
    has_dot = "." in s
    has_comma = "," in s

    if has_dot and has_comma:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif has_comma:
        # Coma = decimal español
        s = s.replace(",", ".")
    elif has_dot:
        # Sólo puntos: si todos los puntos están seguidos de 3 dígitos,
        # son separadores de miles (formato español típico).
        partes = s.split(".")
        if len(partes) >= 2 and all(len(p) == 3 for p in partes[1:]) and partes[0].isdigit():
            s = "".join(partes)
        # Si no, dejamos `s` tal cual (un decimal con .XX o .X)
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _extract_match_float(text: str, patrones: list[re.Pattern]) -> float | None:
    for pat in patrones:
        m = pat.search(text or "")
        if m:
            val = _parse_importe_eur(m.group(1))
            if val is not None and val > 0:
                return val
    return None


def _extract_bienes(text: str) -> list[dict[str, Any]]:
    """Extrae lista de bienes detectados en el PDF.

    Busca secciones tipo "INMUEBLES", "CUENTAS BANCARIAS", "ACCIONES",
    "DEUDAS" y captura líneas con importes.
    """
    bienes: list[dict[str, Any]] = []
    if not text:
        return bienes

    secciones = {
        "inmueble": re.compile(
            r"(?:bienes\s+inmuebles|inmuebles)(.*?)(?:cuentas|veh[ií]culos|acciones|deudas|otros|$)",
            re.IGNORECASE | re.DOTALL,
        ),
        "cuenta": re.compile(
            r"(?:cuentas\s+bancarias|dep[oó]sitos)(.*?)(?:inmuebles|veh[ií]culos|acciones|deudas|otros|$)",
            re.IGNORECASE | re.DOTALL,
        ),
        "acciones": re.compile(
            r"(?:acciones|valores|t[ií]tulos|fondos\s+(?:de\s+)?inversi[oó]n)(.*?)(?:inmuebles|cuentas|veh[ií]culos|deudas|otros|$)",
            re.IGNORECASE | re.DOTALL,
        ),
        "vehículo": re.compile(
            r"(?:veh[ií]culos|autom[oó]viles)(.*?)(?:inmuebles|cuentas|acciones|deudas|otros|$)",
            re.IGNORECASE | re.DOTALL,
        ),
        "deuda": re.compile(
            r"(?:deudas|pr[eé]stamos\s+hipotecarios|cr[eé]ditos)(.*?)(?:inmuebles|cuentas|acciones|veh[ií]culos|otros|$)",
            re.IGNORECASE | re.DOTALL,
        ),
    }
    importe_re = re.compile(r"([\d\.,]{4,})\s*(?:€|euros?)?", re.IGNORECASE)

    for tipo, pat in secciones.items():
        m = pat.search(text)
        if not m:
            continue
        bloque = m.group(1)
        # Tomar primeras 5 líneas no vacías con importe
        for line in bloque.split("\n"):
            line = line.strip()
            if not line or len(line) < 10:
                continue
            imp = importe_re.search(line)
            if not imp:
                continue
            valor = _parse_importe_eur(imp.group(1))
            if valor is None or valor < 100:
                continue
            descripcion = re.sub(importe_re, "", line).strip(" .,;:-")
            bienes.append({
                "tipo": tipo,
                "descripcion": descripcion[:120],
                "valor_eur": valor,
                "anio_declaracion": "",
            })
            if len([b for b in bienes if b["tipo"] == tipo]) >= 6:
                break
    return bienes


def parse_declaracion_pdf(pdf_url: str) -> dict[str, Any]:
    """Parser completo · descarga, extrae texto, parsea campos.

    Devuelve `{ok, patrimonio_bruto_eur, salario_anual_oficial_eur,
                bienes, anio_declaracion, backend, raw_text_chars,
                error}`.
    """
    extracted = extract_text_from_pdf(pdf_url)
    if not extracted.get("ok"):
        return {
            "ok": False,
            "error": extracted.get("error") or "extract_failed",
            "patrimonio_bruto_eur": None,
            "salario_anual_oficial_eur": None,
            "bienes": [],
            "anio_declaracion": "",
            "backend": extracted.get("backend") or "",
            "hint": extracted.get("hint", ""),
        }
    text = extracted["text"]
    anio_m = _PATRONES_AÑO.search(text)
    return {
        "ok": True,
        "patrimonio_bruto_eur": _extract_match_float(text, _PATRONES_PATRIMONIO),
        "salario_anual_oficial_eur": _extract_match_float(text, _PATRONES_SALARIO),
        "bienes": _extract_bienes(text),
        "anio_declaracion": anio_m.group(1) if anio_m else "",
        "backend": extracted.get("backend"),
        "n_pages": extracted.get("n_pages"),
        "raw_text_chars": len(text),
    }
