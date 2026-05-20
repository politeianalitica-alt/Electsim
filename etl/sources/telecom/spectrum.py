"""Espectro radioeléctrico ES · Sprint 12 · S12.3.

> **Sprint 12 · S12.3** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 12 · Telecom`)

Catálogo estático de subastas de espectro celebradas y previstas en España
(Ministerio de Asuntos Económicos · Secretaría Estado de Telecomunicaciones).

Provincias y CCAA · cobertura del CNAF (Cuadro Nacional de Atribución de
Frecuencias). Datos consolidados a 2026 con fuentes oficiales.

Falla cerrado: no requiere red · todo en memoria.
"""
from __future__ import annotations

from typing import Any

# Inventario de subastas + concesiones ES (información pública SETSI)
SPECTRUM_AUCTIONS: dict[str, dict[str, Any]] = {
    "auction_700mhz_2020": {
        "slug": "auction_700mhz_2020",
        "band": "700 MHz",
        "year": 2020,
        "date": "2020-07-21",
        "status": "completada",
        "total_revenue_eur": 1010000000,
        "blocks_allocated": 6,
        "winners": [
            {"operator": "Movistar", "lots_won": 2, "amount_eur": 350000000},
            {"operator": "Orange", "lots_won": 2, "amount_eur": 330000000},
            {"operator": "Vodafone", "lots_won": 2, "amount_eur": 330000000},
        ],
        "description": "Dividendo digital · 2x10 MHz FDD. Banda principal 5G sub-1GHz. Pliego MINECO julio 2020.",
        "url": "https://avancedigital.mineco.gob.es",
    },
    "auction_3_5ghz_2018": {
        "slug": "auction_3_5ghz_2018",
        "band": "3.5 GHz (3.4-3.8)",
        "year": 2018,
        "date": "2018-07-26",
        "status": "completada",
        "total_revenue_eur": 437600000,
        "blocks_allocated": 40,
        "winners": [
            {"operator": "Movistar", "lots_won": 10, "amount_eur": 107000000},
            {"operator": "Orange", "lots_won": 10, "amount_eur": 132000000},
            {"operator": "Vodafone", "lots_won": 10, "amount_eur": 198000000},
            {"operator": "MásMóvil", "lots_won": 10, "amount_eur": 0},
        ],
        "description": "Banda 3.5GHz pionera · 40 bloques de 5 MHz a 20 años. Primera subasta 5G en Europa.",
        "url": "https://avancedigital.mineco.gob.es",
    },
    "auction_26ghz_2022": {
        "slug": "auction_26ghz_2022",
        "band": "26 GHz (mmWave)",
        "year": 2022,
        "date": "2022-12-21",
        "status": "completada",
        "total_revenue_eur": 36500000,
        "blocks_allocated": 7,
        "winners": [
            {"operator": "Movistar", "lots_won": 2, "amount_eur": 14000000},
            {"operator": "Vodafone", "lots_won": 2, "amount_eur": 14000000},
            {"operator": "Orange", "lots_won": 2, "amount_eur": 8500000},
            {"operator": "MásMóvil", "lots_won": 1, "amount_eur": 0},
        ],
        "description": "Banda mmWave 26 GHz · 200 MHz por operador. Bajos precios. Usos verticales 5G (industria, sanidad).",
        "url": "https://avancedigital.mineco.gob.es",
    },
    "auction_1500mhz_2021": {
        "slug": "auction_1500mhz_2021",
        "band": "1500 MHz (L-band)",
        "year": 2021,
        "date": "2021-04-26",
        "status": "completada",
        "total_revenue_eur": 12700000,
        "blocks_allocated": 8,
        "winners": [
            {"operator": "Movistar", "lots_won": 2, "amount_eur": 4900000},
            {"operator": "Orange", "lots_won": 2, "amount_eur": 4900000},
            {"operator": "Vodafone", "lots_won": 2, "amount_eur": 2900000},
        ],
        "description": "Banda 1452-1492 MHz SDL · suplemento de descarga. 8 bloques de 5 MHz. Lotes vacantes adjudicados.",
        "url": "https://avancedigital.mineco.gob.es",
    },
    "auction_6ghz_2025_planned": {
        "slug": "auction_6ghz_2025_planned",
        "band": "6 GHz (banda alta 6425-7125 MHz)",
        "year": 2025,
        "date": None,
        "status": "previsto",
        "description": "Pendiente armonización WRC-23. Decisión final del rango licenciado vs no-licenciado en debate. Posible subasta 2026-2027.",
    },
    "auction_900_1800mhz_2024": {
        "slug": "auction_900_1800mhz_2024",
        "band": "900 MHz y 1800 MHz · refarming",
        "year": 2024,
        "date": "2024-07-26",
        "status": "completada",
        "total_revenue_eur": 188400000,
        "blocks_allocated": 8,
        "winners": [
            {"operator": "Movistar", "lots_won": 2, "amount_eur": 50000000},
            {"operator": "Orange", "lots_won": 2, "amount_eur": 50000000},
            {"operator": "Vodafone", "lots_won": 2, "amount_eur": 50000000},
            {"operator": "MásMóvil", "lots_won": 2, "amount_eur": 38400000},
        ],
        "description": "Renovación de concesiones 900/1800 MHz para 2030+ · GSM legacy + extensión LTE/5G.",
        "url": "https://avancedigital.mineco.gob.es",
    },
}


def list_spectrum_auctions(
    *,
    band: str | None = None,
    status: str | None = None,
    year: int | None = None,
) -> list[dict[str, Any]]:
    """Filtra subastas por banda / status / año."""
    out = list(SPECTRUM_AUCTIONS.values())
    if band:
        bl = band.lower()
        out = [a for a in out if bl in a["band"].lower()]
    if status:
        out = [a for a in out if a["status"] == status]
    if year:
        out = [a for a in out if a["year"] == year]
    return out


def get_spectrum_auction(slug: str) -> dict[str, Any] | None:
    return SPECTRUM_AUCTIONS.get(slug.lower())


def operator_spectrum_summary(operator_name: str) -> dict[str, Any]:
    """Resumen de espectro adjudicado a un operador a través de las subastas."""
    op = operator_name.lower()
    bands: list[dict[str, Any]] = []
    total_paid = 0.0
    total_lots = 0
    for a in SPECTRUM_AUCTIONS.values():
        winners = a.get("winners") or []
        for w in winners:
            if w.get("operator", "").lower() == op:
                bands.append({
                    "band": a["band"],
                    "year": a["year"],
                    "lots_won": w.get("lots_won", 0),
                    "amount_eur": w.get("amount_eur", 0),
                    "auction": a["slug"],
                })
                total_paid += w.get("amount_eur", 0)
                total_lots += w.get("lots_won", 0)
    return {
        "operator": operator_name,
        "n_auctions_participated": len(bands),
        "total_lots_won": total_lots,
        "total_paid_eur": total_paid,
        "bands": bands,
    }


__all__ = [
    "SPECTRUM_AUCTIONS",
    "list_spectrum_auctions",
    "get_spectrum_auction",
    "operator_spectrum_summary",
]
