"""
POLITEIA BRAIN — Cerebro central de razonamiento IA
====================================================
Interfaz completa del motor de IA local (Ollama / politeia-brain).
El brain razona sobre TODOS los procesos del dashboard en tiempo real.

Modos:
  🧠 Chat inteligente — con contexto total del dashboard
  🔍 Análisis autónomo — el brain razona solo
  ⚡ Alertas proactivas — detección automática de riesgos
  📊 Estado del sistema — métricas y memoria del brain
"""
from __future__ import annotations

import sys
import json
import time
from datetime import datetime
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
)

# ── page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Politeia Brain — ElectSim",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()

# ── imports IA ─────────────────────────────────────────────────────────────────
try:
    from dashboard.services import brain_service as brain
    from dashboard.services import llm_local as llm
    _STATUS = llm.disponible()
    _LLM_OK = llm.esta_disponible()
    _BRAIN_OK = True
except Exception as _e:
    _LLM_OK = False
    _BRAIN_OK = False
    _STATUS = {"ollama": False, "claude_api": False}
    brain = None
    llm = None

# ── session init ───────────────────────────────────────────────────────────────
if "brain_historia" not in st.session_state:
    st.session_state["brain_historia"] = []
if "brain_analisis_log" not in st.session_state:
    st.session_state["brain_analisis_log"] = []
if "brain_alertas" not in st.session_state:
    st.session_state["brain_alertas"] = []

# ── helpers ────────────────────────────────────────────────────────────────────
def _modelo_badge() -> str:
    modelo = _STATUS.get("modelo_activo", "")
    if not modelo:
        return "⚫ sin modelo"
    nombre = modelo.split(":")[0]
    if "brain" in nombre.lower():
        return f"🧠 {nombre}"
    if "qwen" in nombre.lower():
        return f"🤖 {nombre}"
    return f"💬 {nombre}"


def _renderizar_mensaje(rol: str, contenido: str, ts: str = "") -> None:
    """Renderiza un mensaje del chat con estilo."""
    if rol == "user":
        st.markdown(
            f"""<div style='background:linear-gradient(135deg,{BLUE}25,{PURPLE}18);
            border:1px solid {BLUE}44;border-radius:18px 18px 4px 18px;
            padding:.75rem 1.1rem;margin:.3rem 0 .3rem 20%;color:{TEXT};'>
            <span style='color:{TEXT2};font-size:.72rem;'>👤 Tú {ts}</span><br>
            {contenido}</div>""",
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            f"""<div style='background:linear-gradient(135deg,{PURPLE}18,{CYAN}12);
            border:1px solid {PURPLE}44;border-radius:4px 18px 18px 18px;
            padding:.75rem 1.1rem;margin:.3rem 20% .3rem 0;color:{TEXT};'>
            <span style='color:{CYAN};font-size:.72rem;'>🧠 Politeia Brain {ts}</span><br>
            {contenido}</div>""",
            unsafe_allow_html=True,
        )


# ── HEADER ─────────────────────────────────────────────────────────────────────
col_h1, col_h2 = st.columns([3, 1])
with col_h1:
    st.markdown(
        f"""<div style='background:linear-gradient(135deg,#0a0f1a,#16213e,#0f3460);
        padding:1.4rem 2rem;border-radius:12px;margin-bottom:1rem;
        border-left:4px solid {CYAN};'>
        <h1 style='color:#fff;margin:0;font-size:1.8rem;'>🧠 Politeia Brain</h1>
        <p style='color:{TEXT2};margin:.3rem 0 0;font-size:.9rem;'>
        Motor de inteligencia local · Razonamiento continuo · Contexto total del dashboard
        </p></div>""",
        unsafe_allow_html=True,
    )
with col_h2:
    st.markdown("<br>", unsafe_allow_html=True)
    if _LLM_OK:
        modelos_lista = _STATUS.get("modelos", [])
        st.success(f"✅ {_modelo_badge()}")
        if modelos_lista:
            st.caption(f"Modelos: {len(modelos_lista)} disponibles")
    else:
        st.error("⚫ Sin motor IA")
        st.caption("Inicia Ollama o configura ANTHROPIC_API_KEY")

