"""
Brain Widget — Componente reutilizable de IA para todos los módulos
===================================================================
Proporciona widgets de Politeia Brain que cualquier página puede importar
para añadir análisis IA, insights y razonamiento Ollama directamente.

Uso:
    from dashboard.components.brain_widget import (
        brain_sidebar_status,
        brain_insight_card,
        brain_analysis_panel,
        brain_inline_chat,
    )

    # En sidebar
    brain_sidebar_status()

    # En una card de análisis
    brain_insight_card("coalicion", datos_especificos=escanos_dict)

    # Panel completo de análisis
    brain_analysis_panel("electoral", altura=300)
"""
from __future__ import annotations

import time
from datetime import datetime
from typing import Any

import streamlit as st

# ── Colores del sistema ───────────────────────────────────────────────────────
try:
    from dashboard.shared import (
        BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN, TEXT, TEXT2, MUTED,
    )
except ImportError:
    BG2 = "#0d1117"; BG3 = "#161b22"; BORDER = "#30363d"
    CYAN = "#00b4d8"; BLUE = "#1565c0"; PURPLE = "#7c3aed"
    AMBER = "#f59e0b"; RED = "#ef4444"; GREEN = "#22c55e"
    TEXT = "#e6edf3"; TEXT2 = "#8b949e"; MUTED = "#484f58"


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS INTERNOS
# ═══════════════════════════════════════════════════════════════════════════════

def _get_brain():
    try:
        from dashboard.services import brain_service as brain
        return brain
    except Exception:
        return None


def _get_llm():
    try:
        from dashboard.services import llm_local as llm
        return llm
    except Exception:
        return None


def _get_ingestion():
    try:
        from dashboard.services import brain_auto_ingestion as ing
        return ing
    except Exception:
        return None


def _llm_ok() -> bool:
    llm = _get_llm()
    if not llm:
        return False
    return llm.esta_disponible()


def _modelo_label() -> str:
    llm = _get_llm()
    if not llm:
        return "sin IA"
    s = llm.disponible()
    mod = s.get("modelo_activo", "")
    return mod.split(":")[0] if mod else "sin IA"


# ═══════════════════════════════════════════════════════════════════════════════
# WIDGET 1 — Status chip para sidebar
# ═══════════════════════════════════════════════════════════════════════════════

def brain_sidebar_status(expandido: bool = False) -> None:
    """
    Muestra el estado del brain en el sidebar con indicador de actividad.
    Incluye botón para ir a la página del brain.
    """
    llm_ok = _llm_ok()
    modelo = _modelo_label()

    if llm_ok:
        st.markdown(
            f"""<div style='background:linear-gradient(135deg,{PURPLE}22,{CYAN}10);
            border:1px solid {CYAN}44;border-radius:8px;padding:.5rem .75rem;margin:.5rem 0;'>
            <div style='display:flex;align-items:center;gap:.4rem;'>
            <span style='color:{GREEN};font-size:.8rem;'>●</span>
            <span style='color:{CYAN};font-size:.8rem;font-weight:600;'> Brain</span>
            <span style='color:{TEXT2};font-size:.72rem;margin-left:auto;'>{modelo}</span>
            </div></div>""",
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            f"""<div style='background:{BG2};border:1px solid {BORDER};
            border-radius:8px;padding:.5rem .75rem;margin:.5rem 0;'>
            <div style='display:flex;align-items:center;gap:.4rem;'>
            <span style='color:{MUTED};font-size:.8rem;'>●</span>
            <span style='color:{MUTED};font-size:.8rem;'> Brain</span>
            <span style='color:{RED};font-size:.72rem;margin-left:auto;'>offline</span>
            </div></div>""",
            unsafe_allow_html=True,
        )

    if expandido and llm_ok:
        ing = _get_ingestion()
        if ing:
            est = ing.estado_worker()
            if est.get("running"):
                st.caption(f"Ingesta activa · {est['total_indexado']} docs")
            else:
                st.caption("⏸ Ingesta pausada")


# ═══════════════════════════════════════════════════════════════════════════════
# WIDGET 2 — Insight card para módulos
# ═══════════════════════════════════════════════════════════════════════════════

