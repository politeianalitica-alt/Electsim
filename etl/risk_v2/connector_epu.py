"""
EPU — Economic Policy Uncertainty Index (Baker, Bloom & Davis).

Pública sin auth. Excel mensual:
  https://www.policyuncertainty.com/media/All_Country_Data.xlsx

Métrica: epu_country (un valor mensual por país disponible).
Para España hay un EPU específico (Spain_EPU). Lo mapeamos a metric_name='epu_spain'.
"""
from __future__ import annotations

import logging
from datetime import date

from .base import RawValue, RiskV2Connector

logger = logging.getLogger(__name__)

EPU_URL = "https://www.policyuncertainty.com/media/All_Country_Data.xlsx"

# Map column → ISO2
COLUMN_TO_ISO2 = {
    "Spain":          "ES",
    "France":         "FR",
    "Germany":        "DE",
    "Italy":          "IT",
    "United Kingdom": "GB",
    "United States":  "US",
    "GEPU_current":   "WO",  # global, all-country
}


class EPUConnector(RiskV2Connector):
    source_id = "epu"

    def fetch(self) -> list[RawValue]:
        try:
            import pandas as pd
        except ImportError:
            return []
        try:
            df = pd.read_excel(EPU_URL)
        except Exception as exc:
            logger.warning("EPU fetch failed: %s", exc)
            return []

        df.columns = [str(c).strip() for c in df.columns]
        # Build a 'Date' column from 'Year' + 'Month' if needed
        if "Year" in df.columns and "Month" in df.columns:
            # Drop NaN rows before integer cast
            df = df.dropna(subset=["Year", "Month"])
            df["_dt"] = pd.to_datetime(
                df["Year"].astype(int).astype(str) + "-" + df["Month"].astype(int).astype(str).str.zfill(2) + "-01",
                errors="coerce",
            )
        elif "Date" in df.columns:
            df["_dt"] = pd.to_datetime(df["Date"], errors="coerce")
        else:
            return []
        df = df.dropna(subset=["_dt"])
        cutoff = pd.Timestamp.now() - pd.DateOffset(years=6)
        df = df[df["_dt"] >= cutoff]

        out: list[RawValue] = []
        for _, row in df.iterrows():
            ref = row["_dt"].date()
            for col, iso2 in COLUMN_TO_ISO2.items():
                if col in df.columns and not pd.isna(row[col]):
                    metric = "epu_spain" if iso2 == "ES" else (
                        "epu_global" if iso2 == "WO" else "epu_country"
                    )
                    try:
                        out.append(RawValue(
                            source_id=self.source_id, country_iso2=iso2,
                            metric_name=metric,
                            metric_value=float(row[col]), reference_date=ref,
                        ))
                    except Exception:
                        continue
        return out
