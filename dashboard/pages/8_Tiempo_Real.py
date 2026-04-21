"""
Página: Tiempo Real

Monitor de scrapers, alertas del sistema e indicadores macroeconómicos.
"""

from __future__ import annotations


import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)

from dashboard.db import cargar_alertas, cargar_macro_serie, cargar_macro_ultimo, cargar_scraping_log

st.set_page_config(page_title="Tiempo Real — ElectSim", layout="wide")

sidebar_nav()

with st.sidebar:
    st.header("Configuración")
    auto_refresh = st.checkbox("Auto-refresh (30s)", value=False)
    if auto_refresh:
        import time
        st.info("La página se recarga cada 30 segundos")
        time.sleep(30)
        st.rerun()

    solo_no_leidas = st.checkbox("Solo alertas no leidas", value=True)
    dias_macro = st.slider("Ventana macro (dias)", 30, 730, 180)

st.markdown(f"""
<style>
@keyframes fadeInUp {{
    from {{ opacity:0; transform:translateY(18px); }}
    to   {{ opacity:1; transform:translateY(0); }}
}}
@keyframes dotPulse {{
    0%,100% {{ opacity:.4; transform:scale(1); }}
    50%      {{ opacity:1; transform:scale(1.3); }}
}}
.alert-card {{
    border-radius:8px; padding:.55rem 1rem; margin:.3rem 0;
    border-left-width:4px; border-left-style:solid; animation:fadeInUp .35s ease both;
}}
.scraper-row {{
    background:{BG2}; border:1px solid {BORDER}; border-radius:8px;
    padding:.5rem 1rem; margin:.3rem 0; font-size:.85rem;
}}
.sec-hdr {{
    display:flex; align-items:center; gap:.7rem; margin:1.8rem 0 1rem;
}}
.sec-hdr .bar  {{ width:4px; height:18px; border-radius:2px; flex-shrink:0; }}
.sec-hdr .lbl  {{ font-size:.65rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:{MUTED}; }}
.sec-hdr .line {{ flex:1; height:1px; background:{BORDER}; }}
</style>
""", unsafe_allow_html=True)

