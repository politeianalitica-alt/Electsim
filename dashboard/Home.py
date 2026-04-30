"""
ELECTSIM — Pagina de inicio del dashboard.
Muestra estado del pipeline, KPIs globales y accesos directos.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import streamlit as st

from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    kpi_card, section_header,
)
import dashboard.db as _db

st.set_page_config(
    page_title="ElectSim — Inicio",
    page_icon="[ES]",
    layout="wide",
    initial_sidebar_state="expanded",
)

sidebar_nav()

# ---------------------------------------------------------------------------
# Cabecera
# ---------------------------------------------------------------------------

st.markdown(
    f"""
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
      <div style="width:48px;height:48px;
                  background:linear-gradient(135deg,{BLUE},{PURPLE});
                  border-radius:12px;display:flex;align-items:center;
                  justify-content:center;font-size:1.6rem;flex-shrink:0;
                  font-weight:900;color:white">E</div>
      <div>
        <h1 style="margin:0;color:{TEXT};font-size:1.8rem;font-weight:900">ElectSim</h1>
        <div style="color:{TEXT2};font-size:.85rem">
          Monitor politico espanol — datos en tiempo real
        </div>
      </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Estado del pipeline (Celery + servicios)
# ---------------------------------------------------------------------------

try:
    from scheduler.monitoring import render_pipeline_status
    render_pipeline_status()
except Exception:
    pass  # scheduler no disponible en entorno sin Redis

# ---------------------------------------------------------------------------
# KPIs globales
# ---------------------------------------------------------------------------

section_header("RESUMEN GLOBAL", CYAN)


@st.cache_data(ttl=300)
def _kpis_globales() -> dict:
    out = {
        "encuestas_7d": 0,
        "noticias_24h": 0,
        "iniciativas_activas": 0,
        "actores_activos": 0,
    }
    try:
        conn = _db.get_conn()
        # Encuestas recientes
        try:
            r = conn.execute(
                "SELECT COUNT(*) FROM encuestas WHERE fecha_campo >= NOW() - INTERVAL '7 days'"
            ).fetchone()
            out["encuestas_7d"] = r[0] if r else 0
        except Exception:
            pass

        # Noticias ultimas 24h
        try:
            r = conn.execute(
                "SELECT COUNT(*) FROM articulos_prensa WHERE fecha_pub >= NOW() - INTERVAL '24 hours'"
            ).fetchone()
            out["noticias_24h"] = r[0] if r else 0
        except Exception:
            pass

        # Iniciativas parlamentarias activas
        try:
            r = conn.execute(
                "SELECT COUNT(*) FROM iniciativas_parlamentarias WHERE estado NOT IN ('Rechazada','Caducada')"
            ).fetchone()
            out["iniciativas_activas"] = r[0] if r else 0
        except Exception:
            pass

        # Actores con actividad reciente
        try:
            r = conn.execute(
                """
                SELECT COUNT(DISTINCT actor_id)
                FROM noticias_actores
                WHERE fecha_vinculacion >= NOW() - INTERVAL '7 days'
                """
            ).fetchone()
            out["actores_activos"] = r[0] if r else 0
        except Exception:
            pass

    except Exception:
        pass

    return out


kpis = _kpis_globales()

col1, col2, col3, col4 = st.columns(4)
with col1:
    kpi_card("Encuestas (7 dias)", str(kpis["encuestas_7d"]), CYAN)
with col2:
    kpi_card("Noticias (24 h)", str(kpis["noticias_24h"]), BLUE)
with col3:
    kpi_card("Iniciativas activas", str(kpis["iniciativas_activas"]), PURPLE)
with col4:
    kpi_card("Actores activos (7 d)", str(kpis["actores_activos"]), AMBER)

# ---------------------------------------------------------------------------
# Accesos directos
# ---------------------------------------------------------------------------

st.markdown("<br>", unsafe_allow_html=True)
section_header("MODULOS", BLUE)

MODULOS = [
    ("N1 Encuestas",        "pages/N1_Encuestas.py",       CYAN,   "Sondeos y proyeccion de escanos"),
    ("N2 Electoral",        "pages/N2_Electoral.py",       BLUE,   "Resultados electorales historicos"),
    ("N3 Medios",           "pages/N3_Medios.py",          PURPLE, "Cobertura mediatica y sentimiento"),
    ("N4 Institucional",    "pages/N4_Institucional.py",   AMBER,  "Congreso, BOE y agenda de lideres"),
    ("D7 Radar Medios",     "pages/D7_Medios.py",          CYAN,   "Radar mediatico avanzado"),
    ("D8 Geopolitica",      "pages/D8_Geopolitica.py",     RED,    "Monitorizacion de conflictos"),
    ("D2 Actores",          "pages/D2_Actores.py",         GREEN,  "Perfiles y red de relaciones"),
    ("N8 Chat IA",          "pages/N8_ChatIA.py",          PURPLE, "Consultas con IA local (Ollama)"),
]

col_a, col_b = st.columns(2)
for i, (titulo, pagina, color, desc) in enumerate(MODULOS):
    col = col_a if i % 2 == 0 else col_b
    with col:
        st.markdown(
            f"""
            <div style="background:{BG2};border:1px solid {BORDER};
                        border-left:3px solid {color};border-radius:10px;
                        padding:.8rem 1rem;margin-bottom:.5rem">
              <div style="font-size:.9rem;font-weight:700;color:{TEXT}">{titulo}</div>
              <div style="font-size:.75rem;color:{TEXT2};margin-top:.2rem">{desc}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        try:
            st.page_link(pagina, label=f"Abrir {titulo}")
        except Exception:
            pass

# ---------------------------------------------------------------------------
# Pie
# ---------------------------------------------------------------------------

st.markdown(
    f"""
    <div style="margin-top:2rem;padding-top:1rem;border-top:1px solid {BORDER};
                font-size:.72rem;color:{MUTED};text-align:center">
      ElectSim — datos para uso analitico, no editorial
    </div>
    """,
    unsafe_allow_html=True,
)
