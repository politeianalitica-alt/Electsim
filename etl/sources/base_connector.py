"""
Interfaz base para conectores de nueva generacion (async, orientados a mercado).

Coexiste con BaseExtractor (etl/base_extractor.py) y BaseConnector (etl/connectors/base.py),
que siguen activos para scrapers legacy. Los conectores nuevos deben heredar de
DataSourceConnector.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, AsyncIterator, Dict, Optional


class RawItem(Dict[str, Any]):
    """Alias tipado para items en bruto procedentes de una fuente."""


class NormalizedItem(Dict[str, Any]):
    """Item normalizado al modelo comun antes de pasar por el pipeline NLP."""


class DataSourceConnector(ABC):
    """
    Interfaz async para conectores de fuentes de datos orientados a mercado.

    Ciclo de vida:
        items = connector.fetch_items(since=...)
        for raw in items:
            normalized = await connector.normalize(raw)
            # -> pipeline NLP + ontologia
    """

    def __init__(self, source_id: str, params: Dict[str, Any]) -> None:
        self.source_id = source_id
        self.params = params

    @abstractmethod
    async def fetch_items(self, since: Optional[datetime] = None) -> AsyncIterator[RawItem]:
        """
        Obtiene items en bruto de la fuente.

        Args:
            since: Si se indica, solo items posteriores a esta fecha.

        Yields:
            RawItem — diccionario con los campos originales de la fuente.
        """

    @abstractmethod
    async def normalize(self, item: RawItem) -> NormalizedItem:
        """
        Convierte un RawItem al esquema normalizado comun.

        El esquema minimo esperado en NormalizedItem:
            source_id (str)
            source_type (str)
            external_id (str)
            title (str)
            content (str | None)
            published_at (str | None, ISO 8601)
            url (str | None)
            metadata (dict)
        """

    async def healthcheck(self) -> bool:
        """
        Comprueba que la fuente es accesible.
        Implementacion por defecto: siempre True (sobreescribir si se puede).
        """
        return True

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(source_id={self.source_id!r})"
