"""
Página 14 — Microdatos de Encuestas Propias

Carga, analiza y visualiza microdatos de encuestas (CSV/XLSX/SAV).
Alimenta los perfiles de votante con datos reales en lugar de sintéticos.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav, aplicar_estilos,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
    COLORES_PARTIDOS,
)
from dashboard.components.data_source_indicator import (
    DataSource, render_source_banner,
)
from dashboard.config import settings

st.set_page_config(page_title="Microdatos — ElectSim", layout="wide")
aplicar_estilos()
sidebar_nav()

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="background:linear-gradient(135deg,{BG2},{BG3});
            border:1px solid {BORDER};border-radius:16px;
            padding:2rem 2.5rem;margin-bottom:1.5rem">
  <div style="font-size:.65rem;font-weight:700;letter-spacing:.18em;
              text-transform:uppercase;color:{CYAN};margin-bottom:.4rem">
    MICRODATOS · ENCUESTAS PROPIAS
  </div>
  <div style="font-size:1.85rem;font-weight:800;color:{TEXT}">
    Análisis de <span style="color:{CYAN}">Microdatos</span>
  </div>
  <div style="font-size:.88rem;color:{TEXT2};margin-top:.3rem">
    Carga ficheros CSV · XLSX · SAV (SPSS) · Análisis de cohortes · Perfiles calibrados
  </div>
</div>
""", unsafe_allow_html=True)

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_carga, tab_cohortes, tab_contingencia, tab_perfiles, tab_export = st.tabs([
    "Cargar datos", "Explorador de cohortes",
    "Contingencias", "Perfiles derivados", "Exportar",
])

# ═════════════════════════════════════════════════════════════════════════════
# TAB 1 — CARGA
# ═════════════════════════════════════════════════════════════════════════════
with tab_carga:
    st.markdown(f"### Cargar fichero de microdatos")

    col_up, col_dir = st.columns([3, 2])

    with col_up:
        st.markdown("**Subir fichero directamente**")
        uploaded = st.file_uploader(
            "Arrastra aquí tu fichero de microdatos",
            type=["csv", "xlsx", "xls", "sav", "parquet"],
            help="Formatos soportados: CSV (separador ; o ,), Excel, SPSS .sav, Parquet",
        )
        codigo_manual = st.text_input(
            "Código de estudio (opcional)", placeholder="Ej: CIS_3447 / PROPIO_2025_04"
        )

        if uploaded and st.button("Procesar fichero", type="primary"):
            with st.spinner("Procesando..."):
                try:
                    from dashboard.ingestion.microdatos_loader import (
                        load_microdata_file, validate_microdata,
                    )
                    # Guardar temp
                    tmp = Path("/tmp") / uploaded.name
                    tmp.write_bytes(uploaded.read())
                    df, meta = load_microdata_file(
                        tmp,
                        codigo_estudio=codigo_manual or None,
                        data_dir=settings.data_dir,
                    )
                    informe = validate_microdata(df)
                    st.session_state["md_df"]   = df
                    st.session_state["md_meta"] = meta
                    st.success(
                        f"✓ {meta['n_registros']:,} registros · "
                        f"{meta['n_variables']} variables · "
                        f"Completitud global: {informe['completitud_global']}%"
                    )
                    if informe["warnings"]:
                        for w in informe["warnings"]:
                            st.warning(w)
                except Exception as e:
                    st.error(f"Error al cargar: {e}")

    with col_dir:
        st.markdown("**Estudios ya cargados en bronze**")
        try:
            from dashboard.ingestion.microdatos_loader import get_loaded_studies
            studies = get_loaded_studies(settings.data_dir)
            if studies:
                for s in studies:
                    cols = st.columns([3, 1])
                    with cols[0]:
                        st.markdown(
                            f"<div style='font-size:.82rem;font-weight:600;"
                            f"color:{CYAN}'>{s['codigo_estudio']}</div>"
                            f"<div style='font-size:.74rem;color:{TEXT2}'>"
                            f"{s['n_registros']:,} reg · {s['n_variables']} vars</div>",
                            unsafe_allow_html=True,
                        )
                    with cols[1]:
                        if st.button("Cargar", key=f"load_{s['codigo_estudio']}"):
                            from dashboard.ingestion.microdatos_loader import load_study_from_bronze
                            st.session_state["md_df"]   = load_study_from_bronze(
                                s["codigo_estudio"], settings.data_dir
                            )
                            st.session_state["md_meta"] = s
                            st.rerun()
            else:
                st.info("No hay estudios en bronze todavía. Sube un fichero.")
        except Exception as e:
            st.warning(f"No se pudo acceder a bronze: {e}")

    # Previsualización
    if "md_df" in st.session_state:
        df   = st.session_state["md_df"]
        meta = st.session_state.get("md_meta", {})
        st.divider()
        render_source_banner(DataSource(
            kind="microdatos",
            label=meta.get("codigo_estudio", "Estudio propio"),
            detail=meta.get("descripcion", ""),
            n_records=len(df),
        ))
        st.markdown(f"**Variables disponibles ({df.shape[1]}):**")
        st.markdown(
            " · ".join(
                f"`{c}`" for c in sorted(df.columns)
            )
        )
        with st.expander("Primeras filas"):
            st.dataframe(df.head(10), use_container_width=True)

