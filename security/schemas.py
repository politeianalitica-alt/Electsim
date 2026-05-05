"""
Security Schemas — Bloque 13.

Modelos Pydantic para el sistema de seguridad, tenancy y RBAC.
Todos los campos son opcionales donde tiene sentido para soportar
carga parcial desde DB o API.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from enum import Enum

from pydantic import BaseModel, Field


# ── Enumeraciones ──────────────────────────────────────────────────────────────

class DataClassificationLevel(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CLIENT_CONFIDENTIAL = "client_confidential"
    SENSITIVE = "sensitive"
    RESTRICTED = "restricted"


class AuditEventType(str, Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PERMISSION_DENIED = "permission_denied"
    DATA_EXPORT = "data_export"
    PIPELINE_RUN = "pipeline_run"
    BRAIN_TOOL_CALL = "brain_tool_call"
    OSINT_ENRICHMENT = "osint_enrichment"
    CONFIG_CHANGE = "config_change"
    USER_CREATED = "user_created"
    USER_DEACTIVATED = "user_deactivated"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REVOKED = "role_revoked"
    TENANT_CREATED = "tenant_created"
    SECRET_ACCESSED = "secret_accessed"
    DATA_CLASSIFIED = "data_classified"
    EXPORT_JOB_CREATED = "export_job_created"
    EXPORT_JOB_APPROVED = "export_job_approved"
    API_TOKEN_CREATED = "api_token_created"
    API_TOKEN_REVOKED = "api_token_revoked"


class SystemRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    PLATFORM_ADMIN = "platform_admin"
    ANALYST = "analyst"
    SENIOR_ANALYST = "senior_analyst"
    CLIENT_VIEWER = "client_viewer"
    CAMPAIGN_MANAGER = "campaign_manager"
    DATA_OPERATOR = "data_operator"
    SECURITY_ADMIN = "security_admin"
    READ_ONLY = "read_only"


class ExportJobStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SecretStatus(str, Enum):
    PRESENT = "present"
    MISSING = "missing"
    PLACEHOLDER = "placeholder"
    INVALID = "invalid"


# ── Modelos principales ────────────────────────────────────────────────────────

class Permission(BaseModel):
    """Permiso atómico del sistema."""
    id: str
    resource: str  # ej: "electoral_data", "brain_tools", "export"
    action: str    # ej: "read", "write", "execute", "admin"
    description: str = ""
    conditions: dict[str, Any] = Field(default_factory=dict)


class Role(BaseModel):
    """Rol de sistema o de tenant."""
    id: str
    nombre: str
    system_role: SystemRole | None = None
    tenant_id: str | None = None
    permissions: list[str] = Field(default_factory=list)  # lista de permission IDs
    description: str = ""
    is_system: bool = True
    created_at: datetime | None = None


class Tenant(BaseModel):
    """Cliente/organización en la plataforma."""
    id: str
    nombre: str
    slug: str
    plan: str = "starter"  # starter, professional, enterprise
    activo: bool = True
    max_users: int = 10
    max_workspaces: int = 3
    features: list[str] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class User(BaseModel):
    """Usuario de la plataforma."""
    id: str
    email: str
    nombre: str = ""
    tenant_id: str | None = None
    activo: bool = True
    is_superadmin: bool = False
    roles: list[str] = Field(default_factory=list)  # role IDs
    permissions_override: list[str] = Field(default_factory=list)
    last_login: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Workspace(BaseModel):
    """Espacio de trabajo (proyecto) dentro de un tenant."""
    id: str
    nombre: str
    tenant_id: str
    owner_id: str | None = None
    description: str = ""
    data_classification: DataClassificationLevel = DataClassificationLevel.INTERNAL
    activo: bool = True
    members: list[str] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class AuditEvent(BaseModel):
    """Evento de auditoría inmutable."""
    id: str
    event_type: AuditEventType | str
    user_id: str | None = None
    tenant_id: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    action: str = ""
    result: str = "ok"  # ok, denied, error
    ip_address: str | None = None
    user_agent: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    risk_score: int = 0  # 0-100
    created_at: datetime | None = None


class DataClassification(BaseModel):
    """Clasificación de datos de un recurso."""
    id: str
    resource_type: str
    resource_id: str
    level: DataClassificationLevel
    classified_by: str | None = None
    rationale: str = ""
    pii_detected: bool = False
    pii_types: list[str] = Field(default_factory=list)
    retention_days: int | None = None
    created_at: datetime | None = None


class SecretReference(BaseModel):
    """Referencia a un secreto (nunca el valor real)."""
    key: str
    descripcion: str = ""
    required: bool = True
    status: SecretStatus = SecretStatus.MISSING
    last_checked: datetime | None = None
    hint: str = ""  # Pista sin revelar el valor


class ExportJob(BaseModel):
    """Solicitud de exportación de datos (puede requerir aprobación)."""
    id: str
    module_id: str
    export_type: str
    filename: str
    user_id: str | None = None
    tenant_id: str | None = None
    status: ExportJobStatus = ExportJobStatus.PENDING
    requires_approval: bool = False
    approved_by: str | None = None
    record_count: int | None = None
    data_classification: DataClassificationLevel = DataClassificationLevel.INTERNAL
    created_at: datetime | None = None
    completed_at: datetime | None = None


class SecurityCheckResult(BaseModel):
    """Resultado de una comprobación de seguridad del despliegue."""
    check_id: str
    name: str
    category: str  # auth, secrets, network, data, compliance
    passed: bool
    severity: str = "medium"  # info, low, medium, high, critical
    message: str = ""
    recommendation: str = ""
    details: dict[str, Any] = Field(default_factory=dict)
