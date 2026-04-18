"""
Página: Validación del Sistema

Muestra metricas de backtesting, calibracion de agentes,
calidad de datos y evolución temporal de las metricas del modelo.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)

from dashboard.db import (
    cargar_historial_validacion,
    cargar_validacion_por_partido,
    cargar_casas_cobertura,
    cargar_fuentes_macro,
)

st.set_page_config(page_title="Validación — ElectSim", layout="wide")

sidebar_nav()

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
                background:radial-gradient(circle,{BLUE}1A,transparent 65%);border-radius:50%;pointer-events:none"></div>
    <div style="position:relative">
        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">
            <div style="width:8px;height:8px;border-radius:50%;background:{GREEN};animation:dotPulse 2s ease infinite"></div>
            <span style="font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:{GREEN}">SISTEMA VALIDADO</span>
        </div>
        <div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};line-height:1.1">
            Validación del <span style="color:{CYAN}">Sistema</span>
        </div>
        <div style="font-size:.88rem;color:{TEXT2};margin-top:.4rem">
            Métricas de precisión del modelo, calibración de agentes y calidad de datos
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Historial ─────────────────────────────────────────────────────────────────
df_hist = cargar_historial_validacion()

if df_hist.empty or "tipo" not in df_hist.columns:
    st.info("""
    Sin resultados de validación. Ejecuta la Fase 5:
    ```
    python -m pipelines.fase5_validación
    ```
    """)
    st.stop()

ultimo_bt = df_hist[df_hist["tipo"].astype(str) == "backtesting"].head(1)
ultimo_cal = df_hist[df_hist["tipo"].astype(str) == "calibracion"].head(1)
ultimo_qc = df_hist[df_hist["tipo"].astype(str) == "calidad"].head(1)

# ── KPIs ──────────────────────────────────────────────────────────────────────
st.markdown(f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Última Ejecución de Validación</span><div class="line"></div></div>', unsafe_allow_html=True)

col1, col2, col3, col4, col5 = st.columns(5)

with col1:
    if not ultimo_bt.empty and pd.notna(ultimo_bt.iloc[0].get("brier_score")):
        bs = float(ultimo_bt.iloc[0]["brier_score"])
        st.metric("Brier Score", f"{bs:.4f}",
                  help="Regla de puntuacion propia. 0=perfecto, 2=max. error. Bueno si <0.10")
    else:
        st.metric("Brier Score", "—")

with col2:
    if not ultimo_bt.empty and pd.notna(ultimo_bt.iloc[0].get("rmse_voto")):
        rmse = float(ultimo_bt.iloc[0]["rmse_voto"])
        st.metric("RMSE Voto", f"{rmse*100:.2f} pp")
    else:
        st.metric("RMSE Voto", "—")

with col3:
    if not ultimo_bt.empty and pd.notna(ultimo_bt.iloc[0].get("mae_escanos")):
        mae_esc = float(ultimo_bt.iloc[0]["mae_escanos"])
        st.metric("MAE Escanos", f"{mae_esc:.1f}")
    else:
        st.metric("MAE Escanos", "—")

with col4:
    if not ultimo_qc.empty and pd.notna(ultimo_qc.iloc[0].get("pct_completitud")):
        pct = float(ultimo_qc.iloc[0]["pct_completitud"])
        sem_color = "normal" if pct >= 90 else "off" if pct >= 70 else "inverse"
        st.metric("Calidad Datos", f"{pct:.1f}%", delta_color=sem_color)
    else:
        st.metric("Calidad Datos", "—")

with col5:
    if not ultimo_bt.empty and pd.notna(ultimo_bt.iloc[0].get("cobertura_95ci")):
        cob = float(ultimo_bt.iloc[0]["cobertura_95ci"])
        st.metric("Cobertura IC 95%", f"{cob*100:.1f}%", help="Objetivo: ~95%")
    else:
        st.metric("Cobertura IC 95%", "—")

st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.2rem 0"></div>', unsafe_allow_html=True)

tab1, tab2, tab3 = st.tabs(["Backtesting", "Calibracion Agentes", "Calidad de Datos"])

# ── Tab 1: Backtesting ────────────────────────────────────────────────────────
with tab1:
    df_bt = df_hist[df_hist["tipo"].astype(str) == "backtesting"].copy()

    if df_bt.empty:
        st.info("Sin resultados de backtesting")
    else:
        if len(df_bt) > 1:
            st.markdown(f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Evolución del Brier Score</span><div class="line"></div></div>', unsafe_allow_html=True)
            fig_ev = go.Figure()
            fig_ev.add_trace(go.Scatter(
                x=df_bt["created_at"], y=df_bt["brier_score"],
                mode="lines+markers", name="Brier Score",
                line=dict(color=RED, width=2),
            ))
            fig_ev.update_layout(
                height=300, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                xaxis_title="Fecha", yaxis_title="Brier Score",
                font=dict(color=TEXT2),
            )
            st.plotly_chart(fig_ev, use_container_width=True)

        st.markdown(f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Error por Partido (última ejecución)</span><div class="line"></div></div>', unsafe_allow_html=True)
        run_id_last = df_bt.iloc[0]["run_id"]
        df_part = cargar_validacion_por_partido(run_id_last)

        if not df_part.empty:
            fig_part = go.Figure(go.Bar(
                x=df_part["partido_siglas"],
                y=df_part["error_pct"].abs(),
                marker_color=df_part["error_pct"].abs().apply(
                    lambda x: GREEN if x < 2 else AMBER if x < 5 else RED
                ),
                text=df_part["error_pct"].round(2).astype(str) + " pp",
                textposition="outside",
            ))
            fig_part.update_layout(
                title="Error de predicción por partido (pp)",
                xaxis_title="Partido", yaxis_title="Error absoluto (pp)",
                height=380, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                font=dict(color=TEXT2),
            )
            st.plotly_chart(fig_part, use_container_width=True)

            st.markdown(f'<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Real vs Predicho por Partido</span><div class="line"></div></div>', unsafe_allow_html=True)
            cols_show = ["partido_siglas", "voto_real_pct", "voto_pred_pct", "error_pct",
                         "escanos_reales", "escanos_pred_mediana", "escanos_pred_p5", "escanos_pred_p95"]
            cols_show = [c for c in cols_show if c in df_part.columns]
            st.dataframe(
                df_part[cols_show].rename(columns={
                    "partido_siglas": "Partido",
                    "voto_real_pct": "Voto Real (%)",
                    "voto_pred_pct": "Voto Pred. (%)",
                    "error_pct": "Error (pp)",
                    "escanos_reales": "Esc. Real",
                    "escanos_pred_mediana": "Esc. Pred.",
                    "escanos_pred_p5": "Esc. P5",
                    "escanos_pred_p95": "Esc. P95",
                }).round(2),
                hide_index=True, use_container_width=True,
            )

# ── Tab 2: Calibracion ────────────────────────────────────────────────────────
with tab2:
    df_cal = df_hist[df_hist["tipo"].astype(str) == "calibracion"].copy()

    if df_cal.empty:
        st.info("Sin resultados de calibracion de agentes")
    else:
        for _, row in df_cal.head(5).iterrows():
            n_ok = row.get("n_checks_ok")
            n_fail = row.get("n_checks_fail")
            calibrado = n_fail is not None and int(n_fail) == 0
            estado = "Calibrado" if calibrado else "Descalibrado"

            with st.expander(f"{estado} — {row['created_at']}"):
                c1, c2, c3 = st.columns(3)
                with c1:
                    st.metric("Checks OK", int(n_ok) if n_ok is not None else "—")
                with c2:
                    st.metric("Checks Fail", int(n_fail) if n_fail is not None else "—")
                with c3:
                    st.metric("Modelo", row.get("modelo", "—"))

# ── Tab 3: Calidad Datos ──────────────────────────────────────────────────────
with tab3:
    df_qc = df_hist[df_hist["tipo"].astype(str) == "calidad"].copy()

    if df_qc.empty:
        st.info("Sin resultados de calidad de datos")
    else:
        if len(df_qc) > 1:
            fig_qc = go.Figure()
            fig_qc.add_trace(go.Scatter(
                x=df_qc["created_at"],
                y=df_qc["pct_completitud"].astype(float),
                mode="lines+markers", name="% Checks OK",
                fill="tozeroy", fillcolor="rgba(39, 174, 96, 0.15)",
                line=dict(color=GREEN),
            ))
            fig_qc.add_hline(y=90, line_dash="dash", line_color=GREEN,
                             annotation_text="Objetivo 90%")
            fig_qc.add_hline(y=70, line_dash="dash", line_color=AMBER,
                             annotation_text="Minimo 70%")
            fig_qc.update_layout(
                height=300, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                xaxis_title="Fecha", yaxis_title="% Checks OK",
                font=dict(color=TEXT2),
            )
            st.plotly_chart(fig_qc, use_container_width=True)

        ultimo_qc_row = df_qc.iloc[0]
        c1, c2 = st.columns(2)
        with c1:
            st.metric("% Checks OK", f"{float(ultimo_qc_row['pct_completitud']):.1f}%")
        with c2:
            n_ok = int(ultimo_qc_row.get("n_checks_ok") or 0)
            n_fail = int(ultimo_qc_row.get("n_checks_fail") or 0)
            st.metric("Checks OK / Fail", f"{n_ok} / {n_fail}")


# ── Accuracy casas encuestadoras ──────────────────────────────────────────────
st.markdown(f"""
<div class="sec-hdr">
    <div class="bar" style="background:linear-gradient({CYAN},{BLUE})"></div>
    <span class="lbl" style="color:{CYAN}">CASAS ENCUESTADORAS · BACKTEST HISTÓRICO</span>
    <div class="line"></div>
