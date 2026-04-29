"""D10 — Centro de Operaciones (Workspace del Analista)
Espacio de trabajo central: Investigation Canvas, Draft Studio,
Intelligence Notebook y Calendario Político.
"""
from __future__ import annotations

import json
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
)

# ── page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Centro de Operaciones · Politeia",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()

# ── LLM optional ───────────────────────────────────────────────────────────────
try:
    from dashboard.services.llm_local import chat as llm_chat, disponible as llm_disponible
    _LLM_OK = llm_disponible().get("brain", False)
except Exception:
    _LLM_OK = False

# ── rng ────────────────────────────────────────────────────────────────────────
rng = np.random.default_rng(99)

# ── session state init ─────────────────────────────────────────────────────────
if "ws_cliente_activo" not in st.session_state:
    st.session_state["ws_cliente_activo"] = "IBERDROLA"
if "ws_notas" not in st.session_state:
    st.session_state["ws_notas"] = {}
if "ws_borrador" not in st.session_state:
    st.session_state["ws_borrador"] = ""
if "ws_notebook" not in st.session_state:
    st.session_state["ws_notebook"] = []

# ── demo data ──────────────────────────────────────────────────────────────────
CLIENTES = [
    {"nombre": "IBERDROLA",    "tipo": "Public Affairs",          "alertas": 2, "urgente": True,  "proxima": "Briefing: vence viernes"},
    {"nombre": "PP — EURO",    "tipo": "Partido político",        "alertas": 1, "urgente": False, "proxima": "Reunión: mañana 10h"},
    {"nombre": "REPSOL",       "tipo": "Riesgo regulatorio",      "alertas": 0, "urgente": False, "proxima": None},
    {"nombre": "FUNDACIÓN FIDE","tipo": "Think tank",             "alertas": 3, "urgente": False, "proxima": "Informe: esta semana"},
    {"nombre": "AYTO. MADRID", "tipo": "Gestión política local",  "alertas": 0, "urgente": False, "proxima": None},
]

ACTIVIDAD_RECIENTE = [
    {"icono": "📝", "texto": "Borrador Iberdrola: v4",      "tiempo": "hace 23 min",   "tipo": "borrador"},
    {"icono": "🔔", "texto": "Alerta: RD 342/2026",         "tiempo": "hace 1h 24min", "tipo": "alerta"},
    {"icono": "📌", "texto": 'Nota: "revisar Junts"',        "tiempo": "hace 2h",       "tipo": "nota"},
    {"icono": "🔲", "texto": "Canvas PP guardado",           "tiempo": "hace 3h",       "tipo": "canvas"},
    {"icono": "📊", "texto": "Informe riesgo Repsol",        "tiempo": "hace 5h",       "tipo": "informe"},
]

EVENTOS_CALENDARIO = [
    {"fecha": datetime.now() + timedelta(hours=2),  "evento": "Reunión PP — Estrategia Euro",     "tipo": "reunion", "cliente": "PP — EURO"},
    {"fecha": datetime.now() + timedelta(days=1),   "evento": "Briefing Iberdrola vence",          "tipo": "deadline", "cliente": "IBERDROLA"},
    {"fecha": datetime.now() + timedelta(days=2),   "evento": "Pleno Congreso — Reforma energética","tipo": "institucional", "cliente": "IBERDROLA"},
    {"fecha": datetime.now() + timedelta(days=3),   "evento": "Entrega informe Fundación FIDE",   "tipo": "deadline", "cliente": "FUNDACIÓN FIDE"},
    {"fecha": datetime.now() + timedelta(days=5),   "evento": "Consejo de Ministros ordinario",   "tipo": "institucional", "cliente": None},
    {"fecha": datetime.now() + timedelta(days=7),   "evento": "Debate presupuestos Ayto. Madrid", "tipo": "institucional", "cliente": "AYTO. MADRID"},
    {"fecha": datetime.now() + timedelta(days=10),  "evento": "Rueda de prensa Repsol",           "tipo": "reunion", "cliente": "REPSOL"},
    {"fecha": datetime.now() + timedelta(days=14),  "evento": "Elecciones autonómicas (simulación)", "tipo": "electoral", "cliente": None},
]