# ═════════════════════════════════════════════════════════════════════════════
# TAB 2 — COHORTES
# ═════════════════════════════════════════════════════════════════════════════
with tab_cohortes:
    if "md_df" not in st.session_state:
        st.info("Primero carga un fichero en la pestaña 'Cargar datos'.")
        st.stop()

    df = st.session_state["md_df"]

    from dashboard.models.cohort_analysis import (
        CohortAnalyzer, ETIQUETAS_SEXO, ETIQUETAS_ESTUDIOS,
        ETIQUETAS_SITLAB, ETIQUETAS_CCAA, ETIQUETAS_CLASESUB,
    )

    st.markdown("### Constructor de cohortes")
    st.markdown("Define los criterios de filtrado para analizar un segmento específico del electorado.")

    with st.form("cohorte_form"):
        fc1, fc2, fc3 = st.columns(3)
        with fc1:
            sexo_opts = {"Todos": None, "Hombre": 1, "Mujer": 2}
            sexo_sel  = st.selectbox("Sexo", list(sexo_opts.keys()))

            edad_min, edad_max = st.slider(
                "Rango de edad",
                min_value=18, max_value=90, value=(18, 90),
            )

        with fc2:
            ccaa_options = {"Todas": None} | {v: k for k, v in ETIQUETAS_CCAA.items()}
            ccaa_sel = st.selectbox("Comunidad Autónoma", list(ccaa_options.keys()))

            estudios_options = {"Todos": None} | {v: k for k, v in ETIQUETAS_ESTUDIOS.items() if k <= 7}
            estudios_sel = st.selectbox("Nivel de estudios", list(estudios_options.keys()))

        with fc3:
            ideo_min, ideo_max = st.slider(
                "Escala ideológica (1=izq, 10=der)",
                min_value=1, max_value=10, value=(1, 10),
            )
            clase_options = {"Todas": None} | {v: k for k, v in ETIQUETAS_CLASESUB.items() if k <= 5}
            clase_sel = st.selectbox("Clase subjetiva", list(clase_options.keys()))

        submitted = st.form_submit_button("Analizar cohorte", type="primary")

    if submitted:
        criterios: dict = {}
        if sexo_opts[sexo_sel] is not None:
            criterios["sexo"] = sexo_opts[sexo_sel]
        if (edad_min, edad_max) != (18, 90):
            criterios["edad"] = (edad_min, edad_max)
        if ccaa_options[ccaa_sel] is not None:
            criterios["ccaa"] = ccaa_options[ccaa_sel]
        if estudios_options[estudios_sel] is not None:
            criterios["estudios"] = estudios_options[estudios_sel]
        if (ideo_min, ideo_max) != (1, 10):
            criterios["escideol"] = (ideo_min, ideo_max)
        if clase_options[clase_sel] is not None:
            criterios["clase_subjetiva"] = clase_options[clase_sel]

        analyzer = CohortAnalyzer(df)
        if criterios:
            analyzer = analyzer.filter(criterios)

        stats = analyzer.key_stats()
        n = stats["n_respondentes"]

        if n < 20:
            st.warning(f"Solo {n} respondentes en este cohorte. Los resultados pueden no ser representativos.")
        else:
            # KPIs
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("Respondentes", f"{n:,}")
            k2.metric("Edad media", f"{stats.get('edad_media') or '—'}")
            k3.metric("Ideología media", f"{stats.get('escideol_media') or '—'} / 10")
            k4.metric("% Mujeres", f"{stats.get('pct_mujeres') or '—'}%")

            col_v, col_i = st.columns(2)

            # Intención de voto
            with col_v:
                voto = analyzer.vote_distribution()
                if voto:
                    st.markdown(f"**Intención de voto**")
                    partidos = list(voto.keys())
                    pcts     = list(voto.values())
                    colores  = [COLORES_PARTIDOS.get(p, CYAN) for p in partidos]
                    fig = go.Figure(go.Bar(
                        x=partidos, y=pcts,
                        marker_color=colores,
                        text=[f"{v:.1f}%" for v in pcts],
                        textposition="outside",
                    ))
                    fig.update_layout(
                        height=320, plot_bgcolor="rgba(0,0,0,0)",
                        paper_bgcolor="rgba(0,0,0,0)",
                        font=dict(color=TEXT2),
                        yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
                        xaxis=dict(tickfont=dict(color=TEXT2)),
                        margin=dict(t=20, b=10),
                    )
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("No hay datos de intención de voto en este estudio.")

            # Distribución ideológica
            with col_i:
                ideo_dist = analyzer.ideology_distribution()
                if ideo_dist:
                    st.markdown("**Distribución ideológica**")
                    xi = [int(k) for k in ideo_dist.keys()]
                    yi = list(ideo_dist.values())
                    ideo_colors = [
                        "#DC2626" if x <= 3 else "#6B7280" if x <= 6 else "#2563EB"
                        for x in xi
                    ]
                    fig_i = go.Figure(go.Bar(
                        x=xi, y=yi,
                        marker_color=ideo_colors,
                        text=[f"{v:.1f}%" for v in yi],
                        textposition="outside",
                    ))
                    fig_i.update_layout(
                        height=320, plot_bgcolor="rgba(0,0,0,0)",
                        paper_bgcolor="rgba(0,0,0,0)",
                        font=dict(color=TEXT2),
                        xaxis=dict(
                            tickvals=list(range(1, 11)),
                            ticktext=["1\nIzq", "2", "3", "4", "5", "6", "7", "8", "9", "10\nDer"],
                            tickfont=dict(color=TEXT2),
                        ),
                        yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
                        margin=dict(t=20, b=10),
                    )
                    st.plotly_chart(fig_i, use_container_width=True)

            # Distribución CCAA
            ccaa_dist = analyzer.ccaa_distribution()
            if ccaa_dist:
                st.markdown("**Distribución por CCAA**")
                ccaa_sorted = dict(sorted(ccaa_dist.items(), key=lambda x: x[1], reverse=True))
                fig_ccaa = go.Figure(go.Bar(
                    y=list(ccaa_sorted.keys()), x=list(ccaa_sorted.values()),
                    orientation="h", marker_color=CYAN,
                    text=[f"{v:.1f}%" for v in ccaa_sorted.values()],
                    textposition="outside",
                ))
                fig_ccaa.update_layout(
                    height=max(300, len(ccaa_sorted) * 22),
                    plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                    font=dict(color=TEXT2),
                    xaxis=dict(range=[0, max(ccaa_sorted.values()) * 1.2],
                               gridcolor=BORDER, tickfont=dict(color=TEXT2)),
                    yaxis=dict(tickfont=dict(color=TEXT2)),
                    margin=dict(t=10, b=10, l=10, r=40),
                )
                st.plotly_chart(fig_ccaa, use_container_width=True)

            # Prompt LLM
            with st.expander("Prompt LLM generado para este cohorte"):
                prompt = analyzer.build_llm_prompt(criterios)
                st.code(prompt, language=None)
                st.download_button(
                    "Descargar prompt", prompt,
                    file_name="prompt_cohorte.txt", mime="text/plain",
                )

