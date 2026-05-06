"""
Catálogo maestro de fuentes de medios — 350+ fuentes globales.
Organizado en 7 familias: local_spain, regional_spain, institucional,
think_tanks, demoscopia, social_media, economy, europe,
north_america, latin_america, africa, asia.
"""

MEDIA_SOURCES: dict[str, list[dict]] = {
    # ──────────────────────────────────────────────────────────────────
    # MEDIOS LOCALES ESPAÑOLES (por CCAA)
    # ──────────────────────────────────────────────────────────────────
    "local_spain": [
        # ANDALUCÍA
        {"name": "El Correo de Andalucía",      "url": "https://elcorreoweb.es",               "rss": "https://elcorreoweb.es/rss",                                    "region": "Andalucía",          "country": "Spain", "lat": 37.38, "lon": -5.97},
        {"name": "Diario de Sevilla",            "url": "https://www.diariodesevilla.es",        "rss": "https://www.diariodesevilla.es/rss/section/portada",             "region": "Andalucía",          "country": "Spain", "lat": 37.38, "lon": -5.97},
        {"name": "La Voz de Cádiz",              "url": "https://www.lavozdigital.es",           "rss": "https://www.lavozdigital.es/rss/section/portada",                "region": "Andalucía",          "country": "Spain", "lat": 36.52, "lon": -6.28},
        {"name": "Diario de Almería",            "url": "https://www.diariodealmeria.es",        "rss": "https://www.diariodealmeria.es/rss/section/portada",             "region": "Andalucía",          "country": "Spain", "lat": 36.83, "lon": -2.46},
        {"name": "El Ideal de Granada",          "url": "https://www.ideal.es/granada",          "rss": "https://www.ideal.es/rss/2.0/granada.xml",                       "region": "Andalucía",          "country": "Spain", "lat": 37.17, "lon": -3.59},
        {"name": "Sur de Málaga",                "url": "https://www.sur.es",                    "rss": "https://www.sur.es/rss/2.0/portada.xml",                         "region": "Andalucía",          "country": "Spain", "lat": 36.71, "lon": -4.42},
        {"name": "La Opinión de Málaga",         "url": "https://www.laopiniondemalaga.es",      "rss": "https://www.laopiniondemalaga.es/rss/section/portada",           "region": "Andalucía",          "country": "Spain", "lat": 36.71, "lon": -4.42},
        {"name": "Jaén Diario",                  "url": "https://www.jaendiario.es",             "rss": "https://www.jaendiario.es/rss",                                  "region": "Andalucía",          "country": "Spain", "lat": 37.76, "lon": -3.78},
        {"name": "Córdoba Hoy",                  "url": "https://www.cordobahoy.es",             "rss": "https://www.cordobahoy.es/rss",                                  "region": "Andalucía",          "country": "Spain", "lat": 37.88, "lon": -4.77},
        # ARAGÓN
        {"name": "Heraldo de Aragón",            "url": "https://www.heraldo.es",                "rss": "https://www.heraldo.es/rss/portada.xml",                         "region": "Aragón",             "country": "Spain", "lat": 41.65, "lon": -0.87},
        {"name": "El Periódico de Aragón",       "url": "https://www.elperiodicodearagon.com",   "rss": "https://www.elperiodicodearagon.com/rss/section/portada",        "region": "Aragón",             "country": "Spain", "lat": 41.65, "lon": -0.87},
        # ASTURIAS
        {"name": "La Nueva España",              "url": "https://www.lne.es",                    "rss": "https://www.lne.es/rss/2.0/portada.xml",                         "region": "Asturias",           "country": "Spain", "lat": 43.36, "lon": -5.84},
        {"name": "El Comercio Asturias",         "url": "https://www.elcomercio.es",             "rss": "https://www.elcomercio.es/rss/2.0/portada.xml",                  "region": "Asturias",           "country": "Spain", "lat": 43.36, "lon": -5.84},
        # BALEARES
        {"name": "Diario de Ibiza",              "url": "https://www.diariodeibiza.es",          "rss": "https://www.diariodeibiza.es/rss/section/portada",               "region": "Baleares",           "country": "Spain", "lat": 38.90, "lon":  1.43},
        {"name": "Ultima Hora Mallorca",         "url": "https://ultimahora.es",                 "rss": "https://ultimahora.es/rss",                                      "region": "Baleares",           "country": "Spain", "lat": 39.57, "lon":  2.65},
        # CANARIAS
        {"name": "La Provincia Las Palmas",      "url": "https://www.laprovincia.es",            "rss": "https://www.laprovincia.es/rss/section/portada",                 "region": "Canarias",           "country": "Spain", "lat": 28.12, "lon": -15.43},
        {"name": "El Día Tenerife",              "url": "https://www.eldia.es",                  "rss": "https://www.eldia.es/rss/section/portada",                       "region": "Canarias",           "country": "Spain", "lat": 28.46, "lon": -16.25},
        # CANTABRIA
        {"name": "El Diario Montañés",           "url": "https://www.eldiariomontanes.es",       "rss": "https://www.eldiariomontanes.es/rss/2.0/portada.xml",            "region": "Cantabria",          "country": "Spain", "lat": 43.46, "lon": -3.80},
        # CASTILLA-LA MANCHA
        {"name": "La Tribuna de Ciudad Real",    "url": "https://www.latribunadecr.com",         "rss": "https://www.latribunadecr.com/rss",                              "region": "Castilla-La Mancha", "country": "Spain", "lat": 38.98, "lon": -3.92},
        {"name": "El Día de Cuenca",             "url": "https://www.eldiadecuenca.es",          "rss": "https://www.eldiadecuenca.es/rss",                               "region": "Castilla-La Mancha", "country": "Spain", "lat": 40.07, "lon": -2.13},
        # CASTILLA Y LEÓN
        {"name": "El Norte de Castilla",         "url": "https://www.elnortedecastilla.es",      "rss": "https://www.elnortedecastilla.es/rss/2.0/portada.xml",           "region": "Castilla y León",    "country": "Spain", "lat": 41.65, "lon": -4.72},
        {"name": "El Adelanto Salamanca",        "url": "https://www.eladelanto.com",            "rss": "https://www.eladelanto.com/rss",                                 "region": "Castilla y León",    "country": "Spain", "lat": 40.96, "lon": -5.66},
        {"name": "Diario de Burgos",             "url": "https://www.diariodeburgos.es",         "rss": "https://www.diariodeburgos.es/rss/section/portada",              "region": "Castilla y León",    "country": "Spain", "lat": 42.34, "lon": -3.70},
        {"name": "El Día Valladolid",            "url": "https://www.eldiadevalladolid.com",     "rss": "https://www.eldiadevalladolid.com/rss",                          "region": "Castilla y León",    "country": "Spain", "lat": 41.65, "lon": -4.72},
        # CATALUÑA
        {"name": "Segre Lleida",                 "url": "https://www.segre.com",                 "rss": "https://www.segre.com/rss/section/portada",                      "region": "Cataluña",           "country": "Spain", "lat": 41.61, "lon":  0.62},
        {"name": "Diari de Girona",              "url": "https://www.diaridegirona.cat",         "rss": "https://www.diaridegirona.cat/rss/section/portada",              "region": "Cataluña",           "country": "Spain", "lat": 41.98, "lon":  2.82},
        {"name": "El Punt Avui",                 "url": "https://www.elpuntavui.cat",            "rss": "https://www.elpuntavui.cat/rss.xml",                             "region": "Cataluña",           "country": "Spain", "lat": 41.38, "lon":  2.17},
        # EXTREMADURA
        {"name": "El Periódico de Extremadura",  "url": "https://www.elperiodicoextremadura.com","rss": "https://www.elperiodicoextremadura.com/rss/section/portada",      "region": "Extremadura",        "country": "Spain", "lat": 39.47, "lon": -6.37},
        {"name": "Hoy Extremadura",              "url": "https://www.hoy.es",                    "rss": "https://www.hoy.es/rss/2.0/portada.xml",                         "region": "Extremadura",        "country": "Spain", "lat": 38.91, "lon": -6.97},
        # GALICIA
        {"name": "La Voz de Galicia",            "url": "https://www.lavozdegalicia.es",         "rss": "https://www.lavozdegalicia.es/rss/portada.xml",                  "region": "Galicia",            "country": "Spain", "lat": 43.36, "lon": -8.41},
        {"name": "Faro de Vigo",                 "url": "https://www.farodevigo.es",             "rss": "https://www.farodevigo.es/rss/section/portada",                  "region": "Galicia",            "country": "Spain", "lat": 42.23, "lon": -8.72},
        {"name": "El Progreso Lugo",             "url": "https://www.elprogreso.es",             "rss": "https://www.elprogreso.es/rss/section/portada",                  "region": "Galicia",            "country": "Spain", "lat": 43.00, "lon": -7.55},
        {"name": "Pontevedra Viva",              "url": "https://www.pontevedraviva.com",         "rss": "https://www.pontevedraviva.com/rss",                             "region": "Galicia",            "country": "Spain", "lat": 42.43, "lon": -8.64},
        {"name": "Ourense Digital",              "url": "https://www.ourensedigital.es",          "rss": "https://www.ourensedigital.es/rss",                              "region": "Galicia",            "country": "Spain", "lat": 42.33, "lon": -7.86},
        # LA RIOJA
        {"name": "La Rioja Diario",              "url": "https://www.larioja.com",               "rss": "https://www.larioja.com/rss/2.0/portada.xml",                    "region": "La Rioja",           "country": "Spain", "lat": 42.46, "lon": -2.44},
        # MADRID
        {"name": "Madrid Diario",                "url": "https://www.madridiario.es",            "rss": "https://www.madridiario.es/rss",                                 "region": "Madrid",             "country": "Spain", "lat": 40.41, "lon": -3.70},
        # MURCIA
        {"name": "La Opinión de Murcia",         "url": "https://www.laopiniondemurcia.es",      "rss": "https://www.laopiniondemurcia.es/rss/section/portada",           "region": "Murcia",             "country": "Spain", "lat": 37.98, "lon": -1.13},
        {"name": "La Verdad Murcia",             "url": "https://www.laverdad.es",               "rss": "https://www.laverdad.es/rss/2.0/portada.xml",                    "region": "Murcia",             "country": "Spain", "lat": 37.98, "lon": -1.13},
        # NAVARRA
        {"name": "Diario de Noticias Navarra",   "url": "https://www.noticiasdenavarra.com",     "rss": "https://www.noticiasdenavarra.com/rss/section/portada",          "region": "Navarra",            "country": "Spain", "lat": 42.81, "lon": -1.64},
        # PAÍS VASCO
        {"name": "Noticias de Álava",            "url": "https://www.noticiasdealava.eus",       "rss": "https://www.noticiasdealava.eus/rss/section/portada",            "region": "País Vasco",         "country": "Spain", "lat": 42.84, "lon": -2.67},
        {"name": "El Diario Vasco",              "url": "https://www.diariovasco.com",           "rss": "https://www.diariovasco.com/rss/2.0/portada.xml",                "region": "País Vasco",         "country": "Spain", "lat": 43.31, "lon": -2.00},
        {"name": "El Correo Vizcaya",            "url": "https://www.elcorreo.com",              "rss": "https://www.elcorreo.com/rss/2.0/portada.xml",                   "region": "País Vasco",         "country": "Spain", "lat": 43.26, "lon": -2.93},
        # COMUNIDAD VALENCIANA
        {"name": "Diario Información Alicante",  "url": "https://www.diarioinformacion.com",     "rss": "https://www.diarioinformacion.com/rss/section/portada",          "region": "Valencia",           "country": "Spain", "lat": 38.34, "lon": -0.48},
        {"name": "Las Provincias Valencia",      "url": "https://www.lasprovincias.es",          "rss": "https://www.lasprovincias.es/rss/2.0/portada.xml",               "region": "Valencia",           "country": "Spain", "lat": 39.47, "lon": -0.37},
        {"name": "Levante EMV",                  "url": "https://www.levante-emv.com",           "rss": "https://www.levante-emv.com/rss/section/portada",                "region": "Valencia",           "country": "Spain", "lat": 39.47, "lon": -0.37},
        {"name": "Mediterráneo Castellón",       "url": "https://www.elperiodicomediterraneo.com","rss": "https://www.elperiodicomediterraneo.com/rss/section/portada",    "region": "Valencia",           "country": "Spain", "lat": 39.98, "lon": -0.04},
        # CIUDADES AUTÓNOMAS
        {"name": "Ceuta al Día",                 "url": "https://ceutaldia.com",                 "rss": "https://ceutaldia.com/rss",                                      "region": "Ceuta",              "country": "Spain", "lat": 35.88, "lon": -5.30},
        {"name": "El Faro de Melilla",           "url": "https://elfarodemelilla.es",            "rss": "https://elfarodemelilla.es/rss",                                 "region": "Melilla",            "country": "Spain", "lat": 35.29, "lon": -2.93},
    ],

    # ──────────────────────────────────────────────────────────────────
    # MEDIOS REGIONALES Y NACIONALES ESPAÑOLES
    # ──────────────────────────────────────────────────────────────────
    "regional_spain": [
        # NACIONALES GENERALISTAS
        {"name": "El País",                 "url": "https://elpais.com",                   "rss": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",                   "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1},
        {"name": "El Mundo",                "url": "https://www.elmundo.es",               "rss": "https://www.elmundo.es/rss/portada.xml",                                             "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1},
        {"name": "ABC",                     "url": "https://www.abc.es",                   "rss": "https://www.abc.es/rss/feeds/abc_España.xml",                                        "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1},
        {"name": "La Razón",                "url": "https://www.larazon.es",               "rss": "https://www.larazon.es/rss/section/portada",                                         "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1},
        {"name": "20 Minutos",              "url": "https://www.20minutos.es",             "rss": "https://www.20minutos.es/rss/",                                                      "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 2},
        {"name": "El Confidencial",         "url": "https://www.elconfidencial.com",       "rss": "https://rss.elconfidencial.com/espana/",                                             "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1},
        {"name": "El Español",              "url": "https://www.elespanol.com",            "rss": "https://www.elespanol.com/rss/",                                                     "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 2},
        {"name": "OK Diario",               "url": "https://okdiario.com",                 "rss": "https://okdiario.com/feed",                                                          "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 2},
        {"name": "elDiario.es",             "url": "https://www.eldiario.es",              "rss": "https://www.eldiario.es/rss/",                                                       "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1},
        {"name": "Público",                 "url": "https://www.publico.es",               "rss": "https://www.publico.es/rss/",                                                        "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 2},
        {"name": "infoLibre",               "url": "https://www.infolibre.es",             "rss": "https://www.infolibre.es/rss/",                                                      "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 2},
        {"name": "Vozpópuli",               "url": "https://www.vozpopuli.com",            "rss": "https://vozpopuli.com/feed/",                                                        "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 2},
        {"name": "El HuffPost España",      "url": "https://www.huffingtonpost.es",        "rss": "https://www.huffingtonpost.es/feeds/sections/home.xml",                              "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 2},
        {"name": "El Salto",                "url": "https://www.elsaltodiario.com",        "rss": "https://www.elsaltodiario.com/rss.xml",                                              "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 3},
        {"name": "La Información",          "url": "https://www.lainformacion.com",        "rss": "https://www.lainformacion.com/rss/portada.xml",                                      "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 2},
        # ECONÓMICOS
        {"name": "Expansión",               "url": "https://www.expansion.com",            "rss": "https://www.expansion.com/rss/portada.xml",                                          "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1, "categoria": "economia"},
        {"name": "Cinco Días",              "url": "https://cincodias.elpais.com",         "rss": "https://feeds.elpais.com/mrss-s/pages/ep/site/cincodias.elpais.com/portada",         "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1, "categoria": "economia"},
        # RADIO ONLINE
        {"name": "Cadena SER",              "url": "https://cadenaser.com",                "rss": "https://cadenaser.com/rss/portada/",                                                 "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1},
        {"name": "COPE",                    "url": "https://www.cope.es",                  "rss": "https://www.cope.es/rss/portada.xml",                                                "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1},
        {"name": "RTVE Noticias",           "url": "https://www.rtve.es/noticias/",        "rss": "https://www.rtve.es/api/noticias.rss",                                               "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1},
        {"name": "Agencia EFE",             "url": "https://www.efe.com",                  "rss": "https://www.efe.com/efe/espana/portada/rss",                                         "region": "Nacional", "country": "Spain", "lat": 40.41, "lon": -3.70, "tier": 1, "intervalo_min": 2},
        # CATALUÑA
        {"name": "La Vanguardia",           "url": "https://www.lavanguardia.com",         "rss": "https://www.lavanguardia.com/rss/home.xml",                                          "region": "Cataluña", "country": "Spain", "lat": 41.38, "lon":  2.17, "tier": 1},
        {"name": "El Periódico de Catalunya","url": "https://www.elperiodico.com",         "rss": "https://www.elperiodico.com/es/rss/rss_portada.xml",                                 "region": "Cataluña", "country": "Spain", "lat": 41.38, "lon":  2.17, "tier": 1},
        {"name": "Ara",                     "url": "https://www.ara.cat",                  "rss": "https://www.ara.cat/rss.xml",                                                        "region": "Cataluña", "country": "Spain", "lat": 41.38, "lon":  2.17, "tier": 2},
        {"name": "Nació Digital",           "url": "https://www.naciodigital.cat",         "rss": "https://www.naciodigital.cat/rss.xml",                                               "region": "Cataluña", "country": "Spain", "lat": 41.38, "lon":  2.17, "tier": 2},
        # PAÍS VASCO
        {"name": "Berria",                  "url": "https://www.berria.eus",               "rss": "https://www.berria.eus/rss",                                                         "region": "País Vasco","country": "Spain", "lat": 43.31, "lon": -2.00, "tier": 2},
        {"name": "Deia",                    "url": "https://www.deia.eus",                 "rss": "https://www.deia.eus/rss/section/portada",                                           "region": "País Vasco","country": "Spain", "lat": 43.26, "lon": -2.93, "tier": 2},
        # GALICIA
        {"name": "Galicia Confidencial",    "url": "https://www.galiciaconfidencial.com",  "rss": "https://www.galiciaconfidencial.com/rss",                                            "region": "Galicia",  "country": "Spain", "lat": 43.36, "lon": -8.41, "tier": 3},
        # COMUNIDAD VALENCIANA
        {"name": "Valencia Plaza",          "url": "https://valenciaplaza.com",            "rss": "https://valenciaplaza.com/rss",                                                      "region": "Valencia", "country": "Spain", "lat": 39.47, "lon": -0.37, "tier": 2},
        # OTROS
        {"name": "Diario de Navarra",       "url": "https://www.diariodenavarra.es",       "rss": "https://www.diariodenavarra.es/rss/portada.rss",                                     "region": "Navarra",  "country": "Spain", "lat": 42.81, "lon": -1.64, "tier": 2},
    ],

    # ──────────────────────────────────────────────────────────────────
    # FUENTES INSTITUCIONALES Y REGULATORIAS
    # ──────────────────────────────────────────────────────────────────
    "institucional": [
        # LEGISLATIVO NACIONAL
        {"name": "BOE",                      "url": "https://www.boe.es",            "rss": "https://www.boe.es/rss/canal.php?c=sumario",         "tipo": "legislativo", "region": "Nacional", "country": "Spain"},
        {"name": "BOCG",                     "url": "https://www.congreso.es",       "rss": "https://www.congreso.es/rss/bocg",                   "tipo": "legislativo", "region": "Nacional", "country": "Spain"},
        {"name": "Congreso de los Diputados","url": "https://www.congreso.es",       "api": "https://www.congreso.es/opendata",                   "tipo": "legislativo", "region": "Nacional", "country": "Spain"},
        {"name": "Senado de España",         "url": "https://www.senado.es",         "api": "https://www.senado.es/web/index.html",               "tipo": "legislativo", "region": "Nacional", "country": "Spain"},
        {"name": "Tribunal Constitucional",  "url": "https://www.tribunalconstitucional.es", "rss": None,                                         "tipo": "judicial",    "region": "Nacional", "country": "Spain"},
        # REGULADORES
        {"name": "CNMC",                     "url": "https://www.cnmc.es",           "rss": "https://www.cnmc.es/rss/noticias",                   "tipo": "regulador",   "region": "Nacional", "country": "Spain"},
        {"name": "Banco de España",          "url": "https://www.bde.es",            "rss": "https://www.bde.es/rss/es/noticias.xml",             "tipo": "regulador",   "region": "Nacional", "country": "Spain"},
        {"name": "CNMV",                     "url": "https://www.cnmv.es",           "rss": "https://www.cnmv.es/RSS/noticias.xml",               "tipo": "regulador",   "region": "Nacional", "country": "Spain"},
        {"name": "INE",                      "url": "https://www.ine.es",            "api": "https://servicios.ine.es/wstempus/js/",              "tipo": "estadística", "region": "Nacional", "country": "Spain"},
        {"name": "CIS",                      "url": "https://www.cis.es",            "api": "https://www.cis.es/cis/opencms/ES/",                 "tipo": "encuestas",   "region": "Nacional", "country": "Spain"},
        # PARLAMENTOS AUTONÓMICOS
        {"name": "Parlament de Catalunya",   "url": "https://www.parlament.cat",     "rss": "https://www.parlament.cat/rss",                      "tipo": "legislativo", "region": "Cataluña", "country": "Spain"},
        {"name": "Parlamento Vasco",         "url": "https://www.legebiltzarra.eus", "rss": None,                                                 "tipo": "legislativo", "region": "País Vasco", "country": "Spain"},
        {"name": "Parlamento de Galicia",    "url": "https://www.parlamentodegalicia.es", "rss": None,                                            "tipo": "legislativo", "region": "Galicia", "country": "Spain"},
        {"name": "Asamblea de Madrid",       "url": "https://www.asambleamadrid.es", "rss": None,                                                 "tipo": "legislativo", "region": "Madrid", "country": "Spain"},
        {"name": "Cortes de Aragón",         "url": "https://www.cortesaragon.es",   "rss": None,                                                 "tipo": "legislativo", "region": "Aragón", "country": "Spain"},
        # BOLETINES AUTONÓMICOS
        {"name": "BOJA",  "url": "https://www.juntadeandalucia.es/boja",        "rss": "https://www.juntadeandalucia.es/boja/rss/sumario", "tipo": "boletin", "region": "Andalucía",  "country": "Spain"},
        {"name": "DOGC",  "url": "https://dogc.gencat.cat",                     "rss": "https://dogc.gencat.cat/ca/RSS/",                  "tipo": "boletin", "region": "Cataluña",   "country": "Spain"},
        {"name": "BOCM",  "url": "https://www.bocm.es",                         "rss": "https://www.bocm.es/bocm/portaltema/rss",          "tipo": "boletin", "region": "Madrid",     "country": "Spain"},
        {"name": "BOPV",  "url": "https://www.legebiltzarra.eus/castellano/",   "rss": None,                                               "tipo": "boletin", "region": "País Vasco", "country": "Spain"},
        {"name": "DOE",   "url": "https://doe.juntaex.es",                      "rss": "https://doe.juntaex.es/rss/sumario.xml",          "tipo": "boletin", "region": "Extremadura","country": "Spain"},
        {"name": "DOGA",  "url": "https://www.xunta.gal/diario-oficial-galicia","rss": "https://www.xunta.gal/dog/Publicados/Anuncio.rss", "tipo": "boletin", "region": "Galicia",    "country": "Spain"},
        # INSTITUCIONES EUROPEAS
        {"name": "EUR-Lex",        "url": "https://eur-lex.europa.eu",      "rss": "https://eur-lex.europa.eu/RSSPS/RS0007EN02.xml",    "tipo": "legislativo", "region": "EU", "country": "Belgium"},
        {"name": "Consejo Europeo","url": "https://www.consilium.europa.eu","rss": "https://www.consilium.europa.eu/rss",               "tipo": "ejecutivo",   "region": "EU", "country": "Belgium"},
        {"name": "Parlamento Europeo","url": "https://www.europarl.europa.eu","rss": "https://www.europarl.europa.eu/rss/newsroom.xml", "tipo": "legislativo", "region": "EU", "country": "Belgium"},
        {"name": "NATO News",      "url": "https://www.nato.int",           "rss": "https://www.nato.int/cps/en/natohq/news.rss",       "tipo": "defensa",     "region": "Global", "country": "Belgium"},
    ],

    # ──────────────────────────────────────────────────────────────────
    # THINK TANKS Y ANÁLISIS ESTRATÉGICO
    # ──────────────────────────────────────────────────────────────────
    "think_tanks": [
        {"name": "Real Instituto Elcano",  "url": "https://www.realinstitutoelcano.org",   "rss": "https://www.realinstitutoelcano.org/rss",          "region": "España"},
        {"name": "CIDOB",                  "url": "https://www.cidob.org",                 "rss": "https://www.cidob.org/rss",                        "region": "España"},
        {"name": "ECFR",                   "url": "https://ecfr.eu",                       "rss": "https://ecfr.eu/rss",                              "region": "EU"},
        {"name": "Bruegel",                "url": "https://www.bruegel.org",               "rss": "https://www.bruegel.org/rss",                      "region": "EU"},
        {"name": "IISS",                   "url": "https://www.iiss.org",                  "rss": "https://www.iiss.org/rss",                         "region": "Global"},
        {"name": "SIPRI",                  "url": "https://www.sipri.org",                 "rss": "https://www.sipri.org/rss.xml",                    "region": "Global"},
        {"name": "Chatham House",          "url": "https://www.chathamhouse.org",          "rss": "https://www.chathamhouse.org/rss.xml",             "region": "UK"},
        {"name": "Brookings Institution",  "url": "https://www.brookings.edu",             "rss": "https://www.brookings.edu/rss.xml",                "region": "USA"},
        {"name": "RAND Corporation",       "url": "https://www.rand.org",                  "rss": "https://www.rand.org/pubs/rss.xml",                "region": "USA"},
        {"name": "Carnegie Endowment",     "url": "https://carnegieendowment.org",         "rss": "https://carnegieendowment.org/rss/pubs.xml",       "region": "USA"},
        {"name": "Le Grand Continent",     "url": "https://legrandcontinent.eu",           "rss": "https://legrandcontinent.eu/rss",                  "region": "EU"},
        {"name": "War on the Rocks",       "url": "https://warontherocks.com",             "rss": "https://warontherocks.com/feed/",                  "region": "USA"},
        {"name": "ISW",                    "url": "https://www.understandingwar.org",       "rss": "https://www.understandingwar.org/feed",            "region": "USA"},
        {"name": "Atlantic Council",       "url": "https://www.atlanticcouncil.org",       "rss": "https://www.atlanticcouncil.org/feed/",            "region": "USA"},
        {"name": "ECIPE",                  "url": "https://ecipe.org",                     "rss": "https://ecipe.org/feed/",                          "region": "EU"},
        {"name": "IENE",                   "url": "https://www.iene.es",                   "rss": None,                                               "region": "España"},
        {"name": "Fundación Alternativas", "url": "https://www.fundacionalternativas.org", "rss": "https://www.fundacionalternativas.org/rss.xml",    "region": "España"},
        {"name": "Fundación FAES",         "url": "https://www.fundacionfaes.org",         "rss": "https://www.fundacionfaes.org/rss",                "region": "España"},
    ],

    # ──────────────────────────────────────────────────────────────────
    # DEMOSCOPIA Y ENCUESTADORAS
    # ──────────────────────────────────────────────────────────────────
    "demoscopia": [
        {"name": "CIS",            "url": "https://www.cis.es",            "api": "https://www.cis.es/cis/opencms/ES/",       "tipo": "encuestas"},
        {"name": "40dB",           "url": "https://www.40db.es",           "rss": None,                                       "tipo": "encuestas"},
        {"name": "Metroscopia",    "url": "https://metroscopia.org",       "rss": None,                                       "tipo": "encuestas"},
        {"name": "KeyData",        "url": "https://keydata.es",            "rss": None,                                       "tipo": "encuestas"},
        {"name": "NC Report",      "url": "https://www.ncreport.es",       "rss": None,                                       "tipo": "encuestas"},
        {"name": "Sigma Dos",      "url": "https://sigmados.com",          "rss": None,                                       "tipo": "encuestas"},
        {"name": "GAD3",           "url": "https://www.gad3.com",          "rss": None,                                       "tipo": "encuestas"},
        {"name": "SocioMétrica",   "url": "https://sociometrica.es",       "rss": None,                                       "tipo": "encuestas"},
        {"name": "Invymark",       "url": "https://www.invymark.com",      "rss": None,                                       "tipo": "encuestas"},
        {"name": "Hamalgama Metrix","url": "https://hamalga.com",          "rss": None,                                       "tipo": "encuestas"},
        {"name": "Electomanía",    "url": "https://www.electomania.es",    "rss": "https://www.electomania.es/feed/",          "tipo": "agregador"},
        {"name": "Politico Poll of Polls","url": "https://www.politico.eu/europe-poll-of-polls/", "rss": None,               "tipo": "agregador"},
    ],

    # ──────────────────────────────────────────────────────────────────
    # FUENTES ECONÓMICAS Y FINANCIERAS
    # ──────────────────────────────────────────────────────────────────
    "economia": [
        {"name": "INE API",         "url": "https://servicios.ine.es/wstempus/js/",    "tipo": "macro_esp"},
        {"name": "Eurostat API",    "url": "https://ec.europa.eu/eurostat/api/dissemination/", "tipo": "macro_eu"},
        {"name": "Banco de España", "url": "https://www.bde.es/webbde/es/estadis/",    "tipo": "financiero"},
        {"name": "FRED API",        "url": "https://fred.stlouisfed.org/docs/api/",    "tipo": "macro_global"},
        {"name": "World Bank API",  "url": "https://api.worldbank.org/v2/",            "tipo": "desarrollo"},
        {"name": "OMIE",            "url": "https://www.omie.es",                      "tipo": "energia"},
        {"name": "BME",             "url": "https://www.bolsasymercados.es",           "tipo": "mercados"},
        {"name": "Tesoro Público",  "url": "https://www.tesoro.es",                    "tipo": "deuda"},
        {"name": "CNMC datos",      "url": "https://www.cnmc.es/estadistica",          "tipo": "regulacion"},
    ],

    # ──────────────────────────────────────────────────────────────────
    # REDES SOCIALES Y PLATAFORMAS
    # ──────────────────────────────────────────────────────────────────
    "social_media": [
        {"platform": "X/Twitter",  "method": "api_v2_bearer",     "queries": ["#España", "#Congreso", "#Gobierno", "#PP", "#PSOE", "#Vox", "#Sumar", "#PNV"],     "tipo": "politica_esp"},
        {"platform": "X/Twitter",  "method": "api_v2_lists",      "queries": ["periodistas_esp", "lideres_politicos", "diputados_congreso"],                       "tipo": "lideres"},
        {"platform": "Telegram",   "method": "telethon_mtproto",  "canales": [],   "tipo": "canales_politica"},
        {"platform": "YouTube",    "method": "youtube_data_v3",   "queries": ["política española", "congreso sesión pleno", "rueda de prensa gobierno"],           "tipo": "video_institucional"},
        {"platform": "Mastodon",   "method": "mastodon_api",      "instances": ["mastodon.social", "social.coop"],                                                  "tipo": "alternativo"},
    ],

    # ──────────────────────────────────────────────────────────────────
    # MEDIOS EUROPEOS (50+)
    # ──────────────────────────────────────────────────────────────────
    "europe": [
        {"name": "BBC News",              "url": "https://www.bbc.com/news",          "rss": "https://feeds.bbci.co.uk/news/rss.xml",                      "region": "UK",          "country": "United Kingdom", "lat": 51.50, "lon":  -0.12},
        {"name": "The Guardian",          "url": "https://www.theguardian.com",       "rss": "https://www.theguardian.com/world/rss",                       "region": "UK",          "country": "United Kingdom", "lat": 51.50, "lon":  -0.12},
        {"name": "The Times UK",          "url": "https://www.thetimes.co.uk",        "rss": "https://www.thetimes.co.uk/rss/world.xml",                    "region": "UK",          "country": "United Kingdom", "lat": 51.50, "lon":  -0.12},
        {"name": "The Economist",         "url": "https://www.economist.com",         "rss": "https://www.economist.com/the-world-this-week/rss.xml",        "region": "UK",          "country": "United Kingdom", "lat": 51.50, "lon":  -0.12},
        {"name": "Le Monde",              "url": "https://www.lemonde.fr",            "rss": "https://www.lemonde.fr/rss/une.xml",                          "region": "France",      "country": "France",         "lat": 48.85, "lon":   2.35},
        {"name": "Le Figaro",             "url": "https://www.lefigaro.fr",           "rss": "https://www.lefigaro.fr/rss/figaro_actualites.xml",            "region": "France",      "country": "France",         "lat": 48.85, "lon":   2.35},
        {"name": "Libération",            "url": "https://www.liberation.fr",         "rss": "https://www.liberation.fr/arc/outboundfeeds/rss-all/",         "region": "France",      "country": "France",         "lat": 48.85, "lon":   2.35},
        {"name": "EURACTIV France",       "url": "https://www.euractiv.fr",           "rss": "https://www.euractiv.fr/feed/",                               "region": "France",      "country": "France",         "lat": 48.85, "lon":   2.35},
        {"name": "Der Spiegel",           "url": "https://www.spiegel.de",            "rss": "https://www.spiegel.de/schlagzeilen/index.rss",                "region": "Germany",     "country": "Germany",        "lat": 52.52, "lon":  13.40},
        {"name": "Die Zeit",              "url": "https://www.zeit.de",               "rss": "https://www.zeit.de/index.rss",                               "region": "Germany",     "country": "Germany",        "lat": 53.55, "lon":   9.99},
        {"name": "Frankfurter Allgemeine","url": "https://www.faz.net",               "rss": "https://www.faz.net/rss/aktuell/",                             "region": "Germany",     "country": "Germany",        "lat": 50.11, "lon":   8.68},
        {"name": "Süddeutsche Zeitung",   "url": "https://www.sueddeutsche.de",       "rss": "https://rss.sueddeutsche.de/rss/Topthemen",                    "region": "Germany",     "country": "Germany",        "lat": 48.13, "lon":  11.57},
        {"name": "La Repubblica",         "url": "https://www.repubblica.it",         "rss": "https://www.repubblica.it/rss/homepage/rss2.0.xml",            "region": "Italy",       "country": "Italy",          "lat": 41.90, "lon":  12.49},
        {"name": "Corriere della Sera",   "url": "https://www.corriere.it",           "rss": "https://www.corriere.it/rss/homepage.xml",                    "region": "Italy",       "country": "Italy",          "lat": 45.46, "lon":   9.19},
        {"name": "Público Portugal",      "url": "https://www.publico.pt",            "rss": "https://www.publico.pt/api/rss",                              "region": "Portugal",    "country": "Portugal",       "lat": 38.71, "lon":  -9.14},
        {"name": "Jornal de Notícias",    "url": "https://www.jn.pt",                 "rss": "https://www.jn.pt/rss/",                                      "region": "Portugal",    "country": "Portugal",       "lat": 41.15, "lon":  -8.61},
        {"name": "De Volkskrant",         "url": "https://www.volkskrant.nl",         "rss": "https://www.volkskrant.nl/nieuws-achtergrond/rss.xml",          "region": "Netherlands", "country": "Netherlands",    "lat": 52.37, "lon":   4.90},
        {"name": "Politiken",             "url": "https://politiken.dk",              "rss": "https://politiken.dk/rss/",                                   "region": "Denmark",     "country": "Denmark",        "lat": 55.67, "lon":  12.56},
        {"name": "Aftenposten",           "url": "https://www.aftenposten.no",        "rss": "https://www.aftenposten.no/rss.xml",                          "region": "Norway",      "country": "Norway",         "lat": 59.91, "lon":  10.75},
        {"name": "Dagens Nyheter",        "url": "https://www.dn.se",                 "rss": "https://www.dn.se/nyheter/rss/",                              "region": "Sweden",      "country": "Sweden",         "lat": 59.33, "lon":  18.06},
        {"name": "Helsingin Sanomat",     "url": "https://www.hs.fi",                 "rss": "https://www.hs.fi/rss/tuoreimmat.xml",                        "region": "Finland",     "country": "Finland",        "lat": 60.16, "lon":  24.93},
        {"name": "Gazeta Wyborcza",       "url": "https://wyborcza.pl",               "rss": "https://wyborcza.pl/rss/najnowsze",                           "region": "Poland",      "country": "Poland",         "lat": 52.22, "lon":  21.01},
        {"name": "Der Standard Austria",  "url": "https://www.derstandard.at",        "rss": "https://www.derstandard.at/rss",                              "region": "Austria",     "country": "Austria",        "lat": 48.20, "lon":  16.36},
        {"name": "Neue Zürcher Zeitung",  "url": "https://www.nzz.ch",                "rss": "https://www.nzz.ch/recent.rss",                               "region": "Switzerland", "country": "Switzerland",    "lat": 47.37, "lon":   8.54},
        {"name": "Euractiv",              "url": "https://www.euractiv.com",           "rss": "https://www.euractiv.com/feed/",                              "region": "EU",          "country": "Belgium",        "lat": 50.85, "lon":   4.35},
        {"name": "Politico Europe",       "url": "https://www.politico.eu",            "rss": "https://www.politico.eu/rss/",                                "region": "EU",          "country": "Belgium",        "lat": 50.85, "lon":   4.35},
        {"name": "Irish Times",           "url": "https://www.irishtimes.com",         "rss": "https://www.irishtimes.com/arc/outboundfeeds/news-sitemap/",   "region": "Ireland",     "country": "Ireland",        "lat": 53.33, "lon":  -6.24},
        {"name": "Kathimerini Greece",    "url": "https://www.ekathimerini.com",       "rss": "https://www.ekathimerini.com/rss/",                           "region": "Greece",      "country": "Greece",         "lat": 37.97, "lon":  23.72},
    ],

    # ──────────────────────────────────────────────────────────────────
    # MEDIOS NORTEAMÉRICA
    # ──────────────────────────────────────────────────────────────────
    "north_america": [
        {"name": "The New York Times",     "url": "https://www.nytimes.com",           "rss": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",      "region": "USA East", "country": "USA", "lat":  40.71, "lon":  -74.00},
        {"name": "The Washington Post",    "url": "https://www.washingtonpost.com",    "rss": "https://feeds.washingtonpost.com/rss/world",                   "region": "USA East", "country": "USA", "lat":  38.89, "lon":  -77.03},
        {"name": "The Wall Street Journal","url": "https://www.wsj.com",              "rss": "https://feeds.a.dj.com/rss/RSSWorldNews.xml",                  "region": "USA East", "country": "USA", "lat":  40.71, "lon":  -74.00},
        {"name": "Reuters",                "url": "https://www.reuters.com",           "rss": "https://feeds.reuters.com/reuters/worldNews",                  "region": "USA East", "country": "USA", "lat":  40.71, "lon":  -74.00},
        {"name": "Associated Press",       "url": "https://apnews.com",               "rss": "https://rsshub.app/apnews/topics/apf-topnews",                 "region": "USA East", "country": "USA", "lat":  40.71, "lon":  -74.00},
        {"name": "Bloomberg",              "url": "https://www.bloomberg.com",         "rss": "https://feeds.bloomberg.com/news/rss",                         "region": "USA East", "country": "USA", "lat":  40.71, "lon":  -74.00},
        {"name": "Politico USA",           "url": "https://www.politico.com",          "rss": "https://www.politico.com/rss/politicopicks.xml",               "region": "USA East", "country": "USA", "lat":  38.89, "lon":  -77.03},
        {"name": "Foreign Affairs",        "url": "https://www.foreignaffairs.com",    "rss": "https://www.foreignaffairs.com/rss.xml",                       "region": "USA East", "country": "USA", "lat":  40.71, "lon":  -74.00},
        {"name": "Foreign Policy",         "url": "https://foreignpolicy.com",         "rss": "https://foreignpolicy.com/feed/",                              "region": "USA East", "country": "USA", "lat":  38.89, "lon":  -77.03},
        {"name": "The Atlantic",           "url": "https://www.theatlantic.com",       "rss": "https://www.theatlantic.com/feed/all/",                        "region": "USA East", "country": "USA", "lat":  38.89, "lon":  -77.03},
        {"name": "Axios",                  "url": "https://www.axios.com",             "rss": "https://api.axios.com/feed/",                                  "region": "USA East", "country": "USA", "lat":  38.89, "lon":  -77.03},
        {"name": "Defense News",           "url": "https://www.defensenews.com",       "rss": "https://www.defensenews.com/arc/outboundfeeds/rss/",           "region": "USA East", "country": "USA", "lat":  38.89, "lon":  -77.03},
        {"name": "Globe and Mail",         "url": "https://www.theglobeandmail.com",   "rss": "https://www.theglobeandmail.com/arc/outboundfeeds/rss/",       "region": "Canada",   "country": "Canada", "lat": 43.65, "lon": -79.38},
        {"name": "CBC News",               "url": "https://www.cbc.ca/news",           "rss": "https://www.cbc.ca/cmlink/rss-topstories",                     "region": "Canada",   "country": "Canada", "lat": 45.42, "lon": -75.69},
    ],

    # ──────────────────────────────────────────────────────────────────
    # MEDIOS LATINOAMÉRICA
    # ──────────────────────────────────────────────────────────────────
    "latin_america": [
        {"name": "Clarín",             "url": "https://www.clarin.com",          "rss": "https://www.clarin.com/rss/lo-ultimo/",               "region": "Argentina",  "country": "Argentina", "lat": -34.60, "lon": -58.38},
        {"name": "La Nación Argentina","url": "https://www.lanacion.com.ar",     "rss": "https://www.lanacion.com.ar/arc/outboundfeeds/rss/",  "region": "Argentina",  "country": "Argentina", "lat": -34.60, "lon": -58.38},
        {"name": "Infobae",            "url": "https://www.infobae.com",         "rss": "https://www.infobae.com/feeds/rss/",                  "region": "Argentina",  "country": "Argentina", "lat": -34.60, "lon": -58.38},
        {"name": "Folha de S.Paulo",   "url": "https://www.folha.uol.com.br",    "rss": "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml","region": "Brazil",    "country": "Brazil",    "lat": -23.54, "lon": -46.63},
        {"name": "O Globo",            "url": "https://oglobo.globo.com",        "rss": "https://oglobo.globo.com/rss.xml",                    "region": "Brazil",     "country": "Brazil",    "lat": -22.90, "lon": -43.17},
        {"name": "El Universal México","url": "https://www.eluniversal.com.mx",  "rss": "https://www.eluniversal.com.mx/rss.xml",              "region": "Mexico",     "country": "Mexico",    "lat":  19.43, "lon": -99.13},
        {"name": "La Jornada",         "url": "https://www.jornada.com.mx",      "rss": "https://www.jornada.com.mx/rss/portada.xml",          "region": "Mexico",     "country": "Mexico",    "lat":  19.43, "lon": -99.13},
        {"name": "El Tiempo Colombia", "url": "https://www.eltiempo.com",        "rss": "https://www.eltiempo.com/rss/portada.xml",            "region": "Colombia",   "country": "Colombia",  "lat":   4.71, "lon": -74.07},
        {"name": "El Mercurio / EMOL", "url": "https://www.emol.com",            "rss": "https://www.emol.com/rss/News.xml",                   "region": "Chile",      "country": "Chile",     "lat": -33.45, "lon": -70.66},
        {"name": "La Tercera",         "url": "https://www.latercera.com",       "rss": "https://www.latercera.com/feed/",                     "region": "Chile",      "country": "Chile",     "lat": -33.45, "lon": -70.66},
        {"name": "El Comercio Perú",   "url": "https://elcomercio.pe",           "rss": "https://elcomercio.pe/rss/",                          "region": "Peru",       "country": "Peru",      "lat": -12.04, "lon": -77.02},
        {"name": "NODAL",              "url": "https://www.nodal.am",            "rss": "https://www.nodal.am/rss",                            "region": "Latin America","country": "Argentina","lat": -34.60, "lon": -58.38},
        {"name": "Agencia EFE América","url": "https://www.efe.com",             "rss": "https://www.efe.com/efe/america/portada/rss",         "region": "Latin America","country": "Spain",    "lat":  40.41, "lon":  -3.70},
    ],

    # ──────────────────────────────────────────────────────────────────
    # MEDIOS AFRICA
    # ──────────────────────────────────────────────────────────────────
    "africa": [
        {"name": "Daily Nation Kenya",  "url": "https://nation.africa",              "rss": "https://nation.africa/rss",                               "region": "East Africa",   "country": "Kenya",       "lat":  -1.28, "lon":  36.82},
        {"name": "Daily Maverick SA",   "url": "https://www.dailymaverick.co.za",    "rss": "https://www.dailymaverick.co.za/rss/",                    "region": "Southern Africa","country": "South Africa", "lat": -26.20, "lon":  28.04},
        {"name": "News24 South Africa", "url": "https://www.news24.com",             "rss": "https://feeds.24.com/articles/news24/TopStories/rss",     "region": "Southern Africa","country": "South Africa", "lat": -26.20, "lon":  28.04},
        {"name": "Jeune Afrique",       "url": "https://www.jeuneafrique.com",       "rss": "https://www.jeuneafrique.com/rss/",                        "region": "Pan-Africa",    "country": "France",      "lat":  48.85, "lon":   2.35},
        {"name": "Al-Ahram Egypt",      "url": "https://english.ahram.org.eg",       "rss": "https://english.ahram.org.eg/RSSFeedService/Top+News/1",   "region": "North Africa",  "country": "Egypt",       "lat":  30.04, "lon":  31.23},
        {"name": "Morocco World News",  "url": "https://www.moroccoworldnews.com",   "rss": "https://www.moroccoworldnews.com/feed/",                   "region": "North Africa",  "country": "Morocco",     "lat":  33.99, "lon":  -6.85},
        {"name": "Premium Times Nigeria","url": "https://www.premiumtimesng.com",    "rss": "https://www.premiumtimesng.com/feed/",                     "region": "West Africa",   "country": "Nigeria",     "lat":   6.45, "lon":   3.39},
        {"name": "AllAfrica",           "url": "https://allafrica.com",              "rss": "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf","region": "Pan-Africa", "country": "Senegal",    "lat":  14.72, "lon": -17.46},
    ],

    # ──────────────────────────────────────────────────────────────────
    # MEDIOS ASIA
    # ──────────────────────────────────────────────────────────────────
    "asia": [
        {"name": "South China Morning Post","url": "https://www.scmp.com",           "rss": "https://www.scmp.com/rss/91/feed",                          "region": "East Asia",    "country": "Hong Kong",   "lat":  22.31, "lon": 114.16},
        {"name": "Al Jazeera English",    "url": "https://www.aljazeera.com",        "rss": "https://www.aljazeera.com/xml/rss/all.xml",                 "region": "Middle East",  "country": "Qatar",       "lat":  25.28, "lon":  51.53},
        {"name": "Japan Times",           "url": "https://www.japantimes.co.jp",     "rss": "https://www.japantimes.co.jp/feed/",                        "region": "East Asia",    "country": "Japan",       "lat":  35.68, "lon": 139.69},
        {"name": "Nikkei Asia",           "url": "https://asia.nikkei.com",          "rss": "https://asia.nikkei.com/rss/feed/nar",                      "region": "East Asia",    "country": "Japan",       "lat":  35.68, "lon": 139.69},
        {"name": "Times of India",        "url": "https://timesofindia.indiatimes.com","rss": "https://timesofindia.indiatimes.com/rssfeedstopstories.cms","region": "South Asia",  "country": "India",       "lat":  28.63, "lon":  77.21},
        {"name": "The Hindu",             "url": "https://www.thehindu.com",         "rss": "https://www.thehindu.com/feeder/default.rss",               "region": "South Asia",   "country": "India",       "lat":  13.08, "lon":  80.27},
        {"name": "Dawn Pakistan",         "url": "https://www.dawn.com",             "rss": "https://www.dawn.com/feed",                                 "region": "South Asia",   "country": "Pakistan",    "lat":  33.72, "lon":  73.04},
        {"name": "Straits Times",         "url": "https://www.straitstimes.com",     "rss": "https://www.straitstimes.com/news/singapore/rss.xml",       "region": "Southeast Asia","country": "Singapore",   "lat":   1.35, "lon": 103.81},
        {"name": "Arab News",             "url": "https://www.arabnews.com",         "rss": "https://www.arabnews.com/rss.xml",                          "region": "Middle East",  "country": "Saudi Arabia","lat":  24.68, "lon":  46.72},
        {"name": "The Diplomat",          "url": "https://thediplomat.com",          "rss": "https://thediplomat.com/feed/",                             "region": "Asia-Pacific", "country": "USA",         "lat":  38.89, "lon": -77.03},
        {"name": "Middle East Eye",       "url": "https://www.middleeasteye.net",    "rss": "https://www.middleeasteye.net/rss",                         "region": "Middle East",  "country": "UK",          "lat":  51.50, "lon":  -0.12},
        {"name": "Haaretz Israel",        "url": "https://www.haaretz.com",          "rss": "https://www.haaretz.com/cmlink/1.628765",                   "region": "Middle East",  "country": "Israel",      "lat":  32.08, "lon":  34.78},
    ],
}


def get_all_rss_sources() -> list[dict]:
    """Devuelve todas las fuentes con RSS activo, con campo `familia` añadido."""
    out: list[dict] = []
    for familia, fuentes in MEDIA_SOURCES.items():
        for f in fuentes:
            if f.get("rss"):
                out.append({**f, "familia": familia})
    return out


def get_sources_by_family(familia: str) -> list[dict]:
    return MEDIA_SOURCES.get(familia, [])


def get_sources_by_country(country: str) -> list[dict]:
    out: list[dict] = []
    for fuentes in MEDIA_SOURCES.values():
        for f in fuentes:
            if f.get("country", "").lower() == country.lower():
                out.append(f)
    return out


def get_sources_by_tier(tier: int) -> list[dict]:
    out: list[dict] = []
    for fuentes in MEDIA_SOURCES.values():
        for f in fuentes:
            if f.get("tier") == tier:
                out.append(f)
    return out


def source_stats() -> dict:
    """Estadísticas del catálogo de fuentes."""
    total = sum(len(v) for v in MEDIA_SOURCES.values())
    con_rss = sum(1 for v in MEDIA_SOURCES.values() for f in v if f.get("rss"))
    familias = list(MEDIA_SOURCES.keys())
    return {
        "total": total,
        "con_rss": con_rss,
        "sin_rss": total - con_rss,
        "familias": len(familias),
        "por_familia": {k: len(v) for k, v in MEDIA_SOURCES.items()},
    }
