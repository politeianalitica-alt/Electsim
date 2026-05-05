"""Tests para el módulo investigation_canvas."""
from __future__ import annotations

import pytest

from workspace_intelligence.investigation_canvas import (
    CanvasConnection,
    CanvasObject,
    CanvasObjectType,
    ConnectionType,
    EvidenceStrength,
    InvestigationCanvas,
    add_connection,
    add_hypothesis,
    add_object,
    create_canvas,
    export_canvas_as_text,
    get_canvas,
    get_canvas_summary,
    list_canvases,
    remove_object,
    update_hypothesis_status,
    _CANVASES,
)

DEMO_WS = "ws_espana_2026"
DEMO_TENANT = "tenant_politeia"
DEMO_CANVAS_ID = "canvas_demo_mocion_2026"


# ── Tests ──────────────────────────────────────────────────────────────────────

def test_demo_canvas_created():
    """El canvas demo debe existir al importar el módulo."""
    assert DEMO_CANVAS_ID in _CANVASES
    canvas = _CANVASES[DEMO_CANVAS_ID]
    assert canvas.title == "Análisis Moción de Censura 2026"
    assert len(canvas.objects) == 6
    assert len(canvas.connections) == 4
    assert len(canvas.hypotheses) == 2


def test_list_canvases():
    """list_canvases devuelve al menos el canvas demo."""
    canvases = list_canvases(DEMO_WS, DEMO_TENANT)
    assert len(canvases) >= 1
    ids = [c.id for c in canvases]
    assert DEMO_CANVAS_ID in ids


def test_create_canvas():
    """create_canvas crea un canvas nuevo en el store."""
    canvas = create_canvas(
        workspace_id="ws_test",
        tenant_id="tenant_test",
        title="Canvas de prueba",
        description="Descripción de prueba",
        created_by="tester",
    )
    assert canvas.id in _CANVASES
    assert canvas.title == "Canvas de prueba"
    assert canvas.workspace_id == "ws_test"
    assert canvas.tenant_id == "tenant_test"
    assert canvas.created_by == "tester"
    # Cleanup
    del _CANVASES[canvas.id]


def test_get_canvas():
    """get_canvas devuelve el canvas demo y None para id inexistente."""
    canvas = get_canvas(DEMO_CANVAS_ID)
    assert canvas is not None
    assert canvas.id == DEMO_CANVAS_ID

    missing = get_canvas("id_inexistente_xyz")
    assert missing is None


def test_add_object():
    """add_object añade un objeto al canvas y lo devuelve correctamente."""
    canvas = create_canvas(DEMO_WS, DEMO_TENANT, "Test add object")
    obj = add_object(
        canvas_id=canvas.id,
        object_type=CanvasObjectType.actor,
        title="Actor de prueba",
        description="Descripción actor",
        evidence_strength=EvidenceStrength.probable,
        created_by="tester",
    )
    assert obj.id in [o.id for o in _CANVASES[canvas.id].objects]
    assert obj.title == "Actor de prueba"
    assert obj.object_type == CanvasObjectType.actor
    assert obj.evidence_strength == EvidenceStrength.probable
    # Cleanup
    del _CANVASES[canvas.id]


def test_add_connection():
    """add_connection añade una conexión entre dos objetos."""
    canvas = create_canvas(DEMO_WS, DEMO_TENANT, "Test add connection")
    obj_a = add_object(canvas.id, CanvasObjectType.actor, "Actor A")
    obj_b = add_object(canvas.id, CanvasObjectType.event, "Evento B")
    conn = add_connection(
        canvas_id=canvas.id,
        from_object_id=obj_a.id,
        to_object_id=obj_b.id,
        connection_type=ConnectionType.caused_by,
        label="Causa directa",
    )
    stored = _CANVASES[canvas.id]
    assert conn.id in [c.id for c in stored.connections]
    assert conn.from_object_id == obj_a.id
    assert conn.to_object_id == obj_b.id
    assert conn.connection_type == ConnectionType.caused_by
    assert conn.label == "Causa directa"
    # Cleanup
    del _CANVASES[canvas.id]


def test_add_hypothesis():
    """add_hypothesis añade una hipótesis al canvas."""
    canvas = create_canvas(DEMO_WS, DEMO_TENANT, "Test add hypothesis")
    hyp = add_hypothesis(
        canvas_id=canvas.id,
        title="Hipótesis de prueba",
        description="Descripción detallada",
        confidence=0.75,
    )
    stored = _CANVASES[canvas.id]
    assert hyp.id in [h.id for h in stored.hypotheses]
    assert hyp.title == "Hipótesis de prueba"
    assert hyp.confidence == 0.75
    assert hyp.status == "open"
    # Cleanup
    del _CANVASES[canvas.id]


def test_update_hypothesis_status_confirmed():
    """update_hypothesis_status cambia el estado a 'confirmed'."""
    canvas = create_canvas(DEMO_WS, DEMO_TENANT, "Test hyp confirmed")
    hyp = add_hypothesis(canvas.id, "Hipótesis test", "Desc", confidence=0.6)
    result = update_hypothesis_status(canvas.id, hyp.id, "confirmed")
    assert result is True
    stored_hyp = next(h for h in _CANVASES[canvas.id].hypotheses if h.id == hyp.id)
    assert stored_hyp.status == "confirmed"
    # Cleanup
    del _CANVASES[canvas.id]


