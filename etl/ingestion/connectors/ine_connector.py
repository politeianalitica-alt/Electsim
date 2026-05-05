"""Conector INE (Instituto Nacional de Estadística) en modo demo."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class EconomicIndicator(BaseModel):
    model_config = ConfigDict(extra="ignore")

    code: str
    name: str
    value: float
    period: str
    unit: str
    source: str = "INE"
    updated_at: datetime


_DEMO_INDICATORS = {
    "IPC": ("Índice de Precios al Consumo (interanual)", 3.2, "%", "2026-04"),
    "paro_rate": ("Tasa de paro EPA", 11.6, "%", "2026-T1"),
    "gdp": ("Producto Interior Bruto (var. interanual)", 1.9, "%", "2026-T1"),
    "salario_medio": ("Salario medio bruto mensual", 2287.0, "EUR", "2026-T1"),
    "indice_confianza_consumidor": (
        "Índice de Confianza del Consumidor",
        76.3,
        "puntos",
        "2026-04",
    ),
    "ipc_vivienda": ("IPC vivienda y alquiler", 4.7, "%", "2026-04"),
    "ipc_alimentos": ("IPC alimentación", 2.8, "%", "2026-04"),
    "tasa_actividad": ("Tasa de actividad", 58.9, "%", "2026-T1"),
    "tasa_empleo": ("Tasa de empleo", 52.1, "%", "2026-T1"),
}


def fetch_indicators(
    codes: Optional[List[str]] = None,
) -> List[EconomicIndicator]:
    """Devuelve indicadores económicos del INE en modo demo."""

    selected = codes or list(_DEMO_INDICATORS.keys())
    now = datetime.utcnow()
    out: List[EconomicIndicator] = []
    for code in selected:
        if code not in _DEMO_INDICATORS:
            continue
        name, val, unit, period = _DEMO_INDICATORS[code]
        out.append(
            EconomicIndicator(
                code=code,
                name=name,
                value=float(val),
                period=period,
                unit=unit,
                source="INE",
                updated_at=now,
            )
        )
    return out


def fetch_demographic_snapshot() -> dict:
    """Devuelve un snapshot demográfico demo agregado por CCAA."""

    return {
        "population_total": 48_419_000,
        "age_distribution": {
            "0-14": 13.3,
            "15-29": 15.5,
            "30-49": 28.8,
            "50-64": 21.4,
            "65+": 21.0,
        },
        "immigration": {
            "foreign_residents": 6_089_000,
            "foreign_pct": 12.6,
        },
        "by_ccaa": {
            "Madrid": {"population": 6_872_000, "growth": 0.9},
            "Cataluña": {"population": 7_995_000, "growth": 0.5},
            "Andalucía": {"population": 8_650_000, "growth": 0.3},
            "Comunidad Valenciana": {"population": 5_185_000, "growth": 0.6},
            "Galicia": {"population": 2_695_000, "growth": -0.2},
            "País Vasco": {"population": 2_220_000, "growth": 0.1},
        },
        "updated_at": datetime.utcnow().isoformat(),
    }


__all__ = [
    "EconomicIndicator",
    "fetch_indicators",
    "fetch_demographic_snapshot",
]