def brain_insight_card(
    modulo: str,
    datos_especificos: dict | None = None,
    titulo_override: str = "",
    key_suffix: str = "",
    altura: int = 0,
) -> None:
    """
    Card compacta con insight IA del módulo actual.
    Se puede embeber en cualquier página.

    Args:
        modulo: 'electoral' | 'coalicion' | 'riesgo' | 'medios' | 'legislativo' | ...
        datos_especificos: Datos del módulo para enriquecer el análisis
        titulo_override: Título personalizado (por defecto usa el módulo)
        key_suffix: Sufijo para las keys de Streamlit (evitar colisiones)
        altura: Altura mínima del contenedor en px (0 = auto)
    """
    titulo = titulo_override or f"Brain — {modulo.capitalize()}"
    cache_key = f"brain_card_{modulo}_{key_suffix}"

    with st.container():
        col_tit, col_btn = st.columns([3, 1])
        with col_tit:
            st.markdown(
                f"<span style='color:{CYAN};font-size:.85rem;font-weight:600;'>{titulo}</span>",
                unsafe_allow_html=True,
            )
        with col_btn:
            if st.button(
                "✨ Analizar",
                key=f"insight_btn_{modulo}_{key_suffix}",
                use_container_width=True,
                disabled=not _llm_ok(),
                help="Generar análisis IA de este módulo",
            ):
                st.session_state[cache_key] = None  # Forzar re-análisis
                st.session_state[f"{cache_key}_loading"] = True

        # Comprobar si hay que generar
        if st.session_state.get(f"{cache_key}_loading"):
            with st.spinner("Razonando…"):
                brain = _get_brain()
                if brain:
                    resultado = brain.analizar_modulo(
                        modulo=modulo,
                        datos_especificos=datos_especificos,
                        stream=False,
                    )
                    st.session_state[cache_key] = str(resultado)
                st.session_state.pop(f"{cache_key}_loading", None)
                st.rerun()

        # Mostrar resultado
        resultado = st.session_state.get(cache_key)
        estilo_h = f"min-height:{altura}px;"if altura > 0 else ""
        if resultado:
            st.markdown(
                f"""<div style='background:linear-gradient(135deg,{PURPLE}15,{CYAN}08);
                border:1px solid {PURPLE}44;border-radius:8px;padding:.8rem;
                font-size:.83rem;color:{TEXT};line-height:1.6;{estilo_h}'>
                {resultado.replace(chr(10), "<br>").replace("**", "<b>")[:1200]}
                </div>""",
                unsafe_allow_html=True,
            )
        elif _llm_ok():
            st.markdown(
                f"""<div style='background:{BG2};border:1px dashed {BORDER};
                border-radius:8px;padding:.8rem;text-align:center;color:{MUTED};
                font-size:.82rem;{estilo_h}'>
                Pulsa "✨ Analizar"para que el brain analice este módulo
                </div>""",
                unsafe_allow_html=True,
            )
        else:
            st.markdown(
                f"""<div style='background:{BG2};border:1px dashed {BORDER};
                border-radius:8px;padding:.6rem;color:{MUTED};font-size:.78rem;'>
                ● Inicia Ollama para activar el análisis IA de este módulo
                </div>""",
                unsafe_allow_html=True,
            )


# ═══════════════════════════════════════════════════════════════════════════════
# WIDGET 3 — Panel de análisis completo con streaming
# ═══════════════════════════════════════════════════════════════════════════════

