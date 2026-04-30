from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import kpi_card, section_header, sidebar_nav  # noqa: E402
from dashboard.services import campana as svc  # noqa: E402

st.set_page_config(page_title="Coordinación de Campaña", layout="wide")
sidebar_nav()

cliente_id = st.session_state.get("cliente_id_activo")
if cliente_id is None:
    cliente_id = 1

cliente = svc.obtener_cliente(int(cliente_id))
cliente_nombre = str((cliente or {}).get("nombre", "Workspace por defecto"))

section_header("Centro de Coordinación")
st.caption(f"Cliente activo: **{cliente_nombre}**")

df_todos = svc.listar_mensajes(int(cliente_id), solo_activos=True, limit=200)
tipos_conteo = df_todos["tipo"].value_counts().to_dict() if not df_todos.empty else {}

col1, col2, col3, col4 = st.columns(4)
col1.markdown(kpi_card("Mensajes activos", str(len(df_todos.index))), unsafe_allow_html=True)
col2.markdown(kpi_card("Mensaje del día", "✓"if tipos_conteo.get("mensaje_dia", 0) > 0 else "—"), unsafe_allow_html=True)
col3.markdown(kpi_card("Talking points", str(tipos_conteo.get("talking_points", 0))), unsafe_allow_html=True)
col4.markdown(kpi_card("Líneas rojas", str(tipos_conteo.get("lineas_rojas", 0))), unsafe_allow_html=True)

st.markdown("---")

msg_dia = svc.obtener_mensaje_dia(int(cliente_id))
if msg_dia:
    st.success(f"Mensaje del día: **{msg_dia.get('titulo', '')}**")
    st.markdown(f"> {msg_dia.get('mensaje', '')}")
    if msg_dia.get("fecha_fin"):
        try:
            dias_restantes = (msg_dia["fecha_fin"] - date.today()).days
            if dias_restantes <= 2:
                st.warning(f"Caduca en {dias_restantes} día(s).")
        except Exception:
            pass
else:
    st.info("No hay mensaje del día activo.")

st.markdown("---")

TIPOS = {
    "mensaje_dia": "Mensaje del día",
    "talking_points": "Talking Points",
    "lineas_rojas": "Líneas Rojas",
    "temas_evitar": "Temas a evitar",
    "narrativa_semana": "Narrativa semanal",
}

tabs = st.tabs(list(TIPOS.values()))

for i, (tipo_key, tipo_label) in enumerate(TIPOS.items()):
    with tabs[i]:
        df_tipo = svc.listar_mensajes(int(cliente_id), solo_activos=True, tipo=tipo_key, limit=100)
        if df_tipo.empty:
            st.info(f"No hay {tipo_label.lower()} activos.")
        else:
            for _, row in df_tipo.iterrows():
                with st.expander(f"[{tipo_label}] {row.get('titulo', '')}"):
                    st.markdown(str(row.get("mensaje", "")))
                    st.caption(
                        f"Autor: {row.get('autor') or '—'} · "
                        f"Inicio: {row.get('fecha_inicio') or '—'} · "
                        f"Fin: {row.get('fecha_fin') or '—'}"
                    )
                    if st.button("Archivar", key=f"arch_msg_{tipo_key}_{row.get('id')}"):
                        ok = svc.archivar_mensaje(int(row["id"]), int(cliente_id))
                        if ok:
                            st.success("Mensaje archivado.")
                            st.rerun()
                        st.error("No se pudo archivar el mensaje.")

        st.markdown(f"#### Nuevo {tipo_label}")
        with st.form(key=f"form_{tipo_key}"):
            titulo = st.text_input("Título *", key=f"title_{tipo_key}")
            cuerpo = st.text_area("Contenido *", height=120, key=f"body_{tipo_key}")
            col_a, col_b, col_c = st.columns(3)
            with col_a:
                prioridad = st.selectbox("Prioridad", [1, 2, 3], index=1, key=f"prio_{tipo_key}")
            with col_b:
                sin_fin = st.checkbox("Sin fecha fin", value=True, key=f"nofin_{tipo_key}")
                fecha_fin_val = st.date_input("Fecha fin", value=date.today(), key=f"end_{tipo_key}")
                fecha_fin = None if sin_fin else fecha_fin_val
            with col_c:
                autor = st.text_input("Autor", key=f"author_{tipo_key}")
            submitted = st.form_submit_button(f"Crear {tipo_label}")
            if submitted:
                if not titulo.strip() or not cuerpo.strip():
                    st.error("Título y contenido son obligatorios.")
                else:
                    svc.crear_mensaje(
                        cliente_id=int(cliente_id),
                        titulo=titulo.strip(),
                        cuerpo=cuerpo.strip(),
                        tipo=tipo_key,
                        prioridad=int(prioridad),
                        fecha_fin=fecha_fin,
                        autor=autor.strip() or None,
                    )
                    st.success("Mensaje creado.")
                    st.rerun()
