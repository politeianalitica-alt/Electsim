"""UN Comtrade client · comercio bilateral mundial por HS code.

Sprint P3 del módulo Puertos.

Endpoint usado: https://comtradeapi.un.org/data/v1/get/{type}/{frequency}/{class}
  - type=C (Commodities) · class=HS · frequency=M (mensual) o A (anual)
  - registro gratuito en https://comtradeplus.un.org (key opcional)

Modos:
  - **API real** si `COMTRADE_API_KEY` está en env (límites superiores: 250k
    records/mes free tier).
  - **Demo seed** sin key: devuelve dataset interno representativo (top 10
    partners de España con HS 2-dígitos).

Cache: cada query se persiste en `trade_flows` (UPSERT por uq_trade_flows_natural).
Una segunda llamada idéntica responde desde BD (>24h se considera stale).

Funciones:
  - bilateral_trade(reporter_iso, partner_iso, hs_code?, period_ym?) -> dict
  - top_partners(reporter_iso, period_ym?, flow_kind?, limit=10) -> list[dict]
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

COMTRADE_BASE = "https://comtradeapi.un.org/data/v1/get/C/M/HS"
CACHE_TTL_HOURS = 24


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


def is_real_api_available() -> bool:
    """¿API Comtrade alcanzable? · key opcional (anon free tier funciona).

    La API v1 permite consultas anónimas con rate limits bajos. Si
    `COMTRADE_API_KEY` está configurada, los límites son superiores
    (250k registros/mes). En cualquier caso necesitamos httpx o requests.
    Forzar modo seed con `COMTRADE_FORCE_SEED=1` (útil en CI/tests).
    """
    if os.environ.get("COMTRADE_FORCE_SEED") == "1":
        return False
    try:
        import httpx  # noqa: F401
        return True
    except ImportError:
        try:
            import requests  # noqa: F401
            return True
        except ImportError:
            return False


def has_api_key() -> bool:
    """¿La key explícita está configurada? · solo informativo."""
    return bool(os.environ.get("COMTRADE_API_KEY"))


# ─────────────────────────────────────────────────────────────────
# Cache helpers
# ─────────────────────────────────────────────────────────────────

def _cache_get(
    reporter: str, partner: str, hs_code: str | None, period: str | None,
    flow: str, source: str = "comtrade",
) -> list[dict[str, Any]]:
    engine = _get_engine()
    if engine is None:
        return []
    try:
        from sqlalchemy import text
        since = _now() - timedelta(hours=CACHE_TTL_HOURS)
        sql = (
            "SELECT reporter_iso, partner_iso, hs_code, period_ym, flow_kind, "
            "value_usd, qty, unit, source FROM trade_flows "
            "WHERE reporter_iso=:r AND partner_iso=:p AND flow_kind=:f "
            "AND source=:s AND fetched_at >= :since"
        )
        params: dict[str, Any] = {
            "r": reporter.upper(), "p": partner.upper(),
            "f": flow, "s": source, "since": since,
        }
        if hs_code:
            sql += " AND hs_code=:hs"
            params["hs"] = hs_code
        if period:
            sql += " AND period_ym=:pm"
            params["pm"] = period
        with engine.connect() as cx:
            rows = cx.execute(text(sql), params).mappings().all()
        return [dict(r) for r in rows]
    except Exception as exc:
        logger.debug("_cache_get falló: %s", exc)
        return []


def _cache_put(rows: list[dict[str, Any]]) -> int:
    """UPSERT por UNIQUE natural · devuelve nº filas insertadas/actualizadas."""
    engine = _get_engine()
    if engine is None or not rows:
        return 0
    try:
        from sqlalchemy import text
        n = 0
        with engine.begin() as cx:
            for r in rows:
                # UPDATE first
                u = cx.execute(
                    text(
                        "UPDATE trade_flows SET value_usd=:v, qty=:q, unit=:u, "
                        "fetched_at=CURRENT_TIMESTAMP "
                        "WHERE reporter_iso=:r AND partner_iso=:p AND "
                        "COALESCE(hs_code,'') = COALESCE(:hs,'') AND "
                        "period_ym=:pm AND flow_kind=:f AND source=:s"
                    ),
                    {
                        "v": r.get("value_usd"), "q": r.get("qty"),
                        "u": r.get("unit"),
                        "r": r["reporter_iso"], "p": r["partner_iso"],
                        "hs": r.get("hs_code"), "pm": r["period_ym"],
                        "f": r["flow_kind"], "s": r["source"],
                    },
                )
                if u.rowcount == 0:
                    cx.execute(
                        text(
                            "INSERT INTO trade_flows (reporter_iso, partner_iso, "
                            "hs_code, period_ym, flow_kind, value_usd, qty, unit, source) "
                            "VALUES (:r,:p,:hs,:pm,:f,:v,:q,:u,:s)"
                        ),
                        {
                            "r": r["reporter_iso"], "p": r["partner_iso"],
                            "hs": r.get("hs_code"), "pm": r["period_ym"],
                            "f": r["flow_kind"], "v": r.get("value_usd"),
                            "q": r.get("qty"), "u": r.get("unit"),
                            "s": r["source"],
                        },
                    )
                n += 1
        return n
    except Exception as exc:
        logger.debug("_cache_put falló: %s", exc)
        return 0


# ─────────────────────────────────────────────────────────────────
# Seed demo · top partners de España (2024 aprox · datos públicos AEAT)
# ─────────────────────────────────────────────────────────────────

# (reporter, partner, hs, period, flow, value_usd_millones, qty, unit)
_DEMO_SEED: list[dict[str, Any]] = [
    # Exportaciones España 2024
    {"reporter_iso": "ESP", "partner_iso": "FRA", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 56400_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "DEU", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 36800_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "ITA", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 30200_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "PRT", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 28100_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "GBR", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 23700_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "USA", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 18900_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "MAR", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 11200_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "MEX", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 7400_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "TUR", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 6800_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "CHN", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 6100_000_000.0, "qty": None, "unit": "USD"},

    # Importaciones España 2024
    {"reporter_iso": "ESP", "partner_iso": "CHN", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "import", "value_usd": 47200_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "DEU", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "import", "value_usd": 44800_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "FRA", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "import", "value_usd": 36700_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "ITA", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "import", "value_usd": 27400_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "USA", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "import", "value_usd": 18600_000_000.0, "qty": None, "unit": "USD"},
    {"reporter_iso": "ESP", "partner_iso": "RUS", "hs_code": None, "period_ym": "2024-12",
     "flow_kind": "import", "value_usd": 4200_000_000.0, "qty": None, "unit": "USD"},

    # HS 27 (crudo + productos petrolíferos) ESP-CN
    {"reporter_iso": "ESP", "partner_iso": "CHN", "hs_code": "27", "period_ym": "2024-12",
     "flow_kind": "import", "value_usd": 2100_000_000.0, "qty": None, "unit": "USD"},
    # HS 87 (vehículos) ESP-DE
    {"reporter_iso": "ESP", "partner_iso": "DEU", "hs_code": "87", "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 9800_000_000.0, "qty": None, "unit": "USD"},
    # HS 30 (farma) ESP-USA
    {"reporter_iso": "ESP", "partner_iso": "USA", "hs_code": "30", "period_ym": "2024-12",
     "flow_kind": "export", "value_usd": 4100_000_000.0, "qty": None, "unit": "USD"},
]


def _seed_match(
    reporter: str, partner: str, hs_code: str | None,
    period: str | None, flow: str | None,
) -> list[dict[str, Any]]:
    r = reporter.upper()
    p = partner.upper()
    out = []
    for row in _DEMO_SEED:
        if row["reporter_iso"] != r or row["partner_iso"] != p:
            continue
        if flow and row["flow_kind"] != flow:
            continue
        if hs_code and row["hs_code"] != hs_code:
            continue
        if period and row["period_ym"] != period:
            continue
        out.append({**row, "source": "comtrade_demo"})
    return out


# ─────────────────────────────────────────────────────────────────
# API pública
# ─────────────────────────────────────────────────────────────────

def bilateral_trade(
    reporter_iso: str,
    partner_iso: str,
    hs_code: str | None = None,
    period_ym: str | None = None,
    flow_kind: str | None = None,
) -> dict[str, Any]:
    """Devuelve filas trade_flows · cache-first, fallback API/seed.

    Args:
        reporter_iso: ISO-3 alpha-3 (ej. 'ESP', 'CHN')
        partner_iso: ISO-3 alpha-3
        hs_code: HS hasta 8 dígitos, None=totales
        period_ym: 'YYYY-MM', None=último disponible
        flow_kind: 'export'|'import'|None (ambos)

    Returns:
        {ok, items, n_items, source, reporter_iso, partner_iso, ...}
    """
    r = reporter_iso.upper()
    p = partner_iso.upper()

    # Cache lookup
    cached_export = _cache_get(r, p, hs_code, period_ym, "export")
    cached_import = _cache_get(r, p, hs_code, period_ym, "import")
    cached = cached_export + cached_import
    if flow_kind:
        cached = [c for c in cached if c["flow_kind"] == flow_kind]
    if cached:
        return {
            "ok": True, "items": cached, "n_items": len(cached),
            "source": "cache", "reporter_iso": r, "partner_iso": p,
        }

    # Real API si está disponible · siempre con fallback a seed cuando falla
    rows: list[dict[str, Any]] = []
    if is_real_api_available():
        rows = _fetch_real_api(r, p, hs_code, period_ym, flow_kind)
    if not rows:
        if flow_kind != "import":
            rows += _seed_match(r, p, hs_code, period_ym, "export")
        if flow_kind != "export":
            rows += _seed_match(r, p, hs_code, period_ym, "import")

    if rows:
        _cache_put(rows)
        return {
            "ok": True, "items": rows, "n_items": len(rows),
            "source": rows[0]["source"], "reporter_iso": r, "partner_iso": p,
        }
    return {
        "ok": True, "items": [], "n_items": 0,
        "source": "no_data", "reporter_iso": r, "partner_iso": p,
        "note": "Sin datos en seed demo · configura COMTRADE_API_KEY para API real",
    }


def top_partners(
    reporter_iso: str,
    period_ym: str | None = None,
    flow_kind: str = "export",
    limit: int = 10,
) -> dict[str, Any]:
    """Top N partners por valor · útil para 'mapa de socios comerciales'."""
    r = reporter_iso.upper()

    # Cache: agregar por partner
    engine = _get_engine()
    if engine is not None:
        try:
            from sqlalchemy import text
            sql = (
                "SELECT partner_iso, SUM(value_usd) AS total "
                "FROM trade_flows "
                "WHERE reporter_iso=:r AND flow_kind=:f AND hs_code IS NULL"
            )
            params: dict[str, Any] = {"r": r, "f": flow_kind}
            if period_ym:
                sql += " AND period_ym=:pm"
                params["pm"] = period_ym
            sql += " GROUP BY partner_iso ORDER BY total DESC LIMIT :lim"
            params["lim"] = limit
            with engine.connect() as cx:
                rows = cx.execute(text(sql), params).mappings().all()
            if rows:
                return {
                    "ok": True, "reporter_iso": r, "flow_kind": flow_kind,
                    "items": [{"partner_iso": x["partner_iso"], "value_usd": float(x["total"])} for x in rows],
                    "source": "cache",
                }
        except Exception as exc:
            logger.debug("top_partners cache fallback: %s", exc)

    # Fallback seed
    rows = [
        s for s in _DEMO_SEED
        if s["reporter_iso"] == r and s["flow_kind"] == flow_kind
        and s["hs_code"] is None
        and (period_ym is None or s["period_ym"] == period_ym)
    ]
    rows.sort(key=lambda x: x.get("value_usd") or 0, reverse=True)
    rows = rows[:limit]
    return {
        "ok": True, "reporter_iso": r, "flow_kind": flow_kind,
        "items": [
            {"partner_iso": r["partner_iso"], "value_usd": r["value_usd"]} for r in rows
        ],
        "source": "comtrade_demo",
    }


# ─────────────────────────────────────────────────────────────────
# ISO3 → M49 numeric · Comtrade API usa códigos numéricos UNSD
# ─────────────────────────────────────────────────────────────────

ISO3_TO_M49: dict[str, int] = {
    "ESP": 724, "DEU": 276, "FRA": 251, "ITA": 381, "PRT": 620,
    "NLD": 528, "BEL": 56, "GBR": 826, "IRL": 372, "POL": 616,
    "GRC": 300, "AUT": 40, "DNK": 208, "FIN": 246, "SWE": 752,
    "CZE": 203, "ROU": 642, "HUN": 348, "BGR": 100, "HRV": 191,
    "SVK": 703, "SVN": 705, "LTU": 440, "LVA": 428, "EST": 233,
    "LUX": 442, "MLT": 470, "CYP": 196,
    "USA": 842, "MEX": 484, "CAN": 124, "BRA": 76, "ARG": 32,
    "CHN": 156, "JPN": 392, "KOR": 410, "IND": 699, "IDN": 360,
    "VNM": 704, "THA": 764, "MYS": 458, "SGP": 702, "PHL": 608,
    "AUS": 36, "NZL": 554,
    "MAR": 504, "DZA": 12, "TUN": 788, "EGY": 818, "ZAF": 710,
    "TUR": 792, "RUS": 643, "UKR": 804, "BLR": 112,
    "ARE": 784, "SAU": 682, "QAT": 634, "KWT": 414, "IRN": 364,
    "ISR": 376, "JOR": 400, "LBN": 422, "OMN": 512,
    "CHE": 757, "NOR": 579, "ISL": 352,
    "World": 0,
}


def _fetch_real_api(
    reporter: str, partner: str, hs_code: str | None,
    period: str | None, flow_kind: str | None,
) -> list[dict[str, Any]]:
    """Llamada real a UN Comtrade API v1.

    Endpoint: https://comtradeapi.un.org/data/v1/get/C/M/HS
    Devuelve una lista normalizada con shape compatible con _DEMO_SEED.

    Falla cerrado: si la red falla, devuelve [] · el caller cae a seed.
    """
    rep_m49 = ISO3_TO_M49.get(reporter.upper())
    par_m49 = ISO3_TO_M49.get(partner.upper())
    if rep_m49 is None or par_m49 is None:
        logger.info("comtrade · ISO3 fuera de mapping %s/%s · cae a seed", reporter, partner)
        return []

    # Comtrade espera period sin guión (YYYYMM). Si no se da, usa último cerrado.
    if period:
        period_clean = period.replace("-", "")[:6]
    else:
        # Último mes con datos típicamente publicados (2 meses atrás)
        from datetime import datetime, timedelta, timezone
        ago = datetime.now(timezone.utc) - timedelta(days=70)
        period_clean = ago.strftime("%Y%m")

    # Flow Comtrade: M=Imports, X=Exports, RX=Re-exports, RM=Re-imports
    flow_filter: str | None = None
    if flow_kind == "export":
        flow_filter = "X"
    elif flow_kind == "import":
        flow_filter = "M"

    params: dict[str, Any] = {
        "reporterCode": rep_m49,
        "partnerCode": par_m49,
        "period": period_clean,
        "cmdCode": hs_code or "TOTAL",
        "partner2Code": 0,
        "motCode": 0,
        "customsCode": "C00",
        "format": "JSON",
        "includeDesc": "true",
    }
    if flow_filter:
        params["flowCode"] = flow_filter

    headers: dict[str, str] = {"Accept": "application/json"}
    api_key = os.environ.get("COMTRADE_API_KEY", "").strip()
    if api_key:
        headers["Ocp-Apim-Subscription-Key"] = api_key

    raw_rows: list[dict[str, Any]] = []
    try:
        try:
            import httpx
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(COMTRADE_BASE, params=params, headers=headers)
                resp.raise_for_status()
                payload = resp.json()
        except ImportError:
            import requests  # type: ignore[import-not-found]
            resp = requests.get(COMTRADE_BASE, params=params, headers=headers, timeout=30.0)
            resp.raise_for_status()
            payload = resp.json()
        raw_rows = payload.get("data") or []
    except Exception as exc:
        logger.warning(
            "comtrade real API failed reporter=%s partner=%s period=%s: %s",
            reporter, partner, period_clean, exc,
        )
        return []

    # Normalizar al shape interno
    out: list[dict[str, Any]] = []
    for r in raw_rows:
        flow_code = r.get("flowCode") or r.get("rgCode") or ""
        flow_kind_norm = "export" if str(flow_code).upper().startswith("X") else "import"
        out.append({
            "reporter_iso": reporter.upper(),
            "partner_iso": partner.upper(),
            "hs_code": str(r.get("cmdCode") or hs_code or "TOTAL"),
            "period_ym": period_clean[:4] + "-" + period_clean[4:6] if len(period_clean) >= 6 else period_clean,
            "flow_kind": flow_kind_norm,
            "value_usd": float(r.get("primaryValue") or 0),
            "qty": float(r.get("qty") or 0) if r.get("qty") is not None else None,
            "unit": r.get("qtyUnitAbbr") or None,
            "source": "comtrade",
        })
    logger.info(
        "comtrade real API ok reporter=%s partner=%s rows=%d",
        reporter, partner, len(out),
    )
    return out


__all__ = [
    "bilateral_trade",
    "top_partners",
    "is_real_api_available",
    "has_api_key",
]