# ── TABS PRINCIPALES ──────────────────────────────────────────────────────────
tab_chat, tab_autonomo, tab_alertas, tab_modulos, tab_estado = st.tabs([
    "💬 Chat Inteligente",
    "🔍 Análisis Autónomo",
    "⚡ Alertas Proactivas",
    "📊 Análisis por Módulo",
    "⚙️ Sistema",
])

# ══════════════════════════════════════════════════════════════════════════════
# TAB 1 — CHAT INTELIGENTE
# ══════════════════════════════════════════════════════════════════════════════
with tab_chat:
    chat_col, ctx_col = st.columns([2.2, 1])

    with chat_col:
        st.markdown("### 💬 Chat con contexto total del dashboard")
        st.markdown(
            f"<p style='color:{TEXT2};font-size:.85rem;'>El brain tiene acceso completo a: "
            "encuestas, noticias, BOE, alertas, coalición y riesgo político. "
            "Pregúntale cualquier cosa.</p>",
            unsafe_allow_html=True,
        )

        # Comandos rápidos
        st.markdown("**Preguntas rápidas:**")
        qcols = st.columns(4)
        preguntas_rapidas = [
            ("¿Qué está pasando hoy?", "general"),
            ("Riesgo de elecciones anticipadas", "coalicion"),
            ("Análisis de coalición", "coalicion"),
            ("¿Quién está subiendo en encuestas?", "electoral"),
            ("Riesgos más urgentes ahora", "riesgo"),
            ("Qué ha publicado el BOE hoy", "legislativo"),
            ("Narrativa mediática dominante", "medios"),
            ("DAFO del gobierno actual", "general"),
        ]
        for i, (pregunta, _) in enumerate(preguntas_rapidas):
            col = qcols[i % 4]
            if col.button(f"💡 {pregunta[:25]}…" if len(pregunta) > 25 else f"💡 {pregunta}",
                          key=f"qr_{i}", use_container_width=True):
                st.session_state["brain_input_pendiente"] = pregunta

        st.markdown("---")

        # Historial de chat
        historial_container = st.container(height=420)
        with historial_container:
            if not st.session_state["brain_historia"]:
                st.markdown(
                    f"""<div style='text-align:center;padding:3rem;color:{MUTED};'>
                    <div style='font-size:3rem;'>🧠</div>
                    <p>Soy Politeia Brain. Tengo acceso a todos los datos del dashboard.<br>
                    Pregúntame sobre la situación política, encuestas, riesgos o cualquier análisis.</p>
                    </div>""",
                    unsafe_allow_html=True,
                )
            else:
                for msg in st.session_state["brain_historia"]:
                    _renderizar_mensaje(
                        msg["role"],
                        msg["content"],
                        msg.get("ts", ""),
                    )

        # Input
        input_col, send_col, clear_col = st.columns([5, 1, 1])
        with input_col:
            # Pre-fill si hay pregunta rápida pendiente
            default_input = st.session_state.pop("brain_input_pendiente", "")
            user_input = st.text_input(
                "Pregunta",
                value=default_input,
                placeholder="Pregunta al brain sobre cualquier aspecto político…",
                label_visibility="collapsed",
                key="chat_input_main",
            )
        with send_col:
            enviar = st.button("➤", type="primary", use_container_width=True)
        with clear_col:
            if st.button("🗑️", use_container_width=True, help="Limpiar chat"):
                st.session_state["brain_historia"] = []
                st.rerun()

        if (enviar or default_input) and (user_input or default_input):
            texto = user_input or default_input
            ts_now = datetime.now().strftime("%H:%M")

            # Añadir mensaje usuario
            st.session_state["brain_historia"].append({
                "role": "user",
                "content": texto,
                "ts": ts_now,
            })

            if _BRAIN_OK and brain:
                # Respuesta en streaming
                with historial_container:
                    _renderizar_mensaje("user", texto, ts_now)
                    resp_placeholder = st.empty()
                    resp_container = st.empty()

                with st.spinner("🧠 Razonando…"):
                    respuesta_completa = ""
                    try:
                        gen = brain.chat_con_contexto_total(
                            texto,
                            historia=st.session_state["brain_historia"][-10:],
                            modulo_origen="general",
                            stream=True,
                        )
                        if hasattr(gen, "__iter__") and not isinstance(gen, str):
                            for token in gen:
                                respuesta_completa += token
                                resp_container.markdown(
                                    f"""<div style='background:linear-gradient(135deg,{PURPLE}18,{CYAN}12);
                                    border:1px solid {PURPLE}44;border-radius:4px 18px 18px 18px;
                                    padding:.75rem 1.1rem;margin:.3rem 20% .3rem 0;color:{TEXT};'>
                                    <span style='color:{CYAN};font-size:.72rem;'>🧠 Politeia Brain {ts_now}</span><br>
                                    {respuesta_completa}▌</div>""",
                                    unsafe_allow_html=True,
                                )
                        else:
                            respuesta_completa = str(gen)
                    except Exception as e:
                        respuesta_completa = f"Error en razonamiento: {e}"

                resp_container.empty()
                st.session_state["brain_historia"].append({
                    "role": "assistant",
                    "content": respuesta_completa,
                    "ts": ts_now,
                })
                st.rerun()
            else:
                st.session_state["brain_historia"].append({
                    "role": "assistant",
                    "content": "⚠️ Motor IA no disponible. Activa Ollama (`ollama serve`) para usar el brain.",
                    "ts": ts_now,
                })
                st.rerun()

    with ctx_col:
        st.markdown("#### 🌐 Contexto activo")
        if _BRAIN_OK and brain:
            estado = brain.obtener_estado_dashboard()

            # Sondeos rápidos
            sondeos = estado.get("sondeos", {})
            if sondeos:
                st.markdown("**📊 Encuestas actuales**")
                for p, d in sorted(sondeos.items(), key=lambda x: -x[1].get("escanos", 0))[:5]:
                    st.markdown(
                        f"<div style='display:flex;justify-content:space-between;font-size:.8rem;"
                        f"margin:1px 0;'><span style='color:{TEXT2};'>{p}</span>"
                        f"<span style='color:{CYAN};font-weight:700;'>{d.get('escanos',0)} esc.</span></div>",
                        unsafe_allow_html=True,
                    )
                st.markdown("")

            # Noticias
            noticias = estado.get("noticias", [])
            if noticias:
                st.markdown("**📰 Noticias recientes**")
                for n in noticias[:5]:
                    st.markdown(
                        f"<div style='font-size:.78rem;border-left:2px solid {BORDER};"
                        f"padding:.15rem .4rem;margin:2px 0;'>"
                        f"<span style='color:{MUTED};'>{n.get('medio','?')}</span><br>"
                        f"<span style='color:{TEXT2};'>{n.get('titulo','')[:55]}{'…' if len(n.get('titulo',''))>55 else ''}</span>"
                        f"</div>",
                        unsafe_allow_html=True,
                    )

        else:
            st.info("Activa el brain para ver el contexto del dashboard")

        st.markdown("---")
        st.markdown("**⚙️ Motor**")
        st.markdown(
            f"<div style='font-size:.8rem;color:{TEXT2};'>"
            f"🔮 {_modelo_badge()}<br>"
            f"💾 RAG: {'✅ activo' if _STATUS.get('rag') else '⚫ inactivo'}<br>"
            f"🌐 Ollama: {'✅' if _STATUS.get('ollama') else '⚫'}<br>"
            f"☁️ Claude API: {'✅' if _STATUS.get('claude_api') else '⚫'}</div>",
            unsafe_allow_html=True,
        )


