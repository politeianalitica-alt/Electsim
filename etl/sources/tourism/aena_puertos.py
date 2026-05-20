"""AENA + Puertos del Estado · estadísticas turísticas · Sprint 15 · S15.3.

> **Sprint 15 · S15.3** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 15 · Turismo`)

AENA publica estadísticas mensuales de tráfico por aeropuerto (público).
Puertos del Estado consolida tráfico de pasajeros + cruceros.

Implementación pragmática: catálogo estático con cifras consolidadas
2024-2025 oficiales para los 10 principales aeropuertos y los 5 puertos
con más cruceros. Sustituible por scraper periódico de PDFs/Excels cuando
sea prioridad.
"""
from __future__ import annotations

from typing import Any

# Datos públicos consolidados AENA 2024 (millones pax)
AENA_PAX_2024: dict[str, dict[str, Any]] = {
    "madrid_barajas": {
        "slug": "madrid_barajas",
        "name": "Adolfo Suárez Madrid-Barajas",
        "ccaa": "Madrid",
        "pax_2024_m": 66.2,
        "pax_2023_m": 60.1,
        "yoy_pct": 10.1,
        "rank": 1,
    },
    "barcelona_prat": {
        "slug": "barcelona_prat",
        "name": "Josep Tarradellas Barcelona-El Prat",
        "ccaa": "Cataluña",
        "pax_2024_m": 55.0,
        "pax_2023_m": 49.9,
        "yoy_pct": 10.2,
        "rank": 2,
    },
    "palma_mallorca": {
        "slug": "palma_mallorca",
        "name": "Palma de Mallorca",
        "ccaa": "Illes Balears",
        "pax_2024_m": 33.3,
        "pax_2023_m": 31.6,
        "yoy_pct": 5.2,
        "rank": 3,
    },
    "malaga_costa_sol": {
        "slug": "malaga_costa_sol",
        "name": "Málaga-Costa del Sol",
        "ccaa": "Andalucía",
        "pax_2024_m": 24.6,
        "pax_2023_m": 22.3,
        "yoy_pct": 10.4,
        "rank": 4,
    },
    "alicante_elche": {
        "slug": "alicante_elche",
        "name": "Alicante-Elche Miguel Hernández",
        "ccaa": "Comunitat Valenciana",
        "pax_2024_m": 18.4,
        "pax_2023_m": 17.2,
        "yoy_pct": 7.1,
        "rank": 5,
    },
    "gran_canaria": {
        "slug": "gran_canaria",
        "name": "Gran Canaria",
        "ccaa": "Canarias",
        "pax_2024_m": 16.0,
        "pax_2023_m": 14.9,
        "yoy_pct": 7.7,
        "rank": 6,
    },
    "tenerife_sur": {
        "slug": "tenerife_sur",
        "name": "Tenerife Sur",
        "ccaa": "Canarias",
        "pax_2024_m": 13.4,
        "pax_2023_m": 12.5,
        "yoy_pct": 7.2,
        "rank": 7,
    },
    "ibiza": {
        "slug": "ibiza",
        "name": "Ibiza",
        "ccaa": "Illes Balears",
        "pax_2024_m": 9.6,
        "pax_2023_m": 9.2,
        "yoy_pct": 4.3,
        "rank": 8,
    },
    "valencia": {
        "slug": "valencia",
        "name": "Valencia",
        "ccaa": "Comunitat Valenciana",
        "pax_2024_m": 11.6,
        "pax_2023_m": 10.0,
        "yoy_pct": 16.0,
        "rank": 9,
    },
    "sevilla": {
        "slug": "sevilla",
        "name": "Sevilla",
        "ccaa": "Andalucía",
        "pax_2024_m": 8.6,
        "pax_2023_m": 7.7,
        "yoy_pct": 11.7,
        "rank": 10,
    },
}

# Puertos del Estado · top cruceros 2024 (millones pasajeros)
CRUISE_PAX_2024: dict[str, dict[str, Any]] = {
    "barcelona": {
        "slug": "barcelona",
        "name": "Puerto de Barcelona",
        "ccaa": "Cataluña",
        "cruise_pax_2024_m": 3.85,
        "cruise_pax_2023_m": 3.59,
        "yoy_pct": 7.2,
        "rank_europa": 1,
    },
    "palma": {
        "slug": "palma",
        "name": "Puerto de Palma",
        "ccaa": "Illes Balears",
        "cruise_pax_2024_m": 2.45,
        "cruise_pax_2023_m": 2.31,
        "yoy_pct": 6.1,
        "rank_europa": 3,
    },
    "tenerife": {
        "slug": "tenerife",
        "name": "Puerto de Santa Cruz de Tenerife",
        "ccaa": "Canarias",
        "cruise_pax_2024_m": 1.32,
        "cruise_pax_2023_m": 1.25,
        "yoy_pct": 5.6,
    },
    "malaga": {
        "slug": "malaga",
        "name": "Puerto de Málaga",
        "ccaa": "Andalucía",
        "cruise_pax_2024_m": 1.05,
        "cruise_pax_2023_m": 0.97,
        "yoy_pct": 8.2,
    },
    "las_palmas": {
        "slug": "las_palmas",
        "name": "Puerto de Las Palmas",
        "ccaa": "Canarias",
        "cruise_pax_2024_m": 0.92,
        "cruise_pax_2023_m": 0.86,
        "yoy_pct": 7.0,
    },
}


def list_aena_traffic(top_n: int = 10) -> list[dict[str, Any]]:
    return sorted(AENA_PAX_2024.values(), key=lambda x: x["rank"])[:top_n]


def get_aena_airport(slug: str) -> dict[str, Any] | None:
    return AENA_PAX_2024.get(slug.lower())


def list_cruise_ports() -> list[dict[str, Any]]:
    return sorted(CRUISE_PAX_2024.values(), key=lambda x: x["cruise_pax_2024_m"], reverse=True)


def get_cruise_port(slug: str) -> dict[str, Any] | None:
    return CRUISE_PAX_2024.get(slug.lower())


__all__ = [
    "AENA_PAX_2024",
    "CRUISE_PAX_2024",
    "list_aena_traffic",
    "get_aena_airport",
    "list_cruise_ports",
    "get_cruise_port",
]
