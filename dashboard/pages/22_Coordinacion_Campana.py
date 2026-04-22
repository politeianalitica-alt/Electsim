from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import sidebar_nav  # noqa: E402

st.set_page_config(page_title="Coordinación de Campaña", layout="wide")
sidebar_nav()

st.title("Coordinación de Campaña")
st.caption("Centro de mensajes operativos y lineamientos internos.")

st.info(
    "Módulo disponible. Usa esta sección para mensajes del día, talking points y líneas rojas."
)
