from __future__ import annotations

import sys
from pathlib import Path

import plotly.express as px
import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import kpi_card, section_header, sidebar_nav  # noqa: E402
from dashboard.services import opposition as opposition_svc  # noqa: E402

st.set_page_config(page_title="Opposition Research", layout="wide")
sidebar_nav()

section_header("Opposition Research")
st.caption("Radar de contradicciones, simulador de debate y posicionamiento rival.")

tab_radar, tab_sim, tab_pos = st.tabs(
    ["Radar contradicciones", "Simulador de debate", "Posicionamiento rival"]
)

with tab_radar:
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        partido = st.text_input("Partido", value="PP")
    with c2:
        persona = st.text_input("Persona", value="")
    with c3:
        tema = st.text_input("Tema", value="")
    with c4:
        score = st.slider("Score minimo", min_value=0.0, max_value=1.0, value=0.6, step=0.05)

    df = opposition_svc.cargar_contradicciones(
        persona=persona or None,
        tema=tema or None,
        score_minimo=float(score),
        cliente_id=None,
        limit=200,
    )

    cols = st.columns(3)
    cols[0].markdown(kpi_card("Contradicciones", str(len(df.index))), unsafe_allow_html=True)
    cols[1].markdown(
        kpi_card(
            "Score medio",
            f"{float(df['score_nli'].astype(float).mean()):.2f}"if not df.empty else "0.00",
        ),
        unsafe_allow_html=True,
    )
    cols[2].markdown(
        kpi_card(
            "Top persona",
            str(df["persona"].value_counts().index[0]) if not df.empty else "—",
        ),
        unsafe_allow_html=True,
    )

    if df.empty:
        st.info("No hay contradicciones para los filtros seleccionados.")
    else:
        view = df.copy()
        if partido:
            dfd = opposition_svc.cargar_declaraciones(partido=partido, limit=400)
            if not dfd.empty:
                person_set = set(dfd["persona"].dropna().astype(str).tolist())
                view = view[view["persona"].astype(str).isin(person_set)]
        st.dataframe(
            view[
                [
                    "persona",
                    "tema",
                    "score_nli",
                    "distancia_dias",
                    "explicacion",
                    "fecha_a",
                    "fecha_b",
                ]
            ],
            use_container_width=True,
            hide_index=True,
        )

with tab_sim:
    st.markdown("Genera guion, argumentario, nota o Q&A a partir de declaraciones y contradicciones.")
    s1, s2, s3, s4 = st.columns(4)
    with s1:
        partido_propio = st.text_input("Partido propio", value="PSOE")
    with s2:
        partido_rival = st.text_input("Partido rival", value="PP")
    with s3:
        tema_sim = st.text_input("Tema", value="vivienda")
    with s4:
        tipo_output = st.selectbox("Salida", ["guion", "argumentario", "nota_prensa", "qa"])
    formato = st.text_input("Formato", value="debate_televisivo")

    if st.button("Simular", type="primary"):
        with st.spinner("Generando salida..."):
            txt = opposition_svc.simular_debate(
                partido_propio=partido_propio,
                partido_rival=partido_rival,
                tema=tema_sim,
                formato=formato,
                tipo_output=tipo_output,
            )
        st.text_area("Resultado", value=txt, height=420)

with tab_pos:
    p1, p2 = st.columns(2)
    with p1:
        partidos_csv = st.text_input("Partidos (coma)", value="PSOE,PP,VOX,SUMAR")
    with p2:
        tema_pos = st.text_input("Tema (opcional)", value="")
    partidos = [p.strip() for p in partidos_csv.split(",") if p.strip()]
    dfp = opposition_svc.cargar_posicionamiento(partidos=partidos, tema=tema_pos or None)

    if dfp.empty:
        st.info("Sin datos de posicionamiento para esos filtros.")
    else:
        x_col = "eje_x"if "eje_x"in dfp.columns else "posicion_x"
        y_col = "eje_y"if "eje_y"in dfp.columns else "posicion_y"
        fig = px.scatter(
            dfp,
            x=x_col,
            y=y_col,
            color="partido",
            size=(dfp["n_declaraciones"] if "n_declaraciones"in dfp.columns else None),
            hover_data=["tema"],
            title="Mapa de posicionamiento rival",
        )
        fig.update_layout(height=420)
        st.plotly_chart(fig, use_container_width=True)
        st.dataframe(dfp, use_container_width=True, hide_index=True)

