"""Modelo economía-popularidad."""

from __future__ import annotations

import pandas as pd
from sklearn.linear_model import LinearRegression


def fit_popularity_economy_model(macro_df: pd.DataFrame, approval_df: pd.DataFrame) -> LinearRegression | None:
    """Ajusta regresión lineal de popularidad ~ variables macro."""
    if macro_df.empty or approval_df.empty:
        return None
    df = macro_df.merge(approval_df, on="period", how="inner")
    if df.empty or "approval"not in df.columns:
        return None
    x = df[[c for c in df.columns if c not in {"period", "approval"}]].select_dtypes("number")
    if x.empty:
        return None
    model = LinearRegression()
    model.fit(x, df["approval"])
    return model

