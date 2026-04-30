"""
Pipeline Geopolitico v2 — Orquestador ETL avanzado.
Incluye:
  - UCDPClient (GW codes, free API)
  - GPSJamClient (interferencia GPS H3)
  - OCHAHAPIClient (presencia humanitaria)
  - RiskScoringEngine (fusion de fuentes)
  - PipelineGeopolitico (ingesta paralela + scoring)
  - registrar_jobs_geopolitico (APScheduler)

Uso:
    python -m etl.pipelines.pipeline_geopolitico --run-now
    python -m etl.pipelines.pipeline_geopolitico --scheduler
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[2]
_DATA_GEO = _ROOT / "data" / "cache" / "geopolitico"
_DATA_GEO.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Relevancia de paises para Espana (igual que en acledclient, duplicado
# para evitar importacion circular en el pipeline)
# ---------------------------------------------------------------------------
RELEVANCIA_ESPANA: dict[str, float] = {
    "DZA": 1.0,  "MAR": 1.0,  "UKR": 1.0,
    "LBY": 0.90, "RUS": 0.90,
    "IRN": 0.70, "PSE": 0.80, "ISR": 0.78, "SYR": 0.72, "LBN": 0.72,
    "VEN": 0.80, "MEX": 0.78, "MLI": 0.82, "NER": 0.75, "BFA": 0.72,
    "NGA": 0.70, "IRQ": 0.65, "AGO": 0.65, "SAU": 0.65,
    "COL": 0.70, "BRA": 0.68, "ARG": 0.65, "TUR": 0.75, "MRT": 0.62,
    "TUN": 0.68, "EGY": 0.65, "TCD": 0.62, "MDA": 0.60, "BLR": 0.55,
    "GEO": 0.58, "CUB": 0.62, "PER": 0.58, "ECU": 0.55,
}

# ---------------------------------------------------------------------------
# GW (Gleditsch-Ward) -> ISO3  para UCDP
# ---------------------------------------------------------------------------
GW_TO_ISO3: dict[int, str] = {
    2: "USA",  20: "CAN", 70: "MEX", 90: "GTM", 91: "BLZ", 92: "HON",
    93: "SLV", 94: "NIC", 95: "CRI", 101: "COL", 110: "VEN", 130: "ECU",
    135: "PER", 140: "BRA", 145: "BOL", 150: "PRY", 155: "CHL", 160: "ARG",
    200: "GBR", 205: "IRL", 210: "NLD", 211: "BEL", 212: "LUX", 220: "FRA",
    225: "ESP", 230: "PRT", 235: "AND", 255: "DEU", 265: "DEU", 290: "POL",
    305: "AUT", 310: "HUN", 315: "CZE", 325: "ITA", 339: "ALB", 340: "SRB",
    344: "HRV", 349: "SVN", 350: "GRC", 352: "CYP", 355: "BGR", 360: "ROU",
    365: "RUS", 366: "EST", 367: "LVA", 368: "LTU", 370: "BLR", 371: "UKR",
    372: "MDA", 375: "FIN", 380: "SWE", 385: "NOR", 390: "DNK",
    395: "ISL", 402: "CAP", 404: "GNB", 411: "SEN", 420: "GMB",
    432: "MLI", 433: "SEN", 434: "MRT", 435: "MRT", 436: "NER",
    437: "TCD", 438: "TCD", 439: "NGA", 450: "CMR", 451: "CAF",
    452: "COD", 461: "COG", 471: "GAB", 475: "NGA", 481: "AGO",
    483: "ZWE", 484: "ZMB", 490: "MOZ", 500: "KEN", 501: "UGA",
    510: "TZA", 516: "ZAF", 520: "ETH", 522: "ERI", 530: "DJI",
    531: "SOM", 540: "MDG", 541: "MUS", 551: "ZWE", 552: "BW",
    560: "ZAF", 571: "ZAF", 600: "MAR", 615: "DZA", 616: "TUN",
    620: "LBY", 625: "SDN", 626: "SSD", 630: "IRN", 640: "TUR",
    645: "IRQ", 651: "EGY", 652: "SYR", 655: "LBN", 660: "JOR",
    663: "ISR", 665: "PSE", 670: "SAU", 678: "YEM", 694: "KWT",
    696: "BHR", 698: "QAT", 700: "AFG", 701: "KGZ", 702: "TJK",
    703: "TKM", 704: "UZB", 705: "KAZ", 710: "CHN", 713: "TWN",
    731: "PRK", 732: "KOR", 740: "JPN", 750: "IND", 760: "PAK",
    770: "BGD", 775: "MMR", 780: "LKA", 800: "THA", 816: "VNM",
    820: "MYS", 830: "SGP", 840: "PHL", 850: "IDN", 900: "AUS",
    920: "NZL",
}


# ===========================================================================
# UCDPClient
# ===========================================================================

class UCDPClient:
    """
    Cliente para UCDP GED Candidate API.
    API publica y gratuita: https://ucdpapi.pcr.uu.se/api
    Los IDs se desplazan +900_000_000 para evitar colision con ACLED.
    """

    BASE_URL = "https://ucdpapi.pcr.uu.se/api/gedevents/23.1"
    ACLED_OFFSET = 900_000_000

    def __init__(self) -> None:
        self._session: Any = None

    async def __aenter__(self) -> "UCDPClient":
        try:
            import httpx
            self._session = httpx.AsyncClient(timeout=30.0)
        except ImportError:
            logger.warning("httpx no instalado — UCDPClient degradado")
        return self

    async def __aexit__(self, *args: Any) -> None:
        if self._session:
            await self._session.aclose()

    async def get_eventos(
        self,
        year: int | None = None,
        paises_gw: list[int] | None = None,
    ) -> list[dict]:
        """
        Descarga eventos GED del ultimo anyo disponible.
        """
        if not self._session:
            return []

        year = year or datetime.now().year - 1
        params: dict[str, Any] = {
            "Year": year,
            "pagesize": 1000,
            "page": 1,
        }
        if paises_gw:
            params["GWNoloc"] = "|".join(str(c) for c in paises_gw[:20])

        todos: list[dict] = []
        while True:
            try:
                resp = await self._session.get(self.BASE_URL, params=params)
                resp.raise_for_status()
                datos = resp.json()
            except Exception as exc:
                logger.debug("UCDP API error: %s", exc)
                break

            batch = datos.get("Result", [])
            if not batch:
                break
            todos.extend(batch)
            if len(batch) < 1000:
                break
            params["page"] += 1

        logger.info("UCDP: %d eventos descargados (year=%d)", len(todos), year)
        return todos

    def normalizar_evento_ucdp(self, raw: dict) -> dict:
        """Convierte evento UCDP GED al esquema normalizado interno."""
        gw = int(raw.get("GWNoloc") or 0)
        iso3 = GW_TO_ISO3.get(gw, "XXX")
        tipo_violencia = int(raw.get("type_of_violence") or 0)
        tipo_cameo = {1: "FIGHT", 2: "FIGHT", 3: "VIOLENCE_CIVILES"}.get(tipo_violencia, "UNKNOWN")

        return {
            "acled_id":    int(raw.get("id") or 0) + self.ACLED_OFFSET,
            "pais":        iso3,
            "pais_nombre": str(raw.get("country", ""))[:120],
            "fecha":       str(raw.get("date_start", ""))[:10],
            "tipo_evento": str(raw.get("type_of_violence_label", ""))[:100],
            "subtipo":     "",
            "tipo_cameo":  tipo_cameo,
            "actor1":      str(raw.get("side_a", ""))[:300],
            "actor2":      str(raw.get("side_b", ""))[:300],
            "latitud":     float(raw.get("latitude") or 0.0),
            "longitud":    float(raw.get("longitude") or 0.0),
            "fatalities":  int(raw.get("deaths_a", 0) or 0) + int(raw.get("deaths_b", 0) or 0),
            "relevancia_es": RELEVANCIA_ESPANA.get(iso3, 0.08),
            "notas":       str(raw.get("source_article", ""))[:1000],
            "fuente":      "UCDP",
        }


# ===========================================================================
# GPSJamClient
# ===========================================================================

class GPSJamClient:
    """
    Cliente para GPSJam.org — datos de interferencia GPS.
    Formato: CSV diario con hexagonos H3 (resolucion 4) y % de interferencia.
    >10% = nivel "alto" (proxy de actividad militar).
    """

    MANIFEST_URL = "https://gpsjam.org/data/manifest.json"
    BASE_DATA_URL = "https://gpsjam.org/data"

    # Bounding boxes por pais (lat_min, lat_max, lon_min, lon_max)
    BBOX_PAISES: dict[str, tuple[float, float, float, float]] = {
        "UKR": (44.0, 52.5, 22.0, 41.0),
        "RUS": (41.0, 82.0, 19.0, 180.0),
        "ISR": (29.0, 34.0, 33.0, 36.0),
        "PSE": (31.0, 32.5, 34.2, 35.6),
        "LBN": (33.0, 34.7, 35.0, 36.7),
        "SYR": (32.3, 37.3, 35.6, 42.4),
        "IRQ": (29.0, 37.4, 38.7, 48.6),
        "IRN": (25.0, 39.8, 44.0, 63.4),
        "YEM": (12.0, 19.0, 42.6, 55.0),
        "MLI": (10.2, 25.0, -12.2, 4.2),
        "NER": (11.7, 23.5, 0.2, 16.0),
        "BFA": (9.4, 15.1, -5.5, 2.4),
        "LBY": (19.5, 33.2, 9.3, 25.2),
        "DZA": (18.9, 37.1, -8.7, 12.0),
        "MAR": (27.7, 35.9, -13.2, -1.0),
        "TUR": (35.8, 42.1, 25.7, 44.8),
        "GEO": (41.0, 43.6, 40.0, 46.7),
        "MDA": (45.4, 48.5, 26.6, 30.1),
    }

    def __init__(self) -> None:
        self._session: Any = None

    async def __aenter__(self) -> "GPSJamClient":
        try:
            import httpx
            self._session = httpx.AsyncClient(timeout=30.0)
        except ImportError:
            logger.warning("httpx no instalado — GPSJamClient degradado")
        return self

    async def __aexit__(self, *args: Any) -> None:
        if self._session:
            await self._session.aclose()

    async def get_jamming_actual(self, fecha: str | None = None) -> list[dict]:
        """
        Descarga los datos del dia mas reciente disponible en GPSJam.
        Retorna lista de {hex_id, pct_interferencia, lat, lon}.
        """
        if not self._session:
            return _DEMO_JAMMING

        # Obtener manifest
        try:
            resp = await self._session.get(self.MANIFEST_URL)
            resp.raise_for_status()
            manifest = resp.json()
            fechas = sorted(manifest.get("dates", []), reverse=True)
            fecha_uso = fecha or (fechas[0] if fechas else None)
        except Exception as exc:
            logger.debug("GPSJam manifest error: %s", exc)
            return _DEMO_JAMMING

        if not fecha_uso:
            return _DEMO_JAMMING

        url_csv = f"{self.BASE_DATA_URL}/{fecha_uso}.csv"
        try:
            resp = await self._session.get(url_csv)
            resp.raise_for_status()
            return self._parsear_csv(resp.text, fecha_uso)
        except Exception as exc:
            logger.debug("GPSJam CSV error %s: %s", url_csv, exc)
            return _DEMO_JAMMING

    @staticmethod
    def _parsear_csv(texto: str, fecha: str) -> list[dict]:
        """Parsea el CSV de GPSJam. Formato: hex_id,pct_interferencia"""
        import csv
        resultado = []
        reader = csv.reader(texto.splitlines())
        for i, fila in enumerate(reader):
            if i == 0:  # header
                continue
            if len(fila) < 2:
                continue
            try:
                hex_id = fila[0].strip()
                pct = float(fila[1]) if fila[1] else 0.0
                resultado.append({
                    "hex_id":          hex_id,
                    "pct_interferencia": round(pct, 4),
                    "nivel":           "alto" if pct > 0.10 else ("medio" if pct > 0.05 else "bajo"),
                    "fecha":           fecha,
                })
            except (ValueError, IndexError):
                continue
        return resultado

    def calcular_score_jamming_por_pais(self, hexagons: list[dict]) -> dict[str, float]:
        """
        Asigna hexagonos a paises usando bounding boxes.
        Retorna {iso3: score_jamming_0_100}.
        Sin dependencia de geopandas.
        """
        try:
            import h3
            return self._calcular_con_h3(hexagons, h3)
        except ImportError:
            logger.debug("h3 no instalado — usando heuristica de bbox")
            return self._calcular_sin_h3(hexagons)

    def _calcular_con_h3(self, hexagons: list[dict], h3: Any) -> dict[str, float]:
        acumulado: dict[str, list[float]] = {}
        for hex_rec in hexagons:
            hex_id = hex_rec.get("hex_id", "")
            pct = float(hex_rec.get("pct_interferencia", 0.0))
            try:
                lat, lon = h3.h3_to_geo(hex_id)
            except Exception:
                continue
            for pais, (lat_min, lat_max, lon_min, lon_max) in self.BBOX_PAISES.items():
                if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
                    acumulado.setdefault(pais, []).append(pct)
                    break

        return {
            pais: round(min(100.0, sum(vals) / len(vals) * 1000), 2)
            for pais, vals in acumulado.items()
            if vals
        }

    def _calcular_sin_h3(self, hexagons: list[dict]) -> dict[str, float]:
        """Heuristica basada en lat/lon directos si los hay."""
        acumulado: dict[str, list[float]] = {}
        for hex_rec in hexagons:
            lat = float(hex_rec.get("lat", 0.0) or 0.0)
            lon = float(hex_rec.get("lon", 0.0) or 0.0)
            pct = float(hex_rec.get("pct_interferencia", 0.0))
            for pais, (lat_min, lat_max, lon_min, lon_max) in self.BBOX_PAISES.items():
                if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
                    acumulado.setdefault(pais, []).append(pct)
                    break
        return {
            pais: round(min(100.0, sum(vals) / len(vals) * 1000), 2)
            for pais, vals in acumulado.items()
            if vals
        }


# ===========================================================================
# OCHAHAPIClient
# ===========================================================================

class OCHAHAPIClient:
    """
    Cliente para OCHA HDX HAPI.
    Usa la presencia de organizaciones humanitarias como proxy de crisis.
    """

    BASE_URL = "https://hapi.humdata.org/api/v1"

    def __init__(self) -> None:
        self._session: Any = None

    async def __aenter__(self) -> "OCHAHAPIClient":
        try:
            import httpx
            self._session = httpx.AsyncClient(timeout=20.0)
        except ImportError:
            pass
        return self

    async def __aexit__(self, *args: Any) -> None:
        if self._session:
            await self._session.aclose()

    async def get_presencia_operacional(
        self, paises: list[str] | None = None
    ) -> dict[str, int]:
        """
        Retorna {iso3: n_organizaciones} como proxy de intensidad de crisis.
        """
        if not self._session:
            return {}

        if paises is None:
            paises = list(RELEVANCIA_ESPANA.keys())

        resultados: dict[str, int] = {}
        for iso3 in paises:
            try:
                resp = await self._session.get(
                    f"{self.BASE_URL}/coordination-context/operational-presence",
                    params={"location_code": iso3, "output_format": "json"},
                    timeout=10.0,
                )
                if resp.status_code == 200:
                    datos = resp.json()
                    orgs = datos.get("data", [])
                    resultados[iso3] = len(orgs)
            except Exception as exc:
                logger.debug("OCHA HAPI %s: %s", iso3, exc)

        return resultados


# ===========================================================================
# RiskScoringEngine (simple, sin WGI/IMF — esos van en agents/geopolitico/)
# ===========================================================================

class RiskScoringEngine:
    """
    Fusion simple de fuentes en un score_total 0-100.
    PESOS: conflicto 40%, gdelt 25%, jamming 20%, ocha 15%
    Multiplicador de relevancia para Espana: [0.55, 1.05]
    """

    PESOS: dict[str, float] = {
        "conflicto": 0.40,
        "gdelt":     0.25,
        "jamming":   0.20,
        "ocha":      0.15,
    }
    OCHA_MAX = 50  # organizaciones — proxy de crisis maxima

    def calcular(
        self,
        pais: str,
        cii: float,
        tono_gdelt: float,
        jamming_score: float,
        ocha_orgs: int,
    ) -> dict[str, Any]:
        """
        Calcula el score de riesgo para un pais.
        Retorna dict con score_total y sub-scores.
        """
        # Normalizar CII a 0-100 (max practico ~500)
        score_conflicto = min(100.0, (cii / 500.0) * 100.0)

        # Tono GDELT: [-30, +30] -> [0, 100] invertido (mas negativo = mas riesgo)
        score_gdelt = min(100.0, max(0.0, ((-tono_gdelt + 30.0) / 60.0) * 100.0))

        # Jamming ya en [0, 100]
        score_jamming = min(100.0, max(0.0, jamming_score))

        # OCHA: mas organizaciones = mas crisis
        score_ocha = min(100.0, (ocha_orgs / self.OCHA_MAX) * 100.0)

        score_raw = (
            score_conflicto * self.PESOS["conflicto"] +
            score_gdelt     * self.PESOS["gdelt"] +
            score_jamming   * self.PESOS["jamming"] +
            score_ocha      * self.PESOS["ocha"]
        )

        # Multiplicador de interes para Espana
        interes = RELEVANCIA_ESPANA.get(pais, 0.08)
        score_total = score_raw * (0.5 + interes * 0.55)
        score_total = min(100.0, max(0.0, score_total))

        return {
            "pais":            pais,
            "score_total":     round(score_total, 2),
            "score_conflicto": round(score_conflicto, 2),
            "score_gdelt":     round(score_gdelt, 2),
            "score_jamming":   round(score_jamming, 2),
            "score_ocha":      round(score_ocha, 2),
            "cii":             round(cii, 3),
            "tono_gdelt":      round(tono_gdelt, 4),
            "nivel":           self._clasificar(score_total),
            "relevancia_es":   interes,
        }

    @staticmethod
    def _clasificar(score: float) -> str:
        if score >= 80:
            return "CRITICO"
        if score >= 65:
            return "MUY_ALTO"
        if score >= 50:
            return "ALTO"
        if score >= 30:
            return "MODERADO"
        return "BAJO"


# ===========================================================================
# PipelineGeopolitico
# ===========================================================================

class PipelineGeopolitico:
    """
    Orquestador principal del pipeline geopolitico v2.
    """

    def __init__(self, conn: Any = None) -> None:
        self.conn = conn
        self._scorer = RiskScoringEngine()

    async def ejecutar_completo(self) -> dict[str, Any]:
        """
        Pipeline completo: UCDP + ACLED + GDELT + GPSJam en paralelo,
        luego OCHA, luego scoring.
        """
        inicio = datetime.now(timezone.utc)
        resultado: dict[str, Any] = {
            "inicio": inicio.isoformat(),
            "eventos_acled": 0,
            "eventos_ucdp": 0,
            "articulos_gdelt": 0,
            "hexs_jamming": 0,
            "paises_con_ocha": 0,
            "paises_scored": 0,
            "errores": [],
        }

        # -- Ingesta paralela --------------------------------------------------
        eventos_acled: list[dict] = []
        eventos_ucdp: list[dict] = []
        articulos_gdelt: list[dict] = []
        hexs_jamming: list[dict] = []

        async def _acled() -> None:
            try:
                from etl.sources.acled import ACLEDClient
                async with ACLEDClient() as c:
                    raw = await c.get_eventos(days_back=30)
                    eventos_acled.extend(raw)
                    resultado["eventos_acled"] = len(raw)
            except Exception as exc:
                logger.warning("Pipeline ACLED error: %s", exc)
                resultado["errores"].append(f"ACLED: {exc}")

        async def _ucdp() -> None:
            try:
                async with UCDPClient() as c:
                    raw = await c.get_eventos()
                    for ev in raw:
                        eventos_ucdp.append(c.normalizar_evento_ucdp(ev))
                    resultado["eventos_ucdp"] = len(raw)
            except Exception as exc:
                logger.warning("Pipeline UCDP error: %s", exc)
                resultado["errores"].append(f"UCDP: {exc}")

        async def _gdelt() -> None:
            try:
                from etl.sources.gdelt import GDELTClient
                async with GDELTClient() as c:
                    arts = await c.buscar_todas_queries_espana(dias=7)
                    articulos_gdelt.extend(arts)
                    resultado["articulos_gdelt"] = len(arts)
            except Exception as exc:
                logger.warning("Pipeline GDELT error: %s", exc)
                resultado["errores"].append(f"GDELT: {exc}")

        async def _gpsjam() -> None:
            try:
                async with GPSJamClient() as c:
                    hexs = await c.get_jamming_actual()
                    hexs_jamming.extend(hexs)
                    resultado["hexs_jamming"] = len(hexs)
            except Exception as exc:
                logger.warning("Pipeline GPSJam error: %s", exc)
                resultado["errores"].append(f"GPSJam: {exc}")

        await asyncio.gather(_acled(), _ucdp(), _gdelt(), _gpsjam())

        # -- OCHA (secuencial — rate limit) -----------------------------------
        presencia_ocha: dict[str, int] = {}
        try:
            async with OCHAHAPIClient() as c:
                presencia_ocha = await c.get_presencia_operacional()
                resultado["paises_con_ocha"] = len(presencia_ocha)
        except Exception as exc:
            logger.warning("Pipeline OCHA error: %s", exc)
            resultado["errores"].append(f"OCHA: {exc}")

        # -- Transformacion ---------------------------------------------------
        from etl.transformers.geopolitico import TransformerGeopolitico
        trans = TransformerGeopolitico()

        todos_eventos = eventos_acled + eventos_ucdp
        if todos_eventos:
            from etl.sources.acled import ACLEDClient
            cl = ACLEDClient()
            # Normalizar ACLED raw si vienen sin tipo_cameo
            norm_acled = [cl.normalizar_evento(e) for e in eventos_acled]
            todos_norm = norm_acled + eventos_ucdp
            todos_norm = trans.deduplicar_eventos(todos_norm)
            cii_por_pais = trans.calcular_cii_por_pais(todos_norm, ventana_dias=30)
        else:
            cii_por_pais = {}

        # Tono GDELT global
        from etl.sources.gdelt import GDELTClient
        _gc = GDELTClient()
        tono_global = _gc.calcular_tono_medio(articulos_gdelt)

        # Jamming por pais
        gpsjam_client = GPSJamClient()
        jamming_por_pais = gpsjam_client.calcular_score_jamming_por_pais(hexs_jamming)

        # -- Scoring ----------------------------------------------------------
        scores: list[dict] = []
        paises_interes = set(RELEVANCIA_ESPANA.keys())
        paises_datos = set(cii_por_pais.keys()) | set(jamming_por_pais.keys()) | set(presencia_ocha.keys())
        paises_a_scorear = paises_interes | paises_datos

        for pais in paises_a_scorear:
            score_dict = self._scorer.calcular(
                pais=pais,
                cii=cii_por_pais.get(pais, 0.0),
                tono_gdelt=tono_global,
                jamming_score=jamming_por_pais.get(pais, 0.0),
                ocha_orgs=presencia_ocha.get(pais, 0),
            )
            scores.append(score_dict)

        resultado["paises_scored"] = len(scores)

        # -- Guardar en cache local -------------------------------------------
        cache_file = _DATA_GEO / "scores_ultimo.json"
        try:
            cache_file.write_text(
                json.dumps({
                    "generado": inicio.isoformat(),
                    "scores": scores,
                    "tono_global": tono_global,
                }, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            logger.info("Pipeline geo: scores guardados en %s", cache_file)
        except Exception as exc:
            logger.warning("No se pudo guardar cache scores: %s", exc)

        # -- Persistir en DB si hay conexion ----------------------------------
        if self.conn and scores:
            self._guardar_scores_db(scores)

        resultado["fin"] = datetime.now(timezone.utc).isoformat()
        logger.info(
            "Pipeline geopolitico completo: %d paises scored, %d errores",
            len(scores), len(resultado["errores"]),
        )
        return resultado

    async def ejecutar_incremental(self) -> dict[str, Any]:
        """
        Ingesta rapida (solo GDELT + GPSJam) para ciclos de 6 horas.
        """
        inicio = datetime.now(timezone.utc)
        resultado: dict[str, Any] = {
            "modo": "incremental",
            "inicio": inicio.isoformat(),
            "articulos_gdelt": 0,
            "hexs_jamming": 0,
        }

        async def _gdelt() -> None:
            try:
                from etl.sources.gdelt import GDELTClient
                async with GDELTClient() as c:
                    arts = await c.buscar_todas_queries_espana(dias=1)
                    resultado["articulos_gdelt"] = len(arts)
            except Exception as exc:
                logger.warning("Incremental GDELT error: %s", exc)

        async def _gpsjam() -> None:
            try:
                async with GPSJamClient() as c:
                    hexs = await c.get_jamming_actual()
                    resultado["hexs_jamming"] = len(hexs)
            except Exception as exc:
                logger.warning("Incremental GPSJam error: %s", exc)

        await asyncio.gather(_gdelt(), _gpsjam())
        resultado["fin"] = datetime.now(timezone.utc).isoformat()
        return resultado

    def _guardar_scores_db(self, scores: list[dict]) -> None:
        """Upsert de scores en la tabla riesgo_pais."""
        try:
            cursor = self.conn.cursor()
            for s in scores:
                cursor.execute(
                    """
                    INSERT INTO riesgo_pais
                        (pais, score_total, score_conflicto, nivel, cii, actualizado_en)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (pais) DO UPDATE SET
                        score_total     = EXCLUDED.score_total,
                        score_conflicto = EXCLUDED.score_conflicto,
                        nivel           = EXCLUDED.nivel,
                        cii             = EXCLUDED.cii,
                        actualizado_en  = NOW()
                    """,
                    (s["pais"], s["score_total"], s["score_conflicto"], s["nivel"], s["cii"]),
                )
            self.conn.commit()
            logger.info("Pipeline geo: %d scores guardados en DB", len(scores))
        except Exception as exc:
            logger.error("Pipeline geo guardar DB error: %s", exc)


# ---------------------------------------------------------------------------
# APScheduler jobs
# ---------------------------------------------------------------------------

def registrar_jobs_geopolitico(scheduler: Any) -> None:
    """
    Registra los jobs del pipeline geopolitico en un APScheduler.
    scheduler debe ser una instancia de BackgroundScheduler.
    """
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger

    def _run_completo() -> None:
        asyncio.run(PipelineGeopolitico().ejecutar_completo())

    def _run_incremental() -> None:
        asyncio.run(PipelineGeopolitico().ejecutar_incremental())

    # Pipeline completo: todos los dias a las 06:00 UTC
    scheduler.add_job(
        _run_completo,
        trigger=CronTrigger(hour=6, minute=0, timezone="UTC"),
        id="geo_pipeline_completo",
        replace_existing=True,
    )

    # Pipeline incremental: cada 6 horas
    scheduler.add_job(
        _run_incremental,
        trigger=IntervalTrigger(hours=6),
        id="geo_pipeline_incremental",
        replace_existing=True,
    )

    logger.info("Jobs geopolitico registrados: completo@06:00UTC + incremental/6h")


# ---------------------------------------------------------------------------
# Demo jamming data (cuando GPSJam no responde)
# ---------------------------------------------------------------------------
_DEMO_JAMMING: list[dict] = [
    {"hex_id": "84390c5ffffffff", "pct_interferencia": 0.42, "nivel": "alto", "fecha": "demo", "lat": 48.5, "lon": 35.0},   # UKR
    {"hex_id": "843ec2dffffffff", "pct_interferencia": 0.35, "nivel": "alto", "fecha": "demo", "lat": 31.5, "lon": 34.8},   # ISR
    {"hex_id": "8444d97ffffffff", "pct_interferencia": 0.28, "nivel": "alto", "fecha": "demo", "lat": 33.7, "lon": 36.2},   # LBN/SYR
    {"hex_id": "8448927ffffffff", "pct_interferencia": 0.18, "nivel": "alto", "fecha": "demo", "lat": 37.0, "lon": 40.0},   # TUR
    {"hex_id": "844c0cbffffffff", "pct_interferencia": 0.12, "nivel": "alto", "fecha": "demo", "lat": 42.3, "lon": 43.5},   # GEO
]


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    if "--run-now" in sys.argv:
        resultado = asyncio.run(PipelineGeopolitico().ejecutar_completo())
        print(json.dumps(resultado, indent=2, ensure_ascii=False))
    elif "--incremental" in sys.argv:
        resultado = asyncio.run(PipelineGeopolitico().ejecutar_incremental())
        print(json.dumps(resultado, indent=2, ensure_ascii=False))
    elif "--scheduler" in sys.argv:
        from apscheduler.schedulers.blocking import BlockingScheduler
        sched = BlockingScheduler()
        registrar_jobs_geopolitico(sched)
        try:
            sched.start()
        except (KeyboardInterrupt, SystemExit):
            pass
    else:
        print("Uso: --run-now | --incremental | --scheduler")
