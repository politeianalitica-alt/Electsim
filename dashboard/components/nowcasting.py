from __future__ import annotations

import json
from datetime import datetime

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.db import (
    cargar_accuracy_casa,
    cargar_alertas,
    cargar_casas_cobertura,
    cargar_contribuciones_run,
    cargar_fuentes_macro,
    cargar_historial_validacion,
    cargar_indicadores_riesgo,
    cargar_indices_politeia,
    cargar_macro_ultimo,
    cargar_nowcasting,
    cargar_nowcasting_calidad,
    cargar_scraping_log,
    cargar_serie_nowcasting,
    cargar_serie_voto,
    cargar_validacion_por_partido,
)
from dashboard.shared import (
    AMBER,
    BG,
    BG2,
    BLUE,
    CYAN,
    GREEN,
    MUTED,
    PURPLE,
    RED,
    TEXT,
    TEXT2,
    color_partido,
)

TOTAL_ESCANOS = 350
ORDEN_IDEOLOGICO = [
    "PODEMOS", "IU", "SUMAR", "BNG", "CUP", "ERC", "EH_BILDU", "EH Bildu",
    "PSOE", "PNV", "JUNTS", "CC", "PP", "UPN", "CS", "VOX", "SALF",
]


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════
def _f(x, default: float = 0.0) -> float:
    try:
        v = float(x)
        return v if pd.notna(v) else default
    except Exception:
        return default


def _color(siglas: str) -> str:
    return color_partido(str(siglas)) or "#888"


def _kpi_card(label: str, value: str, *, hint: str = "", color: str = CYAN) -> str:
    return (
        f'<div style="background:{BG2};border:1px solid {color}33;'
        f'border-left:3px solid {color};border-radius:8px;padding:.7rem .9rem;'
        f'height:100%;display:flex;flex-direction:column;justify-content:center">'
        f'<div style="font-size:.58rem;color:{MUTED};text-transform:uppercase;'
        f'letter-spacing:.1em;font-weight:700;margin-bottom:.2rem">{label}</div>'
        f'<div style="font-size:1.25rem;font-weight:900;color:{color};'
        f'font-family:\'JetBrains Mono\',monospace">{value}</div>'
        f'<div style="font-size:.65rem;color:{TEXT2};margin-top:.1rem">{hint}</div>'
        f'</div>'
    )


