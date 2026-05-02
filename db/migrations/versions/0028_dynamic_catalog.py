"""
Migracion 0028 — Catalogo dinamico de mercados, sectores, modulos, productos y fuentes.

Principio: todo es datos, nada es if pais == 'ES'.
Agregar un pais, sector o producto = insertar filas, no tocar Python.

Crea:
  catalog_market          — mercados politicos/sectoriales soportados
  catalog_sector          — sectores de analisis (PARTY, ENERGY, BANKING, ...)
  catalog_module          — modulos funcionales de la plataforma
  catalog_product         — productos comerciales (combinacion de modulos)
  catalog_source          — fuentes de datos con protocolo y config

Altera:
  workspace               — ADD COLUMNS market_id, sector_ids, product_ids,
                            modules_enabled, sources_enabled_overrides,
                            data_retention_days, alert_prefs
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


revision = "0028"
down_revision = "0027"
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# Upgrade
# ---------------------------------------------------------------------------

def upgrade() -> None:

    # ------------------------------------------------------------------
    # catalog_market
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS catalog_market (
            id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            market_id           TEXT        NOT NULL UNIQUE,
            name                TEXT        NOT NULL,
            scope               TEXT        NOT NULL DEFAULT 'national',
            default_currency    TEXT        NOT NULL DEFAULT 'EUR',
            default_language    TEXT        NOT NULL DEFAULT 'es',
            default_locale      TEXT        NOT NULL DEFAULT 'es-ES',
            timezone            TEXT        NOT NULL DEFAULT 'Europe/Madrid',
            country_iso         TEXT,
            region_iso          TEXT,
            enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
            meta                JSONB       NOT NULL DEFAULT '{}',
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_catalog_market_enabled
            ON catalog_market (enabled)
    """)

    # ------------------------------------------------------------------
    # catalog_sector
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS catalog_sector (
            id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            sector_id           TEXT        NOT NULL UNIQUE,
            name                TEXT        NOT NULL,
            parent_sector_id    TEXT        REFERENCES catalog_sector (sector_id) ON DELETE SET NULL,
            naics_nace_codes    JSONB       NOT NULL DEFAULT '[]',
            applicable_markets  JSONB       NOT NULL DEFAULT '["*"]',
            enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
            meta                JSONB       NOT NULL DEFAULT '{}',
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_catalog_sector_parent
            ON catalog_sector (parent_sector_id)
            WHERE parent_sector_id IS NOT NULL
    """)

    # ------------------------------------------------------------------
    # catalog_module
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS catalog_module (
            id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            module_id           TEXT        NOT NULL UNIQUE,
            name                TEXT        NOT NULL,
            description         TEXT,
            required_entities   JSONB       NOT NULL DEFAULT '[]',
            required_sources    JSONB       NOT NULL DEFAULT '[]',
            required_features   JSONB       NOT NULL DEFAULT '[]',
            applicable_markets  JSONB       NOT NULL DEFAULT '["*"]',
            applicable_sectors  JSONB       NOT NULL DEFAULT '["*"]',
            enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
            meta                JSONB       NOT NULL DEFAULT '{}',
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_catalog_module_enabled
            ON catalog_module (enabled)
    """)

    # ------------------------------------------------------------------
    # catalog_product
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS catalog_product (
            id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id          TEXT        NOT NULL UNIQUE,
            name                TEXT        NOT NULL,
            description         TEXT,
            is_dlc              BOOLEAN     NOT NULL DEFAULT FALSE,
            default_modules     JSONB       NOT NULL DEFAULT '[]',
            target_markets      JSONB       NOT NULL DEFAULT '["*"]',
            target_sectors      JSONB       NOT NULL DEFAULT '["*"]',
            config_overrides    JSONB       NOT NULL DEFAULT '{}',
            price_tier          TEXT,
            enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
            meta                JSONB       NOT NULL DEFAULT '{}',
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_catalog_product_is_dlc
            ON catalog_product (is_dlc)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_catalog_product_enabled
            ON catalog_product (enabled)
    """)

    # ------------------------------------------------------------------
    # catalog_source
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS catalog_source (
            id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            source_id           TEXT        NOT NULL UNIQUE,
            name                TEXT        NOT NULL,
            description         TEXT,
            kind                TEXT        NOT NULL DEFAULT 'legislative',
            protocol            TEXT        NOT NULL DEFAULT 'rest_json',
            base_url            TEXT,
            schedule_cron       TEXT        NOT NULL DEFAULT '0 6 * * *',
            applicable_markets  JSONB       NOT NULL DEFAULT '["*"]',
            applicable_sectors  JSONB       NOT NULL DEFAULT '["*"]',
            config_json         JSONB       NOT NULL DEFAULT '{}',
            enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
            requires_api_key    BOOLEAN     NOT NULL DEFAULT FALSE,
            api_key_env_var     TEXT,
            meta                JSONB       NOT NULL DEFAULT '{}',
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_catalog_source_kind
            ON catalog_source (kind, enabled)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_catalog_source_enabled
            ON catalog_source (enabled)
    """)

    # ------------------------------------------------------------------
    # workspace — columnas del catalogo dinamico
    # ------------------------------------------------------------------
    _add_col_if_missing("workspace", "market_id", "TEXT REFERENCES catalog_market (market_id) ON DELETE SET NULL")
    _add_col_if_missing("workspace", "sector_ids", "JSONB NOT NULL DEFAULT '[]'")
    _add_col_if_missing("workspace", "product_ids", "JSONB NOT NULL DEFAULT '[]'")
    _add_col_if_missing("workspace", "modules_enabled", "JSONB NOT NULL DEFAULT '[]'")
    _add_col_if_missing("workspace", "sources_enabled_overrides", "JSONB NOT NULL DEFAULT '{}'")
    _add_col_if_missing("workspace", "data_retention_days", "INTEGER NOT NULL DEFAULT 365")
    _add_col_if_missing("workspace", "alert_prefs", "JSONB NOT NULL DEFAULT '{}'")

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_workspace_market_id
            ON workspace (market_id)
            WHERE market_id IS NOT NULL
    """)

    # ------------------------------------------------------------------
    # Seed inicial — mercados
    # ------------------------------------------------------------------
    op.execute("""
        INSERT INTO catalog_market (market_id, name, scope, default_currency, default_language, default_locale, timezone, country_iso, enabled)
        VALUES
          ('ES',  'Espana',              'national',  'EUR', 'es', 'es-ES', 'Europe/Madrid',    'ES', true),
          ('EU',  'Union Europea',       'supranational', 'EUR', 'en', 'en-EU', 'Europe/Brussels', NULL, true),
          ('ES-CAT', 'Cataluna',         'regional',  'EUR', 'ca', 'ca-ES', 'Europe/Madrid',    'ES', true),
          ('ES-AND', 'Andalucia',        'regional',  'EUR', 'es', 'es-ES', 'Europe/Madrid',    'ES', true),
          ('ES-MAD', 'Comunidad de Madrid', 'regional', 'EUR', 'es', 'es-ES', 'Europe/Madrid',  'ES', true)
        ON CONFLICT (market_id) DO NOTHING
    """)

    # ------------------------------------------------------------------
    # Seed inicial — sectores
    # ------------------------------------------------------------------
    op.execute("""
        INSERT INTO catalog_sector (sector_id, name, parent_sector_id, applicable_markets, enabled)
        VALUES
          ('PARTY',     'Partidos Politicos',        NULL,     '["ES","EU","ES-CAT","ES-AND","ES-MAD"]', true),
          ('ENERGY',    'Energia',                   NULL,     '["ES","EU"]', true),
          ('BANKING',   'Banca y Finanzas',          NULL,     '["ES","EU"]', true),
          ('TELCO',     'Telecomunicaciones',         NULL,     '["ES","EU"]', true),
          ('DEFENCE',   'Defensa e Industria',       NULL,     '["ES","EU"]', true),
          ('PHARMA',    'Farmacia y Sanidad',         NULL,     '["ES","EU"]', true),
          ('TRANSPORT', 'Transporte e Infraestructura', NULL,  '["ES","EU"]', true),
          ('MEDIA',     'Medios de Comunicacion',    NULL,     '["ES","EU"]', true),
          ('IBEX',      'IBEX 35 Corporativo',        NULL,    '["ES"]',      true),
          ('GOV',       'Administracion Publica',    NULL,     '["ES","EU"]', true)
        ON CONFLICT (sector_id) DO NOTHING
    """)

    # ------------------------------------------------------------------
    # Seed inicial — modulos
    # ------------------------------------------------------------------
    op.execute(r"""
        INSERT INTO catalog_module (module_id, name, description, required_entities, required_sources, applicable_markets, applicable_sectors, enabled)
        VALUES
          ('MONITOR_LEGISLATIVO', 'Monitor Legislativo', 'Seguimiento BOE, Congreso, Senado, EUR-Lex',
           '["actor","legislative_item"]', '["BOE","BOCG","CONGRESO_API","EUR_LEX"]', '["ES","EU"]', '["*"]', true),
          ('RISK_THERMOMETER',  'Termometro de Riesgo', 'Indices de riesgo politico y reputacional',
           '["actor","risk_snapshot"]', '["BOE","RSS_PRENSA","ACLED"]', '["*"]', '["*"]', true),
          ('ELECTSIM',          'ElectSim Electoral',   'Simulacion D''Hondt y nowcasting electoral',
           '["actor","constituency","poll"]', '["CIS_MICRODATOS","MIR_ELECTORAL","INE_REST"]', '["ES","ES-CAT","ES-AND","ES-MAD"]', '["PARTY"]', true),
          ('MEDIA_NARRATIVES',  'Narrativas de Medios', 'Analisis NLP de prensa y redes sociales',
           '["media_item","actor"]', '["RSS_PRENSA","RSS_REGIONAL"]', '["*"]', '["*"]', true),
          ('COMM_INTEL',        'Inteligencia de Comunicacion', 'Briefings y memos automatizados',
           '["actor","intelligence_briefing"]', '["BOE","RSS_PRENSA"]', '["*"]', '["*"]', true),
          ('GEO_RISK',          'Riesgo Geopolitico',  'Senales GDELT, ACLED, OSINT',
           '["geo_signal"]', '["GDELT","ACLED","OPENSANCTIONS"]', '["*"]', '["DEFENCE","ENERGY"]', true),
          ('REG_INTEL',         'Inteligencia Regulatoria', 'CNMC, BdE, AEMPS, EUR-Lex CELLAR',
           '["regulatory_item","actor"]', '["CNMC_RSS","BDE_RSS","EUR_LEX","BOE"]', '["ES","EU"]', '["BANKING","ENERGY","PHARMA","TELCO"]', true),
          ('REPORTING_ENGINE',  'Motor de Informes',    'Generacion automatica de informes PDF/DOCX',
           '["intelligence_briefing","risk_snapshot"]', '[]', '["*"]', '["*"]', true),
          ('MICROSEGMENTACION', 'Microsegmentacion',    'Perfiles CIS y analisis de transferencias de voto',
           '["poll","actor"]', '["CIS_MICRODATOS","INE_REST"]', '["ES","ES-CAT","ES-AND","ES-MAD"]', '["PARTY"]', true),
          ('IBEX_MONITOR',      'Monitor IBEX 35',      'CNMV hechos relevantes, contratacion publica',
           '["corporate_entity","regulatory_item"]', '["CNMV_RSS","PLACE_CONTRATACION","ICIJ_OFFSHORE"]', '["ES"]', '["IBEX","BANKING","ENERGY"]', true)
        ON CONFLICT (module_id) DO NOTHING
    """)

    # ------------------------------------------------------------------
    # Seed inicial — productos
    # ------------------------------------------------------------------
    op.execute("""
        INSERT INTO catalog_product (product_id, name, description, is_dlc, default_modules, target_markets, target_sectors, enabled)
        VALUES
          ('PARTY_WARROOM_ES', 'Party War Room (Espana)', 'Plataforma integral para partidos politicos espanoles',
           false,
           '["MONITOR_LEGISLATIVO","RISK_THERMOMETER","ELECTSIM","MEDIA_NARRATIVES","COMM_INTEL","REPORTING_ENGINE"]',
           '["ES","ES-CAT","ES-AND","ES-MAD"]',
           '["PARTY"]',
           true),
          ('IBEX_REG_RADAR', 'IBEX Regulatory Radar', 'Radar regulatorio para empresas del IBEX 35',
           false,
           '["MONITOR_LEGISLATIVO","REG_INTEL","RISK_THERMOMETER","IBEX_MONITOR","REPORTING_ENGINE"]',
           '["ES","EU"]',
           '["IBEX","BANKING","ENERGY","TELCO"]',
           true),
          ('GOV_DEFENCE_GEOINT', 'Government Defence GEOINT', 'Geointeligencia y defensa para entidades publicas',
           false,
           '["MONITOR_LEGISLATIVO","GEO_RISK","RISK_THERMOMETER","COMM_INTEL","REPORTING_ENGINE"]',
           '["ES","EU"]',
           '["GOV","DEFENCE"]',
           true),
          ('DLC_MICROSEG_ES', 'DLC Microsegmentacion Electoral', 'Modulo adicional: analisis CIS y perfiles de voto',
           true,
           '["MICROSEGMENTACION"]',
           '["ES","ES-CAT","ES-AND","ES-MAD"]',
           '["PARTY"]',
           true),
          ('DLC_MEDIA_EXTENDED', 'DLC Narrativas Extendidas', 'Modulo adicional: archivo BNE + hemeroteca historica',
           true,
           '["MEDIA_NARRATIVES"]',
           '["ES"]',
           '["*"]',
           true)
        ON CONFLICT (product_id) DO NOTHING
    """)

    # ------------------------------------------------------------------
    # Seed inicial — fuentes
    # ------------------------------------------------------------------
    op.execute(r"""
        INSERT INTO catalog_source (source_id, name, description, kind, protocol, base_url, schedule_cron, applicable_markets, applicable_sectors, enabled, requires_api_key, api_key_env_var)
        VALUES
          ('BOE', 'BOE — Boletin Oficial del Estado', 'API REST sumarios y textos completos',
           'legislative', 'rest_json', 'https://boe.es/datosabiertos/api', '0 7 * * *',
           '["ES"]', '["*"]', true, false, NULL),

          ('BOCG', 'BOCG — Boletin Congreso General', 'Actividad parlamentaria Congreso y Senado',
           'legislative', 'rss', 'https://www.congreso.es/es/busqueda-de-publicaciones', '0 8 * * *',
           '["ES"]', '["PARTY","GOV"]', true, false, NULL),

          ('CONGRESO_API', 'Congreso — API datos.congreso.es', 'Iniciativas, votaciones, diputados',
           'legislative', 'rest_json', 'https://datos.congreso.es/api/v2', '30 8 * * *',
           '["ES"]', '["PARTY","GOV"]', true, false, NULL),

          ('EUR_LEX', 'EUR-Lex CELLAR SPARQL', 'Legislacion y jurisprudencia europea via SPARQL',
           'legislative', 'sparql', 'https://publications.europa.eu/webapi/rdf/sparql', '0 9 * * *',
           '["EU","ES"]', '["*"]', true, false, NULL),

          ('CIS_MICRODATOS', 'CIS Microdatos', 'Encuestas y series historicas CIS en CSV',
           'electoral', 'http_bulk', 'https://www.cis.es/cis/export/sites/default/-Archivos/Microdatos', '0 10 * * 1',
           '["ES"]', '["PARTY"]', true, false, NULL),

          ('INE_REST', 'INE API REST', 'Estadisticas socioeconomicas y demograficas',
           'socioeconomic', 'rest_json', 'https://servicios.ine.es/wstempus/js', '0 11 * * 1',
           '["ES"]', '["*"]', true, false, NULL),

          ('MIR_ELECTORAL', 'MIR Resultados Electorales', 'Resultados electorales historicos por circunscripcion',
           'electoral', 'http_bulk', 'https://resultados.eleccionesgenerales23.es', '0 0 * * 0',
           '["ES"]', '["PARTY"]', true, false, NULL),

          ('RSS_PRENSA', 'RSS Prensa Nacional (top 15)', 'El Pais, El Mundo, ABC, La Vanguardia, El Confidencial...',
           'press', 'rss_multi', NULL, '*/30 * * * *',
           '["ES"]', '["*"]', true, false, NULL),

          ('RSS_REGIONAL', 'RSS Prensa Regional', 'Vocento grupo, Prensa Iberica grupo, nativos digitales',
           'press', 'rss_multi', NULL, '*/45 * * * *',
           '["ES","ES-CAT","ES-AND","ES-MAD"]', '["*"]', true, false, NULL),

          ('GDELT', 'GDELT Doc API', 'Monitorizacion de medios internacionales en tiempo real',
           'geopolitical', 'rest_json', 'https://api.gdeltproject.org/api/v2/doc/doc', '*/15 * * * *',
           '["*"]', '["DEFENCE","GOV","ENERGY"]', true, false, NULL),

          ('ACLED', 'ACLED — Conflicto y Estabilidad', 'Datos de conflicto armado y protestas politicas',
           'geopolitical', 'rest_json', 'https://api.acleddata.com/acled/read', '0 6 * * *',
           '["*"]', '["DEFENCE","GOV"]', true, true, 'ACLED_API_KEY'),

          ('OPENSANCTIONS', 'OpenSanctions Bulk', 'Personas y entidades en listas de sanciones',
           'geopolitical', 'http_bulk', 'https://data.opensanctions.org/datasets/latest/default/entities.ftm.json', '0 3 * * 1',
           '["*"]', '["BANKING","DEFENCE","GOV"]', true, false, NULL),

          ('CNMV_RSS', 'CNMV — Hechos Relevantes', 'Comunicaciones regulatorias de empresas cotizadas',
           'regulatory', 'rss', 'https://www.cnmv.es/portal/rss/HechosRelevantes.aspx', '*/20 * * * *',
           '["ES"]', '["IBEX","BANKING"]', true, false, NULL),

          ('BDE_RSS', 'Banco de Espana — Publicaciones', 'Notas de estabilidad financiera y circulares',
           'regulatory', 'rss', 'https://www.bde.es/bde/es/secciones/informes/rss/', '0 9 * * *',
           '["ES"]', '["BANKING"]', true, false, NULL),

          ('CNMC_RSS', 'CNMC — Resoluciones', 'Resoluciones de competencia y sectoriales',
           'regulatory', 'rss', 'https://www.cnmc.es/feed', '0 9 * * *',
           '["ES"]', '["ENERGY","TELCO","TRANSPORT"]', true, false, NULL),

          ('PLACE_CONTRATACION', 'PLACE — Contratacion Publica', 'Licitaciones y adjudicaciones del sector publico',
           'regulatory', 'rest_json', 'https://contrataciondelestado.es/wps/poc', '0 8 * * *',
           '["ES"]', '["IBEX","GOV","DEFENCE"]', true, false, NULL),

          ('ICIJ_OFFSHORE', 'ICIJ OffshoreLeaks', 'Entidades offshore (Panama Papers, Pandora Papers)',
           'geopolitical', 'http_bulk', 'https://offshoreleaks.icij.org/api/v1/bulk', '0 2 * * 0',
           '["*"]', '["BANKING","IBEX"]', true, false, NULL),

          ('BNE_HEMEROTECA', 'BNE Hemeroteca Digital', 'Archivo historico BNElab CSV+TXT dominio publico',
           'archive', 'http_bulk', 'https://datos.bne.es/resource/', '0 1 * * 0',
           '["ES"]', '["MEDIA","PARTY"]', true, false, NULL),

          ('WAYBACK_CDX', 'Wayback Machine CDX API', 'Snapshots de paginas web archivadas',
           'archive', 'rest_json', 'https://web.archive.org/cdx/search/cdx', '0 4 * * 0',
           '["*"]', '["*"]', true, false, NULL),

          ('AEMPS_RSS', 'AEMPS — Medicamentos', 'Alertas y autorizaciones de medicamentos',
           'regulatory', 'rss', 'https://www.aemps.gob.es/rss/', '0 10 * * *',
           '["ES"]', '["PHARMA"]', true, false, NULL)
        ON CONFLICT (source_id) DO NOTHING
    """)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _add_col_if_missing(table: str, column: str, definition: str) -> None:
    """Agrega columna solo si no existe (idempotente)."""
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :t AND column_name = :c"
    ), {"t": table, "c": column})
    if result.fetchone() is None:
        op.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}")


# ---------------------------------------------------------------------------
# Downgrade
# ---------------------------------------------------------------------------

def downgrade() -> None:
    # Columnas workspace
    for col in ("market_id", "sector_ids", "product_ids", "modules_enabled",
                "sources_enabled_overrides", "data_retention_days", "alert_prefs"):
        op.execute(f"ALTER TABLE workspace DROP COLUMN IF EXISTS {col}")

    op.execute("DROP INDEX IF EXISTS ix_workspace_market_id")

    op.execute("DROP TABLE IF EXISTS catalog_source CASCADE")
    op.execute("DROP TABLE IF EXISTS catalog_product CASCADE")
    op.execute("DROP TABLE IF EXISTS catalog_module CASCADE")
    op.execute("DROP TABLE IF EXISTS catalog_sector CASCADE")
    op.execute("DROP TABLE IF EXISTS catalog_market CASCADE")