# ══════════════════════════════════════════════════════════════════════════════
# TAB 2 — ANÁLISIS AUTÓNOMO
# ══════════════════════════════════════════════════════════════════════════════
with tab_autonomo:
    st.markdown("### 🔍 Análisis autónomo — El brain razona solo")
    st.markdown(
        f"<p style='color:{TEXT2};font-size:.85rem;'>Selecciona un foco de análisis y observa al brain "
        "razonar paso a paso sobre la situación política española usando todos los datos del dashboard.</p>",
        unsafe_allow_html=True,
    )

    focos = {
        "🌍 Situación general": "general",
        "🗳️ Análisis electoral": "electoral",
        "📜 Monitor legislativo": "legislativo",
        "🏛️ Coalición & gobierno": "coalicion",
        "🔴 Evaluación de riesgo": "riesgo",
        "📺 Narrativa mediática": "medios",
    }

    aut_col1, aut_col2 = st.columns([1, 2])

    with aut_col1:
        foco_sel = st.radio(
            "Foco de análisis",
            list(focos.keys()),
            key="brain_foco",
        )
        foco_clave = focos[foco_sel]

        forzar = st.checkbox("🔄 Forzar actualización (ignorar caché)", key="brain_force")
        usar_streaming = st.checkbox("📡 Ver razonamiento en tiempo real", value=True, key="brain_stream")

        btn_analizar = st.button(
            f"🧠 Analizar: {foco_sel}",
            type="primary",
            use_container_width=True,
            key="btn_analizar_autonomo",
            disabled=not _BRAIN_OK,
        )

        if not _BRAIN_OK:
            st.warning("⚠️ Sin motor IA disponible")

        # Log de análisis anteriores
        if st.session_state["brain_analisis_log"]:
            st.markdown("---")
            st.markdown("**📋 Análisis anteriores:**")
            for entry in st.session_state["brain_analisis_log"][-5:][::-1]:
                st.markdown(
                    f"<div style='font-size:.78rem;color:{TEXT2};border-left:2px solid {PURPLE};"
                    f"padding:.2rem .4rem;margin:2px 0;'>"
                    f"🕐 {entry['ts']} — {entry['foco']}</div>",
                    unsafe_allow_html=True,
                )

    with aut_col2:
        resultado_container = st.empty()

        if btn_analizar and _BRAIN_OK and brain:
            ts_analisis = datetime.now().strftime("%H:%M")
            st.session_state["brain_analisis_log"].append({
                "ts": ts_analisis,
                "foco": foco_sel,
            })

            if usar_streaming:
                with st.spinner(f"🧠 Razonando sobre {foco_sel}…"):
                    texto_streaming = ""
                    try:
                        gen = brain.razonar_situacion(
                            foco=foco_clave,
                            stream=True,
                            force_refresh=forzar,
                        )
                        prog_container = st.empty()
                        if hasattr(gen, "__iter__") and not isinstance(gen, str):
                            for token in gen:
                                texto_streaming += token
                                prog_container.markdown(
                                    f"""<div style='background:{BG2};border:1px solid {PURPLE}44;
                                    border-radius:8px;padding:1.2rem;color:{TEXT};
                                    font-size:.88rem;line-height:1.7;min-height:200px;'>
                                    <span style='color:{CYAN};font-size:.75rem;'>
                                    🧠 Analizando: {foco_sel} · {ts_analisis}</span><br><br>
                                    {texto_streaming}▌</div>""",
                                    unsafe_allow_html=True,
                                )
                        else:
                            texto_streaming = str(gen)
                            prog_container.markdown(texto_streaming)
                    except Exception as e:
                        texto_streaming = f"Error: {e}"

                st.session_state[f"brain_resultado_{foco_clave}"] = texto_streaming
            else:
                with st.spinner(f"🧠 Analizando {foco_sel}…"):
                    try:
                        resultado = brain.razonar_situacion(
                            foco=foco_clave,
                            stream=False,
                            force_refresh=forzar,
                        )
                        st.session_state[f"brain_resultado_{foco_clave}"] = str(resultado)
                    except Exception as e:
                        st.session_state[f"brain_resultado_{foco_clave}"] = f"Error: {e}"

            st.rerun()

        # Mostrar resultado guardado
        resultado_guardado = st.session_state.get(f"brain_resultado_{foco_clave}")
        if resultado_guardado:
            st.markdown(
                f"""<div style='background:{BG2};border:1px solid {PURPLE}44;
                border-radius:8px;padding:1.2rem;color:{TEXT};
                font-size:.88rem;line-height:1.7;'>
                <span style='color:{CYAN};font-size:.75rem;'>🧠 Último análisis: {foco_sel}</span><br><br>
                {resultado_guardado.replace(chr(10), '<br>').replace('##', '<h4>').replace('**', '<b>')}
                </div>""",
                unsafe_allow_html=True,
            )

            a_col1, a_col2, a_col3 = st.columns(3)
            if a_col1.button("📋 Copiar al chat", key="analisis_to_chat"):
                st.session_state["brain_historia"].append({
                    "role": "assistant",
                    "content": resultado_guardado,
                    "ts": datetime.now().strftime("%H:%M"),
                })
                st.toast("Análisis añadido al chat ✅")
            if a_col2.button("💾 Guardar en RAG", key="save_rag"):
                if llm and brain:
                    brain._indexar_razonamiento(foco_clave, resultado_guardado, {})
                    st.toast("Guardado en memoria RAG ✅")
            if a_col3.button("🔄 Nuevo análisis", key="nuevo_analisis"):
                del st.session_state[f"brain_resultado_{foco_clave}"]
                st.rerun()
        else:
            resultado_container.markdown(
                f"""<div style='background:{BG2};border:1px dashed {BORDER};
                border-radius:8px;padding:3rem;text-align:center;color:{MUTED};'>
                <div style='font-size:2.5rem;margin-bottom:.5rem;'>🔍</div>
                <p>Selecciona un foco y pulsa "Analizar" para que el brain razone<br>
                sobre la situación política española usando todos los datos disponibles.</p>
                </div>""",
                unsafe_allow_html=True,
            )


