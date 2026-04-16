"""Scrapers de encuestas (Electomanía y Wikipedia)."""

from __future__ import annotations

import hashlib
import logging
import math
import time

import pandas as pd
import requests
from bs4 import BeautifulSoup

from dashboard.entity_resolver import registrar_alias_desconocido, resolver_df

logger = logging.getLogger(__name__)

PARTY_MAP = {"PARTIDO POPULAR": "PP", "PSOE": "PSOE", "VOX": "VOX", "SUMAR": "SUMAR", "CS": "CS"}


def scrape_electomania() -> pd.DataFrame:
    """Extrae tablas públicas de encuestas generales en Electomanía."""
    try:
        time.sleep(2)
        resp = requests.get("https://electomania.es", timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        rows: list[dict] = []
        for table in soup.select("table"):
            for tr in table.select("tr")[1:]:
                tds = [td.get_text(strip=True) for td in tr.select("td")]
                if len(tds) < 4:
                    continue
                rows.append(
                    {
                        "pollster": tds[0],
                        "fieldwork_start": pd.NaT,
                        "fieldwork_end": pd.NaT,
                        "sample_size": 1000,
                        "party": tds[1],
                        "estimate": pd.to_numeric(tds[2].replace("%", ""), errors="coerce"),
                        "source_url": "https://electomania.es",
                    }
                )
        return pd.DataFrame(rows)
    except Exception as exc:
        logger.warning("Electomanía falló: %s", exc)
        return pd.DataFrame()


def scrape_wikipedia_polls(election: str = "2023_Spanish_general_election") -> pd.DataFrame:
    """Extrae tabla de sondeos de Wikipedia."""
    try:
        url = f"https://en.wikipedia.org/wiki/{election}"
        tables = pd.read_html(url)
        if not tables:
            return pd.DataFrame()
        return tables[0]
    except Exception as exc:
        logger.warning("Wikipedia polls falló: %s", exc)
        return pd.DataFrame()


def normalize_polls_schema(raw_df: pd.DataFrame) -> pd.DataFrame:
    """Normaliza encuestas a esquema silver.polls."""
    if raw_df.empty:
        return raw_df
    df = raw_df.copy()
    df["party"] = df["party"].astype(str).str.upper().replace(PARTY_MAP)
    raw_party = df["party"].astype(str).copy()
    df["fieldwork_start"] = pd.to_datetime(df["fieldwork_start"], errors="coerce")
    df["fieldwork_end"] = pd.to_datetime(df["fieldwork_end"], errors="coerce")
    df["sample_size"] = pd.to_numeric(df["sample_size"], errors="coerce").fillna(1000).astype(int)
    df["estimate"] = pd.to_numeric(df["estimate"], errors="coerce")
    if "margin_of_error" not in df.columns:
        p = (df["estimate"].fillna(0) / 100).clip(0, 1)
        n = df["sample_size"].clip(lower=1)
        df["margin_of_error"] = 1.96 * ((p * (1 - p) / n) ** 0.5) * 100
    df["is_national"] = True
    df["election_type"] = "general"
    df["territory_code"] = "ES"
    df["raw_source"] = df.get("source_url", "")
    df["poll_id"] = df.apply(
        lambda r: hashlib.md5(f"{r['pollster']}-{r['fieldwork_end']}-{r['party']}".encode()).hexdigest()[:12],
        axis=1,
    )

    # Resolución canónica de entidades de partido (no rompe si ontología no está disponible).
    try:
        df_res = resolver_df(df.rename(columns={"party": "siglas"}), col_siglas="siglas")
        unresolved = df_res[df_res.get("entidad_id").isna()] if "entidad_id" in df_res.columns else pd.DataFrame()
        if not unresolved.empty:
            for alias in unresolved["siglas"].dropna().astype(str).unique().tolist():
                registrar_alias_desconocido(alias, fuente="polls_scraper")

        df["party"] = df_res.get("siglas_canonical", raw_party).astype(str)
        if "entidad_id" in df_res.columns:
            df["entidad_id"] = df_res["entidad_id"]
        if "color_hex" in df_res.columns:
            df["party_color_hex"] = df_res["color_hex"]
    except Exception as exc:
        logger.warning("No se pudo resolver ontología en polls_scraper: %s", exc)

    return df
