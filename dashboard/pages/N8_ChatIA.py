"""
ELECTSIM — Cerebro IA / Chat Político
======================================
Chat inteligente con Politeia Brain (Ollama local) o Claude API.
RAG sobre datos del dashboard. Análisis autónomo. Comandos especiales.

Modelos:
  - politeia-brain:latest (modelo custom local, sin coste)
  - qwen2.5:7b (general)
  - llama3.2:3b (rápido)
  - Claude claude-sonnet-4-6 (API, si hay clave)
"""
from __future__ import annotations
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import json
import time

import pandas as pd
import streamlit as st

from dashboard.shared import (
    sidebar_nav, BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED, section_header, kpi_card,
)
import dashboard.db as _db

st.set_page_config(
    page_title="Politeia Brain — ElectSim",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()

# ─── Imports IA ─────────────────────────────────────────────────────────────
try:
    from dashboard.services import llm_local as _llm
    _LLM_OK = _llm.esta_disponible()
    _STATUS  = _llm.disponible()
except Exception as _e:
    _LLM_OK = False
    _STATUS  = {"ollama": False, "claude_api": False}

# ─── CSS personalizado ───────────────────────────────────────────────────────
st.markdown(f"""
<style>
/* Burbujas de chat */
.msg-user {{
  background: linear-gradient(135deg, {BLUE}33, {PURPLE}22);
  border: 1px solid {BLUE}44;
  border-radius: 18px 18px 4px 18px;
  padding: .8rem 1.1rem;
  margin: .4rem 0 .4rem 3rem;
  color: {TEXT};
  font-size: .88rem;
  line-height: 1.6;
}}
.msg-ai {{
  background: linear-gradient(135deg, {CYAN}11, {BG3});
  border: 1px solid {CYAN}33;
  border-radius: 18px 18px 18px 4px;
  padding: .8rem 1.1rem;
  margin: .4rem 3rem .4rem 0;
  color: {TEXT};
  font-size: .88rem;
  line-height: 1.6;
}}
.msg-ai-header {{
  display: flex; align-items: center; gap: .4rem;
  font-size: .7rem; color: {CYAN}; font-weight: 700;
  text-transform: uppercase; letter-spacing: .1em;
  margin-bottom: .4rem;
}}
.msg-user-header {{
  text-align: right;
  font-size: .7rem; color: {TEXT2}; margin-bottom: .3rem;
}}
.status-chip {{
  display: inline-flex; align-items: center; gap: .3rem;
  background: {BG3}; border: 1px solid {BORDER};
  border-radius: 99px; padding: .2rem .7rem;
  font-size: .72rem; color: {TEXT2};
}}
.cmd-chip {{
  display: inline-block;
  background: {PURPLE}22; border: 1px solid {PURPLE}44;
  border-radius: 6px; padding: .15rem .5rem;
  font-size: .75rem; color: {PURPLE}; cursor: pointer;
  margin: .15rem;
}}
.brain-panel {{
  background: linear-gradient(135deg, {BG2}, {BG3});
  border: 1px solid {CYAN}33;
  border-radius: 16px;
  padding: 1.2rem;
}}
</style>
""", unsafe_allow_html=True)

# ─── Header ─────────────────────────────────────────────────────────────────
col_h1, col_h2 = st.columns([3, 1])
with col_h1:
    modelo_activo = _STATUS.get("modelo_activo", "") if _LLM_OK else "sin modelo"
    st.markdown(f"""
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:.5rem">
      <div style="width:44px;height:44px;background:linear-gradient(135deg,{CYAN},{PURPLE});
                  border-radius:12px;display:flex;align-items:center;justify-content:center;
                  font-size:1.6rem;flex-shrink:0;box-shadow:0 0 20px {CYAN}44">🧠</div>
      <div>
        <h2 style="margin:0;color:{TEXT};font-size:1.6rem;font-weight:900">
          Politeia Brain
        </h2>
        <div style="color:{TEXT2};font-size:.8rem">
          IA especializada en política española · RAG sobre datos en tiempo real
        </div>
      </div>
    </div>
    """, unsafe_allow_html=True)

with col_h2:
    # Indicadores de estado
    ol_color  = GREEN if _STATUS.get("ollama")    else MUTED
    rag_color = GREEN if _STATUS.get("rag")       else AMBER
    api_color = GREEN if _STATUS.get("claude_api") else MUTED
    brain_color = GREEN if _STATUS.get("brain")   else MUTED
    st.markdown(f"""
    <div style="display:flex;flex-direction:column;gap:.3rem;align-items:flex-end;padding-top:.5rem">
      <span class="status-chip">
        <span style="width:7px;height:7px;border-radius:50%;background:{brain_color};
                     display:inline-block;box-shadow:0 0 6px {brain_color}"></span>
        politeia-brain
      </span>
      <span class="status-chip">
        <span style="width:7px;height:7px;border-radius:50%;background:{ol_color};
                     display:inline-block"></span>
        Ollama local
      </span>
      <span class="status-chip">
        <span style="width:7px;height:7px;border-radius:50%;background:{rag_color};
                     display:inline-block"></span>
        RAG · ChromaDB
      </span>
    </div>
    """, unsafe_allow_html=True)

st.markdown(f'<hr style="border-color:{BORDER};margin:.5rem 0 1rem">', unsafe_allow_html=True)

# ─── Layout principal ────────────────────────────────────────────────────────
col_chat, col_panel = st.columns([3, 1])

# ─── Panel lateral ───────────────────────────────────────────────────────────
with col_panel:
    st.markdown(f'<div class="brain-panel">', unsafe_allow_html=True)

    # Selector de modelo
    st.markdown(f'<div style="font-size:.75rem;color:{CYAN};font-weight:700;'
                f'text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem">'
                f'Modelo activo</div>', unsafe_allow_html=True)

    modelos_disp = _STATUS.get("modelos", []) if isinstance(_STATUS.get("modelos"), list) else []
    opciones_modelo = modelos_disp if modelos_disp else ["(sin Ollama)"]
    if _STATUS.get("claude_api"):
        opciones_modelo.append("claude-api")

    idx_brain = 0
    if "politeia-brain:latest" in opciones_modelo:
        idx_brain = opciones_modelo.index("politeia-brain:latest")

    modelo_sel = st.selectbox(
        "modelo",
        opciones_modelo,
        index=idx_brain,
        label_visibility="collapsed",
        key="modelo_selector",
    )

    st.markdown('<br>', unsafe_allow_html=True)

    # Modo de análisis
    st.markdown(f'<div style="font-size:.75rem;color:{CYAN};font-weight:700;'
                f'text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem">'
                f'Modo</div>', unsafe_allow_html=True)

    modo = st.radio(
        "modo",
        ["💬 Chat libre", "📊 Analiza datos", "📰 Briefing noticias", "🔍 RAG"],
        label_visibility="collapsed",
        key="modo_ai",
    )

    st.markdown('<br>', unsafe_allow_html=True)

    # Comandos rápidos
    st.markdown(f'<div style="font-size:.75rem;color:{CYAN};font-weight:700;'
                f'text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">'
                f'Consultas rápidas</div>', unsafe_allow_html=True)

    comandos = [
        ("🗳️ Escenario electoral", "¿Cuál es el escenario electoral más probable a 6 meses vista?"),
        ("🤝 Coaliciones posibles", "Analiza las coaliciones posibles con los datos actuales."),
        ("📉 Tendencias encuestas", "¿Qué partidos están subiendo y bajando en las encuestas?"),
        ("⚔️ Campaña: puntos clave", "¿Cuáles son los 3 temas clave de campaña para cada partido?"),
        ("🌍 Contexto europeo", "¿Cómo afecta el contexto europeo al panorama político español?"),
        ("💰 Economía y votos", "¿Cómo están correlacionados los indicadores económicos con la intención de voto?"),
        ("⚠️ Principales riesgos", "¿Cuáles son los principales vectores de riesgo político en España?"),
        ("🧩 DAFO PP", "Haz un análisis DAFO del Partido Popular."),
        ("🌹 DAFO PSOE", "Haz un análisis DAFO del PSOE."),
    ]

    for label, cmd in comandos:
        if st.button(label, key=f"cmd_{label}", use_container_width=True):
            st.session_state.pending_cmd = cmd

    st.markdown('<br>', unsafe_allow_html=True)

    # Opciones
    with st.expander("⚙️ Opciones avanzadas"):
        usar_rag = st.checkbox("Usar RAG (contexto del dashboard)", value=True, key="usar_rag")
        temperatura = st.slider("Temperatura", 0.1, 1.5, 0.7, 0.1, key="temp_llm")
        max_hist = st.slider("Mensajes de historia", 4, 20, 10, 2, key="max_hist")
        if st.button("🗑️ Limpiar chat", use_container_width=True):
            st.session_state.chat_historia = []
            st.rerun()
        if st.button("📇 Re-indexar datos", use_container_width=True):
            st.session_state.rag_indexado = False
            st.success("Re-indexando en próxima consulta...")

    st.markdown('</div>', unsafe_allow_html=True)

# ─── Chat principal ───────────────────────────────────────────────────────────
with col_chat:
    # Inicializar estado
    if "chat_historia" not in st.session_state:
        st.session_state.chat_historia = []
    if "rag_indexado" not in st.session_state:
        st.session_state.rag_indexado = False

    # Área del chat
    chat_container = st.container()

    # Mensaje de bienvenida si no hay historia
    with chat_container:
        if not st.session_state.chat_historia:
            st.markdown(f"""
            <div class="msg-ai">
              <div class="msg-ai-header">
                🧠 politeia-brain · {pd.Timestamp.now().strftime("%H:%M")}
              </div>
              <p>Hola, soy <strong>Politeia Brain</strong>, el cerebro analítico de ElectSim España.</p>
              <p>Puedo ayudarte con:</p>
              <ul>
                <li>📊 <strong>Análisis electoral</strong> — encuestas, tendencias, proyecciones</li>
                <li>🤝 <strong>Coaliciones</strong> — escenarios, probabilidades, estrategias</li>
                <li>📰 <strong>Noticias</strong> — briefings, sentimiento, narrativas</li>
                <li>💰 <strong>Economía política</strong> — correlaciones, impactos</li>
                <li>🧩 <strong>DAFO y perfiles</strong> — análisis de partidos y líderes</li>
              </ul>
              <p style="color:{CYAN}">Usa los comandos rápidos del panel o escribe tu pregunta.</p>
            </div>
            """, unsafe_allow_html=True)

        # Mostrar historial
        for msg in st.session_state.chat_historia:
            if msg["role"] == "user":
                st.markdown(f"""
                <div class="msg-user">
                  <div class="msg-user-header">Tú · {msg.get('ts','')}</div>
                  {msg['content']}
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div class="msg-ai">
                  <div class="msg-ai-header">🧠 {msg.get('modelo','brain')} · {msg.get('ts','')}</div>
                  {msg['content']}
                </div>
                """, unsafe_allow_html=True)

    # Input del usuario
    st.markdown("<br>", unsafe_allow_html=True)

    # Comprobar comando pendiente
    pending = st.session_state.pop("pending_cmd", None)

    pregunta_input = st.chat_input(
        "Escribe tu pregunta sobre política, elecciones, partidos...",
        key="chat_input_principal",
    )

    # Procesar input
    pregunta = pending or pregunta_input

    if pregunta and _LLM_OK:
        # Añadir mensaje del usuario al historial
        ts_now = pd.Timestamp.now().strftime("%H:%M")
        st.session_state.chat_historia.append({
            "role": "user",
            "content": pregunta,
            "ts": ts_now,
        })

        # Mostrar mensaje del usuario inmediatamente
        st.markdown(f"""
        <div class="msg-user">
          <div class="msg-user-header">Tú · {ts_now}</div>
          {pregunta}
        </div>
        """, unsafe_allow_html=True)

        # Construir contexto del dashboard
        contexto = ""
        modelo_usar = modelo_sel if modelo_sel != "claude-api" else ""

        if st.session_state.get("usar_rag", True) and _STATUS.get("rag"):
            with st.spinner("🔍 Buscando contexto relevante..."):
                try:
                    # Indexar datos si no se ha hecho
                    if not st.session_state.get("rag_indexado"):
                        _indexar_datos_dashboard()
                        st.session_state.rag_indexado = True

                    # Buscar contexto
                    fragmentos = _llm.buscar_contexto(pregunta, "general", n_resultados=5)
                    if fragmentos:
                        contexto = "\n\n".join([
                            f"[{f.get('metadata',{}).get('tipo','dato')}] {f['documento']}"
                            for f in fragmentos[:4]
                            if f.get("distancia", 1.0) < 0.85
                        ])
                except Exception:
                    pass

        # Generar respuesta
        historia_llm = [
            {"role": m["role"], "content": m["content"]}
            for m in st.session_state.chat_historia[:-1]  # Excluir último (ya es el usuario)
        ][-st.session_state.get("max_hist", 10):]

        with st.spinner("🧠 Politeia Brain pensando..."):
            placeholder = st.empty()
            respuesta = ""

            try:
                if modo == "📊 Analiza datos":
                    # Cargar datos del dashboard
                    conn = _db.get_conn() if hasattr(_db, "get_conn") else None
                    df = _cargar_datos_dashboard(conn)
                    respuesta = _llm.analizar_datos(df, pregunta, modelo=modelo_usar)
                elif modo == "📰 Briefing noticias":
                    noticias = _cargar_noticias_recientes()
                    respuesta = _llm.resumir_noticias(noticias)
                elif modo == "🔍 RAG":
                    respuesta = _llm.chat_con_rag(pregunta, historia=historia_llm, modelo=modelo_usar)
                else:
                    respuesta = _llm.chat(
                        pregunta,
                        historia=historia_llm,
                        contexto=contexto,
                        modelo=modelo_usar,
                    )
            except Exception as exc:
                respuesta = f"⚠️ Error: {exc}"

        # Mostrar respuesta
        ts_resp = pd.Timestamp.now().strftime("%H:%M")
        st.markdown(f"""
        <div class="msg-ai">
          <div class="msg-ai-header">🧠 {modelo_usar or 'politeia-brain'} · {ts_resp}</div>
          {respuesta}
        </div>
        """, unsafe_allow_html=True)

        # Guardar en historial
        st.session_state.chat_historia.append({
            "role": "assistant",
            "content": respuesta,
            "ts": ts_resp,
            "modelo": modelo_usar or "brain",
        })

    elif pregunta and not _LLM_OK:
        st.error(
            "⚠️ No hay modelo de IA disponible. "
            "Asegúrate de que Ollama esté ejecutándose (`ollama serve`) "
            "o configura ANTHROPIC_API_KEY en el fichero .env"
        )


# ─── Pestaña de análisis autónomo ───────────────────────────────────────────
st.markdown(f'<hr style="border-color:{BORDER};margin:2rem 0 1rem">', unsafe_allow_html=True)

tab_auto, tab_rag, tab_info = st.tabs([
    "🤖 Análisis Autónomo",
    "📚 Gestión RAG",
    "ℹ️ Estado del Sistema",
])

with tab_auto:
    st.markdown(f"""
    <div style="color:{TEXT2};font-size:.85rem;margin-bottom:1rem">
      El análisis autónomo genera un briefing completo del panorama político
      analizando todos los datos disponibles en el dashboard.
    </div>
    """, unsafe_allow_html=True)

    col_a1, col_a2, col_a3 = st.columns(3)
    with col_a1:
        if st.button("📊 Analizar encuestas", use_container_width=True, disabled=not _LLM_OK):
            with st.spinner("Analizando encuestas..."):
                conn = _db.get_conn() if hasattr(_db, "get_conn") else None
                df = _cargar_datos_dashboard(conn)
                resp = _llm.analizar_datos(
                    df,
                    "Analiza la evolución reciente de las encuestas electorales e identifica las tendencias más importantes.",
                )
            st.markdown(f'<div class="msg-ai"><div class="msg-ai-header">🧠 brain</div>{resp}</div>',
                        unsafe_allow_html=True)

    with col_a2:
        if st.button("📰 Briefing de hoy", use_container_width=True, disabled=not _LLM_OK):
            with st.spinner("Generando briefing..."):
                noticias = _cargar_noticias_recientes(max_items=20)
                resp = _llm.resumir_noticias(noticias)
            st.markdown(f'<div class="msg-ai"><div class="msg-ai-header">🧠 brain</div>{resp}</div>',
                        unsafe_allow_html=True)

    with col_a3:
        if st.button("🗳️ Analizar coaliciones", use_container_width=True, disabled=not _LLM_OK):
            with st.spinner("Analizando coaliciones..."):
                from dashboard.services.coalition_service import dhondt, calcular_escanos_nacional
                sondeo_demo = {"PP": 33.2, "PSOE": 28.5, "VOX": 11.8, "SUMAR": 11.2, "JxCAT": 2.1, "ERC": 1.8}
                esc = dhondt(sondeo_demo)
                resp = _llm.analizar_coalicion(esc)
            st.markdown(f'<div class="msg-ai"><div class="msg-ai-header">🧠 brain</div>{resp}</div>',
                        unsafe_allow_html=True)


with tab_rag:
    st.markdown(f"""
    <div style="color:{TEXT2};font-size:.85rem;margin-bottom:1rem">
      El sistema RAG indexa automáticamente los datos del dashboard en ChromaDB
      para que el modelo pueda recuperar información relevante en tiempo real.
    </div>
    """, unsafe_allow_html=True)

    col_r1, col_r2 = st.columns(2)
    with col_r1:
        if st.button("🔄 Indexar todos los datos", use_container_width=True):
            with st.spinner("Indexando datos en ChromaDB..."):
                ok = _indexar_datos_dashboard(verbose=True)
                st.session_state.rag_indexado = True
            if ok:
                st.success("✅ Datos indexados correctamente")
            else:
                st.warning("⚠️ Indexación parcial (ChromaDB puede no estar disponible)")

    with col_r2:
        query_test = st.text_input("Probar búsqueda RAG:", "intención de voto PP")
        if st.button("🔍 Buscar", use_container_width=True):
            results = _llm.buscar_contexto(query_test, "general", n_resultados=3)
            if results:
                for r in results:
                    st.markdown(f"""
                    <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                                padding:.7rem;margin:.3rem 0;font-size:.8rem">
                      <div style="color:{CYAN};font-size:.7rem">
                        Distancia: {r['distancia']} · {r.get('metadata',{}).get('tipo','')}
                      </div>
                      <div style="color:{TEXT2};margin-top:.3rem">{r['documento'][:300]}...</div>
                    </div>
                    """, unsafe_allow_html=True)
            else:
                st.info("Sin resultados (indexa datos primero)")


with tab_info:
    section_header("ESTADO DEL SISTEMA DE IA", CYAN)
    col_s1, col_s2 = st.columns(2)

    with col_s1:
        st.markdown(f'<div style="font-size:.85rem;font-weight:700;color:{TEXT};margin-bottom:.5rem">Ollama</div>',
                    unsafe_allow_html=True)
        items = [
            ("Servidor Ollama", _STATUS.get("ollama", False)),
            ("politeia-brain", _STATUS.get("brain", False)),
            ("qwen2.5:7b", _STATUS.get("general", False)),
            ("llama3.2:3b", _STATUS.get("rapido", False)),
            ("nomic-embed-text", _STATUS.get("embed", False)),
            ("ChromaDB RAG", _STATUS.get("rag", False)),
        ]
        for label, ok in items:
            c = GREEN if ok else RED
            icon = "✅" if ok else "❌"
            st.markdown(
                f'<div style="display:flex;justify-content:space-between;padding:.25rem 0;'
                f'border-bottom:1px solid {BORDER}44">'
                f'<span style="font-size:.8rem;color:{TEXT2}">{label}</span>'
                f'<span style="color:{c};font-size:.8rem">{icon}</span></div>',
                unsafe_allow_html=True,
            )

    with col_s2:
        st.markdown(f'<div style="font-size:.85rem;font-weight:700;color:{TEXT};margin-bottom:.5rem">Modelos disponibles</div>',
                    unsafe_allow_html=True)
        modelos_list = _STATUS.get("modelos", [])
        if isinstance(modelos_list, list) and modelos_list:
            for m in modelos_list:
                activo = m == _STATUS.get("modelo_activo", "")
                color = CYAN if activo else TEXT2
                badge = " ← activo" if activo else ""
                st.markdown(
                    f'<div style="padding:.25rem 0;border-bottom:1px solid {BORDER}44">'
                    f'<span style="font-size:.8rem;color:{color}">{m}{badge}</span></div>',
                    unsafe_allow_html=True,
                )
        else:
            st.info("No hay modelos Ollama disponibles")

        if not _STATUS.get("ollama"):
            st.code("# Iniciar Ollama:\nollama serve\n\n# O con modelo:\nollama run politeia-brain",
                    language="bash")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _cargar_datos_dashboard(conn=None) -> pd.DataFrame:
    """Carga datos de sondeos del dashboard."""
    try:
        if conn:
            return pd.read_sql("SELECT * FROM survey_data ORDER BY fecha DESC LIMIT 200", conn)
    except Exception:
        pass
    # Datos demo
    import numpy as np
    np.random.seed(42)
    fechas = pd.date_range("2024-01", periods=24, freq="ME")
    return pd.DataFrame({
        "fecha": fechas,
        "PP": 32 + np.random.randn(24) * 1.5,
        "PSOE": 28 + np.random.randn(24) * 1.2,
        "VOX": 12 + np.random.randn(24) * 1.0,
        "SUMAR": 11 + np.random.randn(24) * 0.8,
    })


def _cargar_noticias_recientes(max_items: int = 15) -> list[dict]:
    """Carga noticias recientes del crawler."""
    try:
        from dashboard.services.news_crawler import cargar_noticias
        return cargar_noticias(max_por_medio=3, filtros={"dias": 3})
    except Exception:
        return [
            {"medio": "Demo", "titulo": "El PP mantiene su ventaja en sondeos", "resumen": "Las encuestas..."},
            {"medio": "Demo", "titulo": "El PSOE consolida apoyos", "resumen": "El gobierno..."},
        ]


def _indexar_datos_dashboard(verbose: bool = False) -> bool:
    """Indexa los datos del dashboard en ChromaDB para RAG."""
    if not _STATUS.get("rag"):
        return False

    try:
        docs = []
        metas = []

        # Indexar contexto de partidos
        partidos_info = [
            ("PP - Partido Popular: centro-derecha, presidente Alberto Núñez Feijóo. "
             "Actualmente primera fuerza en intención de voto."),
            ("PSOE - Partido Socialista Obrero Español: centro-izquierda, "
             "presidente del gobierno Pedro Sánchez."),
            ("VOX - partido de derecha radical, líder Santiago Abascal."),
            ("SUMAR - coalición de izquierda, liderada por Yolanda Díaz."),
            ("Podemos - izquierda radical, escisión de SUMAR."),
        ]
        for info in partidos_info:
            docs.append(info)
            metas.append({"tipo": "partido", "indexed_at": pd.Timestamp.now().isoformat()})

        # Indexar contexto electoral
        docs.append(
            "El Congreso de los Diputados tiene 350 escaños. "
            "La mayoría absoluta es de 176 escaños. "
            "Las elecciones generales de 2023 resultaron en: PP 137 escaños, "
            "PSOE 121, VOX 33, SUMAR 31. Pedro Sánchez fue investido presidente "
            "gracias al apoyo de SUMAR, Junts, ERC, PNV, Bildu y CC."
        )
        metas.append({"tipo": "electoral", "indexed_at": pd.Timestamp.now().isoformat()})

        # Indexar contexto de gobierno
        docs.append(
            "El gobierno actual de España es una coalición progresista de PSOE y SUMAR. "
            "Principales retos: presupuestos generales, situación en Cataluña, "
            "negociación con partidos nacionalistas, desempleo juvenil."
        )
        metas.append({"tipo": "gobierno", "indexed_at": pd.Timestamp.now().isoformat()})

        # Añadir noticias recientes al RAG
        try:
            noticias = _cargar_noticias_recientes(max_items=20)
            for n in noticias[:15]:
                texto = f"{n.get('titulo','')}. {n.get('resumen','')}"
                if texto.strip():
                    docs.append(texto[:1000])
                    metas.append({
                        "tipo": "noticia",
                        "medio": n.get("medio", ""),
                        "indexed_at": pd.Timestamp.now().isoformat(),
                    })
        except Exception:
            pass

        ok = _llm.indexar_datos("general", docs, metas)
        if verbose:
            st.write(f"Indexados {len(docs)} documentos")
        return ok
    except Exception as e:
        if verbose:
            st.error(f"Error indexando: {e}")
        return False
