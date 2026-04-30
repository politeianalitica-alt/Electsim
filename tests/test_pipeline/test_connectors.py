"""
Tests de los conectores de fuentes (BOE, RSS, CIS).
No hacen llamadas de red reales; mockean httpx y feedparser.
Los tests de metodos async usan asyncio.run() para no requerir pytest-asyncio.
"""
from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# BOEConnector
# ---------------------------------------------------------------------------

class TestBOEConnector:
    def _make_connector(self, params=None):
        from etl.sources.spain.boe import BOEConnector
        return BOEConnector(
            source_id="boe_test",
            params={"api_base_url": "https://api.boe.es", "_market_code": "spain", **(params or {})},
        )

    def test_instantiation(self):
        connector = self._make_connector()
        assert connector.source_id == "boe_test"
        assert "boe" in connector._api_base

    def test_params_stored(self):
        connector = self._make_connector({"sections": ["I"]})
        assert connector._sections == ["I"]

    def test_default_sections(self):
        connector = self._make_connector()
        assert "I" in connector._sections

    def test_normalize_basic(self):
        connector = self._make_connector()
        raw = {
            "id": "BOE-A-2026-001",
            "title": "Real Decreto 1/2026",
            "url": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-001",
            "section": "I",
            "department": "Ministerio de Presidencia",
            "epigraph": "Disposiciones generales",
            "date": "20260101",
        }
        normalized = asyncio.run(connector.normalize(raw))
        assert normalized["external_id"] == "BOE-A-2026-001"
        assert normalized["source_type"] == "legislation_boe"
        assert normalized["published_at"] is not None

    def test_normalize_invalid_date(self):
        connector = self._make_connector()
        raw = {"id": "BOE-X-001", "title": "Test", "date": "invalido"}
        normalized = asyncio.run(connector.normalize(raw))
        assert normalized["published_at"] is None

    def test_fetch_items_404_skipped(self):
        """Un dia sin BOE (404) se salta sin error."""
        connector = self._make_connector({"days_back": 1})

        mock_response = MagicMock()
        mock_response.status_code = 404

        async def _run():
            async def mock_get(*args, **kwargs):
                return mock_response

            with patch("httpx.AsyncClient") as mock_client_cls:
                mock_client = AsyncMock()
                mock_client.get = mock_get
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client_cls.return_value = mock_client

                items = []
                async for item in connector.fetch_items():
                    items.append(item)
            return items

        items = asyncio.run(_run())
        assert items == []


# ---------------------------------------------------------------------------
# RSSMediaConnector
# ---------------------------------------------------------------------------

