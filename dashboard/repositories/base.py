"""Primitivas compartidas para repositorios del dashboard."""

from __future__ import annotations

from typing import Any

import pandas as pd

from dashboard.db import _q


def run_query(sql: str, params: dict[str, Any] | None = None) -> pd.DataFrame:
    """Ejecuta una query SQL y devuelve un DataFrame."""
    return _q(sql, params)
