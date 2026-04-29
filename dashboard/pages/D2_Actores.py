"""
ELECTSIM — Mapa de Actores (v2 — Motor Dinámico)
=================================================
Red de actores políticos, empresariales, mediáticos y de influencia.
Grafo force-directed (pyvis) con datos reales de actors_service,
métricas networkx, scraping Wikipedia/Wikidata, NER via Ollama,
y pipeline de actualización automática en background.

Inspirado en:
  • Osintgraph (Neo4j + LLM OSINT agent)
  • NER-for-News-Headlines (NER en titulares)
  • news-briefing-generator (clustering + Ollama)
  • congreso-scrapper (modelo de datos parlamentarios)
"""
from __future__ import annotations

import json
import sys
import time
from collections import Counter
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED, section_header, kpi_card,
)

st.set_page_config(
    page_title="Mapa de Actores — Politeia",
    page_icon="🕸️",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()
mostrar_alertas_pagina("D2_Actores")

# ── Servicios ─────────────────────────────────────────────────────────────────
try:
    from dashboard.services import actors_service as _svc
    _SVC_OK = True
except Exception as _e:
    _SVC_OK = False
    st.error(f"❌ actors_service no disponible: {_e}")
    st.stop()

try:
    from dashboard.services import actors_scraper as _scraper
    _SCRAPER_OK = True
except Exception:
    _SCRAPER_OK = False

try:
    from dashboard.services import llm_local as _llm
    _LLM_OK = _llm.esta_disponible()
except Exception:
    _LLM_OK = False

try:
    from pyvis.network import Network as _PyvisNetwork
    _PYVIS_OK = True
except ImportError:
    _PYVIS_OK = False

# ── Paleta por tipo ───────────────────────────────────────────────────────────
_COLOR_TIPO = {
    "politico":    CYAN,
    "empresarial": AMBER,
    "mediatico":   GREEN,
    "influencia":  PURPLE,
}
_ICON_TIPO = {
    "politico":    "🏛️",
    "empresarial": "🏢",
    "mediatico":   "📰",
    "influencia":  "🔮",
}
_COLOR_REL = {
    "gubernamental": "#1E40AF",
    "adversarial":   RED,
    "mediatico":     AMBER,
    "empresarial":   GREEN,
    "lobby":         PURPLE,
    "alianza":       CYAN,
    "sindical":      "#F472B6",
    "rss":           "#94A3B8",
}
# Colores de comunidad
_COMM_COLORS = [CYAN, AMBER, GREEN, PURPLE, RED, "#F97316", "#06B6D4", "#84CC16"]

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
[data-testid="stAppViewContainer"] {{background:{BG};}}
.actor-card {{
  background:linear-gradient(135deg,{BG2},{BG3});
  border:1px solid {BORDER}; border-radius:14px;
  padding:1.1rem 1.4rem; margin-bottom:.7rem;
}}
.actor-name  {{font-size:1rem; font-weight:900; color:{TEXT}; margin-bottom:.15rem;}}
.actor-role  {{font-size:.73rem; color:{TEXT2}; margin-bottom:.3rem;}}
.tag {{
  display:inline-block; font-size:.58rem; font-weight:800;
  letter-spacing:.07em; text-transform:uppercase;
  border-radius:5px; padding:2px 7px; margin-right:.3rem;
}}
.conn-item {{
  background:{BG2}; border:1px solid {BORDER};
  border-radius:8px; padding:.5rem .8rem; margin-bottom:.3rem;
  display:flex; align-items:center; justify-content:space-between;
  font-size:.77rem;
}}
.metric-box {{
  background:{BG2}; border:1px solid {BORDER};
  border-top:2px solid {PURPLE};
  border-radius:10px; padding:.7rem .9rem; text-align:center;
}}
.metric-val {{font-size:1.3rem; font-weight:900; color:{CYAN};}}
.metric-lbl {{font-size:.68rem; color:{MUTED}; margin-top:.1rem;}}
.log-row {{
  font-family:monospace; font-size:.72rem; color:{TEXT2};
  border-bottom:1px solid {BORDER}; padding:.25rem 0;
}}
.log-ok  {{color:{GREEN};}} .log-err {{color:{RED};}}
.wiki-box {{
  background:linear-gradient(135deg,{CYAN}09,{BG2});
  border:1px solid {CYAN}33; border-radius:10px;
  padding:.8rem 1rem; font-size:.82rem; color:{TEXT}; line-height:1.65;
  margin-bottom:.6rem;
}}
.ner-chip {{
  display:inline-block; font-size:.68rem; font-weight:700;
  border-radius:6px; padding:2px 8px; margin:2px;
}}
.chat-msg {{
  background:linear-gradient(135deg,{CYAN}08,{BG2});
  border:1px solid {CYAN}33; border-radius:12px;
  padding:.9rem 1.1rem; margin-bottom:.5rem;
  font-size:.84rem; color:{TEXT}; line-height:1.6;
}}
</style>
""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _color_tipo(tipo: str) -> str:
    return _COLOR_TIPO.get(tipo, CYAN)

def _icon_tipo(tipo: str) -> str:
    return _ICON_TIPO.get(tipo, "•")

def _actor_badge(tipo: str) -> str:
    c = _color_tipo(tipo)
    return (f'<span class="tag" style="background:{c}22;color:{c};">'
            f'{_icon_tipo(tipo)} {tipo}</span>')

def _rel_badge(tipo: str) -> str:
    c = _COLOR_REL.get(tipo, MUTED)
    return f'<span class="tag" style="background:{c}22;color:{c};">{tipo}</span>'

def _node_color(actor: dict, comm: dict) -> str:
    cid = comm.get(actor["id"])
    if cid is not None:
        return _COMM_COLORS[int(cid) % len(_COMM_COLORS)]
    return _color_tipo(actor.get("tipo", ""))

@st.cache_data(ttl=120, show_spinner=False)
def _load_metricas() -> dict:
    return _svc.calcular_metricas()


# ═══════════════════════════════════════════════════════════════════════════════
# HEADER + KPIs
# ═══════════════════════════════════════════════════════════════════════════════

st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem;">
  <div style="font-size:2.2rem;">🕸️</div>
  <div>
    <div style="font-size:1.5rem;font-weight:900;color:{TEXT};">Mapa de Actores Políticos</div>
    <div style="font-size:.8rem;color:{MUTED};">
      Red dinámica · Scraping Wikipedia/Wikidata · NER vía Ollama · Actualización automática · {
        "🟢 LLM activo" if _LLM_OK else "⚪ LLM no disponible"
      }
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

_estado_w = _svc.estado_worker_actores()
_metricas = _load_metricas()

c1, c2, c3, c4, c5 = st.columns(5)
with c1:
    kpi_card("Actores", str(_estado_w.get("n_actores", 0)), "🏛️", color=CYAN)
with c2:
    kpi_card("Relaciones", str(_estado_w.get("n_relaciones", 0)), "🔗", color=PURPLE)
with c3:
    kpi_card("Menciones", str(_estado_w.get("n_menciones", 0)), "📰", color=AMBER)
with c4:
    kpi_card("Comunidades", str(_metricas.get("n_comunidades", 0)), "🫧", color=GREEN)
with c5:
    w_on = _estado_w.get("running", False)
    kpi_card("Worker", "🟢 Activo" if w_on else "⏸ Parado", "⚡", color=GREEN if w_on else MUTED)

st.markdown("---")


# ═══════════════════════════════════════════════════════════════════════════════
# TABS PRINCIPALES
# ═══════════════════════════════════════════════════════════════════════════════

tab_red, tab_perfil, tab_rels, tab_analisis, tab_update, tab_query = st.tabs([
    "🕸️ Red Dinámica",
    "👤 Perfiles",
    "🔗 Relaciones",
    "📊 Análisis networkx",
    "🔄 Actualización",
    "🤖 Query IA",
])


# ─────────────────────────────────────────────────────────────────────────────
# TAB 1 — RED DINÁMICA
# ─────────────────────────────────────────────────────────────────────────────

with tab_red:
    st.markdown("### 🕸️ Grafo Force-Directed")
    st.caption("Tamaño = PageRank · Color = comunidad Louvain · Arista = tipo de relación")

    fc1, fc2, fc3, fc4 = st.columns([2, 2, 2, 1])
    with fc1:
        tipo_sel = st.selectbox(
            "Tipo actor", ["Todos", "politico", "empresarial", "mediatico", "influencia"],
            key="red_tipo"
        )
    with fc2:
        rel_sel = st.selectbox(
            "Tipo relación", ["Todas"] + list(_COLOR_REL.keys()),
            key="red_rel"
        )
    with fc3:
        _actores_todos = _svc.get_actores()
        opciones_actor = ["(Todo el grafo)"] + [
            a["nombre"] for a in sorted(_actores_todos, key=lambda x: -x.get("poder", 0))
        ]
        actor_ego_nombre = st.selectbox("Foco en actor (red ego)", opciones_actor, key="red_ego")
    with fc4:
        mostrar_labels = st.checkbox("Nombres", value=True, key="red_labels")

    _t_f = None if tipo_sel == "Todos" else tipo_sel
    _r_f = None if rel_sel  == "Todas" else rel_sel
    _comm = _metricas.get("comunidades", {})
    _pgr  = _metricas.get("pagerank", {})
    _max_pgr = max(_pgr.values()) if _pgr else 1.0

    # Red ego o grafo completo
    if actor_ego_nombre != "(Todo el grafo)":
        actor_ego_obj = next((a for a in _actores_todos if a["nombre"] == actor_ego_nombre), None)
        if actor_ego_obj:
            actores_g, relaciones_g = _svc.egocentric_network(actor_ego_obj["id"], profundidad=1)
        else:
            actores_g = _svc.get_actores(tipo=_t_f)
            relaciones_g = _svc.get_relaciones(tipo=_r_f)
    else:
        actores_g = _svc.get_actores(tipo=_t_f)
        relaciones_g = _svc.get_relaciones(tipo=_r_f)

    if _r_f:
        relaciones_g = [r for r in relaciones_g if r.get("tipo") == _r_f]
    ids_grafo = {a["id"] for a in actores_g}
    relaciones_g = [r for r in relaciones_g
                    if r.get("from") in ids_grafo and r.get("to") in ids_grafo]

    if _PYVIS_OK and actores_g:
        net = _PyvisNetwork(
            height="580px", width="100%",
            bgcolor=BG, font_color=TEXT,
            directed=True,
        )
        net.set_options("""{
          "physics": {
            "enabled": true,
            "solver": "forceAtlas2Based",
            "forceAtlas2Based": {
              "gravitationalConstant": -60,
              "centralGravity": 0.005,
              "springLength": 100,
              "springConstant": 0.06,
              "damping": 0.4
            },
            "stabilization": {"iterations": 180}
          },
          "interaction": {
            "hover": true,
            "tooltipDelay": 150,
            "navigationButtons": true,
            "keyboard": true
          },
          "edges": {
            "smooth": {"type": "dynamic"},
            "arrows": {"to": {"enabled": true, "scaleFactor": 0.5}}
          },
          "nodes": {"shadow": true, "shape": "dot"}
        }""")

        for a in actores_g:
            pgr_v = _pgr.get(a["id"], 0.01)
            size  = 10 + int(pgr_v / _max_pgr * 35)
            color = _node_color(a, _comm)
            comm_id = _comm.get(a["id"])
            tooltip = (
                f"<b>{a.get('nombre','')}</b><br>"
                f"<i>{a.get('rol','')}</i><br>"
                f"Org: {a.get('org','')} | Región: {a.get('region','')}<br>"
                f"Poder: {a.get('poder',0)}/10 | PageRank: {pgr_v:.4f}<br>"
                f"Comunidad: {comm_id if comm_id is not None else 'n/a'}"
            )
            net.add_node(
                a["id"],
                label=a.get("nombre", a["id"]) if mostrar_labels else "",
                title=tooltip,
                color={"background": color, "border": color,
                       "highlight": {"background": "#FFFFFF", "border": color}},
                size=size,
            )

        for r in relaciones_g:
            col = _COLOR_REL.get(r.get("tipo", ""), MUTED)
            fuerza = float(r.get("fuerza", 1))
            net.add_edge(
                r["from"], r["to"],
                title=r.get("label", ""),
                color=col,
                width=max(0.5, fuerza * 0.4),
                label=r.get("tipo", "") if _r_f else "",
            )

        _html_path = _ROOT / "dashboard" / "data" / "actors_graph_vis.html"
        _html_path.parent.mkdir(parents=True, exist_ok=True)
        net.save_graph(str(_html_path))
        with open(_html_path, "r", encoding="utf-8") as f:
            _html_content = f.read()
        components.html(_html_content, height=590, scrolling=False)

        # Leyenda
        leg_cols = st.columns(len(_COLOR_TIPO) + 1)
        for i, (t, c) in enumerate(_COLOR_TIPO.items()):
            with leg_cols[i]:
                n = len([a for a in actores_g if a.get("tipo") == t])
                st.markdown(
                    f'<div style="font-size:.72rem;"><span style="color:{c};">●</span> {_icon_tipo(t)} {t} ({n})</div>',
                    unsafe_allow_html=True
                )
        with leg_cols[-1]:
            st.markdown(
                f'<div style="font-size:.72rem;color:{MUTED};">🫧 {_metricas.get("n_comunidades",0)} comunidades</div>',
                unsafe_allow_html=True
            )
    elif not _PYVIS_OK:
        st.warning("pyvis no disponible — instala `pyvis>=0.3.2`")
    else:
        st.info("Sin actores que mostrar con los filtros actuales")


# ─────────────────────────────────────────────────────────────────────────────
# TAB 2 — PERFILES
# ─────────────────────────────────────────────────────────────────────────────

with tab_perfil:
    st.markdown("### 👤 Perfiles de Actores")

    pc1, pc2 = st.columns([3, 1])
    with pc1:
        _todos = sorted(_svc.get_actores(), key=lambda x: -x.get("poder", 0))
        actor_nombre_p = st.selectbox("Seleccionar actor", [a["nombre"] for a in _todos], key="perfil_actor")
    with pc2:
        if _SCRAPER_OK and st.button("🌐 Enriquecer Wikipedia", key="btn_wiki"):
            actor_sel = next((a for a in _todos if a["nombre"] == actor_nombre_p), None)
            if actor_sel:
                with st.spinner(f"Scrapeando {actor_sel['nombre']}…"):
                    perfil_wiki = _scraper.wikipedia_perfil(
                        actor_sel["nombre"],
                        actor_sel.get("wikipedia_titulo", "")
                    )
                    if perfil_wiki:
                        actor_sel.update(perfil_wiki)
                        _svc.upsert_actor(actor_sel)
                        st.success("✅ Perfil enriquecido")
                        _load_metricas.clear()
                    else:
                        st.warning("No encontrado en Wikipedia")

    actor = next((a for a in _todos if a["nombre"] == actor_nombre_p), None)
    if not actor:
        st.info("Selecciona un actor")
        st.stop()

    # Layout foto + info
    col_foto, col_info = st.columns([1, 3])

    with col_foto:
        foto_url = actor.get("foto_url", "")
        if foto_url:
            st.image(foto_url, width=160)
        else:
            c_av = _color_tipo(actor.get("tipo", ""))
            st.markdown(f"""
            <div style="width:140px;height:140px;border-radius:50%;
                        background:{c_av}22;border:2px solid {c_av};
                        display:flex;align-items:center;justify-content:center;font-size:3rem;">
              {_icon_tipo(actor.get("tipo",""))}
            </div>""", unsafe_allow_html=True)

        m_a = _load_metricas()
        pgr_a = m_a.get("pagerank",{}).get(actor["id"],0)
        btw_a = m_a.get("betweenness",{}).get(actor["id"],0)
        deg_a = m_a.get("degree",{}).get(actor["id"],0)
        com_a = m_a.get("comunidades",{}).get(actor["id"])

        for val, lbl in [(f"{pgr_a:.4f}","PageRank"), (str(deg_a),"Conexiones"), (f"{btw_a:.4f}","Betweenness")]:
            st.markdown(
                f'<div class="metric-box" style="margin-top:.4rem;">'
                f'<div class="metric-val">{val}</div>'
                f'<div class="metric-lbl">{lbl}</div></div>',
                unsafe_allow_html=True
            )
        if com_a is not None:
            cc = _COMM_COLORS[int(com_a) % len(_COMM_COLORS)]
            st.markdown(
                f'<div class="metric-box" style="margin-top:.4rem;border-top-color:{cc};">'
                f'<div class="metric-val" style="color:{cc};">#{com_a}</div>'
                f'<div class="metric-lbl">Comunidad</div></div>',
                unsafe_allow_html=True
            )

    with col_info:
        c_t = _color_tipo(actor.get("tipo",""))
        st.markdown(f"""
        <div class="actor-card">
          <div class="actor-name">{actor.get("nombre","")}</div>
          <div class="actor-role">{actor.get("rol","")}</div>
          <div>
            {_actor_badge(actor.get("tipo",""))}
            <span class="tag" style="background:{BORDER};color:{TEXT2};">{actor.get("org","")}</span>
            <span class="tag" style="background:{BORDER};color:{TEXT2};">🗺️ {actor.get("region","")}</span>
            <span class="tag" style="background:{AMBER}22;color:{AMBER};">⚡ Poder {actor.get("poder",0)}/10</span>
          </div>
          {"<div style='margin-top:.4rem;font-size:.73rem;color:"+TEXT2+";'>🐦 "+actor.get("twitter","")+"</div>" if actor.get("twitter") else ""}
          {"<div style='margin-top:.3rem;font-size:.73rem;color:"+TEXT2+";'>"+actor.get("descripcion","")+"</div>" if actor.get("descripcion") else ""}
        </div>
        """, unsafe_allow_html=True)

        # Wikipedia extracto
        wiki_txt = actor.get("wikipedia_extracto", actor.get("extracto", ""))
        if wiki_txt:
            wiki_link = ""
            if actor.get("wikipedia_url"):
                wiki_link = f"· <a href='{actor['wikipedia_url']}' target='_blank' style='color:{CYAN};'>ver artículo ↗</a>"
            st.markdown(f"""
            <div class="wiki-box">
              <div style="font-size:.7rem;font-weight:700;color:{CYAN};margin-bottom:.4rem;">📖 Wikipedia {wiki_link}</div>
              {wiki_txt[:600]}{"…" if len(wiki_txt)>600 else ""}
            </div>
            """, unsafe_allow_html=True)
        elif actor.get("tipo") == "politico":
            st.caption("ℹ️ Sin datos Wikipedia — pulsa 'Enriquecer Wikipedia'")

        # Conexiones
        rels_a = _svc.get_relaciones(actor_id=actor["id"])
        if rels_a:
            st.markdown(f"**🔗 Conexiones ({len(rels_a)})**")
            for r in sorted(rels_a, key=lambda x: -float(x.get("fuerza",1)))[:12]:
                otro_id = r["to"] if r["from"] == actor["id"] else r["from"]
                otro = _svc.get_actor(otro_id)
                if not otro:
                    continue
                direction = "→" if r["from"] == actor["id"] else "←"
                cr = _COLOR_REL.get(r.get("tipo",""), MUTED)
                fuente_tag = ""
                if r.get("fuente","manual") != "manual":
                    fuente_tag = f'<span style="font-size:.6rem;color:{MUTED};">🌐 {r["fuente"]}</span>'
                st.markdown(f"""
                <div class="conn-item">
                  <span>{_icon_tipo(otro.get("tipo",""))} {otro.get("nombre",otro_id)}</span>
                  <span style="display:flex;align-items:center;gap:.4rem;">
                    {fuente_tag}
                    <span style="color:{cr};">{direction} {r.get("label","")}</span>
                    {_rel_badge(r.get("tipo",""))}
                  </span>
                </div>
                """, unsafe_allow_html=True)

        # Menciones recientes
        menciones = _svc.get_menciones(actor_id=actor["id"], limit=6)
        if menciones:
            st.markdown(f"**📰 Menciones recientes ({len(menciones)})**")
            for m in menciones:
                st.markdown(f"""
                <div style="font-size:.75rem;border-left:2px solid {CYAN};
                            padding-left:.6rem;margin-bottom:.3rem;color:{TEXT2};">
                  {m.get("titular","")[:120]}
                  <span style="color:{MUTED};"> — {m.get("medio","")}, {m.get("fecha","")[:10]}</span>
                </div>
                """, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# TAB 3 — RELACIONES
# ─────────────────────────────────────────────────────────────────────────────

with tab_rels:
    st.markdown("### 🔗 Explorer de Relaciones")

    rc1, rc2, rc3 = st.columns(3)
    with rc1:
        tipo_rel_f = st.selectbox("Tipo", ["Todas"] + list(_COLOR_REL.keys()), key="rel_tipo")
    with rc2:
        fuente_f = st.selectbox("Fuente", ["Todas","manual","rss","wikipedia","wikidata","ner_ollama"], key="rel_fuente")
    with rc3:
        min_fuerza = st.slider("Fuerza mínima", 0.0, 10.0, 0.0, 0.5, key="rel_fuerza")

    _rels_all = _svc.get_relaciones(tipo=tipo_rel_f if tipo_rel_f != "Todas" else None)
    if fuente_f != "Todas":
        _rels_all = [r for r in _rels_all if r.get("fuente","manual") == fuente_f]
    if min_fuerza > 0:
        _rels_all = [r for r in _rels_all if float(r.get("fuerza",0)) >= min_fuerza]

    st.caption(f"Mostrando **{len(_rels_all)}** relaciones")

    if _rels_all:
        rows = []
        for r in _rels_all:
            a_f = _svc.get_actor(r.get("from",""))
            a_t = _svc.get_actor(r.get("to",""))
            rows.append({
                "Desde":    a_f.get("nombre",r.get("from","")) if a_f else r.get("from",""),
                "Hasta":    a_t.get("nombre",r.get("to",""))   if a_t else r.get("to",""),
                "Tipo":     r.get("tipo",""),
                "Etiqueta": r.get("label",""),
                "Fuerza":   float(r.get("fuerza",1)),
                "Fuente":   r.get("fuente","manual"),
                "N.menciones": r.get("n_menciones",0),
            })
        df_rels = pd.DataFrame(rows).sort_values("Fuerza", ascending=False)
        st.dataframe(df_rels, use_container_width=True, height=320)

        # Histograma por tipo
        cnt = Counter(r.get("tipo","") for r in _rels_all)
        fig_hist = go.Figure(go.Bar(
            x=list(cnt.keys()), y=list(cnt.values()),
            marker_color=[_COLOR_REL.get(t, MUTED) for t in cnt.keys()],
        ))
        fig_hist.update_layout(
            paper_bgcolor=BG, plot_bgcolor=BG2, font_color=TEXT,
            height=220, margin=dict(l=0,r=0,t=20,b=0)
        )
        st.plotly_chart(fig_hist, use_container_width=True)

    with st.expander("➕ Añadir / editar relación manual"):
        _todos_n = sorted(_svc.get_actores(), key=lambda x: x.get("nombre",""))
        ae1, ae2 = st.columns(2)
        with ae1:
            from_actor = st.selectbox("Desde", [a["nombre"] for a in _todos_n], key="new_rel_from")
        with ae2:
            to_actor   = st.selectbox("Hasta",  [a["nombre"] for a in _todos_n], key="new_rel_to")
        ae3, ae4, ae5 = st.columns(3)
        with ae3:
            new_tipo   = st.selectbox("Tipo", list(_COLOR_REL.keys()), key="new_rel_tipo")
        with ae4:
            new_label  = st.text_input("Etiqueta", key="new_rel_label")
        with ae5:
            new_fuerza = st.slider("Fuerza", 1.0, 10.0, 5.0, 0.5, key="new_rel_fuerza")

        if st.button("💾 Guardar relación", key="btn_save_rel"):
            a_f2 = next((a for a in _todos_n if a["nombre"] == from_actor), None)
            a_t2 = next((a for a in _todos_n if a["nombre"] == to_actor), None)
            if a_f2 and a_t2 and a_f2["id"] != a_t2["id"]:
                _svc.upsert_relacion({
                    "from": a_f2["id"], "to": a_t2["id"],
                    "tipo": new_tipo, "label": new_label,
                    "fuerza": new_fuerza, "fuente": "manual",
                })
                st.success(f"✅ {from_actor} → {to_actor} guardada")
                st.cache_data.clear()
            else:
                st.error("Selecciona dos actores distintos")


# ─────────────────────────────────────────────────────────────────────────────
# TAB 4 — ANÁLISIS NETWORKX
# ─────────────────────────────────────────────────────────────────────────────

with tab_analisis:
    st.markdown("### 📊 Análisis de Red — networkx")
    st.caption("Degree · Betweenness · PageRank · Closeness · Comunidades Louvain (greedy_modularity)")

    m = _load_metricas()
    ac1, ac2, ac3, ac4 = st.columns(4)
    for col, (val, lbl) in zip(
        [ac1, ac2, ac3, ac4],
        [(m.get("n_nodos",0),"Nodos"), (m.get("n_aristas",0),"Aristas"),
         (f"{m.get('densidad',0):.4f}","Densidad"), (m.get("n_comunidades",0),"Comunidades")]
    ):
        with col:
            st.markdown(
                f'<div class="metric-box"><div class="metric-val">{val}</div>'
                f'<div class="metric-lbl">{lbl}</div></div>',
                unsafe_allow_html=True
            )

    st.markdown("")

    # Ranking por métrica
    metrica_sel = st.selectbox(
        "Métrica de centralidad",
        ["pagerank","degree","betweenness","closeness"],
        format_func=lambda x: {"pagerank":"PageRank","degree":"Grado",
                                "betweenness":"Betweenness","closeness":"Closeness"}[x],
        key="analisis_metrica",
    )
    top_n = st.slider("Top N", 5, 30, 15, key="analisis_topn")
    top_items = _svc.top_actores_por_metrica(metrica_sel, top_n)

    if top_items:
        labels, vals = zip(*top_items)
        nombres, colores = [], []
        for lid in labels:
            a = _svc.get_actor(lid)
            nombres.append(a["nombre"] if a else lid)
            colores.append(_color_tipo(a.get("tipo","") if a else ""))

        fig_top = go.Figure(go.Bar(
            x=list(vals), y=nombres, orientation="h",
            marker_color=colores,
            text=[f"{v:.4f}" for v in vals], textposition="outside",
        ))
        fig_top.update_layout(
            paper_bgcolor=BG, plot_bgcolor=BG2, font_color=TEXT,
            height=max(300, top_n * 28),
            margin=dict(l=0,r=80,t=10,b=0),
            yaxis=dict(autorange="reversed"),
        )
        st.plotly_chart(fig_top, use_container_width=True)

    # Brokers
    st.markdown("#### 🌉 Actores Puente — Brokers de Información")
    st.caption("Betweenness > media + σ : actores que conectan comunidades distintas")
    puentes = _svc.actores_puente()
    if puentes:
        p_cols = st.columns(min(4, len(puentes)))
        for i, p in enumerate(puentes[:8]):
            a = _svc.get_actor(p["id"])
            c = _color_tipo(a.get("tipo","") if a else "")
            with p_cols[i % len(p_cols)]:
                st.markdown(f"""
                <div class="metric-box" style="border-top-color:{c};">
                  <div style="font-size:.9rem;font-weight:800;color:{TEXT};">
                    {_icon_tipo(a.get("tipo","") if a else "")} {p["nombre"]}
                  </div>
                  <div style="font-size:.65rem;color:{MUTED};">{a.get("org","") if a else ""}</div>
                  <div class="metric-val" style="font-size:1rem;margin-top:.4rem;">{p["betweenness"]:.4f}</div>
                  <div class="metric-lbl">Betweenness · {p["grado"]} conexiones</div>
                </div>
                """, unsafe_allow_html=True)
    else:
        st.info("Networkx no disponible o sin suficientes datos")

    # Camino más corto
    st.markdown("#### 🔍 Camino Más Corto entre Dos Actores")
    _todos_s = sorted(_svc.get_actores(), key=lambda x: x.get("nombre",""))
    sp1, sp2 = st.columns(2)
    with sp1:
        actor_a_n = st.selectbox("Actor A", [a["nombre"] for a in _todos_s], key="path_a")
    with sp2:
        actor_b_n = st.selectbox("Actor B", [a["nombre"] for a in _todos_s], index=1, key="path_b")

    if st.button("🔍 Calcular camino", key="btn_path"):
        obj_a = next((a for a in _todos_s if a["nombre"] == actor_a_n), None)
        obj_b = next((a for a in _todos_s if a["nombre"] == actor_b_n), None)
        if obj_a and obj_b:
            path = _svc.camino_entre_actores(obj_a["id"], obj_b["id"])
            if path:
                path_n = []
                for pid in path:
                    pa = _svc.get_actor(pid)
                    path_n.append(f"**{pa['nombre']}**" if pa else pid)
                st.success(f"✅ Distancia: {len(path)-1} pasos")
                st.markdown(" → ".join(path_n))
            else:
                st.warning("No hay camino entre estos actores")

    # Scatter PageRank vs Betweenness
    st.markdown("#### 🎯 PageRank vs Betweenness")
    _all_a = _svc.get_actores()
    sdata = [{
        "nombre":     a.get("nombre",a["id"]),
        "tipo":       a.get("tipo",""),
        "poder":      a.get("poder",5),
        "pagerank":   m.get("pagerank",{}).get(a["id"],0),
        "betweenness":m.get("betweenness",{}).get(a["id"],0),
    } for a in _all_a]
    df_sc = pd.DataFrame(sdata)

    if not df_sc.empty and df_sc["pagerank"].sum() > 0:
        fig_sc = px.scatter(
            df_sc, x="pagerank", y="betweenness",
            color="tipo", size="poder", hover_name="nombre",
            color_discrete_map=_COLOR_TIPO, template="plotly_dark",
        )
        fig_sc.update_layout(
            paper_bgcolor=BG, plot_bgcolor=BG2, font_color=TEXT,
            height=380, margin=dict(l=0,r=0,t=20,b=0),
            legend=dict(bgcolor=BG3, bordercolor=BORDER),
        )
        st.plotly_chart(fig_sc, use_container_width=True)


# ─────────────────────────────────────────────────────────────────────────────
# TAB 5 — ACTUALIZACIÓN
# ─────────────────────────────────────────────────────────────────────────────

with tab_update:
    st.markdown("### 🔄 Motor de Actualización Dinámica")
    st.caption("Worker background · Scraping Wikipedia/Wikidata · NER RSS · Relaciones inferidas")

    est = _svc.estado_worker_actores()

    # Worker control
    uw1, uw2, uw3 = st.columns(3)
    with uw1:
        w_running = est.get("running", False)
        if w_running:
            st.markdown(f'<div style="color:{GREEN};font-weight:800;">🟢 Worker activo</div>', unsafe_allow_html=True)
            if st.button("⏹ Detener worker", key="btn_stop"):
                _svc.detener_worker_actores()
                st.info("Worker detenido")
                st.rerun()
        else:
            st.markdown(f'<div style="color:{MUTED};font-weight:800;">⏸ Worker parado</div>', unsafe_allow_html=True)
            if st.button("▶️ Iniciar worker", key="btn_start"):
                _svc.iniciar_worker_actores()
                st.success("Worker iniciado")
                st.rerun()
    with uw2:
        st.metric("Actores en store",   est.get("n_actores",0))
        st.metric("Relaciones totales", est.get("n_relaciones",0))
    with uw3:
        st.metric("Menciones",          est.get("n_menciones",0))
        ultima = est.get("meta",{}).get("ultima_actualizacion","")
        if ultima:
            st.caption(f"Última actualiz.: {ultima[:19]}")

    # Próximas ejecuciones
    proximas = est.get("proximas", {})
    if proximas:
        st.markdown("**⏱ Próximas ejecuciones:**")
        df_prx = pd.DataFrame([
            {"Tarea": k, "En (s)": max(0,v), "En (min)": round(max(0,v)/60,1)}
            for k, v in proximas.items()
        ])
        st.dataframe(df_prx, hide_index=True, use_container_width=True, height=140)

    # Actualizaciones manuales por módulo
    st.markdown("#### ⚡ Actualización Manual por Módulo")
    mu1, mu2, mu3 = st.columns(3)
    with mu1:
        if st.button("📰 Menciones RSS", key="btn_mencion"):
            with st.spinner("Scrapeando menciones…"):
                n = _svc.ejecutar_actualizacion_manual("menciones_rss")
            st.success(f"✅ {n} menciones nuevas")
            st.cache_data.clear()
    with mu2:
        if st.button("🔗 Inferir relaciones RSS", key="btn_rel"):
            with st.spinner("Analizando co-menciones…"):
                n = _svc.ejecutar_actualizacion_manual("relaciones_rss")
            st.success(f"✅ {n} relaciones inferidas")
            st.cache_data.clear()
    with mu3:
        if st.button("🌐 Enriquecer Wikipedia (lote)", key="btn_wiki_lote"):
            with st.spinner("Enriqueciendo lote de 5 actores…"):
                n = _svc.ejecutar_actualizacion_manual("enriquecimiento")
            st.success(f"✅ {n} actores enriquecidos")
            st.cache_data.clear()

    # Enriquecimiento individual
    st.markdown("#### 🎯 Enriquecimiento Individual")
    _todos_e = sorted(_svc.get_actores(), key=lambda x: x.get("nombre",""))
    enr1, enr2 = st.columns([3,1])
    with enr1:
        actor_enr_n = st.selectbox("Actor a enriquecer", [a["nombre"] for a in _todos_e], key="actor_enr")
    with enr2:
        force_r = st.checkbox("Forzar refresh", key="enr_force")

    if _SCRAPER_OK:
        if st.button("🌐 Enriquecer este actor", key="btn_enr_ind"):
            actor_enr = next((a for a in _todos_e if a["nombre"] == actor_enr_n), None)
            if actor_enr:
                with st.spinner(f"Enriqueciendo {actor_enr['nombre']}…"):
                    enriquecidos = _scraper.enriquecer_lote([actor_enr], max_actores=1, force=force_r)
                    for ae in enriquecidos:
                        _svc.upsert_actor(ae)
                    if enriquecidos:
                        res = enriquecidos[0]
                        st.success(f"✅ {actor_enr['nombre']} actualizado")
                        if res.get("extracto"):
                            st.markdown(
                                f'<div class="wiki-box"><b>Wikipedia:</b> {res["extracto"][:400]}…</div>',
                                unsafe_allow_html=True
                            )
                    else:
                        st.warning("Sin datos adicionales encontrados")
                st.cache_data.clear()

        # Wikidata bulk
        st.markdown("#### 🗄️ Descarga Bulk — Wikidata SPARQL")
        st.caption("~150 políticos españoles estructurados desde Wikidata")
        if st.button("⬇️ Descargar políticos de Wikidata", key="btn_wikidata"):
            with st.spinner("Consultando Wikidata (10-20s)…"):
                wd_pol = _scraper.wikidata_politicos_espana()
            if wd_pol:
                st.success(f"✅ {len(wd_pol)} políticos encontrados")
                df_wd = pd.DataFrame(wd_pol)
                st.dataframe(
                    df_wd[["nombre","partido","cargo","nacimiento"]].head(30),
                    use_container_width=True, height=300
                )
            else:
                st.warning("Sin respuesta de Wikidata")
    else:
        st.info("actors_scraper no disponible")

    # Log de operaciones
    st.markdown("#### 📋 Log de Operaciones")
    log_entries = est.get("log", [])
    if log_entries:
        for entry in log_entries[:20]:
            ok = entry.get("ok", True)
            info = (f" — {entry.get('error','')}" if not ok and entry.get("error")
                    else f" ({entry.get('n',0)} items)")
            st.markdown(f"""
            <div class="log-row">
              <span class="{'log-ok' if ok else 'log-err'}">{'✓' if ok else '✗'}</span>
              <span style="color:{MUTED};">[{entry.get("ts","")[:19]}]</span>
              <span style="color:{TEXT2};"> {entry.get("tipo","")}{info}</span>
            </div>
            """, unsafe_allow_html=True)

    if _SCRAPER_OK:
        scraper_log = getattr(_scraper, "_SCRAPE_LOG", [])
        if scraper_log:
            st.markdown("#### 🌐 Log Scraper")
            for entry in reversed(scraper_log[-12:]):
                ok_s = entry.get("ok", True)
                st.markdown(f"""
                <div class="log-row">
                  <span class="{'log-ok' if ok_s else 'log-err'}">{'✓' if ok_s else '✗'}</span>
                  <span style="color:{MUTED};">[{entry.get("ts","")}]</span>
                  <span style="color:{TEXT2};"> {entry.get("tipo","")} · {entry.get("actor","")} · {entry.get("info","")}</span>
                </div>
                """, unsafe_allow_html=True)

    if st.button("🔄 Reset a datos seed", key="btn_reset", type="secondary"):
        _svc.reset_a_seed()
        st.cache_data.clear()
        st.success("✅ Store reseteado a datos base")
        st.rerun()


# ─────────────────────────────────────────────────────────────────────────────
# TAB 6 — QUERY IA (Ollama)
# ─────────────────────────────────────────────────────────────────────────────

with tab_query:
    st.markdown("### 🤖 Motor de Consulta IA — Ollama Local")
    st.caption("Consulta libre · NER de noticias · Ficha ejecutiva · Briefing de relación")

    if not _LLM_OK:
        st.warning("⚠️ Ollama no disponible — `ollama serve` para activarlo")
    else:
        st.success("🟢 Ollama activo")

    qt1, qt2, qt3, qt4 = st.tabs([
        "💬 Consulta libre",
        "🔍 NER — Extraer actores",
        "📋 Ficha de actor IA",
        "🤝 Briefing de relación",
    ])

    # ── QT1: Consulta libre ───────────────────────────────────────────────────
    with qt1:
        st.markdown("#### 💬 Consulta en lenguaje natural sobre el grafo")

        _preguntas = [
            "¿Quién tiene más influencia en el grafo político actual?",
            "¿Qué actores conectan el bloque gubernamental con los medios?",
            "¿Cuáles son los principales brokers de información entre bloques?",
            "¿Qué lobbies tienen mayor acceso al Gobierno de Sánchez?",
            "¿Qué actores tienen relaciones adversariales con el PP?",
            "Explica las comunidades detectadas en el grafo",
        ]
        for pq in _preguntas:
            if st.button(f"💡 {pq}", key=f"pq_{hash(pq)}"):
                st.session_state["qia_input"] = pq

        pregunta = st.text_area(
            "Tu pregunta",
            value=st.session_state.get("qia_input",""),
            height=90, key="qia_input_area",
            placeholder="Ej: ¿Qué actores conectan a Puigdemont con el Gobierno?",
        )

        if st.button("🔍 Consultar", key="btn_query", disabled=not _LLM_OK):
            if pregunta.strip():
                m_ctx = _load_metricas()
                top_pgr = _svc.top_actores_por_metrica("pagerank",10)
                top_btw = _svc.top_actores_por_metrica("betweenness",5)
                puentes_ctx = _svc.actores_puente()[:5]

                top_pgr_s = ", ".join(
                    f"{_svc.get_actor(aid)['nombre'] if _svc.get_actor(aid) else aid} ({v:.4f})"
                    for aid,v in top_pgr
                )
                top_btw_s = ", ".join(
                    f"{_svc.get_actor(aid)['nombre'] if _svc.get_actor(aid) else aid} ({v:.4f})"
                    for aid,v in top_btw
                )
                rels_cnt = Counter(r.get("tipo") for r in _svc.get_relaciones())

                contexto = f"""GRAFO POLÍTICO ESPAÑOL:
Actores: {m_ctx.get("n_nodos",0)} | Relaciones: {m_ctx.get("n_aristas",0)} | Densidad: {m_ctx.get("densidad",0):.4f}
Comunidades Louvain: {m_ctx.get("n_comunidades",0)}

Top PageRank: {top_pgr_s}
Top Betweenness: {top_btw_s}
Actores puente: {", ".join(p["nombre"] for p in puentes_ctx)}
Distribución relaciones: {dict(rels_cnt)}

Actores clave:
PSOE/Gobierno: Sánchez, Yolanda Díaz, Félix Bolaños, Marlaska
PP/Oposición: Feijóo, Ayuso (Madrid), Moreno (Andalucía), Mazón (Valencia)
Independentismo: Puigdemont (JUNTS/exilio), Junqueras (ERC), Otegi (EH Bildu)
Empresarial: Iberdrola, Santander, BBVA, Inditex, Repsol, ACS/Florentino
Medios: El País (PRISA/prog), El Mundo, ABC, RTVE, OKDiario
Lobby/Influencia: CEOE, CCOO, UGT, FAES, Banco de España, CGPJ"""

                sistema = ("Eres un analista experto en política española con acceso a un grafo "
                           "de relaciones entre actores. Responde en español, conciso y preciso.")

                with st.spinner("🤔 Analizando…"):
                    respuesta = _llm.chat(pregunta, contexto=contexto, sistema=sistema, modo="normal")

                st.markdown(f'<div class="chat-msg">{respuesta}</div>', unsafe_allow_html=True)
                if "qia_historia" not in st.session_state:
                    st.session_state["qia_historia"] = []
                st.session_state["qia_historia"].append({
                    "q": pregunta, "a": respuesta, "ts": time.strftime("%H:%M")
                })

        if st.session_state.get("qia_historia"):
            with st.expander(f"📜 Historial ({len(st.session_state['qia_historia'])} consultas)"):
                for item in reversed(st.session_state["qia_historia"][-8:]):
                    st.markdown(f"**[{item['ts']}]** {item['q']}")
                    st.markdown(
                        f'<div class="chat-msg">{item["a"][:300]}{"…" if len(item["a"])>300 else ""}</div>',
                        unsafe_allow_html=True
                    )

    # ── QT2: NER ─────────────────────────────────────────────────────────────
    with qt2:
        st.markdown("#### 🔍 NER — Extracción de Actores y Relaciones desde Texto")
        st.caption("Inspirado en NER-for-News-Headlines · text2knowledge · orlandxrf/relation-extraction")

        _ejemplos_ner = [
            "Pedro Sánchez y Yolanda Díaz discrepan sobre la reforma de las pensiones ante las presiones de CEOE y los sindicatos.",
            "Isabel Díaz Ayuso acusa a Sánchez de favorecer a Iberdrola con la regulación energética, mientras el PP de Feijóo exige transparencia.",
            "Junts per Catalunya, liderado por Puigdemont, anuncia que retirará su apoyo al gobierno si no avanza la negociación sobre Catalunya.",
        ]
        for ej in _ejemplos_ner:
            if st.button(f"📌 {ej[:65]}…", key=f"ner_ej_{hash(ej)}"):
                st.session_state["ner_texto"] = ej

        texto_ner = st.text_area(
            "Texto a analizar",
            value=st.session_state.get("ner_texto",""),
            height=130, key="ner_texto_area",
            placeholder="Pega un titular o párrafo de noticia política española…",
        )

        if st.button("🔍 Extraer entidades y relaciones", key="btn_ner", disabled=not _LLM_OK):
            txt = texto_ner.strip()
            if txt:
                actores_bbdd = [a["nombre"] for a in _svc.get_actores()][:35]
                prompt_ner = f"""Analiza el texto político español y extrae entidades y relaciones.

Texto: "{txt}"

Tipos de relación válidos: {list(_COLOR_REL.keys())}
Actores en base de datos: {', '.join(actores_bbdd[:20])}

Responde SOLO con JSON válido (sin texto adicional):
{{
  "entidades": [
    {{"nombre": "...", "tipo": "persona|partido|organizacion", "en_bbdd": true}}
  ],
  "relaciones": [
    {{"sujeto": "...", "tipo": "...", "objeto": "...", "descripcion": "..."}}
  ],
  "resumen": "una frase sobre la noticia en clave política"
}}"""

                with st.spinner("🔍 Extrayendo entidades…"):
                    resp_ner = _llm.chat(prompt_ner,
                                         sistema="Eres un sistema NER político. Devuelve SOLO JSON.",
                                         modo="fast")

                try:
                    import re as _re
                    jm = _re.search(r'\{.*\}', resp_ner, _re.DOTALL)
                    ner_data = json.loads(jm.group() if jm else resp_ner)

                    resumen = ner_data.get("resumen","")
                    if resumen:
                        st.info(f"💡 {resumen}")

                    entidades = ner_data.get("entidades",[])
                    if entidades:
                        st.markdown("**Entidades detectadas:**")
                        chips = ""
                        for e in entidades:
                            bg = CYAN if e.get("en_bbdd") else AMBER
                            chips += f'<span class="ner-chip" style="background:{bg}22;color:{bg};">{e["nombre"]} <small>({e.get("tipo","")})</small></span>'
                        st.markdown(chips, unsafe_allow_html=True)

                    rels_ner = ner_data.get("relaciones",[])
                    if rels_ner:
                        st.markdown("**Relaciones inferidas:**")
                        for r_n in rels_ner:
                            cr = _COLOR_REL.get(r_n.get("tipo",""), MUTED)
                            st.markdown(f"""
                            <div class="conn-item">
                              <span style="font-weight:700;">{r_n.get("sujeto","")}</span>
                              <span style="color:{cr};">→ {r_n.get("tipo","")} →</span>
                              <span style="font-weight:700;">{r_n.get("objeto","")}</span>
                              <span style="color:{MUTED};font-size:.72rem;">{r_n.get("descripcion","")}</span>
                            </div>
                            """, unsafe_allow_html=True)

                        if st.button("💾 Añadir relaciones al grafo", key="btn_save_ner"):
                            _ids = {a["nombre"]: a["id"] for a in _svc.get_actores()}
                            n_s = 0
                            for r_n in rels_ner:
                                fid = _ids.get(r_n.get("sujeto",""))
                                tid = _ids.get(r_n.get("objeto",""))
                                if fid and tid:
                                    _svc.upsert_relacion({
                                        "from": fid, "to": tid,
                                        "tipo": r_n.get("tipo","adversarial"),
                                        "label": r_n.get("descripcion","")[:60],
                                        "fuerza": 3.0, "fuente": "ner_ollama",
                                    })
                                    n_s += 1
                            st.success(f"✅ {n_s} relaciones añadidas")
                            st.cache_data.clear()

                except Exception:
                    st.markdown(f'<div class="chat-msg">{resp_ner}</div>', unsafe_allow_html=True)

    # ── QT3: Ficha ejecutiva ──────────────────────────────────────────────────
    with qt3:
        st.markdown("#### 📋 Ficha Ejecutiva de Actor")
        st.caption("Briefing completo generado por Ollama con datos del grafo")

        _todos_f = sorted(_svc.get_actores(), key=lambda x: -x.get("poder",0))
        ficha_n = st.selectbox("Actor", [a["nombre"] for a in _todos_f], key="ficha_actor")

        if st.button("📋 Generar ficha ejecutiva", key="btn_ficha", disabled=not _LLM_OK):
            actor_f = next((a for a in _todos_f if a["nombre"] == ficha_n), None)
            if actor_f:
                m_f = _load_metricas()
                pgr_f = m_f.get("pagerank",{}).get(actor_f["id"],0)
                btw_f = m_f.get("betweenness",{}).get(actor_f["id"],0)
                deg_f = m_f.get("degree",{}).get(actor_f["id"],0)
                com_f = m_f.get("comunidades",{}).get(actor_f["id"])

                rels_f = _svc.get_relaciones(actor_id=actor_f["id"])
                conns_desc = []
                for r in rels_f[:8]:
                    otro_id = r["to"] if r["from"] == actor_f["id"] else r["from"]
                    otro = _svc.get_actor(otro_id)
                    if otro:
                        d = "→" if r["from"] == actor_f["id"] else "←"
                        conns_desc.append(f"{d} {otro['nombre']} ({r.get('tipo','')}): {r.get('label','')}")

                wiki_e = actor_f.get("wikipedia_extracto", actor_f.get("extracto",""))

                prompt_f = f"""Genera una ficha ejecutiva para analistas sobre este actor político español:

DATOS: {actor_f.get("nombre","")} | {actor_f.get("rol","")} | {actor_f.get("org","")} | Poder {actor_f.get("poder",0)}/10
MÉTRICAS RED: PageRank {pgr_f:.4f} | Betweenness {btw_f:.4f} | Conexiones {deg_f} | Comunidad #{com_f}
CONEXIONES: {chr(10).join(conns_desc) if conns_desc else "Sin datos"}
WIKIPEDIA: {wiki_e[:400] if wiki_e else "Sin datos"}

Estructura:
1. **Quién es** (2-3 frases)
2. **Influencia real en el grafo** (PageRank, posición)
3. **Relaciones estratégicas clave** (top 3)
4. **Riesgos y oportunidades** para terceros
5. **Palancas de acceso** (cómo interactuar con este actor)

Español. Analítico. Orientado a decisores."""

                with st.spinner(f"📋 Generando ficha de {ficha_n}…"):
                    ficha_txt = _llm.chat(prompt_f,
                                          sistema="Eres un analista político de alto nivel especializado en España.",
                                          modo="normal")
                st.markdown(f'<div class="chat-msg">{ficha_txt}</div>', unsafe_allow_html=True)

    # ── QT4: Briefing relación ────────────────────────────────────────────────
    with qt4:
        st.markdown("#### 🤝 Briefing de Relación entre Dos Actores")
        st.caption("Solidez · Historia · Palancas de negociación · Escenarios futuros")

        _todos_b = sorted(_svc.get_actores(), key=lambda x: -x.get("poder",0))
        br1, br2 = st.columns(2)
        with br1:
            b_a_n = st.selectbox("Actor A", [a["nombre"] for a in _todos_b], key="brief_a")
        with br2:
            b_b_n = st.selectbox("Actor B", [a["nombre"] for a in _todos_b], index=1, key="brief_b")

        if st.button("🤝 Generar briefing", key="btn_briefing", disabled=not _LLM_OK):
            obj_a = next((a for a in _todos_b if a["nombre"] == b_a_n), None)
            obj_b = next((a for a in _todos_b if a["nombre"] == b_b_n), None)
            if obj_a and obj_b:
                rels_ab = [r for r in _svc.get_relaciones()
                           if (r.get("from")==obj_a["id"] and r.get("to")==obj_b["id"]) or
                              (r.get("from")==obj_b["id"] and r.get("to")==obj_a["id"])]
                path_ab = _svc.camino_entre_actores(obj_a["id"], obj_b["id"])
                path_n = []
                for pid in path_ab:
                    pa = _svc.get_actor(pid)
                    path_n.append(pa["nombre"] if pa else pid)

                rels_desc = "\n".join(
                    f"- {r.get('from','')} → {r.get('to','')}: {r.get('label','')} ({r.get('tipo','')})"
                    for r in rels_ab
                ) or "Sin relaciones directas en el grafo"

                prompt_br = f"""Analiza la relación entre:
A: {obj_a.get("nombre","")} — {obj_a.get("rol","")} ({obj_a.get("org","")}) · Poder {obj_a.get("poder",0)}/10
B: {obj_b.get("nombre","")} — {obj_b.get("rol","")} ({obj_b.get("org","")}) · Poder {obj_b.get("poder",0)}/10

RELACIONES EN EL GRAFO: {rels_desc}
CAMINO MÁS CORTO: {" → ".join(path_n) if path_n else "No conectados"} ({len(path_ab)-1 if path_ab else "∞"} pasos)

Analiza:
1. **Naturaleza** (alianza, tensión, dependencia, competencia)
2. **Contexto histórico** de esta relación
3. **Solidez**: ¿estable o frágil? ¿qué la rompería?
4. **Palancas de negociación**: ¿qué tiene cada uno que el otro necesita?
5. **Escenarios futuros** (6 meses)

Español. Accionable."""

                with st.spinner(f"🤝 Analizando relación {b_a_n} ↔ {b_b_n}…"):
                    br_txt = _llm.chat(prompt_br,
                                       sistema="Eres analista de relaciones de poder en política española.",
                                       modo="normal")
                st.markdown(f'<div class="chat-msg">{br_txt}</div>', unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# AUTO-INICIAR WORKER
# ─────────────────────────────────────────────────────────────────────────────

if not _svc.estado_worker_actores().get("running", False):
    try:
        _svc.iniciar_worker_actores()
    except Exception:
        pass
