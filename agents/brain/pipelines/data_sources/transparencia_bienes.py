"""
Portal de Transparencia · Declaraciones de bienes y actividades.

El Congreso publica las declaraciones de bienes de cada diputado en:
  https://www.congreso.es/web/guest/busqueda-de-diputados-tras-el-7-de-abril/
  -> sección "Declaración de bienes y actividades"

Y el Senado en:
  https://www.senado.es/web/composicionorganizacion/senadores/...

El detalle suele ser PDF (escaneado o nativo). Aquí extraemos lo que
se puede sacar SIN OCR pesado:
  · URL del PDF de declaración
  · Año de declaración
  · Si existe (badge de transparencia)

Para extraer importe de patrimonio, bienes inmuebles, cuentas, etc. del
PDF hace falta OCR (pytesseract) o parseo PDF estructurado (pdfplumber)
— se deja como pipeline secundario opcional.

API:
  · fetch_declaracion_diputado(id_diputado, legislatura) → {ok, url_pdf, anio}
  · ocr_declaracion(pdf_url) → {patrimonio, inmuebles, cuentas} (stub)
"""
from __future__ import annotations

import logging
import re
from typing import Any

from ._http import http_get_text

logger = logging.getLogger(__name__)

CONGRESO_BUSQUEDA_BASE = "https://www.congreso.es/busqueda-de-diputados"


def fetch_declaracion_diputado(id_diputado: str,
                               *, legislatura: str = "XV") -> dict[str, Any]:
    """Encuentra URL del PDF de declaración de bienes del diputado.

    Estrategia: scrape de la página del diputado, busca enlaces a PDF
    en la sección "Declaración de bienes y actividades".
    """
    if not id_diputado:
        return {"ok": False, "error": "id_diputado vacío"}
    url = (
        f"{CONGRESO_BUSQUEDA_BASE}/diputado?"
        f"p_p_id=ficha_diputado&p_p_state=normal&"
        f"_ficha_diputado_idDiputado={id_diputado}&"
        f"_ficha_diputado_legislatura={legislatura}"
    )
    html = http_get_text(url, ttl_seconds=43200)
    if not html:
        return {"ok": False, "error": "página no accesible"}

    # Busca enlaces a PDFs de declaración
    pdf_pattern = re.compile(
        r'href="([^"]+\.pdf)"[^>]*>[^<]*'
        r'(?:bienes|actividades|patrimonio|declaraci)[^<]*</a>',
        re.IGNORECASE,
    )
    matches = pdf_pattern.findall(html)
    if not matches:
        # Patrón más laxo
        m = re.search(r'href="([^"]+(?:declar|bienes)[^"]+\.pdf)"', html, re.I)
        if not m:
            return {"ok": False, "error": "PDF de declaración no encontrado",
                    "badge_transparencia": "amarillo"}
        url_pdf = m.group(1)
    else:
        url_pdf = matches[0]
    if url_pdf.startswith("/"):
        url_pdf = "https://www.congreso.es" + url_pdf
    # Intentar extraer año del nombre del archivo
    anio_match = re.search(r"(20\d{2})", url_pdf)
    anio = anio_match.group(1) if anio_match else ""
    return {
        "ok": True,
        "url_pdf": url_pdf,
        "anio": anio,
        "badge_transparencia": "verde",
    }


def ocr_declaracion(pdf_url: str) -> dict[str, Any]:
    """OCR/parse de declaración de bienes · cascada de backends.

    Usa `pdf_ocr.parse_declaracion_pdf` que prueba en orden:
      pdfplumber → PyMuPDF → pdfminer.six → pytesseract (con tesseract-ocr).

    Si ningún backend está instalado, devuelve {ok: False, hint: ...}
    sin levantar. Cuando un backend funciona, extrae:
      · patrimonio_bruto_eur
      · salario_anual_oficial_eur
      · bienes: list[{tipo, descripcion, valor_eur, anio_declaracion}]
      · anio_declaracion
    """
    from agents.brain.pipelines.data_sources.pdf_ocr import parse_declaracion_pdf
    out = parse_declaracion_pdf(pdf_url)
    out["pdf_url"] = pdf_url
    out.setdefault("evolucion_patrimonial", [])
    return out


def evaluar_consistencia_patrimonio(historico: list[dict[str, Any]],
                                    salario_eur: float | None) -> dict[str, Any]:
    """Heurística IA-asistida para detectar inconsistencias:
    si el patrimonio crece > 3x más rápido que el salario acumulado,
    levanta alerta.
    """
    if not historico or len(historico) < 2:
        return {"alerta": False, "razon": "sin histórico suficiente"}
    primero = historico[0]
    ultimo = historico[-1]
    try:
        p0 = float(primero.get("patrimonio_bruto_eur") or 0)
        p1 = float(ultimo.get("patrimonio_bruto_eur") or 0)
        anios = (int(ultimo.get("anio") or 0)) - (int(primero.get("anio") or 0))
    except (TypeError, ValueError):
        return {"alerta": False, "razon": "datos no numéricos"}
    if anios <= 0:
        return {"alerta": False, "razon": "sin variación temporal"}
    crecimiento_pct = ((p1 - p0) / max(1.0, p0)) * 100
    salario_acumulado = (salario_eur or 0) * anios
    if p1 - p0 > salario_acumulado * 3 and crecimiento_pct > 200:
        return {
            "alerta": True,
            "razon": (
                f"Patrimonio creció {crecimiento_pct:.0f}% en {anios} años "
                f"(de {p0:,.0f}€ a {p1:,.0f}€). Salario acumulado teórico: "
                f"{salario_acumulado:,.0f}€. Diferencia inexplicada."
            ),
        }
    return {"alerta": False, "crecimiento_pct": crecimiento_pct}
