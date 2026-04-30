"""
ACLED Client v2 — Armed Conflict Location and Event Data Project
OAuth Bearer token (nueva API v2 — el paquete acled-py esta deprecado).
Endpoint: https://acleddata.com/api/acled/read

Registro gratuito en https://developer.acleddata.com/
Necesita: ACLED_EMAIL y ACLED_API_KEY en el entorno.
"""
from __future__ import annotations

import asyncio
import logging
import math
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Relevancia de paises para intereses espanoles  (0.0 irrelevante, 1.0 critico)
# ---------------------------------------------------------------------------
PAISES_INTERES_ESPANA: dict[str, float] = {
    # Energia critica
    "DZA": 1.0,   # Argelia — primer proveedor de gas
    "LBY": 0.90,  # Libia — petroleo + ruta migratoria
    "NGA": 0.70,  # Nigeria — GNL
    "AGO": 0.65,  # Angola — Repsol
    "IRQ": 0.65,  # Iraq — Repsol Kirkuk
    "IRN": 0.70,  # Iran — sanciones y gas
    "SAU": 0.65,  # Arabia Saudi — OPEC
    "LBN": 0.72,  # Libano — estabilidad Mediterraneo
    # Seguridad y frontera sur
    "MAR": 1.0,   # Marruecos — relacion bilateral + Ceuta/Melilla
    "PSE": 0.80,  # Palestina — conflicto en curso
    "ISR": 0.78,  # Israel — Gaza
    "SYR": 0.72,  # Siria — refugiados
    "TUN": 0.68,  # Tunisia — corredor migratorio
    "EGY": 0.65,  # Egipto — Canal Suez
    # Europa Este / Ucrania
    "UKR": 1.0,   # Ucrania — guerra activa
    "RUS": 0.90,  # Rusia — actor principal
    "MDA": 0.60,  # Moldova — amenaza spillover
    "BLR": 0.55,  # Bielorrusia — regimen aliado Rusia
    "GEO": 0.58,  # Georgia — tension OTAN
    # Latinoamerica (empresas + diaspora)
    "VEN": 0.80,  # Venezuela — comunidad espanola + Repsol
    "MEX": 0.78,  # Mexico — BBVA, Telefonica, Iberdrola
    "COL": 0.70,  # Colombia — FARC residual
    "BRA": 0.68,  # Brasil — Telefonica
    "ARG": 0.65,  # Argentina — Repsol YPF
    "CUB": 0.62,  # Cuba — nexo politico
    "PER": 0.58,  # Peru — inestabilidad politica
    "ECU": 0.55,  # Ecuador — crimen organizado
    # Sahel (misiones militares espanolas)
    "MLI": 0.82,  # Mali — ex EUTM Mali
    "NER": 0.75,  # Niger — golpe estado 2023
    "TCD": 0.62,  # Chad — presencia francesa
    "BFA": 0.72,  # Burkina Faso — JNIM
    "MRT": 0.62,  # Mauritania — frontera Canarias
    "SEN": 0.58,  # Senegal — ruta migratoria
    # OTAN / flanco Este
    "TUR": 0.75,  # Turquia — OTAN + Siria
    # Asia conflictiva
    "MMR": 0.45,  # Myanmar — crisis humanitaria
    "PRK": 0.40,  # Corea Norte — proliferacion nuclear
}

