"""
core/module_registry.py — Registro oficial de módulos, permisos y páginas.

Fuente de verdad única para:
  - IDs de módulo
  - Página asociada
  - Permiso requerido para leer
  - Tabla DB principal
  - Estado esperado

Uso:
    from core.module_registry import MODULES, get_module, required_permission
"""
from __future__ import annotations

from typing import Any


# ── Registro de módulos ───────────────────────────────────────────────────────

MODULES: dict[str, dict[str, Any]] = {
    # ── Dashboard D-series ────────────────────────────────────────────────────
    "briefings": {
        "id": "briefings",
        "label": "Briefings",
        "page_id": "D1",
        "page_file": "D1_Briefings.py",
        "read_permission": "briefings:read",
        "write_permission": "briefings:write",
        "db_table": "source_documents",
        "module_group": "intelligence",
        "active": True,
    },
    "actors": {
        "id": "actors",
        "label": "Mapa de Actores",
        "page_id": "D2",
        "page_file": "D2_Actores.py",
        "read_permission": "risk:read",
        "write_permission": "risk:write",
        "db_table": "crm_contacts",
        "module_group": "intelligence",
        "active": True,
    },
    "risk": {
        "id": "risk",
        "label": "Termómetro de Riesgo",
        "page_id": "D3",
        "page_file": "D3_Termometro.py",
        "read_permission": "risk:read",
        "write_permission": "risk:write",
        "db_table": None,
        "module_group": "intelligence",
        "active": True,
    },
    "legislative": {
        "id": "legislative",
        "label": "Monitor Legislativo",
        "page_id": "D4",
        "page_file": "D4_Legislativo.py",
        "read_permission": "legislative:read",
        "write_permission": "legislative:write",
        "db_table": None,
        "module_group": "intelligence",
        "active": True,
    },
    "coalition": {
        "id": "coalition",
        "label": "Gobierno & Coalición",
        "page_id": "D5",
        "page_file": "D5_Coalicion.py",
        "read_permission": "electoral:read",
        "write_permission": "electoral:write",
        "db_table": None,
        "module_group": "electoral",
        "active": True,
    },
    "alerts": {
        "id": "alerts",
        "label": "Alertas",
        "page_id": "D6",
        "page_file": "D6_Alertas.py",
        "read_permission": "briefings:read",
        "write_permission": None,
        "db_table": None,
        "module_group": "intelligence",
        "active": True,
    },
    "media": {
        "id": "media",
        "label": "Medios & Narrativa",
        "page_id": "D7",
        "page_file": "D7_Medios.py",
        "read_permission": "media:read",
        "write_permission": "media:write",
        "db_table": None,
        "module_group": "intelligence",
        "active": True,
    },
    "geopolitics": {
        "id": "geopolitics",
        "label": "Geopolítica & RRII",
        "page_id": "D8",
        "page_file": "D8_Geopolitica.py",
        "read_permission": "geopolitics:read",
        "write_permission": None,
        "db_table": "geo_events",
        "module_group": "intelligence",
        "active": True,
    },
    "operations": {
        "id": "operations",
        "label": "Centro de Operaciones",
        "page_id": "D10",
        "page_file": "D10_Centro_Operaciones.py",
        "read_permission": "data_ops:read",
        "write_permission": "data_ops:run_pipeline",
        "db_table": None,
        "module_group": "ops",
        "active": True,
    },
    # ── Dashboard N-series ────────────────────────────────────────────────────
    "electoral": {
        "id": "electoral",
        "label": "Electoral",
        "page_id": "N1",
        "page_file": "N1_Electoral.py",
        "read_permission": "electoral:read",
        "write_permission": "electoral:write",
        "db_table": None,
        "module_group": "electoral",
        "active": True,
    },
    "campaign": {
        "id": "campaign",
        "label": "Campaña",
        "page_id": "N5",
        "page_file": "N5_Campana.py",
        "read_permission": "campaign:read",
        "write_permission": "campaign:write",
        "db_table": None,
        "module_group": "campaign",
        "active": True,
    },
    "economy": {
        "id": "economy",
        "label": "Economía",
        "page_id": "N6",
        "page_file": "N6_Economia.py",
        "read_permission": "economic:read",
        "write_permission": None,
        "db_table": None,
        "module_group": "intelligence",
        "active": True,
    },
    "brain": {
        "id": "brain",
        "label": "Politeia Brain",
        "page_id": "N8",
        "page_file": "N8_ChatIA.py",
        "read_permission": "brain:use_tools",
        "write_permission": "brain:admin",
        "db_table": None,
        "module_group": "ai",
        "active": True,
    },
    "command_center": {
        "id": "command_center",
        "label": "Command Center",
        "page_id": "N9",
        "page_file": "N9_Command_Center.py",
        "read_permission": "data_ops:read",
        "write_permission": "security:admin",
        "db_table": None,
        "module_group": "ops",
        "active": True,
    },
    # ── Cross-cutting modules ─────────────────────────────────────────────────
    "crm": {
        "id": "crm",
        "label": "CRM",
        "page_id": "CRM",
        "page_file": None,
        "read_permission": "crm:read",
        "write_permission": "crm:write",
        "db_table": "crm_contacts",
        "module_group": "crm",
        "active": True,
    },
    "comms": {
        "id": "comms",
        "label": "Comunicaciones",
        "page_id": "COMMS",
        "page_file": None,
        "read_permission": "comms:read",
        "write_permission": "comms:create",
        "db_table": "content_assets",
        "module_group": "comms",
        "active": True,
    },
    "documents": {
        "id": "documents",
        "label": "Documentos",
        "page_id": "DOCS",
        "page_file": None,
        "read_permission": "documents:read",
        "write_permission": "documents:write",
        "db_table": "source_documents",
        "module_group": "intelligence",
        "active": True,
    },
    "simulation": {
        "id": "simulation",
        "label": "Simulación",
        "page_id": "SIM",
        "page_file": None,
        "read_permission": "simulation:read",
        "write_permission": "simulation:run",
        "db_table": "simulation_scenarios",
        "module_group": "analytics",
        "active": True,
    },
    "security": {
        "id": "security",
        "label": "Seguridad",
        "page_id": "SEC",
        "page_file": None,
        "read_permission": "audit:read",
        "write_permission": "security:manage_roles",
        "db_table": "audit_events",
        "module_group": "ops",
        "active": True,
    },
    "data_ops": {
        "id": "data_ops",
        "label": "Data Ops",
        "page_id": "DATAOPS",
        "page_file": None,
        "read_permission": "data_ops:read",
        "write_permission": "data_ops:run_pipeline",
        "db_table": None,
        "module_group": "ops",
        "active": True,
    },
    "opendata": {
        "id": "opendata",
        "label": "Open Data",
        "page_id": "D9",
        "page_file": None,
        "read_permission": "opendata:read",
        "write_permission": "opendata:write",
        "db_table": None,
        "module_group": "data",
        "active": True,
    },
}


