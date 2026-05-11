"""Risk Module v2 — DB-driven indices, scenarios, alerts.

Revision ID: 0060
Revises: 0059
Create Date: 2026-05-11

Diseño:
  TODA la configuración del módulo de riesgo vive en DB. El motor de cálculo
  (dashboard/services/risk_engine_v2.py) solo lee config + raw values y produce
  índices. Los pesos, umbrales, escenarios y alertas son editables desde la UI
  sin tocar código.

Tablas:
  1. risk_source_catalog          — qué fuentes externas existen
  2. risk_raw_values              — serie temporal de cada fuente
  3. risk_index_config            — los N índices compuestos (6 por defecto)
  4. risk_index_components        — cómo se construye cada índice (pesos)
  5. risk_thresholds              — umbrales BAJO/MEDIO/ALTO/CRÍTICO
  6. risk_index_values            — caché de scores calculados
  7. risk_scenario_config         — escenarios predictivos
  8. risk_scenario_predictions    — probabilidades calculadas
  9. risk_alert_config            — reglas de alerta
 10. risk_alerts_fired            — alertas disparadas (con ack)
"""

from alembic import op

revision = "0060"
down_revision = "0059"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        -- 1. CATÁLOGO DE FUENTES
        CREATE TABLE IF NOT EXISTS risk_source_catalog (
            source_id          VARCHAR(50) PRIMARY KEY,
            name               VARCHAR(200) NOT NULL,
            url_base           VARCHAR(500),
            auth_type          VARCHAR(20),
            cadencia           VARCHAR(20),
            last_fetch         TIMESTAMP,
            last_error         TEXT,
            is_active          BOOLEAN DEFAULT TRUE,
            market             VARCHAR(10),
            created_at         TIMESTAMP DEFAULT NOW()
        );

        -- 2. VALORES RAW (serie temporal por fuente/métrica/país)
        CREATE TABLE IF NOT EXISTS risk_raw_values (
            id                 BIGSERIAL PRIMARY KEY,
            source_id          VARCHAR(50) REFERENCES risk_source_catalog(source_id) ON DELETE CASCADE,
            country_iso2       CHAR(2),
            region_code        VARCHAR(20),
            metric_name        VARCHAR(100) NOT NULL,
            metric_value       DOUBLE PRECISION,
            reference_date     DATE NOT NULL,
            ingested_at        TIMESTAMP DEFAULT NOW(),
            UNIQUE(source_id, country_iso2, metric_name, reference_date)
        );
        CREATE INDEX IF NOT EXISTS idx_rrv_source_date ON risk_raw_values(source_id, reference_date DESC);
        CREATE INDEX IF NOT EXISTS idx_rrv_country_metric ON risk_raw_values(country_iso2, metric_name);

        -- 3. ÍNDICES COMPUESTOS (los KPI cards del dashboard)
        CREATE TABLE IF NOT EXISTS risk_index_config (
            index_id           VARCHAR(50) PRIMARY KEY,
            display_name       VARCHAR(100) NOT NULL,
            display_order      INTEGER DEFAULT 99,
            icon               VARCHAR(10),
            color_low          VARCHAR(7) DEFAULT '#22c55e',
            color_medium       VARCHAR(7) DEFAULT '#f59e0b',
            color_high         VARCHAR(7) DEFAULT '#ef4444',
            color_critical     VARCHAR(7) DEFAULT '#7f1d1d',
            description        TEXT,
            is_active          BOOLEAN DEFAULT TRUE,
            created_at         TIMESTAMP DEFAULT NOW()
        );

        -- 4. COMPONENTES DE CADA ÍNDICE (suma de pesos = 1)
        CREATE TABLE IF NOT EXISTS risk_index_components (
            id                 SERIAL PRIMARY KEY,
            index_id           VARCHAR(50) REFERENCES risk_index_config(index_id) ON DELETE CASCADE,
            source_id          VARCHAR(50) REFERENCES risk_source_catalog(source_id),
            metric_name        VARCHAR(100) NOT NULL,
            weight             DOUBLE PRECISION NOT NULL,
            transform          VARCHAR(20) DEFAULT 'none',
            normalize_method   VARCHAR(30) DEFAULT 'minmax_rolling_5y',
            country_filter     CHAR(2),
            is_active          BOOLEAN DEFAULT TRUE
        );
        CREATE INDEX IF NOT EXISTS idx_ric_index ON risk_index_components(index_id) WHERE is_active = TRUE;

        -- 5. UMBRALES
        CREATE TABLE IF NOT EXISTS risk_thresholds (
            index_id           VARCHAR(50) PRIMARY KEY REFERENCES risk_index_config(index_id) ON DELETE CASCADE,
            threshold_low      DOUBLE PRECISION NOT NULL DEFAULT 25,
            threshold_medium   DOUBLE PRECISION NOT NULL DEFAULT 50,
            threshold_high     DOUBLE PRECISION NOT NULL DEFAULT 75
        );

        -- 6. VALORES CALCULADOS DE ÍNDICES (caché)
        CREATE TABLE IF NOT EXISTS risk_index_values (
            id                 BIGSERIAL PRIMARY KEY,
            index_id           VARCHAR(50) REFERENCES risk_index_config(index_id) ON DELETE CASCADE,
            country_iso2       CHAR(2) NOT NULL,
            score              DOUBLE PRECISION,
            score_delta_7d     DOUBLE PRECISION,
            score_delta_30d    DOUBLE PRECISION,
            label              VARCHAR(20),
            calculated_at      TIMESTAMP DEFAULT NOW(),
            components_snapshot JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_riv_index_date ON risk_index_values(index_id, country_iso2, calculated_at DESC);

        -- 7. ESCENARIOS
        CREATE TABLE IF NOT EXISTS risk_scenario_config (
            scenario_id        VARCHAR(50) PRIMARY KEY,
            index_id           VARCHAR(50) REFERENCES risk_index_config(index_id),
            name               VARCHAR(200) NOT NULL,
            description        TEXT,
            trigger_conditions JSONB DEFAULT '{}',
            probability_model  VARCHAR(50) DEFAULT 'logistic',
            horizon_days       INTEGER DEFAULT 90,
            is_active          BOOLEAN DEFAULT TRUE
        );

        -- 8. PREDICCIONES (caché)
        CREATE TABLE IF NOT EXISTS risk_scenario_predictions (
            id                 BIGSERIAL PRIMARY KEY,
            scenario_id        VARCHAR(50) REFERENCES risk_scenario_config(scenario_id) ON DELETE CASCADE,
            country_iso2       CHAR(2) NOT NULL,
            probability        DOUBLE PRECISION,
            confidence_low     DOUBLE PRECISION,
            confidence_high    DOUBLE PRECISION,
            key_drivers        JSONB DEFAULT '{}',
            narrative          TEXT,
            calculated_at      TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_rsp_scenario_date ON risk_scenario_predictions(scenario_id, country_iso2, calculated_at DESC);

        -- 9. CONFIG DE ALERTAS
        CREATE TABLE IF NOT EXISTS risk_alert_config (
            alert_id           VARCHAR(50) PRIMARY KEY,
            index_id           VARCHAR(50) REFERENCES risk_index_config(index_id),
            trigger_type       VARCHAR(30) NOT NULL,    -- threshold_cross / delta_spike / scenario_prob
            trigger_value      DOUBLE PRECISION,
            severity           VARCHAR(20) DEFAULT 'warning',
            message_template   TEXT,
            is_active          BOOLEAN DEFAULT TRUE
        );

        -- 10. ALERTAS DISPARADAS
        CREATE TABLE IF NOT EXISTS risk_alerts_fired (
            id                 BIGSERIAL PRIMARY KEY,
            alert_id           VARCHAR(50) REFERENCES risk_alert_config(alert_id) ON DELETE CASCADE,
            country_iso2       CHAR(2) NOT NULL,
            fired_at           TIMESTAMP DEFAULT NOW(),
            value_at_fire      DOUBLE PRECISION,
            delta_at_fire      DOUBLE PRECISION,
            payload            JSONB DEFAULT '{}',
            acknowledged       BOOLEAN DEFAULT FALSE,
            acknowledged_at    TIMESTAMP,
            acknowledged_by    VARCHAR(100)
        );
        CREATE INDEX IF NOT EXISTS idx_raf_fired_at ON risk_alerts_fired(fired_at DESC) WHERE acknowledged = FALSE;
        """
    )

    # ── SEED: catálogo de fuentes ─────────────────────────────────────────────
    op.execute(
        """
        INSERT INTO risk_source_catalog (source_id, name, url_base, auth_type, cadencia, market) VALUES
        ('gpr_caldara',  'GPR Index Caldara-Iacoviello',  'https://www.matteoiacoviello.com/gpr_files/',         'none',          'weekly',    'global'),
        ('acled',        'ACLED Conflict Data',           'https://api.acleddata.com/acled/read',                'api_key',       'daily',     'global'),
        ('gdelt',        'GDELT BigQuery',                'bigquery://gdelt-bq.gdeltv2.events',                  'bigquery',      'realtime',  'global'),
        ('vdem',         'V-Dem Project',                 'https://v-dem.net/',                                  'pip_package',   'annual',    'global'),
        ('wgi',          'World Bank WGI',                'https://api.worldbank.org/v2/',                       'none',          'annual',    'global'),
        ('rsui',         'Reported Social Unrest Index',  'https://sites.google.com/view/philip-barrett/',       'none',          'monthly',   'global'),
        ('epu',          'Economic Policy Uncertainty',   'https://www.policyuncertainty.com/',                  'none',          'monthly',   'global'),
        ('cis',          'CIS Barómetros',                'https://www.cis.es/',                                 'none',          'monthly',   'ES'),
        ('metaculus',    'Metaculus Prediction Markets',  'https://www.metaculus.com/api2/',                     'none',          'realtime',  'global'),
        ('rsf',          'RSF Press Freedom Index',       'https://rsf.org/en/index',                            'scraping',      'annual',    'global'),
        ('idea_pei',     'IDEA Electoral Integrity',      'https://www.idea.int/',                               'register_free', 'annual',    'global'),
        ('bce_spreads',  'BCE Statistical Data Warehouse','https://sdw-wsrest.ecb.europa.eu/service/',           'none',          'daily',     'EU'),
        ('eurostat',     'Eurostat Regional Statistics',  'https://ec.europa.eu/eurostat/api/',                  'none',          'quarterly', 'EU'),
        ('rss_nlp',      'RSS Medios Propios NLP',        'internal',                                            'internal',      'realtime',  'ES')
        ON CONFLICT (source_id) DO NOTHING;
        """
    )

    # ── SEED: índices compuestos (los 6 KPIs) ─────────────────────────────────
    op.execute(
        """
        INSERT INTO risk_index_config (index_id, display_name, display_order, icon, color_low, color_medium, color_high, color_critical, description) VALUES
        ('riesgo_institucional', 'Estabilidad Institucional', 1, '🏛️', '#22c55e','#f59e0b','#ef4444','#7f1d1d', 'Calidad democrática, rule of law y autonomía institucional'),
        ('riesgo_electoral',     'Riesgo Electoral',          2, '🗳️', '#22c55e','#f59e0b','#ef4444','#7f1d1d', 'Fragmentación parlamentaria, desafección y anticipación electoral'),
        ('riesgo_geopolitico',   'Riesgo Geopolítico',        3, '🌍', '#22c55e','#f59e0b','#ef4444','#7f1d1d', 'Tensiones internacionales, conflictos próximos y cobertura adversa'),
        ('riesgo_economico',     'Riesgo Económico',          4, '📉', '#22c55e','#f59e0b','#ef4444','#7f1d1d', 'Incertidumbre económica, spreads y condiciones macroeconómicas'),
        ('riesgo_mediatico',     'Riesgo Mediático',          5, '📰', '#22c55e','#f59e0b','#ef4444','#7f1d1d', 'Polarización mediática, libertad de prensa y narrativas adversas'),
        ('riesgo_social',        'Riesgo Social',             6, '👥', '#22c55e','#f59e0b','#ef4444','#7f1d1d', 'Protestas, malestar ciudadano y desconfianza institucional')
        ON CONFLICT (index_id) DO NOTHING;
        """
    )

    # ── SEED: umbrales por defecto ────────────────────────────────────────────
    op.execute(
        """
        INSERT INTO risk_thresholds (index_id, threshold_low, threshold_medium, threshold_high) VALUES
        ('riesgo_institucional', 30, 55, 75),
        ('riesgo_electoral',     25, 50, 70),
        ('riesgo_geopolitico',   25, 50, 70),
        ('riesgo_economico',     25, 50, 70),
        ('riesgo_mediatico',     25, 50, 70),
        ('riesgo_social',        25, 50, 70)
        ON CONFLICT (index_id) DO NOTHING;
        """
    )

    # ── SEED: componentes (pesos por índice) ──────────────────────────────────
    op.execute(
        """
        INSERT INTO risk_index_components (index_id, source_id, metric_name, weight, transform, normalize_method, country_filter) VALUES
        -- INSTITUCIONAL
        ('riesgo_institucional','wgi',  'political_stability',     0.25,'none',   'minmax_rolling_5y','ES'),
        ('riesgo_institucional','wgi',  'rule_of_law',             0.25,'invert', 'minmax_rolling_5y','ES'),
        ('riesgo_institucional','wgi',  'gov_effectiveness',       0.20,'invert', 'minmax_rolling_5y','ES'),
        ('riesgo_institucional','vdem', 'v2x_jucon',               0.15,'invert', 'minmax_rolling_5y','ES'),
        ('riesgo_institucional','vdem', 'v2xcs_ccsi',              0.15,'invert', 'minmax_rolling_5y','ES'),
        -- ELECTORAL
        ('riesgo_electoral','cis',      'intencion_desafeccion',   0.30,'none',   'minmax_rolling_5y','ES'),
        ('riesgo_electoral','metaculus','prob_elecciones_ant',     0.30,'none',   'none',             'ES'),
        ('riesgo_electoral','idea_pei', 'pei_score',               0.20,'invert', 'minmax_rolling_5y','ES'),
        ('riesgo_electoral','vdem',     'v2xel_frefair',           0.20,'invert', 'minmax_rolling_5y','ES'),
        -- GEOPOLÍTICO
        ('riesgo_geopolitico','gpr_caldara','gpr_spain',           0.40,'none',   'minmax_rolling_5y','ES'),
        ('riesgo_geopolitico','acled',  'proximity_events',        0.25,'none',   'minmax_rolling_5y','ES'),
        ('riesgo_geopolitico','gdelt',  'tone_international',      0.25,'invert', 'minmax_rolling_5y','ES'),
        ('riesgo_geopolitico','metaculus','prob_crisis_intl',      0.10,'none',   'none',             'ES'),
        -- ECONÓMICO
        ('riesgo_economico','epu',      'epu_spain',               0.30,'none',   'minmax_rolling_5y','ES'),
        ('riesgo_economico','bce_spreads','spread_es_de_10y',      0.30,'none',   'minmax_rolling_5y','ES'),
        ('riesgo_economico','wgi',      'regulatory_quality',      0.20,'invert', 'minmax_rolling_5y','ES'),
        ('riesgo_economico','eurostat', 'unemployment_rate',       0.20,'none',   'minmax_rolling_5y','ES'),
        -- MEDIÁTICO
        ('riesgo_mediatico','rsf',      'press_freedom_score',     0.30,'invert', 'minmax_rolling_5y','ES'),
        ('riesgo_mediatico','vdem',     'v2mebias',                0.25,'none',   'minmax_rolling_5y','ES'),
        ('riesgo_mediatico','gdelt',    'tone_gov_coverage',       0.25,'invert', 'minmax_rolling_5y','ES'),
        ('riesgo_mediatico','rss_nlp',  'polarizacion_medios',     0.20,'none',   'minmax_rolling_5y','ES'),
        -- SOCIAL
        ('riesgo_social','rsui',        'rsui_spain',              0.35,'none',   'minmax_rolling_5y','ES'),
        ('riesgo_social','acled',       'protest_count_monthly',   0.30,'none',   'minmax_rolling_5y','ES'),
        ('riesgo_social','cis',         'confianza_institucional', 0.20,'invert', 'minmax_rolling_5y','ES'),
        ('riesgo_social','vdem',        'v2xcs_ccsi',              0.15,'invert', 'minmax_rolling_5y','ES')
        ON CONFLICT DO NOTHING;
        """
    )

    # ── SEED: escenarios predictivos ──────────────────────────────────────────
    op.execute(
        """
        INSERT INTO risk_scenario_config (scenario_id, index_id, name, description, trigger_conditions, probability_model, horizon_days) VALUES
        ('elecciones_anticipadas', 'riesgo_electoral',     'Elecciones Anticipadas <12 meses',
         'Probabilidad de convocatoria electoral antes del fin de legislatura.',
         '{"riesgo_electoral": ">60", "metaculus_prob_elec_ant": ">0.35"}'::jsonb,
         'logistic', 365),
        ('crisis_gobierno',        'riesgo_institucional', 'Crisis de Gobierno',
         'Moción de censura o dimisión del Ejecutivo.',
         '{"riesgo_institucional": ">65", "riesgo_electoral": ">55"}'::jsonb,
         'logistic', 180),
        ('escalada_geopolitica',   'riesgo_geopolitico',   'Escalada Geopolítica Regional',
         'Evento de alta intensidad en Mediterráneo / Magreb con impacto directo.',
         '{"gpr_caldara_delta_30d": ">15", "acled_proximity": ">70"}'::jsonb,
         'bayesian', 90),
        ('recesion_tecnica',       'riesgo_economico',     'Entrada en Recesión Técnica',
         'Dos trimestres consecutivos de contracción del PIB.',
         '{"epu_spain": ">70", "spread_es_de": ">200"}'::jsonb,
         'random_forest', 270),
        ('ola_protestas',          'riesgo_social',        'Ola de Protestas Sostenidas',
         'Movilización social masiva durante >4 semanas consecutivas.',
         '{"rsui_spain": ">70", "acled_protest_trend": "ascending_3w"}'::jsonb,
         'bayesian', 60),
        ('crisis_mediatica',       'riesgo_mediatico',     'Crisis Mediática Sostenida',
         'Polarización extrema con narrativa dominante adversa al gobierno.',
         '{"riesgo_mediatico": ">65", "polarizacion_medios": ">70"}'::jsonb,
         'logistic', 30)
        ON CONFLICT (scenario_id) DO NOTHING;
        """
    )

    # ── SEED: alertas configurables ───────────────────────────────────────────
    op.execute(
        """
        INSERT INTO risk_alert_config (alert_id, index_id, trigger_type, trigger_value, severity, message_template) VALUES
        ('alert_electoral_spike',   'riesgo_electoral',     'delta_spike',    10.0, 'warning',
         '{index_name} ha subido {delta} puntos en 7 días. Valor actual: {score}/100.'),
        ('alert_geo_critical',      'riesgo_geopolitico',   'threshold_cross',70.0, 'critical',
         '{index_name} ha cruzado el umbral ALTO ({score}/100). Revisar eventos ACLED y GPR.'),
        ('alert_social_medium',     'riesgo_social',        'threshold_cross',50.0, 'warning',
         'Riesgo Social en nivel MEDIO ({score}/100). RSUI y ACLED muestran tendencia ascendente.'),
        ('alert_inst_deterioro',    'riesgo_institucional', 'delta_spike',     5.0, 'warning',
         'Deterioro institucional detectado: subida de {delta} puntos en 30 días.'),
        ('alert_econ_critical',     'riesgo_economico',     'threshold_cross',75.0, 'critical',
         'Riesgo económico CRÍTICO ({score}/100). Spread + EPU disparados.'),
        ('alert_media_polarization','riesgo_mediatico',     'threshold_cross',65.0, 'warning',
         'Polarización mediática elevada ({score}/100). Revisar narrativas dominantes.')
        ON CONFLICT (alert_id) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS risk_alerts_fired CASCADE;
        DROP TABLE IF EXISTS risk_alert_config CASCADE;
        DROP TABLE IF EXISTS risk_scenario_predictions CASCADE;
        DROP TABLE IF EXISTS risk_scenario_config CASCADE;
        DROP TABLE IF EXISTS risk_index_values CASCADE;
        DROP TABLE IF EXISTS risk_thresholds CASCADE;
        DROP TABLE IF EXISTS risk_index_components CASCADE;
        DROP TABLE IF EXISTS risk_index_config CASCADE;
        DROP TABLE IF EXISTS risk_raw_values CASCADE;
        DROP TABLE IF EXISTS risk_source_catalog CASCADE;
        """
    )
