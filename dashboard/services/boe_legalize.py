"""
BOE Legalize — Corpus loader + API wrapper
==========================================
Integra dos fuentes de la capa de ingesta legislativa:

  1. legalize-es-main  (gits amigos)
     183 normas españolas consolidadas en Markdown con frontmatter YAML.
     Usadas como corpus seed para ChromaDB (RAG) y búsqueda directa.
     Cada norma = un documento con metadata estructurada.
     Los diffs entre versiones (commits) se exponen como "cambios normativos".

  2. MCP-BOE-main  (gits amigos)
     API oficial BOE datosabiertos REST:
       - /legislacion-consolidada  — búsqueda full-text de normas
       - /boe/sumario/{fecha}      — sumario diario del BOE
       - /borme/sumario/{fecha}    — BORME (Registro Mercantil)
     El cliente async está wrappeado en síncrono para compatibilidad Streamlit.

Expone una API unificada:
  - buscar_normas(query, max_results) → list[Norma]
  - norma_por_id(boe_id) → Norma | None
  - sumario_boe(fecha) → list[ItemBOE]
  - sumario_borme(fecha) → list[ItemBORME]
  - cambios_recientes(dias) → list[CambioNormativo]
  - normas_para_rag(sector, max) → list[dict]  ← para ChromaDB
  - alertas_boe(watchlist) → list[Alerta]
"""
from __future__ import annotations

import re
import time
import threading
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import Any
import sys

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

GITS = _ROOT / "gits amigos"
_LEGALIZE_ES = GITS / "legalize-es-main"
_LEGALIZE_ES_MD = _LEGALIZE_ES / "es-md"   # Normas Comunidad de Madrid + estatales
_LEGALIZE_ES_NAC = _LEGALIZE_ES / "es"      # Normas nacionales

# ── HTTP cliente síncrono ─────────────────────────────────────────────────────
try:
    import httpx as _httpx
    def _get(url: str, params: dict | None = None, timeout: float = 15.0) -> dict:
        try:
            r = _httpx.get(url, params=params,
                           headers={"Accept":"application/json","User-Agent":"Politeia/2.0"},
                           timeout=timeout, follow_redirects=True)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            return {"error": str(e)}
except ImportError:
    import urllib.request, json as _json
    def _get(url: str, params: dict | None = None, timeout: float = 15.0) -> dict:
        if params:
            from urllib.parse import urlencode
            url = url + "?" + urlencode(params)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Politeia/2.0"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return _json.loads(r.read())
        except Exception as e:
            return {"error": str(e)}

# ── API BOE base ──────────────────────────────────────────────────────────────
_BOE_BASE = "https://www.boe.es/datosabiertos/api"
_BOE_ENDPOINTS = {
    "legislacion": f"{_BOE_BASE}/legislacion-consolidada",
    "boe_sumario": f"{_BOE_BASE}/boe/sumario",
    "borme_sumario": f"{_BOE_BASE}/borme/sumario",
    "auxiliares":   f"{_BOE_BASE}/tablas-auxiliares",
}

# ── Cache interno ─────────────────────────────────────────────────────────────
_LOCK = threading.RLock()
_NORMAS_CACHE: list[dict] = []
_NORMAS_LOADED = False
_CACHE_INDEX: dict[str, int] = {}  # boe_id → índice en _NORMAS_CACHE
_SECTORES_INDEX: dict[str, list[int]] = defaultdict(list)  # sector → [índices]

# ── Mapas de sectores ─────────────────────────────────────────────────────────
_SECTOR_KEYWORDS: dict[str, list[str]] = {
    "fiscal":       ["tribut", "impuest", "hacienda", "fiscal", "irpf", "iva", "societad"],
    "laboral":      ["trabajo", "laboral", "empleo", "despido", "convenio", "sindicat"],
    "financiero":   ["banco", "banca", "financier", "crédito", "mercado de valor", "comisión nacional"],
    "digital":      ["digital", "ia", "inteligencia artificial", "dato", "cibersegur", "telecomunicacion"],
    "energía":      ["energía", "eléctric", "gas", "petróleo", "renovable", "nuclear"],
    "sanidad":      ["sanidad", "salud", "medicament", "farmac", "hospitalari"],
    "educación":    ["educación", "enseñanza", "universit", "formación profesional"],
    "defensa":      ["defensa", "ejército", "fuerzas armadas", "nato", "otan"],
    "europeo":      ["unión europea", "directiva", "reglamento ue", "comisión europea"],
    "vivienda":     ["vivienda", "alquiler", "arrendamient", "inmobiliari", "urbanismo"],
    "constitucional": ["constitucion", "derechos fundamentales", "tribunal constitucion"],
}


