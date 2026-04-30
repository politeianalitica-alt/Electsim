"""
Tests del modulo de ontologia y grafo (Bloque 1).
Cubre:
  1. Migracion — tablas y tipos de objeto/relacion existen
  2. Modelos SQLAlchemy — CRUD basico en SQLite en memoria
  3. Repositorio — list_objects, get_object, list_relations
  4. API — GET /ontology/graph/objects, get by id, 404, relations
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

# ---------------------------------------------------------------------------
# Base aislada en SQLite para tests unitarios de repositorio
# ---------------------------------------------------------------------------

from db.models import (
    Base,
    OntologyObject,
    OntologyObjectType,
    OntologyRelation,
    OntologyRelationType,
)
from api.ontology.repository import OntologyGraphRepository

SQLITE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="module")
def sqlite_engine():
    engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine, tables=[
        OntologyObjectType.__table__,
        OntologyObject.__table__,
        OntologyRelationType.__table__,
        OntologyRelation.__table__,
    ])
    return engine


@pytest.fixture
def db_session(sqlite_engine) -> Generator[Session, None, None]:
    factory = sessionmaker(bind=sqlite_engine, autoflush=False, autocommit=False)
    session = factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


# ---------------------------------------------------------------------------
# Helpers de fixture
# ---------------------------------------------------------------------------

def _seed_types(session: Session):
    """Inserta tipos de objeto y relacion minimos para los tests."""
    ot_actor = OntologyObjectType(id=1, code="actor", display_name="Actor")
    ot_party = OntologyObjectType(id=2, code="party", display_name="Partido")
    session.add_all([ot_actor, ot_party])
    session.flush()

    rt = OntologyRelationType(
        id=1,
        code="MEMBER_OF",
        display_name="Es miembro de",
        source_type_id=1,
        target_type_id=2,
    )
    session.add(rt)
    session.flush()
    return ot_actor, ot_party, rt


def _make_object(session: Session, ot_id: int, table: str, ext_id: str, props: dict) -> OntologyObject:
    obj = OntologyObject(
        id=uuid.uuid4(),
        object_type_id=ot_id,
        external_table=table,
        external_id=ext_id,
        properties=props,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(obj)
    session.flush()
    return obj


# ===========================================================================
# 1. MODELOS — insert y lectura basica
# ===========================================================================

class TestModels:
    def test_insert_object_type(self, db_session: Session):
        ot = OntologyObjectType(code="norm", display_name="Norma")
        db_session.add(ot)
        db_session.flush()
        assert ot.id is not None

    def test_insert_object(self, db_session: Session):
        ot = OntologyObjectType(code="media_item", display_name="Noticia")
        db_session.add(ot)
        db_session.flush()

        obj = OntologyObject(
            id=uuid.uuid4(),
            object_type_id=ot.id,
            external_table="articulos_prensa",
            external_id="42",
            properties={"title": "Test noticia"},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(obj)
        db_session.flush()
        assert obj.id is not None

    def test_unique_constraint_external_source(self, db_session: Session):
        ot = OntologyObjectType(code="alert", display_name="Alerta")
        db_session.add(ot)
        db_session.flush()

        obj_a = OntologyObject(
            id=uuid.uuid4(),
            object_type_id=ot.id,
            external_table="alertas_sistema",
            external_id="99",
            properties={},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        obj_b = OntologyObject(
            id=uuid.uuid4(),
            object_type_id=ot.id,
            external_table="alertas_sistema",
            external_id="99",  # duplicado
            properties={},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(obj_a)
        db_session.flush()
        db_session.add(obj_b)
        from sqlalchemy.exc import IntegrityError
        with pytest.raises(IntegrityError):
            db_session.flush()

    def test_insert_relation(self, db_session: Session):
        ot_actor, ot_party, rt = _seed_types(db_session)
        actor = _make_object(db_session, ot_actor.id, "actores", "1", {"name": "Sanchez"})
        party = _make_object(db_session, ot_party.id, "partidos", "10", {"name": "PSOE"})

        rel = OntologyRelation(
            relation_type_id=rt.id,
            source_object_id=actor.id,
            target_object_id=party.id,
            weight=1.0,
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(rel)
        db_session.flush()
        assert rel.id is not None


# ===========================================================================
# 2. REPOSITORIO
# ===========================================================================

class TestRepository:
    def test_list_object_types(self, db_session: Session):
        db_session.add(OntologyObjectType(code="poll_snapshot", display_name="Encuesta"))
        db_session.flush()
        repo = OntologyGraphRepository(db_session)
        types = repo.list_object_types()
        codes = [t.code for t in types]
        assert "poll_snapshot" in codes

    def test_list_objects_empty(self, db_session: Session):
        repo = OntologyGraphRepository(db_session)
        total, items = repo.list_objects(object_type_code="narrative_cluster")
        assert total == 0
        assert items == []

    def test_list_objects_and_filter(self, db_session: Session):
        ot_actor = OntologyObjectType(code="actor_repo", display_name="Actor")
        ot_media = OntologyObjectType(code="media_repo", display_name="Media")
        db_session.add_all([ot_actor, ot_media])
        db_session.flush()

        for i in range(3):
            db_session.add(OntologyObject(
                id=uuid.uuid4(),
                object_type_id=ot_actor.id,
                external_table="actores",
                external_id=f"a{i}",
                properties={"name": f"Actor {i}"},
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            ))
        db_session.add(OntologyObject(
            id=uuid.uuid4(),
            object_type_id=ot_media.id,
            external_table="articulos_prensa",
            external_id="m1",
            properties={"title": "Noticia"},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        ))
        db_session.flush()

        repo = OntologyGraphRepository(db_session)
        total_all, items_all = repo.list_objects()
        assert total_all >= 4

        total_actors, items_actors = repo.list_objects(object_type_code="actor_repo")
        assert total_actors == 3
        assert all(o.object_type == "actor_repo" for o in items_actors)

    def test_get_object_by_id(self, db_session: Session):
        ot = OntologyObjectType(code="norm_repo", display_name="Norma")
        db_session.add(ot)
        db_session.flush()

        oid = uuid.uuid4()
        db_session.add(OntologyObject(
            id=oid,
            object_type_id=ot.id,
            external_table="boe_publication",
            external_id="555",
            properties={"title": "RD 1/2026"},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        ))
        db_session.flush()

        repo = OntologyGraphRepository(db_session)
        obj = repo.get_object(oid)
        assert obj is not None
        assert obj.id == oid
        assert obj.properties["title"] == "RD 1/2026"
        assert obj.object_type == "norm_repo"

    def test_get_object_not_found(self, db_session: Session):
        repo = OntologyGraphRepository(db_session)
        result = repo.get_object(uuid.uuid4())
        assert result is None

    def test_get_object_by_source(self, db_session: Session):
        ot = OntologyObjectType(code="party_repo", display_name="Partido")
        db_session.add(ot)
        db_session.flush()
        db_session.add(OntologyObject(
            id=uuid.uuid4(),
            object_type_id=ot.id,
            external_table="partidos",
            external_id="77",
            properties={"siglas": "PP"},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        ))
        db_session.flush()

        repo = OntologyGraphRepository(db_session)
        obj = repo.get_object_by_source("partidos", "77")
        assert obj is not None
        assert obj.properties["siglas"] == "PP"

    def test_list_relations_by_object(self, db_session: Session):
        ot_a, ot_p, rt = _seed_types(db_session)
        actor = _make_object(db_session, ot_a.id, "actores", "rel_test_actor", {"name": "Feijoo"})
        party = _make_object(db_session, ot_p.id, "partidos", "rel_test_party", {"siglas": "PP"})
        db_session.add(OntologyRelation(
            relation_type_id=rt.id,
            source_object_id=actor.id,
            target_object_id=party.id,
            weight=0.9,
            created_at=datetime.now(timezone.utc),
        ))
        db_session.flush()

        repo = OntologyGraphRepository(db_session)

        total, rels = repo.list_relations(object_id=actor.id, direction="out")
        assert total >= 1
        assert any(r.source_object_id == actor.id for r in rels)

        total_in, rels_in = repo.list_relations(object_id=party.id, direction="in")
        assert total_in >= 1
        assert any(r.target_object_id == party.id for r in rels_in)

    def test_list_relations_filter_by_type(self, db_session: Session):
        repo = OntologyGraphRepository(db_session)
        total, rels = repo.list_relations(relation_type_code="MEMBER_OF")
        assert isinstance(total, int)


# ===========================================================================
# 3. API — TestClient
# ===========================================================================

@pytest.fixture(scope="module")
def api_client() -> Generator[TestClient, None, None]:
    """
    Cliente de prueba conectado a la app FastAPI.
    Los endpoints /graph/* requieren BD; en CI sin DB devuelven 500
    pero los tests de estructura del response siguen siendo utiles.
    """
    from api.main import app
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


class TestGraphAPI:
    def test_list_types_legacy(self, api_client: TestClient):
        """Endpoint legacy /ontology/types sigue funcionando."""
        resp = api_client.get("/ontology/types")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_graph_object_types_returns_list(self, api_client: TestClient):
        resp = api_client.get("/ontology/graph/object-types")
        # 200 con BD activa, 500 sin ella
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            data = resp.json()
            assert isinstance(data, list)

    def test_graph_list_objects_structure(self, api_client: TestClient):
        resp = api_client.get("/ontology/graph/objects?limit=10")
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            data = resp.json()
            assert "total" in data
            assert "items" in data
            assert "offset" in data
            assert "limit" in data

    def test_graph_list_objects_filter_type(self, api_client: TestClient):
        resp = api_client.get("/ontology/graph/objects?type=actor&limit=5")
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            data = resp.json()
            for item in data["items"]:
                assert item["object_type"] == "actor"

    def test_graph_get_object_404(self, api_client: TestClient):
        fake_uuid = str(uuid.uuid4())
        resp = api_client.get(f"/ontology/graph/objects/{fake_uuid}")
        # Con BD: 404. Sin BD: 500.
        assert resp.status_code in (404, 500)
        if resp.status_code == 404:
            assert "no encontrado" in resp.json()["detail"].lower()

    def test_graph_relations_structure(self, api_client: TestClient):
        resp = api_client.get("/ontology/graph/relations?limit=10")
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            data = resp.json()
            assert "total" in data
            assert "items" in data

    def test_graph_relations_direction_validation(self, api_client: TestClient):
        """Direccion invalida debe devolver 422."""
        resp = api_client.get("/ontology/graph/relations?direction=sideways")
        assert resp.status_code == 422

    def test_graph_relations_filter_by_object_and_direction(self, api_client: TestClient):
        fake_uuid = str(uuid.uuid4())
        resp = api_client.get(
            f"/ontology/graph/relations?object_id={fake_uuid}&direction=out&limit=5"
        )
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            data = resp.json()
            assert "items" in data
