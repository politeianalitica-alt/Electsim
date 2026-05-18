"""
BORME (Boletín Oficial del Registro Mercantil) + SABI/DIRCE.

  · BORME (gratis):  https://www.boe.es/diario_borme/
      Publica diariamente actos mercantiles (nombramientos, ceses,
      constituciones, ampliaciones de capital, fusiones, disoluciones).
      Útil para detectar vínculos empresariales de políticos.

  · DIRCE (INE): catálogo de empresas españolas con sector + nº empleados
      agregado por provincia/sector. Solo a nivel agregado.

  · SABI (Bureau van Dijk, de pago): empresas individuales con balances,
      consejos administración. Requiere licencia.

API:
  · search_borme_actos(nombre, dias_atras=365) → list[acto]
       Busca actos mercantiles que mencionen un nombre (presidente,
       consejero, fundador, etc.)
  · empresas_top_provincia(cod_provincia, limit=10) → list[empresa]
       Stub que devuelve [] hasta integrar SABI o scraping específico.
  · sectores_empleo_provincia(cod_provincia) → list[{sector, pct}]
       Stub DIRCE.
"""
from __future__ import annotations

import logging
import re
import urllib.parse
from datetime import date, timedelta
from typing import Any

from ._http import http_get_text

logger = logging.getLogger(__name__)

BORME_BUSQUEDA = "https://www.boe.es/buscar/borme.php"


def search_borme_actos(nombre: str, *, dias_atras: int = 365,
                       max_items: int = 30) -> list[dict[str, Any]]:
    """Busca menciones de un nombre en BORME (actos mercantiles).

    Estrategia: scraping de la búsqueda HTML de boe.es/buscar/borme.php
    (que devuelve JSON-like en algunos casos).
    """
    if not nombre:
        return []
    fecha_desde = (date.today() - timedelta(days=int(dias_atras))).isoformat()
    fecha_hasta = date.today().isoformat()
    params = urllib.parse.urlencode({
        "tn": "0",
        "txt": nombre,
        "fechaIni": fecha_desde,
        "fechaFin": fecha_hasta,
    })
    url = f"{BORME_BUSQUEDA}?{params}"
    html = http_get_text(url, ttl_seconds=43200)
    if not html:
        return []

    # Resultados típicos: <a href="/borme/dias/.../pdfs/BORME-A-XXX.pdf">Acto X</a>
    items: list[dict[str, Any]] = []
    pattern = re.compile(
        r'<a[^>]+href="(/borme/dias/[^"]+)"[^>]*>([^<]+)</a>',
        re.IGNORECASE,
    )
    seen: set[str] = set()
    for m in pattern.finditer(html):
        url_rel = m.group(1)
        titulo = m.group(2).strip()
        if url_rel in seen:
            continue
        seen.add(url_rel)
        items.append({
            "fecha": _extract_fecha_de_url(url_rel),
            "titulo": titulo,
            "url": f"https://www.boe.es{url_rel}",
            "tipo_acto": _detectar_tipo_acto(titulo),
        })
        if len(items) >= max_items:
            break
    return items


def _extract_fecha_de_url(url: str) -> str:
    """De /borme/dias/2025/05/14/pdfs/... saca 2025-05-14."""
    m = re.search(r"/dias/(\d{4})/(\d{2})/(\d{2})/", url)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return ""


def _detectar_tipo_acto(titulo: str) -> str:
    t = titulo.lower()
    if "nombramient" in t or "designaci" in t:
        return "nombramiento"
    if "cese" in t or "dimisi" in t:
        return "cese"
    if "constituci" in t:
        return "constitución sociedad"
    if "fusi" in t:
        return "fusión"
    if "disoluci" in t or "extinci" in t:
        return "disolución"
    if "ampliaci" in t and "capital" in t:
        return "ampliación capital"
    if "concurso" in t:
        return "concurso acreedores"
    return "otro"


def empresas_top_provincia(cod_provincia: str,
                           *, limit: int = 10) -> list[dict[str, Any]]:
    """Stub · top empresas por provincia (requiere SABI o scraping específico)."""
    return []


def sectores_empleo_provincia(cod_provincia: str) -> list[dict[str, Any]]:
    """Stub · % empleo por sector provincial (requiere DIRCE tabla 51001)."""
    return []


def detectar_puertas_giratorias(
    cargos_publicos: list[dict[str, Any]],
    actos_borme: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Detecta posibles puertas giratorias cruzando trayectoria pública
    con actos mercantiles.

    Heurística: si en los 12 meses posteriores a un cese público hay un
    nombramiento mercantil, lo marcamos como sospechoso.
    """
    sospechosos: list[dict[str, Any]] = []
    if not cargos_publicos or not actos_borme:
        return sospechosos
    for cargo in cargos_publicos:
        fin = cargo.get("fecha_fin") or cargo.get("fecha_baja")
        if not fin:
            continue
        try:
            from datetime import datetime
            fin_dt = datetime.fromisoformat(str(fin)[:10]).date()
        except (ValueError, TypeError):
            continue
        for acto in actos_borme:
            if acto.get("tipo_acto") != "nombramiento":
                continue
            try:
                acto_dt = date.fromisoformat(acto.get("fecha", ""))
            except ValueError:
                continue
            delta = (acto_dt - fin_dt).days
            if 0 <= delta <= 365:
                sospechosos.append({
                    "cargo_publico": cargo.get("cargo") or "?",
                    "fecha_fin_publico": fin,
                    "nombramiento_borme": acto.get("titulo", ""),
                    "fecha_nombramiento": acto.get("fecha"),
                    "dias_entre": delta,
                    "url_borme": acto.get("url"),
                })
    return sospechosos
