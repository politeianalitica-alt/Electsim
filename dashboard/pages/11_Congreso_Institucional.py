"""Página: Congreso & Actividad Institucional."""

from __future__ import annotations

import streamlit as st

from dashboard.repositories.institutional import load_congreso_dashboard_data
from dashboard.shared import sidebar_nav
from dashboard.views.congreso import render_congreso_page


st.set_page_config(page_title="Congreso — ElectSim", layout="wide")
sidebar_nav()

render_congreso_page(load_congreso_dashboard_data())
