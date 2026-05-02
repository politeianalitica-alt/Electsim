"""D10 — Centro de Operaciones · Campaign War Room.

Sala central del analista: kanban de tareas, agenda de campaña,
equipo y roles, informes y exports, configuración del cliente.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from pathlib import Path
import sys

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import (
    sidebar_nav, aplicar_estilos,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    section_header, kpi_card,
)

# ── Config ────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Centro de Operaciones · Politeia",
    page_icon="",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()
aplicar_estilos()

# ── LLM opcional ──────────────────────────────────────────────────────────────
try:
    from dashboard.services.llm_local import chat as llm_chat, disponible as llm_disponible
    _LLM_OK = bool(llm_disponible().get("brain", False))
except Exception:
    _LLM_OK = False
    llm_chat = None

# ── Session state defaults ────────────────────────────────────────────────────
_TASK_DEFAULTS: list[dict] = [
    {"id": str(uuid.uuid4()), "titulo": "Preparar briefing electoral semana 18", "prioridad": "Alta", "responsable": "Dir. Estratégico", "area": "Electoral", "estado": "En Progreso", "created": "2026-05-01"},
    {"id": str(uuid.uuid4()), "titulo": "Análisis cobertura mediática PP semana 18", "prioridad": "Alta", "responsable": "Analista de Medios", "area": "Medios", "estado": "En Progreso", "created": "2026-05-01"},
    {"id": str(uuid.uuid4()), "titulo": "Monitorizar tramitación Ley IA", "prioridad": "Media", "responsable": "Analista Legislativo", "area": "Legislativo", "estado": "Backlog", "created": "2026-04-30"},
    {"id": str(uuid.uuid4()), "titulo": "Dossier actor: Santiago Abascal", "prioridad": "Alta", "responsable": "Analista Electoral", "area": "Research", "estado": "Backlog", "created": "2026-04-30"},
    {"id": str(uuid.uuid4()), "titulo": "Revisión encuesta CIS mayo", "prioridad": "Alta", "responsable": "Analista Electoral 2", "area": "Electoral", "estado": "Revisión", "created": "2026-04-29"},
    {"id": str(uuid.uuid4()), "titulo": "Informe impacto Ley Vivienda en opinión pública", "prioridad": "Media", "responsable": "Analista Económico", "area": "Económico", "estado": "Revisión", "created": "2026-04-28"},
    {"id": str(uuid.uuid4()), "titulo": "Briefing semanal stakeholders", "prioridad": "Alta", "responsable": "Dir. Comunicación", "area": "Comunicación", "estado": "Completado", "created": "2026-04-25"},
    {"id": str(uuid.uuid4()), "titulo": "Migración datos sondeos Q1 2026", "prioridad": "Baja", "responsable": "Coordinador Campaña", "area": "Datos", "estado": "Completado", "created": "2026-04-22"},
    {"id": str(uuid.uuid4()), "titulo": "Configurar alertas geopolítica Sahel", "prioridad": "Media", "responsable": "Analista Electoral", "area": "Geopolítica", "estado": "Backlog", "created": "2026-04-30"},
]

_EVENT_DEFAULTS: list[dict] = [
    {"id": str(uuid.uuid4()), "titulo": "Debate líderes RTVE", "fecha": "2026-05-05", "hora": "21:00", "tipo": "MEDIATICO", "descripcion": "Debate organizado por RTVE con los cinco líderes principales."},
    {"id": str(uuid.uuid4()), "titulo": "Pleno Congreso — Presupuestos", "fecha": "2026-05-06", "hora": "10:00", "tipo": "LEGISLATIVO", "descripcion": "Debate y votación enmiendas a la totalidad PGE 2026."},
    {"id": str(uuid.uuid4()), "titulo": "Publicación encuesta Metroscopia", "fecha": "2026-05-07", "hora": "09:00", "tipo": "ELECTORAL", "descripcion": "Encuesta electoral mensual Metroscopia para El País."},
    {"id": str(uuid.uuid4()), "titulo": "Reunión equipo estrategia campaña", "fecha": "2026-05-08", "hora": "11:00", "tipo": "REUNION", "descripcion": "Revisión estrategia semana 19 con todo el equipo."},
    {"id": str(uuid.uuid4()), "titulo": "Consejo de Ministros ordinario", "fecha": "2026-05-12", "hora": "10:30", "tipo": "LEGISLATIVO", "descripcion": "Aprobación previsible de nuevo decreto de vivienda."},
    {"id": str(uuid.uuid4()), "titulo": "Mitin PP — Madrid Arena", "fecha": "2026-05-10", "hora": "19:00", "tipo": "ELECTORAL", "descripcion": "Acto de campaña masivo PP en Madrid."},
    {"id": str(uuid.uuid4()), "titulo": "Alerta crisis narrativa bulos PSOE", "fecha": "2026-05-09", "hora": "08:00", "tipo": "CRISIS", "descripcion": "Monitorización intensiva bulos virales sobre financiación PSOE."},
]

_REPORT_HISTORY: list[dict] = [
    {"informe": "Briefing Matutino", "fecha": "2026-05-02", "formato": "PDF", "generado_por": "IA automático"},
    {"informe": "Briefing Matutino", "fecha": "2026-05-01", "formato": "PDF", "generado_por": "IA automático"},
    {"informe": "Informe Semanal", "fecha": "2026-04-28", "formato": "DOCX", "generado_por": "Dir. Estratégico"},
    {"informe": "Análisis de Cobertura", "fecha": "2026-04-25", "formato": "PDF", "generado_por": "Analista de Medios"},
    {"informe": "Dossier Actor", "fecha": "2026-04-20", "formato": "Markdown", "generado_por": "Analista Electoral"},
]

for key, default in [
    ("d10_tareas", _TASK_DEFAULTS),
    ("d10_eventos", _EVENT_DEFAULTS),
    ("d10_report_history", _REPORT_HISTORY),
    ("d10_config", {
        "nombre_cliente": "Partido Político Demo",
        "tipo": "Partido político",
        "mercado": "España",
        "watchlist": ["PP", "PSOE", "VOX", "SUMAR"],
        "fuentes_activas": ["BOE", "El País", "El Mundo", "ABC", "La Vanguardia", "Congreso", "Senado"],
        "modelo_llm": "politeia-brain:latest",
        "umbral_riesgo": 60,
        "umbral_alerta": 40,
        "notif_email": True,
        "notif_slack": False,
        "slack_webhook": "",
    }),
]:
    if key not in st.session_state:
        st.session_state[key] = default

# ── Helpers ───────────────────────────────────────────────────────────────────

def _pill(text: str, color: str = CYAN, bg_alpha: str = "22") -> str:
    return (
        f'<span style="display:inline-flex;align-items:center;padding:.12rem .45rem;'
        f'border:1px solid {color}55;background:{color}{bg_alpha};color:{color};'
        f'border-radius:999px;font-size:.62rem;font-weight:800;margin:.1rem .14rem .1rem 0;'
        f'white-space:nowrap">{text}</span>'
    )


def _priority_color(p: str) -> str:
    return {
        "Alta": RED,
        "Media": AMBER,
        "Baja": GREEN,
        "Urgente": "#FF00FF",
    }.get(p, MUTED)


def _event_color(t: str) -> str:
    return {
        "ELECTORAL": CYAN,
        "MEDIATICO": PURPLE,
        "LEGISLATIVO": BLUE,
        "REUNION": AMBER,
        "CRISIS": RED,
    }.get(t, MUTED)


def _status_color(s: str) -> str:
    return {
        "disponible": GREEN,
        "en reunión": AMBER,
        "fuera": RED,
    }.get(s.lower(), MUTED)


def _chip(label: str, status_color: str) -> str:
    dot = f'<span style="width:8px;height:8px;background:{status_color};border-radius:50%;display:inline-block;margin-right:.3rem;box-shadow:0 0 6px {status_color}88"></span>'
    return (
        f'<div style="display:inline-flex;align-items:center;padding:.25rem .65rem;'
        f'background:{status_color}18;border:1px solid {status_color}44;border-radius:999px;'
        f'font-size:.68rem;font-weight:700;color:{status_color};gap:.1rem">'
        f'{dot}{label}</div>'
    )


# ── System Status Chips ───────────────────────────────────────────────────────
def _system_status_row() -> None:
    services = {
        "IA Brain": (GREEN if _LLM_OK else AMBER, "activo" if _LLM_OK else "degradado"),
        "Ingesta Noticias": (GREEN, "operativa"),
        "Base de Datos": (GREEN, "conectada"),
        "APIs Externas": (AMBER, "parcial"),
        "Workers ETL": (GREEN, "corriendo"),
    }
    chips_html = "".join(
        f'<div style="display:flex;align-items:center;gap:.4rem;padding:.35rem .75rem;'
        f'background:{col}12;border:1px solid {col}44;border-radius:8px;">'
        f'<span style="width:9px;height:9px;background:{col};border-radius:50%;'
        f'box-shadow:0 0 8px {col}88;flex-shrink:0"></span>'
        f'<span style="font-size:.7rem;font-weight:700;color:{TEXT}">{svc}</span>'
        f'<span style="font-size:.63rem;color:{col};font-weight:600">{lbl}</span>'
        f'</div>'
        for svc, (col, lbl) in services.items()
    )
    st.markdown(
        f'<div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.2rem">{chips_html}</div>',
        unsafe_allow_html=True,
    )


# ── Intel Header ─────────────────────────────────────────────────────────────
def _intel_header() -> None:
    now = datetime.now()
    st.markdown(f"""
