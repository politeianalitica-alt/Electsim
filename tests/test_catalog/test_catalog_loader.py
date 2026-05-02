"""
Tests para config/catalog_loader.py — carga del catalogo dinamico desde BD.

Estrategia: se usa una BD SQLite en memoria con las tablas catalog_* creadas
manualmente, sin Alembic, para evitar dependencia de PostgreSQL.
Los tests son rapidos y no requieren servicios externos.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from config.catalog_loader import CatalogLoader, MarketNotInCatalogError
from config.catalog_models import (
    CatalogMarket,
    CatalogModule,
    CatalogProduct,
    CatalogSector,
    CatalogSource,
)


# ---------------------------------------------------------------------------
# Fixtures de BD en memoria
# ---------------------------------------------------------------------------

def _create_tables(conn) -> None:
    """Crea las tablas catalog_* en SQLite (subset de columnas necesario para tests)."""
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS catalog_market (
            id              TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
            market_id       TEXT NOT NULL UNIQUE,
            name            TEXT NOT NULL,
            scope           TEXT NOT NULL DEFAULT 'national',
            default_currency TEXT NOT NULL DEFAULT 'EUR',
            default_language TEXT NOT NULL DEFAULT 'es',
            default_locale  TEXT NOT NULL DEFAULT 'es-ES',
            timezone        TEXT NOT NULL DEFAULT 'Europe/Madrid',
            country_iso     TEXT,
            region_iso      TEXT,
            enabled         INTEGER NOT NULL DEFAULT 1,
            meta            TEXT NOT NULL DEFAULT '{}'
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS catalog_sector (
            id                  TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
            sector_id           TEXT NOT NULL UNIQUE,
            name                TEXT NOT NULL,
            parent_sector_id    TEXT,
            naics_nace_codes    TEXT NOT NULL DEFAULT '[]',
            applicable_markets  TEXT NOT NULL DEFAULT '["*"]',
            enabled             INTEGER NOT NULL DEFAULT 1,
            meta                TEXT NOT NULL DEFAULT '{}'
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS catalog_module (
            id                  TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
            module_id           TEXT NOT NULL UNIQUE,
            name                TEXT NOT NULL,
            description         TEXT,
            required_entities   TEXT NOT NULL DEFAULT '[]',
            required_sources    TEXT NOT NULL DEFAULT '[]',
            required_features   TEXT NOT NULL DEFAULT '[]',
            applicable_markets  TEXT NOT NULL DEFAULT '["*"]',
            applicable_sectors  TEXT NOT NULL DEFAULT '["*"]',
            enabled             INTEGER NOT NULL DEFAULT 1,
            meta                TEXT NOT NULL DEFAULT '{}'
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS catalog_product (
            id                  TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
            product_id          TEXT NOT NULL UNIQUE,
            name                TEXT NOT NULL,
            description         TEXT,
            is_dlc              INTEGER NOT NULL DEFAULT 0,
            default_modules     TEXT NOT NULL DEFAULT '[]',
            target_markets      TEXT NOT NULL DEFAULT '["*"]',
            target_sectors      TEXT NOT NULL DEFAULT '["*"]',
            config_overrides    TEXT NOT NULL DEFAULT '{}',
            price_tier          TEXT,
            enabled             INTEGER NOT NULL DEFAULT 1,
            meta                TEXT NOT NULL DEFAULT '{}'
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS catalog_source (
            id                  TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
            source_id           TEXT NOT NULL UNIQUE,
            name                TEXT NOT NULL,
            description         TEXT,
            kind                TEXT NOT NULL DEFAULT 'legislative',
            protocol            TEXT NOT NULL DEFAULT 'rest_json',
            base_url            TEXT,
            schedule_cron       TEXT NOT NULL DEFAULT '0 6 * * *',
            applicable_markets  TEXT NOT NULL DEFAULT '["*"]',
            applicable_sectors  TEXT NOT NULL DEFAULT '["*"]',
            config_json         TEXT NOT NULL DEFAULT '{}',
            enabled             INTEGER NOT NULL DEFAULT 1,
            requires_api_key    INTEGER NOT NULL DEFAULT 0,
            api_key_env_var     TEXT,
            meta                TEXT NOT NULL DEFAULT '{}'
        )
    """))
    conn.commit()