# ---------------------------------------------------------------------------
# Tabla ISO3 -> codigo numerico (sin dependencia de pycountry)
# ---------------------------------------------------------------------------
ISO3_TO_NUMERIC: dict[str, int] = {
    "AFG": 4,   "ALB": 8,   "DZA": 12,  "AGO": 24,  "ARG": 32,
    "ARM": 51,  "AUS": 36,  "AUT": 40,  "AZE": 31,  "BHR": 48,
    "BGD": 50,  "BLR": 112, "BEL": 56,  "BLZ": 84,  "BEN": 204,
    "BOL": 68,  "BIH": 70,  "BWA": 72,  "BRA": 76,  "BRN": 96,
    "BGR": 100, "BFA": 854, "BDI": 108, "KHM": 116, "CMR": 120,
    "CAN": 124, "CAF": 140, "TCD": 148, "CHL": 152, "CHN": 156,
    "COL": 170, "COD": 180, "COG": 178, "CRI": 188, "HRV": 191,
    "CUB": 192, "CYP": 196, "CZE": 203, "DNK": 208, "DJI": 262,
    "DOM": 214, "ECU": 218, "EGY": 818, "SLV": 222, "ETH": 231,
    "FIN": 246, "FRA": 250, "GAB": 266, "DEU": 276, "GHA": 288,
    "GRC": 300, "GTM": 320, "GIN": 324, "GNB": 624, "HTI": 332,
    "HND": 340, "HUN": 348, "IND": 356, "IDN": 360, "IRN": 364,
    "IRQ": 368, "IRL": 372, "ISR": 376, "ITA": 380, "JAM": 388,
    "JPN": 392, "JOR": 400, "KAZ": 398, "KEN": 404, "PRK": 408,
    "KOR": 410, "XKX": 926, "KWT": 414, "KGZ": 417, "LAO": 418,
    "LBN": 422, "LBR": 430, "LBY": 434, "LTU": 440, "MKD": 807,
    "MDG": 450, "MWI": 454, "MYS": 458, "MLI": 466, "MRT": 478,
    "MEX": 484, "MDA": 498, "MNG": 496, "MNE": 499, "MAR": 504,
    "MOZ": 508, "MMR": 104, "NAM": 516, "NPL": 524, "NLD": 528,
    "NZL": 554, "NIC": 558, "NER": 562, "NGA": 566, "NOR": 578,
    "OMN": 512, "PAK": 586, "PAN": 591, "PNG": 598, "PRY": 600,
    "PER": 604, "PHL": 608, "POL": 616, "PRT": 620, "QAT": 634,
    "ROU": 642, "RUS": 643, "RWA": 646, "SAU": 682, "SEN": 686,
    "SRB": 688, "SLE": 694, "SOM": 706, "ZAF": 710, "SSD": 728,
    "ESP": 724, "LKA": 144, "SDN": 729, "SWE": 752, "CHE": 756,
    "SYR": 760, "TWN": 158, "TJK": 762, "TZA": 834, "THA": 764,
    "TLS": 626, "TGO": 768, "TTO": 780, "TUN": 788, "TUR": 792,
    "TKM": 795, "UGA": 800, "UKR": 804, "ARE": 784, "GBR": 826,
    "USA": 840, "UZB": 860, "VEN": 862, "VNM": 704, "YEM": 887,
    "ZMB": 894, "ZWE": 716, "GEO": 268, "BLR": 112,
}

# ---------------------------------------------------------------------------
# Tipos de evento ACLED -> peso para CII
# ---------------------------------------------------------------------------
PESO_TIPO_EVENTO: dict[str, float] = {
    "Battles": 1.0,
    "Explosions/Remote violence": 0.95,
    "Violence against civilians": 0.90,
    "Strategic developments": 0.70,
    "Riots": 0.40,
    "Protests": 0.20,
}


