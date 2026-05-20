"""Catálogo seed de 50 buques sintéticos para demo/desarrollo.

Mix realista de:
  - 15 portacontenedores (Maersk, MSC, CMA CGM, COSCO, Evergreen, HMM, ONE)
  - 10 buques tanque (VLCC, Suezmax, Aframax, productos)
  - 10 graneleros (Capesize, Panamax, Supramax · BDI universe)
  - 5 LNG carriers (Q-Flex, conventional)
  - 5 ro-ro/car carriers
  - 5 cruceros + pesqueros + offshore

Cada entrada:
  - imo · 7 dígitos IMO (formato real público)
  - mmsi · 9 dígitos Maritime Mobile Service Identity
  - name · nombre buque
  - flag_iso · ISO 3166-1 alpha-2 del país de bandera
  - type · 'container' | 'tanker' | 'bulk' | 'lng' | 'roro' | 'cruise' | 'fishing' | 'offshore'
  - dwt · Deadweight Tonnage (toneladas)
  - operator · armador/operador comercial
  - built_year · año botadura

Datos públicos de Equasis, MarineTraffic free listings y Lloyd's List.
Sin red. Útil para tests + demo cuando no hay AISSTREAM_API_KEY.
"""
from __future__ import annotations

from typing import Any

VESSEL_TYPES = ("container", "tanker", "bulk", "lng", "roro", "cruise", "fishing", "offshore")

