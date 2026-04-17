import pandas as pd

from dashboard.models.polling_average import compute_polling_average


def _sample_polls() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "party": ["PSOE", "PSOE", "PSOE", "PSOE"],
            "pollster": ["A", "A", "B", "C"],
            "estimate": [30.0, 31.0, 29.5, 30.5],
            "fieldwork_end": pd.to_datetime(["2026-04-01", "2026-04-03", "2026-04-04", "2026-04-05"]),
        }
    )


def test_polling_average_returns_expected_keys():
    res = compute_polling_average(_sample_polls())
    for key in ["estimate", "ci_low", "ci_high", "house_effects", "n_polls"]:
        assert key in res


def test_polling_average_ci_order():
    res = compute_polling_average(_sample_polls())
    assert res["ci_low"] <= res["estimate"] <= res["ci_high"]


def test_polling_average_counts_polls():
    res = compute_polling_average(_sample_polls())
    assert res["n_polls"] == 4

