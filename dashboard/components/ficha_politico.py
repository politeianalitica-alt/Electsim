from __future__ import annotations

from datetime import date

import pandas as pd
import plotly.express as px
import streamlit as st

from dashboard.db import get_ficha_politico, get_todos_politicos

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


def render_selector_politico(conn) -> str | None:
    df = get_todos_politicos(conn)
    if df.empty:
        st.info("No hay políticos en la base de datos. Ejecuta el ETL de fichas.")
        return None
    opciones = {
        f"{row['nombre_completo']} ({row['partido_actual']})": row["politico_id"]
        for _, row in df.iterrows()
    }
    seleccion = st.selectbox("Selecciona un político", list(opciones.keys()))
    return opciones.get(seleccion)


def render_ficha(conn, politico_id: str) -> None:
    ficha = get_ficha_politico(conn, politico_id)
    perfil = ficha.get("perfil", {})
    if not perfil:
        st.warning("No se encontró ficha para el político seleccionado.")
        return

    partido = str(perfil.get("partido_actual", ""))
    color = COLORES_PARTIDO.get(partido, "#666")

    col_foto, col_info, col_meta = st.columns([1, 2, 1])
    with col_foto:
        foto = perfil.get("foto_url")
        if foto:
            st.image(str(foto), width=140)
        else:
            st.markdown(
                f"<div style='width:140px;height:160px;background:{color}20;"
                f"border:2px solid {color};border-radius:8px;display:flex;"
                f"align-items:center;justify-content:center;font-size:3rem'>👤</div>",
                unsafe_allow_html=True,
            )

    with col_info:
        st.markdown(f"## {perfil.get('nombre_completo', 'Sin nombre')}")
        st.markdown(
            f"<span style='background:{color};color:white;padding:4px 12px;"
            f"border-radius:4px;font-weight:600'>{partido}</span>"
            f"&nbsp;&nbsp;<span style='color:#666'>{perfil.get('cargo_actual','')}</span>",
            unsafe_allow_html=True,
        )
        if perfil.get("cargo_institucional"):
            st.caption(f"🏛️ {perfil['cargo_institucional']}")
        if perfil.get("grupo_parlamentario"):
            st.caption(f"📜 Grupo: {perfil['grupo_parlamentario']}")
        if perfil.get("circunscripcion"):
            st.caption(f"📍 Circunscripción: {perfil['circunscripcion']}")

    with col_meta:
        sueldo = pd.to_numeric(perfil.get("sueldo_bruto_anual"), errors="coerce")
        if pd.notna(sueldo):
            st.metric(
                "Sueldo bruto anual",
                f"{float(sueldo):,.0f} €".replace(",", "."),
                help=str(perfil.get("sueldo_fuente", "")),
            )
        if perfil.get("twitter_handle"):
            st.markdown(f"[🐦 @{perfil['twitter_handle']}](https://twitter.com/{perfil['twitter_handle']})")
        if perfil.get("url_wikipedia_es"):
            st.markdown(f"[📖 Wikipedia]({perfil['url_wikipedia_es']})")

    st.divider()

    tab_bio, tab_tray, tab_noticias, tab_patrim = st.tabs([
        "📋 Biografía", "⏳ Trayectoria", "📰 Noticias", "💰 Patrimonio"
    ])

    with tab_bio:
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("**Datos personales**")
            f_nac = perfil.get("fecha_nacimiento")
            if f_nac:
                try:
                    fecha_dt = pd.Timestamp(f_nac).date()
                    edad = (date.today() - fecha_dt).days // 365
                    st.write(f"🎂 Nacimiento: {fecha_dt.strftime('%d/%m/%Y')} ({edad} años)")
                except Exception:
                    st.write(f"🎂 Nacimiento: {f_nac}")
            if perfil.get("lugar_nacimiento"):
                st.write(f"📍 Lugar: {perfil['lugar_nacimiento']}")
        with c2:
            form = perfil.get("formacion")
            if isinstance(form, list) and form:
                st.markdown("**Formación**")
                for f in form:
                    st.write(f"🎓 {f}")

    with tab_tray:
        df_tray = ficha.get("trayectoria", pd.DataFrame())
        if df_tray.empty:
            st.info("No hay datos de trayectoria.")
        else:
            df_plot = df_tray.copy()
            df_plot["fecha_inicio"] = pd.to_datetime(df_plot["fecha_inicio"], errors="coerce")
            df_plot["fecha_fin"] = pd.to_datetime(df_plot["fecha_fin"], errors="coerce")
            df_plot["fecha_fin"] = df_plot["fecha_fin"].fillna(pd.Timestamp.now())
            df_plot = df_plot.dropna(subset=["fecha_inicio"])
            if not df_plot.empty:
                fig = px.timeline(
                    df_plot,
                    x_start="fecha_inicio",
                    x_end="fecha_fin",
                    y="organizacion",
                    color="tipo_cargo",
                    text="cargo",
                    title="Línea de tiempo de cargos",
                )
                fig.update_layout(height=380)
                st.plotly_chart(fig, use_container_width=True)
            st.dataframe(df_tray, hide_index=True, use_container_width=True)

    with tab_noticias:
        df_not = ficha.get("noticias", pd.DataFrame())
        if df_not.empty:
            st.info("No hay noticias recientes vinculadas.")
        else:
            for _, row in df_not.head(15).iterrows():
                sent = pd.to_numeric(row.get("sentimiento"), errors="coerce")
                icono = "😐" if pd.isna(sent) else ("😊" if sent > 0.2 else ("😠" if sent < -0.2 else "😐"))
                st.markdown(
                    f"{icono} **[{row.get('titulo','Sin titular')}]({row.get('url','')})**  "
                    f"\n<small style='color:#666'>{row.get('fuente_id','')} · {row.get('fecha_pub','')} · {row.get('tema','')}</small>",
                    unsafe_allow_html=True,
                )

    with tab_patrim:
        df_pat = ficha.get("patrimonio", pd.DataFrame())
        if df_pat.empty:
            st.info("No hay datos patrimoniales registrados.")
        else:
            ultimo = df_pat.iloc[0]
            c1, c2, c3 = st.columns(3)
            act = pd.to_numeric(ultimo.get("total_activos"), errors="coerce")
            pas = pd.to_numeric(ultimo.get("total_pasivos"), errors="coerce")
            ing = pd.to_numeric(ultimo.get("ingresos_cargo"), errors="coerce")
            c1.metric("Activos totales", f"{act:,.0f} €".replace(",", ".") if pd.notna(act) else "–")
            c2.metric("Pasivos totales", f"{pas:,.0f} €".replace(",", ".") if pd.notna(pas) else "–")
            c3.metric("Ingresos del cargo", f"{ing:,.0f} €".replace(",", ".") if pd.notna(ing) else "–")

            if len(df_pat) > 1 and "anio_declaracion" in df_pat.columns and "total_activos" in df_pat.columns:
                fig = px.bar(
                    df_pat.sort_values("anio_declaracion"),
                    x="anio_declaracion",
                    y="total_activos",
                    title="Evolución patrimonio declarado",
                    labels={"total_activos": "Activos (€)", "anio_declaracion": "Año"},
                )
                st.plotly_chart(fig, use_container_width=True)

            for _, row in df_pat.iterrows():
                if row.get("url_declaracion"):
                    st.markdown(f"📄 [{row.get('anio_declaracion','')} — Declaración oficial]({row['url_declaracion']})")