# ═════════════════════════════════════════════════════════════════════════════
# TAB 3 — CONTINGENCIAS
# ═════════════════════════════════════════════════════════════════════════════
with tab_contingencia:
    if "md_df" not in st.session_state:
        st.info("Primero carga un fichero en la pestaña 'Cargar datos'.")
        st.stop()

    df = st.session_state["md_df"]
    from dashboard.models.cohort_analysis import CohortAnalyzer, contingency_stats

    st.markdown("### Análisis de asociación entre variables")
    st.markdown(
        "Tau de Goodman-Kruskal mide qué fracción de la variabilidad en la variable dependiente "
        "se explica por la variable predictora. Valores > 0.1 = asociación fuerte."
    )

    analyzer = CohortAnalyzer(df)

    col_a1, col_a2 = st.columns(2)
    with col_a1:
        st.markdown("**Asociaciones con intención de voto (top 10)**")
        with st.spinner("Calculando..."):
            assoc = analyzer.top_associations()
        if assoc:
            df_assoc = pd.DataFrame(assoc)
            df_assoc = df_assoc.rename(columns={
                "variable": "Variable", "tau_gk": "Tau GK",
                "cramer_v": "V Cramér", "chi2": "Chi²", "p_valor": "p-valor",
            })
            # Color por fuerza
            st.dataframe(
                df_assoc[["Variable", "Tau GK", "V Cramér", "Chi²"]].style.background_gradient(
                    subset=["Tau GK"], cmap="Blues"
                ).format({"Tau GK": "{:.4f}", "V Cramér": "{:.4f}", "Chi²": "{:.1f}"}),
                use_container_width=True,
            )
        else:
            st.info("No hay columna de intención de voto en este estudio.")

    with col_a2:
        st.markdown("**Tabla de contingencia personalizada**")
        vars_disponibles = [c for c in df.columns if df[c].nunique() < 50]
        var_fila = st.selectbox("Variable fila (dependiente)", vars_disponibles,
                                index=min(0, len(vars_disponibles)-1), key="ct_fila")
        var_col  = st.selectbox("Variable columna (predictora)", vars_disponibles,
                                index=min(1, len(vars_disponibles)-1), key="ct_col")

        if st.button("Calcular contingencia"):
            stats_ct = contingency_stats(df, var_fila, var_col)
            if stats_ct["chi2"] is not None:
                m1, m2, m3 = st.columns(3)
                m1.metric("Chi²", f"{stats_ct['chi2']:.1f}")
                m2.metric("Tau GK", f"{stats_ct['tau_gk']:.4f}")
                m3.metric("V Cramér", f"{stats_ct['cramer_v']:.4f}")

                tabla = stats_ct.get("tabla", {})
                if tabla:
                    df_tabla = pd.DataFrame(tabla).round(1)
                    st.dataframe(df_tabla, use_container_width=True)
            else:
                st.warning("No hay datos suficientes para este cruce.")