def _insert(conn, table: str, rows: List[Dict[str, Any]]) -> None:
    for row in rows:
        # Serializar listas/dicts a JSON para SQLite
        serialized = {
            k: json.dumps(v) if isinstance(v, (list, dict)) else v
            for k, v in row.items()
        }
        cols = ", ".join(serialized.keys())
        placeholders = ", ".join(f":{k}" for k in serialized)
        conn.execute(text(f"INSERT INTO {table} ({cols}) VALUES ({placeholders})"), serialized)
    conn.commit()


@pytest.fixture
def engine():
    eng = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    with eng.connect() as conn:
        _create_tables(conn)
    return eng


@pytest.fixture
def session(engine):
    with Session(engine) as s:
        yield s


@pytest.fixture
def populated_session(engine):
    """Sesion con datos de prueba precargados."""
    with engine.connect() as conn:
        _insert(conn, "catalog_market", [
            {"market_id": "ES", "name": "Espana", "scope": "national",
             "default_currency": "EUR", "default_language": "es",
             "default_locale": "es-ES", "timezone": "Europe/Madrid",
             "country_iso": "ES", "region_iso": None, "enabled": 1, "meta": {}},
            {"market_id": "EU", "name": "Union Europea", "scope": "supranational",
             "default_currency": "EUR", "default_language": "en",
             "default_locale": "en-EU", "timezone": "Europe/Brussels",
             "country_iso": None, "region_iso": None, "enabled": 1, "meta": {}},
            {"market_id": "ES-CAT", "name": "Cataluna", "scope": "regional",
             "default_currency": "EUR", "default_language": "ca",
             "default_locale": "ca-ES", "timezone": "Europe/Madrid",
             "country_iso": "ES", "region_iso": "ES-CT", "enabled": 1, "meta": {}},
            {"market_id": "DISABLED", "name": "Disabled Market", "scope": "national",
             "default_currency": "USD", "default_language": "en",
             "default_locale": "en-US", "timezone": "UTC",
             "country_iso": None, "region_iso": None, "enabled": 0, "meta": {}},
        ])
        _insert(conn, "catalog_sector", [
            {"sector_id": "PARTY", "name": "Partidos",
             "applicable_markets": ["ES", "EU", "ES-CAT"], "enabled": 1, "meta": {},
             "parent_sector_id": None, "naics_nace_codes": []},
            {"sector_id": "ENERGY", "name": "Energia",
             "applicable_markets": ["ES", "EU"], "enabled": 1, "meta": {},
             "parent_sector_id": None, "naics_nace_codes": ["D35"]},
            {"sector_id": "IBEX", "name": "IBEX 35",
             "applicable_markets": ["ES"], "enabled": 1, "meta": {},
             "parent_sector_id": None, "naics_nace_codes": []},
            {"sector_id": "DISABLED_SECTOR", "name": "Disabled",
             "applicable_markets": ["*"], "enabled": 0, "meta": {},
             "parent_sector_id": None, "naics_nace_codes": []},
        ])
        _insert(conn, "catalog_module", [
            {"module_id": "ELECTSIM", "name": "ElectSim",
             "required_sources": ["CIS_MICRODATOS", "MIR_ELECTORAL"],
             "required_entities": ["poll"], "required_features": [],
             "applicable_markets": ["ES", "ES-CAT"], "applicable_sectors": ["PARTY"],
             "enabled": 1, "meta": {}},
            {"module_id": "MONITOR_LEGISLATIVO", "name": "Monitor Legislativo",
             "required_sources": ["BOE", "CONGRESO_API"],
             "required_entities": ["legislative_item"], "required_features": [],
             "applicable_markets": ["ES", "EU"], "applicable_sectors": ["*"],
             "enabled": 1, "meta": {}},
            {"module_id": "GEO_RISK", "name": "Riesgo Geopolitico",
             "required_sources": ["GDELT", "ACLED"],
             "required_entities": ["geo_signal"], "required_features": [],
             "applicable_markets": ["*"], "applicable_sectors": ["DEFENCE", "GOV"],
             "enabled": 1, "meta": {}},
            {"module_id": "DISABLED_MODULE", "name": "Disabled",
             "required_sources": [], "required_entities": [], "required_features": [],
             "applicable_markets": ["*"], "applicable_sectors": ["*"],
             "enabled": 0, "meta": {}},
        ])
        _insert(conn, "catalog_product", [
            {"product_id": "PARTY_WARROOM_ES", "name": "Party War Room",
             "is_dlc": 0, "default_modules": ["ELECTSIM", "MONITOR_LEGISLATIVO"],
             "target_markets": ["ES", "ES-CAT"], "target_sectors": ["PARTY"],
             "config_overrides": {}, "price_tier": "pro", "enabled": 1, "meta": {}},
            {"product_id": "DLC_MICROSEG", "name": "DLC Microsegmentacion",
             "is_dlc": 1, "default_modules": ["ELECTSIM"],
             "target_markets": ["ES"], "target_sectors": ["PARTY"],
             "config_overrides": {}, "price_tier": None, "enabled": 1, "meta": {}},
            {"product_id": "DISABLED_PRODUCT", "name": "Disabled",
             "is_dlc": 0, "default_modules": [],
             "target_markets": ["*"], "target_sectors": ["*"],
             "config_overrides": {}, "price_tier": None, "enabled": 0, "meta": {}},
        ])
        _insert(conn, "catalog_source", [
            {"source_id": "BOE", "name": "BOE", "kind": "legislative",
             "protocol": "rest_json", "base_url": "https://boe.es/datosabiertos/api",
             "schedule_cron": "0 7 * * *",
             "applicable_markets": ["ES", "ES-CAT"], "applicable_sectors": ["*"],
             "config_json": {}, "enabled": 1, "requires_api_key": 0,
             "api_key_env_var": None, "meta": {}},
            {"source_id": "ACLED", "name": "ACLED", "kind": "geopolitical",
             "protocol": "rest_json", "base_url": "https://api.acleddata.com",
             "schedule_cron": "0 6 * * *",
             "applicable_markets": ["*"], "applicable_sectors": ["DEFENCE", "GOV"],
             "config_json": {}, "enabled": 1, "requires_api_key": 1,
             "api_key_env_var": "ACLED_API_KEY", "meta": {}},
            {"source_id": "CIS_MICRODATOS", "name": "CIS Microdatos", "kind": "electoral",
             "protocol": "http_bulk", "base_url": None,
             "schedule_cron": "0 10 * * 1",
             "applicable_markets": ["ES"], "applicable_sectors": ["PARTY"],
             "config_json": {}, "enabled": 1, "requires_api_key": 0,
             "api_key_env_var": None, "meta": {}},
            {"source_id": "DISABLED_SOURCE", "name": "Disabled", "kind": "press",
             "protocol": "rss", "base_url": None,
             "schedule_cron": "0 0 * * *",
             "applicable_markets": ["*"], "applicable_sectors": ["*"],
             "config_json": {}, "enabled": 0, "requires_api_key": 0,
             "api_key_env_var": None, "meta": {}},
        ])
    with Session(engine) as s:
        yield s


