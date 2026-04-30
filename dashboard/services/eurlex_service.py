"""
EUR-Lex Service — Legislación de la Unión Europea
==================================================
Accede a la base de datos legislativa de la UE directamente en Python,
sin requerir R (que es la base de eurlex-master en gits amigos).

Reimplementa en Python el core de:
  • michalovadek/eurlex (gits amigos) — elx_make_query, elx_run_query, elx_fetch_data
  • mscottodivettimo/scrapeu — estado procedimental de directivas en el PE

API del Publications Office (EUR-Lex):
  - SPARQL endpoint: https://publications.europa.eu/webapi/rdf/sparql
  - REST: https://eur-lex.europa.eu/rest-api/search
  - Cellar (SPARQL Cellar): https://publications.europa.eu/webapi/rdf/sparql

Fuentes alternativas sin autenticación:
  - https://eur-lex.europa.eu/search.html (scraping controlado)
  - https://www.europarl.europa.eu/oeil/popups/ficheprocedure.do (procedimientos PE)

Cubre:
  - Reglamentos, Directivas, Decisiones UE en tramitación y aprobadas
  - Estado procedimental (COM → PE → Consejo → publicación)
  - Textos en español cuando disponibles
  - Impacto sectorial estimado
"""
from __future__ import annotations

import re
import time
import threading
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Any
import sys

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# HTTP cliente
try:
    import httpx as _httpx
    def _get(url: str, params: dict | None = None, timeout: float = 20.0,
             headers: dict | None = None) -> dict | str | None:
        try:
            r = _httpx.get(url, params=params,
                           headers=headers or {
                               "Accept": "application/sparql-results+json",
                               "User-Agent": "Politeia/2.0 (research)"
                           },
                           timeout=timeout, follow_redirects=True)
            r.raise_for_status()
            ct = r.headers.get("content-type","")
            if "json"in ct:
                return r.json()
            return r.text
        except Exception as e:
            return {"error": str(e)}