def _section_header(title: str, color: str = CYAN) -> None:
    st.markdown(
        f'<div style="display:flex;align-items:center;gap:.5rem;margin:.8rem 0 .4rem">'
        f'<div style="width:3px;height:18px;background:{color};border-radius:2px"></div>'
        f'<div style="color:{TEXT};font-weight:700;font-size:.92rem">{title}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )


def _semaforo_color(valor: str | None) -> str:
    v = str(valor or "").lower()
    if v in ("verde", "green", "ok", "normal"):
        return GREEN
    if v in ("amarillo", "amber", "naranja", "warning", "alerta"):
        return AMBER
    if v in ("rojo", "red", "danger", "critical", "critico"):
        return RED
    return MUTED


# ═══════════════════════════════════════════════════════════════════════════════
# Bloques visuales
# ═══════════════════════════════════════════════════════════════════════════════
def _render_kpi_strip(df_calidad: pd.DataFrame, df_now: pd.DataFrame) -> None:
    """Franja de KPIs del último run del modelo."""
    if df_calidad.empty:
        n_part = int(len(df_now))
        n_enc = int(_f(df_now.get("n_encuestas", pd.Series([0])).max()))
        st.markdown(
            f'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem">'
            f'{_kpi_card("Partidos monitorizados", str(n_part), color=CYAN)}'
            f'{_kpi_card("Encuestas máx.", str(n_enc), color=BLUE)}'
            f'{_kpi_card("Modelo", "bayes_multifuente_v1", color=PURPLE)}'
            f'</div>',
            unsafe_allow_html=True,
        )
        return

    r = df_calidad.iloc[0]
    cob = _f(r.get("cobertura_media"))
    cons = _f(r.get("consenso_sd_medio"))
    conf = _f(r.get("confianza_media"))
    nfs = int(_f(r.get("n_fuentes_max")))
    npart = int(_f(r.get("n_partidos")))
    fecha = r.get("fecha_estimacion")
    fecha_str = pd.Timestamp(fecha).strftime("%d/%m/%Y") if pd.notna(fecha) else "—"

    # Semáforos heurísticos
    c_cob = GREEN if cob >= 0.75 else (AMBER if cob >= 0.5 else RED)
    c_cons = GREEN if cons <= 1.5 else (AMBER if cons <= 3.0 else RED)
    c_conf = GREEN if conf >= 0.7 else (AMBER if conf >= 0.5 else RED)

    st.markdown(
        f'<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:.5rem">'
        f'{_kpi_card("Partidos", str(npart), hint=f"Run {fecha_str}", color=CYAN)}'
        f'{_kpi_card("Cobertura media", f"{cob*100:.0f}%", hint="% partidos con ≥3 fuentes", color=c_cob)}'
        f'{_kpi_card("Consenso σ", f"{cons:.2f}", hint="desviación entre fuentes", color=c_cons)}'
        f'{_kpi_card("Confianza", f"{conf*100:.0f}%", hint="score global del modelo", color=c_conf)}'
        f'{_kpi_card("Nº fuentes máx.", str(nfs), hint="fuentes/partido", color=BLUE)}'
        f'{_kpi_card("Modelo", str(r.get("modelo", "—")), hint="motor bayesiano", color=PURPLE)}'
        f'</div>',
        unsafe_allow_html=True,
    )


def _render_barometro(df: pd.DataFrame) -> None:
    """Barómetro horizontal de escaños."""
    df_plot = df[df["escanos_estimados"].notna()].copy()
    if df_plot.empty:
        return
    df_plot = df_plot.sort_values("escanos_estimados", ascending=False)

    fig = go.Figure()
    acumulado = 0
    for _, row in df_plot.iterrows():
        color = _color(row["partido"])
        escanos = int(_f(row["escanos_estimados"]))
        voto = _f(row.get("voto_estimado"))
        fig.add_trace(go.Bar(
            x=[escanos], y=["Escaños"], orientation="h",
            marker=dict(color=color, line=dict(color=BG, width=1)),
            name=str(row["partido"]),
            text=f"{row['partido']}<br><b>{escanos}</b>",
            textposition="inside", insidetextanchor="middle",
            textfont=dict(color="#FFFFFF", size=11, family="JetBrains Mono"),
            hovertemplate=(
                f"<b>{row['partido']}</b><br>Escaños: {escanos}<br>"
                f"Voto: {voto:.1f}%<extra></extra>"
            ),
        ))
        acumulado += escanos

    fig.add_vline(
        x=176, line_dash="dash", line_color=AMBER,
        annotation_text="Mayoría absoluta (176)",
        annotation_position="top right",
        annotation=dict(font=dict(color=AMBER, size=10)),
    )
    fig.update_layout(
        barmode="stack",
        xaxis=dict(range=[0, TOTAL_ESCANOS], title=dict(text="Escaños", font=dict(color=MUTED)),
                   tickfont=dict(color=MUTED), gridcolor="rgba(30,41,59,0.4)"),
        yaxis=dict(visible=False),
        height=160, showlegend=False,
        margin=dict(l=10, r=10, t=30, b=30),
        plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
    )
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})