# ══════════════════════════════════════════════════════════════════════════════
# TAB 3 — ALERTAS PROACTIVAS
# ══════════════════════════════════════════════════════════════════════════════
with tab_alertas:
    st.markdown("### ⚡ Alertas proactivas — El brain vigila sin que le pidas")
    st.markdown(
        f"<p style='color:{TEXT2};font-size:.85rem;'>El brain analiza continuamente el estado del dashboard "
        "y genera alertas cuando detecta riesgos, cambios relevantes o situaciones que requieren atención.</p>",
        unsafe_allow_html=True,
    )

    al_col1, al_col2 = st.columns([2, 1])

    with al_col1:
        refresh_alertas = st.button(
            "🔄 Actualizar alertas del brain",
            type="primary",
            key="btn_refresh_alertas",
            disabled=not _BRAIN_OK,
        )

        if refresh_alertas and _BRAIN_OK and brain:
            with st.spinner("🧠 Analizando situación para detectar alertas…"):
                alertas = brain.generar_alertas_proactivas(force_refresh=True)
                st.session_state["brain_alertas"] = alertas

        # Cargar alertas si no hay
        if not st.session_state["brain_alertas"] and _BRAIN_OK and brain:
            with st.spinner("Cargando alertas…"):
                alertas = brain.generar_alertas_proactivas()
                st.session_state["brain_alertas"] = alertas

        alertas_mostrar = st.session_state.get("brain_alertas", [])

        if alertas_mostrar:
            COLORES_SEV = {
                "CRÍTICA": RED,
                "ALTA": AMBER,
                "MEDIA": BLUE,
                "BAJA": MUTED,
            }
            ICONOS_SEV = {
                "CRÍTICA": "🔴",
                "ALTA": "🟠",
                "MEDIA": "🔵",
                "BAJA": "⚪",
            }

            for alerta in alertas_mostrar:
                sev = alerta.get("severidad", "MEDIA")
                color = COLORES_SEV.get(sev, BLUE)
                icono = ICONOS_SEV.get(sev, "⚡")
                modulo = alerta.get("modulo", "general")
                accion = alerta.get("accion", "")

                st.markdown(
                    f"""<div style='background:{BG2};border-left:4px solid {color};
                    border-radius:0 8px 8px 0;padding:.75rem 1rem;margin:6px 0;'>
                    <div style='display:flex;justify-content:space-between;margin-bottom:.3rem;'>
                    <span style='color:{color};font-weight:700;font-size:.85rem;'>
                    {icono} {sev} — {alerta.get("titulo","")[:60]}</span>
                    <span style='background:{BG3};color:{TEXT2};padding:1px 6px;
                    border-radius:4px;font-size:.72rem;'>{modulo}</span></div>
                    <p style='color:{TEXT};font-size:.82rem;margin:0;'>
                    {alerta.get("descripcion","")}</p>
                    {f"<p style='color:{MUTED};font-size:.75rem;margin:.3rem 0 0;'>→ {accion}</p>" if accion else ""}
                    </div>""",
                    unsafe_allow_html=True,
                )
        elif not _BRAIN_OK:
            st.warning("⚠️ Activa Ollama para que el brain genere alertas proactivas")
        else:
            st.info("Pulsa 'Actualizar alertas' para que el brain analice la situación")

    with al_col2:
        st.markdown("#### 📈 Resumen de alertas")
        if alertas_mostrar:
            from collections import Counter
            sevs = Counter(a.get("severidad", "MEDIA") for a in alertas_mostrar)
            for sev, cnt in [("CRÍTICA", RED), ("ALTA", AMBER), ("MEDIA", BLUE), ("BAJA", MUTED)]:
                n = sevs.get(sev, 0)
                if n:
                    st.markdown(
                        f"<div style='display:flex;justify-content:space-between;"
                        f"padding:.3rem .5rem;border-left:3px solid {cnt};margin:3px 0;'>"
                        f"<span style='color:{TEXT2};font-size:.85rem;'>{sev}</span>"
                        f"<span style='color:{cnt};font-weight:700;'>{n}</span></div>",
                        unsafe_allow_html=True,
                    )

        st.markdown("---")
        st.markdown("#### ⚙️ Configuración")
        umbral = st.selectbox(
            "Mostrar alertas desde",
            ["BAJA", "MEDIA", "ALTA", "CRÍTICA"],
            index=1,
            key="alerta_umbral",
        )
        auto_refresh = st.checkbox("Auto-refresh cada 5 min", key="alerta_auto", value=False)
        if auto_refresh:
            st.caption("⚠️ Requiere que el brain esté activo")

        st.markdown("---")
        st.markdown("#### 🔔 Módulos monitorizados")
        modulos_monitorizados = [
            ("📜 Legislativo", "legislativo"),
            ("🏛️ Coalición", "coalicion"),
            ("📺 Medios", "medios"),
            ("🌍 Geopolítica", "geopolitica"),
            ("📊 Encuestas", "electoral"),
        ]
        for nombre, _ in modulos_monitorizados:
            st.markdown(
                f"<div style='font-size:.8rem;color:{TEXT2};padding:2px 0;'>✅ {nombre}</div>",
                unsafe_allow_html=True,
            )


