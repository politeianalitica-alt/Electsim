"""
Scraper ACLED — Armed Conflict Location & Event Data Project
API docs: https://apidocs.acleddata.com/
Registro gratuito: https://developer.acleddata.com/

Hereda de etl/base_extractor.py (patrón existente del proyecto).
"""
from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

from etl.base_extractor import BaseExtractor

logger = logging.getLogger(__name__)

# ── Relevancia base de países para España ────────────────────────────────────
# 0.0 = irrelevante, 1.0 = crítico para intereses españoles
RELEVANCIA_ES: dict[str, float] = {
    # Energía crítica
    "DZA": 0.95,  "LBY": 0.85,  "NGA": 0.70,  "AGO": 0.65,
    "IRQ": 0.65,  "IRN": 0.70,  "SAU": 0.65,  "LBN": 0.72,
    # Seguridad y frontera
    "MAR": 0.90,  "PSE": 0.75,  "ISR": 0.75,  "SYR": 0.72,
    # Ucrania / Europa Este
    "UKR": 0.88,  "RUS": 0.85,  "MDA": 0.60,  "BLR": 0.55,
    "LVA": 0.65,  "EST": 0.60,  "LTU": 0.60,
    # Latinoamérica (empresas + diáspora)
    "VEN": 0.80,  "MEX": 0.75,  "COL": 0.70,  "BRA": 0.70,
    "ARG": 0.65,  "CUB": 0.62,  "PER": 0.58,  "ECU": 0.55,
    # Sahel (misiones militares españolas)
    "MLI": 0.78,  "NER": 0.72,  "TCD": 0.62,  "BFA": 0.68,
    "GNB": 0.55,  "SEN": 0.55,  "MRT": 0.60,
    # Turquía (OTAN)
    "TUR": 0.75,
}

_TIPO_BOOST: dict[str, float] = {
    "Battles": 1.2,
    "Explosions/Remote violence": 1.15,
    "Strategic developments": 1.10,
    "Violence against civilians": 1.05,
    "Riots": 0.95,
    "Protests": 0.85,
}


