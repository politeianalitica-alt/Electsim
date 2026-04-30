"""D10 — Centro de Operaciones.

Sala central del analista: agrega señales vivas de riesgo, alertas,
legislativo, medios, electoral, geopolítica, agenda y memoria operativa.
"""
from __future__ import annotations

import html
import math
import sys
import uuid
from datetime import datetime
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
)
from dashboard.services.workspace_signals import (
    all_signals,
    api_payload,
    get_workspace,
    global_activity,
    list_workspaces,
    morning_briefing,
    workspace_estado_ahora,
    workspace_news,
    workspace_status,
    workspace_timeline,
)


st.set_page_config(
    page_title="Centro de Operaciones · Politeia",
    page_icon="",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()


try:
    from dashboard.services.llm_local import chat as llm_chat, disponible as llm_disponible

    _LLM_OK = bool(llm_disponible().get("brain", False))
except Exception:
    _LLM_OK = False

try:
    from agents.ai_engine import get_ai_engine

    _ENGINE_STATUS = get_ai_engine().status()
except Exception:
    _ENGINE_STATUS = {}


if "ops_tool"not in st.session_state:
    st.session_state["ops_tool"] = "Panel Vivo"
if "ops_workspace_id"not in st.session_state:
    st.session_state["ops_workspace_id"] = list_workspaces()[0]["id"]
if "ops_notes"not in st.session_state:
    st.session_state["ops_notes"] = {}
if "ops_draft"not in st.session_state:
    st.session_state["ops_draft"] = ""
if "ops_right_mode"not in st.session_state:
    st.session_state["ops_right_mode"] = "resumen"


def _color_for_level(level: str | None, score: float | None = None) -> str:
    raw = str(level or "").lower()
    if raw in {"critico", "crítico", "critical"} or (score is not None and score >= 70):
        return RED
    if raw in {"alto", "warning", "amarillo"} or (score is not None and score >= 40):
        return AMBER
    if raw in {"medio", "moderado"}:
        return PURPLE
    return GREEN


def _fmt_dt(value: str | None) -> str:
    if not value:
        return "sin fecha"
    try:
        dt = pd.to_datetime(value, errors="coerce", utc=True)
        if pd.isna(dt):
            return str(value)[:16]
        return dt.strftime("%d/%m %H:%M")
    except Exception:
        return str(value)[:16]


def _safe_text(value: object, limit: int = 300) -> str:
    return html.escape(str(value or ""))[:limit]


def _card(title: str, value: str, sub: str = "", color: str = CYAN) -> str:
    return (
        f'<div class="ops-card ops-kpi"style="border-top-color:{color}">'
        f'<div class="ops-label">{html.escape(title)}</div>'
        f'<div class="ops-value"style="color:{color}">{html.escape(value)}</div>'
        f'<div class="ops-sub">{html.escape(sub)}</div>'
        f"</div>"
    )


def _section(title: str, color: str = CYAN) -> None:
    st.markdown(
        f'<div class="ops-section"><span style="background:{color}"></span>{html.escape(title)}</div>',
        unsafe_allow_html=True,
    )


def _pill(text: str, color: str = CYAN) -> str:
    return (
        f'<span class="ops-pill"style="border-color:{color}55;color:{color};'
        f'background:{color}14">{html.escape(text)}</span>'
    )


st.markdown(
    f"""
<style>
.stApp {{ background:{BG}; }}
.block-container {{ padding-top:.7rem; padding-bottom:1.2rem; max-width:100%; }}
.ops-topbar {{
  background:{BG2}; border:1px solid {BORDER}; border-radius:10px;
  padding:.65rem .9rem; display:flex; align-items:center; justify-content:space-between;
  gap:.8rem; margin-bottom:.75rem;
}}
.ops-top-title {{ color:{TEXT}; font-weight:900; font-size:1rem; }}
.ops-top-meta {{ color:{TEXT2}; font-size:.72rem; }}
.ops-panel {{
  background:{BG2}; border:1px solid {BORDER}; border-radius:10px;
  padding:.75rem; margin-bottom:.75rem;
}}
.ops-card {{
  background:{BG2}; border:1px solid {BORDER}; border-radius:8px;
  padding:.75rem .85rem; margin-bottom:.65rem; border-top:3px solid {CYAN};
}}
.ops-kpi {{ min-height:86px; }}
.ops-label {{
  color:{MUTED}; font-size:.58rem; text-transform:uppercase; letter-spacing:.12em;
  font-weight:900; margin-bottom:.28rem;
}}
.ops-value {{ font-size:1.45rem; font-weight:950; line-height:1.1; }}
.ops-sub {{ color:{TEXT2}; font-size:.72rem; margin-top:.25rem; line-height:1.35; }}
.ops-section {{
  color:{CYAN}; font-size:.62rem; text-transform:uppercase; letter-spacing:.16em;
  font-weight:950; display:flex; align-items:center; gap:.45rem; margin:.8rem 0 .5rem;
}}
.ops-section span {{ width:4px; height:18px; border-radius:2px; display:inline-block; }}
.ops-pill {{
  display:inline-flex; align-items:center; gap:.25rem; padding:.13rem .42rem;
  border:1px solid; border-radius:999px; font-size:.63rem; font-weight:800;
  margin:.1rem .16rem .1rem 0; white-space:nowrap;
}}
.ops-mini {{
  color:{TEXT2}; font-size:.75rem; line-height:1.45;
  border-left:2px solid {BORDER}; padding:.28rem .55rem; margin:.24rem 0;
}}
.ops-mini strong {{ color:{TEXT}; }}
.ops-workspace-btn button {{ text-align:left; justify-content:flex-start; }}
.ops-signal-title {{ color:{TEXT}; font-size:.85rem; font-weight:900; margin-bottom:.45rem; }}
.ops-link {{ color:{CYAN}; text-decoration:none; }}
.ops-scroll {{ max-height:430px; overflow-y:auto; padding-right:.2rem; }}
.ops-muted {{ color:{MUTED}; font-size:.7rem; }}
</style>
""",
    unsafe_allow_html=True,
)


workspaces = list_workspaces()
workspace_ids = {str(ws["id"]) for ws in workspaces}
if str(st.session_state["ops_workspace_id"]) not in workspace_ids:
    st.session_state["ops_workspace_id"] = workspaces[0]["id"]

workspace = get_workspace(st.session_state["ops_workspace_id"])
workspace_id = str(workspace["id"])
signals = all_signals(workspace_id)
status = workspace_status(workspace_id)
estado = workspace_estado_ahora(workspace_id, signals=signals)
timeline = workspace_timeline(workspace_id, limit=28)
briefing = morning_briefing(workspace_id)

llm_dot = GREEN if _LLM_OK or _ENGINE_STATUS.get("ollama") else AMBER
vector_count = _ENGINE_STATUS.get("vector_count", "—")

st.markdown(
    f"""
<div class="ops-topbar">
  <div>
    <div class="ops-top-title"> Centro de Operaciones · Sistema Nervioso Politeia</div>
    <div class="ops-top-meta">
      ElectSim &gt; {_safe_text(workspace['nombre'], 80)} &gt; {_safe_text(st.session_state['ops_tool'], 60)}
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;justify-content:flex-end">
    {_pill(f"Alertas {status['alertas_total']}", _color_for_level(None, 75 if status['alertas_criticas'] else 20))}
    {_pill(f"Riesgo {status['riesgo']}/100", _color_for_level(status['riesgo_nivel'], status['riesgo']))}
    {_pill(f"LLM {'activo'if (_LLM_OK or _ENGINE_STATUS.get('ollama')) else 'degradado'}", llm_dot)}
    {_pill(f"Vectores {vector_count}", BLUE)}
  </div>
</div>
""",
    unsafe_allow_html=True,
)


left_col, main_col, right_col = st.columns([1.05, 3.2, 1.25], gap="medium")


with left_col:
    st.markdown('<div class="ops-panel">', unsafe_allow_html=True)
    st.markdown(
        f"""
<div style="display:flex;gap:.55rem;align-items:center;margin-bottom:.7rem">
  <div style="width:34px;height:34px;border-radius:8px;background:{CYAN}22;
       border:1px solid {CYAN}55;display:flex;align-items:center;justify-content:center"></div>
  <div>
    <div style="color:{TEXT};font-weight:900;font-size:.86rem">Analista</div>
    <div style="color:{TEXT2};font-size:.68rem">Sala viva · {datetime.now().strftime('%H:%M')}</div>
  </div>
</div>
""",
        unsafe_allow_html=True,
    )
    _section("Mis clientes", CYAN)
    for ws in workspaces:
        ws_status = workspace_status(ws["id"])
        active = str(ws["id"]) == workspace_id
        risk_color = _color_for_level(ws_status.get("riesgo_nivel"), ws_status.get("riesgo"))
        label = f"{'●'if active else '○'} {ws['nombre']}"
        if st.button(
            label,
            key=f"ops_ws_{ws['id']}",
            width="stretch",
            type="primary"if active else "secondary",
        ):
            st.session_state["ops_workspace_id"] = ws["id"]
            st.session_state["ops_right_mode"] = "resumen"
            st.rerun()
        st.markdown(
            f"""
<div style="margin:-.35rem 0 .45rem .2rem;line-height:1.5">
  <div class="ops-muted">{_safe_text(ws.get('sector') or ws.get('tipo'), 80)}</div>
  {_pill(f"Riesgo {ws_status.get('riesgo', 0)}/100", risk_color)}
  {_pill(f"{ws_status.get('alertas_total', 0)} alertas", RED if ws_status.get('alertas_criticas') else AMBER)}
</div>
""",
            unsafe_allow_html=True,
        )

    if st.button("+ Nuevo cliente", key="ops_add_client", width="stretch"):
        st.toast("Crea el cliente desde Campaña / API; el Centro lo detectará automáticamente.", icon="ℹ")

    _section("Herramientas", PURPLE)
    tools = ["Panel Vivo", "Investigation Canvas", "Draft Studio", "Intelligence Notebook", "Political Calendar"]
    for tool in tools:
        icon = {
            "Panel Vivo": "",
            "Investigation Canvas": "",
            "Draft Studio": "✏",
            "Intelligence Notebook": "",
            "Political Calendar": "",
        }[tool]
        if st.button(
            f"{icon} {tool}",
            key=f"ops_tool_{tool}",
            width="stretch",
            type="primary"if st.session_state["ops_tool"] == tool else "secondary",
        ):
            st.session_state["ops_tool"] = tool
            st.rerun()

    _section("Actividad reciente", AMBER)
    for item in global_activity(limit=8):
        st.markdown(
            f"""
<div class="ops-mini">
  <strong>{_safe_text(item.get('icono'), 10)} {_safe_text(item.get('workspace'), 80)}</strong><br>
  {_safe_text(item.get('titulo'), 110)}<br>
  <span class="ops-muted">{_fmt_dt(item.get('created_at'))}</span>
</div>
""",
            unsafe_allow_html=True,
        )
    st.markdown("</div>", unsafe_allow_html=True)


def render_timeline(items: list[dict]) -> None:
    if not items:
        st.info("No hay actividad viva para este workspace todavía.")
        return
    for item in items[:14]:
        url = str(item.get("url") or "")
        title = _safe_text(item.get("titulo"), 180)
        title_html = f'<a class="ops-link"href="{html.escape(url)}"target="_blank">{title}</a>'if url else title
        st.markdown(
            f"""
<div class="ops-mini">
  <strong>{_safe_text(item.get('icono'), 10)} {title_html}</strong><br>
  <span>{_safe_text(item.get('meta'), 90)}</span><br>
  <span class="ops-muted">{_fmt_dt(item.get('created_at'))}</span>
</div>
""",
            unsafe_allow_html=True,
        )


def render_estado_panel(data: dict[str, object]) -> None:
    k1, k2 = st.columns(2)
    with k1:
        st.markdown(_card("Alertas", str(data.get("alertas_activas", 0)), "sin leer / recientes", RED), unsafe_allow_html=True)
        st.markdown(_card("Borradores", str(data.get("borradores_activos", 0)), "activos", CYAN), unsafe_allow_html=True)
    with k2:
        st.markdown(_card("Riesgo", f"{data.get('riesgo', 0)}/100", "score actual", _color_for_level(None, float(data.get("riesgo", 0) or 0))), unsafe_allow_html=True)
        st.markdown(_card("Canvas", str(data.get("canvas_activos", 0)), "mapas activos", PURPLE), unsafe_allow_html=True)
    _section("Próximos eventos", AMBER)
    for ev in data.get("proximos_eventos", [])[:4]:
        st.markdown(
            f'<div class="ops-mini"><strong> {_safe_text(ev.get("label"), 110)}</strong><br>'
            f'<span class="ops-muted">{_safe_text(ev.get("fecha"), 20)} {_safe_text(ev.get("hora"), 8)} · {_safe_text(ev.get("fuente"), 50)}</span></div>',
            unsafe_allow_html=True,
        )
    _section("Pendiente de mí", RED)
    tasks = data.get("tareas_pendientes", [])
    if not tasks:
        st.success("Sin tareas críticas derivadas de señales vivas.")
    for task in tasks:
        st.checkbox(str(task.get("titulo")), key=f"ops_task_{task.get('id')}_{workspace_id}")


def render_signal_card(title: str, icon: str, data: dict, color: str, lines: list[str]) -> None:
    st.markdown(
        f"""
<div class="ops-card"style="border-top-color:{color}">
  <div class="ops-signal-title">{icon} {html.escape(title)}</div>
  {''.join(f'<div class="ops-sub">{html.escape(line)}</div>'for line in lines)}
</div>
""",
        unsafe_allow_html=True,
    )


def render_signal_aggregator() -> None:
    _section("Señales en tiempo real", CYAN)
    r, a, l = signals["riesgo"], signals["alertas"], signals["legislativo"]
    m, e, g = signals["medios"], signals["electoral"], signals["geopolitica"]
    cards = [
        (
            "Termómetro de Riesgo",
            "",
            r,
            _color_for_level(r.get("nivel"), r.get("score")),
            [
                f"Score: {r.get('score')}/100 · {r.get('nivel')}",
                f"Componentes activos: {len(r.get('componentes') or {})}",
                f"Fecha: {r.get('fecha') or 'sin fecha'}",
            ],
        ),
        (
            "Alertas Activas",
            "",
            a,
            RED if a.get("criticas") else AMBER,
            [
                f"Críticas: {a.get('criticas')} · Elevadas: {a.get('elevadas')} · Moderadas: {a.get('moderadas')}",
                f"Última: {(a.get('ultima_critica') or {}).get('titulo', 'sin crítica reciente')}",
            ],
        ),
        (
            "Monitor Legislativo",
            "",
            l,
            BLUE,
            [
                f"Normas 24h: {l.get('nuevas_normas_24h')}",
                f"Tramitaciones activas: {l.get('tramitaciones_activas')}",
                f"Top: {(l.get('top3_relevantes') or [{}])[0].get('titulo', 'sin normas relevantes')}",
            ],
        ),
        (
            "Medios & Narrativa",
            "",
            m,
            _color_for_level(m.get("nivel_amenaza_max")),
            [
                f"Narrativa: {(m.get('top_narrativa') or {}).get('label', 'sin datos')}",
                f"Piezas: {(m.get('top_narrativa') or {}).get('n_piezas', 0)} · Amenaza: {m.get('nivel_amenaza_max')}",
                f"Noticias vivas: {len(m.get('noticias') or [])}",
            ],
        ),
        (
            "Nowcasting Electoral",
            "",
            e,
            PURPLE,
            [
                f"Foco: {e.get('partido_focus', '—')} {e.get('estimacion_focus', '—')}%",
                f"Última fecha: {e.get('ultimo_nowcasting_fecha') or 'sin fecha'}",
                "Nueva encuesta hoy"if e.get("nueva_encuesta_hoy") else "Sin encuesta nueva hoy",
            ],
        ),
        (
            "Geopolítica & RRII",
            "",
            g,
            RED if g.get("nivel_top") == "critico" else AMBER if g.get("nivel_top") == "alto" else GREEN if g.get("nivel_top") == "bajo" else AMBER,
            [
                f"Señales 24h: {g.get('señales_relevantes_24h', 0)} · Nivel: {g.get('nivel_top', '—')}",
                f"Alertas: 🔴 {g.get('alertas_criticas', 0)} CRÍTICO · ⚠️ {g.get('alertas_altas', 0)} ALTO",
                f"OSINT urgentes: {g.get('osint_urgentes', 0)} · ACLED: {g.get('acled_eventos', 0)} eventos",
                (f"País más expuesto: {g.get('riesgo_max', {}).get('flag', '')} {g.get('riesgo_max', {}).get('pais', g.get('pais_top') or 'sin foco')}"
                 f" (score {g.get('riesgo_max', {}).get('score', '—')})"),
            ],
        ),
    ]
    for row in range(0, len(cards), 3):
        cols = st.columns(3)
        for col, args in zip(cols, cards[row:row + 3]):
            with col:
                render_signal_card(*args)


def render_canvas() -> None:
    st.markdown("###  Investigation Canvas")
    st.caption("Grafo derivado de señales vivas del workspace seleccionado.")
    nodes: list[tuple[str, str, str]] = [(workspace["nombre"], "cliente", CYAN)]
    edges: list[tuple[str, str, str]] = []
    for n in signals["medios"].get("noticias", [])[:5]:
        label = str(n.get("fuente") or "fuente")
        nodes.append((label, "medio", BLUE))
        edges.append((label, workspace["nombre"], "menciona"))
    for item in signals["electoral"].get("snapshot", [])[:5]:
        label = str(item.get("partido"))
        nodes.append((label, "partido", PURPLE))
        edges.append((label, workspace["nombre"], f"{item.get('pct')}%"))
    for fc in signals["medios"].get("factchecks", [])[:4]:
        label = str(fc.get("source_id") or "fact-check")
        nodes.append((label, "verificación", RED))
        edges.append((label, workspace["nombre"], str(fc.get("verdict") or "check")))

    unique_nodes = []
    seen = set()
    for node in nodes:
        if node[0] not in seen:
            unique_nodes.append(node)
            seen.add(node[0])
    n_nodes = max(len(unique_nodes), 1)
    pos = {}
    for i, (label, _, _) in enumerate(unique_nodes):
        angle = 2 * math.pi * i / n_nodes
        radius = 1.2 if i else 0.0
        pos[label] = (math.cos(angle) * radius, math.sin(angle) * radius)
    edge_x, edge_y = [], []
    for src, dst, _ in edges:
        if src in pos and dst in pos:
            edge_x.extend([pos[src][0], pos[dst][0], None])
            edge_y.extend([pos[src][1], pos[dst][1], None])
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=edge_x, y=edge_y, mode="lines", line=dict(color=BORDER, width=1), hoverinfo="none"))
    for label, ntype, color in unique_nodes:
        x, y = pos[label]
        fig.add_trace(
            go.Scatter(
                x=[x], y=[y], mode="markers+text",
                marker=dict(size=28 if label == workspace["nombre"] else 18, color=color),
                text=[label], textposition="top center",
                textfont=dict(color=TEXT, size=11),
                hovertemplate=f"{html.escape(label)}<br>{ntype}<extra></extra>",
                showlegend=False,
            )
        )
    fig.update_layout(
        height=470, paper_bgcolor=BG2, plot_bgcolor=BG2, showlegend=False,
        xaxis=dict(visible=False), yaxis=dict(visible=False),
        margin=dict(l=10, r=10, t=10, b=10),
    )
    st.plotly_chart(fig, width="stretch", key=f"ops_canvas_{workspace_id}")


