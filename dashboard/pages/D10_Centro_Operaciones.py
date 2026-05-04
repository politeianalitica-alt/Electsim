"""
D10 — Centro de Operaciones de Datos — Bloque 8.

Panel de salud del sistema de datos:
  - KPIs globales del estado del sistema
  - Estado de fuentes por dominio
  - Frescura de datos por módulo
  - Errores de calidad en las últimas 24h
  - Pipelines recientes

Alimentado por dashboard.services.data_ops_core.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav, aplicar_estilos,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    section_header, kpi_card,
)

st.set_page_config(
    page_title="Centro de Operaciones de Datos · Politeia",
    layout="wide",
    initial_sidebar_state="collapsed",
)
sidebar_nav()
aplicar_estilos()

# ── Imports de servicio ────────────────────────────────────────────────────────

try:
    from dashboard.services.data_ops_core import (
        cargar_kpis_data_ops,
        cargar_estado_fuentes,
        cargar_modulos_freshness,
        cargar_quality_summary,
        cargar_pipeline_runs,
    )
    _SERVICE_OK = True
except Exception:
    _SERVICE_OK = False


# ── Helpers ────────────────────────────────────────────────────────────────────

def _status_badge(status: str) -> str:
    colors = {
        "healthy": GREEN,
        "degraded": AMBER,
        "warning": AMBER,
        "down": RED,
        "unknown": MUTED,
        "success": GREEN,
        "failed": RED,
        "running": CYAN,
        "partial": AMBER,
    }
    icons = {
        "healthy": "✅",
        "degraded": "⚠️",
        "warning": "⚠️",
        "down": "🔴",
        "unknown": "❓",
        "success": "✅",
        "failed": "❌",
        "running": "🔄",
        "partial": "⚠️",
    }
    color = colors.get(status, MUTED)
    icon = icons.get(status, "•")
    return f'<span style="color:{color};font-weight:600">{icon} {status.upper()}</span>'


def _overall_banner(status: str) -> None:
    color_map = {
        "healthy": (GREEN, "Sistema operativo · Todos los módulos frescos", "✅"),
        "warning": (AMBER, "Atención · Algunos módulos con retrasos", "⚠️"),
        "degraded": (RED, "Sistema degradado · Fuentes con problemas", "🔴"),
        "unknown": (MUTED, "Estado desconocido · Sin datos de salud", "❓"),
    }
    color, msg, icon = color_map.get(status, color_map["unknown"])
    st.markdown(
        f"""<div style="background:{BG2};border-left:4px solid {color};
        padding:12px 16px;border-radius:6px;margin-bottom:16px">
        <span style="color:{color};font-size:1.1rem;font-weight:700">{icon} {msg}</span>
        </div>""",
        unsafe_allow_html=True,
    )


def _source_status_bar(df: pd.DataFrame) -> None:
    """Mini barras de estado por dominio."""
    if df.empty:
        st.caption("Sin datos de fuentes")
        return

    for domain, grp in df.groupby("domain"):
        total = len(grp)
        healthy = (grp.get("status", pd.Series()) == "healthy").sum()
        down = (grp.get("status", pd.Series()) == "down").sum()
        pct = int(healthy / total * 100) if total else 0
        bar_color = GREEN if pct >= 80 else AMBER if pct >= 50 else RED
        st.markdown(
            f"""<div style="display:flex;align-items:center;gap:10px;
            margin-bottom:6px;font-size:.85rem">
            <span style="color:{TEXT2};width:120px;flex-shrink:0">{domain}</span>
            <div style="flex:1;background:{BG3};border-radius:4px;height:8px">
              <div style="width:{pct}%;background:{bar_color};
              border-radius:4px;height:8px"></div>
            </div>
            <span style="color:{TEXT2};width:60px;text-align:right">
              {healthy}/{total} OK</span>
            {"<span style='color:"+RED+"'>"+str(down)+" ↓</span>" if down else ""}
            </div>""",
            unsafe_allow_html=True,
        )


def _freshness_table(df: pd.DataFrame) -> None:
    if df.empty:
        st.caption("Sin datos de frescura")
        return

    color_map = {"healthy": GREEN, "degraded": AMBER, "down": RED, "unknown": MUTED}

    for _, row in df.iterrows():
        status = row.get("status", "unknown")
        color = color_map.get(status, MUTED)
        lag = row.get("lag_minutes")
        expected = row.get("expected_minutes")
        lag_str = f"{int(lag)} min" if pd.notna(lag) else "—"
        exp_str = f"{int(expected)} min" if pd.notna(expected) else "—"
        table = row.get("table", row.get("module", "—"))
        module = row.get("module", "—")
        st.markdown(
            f"""<div style="display:flex;align-items:center;gap:8px;
            padding:5px 0;border-bottom:1px solid {BORDER};font-size:.82rem">
            <span style="color:{color};width:10px">●</span>
            <span style="color:{TEXT};width:160px;flex-shrink:0">{module}</span>
            <span style="color:{MUTED};width:140px;flex-shrink:0">{table}</span>
            <span style="color:{TEXT2};flex:1">lag {lag_str} / esp {exp_str}</span>
            </div>""",
            unsafe_allow_html=True,
        )


# ── Header ─────────────────────────────────────────────────────────────────────

st.markdown(
    f'<h1 style="color:{CYAN};margin-bottom:4px">⚙️ Centro de Operaciones de Datos</h1>',
    unsafe_allow_html=True,
)
st.markdown(
    f'<p style="color:{MUTED};margin-top:0">Salud del sistema ETL · Fuentes · Calidad · Pipelines</p>',
    unsafe_allow_html=True,
)

# ── Carga datos ────────────────────────────────────────────────────────────────

if not _SERVICE_OK:
    st.warning("Servicio data_ops_core no disponible. Comprueba las dependencias.")
    st.stop()

with st.spinner("Cargando estado del sistema…"):
    kpis = cargar_kpis_data_ops()
    df_fuentes = cargar_estado_fuentes()
    df_freshness = cargar_modulos_freshness()
    quality = cargar_quality_summary()
    df_runs = cargar_pipeline_runs(limit=20)

# ── Banner de estado global ────────────────────────────────────────────────────

overall = kpis.get("overall_status", "unknown")
_overall_banner(overall)

# ── KPIs ───────────────────────────────────────────────────────────────────────

section_header("Estado Global", "📊")
c1, c2, c3, c4, c5, c6 = st.columns(6)

with c1:
    kpi_card(
        "Fuentes OK",
        str(kpis.get("sources_healthy", 0)),
        delta=None,
        color=GREEN,
    )
with c2:
    kpi_card(
        "Degradadas",
        str(kpis.get("sources_degraded", 0)),
        delta=None,
        color=AMBER,
    )
with c3:
    kpi_card(
        "Caídas",
        str(kpis.get("sources_down", 0)),
        delta=None,
        color=RED,
    )
with c4:
    runs_ok = kpis.get("pipelines_ok_24h", 0)
    runs_fail = kpis.get("pipelines_failed_24h", 0)
    kpi_card("Runs OK (24h)", str(runs_ok), delta=None, color=GREEN)
with c5:
    kpi_card("Runs fallidos (24h)", str(runs_fail), delta=None,
             color=RED if runs_fail > 0 else MUTED)
with c6:
    qpass = quality.get("pass_pct", quality.get("pass_rate", 1.0))
    if isinstance(qpass, float) and qpass <= 1.0:
        qpass = round(qpass * 100, 1)
    kpi_card("Calidad (%)", f"{qpass:.1f}%", delta=None,
             color=GREEN if qpass >= 90 else AMBER if qpass >= 70 else RED)

st.divider()

# ── Dos columnas: Fuentes + Freshness ─────────────────────────────────────────

col_src, col_fresh = st.columns([1, 1])

with col_src:
    section_header("Estado de Fuentes por Dominio", "🔌")
    _source_status_bar(df_fuentes)

    if not df_fuentes.empty:
        n_unknown = (df_fuentes.get("status", pd.Series()) == "unknown").sum()
        if n_unknown:
            st.caption(f"⚠️ {n_unknown} fuente(s) con estado desconocido")

        with st.expander("Ver tabla completa de fuentes"):
            cols_show = [c for c in
                         ["name", "domain", "source_type", "status",
                          "freshness_lag_minutes", "active", "risk_level"]
                         if c in df_fuentes.columns]
            st.dataframe(
                df_fuentes[cols_show] if cols_show else df_fuentes,
                use_container_width=True,
                height=250,
            )

with col_fresh:
    section_header("Frescura por Módulo", "🕐")
    _freshness_table(df_freshness)

    if not df_freshness.empty:
        stale = df_freshness[df_freshness.get("status", "unknown").isin(
            ["degraded", "down"]
        )] if "status" in df_freshness.columns else pd.DataFrame()
        if not stale.empty:
            st.caption(f"⚠️ {len(stale)} módulo(s) con datos desactualizados")

st.divider()

# ── Calidad de Datos ───────────────────────────────────────────────────────────

section_header("Calidad de Datos (últimas 24h)", "✅")
qc1, qc2, qc3, qc4, qc5 = st.columns(5)

with qc1:
    kpi_card("Total checks", str(quality.get("total", 0)), color=TEXT2)
with qc2:
    kpi_card("Pasados", str(quality.get("passed", 0)), color=GREEN)
with qc3:
    kpi_card("Fallidos", str(quality.get("failed", 0)),
             color=RED if quality.get("failed", 0) > 0 else MUTED)
with qc4:
    kpi_card("Avisos", str(quality.get("warning", 0)),
             color=AMBER if quality.get("warning", 0) > 0 else MUTED)
with qc5:
    kpi_card("Omitidos", str(quality.get("skipped", 0)), color=MUTED)

st.divider()

# ── Pipelines recientes ────────────────────────────────────────────────────────

section_header("Ejecuciones Recientes de Pipelines", "🔄")

if df_runs.empty:
    st.info("No hay ejecuciones registradas aún.")
else:
    # Timeline / tabla
    status_colors = {
        "success": GREEN, "failed": RED, "running": CYAN,
        "partial": AMBER, "skipped": MUTED,
    }

    display_cols = [c for c in [
        "pipeline_id", "source_id", "status", "started_at",
        "duration_seconds", "records_extracted", "records_loaded", "records_failed",
        "error_type",
    ] if c in df_runs.columns]

    def _color_status(val):
        color = status_colors.get(str(val).lower(), MUTED)
        return f"color: {color}; font-weight: bold"

    styled = df_runs[display_cols].style
    if "status" in display_cols:
        styled = styled.applymap(_color_status, subset=["status"])

    st.dataframe(styled, use_container_width=True, height=320)

    # Mini chart: runs por estado últimas 24h
    if "status" in df_runs.columns and "started_at" in df_runs.columns:
        try:
            df_chart = df_runs.groupby("status").size().reset_index(name="n")
            fig = go.Figure(go.Bar(
                x=df_chart["status"],
                y=df_chart["n"],
                marker_color=[status_colors.get(s, MUTED) for s in df_chart["status"]],
                text=df_chart["n"],
                textposition="outside",
            ))
            fig.update_layout(
                paper_bgcolor=BG, plot_bgcolor=BG2,
                font_color=TEXT2, height=200,
                margin=dict(l=0, r=0, t=20, b=0),
                xaxis=dict(gridcolor=BORDER),
                yaxis=dict(gridcolor=BORDER),
                showlegend=False,
            )
            st.plotly_chart(fig, use_container_width=True)
        except Exception:
            pass

st.divider()

# ── Footer ─────────────────────────────────────────────────────────────────────

computed_at = kpis.get("computed_at", "—")
st.markdown(
    f'<p style="color:{MUTED};font-size:.78rem;text-align:right">'
    f'Actualizado: {str(computed_at)[:19] if computed_at else "—"} UTC</p>',
    unsafe_allow_html=True,
)