NOTAS_DEMO = [
    {"id": "n1", "titulo": "Estrategia Junts próximas semanas", "texto": "Revisar posición de Junts ante reforma del CGPJ. Posible abstención si se garantizan contrapartidas en financiación singular.", "tags": ["Junts", "CGPJ", "coalición"], "fecha": "hace 2h"},
    {"id": "n2", "titulo": "Puntos clave reunión Iberdrola",    "texto": "1) Renewable targets 2030. 2) Riesgo regulatorio RD tarifas. 3) Mensaje nuclear ante apagón UE.", "tags": ["Iberdrola", "energía", "regulación"], "fecha": "hace 5h"},
    {"id": "n3", "titulo": "Análisis encuesta interna PP",      "texto": "Gap de -4pts en jóvenes 18-35. Prioridad: vivienda y empleo. Feijóo mantiene valoración positiva 4.2/10.", "tags": ["PP", "encuesta", "jóvenes"], "fecha": "ayer"},
]


# ══════════════════════════════════════════════════════════════════════════════
# LAYOUT — 3 columnas fijas
# ══════════════════════════════════════════════════════════════════════════════
st.markdown("""
<style>
.ws-panel-left { background: #0a0f1a; border-right: 1px solid #1e2d40; }
.ws-cliente-card { border-left: 3px solid #333; padding: 0.5rem 0.75rem;
  border-radius: 0 6px 6px 0; margin: 4px 0; cursor: pointer;
  transition: border-color 0.2s; }
.ws-cliente-card.activo { border-left-color: #4ecdc4; background: #0d1117; }
</style>
""", unsafe_allow_html=True)

# ── PAGE HEADER ─────────────────────────────────────────────────────────────
st.markdown("""
<div style='background:linear-gradient(135deg,#0a0f1a 0%,#16213e 50%,#0f3460 100%);
     padding:1.2rem 2rem;border-radius:12px;margin-bottom:1rem;
     border-left:4px solid #4ecdc4;display:flex;align-items:center;gap:1rem;'>
  <div>
    <h1 style='color:#fff;margin:0;font-size:1.6rem;'>🔬 Centro de Operaciones</h1>
    <p style='color:#aaa;margin:0.2rem 0 0;font-size:0.88rem;'>
      Workspace · Investigation Canvas · Draft Studio · Intelligence Notebook · Calendario Político
    </p>
  </div>
</div>
""", unsafe_allow_html=True)

# ── 3-column layout ────────────────────────────────────────────────────────────
panel_left, main_zone, panel_right = st.columns([1, 3, 1.2])