<div style="background:linear-gradient(135deg,{BG2} 0%,{BG3} 100%);
     border:1px solid {BORDER};border-left:4px solid {CYAN};border-radius:12px;
     padding:1.2rem 1.5rem;margin-bottom:1.2rem">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
    <div style="display:flex;align-items:center;gap:1rem">
      <div style="width:46px;height:46px;background:linear-gradient(135deg,{CYAN},{BLUE});
           border-radius:12px;display:flex;align-items:center;justify-content:center;
           font-size:1.5rem;flex-shrink:0;box-shadow:0 0 20px {CYAN}44"></div>
      <div>
        <div style="font-size:1.5rem;font-weight:900;color:{TEXT};line-height:1.1">Centro de Operaciones</div>
        <div style="font-size:.82rem;color:{TEXT2};margin-top:.2rem">Campaign War Room &nbsp;·&nbsp; ElectSim España</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:.68rem;color:{MUTED};text-transform:uppercase;letter-spacing:.1em">Sesión activa</div>
      <div style="font-size:1.05rem;font-weight:900;color:{CYAN};font-family:monospace">{now.strftime('%d/%m/%Y %H:%M')}</div>
    </div>
  </div>
</div>
""", unsafe_allow_html=True)


_intel_header()
_system_status_row()

# ── Main Tabs ─────────────────────────────────────────────────────────────────
tab_kanban, tab_agenda, tab_equipo, tab_informes, tab_config = st.tabs([
    "MAPA DE OPERACIONES",
    "AGENDA DE CAMPAÑA",
    "EQUIPO & ROLES",
    "INFORMES & EXPORTS",
    "CONFIGURACIÓN",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: KANBAN
# ═══════════════════════════════════════════════════════════════════════════════
with tab_kanban:
    section_header("TABLERO DE OPERACIONES", CYAN)

    COLUMNAS = ["Backlog", "En Progreso", "Revisión", "Completado"]
    ESTADO_MAP = {"Backlog": "Backlog", "En Progreso": "En Progreso", "Revisión": "Revisión", "Completado": "Completado"}
    COL_COLORS = {
        "Backlog": MUTED,
        "En Progreso": CYAN,
        "Revisión": AMBER,
        "Completado": GREEN,
    }

    cols_kanban = st.columns(4, gap="small")
    for col_ui, estado_key in zip(cols_kanban, COLUMNAS):
        with col_ui:
            col_color = COL_COLORS[estado_key]
            tasks_in_col = [t for t in st.session_state["d10_tareas"] if t.get("estado") == estado_key]
            st.markdown(
                f'<div style="background:{col_color}18;border:1px solid {col_color}44;'
                f'border-top:3px solid {col_color};border-radius:10px;padding:.65rem .8rem;'
                f'margin-bottom:.8rem;">'
                f'<div style="display:flex;justify-content:space-between;align-items:center">'
                f'<span style="font-size:.72rem;font-weight:900;color:{col_color};'
                f'text-transform:uppercase;letter-spacing:.1em">{estado_key}</span>'
                f'<span style="background:{col_color}33;color:{col_color};border-radius:999px;'
                f'padding:.1rem .5rem;font-size:.68rem;font-weight:800">{len(tasks_in_col)}</span>'
                f'</div></div>',
                unsafe_allow_html=True,
            )
            for task in tasks_in_col:
                prio_color = _priority_color(task.get("prioridad", "Media"))
                area_color = {
                    "Electoral": CYAN, "Medios": PURPLE, "Legislativo": BLUE,
                    "Research": AMBER, "Económico": GREEN, "Comunicación": PURPLE,
                    "Geopolítica": RED, "Datos": MUTED,
                }.get(task.get("area", ""), MUTED)
                st.markdown(f"""
