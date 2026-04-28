from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from agents.backend_manager import get_backend_manager
from agents.local_intelligence import get_local_store
from dashboard.shared import BG2, BG3, BORDER, CYAN, GREEN, TEXT, TEXT2, sidebar_nav


st.set_page_config(page_title="IA Local — Politeia", layout="wide")
sidebar_nav()

store = get_local_store()
summary = store.ontology_summary()
manager = get_backend_manager(provider="ollama", use_llm=False)
manager_status = manager.status()
gits_manifest = (manager_status.get("gits_index", {}).get("manifest") or {})
llm_status = manager_status.get("llm", {})

st.markdown(
    f"""
<div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.2rem 1.4rem;margin-bottom:1rem">
  <div style="font-size:.72rem;color:{CYAN};font-weight:800;letter-spacing:.14em;text-transform:uppercase">POLITEIA BRAIN</div>
  <div style="font-size:1.55rem;color:{TEXT};font-weight:900;margin-top:.2rem">Ollama como gerente del backend</div>
  <div style="font-size:.86rem;color:{TEXT2};margin-top:.35rem">Modelo: {llm_status.get("ollama_model", "ollama")} · Memoria: {summary["store_path"]}</div>
</div>
""",
    unsafe_allow_html=True,
)

c1, c2, c3, c4 = st.columns(4)
c1.metric("Repos gits amigos", gits_manifest.get("repos_indexed", 0))
c2.metric("Fragmentos indexados", gits_manifest.get("chunks", 0))
c3.metric("Documentos scraper", summary["documents"])
c4.metric("Nodos ontología", summary["nodes"])

tab_brain, tab_ingest, tab_ontology, tab_status = st.tabs(["Cerebro Ollama", "Ingesta", "Ontología", "Estado"])

with tab_brain:
    st.markdown(
        f"""
<div style="background:{BG3};border:1px solid {BORDER};border-radius:10px;padding:1rem;margin-bottom:1rem;color:{TEXT2}">
Este chat usa el gerente backend: índice de <code>gits amigos</code>, memoria local de scrapers, rutas API y Ollama.
</div>
""",
        unsafe_allow_html=True,
    )
    provider = st.selectbox("Motor", ["ollama", "openai", "anthropic", "stub"], index=0)
    domain = st.selectbox(
        "Dominio de búsqueda",
        ["Auto", "llm_agents", "scraping_osint", "ontologia_kg", "politica", "economia", "datos_etl", "nlp", "general"],
        index=0,
    )
    use_llm = st.toggle("Razonar con LLM", value=True)
    k = st.slider("Evidencias de gits amigos", min_value=3, max_value=16, value=6, step=1)

    if "politeia_brain_messages" not in st.session_state:
        st.session_state.politeia_brain_messages = []

    for message in st.session_state.politeia_brain_messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    question = st.chat_input("Pide análisis, gestión de información, diseño de scrapers, API u ontología")
    if question:
        st.session_state.politeia_brain_messages.append({"role": "user", "content": question})
        with st.chat_message("user"):
            st.markdown(question)
        with st.chat_message("assistant"):
            with st.spinner("Consultando Ollama, gits amigos y backend local..."):
                result = get_backend_manager(provider=provider, use_llm=use_llm).chat(
                    question,
                    k=int(k),
                    domain=None if domain == "Auto" else domain,
                    include_project_context=True,
                )
            st.markdown(result.answer)
            if result.citations:
                with st.expander("Evidencias recuperadas"):
                    for i, citation in enumerate(result.citations, start=1):
                        title = (
                            f"{citation.get('repo')}/{citation.get('rel_path')}"
                            if citation.get("repo")
                            else citation.get("title") or citation.get("source") or citation.get("id")
                        )
                        st.markdown(f"**[{i}] {title}**")
                        st.caption(citation.get("summary") or citation.get("text") or "")
            st.caption(f"Modelo: {result.model} · Proveedor: {result.provider} · LLM activo: {result.used_llm}")
        st.session_state.politeia_brain_messages.append({"role": "assistant", "content": result.answer})

with tab_ingest:
    st.markdown(
        f"""
<div style="background:{BG3};border:1px solid {BORDER};border-radius:10px;padding:1rem;margin-bottom:1rem;color:{TEXT2}">
Pega una ruta local de un archivo o carpeta con CSV, JSON, JSONL, Parquet, TXT o HTML generados por scrapers.
</div>
""",
        unsafe_allow_html=True,
    )
    path = st.text_input("Ruta local", value=str(_ROOT / "data" / "raw"))
    max_records = st.number_input("Máximo de registros", min_value=1, max_value=100000, value=500, step=100)
    recursive = st.checkbox("Buscar recursivamente", value=True)
    if st.button("Ingerir scrapers", type="primary"):
        with st.spinner("Extrayendo documentos, hechos y ontología..."):
            result = store.ingest_path(path, recursive=recursive, max_records=int(max_records))
        st.success(f"Ingesta completada: {result.documents_added} documentos nuevos, {result.facts_added} hechos.")
        st.json(result.__dict__)

with tab_ontology:
    fresh = store.ontology_summary()
    left, right = st.columns([1, 2])
    with left:
        st.markdown(f"**Dominios**")
        st.json(fresh["domains"])
        st.markdown(f"**Tipos de nodo**")
        st.json(fresh["node_types"])
    with right:
        st.markdown(f"**Temas principales**")
        st.json(fresh["top_topics"])
        st.markdown(
            f"""
<div style="background:{GREEN}10;border:1px solid {GREEN}33;border-radius:10px;padding:.9rem;color:{TEXT2}">
Última actualización: {fresh.get("updated_at") or "sin ingestas"}
</div>
""",
            unsafe_allow_html=True,
        )

with tab_status:
    st.markdown("**Ollama / LLM**")
    st.json(llm_status)
    st.markdown("**Índice gits amigos**")
    st.json(manager_status.get("gits_index", {}))
    st.markdown("**Backend**")
    st.json(manager_status.get("backend", {}))
