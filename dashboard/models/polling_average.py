"""Media de encuestas con decaimiento y house effects."""

from __future__ import annotations

from datetime import datetime
import math
import random

import pandas as pd


def adjust_for_house_effects(polls_df: pd.DataFrame, house_effects: dict[str, float]) -> pd.DataFrame:
    """Resta el house effect de cada encuestadora."""
    out = polls_df.copy()
    out["estimate_adj"] = out["estimate"] - out["pollster"].map(house_effects).fillna(0.0)
    return out


def compute_polling_average(
    polls_df: pd.DataFrame,
    decay_halflife_days: int = 21,
    min_polls_for_house_effect: int = 3,
) -> dict:
    """Calcula media ponderada, house effects e IC bootstrap al 90%."""
    if polls_df.empty:
        return {
            "party": "",
            "estimate": 0.0,
            "ci_low": 0.0,
            "ci_high": 0.0,
            "trend": pd.Series(dtype=float),
            "house_effects": {},
            "n_polls": 0,
            "last_updated": datetime.utcnow(),
        }

    df = polls_df.copy()
    df["fieldwork_end"] = pd.to_datetime(df["fieldwork_end"], errors="coerce")
    df = df.dropna(subset=["fieldwork_end", "estimate"])
    latest = df["fieldwork_end"].max()
    lamb = math.log(2) / max(decay_halflife_days, 1)
    df["days_ago"] = (latest - df["fieldwork_end"]).dt.days.clip(lower=0)
    df["w"] = df["days_ago"].apply(lambda d: math.exp(-lamb * float(d)))

    house_effects: dict[str, float] = {}
    for pollster, g in df.groupby("pollster"):
        if len(g) >= min_polls_for_house_effect:
            base = float((g["estimate"] * g["w"]).sum() / max(g["w"].sum(), 1e-9))
            house_effects[pollster] = float((g["estimate"] - base).mean())

    adj = adjust_for_house_effects(df, house_effects)
    estimate = float((adj["estimate_adj"] * adj["w"]).sum() / max(adj["w"].sum(), 1e-9))
    samples = []
    for _ in range(1000):
        boot = adj.sample(frac=1.0, replace=True, random_state=random.randint(1, 10_000_000))
        samples.append(float((boot["estimate_adj"] * boot["w"]).sum() / max(boot["w"].sum(), 1e-9)))
    samples = sorted(samples)
    ci_low = samples[int(0.05 * (len(samples) - 1))]
    ci_high = samples[int(0.95 * (len(samples) - 1))]
    trend = (
        adj.set_index("fieldwork_end")
        .sort_index()
        .resample("D")["estimate_adj"]
        .mean()
        .interpolate(method="time")
    )
    party = str(adj["party"].mode().iloc[0]) if "party" in adj.columns and not adj["party"].empty else ""
    return {
        "party": party,
        "estimate": estimate,
        "ci_low": float(ci_low),
        "ci_high": float(ci_high),
        "trend": trend,
        "house_effects": house_effects,
        "n_polls": int(len(adj)),
        "last_updated": datetime.utcnow(),
    }

