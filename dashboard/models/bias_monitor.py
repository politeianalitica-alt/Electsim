"""Monitor básico de bias del pipeline LLM."""

from __future__ import annotations

import pandas as pd


def compute_bias_metric(sim_df: pd.DataFrame, polls_df: pd.DataFrame) -> pd.DataFrame:
    """Calcula diferencia media absoluta por partido entre simulación y encuestas."""
    if sim_df.empty or polls_df.empty:
        return pd.DataFrame(columns=["party", "bias_metric"])
    sim = sim_df.groupby("party", as_index=False)["simulated_share"].mean()
    pol = polls_df.groupby("party", as_index=False)["estimate"].mean()
    df = sim.merge(pol, on="party", how="inner")
    df["bias_metric"] = (df["simulated_share"] - df["estimate"]).abs()
    return df[["party", "bias_metric"]]

