from __future__ import annotations

from typing import Any

import pandas as pd

SCHEMAS: dict[str, dict[str, Any]] = {
    "interior_resultados": {
        "required_cols": ["codigo_provincia", "votos", "codigo_partido"],
        "non_null": ["votos"],
        "positive": ["votos"],
    },
    "rss_noticias": {
        "required_cols": ["fuente", "titular", "url", "fecha_publicacion"],
        "non_null": ["titular", "url"],
    },
}


def validate_dataframe(df: pd.DataFrame, schema: str) -> list[str]:
    spec = SCHEMAS.get(schema)
    if not spec:
        return []

    issues: list[str] = []

    for col in spec.get("required_cols", []):
        if col not in df.columns:
            issues.append(f"Columna requerida ausente: {col}")

    for col in spec.get("non_null", []):
        if col in df.columns and df[col].isna().any():
            issues.append(f"Valores nulos en columna: {col}")

    for col in spec.get("positive", []):
        if col in df.columns:
            vals = pd.to_numeric(df[col], errors="coerce")
            if (vals < 0).any():
                issues.append(f"Valores negativos en columna: {col}")

    return issues
