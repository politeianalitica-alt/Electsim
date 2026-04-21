from __future__ import annotations


import streamlit as st

from dashboard.components.monitor_sentimiento import render_monitor_sentimiento
from dashboard.db import get_conn
from dashboard.shared import sidebar_nav

st.set_page_config(page_title="Monitor de Sentimiento — ElectSim", layout="wide")
sidebar_nav()

try:
    conn = get_conn()
except Exception:
    conn = None

render_monitor_sentimiento(conn)
