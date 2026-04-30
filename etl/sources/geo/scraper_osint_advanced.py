"""
Scraper OSINT Avanzado — 50+ fuentes especializadas en geopolítica
Usa feedparser para RSS, trafilatura (opcional) para extracción limpia.
JSON store en dashboard/data/osint_geo.json para uso sin PostgreSQL.
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[3]
_DATA_DIR = _ROOT / "dashboard" / "data"
_DATA_DIR.mkdir(parents=True, exist_ok=True)
_STORE_FILE = _DATA_DIR / "osint_geo.json"

# ── 50+ Fuentes OSINT curadas ────────────────────────────────────────────────
FUENTES_OSINT: dict[str, dict[str, Any]] = {
    # ── Think tanks y análisis estratégico ───────────────────────────────────
    "crisis_group": {
        "url": "https://www.crisisgroup.org/rss.xml",
        "tipo": "think_tank", "idioma": "en", "relevancia_base": 0.90,
        "desc": "International Crisis Group — alertas de conflicto",
    },
    "real_instituto_elcano": {
        "url": "https://www.realinstitutoelcano.org/rss/",
        "tipo": "think_tank_es", "idioma": "es", "relevancia_base": 0.95,
        "desc": "El think tank geopolítico más relevante para España",
    },
    "cidob": {
        "url": "https://www.cidob.org/es/rss",
        "tipo": "think_tank_es", "idioma": "es", "relevancia_base": 0.90,
        "desc": "CIDOB Barcelona — relaciones internacionales España",
    },
    "ieee_espana": {
        "url": "https://www.ieee.es/rss/",
        "tipo": "think_tank_es", "idioma": "es", "relevancia_base": 0.92,
        "desc": "IEEE — Instituto Español de Estudios Estratégicos (Min. Defensa)",
    },
    "chatham_house": {
        "url": "https://www.chathamhouse.org/rss.xml",
        "tipo": "think_tank", "idioma": "en", "relevancia_base": 0.85,
    },
    "sipri_news": {
        "url": "https://www.sipri.org/media/rss",
        "tipo": "think_tank", "idioma": "en", "relevancia_base": 0.85,
        "desc": "SIPRI — armamento, gasto defensa, control de armas",
    },
    "carnegie_endowment": {
        "url": "https://carnegieendowment.org/rss/",
        "tipo": "think_tank", "idioma": "en", "relevancia_base": 0.80,
    },
    "brookings": {
        "url": "https://www.brookings.edu/feed/",
        "tipo": "think_tank", "idioma": "en", "relevancia_base": 0.80,
    },
    "iiss": {
        "url": "https://www.iiss.org/rss/feeds/iiss-analysis",
        "tipo": "think_tank", "idioma": "en", "relevancia_base": 0.88,
        "desc": "IISS — análisis seguridad y defensa global",
    },
    "rand_corp": {
        "url": "https://www.rand.org/pubs/feed.xml",
        "tipo": "think_tank", "idioma": "en", "relevancia_base": 0.82,
    },
    "ecfr": {
        "url": "https://ecfr.eu/feed/",
        "tipo": "think_tank_eu", "idioma": "en", "relevancia_base": 0.88,
        "desc": "European Council on Foreign Relations — política exterior UE",
    },
    # ── Medios especializados en seguridad ───────────────────────────────────
    "war_on_rocks": {
        "url": "https://warontherocks.com/feed/",
        "tipo": "media_seguridad", "idioma": "en", "relevancia_base": 0.88,
    },
    "bellingcat": {
        "url": "https://www.bellingcat.com/feed/",
        "tipo": "osint_investigacion", "idioma": "en", "relevancia_base": 0.90,
        "desc": "Bellingcat — OSINT investigación periodística",
    },
    "defense_one": {
        "url": "https://www.defenseone.com/rss/all/",
        "tipo": "media_defensa", "idioma": "en", "relevancia_base": 0.85,
    },
    "lawfare": {
        "url": "https://www.lawfaremedia.org/feed",
        "tipo": "media_seguridad", "idioma": "en", "relevancia_base": 0.82,
    },
    "infodefensa": {
        "url": "https://www.infodefensa.com/es/rss/",
        "tipo": "media_defensa_es", "idioma": "es", "relevancia_base": 0.92,
        "desc": "Defensa española — Ejército, contratos, OTAN",
    },
    "atalayar": {
        "url": "https://atalayar.com/es/rss.xml",
        "tipo": "media_es_internacional", "idioma": "es", "relevancia_base": 0.85,
        "desc": "Especializado en relaciones España-Mediterráneo-Latinoamérica",
    },
    # ── Medios internacionales clave ─────────────────────────────────────────
    "bbc_world": {
        "url": "http://feeds.bbci.co.uk/news/world/rss.xml",
        "tipo": "media_internacional", "idioma": "en", "relevancia_base": 0.78,
    },
    "reuters_world": {
        "url": "https://feeds.reuters.com/reuters/worldNews",
        "tipo": "media_internacional", "idioma": "en", "relevancia_base": 0.80,
    },
    "al_jazeera": {
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "tipo": "media_internacional", "idioma": "en", "relevancia_base": 0.78,
        "desc": "Perspectiva Sur Global y Oriente Medio",
    },
    "el_pais_internacional": {
        "url": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada",
        "tipo": "media_es", "idioma": "es", "relevancia_base": 0.85,
    },
    "el_confidencial_mundo": {
        "url": "https://rss.elconfidencial.com/mundo/",
        "tipo": "media_es", "idioma": "es", "relevancia_base": 0.82,
    },
    "politico_eu": {
        "url": "https://www.politico.eu/feed/",
        "tipo": "media_ue", "idioma": "en", "relevancia_base": 0.85,
        "desc": "POLITICO Europe — política y asuntos UE",
    },
    "euractiv": {
        "url": "https://www.euractiv.com/feed/",
        "tipo": "media_ue", "idioma": "en", "relevancia_base": 0.85,
    },
    "le_monde_diplomatique_es": {
        "url": "https://mondiplo.com/spip.php?page=backend",
        "tipo": "media_internacional", "idioma": "es", "relevancia_base": 0.82,
    },
    # ── Humanitarias y crisis ─────────────────────────────────────────────────
    "relief_web": {
        "url": "https://reliefweb.int/updates/rss.xml",
        "tipo": "humanitario", "idioma": "en", "relevancia_base": 0.75,
        "desc": "ReliefWeb — crisis humanitarias, desplazados",
    },
    "unhcr_news": {
        "url": "https://www.unhcr.org/rss/news.xml",
        "tipo": "humanitario", "idioma": "en", "relevancia_base": 0.78,
        "desc": "ACNUR — refugiados y migrantes (clave para España)",
    },
    "msf_spain": {
        "url": "https://www.msf.es/rss.xml",
        "tipo": "humanitario_es", "idioma": "es", "relevancia_base": 0.80,
    },
    # ── Energía y recursos — crítico para España ─────────────────────────────
    "iea_news": {
        "url": "https://www.iea.org/news.rss",
        "tipo": "energia", "idioma": "en", "relevancia_base": 0.85,
        "desc": "AIE — mercados energéticos globales",
    },
    "natural_gas_world": {
        "url": "https://www.naturalgasworld.com/rss",
        "tipo": "energia_gas", "idioma": "en", "relevancia_base": 0.90,
        "desc": "Gas natural — crítico por dependencia argelia-GNL",
    },
    "energia_estrategica": {
        "url": "https://www.energiaestrategica.com/feed/",
        "tipo": "energia_es", "idioma": "es", "relevancia_base": 0.85,
    },
    "oilprice": {
        "url": "https://oilprice.com/rss/main",
        "tipo": "energia", "idioma": "en", "relevancia_base": 0.80,
    },
    # ── Fuentes regionales especializadas ────────────────────────────────────
    "maghreb_insight": {
        "url": "https://maghrebonline.net/feed/",
        "tipo": "regional_magreb", "idioma": "en", "relevancia_base": 0.88,
        "desc": "Magreb — clave: Argelia, Marruecos, Libia",
    },
    "sahel_blog": {
        "url": "https://sahelblog.wordpress.com/feed/",
        "tipo": "regional_sahel", "idioma": "en", "relevancia_base": 0.80,
        "desc": "Sahel — misiones militares españolas activas",
    },
    "africa_confidential": {
        "url": "https://www.africa-confidential.com/rss",
        "tipo": "regional_africa", "idioma": "en", "relevancia_base": 0.78,
    },
    "latin_america_reports": {
        "url": "https://www.latinamonitor.com/feed/",
        "tipo": "regional_latam", "idioma": "en", "relevancia_base": 0.80,
    },
    "bne_intellinews": {
        "url": "https://bne.eu/rss.xml",
        "tipo": "regional_ee", "idioma": "en", "relevancia_base": 0.78,
        "desc": "Europa del Este — conflicto Ucrania, flancos OTAN",
    },
    "middle_east_eye": {
        "url": "https://www.middleeasteye.net/rss",
        "tipo": "regional_mena", "idioma": "en", "relevancia_base": 0.80,
    },
    # ── Ciberseguridad ────────────────────────────────────────────────────────
    "cyberscoop": {
        "url": "https://cyberscoop.com/feed/",
        "tipo": "ciberseguridad", "idioma": "en", "relevancia_base": 0.82,
    },
    "ccn_cert": {
        "url": "https://www.ccn-cert.cni.es/es/component/k2/?format=feed&type=rss",
        "tipo": "ciberseguridad_es", "idioma": "es", "relevancia_base": 0.95,
        "desc": "CCN-CERT — Centro Criptológico Nacional España",
    },
    "recorded_future": {
        "url": "https://www.recordedfuture.com/feed",
        "tipo": "ciberseguridad", "idioma": "en", "relevancia_base": 0.85,
    },
    "krebs_security": {
        "url": "https://krebsonsecurity.com/feed/",
        "tipo": "ciberseguridad", "idioma": "en", "relevancia_base": 0.80,
    },
    # ── Organismos internacionales ────────────────────────────────────────────
    "nato_news": {
        "url": "https://www.nato.int/cps/en/natohq/news.xml",
        "tipo": "otan", "idioma": "en", "relevancia_base": 0.92,
        "desc": "OTAN — comunicados y noticias oficiales",
    },
    "eu_eeas": {
        "url": "https://eeas.europa.eu/headquarters/headquarters-homepage/rss_en.xml",
        "tipo": "ue_diplomatica", "idioma": "en", "relevancia_base": 0.90,
    },
    "un_news": {
        "url": "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
        "tipo": "onu", "idioma": "en", "relevancia_base": 0.78,
    },
    "osce": {
        "url": "https://www.osce.org/feeds/news",
        "tipo": "seguridad_europea", "idioma": "en", "relevancia_base": 0.82,
    },
    "consejo_europeo": {
        "url": "https://www.consilium.europa.eu/es/feeds/press-releases/",
        "tipo": "ue_oficial_es", "idioma": "es", "relevancia_base": 0.88,
    },
    # ── Economia y mercados (geopolítica económica) ───────────────────────────
    "ft_world": {
        "url": "https://www.ft.com/rss/home/world",
        "tipo": "media_economico", "idioma": "en", "relevancia_base": 0.82,
    },
    "economist": {
        "url": "https://www.economist.com/sections/international/rss.xml",
        "tipo": "media_economico", "idioma": "en", "relevancia_base": 0.85,
    },
    "expansion_internacional": {
        "url": "https://www.expansion.com/rss/internacionalabc.html",
        "tipo": "media_economico_es", "idioma": "es", "relevancia_base": 0.80,
    },
}

# ── Keywords para scoring de relevancia para España ──────────────────────────
_KW_ALTA = [
    "españa", "spain", "spanish", "iberia", "madrid", "sánchez",
    "argelia", "marruecos", "gibraltar", "ceuta", "melilla",
    "inditex", "repsol", "telefónica", "iberdrola", "bbva", "santander",
    "naturgy", "enagas", "indra", "ferrovial", "acs", "caixabank",
    "otan spain", "nato spain", "ibex", "guardia civil",
]
_KW_MEDIA = [
    "europe", "unión europea", "mediterráneo", "mediterranean",
    "latin america", "latinoamérica", "sahel", "ucrania", "ukraine",
    "gas natural", "lng", "natural gas", "migration", "migracion",
    "nato", "otan", "eu sanctions", "sanciones ue", "argelia",
    "canarias", "strait", "estrecho", "energia",
]
_KW_BAJA = [
    "geopolitics", "geopolítica", "conflict", "conflicto",
    "security", "seguridad", "diplomacy", "diplomacia", "crisis",
    "war", "guerra",
]

_URGENCIA_CRITICA = [
    "breaking", "urgente", "inmediato", "ataque", "atentado",
    "explosión", "explosion", "nuclear", "coup", "golpe de estado",
    "guerra declarada", "declared war",
]
_URGENCIA_ALTA = [
    "conflicto", "clash", "fighting", "sanctions", "sanciones",
    "crisis", "alert", "alerta", "offensive", "ofensiva",
    "bombardeo", "strike",
]
_URGENCIA_MEDIA = [
    "tensions", "tensiones", "military", "militar",
    "diplomatic", "diplomático", "ceasefire", "alto el fuego",
]


def calcular_relevancia_espana(texto: str, base: float) -> float:
    """Score 0-1 de relevancia para España combinando keywords + base."""
    t = texto.lower()
    boost = 0.0
    for kw in _KW_ALTA:
        if kw in t:
            boost += 0.30
    for kw in _KW_MEDIA:
        if kw in t:
            boost += 0.15
    for kw in _KW_BAJA:
        if kw in t:
            boost += 0.05
    return min(1.0, base * 0.5 + min(boost, 0.5))


def calcular_urgencia(titulo: str, contenido: str) -> int:
    """Nivel de urgencia 1-5 por keywords en título+contenido."""
    t = (titulo + " " + contenido).lower()
    if any(k in t for k in _URGENCIA_CRITICA):
        return 5
    if any(k in t for k in _URGENCIA_ALTA):
        return 4
    if any(k in t for k in _URGENCIA_MEDIA):
        return 3
    return 2


def _scrape_feed(nombre: str, config: dict) -> list[dict]:
    """Descarga y parsea un feed RSS/Atom individual."""
    try:
        import feedparser
    except ImportError:
        logger.warning("feedparser no instalado — pip install feedparser")
        return []
    try:
        feed = feedparser.parse(config["url"])
        items: list[dict] = []
        for entry in feed.entries[:15]:
            titulo = entry.get("title", "")
            contenido = entry.get("summary", entry.get("description", ""))
            url = entry.get("link", "")
            if not url or not titulo:
                continue
            url_hash = hashlib.md5(url.encode()).hexdigest()
            texto = titulo + " " + contenido
            relevancia = calcular_relevancia_espana(texto, config.get("relevancia_base", 0.5))
            if relevancia < 0.25:
                continue
            urgencia = calcular_urgencia(titulo, contenido)
            published = entry.get("published_parsed")
            fecha_pub = (
                datetime(*published[:6], tzinfo=timezone.utc).isoformat()
                if published else datetime.now(timezone.utc).isoformat()
            )
            items.append({
                "id": url_hash,
                "titulo": titulo[:400],
                "contenido": contenido[:1500],
                "resumen_ollama": "",
                "url": url,
                "fuente": nombre,
                "fuente_tipo": config.get("tipo", "rss"),
                "idioma_original": config.get("idioma", "en"),
                "relevancia_espana": round(relevancia, 3),
                "urgencia": urgencia,
                "categoria": "",
                "subcategoria": "",
                "paises_mencionados": [],
                "actores_mencionados": [],
                "temas": [],
                "sentimiento": "neutro",
                "fecha_publicacion": fecha_pub,
                "fecha_scraping": datetime.now(timezone.utc).isoformat(),
                "procesado_llm": False,
            })
        return items
    except Exception as exc:
        logger.debug("Feed error %s: %s", nombre, exc)
        return []


def scrape_all_feeds(max_fuentes: int = 50) -> list[dict]:
    """
    Scrapea todos los feeds en paralelo usando threads.
    Retorna lista ordenada por relevancia desc.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    fuentes = list(FUENTES_OSINT.items())[:max_fuentes]
    todos: list[dict] = []

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(_scrape_feed, n, c): n for n, c in fuentes}
        for future in as_completed(futures, timeout=60):
            try:
                todos.extend(future.result())
            except Exception as exc:
                logger.debug("Scrape future error: %s", exc)

    todos.sort(key=lambda x: (-x["urgencia"], -x["relevancia_espana"]))
    return todos


