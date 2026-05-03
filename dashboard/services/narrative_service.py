"""
dashboard.services.narrative_service
======================================
Servicio de extraccion de narrativas en tiempo real.

Pipeline:
  1. Ingesta RSS de fuentes prioritarias (local_spain + regional_spain primero,
     luego europe si hay tiempo) usando los patrones de news_ingestion.py
  2. Deduplicacion y limpieza de titulares
  3. Extraccion de narrativas via Ollama (qwen3:8b):
       - Clustering semantico liviano (TF-IDF + similitud de embeddings si disponible)
       - Para cada cluster: etiqueta narrativa + intensidad + delta + velocidad + estructura
  4. Retorna lista de dicts compatible con _NARRATIVAS_DEMO de D7_Medios

Uso desde Streamlit:
    from dashboard.services.narrative_service import NarrativeService
    ns = NarrativeService()
    narrativas = ns.get_narrativas(max_fuentes=80, ttl_min=20)

La funcion get_narrativas_cached() esta decorada con @st.cache_data y es la
que debe llamarse desde el dashboard.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

import feedparser
import requests

log = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen3:8b"

# ---------------------------------------------------------------------------
# Fuentes prioritarias: medios españoles con RSS fiable
# Se priorizan sobre las 350 fuentes internacionales para narrativa politica
# ---------------------------------------------------------------------------

_SPAIN_PRIORITY_SOURCES: list[dict] = [
    # Generalistas nacionales
    {"name": "El Pais",         "rss": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",         "ideologia": "centroizquierda"},
    {"name": "El Pais Politica","rss": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/politica/portada","ideologia": "centroizquierda"},
    {"name": "El Mundo",        "rss": "https://e00-elmundo.uecdn.es/elmundo/rss/espana.xml",                       "ideologia": "centroderecha"},
    {"name": "El Confidencial", "rss": "https://rss.elconfidencial.com/espana/",                                   "ideologia": "centroderecha"},
    {"name": "El Espanol",      "rss": "https://www.elespanol.com/rss/",                                           "ideologia": "centroderecha"},
    {"name": "ABC",             "rss": "https://www.abc.es/rss/feeds/abc_EspanaEspana.xml",                        "ideologia": "derecha"},
    {"name": "La Razon",        "rss": "https://www.larazon.es/rss/",                                             "ideologia": "derecha"},
    {"name": "OK Diario",       "rss": "https://okdiario.com/feed",                                               "ideologia": "derecha_radical"},
    {"name": "El Diario",       "rss": "https://www.eldiario.es/rss/",                                            "ideologia": "izquierda"},
    {"name": "Publico",         "rss": "https://www.publico.es/rss/",                                             "ideologia": "izquierda"},
    {"name": "infoLibre",       "rss": "https://www.infolibre.es/rss/",                                           "ideologia": "izquierda"},
    {"name": "La Vanguardia",   "rss": "https://www.lavanguardia.com/rss/home.xml",                               "ideologia": "centroizquierda"},
    {"name": "20 Minutos",      "rss": "https://www.20minutos.es/rss/",                                           "ideologia": "centro"},
    {"name": "El HuffPost ES",  "rss": "https://www.huffingtonpost.es/feeds/index.xml",                           "ideologia": "centroizquierda"},
    {"name": "Vozpopuli",       "rss": "https://vozpopuli.com/feed/",                                             "ideologia": "centroderecha"},
    {"name": "El Plural",       "rss": "https://www.elplural.com/feed/",                                          "ideologia": "izquierda"},
    {"name": "El Salto Diario", "rss": "https://www.elsaltodiario.com/feed/",                                     "ideologia": "izquierda_radical"},
    {"name": "Ctxt",            "rss": "https://ctxt.es/rss",                                                     "ideologia": "izquierda"},
    # Agencias
    {"name": "Europa Press",    "rss": "https://www.europapress.es/rss/rss.aspx",                                  "ideologia": "neutral"},
    {"name": "EFE Politica",    "rss": "https://www.efe.com/efe/espana/portada/rss_2",                            "ideologia": "neutral"},
    # Economia
    {"name": "Expansion",       "rss": "https://e00-expansion.uecdn.es/rss/portada.xml",                          "ideologia": "centroderecha"},
    {"name": "El Economista",   "rss": "https://www.eleconomista.es/rss/rss-portada.php",                        "ideologia": "centroderecha"},
    {"name": "Cinco Dias",      "rss": "https://cincodias.elpais.com/rss/feeds/cincodias.xml",                   "ideologia": "neutral"},
    # Regionales clave
    {"name": "La Voz de Galicia","rss": "https://www.lavozdegalicia.es/rss/portada.xml",                         "ideologia": "centro"},
    {"name": "El Correo",       "rss": "https://www.elcorreo.com/rss/feeds/portada.xml",                         "ideologia": "centroderecha"},
    {"name": "El Periodico",    "rss": "https://www.elperiodico.com/es/rss/rss_portada.xml",                     "ideologia": "centroizquierda"},
    {"name": "Heraldo de Aragon","rss": "https://www.heraldo.es/rss/portada.xml",                                "ideologia": "centro"},
    {"name": "Ara",             "rss": "https://www.ara.cat/rss.xml",                                            "ideologia": "izquierda"},
    {"name": "VilaWeb",         "rss": "https://www.vilaweb.cat/rss.xml",                                        "ideologia": "izquierda"},
    {"name": "Nacio Digital",   "rss": "https://www.naciodigital.cat/rss.xml",                                   "ideologia": "izquierda"},
    # Internacionales para contexto
    {"name": "Politico EU",     "rss": "https://www.politico.eu/feed/",                                          "ideologia": "neutral"},
    {"name": "Reuters",         "rss": "https://feeds.reuters.com/reuters/topNews",                              "ideologia": "neutral"},
    {"name": "El Pais Global",  "rss": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada","ideologia": "centroizquierda"},
]

# Palabras clave de politica espanola para filtrar noticias relevantes
_POLITICA_KW = {
    "sanchez", "feijoo", "abascal", "yolanda", "podemos", "sumar", "psoe",
    "partido popular", "vox", "congreso", "senado", "gobierno", "oposicion",
    "parlamento", "ministro", "ministra", "presidente", "presupuesto",
    "mocion", "reforma", "decreto", "cataluna", "independencia", "pnv",
    "bildu", "junts", "erc", "elecciones", "votacion", "corrupcion",
    "migracion", "inmigracion", "vivienda", "alquiler", "pensiones",
    "sanidad", "educacion", "energia", "clima", "impuesto", "deuda",
    "economia", "desempleo", "paro", "huelga", "sindicato", "ue", "otan",
    "ukraine", "ucrania", "trump", "aranceles", "ceuta", "melilla", "mena",
}

# Narrativas politicas canonicas para clasificacion orientada
_NARRATIVAS_CANON: list[str] = [
    "Crisis economica y coste de vida",
    "Corrupcion institucional",
    "Independentismo catalan",
    "Inmigracion irregular",
    "Reforma fiscal y presupuestos",
    "Vivienda asequible",
    "Polarizacion politica",
    "Derechos sociales y bienestar",
    "Politica exterior y OTAN",
    "Cambio climatico y transicion energetica",
    "Sanidad publica",
    "Educacion y juventud",
    "Seguridad ciudadana",
    "Feminismo y brecha de genero",
    "Reformas judiciales",
]


# ---------------------------------------------------------------------------
# Ingestion de noticias
# ---------------------------------------------------------------------------

def _clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = re.sub(r"&[a-z#0-9]+;", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _url_hash(url: str) -> str:
    return hashlib.sha1(url.encode()).hexdigest()[:16]


def _parse_date(entry) -> datetime:
    for field in ("published_parsed", "updated_parsed"):
        val = getattr(entry, field, None)
        if val:
            try:
                import calendar
                return datetime.fromtimestamp(calendar.timegm(val), tz=timezone.utc)
            except Exception:
                pass
    return datetime.now(tz=timezone.utc)


def fetch_source(source: dict, max_articles: int = 15, timeout: int = 10) -> list[dict]:
    """Descarga y parsea un feed RSS. Retorna lista de dicts normalizados."""
    articles = []
    rss = source.get("rss", "")
    if not rss:
        return articles
    try:
        feed = feedparser.parse(
            rss,
            request_headers={"User-Agent": "ElectSim-NarrativeBot/1.0"},
            request_timeout=timeout,
        )
        for entry in (feed.entries or [])[:max_articles]:
            url = getattr(entry, "link", "") or getattr(entry, "id", "")
            if not url:
                continue
            title = _clean(getattr(entry, "title", ""))
            summary = _clean(getattr(entry, "summary", "") or getattr(entry, "description", ""))
            if not title:
                continue
            articles.append({
                "id": _url_hash(url),
                "titulo": title,
                "resumen": summary[:400],
                "url": url,
                "medio": source["name"],
                "ideologia": source.get("ideologia", "neutral"),
                "fecha": _parse_date(entry),
                "texto": f"{title} {summary}",
            })
    except Exception as exc:
        log.debug("RSS fetch error %s: %s", source["name"], exc)
    return articles


def ingest_spain_news(max_sources: int = 80, max_articles_per_source: int = 12) -> list[dict]:
    """
    Ingesta noticias de las fuentes prioritarias espanolas.
    Usa las 350 fuentes de media_sources si max_sources > len(_SPAIN_PRIORITY_SOURCES).
    """
    all_articles: list[dict] = []
    seen_ids: set[str] = set()

    sources_to_use = _SPAIN_PRIORITY_SOURCES[:max_sources]

    # Si max_sources > fuentes prioritarias, completa con ALL_SOURCES
    if max_sources > len(_SPAIN_PRIORITY_SOURCES):
        try:
            from dashboard.services.media_sources import ALL_SOURCES
            extra = [
                s for s in ALL_SOURCES
                if s.get("country", "") == "Spain"
                and s["name"] not in {s2["name"] for s2 in sources_to_use}
            ]
            sources_to_use = sources_to_use + extra[:max_sources - len(sources_to_use)]
        except Exception as exc:
            log.warning("media_sources import error: %s", exc)

    log.info("Ingesting from %d sources", len(sources_to_use))

    for source in sources_to_use:
        articles = fetch_source(source, max_articles=max_articles_per_source)
        for art in articles:
            if art["id"] not in seen_ids:
                seen_ids.add(art["id"])
                all_articles.append(art)
        time.sleep(0.05)  # cortesia

    # Ordenar por fecha DESC
    all_articles.sort(key=lambda x: x["fecha"], reverse=True)
    log.info("Ingested %d unique articles", len(all_articles))
    return all_articles


def filter_political(articles: list[dict], min_score: int = 1) -> list[dict]:
    """Filtra articulos con contenido politico por keywords."""
    result = []
    for art in articles:
        text_low = art["texto"].lower()
        score = sum(1 for kw in _POLITICA_KW if kw in text_low)
        if score >= min_score:
            art["politica_score"] = score
            result.append(art)
    return result


# ---------------------------------------------------------------------------
# Extraccion de narrativas con Ollama
# ---------------------------------------------------------------------------

def _ollama_extract_narratives(
    articles: list[dict],
    n_narrativas: int = 12,
    model: str = OLLAMA_MODEL,
    ollama_url: str = OLLAMA_BASE_URL,
) -> list[dict]:
    """
    Llama a Ollama para extraer narrativas desde un corpus de titulares.
    Retorna lista de dicts con estructura compatible con _NARRATIVAS_DEMO.
    """
    # Preparar muestra de titulares agrupados por ideologia
    sample_by_ideology: dict[str, list[str]] = defaultdict(list)
    for art in articles[:200]:
        sample_by_ideology[art.get("ideologia", "neutral")].append(art["titulo"])

    # Seleccionar muestra equilibrada (max 8 por ideologia, max 120 total)
    sample_headlines: list[str] = []
    for ideo, headlines in sample_by_ideology.items():
        sample_headlines.extend(headlines[:8])
    sample_headlines = sample_headlines[:120]

    headlines_str = "\n".join(f"- {h}" for h in sample_headlines)
    canon_str = "\n".join(f"  - {n}" for n in _NARRATIVAS_CANON)

    prompt = f"""Eres un analista de inteligencia politica espanola experta en comunicacion estrategica.

