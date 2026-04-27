"""
Página: Nowcasting Electoral

Thin wrapper — delega toda la renderización a dashboard/components/nowcasting.py,
que es la única fuente de verdad del módulo de nowcasting.

Historial: antes de este refactor (Bloque 2, sprint 2), esta página tenía ~985
líneas con su propia implementación paralela. La lógica fue consolidada en el
componente, que ofrece más tabs (estimación actual, evolución, calidad, fuentes,
casas encuestadoras, contexto macro, sistema) y está bajo control de versiones
como parte del paquete dashboard.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st
from dashboard.components.nowcasting import render_nowcasting
from dashboard.db import get_conn
from dashboard.shared import sidebar_nav, mostrar_alertas_pagina

st.set_page_config(page_title="Nowcasting — ElectSim", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("2_Nowcasting")

try:
    conn = get_conn()
except Exception:
    conn = None

render_nowcasting(conn)