# ---------------------------------------------------------------------------
# TestCatalogLoaderGetMethods
# ---------------------------------------------------------------------------

class TestCatalogLoaderGetMethods:
    def test_get_market_existing(self, populated_session):
        loader = CatalogLoader(populated_session)
        market = loader.get_market("ES")
        assert isinstance(market, CatalogMarket)
        assert market.market_id == "ES"
        assert market.name == "Espana"

    def test_get_market_not_found_raises(self, populated_session):
        loader = CatalogLoader(populated_session)
        with pytest.raises(MarketNotInCatalogError, match="NONEXISTENT"):
            loader.get_market("NONEXISTENT")

    def test_get_market_caches_result(self, populated_session):
        loader = CatalogLoader(populated_session)
        m1 = loader.get_market("ES")
        m2 = loader.get_market("ES")
        assert m1 is m2

    def test_get_sector_existing(self, populated_session):
        loader = CatalogLoader(populated_session)
        sector = loader.get_sector("PARTY")
        assert isinstance(sector, CatalogSector)
        assert sector.sector_id == "PARTY"

    def test_get_sector_missing_returns_none(self, populated_session):
        loader = CatalogLoader(populated_session)
        result = loader.get_sector("NONEXISTENT")
        assert result is None

    def test_get_module_existing(self, populated_session):
        loader = CatalogLoader(populated_session)
        module = loader.get_module("ELECTSIM")
        assert isinstance(module, CatalogModule)
        assert "CIS_MICRODATOS" in module.required_sources

    def test_get_module_missing_returns_none(self, populated_session):
        loader = CatalogLoader(populated_session)
        assert loader.get_module("NONEXISTENT") is None

    def test_get_product_existing(self, populated_session):
        loader = CatalogLoader(populated_session)
        product = loader.get_product("PARTY_WARROOM_ES")
        assert isinstance(product, CatalogProduct)
        assert product.is_dlc is False

    def test_get_product_dlc(self, populated_session):
        loader = CatalogLoader(populated_session)
        product = loader.get_product("DLC_MICROSEG")
        assert product is not None
        assert product.is_dlc is True

    def test_get_source_existing(self, populated_session):
        loader = CatalogLoader(populated_session)
        source = loader.get_source("BOE")
        assert isinstance(source, CatalogSource)
        assert source.kind == "legislative"

    def test_get_source_with_api_key(self, populated_session):
        loader = CatalogLoader(populated_session)
        source = loader.get_source("ACLED")
        assert source is not None
        assert source.requires_api_key is True
        assert source.api_key_env_var == "ACLED_API_KEY"

    def test_get_source_missing_returns_none(self, populated_session):
        loader = CatalogLoader(populated_session)
        assert loader.get_source("NONEXISTENT") is None


