"""
Actors Service — Motor del Mapa de Actores Políticos
=====================================================
Gestión persistente del grafo de actores con:
  • JSON store (dashboard/data/actors_graph.json) — sin DB externa requerida
  • Integración PostgreSQL cuando DATABASE_URL esté disponible
  • Análisis de red real con networkx (centralidad, comunidades, etc.)
  • Worker de actualización en background
  • Cache inteligente con TTL

El store JSON es la fuente de verdad local. Los datos scrapeados
y las relaciones inferidas se fusionan con los datos base.
"""
from __future__ import annotations

import json
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any
import sys

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

_STORE_PATH = _ROOT / "dashboard" / "data" / "actors_graph.json"
_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)

# ── networkx ──────────────────────────────────────────────────────────────────
try:
    import networkx as nx
    _NX = True
except ImportError:
    _NX = False

# ── Estado interno ────────────────────────────────────────────────────────────
_LOCK = threading.RLock()
_CACHE_METRICS: dict = {}
_CACHE_TS: float = 0.0
_METRICS_TTL = 120.0  # segundos

# ── Datos base de actores (seed) ──────────────────────────────────────────────
_ACTORES_SEED: list[dict] = [
    # Políticos nacionales
    {"id":"sanchez",     "nombre":"Pedro Sánchez",          "tipo":"politico",    "org":"PSOE",    "rol":"Presidente del Gobierno",          "poder":10,"region":"Nacional","twitter":"@sanchezcastejon"},
    {"id":"feijoo",      "nombre":"Alberto Núñez Feijóo",   "tipo":"politico",    "org":"PP",      "rol":"Líder de la Oposición",            "poder":9, "region":"Nacional","twitter":"@NunezFeijoo"},
    {"id":"abascal",     "nombre":"Santiago Abascal",        "tipo":"politico",    "org":"VOX",     "rol":"Secretario General VOX",           "poder":7, "region":"Nacional","twitter":"@Santi_ABASCAL"},
    {"id":"diaz_y",      "nombre":"Yolanda Díaz",            "tipo":"politico",    "org":"SUMAR",   "rol":"Ministra Trabajo / Líder Sumar",   "poder":7, "region":"Nacional","twitter":"@Yolanda_Diaz_"},
    {"id":"puigdemont",  "nombre":"Carles Puigdemont",       "tipo":"politico",    "org":"JUNTS",   "rol":"Líder Junts (exilio)",             "poder":8, "region":"Cataluña", "wikipedia_titulo":"Carles Puigdemont"},
    {"id":"junqueras",   "nombre":"Oriol Junqueras",         "tipo":"politico",    "org":"ERC",     "rol":"Presidente ERC",                   "poder":6, "region":"Cataluña"},
    {"id":"urkullu",     "nombre":"Iñigo Urkullu",           "tipo":"politico",    "org":"PNV",     "rol":"Lendakari / PNV",                 "poder":7, "region":"País Vasco"},
    {"id":"otegi",       "nombre":"Arnaldo Otegi",           "tipo":"politico",    "org":"EH Bildu","rol":"Coordinador EH Bildu",             "poder":6, "region":"País Vasco"},
    {"id":"ayuso",       "nombre":"Isabel Díaz Ayuso",       "tipo":"politico",    "org":"PP",      "rol":"Presidenta Comunidad de Madrid",   "poder":8, "region":"Madrid",  "twitter":"@IdiazAyuso"},
    {"id":"moreno",      "nombre":"Juan Manuel Moreno",      "tipo":"politico",    "org":"PP",      "rol":"Presidente Junta de Andalucía",    "poder":7, "region":"Andalucía"},
    {"id":"mazón",       "nombre":"Carlos Mazón",            "tipo":"politico",    "org":"PP",      "rol":"Pres. Generalitat Valenciana",     "poder":5, "region":"Valencia"},
    {"id":"bolanos",     "nombre":"Félix Bolaños",           "tipo":"politico",    "org":"PSOE",    "rol":"Ministro de Presidencia",          "poder":6, "region":"Nacional"},
    {"id":"marlaska",    "nombre":"Fernando Grande-Marlaska","tipo":"politico",    "org":"PSOE",    "rol":"Ministro del Interior",            "poder":6, "region":"Nacional"},
    {"id":"calviño",     "nombre":"Nadia Calviño",           "tipo":"politico",    "org":"PSOE",    "rol":"Presidenta BEI / ex-vicepresidenta","poder":7,"region":"Internacional"},
    {"id":"montero_i",   "nombre":"Irene Montero",           "tipo":"politico",    "org":"PODEMOS", "rol":"Diputada / ex-ministra",           "poder":5, "region":"Nacional"},
    {"id":"zapatero",    "nombre":"José Luis Rodríguez Zapatero","tipo":"politico","org":"PSOE",    "rol":"Ex-Presidente del Gobierno",       "poder":6, "region":"Nacional"},
    {"id":"rajoy",       "nombre":"Mariano Rajoy",           "tipo":"politico",    "org":"PP",      "rol":"Ex-Presidente del Gobierno",       "poder":6, "region":"Nacional"},
    {"id":"casado",      "nombre":"Pablo Casado",            "tipo":"politico",    "org":"PP",      "rol":"Ex-líder del PP",                  "poder":4, "region":"Nacional"},
    {"id":"ciudadanos",  "nombre":"Inés Arrimadas",          "tipo":"politico",    "org":"CS",      "rol":"Ex-líder Ciudadanos",              "poder":3, "region":"Nacional"},
    {"id":"rufian",      "nombre":"Gabriel Rufián",          "tipo":"politico",    "org":"ERC",     "rol":"Portavoz ERC en Congreso",         "poder":5, "region":"Cataluña"},
    {"id":"nogueras",    "nombre":"Míriam Nogueras",         "tipo":"politico",    "org":"JUNTS",   "rol":"Portavoz Junts en Congreso",       "poder":5, "region":"Cataluña"},
    # Empresariales
    {"id":"iberdrola",   "nombre":"Iberdrola / Galán",       "tipo":"empresarial", "org":"Energía", "rol":"Mayor eléctrica española",         "poder":9, "region":"Internacional"},
    {"id":"santander",   "nombre":"Banco Santander",         "tipo":"empresarial", "org":"Banca",   "rol":"Mayor banco español por activos",  "poder":9, "region":"Internacional"},
    {"id":"telefonica",  "nombre":"Telefónica",              "tipo":"empresarial", "org":"Teleco",  "rol":"Operador teleco e infraestructura","poder":8, "region":"Internacional"},
    {"id":"inditex",     "nombre":"Inditex / Amancio Ortega","tipo":"empresarial", "org":"Moda",    "rol":"Mayor grupo moda del mundo",       "poder":9, "region":"Internacional"},
    {"id":"repsol",      "nombre":"Repsol",                  "tipo":"empresarial", "org":"Energía", "rol":"Corporación petróleo y gas",       "poder":8, "region":"Internacional"},
    {"id":"acs",         "nombre":"ACS / Florentino Pérez",  "tipo":"empresarial", "org":"Construcción","rol":"Infraestructuras + Real Madrid","poder":8,"region":"Internacional"},
    {"id":"caixabank",   "nombre":"CaixaBank",               "tipo":"empresarial", "org":"Banca",   "rol":"Tercer banco español",             "poder":7, "region":"Nacional"},
    {"id":"bbva",        "nombre":"BBVA",                    "tipo":"empresarial", "org":"Banca",   "rol":"Segundo banco español",            "poder":8, "region":"Internacional"},
    {"id":"acciona",     "nombre":"Acciona / Entrecanales",  "tipo":"empresarial", "org":"Infraestructura","rol":"Construcción y renovables","poder":7,"region":"Internacional"},
    # Medios
    {"id":"elpais",      "nombre":"El País",                 "tipo":"mediatico",   "org":"PRISA",   "rol":"Diario nacional progresista",      "poder":8, "region":"Nacional"},
    {"id":"elmundo",     "nombre":"El Mundo",                "tipo":"mediatico",   "org":"Unidad Ed.","rol":"Diario nacional centroderecha",  "poder":7, "region":"Nacional"},
    {"id":"abc",         "nombre":"ABC",                     "tipo":"mediatico",   "org":"Vocento", "rol":"Diario conservador / monárquico",  "poder":6, "region":"Nacional"},
    {"id":"lavanguardia","nombre":"La Vanguardia",           "tipo":"mediatico",   "org":"Grupo Godó","rol":"Referencia en Cataluña",         "poder":6, "region":"Cataluña"},
    {"id":"eldiario",    "nombre":"elDiario.es",             "tipo":"mediatico",   "org":"Progresista","rol":"Digital progresista nativo",    "poder":6, "region":"Nacional"},
    {"id":"okdiario",    "nombre":"OKDiario",                "tipo":"mediatico",   "org":"Derechas", "rol":"Digital derecha / VOX-afín",     "poder":5, "region":"Nacional"},
    {"id":"publico",     "nombre":"Público",                 "tipo":"mediatico",   "org":"Izquierda","rol":"Digital izquierda",               "poder":4, "region":"Nacional"},
    {"id":"confidencial","nombre":"El Confidencial",         "tipo":"mediatico",   "org":"Independiente","rol":"Digital economía y política", "poder":6, "region":"Nacional"},
    {"id":"rtve",        "nombre":"RTVE",                    "tipo":"mediatico",   "org":"Pública", "rol":"Televisión y radio pública nacional","poder":7,"region":"Nacional"},
    # Influencia / Lobbies / Think tanks
    {"id":"faes",        "nombre":"FAES",                    "tipo":"influencia",  "org":"PP",      "rol":"Fundación think tank PP / Aznar","poder":7, "region":"Nacional"},
    {"id":"alternativas","nombre":"Fundación Alternativas",  "tipo":"influencia",  "org":"PSOE",    "rol":"Think tank progresista",          "poder":5, "region":"Nacional"},
    {"id":"cidob",       "nombre":"CIDOB",                   "tipo":"influencia",  "org":"Independiente","rol":"Think tank RRII",            "poder":5, "region":"Cataluña"},
    {"id":"ceoe",        "nombre":"CEOE / Garamendi",        "tipo":"influencia",  "org":"Empresarial","rol":"Patronal española / lobby",     "poder":8, "region":"Nacional"},
    {"id":"ccoo",        "nombre":"CCOO / Couto",            "tipo":"influencia",  "org":"Sindical","rol":"Mayor sindicato español",          "poder":7, "region":"Nacional"},
    {"id":"ugt",         "nombre":"UGT / Álvarez",           "tipo":"influencia",  "org":"Sindical","rol":"Segundo sindicato / PSOE-afín",   "poder":7, "region":"Nacional"},
    {"id":"church",      "nombre":"Conferencia Episcopal",   "tipo":"influencia",  "org":"Iglesia", "rol":"Iglesia Católica española",       "poder":6, "region":"Nacional"},
    {"id":"consejo_estado","nombre":"Consejo de Estado",     "tipo":"influencia",  "org":"Estado",  "rol":"Órgano consultivo supremo",       "poder":6, "region":"Nacional"},
    {"id":"banco_espana","nombre":"Banco de España",         "tipo":"influencia",  "org":"Estado",  "rol":"Banco central y supervisor",      "poder":7, "region":"Nacional"},
    # Poder judicial / institucional
    {"id":"cgpj",        "nombre":"CGPJ",                   "tipo":"influencia",  "org":"Judicial","rol":"Gobierno del poder judicial",      "poder":7, "region":"Nacional"},
    {"id":"tc",          "nombre":"Tribunal Constitucional", "tipo":"influencia",  "org":"Judicial","rol":"Máximo intérprete Constitución",   "poder":8, "region":"Nacional"},
]

