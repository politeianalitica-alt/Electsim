"""Conectores de datos económicos · Sprint 0.

14 clases conector + facade EconomyDataHub. Capa de infraestructura HTTP
para todas las APIs económicas externas usadas por el módulo Economía.

No modifica ningún fichero existente. El registry patch lo aplica
`economy_registry_patch.py` y la integración con `economy_core.py` se
realiza en Sprint 1.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any, Iterable

import httpx

logger = logging.getLogger("electsim.integrations.economy")


class EconomyAPIError(Exception):
    """Excepción común para todos los conectores económicos."""


class _Cache:
    """Cache simple en memoria con TTL en segundos."""

    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        ts, value = entry
        if (time.time() - ts) > self._ttl:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (time.time(), value)


def _get(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 20.0,
) -> Any:
    """GET HTTP que normaliza errores en EconomyAPIError."""
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(url, params=params, headers=headers)
        if response.status_code >= 400:
            raise EconomyAPIError(
                f"HTTP {response.status_code} en {url}: {response.text[:200]}"
            )
        return response.json()
    except httpx.RequestError as e:
        raise EconomyAPIError(f"Error de red en {url}: {e}") from e
    except ValueError as e:
        raise EconomyAPIError(f"Respuesta no es JSON válido en {url}: {e}") from e


# ─────────────────────────────────────────────────────────────────────────
# 1. FRED · Federal Reserve Economic Data
# ─────────────────────────────────────────────────────────────────────────
class FREDConnector:
    """Cliente FRED · series macroeconómicas EE.UU. + tipos internacionales."""

    BASE_URL = "https://api.stlouisfed.org/fred/series/observations"
    TTL_DEFAULT = 3600

    def __init__(self, ttl_seconds: int = TTL_DEFAULT) -> None:
        self.api_key = os.environ.get("FRED_API_KEY", "").strip()
        self._cache = _Cache(ttl_seconds=ttl_seconds)

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def series(
        self,
        series_id: str,
        start: str = "2015-01-01",
        end: str | None = None,
    ) -> list[dict[str, Any]]:
        if not self.api_key:
            raise EconomyAPIError("FRED_API_KEY no configurada")

        cache_key = f"fred:{series_id}:{start}:{end or ''}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        params: dict[str, Any] = {
            "series_id": series_id,
            "observation_start": start,
            "file_type": "json",
            "api_key": self.api_key,
        }
        if end:
            params["observation_end"] = end

        data = _get(self.BASE_URL, params=params)
        observations = data.get("observations", [])
        result = [
            {
                "date": obs.get("date"),
                "value": None if obs.get("value") == "." else obs.get("value"),
            }
            for obs in observations
        ]
        self._cache.set(cache_key, result)
        return result

    def series_latest(self, series_id: str) -> dict[str, Any] | None:
        series = self.series(series_id)
        for obs in reversed(series):
            if obs.get("value") is not None:
                return obs
        return None

    def prima_riesgo(self) -> dict[str, Any]:
        es = self.series_latest("IRLTLT01ESM156N")
        de = self.series_latest("IRLTLT01DEM156N")
        if es is None or de is None:
            return {"date": None, "prima_bps": None, "yield_es": None, "yield_de": None}
        try:
            yield_es = float(es["value"])
            yield_de = float(de["value"])
            prima_bps = round((yield_es - yield_de) * 100, 1)
        except (TypeError, ValueError):
            prima_bps = None
            yield_es = None
            yield_de = None
        return {
            "date": es.get("date"),
            "prima_bps": prima_bps,
            "yield_es": yield_es,
            "yield_de": yield_de,
        }

    def multi_country_series(self, series_map: dict[str, str]) -> dict[str, list[dict[str, Any]]]:
        out: dict[str, list[dict[str, Any]]] = {}
        for label, sid in series_map.items():
            try:
                out[label] = self.series(sid)
            except EconomyAPIError as e:
                logger.warning("FRED %s (%s) falló: %s", label, sid, e)
                out[label] = []
        return out


# ─────────────────────────────────────────────────────────────────────────
# 2. ESIOS · Red Eléctrica de España
# ─────────────────────────────────────────────────────────────────────────
class ESIOSConnector:
    """Cliente ESIOS · precio spot, mix generación, demanda peninsular."""

    BASE_URL = "https://api.esios.ree.es/indicators"
    TTL_DEFAULT = 1800

    def __init__(self, ttl_seconds: int = TTL_DEFAULT) -> None:
        self.token = (
            os.environ.get("ESIOS_API_TOKEN", "").strip()
            or os.environ.get("ESIOS_API_KEY", "").strip()
        )
        self._cache = _Cache(ttl_seconds=ttl_seconds)

    @property
    def available(self) -> bool:
        return bool(self.token)

    def _headers(self) -> dict[str, str]:
        if not self.token:
            raise EconomyAPIError("ESIOS_API_TOKEN/ESIOS_API_KEY no configurado")
        return {
            "Authorization": f'Token token="{self.token}"',
            "Accept": "application/json; application/vnd.esios-api-v1+json",
            "Content-Type": "application/json",
        }

    def indicator(
        self,
        indicator_id: int,
        start_date: str,
        end_date: str,
        time_trunc: str = "day",
    ) -> list[dict[str, Any]]:
        cache_key = f"esios:{indicator_id}:{start_date}:{end_date}:{time_trunc}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        params = {
            "start_date": f"{start_date}T00:00:00",
            "end_date": f"{end_date}T23:59:59",
            "time_trunc": time_trunc,
        }
        url = f"{self.BASE_URL}/{indicator_id}"
        data = _get(url, params=params, headers=self._headers())

        values = data.get("indicator", {}).get("values", []) or []
        result = [
            {
                "datetime": v.get("datetime"),
                "value": v.get("value"),
                "geo_id": v.get("geo_id"),
            }
            for v in values
        ]
        self._cache.set(cache_key, result)
        return result

    def demanda_diaria(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        return self.indicator(1739, start_date, end_date)

    def precio_spot(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        return self.indicator(10211, start_date, end_date)

    def mix_generacion(self, start_date: str, end_date: str) -> dict[str, list[dict[str, Any]]]:
        return {
            "eolica": self.indicator(151, start_date, end_date),
            "solar": self.indicator(152, start_date, end_date),
            "nuclear": self.indicator(74, start_date, end_date),
        }


# ─────────────────────────────────────────────────────────────────────────
# 3. Finnhub · Cotizaciones IBEX-35 + calendario económico
# ─────────────────────────────────────────────────────────────────────────
class FinnhubConnector:
    """Cliente Finnhub · cotizaciones tiempo real + calendario macro."""

    BASE_URL = "https://finnhub.io/api/v1"
    TTL_DEFAULT = 300
    IBEX_TICKERS: dict[str, str] = {
        "Santander": "SAN.MC",
        "Telefonica": "TEF.MC",
        "Iberdrola": "IBE.MC",
        "Inditex": "ITX.MC",
        "BBVA": "BBVA.MC",
        "Repsol": "REP.MC",
        "Ferrovial": "FER.MC",
        "ACS": "ACS.MC",
        "Endesa": "ELE.MC",
        "Naturgy": "NTGY.MC",
    }

    def __init__(self, ttl_seconds: int = TTL_DEFAULT) -> None:
        self.api_key = os.environ.get("FINNHUB_API_KEY", "").strip()
        self._cache = _Cache(ttl_seconds=ttl_seconds)

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def quote(self, symbol: str) -> dict[str, Any]:
        if not self.api_key:
            raise EconomyAPIError("FINNHUB_API_KEY no configurada")
        cache_key = f"finnhub:quote:{symbol}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached
        data = _get(
            f"{self.BASE_URL}/quote",
            params={"symbol": symbol, "token": self.api_key},
        )
        self._cache.set(cache_key, data)
        return data

    def ibex_snapshot(self) -> dict[str, dict[str, Any]]:
        out: dict[str, dict[str, Any]] = {}
        for name, ticker in self.IBEX_TICKERS.items():
            try:
                q = self.quote(ticker)
                c = q.get("c")
                pc = q.get("pc")
                change_pct: float | None = None
                if c is not None and pc not in (None, 0):
                    try:
                        change_pct = round((c - pc) / pc * 100, 2)
                    except (TypeError, ZeroDivisionError):
                        change_pct = None
                out[name] = {
                    "ticker": ticker,
                    "price": c,
                    "change_pct": change_pct,
                    "high": q.get("h"),
                    "low": q.get("l"),
                }
            except EconomyAPIError as e:
                logger.warning("Finnhub quote %s (%s) falló: %s", name, ticker, e)
                out[name] = {
                    "ticker": ticker,
                    "price": None,
                    "change_pct": None,
                    "high": None,
                    "low": None,
                }
        return out

    def economic_calendar(self, country: str = "ES") -> list[dict[str, Any]]:
        if not self.api_key:
            raise EconomyAPIError("FINNHUB_API_KEY no configurada")
        data = _get(
            f"{self.BASE_URL}/calendar/economic",
            params={"country": country, "token": self.api_key},
        )
        return data.get("economicCalendar", []) or []

    def forex_rate(self, base: str) -> dict[str, Any]:
        if not self.api_key:
            raise EconomyAPIError("FINNHUB_API_KEY no configurada")
        data = _get(
            f"{self.BASE_URL}/forex/rates",
            params={"base": base, "token": self.api_key},
        )
        return {
            "pair": base,
            "rate": data.get("quote"),
            "base": data.get("base", base),
        }


# ─────────────────────────────────────────────────────────────────────────
# 4. WTO · World Trade Organization
# ─────────────────────────────────────────────────────────────────────────
class WTOConnector:
    """Cliente WTO Timeseries · series anuales de comercio + aranceles."""

    BASE_URL = "https://api.wto.org/timeseries/v1"
    TTL_DEFAULT = 86400
    SPAIN = "724"

    def __init__(self, ttl_seconds: int = TTL_DEFAULT) -> None:
        self.api_key = os.environ.get("WTO_API_KEY", "").strip()
        self._cache = _Cache(ttl_seconds=ttl_seconds)

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def data(
        self,
        indicator: str,
        reporter: str = SPAIN,
        partner: str | None = None,
        start_year: int = 2015,
        freq: str = "A",
    ) -> list[dict[str, Any]]:
        if not self.api_key:
            raise EconomyAPIError("WTO_API_KEY no configurada")

        cache_key = f"wto:{indicator}:{reporter}:{partner or '*'}:{start_year}:{freq}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        params: dict[str, Any] = {
            "i": indicator,
            "r": reporter,
            "ps": f"{start_year}-9999",
            "freq": freq,
            "fmt": "json",
            "max": 250,
        }
        if partner:
            params["p"] = partner

        url = f"{self.BASE_URL}/data"
        headers = {"Ocp-Apim-Subscription-Key": self.api_key}
        data = _get(url, params=params, headers=headers)
        dataset = data.get("Dataset", []) or []
        result = [
            {
                "year": row.get("Year"),
                "value": row.get("Value"),
                "partner": row.get("PartnerEconomy") or row.get("PartnerEconomyCode"),
            }
            for row in dataset
        ]
        self._cache.set(cache_key, result)
        return result

    def exports_total(self, reporter: str = SPAIN, start_year: int = 2015) -> list[dict[str, Any]]:
        return self.data("ITS_MTV_AX", reporter=reporter, start_year=start_year)

    def imports_total(self, reporter: str = SPAIN, start_year: int = 2015) -> list[dict[str, Any]]:
        return self.data("ITS_MTV_AM", reporter=reporter, start_year=start_year)

    def exports_by_partner(
        self, partner: str, reporter: str = SPAIN, start_year: int = 2015
    ) -> list[dict[str, Any]]:
        return self.data(
            "ITS_MTV_AX", reporter=reporter, partner=partner, start_year=start_year
        )

    def tariff_applied(
        self, reporter: str = SPAIN, start_year: int = 2015
    ) -> list[dict[str, Any]]:
        return self.data("HS_M_0010", reporter=reporter, start_year=start_year)


# ─────────────────────────────────────────────────────────────────────────
# 5. UN Comtrade · Estadísticas comercio bilateral
# ─────────────────────────────────────────────────────────────────────────
class ComtradeConnector:
    """Cliente UN Comtrade · comercio bilateral por capítulo HS."""

    BASE_URL = "https://comtradeapi.un.org/data/v1/get/C/A/HS"
    TTL_DEFAULT = 86400
    SPAIN = "724"

    def __init__(self, ttl_seconds: int = TTL_DEFAULT) -> None:
        self.api_key = os.environ.get("UNCOMTRADE_API_KEY", "").strip()
        self._cache = _Cache(ttl_seconds=ttl_seconds)

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def trade(
        self,
        cmd_code: str,
        flow: str = "X",
        partner: str = "0",
        period: str = "recent",
    ) -> list[dict[str, Any]]:
        if not self.api_key:
            raise EconomyAPIError("UNCOMTRADE_API_KEY no configurada")

        cache_key = f"comtrade:{cmd_code}:{flow}:{partner}:{period}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        params = {
            "reporterCode": self.SPAIN,
            "period": period,
            "partnerCode": partner,
            "cmdCode": cmd_code,
            "flowCode": flow,
            "subscription-key": self.api_key,
        }
        data = _get(self.BASE_URL, params=params)
        rows = data.get("data", []) or []
        result = [
            {
                "period": row.get("period"),
                "partner": row.get("partnerCode") or row.get("partner"),
                "cmd_desc": row.get("cmdDesc"),
                "flow": row.get("flowCode") or row.get("flowDesc"),
                "value_usd": row.get("primaryValue") or row.get("TradeValue"),
                "qty_kg": row.get("netWgt") or row.get("NetWeight"),
            }
            for row in rows
        ]
        self._cache.set(cache_key, result)
        return result

    def exports_auto(self, partner: str = "0", period: str = "recent") -> list[dict[str, Any]]:
        return self.trade(cmd_code="87", flow="X", partner=partner, period=period)

    def exports_agri(self, partner: str = "0", period: str = "recent") -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for ch in ("07", "08", "09", "22"):
            try:
                out.extend(self.trade(cmd_code=ch, flow="X", partner=partner, period=period))
            except EconomyAPIError as e:
                logger.warning("Comtrade exports_agri HS%s falló: %s", ch, e)
        return out

    def exports_industry(
        self, partner: str = "0", period: str = "recent"
    ) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for ch in ("84", "85"):
            try:
                out.extend(self.trade(cmd_code=ch, flow="X", partner=partner, period=period))
            except EconomyAPIError as e:
                logger.warning("Comtrade exports_industry HS%s falló: %s", ch, e)
        return out


# ─────────────────────────────────────────────────────────────────────────
# 6. PortWatch · IMF puertos cuello de botella
# ─────────────────────────────────────────────────────────────────────────
class PortWatchConnector:
    """Cliente PortWatch IMF · congestión + actividad puertos."""

    BASE_URL = "https://portwatch.imf.org/api"
    TTL_DEFAULT = 3600
    PUERTOS_SPAIN: dict[str, str] = {
        "Valencia": "ESVLC",
        "Barcelona": "ESBCN",
        "Algeciras": "ESALG",
        "Bilbao": "ESBIO",
        "Las Palmas": "ESLPA",
    }

    def __init__(self, ttl_seconds: int = TTL_DEFAULT) -> None:
        self.api_key = os.environ.get("PORTWATCH_API_KEY", "").strip()
        self._cache = _Cache(ttl_seconds=ttl_seconds)

    @property
    def available(self) -> bool:
        # PortWatch tiene endpoints públicos · key opcional
        return True

    def _headers(self) -> dict[str, str]:
        if self.api_key:
            return {"x-api-key": self.api_key}
        return {}

    def port_traffic(
        self, port_id: str, start: str | None = None, end: str | None = None
    ) -> list[dict[str, Any]]:
        cache_key = f"portwatch:traffic:{port_id}:{start or ''}:{end or ''}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        params: dict[str, Any] = {"port_id": port_id}
        if start:
            params["start"] = start
        if end:
            params["end"] = end

        try:
            data = _get(
                f"{self.BASE_URL}/port_traffic", params=params, headers=self._headers()
            )
            if isinstance(data, list):
                result = data
            elif isinstance(data, dict):
                result = data.get("data", []) or []
            else:
                result = []
        except EconomyAPIError as e:
            logger.warning("PortWatch port_traffic %s falló: %s", port_id, e)
            result = []

        self._cache.set(cache_key, result)
        return result

    def spain_snapshot(self) -> dict[str, list[dict[str, Any]]]:
        return {name: self.port_traffic(port_id) for name, port_id in self.PUERTOS_SPAIN.items()}

    def country_trade(self, country: str = "ESP") -> list[dict[str, Any]]:
        cache_key = f"portwatch:country:{country}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            data = _get(
                f"{self.BASE_URL}/country_trade",
                params={"country": country},
                headers=self._headers(),
            )
            if isinstance(data, list):
                result = data
            elif isinstance(data, dict):
                result = data.get("data", []) or []
            else:
                result = []
        except EconomyAPIError as e:
            logger.warning("PortWatch country_trade %s falló: %s", country, e)
            result = []
        self._cache.set(cache_key, result)
        return result


# ─────────────────────────────────────────────────────────────────────────
# 7. Ember · Datos energía y carbón
# ─────────────────────────────────────────────────────────────────────────
class EmberConnector:
    """Cliente Ember · mix energético + intensidad carbono + EU ETS."""

    BASE_URL = "https://ember-energy.org/app/api"
    TTL_DEFAULT = 86400

    def __init__(self, ttl_seconds: int = TTL_DEFAULT) -> None:
        self.api_key = os.environ.get("EMBER_API_KEY", "").strip()
        self._cache = _Cache(ttl_seconds=ttl_seconds)

    @property
    def available(self) -> bool:
        # Ember tiene endpoints públicos · key opcional
        return True

    def _headers(self) -> dict[str, str]:
        if self.api_key:
            return {"Authorization": f"Bearer {self.api_key}"}
        return {}

    def _safe_get(self, path: str, params: dict[str, Any]) -> Any:
        cache_key = f"ember:{path}:{sorted(params.items())}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            data = _get(
                f"{self.BASE_URL}/{path}", params=params, headers=self._headers()
            )
            result = data.get("data", data) if isinstance(data, dict) else data
        except EconomyAPIError as e:
            logger.warning("Ember %s falló: %s", path, e)
            result = []
        self._cache.set(cache_key, result)
        return result

    def power_mix(self, entity: str = "Spain", frequency: str = "monthly") -> Any:
        return self._safe_get(
            "electricity-generation",
            {"entity": entity, "frequency": frequency},
        )

    def carbon_intensity(self, entity: str = "Spain") -> Any:
        return self._safe_get("carbon-intensity", {"entity": entity})

    def eu_ets_price(self) -> Any:
        return self._safe_get("eu-ets", {})


# ─────────────────────────────────────────────────────────────────────────
# 8. GDELT Economy · Tono y volumen narrativa económica
# ─────────────────────────────────────────────────────────────────────────
class GDELTEconomyConnector:
    """Cliente GDELT DOC v2 · tono y volumen narrativa económica España."""

    BASE_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
    TTL_DEFAULT = 3600
    QUERIES: dict[str, str] = {
        "inflacion_tone": "inflacion españa sourcelang:Spanish",
        "paro_tone": "desempleo paro españa sourcelang:Spanish",
        "crecimiento_vol": "crecimiento economia españa sourcelang:Spanish",
        "deuda_tone": "deuda publica españa deficit sourcelang:Spanish",
        "aranceles_vol": "aranceles exportaciones españa trump sourcelang:Spanish",
        "prima_riesgo_vol": "prima riesgo bono españa",
        "confianza_consumidor": "confianza consumidor compras españa sourcelang:Spanish",
        "exportaciones_vol": "exportaciones empresas españa mercados sourcelang:Spanish",
    }

    def __init__(self, ttl_seconds: int = TTL_DEFAULT) -> None:
        self.max_queries = int(os.environ.get("GDELT_MAX_QUERIES", "6"))
        self._cache = _Cache(ttl_seconds=ttl_seconds)

    @property
    def available(self) -> bool:
        return True

    def timeline(
        self,
        query: str,
        mode: str = "TimelineTone",
        timespan: str = "12m",
        smoothing: int = 5,
    ) -> list[dict[str, Any]]:
        cache_key = f"gdelt:{query}:{mode}:{timespan}:{smoothing}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        params = {
            "query": query,
            "mode": mode,
            "timespan": timespan,
            "smoothing": smoothing,
            "format": "json",
        }
        try:
            data = _get(self.BASE_URL, params=params)
        except EconomyAPIError as e:
            logger.warning("GDELT timeline (%s) falló: %s", query, e)
            self._cache.set(cache_key, [])
            return []

        result: list[dict[str, Any]] = []
        for serie in data.get("timeline", []) or []:
            label = serie.get("series") or serie.get("name") or query
            for point in serie.get("data", []) or []:
                result.append(
                    {
                        "date": point.get("date"),
                        "value": point.get("value"),
                        "series": label,
                    }
                )
        self._cache.set(cache_key, result)
        return result

    def economy_sentiment(self) -> dict[str, list[dict[str, Any]]]:
        out: dict[str, list[dict[str, Any]]] = {}
        items: Iterable[tuple[str, str]] = list(self.QUERIES.items())[: self.max_queries]
        for name, query in items:
            mode = "TimelineVol" if "_vol" in name else "TimelineTone"
            out[name] = self.timeline(query=query, mode=mode)
        return out


# ─────────────────────────────────────────────────────────────────────────
# 9. NewsAPI Economy · Briefing economía España
# ─────────────────────────────────────────────────────────────────────────
class NewsAPIEconomyConnector:
    """Cliente NewsAPI · titulares económicos españoles."""

    BASE_URL = "https://newsapi.org/v2/everything"
    TTL_DEFAULT = 1800
    QUERIES_ECONOMIA: list[str] = [
        "economia españa PIB crecimiento",
        "inflacion IPC precio españa",
        "paro desempleo empleo españa",
        "prima riesgo bono españa",
        "aranceles trump exportaciones españa",
        "banco central europeo BCE tipos interés",
    ]

    def __init__(self, ttl_seconds: int = TTL_DEFAULT) -> None:
        self.api_key = os.environ.get("NEWSAPI_KEY", "").strip()
        self._cache = _Cache(ttl_seconds=ttl_seconds)

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def search(
        self,
        query: str,
        language: str = "es",
        page_size: int = 20,
        sort_by: str = "publishedAt",
    ) -> list[dict[str, Any]]:
        if not self.api_key:
            raise EconomyAPIError("NEWSAPI_KEY no configurada")

        cache_key = f"newsapi:{query}:{language}:{page_size}:{sort_by}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        params = {
            "q": query,
            "language": language,
            "pageSize": page_size,
            "sortBy": sort_by,
            "apiKey": self.api_key,
        }
        try:
            data = _get(self.BASE_URL, params=params)
        except EconomyAPIError as e:
            logger.warning("NewsAPI (%s) falló: %s", query, e)
            self._cache.set(cache_key, [])
            return []

        articles = data.get("articles", []) or []
        result = [
            {
                "title": a.get("title"),
                "url": a.get("url"),
                "published": a.get("publishedAt"),
                "source": (a.get("source") or {}).get("name"),
                "description": a.get("description"),
            }
            for a in articles
        ]
        self._cache.set(cache_key, result)
        return result

    def economy_briefing(self) -> dict[str, list[dict[str, Any]]]:
        out: dict[str, list[dict[str, Any]]] = {}
        for q in self.QUERIES_ECONOMIA:
            out[q] = self.search(q, page_size=5)
        return out


# ─────────────────────────────────────────────────────────────────────────
# 10. INE · Tempus3
# ─────────────────────────────────────────────────────────────────────────
class INEConnector:
    """Cliente INE Tempus3 · IPC, EPA, PIB, ICC, IPI."""

    BASE_URL = "https://servicios.ine.es/wstempus/js/ES"
    TTL_DEFAULT = 3600

    def __init__(self, ttl_seconds: int = TTL_DEFAULT) -> None:
        self._cache = _Cache(ttl_seconds=ttl_seconds)

    @property
    def available(self) -> bool:
        return True

    def series(self, series_id: str, n_periodos: int = 60) -> list[dict[str, Any]]:
        cache_key = f"ine:{series_id}:{n_periodos}"
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        url = f"{self.BASE_URL}/DATOS_SERIE/{series_id}"
        params = {"nult": n_periodos, "det": 2}
        try:
            data = _get(url, params=params)
        except EconomyAPIError as e:
            logger.warning("INE series %s falló: %s", series_id, e)
            self._cache.set(cache_key, [])
            return []

        rows = data.get("Data", []) if isinstance(data, dict) else (data or [])
        name = data.get("Nombre") if isinstance(data, dict) else None
        result = [
            {
                "fecha": row.get("Fecha") or row.get("T3_TipoDato"),
                "valor": row.get("Valor"),
                "nombre": name,
            }
            for row in rows
        ]
        self._cache.set(cache_key, result)
        return result

    def ipc(self) -> list[dict[str, Any]]:
        return self.series("IPC206449")

    def paro_epa(self) -> list[dict[str, Any]]:
        return self.series("EPA3171", n_periodos=40)

    def pib_trimestral(self) -> list[dict[str, Any]]:
        return self.series("CNTR4449", n_periodos=40)

    def confianza_consumidor(self) -> list[dict[str, Any]]:
        return self.series("ICC2010")

    def produccion_industrial(self) -> list[dict[str, Any]]:
        return self.series("IPI31")


# ─────────────────────────────────────────────────────────────────────────
# 11. ECB · BCE SDMX-JSON
# ─────────────────────────────────────────────────────────────────────────
class ECBConnector:
    """Cliente BCE SDMX-JSON · tipos refinanciación, Euribor."""

    BASE_URL = "https://data-api.ecb.europa.eu/service/data"

    def __init__(self) -> None:
        pass

    @property
    def available(self) -> bool:
        return True

    def series(
        self, dataset: str, key: str, start_period: str = "2020-01"
    ) -> list[dict[str, Any]]:
        url = f"{self.BASE_URL}/{dataset}/{key}"
        params = {
            "startPeriod": start_period,
            "format": "jsondata",
            "detail": "dataonly",
        }
        headers = {"Accept": "application/json"}
        try:
            data = _get(url, params=params, headers=headers)
        except EconomyAPIError as e:
            logger.warning("ECB series %s/%s falló: %s", dataset, key, e)
            return []

        # Parsing SDMX-JSON
        try:
            data_section = data.get("data", {}) if isinstance(data, dict) else {}
            datasets = data_section.get("dataSets", [])
            if not datasets:
                return []
            series_dict = datasets[0].get("series", {})
            if not series_dict:
                return []
            first_series = next(iter(series_dict.values()))
            observations = first_series.get("observations", {})

            structure = data_section.get("structure", {})
            obs_dims = structure.get("dimensions", {}).get("observation", [])
            periods_values: list[dict[str, Any]] = []
            if obs_dims:
                periods_values = obs_dims[0].get("values", []) or []

            result: list[dict[str, Any]] = []
            for idx_str, obs in observations.items():
                try:
                    idx = int(idx_str)
                    period = periods_values[idx].get("id") if idx < len(periods_values) else idx_str
                except (ValueError, IndexError):
                    period = idx_str
                value = obs[0] if isinstance(obs, list) and obs else None
                result.append({"period": period, "value": value})
            return result
        except (KeyError, IndexError, ValueError, TypeError) as e:
            logger.warning("ECB parsing falló (%s/%s): %s", dataset, key, e)
            return []

    def tipo_refinanciacion(self) -> list[dict[str, Any]]:
        return self.series("FM", "B.U2.EUR.RT0.BB.R.1.Z5.R3.X")

    def euribor_3m(self) -> list[dict[str, Any]]:
        return self.series("FM", "B.U2.EUR.4F.KR.DFR.LEV")


# ─────────────────────────────────────────────────────────────────────────
# 12. Eurostat · API SDMX
# ─────────────────────────────────────────────────────────────────────────
class EurostatConnector:
    """Cliente Eurostat · comparativas UE5 macro."""

    BASE_URL = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"
    EU5 = "ES,DE,FR,IT,PT"

    def __init__(self) -> None:
        pass

    @property
    def available(self) -> bool:
        return True

    def dataset(
        self,
        dataset_id: str,
        geo: str = EU5,
        since_year: str = "2015",
        extra_params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "geo": geo,
            "sinceTimePeriod": since_year,
            "format": "JSON",
            "lang": "EN",
        }
        if extra_params:
            params.update(extra_params)
        try:
            return _get(f"{self.BASE_URL}/{dataset_id}", params=params)
        except EconomyAPIError as e:
            logger.warning("Eurostat dataset %s falló: %s", dataset_id, e)
            return {}

    def gdp_comparison(self, geo: str = EU5, since_year: str = "2015") -> dict[str, Any]:
        return self.dataset(
            "nama_10_gdp",
            geo=geo,
            since_year=since_year,
            extra_params={"na_item": "B1GQ", "unit": "CLV10_PCOB", "freq": "Q"},
        )

    def hicp_comparison(self, geo: str = EU5, since_year: str = "2015") -> dict[str, Any]:
        return self.dataset(
            "prc_hicp_midx",
            geo=geo,
            since_year=since_year,
            extra_params={"unit": "I15", "coicop": "CP00", "freq": "M"},
        )

    def unemployment_comparison(self, geo: str = EU5, since_year: str = "2015") -> dict[str, Any]:
        return self.dataset(
            "une_rt_m",
            geo=geo,
            since_year=since_year,
            extra_params={
                "age": "TOTAL",
                "sex": "T",
                "s_adj": "SA",
                "unit": "PC_ACT",
                "freq": "M",
            },
        )


# ─────────────────────────────────────────────────────────────────────────
# 13. Seguridad Social · Afiliados (vía INE)
# ─────────────────────────────────────────────────────────────────────────
class SegSocialConnector:
    """Cliente Seguridad Social · afiliados Tempus3 vía INE."""

    def __init__(self) -> None:
        self._ine = INEConnector()

    @property
    def available(self) -> bool:
        return True

    def afiliados_totales_ine(self, n_periodos: int = 60) -> list[dict[str, Any]]:
        return self._ine.series("25066", n_periodos=n_periodos)


# ─────────────────────────────────────────────────────────────────────────
# 14. Nasdaq Data Link · Datasets premium
# ─────────────────────────────────────────────────────────────────────────
class NasdaqDataLinkConnector:
    """Cliente Nasdaq Data Link · datasets premium tipo Quandl."""

    BASE_URL = "https://data.nasdaq.com/api/v3/datasets"

    def __init__(self) -> None:
        self.api_key = os.environ.get("NASDAQ_DATA_LINK_KEY", "").strip()

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def dataset(
        self, code: str, rows: int = 20, order: str = "desc"
    ) -> list[dict[str, Any]]:
        if not self.api_key:
            raise EconomyAPIError("NASDAQ_DATA_LINK_KEY no configurada")
        params = {"api_key": self.api_key, "rows": rows, "order": order}
        try:
            data = _get(f"{self.BASE_URL}/{code}.json", params=params)
        except EconomyAPIError as e:
            logger.warning("Nasdaq Data Link %s falló: %s", code, e)
            return []
        ds = data.get("dataset", {}) if isinstance(data, dict) else {}
        cols = ds.get("column_names", []) or []
        rows_data = ds.get("data", []) or []
        return [dict(zip(cols, row)) for row in rows_data]


# ─────────────────────────────────────────────────────────────────────────
# Facade · EconomyDataHub
# ─────────────────────────────────────────────────────────────────────────
class EconomyDataHub:
    """Facade unificado de los 14 conectores económicos."""

    def __init__(self) -> None:
        self.fred = FREDConnector()
        self.esios = ESIOSConnector()
        self.finnhub = FinnhubConnector()
        self.wto = WTOConnector()
        self.comtrade = ComtradeConnector()
        self.portwatch = PortWatchConnector()
        self.ember = EmberConnector()
        self.gdelt = GDELTEconomyConnector()
        self.newsapi = NewsAPIEconomyConnector()
        self.ine = INEConnector()
        self.ecb = ECBConnector()
        self.eurostat = EurostatConnector()
        self.seg_social = SegSocialConnector()
        self.nasdaq = NasdaqDataLinkConnector()

    def health_check(self) -> dict[str, bool]:
        return {
            "fred": self.fred.available,
            "esios": self.esios.available,
            "finnhub": self.finnhub.available,
            "wto": self.wto.available,
            "comtrade": self.comtrade.available,
            "portwatch": self.portwatch.available,
            "ember": self.ember.available,
            "gdelt": True,
            "newsapi": self.newsapi.available,
            "ine": True,
            "ecb": True,
            "eurostat": True,
            "seg_social": True,
            "nasdaq": self.nasdaq.available,
        }

    def available_sources(self) -> list[str]:
        return [name for name, ok in self.health_check().items() if ok]
