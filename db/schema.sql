-- ElectSim España — DDL completo (PostgreSQL 16 + TimescaleDB)
-- Ejecutar en init de contenedor o vía psql.

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- =============================================================================
-- MÓDULO 1: GEOGRAFÍA Y CIRCUNSCRIPCIONES
-- =============================================================================

CREATE TABLE comunidades_autonomas (
    id              SERIAL PRIMARY KEY,
    codigo_ine      CHAR(2) UNIQUE NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    capital         VARCHAR(100),
    superficie_km2  NUMERIC(10,2),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE provincias (
    id              SERIAL PRIMARY KEY,
    codigo_ine      CHAR(2) UNIQUE NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    capital         VARCHAR(100),
    superficie_km2  NUMERIC(10,2),
    escanos_congreso INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE municipios (
    id              SERIAL PRIMARY KEY,
    codigo_ine      CHAR(5) UNIQUE NOT NULL,
    nombre          VARCHAR(150) NOT NULL,
    provincia_id    INTEGER REFERENCES provincias(id),
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    poblacion       INTEGER,
    superficie_km2  NUMERIC(10,2),
    altitud_media   INTEGER,
    tipo_municipio  VARCHAR(50),
    nuts3_code      VARCHAR(10),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE secciones_censales (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(10) UNIQUE NOT NULL,
    municipio_id    INTEGER REFERENCES municipios(id),
    poblacion       INTEGER,
    renta_media     NUMERIC(10,2),
    geometry        TEXT
);

-- =============================================================================
-- MÓDULO 2: RESULTADOS ELECTORALES
-- =============================================================================

CREATE TYPE tipo_eleccion AS ENUM (
    'generales', 'autonomicas', 'municipales',
    'europeas', 'referendum'
);

CREATE TABLE elecciones (
    id              SERIAL PRIMARY KEY,
    tipo            tipo_eleccion NOT NULL,
    fecha           DATE NOT NULL,
    vuelta          SMALLINT DEFAULT 1,
    ambito          VARCHAR(100),
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    descripcion     TEXT,
    censo_total     INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE partidos (
    id              SERIAL PRIMARY KEY,
    siglas          VARCHAR(30) UNIQUE NOT NULL,
    nombre_completo VARCHAR(200) NOT NULL,
    ideologia       VARCHAR(50),
    eje_izda_dcha   NUMERIC(3,1),
    eje_libertario_autoritario NUMERIC(3,1),
    fundacion_año   INTEGER,
    activo          BOOLEAN DEFAULT TRUE,
    ambito          VARCHAR(50),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE relaciones_partidos (
    id              SERIAL PRIMARY KEY,
    partido_origen  INTEGER REFERENCES partidos(id),
    partido_destino INTEGER REFERENCES partidos(id),
    tipo_relacion   VARCHAR(50),
    fecha_inicio    DATE,
    fecha_fin       DATE,
    descripcion     TEXT
);

CREATE TABLE resultados_electorales (
    id              SERIAL PRIMARY KEY,
    eleccion_id     INTEGER REFERENCES elecciones(id),
    partido_id      INTEGER REFERENCES partidos(id),
    provincia_id    INTEGER REFERENCES provincias(id),
    municipio_id    INTEGER REFERENCES municipios(id),
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    votos           INTEGER NOT NULL DEFAULT 0,
    porcentaje      NUMERIC(6,3),
    escanos         INTEGER DEFAULT 0,
    votos_validos   INTEGER,
    censo           INTEGER,
    participacion   NUMERIC(6,3),
    votos_blancos   INTEGER DEFAULT 0,
    votos_nulos     INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(eleccion_id, partido_id, provincia_id)
);

CREATE TABLE resultados_seccion_censal (
    id              SERIAL PRIMARY KEY,
    eleccion_id     INTEGER REFERENCES elecciones(id),
    seccion_id      INTEGER REFERENCES secciones_censales(id),
    partido_id      INTEGER REFERENCES partidos(id),
    votos           INTEGER NOT NULL DEFAULT 0,
    censo           INTEGER,
    participacion   NUMERIC(6,3)
);

-- =============================================================================
-- MÓDULO 3: ENCUESTAS Y MICRODATOS
-- =============================================================================

CREATE TABLE fuentes_encuesta (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    tipo            VARCHAR(20),
    pais            CHAR(3) DEFAULT 'ESP',
    web             VARCHAR(200),
    descripcion     TEXT
);

CREATE TABLE encuestas (
    id              SERIAL PRIMARY KEY,
    fuente_id       INTEGER REFERENCES fuentes_encuesta(id),
    numero_estudio  VARCHAR(50),
    titulo          TEXT NOT NULL,
    tipo_encuesta   VARCHAR(50),
    fecha_inicio    DATE,
    fecha_fin       DATE,
    fecha_publicacion DATE,
    n_entrevistas   INTEGER,
    metodologia     VARCHAR(100),
    ambito_geografico VARCHAR(100),
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    error_muestral  NUMERIC(5,3),
    nivel_confianza NUMERIC(5,3),
    url_microdatos  TEXT,
    url_cuestionario TEXT,
    disponible_microdatos BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE preguntas_encuesta (
    id              SERIAL PRIMARY KEY,
    encuesta_id     INTEGER REFERENCES encuestas(id),
    codigo_pregunta VARCHAR(20),
    texto_pregunta  TEXT NOT NULL,
    tipo_respuesta  VARCHAR(30),
    escala_min      INTEGER,
    escala_max      INTEGER,
    categoria_tematica VARCHAR(100),
    variable_cis    VARCHAR(50)
);

CREATE TABLE microdatos_encuesta (
    id              BIGSERIAL PRIMARY KEY,
    encuesta_id     INTEGER REFERENCES encuestas(id),
    id_respondente  VARCHAR(20),
    sexo            CHAR(1),
    edad            SMALLINT,
    grupo_edad      VARCHAR(20),
    estudios        VARCHAR(50),
    ocupacion       VARCHAR(80),
    situacion_laboral VARCHAR(50),
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    tamano_habitat  VARCHAR(50),
    religion        VARCHAR(50),
    clase_social_subjetiva VARCHAR(30),
    ingresos_hogar  VARCHAR(50),
    recuerdo_voto_anterior VARCHAR(30),
    intencion_voto  VARCHAR(30),
    intencion_voto_cocina VARCHAR(30),
    escala_ideologica NUMERIC(4,1),
    valoracion_gobierno NUMERIC(4,1),
    valoracion_oposicion NUMERIC(4,1),
    satisfaccion_democracia VARCHAR(30),
    principal_problema VARCHAR(200),
    situacion_economica_personal VARCHAR(30),
    situacion_economica_españa VARCHAR(30),
    identidad_territorial VARCHAR(50),
    peso_muestral   NUMERIC(8,4),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE respuestas_encuesta (
    id              BIGSERIAL PRIMARY KEY,
    microdato_id    BIGINT REFERENCES microdatos_encuesta(id),
    pregunta_id     INTEGER REFERENCES preguntas_encuesta(id),
    valor_numerico  NUMERIC(10,3),
    valor_texto     TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resultados_agregados_encuesta (
    id              SERIAL PRIMARY KEY,
    encuesta_id     INTEGER REFERENCES encuestas(id),
    pregunta_id     INTEGER REFERENCES preguntas_encuesta(id),
    categoria       VARCHAR(100),
    frecuencia_abs  INTEGER,
    porcentaje      NUMERIC(6,3),
    margen_error    NUMERIC(5,3),
    subgrupo        VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- MÓDULO 4: DEMOGRAFÍA Y SOCIAL (INE)
-- =============================================================================

CREATE TABLE demografia_municipal (
    id              SERIAL PRIMARY KEY,
    municipio_id    INTEGER REFERENCES municipios(id),
    año             SMALLINT NOT NULL,
    poblacion_total INTEGER,
    poblacion_hombres INTEGER,
    poblacion_mujeres INTEGER,
    poblacion_extranjera INTEGER,
    porcentaje_extranjero NUMERIC(5,2),
    p_0_14          NUMERIC(5,2),
    p_15_64         NUMERIC(5,2),
    p_65_mas        NUMERIC(5,2),
    edad_media      NUMERIC(5,2),
    indice_envejecimiento NUMERIC(7,2),
    nacimientos     INTEGER,
    defunciones     INTEGER,
    crecimiento_vegetativo INTEGER,
    saldo_migratorio INTEGER,
    num_hogares     INTEGER,
    tamaño_medio_hogar NUMERIC(4,2),
    p_sin_estudios  NUMERIC(5,2),
    p_estudios_primarios NUMERIC(5,2),
    p_estudios_secundarios NUMERIC(5,2),
    p_fp            NUMERIC(5,2),
    p_universitarios NUMERIC(5,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(municipio_id, año)
);

CREATE TABLE mercado_laboral_provincial (
    id              SERIAL PRIMARY KEY,
    provincia_id    INTEGER REFERENCES provincias(id),
    año             SMALLINT NOT NULL,
    trimestre       SMALLINT,
    poblacion_activa INTEGER,
    ocupados        INTEGER,
    parados         INTEGER,
    tasa_actividad  NUMERIC(5,2),
    tasa_paro       NUMERIC(5,2),
    tasa_empleo     NUMERIC(5,2),
    tasa_paro_hombres NUMERIC(5,2),
    tasa_paro_mujeres NUMERIC(5,2),
    tasa_paro_jovenes NUMERIC(5,2),
    tasa_paro_larga_duracion NUMERIC(5,2),
    parados_registrados INTEGER,
    contratos_registrados INTEGER,
    contratos_indefinidos INTEGER,
    contratos_temporales INTEGER,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(provincia_id, año, trimestre)
);

CREATE TABLE renta_municipal (
    id              SERIAL PRIMARY KEY,
    municipio_id    INTEGER REFERENCES municipios(id),
    año             SMALLINT NOT NULL,
    renta_bruta_media        NUMERIC(10,2),
    renta_neta_media         NUMERIC(10,2),
    renta_bruta_mediana      NUMERIC(10,2),
    renta_neta_mediana       NUMERIC(10,2),
    fuente_de_datos_renta    NUMERIC(10,2),
    fuente_capital_renta     NUMERIC(10,2),
    fuente_pension_renta     NUMERIC(10,2),
    fuente_prestaciones      NUMERIC(10,2),
    gini_municipal           NUMERIC(5,4),
    p80_p20_ratio            NUMERIC(5,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(municipio_id, año)
);

-- =============================================================================
-- MÓDULO 5: MACROECONOMÍA Y FINANZAS
-- =============================================================================

CREATE TABLE indicadores_macroeconomicos (
    id              SERIAL PRIMARY KEY,
    fecha           DATE NOT NULL,
    frecuencia      VARCHAR(10),
    pib_corriente_M     NUMERIC(15,3),
    pib_constante_M     NUMERIC(15,3),
    pib_per_capita      NUMERIC(10,2),
    crecimiento_pib     NUMERIC(6,3),
    consumo_hogares_M   NUMERIC(15,3),
    consumo_publico_M   NUMERIC(15,3),
    formacion_capital_M NUMERIC(15,3),
    exportaciones_M     NUMERIC(15,3),
    importaciones_M     NUMERIC(15,3),
    saldo_exterior_M    NUMERIC(15,3),
    ipc_general         NUMERIC(6,3),
    ipc_subyacente      NUMERIC(6,3),
    ipc_energia         NUMERIC(6,3),
    ipc_alimentos       NUMERIC(6,3),
    ipc_servicios       NUMERIC(6,3),
    deficit_publico_pib NUMERIC(6,3),
    deuda_publica_pib   NUMERIC(6,3),
    deuda_publica_M     NUMERIC(15,3),
    ingresos_publicos_M NUMERIC(15,3),
    gasto_publico_M     NUMERIC(15,3),
    balanza_cuenta_corriente_pib NUMERIC(6,3),
    tipo_cambio_usd     NUMERIC(8,4),
    euribor_12m         NUMERIC(6,4),
    tipo_referencia_bce NUMERIC(5,3),
    prima_riesgo_bono10 INTEGER,
    ibex35_cierre       NUMERIC(10,2),
    credito_hogares_M   NUMERIC(15,3),
    credito_empresas_M  NUMERIC(15,3),
    morosidad_pct       NUMERIC(5,3),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(fecha, frecuencia)
);

CREATE TABLE pib_ccaa (
    id              SERIAL PRIMARY KEY,
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    año             SMALLINT NOT NULL,
    pib_pm_M        NUMERIC(15,3),
    pib_per_capita  NUMERIC(10,2),
    crecimiento_pib NUMERIC(6,3),
    peso_nacional_pct NUMERIC(5,2),
    vab_agricultura NUMERIC(6,2),
    vab_industria   NUMERIC(6,2),
    vab_construccion NUMERIC(6,2),
    vab_servicios   NUMERIC(6,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(ccaa_id, año)
);

CREATE TABLE presupuestos_generales_estado (
    id              SERIAL PRIMARY KEY,
    año             SMALLINT NOT NULL,
    ministerio_departamento VARCHAR(200),
    programa        VARCHAR(200),
    credito_inicial_M   NUMERIC(15,3),
    credito_definitivo_M NUMERIC(15,3),
    obligaciones_M      NUMERIC(15,3),
    porcentaje_ejecucion NUMERIC(5,2),
    categoria       VARCHAR(50),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- MÓDULO 6: SECTORES ECONÓMICOS
-- =============================================================================

CREATE TABLE sector_energetico (
    id              SERIAL PRIMARY KEY,
    fecha           DATE NOT NULL,
    frecuencia      VARCHAR(10),
    generacion_total_gwh    NUMERIC(12,2),
    generacion_renovable    NUMERIC(12,2),
    generacion_nuclear      NUMERIC(12,2),
    generacion_carbon       NUMERIC(12,2),
    generacion_gas          NUMERIC(12,2),
    generacion_hidraulica   NUMERIC(12,2),
    generacion_eolica       NUMERIC(12,2),
    generacion_solar_fv     NUMERIC(12,2),
    generacion_solar_termica NUMERIC(12,2),
    pct_renovable           NUMERIC(5,2),
    precio_pool_mwh         NUMERIC(8,4),
    precio_luz_kwh_residencial NUMERIC(7,4),
    precio_gas_kwh          NUMERIC(7,4),
    precio_gasolina_95      NUMERIC(6,4),
    precio_gasoleo_a        NUMERIC(6,4),
    precio_petroleo_brent   NUMERIC(8,3),
    consumo_final_energia_M_tep NUMERIC(10,3),
    intensidad_energetica   NUMERIC(8,4),
    emisiones_co2_kt        NUMERIC(12,2),
    potencia_instalada_mw   NUMERIC(12,2),
    potencia_renovable_mw   NUMERIC(12,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(fecha, frecuencia)
);

CREATE TABLE sector_inmobiliario (
    id              SERIAL PRIMARY KEY,
    municipio_id    INTEGER REFERENCES municipios(id),
    provincia_id    INTEGER REFERENCES provincias(id),
    año             SMALLINT NOT NULL,
    trimestre       SMALLINT,
    precio_m2_vivienda_libre   NUMERIC(8,2),
    precio_m2_vivienda_vpo     NUMERIC(8,2),
    precio_m2_alquiler         NUMERIC(7,2),
    variacion_precio_anual     NUMERIC(6,3),
    compraventas_total         INTEGER,
    compraventas_obra_nueva    INTEGER,
    compraventas_segunda_mano  INTEGER,
    hipotecas_constituidas     INTEGER,
    importe_medio_hipoteca     NUMERIC(10,2),
    tipo_interes_hipoteca      NUMERIC(5,3),
    viviendas_iniciadas        INTEGER,
    viviendas_terminadas       INTEGER,
    licencias_obra_nueva       INTEGER,
    esfuerzo_acceso_vivienda   NUMERIC(5,2),
    ratio_precio_renta         NUMERIC(5,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(municipio_id, año, trimestre)
);

CREATE TABLE sector_agroalimentario (
    id              SERIAL PRIMARY KEY,
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    año             SMALLINT NOT NULL,
    produccion_cereales_t   NUMERIC(12,2),
    produccion_legumbres_t  NUMERIC(12,2),
    produccion_hortalizas_t NUMERIC(12,2),
    produccion_frutas_t     NUMERIC(12,2),
    produccion_vino_hl      NUMERIC(12,2),
    produccion_aceite_t     NUMERIC(12,2),
    produccion_citricos_t   NUMERIC(12,2),
    censo_bovino            INTEGER,
    censo_porcino           INTEGER,
    censo_ovino             INTEGER,
    censo_aviar             INTEGER,
    capturas_pesca_t        NUMERIC(12,2),
    acuicultura_t           NUMERIC(12,2),
    vab_industria_aliment_M NUMERIC(12,2),
    empleo_industria_aliment INTEGER,
    exportaciones_agro_M    NUMERIC(12,2),
    importaciones_agro_M    NUMERIC(12,2),
    indice_precios_percibidos NUMERIC(6,2),
    ayudas_pac_M            NUMERIC(12,2),
    superficie_ecologica_ha NUMERIC(12,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(ccaa_id, año)
);

CREATE TABLE sector_textil (
    id              SERIAL PRIMARY KEY,
    año             SMALLINT NOT NULL,
    trimestre       SMALLINT,
    facturacion_M           NUMERIC(12,2),
    empleo_directo          INTEGER,
    num_empresas            INTEGER,
    exportaciones_M         NUMERIC(12,2),
    importaciones_M         NUMERIC(12,2),
    saldo_comercial_M       NUMERIC(12,2),
    principales_destinos    TEXT,
    ventas_ecommerce_M      NUMERIC(12,2),
    ventas_tienda_fisica_M  NUMERIC(12,2),
    indice_sostenibilidad   NUMERIC(5,2),
    huella_carbono_kt_co2   NUMERIC(10,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(año, trimestre)
);

CREATE TABLE sector_defensa (
    id              SERIAL PRIMARY KEY,
    año             SMALLINT NOT NULL,
    presupuesto_defensa_M       NUMERIC(12,2),
    presupuesto_defensa_pib_pct NUMERIC(5,3),
    presupuesto_otan_objetivo   NUMERIC(5,3),
    gasto_personal_M            NUMERIC(12,2),
    gasto_inversiones_M         NUMERIC(12,2),
    gasto_operaciones_M         NUMERIC(12,2),
    facturacion_industria_def_M NUMERIC(12,2),
    exportaciones_armamento_M   NUMERIC(12,2),
    empleo_sector_defensa       INTEGER,
    num_empresas_defensa        INTEGER,
    efectivos_ejercito          INTEGER,
    efectivos_marina            INTEGER,
    efectivos_ejercito_aire     INTEGER,
    efectivos_guardia_civil     INTEGER,
    inversiones_modernizacion_M NUMERIC(12,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(año)
);

CREATE TABLE sector_turismo (
    id              SERIAL PRIMARY KEY,
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    año             SMALLINT NOT NULL,
    mes             SMALLINT,
    turistas_internacionales    INTEGER,
    turistas_nacionales         INTEGER,
    pernoctaciones_totales      BIGINT,
    estancia_media_noches       NUMERIC(5,2),
    gasto_total_turistas_M      NUMERIC(12,2),
    gasto_medio_diario          NUMERIC(8,2),
    plazas_hoteleras            INTEGER,
    ocupacion_hotelera_pct      NUMERIC(5,2),
    revpar                      NUMERIC(8,2),
    empleo_hosteleria           INTEGER,
    pib_turistico_pib_pct       NUMERIC(5,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(ccaa_id, año, mes)
);

CREATE TABLE sector_maritimo (
    id              SERIAL PRIMARY KEY,
    año             SMALLINT NOT NULL,
    puerto          VARCHAR(100),
    trafico_total_miles_t       NUMERIC(12,2),
    contenedores_teus           INTEGER,
    trafico_graneles_solidos    NUMERIC(12,2),
    trafico_graneles_liquidos   NUMERIC(12,2),
    trafico_mercancias_gral     NUMERIC(12,2),
    pasajeros_total             INTEGER,
    flota_mercante_num_buques   INTEGER,
    flota_mercante_bruto_ton    NUMERIC(15,2),
    pib_economia_azul_M         NUMERIC(12,2),
    empleo_economia_azul        INTEGER,
    capturas_flota_total_t      NUMERIC(12,2),
    valor_capturas_M            NUMERIC(12,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(año, puerto)
);

CREATE TABLE sector_tecnologia (
    id              SERIAL PRIMARY KEY,
    año             SMALLINT NOT NULL,
    facturacion_tic_M           NUMERIC(12,2),
    empleo_tic                  INTEGER,
    num_empresas_tic            INTEGER,
    vab_tic_pct_pib             NUMERIC(5,2),
    hogares_acceso_internet_pct NUMERIC(5,2),
    cobertura_5g_pct            NUMERIC(5,2),
    cobertura_fibra_pct         NUMERIC(5,2),
    usuarios_ecommerce_M        NUMERIC(8,2),
    gasto_id_pib_pct            NUMERIC(5,3),
    gasto_id_M                  NUMERIC(12,2),
    investigadores_fte          INTEGER,
    patentes_solicitadas        INTEGER,
    inversion_venture_M         NUMERIC(10,2),
    num_unicornios              INTEGER,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(año)
);

CREATE TABLE sector_industrial (
    id              SERIAL PRIMARY KEY,
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    año             SMALLINT NOT NULL,
    rama_cnae2      CHAR(2),
    nombre_rama     VARCHAR(200),
    vab_M           NUMERIC(12,2),
    empleo          INTEGER,
    num_empresas    INTEGER,
    produccion_M    NUMERIC(12,2),
    exportaciones_M NUMERIC(12,2),
    ipi_indice      NUMERIC(6,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(ccaa_id, año, rama_cnae2)
);

-- =============================================================================
-- MÓDULO 8: POLÍTICA INSTITUCIONAL
-- =============================================================================

CREATE TABLE legislaturas (
    id              SERIAL PRIMARY KEY,
    numero          SMALLINT,
    ambito          VARCHAR(50),
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    fecha_inicio    DATE,
    fecha_fin       DATE,
    presidente_gobierno VARCHAR(200),
    partido_gobierno VARCHAR(100),
    tipo_gobierno   VARCHAR(50),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parlamentarios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(200) NOT NULL,
    apellidos       VARCHAR(200),
    partido_id      INTEGER REFERENCES partidos(id),
    camara          VARCHAR(50),
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    circunscripcion VARCHAR(100),
    legislatura_id  INTEGER REFERENCES legislaturas(id),
    sexo            CHAR(1),
    fecha_nacimiento DATE,
    cargo           VARCHAR(100),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE votaciones_parlamentarias (
    id              SERIAL PRIMARY KEY,
    legislatura_id  INTEGER REFERENCES legislaturas(id),
    fecha           DATE NOT NULL,
    titulo          TEXT,
    tipo_votacion   VARCHAR(50),
    resultado       VARCHAR(20),
    votos_si        INTEGER,
    votos_no        INTEGER,
    abstenciones    INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE votos_individuales (
    id              BIGSERIAL PRIMARY KEY,
    votacion_id     INTEGER REFERENCES votaciones_parlamentarias(id),
    parlamentario_id INTEGER REFERENCES parlamentarios(id),
    voto            VARCHAR(20),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(votacion_id, parlamentario_id)
);

CREATE TABLE gobierno_composicion (
    id              SERIAL PRIMARY KEY,
    legislatura_id  INTEGER REFERENCES legislaturas(id),
    cargo           VARCHAR(200),
    nombre_titular  VARCHAR(200),
    partido_id      INTEGER REFERENCES partidos(id),
    fecha_nombramiento DATE,
    fecha_cese      DATE,
    ministerio      VARCHAR(200),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- MÓDULO 9: MEDIOS Y REDES
-- =============================================================================

CREATE TABLE medios_comunicacion (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    tipo            VARCHAR(30),
    titularidad     VARCHAR(30),
    ambito          VARCHAR(50),
    ccaa_id         INTEGER REFERENCES comunidades_autonomas(id),
    ideologia_percibida VARCHAR(50),
    grupo_mediatico VARCHAR(100),
    web             VARCHAR(200),
    audiencia_mensual_M NUMERIC(8,2),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE metricas_medios (
    id              SERIAL PRIMARY KEY,
    medio_id        INTEGER REFERENCES medios_comunicacion(id),
    año             SMALLINT NOT NULL,
    mes             SMALLINT,
    audiencia_ola   NUMERIC(8,2),
    cuota_audiencia_pct NUMERIC(5,2),
    usuarios_unicos_web_M NUMERIC(8,2),
    seguidores_twitter  INTEGER,
    seguidores_instagram INTEGER,
    seguidores_facebook INTEGER,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(medio_id, año, mes)
);

CREATE TABLE posts_redes_sociales (
    id              BIGSERIAL PRIMARY KEY,
    plataforma      VARCHAR(30),
    post_id_original VARCHAR(100),
    autor_handle    VARCHAR(100),
    autor_tipo      VARCHAR(30),
    partido_id      INTEGER REFERENCES partidos(id),
    parlamentario_id INTEGER REFERENCES parlamentarios(id),
    fecha_publicacion TIMESTAMP,
    texto           TEXT,
    idioma          CHAR(5),
    metricas_likes  INTEGER DEFAULT 0,
    metricas_retweets INTEGER DEFAULT 0,
    metricas_replies  INTEGER DEFAULT 0,
    metricas_views    INTEGER DEFAULT 0,
    sentimiento     VARCHAR(20),
    sentimiento_score NUMERIC(5,4),
    temas_detectados TEXT,
    entidades_mencionadas TEXT,
    is_campaign_content BOOLEAN,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- MÓDULO 10: SERIES TEMPORALES (TimescaleDB)
-- =============================================================================

CREATE TABLE tracking_opinion_publica (
    tiempo          TIMESTAMPTZ NOT NULL,
    partido_id      INTEGER REFERENCES partidos(id),
    metrica         VARCHAR(50),
    valor           NUMERIC(8,4),
    fuente_id       INTEGER REFERENCES fuentes_encuesta(id),
    margen_error    NUMERIC(5,3)
);

CREATE TABLE tracking_indicadores_economicos (
    tiempo          TIMESTAMPTZ NOT NULL,
    indicador       VARCHAR(100),
    ambito          VARCHAR(50),
    valor           NUMERIC(15,4),
    unidad          VARCHAR(30),
    fuente          VARCHAR(50)
);

SELECT create_hypertable('tracking_opinion_publica', 'tiempo', if_not_exists => TRUE);
SELECT create_hypertable('tracking_indicadores_economicos', 'tiempo', if_not_exists => TRUE);
