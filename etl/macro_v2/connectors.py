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


# ── IMF DOTS (aggregates via datamapper; old SDMX dead) ──────────────────────

class IMFDOTSConnector(MacroConnector):
    """
    External-sector indicators via IMF datamapper.

    The old DOTS SDMX endpoint was retired in 2025 and the bilateral granularity
    is no longer exposed publicly. The datamapper does expose macro flows that
    are highly correlated with trade openness, which is what the dashboard needs:

      - BCA       — Current Account Balance (USD billion)
      - BCA_NGDPD — Current Account Balance (% of GDP)
      - NGDPDPC   — Nominal GDP per capita (USD)

    For true bilateral granularity, future iteration could wire UN COMTRADE
    (free, public, but heavy: 500-row pages and a Spain↔partner permutation
    explosion).
    """
    source_id = "imf_dots"
    INDICATORS = {
        "BCA":        ("ca_balance_usd",     "USD"),
        "BCA_NGDPD":  ("ca_balance_pct_gdp", "PCT"),
        "NGDPDPC":    ("gdp_pc_nominal_usd", "USD"),
    }
    COUNTRIES = {
        "ESP": "ES", "DEU": "DE", "FRA": "FR", "ITA": "IT", "PRT": "PT",
        "GBR": "GB", "USA": "US", "CHN": "CN", "JPN": "JP",
        "BRA": "BR", "MEX": "MX",
    }

    def fetch(self):
        try:
            import httpx
        except ImportError:
            return [], []
        out: list[RawValue] = []
        for code, (metric, unit) in self.INDICATORS.items():
            for iso3, iso2 in self.COUNTRIES.items():
                url = f"https://www.imf.org/external/datamapper/api/v1/{code}/{iso3}"
                try:
                    r = httpx.get(url, timeout=15)
                    if not r.is_success:
                        continue
                    j = r.json()
                    series = (j.get("values") or {}).get(code, {}).get(iso3, {})
                    for year_str, val in series.items():
                        if val is None:
                            continue
                        try:
                            year = int(year_str)
                            ref = date(year, 6, 30)
                            out.append(RawValue(self.source_id, iso2, metric, float(val), ref, unit))
                        except Exception:
                            continue
                except Exception:
                    continue
        return out, []


# ── IMF COFER (stub: no stable public endpoint as of 2025-Q4) ────────────────

class IMFCOFERConnector(MacroConnector):
    """
    COFER (Currency Composition of Official Foreign Exchange Reserves).

    The IMF retired the old SDMX endpoint in 2025 and has not yet republished
    COFER through the new data hub or the datamapper API. The dataset is
    available only as a quarterly press release with PDF + xlsx, manually.

    This connector is therefore a stub until either:
      (a) IMF restores a programmatic COFER endpoint, or
      (b) we wire scraping of the press-release xlsx.

    The dashboard tab handles this gracefully: empty series → friendly message.
    """
    source_id = "imf_cofer"
    is_stub   = True

    def fetch(self):
        raise RuntimeError("not_implemented: IMF COFER public API retired; awaiting new endpoint")


# ── IMF WEO (rewritten with datamapper API; old SDMX dead) ───────────────────

class IMFWEOConnector(MacroConnector):
    """
    IMF World Economic Outlook via the public datamapper API.

    Old endpoint (data.imf.org/api/SDMX_JSON/data/WEO) was retired in 2025.
    The datamapper exposes most WEO indicators as JSON keyed by ISO3 → year → value.

    Coverage: real GDP growth, inflation, unemployment, current account balance %GDP,
    government balance %GDP, government debt %GDP (the latter two were the most
    requested for the /macro panorama).
    """
    source_id = "imf_weo"
    INDICATORS = {
        "NGDP_RPCH":     ("weo_gdp_growth",     "PCT"),
        "PCPIPCH":       ("weo_inflation",      "PCT"),
        "LUR":           ("weo_unemployment",   "PCT"),
        "BCA_NGDPD":     ("weo_current_account","PCT"),
        "GGXWDG_NGDP":   ("weo_govt_debt_gdp",  "PCT"),
        "GGXCNL_NGDP":   ("weo_govt_balance_gdp","PCT"),
        "NGDPDPC":       ("weo_gdp_pc_usd",     "USD"),
        "PPPPC":         ("weo_gdp_pc_ppp",     "USD"),
    }
    COUNTRIES = {
        "ESP": "ES", "DEU": "DE", "FRA": "FR", "ITA": "IT", "PRT": "PT",
        "GBR": "GB", "USA": "US", "CHN": "CN", "JPN": "JP",
    }

    def fetch(self):
        try:
            import httpx
        except ImportError:
            return [], []
        out: list[RawValue] = []
        for code, (metric, unit) in self.INDICATORS.items():
            for iso3, iso2 in self.COUNTRIES.items():
                url = f"https://www.imf.org/external/datamapper/api/v1/{code}/{iso3}"
                try:
                    r = httpx.get(url, timeout=15)
                    if not r.is_success:
                        continue
                    j = r.json()
                    series = (j.get("values") or {}).get(code, {}).get(iso3, {})
                    for year_str, val in series.items():
                        if val is None:
                            continue
                        try:
                            year = int(year_str)
                            ref = date(year, 6, 30)
                            out.append(RawValue(self.source_id, iso2, metric, float(val), ref, unit))
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