def render_draft() -> None:
    st.markdown("### ✏ Draft Studio")
    template = (
        f"# Briefing operativo — {workspace['nombre']}\n\n"
        + "\n".join(f"- {b}"for b in briefing["bullets"])
        + "\n\n## Próximos pasos\n- Revisar alertas y normativa relevante.\n- Preparar nota corta para stakeholders.\n"
    )
    if not st.session_state.get("ops_draft"):
        st.session_state["ops_draft"] = template
    col_a, col_b = st.columns([1.4, 1])
    with col_a:
        st.session_state["ops_draft"] = st.text_area(
            "Documento activo",
            value=st.session_state["ops_draft"],
            height=430,
            key=f"ops_draft_area_{workspace_id}",
        )
        b1, b2, b3 = st.columns(3)
        if b1.button("Generar con IA", disabled=not _LLM_OK, width="stretch"):
            prompt = (
                f"Redacta un briefing ejecutivo para {workspace['nombre']} con estas señales:\n"
                f"{api_payload(signals)}\n\nMáximo 500 palabras, operativo y accionable."
            )
            with st.spinner("Politeia Brain redactando..."):
                st.session_state["ops_draft"] = llm_chat(prompt, sistema="Eres un analista senior de asuntos públicos.")
            st.rerun()
        if b2.button("Guardar versión", width="stretch"):
            st.toast("Versión guardada en sesión local.", icon="✓")
        if b3.button("Limpiar", width="stretch"):
            st.session_state["ops_draft"] = template
            st.rerun()
    with col_b:
        _section("Vista previa", CYAN)
        st.markdown(st.session_state["ops_draft"])


