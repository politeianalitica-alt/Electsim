-- 0013_institucional_core.sql
-- Tablas núcleo para inteligencia institucional: BOE, agenda enriquecida,
-- iniciativas parlamentarias, votaciones y data marts.

-- ── boe_publication ───────────────────────────────────────────────────────────
-- Publicaciones del BOE con scoring de relevancia y linking a iniciativas.

CREATE TABLE IF NOT EXISTS boe_publication (
    id              BIGSERIAL PRIMARY KEY,
    boe_no          TEXT,                        -- e.g. "BOE-A-2026-4512"
    fecha           DATE NOT NULL,
    seccion         TEXT,                        -- I, II, III, IV, V
    departamento    TEXT,                        -- organismo emisor
    tipo_norma      TEXT,                        -- Real Decreto, Ley, Orden...
    titulo          TEXT NOT NULL,
    resumen         TEXT,
    url_html        TEXT UNIQUE,
    url_pdf         TEXT,
    relevancia      TEXT NOT NULL DEFAULT 'Baja', -- Alta | Media | Baja
    relevancia_score INTEGER NOT NULL DEFAULT 30,  -- 0-100
    temas_json      TEXT,                        -- JSON array policy areas
    initiative_id   BIGINT,                      -- FK a parliamentary_initiative si se vincula
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content_hash    TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_boe_fecha        ON boe_publication(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_boe_tipo         ON boe_publication(tipo_norma);
CREATE INDEX IF NOT EXISTS idx_boe_relevancia   ON boe_publication(relevancia);
CREATE INDEX IF NOT EXISTS idx_boe_departamento ON boe_publication(departamento);


-- ── agenda_item (modelo rico) ─────────────────────────────────────────────────
-- Eventos de agenda de decisores: gobierno, parlamento, partidos, casa real.
-- Reemplaza/complementa agenda_lideres con modelo más estructurado.

CREATE TABLE IF NOT EXISTS agenda_item (
    id                  BIGSERIAL PRIMARY KEY,
    -- Actor principal
    main_actor          TEXT NOT NULL,           -- nombre del decisor
    main_actor_id       TEXT,                    -- lider_id de agenda_lideres si aplica
    party_id            TEXT,                    -- siglas del partido
    -- Institución anfitriona
    host_institution    TEXT,                    -- Moncloa, Congreso, Senado, partido...
    host_institution_id TEXT,
    -- Descripción del evento
    title               TEXT NOT NULL,
    description         TEXT,
    location            TEXT,
    -- Temporalidad
    start_time          TIMESTAMPTZ,
    end_time            TIMESTAMPTZ,
    event_date          DATE NOT NULL,
    -- Clasificación
    event_type          TEXT NOT NULL DEFAULT 'OTHER',
        -- GOV_COUNCIL | PLENARY_SESSION | COMMISSION_SESSION | PRESS_CONFERENCE |
        -- BILATERAL_MEETING | INTERNATIONAL_SUMMIT | PARTY_RALLY | INSTITUTIONAL | SOCIAL_EVENT | OTHER
    event_subtype       TEXT,
    topic               TEXT,                    -- policy area principal
    -- Scoring
    importance_score    INTEGER NOT NULL DEFAULT 50,  -- 0-100
    certainty_score     NUMERIC(4,3) NOT NULL DEFAULT 0.9,  -- 0-1
    -- Estado
    status              TEXT NOT NULL DEFAULT 'SCHEDULED',
        -- SCHEDULED | ONGOING | FINISHED | CANCELLED
    -- Fuente
    source_id           TEXT,
    source_url          TEXT,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Linking
    related_initiative_id BIGINT,
    related_vote_id       BIGINT,
    related_norm_id       BIGINT,
    -- Deduplicación
    content_hash        TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_agenda_item_date      ON agenda_item(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_agenda_item_actor     ON agenda_item(main_actor);
CREATE INDEX IF NOT EXISTS idx_agenda_item_type      ON agenda_item(event_type);
CREATE INDEX IF NOT EXISTS idx_agenda_item_party     ON agenda_item(party_id);
CREATE INDEX IF NOT EXISTS idx_agenda_item_source    ON agenda_item(source_id);
CREATE INDEX IF NOT EXISTS idx_agenda_item_importance ON agenda_item(importance_score DESC);


-- ── parliamentary_initiative ──────────────────────────────────────────────────
-- Iniciativas parlamentarias con su estado de tramitación.

CREATE TABLE IF NOT EXISTS parliamentary_initiative (
    id              BIGSERIAL PRIMARY KEY,
    chamber         TEXT NOT NULL DEFAULT 'congreso',  -- congreso | senado
    legislatura     SMALLINT,
    initiative_type TEXT NOT NULL,           -- PPL, PL, PNL, MOCI, INTER, RDL...
    title           TEXT NOT NULL,
    summary         TEXT,
    proponent_party TEXT,                    -- siglas del partido proponente
    proponent_actor TEXT,                    -- nombre del diputado/senador proponente
    submitted_at    DATE,
    status          TEXT NOT NULL DEFAULT 'REGISTERED',
        -- REGISTERED | ADMITTED | IN_COMMISSION | IN_PLENARY | APPROVED | REJECTED | WITHDRAWN
    last_stage_at   DATE,
    url_congreso    TEXT UNIQUE,
    temas_json      TEXT,
    relevancia_score INTEGER DEFAULT 50,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_initiative_type    ON parliamentary_initiative(initiative_type);
CREATE INDEX IF NOT EXISTS idx_initiative_party   ON parliamentary_initiative(proponent_party);
CREATE INDEX IF NOT EXISTS idx_initiative_status  ON parliamentary_initiative(status);
CREATE INDEX IF NOT EXISTS idx_initiative_date    ON parliamentary_initiative(submitted_at DESC);


-- ── parliamentary_vote ────────────────────────────────────────────────────────
-- Votaciones del pleno (y en el futuro comisiones).

CREATE TABLE IF NOT EXISTS parliamentary_vote (
    id              BIGSERIAL PRIMARY KEY,
    chamber         TEXT NOT NULL DEFAULT 'congreso',
    legislatura     SMALLINT,
    session_date    DATE,
    vote_type       TEXT,                    -- PPL, PNL, MOCI, ENMIENDA...
    title           TEXT NOT NULL,
    result          TEXT,                    -- APROBADA | RECHAZADA | RETIRADA
    votos_favor     INTEGER DEFAULT 0,
    votos_contra    INTEGER DEFAULT 0,
    abstenciones    INTEGER DEFAULT 0,
    parties_favor_json   TEXT,              -- JSON array
    parties_against_json TEXT,
    topic           TEXT,
    implications    TEXT,
    initiative_id   BIGINT REFERENCES parliamentary_initiative(id),
    url_congreso    TEXT,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content_hash    TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_pvote_date   ON parliamentary_vote(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_pvote_result ON parliamentary_vote(result);
CREATE INDEX IF NOT EXISTS idx_pvote_type   ON parliamentary_vote(vote_type);


-- ── Data marts ────────────────────────────────────────────────────────────────

-- Actividad legislativa diaria (agrega actividad_congreso + parliamentary_initiative)
CREATE TABLE IF NOT EXISTS dm_legislative_activity_daily (
    fecha           DATE NOT NULL,
    partido_siglas  TEXT NOT NULL,
    chamber         TEXT NOT NULL DEFAULT 'congreso',
    n_iniciativas   INTEGER DEFAULT 0,
    n_votaciones    INTEGER DEFAULT 0,
    n_aprobadas     INTEGER DEFAULT 0,
    n_rechazadas    INTEGER DEFAULT 0,
    n_comisiones    INTEGER DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (fecha, partido_siglas, chamber)
);

-- Agenda de decisores diaria
CREATE TABLE IF NOT EXISTS dm_deciders_agenda (
    event_date      DATE NOT NULL,
    main_actor      TEXT NOT NULL,
    party_id        TEXT,
    n_events        INTEGER DEFAULT 0,
    top_event_title TEXT,
    top_event_type  TEXT,
    top_importance  INTEGER DEFAULT 0,
    topics_json     TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_date, main_actor)
);

-- Normativa BOE diaria
CREATE TABLE IF NOT EXISTS dm_norms_boe (
    fecha           DATE NOT NULL,
    relevancia      TEXT NOT NULL,           -- Alta | Media | Baja
    n_publicaciones INTEGER DEFAULT 0,
    departamentos_json TEXT,
    temas_json      TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (fecha, relevancia)
);
