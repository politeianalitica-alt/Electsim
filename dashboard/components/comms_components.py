"""
Comms Components — Bloque 16.

Componentes Streamlit para el módulo de comunicaciones.
Todos con fallback silencioso.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_STATUS_COLORS = {
    "draft": "#94a3b8", "review": "#f59e0b", "approved": "#22c55e",
    "scheduled": "#3b82f6", "published": "#16a34a", "rejected": "#ef4444",
    "archived": "#6b7280",
}
_PRIORITY_COLORS = {
    "CRITICAL": "#dc2626", "HIGH": "#f59e0b", "MEDIUM": "#3b82f6", "LOW": "#6b7280",
}
_ASSET_ICONS = {
    "linkedin_post": "💼", "tweet": "🐦", "thread": "🧵", "newsletter": "📧",
    "press_note": "📰", "briefing": "📋", "talking_points": "🗣️",
    "qa": "❓", "email": "✉️", "internal_memo": "📝", "speech": "🎤",
    "slide_outline": "📊", "infographic_copy": "📊",
}


def render_content_asset_card(asset: Any, show_body: bool = False) -> None:
    try:
        import streamlit as st
        if asset is None:
            return
        title = getattr(asset, "title", "—")
        atype = getattr(asset, "asset_type", "—")
        status = getattr(asset, "status", "draft")
        tone = getattr(asset, "tone", "") or ""
        evidence_count = len(getattr(asset, "evidence_ids", []))
        body = getattr(asset, "body_markdown", "")
        icon = _ASSET_ICONS.get(atype, "📄")
        color = _STATUS_COLORS.get(status, "#94a3b8")
        status_label = status.upper()

        with st.container():
            col1, col2 = st.columns([4, 1])
            with col1:
                st.markdown(f"{icon} **{title}**")
                st.caption(f"Tipo: `{atype}` · Tono: {tone}")
                if evidence_count:
                    st.caption(f"📎 {evidence_count} evidencias")
            with col2:
                st.markdown(
                    f'<span style="background:{color};color:white;padding:2px 8px;'
                    f'border-radius:4px;font-size:0.72rem">{status_label}</span>',
                    unsafe_allow_html=True,
                )
            if show_body and body:
                with st.expander("Ver contenido"):
                    st.markdown(body[:2000])
    except Exception as exc:
        logger.debug("render_content_asset_card: %s", exc)


def render_editorial_calendar(items: list, max_items: int = 20) -> None:
    try:
        import streamlit as st
        if not items:
            st.info("Sin elementos en el calendario editorial.")
            return
        st.markdown("**📅 Calendario editorial**")
        for item in items[:max_items]:
            title = getattr(item, "title", "—")
            status = getattr(item, "status", "idea")
            planned = getattr(item, "planned_at", None)
            priority = getattr(item, "priority", "MEDIUM")
            p_color = _PRIORITY_COLORS.get(priority, "#6b7280")
            s_color = _STATUS_COLORS.get(status, "#94a3b8")
            date_str = planned.strftime("%d/%m %H:%M") if planned else "—"
            col1, col2, col3 = st.columns([3, 1, 1])
            col1.markdown(f"**{title}**")
            col2.caption(f"📅 {date_str}")
            col3.markdown(
                f'<span style="background:{s_color};color:white;padding:1px 6px;border-radius:3px;font-size:0.7rem">{status}</span>',
                unsafe_allow_html=True,
            )
    except Exception as exc:
        logger.debug("render_editorial_calendar: %s", exc)


def render_publication_queue(jobs: list, max_items: int = 10) -> None:
    try:
        import streamlit as st
        if not jobs:
            st.info("Cola de publicación vacía.")
            return
        st.markdown("**📤 Cola de publicación (manual)**")
        for job in jobs[:max_items]:
            asset_id = getattr(job, "content_asset_id", "—")
            channel_id = getattr(job, "channel_id", "—")
            status = getattr(job, "status", "queued")
            scheduled = getattr(job, "scheduled_at", None)
            external_url = getattr(job, "external_url", "") or ""
            date_str = scheduled.strftime("%d/%m %H:%M") if scheduled else "—"
            color = _STATUS_COLORS.get(status, "#94a3b8")
            col1, col2, col3 = st.columns([3, 1, 1])
            col1.caption(f"Asset: `{asset_id[:12]}…` → Canal: `{channel_id[:12]}…`")
            col2.caption(f"🕐 {date_str}")
            col3.markdown(
                f'<span style="background:{color};color:white;padding:1px 5px;border-radius:3px;font-size:0.68rem">{status}</span>',
                unsafe_allow_html=True,
            )
            if external_url:
                st.caption(f"🔗 [{external_url[:60]}]({external_url})")
    except Exception as exc:
        logger.debug("render_publication_queue: %s", exc)


def render_approval_panel(approvals: list) -> None:
    try:
        import streamlit as st
        if not approvals:
            st.success("✅ Sin aprobaciones pendientes.")
            return
        st.warning(f"⚠️ {len(approvals)} aprobación(es) pendiente(s)")
        for a in approvals[:10]:
            asset_id = getattr(a, "content_asset_id", "—")
            requested_by = getattr(a, "requested_by", "") or "sistema"
            legal = getattr(a, "legal_review_required", False)
            risk = getattr(a, "risk_review_required", False)
            flags = []
            if legal:
                flags.append("⚖️ Legal")
            if risk:
                flags.append("⚠️ Riesgo")
            flag_str = " · ".join(flags) if flags else ""
            with st.expander(f"Pendiente: `{asset_id[:16]}…` ({requested_by})", expanded=False):
                st.caption(f"Revisión requerida: {flag_str or 'estándar'}")
    except Exception as exc:
        logger.debug("render_approval_panel: %s", exc)


def render_message_frame_card(frame: Any) -> None:
    try:
        import streamlit as st
        if frame is None:
            return
        title = getattr(frame, "title", "—")
        ftype = getattr(frame, "frame_type", "—")
        core = getattr(frame, "core_claim", "")
        points = getattr(frame, "supporting_points", [])
        tone = getattr(frame, "tone", "")
        evidence = getattr(frame, "evidence_ids", [])
        with st.container():
            st.markdown(f"**🎯 {title}**")
            st.caption(f"Tipo: `{ftype}` · Tono: {tone} · Evidencias: {len(evidence)}")
            if core:
                st.markdown(f"> {core[:300]}")
            if points:
                with st.expander("Puntos de apoyo"):
                    for p in points[:5]:
                        st.markdown(f"• {p}")
    except Exception as exc:
        logger.debug("render_message_frame_card: %s", exc)


def render_distribution_list_card(dist: Any) -> None:
    try:
        import streamlit as st
        if dist is None:
            return
        name = getattr(dist, "name", "—")
        ltype = getattr(dist, "list_type", "—")
        use = getattr(dist, "allowed_use", "—")
        consent = getattr(dist, "consent_required", True)
        members = getattr(dist, "static_members", [])
        with st.container():
            col1, col2 = st.columns([3, 1])
            col1.markdown(f"**📋 {name}**")
            col1.caption(f"Tipo: {ltype} · Uso: {use}")
            col2.metric("Miembros estáticos", len(members))
            if consent:
                st.caption("✅ Consentimiento requerido")
            else:
                st.caption("⚠️ Sin verificación de consentimiento")
    except Exception as exc:
        logger.debug("render_distribution_list_card: %s", exc)


def render_performance_panel(outliers: list) -> None:
    try:
        import streamlit as st
        if not outliers:
            st.info("Sin datos de performance disponibles.")
            return
        st.markdown("**📊 Performance destacada**")
        for o in outliers[:10]:
            atype = o.get("type", "—")
            rate = o.get("engagement_rate", 0)
            deviation = o.get("deviation", 0)
            icon = "🚀" if atype == "high" else "📉"
            st.caption(f"{icon} Asset `{o.get('asset_id', '—')[:12]}…` — ER: {rate:.2%} (×{deviation} vs. media)")
    except Exception as exc:
        logger.debug("render_performance_panel: %s", exc)


def render_content_recommendation_card(rec: dict) -> None:
    try:
        import streamlit as st
        if not rec:
            return
        tipo = rec.get("tipo", rec.get("asset_type", "—"))
        titulo = rec.get("titulo", rec.get("rationale", "Recomendación"))
        severidad = rec.get("severidad", rec.get("priority", "MEDIUM"))
        color = _PRIORITY_COLORS.get(severidad, "#6b7280")
        datos = rec.get("datos", {})
        with st.container():
            st.markdown(
                f'<span style="background:{color};color:white;padding:2px 6px;'
                f'border-radius:4px;font-size:0.7rem">{severidad}</span> **{titulo}**',
                unsafe_allow_html=True,
            )
            st.caption(f"Tipo: `{tipo}`")
            if datos:
                st.caption(str(datos)[:200])
    except Exception as exc:
        logger.debug("render_content_recommendation_card: %s", exc)


def render_channel_card(channel: Any) -> None:
    try:
        import streamlit as st
        if channel is None:
            return
        name = getattr(channel, "name", "—")
        ctype = getattr(channel, "channel_type", "—")
        limit = getattr(channel, "character_limit", None)
        approval = getattr(channel, "requires_approval", True)
        active = getattr(channel, "is_active", True)
        ICONS = {
            "linkedin": "💼", "twitter_x": "🐦", "newsletter": "📧",
            "email": "✉️", "press_release": "📰", "briefing": "📋",
            "internal_memo": "📝", "other": "📡",
        }
        icon = ICONS.get(ctype, "📡")
        col1, col2, col3 = st.columns([2, 1, 1])
        col1.markdown(f"{icon} **{name}**")
        col1.caption(f"`{ctype}`" + (f" · {limit} chars" if limit else ""))
        col2.caption("✅ Activo" if active else "❌ Inactivo")
        col3.caption("🔒 Aprobación" if approval else "⚡ Directo")
    except Exception as exc:
        logger.debug("render_channel_card: %s", exc)


def render_comms_kpis_row(kpis: dict) -> None:
    try:
        import streamlit as st
        if not kpis:
            st.info("KPIs de comunicación no disponibles.")
            return
        cols = st.columns(6)
        cols[0].metric("Assets totales", kpis.get("total_assets", 0))
        cols[1].metric("En revisión", kpis.get("review", 0))
        cols[2].metric("Aprobados", kpis.get("approved", 0))
        cols[3].metric("Publicados", kpis.get("published", 0))
        cols[4].metric("Aprobaciones pendientes", kpis.get("pending_approvals", 0), delta_color="inverse")
        cols[5].metric("Cola publicación", kpis.get("publication_queue", 0))
    except Exception as exc:
        logger.debug("render_comms_kpis_row: %s", exc)