Analiza los siguientes titulares de medios espanoles e identifica las narrativas politicas dominantes HOY.

TITULARES:
{headlines_str}

NARRATIVAS DE REFERENCIA (puedes identificar estas u otras si emergen de los datos):
{canon_str}

Extrae exactamente {n_narrativas} narrativas con presencia real en los titulares.
Para cada narrativa calcula intensidad real (0-100), velocidad (articulos/h estimada), delta (cambio respecto ayer estimado).

Responde SOLO con JSON valido, sin markdown:
{{
  "narrativas": [
    {{
      "nombre": "nombre preciso de la narrativa (max 5 palabras)",
      "intensidad": 75,
      "velocidad": 8.2,
      "delta": 3,
      "marco": "conflicto|economico|moralidad|interes_humano|estrategia_politica|atribucion_responsabilidad",
      "tension": "alta|media|baja",
      "actores_principales": ["Actor1", "Actor2"],
      "titulares_representativos": ["Titular 1", "Titular 2"],
      "elementos": ["elemento narrativo 1", "elemento narrativo 2", "elemento narrativo 3"],
      "difusores": ["Medio/actor difusor 1", "Difusor 2"],
      "potenciadores": ["Factor que amplifica 1", "Factor que amplifica 2"],
      "debilitadores": ["Factor que debilita 1", "Factor que debilita 2"],
      "target": "Descripcion precisa del publico objetivo de esta narrativa",
      "ideologia_dominante": "izquierda|centroizquierda|centro|centroderecha|derecha|radical|transversal",
      "tendencia": [50, 55, 58, 62, 65, 70, 75]
    }}
  ]
}}"""

    try:
        resp = requests.post(
            f"{ollama_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.2, "num_predict": 3000},
            },
            timeout=120,
        )
        resp.raise_for_status()
        raw = resp.json().get("response", "")
        # Limpiar bloques de razonamiento
        raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return data.get("narrativas", [])
    except requests.exceptions.ConnectionError:
        log.warning("Ollama no disponible en %s", ollama_url)
    except Exception as exc:
        log.warning("Ollama narrative extraction error: %s", exc)

    return []


def _tfidf_cluster_narratives(
    articles: list[dict],
    n_clusters: int = 12,
) -> list[dict]:
    """
    Fallback: clustering TF-IDF + KMeans para cuando Ollama no esta disponible.
    Retorna narrativas con estructura compatible con _NARRATIVAS_DEMO.
    """
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.cluster import KMeans
        import numpy as np

        texts = [art["titulo"] + " " + art["resumen"] for art in articles]
        if len(texts) < n_clusters:
            n_clusters = max(2, len(texts) // 2)

        vec = TfidfVectorizer(
            max_features=300,
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True,
        )
        X = vec.fit_transform(texts)
        feature_names = vec.get_feature_names_out()

        km = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
        labels = km.fit_predict(X)

        narrativas = []
        for cid in range(n_clusters):
            mask = [i for i, l in enumerate(labels) if l == cid]
            if not mask:
                continue

            # Keywords del centroide
            import numpy as np
            center = km.cluster_centers_[cid]
            top_idx = center.argsort()[-6:][::-1]
            keywords = [feature_names[i] for i in top_idx]

            # Nombre: top 3 keywords
            nombre = " + ".join(keywords[:3]).title()

            # Medios representativos
            cluster_medios = [articles[i]["medio"] for i in mask]
            top_medios = [m for m, _ in Counter(cluster_medios).most_common(3)]

            # Intensidad proporcional al tamano del cluster
            intensidad = min(100, int(len(mask) / max(len(articles), 1) * 100 * n_clusters))

            narrativas.append({
                "nombre": nombre,
                "intensidad": intensidad,
                "velocidad": round(len(mask) / 24, 1),
                "delta": 0,
                "marco": "sin_clasificar",
                "tension": "media",
                "actores_principales": [],
                "titulares_representativos": [articles[i]["titulo"] for i in mask[:2]],
                "elementos": keywords[:4],
                "difusores": top_medios,
                "potenciadores": [],
                "debilitadores": [],
                "target": "Ciudadania general",
                "ideologia_dominante": "transversal",
                "tendencia": [max(0, intensidad - 20 + i * 3) for i in range(7)],
            })

        return sorted(narrativas, key=lambda x: -x["intensidad"])

    except ImportError:
        log.warning("scikit-learn no disponible para clustering fallback")
        return []
    except Exception as exc:
        log.warning("TF-IDF cluster error: %s", exc)
        return []


def _enrich_narrativa_structure(
    narrativa: dict,
    articles: list[dict],
    ollama_url: str = OLLAMA_BASE_URL,
    model: str = OLLAMA_MODEL,
) -> dict:
    """
    Enriquece una narrativa individual con analisis profundo Ollama:
    elementos, difusores, potenciadores, debilitadores, target.
    Solo se llama si la narrativa inicial carece de estos campos.
    """
    if narrativa.get("elementos") and narrativa.get("target"):
        return narrativa  # ya tiene estructura, no reanalizar

    # Titulares relacionados a esta narrativa
    nombre_kw = narrativa["nombre"].lower().split()[:3]
    rel = [
        art["titulo"] for art in articles
        if any(kw in art["titulo"].lower() for kw in nombre_kw)
    ][:10]

    if not rel:
        return narrativa

    prompt = f"""Narrativa politica: "{narrativa['nombre']}"

