"""Análisis de sentimiento político en español."""

from __future__ import annotations

import re

import pandas as pd

PARTY_KEYWORDS = {
    "PP": ["pp", "partido popular", "feijoo", "#pp", "@pp_nacional"],
    "PSOE": ["psoe", "pedro sanchez", "sánchez", "#psoe", "@psoe"],
    "VOX": ["vox", "abascal", "#vox", "@vox_es"],
    "SUMAR": ["sumar", "yolanda díaz", "yolanda diaz", "#sumar"],
}


def load_sentiment_model(model_name: str = "pysentimiento/robertuito-sentiment-analysis"):
    """Carga modelo de sentimiento (o devuelve stub si no está disponible)."""
    try:
        from pysentimiento import create_analyzer

        return create_analyzer(task="sentiment", lang="es")
    except Exception:
        return None


def _extract_parties(text: str) -> list[str]:
    low = text.lower()
    found = []
    for party, kws in PARTY_KEYWORDS.items():
        if any(kw in low for kw in kws):
            found.append(party)
    return found


def analyze_tweets_batch(tweets: list[str], batch_size: int = 32) -> pd.DataFrame:
    """Analiza sentimiento y partidos mencionados para una lista de tweets."""
    model = load_sentiment_model()
    rows = []
    for tw in tweets:
        parties = _extract_parties(tw)
        if model:
            pred = model.predict(tw)
            sentiment = pred.output.upper()
            score = float(max(pred.probas.values()))
        else:
            sentiment, score = "NEU", 0.5
        rows.append({"tweet": tw, "sentiment": sentiment, "score": score, "party_mentioned": parties})
    return pd.DataFrame(rows)


def aggregate_sentiment_by_party_day(analyzed_df: pd.DataFrame, date_col: str = "created_at") -> pd.DataFrame:
    """Agrega sentimiento diario por partido para heatmap."""
    if analyzed_df.empty:
        return analyzed_df
    df = analyzed_df.explode("party_mentioned").rename(columns={"party_mentioned": "party"})
    mapper = {"POS": 1, "NEU": 0, "NEG": -1}
    df["sentiment_num"] = df["sentiment"].map(mapper).fillna(0)
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce").dt.date
    out = (
        df.groupby(["party", date_col], as_index=False)
        .agg(
            sentiment_score=("sentiment_num", "mean"),
            tweet_count=("tweet", "count"),
            positive_ratio=("sentiment", lambda s: (s == "POS").mean()),
            negative_ratio=("sentiment", lambda s: (s == "NEG").mean()),
            neutral_ratio=("sentiment", lambda s: (s == "NEU").mean()),
        )
    )
    return out

