"""Entry-point compatible con ``streamlit run app.py``.

Garantiza que exista ``pages/`` en la raíz (requisito de Streamlit multipage)
redirigiendo a ``dashboard/pages``.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def _ensure_pages_bridge() -> None:
    root = _ROOT
    pages_root = root / "pages"
    dashboard_pages = root / "dashboard" / "pages"

    if not dashboard_pages.exists():
        raise RuntimeError(f"dashboard/pages no existe en {dashboard_pages}")

    # Symlink ya correcto.
    if pages_root.is_symlink():
        try:
            if pages_root.resolve() == dashboard_pages.resolve():
                return
        except OSError:
            # symlink roto -> se recrea
            pass
        pages_root.unlink(missing_ok=True)

    # Directorio real ya presente (por copia previa): no tocar.
    if pages_root.exists() and not pages_root.is_symlink():
        return

    # Preferimos symlink (rápido y sin duplicar ficheros).
    try:
        pages_root.symlink_to(dashboard_pages, target_is_directory=True)
        return
    except OSError:
        pass

    # Fallback portable: copia física de páginas.
    if not pages_root.exists():
        shutil.copytree(dashboard_pages, pages_root)


_ensure_pages_bridge()

from dashboard.app import *  # noqa: F401,F403,E402
