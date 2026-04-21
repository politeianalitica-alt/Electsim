from __future__ import annotations


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