<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {prio_color};
     border-radius:8px;padding:.65rem .75rem;margin-bottom:.5rem">
  <div style="font-size:.78rem;font-weight:700;color:{TEXT};line-height:1.35;margin-bottom:.4rem">
    {task['titulo']}
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:.25rem;align-items:center">
    {_pill(task.get('prioridad',''), prio_color)}
    {_pill(task.get('area',''), area_color)}
  </div>
  <div style="font-size:.62rem;color:{MUTED};margin-top:.3rem"> {task.get('responsable','')}</div>
</div>
""", unsafe_allow_html=True)

                # Move buttons
                btn_c1, btn_c2 = st.columns(2)
                if estado_key != "Backlog":
                    prev = COLUMNAS[COLUMNAS.index(estado_key) - 1]
                    if btn_c1.button("←", key=f"prev_{task['id']}", help=f"Mover a {prev}"):
                        task["estado"] = prev
                        st.rerun()
                if estado_key != "Completado":
                    nxt = COLUMNAS[COLUMNAS.index(estado_key) + 1]
                    if btn_c2.button("→", key=f"next_{task['id']}", help=f"Mover a {nxt}"):
                        task["estado"] = nxt
                        st.rerun()

    # Nueva tarea
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("NUEVA TAREA", PURPLE)
    with st.form("form_nueva_tarea", clear_on_submit=True):
        fc1, fc2, fc3, fc4 = st.columns(4)
        titulo_t = fc1.text_input("Título de la tarea")
        prio_t = fc2.selectbox("Prioridad", ["Alta", "Media", "Baja", "Urgente"])
        resp_t = fc3.text_input("Responsable")
        area_t = fc4.selectbox("Área", ["Electoral", "Medios", "Legislativo", "Research", "Económico", "Comunicación", "Geopolítica", "Datos"])
        submitted = st.form_submit_button("Añadir tarea", type="primary")
        if submitted and titulo_t.strip():
            st.session_state["d10_tareas"].insert(0, {
                "id": str(uuid.uuid4()),
                "titulo": titulo_t.strip(),
                "prioridad": prio_t,
                "responsable": resp_t.strip() or "Sin asignar",
                "area": area_t,
                "estado": "Backlog",
                "created": datetime.now().strftime("%Y-%m-%d"),
            })
            st.success(f"Tarea '{titulo_t}' añadida al Backlog.")
            st.rerun()

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: AGENDA DE CAMPAÑA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_agenda:
    section_header("AGENDA DE CAMPAÑA — 7 DÍAS", CYAN)

    # Build 7-day grid starting from today
    today = datetime.now().date()
    week_days = [today + timedelta(days=i) for i in range(7)]
    day_labels = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]
    # Map weekday index (Mon=0) to label
    _wd_labels = {0: "LUN", 1: "MAR", 2: "MIÉ", 3: "JUE", 4: "VIE", 5: "SÁB", 6: "DOM"}

    # Group events by date
    eventos_by_date: dict[str, list[dict]] = {}
    for ev in st.session_state["d10_eventos"]:
        d = str(ev.get("fecha", ""))
        eventos_by_date.setdefault(d, []).append(ev)

    # HTML calendar table
    header_cells = "".join(
        f'<th style="padding:.5rem .4rem;font-size:.65rem;font-weight:900;color:{MUTED};'
        f'text-transform:uppercase;letter-spacing:.1em;text-align:center;border-bottom:1px solid {BORDER}">'
        f'{_wd_labels[d.weekday()]}<br>'
        f'<span style="font-size:.85rem;font-weight:900;color:{"#FFFFFF" if d == today else TEXT2}">{d.strftime("%d")}</span>'
        f'</th>'
        for d in week_days
    )

    def _mini_event_html(ev: dict) -> str:
        col = _event_color(ev.get("tipo", ""))
        return (
            f'<div style="background:{col}18;border-left:2px solid {col};border-radius:4px;'
            f'padding:.2rem .4rem;margin:.2rem 0;font-size:.6rem;color:{col};font-weight:700;'
            f'line-height:1.3;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:130px" '
            f'title="{ev.get("titulo","")}">'
            f'{ev.get("hora","")[:5]} {ev.get("titulo","")[:22]}…</div>'
        )

    body_cells = "".join(
        f'<td style="vertical-align:top;padding:.4rem;min-width:130px;border-right:1px solid {BORDER};'
        f'background:{"rgba(0,212,255,0.04)" if d == today else BG2}">'
        f'{"".join(_mini_event_html(ev) for ev in eventos_by_date.get(d.strftime("%Y-%m-%d"), []))}'
        f'</td>'
        for d in week_days
    )

    calendar_html = f"""
