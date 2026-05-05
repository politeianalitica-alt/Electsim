"""Command Palette — quick keyboard-driven navigation."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

try:  # Streamlit no es siempre necesario (tests sin UI)
    import streamlit as st  # type: ignore
except Exception:  # pragma: no cover
    st = None  # type: ignore


class Command(BaseModel):
    """Comando registrado en el palette."""

    model_config = ConfigDict(extra="forbid")

    id: str
    label: str
    category: str
    keywords: list[str] = Field(default_factory=list)
    action_type: str  # navigate / run_workflow / open_modal / external
    action_target: str
    shortcut: str = ""
    description: str = ""


def _navigate(label: str, target: str, category: str = "Navegar", keywords: list[str] | None = None) -> Command:
    return Command(
        id=f"nav_{target.replace('/', '_').replace('.', '_')}",
        label=label,
        category=category,
        keywords=keywords or [],
        action_type="navigate",
        action_target=target,
    )


def _workflow(workflow_id: str, label: str, keywords: list[str] | None = None) -> Command:
    return Command(
        id=f"wf_{workflow_id}",
        label=label,
        category="Workflows",
        keywords=(keywords or []) + ["workflow", "wizard"],
        action_type="run_workflow",
        action_target=workflow_id,
    )


def _action(cmd_id: str, label: str, target: str, category: str = "Acciones", keywords: list[str] | None = None, shortcut: str = "") -> Command:
    return Command(
        id=cmd_id,
        label=label,
        category=category,
        keywords=keywords or [],
        action_type="open_modal",
        action_target=target,
        shortcut=shortcut,
    )


_COMMANDS: list[Command] = [
    # --- Navegación a páginas N (núcleo) ---
    _navigate("Ir a Inicio", "dashboard/pages/N0_Inicio.py", keywords=["home", "inicio"]),
    _navigate("Ir a Briefings", "dashboard/pages/N1_Briefings.py", keywords=["briefing"]),
    _navigate("Ir a Investigación", "dashboard/pages/N_Investigacion.py", keywords=["research", "canvas"]),
    _navigate("Ir a Workspace", "dashboard/pages/D10_Workspace.py", keywords=["workspace"]),
    _navigate("Ir a Chat IA", "dashboard/pages/N8_ChatIA.py", keywords=["chat", "ia", "ai"]),
    _navigate("Ir a Equipo", "dashboard/pages/N9_Equipo.py", keywords=["team", "equipo"]),
    _navigate("Ir a Integraciones", "dashboard/pages/N_Integraciones.py", keywords=["integraciones", "drive", "slack", "github"]),
    _navigate("Ir a Preferencias", "dashboard/pages/N_Preferencias.py", keywords=["preferencias", "ajustes", "settings"]),
    _navigate("Ir a Login", "dashboard/pages/Login.py", keywords=["login", "sesion"]),
    _navigate("Ir a Workflows", "dashboard/pages/N_Workflows.py", keywords=["workflows", "wizard"]),
    # --- Navegación a páginas D (data) ---
    _navigate("Panel D1 — Electoral", "dashboard/pages/D1_Electoral.py", keywords=["electoral", "encuestas"]),
    _navigate("Panel D2 — Actores", "dashboard/pages/D2_Actores.py", keywords=["actores", "politicos"]),
    _navigate("Panel D3 — Legislativo", "dashboard/pages/D3_Legislativo.py", keywords=["legislativo", "boe"]),
    _navigate("Panel D4 — Medios", "dashboard/pages/D4_Medios.py", keywords=["medios", "press"]),
    _navigate("Panel D5 — Economía", "dashboard/pages/D5_Economia.py", keywords=["economia", "ine"]),
    _navigate("Panel D6 — Alertas", "dashboard/pages/D6_Alertas.py", keywords=["alertas", "alarms"]),
    _navigate("Panel D7 — Territorio", "dashboard/pages/D7_Territorio.py", keywords=["territorio", "mapa"]),
    _navigate("Panel D8 — Geopolítica", "dashboard/pages/D8_Geopolitica.py", keywords=["geopolitica"]),
    _navigate("Panel D9 — Comunicación", "dashboard/pages/D9_Communication.py", keywords=["comunicacion", "comms"]),
    _navigate("Panel D10 — Workspace", "dashboard/pages/D10_Workspace.py", keywords=["workspace"]),
    # --- Workflows ---
    _workflow("rapid_briefing", "Iniciar workflow: Briefing rápido", keywords=["briefing"]),
    _workflow("crisis_response", "Iniciar workflow: Respuesta a crisis", keywords=["crisis"]),
    _workflow("actor_dossier", "Iniciar workflow: Crear dossier de actor", keywords=["dossier", "actor"]),
    _workflow("narrative_response", "Iniciar workflow: Respuesta a narrativa rival", keywords=["narrativa"]),
    _workflow("weekly_planning", "Iniciar workflow: Planificación semanal", keywords=["planning", "semanal"]),
    _workflow("press_conference_prep", "Iniciar workflow: Preparar rueda de prensa", keywords=["prensa", "rueda"]),
    _workflow("election_simulation", "Iniciar workflow: Simulación electoral", keywords=["simular", "electoral"]),
    _workflow("stakeholder_outreach", "Iniciar workflow: Outreach a stakeholders", keywords=["outreach", "crm"]),
    # --- Acciones rápidas ---
    _action("export_briefing", "Exportar briefing actual", "export_briefing", keywords=["exportar", "pdf"], shortcut="Cmd+E"),
    _action("refresh_data", "Refrescar datos", "refresh_data", keywords=["refresh", "actualizar"], shortcut="R"),
    _action("mark_all_read", "Marcar todas las alertas como leídas", "mark_all_read", keywords=["alertas", "leido"]),
    _action("lock_screen", "Bloquear sesión", "lock_screen", keywords=["bloquear", "lock"]),
    _action("switch_workspace", "Cambiar de workspace", "switch_workspace", keywords=["cambiar", "workspace"], shortcut="Cmd+Shift+P"),
    _action("save_draft", "Guardar borrador", "save_draft", keywords=["guardar", "draft"], shortcut="Cmd+S"),
    _action("new_note", "Crear nota nueva", "new_note", keywords=["nota", "note"], shortcut="N"),
    _action("toggle_theme", "Cambiar tema visual", "toggle_theme", keywords=["tema", "theme"]),
    _action("open_help", "Mostrar ayuda y atajos", "open_help", keywords=["ayuda", "help"], shortcut="?"),
    _action("logout", "Cerrar sesión", "logout", keywords=["logout", "salir"]),
    # Compleción a 40+
    _action("open_settings", "Abrir ajustes", "open_settings", keywords=["ajustes", "settings"]),
    _action("show_shortcuts", "Mostrar atajos de teclado", "show_shortcuts", keywords=["atajos", "shortcuts"]),
]


def register_command(cmd: Command) -> None:
    """Registra un comando adicional en el palette."""
    _COMMANDS.append(cmd)


def _score(cmd: Command, query: str) -> int:
    """Puntúa un comando frente a una query."""
    if not query:
        return 1
    q = query.lower().strip()
    label = cmd.label.lower()
    if label == q:
        return 1000
    if label.startswith(q):
        return 500
    score = 0
    if q in label:
        score += 200
    for kw in cmd.keywords:
        if kw.lower() == q:
            score += 150
        elif q in kw.lower():
            score += 80
    if q in cmd.category.lower():
        score += 40
    if q in cmd.id.lower():
        score += 20
    return score


def search_commands(query: str, limit: int = 10) -> list[Command]:
    """Busca comandos por label, keywords o categoría con ranking simple."""
    if not query:
        return _COMMANDS[:limit]
    scored = [(_score(c, query), c) for c in _COMMANDS]
    scored = [(s, c) for s, c in scored if s > 0]
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:limit]]


def get_command_categories() -> list[str]:
    """Devuelve la lista única de categorías existentes."""
    seen: list[str] = []
    for c in _COMMANDS:
        if c.category not in seen:
            seen.append(c.category)
    return seen


# ---------------------------------------------------------------------------
# UI Streamlit
# ---------------------------------------------------------------------------


_PALETTE_CSS = """
<style>
.cmd-palette-overlay {
  background: #0D1320;
  border: 1px solid #1E293B;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 20px 60px rgba(0, 212, 255, 0.15);
}
.cmd-palette-hint {
  color: #475569;
  font-size: 12px;
  margin-top: 8px;
  text-align: right;
}
.cmd-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  margin-bottom: 4px;
}
.cmd-row:hover { border-color: #00D4FF; background: #111827; }
.cmd-label { color: #E2E8F0; font-weight: 500; }
.cmd-cat {
  color: #94A3B8;
  background: #111827;
  border: 1px solid #1E293B;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}
.cmd-shortcut {
  color: #475569; font-size: 11px; font-family: ui-monospace, monospace;
}
</style>
"""


def render_command_palette() -> None:
    """Renderiza el palette si está activo en session_state."""
    if st is None:
        return
    if not st.session_state.get("show_palette"):
        return

    st.markdown(_PALETTE_CSS, unsafe_allow_html=True)
    with st.container():
        st.markdown('<div class="cmd-palette-overlay">', unsafe_allow_html=True)
        query = st.text_input(
            "Buscar",
            value=st.session_state.get("palette_query", ""),
            placeholder="Buscar comandos, páginas, acciones...",
            key="palette_query_input",
            label_visibility="collapsed",
        )
        results = search_commands(query, limit=15)
        for cmd in results:
            cols = st.columns([6, 2, 1, 2])
            with cols[0]:
                st.markdown(f'<span class="cmd-label">{cmd.label}</span>', unsafe_allow_html=True)
            with cols[1]:
                st.markdown(f'<span class="cmd-cat">{cmd.category}</span>', unsafe_allow_html=True)
            with cols[2]:
                if cmd.shortcut:
                    st.markdown(f'<span class="cmd-shortcut">{cmd.shortcut}</span>', unsafe_allow_html=True)
            with cols[3]:
                if st.button("Ejecutar", key=f"palette_run_{cmd.id}"):
                    _execute_command(cmd)
        st.markdown(
            '<div class="cmd-palette-hint">Esc para cerrar · ↑↓ para navegar · ↵ para ejecutar</div>',
            unsafe_allow_html=True,
        )
        st.markdown("</div>", unsafe_allow_html=True)


def _execute_command(cmd: Command) -> None:  # pragma: no cover - UI side-effect
    if st is None:
        return
    if cmd.action_type == "navigate":
        try:
            st.switch_page(cmd.action_target)
        except Exception:
            st.session_state["pending_navigation"] = cmd.action_target
    elif cmd.action_type == "run_workflow":
        st.session_state["active_workflow"] = cmd.action_target
        st.session_state["show_palette"] = False
    elif cmd.action_type == "open_modal":
        st.session_state[f"modal_{cmd.action_target}"] = True
        st.session_state["show_palette"] = False
    elif cmd.action_type == "external":
        st.session_state["external_link"] = cmd.action_target
    st.session_state["show_palette"] = False


def render_palette_trigger() -> None:
    """Botón pequeño para sidebar que activa el palette."""
    if st is None:
        return
    if st.button("Buscar (Cmd+K)", key="palette_trigger_btn", use_container_width=True):
        st.session_state["show_palette"] = True
