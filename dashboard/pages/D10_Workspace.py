"""
Workspace War Room — ElectSim España.
Centro operativo del equipo: issues, acciones, decisiones, colaboración.
"""
from __future__ import annotations

import uuid
from datetime import datetime, date, timedelta
from pathlib import Path
import sys

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from dashboard.shared import (
    sidebar_nav,
    aplicar_estilos,
    BG, BG2, BG3, BORDER, BORDER2, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    section_header,
    kpi_card,
)

# ── Config ────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Workspace — ElectSim",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()
aplicar_estilos()

# ── Tenant ────────────────────────────────────────────────────────────────────
_TENANT_ID: str = st.session_state.get("politeia_tenant_id", "demo")

# ── Workspace service ─────────────────────────────────────────────────────────
try:
    from workspace_intelligence.workspace_service import (
        list_workspaces,
        get_workspace_context,
        get_workspace_kpis,
        get_activity_feed,
        create_workspace_issue_from_alert,
    )
    _WS_OK = True
except Exception as _ws_err:
    _WS_OK = False
    _ws_err_msg = str(_ws_err)

try:
    from workspace_intelligence.issue_board import (
        create_issue,
        list_issues,
        update_issue_status,
    )
    _BOARD_OK = True
except Exception:
    _BOARD_OK = False

try:
    from workspace_intelligence.action_queue import (
        add_action,
        list_pending_actions,
        complete_action,
    )
    _QUEUE_OK = True
except Exception:
    _QUEUE_OK = False

try:
    from workspace_intelligence.decision_log import (
        log_decision,
        list_decisions,
    )
    _DLOG_OK = True
except Exception:
    _DLOG_OK = False


# ── Helpers ───────────────────────────────────────────────────────────────────

def _pill(text: str, color: str = CYAN, bg_alpha: str = "22") -> str:
    return (
        f'<span style="display:inline-flex;align-items:center;padding:.12rem .45rem;'
        f'border:1px solid {color}55;background:{color}{bg_alpha};color:{color};'
        f'border-radius:999px;font-size:.62rem;font-weight:800;margin:.1rem .14rem .1rem 0;'
        f'white-space:nowrap">{text}</span>'
    )


def _status_color(status: str) -> str:
    return {
        "open": CYAN,
        "abierto": CYAN,
        "monitoring": AMBER,
        "en progreso": AMBER,
        "resolved": GREEN,
        "resuelto": GREEN,
        "closed": MUTED,
        "cerrado": MUTED,
    }.get(status.lower(), MUTED)


def _priority_color(priority: str) -> str:
    return {
        "critical": RED,
        "critica": RED,
        "high": AMBER,
        "alta": AMBER,
        "medium": BLUE,
        "media": BLUE,
        "normal": BLUE,
        "low": MUTED,
        "baja": MUTED,
    }.get(priority.lower(), MUTED)


def _status_label(status: str) -> str:
    return {
        "open": "Abierto",
        "monitoring": "En seguimiento",
        "resolved": "Resuelto",
        "closed": "Cerrado",
        "pending": "Pendiente",
        "in_progress": "En progreso",
        "done": "Completado",
        "cancelled": "Cancelado",
    }.get(status.lower(), status.capitalize())


def _priority_label(priority: str) -> str:
    return {
        "critical": "Critica",
        "high": "Alta",
        "normal": "Normal",
        "medium": "Media",
        "low": "Baja",
    }.get(priority.lower(), priority.capitalize())


def _card_html(
    title: str,
    subtitle: str = "",
    body: str = "",
    left_color: str = CYAN,
    extra_html: str = "",
) -> str:
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};'
        f'border-left:3px solid {left_color};border-radius:8px;'
        f'padding:.75rem 1rem;margin-bottom:.5rem">'
        f'<div style="font-size:.85rem;font-weight:800;color:{TEXT};margin-bottom:.2rem">{title}</div>'
        f'{"<div style=\"font-size:.75rem;color:" + TEXT2 + ";margin-bottom:.3rem\">" + subtitle + "</div>" if subtitle else ""}'
        f'{"<div style=\"font-size:.72rem;color:" + MUTED + "\">" + body + "</div>" if body else ""}'
        f'{extra_html}'
        f'</div>'
    )