# ---------------------------------------------------------------------------
# TestCatalogLoaderListMethods
# ---------------------------------------------------------------------------

class TestCatalogLoaderListMethods:
    def test_list_markets_returns_enabled_only_by_default(self, populated_session):
        loader = CatalogLoader(populated_session)
        markets = loader.list_markets()
        ids = [m.market_id for m in markets]
        assert "ES" in ids
        assert "EU" in ids
        assert "DISABLED" not in ids

    def test_list_markets_all(self, populated_session):
        loader = CatalogLoader(populated_session)
        markets = loader.list_markets(enabled_only=False)
        ids = [m.market_id for m in markets]
        assert "DISABLED" in ids

    def test_list_market_ids(self, populated_session):
        loader = CatalogLoader(populated_session)
        ids = loader.list_market_ids()
        assert "ES" in ids
        assert "DISABLED" not in ids

    def test_list_sectors_enabled_only(self, populated_session):
        loader = CatalogLoader(populated_session)
        sectors = loader.list_sectors()
        ids = [s.sector_id for s in sectors]
        assert "PARTY" in ids
        assert "DISABLED_SECTOR" not in ids

    def test_list_modules_enabled_only(self, populated_session):
        loader = CatalogLoader(populated_session)
        modules = loader.list_modules()
        ids = [m.module_id for m in modules]
        assert "ELECTSIM" in ids
        assert "DISABLED_MODULE" not in ids

    def test_list_modules_filter_by_market(self, populated_session):
        loader = CatalogLoader(populated_session)
        modules = loader.list_modules(market_id="ES")
        ids = [m.module_id for m in modules]
        assert "ELECTSIM" in ids
        assert "MONITOR_LEGISLATIVO" in ids

    def test_list_sources_enabled_only(self, populated_session):
        loader = CatalogLoader(populated_session)
        sources = loader.list_sources()
        ids = [s.source_id for s in sources]
        assert "BOE" in ids
        assert "DISABLED_SOURCE" not in ids

    def test_list_sources_filter_by_sector(self, populated_session):
        loader = CatalogLoader(populated_session)
        sources = loader.list_sources(sector_ids=["PARTY"])
        ids = [s.source_id for s in sources]
        assert "CIS_MICRODATOS" in ids

    def test_list_products_base_only(self, populated_session):
        loader = CatalogLoader(populated_session)
        products = loader.list_products(is_dlc=False)
        ids = [p.product_id for p in products]
        assert "PARTY_WARROOM_ES" in ids
        assert "DLC_MICROSEG" not in ids

    def test_list_products_dlc_only(self, populated_session):
        loader = CatalogLoader(populated_session)
        products = loader.list_products(is_dlc=True)
        ids = [p.product_id for p in products]
        assert "DLC_MICROSEG" in ids
        assert "PARTY_WARROOM_ES" not in ids


