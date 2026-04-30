"""
Registro de conectores por tipo de fuente.

Mapea el campo `type` de IngestionSourceConfig al conector correspondiente.

Para registrar un nuevo conector:
    1. Crea la clase en etl/sources/<dominio>/<modulo>.py heredando de DataSourceConnector.
    2. Importala aqui y añadela a CONNECTOR_REGISTRY.
"""
from __future__ import annotations

import logging
from typing import Type

from etl.sources.base_connector import DataSourceConnector

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Conector BOE real (Bloque 3)
# ---------------------------------------------------------------------------
try:
    from etl.sources.spain.boe import BOEConnector  # type: ignore[import]
    _BOE_CLS: Type[DataSourceConnector] = BOEConnector
except ImportError:
    from etl.sources.stubs import BOEConnector as _BOEStub  # type: ignore[assignment]
    _BOE_CLS = _BOEStub  # type: ignore[assignment]

# ---------------------------------------------------------------------------
# Conector RSS real (Bloque 3)
# ---------------------------------------------------------------------------
try:
    from etl.sources.media.rss import RSSMediaConnector  # type: ignore[import]
    _RSS_CLS: Type[DataSourceConnector] = RSSMediaConnector
except ImportError:
    from etl.sources.stubs import _StubConnector as _RSSBase  # type: ignore[import]

    class _RSSMediaConnectorFallback(_RSSBase):  # type: ignore[misc]
        _connector_type = "media_rss"

    _RSS_CLS = _RSSMediaConnectorFallback  # type: ignore[assignment]

# ---------------------------------------------------------------------------
# Conector CIS real (Bloque 3)
# ---------------------------------------------------------------------------
try:
    from etl.sources.polls.cis import CISPollsConnector  # type: ignore[import]
    _CIS_CLS: Type[DataSourceConnector] = CISPollsConnector
except ImportError:
    from etl.sources.stubs import CISPollsConnector as _CISStub  # type: ignore[assignment]
    _CIS_CLS = _CISStub  # type: ignore[assignment]

# ---------------------------------------------------------------------------
# Stubs para conectores pendientes
# ---------------------------------------------------------------------------
from etl.sources.stubs import (  # noqa: E402
    BOCGConnector,
    DemographicsINEConnector,
    ElectoralInteriorConnector,
    EuroparlAgendaConnector,
)

CONNECTOR_REGISTRY: dict[str, Type[DataSourceConnector]] = {
    # --- Legislacion ---
    "legislation_boe":     _BOE_CLS,
    "legislation_bocg":    BOCGConnector,
    # --- Medios ---
    "media_rss":           _RSS_CLS,
    # --- Encuestas ---
    "polls_cis":           _CIS_CLS,
    # --- Electoral ---
    "electoral_interior":  ElectoralInteriorConnector,
    # --- Demograficos ---
    "demographics_ine":    DemographicsINEConnector,
    # --- Europeos ---
    "europarl_agenda":     EuroparlAgendaConnector,
}


def get_connector_class(source_type: str) -> Type[DataSourceConnector] | None:
    """Devuelve la clase de conector para el tipo indicado, o None si no esta registrado."""
    cls = CONNECTOR_REGISTRY.get(source_type)
    if cls is None:
        logger.warning("Tipo de fuente '%s' no tiene conector registrado", source_type)
    return cls
