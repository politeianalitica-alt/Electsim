"""Conectores de mercados financieros + macro:

  - Alpha Vantage · stocks, forex, commodities intraday/daily
  - FRED · macro USA (GDP, inflación, paro, tipos)

Complementa a `etl/sources/commodities/prices.py:YahooFinanceClient` (que
sigue siendo el cliente preferido por su gratuidad ilimitada). Alpha Vantage
y FRED aportan datos no disponibles en Yahoo: indicadores técnicos
pre-calculados (RSI/MACD/Bollinger) y series macro oficiales del Fed.
"""