def brain_analysis_panel(
    foco: str = "general",
    titulo: str = "",
    key_prefix: str = "",
    show_controls: bool = True,
) -> None:
    """
    Panel de análisis completo con streaming visible.
    Ideal para páginas que quieren mostrar el razonamiento en tiempo real.
    """
    cache_key = f"brain_panel_{foco}_{key_prefix}"
    t_titulo = titulo or f"Análisis IA — {foco.capitalize()}"

    st.markdown(
        f"<h4 style='color:{CYAN};margin-bottom:.3rem;'>{t_titulo}</h4>",
        unsafe_allow_html=True,
    )

    if show_controls:
        c1, c2, c3 = st.columns([2, 1, 1])
        with c1:
            pass
        with c2:
            forzar = st.checkbox(
                "Forzar", key=f"{cache_key}_force",
                help="Ignorar caché y regenerar análisis",
            )
        with c3:
            btn = st.button(
                "▶ Analizar",
                key=f"{cache_key}_btn",
                type="primary",
                use_container_width=True,
                disabled=not _llm_ok(),
            )
    else:
        btn = False
        forzar = False

    resultado_guardado = st.session_state.get(cache_key)

    if btn and _llm_ok():
        brain = _get_brain()
        if brain:
            texto = ""
            placeholder = st.empty()
            try:
                gen = brain.razonar_situacion(foco=foco, stream=True, force_refresh=forzar)
                if hasattr(gen, "__iter__") and not isinstance(gen, str):
                    for token in gen:
                        texto += token
                        placeholder.markdown(
                            f"""<div style='background:{BG2};border:1px solid {PURPLE}44;
                            border-radius:8px;padding:1rem;color:{TEXT};
                            font-size:.86rem;line-height:1.7;'>
                            <span style='color:{CYAN};font-size:.72rem;'>
                             Razonando en tiempo real…</span><br><br>
                            {texto}▌</div>""",
                            unsafe_allow_html=True,
                        )
                else:
                    texto = str(gen)
            except Exception as exc:
                texto = f"Error: {exc}"
            st.session_state[cache_key] = texto
            st.rerun()

    elif resultado_guardado:
        st.markdown(
            f"""<div style='background:{BG2};border:1px solid {PURPLE}44;
            border-radius:8px;padding:1rem;color:{TEXT};
            font-size:.86rem;line-height:1.7;'>
            {resultado_guardado.replace(chr(10), "<br>")}
            </div>""",
            unsafe_allow_html=True,
        )
        if st.button("Limpiar", key=f"{cache_key}_clear"):
            del st.session_state[cache_key]
            st.rerun()
    else:
        st.markdown(
            f"""<div style='background:{BG2};border:1px dashed {BORDER};
            border-radius:8px;padding:2rem;text-align:center;color:{MUTED};'>
            <div style='font-size:2rem;'></div>
            <p style='margin:.5rem 0 0;'>Pulsa "▶ Analizar"para iniciar el razonamiento</p>
            </div>""",
            unsafe_allow_html=True,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# WIDGET 4 — Mini chat inline para cualquier módulo
# ═══════════════════════════════════════════════════════════════════════════════

def brain_inline_chat(
    modulo_origen: str = "general",
    placeholder: str = "Pregunta al brain sobre este módulo…",
    key_prefix: str = "",
    preguntas_sugeridas: list[str] | None = None,
) -> None:
    """
    Mini chat inline que cualquier módulo puede embeber.
    Tiene contexto completo del dashboard.
    """
    chat_key = f"brain_inline_{modulo_origen}_{key_prefix}"
    if chat_key not in st.session_state:
        st.session_state[chat_key] = []

    # Preguntas sugeridas
    if preguntas_sugeridas:
        cols = st.columns(len(preguntas_sugeridas))
        for i, pregunta in enumerate(preguntas_sugeridas):
            with cols[i]:
                if st.button(
                    f" {pregunta[:22]}…"if len(pregunta) > 22 else f" {pregunta}",
                    key=f"{chat_key}_sug_{i}",
                    use_container_width=True,
                ):
                    st.session_state[f"{chat_key}_pending"] = pregunta

    # Mostrar historial
    historia = st.session_state[chat_key]
    if historia:
        for msg in historia[-6:]:
            if msg["role"] == "user":
                st.markdown(
                    f"<div style='background:{BG3};border-radius:6px;padding:.4rem .7rem;"
                    f"margin:2px 0 2px 30%;font-size:.82rem;color:{TEXT2};'>"
                    f" {msg['content']}</div>",
                    unsafe_allow_html=True,
                )
            else:
                st.markdown(
                    f"<div style='background:linear-gradient(135deg,{PURPLE}18,{CYAN}08);border-radius:6px;"
                    f"padding:.4rem .7rem;margin:2px 30% 2px 0;font-size:.82rem;color:{TEXT};'>"
                    f" {msg['content']}</div>",
                    unsafe_allow_html=True,
                )

    # Input
    col_inp, col_btn = st.columns([5, 1])
    pending = st.session_state.pop(f"{chat_key}_pending", "")
    with col_inp:
        user_input = st.text_input(
            "Pregunta",
            value=pending,
            placeholder=placeholder,
            label_visibility="collapsed",
            key=f"{chat_key}_input",
        )
    with col_btn:
        enviar = st.button("➤", key=f"{chat_key}_send", use_container_width=True)

    if (enviar or pending) and (user_input or pending):
        texto = user_input or pending
        ts = datetime.now().strftime("%H:%M")
        st.session_state[chat_key].append({"role": "user", "content": texto})

        brain = _get_brain()
        if brain and _llm_ok():
            with st.spinner("Razonando…"):
                respuesta = brain.chat_con_contexto_total(
                    texto,
                    historia=st.session_state[chat_key][-8:],
                    modulo_origen=modulo_origen,
                    stream=False,
                )
                st.session_state[chat_key].append({
                    "role": "assistant",
                    "content": str(respuesta),
                })
        else:
            st.session_state[chat_key].append({
                "role": "assistant",
                "content": "⚠ Sin motor IA disponible. Activa Ollama.",
            })
        st.rerun()


# ═══════════════════════════════════════════════════════════════════════════════
# WIDGET 5 — Metric card enriquecida con contexto IA
# ═══════════════════════════════════════════════════════════════════════════════

def brain_metric_insight(
    label: str,
    valor: str | float,
    tema: str = "",
    key_suffix: str = "",
) -> None:
    """
    Metric card con insight IA generado automáticamente.
    Muestra el valor y un insight contextual de 1 frase.
    """
    insight_key = f"brain_metric_{tema or label}_{key_suffix}"

    # Mostrar métrica
    st.metric(label, valor)

    # Obtener insight si no hay
    if insight_key not in st.session_state and _llm_ok():
        brain = _get_brain()
        if brain:
            try:
                insight = brain.insight_rapido(tema or label)
                st.session_state[insight_key] = insight
            except Exception:
                st.session_state[insight_key] = ""

    insight = st.session_state.get(insight_key, "")
    if insight:
        st.markdown(
            f"<div style='font-size:.73rem;color:{CYAN};margin-top:-.2rem;padding:.2rem .3rem;'>"
            f" {insight[:120]}</div>",
            unsafe_allow_html=True,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# WIDGET 6 — Optimizador IA de tabla de datos
# ═══════════════════════════════════════════════════════════════════════════════

def brain_optimize_data(
    df: "Any",  # pd.DataFrame
    pregunta: str = "Analiza estos datos y extrae los insights más importantes.",
    key_prefix: str = "",
) -> None:
    """
    Botón que analiza un DataFrame con Ollama y muestra insights.
    Para usar junto a st.dataframe() o st.table().
    """
    key = f"brain_opt_{key_prefix}"
    if st.button(f"Analizar datos con IA", key=f"{key}_btn", disabled=not _llm_ok()):
        llm = _get_llm()
        if llm:
            with st.spinner("Analizando datos…"):
                resultado = llm.analizar_datos(df, pregunta)
                st.session_state[key] = str(resultado)
            st.rerun()

    if resultado := st.session_state.get(key):
        st.markdown(
            f"""<div style='background:linear-gradient(135deg,{PURPLE}12,{CYAN}06);
            border:1px solid {CYAN}33;border-radius:8px;padding:.8rem;
            font-size:.83rem;color:{TEXT};margin-top:.5rem;'>
             <span style='color:{CYAN};'>Análisis IA</span><br>
            {resultado.replace(chr(10), "<br>")[:1000]}
            </div>""",
            unsafe_allow_html=True,
        )
        if st.button("", key=f"{key}_clear", help="Limpiar análisis"):
            del st.session_state[key]
            st.rerun()
