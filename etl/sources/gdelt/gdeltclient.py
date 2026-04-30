"""
GDELT Client v2 — Global Database of Events, Language, and Tone
Tres modos de acceso:
  1. DOC API   — articulos en tiempo real (gdeltdoc o HTTP directo)
  2. GKG master files — tono real del Global Knowledge Graph (Polars)
  3. Timeline tone API — serie temporal de tono por query

Sin registro requerido. Limite de cortesia: 3 queries paralelas (Semaphore).
"""
from __future__ import annotations

import asyncio
import csv
import hashlib
import io
import logging
import zipfile
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Queries estrategicas sobre Espana
# ---------------------------------------------------------------------------
QUERIES_ESPANA: dict[str, str] = {
    "espana_geopolitica":    "Spain OR Espana geopolitics international",
    "espana_energia":        "Spain energy gas Algeria pipeline",
    "espana_otan":           "Spain NATO OTAN defense military",
    "espana_marruecos":      "Spain Morocco Marruecos migration ceuta melilla",
    "espana_ucrania":        "Spain Ukraine war weapons support",
    "espana_sahel":          "Spain Sahel Mali Niger security mission",
    "espana_latinoamerica":  "Spain Venezuela Colombia Mexico investment",
    "espana_mediterraneo":   "Spain Mediterranean security naval",
    "espana_ibex_geo":       "Repsol Iberdrola BBVA Telefonica geopolitics",
}

# ---------------------------------------------------------------------------
# Temas CAMEO de interes para Espana
# ---------------------------------------------------------------------------
TEMAS_INTERES_ESPANA: list[str] = [
    "ENERGY",
    "MILITARY",
    "MIGRATION",
    "ECON_BANKRUPTCY",
    "SECURITY_SERVICES",
    "TERROR",
    "WEAPON",
    "CEASEFIRE",
    "SANCTIONS",
    "CLIMATE_CHANGE",
    "HUMAN_RIGHTS",
    "POLITICAL_OPPOSITION",
    "ELECTIONS",
]

TONO_ALERTA_THRESHOLD = -5.0  # Tono GKG por debajo de este valor = alerta

# Semaforo para limitar concurrencia (cortesia con la API publica)
_semaphore: asyncio.Semaphore | None = None


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(3)
    return _semaphore


