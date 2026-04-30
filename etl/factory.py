"""
Fabrica de conectores ETL a partir de un MarketContext.

Uso tipico en el scheduler:
    from etl.factory import build_connectors_for_market
    from api.context.market_context import MarketContext

    connectors = build_connectors_for_market(market)
    for connector in connectors:
        async for raw in connector.fetch_items(since=last_run):
            normalized = await connector.normalize(raw)
            # -> pipeline NLP / ontologia
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from api.context.market_context import MarketContext
from config.market_models import IngestionSourceConfig
from etl.sources.base_connector import DataSourceConnector
from etl.sources.registry import get_connector_class

logger = logging.getLogger(__name__)


def build_connectors_for_market(
    market: MarketContext,
    only_enabled: bool = True,
    source_types: Optional[list[str]] = None,
) -> list[DataSourceConnector]:
    """
    Construye la lista de conectores activos para el mercado indicado.

    Args:
        market: Contexto del mercado con su configuracion.
        only_enabled: Si True (default), omite fuentes con enabled=False.
        source_types: Si se indica, filtra solo por esos tipos de fuente.

    Returns:
        Lista de DataSourceConnector listos para llamar a fetch_items().
    """
    connectors: list[DataSourceConnector] = []

    sources = market.config.enabled_sources if only_enabled else market.config.ingestion_sources

    for src in sources:
        if source_types and src.type not in source_types:
            continue

        connector_cls = get_connector_class(src.type)
        if connector_cls is None:
            logger.warning(
                "Mercado '%s': fuente '%s' (tipo '%s') no tiene conector. Se omite.",
                market.market_code,
                src.id,
                src.type,
            )
            continue

        # Enriquecer params con metadatos del mercado por si el conector los necesita
        enriched_params = {
            **src.params,
            "_market_code": market.market_code,
            "_source_id": src.id,
        }

        connector = connector_cls(source_id=src.id, params=enriched_params)
        connectors.append(connector)
        logger.debug(
            "Conector construido: %r (mercado=%s, tipo=%s)",
            connector,
            market.market_code,
            src.type,
        )

    logger.info(
        "Mercado '%s': %d conectores construidos (enabled_only=%s)",
        market.market_code,
        len(connectors),
        only_enabled,
    )
    return connectors


async def run_ingestion_cycle(
    market: MarketContext,
    since: Optional[datetime] = None,
    only_enabled: bool = True,
    source_types: Optional[list[str]] = None,
) -> dict[str, int]:
    """
    Ejecuta un ciclo de ingesta completo para el mercado.

    Devuelve un dict {source_id: n_items} con los items obtenidos.
    Este metodo es el punto de entrada para el scheduler Celery.
    """
    connectors = build_connectors_for_market(
        market,
        only_enabled=only_enabled,
        source_types=source_types,
    )

    results: dict[str, int] = {}

    for connector in connectors:
        count = 0
        try:
            async for raw in connector.fetch_items(since=since):
                normalized = await connector.normalize(raw)
                # TODO: enviar normalized al pipeline NLP + ontologia (Bloque 3)
                count += 1
        except Exception as exc:
            logger.error(
                "Error en ciclo de ingesta para fuente '%s': %s",
                connector.source_id,
                exc,
            )
        results[connector.source_id] = count

    return results