def _render_tarjetas(df_now: pd.DataFrame) -> None:
    """Tarjetas por partido con % voto, IC 95% y escaños."""
    df_sorted = df_now.sort_values("voto_estimado", ascending=False)
    n_show = min(len(df_sorted), 8)
    cols = st.columns(min(n_show, 4))
    for i, (_, row) in enumerate(df_sorted.head(n_show).iterrows()):
        color = _color(row["partido"])
        voto = _f(row.get("voto_estimado"))
        ic_inf = _f(row.get("intervalo_inf"))
        ic_sup = _f(row.get("intervalo_sup"))
        esc = row.get("escanos_estimados")
        esc_str = f"{int(_f(esc))} esc."if pd.notna(esc) else "— esc."
        r_c, g_c, b_c = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
        with cols[i % 4]:
            st.markdown(
                f'<div style="text-align:center;background:{BG2};'
                f'border:1px solid {color}33;border-top:3px solid {color};'
                f'border-radius:8px;padding:.8rem .6rem;margin-bottom:.5rem">'
                f'<div style="font-size:.62rem;font-weight:700;color:{MUTED};'
                f'letter-spacing:.08em">{row["partido"]}</div>'
                f'<div style="font-size:1.7rem;font-weight:900;color:{color};'
                f'font-family:\'JetBrains Mono\',monospace;'
                f'text-shadow:0 0 20px rgba({r_c},{g_c},{b_c},0.3)">{voto:.1f}%</div>'
                f'<div style="font-size:.55rem;color:{MUTED};margin-top:.15rem;'
                f'font-family:\'JetBrains Mono\',monospace">IC95 [{ic_inf:.1f} – {ic_sup:.1f}]</div>'
                f'<div style="font-size:.7rem;color:{TEXT2};margin-top:.2rem;font-weight:600">{esc_str}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )


def _render_tabla_detalle(df_now: pd.DataFrame) -> None:
    cols = ["partido", "voto_estimado", "intervalo_inf", "intervalo_sup",
            "escanos_estimados", "n_encuestas", "n_fuentes_usadas",
            "cobertura_pct", "consenso_sd", "confianza_modelo"]
    cols_avail = [c for c in cols if c in df_now.columns]
    df_t = df_now[cols_avail].copy()
    for c in cols_avail:
        if c == "partido":
            continue
        df_t[c] = pd.to_numeric(df_t[c], errors="coerce")
    if "cobertura_pct"in df_t.columns:
        df_t["cobertura_pct"] = (df_t["cobertura_pct"].fillna(0) * 100).round(0)
    if "confianza_modelo"in df_t.columns:
        df_t["confianza_modelo"] = (df_t["confianza_modelo"].fillna(0) * 100).round(0)
    df_t = df_t.rename(columns={
        "partido": "Partido",
        "voto_estimado": "% voto",
        "intervalo_inf": "IC95 inf",
        "intervalo_sup": "IC95 sup",
        "escanos_estimados": "Escaños",
        "n_encuestas": "N enc.",
        "n_fuentes_usadas": "N fuentes",
        "cobertura_pct": "Cobertura %",
        "consenso_sd": "Consenso σ",
        "confianza_modelo": "Confianza %",
    }).round(2)
    df_t = df_t.sort_values("% voto", ascending=False)
    st.dataframe(df_t, hide_index=True, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# Tab: Evolución
# ═══════════════════════════════════════════════════════════════════════════════
def _render_tab_evolucion(df_now: pd.DataFrame, df_serie: pd.DataFrame) -> None:
    partidos_disp = sorted(df_now["partido"].astype(str).unique().tolist())

    c1, c2 = st.columns([3, 1])
    with c1:
        default_sel = [p for p in ["PSOE", "PP", "VOX", "SUMAR", "PODEMOS"] if p in partidos_disp]
        if not default_sel:
            default_sel = partidos_disp[: min(5, len(partidos_disp))]
        partidos_sel = st.multiselect(
            "Partidos", options=partidos_disp, default=default_sel, key="nc_evol_partidos"
        )
    with c2:
        dias = st.selectbox("Ventana", [30, 60, 90, 180, 365], index=2, key="nc_evol_dias")

    # Serie agregada multi-partido
    _section_header("Evolución multi-partido", BLUE)
    if not df_serie.empty and partidos_sel:
        df_s = df_serie[df_serie["partido"].astype(str).isin(partidos_sel)].copy()
        df_s["fecha"] = pd.to_datetime(df_s["fecha"], errors="coerce")
        df_s = df_s[df_s["fecha"] >= pd.Timestamp.today() - pd.Timedelta(days=int(dias))]
        df_s["voto_estimado"] = pd.to_numeric(df_s["voto_estimado"], errors="coerce")
        if not df_s.empty:
            fig = go.Figure()
            for p in partidos_sel:
                d = df_s[df_s["partido"] == p].sort_values("fecha")
                if d.empty:
                    continue
                c = _color(p)
                fig.add_trace(go.Scatter(
                    x=d["fecha"], y=d["voto_estimado"],
                    mode="lines+markers", name=p,
                    line=dict(color=c, width=2), marker=dict(size=5),
                    hovertemplate=f"<b>{p}</b><br>%{{x|%d-%b-%Y}}: %{{y:.1f}}%%<extra></extra>",
                ))
            fig.update_layout(
                height=380,
                plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(gridcolor="rgba(30,41,59,0.4)", tickfont=dict(color=MUTED)),
                yaxis=dict(gridcolor="rgba(30,41,59,0.4)", tickfont=dict(color=MUTED), ticksuffix="%"),
                legend=dict(orientation="h", y=1.04, bgcolor="rgba(13,19,32,0.7)",
                            font=dict(color=TEXT2, size=11)),
                margin=dict(t=20, b=30, l=40, r=10),
            )
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
        else:
            st.info("Sin datos en la ventana seleccionada.")
    else:
        st.info("Selecciona al menos un partido con serie disponible.")

    # Detalle individual con IC 95%
    _section_header("Detalle con IC 95% (partido individual)", PURPLE)
    if partidos_sel:
        partido_detalle = st.selectbox(
            "Partido a inspeccionar", options=partidos_sel, key="nc_evol_detalle"
        )
        df_i = cargar_serie_nowcasting(partido_detalle, dias=int(dias))
        if df_i.empty:
            st.info(f"Sin serie histórica para {partido_detalle}.")
        else:
            df_i = df_i.copy()
            df_i["fecha_estimacion"] = pd.to_datetime(df_i["fecha_estimacion"], errors="coerce")
            for col in ("estimacion_pct", "ic_95_inf", "ic_95_sup"):
                df_i[col] = pd.to_numeric(df_i[col], errors="coerce")
            c = _color(partido_detalle)
            r_c, g_c, b_c = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=df_i["fecha_estimacion"], y=df_i["ic_95_sup"],
                mode="lines", line=dict(width=0), showlegend=False, hoverinfo="skip",
            ))
            fig.add_trace(go.Scatter(
                x=df_i["fecha_estimacion"], y=df_i["ic_95_inf"],
                mode="lines", line=dict(width=0), fill="tonexty",
                fillcolor=f"rgba({r_c},{g_c},{b_c},0.18)",
                name="IC 95%", hoverinfo="skip",
            ))
            fig.add_trace(go.Scatter(
                x=df_i["fecha_estimacion"], y=df_i["estimacion_pct"],
                mode="lines+markers", name=partido_detalle,
                line=dict(color=c, width=2.5), marker=dict(size=6),
            ))
            fig.update_layout(
                height=340,
                plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(gridcolor="rgba(30,41,59,0.4)", tickfont=dict(color=MUTED)),
                yaxis=dict(gridcolor="rgba(30,41,59,0.4)", tickfont=dict(color=MUTED), ticksuffix="%"),
                showlegend=False,
                margin=dict(t=10, b=30, l=40, r=10),
            )
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

            # Delta últimos 7 y 30 días
            if len(df_i) >= 2:
                last_date = df_i["fecha_estimacion"].max()
                last_val = _f(df_i[df_i["fecha_estimacion"] == last_date]["estimacion_pct"].iloc[0])

                def _delta(n: int) -> float:
                    ref_date = last_date - pd.Timedelta(days=n)
                    df_ref = df_i[df_i["fecha_estimacion"] <= ref_date]
                    if df_ref.empty:
                        return 0.0
                    return last_val - _f(df_ref["estimacion_pct"].iloc[-1])

                d1, d7, d30 = _delta(1), _delta(7), _delta(30)
                c1, c2, c3 = st.columns(3)
                for col, (lbl, val) in zip([c1, c2, c3], [("1d", d1), ("7d", d7), ("30d", d30)]):
                    with col:
                        col_d = GREEN if val > 0 else (RED if val < 0 else MUTED)
                        signo = "+"if val > 0 else ""
                        st.markdown(
                            _kpi_card(f"Δ {lbl}", f"{signo}{val:.2f} pp",
                                      hint=f"{partido_detalle}", color=col_d),
                            unsafe_allow_html=True,
                        )


