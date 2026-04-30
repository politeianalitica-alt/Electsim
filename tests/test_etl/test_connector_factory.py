"""
Tests de la fabrica de conectores ETL por mercado.
No requieren BD ni red.
"""
from __future__ import annotations

import pytest

from api.context.market_context import MarketContext
from config.market_loader import invalidate_market_cache, load_market_config
from config.market_models import IngestionSourceConfig, MarketConfig
from etl.factory import build_connectors_for_market
from etl.sources.base_connector import DataSourceConnector
from etl.sources.registry import CONNECTOR_REGISTRY, get_connector_class


@pytest.fixture(autouse=True)
def clear_cache():
    invalidate_market_cache()
    yield
    invalidate_market_cache()


def _make_market(sources: list[dict]) -> MarketContext:
    """Construye un MarketContext minimal con las fuentes indicadas."""
    raw_config = {
        "code": "test",
        "name": "Test Market",
        "default_locale": "es-ES",
        "locales": ["es-ES"],
        "timezone": "Europe/Madrid",
        "currency": "EUR",
        "political_system": {
            "country_iso": "XX",
            "electoral_system": {
                "type": "dHondt",
                "constituencies_source": "test",
                "num_constituencies": 1,
            },
            "parliament": {
                "national": {
                    "name": "Test Parliament",
                    "api_base_url": "http://example.com",
                    "chambers": ["lower"],
                }
            },
        },
        "ingestion_sources": sources,
    }
    config = MarketConfig.model_validate(raw_config)
    return MarketContext(market_code="test", config=config)


# ---------------------------------------------------------------------------
# Tests del registro
# ---------------------------------------------------------------------------

class TestConnectorRegistry:
    def test_registry_not_empty(self):
        assert len(CONNECTOR_REGISTRY) >= 3

    def test_legislation_boe_registered(self):
        cls = get_connector_class("legislation_boe")
        assert cls is not None
        assert issubclass(cls, DataSourceConnector)

    def test_media_rss_registered(self):
        cls = get_connector_class("media_rss")
        assert cls is not None
        assert issubclass(cls, DataSourceConnector)

    def test_polls_cis_registered(self):
        cls = get_connector_class("polls_cis")
        assert cls is not None

    def test_unknown_type_returns_none(self):
        cls = get_connector_class("tipo_que_no_existe_xyz")
        assert cls is None


# ---------------------------------------------------------------------------
# Tests de build_connectors_for_market
# ---------------------------------------------------------------------------

