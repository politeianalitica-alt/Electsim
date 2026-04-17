-- Seed: casas encuestadoras y fuentes macro para el agregador multi-fuente.
-- Ejecutar tras la migración 0011.

INSERT INTO casa_encuestadora (nombre, nombre_normalizado, metodologia, n_min_tipico, ambito, activa) VALUES
    ('CIS',              'cis',              'CATI/CAWI', 3000, 'nacional', TRUE),
    ('40dB',             '40db',             'CAWI',      2000, 'nacional', TRUE),
    ('GAD3',             'gad3',             'CATI',      1000, 'nacional', TRUE),
    ('Metroscopia',      'metroscopia',      'CAWI',      1500, 'nacional', TRUE),
    ('IMOP',             'imop',             'CATI',      1000, 'nacional', TRUE),
    ('NC Report',        'ncreport',         'CATI',      1000, 'nacional', TRUE),
    ('SigmaDos',         'sigmados',         'CATI',      1000, 'nacional', TRUE),
    ('Celeste-Tel',      'celestetel',       'CATI',      1000, 'nacional', TRUE),
    ('Sociométrica',     'sociometrica',     'CATI',      1000, 'nacional', TRUE),
    ('Invymark',         'invymark',         'CATI',      1000, 'nacional', TRUE),
    ('Simple Lógica',    'simplelogica',     'CAWI',      1000, 'nacional', TRUE),
    ('DYM',              'dym',              'CAWI',      1500, 'nacional', TRUE),
    ('Ipsos',            'ipsos',            'CAWI',      1000, 'nacional', TRUE),
    ('GESOP',            'gesop',            'CATI',      1000, 'nacional', TRUE),
    ('Electopanel',      'electopanel',      'PANEL',     2000, 'nacional', TRUE),
    ('Electograph',      'electograph',      'AGREGADOR', 0,    'nacional', TRUE),
    ('Europe Elects',    'europeelects',     'AGREGADOR', 0,    'nacional', TRUE),
    ('Wikipedia Polls',  'wikipediapolls',   'AGREGADOR', 0,    'nacional', TRUE),
    ('Key Data',         'keydata',          'CATI',      1000, 'nacional', TRUE),
    ('ikerfel',          'ikerfel',          'CATI',      800,  'autonomica', TRUE),
    ('Feedback',         'feedback',         'CATI',      800,  'autonomica', TRUE),
    ('MyWord',           'myword',           'CAWI',      800,  'nacional', TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- Peso inicial (neutral) — el backtest actualizará estos valores.
INSERT INTO casa_peso_vigente (casa_id, rating, decay_half_life, metodo)
SELECT id, 3.0, 14, 'bootstrap_neutral' FROM casa_encuestadora
ON CONFLICT (casa_id) DO NOTHING;

-- Ratings iniciales basados en literatura pública (AEDEMO / BBVA / FiveThirtyEight-like)
UPDATE casa_peso_vigente SET rating = 4.0 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'CIS');
UPDATE casa_peso_vigente SET rating = 4.3 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = '40dB');
UPDATE casa_peso_vigente SET rating = 3.9 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'GAD3');
UPDATE casa_peso_vigente SET rating = 4.1 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'Metroscopia');
UPDATE casa_peso_vigente SET rating = 3.8 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'IMOP');
UPDATE casa_peso_vigente SET rating = 3.3 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'NC Report');
UPDATE casa_peso_vigente SET rating = 3.7 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'SigmaDos');
UPDATE casa_peso_vigente SET rating = 3.0 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'Celeste-Tel');
UPDATE casa_peso_vigente SET rating = 3.9 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'Sociométrica');
UPDATE casa_peso_vigente SET rating = 3.6 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'Invymark');
UPDATE casa_peso_vigente SET rating = 3.6 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'Simple Lógica');
UPDATE casa_peso_vigente SET rating = 3.6 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'DYM');
UPDATE casa_peso_vigente SET rating = 3.8 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'Ipsos');
UPDATE casa_peso_vigente SET rating = 3.7 WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'GESOP');

-- Sesgos iniciales por casa (literatura AEDEMO / experiencias 2019-2023).
UPDATE casa_peso_vigente
SET bias_corr_json = '{"PP": 0.8, "PSOE": -0.4}'::jsonb
WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'GAD3');

UPDATE casa_peso_vigente
SET bias_corr_json = '{"VOX": 0.5}'::jsonb
WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'NC Report');

UPDATE casa_peso_vigente
SET bias_corr_json = '{"PP": 1.0}'::jsonb
WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = 'Celeste-Tel');

UPDATE casa_peso_vigente
SET bias_corr_json = '{"PP": -0.5, "VOX": 0.3}'::jsonb
WHERE casa_id = (SELECT id FROM casa_encuestadora WHERE nombre = '40dB');

-- ── Fuentes macro ─────────────────────────────────────────────────────────
INSERT INTO fuente_macro (codigo, proveedor, dataset, categoria, frecuencia, latencia_dias, volatilidad_revision, peso_base) VALUES
    ('INE_EPA',             'INE',       'Encuesta Población Activa',       'SOCIAL',   'TRIMESTRAL',  45,  0.20, 1.1),
    ('INE_IPC',             'INE',       'Índice Precios de Consumo',       'MACRO',    'MENSUAL',     15,  0.15, 1.2),
    ('INE_PIB',             'INE',       'Contabilidad Nacional Trimestral','MACRO',    'TRIMESTRAL',  60,  0.60, 1.0),
    ('BDE_TIPOS',           'BdE',       'Tipos de interés oficiales',      'MACRO',    'DIARIA',       1,  0.00, 0.8),
    ('BDE_MERCADOS',        'BdE',       'Mercados financieros',            'MERCADO',  'DIARIA',       1,  0.05, 0.9),
    ('EUROSTAT_PIB',        'Eurostat',  'GDP main aggregates',             'MACRO',    'TRIMESTRAL',  70,  0.55, 0.9),
    ('EUROSTAT_HICP',       'Eurostat',  'HICP inflation',                  'MACRO',    'MENSUAL',     20,  0.12, 0.9),
    ('EUROSTAT_UNEMPL',     'Eurostat',  'Unemployment rate',               'SOCIAL',   'MENSUAL',     30,  0.18, 0.9),
    ('OCDE_MEI',            'OCDE',      'Main Economic Indicators',        'MACRO',    'MENSUAL',     40,  0.35, 0.8),
    ('OCDE_CCI',            'OCDE',      'Consumer Confidence Index',       'SOCIAL',   'MENSUAL',     30,  0.25, 1.0),
    ('CIS_EXPECTATIVA',     'CIS',       'Expectativas ecónomicas barómetro','SOCIAL',  'MENSUAL',     15,  0.30, 1.1),
    ('REE_DEMANDA',         'REE',       'Demanda eléctrica',               'ENERGIA',  'DIARIA',       1,  0.02, 0.6),
    ('CNMC_ENERGIA',        'CNMC',      'Precios mayoristas energía',      'ENERGIA',  'DIARIA',       1,  0.05, 0.6),
    ('IBEX35',              'BME',       'Índice IBEX 35',                  'MERCADO',  'DIARIA',       0,  0.00, 0.7)
ON CONFLICT (codigo) DO NOTHING;
