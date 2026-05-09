"""
Congreso Votaciones — Scraper de datos parlamentarios
======================================================
Wrapper del pipeline de congreso-scrapper-main (gits amigos) adaptado
a Python síncrono para el dashboard. Consume la API abierta del Congreso:

  https://www.congreso.es/opendata/votaciones
  https://datos.congreso.es/opendata/

Datos que extrae:
  - Votaciones nominales por fecha y legislatura
  - Diputados con partido, grupo parlamentario, circunscripción
  - Iniciativas parlamentarias en tramitación (PL, PPL, PNL, etc.)
  - Intervenciones y actividad por diputado

Compatibilidad: congreso-scrapper-main usa PostgreSQL + zip downloads.
Esta versión usa la misma lógica de descarga pero almacena en JSON
(sin requerir Postgres) y usa la API REST cuando está disponible.

Fuentes inspiradoras en gits amigos:
  • congreso-scrapper-main  — lógica de descarga zip + modelo datos
  • congreso-scrapper-main 2 — variante alternativa
  • everypolitician-data-master — datos Popolo JSON normalizados
  • MiCongreso-gh-pages — modelo de diputados + escaños
"""
from __future__ import annotations

import json
import re
import threading
import time
import zipfile
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date
from io import BytesIO
from pathlib import Path
from typing import Any
import sys

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# HTTP cliente
try:
    import httpx as _httpx
    def _get_bytes(url: str, timeout: float = 30.0) -> bytes | None:
        try:
            r = _httpx.get(url, timeout=timeout,
                           headers={"User-Agent": "Politeia/2.0 (research; contact@politeia.es)"},
                           follow_redirects=True)
            r.raise_for_status()
            return r.content
        except Exception:
            return None

    def _get_json(url: str, params: dict | None = None, timeout: float = 20.0) -> dict:
        try:
            r = _httpx.get(url, params=params, timeout=timeout,
                           headers={"Accept":"application/json","User-Agent":"Politeia/2.0"},
                           follow_redirects=True)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            return {"error": str(e)}
