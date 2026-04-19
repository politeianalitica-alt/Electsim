from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import MetaData, Table, select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import NoSuchTableError
from sqlalchemy.orm import Session

from ontology.metadata import ONTOLOGY_REGISTRY, LinkType, OntologyType


@dataclass(slots=True)
class OntologyObject:
    type: str
    id: str
    properties: dict[str, Any]


class OntologyStore:
    def __init__(self, session_factory, tenant_id: str = "default"):
        self.session_factory = session_factory
        self.tenant_id = tenant_id

    def _get_otype(self, type_: str) -> OntologyType:
        try:
            return ONTOLOGY_REGISTRY[type_]
        except KeyError as exc:
            raise ValueError(f"Unknown ontology type: {type_}") from exc

    def _table(self, session: Session, table_name: str) -> Table:
        bind = session.get_bind()
        if bind is None or not isinstance(bind, Engine):
            raise RuntimeError("No hay engine activo en la sesión")
        metadata = MetaData()
        try:
            return Table(table_name, metadata, autoload_with=bind)
        except NoSuchTableError as exc:
            raise RuntimeError(f"Tabla no encontrada: {table_name}") from exc

    def _tenant_column(self, table: Table):
        return table.c.get("tenant_id")

    def get_object(self, type_: str, id_: str) -> OntologyObject:
        otype = self._get_otype(type_)
        with self.session_factory() as session:
            table = self._table(session, otype.table)
            stmt = select(table).where(table.c[otype.pk_column] == id_)
            tenant_col = self._tenant_column(table)
            if tenant_col is not None:
                stmt = stmt.where(tenant_col == self.tenant_id)
            row = session.execute(stmt).mappings().first()
            if row is None:
                raise KeyError(f"{type_} {id_} no encontrado")
            props = {prop_name: row.get(col_name) for prop_name, col_name in otype.properties.items()}
            return OntologyObject(type=otype.name, id=str(row.get(otype.pk_column)), properties=props)

    def find_objects(self, type_: str, filters: dict[str, Any]) -> list[OntologyObject]:
        otype = self._get_otype(type_)
        with self.session_factory() as session:
            table = self._table(session, otype.table)
            stmt = select(table)
            tenant_col = self._tenant_column(table)
            if tenant_col is not None:
                stmt = stmt.where(tenant_col == self.tenant_id)
            for prop_name, value in (filters or {}).items():
                col_name = otype.properties.get(prop_name)
                if not col_name or col_name not in table.c:
                    continue
                stmt = stmt.where(table.c[col_name] == value)
            rows = session.execute(stmt.limit(200)).mappings().all()

        return [
            OntologyObject(
                type=otype.name,
                id=str(row.get(otype.pk_column)),
                properties={prop_name: row.get(col_name) for prop_name, col_name in otype.properties.items()},
            )
            for row in rows
        ]

    def get_neighbors(self, type_: str, id_: str, link_name: str) -> list[OntologyObject]:
        source_type = self._get_otype(type_)
        link: LinkType = source_type.links[link_name]
        target_type = self._get_otype(link.target_type)

        with self.session_factory() as session:
            source_table = self._table(session, source_type.table)
            target_table = self._table(session, target_type.table)
            source_stmt = select(source_table).where(source_table.c[source_type.pk_column] == id_)
            source_row = session.execute(source_stmt).mappings().first()
            if source_row is None:
                return []
            fk_value = source_row.get(link.source_key)
            if fk_value is None:
                return []
            target_stmt = select(target_table).where(target_table.c[link.target_key] == fk_value)
            tenant_col = self._tenant_column(target_table)
            if tenant_col is not None:
                target_stmt = target_stmt.where(tenant_col == self.tenant_id)
            target_rows = session.execute(target_stmt).mappings().all()

        return [
            OntologyObject(
                type=target_type.name,
                id=str(row.get(target_type.pk_column)),
                properties={prop_name: row.get(col_name) for prop_name, col_name in target_type.properties.items()},
            )
            for row in target_rows
        ]