# ══════════════════════════════════════════════════════════════════════════════
# TAB 4 — ANÁLISIS POR MÓDULO
# ══════════════════════════════════════════════════════════════════════════════
with tab_modulos:
    st.markdown("### 📊 Análisis profundo por módulo")
    st.markdown(
        f"<p style='color:{TEXT2};font-size:.85rem;'>El brain analiza en profundidad cada módulo "
        "del dashboard con contexto cruzado de todos los demás.</p>",
        unsafe_allow_html=True,
    )

    modulos_dashboard = {
        "🗞️ Briefings": "briefings",
        "🕸️ Mapa de Actores": "actores",
        "🌡️ Termómetro de Riesgo": "termometro",
        "📜 Monitor Legislativo": "legislativo",
        "🏛️ Gobierno & Coalición": "coalicion",
        "🔔 Alertas": "alertas",
        "📰 Medios & Narrativa": "medios",
        "🌍 Geopolítica & RRII": "geopolitica",
        "📣 Communication Intel": "communication",
        "🔬 Centro de Operaciones": "workspace",
    }

    mod_cols = st.columns(2)
    modulo_elegido = mod_cols[0].selectbox(
        "Seleccionar módulo",
        list(modulos_dashboard.keys()),
        key="mod_selector",
    )
    clave_modulo = modulos_dashboard[modulo_elegido]

    datos_extra_raw = mod_cols[1].text_area(
        "Datos adicionales (opcional JSON)",
        placeholder='{"partido": "PP", "evento": "moción de censura"}',
        height=80,
        key="mod_datos_extra",
    )

    btn_analizar_mod = st.button(
        f"🧠 Analizar en profundidad: {modulo_elegido}",
        type="primary",
        key="btn_analizar_mod",
        disabled=not _BRAIN_OK,
    )

    if btn_analizar_mod and _BRAIN_OK and brain:
        datos_extra = {}
        if datos_extra_raw.strip():
            try:
                datos_extra = json.loads(datos_extra_raw)
            except Exception:
                datos_extra = {"nota": datos_extra_raw}

        with st.spinner(f"🧠 Analizando {modulo_elegido} con contexto total…"):
            resultado_mod = ""
            try:
                gen_mod = brain.analizar_modulo(
                    modulo=clave_modulo,
                    datos_especificos=datos_extra if datos_extra else None,
                    stream=True,
                )
                prog_mod = st.empty()
                if hasattr(gen_mod, "__iter__") and not isinstance(gen_mod, str):
                    for token in gen_mod:
                        resultado_mod += token
                        prog_mod.markdown(
                            f"""<div style='background:{BG2};border:1px solid {CYAN}44;
                            border-radius:8px;padding:1.2rem;color:{TEXT};font-size:.88rem;
                            line-height:1.7;'><span style='color:{CYAN};font-size:.75rem;'>
                            🧠 Analizando: {modulo_elegido}</span><br><br>
                            {resultado_mod}▌</div>""",
                            unsafe_allow_html=True,
                        )
                else:
                    resultado_mod = str(gen_mod)
                    st.markdown(resultado_mod)
            except Exception as e:
                resultado_mod = f"Error: {e}"
                st.error(resultado_mod)

        st.session_state[f"mod_resultado_{clave_modulo}"] = resultado_mod
        st.rerun()

    # Mostrar resultado
    res_mod = st.session_state.get(f"mod_resultado_{clave_modulo}")
    if res_mod:
        st.markdown(
            f"""<div style='background:{BG2};border:1px solid {CYAN}44;border-radius:8px;
            padding:1.2rem;color:{TEXT};font-size:.88rem;line-height:1.7;'>
            <span style='color:{CYAN};font-size:.75rem;'>🧠 Análisis: {modulo_elegido}</span><br><br>
            {res_mod.replace(chr(10),'<br>')}</div>""",
            unsafe_allow_html=True,
        )

        nav_cols = st.columns(4)
        if nav_cols[0].button("📋 → Chat", key="mod_to_chat"):
            st.session_state["brain_historia"].append(
                {"role": "assistant", "content": res_mod, "ts": datetime.now().strftime("%H:%M")}
            )
            st.toast("Añadido al chat ✅")
        if nav_cols[1].button("💾 Guardar RAG", key="mod_save_rag"):
            if llm and brain:
                brain._indexar_razonamiento(clave_modulo, res_mod, {})
                st.toast("Guardado en memoria ✅")
        if nav_cols[2].button(f"🔗 Ir a {modulo_elegido.split()[1]}", key="mod_go"):
            page_map = {
                "briefings": "pages/D1_Briefings.py",
                "actores": "pages/D2_Actores.py",
                "termometro": "pages/D3_Termometro.py",
                "legislativo": "pages/D4_Legislativo.py",
                "coalicion": "pages/D5_Coalicion.py",
                "alertas": "pages/D6_Alertas.py",
                "medios": "pages/D7_Medios.py",
                "geopolitica": "pages/D8_Geopolitica.py",
                "communication": "pages/D9_Communication.py",
                "workspace": "pages/D10_Workspace.py",
            }
            target = page_map.get(clave_modulo)
            if target:
                st.switch_page(target)
        if nav_cols[3].button("🔄 Re-analizar", key="mod_reanalizar"):
            del st.session_state[f"mod_resultado_{clave_modulo}"]
            st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# TAB 5 — ESTADO DEL SISTEMA
