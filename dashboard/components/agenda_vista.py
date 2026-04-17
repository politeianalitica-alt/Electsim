from __future__ import annotations

from datetime import date, timedelta

import pandas as pd
import streamlit as st

from dashboard.db import cargar_agenda_rango

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
ICONOS_ACTO = {
    "rueda_prensa": "🎙️",
    "comparecencia": "📢",
    "visita": "🚗",
    "cumbre": "🤝",
    "acto_partido": "🎯",
    "entrevista": "📺",
    "viaje": "✈️",
    "otro": "📌",
}


def render_agenda_vista(conn) -> None:
    st.header("📅 Agenda de Líderes")

    col_fecha, col_rango, col_partido = st.columns(3)
    with col_fecha:
        fecha_sel = st.date_input("Fecha inicio", value=date.today())
    with col_rango:
        dias = st.selectbox(
            "Mostrar",
            options=[1, 3, 7, 14],
            index=0,
            format_func=lambda d: "Hoy" if d == 1 else f"{d} días",
        )
    fecha_fin = fecha_sel + timedelta(days=int(dias) - 1)

    df = cargar_agenda_rango(conn, str(fecha_sel), str(fecha_fin))

    with col_partido:
        filtro_partido = "Todos"
        if not df.empty and "partido" in df.columns:
            partidos = ["Todos"] + sorted(df["partido"].dropna().astype(str).unique().tolist())
            filtro_partido = st.selectbox("Partido", partidos)

    if not df.empty and filtro_partido != "Todos":
        df = df[df["partido"].astype(str) == filtro_partido]

    if df.empty:
        st.info("No hay actos agendados para el período seleccionado.")
        return

    for fecha, df_dia in df.groupby("fecha"):
        try:
            fecha_lbl = pd.Timestamp(fecha).strftime("%A, %d de %B de %Y").capitalize()
        except Exception:
            fecha_lbl = str(fecha)
        st.subheader(f"📆 {fecha_lbl}")

        for partido, df_part in df_dia.groupby("partido"):
            color = COLORES_PARTIDO.get(str(partido), "#888")
            with st.container():
                st.markdown(
                    f"<div style='border-left:4px solid {color};"
                    f"padding-left:12px;margin-bottom:8px'>"
                    f"<strong style='color:{color}'>{partido}</strong></div>",
                    unsafe_allow_html=True,
                )
                for _, acto in df_part.iterrows():
                    hora_str = str(acto.get("hora"))[:5] if pd.notna(acto.get("hora")) else "—"
                    icono = ICONOS_ACTO.get(str(acto.get("tipo_acto", "otro")), "📌")
                    lider_val = acto.get("lider")
                    lider_str = f"**{lider_val}** · " if pd.notna(lider_val) and str(lider_val).strip() else ""
                    lugar_val = acto.get("lugar")
                    lugar_str = f" — {lugar_val}" if pd.notna(lugar_val) and str(lugar_val).strip() else ""
                    st.markdown(
                        f"&nbsp;&nbsp;`{hora_str}` {icono} {lider_str}"
                        f"{acto.get('descripcion', 'Sin descripción')}{lugar_str}",
                        unsafe_allow_html=True,
                    )
        st.divider()
