"""
Macro Finance v2 — 8 connectors (ECB SDW, Eurostat HICP/LFS/HPI, IMF DOTS,
IMF COFER, IMF WEO, World Bank NTL proxy, BdE BoP).

Stubs honestos para BIS LBS y NASA VIIRS (auth / setup pesado).
"""
from __future__ import annotations

import logging
import os
from datetime import date

from .base import MacroConnector, PairValue, RawValue

logger = logging.getLogger(__name__)


# ── ECB SDW ───────────────────────────────────────────────────────────────────

class ECBYieldsConnector(MacroConnector):
    """ECB long-term yields + EURUSD + ECB main rate."""
    source_id = "ecb_sdw"

    SERIES = [
        # (sdw_series_key, country_iso2, metric_name, unit, dataset)
        ("M.ES.L.L40.CI.0000.EUR.N.Z", "ES", "yield_es_10y", "PCT", "IRS"),
        ("M.DE.L.L40.CI.0000.EUR.N.Z", "DE", "yield_de_10y", "PCT", "IRS"),
        ("M.IT.L.L40.CI.0000.EUR.N.Z", "IT", "yield_it_10y", "PCT", "IRS"),
        ("M.FR.L.L40.CI.0000.EUR.N.Z", "FR", "yield_fr_10y", "PCT", "IRS"),
        ("M.PT.L.L40.CI.0000.EUR.N.Z", "PT", "yield_pt_10y", "PCT", "IRS"),
        # EURUSD reference rate (daily)
        ("D.USD.EUR.SP00.A", "EU", "eurusd", "INDEX", "EXR"),
        # ECB main refinancing rate (daily)
        ("D.U2.EUR.4F.KR.MRR_FR.LEV", "EU", "ecb_main_rate", "PCT", "FM"),
    ]

    def _fetch_one(self, dataset: str, key: str):
        try:
            import httpx
        except ImportError:
            return {}
        url = f"https://data-api.ecb.europa.eu/service/data/{dataset}/{key}?format=jsondata&lastNObservations=240"
        try:
            r = httpx.get(url, timeout=20, headers={"Accept": "application/json"})
            if not r.is_success:
                return {}
            j = r.json()
        except Exception:
            return {}
        try:
            ds = j["dataSets"][0]
            series = list(ds["series"].values())[0]
            obs = series["observations"]
            dims = j["structure"]["dimensions"]["observation"]
            time_dim = next(d for d in dims if d["id"] == "TIME_PERIOD")
            values = time_dim["values"]
            out: dict[date, float] = {}
            for k, v in obs.items():
                idx = int(k.split(":")[0])
                t = values[idx]["id"]
                try:
                    ref = date.fromisoformat(t + "-01") if len(t) == 7 else date.fromisoformat(t)
                except Exception:
                    continue
                val = v[0]
                if val is not None:
                    out[ref] = float(val)
            return out
        except Exception:
            return {}

    def fetch(self):
        out: list[RawValue] = []
        for key, iso2, metric, unit, dataset in self.SERIES:
            data = self._fetch_one(dataset, key)
            for ref, v in data.items():
                out.append(RawValue(self.source_id, iso2, metric, v, ref, unit))
        # Derive spreads
        # Index by date for ES, IT, FR, PT
        de = {r.reference_date: r.metric_value for r in out if r.metric_name == "yield_de_10y"}
        for country_code in ("es", "it", "fr", "pt"):
            country_yield = {r.reference_date: r.metric_value for r in out if r.metric_name == f"yield_{country_code}_10y"}
            for ref, y in country_yield.items():
                if ref in de:
                    spread_bp = (y - de[ref]) * 100
                    out.append(RawValue(
                        self.source_id, country_code.upper(),
                        f"spread_{country_code}_de_10y", spread_bp, ref, "BP",
                    ))
        return out, []


# ── Eurostat HICP ─────────────────────────────────────────────────────────────