# ═══════════════════════════════════════════════════════════════════════════════
# DATACLASSES DE SALIDA
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Norma:
    """Representa una norma del ordenamiento jurídico español."""
    boe_id:        str
    titulo:        str
    rango:         str            # ley | real_decreto | decreto_ley | reglamento | etc.
    fecha_pub:     str
    departamento:  str
    jurisdiccion:  str            # es | es-md | es-ct | ...
    estado:        str            # in_force | derogada | modificada
    sectores:      list[str]
    extracto:      str            # primeros ~500 chars del texto
    texto_completo: str           # texto MD completo
    url_boe:       str
    url_pdf:       str
    fuente:        str            # "legalize" | "api_boe"
    referencias:   list[str] = field(default_factory=list)  # normas que modifica/deroga
    metadata:      dict = field(default_factory=dict)


@dataclass
class ItemBOE:
    """Item del sumario diario del BOE."""
    identificador: str
    titulo:        str
    seccion:       str
    departamento:  str
    fecha:         str
    tipo:          str            # disposicion | anuncio | etc.
    url:           str
    impacto_estimado: str = "bajo"  # bajo | medio | alto


@dataclass
class ItemBORME:
    """Item del BORME (Registro Mercantil)."""
    identificador: str
    tipo:          str            # constitucion | disolucion | modificacion | etc.
    entidad:       str
    fecha:         str
    url:           str


@dataclass
class CambioNormativo:
    """Cambio en una norma (modifica, deroga, nueva)."""
    norma_id:     str
    tipo_cambio:  str    # nueva | modificacion | derogacion
    titulo:       str
    fecha:        str
    descripcion:  str


@dataclass
class Alerta:
    """Alerta generada al detectar norma relevante para un cliente."""
    norma_id:     str
    titulo:       str
    motivo:       str
    keyword:      str
    impacto:      str  # alto | medio | bajo
    fecha:        str
    url:          str


# ═══════════════════════════════════════════════════════════════════════════════
# CARGADOR legalize-es
# ═══════════════════════════════════════════════════════════════════════════════

def _parsear_frontmatter(texto: str) -> tuple[dict, str]:
    """Extrae YAML frontmatter y cuerpo del markdown."""
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", texto, re.DOTALL)
    if not m:
        return {}, texto

    meta: dict[str, Any] = {}
    for line in m.group(1).splitlines():
        if ":"in line:
            k, _, v = line.partition(":")
            k = k.strip()
            v = v.strip()
            # Intentar parsear listas simples
            if v.startswith("[") and v.endswith("]"):
                v = [x.strip().strip('"').strip("'") for x in v[1:-1].split(",") if x.strip()]
            elif v.startswith('"') and v.endswith('"'):
                v = v[1:-1]
            meta[k] = v
    return meta, m.group(2).strip()


def _detectar_sectores(titulo: str, texto: str) -> list[str]:
    """Detecta los sectores normativos de una norma por palabras clave."""
    combined = (titulo + " " + texto[:2000]).lower()
    return [
        sector for sector, kws in _SECTOR_KEYWORDS.items()
        if any(kw in combined for kw in kws)
    ] or ["general"]


