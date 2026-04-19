-- 0012_media_infrastructure.sql
-- Infraestructura para pipeline de prensa & agenda mejorado.
-- Tablas: source_health, scraper_incident, fact_check, article, article_scores.
-- Compatible con schema existente (noticias_prensa, agenda_lideres, agenda_mediatica).

-- ── source_health ─────────────────────────────────────────────────────────────
-- Estado diario por fuente de datos (medios, fact-checkers, agendas).

CREATE TABLE IF NOT EXISTS source_health (
    id              SERIAL PRIMARY KEY,
    source_id       TEXT        NOT NULL,         -- e.g. "elpais", "newtral", "moncloa"
    source_type     TEXT        NOT NULL DEFAULT 'press',  -- press | factcheck | agenda | party
    fecha           DATE        NOT NULL DEFAULT CURRENT_DATE,
    articles_count  INTEGER     NOT NULL DEFAULT 0,
    errors_count    INTEGER     NOT NULL DEFAULT 0,
    avg_latency_ms  NUMERIC(8,2),
    freshness_lag_s INTEGER,                      -- segundos desde el artículo más reciente
    status          TEXT        NOT NULL DEFAULT 'unknown',  -- ok | degraded | failing | unknown
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_source_health_source ON source_health(source_id);
CREATE INDEX IF NOT EXISTS idx_source_health_fecha  ON source_health(fecha);


-- ── scraper_incident ──────────────────────────────────────────────────────────
-- Incidencias de scrapers: roturas de parsers, timeouts, cambios de estructura.

CREATE TABLE IF NOT EXISTS scraper_incident (
    id              BIGSERIAL PRIMARY KEY,
    source_id       TEXT        NOT NULL,
    error_type      TEXT        NOT NULL,  -- HTTP_4xx | HTTP_5xx | PARSER_ERROR | STRUCTURE_CHANGED | RATE_LIMIT | TIMEOUT | UNKNOWN
    severity        TEXT        NOT NULL DEFAULT 'minor',  -- critical | major | minor
    first_seen      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    occurrence_count INTEGER    NOT NULL DEFAULT 1,
    details         TEXT,
    resolved        BOOLEAN     NOT NULL DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scraper_incident_source   ON scraper_incident(source_id);
CREATE INDEX IF NOT EXISTS idx_scraper_incident_severity ON scraper_incident(severity, resolved);
CREATE INDEX IF NOT EXISTS idx_scraper_incident_recent   ON scraper_incident(last_seen DESC);


-- ── fact_check ────────────────────────────────────────────────────────────────
-- Verificaciones publicadas por medios de fact-checking (Newtral, Maldita, EFE, AFP).

CREATE TABLE IF NOT EXISTS fact_check (
    id                  BIGSERIAL PRIMARY KEY,
    source_id           TEXT        NOT NULL,          -- "newtral" | "maldita" | "efe_verifica" | "afp_factual"
    url                 TEXT        UNIQUE,
    titular             TEXT        NOT NULL,
    resumen             TEXT,
    claim_text          TEXT,                          -- claim canonicalizado si se extrae
    verdict             TEXT        NOT NULL DEFAULT 'SIN VERIFICAR',  -- FALSO | ENGAÑOSO | SIN VERIFICAR | VERDADERO | SIN AVAL CIENTÍFICO
    verdict_label       TEXT,                          -- etiqueta original del verificador
    partidos_json       TEXT,                          -- JSON array de partidos implicados
    temas_json          TEXT,                          -- JSON array de temas
    published_at        TIMESTAMPTZ,
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content_hash        TEXT,                          -- SHA256 de titular+resumen para dedup
    UNIQUE(content_hash)
);

CREATE INDEX IF NOT EXISTS idx_fact_check_source      ON fact_check(source_id);
CREATE INDEX IF NOT EXISTS idx_fact_check_published   ON fact_check(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_fact_check_verdict     ON fact_check(verdict);


-- ── article ───────────────────────────────────────────────────────────────────
-- Tabla normalizada de artículos. Complementa noticias_prensa con modelo más estructurado.
-- Las funciones cargar_noticias_recientes() intentarán esta tabla primero y harán
-- fallback a noticias_prensa si está vacía.

CREATE TABLE IF NOT EXISTS article (
    id              BIGSERIAL PRIMARY KEY,
    source_id       TEXT        NOT NULL,
    url_canonical   TEXT        UNIQUE NOT NULL,
    title           TEXT        NOT NULL,
    subtitle        TEXT,
    summary         TEXT,
    body_text       TEXT,
    lang            VARCHAR(5)  NOT NULL DEFAULT 'es',
    published_at    TIMESTAMPTZ,
    author          TEXT,
    section         TEXT,
    raw_tags        TEXT,
    article_group_id BIGINT,                           -- para near-duplicates del mismo evento
    content_hash    TEXT,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- campos de compatibilidad con noticias_prensa para queries unificadas
    categoria       TEXT,
    partidos_mencionados TEXT,
    sentimiento_score    NUMERIC(6,4),
    sentimiento_label    TEXT,
    temas_json           TEXT,
    relevancia_score     NUMERIC(6,4)
);

CREATE INDEX IF NOT EXISTS idx_article_source       ON article(source_id);
CREATE INDEX IF NOT EXISTS idx_article_published    ON article(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_categoria    ON article(categoria);
CREATE INDEX IF NOT EXISTS idx_article_group        ON article(article_group_id);


-- ── article_scores ────────────────────────────────────────────────────────────
-- Métricas calculadas por el pipeline de enriquecimiento.

CREATE TABLE IF NOT EXISTS article_scores (
    article_id          BIGINT PRIMARY KEY REFERENCES article(id) ON DELETE CASCADE,
    sentiment_global    NUMERIC(6,4),
    relevance_score     NUMERIC(6,4),
    novelty_score       NUMERIC(6,4),
    impact_score        NUMERIC(6,4),
    misinfo_risk_score  NUMERIC(6,4),
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