class TestBuildConnectorsForMarket:
    def test_returns_list(self):
        market = _make_market([
            {
                "id": "boe_test",
                "type": "legislation_boe",
                "enabled": True,
                "schedule_cron": "*/30 * * * *",
                "params": {"api_base_url": "https://api.boe.es"},
            }
        ])
        connectors = build_connectors_for_market(market)
        assert isinstance(connectors, list)
        assert len(connectors) == 1

    def test_connector_has_correct_source_id(self):
        market = _make_market([
            {
                "id": "mi_fuente_boe",
                "type": "legislation_boe",
                "enabled": True,
                "schedule_cron": "0 * * * *",
                "params": {},
            }
        ])
        connectors = build_connectors_for_market(market)
        assert connectors[0].source_id == "mi_fuente_boe"

    def test_params_injected_in_connector(self):
        params = {"api_base_url": "https://ejemplo.com", "sections": ["I", "III"]}
        market = _make_market([
            {
                "id": "boe_test",
                "type": "legislation_boe",
                "enabled": True,
                "schedule_cron": "*/30 * * * *",
                "params": params,
            }
        ])
        connector = build_connectors_for_market(market)[0]
        assert connector.params["api_base_url"] == "https://ejemplo.com"
        assert connector.params["sections"] == ["I", "III"]

    def test_market_code_injected_in_params(self):
        """La fabrica añade _market_code a los params."""
        market = _make_market([
            {
                "id": "boe_test",
                "type": "legislation_boe",
                "enabled": True,
                "schedule_cron": "*/30 * * * *",
                "params": {},
            }
        ])
        connector = build_connectors_for_market(market)[0]
        assert connector.params.get("_market_code") == "test"

    def test_disabled_sources_excluded_by_default(self):
        market = _make_market([
            {
                "id": "fuente_activa",
                "type": "legislation_boe",
                "enabled": True,
                "schedule_cron": "*/5 * * * *",
                "params": {},
            },
            {
                "id": "fuente_inactiva",
                "type": "polls_cis",
                "enabled": False,
                "schedule_cron": "0 0 * * *",
                "params": {},
            },
        ])
        connectors = build_connectors_for_market(market, only_enabled=True)
        ids = [c.source_id for c in connectors]
        assert "fuente_activa" in ids
        assert "fuente_inactiva" not in ids

    def test_disabled_sources_included_when_flag_false(self):
        market = _make_market([
            {
                "id": "fuente_inactiva",
                "type": "polls_cis",
                "enabled": False,
                "schedule_cron": "0 0 * * *",
                "params": {},
            }
        ])
        connectors = build_connectors_for_market(market, only_enabled=False)
        ids = [c.source_id for c in connectors]
        assert "fuente_inactiva" in ids

    def test_unknown_type_omitted(self):
        """Tipos sin conector registrado se omiten sin lanzar excepcion."""
        market = _make_market([
            {
                "id": "fuente_conocida",
                "type": "legislation_boe",
                "enabled": True,
                "schedule_cron": "0 * * * *",
                "params": {},
            },
            {
                "id": "fuente_desconocida",
                "type": "tipo_no_registrado_xyz",
                "enabled": True,
                "schedule_cron": "0 * * * *",
                "params": {},
            },
        ])
        connectors = build_connectors_for_market(market)
        ids = [c.source_id for c in connectors]
        assert "fuente_conocida" in ids
        assert "fuente_desconocida" not in ids

    def test_source_type_filter(self):
        market = _make_market([
            {
                "id": "boe_test",
                "type": "legislation_boe",
                "enabled": True,
                "schedule_cron": "*/30 * * * *",
                "params": {},
            },
            {
                "id": "rss_test",
                "type": "media_rss",
                "enabled": True,
                "schedule_cron": "*/5 * * * *",
                "params": {"outlets_slugs": ["elpais"]},
            },
        ])
        connectors = build_connectors_for_market(market, source_types=["media_rss"])
        assert len(connectors) == 1
        assert connectors[0].source_id == "rss_test"

    def test_empty_market_no_error(self):
        market = _make_market([])
        connectors = build_connectors_for_market(market)
        assert connectors == []

    def test_multiple_connectors_type_check(self):
        market = _make_market([
            {"id": "boe", "type": "legislation_boe", "enabled": True, "schedule_cron": "*/30 * * * *", "params": {}},
            {"id": "rss", "type": "media_rss", "enabled": True, "schedule_cron": "*/5 * * * *", "params": {}},
            {"id": "cis", "type": "polls_cis", "enabled": True, "schedule_cron": "0 0 * * *", "params": {}},
        ])
        connectors = build_connectors_for_market(market)
        assert len(connectors) == 3
        for c in connectors:
            assert isinstance(c, DataSourceConnector)


# ---------------------------------------------------------------------------
# Tests con mercados reales (spain.yaml / demo-eu.yaml)
# ---------------------------------------------------------------------------

class TestBuildConnectorsRealMarkets:
    def test_spain_connectors_built(self):
        config = load_market_config("spain")
        market = MarketContext(market_code="spain", config=config)
        connectors = build_connectors_for_market(market)
        assert len(connectors) >= 2
        for c in connectors:
            assert isinstance(c, DataSourceConnector)

    def test_spain_boe_connector_params(self):
        config = load_market_config("spain")
        market = MarketContext(market_code="spain", config=config)
        connectors = build_connectors_for_market(market, source_types=["legislation_boe"])
        assert len(connectors) >= 1
        boe = next(c for c in connectors if c.source_id == "boe")
        assert "api_base_url" in boe.params

    def test_demo_eu_connectors_built(self):
        config = load_market_config("demo-eu")
        market = MarketContext(market_code="demo-eu", config=config)
        connectors = build_connectors_for_market(market)
        assert len(connectors) >= 1
