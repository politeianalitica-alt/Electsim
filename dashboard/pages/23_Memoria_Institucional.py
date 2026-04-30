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

st.set_page_config(page_title="Memoria Institucional", layout="wide")
sidebar_nav()

cliente_id = st.session_state.get("cliente_id_activo")
if cliente_id is None:
    cliente_id = 1

cliente = svc.obtener_cliente(int(cliente_id))
cliente_nombre = str((cliente or {}).get("nombre", "Workspace por defecto"))

section_header("Memoria Institucional")
st.caption(f"Cliente activo: **{cliente_nombre}**")

stats = svc.estadisticas_memoria(int(cliente_id))
if stats:
    c1, c2, c3, c4 = st.columns(4)
    c1.markdown(kpi_card("Total decisiones", str(int(stats.get("total", 0) or 0))), unsafe_allow_html=True)
    c2.markdown(kpi_card("Positivas", str(int(stats.get("positivas", 0) or 0))), unsafe_allow_html=True)
    c3.markdown(kpi_card("Negativas", str(int(stats.get("negativas", 0) or 0))), unsafe_allow_html=True)
    c4.markdown(kpi_card("Pendientes", str(int(stats.get("pendientes", 0) or 0))), unsafe_allow_html=True)

st.markdown("---")

st.markdown("### Buscar decisiones similares")
query = st.text_input(
    "Consulta",
    placeholder="Ej: caída en intención de voto en jóvenes urbanos",
)
if query and len(query) >= 5:
    with st.spinner("Buscando..."):
        df_sim = svc.buscar_decisiones_similares(int(cliente_id), query, limit=5)
    if df_sim.empty:
        st.info("No se encontraron decisiones similares.")
    else:
        for _, row in df_sim.iterrows():
            with st.expander(f"{row.get('fecha_decision')} — {row.get('tipo')}"):
                st.markdown(str(row.get("descripcion", "")))
                if row.get("lecciones"):
                    st.markdown(f"**Lecciones:** {row.get('lecciones')}")
                st.caption(f"Resultado: {row.get('resultado', 'pendiente')}")

st.markdown("---")

TIPOS_DECISION = ["decision", "accion", "crisis", "hito", "leccion", "cambio_estrategia"]
RESULTADOS = ["todos", "positivo", "neutral", "negativo", "pendiente"]

col_f1, col_f2, col_f3 = st.columns(3)
with col_f1:
    filtro_tipo = st.selectbox("Tipo", ["todos"] + TIPOS_DECISION)
with col_f2:
    filtro_resultado = st.selectbox("Resultado", RESULTADOS)
with col_f3:
    filtro_etiqueta = st.text_input("Etiqueta", placeholder="debate")

df_hist = svc.listar_decisiones(
    int(cliente_id),
    tipo=filtro_tipo if filtro_tipo != "todos"else None,
    resultado=filtro_resultado if filtro_resultado != "todos"else None,
    etiqueta=filtro_etiqueta or None,
    limit=200,
)

if df_hist.empty:
    st.info("No hay decisiones para estos filtros.")
else:
    st.markdown(f"**{len(df_hist.index)} decisiones encontradas**")
    for _, row in df_hist.iterrows():
        resultado = str(row.get("resultado", "pendiente"))
        icon = {"positivo": "●", "negativo": "●", "neutral": "●", "pendiente": "○"}.get(resultado, "○")
        with st.expander(f"{icon} {row.get('fecha_decision')} — {row.get('tipo')}"):
            st.markdown(str(row.get("descripcion", "")))
            if row.get("lecciones"):
                st.markdown(f"**Lecciones:** {row.get('lecciones')}")
            tags = row.get("etiquetas")
            if isinstance(tags, list) and tags:
                st.caption("Etiquetas: " + ", ".join(tags))

            st.markdown("**Actualizar resultado**")
            nuevo_resultado = st.selectbox(
                "Resultado",
                ["positivo", "neutral", "negativo", "pendiente"],
                key=f"res_{row.get('id')}",
                index=["positivo", "neutral", "negativo", "pendiente"].index(resultado)
                if resultado in {"positivo", "neutral", "negativo", "pendiente"}
                else 3,
            )
            impacto = st.text_area("Impacto observado", key=f"imp_{row.get('id')}", value="")
            lecciones = st.text_area("Lecciones aprendidas", key=f"lec_{row.get('id')}", value=str(row.get("lecciones") or ""))
            if st.button("Guardar actualización", key=f"save_{row.get('id')}"):
                ok = svc.actualizar_resultado_decision(
                    decision_id=int(row["id"]),
                    cliente_id=int(cliente_id),
                    resultado=nuevo_resultado,
                    impacto_est=impacto,
                    lecciones=lecciones,
                )
                if ok:
                    st.success("Actualización guardada.")
                    st.rerun()
                st.error("No se pudo actualizar la decisión.")

st.markdown("---")
st.markdown("### Registrar nueva decisión / hito")
with st.form("form_nueva_decision"):
    titulo = st.text_input("Título *")
    c1, c2 = st.columns(2)
    with c1:
        tipo_dec = st.selectbox("Tipo", TIPOS_DECISION)
    with c2:
        fecha_dec = st.date_input("Fecha", value=date.today())
    descripcion = st.text_area("Descripción *", height=120)
    c3, c4 = st.columns(2)
    with c3:
        impacto = st.text_area("Impacto estimado / observado", height=80)
    with c4:
        lecciones = st.text_area("Lecciones aprendidas", height=80)
    etiquetas_raw = st.text_input("Etiquetas (coma)", placeholder="debate,economia")
    autor = st.text_input("Autor / Responsable")
    submit = st.form_submit_button("Registrar decisión")

    if submit:
        if not titulo.strip() or not descripcion.strip():
            st.error("Título y descripción son obligatorios.")
        else:
            etiquetas = [e.strip() for e in etiquetas_raw.split(",") if e.strip()]
            new_id = svc.registrar_decision(
                cliente_id=int(cliente_id),
                titulo=titulo.strip(),
                descripcion=descripcion.strip(),
                tipo=tipo_dec,
                fecha_decision=fecha_dec,
                impacto_est=impacto.strip(),
                lecciones=lecciones.strip(),
                etiquetas=etiquetas,
                autor=autor.strip() or None,
                resultado="pendiente",
                contexto_datos={},
            )
            st.success(f"Decisión registrada (ID: {new_id}).")
            st.rerun()

