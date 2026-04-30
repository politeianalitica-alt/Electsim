"""
Tests del loader de productos (config.product_loader).
Usan los YAML reales de config/products/ — no hay mocks de ficheros.
"""
from __future__ import annotations

import pytest

from config.product_loader import (
    ProductNotFoundError,
    invalidate_cache,
    list_available_products,
    list_base_products,
    list_dlcs,
    load_product_config,
)
from config.product_models import ProductConfig


# ---------------------------------------------------------------------------
# Fixture: invalida cache antes de cada test
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _clear_cache():
    invalidate_cache()
    yield
    invalidate_cache()


# ---------------------------------------------------------------------------
# Tests de list_available_products
# ---------------------------------------------------------------------------

class TestListAvailableProducts:
    def test_spain_includes_war_room(self):
        codes = list_available_products("spain")
        assert "war_room_electoral_spain" in codes

    def test_spain_includes_regulatory_radar(self):
        codes = list_available_products("spain")
        assert "regulatory_radar_spain" in codes

    def test_spain_includes_dlc_energy(self):
        codes = list_available_products("spain")
        assert "dlc_energy_spain" in codes

    def test_spain_includes_dlc_defence(self):
        codes = list_available_products("spain")
        assert "dlc_defence_spain" in codes

    def test_spain_includes_dlc_housing(self):
        codes = list_available_products("spain")
        assert "dlc_housing_spain" in codes

    def test_no_market_filter_returns_all(self):
        all_codes = list_available_products()
        spain_codes = list_available_products("spain")
        eu_codes = list_available_products("eu")
        assert len(all_codes) >= len(spain_codes)
        assert len(all_codes) >= len(eu_codes)

    def test_eu_includes_brussels_advanced(self):
        codes = list_available_products("eu")
        assert "brussels_advanced" in codes

    def test_unknown_market_returns_empty(self):
        codes = list_available_products("nonexistent_market_xyz")
        assert codes == []

    def test_schema_files_excluded(self):
        all_codes = list_available_products()
        assert not any(c.startswith("_") for c in all_codes)


class TestListBaseProducts:
    def test_returns_only_base_products(self):
        codes = list_base_products("spain")
        assert "war_room_electoral_spain" in codes
        assert "regulatory_radar_spain" in codes

    def test_excludes_dlcs(self):
        codes = list_base_products("spain")
        assert "dlc_energy_spain" not in codes
        assert "dlc_defence_spain" not in codes

    def test_eu_base_products(self):
        codes = list_base_products("eu")
        assert "brussels_advanced" in codes


class TestListDLCs:
    def test_returns_only_dlcs(self):
        codes = list_dlcs("spain")
        assert "dlc_energy_spain" in codes
        assert "dlc_defence_spain" in codes
        assert "dlc_housing_spain" in codes

    def test_excludes_base_products(self):
        codes = list_dlcs("spain")
        assert "war_room_electoral_spain" not in codes
        assert "regulatory_radar_spain" not in codes


# ---------------------------------------------------------------------------
# Tests de load_product_config — war_room_electoral_spain
# ---------------------------------------------------------------------------

