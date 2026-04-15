"""Modelado temático de prensa (placeholder BERTopic)."""

from __future__ import annotations

import pandas as pd


def extract_topics(documents: list[str]) -> pd.DataFrame:
    """Devuelve tópicos simulados cuando BERTopic no está disponible."""
    if not documents:
        return pd.DataFrame(columns=["topic", "count"])
    return pd.DataFrame([{"topic": "politica_nacional", "count": len(documents)}])

