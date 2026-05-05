"""
dashboard/components/platform_status.py — Paneles de estado de plataforma.

Uso en D10/N9:
    from dashboard.components.platform_status import (
        render_module_health_matrix, render_schema_contract_status,
        render_db_status_banner, render_pending_actions_row
    )
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def render_db_status_banner() -> None:
    """Banner compacto de estado de DB (para cabecera de N9/D10)."""
    try:
        import streamlit as st
        from dashboard.services.platform_health import cargar_db_health, cargar_migration_status

        db = cargar_db_health()
        col1, col2, col3 = st.columns(3)

        with col1:
            if db.get("ok"):
                st.success("🟢 PostgreSQL activo")
            else:
                st.error("🔴 DB no conectada")

        with col2:
            mig = cargar_migration_status()
            rev = mig.get("current_revision", "?")
            if mig.get("ok"):
                st.info(f"✅ Migración: `{rev}`")
            else:
                st.warning(f"⚠️ Migraciones: {mig.get('message', '?')[:60]}")

        with col3:
            if db.get("ok"):
                st.success("🟢 Sistema operativo")
            else:
                st.warning("⚠️ Modo fallback activo")
    except Exception as exc:
        logger.debug("render_db_status_banner error: %s", exc)


def render_module_health_matrix() -> None:
    """Matriz de salud por módulo: real / fallback / unavailable / error."""
    try:
        import streamlit as st
        from dashboard.services.platform_health import cargar_module_modes

        modes = cargar_module_modes()
        if not modes:
            st.caption("Estado de módulos no disponible.")
            return

        MODE_ICON = {
            "real": "🟢",
            "unavailable": "⚫",
            "error": "🔴",
            "fallback": "🟠",
            "demo": "🟡",
        }

        cols = st.columns(min(len(modes), 4))
        for i, (mod, mode) in enumerate(modes.items()):
            with cols[i % 4]:
                icon = MODE_ICON.get(mode, "⚪")
                st.markdown(
                    f'<div style="text-align:center;padding:.3rem">'
                    f'<div style="font-size:1.2rem">{icon}</div>'
                    f'<div style="font-size:.65rem;opacity:.7">{mod}</div>'
                    f'<div style="font-size:.6rem;font-weight:600">{mode.upper()}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
    except Exception as exc:
        logger.debug("render_module_health_matrix error: %s", exc)


def render_schema_contract_status() -> None:
    """Estado de contratos schema↔DB por tabla."""
    try:
        import streamlit as st
        from dashboard.services.platform_health import cargar_schema_status

        status = cargar_schema_status()
        if not status:
            st.caption("Contratos schema no disponibles (DB no conectada).")
            return

        for table, info in status.items():
            ok = info.get("ok", False)
            mode = info.get("mode", "unknown")
            missing = info.get("missing_in_db", [])

            if ok:
                st.markdown(f"✅ `{table}` — contrato OK")
            elif mode == "unavailable":
                st.markdown(f"⚫ `{table}` — tabla no existe (correr `alembic upgrade head`)")
            else:
                cols_missing = ", ".join(missing[:5])
                st.markdown(f"❌ `{table}` — faltan: `{cols_missing}`")
    except Exception as exc:
        logger.debug("render_schema_contract_status error: %s", exc)


def render_pending_actions_row(tenant_id: str = "default") -> None:
    """Fila de KPIs de acciones pendientes: aprobaciones, tareas, alertas."""
    try:
        import streamlit as st
        from dashboard.services.platform_health import cargar_pending_actions_summary

        summary = cargar_pending_actions_summary(tenant_id)

        col1, col2, col3 = st.columns(3)
        with col1:
            n = summary.get("pending_approvals", 0)
            st.metric("📋 Aprobaciones pendientes", n, delta=None)
        with col2:
            n = summary.get("due_tasks", 0)
            st.metric("✅ Tareas CRM venciendo", n, delta=None)
        with col3:
            n = summary.get("active_alerts", 0)
            st.metric("🔔 Alertas activas", n, delta=None)
    except Exception as exc:
        logger.debug("render_pending_actions_row error: %s", exc)


def render_system_mode_summary() -> None:
    """Resumen textual del estado del sistema."""
    try:
        import streamlit as st
        from dashboard.services.platform_health import cargar_platform_status

        report = cargar_platform_status()
        overall_ok = report.get("overall_ok", False)

        if overall_ok:
            st.success("✅ Sistema en estado operativo. Todos los módulos activos.")
        else:
            db_ok = report.get("database", {}).get("ok", False)
            if not db_ok:
                st.error("🔴 Base de datos no conectada. Los módulos operan en modo fallback.")
            else:
                missing = report.get("tables", {}).get("missing", [])
                if missing:
                    st.warning(
                        f"⚠️ {len(missing)} tabla(s) ausente(s). "
                        f"Ejecuta `alembic upgrade head` para crear: {', '.join(missing[:3])}"
                    )
    except Exception as exc:
        logger.debug("render_system_mode_summary error: %s", exc)
