"""
Security package — Bloque 13.

Security, Tenant & Deployment Core para ElectSim.
Convierte la plataforma en un SaaS enterprise-ready.

Importaciones principales::

    from security.settings import settings
    from security.auth import get_current_user, require_permission
    from security.rbac import has_permission, get_user_roles
    from security.audit import log_audit_event
    from security.tenants import get_tenant, get_default_tenant
"""
from __future__ import annotations

__all__ = [
    "settings",
]
