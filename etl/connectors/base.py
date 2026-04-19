from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path


class BaseConnector(ABC):
    source_name: str

    @abstractmethod
    def ingest_batch(self, since: str | None = None) -> Path:
        """Descarga datos crudos al directorio RAW y devuelve la ruta."""

    def ingest_stream(self) -> None:
        """Opcional: stream en tiempo real para fuentes con websocket/api de eventos."""
        raise NotImplementedError(f"{self.__class__.__name__} no soporta ingest_stream")
