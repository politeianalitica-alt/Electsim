"""
SearchAgent — Busqueda web sin API key via DuckDuckGo.

Usa la API no oficial de DuckDuckGo (duckduckgo_search) para buscar
noticias y articulos sobre actores y temas politicos.

Complementa el feed_monitor para cubrir terminos de busqueda
que no estan en los feeds RSS configurados.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str = ""
    published_date: str = ""
    source: str = ""


@dataclass
class SearchSession:
    query: str
    results: list[SearchResult] = field(default_factory=list)
    total_found: int = 0
    search_method: str = "ddg"


class SearchAgent:
    """
    Agente de busqueda web para el Brain.

    Busca noticias recientes sobre actores politicos y temas especificados.
    No requiere API key.

    Uso:
        agent = SearchAgent()
        session = await agent.search("Pedro Sanchez reforma fiscal", max_results=10)
        for r in session.results:
            print(r.title, r.url)
    """

    def __init__(self, region: str = "es-es", time_filter: str = "d") -> None:
        """
        Args:
            region: region de busqueda (es-es para España)
            time_filter: d=dia, w=semana, m=mes
        """
        self._region = region
        self._time_filter = time_filter

    async def search(
        self,
        query: str,
        max_results: int = 10,
        search_type: str = "news",
    ) -> SearchSession:
        """
        Busca noticias o articulos web.

        Args:
            query: termino de busqueda
            max_results: numero maximo de resultados
            search_type: "news" o "text"
        """
        results = await self._search_ddg(query, max_results, search_type)
        return SearchSession(
            query=query,
            results=results,
            total_found=len(results),
            search_method="ddg",
        )

    async def search_actor(
        self,
        actor: str,
        context: str = "",
        max_results: int = 8,
    ) -> SearchSession:
        """Busca noticias recientes sobre un actor politico."""
        query = actor
        if context:
            query = f"{actor} {context}"
        return await self.search(query, max_results=max_results, search_type="news")

    async def search_topics(
        self,
        topics: list[str],
        max_per_topic: int = 5,
    ) -> list[SearchSession]:
        """Busca multiples temas en paralelo."""
        import asyncio
        tasks = [self.search(topic, max_per_topic) for topic in topics[:5]]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [r for r in results if isinstance(r, SearchSession)]

    async def _search_ddg(
        self,
        query: str,
        max_results: int,
        search_type: str,
    ) -> list[SearchResult]:
        try:
            from duckduckgo_search import DDGS  # type: ignore[import]
        except ImportError:
            logger.debug("duckduckgo_search no instalado — SearchAgent degradado")
            return self._fallback_results(query)

        try:
            results = []
            with DDGS() as ddgs:
                if search_type == "news":
                    search_gen = ddgs.news(
                        query,
                        region=self._region,
                        safesearch="moderate",
                        timelimit=self._time_filter,
                        max_results=max_results,
                    )
                else:
                    search_gen = ddgs.text(
                        query,
                        region=self._region,
                        safesearch="moderate",
                        timelimit=self._time_filter,
                        max_results=max_results,
                    )

                for r in (search_gen or []):
                    if search_type == "news":
                        results.append(SearchResult(
                            title=str(r.get("title", ""))[:200],
                            url=str(r.get("url", "")),
                            snippet=str(r.get("body", ""))[:300],
                            published_date=str(r.get("date", "")),
                            source=str(r.get("source", "")),
                        ))
                    else:
                        results.append(SearchResult(
                            title=str(r.get("title", ""))[:200],
                            url=str(r.get("href", "")),
                            snippet=str(r.get("body", ""))[:300],
                        ))

            return results
        except Exception as exc:
            logger.debug("SearchAgent DDG error: %s", exc)
            return self._fallback_results(query)

    @staticmethod
    def _fallback_results(query: str) -> list[SearchResult]:
        """Resultados de fallback cuando DDG no esta disponible."""
        return [
            SearchResult(
                title=f"Busqueda: {query}",
                url="",
                snippet="Busqueda web no disponible — duckduckgo_search no instalado",
            )
        ]