class ACLEDScraper(BaseExtractor):
    """Descarga eventos de conflicto de la API ACLED y los normaliza."""

    BASE_URL = "https://api.acleddata.com/acled/read"
    TABLE_NAME = "eventos_acled"

    def __init__(self) -> None:
        super().__init__("acled")
        self.api_key = os.getenv("ACLED_API_KEY", "")
        self.email = os.getenv("ACLED_EMAIL", "")

    # ── Helpers ──────────────────────────────────────────────────────────────

    def calcular_relevancia_espana(self, evento: dict) -> float:
        """Score 0-1 de relevancia para España según país y tipo de evento."""
        base = RELEVANCIA_ES.get(str(evento.get("iso3", "")), 0.08)
        boost = _TIPO_BOOST.get(str(evento.get("event_type", "")), 1.0)
        fatalities = int(evento.get("fatalities") or 0)
        if fatalities > 100:
            boost *= 1.3
        elif fatalities > 20:
            boost *= 1.15
        return min(1.0, base * boost)

    def _fetch_raw(self, days_back: int) -> list[dict]:
        """Llama a la API ACLED. Retorna [] si no hay credenciales o falla."""
        if not self.api_key or not self.email:
            logger.warning("ACLED_API_KEY / ACLED_EMAIL no definidos — usando datos demo")
            return []
        try:
            import httpx
        except ImportError:
            logger.warning("httpx no instalado, imposible llamar a ACLED")
            return []

        since = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        params = {
            "key": self.api_key,
            "email": self.email,
            "event_date": since,
            "event_date_where": ">=",
            "limit": 500,
            "fields": ("data_id|event_date|event_type|sub_event_type|"
                       "actor1|actor2|country|iso3|latitude|longitude|"
                       "fatalities|notes|source"),
            "format": "json",
        }
        try:
            resp = httpx.get(self.BASE_URL, params=params, timeout=30)
            resp.raise_for_status()
            return resp.json().get("data", [])
        except Exception as exc:
            logger.error("ACLED API error: %s", exc)
            return []

    # ── BaseExtractor interface ───────────────────────────────────────────────

    def extract(self) -> pd.DataFrame:
        """Descarga los últimos 7 días de datos ACLED."""
        raw = self._fetch_raw(days_back=7)
        if not raw:
            # Datos demo para desarrollo sin credenciales
            raw = _DEMO_EVENTOS
        return pd.DataFrame(raw)

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normaliza campos, calcula relevancia, filtra irrelevantes."""
        if df.empty:
            return df

        registros = []
        for _, row in df.iterrows():
            ev = row.to_dict()
            relevancia = self.calcular_relevancia_espana(ev)
            if relevancia < 0.05:
                continue
            registros.append({
                "acled_id":   ev.get("data_id"),
                "pais":       str(ev.get("iso3", ""))[:3],
                "pais_nombre":str(ev.get("country", ""))[:100],
                "fecha":      ev.get("event_date"),
                "tipo_evento":str(ev.get("event_type", ""))[:100],
                "subtipo":    str(ev.get("sub_event_type", ""))[:100],
                "actor1":     str(ev.get("actor1", ""))[:300],
                "actor2":     str(ev.get("actor2", ""))[:300],
                "latitud":    float(ev.get("latitude") or 0),
                "longitud":   float(ev.get("longitude") or 0),
                "fatalities": int(ev.get("fatalities") or 0),
                "relevancia_es": round(relevancia, 4),
                "notas":      str(ev.get("notes", ""))[:1000],
                "fuente":     "ACLED",
            })
        return pd.DataFrame(registros) if registros else pd.DataFrame()

    def run(self, days_back: int = 7) -> pd.DataFrame:  # type: ignore[override]
        """Pipeline completo: extract → transform → load (si hay DB)."""
        raw_df = self.extract()
        norm_df = self.transform(raw_df)
        if not norm_df.empty and self.engine:
            try:
                self.load(norm_df, self.TABLE_NAME, if_exists="append")
                logger.info("ACLED: %d eventos cargados en DB", len(norm_df))
            except Exception as exc:
                logger.warning("ACLED DB load error: %s", exc)
        return norm_df

    # ── Acceso rápido para el dashboard ──────────────────────────────────────

    def get_eventos_recientes(self, days: int = 30) -> list[dict]:
        """
        Retorna eventos para el dashboard.
        Prioridad: DB → Parquet → demo data.
        """
        if self.engine:
            try:
                since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
                df = pd.read_sql(
                    f"SELECT * FROM {self.TABLE_NAME} "
                    f"WHERE fecha >= '{since}' AND relevancia_es > 0.2 "
                    f"ORDER BY relevancia_es DESC, fatalities DESC LIMIT 200",
                    self.engine,
                )
                if not df.empty:
                    return df.to_dict("records")
            except Exception as exc:
                logger.warning("ACLED DB read: %s", exc)

        # Fallback: demo data
        return _DEMO_EVENTOS


# ── Demo data (sin credenciales ACLED) ───────────────────────────────────────
_DEMO_EVENTOS: list[dict] = [
    {"data_id": 1,  "event_date": "2026-04-28", "event_type": "Battles",
     "sub_event_type": "Armed clash", "country": "Ukraine", "iso3": "UKR",
     "latitude": 48.6, "longitude": 37.5, "fatalities": 45,
     "actor1": "Russian Armed Forces", "actor2": "Ukrainian Armed Forces",
     "notes": "Combates intensos en oblast Donetsk, línea del frente Avdiivka"},
    {"data_id": 2,  "event_date": "2026-04-27", "event_type": "Explosions/Remote violence",
     "sub_event_type": "Air/drone strike", "country": "Ukraine", "iso3": "UKR",
     "latitude": 49.9, "longitude": 36.2, "fatalities": 8,
     "actor1": "Russian Armed Forces", "actor2": "Civilians",
     "notes": "Ataque con misiles sobre Járkov, impactos en infraestructura energética"},
    {"data_id": 3,  "event_date": "2026-04-26", "event_type": "Strategic developments",
     "sub_event_type": "Change to group/leader", "country": "Mali", "iso3": "MLI",
     "latitude": 12.7, "longitude": -8.0, "fatalities": 0,
     "actor1": "JNIM (Jama'at Nusrat al-Islam wal-Muslimin)", "actor2": "",
     "notes": "JNIM expande control territorial en región Ségou, amenaza rutas logísticas"},
    {"data_id": 4,  "event_date": "2026-04-25", "event_type": "Battles",
     "sub_event_type": "Government regains territory", "country": "Niger", "iso3": "NER",
     "latitude": 13.5, "longitude": 2.1, "fatalities": 22,
     "actor1": "Military Forces of Niger", "actor2": "ISGS (Islamic State - Greater Sahara)",
     "notes": "Combate en región de Tillabéri, corredor de migración hacia Argelia"},
    {"data_id": 5,  "event_date": "2026-04-24", "event_type": "Violence against civilians",
     "sub_event_type": "Attack", "country": "Libya", "iso3": "LBY",
     "latitude": 32.9, "longitude": 13.2, "fatalities": 5,
     "actor1": "Unidentified Armed Group", "actor2": "Civilians",
     "notes": "Incidente en terminal petrolífera - posible impacto suministro Repsol"},
    {"data_id": 6,  "event_date": "2026-04-23", "event_type": "Protests",
     "sub_event_type": "Demonstration", "country": "Venezuela", "iso3": "VEN",
     "latitude": 10.5, "longitude": -66.9, "fatalities": 0,
     "actor1": "Opposition (Venezuela)", "actor2": "Government of Venezuela",
     "notes": "Manifestaciones masivas Caracas contra gobierno Maduro"},
    {"data_id": 7,  "event_date": "2026-04-22", "event_type": "Strategic developments",
     "sub_event_type": "Looting/property destruction", "country": "Burkina Faso", "iso3": "BFA",
     "latitude": 12.4, "longitude": -1.5, "fatalities": 0,
     "actor1": "JNIM", "actor2": "",
     "notes": "Control JNIM sobre zona minera norte — tensión en corredor Sahel-Maghreb"},
    {"data_id": 8,  "event_date": "2026-04-21", "event_type": "Battles",
     "sub_event_type": "Armed clash", "country": "Colombia", "iso3": "COL",
     "latitude": 4.7, "longitude": -74.1, "fatalities": 12,
     "actor1": "FARC disidentes", "actor2": "Colombian Armed Forces",
     "notes": "Combate en Caquetá — impacto en operaciones Telefónica Colombia"},
    {"data_id": 9,  "event_date": "2026-04-20", "event_type": "Explosions/Remote violence",
     "sub_event_type": "IED/landmine", "country": "Iraq", "iso3": "IRQ",
     "latitude": 33.3, "longitude": 44.4, "fatalities": 3,
     "actor1": "Islamic State", "actor2": "Iraqi Security Forces",
     "notes": "Atentado IED provincia Kirkuk — zona operaciones Repsol"},
    {"data_id": 10, "event_date": "2026-04-19", "event_type": "Strategic developments",
     "sub_event_type": "Agreement", "country": "Morocco", "iso3": "MAR",
     "latitude": 33.9, "longitude": -6.9, "fatalities": 0,
     "actor1": "Government of Morocco", "actor2": "Government of Spain",
     "notes": "Reunión de alto nivel España-Marruecos — avance en acuerdo energía y migraciones"},
]
