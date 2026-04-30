"""
Tests de carga y validacion de configuraciones de mercado.
No requieren BD ni FastAPI.
"""
from __future__ import annotations

import pytest

from config.market_loader import (
    MarketNotFoundError,
    invalidate_market_cache,
    list_available_markets,
    load_market_config,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_market_cache():
    """Limpia la cache antes y despues de cada test para evitar contaminacion."""
    invalidate_market_cache()
    yield
    invalidate_market_cache()


# ---------------------------------------------------------------------------
# list_available_markets
# ---------------------------------------------------------------------------

class TestListAvailableMarkets:
    def test_spain_is_available(self):
        markets = list_available_markets()
        assert "spain" in markets

    def test_demo_eu_is_available(self):
        markets = list_available_markets()
        assert "demo-eu" in markets

    def test_returns_sorted_list(self):
        markets = list_available_markets()
        assert markets == sorted(markets)

    def test_no_underscore_prefixed(self):
        markets = list_available_markets()
        assert all(not m.startswith("_") for m in markets)


# ---------------------------------------------------------------------------
# load_market_config — spain.yaml
# ---------------------------------------------------------------------------

class TestLoadSpainMarket:
    def test_loads_without_error(self):
        config = load_market_config("spain")
        assert config is not None

    def test_code_matches(self):
        config = load_market_config("spain")
        assert config.code == "spain"

    def test_default_locale(self):
        config = load_market_config("spain")
        assert config.default_locale == "es-ES"

    def test_locales_include_catalan(self):
        config = load_market_config("spain")
        assert "ca-ES" in config.locales

    def test_timezone(self):
        config = load_market_config("spain")
        assert config.timezone == "Europe/Madrid"

    def test_currency_eur(self):
        config = load_market_config("spain")
        assert config.currency == "EUR"

    def test_parties_not_empty(self):
        config = load_market_config("spain")
        assert len(config.parties) >= 4

    def test_pp_party_present(self):
        config = load_market_config("spain")
        pp = config.get_party("pp")
        assert pp is not None
        assert pp.name == "Partido Popular"
        assert pp.color_hex.startswith("#")

    def test_psoe_ideology_axes(self):
        config = load_market_config("spain")
        psoe = config.get_party("psoe")
        assert psoe is not None
        assert -1.0 <= psoe.ideology_axes.economic <= 1.0
        assert -1.0 <= psoe.ideology_axes.social <= 1.0

    def test_media_outlets_not_empty(self):
        config = load_market_config("spain")
        assert len(config.media_outlets) >= 3

    def test_elpais_has_rss_url(self):
        config = load_market_config("spain")
        elpais = config.get_media_outlet("elpais")
        assert elpais is not None
        assert elpais.rss_url is not None
        assert elpais.rss_url.startswith("http")

    def test_ingestion_sources_not_empty(self):
        config = load_market_config("spain")
        assert len(config.ingestion_sources) >= 3

    def test_boe_source_enabled(self):
        config = load_market_config("spain")
        boe = config.get_ingestion_source("boe")
        assert boe is not None
        assert boe.enabled is True
        assert boe.type == "legislation_boe"
        assert "api_base_url" in boe.params

    def test_media_rss_nacional_slug_list(self):
        config = load_market_config("spain")
        src = config.get_ingestion_source("media_rss_nacional")
        assert src is not None
        assert "outlets_slugs" in src.params
        assert len(src.params["outlets_slugs"]) >= 2

    def test_political_system_dhondt(self):
        config = load_market_config("spain")
        assert config.political_system.electoral_system.type == "dHondt"
        assert config.political_system.electoral_system.num_constituencies == 52

    def test_parliament_name(self):
        config = load_market_config("spain")
        assert "Congreso" in config.political_system.parliament.national.name

    def test_parties_by_slug_property(self):
        config = load_market_config("spain")
        by_slug = config.parties_by_slug
        assert "pp" in by_slug
        assert "psoe" in by_slug

    def test_party_color_map(self):
        config = load_market_config("spain")
        colors = config.party_color_map
        assert len(colors) == len(config.parties)
        assert all(v.startswith("#") for v in colors.values())

    def test_enabled_sources(self):
        config = load_market_config("spain")
        enabled = config.enabled_sources
        assert len(enabled) <= len(config.ingestion_sources)
        assert all(s.enabled for s in enabled)

    def test_dlcs_available(self):
        config = load_market_config("spain")
        assert len(config.dlcs_available) >= 1

    def test_cache_returns_same_object(self):
        config_a = load_market_config("spain")
        config_b = load_market_config("spain")
        assert config_a is config_b  # lru_cache devuelve la misma instancia


# ---------------------------------------------------------------------------
# load_market_config — demo-eu.yaml
# ---------------------------------------------------------------------------

class TestLoadDemoEuMarket:
    def test_loads_without_error(self):
        config = load_market_config("demo-eu")
        assert config is not None

    def test_code_matches(self):
        config = load_market_config("demo-eu")
        assert config.code == "demo-eu"

    def test_has_europarl_source(self):
        config = load_market_config("demo-eu")
        agenda = config.get_ingestion_source("europarl_agenda")
        assert agenda is not None
        assert agenda.type == "europarl_agenda"


# ---------------------------------------------------------------------------
# Errores
# ---------------------------------------------------------------------------

class TestLoadErrors:
    def test_raises_market_not_found(self):
        with pytest.raises(MarketNotFoundError):
            load_market_config("pais_inventado_xyz")

    def test_error_message_contains_code(self):
        with pytest.raises(MarketNotFoundError, match="nonexistent"):
            load_market_config("nonexistent")
