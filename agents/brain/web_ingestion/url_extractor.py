"""
URLExtractor — Extraccion de contenido web con Playwright + BeautifulSoup.

Primero intenta extraccion con httpx + BS4 (rapido, sin JS).
Si el contenido es insuficiente (<200 palabras), usa Playwright (JS completo).

Salida: WebPage con titulo, texto limpio, fecha publicacion (si detectada).
"""
from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# Selectores CSS prioritarios para extraccion de texto
_CONTENT_SELECTORS = [
    "article", "main", ".article-body", ".content", ".entry-content",
    "#article-body", ".post-content", "[itemprop='articleBody']",
]

# Dominios conocidos que requieren JS
_REQUIRES_JS = {
    "elpais.com", "elmundo.es", "abc.es", "lavanguardia.com",
    "elconfidencial.com", "expansion.com",
}


@dataclass
class WebPage:
    url: str
    title: str = ""
    text: str = ""
    published_at: str = ""
    author: str = ""
    word_count: int = 0
    extraction_method: str = "bs4"
    error: str = ""

    @property
    def is_useful(self) -> bool:
        return self.word_count >= 100 and not self.error

    def content_hash(self) -> str:
        return hashlib.sha1(self.text[:500].encode()).hexdigest()[:12]


class URLExtractor:
    """
    Extrae contenido de URLs web.

    Uso:
        async with URLExtractor() as extractor:
            page = await extractor.extract("https://elpais.com/...")
            print(page.text[:500])
    """

    def __init__(self, timeout: float = 20.0, max_words: int = 3000) -> None:
        self._timeout = timeout
        self._max_words = max_words
        self._session: Any = None

    async def __aenter__(self) -> "URLExtractor":
        try:
            import httpx
            self._session = httpx.AsyncClient(
                timeout=self._timeout,
                follow_redirects=True,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (compatible; PoliteiaCrawler/1.0; "
                        "+https://politeia.es/bot)"
                    )
                },
            )
        except ImportError:
            logger.warning("httpx no disponible — URLExtractor degradado")
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._session:
            await self._session.aclose()

    async def extract(self, url: str) -> WebPage:
        """Extrae el contenido de una URL."""
        page = WebPage(url=url)

        # Intentar extraccion rapida con BS4
        try:
            page = await self._extract_bs4(url)
            if page.is_useful:
                return page
        except Exception as exc:
            logger.debug("bs4 extraction error %s: %s", url, exc)

        # Fallback a Playwright si el dominio requiere JS
        domain = self._get_domain(url)
        if domain in _REQUIRES_JS or page.word_count < 100:
            try:
                page = await self._extract_playwright(url)
            except Exception as exc:
                logger.debug("playwright extraction error %s: %s", url, exc)
                page.error = str(exc)

        return page

    async def _extract_bs4(self, url: str) -> WebPage:
        if not self._session:
            return WebPage(url=url, error="httpx no disponible")

        resp = await self._session.get(url)
        resp.raise_for_status()
        html = resp.text

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

        # Titulo
        title = ""
        title_tag = soup.find("title")
        if title_tag:
            title = title_tag.get_text(strip=True)
        og_title = soup.find("meta", property="og:title")
        if og_title:
            title = str(og_title.get("content", title))

        # Texto principal
        text = ""
        for selector in _CONTENT_SELECTORS:
            container = soup.select_one(selector)
            if container:
                text = container.get_text(separator=" ", strip=True)
                if len(text.split()) >= 100:
                    break

        if not text:
            # Fallback: body completo sin nav/header/footer
            for tag in soup(["nav", "header", "footer", "script", "style", "aside"]):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)

        # Fecha de publicacion
        published_at = ""
        time_tag = soup.find("time")
        if time_tag:
            published_at = str(time_tag.get("datetime", time_tag.get_text(strip=True)))
        meta_date = soup.find("meta", property="article:published_time")
        if meta_date:
            published_at = str(meta_date.get("content", published_at))

        # Autor
        author = ""
        meta_author = soup.find("meta", attrs={"name": "author"})
        if meta_author:
            author = str(meta_author.get("content", ""))

        # Limpiar texto
        text = self._clean_text(text)
        words = text.split()[:self._max_words]
        text = " ".join(words)

        return WebPage(
            url=url,
            title=title[:200],
            text=text,
            published_at=published_at[:50],
            author=author[:100],
            word_count=len(words),
            extraction_method="bs4",
        )

    async def _extract_playwright(self, url: str) -> WebPage:
        try:
            from playwright.async_api import async_playwright  # type: ignore[import]
        except ImportError:
            return WebPage(
                url=url, error="playwright no instalado (pip install playwright)"
            )

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            try:
                page = await browser.new_page()
                await page.goto(url, timeout=int(self._timeout * 1000))
                await page.wait_for_load_state("networkidle", timeout=15000)

                title = await page.title()
                text_raw = await page.inner_text("body")
                text = self._clean_text(text_raw)
                words = text.split()[:self._max_words]

                return WebPage(
                    url=url,
                    title=title[:200],
                    text=" ".join(words),
                    word_count=len(words),
                    extraction_method="playwright",
                )
            finally:
                await browser.close()

    @staticmethod
    def _clean_text(text: str) -> str:
        text = re.sub(r"\s+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @staticmethod
    def _get_domain(url: str) -> str:
        match = re.search(r"https?://(?:www\.)?([^/]+)", url)
        return match.group(1) if match else ""

    async def extract_batch(
        self,
        urls: list[str],
        concurrency: int = 3,
    ) -> list[WebPage]:
        """Extrae multiples URLs con concurrencia controlada."""
        import asyncio
        sem = asyncio.Semaphore(concurrency)

        async def _one(url: str) -> WebPage:
            async with sem:
                return await self.extract(url)

        results = await asyncio.gather(*[_one(u) for u in urls], return_exceptions=True)
        pages = []
        for r in results:
            if isinstance(r, WebPage):
                pages.append(r)
            elif isinstance(r, Exception):
                logger.debug("extract_batch error: %s", r)
        return pages
