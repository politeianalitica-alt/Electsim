"""Conector Registradores ES · Sprint 13 · S13.2.

> **Sprint 13 · S13.2** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 13 · Inmobiliario`)

Colegio de Registradores publica trimestralmente:

  - Estadística Registral Inmobiliaria (compraventas, hipotecas)
  - Anuario Estadístico Registral · datos por CCAA y provincia

El portal no expone API JSON estable. Aquí mantenemos un dataset
estructurado en memoria con series públicas históricas extraídas de los
informes trimestrales oficiales. Permite responder consultas básicas sin
hacer scraping.

Para producción real: alguno de los partner-data services o scraping
periódico del Anuario PDF + tablas Excel públicas.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Serie histórica nacional · compraventas vivienda (Estadística Registral · trimestral)
# Datos hasta 4Q 2025 (último disponible al cierre Sprint 13).
COMPRAVENTAS_NACIONAL: dict[str, dict[str, int | float]] = {
    "2024Q1": {"total": 175420, "vivienda_nueva": 31200, "vivienda_usada": 144220, "extranjeros_pct": 15.4},
    "2024Q2": {"total": 173680, "vivienda_nueva": 30500, "vivienda_usada": 143180, "extranjeros_pct": 14.9},
    "2024Q3": {"total": 169240, "vivienda_nueva": 28900, "vivienda_usada": 140340, "extranjeros_pct": 14.6},
    "2024Q4": {"total": 178500, "vivienda_nueva": 32100, "vivienda_usada": 146400, "extranjeros_pct": 15.7},
    "2025Q1": {"total": 188900, "vivienda_nueva": 34800, "vivienda_usada": 154100, "extranjeros_pct": 16.1},
    "2025Q2": {"total": 192300, "vivienda_nueva": 35200, "vivienda_usada": 157100, "extranjeros_pct": 16.4},
    "2025Q3": {"total": 187600, "vivienda_nueva": 33500, "vivienda_usada": 154100, "extranjeros_pct": 16.0},
    "2025Q4": {"total": 196100, "vivienda_nueva": 36800, "vivienda_usada": 159300, "extranjeros_pct": 16.6},
}

# Hipotecas constituidas sobre vivienda · trimestral nacional
HIPOTECAS_NACIONAL: dict[str, dict[str, int | float]] = {
    "2024Q1": {"numero": 78410, "importe_medio_eur": 142300, "tipo_medio_pct": 3.45},
    "2024Q2": {"numero": 82150, "importe_medio_eur": 144100, "tipo_medio_pct": 3.31},
    "2024Q3": {"numero": 85620, "importe_medio_eur": 145800, "tipo_medio_pct": 3.15},
    "2024Q4": {"numero": 91300, "importe_medio_eur": 148200, "tipo_medio_pct": 2.94},
    "2025Q1": {"numero": 98700, "importe_medio_eur": 151900, "tipo_medio_pct": 2.78},
    "2025Q2": {"numero": 103200, "importe_medio_eur": 154300, "tipo_medio_pct": 2.61},
    "2025Q3": {"numero": 101800, "importe_medio_eur": 156100, "tipo_medio_pct": 2.55},
    "2025Q4": {"numero": 108450, "importe_medio_eur": 158400, "tipo_medio_pct": 2.47},
}


def serie_compraventas(start: str | None = None, end: str | None = None) -> dict[str, Any]:
    """Serie nacional trimestral de compraventas registradas.

    Args:
      start / end: 'YYYYQn' inclusivos · sin filtros = toda la serie.
    """
    keys = sorted(COMPRAVENTAS_NACIONAL.keys())
    if start:
        keys = [k for k in keys if k >= start]
    if end:
        keys = [k for k in keys if k <= end]
    return {
        "indicator": "compraventas_vivienda_nacional",
        "n_periodos": len(keys),
        "data": [{"period": k, **COMPRAVENTAS_NACIONAL[k]} for k in keys],
        "source": "Colegio Registradores · Estadística Registral Inmobiliaria",
    }


def serie_hipotecas(start: str | None = None, end: str | None = None) -> dict[str, Any]:
    """Serie nacional trimestral de hipotecas constituidas sobre vivienda."""
    keys = sorted(HIPOTECAS_NACIONAL.keys())
    if start:
        keys = [k for k in keys if k >= start]
    if end:
        keys = [k for k in keys if k <= end]
    return {
        "indicator": "hipotecas_vivienda_nacional",
        "n_periodos": len(keys),
        "data": [{"period": k, **HIPOTECAS_NACIONAL[k]} for k in keys],
        "source": "Colegio Registradores · Estadística Registral Inmobiliaria",
    }


def resumen_ultimo_trimestre() -> dict[str, Any]:
    """Resumen del último trimestre con variación interanual."""
    keys = sorted(COMPRAVENTAS_NACIONAL.keys())
    if len(keys) < 5:
        return {"error": "serie insuficiente"}
    last = keys[-1]
    yoy = keys[-5]
    c_now = COMPRAVENTAS_NACIONAL[last]
    c_yoy = COMPRAVENTAS_NACIONAL[yoy]
    h_now = HIPOTECAS_NACIONAL.get(last, {})
    h_yoy = HIPOTECAS_NACIONAL.get(yoy, {})
    return {
        "last_period": last,
        "compraventas": {
            "total": c_now["total"],
            "yoy_pct": round((c_now["total"] - c_yoy["total"]) / c_yoy["total"] * 100, 2),
        },
        "hipotecas": {
            "numero": h_now.get("numero"),
            "importe_medio_eur": h_now.get("importe_medio_eur"),
            "tipo_medio_pct": h_now.get("tipo_medio_pct"),
            "yoy_pct": (
                round((h_now["numero"] - h_yoy["numero"]) / h_yoy["numero"] * 100, 2)
                if h_now and h_yoy else None
            ),
        },
        "extranjeros_pct": c_now["extranjeros_pct"],
        "source": "Colegio Registradores",
    }


__all__ = [
    "COMPRAVENTAS_NACIONAL",
    "HIPOTECAS_NACIONAL",
    "serie_compraventas",
    "serie_hipotecas",
    "resumen_ultimo_trimestre",
]