# ── Permisos estándar ─────────────────────────────────────────────────────────

STANDARD_ACTIONS = ["read", "write", "admin", "export", "run"]

SPECIAL_PERMISSIONS = [
    "brain:use_tools",
    "risk:read_sensitive",
    "data_ops:run_pipeline",
    "security:manage_roles",
    "comms:create",
    "comms:approve",
    "crm:import",
    "export:approve",
]

# ── Tool → Permission mapping ─────────────────────────────────────────────────

TOOL_PERMISSIONS: dict[str, list[str]] = {
    "crm_tools": ["crm:read"],
    "crm_tools_write": ["crm:write"],
    "document_tools": ["documents:read"],
    "security_tools": ["audit:read"],
    "opendata_tools": ["opendata:read"],
    "simulation_tools": ["simulation:run"],
    "comms_tools": ["comms:create"],
    "geopolitics_tools": ["geopolitics:read"],
    "data_ops_tools": ["data_ops:read"],
    "data_ops_tools_run": ["data_ops:run_pipeline"],
    "legislative_tools": ["legislative:read"],
    "media_tools": ["media:read"],
    "risk_tools": ["risk:read"],
    "electoral_tools": ["electoral:read"],
    "campaign_tools": ["campaign:read"],
    "economy_tools": ["economic:read"],
    "system_tools": ["data_ops:read"],
    "territorial_tools": ["electoral:read"],
}

# Tool name prefix → permission list
TOOL_PREFIX_PERMISSIONS: dict[str, list[str]] = {
    "search_contacts": ["crm:read"],
    "get_contact": ["crm:read"],
    "get_organization": ["crm:read"],
    "get_stakeholder": ["crm:read"],
    "recommend_outreach": ["crm:read"],
    "prepare_meeting_pack": ["crm:read"],
    "get_due_crm_tasks": ["crm:read"],
    "get_field_plan": ["crm:read"],
    "generate_linkedin": ["comms:create"],
    "generate_twitter": ["comms:create"],
    "generate_newsletter": ["comms:create"],
    "generate_qna": ["comms:create"],
    "recommend_content": ["comms:read"],
    "get_editorial_calendar": ["comms:read"],
    "get_pending_approvals": ["comms:read"],
    "prepare_stakeholder_update": ["comms:create"],
    "fetch_acled": ["geopolitics:read"],
    "get_country_risk": ["geopolitics:read"],
    "get_geo_events": ["geopolitics:read"],
    "get_spanish_presence": ["geopolitics:read"],
    "generate_geo_briefing": ["geopolitics:read"],
    "run_pipeline": ["data_ops:run_pipeline"],
    "run_enrichment": ["data_ops:run_pipeline"],
    "get_audit": ["audit:read"],
    "run_deployment_check": ["security:admin"],
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_module(module_id: str) -> dict | None:
    """Retorna el registro de un módulo por su ID."""
    return MODULES.get(module_id)


def required_permission(module_id: str, action: str = "read") -> str | None:
    """Retorna el permiso requerido para un módulo y acción."""
    mod = MODULES.get(module_id)
    if not mod:
        return None
    if action == "read":
        return mod.get("read_permission")
    if action in ("write", "create"):
        return mod.get("write_permission")
    return f"{module_id}:{action}"


def get_tool_permissions(tool_name: str) -> list[str]:
    """Retorna los permisos necesarios para ejecutar una tool Brain."""
    # Búsqueda exacta
    if tool_name in TOOL_PREFIX_PERMISSIONS:
        return TOOL_PREFIX_PERMISSIONS[tool_name]
    # Búsqueda por prefijo
    for prefix, perms in TOOL_PREFIX_PERMISSIONS.items():
        if tool_name.startswith(prefix):
            return perms
    # Búsqueda por sufijo de módulo
    for module_prefix, perms in TOOL_PERMISSIONS.items():
        if module_prefix.replace("_tools", "") in tool_name:
            return perms
    # Por defecto requiere read
    return ["data_ops:read"]


def list_active_modules() -> list[dict]:
    """Lista todos los módulos activos."""
    return [m for m in MODULES.values() if m.get("active")]


def get_modules_by_group(group: str) -> list[dict]:
    """Lista módulos por grupo."""
    return [m for m in MODULES.values() if m.get("module_group") == group]
