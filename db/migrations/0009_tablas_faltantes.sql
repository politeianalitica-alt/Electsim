-- Tablas faltantes para el dashboard y seeds

CREATE TABLE IF NOT EXISTS perfiles_votante (
    id                    SERIAL PRIMARY KEY,
    cluster_id            INTEGER UNIQUE NOT NULL,
    label                 TEXT NOT NULL,
    n_respondentes        INTEGER,
    peso_demografico_pct  NUMERIC(6,3),
    ideologia_media       NUMERIC(4,2),
    edad_media            NUMERIC(4,1),
    distribucion_voto_json TEXT,
    descripcion_perfil_llm TEXT,
    variables_json        TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estimaciones_voto_agregadas (
    id                SERIAL PRIMARY KEY,
    fecha_estimacion  DATE NOT NULL,
    partido_id        INTEGER REFERENCES partidos(id),
    estimacion_pct    NUMERIC(5,2),
    ic_95_inf         NUMERIC(5,2),
    ic_95_sup         NUMERIC(5,2),
    ic_68_inf         NUMERIC(5,2),
    ic_68_sup         NUMERIC(5,2),
    n_encuestas       INTEGER,
    modelo            TEXT NOT NULL DEFAULT 'nowcasting_bayesiano',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (fecha_estimacion, partido_id, modelo)
);

CREATE TABLE IF NOT EXISTS analisis_coaliciones (
    id                    SERIAL PRIMARY KEY,
    eleccion_id           INTEGER REFERENCES elecciones(id),
    partidos_coalicion    TEXT,
    escanos_totales       INTEGER,
    n_partidos            INTEGER,
    es_minima             BOOLEAN DEFAULT FALSE,
    distancia_ideologica  NUMERIC(5,3),
    score_viabilidad      NUMERIC(4,3),
    shapley_json          TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS informes_riesgo_politico (
    id                SERIAL PRIMARY KEY,
    fecha_calculo     DATE NOT NULL,
    indice_compuesto  NUMERIC(4,2),
    semaforo          TEXT,
    dimensiones_json  TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escenarios_generados (
    id                    TEXT PRIMARY KEY,
    nombre                TEXT NOT NULL,
    probabilidad          NUMERIC(4,3),
    descripcion_narrativa TEXT,
    estados_json          TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alertas_sistema (
    id          SERIAL PRIMARY KEY,
    severidad   TEXT NOT NULL,
    tipo        TEXT,
    titulo      TEXT,
    descripcion TEXT,
    leida       BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scraping_log (
    id                      SERIAL PRIMARY KEY,
    fuente                  TEXT,
    tipo                    TEXT,
    estado                  TEXT,
    n_registros_nuevos      INTEGER DEFAULT 0,
    n_registros_duplicados  INTEGER DEFAULT 0,
    duracion_segundos       NUMERIC(8,2),
    error_mensaje           TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulaciones_campana (
    id                       SERIAL PRIMARY KEY,
    partido_emisor           TEXT,
    texto_mensaje            TEXT,
    tipo                     TEXT,
    tema                     TEXT,
    receptividad_media       NUMERIC(5,3),
    cambio_intencion_medio   NUMERIC(5,3),
    n_perfiles               INTEGER,
    fecha_simulacion         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulaciones_encuesta (
    id               TEXT PRIMARY KEY,
    nombre           TEXT,
    n_perfiles       INTEGER,
    uso_rag          BOOLEAN DEFAULT FALSE,
    fecha_simulacion TIMESTAMPTZ DEFAULT NOW(),
    preguntas_json   TEXT
);

CREATE TABLE IF NOT EXISTS resultados_validacion (
    run_id          TEXT PRIMARY KEY,
    tipo            TEXT,
    modelo          TEXT,
    brier_score     NUMERIC(6,4),
    rmse_voto       NUMERIC(6,4),
    mae_escanos     NUMERIC(6,4),
    cobertura_95ci  NUMERIC(5,3),
    pct_completitud NUMERIC(5,3),
    n_checks_ok     INTEGER,
    n_checks_fail   INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS validacion_por_partido (
    id                  SERIAL PRIMARY KEY,
    run_id              TEXT REFERENCES resultados_validacion(run_id),
    partido_siglas      TEXT,
    voto_real_pct       NUMERIC(5,2),
    voto_pred_pct       NUMERIC(5,2),
    error_pct           NUMERIC(5,2),
    escanos_reales      INTEGER,
    escanos_pred_mediana INTEGER,
    escanos_pred_p5     INTEGER,
    escanos_pred_p95    INTEGER
);

CREATE TABLE IF NOT EXISTS indices_politeia (
    id               SERIAL PRIMARY KEY,
    indice_codigo    TEXT NOT NULL,
    indice_nombre    TEXT,
    valor            NUMERIC(6,3),
    semaforo         TEXT,
    variacion_7d     NUMERIC(6,3),
    variacion_30d    NUMERIC(6,3),
    componentes_json TEXT,
    interpretacion   TEXT,
    metodologia      TEXT,
    fecha_calculo    DATE NOT NULL
);
