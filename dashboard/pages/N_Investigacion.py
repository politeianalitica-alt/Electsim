"""
Canvas de Investigación — ElectSim España.
Tablero de análisis para construir hipótesis sobre actores, eventos y relaciones.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    AMBER, BG, BG2, BG3, BLUE, BORDER, CYAN, GREEN, MUTED,
    PURPLE, RED, TEXT, TEXT2,
    sidebar_nav,
)
from workspace_intelligence.investigation_canvas import (
    CanvasObjectType,
    ConnectionType,
    EvidenceStrength,
    add_connection,
    add_hypothesis,
    add_object,
    create_canvas,
    export_canvas_as_text,
    get_canvas_summary,
    list_canvases,
    update_hypothesis_status,
)

# ── Page config ────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Investigación — ElectSim",
    layout="wide",
    initial_sidebar_state="expanded",
)

sidebar_nav()

# ── Design helpers ─────────────────────────────────────────────────────────────

_TYPE_COLOR: dict[str, str] = {
    "actor": BLUE,
    "event": AMBER,
    "document": PURPLE,
    "narrative": CYAN,
    "alert": RED,
    "location": GREEN,
    "organization": BLUE,
    "unknown": MUTED,
}

_STRENGTH_COLOR: dict[str, str] = {
    "confirmed": GREEN,
    "probable": CYAN,
    "possible": MUTED,
    "disputed": RED,
    "unknown": MUTED,
}

_STATUS_COLOR: dict[str, str] = {
    "open": BLUE,
    "confirmed": GREEN,
    "refuted": RED,
}

_DEMO_WORKSPACE = "ws_espana_2026"
_DEMO_TENANT = "tenant_politeia"


def _badge(label: str, color: str) -> str:
    return (
        f'<span style="background:{color}22;color:{color};border:1px solid {color}55;'
        f'border-radius:4px;padding:2px 8px;font-size:0.72rem;font-weight:600;">'
        f"{label}</span>"
    )


def _object_card(obj) -> None:  # type: ignore[no-untyped-def]
    color = _TYPE_COLOR.get(obj.object_type.value, MUTED)
    strength_color = _STRENGTH_COLOR.get(obj.evidence_strength.value, MUTED)
    st.markdown(
        f"""
        <div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {color};
                    border-radius:6px;padding:10px 14px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            {_badge(obj.object_type.value, color)}
            {_badge(obj.evidence_strength.value, strength_color)}
          </div>
          <div style="color:{TEXT};font-weight:600;font-size:0.95rem;">{obj.title}</div>
          {'<div style="color:' + TEXT2 + ';font-size:0.82rem;margin-top:3px;">' + obj.description[:120] + ('...' if len(obj.description) > 120 else '') + '</div>' if obj.description else ''}
          {'<div style="color:' + MUTED + ';font-size:0.75rem;margin-top:4px;">Ref: ' + obj.source_ref + '</div>' if obj.source_ref else ''}
        </div>
        """,
        unsafe_allow_html=True,
    )


# ── Page header ────────────────────────────────────────────────────────────────

st.markdown(
    f"""
    <div style="margin-bottom:24px;">
      <h1 style="color:{CYAN};margin:0;font-size:1.8rem;font-weight:700;letter-spacing:-0.5px;">
        Canvas de Investigación
      </h1>
      <p style="color:{TEXT2};margin:4px 0 0;font-size:0.95rem;">
        Construye hipótesis conectando actores, eventos y señales
      </p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ── Session state ──────────────────────────────────────────────────────────────

if "active_canvas_id" not in st.session_state:
    st.session_state["active_canvas_id"] = None

# ── Tabs ───────────────────────────────────────────────────────────────────────

tab_list, tab_board, tab_hyp, tab_export = st.tabs(
    ["Canvases", "Canvas activo", "Hipótesis", "Exportar análisis"]
)

