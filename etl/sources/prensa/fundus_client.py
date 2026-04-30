"""
Fundus + RSS Client — Ingesta de prensa espanola estructurada.

Estrategia dual:
  1. Fundus  — parsers especializados por medio (full-text, metadata limpia)
  2. RSS     — fallback ligero cuando Fundus falla o el medio no tiene parser

Medios cubiertos: El Pais, El Mundo, ABC, La Vanguardia, El Confidencial,
                  El Espanol, La Razon, 20minutos, Publico, elDiario.es,
                  Expansion, Cinco Dias, El Economista, El Periodico,
                  La Voz de Galicia, Heraldo, Sur, La Verdad, Levante.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config por medio
# ---------------------------------------------------------------------------

@dataclass
class MedioConfig:
    nombre: str
    rss_urls: list[str]
    tendencia: str          # "izquierda" | "centro" | "derecha" | "economico" | "regional"
    establishment: bool     # True = prensa tradicional/grande
    credibilidad: float     # 0.0 - 1.0, basado en MBFC adaptado
    fundus_class: str | None = None   # Nombre de clase Fundus si disponible


MEDIOS_ESPANA: dict[str, MedioConfig] = {
    "elpais": MedioConfig(
        nombre="El Pais",
        rss_urls=[
            "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
            "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/politica/portada",
        ],
        tendencia="centro",
        establishment=True,
        credibilidad=0.85,
        fundus_class="ElPais",
    ),
    "elmundo": MedioConfig(
        nombre="El Mundo",
        rss_urls=[
            "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
            "https://e00-elmundo.uecdn.es/elmundo/rss/espana.xml",
        ],
        tendencia="centro_derecha",
        establishment=True,
        credibilidad=0.80,
        fundus_class="ElMundo",
    ),
    "abc": MedioConfig(
        nombre="ABC",
        rss_urls=[
            "https://www.abc.es/rss/feeds/abc_Espana.xml",
            "https://www.abc.es/rss/feeds/abc_Portada.xml",
        ],
        tendencia="derecha",
        establishment=True,
        credibilidad=0.75,
        fundus_class="ABC",
    ),
    "lavanguardia": MedioConfig(
        nombre="La Vanguardia",
        rss_urls=[
            "https://www.lavanguardia.com/mvc/feed/rss/home",
            "https://www.lavanguardia.com/mvc/feed/rss/politica",
        ],
        tendencia="centro",
        establishment=True,
        credibilidad=0.82,
        fundus_class="LaVanguardia",
    ),
    "elconfidencial": MedioConfig(
        nombre="El Confidencial",
        rss_urls=[
            "https://rss.elconfidencial.com/espana/",
            "https://rss.elconfidencial.com/economia/",
        ],
        tendencia="centro",
        establishment=False,
        credibilidad=0.78,
    ),
    "elespanol": MedioConfig(
        nombre="El Espanol",
        rss_urls=[
            "https://www.elespanol.com/rss/",
        ],
        tendencia="centro_derecha",
        establishment=False,
        credibilidad=0.70,
    ),
    "larazon": MedioConfig(
        nombre="La Razon",
        rss_urls=[
            "https://www.larazon.es/rss/",
        ],
        tendencia="derecha",
        establishment=True,
        credibilidad=0.72,
    ),
    "20minutos": MedioConfig(
        nombre="20 Minutos",
        rss_urls=[
            "https://www.20minutos.es/rss/",
            "https://www.20minutos.es/rss/politica/",
        ],
        tendencia="centro",
        establishment=True,
        credibilidad=0.72,
    ),
    "publico": MedioConfig(
        nombre="Publico",
        rss_urls=[
            "https://www.publico.es/rss.xml",
        ],
        tendencia="izquierda",
        establishment=False,
        credibilidad=0.70,
    ),
    "eldiario": MedioConfig(
        nombre="elDiario.es",
        rss_urls=[
            "https://www.eldiario.es/rss/",
            "https://www.eldiario.es/politica/rss/",
        ],
        tendencia="izquierda",
        establishment=False,
        credibilidad=0.75,
    ),
    "expansion": MedioConfig(
        nombre="Expansion",
        rss_urls=[
            "https://e00-expansion.uecdn.es/rss/portada.xml",
            "https://e00-expansion.uecdn.es/rss/economia-politica.xml",
        ],
        tendencia="economico",
        establishment=True,
        credibilidad=0.82,
    ),
    "cincodias": MedioConfig(
        nombre="Cinco Dias",
        rss_urls=[
            "https://feeds.elpais.com/mrss-s/pages/ep/site/cincodias.elpais.com/portada",
        ],
        tendencia="economico",
        establishment=True,
        credibilidad=0.80,
    ),
    "eleconomista": MedioConfig(
        nombre="El Economista",
        rss_urls=[
            "https://www.eleconomista.es/rss/rss-seleccion-ee.php",
        ],
        tendencia="economico",
        establishment=True,
        credibilidad=0.78,
    ),
    "elperiodico": MedioConfig(
        nombre="El Periodico",
        rss_urls=[
            "https://www.elperiodico.com/es/rss/rss_portada.xml",
        ],
        tendencia="centro_izquierda",
        establishment=True,
        credibilidad=0.76,
    ),
    "lavozdegalicia": MedioConfig(
        nombre="La Voz de Galicia",
        rss_urls=[
            "https://www.lavozdegalicia.es/rss/galicia.xml",
        ],
        tendencia="centro",
        establishment=True,
        credibilidad=0.78,
        fundus_class=None,
    ),
    "heraldo": MedioConfig(
        nombre="Heraldo de Aragon",
        rss_urls=[
            "https://www.heraldo.es/rss/portada.xml",
        ],
        tendencia="centro",
        establishment=True,
        credibilidad=0.76,
    ),
    "sur": MedioConfig(
        nombre="Sur",
        rss_urls=[
            "https://www.diariosur.es/rss/feeds/andalucia.xml",
        ],
        tendencia="centro",
        establishment=True,
        credibilidad=0.74,
    ),
    "laverdad": MedioConfig(
        nombre="La Verdad",
        rss_urls=[
            "https://www.laverdad.es/rss/feeds/portada.xml",
        ],
        tendencia="centro",
        establishment=True,
        credibilidad=0.74,
    ),
    "levante": MedioConfig(
        nombre="Levante",
        rss_urls=[
            "https://www.levante-emv.com/rss/feeds/portada.xml",
        ],
        tendencia="centro",
        establishment=True,
        credibilidad=0.74,
    ),
}


# ---------------------------------------------------------------------------
# Articulo normalizado
# ---------------------------------------------------------------------------

@dataclass
class ArticuloNormalizado:
    url_hash: str
    titulo: str
    url: str
    medio: str
    tendencia: str
    credibilidad: float
    fecha_pub: str
    texto_completo: str
    resumen: str
    autor: str
    seccion: str
    tags: list[str] = field(default_factory=list)
    fuente_ingesta: str = "rss"   # "fundus" | "rss" | "trafilatura"


def _url_hash(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Cliente principal
# ---------------------------------------------------------------------------

class FundusClient:
    """
    Ingesta de articulos de prensa espanola via Fundus (parsers) + RSS (fallback).

    Uso:
        client = FundusClient()
        async with client:
            articulos = await client.ingestar_todos(dias=1)
    """

    def __init__(self, timeout: float = 30.0) -> None:
        self._timeout = timeout
        self._session: Any = None
        self._fundus_publisher_map: dict[str, Any] | None = None

    async def __aenter__(self) -> "FundusClient":
        try:
            import httpx
            self._session = httpx.AsyncClient(
                timeout=self._timeout,
                follow_redirects=True,
                headers={"User-Agent": "ElectSimBot/2.0 (+https://electsim.es)"},
            )
        except ImportError:
            logger.warning("httpx no instalado — FundusClient degradado")
        self._inicializar_fundus()
        return self

    async def __aexit__(self, *args: Any) -> None:
        if self._session:
            await self._session.aclose()

    def _inicializar_fundus(self) -> None:
        """Carga el mapa de publishers de Fundus si esta instalado."""
        try:
            from fundus import PublisherCollection
            self._fundus_publisher_map = {
                "ElPais":       getattr(PublisherCollection.es, "ElPais", None),
                "ElMundo":      getattr(PublisherCollection.es, "ElMundo", None),
                "ABC":          getattr(PublisherCollection.es, "ABC", None),
                "LaVanguardia": getattr(PublisherCollection.es, "LaVanguardia", None),
            }
            # Filtrar publishers que no existen en la version instalada
            self._fundus_publisher_map = {
                k: v for k, v in self._fundus_publisher_map.items() if v is not None
            }
            logger.info("Fundus inicializado: %d publishers disponibles", len(self._fundus_publisher_map))
        except ImportError:
            logger.info("fundus no instalado — modo RSS solamente")
            self._fundus_publisher_map = {}
        except Exception as exc:
            logger.warning("Fundus init error: %s", exc)
            self._fundus_publisher_map = {}

    # ------------------------------------------------------------------
    # Ingesta via Fundus (full-text, metadata estructurada)
    # ------------------------------------------------------------------

    async def ingestar_fundus(
        self,
        medio_key: str,
        max_articulos: int = 20,
    ) -> list[ArticuloNormalizado]:
        """
        Descarga articulos de un medio usando Fundus.
        Solo funciona si Fundus esta instalado y el medio tiene parser.
        """
        config = MEDIOS_ESPANA.get(medio_key)
        if not config or not config.fundus_class:
            return []
        if not self._fundus_publisher_map:
            return []

        publisher = self._fundus_publisher_map.get(config.fundus_class)
        if not publisher:
            return []

        try:
            from fundus import Crawler
            crawler = Crawler(publisher)
            resultado: list[ArticuloNormalizado] = []

            # Fundus es sincrono — ejecutar en executor para no bloquear
            loop = asyncio.get_event_loop()
            articulos_raw = await loop.run_in_executor(
                None,
                lambda: list(crawler.crawl(max_articles=max_articulos, only_complete=True)),
            )

            for art in articulos_raw:
                try:
                    url = str(getattr(art, "url", "") or "")
                    if not url:
                        continue
                    titulo = str(getattr(art, "title", "") or "")[:500]
                    texto = str(getattr(art, "plaintext", "") or "")[:50_000]
                    fecha = getattr(art, "publishing_date", None)
                    fecha_str = fecha.isoformat() if fecha else datetime.now(timezone.utc).isoformat()
                    autor = ""
                    autores = getattr(art, "authors", None)
                    if autores:
                        autor = ", ".join(str(a) for a in autores)[:200]
                    seccion = str(getattr(art, "section", "") or "")[:100]
                    tags_raw = getattr(art, "tags", None) or []
                    tags = [str(t)[:80] for t in tags_raw][:20]
                    resumen = str(getattr(art, "summary", "") or "")[:1000] or texto[:300]

                    resultado.append(ArticuloNormalizado(
                        url_hash=_url_hash(url),
                        titulo=titulo,
                        url=url,
                        medio=medio_key,
                        tendencia=config.tendencia,
                        credibilidad=config.credibilidad,
                        fecha_pub=fecha_str,
                        texto_completo=texto,
                        resumen=resumen,
                        autor=autor,
                        seccion=seccion,
                        tags=tags,
                        fuente_ingesta="fundus",
                    ))
                except Exception as exc:
                    logger.debug("Fundus parse articulo %s: %s", medio_key, exc)

            logger.info("Fundus %s: %d articulos", medio_key, len(resultado))
            return resultado

        except Exception as exc:
            logger.warning("Fundus ingesta %s: %s", medio_key, exc)
            return []

    # ------------------------------------------------------------------
    # Ingesta via RSS (fallback)
    # ------------------------------------------------------------------

    async def ingestar_rss(
        self,
        medio_key: str,
        max_por_feed: int = 15,
    ) -> list[ArticuloNormalizado]:
        """Descarga articulos de un medio via RSS."""
        config = MEDIOS_ESPANA.get(medio_key)
        if not config or not self._session:
            return []

        resultado: list[ArticuloNormalizado] = []
        vistos: set[str] = set()

        for rss_url in config.rss_urls:
            try:
                resp = await self._session.get(rss_url)
                resp.raise_for_status()
                articulos = self._parsear_rss(resp.text, config, medio_key, max_por_feed)
                for art in articulos:
                    if art.url_hash not in vistos:
                        vistos.add(art.url_hash)
                        resultado.append(art)
            except Exception as exc:
                logger.debug("RSS %s %s: %s", medio_key, rss_url[:60], exc)

        return resultado

    def _parsear_rss(
        self,
        xml_text: str,
        config: MedioConfig,
        medio_key: str,
        max_items: int,
    ) -> list[ArticuloNormalizado]:
        """Parsea XML RSS y extrae articulos normalizados."""
        try:
            import feedparser
            feed = feedparser.parse(xml_text)
        except ImportError:
            # Parseo manual minimo si feedparser no esta instalado
            return self._parsear_rss_manual(xml_text, config, medio_key, max_items)

        resultado: list[ArticuloNormalizado] = []
        for entry in feed.entries[:max_items]:
            url = str(entry.get("link", ""))
            titulo = str(entry.get("title", ""))
            if not url or not titulo:
                continue

            # Fecha
            fecha_struct = entry.get("published_parsed") or entry.get("updated_parsed")
            if fecha_struct:
                try:
                    import time as _time
                    ts = _time.mktime(fecha_struct)
                    fecha_str = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
                except Exception:
                    fecha_str = datetime.now(timezone.utc).isoformat()
            else:
                fecha_str = datetime.now(timezone.utc).isoformat()

            # Resumen
            summary = entry.get("summary", "") or ""
            summary = re.sub(r"<[^>]+>", "", summary).strip()[:1000]

            # Tags
            tags = [t.get("term", "")[:80] for t in entry.get("tags", [])][:10]

            resultado.append(ArticuloNormalizado(
                url_hash=_url_hash(url),
                titulo=titulo[:500],
                url=url,
                medio=medio_key,
                tendencia=config.tendencia,
                credibilidad=config.credibilidad,
                fecha_pub=fecha_str,
                texto_completo="",   # Solo disponible con Fundus o trafilatura
                resumen=summary,
                autor="",
                seccion="",
                tags=tags,
                fuente_ingesta="rss",
            ))

        return resultado

    def _parsear_rss_manual(
        self,
        xml_text: str,
        config: MedioConfig,
        medio_key: str,
        max_items: int,
    ) -> list[ArticuloNormalizado]:
        """Parseo RSS muy basico sin feedparser."""
        resultado: list[ArticuloNormalizado] = []
        items = re.findall(r"<item>(.*?)</item>", xml_text, re.DOTALL)
        for item_xml in items[:max_items]:
            url_m = re.search(r"<link>(.*?)</link>", item_xml)
            titulo_m = re.search(r"<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)</title>", item_xml, re.DOTALL)
            if not url_m:
                continue
            url = url_m.group(1).strip()
            titulo = ""
            if titulo_m:
                titulo = (titulo_m.group(1) or titulo_m.group(2) or "").strip()
            if not url or not titulo:
                continue
            resultado.append(ArticuloNormalizado(
                url_hash=_url_hash(url),
                titulo=titulo[:500],
                url=url,
                medio=medio_key,
                tendencia=config.tendencia,
                credibilidad=config.credibilidad,
                fecha_pub=datetime.now(timezone.utc).isoformat(),
                texto_completo="",
                resumen="",
                autor="",
                seccion="",
                fuente_ingesta="rss",
            ))
        return resultado

    # ------------------------------------------------------------------
    # Enriquecimiento con trafilatura (full-text desde URL)
    # ------------------------------------------------------------------

    async def enriquecer_texto(self, articulo: ArticuloNormalizado) -> ArticuloNormalizado:
        """
        Descarga el texto completo de un articulo via trafilatura.
        Solo se llama si texto_completo esta vacio (articulos RSS).
        """
        if articulo.texto_completo or not self._session:
            return articulo

        try:
            import trafilatura
            resp = await self._session.get(articulo.url)
            resp.raise_for_status()
            texto = trafilatura.extract(
                resp.text,
                include_comments=False,
                include_tables=False,
                favor_recall=True,
            )
            if texto:
                articulo.texto_completo = texto[:50_000]
                articulo.fuente_ingesta = "trafilatura"
        except Exception as exc:
            logger.debug("trafilatura %s: %s", articulo.url[:60], exc)

        return articulo

    async def enriquecer_lote(
        self,
        articulos: list[ArticuloNormalizado],
        max_concurrente: int = 5,
    ) -> list[ArticuloNormalizado]:
        """Enriquece un lote de articulos con trafilatura (concurrencia limitada)."""
        sem = asyncio.Semaphore(max_concurrente)

        async def _enriquecer_uno(art: ArticuloNormalizado) -> ArticuloNormalizado:
            async with sem:
                return await self.enriquecer_texto(art)

        tareas = [_enriquecer_uno(art) for art in articulos if not art.texto_completo]
        enriquecidos_map = {art.url_hash: art for art in articulos if art.texto_completo}

        resultados = await asyncio.gather(*tareas, return_exceptions=True)
        for res in resultados:
            if isinstance(res, ArticuloNormalizado):
                enriquecidos_map[res.url_hash] = res

        # Reconstruir en orden original
        return [enriquecidos_map.get(art.url_hash, art) for art in articulos]

    # ------------------------------------------------------------------
    # Ingesta combinada
    # ------------------------------------------------------------------

    async def ingestar_medio(
        self,
        medio_key: str,
        usar_trafilatura: bool = False,
        max_articulos: int = 20,
    ) -> list[ArticuloNormalizado]:
        """
        Ingesta un medio usando Fundus si disponible, RSS como fallback.
        Opcionalmente enriquece con trafilatura.
        """
        # Intentar Fundus primero
        resultado = await self.ingestar_fundus(medio_key, max_articulos)

        # Fallback a RSS si Fundus no produjo resultados
        if not resultado:
            resultado = await self.ingestar_rss(medio_key, max_articulos)

        # Enriquecer con trafilatura si se solicita y hay articulos RSS sin texto
        if usar_trafilatura and resultado:
            sin_texto = [a for a in resultado if not a.texto_completo]
            if sin_texto:
                logger.info("trafilatura: enriqueciendo %d/%d articulos de %s",
                            len(sin_texto), len(resultado), medio_key)
                resultado = await self.enriquecer_lote(resultado)

        return resultado

    async def ingestar_todos(
        self,
        medios: list[str] | None = None,
        usar_trafilatura: bool = False,
        max_por_medio: int = 15,
    ) -> list[ArticuloNormalizado]:
        """
        Ingesta todos los medios configurados en paralelo.
        Deduplica por url_hash.
        """
        claves = medios or list(MEDIOS_ESPANA.keys())
        tareas = [
            self.ingestar_medio(key, usar_trafilatura=usar_trafilatura, max_articulos=max_por_medio)
            for key in claves
        ]
        resultados = await asyncio.gather(*tareas, return_exceptions=True)

        vistos: set[str] = set()
        todos: list[ArticuloNormalizado] = []
        for batch in resultados:
            if isinstance(batch, Exception):
                logger.debug("ingestar_todos error: %s", batch)
                continue
            for art in batch:
                if art.url_hash not in vistos:
                    vistos.add(art.url_hash)
                    todos.append(art)

        logger.info("FundusClient: %d articulos unicos de %d medios", len(todos), len(claves))
        return todos


# ---------------------------------------------------------------------------
# CLI para pruebas
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio as _asyncio

    async def _demo() -> None:
        async with FundusClient() as client:
            arts = await client.ingestar_todos(
                medios=["elpais", "elmundo", "elconfidencial"],
                max_por_medio=5,
            )
            for art in arts[:5]:
                print(f"{art.medio:15} | {art.fecha_pub[:10]} | {art.titulo[:80]}")

    _asyncio.run(_demo())