st.markdown(f"""
<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:2rem 2.5rem;margin-bottom:2rem;overflow:hidden;animation:fadeInUp .5s ease both">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;
                background:radial-gradient(circle,{CYAN}1A,transparent 65%);border-radius:50%;pointer-events:none"></div>
    <div style="position:relative">
        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">
            <div style="width:8px;height:8px;border-radius:50%;background:{CYAN};animation:dotPulse 2s ease infinite"></div>
            <span style="font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:{CYAN}">EN VIVO</span>
        </div>
        <div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};line-height:1.1">
            Monitor <span style="color:{CYAN}">Tiempo Real</span>
        </div>
        <div style="font-size:.88rem;color:{TEXT2};margin-top:.4rem">
            Estado de scrapers, alertas del sistema y feed de indicadores económicos
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Estado de scrapers ────────────────────────────────────────────────────────
col_scrapers, col_alertas = st.columns([1, 1])

with col_scrapers:
    st.markdown(f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Estado de Scrapers</span><div class="line"></div></div>', unsafe_allow_html=True)
    df_log = cargar_scraping_log(30)

    if df_log.empty:
        st.info("Sin datos de scraping. Los scrapers estan en modo dry_run por defecto.")
        st.markdown("""
        Para activar scrapers reales:
        ```bash
        ELECTSIM_DRY_RUN=false python -m etl.realtime.cis_monitor
        python pipelines/realtime_scheduler.py --flow diario
        ```
        """)
    else:
        df_resumen = (
            df_log.groupby("fuente")
            .agg(
                ultimo_estado=("estado", "first"),
                n_nuevos_total=("n_registros_nuevos", "sum"),
                n_ejecuciones=("estado", "count"),
                ultimo_scrape=("created_at", "max"),
            )
            .reset_index()
        )

        for _, row in df_resumen.iterrows():
            status = "OK" if row["ultimo_estado"] == "ok" else "ERROR"
            color = GREEN if row["ultimo_estado"] == "ok" else RED
            st.markdown(
                f'<span style="color:{color};font-weight:600">[{status}]</span> '
                f'**{row["fuente"]}** — {row["n_nuevos_total"]} registros · '
                f'{row["n_ejecuciones"]} ejecuciones · ultimo: {str(row["ultimo_scrape"])[:16]}',
                unsafe_allow_html=True,
            )

        st.markdown(f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Log detallado</span><div class="line"></div></div>', unsafe_allow_html=True)
        cols_log = [c for c in ["fuente", "tipo", "estado", "n_registros_nuevos", "duracion_segundos", "created_at"] if c in df_log.columns]
        st.dataframe(df_log[cols_log].head(20), hide_index=True, use_container_width=True)

with col_alertas:
    st.markdown(f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Alertas del Sistema</span><div class="line"></div></div>', unsafe_allow_html=True)
    df_alertas = cargar_alertas(solo_no_leidas)

    if df_alertas.empty:
        st.success("Sin alertas activas")
    else:
        for _, row in df_alertas.iterrows():
            sev = row.get("severidad", "INFO")
            border = {"CRITICAL": RED, "WARNING": AMBER}.get(sev, BLUE)
            tipo_alerta = row.get("tipo", "")
            st.markdown(f"""
            <div style="border-left:4px solid {border};padding:0.55rem 1rem;
                        margin:0.3rem 0;background:{BG2};border-radius:0 8px 8px 0;border:1px solid {BORDER};border-left:4px solid {border}">
                <strong style="color:{TEXT}">[{sev}]</strong> <span style="color:{TEXT2}">{row.get('titulo', '')}</span>
                <br><small style="color:{MUTED}">{str(row.get('descripcion', ''))[:150]}</small>
                <br><small style="color:{MUTED}">{str(row.get('created_at', ''))[:16]} · {tipo_alerta}</small>
            </div>
            """, unsafe_allow_html=True)

st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.2rem 0"></div>', unsafe_allow_html=True)

# ── Indicadores macroeconómicos ───────────────────────────────────────────────
st.markdown(f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Indicadores Macroeconómicos</span><div class="line"></div></div>', unsafe_allow_html=True)

df_macro_last = cargar_macro_ultimo()
if not df_macro_last.empty:
    indicadores_config = {
        "IPC General (%)": ("IPC Inflacion", "%", "ipc_general"),
        "Tasa de Paro (%)": ("Tasa de Paro", "%", "tasa_paro"),
        "Prima Riesgo (pb)": ("Prima de Riesgo", " pb", "prima_riesgo_bono10"),
        "Crec. PIB (%)": ("PIB YoY", "%", "crecimiento_pib"),
    }
    cols_kpi = st.columns(4)
    for i, (ind, (label, unidad, col_serie)) in enumerate(indicadores_config.items()):
        fila = df_macro_last[df_macro_last["indicador"] == ind]
        with cols_kpi[i]:
            if not fila.empty:
                val = float(fila.iloc[0]["valor"])
                fecha = str(fila.iloc[0].get("fecha", ""))[:10]
                st.metric(label, f"{val:.1f}{unidad}", help=f"Fecha: {fecha}")
            else:
                st.metric(label, "—")

# Series temporales
indicadores_disponibles = [
    ("ipc_general", "Inflacion IPC (%)"),
    ("tasa_paro", "Tasa de Paro (%)"),
    ("prima_riesgo_bono10", "Prima de Riesgo (pb)"),
    ("crecimiento_pib", "PIB YoY (%)"),
]

ind_sel = st.multiselect(
    "Indicadores a mostrar",
    [k for k, _ in indicadores_disponibles],
    default=["ipc_general", "tasa_paro"],
    format_func=lambda x: dict(indicadores_disponibles).get(x, x),
)

if ind_sel:
    fig_macro = go.Figure()
    colores = [CYAN, BLUE, GREEN, AMBER]

    for i, ind in enumerate(ind_sel):
        label = dict(indicadores_disponibles).get(ind, ind)
        df_serie = cargar_macro_serie(ind, anios=dias_macro // 365 + 1)
        if not df_serie.empty:
            fig_macro.add_trace(go.Scatter(
                x=df_serie["fecha"],
                y=df_serie["valor"],
                name=label,
                mode="lines",
                line=dict(color=colores[i % len(colores)], width=2),
            ))

    if len(fig_macro.data) > 0:
        fig_macro.update_layout(
            height=400,
            xaxis_title="Fecha",
            yaxis_title="Valor",
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            hovermode="x unified",
            legend=dict(orientation="h", y=-0.2, font=dict(color=TEXT2)),
            margin=dict(t=20, b=60),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_macro, use_container_width=True)
    else:
        st.info("Sin series temporales macroeconómicas.")

st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.2rem 0"></div>', unsafe_allow_html=True)

# ── Monitor CIS ───────────────────────────────────────────────────────────────
st.markdown(f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Monitor CIS</span><div class="line"></div></div>', unsafe_allow_html=True)
st.markdown("""
El monitor CIS detecta nuevas públicaciones de barometros y estudios preelectorales
y los ingesta automaticamente.
""")

df_cis_log = cargar_scraping_log(10)
if not df_cis_log.empty:
    df_cis = df_cis_log[df_cis_log["fuente"].str.contains("cis", case=False, na=False)]
    if not df_cis.empty:
        st.dataframe(
            df_cis[["estado", "n_registros_nuevos", "duracion_segundos", "created_at"]].head(5),
            hide_index=True,
        )
    else:
        st.info("El scraper CIS no ha ejecutado aun en modo live (dry_run activo)")
else:
    st.info("Sin logs de scraping")

st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.2rem 0"></div>', unsafe_allow_html=True)

# ── Noche electoral ───────────────────────────────────────────────────────────
st.markdown(f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Monitor Noche Electoral</span><div class="line"></div></div>', unsafe_allow_html=True)
st.markdown("""
Activalo durante una noche electoral para seguir el escrutinio en tiempo real:
```bash
ELECTSIM_DRY_RUN=false python pipelines/realtime_scheduler.py --flow noche
```
Actualiza `resultados_electorales` incrementalmente conforme avanza el escrutinio
y lanza alertas si se producen vuelcos significativos en escanos.
""")