# ══════════════════════════════════════════════════════════════════════════════
# TAB 1: Lista de canvases
# ══════════════════════════════════════════════════════════════════════════════
with tab_list:
    canvases = list_canvases(_DEMO_WORKSPACE, _DEMO_TENANT)

    col_h1, col_h2 = st.columns([3, 1])
    with col_h1:
        st.markdown(
            f'<h3 style="color:{TEXT};margin:0 0 16px;">Canvases de investigación</h3>',
            unsafe_allow_html=True,
        )

    # Canvas cards
    if not canvases:
        st.info("No hay canvases disponibles. Crea uno nuevo.")
    else:
        for cv in canvases:
            summary = get_canvas_summary(cv.id)
            with st.container():
                c1, c2, c3, c4, c5 = st.columns([4, 1, 1, 1, 1])
                with c1:
                    st.markdown(
                        f"""
                        <div>
                          <span style="color:{CYAN};font-weight:600;font-size:1rem;">{cv.title}</span><br>
                          <span style="color:{TEXT2};font-size:0.82rem;">{cv.description[:100] + ('...' if len(cv.description) > 100 else '')}</span><br>
                          <span style="color:{MUTED};font-size:0.75rem;">{cv.created_at.strftime('%Y-%m-%d')}</span>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
                with c2:
                    st.metric("Objetos", summary.get("object_count", 0))
                with c3:
                    st.metric("Conexiones", summary.get("connection_count", 0))
                with c4:
                    st.metric("Hipótesis", summary.get("hypothesis_count", 0))
                with c5:
                    if st.button("Abrir", key=f"open_{cv.id}"):
                        st.session_state["active_canvas_id"] = cv.id
                        st.success(f"Canvas '{cv.title}' activado.")
                st.markdown(f'<hr style="border-color:{BORDER};margin:8px 0;">', unsafe_allow_html=True)

    # Nuevo canvas
    st.markdown(
        f'<h4 style="color:{TEXT};margin:24px 0 8px;">Nuevo canvas</h4>',
        unsafe_allow_html=True,
    )
    with st.form("form_nuevo_canvas"):
        cv_title = st.text_input("Título del canvas")
        cv_desc = st.text_area("Descripción", height=80)
        submitted = st.form_submit_button("Crear canvas")
        if submitted:
            if not cv_title.strip():
                st.error("El título es obligatorio.")
            else:
                new_cv = create_canvas(
                    workspace_id=_DEMO_WORKSPACE,
                    tenant_id=_DEMO_TENANT,
                    title=cv_title.strip(),
                    description=cv_desc.strip(),
                    created_by="analista",
                )
                st.session_state["active_canvas_id"] = new_cv.id
                st.success(f"Canvas '{new_cv.title}' creado y activado.")
                st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# TAB 2: Canvas activo
# ══════════════════════════════════════════════════════════════════════════════
with tab_board:
    all_canvases = list_canvases(_DEMO_WORKSPACE, _DEMO_TENANT)
    if not all_canvases:
        st.warning("No hay canvases disponibles. Crea uno en la pestaña Canvases.")
        st.stop()

    canvas_options = {cv.title: cv.id for cv in all_canvases}
    # Default active
    default_title = next(
        (cv.title for cv in all_canvases if cv.id == st.session_state.get("active_canvas_id")),
        all_canvases[0].title,
    )
    selected_title = st.selectbox(
        "Canvas activo",
        options=list(canvas_options.keys()),
        index=list(canvas_options.keys()).index(default_title),
        key="canvas_selector",
    )
    active_id = canvas_options[selected_title]
    st.session_state["active_canvas_id"] = active_id

    active_canvases_map = {cv.id: cv for cv in all_canvases}
    canvas = active_canvases_map[active_id]

    board_col, actions_col = st.columns([3, 1])

    # ── Board ──────────────────────────────────────────────────────────────────
    with board_col:
        st.markdown(
            f'<h4 style="color:{TEXT};margin:8px 0 12px;">Objetos del canvas</h4>',
            unsafe_allow_html=True,
        )
        if not canvas.objects:
            st.info("No hay objetos en este canvas. Añade uno desde el panel derecho.")
        else:
            grid_cols = st.columns(2)
            for idx, obj in enumerate(canvas.objects):
                with grid_cols[idx % 2]:
                    _object_card(obj)

        # Connections list
        if canvas.connections:
            st.markdown(
                f'<h4 style="color:{TEXT};margin:16px 0 8px;">Conexiones</h4>',
                unsafe_allow_html=True,
            )
            obj_map = {o.id: o.title for o in canvas.objects}
            for conn in canvas.connections:
                from_t = obj_map.get(conn.from_object_id, conn.from_object_id)
                to_t = obj_map.get(conn.to_object_id, conn.to_object_id)
                label_part = f" — {conn.label}" if conn.label else ""
                st.markdown(
                    f"""
                    <div style="background:{BG2};border:1px solid {BORDER};border-radius:5px;
                                padding:7px 12px;margin-bottom:5px;font-size:0.85rem;">
                      <span style="color:{CYAN};font-weight:600;">{from_t}</span>
                      <span style="color:{MUTED};"> → </span>
                      <span style="color:{AMBER};">{conn.connection_type.value}</span>
                      <span style="color:{MUTED};"> → </span>
                      <span style="color:{CYAN};font-weight:600;">{to_t}</span>
                      <span style="color:{TEXT2};">{label_part}</span>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

    # ── Actions panel ──────────────────────────────────────────────────────────
    with actions_col:
        st.markdown(
            f'<h4 style="color:{TEXT};margin:8px 0 10px;">Acciones</h4>',
            unsafe_allow_html=True,
        )

        # Añadir objeto
        with st.expander("Añadir objeto", expanded=True):
            with st.form("form_add_object"):
                obj_type = st.selectbox(
                    "Tipo",
                    options=[t.value for t in CanvasObjectType],
                    key="obj_type_sel",
                )
                obj_title_input = st.text_input("Título", key="obj_title_input")
                obj_desc_input = st.text_area("Descripción", height=60, key="obj_desc_input")
                obj_strength = st.selectbox(
                    "Evidencia",
                    options=[e.value for e in EvidenceStrength],
                    key="obj_strength_sel",
                )
                obj_submitted = st.form_submit_button("Añadir")
                if obj_submitted:
                    if not obj_title_input.strip():
                        st.error("El título es obligatorio.")
                    else:
                        add_object(
                            canvas_id=active_id,
                            object_type=CanvasObjectType(obj_type),
                            title=obj_title_input.strip(),
                            description=obj_desc_input.strip(),
                            evidence_strength=EvidenceStrength(obj_strength),
                            created_by="analista",
                        )
                        st.success("Objeto añadido.")
                        st.rerun()

        # Añadir conexión
        if len(canvas.objects) >= 2:
            with st.expander("Añadir conexión", expanded=False):
                with st.form("form_add_connection"):
                    obj_titles_map = {o.title: o.id for o in canvas.objects}
                    obj_title_list = list(obj_titles_map.keys())
                    from_sel = st.selectbox("Desde", options=obj_title_list, key="conn_from")
                    to_sel = st.selectbox("Hasta", options=obj_title_list, key="conn_to")
                    conn_type_sel = st.selectbox(
                        "Tipo de conexión",
                        options=[c.value for c in ConnectionType],
                        key="conn_type_sel",
                    )
                    conn_label_input = st.text_input("Etiqueta", key="conn_label_input")
                    conn_submitted = st.form_submit_button("Añadir conexión")
                    if conn_submitted:
                        if from_sel == to_sel:
                            st.error("Los objetos origen y destino no pueden ser iguales.")
                        else:
                            add_connection(
                                canvas_id=active_id,
                                from_object_id=obj_titles_map[from_sel],
                                to_object_id=obj_titles_map[to_sel],
                                connection_type=ConnectionType(conn_type_sel),
                                label=conn_label_input.strip(),
                            )
                            st.success("Conexión añadida.")
                            st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# TAB 3: Hipótesis
# ══════════════════════════════════════════════════════════════════════════════
with tab_hyp:
    all_canvases_h = list_canvases(_DEMO_WORKSPACE, _DEMO_TENANT)
    if not all_canvases_h:
        st.warning("No hay canvases disponibles.")
    else:
        active_id_h = st.session_state.get("active_canvas_id") or all_canvases_h[0].id
        canvas_h = next((c for c in all_canvases_h if c.id == active_id_h), all_canvases_h[0])
        obj_map_h = {o.id: o.title for o in canvas_h.objects}

        st.markdown(
            f'<h3 style="color:{TEXT};margin:0 0 16px;">Hipótesis: {canvas_h.title}</h3>',
            unsafe_allow_html=True,
        )

        if not canvas_h.hypotheses:
            st.info("No hay hipótesis en este canvas.")
        else:
            for hyp in canvas_h.hypotheses:
                status_color = _STATUS_COLOR.get(hyp.status, MUTED)
                conf_pct = int(hyp.confidence * 100)
                conf_color = GREEN if hyp.confidence >= 0.7 else (AMBER if hyp.confidence >= 0.4 else RED)

                support_titles = [obj_map_h.get(oid, oid) for oid in hyp.supporting_object_ids]
                chips_html = " ".join(
                    f'<span style="background:{BLUE}22;color:{BLUE};border:1px solid {BLUE}44;'
                    f'border-radius:3px;padding:1px 6px;font-size:0.72rem;">{t}</span>'
                    for t in support_titles
                )

                st.markdown(
                    f"""
                    <div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {status_color};
                                border-radius:6px;padding:12px 16px;margin-bottom:12px;">
                      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        {_badge(hyp.status, status_color)}
                        <span style="color:{TEXT};font-weight:600;font-size:0.95rem;">{hyp.title}</span>
                      </div>
                      <div style="color:{TEXT2};font-size:0.85rem;margin-bottom:8px;">{hyp.description}</div>
                      <div style="margin-bottom:6px;">
                        <span style="color:{MUTED};font-size:0.78rem;">Confianza:</span>
                        <span style="color:{conf_color};font-weight:700;font-size:0.85rem;margin-left:6px;">{conf_pct}%</span>
                        <div style="background:{BORDER};border-radius:3px;height:5px;margin-top:4px;">
                          <div style="background:{conf_color};width:{conf_pct}%;height:5px;border-radius:3px;"></div>
                        </div>
                      </div>
                      {'<div style="margin-top:4px;">' + chips_html + '</div>' if chips_html else ''}
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

                btn_col1, btn_col2, _ = st.columns([1, 1, 6])
                with btn_col1:
                    if hyp.status != "confirmed":
                        if st.button("Confirmar", key=f"confirm_{hyp.id}"):
                            update_hypothesis_status(canvas_h.id, hyp.id, "confirmed")
                            st.rerun()
                with btn_col2:
                    if hyp.status != "refuted":
                        if st.button("Refutar", key=f"refute_{hyp.id}"):
                            update_hypothesis_status(canvas_h.id, hyp.id, "refuted")
                            st.rerun()

        # Nueva hipótesis
        st.markdown(
            f'<h4 style="color:{TEXT};margin:24px 0 8px;">Nueva hipótesis</h4>',
            unsafe_allow_html=True,
        )
        with st.form("form_new_hypothesis"):
            hyp_title = st.text_input("Título de la hipótesis")
            hyp_desc = st.text_area("Descripción", height=80)
            hyp_conf = st.slider("Confianza", min_value=0.0, max_value=1.0, value=0.5, step=0.05)
            hyp_submitted = st.form_submit_button("Crear hipótesis")
            if hyp_submitted:
                if not hyp_title.strip():
                    st.error("El título es obligatorio.")
                else:
                    add_hypothesis(
                        canvas_id=canvas_h.id,
                        title=hyp_title.strip(),
                        description=hyp_desc.strip(),
                        confidence=hyp_conf,
                    )
                    st.success("Hipótesis añadida.")
                    st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# TAB 4: Exportar análisis
# ══════════════════════════════════════════════════════════════════════════════
with tab_export:
    all_canvases_e = list_canvases(_DEMO_WORKSPACE, _DEMO_TENANT)
    if not all_canvases_e:
        st.warning("No hay canvases disponibles.")
    else:
        active_id_e = st.session_state.get("active_canvas_id") or all_canvases_e[0].id
        canvas_e = next((c for c in all_canvases_e if c.id == active_id_e), all_canvases_e[0])
        summary_e = get_canvas_summary(active_id_e)

        st.markdown(
            f'<h3 style="color:{TEXT};margin:0 0 16px;">Exportar: {canvas_e.title}</h3>',
            unsafe_allow_html=True,
        )

        col_btn1, col_btn2, _ = st.columns([1, 1, 4])
        with col_btn1:
            if st.button("Generar resumen de investigación"):
                text_export = export_canvas_as_text(active_id_e)
                st.session_state["canvas_export_text"] = text_export

        with col_btn2:
            if st.button("Enviar al Brain IA"):
                text_for_brain = st.session_state.get(
                    "canvas_export_text", export_canvas_as_text(active_id_e)
                )
                st.session_state["brain_context"] = text_for_brain
                st.info(
                    "Contexto enviado al Brain IA. Ve a la pestaña Brain para continuar el análisis."
                )

        if "canvas_export_text" in st.session_state:
            st.text_area(
                "Texto de investigación",
                value=st.session_state["canvas_export_text"],
                height=300,
            )

        # Estadísticas
        st.markdown(
            f'<h4 style="color:{TEXT};margin:24px 0 12px;">Estadísticas del canvas</h4>',
            unsafe_allow_html=True,
        )

        stats_col1, stats_col2, stats_col3 = st.columns(3)

        with stats_col1:
            by_type = summary_e.get("by_type", {})
            if by_type:
                type_colors = [_TYPE_COLOR.get(t, MUTED) for t in by_type]
                fig_type = go.Figure(
                    go.Bar(
                        x=list(by_type.keys()),
                        y=list(by_type.values()),
                        marker_color=type_colors,
                    )
                )
                fig_type.update_layout(
                    title="Objetos por tipo",
                    paper_bgcolor=BG2,
                    plot_bgcolor=BG2,
                    font_color=TEXT2,
                    margin=dict(l=20, r=20, t=40, b=20),
                    height=250,
                )
                fig_type.update_xaxes(tickfont_color=TEXT2, gridcolor=BORDER)
                fig_type.update_yaxes(tickfont_color=TEXT2, gridcolor=BORDER)
                st.plotly_chart(fig_type, use_container_width=True)
            else:
                st.info("Sin objetos para mostrar.")

        with stats_col2:
            conn_types: dict[str, int] = {}
            for conn in canvas_e.connections:
                conn_types[conn.connection_type.value] = conn_types.get(conn.connection_type.value, 0) + 1
            if conn_types:
                fig_conn = go.Figure(
                    go.Pie(
                        labels=list(conn_types.keys()),
                        values=list(conn_types.values()),
                        marker_colors=[CYAN, BLUE, PURPLE, AMBER, GREEN, MUTED],
                    )
                )
                fig_conn.update_layout(
                    title="Tipos de conexión",
                    paper_bgcolor=BG2,
                    font_color=TEXT2,
                    margin=dict(l=20, r=20, t=40, b=20),
                    height=250,
                )
                st.plotly_chart(fig_conn, use_container_width=True)
            else:
                st.info("Sin conexiones para mostrar.")

        with stats_col3:
            if canvas_e.hypotheses:
                hyp_titles = [h.title[:25] + "..." if len(h.title) > 25 else h.title for h in canvas_e.hypotheses]
                hyp_confs = [h.confidence for h in canvas_e.hypotheses]
                hyp_colors = [
                    GREEN if c >= 0.7 else (AMBER if c >= 0.4 else RED) for c in hyp_confs
                ]
                fig_hyp = go.Figure(
                    go.Bar(
                        x=hyp_titles,
                        y=hyp_confs,
                        marker_color=hyp_colors,
                    )
                )
                fig_hyp.update_layout(
                    title="Confianza en hipótesis",
                    paper_bgcolor=BG2,
                    plot_bgcolor=BG2,
                    font_color=TEXT2,
                    margin=dict(l=20, r=20, t=40, b=20),
                    height=250,
                    yaxis_range=[0, 1],
                )
                fig_hyp.update_xaxes(tickfont_color=TEXT2, gridcolor=BORDER)
                fig_hyp.update_yaxes(tickfont_color=TEXT2, gridcolor=BORDER)
                st.plotly_chart(fig_hyp, use_container_width=True)
            else:
                st.info("Sin hipótesis para mostrar.")
