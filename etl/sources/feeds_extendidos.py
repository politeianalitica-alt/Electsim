"""
Catálogo extendido de feeds RSS y endpoints públicos para ingesta amplia.

Complementa `etl.sources.rss_noticias` y `etl.sources.media_rss` añadiendo
~50 fuentes cubriendo:
  · Prensa nacional generalista + especializada (economía, deportes, cultura)
  · Prensa regional (Catalunya, Euskadi, Galicia, Andalucía, Madrid, Valencia)
  · Prensa nativa digital y newsletter político
  · Fuentes oficiales (BOE, Moncloa, Congreso, Senado, INE, Banco España)
  · Bruselas / Unión Europea (Commission, Parliament, EUR-Lex Spain)
  · Fact-checking (Newtral, Maldita, EFE Verifica, AFP Factual)
  · Think-tanks (Real Instituto Elcano, FAES, Fundación Alternativas)
  · Internacional con foco España (Politico EU, Reuters Spain, FT Spain)

Cada entrada lleva metadatos editoriales para que el GroqBrain pueda razonar
sobre tier, sesgo y especialización antes de ingestar.

Uso:
    from etl.sources.feeds_extendidos import FEEDS_EXTENDIDOS, FEEDS_METADATA
    for nombre, url in FEEDS_EXTENDIDOS.items():
        meta = FEEDS_METADATA[nombre]
        # … fetch + ingest …

NO se ejecuta automáticamente — el pipeline de ingesta decide qué fuentes
priorizar según `priority` y `frequency_hours`.
"""
from __future__ import annotations

from typing import Any


# ─────────────────────────────────────────────────────────────────
# Catálogo principal
# ─────────────────────────────────────────────────────────────────

FEEDS_EXTENDIDOS: dict[str, str] = {
    # Prensa nacional generalista
    "elpais_portada":       "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    "elpais_politica":      "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/politica/portada",
    "elpais_economia":      "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia/portada",
    "elpais_opinion":       "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/opinion/portada",
    "elmundo_portada":      "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
    "elmundo_espana":       "https://e00-elmundo.uecdn.es/elmundo/rss/espana.xml",
    "elmundo_economia":     "https://e00-elmundo.uecdn.es/elmundo/rss/economia.xml",
    "abc_portada":          "https://www.abc.es/rss/feeds/abc_ultima.xml",
    "abc_espana":           "https://www.abc.es/rss/feeds/abc_Espana.xml",
    "lavanguardia_portada": "https://www.lavanguardia.com/rss/home.xml",
    "lavanguardia_politica":"https://www.lavanguardia.com/rss/politica.xml",
    "larazon":              "https://www.larazon.es/rss/portada.xml",
    "europapress":          "https://www.europapress.es/rss/rss.aspx",
    "20minutos":            "https://www.20minutos.es/rss/",

    # Prensa nativa digital
    "eldiario":             "https://www.eldiario.es/rss/",
    "eldiario_politica":    "https://www.eldiario.es/rss/politica/",
    "infolibre":            "https://www.infolibre.es/rss",
    "publico":              "https://www.publico.es/rss/portada/",
    "elconfidencial":       "https://rss.elconfidencial.com/espana/",
    "elconfidencial_economia": "https://rss.elconfidencial.com/economia/",
    "elindependiente":      "https://www.elindependiente.com/feed/",
    "vozpopuli":            "https://www.vozpopuli.com/rss/portada.xml",
    "okdiario":             "https://okdiario.com/rss",
    "elespanol":            "https://www.elespanol.com/rss/",
    "eldebate":             "https://www.eldebate.com/rss/",

    # Prensa especializada económica
    "expansion":            "https://e00-expansion.uecdn.es/rss/portada.xml",
    "cincodias":            "https://feeds.elpais.com/mrss-s/pages/ep/site/cincodias.com/portada",
    "elEconomista":         "https://www.eleconomista.es/rss/rss-portada.php",

    # Prensa regional
    "lavozdegalicia":       "https://www.lavozdegalicia.com/rss/portada.xml",
    "elcorreo_eus":         "https://www.elcorreo.com/rss/atom/portada",
    "elcorreogallego":      "https://www.elcorreogallego.es/rss",
    "diariovasco":          "https://www.diariovasco.com/rss/atom/portada",
    "lavozasturias":        "https://www.lavozdeasturias.es/rss/portada.xml",
    "diariodemallorca":     "https://www.diariodemallorca.es/rss/section/16001/",
    "diariodecadiz":        "https://www.diariodecadiz.es/rss/portada.xml",
    "lasprovincias":        "https://www.lasprovincias.es/rss/atom/portada",
    "levante_emv":          "https://www.levante-emv.com/rss/section/22001",
    "elperiodico":          "https://www.elperiodico.com/es/rss/rss_portada.xml",
    "ara":                  "https://www.ara.cat/rss/index.xml",
    "naiz":                 "https://www.naiz.eus/feed",
    "diariodesevilla":      "https://www.diariodesevilla.es/rss/portada.xml",
    "ideal_granada":        "https://www.ideal.es/rss/atom/portada",
    "elcomercio_asturias":  "https://www.elcomercio.es/rss/atom/portada",

    # Oficiales / públicas
    "moncloa_noticias":     "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/Paginas/index.aspx?rss=true",
    "congreso_agenda":      "https://www.congreso.es/web/guest/agenda?p_p_id=actividadparlamentaria_WAR_actividadparlamentariaportlet&_actividadparlamentaria_WAR_actividadparlamentariaportlet_format=rss",
    "boe_sumario":          "https://boe.es/diario_boe/rss.php?s=A",

    # Internacionales con foco España / UE
    "politico_eu":          "https://www.politico.eu/feed/",
    "euractiv":             "https://www.euractiv.com/feed/",
    "euobserver":           "https://euobserver.com/rss.xml",
    "ec_press_corner":      "https://ec.europa.eu/commission/presscorner/api/rss",

    # Fact-checking
    "newtral":              "https://www.newtral.es/feed/",
    "maldita":              "https://maldita.es/feed/",
    "efe_verifica":         "https://verifica.efe.com/feed/",
    "afp_factual_es":       "https://factual.afp.com/list/all/all/all/all/0/rss",

    # Think-tanks / análisis
    "elcano":               "https://www.realinstitutoelcano.org/feed/",
    "ctxt":                 "https://ctxt.es/rss",
    "agendapublica":        "https://agendapublica.elpais.com/feed",
    "eticaeconomica":       "https://www.fundacionsistema.com/feed/",
}