# ══════════════════════════════════════════════════════════════════════════════
# PANEL IZQUIERDO — Dock de clientes y herramientas
# ══════════════════════════════════════════════════════════════════════════════
with panel_left:
    st.markdown("""
<div style='background:#0a0f1a;padding:0.75rem;border-radius:8px;border:1px solid #1e2d40;'>
  <div style='display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;'>
    <div style='width:36px;height:36px;border-radius:50%;background:#4ecdc4;
         display:flex;align-items:center;justify-content:center;font-size:1rem;'>👤</div>
    <div>
      <div style='color:#fff;font-weight:700;font-size:0.9rem;'>Analista</div>
      <div style='color:#aaa;font-size:0.75rem;'>Politeia · Senior</div>
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

    st.markdown("**— MIS CLIENTES —**")
    for cliente in CLIENTES:
        es_activo = cliente["nombre"] == st.session_state["ws_cliente_activo"]
        alerta_badge = f"🔴 {cliente['alertas']}" if cliente["alertas"] > 0 else "✅"
        border_col = "#4ecdc4" if es_activo else "#333"
        bg_col = "#0d1117" if es_activo else "#0a0f1a"

        if st.button(
            f"{'●' if es_activo else '○'} {cliente['nombre']}",
            key=f"btn_cliente_{cliente['nombre']}",
            use_container_width=True,
            type="primary" if es_activo else "secondary",
        ):
            st.session_state["ws_cliente_activo"] = cliente["nombre"]
            st.rerun()

        st.markdown(
            f"<div style='font-size:0.72rem;color:#aaa;margin:-6px 0 4px 10px;'>"
            f"{cliente['tipo']} · {alerta_badge}</div>",
            unsafe_allow_html=True,
        )

    st.markdown("")
    if st.button("+ Nuevo cliente", use_container_width=True, key="btn_nuevo_cliente"):
        st.toast("Función disponible próximamente", icon="🚧")

    st.markdown("---")
    st.markdown("**— HERRAMIENTAS —**")
    herramientas = [
        ("🔲", "Investigation Canvas"),
        ("✏️", "Draft Studio"),
        ("📓", "Intelligence Notebook"),
        ("📅", "Calendario Político"),
    ]
    if "ws_tool" not in st.session_state:
        st.session_state["ws_tool"] = "Investigation Canvas"

    for icono, nombre in herramientas:
        is_active = st.session_state["ws_tool"] == nombre
        if st.button(
            f"{icono} {nombre}",
            key=f"btn_tool_{nombre}",
            use_container_width=True,
            type="primary" if is_active else "secondary",
        ):
            st.session_state["ws_tool"] = nombre
            st.rerun()

    st.markdown("---")
    st.markdown("**— EQUIPO —**")
    equipo = [
        ("🟢", "Carlos López", "online",  "PP canvas"),
        ("🟡", "Marta Ruiz",   "ausente", "—"),
        ("⚫", "Diego Fernández","offline","—"),
    ]
    for dot, nombre, estado, tarea in equipo:
        st.markdown(
            f"<div style='font-size:0.8rem;margin:3px 0;'>"
            f"{dot} <span style='color:#ccc;'>{nombre}</span> "
            f"<span style='color:#555;'>({estado})</span></div>",
            unsafe_allow_html=True,
        )

    st.markdown("---")
    st.markdown("**— ACTIVIDAD RECIENTE —**")
    for act in ACTIVIDAD_RECIENTE[:4]:
        st.markdown(
            f"<div style='font-size:0.78rem;margin:3px 0;'>"
            f"{act['icono']} <span style='color:#ccc;'>{act['texto']}</span><br>"
            f"<span style='color:#555;margin-left:1rem;'>{act['tiempo']}</span></div>",
            unsafe_allow_html=True,
        )


# ══════════════════════════════════════════════════════════════════════════════
# ZONA DE TRABAJO ACTIVA — Herramienta seleccionada
# ══════════════════════════════════════════════════════════════════════════════
with main_zone:
    cliente_activo = st.session_state["ws_cliente_activo"]
    herramienta = st.session_state["ws_tool"]

    cliente_info = next((c for c in CLIENTES if c["nombre"] == cliente_activo), CLIENTES[0])

    st.markdown(
        f"<div style='background:#0d1117;border:1px solid #1e2d40;border-radius:8px;"
        f"padding:0.6rem 1rem;margin-bottom:0.75rem;display:flex;"
        f"justify-content:space-between;align-items:center;'>"
        f"<span style='color:#4ecdc4;font-weight:700;'>{cliente_activo}</span>"
        f"<span style='color:#aaa;font-size:0.82rem;'>{cliente_info['tipo']}</span>"
        f"<span style='color:#aaa;font-size:0.82rem;'>{herramienta}</span></div>",
        unsafe_allow_html=True,
    )

    # ── Investigation Canvas ────────────────────────────────────────────────
    if herramienta == "Investigation Canvas":
        st.markdown("### 🔲 Investigation Canvas")
        st.markdown(
            "<p style='color:#aaa;font-size:0.88rem;'>Lienzo de investigación visual. "
            "Conecta actores, eventos y documentos en un mapa de relaciones.</p>",
            unsafe_allow_html=True,
        )

        # Canvas interactivo con pyvis o plotly network
        try:
            from pyvis.network import Network as PyvisNet
            _PYVIS = True
        except ImportError:
            _PYVIS = False

        canvas_nodes = [
            ("Pedro Sánchez", "person", "#e94560"),
            ("PSOE", "partido", "#e94560"),
            ("Junts", "partido", "#f7971e"),
            ("Carles Puigdemont", "person", "#f7971e"),
            ("Ley de Amnistía", "evento", "#4ecdc4"),
            ("Presupuestos 2026", "evento", "#45b7d1"),
            ("Alberto Núñez Feijóo", "person", "#3498db"),
            ("PP", "partido", "#3498db"),
            (cliente_activo, "cliente", "#4ecdc4"),
            ("BOE 342/2026", "documento", "#aaa"),
        ]
        canvas_edges = [
            ("Pedro Sánchez", "PSOE", "lidera"),
            ("PSOE", "Ley de Amnistía", "impulsa"),
            ("PSOE", "Presupuestos 2026", "negocia"),
            ("Junts", "Ley de Amnistía", "condición"),
            ("Junts", "Presupuestos 2026", "bloquea"),
            ("Carles Puigdemont", "Junts", "dirige"),
            ("Presupuestos 2026", "BOE 342/2026", "genera"),
            (cliente_activo, "Presupuestos 2026", "afecta"),
            ("Alberto Núñez Feijóo", "PP", "lidera"),
            ("PP", "Presupuestos 2026", "rechaza"),
        ]

        if _PYVIS:
            net = PyvisNet(
                height="480px", width="100%",
                bgcolor="#0d1117", font_color="#ccc",
                directed=True,
            )
            net.set_options(json.dumps({
                "physics": {"stabilization": {"iterations": 100}},
                "edges": {"arrows": {"to": {"enabled": True, "scaleFactor": 0.8}},
                          "color": {"color": "#555"}, "font": {"color": "#aaa", "size": 10}},
                "nodes": {"font": {"size": 13}},
            }))
            color_map_type = {
                "person": "#e94560", "partido": "#f7971e",
                "evento": "#4ecdc4", "documento": "#aaa", "cliente": "#45b7d1",
            }
            for label, ntype, color in canvas_nodes:
                shape = "dot" if ntype == "person" else "box" if ntype == "partido" else "diamond"
                net.add_node(label, label=label, color=color, shape=shape, size=20)
            for src, dst, rel in canvas_edges:
                net.add_edge(src, dst, title=rel, label=rel)

            net_html = net.generate_html()
            components.html(net_html, height=500, scrolling=False)

        else:
            # Fallback: Plotly scatter network
            import math
            n_nodes = len(canvas_nodes)
            angles = [2 * math.pi * i / n_nodes for i in range(n_nodes)]
            pos = {node[0]: (math.cos(a) * 2, math.sin(a) * 2) for node, a in zip(canvas_nodes, angles)}

            edge_x, edge_y = [], []
            for src, dst, _ in canvas_edges:
                x0, y0 = pos[src]
                x1, y1 = pos[dst]
                edge_x += [x0, x1, None]
                edge_y += [y0, y1, None]

            fig_canvas = go.Figure()
            fig_canvas.add_trace(go.Scatter(
                x=edge_x, y=edge_y, mode="lines",
                line=dict(color="#333", width=1), hoverinfo="none",
            ))
            for label, ntype, color in canvas_nodes:
                x, y = pos[label]
                fig_canvas.add_trace(go.Scatter(
                    x=[x], y=[y], mode="markers+text",
                    marker=dict(size=20, color=color),
                    text=[label], textposition="top center",
                    textfont=dict(color="#ccc", size=10),
                    hoverinfo="text", hovertext=f"{label} ({ntype})",
                    showlegend=False,
                ))
            fig_canvas.update_layout(
                height=480, paper_bgcolor="#0d1117", plot_bgcolor="#0d1117",
                showlegend=False,
                xaxis=dict(visible=False), yaxis=dict(visible=False),
                margin=dict(l=20, r=20, t=30, b=20),
                title=dict(text=f"Canvas — {cliente_activo}", font_color="#ccc"),
            )
            st.plotly_chart(fig_canvas, use_container_width=True)

        # Barra de acciones del canvas
        ac1, ac2, ac3, ac4, ac5 = st.columns(5)
        if ac1.button("➕ Nodo", use_container_width=True, key="canvas_add_node"):
            st.toast("Añadir nodo al canvas", icon="➕")
        if ac2.button("🔗 Relación", use_container_width=True, key="canvas_add_edge"):
            st.toast("Conectar nodos", icon="🔗")
        if ac3.button("📝 Nota", use_container_width=True, key="canvas_add_note"):
            st.toast("Añadir nota al canvas", icon="📝")
        if ac4.button("💾 Guardar", use_container_width=True, key="canvas_save"):
            st.toast(f"Canvas guardado — {cliente_activo}", icon="✅")
        if ac5.button("🖨️ Exportar", use_container_width=True, key="canvas_export"):
            st.toast("Exportando PNG…", icon="🖨️")

    # ── Draft Studio ────────────────────────────────────────────────────────
    elif herramienta == "Draft Studio":
        st.markdown("### ✏️ Draft Studio")

        draft_col1, draft_col2 = st.columns([2, 1])

        with draft_col1:
            # Metadata bar
            dm1, dm2, dm3 = st.columns(3)
            tipo_doc = dm1.selectbox(
                "Tipo",
                ["Briefing ejecutivo", "Nota de prensa", "Posición política", "Análisis de riesgo", "Informe estratégico"],
                key="draft_tipo",
            )
            draft_cliente = dm2.selectbox(
                "Cliente",
                [c["nombre"] for c in CLIENTES],
                index=[c["nombre"] for c in CLIENTES].index(cliente_activo),
                key="draft_cliente",
            )
            version_draft = dm3.selectbox("Versión", ["v1", "v2", "v3", "v4 (actual)"], index=3, key="draft_ver")

            titulo_doc = st.text_input(
                "Título del documento",
                value=f"{tipo_doc} — {draft_cliente} — {datetime.now().strftime('%d/%m/%Y')}",
                key="draft_titulo",
            )

            # Rich text area con markdown
            st.markdown("**Contenido:**")
            if not st.session_state["ws_borrador"]:
                st.session_state["ws_borrador"] = (
                    f"# {titulo_doc}\n\n"
                    f"**Cliente:** {draft_cliente}  \n"
                    f"**Fecha:** {datetime.now().strftime('%d de %B de %Y')}  \n"
                    f"**Confidencialidad:** RESTRINGIDO  \n\n"
                    f"---\n\n"
                    f"## Resumen ejecutivo\n\n"
                    f"_Introduce aquí el resumen ejecutivo del documento..._\n\n"
                    f"## Análisis\n\n"
                    f"_Desarrolla el análisis detallado..._\n\n"
                    f"## Conclusiones y recomendaciones\n\n"
                    f"_Lista las recomendaciones estratégicas..._\n"
                )

            borrador = st.text_area(
                "Editor Markdown",
                value=st.session_state["ws_borrador"],
                height=380,
                key="draft_contenido",
            )
            st.session_state["ws_borrador"] = borrador

            # Action bar
            ba1, ba2, ba3, ba4 = st.columns(4)
            if ba1.button("🤖 IA Asistente", use_container_width=True, key="draft_ia"):
                if _LLM_OK:
                    with st.spinner("Generando contenido..."):
                        prompt_draft = (
                            f"Completa este {tipo_doc.lower()} para {draft_cliente} "
                            f"con contenido relevante sobre política española y análisis estratégico. "
                            f"Título: '{titulo_doc}'. Genera el resumen ejecutivo (100 palabras) y 3 conclusiones. "
                            "Formato Markdown."
                        )
                        resp_draft = llm_chat(
                            prompt_draft,
                            sistema="Eres un consultor político senior especializado en redacción de informes estratégicos en España.",
                        )
                        st.session_state["ws_borrador"] = resp_draft
                        st.rerun()
                else:
                    st.info("Conecta Ollama para usar el asistente IA de redacción.")
            if ba2.button("💾 Guardar", use_container_width=True, key="draft_save"):
                st.toast(f"Guardado: {titulo_doc}", icon="✅")
            if ba3.button("📤 Exportar PDF", use_container_width=True, key="draft_pdf"):
                st.toast("Exportando a PDF…", icon="📄")
            if ba4.button("👥 Compartir", use_container_width=True, key="draft_share"):
                st.toast("Enlace de compartir copiado", icon="🔗")

        with draft_col2:
            st.markdown("**Vista previa:**")
            preview_text = borrador if borrador else "_Sin contenido_"
            st.markdown(
                f"<div style='background:#0d1117;border:1px solid #1e2d40;border-radius:8px;"
                f"padding:1rem;height:460px;overflow-y:auto;font-size:0.85rem;color:#ccc;"
                f"line-height:1.6;'>{preview_text[:2000]}</div>",
                unsafe_allow_html=True,
            )

            st.markdown("**Versiones:**")
            for v in ["v1 (borrador inicial)", "v2 (revisión interna)", "v3 (revisado cliente)", "v4 (actual)"]:
                st.markdown(
                    f"<div style='font-size:0.8rem;color:#aaa;padding:2px 0;'>📄 {v}</div>",
                    unsafe_allow_html=True,
                )

    # ── Intelligence Notebook ──────────────────────────────────────────────
    elif herramienta == "Intelligence Notebook":
        st.markdown("### 📓 Intelligence Notebook")
        st.markdown(
            "<p style='color:#aaa;font-size:0.88rem;'>Notas de inteligencia indexadas semánticamente. "
            "Búsqueda vectorial sobre tu conocimiento acumulado.</p>",
            unsafe_allow_html=True,
        )

        nb_col1, nb_col2 = st.columns([1.5, 1])

        with nb_col1:
            # Search bar
            query_nb = st.text_input(
                "🔍 Búsqueda semántica en notas",
                placeholder="Busca conceptos, actores, eventos…",
                key="nb_search",
            )

            if query_nb:
                st.markdown(f"**Resultados para:** _\"{query_nb}\"_")
                notas_filtradas = [n for n in NOTAS_DEMO if any(
                    query_nb.lower() in (n["titulo"] + " " + n["texto"] + " " + " ".join(n["tags"])).lower()
                    for _ in [1]
                )]
                if not notas_filtradas:
                    notas_filtradas = NOTAS_DEMO[:2]
            else:
                notas_filtradas = NOTAS_DEMO

            for nota in notas_filtradas:
                with st.expander(f"📌 {nota['titulo']} — {nota['fecha']}", expanded=True):
                    st.markdown(nota["texto"])
                    tags_html = " ".join(
                        f"<span style='background:#1e2d40;color:#4ecdc4;padding:2px 6px;"
                        f"border-radius:4px;font-size:0.75rem;margin:2px;'>{t}</span>"
                        for t in nota["tags"]
                    )
                    st.markdown(tags_html, unsafe_allow_html=True)
                    if _LLM_OK:
                        if st.button(f"🤖 Ampliar con IA", key=f"nb_ampliar_{nota['id']}"):
                            with st.spinner("Ampliando nota..."):
                                resp_nb = llm_chat(
                                    f"Amplía este análisis de inteligencia política: '{nota['titulo']}'. "
                                    f"Contexto: {nota['texto']}. "
                                    "Añade 2-3 puntos adicionales relevantes para España 2026. Sé conciso.",
                                    sistema="Eres un analista de inteligencia política.",
                                )
                                st.markdown(
                                    f"<div style='background:#0d1117;border-left:3px solid #4ecdc4;"
                                    f"padding:0.75rem;margin-top:0.5rem;color:#ccc;font-size:0.85rem;'>"
                                    f"{resp_nb}</div>",
                                    unsafe_allow_html=True,
                                )

            st.markdown("---")
            st.markdown("**➕ Nueva nota de inteligencia**")
            new_titulo = st.text_input("Título", key="nb_new_titulo")
            new_texto = st.text_area("Contenido", height=100, key="nb_new_texto")
            new_tags = st.text_input("Tags (separados por coma)", key="nb_new_tags")
            if st.button("Guardar nota", type="primary", key="nb_save"):
                if new_titulo and new_texto:
                    tags = [t.strip() for t in new_tags.split(",") if t.strip()]
                    nueva = {
                        "id": str(uuid.uuid4())[:8],
                        "titulo": new_titulo,
                        "texto": new_texto,
                        "tags": tags,
                        "fecha": "ahora",
                    }
                    NOTAS_DEMO.insert(0, nueva)
                    st.toast("Nota guardada e indexada", icon="✅")
                    st.rerun()

        with nb_col2:
            st.markdown("**📊 Mapa de conocimiento**")
            all_tags = []
            for nota in NOTAS_DEMO:
                all_tags.extend(nota["tags"])
            tag_counts = pd.Series(all_tags).value_counts()

            if len(tag_counts) > 0:
                fig_tags = px.bar(
                    x=tag_counts.values,
                    y=tag_counts.index,
                    orientation="h",
                    color=tag_counts.values,
                    color_continuous_scale="Tealgrn",
                    title="Tags más frecuentes",
                )
                fig_tags.update_layout(
                    height=280, paper_bgcolor="#0d1117", plot_bgcolor="#0d1117",
                    font_color="#ccc", showlegend=False, coloraxis_showscale=False,
                    margin=dict(l=80, r=20, t=40, b=30),
                )
                st.plotly_chart(fig_tags, use_container_width=True)

            st.markdown("---")
            st.markdown("**📈 Actividad del notebook**")
            dias_nb = pd.date_range(end=datetime.now(), periods=14)
            notas_dia = rng.integers(0, 5, 14)
            fig_nb = go.Figure(go.Bar(
                x=dias_nb, y=notas_dia,
                marker_color="#4ecdc4",
                opacity=0.8,
            ))
            fig_nb.update_layout(
                height=160, paper_bgcolor="#0d1117", plot_bgcolor="#0d1117",
                font_color="#ccc", margin=dict(l=30, r=10, t=20, b=40),
                showlegend=False,
            )
            st.plotly_chart(fig_nb, use_container_width=True)

            st.markdown("---")
            st.markdown("**🔗 Fuentes vinculadas**")
            fuentes = [
                ("📰", "El País — Política"),
                ("📄", "BOE — BOE-A-2026-342"),
                ("📊", "CIS — Barómetro Marzo 2026"),
                ("🌐", "Congreso — Orden del día"),
            ]
            for ico, fuente in fuentes:
                st.markdown(
                    f"<div style='font-size:0.82rem;color:#aaa;padding:2px 0;'>{ico} {fuente}</div>",
                    unsafe_allow_html=True,
                )

    # ── Calendario Político ────────────────────────────────────────────────
    elif herramienta == "Calendario Político":
        st.markdown("### 📅 Calendario Político")

        cal_col1, cal_col2 = st.columns([2, 1])

        with cal_col1:
            # Timeline view
            st.markdown("**Próximos 14 días**")

            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            for evt in sorted(EVENTOS_CALENDARIO, key=lambda e: e["fecha"]):
                dias_para = (evt["fecha"].date() - today.date()).days
                if dias_para < 0:
                    continue

                tipo_color = {
                    "reunion": "#4ecdc4",
                    "deadline": "#e94560",
                    "institucional": "#45b7d1",
                    "electoral": "#f7971e",
                }.get(evt["tipo"], "#aaa")

                tipo_icon = {
                    "reunion": "🤝",
                    "deadline": "⏰",
                    "institucional": "🏛️",
                    "electoral": "🗳️",
                }.get(evt["tipo"], "📅")

                if dias_para == 0:
                    dias_txt = "HOY"
                elif dias_para == 1:
                    dias_txt = "MAÑANA"
                else:
                    dias_txt = f"En {dias_para}d"

                cliente_badge = (
                    f"<span style='background:#1e2d40;color:#4ecdc4;padding:1px 5px;"
                    f"border-radius:3px;font-size:0.72rem;margin-left:0.5rem;'>{evt['cliente']}</span>"
                    if evt.get("cliente") else ""
                )

                st.markdown(
                    f"<div style='background:#0d1117;border-left:3px solid {tipo_color};"
                    f"border-radius:0 8px 8px 0;padding:0.5rem 0.75rem;margin:4px 0;"
                    f"display:flex;justify-content:space-between;align-items:center;'>"
                    f"<div>"
                    f"<span style='font-size:1rem;'>{tipo_icon}</span> "
                    f"<span style='color:#fff;font-size:0.88rem;'>{evt['evento']}</span>"
                    f"{cliente_badge}"
                    f"<br><span style='color:#555;font-size:0.75rem;margin-left:1.5rem;'>"
                    f"{evt['fecha'].strftime('%A %d/%m — %H:%M')}</span></div>"
                    f"<span style='color:{tipo_color};font-weight:700;font-size:0.8rem;"
                    f"white-space:nowrap;'>{dias_txt}</span></div>",
                    unsafe_allow_html=True,
                )

        with cal_col2:
            st.markdown("**➕ Añadir evento**")
            evt_titulo = st.text_input("Título del evento", key="cal_evt_titulo")
            evt_fecha = st.date_input("Fecha", key="cal_evt_fecha")
            evt_hora = st.time_input("Hora", key="cal_evt_hora")
            evt_tipo = st.selectbox("Tipo", ["reunion", "deadline", "institucional", "electoral"], key="cal_evt_tipo")
            evt_cliente_sel = st.selectbox(
                "Cliente vinculado",
                ["(Ninguno)"] + [c["nombre"] for c in CLIENTES],
                key="cal_evt_cliente",
            )

            if st.button("➕ Añadir al calendario", type="primary", use_container_width=True, key="btn_add_cal"):
                if evt_titulo:
                    nueva_fecha = datetime.combine(evt_fecha, evt_hora)
                    EVENTOS_CALENDARIO.append({
                        "fecha": nueva_fecha,
                        "evento": evt_titulo,
                        "tipo": evt_tipo,
                        "cliente": evt_cliente_sel if evt_cliente_sel != "(Ninguno)" else None,
                    })
                    st.toast(f"Evento '{evt_titulo}' añadido", icon="✅")
                    st.rerun()

            st.markdown("---")
            st.markdown("**📊 Resumen del mes**")
            resumen_tipos = {
                "Reuniones": sum(1 for e in EVENTOS_CALENDARIO if e["tipo"] == "reunion"),
                "Deadlines": sum(1 for e in EVENTOS_CALENDARIO if e["tipo"] == "deadline"),
                "Institucional": sum(1 for e in EVENTOS_CALENDARIO if e["tipo"] == "institucional"),
                "Electoral": sum(1 for e in EVENTOS_CALENDARIO if e["tipo"] == "electoral"),
            }
            fig_res = go.Figure(go.Bar(
                x=list(resumen_tipos.values()),
                y=list(resumen_tipos.keys()),
                orientation="h",
                marker_color=["#4ecdc4", "#e94560", "#45b7d1", "#f7971e"],
            ))
            fig_res.update_layout(
                height=200, paper_bgcolor="#0d1117", plot_bgcolor="#0d1117",
                font_color="#ccc", margin=dict(l=80, r=20, t=20, b=30),
                showlegend=False,
            )
            st.plotly_chart(fig_res, use_container_width=True)


# ══════════════════════════════════════════════════════════════════════════════
# PANEL DERECHO — Contextual panel
# ══════════════════════════════════════════════════════════════════════════════
with panel_right:
    st.markdown("**Panel contextual**")

    cliente_info = next((c for c in CLIENTES if c["nombre"] == cliente_activo), CLIENTES[0])

    # Alertas del cliente
    if cliente_info["alertas"] > 0:
        st.markdown(
            f"<div style='background:#1a0a0a;border:1px solid #e94560;border-radius:8px;"
            f"padding:0.6rem;margin-bottom:0.5rem;'>"
            f"<p style='color:#e94560;font-weight:700;margin:0 0 0.3rem;font-size:0.85rem;'>"
            f"🔴 {cliente_info['alertas']} ALERTAS ACTIVAS</p>"
            f"<p style='color:#aaa;font-size:0.78rem;margin:0;'>{cliente_info['tipo']}</p></div>",
            unsafe_allow_html=True,
        )

    if cliente_info.get("proxima"):
        st.markdown(
            f"<div style='background:#0a1a0a;border:1px solid #4ecdc4;border-radius:8px;"
            f"padding:0.6rem;margin-bottom:0.5rem;'>"
            f"<p style='color:#4ecdc4;font-weight:700;margin:0 0 0.3rem;font-size:0.8rem;'>📅 PRÓXIMO</p>"
            f"<p style='color:#ccc;font-size:0.82rem;margin:0;'>{cliente_info['proxima']}</p></div>",
            unsafe_allow_html=True,
        )

    st.markdown("---")
    st.markdown("**📡 Feed de noticias**")
    feed_items = [
        ("El País", "Sánchez convoca reunión de urgencia sobre presupuestos", "hace 12min"),
        ("El Mundo", "PP rechaza condiciones de Junts para PGE 2026", "hace 34min"),
        ("Expansión", "Iberdrola presenta nueva hoja de ruta de renovables", "hace 1h"),
        ("La Vanguardia", "Puigdemont mantiene posición sobre amnistía fiscal", "hace 2h"),
        ("El Confidencial", "Feijóo acusa al Gobierno de usar vía de urgencia", "hace 3h"),
    ]
    for medio, titular, tiempo in feed_items:
        rel_cliente = cliente_activo.split(" ")[0].lower() in titular.lower()
        border = "#4ecdc4" if rel_cliente else "#1e2d40"
        st.markdown(
            f"<div style='border-left:2px solid {border};padding:0.3rem 0.5rem;margin:3px 0;'>"
            f"<p style='color:#aaa;font-size:0.7rem;margin:0;'>{medio} · {tiempo}</p>"
            f"<p style='color:#ccc;font-size:0.78rem;margin:0;'>{titular}</p></div>",
            unsafe_allow_html=True,
        )

    st.markdown("---")
    st.markdown("**🤖 Asistente rápido**")
    q_rapida = st.text_input(
        "Pregunta rápida",
        placeholder="¿Qué debo saber hoy?",
        key="ctx_q",
        label_visibility="collapsed",
    )
    if st.button("Preguntar", use_container_width=True, key="btn_ctx_q"):
        if q_rapida:
            if _LLM_OK:
                with st.spinner("..."):
                    resp_ctx = llm_chat(
                        f"Analista político. Cliente activo: {cliente_activo}. "
                        f"Pregunta: '{q_rapida}'. Respuesta concisa (2-3 frases).",
                        sistema="Eres un asistente de inteligencia política.",
                    )
                    st.markdown(
                        f"<div style='background:#0d1117;border-radius:6px;padding:0.5rem;"
                        f"color:#ccc;font-size:0.82rem;'>{resp_ctx}</div>",
                        unsafe_allow_html=True,
                    )
            else:
                st.markdown(
                    f"<div style='background:#0d1117;border-radius:6px;padding:0.5rem;"
                    f"color:#aaa;font-size:0.82rem;'>"
                    f"Conecta Ollama para respuestas IA. Consulta manual: revisa los módulos "
                    f"D3 Termómetro, D6 Alertas y D4 Legislativo para el contexto de hoy.</div>",
                    unsafe_allow_html=True,
                )

    st.markdown("---")
    st.markdown("**⚡ Acciones rápidas**")
    if st.button("📝 Nuevo borrador", use_container_width=True, key="q_borrador"):
        st.session_state["ws_tool"] = "Draft Studio"
        st.session_state["ws_borrador"] = ""
        st.rerun()
    if st.button("🔲 Nuevo canvas", use_container_width=True, key="q_canvas"):
        st.session_state["ws_tool"] = "Investigation Canvas"
        st.rerun()
    if st.button("📌 Nueva nota", use_container_width=True, key="q_nota"):
        st.session_state["ws_tool"] = "Intelligence Notebook"
        st.rerun()
    if st.button("📊 Ver alertas", use_container_width=True, key="q_alertas"):
        st.switch_page("pages/D6_Alertas.py")