# ── Relaciones base (seed) ────────────────────────────────────────────────────
_RELACIONES_SEED: list[dict] = [
    # Gobierno y coalición
    {"from":"sanchez",    "to":"diaz_y",       "tipo":"gubernamental","label":"Coalición PSOE-Sumar",           "fuerza":9,"fuente":"manual"},
    {"from":"sanchez",    "to":"bolanos",      "tipo":"gubernamental","label":"Ministro Presidencia",           "fuerza":8,"fuente":"manual"},
    {"from":"sanchez",    "to":"marlaska",     "tipo":"gubernamental","label":"Ministro Interior",              "fuerza":8,"fuente":"manual"},
    {"from":"sanchez",    "to":"puigdemont",   "tipo":"adversarial",  "label":"Tensión Amnistía/exilio",        "fuerza":8,"fuente":"manual"},
    {"from":"sanchez",    "to":"junqueras",    "tipo":"alianza",      "label":"Acuerdo investidura",            "fuerza":7,"fuente":"manual"},
    {"from":"sanchez",    "to":"otegi",        "tipo":"alianza",      "label":"Apoyo parlamentario",            "fuerza":7,"fuente":"manual"},
    {"from":"sanchez",    "to":"urkullu",      "tipo":"alianza",      "label":"Financiación singular PV",       "fuerza":6,"fuente":"manual"},
    {"from":"sanchez",    "to":"rufian",       "tipo":"alianza",      "label":"Apoyo legislativo ERC",          "fuerza":5,"fuente":"manual"},
    {"from":"sanchez",    "to":"nogueras",     "tipo":"adversarial",  "label":"Tensión Junts",                  "fuerza":6,"fuente":"manual"},
    # PP - Oposición
    {"from":"feijoo",     "to":"abascal",      "tipo":"adversarial",  "label":"Competencia derechas",           "fuerza":7,"fuente":"manual"},
    {"from":"feijoo",     "to":"sanchez",      "tipo":"adversarial",  "label":"Oposición principal",            "fuerza":9,"fuente":"manual"},
    {"from":"feijoo",     "to":"ayuso",        "tipo":"gubernamental","label":"PP — Madrid",                    "fuerza":7,"fuente":"manual"},
    {"from":"feijoo",     "to":"moreno",       "tipo":"gubernamental","label":"PP — Andalucía",                 "fuerza":7,"fuente":"manual"},
    {"from":"feijoo",     "to":"mazón",        "tipo":"gubernamental","label":"PP — Valencia",                  "fuerza":5,"fuente":"manual"},
    {"from":"ayuso",      "to":"abascal",      "tipo":"adversarial",  "label":"Rivalidad Madrid-VOX",           "fuerza":5,"fuente":"manual"},
    {"from":"ayuso",      "to":"feijoo",       "tipo":"alianza",      "label":"Presidenta autonómica PP",       "fuerza":6,"fuente":"manual"},
    # Empresarial - político
    {"from":"iberdrola",  "to":"sanchez",      "tipo":"lobby",        "label":"Lobby renovables / tarifas",     "fuerza":7,"fuente":"manual"},
    {"from":"iberdrola",  "to":"feijoo",       "tipo":"lobby",        "label":"Regulación energía",             "fuerza":6,"fuente":"manual"},
    {"from":"santander",  "to":"sanchez",      "tipo":"lobby",        "label":"Regulación banca",               "fuerza":6,"fuente":"manual"},
    {"from":"bbva",       "to":"sanchez",      "tipo":"lobby",        "label":"OPA Sabadell / regulación",      "fuerza":7,"fuente":"manual"},
    {"from":"ceoe",       "to":"feijoo",       "tipo":"lobby",        "label":"Agenda empresarial PP",          "fuerza":7,"fuente":"manual"},
    {"from":"ceoe",       "to":"sanchez",      "tipo":"lobby",        "label":"Diálogo social gobierno",        "fuerza":6,"fuente":"manual"},
    {"from":"acs",        "to":"feijoo",       "tipo":"lobby",        "label":"Infraestructuras / Florentino",  "fuerza":7,"fuente":"manual"},
    {"from":"repsol",     "to":"sanchez",      "tipo":"lobby",        "label":"Transición energética",          "fuerza":6,"fuente":"manual"},
    {"from":"telefonica", "to":"sanchez",      "tipo":"lobby",        "label":"5G / inversiones tech",          "fuerza":5,"fuente":"manual"},
    {"from":"banco_espana","to":"sanchez",     "tipo":"lobby",        "label":"Supervisión fiscal",             "fuerza":6,"fuente":"manual"},
    # Medios - político
    {"from":"elpais",     "to":"sanchez",      "tipo":"mediatico",    "label":"Cobertura favorable PSOE",       "fuerza":7,"fuente":"manual"},
    {"from":"elmundo",    "to":"feijoo",       "tipo":"mediatico",    "label":"Cobertura favorable PP",         "fuerza":7,"fuente":"manual"},
    {"from":"abc",        "to":"abascal",      "tipo":"mediatico",    "label":"Cobertura favorable VOX",        "fuerza":6,"fuente":"manual"},
    {"from":"eldiario",   "to":"diaz_y",       "tipo":"mediatico",    "label":"Cobertura progresista",          "fuerza":6,"fuente":"manual"},
    {"from":"lavanguardia","to":"puigdemont",  "tipo":"mediatico",    "label":"Cobertura soberanismo",          "fuerza":5,"fuente":"manual"},
    {"from":"okdiario",   "to":"abascal",      "tipo":"mediatico",    "label":"Medio afín VOX",                 "fuerza":7,"fuente":"manual"},
    {"from":"rtve",       "to":"sanchez",      "tipo":"mediatico",    "label":"RTVE pública / gobierno",        "fuerza":5,"fuente":"manual"},
    {"from":"confidencial","to":"bbva",        "tipo":"mediatico",    "label":"Cobertura empresarial",          "fuerza":4,"fuente":"manual"},
    # Think tanks
    {"from":"faes",       "to":"feijoo",       "tipo":"alianza",      "label":"Think tank PP / agenda ideológica","fuerza":7,"fuente":"manual"},
    {"from":"alternativas","to":"sanchez",     "tipo":"alianza",      "label":"Ideas PSOE / políticas",         "fuerza":5,"fuente":"manual"},
    {"from":"ccoo",       "to":"diaz_y",       "tipo":"sindical",     "label":"Concertación laboral",           "fuerza":7,"fuente":"manual"},
    {"from":"ugt",        "to":"sanchez",      "tipo":"sindical",     "label":"Diálogo social PSOE",            "fuerza":7,"fuente":"manual"},
    {"from":"church",     "to":"feijoo",       "tipo":"alianza",      "label":"Educación / valores",            "fuerza":5,"fuente":"manual"},
    # Empresarial entre sí
    {"from":"iberdrola",  "to":"repsol",       "tipo":"empresarial",  "label":"Competencia energía",            "fuerza":6,"fuente":"manual"},
    {"from":"santander",  "to":"bbva",         "tipo":"empresarial",  "label":"Competencia bancaria",           "fuerza":7,"fuente":"manual"},
    {"from":"santander",  "to":"telefonica",   "tipo":"empresarial",  "label":"Accionariado cruzado",           "fuerza":5,"fuente":"manual"},
    {"from":"bbva",       "to":"caixabank",    "tipo":"empresarial",  "label":"Competencia banca minorista",    "fuerza":6,"fuente":"manual"},
    # Institucional
    {"from":"cgpj",       "to":"sanchez",      "tipo":"adversarial",  "label":"Bloqueo renovación CGPJ",        "fuerza":7,"fuente":"manual"},
    {"from":"cgpj",       "to":"feijoo",       "tipo":"alianza",      "label":"PP bloquea renovación CGPJ",     "fuerza":7,"fuente":"manual"},
    {"from":"tc",         "to":"sanchez",      "tipo":"gubernamental","label":"Sentencias Ley Amnistía",         "fuerza":6,"fuente":"manual"},
]


