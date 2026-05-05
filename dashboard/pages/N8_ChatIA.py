"""
Politeia Brain — ElectSim Espana.
Asistente de inteligencia politica con acceso al contexto de la plataforma.
"""
from __future__ import annotations

import sys
import time
from datetime import datetime
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, TEXT, TEXT2, MUTED, GREEN,
)

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="Politeia Brain — ElectSim",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()

# ---------------------------------------------------------------------------
# Import Brain service
# ---------------------------------------------------------------------------
try:
    from agents.brain.politeia_brain import (
        ask_brain,
        get_available_model,
        is_brain_available,
        BrainQuery,
    )
    _BRAIN_OK = True
except Exception as _e:
    _BRAIN_OK = False

    def ask_brain(query):  # type: ignore[misc]
        from types import SimpleNamespace
        return SimpleNamespace(
            answer="Motor de IA no disponible.",
            model_used="demo",
            latency_ms=0,
            from_cache=False,
            ok=False,
            error=str(_e),
            context_used=False,
        )

    def get_available_model() -> str:  # type: ignore[misc]
        return "Demo (sin modelo)"

    def is_brain_available() -> bool:  # type: ignore[misc]
        return False

    class BrainQuery:  # type: ignore[misc]
        def __init__(self, **kw):
            for k, v in kw.items():
                setattr(self, k, v)

# ---------------------------------------------------------------------------
# Session state init
# ---------------------------------------------------------------------------
if "brain_messages" not in st.session_state:
    st.session_state["brain_messages"] = []
if "brain_context" not in st.session_state:
    st.session_state["brain_context"] = ""
if "brain_suggested" not in st.session_state:
    st.session_state["brain_suggested"] = ""

# ---------------------------------------------------------------------------
# Handle suggested question (set by button clicks before page re-render)
# ---------------------------------------------------------------------------
_pending_question: str = ""
if st.session_state.get("brain_suggested"):
    _pending_question = st.session_state.pop("brain_suggested")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_RED = "#EF4444"


def _model_chip(model_name: str) -> str:
    if model_name == "Demo (sin modelo)":
        dot_color = _RED
    else:
        dot_color = GREEN
    return (
        f"<span style='background:{BG3};border:1px solid {BORDER};"
        f"border-radius:20px;padding:2px 10px;font-size:.78rem;color:{TEXT2};'>"
        f"<span style='color:{dot_color};'>&#9679;</span> {model_name}</span>"
    )


def _render_message(role: str, content: str, ts: str = "") -> None:
    if role == "user":
        st.markdown(
            f"""<div style='display:flex;justify-content:flex-end;margin:.35rem 0;'>
            <div style='background:{BG3};border:1px solid {BORDER};
            border-radius:16px 16px 4px 16px;padding:.65rem 1rem;
            max-width:78%;color:{TEXT};font-size:.88rem;line-height:1.6;'>
            <span style='color:{MUTED};font-size:.72rem;display:block;margin-bottom:.25rem;'>
            Tu {ts}</span>
            {content.replace(chr(10), "<br>")}
            </div></div>""",
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            f"""<div style='display:flex;justify-content:flex-start;margin:.35rem 0;'>
            <div style='background:{BG2};border:1px solid {BORDER};
            border-left:3px solid {CYAN};
            border-radius:4px 16px 16px 16px;padding:.65rem 1rem;
            max-width:82%;color:{TEXT};font-size:.88rem;line-height:1.6;'>
            <span style='color:{MUTED};font-size:.72rem;display:block;margin-bottom:.25rem;'>
            Brain {ts}</span>
            {content.replace(chr(10), "<br>")}
            </div></div>""",
            unsafe_allow_html=True,
        )


def _process_question(question: str) -> None:
    """Envia una pregunta al brain y actualiza el historial."""
    ts = datetime.now().strftime("%H:%M")
    st.session_state["brain_messages"].append(
        {"role": "user", "content": question, "ts": ts}
    )

    context = st.session_state.get("brain_context", "")
    history = [
        {"role": m["role"], "content": m["content"]}
        for m in st.session_state["brain_messages"][:-1][-12:]
    ]

    try:
        query = BrainQuery(
            question=question,
            context=context,
            user_id=st.session_state.get("user_id", ""),
            workspace_id=st.session_state.get("workspace_id", "default"),
            conversation_history=history,
        )
        with st.spinner("Analizando..."):
            response = ask_brain(query)
        answer = response.answer if hasattr(response, "answer") else str(response)
    except Exception as exc:
        answer = f"Error al procesar la consulta: {exc}"

    st.session_state["brain_messages"].append(
        {"role": "assistant", "content": answer, "ts": ts}
    )
    st.rerun()


# ---------------------------------------------------------------------------
# Process any pending question from suggested-question buttons
# ---------------------------------------------------------------------------
if _pending_question:
    _process_question(_pending_question)