# ═══════════════════════════════════════════════════════════════════════════════
# Tab: Calidad del modelo
# ═══════════════════════════════════════════════════════════════════════════════
def _render_tab_calidad(df_now: pd.DataFrame, df_calidad: pd.DataFrame) -> None:
    _section_header("Calidad por partido", CYAN)
    df_q = df_now.copy()
    for c in ("cobertura_pct", "consenso_sd", "confianza_modelo",
              "n_encuestas", "n_fuentes_usadas"):
        if c in df_q.columns:
            df_q[c] = pd.to_numeric(df_q[c], errors="coerce")

    if "cobertura_pct"in df_q.columns and "consenso_sd"in df_q.columns:
        fig = go.Figure()
        for _, r in df_q.iterrows():
            p = str(r["partido"])
            cob = _f(r.get("cobertura_pct")) * 100
            cons = _f(r.get("consenso_sd"))
            conf = _f(r.get("confianza_modelo"))
            size = max(10, min(40, int(conf * 40)))
            c = _color(p)
            fig.add_trace(go.Scatter(
                x=[cob], y=[cons], mode="markers+text", text=[p],
                textposition="top center",
                textfont=dict(color=c, size=11, family="Inter"),
                marker=dict(size=size, color=c, line=dict(color="#FFFFFF", width=0.5),
                            opacity=0.8),
                hovertemplate=(
                    f"<b>{p}</b><br>Cobertura: {cob:.0f}%<br>"
                    f"Consenso σ: {cons:.2f}<br>Confianza: {conf*100:.0f}%<extra></extra>"
                ),
                showlegend=False,
            ))
        fig.update_layout(
            height=400,
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title=dict(text="Cobertura (%)", font=dict(color=MUTED)),
                       gridcolor="rgba(30,41,59,0.4)", tickfont=dict(color=MUTED),
                       ticksuffix="%"),
            yaxis=dict(title=dict(text="Consenso σ (↓ mejor)", font=dict(color=MUTED)),
                       gridcolor="rgba(30,41,59,0.4)", tickfont=dict(color=MUTED),
                       autorange="reversed"),
            margin=dict(t=20, b=40, l=60, r=20),
        )
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
        st.caption(
            "Cada punto es un partido. Tamaño = confianza del modelo. "
            "Arriba-derecha: alta cobertura con bajo desacuerdo entre fuentes (ideal)."
        )

    # Historial de validación
    _section_header("Historial de validación (últimos runs)", AMBER)
    df_val = cargar_historial_validacion()
    if df_val.empty:
        st.info("Sin historial de validación todavía. El modelo se valida contra elecciones pasadas.")
    else:
        df_vv = df_val.head(10).copy()
        for c in ("brier_score", "rmse_voto", "mae_escanos", "cobertura_95ci", "pct_completitud"):
            if c in df_vv.columns:
                df_vv[c] = pd.to_numeric(df_vv[c], errors="coerce").round(3)
        df_vv = df_vv.rename(columns={
            "run_id": "Run",
            "tipo": "Tipo",
            "modelo": "Modelo",
            "brier_score": "Brier ↓",
            "rmse_voto": "RMSE voto ↓",
            "mae_escanos": "MAE esc. ↓",
            "cobertura_95ci": "Cob. 95CI",
            "pct_completitud": "Completitud",
            "n_checks_ok": "Checks OK",
            "n_checks_fail": "Checks KO",
            "created_at": "Fecha",
        })
        st.dataframe(df_vv, hide_index=True, use_container_width=True)

        # Si hay run reciente, mostrar validación por partido
        if "run_id"in df_val.columns and pd.notna(df_val.iloc[0]["run_id"]):
            run_id = str(df_val.iloc[0]["run_id"])
            _section_header(f"Error de predicción por partido — {run_id[:8]}…", PURPLE)
            df_vp = cargar_validacion_por_partido(run_id)
            if not df_vp.empty:
                for c in ("voto_real_pct", "voto_pred_pct", "error_pct",
                          "escanos_reales", "escanos_pred_mediana",
                          "escanos_pred_p5", "escanos_pred_p95"):
                    if c in df_vp.columns:
                        df_vp[c] = pd.to_numeric(df_vp[c], errors="coerce").round(2)
                df_vp = df_vp.rename(columns={
                    "partido_siglas": "Partido",
                    "voto_real_pct": "Voto real %",
                    "voto_pred_pct": "Predicho %",
                    "error_pct": "Error pp",
                    "escanos_reales": "Esc. reales",
                    "escanos_pred_mediana": "Esc. pred.",
                    "escanos_pred_p5": "P5",
                    "escanos_pred_p95": "P95",
                })
                st.dataframe(df_vp, hide_index=True, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# Tab: Fuentes
# ═══════════════════════════════════════════════════════════════════════════════
def _render_tab_fuentes(df_calidad: pd.DataFrame) -> None:
    run_id = None
    if not df_calidad.empty and "run_id"in df_calidad.columns:
        run_id = str(df_calidad.iloc[0]["run_id"])

    _section_header("Contribución de fuentes al run actual", CYAN)
    df_contrib = cargar_contribuciones_run(run_id, limit=40) if run_id else pd.DataFrame()
    if df_contrib.empty:
        st.info("Sin contribuciones registradas para el run actual.")
    else:
        df_c = df_contrib.copy()
        for c in ("peso_efectivo", "contribucion_pct"):
            if c in df_c.columns:
                df_c[c] = pd.to_numeric(df_c[c], errors="coerce")

        # Agregado por tipo de fuente
        if "fuente_tipo"in df_c.columns:
            df_agg = (df_c.groupby("fuente_tipo")["contribucion_pct"]
                      .sum().reset_index().sort_values("contribucion_pct", ascending=False))
            fig = go.Figure(go.Bar(
                x=df_agg["fuente_tipo"], y=df_agg["contribucion_pct"],
                marker=dict(color=[
                    {"ENCUESTA": CYAN, "MICRO": BLUE, "MACRO": PURPLE, "PRENSA": AMBER}.get(
                        str(t), MUTED) for t in df_agg["fuente_tipo"]
                ]),
                text=df_agg["contribucion_pct"].round(1).astype(str) + "%",
                textposition="outside",
                textfont=dict(color=TEXT, size=10, family="JetBrains Mono"),
            ))
            fig.update_layout(
                height=280,
                plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(tickfont=dict(color=TEXT2, size=11)),
                yaxis=dict(gridcolor="rgba(30,41,59,0.4)", tickfont=dict(color=MUTED),
                           ticksuffix="%", title=dict(text="Contribución", font=dict(color=MUTED))),
                margin=dict(t=15, b=30, l=40, r=10),
            )
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

        # Detalle por fuente
        df_show = df_c.rename(columns={
            "fuente_tipo": "Tipo",
            "fuente_label": "Fuente",
            "peso_efectivo": "Peso",
            "contribucion_pct": "Contribución %",
            "fecha_dato": "Fecha dato",
        }).round({"Peso": 3, "Contribución %": 2})
        st.dataframe(df_show, hide_index=True, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# Tab: Casas encuestadoras
# ═══════════════════════════════════════════════════════════════════════════════
def _render_tab_casas() -> None:
    df_casas = cargar_casas_cobertura()
    if df_casas.empty:
        st.info("Sin datos de casas encuestadoras.")
        return

    df_c = df_casas.copy()
    for col in ("rating", "mae_ewma", "n_elecciones_bt",
                "n_encuestas_7d", "n_encuestas_30d"):
        if col in df_c.columns:
            df_c[col] = pd.to_numeric(df_c[col], errors="coerce")

    _section_header("Ranking de casas (rating descendente)", CYAN)
    c1, c2, c3 = st.columns(3)
    activas = int((df_c["activa"] == True).sum()) if "activa"in df_c.columns else len(df_c)  # noqa: E712
    top_rating = _f(df_c["rating"].max()) if "rating"in df_c.columns else 0.0
    enc_30d = int(_f(df_c.get("n_encuestas_30d", pd.Series([0])).sum()))
    c1.markdown(_kpi_card("Casas activas", str(activas), color=CYAN), unsafe_allow_html=True)
    c2.markdown(_kpi_card("Mejor rating", f"{top_rating:.2f}", color=GREEN), unsafe_allow_html=True)
    c3.markdown(_kpi_card("Encuestas 30d", str(enc_30d), color=BLUE), unsafe_allow_html=True)

    st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
    df_show = df_c.rename(columns={
        "casa_nombre": "Casa",
        "activa": "Activa",
        "rating": "Rating",
        "mae_ewma": "MAE EWMA",
        "n_elecciones_bt": "Elec. BT",
        "ultima_fecha_encuesta": "Última encuesta",
        "n_encuestas_7d": "Enc. 7d",
        "n_encuestas_30d": "Enc. 30d",
    }).round({"Rating": 2, "MAE EWMA": 3})
    st.dataframe(df_show, hide_index=True, use_container_width=True)

    # Accuracy histórica de una casa
    _section_header("Accuracy histórica de una casa", PURPLE)
    casas = df_c["casa_nombre"].dropna().astype(str).tolist()
    if casas:
        casa_sel = st.selectbox("Casa a inspeccionar", options=casas, key="nc_casa_sel")
        df_acc = cargar_accuracy_casa(casa_sel)
        if df_acc.empty:
            st.info(f"Sin histórico de accuracy para {casa_sel}.")
        else:
            for c in ("mae_global", "rmse_global", "bias_medio", "dias_antes", "n_encuestas"):
                if c in df_acc.columns:
                    df_acc[c] = pd.to_numeric(df_acc[c], errors="coerce")
            df_acc_show = df_acc.drop(columns=["bias_por_partido"], errors="ignore").rename(columns={
                "fecha": "Elección",
                "descripcion": "Comicio",
                "dias_antes": "Días antes",
                "n_encuestas": "N enc.",
                "mae_global": "MAE",
                "rmse_global": "RMSE",
                "bias_medio": "Bias medio",
            }).round(3)
            st.dataframe(df_acc_show, hide_index=True, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# Tab: Contexto macro + Índices Politeia
# ═══════════════════════════════════════════════════════════════════════════════
def _render_tab_contexto() -> None:
    _section_header("Indicadores macro (último dato disponible)", CYAN)
    df_m = cargar_macro_ultimo()
    if df_m.empty:
        st.info("Sin datos macroeconómicos cargados.")
    else:
        df_m = df_m.copy()
        df_m["valor"] = pd.to_numeric(df_m["valor"], errors="coerce")
        cards_html = []
        color_map = {
            "IPC General (%)": AMBER,
            "Prima Riesgo (pb)": RED,
            "Crec. PIB (%)": GREEN,
            "Euribor 12m (%)": BLUE,
            "IBEX 35": PURPLE,
            "Deuda Pública (% PIB)": CYAN,
        }
        for _, r in df_m.iterrows():
            ind = str(r["indicador"])
            val = _f(r["valor"])
            fecha = r.get("fecha")
            fecha_str = pd.Timestamp(fecha).strftime("%d/%m/%Y") if pd.notna(fecha) else "—"
            if "IBEX"in ind:
                fmt = f"{val:,.0f}".replace(",", ".")
            elif "(%)"in ind:
                fmt = f"{val:.2f}%"
            elif "pb"in ind:
                fmt = f"{val:.0f} pb"
            else:
                fmt = f"{val:.2f}"
            cards_html.append(_kpi_card(ind, fmt, hint=fecha_str,
                                        color=color_map.get(ind, CYAN)))
        st.markdown(
            f'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem">'
            + "".join(cards_html) + '</div>',
            unsafe_allow_html=True,
        )

    # Índices Politeia
    _section_header("Índices Politeia", PURPLE)
    df_ip = cargar_indices_politeia()
    if df_ip.empty:
        st.info("Sin índices Politeia calculados todavía.")
    else:
        df_ip = df_ip.copy()
        for c in ("valor", "variacion_7d", "variacion_30d"):
            if c in df_ip.columns:
                df_ip[c] = pd.to_numeric(df_ip[c], errors="coerce")
        cards_html = []
        for _, r in df_ip.iterrows():
            nombre = str(r.get("indice_nombre", r.get("indice_codigo", "—")))
            valor = _f(r.get("valor"))
            sem = _semaforo_color(r.get("semaforo"))
            d7 = _f(r.get("variacion_7d"))
            hint = f"Δ7d: {d7:+.2f}"if d7 else "sin Δ"
            cards_html.append(_kpi_card(nombre, f"{valor:.2f}", hint=hint, color=sem))
        st.markdown(
            f'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem">'
            + "".join(cards_html) + '</div>',
            unsafe_allow_html=True,
        )

    # Catálogo de fuentes macro (compacto)
    _section_header("Fuentes macro activas", BLUE)
    df_fm = cargar_fuentes_macro()
    if not df_fm.empty:
        df_fm_show = df_fm[df_fm.get("activa", True) == True].copy() if "activa"in df_fm.columns else df_fm  # noqa: E712
        df_fm_show = df_fm_show.rename(columns={
            "codigo": "Código",
            "proveedor": "Proveedor",
            "dataset": "Dataset",
            "categoria": "Categoría",
            "frecuencia": "Frecuencia",
            "latencia_dias": "Latencia (d)",
            "peso_base": "Peso",
            "activa": "Activa",
        })
        st.dataframe(df_fm_show, hide_index=True, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# Tab: Sistema (alertas + scraping + riesgo)
# ═══════════════════════════════════════════════════════════════════════════════
def _render_tab_sistema() -> None:
    _section_header("Indicador de riesgo político", AMBER)
    df_r = cargar_indicadores_riesgo()
    if df_r.empty:
        st.info("Sin indicador de riesgo político calculado.")
    else:
        r0 = df_r.iloc[0]
        ic = _f(r0.get("indice_compuesto"))
        sem = _semaforo_color(r0.get("semaforo"))
        fecha = r0.get("fecha_calculo")
        fecha_str = pd.Timestamp(fecha).strftime("%d/%m/%Y") if pd.notna(fecha) else "—"

        # Serie del índice
        df_r2 = df_r.copy().sort_values("fecha_calculo")
        df_r2["indice_compuesto"] = pd.to_numeric(df_r2["indice_compuesto"], errors="coerce")
        df_r2["fecha_calculo"] = pd.to_datetime(df_r2["fecha_calculo"], errors="coerce")
        c_big, c_chart = st.columns([1, 3])
        with c_big:
            st.markdown(_kpi_card(
                "Riesgo compuesto", f"{ic:.2f}",
                hint=f"semáforo · {fecha_str}", color=sem
            ), unsafe_allow_html=True)
        with c_chart:
            fig = go.Figure(go.Scatter(
                x=df_r2["fecha_calculo"], y=df_r2["indice_compuesto"],
                mode="lines+markers", line=dict(color=sem, width=2),
                marker=dict(size=5), name="Riesgo compuesto",
            ))
            fig.update_layout(
                height=180, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(gridcolor="rgba(30,41,59,0.3)", tickfont=dict(color=MUTED, size=9)),
                yaxis=dict(gridcolor="rgba(30,41,59,0.3)", tickfont=dict(color=MUTED, size=9)),
                margin=dict(t=5, b=20, l=30, r=10), showlegend=False,
            )
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    # Alertas
    _section_header("Alertas del sistema", RED)
    df_al = cargar_alertas(solo_no_leidas=False, limit=15)
    if df_al.empty:
        st.caption("Sin alertas registradas.")
    else:
        for _, a in df_al.iterrows():
            sev = str(a.get("severidad", "info")).lower()
            col = {"critica": RED, "alta": RED, "media": AMBER, "baja": CYAN}.get(sev, MUTED)
            titulo = str(a.get("titulo", ""))
            desc = str(a.get("descripcion", "") or "")
            leida = bool(a.get("leida", False))
            created = a.get("created_at")
            fecha_str = pd.Timestamp(created).strftime("%d/%m %H:%M") if pd.notna(created) else ""
            badge = "●"if not leida else "○"
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {col}33;'
                f'border-left:3px solid {col};border-radius:6px;'
                f'padding:.5rem .8rem;margin-bottom:.3rem;font-size:.8rem">'
                f'<span style="color:{col};font-weight:700">{badge} {sev.upper()}</span> '
                f'<span style="color:{TEXT}">· {titulo}</span> '
                f'<span style="color:{MUTED};font-size:.7rem;float:right">{fecha_str}</span>'
                + (f'<div style="color:{TEXT2};margin-top:.2rem">{desc}</div>'if desc else "")
                + '</div>',
                unsafe_allow_html=True,
            )

    # Scraping log
    _section_header("Últimas ejecuciones del pipeline (scraping)", BLUE)
    df_log = cargar_scraping_log(limit=15)
    if df_log.empty:
        st.caption("Sin registro de scraping.")
    else:
        df_log = df_log.copy()
        for c in ("n_registros_nuevos", "n_registros_duplicados", "duracion_segundos"):
            if c in df_log.columns:
                df_log[c] = pd.to_numeric(df_log[c], errors="coerce")
        df_log_show = df_log.rename(columns={
            "fuente": "Fuente",
            "tipo": "Tipo",
            "estado": "Estado",
            "n_registros_nuevos": "Nuevos",
            "n_registros_duplicados": "Dup.",
            "duracion_segundos": "Duración (s)",
            "error_mensaje": "Error",
            "created_at": "Fecha",
        })
        st.dataframe(df_log_show, hide_index=True, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════
def render_nowcasting(conn) -> None:
    st.header("◐  Nowcasting Electoral")

    df_now = cargar_nowcasting()
    if df_now.empty:
        st.info("No hay estimaciones de voto en la base de datos. Ejecuta el pipeline de modelos.")
        return

    # Normalizar nombres de columnas al formato del componente
    rename_map = {
        "partido_siglas": "partido",
        "estimacion_pct": "voto_estimado",
        "ic_95_inf": "intervalo_inf",
        "ic_95_sup": "intervalo_sup",
    }
    df_now = df_now.rename(columns={k: v for k, v in rename_map.items() if k in df_now.columns}).copy()
    if "escanos_estimados"not in df_now.columns:
        df_now["escanos_estimados"] = pd.NA
    if "fecha_estimacion"not in df_now.columns and "fecha_calculo"in df_now.columns:
        df_now["fecha_estimacion"] = df_now["fecha_calculo"]

    # Cast de numéricos al principio para evitar TypeError con Decimal
    for c in ("voto_estimado", "intervalo_inf", "intervalo_sup", "escanos_estimados",
              "n_encuestas", "n_fuentes_usadas", "cobertura_pct", "consenso_sd",
              "confianza_modelo"):
        if c in df_now.columns:
            df_now[c] = pd.to_numeric(df_now[c], errors="coerce")

    df_serie = cargar_serie_voto(conn)
    df_calidad = cargar_nowcasting_calidad()

    # Encabezado con fecha
    if "fecha_estimacion"in df_now.columns:
        fecha_max = pd.to_datetime(df_now["fecha_estimacion"], errors="coerce").max()
        if pd.notna(fecha_max):
            st.caption(f"Última actualización: **{fecha_max.strftime('%d/%m/%Y')}** · "
                       f"Modelo multifuente (encuestas + micro + macro + prensa)")

    # Banda superior de KPIs del modelo
    _render_kpi_strip(df_calidad, df_now)
    st.markdown("<div style='height:.6rem'></div>", unsafe_allow_html=True)

    # Tabs principales
    t_actual, t_evol, t_calidad, t_fuentes, t_casas, t_macro, t_sys = st.tabs([
        "◎  Estimación actual",
        "↗  Evolución",
        "▦  Calidad del modelo",
        "◈  Fuentes del run",
        "▣  Casas encuestadoras",
        "⬡  Contexto macro",
        "△  Sistema",
    ])

    with t_actual:
        _section_header("Proyección de escaños", CYAN)
        _render_barometro(df_now)
        st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
        _section_header("Tarjetas por partido", BLUE)
        _render_tarjetas(df_now)
        st.markdown("<div style='height:.6rem'></div>", unsafe_allow_html=True)
        _section_header("Detalle completo (con IC 95% y KPIs de calidad)", PURPLE)
        _render_tabla_detalle(df_now)

    with t_evol:
        _render_tab_evolucion(df_now, df_serie)

    with t_calidad:
        _render_tab_calidad(df_now, df_calidad)

    with t_fuentes:
        _render_tab_fuentes(df_calidad)

    with t_casas:
        _render_tab_casas()

    with t_macro:
        _render_tab_contexto()

    with t_sys:
        _render_tab_sistema()
