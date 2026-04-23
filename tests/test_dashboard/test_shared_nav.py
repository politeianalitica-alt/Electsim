from __future__ import annotations

import dashboard.shared as shared


def test_safe_page_link_ignora_errores_internos(monkeypatch):
    """Regresión: st.page_link puede lanzar KeyError('url_pathname')."""

    monkeypatch.setattr(shared, "_resolve_page_path", lambda _path: "pages/1_Mapa_Electoral.py")

    def _explode(*_args, **_kwargs):
        raise KeyError("url_pathname")

    monkeypatch.setattr(shared.st, "page_link", _explode)

    # No debe propagar excepción.
    shared._safe_page_link("pages/1_Mapa_Electoral.py", label="Mapa")
