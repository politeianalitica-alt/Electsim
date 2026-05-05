"""Página N_Memoria — Memoria Institucional del workspace."""

from __future__ import annotations

from datetime import datetime

try:
    import streamlit as st
except Exception:  # pragma: no cover - graceful degradation
    st = None  # type: ignore

from memory_engine import (
    episodic_memory,
    knowledge_graph,
    memory_service,
    semantic_memory,
    snapshot_store,
)


TENANT_ID = "default"


def _ensure_seeded() -> None:
    stats = memory_service.get_memory_stats(TENANT_ID)
    if stats["episodes"] == 0 and stats["facts"] == 0 and stats["graph_nodes"] == 0:
        memory_service.seed_all_demo(TENANT_ID)


def _render_kpis() -> None:
    stats = memory_service.get_memory_stats(TENANT_ID)
    cols = st.columns(4)
    cols[0].metric("Episodios", stats["episodes"])
    cols[1].metric("Hechos", stats["facts"])
    cols[2].metric("Entidades", stats["graph_nodes"])
    cols[3].metric("Snapshots", stats["snapshots"])
    if stats["last_activity"]:
        st.caption(f"Última actividad: {stats['last_activity'].strftime('%Y-%m-%d %H:%M')}")


def _render_episodios_tab() -> None:
    st.subheader("Episodios recientes")
    query = st.text_input("Buscar episodios", key="mem_ep_search", placeholder="Sánchez, coalición, vivienda…")
    if query:
        result = memory_service.unified_search(TENANT_ID, query, limit=20)
        episodes = result.entries
        st.caption(f"{len(episodes)} resultados en {result.search_time_ms} ms")
    else:
        episodes = episodic_memory.recall_recent(TENANT_ID, limit=20, days=90)

    if not episodes:
        st.info("Aún no hay episodios registrados.")
        return

    for ep in episodes:
        with st.container(border=True):
            st.markdown(f"**{ep.title}**")
            st.write(ep.content)
            cols = st.columns([2, 2, 1])
            with cols[0]:
                st.caption(f"Entidades: {', '.join(ep.entities) or '—'}")
            with cols[1]:
                st.caption(f"Etiquetas: {', '.join(ep.tags) or '—'}")
            with cols[2]:
                st.progress(ep.importance, text=f"Importancia {ep.importance:.2f}")
            st.caption(ep.created_at.strftime("%Y-%m-%d %H:%M"))


def _render_hechos_tab() -> None:
    st.subheader("Hechos aprendidos")
    facts = semantic_memory.list_facts(TENANT_ID)
    if not facts:
        st.info("No hay hechos en la memoria semántica.")
        return

    grouped: dict[str, list] = {}
    for fact in facts:
        prefix = fact.title.split(".")[0] if "." in fact.title else "general"
        grouped.setdefault(prefix, []).append(fact)

    for prefix in sorted(grouped):
        with st.expander(f"{prefix} ({len(grouped[prefix])})", expanded=False):
            for fact in grouped[prefix]:
                conf = fact.metadata.get("confidence", fact.importance)
                st.markdown(f"**{fact.title}** — _confianza {conf:.2f}_")
                st.write(fact.content)


def _render_grafo_tab() -> None:
    st.subheader("Grafo de conocimiento")
    top = knowledge_graph.top_central_nodes(TENANT_ID, limit=10)
    if not top:
        st.info("No hay nodos en el grafo.")
        return

    rows = [
        {
            "Etiqueta": node.label,
            "Tipo": node.node_type,
            "Centralidad": degree,
        }
        for node, degree in top
    ]
    st.dataframe(rows, use_container_width=True, hide_index=True)

    labels = [node.label for node, _ in top]
    selected_label = st.selectbox("Selecciona un nodo para explorar", labels)
    selected_node = next((n for n, _ in top if n.label == selected_label), None)
    if selected_node is None:
        return

    neighbors = knowledge_graph.get_neighbors(TENANT_ID, selected_node.id, max_depth=1)
    if not neighbors:
        st.caption("Sin vecinos conectados.")
        return

    st.markdown(f"**Vecinos de {selected_node.label}**")
    nb_rows = [
        {
            "Vecino": item["node"].label,
            "Tipo": item["node"].node_type,
            "Relación": item["connecting_edge"].edge_type if item["connecting_edge"] else "—",
            "Peso": round(item["connecting_edge"].weight, 2) if item["connecting_edge"] else 0,
        }
        for item in neighbors
    ]
    st.dataframe(nb_rows, use_container_width=True, hide_index=True)


def _render_snapshots_tab() -> None:
    st.subheader("Snapshots")
    with st.form("capture_snapshot"):
        name = st.text_input("Nombre del snapshot")
        description = st.text_area("Descripción", height=60)
        submitted = st.form_submit_button("Capturar snapshot")
        if submitted and name:
            snapshot_store.capture_snapshot(
                tenant_id=TENANT_ID,
                name=name,
                description=description,
                captured_by="usuario",
                data={"timestamp": datetime.utcnow().isoformat()},
                tags=["manual"],
            )
            st.success(f"Snapshot '{name}' capturado.")

    snaps = snapshot_store.list_snapshots(TENANT_ID, limit=30)
    if not snaps:
        st.info("Aún no hay snapshots capturados.")
        return

    st.markdown("**Historial**")
    for snap in snaps:
        with st.container(border=True):
            st.markdown(f"**{snap.name}**")
            st.caption(snap.description or "Sin descripción")
            st.caption(f"Capturado: {snap.captured_at.strftime('%Y-%m-%d %H:%M')} por {snap.captured_by}")

    if len(snaps) >= 2:
        st.markdown("**Comparar dos snapshots**")
        a = st.selectbox("Snapshot A", [(s.name, s.id) for s in snaps], key="snap_a", format_func=lambda x: x[0])
        b = st.selectbox("Snapshot B", [(s.name, s.id) for s in snaps], key="snap_b", format_func=lambda x: x[0])
        if st.button("Comparar"):
            diff = snapshot_store.compare_snapshots(a[1], b[1])
            st.json(diff)


def render() -> None:
    if st is None:
        return
    _ensure_seeded()
    st.title("Memoria Institucional")
    st.caption("El conocimiento acumulado del workspace")
    _render_kpis()
    tabs = st.tabs(["Episodios", "Hechos", "Grafo", "Snapshots"])
    with tabs[0]:
        _render_episodios_tab()
    with tabs[1]:
        _render_hechos_tab()
    with tabs[2]:
        _render_grafo_tab()
    with tabs[3]:
        _render_snapshots_tab()


if __name__ == "__main__" and st is not None:
    render()
