"""WTO Timeseries API · https://api.wto.org/timeseries/v1

World Trade Organization · estadísticas comerciales multilaterales oficiales.
58 indicadores cubriendo:
  - 28 Merchandise trade statistics (exports/imports totales por país y producto)
  - 18 Tariff (MFN applied tariffs, agricultural/non-agricultural, etc.)
  - 12 Trade in services statistics

Auth · header `Ocp-Apim-Subscription-Key`
Free tier · sin rate-limit publicado (cache 12h por defecto)

Use cases en Politeia:
  - Snapshot exports/imports España series multi-año
  - Aranceles MFN aplicados por sectores (complemento a Comtrade)
  - Trade in services bilateral (cobertura que Comtrade no tiene)
  - Comparativa España vs UE vs G7
  - Tarifas para defensa comercial / contramedidas
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

WTO_BASE = "https://api.wto.org/timeseries/v1"
DEFAULT_TIMEOUT_S = 20

_cache: dict[tuple, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(hours=12)


# Reporters codes (WTO numeric ≠ ISO numeric en algunos casos)
WTO_REPORTERS_KEY = {
    "ESP": 724,  # Spain
    "FRA": 251,  # France
    "DEU": 276,  # Germany
    "ITA": 381,  # Italy
    "PRT": 620,  # Portugal
    "GBR": 826,  # UK
    "USA": 840,  # USA
    "CHN": 156,  # China
    "JPN": 392,  # Japan
    "CAN": 124,  # Canada
    "MEX": 484,  # Mexico
    "BRA": 76,   # Brazil
    "MAR": 504,  # Morocco
    "TUR": 792,  # Turkey
    "IND": 699,  # India  (numérico WTO)
    "RUS": 643,
    "EU":  918,  # European Union (28/27)
}

# Indicadores top · subset más útil
KEY_INDICATORS = {
    # Merchandise trade
    "exports_total": "ITS_MTV_AX",
    "imports_total": "ITS_MTV_AM",
    "exports_agri": "ITS_MTV_AGR_AX",
    "imports_agri": "ITS_MTV_AGR_AM",
    "exports_manuf": "ITS_MTV_MNF_AX",
    "imports_manuf": "ITS_MTV_MNF_AM",
    "exports_fuels_mining": "ITS_MTV_FME_AX",
    # Services (Trade in Services)
    "services_exports": "ITS_CS_AX5",
    "services_imports": "ITS_CS_AM5",
    # Tariffs
    "tariff_simple_all": "TP_A_0010",
    "tariff_simple_agri": "TP_A_0160",
    "tariff_simple_nonagri": "TP_A_0430",
    "tariff_weighted_all": "TP_A_0030",
    "tariff_weighted_agri": "TP_A_0170",
    # Trade restrictiveness
    "binding_coverage_agri": "TP_A_0410",
    "binding_coverage_nonagri": "TP_A_0420",
}


def is_available() -> bool:
    return bool(os.environ.get("WTO_API_KEY"))


def _cache_get(key: tuple) -> Any | None:
    e = _cache.get(key)
    if not e:
        return None
    exp, payload = e
    if datetime.now(timezone.utc) >= exp:
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: tuple, payload: Any) -> None:
    _cache[key] = (datetime.now(timezone.utc) + _CACHE_TTL, payload)


def _request(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """GET autenticado · cache + falla cerrado · handle latin1 encoding.

    El WTO declara content-type UTF-8 pero a veces sirve latin-1 (nombres
    con caracteres especiales). Forzamos decode robusto.
    """
    if not is_available():
        return {"error": "missing_key"}

    cache_key = (path, tuple(sorted((params or {}).items())))
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        import httpx
    except ImportError:
        return {"error": "missing_httpx"}

    headers = {
        "Ocp-Apim-Subscription-Key": os.environ["WTO_API_KEY"],
        "Accept": "application/json",
    }
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(f"{WTO_BASE}{path}", params=params or {}, headers=headers)
        if r.status_code == 429:
            return {"error": "rate_limited"}
        r.raise_for_status()
        # Robust decode · try utf-8 primero, fallback latin-1
        try:
            payload = r.json()
        except UnicodeDecodeError:
            payload = json.loads(r.content.decode("latin-1"))
        except Exception:
            text = r.content.decode("latin-1", errors="ignore")
            payload = json.loads(text)
        _cache_set(cache_key, payload)
        return payload
    except Exception as exc:
        logger.debug("WTO %s falló: %s", path, exc)
        return {"error": str(exc)[:160]}


# ─────────────────────────────────────────────────────────────────
# API pública
# ─────────────────────────────────────────────────────────────────

def list_indicators() -> list[dict[str, Any]]:
    """58 indicadores disponibles · cubre merchandise/services/tariffs."""
    payload = _request("/indicators")
    return payload if isinstance(payload, list) else []


def list_reporters() -> list[dict[str, Any]]:
    """288 países y agrupaciones reportantes."""
    payload = _request("/reporters")
    return payload if isinstance(payload, list) else []


def datapoints(
    indicator_code: str,
    reporter_code: int | str,
    periods: str | None = None,
    partner_code: int | str | None = None,
    product_code: str | None = None,
    max_rows: int = 5000,
) -> list[dict[str, Any]]:
    """Serie temporal de datapoints.

    Args:
        indicator_code: ej. 'ITS_MTV_AX' (exports total)
        reporter_code: código numérico WTO (ej. 724 España)
        periods: rango 'YYYY-YYYY' o lista 'YYYY,YYYY,YYYY' (ej. '2020,2024')
        partner_code: opcional para flujos bilaterales (default 'all' agregado)
        product_code: opcional HS o WTO products code
    """
    params: dict[str, Any] = {
        "i": indicator_code,
        "r": str(reporter_code),
        "fmt": "json",
        "lang": "1",
        "max": str(max_rows),
    }
    if periods:
        params["ps"] = periods
    if partner_code is not None:
        params["p"] = str(partner_code)
    if product_code:
        params["pc"] = product_code
    payload = _request("/data", params)
    return list((payload or {}).get("Dataset", []))


def spain_trade_overview(periods: str = "2018-2024") -> dict[str, Any]:
    """Snapshot rico de comercio España · exports/imports total + por sector,
    services, aranceles MFN. Una sola estructura completa.
    """
    es_code = 724
    out: dict[str, Any] = {"reporter_code": es_code, "periods": periods, "series": {}}
    for friendly_name, indicator_code in KEY_INDICATORS.items():
        dps = datapoints(indicator_code, es_code, periods=periods)
        out["series"][friendly_name] = [
            {
                "year": d.get("Year"),
                "value": d.get("Value"),
                "unit": d.get("Unit"),
                "indicator": indicator_code,
            }
            for d in dps
            if d.get("Value") is not None
        ]
    return out


def country_trade_overview(iso3: str, periods: str = "2020-2024") -> dict[str, Any]:
    """Snapshot de cualquier país por ISO3."""
    code = WTO_REPORTERS_KEY.get(iso3.upper())
    if code is None:
        return {"error": f"reporter {iso3} no mapeado en WTO_REPORTERS_KEY"}
    out: dict[str, Any] = {
        "iso3": iso3.upper(),
        "reporter_code": code,
        "periods": periods,
        "series": {},
    }
    for friendly_name, indicator_code in KEY_INDICATORS.items():
        dps = datapoints(indicator_code, code, periods=periods)
        out["series"][friendly_name] = [
            {"year": d.get("Year"), "value": d.get("Value"), "unit": d.get("Unit")}
            for d in dps
            if d.get("Value") is not None
        ]
    return out


def tariff_snapshot(reporter_iso3: str = "ESP") -> dict[str, Any]:
    """Snapshot de aranceles MFN aplicados por un país.

    Returns: {reporter, year, all, agri, nonagri} con tarifas promedio.
    """
    code = WTO_REPORTERS_KEY.get(reporter_iso3.upper())
    if code is None:
        return {"error": f"reporter {reporter_iso3} no mapeado"}
    out: dict[str, Any] = {"reporter": reporter_iso3.upper(), "tariffs": {}}
    for key in ("tariff_simple_all", "tariff_simple_agri", "tariff_simple_nonagri",
                "tariff_weighted_all", "tariff_weighted_agri"):
        ind = KEY_INDICATORS[key]
        dps = datapoints(ind, code, periods="2018-2024")
        # Año más reciente
        if dps:
            latest = max(dps, key=lambda d: d.get("Year") or 0)
            out["tariffs"][key] = {
                "year": latest.get("Year"),
                "value": latest.get("Value"),
                "unit": latest.get("Unit"),
            }
    return out


__all__ = [
    "is_available",
    "list_indicators",
    "list_reporters",
    "datapoints",
    "spain_trade_overview",
    "country_trade_overview",
    "tariff_snapshot",
    "WTO_REPORTERS_KEY",
    "KEY_INDICATORS",
]
