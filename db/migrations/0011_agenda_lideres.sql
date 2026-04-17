-- Mirror de sql/migrations/003_agenda_lideres.sql para flujo local de db/migrations.

CREATE TABLE IF NOT EXISTS agenda_lideres (
    id              BIGSERIAL PRIMARY KEY,
    lider_id        TEXT        NOT NULL,
    partido         TEXT        NOT NULL,
    nombre_lider    TEXT        NOT NULL,
    cargo           TEXT        NOT NULL,
    titulo_evento   TEXT        NOT NULL,
    descripcion     TEXT,
    lugar           TEXT,
    fecha_evento    DATE        NOT NULL,
    hora_inicio     TIME,
    hora_fin        TIME,
    tipo_evento     TEXT,
    es_publico      BOOLEAN     DEFAULT TRUE,
    url_fuente      TEXT,
    fuente_id       TEXT        NOT NULL,
    fecha_ingesta   TIMESTAMPTZ DEFAULT NOW(),
    raw_html        TEXT,
    UNIQUE (lider_id, fecha_evento, titulo_evento)
);

CREATE INDEX IF NOT EXISTS idx_agenda_fecha       ON agenda_lideres (fecha_evento);
CREATE INDEX IF NOT EXISTS idx_agenda_lider       ON agenda_lideres (lider_id);
CREATE INDEX IF NOT EXISTS idx_agenda_partido     ON agenda_lideres (partido);
CREATE INDEX IF NOT EXISTS idx_agenda_fecha_lider ON agenda_lideres (fecha_evento, lider_id);

CREATE OR REPLACE VIEW agenda_hoy AS
    SELECT *
    FROM agenda_lideres
    WHERE fecha_evento = CURRENT_DATE
    ORDER BY hora_inicio ASC NULLS LAST, partido ASC;

CREATE OR REPLACE VIEW agenda_semana AS
    SELECT *
    FROM agenda_lideres
    WHERE fecha_evento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 days'
    ORDER BY fecha_evento ASC, hora_inicio ASC NULLS LAST;
