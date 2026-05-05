"""
CRM Components — Bloque 15.

Componentes Streamlit para el módulo CRM.
Todos con fallback silencioso — nunca rompen.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Colores por severidad/prioridad
_PRIORITY_COLORS = {
    "CRÍTICA": "#dc2626",
    "ALTA": "#f59e0b",
    "NORMAL": "#3b82f6",
    "BAJA": "#6b7280",
}
_CONSENT_COLORS = {
    "consented": "#22c55e",
    "legitimate_interest": "#84cc16",
    "unknown": "#94a3b8",
    "do_not_contact": "#ef4444",
    "revoked": "#dc2626",
}
_CONSENT_LABELS = {
    "consented": "✅ Consentido",
    "legitimate_interest": "🔵 Interés legítimo",
    "unknown": "❓ Desconocido",
    "do_not_contact": "🚫 No contactar",
    "revoked": "❌ Revocado",
}


def render_contact_card(contact: Any, expanded: bool = False) -> None:
    """Tarjeta de contacto."""
    try:
        import streamlit as st
        if contact is None:
            st.info("Contacto no disponible.")
            return

        name = getattr(contact, "full_name", "—")
        ctype = getattr(contact, "contact_type", "—")
        position = getattr(contact, "position", "") or ""
        territory = getattr(contact, "territory", "") or ""
        consent = getattr(contact, "consent_status", "unknown")
        email = getattr(contact, "email", "") or ""

        color = _CONSENT_COLORS.get(consent, "#94a3b8")
        consent_label = _CONSENT_LABELS.get(consent, consent)

        with st.container():
            col1, col2 = st.columns([3, 1])
            with col1:
                st.markdown(f"**{name}**")
                if position:
                    st.caption(f"{position} · {ctype}")
                if territory:
                    st.caption(f"📍 {territory}")
                if email:
                    st.caption(f"✉️ {email}")
            with col2:
                st.markdown(
                    f'<span style="background:{color};color:white;padding:2px 8px;'
                    f'border-radius:4px;font-size:0.75rem">{consent_label}</span>',
                    unsafe_allow_html=True,
                )
    except Exception as exc:
        logger.debug("render_contact_card: %s", exc)


def render_organization_card(org: Any) -> None:
    """Tarjeta de organización."""
    try:
        import streamlit as st
        if org is None:
            st.info("Organización no disponible.")
            return

        name = getattr(org, "name", "—")
        otype = getattr(org, "org_type", "—")
        sector = getattr(org, "sector", "") or ""
        territory = getattr(org, "territory", "") or ""
        website = getattr(org, "website", "") or ""

        with st.container():
            st.markdown(f"**🏛 {name}**")
            cols = st.columns(3)
            cols[0].caption(f"Tipo: {otype}")
            if sector:
                cols[1].caption(f"Sector: {sector}")
            if territory:
                cols[2].caption(f"📍 {territory}")
            if website:
                st.caption(f"🌐 [{website}]({website})")
    except Exception as exc:
        logger.debug("render_organization_card: %s", exc)


def render_stakeholder_priority_card(profile: Any) -> None:
    """Tarjeta de prioridad stakeholder."""
    try:
        import streamlit as st
        if profile is None:
            return

        score = getattr(profile, "priority_score", 0)
        label = getattr(profile, "priority_label", "BAJA")
        obj_type = getattr(profile, "object_type", "contact")
        obj_id = getattr(profile, "object_id", "—")
        actions = getattr(profile, "recommended_actions", [])

        color = _PRIORITY_COLORS.get(label, "#6b7280")

        with st.container():
            col1, col2 = st.columns([2, 1])
            with col1:
                st.markdown(f"**{obj_type.upper()}** `{obj_id[:12]}…`")
                if actions:
                    for a in actions[:3]:
                        st.caption(f"• {a}")
            with col2:
                st.markdown(
                    f'<div style="text-align:center">'
                    f'<span style="font-size:1.5rem;font-weight:700;color:{color}">{score:.0f}</span><br>'
                    f'<span style="background:{color};color:white;padding:2px 6px;border-radius:4px;font-size:0.7rem">{label}</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
    except Exception as exc:
        logger.debug("render_stakeholder_priority_card: %s", exc)


def render_interaction_timeline(interactions: list, max_items: int = 10) -> None:
    """Timeline de interacciones."""
    try:
        import streamlit as st
        if not interactions:
            st.info("Sin interacciones registradas.")
            return

        st.markdown("**📋 Historial de interacciones**")
        for interaction in interactions[:max_items]:
            itype = getattr(interaction, "interaction_type", "—")
            subject = getattr(interaction, "subject", "") or ""
            summary = getattr(interaction, "summary", "") or ""
            occurred = getattr(interaction, "occurred_at", None)
            sentiment = getattr(interaction, "sentiment", "neutral")

            sentiment_icon = {"positive": "😊", "negative": "😟", "neutral": "😐"}.get(sentiment, "😐")
            date_str = occurred.strftime("%d/%m/%Y") if occurred else "—"

            with st.expander(f"{sentiment_icon} {itype.upper()} — {date_str}" + (f" · {subject[:60]}" if subject else ""), expanded=False):
                if summary:
                    st.markdown(summary[:500])
                follow_up = getattr(interaction, "follow_up_required", False)
                if follow_up:
                    st.warning("⚠️ Requiere seguimiento")
    except Exception as exc:
        logger.debug("render_interaction_timeline: %s", exc)


def render_outreach_task_card(task: Any) -> None:
    """Tarjeta de tarea de outreach."""
    try:
        import streamlit as st
        if task is None:
            return

        title = getattr(task, "title", "—")
        ttype = getattr(task, "task_type", "—")
        priority = getattr(task, "priority", "NORMAL")
        due = getattr(task, "due_date", None)
        assigned = getattr(task, "assigned_to", "") or ""
        status = getattr(task, "status", "pending")

        color = _PRIORITY_COLORS.get(priority, "#6b7280")
        due_str = due.strftime("%d/%m/%Y") if due else "—"

        icon = {"pending": "⏳", "in_progress": "🔄", "done": "✅", "cancelled": "❌"}.get(status, "⏳")

        st.markdown(
            f'{icon} **{title}** '
            f'<span style="background:{color};color:white;padding:1px 6px;border-radius:4px;font-size:0.7rem">{priority}</span>',
            unsafe_allow_html=True,
        )
        cols = st.columns(3)
        cols[0].caption(f"Tipo: {ttype}")
        cols[1].caption(f"Vence: {due_str}")
        if assigned:
            cols[2].caption(f"👤 {assigned}")
    except Exception as exc:
        logger.debug("render_outreach_task_card: %s", exc)


def render_relationship_graph_panel(graph: dict) -> None:
    """Panel de grafo de relaciones (texto, sin visualización pesada)."""
    try:
        import streamlit as st
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])

        if not nodes:
            st.info("Sin relaciones registradas.")
            return

        col1, col2 = st.columns(2)
        col1.metric("Nodos", len(nodes))
        col2.metric("Conexiones", len(edges))

        with st.expander("Ver nodos", expanded=False):
            for n in nodes[:20]:
                nid = n.get("id", "—")
                ntype = n.get("type", "—")
                nlabel = n.get("label", nid)
                st.caption(f"• **{ntype}** `{nid}` — {nlabel}")

        with st.expander("Ver conexiones", expanded=False):
            for e in edges[:30]:
                st.caption(f"• `{e.get('source','')}` → `{e.get('target','')}` ({e.get('rel_type','—')})")
    except Exception as exc:
        logger.debug("render_relationship_graph_panel: %s", exc)


def render_segment_card(segment: Any) -> None:
    """Tarjeta de segmento de contactos."""
    try:
        import streamlit as st
        if segment is None:
            return

        name = getattr(segment, "name", "—")
        stype = getattr(segment, "segment_type", "—")
        desc = getattr(segment, "description", "") or ""
        members = getattr(segment, "static_members", [])

        with st.container():
            st.markdown(f"**🎯 {name}** · `{stype}`")
            if desc:
                st.caption(desc[:150])
            if stype == "static":
                st.caption(f"Miembros estáticos: {len(members)}")
    except Exception as exc:
        logger.debug("render_segment_card: %s", exc)


def render_mobilization_event_card(event: Any) -> None:
    """Tarjeta de evento de movilización."""
    try:
        import streamlit as st
        if event is None:
            return

        name = getattr(event, "name", "—")
        etype = getattr(event, "event_type", "—")
        territory = getattr(event, "territory", "") or ""
        scheduled = getattr(event, "scheduled_at", None)
        status = getattr(event, "status", "planned")
        target = getattr(event, "target_count", 0)
        confirmed = getattr(event, "confirmed_count", 0)

        date_str = scheduled.strftime("%d/%m/%Y %H:%M") if scheduled else "—"
        status_icon = {"planned": "📅", "confirmed": "✅", "completed": "🏁", "cancelled": "❌"}.get(status, "📅")

        with st.container():
            st.markdown(f"{status_icon} **{name}**")
            cols = st.columns(4)
            cols[0].caption(f"Tipo: {etype}")
            cols[1].caption(f"📅 {date_str}")
            if territory:
                cols[2].caption(f"📍 {territory}")
            cols[3].caption(f"👥 {confirmed}/{target}")
    except Exception as exc:
        logger.debug("render_mobilization_event_card: %s", exc)


def render_meeting_pack_panel(meeting_pack: Any) -> None:
    """Panel de Meeting Pack pre-reunión."""
    try:
        import streamlit as st
        if meeting_pack is None:
            st.info("No hay meeting pack disponible.")
            return

        contact_name = getattr(meeting_pack, "contact_name", "—")
        meeting_time = getattr(meeting_pack, "meeting_time", None)
        last_interaction = getattr(meeting_pack, "last_interaction_summary", "")
        legal_items = getattr(meeting_pack, "legal_items_to_watch", [])
        geo_exposure = getattr(meeting_pack, "geo_exposure", [])
        risk_alerts = getattr(meeting_pack, "risk_alerts", [])
        questions = getattr(meeting_pack, "suggested_questions", [])
        actions = getattr(meeting_pack, "recommended_actions", [])

        date_str = meeting_time.strftime("%d/%m/%Y %H:%M") if meeting_time else "—"

        st.subheader(f"📋 Meeting Pack — {contact_name}")
        st.caption(f"Reunión: {date_str}")

        if last_interaction:
            with st.expander("Último contacto", expanded=True):
                st.markdown(last_interaction)

        if legal_items:
            with st.expander(f"⚖️ Temas legislativos ({len(legal_items)})", expanded=False):
                for item in legal_items:
                    st.markdown(f"• {item}")

        if geo_exposure:
            with st.expander(f"🌍 Exposición geopolítica ({len(geo_exposure)})", expanded=False):
                for item in geo_exposure:
                    st.markdown(f"• {item}")

        if risk_alerts:
            with st.expander(f"⚠️ Alertas de riesgo ({len(risk_alerts)})", expanded=False):
                for alert in risk_alerts:
                    st.warning(f"• {alert}")

        if questions:
            with st.expander(f"❓ Preguntas sugeridas ({len(questions)})", expanded=True):
                for q in questions:
                    st.markdown(f"• {q}")

        if actions:
            with st.expander(f"✅ Acciones recomendadas ({len(actions)})", expanded=False):
                for a in actions:
                    st.markdown(f"• {a}")
    except Exception as exc:
        logger.debug("render_meeting_pack_panel: %s", exc)


def render_crm_kpis_row(kpis: dict) -> None:
    """Fila de KPIs del CRM."""
    try:
        import streamlit as st
        if not kpis:
            st.info("KPIs CRM no disponibles.")
            return

        cols = st.columns(6)
        cols[0].metric("Contactos", kpis.get("total_contactos", 0))
        cols[1].metric("Organizaciones", kpis.get("total_organizaciones", 0))
        cols[2].metric("Stakeholders", kpis.get("total_stakeholders", 0))
        cols[3].metric("Tareas (7d)", kpis.get("tareas_proximas_7d", 0))
        cols[4].metric("Vencidas", kpis.get("tareas_vencidas", 0), delta_color="inverse")
        cols[5].metric("Consentimiento", f"{kpis.get('pct_consentimiento', 0)}%")
    except Exception as exc:
        logger.debug("render_crm_kpis_row: %s", exc)
