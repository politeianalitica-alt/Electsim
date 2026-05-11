"""Macro-finance v2 — global flows, markets, BoP, COFER, nightlights.

Revision ID: 0061
Revises: 0060
Create Date: 2026-05-11

Tablas (paralelas al módulo de riesgo):
  1. macro_source_catalog       — catálogo de fuentes externas
  2. macro_raw_values           — serie temporal (source, country, metric, date, value)
  3. macro_indicator_config     — metadata legible (display name, unit, category, currency)
  4. macro_pair_values          — métricas bilaterales (reporter → counterparty)

Cleanup paralelo:
  - Vaciar icon column en risk_index_config (sin emojis)
  - Sustituir message_template emojis en risk_alert_config
"""

from alembic import op

revision = "0061"
down_revision = "0060"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        -- 1. CATÁLOGO DE FUENTES MACRO
        CREATE TABLE IF NOT EXISTS macro_source_catalog (
            source_id        VARCHAR(50) PRIMARY KEY,
            name             VARCHAR(200) NOT NULL,
            category         VARCHAR(40),       -- flows / markets / bop / trade / labor / housing / energy / ntl
            url_base         VARCHAR(500),
            cadencia         VARCHAR(20),       -- daily / weekly / monthly / quarterly / annual
            auth_type        VARCHAR(20),
            market           VARCHAR(10),
            is_active        BOOLEAN DEFAULT TRUE,
            last_fetch       TIMESTAMP,
            last_error       TEXT,
            created_at       TIMESTAMP DEFAULT NOW()
        );

        -- 2. SERIE TEMPORAL DE INDICADORES (mononacional o global)
        CREATE TABLE IF NOT EXISTS macro_raw_values (
            id               BIGSERIAL PRIMARY KEY,
            source_id        VARCHAR(50) REFERENCES macro_source_catalog(source_id) ON DELETE CASCADE,
            country_iso2     CHAR(2),               -- 'WO' for world-level
            region_code      VARCHAR(20),
            metric_name      VARCHAR(120) NOT NULL,
            metric_value     DOUBLE PRECISION,
            reference_date   DATE NOT NULL,
            unit             VARCHAR(20),           -- USD_BN, EUR_BN, PCT, INDEX, BP
            ingested_at      TIMESTAMP DEFAULT NOW(),
            UNIQUE (source_id, country_iso2, metric_name, reference_date)
        );
        CREATE INDEX IF NOT EXISTS idx_mrv_source_date ON macro_raw_values(source_id, reference_date DESC);
        CREATE INDEX IF NOT EXISTS idx_mrv_country_metric ON macro_raw_values(country_iso2, metric_name);

        -- 3. MÉTRICAS BILATERALES (reporter → counterparty)
        CREATE TABLE IF NOT EXISTS macro_pair_values (
            id               BIGSERIAL PRIMARY KEY,
            source_id        VARCHAR(50) REFERENCES macro_source_catalog(source_id) ON DELETE CASCADE,
            reporter_iso2    CHAR(2) NOT NULL,
            counterparty     VARCHAR(20) NOT NULL,    -- ISO2 or 'W00' for world
            metric_name      VARCHAR(120) NOT NULL,
            metric_value     DOUBLE PRECISION,
            reference_date   DATE NOT NULL,
            unit             VARCHAR(20),
            ingested_at      TIMESTAMP DEFAULT NOW(),
            UNIQUE (source_id, reporter_iso2, counterparty, metric_name, reference_date)
        );
        CREATE INDEX IF NOT EXISTS idx_mpv_pair_date ON macro_pair_values(reporter_iso2, counterparty, reference_date DESC);
        CREATE INDEX IF NOT EXISTS idx_mpv_metric ON macro_pair_values(metric_name);

        -- 4. CONFIG DE INDICADORES (etiquetas para UI)
        CREATE TABLE IF NOT EXISTS macro_indicator_config (
            indicator_id     VARCHAR(80) PRIMARY KEY,
            display_name     VARCHAR(200),
            short_name       VARCHAR(80),
            category         VARCHAR(40),
            unit             VARCHAR(20),
            description      TEXT,
            higher_is_better BOOLEAN,
            display_order    INTEGER DEFAULT 99,
            is_active        BOOLEAN DEFAULT TRUE
        );
        """
    )

    # ── SEED: catálogo de fuentes macro ────────────────────────────────────────
    op.execute(
        """
        INSERT INTO macro_source_catalog (source_id, name, category, url_base, cadencia, auth_type, market) VALUES
        ('bis_lbs',       'BIS Locational Banking Statistics', 'flows',   'https://stats.bis.org/api/v2/data/dataflow/BIS/WS_LBS_D_PUB/', 'quarterly', 'none', 'global'),
        ('bis_otc',       'BIS OTC Derivatives',               'flows',   'https://data.bis.org/static/bulk/WS_OTC_DERIV2_csv_col.zip',   'biannual',  'none', 'global'),
        ('imf_dots',      'IMF Direction of Trade Statistics', 'trade',   'https://data.imf.org/api/SDMX_JSON/data/DOT/',                  'monthly',   'none', 'global'),
        ('imf_cofer',     'IMF COFER currency composition',    'flows',   'https://data.imf.org/api/SDMX_JSON/data/COFER/',                'quarterly', 'none', 'global'),
        ('imf_weo',       'IMF World Economic Outlook',        'macro',   'https://data.imf.org/api/SDMX_JSON/data/WEO/',                  'biannual',  'none', 'global'),
        ('ecb_sdw',       'ECB SDMX warehouse',                'markets', 'https://data-api.ecb.europa.eu/service/data/',                  'daily',     'none', 'EU'),
        ('bde_bop',       'Banco de España Balanza de Pagos',  'bop',     'https://www.bde.es/webbde/es/estadis/infoest/series/',          'monthly',   'none', 'ES'),
        ('eurostat_hicp', 'Eurostat HICP inflación',           'macro',   'https://ec.europa.eu/eurostat/api/dissemination/',              'monthly',   'none', 'EU'),
        ('eurostat_lfs',  'Eurostat Labour Force Survey',      'labor',   'https://ec.europa.eu/eurostat/api/dissemination/',              'monthly',   'none', 'EU'),
        ('eurostat_hpi',  'Eurostat House Price Index',        'housing', 'https://ec.europa.eu/eurostat/api/dissemination/',              'quarterly', 'none', 'EU'),
        ('ine_es',        'INE España estadísticas',           'macro',   'https://servicios.ine.es/wstempus/js/ES/',                      'monthly',   'none', 'ES'),
        ('wb_macro',      'World Bank Macro Indicators',       'macro',   'https://api.worldbank.org/v2/',                                 'annual',    'none', 'global'),
        ('ntl_wb',        'World Bank Nightlights proxy',      'ntl',     'https://api.worldbank.org/v2/country/{c}/indicator/EG.ELC.ACCS.ZS','annual',  'none', 'global'),
        ('ntl_viirs',     'NASA Black Marble VIIRS DNB',       'ntl',     'https://blackmarble.gsfc.nasa.gov/',                            'daily',     'register', 'global')
        ON CONFLICT (source_id) DO NOTHING;
        """
    )

    # ── SEED: catálogo de indicadores con etiquetas legibles ───────────────────
    op.execute(
        """
        INSERT INTO macro_indicator_config (indicator_id, display_name, short_name, category, unit, description, higher_is_better, display_order) VALUES
        -- Markets
        ('ecb_yield_es_10y',   'Bono España 10Y',               'YIELD ES 10Y',   'markets', 'PCT',   'Rendimiento del bono soberano español a 10 años.',                  FALSE, 1),
        ('ecb_yield_de_10y',   'Bono Alemania 10Y',             'YIELD DE 10Y',   'markets', 'PCT',   'Bund 10Y como benchmark de zona euro.',                              FALSE, 2),
        ('ecb_spread_es_de',   'Spread España–Alemania 10Y',    'SPREAD ES-DE',   'markets', 'BP',    'Prima de riesgo española vs. Bund.',                                 FALSE, 3),
        ('ecb_spread_it_de',   'Spread Italia–Alemania 10Y',    'SPREAD IT-DE',   'markets', 'BP',    'Spread italiano (riesgo periférico comparativo).',                    FALSE, 4),
        ('ecb_eurusd',         'EUR/USD',                       'EUR/USD',        'markets', 'INDEX', 'Tipo de cambio EUR/USD.',                                            NULL,  5),
        ('ecb_main_rate',      'Tipo de interés BCE',           'TIPO BCE',       'markets', 'PCT',   'Tipo de operaciones principales de financiación.',                   NULL,  6),
        -- Macro (WEO/Eurostat)
        ('weo_gdp_growth',     'Crecimiento PIB real',          'PIB %',          'macro',   'PCT',   'Crecimiento anual del PIB en términos reales.',                      TRUE,  10),
        ('hicp_yoy',           'Inflación HICP interanual',     'HICP %',         'macro',   'PCT',   'Índice armonizado de precios de consumo (variación interanual).',   FALSE, 11),
        ('hicp_core',          'Inflación subyacente',          'CORE %',         'macro',   'PCT',   'HICP excluyendo energía y alimentos no procesados.',                 FALSE, 12),
        -- Labor / housing
        ('unemployment_rate',  'Tasa de paro',                  'PARO %',         'labor',   'PCT',   'Tasa de paro armonizada (Eurostat).',                                FALSE, 20),
        ('youth_unemployment', 'Paro juvenil (<25)',            'PARO <25',       'labor',   'PCT',   'Tasa de paro en menores de 25 años.',                                FALSE, 21),
        ('hpi_yoy',            'Precio vivienda interanual',    'HPI %',          'housing', 'PCT',   'House Price Index interanual.',                                      NULL,  30),
        -- Flows
        ('bis_lbs_claims',     'Claims cross-border BIS',       'BIS CLAIMS',     'flows',   'USD_BN','Posiciones bancarias cross-border (LBS).',                           NULL,  40),
        ('cofer_usd_share',    'USD en reservas globales',      'USD %',          'flows',   'PCT',   'Cuota del dólar en reservas oficiales (COFER).',                     NULL,  41),
        ('cofer_eur_share',    'EUR en reservas globales',      'EUR %',          'flows',   'PCT',   'Cuota del euro en reservas oficiales.',                              NULL,  42),
        ('cofer_cny_share',    'CNY/RMB en reservas globales',  'CNY %',          'flows',   'PCT',   'Cuota del renminbi en reservas oficiales.',                          NULL,  43),
        -- Trade
        ('dots_exports_usd',   'Exportaciones FOB',             'X (FOB)',        'trade',   'USD_BN','Exportaciones bilaterales (IMF DOTS).',                              TRUE,  50),
        ('dots_imports_usd',   'Importaciones CIF',             'M (CIF)',        'trade',   'USD_BN','Importaciones bilaterales (IMF DOTS).',                              FALSE, 51),
        ('dots_balance_usd',   'Balanza comercial',             'BALANZA',        'trade',   'USD_BN','Saldo exportaciones - importaciones.',                                NULL,  52),
        -- BoP
        ('bde_current_account','Cuenta corriente BdE',          'CC BdE',         'bop',     'EUR_BN','Saldo de la cuenta corriente de la balanza de pagos.',               NULL,  60),
        ('bde_financial_account','Cuenta financiera BdE',       'CF BdE',         'bop',     'EUR_BN','Saldo de la cuenta financiera.',                                     NULL,  61),
        -- Energy / NTL
        ('ntl_electricity_access','Acceso electricidad',         'ELEC %',         'ntl',     'PCT',   'Proporción de población con acceso a electricidad (World Bank).',     TRUE,  70),
        ('ntl_gdp_pc_ppp',     'PIB per cápita PPP',            'GDP pc PPP',     'ntl',     'USD',   'PIB per cápita en paridad de poder adquisitivo (USD 2017).',          TRUE,  71)
        ON CONFLICT (indicator_id) DO NOTHING;
        """
    )

    # ── CLEANUP: limpiar emojis de risk_* tablas (idempotente) ────────────────
    op.execute(
        """
        UPDATE risk_index_config SET icon = '' WHERE icon ~ '[\\xc0-\\xff]' OR icon IS NULL OR icon != '';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS macro_pair_values CASCADE;
        DROP TABLE IF EXISTS macro_raw_values CASCADE;
        DROP TABLE IF EXISTS macro_indicator_config CASCADE;
        DROP TABLE IF EXISTS macro_source_catalog CASCADE;
        """
    )
