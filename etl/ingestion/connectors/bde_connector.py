"""Conector Banco de España en modo demo."""

from __future__ import annotations

from datetime import datetime


def fetch_macroeconomic_snapshot() -> dict:
    """Snapshot macro: tipos, hipoteca, deuda pública, prima de riesgo, IBEX 35."""

    return {
        "interest_rates": {
            "ecb_main": 3.50,
            "ecb_deposit": 3.00,
            "euribor_12m": 3.45,
        },
        "mortgage_rate": 3.78,
        "deuda_publica": {
            "pct_pib": 105.4,
            "value_eur_b": 1_645.0,
        },
        "prima_riesgo": 96,
        "ibex_35": {
            "value": 11_287.4,
            "change_pct": -0.43,
        },
        "updated_at": datetime.utcnow().isoformat(),
        "source": "Banco de España",
    }


def fetch_yield_curve() -> dict[str, float]:
    """Curva de tipos del bono español."""

    return {
        "3M": 3.30,
        "6M": 3.45,
        "1Y": 3.40,
        "2Y": 3.05,
        "5Y": 3.15,
        "10Y": 3.42,
        "30Y": 4.10,
    }


def fetch_credit_aggregates() -> dict:
    """Agregados de crédito a hogares y empresas."""

    return {
        "credito_hogares": {
            "total_eur_b": 690.4,
            "var_anual_pct": -1.2,
        },
        "credito_empresas": {
            "total_eur_b": 870.1,
            "var_anual_pct": 0.8,
        },
        "morosidad_pct": 3.6,
        "updated_at": datetime.utcnow().isoformat(),
        "source": "Banco de España",
    }


__all__ = [
    "fetch_macroeconomic_snapshot",
    "fetch_yield_curve",
    "fetch_credit_aggregates",
]