# ---------------------------------------------------------------------------
# Layout: two columns [3, 1]
# ---------------------------------------------------------------------------
col_main, col_side = st.columns([3, 1])

# ============================================================
# LEFT COLUMN — chat
# ============================================================
with col_main:

    # Header card
    model_name = get_available_model()
    st.markdown(
        f"""<div style='background:{BG2};border:1px solid {BORDER};
        border-left:4px solid {CYAN};border-radius:10px;
        padding:1.1rem 1.5rem;margin-bottom:1rem;'>
        <h1 style='color:{CYAN};margin:0;font-size:1.7rem;font-weight:700;'>
        Politeia Brain</h1>
        <p style='color:{TEXT2};margin:.3rem 0 .6rem;font-size:.88rem;'>
        Asistente de inteligencia politica</p>
        {_model_chip(model_name)}
        </div>""",
        unsafe_allow_html=True,
    )

    # Context injection banner
    if st.session_state.get("brain_context"):
        ctx_preview = st.session_state["brain_context"][:80]
        banner_cols = st.columns([6, 1])
        with banner_cols[0]:
            st.markdown(
                f"""<div style='background:#451a03;border:1px solid #92400e;
                border-radius:8px;padding:.5rem .9rem;font-size:.8rem;
                color:#fbbf24;margin-bottom:.5rem;'>
                Contexto de investigacion activo: {ctx_preview}...
                </div>""",
                unsafe_allow_html=True,
            )
        with banner_cols[1]:
            if st.button("Limpiar", key="clear_context_banner", use_container_width=True):
                st.session_state["brain_context"] = ""
                st.rerun()

    # Chat history
    messages = st.session_state["brain_messages"]

    if not messages:
        st.markdown(
            f"""<div style='background:{BG2};border:1px dashed {BORDER};
            border-radius:10px;padding:2.5rem;text-align:center;
            color:{MUTED};margin:.5rem 0 1rem;'>
            <p style='font-size:1rem;margin:0 0 .5rem;color:{TEXT2};'>
            Bienvenido a Politeia Brain</p>
            <p style='font-size:.85rem;margin:0;'>
            Haz una pregunta sobre la situacion politica espanola,<br>
            encuestas, coalicion, legislacion o estrategia.</p>
            </div>""",
            unsafe_allow_html=True,
        )

        # Suggested questions
        st.markdown(
            f"<p style='color:{TEXT2};font-size:.82rem;margin:.5rem 0 .3rem;'>"
            "Preguntas sugeridas:</p>",
            unsafe_allow_html=True,
        )
        suggestions = [
            "Cual es la situacion actual de las encuestas electorales?",
            "Explica la composicion actual del Congreso de los Diputados",
            "Cuales son los principales riesgos politicos para el gobierno?",
            "Analiza el estado de las negociaciones de coalicion",
        ]
        sug_cols = st.columns(2)
        for idx, sug in enumerate(suggestions):
            col = sug_cols[idx % 2]
            with col:
                if st.button(
                    sug,
                    key=f"sug_{idx}",
                    use_container_width=True,
                ):
                    st.session_state["brain_suggested"] = sug
                    st.rerun()
    else:
        for msg in messages:
            _render_message(msg["role"], msg["content"], msg.get("ts", ""))

    # Chat input
    try:
        user_question = st.chat_input("Pregunta al Brain...")
        if user_question and user_question.strip():
            _process_question(user_question.strip())
    except Exception:
        # Fallback for older Streamlit without chat_input
        fallback_cols = st.columns([6, 1])
        with fallback_cols[0]:
            fb_default = st.session_state.pop("brain_fallback_input", "")
            user_fb = st.text_input(
                "Pregunta",
                value=fb_default,
                placeholder="Pregunta al Brain...",
                label_visibility="collapsed",
                key="brain_fallback_text",
            )
        with fallback_cols[1]:
            if st.button("Enviar", key="brain_fallback_send", use_container_width=True):
                if user_fb and user_fb.strip():
                    _process_question(user_fb.strip())


