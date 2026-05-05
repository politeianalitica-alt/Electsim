"""
tests/integration/test_geopolitics_repository_postgres.py
"""
from __future__ import annotations
from datetime import date
import pytest


@pytest.mark.integration
class TestGeopoliticsRepositoryRoundtrip:
    def test_create_and_list_geo_event(self, skip_if_no_db):
        from etl.sources.geopolitics.repository import GeopoliticsRepository
        from etl.sources.geopolitics.schemas import GeoEvent
        repo = GeopoliticsRepository()

        event = GeoEvent(
            event_id="int_test_geo_001",
            source="test",
            event_type="battles",
            country="Ukraine",
            country_iso3="UKR",
            event_date=date.today(),
            severity="HIGH",
            fatalities=10,
        )
        created = repo.create_geo_event(event)
        assert created is True

        events = repo.list_geo_events(country_iso3="UKR", days=1)
        assert isinstance(events, list)
        assert any(e["event_id"] == "int_test_geo_001" for e in events)
