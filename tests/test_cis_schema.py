from datetime import date

import pytest

from dashboard.storage.schema import Poll


def test_poll_schema_valid():
    row = Poll(
        poll_id="abc",
        pollster="Test",
        fieldwork_start=date(2026, 1, 1),
        fieldwork_end=date(2026, 1, 5),
        sample_size=1200,
        election_type="general",
        territory_code="ES",
        party="PSOE",
        estimate=30.5,
        margin_of_error=2.1,
        raw_source="test",
    )
    assert row.party == "PSOE"


def test_poll_schema_rejects_negative_sample():
    with pytest.raises(Exception):
        Poll(
            poll_id="abc",
            pollster="Test",
            fieldwork_start=date(2026, 1, 1),
            fieldwork_end=date(2026, 1, 5),
            sample_size=-1,
            election_type="general",
            territory_code="ES",
            party="PSOE",
            estimate=30.5,
            margin_of_error=2.1,
            raw_source="test",
        )


def test_poll_schema_rejects_estimate_gt_100():
    with pytest.raises(Exception):
        Poll(
            poll_id="abc",
            pollster="Test",
            fieldwork_start=date(2026, 1, 1),
            fieldwork_end=date(2026, 1, 5),
            sample_size=1000,
            election_type="general",
            territory_code="ES",
            party="PSOE",
            estimate=101.0,
            margin_of_error=2.1,
            raw_source="test",
        )

