from __future__ import annotations

from data_seeds.political_actors import ACTORS
from data_seeds.political_parties import PARTIES
from data_seeds.political_narratives_archive import HISTORICAL_NARRATIVES
from data_seeds.legislative_archive import LEGISLATIVE_INITIATIVES
from data_seeds.economic_timeseries import ECONOMIC_SERIES
from data_seeds.social_indicators import SOCIAL_INDICATORS
from data_seeds.key_events_calendar import KEY_EVENTS


def get_all_seeds() -> dict:
    return {
        "actors": ACTORS,
        "parties": PARTIES,
        "narratives": HISTORICAL_NARRATIVES,
        "legislative": LEGISLATIVE_INITIATIVES,
        "economic": ECONOMIC_SERIES,
        "social": SOCIAL_INDICATORS,
        "events": KEY_EVENTS,
    }


__all__ = [
    "ACTORS",
    "PARTIES",
    "HISTORICAL_NARRATIVES",
    "LEGISLATIVE_INITIATIVES",
    "ECONOMIC_SERIES",
    "SOCIAL_INDICATORS",
    "KEY_EVENTS",
    "get_all_seeds",
]
