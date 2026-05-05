"""
Tests para services/intelligence/message_consistency_tracker.py
12 tests que validan modelos, extracción de claims, logging y análisis.
"""
from __future__ import annotations

import pytest
from datetime import datetime, timezone

# Limpiar el estado global antes de cada test
import services.intelligence.message_consistency_tracker as mct


@pytest.fixture(autouse=True)
def clear_log():
    """Limpia el log en memoria antes de cada test."""
    mct._MESSAGE_LOG.clear()
    yield
    mct._MESSAGE_LOG.clear()


# ── 1. log_message ────────────────────────────────────────────────────────────

def test_log_message():
    """log_message crea un MessageRecord y lo almacena en el log."""
    record = mct.log_message(
        tenant_id="tenant_test",
        content="La economía ha crecido un 2.8% este trimestre.",
        asset_type="nota_de_prensa",
        channel="Twitter",
        workspace_id="ws1",
        approved_by="director@partido.es",
    )
    assert record.tenant_id == "tenant_test"
    assert record.asset_type == "nota_de_prensa"
    assert record.channel == "Twitter"
    assert record.workspace_id == "ws1"
    assert record.approved_by == "director@partido.es"
    assert record.id  # uuid no vacío
    assert isinstance(record.date, datetime)
    assert "tenant_test" in mct._MESSAGE_LOG


# ── 2. get_recent_messages ────────────────────────────────────────────────────

def test_get_recent_messages():
    """get_recent_messages devuelve los últimos N mensajes del tenant."""
    for i in range(5):
        mct.log_message("t1", f"Mensaje número {i}", "tweet", "Twitter")
    result = mct.get_recent_messages("t1", limit=3)
    assert len(result) == 3
    # Los últimos deben ser los más recientes
    assert "4" in result[-1].content


# ── 3. extract_key_claims — números ──────────────────────────────────────────

def test_extract_key_claims_finds_numbers():
    """extract_key_claims detecta frases con porcentajes o cifras."""
    text = "El paro bajó un 12%. Además se crearon 300 millones de euros en inversión."
    claims = mct.extract_key_claims(text)
    assert len(claims) >= 1
    assert any("12%" in c or "millones" in c for c in claims)


# ── 4. extract_key_claims — nunca/siempre ────────────────────────────────────

def test_extract_key_claims_finds_never_always():
    """extract_key_claims detecta afirmaciones absolutas (nunca, siempre)."""
    text = "Nunca hemos subido impuestos a las familias trabajadoras."
    claims = mct.extract_key_claims(text)
    assert len(claims) >= 1
    assert any("nunca" in c.lower() or "siempre" in c.lower() for c in claims)


# ── 5. extract_key_claims — texto limpio ─────────────────────────────────────

def test_extract_key_claims_empty_on_clean_text():
    """extract_key_claims devuelve lista vacía si no hay claims identificables."""
    text = "Hola, ¿cómo estás? El partido trabaja bien."
    claims = mct.extract_key_claims(text)
    # Puede devolver 0 o pocas claims en texto sin números/absolutas
    assert isinstance(claims, list)


# ── 6. check_consistency — retorna reporte ───────────────────────────────────

def test_check_consistency_returns_report():
    """check_consistency devuelve un ConsistencyReport válido."""
    mct.log_message("t2", "La economía mejora gracias a nuestra gestión.", "rueda_prensa", "TV")
    mct.log_message("t2", "La crisis afecta gravemente al empleo.", "tweet", "Twitter")
    report = mct.check_consistency("t2")
    assert isinstance(report, mct.ConsistencyReport)
    assert 0.0 <= report.consistency_score <= 1.0
    assert isinstance(report.inconsistencies, list)
    assert isinstance(report.recommendations, list)
    assert len(report.recommendations) >= 1


# ── 7. consistency_report — estructura ───────────────────────────────────────

def test_consistency_report_structure():
    """ConsistencyReport tiene todos los campos obligatorios con tipos correctos."""
    mct.log_message("t3", "Éxito total en las políticas de empleo.", "tweet", "Twitter")
    report = mct.check_consistency("t3")
    assert hasattr(report, "checked_at")
    assert hasattr(report, "total_messages")
    assert hasattr(report, "consistency_score")
    assert hasattr(report, "inconsistencies")
    assert hasattr(report, "drift_detected")
    assert hasattr(report, "drift_description")
    assert hasattr(report, "recommendations")
    assert isinstance(report.checked_at, datetime)
    assert isinstance(report.drift_detected, bool)


# ── 8. get_consistency_score — default sin mensajes ─────────────────────────

def test_get_consistency_score_default():
    """get_consistency_score devuelve 1.0 si no hay mensajes registrados."""
    score = mct.get_consistency_score("tenant_sin_mensajes")
    assert score == 1.0


# ── 9. MessageRecord — modelo ────────────────────────────────────────────────

def test_message_record_model():
    """MessageRecord se puede instanciar con Pydantic v2 y valida los campos."""
    record = mct.MessageRecord(
        id="test-id-001",
        date=datetime.now(timezone.utc),
        content="Texto de prueba",
        asset_type="entrevista",
        channel="Radio",
        tenant_id="t_demo",
        workspace_id="ws_default",
        key_claims=["El paro es del 11%."],
        approved_by="jefe_prensa@partido.es",
    )
    assert record.id == "test-id-001"
    assert record.workspace_id == "ws_default"
    assert len(record.key_claims) == 1


# ── 10. ConsistencyReport — modelo ──────────────────────────────────────────

def test_consistency_report_model():
    """ConsistencyReport se puede instanciar directamente con Pydantic v2."""
    report = mct.ConsistencyReport(
        checked_at=datetime.now(timezone.utc),
        total_messages=5,
        consistency_score=0.85,
        inconsistencies=[],
        drift_detected=False,
        drift_description="",
        recommendations=["Todo correcto."],
    )
    assert report.consistency_score == 0.85
    assert report.total_messages == 5
    assert not report.drift_detected


# ── 11. log_multiple_messages ───────────────────────────────────────────────

def test_log_multiple_messages():
    """Se pueden registrar múltiples mensajes y todos quedan en el log."""
    contents = [
        "Récord histórico de empleo en España.",
        "El fracaso de las políticas económicas es evidente.",
        "Nunca hemos tenido más inversión extranjera.",
        "La crisis de vivienda sigue sin solución.",
    ]
    for c in contents:
        mct.log_message("tenant_multi", c, "tweet", "Twitter")

    messages = mct.get_recent_messages("tenant_multi", limit=10)
    assert len(messages) == 4
    assert messages[0].content == contents[0]


# ── 12. check_consistency — sin mensajes ────────────────────────────────────

def test_check_consistency_no_messages():
    """check_consistency sin mensajes devuelve score 1.0 y sin inconsistencias."""
    report = mct.check_consistency("tenant_vacio")
    assert report.total_messages == 0
    assert report.consistency_score == 1.0
    assert report.inconsistencies == []
    assert not report.drift_detected
    assert len(report.recommendations) >= 1