</div>
""", unsafe_allow_html=True)

df_casas = cargar_casas_cobertura()
if df_casas.empty:
    st.info("Sin backtest disponible. Ejecuta `python -m validation.backtest_casas` para generar los ratings.")
else:
    # KPIs agregados.
    n_casas_activas = int(df_casas["activa"].sum()) if "activa" in df_casas.columns else len(df_casas)
    n_con_dato_7d = int((df_casas["n_encuestas_7d"].fillna(0).astype(int) > 0).sum())
    rating_medio = float(df_casas["rating"].astype(float).mean()) if "rating" in df_casas.columns and not df_casas["rating"].isna().all() else 3.0
    mae_medio = float(df_casas["mae_ewma"].astype(float).mean()) if "mae_ewma" in df_casas.columns and not df_casas["mae_ewma"].isna().all() else 0.0

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Casas activas", n_casas_activas)
    k2.metric("Con dato ≤7d", f"{n_con_dato_7d} / {n_casas_activas}")
    k3.metric("Rating medio", f"{rating_medio:.2f} / 5")
    k4.metric("MAE EWMA medio", f"{mae_medio:.2f} pp")

    df_show = df_casas.rename(columns={
        "casa_nombre": "Casa",
        "rating": "Rating",
        "mae_ewma": "MAE (pp)",
        "n_elecciones_bt": "N elecc.",
        "ultima_fecha_encuesta": "Última",
        "n_encuestas_7d": "Enc. 7d",
        "n_encuestas_30d": "Enc. 30d",
    })
    cols_show = [c for c in ["Casa", "Rating", "MAE (pp)", "N elecc.", "Última", "Enc. 7d", "Enc. 30d"] if c in df_show.columns]
    st.dataframe(df_show[cols_show], use_container_width=True, hide_index=True)


# ── Fuentes macro catálogo ────────────────────────────────────────────────────
st.markdown(f"""
<div class="sec-hdr">
    <div class="bar" style="background:linear-gradient({PURPLE},{CYAN})"></div>
    <span class="lbl" style="color:{PURPLE}">FUENTES MACRO · CATÁLOGO DE DATOS</span>
    <div class="line"></div>
</div>
""", unsafe_allow_html=True)

df_fm = cargar_fuentes_macro()
if df_fm.empty:
    st.info("Sin catálogo de fuentes macro. Ejecuta el seed `db/seeds/04_casas_fuentes.sql`.")
else:
    st.dataframe(
        df_fm.rename(columns={
            "codigo": "Código",
            "proveedor": "Proveedor",
            "dataset": "Dataset",
            "categoria": "Categoría",
            "frecuencia": "Frecuencia",
            "latencia_dias": "Latencia (d)",
            "peso_base": "Peso",
            "activa": "Activa",
        }),
        use_container_width=True,
        hide_index=True,
    )
