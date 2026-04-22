"""Entry-point compatible con ``streamlit run app.py``.

Garantiza que exista ``pages/`` en la raíz (requisito de Streamlit multipage)
redirigiendo a ``dashboard/pages``.
"""

from __future__ import annotations

import shutil
from pathlib import Path


def _ensure_pages_bridge() -> None:
    root = Path(__file__).resolve().parent
    pages_root = root / "pages"
    dashboard_pages = root / "dashboard" / "pages"

    if pages_root.exists() or not dashboard_pages.exists():
        return

    # Preferimos symlink (rápido y sin duplicar ficheros).
    try:
        pages_root.symlink_to(dashboard_pages, target_is_directory=True)
        return
    except OSError:
        pass

    # Fallback portable: copia física de páginas.
    shutil.copytree(dashboard_pages, pages_root)


_ensure_pages_bridge()

from dashboard.app import *  # noqa: F401,F403,E402