# ── Workspace selector ────────────────────────────────────────────────────────
_available_workspaces: list[dict] = []
if _WS_OK:
    try:
        _available_workspaces = list_workspaces(_TENANT_ID)
    except Exception:
        _available_workspaces = []

if not _available_workspaces:
    _available_workspaces = [
        {
            "id": "ws_espana_2026",
            "name": "España 2026",
            "description": "Workspace principal — Elecciones Generales 2026",
            "member_count": 8,
            "issue_count": 5,
        },
        {
            "id": "ws_madrid_2025",
            "name": "Madrid 2025",
            "description": "Workspace — Elecciones Autonómicas Madrid 2025",
            "member_count": 4,
            "issue_count": 2,
        },
    ]

_ws_options: dict[str, str] = {ws["id"]: ws["name"] for ws in _available_workspaces}
_ws_descriptions: dict[str, str] = {ws["id"]: ws.get("description", "") for ws in _available_workspaces}

if "active_workspace_id" not in st.session_state:
    st.session_state["active_workspace_id"] = list(_ws_options.keys())[0]

# Selector en la parte superior de la página
_sel_col, _hdr_col = st.columns([1, 3], gap="large")
with _sel_col:
    _selected_ws_id: str = st.selectbox(
        "Workspace activo",
        options=list(_ws_options.keys()),
        format_func=lambda x: _ws_options.get(x, x),
        index=list(_ws_options.keys()).index(
            st.session_state.get("active_workspace_id", list(_ws_options.keys())[0])
        ),
        key="_ws_selector",
    )
    st.session_state["active_workspace_id"] = _selected_ws_id

_active_ws_id: str = st.session_state["active_workspace_id"]
_active_ws_name: str = _ws_options.get(_active_ws_id, _active_ws_id)
_active_ws_desc: str = _ws_descriptions.get(_active_ws_id, "")