# ---------------------------------------------------------------------------
# TestCatalogLoaderResolveContext
# ---------------------------------------------------------------------------

class TestCatalogLoaderResolveContext:
    def test_resolve_basic_context(self, populated_session):
        loader = CatalogLoader(populated_session)
        ctx = loader.resolve_workspace_context(
            market_id="ES",
            sector_ids=["PARTY"],
            product_ids=["PARTY_WARROOM_ES"],
            modules_enabled=["ELECTSIM", "MONITOR_LEGISLATIVO"],
            sources_enabled_overrides={},
        )
        assert ctx.market.market_id == "ES"
        assert len(ctx.sectors) == 1
        assert ctx.sectors[0].sector_id == "PARTY"

    def test_resolve_includes_active_modules(self, populated_session):
        loader = CatalogLoader(populated_session)
        ctx = loader.resolve_workspace_context(
            market_id="ES",
            sector_ids=["PARTY"],
            product_ids=[],
            modules_enabled=["ELECTSIM"],
            sources_enabled_overrides={},
        )
        assert "ELECTSIM" in ctx.module_ids

    def test_resolve_excludes_disabled_modules(self, populated_session):
        loader = CatalogLoader(populated_session)
        ctx = loader.resolve_workspace_context(
            market_id="ES",
            sector_ids=["PARTY"],
            product_ids=[],
            modules_enabled=["ELECTSIM", "DISABLED_MODULE"],
            sources_enabled_overrides={},
        )
        assert "DISABLED_MODULE" not in ctx.module_ids

    def test_resolve_source_override_false_excludes(self, populated_session):
        loader = CatalogLoader(populated_session)
        ctx = loader.resolve_workspace_context(
            market_id="ES",
            sector_ids=["*"],
            product_ids=[],
            modules_enabled=[],
            sources_enabled_overrides={"BOE": False},
        )
        assert "BOE" not in ctx.source_ids

    def test_resolve_source_override_true_includes(self, populated_session):
        loader = CatalogLoader(populated_session)
        # ACLED aplica a "*" mercados pero a sectores DEFENCE/GOV, no PARTY
        ctx = loader.resolve_workspace_context(
            market_id="ES",
            sector_ids=["PARTY"],
            product_ids=[],
            modules_enabled=[],
            sources_enabled_overrides={"ACLED": True},
        )
        # Forzado ON aunque no aplique por defecto al sector PARTY
        assert "ACLED" in ctx.source_ids

    def test_resolve_includes_active_products(self, populated_session):
        loader = CatalogLoader(populated_session)
        ctx = loader.resolve_workspace_context(
            market_id="ES",
            sector_ids=["PARTY"],
            product_ids=["PARTY_WARROOM_ES"],
            modules_enabled=[],
            sources_enabled_overrides={},
        )
        assert "PARTY_WARROOM_ES" in [p.product_id for p in ctx.active_products]

    def test_resolve_unknown_market_raises(self, populated_session):
        loader = CatalogLoader(populated_session)
        with pytest.raises(MarketNotInCatalogError):
            loader.resolve_workspace_context(
                market_id="NONEXISTENT",
                sector_ids=["PARTY"],
                product_ids=[],
                modules_enabled=[],
                sources_enabled_overrides={},
            )

    def test_resolve_unknown_sector_skipped(self, populated_session):
        loader = CatalogLoader(populated_session)
        ctx = loader.resolve_workspace_context(
            market_id="ES",
            sector_ids=["PARTY", "NONEXISTENT_SECTOR"],
            product_ids=[],
            modules_enabled=[],
            sources_enabled_overrides={},
        )
        # Solo PARTY se incluye, NONEXISTENT se omite silenciosamente
        assert "PARTY" in ctx.sector_ids
        assert "NONEXISTENT_SECTOR" not in ctx.sector_ids

    def test_resolve_data_retention_passed_through(self, populated_session):
        loader = CatalogLoader(populated_session)
        ctx = loader.resolve_workspace_context(
            market_id="ES",
            sector_ids=[],
            product_ids=[],
            modules_enabled=[],
            sources_enabled_overrides={},
            data_retention_days=730,
        )
        assert ctx.data_retention_days == 730

    def test_resolve_alert_prefs_passed_through(self, populated_session):
        loader = CatalogLoader(populated_session)
        prefs = {"min_severity": "high", "channel": "email"}
        ctx = loader.resolve_workspace_context(
            market_id="ES",
            sector_ids=[],
            product_ids=[],
            modules_enabled=[],
            sources_enabled_overrides={},
            alert_prefs=prefs,
        )
        assert ctx.alert_prefs == prefs


