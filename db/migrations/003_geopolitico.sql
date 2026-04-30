-- ============================================================================
-- Migracion 003: Modulo Geopolitico v2
-- Tablas: eventosacled, riesgo_pais, gpsjam_snapshots, gdelt_articulos, senales
-- Vistas: v_alerta_espana, v_tendencia_riesgo_30d, v_eventos_enriquecidos
-- Trigger: riesgo_pais_historico (copia automatica al insertar/actualizar)
-- Extensiones requeridas: h3, postgis (opcional), pg_trgm
-- Idempotente: usa IF NOT EXISTS / OR REPLACE
-- ============================================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE EXTENSION IF NOT EXISTS h3;       -- Habilitar si h3 instalado
-- CREATE EXTENSION IF NOT EXISTS postgis;  -- Habilitar si PostGIS instalado

-- ============================================================================
-- 1. eventosacled
-- ============================================================================

CREATE TABLE IF NOT EXISTS eventosacled (
    id              BIGSERIAL    PRIMARY KEY,
    -- acled_id unico: ACLED nativo | UCDP = acled_id + 900_000_000
    acled_id        BIGINT       NOT NULL,
    fuente          VARCHAR(20)  NOT NULL DEFAULT 'ACLED',
    pais            CHAR(3)      NOT NULL,
    pais_nombre     VARCHAR(120),
    fecha           DATE,
    tipo_evento     VARCHAR(100),
    subtipo         VARCHAR(100),
    -- tipo CAMEO canonico (generado en la aplicacion)
    tipo_cameo      VARCHAR(30)
        GENERATED ALWAYS AS (
            CASE tipo_evento
                WHEN 'Battles'                    THEN 'FIGHT'
                WHEN 'Explosions/Remote violence' THEN 'FIGHT'
                WHEN 'Violence against civilians' THEN 'VIOLENCE_CIVILES'
                WHEN 'Riots'                      THEN 'RIOT'
                WHEN 'Protests'                   THEN 'PROTEST'
                WHEN 'Strategic developments'     THEN 'STRATEGIC'
                ELSE 'UNKNOWN'
            END
        ) STORED,
    actor1          VARCHAR(300),
    actor2          VARCHAR(300),
    latitud         DOUBLE PRECISION,
    longitud        DOUBLE PRECISION,
    fatalities      INTEGER      NOT NULL DEFAULT 0,
    relevancia_es   NUMERIC(5,4),
    notas           TEXT,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (acled_id, fuente)
);