def _cargar_directorio(path: Path) -> list[dict]:
    """Carga todas las normas .md de un directorio."""
    normas = []
    if not path.exists():
        return normas
    for md_file in sorted(path.glob("*.md")):
        try:
            texto = md_file.read_text(encoding="utf-8", errors="replace")
            meta, cuerpo = _parsear_frontmatter(texto)
            if not meta.get("identifier") and not meta.get("title"):
                continue
            boe_id = meta.get("identifier", md_file.stem)
            titulo  = meta.get("title", boe_id)
            normas.append({
                "boe_id":       boe_id,
                "titulo":       titulo,
                "rango":        meta.get("rank", "desconocido"),
                "fecha_pub":    meta.get("publication_date", ""),
                "departamento": meta.get("department", ""),
                "jurisdiccion": meta.get("jurisdiction", "es"),
                "estado":       meta.get("status", "unknown"),
                "sectores":     _detectar_sectores(titulo, cuerpo),
                "extracto":     cuerpo[:600].replace("\n"," "),
                "texto_completo": cuerpo,
                "url_boe":      meta.get("url_html_consolidada",
                                         meta.get("source", "")),
                "url_pdf":      meta.get("pdf_url", meta.get("url_pdf", "")),
                "fuente":       "legalize",
                "referencias":  _parsear_referencias(meta.get("references_previous","")),
                "metadata":     meta,
            })
        except Exception:
            pass
    return normas


def _parsear_referencias(refs_str: str) -> list[str]:
    """Extrae IDs de normas referenciadas (DEROGA, MODIFICA, etc.)."""
    if not refs_str:
        return []
    return re.findall(r"BOE-[A-Z]-\d{4}-\d+", str(refs_str))


def _cargar_corpus() -> None:
    """Carga todas las normas de legalize-es en caché."""
    global _NORMAS_CACHE, _NORMAS_LOADED
    with _LOCK:
        if _NORMAS_LOADED:
            return
        normas: list[dict] = []
        for directorio in [_LEGALIZE_ES_NAC, _LEGALIZE_ES_MD]:
            normas.extend(_cargar_directorio(directorio))

        _NORMAS_CACHE = normas
        _NORMAS_LOADED = True
        # Construir índices
        for i, n in enumerate(normas):
            _CACHE_INDEX[n["boe_id"]] = i
            for s in n.get("sectores", []):
                _SECTORES_INDEX[s].append(i)


def _ensure_loaded() -> None:
    if not _NORMAS_LOADED:
        _cargar_corpus()


# ═══════════════════════════════════════════════════════════════════════════════
# API PÚBLICA — CORPUS LOCAL (legalize-es)
# ═══════════════════════════════════════════════════════════════════════════════

def total_normas() -> int:
    """Número total de normas en el corpus local."""
    _ensure_loaded()
    return len(_NORMAS_CACHE)


def normas_para_rag(sector: str | None = None, max_normas: int = 50) -> list[dict]:
    """
    Retorna normas formateadas para ingesta en ChromaDB.
    Cada item tiene: id, texto, metadata.
    """
    _ensure_loaded()
    if sector and sector in _SECTORES_INDEX:
        indices = _SECTORES_INDEX[sector][:max_normas]
        normas = [_NORMAS_CACHE[i] for i in indices]
    else:
        normas = _NORMAS_CACHE[:max_normas]

    return [
        {
            "id": n["boe_id"],
            "texto": f"{n['titulo']}\n\n{n['extracto']}",
            "metadata": {
                "boe_id":       n["boe_id"],
                "titulo":       n["titulo"],
                "rango":        n["rango"],
                "fecha":        n["fecha_pub"],
                "departamento": n["departamento"],
                "jurisdiccion": n["jurisdiccion"],
                "estado":       n["estado"],
                "sectores":     ",".join(n["sectores"]),
                "fuente":       "legalize_es",
                "url":          n["url_boe"],
            },
        }
        for n in normas
    ]


def buscar_normas_local(
    query: str,
    sector: str | None = None,
    rango: str | None = None,
    max_results: int = 20,
) -> list[Norma]:
    """
    Búsqueda full-text local sobre el corpus legalize-es.
    Más rápido que la API del BOE para iteraciones del dashboard.
    """
    _ensure_loaded()
    q = query.lower()
    resultados = []

    pool = (
        [_NORMAS_CACHE[i] for i in _SECTORES_INDEX.get(sector, [])]
        if sector else _NORMAS_CACHE
    )

    for n in pool:
        if rango and n["rango"] != rango:
            continue
        score = 0
        if q in n["titulo"].lower():
            score += 3
        if q in n["extracto"].lower():
            score += 2
        if any(q in s for s in n["sectores"]):
            score += 1
        if score > 0:
            resultados.append((score, n))

    resultados.sort(key=lambda x: -x[0])
    return [
        Norma(**{k: v for k, v in n.items()})
        for _, n in resultados[:max_results]
    ]


