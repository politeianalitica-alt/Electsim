"""Modelo MRP simplificado por CCAA (placeholder operativo)."""

from __future__ import annotations

import pandas as pd


def run_mrp_ccaa(polls_df: pd.DataFrame, poststrat_df: pd.DataFrame | None = None) -> pd.DataFrame:
    """Genera estimaciones por CCAA a partir de encuestas nacionales."""
    if polls_df.empty:
        return pd.DataFrame(columns=["territory_code", "party", "estimate"])
    base = polls_df.groupby("party", as_index=False)["estimate"].mean()
    ccaa = ["ES-AN", "ES-AR", "ES-AS", "ES-CN", "ES-CB", "ES-CL", "ES-CM", "ES-CT", "ES-EX", "ES-GA", "ES-IB", "ES-RI", "ES-MD", "ES-MC", "ES-NC", "ES-NC", "ES-PV", "ES-VC"]
    rows = []
    for code in ccaa:
        for _, r in base.iterrows():
            rows.append({"territory_code": code, "party": r["party"], "estimate": r["estimate"]})
    return pd.DataFrame(rows)

