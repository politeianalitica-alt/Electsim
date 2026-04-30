"""
Actors Scraper — Motor de enriquecimiento automático de actores políticos
=========================================================================
Scrapea datos estructurados sobre actores políticos españoles desde:

  • Wikipedia ES/EN  — extracto biográfico, cargo actual, partido, foto
  • Wikidata SPARQL  — datos estructurados: cargo, fecha nacimiento, partido
  • RSS / Prensa     — menciones recientes, co-menciones entre actores
  • BOE              — nombramientos y ceses oficiales

Pipeline de relaciones (dinámico):
  Noticias RSS → NER de actores → co-menciones → análisis de verbo →
  tipo de relación → fuerza ponderada por frecuencia → base de datos

Diseño defensivo: nunca lanza excepción al exterior, siempre devuelve
estructuras vacías o parciales ante fallos de red o parsing.
"""
from __future__ import annotations

import hashlib
import json
import re
import time
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote, urljoin
import sys

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# ── HTTP cliente ──────────────────────────────────────────────────────────────
try:
    import httpx
    _HTTP = httpx
    def _get(url: str, timeout: float = 8.0, params: dict | None = None) -> httpx.Response:
        with httpx.Client(timeout=timeout, follow_redirects=True,
                          headers={"User-Agent": "Politeia/2.0 (research; contact@politeia.es)"}) as c:
            return c.get(url, params=params)
