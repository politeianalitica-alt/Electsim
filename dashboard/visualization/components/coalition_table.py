"""Tabla de escenarios de coalición."""

from __future__ import annotations

import pandas as pd


def create_coalition_table(probabilities: dict[str, float]) -> pd.DataFrame:
    """Convierte probabilidades de coalición a tabla ordenada."""
    df = pd.DataFrame([{"coalition": k, "probability": v} for k, v in probabilities.items()])
    if df.empty:
        return df
    return df.sort_values("probability", ascending=False)

