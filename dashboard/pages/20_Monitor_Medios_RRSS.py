from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import sidebar_nav  # noqa: E402

st.set_page_config(page_title="Monitor Medios & RRSS", layout="wide")
sidebar_nav()

st.title("Monitor Medios & RRSS")
st.caption("Panel de monitorización de medios y redes.")

st.info(
    "Esta vista está activa y preparada para mostrar volumen, sentimiento y alertas. "
    "Si no ves datos aún, ejecuta la ingesta y revisa la conexión a base de datos."
)
