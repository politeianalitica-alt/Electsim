from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import sidebar_nav  # noqa: E402

st.set_page_config(page_title="Memoria Institucional", layout="wide")
sidebar_nav()

st.title("Memoria Institucional")
st.caption("Histórico de decisiones, resultados y aprendizajes de campaña.")

st.info(
    "Módulo disponible. Aquí se consolida la memoria operativa para consulta y seguimiento."
)