def norma_local_por_id(boe_id: str) -> Norma | None:
    """Retorna una norma del corpus local por su ID BOE."""
    _ensure_loaded()
    idx = _CACHE_INDEX.get(boe_id)
    if idx is None:
        return None
    n = _NORMAS_CACHE[idx]
    return Norma(**{k: v for k, v in n.items()})


def cambios_recientes_local(dias: int = 7) -> list[CambioNormativo]:
    """
    Detecta normas recientes en el corpus (publicadas en los últimos N días).
    Proxy de los commits nuevos en legalize-es.
    """
    _ensure_loaded()
    fecha_limite = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%d")
    cambios = []
    for n in _NORMAS_CACHE:
        fecha = n.get("fecha_pub", "")
        if fecha >= fecha_limite:
            tipo = "nueva"
            if n.get("referencias"):
                tipo = "modificacion"if any("MODIFICA"in str(n["metadata"].get("references_previous","")) for _ in [1]) else "nueva"
            cambios.append(CambioNormativo(
                norma_id=n["boe_id"],
                tipo_cambio=tipo,
                titulo=n["titulo"],
                fecha=fecha,
                descripcion=f"{n['rango'].upper()} publicada el {fecha}. Sectores: {', '.join(n['sectores'])}",
            ))
    return sorted(cambios, key=lambda x: x.fecha, reverse=True)