# ---------------------------------------------------------------------------
# TestCatalogLoaderProvisioningHelpers
# ---------------------------------------------------------------------------

class TestCatalogLoaderProvisioningHelpers:
    def test_modules_for_product(self, populated_session):
        loader = CatalogLoader(populated_session)
        modules = loader.modules_for_product("PARTY_WARROOM_ES")
        ids = [m.module_id for m in modules]
        assert "ELECTSIM" in ids
        assert "MONITOR_LEGISLATIVO" in ids

    def test_modules_for_unknown_product_returns_empty(self, populated_session):
        loader = CatalogLoader(populated_session)
        modules = loader.modules_for_product("NONEXISTENT")
        assert modules == []

    def test_sources_for_modules(self, populated_session):
        loader = CatalogLoader(populated_session)
        sources = loader.sources_for_modules(["ELECTSIM"])
        ids = [s.source_id for s in sources]
        # ELECTSIM requires CIS_MICRODATOS and MIR_ELECTORAL (pero MIR no esta en seeds)
        assert "CIS_MICRODATOS" in ids

    def test_sources_for_empty_modules(self, populated_session):
        loader = CatalogLoader(populated_session)
        sources = loader.sources_for_modules([])
        assert sources == []

    def test_sources_for_multiple_modules_deduped(self, populated_session):
        loader = CatalogLoader(populated_session)
        # ELECTSIM requiere CIS_MICRODATOS; MONITOR_LEGISLATIVO requiere BOE
        sources = loader.sources_for_modules(["ELECTSIM", "MONITOR_LEGISLATIVO"])
        ids = [s.source_id for s in sources]
        # Sin duplicados
        assert len(ids) == len(set(ids))
        assert "BOE" in ids
        assert "CIS_MICRODATOS" in ids
