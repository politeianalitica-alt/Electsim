"""Portada operativa del dashboard.

Página inicial estable (sin redirecciones) para evitar errores de navegación.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import streamlit as st

from dashboard.db import (
    cargar_alertas,
    cargar_alertas_prensa_dinamicas,
    cargar_momentum_sentimiento_partidos,
    cargar_noticias_recientes,
    cargar_nowcasting,
    cargar_source_health,
)
from dashboard.shared import (
    AMBER,
    BG2,
    BORDER,
    CYAN,
    GREEN,
    MUTED,
    RED,
    TEXT,
    TEXT2,
    _safe_page_link,
    sidebar_nav,
)

st.set_page_config(page_title="Página inicial — ElectSim", layout="wide")
sidebar_nav()


def _safe_float(v: object, default: float = 0.0) -> float:
    try:
        if v is None:
            return float(default)
        out = float(v)
        return out if math.isfinite(out) else float(default)
    except Exception:
        return float(default)


st.markdown(
    f"""
    <div style="background:{BG2};border:1px solid {BORDER};border-radius:14px;padding:1.5rem 1.8rem;margin-bottom:1.2rem">
      <div style="font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:{CYAN}">Centro de mando</div>
      <div style="font-size:1.7rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};margin-top:.25rem">Página inicial</div>
      <div style="font-size:.88rem;color:{TEXT2};margin-top:.3rem">Resumen operativo de Prensa, Sentimiento y Alertas para entrar al detalle en un clic.</div>
    </div>
    """,
    unsafe_allow_html=True,
)

# Datos clave para portada (con fallback para no romper la pantalla principal)
try:
    _df_news = cargar_noticias_recientes(dias=1, limit=120)
    _df_alertas = cargar_alertas(solo_no_leidas=True, limit=200)
    _df_dyn = cargar_alertas_prensa_dinamicas(dias=14, ventana_reciente=3)
    _df_mom = cargar_momentum_sentimiento_partidos(dias=14, ventana_reciente=3)
    _df_health = cargar_source_health()
    _df_nc = cargar_nowcasting()
except Exception:
    _df_news = pd.DataFrame()
    _df_alertas = pd.DataFrame()
    _df_dyn = pd.DataFrame()
    _df_mom = pd.DataFrame()
    _df_health = pd.DataFrame()
    _df_nc = pd.DataFrame()
    st.warning("No se pudieron cargar todos los datos operativos. Mostrando vista degradada.")

n_news = len(_df_news)
n_alert_crit = int((_df_alertas["severidad"].astype(str).str.upper() == "CRITICAL").sum()) if not _df_alertas.empty and "severidad"in _df_alertas.columns else 0
n_alert_warn = int((_df_alertas["severidad"].astype(str).str.upper().isin({"WARNING", "ALTA", "MEDIUM", "MEDIA"})).sum()) if not _df_alertas.empty and "severidad"in _df_alertas.columns else 0

partido_top = "—"
presion_top = 0.0
if not _df_mom.empty:
    r = _df_mom.sort_values("prioridad_score"if "prioridad_score"in _df_mom.columns else "presion_score", ascending=False).iloc[0]
    partido_top = str(r.get("partido") or "—")
    presion_top = _safe_float(r.get("ratio_menciones"))

fuentes_ok = 0
fuentes_total = 0
if not _df_health.empty and "status"in _df_health.columns:
    fuentes_total = len(_df_health)
    fuentes_ok = int((_df_health["status"].astype(str).str.lower() == "ok").sum())

lider = "—"
lider_pct = None
if not _df_nc.empty and {"partido", "estimacion_pct"}.issubset(set(_df_nc.columns)):
    tmp = _df_nc.copy()
    tmp["estimacion_pct"] = pd.to_numeric(tmp["estimacion_pct"], errors="coerce")
    tmp = tmp.dropna(subset=["estimacion_pct"])
    if not tmp.empty:
        top = tmp.sort_values("estimacion_pct", ascending=False).iloc[0]
        lider = str(top.get("partido") or "—")
        lider_pct = _safe_float(top.get("estimacion_pct"))

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Noticias (24h)", n_news)
c2.metric("Alertas críticas", n_alert_crit)
c3.metric("Alertas warning", n_alert_warn)
c4.metric("Presión mediática", partido_top, f"{presion_top:.2f}x"if presion_top else None)
c5.metric("Nowcasting líder", lider, f"{lider_pct:.1f}%"if lider_pct is not None else None)

st.markdown("---")

col_left, col_mid, col_right = st.columns([1.3, 1.2, 1])

with col_left:
    st.markdown("### Alertas priorizadas")
    if _df_dyn.empty:
        st.info("Sin alertas dinámicas relevantes ahora mismo.")
    else:
        st.dataframe(
            _df_dyn[[c for c in ["severidad", "titulo", "detalle", "accion"] if c in _df_dyn.columns]].head(12),
            hide_index=True,
            use_container_width=True,
        )

with col_mid:
    st.markdown("### Estado de fuentes")
    if _df_health.empty:
        st.caption("Sin datos de salud de fuentes.")
    else:
        st.metric("Fuentes OK", f"{fuentes_ok}/{fuentes_total}")
        view_cols = [c for c in ["source_id", "status", "articles_count", "errors_count", "freshness_lag_s"] if c in _df_health.columns]
        st.dataframe(_df_health[view_cols].head(12), hide_index=True, use_container_width=True)

with col_right:
    st.markdown("### Entrar al detalle")
    _safe_page_link("pages/10_Prensa_Agenda.py", label="Ir a Prensa & Agenda")
    _safe_page_link("pages/14_Monitor_Sentimiento.py", label="Ir a Monitor de Sentimiento")
    _safe_page_link("pages/8_Tiempo_Real.py", label="Ir a Tiempo Real")
    _safe_page_link("pages/D1_Briefings.py", label="Ir a Briefings")
    st.markdown("<div style='height:.7rem'></div>", unsafe_allow_html=True)
    st.markdown(
        f"""
        <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:.8rem .9rem">
          <div style="font-size:.65rem;color:{MUTED};font-weight:700;letter-spacing:.1em;text-transform:uppercase">Estado</div>
          <div style="font-size:.9rem;color:{GREEN if n_alert_crit == 0 else RED};font-weight:700;margin-top:.2rem">
            {'Operativo'if n_alert_crit == 0 else 'Requiere atención'}
          </div>
          <div style="font-size:.76rem;color:{TEXT2};margin-top:.35rem">
            {'Sin alertas críticas activas.'if n_alert_crit == 0 else 'Hay alertas críticas pendientes en el sistema.'}
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

st.caption("Tip: usa esta portada como control diario y entra a cada módulo cuando una señal pase a WARNING/CRITICAL.")
