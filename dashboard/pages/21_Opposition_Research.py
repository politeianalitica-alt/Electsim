from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import sidebar_nav  # noqa: E402

st.set_page_config(page_title="Opposition Research", layout="wide")
sidebar_nav()

st.title("Opposition Research")
st.caption("Radar de contradicciones y apoyo para preparación de debate.")

st.info(
    "Módulo disponible. Aquí se centraliza contradicciones, simulación de debate y comparadores."
)
