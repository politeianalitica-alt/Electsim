from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from dashboard.components.ficha_politico import render_ficha, render_selector_politico
from dashboard.db import get_conn
from dashboard.shared import sidebar_nav

st.set_page_config(page_title="Fichas de Políticos — ElectSim", layout="wide")
sidebar_nav()

try:
    conn = get_conn()
except Exception:
    conn = None

st.header("●  Fichas de Políticos")
politico_id = render_selector_politico(conn)
if politico_id:
    render_ficha(conn, politico_id)