# ═════════════════════════════════════════════════════════════════════════════
# TAB 4 — PERFILES DERIVADOS
# ═════════════════════════════════════════════════════════════════════════════
with tab_perfiles:
    if "md_df" not in st.session_state:
        st.info("Primero carga un fichero en la pestaña 'Cargar datos'.")
        st.stop()

    df   = st.session_state["md_df"]
    meta = st.session_state.get("md_meta", {})

    from dashboard.models.cohort_analysis import auto_segment, CohortAnalyzer

    st.markdown("### Perfiles de votante derivados de microdatos reales")

    col_cfg1, col_cfg2 = st.columns([2, 3])
    with col_cfg1:
        n_perfiles = st.slider("Número de perfiles a generar", 3, 8, 6)
        metodo = st.selectbox(
            "Método de segmentación",
            ["ideology_x_vote", "demographics"],
            format_func=lambda x: "Escala ideológica" if x == "ideology_x_vote" else "Demográfico (edad)",
        )
        if st.button("Generar perfiles", type="primary"):
            with st.spinner("Segmentando electorado..."):
                perfiles = auto_segment(df, n_perfiles=n_perfiles, method=metodo)
                st.session_state["md_perfiles"] = perfiles

    with col_cfg2:
        render_source_banner(DataSource(
            kind="microdatos",
            label=meta.get("codigo_estudio", "Estudio propio"),
            detail="Perfiles generados a partir de microdatos reales, no sintéticos.",
            n_records=len(df),
        ))

    if "md_perfiles" in st.session_state:
        perfiles = st.session_state["md_perfiles"]
        if not perfiles:
            st.warning("No se generaron perfiles. Comprueba que el fichero tiene las columnas necesarias (escideol, edad).")
        else:
            st.markdown(f"**{len(perfiles)} perfiles generados:**")

            # KPI row
            kpi_cols = st.columns(len(perfiles))
            for i, p in enumerate(perfiles):
                peso_pct = round(p.get("peso", 0) * 100, 1)
                ideo = p.get("ideo_media", 5)
                color = "#DC2626" if ideo < 4 else "#6B7280" if ideo < 7 else "#2563EB"
                with kpi_cols[i]:
                    st.markdown(
                        f"<div style='background:{BG3};border:1px solid {BORDER};"
                        f"border-left:3px solid {color};padding:.5rem .6rem;"
                        f"border-radius:8px;text-align:center'>"
                        f"<div style='font-size:.72rem;font-weight:700;color:{color}'>"
                        f"{p['etiqueta'][:20]}</div>"
                        f"<div style='font-size:1.2rem;font-weight:800'>{peso_pct}%</div>"
                        f"<div style='font-size:.7rem;color:{TEXT2}'>"
                        f"{p.get('n_respondentes', 0):,} resp.</div></div>",
                        unsafe_allow_html=True,
                    )

            st.divider()
            perfil_sel = st.selectbox("Ver detalle de perfil", [p["etiqueta"] for p in perfiles])
            p = next(x for x in perfiles if x["etiqueta"] == perfil_sel)

            col_p1, col_p2 = st.columns(2)
            with col_p1:
                voto = p.get("intencion_voto", {})
                if voto:
                    fig_v = go.Figure(go.Pie(
                        labels=list(voto.keys()),
                        values=list(voto.values()),
                        hole=0.45,
                        marker_colors=[COLORES_PARTIDOS.get(k, CYAN) for k in voto.keys()],
                    ))
                    fig_v.update_layout(
                        title="Intención de voto", height=300,
                        paper_bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT2),
                        margin=dict(t=30, b=10),
                    )
                    st.plotly_chart(fig_v, use_container_width=True)

            with col_p2:
                stats_p = {
                    "Edad media":       f"{p.get('edad_media') or '—'} años",
                    "Ideología media":  f"{p.get('ideo_media') or '—'} / 10",
                    "Posición":         p.get("ideo_label", "—"),
                    "Respondentes":     f"{p.get('n_respondentes', 0):,}",
                    "Fuente":           p.get("fuente_datos", "microdatos_reales"),
                }
                for k, v in stats_p.items():
                    st.markdown(
                        f"<div style='display:flex;justify-content:space-between;"
                        f"padding:.3rem .5rem;border-bottom:1px solid {BORDER}'>"
                        f"<span style='color:{TEXT2};font-size:.82rem'>{k}</span>"
                        f"<span style='font-weight:700;font-size:.82rem'>{v}</span>"
                        f"</div>",
                        unsafe_allow_html=True,
                    )

            with st.expander("Prompt LLM listo para usar"):
                analyzer_p = CohortAnalyzer(
                    df[df["escideol"].notna()] if "escideol" in df.columns else df
                )
                st.code(analyzer_p.build_llm_prompt(etiqueta=perfil_sel), language=None)

