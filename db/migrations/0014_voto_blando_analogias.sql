-- Bloques 7 y 8: Voto blando/transferible + Analogías históricas

CREATE TABLE IF NOT EXISTS voto_blando_territorial (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NULL,
    circunscripcion TEXT NOT NULL,
    ambito TEXT NOT NULL DEFAULT 'provincia',
    fecha_calculo DATE NOT NULL,
    segmento_edad TEXT NULL,
    segmento_estudios TEXT NULL,
    segmento_ideologia TEXT NULL,
    partido_ref TEXT NULL,
    pct_voto_blando DOUBLE PRECISION NULL,
    score_medio_blando DOUBLE PRECISION NULL,
    pct_probable_abst DOUBLE PRECISION NULL,
    pct_transferible DOUBLE PRECISION NULL,
    n_electores_est INTEGER NULL,
    dist_quintiles JSONB DEFAULT '{}'::jsonb,
    fuente_datos TEXT NULL,
    modelo_version TEXT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_voto_blando_segmento UNIQUE (
        cliente_id, circunscripcion, fecha_calculo,
        segmento_edad, segmento_estudios, segmento_ideologia
    )
);

CREATE INDEX IF NOT EXISTS ix_voto_blando_circ_fecha
ON voto_blando_territorial (cliente_id, circunscripcion, fecha_calculo);

CREATE TABLE IF NOT EXISTS matriz_transferencia (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NULL,
    circunscripcion TEXT NOT NULL,
    fecha_calculo DATE NOT NULL,
    eleccion_ref TEXT NOT NULL,
    partido_origen TEXT NOT NULL,
    partido_destino TEXT NOT NULL,
    prob_transicion DOUBLE PRECISION NOT NULL,
    ic_lower DOUBLE PRECISION NULL,
    ic_upper DOUBLE PRECISION NULL,
    n_observaciones INTEGER NULL,
    metodo TEXT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_transferencia UNIQUE (
        cliente_id, circunscripcion, fecha_calculo,
        eleccion_ref, partido_origen, partido_destino
    )
);

CREATE INDEX IF NOT EXISTS ix_transferencia_par
ON matriz_transferencia (cliente_id, partido_origen, partido_destino);

CREATE TABLE IF NOT EXISTS elecciones_historicas (
    id SERIAL PRIMARY KEY,
    pais TEXT NOT NULL,
    anio INTEGER NOT NULL,
    mes INTEGER NULL,
    tipo TEXT NOT NULL,
    nombre_ref TEXT NOT NULL,
    sistema_electoral TEXT NULL,
    pib_crecimiento DOUBLE PRECISION NULL,
    tasa_paro DOUBLE PRECISION NULL,
    inflacion DOUBLE PRECISION NULL,
    deficit_pib DOUBLE PRECISION NULL,
    deuda_pib DOUBLE PRECISION NULL,
    satisfaccion_eco DOUBLE PRECISION NULL,
    incumbente_partido TEXT NULL,
    incumbente_anios INTEGER NULL,
    incumbente_mayoria BOOLEAN NULL,
    aprobacion_gobierno DOUBLE PRECISION NULL,
    fragmentacion_pre DOUBLE PRECISION NULL,
    polarizacion DOUBLE PRECISION NULL,
    escandalo_mayor BOOLEAN NULL,
    tension_territorial DOUBLE PRECISION NULL,
    crisis_internacional BOOLEAN NULL,
    ciclo_europeo TEXT NULL,
    ganador TEXT NULL,
    pct_ganador DOUBLE PRECISION NULL,
    mayoria_absoluta BOOLEAN NULL,
    participacion DOUBLE PRECISION NULL,
    vuelco_gobierno BOOLEAN NULL,
    volatilidad_total DOUBLE PRECISION NULL,
    resultados_json JSONB DEFAULT '{}'::jsonb,
    coalicion_json JSONB DEFAULT '{}'::jsonb,
    notas TEXT NULL,
    vector_features JSONB DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_eleccion UNIQUE (pais, anio, mes, tipo)
);

CREATE INDEX IF NOT EXISTS ix_elecciones_pais_anio
ON elecciones_historicas (pais, anio);

CREATE TABLE IF NOT EXISTS contexto_electoral (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NULL,
    fecha_snapshot DATE NOT NULL,
    descripcion TEXT NULL,
    pib_crecimiento DOUBLE PRECISION NULL,
    tasa_paro DOUBLE PRECISION NULL,
    inflacion DOUBLE PRECISION NULL,
    deficit_pib DOUBLE PRECISION NULL,
    deuda_pib DOUBLE PRECISION NULL,
    satisfaccion_eco DOUBLE PRECISION NULL,
    incumbente_partido TEXT NULL,
    incumbente_anios INTEGER NULL,
    incumbente_mayoria BOOLEAN NULL,
    aprobacion_gobierno DOUBLE PRECISION NULL,
    fragmentacion_pre DOUBLE PRECISION NULL,
    polarizacion DOUBLE PRECISION NULL,
    escandalo_mayor BOOLEAN NULL,
    tension_territorial DOUBLE PRECISION NULL,
    crisis_internacional BOOLEAN NULL,
    ciclo_europeo TEXT NULL,
    vector_features JSONB DEFAULT '{}'::jsonb,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_contexto_cliente
ON contexto_electoral (cliente_id, fecha_snapshot);

CREATE TABLE IF NOT EXISTS analogias_resultado (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NULL,
    contexto_id INTEGER NULL,
    eleccion_id INTEGER NULL,
    distancia DOUBLE PRECISION NOT NULL,
    similitud_pct DOUBLE PRECISION NOT NULL,
    dimensiones_json JSONB DEFAULT '{}'::jsonb,
    ranking INTEGER NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_analogias_contexto
ON analogias_resultado (contexto_id, ranking);
