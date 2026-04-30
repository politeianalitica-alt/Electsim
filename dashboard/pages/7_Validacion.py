"""
Página: Validación del Sistema

Backtesting del modelo, calibración de agentes LLM, calidad de datos,
ratings de casas encuestadoras y catálogo de fuentes macro.
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

from dashboard.db import (
    cargar_casas_cobertura,
    cargar_fuentes_macro,
    cargar_historial_validacion,
    cargar_validacion_por_partido,
)
from dashboard.shared import (
    AMBER,
    BG,
    BG2,
    BG3,
    BLUE,
    BORDER,
    CYAN,
    GREEN,
    MUTED,
    PURPLE,
    RED,
    TEXT,
    TEXT2,
    hex_to_rgba,
    kpi_card,
    safe_float,
    safe_numeric,
    section_header,
    semaforo_color,
    sidebar_nav,
)

st.set_page_config(page_title="Validación — ElectSim", layout="wide")
sidebar_nav()


# ── Helpers locales ──────────────────────────────────────────────────────────


def _layout_dark(fig: go.Figure, height: int = 340, **kw) -> go.Figure:
    """Aplica tema oscuro a una figura Plotly y mergea kwargs sin chocar."""
    base = dict(
        height=height,
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font={"family": "Inter, sans-serif", "color": TEXT2, "size": 12},
        margin=dict(t=50, b=40, l=40, r=20),
        legend=dict(
            orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1,
            bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT2, size=11),
        ),
        xaxis=dict(gridcolor=BORDER, zerolinecolor=BORDER, color=TEXT2),
        yaxis=dict(gridcolor=BORDER, zerolinecolor=BORDER, color=TEXT2),
    )
    for k, v in kw.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            merged = dict(base[k])
            merged.update(v)
            base[k] = merged
        else:
            base[k] = v
    fig.update_layout(**base)
    return fig


def _brier_color(v: float) -> str:
    """Brier: menor es mejor. Bueno <0.10, amber <0.20, rojo ≥0.20."""
    return semaforo_color(v, thr_ok=0.10, thr_warn=0.20, higher_is_better=False)


def _rmse_pp_color(v_pp: float) -> str:
    """RMSE voto en pp: <2 bueno, <4 amber, ≥4 rojo."""
    return semaforo_color(v_pp, thr_ok=2.0, thr_warn=4.0, higher_is_better=False)


def _mae_esc_color(v: float) -> str:
    """MAE escaños: <3 bueno, <5 amber, ≥5 rojo."""
    return semaforo_color(v, thr_ok=3.0, thr_warn=5.0, higher_is_better=False)


def _calidad_color(v_pct: float) -> str:
    """Calidad datos: ≥90 bueno, ≥70 amber, <70 rojo."""
    return semaforo_color(v_pct, thr_ok=90.0, thr_warn=70.0, higher_is_better=True)


def _cobertura_color(v_pct: float) -> str:
    """Cobertura 95% IC: objetivo ~95%. Bueno 90-100, amber 80-90, rojo <80 o >100 (sobrecobertura)."""
    if v_pct < 80 or v_pct > 105:
        return RED
    if 88 <= v_pct <= 100:
        return GREEN
    return AMBER


def _fmt_or_dash(value, fmt: str = ".4f", suffix: str = "") -> str:
    v = safe_float(value, default=float("nan"))
    if v != v:  # NaN
        return "—"
    return f"{v:{fmt}}{suffix}"


# ── Estilos (una sola línea para evitar code-block escaping) ────────────────

st.markdown(
    "<style>"
    "@keyframes fadeInUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}"
    "@keyframes dotPulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}"
    "</style>",
    unsafe_allow_html=True,
)


# ── Hero ─────────────────────────────────────────────────────────────────────

st.markdown(
    f'<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);'
    f'border:1px solid {BORDER};border-radius:16px;padding:1.8rem 2.2rem;margin-bottom:1.5rem;'
    f'overflow:hidden;animation:fadeInUp .5s ease both">'
    f'<div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;'
    f'background:radial-gradient(circle,{BLUE}1A,transparent 65%);border-radius:50%;pointer-events:none"></div>'
    f'<div style="position:relative">'
    f'<div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">'
    f'<div style="width:8px;height:8px;border-radius:50%;background:{GREEN};animation:dotPulse 2s ease infinite"></div>'
    f'<span style="font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:{GREEN}">SISTEMA VALIDADO</span>'
    f'</div>'
    f'<div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};line-height:1.1">'
    f'Validación del <span style="color:{CYAN}">Sistema</span>'
    f'</div>'
    f'<div style="font-size:.88rem;color:{TEXT2};margin-top:.4rem">'
    f'Backtesting, calibración de agentes, calidad de datos y rating de casas encuestadoras.'
    f'</div>'
    f'</div></div>',
    unsafe_allow_html=True,
)


# ── Carga de datos (una vez, fuera de tabs) ──────────────────────────────────

df_hist = safe_numeric(
    cargar_historial_validacion(),
    ["brier_score", "rmse_voto", "mae_escanos", "cobertura_95ci", "pct_completitud", "n_checks_ok", "n_checks_fail"],
)

if df_hist.empty or "tipo"not in df_hist.columns:
    st.info(
        "Sin resultados de validación. Ejecuta la Fase 5 para generar un run: "
        "`python -m pipelines.fase5_validacion`"
    )
    st.stop()

tipo_s = df_hist["tipo"].astype(str)
df_bt_all = df_hist[tipo_s == "backtesting"].copy()
df_cal_all = df_hist[tipo_s == "calibracion"].copy()
df_qc_all = df_hist[tipo_s == "calidad"].copy()
ultimo_bt = df_bt_all.head(1)
ultimo_cal = df_cal_all.head(1)
ultimo_qc = df_qc_all.head(1)


# ── KPI strip ────────────────────────────────────────────────────────────────

def _first(df: pd.DataFrame, col: str) -> float:
    if df.empty or col not in df.columns:
        return float("nan")
    return safe_float(df.iloc[0].get(col), default=float("nan"))


bs = _first(ultimo_bt, "brier_score")
rmse = _first(ultimo_bt, "rmse_voto")
mae_esc = _first(ultimo_bt, "mae_escanos")
pct_qc = _first(ultimo_qc, "pct_completitud")
cob = _first(ultimo_bt, "cobertura_95ci")
rmse_pp = rmse * 100 if rmse == rmse else float("nan")
cob_pct = cob * 100 if cob == cob else float("nan")

cards = [
    kpi_card(
        "Brier Score",
        _fmt_or_dash(bs, ".4f"),
        "objetivo <0.10",
        _brier_color(bs) if bs == bs else MUTED,
    ),
    kpi_card(
        "RMSE Voto",
        _fmt_or_dash(rmse_pp, ".2f", "pp"),
        "objetivo <2 pp",
        _rmse_pp_color(rmse_pp) if rmse_pp == rmse_pp else MUTED,
    ),
    kpi_card(
        "MAE Escaños",
        _fmt_or_dash(mae_esc, ".1f"),
        "objetivo <3",
        _mae_esc_color(mae_esc) if mae_esc == mae_esc else MUTED,
    ),
    kpi_card(
        "Calidad Datos",
        _fmt_or_dash(pct_qc, ".1f", "%"),
        "objetivo ≥90%",
        _calidad_color(pct_qc) if pct_qc == pct_qc else MUTED,
    ),
    kpi_card(
        "Cobertura IC 95%",
        _fmt_or_dash(cob_pct, ".1f", "%"),
        "objetivo ~95%",
        _cobertura_color(cob_pct) if cob_pct == cob_pct else MUTED,
    ),
]
st.markdown(
    f"<div style='display:grid;grid-template-columns:repeat(5,1fr);gap:.7rem;margin:.3rem 0 1.2rem'>{''.join(cards)}</div>",
    unsafe_allow_html=True,
)


# ── Tabs principales ─────────────────────────────────────────────────────────

tab_bt, tab_cal, tab_qc, tab_casas, tab_macro = st.tabs([
    "◈  Backtesting",
    "●  Calibración Agentes",
    "▦  Calidad de Datos",
    "⬡  Casas Encuestadoras",
    "◎  Fuentes Macro",
])


# ── Backtesting ──────────────────────────────────────────────────────────────

with tab_bt:
    df_bt = safe_numeric(df_bt_all.copy(), ["brier_score", "rmse_voto", "mae_escanos", "cobertura_95ci"])
    if df_bt.empty:
        st.info("Sin resultados de backtesting.")
    else:
        df_bt = df_bt.sort_values("created_at", ascending=True)

        if len(df_bt) >= 2:
            section_header("Evolución del Brier Score")
            fig_ev = go.Figure()
            fig_ev.add_trace(
                go.Scatter(
                    x=df_bt["created_at"],
                    y=df_bt["brier_score"],
                    mode="lines+markers",
                    name="Brier",
                    line=dict(color=CYAN, width=2.2),
                    marker=dict(size=6, color=CYAN, line=dict(color=BG, width=1)),
                    fill="tozeroy",
                    fillcolor=hex_to_rgba(CYAN, 0.10),
                    hovertemplate="%{x|%d %b %Y}<br>Brier: %{y:.4f}<extra></extra>",
                )
            )
            fig_ev.add_hline(y=0.10, line_dash="dash", line_color=GREEN, opacity=0.6, annotation_text="objetivo 0.10", annotation_position="top left")
            fig_ev.add_hline(y=0.20, line_dash="dash", line_color=AMBER, opacity=0.6, annotation_text="umbral 0.20", annotation_position="top left")
            _layout_dark(fig_ev, height=280, yaxis=dict(title="Brier", gridcolor=BORDER, color=TEXT2), xaxis=dict(title="Fecha"))
            st.plotly_chart(fig_ev, use_container_width=True)

        section_header("Error por partido — última ejecución")
        run_id_last = df_bt.sort_values("created_at", ascending=False).iloc[0].get("run_id")
        df_part = safe_numeric(
            cargar_validacion_por_partido(run_id_last),
            ["voto_real_pct", "voto_pred_pct", "error_pct",
             "escanos_reales", "escanos_pred_mediana", "escanos_pred_p5", "escanos_pred_p95"],
        )

        if df_part.empty:
            st.caption("Sin desglose por partido para este run.")
        else:
            df_part_abs = df_part.copy()
            df_part_abs["abs_err"] = df_part_abs["error_pct"].abs()
            df_part_abs = df_part_abs.sort_values("abs_err", ascending=False)
            df_part_abs["color"] = df_part_abs["abs_err"].apply(
                lambda x: GREEN if x < 2 else AMBER if x < 5 else RED
            )
            fig_part = go.Figure(
                go.Bar(
                    x=df_part_abs["partido_siglas"],
                    y=df_part_abs["abs_err"],
                    marker=dict(color=df_part_abs["color"], line=dict(color=BORDER, width=0.5)),
                    text=df_part_abs["error_pct"].map(lambda v: f"{v:+.2f} pp"),
                    textposition="outside",
                    textfont=dict(color=TEXT, size=11),
                    hovertemplate=(
                        "<b>%{x}</b><br>"
                        "Error abs: %{y:.2f} pp<br>"
                        "Error real: %{text}<extra></extra>"
                    ),
                )
            )
            fig_part.add_hline(y=2, line_dash="dot", line_color=GREEN, opacity=0.5)
            fig_part.add_hline(y=5, line_dash="dot", line_color=AMBER, opacity=0.5)
            _layout_dark(
                fig_part,
                height=360,
                xaxis=dict(title="Partido", gridcolor=BORDER, color=TEXT2),
                yaxis=dict(title="Error absoluto (pp)", gridcolor=BORDER, color=TEXT2),
            )
            st.plotly_chart(fig_part, use_container_width=True)

            section_header("Real vs predicho por partido")
            cols_show = [
                "partido_siglas", "voto_real_pct", "voto_pred_pct", "error_pct",
                "escanos_reales", "escanos_pred_mediana", "escanos_pred_p5", "escanos_pred_p95",
            ]
            cols_show = [c for c in cols_show if c in df_part.columns]
            st.dataframe(
                df_part[cols_show].rename(columns={
                    "partido_siglas": "Partido",
                    "voto_real_pct": "Voto real (%)",
                    "voto_pred_pct": "Voto pred. (%)",
                    "error_pct": "Error (pp)",
                    "escanos_reales": "Esc. real",
                    "escanos_pred_mediana": "Esc. pred.",
                    "escanos_pred_p5": "Esc. P5",
                    "escanos_pred_p95": "Esc. P95",
                }).round(2),
                hide_index=True,
                use_container_width=True,
            )


# ── Calibración ──────────────────────────────────────────────────────────────

with tab_cal:
    df_cal = safe_numeric(df_cal_all.copy(), ["n_checks_ok", "n_checks_fail"])
    if df_cal.empty:
        st.info("Sin resultados de calibración de agentes.")
    else:
        df_cal = df_cal.sort_values("created_at", ascending=False)

        # Mini-strip resumen del último run
        ult = df_cal.iloc[0]
        n_ok_u = int(safe_float(ult.get("n_checks_ok"), 0))
        n_fail_u = int(safe_float(ult.get("n_checks_fail"), 0))
        total_u = n_ok_u + n_fail_u
        pct_u = (n_ok_u / total_u * 100) if total_u else 0.0
        calibrado = n_fail_u == 0 and n_ok_u > 0
        c_estado = GREEN if calibrado else (AMBER if pct_u >= 80 else RED)

        strip = [
            kpi_card("Estado", "Calibrado"if calibrado else "Revisar", f"último run: {ult.get('created_at','—')}", c_estado),
            kpi_card("Checks OK", f"{n_ok_u}", f"{pct_u:.1f}% del total", GREEN if n_ok_u else MUTED),
            kpi_card("Checks Fail", f"{n_fail_u}", "errores detectados", RED if n_fail_u else GREEN),
            kpi_card("Modelo", str(ult.get("modelo", "—"))[:24], "modelo LLM usado", CYAN),
        ]
        st.markdown(
            f"<div style='display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin:.3rem 0 1rem'>{''.join(strip)}</div>",
            unsafe_allow_html=True,
        )

        section_header("Histórico de calibraciones")
        if len(df_cal) >= 2:
            df_cal_plot = df_cal.sort_values("created_at", ascending=True).copy()
            df_cal_plot["total"] = df_cal_plot["n_checks_ok"].fillna(0) + df_cal_plot["n_checks_fail"].fillna(0)
            df_cal_plot["pct_ok"] = df_cal_plot.apply(
                lambda r: (r["n_checks_ok"] / r["total"] * 100) if r["total"] else 0.0, axis=1,
            )
            fig_cal = go.Figure()
            fig_cal.add_trace(
                go.Scatter(
                    x=df_cal_plot["created_at"],
                    y=df_cal_plot["pct_ok"],
                    mode="lines+markers",
                    name="% checks OK",
                    line=dict(color=GREEN, width=2.2),
                    marker=dict(size=6, color=GREEN, line=dict(color=BG, width=1)),
                    fill="tozeroy",
                    fillcolor=hex_to_rgba(GREEN, 0.12),
                    hovertemplate="%{x|%d %b %Y}<br>OK: %{y:.1f}%<extra></extra>",
                )
            )
            fig_cal.add_hline(y=100, line_dash="dash", line_color=GREEN, opacity=0.6)
            _layout_dark(
                fig_cal, height=280,
                yaxis=dict(title="% checks OK", range=[0, 105], gridcolor=BORDER, color=TEXT2),
                xaxis=dict(title="Fecha"),
            )
            st.plotly_chart(fig_cal, use_container_width=True)

        section_header("Detalle de ejecuciones")
        for _, row in df_cal.head(8).iterrows():
            n_ok = int(safe_float(row.get("n_checks_ok"), 0))
            n_fail = int(safe_float(row.get("n_checks_fail"), 0))
            ok = n_fail == 0 and n_ok > 0
            total = n_ok + n_fail
            pct = (n_ok / total * 100) if total else 0.0
            etiqueta = "✓ Calibrado"if ok else "△ Revisar"
            with st.expander(f"{etiqueta} — {row.get('created_at','—')} · {row.get('modelo','—')}"):
                c1, c2, c3, c4 = st.columns(4)
                c1.metric("Checks OK", n_ok)
                c2.metric("Checks Fail", n_fail)
                c3.metric("% OK", f"{pct:.1f}%")
                c4.metric("Modelo", str(row.get("modelo", "—")))


# ── Calidad de datos ─────────────────────────────────────────────────────────

with tab_qc:
    df_qc = safe_numeric(df_qc_all.copy(), ["pct_completitud", "n_checks_ok", "n_checks_fail"])
    if df_qc.empty:
        st.info("Sin resultados de calidad de datos.")
    else:
        df_qc = df_qc.sort_values("created_at", ascending=True)

        if len(df_qc) >= 2:
            section_header("Evolución de completitud")
            fig_qc = go.Figure()
            fig_qc.add_trace(
                go.Scatter(
                    x=df_qc["created_at"],
                    y=df_qc["pct_completitud"],
                    mode="lines+markers",
                    name="% completitud",
                    line=dict(color=GREEN, width=2.2),
                    marker=dict(size=6, color=GREEN, line=dict(color=BG, width=1)),
                    fill="tozeroy",
                    fillcolor=hex_to_rgba(GREEN, 0.12),
                    hovertemplate="%{x|%d %b %Y}<br>%{y:.1f}%<extra></extra>",
                )
            )
            fig_qc.add_hline(y=90, line_dash="dash", line_color=GREEN, opacity=0.6, annotation_text="objetivo 90%", annotation_position="top left")
            fig_qc.add_hline(y=70, line_dash="dash", line_color=AMBER, opacity=0.6, annotation_text="mínimo 70%", annotation_position="top left")
            _layout_dark(
                fig_qc, height=300,
                yaxis=dict(title="% completitud", range=[0, 105], gridcolor=BORDER, color=TEXT2),
                xaxis=dict(title="Fecha"),
            )
            st.plotly_chart(fig_qc, use_container_width=True)

        section_header("Último chequeo")
        ult_qc = df_qc.sort_values("created_at", ascending=False).iloc[0]
        pct_last = safe_float(ult_qc.get("pct_completitud"))
        ok_last = int(safe_float(ult_qc.get("n_checks_ok"), 0))
        fail_last = int(safe_float(ult_qc.get("n_checks_fail"), 0))
        total_last = ok_last + fail_last
        c_pct = _calidad_color(pct_last)

        strip_qc = [
            kpi_card("Completitud", f"{pct_last:.1f}%", f"checks {total_last}", c_pct),
            kpi_card("Checks OK", f"{ok_last}", f"{ok_last/total_last*100:.1f}%"if total_last else "—", GREEN),
            kpi_card("Checks Fail", f"{fail_last}", "con incidencias", RED if fail_last else GREEN),
            kpi_card("Fecha", str(ult_qc.get("created_at", "—"))[:16], "último run", CYAN),
        ]
        st.markdown(
            f"<div style='display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin:.3rem 0 1rem'>{''.join(strip_qc)}</div>",
            unsafe_allow_html=True,
        )


# ── Casas encuestadoras ──────────────────────────────────────────────────────

with tab_casas:
    df_casas = safe_numeric(
        cargar_casas_cobertura(),
        ["rating", "mae_ewma", "n_elecciones_bt", "n_encuestas_7d", "n_encuestas_30d", "activa"],
    )
    if df_casas.empty:
        st.info("Sin backtest disponible. Ejecuta `python -m validation.backtest_casas` para generar ratings.")
    else:
        n_casas_activas = int(df_casas["activa"].sum()) if "activa"in df_casas.columns else len(df_casas)
        n_con_dato_7d = int((df_casas["n_encuestas_7d"].fillna(0) > 0).sum()) if "n_encuestas_7d"in df_casas.columns else 0
        rating_medio = safe_float(df_casas["rating"].mean(), default=0.0) if "rating"in df_casas.columns else 0.0
        mae_medio = safe_float(df_casas["mae_ewma"].mean(), default=0.0) if "mae_ewma"in df_casas.columns else 0.0

        strip_cas = [
            kpi_card("Casas activas", f"{n_casas_activas}", "en ventana vigente", CYAN),
            kpi_card("Con dato ≤7d", f"{n_con_dato_7d} / {n_casas_activas}",
                     "cobertura reciente",
                     GREEN if n_casas_activas and n_con_dato_7d / max(1, n_casas_activas) >= 0.5 else AMBER),
            kpi_card("Rating medio", f"{rating_medio:.2f} / 5",
                     "histórico ponderado",
                     semaforo_color(rating_medio, 3.5, 2.5, higher_is_better=True)),
            kpi_card("MAE EWMA medio", f"{mae_medio:.2f} pp",
                     "error ponderado temporal",
                     semaforo_color(mae_medio, 2.0, 4.0, higher_is_better=False)),
        ]
        st.markdown(
            f"<div style='display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin:.3rem 0 1rem'>{''.join(strip_cas)}</div>",
            unsafe_allow_html=True,
        )

        section_header("Ranking de casas")
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


# ── Fuentes macro ────────────────────────────────────────────────────────────

with tab_macro:
    df_fm = cargar_fuentes_macro()
    if df_fm.empty:
        st.info("Sin catálogo de fuentes macro. Ejecuta el seed `db/seeds/04_casas_fuentes.sql`.")
    else:
        df_fm_num = safe_numeric(df_fm, ["latencia_dias", "peso_base"])
        n_total = len(df_fm_num)
        n_activas = int(df_fm_num["activa"].sum()) if "activa"in df_fm_num.columns else n_total
        n_cat = int(df_fm_num["categoria"].nunique()) if "categoria"in df_fm_num.columns else 0
        peso_medio = safe_float(df_fm_num["peso_base"].mean(), default=0.0) if "peso_base"in df_fm_num.columns else 0.0

        strip_fm = [
            kpi_card("Fuentes", f"{n_total}", f"activas: {n_activas}", CYAN),
            kpi_card("Categorías", f"{n_cat}", "macro / laboral / precios…", PURPLE),
            kpi_card("Peso medio", f"{peso_medio:.2f}", "en el composite", BLUE),
            kpi_card("Activas", f"{n_activas} / {n_total}",
                     "en pipeline diario",
                     GREEN if n_total and n_activas / n_total >= 0.7 else AMBER),
        ]
        st.markdown(
            f"<div style='display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin:.3rem 0 1rem'>{''.join(strip_fm)}</div>",
            unsafe_allow_html=True,
        )

        section_header("Catálogo")
        st.dataframe(
            df_fm_num.rename(columns={
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
