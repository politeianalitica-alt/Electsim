"""Estado centralizado de snapshot para coherencia entre pestañas.

Esta capa evita que cada panel lea datos con TTL independientes en instantes
distintos. Todas las vistas que usen este snapshot comparten el mismo corte
temporal dentro de la sesión.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

import pandas as pd
import streamlit as st

from dashboard.db import (
    cargar_alertas,
    cargar_coaliciones,
    cargar_indices_politeia,
    cargar_macro_ultimo,
    cargar_nowcasting,
)


@st.cache_data(ttl=120)
def _build_snapshot() -> dict[str, Any]:
    """Construye un snapshot coherente de datos críticos del dashboard."""
    loaded_at = datetime.utcnow().isoformat()
    return {
        "loaded_at": loaded_at,
        "nowcasting": cargar_nowcasting(),
        "coaliciones": cargar_coaliciones(),
        "macro": cargar_macro_ultimo(),
        "indices": cargar_indices_politeia(),
        "alertas": cargar_alertas(solo_no_leidas=False, limit=100),
    }


def get_app_snapshot(force_refresh: bool = False) -> dict[str, Any]:
    """Devuelve snapshot centralizado; opcionalmente invalida y recarga."""
    if force_refresh:
        _build_snapshot.clear()
    snap = _build_snapshot()
    # Garantiza tipos esperados para consumidores de UI
    for k in ("nowcasting", "coaliciones", "macro", "indices", "alertas"):
        if not isinstance(snap.get(k), pd.DataFrame):
            snap[k] = pd.DataFrame()
    return snap