def render_notebook() -> None:
    st.markdown("###  Intelligence Notebook")
    notes = st.session_state["ops_notes"].setdefault(workspace_id, [])
    col_a, col_b = st.columns([1.2, 1])
    with col_a:
        query = st.text_input("Buscar en notas y señales", key=f"ops_nb_query_{workspace_id}")
        signal_notes = [
            {"titulo": "Riesgo", "texto": f"{signals['riesgo']['score']}/100 · {signals['riesgo']['nivel']}", "tag": "riesgo"},
            {"titulo": "Narrativa", "texto": str(signals["medios"]["top_narrativa"]), "tag": "medios"},
            {"titulo": "Electoral", "texto": str(signals["electoral"].get("snapshot", [])), "tag": "electoral"},
        ]
        all_notes = notes + signal_notes
        if query:
            q = query.lower()
            all_notes = [n for n in all_notes if q in f"{n.get('titulo','')} {n.get('texto','')} {n.get('tag','')}".lower()]
        for note in all_notes[:12]:
            st.markdown(
                f'<div class="ops-card"><div class="ops-signal-title"> {_safe_text(note.get("titulo"), 120)}</div>'
                f'<div class="ops-sub">{_safe_text(note.get("texto"), 500)}</div>{_pill(str(note.get("tag", "nota")), CYAN)}</div>',
                unsafe_allow_html=True,
            )
    with col_b:
        _section("Nueva nota", AMBER)
        title = st.text_input("Título", key=f"ops_note_title_{workspace_id}")
        body = st.text_area("Contenido", height=140, key=f"ops_note_body_{workspace_id}")
        tag = st.text_input("Tag", value="seguimiento", key=f"ops_note_tag_{workspace_id}")
        if st.button("Guardar nota", width="stretch", type="primary"):
            if title.strip() and body.strip():
                notes.insert(0, {"id": str(uuid.uuid4()), "titulo": title, "texto": body, "tag": tag})
                st.toast("Nota guardada en el notebook operativo.", icon="✓")
                st.rerun()


