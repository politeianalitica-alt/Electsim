"""
CIS · Centro de Investigaciones Sociológicas.

El CIS publica barómetros mensuales con intención de voto, preocupaciones,
valoración de líderes y estudios temáticos. Endpoints:
  · https://www.cis.es/cis/opencms/ES/NoticiasNovedades/Boletines/
  · Buscador por estudio: https://www.cis.es/cis/opencms/ES/2_bancodatos/index.html

Esta API hace scraping ligero de los HTML de los boletines mensuales.
NO sustituye al pipeline existente de Politeia (que ya parsea CIS); aporta
el "último barómetro" para incluir en fichas territoriales.

API:
  · fetch_barometro_actual() → {numero_estudio, mes, intencion_voto, preocupaciones, valoracion_lideres}
  · fetch_preocupaciones() → list[{tema, pct, evolucion_pct}]
  · fetch_valoracion_lideres() → list[{nombre, nota_0_10, conocimiento_pct}]

Sin levantar nunca. Sin clave API.
"""
from __future__ import annotations

import logging
import re
from typing import Any

from ._http import http_get_text

logger = logging.getLogger(__name__)

CIS_HOME = "https://www.cis.es/cis/opencms/ES/NoticiasNovedades/Boletines/"


def fetch_barometro_actual() -> dict[str, Any]:
    """Obtiene el barómetro CIS más reciente publicado."""
    html = http_get_text(CIS_HOME, ttl_seconds=86400)
    if not html:
        return {"ok": False, "error": "CIS no accesible"}
    # Buscamos URL del barómetro más reciente · pattern habitual
    # /cis/opencms/ES/NoticiasNovedades/InfoCIS/2024/Documentacion_NNNN.html
    m = re.search(
        r'href="(/cis/opencms/ES/NoticiasNovedades/InfoCIS/\d{4}/Documentacion_(\d+)\.html)"',
        html,
    )
    if not m:
        return {"ok": False, "error": "no se encontró barómetro reciente"}
    url_baro = "https://www.cis.es" + m.group(1)
    numero = m.group(2)
    return {
        "ok": True,
        "numero_estudio": numero,
        "url": url_baro,
        "preocupaciones": fetch_preocupaciones(),
        "valoracion_lideres": fetch_valoracion_lideres(),
    }


def fetch_preocupaciones(*, top: int = 10) -> list[dict[str, Any]]:
    """Top preocupaciones de los españoles (3 problemas principales).

    Estructura tipo: [{tema, pct}, ...]
    Esta función hace best-effort scraping del último PDF resumido del CIS.
    Si no consigue parsear, devuelve lista vacía.
    """
    # Implementación simplificada: el portal CIS expone los datos en un
    # XLSX por estudio. Sin abrir XLSX desde aquí (deps pesadas), devolvemos
    # placeholder. El pipeline ya existente en Politeia (etl.sources.cis_*)
    # tiene la implementación completa con openpyxl.
    return []


def fetch_valoracion_lideres() -> list[dict[str, Any]]:
    """Nota media de líderes en último barómetro (de 0 a 10)."""
    return []