# ═══════════════════════════════════════════════════════════════════════════════
# PERSISTENCIA — JSON Store
# ═══════════════════════════════════════════════════════════════════════════════

def _load_store() -> dict:
    """Carga el store desde disco. Inicializa con seed si no existe."""
    with _LOCK:
        if _STORE_PATH.exists():
            try:
                with open(_STORE_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                # Validate keys
                if "actores"in data and "relaciones"in data:
                    return data
            except Exception:
                pass

        # Inicializar con datos seed
        store = {
            "actores": {a["id"]: dict(a) for a in _ACTORES_SEED},
            "relaciones": _RELACIONES_SEED.copy(),
            "menciones": [],
            "meta": {
                "version": "1.0",
                "creado": datetime.now().isoformat(),
                "n_actores": len(_ACTORES_SEED),
                "n_relaciones": len(_RELACIONES_SEED),
                "ultima_actualizacion": datetime.now().isoformat(),
            },
        }
        _save_store(store)
        return store


def _save_store(store: dict) -> None:
    """Guarda el store en disco de forma atómica."""
    with _LOCK:
        store["meta"]["ultima_actualizacion"] = datetime.now().isoformat()
        store["meta"]["n_actores"] = len(store.get("actores", {}))
        store["meta"]["n_relaciones"] = len(store.get("relaciones", []))
        tmp = _STORE_PATH.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(store, f, ensure_ascii=False, indent=2, default=str)
        tmp.replace(_STORE_PATH)


# ═══════════════════════════════════════════════════════════════════════════════
# API PÚBLICA
# ═══════════════════════════════════════════════════════════════════════════════

def get_actores(tipo: str | None = None, region: str | None = None) -> list[dict]:
    """Retorna lista de actores, con filtros opcionales."""
    store = _load_store()
    actores = list(store["actores"].values())
    if tipo:
        actores = [a for a in actores if a.get("tipo") == tipo]
    if region:
        actores = [a for a in actores if a.get("region") == region]
    return actores


def get_actor(actor_id: str) -> dict | None:
    """Retorna un actor por ID."""
    store = _load_store()
    return store["actores"].get(actor_id)


def get_relaciones(tipo: str | None = None, actor_id: str | None = None) -> list[dict]:
    """Retorna lista de relaciones, con filtros opcionales."""
    store = _load_store()
    rels = store.get("relaciones", [])
    if tipo:
        rels = [r for r in rels if r.get("tipo") == tipo]
    if actor_id:
        rels = [r for r in rels if r.get("from") == actor_id or r.get("to") == actor_id]
    return rels


def upsert_actor(actor: dict) -> None:
    """Crea o actualiza un actor. Merge inteligente de campos."""
    if not actor.get("id"):
        return
    with _LOCK:
        store = _load_store()
        aid = actor["id"]
        if aid in store["actores"]:
            # Merge: no sobreescribir campos con strings vacíos
            existing = store["actores"][aid]
            for k, v in actor.items():
                if v or k in ("poder", "activo"):
                    existing[k] = v
        else:
            store["actores"][aid] = actor
        _save_store(store)
    _invalidar_cache_metricas()


def upsert_relacion(rel: dict) -> None:
    """Crea o actualiza una relación. Usa (from, to) como clave."""
    if not rel.get("from") or not rel.get("to"):
        return
    with _LOCK:
        store = _load_store()
        # Buscar existente
        clave = (rel["from"], rel["to"])
        idx = next(
            (i for i, r in enumerate(store["relaciones"])
             if (r.get("from"), r.get("to")) == clave),
            None,
        )
        if idx is not None:
            old = store["relaciones"][idx]
            old.update({k: v for k, v in rel.items() if v})
            old["n_menciones"] = old.get("n_menciones", 1) + rel.get("n_menciones", 0)
        else:
            store["relaciones"].append(rel)
        _save_store(store)
    _invalidar_cache_metricas()


def bulk_upsert_relaciones(rels: list[dict]) -> int:
    """Inserta o actualiza un lote de relaciones. Retorna el número procesado."""
    n = 0
    for rel in rels:
        try:
            upsert_relacion(rel)
            n += 1
        except Exception:
            pass
    return n


def add_menciones(menciones: list[dict]) -> int:
    """Registra nuevas menciones en prensa."""
    if not menciones:
        return 0
    with _LOCK:
        store = _load_store()
        store.setdefault("menciones", [])
        store["menciones"].extend(menciones)
        # Limitar a las últimas 1000
        if len(store["menciones"]) > 1000:
            store["menciones"] = store["menciones"][-1000:]
        _save_store(store)
    return len(menciones)


def get_menciones(actor_id: str | None = None, limit: int = 50) -> list[dict]:
    """Retorna menciones recientes."""
    store = _load_store()
    menciones = list(reversed(store.get("menciones", [])))
    if actor_id:
        menciones = [m for m in menciones if m.get("actor_id") == actor_id]
    return menciones[:limit]


def get_meta() -> dict:
    """Retorna metadatos del store."""
    return _load_store().get("meta", {})


def _invalidar_cache_metricas() -> None:
    global _CACHE_TS
    _CACHE_TS = 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# ANÁLISIS DE RED — networkx
# ═══════════════════════════════════════════════════════════════════════════════

def construir_grafo(
    tipos_actor: list[str] | None = None,
    tipos_rel: list[str] | None = None,
    solo_activos: bool = True,
) -> "Any":
    """
    Construye un grafo networkx con los actores y relaciones.
    Retorna None si networkx no está disponible.
    """
    if not _NX:
        return None

    actores = get_actores()
    relaciones = get_relaciones()

    if tipos_actor:
        ids_validos = {a["id"] for a in actores if a.get("tipo") in tipos_actor}
    else:
        ids_validos = {a["id"] for a in actores}

    G = nx.DiGraph()

    for a in actores:
        if a["id"] not in ids_validos:
            continue
        G.add_node(
            a["id"],
            nombre=a.get("nombre", a["id"]),
            tipo=a.get("tipo", ""),
            org=a.get("org", ""),
            rol=a.get("rol", ""),
            poder=a.get("poder", 5),
            region=a.get("region", ""),
        )

    for r in relaciones:
        if r.get("from") not in ids_validos or r.get("to") not in ids_validos:
            continue
        if tipos_rel and r.get("tipo") not in tipos_rel:
            continue
        G.add_edge(
            r["from"],
            r["to"],
            tipo=r.get("tipo", ""),
            label=r.get("label", ""),
            fuerza=float(r.get("fuerza", 1)),
            fuente=r.get("fuente", "manual"),
            n_menciones=r.get("n_menciones", 1),
        )

    return G


def calcular_metricas(G=None) -> dict:
    """
    Calcula métricas de centralidad y estructura del grafo.
    Cachea el resultado para evitar recálculos frecuentes.
    """
    global _CACHE_METRICS, _CACHE_TS

    if time.time() - _CACHE_TS < _METRICS_TTL and _CACHE_METRICS:
        return _CACHE_METRICS

    if G is None:
        G = construir_grafo()

    if G is None or not _NX:
        # Fallback: centralidad de grado manual
        actores = get_actores()
        relaciones = get_relaciones()
        deg: dict[str, int] = {a["id"]: 0 for a in actores}
        for r in relaciones:
            deg[r.get("from", "")] = deg.get(r.get("from", ""), 0) + 1
            deg[r.get("to", "")] = deg.get(r.get("to", ""), 0) + 1
        max_deg = max(deg.values()) if deg else 1
        metricas = {
            "degree": deg,
            "betweenness": {k: round(v / max_deg, 3) for k, v in deg.items()},
            "pagerank": {k: round(v / max_deg, 3) for k, v in deg.items()},
            "closeness": {},
            "comunidades": {},
            "n_nodos": len(actores),
            "n_aristas": len(relaciones),
            "densidad": 0.0,
            "n_componentes": 1,
        }
        _CACHE_METRICS = metricas
        _CACHE_TS = time.time()
        return metricas

    metricas: dict = {
        "n_nodos": G.number_of_nodes(),
        "n_aristas": G.number_of_edges(),
        "densidad": round(nx.density(G), 4),
    }

    # Grado total (in + out)
    G_undir = G.to_undirected()
    metricas["degree"] = dict(G_undir.degree())

    # Betweenness centralidad
    try:
        metricas["betweenness"] = {
            k: round(v, 4)
            for k, v in nx.betweenness_centrality(G_undir, normalized=True).items()
        }
    except Exception:
        metricas["betweenness"] = {}

    # PageRank
    try:
        metricas["pagerank"] = {
            k: round(v, 4)
            for k, v in nx.pagerank(G, alpha=0.85).items()
        }
    except Exception:
        metricas["pagerank"] = {}

    # Closeness
    try:
        metricas["closeness"] = {
            k: round(v, 4)
            for k, v in nx.closeness_centrality(G_undir).items()
        }
    except Exception:
        metricas["closeness"] = {}

    # Componentes conexas
    try:
        comps = list(nx.connected_components(G_undir))
        metricas["n_componentes"] = len(comps)
        metricas["componente_principal"] = len(max(comps, key=len)) if comps else 0
    except Exception:
        metricas["n_componentes"] = 1

    # Comunidades (Louvain si disponible, sino Greedy)
    try:
        from networkx.algorithms.community import greedy_modularity_communities
        comunidades = list(greedy_modularity_communities(G_undir))
        metricas["comunidades"] = {
            node: i
            for i, com in enumerate(comunidades)
            for node in com
        }
        metricas["n_comunidades"] = len(comunidades)
    except Exception:
        metricas["comunidades"] = {}
        metricas["n_comunidades"] = 0

    _CACHE_METRICS = metricas
    _CACHE_TS = time.time()
    return metricas


def top_actores_por_metrica(metrica: str = "degree", n: int = 15) -> list[tuple[str, float]]:
    """Retorna los N actores con mayor valor en la métrica dada."""
    metricas = calcular_metricas()
    vals = metricas.get(metrica, {})
    if not vals:
        return []
    return sorted(vals.items(), key=lambda x: x[1], reverse=True)[:n]


def actores_puente() -> list[dict]:
    """Identifica actores que conectan comunidades (brokers de información)."""
    G = construir_grafo()
    if not G or not _NX:
        return []
    try:
        G_undir = G.to_undirected()
        betw = nx.betweenness_centrality(G_undir, normalized=True)
        # Actores con betweenness > media + 1σ
        import statistics
        vals = list(betw.values())
        if not vals:
            return []
        media = statistics.mean(vals)
        sigma = statistics.stdev(vals) if len(vals) > 1 else 0
        umbral = media + sigma

        puentes = []
        for actor_id, b in betw.items():
            if b > umbral:
                actor = get_actor(actor_id)
                if actor:
                    puentes.append({
                        "id": actor_id,
                        "nombre": actor.get("nombre", actor_id),
                        "tipo": actor.get("tipo", ""),
                        "betweenness": round(b, 4),
                        "grado": G_undir.degree(actor_id),
                    })

        return sorted(puentes, key=lambda x: -x["betweenness"])
    except Exception:
        return []


def camino_entre_actores(id1: str, id2: str) -> list[str]:
    """Retorna el camino más corto entre dos actores."""
    G = construir_grafo()
    if not G or not _NX:
        return []
    try:
        G_undir = G.to_undirected()
        path = nx.shortest_path(G_undir, id1, id2)
        return path
    except Exception:
        return []


def egocentric_network(actor_id: str, profundidad: int = 1) -> tuple[list[dict], list[dict]]:
    """
    Retorna la red ego (actor + vecinos hasta profundidad N).
    Útil para visualizar el entorno inmediato de un actor.
    """
    G = construir_grafo()
    if not G or not _NX:
        return get_actores(), get_relaciones()

    try:
        G_undir = G.to_undirected()
        nodos_ego = set([actor_id])
        for _ in range(profundidad):
            nuevos = set()
            for n in list(nodos_ego):
                nuevos.update(G_undir.neighbors(n))
            nodos_ego.update(nuevos)

        actores_ego = [get_actor(n) for n in nodos_ego if get_actor(n)]
        relaciones_ego = [
            r for r in get_relaciones()
            if r.get("from") in nodos_ego and r.get("to") in nodos_ego
        ]
        return actores_ego, relaciones_ego
    except Exception:
        return [], []


# ═══════════════════════════════════════════════════════════════════════════════
# WORKER DE ACTUALIZACIÓN AUTOMÁTICA
# ═══════════════════════════════════════════════════════════════════════════════

_UPDATE_WORKER_RUNNING = False
_UPDATE_WORKER_THREAD: threading.Thread | None = None
_LAST_UPDATE: dict[str, float] = {}
_UPDATE_LOG: list[dict] = []

_UPDATE_INTERVALS = {
    "menciones_rss": int(__import__("os").environ.get("ACTORS_INTERVAL_RSS", "900")),     # 15 min
    "relaciones_rss": int(__import__("os").environ.get("ACTORS_INTERVAL_REL", "1800")),   # 30 min
    "enriquecimiento": int(__import__("os").environ.get("ACTORS_INTERVAL_WIKI", "86400")),# 24 h
    "alertas_red": int(__import__("os").environ.get("ACTORS_INTERVAL_ALERT", "3600")),    # 1 h
}


def _debe_actualizar_actor(tipo: str) -> bool:
    return time.time() - _LAST_UPDATE.get(tipo, 0) > _UPDATE_INTERVALS[tipo]


def _actualizar_menciones() -> int:
    """Actualiza menciones de actores desde RSS."""
    try:
        from dashboard.services.actors_scraper import (
            registrar_aliases, scrape_menciones_rss
        )
        actores = get_actores()
        aliases = {}
        for a in actores:
            nombre = a.get("nombre", "")
            aliases[nombre] = a["id"]
            # Añadir apellido como alias
            partes = nombre.split()
            if len(partes) > 1:
                aliases[partes[-1]] = a["id"]
        registrar_aliases(aliases)

        menciones = scrape_menciones_rss(list(aliases.values()))
        n = add_menciones(menciones)
        _UPDATE_LOG.append({"tipo": "menciones", "n": n, "ts": datetime.now().isoformat(), "ok": True})
        return n
    except Exception as exc:
        _UPDATE_LOG.append({"tipo": "menciones", "n": 0, "ts": datetime.now().isoformat(), "ok": False, "error": str(exc)[:100]})
        return 0


def _actualizar_relaciones_rss() -> int:
    """Infiere relaciones desde noticias RSS recientes."""
    try:
        from dashboard.services.actors_scraper import (
            registrar_aliases, extraer_relaciones_de_noticias
        )
        from dashboard.services.rss_feeds import obtener_noticias_recientes

        actores = get_actores()
        aliases = {a.get("nombre", ""): a["id"] for a in actores}
        for a in actores:
            partes = a.get("nombre", "").split()
            if len(partes) > 1:
                aliases[partes[-1]] = a["id"]
        registrar_aliases(aliases)

        noticias = obtener_noticias_recientes(max_items=50)
        nuevas_rels = extraer_relaciones_de_noticias(noticias)

        # Solo relaciones con confianza > 0.5
        rels_filtradas = [r for r in nuevas_rels if float(r.get("fuerza", 0)) >= 0.5]
        n = bulk_upsert_relaciones(rels_filtradas)
        _UPDATE_LOG.append({"tipo": "relaciones_rss", "n": n, "ts": datetime.now().isoformat(), "ok": True})
        return n
    except Exception as exc:
        _UPDATE_LOG.append({"tipo": "relaciones_rss", "n": 0, "ts": datetime.now().isoformat(), "ok": False, "error": str(exc)[:100]})
        return 0


def _enriquecer_actores_pendientes() -> int:
    """Enriquece actores que no tienen datos de Wikipedia."""
    try:
        from dashboard.services.actors_scraper import enriquecer_lote
        actores = get_actores()
        pendientes = [
            a for a in actores
            if not a.get("wikipedia_extracto") and a.get("tipo") == "politico"
        ][:5]  # Máximo 5 por ciclo

        if not pendientes:
            return 0

        enriquecidos = enriquecer_lote(pendientes, max_actores=5)
        for a in enriquecidos:
            upsert_actor(a)

        _UPDATE_LOG.append({"tipo": "enriquecimiento", "n": len(enriquecidos), "ts": datetime.now().isoformat(), "ok": True})
        return len(enriquecidos)
    except Exception as exc:
        _UPDATE_LOG.append({"tipo": "enriquecimiento", "n": 0, "ts": datetime.now().isoformat(), "ok": False, "error": str(exc)[:100]})
        return 0


def _worker_actores_loop() -> None:
    global _UPDATE_WORKER_RUNNING
    while _UPDATE_WORKER_RUNNING:
        try:
            if _debe_actualizar_actor("menciones_rss"):
                _actualizar_menciones()
                _LAST_UPDATE["menciones_rss"] = time.time()

            if _debe_actualizar_actor("relaciones_rss"):
                _actualizar_relaciones_rss()
                _LAST_UPDATE["relaciones_rss"] = time.time()

            if _debe_actualizar_actor("enriquecimiento"):
                _enriquecer_actores_pendientes()
                _LAST_UPDATE["enriquecimiento"] = time.time()

        except Exception:
            pass

        for _ in range(60):
            if not _UPDATE_WORKER_RUNNING:
                break
            time.sleep(1)


def iniciar_worker_actores() -> bool:
    """Inicia el worker de actualización de actores."""
    global _UPDATE_WORKER_RUNNING, _UPDATE_WORKER_THREAD
    if _UPDATE_WORKER_RUNNING and _UPDATE_WORKER_THREAD and _UPDATE_WORKER_THREAD.is_alive():
        return False
    _UPDATE_WORKER_RUNNING = True
    _UPDATE_WORKER_THREAD = threading.Thread(
        target=_worker_actores_loop, daemon=True, name="politeia-actors-updater"
    )
    _UPDATE_WORKER_THREAD.start()
    return True


def detener_worker_actores() -> None:
    global _UPDATE_WORKER_RUNNING
    _UPDATE_WORKER_RUNNING = False


def estado_worker_actores() -> dict:
    """Estado del worker de actualización."""
    store = _load_store()
    ahora = time.time()
    return {
        "running": _UPDATE_WORKER_RUNNING and bool(_UPDATE_WORKER_THREAD and _UPDATE_WORKER_THREAD.is_alive()),
        "log": list(reversed(_UPDATE_LOG[-20:])),
        "meta": store.get("meta", {}),
        "proximas": {
            k: max(0, int(v - (ahora - _LAST_UPDATE.get(k, 0))))
            for k, v in _UPDATE_INTERVALS.items()
        },
        "n_actores": len(store.get("actores", {})),
        "n_relaciones": len(store.get("relaciones", [])),
        "n_menciones": len(store.get("menciones", [])),
    }


def ejecutar_actualizacion_manual(tipo: str) -> int:
    """Ejecuta una actualización manual específica."""
    _LAST_UPDATE.pop(tipo, None)
    fns = {
        "menciones_rss": _actualizar_menciones,
        "relaciones_rss": _actualizar_relaciones_rss,
        "enriquecimiento": _enriquecer_actores_pendientes,
    }
    fn = fns.get(tipo)
    if fn:
        n = fn()
        _LAST_UPDATE[tipo] = time.time()
        return n
    return 0


def reset_a_seed() -> None:
    """Resetea el store a los datos seed iniciales."""
    if _STORE_PATH.exists():
        _STORE_PATH.unlink()
    _load_store()  # Recrea desde seed
    _invalidar_cache_metricas()


# ─── Productividad parlamentaria ──────────────────────────────────────────────

def cargar_productividad_parlamentaria() -> "pd.DataFrame":
    """
    Retorna productividad parlamentaria de actores políticos como DataFrame.

    Intenta cargar desde la BD (tabla parliamentary_initiatives agrupada por autor).
    Si la BD no está disponible o la tabla está vacía devuelve DataFrame vacío.

    Columnas devueltas: actor, partido, presentadas, debate, aprobadas, rechazadas, temas
    """
    import pandas as pd

    # Intentar consulta real desde DB
    try:
        import dashboard.db as _db
        from sqlalchemy import text
        engine = _db.get_engine()
        if engine is not None:
            query = """
                SELECT
                    authors                   AS actor,
                    '' AS partido,
                    COUNT(*)                  AS presentadas,
                    COUNT(*) FILTER (WHERE status IN ('en_tramite','debate')) AS debate,
                    COUNT(*) FILTER (WHERE result = 'aprobado')               AS aprobadas,
                    COUNT(*) FILTER (WHERE result = 'rechazado')              AS rechazadas
                FROM parliamentary_initiatives
                WHERE legislature = :leg
                GROUP BY authors
                ORDER BY COUNT(*) DESC
                LIMIT 20
            """
            import os
            from sqlalchemy import text as _text
            with engine.connect() as conn:
                import os as _os
                leg = _os.environ.get("LEGISLATURA_ACTUAL", "15")
                rows = conn.execute(_text(query), {"leg": leg}).fetchall()
                if rows:
                    cols = ["actor", "partido", "presentadas", "debate", "aprobadas", "rechazadas"]
                    df = pd.DataFrame(rows, columns=cols)
                    df["temas"] = [[] for _ in range(len(df))]
                    return df
    except Exception:
        pass

    # DB no disponible — retornar vacío (sin datos falsos)
    return pd.DataFrame()
