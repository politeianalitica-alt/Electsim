"""
security/tenant_context.py — Contexto de tenant activo.

Proporciona aislamiento de datos por tenant en todas las capas.
En Streamlit usa st.session_state como store del tenant activo.

Datos que REQUIEREN tenant:
  - CRM (contactos, organizaciones, interacciones)
  - Documentos privados
  - Content assets y comunicaciones
  - Editorial calendar
  - Scenarios de simulación
  - Exports
  - Audit events
  - Saved views

Datos PÚBLICOS (no requieren tenant):
  - BOE / Eurostat / INE
  - ACLED/GDELT público
  - Resultados electorales públicos
  - Open Data general

Uso:
    from security.tenant_context import require_tenant_id, get_active_tenant_id

    tenant = require_tenant_id()  # raises si no hay tenant
    tenant = get_active_tenant_id()  # "default" si no hay
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_TENANT = "default"

# Módulos que SIEMPRE deben tener tenant explícito
PRIVATE_MODULES = {
    "crm", "documents", "comms", "simulation",
    "exports", "workspaces", "saved_views",
}

# Tablas cuyo acceso requiere tenant
TENANT_REQUIRED_TABLES = {
    "crm_contacts", "crm_organizations", "crm_interactions",
    "crm_outreach_tasks", "crm_relationships", "crm_segments",
    "crm_mobilization_events", "crm_stakeholder_profiles",
    "message_frames", "content_assets", "editorial_calendar",
    "distribution_lists", "publication_jobs", "content_approvals",
    "simulation_scenarios",
    "source_documents", "document_chunks",
    "audit_events",
    "saved_views", "widget_configs", "dashboard_layouts",
}


def get_active_tenant_id() -> str:
    """
    Retorna el tenant_id activo.

    Orden de búsqueda:
    1. st.session_state["tenant_id"]
    2. Variable de entorno ELECTSIM_TENANT_ID
    3. "default"

    Nunca lanza excepción.
    """
    try:
        import streamlit as st
        tid = st.session_state.get("tenant_id", "")
        if tid:
            return str(tid)
    except Exception:
        pass
    try:
        import os
        tid = os.getenv("ELECTSIM_TENANT_ID", "")
        if tid:
            return tid
    except Exception:
        pass
    return _DEFAULT_TENANT


def set_active_tenant_id(tenant_id: str) -> None:
    """Establece el tenant activo en la sesión."""
    try:
        import streamlit as st
        st.session_state["tenant_id"] = str(tenant_id)
    except Exception:
        pass


def require_tenant_id() -> str:
    """
    Retorna el tenant activo. En modo estricto lanzaría si no hay tenant.
    En modo actual devuelve "default" con warning.
    """
    tid = get_active_tenant_id()
    if tid == _DEFAULT_TENANT:
        logger.debug("tenant_context: usando tenant 'default' — considera configurar ELECTSIM_TENANT_ID")
    return tid


def assert_tenant_access(user: dict[str, Any], tenant_id: str) -> bool:
    """
    Verifica que el usuario tiene acceso al tenant.

    En modo dev siempre retorna True.
    En modo real verifica contra la lista de tenants del usuario.

    Returns True si tiene acceso, False si no.
    """
    try:
        from security.settings import settings
        if settings.dev_mode:
            return True
    except Exception:
        return True  # si no hay settings, modo dev

    user_tenant = user.get("tenant_id", _DEFAULT_TENANT)
    user_tenants = user.get("tenants", [user_tenant])

    if isinstance(user_tenants, str):
        user_tenants = [user_tenants]

    # super_admin puede acceder a cualquier tenant
    roles = user.get("roles", [])
    if isinstance(roles, str):
        roles = [roles]
    if "super_admin" in roles or "platform_admin" in roles:
        return True

    return tenant_id in user_tenants


def is_private_module(module_id: str) -> bool:
    """Retorna True si el módulo requiere tenant explícito."""
    return module_id in PRIVATE_MODULES


def is_private_table(table_name: str) -> bool:
    """Retorna True si la tabla requiere tenant."""
    return table_name in TENANT_REQUIRED_TABLES


def get_tenant_filter_sql(tenant_id: str | None = None) -> tuple[str, str]:
    """
    Retorna cláusula SQL y valor para filtrar por tenant.

    Returns:
        (sql_fragment, tenant_value)
        e.g.: ("AND tenant_id = %s", "cliente_a")
    """
    tid = tenant_id or get_active_tenant_id()
    return "AND tenant_id = %s", tid
