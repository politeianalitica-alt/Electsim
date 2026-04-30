"""
Servicio BOE — Boletín Oficial del Estado
Basado en MCP-BOE-main (gits amigos) + API oficial boe.es/datosabiertos

Funciones:
  - obtener_sumario(fecha) → items del día
  - buscar_legislacion(query, rows) → normas consolidadas
  - buscar_por_departamento(dept, rows) → normas por ministerio
  - analizar_impacto_boe(item) → análisis IA del impacto
"""
from __future__ import annotations
import asyncio
from datetime import datetime, timedelta
from typing import Optional
import httpx

BASE = "https://www.boe.es/datosabiertos/api"
HEADERS = {"Accept": "application/json", "User-Agent": "ElectSim/1.0"}

DEPARTAMENTOS = {
    "Presidencia": "PR",
    "Economía": "MTMA",
    "Interior": "INT",
    "Defensa": "DEF",
    "Hacienda": "MHFP",
    "Justicia": "JUS",
    "Trabajo": "MTSSS",
    "Educación": "MEFP",
    "Sanidad": "SAN",
    "Industria": "MINCOTUR",
}

SECCIONES_BOE = {
    "I": "Disposiciones generales",
    "II": "Autoridades y personal",
    "III": "Otras disposiciones",
    "IV": "Administración de Justicia",
    "V": "Anuncios",
}


def _sync_get(url: str, params: dict | None = None, timeout: float = 15.0) -> dict:
    """Petición HTTP síncrona con manejo de errores."""
    try:
        r = httpx.get(url, params=params, headers=HEADERS, timeout=timeout, follow_redirects=True)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {"error": str(e), "status": {"code": "500"}}


def obtener_sumario(fecha: Optional[str] = None) -> list[dict]:
    """
    Obtiene el sumario del BOE para una fecha dada.
    fecha: 'YYYYMMDD'o None para hoy
    """
    if not fecha:
        # Intentar hoy, si no hay (fin de semana) ir hacia atrás
        for i in range(5):
            d = datetime.now() - timedelta(days=i)
            fecha_try = d.strftime("%Y%m%d")
            r = _sync_get(f"{BASE}/boe/sumario/{fecha_try}")
            if r.get("status", {}).get("code") == "200":
                return _parsear_sumario(r.get("data", {}).get("sumario", {}), fecha_try)
        return []
    r = _sync_get(f"{BASE}/boe/sumario/{fecha}")
    if r.get("status", {}).get("code") != "200":
        return []
    return _parsear_sumario(r.get("data", {}).get("sumario", {}), fecha)


def _parsear_sumario(sumario: dict, fecha: str) -> list[dict]:
    """Convierte el sumario BOE en lista plana de items.

    La API del BOE tiene dos estructuras según la sección:
    - Sección I:   departamento.texto.epigrafe → items
    - Sección II+: departamento.epigrafe → items (sin clave 'texto')
    """
    items = []
    diario = sumario.get("diario", [])
    if isinstance(diario, dict):
        diario = [diario]

    for dia in diario:
        secciones = dia.get("seccion", [])
        if isinstance(secciones, dict):
            secciones = [secciones]
        for sec in secciones:
            if not isinstance(sec, dict):
                continue
            sec_nombre = sec.get("nombre", "")
            depts_raw = sec.get("departamento", [])
            if isinstance(depts_raw, dict):
                depts_raw = [depts_raw]
            for dept in depts_raw:
                if not isinstance(dept, dict):
                    continue
                dept_nombre = dept.get("nombre", "")
                # Estructura I: departamento → texto → epigrafe
                texto = dept.get("texto", {})
                if isinstance(texto, dict) and texto.get("epigrafe"):
                    epigrafes = texto["epigrafe"]
                else:
                    # Estructura II+: departamento → epigrafe directamente
                    epigrafes = dept.get("epigrafe", [])
                if isinstance(epigrafes, dict):
                    epigrafes = [epigrafes]
                for epi in epigrafes:
                    if not isinstance(epi, dict):
                        continue
                    epi_nombre = epi.get("nombre", "")
                    for item in _extract_items(epi):
                        item["fecha"] = fecha
                        item["seccion"] = sec_nombre
                        item["departamento"] = dept_nombre
                        item["epigrafe"] = epi_nombre
                        items.append(item)
    return items


def _extract_items(epigrafe: dict) -> list[dict]:
    """Extrae items individuales de un epígrafe."""
    result = []
    raw_items = epigrafe.get("item", [])
    if isinstance(raw_items, dict):
        raw_items = [raw_items]
    for it in raw_items:
        if not isinstance(it, dict):
            continue
        result.append({
            "id": it.get("identificador", ""),
            "titulo": it.get("titulo", ""),
            "url_html": it.get("url_html", ""),
            "url_pdf": it.get("url_pdf", ""),
            "tipo": it.get("titulo", "")[:50],
        })
    return result


def buscar_legislacion(query: str, rows: int = 10, departamento: str = "") -> list[dict]:
    """Busca en la legislación consolidada del BOE."""
    params: dict = {"rows": rows}
    if departamento:
        params["departamento"] = departamento
    # La búsqueda por texto libre no está en la API pública directa
    # Usamos el buscador web como fallback
    r = _sync_get(f"{BASE}/legislacion-consolidada", params=params)
    if r.get("error"):
        return []
    data = r.get("data", {})
    items = data.get("items", []) or data.get("response", {}).get("docs", [])
    if not items:
        return []
    return [
        {
            "titulo": it.get("titulo", ""),
            "fecha": it.get("fecha_publicacion", ""),
            "departamento": it.get("departamento", ""),
            "tipo": it.get("tipo", ""),
            "url": it.get("url", ""),
            "id": it.get("identificador", ""),
        }
        for it in items[:rows]
    ]


def obtener_item_texto(id_boe: str) -> str:
    """Obtiene el texto XML/HTML de un item del BOE."""
    try:
        r = httpx.get(
            f"https://www.boe.es/diario_boe/xml.php?id={id_boe}",
            headers=HEADERS, timeout=20, follow_redirects=True
        )
        return r.text
    except Exception:
        return ""


def clasificar_impacto(titulo: str, seccion: str, departamento: str) -> str:
    """Clasifica el impacto de una norma según su sección y departamento."""
    titulo_l = titulo.lower()
    if any(k in titulo_l for k in ["real decreto-ley", "ley orgánica", "ley ", "presupuesto"]):
        return "CRÍTICO"
    if any(k in titulo_l for k in ["real decreto", "resolución", "orden ministerial"]):
        if seccion == "I":
            return "ALTO"
        return "MEDIO"
    if seccion in ("II", "III"):
        return "BAJO"
    return "INFORMATIVO"


def agrupar_por_departamento(items: list[dict]) -> dict[str, list[dict]]:
    """Agrupa items del BOE por departamento."""
    grupos: dict[str, list[dict]] = {}
    for it in items:
        dept = it.get("departamento", "Otros")
        grupos.setdefault(dept, []).append(it)
    return grupos
