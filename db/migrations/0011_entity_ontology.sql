-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 0011: Ontología de entidades canónicas
-- Ejecutar con: psql "$DATABASE_URL" -f db/migrations/0011_entity_ontology.sql
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 1. Entidades canónicas ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS entidades_canonicas (
    id                SERIAL PRIMARY KEY,
    tipo              TEXT NOT NULL CHECK (tipo IN ('partido', 'coalicion', 'candidato', 'encuestadora', 'medio')),
    slug              TEXT NOT NULL UNIQUE,
    nombre_oficial    TEXT NOT NULL,
    siglas_display    TEXT NOT NULL,
    color_hex         TEXT DEFAULT '#94A3B8',
    eje_izda_dcha     NUMERIC(4,2),
    ideologia         TEXT,
    activo            BOOLEAN DEFAULT TRUE,
    fecha_fundacion   DATE,
    fecha_disolucion  DATE,
    sucesor_de_id     INTEGER REFERENCES entidades_canonicas(id),
    fusionado_en_id   INTEGER REFERENCES entidades_canonicas(id),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Aliases ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entidad_aliases (
    id                SERIAL PRIMARY KEY,
    entidad_id        INTEGER NOT NULL REFERENCES entidades_canonicas(id) ON DELETE CASCADE,
    alias             TEXT NOT NULL,
    fuente            TEXT,
    normalizado       TEXT NOT NULL,
    UNIQUE (normalizado)
);

CREATE INDEX IF NOT EXISTS idx_entidad_aliases_norm
ON entidad_aliases(normalizado);

-- Aliases pendientes para revisión manual
CREATE TABLE IF NOT EXISTS entidad_aliases_pendientes (
    id                SERIAL PRIMARY KEY,
    alias             TEXT NOT NULL,
    normalizado       TEXT NOT NULL UNIQUE,
    fuente            TEXT DEFAULT 'unknown',
    intentos          INTEGER NOT NULL DEFAULT 1,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    ultima_vez        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Vincular tabla partidos ──────────────────────────────────
ALTER TABLE partidos
    ADD COLUMN IF NOT EXISTS entidad_id INTEGER REFERENCES entidades_canonicas(id);

CREATE INDEX IF NOT EXISTS idx_partidos_entidad_id ON partidos(entidad_id);

-- ── 4. Resolución SQL de entidad ────────────────────────────────
CREATE OR REPLACE FUNCTION resolver_entidad(p_texto TEXT, p_tipo TEXT DEFAULT 'partido')
RETURNS INTEGER AS $$
DECLARE
    v_id INTEGER;
    v_norm TEXT := UPPER(TRIM(REGEXP_REPLACE(COALESCE(p_texto, ''), '[_\-\s]+', ' ', 'g')));
BEGIN
    IF v_norm = '' THEN
        RETURN NULL;
    END IF;

    SELECT entidad_id INTO v_id
    FROM entidad_aliases
    WHERE normalizado = v_norm
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    SELECT ec.id INTO v_id
    FROM entidades_canonicas ec
    WHERE ec.tipo = p_tipo
      AND ec.activo = TRUE
      AND (
          UPPER(ec.siglas_display) = v_norm
          OR UPPER(ec.slug) = REPLACE(v_norm, ' ', '-')
          OR similarity(UPPER(ec.nombre_oficial), v_norm) > 0.60
      )
    ORDER BY similarity(UPPER(ec.nombre_oficial), v_norm) DESC
    LIMIT 1;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ── 5. Vista materializada de partidos resueltos ───────────────
DROP MATERIALIZED VIEW IF EXISTS partidos_resueltos;
CREATE MATERIALIZED VIEW partidos_resueltos AS
SELECT
    p.id AS partido_id_original,
    p.siglas AS siglas_original,
    COALESCE(ec.id, p.id) AS entidad_id,
    COALESCE(ec.slug, LOWER(REPLACE(p.siglas, ' ', '-'))) AS slug,
    COALESCE(ec.siglas_display, p.siglas) AS siglas,
    COALESCE(ec.nombre_oficial, p.nombre_completo) AS nombre_oficial,
    COALESCE(ec.color_hex, '#94A3B8') AS color_hex,
    COALESCE(ec.eje_izda_dcha, p.eje_izda_dcha) AS eje_izda_dcha,
    COALESCE(ec.ideologia, p.ideologia) AS ideologia,
    ec.sucesor_de_id,
    ec.fusionado_en_id,
    COALESCE(ec.activo, TRUE) AS activo
FROM partidos p
LEFT JOIN entidades_canonicas ec ON ec.id = p.entidad_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_partidos_resueltos_pid
ON partidos_resueltos(partido_id_original);

CREATE INDEX IF NOT EXISTS idx_partidos_resueltos_entidad
ON partidos_resueltos(entidad_id);

-- ── 6. Trigger updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entidades_updated_at ON entidades_canonicas;
CREATE TRIGGER trg_entidades_updated_at
BEFORE UPDATE ON entidades_canonicas
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. Semillas canónicas ───────────────────────────────────────
INSERT INTO entidades_canonicas
    (tipo, slug, nombre_oficial, siglas_display, color_hex, eje_izda_dcha, ideologia, activo)
VALUES
    ('partido', 'pp',       'Partido Popular',                          'PP',       '#009FDB',  4.5, 'derecha', TRUE),
    ('partido', 'psoe',     'Partido Socialista Obrero Español',        'PSOE',     '#E30613', -2.5, 'centroizquierda', TRUE),
    ('partido', 'vox',      'Vox',                                      'VOX',      '#63BE21',  8.5, 'derechaextrema', TRUE),
    ('partido', 'sumar',    'Sumar',                                    'SUMAR',    '#E4007C', -5.0, 'izquierda', TRUE),
    ('partido', 'podemos',  'Podemos',                                  'PODEMOS',  '#6A2E74', -6.0, 'izquierda', FALSE),
    ('partido', 'cs',       'Ciudadanos',                               'CS',       '#EB6109',  2.0, 'centroderecha', FALSE),
    ('partido', 'erc',      'Esquerra Republicana de Catalunya',        'ERC',      '#F4B20A', -3.5, 'izquierda', TRUE),
    ('partido', 'junts',    'Junts per Catalunya',                      'JUNTS',    '#00AEEF',  1.0, 'centroderecha', TRUE),
    ('partido', 'pnv',      'Partido Nacionalista Vasco',               'PNV',      '#007A3D',  0.5, 'centroderecha', TRUE),
    ('partido', 'eh-bildu', 'Euskal Herria Bildu',                      'EH Bildu', '#A9C55A', -6.5, 'izquierda', TRUE),
    ('partido', 'bng',      'Bloque Nacionalista Galego',               'BNG',      '#73C6E0', -4.0, 'izquierda', TRUE),
    ('partido', 'cup',      'Candidatura d''Unitat Popular',            'CUP',      '#FFCC00', -8.0, 'izquierda', TRUE),
    ('partido', 'iu',       'Izquierda Unida',                          'IU',       '#C8293A', -6.0, 'izquierda', FALSE),
    ('partido', 'up',       'Unidas Podemos',                           'UP',       '#6A2E74', -5.5, 'izquierda', FALSE),
    ('partido', 'cc',       'Coalición Canaria',                        'CC',       '#FFCB00',  1.0, 'centroderecha', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Relaciones de sucesión/fusión orientativas
UPDATE entidades_canonicas
SET fusionado_en_id = (SELECT id FROM entidades_canonicas WHERE slug = 'sumar')
WHERE slug IN ('podemos', 'iu', 'up');

-- ── 8. Aliases semilla ──────────────────────────────────────────
INSERT INTO entidad_aliases (entidad_id, alias, fuente, normalizado)
SELECT ec.id, a.alias, a.fuente, UPPER(TRIM(REGEXP_REPLACE(a.alias, '[_\-\s]+', ' ', 'g')))
FROM (VALUES
    ('eh-bildu', 'EH Bildu',             'ministerio_interior'),
    ('eh-bildu', 'EH_BILDU',             'cis'),
    ('eh-bildu', 'BILDU',                'prensa'),
    ('eh-bildu', 'Euskal Herria Bildu',  'wikipedia'),
    ('eh-bildu', 'EH-BILDU',             'cis'),
    ('junts',    'JUNTS',                'ministerio_interior'),
    ('junts',    'JxCAT',                'historico'),
    ('junts',    'Junts per Catalunya',  'wikipedia'),
    ('junts',    'JUNTS PER CATALUNYA',  'cis'),
    ('podemos',  'PODEMOS',              'ministerio_interior'),
    ('up',       'UP',                   'cis'),
    ('up',       'Unidas Podemos',       'wikipedia'),
    ('sumar',    'SUMAR',                'ministerio_interior'),
    ('sumar',    'Sumar',                'wikipedia'),
    ('pp',       'PP',                   'ministerio_interior'),
    ('pp',       'Partido Popular',      'wikipedia'),
    ('psoe',     'PSOE',                 'ministerio_interior'),
    ('psoe',     'Partido Socialista Obrero Español', 'wikipedia'),
    ('psoe',     'P.S.O.E.',             'historico'),
    ('vox',      'VOX',                  'ministerio_interior'),
    ('vox',      'Vox',                  'wikipedia')
) AS a(slug, alias, fuente)
JOIN entidades_canonicas ec ON ec.slug = a.slug
ON CONFLICT (normalizado) DO NOTHING;

-- ── 9. Backfill partido.entidad_id y refresco vista ─────────────
UPDATE partidos p
SET entidad_id = resolver_entidad(p.siglas, 'partido')
WHERE p.entidad_id IS NULL;

REFRESH MATERIALIZED VIEW partidos_resueltos;
