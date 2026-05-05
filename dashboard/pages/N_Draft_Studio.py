"""Draft Studio — ElectSim España.

Página de redacción asistida con datos vivos para comunicaciones políticas.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

st.set_page_config(
    page_title="Draft Studio — ElectSim",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Design tokens ─────────────────────────────────────────────────────────────
_BG2 = "#0D1320"
_BORDER = "#1E293B"
_CYAN = "#00D4FF"
_TEXT = "#E2E8F0"
_TEXT2 = "#94A3B8"

# ── Sidebar ───────────────────────────────────────────────────────────────────
try:
    from dashboard.shared import sidebar_nav
    sidebar_nav()
except Exception:
    pass

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(
    f"""
    <div style="background:{_BG2};border:1px solid {_BORDER};border-radius:14px;padding:1.4rem 1.6rem;margin-bottom:1.2rem">
      <div style="font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:{_CYAN}">Comunicaciones</div>
      <div style="font-size:1.7rem;font-weight:800;letter-spacing:-.02em;color:{_TEXT};margin-top:.25rem">Draft Studio</div>
      <div style="font-size:.88rem;color:{_TEXT2};margin-top:.3rem">
        Redacción asistida con datos vivos para comunicaciones políticas. Plantillas, paleta de datos en tiempo real y análisis de riesgos integrado.
      </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# ── Render component ──────────────────────────────────────────────────────────
try:
    from dashboard.components.draft_studio import render_draft_studio
    render_draft_studio()
except Exception as exc:
    st.error(f"No se pudo cargar Draft Studio: {exc}")
    st.info("Verifica que el módulo dashboard.components.draft_studio esté disponible.")