class TestLoadWarRoomElectoral:
    @pytest.fixture
    def cfg(self) -> ProductConfig:
        return load_product_config("war_room_electoral_spain")

    def test_returns_product_config(self, cfg):
        assert isinstance(cfg, ProductConfig)

    def test_code_matches(self, cfg):
        assert cfg.code == "war_room_electoral_spain"

    def test_market_is_spain(self, cfg):
        assert cfg.market == "spain"

    def test_type_is_base_product(self, cfg):
        assert cfg.type == "base_product"
        assert cfg.is_base_product
        assert not cfg.is_dlc

    def test_has_electoral_core_module(self, cfg):
        assert "electoral_core" in cfg.modules

    def test_has_electoral_nowcasting_module(self, cfg):
        assert "electoral_nowcasting" in cfg.modules

    def test_has_media_narrative_module(self, cfg):
        assert "media_narrative" in cfg.modules

    def test_modules_deduplicated(self, cfg):
        assert len(cfg.modules) == len(set(cfg.modules))

    def test_has_default_workspace(self, cfg):
        assert cfg.default_workspace is not None
        assert cfg.default_workspace.name

    def test_default_workspace_has_client_profile(self, cfg):
        profile = cfg.default_workspace.client_profile
        assert "sector" in profile

    def test_has_alerts(self, cfg):
        assert len(cfg.alerts) >= 2

    def test_poll_movement_alert_exists(self, cfg):
        codes = cfg.alert_codes
        assert "poll_movement_2pp" in codes

    def test_narrative_attack_alert_exists(self, cfg):
        codes = cfg.alert_codes
        assert "narrative_attack_leader" in codes

    def test_alert_has_valid_level(self, cfg):
        valid_levels = {"info", "medium", "high", "critical"}
        for alert in cfg.alerts:
            assert alert.level in valid_levels

    def test_alert_has_conditions(self, cfg):
        for alert in cfg.alerts:
            assert alert.conditions is not None
            assert alert.conditions.type

    def test_has_saved_searches(self, cfg):
        assert len(cfg.saved_searches) >= 2

    def test_all_electoral_law_search_exists(self, cfg):
        codes = cfg.saved_search_codes
        assert "all_electoral_law" in codes

    def test_saved_search_types_valid(self, cfg):
        for s in cfg.saved_searches:
            assert s.type in ("search", "watchlist")

    def test_has_dashboards(self, cfg):
        assert len(cfg.dashboards) >= 1

    def test_war_room_main_dashboard_exists(self, cfg):
        codes = cfg.dashboard_codes
        assert "war_room_main" in codes

    def test_dashboard_has_widgets(self, cfg):
        for dashboard in cfg.dashboards:
            assert len(dashboard.widgets) >= 1


# ---------------------------------------------------------------------------
# Tests de load_product_config — dlc_energy_spain
# ---------------------------------------------------------------------------

class TestLoadDLCEnergy:
    @pytest.fixture
    def cfg(self) -> ProductConfig:
        return load_product_config("dlc_energy_spain")

    def test_is_dlc(self, cfg):
        assert cfg.is_dlc
        assert not cfg.is_base_product

    def test_has_regulatory_energy_module(self, cfg):
        assert "regulatory_energy" in cfg.modules

    def test_has_geopolitics_module(self, cfg):
        assert "geopolitics" in cfg.modules

    def test_cnmc_alert_exists(self, cfg):
        assert "cnmc_resolution_energy" in cfg.alert_codes

    def test_energy_regulation_search_exists(self, cfg):
        assert "energy_regulation" in cfg.saved_search_codes

    def test_no_default_workspace(self, cfg):
        # Los DLCs no crean workspace propio
        assert cfg.default_workspace is None


# ---------------------------------------------------------------------------
# Tests de load_product_config — regulatory_radar_spain
# ---------------------------------------------------------------------------

class TestLoadRegulatoryRadar:
    @pytest.fixture
    def cfg(self) -> ProductConfig:
        return load_product_config("regulatory_radar_spain")

    def test_is_base_product(self, cfg):
        assert cfg.is_base_product

    def test_has_legislative_modules(self, cfg):
        assert "legislative_core" in cfg.modules
        assert "legislative_advanced" in cfg.modules

    def test_boe_alert_exists(self, cfg):
        assert "boe_relevant_norm" in cfg.alert_codes

    def test_has_default_workspace(self, cfg):
        assert cfg.default_workspace is not None


# ---------------------------------------------------------------------------
# Tests de error handling
# ---------------------------------------------------------------------------

class TestLoaderErrors:
    def test_nonexistent_product_raises(self):
        with pytest.raises(ProductNotFoundError):
            load_product_config("producto_que_no_existe_xyz")

    def test_error_message_includes_code(self):
        with pytest.raises(ProductNotFoundError) as exc:
            load_product_config("nonexistent_product")
        assert "nonexistent_product" in str(exc.value)

    def test_cache_invalidation_works(self):
        cfg1 = load_product_config("war_room_electoral_spain")
        invalidate_cache()
        cfg2 = load_product_config("war_room_electoral_spain")
        # Mismos datos, objetos distintos (cache limpiado)
        assert cfg1.code == cfg2.code
        assert cfg1 is not cfg2
