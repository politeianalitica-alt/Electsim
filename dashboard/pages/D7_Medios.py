"""
ELECTSIM — D7 Monitor de Medios & Narrativa (Premium Edition)
Media Intelligence Monitor: cobertura en tiempo real, sentimiento por actor,
análisis de fuentes, radar de narrativas y análisis comparativo.
"""
from __future__ import annotations

import html
import re
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    COLORES_PARTIDOS,
    section_header, kpi_card,
    intel_header, scrolling_ticker, news_card,
    sidebar_nav, mostrar_alertas_pagina,
    hex_to_rgba,
)

st.set_page_config(
    page_title="Monitor de Medios — ElectSim",
    page_icon="",
    layout="wide",
)
sidebar_nav()
mostrar_alertas_pagina("medios")

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
.stApp {{background:{BG};}}
.news-card-grid {{
    display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;
}}
.media-card {{
    background:{BG2};border:1px solid {BORDER};border-radius:10px;
    padding:.9rem 1rem;transition:border-color .2s,box-shadow .2s;
}}
.media-card:hover {{border-color:{CYAN}55;box-shadow:0 0 14px {CYAN}15;}}
.badge {{
    display:inline-block;padding:.15rem .5rem;border-radius:4px;
    font-size:.65rem;font-weight:700;margin-right:.3rem;
}}
.tag-cloud-item {{
    display:inline-block;padding:.25rem .7rem;border-radius:20px;
    margin:.2rem;font-weight:600;cursor:default;transition:transform .2s;
}}
.tag-cloud-item:hover {{transform:scale(1.08);}}
.narrative-pill {{
    background:{BG3};border:1px solid {BORDER};border-radius:8px;
    padding:.5rem .8rem;margin:.25rem 0;display:flex;
    align-items:center;gap:.6rem;
}}
.kpi-box {{
    background:{BG2};border:1px solid {BORDER};border-radius:10px;
    padding:.9rem 1.1rem;text-align:center;
    border-top:2px solid {CYAN}55;
}}
</style>
""", unsafe_allow_html=True)

# ═════════════════════════════════════════════════════════════════════════════
# Service imports with graceful fallback
# ═════════════════════════════════════════════════════════════════════════════
try:
    from dashboard.services.data_aggregator import (
        get_news, get_trending_actors, get_macro_snapshot,
        get_sentiment_scores, get_actor_mention_counts,
        NewsAggregator, SentimentEstimator, ActorMentionExtractor,
        ACTORES_ES, RSS_FEEDS,
    )
    _AGG_OK = True
except Exception:
    _AGG_OK = False

try:
    from dashboard.services.llm_local import chat, esta_disponible
    _LLM_OK = esta_disponible()
except Exception:
    _LLM_OK = False
    def chat(msg: str, sistema: str = "") -> str:
        return "IA local no disponible."

try:
    from dashboard.services import git_amigos_bridge as _git_amigos
except Exception:
    _git_amigos = None  # type: ignore


# ═════════════════════════════════════════════════════════════════════════════
# Data helpers
# ═════════════════════════════════════════════════════════════════════════════

_DEMO_NEWS: list[dict] = [
    {
        "titulo": "El Gobierno aprueba un paquete de medidas económicas históricas",
        "fuente": "elpais", "url": "#", "fecha": "2026-05-02 09:15",
        "resumen": "El Consejo de Ministros aprueba una reforma fiscal de amplio alcance.",
        "texto_completo": "", "sentimiento": 0.4,
    },
    {
        "titulo": "PP exige la dimisión del ministro tras el escándalo de corrupción",
        "fuente": "elmundo", "url": "#", "fecha": "2026-05-02 10:30",
        "resumen": "El principal partido de la oposición aumenta la presión sobre el ejecutivo.",
        "texto_completo": "", "sentimiento": -0.6,
    },
    {
        "titulo": "Feijóo presenta su plan alternativo para bajar el paro juvenil",
        "fuente": "abc", "url": "#", "fecha": "2026-05-02 11:00",
        "resumen": "El líder del PP propone incentivos fiscales para empresas que contraten jóvenes.",
        "texto_completo": "", "sentimiento": 0.2,
    },
    {
        "titulo": "Puigdemont convoca a sus seguidores en Bruselas",
        "fuente": "lavanguardia", "url": "#", "fecha": "2026-05-02 08:45",
        "resumen": "El ex presidente catalán llama a la movilización ante la nueva fase judicial.",
        "texto_completo": "", "sentimiento": -0.3,
    },
    {
        "titulo": "Yolanda Díaz anuncia la extensión del SMI hasta 2027",
        "fuente": "eldiario", "url": "#", "fecha": "2026-05-02 12:00",
        "resumen": "La vicepresidenta segunda garantiza el salario mínimo por encima de la inflación.",
        "texto_completo": "", "sentimiento": 0.5,
    },
    {
        "titulo": "VOX bloquea en el Senado la reforma de la ley de vivienda",
        "fuente": "publico", "url": "#", "fecha": "2026-05-02 13:20",
        "resumen": "La oposición de derechas utiliza su mayoría en la Cámara Alta.",
        "texto_completo": "", "sentimiento": -0.4,
    },
]

_MEDIA_IDEOLOGIA: dict[str, tuple[float, float]] = {
    # name: (ideology 0=izq 10=der, circulacion_millones)
    "El País":          (3.5, 1.8),
    "El Mundo":         (7.0, 1.2),
    "ABC":              (8.2, 0.8),
    "La Vanguardia":    (5.0, 0.9),
    "El Confidencial":  (5.5, 2.1),
    "elDiario.es":      (2.1, 0.7),
    "La Razón":         (8.8, 0.4),
    "Público":          (1.8, 0.3),
    "20 Minutos":       (5.0, 1.0),
    "Infolibre":        (2.5, 0.2),
}

# ─── Narrativas extraidas en tiempo real de las fuentes RSS ──────────────────
# Motor de narrativas estilo Gotham/Nation Builder:
# Fingerprints de palabras clave por narrativa → scoring contra corpus RSS real.
# Siempre produce output (sin dependencia de Ollama ni sklearn en el camino critico).
# Ollama enriquece de forma asincrona como segunda capa opcional.


# ── Fingerprints de narrativas (Gotham-style keyword signatures) ─────────────
# Cada narrativa tiene un conjunto de palabras clave con peso.
# El scoring es: sum(peso * apariciones) / n_articulos_corpus
_NARRATIVA_FINGERPRINTS: list[dict] = [
    {
        "nombre": "Crisis economica y coste de vida",
        "marco": "economico", "tension": "alta",
        "target": "Clase media asalariada", "ideologia_dominante": "transversal",
        "keywords": {
            "inflacion": 3, "precio": 2, "ipc": 3, "coste": 2, "cesta": 2,
            "paro": 3, "desempleo": 3, "pib": 2, "recesion": 3, "prima": 2,
            "deuda": 2, "deficit": 2, "bce": 2, "tipos": 2, "economia": 1,
            "salario": 2, "sueldo": 2, "poder adquisitivo": 3, "factura": 2,
            "hipoteca": 2, "euribor": 3, "aranceles": 3, "trump": 1,
        },
    },
    {
        "nombre": "Corrupcion e integridad institucional",
        "marco": "moralidad", "tension": "alta",
        "target": "Votantes desencantados", "ideologia_dominante": "transversal",
        "keywords": {
            "corrupcion": 4, "imputado": 3, "investigado": 3, "juicio": 2,
            "tribunal": 2, "fiscal": 2, "caso": 1, "trama": 3, "fraude": 3,
            "malversacion": 4, "soborno": 4, "contrato": 1, "adjudicacion": 2,
            "prevaricacion": 4, "financiacion ilegal": 4, "cuentas": 1,
            "koldo": 3, "mediador": 2, "comision": 2,
        },
    },
    {
        "nombre": "Independentismo y tension territorial",
        "marco": "conflicto", "tension": "alta",
        "target": "Ciudadania catalana y vasca", "ideologia_dominante": "izquierda",
        "keywords": {
            "independencia": 4, "independentismo": 4, "catalu": 3, "referendum": 4,
            "generalitat": 3, "puigdemont": 3, "junts": 2, "erc": 2, "bildu": 2,
            "pnv": 2, "pais vasco": 2, "euskadi": 2, "singular": 2,
            "fiscal": 1, "competencia": 1, "estatut": 3, "transferencia": 2,
        },
    },
    {
        "nombre": "Inmigracion y asilo",
        "marco": "conflicto", "tension": "alta",
        "target": "Electores de clase trabajadora", "ideologia_dominante": "derecha",
        "keywords": {
            "inmigracion": 4, "inmigrante": 3, "migracion": 3, "migrante": 3,
            "patera": 4, "cayuco": 4, "mena": 4, "canarias": 2, "ceuta": 3,
            "melilla": 3, "frontera": 2, "asilo": 2, "solicitante": 2,
            "refugiado": 2, "expulsion": 3, "retorno": 2, "llegadas": 2,
        },
    },
    {
        "nombre": "Vivienda y acceso al alquiler",
        "marco": "interes_humano", "tension": "media",
        "target": "Jovenes 25-40 en ciudades", "ideologia_dominante": "izquierda",
        "keywords": {
            "vivienda": 4, "alquiler": 4, "precio": 1, "piso": 2, "hipoteca": 2,
            "emancipacion": 3, "joven": 2, "compra": 1, "oferta": 1,
            "promotor": 2, "especulacion": 3, "turistica": 2, "airbnb": 3,
            "desahucio": 3, "parque publico": 3, "ley de vivienda": 4,
        },
    },
    {
        "nombre": "Polarizacion politica y bloqueo",
        "marco": "conflicto", "tension": "media",
        "target": "Ciudadania general", "ideologia_dominante": "transversal",
        "keywords": {
            "polarizacion": 4, "crispacion": 3, "bloqueo": 3, "acuerdo": 1,
            "negociacion": 2, "dialogo": 2, "ruptura": 2, "tension": 1,
            "enfrentamiento": 2, "bronca": 2, "insulto": 2, "congreso": 1,
            "gobierno": 1, "oposicion": 1, "sanchez": 2, "feijoo": 2,
            "mocion": 3, "confianza": 2, "investidura": 3,
        },
    },
    {
        "nombre": "Reforma fiscal y presupuestos",
        "marco": "economico", "tension": "media",
        "target": "Contribuyentes y empresas", "ideologia_dominante": "centroderecha",
        "keywords": {
            "presupuesto": 4, "fiscal": 2, "irpf": 4, "impuesto": 3, "reforma": 2,
            "grandes fortunas": 4, "patrimonio": 3, "hacienda": 3, "tributo": 3,
            "recaudacion": 3, "tipo marginal": 4, "renta": 2, "sociedad": 1,
            "amnistia fiscal": 4, "fraude fiscal": 3,
        },
    },
    {
        "nombre": "Sanidad publica y listas de espera",
        "marco": "interes_humano", "tension": "baja",
        "target": "Pacientes y trabajadores sanitarios", "ideologia_dominante": "izquierda",
        "keywords": {
            "sanidad": 4, "sanitario": 3, "hospital": 2, "medico": 2, "enfermero": 2,
            "lista de espera": 4, "urgencias": 3, "atencion primaria": 4,
            "medecina": 2, "privatizacion": 3, "concierto": 2, "nss": 3,
            "colapso": 2, "camas": 2, "huelga medicos": 3,
        },
    },
    {
        "nombre": "Politica exterior y geopolitica",
        "marco": "estrategia_politica", "tension": "media",
        "target": "Opinion publica europeista", "ideologia_dominante": "transversal",
        "keywords": {
            "otan": 3, "ue": 1, "europa": 1, "trump": 2, "ucrania": 3,
            "rusia": 2, "gaza": 3, "israel": 2, "palestina": 2, "china": 2,
            "aranceles": 3, "diplomacia": 2, "cumbre": 2, "tratado": 2,
            "defensa": 2, "seguridad": 1, "alianza": 2,
        },
    },
    {
        "nombre": "Derechos sociales y laborales",
        "marco": "moralidad", "tension": "baja",
        "target": "Trabajadores y sindicatos", "ideologia_dominante": "izquierda",
        "keywords": {
            "jornada": 3, "reduccion jornada": 4, "smi": 4, "salario minimo": 4,
            "sindicato": 3, "ccoo": 3, "ugt": 3, "huelga": 3, "convenio": 2,
            "negociacion colectiva": 4, "despido": 3, "precariedad": 3,
            "feminismo": 2, "igualdad": 2, "brecha salarial": 3,
        },
    },
    {
        "nombre": "Clima y transicion energetica",
        "marco": "interes_humano", "tension": "baja",
        "target": "Jovenes y activistas", "ideologia_dominante": "izquierda",
        "keywords": {
            "clima": 3, "climatico": 3, "energia": 2, "renovable": 3, "solar": 2,
            "eolica": 2, "hidrogeno": 2, "emision": 3, "co2": 3, "temperatura": 2,
            "sequi": 3, "inundacion": 2, "dana": 3, "transicion": 2,
            "cop": 2, "verde": 1, "contaminacion": 2,
        },
    },
    {
        "nombre": "Seguridad y orden publico",
        "marco": "conflicto", "tension": "media",
        "target": "Ciudadania preocupada por la seguridad", "ideologia_dominante": "derecha",
        "keywords": {
            "seguridad": 2, "delito": 3, "crimen": 3, "policia": 2, "guardia civil": 2,
            "detenido": 2, "robo": 3, "violencia": 2, "agresion": 2, "homicidio": 3,
            "terrorismo": 4, "yihadismo": 4, "banda": 3, "narcotrafic": 4,
            "orden publico": 3, "manifestacion": 1,
        },
    },
]

# Palabras clave deportivas — solo para clustering (cat_score), NO aparecen
# en el radar de narrativas políticas.
_SPORT_KEYWORDS: dict[str, int] = {
    "futbol": 4, "tenis": 4, "baloncesto": 3, "atletismo": 3, "ciclismo": 3,
    "formula 1": 4, "moto gp": 4, "natacion": 3, "olimpiadas": 4, "mundial": 3,
    "liga": 3, "champions": 4, "copa del rey": 4, "torneo": 3, "masters": 4,
    "open": 3, "wta": 4, "atp": 4, "grand slam": 4, "roland garros": 4,
    "wimbledon": 4, "us open": 4, "australian open": 4, "real madrid": 4,
    "atletico de madrid": 4, "sinner": 4, "nadal": 4, "alcaraz": 4,
    "djokovic": 4, "gol": 3, "fichaje": 3, "entrenador": 2, "jugador": 2,
    "deporte": 3, "deportivo": 3, "campeonato": 3, "penalti": 3,
    "semifinal": 3, "semifinales": 3, "clasificacion": 2,
}


def _score_article_against_fingerprints(
    text: str,
    fingerprints: list[dict],
) -> list[float]:
    """Puntua un articulo contra cada fingerprint. Retorna vector de scores."""
    text_low = text.lower()
    scores = []
    for fp in fingerprints:
        score = sum(
            weight * text_low.count(kw)
            for kw, weight in fp["keywords"].items()
        )
        scores.append(float(score))
    return scores


@st.cache_data(ttl=3600, show_spinner=False)
def _translate_titles_batch(titles_tuple: tuple[str, ...],
                            langs_tuple: tuple[str, ...]) -> tuple[str, ...]:
    """
    Traduce en bloque los titulares no españoles via Ollama.
    Recibe y devuelve tuplas para compatibilidad con st.cache_data.
    Los titulares ya en español se devuelven sin cambios.
    TTL: 1h (los titulares del dia cambian, pero traducir de nuevo no urge).
    """
    if not _LLM_OK:
        return titles_tuple

    # Detectar cuales necesitan traduccion (lengua != es)
    to_translate: list[tuple[int, str]] = []  # (idx, titulo)
    for idx, (title, lang) in enumerate(zip(titles_tuple, langs_tuple)):
        if lang and lang not in ("es", "es-ES", "español") and title.strip():
            to_translate.append((idx, title))

    if not to_translate:
        return titles_tuple

    result = list(titles_tuple)
    try:
        import re as _re_t
        # Lote en una sola llamada — mas eficiente que N llamadas
        numbered = "\n".join(f"{j+1}. {t}" for j, (_, t) in enumerate(to_translate))
        prompt = (
            "Traduce los siguientes titulares de noticias al espanol. "
            "Responde UNICAMENTE con los titulares traducidos numerados, "
            "en el mismo orden, sin explicaciones ni texto adicional:\n\n"
            + numbered
        )
        resp = chat(prompt, sistema="Eres un traductor de noticias al espanol. "
                    "Responde solo con los titulares traducidos numerados.", modo="fast")
        lines = [ln.strip() for ln in resp.strip().splitlines() if ln.strip()]
        # Parsear respuesta numerada
        translated: list[str] = []
        for ln in lines:
            clean = _re_t.sub(r"^\d+[\.\)]\s*", "", ln).strip()
            if clean:
                translated.append(clean)
        # Mapear de vuelta a indices originales
        for j, (orig_idx, _) in enumerate(to_translate):
            if j < len(translated) and translated[j]:
                result[orig_idx] = translated[j]
    except Exception:
        pass  # si Ollama falla, devolver originales

    return tuple(result)


@st.cache_data(ttl=900, show_spinner=False)
def _load_narrativas_live() -> list[dict]:
    """
    Motor de narrativas en tiempo real — estilo Gotham/Nation Builder.

    Pipeline (siempre produce output):
    1. Carga articulos del RSS aggregator (30 fuentes, ya en cache)
    2. Puntua cada articulo contra 12 fingerprints de narrativa
    3. Agrega: intensidad ∝ articulos matchados, velocidad ∝ recencia
    4. Enriquece titulares representativos y difusores por narrativa
    5. Intenta call Ollama async para enriquecer elementos/actores (best-effort)

    Nunca devuelve lista vacia — usa scores base si no hay articulos.
    TTL: 15 minutos.
    """
    import re as _re
    from collections import defaultdict as _dd, Counter as _Ctr

    # 1. Cargar articulos (del aggregator que ya esta cacheado)
    articles: list[dict] = []
    try:
        if _AGG_OK:
            articles = get_news(400)
    except Exception:
        pass

    # Si no hay articulos del aggregator, intentar feedparser directo (8 fuentes rapidas)
    if not articles:
        try:
            import feedparser as _fp
            _quick = [
                ("El Pais",         "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada"),
                ("El Mundo",        "https://e00-elmundo.uecdn.es/elmundo/rss/espana.xml"),
                ("El Confidencial", "https://rss.elconfidencial.com/espana/"),
                ("ABC",             "https://www.abc.es/rss/feeds/abc_EspanaEspana.xml"),
                ("El Diario",       "https://www.eldiario.es/rss/"),
                ("Publico",         "https://www.publico.es/rss/"),
                ("Europa Press",    "https://www.europapress.es/rss/rss.aspx"),
                ("La Vanguardia",   "https://www.lavanguardia.com/rss/home.xml"),
            ]
            for name, rss in _quick:
                try:
                    feed = _fp.parse(rss, request_timeout=6,
                                     request_headers={"User-Agent": "ElectSim/2.0"})
                    for e in (feed.entries or [])[:15]:
                        t = (getattr(e, "title", "") or "").strip()
                        r = (getattr(e, "summary", "") or "").strip()
                        if t:
                            articles.append({"titulo": t, "resumen": r,
                                              "fuente": name, "texto_completo": f"{t} {r}"})
                except Exception:
                    pass
        except Exception:
            pass

    import math as _math_narr

    n_total = max(len(articles), 1)

    # 2. Scoring: asignacion SUAVE — cada articulo contribuye a TODOS los
    # fingerprints con score > 0 (proporcional), no solo al ganador.
    # Esto produce un espectro mas variado y evita que un tema domine el radar.
    fp = _NARRATIVA_FINGERPRINTS
    n_fp = len(fp)

    match_scores   = [0.0] * n_fp   # suma ponderada de contribuciones
    match_titulars = [[] for _ in range(n_fp)]
    match_fuentes  = [[] for _ in range(n_fp)]

    for art in articles:
        # Excluir articulos claramente deportivos del radar de narrativas
        raw_title = art.get("titulo", "") or art.get("title", "")
        sport_sc = sum(w * raw_title.lower().count(k)
                       for k, w in _SPORT_KEYWORDS.items())
        if sport_sc >= 4:
            continue  # articulo deportivo: no contamina narrativas políticas

        text = f"{raw_title} {art.get('resumen','') or art.get('texto_completo','')}"
        scores = _score_article_against_fingerprints(text, fp)
        total_art_sc = sum(scores)
        if total_art_sc <= 0:
            continue

        # Contribucion proporcional: cada narrativa recibe su fraccion del score
        t = raw_title
        fuente = art.get("fuente", "Varios")
        for i, sc in enumerate(scores):
            if sc <= 0:
                continue
            contrib = sc / total_art_sc  # [0,1]
            match_scores[i] += contrib
            if t and contrib > 0.2:  # titular solo para narrativa dominante en este art
                match_titulars[i].append(t)
            match_fuentes[i].append(fuente)

    # Normalizar con sqrt para aplanar diferencias → mas variedad visual
    sqrt_scores = [_math_narr.sqrt(max(s, 0)) for s in match_scores]
    total_sqrt  = max(sum(sqrt_scores), 1e-6)

    # 3. Construir narrativas con intensidad equilibrada
    total_matched = sum(match_scores)
    narrativas: list[dict] = []

    for i, fingerprint in enumerate(fp):
        n_match = match_scores[i]
        # Intensidad basada en sqrt-normalizado → rango real [12, 92]
        raw_intensity = (sqrt_scores[i] / total_sqrt) * 100 * n_fp * 0.9
        intensidad = max(12, min(92, int(raw_intensity)))
        # Si no hay articulos reales, usar score base escalonado
        if not articles:
            intensidad = 35 + (n_fp - i) * 2

        # Velocidad: articulos-equivalentes por hora (ventana 4h)
        velocidad = round(n_match / 4.0, 1)

        # Delta: variacion simulada basada en recencia de titulares
        _n_int = max(1, int(n_match))
        delta = (_n_int % 7) - 3  # [-3, 3] — se enriquece con datos historicos

        # Difusores principales
        fuentes_ctr = _Ctr(match_fuentes[i])
        top_difusores = [f for f, _ in fuentes_ctr.most_common(3)] or ["Varios medios"]

        # Titulares representativos (sin duplicados)
        titulares_uniq: list[str] = []
        seen: set[str] = set()
        for t in match_titulars[i][:6]:
            key = t[:40].lower()
            if key not in seen:
                seen.add(key)
                titulares_uniq.append(t)
            if len(titulares_uniq) >= 3:
                break

        # Tendencia simulada (7 puntos)
        base = intensidad
        tendencia = [max(0, min(100, base - 15 + j * 3 + (_n_int % (j + 2)))) for j in range(7)]

        narrativas.append({
            "nombre":                   fingerprint["nombre"],
            "intensidad":               intensidad,
            "velocidad":                velocidad,
            "delta":                    delta,
            "marco":                    fingerprint["marco"],
            "tension":                  fingerprint["tension"],
            "actores_principales":      [],
            "titulares_representativos": titulares_uniq,
            "elementos":                list(fingerprint["keywords"].keys())[:4],
            "difusores":                top_difusores,
            "potenciadores":            [],
            "debilitadores":            [],
            "target":                   fingerprint["target"],
            "ideologia_dominante":      fingerprint["ideologia_dominante"],
            "tendencia":                tendencia,
            "n_articulos":              round(n_match, 2),
        })

    # Ordenar por intensidad descendente
    narrativas.sort(key=lambda x: -x["intensidad"])

    # Traducir titulares representativos al español (best-effort, un solo batch)
    if _LLM_OK:
        try:
            _nt_flat: list[str] = []
            _nt_map:  list[tuple[int, int]] = []  # (narr_idx, tit_idx)
            for ni, narr in enumerate(narrativas):
                for ti, t in enumerate(narr.get("titulares_representativos") or []):
                    _nt_flat.append(t)
                    _nt_map.append((ni, ti))
            if _nt_flat:
                _nt_translated = _translate_titles_batch(
                    tuple(_nt_flat), tuple(["en"] * len(_nt_flat))
                )
                for pos, (ni, ti) in enumerate(_nt_map):
                    if pos < len(_nt_translated) and _nt_translated[pos]:
                        narr_list = narrativas[ni].get("titulares_representativos") or []
                        if ti < len(narr_list):
                            narr_list[ti] = _nt_translated[pos]
                        narrativas[ni]["titulares_representativos"] = narr_list
        except Exception:
            pass

    # 4. Enriquecimiento Ollama (best-effort, no bloquea si falla)
    try:
        from dashboard.services.narrative_service import NarrativeService
        ns = NarrativeService()
        ollama_narrativas = ns.get_narrativas(
            max_fuentes=20,
            n_narrativas=6,
            max_articles_per_source=12,
            politica_filter=True,
        )
        # Merge: usar nombre del fingerprint como ancla, enriquecer actores/potenciadores
        ollama_by_name = {n["nombre"].lower()[:20]: n for n in ollama_narrativas}
        for narr in narrativas:
            key = narr["nombre"].lower()[:20]
            if key in ollama_by_name:
                on = ollama_by_name[key]
                if on.get("actores_principales"):
                    narr["actores_principales"] = on["actores_principales"]
                if on.get("potenciadores"):
                    narr["potenciadores"] = on["potenciadores"]
                if on.get("debilitadores"):
                    narr["debilitadores"] = on["debilitadores"]
    except Exception:
        pass  # Ollama falló — narrativas base siguen siendo válidas

    return narrativas


# Ejecutar carga al arrancar la pagina (con spinner discreto)
with st.spinner("Ingiriendo noticias y extrayendo narrativas con Ollama..."):
    _NARRATIVAS_DEMO = _load_narrativas_live()


def _safe_float(v, default: float = 0.0) -> float:
    try:
        return float(v) if v is not None else default
    except Exception:
        return default


@st.cache_data(ttl=300, show_spinner=False)
def _load_news(max_items: int = 80) -> list[dict]:
    """Load real news from data_aggregator, fall back to demo."""
    if _AGG_OK:
        try:
            items = get_news(n=max_items, ttl=300)
            if items:
                # Enrich with sentiment if missing
                estimator = SentimentEstimator()
                for item in items:
                    if "sentimiento" not in item:
                        text = f"{item.get('titulo','')} {item.get('resumen','')}"
                        item["sentimiento"] = estimator.score(text)
                return items
        except Exception:
            pass
    return list(_DEMO_NEWS)


@st.cache_data(ttl=300, show_spinner=False)
def _load_actor_counts(texts: tuple[str, ...]) -> dict[str, int]:
    if _AGG_OK:
        try:
            return get_actor_mention_counts(list(texts))
        except Exception:
            pass
    ext = ActorMentionExtractor()
    return ext.mention_counts(list(texts))


def _sentiment_label(score: float) -> str:
    if score > 0.15:
        return "positivo"
    if score < -0.15:
        return "negativo"
    return "neutral"


def _time_ago(fecha_str: str) -> str:
    """Convert a date string to a human-readable 'X ago' string."""
    try:
        dt = pd.to_datetime(fecha_str, utc=True, errors="coerce")
        if pd.isna(dt):
            return fecha_str[:16] if fecha_str else "—"
        now = pd.Timestamp.now(tz="UTC")
        diff = now - dt
        mins = int(diff.total_seconds() / 60)
        if mins < 1:
            return "ahora"
        if mins < 60:
            return f"hace {mins}m"
        hours = mins // 60
        if hours < 24:
            return f"hace {hours}h"
        days = hours // 24
        return f"hace {days}d"
    except Exception:
        return "—"


# ═════════════════════════════════════════════════════════════════════════════
# Header
# ═════════════════════════════════════════════════════════════════════════════
now_str = datetime.now(tz=timezone.utc).strftime("%d %b %Y · %H:%M UTC")
intel_header(
    title="Monitor de Medios & Narrativa",
    subtitle="Media Intelligence",
    status="LIVE",
    time_str=now_str,
)

# ── Ticker ────────────────────────────────────────────────────────────────────
noticias_main = _load_news(200)
headlines_ticker = [n.get("titulo", "") for n in noticias_main[:25] if n.get("titulo")]
scrolling_ticker(headlines_ticker)

# ── Top KPI row ───────────────────────────────────────────────────────────────
total_menciones = len(noticias_main)
sentimientos_all = [_safe_float(n.get("sentimiento", 0)) for n in noticias_main]
cobertura_positiva = (
    int(sum(1 for s in sentimientos_all if s > 0.15) / max(len(sentimientos_all), 1) * 100)
)
narrativas_activas = len(_NARRATIVAS_DEMO)
try:
    from dashboard.services.media_sources import ALL_SOURCES as _ALL_SRC
    fuentes_monitorizadas = len(_ALL_SRC)
except Exception:
    fuentes_monitorizadas = len(RSS_FEEDS)

k1, k2, k3, k4 = st.columns(4)
with k1:
    st.markdown(kpi_card(
        "MENCIONES 24H", f"{total_menciones:,}",
        sub="Artículos procesados", color=CYAN,
    ), unsafe_allow_html=True)
with k2:
    col = GREEN if cobertura_positiva >= 50 else (AMBER if cobertura_positiva >= 30 else RED)
    st.markdown(kpi_card(
        "COBERTURA POSITIVA", f"{cobertura_positiva}%",
        sub="Noticias con sentimiento > 0", color=col,
    ), unsafe_allow_html=True)
with k3:
    st.markdown(kpi_card(
        "NARRATIVAS ACTIVAS", str(narrativas_activas),
        sub="Clusters temáticos detectados", color=PURPLE,
    ), unsafe_allow_html=True)
with k4:
    st.markdown(kpi_card(
        "FUENTES MONITORIZADAS", str(fuentes_monitorizadas),
        sub="RSS feeds en tiempo real", color=AMBER,
    ), unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ═════════════════════════════════════════════════════════════════════════════
# TABS
# ═════════════════════════════════════════════════════════════════════════════
tab_rt, tab_actor, tab_fuente, tab_narrativa, tab_mapa = st.tabs([
    "COBERTURA EN TIEMPO REAL",
    "SENTIMIENTO POR ACTOR",
    "COBERTURA POR FUENTE",
    "RADAR DE NARRATIVAS",
    "MAPA GLOBAL DE EVENTOS",
])


# ═════════════════════════════════════════════════════════════════════════════
# TAB 1: COBERTURA EN TIEMPO REAL
# ═════════════════════════════════════════════════════════════════════════════
with tab_rt:
    col_f1, col_f2, col_f3 = st.columns([2, 2, 1])
    with col_f1:
        fuentes_disponibles = sorted(set(n.get("fuente", "RSS") for n in noticias_main))
        fuente_sel = st.multiselect("Fuente", fuentes_disponibles, default=[], key="d7_fuente_sel")
    with col_f2:
        sent_opts = ["Todos", "Positivo", "Neutral", "Negativo"]
        sent_sel = st.selectbox("Sentimiento", sent_opts, key="d7_sent_sel")
    with col_f3:
        auto_refresh = st.toggle("Auto-refresh 30s", value=False, key="d7_autorefresh")

    # Filter
    noticias_filtradas = noticias_main.copy()
    if fuente_sel:
        noticias_filtradas = [n for n in noticias_filtradas if n.get("fuente") in fuente_sel]
    if sent_sel == "Positivo":
        noticias_filtradas = [n for n in noticias_filtradas if _safe_float(n.get("sentimiento", 0)) > 0.15]
    elif sent_sel == "Negativo":
        noticias_filtradas = [n for n in noticias_filtradas if _safe_float(n.get("sentimiento", 0)) < -0.15]
    elif sent_sel == "Neutral":
        noticias_filtradas = [
            n for n in noticias_filtradas
            if -0.15 <= _safe_float(n.get("sentimiento", 0)) <= 0.15
        ]

    st.markdown(
        f'<div style="color:{TEXT2};font-size:.78rem;margin-bottom:.8rem">'
        f'{len(noticias_filtradas)} artículos mostrados'
        f'</div>',
        unsafe_allow_html=True,
    )

    # 3-column grid using news_card from shared
    display_news = noticias_filtradas[:30]
    cols_news = st.columns(3)
    for idx, n in enumerate(display_news):
        score = _safe_float(n.get("sentimiento", 0))
        sent_label = _sentiment_label(score)
        title = html.escape(str(n.get("titulo", "Sin título")))
        source = str(n.get("fuente", "RSS")).upper()
        url = str(n.get("url", "#"))
        snippet = html.escape(str(n.get("resumen", ""))[:180])
        t_ago = _time_ago(str(n.get("fecha", "")))
        with cols_news[idx % 3]:
            st.markdown(
                news_card(
                    title=title,
                    source=source,
                    sentiment=sent_label,
                    time_ago=t_ago,
                    url=url,
                    snippet=snippet,
                ),
                unsafe_allow_html=True,
            )

    if auto_refresh:
        time.sleep(30)
        st.rerun()


# ═════════════════════════════════════════════════════════════════════════════
# TAB 2: SENTIMIENTO POR ACTOR
# ═════════════════════════════════════════════════════════════════════════════
with tab_actor:
    texts_for_actors = [
        f"{n.get('titulo','')} {n.get('resumen','')}"
        for n in noticias_main
    ]
    actor_counts = _load_actor_counts(tuple(texts_for_actors))
    top_actors = [a for a, c in sorted(actor_counts.items(), key=lambda x: x[1], reverse=True) if c > 0][:10]

    if not top_actors:
        top_actors = ACTORES_ES[:10]

    # ── Heatmap: actors × fuentes ─────────────────────────────────────────────
    section_header("MAPA DE CALOR: ACTORES × FUENTES", CYAN)

    fuentes_hm = sorted({n.get("fuente", "RSS") for n in noticias_main})[:8]
    if not fuentes_hm:
        fuentes_hm = list(RSS_FEEDS.keys())[:8]

    estimator = SentimentEstimator()
    # Build matrix: actor × fuente = avg sentiment
    z_hm: list[list[float]] = []
    for actor in top_actors[:8]:
        row: list[float] = []
        last = actor.split()[-1].lower()
        for fuente in fuentes_hm:
            texts_fuente = [
                f"{n.get('titulo','')} {n.get('resumen','')}"
                for n in noticias_main
                if n.get("fuente") == fuente
            ]
            relevant = [t for t in texts_fuente if last in t.lower()]
            if relevant:
                avg_sent = sum(estimator.score(t) for t in relevant) / len(relevant)
                row.append(round(avg_sent, 3))
            else:
                row.append(0.0)
        z_hm.append(row)

    fig_hm = go.Figure(go.Heatmap(
        z=z_hm,
        x=fuentes_hm,
        y=top_actors[:8],
        colorscale=[
            [0.0, RED],
            [0.5, BG3],
            [1.0, GREEN],
        ],
        zmid=0,
        showscale=True,
        colorbar=dict(
            title=dict(text="Sentimiento", font=dict(color=TEXT2, size=11)),
            tickvals=[-1, -0.5, 0, 0.5, 1],
            ticktext=["-1 Neg", "-0.5", "0 Neu", "+0.5", "+1 Pos"],
            tickfont=dict(color=TEXT2, size=10),
        ),
        hovertemplate="%{y} en %{x}: <b>%{z:.2f}</b><extra></extra>",
    ))
    fig_hm.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2,
        font=dict(color=TEXT, size=11),
        height=360,
        margin=dict(l=10, r=10, t=20, b=10),
        xaxis=dict(tickangle=-30, tickfont=dict(size=10, color=TEXT2)),
        yaxis=dict(tickfont=dict(size=10, color=TEXT)),
    )
    st.plotly_chart(fig_hm, use_container_width=True)

    # ── Timeline sentimiento por actor ────────────────────────────────────────
    col_tl, col_breakdown = st.columns([3, 2], gap="large")

    with col_tl:
        section_header("EVOLUCIÓN SENTIMIENTO (24H)", BLUE)
        # Build time buckets (simulated from available data)
        import numpy as np

        hours = list(range(0, 24))
        fig_tl = go.Figure()
        rng = np.random.default_rng(42)
        actor_colors = [CYAN, BLUE, PURPLE, GREEN, AMBER, RED, "#EC4899", "#F97316"]
        for i, actor in enumerate(top_actors[:5]):
            last = actor.split()[-1].lower()
            base_sent = 0.0
            texts_actor = [
                f"{n.get('titulo','')} {n.get('resumen','')}"
                for n in noticias_main
                if last in f"{n.get('titulo','')} {n.get('resumen','')}".lower()
            ]
            if texts_actor:
                base_sent = sum(estimator.score(t) for t in texts_actor) / len(texts_actor)

            # Smooth curve around base sentiment
            noise = rng.normal(0, 0.12, len(hours))
            y_vals = [max(-1.0, min(1.0, base_sent + n)) for n in noise]

            fig_tl.add_trace(go.Scatter(
                x=hours,
                y=y_vals,
                mode="lines",
                name=actor.split()[-1],
                line=dict(color=actor_colors[i % len(actor_colors)], width=2),
                hovertemplate=f"{actor}<br>Hora %{{x}}h: <b>%{{y:.2f}}</b><extra></extra>",
            ))

        fig_tl.add_hline(y=0, line=dict(color=BORDER, dash="dash", width=1))
        fig_tl.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT, size=11),
            height=300,
            margin=dict(l=10, r=10, t=20, b=30),
            xaxis=dict(title="Hora del día", gridcolor=BORDER, tickfont=dict(color=TEXT2)),
            yaxis=dict(title="Sentimiento", range=[-1.1, 1.1], gridcolor=BORDER, tickfont=dict(color=TEXT2)),
            legend=dict(bgcolor=BG3, font=dict(color=TEXT2, size=10), orientation="h", y=-0.25),
        )
        st.plotly_chart(fig_tl, use_container_width=True)

    with col_breakdown:
        section_header("DESGLOSE POR ACTOR", PURPLE)
        for actor in top_actors[:6]:
            last = actor.split()[-1].lower()
            texts_actor = [
                f"{n.get('titulo','')} {n.get('resumen','')}"
                for n in noticias_main
                if last in f"{n.get('titulo','')} {n.get('resumen','')}".lower()
            ]
            count = len(texts_actor)
            if count == 0:
                continue
            scores = [estimator.score(t) for t in texts_actor]
            pos_pct = int(sum(1 for s in scores if s > 0.15) / count * 100)
            neg_pct = int(sum(1 for s in scores if s < -0.15) / count * 100)
            neu_pct = 100 - pos_pct - neg_pct
            avg = sum(scores) / count

            col_sent = GREEN if avg > 0.1 else (RED if avg < -0.1 else TEXT2)
            st.markdown(
                f'<div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;'
                f'padding:.6rem .8rem;margin-bottom:.4rem">'
                f'<div style="display:flex;justify-content:space-between;align-items:center">'
                f'<span style="font-size:.82rem;font-weight:600;color:{TEXT}">{actor.split()[-1]}</span>'
                f'<span style="font-size:.8rem;font-weight:700;color:{col_sent}">{avg:+.2f}</span>'
                f'</div>'
                f'<div style="font-size:.65rem;color:{TEXT2};margin-top:.25rem">'
                f'{count} menciones &nbsp;·&nbsp; '
                f'<span style="color:{GREEN}">{pos_pct}% pos</span> &nbsp;·&nbsp; '
                f'<span style="color:{MUTED}">{neu_pct}% neu</span> &nbsp;·&nbsp; '
                f'<span style="color:{RED}">{neg_pct}% neg</span>'
                f'</div>'
                f'<div style="display:flex;height:4px;border-radius:2px;overflow:hidden;margin-top:.4rem;gap:1px">'
                f'<div style="width:{pos_pct}%;background:{GREEN}"></div>'
                f'<div style="width:{neu_pct}%;background:{MUTED}"></div>'
                f'<div style="width:{neg_pct}%;background:{RED}"></div>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )


# ═════════════════════════════════════════════════════════════════════════════
# TAB 3: COBERTURA POR FUENTE
# ═════════════════════════════════════════════════════════════════════════════
with tab_fuente:
    col_bias, col_dist = st.columns([3, 2], gap="large")

    with col_bias:
        section_header("MAPA DE SESGO MEDIÁTICO", AMBER)

        # Compute mention counts per source
        source_counts: dict[str, int] = {}
        for n in noticias_main:
            fuente = n.get("fuente", "RSS")
            source_counts[fuente] = source_counts.get(fuente, 0) + 1

        # Map source keys to display names
        _KEY_TO_NAME: dict[str, str] = {
            "elpais": "El País",
            "elmundo": "El Mundo",
            "lavanguardia": "La Vanguardia",
            "abc": "ABC",
            "elconfidencial": "El Confidencial",
            "eldiario": "elDiario.es",
            "larazon": "La Razón",
            "20minutos": "20 Minutos",
            "publico": "Público",
            "infolibre": "Infolibre",
        }

        bias_x, bias_y, bias_size, bias_labels, bias_colors = [], [], [], [], []
        ideology_colors = [CYAN, BLUE, PURPLE, GREEN, AMBER, RED, "#EC4899", "#F97316", "#14B8A6", "#8B5CF6"]

        for i, (key, (ideologia, circulacion)) in enumerate(_MEDIA_IDEOLOGIA.items()):
            name = key
            # Map display name back to key for count lookup
            count_key = next((k for k, v in _KEY_TO_NAME.items() if v == key), key.lower().replace(" ", ""))
            menciones = source_counts.get(count_key, source_counts.get(key, 0))
            bias_x.append(ideologia)
            bias_y.append(circulacion)
            bias_size.append(max(15, menciones * 8 + 20))
            bias_labels.append(key)
            bias_colors.append(ideology_colors[i % len(ideology_colors)])

        fig_bias = go.Figure(go.Scatter(
            x=bias_x,
            y=bias_y,
            mode="markers+text",
            text=bias_labels,
            textposition="top center",
            textfont=dict(color=TEXT2, size=10),
            marker=dict(
                size=bias_size,
                color=bias_colors,
                opacity=0.8,
                line=dict(color=BG2, width=2),
            ),
            hovertemplate=(
                "<b>%{text}</b><br>"
                "Ideología: %{x:.1f}/10<br>"
                "Circulación: %{y:.1f}M<extra></extra>"
            ),
        ))
        fig_bias.add_vline(x=5, line=dict(color=BORDER, dash="dot", width=1))
        fig_bias.add_annotation(
            x=1.5, y=max(bias_y) * 0.95,
            text="IZQUIERDA", font=dict(color=MUTED, size=9),
            showarrow=False,
        )
        fig_bias.add_annotation(
            x=8.5, y=max(bias_y) * 0.95,
            text="DERECHA", font=dict(color=MUTED, size=9),
            showarrow=False,
        )
        fig_bias.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT, size=11),
            height=380,
            margin=dict(l=10, r=10, t=20, b=30),
            xaxis=dict(
                title="Posición ideológica (0=izq, 10=der)",
                range=[-0.5, 10.5],
                gridcolor=BORDER,
                tickfont=dict(color=TEXT2),
            ),
            yaxis=dict(
                title="Circulación estimada (M)",
                gridcolor=BORDER,
                tickfont=dict(color=TEXT2),
            ),
        )
        st.plotly_chart(fig_bias, use_container_width=True)

    with col_dist:
        section_header("ARTÍCULOS POR FUENTE", CYAN)

        fuente_counts = Counter(n.get("fuente", "RSS") for n in noticias_main)
        sorted_fuentes = fuente_counts.most_common(10)
        fuente_names = [_KEY_TO_NAME.get(f, f.title()) for f, _ in sorted_fuentes]
        fuente_vals = [v for _, v in sorted_fuentes]
        fuente_colors_list = [
            GREEN if v == max(fuente_vals) else (CYAN if v > max(fuente_vals) * 0.6 else BLUE)
            for v in fuente_vals
        ]

        fig_bar = go.Figure(go.Bar(
            x=fuente_vals,
            y=fuente_names,
            orientation="h",
            marker=dict(color=fuente_colors_list, line=dict(width=0)),
            hovertemplate="%{y}: <b>%{x}</b> artículos<extra></extra>",
        ))
        fig_bar.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT, size=11),
            height=380,
            margin=dict(l=10, r=10, t=20, b=10),
            yaxis=dict(autorange="reversed", tickfont=dict(color=TEXT)),
            xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    # Source health row
    section_header("ESTADO DE FUENTES", GREEN)
    health_cols = st.columns(5)
    all_source_keys = list(RSS_FEEDS.keys())
    for i, key in enumerate(all_source_keys):
        count = source_counts.get(key, 0)
        health_color = GREEN if count > 5 else (AMBER if count > 0 else RED)
        health_label = "ACTIVA" if count > 0 else "SIN DATOS"
        name = _KEY_TO_NAME.get(key, key.title())
        with health_cols[i % 5]:
            st.markdown(
                f'<div style="background:{BG3};border:1px solid {health_color}44;'
                f'border-radius:8px;padding:.5rem .7rem;margin-bottom:.4rem;text-align:center">'
                f'<div style="font-size:.68rem;font-weight:700;color:{TEXT}">{name}</div>'
                f'<div style="font-size:.62rem;color:{health_color};margin-top:.2rem">'
                f'{health_label} · {count} arts.</div>'
                f'</div>',
                unsafe_allow_html=True,
            )


# ═════════════════════════════════════════════════════════════════════════════
# TAB 4: RADAR DE NARRATIVAS
# ═════════════════════════════════════════════════════════════════════════════

# ─── Helpers y datos de narrativas (definidos antes de los tabs) ──────────────


# ═════════════════════════════════════════════════════════════════════════════
# TAB 5: ANÁLISIS COMPARATIVO — DEEP NARRATIVE INTELLIGENCE
# ═════════════════════════════════════════════════════════════════════════════

# ── Helper de palabras (limpia HTML) ─────────────────────────────────────────
def _top_words(
    news_list: list[dict],
    n: int = 15,
    narrative_filter: str | None = None,
) -> list[tuple[str, int]]:
    """
    Extrae los terminos mas relevantes de una lista de noticias.

    - Elimina HTML, URLs, numeros y stopwords exhaustivas (ES + EN).
    - Si se proporciona narrative_filter, pondera palabras que aparecen
      junto a keywords de esa narrativa (TF-IDF simplificado).
    - Solo devuelve palabras con contenido semantico real (minimo 5 chars,
      alfabeticas, no en la lista de stopwords).
    """
    _SW = {
        # Articulos, preposiciones, conjunciones ES
        "para", "pero", "como", "entre", "este", "esta", "estos", "estas",
        "sobre", "ante", "tras", "desde", "hasta", "cuando", "donde",
        "aunque", "porque", "tambien", "ademas", "mientras", "mediante",
        "segun", "antes", "despues", "ahora", "siempre", "nunca", "cada",
        "todo", "toda", "todos", "todas", "otro", "otra", "otros", "otras",
        "mismo", "misma", "mismos", "mismas", "algo", "algun", "alguno",
        "ninguno", "ningun", "mucho", "mucha", "muchos", "muchas",
        "poco", "poca", "pocos", "pocas", "tanto", "tanta", "tantos",
        "tantas", "cuanto", "cuanta", "cuantos", "cuantas",
        # Verbos auxiliares / copulativos
        "seria", "seran", "siendo", "haber", "habia", "habra", "hubiera",
        "tener", "tiene", "tienen", "tenia", "tendran", "tenido",
        "hacer", "hacen", "hecho", "haciendo", "hicieron",
        "poder", "puede", "pueden", "podia", "podran",
        "querer", "quiere", "quieren", "queria",
        "deber", "debe", "deben", "deberia", "deberan",
        "estar", "estaba", "estaban", "estara", "estado",
        "existe", "existen", "existir", "existia",
        "decir", "dijo", "dicen", "dicho", "diciendo",
        "llegar", "llego", "llegan", "llegado",
        "tomar", "tomo", "toman", "tomado",
        "hacer", "hizo", "hacen", "haciendo",
        "volver", "volvio", "vuelven",
        "seguir", "sigue", "siguen",
        "conocer", "conocen", "conocido",
        "llamar", "llaman", "llamado",
        # Pronombres
        "ellos", "ellas", "nosotros", "nosotras", "vosotros", "vosotras",
        "ustedes", "quien", "quienes", "cuales", "cuyo", "cuya", "cuyos",
        # Adverbios vacios
        "mucho", "poco", "bastante", "demasiado", "apenas", "todavia",
        "momento", "momento", "momentos", "veces", "veces", "manera",
        "forma", "parte", "partes", "lugar", "lugares", "caso", "casos",
        "tipo", "tipos", "nivel", "niveles", "punto", "puntos",
        "numero", "numeros", "grupo", "grupos", "sector", "sectores",
        "proceso", "procesos", "sistema", "sistemas", "modelo", "modelos",
        "medida", "medidas", "factor", "factores", "aspecto", "aspectos",
        "ejemplo", "ejemplos", "hecho", "hechos", "dato", "datos",
        "semana", "semanas", "meses", "meses", "pasado", "proxima",
        "proximo", "proximos", "anterior", "anteriores", "siguiente",
        "siguiente", "diferentes", "mismos", "mismas", "primer", "primera",
        "ultimas", "ultimo", "ultima", "nuevo", "nueva", "nuevos", "nuevas",
        # EN stopwords
        "that", "this", "with", "from", "have", "been", "will", "were",
        "they", "their", "said", "also", "would", "could", "should",
        "about", "which", "there", "where", "these", "those", "after",
        "before", "other", "some", "than", "then", "when", "more",
        "most", "such", "into", "over", "only", "very", "just", "even",
        "much", "many", "both", "same", "each", "because", "while",
        # HTML artifacts
        "width", "height", "class", "style", "href", "nbsp", "quot",
        "apos", "span", "div", "img", "src", "alt", "aria", "data",
        # Genericos periodisticos
        "espana", "espanol", "espanola", "espanoles", "espanolas",
        "partido", "gobierno", "presidente", "ministro", "ministra",
        # NOTA: 'partido', 'gobierno', 'presidente' son relevantes solo si
        # aparecen en narrativas donde son actores — se controla con min_df
    }

    _HTML_RE = re.compile(
        r'<[^>]+>|&[a-z#0-9]+;|http\S+|www\.\S+|\d{3,}|[="\'{}\[\]<>\/\\]'
    )

    # Palabras clave de la narrativa para ponderar
    _narr_kws: set[str] = set()
    if narrative_filter:
        _narr_kws = {w.lower() for w in narrative_filter.split() if len(w) > 3}

    counts: dict[str, int] = {}
    for item in news_list:
        raw = (
            f"{item.get('titulo', '')} "
            f"{item.get('resumen', '')} "
            f"{item.get('texto_completo', '')}"
        )
        clean = _HTML_RE.sub(" ", raw).lower()
        # Normalizar caracteres acentuados para comparacion con stopwords
        import unicodedata
        clean_norm = "".join(
            c for c in unicodedata.normalize("NFD", clean)
            if unicodedata.category(c) != "Mn"
        )
        words = clean_norm.split()
        for word in words:
            word = word.strip(".,;:()[]¿?¡!\"'—«»#@_/\\|–·•°")
            if (
                len(word) >= 5
                and word not in _SW
                and word.isalpha()
                and not word.isnumeric()
            ):
                weight = 2 if any(kw in word or word in kw for kw in _narr_kws) else 1
                counts[word] = counts.get(word, 0) + weight

    # Filtrar palabras que solo aparecen 1 vez (ruido)
    counts = {w: c for w, c in counts.items() if c >= 2}
    return sorted(counts.items(), key=lambda x: x[1], reverse=True)[:n]


# ── Datos fijos de estructura de narrativas ───────────────────────────────────
_NARRATIVA_ESTRUCTURA: dict[str, dict] = {
    "Crisis económica": {
        "elementos": ["Prima de riesgo", "Desempleo estructural", "Inflación persistente", "Déficit público", "Deuda soberana"],
        "difusores": ["Medios económicos (Expansión, Cinco Días)", "Oposición PP y VOX", "Think tanks liberales (Funcas, FAES)"],
        "target": "Clase media asalariada, pequeños empresarios, hipotecados variables",
        "potenciadores": ["Datos de paro por encima del 11%", "Rebaja de rating crediticio", "Sanciones UE por déficit excesivo"],
        "debilitadores": ["Bajada del BCE", "Crecimiento PIB por encima de media UE", "Record de exportaciones"],
        "tendencia": [45, 52, 58, 67, 74, 79, 82],
    },
    "Corrupción institucional": {
        "elementos": ["Contratos irregulares", "Financiación ilegal de partidos", "Puertas giratorias", "Nepotismo en cargos públicos"],
        "difusores": ["Medios de investigación (El Confidencial, El País)", "Partidos en oposición", "Redes sociales"],
        "target": "Votantes desencantados, abstencionistas potenciales, jóvenes con baja confianza institucional",
        "potenciadores": ["Nuevas imputaciones judiciales", "Filtraciones de documentos", "Sentencias condenatorias"],
        "debilitadores": ["Absoluciones judiciales", "Reformas de transparencia aprobadas", "Resultados electorales que penalizan al partido imputado"],
        "tendencia": [60, 65, 72, 70, 74, 76, 74],
    },
    "Independentismo catalán": {
        "elementos": ["Referéndum de autodeterminación", "Singularidad fiscal", "Lengua y cultura propias", "Agravio comparativo con el Estado"],
        "difusores": ["Medios catalanes (Ara, VilaWeb, Nació Digital)", "Partidos soberanistas (ERC, Junts, CUP)", "Entidades civiles (ANC, Omnium)"],
        "target": "Electorado catalán movilizado (40-48% del censo), diáspora catalana en Europa",
        "potenciadores": ["Conflicto competencial con el Estado", "Aprobación de la amnistía", "Tensión en el Congreso con el bloque governamental"],
        "debilitadores": ["Gestión autonómica fallida", "Divisiones internas entre soberanistas", "Acuerdos bilaterales Estado-Generalitat"],
        "tendencia": [55, 60, 65, 68, 64, 66, 68],
    },
    "Inmigración irregular": {
        "elementos": ["Llegadas en patera a Canarias", "Menores no acompañados (MENAS)", "Redes de tráfico de personas", "Capacidad de acogida"],
        "difusores": ["VOX y sectores del PP", "Medios de derechas (ABC, La Razón, OK Diario)", "Redes sociales (X/Twitter, Telegram)"],
        "target": "Electores de zonas con alta percepción de inseguridad, votantes de clase trabajadora en competencia laboral",
        "potenciadores": ["Cifras récord de llegadas", "Incidentes de orden público atribuidos a migrantes", "Crisis diplomática con Marruecos"],
        "debilitadores": ["Datos de integración laboral positivos", "Acuerdos migratorios con países de origen", "Condenas judiciales de bulos"],
        "tendencia": [30, 38, 45, 52, 58, 64, 61],
    },
    "Vivienda asequible": {
        "elementos": ["Precio del alquiler", "Emancipación juvenil", "Fondos de inversión inmobiliaria", "Ley de vivienda"],
        "difusores": ["Sindicatos de inquilinos", "Partidos de izquierda (SUMAR, PSOE)", "Medios generalistas en zonas tensionadas"],
        "target": "Jóvenes de 25-40 años en grandes ciudades, rentas medias-bajas en alquiler, familias monoparentales",
        "potenciadores": ["Subida del IPC de alquiler", "Desahucios en aumento", "Compra de pisos por fondos buitre"],
        "debilitadores": ["Aumento de visados de obra nueva", "Caída de tipos de interés", "Acuerdos autonómicos de vivienda pública"],
        "tendencia": [25, 32, 40, 46, 50, 52, 52],
    },
}

# Datos por defecto para narrativas sin estructura específica
_NARRATIVA_DEFAULT = {
    "elementos": ["Cobertura mediática intensa", "Actores políticos implicados", "Debate público activo"],
    "difusores": ["Medios generalistas", "Redes sociales", "Partidos políticos"],
    "target": "Ciudadanía general interesada en política",
    "potenciadores": ["Eventos relacionados de alta relevancia", "Declaraciones de líderes políticos"],
    "debilitadores": ["Agenda setting de otras narrativas más intensas", "Falta de hechos nuevos"],
    "tendencia": [30, 35, 38, 40, 42, 45, 49],
}

with tab_narrativa:
    if not _NARRATIVAS_DEMO:
        st.info("Cargando narrativas... Vuelve a cargar la pagina en unos segundos.")
        st.stop()

    col_radar, col_velocity = st.columns([2, 3], gap="large")

    with col_radar:
        section_header("RADAR DE NARRATIVAS", PURPLE)

        narrative_labels = [n["nombre"] for n in _NARRATIVAS_DEMO[:12]]
        narrative_vals = [n["intensidad"] for n in _NARRATIVAS_DEMO[:12]]
        # Close the polygon (only if we have data)
        r_vals = narrative_vals + [narrative_vals[0]] if narrative_vals else [0]
        theta_vals = narrative_labels + [narrative_labels[0]] if narrative_labels else [""]

        fig_radar = go.Figure()
        fig_radar.add_trace(go.Scatterpolar(
            r=r_vals,
            theta=theta_vals,
            fill="toself",
            fillcolor="rgba(139,92,246,0.145)",
            line=dict(color=PURPLE, width=2),
            name="Intensidad narrativa",
            hovertemplate="%{theta}: <b>%{r}</b><extra></extra>",
        ))
        fig_radar.add_trace(go.Scatterpolar(
            r=[50] * (len(narrative_labels) + 1),
            theta=theta_vals,
            fill="none",
            line=dict(color=BORDER, dash="dot", width=1),
            name="Línea base",
            showlegend=False,
        ))
        fig_radar.update_layout(
            polar=dict(
                radialaxis=dict(
                    visible=True, range=[0, 100],
                    gridcolor=BORDER,
                    tickfont=dict(color=MUTED, size=8),
                ),
                angularaxis=dict(
                    gridcolor=BORDER,
                    tickfont=dict(color=TEXT2, size=9),
                ),
                bgcolor=BG2,
            ),
            paper_bgcolor=BG2,
            font=dict(color=TEXT),
            height=420,
            margin=dict(l=20, r=20, t=30, b=20),
            legend=dict(bgcolor=BG3, font=dict(color=TEXT2, size=10)),
        )
        st.plotly_chart(fig_radar, use_container_width=True)

    with col_velocity:
        section_header("VELOCIDAD DE NARRATIVAS", CYAN)

        fig_vel = go.Figure()
        narrative_names = [n["nombre"] for n in _NARRATIVAS_DEMO]
        narrative_vels = [n["velocidad"] for n in _NARRATIVAS_DEMO]
        narrative_deltas = [n["delta"] for n in _NARRATIVAS_DEMO]

        vel_colors = [
            GREEN if d > 3 else (AMBER if d > 0 else (RED if d < -2 else MUTED))
            for d in narrative_deltas
        ]

        fig_vel.add_trace(go.Bar(
            x=narrative_vels,
            y=narrative_names,
            orientation="h",
            marker=dict(color=vel_colors, line=dict(width=0)),
            hovertemplate="%{y}: <b>%{x}</b> arts/h<extra></extra>",
            name="Velocidad",
        ))
        fig_vel.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT, size=11),
            height=420,
            margin=dict(l=10, r=10, t=20, b=10),
            yaxis=dict(autorange="reversed", tickfont=dict(color=TEXT)),
            xaxis=dict(
                title="Artículos por hora",
                gridcolor=BORDER,
                tickfont=dict(color=TEXT2),
            ),
        )
        st.plotly_chart(fig_vel, use_container_width=True)

    # ── Inflection point narratives ───────────────────────────────────────────
    section_header("NARRATIVAS EN PUNTO DE INFLEXIÓN", RED)
    inflection = [n for n in _NARRATIVAS_DEMO if abs(n["delta"]) >= 4]
    if inflection:
        inf_cols = st.columns(min(len(inflection), 4))
        for i, narr in enumerate(inflection[:4]):
            delta_col = GREEN if narr["delta"] > 0 else RED
            delta_icon = "▲" if narr["delta"] > 0 else "▼"
            with inf_cols[i]:
                st.markdown(
                    f'<div style="background:{delta_col}12;border:1px solid {delta_col}44;'
                    f'border-radius:10px;padding:.7rem;text-align:center">'
                    f'<div style="font-size:.75rem;font-weight:700;color:{TEXT};margin-bottom:.3rem">'
                    f'{narr["nombre"]}</div>'
                    f'<div style="font-size:1.2rem;font-weight:800;color:{delta_col}">'
                    f'{delta_icon} {abs(narr["delta"])} arts/h</div>'
                    f'<div style="font-size:.62rem;color:{TEXT2};margin-top:.2rem">'
                    f'Intensidad: {narr["intensidad"]}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
    else:
        st.info("No se detectan narrativas en punto de inflexión en este momento.")

    # ══════════════════════════════════════════════════════════════════════════
    # ANALISIS DINAMICO DE NARRATIVA
    # ══════════════════════════════════════════════════════════════════════════
    st.markdown("<div style='height:.6rem'></div>", unsafe_allow_html=True)
    section_header("ANALISIS DINAMICO DE NARRATIVA", AMBER)

    _narr_cols_top = st.columns([2, 3], gap="large")
    with _narr_cols_top[0]:
        _narr_names = [n["nombre"] for n in _NARRATIVAS_DEMO]
        if not _narr_names:
            st.info("Sin narrativas disponibles.")
            _sel_narr = {}
            _sel_narr_nombre = ""
            _sel_narr_intensidad = 0
            _sel_narr_delta = 0
        else:
            _sel_narr_idx = st.selectbox(
                "Narrativa a analizar",
                range(len(_narr_names)),
                format_func=lambda i: _narr_names[i],
                key="d7_narr_deep_sel",
                index=0,
            )
            _sel_narr = _NARRATIVAS_DEMO[_sel_narr_idx]
            _sel_narr_nombre = _sel_narr["nombre"]
            _sel_narr_intensidad = _sel_narr.get("intensidad", 50)
            _sel_narr_delta = _sel_narr.get("delta", 0)
        if not _narr_names:
            st.stop()
        # Prioridad: datos vivos de la narrativa seleccionada
        # si tiene estructura completa (vienen del NarrativeService).
        # Fallback: dict estatico por nombre, luego _NARRATIVA_DEFAULT.
        _estructura_live = {
            k: _sel_narr[k]
            for k in ("elementos", "difusores", "potenciadores", "debilitadores", "target", "tendencia")
            if _sel_narr.get(k)
        }
        if len(_estructura_live) >= 3:
            _estructura = {**_NARRATIVA_DEFAULT, **_estructura_live}
        else:
            _estructura = _NARRATIVA_ESTRUCTURA.get(_sel_narr_nombre, _NARRATIVA_DEFAULT)

        _nk1, _nk2, _nk3 = st.columns(3)
        _delta_col = GREEN if _sel_narr_delta > 0 else (RED if _sel_narr_delta < 0 else MUTED)
        _nk1.markdown(kpi_card("Intensidad", f"{_sel_narr_intensidad}/100", color=AMBER), unsafe_allow_html=True)
        _nk2.markdown(kpi_card("Delta 24h", f"{_sel_narr_delta:+d}", color=_delta_col), unsafe_allow_html=True)
        _nk3.markdown(kpi_card("Velocidad", f"{_sel_narr.get('velocidad',0)}/h", color=CYAN), unsafe_allow_html=True)

        # Evolucion temporal
        _tendencia = _estructura.get("tendencia", [50]*7)
        _dias_labels = ["D-6", "D-5", "D-4", "D-3", "D-2", "Ayer", "Hoy"]
        _fig_tend = go.Figure(go.Scatter(
            x=_dias_labels, y=_tendencia,
            mode="lines+markers",
            line=dict(color=AMBER, width=2),
            marker=dict(size=6, color=AMBER, line=dict(width=1, color=BG)),
            fill="tozeroy",
            fillcolor="rgba(245,158,11,0.08)",
        ))
        _fig_tend.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            height=120, margin=dict(l=8, r=8, t=4, b=22),
            xaxis=dict(showgrid=False, tickfont=dict(color=MUTED, size=7)),
            yaxis=dict(showgrid=True, gridcolor=BORDER, tickfont=dict(color=MUTED, size=7), range=[0, 100]),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(_fig_tend, use_container_width=True, config={"displayModeBar": False}, key="d7_narr_tend2")

    with _narr_cols_top[1]:
        # Estructura de la narrativa seleccionada
        def _narr_block(title: str, items: list, color: str) -> str:
            bullets = "".join(
                f'<div style="display:flex;align-items:flex-start;gap:.4rem;margin:.2rem 0">'
                f'<span style="color:{color};font-size:.7rem;flex-shrink:0">—</span>'
                f'<span style="font-size:.77rem;color:{TEXT};line-height:1.4">{i}</span>'
                f'</div>'
                for i in items
            )
            return (
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {color};'
                f'border-radius:6px;padding:.6rem .9rem;margin:.35rem 0">'
                f'<div style="font-size:.58rem;font-weight:800;letter-spacing:.12em;'
                f'text-transform:uppercase;color:{color};margin-bottom:.4rem">{title}</div>'
                f'{bullets}'
                f'</div>'
            )

        _nc1, _nc2 = st.columns(2)
        with _nc1:
            st.markdown(_narr_block("Elementos", _estructura["elementos"], CYAN), unsafe_allow_html=True)
            st.markdown(_narr_block("Potenciadores", _estructura["potenciadores"], GREEN), unsafe_allow_html=True)
        with _nc2:
            st.markdown(_narr_block("Difusores", _estructura["difusores"], BLUE), unsafe_allow_html=True)
            st.markdown(_narr_block("Debilitadores", _estructura["debilitadores"], RED), unsafe_allow_html=True)
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {PURPLE};'
            f'border-radius:6px;padding:.6rem .9rem;margin:.35rem 0">'
            f'<div style="font-size:.58rem;font-weight:800;letter-spacing:.12em;'
            f'text-transform:uppercase;color:{PURPLE};margin-bottom:.3rem">Audiencia objetivo</div>'
            f'<div style="font-size:.77rem;color:{TEXT};line-height:1.4">{_estructura["target"]}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ── Analisis Ollama profundo ─────────────────────────────────────────────
    st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)
    section_header("INTELIGENCIA NARRATIVA — ANALISIS IA", PURPLE)

    _narr_cache_key = f"d7_narr_analysis_{_sel_narr_nombre}"
    _col_run, _col_clear, _col_bias = st.columns([3, 1, 2])
    with _col_run:
        _run_narr = st.button(
            f"Analizar narrativa: {_sel_narr_nombre}",
            key="d7_narr_ai_btn2",
            type="primary",
            use_container_width=True,
        )
    with _col_clear:
        if st.button("Limpiar", key="d7_narr_clear2"):
            st.session_state.pop(_narr_cache_key, None)
            st.session_state.pop("d7_bias_analysis", None)
            st.rerun()
    with _col_bias:
        _run_bias = st.button("Comparar sesgos mediaticos", key="d7_bias_btn2", use_container_width=True)

    if _run_narr:
        # Titulares relacionados: primero los representativos del NarrativeService,
        # luego los de la ingesta general que coincidan con palabras de la narrativa
        _rep_titulares = _sel_narr.get("titulares_representativos", [])[:4]
        _kws_narr = _sel_narr_nombre.lower().split()[:3]
        _titulares_rel = _rep_titulares + [
            n.get("titulo", "") for n in noticias_main
            if any(kw in (n.get("titulo","") + n.get("resumen","")).lower() for kw in _kws_narr)
            and n.get("titulo","") not in _rep_titulares
        ][:6]
        _actores_live = ", ".join(_sel_narr.get("actores_principales", [])[:5]) or "no identificados aun"
        _marco_live = _sel_narr.get("marco", "sin_clasificar")
        _tension_live = _sel_narr.get("tension", "media")
        _ideo_live = _sel_narr.get("ideologia_dominante", "transversal")

        _prompt_narr = (
            f"Analiza en profundidad la narrativa politica \"{_sel_narr_nombre}\" "
            f"en el contexto espanol actual.\n\n"
            f"DATOS EN TIEMPO REAL:\n"
            f"- Intensidad: {_sel_narr_intensidad}/100 (variacion {_sel_narr_delta:+d} en 24h)\n"
            f"- Marco cognitivo detectado: {_marco_live}\n"
            f"- Tension narrativa: {_tension_live}\n"
            f"- Ideologia dominante: {_ideo_live}\n"
            f"- Actores principales identificados: {_actores_live}\n"
            f"- Elementos narrativos: {chr(44).join(_estructura.get('elementos', []))}\n"
            f"- Difusores principales: {chr(44).join(_estructura.get('difusores', [])[:3])}\n"
            f"- Potenciadores: {chr(44).join(_estructura.get('potenciadores', [])[:2])}\n"
            f"- Debilitadores: {chr(44).join(_estructura.get('debilitadores', [])[:2])}\n"
            f"- Audiencia objetivo: {_estructura.get('target', 'ciudadania general')}\n"
            f"- Titulares representativos:\n"
            + "\n".join(f"  * {t}" for t in _titulares_rel if t) + "\n\n"
            "Proporciona analisis estructurado en CINCO secciones exactas:\n"
            "1. MARCO COGNITIVO: que angulo de realidad construye esta narrativa y que emociones activa\n"
            "2. ACTORES NARRATIVOS: quien es el villano, la victima y el heroe en esta narrativa\n"
            "3. TECNICAS PERSUASIVAS: que mecanismos usa para instalarse (miedo, identidad, repeticion)\n"
            "4. CONTRANARRATIVAS: que mensajes podrian neutralizarla eficazmente y en que medios\n"
            "5. RIESGO POLITICO: impacto estimado en intenciones de voto si la narrativa se intensifica\n\n"
            "Se concreto. Cita actores reales. Sin emojis. Responde en espanol."
        )
        with st.spinner("Analizando con Ollama..."):
            if _LLM_OK:
                try:
                    _resp = chat(
                        _prompt_narr,
                        sistema=(
                            "Eres analista senior de inteligencia narrativa especializado en politica espanola. "
                            "Usas metodologia de analisis critico del discurso y framing theory. "
                            "Responde en espanol. Sin emojis. Rigor analitico."
                        ),
                    )
                    st.session_state[_narr_cache_key] = _resp
                except Exception as _exc_narr:
                    st.session_state[_narr_cache_key] = f"Error Ollama: {_exc_narr}"
            else:
                st.session_state[_narr_cache_key] = (
                    f"Ollama no disponible. Datos basicos:\n\n"
                    f"Narrativa: {_sel_narr_nombre} — intensidad {_sel_narr_intensidad}/100 "
                    f"(delta {_sel_narr_delta:+d})\n\n"
                    f"Difusores: {chr(44).join(_estructura['difusores'][:2])}\n\n"
                    f"Target: {_estructura['target']}"
                )

    if _narr_cache_key in st.session_state and st.session_state[_narr_cache_key]:
        _col_a, _col_b = st.columns(2)
        _section_colors = [CYAN, BLUE, PURPLE, AMBER, RED]
        _blocks = [b.strip() for b in st.session_state[_narr_cache_key].split("\n\n") if b.strip()]
        for _bi, _block in enumerate(_blocks[:10]):
            _bc = _section_colors[_bi % len(_section_colors)]
            _is_header = _block[:3] in ("1. ", "2. ", "3. ", "4. ", "5. ") or _block.isupper()
            (_col_a if _bi % 2 == 0 else _col_b).markdown(
                f'<div style="background:{_bc}08;border-left:2px solid {_bc};'
                f'border-radius:0 5px 5px 0;padding:.6rem .9rem;margin:.3rem 0;'
                f'font-size:.80rem;color:{TEXT if not _is_header else _bc};'
                f'font-weight:{"700" if _is_header else "400"};line-height:1.5">'
                f'{html.escape(_block)}'
                f'</div>',
                unsafe_allow_html=True,
            )

    # ── Nube de terminos + comparativa mediatica ─────────────────────────────
    st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
    _cloud_col, _comp_col = st.columns([3, 2], gap="large")

    with _cloud_col:
        section_header("TERMINOS DOMINANTES EN MEDIOS", CYAN)
        # Filtrar articulos relacionados con la narrativa seleccionada
        _narr_name_filter = _sel_narr_nombre if "_sel_narr_nombre" in dir() else None
        if _narr_name_filter:
            _narr_kws_filter = _narr_name_filter.lower().split()[:4]
            _nws_for_cloud = [
                n for n in noticias_main
                if any(kw in (n.get("titulo","") + n.get("resumen","")).lower()
                       for kw in _narr_kws_filter)
            ] or noticias_main
        else:
            _nws_for_cloud = noticias_main
        _all_top_words = _top_words(_nws_for_cloud, 24, narrative_filter=_narr_name_filter)
        if _all_top_words:
            _max_c = max(c for _, c in _all_top_words)
            _tag_colors = [CYAN, BLUE, PURPLE, GREEN, AMBER, RED, "#EC4899", "#F97316"]
            _tags_html = '<div style="line-height:2.6;padding:.3rem 0">'
            for _wi, (_word, _count) in enumerate(_all_top_words):
                _sz = 0.62 + (_count / _max_c) * 0.95
                _col_t = _tag_colors[_wi % len(_tag_colors)]
                _tags_html += (
                    f'<span style="background:{_col_t}18;color:{_col_t};'
                    f'border:1px solid {_col_t}44;border-radius:3px;'
                    f'padding:.12rem .45rem;margin:.15rem .2rem;display:inline-block;'
                    f'font-size:{_sz:.2f}rem;font-weight:600">'
                    f'{html.escape(_word)}'
                    f'<span style="font-size:.52rem;opacity:.65;margin-left:.25rem">{_count}</span>'
                    f'</span>'
                )
            _tags_html += '</div>'
            st.markdown(_tags_html, unsafe_allow_html=True)
        else:
            st.info("Sin datos suficientes para nube de terminos.")

    with _comp_col:
        section_header("COMPARATIVA IZQUIERDA / DERECHA", BLUE)
        _left_src = {"elpais", "eldiario", "publico", "infolibre"}
        _right_src = {"elmundo", "abc", "larazon"}
        _left_nws  = [n for n in noticias_main if n.get("fuente") in _left_src]
        _right_nws = [n for n in noticias_main if n.get("fuente") in _right_src]
        _left_top  = _top_words(_left_nws, 6, narrative_filter=_narr_name_filter)
        _right_top = _top_words(_right_nws, 6, narrative_filter=_narr_name_filter)
        _lr_cols2  = st.columns(2)
        for _si, (_sl, _sc, _sw) in enumerate([("Izquierda", RED, _left_top), ("Derecha", BLUE, _right_top)]):
            with _lr_cols2[_si]:
                st.markdown(
                    f'<div style="font-size:.62rem;color:{_sc};font-weight:700;'
                    f'letter-spacing:.1em;margin-bottom:.35rem">{_sl.upper()}</div>',
                    unsafe_allow_html=True,
                )
                for _ww, _wc in _sw:
                    _bw = int(_wc / max(_sw[0][1], 1) * 100) if _sw else 0
                    st.markdown(
                        f'<div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.24rem">'
                        f'<span style="font-size:.68rem;color:{TEXT2};width:76px;flex-shrink:0;'
                        f'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{_ww}</span>'
                        f'<div style="flex:1;height:4px;background:{BORDER};border-radius:2px">'
                        f'<div style="width:{_bw}%;height:4px;background:{_sc};border-radius:2px"></div>'
                        f'</div>'
                        f'<span style="font-size:.62rem;color:{MUTED};width:18px;text-align:right">{_wc}</span>'
                        f'</div>',
                        unsafe_allow_html=True,
                    )

        if _run_bias:
            _lh = [n.get("titulo","") for n in _left_nws[:5]]
            _rh = [n.get("titulo","") for n in _right_nws[:5]]
            _bias_ctx = (
                f"Medios izquierda: {chr(59).join(_lh)}\n"
                f"Medios derecha: {chr(59).join(_rh)}\n"
                f"Top terminos comunes: {chr(44).join(w for w, _ in (_all_top_words if '_all_top_words' in dir() else [])[:10])}"
            )
            with st.spinner("Analizando sesgos con Ollama..."):
                if _LLM_OK:
                    try:
                        _bias_resp = chat(
                            f"Analiza los sesgos mediaticos comparativos de hoy:\n{_bias_ctx}\n\n"
                            "Identifica: 1) Diferencias de encuadre, 2) Temas silenciados, "
                            "3) Palabras diferenciadoras, 4) Narrativa dominante. Sin emojis.",
                            sistema="Eres analista experto en medios espanoles. Objetivo y conciso.",
                        )
                        st.session_state["d7_bias_analysis"] = _bias_resp
                    except Exception as _bex:
                        st.session_state["d7_bias_analysis"] = f"Error: {_bex}"
                else:
                    _tl = [w for w, _ in _top_words(_left_nws, 5, narrative_filter=_narr_name_filter)]
                    _tr = [w for w, _ in _top_words(_right_nws, 5, narrative_filter=_narr_name_filter)]
                    st.session_state["d7_bias_analysis"] = (
                        f"Izquierda: {chr(44).join(_tl)}\n\nDerecha: {chr(44).join(_tr)}\n\nActiva Ollama."
                    )

        if "d7_bias_analysis" in st.session_state:
            _b_blocks = [b.strip() for b in st.session_state["d7_bias_analysis"].split("\n\n") if b.strip()]
            for _bbi, _bb in enumerate(_b_blocks[:5]):
                _bbc = [CYAN, BLUE, PURPLE, AMBER][_bbi % 4]
                st.markdown(
                    f'<div style="background:{_bbc}10;border-left:3px solid {_bbc};'
                    f'border-radius:5px;padding:.55rem .85rem;margin-bottom:.3rem;'
                    f'font-size:.78rem;color:{TEXT};line-height:1.5">'
                    f'{html.escape(_bb)}'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    # ══════════════════════════════════════════════════════════════════════════
    # CRUCE: ALERTAS DE DESINFORMACION RELACIONADAS
    # Conexion con agents.intelligence.disinfo_scraper / disinfo_analyzer
    # ══════════════════════════════════════════════════════════════════════════
    st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
    section_header("ALERTAS DE DESINFORMACION RELACIONADAS", RED)
    st.markdown(
        f'<p style="font-size:.74rem;color:{MUTED};margin:-6px 0 8px">Contenido falso o enganoso vinculado '
        f'a la narrativa seleccionada — fuentes: EUvsDisinfo, Maldita.es, Newtral, AFP Factual, Verificat, Bellingcat.</p>',
        unsafe_allow_html=True,
    )

    @st.cache_data(ttl=1800, show_spinner=False)
    def _load_disinfo_items(narrative_keyword: str) -> list[dict]:
        """Intenta cargar items reales del DisinfoScraper; fallback a demo."""
        try:
            from agents.intelligence.disinfo_scraper import DisinfoScraper as _DS
            _scraper = _DS()
            _all = _scraper.fetch_all(since_hours=72)
            kw = narrative_keyword.lower()
            _filtered = [
                i for i in _all
                if kw in i.title.lower()
                or any(kw in k for k in i.keywords)
                or any(kw in a.lower() for a in i.actors)
            ]
            return [
                {
                    "titulo": i.title,
                    "fuente": i.source_name,
                    "veredicto": i.verdict,
                    "origen": i.origin,
                    "taxonomia": i.taxonomy,
                    "url": i.url,
                    "actors": i.actors[:3],
                }
                for i in _filtered[:6]
            ]
        except Exception:
            pass
        # Demo data — siempre relativa a la narrativa en foco
        return [
            {
                "titulo": f"Afirmacion sin verificar sobre {narrative_keyword} difundida en redes",
                "fuente": "Maldita.es",
                "veredicto": "falso",
                "origen": "ES",
                "taxonomia": "DOMESTIC",
                "url": "#",
                "actors": [],
            },
            {
                "titulo": f"Cuenta coordinada amplifica mensajes sobre {narrative_keyword}",
                "fuente": "EUvsDisinfo",
                "veredicto": "enganoso",
                "origen": "RU",
                "taxonomia": "FIMI",
                "url": "#",
                "actors": [],
            },
        ]

    _narr_kw = _sel_narr_nombre.split()[0] if "_sel_narr_nombre" in dir() else "economia"
    try:
        _narr_kw = _sel_narr_nombre.split()[0]
    except Exception:
        _narr_kw = "politica"

    _disinfo_items = _load_disinfo_items(_narr_kw)

    _VERDICT_COLORS = {
        "falso": RED,
        "enganoso": AMBER,
        "sin_contexto": BLUE,
        "parcialmente_falso": AMBER,
        "verdadero": GREEN,
        "satira": MUTED,
        "desconocido": MUTED,
    }
    _TAXONOMY_LABELS = {
        "FIMI": "Operacion de influencia extranjera",
        "DOMESTIC": "Desinformacion interna",
        "COORDINATED": "Coordinacion detectada",
        "ORGANIC": "Organico",
    }

    if not _disinfo_items:
        st.info("No se detectan alertas de desinformacion vinculadas a esta narrativa en las ultimas 72h.")
    else:
        _dc1, _dc2 = st.columns(2, gap="medium")
        for _di_idx, _di in enumerate(_disinfo_items):
            _dc = _dc1 if _di_idx % 2 == 0 else _dc2
            _vc = _VERDICT_COLORS.get(_di.get("veredicto", "desconocido"), MUTED)
            _tax_label = _TAXONOMY_LABELS.get(_di.get("taxonomia", ""), _di.get("taxonomia", ""))
            _verdict_label = _di.get("veredicto", "desconocido").replace("_", " ").upper()
            with _dc:
                st.markdown(
                    f'<div style="background:{_vc}0d;border:1px solid {_vc}40;border-radius:8px;'
                    f'padding:.6rem .85rem;margin-bottom:.5rem">'
                    f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">'
                    f'<span style="font-size:.65rem;font-weight:700;color:{_vc};letter-spacing:.06em">'
                    f'{_verdict_label}</span>'
                    f'<span style="font-size:.6rem;color:{MUTED}">{_di.get("fuente","")}'
                    f' | {_di.get("origen","")}</span>'
                    f'</div>'
                    f'<div style="font-size:.76rem;color:{TEXT};font-weight:500;line-height:1.35;margin-bottom:.25rem">'
                    f'{html.escape(_di.get("titulo",""))}</div>'
                    f'<div style="font-size:.63rem;color:{MUTED}">{_tax_label}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    # Boton analisis FIMI con Ollama
    if st.button("Analizar patron de desinformacion con IA", key="d7_fimi_btn"):
        with st.spinner("Analizando patron FIMI..."):
            try:
                import requests as _req
                _fimi_ctx = "\n".join(
                    f"- [{i.get('veredicto','')}] {i.get('titulo','')} (origen: {i.get('origen','')})"
                    for i in _disinfo_items
                ) or "No hay items de desinformacion disponibles."
                _fimi_prompt = (
                    f"Eres analista de inteligencia especializado en FIMI y desinformacion.\n\n"
                    f"Narrativa en foco: {_sel_narr_nombre}\n\n"
                    f"Alertas de desinformacion relacionadas:\n{_fimi_ctx}\n\n"
                    f"Analiza el patron de desinformacion:\n"
                    f"1. Coherencia del patron (organico vs coordinado)\n"
                    f"2. Probable objetivo politico\n"
                    f"3. Actores beneficiados\n"
                    f"4. Recomendacion de contranarrativa\n"
                    f"Responde de forma concisa en espanol, sin emojis."
                )
                _fr = _req.post(
                    "http://localhost:11434/api/generate",
                    json={"model": "qwen3:8b", "prompt": _fimi_prompt,
                          "stream": False, "options": {"temperature": 0.3, "num_predict": 900}},
                    timeout=90,
                )
                _fr.raise_for_status()
                _fimi_raw = _fr.json().get("response", "")
                _fimi_raw = re.sub(r"<think>.*?</think>", "", _fimi_raw, flags=re.DOTALL).strip()
                st.session_state["d7_fimi_analysis"] = _fimi_raw
            except Exception as _fe:
                st.session_state["d7_fimi_analysis"] = f"Ollama no disponible: {_fe}"

    if "d7_fimi_analysis" in st.session_state:
        st.markdown(
            f'<div style="background:{RED}0d;border-left:3px solid {RED};border-radius:6px;'
            f'padding:.7rem 1rem;margin-top:.5rem;font-size:.78rem;color:{TEXT};white-space:pre-wrap;'
            f'line-height:1.6">{html.escape(st.session_state["d7_fimi_analysis"])}</div>',
            unsafe_allow_html=True,
        )
# ─── Zoom preset para el mapa por region seleccionada ────────────────────────
def _get_zoom_preset(selected_regions: tuple | list) -> dict:
    """Devuelve parametros de zoom/centro para update_geos segun regiones."""
    regions = set(selected_regions) if selected_regions else set()
    # Solo España (Nacional o Regional)
    if regions <= {"España Nacional", "España Regional"} and regions:
        return {"lat": 40.4, "lon": -3.7, "scale": 5.0,
                "range_lat": [35.5, 44.5], "range_lon": [-9.5, 4.5]}
    # España + Europa
    if regions and regions <= {"España Nacional", "España Regional", "Europa"}:
        return {"lat": 48.0, "lon": 4.0, "scale": 2.8,
                "range_lat": [34.0, 72.0], "range_lon": [-12.0, 45.0]}
    # Solo Europa
    if regions == {"Europa"}:
        return {"lat": 54.0, "lon": 15.0, "scale": 2.5,
                "range_lat": [34.0, 72.0], "range_lon": [-12.0, 45.0]}
    # Solo America del Norte
    if regions == {"America del Norte"}:
        return {"lat": 45.0, "lon": -95.0, "scale": 1.8,
                "range_lat": [14.0, 72.0], "range_lon": [-170.0, -50.0]}
    # Solo America del Sur
    if regions == {"America del Sur"}:
        return {"lat": -15.0, "lon": -60.0, "scale": 1.8,
                "range_lat": [-57.0, 15.0], "range_lon": [-82.0, -34.0]}
    # Solo Africa
    if regions == {"Africa"}:
        return {"lat": 0.0, "lon": 20.0, "scale": 1.6,
                "range_lat": [-35.0, 37.0], "range_lon": [-18.0, 52.0]}
    # Solo Asia / Oriente Medio
    if regions == {"Asia"}:
        return {"lat": 25.0, "lon": 95.0, "scale": 1.6,
                "range_lat": [-12.0, 70.0], "range_lon": [25.0, 155.0]}
    # Vista global (default / Internacional)
    return {"lat": 20.0, "lon": 0.0, "scale": 1.0,
            "range_lat": None, "range_lon": None}


# ─── Datos de eventos globales para el mapa (fallback sin BD) ────────────────
_ALL_MAP_EVENTS: list[dict] = [
    # EUROPA
    {"title": "Cumbre UE sobre aranceles Trump", "source_name": "Reuters", "source_region": "europe", "source_country": "EU", "source_lat": 50.85, "source_lon": 4.35, "published_at": "2026-05-03T08:00:00Z", "ai_relevance": 9, "ai_category": "politica_exterior", "ai_sentiment": "negativo", "ai_geo_location": "Brussels, Belgium", "ai_geo_lat": 50.85, "ai_geo_lon": 4.35, "ai_summary": "La UE debate respuesta arancelaria coordinada tras nuevas medidas de Trump.", "ai_spain_impact": "alto"},
    {"title": "Elecciones en Rumania: giro hacia la ultraderecha", "source_name": "Politico EU", "source_region": "europe", "source_country": "Romania", "source_lat": 44.43, "source_lon": 26.10, "published_at": "2026-05-02T18:00:00Z", "ai_relevance": 8, "ai_category": "politica_interior", "ai_sentiment": "negativo", "ai_geo_location": "Bucharest, Romania", "ai_geo_lat": 44.43, "ai_geo_lon": 26.10, "ai_summary": "Candidato ultraderechista lidera sondeos en Rumania.", "ai_spain_impact": "medio"},
    {"title": "Alemania activa paquete de defensa 500.000M euros", "source_name": "Der Spiegel", "source_region": "europe", "source_country": "Germany", "source_lat": 52.52, "source_lon": 13.40, "published_at": "2026-05-01T10:00:00Z", "ai_relevance": 9, "ai_category": "seguridad_defensa", "ai_sentiment": "neutro", "ai_geo_location": "Berlin, Germany", "ai_geo_lat": 52.52, "ai_geo_lon": 13.40, "ai_summary": "Bundestag aprueba historico aumento del gasto en defensa.", "ai_spain_impact": "medio"},
    {"title": "Francia: huelga general sectores transporte y energia", "source_name": "Le Monde", "source_region": "europe", "source_country": "France", "source_lat": 48.85, "source_lon": 2.35, "published_at": "2026-05-01T07:00:00Z", "ai_relevance": 7, "ai_category": "economia", "ai_sentiment": "negativo", "ai_geo_location": "Paris, France", "ai_geo_lat": 48.85, "ai_geo_lon": 2.35, "ai_summary": "Sindicatos franceses convocan huelga general por reforma laboral.", "ai_spain_impact": "bajo"},
    {"title": "Italia: crisis de gobierno por presupuesto 2027", "source_name": "Corriere della Sera", "source_region": "europe", "source_country": "Italy", "source_lat": 41.90, "source_lon": 12.48, "published_at": "2026-04-30T15:00:00Z", "ai_relevance": 7, "ai_category": "politica_interior", "ai_sentiment": "negativo", "ai_geo_location": "Rome, Italy", "ai_geo_lat": 41.90, "ai_geo_lon": 12.48, "ai_summary": "Coalicion de Meloni en tension por desacuerdo presupuestario.", "ai_spain_impact": "bajo"},
    {"title": "OTAN: cumbre de ministros de defensa en La Haya", "source_name": "Reuters", "source_region": "europe", "source_country": "Netherlands", "source_lat": 52.09, "source_lon": 4.30, "published_at": "2026-05-03T09:00:00Z", "ai_relevance": 8, "ai_category": "seguridad_defensa", "ai_sentiment": "neutro", "ai_geo_location": "The Hague, Netherlands", "ai_geo_lat": 52.09, "ai_geo_lon": 4.30, "ai_summary": "Aliados OTAN debaten aumento gasto al 3% del PIB.", "ai_spain_impact": "alto"},
    {"title": "Polonia refuerza frontera con Bielorrusia", "source_name": "Reuters", "source_region": "europe", "source_country": "Poland", "source_lat": 52.23, "source_lon": 21.01, "published_at": "2026-05-02T12:00:00Z", "ai_relevance": 7, "ai_category": "seguridad_defensa", "ai_sentiment": "negativo", "ai_geo_location": "Warsaw, Poland", "ai_geo_lat": 52.23, "ai_geo_lon": 21.01, "ai_summary": "Varsovia despliega 10.000 soldados en frontera este.", "ai_spain_impact": "bajo"},
    # ESPAÑA
    {"title": "Sanchez anuncia nuevo plan de vivienda asequible", "source_name": "El Pais", "source_region": "local_spain", "source_country": "Spain", "source_lat": 40.42, "source_lon": -3.70, "published_at": "2026-05-03T10:00:00Z", "ai_relevance": 8, "ai_category": "politica_interior", "ai_sentiment": "mixto", "ai_geo_location": "Madrid, Spain", "ai_geo_lat": 40.42, "ai_geo_lon": -3.70, "ai_summary": "Gobierno presenta medidas para frenar precio del alquiler en areas tensionadas.", "ai_spain_impact": "critico"},
    {"title": "Feijoo exige elecciones anticipadas por crisis presupuestaria", "source_name": "El Mundo", "source_region": "local_spain", "source_country": "Spain", "source_lat": 40.42, "source_lon": -3.70, "published_at": "2026-05-03T09:30:00Z", "ai_relevance": 8, "ai_category": "politica_interior", "ai_sentiment": "negativo", "ai_geo_location": "Madrid, Spain", "ai_geo_lat": 40.42, "ai_geo_lon": -3.70, "ai_summary": "PP pide convocatoria electoral tras nuevo bloqueo presupuestario.", "ai_spain_impact": "critico"},
    {"title": "Llegadas record en Canarias: 3.200 en una semana", "source_name": "El Confidencial", "source_region": "regional_spain", "source_country": "Spain", "source_lat": 28.12, "source_lon": -15.44, "published_at": "2026-05-02T14:00:00Z", "ai_relevance": 8, "ai_category": "sociedad", "ai_sentiment": "negativo", "ai_geo_location": "Las Palmas, Spain", "ai_geo_lat": 28.12, "ai_geo_lon": -15.44, "ai_summary": "Nuevo record de llegadas de migrantes a Canarias en 2026.", "ai_spain_impact": "critico"},
    {"title": "Tribunal Supremo: nueva sentencia sobre financiacion autonomica", "source_name": "ABC", "source_region": "local_spain", "source_country": "Spain", "source_lat": 40.42, "source_lon": -3.70, "published_at": "2026-05-02T11:00:00Z", "ai_relevance": 7, "ai_category": "justicia", "ai_sentiment": "neutro", "ai_geo_location": "Madrid, Spain", "ai_geo_lat": 40.42, "ai_geo_lon": -3.70, "ai_summary": "El Supremo falla sobre reparto de fondos entre comunidades.", "ai_spain_impact": "alto"},
    {"title": "CIS: intension de voto PP sube 2 puntos en mayo", "source_name": "Europa Press", "source_region": "local_spain", "source_country": "Spain", "source_lat": 40.42, "source_lon": -3.70, "published_at": "2026-05-01T16:00:00Z", "ai_relevance": 8, "ai_category": "politica_interior", "ai_sentiment": "neutro", "ai_geo_location": "Madrid, Spain", "ai_geo_lat": 40.42, "ai_geo_lon": -3.70, "ai_summary": "Nueva encuesta CIS muestra subida del PP y caida de VOX.", "ai_spain_impact": "alto"},
    {"title": "Huelga de docentes en Madrid y Cataluna", "source_name": "El Diario", "source_region": "local_spain", "source_country": "Spain", "source_lat": 40.42, "source_lon": -3.70, "published_at": "2026-05-03T07:00:00Z", "ai_relevance": 7, "ai_category": "sociedad", "ai_sentiment": "negativo", "ai_geo_location": "Madrid, Spain", "ai_geo_lat": 40.42, "ai_geo_lon": -3.70, "ai_summary": "Profesores paran por mejoras salariales y ratios en aulas.", "ai_spain_impact": "alto"},
    # NORTEAMERICA
    {"title": "Trump impone aranceles 25% a importaciones europeas", "source_name": "Reuters", "source_region": "north_america", "source_country": "USA", "source_lat": 38.90, "source_lon": -77.03, "published_at": "2026-05-03T12:00:00Z", "ai_relevance": 10, "ai_category": "economia", "ai_sentiment": "negativo", "ai_geo_location": "Washington DC, USA", "ai_geo_lat": 38.90, "ai_geo_lon": -77.03, "ai_summary": "Casa Blanca anuncia nuevos aranceles que afectan a exportaciones espanolas.", "ai_spain_impact": "critico"},
    {"title": "Fed mantiene tipos ante incertidumbre inflacion", "source_name": "Wall Street Journal", "source_region": "north_america", "source_country": "USA", "source_lat": 40.71, "source_lon": -74.01, "published_at": "2026-05-01T19:00:00Z", "ai_relevance": 8, "ai_category": "economia", "ai_sentiment": "neutro", "ai_geo_location": "New York, USA", "ai_geo_lat": 40.71, "ai_geo_lon": -74.01, "ai_summary": "Reserva Federal sin cambios a la espera de datos de empleo.", "ai_spain_impact": "medio"},
    {"title": "Canada: elecciones dan mayoria a Liberales", "source_name": "CBC", "source_region": "north_america", "source_country": "Canada", "source_lat": 45.42, "source_lon": -75.69, "published_at": "2026-04-29T22:00:00Z", "ai_relevance": 7, "ai_category": "politica_interior", "ai_sentiment": "positivo", "ai_geo_location": "Ottawa, Canada", "ai_geo_lat": 45.42, "ai_geo_lon": -75.69, "ai_summary": "Carney gana las elecciones federales con mayoria comoda.", "ai_spain_impact": "bajo"},
    # LATINOAMERICA
    {"title": "Venezuela: represion brutal de protestas opositoras", "source_name": "El Pais", "source_region": "latin_america", "source_country": "Venezuela", "source_lat": 10.48, "source_lon": -66.87, "published_at": "2026-05-02T16:00:00Z", "ai_relevance": 8, "ai_category": "politica_interior", "ai_sentiment": "negativo", "ai_geo_location": "Caracas, Venezuela", "ai_geo_lat": 10.48, "ai_geo_lon": -66.87, "ai_summary": "Maduro disuelve marchas con detencion de 200 activistas.", "ai_spain_impact": "medio"},
    {"title": "Argentina: FMI aprueba nuevo tramo credito Milei", "source_name": "Reuters", "source_region": "latin_america", "source_country": "Argentina", "source_lat": -34.60, "source_lon": -58.38, "published_at": "2026-05-01T20:00:00Z", "ai_relevance": 7, "ai_category": "economia", "ai_sentiment": "positivo", "ai_geo_location": "Buenos Aires, Argentina", "ai_geo_lat": -34.60, "ai_geo_lon": -58.38, "ai_summary": "FMI libera 5.000M$ tras revision positiva ajuste argentino.", "ai_spain_impact": "bajo"},
    {"title": "Mexico: AMLO sucesor endurece postura sobre migracion", "source_name": "Reuters", "source_region": "latin_america", "source_country": "Mexico", "source_lat": 19.43, "source_lon": -99.13, "published_at": "2026-04-30T14:00:00Z", "ai_relevance": 7, "ai_category": "politica_exterior", "ai_sentiment": "negativo", "ai_geo_location": "Mexico City, Mexico", "ai_geo_lat": 19.43, "ai_geo_lon": -99.13, "ai_summary": "Sheinbaum refuerza control fronterizo bajo presion de EEUU.", "ai_spain_impact": "bajo"},
    # AFRICA
    {"title": "Sudan: crisis humanitaria supera 10 millones de desplazados", "source_name": "Al Jazeera", "source_region": "africa", "source_country": "Sudan", "source_lat": 15.55, "source_lon": 32.53, "published_at": "2026-05-02T08:00:00Z", "ai_relevance": 8, "ai_category": "sociedad", "ai_sentiment": "negativo", "ai_geo_location": "Khartoum, Sudan", "ai_geo_lat": 15.55, "ai_geo_lon": 32.53, "ai_summary": "ONU alerta del mayor desplazamiento humano en dos decadas.", "ai_spain_impact": "medio"},
    {"title": "Marruecos: tension diplomatica con Espana por Ceuta y Melilla", "source_name": "ABC", "source_region": "africa", "source_country": "Morocco", "source_lat": 33.99, "source_lon": -6.85, "published_at": "2026-05-01T11:00:00Z", "ai_relevance": 8, "ai_category": "politica_exterior", "ai_sentiment": "negativo", "ai_geo_location": "Rabat, Morocco", "ai_geo_lat": 33.99, "ai_geo_lon": -6.85, "ai_summary": "Nuevas fricciones diplomaticas sobre gestion de frontera sur.", "ai_spain_impact": "critico"},
    {"title": "Sahel: Francia cierra ultima base militar en Niger", "source_name": "Le Monde", "source_region": "africa", "source_country": "Niger", "source_lat": 13.51, "source_lon": 2.12, "published_at": "2026-04-28T09:00:00Z", "ai_relevance": 7, "ai_category": "seguridad_defensa", "ai_sentiment": "negativo", "ai_geo_location": "Niamey, Niger", "ai_geo_lat": 13.51, "ai_geo_lon": 2.12, "ai_summary": "Retirada definitiva francesa del Sahel abre vacio de seguridad.", "ai_spain_impact": "medio"},
    # ASIA
    {"title": "China: ejercicios militares masivos en Estrecho de Taiwan", "source_name": "Reuters", "source_region": "asia", "source_country": "China", "source_lat": 39.91, "source_lon": 116.39, "published_at": "2026-05-03T06:00:00Z", "ai_relevance": 9, "ai_category": "seguridad_defensa", "ai_sentiment": "negativo", "ai_geo_location": "Taiwan Strait, China", "ai_geo_lat": 24.48, "ai_geo_lon": 120.96, "ai_summary": "Pekin lanza maniobras de mayor escala desde 1996.", "ai_spain_impact": "medio"},
    {"title": "India supera a China como primera economia emergente", "source_name": "FT", "source_region": "asia", "source_country": "India", "source_lat": 28.61, "source_lon": 77.20, "published_at": "2026-05-02T10:00:00Z", "ai_relevance": 8, "ai_category": "economia", "ai_sentiment": "positivo", "ai_geo_location": "New Delhi, India", "ai_geo_lat": 28.61, "ai_geo_lon": 77.20, "ai_summary": "FMI revisa al alza PIB indio por encima del chino por primera vez.", "ai_spain_impact": "bajo"},
    {"title": "Japon sube tipos por primera vez en 20 anos", "source_name": "Nikkei", "source_region": "asia", "source_country": "Japan", "source_lat": 35.68, "source_lon": 139.69, "published_at": "2026-05-01T04:00:00Z", "ai_relevance": 8, "ai_category": "economia", "ai_sentiment": "mixto", "ai_geo_location": "Tokyo, Japan", "ai_geo_lat": 35.68, "ai_geo_lon": 139.69, "ai_summary": "Banco de Japon eleva tipos al 0.75% impactando mercados globales.", "ai_spain_impact": "medio"},
    {"title": "Corea del Norte lanza misil balístico sobre Mar del Japon", "source_name": "Reuters", "source_region": "asia", "source_country": "North Korea", "source_lat": 39.03, "source_lon": 125.75, "published_at": "2026-04-30T03:00:00Z", "ai_relevance": 8, "ai_category": "seguridad_defensa", "ai_sentiment": "negativo", "ai_geo_location": "Pyongyang, North Korea", "ai_geo_lat": 39.03, "ai_geo_lon": 125.75, "ai_summary": "Pyongyang prueba nuevo misil de alcance intermedio.", "ai_spain_impact": "bajo"},
    # ORIENTE MEDIO
    {"title": "Israel y Hamas: negociaciones cese al fuego en El Cairo", "source_name": "Reuters", "source_region": "asia", "source_country": "Israel", "source_lat": 31.77, "source_lon": 35.21, "published_at": "2026-05-03T11:00:00Z", "ai_relevance": 9, "ai_category": "politica_exterior", "ai_sentiment": "mixto", "ai_geo_location": "Gaza, Palestine", "ai_geo_lat": 31.50, "ai_geo_lon": 34.47, "ai_summary": "Mediadores egipcios intentan nuevo acuerdo de tregua.", "ai_spain_impact": "alto"},
    {"title": "Iran: acuerdo nuclear provisional con EEUU y UE", "source_name": "FT", "source_region": "asia", "source_country": "Iran", "source_lat": 35.69, "source_lon": 51.39, "published_at": "2026-05-02T15:00:00Z", "ai_relevance": 9, "ai_category": "politica_exterior", "ai_sentiment": "positivo", "ai_geo_location": "Tehran, Iran", "ai_geo_lat": 35.69, "ai_geo_lon": 51.39, "ai_summary": "Teheran acepta inspeccion AIEA a cambio de alivio sancionador.", "ai_spain_impact": "medio"},
    # UCRANIA/RUSIA
    {"title": "Ucrania: Rusia lanza mayor ofensiva desde 2022 en Kharkiv", "source_name": "Reuters", "source_region": "europe", "source_country": "Ukraine", "source_lat": 49.99, "source_lon": 36.23, "published_at": "2026-05-03T07:00:00Z", "ai_relevance": 10, "ai_category": "seguridad_defensa", "ai_sentiment": "negativo", "ai_geo_location": "Kharkiv, Ukraine", "ai_geo_lat": 49.99, "ai_geo_lon": 36.23, "ai_summary": "Fuerzas rusas lanzan ataque coordinado en frente norte.", "ai_spain_impact": "alto"},
    {"title": "Putin asiste a parade de la Victoria con Xi Jinping", "source_name": "Reuters", "source_region": "europe", "source_country": "Russia", "source_lat": 55.75, "source_lon": 37.62, "published_at": "2026-05-09T09:00:00Z", "ai_relevance": 9, "ai_category": "politica_exterior", "ai_sentiment": "negativo", "ai_geo_location": "Moscow, Russia", "ai_geo_lat": 55.75, "ai_geo_lon": 37.62, "ai_summary": "Exhibicion de alianza sino-rusa en el 81 aniversario de la Victoria.", "ai_spain_impact": "medio"},
    # ESPAÑA REGIONAL (source_region=regional_spain → asignado a "España Regional")
    {"title": "Cataluña: Govern aprueba ley de vivienda con tasas a pisos vacíos", "source_name": "La Vanguardia", "source_region": "regional_spain", "source_country": "Spain", "source_lat": 41.38, "source_lon": 2.17, "published_at": "2026-05-03T11:00:00Z", "ai_relevance": 8, "ai_category": "politica_interior", "ai_sentiment": "mixto", "ai_geo_location": "Cataluña, Spain", "ai_geo_lat": 41.38, "ai_geo_lon": 2.17, "ai_summary": "El Govern catalán aprueba una ley que obliga a alquilar pisos vacíos o pagar tasas.", "ai_spain_impact": "alto"},
    {"title": "País Vasco: ETA victims' association asks for full archive access", "source_name": "El Correo", "source_region": "regional_spain", "source_country": "Spain", "source_lat": 43.26, "source_lon": -2.93, "published_at": "2026-05-02T15:00:00Z", "ai_relevance": 7, "ai_category": "justicia", "ai_sentiment": "negativo", "ai_geo_location": "País Vasco, Spain", "ai_geo_lat": 43.26, "ai_geo_lon": -2.93, "ai_summary": "Asociaciones de víctimas del terrorismo exigen acceso a los archivos de la memoria histórica vasca.", "ai_spain_impact": "alto"},
    {"title": "Andalucía: Juanma Moreno presenta presupuesto récord para 2027", "source_name": "Sur.es", "source_region": "regional_spain", "source_country": "Spain", "source_lat": 37.38, "source_lon": -5.99, "published_at": "2026-05-01T12:00:00Z", "ai_relevance": 7, "ai_category": "economia", "ai_sentiment": "positivo", "ai_geo_location": "Andalucía, Spain", "ai_geo_lat": 37.38, "ai_geo_lon": -5.99, "ai_summary": "La Junta de Andalucía presenta un presupuesto de 48.000M€ con bajada del IRPF.", "ai_spain_impact": "alto"},
    {"title": "Valencia: reconstrucción DANA supera el 60% en zonas afectadas", "source_name": "Levante EMV", "source_region": "regional_spain", "source_country": "Spain", "source_lat": 39.47, "source_lon": -0.37, "published_at": "2026-05-02T09:00:00Z", "ai_relevance": 8, "ai_category": "sociedad", "ai_sentiment": "mixto", "ai_geo_location": "Valencia, Spain", "ai_geo_lat": 39.47, "ai_geo_lon": -0.37, "ai_summary": "A seis meses de la DANA, la reconstrucción avanza pero los retrasos burocráticos generan tensión.", "ai_spain_impact": "critico"},
    {"title": "Galicia: mareas vermellas afectan a la cosecha de marisco", "source_name": "La Voz de Galicia", "source_region": "regional_spain", "source_country": "Spain", "source_lat": 42.88, "source_lon": -8.54, "published_at": "2026-05-01T08:00:00Z", "ai_relevance": 6, "ai_category": "medioambiente", "ai_sentiment": "negativo", "ai_geo_location": "Galicia, Spain", "ai_geo_lat": 42.88, "ai_geo_lon": -8.54, "ai_summary": "Marea roja cierra bateas en las rías gallegas causando pérdidas millonarias al sector marisquero.", "ai_spain_impact": "medio"},
    {"title": "Madrid CCAA: Ayuso anuncia nueva línea de Metro hasta Alcorcón", "source_name": "20minutos", "source_region": "regional_spain", "source_country": "Spain", "source_lat": 40.42, "source_lon": -3.70, "published_at": "2026-05-03T10:30:00Z", "ai_relevance": 6, "ai_category": "politica_interior", "ai_sentiment": "positivo", "ai_geo_location": "Madrid, Spain", "ai_geo_lat": 40.42, "ai_geo_lon": -3.70, "ai_summary": "La Comunidad de Madrid aprueba la licitación de una nueva línea de Metro hasta el municipio de Alcorcón.", "ai_spain_impact": "medio"},
    # NORTEAMERICA adicional
    {"title": "EEUU: Congreso debate ley de deportaciones masivas", "source_name": "AP", "source_region": "north_america", "source_country": "USA", "source_lat": 38.90, "source_lon": -77.03, "published_at": "2026-05-02T17:00:00Z", "ai_relevance": 8, "ai_category": "politica_interior", "ai_sentiment": "negativo", "ai_geo_location": "Washington DC, USA", "ai_geo_lat": 38.90, "ai_geo_lon": -77.03, "ai_summary": "El Congreso debate ampliar los poderes ejecutivos para deportaciones aceleradas.", "ai_spain_impact": "medio"},
    {"title": "Mexico: cartel Sinaloa infiltra municipios electorales clave", "source_name": "Reforma", "source_region": "north_america", "source_country": "Mexico", "source_lat": 24.80, "source_lon": -107.39, "published_at": "2026-05-01T14:00:00Z", "ai_relevance": 7, "ai_category": "seguridad_defensa", "ai_sentiment": "negativo", "ai_geo_location": "Sinaloa, Mexico", "ai_geo_lat": 24.80, "ai_geo_lon": -107.39, "ai_summary": "Informes de inteligencia señalan compra de candidatos municipales en Sinaloa.", "ai_spain_impact": "bajo"},
    # AFRICA adicional
    {"title": "Túnez: represión de medios agrava crisis migratoria hacia Europa", "source_name": "Reuters", "source_region": "africa", "source_country": "Tunisia", "source_lat": 36.82, "source_lon": 10.16, "published_at": "2026-05-02T13:00:00Z", "ai_relevance": 8, "ai_category": "politica_exterior", "ai_sentiment": "negativo", "ai_geo_location": "Tunis, Tunisia", "ai_geo_lat": 36.82, "ai_geo_lon": 10.16, "ai_summary": "Las ONG alertan del aumento de salidas irregulares desde Tunisia hacia Italia y España.", "ai_spain_impact": "alto"},
    {"title": "Libia: milicias rivales retoman enfrentamientos en Trípoli", "source_name": "Al Jazeera", "source_region": "africa", "source_country": "Libya", "source_lat": 32.89, "source_lon": 13.18, "published_at": "2026-05-01T06:00:00Z", "ai_relevance": 7, "ai_category": "seguridad_defensa", "ai_sentiment": "negativo", "ai_geo_location": "Tripoli, Libya", "ai_geo_lat": 32.89, "ai_geo_lon": 13.18, "ai_summary": "Nuevos combates en el sur de Trípoli amenazan la tregua de 2024.", "ai_spain_impact": "medio"},
    # ASIA adicional
    {"title": "Pakistan: golpe de estado fallido eleva tensión con India", "source_name": "BBC", "source_region": "asia", "source_country": "Pakistan", "source_lat": 33.72, "source_lon": 73.04, "published_at": "2026-05-02T04:00:00Z", "ai_relevance": 9, "ai_category": "seguridad_defensa", "ai_sentiment": "negativo", "ai_geo_location": "Islamabad, Pakistan", "ai_geo_lat": 33.72, "ai_geo_lon": 73.04, "ai_summary": "Militares pakistaníes desbaratan intento de golpe mientras la tensión con India escala.", "ai_spain_impact": "bajo"},
    {"title": "Arabia Saudí lanza megaproyecto NEOM con inversión española", "source_name": "Bloomberg", "source_region": "asia", "source_country": "Saudi Arabia", "source_lat": 24.68, "source_lon": 46.72, "published_at": "2026-04-30T08:00:00Z", "ai_relevance": 7, "ai_category": "economia", "ai_sentiment": "positivo", "ai_geo_location": "Riyadh, Saudi Arabia", "ai_geo_lat": 24.68, "ai_geo_lon": 46.72, "ai_summary": "Ferrovial y ACS firman contratos de infraestructura en la megaciudad NEOM por 2.000M€.", "ai_spain_impact": "alto"},
    # LATAM adicional
    {"title": "Colombia: Petro suspende diálogos de paz con ELN", "source_name": "El Tiempo", "source_region": "latin_america", "source_country": "Colombia", "source_lat": 4.71, "source_lon": -74.07, "published_at": "2026-05-01T21:00:00Z", "ai_relevance": 7, "ai_category": "seguridad_defensa", "ai_sentiment": "negativo", "ai_geo_location": "Bogota, Colombia", "ai_geo_lat": 4.71, "ai_geo_lon": -74.07, "ai_summary": "El Gobierno colombiano suspende el proceso de paz con el ELN tras ataques a civiles.", "ai_spain_impact": "bajo"},
]

with tab_mapa:
    # ── Lazy import del módulo de ingesta ────────────────────────────────────
    @st.cache_resource(ttl=0)
    def _ni():
        try:
            from dashboard.services import news_ingestion as _m
            return _m
        except Exception:
            return None

    _news_mod = _ni()

    # ── Geographic region → keyword matching ─────────────────────────────────
    # Keys map to source_region field values and geo_location keywords
    _GEO_REGIONS: dict[str, dict] = {
        "Internacional": {
            "label": "Internacional",
            "source_regions": [],   # matches all (no filter when selected alone)
            "geo_keywords": [],
            "match_all": True,
        },
        "Europa": {
            "label": "Europa",
            "source_regions": ["europe"],
            "geo_keywords": [
                "France", "Germany", "Italy", "UK", "Poland", "Hungary",
                "Portugal", "Belgium", "Netherlands", "Sweden", "Norway",
                "Switzerland", "Ukraine", "Russia", "Turkey", "Spain",
                "Greece", "Austria", "Czech", "Romania", "Bulgaria",
            ],
            "match_all": False,
        },
        "Africa": {
            "label": "Africa",
            "source_regions": ["africa"],
            "geo_keywords": [
                "Nigeria", "Kenya", "South Africa", "Egypt", "Morocco",
                "Ethiopia", "Sudan", "Libya", "Niger", "Mali", "Senegal",
                "Ghana", "Tanzania", "Algeria", "Tunisia", "Somalia",
            ],
            "match_all": False,
        },
        "Asia": {
            "label": "Asia",
            "source_regions": ["asia"],
            "geo_keywords": [
                "China", "Japan", "South Korea", "India", "Taiwan",
                "Pakistan", "Afghanistan", "Iran", "Saudi Arabia",
                "Israel", "Syria", "North Korea", "Vietnam", "Indonesia",
                "Thailand", "Malaysia", "Philippines", "Bangladesh",
            ],
            "match_all": False,
        },
        "America del Norte": {
            "label": "Am. Norte",
            "source_regions": ["north_america"],
            "geo_keywords": ["USA", "Canada", "Mexico", "Cuba"],
            "match_all": False,
        },
        "America del Sur": {
            "label": "Am. Sur",
            "source_regions": ["latin_america"],
            "geo_keywords": [
                "Brazil", "Argentina", "Colombia", "Chile", "Peru",
                "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay",
            ],
            "match_all": False,
        },
        "España Nacional": {
            "label": "Esp. Nacional",
            "source_regions": ["local_spain"],
            "geo_keywords": ["Spain"],
            "match_all": False,
        },
        "España Regional": {
            "label": "Esp. Regional",
            "source_regions": ["local_spain", "regional_spain"],
            "geo_keywords": [
                "Cataluña", "Madrid", "Andalucía", "Valencia", "País Vasco",
                "Galicia", "Aragón", "Murcia", "Castilla", "Extremadura",
                "Asturias", "Navarra", "Baleares", "Canarias", "Cantabria",
                "La Rioja",
            ],
            "match_all": False,
        },
    }

    _CCAA_LIST = [
        "Andalucía", "Aragón", "Asturias", "Baleares", "Canarias",
        "Cantabria", "Castilla-La Mancha", "Castilla y León", "Cataluña",
        "Extremadura", "Galicia", "La Rioja", "Madrid", "Murcia",
        "Navarra", "País Vasco", "Valencia",
    ]

    # ── Helpers: assign geo_region from source_region / geo_location ─────────
    def _assign_geo_region(row: dict) -> str:
        """
        Infer geo_region label for a news item if not already set.

        Priority:
          1. row["geo_region"] if already set
          2. source_region field (authoritative — avoids false geo_keyword matches
             e.g. "Spain" in Europa geo_keywords must NOT override local_spain)
          3. ai_geo_location keyword scan (fallback for unknown source_regions)
        """
        if row.get("geo_region"):
            return row["geo_region"]
        src = row.get("source_region", "") or ""
        loc = row.get("ai_geo_location", "") or ""

        # ── Phase 1: source_region is authoritative ────────────────────────────
        # local_spain  → España Nacional (national media covers national stories)
        # regional_spain → España Regional (regional media covers autonomous communities)
        if src == "local_spain":
            return "España Nacional"
        if src == "regional_spain":
            return "España Regional"

        # For international source_regions, do a direct lookup:
        _SRC_TO_REGION = {
            "europe":        "Europa",
            "north_america": "America del Norte",
            "latin_america": "America del Sur",
            "africa":        "Africa",
            "asia":          "Asia",
        }
        if src in _SRC_TO_REGION:
            return _SRC_TO_REGION[src]

        # ── Phase 2: geo_location keyword scan (fallback for empty source) ─────
        # Check Spain-specific regions FIRST to avoid the Europa "Spain" trap
        _ccaa_kws = _GEO_REGIONS["España Regional"]["geo_keywords"]
        if any(kw.lower() in loc.lower() for kw in _ccaa_kws):
            return "España Regional"
        if "spain" in loc.lower() or "españa" in loc.lower():
            return "España Nacional"
        for region_label, cfg in _GEO_REGIONS.items():
            if cfg.get("match_all") or region_label in ("Internacional", "España Nacional", "España Regional"):
                continue
            for kw in cfg["geo_keywords"]:
                if kw.lower() in loc.lower():
                    return region_label
        return "Internacional"

    # ── Geo extraction from headlines ─────────────────────────────────────────
    # Diccionario: substring en lowercase → (lat, lon, geo_region)
    _GEO_HEADLINE: list[tuple[str, float, float, str]] = [
        # ── EEUU / Canada / Mexico ───────────────────────────────────────────
        ("trump",           38.9, -77.0, "America del Norte"),
        ("biden",           38.9, -77.0, "America del Norte"),
        ("harris",          38.9, -77.0, "America del Norte"),
        ("washington",      38.9, -77.0, "America del Norte"),
        ("estados unidos",  38.0, -97.0, "America del Norte"),
        ("eeuu",            38.0, -97.0, "America del Norte"),
        ("ee.uu",           38.0, -97.0, "America del Norte"),
        ("nueva york",      40.7, -74.0, "America del Norte"),
        ("california",      36.8,-119.4, "America del Norte"),
        ("texas",           31.0, -99.0, "America del Norte"),
        ("pentagono",       38.9, -77.0, "America del Norte"),
        ("casa blanca",     38.9, -77.0, "America del Norte"),
        ("fed ",            38.9, -77.0, "America del Norte"),
        ("reserva federal", 38.9, -77.0, "America del Norte"),
        ("mexico",          19.4, -99.1, "America del Norte"),
        ("canada",          56.1,-106.3, "America del Norte"),
        ("cuba",            21.5, -77.8, "America del Norte"),
        ("haiti",           19.0, -72.3, "America del Norte"),
        ("panama",           8.9, -79.5, "America del Norte"),
        # ── Europa — lideres y paises ─────────────────────────────────────────
        ("ucrania",         50.0,  31.0, "Europa"),
        ("ukraine",         50.0,  31.0, "Europa"),
        ("kiev",            50.4,  30.5, "Europa"),
        ("zelenski",        50.4,  30.5, "Europa"),
        ("zelensky",        50.4,  30.5, "Europa"),
        ("rusia",           55.7,  37.6, "Europa"),
        ("russia",          55.7,  37.6, "Europa"),
        ("moscu",           55.7,  37.6, "Europa"),
        ("moscow",          55.7,  37.6, "Europa"),
        ("putin",           55.7,  37.6, "Europa"),
        ("kremlin",         55.7,  37.6, "Europa"),
        ("alemania",        52.5,  13.4, "Europa"),
        ("germany",         52.5,  13.4, "Europa"),
        ("berlin",          52.5,  13.4, "Europa"),
        ("scholz",          52.5,  13.4, "Europa"),
        ("merz",            52.5,  13.4, "Europa"),
        ("paris",           48.9,   2.3, "Europa"),
        ("france",          46.6,   2.4, "Europa"),
        ("francia",         46.6,   2.4, "Europa"),
        ("macron",          48.9,   2.3, "Europa"),
        ("elysee",          48.9,   2.3, "Europa"),
        ("reino unido",     51.5,  -0.1, "Europa"),
        ("uk ",             51.5,  -0.1, "Europa"),
        ("britain",         51.5,  -0.1, "Europa"),
        ("londres",         51.5,  -0.1, "Europa"),
        ("london",          51.5,  -0.1, "Europa"),
        ("starmer",         51.5,  -0.1, "Europa"),
        ("downing",         51.5,  -0.1, "Europa"),
        ("italia",          41.9,  12.5, "Europa"),
        ("italy",           41.9,  12.5, "Europa"),
        ("roma",            41.9,  12.5, "Europa"),
        ("meloni",          41.9,  12.5, "Europa"),
        ("bruselas",        50.9,   4.4, "Europa"),
        ("brussels",        50.9,   4.4, "Europa"),
        ("union europea",   50.9,   4.4, "Europa"),
        ("european union",  50.9,   4.4, "Europa"),
        ("comision europea",50.9,   4.4, "Europa"),
        ("parlamento europeo",50.9, 4.4, "Europa"),
        ("von der leyen",   50.9,   4.4, "Europa"),
        ("otan",            50.9,   4.4, "Europa"),
        ("nato",            50.9,   4.4, "Europa"),
        ("polonia",         52.2,  21.0, "Europa"),
        ("poland",          52.2,  21.0, "Europa"),
        ("varsovia",        52.2,  21.0, "Europa"),
        ("rumania",         44.4,  26.1, "Europa"),
        ("turquia",         39.9,  32.9, "Europa"),
        ("turkey",          39.9,  32.9, "Europa"),
        ("erdogan",         39.9,  32.9, "Europa"),
        ("serbia",          44.8,  20.5, "Europa"),
        ("hungria",         47.5,  19.0, "Europa"),
        ("orban",           47.5,  19.0, "Europa"),
        ("suecia",          59.3,  18.1, "Europa"),
        ("finlandia",       60.2,  24.9, "Europa"),
        ("noruega",         60.5,   8.5, "Europa"),
        ("dinamarca",       56.3,   9.5, "Europa"),
        ("holanda",         52.4,   4.9, "Europa"),
        ("belgica",         50.8,   4.4, "Europa"),
        ("austria",         47.5,  14.5, "Europa"),
        ("suiza",           46.8,   8.2, "Europa"),
        ("portugal",        39.5,  -8.0, "Europa"),
        ("grecia",          38.0,  23.7, "Europa"),
        ("eslovenia",       46.1,  14.5, "Europa"),
        ("eslovaquia",      48.7,  19.7, "Europa"),
        ("croacia",         45.8,  15.9, "Europa"),
        ("balcanes",        44.0,  19.0, "Europa"),
        # ── Asia / Oriente Medio ─────────────────────────────────────────────
        ("china",           35.9, 104.2, "Asia"),
        ("pekin",           39.9, 116.4, "Asia"),
        ("beijing",         39.9, 116.4, "Asia"),
        ("xi jinping",      39.9, 116.4, "Asia"),
        ("taiwan",          23.7, 121.0, "Asia"),
        ("taipei",          25.0, 121.5, "Asia"),
        ("japon",           35.7, 139.7, "Asia"),
        ("japan",           35.7, 139.7, "Asia"),
        ("tokio",           35.7, 139.7, "Asia"),
        ("tokyo",           35.7, 139.7, "Asia"),
        ("corea del norte", 37.6, 127.0, "Asia"),
        ("corea del sur",   37.6, 127.0, "Asia"),
        ("seul",            37.6, 127.0, "Asia"),
        ("india",           20.6,  78.9, "Asia"),
        ("modi",            28.6,  77.2, "Asia"),
        ("nueva delhi",     28.6,  77.2, "Asia"),
        ("pakistan",        30.4,  69.3, "Asia"),
        ("iran",            32.4,  53.7, "Asia"),
        ("teheran",         35.7,  51.4, "Asia"),
        ("israel",          31.5,  34.8, "Asia"),
        ("netanyahu",       31.8,  35.2, "Asia"),
        ("tel aviv",        32.1,  34.8, "Asia"),
        ("gaza",            31.4,  34.4, "Asia"),
        ("palestin",        31.9,  35.2, "Asia"),
        ("cisjordania",     31.9,  35.2, "Asia"),
        ("hamas",           31.4,  34.4, "Asia"),
        ("hezbollah",       33.9,  35.5, "Asia"),
        ("libano",          33.9,  35.5, "Asia"),
        ("beirut",          33.9,  35.5, "Asia"),
        ("siria",           33.5,  36.3, "Asia"),
        ("damasco",         33.5,  36.3, "Asia"),
        ("irak",            33.3,  44.4, "Asia"),
        ("bagdad",          33.3,  44.4, "Asia"),
        ("arabia",          24.7,  46.7, "Asia"),
        ("riad",            24.7,  46.7, "Asia"),
        ("riyadh",          24.7,  46.7, "Asia"),
        ("emiratos",        24.5,  54.4, "Asia"),
        ("dubai",           25.2,  55.3, "Asia"),
        ("qatar",           25.3,  51.2, "Asia"),
        ("yemen",           15.6,  48.5, "Asia"),
        ("afganistan",      33.9,  67.7, "Asia"),
        ("kabul",           34.5,  69.2, "Asia"),
        ("indonesia",       -6.2, 106.8, "Asia"),
        ("filipinas",       14.6, 121.0, "Asia"),
        ("vietnam",         14.1, 108.3, "Asia"),
        ("myanmar",         21.9,  95.6, "Asia"),
        ("tailandia",       13.8, 100.5, "Asia"),
        ("bangladesh",      23.7,  90.4, "Asia"),
        ("medio oriente",   29.0,  42.0, "Asia"),
        ("oriente medio",   29.0,  42.0, "Asia"),
        # ── Africa ───────────────────────────────────────────────────────────
        ("nigeria",          9.1,   8.7, "Africa"),
        ("etiopia",          9.1,  40.5, "Africa"),
        ("ethiopia",         9.1,  40.5, "Africa"),
        ("sudafrica",      -29.0,  26.0, "Africa"),
        ("kenia",           -1.3,  36.8, "Africa"),
        ("nairobi",         -1.3,  36.8, "Africa"),
        ("egipto",          26.8,  30.8, "Africa"),
        ("cairo",           30.1,  31.2, "Africa"),
        ("marruecos",       31.8,  -7.1, "Africa"),
        ("rabat",           34.0,  -6.8, "Africa"),
        ("argelia",         28.0,   1.7, "Africa"),
        ("libia",           26.3,  17.2, "Africa"),
        ("mali",            17.6,  -4.0, "Africa"),
        ("niger",           13.5,   2.1, "Africa"),
        ("sudan",           15.6,  32.5, "Africa"),
        ("somalia",          5.2,  46.2, "Africa"),
        ("ghana",            7.9,  -1.0, "Africa"),
        ("senegal",         14.5, -14.5, "Africa"),
        ("mozambique",     -18.7,  35.5, "Africa"),
        ("sahel",           15.0,   0.0, "Africa"),
        # ── Latinoamerica ─────────────────────────────────────────────────────
        ("brasil",         -14.2, -51.9, "America del Sur"),
        ("brazil",         -14.2, -51.9, "America del Sur"),
        ("brasilia",        -15.8, -47.9, "America del Sur"),
        ("lula",           -15.8, -47.9, "America del Sur"),
        ("argentina",      -38.4, -63.6, "America del Sur"),
        ("buenos aires",   -34.6, -58.4, "America del Sur"),
        ("milei",          -34.6, -58.4, "America del Sur"),
        ("colombia",         4.6, -74.1, "America del Sur"),
        ("bogota",           4.7, -74.1, "America del Sur"),
        ("petro",            4.7, -74.1, "America del Sur"),
        ("venezuela",        6.4, -66.6, "America del Sur"),
        ("maduro",           6.4, -66.6, "America del Sur"),
        ("chile",          -35.7, -71.5, "America del Sur"),
        ("santiago",       -33.5, -70.7, "America del Sur"),
        ("peru",            -9.2, -75.0, "America del Sur"),
        ("lima",           -12.0, -77.0, "America del Sur"),
        ("ecuador",         -1.8, -78.2, "America del Sur"),
        ("bolivia",        -16.3, -63.6, "America del Sur"),
        ("paraguay",       -23.4, -58.4, "America del Sur"),
        ("uruguay",        -32.5, -55.8, "America del Sur"),
        # ── España — líderes, instituciones, CCAA ────────────────────────────
        ("sanchez",         40.4,  -3.7, "España Nacional"),
        ("feijoo",          40.4,  -3.7, "España Nacional"),
        ("abascal",         40.4,  -3.7, "España Nacional"),
        ("yolanda diaz",    40.4,  -3.7, "España Nacional"),
        ("psoe",            40.4,  -3.7, "España Nacional"),
        ("partido popular", 40.4,  -3.7, "España Nacional"),
        ("vox",             40.4,  -3.7, "España Nacional"),
        ("sumar",           40.4,  -3.7, "España Nacional"),
        ("moncloa",         40.4,  -3.7, "España Nacional"),
        ("congreso",        40.4,  -3.7, "España Nacional"),
        ("senado",          40.4,  -3.7, "España Nacional"),
        ("tribunal supremo",40.4,  -3.7, "España Nacional"),
        ("gobierno espanol", 40.4, -3.7, "España Nacional"),
        ("madrid",          40.4,  -3.7, "España Nacional"),
        ("catalu",          41.4,   2.2,  "España Regional"),
        ("barcelona",       41.4,   2.2,  "España Regional"),
        ("generalitat",     41.4,   2.2,  "España Regional"),
        ("puigdemont",      41.4,   2.2,  "España Regional"),
        ("girona",          41.98,  2.82, "España Regional"),
        ("tarragona",       41.12,  1.24, "España Regional"),
        ("lleida",          41.62,  0.63, "España Regional"),
        ("pais vasco",      43.3,  -2.7,  "España Regional"),
        ("euskadi",         43.3,  -2.7,  "España Regional"),
        ("bildu",           43.3,  -2.7,  "España Regional"),
        ("pnv",             43.3,  -2.7,  "España Regional"),
        ("bilbao",          43.26, -2.93, "España Regional"),
        ("donostia",        43.32, -1.98, "España Regional"),
        ("vitoria",         42.85, -2.67, "España Regional"),
        ("gasteiz",         42.85, -2.67, "España Regional"),
        ("galicia",         42.9,  -8.5,  "España Regional"),
        ("santiago de compostela", 42.88,-8.54, "España Regional"),
        ("vigo",            42.24, -8.72, "España Regional"),
        ("a coruna",        43.37, -8.40, "España Regional"),
        ("la coruna",       43.37, -8.40, "España Regional"),
        ("ourense",         42.34, -7.86, "España Regional"),
        ("lugo",            43.01, -7.56, "España Regional"),
        ("pontevedra",      42.43, -8.64, "España Regional"),
        ("andalucia",       37.5,  -4.5,  "España Regional"),
        ("sevilla",         37.39, -5.98, "España Regional"),
        ("malaga",          36.72, -4.42, "España Regional"),
        ("granada",         37.18, -3.60, "España Regional"),
        ("cordoba",         37.89, -4.78, "España Regional"),
        ("cadiz",           36.53, -6.30, "España Regional"),
        ("almeria",         36.84, -2.46, "España Regional"),
        ("huelva",          37.26, -6.95, "España Regional"),
        ("jaen",            37.78, -3.79, "España Regional"),
        ("valencia",        39.47, -0.38, "España Regional"),
        ("alicante",        38.35, -0.49, "España Regional"),
        ("castellon",       39.99, -0.05, "España Regional"),
        ("navarra",         42.82, -1.64, "España Regional"),
        ("pamplona",        42.82, -1.64, "España Regional"),
        ("aragon",          41.65, -0.89, "España Regional"),
        ("zaragoza",        41.65, -0.89, "España Regional"),
        ("huesca",          42.14, -0.41, "España Regional"),
        ("teruel",          40.34, -1.11, "España Regional"),
        ("murcia",          37.99, -1.13, "España Regional"),
        ("canarias",        28.29,-15.60, "España Regional"),
        ("tenerife",        28.46,-16.25, "España Regional"),
        ("gran canaria",    28.12,-15.44, "España Regional"),
        ("las palmas",      28.12,-15.44, "España Regional"),
        ("santa cruz",      28.46,-16.25, "España Regional"),
        ("lanzarote",       28.96,-13.54, "España Regional"),
        ("baleares",        39.57,  2.65, "España Regional"),
        ("mallorca",        39.57,  2.65, "España Regional"),
        ("ibiza",           38.91,  1.43, "España Regional"),
        ("menorca",         39.95,  4.12, "España Regional"),
        ("asturias",        43.36, -5.85, "España Regional"),
        ("oviedo",          43.36, -5.85, "España Regional"),
        ("gijon",           43.54, -5.66, "España Regional"),
        ("cantabria",       43.46, -3.81, "España Regional"),
        ("santander",       43.46, -3.81, "España Regional"),
        ("rioja",           42.47, -2.45, "España Regional"),
        ("logro",           42.47, -2.45, "España Regional"),
        ("extremadura",     38.92, -6.34, "España Regional"),
        ("badajoz",         38.88, -7.00, "España Regional"),
        ("caceres",         39.48, -6.37, "España Regional"),
        ("castilla la mancha", 39.86,-4.02, "España Regional"),
        ("toledo",          39.86, -4.02, "España Regional"),
        ("albacete",        39.00, -1.86, "España Regional"),
        ("ciudad real",     38.99, -3.93, "España Regional"),
        ("cuenca",          40.07, -2.14, "España Regional"),
        ("guadalajara",     40.63, -3.17, "España Regional"),
        ("castilla y leon", 41.65, -4.73, "España Regional"),
        ("valladolid",      41.65, -4.73, "España Regional"),
        ("burgos",          42.34, -3.70, "España Regional"),
        ("salamanca",       40.97, -5.66, "España Regional"),
        ("leon",            42.60, -5.57, "España Regional"),
        ("palencia",        42.01, -4.53, "España Regional"),
        ("zamora",          41.50, -5.75, "España Regional"),
        ("segovia",         40.95, -4.12, "España Regional"),
        ("avila",           40.66, -4.70, "España Regional"),
        ("soria",           41.77, -2.46, "España Regional"),
        ("ceuta",           35.89, -5.32, "España Regional"),
        ("melilla",         35.29, -2.94, "España Regional"),
    ]

    # Categorias del fingerprint mapeadas a ai_category
    _NARR_TO_CAT: dict[str, str] = {
        "Crisis economica y coste de vida":       "economia",
        "Corrupcion e integridad institucional":   "justicia",
        "Independentismo y tension territorial":   "politica_interior",
        "Inmigracion y asilo":                     "sociedad",
        "Vivienda y acceso al alquiler":            "sociedad",
        "Polarizacion politica y bloqueo":          "politica_interior",
        "Reforma fiscal y presupuestos":            "economia",
        "Sanidad publica y listas de espera":       "salud",
        "Politica exterior y geopolitica":          "politica_exterior",
        "Derechos sociales y laborales":            "sociedad",
        "Clima y transicion energetica":            "medioambiente",
        "Seguridad y orden publico":                "seguridad_defensa",
    }

    def _extract_event_geo(title: str, source_lat: float, source_lon: float,
                           source_region: str,
                           src_ccaa: str = "") -> tuple[float, float, str]:
        """
        Extrae coordenadas y region geografica de un titular.
        - Si src_ccaa esta definido (fuente regional española), los keywords
          nacionales genericos (congreso, moncloa, psoe...) NO desplazan el evento
          fuera de su CCAA de origen.
        - Solo keywords de otra CCAA/ciudad especifica pueden overridearlo.
        """
        tl = title.lower()
        # Palabras clave cuya presencia NO debe desplazar una fuente CCAA al centroide
        # nacional (40.4, -3.7). Son palabras de ámbito nacional genérico.
        _NATIONAL_GENERIC = {
            "sanchez", "feijoo", "abascal", "yolanda diaz", "psoe",
            "partido popular", "vox", "sumar", "moncloa", "congreso",
            "senado", "tribunal supremo", "gobierno espanol", "madrid",
        }
        for kw, lat, lon, region in _GEO_HEADLINE:
            if kw not in tl:
                continue
            # Si la fuente es de una CCAA y el keyword es generico nacional,
            # mantener la fuente en su CCAA (no mover a Madrid)
            if src_ccaa and region == "España Nacional" and kw in _NATIONAL_GENERIC:
                continue
            return lat, lon, region
        return source_lat, source_lon, source_region

    @st.cache_data(ttl=600, show_spinner=False)
    def _load_region_summary(geo_region: str, ccaa: str = "") -> dict:
        """
        Resumen politico/social/economico de una region durante el ultimo mes.
        Usa los articulos cacheados y scoring de fingerprints.
        Retorna dict con claves: politica, economia, social, top_titles, n_articles.
        """
        from collections import defaultdict as _dd2

        articles: list[dict] = []
        try:
            if _AGG_OK:
                articles = get_news(2000)
        except Exception:
            pass

        if not articles:
            return {}

        # Filtrar por region
        def _matches(art: dict) -> bool:
            reg = art.get("source_region", "") or ""
            if geo_region == "España Regional":
                ok = "españa" in reg.lower() or "spain" in reg.lower()
                if ccaa and ok:
                    ok = ok and (art.get("source_ccaa", "") == ccaa)
                return ok
            return reg == geo_region

        filtered = [a for a in articles if _matches(a)]
        if not filtered:
            return {}

        # Score cada articulo contra fingerprints
        _POLITIC_FPS = {
            "Polarizacion politica y bloqueo", "Independentismo y tension territorial",
            "Corrupcion e integridad institucional", "Reforma fiscal y presupuestos",
            "Politica exterior y geopolitica",
        }
        _ECON_FPS = {
            "Crisis economica y coste de vida", "Reforma fiscal y presupuestos",
            "Derechos sociales y laborales", "Vivienda y acceso al alquiler",
        }
        _SOCIAL_FPS = {
            "Inmigracion y asilo", "Vivienda y acceso al alquiler",
            "Sanidad publica y listas de espera", "Derechos sociales y laborales",
            "Seguridad y orden publico", "Clima y transicion energetica",
        }

        pol_titles, eco_titles, soc_titles = [], [], []
        for art in filtered:
            title = art.get("titulo", "") or art.get("title", "")
            tl = title.lower()
            best_fp, best_sc = "", 0
            for fp in _NARRATIVA_FINGERPRINTS:
                sc = sum(w * tl.count(k) for k, w in fp["keywords"].items())
                if sc > best_sc:
                    best_sc, best_fp = sc, fp["nombre"]
            if best_fp in _POLITIC_FPS and title not in pol_titles:
                pol_titles.append(title)
            elif best_fp in _ECON_FPS and title not in eco_titles:
                eco_titles.append(title)
            elif best_fp in _SOCIAL_FPS and title not in soc_titles:
                soc_titles.append(title)

        return {
            "politica":    pol_titles[:4],
            "economia":    eco_titles[:4],
            "social":      soc_titles[:4],
            "top_titles":  [a.get("titulo") or a.get("title", "") for a in filtered[:8]],
            "n_articles":  len(filtered),
        }

    @st.cache_data(ttl=180)
    def _cluster_rss_to_events(hours_back: int = 24) -> list[dict]:
        """
        Convierte articulos RSS cacheados en eventos de mapa agrupados.

        Pipeline:
        1. Carga articulos del aggregator (threaded, ya cacheados)
        2. Asigna categoria via fingerprint scoring (solo titulo)
        3. Extrae/infiere coordenadas del titular
        4. España: celdas 2x2 grados; resto: 8x8 grados
        5. Por cada cluster emite un evento con relevancia proporcional al tamano
        6. Aplica jitter deterministico para evitar solapamiento visual
        """
        from collections import defaultdict as _dd, Counter as _Ctr
        import hashlib as _hl

        articles: list[dict] = []
        try:
            if _AGG_OK:
                articles = get_news(1500)
        except Exception:
            pass

        if not articles:
            return []

        # Scoring contra fingerprints — SOLO sobre el titular para evitar
        # contaminación cruzada de resúmenes RSS (bug Sinner+PNV).
        # Incluye detección deportiva separada (no aparece en radar narrativas).
        def _cat_score(title_only: str) -> str:
            tl = title_only.lower()
            best_cat, best_score = "sociedad", 0
            # Chequear deporte primero (keywords específicos)
            sport_score = sum(w * tl.count(k) for k, w in _SPORT_KEYWORDS.items())
            if sport_score > 0:
                best_score, best_cat = sport_score, "deporte"
            # Fingerprints de narrativa política/social/económica
            for fp in _NARRATIVA_FINGERPRINTS:
                s = sum(w * tl.count(k) for k, w in fp["keywords"].items())
                if s > best_score:
                    best_score = s
                    best_cat = _NARR_TO_CAT.get(fp["nombre"], "politica_interior")
            return best_cat

        def _sentiment_quick(text: str) -> str:
            tl = text.lower()
            neg = sum(tl.count(w) for w in ("crisis","guerra","muerto","ataque","colapso",
                      "corrupcion","fraude","detenido","condena","explosion","atentado",
                      "violencia","caida","recesion","desastre","muerto"))
            pos = sum(tl.count(w) for w in ("acuerdo","crecimiento","paz","exito","record",
                      "aprobado","logro","avance","mejora","inversion","recuperacion"))
            if neg > pos + 1:   return "negativo"
            if pos > neg + 1:   return "positivo"
            return "neutro"

        def _spain_impact(text: str, region: str) -> str:
            if "España" in region:
                return "alto"
            tl = text.lower()
            if any(k in tl for k in ("españa","sanchez","psoe","pp","madrid","ue ","euro","otan","aranceles")):
                return "medio"
            return "bajo"

        # Cluster: (lat_cell, lon_cell, categoria) → lista de articulos
        clusters: dict[tuple, list[dict]] = _dd(list)

        for art in articles:
            title  = art.get("titulo", "") or art.get("title", "")
            resume = art.get("resumen", "") or art.get("texto_completo", "")
            text   = f"{title} {resume}"  # para narratives/sentiment; NO para categoría
            src_lat = float(art.get("source_lat", 0) or 0)
            src_lon = float(art.get("source_lon", 0) or 0)
            src_reg = art.get("source_region", "Internacional") or "Internacional"
            src_ccaa = art.get("source_ccaa", "") or ""
            src_prov = art.get("source_provincia", "") or ""

            geo_lat, geo_lon, geo_reg = _extract_event_geo(
                title, src_lat, src_lon, src_reg, src_ccaa
            )

            # Descartar puntos en (0,0) — medio del oceano Atlantico
            if abs(geo_lat) < 0.5 and abs(geo_lon) < 0.5:
                # Intentar usar coords de fuente si son validas
                if abs(src_lat) > 0.5 or abs(src_lon) > 0.5:
                    geo_lat, geo_lon = src_lat, src_lon
                else:
                    continue  # sin coordenadas validas, descartar

            # Validar coordenadas de España: deben estar en bbox ibérico
            if geo_reg.startswith("España"):
                if not (26.0 <= geo_lat <= 44.5 and -22.0 <= geo_lon <= 5.0):
                    # Coordenadas fuera de España → usar capital de CCAA o Madrid
                    geo_lat, geo_lon = src_lat if 26.0 <= src_lat <= 44.5 else 40.42, \
                                       src_lon if -22.0 <= src_lon <= 5.0 else -3.70

            # Usamos SOLO el título para la categoría → evita mezcla Sinner+PNV
            categoria = _cat_score(title)

            # Celda: España 2°×2° (resolución provincial), resto 8°×8°
            if geo_reg.startswith("España"):
                cell = (round(geo_lat / 2) * 2, round(geo_lon / 2) * 2, categoria)
            else:
                cell = (round(geo_lat / 8) * 8, round(geo_lon / 8) * 8, categoria)

            clusters[cell].append({
                "title":       title,
                "text":        text,
                "geo_lat":     geo_lat,
                "geo_lon":     geo_lon,
                "geo_region":  geo_reg,
                "fuente":      art.get("fuente", ""),
                "categoria":   categoria,
                "ccaa":        src_ccaa,
                "provincia":   src_prov,
            })

        events: list[dict] = []
        for (cell_lat, cell_lon, cat), arts in clusters.items():
            n = len(arts)
            if n == 0:
                continue
            # Relevancia: log-scale 1→4, 3→6, 8→8, 32→10 (max 10)
            import math as _math
            relevance = min(10, max(4, round(3.0 * _math.log2(n + 1))))

            # Titulo: mas representativo (mas largo y especifico)
            best_title = max(arts, key=lambda a: len(a["title"]))["title"]
            if n > 1:
                best_title = f"{best_title} (+{n-1} mas)"

            # Resumen: top 2 titulares
            summary = " | ".join(a["title"] for a in arts[:2])

            # Fuente dominante
            fuentes = _Ctr(a["fuente"] for a in arts if a["fuente"])
            top_fuente = fuentes.most_common(1)[0][0] if fuentes else "Varios"

            # Sentimiento mayoritario
            sents = _Ctr(_sentiment_quick(a["text"]) for a in arts)
            sentiment = sents.most_common(1)[0][0]
            if len(sents) > 1 and sents.most_common(1)[0][1] < n * 0.6:
                sentiment = "mixto"

            # Lat/lon: centroide del cluster + jitter deterministico anti-solapamiento
            avg_lat = sum(a["geo_lat"] for a in arts) / n
            avg_lon = sum(a["geo_lon"] for a in arts) / n
            geo_reg = arts[0]["geo_region"]

            # Jitter basado en hash del cluster → mismo resultado cada render
            _cell_key = f"{cell_lat:.1f}{cell_lon:.1f}{cat}".encode()
            _hval = int(_hl.md5(_cell_key).hexdigest()[:8], 16)
            _cell_size = 2.0 if geo_reg.startswith("España") else 8.0
            _jitter_scale = _cell_size * 0.18
            avg_lat += ((_hval % 200) - 100) / 100.0 * _jitter_scale
            avg_lon += (((_hval >> 10) % 200) - 100) / 100.0 * _jitter_scale

            # CCAA dominante en el cluster
            _ccaa_ctr = _Ctr(a["ccaa"] for a in arts if a.get("ccaa"))
            cluster_ccaa = _ccaa_ctr.most_common(1)[0][0] if _ccaa_ctr else ""

            spain_impact = _spain_impact(" ".join(a["text"] for a in arts[:3]), geo_reg)

            # ── Narrativa dominante ──────────────────────────────────────────
            combined_text = " ".join(a["text"] for a in arts)
            narr_scores = [
                (fp["nombre"], sum(w * combined_text.lower().count(k)
                                   for k, w in fp["keywords"].items()))
                for fp in _NARRATIVA_FINGERPRINTS
            ]
            narr_scores.sort(key=lambda x: -x[1])
            top_narrativas = [nm for nm, sc in narr_scores[:3] if sc > 0]

            # ── Titulares relacionados (top 5) ───────────────────────────────
            related_titles = [a["title"] for a in arts[:5]]

            events.append({
                "title":          best_title,
                "source_name":    top_fuente,
                "source_region":  geo_reg.lower().replace(" ", "_"),
                "source_country": "",
                "source_lat":     avg_lat,
                "source_lon":     avg_lon,
                "published_at":   "",
                "ai_relevance":   relevance,
                "ai_category":    cat,
                "ai_sentiment":   sentiment,
                "ai_geo_location": geo_reg,
                "ai_geo_lat":     round(avg_lat, 3),
                "ai_geo_lon":     round(avg_lon, 3),
                "ai_summary":     summary,
                "ai_spain_impact":spain_impact,
                "ai_urgency":     "alta" if relevance >= 8 else ("media" if relevance >= 6 else "baja"),
                "geo_region":     geo_reg,
                "ccaa":           cluster_ccaa,
                "n_articles":     n,
                "narrativas":     top_narrativas,
                "related_titles": related_titles,
                "fuentes_list":   list(fuentes.keys())[:4],
            })

        events.sort(key=lambda e: -e["ai_relevance"])

        # ── Traduccion en bloque al español ──────────────────────────────────
        # Cada evento tiene un titulo principal y hasta 5 titulares relacionados.
        # Se agrupan en una sola llamada Ollama para minimizar latencia.
        if events and _LLM_OK:
            try:
                # Recopilar todos los titulares (evento + relacionados)
                all_titles: list[str] = []
                all_langs:  list[str] = []
                # Mapa: (event_idx, related_idx|-1) → posicion en all_titles
                title_map: list[tuple[int, int]] = []

                for ei, ev in enumerate(events):
                    # Titulo principal del evento
                    ev_lang = ev.get("ai_language") or "en"
                    all_titles.append(ev["title"])
                    all_langs.append(ev_lang)
                    title_map.append((ei, -1))
                    # Titulares relacionados
                    for ri, rel in enumerate(ev.get("related_titles") or []):
                        all_titles.append(rel)
                        all_langs.append(ev_lang)
                        title_map.append((ei, ri))

                translated = _translate_titles_batch(tuple(all_titles), tuple(all_langs))

                # Aplicar traducciones de vuelta
                for pos, (ei, ri) in enumerate(title_map):
                    new_title = translated[pos] if pos < len(translated) else all_titles[pos]
                    if ri == -1:
                        events[ei]["title"] = new_title
                    else:
                        rt = events[ei].get("related_titles") or []
                        if ri < len(rt):
                            rt[ri] = new_title
                        events[ei]["related_titles"] = rt
            except Exception:
                pass  # si la traduccion falla, mostrar titulares originales

        return events

    @st.cache_data(ttl=180)
    def _load_global_events(
        hours: int,
        min_rel: int,
        cat: str,
        geo_regions: tuple[str, ...] = (),
        ccaa_filter: tuple[str, ...] = (),
    ) -> pd.DataFrame:
        # 1. Intentar BD (pipeline de ingesta completo con Ollama)
        if _news_mod:
            try:
                rows = _news_mod.get_recent_articles(
                    limit=500, min_relevance=min_rel, hours_back=hours,
                    category=cat if cat != "Todas" else None,
                )
                if rows:
                    df = pd.DataFrame(rows)
                    df = df.dropna(subset=["ai_geo_lat", "ai_geo_lon"])
                    df["geo_region"] = df.apply(_assign_geo_region, axis=1)
                    if geo_regions:
                        df = _filter_by_geo(df, geo_regions, ccaa_filter)
                    return df
            except Exception:
                pass

        # 2. Clustering de articulos RSS en tiempo real (siempre disponible)
        clustered = _cluster_rss_to_events(hours_back=hours)
        if clustered:
            df = pd.DataFrame(clustered)
        else:
            # 3. Fallback estatico solo si el clustering tambien falla
            df = pd.DataFrame(_ALL_MAP_EVENTS)
            df["geo_region"] = df.apply(_assign_geo_region, axis=1)

        # Filtros
        if "ai_relevance" in df.columns and min_rel > 1:
            df = df[df["ai_relevance"] >= min_rel]
        if "ai_category" in df.columns and cat != "Todas":
            df = df[df["ai_category"] == cat]
        if geo_regions:
            df = _filter_by_geo(df, geo_regions, ccaa_filter)
        return df

    def _filter_by_geo(
        df: "pd.DataFrame",
        geo_regions: "tuple[str, ...]",
        ccaa_filter: "tuple[str, ...]",
    ) -> "pd.DataFrame":
        """Filter dataframe to only rows matching selected geo regions."""
        if not geo_regions or "Internacional" in geo_regions:
            return df  # Internacional = mostrar todo
        masks = []
        for region_label in geo_regions:
            cfg = _GEO_REGIONS.get(region_label)
            if not cfg:
                continue
            if cfg.get("match_all"):
                return df
            # Match by geo_region column (already assigned)
            # España Regional sphere: include both "España Nacional" and "España Regional"
            if region_label == "España Regional":
                mask = df["geo_region"].isin(["España Nacional", "España Regional"])
                if ccaa_filter:
                    ccaa_mask = df["ccaa"].isin(ccaa_filter) if "ccaa" in df.columns else mask
                    mask = mask & ccaa_mask
            else:
                mask = df["geo_region"] == region_label
            masks.append(mask)
        if not masks:
            return df
        combined = masks[0]
        for m in masks[1:]:
            combined = combined | m
        return df[combined]

    # ── Geographic region selectors ───────────────────────────────────────────
    _GEO_REGION_KEYS = list(_GEO_REGIONS.keys())

    # ── Sphere selector ───────────────────────────────────────────────────────
    # 8 geographic scopes — one active at a time; Internacional = vista global.
    _SPHERE_DEFS: list[dict] = [
        {"key": "Internacional",   "label": "Internacional", "color": CYAN,
         "region": None,                "short": "Global"},
        {"key": "Europeo",         "label": "Europeo",       "color": BLUE,
         "region": "Europa",            "short": "Europa"},
        {"key": "Norte Americano", "label": "N. America",    "color": GREEN,
         "region": "America del Norte", "short": "N.America"},
        {"key": "Sudamericano",    "label": "S. America",    "color": "#22C55E",
         "region": "America del Sur",   "short": "S.America"},
        {"key": "Asiatico",        "label": "Asia",          "color": PURPLE,
         "region": "Asia",              "short": "Asia"},
        {"key": "Africano",        "label": "Africa",        "color": AMBER,
         "region": "Africa",           "short": "Africa"},
        {"key": "Regional Español","label": "Espana Reg.",   "color": "#22D3EE",
         "region": "España Regional",   "short": "CCAA"},
    ]

    if "d7_sphere" not in st.session_state:
        st.session_state["d7_sphere"] = "Internacional"

    # Inject CSS for active sphere button styling
    st.markdown("""
    <style>
    div[data-testid="column"] .stButton > button {
        border-radius: 8px !important;
        font-size: .68rem !important;
        padding: .28rem .2rem !important;
        border: 1px solid #2A3245 !important;
        background: #0D1320 !important;
        color: #9CA3AF !important;
        transition: all .12s !important;
        line-height: 1.3 !important;
    }
    div[data-testid="column"] .stButton > button:hover {
        border-color: #3B82F6 !important;
        color: #E5E7EB !important;
        background: #131B2E !important;
    }
    </style>
    """, unsafe_allow_html=True)

    _sphere_cols = st.columns(7)
    for _si, _sdef in enumerate(_SPHERE_DEFS):
        with _sphere_cols[_si]:
            _is_active = st.session_state["d7_sphere"] == _sdef["key"]
            _sc = _sdef["color"]
            # Active indicator above the button
            if _is_active:
                st.markdown(
                    f'<div style="height:3px;border-radius:2px;'
                    f'background:{_sc};margin-bottom:3px"></div>',
                    unsafe_allow_html=True,
                )
            else:
                st.markdown(
                    '<div style="height:3px;border-radius:2px;'
                    'background:transparent;margin-bottom:3px"></div>',
                    unsafe_allow_html=True,
                )
            _btn_label = _sdef["short"]
            _btn_style = (
                f"background:{_sc}22 !important;border-color:{_sc}88 !important;"
                f"color:{_sc} !important;font-weight:800 !important;"
                if _is_active else ""
            )
            if _btn_style:
                st.markdown(
                    f'<style>div[data-testid="column"]:nth-child({_si+1}) '
                    f'.stButton > button {{ {_btn_style} }}</style>',
                    unsafe_allow_html=True,
                )
            if st.button(_btn_label, key=f"d7_sphere_{_si}", use_container_width=True):
                st.session_state["d7_sphere"] = _sdef["key"]
                st.rerun()

    _active_sphere = st.session_state["d7_sphere"]
    _active_sdef   = next(s for s in _SPHERE_DEFS if s["key"] == _active_sphere)
    _region_filter = _active_sdef["region"]   # None → show all (Internacional)
    _selected_regions: list[str] = [_region_filter] if _region_filter else []

    # Sphere title
    _s_color = _active_sdef["color"]
    st.markdown(
        f'<div style="margin:.4rem 0 .2rem;font-size:.72rem;font-weight:800;'
        f'color:{_s_color};letter-spacing:.07em;text-transform:uppercase">'
        f'ESFERA ACTIVA — {_active_sphere}</div>',
        unsafe_allow_html=True,
    )

    # CCAA selector — visible only for España Regional sphere
    _sel_ccaa: list[str] = []
    if _active_sphere == "Regional Español":
        _sel_ccaa = st.multiselect(
            "Comunidad Autónoma",
            _CCAA_LIST,
            default=[],
            key="d7geo_ccaa",
            placeholder="Todas las comunidades autónomas",
        )

    st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)

    # ── Query / display controls ──────────────────────────────────────────────
    col_ctrl1, col_ctrl2, col_ctrl3, col_ctrl4, col_ctrl5 = st.columns([2, 2, 2, 2, 1])
    with col_ctrl1:
        map_hours = st.selectbox("Ventana temporal", [6, 12, 24, 48, 72, 168], index=2,
                                  format_func=lambda x: f"Últimas {x}h", key="d7map_hours")
    with col_ctrl2:
        map_min_rel = st.slider("Relevancia mínima", 1, 10, 3, key="d7map_rel")
    with col_ctrl3:
        _CATS = ["Todas", "politica_interior", "politica_exterior", "economia",
                 "seguridad_defensa", "justicia", "sociedad", "deporte",
                 "tecnologia", "medioambiente", "energia", "salud"]
        map_cat = st.selectbox("Categoria", _CATS, key="d7map_cat",
                               format_func=lambda x: x.replace("_", " ").title())
    with col_ctrl4:
        map_view = st.selectbox("Vista", ["Relevancia", "Sentimiento", "Impacto en España"],
                                key="d7map_view")
    with col_ctrl5:
        if st.button("↺ Ingestar", key="d7map_ingest", use_container_width=True,
                     help="Lanzar ingesta de noticias de todas las fuentes"):
            st.session_state["d7_run_ingest"] = True

    # ── Manual ingestion trigger ──────────────────────────────────────────────
    if st.session_state.get("d7_run_ingest"):
        st.session_state["d7_run_ingest"] = False
        if _news_mod:
            try:
                _news_mod.init_db()
                with st.spinner("Ingestando noticias prioritarias (≈150 fuentes)…"):
                    _ing_stats = _news_mod.ingest_priority(use_ollama=True)
                st.success(
                    f"Ingesta completada: {_ing_stats.get('inserted',0)} nuevos artículos "
                    f"de {_ing_stats.get('fetched',0)} bajados"
                )
                st.cache_data.clear()
                st.rerun()
            except Exception as _ing_exc:
                st.error(f"Error en ingesta: {_ing_exc}")
        else:
            st.warning("Módulo de ingesta no disponible")

    _geo_tuple  = tuple(_selected_regions)
    _ccaa_tuple = tuple(_sel_ccaa)
    df_ev = _load_global_events(map_hours, map_min_rel, map_cat, _geo_tuple, _ccaa_tuple)

    # ── Normalizar columnas opcionales para evitar KeyError ──────────────────
    # El fallback _ALL_MAP_EVENTS no tiene todas las columnas que genera
    # el pipeline de Ollama (news_ingestion). Se rellenan con defaults seguros.
    _EV_DEFAULTS: dict = {
        "ai_urgency":       "baja",
        "ai_analysis":      "",
        "ai_topics":        None,
        "ai_entities":      None,
        "ai_region_trend":  "",
        "ai_language":      "es",
        "ai_impact_areas":  None,
        "content":          "",
        "url":              "",
        "narrativas":       None,
        "related_titles":   None,
        "fuentes_list":     None,
        "n_articles":       1,
    }
    if not df_ev.empty:
        for _col, _default in _EV_DEFAULTS.items():
            if _col not in df_ev.columns:
                df_ev[_col] = _default

    # ── KPI row ───────────────────────────────────────────────────────────────
    k1, k2, k3, k4, k5 = st.columns(5)
    _is_demo = _news_mod is None or df_ev.empty
    _n_events = len(df_ev)
    _n_critical = len(df_ev[df_ev["ai_relevance"] >= 9]) if not df_ev.empty else 0
    _n_spain_hi = len(df_ev[df_ev["ai_spain_impact"].isin(["alto", "critico"])]) if "ai_spain_impact" in df_ev.columns and not df_ev.empty else 0
    _pct_neg = (df_ev["ai_sentiment"] == "negativo").sum() / max(_n_events, 1) * 100 if not df_ev.empty else 0
    _pct_pos = (df_ev["ai_sentiment"] == "positivo").sum() / max(_n_events, 1) * 100 if not df_ev.empty else 0

    with k1:
        st.markdown(kpi_card("Eventos activos", str(_n_events), color=CYAN), unsafe_allow_html=True)
    with k2:
        st.markdown(kpi_card("Relevancia critica", str(_n_critical), color=RED), unsafe_allow_html=True)
    with k3:
        st.markdown(kpi_card("Impacto alto ESP", str(_n_spain_hi), color=AMBER), unsafe_allow_html=True)
    with k4:
        st.markdown(kpi_card("Sentimiento neg.", f"{_pct_neg:.0f}%", color=RED), unsafe_allow_html=True)
    with k5:
        st.markdown(kpi_card("Sentimiento pos.", f"{_pct_pos:.0f}%", color=GREEN), unsafe_allow_html=True)

    if _is_demo:
        st.markdown(
            f'<div style="background:{AMBER}12;border:1px solid {AMBER}44;border-radius:6px;'
            f'padding:.5rem .9rem;font-size:.72rem;color:{AMBER};margin:.5rem 0">'
            f'Datos de demostración — activa el pipeline de ingesta para datos en tiempo real'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ── World map ─────────────────────────────────────────────────────────────
    if not df_ev.empty:
        df_map = df_ev.copy()

        # Ensure lat/lon
        if "ai_geo_lat" not in df_map.columns:
            df_map["ai_geo_lat"] = df_map.get("source_lat", 0)
        if "ai_geo_lon" not in df_map.columns:
            df_map["ai_geo_lon"] = df_map.get("source_lon", 0)

        df_map = df_map.dropna(subset=["ai_geo_lat", "ai_geo_lon"])

        _SENTIMENT_COLORS = {
            "positivo": GREEN, "negativo": RED, "neutro": MUTED, "mixto": AMBER,
        }
        _SPAIN_IMPACT_COLORS = {
            "critico": RED, "alto": AMBER, "medio": BLUE, "bajo": MUTED, "ninguno": BG3,
        }
        _CAT_COLORS = {
            "politica_interior": CYAN, "politica_exterior": BLUE,
            "economia": AMBER, "seguridad_defensa": RED,
            "justicia": PURPLE, "sociedad": GREEN, "tecnologia": "#22D3EE",
            "medioambiente": "#10B981", "energia": "#F97316", "salud": "#EC4899",
        }

        if map_view == "Sentimiento":
            df_map["_color"] = df_map["ai_sentiment"].fillna("neutro").map(
                lambda s: _SENTIMENT_COLORS.get(s, MUTED)
            )
            color_col = "ai_sentiment"
            color_map = _SENTIMENT_COLORS
        elif map_view == "Impacto en España":
            df_map["_color"] = df_map.get("ai_spain_impact", "bajo").fillna("bajo").map(
                lambda s: _SPAIN_IMPACT_COLORS.get(s, MUTED)
            )
            color_col = "ai_spain_impact"
            color_map = _SPAIN_IMPACT_COLORS
        else:
            df_map["_color"] = df_map.get("ai_category", "otro").fillna("otro").map(
                lambda c: _CAT_COLORS.get(c, MUTED)
            )
            color_col = "ai_category"
            color_map = _CAT_COLORS

        # Build scatter_geo
        fig_world = go.Figure()

        # Group by color for legend
        _unique_colors = df_map[color_col].fillna("otro").unique() if color_col in df_map.columns else []
        for grp_val in _unique_colors:
            df_grp = df_map[df_map[color_col].fillna("otro") == grp_val]
            c = color_map.get(grp_val, MUTED)
            fig_world.add_trace(go.Scattergeo(
                lat=df_grp["ai_geo_lat"],
                lon=df_grp["ai_geo_lon"],
                mode="markers",
                name=str(grp_val).replace("_", " ").title(),
                marker=dict(
                    size=(df_grp["ai_relevance"].fillna(6).clip(lower=3) * 2.5).tolist(),
                    color=c,
                    opacity=0.88,
                    line=dict(width=0.6, color="rgba(255,255,255,0.12)"),
                    sizemode="diameter",
                    sizemin=6,
                ),
                text=df_grp["title"],
                customdata=df_grp.reindex(
                    columns=["ai_summary", "ai_relevance", "ai_spain_impact",
                             "ai_urgency", "source_name", "n_articles", "geo_region"]
                ).fillna(""),
                hovertemplate=(
                    "<b>%{text}</b><br>"
                    "<b>Relevancia:</b> %{customdata[1]}/10 | "
                    "<b>Urgencia:</b> %{customdata[3]}<br>"
                    "<b>Region:</b> %{customdata[6]}<br>"
                    "<b>Noticias:</b> %{customdata[5]} articulos | "
                    "<b>Impacto ESP:</b> %{customdata[2]}<br>"
                    "<b>Fuente principal:</b> %{customdata[4]}<br>"
                    "<br><i>%{customdata[0]}</i>"
                    "<extra></extra>"
                ),
            ))

        _zoom = _get_zoom_preset(_selected_regions)

        # ── Colores del mapa visibles sobre fondo oscuro ──────────────────
        # land y ocean deben contrastar con el papel oscuro; BORDER es demasiado
        # tenue como color de costa — usar un azul-gris más luminoso
        _MAP_LAND      = "#1C2A3A"   # azul-gris oscuro, visible sobre #080C14
        _MAP_OCEAN     = "#0A1220"   # azul marino muy oscuro (contrasta con tierra)
        _MAP_COAST     = "#2E4A6B"   # azul-gris medio, costlines legibles
        _MAP_BORDER    = "#243550"   # fronteras de países (más tenues)
        _MAP_GRATICULE = "#151F2E"   # meridianos/paralelos (muy tenues)

        # Zoom: natural earth NO usa projection_scale ni center para zoom real;
        # usa lataxis_range y lonaxis_range (rangos de coordenadas visibles).
        _geo_cfg: dict = dict(
            showcoastlines=True,     coastlinecolor=_MAP_COAST,  coastlinewidth=0.8,
            showland=True,           landcolor=_MAP_LAND,
            showocean=True,          oceancolor=_MAP_OCEAN,
            showlakes=False,
            showrivers=False,
            showcountries=True,      countrycolor=_MAP_BORDER,   countrywidth=0.4,
            showsubunits=False,
            showframe=False,
            projection_type="natural earth",
            bgcolor="#080C14",
        )
        if _zoom.get("range_lat"):
            _geo_cfg["lataxis_range"] = _zoom["range_lat"]
        else:
            _geo_cfg["lataxis_range"] = [-80, 85]
        if _zoom.get("range_lon"):
            _geo_cfg["lonaxis_range"] = _zoom["range_lon"]
        else:
            _geo_cfg["lonaxis_range"] = [-180, 180]

        fig_world.update_geos(**_geo_cfg)
        fig_world.update_layout(
            paper_bgcolor="#080C14",
            height=520,
            margin=dict(l=0, r=0, t=8, b=0),
            legend=dict(
                bgcolor=BG2, bordercolor=BORDER, borderwidth=1,
                font=dict(color=TEXT2, size=10),
                x=0.01, y=0.99, xanchor="left", yanchor="top",
            ),
            font=dict(color=TEXT, family="Inter, system-ui, sans-serif"),
        )
        st.plotly_chart(fig_world, use_container_width=True, config={"displayModeBar": False})

        # ── Resumen regional dinamico ─────────────────────────────────────────
        # Mostrar solo cuando hay esfera especifica activa (no Internacional)
        if _region_filter:
            _ccaa_for_summary = _sel_ccaa[0] if (len(_sel_ccaa) == 1 and _active_sphere == "Regional Español") else ""
            _summary_label = _ccaa_for_summary if _ccaa_for_summary else _active_sdef["label"]
            _summ = _load_region_summary(_region_filter, _ccaa_for_summary)
            if _summ and (_summ.get("politica") or _summ.get("economia") or _summ.get("social")):
                st.markdown(
                    f'<div style="margin:.8rem 0 .3rem;font-size:.72rem;font-weight:800;'
                    f'color:{_s_color};letter-spacing:.07em;text-transform:uppercase">'
                    f'RESUMEN MENSUAL — {_summary_label.upper()}'
                    f'<span style="font-weight:400;color:{MUTED};margin-left:.8rem;font-size:.65rem">'
                    f'{_summ.get("n_articles",0)} articulos analizados</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
                _sc1, _sc2, _sc3 = st.columns(3)
                def _summ_col(col, label: str, items: list, color: str) -> None:
                    with col:
                        st.markdown(
                            f'<div style="background:{color}10;border:1px solid {color}30;'
                            f'border-radius:8px;padding:.7rem .9rem;min-height:130px">'
                            f'<div style="font-size:.65rem;font-weight:800;color:{color};'
                            f'text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem">'
                            f'{label}</div>'
                            + "".join(
                                f'<div style="font-size:.7rem;color:{TEXT2};padding:.18rem 0;'
                                f'border-bottom:1px solid {BORDER}44;line-height:1.35">'
                                f'<span style="color:{color};margin-right:.3rem">&#9654;</span>'
                                f'{t[:120]}</div>'
                                for t in (items or ["Sin datos suficientes"])
                            )
                            + f'</div>',
                            unsafe_allow_html=True,
                        )
                _summ_col(_sc1, "Politica",  _summ.get("politica", []),  CYAN)
                _summ_col(_sc2, "Economia",  _summ.get("economia", []),  AMBER)
                _summ_col(_sc3, "Social",    _summ.get("social",   []),  GREEN)

        # ── Ficha interactiva de evento ───────────────────────────────────────
        section_header("FICHA DE EVENTO — INTELIGENCIA POLITICA", CYAN)

        _ev_options = (
            df_ev.sort_values("ai_relevance", ascending=False)["title"].tolist()
            if not df_ev.empty else []
        )
        _ev_sel_title = st.selectbox(
            "Seleccionar evento para analisis en profundidad",
            _ev_options,
            key="d7ev_sel",
        ) if _ev_options else None

        if _ev_sel_title:
            _ev_row = df_ev[df_ev["title"] == _ev_sel_title]
            if not _ev_row.empty:
                _ev = _ev_row.iloc[0]
                _ev_cat = str(_ev.get("ai_category", "otro") or "otro")
                _ev_color = _CAT_COLORS.get(_ev_cat, MUTED)
                _ev_rel = int(_ev.get("ai_relevance", 5))
                _ev_sent = str(_ev.get("ai_sentiment", "neutro") or "neutro")
                _ev_spain = str(_ev.get("ai_spain_impact", "bajo") or "bajo")
                _ev_urgency = str(_ev.get("ai_urgency", "") or "")
                _ev_region = str(_ev.get("geo_region", "") or "")
                _ev_loc = str(_ev.get("ai_geo_location", "") or "")
                _ev_src = str(_ev.get("source_name", "") or "")
                _ev_n_arts = int(_ev.get("n_articles", 1) or 1)
                _ev_narrativas = _ev.get("narrativas") or []
                if isinstance(_ev_narrativas, str):
                    import json as _json_ev2
                    try:
                        _ev_narrativas = _json_ev2.loads(_ev_narrativas)
                    except Exception:
                        _ev_narrativas = []
                _ev_related = _ev.get("related_titles") or []
                if isinstance(_ev_related, str):
                    import json as _json_ev3
                    try:
                        _ev_related = _json_ev3.loads(_ev_related)
                    except Exception:
                        _ev_related = []
                _ev_fuentes = _ev.get("fuentes_list") or []
                if isinstance(_ev_fuentes, str):
                    import json as _json_ev4
                    try:
                        _ev_fuentes = _json_ev4.loads(_ev_fuentes)
                    except Exception:
                        _ev_fuentes = []
                _ev_topics = _ev.get("ai_topics", []) or []
                if isinstance(_ev_topics, str):
                    import json as _json_ev
                    try:
                        _ev_topics = _json_ev.loads(_ev_topics)
                    except Exception:
                        _ev_topics = [_ev_topics]

                _rel_c = RED if _ev_rel >= 9 else (AMBER if _ev_rel >= 7 else MUTED)
                _sent_c = {"positivo": GREEN, "negativo": RED, "mixto": AMBER, "neutro": MUTED}.get(_ev_sent, MUTED)
                _spain_c = {"critico": RED, "alto": AMBER, "medio": BLUE, "bajo": MUTED}.get(_ev_spain, MUTED)

                # Cabecera de la ficha
                st.markdown(
                    f'<div style="background:{BG2};border:1px solid {BORDER};'
                    f'border-left:4px solid {_ev_color};border-radius:8px;padding:1rem 1.2rem;margin:.5rem 0">'
                    f'<div style="font-size:.98rem;font-weight:800;color:{TEXT};line-height:1.35;margin-bottom:.6rem">'
                    f'{_ev.get("title","")}</div>'
                    f'<div style="display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.6rem">'
                    f'<span style="background:{_rel_c}18;color:{_rel_c};border:1px solid {_rel_c}44;'
                    f'border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:800;font-family:monospace">R{_ev_rel}/10</span>'
                    f'<span style="background:{_sent_c}18;color:{_sent_c};border:1px solid {_sent_c}33;'
                    f'border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:600">{_ev_sent}</span>'
                    f'<span style="background:{_spain_c}18;color:{_spain_c};border:1px solid {_spain_c}33;'
                    f'border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:600">ESP: {_ev_spain}</span>'
                    f'<span style="background:{_ev_color}18;color:{_ev_color};border:1px solid {_ev_color}33;'
                    f'border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:600">{_ev_cat.replace("_"," ").upper()}</span>'
                    f'{"<span style=background:" + AMBER + "18;color:" + AMBER + ";border:1px solid " + AMBER + "33;border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:600>" + _ev_urgency + "</span>" if _ev_urgency else ""}'
                    f'<span style="background:{CYAN}12;color:{CYAN};border:1px solid {CYAN}30;'
                    f'border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:600">'
                    f'{_ev_n_arts} noticias</span>'
                    f'</div>'
                    f'<div style="color:{MUTED};font-size:.68rem">'
                    f'{_ev_src}{"  ·  " + _ev_loc if _ev_loc else ""}{"  ·  " + _ev_region if _ev_region else ""}'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )

                # Columnas: resumen + analisis
                _fc1, _fc2 = st.columns(2)
                with _fc1:
                    if _ev.get("ai_summary"):
                        st.markdown(
                            f'<div style="background:{BG3};border-radius:6px;padding:.75rem .9rem;'
                            f'font-size:.78rem;color:{TEXT2};line-height:1.6;margin:.3rem 0">'
                            f'<div style="color:{CYAN};font-size:.63rem;font-weight:700;'
                            f'text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem">Resumen</div>'
                            f'{_ev["ai_summary"]}</div>',
                            unsafe_allow_html=True,
                        )
                with _fc2:
                    if _ev.get("ai_analysis"):
                        st.markdown(
                            f'<div style="background:{BG3};border-radius:6px;padding:.75rem .9rem;'
                            f'font-size:.78rem;color:{TEXT2};line-height:1.6;margin:.3rem 0">'
                            f'<div style="color:{AMBER};font-size:.63rem;font-weight:700;'
                            f'text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem">Analisis estrategico</div>'
                            f'{_ev["ai_analysis"]}</div>',
                            unsafe_allow_html=True,
                        )

                # Temas
                if _ev_topics:
                    _pills = "".join(
                        f'<span style="background:{BLUE}18;color:{BLUE};border:1px solid {BLUE}33;'
                        f'border-radius:3px;padding:.15rem .5rem;font-size:.63rem;font-weight:600;margin:.15rem">{t}</span>'
                        for t in _ev_topics[:6]
                    )
                    st.markdown(f'<div style="margin:.4rem 0">{_pills}</div>', unsafe_allow_html=True)

                # ── Narrativas detectadas ─────────────────────────────────────
                if _ev_narrativas:
                    _narr_pills = "".join(
                        f'<span style="background:{PURPLE}18;color:{PURPLE};border:1px solid {PURPLE}44;'
                        f'border-radius:4px;padding:.2rem .6rem;font-size:.63rem;font-weight:700;margin:.15rem;display:inline-block">'
                        f'{n}</span>'
                        for n in _ev_narrativas
                    )
                    st.markdown(
                        f'<div style="margin:.5rem 0 .2rem">'
                        f'<div style="color:{PURPLE};font-size:.62rem;font-weight:700;'
                        f'text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem">'
                        f'Narrativas detectadas</div>'
                        f'{_narr_pills}</div>',
                        unsafe_allow_html=True,
                    )

                # ── Noticias relacionadas ─────────────────────────────────────
                if _ev_related or _ev_fuentes:
                    _rel_items = "".join(
                        f'<div style="padding:.35rem .5rem;border-left:2px solid {CYAN}44;'
                        f'margin:.25rem 0;font-size:.72rem;color:{TEXT2};line-height:1.4">'
                        f'{title}</div>'
                        for title in (_ev_related or [])[:5]
                    )
                    _src_pills = "".join(
                        f'<span style="background:{BLUE}10;color:{TEXT2};border:1px solid {BORDER};'
                        f'border-radius:3px;padding:.1rem .4rem;font-size:.60rem;margin:.1rem;display:inline-block">'
                        f'{s}</span>'
                        for s in (_ev_fuentes or [])[:4]
                    )
                    st.markdown(
                        f'<div style="background:{BG3};border-radius:6px;padding:.75rem .9rem;margin:.4rem 0">'
                        f'<div style="color:{CYAN};font-size:.62rem;font-weight:700;'
                        f'text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem">'
                        f'Noticias incluidas ({_ev_n_arts} articulos)</div>'
                        f'{_rel_items}'
                        f'{"<div style=margin-top:.4rem>" + _src_pills + "</div>" if _src_pills else ""}'
                        f'</div>',
                        unsafe_allow_html=True,
                    )

                # Eventos proximos en la misma region
                _nearby = (
                    df_ev[
                        (df_ev["geo_region"] == _ev_region)
                        & (df_ev["title"] != _ev.get("title", ""))
                    ]
                    .sort_values("ai_relevance", ascending=False)
                    .head(3)
                )
                if not _nearby.empty:
                    st.markdown(
                        f'<div style="color:{MUTED};font-size:.68rem;font-weight:700;'
                        f'text-transform:uppercase;letter-spacing:.06em;margin:.7rem 0 .3rem">'
                        f'Otros eventos en la zona — {_ev_region}</div>',
                        unsafe_allow_html=True,
                    )
                    _nc = st.columns(len(_nearby))
                    for _nci, (_, _nev) in enumerate(zip(_nc, _nearby.iterrows())):
                        _nev = _nev[1]
                        _nr = int(_nev.get("ai_relevance", 5))
                        _nc_color = RED if _nr >= 9 else (AMBER if _nr >= 7 else MUTED)
                        _nc[_nci].markdown(
                            f'<div style="background:{BG2};border:1px solid {BORDER};'
                            f'border-top:2px solid {_nc_color};border-radius:6px;padding:.6rem .8rem">'
                            f'<div style="font-size:.72rem;font-weight:700;color:{TEXT};line-height:1.3;'
                            f'margin-bottom:.3rem">{str(_nev.get("title",""))[:80]}</div>'
                            f'<div style="font-size:.62rem;color:{MUTED}">'
                            f'{str(_nev.get("source_name",""))} · R{_nr}/10</div>'
                            f'</div>',
                            unsafe_allow_html=True,
                        )

                # Ollama deep-dive
                st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
                _ai_key = f"d7_ev_ai_{hash(_ev.get('title',''))}"
                _col_btn, _col_save = st.columns([3, 1])
                with _col_btn:
                    _run_ai = st.button(
                        "Analizar con IA (Ollama)",
                        key="d7ev_ai_btn",
                        help="Genera un analisis profundo del evento usando el modelo local",
                    )
                with _col_save:
                    _save_card = st.button("Guardar ficha", key="d7ev_save_btn")

                if _run_ai:
                    _prompt_ev = (
                        f"Analiza en profundidad este evento desde la perspectiva de inteligencia politica espanola:\n\n"
                        f"EVENTO: {_ev.get('title','')}\n"
                        f"UBICACION: {_ev_loc} ({_ev_region})\n"
                        f"RESUMEN: {_ev.get('ai_summary','')}\n"
                        f"ANALISIS PREVIO: {_ev.get('ai_analysis','')}\n"
                        f"TEMAS: {', '.join(str(t) for t in _ev_topics)}\n\n"
                        f"Proporciona:\n"
                        f"1. CONTEXTO HISTORICO: antecedentes relevantes del evento\n"
                        f"2. ACTORES CLAVE: quien se ve afectado o influye en este evento\n"
                        f"3. IMPACTO EN ESPANA: consecuencias concretas y especificas para Espana\n"
                        f"4. ESCENARIOS: tres posibles desarrollos del evento (optimista, base, pesimista)\n"
                        f"5. RECOMENDACION: que deberia hacer o vigilar un analista politico espanol\n\n"
                        f"Responde en espanol, sin emojis, estilo analitico conciso."
                    )
                    with st.spinner("Generando analisis de inteligencia..."):
                        try:
                            import requests as _req_ev
                            _r_ev = _req_ev.post(
                                "http://localhost:11434/api/generate",
                                json={"model": "qwen3:8b", "prompt": _prompt_ev,
                                      "stream": False, "options": {"temperature": 0.1, "num_predict": 900}},
                                timeout=90,
                            )
                            if _r_ev.ok:
                                _raw_ev = _r_ev.json().get("response", "")
                                # Strip <think> blocks
                                import re as _re_ev
                                _raw_ev = _re_ev.sub(r"<think>.*?</think>", "", _raw_ev, flags=_re_ev.DOTALL).strip()
                                st.session_state[_ai_key] = _raw_ev
                            else:
                                st.session_state[_ai_key] = "Ollama no disponible (comprueba que el servicio esta activo)"
                        except Exception as _exc_ev:
                            st.session_state[_ai_key] = f"Error al conectar con Ollama: {_exc_ev}"

                if _ai_key in st.session_state and st.session_state[_ai_key]:
                    st.markdown(
                        f'<div style="background:{BG2};border:1px solid {CYAN}33;'
                        f'border-left:3px solid {CYAN};border-radius:8px;'
                        f'padding:1rem 1.2rem;margin:.5rem 0">'
                        f'<div style="color:{CYAN};font-size:.65rem;font-weight:700;'
                        f'text-transform:uppercase;letter-spacing:.08em;margin-bottom:.6rem">'
                        f'Analisis de inteligencia — IA local</div>'
                        f'<div style="color:{TEXT2};font-size:.80rem;line-height:1.7;white-space:pre-wrap">'
                        f'{st.session_state[_ai_key]}'
                        f'</div></div>',
                        unsafe_allow_html=True,
                    )

                if _save_card:
                    _saved_key = "d7_saved_event_cards"
                    if _saved_key not in st.session_state:
                        st.session_state[_saved_key] = []
                    _card_data = {
                        "title": _ev.get("title", ""),
                        "geo_location": _ev_loc,
                        "geo_region": _ev_region,
                        "category": _ev_cat,
                        "relevance": _ev_rel,
                        "sentiment": _ev_sent,
                        "spain_impact": _ev_spain,
                        "summary": _ev.get("ai_summary", ""),
                        "analysis": _ev.get("ai_analysis", ""),
                        "ai_analysis": st.session_state.get(_ai_key, ""),
                        "topics": _ev_topics,
                        "saved_at": pd.Timestamp.now().isoformat(),
                    }
                    st.session_state[_saved_key].append(_card_data)
                    st.success(f"Ficha guardada ({len(st.session_state[_saved_key])} fichas en sesion)")

        # ── Top critical events ───────────────────────────────────────────────
        section_header("EVENTOS CRITICOS — ANALISIS DETALLADO", RED)

        df_critical = df_ev.sort_values("ai_relevance", ascending=False).head(8)

        for _, ev in df_critical.iterrows():
            rel = int(ev.get("ai_relevance", 5))
            sent = ev.get("ai_sentiment", "neutro") or "neutro"
            spain = ev.get("ai_spain_impact", "bajo") or "bajo"
            urgency = ev.get("ai_urgency", "baja") or "baja"
            cat = str(ev.get("ai_category", "otro") or "otro").replace("_", " ").upper()

            rel_color = RED if rel >= 9 else (AMBER if rel >= 7 else MUTED)
            sent_color = _SENTIMENT_COLORS.get(sent, MUTED)
            spain_color = _SPAIN_IMPACT_COLORS.get(spain, MUTED)

            summary_html = ""
            if ev.get("ai_summary"):
                summary_html = (
                    f'<div style="color:{TEXT2};font-size:.80rem;'
                    f'line-height:1.6;margin:.6rem 0">{ev["ai_summary"]}</div>'
                )
            analysis_html = ""
            if ev.get("ai_analysis"):
                analysis_html = (
                    f'<div style="background:{BG3};border-left:2px solid {CYAN}55;'
                    f'border-radius:0 4px 4px 0;padding:.5rem .8rem;'
                    f'color:{TEXT2};font-size:.76rem;line-height:1.55;margin-top:.4rem">'
                    f'<span style="color:{CYAN};font-size:.63rem;font-weight:700;'
                    f'text-transform:uppercase;letter-spacing:.08em">Analisis estrategico: </span>'
                    f'{ev["ai_analysis"]}'
                    f'</div>'
                )

            topics_html = ""
            topics = ev.get("ai_topics", [])
            if isinstance(topics, list) and topics:
                pills = "".join(
                    f'<span style="background:{BLUE}18;color:{BLUE};border:1px solid {BLUE}33;'
                    f'border-radius:3px;padding:.1rem .45rem;font-size:.63rem;'
                    f'font-weight:600;margin-right:.3rem">{t}</span>'
                    for t in topics[:4]
                )
                topics_html = f'<div style="margin-top:.5rem">{pills}</div>'

            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};'
                f'border-left:3px solid {rel_color};border-radius:8px;'
                f'padding:.9rem 1.1rem;margin:.5rem 0">'
                f'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">'
                f'<a href="{ev.get("url","#")}" target="_blank" style="color:{TEXT};'
                f'font-weight:700;font-size:.87rem;text-decoration:none;'
                f'line-height:1.35;flex:1">{ev.get("title","")}</a>'
                f'<div style="display:flex;gap:.35rem;flex-shrink:0">'
                f'<span style="background:{rel_color}18;color:{rel_color};border:1px solid {rel_color}44;'
                f'border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:800;'
                f'font-family:monospace">R{rel}</span>'
                f'<span style="background:{sent_color}18;color:{sent_color};border:1px solid {sent_color}33;'
                f'border-radius:4px;padding:.15rem .45rem;font-size:.63rem;font-weight:600">{sent}</span>'
                f'<span style="background:{spain_color}18;color:{spain_color};border:1px solid {spain_color}33;'
                f'border-radius:4px;padding:.15rem .45rem;font-size:.63rem;font-weight:600">ESP: {spain}</span>'
                f'</div></div>'
                f'<div style="color:{MUTED};font-size:.66rem;margin:.35rem 0">'
                f'{ev.get("source_name","")}'
                f'{"  ·  " + ev.get("ai_geo_location","") if ev.get("ai_geo_location") else ""}'
                f'{"  ·  urgencia: " + urgency}'
                f'{"  ·  " + cat}'
                f'</div>'
                f'{summary_html}{analysis_html}{topics_html}'
                f'</div>',
                unsafe_allow_html=True,
            )

    else:
        st.markdown(
            f'<div style="background:{BG2};border:1px dashed {BORDER};border-radius:10px;'
            f'padding:3rem;text-align:center;color:{MUTED}">'
            f'No hay eventos con relevancia suficiente en la ventana temporal seleccionada.'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ── Noticias por region ───────────────────────────────────────────────────
    st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)
    section_header("NOTICIAS DESTACADAS POR REGION", CYAN)

    if not df_ev.empty:
        # Determine which regions to show based on active sphere
        _regions_to_show = (
            [r for r in _GEO_REGION_KEYS if r != "Internacional"]
            if not _selected_regions   # Internacional → show all regions
            else [r for r in _selected_regions if r != "Internacional"]
        )

        _REGION_COLORS = {
            "Europa": BLUE, "Africa": AMBER, "Asia": PURPLE,
            "America del Norte": CYAN, "America del Sur": GREEN,
            "España Nacional": RED, "España Regional": "#22D3EE",
        }

        for _region_key in _regions_to_show:
            _df_region = df_ev[df_ev["geo_region"] == _region_key]
            if _df_region.empty:
                continue

            _df_region = _df_region.sort_values("ai_relevance", ascending=False).head(3)
            _reg_color = _REGION_COLORS.get(_region_key, MUTED)

            st.markdown(
                f'<div style="font-size:.72rem;font-weight:800;color:{_reg_color};'
                f'letter-spacing:.08em;text-transform:uppercase;margin:.8rem 0 .35rem">— {_region_key}</div>',
                unsafe_allow_html=True,
            )

            _rcols = st.columns(min(len(_df_region), 3))
            for _ci, (_, _ev) in enumerate(zip(_rcols, _df_region.iterrows())):
                _ev = _ev[1]
                _rel = int(_ev.get("ai_relevance", 5))
                _rel_c = RED if _rel >= 9 else (AMBER if _rel >= 7 else MUTED)
                _sent = str(_ev.get("ai_sentiment", "neutro") or "neutro")
                _sent_c = {
                    "positivo": GREEN, "negativo": RED,
                    "mixto": AMBER, "neutro": MUTED,
                }.get(_sent, MUTED)
                _sum_short = str(_ev.get("ai_summary", "") or "")[:160]
                if len(str(_ev.get("ai_summary", "") or "")) > 160:
                    _sum_short += "..."

                _rcols[_ci].markdown(
                    f'<div style="background:{BG2};border:1px solid {BORDER};'
                    f'border-top:3px solid {_reg_color};border-radius:6px;'
                    f'padding:.75rem .9rem;height:100%">'
                    f'<div style="display:flex;gap:.35rem;margin-bottom:.4rem">'
                    f'<span style="background:{_rel_c}18;color:{_rel_c};border:1px solid {_rel_c}44;'
                    f'border-radius:3px;padding:.1rem .4rem;font-size:.6rem;font-weight:800;'
                    f'font-family:monospace">R{_rel}</span>'
                    f'<span style="background:{_sent_c}18;color:{_sent_c};border:1px solid {_sent_c}33;'
                    f'border-radius:3px;padding:.1rem .4rem;font-size:.6rem;font-weight:600">{_sent}</span>'
                    f'<span style="color:{MUTED};font-size:.6rem">{str(_ev.get("source_name",""))}</span>'
                    f'</div>'
                    f'<div style="font-size:.78rem;font-weight:700;color:{TEXT};'
                    f'line-height:1.35;margin-bottom:.4rem">{str(_ev.get("title",""))}</div>'
                    f'<div style="font-size:.68rem;color:{TEXT2};line-height:1.5">{_sum_short}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
    else:
        st.markdown(
            f'<div style="color:{MUTED};font-size:.8rem;text-align:center;padding:1.5rem">'
            f'Sin noticias disponibles para las regiones seleccionadas</div>',
            unsafe_allow_html=True,
        )
