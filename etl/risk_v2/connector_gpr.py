"""
GPR — Geopolitical Risk Index (Caldara & Iacoviello).

Fuente pública sin auth. Excel mensual con:
  - GPR (índice global)
  - GPRH (índice histórico)
  - GPRC_xxx (por país: GPRC_ESP para España, GPRC_USA, GPRC_GBR, ...)

URL: https://www.matteoiacoviello.com/gpr_files/data_gpr_export.xls

Métricas que poblamos en risk_raw_values:
  - 'gpr_global'   (cualquier país hace referencia al mismo valor)
  - 'gpr_spain'    (GPRC_ESP)
  - 'gpr_country'  (para FR, IT, DE, GB, PT, etc.)
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Any

from .base import RawValue, RiskV2Connector

logger = logging.getLogger(__name__)


GPR_URL = "https://www.matteoiacoviello.com/gpr_files/data_gpr_export.xls"

# Map "GPRC_XXX" → ISO2
GPRC_COUNTRIES = {
    "ESP": "ES", "USA": "US", "GBR": "GB", "FRA": "FR",
    "ITA": "IT", "DEU": "DE", "PRT": "PT", "RUS": "RU",
    "CHN": "CN", "JPN": "JP", "BRA": "BR", "MEX": "MX",
    "ARG": "AR", "TUR": "TR", "POL": "PL", "MAR": "MA",
    "DZA": "DZ", "SAU": "SA", "ISR": "IL", "IRN": "IR",
}


class GPRConnector(RiskV2Connector):
    source_id = "gpr_caldara"

    def fetch(self) -> list[RawValue]:
        try:
            import pandas as pd
        except ImportError:
            logger.warning("pandas not available")
            return []
        try:
            df = pd.read_excel(GPR_URL, engine="xlrd")
        except Exception as exc:
            logger.warning("GPR fetch failed: %s", exc)
            return []

        # Normalize column names
        df.columns = [str(c).strip() for c in df.columns]

        # Column 'month' is usually first; could be 'Date' or yyyy/mm string
        date_col: str | None = None
        for cand in ("month", "Month", "Date", "date", "Unnamed: 0"):
            if cand in df.columns:
                date_col = cand
                break
        if date_col is None:
            logger.warning("GPR: no date column found")
            return []

        try:
            df["_dt"] = pd.to_datetime(df[date_col], errors="coerce")
        except Exception:
            return []
        df = df.dropna(subset=["_dt"])

        # Keep last 6 years to be friendly with the 5y rolling window normalization
        cutoff = pd.Timestamp.now() - pd.DateOffset(years=6)
        df = df[df["_dt"] >= cutoff]

        out: list[RawValue] = []
        for _, row in df.iterrows():
            ref = row["_dt"].date()
            # Global GPR
            for col in ("GPR", "gpr"):
                if col in df.columns and not pd.isna(row[col]):
                    out.append(RawValue(
                        source_id=self.source_id, country_iso2="WO",
                        metric_name="gpr_global",
                        metric_value=float(row[col]), reference_date=ref,
                    ))
                    break
            # Per-country (GPRC_XXX → metric depends on ISO2)
            for col in df.columns:
                if col.startswith("GPRC_") and not pd.isna(row[col]):
                    iso3 = col[5:]
                    iso2 = GPRC_COUNTRIES.get(iso3)
                    if not iso2:
                        continue
                    # Spain has its own metric name to align with seed config
                    metric = "gpr_spain" if iso2 == "ES" else "gpr_country"
                    out.append(RawValue(
                        source_id=self.source_id, country_iso2=iso2,
                        metric_name=metric,
                        metric_value=float(row[col]), reference_date=ref,
                    ))
        return out
