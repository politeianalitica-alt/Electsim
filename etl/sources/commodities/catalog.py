"""Catálogo Commodities · Sprint 14 · S14.4.

Catálogo maestro de 40+ commodities relevantes para agroalimentario,
energía y metales. Cada entrada incluye:

  - slug · identificador estable
  - name · nombre comercial
  - category · grains | oils | dairy | softs | meat | energy | metals | freight
  - yahoo_ticker · símbolo Yahoo Finance para futuros (ej. 'ZW=F' para trigo CBOT)
  - imf_code · código IMF Primary Commodity Prices (cuando aplica)
  - unit · 'USD/bushel', 'USD/ton', 'USD/lb', ...
  - exchange · CBOT, CME, ICE, LME, Euronext, NYMEX
  - description corta

Sin red. Datos públicos consolidados de Vesper + Yahoo Finance + IMF.
"""
from __future__ import annotations

from typing import Any

COMMODITIES: dict[str, dict[str, Any]] = {
    # Grains
    "wheat_cbot": {
        "slug": "wheat_cbot",
        "name": "Trigo · Chicago (CBOT)",
        "category": "grains",
        "yahoo_ticker": "ZW=F",
        "imf_code": "PWHEAMT",
        "unit": "USD/bushel",
        "exchange": "CBOT",
        "description": "Trigo blando rojo de invierno · contrato benchmark mundial.",
    },
    "wheat_kc": {
        "slug": "wheat_kc",
        "name": "Trigo · Kansas City (HRW)",
        "category": "grains",
        "yahoo_ticker": "KE=F",
        "unit": "USD/bushel",
        "exchange": "CBOT",
        "description": "Trigo duro rojo de invierno · referencia panaderías.",
    },
    "wheat_milling_euronext": {
        "slug": "wheat_milling_euronext",
        "name": "Trigo molinero · Euronext París",
        "category": "grains",
        "yahoo_ticker": "EBM.PA",
        "unit": "EUR/ton",
        "exchange": "Euronext",
        "description": "Referencia europea (Francia/España). Benchmark mediterráneo.",
    },
    "corn_cbot": {
        "slug": "corn_cbot",
        "name": "Maíz · Chicago",
        "category": "grains",
        "yahoo_ticker": "ZC=F",
        "imf_code": "PMAIZMT",
        "unit": "USD/bushel",
        "exchange": "CBOT",
    },
    "soybeans_cbot": {
        "slug": "soybeans_cbot",
        "name": "Soja · Chicago",
        "category": "grains",
        "yahoo_ticker": "ZS=F",
        "imf_code": "PSOYBMT",
        "unit": "USD/bushel",
        "exchange": "CBOT",
    },
    "rice_cbot": {
        "slug": "rice_cbot",
        "name": "Arroz · Chicago (Rough Rice)",
        "category": "grains",
        "yahoo_ticker": "ZR=F",
        "unit": "USD/cwt",
        "exchange": "CBOT",
    },
    "barley_es": {
        "slug": "barley_es",
        "name": "Cebada · MFAO (España)",
        "category": "grains",
        "yahoo_ticker": None,
        "unit": "EUR/ton",
        "exchange": "MFAO",
        "description": "Cebada española · sin futuros líquidos · precio spot Sevilla.",
    },
    # Oils
    "soybean_oil_cbot": {
        "slug": "soybean_oil_cbot",
        "name": "Aceite de soja · Chicago",
        "category": "oils",
        "yahoo_ticker": "ZL=F",
        "imf_code": "PSOIL",
        "unit": "USD/lb",
        "exchange": "CBOT",
    },
    "palm_oil_klu": {
        "slug": "palm_oil_klu",
        "name": "Aceite de palma · Bursa Malaysia",
        "category": "oils",
        "yahoo_ticker": "FCPO=F",
        "imf_code": "PPOIL",
        "unit": "MYR/ton",
        "exchange": "Bursa Malaysia",
    },
    "rapeseed_paris": {
        "slug": "rapeseed_paris",
        "name": "Colza · Euronext París",
        "category": "oils",
        "yahoo_ticker": "RPS.PA",
        "unit": "EUR/ton",
        "exchange": "Euronext",
    },
    "sunflower_oil_es": {
        "slug": "sunflower_oil_es",
        "name": "Aceite de girasol · España",
        "category": "oils",
        "yahoo_ticker": None,
        "unit": "EUR/ton",
        "exchange": "Spot ES",
        "description": "Precio ex-fábrica España · seguimiento SETROIL.",
    },
    "olive_oil_es": {
        "slug": "olive_oil_es",
        "name": "Aceite de oliva virgen extra · España",
        "category": "oils",
        "yahoo_ticker": None,
        "unit": "EUR/ton",
        "exchange": "POOLred",
        "description": "Referencia Jaén/Córdoba · sistema POOLred CSIC + MAPA.",
    },
    # Dairy
    "milk_smp_eu": {
        "slug": "milk_smp_eu",
        "name": "Leche en polvo desnatada (SMP) · UE",
        "category": "dairy",
        "yahoo_ticker": None,
        "unit": "EUR/ton",
        "exchange": "DG AGRI",
        "description": "Skim Milk Powder UE · referencia Vesper.",
    },
    "butter_eu": {
        "slug": "butter_eu",
        "name": "Mantequilla · UE",
        "category": "dairy",
        "yahoo_ticker": None,
        "unit": "EUR/ton",
        "exchange": "DG AGRI",
    },
    "cheese_eu": {
        "slug": "cheese_eu",
        "name": "Queso · UE (Cheddar/Gouda)",
        "category": "dairy",
        "yahoo_ticker": None,
        "unit": "EUR/ton",
        "exchange": "DG AGRI",
    },
    "milk_class_iii_cme": {
        "slug": "milk_class_iii_cme",
        "name": "Leche Class III · CME (US)",
        "category": "dairy",
        "yahoo_ticker": "DC=F",
        "unit": "USD/cwt",
        "exchange": "CME",
    },
    # Softs
    "sugar_ny": {
        "slug": "sugar_ny",
        "name": "Azúcar #11 · Nueva York",
        "category": "softs",
        "yahoo_ticker": "SB=F",
        "imf_code": "PSUGAUSAUSDM",
        "unit": "USD/lb",
        "exchange": "ICE NY",
    },
    "cocoa_ny": {
        "slug": "cocoa_ny",
        "name": "Cacao · Nueva York",
        "category": "softs",
        "yahoo_ticker": "CC=F",
        "imf_code": "PCOCO",
        "unit": "USD/ton",
        "exchange": "ICE NY",
    },
    "coffee_c": {
        "slug": "coffee_c",
        "name": "Café Arábica · Nueva York",
        "category": "softs",
        "yahoo_ticker": "KC=F",
        "imf_code": "PCOFFOTM",
        "unit": "USD/lb",
        "exchange": "ICE NY",
    },
    "coffee_robusta": {
        "slug": "coffee_robusta",
        "name": "Café Robusta · Londres",
        "category": "softs",
        "yahoo_ticker": "RC=F",
        "unit": "USD/ton",
        "exchange": "ICE Europe",
    },
    "cotton_2": {
        "slug": "cotton_2",
        "name": "Algodón #2 · Nueva York",
        "category": "softs",
        "yahoo_ticker": "CT=F",
        "imf_code": "PCOTTIND",
        "unit": "USD/lb",
        "exchange": "ICE NY",
    },
    "orange_juice": {
        "slug": "orange_juice",
        "name": "Zumo de naranja · Nueva York",
        "category": "softs",
        "yahoo_ticker": "OJ=F",
        "unit": "USD/lb",
        "exchange": "ICE NY",
    },
    # Meat
    "live_cattle_cme": {
        "slug": "live_cattle_cme",
        "name": "Ganado vacuno vivo · CME",
        "category": "meat",
        "yahoo_ticker": "LE=F",
        "unit": "USD/lb",
        "exchange": "CME",
    },
    "lean_hogs_cme": {
        "slug": "lean_hogs_cme",
        "name": "Cerdo magro · CME",
        "category": "meat",
        "yahoo_ticker": "HE=F",
        "unit": "USD/lb",
        "exchange": "CME",
    },
    # Energy
    "brent_crude": {
        "slug": "brent_crude",
        "name": "Petróleo Brent",
        "category": "energy",
        "yahoo_ticker": "BZ=F",
        "imf_code": "POILBRE",
        "unit": "USD/bbl",
        "exchange": "ICE Europe",
    },
    "wti_crude": {
        "slug": "wti_crude",
        "name": "Petróleo WTI",
        "category": "energy",
        "yahoo_ticker": "CL=F",
        "imf_code": "POILWTI",
        "unit": "USD/bbl",
        "exchange": "NYMEX",
    },
    "natgas_henry_hub": {
        "slug": "natgas_henry_hub",
        "name": "Gas natural · Henry Hub",
        "category": "energy",
        "yahoo_ticker": "NG=F",
        "imf_code": "PNGASUS",
        "unit": "USD/MMBtu",
        "exchange": "NYMEX",
    },
    "natgas_ttf": {
        "slug": "natgas_ttf",
        "name": "Gas natural · TTF (Países Bajos)",
        "category": "energy",
        "yahoo_ticker": "TTF=F",
        "unit": "EUR/MWh",
        "exchange": "ICE Endex",
        "description": "Referencia europea · benchmark España/UE post-Ucrania.",
    },
    "coal_api2": {
        "slug": "coal_api2",
        "name": "Carbón · API2 (Rotterdam)",
        "category": "energy",
        "yahoo_ticker": None,
        "unit": "USD/ton",
        "exchange": "ICE",
    },
    "ethanol_us": {
        "slug": "ethanol_us",
        "name": "Etanol · CME",
        "category": "energy",
        "yahoo_ticker": "ETH=F",
        "unit": "USD/gallon",
        "exchange": "CME",
    },
    # Metals
    "copper_lme": {
        "slug": "copper_lme",
        "name": "Cobre · LME",
        "category": "metals",
        "yahoo_ticker": "HG=F",
        "imf_code": "PCOPP",
        "unit": "USD/lb",
        "exchange": "LME / COMEX",
    },
    "aluminum_lme": {
        "slug": "aluminum_lme",
        "name": "Aluminio · LME",
        "category": "metals",
        "yahoo_ticker": "ALI=F",
        "imf_code": "PALUM",
        "unit": "USD/ton",
        "exchange": "LME",
    },
    "nickel_lme": {
        "slug": "nickel_lme",
        "name": "Níquel · LME",
        "category": "metals",
        "yahoo_ticker": None,
        "imf_code": "PNICK",
        "unit": "USD/ton",
        "exchange": "LME",
    },
    "zinc_lme": {
        "slug": "zinc_lme",
        "name": "Zinc · LME",
        "category": "metals",
        "yahoo_ticker": None,
        "imf_code": "PZINC",
        "unit": "USD/ton",
        "exchange": "LME",
    },
    "gold_comex": {
        "slug": "gold_comex",
        "name": "Oro · COMEX",
        "category": "metals",
        "yahoo_ticker": "GC=F",
        "imf_code": "PGOLD",
        "unit": "USD/oz",
        "exchange": "COMEX",
    },
    "silver_comex": {
        "slug": "silver_comex",
        "name": "Plata · COMEX",
        "category": "metals",
        "yahoo_ticker": "SI=F",
        "imf_code": "PSILV",
        "unit": "USD/oz",
        "exchange": "COMEX",
    },
    "uranium_u3o8": {
        "slug": "uranium_u3o8",
        "name": "Uranio U3O8 · NYMEX",
        "category": "metals",
        "yahoo_ticker": "UX=F",
        "unit": "USD/lb",
        "exchange": "NYMEX",
    },
    # Freight
    "baltic_dry_index": {
        "slug": "baltic_dry_index",
        "name": "Baltic Dry Index",
        "category": "freight",
        "yahoo_ticker": None,
        "unit": "Index",
        "exchange": "Baltic Exchange",
        "description": "Referencia flete granel seco · termómetro comercio mundial.",
    },
}


def list_commodities(category: str | None = None) -> list[dict[str, Any]]:
    """Lista catálogo, opcionalmente filtrado por categoría."""
    items = list(COMMODITIES.values())
    if category:
        items = [c for c in items if c["category"] == category.lower()]
    return items


def get_commodity(slug: str) -> dict[str, Any] | None:
    return COMMODITIES.get(slug.lower())


CATEGORIES = ("grains", "oils", "dairy", "softs", "meat", "energy", "metals", "freight")


__all__ = ["COMMODITIES", "CATEGORIES", "list_commodities", "get_commodity"]
