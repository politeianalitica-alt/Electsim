"""
Asistente IA Agéntico · ReactAgent powered by Groq (LLaMA 3.3 70B)

Página del dashboard para hacer consultas políticas en lenguaje natural.
El agente decide automáticamente qué tools usar (BD, RAG, sentiment, simulación,
medios, informes) y muestra los pasos de razonamiento en tiempo real.
"""
from __future__ import annotations

import sys
import json
import time
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, GREEN, AMBER, RED,
    TEXT, TEXT2, MUTED,
)

st.set_page_config(
    page_title="Asistente IA · Politeia",
    page_icon="[AI]",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()

# ───────────────────────────────────────────────────────────────────
# HEADER
# ───────────────────────────────────────────────────────────────────
st.markdown(
    f"""
<div style="background:linear-gradient(135deg,#5B21B6 0%,#7C3AED 100%);
            border-radius:14px;padding:1.4rem 1.8rem;margin-bottom:1.2rem;color:#fff">
  <div style="font-size:.72rem;color:rgba(255,255,255,0.78);font-weight:800;
              letter-spacing:.14em;text-transform:uppercase">ASISTENTE IA AGÉNTICO · REACT LOOP</div>
  <div style="font-size:1.75rem;font-weight:900;margin-top:.3rem">
    Análisis político con razonamiento autónomo
  </div>
  <div style="font-size:.92rem;color:rgba(255,255,255,0.85);margin-top:.45rem;line-height:1.5">
    Powered by <strong>Groq · LLaMA 3.3 70B Versatile</strong> · Loop ReAct (Thought → Action → Observation) ·
    6 herramientas integradas (BD, RAG, sentimiento, simulación, medios, informes) ·
    El agente decide qué hacer según tu consulta.
  </div>
</div>
""",
    unsafe_allow_html=True,
)

# ───────────────────────────────────────────────────────────────────
# LAZY IMPORT del agente (evita carga del LLM si solo se renderiza)
# ───────────────────────────────────────────────────────────────────
@st.cache_resource
def _get_agent():
    from agents.orchestrator.react_agent import ReactAgent
    return ReactAgent(max_iterations=10, temperature=0.3)


@st.cache_data(ttl=60)
def _llm_status() -> dict:
    try:
        from agents.llm import get_llm_client
        c = get_llm_client()
        return {"ok": True, "modelo": c.modelo, "clase": type(c).__name__}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


def _tools_list() -> list[dict]:
    try:
        from agents.orchestrator.react_agent import TOOLS
        return [{"name": n, "args": t["args"], "desc": t["desc"]} for n, t in TOOLS.items()]
    except Exception:
        return []


# Estado LLM
status = _llm_status()
col_s1, col_s2, col_s3 = st.columns([2, 2, 1])
with col_s1:
    if status["ok"]:
        st.success(f"LLM activo · `{status['modelo']}` ({status['clase']})")
    else:
        st.error(f"LLM no disponible · {status['error']}")
with col_s2:
    tools_count = len(_tools_list())
    st.info(f"{tools_count} herramientas registradas en el agente")
with col_s3:
    if st.button("Recargar status", use_container_width=True):
        _llm_status.clear()
        st.rerun()

# ───────────────────────────────────────────────────────────────────
# QUICK PROMPTS
# ───────────────────────────────────────────────────────────────────
st.markdown(f"<div style='color:{MUTED};font-size:.8rem;margin:1rem 0 .5rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase'>Consultas rápidas</div>", unsafe_allow_html=True)

PROMPTS_RAPIDOS = [
    "¿Cuál es la situación política actual en España?",
    "Analiza el sentimiento mediático sobre la coalición de gobierno",
    "¿Cuántas noticias hay en BD sobre el caso Koldo en los últimos 30 días?",
    "Simula el impacto de un mensaje del PSOE sobre vivienda con framing económico",
    "Genera un informe ejecutivo sobre las narrativas dominantes esta semana",
    "Compara la cobertura mediática entre PP y PSOE",
]

cols_quick = st.columns(3)
for i, p in enumerate(PROMPTS_RAPIDOS):
    with cols_quick[i % 3]:
        if st.button(p, key=f"qp{i}", use_container_width=True):
            st.session_state["agent_query_input"] = p

# ───────────────────────────────────────────────────────────────────
# INPUT
# ───────────────────────────────────────────────────────────────────
st.markdown(f"<div style='color:{MUTED};font-size:.8rem;margin:1rem 0 .5rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase'>Consulta libre</div>", unsafe_allow_html=True)

query = st.text_area(
    "Pregunta al agente:",
    value=st.session_state.get("agent_query_input", ""),
    height=110,
    placeholder="Ejemplo: «¿Qué impacto tendría una moción de censura del PP sobre la opinión pública según las narrativas mediáticas actuales?»",
    label_visibility="collapsed",
)

context_optional = st.text_input(
    "Contexto adicional (opcional)",
    value="",
    placeholder="Ej: enfoque región Cataluña · ventana últimos 7 días · etc.",
)

col_btn1, col_btn2, col_btn3 = st.columns([1, 1, 3])
with col_btn1:
    analizar = st.button("Analizar", type="primary", use_container_width=True, disabled=not query.strip())
with col_btn2:
    if st.button("Limpiar", use_container_width=True):
        st.session_state["agent_query_input"] = ""
        st.session_state.pop("agent_result", None)
        st.rerun()

# ───────────────────────────────────────────────────────────────────
# EJECUTAR
# ───────────────────────────────────────────────────────────────────
if analizar and query.strip():
    if not status["ok"]:
        st.error(f"LLM no disponible. Verifica .env (ELECTSIM_LLM_PROVIDER, OPENAI_API_KEY, OPENAI_BASE_URL).")
    else:
        agent = _get_agent()
        progreso = st.empty()
        pasos_box = st.expander("Pasos de razonamiento en vivo", expanded=True)

        progreso.info(f"Ejecutando ReAct loop · max 10 iteraciones · modelo {status['modelo']}")
        t_start = time.time()
        try:
            result = agent.run(query.strip(), context=context_optional.strip() or None)
            elapsed = time.time() - t_start
            progreso.success(f"Completado en {elapsed:.1f}s · {result.iterations} iteraciones · tools usadas: {', '.join(result.tools_used) or '(ninguna)'}")
            st.session_state["agent_result"] = result
        except Exception as e:
            progreso.error(f"Error: {type(e).__name__}: {str(e)[:300]}")
            st.session_state.pop("agent_result", None)

# ───────────────────────────────────────────────────────────────────
# MOSTRAR RESULTADO
# ───────────────────────────────────────────────────────────────────
result = st.session_state.get("agent_result")
if result:
    # Respuesta final destacada
    st.markdown(
        f"""
<div style="background:linear-gradient(135deg,#1F4E8C12 0%,#1F4E8C04 100%);
            border-left:5px solid {BLUE};border-radius:10px;padding:1.2rem 1.4rem;margin:1rem 0;">
  <div style="font-size:.72rem;color:{BLUE};font-weight:800;letter-spacing:.14em;text-transform:uppercase">RESPUESTA FINAL DEL AGENTE</div>
</div>
""",
        unsafe_allow_html=True,
    )
    st.markdown(result.answer)

    # Métricas
    cm1, cm2, cm3, cm4 = st.columns(4)
    cm1.metric("Iteraciones", result.iterations)
    cm2.metric("Tools usadas", len(result.tools_used))
    cm3.metric("Pasos totales", len(result.steps))
    cm4.metric("Error", "No" if not result.error else result.error[:30])

    # Pasos de razonamiento
    if result.steps:
        with st.expander(f"Detalle de los {len(result.steps)} pasos del agente", expanded=False):
            for s in result.steps:
                # Cada paso en una card
                st.markdown(
                    f"""
<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {PURPLE};
            border-radius:8px;padding:.8rem 1rem;margin-bottom:.7rem">
  <div style="font-size:.72rem;color:{PURPLE};font-weight:800;letter-spacing:.1em;
              text-transform:uppercase">PASO {s.iteration}</div>
""",
                    unsafe_allow_html=True,
                )
                if s.thought:
                    st.markdown(f"**Razonamiento:** {s.thought}")
                if s.action:
                    st.code(f"Action: {s.action}\nInput: {json.dumps(s.action_input or {}, ensure_ascii=False, indent=2)}", language="json")
                if s.observation:
                    obs = s.observation[:1000] + ("…" if len(s.observation) > 1000 else "")
                    st.markdown(f"**Observación:**")
                    st.code(obs, language="text")
                if s.final_answer:
                    st.success(f"**Final Answer · paso {s.iteration}**")
                st.markdown("</div>", unsafe_allow_html=True)

# ───────────────────────────────────────────────────────────────────
# CATÁLOGO DE TOOLS · footer educativo
# ───────────────────────────────────────────────────────────────────
with st.expander("Herramientas del agente · catálogo", expanded=False):
    for t in _tools_list():
        st.markdown(f"- **`{t['name']}`** ({', '.join(t['args'])}) · {t['desc']}")