class ACLEDClient:
    """
    Cliente asincrono para la API ACLED v2 con OAuth Bearer token.

    Uso basico:
        client = ACLEDClient()
        async with client:
            df = await client.get_eventos(days_back=30, paises=["UKR","MAR"])
    """

    BASE_URL = "https://acleddata.com/api/acled/read"
    TOKEN_URL = "https://acleddata.com/api/acled/token"
    MAX_RETRIES = 3
    PAGE_SIZE = 500

    def __init__(
        self,
        email: str | None = None,
        api_key: str | None = None,
    ) -> None:
        self.email = email or os.getenv("ACLED_EMAIL", "")
        self.api_key = api_key or os.getenv("ACLED_API_KEY", "")
        self._token: str | None = None
        self._token_expiry: datetime | None = None
        self._session: Any = None

    async def __aenter__(self) -> "ACLEDClient":
        try:
            import httpx
            self._session = httpx.AsyncClient(timeout=30.0)
        except ImportError:
            logger.warning("httpx no instalado — ACLEDClient en modo degradado")
        return self

    async def __aexit__(self, *args: Any) -> None:
        if self._session:
            await self._session.aclose()

    # ------------------------------------------------------------------
    # Autenticacion OAuth v2
    # ------------------------------------------------------------------

    async def _obtener_token(self) -> str | None:
        """
        Obtiene un Bearer token OAuth v2.
        Cachea el token hasta 55 minutos (expira en 60 min por defecto).
        """
        ahora = datetime.now(timezone.utc)
        if self._token and self._token_expiry and ahora < self._token_expiry:
            return self._token

        if not self.email or not self.api_key:
            logger.warning("ACLED_EMAIL / ACLED_API_KEY no configurados")
            return None

        if not self._session:
            logger.warning("ACLEDClient no iniciado como context manager")
            return None

        payload = {"email": self.email, "key": self.api_key}
        try:
            resp = await self._session.post(self.TOKEN_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
            token = data.get("access_token") or data.get("token")
            if not token:
                logger.error("ACLED token response sin access_token: %s", data)
                return None
            self._token = token
            self._token_expiry = ahora + timedelta(minutes=55)
            logger.info("ACLED token obtenido correctamente")
            return token
        except Exception as exc:
            logger.error("ACLED _obtener_token error: %s", exc)
            return None

    def _headers(self) -> dict[str, str]:
        if self._token:
            return {"Authorization": f"Bearer {self._token}"}
        # Fallback: API key en header (compatibilidad)
        return {"X-API-KEY": self.api_key}

    # ------------------------------------------------------------------
    # Consultas principales
    # ------------------------------------------------------------------

    async def get_eventos(
        self,
        days_back: int = 30,
        paises: list[str] | None = None,
        tipos: list[str] | None = None,
    ) -> list[dict]:
        """
        Descarga eventos de los ultimos `days_back` dias.
        `paises` acepta codigos ISO3. Si None, descarga todos los paises
        de PAISES_INTERES_ESPANA con relevancia >= 0.50.
        """
        await self._obtener_token()
        if not self._session:
            logger.warning("Sin sesion httpx — retornando lista vacia")
            return []

        if paises is None:
            paises = [k for k, v in PAISES_INTERES_ESPANA.items() if v >= 0.50]

        since = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
        todos: list[dict] = []
        page = 1

        while True:
            params: dict[str, Any] = {
                "event_date": since,
                "event_date_where": ">=",
                "limit": self.PAGE_SIZE,
                "page": page,
                "fields": (
                    "data_id|event_date|event_type|sub_event_type|"
                    "actor1|actor2|country|iso3|latitude|longitude|"
                    "fatalities|notes|source|disorder_type"
                ),
                "format": "json",
            }
            if paises:
                iso_nums = [ISO3_TO_NUMERIC[p] for p in paises if p in ISO3_TO_NUMERIC]
                if iso_nums:
                    params["iso"] = "|".join(str(n) for n in iso_nums)
            if tipos:
                params["event_type"] = "|".join(tipos)

            resultado = await self._llamar_api(params)
            if resultado is None:
                break
            batch = resultado.get("data", [])
            if not batch:
                break
            todos.extend(batch)
            count = resultado.get("count", 0)
            if len(todos) >= count or len(batch) < self.PAGE_SIZE:
                break
            page += 1

        logger.info("ACLED: %d eventos descargados (dias_back=%d)", len(todos), days_back)
        return todos

    async def get_eventos_incremental(self, horas: int = 24) -> list[dict]:
        """Descarga solo eventos de las ultimas `horas` horas."""
        dias = max(1, math.ceil(horas / 24))
        return await self.get_eventos(days_back=dias)

    async def _llamar_api(
        self, params: dict[str, Any], intento: int = 1
    ) -> dict | None:
        """Ejecuta la llamada HTTP con reintento en 401."""
        try:
            resp = await self._session.get(
                self.BASE_URL,
                params=params,
                headers=self._headers(),
                timeout=45.0,
            )
            if resp.status_code == 401 and intento <= self.MAX_RETRIES:
                logger.warning("ACLED 401 — renovando token (intento %d)", intento)
                self._token = None
                await self._obtener_token()
                return await self._llamar_api(params, intento + 1)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            logger.error("ACLED API error (intento %d): %s", intento, exc)
            return None

    # ------------------------------------------------------------------
    # Normalizacion
    # ------------------------------------------------------------------

    def normalizar_evento(self, raw: dict) -> dict:
        """Convierte un registro ACLED crudo al esquema normalizado interno."""
        iso3 = str(raw.get("iso3", ""))[:3].upper()
        tipo_raw = str(raw.get("event_type", ""))
        relevancia = self._calcular_relevancia(iso3, tipo_raw, int(raw.get("fatalities") or 0))
        return {
            "acled_id":       int(raw.get("data_id") or 0),
            "pais":           iso3,
            "pais_nombre":    str(raw.get("country", ""))[:120],
            "fecha":          str(raw.get("event_date", "")),
            "tipo_evento":    tipo_raw[:100],
            "subtipo":        str(raw.get("sub_event_type", ""))[:100],
            "tipo_cameo":     self._tipo_a_cameo(tipo_raw),
            "actor1":         str(raw.get("actor1", ""))[:300],
            "actor2":         str(raw.get("actor2", ""))[:300],
            "latitud":        float(raw.get("latitude") or 0.0),
            "longitud":       float(raw.get("longitude") or 0.0),
            "fatalities":     int(raw.get("fatalities") or 0),
            "relevancia_es":  round(relevancia, 4),
            "notas":          str(raw.get("notes", ""))[:1000],
            "fuente":         "ACLED",
        }

    def _calcular_relevancia(self, iso3: str, tipo: str, fatalities: int) -> float:
        base = PAISES_INTERES_ESPANA.get(iso3, 0.08)
        boost = PESO_TIPO_EVENTO.get(tipo, 0.80)
        if fatalities > 100:
            boost *= 1.30
        elif fatalities > 20:
            boost *= 1.15
        return min(1.0, base * boost)

    @staticmethod
    def _tipo_a_cameo(tipo_acled: str) -> str:
        MAPA = {
            "Battles":                      "FIGHT",
            "Explosions/Remote violence":   "FIGHT",
            "Violence against civilians":   "VIOLENCE_CIVILES",
            "Riots":                        "RIOT",
            "Protests":                     "PROTEST",
            "Strategic developments":       "STRATEGIC",
        }
        return MAPA.get(tipo_acled, "UNKNOWN")

    # ------------------------------------------------------------------
    # CII (Conflict Intensity Index)
    # ------------------------------------------------------------------

    def calcular_conflict_intensity(self, eventos: list[dict]) -> dict[str, float]:
        """
        Calcula el CII por pais a partir de una lista de eventos normalizados.
        Formula: sqrt( sum(n_eventos * peso_tipo) * (sum_fatalities + 1) )
        Retorna {iso3: cii_score}.
        """
        acumulado: dict[str, dict] = {}
        for ev in eventos:
            pais = ev.get("pais", "")
            if not pais:
                continue
            tipo_cameo = ev.get("tipo_cameo", "UNKNOWN")
            peso = {
                "FIGHT":           1.0,
                "VIOLENCE_CIVILES": 0.9,
                "RIOT":            0.4,
                "PROTEST":         0.2,
                "STRATEGIC":       0.5,
                "UNKNOWN":         0.3,
            }.get(tipo_cameo, 0.3)
            fat = int(ev.get("fatalities") or 0)
            if pais not in acumulado:
                acumulado[pais] = {"suma_pesos": 0.0, "fatalities": 0}
            acumulado[pais]["suma_pesos"] += peso
            acumulado[pais]["fatalities"] += fat

        return {
            pais: round(math.sqrt(datos["suma_pesos"] * (datos["fatalities"] + 1)), 3)
            for pais, datos in acumulado.items()
        }

    # ------------------------------------------------------------------
    # Persistencia (sincrona — para uso desde pipelines)
    # ------------------------------------------------------------------

    def guardar_eventos(
        self,
        eventos: list[dict],
        conn: Any,
        tabla: str = "eventosacled",
    ) -> int:
        """
        Inserta eventos normalizados en PostgreSQL (ON CONFLICT DO NOTHING).
        `conn` es una conexion psycopg o SQLAlchemy raw connection.
        Retorna el numero de filas insertadas.
        """
        if not eventos:
            return 0
        try:
            import pandas as pd
            df = pd.DataFrame([self.normalizar_evento(e) for e in eventos])
            df.to_sql(
                tabla,
                conn,
                if_exists="append",
                index=False,
                method="multi",
            )
            logger.info("ACLED: %d eventos guardados en '%s'", len(df), tabla)
            return len(df)
        except Exception as exc:
            logger.error("ACLED guardar_eventos error: %s", exc)
            return 0

    def actualizar_scores_riesgo(
        self,
        cii_por_pais: dict[str, float],
        conn: Any,
    ) -> None:
        """
        Actualiza la columna score_conflicto en la tabla riesgo_pais.
        """
        if not cii_por_pais:
            return
        try:
            cursor = conn.cursor()
            for iso3, cii in cii_por_pais.items():
                # Normalizar CII a 0-100 asumiendo max practico de ~500
                score = min(100.0, (cii / 500.0) * 100.0)
                cursor.execute(
                    """
                    INSERT INTO riesgo_pais (pais, score_conflicto, actualizado_en)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (pais) DO UPDATE
                       SET score_conflicto = EXCLUDED.score_conflicto,
                           actualizado_en  = NOW()
                    """,
                    (iso3, round(score, 2)),
                )
            conn.commit()
            logger.info("ACLED: scores riesgo actualizados para %d paises", len(cii_por_pais))
        except Exception as exc:
            logger.error("ACLED actualizar_scores_riesgo error: %s", exc)