class EurostatHICPConnector(MacroConnector):
    source_id = "eurostat_hicp"
    COUNTRIES = ["ES", "FR", "IT", "DE", "PT", "GB", "EU27_2020"]

    def fetch(self):
        try:
            import httpx
        except ImportError:
            return [], []
        out: list[RawValue] = []
        # Headline HICP annual rate
        for geo in self.COUNTRIES:
            url = (
                "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
                f"prc_hicp_manr?format=JSON&lang=EN&geo={geo}&coicop=CP00&lastTimePeriod=60"
            )
            try:
                r = httpx.get(url, timeout=20)
                if not r.is_success:
                    continue
                j = r.json()
                idx_to_label = {v: k for k, v in j["dimension"]["time"]["category"]["index"].items()}
                for idx_str, val in (j.get("value") or {}).items():
                    if val is None:
                        continue
                    label = idx_to_label.get(int(idx_str))
                    if not label:
                        continue
                    try:
                        ref = date.fromisoformat(label + "-01") if len(label) == 7 else date.fromisoformat(label)
                    except Exception:
                        continue
                    iso2 = geo if len(geo) == 2 else "EU"
                    out.append(RawValue(self.source_id, iso2, "hicp_yoy", float(val), ref, "PCT"))
            except Exception:
                continue
        return out, []


# ── Eurostat Labour Force Survey ──────────────────────────────────────────────

class EurostatLFSConnector(MacroConnector):
    source_id = "eurostat_lfs"
    COUNTRIES = ["ES", "FR", "IT", "DE", "PT", "GB", "EU27_2020"]

    def fetch(self):
        try:
            import httpx
        except ImportError:
            return [], []
        out: list[RawValue] = []
        for geo in self.COUNTRIES:
            url = (
                "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
                f"une_rt_m?format=JSON&lang=EN&geo={geo}"
                "&s_adj=SA&unit=PC_ACT&sex=T&age=TOTAL&lastTimePeriod=48"
            )
            try:
                r = httpx.get(url, timeout=20)
                if not r.is_success:
                    continue
                j = r.json()
                idx_to_label = {v: k for k, v in j["dimension"]["time"]["category"]["index"].items()}
                for idx_str, val in (j.get("value") or {}).items():
                    if val is None:
                        continue
                    label = idx_to_label.get(int(idx_str))
                    if not label:
                        continue
                    try:
                        ref = date.fromisoformat(label + "-01") if len(label) == 7 else date.fromisoformat(label)
                    except Exception:
                        continue
                    iso2 = geo if len(geo) == 2 else "EU"
                    out.append(RawValue(self.source_id, iso2, "unemployment_rate", float(val), ref, "PCT"))
            except Exception:
                continue
        # Youth unemployment (<25)
        for geo in self.COUNTRIES:
            url = (
                "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
                f"une_rt_m?format=JSON&lang=EN&geo={geo}"
                "&s_adj=SA&unit=PC_ACT&sex=T&age=Y_LT25&lastTimePeriod=48"
            )
            try:
                r = httpx.get(url, timeout=20)
                if not r.is_success:
                    continue
                j = r.json()
                idx_to_label = {v: k for k, v in j["dimension"]["time"]["category"]["index"].items()}
                for idx_str, val in (j.get("value") or {}).items():
                    if val is None:
                        continue
                    label = idx_to_label.get(int(idx_str))
                    if not label:
                        continue
                    try:
                        ref = date.fromisoformat(label + "-01") if len(label) == 7 else date.fromisoformat(label)
                    except Exception:
                        continue
                    iso2 = geo if len(geo) == 2 else "EU"
                    out.append(RawValue(self.source_id, iso2, "youth_unemployment", float(val), ref, "PCT"))
            except Exception:
                continue
        return out, []


# ── Eurostat House Price Index ────────────────────────────────────────────────

class EurostatHPIConnector(MacroConnector):
    source_id = "eurostat_hpi"
    COUNTRIES = ["ES", "FR", "IT", "DE", "PT", "EU27_2020"]

    def fetch(self):
        try:
            import httpx
        except ImportError:
            return [], []
        out: list[RawValue] = []
        for geo in self.COUNTRIES:
            url = (
                "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
                f"prc_hpi_q?format=JSON&lang=EN&geo={geo}"
                "&purchase=TOTAL&unit=RCH_A&lastTimePeriod=40"
            )
            try:
                r = httpx.get(url, timeout=20)
                if not r.is_success:
                    continue
                j = r.json()
                idx_to_label = {v: k for k, v in j["dimension"]["time"]["category"]["index"].items()}
                for idx_str, val in (j.get("value") or {}).items():
                    if val is None:
                        continue
                    label = idx_to_label.get(int(idx_str))  # 'YYYY-Q1'
                    if not label:
                        continue
                    try:
                        year, q = label.split("-Q")
                        month = (int(q) - 1) * 3 + 1
                        ref = date(int(year), month, 1)
                    except Exception:
                        continue
                    iso2 = geo if len(geo) == 2 else "EU"
                    out.append(RawValue(self.source_id, iso2, "hpi_yoy", float(val), ref, "PCT"))
            except Exception:
                continue
        return out, []