Titulares relacionados:
{chr(10).join(f"- {t}" for t in rel)}

Proporciona en JSON:
{{
  "elementos": ["claim o argumento central 1", "claim 2", "claim 3"],
  "difusores": ["actor o medio que difunde", "difusor 2"],
  "potenciadores": ["factor que amplifica la narrativa", "potenciador 2"],
  "debilitadores": ["factor que debilita o contradice la narrativa", "debilitador 2"],
  "target": "descripcion del publico objetivo (edad, ideologia, situacion economica, territorio)"
}}"""

    try:
        resp = requests.post(
            f"{ollama_url}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False,
                  "options": {"temperature": 0.25, "num_predict": 600}},
            timeout=45,
        )
        resp.raise_for_status()
        raw = resp.json().get("response", "")
        raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            extra = json.loads(m.group())
            narrativa.update(extra)
    except Exception:
        pass

    return narrativa


# ---------------------------------------------------------------------------
# NarrativeService — punto de entrada unico
# ---------------------------------------------------------------------------

class NarrativeService:
    """
    Servicio de extraccion de narrativas en tiempo real.

    Uso:
        ns = NarrativeService()
        narrativas = ns.get_narrativas(max_fuentes=80)
    """

    def __init__(
        self,
        ollama_url: str = OLLAMA_BASE_URL,
        ollama_model: str = OLLAMA_MODEL,
    ) -> None:
        self.ollama_url = ollama_url
        self.ollama_model = ollama_model

    def get_narrativas(
        self,
        max_fuentes: int = 60,
        n_narrativas: int = 12,
        max_articles_per_source: int = 12,
        politica_filter: bool = True,
    ) -> list[dict]:
        """
        Pipeline completo: ingesta -> filtrado -> clustering -> analisis LLM.

        Returns:
            Lista de dicts con estructura compatible con _NARRATIVAS_DEMO de D7_Medios.
            Cada dict tiene: nombre, intensidad, velocidad, delta, marco, tension,
            actores_principales, titulares_representativos, elementos, difusores,
            potenciadores, debilitadores, target, ideologia_dominante, tendencia.
        """
        # 1. Ingesta
        log.info("Ingesting news for narrative analysis...")
        articles = ingest_spain_news(
            max_sources=max_fuentes,
            max_articles_per_source=max_articles_per_source,
        )
        if not articles:
            log.warning("No articles ingested, returning empty narratives")
            return []

        # 2. Filtrado politico
        if politica_filter:
            political = filter_political(articles, min_score=1)
            if len(political) < 20:
                political = articles  # si hay muy pocos politicos, usar todos
        else:
            political = articles

        log.info("Political articles: %d / %d", len(political), len(articles))

        # 3. Extraccion via Ollama
        narrativas = _ollama_extract_narratives(
            political,
            n_narrativas=n_narrativas,
            model=self.ollama_model,
            ollama_url=self.ollama_url,
        )

        # 4. Fallback TF-IDF si Ollama falla
        if not narrativas:
            log.info("Falling back to TF-IDF clustering")
            narrativas = _tfidf_cluster_narratives(political, n_clusters=n_narrativas)

        # 5. Normalizar y enriquecer
        narrativas = [self._normalize(n) for n in narrativas]

        log.info("Extracted %d narrativas", len(narrativas))
        return narrativas

    def get_article_sample(
        self,
        narrativa_nombre: str,
        max_fuentes: int = 30,
    ) -> list[dict]:
        """
        Devuelve articulos recientes relacionados con una narrativa especifica.
        Para el cruce con la pestaña de narrativas.
        """
        articles = ingest_spain_news(max_sources=max_fuentes, max_articles_per_source=8)
        kws = narrativa_nombre.lower().split()[:4]
        related = [
            art for art in articles
            if any(kw in art["titulo"].lower() or kw in art["resumen"].lower() for kw in kws)
        ]
        return related[:30]

    @staticmethod
    def _normalize(n: dict) -> dict:
        """Asegura que la narrativa tiene todos los campos esperados por D7_Medios."""
        defaults = {
            "nombre": "Narrativa sin etiquetar",
            "intensidad": 50,
            "velocidad": 2.0,
            "delta": 0,
            "marco": "sin_clasificar",
            "tension": "media",
            "actores_principales": [],
            "titulares_representativos": [],
            "elementos": ["Sin datos suficientes"],
            "difusores": ["Medios generalistas"],
            "potenciadores": [],
            "debilitadores": [],
            "target": "Ciudadania general",
            "ideologia_dominante": "transversal",
            "tendencia": [40, 43, 46, 48, 50, 52, 50],
        }
        result = {**defaults, **n}
        # Asegurar tipos correctos
        result["intensidad"] = max(0, min(100, int(result["intensidad"] or 50)))
        result["velocidad"] = float(result["velocidad"] or 2.0)
        result["delta"] = int(result["delta"] or 0)
        if not isinstance(result["tendencia"], list) or len(result["tendencia"]) < 7:
            base = result["intensidad"]
            result["tendencia"] = [max(0, min(100, base - 10 + i * 2)) for i in range(7)]
        return result


# ---------------------------------------------------------------------------
# Funcion Streamlit con cache
# ---------------------------------------------------------------------------

def get_narrativas_cached(
    max_fuentes: int = 60,
    n_narrativas: int = 12,
    ollama_url: str = OLLAMA_BASE_URL,
    ollama_model: str = OLLAMA_MODEL,
) -> list[dict]:
    """
    Extrae narrativas con cache Streamlit de 20 minutos.
    Llama a esta funcion desde D7_Medios.py.

    NOTA: No decoramos aqui con @st.cache_data porque no podemos importar
    streamlit en este modulo de forma segura. El decorador se aplica en el
    punto de llamada en D7_Medios.py.
    """
    ns = NarrativeService(ollama_url=ollama_url, ollama_model=ollama_model)
    return ns.get_narrativas(max_fuentes=max_fuentes, n_narrativas=n_narrativas)