def render_calendar() -> None:
    st.markdown("###  Political Calendar")
    events = estado.get("proximos_eventos", [])
    if not events:
        st.info("No hay eventos reales vinculados en los próximos días.")
    for ev in events:
        st.markdown(
            f'<div class="ops-card"style="border-top-color:{AMBER}">'
            f'<div class="ops-signal-title"> {_safe_text(ev.get("label"), 150)}</div>'
            f'<div class="ops-sub">{_safe_text(ev.get("fecha"), 30)} {_safe_text(ev.get("hora"), 10)} · {_safe_text(ev.get("tipo"), 60)}</div>'
            f'<div class="ops-sub">{_safe_text(ev.get("fuente"), 80)}</div></div>',
            unsafe_allow_html=True,
        )


with main_col:
    st.markdown(
        f"""
<div class="ops-panel">
  <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start">
    <div>
      <div style="color:{TEXT};font-size:1.35rem;font-weight:950">{_safe_text(workspace['nombre'], 120)}</div>
      <div style="color:{TEXT2};font-size:.8rem">{_safe_text(workspace.get('sector') or workspace.get('tipo'), 120)} · {_safe_text(workspace.get('ambito'), 80)}</div>
    </div>
    <div style="text-align:right">
      <div class="ops-muted">Actualización</div>
      <div style="color:{CYAN};font-weight:900">{datetime.now().strftime('%d/%m/%Y %H:%M')}</div>
    </div>
  </div>
</div>
""",
        unsafe_allow_html=True,
    )

    top_a, top_b, top_c = st.columns([1.05, 1.45, 1.05], gap="medium")
    with top_a:
        _section("Perfil Cliente", CYAN)
        st.markdown(
            f"""
<div class="ops-panel">
  <div class="ops-label">Tipo</div>
  <div style="color:{TEXT};font-weight:900">{_safe_text(workspace.get('tipo'), 120)}</div>
  <div class="ops-label"style="margin-top:.7rem">Términos monitorizados</div>
  {''.join(_pill(str(t), BLUE) for t in (workspace.get('terms') or [])[:8])}
</div>
""",
            unsafe_allow_html=True,
        )
    with top_b:
        _section("Timeline de actividad", AMBER)
        st.markdown('<div class="ops-panel ops-scroll">', unsafe_allow_html=True)
        render_timeline(timeline.get("items", []))
        st.markdown("</div>", unsafe_allow_html=True)
    with top_c:
        _section("Estado Ahora", RED)
        st.markdown('<div class="ops-panel">', unsafe_allow_html=True)
        render_estado_panel(estado)
        st.markdown("</div>", unsafe_allow_html=True)

    render_signal_aggregator()

    st.markdown("<br>", unsafe_allow_html=True)
    tool = st.session_state["ops_tool"]
    if tool == "Panel Vivo":
        _section("Feed vivo del cliente", CYAN)
        news = workspace_news(workspace_id, limit=12)
        for item in news[:10]:
            url = item.get("url") or ""
            title = _safe_text(item.get("titulo"), 200)
            title_html = f'<a class="ops-link"href="{html.escape(url)}"target="_blank">{title}</a>'if url else title
            try:
                sent = float(item.get("sentimiento") or 0.0)
            except Exception:
                sent = 0.0
            st.markdown(
                f'<div class="ops-card"><div class="ops-signal-title"> {title_html}</div>'
                f'<div class="ops-sub">{_safe_text(item.get("fuente"), 80)} · {_fmt_dt(item.get("fecha"))} · sentimiento {sent:+.2f}</div>'
                f'<div class="ops-sub">{_safe_text(item.get("resumen"), 260)}</div></div>',
                unsafe_allow_html=True,
            )
    elif tool == "Investigation Canvas":
        render_canvas()
    elif tool == "Draft Studio":
        render_draft()
    elif tool == "Intelligence Notebook":
        render_notebook()
    elif tool == "Political Calendar":
        render_calendar()