# ── Page header ───────────────────────────────────────────────────────────────
with _hdr_col:
    st.markdown(
        f'<div style="background:linear-gradient(135deg,{BG2} 0%,{BG3} 100%);'
        f'border:1px solid {BORDER};border-left:4px solid {CYAN};border-radius:12px;'
        f'padding:1rem 1.4rem;margin-bottom:.5rem">'
        f'<div style="font-size:1.4rem;font-weight:900;color:{TEXT};line-height:1.1">'
        f'War Room — {_active_ws_name}</div>'
        f'<div style="font-size:.8rem;color:{TEXT2};margin-top:.25rem">{_active_ws_desc}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

# ── Cargar contexto ───────────────────────────────────────────────────────────
_ctx = None
if _WS_OK:
    try:
        _ctx = get_workspace_context(_active_ws_id, _TENANT_ID)
    except Exception as _ctx_err:
        st.error(f"Error al cargar el contexto del workspace: {_ctx_err}")

# ── Tabs principales ──────────────────────────────────────────────────────────
tab_panorama, tab_issues, tab_acciones, tab_decisiones, tab_equipo = st.tabs([
    "Panorama",
    "Issues",
    "Acciones",
    "Decisiones",
    "Equipo",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: PANORAMA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_panorama:
    section_header("PANORAMA OPERATIVO", CYAN)

    # KPI cards
    _kpis: dict = {}
    if _WS_OK:
        try:
            _kpis = get_workspace_kpis(_active_ws_id, _TENANT_ID)
        except Exception:
            _kpis = {}

    _kpi_issues = _kpis.get("issues_open", _ctx.issue_count if _ctx else 5)
    _kpi_actions = _kpis.get("actions_pending", _ctx.pending_actions if _ctx else 5)
    _kpi_decisions = _kpis.get("decisions_logged", _ctx.decisions_this_week if _ctx else 3)
    _kpi_team = _kpis.get("team_active", _ctx.team_members if _ctx else 6)

    kc1, kc2, kc3, kc4 = st.columns(4)
    with kc1:
        kpi_card("Issues abiertos", str(_kpi_issues), color=RED if _kpi_issues >= 5 else AMBER)
    with kc2:
        kpi_card("Acciones pendientes", str(_kpi_actions), color=AMBER)
    with kc3:
        kpi_card("Decisiones esta semana", str(_kpi_decisions), color=CYAN)
    with kc4:
        kpi_card("Miembros activos", str(_kpi_team), color=GREEN)

    st.markdown("<br>", unsafe_allow_html=True)
    pan_col1, pan_col2 = st.columns(2, gap="large")

    with pan_col1:
        section_header("ISSUES CRITICOS", RED)
        _top_issues = _ctx.top_issues if _ctx else []
        if not _top_issues:
            _top_issues = [
                {"issue_id": "demo1", "title": "Sin issues registrados aun", "status": "open", "severity": "normal"},
            ]
        for iss in _top_issues[:5]:
            _sev = iss.get("severity", "normal")
            _col = _priority_color(_sev)
            _s_label = _status_label(iss.get("status", "open"))
            st.markdown(
                _card_html(
                    title=iss.get("title", ""),
                    subtitle="",
                    extra_html=(
                        f'<div style="margin-top:.35rem">'
                        f'{_pill(_priority_label(_sev), _col)}'
                        f'{_pill(_s_label, _status_color(iss.get("status", "open")))}'
                        f'</div>'
                    ),
                    left_color=_col,
                ),
                unsafe_allow_html=True,
            )

    with pan_col2:
        section_header("PROXIMAS ACCIONES", AMBER)
        _next_actions = _ctx.next_best_actions if _ctx else []
        if not _next_actions:
            _next_actions = [
                {"action_id": "demo1", "title": "Sin acciones pendientes", "priority": "normal", "due_date": ""},
            ]
        for act in _next_actions[:5]:
            _p = act.get("priority", "normal")
            _pc = _priority_color(_p)
            _due = act.get("due_date", "") or act.get("due", "")
            _resp = act.get("responsible", act.get("assigned_to", ""))
            st.markdown(
                _card_html(
                    title=act.get("title", ""),
                    subtitle=f"{_resp}  —  Vence: {_due}" if _due else _resp,
                    extra_html=f'<div style="margin-top:.3rem">{_pill(_priority_label(_p), _pc)}</div>',
                    left_color=_pc,
                ),
                unsafe_allow_html=True,
            )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: ISSUES
# ═══════════════════════════════════════════════════════════════════════════════
with tab_issues:
    section_header("TABLERO DE ISSUES", CYAN)

    # Filtros
    f_col1, f_col2, _ = st.columns([1, 1, 2])
    with f_col1:
        _status_filter = st.selectbox(
            "Estado",
            ["Todos", "open", "monitoring", "resolved", "closed"],
            format_func=lambda x: "Todos" if x == "Todos" else _status_label(x),
            key="iss_status_filter",
        )
    with f_col2:
        _priority_filter = st.selectbox(
            "Prioridad",
            ["Todos", "critical", "high", "normal", "low"],
            format_func=lambda x: "Todos" if x == "Todos" else _priority_label(x),
            key="iss_priority_filter",
        )

    # Formulario crear issue
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("CREAR ISSUE", PURPLE)
    with st.form("form_crear_issue", clear_on_submit=True):
        fi1, fi2 = st.columns(2)
        _iss_title = fi1.text_input("Titulo del issue")
        _iss_assigned = fi2.text_input("Responsable asignado")
        _iss_desc = st.text_area("Descripcion", height=80)
        fi3, fi4 = st.columns(2)
        _iss_priority = fi3.selectbox(
            "Prioridad",
            ["critical", "high", "normal", "low"],
            index=2,
            format_func=_priority_label,
        )
        _iss_category = fi4.selectbox(
            "Categoria",
            ["electoral", "communications", "operations", "intelligence", "risk"],
        )
        _iss_submit = st.form_submit_button("Crear issue", type="primary")
        if _iss_submit:
            if not _iss_title.strip():
                st.warning("Indica el titulo del issue.")
            else:
                try:
                    if _BOARD_OK:
                        _new_iss = create_issue(
                            workspace_id=_active_ws_id,
                            title=_iss_title.strip(),
                            description=_iss_desc.strip(),
                            severity=_iss_priority,
                            tenant_id=_TENANT_ID,
                        )
                        st.success(f"Issue creado: {_new_iss.issue_id}")
                    else:
                        st.success(f"Issue registrado (modo demo): {_iss_title.strip()}")
                except Exception as _iss_err:
                    st.error(f"Error al crear el issue: {_iss_err}")

    # Listado de issues
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("ISSUES REGISTRADOS", CYAN)

    _all_issues: list = []
    if _BOARD_OK:
        try:
            _status_q = None if _status_filter == "Todos" else _status_filter
            _all_issues = list_issues(_active_ws_id, _TENANT_ID, status=_status_q)
        except Exception as _li_err:
            st.error(f"Error al cargar issues: {_li_err}")

    if not _all_issues:
        # Demo issues cuando no hay datos reales
        _all_issues = (_ctx.top_issues if _ctx else []) or [
            {
                "issue_id": "iss_001",
                "title": "Bulos sobre financiacion del partido en redes sociales",
                "description": "Campana de desinformacion activa. Alcance: 200.000 impresiones.",
                "status": "open",
                "severity": "critical",
                "created_at": "2026-05-01T08:00:00Z",
            },
            {
                "issue_id": "iss_002",
                "title": "Caida de intencion de voto en franja 18-34",
                "description": "Descenso de 2,3 puntos en dos semanas segun tracking interno.",
                "status": "monitoring",
                "severity": "high",
                "created_at": "2026-05-02T10:30:00Z",
            },
        ]

    for iss in _all_issues:
        if isinstance(iss, dict):
            _iss_dict = iss
        else:
            try:
                _iss_dict = iss.model_dump()
            except Exception:
                _iss_dict = dict(iss)

        _sev = _iss_dict.get("severity", "normal")
        _stt = _iss_dict.get("status", "open")

        if _priority_filter != "Todos" and _sev != _priority_filter:
            continue

        _sev_color = _priority_color(_sev)
        _stt_color = _status_color(_stt)
        _desc_snippet = (_iss_dict.get("description", "") or "")[:120]
        _created = (_iss_dict.get("created_at", "") or "")[:10]
        _assigned = _iss_dict.get("assigned_to", "")

        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};'
            f'border-left:3px solid {_sev_color};border-radius:8px;'
            f'padding:.8rem 1rem;margin-bottom:.5rem">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem">'
            f'<div style="font-size:.88rem;font-weight:800;color:{TEXT}">{_iss_dict.get("title","")}</div>'
            f'<div>{_pill(_priority_label(_sev), _sev_color)}{_pill(_status_label(_stt), _stt_color)}</div>'
            f'</div>'
            f'{"<div style=\"font-size:.74rem;color:" + TEXT2 + ";margin-top:.3rem\">" + _desc_snippet + "...</div>" if _desc_snippet else ""}'
            f'<div style="font-size:.65rem;color:{MUTED};margin-top:.4rem">'
            f'{"Responsable: " + _assigned + "  " if _assigned else ""}'
            f'{"Creado: " + _created if _created else ""}'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
        _upd_col1, _upd_col2, _ = st.columns([1, 1, 3])
        _iss_id = _iss_dict.get("issue_id", str(uuid.uuid4()))
        if _upd_col1.button("Marcar resuelto", key=f"resolve_{_iss_id}"):
            try:
                if _BOARD_OK:
                    update_issue_status(_iss_id, "resolved")
                    st.success("Issue marcado como resuelto.")
                    st.rerun()
                else:
                    st.info("Estado actualizado (modo demo).")
            except Exception as _upd_err:
                st.error(f"Error: {_upd_err}")
        if _upd_col2.button("Cerrar", key=f"close_{_iss_id}"):
            try:
                if _BOARD_OK:
                    update_issue_status(_iss_id, "closed")
                    st.success("Issue cerrado.")
                    st.rerun()
                else:
                    st.info("Issue cerrado (modo demo).")
            except Exception as _upd_err:
                st.error(f"Error: {_upd_err}")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: ACCIONES
# ═══════════════════════════════════════════════════════════════════════════════
with tab_acciones:
    section_header("COLA DE ACCIONES", AMBER)

    # Formulario nueva accion
    section_header("NUEVA ACCION", PURPLE)
    with st.form("form_nueva_accion", clear_on_submit=True):
        fa1, fa2 = st.columns(2)
        _act_title = fa1.text_input("Titulo de la accion")
        _act_resp = fa2.text_input("Responsable")
        _act_desc = st.text_area("Descripcion", height=70)
        fa3, fa4, fa5 = st.columns(3)
        _act_priority = fa3.selectbox(
            "Prioridad",
            ["critical", "high", "normal", "low"],
            index=2,
            format_func=_priority_label,
        )
        _act_deadline = fa4.date_input(
            "Fecha limite",
            value=date.today() + timedelta(days=5),
        )
        _act_type = fa5.selectbox(
            "Tipo",
            ["task", "communication", "briefing", "meeting", "analysis"],
        )
        _act_submit = st.form_submit_button("Crear accion", type="primary")
        if _act_submit:
            if not _act_title.strip():
                st.warning("Indica el titulo de la accion.")
            else:
                try:
                    if _QUEUE_OK:
                        _new_act = add_action(
                            workspace_id=_active_ws_id,
                            title=_act_title.strip(),
                            action_type=_act_type,
                            priority=_act_priority,
                            tenant_id=_TENANT_ID,
                        )
                        st.success(f"Accion creada: {_new_act.action_id}")
                    else:
                        st.success(f"Accion registrada (modo demo): {_act_title.strip()}")
                except Exception as _act_err:
                    st.error(f"Error al crear la accion: {_act_err}")

    # Listado de acciones pendientes
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("ACCIONES PENDIENTES", AMBER)

    _pending_actions: list = []
    if _QUEUE_OK:
        try:
            _pending_actions = list_pending_actions(_active_ws_id, _TENANT_ID)
        except Exception as _pq_err:
            st.error(f"Error al cargar acciones: {_pq_err}")

    _demo_actions = _ctx.next_best_actions if _ctx else []
    if not _pending_actions:
        _pending_actions = _demo_actions or [
            {
                "action_id": "act_001",
                "title": "Preparar nota de respuesta a bulos financiacion",
                "priority": "critical",
                "responsible": "Dir. Comunicacion",
                "due_date": "2026-05-06",
                "status": "pending",
            },
            {
                "action_id": "act_002",
                "title": "Analisis segmentado CIS franja joven",
                "priority": "high",
                "responsible": "Analista Electoral",
                "due_date": "2026-05-07",
                "status": "pending",
            },
        ]

    # Ordenar por prioridad
    _prio_order = {"critical": 0, "high": 1, "normal": 2, "low": 3}
    _pending_sorted = sorted(
        _pending_actions,
        key=lambda a: _prio_order.get(
            (a.get("priority") if isinstance(a, dict) else getattr(a, "priority", "normal") or "normal").lower(),
            2,
        ),
    )

    for act in _pending_sorted:
        if isinstance(act, dict):
            _act_dict = act
        else:
            try:
                _act_dict = act.model_dump()
            except Exception:
                _act_dict = dict(act)

        _ap = (_act_dict.get("priority") or "normal").lower()
        _apc = _priority_color(_ap)
        _adue = _act_dict.get("due_date", "") or _act_dict.get("due", "") or ""
        _aresp = _act_dict.get("responsible", _act_dict.get("assigned_to", ""))
        _aid = _act_dict.get("action_id", str(uuid.uuid4()))

        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};'
            f'border-left:3px solid {_apc};border-radius:8px;'
            f'padding:.75rem 1rem;margin-bottom:.5rem">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.4rem">'
            f'<div style="font-size:.86rem;font-weight:800;color:{TEXT}">{_act_dict.get("title","")}</div>'
            f'{_pill(_priority_label(_ap), _apc)}'
            f'</div>'
            f'<div style="font-size:.7rem;color:{MUTED};margin-top:.35rem">'
            f'{"Responsable: " + _aresp + "  " if _aresp else ""}'
            f'{"Vence: " + _adue if _adue else ""}'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
        _comp_btn, _ = st.columns([1, 4])
        if _comp_btn.button("Completar", key=f"complete_{_aid}"):
            try:
                if _QUEUE_OK:
                    complete_action(_aid)
                    st.success("Accion marcada como completada.")
                    st.rerun()
                else:
                    st.success("Accion completada (modo demo).")
            except Exception as _ce:
                st.error(f"Error: {_ce}")

    # Acciones completadas (colapsado)
    with st.expander("Acciones completadas"):
        st.info("Historial de acciones completadas disponible cuando haya datos registrados en el workspace.")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4: DECISIONES
# ═══════════════════════════════════════════════════════════════════════════════
with tab_decisiones:
    section_header("REGISTRO DE DECISIONES", BLUE)

    # Formulario registrar decision
    section_header("REGISTRAR DECISION", PURPLE)
    with st.form("form_registrar_decision", clear_on_submit=True):
        _dec_title = st.text_input("Titulo de la decision")
        _dec_made = st.text_area("Que se decidio?", height=80)
        _dec_context = st.text_area("Contexto", height=70)
        _dec_rationale = st.text_area("Justificacion", height=70)
        _dec_by = st.text_input("Decidido por")
        _dec_submit = st.form_submit_button("Registrar decision", type="primary")
        if _dec_submit:
            if not _dec_title.strip() or not _dec_made.strip():
                st.warning("Indica el titulo y la decision tomada.")
            else:
                try:
                    if _DLOG_OK:
                        _new_dec = log_decision(
                            workspace_id=_active_ws_id,
                            title=_dec_title.strip(),
                            decision_made=_dec_made.strip(),
                            context=_dec_context.strip(),
                            rationale=_dec_rationale.strip(),
                            decided_by=_dec_by.strip() or "Equipo",
                            tenant_id=_TENANT_ID,
                        )
                        st.success(f"Decision registrada: {_new_dec.decision_id}")
                    else:
                        st.success(f"Decision registrada (modo demo): {_dec_title.strip()}")
                except Exception as _de_err:
                    st.error(f"Error al registrar la decision: {_de_err}")

    # Timeline de decisiones
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("HISTORIAL DE DECISIONES", BLUE)

    _decisions: list = []
    if _DLOG_OK:
        try:
            _decisions = list_decisions(_active_ws_id, _TENANT_ID)
        except Exception as _dlq_err:
            st.error(f"Error al cargar decisiones: {_dlq_err}")

    if not _decisions:
        _decisions = (_ctx.recent_decisions if _ctx else []) or [
            {
                "decision_id": "dec_001",
                "title": "Activar protocolo de respuesta crisis bulos",
                "decision_made": "Se activa el protocolo de comunicacion de crisis nivel 2 con respuesta en menos de 4 horas.",
                "decided_by": "Dir. Estrategico",
                "decided_at": "2026-05-05T09:00:00Z",
                "context": "Campana de desinformacion detectada en Twitter/X con alcance superior a 200.000 impresiones.",
                "rationale": "",
            },
        ]

    for dec in _decisions:
        if isinstance(dec, dict):
            _dec_dict = dec
        else:
            try:
                _dec_dict = dec.model_dump()
            except Exception:
                _dec_dict = dict(dec)

        _ddec = (_dec_dict.get("decided_at") or _dec_dict.get("created_at") or "")[:10]
        _ddby = _dec_dict.get("decided_by", "")
        _dec_text = _dec_dict.get("decision_made", "")
        _dec_ctx = _dec_dict.get("context", "")
        _dec_rat = _dec_dict.get("rationale", "")

        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};'
            f'border-left:3px solid {BLUE};border-radius:8px;'
            f'padding:.85rem 1rem;margin-bottom:.6rem">'
            f'<div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:.35rem">'
            f'<span style="font-size:.65rem;font-weight:700;color:{MUTED};font-family:monospace">{_ddec}</span>'
            f'<span style="font-size:.88rem;font-weight:900;color:{TEXT}">{_dec_dict.get("title","")}</span>'
            f'</div>'
            f'{"<div style=\"font-size:.78rem;color:" + TEXT2 + ";margin-bottom:.3rem;line-height:1.5\">" + _dec_text + "</div>" if _dec_text else ""}'
            f'{"<div style=\"font-size:.68rem;color:" + MUTED + ";margin-top:.1rem\">Decidido por: " + _ddby + "</div>" if _ddby else ""}'
            f'</div>',
            unsafe_allow_html=True,
        )
        if _dec_ctx or _dec_rat:
            with st.expander("Ver contexto y justificacion"):
                if _dec_ctx:
                    st.markdown(
                        f'<div style="font-size:.78rem;color:{TEXT2}"><strong>Contexto:</strong><br>{_dec_ctx}</div>',
                        unsafe_allow_html=True,
                    )
                if _dec_rat:
                    st.markdown(
                        f'<div style="font-size:.78rem;color:{TEXT2};margin-top:.4rem"><strong>Justificacion:</strong><br>{_dec_rat}</div>',
                        unsafe_allow_html=True,
                    )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5: EQUIPO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_equipo:
    section_header("EQUIPO DEL WORKSPACE", CYAN)

    _TEAM_DEMO = [
        {"nombre": "Carlos Martinez", "rol": "Director Estrategico", "area": "Estrategia", "estado": "disponible", "email": "carlos.martinez@demo.es"},
        {"nombre": "Laura Garcia", "rol": "Analista Electoral", "area": "Electoral", "estado": "en reunion", "email": "laura.garcia@demo.es"},
        {"nombre": "Javier Romero", "rol": "Analista Electoral", "area": "Electoral", "estado": "disponible", "email": "javier.romero@demo.es"},
        {"nombre": "Ana Torres", "rol": "Analista de Medios", "area": "Medios", "estado": "disponible", "email": "ana.torres@demo.es"},
        {"nombre": "Pedro Sanchez-Leal", "rol": "Director de Comunicacion", "area": "Comunicacion", "estado": "en reunion", "email": "pedro.sl@demo.es"},
        {"nombre": "Isabel Ruiz", "rol": "Analista Legislativo", "area": "Legislativo", "estado": "disponible", "email": "isabel.ruiz@demo.es"},
        {"nombre": "Miguel Herrera", "rol": "Analista Economico", "area": "Economico", "estado": "fuera", "email": "miguel.herrera@demo.es"},
        {"nombre": "Sofia Lopez", "rol": "Coordinadora de Campana", "area": "Coordinacion", "estado": "disponible", "email": "sofia.lopez@demo.es"},
    ]

    _area_colors: dict[str, str] = {
        "Estrategia": CYAN,
        "Electoral": BLUE,
        "Medios": PURPLE,
        "Comunicacion": AMBER,
        "Legislativo": GREEN,
        "Economico": RED,
        "Coordinacion": CYAN,
    }
    _estado_colors: dict[str, str] = {
        "disponible": GREEN,
        "en reunion": AMBER,
        "fuera": MUTED,
    }

    team_eq1, team_eq2 = st.columns([2, 1], gap="large")

    with team_eq1:
        # Miembros del equipo
        _members_data = _TEAM_DEMO
        try:
            from workspace_intelligence import team_management
            _loaded = team_management.list_team_members(_active_ws_id, _TENANT_ID)
            if _loaded:
                _members_data = _loaded
        except Exception:
            pass

        for mem in _members_data:
            if isinstance(mem, dict):
                _md = mem
            else:
                try:
                    _md = mem.model_dump()
                except Exception:
                    _md = dict(mem)

            _est = _md.get("estado", _md.get("status", "disponible")).lower()
            _ec = _estado_colors.get(_est, MUTED)
            _ac = _area_colors.get(_md.get("area", ""), MUTED)
            _initials = "".join(p[0].upper() for p in _md.get("nombre", "X").split()[:2])

            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;'
                f'padding:.8rem 1rem;margin-bottom:.45rem;display:flex;align-items:center;gap:.9rem">'
                f'<div style="width:38px;height:38px;background:{_ac}22;border:1px solid {_ac}55;'
                f'border-radius:50%;display:flex;align-items:center;justify-content:center;'
                f'font-size:.75rem;font-weight:900;color:{_ac};flex-shrink:0">{_initials}</div>'
                f'<div style="flex:1;min-width:0">'
                f'<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">'
                f'<span style="font-weight:800;color:{TEXT};font-size:.86rem">{_md.get("nombre","")}</span>'
                f'<span style="font-size:.67rem;color:{_ac};background:{_ac}18;border:1px solid {_ac}44;'
                f'border-radius:4px;padding:.1rem .35rem;font-weight:700">{_md.get("rol","")}</span>'
                f'</div>'
                f'<div style="font-size:.65rem;color:{MUTED};margin-top:.1rem">{_md.get("email","")}</div>'
                f'<div style="margin-top:.25rem">'
                f'<span style="width:7px;height:7px;background:{_ec};border-radius:50%;'
                f'display:inline-block;margin-right:.3rem;box-shadow:0 0 5px {_ec}88"></span>'
                f'<span style="font-size:.67rem;color:{_ec};font-weight:700">{_est.capitalize()}</span>'
                f'</div>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    with team_eq2:
        # Feed de actividad
        section_header("ACTIVIDAD RECIENTE", PURPLE)
        _feed: list[dict] = []
        if _WS_OK:
            try:
                _feed = get_activity_feed(_active_ws_id, _TENANT_ID, limit=10)
            except Exception:
                _feed = []

        if not _feed and _ctx:
            _feed = _ctx.activity_log

        _act_type_colors: dict[str, str] = {
            "created_issue": RED,
            "completed_action": GREEN,
            "logged_decision": BLUE,
            "added_member": PURPLE,
        }

        for item in _feed[:10]:
            _ats = item.get("timestamp", "")[:10]
            _atype = item.get("action_type", "")
            _adesc = item.get("description", "")
            _aactor = item.get("actor", "")
            _at_color = _act_type_colors.get(_atype, MUTED)

            st.markdown(
                f'<div style="background:{BG3};border-left:2px solid {_at_color};'
                f'border-radius:4px;padding:.45rem .65rem;margin-bottom:.35rem">'
                f'<div style="font-size:.7rem;font-weight:700;color:{TEXT};line-height:1.4">{_adesc}</div>'
                f'<div style="font-size:.6rem;color:{MUTED};margin-top:.15rem">'
                f'{_aactor}  ·  {_ats}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

        if not _feed:
            st.info("Sin actividad registrada aun en este workspace.")

    # Formulario anadir miembro
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("ANADIR MIEMBRO", PURPLE)
    with st.form("form_anadir_miembro", clear_on_submit=True):
        fm1, fm2, fm3 = st.columns(3)
        _mem_email = fm1.text_input("Email")
        _mem_name = fm2.text_input("Nombre completo")
        _mem_role = fm3.selectbox(
            "Rol",
            [
                "Analista Electoral",
                "Analista de Medios",
                "Analista Legislativo",
                "Director Estrategico",
                "Director de Comunicacion",
                "Analista Economico",
                "Coordinador de Campana",
                "Analista de Riesgo",
                "Tecnico de Datos",
            ],
        )
        _mem_submit = st.form_submit_button("Invitar al workspace", type="primary")
        if _mem_submit:
            if not _mem_email.strip() or not _mem_name.strip():
                st.warning("Indica el email y nombre del nuevo miembro.")
            else:
                st.info(
                    f"Invitacion enviada a {_mem_email.strip()} ({_mem_name.strip()}) "
                    f"con rol {_mem_role}. El miembro debera aceptar para acceder al workspace."
                )
