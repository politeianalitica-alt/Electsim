"""
Conectores stub para tipos de fuente aun no implementados.
Permiten que la fabrica de conectores funcione sin errores mientras
los conectores reales se desarrollan en el Bloque 3.

Cada stub logga una advertencia cuando se intenta hacer fetch.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, AsyncIterator, Optional

from etl.sources.base_connector import DataSourceConnector, NormalizedItem, RawItem

logger = logging.getLogger(__name__)


class _StubConnector(DataSourceConnector):
    """Base para stubs: fetch_items no devuelve nada y loggea aviso."""

    _connector_type: str = "stub"

    async def fetch_items(self, since: Optional[datetime] = None) -> AsyncIterator[RawItem]:
        logger.warning(
            "Conector stub '%s' (tipo '%s') llamado — no hay implementacion real aun. "
            "Implementa el conector en Bloque 3.",
            self.source_id,
            self._connector_type,
        )
        return
        yield  # hace que sea un generator valido

    async def normalize(self, item: RawItem) -> NormalizedItem:
        return NormalizedItem(
            source_id=self.source_id,
            source_type=self._connector_type,
            external_id=str(item.get("id", "")),
            title=str(item.get("title", "")),
            content=None,
            published_at=None,
            url=None,
            metadata=dict(item),
        )


class BOEConnector(_StubConnector):
    _connector_type = "legislation_boe"


class BOCGConnector(_StubConnector):
    _connector_type = "legislation_bocg"


class CISPollsConnector(_StubConnector):
    _connector_type = "polls_cis"


class ElectoralInteriorConnector(_StubConnector):
    _connector_type = "electoral_interior"


class DemographicsINEConnector(_StubConnector):
    _connector_type = "demographics_ine"


class EuroparlAgendaConnector(_StubConnector):
    _connector_type = "europarl_agenda"