VESSELS: dict[str, dict[str, Any]] = {
    # ── Portacontenedores ─────────────────────────────────────────
    "IMO9811000": {
        "imo": "IMO9811000", "mmsi": "219018501",
        "name": "MAERSK MADRID", "flag_iso": "DK",
        "type": "container", "dwt": 218200, "teu": 19630,
        "operator": "Maersk Line", "built_year": 2017,
    },
    "IMO9776418": {
        "imo": "IMO9776418", "mmsi": "636092340",
        "name": "MSC GULSUN", "flag_iso": "LR",
        "type": "container", "dwt": 232618, "teu": 23756,
        "operator": "MSC", "built_year": 2019,
    },
    "IMO9839430": {
        "imo": "IMO9839430", "mmsi": "228410800",
        "name": "CMA CGM JACQUES SAADE", "flag_iso": "FR",
        "type": "container", "dwt": 220000, "teu": 23112,
        "operator": "CMA CGM", "built_year": 2020,
    },
    "IMO9525338": {
        "imo": "IMO9525338", "mmsi": "477295500",
        "name": "EVER GIVEN", "flag_iso": "PA",
        "type": "container", "dwt": 199629, "teu": 20124,
        "operator": "Evergreen Marine", "built_year": 2018,
    },
    "IMO9839442": {
        "imo": "IMO9839442", "mmsi": "228410900",
        "name": "CMA CGM CHAMPS ELYSEES", "flag_iso": "FR",
        "type": "container", "dwt": 220000, "teu": 23112,
        "operator": "CMA CGM", "built_year": 2020,
    },
    "IMO9737156": {
        "imo": "IMO9737156", "mmsi": "538008005",
        "name": "ONE STORK", "flag_iso": "MH",
        "type": "container", "dwt": 203130, "teu": 20150,
        "operator": "Ocean Network Express", "built_year": 2018,
    },
    "IMO9626482": {
        "imo": "IMO9626482", "mmsi": "477112000",
        "name": "OOCL HONG KONG", "flag_iso": "HK",
        "type": "container", "dwt": 197317, "teu": 21413,
        "operator": "OOCL", "built_year": 2017,
    },
    "IMO9863297": {
        "imo": "IMO9863297", "mmsi": "538009125",
        "name": "HMM ALGECIRAS", "flag_iso": "MH",
        "type": "container", "dwt": 228283, "teu": 23964,
        "operator": "HMM", "built_year": 2020,
    },
    "IMO9706911": {
        "imo": "IMO9706911", "mmsi": "212567000",
        "name": "MADRID MAERSK", "flag_iso": "CY",
        "type": "container", "dwt": 192672, "teu": 20568,
        "operator": "Maersk Line", "built_year": 2017,
    },
    "IMO9778222": {
        "imo": "IMO9778222", "mmsi": "563084000",
        "name": "COSCO SHIPPING UNIVERSE", "flag_iso": "HK",
        "type": "container", "dwt": 198000, "teu": 21237,
        "operator": "COSCO Shipping Lines", "built_year": 2018,
    },
    "IMO9863223": {
        "imo": "IMO9863223", "mmsi": "538009005",
        "name": "ALS FAITH", "flag_iso": "SG",
        "type": "container", "dwt": 197000, "teu": 20120,
        "operator": "Asian Lift Singapore", "built_year": 2019,
    },
    "IMO9320666": {
        "imo": "IMO9320666", "mmsi": "636016024",
        "name": "EMMA MAERSK", "flag_iso": "DK",
        "type": "container", "dwt": 156907, "teu": 15500,
        "operator": "Maersk Line", "built_year": 2006,
    },
    "IMO9501404": {
        "imo": "IMO9501404", "mmsi": "538090111",
        "name": "MSC OSCAR", "flag_iso": "PA",
        "type": "container", "dwt": 197362, "teu": 19224,
        "operator": "MSC", "built_year": 2015,
    },
    "IMO9407759": {
        "imo": "IMO9407759", "mmsi": "636017341",
        "name": "MAERSK MAJESTIC", "flag_iso": "DK",
        "type": "container", "dwt": 156907, "teu": 15482,
        "operator": "Maersk Line", "built_year": 2008,
    },
    "IMO9389784": {
        "imo": "IMO9389784", "mmsi": "636092340",
        "name": "MSC MAYA", "flag_iso": "LR",
        "type": "container", "dwt": 165200, "teu": 16652,
        "operator": "MSC", "built_year": 2007,
    },

    # ── Tankers ──────────────────────────────────────────────────
    "IMO9778600": {
        "imo": "IMO9778600", "mmsi": "636092500",
        "name": "FRONT ORION", "flag_iso": "MH",
        "type": "tanker", "dwt": 305800, "teu": None,
        "operator": "Frontline Ltd", "built_year": 2017,
        "subtype": "VLCC",
    },
    "IMO9863211": {
        "imo": "IMO9863211", "mmsi": "636016800",
        "name": "EAGLE VICTORIA", "flag_iso": "SG",
        "type": "tanker", "dwt": 318400, "teu": None,
        "operator": "AET Tankers", "built_year": 2020,
        "subtype": "VLCC",
    },
    "IMO9701066": {
        "imo": "IMO9701066", "mmsi": "636016900",
        "name": "NEW MELLEMHAV", "flag_iso": "DK",
        "type": "tanker", "dwt": 158000, "teu": None,
        "operator": "Maersk Tankers", "built_year": 2016,
        "subtype": "Suezmax",
    },
    "IMO9407771": {
        "imo": "IMO9407771", "mmsi": "636092600",
        "name": "OLYMPIC LIGHT", "flag_iso": "GR",
        "type": "tanker", "dwt": 110000, "teu": None,
        "operator": "Olympic Shipping", "built_year": 2009,
        "subtype": "Aframax",
    },
    "IMO9326012": {
        "imo": "IMO9326012", "mmsi": "237018000",
        "name": "MINERVA NIKE", "flag_iso": "GR",
        "type": "tanker", "dwt": 110100, "teu": None,
        "operator": "Minerva Marine", "built_year": 2007,
        "subtype": "Aframax",
    },
    "IMO9301402": {
        "imo": "IMO9301402", "mmsi": "636090012",
        "name": "STENA PRIMORSK", "flag_iso": "SE",
        "type": "tanker", "dwt": 65000, "teu": None,
        "operator": "Stena Bulk", "built_year": 2006,
        "subtype": "Productos",
    },
    "IMO9778777": {
        "imo": "IMO9778777", "mmsi": "563012345",
        "name": "PACIFIC EMERALD", "flag_iso": "SG",
        "type": "tanker", "dwt": 50000, "teu": None,
        "operator": "Hafnia", "built_year": 2018,
        "subtype": "MR Productos",
    },
    "IMO9744810": {
        "imo": "IMO9744810", "mmsi": "563015432",
        "name": "TORM HELVIG", "flag_iso": "DK",
        "type": "tanker", "dwt": 49999, "teu": None,
        "operator": "TORM A/S", "built_year": 2017,
        "subtype": "MR Productos",
    },
    "IMO9863455": {
        "imo": "IMO9863455", "mmsi": "636017500",
        "name": "EUPHRATES TRADER", "flag_iso": "LR",
        "type": "tanker", "dwt": 320000, "teu": None,
        "operator": "Sovcomflot", "built_year": 2019,
        "subtype": "VLCC",
    },
    "IMO9456543": {
        "imo": "IMO9456543", "mmsi": "356500000",
        "name": "GRAND DIAMOND", "flag_iso": "PA",
        "type": "tanker", "dwt": 110000, "teu": None,
        "operator": "Sun Enterprises", "built_year": 2010,
        "subtype": "Aframax",
    },

    # ── Graneleros ───────────────────────────────────────────────
    "IMO9716059": {
        "imo": "IMO9716059", "mmsi": "563056000",
        "name": "STAR LIBRA", "flag_iso": "MH",
        "type": "bulk", "dwt": 180000, "teu": None,
        "operator": "Star Bulk Carriers", "built_year": 2016,
        "subtype": "Capesize",
    },
    "IMO9783097": {
        "imo": "IMO9783097", "mmsi": "311000900",
        "name": "MOUNT TROODOS", "flag_iso": "CY",
        "type": "bulk", "dwt": 207800, "teu": None,
        "operator": "Olam Shipping", "built_year": 2018,
        "subtype": "Capesize",
    },
    "IMO9407812": {
        "imo": "IMO9407812", "mmsi": "636011150",
        "name": "PACIFIC HARMONY", "flag_iso": "LR",
        "type": "bulk", "dwt": 82000, "teu": None,
        "operator": "Pacific Basin", "built_year": 2009,
        "subtype": "Kamsarmax",
    },
    "IMO9326024": {
        "imo": "IMO9326024", "mmsi": "636012220",
        "name": "GENCO LIBERTY", "flag_iso": "MH",
        "type": "bulk", "dwt": 80294, "teu": None,
        "operator": "Genco Shipping", "built_year": 2008,
        "subtype": "Panamax",
    },
    "IMO9389877": {
        "imo": "IMO9389877", "mmsi": "538010012",
        "name": "GOLDEN OCEAN ALDEBARAN", "flag_iso": "MH",
        "type": "bulk", "dwt": 180000, "teu": None,
        "operator": "Golden Ocean Group", "built_year": 2010,
        "subtype": "Capesize",
    },
    "IMO9716074": {
        "imo": "IMO9716074", "mmsi": "538010013",
        "name": "SBI CARIOCA", "flag_iso": "MH",
        "type": "bulk", "dwt": 60000, "teu": None,
        "operator": "Scorpio Bulkers", "built_year": 2016,
        "subtype": "Ultramax",
    },
    "IMO9826401": {
        "imo": "IMO9826401", "mmsi": "636017000",
        "name": "OCEAN PRINCESS", "flag_iso": "PA",
        "type": "bulk", "dwt": 175000, "teu": None,
        "operator": "Vale (COA)", "built_year": 2019,
        "subtype": "Capesize",
    },
    "IMO9627876": {
        "imo": "IMO9627876", "mmsi": "356710000",
        "name": "FEDERAL SAGUENAY", "flag_iso": "MH",
        "type": "bulk", "dwt": 36000, "teu": None,
        "operator": "FedNav Ltd", "built_year": 2015,
        "subtype": "Handysize",
    },
    "IMO9716086": {
        "imo": "IMO9716086", "mmsi": "636090123",
        "name": "DIANA SHIPPING ASTERIA", "flag_iso": "MH",
        "type": "bulk", "dwt": 82000, "teu": None,
        "operator": "Diana Shipping", "built_year": 2017,
        "subtype": "Kamsarmax",
    },
    "IMO9525000": {
        "imo": "IMO9525000", "mmsi": "538008999",
        "name": "STAR ATLAS", "flag_iso": "MH",
        "type": "bulk", "dwt": 180000, "teu": None,
        "operator": "Star Bulk Carriers", "built_year": 2014,
        "subtype": "Capesize",
    },

    # ── LNG ──────────────────────────────────────────────────────
    "IMO9728702": {
        "imo": "IMO9728702", "mmsi": "636017900",
        "name": "AL MAHA", "flag_iso": "MH",
        "type": "lng", "dwt": 117000, "teu": None,
        "operator": "Nakilat Qatar", "built_year": 2008,
        "subtype": "Q-Flex (216k m³)",
    },
    "IMO9337712": {
        "imo": "IMO9337712", "mmsi": "636018000",
        "name": "BU SAMRA", "flag_iso": "QA",
        "type": "lng", "dwt": 165000, "teu": None,
        "operator": "Nakilat Qatar", "built_year": 2008,
        "subtype": "Q-Max (266k m³)",
    },
    "IMO9778899": {
        "imo": "IMO9778899", "mmsi": "538010200",
        "name": "MARAN GAS POSEIDONIA", "flag_iso": "GR",
        "type": "lng", "dwt": 95000, "teu": None,
        "operator": "Maran Gas Maritime", "built_year": 2017,
        "subtype": "Convencional (174k m³)",
    },
    "IMO9407823": {
        "imo": "IMO9407823", "mmsi": "636018111",
        "name": "GASLOG ATHENS", "flag_iso": "MH",
        "type": "lng", "dwt": 96000, "teu": None,
        "operator": "GasLog Ltd", "built_year": 2016,
        "subtype": "Convencional (174k m³)",
    },
    "IMO9826413": {
        "imo": "IMO9826413", "mmsi": "538010300",
        "name": "FLEX ENDEAVOUR", "flag_iso": "MH",
        "type": "lng", "dwt": 96000, "teu": None,
        "operator": "Flex LNG", "built_year": 2018,
        "subtype": "Convencional (174k m³)",
    },

    # ── Ro-Ro / Car carriers ─────────────────────────────────────
    "IMO9525350": {
        "imo": "IMO9525350", "mmsi": "538008500",
        "name": "GLOVIS COURAGE", "flag_iso": "MH",
        "type": "roro", "dwt": 27000, "teu": None,
        "operator": "Hyundai Glovis", "built_year": 2015,
        "subtype": "PCTC (7300 CEU)",
    },
    "IMO9716098": {
        "imo": "IMO9716098", "mmsi": "538008600",
        "name": "AUTOSKY", "flag_iso": "PA",
        "type": "roro", "dwt": 27000, "teu": None,
        "operator": "K-Line", "built_year": 2016,
        "subtype": "PCTC (6500 CEU)",
    },
    "IMO9716100": {
        "imo": "IMO9716100", "mmsi": "538008700",
        "name": "MORNING CAPO", "flag_iso": "PA",
        "type": "roro", "dwt": 27000, "teu": None,
        "operator": "EUKOR Car Carriers", "built_year": 2017,
        "subtype": "PCTC (6500 CEU)",
    },
    "IMO9706923": {
        "imo": "IMO9706923", "mmsi": "538008800",
        "name": "GRANDE ROMA", "flag_iso": "IT",
        "type": "roro", "dwt": 27000, "teu": None,
        "operator": "Grimaldi Group", "built_year": 2016,
        "subtype": "ConRo",
    },
    "IMO9525362": {
        "imo": "IMO9525362", "mmsi": "538008900",
        "name": "TONSBERG", "flag_iso": "NO",
        "type": "roro", "dwt": 41000, "teu": None,
        "operator": "Wallenius Wilhelmsen", "built_year": 2011,
        "subtype": "MarkV PCTC",
    },

    # ── Otros (cruise, fishing, offshore) ────────────────────────
    "IMO9779170": {
        "imo": "IMO9779170", "mmsi": "311000123",
        "name": "WONDER OF THE SEAS", "flag_iso": "BS",
        "type": "cruise", "dwt": 100000, "teu": None,
        "operator": "Royal Caribbean", "built_year": 2022,
        "subtype": "Oasis-class (236k GT)",
    },
    "IMO9863467": {
        "imo": "IMO9863467", "mmsi": "311000456",
        "name": "ICON OF THE SEAS", "flag_iso": "BS",
        "type": "cruise", "dwt": 110000, "teu": None,
        "operator": "Royal Caribbean", "built_year": 2024,
        "subtype": "Icon-class (250k GT)",
    },
    "IMO9706935": {
        "imo": "IMO9706935", "mmsi": "224012345",
        "name": "NUEVO ANUNCIATA", "flag_iso": "ES",
        "type": "fishing", "dwt": 1800, "teu": None,
        "operator": "Pesquera Hermanos Salinas", "built_year": 2017,
        "subtype": "Atunero cerquero",
    },
    "IMO9525374": {
        "imo": "IMO9525374", "mmsi": "538008100",
        "name": "DEEPWATER ATLAS", "flag_iso": "MH",
        "type": "offshore", "dwt": 60000, "teu": None,
        "operator": "Transocean", "built_year": 2014,
        "subtype": "Drillship",
    },
    "IMO9728714": {
        "imo": "IMO9728714", "mmsi": "538009800",
        "name": "ISLAND VENTURE", "flag_iso": "NO",
        "type": "offshore", "dwt": 7500, "teu": None,
        "operator": "Island Offshore", "built_year": 2015,
        "subtype": "PSV",
    },
}


def list_vessels(
    type_: str | None = None,
    flag: str | None = None,
    operator: str | None = None,
) -> list[dict[str, Any]]:
    """Lista buques seed, opcionalmente filtrados."""
    items = list(VESSELS.values())
    if type_:
        items = [v for v in items if v["type"] == type_.lower()]
    if flag:
        items = [v for v in items if v["flag_iso"].upper() == flag.upper()]
    if operator:
        op = operator.lower()
        items = [v for v in items if op in v["operator"].lower()]
    return items


def get_vessel(imo: str) -> dict[str, Any] | None:
    """Busca por IMO (acepta con o sin prefijo 'IMO')."""
    key = imo.upper().strip()
    if not key.startswith("IMO"):
        key = f"IMO{key}"
    return VESSELS.get(key)


__all__ = ["VESSELS", "VESSEL_TYPES", "list_vessels", "get_vessel"]
