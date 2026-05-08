-- 0062: Actor Intelligence Engine — tablas para el módulo de actores políticos
--
-- 5 tablas: actors, actor_relations, actor_mentions, actor_narratives, actor_relevance_history.
-- Diseñado para soportar:
-- - Directorio de figuras públicas (manual + auto-descubierto)
-- - Grafo de relaciones inferido de co-ocurrencia en noticias
-- - Linkado de menciones de news_articles a cada actor
-- - Linkado de narrativas a actores
-- - Histórico de scores para sparklines

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- para gen_random_uuid()

-- ── actors: tabla principal ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actors (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    party             TEXT,
    party_color       TEXT DEFAULT '#94A3B8',
    role              TEXT,
    bio               TEXT,
    source            TEXT DEFAULT 'manual',     -- 'manual' | 'auto_discovered'
    relevance_score   FLOAT DEFAULT 0.0,         -- 0-100, computed by engine
    exposure          FLOAT DEFAULT 0.0,
    approval          FLOAT DEFAULT 0.0,
    sentiment         TEXT DEFAULT 'stable',     -- 'up' | 'down' | 'stable'
    mention_count_24h INTEGER DEFAULT 0,
    mention_count_7d  INTEGER DEFAULT 0,
    is_active         BOOLEAN DEFAULT TRUE,
    auto_created      BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (name)
);

-- ── actor_relations: grafo dirigido/bidireccional ─────────────────────────────
CREATE TABLE IF NOT EXISTS actor_relations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_a_id    UUID REFERENCES actors(id) ON DELETE CASCADE,
    actor_b_id    UUID REFERENCES actors(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,    -- aliado | rival | coalicion | tension | mediatica | institucional
    weight        FLOAT DEFAULT 0.5,           -- 0-1
    direction     TEXT DEFAULT 'bidirectional', -- a_to_b | b_to_a | bidirectional
    last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (actor_a_id, actor_b_id, relation_type)
);

-- ── actor_mentions: noticias asociadas ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS actor_mentions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id     UUID REFERENCES actors(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    url          TEXT,
    source       TEXT,
    published_at TIMESTAMPTZ,
    sentiment    FLOAT,                       -- -1.0 to 1.0
    relevance    FLOAT DEFAULT 0.5,
    summary      TEXT,
    raw_snippet  TEXT,
    article_id   INTEGER,                     -- FK lógica a news_articles.id
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (actor_id, title)
);

-- ── actor_narratives: frames vinculados a actores ────────────────────────────
CREATE TABLE IF NOT EXISTS actor_narratives (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID REFERENCES actors(id) ON DELETE CASCADE,
    frame_label   TEXT NOT NULL,
    description   TEXT,
    lifecycle     TEXT DEFAULT 'emergente',  -- emergente | pico | declinante
    velocity      TEXT DEFAULT 'estable',
    intensity     FLOAT DEFAULT 0.5,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (actor_id, frame_label)
);

-- ── actor_relevance_history: para sparklines de evolución ────────────────────
CREATE TABLE IF NOT EXISTS actor_relevance_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID REFERENCES actors(id) ON DELETE CASCADE,
    score       FLOAT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_actors_party              ON actors(party);
