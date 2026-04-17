from __future__ import annotations

import pandas as pd
import streamlit as st

from dashboard.db import agenda_hoy, get_engine
from etl.sources.agendas_lideres import run_agendas


ICONOS_TIPO = {
    "rueda_prensa": "🎤",
    "pleno": "🏛️",
    "viaje_oficial": "✈️",
    "reunion": "🤝",
    "acto_partido": "📣",
    "comparecencia": "📋",
    "acto_publico": "📍",
}

COLORES_PARTIDO = {
    "PSOE": "#E31C1C",
    "PP": "#1A56DB",
    "VOX": "#5E9E23",
    "SUMAR": "#6B21D6",
    "JUNTS": "#0056A2",
    "ERC": "#FDB833",
    "EH BILDU": "#00A651",
    "PNV": "#007A3D",
    "GOBIERNO": "#333333",
    "CONGRESO": "#666666",
}


def _fmt_hora(v: object) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return "–"
    s = str(v)
    return s[:5] if len(s) >= 5 else s


def render_agenda_diaria(conn: object | None = None) -> None:
    st.subheader("📅 Agenda política — Hoy")
    engine = conn or get_engine()

    col1, col2 = st.columns([3, 1])
    with col2:
        if st.button("🔄 Actualizar agenda", key="agenda_refresh_btn"):
            with st.spinner("Descargando agendas..."):
                try:
                    resultado = run_agendas(engine, solo_hoy=True)
                    total = sum(resultado.values())
                    st.success(f"{total} eventos cargados")
                except Exception as exc:
                    st.warning(f"No se pudo actualizar la agenda: {exc}")

    df = agenda_hoy(conn=engine)
    if df.empty:
        st.info("No hay eventos registrados para hoy. Pulsa 'Actualizar agenda'.")
        return

    for partido, grupo in df.groupby("partido", dropna=False):
        partido_s = str(partido or "OTROS")
        color = COLORES_PARTIDO.get(partido_s, "#999999")
        lideres = ", ".join(sorted(set(str(x) for x in grupo["nombre_lider"].dropna().tolist()))) or "Agenda"
        with st.expander(f"**{partido_s}** — {lideres}", expanded=True):
            st.markdown(
                f"<div style='height:2px;background:{color};margin:.2rem 0 .6rem;border-radius:2px'></div>",
                unsafe_allow_html=True,
            )
            for _, ev in grupo.iterrows():
                icono = ICONOS_TIPO.get(str(ev.get("tipo_evento", "")), "📍")
                hora = _fmt_hora(ev.get("hora_inicio"))
                titulo = str(ev.get("titulo_evento", ""))
                lugar = str(ev.get("lugar", "") or "").strip()
                url = str(ev.get("url_fuente", "") or "").strip()
                lugar_txt = f" · 📍 {lugar}" if lugar else ""
                if url:
                    st.markdown(f"{icono} **{hora}**  [{titulo}]({url}){lugar_txt}")
                else:
                    st.markdown(f"{icono} **{hora}**  {titulo}{lugar_txt}")