class GDELTClient:
    """
    Cliente asincrono para GDELT 2.0.

    Uso:
        client = GDELTClient()
        async with client:
            articulos = await client.buscar_articulos("Spain geopolitics", dias=7)
            tono_df   = await client.get_tono_timeline("Spain NATO", dias=30)
    """

    DOC_API   = "https://api.gdeltproject.org/api/v2/doc/doc"
    GKG_MASTER = "http://data.gdeltproject.org/gdeltv2/masterfilelist-translation.txt"
    TIMELINE_API = "https://api.gdeltproject.org/api/v2/timeline/timeline"

    def __init__(self) -> None:
        self._session: Any = None

    async def __aenter__(self) -> "GDELTClient":
        try:
            import httpx
            self._session = httpx.AsyncClient(
                timeout=30.0,
                follow_redirects=True,
            )
        except ImportError:
            logger.warning("httpx no instalado — GDELTClient degradado")
        return self

    async def __aexit__(self, *args: Any) -> None:
        if self._session:
            await self._session.aclose()

    # ------------------------------------------------------------------
    # Modo 1: DOC API — articulos recientes
    # ------------------------------------------------------------------

    async def buscar_articulos(
        self,
        query: str,
        dias: int = 7,
        max_results: int = 25,
    ) -> list[dict]:
        """
        Busca articulos recientes con la DOC API de GDELT.
        Retorna lista de dicts con titulo, url, dominio, fecha, tono estimado.
        """
        if not self._session:
            return []

        async with _get_semaphore():
            params = {
                "query":      query,
                "mode":       "artlist",
                "maxrecords": max_results,
                "format":     "json",
                "sort":       "DateDesc",
                "timespan":   f"{dias}d",
            }
            try:
                resp = await self._session.get(self.DOC_API, params=params)
                resp.raise_for_status()
                datos = resp.json()
            except Exception as exc:
                logger.debug("GDELT DOC API '%s': %s", query[:40], exc)
                return []

        articulos = datos.get("articles", [])
        resultado = []
        for art in articulos:
            url = art.get("url", "")
            titulo = art.get("title", "")
            if not url or not titulo:
                continue
            url_hash = hashlib.md5(url.encode()).hexdigest()
            resultado.append({
                "url_hash":    url_hash,
                "titulo":      titulo[:400],
                "url":         url,
                "dominio":     art.get("domain", ""),
                "idioma":      art.get("language", "en"),
                "tono":        float(art.get("tone", 0.0) or 0.0),
                "fecha":       art.get("seendate", datetime.now(timezone.utc).isoformat()),
                "query_origen": query[:200],
                "fuente_tipo": "gdelt_doc",
            })
        return resultado

    async def buscar_todas_queries_espana(self, dias: int = 7) -> list[dict]:
        """
        Ejecuta todas las QUERIES_ESPANA en paralelo (respetando semaforo).
        Desuplica por url_hash.
        """
        tareas = [
            self.buscar_articulos(query, dias=dias)
            for query in QUERIES_ESPANA.values()
        ]
        resultados = await asyncio.gather(*tareas, return_exceptions=True)
        vistos: set[str] = set()
        todos: list[dict] = []
        for batch in resultados:
            if isinstance(batch, Exception):
                logger.debug("GDELT query error: %s", batch)
                continue
            for art in batch:
                h = art["url_hash"]
                if h not in vistos:
                    vistos.add(h)
                    todos.append(art)
        logger.info("GDELT DOC: %d articulos unicos descargados", len(todos))
        return todos

    # ------------------------------------------------------------------
    # Modo 2: GKG master files con Polars (tono real)
    # ------------------------------------------------------------------

    async def get_gkg_tono_real(self, max_archivos: int = 3) -> list[dict]:
        """
        Descarga los ultimos archivos GKG del master file list.
        Procesa con Polars en modo lazy (streaming).
        Retorna lista de {url, tono, temas, paises, fecha}.

        El tono real esta en la columna 15 (indice 14) del TSV de GKG.
        """
        if not self._session:
            return []

        urls_gkg = await self._obtener_urls_gkg(max_archivos)
        if not urls_gkg:
            return []

        try:
            import polars as pl
        except ImportError:
            logger.warning("polars no instalado — GKG skipped")
            return []

        todos: list[dict] = []
        for url in urls_gkg:
            registros = await self._procesar_gkg_archivo(url, pl)
            todos.extend(registros)

        logger.info("GDELT GKG: %d registros con tono real", len(todos))
        return todos

    async def _obtener_urls_gkg(self, max_archivos: int) -> list[str]:
        """Obtiene las URLs de los ultimos archivos GKG del master file list."""
        try:
            resp = await self._session.get(self.GKG_MASTER, timeout=15.0)
            resp.raise_for_status()
            lineas = resp.text.strip().splitlines()
        except Exception as exc:
            logger.debug("GDELT master list error: %s", exc)
            return []

        urls_gkg = []
        for linea in reversed(lineas):
            partes = linea.split()
            if len(partes) >= 3 and ".gkg." in partes[2]:
                urls_gkg.append(partes[2])
            if len(urls_gkg) >= max_archivos:
                break
        return urls_gkg

    async def _procesar_gkg_archivo(self, url: str, pl: Any) -> list[dict]:
        """Descarga y procesa un archivo GKG (CSV comprimido en ZIP)."""
        try:
            resp = await self._session.get(url, timeout=60.0)
            resp.raise_for_status()
            contenido = resp.content
        except Exception as exc:
            logger.debug("GDELT GKG descarga error %s: %s", url, exc)
            return []

        try:
            with zipfile.ZipFile(io.BytesIO(contenido)) as zf:
                nombre_csv = zf.namelist()[0]
                with zf.open(nombre_csv) as f:
                    texto = f.read().decode("utf-8", errors="replace")
        except Exception as exc:
            logger.debug("GDELT GKG descomprimir error: %s", exc)
            return []

        # Columnas GKG 2.0 relevantes (indice 0-based)
        # Col 0: GKGRECORDID, Col 1: DATE, Col 2: SourceCollectionIdentifier
        # Col 4: DocumentIdentifier (URL), Col 7: Themes, Col 9: Locations
        # Col 14: V1Tone (formato: tone,pos,neg,polarity,arf,wrd,cnt)
        resultado = []
        try:
            reader = csv.reader(io.StringIO(texto), delimiter="\t")
            for fila in reader:
                if len(fila) <= 14:
                    continue
                url_doc = fila[4].strip() if fila[4] else ""
                tono_raw = fila[14].strip() if fila[14] else ""
                temas_raw = fila[7].strip() if fila[7] else ""
                fecha_raw = fila[1].strip() if fila[1] else ""

                if not tono_raw or "," not in tono_raw:
                    continue
                try:
                    tono = float(tono_raw.split(",")[0])
                except ValueError:
                    continue

                temas = [t.strip() for t in temas_raw.split(";") if t.strip()]
                temas_relevantes = [t for t in temas if any(
                    ti in t.upper() for ti in TEMAS_INTERES_ESPANA
                )]

                resultado.append({
                    "url":    url_doc[:500],
                    "tono":   round(tono, 4),
                    "temas":  temas_relevantes[:20],
                    "fecha":  fecha_raw[:14],
                    "fuente": "gdelt_gkg",
                })
        except Exception as exc:
            logger.debug("GDELT GKG parse error: %s", exc)

        return resultado

    # ------------------------------------------------------------------
    # Modo 3: Timeline tone API
    # ------------------------------------------------------------------

    async def get_tono_timeline(
        self,
        query: str,
        dias: int = 30,
    ) -> list[dict]:
        """
        Obtiene la serie temporal de tono para una query.
        Retorna lista de {fecha, tono} ordenada por fecha.
        """
        if not self._session:
            return []

        params = {
            "query":    query,
            "mode":     "timelinetone",
            "format":   "json",
            "timespan": f"{dias}d",
        }
        async with _get_semaphore():
            try:
                resp = await self._session.get(self.TIMELINE_API, params=params)
                resp.raise_for_status()
                datos = resp.json()
            except Exception as exc:
                logger.debug("GDELT timeline error '%s': %s", query[:40], exc)
                return []

        series = datos.get("timeline", [{}])[0].get("data", [])
        return [
            {
                "fecha": punto.get("date", ""),
                "tono":  float(punto.get("value", 0.0) or 0.0),
            }
            for punto in series
            if punto.get("date")
        ]

    async def get_tono_espana_timeline(self, dias: int = 30) -> dict[str, list[dict]]:
        """
        Obtiene timelines de tono para las principales queries de Espana.
        Retorna {nombre_query: [{fecha, tono}]}.
        """
        tareas = {
            nombre: self.get_tono_timeline(query, dias=dias)
            for nombre, query in list(QUERIES_ESPANA.items())[:5]  # top 5
        }
        resultados = await asyncio.gather(*tareas.values(), return_exceptions=True)
        return {
            nombre: res if not isinstance(res, Exception) else []
            for nombre, res in zip(tareas.keys(), resultados)
        }

    # ------------------------------------------------------------------
    # Calculos de tono agregado
    # ------------------------------------------------------------------

    @staticmethod
    def calcular_tono_medio(articulos: list[dict]) -> float:
        """Calcula el tono medio de una lista de articulos GDELT."""
        tonos = [float(a.get("tono", 0.0)) for a in articulos if "tono" in a]
        if not tonos:
            return 0.0
        return round(sum(tonos) / len(tonos), 4)

    @staticmethod
    def articulos_en_alerta(articulos: list[dict]) -> list[dict]:
        """Filtra articulos con tono por debajo del umbral de alerta."""
        return [
            a for a in articulos
            if float(a.get("tono", 0.0)) <= TONO_ALERTA_THRESHOLD
        ]
