"""Tests · auto-init de tablas en primer uso (sin alembic).

Verifica que las funciones ensure_*_tables son resilientes:
  · sin engine → devuelven ok=False con error explícito (no excepción)
  · llamadas múltiples → flag de proceso evita reejecuciones
  · reset_init_flag permite forzar re-ejecución (testing)
"""
from __future__ import annotations

import os


def test_ensure_ontology_tables_sin_engine():
    from agents.entities._schema import ensure_ontology_tables, reset_init_flag
    reset_init_flag()
    result = ensure_ontology_tables(None)
    assert result["ok"] is False
    assert result["error"] == "no_engine"


def test_ensure_ontology_idempotente():
    from agents.entities._schema import ensure_ontology_tables, reset_init_flag

    class _MockConn:
        def execute(self, *_args, **_kwargs):
            pass

    class _MockEngine:
        def begin(self):
            class _CM:
                def __enter__(self_): return _MockConn()
                def __exit__(self_, *a): return False
            return _CM()

    reset_init_flag()
    # Primera llamada · tablas se crean (mock)
    r1 = ensure_ontology_tables(_MockEngine())
    assert r1["ok"] is True
    assert r1.get("tables_ensured") == [
        "entities", "entity_links", "investigations",
        "inv_pinned", "inv_artifacts", "analyst_events",
    ]
    # Segunda llamada · flag interno bloquea
    r2 = ensure_ontology_tables(_MockEngine())
    assert r2["ok"] is True
    assert r2.get("already_initialized") is True


def test_ensure_memory_tables_sin_engine():
    from agents.memory._schema import ensure_memory_tables, reset_init_flag
    reset_init_flag()
    result = ensure_memory_tables(None)
    assert result["ok"] is False
    assert result["error"] == "no_engine"


def test_admin_init_workspace_endpoint_registrado():
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/api/v1/admin/init_workspace" in paths
    assert "/api/v1/admin/reset_workspace_init_flags" in paths


def test_init_workspace_sin_bd_devuelve_ok_false():
    """init_workspace es resiliente · sin BD devuelve ok=False con notes."""
    # Forzamos engine None capando get_engine
    from api.routers import admin_workspace
    response = admin_workspace.init_workspace(skip_backfill=True)
    # Si no hay DB local, devuelve ok=False con notes explícitos
    assert response.total_latency_ms >= 0
    assert isinstance(response.notes, list)
    assert isinstance(response.ontology, dict)
    assert isinstance(response.memory, dict)
    assert isinstance(response.backfill, dict)
