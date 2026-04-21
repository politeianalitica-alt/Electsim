"""Página: Congreso & Actividad Institucional."""

from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.repositories.institutional import load_congreso_dashboard_data
from dashboard.shared import sidebar_nav
from dashboard.views.congreso import render_congreso_page


st.set_page_config(page_title="Congreso — ElectSim", layout="wide")
sidebar_nav()

render_congreso_page(load_congreso_dashboard_data())