except ImportError:
    import urllib.request
    _HTTP = None
    def _get(url: str, timeout: float = 8.0, params: dict | None = None) -> Any:
        class _Resp:
            def __init__(self, data: bytes):
                self._data = data
                self.status_code = 200
            def json(self): return json.loads(self._data)
            @property
            def text(self): return self._data.decode("utf-8", errors="replace")
            def raise_for_status(self): pass
        req = urllib.request.Request(url, headers={"User-Agent": "Politeia/2.0"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return _Resp(r.read())

# ── BS4 para parsing HTML ─────────────────────────────────────────────────────
try:
    from bs4 import BeautifulSoup
    _BS4 = True
except ImportError:
    _BS4 = False
    class BeautifulSoup:  # type: ignore
        def __init__(self, *a, **kw): self._text = a[0] if a else ""
        def get_text(self, *a, **kw): return re.sub(r"<[^>]+>", " ", self._text)
        def find(self, *a, **kw): return None
        def find_all(self, *a, **kw): return []

# ── Constantes ────────────────────────────────────────────────────────────────
_WIKI_SUMMARY = "https://es.wikipedia.org/api/rest_v1/page/summary/{title}"
_WIKI_SEARCH  = "https://es.wikipedia.org/w/api.php"
_WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
_RATE_LIMIT = 1.2  # segundos entre peticiones

# Log de scraping
_SCRAPE_LOG: list[dict] = []
_MAX_LOG = 200

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", str(text))
    text = text.encode("ascii", "ignore").decode()
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[\s_-]+", "_", text)


def _log(tipo: str, actor: str, ok: bool, info: str = "") -> None:
    _SCRAPE_LOG.append({
        "tipo": tipo,
        "actor": actor,
        "ok": ok,
        "info": info[:200],
        "ts": datetime.now().strftime("%H:%M:%S"),
    })
    if len(_SCRAPE_LOG) > _MAX_LOG:
        _SCRAPE_LOG.pop(0)


def _safe_get(url: str, params: dict | None = None, timeout: float = 8.0) -> Any | None:
    try:
        r = _get(url, timeout=timeout, params=params)
        r.raise_for_status()
        return r
    except Exception as exc:
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# WIKIPEDIA SCRAPER
# ═══════════════════════════════════════════════════════════════════════════════

def wikipedia_buscar_titulo(nombre: str) -> str | None:
    """Busca el título correcto de la página de Wikipedia para un actor."""
    params = {
        "action": "query",
        "list": "search",
        "srsearch": nombre + "política España",
        "srlimit": "3",
        "format": "json",
        "srprop": "snippet",
    }
    resp = _safe_get(_WIKI_SEARCH, params=params)
    if not resp:
        return None
    try:
        data = resp.json()
        resultados = data.get("query", {}).get("search", [])
        if resultados:
            return resultados[0]["title"]
    except Exception:
        pass
    return None


def wikipedia_perfil(nombre: str, titulo_wiki: str = "") -> dict:
    """
    Obtiene el perfil completo de un actor desde Wikipedia.
    Retorna dict con: extracto, descripcion, foto_url, categorias.
    """
    titulo = titulo_wiki or wikipedia_buscar_titulo(nombre)
    if not titulo:
        _log("wikipedia", nombre, False, "título no encontrado")
        return {}

    url = _WIKI_SUMMARY.format(title=quote(titulo.replace(" ", "_")))
    resp = _safe_get(url)
    time.sleep(_RATE_LIMIT)

    if not resp:
        _log("wikipedia", nombre, False, f"GET failed: {url}")
        return {}

    try:
        data = resp.json()
        perfil = {
            "wikipedia_titulo": titulo,
            "wikipedia_url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            "descripcion": data.get("description", ""),
            "extracto": data.get("extract", "")[:1200],
            "foto_url": (data.get("thumbnail") or {}).get("source", ""),
            "nacimiento_fecha": _extraer_fecha_nacimiento(data.get("extract", "")),
            "wikidata_id": data.get("wikibase_item", ""),
        }
        _log("wikipedia", nombre, True, f"{len(perfil['extracto'])} chars")
        return perfil
    except Exception as exc:
        _log("wikipedia", nombre, False, str(exc))
        return {}


def _extraer_fecha_nacimiento(texto: str) -> str:
    """Extrae fecha de nacimiento de texto de Wikipedia."""
    patrones = [
        r"nacid[oa] el (\d{1,2} de \w+ de \d{4})",
        r"(\d{1,2} de \w+ de \d{4})",
        r"born (\w+ \d{1,2}, \d{4})",
        r"\((\d{4})\)",
    ]
    for patron in patrones:
        m = re.search(patron, texto[:500], re.IGNORECASE)
        if m:
            return m.group(1)
    return ""


# ═══════════════════════════════════════════════════════════════════════════════
# WIKIDATA SCRAPER — Datos estructurados
# ═══════════════════════════════════════════════════════════════════════════════

_SPARQL_POLITICOS_ES = """
SELECT DISTINCT ?person ?personLabel ?partyLabel ?positionLabel ?birthDate ?genderLabel WHERE {
  ?person wdt:P27 wd:Q29 .
  ?person wdt:P106 wd:Q82955 .
  OPTIONAL { ?person wdt:P102 ?party . }
  OPTIONAL { ?person p:P39 ?posStmt .
             ?posStmt ps:P39 ?position .
             FILTER NOT EXISTS { ?posStmt pq:P582 [] } }
  OPTIONAL { ?person wdt:P569 ?birthDate . }
  OPTIONAL { ?person wdt:P21 ?gender . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" . }
}
ORDER BY DESC(?birthDate)
LIMIT 150
"""

_SPARQL_EMPRESARIOS_ES = """
SELECT DISTINCT ?person ?personLabel ?employerLabel ?positionLabel WHERE {
  ?person wdt:P27 wd:Q29 .
  { ?person wdt:P106 wd:Q131524 . } UNION
  { ?person wdt:P106 wd:Q43845 . }
  OPTIONAL { ?person wdt:P108 ?employer . }
  OPTIONAL { ?person wdt:P39 ?position . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" . }
}
LIMIT 80
"""


def wikidata_politicos_espana() -> list[dict]:
    """Descarga lista de políticos españoles desde Wikidata."""
    headers = {
        "Accept": "application/sparql-results+json",
        "User-Agent": "Politeia/2.0 (research)",
    }
    params = {"query": _SPARQL_POLITICOS_ES, "format": "json"}
    resp = _safe_get(_WIKIDATA_SPARQL, params=params, timeout=20.0)
    if not resp:
        _log("wikidata", "politicos_es", False, "no response")
        return []
    try:
        data = resp.json()
        resultados = []
        for b in data.get("results", {}).get("bindings", []):
            def val(k: str) -> str:
                return b.get(k, {}).get("value", "")
            resultados.append({
                "wikidata_id": val("person").split("/")[-1],
                "nombre": val("personLabel"),
                "partido": val("partyLabel"),
                "cargo": val("positionLabel"),
                "nacimiento": val("birthDate")[:10] if val("birthDate") else "",
                "genero": val("genderLabel"),
                "tipo": "politico",
                "fuente": "wikidata",
            })
        _log("wikidata", "politicos_es", True, f"{len(resultados)} encontrados")
        return resultados
    except Exception as exc:
        _log("wikidata", "politicos_es", False, str(exc))
        return []


def wikidata_perfil_actor(wikidata_id: str) -> dict:
    """Obtiene datos detallados de un actor concreto de Wikidata."""
    if not wikidata_id or not wikidata_id.startswith("Q"):
        return {}

    sparql = f"""
SELECT ?prop ?propLabel ?val ?valLabel WHERE {{
  VALUES ?person {{ wd:{wikidata_id} }}
  ?person ?claim ?statement .
  ?prop wikibase:directClaim ?claim .
  BIND(?statement AS ?val)
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" . }}
}}
LIMIT 50
"""
    params = {"query": sparql, "format": "json"}
    resp = _safe_get(_WIKIDATA_SPARQL, params=params, timeout=15.0)
    if not resp:
        return {}
    try:
        data = resp.json()
        props: dict[str, list[str]] = {}
        for b in data.get("results", {}).get("bindings", []):
            k = b.get("propLabel", {}).get("value", "")
            v = b.get("valLabel", {}).get("value", "")
            if k and v:
                props.setdefault(k, []).append(v)
        return {k: v[0] if len(v) == 1 else v for k, v in props.items()}
    except Exception:
        return {}


# ═══════════════════════════════════════════════════════════════════════════════
# PRESS SCRAPER — Menciones y relaciones desde prensa
# ═══════════════════════════════════════════════════════════════════════════════

# Patrones verbales para clasificar tipo de relación
_VERBOS_RELACION = {
    "adversarial": [
        r"acus[aó] a", r"critic[aó] a", r"atac[aó] a", r"denunci[aó] a",
        r"rechaz[aó] a", r"opon[eié] a", r"enfrent[aó] a", r"insult[aó] a",
    ],
    "alianza": [
        r"apoy[aó] a", r"pact[aó] con", r"acord[oó] con", r"negoci[aó] con",
        r"se alió con", r"firm[aó] con", r"alcanz[oó] acuerdo con",
    ],
    "gubernamental": [
        r"nombr[oó] a", r"design[oó] a", r"ministr[oa] de", r"gobierno de",
        r"coalición", r"presiden[tce]",
    ],
    "mediatico": [
        r"entrevistó a", r"publicó sobre", r"inform[oó] sobre",
        r"cobertura de", r"declaró a",
    ],
    "lobby": [
        r"lobby", r"pres[ioóe]nó a", r"reuni[oó] con", r"demandó al",
        r"exigió al", r"presión sobre",
    ],
}

# Actores conocidos para NER ligero (mapa nombre → id)
_ACTOR_ALIASES: dict[str, str] = {}  # Se puebla desde actors_service


def registrar_aliases(aliases: dict[str, str]) -> None:
    """Registra el mapa de nombres → id para el NER."""
    global _ACTOR_ALIASES
    _ACTOR_ALIASES.update(aliases)


def extraer_actores_mencionados(texto: str) -> list[str]:
    """
    Extrae IDs de actores mencionados en un texto.
    Usa el mapa de aliases registrado.
    """
    texto_lower = texto.lower()
    encontrados = []
    for alias, actor_id in _ACTOR_ALIASES.items():
        if alias.lower() in texto_lower:
            if actor_id not in encontrados:
                encontrados.append(actor_id)
    return encontrados


def inferir_tipo_relacion(texto: str, actor_from: str, actor_to: str) -> tuple[str, float]:
    """
    Infiere tipo y fuerza de relación entre dos actores a partir de texto.
    Retorna (tipo_relacion, confianza 0-1).
    """
    texto_lower = texto.lower()

    # Buscar patrones de relación entre los dos actores
    nombre_from = actor_from.replace("_", " ")
    nombre_to = actor_to.replace("_", " ")

    # Ventana de texto entre las dos menciones
    idx_from = texto_lower.find(nombre_from.lower())
    idx_to = texto_lower.find(nombre_to.lower())

    if idx_from >= 0 and idx_to >= 0:
        inicio = min(idx_from, idx_to)
        fin = max(idx_from, idx_to) + max(len(nombre_from), len(nombre_to))
        ventana = texto_lower[max(0, inicio - 50): fin + 50]
    else:
        ventana = texto_lower

    for tipo, patrones in _VERBOS_RELACION.items():
        for patron in patrones:
            if re.search(patron, ventana, re.IGNORECASE):
                return tipo, 0.7

    # Sin patrón → co-mención genérica
    return "relacionado", 0.4


def scrape_menciones_rss(actores_ids: list[str]) -> list[dict]:
    """
    Obtiene menciones de actores desde los feeds RSS disponibles.
    Retorna lista de {actor_id, medio, titulo, url, fecha, extracto}.
    """
    menciones = []
    try:
        from dashboard.services.rss_feeds import obtener_noticias_recientes
        noticias = obtener_noticias_recientes(max_items=80)
    except Exception:
        noticias = []

    for noticia in noticias:
        titulo = noticia.get("titulo", "")
        resumen = noticia.get("resumen", "")
        texto = f"{titulo} {resumen}"
        actores_en_noticia = extraer_actores_mencionados(texto)

        for aid in actores_en_noticia:
            menciones.append({
                "actor_id": aid,
                "medio": noticia.get("medio", ""),
                "titulo": titulo[:200],
                "url": noticia.get("url", ""),
                "fecha": noticia.get("fecha", ""),
                "extracto": resumen[:400],
                "sentimiento": noticia.get("sentimiento", "neutro"),
                "co_menciones": [a for a in actores_en_noticia if a != aid],
            })

    return menciones


def extraer_relaciones_de_noticias(noticias: list[dict]) -> list[dict]:
    """
    Procesa noticias y extrae relaciones entre actores co-mencionados.
    Retorna lista de {actor_from, actor_to, tipo, label, fuerza, fuente}.
    """
    relaciones_raw: dict[tuple, dict] = {}

    for noticia in noticias:
        titulo = noticia.get("titulo", "")
        resumen = noticia.get("resumen", "")
        texto = f"{titulo}. {resumen}"
        actores = extraer_actores_mencionados(texto)

        if len(actores) < 2:
            continue

        # Generar pares de actores mencionados juntos
        for i, a1 in enumerate(actores):
            for a2 in actores[i + 1:]:
                clave = (min(a1, a2), max(a1, a2))
                tipo, confianza = inferir_tipo_relacion(texto, a1, a2)

                if clave not in relaciones_raw:
                    relaciones_raw[clave] = {
                        "actor_from": a1,
                        "actor_to": a2,
                        "tipo": tipo,
                        "label": _label_por_tipo(tipo),
                        "fuerza": confianza,
                        "fuente": "prensa",
                        "n_menciones": 1,
                        "ultima_mencion": noticia.get("fecha", ""),
                        "medio": noticia.get("medio", ""),
                    }
                else:
                    # Reforzar relación existente
                    entrada = relaciones_raw[clave]
                    entrada["n_menciones"] = entrada.get("n_menciones", 1) + 1
                    entrada["fuerza"] = min(1.0, entrada["fuerza"] + 0.1)
                    entrada["ultima_mencion"] = noticia.get("fecha", "") or entrada["ultima_mencion"]
                    # Si el nuevo tipo es más específico, actualizar
                    if tipo != "relacionado"and entrada["tipo"] == "relacionado":
                        entrada["tipo"] = tipo
                        entrada["label"] = _label_por_tipo(tipo)

    return list(relaciones_raw.values())


def _label_por_tipo(tipo: str) -> str:
    labels = {
        "adversarial":   "Tensión / conflicto",
        "alianza":       "Alianza / acuerdo",
        "gubernamental": "Relación institucional",
        "mediatico":     "Relación mediática",
        "lobby":         "Presión / lobby",
        "sindical":      "Concertación sindical",
        "empresarial":   "Relación empresarial",
        "relacionado":   "Co-mención en prensa",
    }
    return labels.get(tipo, tipo)


# ═══════════════════════════════════════════════════════════════════════════════
# ENRICHER PRINCIPAL — Enriquece un actor con todos los scrapers
# ═══════════════════════════════════════════════════════════════════════════════

def enriquecer_actor(actor: dict, force: bool = False) -> dict:
    """
    Enriquece el perfil de un actor con datos de Wikipedia y Wikidata.
    Modifica el dict in-place y retorna el mismo dict enriquecido.

    Añade: extracto, foto_url, nacimiento, descripcion, wikipedia_url, wikidata_id
    """
    actor_id = actor.get("id", "")
    nombre = actor.get("nombre", "")

    if not nombre:
        return actor

    # Skip si ya tiene datos frescos y no es forzado
    if not force and actor.get("wikipedia_extracto") and actor.get("fecha_enriquecido"):
        try:
            fecha = datetime.fromisoformat(actor["fecha_enriquecido"])
            if (datetime.now() - fecha).days < 7:
                return actor
        except Exception:
            pass

    # 1. Wikipedia
    titulo_wiki = actor.get("wikipedia_titulo", "")
    perfil_wiki = wikipedia_perfil(nombre, titulo_wiki)
    if perfil_wiki:
        actor.update({
            "wikipedia_titulo": perfil_wiki.get("wikipedia_titulo", ""),
            "wikipedia_url": perfil_wiki.get("wikipedia_url", ""),
            "wikipedia_extracto": perfil_wiki.get("extracto", ""),
            "descripcion": perfil_wiki.get("descripcion", ""),
            "foto_url": actor.get("foto_url") or perfil_wiki.get("foto_url", ""),
            "nacimiento_fecha": actor.get("nacimiento_fecha") or perfil_wiki.get("nacimiento_fecha", ""),
            "wikidata_id": actor.get("wikidata_id") or perfil_wiki.get("wikidata_id", ""),
        })

    time.sleep(_RATE_LIMIT)

    # 2. Wikidata (si tenemos wikidata_id)
    wikidata_id = actor.get("wikidata_id", "")
    if wikidata_id:
        datos_wd = wikidata_perfil_actor(wikidata_id)
        if datos_wd:
            actor["wikidata_datos"] = {k: v for k, v in datos_wd.items()
                                        if k in ("partido político", "cargo", "posición",
                                                 "empleador", "fecha de nacimiento", "lugar de nacimiento")}
        time.sleep(_RATE_LIMIT)

    actor["fecha_enriquecido"] = datetime.now().isoformat()
    _log("enriquecimiento", nombre, True, f"wiki={bool(perfil_wiki)}, wikidata={bool(wikidata_id)}")
    return actor


def enriquecer_lote(actores: list[dict], max_actores: int = 20, force: bool = False) -> list[dict]:
    """
    Enriquece un lote de actores con rate limiting.
    Procesa máximo max_actores por llamada para no sobrecargar las APIs.
    """
    resultado = []
    for i, actor in enumerate(actores[:max_actores]):
        try:
            enriquecido = enriquecer_actor(actor.copy(), force=force)
            resultado.append(enriquecido)
        except Exception as exc:
            _log("enriquecimiento", actor.get("nombre", "?"), False, str(exc))
            resultado.append(actor)
        time.sleep(0.5)

    return resultado


def get_log() -> list[dict]:
    """Retorna el log de scraping."""
    return list(reversed(_SCRAPE_LOG))


def get_log_stats() -> dict:
    """Estadísticas del log de scraping."""
    total = len(_SCRAPE_LOG)
    ok = sum(1 for e in _SCRAPE_LOG if e.get("ok"))
    tipos = {}
    for e in _SCRAPE_LOG:
        tipos[e.get("tipo", "?")] = tipos.get(e.get("tipo", "?"), 0) + 1
    return {
        "total": total,
        "exitosos": ok,
        "fallidos": total - ok,
        "por_tipo": tipos,
    }