CREATE INDEX IF NOT EXISTS idx_eventosacled_pais_fecha
    ON eventosacled (pais, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_eventosacled_tipo_cameo
    ON eventosacled (tipo_cameo);

CREATE INDEX IF NOT EXISTS idx_eventosacled_relevancia
    ON eventosacled (relevancia_es DESC);

CREATE INDEX IF NOT EXISTS idx_eventosacled_notas_trgm
    ON eventosacled USING gin (notas gin_trgm_ops);

-- ============================================================================
-- 2. riesgo_pais
-- ============================================================================

CREATE TABLE IF NOT EXISTS riesgo_pais (
    pais            CHAR(3)      PRIMARY KEY,
    score_total     NUMERIC(6,2),
    score_conflicto NUMERIC(6,2),
    score_wgi       NUMERIC(6,2),
    score_imf       NUMERIC(6,2),
    score_gdelt     NUMERIC(6,2),
    score_jamming   NUMERIC(6,2),
    nivel           VARCHAR(20)
        CHECK (nivel IN ('BAJO','MODERADO','ALTO','MUY_ALTO','CRITICO')),
    cii             NUMERIC(10,3),
    tono_gdelt      NUMERIC(8,4),
    relevancia_es   NUMERIC(5,4),
    briefing_llm    JSONB,
    actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_riesgo_pais_nivel
    ON riesgo_pais (nivel);

CREATE INDEX IF NOT EXISTS idx_riesgo_pais_score_total
    ON riesgo_pais (score_total DESC);

-- ============================================================================
-- 3. riesgo_pais_historico  +  trigger
-- ============================================================================

CREATE TABLE IF NOT EXISTS riesgo_pais_historico (
    id              BIGSERIAL    PRIMARY KEY,
    pais            CHAR(3)      NOT NULL,
    score_total     NUMERIC(6,2),
    nivel           VARCHAR(20),
    cii             NUMERIC(10,3),
    tono_gdelt      NUMERIC(8,4),
    registrado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rph_pais_fecha
    ON riesgo_pais_historico (pais, registrado_en DESC);

-- Funcion del trigger
CREATE OR REPLACE FUNCTION fn_copiar_riesgo_historico()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO riesgo_pais_historico
        (pais, score_total, nivel, cii, tono_gdelt, registrado_en)
    VALUES
        (NEW.pais, NEW.score_total, NEW.nivel, NEW.cii, NEW.tono_gdelt, NOW());
    RETURN NEW;
END;
$$;

-- Trigger (idempotente)
DROP TRIGGER IF EXISTS trg_riesgo_pais_historico ON riesgo_pais;
CREATE TRIGGER trg_riesgo_pais_historico
    AFTER INSERT OR UPDATE ON riesgo_pais
    FOR EACH ROW EXECUTE FUNCTION fn_copiar_riesgo_historico();

-- ============================================================================
-- 4. gpsjam_snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS gpsjam_snapshots (
    id                BIGSERIAL    PRIMARY KEY,
    hex_id            VARCHAR(20)  NOT NULL,
    pct_interferencia NUMERIC(6,4) NOT NULL,
    nivel             VARCHAR(10)
        CHECK (nivel IN ('bajo','medio','alto')),
    fecha             DATE         NOT NULL,
    capturado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (hex_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_gpsjam_fecha
    ON gpsjam_snapshots (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_gpsjam_nivel
    ON gpsjam_snapshots (nivel);

-- Vista materializada: ultimo snapshot por hex
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_gpsjam_ultimo_por_pais AS
    SELECT
        hex_id,
        pct_interferencia,
        nivel,
        fecha
    FROM gpsjam_snapshots
    WHERE (hex_id, fecha) IN (
        SELECT hex_id, MAX(fecha)
        FROM gpsjam_snapshots
        GROUP BY hex_id
    )
WITH NO DATA;

-- Refrescar la vista (se puede hacer bajo demanda desde el pipeline)
-- REFRESH MATERIALIZED VIEW mv_gpsjam_ultimo_por_pais;

-- ============================================================================
-- 5. gdelt_articulos
-- ============================================================================

CREATE TABLE IF NOT EXISTS gdelt_articulos (
    id              BIGSERIAL    PRIMARY KEY,
    -- Hash MD5 de la URL para deduplicacion
    url_hash        CHAR(32)     GENERATED ALWAYS AS (
                        ENCODE(DIGEST(url, 'md5'), 'hex')
                    ) STORED,
    url             TEXT         NOT NULL,
    titulo          VARCHAR(500),
    dominio         VARCHAR(200),
    idioma          VARCHAR(10),
    tono            NUMERIC(8,4),
    fecha_articulo  TIMESTAMPTZ,
    query_origen    VARCHAR(200),
    fuente_tipo     VARCHAR(30)  DEFAULT 'gdelt_doc',
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (url)
);

-- Nota: DIGEST requiere pgcrypto. Alternativa sin extension:
-- Eliminar la columna generada y calcular url_hash en la aplicacion.
-- La tabla tiene UNIQUE (url) como fallback.

CREATE INDEX IF NOT EXISTS idx_gdelt_tono
    ON gdelt_articulos (tono);

CREATE INDEX IF NOT EXISTS idx_gdelt_fecha
    ON gdelt_articulos (fecha_articulo DESC);

-- ============================================================================
-- 6. senales
-- ============================================================================

CREATE TYPE IF NOT EXISTS estado_senal AS ENUM ('pendiente','revisada','archivada');

CREATE TABLE IF NOT EXISTS senales (
    id              BIGSERIAL     PRIMARY KEY,
    pais            CHAR(3),
    tipo            VARCHAR(80)   NOT NULL,
    descripcion     TEXT,
    urgencia        SMALLINT      NOT NULL CHECK (urgencia BETWEEN 1 AND 4),
    estado          estado_senal  NOT NULL DEFAULT 'pendiente',
    fuente          VARCHAR(50),
    metadata        JSONB,
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_senales_pais_urgencia
    ON senales (pais, urgencia DESC);

CREATE INDEX IF NOT EXISTS idx_senales_estado
    ON senales (estado);

-- ============================================================================
-- 7. Vistas
-- ============================================================================

-- Alertas activas de interes para Espana (score >= 65)
CREATE OR REPLACE VIEW v_alerta_espana AS
SELECT
    rp.pais,
    rp.score_total,
    rp.nivel,
    rp.cii,
    rp.tono_gdelt,
    rp.score_jamming,
    rp.actualizado_en,
    COUNT(ea.id) FILTER (
        WHERE ea.fecha >= CURRENT_DATE - INTERVAL '7 days'
    ) AS eventos_7d,
    SUM(ea.fatalities) FILTER (
        WHERE ea.fecha >= CURRENT_DATE - INTERVAL '7 days'
    ) AS fatalities_7d
FROM riesgo_pais rp
LEFT JOIN eventosacled ea ON ea.pais = rp.pais
WHERE rp.score_total >= 65
GROUP BY rp.pais, rp.score_total, rp.nivel, rp.cii,
         rp.tono_gdelt, rp.score_jamming, rp.actualizado_en
ORDER BY rp.score_total DESC;

-- Tendencia de riesgo ultimos 30 dias por pais
CREATE OR REPLACE VIEW v_tendencia_riesgo_30d AS
SELECT
    pais,
    DATE_TRUNC('week', registrado_en) AS semana,
    AVG(score_total)::NUMERIC(6,2)    AS score_medio,
    MAX(score_total)                  AS score_max,
    COUNT(*)                          AS n_registros
FROM riesgo_pais_historico
WHERE registrado_en >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY pais, DATE_TRUNC('week', registrado_en)
ORDER BY pais, semana;

-- Eventos enriquecidos con score de pais
CREATE OR REPLACE VIEW v_eventos_enriquecidos AS
SELECT
    ea.id,
    ea.acled_id,
    ea.fuente,
    ea.pais,
    ea.pais_nombre,
    ea.fecha,
    ea.tipo_evento,
    ea.tipo_cameo,
    ea.actor1,
    ea.actor2,
    ea.fatalities,
    ea.relevancia_es,
    ea.notas,
    rp.score_total   AS riesgo_pais,
    rp.nivel         AS nivel_pais
FROM eventosacled ea
LEFT JOIN riesgo_pais rp ON rp.pais = ea.pais
ORDER BY ea.fecha DESC, ea.relevancia_es DESC;

-- ============================================================================
-- 8. Funciones de mantenimiento
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_limpiar_gdelt_viejo(dias_max INTEGER DEFAULT 90)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    n INTEGER;
BEGIN
    DELETE FROM gdelt_articulos
    WHERE creado_en < NOW() - (dias_max || ' days')::INTERVAL;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION fn_limpiar_gpsjam_viejo(dias_max INTEGER DEFAULT 60)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    n INTEGER;
BEGIN
    DELETE FROM gpsjam_snapshots
    WHERE fecha < CURRENT_DATE - dias_max;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;

-- ============================================================================
-- Fin migracion 003_geopolitico.sql
-- ============================================================================