with right_col:
    mode = st.radio(
        "Panel derecho",
        ["resumen", "alertas", "ia-chat"],
        horizontal=True,
        key="ops_right_mode",
        label_visibility="collapsed",
    )
    st.markdown('<div class="ops-panel">', unsafe_allow_html=True)
    if mode == "resumen":
        _section("Morning Briefing", CYAN)
        st.markdown(f"**{_safe_text(briefing['titulo'], 140)}**")
        for bullet in briefing["bullets"]:
            st.markdown(f'<div class="ops-mini">• {_safe_text(bullet, 220)}</div>', unsafe_allow_html=True)
        _section("Tareas urgentes", AMBER)
        tasks = estado.get("tareas_pendientes", [])
        if not tasks:
            st.success("Sin tareas urgentes.")
        for task in tasks:
            st.markdown(f'<div class="ops-mini">✓ {_safe_text(task.get("titulo"), 140)}</div>', unsafe_allow_html=True)
    elif mode == "alertas":
        _section("Alertas Contextuales", RED)
        alert_items = signals["alertas"].get("items", [])
        if not alert_items:
            st.info("Sin alertas recientes para este workspace.")
        for item in alert_items[:10]:
            sev = str(item.get("severidad") or "INFO")
            color = _color_for_level(sev)
            st.markdown(
                f'<div class="ops-card"style="border-top-color:{color}">'
                f'<div class="ops-signal-title"> {_safe_text(item.get("titulo"), 140)}</div>'
                f'<div class="ops-sub">{_safe_text(sev, 20)} · {_fmt_dt(item.get("created_at"))}</div>'
                f'<div class="ops-sub">{_safe_text(item.get("descripcion"), 240)}</div></div>',
                unsafe_allow_html=True,
            )
    else:
        _section("IA Contextual", PURPLE)
        st.caption("Chat con contexto del cliente activo y señales agregadas.")
        question = st.text_area(
            "Pregunta",
            placeholder="¿Qué debo priorizar hoy para este cliente?",
            height=90,
            key=f"ops_ai_q_{workspace_id}",
            label_visibility="collapsed",
        )
        if st.button("Preguntar a Politeia Brain", width="stretch", disabled=not _LLM_OK):
            if question.strip():
                context = {
                    "workspace": workspace,
                    "signals": signals,
                    "briefing": briefing,
                    "timeline": timeline.get("items", [])[:8],
                }
                prompt = (
                    f"Contexto operativo JSON:\n{api_payload(context)}\n\n"
                    f"Pregunta del analista: {question}\n\n"
                    "Responde en español, conciso y accionable. No inventes datos."
                )
                with st.spinner("Razonando..."):
                    answer = llm_chat(prompt, sistema="Eres Politeia Brain, jefe de operaciones de inteligencia política.")
                st.markdown(f'<div class="ops-card">{html.escape(answer)}</div>', unsafe_allow_html=True)
            else:
                st.warning("Escribe una pregunta.")
        if not _LLM_OK:
            st.info("Ollama/Politeia Brain no está disponible para chat, pero las señales vivas siguen cargadas.")
    st.markdown("</div>", unsafe_allow_html=True)
