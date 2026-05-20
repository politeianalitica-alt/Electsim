"""Módulo Puertos & Comercio Global · MVP Sprint 1.

Clona el patrón de `etl/sources/commodities` (Vesper) para inteligencia
de comercio físico mundial. Cubre 4 secciones del roadmap original:

  1. Flujos físicos · AIS (puertos/buques), congestión, port calls
  2. Comercio declarado · UN Comtrade + Eurostat Comext
  3. Fletes & corredores · Baltic Dry, freight rates, chokepoints (Suez/Ormuz/Bósforo)
  4. Sanciones marítimas · screening de buques/operadores contra OFAC/OpenSanctions

Reusa:
  - `etl/sources/commodities/prices.py:YahooFinanceClient` para freight indices
  - `etl/sources/commodities/forecast_client.py` para forecasts (Sprint 2)
  - `etl/ingestion/connectors/eurostat_connector.py` para Comext
  - `etl/sources/osint/opensanctions_client.py` para screening
  - `etl/sources/geopolitics/acled_client.py` para chokepoints events
  - `etl/sources/commodities/rule_engine.py` y `rule_templates.py` (extendido)

Sin red por defecto: cada cliente degrada a seed/demo si la env var asociada
(AISSTREAM_API_KEY, COMTRADE_API_KEY) no está configurada.
"""
from .catalog import (
    CATEGORIES_PORTS,
    PORT_TYPES,
    PORTS,
    get_port,
    list_ports,
)
from .vessels_seed import (
    VESSEL_TYPES,
    VESSELS,
    get_vessel,
    list_vessels,
)

__all__ = [
    "PORTS",
    "PORT_TYPES",
    "CATEGORIES_PORTS",
    "list_ports",
    "get_port",
    "VESSELS",
    "VESSEL_TYPES",
    "list_vessels",
    "get_vessel",
]
