"""
Portal Registry — Bloque 10.

Catálogo de portales de datos abiertos.
Seed de portales oficiales nacionales, UE, autonómicos y municipales.

Funciones:
  seed_default_portals, list_portals, get_portal,
  detect_portal_type, upsert_portal.
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.opendata.schemas import OpenDataPortal

logger = logging.getLogger(__name__)

# ── Caché en memoria ───────────────────────────────────────────────────────────
_PORTAL_CACHE: dict[str, OpenDataPortal] = {}


# ── Portales predefinidos ──────────────────────────────────────────────────────

_DEFAULT_PORTALS: list[dict] = [
    # ── UE / Europa ────────────────────────────────────────────────────────────
    {
        "portal_id": "eurostat",
        "name": "Eurostat",
        "administration_level": "eu",
        "country": "EU",
        "portal_type": "custom_api",
        "base_url": "https://ec.europa.eu/eurostat",
        "api_url": "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1",
        "language": "en",
    },
    {
        "portal_id": "eurlex",
        "name": "EUR-Lex",
        "administration_level": "eu",
        "country": "EU",
        "portal_type": "sparql",
        "base_url": "https://eur-lex.europa.eu",
        "api_url": "https://publications.europa.eu/webapi/rdf/sparql",
        "language": "es",
    },
    {
        "portal_id": "eu_open_data",
        "name": "Portal de Datos Abiertos de la UE",
        "administration_level": "eu",
        "country": "EU",
        "portal_type": "ckan",
        "base_url": "https://data.europa.eu",
        "api_url": "https://data.europa.eu/api/hub/search",
        "language": "es",
    },
    # ── Nacional ───────────────────────────────────────────────────────────────
    {
        "portal_id": "datos_gob_es",
        "name": "datos.gob.es",
        "administration_level": "national",
        "country": "ES",
        "portal_type": "ckan",
        "base_url": "https://datos.gob.es",
        "api_url": "https://datos.gob.es/apidata",
        "language": "es",
    },
    {
        "portal_id": "ine",
        "name": "INE — Instituto Nacional de Estadística",
        "administration_level": "agency",
        "country": "ES",
        "portal_type": "custom_api",
        "base_url": "https://www.ine.es",
        "api_url": "https://servicios.ine.es/wstempus/js/ES",
        "language": "es",
    },
    {
        "portal_id": "boe",
        "name": "BOE — Boletín Oficial del Estado",
        "administration_level": "national",
        "country": "ES",
        "portal_type": "custom_api",
        "base_url": "https://www.boe.es",
        "api_url": "https://www.boe.es/datosabiertos/api",
        "language": "es",
    },
    {
        "portal_id": "congreso",
        "name": "Congreso de los Diputados",
        "administration_level": "national",
        "country": "ES",
        "portal_type": "custom_api",
        "base_url": "https://www.congreso.es",
        "api_url": "https://api.congreso.es",
        "language": "es",
    },
    {
        "portal_id": "senado",
        "name": "Senado de España",
        "administration_level": "national",
        "country": "ES",
        "portal_type": "html_catalog",
        "base_url": "https://www.senado.es",
        "api_url": None,
        "language": "es",
    },
    {
        "portal_id": "bde",
        "name": "Banco de España",
        "administration_level": "agency",
        "country": "ES",
        "portal_type": "custom_api",
        "base_url": "https://www.bde.es",
        "api_url": "https://www.bde.es/webbe/es/estadisticas/compartido/datos/api",
        "language": "es",
    },
    {
        "portal_id": "cnmv",
        "name": "CNMV — Comisión Nacional del Mercado de Valores",
        "administration_level": "agency",
        "country": "ES",
        "portal_type": "custom_api",
        "base_url": "https://www.cnmv.es",
        "api_url": "https://www.cnmv.es/portal/Consultas/API.aspx",
        "language": "es",
    },
    {
        "portal_id": "cnmc",
        "name": "CNMC — Comisión Nacional de Mercados y la Competencia",
        "administration_level": "agency",
        "country": "ES",
        "portal_type": "custom_api",
        "base_url": "https://www.cnmc.es",
        "api_url": "https://www.cnmc.es/api",
        "language": "es",
    },
    {
        "portal_id": "place",
        "name": "PLACE — Contratación Pública",
        "administration_level": "national",
        "country": "ES",
        "portal_type": "bulk_files",
        "base_url": "https://contrataciondelestado.es",
        "api_url": "https://contrataciondelestado.es/sindicacion",
        "language": "es",
    },
    {
        "portal_id": "transparencia",
        "name": "Portal de Transparencia del Gobierno",
        "administration_level": "national",
        "country": "ES",
        "portal_type": "custom_api",
        "base_url": "https://transparencia.gob.es",
        "api_url": "https://transparencia.gob.es/api",
        "language": "es",
    },
    # ── Autonómicos ────────────────────────────────────────────────────────────
    {
        "portal_id": "andalucia_open_data",
        "name": "Junta de Andalucía — Datos Abiertos",
        "administration_level": "autonomous",
        "country": "ES",
        "region": "Andalucía",
        "portal_type": "ckan",
        "base_url": "https://www.juntadeandalucia.es/datosabiertos",
        "api_url": "https://www.juntadeandalucia.es/datosabiertos/api",
        "language": "es",
    },
    {
        "portal_id": "catalunya_open_data",
        "name": "Generalitat de Catalunya — Dades Obertes",
        "administration_level": "autonomous",
        "country": "ES",
        "region": "Cataluña",
        "portal_type": "custom_api",
        "base_url": "https://analisi.transparenciacatalunya.cat",
        "api_url": "https://analisi.transparenciacatalunya.cat/api",
        "language": "ca",
    },
    {
        "portal_id": "euskadi_open_data",
        "name": "Gobierno Vasco — Open Data Euskadi",
        "administration_level": "autonomous",
        "country": "ES",
        "region": "País Vasco",
        "portal_type": "ckan",
        "base_url": "https://opendata.euskadi.eus",
        "api_url": "https://opendata.euskadi.eus/api",
        "language": "es",
    },
    {
        "portal_id": "valencia_open_data",
        "name": "Generalitat Valenciana — Dades Obertes",
        "administration_level": "autonomous",
        "country": "ES",
        "region": "Comunidad Valenciana",
        "portal_type": "ckan",
        "base_url": "https://dadesobertes.gva.es",
        "api_url": "https://dadesobertes.gva.es/api",
        "language": "es",
    },
    {
        "portal_id": "galicia_open_data",
        "name": "Xunta de Galicia — Datos Abertos",
        "administration_level": "autonomous",
        "country": "ES",
        "region": "Galicia",
        "portal_type": "ckan",
        "base_url": "https://abertos.xunta.gal",
        "api_url": "https://abertos.xunta.gal/api",
        "language": "gl",
    },
    # ── Municipal ──────────────────────────────────────────────────────────────
    {
        "portal_id": "madrid_open_data",
        "name": "Ayuntamiento de Madrid — Portal de Datos Abiertos",
        "administration_level": "municipal",
        "country": "ES",
        "region": "Madrid",
        "municipality": "Madrid",
        "portal_type": "ckan",
        "base_url": "https://datos.madrid.es",
        "api_url": "https://datos.madrid.es/api",
        "language": "es",
    },
    {
        "portal_id": "barcelona_open_data",
        "name": "Ajuntament de Barcelona — Open Data BCN",
        "administration_level": "municipal",
        "country": "ES",
        "region": "Cataluña",
        "municipality": "Barcelona",
        "portal_type": "ckan",
        "base_url": "https://opendata-ajuntament.barcelona.cat",
        "api_url": "https://opendata-ajuntament.barcelona.cat/data/api",
        "language": "es",
    },
]


# ── Funciones ──────────────────────────────────────────────────────────────────

def seed_default_portals(engine: Any = None) -> int:
    """
    Registra los portales por defecto en caché y opcionalmente en BD.

    Returns:
        Número de portales registrados.
    """
    count = 0
    for pdata in _DEFAULT_PORTALS:
        portal = OpenDataPortal(**pdata)
        _PORTAL_CACHE[portal.portal_id] = portal
        count += 1

    if engine is not None:
        try:
            import json
            from sqlalchemy import text as sa_text
            with engine.begin() as conn:
                for pid, portal in _PORTAL_CACHE.items():
                    conn.execute(sa_text("""
                        INSERT INTO open_data_portals (
                            portal_id, name, administration_level, country, region,
                            municipality, portal_type, base_url, api_url,
                            language, active, metadata
                        ) VALUES (
                            :portal_id, :name, :admin_level, :country, :region,
                            :municipality, :portal_type, :base_url, :api_url,
                            :language, :active, :metadata::jsonb
                        )
                        ON CONFLICT (portal_id) DO UPDATE SET
                            name = EXCLUDED.name,
                            active = EXCLUDED.active,
                            updated_at = NOW()
                    """), {
                        "portal_id": portal.portal_id,
                        "name": portal.name,
                        "admin_level": portal.administration_level,
                        "country": portal.country,
                        "region": portal.region,
                        "municipality": portal.municipality,
                        "portal_type": portal.portal_type,
                        "base_url": portal.base_url,
                        "api_url": portal.api_url,
                        "language": portal.language,
                        "active": portal.active,
                        "metadata": json.dumps(portal.metadata),
                    })
        except Exception as exc:
            logger.debug("seed_default_portals DB: %s", exc)

    logger.info("seed_default_portals: %d portales registrados", count)
    return count


def list_portals(
    active_only: bool = True,
    administration_level: str | None = None,
    country: str | None = None,
    engine: Any = None,
) -> list[OpenDataPortal]:
    """Lista portales registrados."""
    # Asegurar que el seed está cargado
    if not _PORTAL_CACHE:
        seed_default_portals(engine=engine)

    portals = list(_PORTAL_CACHE.values())

    if active_only:
        portals = [p for p in portals if p.active]
    if administration_level:
        portals = [p for p in portals if p.administration_level == administration_level]
    if country:
        portals = [p for p in portals if p.country == country]

    return portals


def get_portal(portal_id: str, engine: Any = None) -> OpenDataPortal | None:
    """Recupera un portal por ID."""
    if not _PORTAL_CACHE:
        seed_default_portals(engine=engine)
    return _PORTAL_CACHE.get(portal_id)


def upsert_portal(portal: OpenDataPortal, engine: Any = None) -> None:
    """Registra o actualiza un portal en caché y BD."""
    _PORTAL_CACHE[portal.portal_id] = portal

    if engine is not None:
        try:
            import json
            from sqlalchemy import text as sa_text
            with engine.begin() as conn:
                conn.execute(sa_text("""
                    INSERT INTO open_data_portals (
                        portal_id, name, administration_level, country,
                        portal_type, base_url, api_url, active, metadata
                    ) VALUES (
                        :portal_id, :name, :admin_level, :country,
                        :portal_type, :base_url, :api_url, :active, :metadata::jsonb
                    )
                    ON CONFLICT (portal_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        active = EXCLUDED.active,
                        updated_at = NOW()
                """), {
                    "portal_id": portal.portal_id,
                    "name": portal.name,
                    "admin_level": portal.administration_level,
                    "country": portal.country,
                    "portal_type": portal.portal_type,
                    "base_url": portal.base_url,
                    "api_url": portal.api_url,
                    "active": portal.active,
                    "metadata": json.dumps(portal.metadata),
                })
        except Exception as exc:
            logger.debug("upsert_portal DB: %s", exc)


def detect_portal_type(base_url: str, api_url: str | None = None) -> str:
    """
    Detecta el tipo de portal a partir de sus URLs.

    Heurística: si la URL de API menciona /api/3/action → CKAN.
    """
    urls = [base_url or "", api_url or ""]
    combined = " ".join(urls).lower()

    if "sparql" in combined or "cellar" in combined:
        return "sparql"
    if "api/3/action" in combined or "/api/action" in combined:
        return "ckan"
    if "socrata" in combined or ".data.socrata" in combined:
        return "socrata"
    if "rss" in combined or "feed" in combined:
        return "rss"
    if "sdmx" in combined or "wstempus" in combined:
        return "custom_api"
    if base_url and any(base_url.endswith(ext) for ext in (".csv", ".xlsx", ".zip")):
        return "bulk_files"
    return "unknown"
