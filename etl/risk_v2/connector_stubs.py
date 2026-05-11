"""
Stubs honestos para fuentes que requieren auth/setup pesado o configuración manual.

Cada stub:
  - is_stub = True (marcado claramente)
  - fetch() devuelve [] (sin inventarse datos)
  - actualiza last_error explicando lo que falta

Cuando se configure el setup real (api_key, pip install, etc.), se sustituye
el `fetch()` por la implementación real sin tocar nada más.
"""
from __future__ import annotations

import logging
import os

from .base import RawValue, RiskV2Connector

logger = logging.getLogger(__name__)


class ACLEDConnector(RiskV2Connector):
    """Requiere ACLED_API_KEY + ACLED_EMAIL. Documentación:
    https://acleddata.com/acled-api/"""
    source_id = "acled"
    is_stub = True

    def fetch(self) -> list[RawValue]:
        if not (os.getenv("ACLED_API_KEY") and os.getenv("ACLED_EMAIL")):
            raise RuntimeError("missing_credentials: set ACLED_API_KEY + ACLED_EMAIL")
        return []  # TODO: implement real ACLED fetch when creds are in place


class GDELTConnector(RiskV2Connector):
    """Requiere Google Cloud SDK + permisos BigQuery (gdelt-bq.gdeltv2.events)."""
    source_id = "gdelt"
    is_stub = True

    def fetch(self) -> list[RawValue]:
        if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            raise RuntimeError("missing_credentials: GOOGLE_APPLICATION_CREDENTIALS not set")
        return []


class VDemConnector(RiskV2Connector):
    """Requiere `pip install vdemdata`. Anual.
    Documentación: https://v-dem.net/data/the-v-dem-dataset/"""
    source_id = "vdem"
    is_stub = True

    def fetch(self) -> list[RawValue]:
        try:
            import vdemdata  # noqa: F401
        except ImportError:
            raise RuntimeError("missing_dependency: pip install vdemdata")
        return []


class CISConnector(RiskV2Connector):
    """CIS Barómetros mensuales. Requiere scraping de https://www.cis.es/ y
    parsing de los Excel mensuales. Pendiente de implementación."""
    source_id = "cis"
    is_stub = True

    def fetch(self) -> list[RawValue]:
        raise RuntimeError("not_implemented: CIS barómetro parsing pending")


class RSUIConnector(RiskV2Connector):
    """Reported Social Unrest Index (Philip Barrett, FMI). CSV mensual.
    URL real cambia; pendiente confirmar enlace estable."""
    source_id = "rsui"
    is_stub = True

    def fetch(self) -> list[RawValue]:
        raise RuntimeError("not_implemented: RSUI CSV URL needs verification")


class IDEAConnector(RiskV2Connector):
    """IDEA Electoral Integrity. Requiere registro free en https://www.idea.int/"""
    source_id = "idea_pei"
    is_stub = True

    def fetch(self) -> list[RawValue]:
        raise RuntimeError("not_implemented: requires IDEA registration")


class RSFConnector(RiskV2Connector):
    """RSF Press Freedom Index. Anual. Scraping de https://rsf.org/en/index"""
    source_id = "rsf"
    is_stub = True

    def fetch(self) -> list[RawValue]:
        raise RuntimeError("not_implemented: RSF scraping pending")
