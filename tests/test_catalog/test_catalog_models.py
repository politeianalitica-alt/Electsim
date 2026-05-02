"""
Tests para config/catalog_models.py — modelos Pydantic del catalogo dinamico.

No requieren BD ni LLM. Tests puros de logica de modelos.
"""
from __future__ import annotations

import pytest

from config.catalog_models import (
    CatalogMarket,
    CatalogModule,
    CatalogProduct,
    CatalogSector,
    CatalogSource,
    WorkspaceCatalogContext,
)


# ---------------------------------------------------------------------------
# CatalogMarket
# ---------------------------------------------------------------------------

class TestCatalogMarket:
    def test_minimal_construction(self):
        m = CatalogMarket(market_id="ES", name="Espana")
        assert m.market_id == "ES"
        assert m.name == "Espana"
        assert m.enabled is True
        assert m.default_currency == "EUR"

    def test_supranational_market(self):
        m = CatalogMarket(
            market_id="EU",
            name="Union Europea",
            scope="supranational",
            country_iso=None,
        )
        assert m.scope == "supranational"
        assert m.country_iso is None

    def test_regional_market(self):
        m = CatalogMarket(
            market_id="ES-CAT",
            name="Cataluna",
            scope="regional",
            country_iso="ES",
            region_iso="ES-CT",
            default_language="ca",
        )
        assert m.scope == "regional"
        assert m.region_iso == "ES-CT"
        assert m.default_language == "ca"

    def test_meta_defaults_to_empty_dict(self):
        m = CatalogMarket(market_id="TEST", name="Test")
        assert m.meta == {}

    def test_disabled_market(self):
        m = CatalogMarket(market_id="DISABLED", name="Disabled", enabled=False)
        assert m.enabled is False


# ---------------------------------------------------------------------------
# CatalogSector
# ---------------------------------------------------------------------------

class TestCatalogSector:
    def test_applies_to_market_wildcard(self):
        s = CatalogSector(sector_id="PARTY", name="Partidos", applicable_markets=["*"])
        assert s.applies_to_market("ES") is True
        assert s.applies_to_market("EU") is True
        assert s.applies_to_market("ANY") is True

    def test_applies_to_market_explicit(self):
        s = CatalogSector(sector_id="IBEX", name="IBEX 35", applicable_markets=["ES"])
        assert s.applies_to_market("ES") is True
        assert s.applies_to_market("EU") is False
        assert s.applies_to_market("US") is False

    def test_parent_sector(self):
        s = CatalogSector(
            sector_id="ENERGY_RENEWABLES",
            name="Renovables",
            parent_sector_id="ENERGY",
        )
        assert s.parent_sector_id == "ENERGY"

    def test_naics_nace_codes_default_empty(self):
        s = CatalogSector(sector_id="X", name="X")
        assert s.naics_nace_codes == []

    def test_applicable_markets_default_wildcard(self):
        s = CatalogSector(sector_id="X", name="X")
        assert s.applicable_markets == ["*"]


# ---------------------------------------------------------------------------
# CatalogModule
# ---------------------------------------------------------------------------

class TestCatalogModule:
    def _make_module(self, **kwargs):
        defaults = {
            "module_id": "ELECTSIM",
            "name": "ElectSim",
            "applicable_markets": ["ES"],
            "applicable_sectors": ["PARTY"],
        }
        defaults.update(kwargs)
        return CatalogModule(**defaults)

    def test_applies_to_market_and_sector(self):
        m = self._make_module()
        assert m.applies_to("ES", "PARTY") is True

    def test_not_applies_wrong_market(self):
        m = self._make_module(applicable_markets=["ES"])
        assert m.applies_to("EU", "PARTY") is False

    def test_not_applies_wrong_sector(self):
        m = self._make_module(applicable_sectors=["PARTY"])
        assert m.applies_to("ES", "ENERGY") is False

    def test_applies_to_wildcard_markets(self):
        m = self._make_module(applicable_markets=["*"])
        assert m.applies_to("US", "PARTY") is True

    def test_applies_to_wildcard_sectors(self):
        m = self._make_module(applicable_sectors=["*"])
        assert m.applies_to("ES", "ENERGY") is True

    def test_required_sources_default_empty(self):
        m = self._make_module()
        assert m.required_sources == []

    def test_required_features_default_empty(self):
        m = self._make_module()
        assert m.required_features == []


# ---------------------------------------------------------------------------
# CatalogProduct
# ---------------------------------------------------------------------------

class TestCatalogProduct:
    def _make_product(self, **kwargs):
        defaults = {
            "product_id": "PARTY_WARROOM_ES",
            "name": "Party War Room",
            "target_markets": ["ES"],
            "target_sectors": ["PARTY"],
            "default_modules": ["ELECTSIM", "MONITOR_LEGISLATIVO"],
        }
        defaults.update(kwargs)
        return CatalogProduct(**defaults)

    def test_compatible_with_market_and_sector(self):
        p = self._make_product()
        assert p.compatible_with("ES", ["PARTY"]) is True

    def test_incompatible_wrong_market(self):
        p = self._make_product(target_markets=["ES"])
        assert p.compatible_with("EU", ["PARTY"]) is False

    def test_compatible_any_sector_in_list(self):
        p = self._make_product(target_sectors=["PARTY", "MEDIA"])
        assert p.compatible_with("ES", ["ENERGY", "PARTY"]) is True

    def test_incompatible_no_matching_sector(self):
        p = self._make_product(target_sectors=["PARTY"])
        assert p.compatible_with("ES", ["ENERGY", "BANKING"]) is False

    def test_wildcard_sector_always_compatible(self):
        p = self._make_product(target_sectors=["*"])
        assert p.compatible_with("ES", ["ENERGY"]) is True
        assert p.compatible_with("ES", ["IBEX"]) is True

    def test_is_dlc_defaults_false(self):
        p = self._make_product()
        assert p.is_dlc is False

    def test_dlc_product(self):
        p = self._make_product(is_dlc=True)
        assert p.is_dlc is True

    def test_default_modules_list(self):
        p = self._make_product()
        assert "ELECTSIM" in p.default_modules
        assert "MONITOR_LEGISLATIVO" in p.default_modules