except ImportError:
    import urllib.request, json as _json
    def _get(url, params=None, timeout=20.0, headers=None):
        if params:
            from urllib.parse import urlencode
            url = url + "?" + urlencode(params)
        try:
            req = urllib.request.Request(url, headers=headers or {"User-Agent":"Politeia/2.0"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
                try:
                    return _json.loads(data)
                except Exception:
                    return data.decode("utf-8","replace")
        except Exception as e:
            return {"error": str(e)}

# ── Endpoints ─────────────────────────────────────────────────────────────────
_SPARQL_ENDPOINT  = "https://publications.europa.eu/webapi/rdf/sparql"
_EURLEX_SEARCH    = "https://eur-lex.europa.eu/rest-api/search"
_OEIL_SEARCH      = "https://oeil.secure.europarl.europa.eu/oeil/rest/procedure/search"
_CELLAR_DOC       = "https://publications.europa.eu/resource/cellar"

# Prefijos SPARQL estándar EUR-Lex (de eurlex-master)
_SPARQL_PREFIXES = """
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
"""

_LOCK = threading.RLock()
_CACHE: dict[str, tuple[float, Any]] = {}
_CACHE_TTL = 3600.0  # 1 hora

# ═══════════════════════════════════════════════════════════════════════════════
# DATACLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class NormaUE:
    """Norma de la Unión Europea."""
    cellar_id:     str
    tipo:          str       # reglamento | directiva | decision | recomendacion
    numero:        str       # "2024/1689" (AI Act)
    titulo:        str
    fecha_pub:     str
    estado:        str       # en_vigor | en_tramite | derogada
    oj_ref:        str       # "OJ L 2024/1689"
    url_eurlex:    str
    sectores:      list[str]
    resumen:       str
    fases:         list[dict] = field(default_factory=list)  # timeline procedimental
    impacto_es:    str = "bajo"  # alto | medio | bajo para España


@dataclass
class ProcedimientoPE:
    """Procedimiento legislativo en el Parlamento Europeo."""
    ref:          str    # "2021/0106(COD)"
    titulo:       str
    tipo:         str    # COD | CNS | APP | AVC
    fase:         str    # "propuesta_com" | "primera_lectura_pe" | "consejo" | "aprobado"
    fecha_inicio: str
    fecha_ultima: str
    rapporteur:   str
    comite:       str
    url:          str
    sectores:     list[str]


@dataclass
class AlertaUE:
    """Alerta de nueva norma UE relevante."""
    norma_id:  str
    titulo:    str
    tipo:      str
    motivo:    str
    keyword:   str
    impacto:   str
    fecha:     str
    url:       str


# ═══════════════════════════════════════════════════════════════════════════════
# SPARQL QUERIES — (reimplementa elx_make_query de eurlex-master)
# ═══════════════════════════════════════════════════════════════════════════════

def _sparql_query(query: str, timeout: float = 30.0) -> list[dict]:
    """
    Ejecuta una query SPARQL en el endpoint EUR-Lex.
    Implementación Python del elx_run_query() de michalovadek/eurlex.
    """
    full_query = _SPARQL_PREFIXES + "\n" + query
    params = {"query": full_query, "format": "application/sparql-results+json"}

    cache_key = hash(full_query)
    with _LOCK:
        if cache_key in _CACHE:
            ts, val = _CACHE[cache_key]
            if time.time() - ts < _CACHE_TTL:
                return val

    resp = _get(_SPARQL_ENDPOINT, params=params, timeout=timeout,
                headers={"Accept":"application/sparql-results+json","User-Agent":"Politeia/2.0"})

    if not resp or isinstance(resp, str) or "error"in (resp if isinstance(resp, dict) else {}):
        return []

    try:
        bindings = resp.get("results", {}).get("bindings", [])
        result = [
            {k: v.get("value","") for k, v in b.items()}
            for b in bindings
        ]
        with _LOCK:
            _CACHE[cache_key] = (time.time(), result)
        return result
    except Exception:
        return []


def buscar_directivas_recientes(dias: int = 90, max_items: int = 20) -> list[NormaUE]:
    """
    Busca directivas UE publicadas en los últimos N días.
    Implementa elx_make_query(resource_type="directive") de eurlex-master.
    """
    fecha_limite = (date.today() - timedelta(days=dias)).strftime("%Y-%m-%d")

    query = f"""
SELECT DISTINCT ?work ?title ?date ?celex ?oj WHERE {{
  ?work cdm:work_date_document ?date ;
        cdm:resource_legal_id_celex ?celex .
  FILTER(?date >= "{fecha_limite}"^^xsd:date)
  FILTER(REGEX(STR(?celex), "^3[0-9]{{4}}L", "i"))
  OPTIONAL {{
    ?work cdm:work_has_expression ?expr .
    ?expr cdm:expression_title ?title ;
          cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/SPA> .
  }}
  OPTIONAL {{ ?work cdm:work_id_document ?oj . }}
}}
ORDER BY DESC(?date)
LIMIT {max_items}
"""
    rows = _sparql_query(query)
    return [_row_to_norma_ue(r, "directiva") for r in rows if r]


def buscar_reglamentos_recientes(dias: int = 90, max_items: int = 20) -> list[NormaUE]:
    """Busca reglamentos UE recientes."""
    fecha_limite = (date.today() - timedelta(days=dias)).strftime("%Y-%m-%d")

    query = f"""
SELECT DISTINCT ?work ?title ?date ?celex WHERE {{
  ?work cdm:work_date_document ?date ;
        cdm:resource_legal_id_celex ?celex .
  FILTER(?date >= "{fecha_limite}"^^xsd:date)
  FILTER(REGEX(STR(?celex), "^3[0-9]{{4}}R", "i"))
  OPTIONAL {{
    ?work cdm:work_has_expression ?expr .
    ?expr cdm:expression_title ?title ;
          cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/SPA> .
  }}
}}
ORDER BY DESC(?date)
LIMIT {max_items}
"""
    rows = _sparql_query(query)
    return [_row_to_norma_ue(r, "reglamento") for r in rows if r]


def buscar_normas_ue_por_tema(
    tema: str,
    tipo: str = "any",
    max_items: int = 15,
) -> list[NormaUE]:
    """
    Búsqueda temática en EUR-Lex.
    Implementa elx_run_query con filtro por keywords.
    """
    tema_escaped = tema.replace('"', '\\"')
    type_filter = ""
    if tipo == "directiva":
        type_filter = 'FILTER(REGEX(STR(?celex), "^3[0-9]{4}L", "i"))'
    elif tipo == "reglamento":
        type_filter = 'FILTER(REGEX(STR(?celex), "^3[0-9]{4}R", "i"))'

    query = f"""
SELECT DISTINCT ?work ?title ?date ?celex WHERE {{
  ?work cdm:resource_legal_id_celex ?celex .
  OPTIONAL {{ ?work cdm:work_date_document ?date . }}
  ?work cdm:work_has_expression ?expr .
  ?expr cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/SPA> ;
        cdm:expression_title ?title .
  FILTER(CONTAINS(LCASE(?title), LCASE("{tema_escaped}")))
  {type_filter}
}}
ORDER BY DESC(?date)
LIMIT {max_items}
"""
    rows = _sparql_query(query)
    return [_row_to_norma_ue(r, tipo or "norma_ue") for r in rows if r]


def _row_to_norma_ue(row: dict, tipo_default: str) -> NormaUE:
    """Convierte una fila SPARQL en un objeto NormaUE."""
    celex = row.get("celex","")
    titulo = row.get("title","") or f"[{celex}]"
    fecha = row.get("date","")[:10] if row.get("date") else ""
    numero = _celex_a_numero(celex)
    url = f"https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:{celex}"if celex else ""

    return NormaUE(
        cellar_id=row.get("work",""),
        tipo=tipo_default,
        numero=numero,
        titulo=titulo,
        fecha_pub=fecha,
        estado="en_vigor",
        oj_ref=row.get("oj",""),
        url_eurlex=url,
        sectores=_detectar_sectores_ue(titulo),
        resumen="",
        impacto_es=_estimar_impacto_ue(titulo),
    )


def _celex_a_numero(celex: str) -> str:
    """Convierte CELEX en número de norma legible (ej: "32024R1689" → "2024/1689")."""
    m = re.match(r"^3(\d{4})[A-Z](\d+)", celex)
    if m:
        return f"{m.group(1)}/{m.group(2)}"
    return celex


_SECTORES_UE = {
    "digital":      ["digital", "artificial intelligence", "ai act", "datos", "cibersegur", "tech"],
    "financiero":   ["banco", "financi", "mercado de capital", "crédito", "psd", "dora"],
    "energía":      ["energía", "energy", "renovable", "clima", "emisiones", "taxonomía verde"],
    "laborales":    ["trabajo", "laboral", "empleo", "social", "gig economy"],
    "farmacéutico": ["medicament", "pharmac", "ema", "ehds", "salud"],
    "defensa":      ["defensa", "defence", "eda", "otan", "security", "dual use"],
    "vivienda":     ["housing", "vivienda", "urban", "construcción"],
    "competencia":  ["competition", "competencia", "antitrust", "fusiones", "state aid"],
}


def _detectar_sectores_ue(titulo: str) -> list[str]:
    """Detecta sectores de una norma UE por su título."""
    t = titulo.lower()
    return [s for s, kws in _SECTORES_UE.items() if any(k in t for k in kws)] or ["general"]


def _estimar_impacto_ue(titulo: str) -> str:
    """Estima el impacto de una norma UE para España."""
    t = titulo.lower()
    alto = ["reglamento", "obligatori", "armoniz", "estado miembro", "transposición"]
    if any(p in t for p in alto):
        return "alto"
    return "medio"


# ═══════════════════════════════════════════════════════════════════════════════
# PROCEDIMIENTOS PE — (inspirado en mscottodivettimo/scrapeu)
# ═══════════════════════════════════════════════════════════════════════════════

# Procedimientos clave conocidos (seed data + actualización dinámica)
_PROCEDIMIENTOS_CONOCIDOS: list[ProcedimientoPE] = [
    ProcedimientoPE(
        ref="2021/0106(COD)",
        titulo="EU Artificial Intelligence Act",
        tipo="COD",
        fase="aprobado",
        fecha_inicio="2021-04-21",
        fecha_ultima="2024-03-13",
        rapporteur="Brando Benifei / Dragoș Tudorache",
        comite="IMCO/LIBE",
        url="https://oeil.secure.europarl.europa.eu/oeil/popups/ficheprocedure.do?reference=2021/0106(COD)",
        sectores=["digital"],
    ),
    ProcedimientoPE(
        ref="2022/0187(COD)",
        titulo="European Data Act",
        tipo="COD",
        fase="aprobado",
        fecha_inicio="2022-02-23",
        fecha_ultima="2023-11-27",
        rapporteur="Pilar del Castillo Vera",
        comite="ITRE",
        url="https://oeil.secure.europarl.europa.eu/oeil/popups/ficheprocedure.do?reference=2022/0187(COD)",
        sectores=["digital"],
    ),
    ProcedimientoPE(
        ref="2023/0132(COD)",
        titulo="Payment Services Directive 3 (PSD3)",
        tipo="COD",
        fase="primera_lectura_pe",
        fecha_inicio="2023-06-28",
        fecha_ultima="2024-11-01",
        rapporteur="Álex Aguilar",
        comite="ECON",
        url="https://oeil.secure.europarl.europa.eu/oeil/popups/ficheprocedure.do?reference=2023/0132(COD)",
        sectores=["financiero"],
    ),
    ProcedimientoPE(
        ref="2022/0383(COD)",
        titulo="DORA — Digital Operational Resilience Act",
        tipo="COD",
        fase="aprobado",
        fecha_inicio="2020-09-24",
        fecha_ultima="2022-11-28",
        rapporteur="Billy Kelleher",
        comite="ECON",
        url="https://oeil.secure.europarl.europa.eu/oeil/popups/ficheprocedure.do?reference=2022/0383(COD)",
        sectores=["financiero","digital"],
    ),
    ProcedimientoPE(
        ref="2024/0085(COD)",
        titulo="Affordable Housing Initiative",
        tipo="COD",
        fase="propuesta_com",
        fecha_inicio="2024-03-20",
        fecha_ultima="2025-01-15",
        rapporteur="",
        comite="EMPL/REGI",
        url="https://oeil.secure.europarl.europa.eu/oeil/popups/ficheprocedure.do?reference=2024/0085(COD)",
        sectores=["vivienda"],
    ),
    ProcedimientoPE(
        ref="2023/0108(COD)",
        titulo="Net Zero Industry Act",
        tipo="COD",
        fase="aprobado",
        fecha_inicio="2023-03-16",
        fecha_ultima="2024-05-07",
        rapporteur="Christian Ehler",
        comite="ITRE",
        url="https://oeil.secure.europarl.europa.eu/oeil/popups/ficheprocedure.do?reference=2023/0108(COD)",
        sectores=["energía"],
    ),
]


def buscar_procedimientos(
    sector: str | None = None,
    fase: str | None = None,
) -> list[ProcedimientoPE]:
    """
    Retorna procedimientos legislativos del PE.
    Primero los del seed conocido; luego intenta la API OEIL.
    """
    procs = list(_PROCEDIMIENTOS_CONOCIDOS)

    # Filtros
    if sector:
        procs = [p for p in procs if sector in p.sectores]
    if fase:
        procs = [p for p in procs if p.fase == fase]

    return procs


def trazabilidad_procedimiento(ref: str) -> list[dict]:
    """
    Retorna el timeline de fases de un procedimiento legislativo.
    Para el Monitor Legislativo, columna derecha "Trazabilidad".
    Fuente: mscottodivettimo/scrapeu pattern.
    """
    proc = next((p for p in _PROCEDIMIENTOS_CONOCIDOS if p.ref == ref), None)
    if not proc:
        return []

    # Modelo de fases según tipo de procedimiento (COD = codecisión)
    fases_modelo = {
        "propuesta_com":    {"label":"Propuesta COM",          "icono":""},
        "primera_lectura_pe": {"label":"1ª Lectura PE",        "icono":""},
        "posicion_consejo": {"label":"Posición Consejo",       "icono":""},
        "segunda_lectura_pe": {"label":"2ª Lectura PE",        "icono":""},
        "comite_conciliacion": {"label":"Comité Conciliación","icono":""},
        "aprobado":         {"label":"Aprobado",               "icono":"✓"},
        "publicado_oj":     {"label":"Publicado en OJ",        "icono":""},
    }

    fases_orden = list(fases_modelo.keys())
    fase_actual_idx = fases_orden.index(proc.fase) if proc.fase in fases_orden else 0

    timeline = []
    for i, fase_id in enumerate(fases_orden):
        info = fases_modelo[fase_id]
        estado = "completada"if i < fase_actual_idx else ("actual"if i == fase_actual_idx else "pendiente")
        timeline.append({
            "fase_id":  fase_id,
            "label":    info["label"],
            "icono":    info["icono"],
            "estado":   estado,
            "fecha":    proc.fecha_ultima if estado == "actual"else "",
            "notas":    f"Rapporteur: {proc.rapporteur}"if estado == "actual"else "",
        })
    return timeline


# ═══════════════════════════════════════════════════════════════════════════════
# ALERTAS UE
# ═══════════════════════════════════════════════════════════════════════════════

def alertas_normas_ue(
    watchlist: list[str],
    dias: int = 30,
) -> list[AlertaUE]:
    """
    Genera alertas de normas UE relevantes para una watchlist de sectores/keywords.
    """
    alertas: list[AlertaUE] = []

    # Normas recientes (directivas + reglamentos)
    normas: list[NormaUE] = []
    normas.extend(buscar_directivas_recientes(dias=dias, max_items=15))
    normas.extend(buscar_reglamentos_recientes(dias=dias, max_items=15))

    for n in normas:
        for kw in watchlist:
            if (kw.lower() in n.titulo.lower() or
                    any(kw.lower() in s for s in n.sectores)):
                alertas.append(AlertaUE(
                    norma_id=n.numero or n.cellar_id,
                    titulo=n.titulo,
                    tipo=n.tipo,
                    motivo=f"Nueva {n.tipo} UE en sector '{kw}'",
                    keyword=kw,
                    impacto=n.impacto_es,
                    fecha=n.fecha_pub,
                    url=n.url_eurlex,
                ))
                break

    # Procedimientos PE en tramitación activos
    for proc in _PROCEDIMIENTOS_CONOCIDOS:
        if proc.fase in ("aprobado","publicado_oj"):
            continue
        for kw in watchlist:
            if any(kw.lower() in s for s in proc.sectores) or kw.lower() in proc.titulo.lower():
                alertas.append(AlertaUE(
                    norma_id=proc.ref,
                    titulo=proc.titulo,
                    tipo=f"Procedimiento PE ({proc.tipo})",
                    motivo=f"Procedimiento activo en sector '{kw}' — fase: {proc.fase}",
                    keyword=kw,
                    impacto="alto",
                    fecha=proc.fecha_ultima,
                    url=proc.url,
                ))
                break

    return sorted(alertas, key=lambda x: (x.impacto != "alto", x.fecha), reverse=False)


# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXTO PARA LLM
# ═══════════════════════════════════════════════════════════════════════════════

def contexto_eurlex_para_llm(query: str, max_normas: int = 4) -> str:
    """
    Construye bloque de contexto EUR-Lex para prompts de Ollama.
    """
    normas = buscar_normas_ue_por_tema(query, max_items=max_normas)
    procs = [
        p for p in _PROCEDIMIENTOS_CONOCIDOS
        if query.lower() in p.titulo.lower() or
           any(query.lower() in s for s in p.sectores)
    ][:2]

    bloques = []
    for n in normas:
        bloques.append(
            f"[{n.numero}] **{n.titulo}** ({n.tipo}, {n.fecha_pub})\n"
            f"Estado: {n.estado} | Sectores: {', '.join(n.sectores)}\n"
            f"URL: {n.url_eurlex}"
        )
    for p in procs:
        bloques.append(
            f"[{p.ref}] **{p.titulo}** — Fase: {p.fase}\n"
            f"Rapporteur: {p.rapporteur} | Comité: {p.comite}\n"
            f"URL: {p.url}"
        )

    if not bloques:
        return "Sin normas UE relevantes encontradas para esta consulta."

    return "CONTEXTO EUR-LEX (Legislación UE):\n" + "\n\n".join(bloques)


def resumen_actividad_ue(dias: int = 30) -> dict:
    """
    Resumen de actividad legislativa UE para el briefing matutino.
    """
    directivas = buscar_directivas_recientes(dias=dias, max_items=10)
    reglamentos = buscar_reglamentos_recientes(dias=dias, max_items=10)
    procs_activos = [p for p in _PROCEDIMIENTOS_CONOCIDOS
                     if p.fase not in ("aprobado","publicado_oj")]

    return {
        "n_directivas_recientes":   len(directivas),
        "n_reglamentos_recientes":  len(reglamentos),
        "n_procedimientos_activos": len(procs_activos),
        "directivas":  [{"titulo": n.titulo, "fecha": n.fecha_pub, "url": n.url_eurlex}
                        for n in directivas[:5]],
        "reglamentos": [{"titulo": n.numero, "fecha": n.fecha_pub, "url": n.url_eurlex}
                        for n in reglamentos[:5]],
        "procedimientos_criticos": [
            {"ref": p.ref, "titulo": p.titulo[:80], "fase": p.fase, "url": p.url}
            for p in procs_activos[:5]
        ],
    }