def test_update_hypothesis_status_refuted():
    """update_hypothesis_status cambia el estado a 'refuted'."""
    canvas = create_canvas(DEMO_WS, DEMO_TENANT, "Test hyp refuted")
    hyp = add_hypothesis(canvas.id, "Hipótesis refutable", "Desc", confidence=0.3)
    result = update_hypothesis_status(canvas.id, hyp.id, "refuted")
    assert result is True
    stored_hyp = next(h for h in _CANVASES[canvas.id].hypotheses if h.id == hyp.id)
    assert stored_hyp.status == "refuted"
    # Cleanup
    del _CANVASES[canvas.id]


def test_remove_object_also_removes_connections():
    """remove_object elimina el objeto y todas sus conexiones."""
    canvas = create_canvas(DEMO_WS, DEMO_TENANT, "Test remove object")
    obj_a = add_object(canvas.id, CanvasObjectType.actor, "A")
    obj_b = add_object(canvas.id, CanvasObjectType.actor, "B")
    obj_c = add_object(canvas.id, CanvasObjectType.event, "C")
    conn_ab = add_connection(canvas.id, obj_a.id, obj_b.id, ConnectionType.connected_to)
    conn_bc = add_connection(canvas.id, obj_b.id, obj_c.id, ConnectionType.supports)
    conn_ac = add_connection(canvas.id, obj_a.id, obj_c.id, ConnectionType.caused_by)

    # Eliminar B — debe eliminar conn_ab y conn_bc pero no conn_ac
    result = remove_object(canvas.id, obj_b.id)
    stored = _CANVASES[canvas.id]
    assert result is True
    obj_ids = [o.id for o in stored.objects]
    assert obj_b.id not in obj_ids
    assert obj_a.id in obj_ids
    assert obj_c.id in obj_ids
    conn_ids = [c.id for c in stored.connections]
    assert conn_ab.id not in conn_ids
    assert conn_bc.id not in conn_ids
    assert conn_ac.id in conn_ids
    # Cleanup
    del _CANVASES[canvas.id]


def test_get_canvas_summary_structure():
    """get_canvas_summary devuelve las claves esperadas."""
    summary = get_canvas_summary(DEMO_CANVAS_ID)
    expected_keys = {
        "title", "object_count", "connection_count",
        "hypothesis_count", "by_type", "confirmed_hypotheses", "open_hypotheses",
    }
    assert expected_keys.issubset(summary.keys())


def test_get_canvas_summary_counts():
    """get_canvas_summary devuelve conteos correctos para el canvas demo."""
    summary = get_canvas_summary(DEMO_CANVAS_ID)
    assert summary["object_count"] == 6
    assert summary["connection_count"] == 4
    assert summary["hypothesis_count"] == 2
    assert summary["open_hypotheses"] == 2
    assert summary["confirmed_hypotheses"] == 0


def test_export_canvas_as_text_returns_string():
    """export_canvas_as_text devuelve una cadena no vacía."""
    text = export_canvas_as_text(DEMO_CANVAS_ID)
    assert isinstance(text, str)
    assert len(text) > 0


def test_export_canvas_contains_objects():
    """El texto exportado contiene los objetos y secciones principales."""
    text = export_canvas_as_text(DEMO_CANVAS_ID)
    assert "CANVAS DE INVESTIGACIÓN" in text
    assert "== OBJETOS ==" in text
    assert "== CONEXIONES ==" in text
    assert "== HIPÓTESIS ==" in text
    assert "Pedro Sánchez" in text
    assert "Alberto Feijóo" in text
    assert "Moción de Censura" in text


def test_canvas_object_model_valid():
    """CanvasObject acepta todos los campos correctamente."""
    from datetime import datetime
    obj = CanvasObject(
        id="obj_test_001",
        canvas_id="canvas_test",
        object_type=CanvasObjectType.document,
        title="Documento de prueba",
        description="Una descripción",
        source_ref="doc_123",
        tags=["tag1", "tag2"],
        evidence_strength=EvidenceStrength.confirmed,
        x_pos=10.0,
        y_pos=20.0,
        created_at=datetime(2026, 1, 1),
        created_by="test_user",
        metadata={"key": "value"},
    )
    assert obj.id == "obj_test_001"
    assert obj.object_type == CanvasObjectType.document
    assert obj.evidence_strength == EvidenceStrength.confirmed
    assert obj.tags == ["tag1", "tag2"]
    assert obj.metadata == {"key": "value"}


def test_connection_model_valid():
    """CanvasConnection acepta todos los campos correctamente."""
    from datetime import datetime
    conn = CanvasConnection(
        id="conn_test_001",
        canvas_id="canvas_test",
        from_object_id="obj_a",
        to_object_id="obj_b",
        connection_type=ConnectionType.supports,
        label="Apoya la hipótesis",
        weight=0.8,
        notes="Nota adicional",
        created_at=datetime(2026, 1, 1),
    )
    assert conn.id == "conn_test_001"
    assert conn.connection_type == ConnectionType.supports
    assert conn.weight == 0.8
    assert conn.label == "Apoya la hipótesis"