# ---------------------------------------------------------------------------
# CatalogSource
# ---------------------------------------------------------------------------

class TestCatalogSource:
    def _make_source(self, **kwargs):
        defaults = {
            "source_id": "BOE",
            "name": "BOE",
            "kind": "legislative",
            "protocol": "rest_json",
            "applicable_markets": ["ES"],
            "applicable_sectors": ["*"],
        }
        defaults.update(kwargs)
        return CatalogSource(**defaults)

    def test_applies_to_market(self):
        s = self._make_source()
        assert s.applies_to_market("ES") is True
        assert s.applies_to_market("EU") is False

    def test_applies_to_sector_wildcard(self):
        s = self._make_source(applicable_sectors=["*"])
        assert s.applies_to_sector("PARTY") is True
        assert s.applies_to_sector("ENERGY") is True

    def test_applies_to_sector_explicit(self):
        s = self._make_source(applicable_sectors=["BANKING", "IBEX"])
        assert s.applies_to_sector("BANKING") is True
        assert s.applies_to_sector("PARTY") is False

    def test_applies_to_combined(self):
        s = self._make_source(
            applicable_markets=["ES"],
            applicable_sectors=["PARTY", "MEDIA"],
        )
        assert s.applies_to("ES", ["PARTY"]) is True
        assert s.applies_to("ES", ["ENERGY"]) is False
        assert s.applies_to("EU", ["PARTY"]) is False

    def test_applies_to_sector_list_any(self):
        s = self._make_source(applicable_sectors=["PARTY"])
        assert s.applies_to("ES", ["ENERGY", "PARTY"]) is True

    def test_requires_api_key_defaults_false(self):
        s = self._make_source()
        assert s.requires_api_key is False

    def test_source_with_api_key(self):
        s = self._make_source(requires_api_key=True, api_key_env_var="ACLED_API_KEY")
        assert s.requires_api_key is True
        assert s.api_key_env_var == "ACLED_API_KEY"

    def test_config_json_defaults_empty(self):
        s = self._make_source()
        assert s.config_json == {}

    def test_source_kind_values(self):
        kinds = ["legislative", "electoral", "socioeconomic", "press",
                 "geopolitical", "regulatory", "archive", "corporate"]
        for kind in kinds:
            s = self._make_source(kind=kind)
            assert s.kind == kind

    def test_source_protocol_values(self):
        protocols = ["rest_json", "rss", "rss_multi", "sparql", "http_bulk", "oai_pmh"]
        for protocol in protocols:
            s = self._make_source(protocol=protocol)
            assert s.protocol == protocol


# ---------------------------------------------------------------------------
# WorkspaceCatalogContext
# ---------------------------------------------------------------------------

class TestWorkspaceCatalogContext:
    def _make_context(self):
        market = CatalogMarket(market_id="ES", name="Espana")
        sectors = [
            CatalogSector(sector_id="PARTY", name="Partidos"),
            CatalogSector(sector_id="MEDIA", name="Medios"),
        ]
        modules = [
            CatalogModule(module_id="ELECTSIM", name="ElectSim"),
            CatalogModule(module_id="MONITOR_LEGISLATIVO", name="Monitor"),
        ]
        products = [
            CatalogProduct(product_id="PARTY_WARROOM_ES", name="War Room"),
        ]
        sources = [
            CatalogSource(source_id="BOE", name="BOE", kind="legislative", protocol="rest_json"),
            CatalogSource(source_id="CIS_MICRODATOS", name="CIS", kind="electoral", protocol="http_bulk"),
        ]
        return WorkspaceCatalogContext(
            market=market,
            sectors=sectors,
            active_modules=modules,
            active_products=products,
            active_sources=sources,
        )

    def test_module_ids(self):
        ctx = self._make_context()
        assert "ELECTSIM" in ctx.module_ids
        assert "MONITOR_LEGISLATIVO" in ctx.module_ids

    def test_source_ids(self):
        ctx = self._make_context()
        assert "BOE" in ctx.source_ids
        assert "CIS_MICRODATOS" in ctx.source_ids

    def test_sector_ids(self):
        ctx = self._make_context()
        assert "PARTY" in ctx.sector_ids
        assert "MEDIA" in ctx.sector_ids

    def test_has_module_true(self):
        ctx = self._make_context()
        assert ctx.has_module("ELECTSIM") is True

    def test_has_module_false(self):
        ctx = self._make_context()
        assert ctx.has_module("GEO_RISK") is False

    def test_has_source_true(self):
        ctx = self._make_context()
        assert ctx.has_source("BOE") is True

    def test_has_source_false(self):
        ctx = self._make_context()
        assert ctx.has_source("ACLED") is False

    def test_get_source_existing(self):
        ctx = self._make_context()
        src = ctx.get_source("BOE")
        assert src is not None
        assert src.source_id == "BOE"

    def test_get_source_missing_returns_none(self):
        ctx = self._make_context()
        src = ctx.get_source("NONEXISTENT")
        assert src is None

    def test_data_retention_days_default(self):
        ctx = self._make_context()
        assert ctx.data_retention_days == 365

    def test_alert_prefs_default_empty(self):
        ctx = self._make_context()
        assert ctx.alert_prefs == {}
