from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from dashboard.components.agenda_vista import render_agenda_vista
from dashboard.db import get_conn
from dashboard.shared import sidebar_nav

st.set_page_config(page_title="Agenda de Líderes — ElectSim", layout="wide")
sidebar_nav()

try:
    conn = get_conn()
except Exception:
    conn = None

render_agenda_vista(conn)