# ── IMF DOTS ──────────────────────────────────────────────────────────────────

class IMFDOTSConnector(MacroConnector):
    source_id = "imf_dots"
    COUNTRIES = ["ES", "DE", "FR", "IT", "PT", "GB"]

    def fetch(self):
        try:
            import httpx
        except ImportError:
            return [], []
        out: list[RawValue] = []
        for iso2 in self.COUNTRIES:
            # exports + imports to/from world (W00)
            key = f"M.{iso2}.TXG_FOB_USD+TMG_CIF_USD.W00"
            url = f"https://data.imf.org/api/SDMX_JSON/data/DOT/{key}?startPeriod=2015-01"
            try:
                r = httpx.get(url, timeout=25)
                if not r.is_success:
                    continue
                j = r.json()
                series = j.get("CompactData", {}).get("DataSet", {}).get("Series", [])
                if isinstance(series, dict):
                    series = [series]
                for s in series:
                    indicator = s.get("@INDICATOR", "")
                    metric = "dots_exports_usd" if "TXG" in indicator else "dots_imports_usd"
                    obs = s.get("Obs", [])
                    if isinstance(obs, dict):
                        obs = [obs]
                    for o in obs:
                        t = o.get("@TIME_PERIOD")
                        v = o.get("@OBS_VALUE")
                        if not t or v is None:
                            continue
                        try:
                            ref = date.fromisoformat(t + "-01") if len(t) == 7 else date.fromisoformat(t)
                            out.append(RawValue(self.source_id, iso2, metric, float(v), ref, "USD_BN"))
                        except Exception:
                            continue
            except Exception:
                continue
        return out, []


# ── IMF COFER ─────────────────────────────────────────────────────────────────

class IMFCOFERConnector(MacroConnector):
    source_id = "imf_cofer"

    SHARES = {
        "SH_USD": "cofer_usd_share",
        "SH_EUR": "cofer_eur_share",
        "SH_CNY": "cofer_cny_share",
        "SH_GBP": "cofer_gbp_share",
        "SH_JPY": "cofer_jpy_share",
        "SH_OTH": "cofer_other_share",
    }

    def fetch(self):
        try:
            import httpx
        except ImportError:
            return [], []
        out: list[RawValue] = []
        ind_keys = "+".join(self.SHARES.keys())
        url = f"https://data.imf.org/api/SDMX_JSON/data/COFER/Q..{ind_keys}/?startPeriod=2010-Q1"
        try:
            r = httpx.get(url, timeout=25)
            if not r.is_success:
                return out, []
            j = r.json()
            series = j.get("CompactData", {}).get("DataSet", {}).get("Series", [])
            if isinstance(series, dict):
                series = [series]
            for s in series:
                indicator = s.get("@INDICATOR", "")
                metric = self.SHARES.get(indicator)
                if not metric:
                    continue
                obs = s.get("Obs", [])
                if isinstance(obs, dict):
                    obs = [obs]
                for o in obs:
                    t = o.get("@TIME_PERIOD")
                    v = o.get("@OBS_VALUE")
                    if not t or v is None:
                        continue
                    try:
                        year, q = t.split("-Q")
                        month = (int(q) - 1) * 3 + 1
                        ref = date(int(year), month, 1)
                        out.append(RawValue(self.source_id, "WO", metric, float(v), ref, "PCT"))
                    except Exception:
                        continue
        except Exception:
            pass
        return out, []


# ── IMF WEO ───────────────────────────────────────────────────────────────────