# ============================================================
# RIGHT COLUMN — context & controls
# ============================================================
with col_side:

    # --- Contexto activo ---
    st.markdown(
        f"<p style='color:{CYAN};font-size:.82rem;font-weight:700;"
        f"text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem;'>"
        "Contexto activo</p>",
        unsafe_allow_html=True,
    )

    workspace_id = st.session_state.get("workspace_id", "default")
    user_id = st.session_state.get("user_id", "")

    st.markdown(
        f"<div style='font-size:.78rem;color:{TEXT2};margin-bottom:.5rem;'>"
        f"Workspace: <span style='color:{TEXT};'>{workspace_id}</span>"
        + (f"<br>Usuario: <span style='color:{TEXT};'>{user_id}</span>" if user_id else "")
        + "</div>",
        unsafe_allow_html=True,
    )

    with st.expander("Anadir contexto del sistema"):
        include_briefing = st.checkbox("Incluir briefing matinal", key="ctx_briefing")
        include_alerts = st.checkbox("Incluir alertas activas", key="ctx_alerts")
        include_narratives = st.checkbox("Incluir narrativas activas", key="ctx_narratives")

        if st.button("Aplicar contexto", key="btn_apply_context", use_container_width=True):
            ctx_parts: list[str] = []

            if include_briefing:
                try:
                    from dashboard.services.brain_service import obtener_estado_dashboard  # type: ignore[import]
                    estado = obtener_estado_dashboard()
                    briefing = estado.get("briefing") or estado.get("resumen_ejecutivo") or ""
                    if briefing:
                        ctx_parts.append(f"BRIEFING MATINAL:\n{str(briefing)[:600]}")
                except Exception:
                    ctx_parts.append("BRIEFING MATINAL: No disponible")

            if include_alerts:
                try:
                    from dashboard.services import alertas_service  # type: ignore[import]
                    alertas = alertas_service.cargar_alertas_criticas(limit=3)
                    if alertas:
                        lines = []
                        for a in alertas[:3]:
                            titulo = a.get("titulo", "") or getattr(a, "titulo", "")
                            lines.append(f"- {titulo}")
                        ctx_parts.append("ALERTAS CRITICAS:\n" + "\n".join(lines))
                except Exception:
                    ctx_parts.append("ALERTAS: No disponibles")

            if include_narratives:
                try:
                    from dashboard.services import media_service  # type: ignore[import]
                    narrativas = media_service.cargar_narrativas_activas(limit=3)
                    if narrativas:
                        lines = []
                        for n in narrativas[:3]:
                            titulo = n.get("titulo", "") or getattr(n, "titulo", "")
                            lines.append(f"- {titulo}")
                        ctx_parts.append("NARRATIVAS ACTIVAS:\n" + "\n".join(lines))
                except Exception:
                    ctx_parts.append("NARRATIVAS: No disponibles")

            if ctx_parts:
                st.session_state["brain_context"] = "\n\n".join(ctx_parts)
                st.success("Contexto aplicado")
            else:
                st.info("Selecciona al menos una fuente de contexto")
            st.rerun()

    st.markdown("<hr style='border-color:" + BORDER + ";margin:.7rem 0;'>", unsafe_allow_html=True)

    # --- Historial ---
    st.markdown(
        f"<p style='color:{CYAN};font-size:.82rem;font-weight:700;"
        f"text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem;'>"
        "Historial</p>",
        unsafe_allow_html=True,
    )

    n_msgs = len(st.session_state["brain_messages"])
    st.markdown(
        f"<div style='font-size:.8rem;color:{TEXT2};margin-bottom:.4rem;'>"
        f"Mensajes en sesion: <span style='color:{TEXT};font-weight:600;'>{n_msgs}</span>"
        "</div>",
        unsafe_allow_html=True,
    )

    if st.button("Nueva conversacion", key="btn_new_chat", use_container_width=True):
        st.session_state["brain_messages"] = []
        st.rerun()

    st.markdown("<hr style='border-color:" + BORDER + ";margin:.7rem 0;'>", unsafe_allow_html=True)

    # --- Modelo activo ---
    st.markdown(
        f"<p style='color:{CYAN};font-size:.82rem;font-weight:700;"
        f"text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem;'>"
        "Modelo activo</p>",
        unsafe_allow_html=True,
    )

    st.markdown(
        f"<div style='font-size:.82rem;margin-bottom:.5rem;'>"
        f"{_model_chip(model_name)}</div>",
        unsafe_allow_html=True,
    )

    if model_name == "Demo (sin modelo)":
        st.markdown(
            f"""<div style='background:{BG3};border:1px solid {BORDER};
            border-radius:8px;padding:.65rem;font-size:.76rem;color:{TEXT2};
            line-height:1.6;'>
            Para activar respuestas en tiempo real:<br>
            <span style='color:{TEXT};'>Groq (gratuito):</span><br>
            <code style='font-size:.7rem;'>GROQ_API_KEY=tu_clave</code><br><br>
            <span style='color:{TEXT};'>Ollama (local):</span><br>
            Instala Ollama y ejecuta<br>
            <code style='font-size:.7rem;'>ollama serve</code>
            </div>""",
            unsafe_allow_html=True,
        )
    else:
        available = is_brain_available()
        status_color = GREEN if available else _RED
        status_text = "Operativo" if available else "No disponible"
        st.markdown(
            f"<div style='font-size:.8rem;color:{status_color};margin-top:.3rem;'>"
            f"Estado: {status_text}</div>",
            unsafe_allow_html=True,
        )