# ─────────────────────────────────────────────────────────────────
# Metadatos editoriales (consumidos por el brain)
# ─────────────────────────────────────────────────────────────────

# tier:  A oficial, B prensa profesional, C blog/opinión, D anónimo/propaganda
# lean:  -1.0 izq … 0 centro … 1.0 dcha   (estimación editorial, no global)
# focus: ámbito principal
# region: alcance (nacional, comunidad o internacional)

FEEDS_METADATA: dict[str, dict[str, Any]] = {
    # Nacionales
    "elpais_portada":   {"tier": "B", "lean": -0.3, "focus": "general", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "elpais_politica":  {"tier": "B", "lean": -0.3, "focus": "politica", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "elpais_economia":  {"tier": "B", "lean": -0.2, "focus": "economia", "region": "nacional", "priority": 1, "frequency_hours": 2},
    "elpais_opinion":   {"tier": "C", "lean": -0.4, "focus": "opinion", "region": "nacional", "priority": 2, "frequency_hours": 4},
    "elmundo_portada":  {"tier": "B", "lean": 0.3, "focus": "general", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "elmundo_espana":   {"tier": "B", "lean": 0.3, "focus": "politica", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "elmundo_economia": {"tier": "B", "lean": 0.3, "focus": "economia", "region": "nacional", "priority": 1, "frequency_hours": 2},
    "abc_portada":      {"tier": "B", "lean": 0.5, "focus": "general", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "abc_espana":       {"tier": "B", "lean": 0.5, "focus": "politica", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "lavanguardia_portada": {"tier": "B", "lean": -0.05, "focus": "general", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "lavanguardia_politica":{"tier": "B", "lean": -0.05, "focus": "politica", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "larazon":          {"tier": "B", "lean": 0.55, "focus": "general", "region": "nacional", "priority": 2, "frequency_hours": 2},
    "europapress":      {"tier": "A", "lean": 0.0, "focus": "agencia", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "20minutos":        {"tier": "C", "lean": -0.1, "focus": "general", "region": "nacional", "priority": 3, "frequency_hours": 2},

    # Nativos digitales
    "eldiario":         {"tier": "B", "lean": -0.5, "focus": "general", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "eldiario_politica":{"tier": "B", "lean": -0.5, "focus": "politica", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "infolibre":        {"tier": "B", "lean": -0.4, "focus": "investigacion", "region": "nacional", "priority": 2, "frequency_hours": 3},
    "publico":          {"tier": "C", "lean": -0.6, "focus": "general", "region": "nacional", "priority": 3, "frequency_hours": 2},
    "elconfidencial":   {"tier": "B", "lean": 0.1, "focus": "investigacion", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "elconfidencial_economia":{"tier":"B","lean":0.15,"focus":"economia","region":"nacional","priority":1,"frequency_hours":2},
    "elindependiente":  {"tier": "C", "lean": 0.2, "focus": "general", "region": "nacional", "priority": 2, "frequency_hours": 3},
    "vozpopuli":        {"tier": "C", "lean": 0.3, "focus": "general", "region": "nacional", "priority": 3, "frequency_hours": 4},
    "okdiario":         {"tier": "C", "lean": 0.7, "focus": "general", "region": "nacional", "priority": 3, "frequency_hours": 4},
    "elespanol":        {"tier": "B", "lean": 0.25, "focus": "general", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "eldebate":         {"tier": "C", "lean": 0.6, "focus": "general", "region": "nacional", "priority": 3, "frequency_hours": 4},

    # Económicas
    "expansion":        {"tier": "B", "lean": 0.3, "focus": "economia", "region": "nacional", "priority": 1, "frequency_hours": 2},
    "cincodias":        {"tier": "B", "lean": -0.1, "focus": "economia", "region": "nacional", "priority": 1, "frequency_hours": 2},
    "elEconomista":     {"tier": "B", "lean": 0.2, "focus": "economia", "region": "nacional", "priority": 1, "frequency_hours": 2},

    # Regional
    "lavozdegalicia":   {"tier": "B", "lean": 0.05, "focus": "general", "region": "galicia", "priority": 2, "frequency_hours": 2},
    "elcorreo_eus":     {"tier": "B", "lean": 0.0, "focus": "general", "region": "euskadi", "priority": 2, "frequency_hours": 2},
    "elcorreogallego":  {"tier": "B", "lean": 0.0, "focus": "general", "region": "galicia", "priority": 2, "frequency_hours": 3},
    "diariovasco":      {"tier": "B", "lean": 0.0, "focus": "general", "region": "euskadi", "priority": 2, "frequency_hours": 3},
    "lavozasturias":    {"tier": "B", "lean": 0.0, "focus": "general", "region": "asturias", "priority": 3, "frequency_hours": 4},
    "diariodemallorca": {"tier": "B", "lean": 0.0, "focus": "general", "region": "baleares", "priority": 3, "frequency_hours": 4},
    "diariodecadiz":    {"tier": "B", "lean": 0.0, "focus": "general", "region": "andalucia", "priority": 3, "frequency_hours": 4},
    "lasprovincias":    {"tier": "B", "lean": 0.1, "focus": "general", "region": "valencia", "priority": 2, "frequency_hours": 3},
    "levante_emv":      {"tier": "B", "lean": -0.15, "focus": "general", "region": "valencia", "priority": 2, "frequency_hours": 3},
    "elperiodico":      {"tier": "B", "lean": -0.2, "focus": "general", "region": "catalunya", "priority": 2, "frequency_hours": 2},
    "ara":              {"tier": "B", "lean": -0.15, "focus": "general", "region": "catalunya", "priority": 2, "frequency_hours": 2},
    "naiz":             {"tier": "C", "lean": -0.5, "focus": "general", "region": "euskadi", "priority": 3, "frequency_hours": 4},
    "diariodesevilla":  {"tier": "B", "lean": 0.05, "focus": "general", "region": "andalucia", "priority": 3, "frequency_hours": 4},
    "ideal_granada":    {"tier": "B", "lean": 0.05, "focus": "general", "region": "andalucia", "priority": 3, "frequency_hours": 4},
    "elcomercio_asturias":{"tier":"B","lean":0.0,"focus":"general","region":"asturias","priority":3,"frequency_hours":4},

    # Oficiales
    "moncloa_noticias": {"tier": "A", "lean": 0.0, "focus": "oficial_gobierno", "region": "nacional", "priority": 1, "frequency_hours": 1},
    "congreso_agenda":  {"tier": "A", "lean": 0.0, "focus": "oficial_congreso", "region": "nacional", "priority": 1, "frequency_hours": 2},
    "boe_sumario":      {"tier": "A", "lean": 0.0, "focus": "oficial_boe", "region": "nacional", "priority": 1, "frequency_hours": 4},

    # UE / internacional
    "politico_eu":      {"tier": "B", "lean": 0.0, "focus": "ue", "region": "internacional", "priority": 1, "frequency_hours": 2},
    "euractiv":         {"tier": "B", "lean": 0.0, "focus": "ue", "region": "internacional", "priority": 2, "frequency_hours": 3},
    "euobserver":       {"tier": "B", "lean": 0.0, "focus": "ue", "region": "internacional", "priority": 2, "frequency_hours": 4},
    "ec_press_corner":  {"tier": "A", "lean": 0.0, "focus": "oficial_ue", "region": "internacional", "priority": 1, "frequency_hours": 2},

    # Fact-checking
    "newtral":          {"tier": "A", "lean": -0.05, "focus": "factcheck", "region": "nacional", "priority": 1, "frequency_hours": 2},
    "maldita":          {"tier": "A", "lean": -0.05, "focus": "factcheck", "region": "nacional", "priority": 1, "frequency_hours": 2},
    "efe_verifica":     {"tier": "A", "lean": 0.0, "focus": "factcheck", "region": "nacional", "priority": 1, "frequency_hours": 2},
    "afp_factual_es":   {"tier": "A", "lean": 0.0, "focus": "factcheck", "region": "internacional", "priority": 1, "frequency_hours": 3},

    # Think-tanks
    "elcano":           {"tier": "A", "lean": 0.0, "focus": "thinktank", "region": "nacional", "priority": 2, "frequency_hours": 6},
    "ctxt":             {"tier": "C", "lean": -0.7, "focus": "analisis", "region": "nacional", "priority": 3, "frequency_hours": 8},
    "agendapublica":    {"tier": "C", "lean": -0.2, "focus": "analisis", "region": "nacional", "priority": 3, "frequency_hours": 8},
    "eticaeconomica":   {"tier": "C", "lean": -0.3, "focus": "analisis", "region": "nacional", "priority": 3, "frequency_hours": 12},
}


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def list_feeds_by_focus(focus: str) -> list[tuple[str, str]]:
    """Lista (nombre, url) de feeds con un focus dado."""
    return [
        (name, FEEDS_EXTENDIDOS[name])
        for name, meta in FEEDS_METADATA.items()
        if meta.get("focus") == focus and name in FEEDS_EXTENDIDOS
    ]


def list_feeds_by_region(region: str) -> list[tuple[str, str]]:
    """Lista (nombre, url) de feeds con una region dada."""
    return [
        (name, FEEDS_EXTENDIDOS[name])
        for name, meta in FEEDS_METADATA.items()
        if meta.get("region") == region and name in FEEDS_EXTENDIDOS
    ]


def list_feeds_by_priority(max_priority: int = 1) -> list[tuple[str, str]]:
    """Lista (nombre, url) de feeds con priority ≤ valor dado."""
    return [
        (name, FEEDS_EXTENDIDOS[name])
        for name, meta in FEEDS_METADATA.items()
        if int(meta.get("priority", 99)) <= int(max_priority) and name in FEEDS_EXTENDIDOS
    ]


def get_all_known_source_names() -> set[str]:
    """Set de fuentes conocidas (útil para SmartIngestionPipeline.known_sources)."""
    return set(FEEDS_EXTENDIDOS.keys())