# ══════════════════════════════════════════════════════════════════════════════
with tab_estado:
    st.markdown("### ⚙️ Estado del sistema de IA")

    sys_col1, sys_col2, sys_col3 = st.columns(3)

    with sys_col1:
        st.markdown("#### 🔧 Motor LLM")
        componentes = [
            ("Ollama", _STATUS.get("ollama", False)),
            ("politeia-brain", _STATUS.get("brain", False)),
            ("qwen2.5:7b", _STATUS.get("general", False)),
            ("llama3.2:3b", _STATUS.get("rapido", False)),
            ("nomic-embed-text", _STATUS.get("embed", False)),
            ("Claude API", _STATUS.get("claude_api", False)),
            ("ChromaDB RAG", _STATUS.get("rag", False)),
        ]
        for nombre, activo in componentes:
            icono = "✅" if activo else "⚫"
            color = GREEN if activo else MUTED
            st.markdown(
                f"<div style='font-size:.85rem;color:{color};padding:2px 0;'>{icono} {nombre}</div>",
                unsafe_allow_html=True,
            )

        if _STATUS.get("modelo_activo"):
            st.markdown(
                f"<div style='background:{BG2};border:1px solid {CYAN}44;border-radius:6px;"
                f"padding:.5rem;margin-top:.5rem;'><span style='color:{CYAN};font-size:.8rem;'>"
                f"Modelo activo: <b>{_STATUS.get('modelo_activo')}</b></span></div>",
                unsafe_allow_html=True,
            )

    with sys_col2:
        st.markdown("#### 💾 Memoria y caché")
        if _BRAIN_OK and brain:
            chip = brain.estado_brain_chip()
            n_cache = chip.get("n_insights", 0)
            ultimo = chip.get("ultimo_analisis", "nunca")

            st.metric("Insights en caché", n_cache)
            st.metric("Último análisis", ultimo or "ninguno")

            # Colecciones RAG
            try:
                import chromadb
                db_path = str(_ROOT / ".chroma_db")
                chroma = chromadb.PersistentClient(path=db_path)
                cols = chroma.list_collections()
                st.markdown(f"**Colecciones RAG: {len(cols)}**")
                for col in cols:
                    try:
                        cnt = col.count()
                        st.markdown(
                            f"<div style='font-size:.8rem;color:{TEXT2};padding:1px 0;'>"
                            f"📚 {col.name}: {cnt} docs</div>",
                            unsafe_allow_html=True,
                        )
                    except Exception:
                        pass
            except Exception:
                st.caption("ChromaDB no disponible")

            if st.button("🗑️ Limpiar caché", key="btn_clear_cache"):
                brain.invalidar_cache()
                st.toast("Caché limpiada ✅")
                st.rerun()

    with sys_col3:
        st.markdown("#### 📊 Estadísticas")
        hist = st.session_state.get("brain_historia", [])
        analisis = st.session_state.get("brain_analisis_log", [])

        st.metric("Mensajes en chat", len(hist))
        st.metric("Análisis ejecutados", len(analisis))

        if hist:
            user_msgs = [m for m in hist if m["role"] == "user"]
            st.metric("Preguntas formuladas", len(user_msgs))

        st.markdown("---")
        st.markdown("**🔬 Test de conectividad**")
        if st.button("Probar motor IA", key="btn_test_ai"):
            if _LLM_OK and llm:
                with st.spinner("Probando…"):
                    resp = llm.chat(
                        "Di solo: 'Politeia Brain operativo'",
                        sistema="Responde exactamente lo que se te pide.",
                    )
                    if resp and len(resp) > 5:
                        st.success(f"✅ Respuesta: {resp[:80]}")
                    else:
                        st.error("❌ Sin respuesta del modelo")
            else:
                st.error("❌ Sin motor IA disponible")

    st.markdown("---")
    st.markdown("### 🧪 Consulta de memoria RAG")
    rag_col1, rag_col2 = st.columns([2, 1])
    with rag_col1:
        rag_query = st.text_input(
            "Buscar en memoria del brain",
            placeholder="Busca análisis previos: 'coalición', 'riesgo electoral', etc.",
            key="rag_query",
        )
        if st.button("🔍 Buscar en memoria", key="btn_rag_search") and rag_query and _BRAIN_OK and brain:
            with st.spinner("Buscando en RAG…"):
                resultados = brain.recuperar_memoria(rag_query, n=5)
            if resultados:
                for r in resultados:
                    dist = r.get("distancia", 1)
                    if dist < 0.9:
                        relevancia = 1 - dist
                        st.markdown(
                            f"""<div style='background:{BG2};border-left:3px solid {PURPLE};
                            border-radius:0 6px 6px 0;padding:.6rem .8rem;margin:4px 0;'>
                            <div style='display:flex;justify-content:space-between;'>
                            <span style='color:{PURPLE};font-size:.75rem;'>
                            Relevancia: {relevancia:.0%}</span>
                            <span style='color:{MUTED};font-size:.72rem;'>
                            {r.get('metadata',{}).get('foco','?')}</span></div>
                            <p style='color:{TEXT};font-size:.82rem;margin:.3rem 0 0;'>
                            {r.get('documento','')[:300]}…</p></div>""",
                            unsafe_allow_html=True,
                        )
            else:
                st.info("Sin resultados en la memoria del brain para esa consulta.")
    with rag_col2:
        st.markdown("**💡 Consultas sugeridas:**")
        sugerencias = [
            "análisis electoral reciente",
            "riesgo de ruptura coalición",
            "narrativa mediática dominante",
            "presupuestos generales",
            "Junts negociación",
        ]
        for s in sugerencias:
            if st.button(f"🔍 {s}", key=f"rag_sug_{s}", use_container_width=True):
                st.session_state["rag_query"] = s
