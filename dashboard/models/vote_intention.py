"""Imputación iterativa de intención de voto con MLP."""

from __future__ import annotations

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


def impute_vote_intention_mlp(
    barometer_df: pd.DataFrame,
    target_col: str = "INTENCIONGR",
    feature_cols: list[str] | None = None,
) -> pd.DataFrame:
    """Imputa indecisos del CIS usando MLPClassifier iterativo."""
    if barometer_df.empty or target_col not in barometer_df.columns:
        return barometer_df
    df = barometer_df.copy()
    if feature_cols is None:
        feature_cols = [c for c in df.columns if c != target_col][:40]
    df["was_imputed"] = False
    train = df[df[target_col].notna()]
    pred = df[df[target_col].isna()]
    if train.empty or pred.empty:
        return df
    pre = ColumnTransformer(
        transformers=[
            ("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")), ("oh", OneHotEncoder(handle_unknown="ignore"))]), feature_cols)
        ]
    )
    model = MLPClassifier(hidden_layer_sizes=(100, 50), max_iter=500, random_state=42)
    pipe = Pipeline([("pre", pre), ("model", model)])
    pipe.fit(train[feature_cols], train[target_col].astype(str))
    df.loc[pred.index, target_col] = pipe.predict(pred[feature_cols])
    df.loc[pred.index, "was_imputed"] = True
    return df

