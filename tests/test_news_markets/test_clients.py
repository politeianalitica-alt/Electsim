"""Tests · clientes NewsAPI + Alpha Vantage + FRED.

Verifica el comportamiento falla-cerrado (sin keys) sin tocar red.
"""
from __future__ import annotations

import os

import pytest


def _no_key(env_name: str) -> bool:
    """Helper · evita comprobar funciones reales si la key NO está."""
    return not os.environ.get(env_name)


# ─────────────────────────────────────────────────────────────────
# NewsAPI · estructura y falla-cerrado
# ─────────────────────────────────────────────────────────────────

def test_newsapi_imports_clean():
    from etl.sources.news.newsapi_client import (
        is_available,
        top_headlines,
        everything,
        list_sources,
    )
    assert callable(is_available)
    assert callable(top_headlines)
    assert callable(everything)
    assert callable(list_sources)


def test_newsapi_no_key_returns_empty(monkeypatch):
    """Sin NEWSAPI_KEY · top_headlines devuelve [] sin lanzar."""
    monkeypatch.delenv("NEWSAPI_KEY", raising=False)
    from etl.sources.news import newsapi_client

    assert newsapi_client.is_available() is False
    assert newsapi_client.top_headlines(country="es") == []
    assert newsapi_client.everything(q="test") == []
    assert newsapi_client.list_sources() == []


# ─────────────────────────────────────────────────────────────────
# Alpha Vantage
# ─────────────────────────────────────────────────────────────────

def test_alpha_vantage_imports_clean():
    from etl.sources.markets.alpha_vantage_client import (
        is_available,
        quote,
        daily_series,
        intraday_series,
        rsi,
        macd,
        fx_rate,
    )
    for fn in (is_available, quote, daily_series, intraday_series, rsi, macd, fx_rate):
        assert callable(fn)


def test_alpha_vantage_no_key_returns_empty(monkeypatch):
    monkeypatch.delenv("ALPHA_VANTAGE_KEY", raising=False)
    from etl.sources.markets import alpha_vantage_client as av

    assert av.is_available() is False
    assert av.quote("AAPL") is None
    assert av.daily_series("AAPL") == []
    assert av.intraday_series("AAPL") == []
    assert av.rsi("AAPL") == []
    assert av.macd("AAPL") == []
    assert av.fx_rate("EUR", "USD") is None


# ─────────────────────────────────────────────────────────────────
# FRED
# ─────────────────────────────────────────────────────────────────

def test_fred_imports_clean():
    from etl.sources.markets.fred_client import (
        is_available,
        series_observations,
        series_metadata,
        search_series,
        latest_value,
        macro_snapshot,
        POPULAR_INDICATORS,
    )
    for fn in (
        is_available,
        series_observations,
        series_metadata,
        search_series,
        latest_value,
        macro_snapshot,
    ):
        assert callable(fn)
    assert isinstance(POPULAR_INDICATORS, list)
    assert "UNRATE" in POPULAR_INDICATORS
    assert "DGS10" in POPULAR_INDICATORS
    assert len(POPULAR_INDICATORS) >= 10


def test_fred_no_key_returns_empty(monkeypatch):
    monkeypatch.delenv("FRED_API_KEY", raising=False)
    from etl.sources.markets import fred_client as fred

    assert fred.is_available() is False
    assert fred.series_observations("GDP") == []
    assert fred.series_metadata("GDP") is None
    assert fred.search_series("inflation") == []
    assert fred.latest_value("GDP") is None
    assert fred.macro_snapshot() == []


# ─────────────────────────────────────────────────────────────────
# SourceKind extendido (contract test)
# ─────────────────────────────────────────────────────────────────

def test_source_kind_includes_news_markets():
    from packages.types.normalized_item import SourceKind
    import typing

    args = set(typing.get_args(SourceKind))
    expected = {"newsapi", "alpha_vantage", "fred"}
    missing = expected - args
    assert not missing, f"SourceKind no incluye: {missing}"


# ─────────────────────────────────────────────────────────────────
# Live tests (opt-in con keys reales · skip si no están)
# ─────────────────────────────────────────────────────────────────

@pytest.mark.skipif(_no_key("NEWSAPI_KEY"), reason="NEWSAPI_KEY no configurada")
def test_newsapi_live_no_crash():
    """Live · NewsAPI responde con shape esperado."""
    from etl.sources.news.newsapi_client import top_headlines

    items = top_headlines(country="us", page_size=3)
    assert isinstance(items, list)
    # No exigimos len>0 (rate limit/horario puede vaciar)


@pytest.mark.skipif(_no_key("ALPHA_VANTAGE_KEY"), reason="ALPHA_VANTAGE_KEY no configurada")
def test_alpha_vantage_live_quote_aapl():
    from etl.sources.markets.alpha_vantage_client import quote

    q = quote("AAPL")
    # Rate limit puede devolver None · solo validamos shape si hay datos
    if q is not None:
        assert "price" in q
        assert isinstance(q["price"], float)
        assert q["symbol"] == "AAPL"


@pytest.mark.skipif(_no_key("FRED_API_KEY"), reason="FRED_API_KEY no configurada")
def test_fred_live_unrate():
    from etl.sources.markets.fred_client import latest_value

    v = latest_value("UNRATE")
    assert v is not None
    assert v["series_id"] == "UNRATE"
    assert v["title"] is not None
    # UNRATE entre 2% y 25% históricamente (sanity check generosa)
    if v["value"] is not None:
        assert 2.0 <= v["value"] <= 25.0
