"""Página inicial dedicada para navegación multipágina estable.

Evita depender de `app.py` como objetivo de navegación desde subpáginas.
"""

from __future__ import annotations

import runpy
import sys
import traceback
from pathlib import Path

import streamlit as st

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

try:
    runpy.run_path(str(_ROOT / "dashboard" / "app.py"), run_name="__main__")
except Exception as exc:  # pragma: no cover - fallback visual en runtime Streamlit
    st.title("ElectSim España")
    st.error(
        "No se pudo cargar la portada. Revisa configuración de entorno "
        "(especialmente `DATABASE_URL`) y vuelve a iniciar."
    )
    with st.expander("Detalle técnico"):
        st.code("".join(traceback.format_exception(exc)))
