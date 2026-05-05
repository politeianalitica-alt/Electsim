"""Tests del Alert Intelligence Engine — 18 casos."""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pytest

from services.intelligence.alert_engine import (
    AlertCategory,
    AlertLevel,
    IntelAlert,
    _ALERT_STORE,
    _init_demo_alerts,
    create_alert,
    dismiss_old_alerts,
    escalate_alert,
    generate_auto_alerts,
    get_alert_summary,
    get_alerts,
    get_alerts_by_level,
    get_critical_alerts,
    get_unread_count,
    mark_all_read,
    mark_read,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_store():
    """Limpia el store antes de cada test y reinicializa demos."""
    global _ALERT_STORE
    from services.intelligence import alert_engine as _mod
    _mod._ALERT_STORE.clear()
    _mod._DEMO_INITIALIZED = False
    _mod._init_demo_alerts()
    yield
    _mod._ALERT_STORE.clear()
    _mod._DEMO_INITIALIZED = False
    _mod._init_demo_alerts()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_demo_alerts_initialized():
    """Los demos se inicializan correctamente para el tenant 'demo'."""
    alerts = get_alerts("demo")
    assert len(alerts) == 8


def test_get_all_alerts():
    """get_alerts sin filtros devuelve todas las alertas ordenadas por fecha desc."""
    alerts = get_alerts("demo")
    assert len(alerts) > 0
    # Ordenadas desc
    for i in range(len(alerts) - 1):
        assert alerts[i].created_at >= alerts[i + 1].created_at


def test_get_unread_count():
    """Todas las alertas demo comienzan sin leer."""
    count = get_unread_count("demo")
    assert count == 8


def test_mark_read():
    """mark_read marca correctamente una alerta como leida."""
    alerts = get_alerts("demo")
    target = alerts[0]
    assert target.read_at is None
    result = mark_read("demo", target.id)
    assert result is True
    assert target.read_at is not None
    # Marcar la misma segunda vez devuelve False
    result2 = mark_read("demo", target.id)
    assert result2 is False


def test_mark_all_read():
    """mark_all_read marca todas las alertas y devuelve el conteo correcto."""
    n = mark_all_read("demo")
    assert n == 8
    assert get_unread_count("demo") == 0


def test_get_critical_alerts():
    """get_critical_alerts devuelve solo alertas criticas sin leer."""
    criticals = get_critical_alerts("demo")
    assert len(criticals) >= 1
    for a in criticals:
        assert a.level == AlertLevel.critical
        assert a.read_at is None


def test_get_alerts_by_level():
    """get_alerts_by_level devuelve un dict con todos los niveles."""
    by_level = get_alerts_by_level("demo")
    assert set(by_level.keys()) == {lv.value for lv in AlertLevel}
    total = sum(by_level.values())
    assert total == 8


def test_create_alert():
    """create_alert crea y persiste una nueva alerta en el store."""
    before = len(get_alerts("demo"))
    alert = create_alert(
        tenant_id="demo",
        title="Test alert",
        body="Cuerpo de prueba",
        level=AlertLevel.medium,
        category=AlertCategory.electoral,
        source="Test",
    )
    assert isinstance(alert, IntelAlert)
    assert alert.id
    after = len(get_alerts("demo"))
    assert after == before + 1


def test_escalate_alert():
    """escalate_alert marca escalated=True en la alerta correcta."""
    alerts = get_alerts("demo")
    target = alerts[0]
    assert target.escalated is False
    result = escalate_alert("demo", target.id)
    assert result is True
    assert target.escalated is True


def test_filter_by_category():
    """Filtrar por categoria devuelve solo alertas de esa categoria."""
    alerts = get_alerts("demo", category=AlertCategory.electoral)
    assert len(alerts) > 0
    for a in alerts:
        assert a.category == AlertCategory.electoral


def test_filter_by_level():
    """Filtrar por nivel devuelve solo alertas de ese nivel."""
    alerts = get_alerts("demo", level=AlertLevel.medium)
    assert len(alerts) > 0
    for a in alerts:
        assert a.level == AlertLevel.medium


def test_unread_only_filter():
    """unread_only=True excluye las alertas ya leidas."""
    alerts = get_alerts("demo")
    # Marcar la primera como leida
    mark_read("demo", alerts[0].id)
    unread = get_alerts("demo", unread_only=True)
    assert len(unread) == 7
    for a in unread:
        assert a.read_at is None


def test_get_alert_summary_structure():
    """get_alert_summary devuelve todas las claves esperadas."""
    summary = get_alert_summary("demo")
    assert "total" in summary
    assert "unread" in summary
    assert "by_level" in summary
    assert "by_category" in summary
    assert "has_critical" in summary
    assert "oldest_unread_hours" in summary
    assert summary["total"] == 8
    assert summary["unread"] == 8


def test_get_alert_summary_has_critical():
    """has_critical es True cuando hay alertas criticas sin leer."""
    summary = get_alert_summary("demo")
    assert summary["has_critical"] is True
    # Marcar todas como leidas
    mark_all_read("demo")
    summary2 = get_alert_summary("demo")
    assert summary2["has_critical"] is False


def test_generate_auto_alerts_electoral_drop():
    """generate_auto_alerts crea alerta electoral cuando nowcasting_delta < -2."""
    before = len(get_alerts("test_tenant"))
    context = {"nowcasting_delta": -3.5}
    new_alerts = generate_auto_alerts("test_tenant", context)
    assert len(new_alerts) == 1
    assert new_alerts[0].category == AlertCategory.electoral
    assert new_alerts[0].level == AlertLevel.high
    assert new_alerts[0].action_required is True
    after = len(get_alerts("test_tenant"))
    assert after == before + 1


def test_generate_auto_alerts_risk_score():
    """generate_auto_alerts crea alerta de riesgo cuando risk_score > 75."""
    context = {"risk_score": 82.5}
    new_alerts = generate_auto_alerts("test_tenant_risk", context)
    risk_alerts = [a for a in new_alerts if a.category == AlertCategory.risk]
    assert len(risk_alerts) == 1
    assert risk_alerts[0].level == AlertLevel.high


def test_dismiss_old_alerts():
    """dismiss_old_alerts elimina alertas info/low antiguas."""
    from services.intelligence import alert_engine as _mod

    # Crear alertas info y low con fecha antigua
    old_date = datetime.now(timezone.utc) - timedelta(days=40)
    old_info = IntelAlert(
        title="Old info",
        body="Old body",
        level=AlertLevel.info,
        category=AlertCategory.operational,
        source="test",
        tenant_id="demo",
        created_at=old_date,
    )
    old_low = IntelAlert(
        title="Old low",
        body="Old body",
        level=AlertLevel.low,
        category=AlertCategory.media,
        source="test",
        tenant_id="demo",
        created_at=old_date,
    )
    # Alerta medium antigua (NO debe eliminarse)
    old_medium = IntelAlert(
        title="Old medium",
        body="Old body",
        level=AlertLevel.medium,
        category=AlertCategory.electoral,
        source="test",
        tenant_id="demo",
        created_at=old_date,
    )
    _mod._ALERT_STORE["demo"].extend([old_info, old_low, old_medium])

    before = len(get_alerts("demo"))
    removed = dismiss_old_alerts("demo", older_than_days=30)
    after = len(get_alerts("demo"))

    assert removed == 2
    assert after == before - 2
    # El medium permanece
    titles = [a.title for a in get_alerts("demo")]
    assert "Old medium" in titles


def test_alert_model_valid():
    """IntelAlert se crea correctamente con todos los campos requeridos."""
    alert = IntelAlert(
        title="Titulo de prueba",
        body="Cuerpo de prueba con suficiente detalle",
        level=AlertLevel.critical,
        category=AlertCategory.intelligence,
        source="Test source",
        tenant_id="demo",
    )
    assert alert.id  # UUID generado
    assert alert.escalated is False
    assert alert.read_at is None
    assert alert.action_required is False
    assert alert.tags == []
    assert alert.workspace_id == "default"
