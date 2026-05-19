"""Smoke test · routers entities + investigations bien registrados en FastAPI."""
from __future__ import annotations

import os


def test_entities_router_registrado():
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test_entities.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    expected = {
        "/api/v1/entities/kinds",
        "/api/v1/entities/search",
        "/api/v1/entities/by-slug/{kind}/{slug}",
        "/api/v1/entities/by-qid/{qid}",
        "/api/v1/entities/by-kind/{kind}",
        "/api/v1/entities/{entity_id}",
        "/api/v1/entities/{entity_id}/links",
        "/api/v1/entities",
        "/api/v1/entities/{entity_id}",  # PATCH
        "/api/v1/entities/{entity_id}/links",  # POST
        "/api/v1/entities/_backfill",
    }
    missing = expected - paths
    assert not missing, f"rutas faltantes: {missing}"


def test_investigations_router_registrado():
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test_inv.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    expected = {
        "/api/v1/investigations",
        "/api/v1/investigations/{inv_id}",
        "/api/v1/investigations/by-slug/{slug}",
        "/api/v1/investigations/{inv_id}/archive",
        "/api/v1/investigations/{inv_id}/pin",
        "/api/v1/investigations/{inv_id}/pin/{entity_id}",
        "/api/v1/investigations/{inv_id}/artifacts",
        "/api/v1/investigations/{inv_id}/events",
    }
    missing = expected - paths
    assert not missing, f"rutas faltantes: {missing}"


def test_kinds_endpoint_devuelve_listas():
    """GET /api/v1/entities/kinds devuelve entity_kinds + link_kinds."""
    from api.routers.entities import list_kinds
    out = list_kinds()
    assert "entity_kinds" in out
    assert "link_kinds" in out
    # 13 kinds en el modelo
    assert len(out["entity_kinds"]) >= 13
    # 24+ link kinds
    assert len(out["link_kinds"]) >= 24
    # tipos canónicos presentes
    for must in ("actor_person", "party", "law", "territory", "sector"):
        assert must in out["entity_kinds"], f"falta entity_kind {must}"
    for must in ("member_of", "president_of", "mentions", "votes_for", "regulates"):
        assert must in out["link_kinds"], f"falta link_kind {must}"
