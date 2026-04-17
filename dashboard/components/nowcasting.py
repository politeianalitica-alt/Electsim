from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.db import cargar_nowcasting, cargar_serie_voto

COLORES_PARTIDO = {
    "PSOE": "#E31C1C",
    "PP": "#1A56DB",
    "VOX": "#5E9E23",
    "SUMAR": "#6B21D6",
    "JUNTS": "#0056A2",
    "ERC": "#FDB833",
    "EH BILDU": "#00A651",
    "PNV": "#007A3D",
}
TOTAL_ESCANOS = 350


def _render_barometro(df: pd.DataFrame) -> None:
    df_plot = df[df["escanos_estimados"].notna()].sort_values("escanos_estimados", ascending=False)
    if df_plot.empty:
        st.info("No hay estimaciones de escaños disponibles en la fuente actual.")
        return

    fig = go.Figure()
    for _, row in df_plot.iterrows():
        color = COLORES_PARTIDO.get(str(row["partido"]), "#999")
        escanos = int(row["escanos_estimados"])
        voto = float(pd.to_numeric(row.get("voto_estimado"), errors="coerce") or 0.0)
        fig.add_trace(
            go.Bar(
                x=[escanos],
                y=["Escaños"],
                orientation="h",
                marker_color=color,
                name=str(row["partido"]),
                text=f"{row['partido']}<br>{escanos}",
                textposition="inside",
                insidetextanchor="middle",
                hovertemplate=(
                    f"<b>{row['partido']}</b><br>"
                    f"Escaños: {escanos}<br>"
                    f"Voto estimado: {voto:.1f}%<extra></extra>"
                ),
            )
        )

    fig.add_vline(
        x=176,
        line_dash="dash",
        line_color="gray",
        annotation_text="Mayoría absoluta (176)",
        annotation_position="top right",
    )
    fig.update_layout(
        barmode="stack",
        title="Estimación de escaños",
        xaxis=dict(range=[0, TOTAL_ESCANOS], title="Escaños"),
        yaxis=dict(visible=False),
        height=180,
        showlegend=False,
        margin=dict(l=0, r=0, t=40, b=20),
    )
    st.plotly_chart(fig, use_container_width=True)


def render_nowcasting(conn) -> None:
    st.header("🗳️ Nowcasting Electoral")

    df_now = cargar_nowcasting(_conn=conn)
    df_serie = cargar_serie_voto(conn)

    if df_now.empty:
        st.info("No hay estimaciones de voto en la base de datos.")
        return

    rename_map = {
        "partido_siglas": "partido",
        "estimacion_pct": "voto_estimado",
        "ic_95_inf": "intervalo_inf",
        "ic_95_sup": "intervalo_sup",
    }
    df_now = df_now.rename(columns={k: v for k, v in rename_map.items() if k in df_now.columns}).copy()
    if "escanos_estimados" not in df_now.columns:
        df_now["escanos_estimados"] = pd.NA
    if "fecha_estimacion" not in df_now.columns and "fecha_calculo" in df_now.columns:
        df_now["fecha_estimacion"] = df_now["fecha_calculo"]

    if "fecha_estimacion" in df_now.columns:
        fecha_max = pd.to_datetime(df_now["fecha_estimacion"], errors="coerce").max()
        if pd.notna(fecha_max):
            st.caption(f"Última actualización: {fecha_max.strftime('%d/%m/%Y')}")

    _render_barometro(df_now)

    cols = st.columns(min(len(df_now), 5))
    for i, (_, row) in enumerate(df_now.sort_values("voto_estimado", ascending=False).iterrows()):
        if i >= len(cols):
            break
        color = COLORES_PARTIDO.get(str(row["partido"]), "#888")
        voto = float(pd.to_numeric(row.get("voto_estimado"), errors="coerce") or 0.0)
        esc_val = row.get("escanos_estimados")
        esc_str = str(int(esc_val)) if pd.notna(esc_val) else "—"
        with cols[i]:
            st.markdown(
                f"<div style='text-align:center;border-top:3px solid {color};padding-top:8px'>"
                f"<strong style='color:{color}'>{row['partido']}</strong><br>"
                f"<span style='font-size:1.4rem;font-weight:700'>{voto:.1f}%</span><br>"
                f"<small>{esc_str} esc.</small>"
                f"</div>",
                unsafe_allow_html=True,
            )

    st.divider()

    if not df_serie.empty:
        partidos = sorted(df_serie["partido"].dropna().astype(str).unique().tolist())
        default_sel = [p for p in ["PSOE", "PP", "VOX", "SUMAR", "JUNTS"] if p in partidos]
        if not default_sel:
            default_sel = partidos[: min(5, len(partidos))]
        partidos_sel = st.multiselect(
            "Partidos en la serie histórica",
            options=partidos,
            default=default_sel,
        )
        df_s = df_serie[df_serie["partido"].astype(str).isin(partidos_sel)]
        if not df_s.empty:
            fig = px.line(
                df_s,
                x="fecha",
                y="voto_estimado",
                color="partido",
                color_discrete_map=COLORES_PARTIDO,
                title="Evolución del voto estimado (180 días)",
                labels={"voto_estimado": "Voto estimado (%)", "fecha": ""},
            )
            fig.update_layout(
                yaxis=dict(ticksuffix="%"),
                legend=dict(orientation="h", yanchor="bottom", y=1.02),
                height=380,
            )
            st.plotly_chart(fig, use_container_width=True)
