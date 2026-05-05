"""Tests para Live Ticker y Draft Studio."""
from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path

os.environ.setdefault("OTEL_SDK_DISABLED", "true")
os.environ.setdefault("DEV_MODE", "true")

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pytest


# ── Live Ticker ──────────────────────────────────────────────────────────────

def test_build_ticker_items_returns_list():
    from services.intelligence.live_ticker import build_ticker_items
    items = build_ticker_items("demo")
    assert isinstance(items, list)
    assert len(items) > 0


def test_ticker_items_have_required_fields():
    from services.intelligence.live_ticker import build_ticker_items
    items = build_ticker_items("demo")
    item = items[0]
    assert hasattr(item, "text") and isinstance(item.text, str) and item.text
    assert hasattr(item, "category") and isinstance(item.category, str)
    assert hasattr(item, "color") and item.color.startswith("#")
    assert hasattr(item, "priority") and isinstance(item.priority, int)
    assert hasattr(item, "timestamp") and isinstance(item.timestamp, datetime)


def test_ticker_has_electoral_data():
    from services.intelligence.live_ticker import build_ticker_items
    items = build_ticker_items("demo")
    has_electoral = any(it.category == "electoral" for it in items)
    assert has_electoral, "Ticker debe incluir al menos un item electoral"


def test_get_ticker_html_returns_string():
    from services.intelligence.live_ticker import get_ticker_html
    html = get_ticker_html("demo")
    assert isinstance(html, str)
    assert len(html) > 50


def test_ticker_html_contains_animation():
    from services.intelligence.live_ticker import get_ticker_html
    html = get_ticker_html("demo")
    # Debe contener animación CSS
    assert "@keyframes" in html or "animation" in html


def test_get_status_bar_html_returns_string():
    from services.intelligence.live_ticker import get_status_bar_html
    html = get_status_bar_html("demo")
    assert isinstance(html, str)
    assert len(html) > 20


def test_ticker_item_model_valid():
    from services.intelligence.live_ticker import TickerItem
    item = TickerItem(
        text="PP 33.2%",
        category="electoral",
        color="#00D4FF",
        priority=2,
        timestamp=datetime.utcnow(),
    )
    assert item.text == "PP 33.2%"
    assert item.priority == 2


# ── Draft Studio ─────────────────────────────────────────────────────────────

def test_list_templates_returns_five():
    from dashboard.components.draft_studio import list_templates
    templates = list_templates()
    assert isinstance(templates, list)
    assert len(templates) >= 5


def test_get_template_nota_prensa():
    from dashboard.components.draft_studio import get_template
    t = get_template("nota_prensa")
    assert t is not None
    assert t.id == "nota_prensa"
    assert isinstance(t.body_template, str)
    assert len(t.body_template) > 0


def test_get_template_unknown_returns_none():
    from dashboard.components.draft_studio import get_template
    assert get_template("nonexistent_template_xyz") is None


def test_fill_template_substitutes_variables():
    from dashboard.components.draft_studio import fill_template
    result = fill_template("nota_prensa", {
        "candidato": "Juan Pérez",
        "fecha": "5 de mayo de 2026",
        "titular": "Anuncio importante",
        "cuerpo": "Texto cuerpo",
        "datos_clave": "Dato 1",
    })
    assert isinstance(result, str)
    # Al menos uno de los valores debe aparecer en el resultado renderizado
    assert "Juan Pérez" in result or "Anuncio importante" in result


def test_fill_template_missing_variable_handled():
    """fill_template no debe romper si faltan variables."""
    from dashboard.components.draft_studio import fill_template
    # Sin variables — no debe lanzar excepción
    try:
        result = fill_template("nota_prensa", {})
        assert isinstance(result, str)
    except Exception as exc:
        pytest.fail(f"fill_template lanzó excepción con dict vacío: {exc}")


def test_get_live_data_palette_structure():
    from dashboard.components.draft_studio import get_live_data_palette
    palette = get_live_data_palette()
    assert isinstance(palette, dict)
    assert len(palette) > 0


def test_live_data_palette_has_fecha_hoy():
    from dashboard.components.draft_studio import get_live_data_palette
    palette = get_live_data_palette()
    assert "fecha_hoy" in palette
    assert isinstance(palette["fecha_hoy"], str)
    assert len(palette["fecha_hoy"]) > 0


def test_live_data_palette_returns_strings():
    from dashboard.components.draft_studio import get_live_data_palette
    palette = get_live_data_palette()
    for key, value in palette.items():
        assert isinstance(key, str), f"Key {key} no es string"
        assert isinstance(value, str), f"Valor para {key} no es string: {type(value)}"


def test_draft_template_model_valid():
    from dashboard.components.draft_studio import DraftTemplate
    t = DraftTemplate(
        id="test",
        name="Test Template",
        description="Desc",
        asset_type="press_note",
        body_template="Hola {{nombre}}",
        variables=["nombre"],
        example_filled="Hola Juan",
    )
    assert t.id == "test"
    assert t.variables == ["nombre"]
