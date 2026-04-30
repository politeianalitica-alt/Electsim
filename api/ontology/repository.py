"""
Repositorio para el grafo de ontologia.
Usa SQLAlchemy sync Session (coherente con el resto de la API).
"""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from db.models import (
    OntologyObject,
    OntologyObjectType,
    OntologyRelation,
    OntologyRelationType,
)
from .schemas import OntologyObjectOut, OntologyObjectTypeOut, OntologyRelationOut


class OntologyGraphRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    # ------------------------------------------------------------------
    # Object types
    # ------------------------------------------------------------------

    def list_object_types(self) -> list[OntologyObjectTypeOut]:
        rows = self.session.execute(select(OntologyObjectType)).scalars().all()
        return [
            OntologyObjectTypeOut(
                id=r.id,
                code=r.code,
                display_name=r.display_name,
                description=r.description,
            )
            for r in rows
        ]

    # ------------------------------------------------------------------
    # Objects
    # ------------------------------------------------------------------

    def count_objects(self, object_type_code: Optional[str] = None) -> int:
        stmt = select(OntologyObject)
        if object_type_code:
            stmt = (
                stmt
                .join(OntologyObjectType, OntologyObject.object_type_id == OntologyObjectType.id)
                .where(OntologyObjectType.code == object_type_code)
            )
        return self.session.execute(
            stmt.with_only_columns(OntologyObject.id.label("id"))
        ).rowcount or len(self.session.execute(stmt).scalars().all())

    def list_objects(
        self,
        object_type_code: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[int, list[OntologyObjectOut]]:
        base = (
            select(
                OntologyObject.id,
                OntologyObject.external_table,
                OntologyObject.external_id,
                OntologyObject.properties,
                OntologyObject.created_at,
                OntologyObject.updated_at,
                OntologyObjectType.code.label("object_type"),
            )
            .join(OntologyObjectType, OntologyObject.object_type_id == OntologyObjectType.id)
        )
        if object_type_code:
            base = base.where(OntologyObjectType.code == object_type_code)

        # total sin paginar
        from sqlalchemy import func as _func
        count_stmt = select(_func.count()).select_from(base.subquery())
        total: int = self.session.execute(count_stmt).scalar_one()

        rows = self.session.execute(base.limit(limit).offset(offset)).all()
        items = [
            OntologyObjectOut(
                id=row.id,
                object_type=row.object_type,
                external_table=row.external_table,
                external_id=row.external_id,
                properties=row.properties or {},
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ]
        return total, items

    def get_object(self, object_id: UUID) -> Optional[OntologyObjectOut]:
        row = self.session.execute(
            select(
                OntologyObject.id,
                OntologyObject.external_table,
                OntologyObject.external_id,
                OntologyObject.properties,
                OntologyObject.created_at,
                OntologyObject.updated_at,
                OntologyObjectType.code.label("object_type"),
            )
            .join(OntologyObjectType, OntologyObject.object_type_id == OntologyObjectType.id)
            .where(OntologyObject.id == object_id)
        ).first()
        if not row:
            return None
        return OntologyObjectOut(
            id=row.id,
            object_type=row.object_type,
            external_table=row.external_table,
            external_id=row.external_id,
            properties=row.properties or {},
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def get_object_by_source(self, external_table: str, external_id: str) -> Optional[OntologyObjectOut]:
        row = self.session.execute(
            select(
                OntologyObject.id,
                OntologyObject.external_table,
                OntologyObject.external_id,
                OntologyObject.properties,
                OntologyObject.created_at,
                OntologyObject.updated_at,
                OntologyObjectType.code.label("object_type"),
            )
            .join(OntologyObjectType, OntologyObject.object_type_id == OntologyObjectType.id)
            .where(
                and_(
                    OntologyObject.external_table == external_table,
                    OntologyObject.external_id == external_id,
                )
            )
        ).first()
        if not row:
            return None
        return OntologyObjectOut(
            id=row.id,
            object_type=row.object_type,
            external_table=row.external_table,
            external_id=row.external_id,
            properties=row.properties or {},
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    # ------------------------------------------------------------------
    # Relations
    # ------------------------------------------------------------------

    def list_relations(
        self,
        object_id: Optional[UUID] = None,
        direction: str = "both",
        relation_type_code: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[int, list[OntologyRelationOut]]:
        base = (
            select(
                OntologyRelation.id,
                OntologyRelation.source_object_id,
                OntologyRelation.target_object_id,
                OntologyRelation.weight,
                OntologyRelation.evidence_object_id,
                OntologyRelation.created_at,
                OntologyRelationType.code.label("relation_type"),
            )
            .join(
                OntologyRelationType,
                OntologyRelation.relation_type_id == OntologyRelationType.id,
            )
        )

        if object_id:
            if direction == "out":
                base = base.where(OntologyRelation.source_object_id == object_id)
            elif direction == "in":
                base = base.where(OntologyRelation.target_object_id == object_id)
            else:
                base = base.where(
                    or_(
                        OntologyRelation.source_object_id == object_id,
                        OntologyRelation.target_object_id == object_id,
                    )
                )

        if relation_type_code:
            base = base.where(OntologyRelationType.code == relation_type_code)

        from sqlalchemy import func as _func
        count_stmt = select(_func.count()).select_from(base.subquery())
        total: int = self.session.execute(count_stmt).scalar_one()

        rows = self.session.execute(base.limit(limit).offset(offset)).all()
        items = [
            OntologyRelationOut(
                id=row.id,
                relation_type=row.relation_type,
                source_object_id=row.source_object_id,
                target_object_id=row.target_object_id,
                weight=row.weight,
                evidence_object_id=row.evidence_object_id,
                created_at=row.created_at,
            )
            for row in rows
        ]
        return total, items

    # ------------------------------------------------------------------
    # Pipeline integration (Bloque 3)
    # ------------------------------------------------------------------

    def upsert_object_from_pipeline(
        self,
        object_type_code: str,
        external_table: str,
        external_id: str,
        properties: dict,
    ) -> Optional[str]:
        """
        Crea o actualiza un OntologyObject desde el pipeline.

        Retorna el UUID del objeto como string, o None si falla.
        """
        import uuid as _uuid
        from datetime import datetime as _dt

        try:
            # Buscar tipo
            type_row = self.session.execute(
                select(OntologyObjectType).where(OntologyObjectType.code == object_type_code)
            ).scalar_one_or_none()
            if not type_row:
                return None

            # Buscar objeto existente
            obj = self.session.execute(
                select(OntologyObject).where(
                    OntologyObject.external_table == external_table,
                    OntologyObject.external_id == external_id,
                )
            ).scalar_one_or_none()

            if obj:
                # Actualizar properties (merge)
                merged = {**(obj.properties or {}), **properties}
                obj.properties = merged
                obj.updated_at = _dt.utcnow()
            else:
                obj = OntologyObject(
                    id=_uuid.uuid4(),
                    object_type_id=type_row.id,
                    external_table=external_table,
                    external_id=external_id,
                    properties=properties,
                )
                self.session.add(obj)

            self.session.flush()
            return str(obj.id)
        except Exception:
            return None

    def link_entities(
        self,
        source_id: str,
        target_id: str,
        relation_type_code: str,
        weight: float = 1.0,
        evidence_id: Optional[str] = None,
    ) -> bool:
        """
        Crea una relacion entre dos objetos de la ontologia.

        Retorna True si la relacion fue creada correctamente.
        """
        import uuid as _uuid

        try:
            rel_type = self.session.execute(
                select(OntologyRelationType).where(OntologyRelationType.code == relation_type_code)
            ).scalar_one_or_none()
            if not rel_type:
                return False

            src_uuid = _uuid.UUID(source_id)
            tgt_uuid = _uuid.UUID(target_id)
            ev_uuid = _uuid.UUID(evidence_id) if evidence_id else None

            # Verificar que no existe ya la relacion
            existing = self.session.execute(
                select(OntologyRelation).where(
                    OntologyRelation.source_object_id == src_uuid,
                    OntologyRelation.target_object_id == tgt_uuid,
                    OntologyRelation.relation_type_id == rel_type.id,
                )
            ).scalar_one_or_none()

            if existing:
                # Actualizar peso
                existing.weight = max(existing.weight or 0.0, weight)
            else:
                rel = OntologyRelation(
                    source_object_id=src_uuid,
                    target_object_id=tgt_uuid,
                    relation_type_id=rel_type.id,
                    weight=weight,
                    evidence_object_id=ev_uuid,
                )
                self.session.add(rel)

            self.session.flush()
            return True
        except Exception:
            return False

    def resolve_entity_name(self, name: str) -> Optional[str]:
        """
        Busca un objeto de la ontologia por nombre (properties->>'name' ILIKE).
        Retorna el UUID como string, o None si no se encuentra.
        """
        try:
            from sqlalchemy import text as sa_text
            row = self.session.execute(
                sa_text(
                    "SELECT id FROM ontology_object "
                    "WHERE properties->>'name' ILIKE :name LIMIT 1"
                ),
                {"name": name},
            ).first()
            if row:
                return str(row[0])
        except Exception:
            pass
        return None