CREATE INDEX IF NOT EXISTS idx_actors_relevance          ON actors(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_actors_active             ON actors(is_active);
CREATE INDEX IF NOT EXISTS idx_actor_mentions_actor      ON actor_mentions(actor_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_actor_relations_a         ON actor_relations(actor_a_id);
CREATE INDEX IF NOT EXISTS idx_actor_relations_b         ON actor_relations(actor_b_id);
CREATE INDEX IF NOT EXISTS idx_actor_relations_weight    ON actor_relations(weight DESC);
CREATE INDEX IF NOT EXISTS idx_actor_narratives_actor    ON actor_narratives(actor_id);
CREATE INDEX IF NOT EXISTS idx_actor_relevance_hist      ON actor_relevance_history(actor_id, recorded_at DESC);

-- ── Seed: 24 figuras públicas iniciales (idempotente vía ON CONFLICT) ────────
INSERT INTO actors (name, party, party_color, role, bio, source, relevance_score, exposure, approval, sentiment) VALUES
  ('Pedro Sánchez',           'PSOE',  '#E03A3E', 'Presidente del Gobierno',         'Secretario General del PSOE desde 2017.',          'manual', 96, 96, 38, 'down'),
  ('Alberto Núñez Feijóo',    'PP',    '#1F77FF', 'Líder de la oposición',           'Presidente del PP desde 2022.',                    'manual', 91, 91, 42, 'up'),
  ('Santiago Abascal',        'VOX',   '#5BC035', 'Presidente',                       'Líder y fundador de VOX.',                          'manual', 78, 78, 28, 'stable'),
  ('Yolanda Díaz',            'Sumar', '#D81E5B', 'Vicepresidenta segunda',          'Ministra de Trabajo y líder de Sumar.',            'manual', 74, 74, 36, 'down'),
  ('Isabel Díaz Ayuso',       'PP',    '#1F77FF', 'Presidenta CAM',                  'Presidenta de la Comunidad de Madrid.',            'manual', 88, 88, 45, 'up'),
  ('Carles Puigdemont',       'Junts', '#00C2A8', 'Presidente',                       'Expresidente de la Generalitat.',                  'manual', 71, 71, 22, 'stable'),
  ('Oriol Junqueras',         'ERC',   '#F4B400', 'Presidente',                       'Líder histórico de ERC.',                          'manual', 58, 58, 27, 'down'),
  ('Ione Belarra',            'Podemos','#6E2A78','Secretaria General',              'Líder de Podemos desde 2021.',                     'manual', 49, 49, 19, 'down'),
  ('Andoni Ortuzar',          'PNV',   '#1D8042', 'Presidente EBB',                   'Presidente del PNV desde 2013.',                   'manual', 41, 41, 35, 'stable'),
  ('Aitor Esteban',           'PNV',   '#1D8042', 'Portavoz Congreso',               'Portavoz del PNV en el Congreso.',                 'manual', 47, 47, 38, 'stable'),
  ('Gabriel Rufián',          'ERC',   '#F4B400', 'Portavoz Congreso',               'Portavoz de ERC en el Congreso.',                  'manual', 62, 62, 24, 'up'),
  ('Iván Espinosa de los Monteros','Independiente','#94A3B8','Empresario',           'Ex portavoz parlamentario de VOX.',                'manual', 38, 38, 32, 'stable'),
  ('Cuca Gamarra',            'PP',    '#1F77FF', 'Secretaria General',              'Secretaria General del PP.',                        'manual', 55, 55, 31, 'stable'),
  ('Félix Bolaños',           'PSOE',  '#E03A3E', 'Ministro de Justicia',            'Ministro de la Presidencia y Justicia.',            'manual', 67, 67, 33, 'down'),
  ('Patxi López',             'PSOE',  '#E03A3E', 'Portavoz Congreso',               'Portavoz del PSOE en el Congreso.',                 'manual', 53, 53, 36, 'stable'),
  ('Mertxe Aizpurua',         'Bildu', '#A4D65E', 'Portavoz Congreso',               'Portavoz de EH Bildu en el Congreso.',              'manual', 44, 44, 26, 'up'),
  ('María Jesús Montero',     'PSOE',  '#E03A3E', 'Vicepresidenta primera',          'Vicepresidenta y ministra de Hacienda.',            'manual', 64, 64, 32, 'down'),
  ('Borja Sémper',            'PP',    '#1F77FF', 'Portavoz nacional',               'Vicesecretario de Cultura del PP.',                 'manual', 51, 51, 37, 'up'),
  ('Pablo Bustinduy',         'Sumar', '#D81E5B', 'Ministro Derechos Sociales',      'Ministro y dirigente de Sumar.',                    'manual', 39, 39, 29, 'stable'),
  ('Salvador Illa',           'PSOE',  '#E03A3E', 'Presidente Generalitat',          'Presidente de la Generalitat de Cataluña.',         'manual', 69, 69, 41, 'up'),
  ('Jorge Buxadé',            'VOX',   '#5BC035', 'Eurodiputado',                    'Vicepresidente de Acción Política de VOX.',         'manual', 35, 35, 23, 'stable'),
  ('Ernest Urtasun',          'Sumar', '#D81E5B', 'Ministro de Cultura',             'Ministro y dirigente de Sumar.',                    'manual', 42, 42, 28, 'stable'),
  ('Marta Lois',              'Sumar', '#D81E5B', 'Portavoz Congreso',               'Portavoz de Sumar en el Congreso.',                 'manual', 31, 31, 25, 'down'),
  ('Mariano Rajoy',           'PP',    '#1F77FF', 'Ex Presidente',                   'Expresidente del Gobierno (2011-2018).',            'manual', 24, 24, 30, 'stable')
ON CONFLICT (name) DO NOTHING;