except ImportError:
    import urllib.request
    def _get_bytes(url: str, timeout: float = 30.0) -> bytes | None:
        try:
            req = urllib.request.Request(url, headers={"User-Agent":"Politeia/2.0"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception:
            return None
    def _get_json(url: str, params: dict | None = None, timeout: float = 20.0) -> dict:
        if params:
            from urllib.parse import urlencode
            url = url + "?" + urlencode(params)
        try:
            req = urllib.request.Request(url, headers={"User-Agent":"Politeia/2.0","Accept":"application/json"})
            import json as _j
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return _j.loads(r.read())
        except Exception as e:
            return {"error": str(e)}

# ── Constantes ────────────────────────────────────────────────────────────────
_CONGRESO_BASE  = "https://www.congreso.es/opendata"
_DATOS_BASE     = "https://datos.congreso.es/opendata"
_LEGIS_ACTUAL   = "XV"

_STORE_PATH = _ROOT / "dashboard" / "data" / "congreso_store.json"
_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)

_LOCK = threading.RLock()
_SCRAPE_LOG: list[dict] = []

# URLs para la legislatura actual (siguiendo modelo congreso-scrapper-main)
_URL_VOTACIONES = (
    "https://www.congreso.es/opendata/votaciones?p_p_id=votaciones"
    "&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view"
    "&targetLegislatura={LEG}&targetDate={DD}/{MM}/{YY}"
)
_URL_INICIATIVAS = "https://datos.congreso.es/opendata/iniciativas"
_URL_DIPUTADOS   = "https://www.congreso.es/en/web/congreso/diputados/listado"


# ═══════════════════════════════════════════════════════════════════════════════
# DATACLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Diputado:
    id:           str
    nombre:       str
    partido:      str
    grupo:        str
    circunscripcion: str
    comunidad:    str
    genero:       str    = ""
    cargo:        str    = ""
    foto_url:     str    = ""
    activo:       bool   = True
    legislaturas: list[str] = field(default_factory=list)


@dataclass
class Votacion:
    id:            str
    fecha:         str
    asunto:        str
    tipo:          str     # definitiva | ordinaria | procedimiento
    resultado:     str     # aprobado | rechazado | retirado
    si:            int
    no:            int
    abstenciones:  int
    ausentes:      int
    legislatura:   str
    votos_diputados: dict[str, str] = field(default_factory=dict)  # diputado_id → Si/No/Abs


@dataclass
class Iniciativa:
    id:              str
    tipo:            str   # PL | PPL | PNL | MOCI | INTER | PREG | RDL
    titulo:          str
    autor:           str
    grupo_parlamentario: str
    fecha_presentacion: str
    estado:          str   # en_tramite | aprobado | rechazado | retirado | caducado
    temas:           list[str]
    fase_actual:     str
    url:             str


# ═══════════════════════════════════════════════════════════════════════════════
# PERSISTENCIA JSON STORE
# ═══════════════════════════════════════════════════════════════════════════════

def _load_store() -> dict:
    with _LOCK:
        if _STORE_PATH.exists():
            try:
                return json.loads(_STORE_PATH.read_text(encoding="utf-8"))
            except Exception:
                pass
        return {
            "diputados": {},
            "votaciones": [],
            "iniciativas": [],
            "meta": {
                "version": "1.0",
                "ultima_actualizacion": "",
                "legislatura": _LEGIS_ACTUAL,
                "n_diputados": 0,
                "n_votaciones": 0,
                "n_iniciativas": 0,
            }
        }


def _save_store(store: dict) -> None:
    with _LOCK:
        store["meta"]["ultima_actualizacion"] = datetime.now().isoformat()
        store["meta"]["n_diputados"]  = len(store.get("diputados", {}))
        store["meta"]["n_votaciones"] = len(store.get("votaciones", []))
        store["meta"]["n_iniciativas"]= len(store.get("iniciativas", []))
        tmp = _STORE_PATH.with_suffix(".tmp")
        tmp.write_text(json.dumps(store, ensure_ascii=False, indent=2, default=str),
                       encoding="utf-8")
        tmp.replace(_STORE_PATH)


def _log(tipo: str, ok: bool, info: str = "") -> None:
    _SCRAPE_LOG.append({"tipo": tipo, "ok": ok, "info": info[:200],
                        "ts": datetime.now().strftime("%H:%M:%S")})
    if len(_SCRAPE_LOG) > 100:
        _SCRAPE_LOG.pop(0)


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPER — DIPUTADOS
# ═══════════════════════════════════════════════════════════════════════════════

def scrape_diputados(legislatura: str = _LEGIS_ACTUAL) -> list[Diputado]:
    """
    Descarga el listado de diputados de la legislatura actual.
    Fuente: API de datos.congreso.es + everypolitician-data-master (fallback).
    """
    # Intentar API directa
    url = f"https://datos.congreso.es/opendata/legislaturas/{legislatura}/diputados"
    resp = _get_json(url, timeout=20.0)
    if "error"not in resp:
        return _parsear_diputados_api(resp, legislatura)

    # Fallback: everypolitician local
    return _cargar_diputados_everypolitician(legislatura)


def _parsear_diputados_api(resp: dict, legislatura: str) -> list[Diputado]:
    """Parsea la respuesta de la API de diputados."""
    diputados = []
    for item in resp.get("data", {}).get("items", []):
        diputados.append(Diputado(
            id=item.get("id", ""),
            nombre=item.get("nombre", "") + " " + item.get("apellidos", ""),
            partido=item.get("formacion_politica", {}).get("denominacion", ""),
            grupo=item.get("grupo_parlamentario", {}).get("denominacion", ""),
            circunscripcion=item.get("circunscripcion", {}).get("denominacion", ""),
            comunidad=item.get("comunidad_autonoma", {}).get("denominacion", ""),
            genero=item.get("genero", ""),
            cargo=item.get("cargo", ""),
            foto_url=f"https://www.congreso.es/img/{item.get('id','')}.jpg",
            activo=item.get("activo", True),
            legislaturas=[legislatura],
        ))
    _log("diputados_api", True, f"{len(diputados)} diputados")
    return diputados


def _cargar_diputados_everypolitician(legislatura: str) -> list[Diputado]:
    """
    Fallback: Carga diputados desde el corpus local everypolitician-data-master.
    """
    GITS = _ROOT / "gits amigos"
    ep_path = GITS / "everypolitician-data-master"

    # Buscar datos de España
    spain_file = None
    for pattern in [
        "data/Spain/Congress/ep-popolo-v1.0.json",
        "data/Spain/*/ep-popolo-v1.0.json",
    ]:
        matches = list(ep_path.glob(pattern))
        if matches:
            spain_file = matches[0]
            break

    if not spain_file or not spain_file.exists():
        _log("diputados_everypolitician", False, "archivo no encontrado")
        return []

    try:
        data = json.loads(spain_file.read_text(encoding="utf-8"))
        personas = {p["id"]: p for p in data.get("persons", [])}
        memberships = data.get("memberships", [])
        organizations = {o["id"]: o for o in data.get("organizations", [])}

        diputados = []
        for m in memberships:
            p = personas.get(m.get("person_id",""))
            org = organizations.get(m.get("organization_id",""))
            if not p:
                continue
            nombre = p.get("name","")
            partido = ""
            # Buscar partido en afiliaciones
            for aff in p.get("memberships",[]) if "memberships"in p else []:
                o = organizations.get(aff.get("organization_id",""))
                if o and o.get("classification") == "party":
                    partido = o.get("name","")
                    break

            diputados.append(Diputado(
                id=p.get("id",""),
                nombre=nombre,
                partido=partido,
                grupo=org.get("name","") if org else "",
                circunscripcion=m.get("area_id",""),
                comunidad="",
                genero=p.get("gender",""),
                legislaturas=[legislatura],
            ))

        _log("diputados_everypolitician", True, f"{len(diputados)} diputados")
        return diputados
    except Exception as e:
        _log("diputados_everypolitician", False, str(e))
        return []


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPER — VOTACIONES
# ═══════════════════════════════════════════════════════════════════════════════

def scrape_votaciones_dia(
    fecha: date | None = None,
    legislatura: str = _LEGIS_ACTUAL,
) -> list[Votacion]:
    """
    Descarga votaciones del Congreso para un día dado.
    Sigue el modelo de congreso-scrapper-main (zip → JSON).
    """
    if fecha is None:
        fecha = date.today() - timedelta(days=1)

    url = _URL_VOTACIONES.format(
        LEG=legislatura,
        DD=fecha.strftime("%d"),
        MM=fecha.strftime("%m"),
        YY=fecha.strftime("%Y"),
    )

    # Buscar enlace al zip
    raw = _get_bytes(url, timeout=20.0)
    if not raw:
        _log("votaciones_zip", False, f"sin respuesta para {fecha}")
        return []

    try:
        zip_url = _extraer_enlace_zip(raw.decode("utf-8","replace"), url)
        if not zip_url:
            _log("votaciones_zip", False, f"sin zip en {fecha}")
            return []

        zip_data = _get_bytes(zip_url, timeout=30.0)
        if not zip_data:
            return []

        return _parsear_votaciones_zip(zip_data, legislatura)
    except Exception as e:
        _log("votaciones", False, str(e))
        return []


def _extraer_enlace_zip(html: str, base_url: str) -> str | None:
    """Extrae el enlace al archivo ZIP de votaciones del HTML."""
    m = re.search(r'href="([^"]*votaciones[^"]*\.zip[^"]*)"', html, re.IGNORECASE)
    if m:
        href = m.group(1)
        if not href.startswith("http"):
            from urllib.parse import urljoin
            href = urljoin(base_url, href)
        return href
    return None


def _parsear_votaciones_zip(zip_data: bytes, legislatura: str) -> list[Votacion]:
    """Parsea un ZIP de votaciones del Congreso."""
    votaciones = []
    try:
        with zipfile.ZipFile(BytesIO(zip_data)) as zf:
            for nombre in zf.namelist():
                if not nombre.endswith(".json"):
                    continue
                try:
                    data = json.loads(zf.read(nombre))
                    v = _parsear_votacion_json(data, legislatura)
                    if v:
                        votaciones.append(v)
                except Exception:
                    pass
    except Exception as e:
        _log("votaciones_zip_parse", False, str(e))
    return votaciones


def _parsear_votacion_json(data: dict, legislatura: str) -> Votacion | None:
    """Parsea el JSON de una votación individual."""
    try:
        # Extraer conteos de votos
        grupos = data.get("grupos", [])
        si = no = abs_ = aus = 0
        votos_d: dict[str, str] = {}
        for g in grupos:
            for diputado in g.get("diputados", []):
                voto = diputado.get("voto", "Ausente")
                did  = str(diputado.get("id", ""))
                votos_d[did] = voto
                if voto == "Sí":
                    si += 1
                elif voto == "No":
                    no += 1
                elif voto in ("Abstención","Abs"):
                    abs_ += 1
                else:
                    aus += 1

        resultado = "aprobado"if si > no else "rechazado"
        return Votacion(
            id=str(data.get("id", "")),
            fecha=data.get("fecha", ""),
            asunto=data.get("asunto", "")[:200],
            tipo=data.get("tipo", "ordinaria"),
            resultado=resultado,
            si=si, no=no, abstenciones=abs_, ausentes=aus,
            legislatura=legislatura,
            votos_diputados=votos_d,
        )
    except Exception:
        return None


def scrape_votaciones_rango(
    fecha_inicio: date,
    fecha_fin: date | None = None,
    legislatura: str = _LEGIS_ACTUAL,
) -> list[Votacion]:
    """Descarga votaciones para un rango de fechas."""
    if fecha_fin is None:
        fecha_fin = date.today() - timedelta(days=1)
    votaciones = []
    d = fecha_inicio
    while d <= fecha_fin:
        vots = scrape_votaciones_dia(d, legislatura)
        votaciones.extend(vots)
        d += timedelta(days=1)
        time.sleep(0.5)  # Rate limit
    return votaciones


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPER — INICIATIVAS
# ═══════════════════════════════════════════════════════════════════════════════

def scrape_iniciativas(
    tipo: str | None = None,
    max_items: int = 50,
    legislatura: str = _LEGIS_ACTUAL,
) -> list[Iniciativa]:
    """
    Descarga iniciativas parlamentarias en tramitación.
    Fuente: API datos.congreso.es/opendata/iniciativas
    """
    params = {
        "legislatura": legislatura,
        "page": 0,
        "pageSize": min(max_items, 100),
    }
    if tipo:
        params["tipo"] = tipo

    resp = _get_json(_URL_INICIATIVAS, params=params, timeout=20.0)
    if "error"in resp:
        _log("iniciativas_api", False, resp["error"])
        return _generar_iniciativas_muestra()

    iniciativas = []
    for item in resp.get("data", {}).get("items", [])[:max_items]:
        iniciativas.append(Iniciativa(
            id=item.get("id",""),
            tipo=item.get("tipo",""),
            titulo=item.get("titulo","")[:200],
            autor=item.get("autor",""),
            grupo_parlamentario=item.get("grupo_parlamentario",""),
            fecha_presentacion=item.get("fecha_presentacion",""),
            estado=item.get("estado","en_tramite"),
            temas=item.get("descriptores",[]) if isinstance(item.get("descriptores"),list) else [],
            fase_actual=item.get("fase",""),
            url=f"https://www.congreso.es/web/guest/tramitacion?id={item.get('id','')}",
        ))

    _log("iniciativas_api", True, f"{len(iniciativas)} iniciativas")
    return iniciativas


def _generar_iniciativas_muestra() -> list[Iniciativa]:
    """Fallback con iniciativas de muestra cuando la API no responde."""
    return [
        Iniciativa(
            id="PPL-XV-001", tipo="PPL",
            titulo="Proposición de Ley de regulación de la inteligencia artificial en el sector público",
            autor="Grupo Parlamentario PSOE",
            grupo_parlamentario="PSOE",
            fecha_presentacion="2025-10-15",
            estado="en_tramite",
            temas=["inteligencia artificial","administración pública","digital"],
            fase_actual="Comisión",
            url="https://www.congreso.es",
        ),
        Iniciativa(
            id="PL-XV-002", tipo="PL",
            titulo="Proyecto de Ley de vivienda asequible y acceso a la propiedad",
            autor="Gobierno de España",
            grupo_parlamentario="Gobierno",
            fecha_presentacion="2025-11-20",
            estado="en_tramite",
            temas=["vivienda","alquiler","urbanismo"],
            fase_actual="Pleno",
            url="https://www.congreso.es",
        ),
        Iniciativa(
            id="RDL-XV-003", tipo="RDL",
            titulo="Real Decreto-ley de medidas de emergencia energética",
            autor="Consejo de Ministros",
            grupo_parlamentario="Gobierno",
            fecha_presentacion="2026-01-10",
            estado="en_tramite",
            temas=["energía","crisis","fiscal"],
            fase_actual="Convalidación",
            url="https://www.congreso.es",
        ),
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# ANÁLISIS — POSICIONES Y DISTANCIAS IDEOLÓGICAS
# ═══════════════════════════════════════════════════════════════════════════════

def calcular_cohesion_partido(
    votaciones: list[Votacion],
    partido: str,
    diputados: list[Diputado],
) -> float:
    """
    Calcula la cohesión de voto de un partido (0-1).
    1 = disciplina perfecta, 0 = total desacuerdo interno.
    """
    if not votaciones or not diputados:
        return 0.0

    dip_ids = {d.id for d in diputados if d.partido == partido}
    if not dip_ids:
        return 0.0

    total = 0
    coherentes = 0
    for v in votaciones:
        votos_partido = [
            v.votos_diputados.get(did) for did in dip_ids
            if did in v.votos_diputados
        ]
        votos_partido = [x for x in votos_partido if x not in (None, "Ausente")]
        if not votos_partido:
            continue
        mayoria = max(set(votos_partido), key=votos_partido.count)
        total += len(votos_partido)
        coherentes += votos_partido.count(mayoria)

    return round(coherentes / total, 3) if total > 0 else 0.0


def coincidencias_entre_partidos(
    votaciones: list[Votacion],
    partido_a: str,
    partido_b: str,
    diputados: list[Diputado],
) -> float:
    """
    Calcula el % de coincidencia de voto entre dos partidos.
    Útil para detectar alianzas reales más allá de las declaradas.
    """
    dip_a = {d.id for d in diputados if d.partido == partido_a}
    dip_b = {d.id for d in diputados if d.partido == partido_b}
    if not dip_a or not dip_b:
        return 0.0

    total = coincide = 0
    for v in votaciones:
        # Voto mayoritario de cada partido
        va = [v.votos_diputados.get(d) for d in dip_a if d in v.votos_diputados]
        vb = [v.votos_diputados.get(d) for d in dip_b if d in v.votos_diputados]
        va = [x for x in va if x not in (None,"Ausente")]
        vb = [x for x in vb if x not in (None,"Ausente")]
        if not va or not vb:
            continue
        may_a = max(set(va), key=va.count)
        may_b = max(set(vb), key=vb.count)
        total += 1
        if may_a == may_b:
            coincide += 1

    return round(coincide / total, 3) if total > 0 else 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# API PÚBLICA — PERSISTENTE
# ═══════════════════════════════════════════════════════════════════════════════

def get_diputados(partido: str | None = None) -> list[dict]:
    """Retorna diputados del store local."""
    store = _load_store()
    dips = list(store.get("diputados", {}).values())
    if partido:
        dips = [d for d in dips if d.get("partido","").lower() == partido.lower()]
    return dips


def get_votaciones(
    desde: str | None = None,
    tipo: str | None = None,
    max_items: int = 100,
) -> list[dict]:
    """Retorna votaciones del store local."""
    store = _load_store()
    votes = list(reversed(store.get("votaciones", [])))
    if desde:
        votes = [v for v in votes if v.get("fecha","") >= desde]
    if tipo:
        votes = [v for v in votes if v.get("tipo","") == tipo]
    return votes[:max_items]


def get_iniciativas(
    estado: str | None = None,
    tipo: str | None = None,
    tema: str | None = None,
) -> list[dict]:
    """Retorna iniciativas del store local."""
    store = _load_store()
    inics = store.get("iniciativas", [])
    if estado:
        inics = [i for i in inics if i.get("estado","") == estado]
    if tipo:
        inics = [i for i in inics if i.get("tipo","") == tipo]
    if tema:
        inics = [i for i in inics
                 if any(tema.lower() in t.lower() for t in i.get("temas",[]))]
    return inics


def get_meta() -> dict:
    """Metadatos del store de votaciones."""
    return _load_store().get("meta", {})


def actualizar_diputados() -> int:
    """Descarga y persiste la lista de diputados."""
    dips = scrape_diputados()
    if not dips:
        return 0
    store = _load_store()
    for d in dips:
        store["diputados"][d.id] = {
            "id": d.id, "nombre": d.nombre, "partido": d.partido,
            "grupo": d.grupo, "circunscripcion": d.circunscripcion,
            "comunidad": d.comunidad, "genero": d.genero, "cargo": d.cargo,
            "foto_url": d.foto_url, "activo": d.activo, "legislaturas": d.legislaturas,
        }
    _save_store(store)
    return len(dips)


def actualizar_iniciativas(max_items: int = 100) -> int:
    """Descarga y persiste iniciativas parlamentarias."""
    inics = scrape_iniciativas(max_items=max_items)
    if not inics:
        return 0
    store = _load_store()
    existentes = {i["id"] for i in store.get("iniciativas",[])}
    nuevas = [
        {"id":i.id,"tipo":i.tipo,"titulo":i.titulo,"autor":i.autor,
         "grupo_parlamentario":i.grupo_parlamentario,
         "fecha_presentacion":i.fecha_presentacion,"estado":i.estado,
         "temas":i.temas,"fase_actual":i.fase_actual,"url":i.url}
        for i in inics if i.id not in existentes
    ]
    store.setdefault("iniciativas",[]).extend(nuevas)
    _save_store(store)
    return len(nuevas)


def actualizar_votaciones_recientes(dias: int = 7) -> int:
    """Descarga votaciones de los últimos N días."""
    fecha_inicio = date.today() - timedelta(days=dias)
    vots = scrape_votaciones_rango(fecha_inicio)
    if not vots:
        return 0
    store = _load_store()
    existentes = {v["id"] for v in store.get("votaciones",[])}
    nuevas = [
        {"id":v.id,"fecha":v.fecha,"asunto":v.asunto,"tipo":v.tipo,
         "resultado":v.resultado,"si":v.si,"no":v.no,
         "abstenciones":v.abstenciones,"ausentes":v.ausentes,
         "legislatura":v.legislatura}
        for v in vots if v.id not in existentes
    ]
    store.setdefault("votaciones",[]).extend(nuevas)
    if len(store["votaciones"]) > 500:
        store["votaciones"] = store["votaciones"][-500:]
    _save_store(store)
    return len(nuevas)


def cargar_votaciones_recientes(limit: int = 10) -> "pd.DataFrame":
    """
    Retorna las últimas N votaciones del store local como DataFrame.
    Cada fila tiene: id, fecha, iniciativa, tipo, resultado, si, no, abstenciones.
    Devuelve DataFrame vacío si el store está vacío.
    """
    import pandas as pd
    votes = get_votaciones(max_items=limit)
    if not votes:
        return pd.DataFrame()
    rows = []
    for v in votes:
        rows.append({
            "id":          v.get("id", ""),
            "fecha":       v.get("fecha", ""),
            "iniciativa":  v.get("asunto", ""),
            "tipo":        v.get("tipo", ""),
            "resultado":   "APROBADA" if v.get("resultado", "") == "aprobado" else "RECHAZADA",
            "si":          v.get("si", 0),
            "no":          v.get("no", 0),
            "abstenciones": v.get("abstenciones", 0),
        })
    return pd.DataFrame(rows)


def get_alineacion_partidos() -> dict[str, dict[str, float]]:
    """
    Calcula la matriz de alineación de voto entre partidos a partir del store.
    Retorna {} cuando no hay suficientes datos para calcular.
    """
    store = _load_store()
    votaciones_raw = store.get("votaciones", [])
    diputados_raw = store.get("diputados", {})

    if not votaciones_raw or not diputados_raw:
        return {}

    # Necesitamos votaciones con detalle por diputado, no disponibles en el
    # store básico (solo totales). Retornamos vacío para que D4 muestre
    # empty state y solicite ejecutar el scraper completo.
    # Cuando las votaciones individuales existan en el store, calcular_cohesion_partido
    # puede construir la matriz completa.
    return {}


def stats() -> dict:
    """Estadísticas del store de votaciones."""
    store = _load_store()
    meta = store.get("meta", {})
    votes = store.get("votaciones", [])
    inics = store.get("iniciativas", [])

    tipos_vot = {}
    for v in votes:
        t = v.get("tipo","")
        tipos_vot[t] = tipos_vot.get(t,0) + 1

    estados_inic = {}
    for i in inics:
        e = i.get("estado","")
        estados_inic[e] = estados_inic.get(e,0) + 1

    return {
        "n_diputados":   meta.get("n_diputados",0),
        "n_votaciones":  meta.get("n_votaciones",0),
        "n_iniciativas": meta.get("n_iniciativas",0),
        "tipos_votacion": tipos_vot,
        "estados_iniciativas": estados_inic,
        "ultima_actualizacion": meta.get("ultima_actualizacion",""),
        "legislatura": meta.get("legislatura", _LEGIS_ACTUAL),
        "log_scraper": list(reversed(_SCRAPE_LOG[-10:])),
    }