<div style="overflow-x:auto;margin-bottom:1.5rem">
<table style="width:100%;border-collapse:collapse;background:{BG2};border:1px solid {BORDER};border-radius:10px;overflow:hidden">
  <thead><tr>{header_cells}</tr></thead>
  <tbody><tr>{body_cells}</tr></tbody>
</table>
</div>"""
    st.markdown(calendar_html, unsafe_allow_html=True)

    # Legend
    legend_items = [("ELECTORAL", CYAN), ("MEDIÁTICO", PURPLE), ("LEGISLATIVO", BLUE), ("REUNIÓN", AMBER), ("CRISIS", RED)]
    legend_html = "".join(
        f'<span style="display:inline-flex;align-items:center;gap:.3rem;margin-right:.8rem;font-size:.65rem;color:{c};font-weight:700">'
        f'<span style="width:8px;height:8px;background:{c};border-radius:2px"></span>{lbl}</span>'
        for lbl, c in legend_items
    )
    st.markdown(f'<div style="margin-bottom:1.2rem">{legend_html}</div>', unsafe_allow_html=True)

    # Upcoming events list
    section_header("PRÓXIMOS EVENTOS", AMBER)
    sorted_events = sorted(st.session_state["d10_eventos"], key=lambda e: e.get("fecha", ""))
    for ev in sorted_events[:10]:
        col = _event_color(ev.get("tipo", ""))
        st.markdown(f"""
