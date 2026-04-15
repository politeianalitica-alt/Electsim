"""Capa gold: agregados para visualización."""

from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger(__name__)


def build_party_latest_mart(polls_df: pd.DataFrame) -> pd.DataFrame:
    """Devuelve última estimación por partido."""
    if polls_df.empty:
        return polls_df
    work = polls_df.copy()
    work["fieldwork_end"] = pd.to_datetime(work["fieldwork_end"], errors="coerce")
    out = work.sort_values("fieldwork_end").groupby("party", as_index=False).tail(1)
    logger.info("Gold mart latest parties: %s", len(out))
    return out