# ═════════════════════════════════════════════════════════════════════════════
# TAB 5 — EXPORTAR
# ═════════════════════════════════════════════════════════════════════════════
with tab_export:
    if "md_df" not in st.session_state:
        st.info("Primero carga un fichero en la pestaña 'Cargar datos'.")
        st.stop()

    df   = st.session_state["md_df"]
    meta = st.session_state.get("md_meta", {})

    st.markdown("### Exportar datos y perfiles")

    col_e1, col_e2 = st.columns(2)

    with col_e1:
        st.markdown("**Datos normalizados (CSV)**")
        csv_bytes = df.to_csv(index=False).encode("utf-8")
        st.download_button(
            "Descargar microdatos normalizados",
            data=csv_bytes,
            file_name=f"{meta.get('codigo_estudio', 'microdatos')}_normalizado.csv",
            mime="text/csv",
        )

        st.markdown("**Metadatos del estudio (JSON)**")
        meta_export = {k: str(v) for k, v in meta.items()}
        st.download_button(
            "Descargar metadatos",
            data=json.dumps(meta_export, ensure_ascii=False, indent=2),
            file_name=f"{meta.get('codigo_estudio', 'estudio')}_meta.json",
            mime="application/json",
        )

    with col_e2:
        if "md_perfiles" in st.session_state:
            st.markdown("**Perfiles generados (JSON)**")
            perfiles_export = st.session_state["md_perfiles"]
            st.download_button(
                "Descargar perfiles",
                data=json.dumps(perfiles_export, ensure_ascii=False, indent=2,
                                default=str),
                file_name="perfiles_microdatos.json",
                mime="application/json",
            )

            st.markdown("**Perfiles como CSV plano**")
            rows = []
            for p in perfiles_export:
                rows.append({
                    "etiqueta":    p["etiqueta"],
                    "peso_pct":    round(p.get("peso", 0) * 100, 2),
                    "n_resp":      p.get("n_respondentes"),
                    "edad_media":  p.get("edad_media"),
                    "ideo_media":  p.get("ideo_media"),
                    "ideo_label":  p.get("ideo_label"),
                    "top_partido": next(iter(p.get("intencion_voto", {})), "—"),
                })
            df_perfiles_csv = pd.DataFrame(rows)
            st.download_button(
                "Descargar tabla resumen",
                data=df_perfiles_csv.to_csv(index=False).encode("utf-8"),
                file_name="perfiles_resumen.csv",
                mime="text/csv",
            )
        else:
            st.info("Genera primero los perfiles en la pestaña 'Perfiles derivados'.")