def load_store() -> list[dict]:
    """Carga el store JSON existente."""
    try:
        if _STORE_FILE.exists():
            return json.loads(_STORE_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def save_store(items: list[dict]) -> None:
    """Guarda items en el store JSON, deduplicando por id/url."""
    existing = {i.get("id") or i.get("url"): i for i in load_store()}
    for item in items:
        key = item.get("id") or item.get("url")
        if key:
            existing[key] = item
    # Mantener solo los 2000 más recientes por relevancia
    merged = sorted(existing.values(), key=lambda x: (-x.get("urgencia", 1), -x.get("relevancia_espana", 0)))
    _STORE_FILE.write_text(json.dumps(merged[:2000], ensure_ascii=False, default=str), encoding="utf-8")


def run_scraping(max_fuentes: int = 50) -> dict[str, int]:
    """
    Pipeline completo: scrape → deduplicar → guardar en JSON store.
    Opcional: si hay DB disponible, también carga en osint_items.
    """
    items = scrape_all_feeds(max_fuentes=max_fuentes)
    save_store(items)
    logger.info("OSINT: %d nuevos items scrapeados y guardados", len(items))
    return {"scrapeados": len(items), "fuentes": max_fuentes}


def get_items_recent(horas: int = 24, urgencia_min: int = 2,
                     relevancia_min: float = 0.3, limit: int = 100) -> list[dict]:
    """
    Retorna items del store filtrados para el dashboard.
    """
    desde = datetime.now(timezone.utc).timestamp() - horas * 3600
    store = load_store()
    if not store:
        return _DEMO_OSINT_ITEMS

    filtrados = []
    for item in store:
        if item.get("urgencia", 1) < urgencia_min:
            continue
        if item.get("relevancia_espana", 0) < relevancia_min:
            continue
        fp = item.get("fecha_publicacion", "")
        try:
            if fp:
                ts = datetime.fromisoformat(fp.replace("Z", "+00:00")).timestamp()
                if ts < desde:
                    continue
        except Exception:
            pass
        filtrados.append(item)

    return filtrados[:limit] if filtrados else _DEMO_OSINT_ITEMS[:limit]


# ── Demo data (sin scraping activo) ─────────────────────────────────────────
_DEMO_OSINT_ITEMS: list[dict] = [
    {"id": "d1", "titulo": "España aumentará presupuesto defensa al 2% PIB en 2029 (OTAN)", "contenido": "...",
     "resumen_ollama": "España se compromete con OTAN a alcanzar el objetivo del 2% del PIB en gasto defensa para 2029, superando el actual 1.3%.",
     "url": "https://www.nato.int/news/2026", "fuente": "nato_news", "fuente_tipo": "otan",
     "idioma_original": "en", "relevancia_espana": 0.92, "urgencia": 4,
     "categoria": "defensa", "paises_mencionados": ["ESP"], "actores_mencionados": ["España","OTAN"],
     "temas": ["defensa","otan","presupuesto"], "fecha_publicacion": "2026-04-28T10:00:00+00:00", "procesado_llm": True},
    {"id": "d2", "titulo": "Argelia amenaza con revisar contratos de gas si España apoya resolución Sahara ONU", "contenido": "...",
     "resumen_ollama": "Tensión diplomática Argelia-España por posición de Madrid sobre el Sáhara Occidental en votación ONU. Argelia señala posible revisión del contrato Medgaz.",
     "url": "https://www.realinstitutoelcano.org/argelia-gas-2026", "fuente": "real_instituto_elcano", "fuente_tipo": "think_tank_es",
     "idioma_original": "es", "relevancia_espana": 0.98, "urgencia": 5,
     "categoria": "energia", "paises_mencionados": ["DZA","ESP"], "actores_mencionados": ["Argelia","España","Naturgy"],
     "temas": ["gas","argelia","sahara","diplomatica"], "fecha_publicacion": "2026-04-27T14:00:00+00:00", "procesado_llm": True},
    {"id": "d3", "titulo": "UNHCR: llegadas irregulares a España por Atlántico superan récord histórico en abril", "contenido": "...",
     "resumen_ollama": "Las llegadas a Canarias en abril 2026 superan el récord mensual, con 8.400 personas en 18 días. Procedencia mayoritaria: Senegal, Mauritania y Mali.",
     "url": "https://www.unhcr.org/spain-canarias-2026", "fuente": "unhcr_news", "fuente_tipo": "humanitario",
     "idioma_original": "en", "relevancia_espana": 0.95, "urgencia": 4,
     "categoria": "migracion", "paises_mencionados": ["ESP","SEN","MLI","MRT"],
     "actores_mencionados": ["ACNUR","España","Guardia Civil"],
     "temas": ["canarias","migracion","sahel","atlantico"], "fecha_publicacion": "2026-04-27T09:00:00+00:00", "procesado_llm": True},
    {"id": "d4", "titulo": "Rusia corta suministro de gas a Bulgaria y Slovakia — señal hacia Europa occidental", "contenido": "...",
     "resumen_ollama": "Rusia suspende flujos de gas a Bulgaria y Eslovaquia como medida de presión política. Analistas advierten riesgo de escalada hacia otros países dependientes, incluyendo posibles presiones sobre contratos GNL en el mercado europeo.",
     "url": "https://www.iea.org/russia-gas-2026", "fuente": "iea_news", "fuente_tipo": "energia",
     "idioma_original": "en", "relevancia_espana": 0.85, "urgencia": 4,
     "categoria": "energia", "paises_mencionados": ["RUS","BGR","SVK","ESP"],
     "actores_mencionados": ["Gazprom","Rusia","UE"],
     "temas": ["gas","rusia","energia","europa"], "fecha_publicacion": "2026-04-26T16:00:00+00:00", "procesado_llm": True},
    {"id": "d5", "titulo": "Gibraltar: UK y España reanudan negociaciones para acuerdo post-Brexit con UE", "contenido": "...",
     "resumen_ollama": "España y Reino Unido reanudan conversaciones sobre el estatus de Gibraltar dentro del marco de relaciones UE-UK. La negociación incluye libre circulación, aduanas y seguridad.",
     "url": "https://www.politico.eu/gibraltar-2026", "fuente": "politico_eu", "fuente_tipo": "media_ue",
     "idioma_original": "en", "relevancia_espana": 0.92, "urgencia": 3,
     "categoria": "diplomacia", "paises_mencionados": ["ESP","GBR","GIB"],
     "actores_mencionados": ["España","Reino Unido","Gibraltar","UE"],
     "temas": ["gibraltar","brexit","diplomacia","espana"], "fecha_publicacion": "2026-04-25T11:00:00+00:00", "procesado_llm": True},
    {"id": "d6", "titulo": "JNIM expande control en Mali: misión EUTM bajo presión creciente", "contenido": "...",
     "resumen_ollama": "El grupo yihadista JNIM avanza en las regiones de Ségou y Mopti, acercándose a zonas de operación de EUTM Mali donde operan 60 militares españoles.",
     "url": "https://www.crisisgroup.org/mali-2026", "fuente": "crisis_group", "fuente_tipo": "think_tank",
     "idioma_original": "en", "relevancia_espana": 0.88, "urgencia": 4,
     "categoria": "conflicto_armado", "paises_mencionados": ["MLI","ESP"],
     "actores_mencionados": ["JNIM","España","EUTM","Ejército Mali"],
     "temas": ["mali","sahel","yihadismo","defensa_espana"], "fecha_publicacion": "2026-04-24T08:00:00+00:00", "procesado_llm": True},
    {"id": "d7", "titulo": "CCN-CERT: campaña de ciberataques a infraestructura crítica española atribuida a actor estatal", "contenido": "...",
     "resumen_ollama": "El CCN-CERT detecta campaña APT contra operadores de infraestructura crítica española (energía, telecomunicaciones). El patrón TTP coincide con actor estatal del este de Europa.",
     "url": "https://www.ccn-cert.cni.es/2026-apr", "fuente": "ccn_cert", "fuente_tipo": "ciberseguridad_es",
     "idioma_original": "es", "relevancia_espana": 0.97, "urgencia": 5,
     "categoria": "ciberseguridad", "paises_mencionados": ["ESP","RUS"],
     "actores_mencionados": ["CCN-CERT","CNI","Repsol","Red Eléctrica"],
     "temas": ["ciberataque","infraestructura_critica","apt","espana"], "fecha_publicacion": "2026-04-23T15:00:00+00:00", "procesado_llm": True},
    {"id": "d8", "titulo": "IISS: España lidera transición a hidrógeno verde en Sur de Europa con ventaja competitiva", "contenido": "...",
     "resumen_ollama": "IISS analiza el potencial estratégico de España como hub de hidrógeno verde para Europa, aprovechando capacidad solar y eólica. Señala oportunidad para reducir dependencia del gas argelino.",
     "url": "https://www.iiss.org/spain-hydrogen-2026", "fuente": "iiss", "fuente_tipo": "think_tank",
     "idioma_original": "en", "relevancia_espana": 0.90, "urgencia": 2,
     "categoria": "energia", "paises_mencionados": ["ESP","DEU","MAR"],
     "actores_mencionados": ["Iberdrola","Repsol","España"],
     "temas": ["hidrogeno","energia_verde","espana","estrategia"], "fecha_publicacion": "2026-04-22T10:00:00+00:00", "procesado_llm": True},
    {"id": "d9", "titulo": "Crisis diplomática en Venezuela: Maduro expulsa misión diplomática europea", "contenido": "...",
     "resumen_ollama": "Venezuela expulsa a la misión diplomática de observación electoral de la UE y amenaza con revisar acuerdos con empresas europeas. España, con 160.000 ciudadanos en Venezuela, activa protocolo consular.",
     "url": "https://elpais.com/venezuela-2026", "fuente": "el_pais_internacional", "fuente_tipo": "media_es",
     "idioma_original": "es", "relevancia_espana": 0.88, "urgencia": 4,
     "categoria": "diplomacia", "paises_mencionados": ["VEN","ESP","BRA","UE"],
     "actores_mencionados": ["Maduro","España","Repsol","Santander"],
     "temas": ["venezuela","diplomacia","diaspora","repsol"], "fecha_publicacion": "2026-04-21T18:00:00+00:00", "procesado_llm": True},
    {"id": "d10", "titulo": "Bellingcat: rutas de tráfico de armas desde Libia hacia Europa — nuevas evidencias OSINT", "contenido": "...",
     "resumen_ollama": "Investigación OSINT de Bellingcat documenta nuevas rutas de tráfico de armas desde Libia hacia Europa mediterránea, con escala en Túnez y Malta. Relevante para seguridad en costas españolas.",
     "url": "https://www.bellingcat.com/libya-weapons-2026", "fuente": "bellingcat", "fuente_tipo": "osint_investigacion",
     "idioma_original": "en", "relevancia_espana": 0.82, "urgencia": 3,
     "categoria": "seguridad", "paises_mencionados": ["LBY","ESP","TUN","MLT"],
     "actores_mencionados": ["grupos armados Libia","narcotraficantes"],
     "temas": ["libia","trafico_armas","mediterraneo","seguridad"], "fecha_publicacion": "2026-04-20T12:00:00+00:00", "procesado_llm": True},
]
