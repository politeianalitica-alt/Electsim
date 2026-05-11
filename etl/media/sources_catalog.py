"""
Media Intelligence v2 — catalog of 67 free RSS sources.

Each MediaSource has:
  - id:          canonical identifier (used in DB as fuente_id)
  - nombre:      human-readable name
  - rss_url:     public RSS endpoint (no auth)
  - tier:        nacional / regional / internacional / institucional / especializada
  - ideologia:   izquierda / centroizquierda / centro / centroderecha / derecha /
                 institucional / internacional
  - pais:        ISO2
  - ccaa:        Spanish autonomous community (only for regional sources)
  - tags:        free-form classification tokens
  - fetch_interval_min: how often to poll (default 30)

All RSS endpoints are 100% free, no API keys.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Tier = Literal["nacional", "regional", "internacional", "institucional", "especializada"]
Ideologia = Literal[
    "izquierda", "centroizquierda", "centro",
    "centroderecha", "derecha", "institucional", "internacional",
]


@dataclass(frozen=True)
class MediaSource:
    id: str
    nombre: str
    rss_url: str
    tier: Tier
    ideologia: Ideologia
    pais: str = "ES"
    ccaa: str | None = None
    activa: bool = True
    fetch_interval_min: int = 30
    max_items_per_fetch: int = 25
    tags: tuple[str, ...] = ()


# ── TIER 1: NACIONALES ES ───────────────────────────────────────────────────
NACIONAL_ES: list[MediaSource] = [
    MediaSource("elpais_portada",   "El País",            "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",                              "nacional", "centroizquierda", tags=("referencia","generalista")),
    MediaSource("elpais_espana",    "El País — España",   "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/espana/portada",              "nacional", "centroizquierda", tags=("política",)),
    MediaSource("elpais_economia",  "El País — Economía", "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia/portada",            "nacional", "centroizquierda", tags=("economía",)),
    MediaSource("elmundo_portada",  "El Mundo",           "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",                                          "nacional", "centroderecha",   tags=("referencia","generalista")),
    MediaSource("elmundo_espana",   "El Mundo — España",  "https://e00-elmundo.uecdn.es/elmundo/rss/espana.xml",                                           "nacional", "centroderecha",   tags=("política",)),
    MediaSource("abc_portada",      "ABC",                "https://www.abc.es/rss/feeds/abc_portada.xml",                                                  "nacional", "derecha",         tags=("referencia","generalista")),
    MediaSource("abc_espana",       "ABC — España",       "https://www.abc.es/rss/feeds/abc_espana.xml",                                                   "nacional", "derecha",         tags=("política",)),
    MediaSource("elconfidencial",   "El Confidencial",    "https://rss.elconfidencial.com/espana/",                                                        "nacional", "centro",          tags=("generalista","economía")),
    MediaSource("elconfidencial_eco","El Confidencial — Economía","https://rss.elconfidencial.com/economia/",                                              "nacional", "centro",          tags=("economía",)),
    MediaSource("eldiario",         "elDiario.es",        "https://www.eldiario.es/rss/",                                                                  "nacional", "izquierda",       tags=("generalista","referencia")),
    MediaSource("infolibre",        "infoLibre",          "https://www.infolibre.es/rss",                                                                  "nacional", "izquierda",       tags=("política",)),
    MediaSource("publico",          "Público",            "https://www.publico.es/rss",                                                                    "nacional", "izquierda",       tags=("política",)),
    MediaSource("lavanguardia",     "La Vanguardia",      "https://www.lavanguardia.com/rss/home.xml",                                                     "nacional", "centroderecha",   ccaa="CAT", tags=("referencia","cataluña")),
    MediaSource("larazon",          "La Razón",           "https://www.larazon.es/rss/",                                                                   "nacional", "derecha",         tags=("política",)),
    MediaSource("okdiario",         "OKDiario",           "https://okdiario.com/feed/",                                                                    "nacional", "derecha",         tags=("populista-derecha",)),
    MediaSource("20minutos",        "20minutos",          "https://www.20minutos.es/rss/",                                                                 "nacional", "centro",          tags=("generalista",)),
    MediaSource("elespanol",        "El Español",         "https://www.elespanol.com/rss/",                                                                "nacional", "centroderecha",   tags=("generalista",)),
    MediaSource("cope_portada",     "COPE",               "https://www.cope.es/api/es/rss.xml",                                                            "nacional", "derecha",         tags=("radio","iglesia")),
    MediaSource("ser_portada",      "Cadena SER",         "https://cadenaser.com/feed/",                                                                   "nacional", "centroizquierda", tags=("radio",)),
    MediaSource("onda_cero",        "Onda Cero",          "https://www.ondacero.es/rss/",                                                                  "nacional", "centro",          tags=("radio",)),
    MediaSource("rtve_noticias",    "RTVE Noticias",      "https://www.rtve.es/api/programas/noticias/ultimas/feeds/portada/rss.xml",                      "nacional", "institucional",   tags=("tv_pública",)),
    MediaSource("elperiodico",      "El Periódico",       "https://www.elperiodico.com/es/rss/rss_portada.xml",                                            "nacional", "centroizquierda", ccaa="CAT", tags=("cataluña",)),
    MediaSource("ctxt",             "CTXT",               "https://ctxt.es/rss",                                                                           "nacional", "izquierda",       tags=("análisis",)),
    MediaSource("libertaddigital",  "Libertad Digital",   "https://www.libertaddigital.com/rss/",                                                          "nacional", "derecha",         tags=("política",)),
]

# ── TIER 2: REGIONALES CCAA ─────────────────────────────────────────────────
REGIONAL_ES: list[MediaSource] = [
    # Cataluña
    MediaSource("ara",              "Ara",                "https://www.ara.cat/rss.xml",                              "regional", "centroizquierda", ccaa="CAT", tags=("independentismo",)),
    MediaSource("nacio_digital",    "NacióDigital",       "https://www.naciodigital.cat/rss.xml",                     "regional", "izquierda",       ccaa="CAT", tags=("independentismo",)),
    MediaSource("elmon",            "El Món",             "https://www.elmon.cat/rss.xml",                            "regional", "centroizquierda", ccaa="CAT", tags=("cataluña",)),
    # Galicia
    MediaSource("lavoz_galicia",    "La Voz de Galicia",  "https://www.lavozdegalicia.es/rss/portada.xml",            "regional", "centro",          ccaa="GAL", tags=("galicia",)),
    MediaSource("galiciaconf",      "Galicia Confidencial","https://www.galiciaconfidencial.com/rss.xml",             "regional", "centroizquierda", ccaa="GAL", tags=("galicia",)),
    # País Vasco
    MediaSource("elcorreo",         "El Correo",          "https://www.elcorreo.com/rss/2.0/portada/",                "regional", "centroderecha",   ccaa="PVA", tags=("país_vasco",)),
    MediaSource("deia",             "Deia",               "https://www.deia.eus/rss.xml",                             "regional", "centroizquierda", ccaa="PVA", tags=("nacionalismo_vasco",)),
    MediaSource("naiz",             "Naiz",               "https://www.naiz.eus/eu/actualidad/rss",                   "regional", "izquierda",       ccaa="PVA", tags=("independentismo_vasco",)),
    # Andalucía
    MediaSource("diario_sur",       "Diario Sur",         "https://www.diariosur.es/rss/2.0/portada/",                "regional", "centroderecha",   ccaa="AND", tags=("andalucía",)),
    MediaSource("ideal_granada",    "Ideal",              "https://www.ideal.es/rss/2.0/portada/",                    "regional", "centroderecha",   ccaa="AND", tags=("granada",)),
    # Valencia
    MediaSource("levante_emv",      "Levante-EMV",        "https://www.levante-emv.com/rss/2.0/portada/",             "regional", "centroizquierda", ccaa="VAL", tags=("valencia",)),
    MediaSource("valenciaplaza",    "Valencia Plaza",     "https://valenciaplaza.com/feed/",                          "regional", "centro",          ccaa="VAL", tags=("valencia","economía")),
    # Aragón / Norte
    MediaSource("heraldo_aragon",   "Heraldo de Aragón",  "https://www.heraldo.es/rss/2.0/portada/",                  "regional", "centroderecha",   ccaa="ARA", tags=("aragón",)),
    MediaSource("lanueva_espana",   "La Nueva España",    "https://www.lne.es/rss/2.0/portada/",                      "regional", "centroderecha",   ccaa="AST", tags=("asturias",)),
    MediaSource("diario_navarra",   "Diario de Navarra",  "https://www.diariodenavarra.es/rss.xml",                   "regional", "centroderecha",   ccaa="NAV", tags=("navarra",)),
    MediaSource("eldiario_madrid",  "elDiario.es Madrid", "https://www.eldiario.es/madrid/rss/",                      "regional", "izquierda",       ccaa="MAD", tags=("madrid",)),
]

# ── TIER 3: INTERNACIONALES (no auth) ────────────────────────────────────────
INTERNACIONAL: list[MediaSource] = [
    MediaSource("reuters_world",    "Reuters World",      "https://feeds.reuters.com/reuters/worldNews",              "internacional", "centro",          pais="GB", tags=("referencia","agencia")),
    MediaSource("bbc_world",        "BBC World",          "http://feeds.bbci.co.uk/news/world/rss.xml",               "internacional", "centro",          pais="GB", tags=("referencia","tv_pública")),
    MediaSource("bbc_europe",       "BBC Europe",         "http://feeds.bbci.co.uk/news/world/europe/rss.xml",        "internacional", "centro",          pais="GB", tags=("europa",)),
    MediaSource("aljazeera",        "Al Jazeera",         "https://www.aljazeera.com/xml/rss/all.xml",                "internacional", "centro",          pais="QA", tags=("oriente_medio",)),
    MediaSource("dw_world",         "Deutsche Welle",     "https://rss.dw.com/rdf/rss-en-all",                        "internacional", "centro",          pais="DE", tags=("europa","alemania")),
    MediaSource("lemonde_intl",     "Le Monde",           "https://www.lemonde.fr/rss/une.xml",                       "internacional", "centroizquierda", pais="FR", tags=("europa","francia")),
    MediaSource("spiegel_intl",     "Der Spiegel",        "https://www.spiegel.de/international/index.rss",           "internacional", "centro",          pais="DE", tags=("europa","alemania")),
    MediaSource("guardian_world",   "The Guardian",       "https://www.theguardian.com/world/rss",                    "internacional", "centroizquierda", pais="GB", tags=("referencia",)),
    MediaSource("ft_world",         "Financial Times",    "https://www.ft.com/world?format=rss",                      "internacional", "centro",          pais="GB", tags=("economía","mercados")),
    MediaSource("politico_eu",      "Politico Europe",    "https://www.politico.eu/feed/",                            "internacional", "centro",          pais="EU", tags=("europa","política")),
    MediaSource("euractiv",         "EurActiv",           "https://www.euractiv.com/feed/",                           "internacional", "centro",          pais="EU", tags=("europa","política_ue")),
]

# ── TIER 4: INSTITUCIONALES ──────────────────────────────────────────────────
INSTITUCIONAL: list[MediaSource] = [
    MediaSource("boe_rss",          "BOE",                "https://www.boe.es/rss/boe.php?s=1",                       "institucional", "institucional", fetch_interval_min=120, tags=("legislativo","oficial")),
    MediaSource("boe_sumario",      "BOE Sumario",        "https://www.boe.es/rss/boe.php?s=2",                       "institucional", "institucional", fetch_interval_min=120, tags=("legislativo",)),
    MediaSource("bocg_congreso",    "BOCG Congreso",      "https://www.congreso.es/rss/cgbin/rss_congreso.xml",        "institucional", "institucional", fetch_interval_min=240, tags=("congreso",)),
    MediaSource("mpr_moncloa",      "Moncloa — Noticias", "https://www.lamoncloa.gob.es/rss/default.aspx",            "institucional", "institucional", fetch_interval_min=60,  tags=("gobierno",)),
    MediaSource("europarl_es",      "Europarlamento ES",  "https://www.europarl.europa.eu/rss/doc/top-stories/es.xml","institucional", "institucional", fetch_interval_min=120, tags=("ue",), pais="EU"),
    MediaSource("consejo_ue",       "Consejo UE",         "https://www.consilium.europa.eu/es/press/press-releases/rss/", "institucional", "institucional", fetch_interval_min=120, tags=("ue",), pais="EU"),
    MediaSource("nato_news",        "NATO",               "https://www.nato.int/cps/en/natolive/news.rss",            "institucional", "institucional", fetch_interval_min=180, tags=("defensa","otan"), pais="INT"),
    MediaSource("rsf_press",        "RSF Press Freedom",  "https://rsf.org/en/rss-feed",                              "institucional", "internacional", fetch_interval_min=360, tags=("libertad_prensa",), pais="INT"),
]

# ── TIER 5: ESPECIALIZADAS ──────────────────────────────────────────────────
ESPECIALIZADA: list[MediaSource] = [
    MediaSource("agenda_publica",   "Agenda Pública",     "https://agendapublica.elpais.com/feed/",                   "especializada", "centroizquierda", fetch_interval_min=120, tags=("análisis","académico")),
    MediaSource("elorden_mundial",  "El Orden Mundial",   "https://elordenmundial.com/feed/",                         "especializada", "centro",          fetch_interval_min=180, tags=("geopolítica",)),
    MediaSource("esglobal",         "esglobal",           "https://www.esglobal.org/feed/",                           "especializada", "centro",          fetch_interval_min=180, tags=("geopolítica",)),
    MediaSource("politikon_blog",   "Politikon",          "https://politikon.es/feed/",                               "especializada", "centro",          fetch_interval_min=360, tags=("análisis_político",)),
    MediaSource("cinco_dias",       "Cinco Días",         "https://cincodias.elpais.com/rss/section/empresas/",       "especializada", "centro",          tags=("economía","empresas")),
    MediaSource("expansion",        "Expansión",          "https://www.expansion.com/rss/portada.xml",                "especializada", "centroderecha",   tags=("economía","mercados")),
    MediaSource("infodefensa",      "Infodefensa",        "https://www.infodefensa.com/feed/",                        "especializada", "institucional",   fetch_interval_min=240, tags=("defensa",)),
    MediaSource("atalayar",         "Atalayar",           "https://atalayar.com/content/noticias/rss.xml",            "especializada", "centro",          fetch_interval_min=240, tags=("geopolítica","mediterráneo")),
    MediaSource("ecfr_europe",      "ECFR",               "https://ecfr.eu/feed/",                                    "especializada", "centroizquierda", fetch_interval_min=360, tags=("think_tank","europa"), pais="EU"),
    MediaSource("elpais_internacional","El País Internacional","https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada", "especializada", "centroizquierda", tags=("internacional",)),
]

# ── CATÁLOGO UNIFICADO ─────────────────────────────────────────────────────
ALL_SOURCES: list[MediaSource] = (
    NACIONAL_ES + REGIONAL_ES + INTERNACIONAL + INSTITUCIONAL + ESPECIALIZADA
)
SOURCES_BY_ID: dict[str, MediaSource] = {s.id: s for s in ALL_SOURCES}
SOURCES_BY_TIER: dict[str, list[MediaSource]] = {}
for src in ALL_SOURCES:
    SOURCES_BY_TIER.setdefault(src.tier, []).append(src)

SOURCE_COUNT = len(ALL_SOURCES)