def stats_corpus() -> dict:
    """Estadísticas del corpus legalize-es."""
    _ensure_loaded()
    rangos   = {}
    sectores = defaultdict(int)
    estados  = {}
    for n in _NORMAS_CACHE:
        rangos[n["rango"]] = rangos.get(n["rango"],0) + 1
        estados[n["estado"]] = estados.get(n["estado"],0) + 1
        for s in n["sectores"]:
            sectores[s] += 1
    return {
        "total":          len(_NORMAS_CACHE),
        "por_rango":      dict(sorted(rangos.items(), key=lambda x:-x[1])[:10]),
        "por_sector":     dict(sorted(sectores.items(), key=lambda x:-x[1])[:10]),
        "por_estado":     estados,
        "fecha_carga":    datetime.now().isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# API PÚBLICA — BOE REST (API oficial datosabiertos)
# ═══════════════════════════════════════════════════════════════════════════════

def buscar_legislacion_api(
    query: str = "",
    titulo: str = "",
    departamento_cod: str = "",
    rango_cod: str = "",
    max_rows: int = 10,
) -> list[dict]:
    """
    Búsqueda en la API oficial de legislación consolidada del BOE.
    Fuente: MCP-BOE-main/src/mcp_boe/tools/legislation.py (adaptado a síncrono)
    """
    params = {"_page": 0, "_pageSize": max_rows}
    if query:
        params["q"] = query
    if titulo:
        params["titulo"] = titulo
    if departamento_cod:
        params["departamento"] = departamento_cod
    if rango_cod:
        params["rangoNormativa"] = rango_cod

    resp = _get(_BOE_ENDPOINTS["legislacion"], params=params)
    if "error"in resp:
        return []

    items = resp.get("data", {}).get("items", [])
    resultados = []
    for item in items:
        resultados.append({
            "boe_id":      item.get("id", ""),
            "titulo":      item.get("titulo", ""),
            "rango":       item.get("rangoNormativa", {}).get("nombre", ""),
            "fecha_pub":   item.get("fechaPublicacion", ""),
            "departamento":item.get("departamento", {}).get("nombre", ""),
            "url":         f"https://www.boe.es/buscar/act.php?id={item.get('id','')}",
            "fuente":      "api_boe",
        })
    return resultados


def sumario_boe(fecha: str | None = None) -> list[ItemBOE]:
    """
    Obtiene el sumario del BOE para una fecha dada (YYYYMMDD).
    Si no se especifica fecha, usa la última disponible.
    Fuente: MCP-BOE-main/src/mcp_boe/tools/summaries.py
    """
    if not fecha:
        fecha = (date.today() - timedelta(days=1)).strftime("%Y%m%d")

    url = f"{_BOE_ENDPOINTS['boe_sumario']}/{fecha}"
    resp = _get(url)
    if "error"in resp:
        return []

    items: list[ItemBOE] = []
    try:
        sumario = resp.get("data", {}).get("sumario", {})
        secciones = sumario.get("diario", {}).get("secciones", {}).get("seccion", [])
        if isinstance(secciones, dict):
            secciones = [secciones]

        for sec in secciones:
            sec_id = sec.get("@id", "")
            sec_nombre = sec.get("@nombre", "")
            depts = sec.get("departamento", [])
            if isinstance(depts, dict):
                depts = [depts]
            for dept in depts:
                dept_nombre = dept.get("@nombre", "")
                epis = dept.get("epigrafe", [])
                if isinstance(epis, dict):
                    epis = [epis]
                for epi in epis:
                    items_raw = epi.get("item", [])
                    if isinstance(items_raw, dict):
                        items_raw = [items_raw]
                    for it in items_raw:
                        it_id = it.get("@id", "")
                        it_titulo = it.get("titulo", "")
                        impacto = _estimar_impacto(it_titulo)
                        items.append(ItemBOE(
                            identificador=it_id,
                            titulo=it_titulo,
                            seccion=sec_nombre,
                            departamento=dept_nombre,
                            fecha=f"{fecha[:4]}-{fecha[4:6]}-{fecha[6:]}",
                            tipo="disposicion"if sec_id in ("1","2","3") else "anuncio",
                            url=f"https://www.boe.es/boe/dias/{fecha[:4]}/{fecha[4:6]}/{fecha[6:]}/#{it_id}",
                            impacto_estimado=impacto,
                        ))
    except Exception:
        pass
    return items


def sumario_borme(fecha: str | None = None) -> list[ItemBORME]:
    """
    Obtiene el sumario del BORME para una fecha dada.
    Fuente: rOpenSpain/BOE (adaptado)
    """
    if not fecha:
        fecha = (date.today() - timedelta(days=1)).strftime("%Y%m%d")

    url = f"{_BOE_ENDPOINTS['borme_sumario']}/{fecha}"
    resp = _get(url)
    if "error"in resp:
        return []

    items: list[ItemBORME] = []
    try:
        borme = resp.get("data", {}).get("sumario", {})
        secciones = borme.get("diario", {}).get("secciones", {}).get("seccion", [])
        if isinstance(secciones, dict):
            secciones = [secciones]
        for sec in secciones:
            provs = sec.get("provincia", [])
            if isinstance(provs, dict):
                provs = [provs]
            for prov in provs:
                registros = prov.get("registro", [])
                if isinstance(registros, dict):
                    registros = [registros]
                for reg in registros:
                    actos = reg.get("acto", [])
                    if isinstance(actos, dict):
                        actos = [actos]
                    for acto in actos:
                        items.append(ItemBORME(
                            identificador=acto.get("@id", ""),
                            tipo=acto.get("@tipo", ""),
                            entidad=acto.get("nombre", ""),
                            fecha=f"{fecha[:4]}-{fecha[4:6]}-{fecha[6:]}",
                            url=f"https://www.boe.es/borme/dias/{fecha[:4]}/{fecha[4:6]}/{fecha[6:]}",
                        ))
    except Exception:
        pass
    return items


def _estimar_impacto(titulo: str) -> str:
    """Estima el impacto de un item del BOE basándose en el título."""
    titulo_lower = titulo.lower()
    alto = ["ley orgánica", "ley ", "real decreto-ley", "estado de alarma",
            "presupuesto", "reforma", "modificación", "sistema financiero"]
    medio = ["real decreto", "orden ministerial", "reglamento", "decreto",
             "instrucción", "circular", "resolución"]
    if any(p in titulo_lower for p in alto):
        return "alto"
    if any(p in titulo_lower for p in medio):
        return "medio"
    return "bajo"


def alertas_boe(
    watchlist: list[str],
    fecha: str | None = None,
    incluir_local: bool = True,
) -> list[Alerta]:
    """
    Genera alertas para una watchlist de keywords (sectores/temas del cliente).
    Combina corpus local (legalize-es) + API BOE del día.

    Args:
        watchlist: Lista de keywords o temas: ["digital", "banca", "IA", "renovable"]
        fecha: Fecha YYYYMMDD del sumario (default: ayer)
        incluir_local: Si buscar también en corpus legalize-es
    """
    alertas: list[Alerta] = []

    # 1) Sumario BOE del día
    items_boe = sumario_boe(fecha)
    for item in items_boe:
        for kw in watchlist:
            if kw.lower() in item.titulo.lower():
                alertas.append(Alerta(
                    norma_id=item.identificador,
                    titulo=item.titulo,
                    motivo=f"Keyword '{kw}'detectada en sumario BOE",
                    keyword=kw,
                    impacto=item.impacto_estimado,
                    fecha=item.fecha,
                    url=item.url,
                ))
                break

    # 2) Corpus local (últimos 30 días)
    if incluir_local:
        recientes = cambios_recientes_local(dias=30)
        for cambio in recientes:
            n = norma_local_por_id(cambio.norma_id)
            if not n:
                continue
            for kw in watchlist:
                if (kw.lower() in n.titulo.lower() or
                        any(kw.lower() in s for s in n.sectores)):
                    alertas.append(Alerta(
                        norma_id=cambio.norma_id,
                        titulo=n.titulo,
                        motivo=f"Norma reciente en sector '{kw}' (corpus legalize-es)",
                        keyword=kw,
                        impacto="alto"if n.rango in ("ley","ley orgánica","real decreto-ley") else "medio",
                        fecha=cambio.fecha,
                        url=n.url_boe,
                    ))
                    break

    # Deduplicar y ordenar por impacto
    seen = set()
    unique = []
    for a in alertas:
        key = (a.norma_id, a.keyword)
        if key not in seen:
            seen.add(key)
            unique.append(a)

    orden_impacto = {"alto": 0, "medio": 1, "bajo": 2}
    return sorted(unique, key=lambda x: orden_impacto.get(x.impacto, 2))


# ═══════════════════════════════════════════════════════════════════════════════
# INGESTA EN CHROMADB (si disponible)
# ═══════════════════════════════════════════════════════════════════════════════

def ingestar_en_chromadb(
    collection_name: str = "normas_legalize_es",
    sector: str | None = None,
    max_normas: int = 100,
    batch_size: int = 20,
) -> int:
    """
    Indexa normas de legalize-es en ChromaDB para búsqueda vectorial RAG.
    Requiere que ChromaDB esté configurado (dashboard/services/brain_service.py).
    Retorna el número de normas indexadas.
    """
    try:
        from dashboard.services.brain_service import _get_chroma_collection
        col = _get_chroma_collection(collection_name)
    except Exception:
        return 0

    docs = normas_para_rag(sector=sector, max_normas=max_normas)
    if not docs:
        return 0

    n_indexed = 0
    for i in range(0, len(docs), batch_size):
        batch = docs[i:i+batch_size]
        try:
            col.upsert(
                ids=[d["id"] for d in batch],
                documents=[d["texto"] for d in batch],
                metadatas=[d["metadata"] for d in batch],
            )
            n_indexed += len(batch)
        except Exception:
            pass

    return n_indexed


# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXTO PARA LLM (tool use / RAG context)
# ═══════════════════════════════════════════════════════════════════════════════

def contexto_normativo_para_llm(
    query: str,
    max_normas: int = 5,
) -> str:
    """
    Construye un bloque de contexto normativo para incluir en prompts de Ollama.
    Combina búsqueda local (rápida) + API BOE (actualizada).
    """
    # Búsqueda local
    normas_loc = buscar_normas_local(query, max_results=max_normas)

    # Búsqueda API (solo si hay conexión)
    normas_api = buscar_legislacion_api(query=query, max_rows=3)

    bloques = []
    for n in normas_loc[:3]:
        bloques.append(
            f"[{n.boe_id}] **{n.titulo}** ({n.rango}, {n.fecha_pub})\n"
            f"Dept: {n.departamento} | Estado: {n.estado}\n"
            f"{n.extracto[:300]}…"
        )
    for n in normas_api[:2]:
        if not any(n["boe_id"] in b for b in bloques):
            bloques.append(
                f"[{n['boe_id']}] **{n['titulo']}** ({n['rango']}, {n['fecha_pub']})\n"
                f"Dept: {n['departamento']} | Fuente: API BOE"
            )

    if not bloques:
        return "Sin normas relevantes encontradas en el corpus legislativo."

    return (
        f"CONTEXTO NORMATIVO ESPAÑOL (corpus legalize-es + API BOE):\n"
        + "\n\n".join(bloques)
    )
