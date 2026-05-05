"""
dashboard/components/audit_components.py — Componentes UI para auditoría.

Uso en N9/Security:
    from dashboard.components.audit_components import (
        render_audit_timeline, render_brain_tool_audit_panel
    )
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)


def _get_audit_events(tenant_id: str = "default", limit: int = 50) -> list[dict]:
    """Carga eventos de auditoría — con fallback silencioso."""
    try:
        from security.repository import SecurityRepository
        repo = SecurityRepository()
        return repo.list_audit_events(tenant_id, limit=limit)
    except Exception:
        return []


def render_audit_timeline(tenant_id: str = "default", limit: int = 20) -> None:
    """Renderiza timeline de últimos eventos de auditoría."""
    try:
        import streamlit as st
        events = _get_audit_events(tenant_id, limit)

        if not events:
            st.caption("Sin eventos de auditoría recientes.")
            return

        for ev in events[:limit]:
            action = ev.get("action", "")
            resource = ev.get("resource_type", "")
            user_id = ev.get("user_id", "anon")
            result = ev.get("result", "")
            created = ev.get("created_at", "")

            icon = "✅" if result == "success" else ("🔴" if result == "denied" else "📋")
            st.markdown(
                f"{icon} **{action}** en `{resource}` — usuario: `{user_id}` — {created}",
                help=f"Resultado: {result}",
            )
    except Exception as exc:
        logger.debug("render_audit_timeline error: %s", exc)
        try:
            import streamlit as st
            st.caption("Auditoría no disponible.")
        except Exception:
            pass


def render_audit_event_card(event: dict[str, Any]) -> None:
    """Renderiza una tarjeta individual de evento de auditoría."""
    try:
        import streamlit as st
        action = event.get("action", "")
        resource = event.get("resource_type", "")
        result = event.get("result", "")
        user_id = event.get("user_id", "anon")
        metadata = event.get("metadata", {})

        color = (
            "#22c55e" if result == "success"
            else ("#ef4444" if result in ("denied", "blocked") else "#f59e0b")
        )
        st.markdown(
            f'<div style="border-left:3px solid {color};padding:.4rem .8rem;margin-bottom:.3rem">'
            f'<b>{action}</b> → {resource} | usuario: {user_id} | resultado: {result}'
            f"</div>",
            unsafe_allow_html=True,
        )
    except Exception as exc:
        logger.debug("render_audit_event_card error: %s", exc)


def render_permission_denials_table(tenant_id: str = "default") -> None:
    """Renderiza tabla de intentos denegados."""
    try:
        import streamlit as st
        import pandas as pd
        events = _get_audit_events(tenant_id, limit=100)
        denials = [e for e in events if e.get("result") in ("denied", "blocked", "forbidden")]

        if not denials:
            st.success("Sin intentos denegados recientes.")
            return

        df = pd.DataFrame(denials)[["action", "resource_type", "user_id", "result", "created_at"]]
        st.dataframe(df, use_container_width=True)
    except Exception as exc:
        logger.debug("render_permission_denials_table error: %s", exc)
        try:
            import streamlit as st
            st.caption("No se puede cargar la tabla de denegaciones.")
        except Exception:
            pass


def render_sensitive_exports_panel(tenant_id: str = "default") -> None:
    """Renderiza panel de exports sensibles."""
    try:
        import streamlit as st
        events = _get_audit_events(tenant_id, limit=100)
        exports = [e for e in events if e.get("resource_type") == "export"]

        if not exports:
            st.info("Sin exports registrados.")
            return

        st.caption(f"📤 {len(exports)} export(s) registrado(s):")
        for exp in exports[:10]:
            user_id = exp.get("user_id", "anon")
            action = exp.get("action", "")
            created = exp.get("created_at", "")
            st.markdown(f"- `{user_id}` → {action} ({created})")
    except Exception as exc:
        logger.debug("render_sensitive_exports_panel error: %s", exc)


def render_brain_tool_audit_panel(tenant_id: str = "default") -> None:
    """Renderiza panel de tools Brain ejecutadas."""
    try:
        import streamlit as st
        events = _get_audit_events(tenant_id, limit=100)
        brain_calls = [e for e in events if e.get("resource_type") == "brain_tool"]

        if not brain_calls:
            st.info("Sin llamadas Brain tool registradas.")
            return

        # Contar por tool
        tool_counts: dict[str, int] = {}
        for ev in brain_calls:
            tool = ev.get("resource_id", "unknown")
            tool_counts[tool] = tool_counts.get(tool, 0) + 1

        st.caption(f"🧠 {len(brain_calls)} tool call(s) — {len(tool_counts)} tools distintas:")
        for tool, count in sorted(tool_counts.items(), key=lambda x: -x[1])[:10]:
            st.markdown(f"- `{tool}`: {count}×")
    except Exception as exc:
        logger.debug("render_brain_tool_audit_panel error: %s", exc)