<div style="display:flex;gap:1rem;align-items:flex-start;background:{BG2};border:1px solid {BORDER};
     border-left:3px solid {col};border-radius:8px;padding:.7rem 1rem;margin-bottom:.5rem">
  <div style="text-align:center;flex-shrink:0;min-width:52px">
    <div style="font-size:.65rem;font-weight:900;color:{MUTED};text-transform:uppercase">{ev.get('fecha','')[5:]}</div>
    <div style="font-size:1rem;font-weight:900;color:{col};font-family:monospace">{ev.get('hora','')[:5]}</div>
  </div>
  <div style="flex:1">
    <div style="font-size:.85rem;font-weight:800;color:{TEXT}">{ev['titulo']}</div>
    <div style="font-size:.72rem;color:{TEXT2};margin-top:.2rem">{ev.get('descripcion','')[:140]}</div>
    <div style="margin-top:.3rem">{_pill(ev.get('tipo',''), col)}</div>
  </div>
</div>
""", unsafe_allow_html=True)
        # Delete button
        if st.button("Eliminar", key=f"del_ev_{ev['id']}", help="Eliminar evento"):
            st.session_state["d10_eventos"] = [e for e in st.session_state["d10_eventos"] if e["id"] != ev["id"]]
            st.rerun()

    # Add event form
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("AÑADIR EVENTO", PURPLE)
    with st.form("form_nuevo_evento", clear_on_submit=True):
        fe1, fe2, fe3 = st.columns(3)
        titulo_e = fe1.text_input("Título del evento")
        fecha_e = fe2.date_input("Fecha", value=today + timedelta(days=3))
        hora_e = fe3.text_input("Hora (HH:MM)", value="10:00")
        fe4, fe5 = st.columns(2)
        tipo_e = fe4.selectbox("Tipo", ["ELECTORAL", "MEDIATICO", "LEGISLATIVO", "REUNION", "CRISIS"])
        desc_e = fe5.text_input("Descripción breve")
        if st.form_submit_button("Añadir evento", type="primary") and titulo_e.strip():
            st.session_state["d10_eventos"].append({
                "id": str(uuid.uuid4()),
                "titulo": titulo_e.strip(),
                "fecha": str(fecha_e),
                "hora": hora_e,
                "tipo": tipo_e,
                "descripcion": desc_e,
            })
            st.success(f"Evento '{titulo_e}' añadido.")
            st.rerun()

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: EQUIPO & ROLES
# ═══════════════════════════════════════════════════════════════════════════════
with tab_equipo:
    section_header("ESTRUCTURA DEL EQUIPO", CYAN)

    TEAM = [
        {"nombre": "Carlos Martínez", "rol": "Director Estratégico", "area": "Estrategia", "estado": "disponible", "actividad": "Revisando briefing semanal", "carga": 85},
        {"nombre": "Laura García", "rol": "Analista Electoral", "area": "Electoral", "estado": "en reunión", "actividad": "Reunión encuesta CIS", "carga": 70},
        {"nombre": "Javier Romero", "rol": "Analista Electoral", "area": "Electoral", "estado": "disponible", "actividad": "Analizando sondeos regionales", "carga": 55},
        {"nombre": "Ana Torres", "rol": "Analista de Medios", "area": "Medios", "estado": "disponible", "actividad": "Monitor narrativas VOX", "carga": 65},
        {"nombre": "Pedro Sánchez-Leal", "rol": "Director de Comunicación", "area": "Comunicación", "estado": "en reunión", "actividad": "Prep. nota de prensa", "carga": 90},
        {"nombre": "Isabel Ruiz", "rol": "Analista Legislativo", "area": "Legislativo", "estado": "disponible", "actividad": "Tramitación Ley IA en Congreso", "carga": 60},
        {"nombre": "Miguel Herrera", "rol": "Analista Económico", "area": "Económico", "estado": "fuera", "actividad": "Desconectado hasta mañana", "carga": 0},
        {"nombre": "Sofía López", "rol": "Coordinadora de Campaña", "area": "Coordinación", "estado": "disponible", "actividad": "Sincronizando agenda líderes", "carga": 75},
    ]

    area_colors = {
        "Estrategia": CYAN, "Electoral": BLUE, "Medios": PURPLE,
        "Comunicación": AMBER, "Legislativo": GREEN, "Económico": RED,
        "Coordinación": CYAN,
    }

    col_team1, col_team2 = st.columns([2, 1], gap="large")
    with col_team1:
        for member in TEAM:
            sc = _status_color(member["estado"])
            ac = area_colors.get(member["area"], MUTED)
            carga = member["carga"]
            carga_color = RED if carga >= 85 else AMBER if carga >= 65 else GREEN
            st.markdown(f"""