class IMFWEOConnector(MacroConnector):
    source_id = "imf_weo"
    COUNTRIES = ["ES", "DE", "FR", "IT", "PT", "GB", "US"]
    # WEO indicator: NGDP_RPCH = Real GDP growth
    INDICATORS = {
        "NGDP_RPCH": "weo_gdp_growth",
        "PCPIPCH":   "weo_inflation",
        "LUR":       "weo_unemployment",
        "GGXCNL_NGDP": "weo_govt_balance_gdp",
        "GGXWDG_NGDP": "weo_govt_debt_gdp",
    }

    def fetch(self):
        try:
            import httpx
        except ImportError:
            return [], []
        out: list[RawValue] = []
        for code, metric in self.INDICATORS.items():
            for iso2 in self.COUNTRIES:
                url = f"https://data.imf.org/api/SDMX_JSON/data/WEO/A.{iso2}.{code}/?startPeriod=2010"
                try:
                    r = httpx.get(url, timeout=20)
                    if not r.is_success:
                        continue
                    j = r.json()
                    series = j.get("CompactData", {}).get("DataSet", {}).get("Series", [])
                    if isinstance(series, dict):
                        series = [series]
                    for s in series:
                        obs = s.get("Obs", [])
                        if isinstance(obs, dict):
                            obs = [obs]
                        for o in obs:
                            t = o.get("@TIME_PERIOD")
                            v = o.get("@OBS_VALUE")
                            if not t or v is None:
                                continue
                            try:
                                ref = date(int(t), 6, 30)
                                out.append(RawValue(self.source_id, iso2, metric, float(v), ref, "PCT"))
                            except Exception:
                                continue
                except Exception:
                    continue
        return out, []


# ── World Bank NTL proxy (electricity access + GDP pc PPP) ────────────────────

class WorldBankNTLConnector(MacroConnector):
    source_id = "ntl_wb"
    COUNTRIES = ["ES","RU","UA","IR","VE","KP","CN","DE","FR","IT","PT","GB","US","MA","DZ","SA","BR","MX"]
    INDICATORS = {
        "EG.ELC.ACCS.ZS":   "ntl_electricity_access",
        "NY.GDP.PCAP.PP.KD":"ntl_gdp_pc_ppp",
    }

    def fetch(self):
        try:
            import httpx
        except ImportError:
            return [], []
        out: list[RawValue] = []
        for iso2 in self.COUNTRIES:
            for code, metric in self.INDICATORS.items():
                url = f"https://api.worldbank.org/v2/country/{iso2}/indicator/{code}?format=json&per_page=30&mrv=20"
                try:
                    r = httpx.get(url, timeout=15)
                    if not r.is_success:
                        continue
                    data = r.json()
                    if not isinstance(data, list) or len(data) < 2 or not data[1]:
                        continue
                    for row in data[1]:
                        v = row.get("value")
                        y = row.get("date")
                        if v is None or not y:
                            continue
                        try:
                            ref = date(int(y), 12, 31)
                            unit = "PCT" if "access" in metric else "USD"
                            out.append(RawValue(self.source_id, iso2, metric, float(v), ref, unit))
                        except Exception:
                            continue
                except Exception:
                    continue
        return out, []


# ── BIS LBS stub ──────────────────────────────────────────────────────────────

class BISLBSConnector(MacroConnector):
    """BIS Locational Banking Statistics — requires SDMX setup or bulk CSV download.
    Currently a stub; real ingestion is on the roadmap."""
    source_id = "bis_lbs"
    is_stub   = True

    def fetch(self):
        raise RuntimeError("not_implemented: BIS LBS SDMX integration pending")


# ── NASA Black Marble stub ────────────────────────────────────────────────────

class BlackMarbleConnector(MacroConnector):
    """NASA Black Marble VNP46A2 — requires NASA Earthdata token."""
    source_id = "ntl_viirs"
    is_stub   = True

    def fetch(self):
        if not os.getenv("BLACKMARBLE_TOKEN"):
            raise RuntimeError("missing_credentials: set BLACKMARBLE_TOKEN")
        return [], []


# ── BdE Balanza de Pagos stub ─────────────────────────────────────────────────

class BdeBopConnector(MacroConnector):
    """Banco de España Balanza de Pagos — requires scraping or manual data load.
    Stub until BdE REST endpoint confirmed."""
    source_id = "bde_bop"
    is_stub   = True

    def fetch(self):
        raise RuntimeError("not_implemented: BdE BoP endpoint not yet wired")