class TestRSSMediaConnector:
    def _make_connector(self, params=None):
        from etl.sources.media.rss import RSSMediaConnector
        return RSSMediaConnector(
            source_id="rss_test",
            params={
                "outlets_slugs": ["elpais"],
                "_market_code": "spain",
                **(params or {}),
            },
        )

    def test_instantiation(self):
        connector = self._make_connector()
        assert connector.source_id == "rss_test"

    def test_outlets_from_params(self):
        connector = self._make_connector({"outlets_slugs": ["abc", "elmundo"]})
        assert "abc" in connector._outlets_slugs
        assert "elmundo" in connector._outlets_slugs

    def test_fallback_feeds_used_for_known_slugs(self):
        connector = self._make_connector({"outlets_slugs": ["elpais"]})
        assert "elpais" in connector._market_feeds

    def test_normalize_basic(self):
        connector = self._make_connector()
        raw = {
            "id": "https://elpais.com/noticia-1",
            "title": "Titulo de prueba",
            "content": "Texto del articulo",
            "url": "https://elpais.com/noticia-1",
            "published_at": "2026-04-30T10:00:00+00:00",
            "outlet_slug": "elpais",
            "author": "Autor Test",
            "tags": ["politica"],
        }
        normalized = asyncio.run(connector.normalize(raw))
        assert normalized["source_type"] == "media_rss"
        assert normalized["title"] == "Titulo de prueba"
        assert normalized["url"] == "https://elpais.com/noticia-1"

    def test_fetch_items_with_mock_feed(self):
        """Simula una respuesta RSS con feedparser mockeado."""
        connector = self._make_connector({"outlets_slugs": ["elpais"], "max_per_outlet": 2})

        mock_entry = MagicMock()
        mock_entry.get = lambda key, default="": {
            "id": "https://elpais.com/articulo-1",
            "title": "Articulo de prueba",
            "link": "https://elpais.com/articulo-1",
            "summary": "Resumen del articulo",
            "published": "Wed, 30 Apr 2026 10:00:00 +0000",
            "author": "Redaccion",
            "tags": [],
            "content": [],
        }.get(key, default)
        mock_entry.id = "https://elpais.com/articulo-1"

        mock_feed = MagicMock()
        mock_feed.entries = [mock_entry]

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<rss/>"
        mock_response.raise_for_status = MagicMock()

        async def _run():
            with patch("feedparser.parse", return_value=mock_feed), \
                 patch("httpx.AsyncClient") as mock_client_cls:

                mock_client = AsyncMock()
                mock_client.get = AsyncMock(return_value=mock_response)
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client_cls.return_value = mock_client

                items = []
                async for item in connector.fetch_items():
                    items.append(item)
            return items

        items = asyncio.run(_run())
        assert len(items) >= 1

    def test_fetch_network_error_no_crash(self):
        """Un error de red en un outlet no detiene el resto."""
        connector = self._make_connector({"outlets_slugs": ["elpais"]})

        async def _run():
            with patch("httpx.AsyncClient") as mock_client_cls:
                mock_client = AsyncMock()
                mock_client.get = AsyncMock(side_effect=Exception("connection error"))
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client_cls.return_value = mock_client

                items = []
                async for item in connector.fetch_items():
                    items.append(item)
            return items

        items = asyncio.run(_run())
        assert items == []


# ---------------------------------------------------------------------------
# CISPollsConnector
# ---------------------------------------------------------------------------

class TestCISPollsConnector:
    def _make_connector(self, params=None):
        from etl.sources.polls.cis import CISPollsConnector
        return CISPollsConnector(
            source_id="cis_test",
            params={"_market_code": "spain", **(params or {})},
        )

    def test_instantiation(self):
        connector = self._make_connector()
        assert connector.source_id == "cis_test"

    def test_max_studies_param(self):
        connector = self._make_connector({"max_studies": 3})
        assert connector._max_studies == 3

    def test_normalize_basic(self):
        connector = self._make_connector()
        raw = {
            "id": "3456",
            "title": "Barometro Enero 2026",
            "url": "https://www.cis.es/estudio/3456",
            "content": "",
            "published_at": None,
            "study_number": "3456",
        }
        normalized = asyncio.run(connector.normalize(raw))
        assert normalized["source_type"] == "polls_cis"
        assert normalized["external_id"] == "3456"

    def test_parse_studies_html(self):
        connector = self._make_connector()
        html = '''
        <a href="/estudios/estudio-3456-barometro-enero-2026">
            Barometro CIS Enero 2026
        </a>
        '''
        studies = connector._parse_studies_html(html)
        # Con HTML minimo puede no encontrar nada, pero no debe lanzar excepcion
        assert isinstance(studies, list)

    def test_fetch_items_network_error_no_crash(self):
        connector = self._make_connector()

        async def _run():
            with patch("httpx.AsyncClient") as mock_client_cls:
                mock_client = AsyncMock()
                mock_client.get = AsyncMock(side_effect=Exception("timeout"))
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client_cls.return_value = mock_client

                items = []
                async for item in connector.fetch_items():
                    items.append(item)
            return items

        items = asyncio.run(_run())
        assert items == []