<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
     padding:.85rem 1.1rem;margin-bottom:.5rem;display:flex;align-items:center;gap:1rem">
  <div style="width:40px;height:40px;background:{ac}22;border:1px solid {ac}55;
       border-radius:50%;display:flex;align-items:center;justify-content:center;
       font-size:1rem;flex-shrink:0;font-weight:900;color:{ac}">
    {member['nombre'][0]}{member['nombre'].split()[-1][0]}
  </div>
  <div style="flex:1;min-width:0">
    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
      <span style="font-weight:800;color:{TEXT};font-size:.88rem">{member['nombre']}</span>
      <span style="font-size:.7rem;color:{ac};background:{ac}18;border:1px solid {ac}44;
            border-radius:4px;padding:.1rem .4rem;font-weight:700">{member['rol']}</span>
    </div>
    <div style="font-size:.72rem;color:{TEXT2};margin-top:.15rem">{member['actividad']}</div>
    <div style="margin-top:.4rem;display:flex;align-items:center;gap:.5rem">
      {_pill(member['estado'], sc)}
      <div style="flex:1;height:4px;background:{BORDER};border-radius:2px;max-width:120px">
        <div style="width:{carga}%;height:100%;background:{carga_color};border-radius:2px"></div>
      </div>
      <span style="font-size:.62rem;color:{carga_color};font-weight:800;font-family:monospace">{carga}%</span>
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

    with col_team2:
        section_header("DISTRIBUCIÓN DE CARGA", PURPLE)
        try:
            areas_data = {}
            for m in TEAM:
                a = m["area"]
                areas_data[a] = areas_data.get(a, 0) + 1

            fig_donut = go.Figure(go.Pie(
                labels=list(areas_data.keys()),
                values=list(areas_data.values()),
                hole=0.55,
                marker_colors=[area_colors.get(a, MUTED) for a in areas_data],
                textfont=dict(size=10, color=TEXT),
                hovertemplate="<b>%{label}</b><br>%{value} persona(s)<extra></extra>",
            ))
            fig_donut.update_layout(
                height=240,
                paper_bgcolor=BG2,
                margin=dict(t=10, b=10, l=10, r=10),
                showlegend=False,
                annotations=[dict(
                    text=f"<b>{len(TEAM)}</b><br><span style='font-size:10px'>analistas</span>",
                    x=0.5, y=0.5, showarrow=False,
                    font=dict(size=14, color=TEXT),
                )]
            )
            st.plotly_chart(fig_donut, use_container_width=True, config={"displayModeBar": False})
        except Exception as exc:
            st.warning(f"Error en gráfico: {exc}")

        section_header("ASIGNACIÓN DE ALERTAS", AMBER)
        alert_assignments = [
            {"alerta": "Bulos PSOE viralización", "asignado": "Ana Torres", "prioridad": "Alta"},
            {"alerta": "Tramitación Ley IA", "asignado": "Isabel Ruiz", "prioridad": "Media"},
            {"alerta": "Mitin PP monitorización", "asignado": "Laura García", "prioridad": "Alta"},
            {"alerta": "Encuesta CIS análisis", "asignado": "Javier Romero", "prioridad": "Alta"},
        ]
        for aa in alert_assignments:
            pc = _priority_color(aa["prioridad"])
            st.markdown(
                f'<div style="background:{BG3};border:1px solid {BORDER};border-left:2px solid {pc};'
                f'border-radius:6px;padding:.45rem .65rem;margin-bottom:.35rem">'
                f'<div style="font-size:.72rem;font-weight:700;color:{TEXT}">{aa["alerta"]}</div>'
                f'<div style="font-size:.63rem;color:{MUTED};margin-top:.1rem"> {aa["asignado"]} &nbsp;'
                f'{_pill(aa["prioridad"], pc)}</div></div>',
                unsafe_allow_html=True,
            )

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4: INFORMES & EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════
with tab_informes:
    section_header("INFORMES DISPONIBLES", CYAN)

    REPORTS = [
        {"nombre": "Briefing Matutino", "descripcion": "Resumen ejecutivo diario de señales políticas, medios y alertas.", "frecuencia": "Diario", "ultima": "2026-05-02", "icono": ""},
        {"nombre": "Informe Semanal", "descripcion": "Análisis semanal de tendencias electorales, legislativas y mediáticas.", "frecuencia": "Semanal", "ultima": "2026-04-28", "icono": ""},
        {"nombre": "Análisis de Riesgo", "descripcion": "Score de riesgo político por dimensión y actores de riesgo.", "frecuencia": "A demanda", "ultima": "2026-04-25", "icono": ""},
        {"nombre": "Dossier de Actor", "descripcion": "Perfil completo de actor político: trayectoria, redes, exposición mediática.", "frecuencia": "A demanda", "ultima": "2026-04-20", "icono": ""},
        {"nombre": "Informe de Campaña", "descripcion": "Balance mensual de campaña: KPIs, narrativas, resultados encuestas.", "frecuencia": "Mensual", "ultima": "2026-04-01", "icono": ""},
        {"nombre": "Análisis de Cobertura Mediática", "descripcion": "Análisis cuantitativo y cualitativo de la cobertura de medios por actor.", "frecuencia": "Semanal", "ultima": "2026-04-25", "icono": ""},
    ]

    for rep in REPORTS:
        with st.expander(f"{rep['icono']}  {rep['nombre']}  ·  {rep['frecuencia']}  ·  Última: {rep['ultima']}"):
            st.markdown(f'<div style="color:{TEXT2};font-size:.82rem;margin-bottom:.8rem">{rep["descripcion"]}</div>', unsafe_allow_html=True)

            # Actor selector for dossier
            if rep["nombre"] == "Dossier de Actor":
                actor_sel = st.selectbox(
                    "Seleccionar actor",
                    ["Pedro Sánchez", "Alberto Núñez Feijóo", "Santiago Abascal", "Yolanda Díaz", "Carles Puigdemont"],
                    key=f"actor_sel_{rep['nombre']}",
                )

            col_r1, col_r2, col_r3 = st.columns(3)
            fmt = col_r1.selectbox("Formato", ["PDF", "DOCX", "Markdown"], key=f"fmt_{rep['nombre']}")

            if col_r2.button(f"Generar {rep['nombre']}", key=f"gen_{rep['nombre']}", type="primary"):
                with st.spinner("Generando informe..."):
                    if _LLM_OK and llm_chat:
                        try:
                            prompt = (
                                f"Genera un {rep['nombre']} ejecutivo para una consultoría política premium española. "
                                f"Formato {fmt}. Máximo 400 palabras. Datos actuales: {datetime.now().strftime('%Y-%m-%d')}."
                            )
                            result = llm_chat(prompt, sistema="Eres un analista senior de inteligencia política.")
                            st.markdown(f"""
<div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;
     padding:1rem 1.2rem;margin-top:.5rem;font-size:.82rem;color:{TEXT2}">
{result}
</div>""", unsafe_allow_html=True)
                        except Exception as exc:
                            st.warning(f"IA no disponible: {exc}")
                    else:
                        st.markdown(f"""
<div style="background:{BG3};border:1px solid {CYAN}33;border-left:3px solid {CYAN};
     border-radius:8px;padding:1rem 1.2rem;margin-top:.5rem">
  <div style="font-size:.9rem;font-weight:800;color:{TEXT};margin-bottom:.5rem">{rep['nombre']} — Demo</div>
  <div style="font-size:.8rem;color:{TEXT2};line-height:1.7">
  <strong>Resumen ejecutivo:</strong> Situación política estable con tendencia a la fragmentación.
  PP mantiene ventaja en intención de voto (33,2%) aunque sin mayoría suficiente para gobernar en solitario.
  PSOE consolida base electoral (28,5%). Volatilidad media-alta en bloque progresista.<br><br>
  <strong>Alertas destacadas:</strong> Campaña de bulos sobre financiación de partido en redes sociales.
  Monitor de narrativas detecta 3 focos de riesgo reputacional.<br><br>
  <strong>Acción recomendada:</strong> Activar protocolo de respuesta comunicativa y reforzar presencia en medios.
  </div>
</div>""", unsafe_allow_html=True)
                    st.session_state["d10_report_history"].insert(0, {
                        "informe": rep["nombre"],
                        "fecha": datetime.now().strftime("%Y-%m-%d"),
                        "formato": fmt,
                        "generado_por": "Usuario",
                    })

    # Download history
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("HISTORIAL DE DESCARGAS", PURPLE)
    df_hist_rep = pd.DataFrame(st.session_state["d10_report_history"])
    if not df_hist_rep.empty:
        st.dataframe(
            df_hist_rep.rename(columns={
                "informe": "Informe", "fecha": "Fecha",
                "formato": "Formato", "generado_por": "Generado por"
            }),
            use_container_width=True,
            hide_index=True,
        )

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5: CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════
with tab_config:
    section_header("CONFIGURACIÓN DEL CLIENTE", CYAN)

    cfg = st.session_state["d10_config"]
    col_c1, col_c2 = st.columns(2, gap="large")

    with col_c1:
        section_header("PERFIL DEL CLIENTE", BLUE)
        cfg["nombre_cliente"] = st.text_input("Nombre del cliente", value=cfg["nombre_cliente"])
        cfg["tipo"] = st.selectbox(
            "Tipo de cliente",
            ["Partido político", "Consultora política", "Think tank", "Fundación", "Empresa", "ONG"],
            index=["Partido político", "Consultora política", "Think tank", "Fundación", "Empresa", "ONG"].index(cfg["tipo"]) if cfg["tipo"] in ["Partido político", "Consultora política", "Think tank", "Fundación", "Empresa", "ONG"] else 0,
        )
        cfg["mercado"] = st.text_input("Mercado / País", value=cfg["mercado"])

        section_header("UMBRALES DE ALERTA", AMBER)
        cfg["umbral_riesgo"] = st.slider("Umbral de riesgo crítico (0-100)", 0, 100, cfg["umbral_riesgo"])
        cfg["umbral_alerta"] = st.slider("Umbral de alerta media (0-100)", 0, 100, cfg["umbral_alerta"])

        section_header("SELECCIÓN DE MODELO LLM", PURPLE)
        cfg["modelo_llm"] = st.selectbox(
            "Modelo de IA",
            ["politeia-brain:latest", "llama3.2:3b", "mistral:7b", "claude-3-haiku", "gpt-4o-mini"],
            index=0 if cfg["modelo_llm"] not in ["politeia-brain:latest", "llama3.2:3b", "mistral:7b", "claude-3-haiku", "gpt-4o-mini"] else ["politeia-brain:latest", "llama3.2:3b", "mistral:7b", "claude-3-haiku", "gpt-4o-mini"].index(cfg["modelo_llm"]),
        )

    with col_c2:
        section_header("WATCHLIST DE ACTORES", CYAN)
        watchlist_str = st.text_area(
            "Actores monitorizados (uno por línea)",
            value="\n".join(cfg["watchlist"]),
            height=120,
        )
        cfg["watchlist"] = [a.strip() for a in watchlist_str.splitlines() if a.strip()]

        section_header("FUENTES DE DATOS", BLUE)
        all_sources = ["BOE", "El País", "El Mundo", "ABC", "La Vanguardia", "RTVE", "Congreso", "Senado", "ACLED", "GDELT", "Twitter/X", "CIS"]
        cfg["fuentes_activas"] = st.multiselect(
            "Fuentes activas",
            options=all_sources,
            default=[f for f in cfg["fuentes_activas"] if f in all_sources],
        )

        section_header("NOTIFICACIONES", AMBER)
        cfg["notif_email"] = st.toggle("Notificaciones por email", value=cfg["notif_email"])
        cfg["notif_slack"] = st.toggle("Notificaciones por Slack", value=cfg["notif_slack"])
        if cfg["notif_slack"]:
            cfg["slack_webhook"] = st.text_input("Slack Webhook URL", value=cfg["slack_webhook"], type="password")

    st.markdown("<br>", unsafe_allow_html=True)
    col_save, col_reset, _ = st.columns([1, 1, 3])
    if col_save.button("Guardar configuración", type="primary", use_container_width=True):
        st.session_state["d10_config"] = cfg
        st.success("Configuración guardada correctamente en sesión.")
        st.balloons()
    if col_reset.button("Restablecer defaults", use_container_width=True):
        del st.session_state["d10_config"]
        st.rerun()

    # Config preview
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("RESUMEN DE CONFIGURACIÓN ACTIVA", MUTED)
    st.json({
        "cliente": cfg["nombre_cliente"],
        "tipo": cfg["tipo"],
        "mercado": cfg["mercado"],
        "modelo_llm": cfg["modelo_llm"],
        "watchlist": cfg["watchlist"],
        "fuentes_activas": cfg["fuentes_activas"],
        "umbrales": {"riesgo_critico": cfg["umbral_riesgo"], "alerta_media": cfg["umbral_alerta"]},
        "notificaciones": {"email": cfg["notif_email"], "slack": cfg["notif_slack"]},
    })
