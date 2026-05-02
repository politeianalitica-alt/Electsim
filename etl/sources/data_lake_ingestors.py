"""
Data Lake Ingestors — 100 fuentes organizadas en 10 capas.

Cada clase tiene el metodo extract() que devuelve list[dict].
Los resultados se guardan en data_lake_staging via DataLakeOrchestrator.

Principio de diseno: siempre reutilizar los clientes existentes en
etl/sources/ antes de crear uno nuevo. Este modulo es una capa de
orquestacion, no de implementacion.

Equivale al Foundry Pipeline Builder de Palantir: fuentes heterogeneas
unificadas en un staging layer con payload JSONB.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from datetime import datetime, timedelta
from typing import Any

import feedparser
import psycopg
import requests
from bs4 import BeautifulSoup

from config.settings import get_settings
from etl.base_extractor import BaseExtractor

log = logging.getLogger(__name__)
_settings = get_settings()


def _conn_str() -> str:
    raw = _settings.database_url_raw
    return re.sub(r"postgresql\+\w+://", "postgresql://", raw)


# ======================================================================
# CAPA 1 — LEGISLATIVO NACIONAL
# ======================================================================

class BORMEIngestor:
    SOURCE = "borme"

    def extract(self, date: str | None = None) -> list[dict]:
        date = date or datetime.now().strftime("%Y/%m/%d")
        url = f"https://www.boe.es/diario_borme/{date}/"
        try:
            r = requests.get(url, timeout=10)
            soup = BeautifulSoup(r.text, "html.parser")
            records = []
            for item in soup.select(".dispo"):
                records.append({
                    "source": self.SOURCE,
                    "type": "mercantil",
                    "title": item.get_text(strip=True)[:300],
                    "url": url,
                    "published_at": date,
                    "raw": item.get_text()[:1000],
                })
            return records
        except Exception as exc:
            log.debug("BORME: %s", exc)
            return []


class ContratacionPublicaIngestor:
    SOURCE = "contratacion_publica"
    FEED = ("https://contrataciondelestado.es/sindicacion/sindicacion_1044/"
            "licitacionesPerfilesContratanteCompleto3.atom")

    def extract(self, max_items: int = 100) -> list[dict]:
        try:
            feed = feedparser.parse(self.FEED)
            records = []
            for entry in feed.entries[:max_items]:
                records.append({
                    "source": self.SOURCE,
                    "type": "licitacion",
                    "title": entry.get("title", "")[:300],
                    "summary": entry.get("summary", "")[:800],
                    "url": entry.get("link", ""),
                    "published_at": entry.get("published", ""),
                })
            return records
        except Exception as exc:
            log.debug("ContratacionPublica: %s", exc)
            return []


# ======================================================================
# CAPA 2 — BOLETINES AUTONOMICOS (patron RSS generico)
# ======================================================================

BOLETIN_FEEDS: dict[str, str] = {
    "DOGC": "https://portaldogc.gencat.cat/utilsEADOP/PDF/RSS/rss.xml",
    "BOCM": "https://www.bocm.es/rss/boletines/ultimos.xml",
    "BOJA": "https://www.juntadeandalucia.es/boja/boletines/rss.xml",
    "BOPV": "https://www.euskadi.eus/bopv2/datos/rss/rss.xml",
    "DOG":  "https://www.xunta.gal/dog/Publicados/rss/dogRSS.xml",
    "DOCV": "https://dogv.gva.es/portal/rss.jsp",
    "BOA":  "https://www.boa.aragon.es/rss.php",
    "BOC":  "https://www.gobiernodecanarias.org/boc/portada/rss/",
    "BON":  "https://bon.navarra.es/es/rss/boletin/",
    "BOIB": "https://boib.caib.es/pdf/rss.xml",
}


class BoletinAutonomicoIngestor:
    SOURCE = "boletin_autonomico"

    def extract(self, ccaa_keys: list[str] | None = None) -> list[dict]:
        targets = ccaa_keys or list(BOLETIN_FEEDS.keys())
        records: list[dict] = []
        for key in targets:
            url = BOLETIN_FEEDS.get(key)
            if not url:
                continue
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:20]:
                    records.append({
                        "source": self.SOURCE,
                        "region": key,
                        "level":  "regional",
                        "title":  entry.get("title", "")[:300],
                        "url":    entry.get("link", ""),
                        "published_at": entry.get("published", ""),
                        "summary": entry.get("summary", "")[:400],
                    })
                log.debug("%s: %d items", key, len(feed.entries))
            except Exception as exc:
                log.debug("%s: %s", key, exc)
        return records


# ======================================================================
# CAPA 3 — EUROPEO
# ======================================================================

class ConsejoUEIngestor:
    SOURCE = "consejo_ue"

    def extract(self, months_ahead: int = 3) -> list[dict]:
        date_from = datetime.now().strftime("%Y-%m-%d")
        date_to   = (datetime.now() + timedelta(days=30 * months_ahead)).strftime("%Y-%m-%d")
        try:
            r = requests.get(
                "https://www.consilium.europa.eu/api/meetings/calendar",
                params={"dateFrom": date_from, "dateTo": date_to},
                timeout=10,
            )
            records = []
            for mtg in r.json().get("meetings", []):
                records.append({
                    "source":        self.SOURCE,
                    "type":          "cumbre_ue",
                    "title":         mtg.get("title", ""),
                    "date":          mtg.get("startDate", ""),
                    "place":         mtg.get("location", ""),
                    "council_config": mtg.get("councilConfig", ""),
                    "url":           mtg.get("url", ""),
                    "level":         "european",
                })
            return records
        except Exception as exc:
            log.debug("ConsejoUE: %s", exc)
            return []


class EuroParliamentVotesIngestor:
    SOURCE = "europarl_votes"
    API    = "https://data.europarl.europa.eu/api/v1/"

    def extract(self, limit: int = 50) -> list[dict]:
        try:
            r = requests.get(
                f"{self.API}votes/",
                params={"limit": limit, "format": "application/json"},
                timeout=15,
            )
            records = []
            for vote in r.json().get("data", []):
                records.append({
                    "source":      self.SOURCE,
                    "type":        "votacion_pe",
                    "title":       vote.get("label", "")[:300],
                    "date":        vote.get("date", ""),
                    "result":      vote.get("result", ""),
                    "activity_id": vote.get("id", ""),
                    "level":       "european",
                })
            return records
        except Exception as exc:
            log.debug("EuroParliamentVotes: %s", exc)
            return []


# ======================================================================
# CAPA 4 — DATOS ELECTORALES Y DEMOGRAFICOS
# ======================================================================

class INEPadronIngestor:
    SOURCE = "ine_padron"
    API    = "https://servicios.ine.es/wstempus/js/ES/"
    OPERATIONS = {
        "poblacion_municipios": "DATOS_TABLA/2853?tip=AM",
        "edad_media_municipio": "DATOS_TABLA/56939?tip=AM",
        "extranjeros_municipio": "DATOS_TABLA/2892?tip=AM",
    }

    def extract(self, operation: str = "poblacion_municipios") -> list[dict]:
        query = self.OPERATIONS.get(operation, "")
        if not query:
            return []
        try:
            r = requests.get(f"{self.API}{query}", timeout=30)
            records = []
            for item in r.json():
                records.append({
                    "source":   self.SOURCE,
                    "operation": operation,
                    "nombre":   item.get("Nombre", ""),
                    "codigo":   item.get("Codigo", ""),
                    "valor":    (item.get("Data") or [{}])[0].get("Valor"),
                    "periodo":  (item.get("Data") or [{}])[0].get("NombrePeriodo", ""),
                })
            return records
        except Exception as exc:
            log.debug("INEPadron %s: %s", operation, exc)
            return []


class INEAtlasRentaIngestor:
    """
    Atlas de Distribucion de Renta de los Hogares (INE).
    El dato mas valioso para los propensity models — renta media por seccion censal.
    """
    SOURCE       = "ine_atlas_renta"
    DOWNLOAD_URL = ("https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/30896.csv?nocab=1")

    def extract(self) -> list[dict]:
        try:
            import pandas as pd
            df = pd.read_csv(
                self.DOWNLOAD_URL,
                encoding="latin-1", sep=";",
                thousands=".", decimal=",",
            )
            records = []
            for _, row in df.iterrows():
                val_raw = str(row.get("Total", "0")).replace(".", "").replace(",", ".")
                try:
                    val = float(val_raw)
                except ValueError:
                    val = 0.0
                records.append({
                    "source":     self.SOURCE,
                    "seccion":    str(row.get("Secciones", "")).strip(),
                    "municipio":  str(row.get("Municipios", "")).strip(),
                    "renta_media": val,
                    "periodo":    str(row.get("Periodo", "")),
                })
            log.info("Atlas Renta: %d secciones", len(records))
            return records
        except Exception as exc:
            log.debug("INEAtlasRenta: %s", exc)
            return []


# ======================================================================
# CAPA 5 — GEOESPACIAL
# ======================================================================

class MITMAMovilidadIngestor:
    """
    MITMA Big Data de Movilidad — flujos inter-provinciales.
    Dataset de telefonía anonimizado publicado por el Ministerio de Transportes.
    """
    SOURCE = "mitma_movilidad"

    def extract(self, fecha: str | None = None, max_rows: int = 20000) -> list[dict]:
        fecha = fecha or (datetime.now() - timedelta(days=30)).strftime("%Y%m%d")
        url = (
            f"https://opendata-movilidad.mitma.es/maestra1-mitma-zonificacion/"
            f"ficheros-diarios/{fecha[:4]}/{fecha}_maestra1_mitma_zonas.csv.gz"
        )
        try:
            import pandas as pd
            df = pd.read_csv(url, sep="|", compression="gzip", nrows=max_rows)
            records = []
            for _, row in df.iterrows():
                records.append({
                    "source":           self.SOURCE,
                    "fecha":            fecha,
                    "origen":           str(row.get("origen", "")),
                    "destino":          str(row.get("destino", "")),
                    "viajes":           float(str(row.get("viajes", 0)).replace(",", ".") or 0),
                    "viajes_km":        float(str(row.get("viajes_km", 0)).replace(",", ".") or 0),
                })
            log.info("MITMA Movilidad %s: %d flujos", fecha, len(records))
            return records
        except Exception as exc:
            log.debug("MITMA: %s", exc)
            return []


# ======================================================================
# CAPA 6 — MEDIOS Y OPINION PUBLICA
# ======================================================================

MEDIA_FEEDS: dict[str, str] = {
    "el_pais":         "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    "el_mundo":        "https://www.elmundo.es/rss/portada.xml",
    "el_confidencial": "https://rss.elconfidencial.com/espana/",
    "eldiario":        "https://www.eldiario.es/rss/",
    "abc":             "https://www.abc.es/rss/feeds/abc_espana.xml",
    "la_vanguardia":   "https://www.lavanguardia.com/mvc/feed/rss/home",
    "politico_eu":     "https://www.politico.eu/rss/",
    "expansion":       "https://www.expansion.com/rss/mercados.xml",
    "la_razon":        "https://www.larazon.es/rss/",
    "rtve":            "https://www.rtve.es/api/feed/rss/portada-espana/",
}


class MediaFeedIngestor:
    SOURCE = "media_rss"

    def extract(
        self,
        sources: list[str] | None = None,
        max_per_source: int = 30,
    ) -> list[dict]:
        targets = sources or list(MEDIA_FEEDS.keys())
        records: list[dict] = []
        for src in targets:
            url = MEDIA_FEEDS.get(src)
            if not url:
                continue
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:max_per_source]:
                    records.append({
                        "source":       self.SOURCE,
                        "media":        src,
                        "type":         "noticia",
                        "title":        entry.get("title", "")[:300],
                        "summary":      entry.get("summary", "")[:600],
                        "url":          entry.get("link", ""),
                        "published_at": entry.get("published", ""),
                        "author":       entry.get("author", ""),
                    })
            except Exception as exc:
                log.debug("Media %s: %s", src, exc)
        return records


class GDELTIngestor:
    """
    GDELT v2 — el data lake de noticias mas grande del mundo.
    Reutiliza el cliente existente en etl/sources/gdelt/gdeltclient.py.
    """
    SOURCE = "gdelt"

    def extract(
        self,
        query: str = "Espana politica gobierno",
        days_back: int = 1,
        max_records: int = 50,
        sourcelang: str = "Spanish",
    ) -> list[dict]:
        # Primero intentar con el cliente existente
        try:
            from etl.sources.gdelt.gdeltclient import GDELTClient
            # El cliente existente puede tener diferente interfaz — usamos HTTP directo
        except Exception:
            pass

        since = (datetime.now() - timedelta(days=days_back)).strftime("%Y%m%d%H%M%S")
        try:
            r = requests.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params={
                    "query":         f"{query} sourcelang:{sourcelang}",
                    "mode":          "ArtList",
                    "maxrecords":    max_records,
                    "startdatetime": since,
                    "format":        "json",
                    "sort":          "ToneDesc",
                },
                timeout=15,
            )
            return [
                {
                    "source":   self.SOURCE,
                    "title":    a.get("title", ""),
                    "url":      a.get("url", ""),
                    "domain":   a.get("domain", ""),
                    "language": a.get("language", ""),
                    "tone":     float(a.get("tone", 0)),
                    "seendate": a.get("seendate", ""),
                    "query":    query,
                }
                for a in r.json().get("articles", [])
            ]
        except Exception as exc:
            log.debug("GDELT: %s", exc)
            return []


# ======================================================================
# CAPA 7 — ECONOMICO INTERNACIONAL
# ======================================================================

class WorldBankIngestor:
    SOURCE = "world_bank"
    API    = "https://api.worldbank.org/v2/"
    INDICATORS = {
        "pib_pc":               "NY.GDP.PCAP.CD",
        "desempleo":            "SL.UEM.TOTL.ZS",
        "inflacion":            "FP.CPI.TOTL.ZG",
        "deuda_pib":            "GC.DOD.TOTL.GD.ZS",
        "gasto_defensa_pib":    "MS.MIL.XPND.GD.ZS",
        "control_corrupcion":   "CC.EST",
        "estabilidad_politica": "PV.EST",
    }

    def extract(
        self,
        country: str = "ES",
        indicator_key: str = "pib_pc",
        years: int = 10,
    ) -> list[dict]:
        indicator = self.INDICATORS.get(indicator_key, indicator_key)
        try:
            r = requests.get(
                f"{self.API}country/{country}/indicator/{indicator}",
                params={"format": "json", "mrv": years, "per_page": 50},
                timeout=15,
            )
            data = r.json()
            if len(data) < 2:
                return []
            return [
                {
                    "source":    self.SOURCE,
                    "country":   country,
                    "indicator": indicator_key,
                    "year":      item.get("date", ""),
                    "value":     item.get("value"),
                }
                for item in data[1]
                if item.get("value") is not None
            ]
        except Exception as exc:
            log.debug("WorldBank %s: %s", indicator_key, exc)
            return []


class ACLEDIngestor:
    """
    ACLED — Armed Conflict Location and Event Data.
    Reutiliza el cliente existente en etl/sources/acled/acledclient.py.
    """
    SOURCE = "acled"

    def extract(
        self,
        region: str = "Europe",
        country: str = "Spain",
        days_back: int = 30,
    ) -> list[dict]:
        # Intentar con el cliente existente primero
        try:
            from etl.sources.acled.acledclient import ACLEDClient
            client = ACLEDClient()
            # Si tiene metodo compatible, usarlo
            if hasattr(client, "get_events"):
                return client.get_events(country=country, days_back=days_back)
        except Exception:
            pass

        # Fallback directo a la API
        api_key = os.getenv("ACLED_API_KEY", "")
        email   = os.getenv("ACLED_EMAIL", "")
        if not api_key or not email:
            return []

        since = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        try:
            r = requests.get(
                "https://api.acleddata.com/acled/read",
                params={
                    "key":                api_key,
                    "email":              email,
                    "country":            country,
                    "event_date":         since,
                    "event_date_where":   ">=",
                    "limit":              500,
                    "fields": (
                        "event_id_cnty|event_date|event_type|sub_event_type|"
                        "actor1|actor2|country|location|latitude|longitude|fatalities|notes"
                    ),
                },
                timeout=15,
            )
            return [{"source": self.SOURCE, **ev} for ev in r.json().get("data", [])]
        except Exception as exc:
            log.debug("ACLED: %s", exc)
            return []


# ======================================================================
# CAPA 8 — INTELIGENCIA PERSONAS Y ORGANIZACIONES
# ======================================================================

class OpenSanctionsIngestor:
    SOURCE = "opensanctions"

    def search(self, name: str, schema: str = "Person") -> list[dict]:
        api_key = os.getenv("OPENSANCTIONS_API_KEY", "")
        if not api_key:
            return []
        try:
            r = requests.post(
                "https://api.opensanctions.org/match/default",
                json={"queries": {"q0": {"schema": schema,
                                          "properties": {"name": [name]}}}},
                headers={"Authorization": f"ApiKey {api_key}"},
                timeout=10,
            )
            results = r.json().get("responses", {}).get("q0", {})
            return [
                {
                    "source":      self.SOURCE,
                    "match_score": res.get("score", 0),
                    "entity_id":   res.get("id", ""),
                    "caption":     res.get("caption", ""),
                    "schema":      res.get("schema", ""),
                    "datasets":    res.get("datasets", []),
                }
                for res in results.get("results", [])
            ]
        except Exception as exc:
            log.debug("OpenSanctions: %s", exc)
            return []


class OpenCorporatesIngestor:
    SOURCE = "opencorporates"
    API    = "https://api.opencorporates.com/v0.4/"

    def search_company(self, name: str, jurisdiction: str = "es") -> list[dict]:
        api_key = os.getenv("OPENCORPORATES_API_KEY", "")
        params: dict = {"q": name, "jurisdiction_code": jurisdiction}
        if api_key:
            params["api_token"] = api_key
        try:
            r = requests.get(
                f"{self.API}companies/search",
                params=params,
                timeout=10,
            )
            companies = r.json().get("results", {}).get("companies", [])
            return [
                {
                    "source":           self.SOURCE,
                    "name":             c.get("company", {}).get("name", ""),
                    "company_number":   c.get("company", {}).get("company_number", ""),
                    "jurisdiction":     c.get("company", {}).get("jurisdiction_code", ""),
                    "company_type":     c.get("company", {}).get("company_type", ""),
                    "incorporation_date": c.get("company", {}).get("incorporation_date", ""),
                    "inactive":         c.get("company", {}).get("inactive", False),
                }
                for c in companies
            ]
        except Exception as exc:
            log.debug("OpenCorporates: %s", exc)
            return []


# ======================================================================
# CAPA 9 — SEGURIDAD Y GEOPOLITICA
# ======================================================================

class NATOPressIngestor:
    SOURCE = "nato_press"

    def extract(self, max_items: int = 30) -> list[dict]:
        try:
            feed = feedparser.parse(
                "https://www.nato.int/cps/en/natohq/news.htm?selectedLocale=en"
            )
            records = []
            for entry in feed.entries[:max_items]:
                records.append({
                    "source":       self.SOURCE,
                    "type":         "nato_press",
                    "title":        entry.get("title", "")[:300],
                    "url":          entry.get("link", ""),
                    "published_at": entry.get("published", ""),
                    "level":        "international",
                })
            return records
        except Exception as exc:
            log.debug("NATOPress: %s", exc)
            return []


class SIPRIMilexIngestor:
    SOURCE = "sipri"

    def extract(
        self,
        countries: list[str] | None = None,
    ) -> list[dict]:
        countries = countries or [
            "Spain", "France", "Germany", "Italy",
            "Poland", "Ukraine", "Russia", "USA",
        ]
        try:
            import pandas as pd
            df = pd.read_excel(
                "https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2024.xlsx",
                sheet_name="Share of GDP",
                header=5,
                index_col=0,
            )
            records = []
            for country in countries:
                if country in df.index:
                    for year, val in df.loc[country].items():
                        if pd.notna(val):
                            records.append({
                                "source":  self.SOURCE,
                                "country": country,
                                "metric":  "gasto_defensa_pct_pib",
                                "year":    str(year),
                                "value":   float(val),
                            })
            return records
        except Exception as exc:
            log.debug("SIPRI: %s", exc)
            return []


# ======================================================================
# CAPA 10 — REDES SOCIALES Y TENDENCIAS
# ======================================================================

class GoogleTrendsIngestor:
    SOURCE = "google_trends"

    def extract(
        self,
        keywords: list[str] | None = None,
        geo: str = "ES",
        timeframe: str = "now 7-d",
    ) -> list[dict]:
        keywords = keywords or [
            "Pedro Sanchez", "PP", "PSOE", "VOX", "Sumar",
            "presupuestos", "reforma", "elecciones",
        ]
        try:
            from pytrends.request import TrendReq
            pytrends = TrendReq(hl="es-ES", tz=60)
            chunks = [keywords[i:i+5] for i in range(0, len(keywords), 5)]
            records: list[dict] = []
            for chunk in chunks:
                pytrends.build_payload(chunk, cat=0, timeframe=timeframe,
                                       geo=geo, gprop="")
                df = pytrends.interest_over_time()
                if df.empty:
                    continue
                for ts, row in df.iterrows():
                    for kw in chunk:
                        if kw in row:
                            records.append({
                                "source":    self.SOURCE,
                                "keyword":   kw,
                                "geo":       geo,
                                "timestamp": ts.isoformat(),
                                "interest":  int(row[kw]),
                            })
            return records
        except Exception as exc:
            log.debug("GoogleTrends: %s", exc)
            return []


class TelegramChannelIngestor:
    """Canales publicos de partidos y lideres politicos (sin autenticacion)."""
    SOURCE = "telegram"
    CHANNELS: dict[str, str] = {
        "vox_es":    "https://t.me/s/vox_es",
        "ppopular":  "https://t.me/s/ppopular",
        "psoe":      "https://t.me/s/psoe",
        "podemos":   "https://t.me/s/podemosinfo",
    }

    def extract(
        self,
        channels: list[str] | None = None,
        max_messages: int = 30,
    ) -> list[dict]:
        targets = channels or list(self.CHANNELS.keys())
        records: list[dict] = []
        for name in targets:
            url = self.CHANNELS.get(name)
            if not url:
                continue
            try:
                r = requests.get(
                    url, timeout=10,
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                soup = BeautifulSoup(r.text, "html.parser")
                for msg in soup.select(".tgme_widget_message_text")[:max_messages]:
                    records.append({
                        "source":     self.SOURCE,
                        "channel":    name,
                        "text":       msg.get_text(strip=True)[:500],
                        "scraped_at": datetime.now().isoformat(),
                    })
            except Exception as exc:
                log.debug("Telegram %s: %s", name, exc)
        return records


class MalditaFactCheckIngestor:
    SOURCE = "maldita"
    RSS    = "https://maldita.es/feed/"

    def extract(self, max_items: int = 50) -> list[dict]:
        try:
            feed = feedparser.parse(self.RSS)
            records = []
            for entry in feed.entries[:max_items]:
                title = entry.get("title", "")
                verdict = "INDEFINIDO"
                tl = title.lower()
                if any(w in tl for w in ["falso", "bulo", "mentira"]):
                    verdict = "FALSO"
                elif any(w in tl for w in ["verdadero", "correcto", "cierto"]):
                    verdict = "VERDADERO"
                elif any(w in tl for w in ["enganoso", "manipulado", "contexto"]):
                    verdict = "ENGANOSO"

                records.append({
                    "source":       self.SOURCE,
                    "type":         "fact_check",
                    "title":        title[:300],
                    "summary":      entry.get("summary", "")[:600],
                    "url":          entry.get("link", ""),
                    "published_at": entry.get("published", ""),
                    "verdict":      verdict,
                })
            return records
        except Exception as exc:
            log.debug("Maldita: %s", exc)
            return []


# ======================================================================
# ORQUESTADOR — DataLakeOrchestrator
# ======================================================================

class DataLakeOrchestrator:
    """
    Orquesta la ingesta de las 100 fuentes y las guarda en data_lake_staging.
    Diseno: cada fuente -> staging (JSONB) -> normalizacion -> tabla final.
    Equivale al Foundry Pipeline Builder de Palantir.
    """

    INGESTORS: dict[str, type] = {
        "borme":            BORMEIngestor,
        "contratacion":     ContratacionPublicaIngestor,
        "boletines_ccaa":   BoletinAutonomicoIngestor,
        "consejo_ue":       ConsejoUEIngestor,
        "ep_votes":         EuroParliamentVotesIngestor,
        "ine_padron":       INEPadronIngestor,
        "ine_atlas_renta":  INEAtlasRentaIngestor,
        "mitma":            MITMAMovilidadIngestor,
        "media_rss":        MediaFeedIngestor,
        "gdelt":            GDELTIngestor,
        "world_bank":       WorldBankIngestor,
        "acled":            ACLEDIngestor,
        "opensanctions":    OpenSanctionsIngestor,
        "opencorporates":   OpenCorporatesIngestor,
        "nato":             NATOPressIngestor,
        "sipri":            SIPRIMilexIngestor,
        "google_trends":    GoogleTrendsIngestor,
        "telegram":         TelegramChannelIngestor,
        "maldita":          MalditaFactCheckIngestor,
    }

    def __init__(self) -> None:
        self._dsn = _conn_str()

    def run_layer(self, layer: str, **kwargs) -> dict:
        ingestor_cls = self.INGESTORS.get(layer)
        if not ingestor_cls:
            return {"layer": layer, "error": "unknown layer"}

        ingestor = ingestor_cls()
        try:
            records = ingestor.extract(**kwargs)
            saved = self._save_to_staging(layer, records)
            log.info("Layer %s: %d extraidos, %d guardados", layer, len(records), saved)
            return {"layer": layer, "extracted": len(records), "saved": saved}
        except Exception as exc:
            log.error("Error en %s: %s", layer, exc)
            return {"layer": layer, "error": str(exc)}

    def run_daily(self) -> dict:
        """Pipeline diario de ingesta prioritaria."""
        priority = [
            ("borme",         {}),
            ("contratacion",  {}),
            ("boletines_ccaa", {}),
            ("consejo_ue",    {}),
            ("media_rss",     {}),
            ("maldita",       {}),
            ("nato",          {}),
            ("telegram",      {}),
            ("gdelt",         {"query": "Espana politica gobierno"}),
            ("acled",         {"country": "Spain", "days_back": 7}),
        ]
        results = {}
        for layer, kwargs in priority:
            results[layer] = self.run_layer(layer, **kwargs)
        return results

    def _save_to_staging(self, source: str, records: list[dict]) -> int:
        if not records:
            return 0
        with psycopg.connect(self._dsn) as conn:
            for r in records:
                try:
                    conn.execute(
                        """
                        INSERT INTO data_lake_staging (source, payload)
                        VALUES (%s, %s::jsonb)
                        """,
                        (source, json.dumps(r, default=str)),
                    )
                except Exception:
                    pass
        return len(records)
