"""
CatalogLoader — carga el catalogo dinamico desde la base de datos.

Principio: todo es datos, nada es if pais == 'ES'.
La logica de que modulos/fuentes aplican a un workspace se lee de DB,
no de constantes Python.

Uso:
    from db.session import get_session
    from config.catalog_loader import CatalogLoader

    with get_session() as session:
        loader = CatalogLoader(session)
        ctx = loader.resolve_workspace_context(
            market_id="ES",
            sector_ids=["PARTY", "MEDIA"],
            product_ids=["PARTY_WARROOM_ES"],
            modules_enabled=["MONITOR_LEGISLATIVO", "ELECTSIM"],
            sources_enabled_overrides={"ACLED": False},
        )
        print(ctx.module_ids)
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from config.catalog_models import (
    CatalogMarket,
    CatalogModule,
    CatalogProduct,
    CatalogSector,
    CatalogSource,
    WorkspaceCatalogContext,
)

logger = logging.getLogger(__name__)


class MarketNotInCatalogError(Exception):
    """El market_id solicitado no existe en catalog_market."""


class CatalogLoader:
    """
    Lee el catalogo dinamico de la DB y resuelve contextos de workspace.

    Todos los metodos son de solo lectura.
    El cache en memoria dura el tiempo de vida del objeto (tipicamente un request).
    Para invalidar el cache entre requests, crear una nueva instancia.
    """

    def __init__(self, session: Session) -> None:
        self._session = session
        self._market_cache: Dict[str, CatalogMarket] = {}
        self._sector_cache: Dict[str, CatalogSector] = {}
        self._module_cache: Dict[str, CatalogModule] = {}
        self._product_cache: Dict[str, CatalogProduct] = {}
        self._source_cache: Dict[str, CatalogSource] = {}

    # ------------------------------------------------------------------
    # Busqueda individual
    # ------------------------------------------------------------------

    def get_market(self, market_id: str) -> CatalogMarket:
        """Devuelve un mercado por su ID. Lanza MarketNotInCatalogError si no existe."""
        if market_id not in self._market_cache:
            row = self._session.execute(
                text("SELECT * FROM catalog_market WHERE market_id = :mid LIMIT 1"),
                {"mid": market_id},
            ).mappings().fetchone()
            if row is None:
                raise MarketNotInCatalogError(
                    f"Mercado '{market_id}' no encontrado en catalog_market. "
                    f"Mercados disponibles: {self.list_market_ids()}"
                )
            self._market_cache[market_id] = CatalogMarket.model_validate(
                _parse_json_fields(dict(row), _MARKET_JSON_FIELDS)
            )
        return self._market_cache[market_id]

    def get_sector(self, sector_id: str) -> Optional[CatalogSector]:
        """Devuelve un sector por su ID, o None si no existe."""
        if sector_id not in self._sector_cache:
            row = self._session.execute(
                text("SELECT * FROM catalog_sector WHERE sector_id = :sid LIMIT 1"),
                {"sid": sector_id},
            ).mappings().fetchone()
            if row is None:
                return None
            self._sector_cache[sector_id] = CatalogSector.model_validate(
                _parse_json_fields(dict(row), _SECTOR_JSON_FIELDS)
            )
        return self._sector_cache[sector_id]

    def get_module(self, module_id: str) -> Optional[CatalogModule]:
        """Devuelve un modulo por su ID, o None si no existe."""
        if module_id not in self._module_cache:
            row = self._session.execute(
                text("SELECT * FROM catalog_module WHERE module_id = :mid LIMIT 1"),
                {"mid": module_id},
            ).mappings().fetchone()
            if row is None:
                return None
            self._module_cache[module_id] = CatalogModule.model_validate(
                _parse_json_fields(dict(row), _MODULE_JSON_FIELDS)
            )
        return self._module_cache[module_id]

    def get_product(self, product_id: str) -> Optional[CatalogProduct]:
        """Devuelve un producto por su ID, o None si no existe."""
        if product_id not in self._product_cache:
            row = self._session.execute(
                text("SELECT * FROM catalog_product WHERE product_id = :pid LIMIT 1"),
                {"pid": product_id},
            ).mappings().fetchone()
            if row is None:
                return None
            self._product_cache[product_id] = CatalogProduct.model_validate(
                _parse_json_fields(dict(row), _PRODUCT_JSON_FIELDS)
            )
        return self._product_cache[product_id]

    def get_source(self, source_id: str) -> Optional[CatalogSource]:
        """Devuelve una fuente por su ID, o None si no existe."""
        if source_id not in self._source_cache:
            row = self._session.execute(
                text("SELECT * FROM catalog_source WHERE source_id = :sid LIMIT 1"),
                {"sid": source_id},
            ).mappings().fetchone()
            if row is None:
                return None
            self._source_cache[source_id] = CatalogSource.model_validate(
                _parse_json_fields(dict(row), _SOURCE_JSON_FIELDS)
            )
        return self._source_cache[source_id]

    # ------------------------------------------------------------------
    # Listados completos
    # ------------------------------------------------------------------

    def list_markets(self, enabled_only: bool = True) -> List[CatalogMarket]:
        """Devuelve todos los mercados, opcionalmente solo los activos."""
        where = "WHERE enabled = true" if enabled_only else ""
        rows = self._session.execute(
            text(f"SELECT * FROM catalog_market {where} ORDER BY market_id")
        ).mappings().fetchall()
        return [
            CatalogMarket.model_validate(_parse_json_fields(dict(r), _MARKET_JSON_FIELDS))
            for r in rows
        ]

    def list_market_ids(self, enabled_only: bool = True) -> List[str]:
        where = "WHERE enabled = true" if enabled_only else ""
        rows = self._session.execute(
            text(f"SELECT market_id FROM catalog_market {where} ORDER BY market_id")
        ).fetchall()
        return [r[0] for r in rows]

    def list_sectors(
        self,
        market_id: Optional[str] = None,
        enabled_only: bool = True,
    ) -> List[CatalogSector]:
        """Devuelve sectores, opcionalmente filtrados por mercado.

        El filtro de mercado se aplica en Python tras la carga para compatibilidad
        con SQLite (tests) y PostgreSQL (produccion) sin operadores JSONB especificos.
        """
        where = "WHERE enabled = true" if enabled_only else ""
        rows = self._session.execute(
            text(f"SELECT * FROM catalog_sector {where} ORDER BY sector_id"),
        ).mappings().fetchall()
        sectors = [
            CatalogSector.model_validate(_parse_json_fields(dict(r), _SECTOR_JSON_FIELDS))
            for r in rows
        ]
        if market_id:
            sectors = [s for s in sectors if s.applies_to_market(market_id)]
        return sectors

    def list_modules(
        self,
        market_id: Optional[str] = None,
        sector_ids: Optional[List[str]] = None,
        enabled_only: bool = True,
    ) -> List[CatalogModule]:
        """Devuelve modulos aplicables al mercado y/o sectores dados."""
        where = "WHERE enabled = true" if enabled_only else ""
        rows = self._session.execute(
            text(f"SELECT * FROM catalog_module {where} ORDER BY module_id"),
        ).mappings().fetchall()
        modules = [
            CatalogModule.model_validate(_parse_json_fields(dict(r), _MODULE_JSON_FIELDS))
            for r in rows
        ]
        if market_id:
            modules = [m for m in modules if
                       "*" in m.applicable_markets or market_id in m.applicable_markets]
        if sector_ids:
            modules = [m for m in modules if any(
                "*" in m.applicable_sectors or s in m.applicable_sectors
                for s in sector_ids
            )]
        return modules

    def list_sources(
        self,
        market_id: Optional[str] = None,
        sector_ids: Optional[List[str]] = None,
        kind: Optional[str] = None,
        enabled_only: bool = True,
    ) -> List[CatalogSource]:
        """Devuelve fuentes aplicables al mercado/sector dados."""
        clauses = ["enabled = true"] if enabled_only else []
        params: Dict[str, Any] = {}
        if kind:
            clauses.append("kind = :kind")
            params["kind"] = kind
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        rows = self._session.execute(
            text(f"SELECT * FROM catalog_source {where} ORDER BY source_id"),
            params,
        ).mappings().fetchall()
        sources = [
            CatalogSource.model_validate(_parse_json_fields(dict(r), _SOURCE_JSON_FIELDS))
            for r in rows
        ]
        if market_id:
            sources = [s for s in sources if s.applies_to_market(market_id)]
        if sector_ids:
            sources = [s for s in sources if any(
                "*" in s.applicable_sectors or sec in s.applicable_sectors
                for sec in sector_ids
            )]
        return sources

    def list_products(
        self,
        market_id: Optional[str] = None,
        sector_ids: Optional[List[str]] = None,
        is_dlc: Optional[bool] = None,
        enabled_only: bool = True,
    ) -> List[CatalogProduct]:
        """Devuelve productos compatibles con el mercado/sector dados."""
        clauses = ["enabled = true"] if enabled_only else []
        params: Dict[str, Any] = {}
        if is_dlc is not None:
            clauses.append("is_dlc = :is_dlc")
            params["is_dlc"] = is_dlc
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        rows = self._session.execute(
            text(f"SELECT * FROM catalog_product {where} ORDER BY product_id"),
            params,
        ).mappings().fetchall()
        products = [
            CatalogProduct.model_validate(_parse_json_fields(dict(r), _PRODUCT_JSON_FIELDS))
            for r in rows
        ]
        if market_id:
            products = [p for p in products if
                        "*" in p.target_markets or market_id in p.target_markets]
        if sector_ids:
            products = [p for p in products if any(
                "*" in p.target_sectors or s in p.target_sectors
                for s in sector_ids
            )]
        return products

    # ------------------------------------------------------------------
    # Resolucion de contexto de workspace
    # ------------------------------------------------------------------

    def resolve_workspace_context(
        self,
        *,
        market_id: str,
        sector_ids: List[str],
        product_ids: List[str],
        modules_enabled: List[str],
        sources_enabled_overrides: Dict[str, bool],
        data_retention_days: int = 365,
        alert_prefs: Optional[Dict[str, Any]] = None,
    ) -> WorkspaceCatalogContext:
        """
        Construye el contexto de catalogo resuelto para un workspace.

        Algoritmo:
          1. Carga el mercado (lanza error si no existe).
          2. Carga los sectores declarados en sector_ids.
          3. Calcula los modulos activos:
               - Parte de modules_enabled (lista explicita del workspace)
               - Solo incluye modulos que aplican al mercado + sectores
          4. Calcula las fuentes activas:
               - Todas las fuentes aplicables al mercado + sectores
               - Aplica sources_enabled_overrides (True = forzar ON, False = forzar OFF)
               - Excluye fuentes con requires_api_key sin clave configurada
          5. Carga los productos declarados en product_ids.
          6. Devuelve WorkspaceCatalogContext.

        Args:
            market_id:                  ID del mercado del workspace ('ES', 'EU', ...).
            sector_ids:                 Lista de sectores del workspace (['PARTY', 'MEDIA']).
            product_ids:                Lista de IDs de productos activos.
            modules_enabled:            Lista explicita de module_ids activos en el workspace.
            sources_enabled_overrides:  {source_id: True/False} para forzar on/off por fuente.
            data_retention_days:        Dias de retencion de datos del workspace.
            alert_prefs:                Preferencias de alertas del workspace.

        Returns:
            WorkspaceCatalogContext con mercado, sectores, modulos, fuentes y productos resueltos.
        """
        market = self.get_market(market_id)

        sectors = []
        for sid in sector_ids:
            sector = self.get_sector(sid)
            if sector and sector.enabled:
                sectors.append(sector)

        # Modulos: los declarados en modules_enabled que aplican al contexto
        active_modules: List[CatalogModule] = []
        for mid in modules_enabled:
            module = self.get_module(mid)
            if module and module.enabled and module.applies_to(market_id, sector_ids[0] if sector_ids else "*"):
                active_modules.append(module)

        # Fuentes: todas las aplicables al mercado+sectores, con overrides
        candidate_sources = self.list_sources(
            market_id=market_id,
            sector_ids=sector_ids if sector_ids else None,
        )
        active_sources: List[CatalogSource] = []
        for source in candidate_sources:
            forced = sources_enabled_overrides.get(source.source_id)
            if forced is False:
                continue
            active_sources.append(source)

        # Fuentes forzadas ON aunque no apliquen por defecto al mercado/sector
        for source_id, forced_on in sources_enabled_overrides.items():
            if forced_on is True:
                already = any(s.source_id == source_id for s in active_sources)
                if not already:
                    source = self.get_source(source_id)
                    if source and source.enabled:
                        active_sources.append(source)

        # Productos
        active_products: List[CatalogProduct] = []
        for pid in product_ids:
            product = self.get_product(pid)
            if product and product.enabled:
                active_products.append(product)

        logger.debug(
            "Contexto workspace resuelto: market=%s sectors=%s modules=%d sources=%d products=%d",
            market_id, sector_ids, len(active_modules), len(active_sources), len(active_products),
        )

        return WorkspaceCatalogContext(
            market=market,
            sectors=sectors,
            active_modules=active_modules,
            active_products=active_products,
            active_sources=active_sources,
            data_retention_days=data_retention_days,
            alert_prefs=alert_prefs or {},
        )

    # ------------------------------------------------------------------
    # Helpers para provisioning
    # ------------------------------------------------------------------

    def modules_for_product(self, product_id: str) -> List[CatalogModule]:
        """
        Devuelve los modulos definidos en el catalogo para un producto.
        Util en TenantProvisioningService para activar modulos al crear un workspace.
        """
        product = self.get_product(product_id)
        if not product:
            return []
        modules = []
        for mid in product.default_modules:
            module = self.get_module(mid)
            if module and module.enabled:
                modules.append(module)
        return modules

    def sources_for_modules(self, module_ids: List[str]) -> List[CatalogSource]:
        """
        Devuelve el conjunto de fuentes requeridas por los modulos dados.
        Util para provisioning: saber que fuentes hay que habilitar.
        """
        required_source_ids: set[str] = set()
        for mid in module_ids:
            module = self.get_module(mid)
            if module:
                required_source_ids.update(module.required_sources)

        sources = []
        for sid in sorted(required_source_ids):
            source = self.get_source(sid)
            if source and source.enabled:
                sources.append(source)
        return sources


# ---------------------------------------------------------------------------
# Helpers de deserializacion
# ---------------------------------------------------------------------------

# Campos JSONB que pueden llegar como string desde SQLite (en tests) o como
# objeto Python desde PostgreSQL. Se parsean antes de pasar a model_validate.
_MARKET_JSON_FIELDS: tuple[str, ...] = ("meta",)
_SECTOR_JSON_FIELDS: tuple[str, ...] = ("naics_nace_codes", "applicable_markets", "meta")
_MODULE_JSON_FIELDS: tuple[str, ...] = (
    "required_entities", "required_sources", "required_features",
    "applicable_markets", "applicable_sectors", "meta",
)
_PRODUCT_JSON_FIELDS: tuple[str, ...] = (
    "default_modules", "target_markets", "target_sectors", "config_overrides", "meta",
)
_SOURCE_JSON_FIELDS: tuple[str, ...] = (
    "applicable_markets", "applicable_sectors", "config_json", "meta",
)


def _parse_json_fields(row: Dict[str, Any], fields: tuple[str, ...]) -> Dict[str, Any]:
    """
    Convierte los campos JSONB de string a objeto Python cuando es necesario.
    PostgreSQL ya devuelve dict/list; SQLite devuelve strings.
    Tambien convierte enteros (0/1) de SQLite a bool para campos booleanos.
    """
    result = dict(row)
    for field in fields:
        value = result.get(field)
        if isinstance(value, str):
            try:
                result[field] = json.loads(value)
            except (json.JSONDecodeError, ValueError):
                pass  # mantener el valor original si no es JSON valido
    # SQLite almacena booleans como 0/1
    for bool_field in ("enabled", "is_dlc", "requires_api_key"):
        if bool_field in result and isinstance(result[bool_field], int):
            result[bool_field] = bool(result[bool_field])
    return result
