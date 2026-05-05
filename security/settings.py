"""
Security Settings — Bloque 13.

Lee variables de entorno de seguridad con valores por defecto seguros.
En DEV_MODE, muchas restricciones se relajan para permitir desarrollo
sin infraestructura completa.
"""
from __future__ import annotations

import os
import logging

logger = logging.getLogger(__name__)


class SecuritySettings:
    """
    Configuración de seguridad leída desde variables de entorno.

    En ELECTSIM_DEV_MODE=true (por defecto en local):
    - No se exige autenticación JWT
    - Se usa un usuario y tenant dummy
    - Se permiten todas las operaciones
    - Los checks de seguridad se omiten (warning, no error)

    En producción (ELECTSIM_DEV_MODE=false):
    - JWT obligatorio
    - RLS activo
    - Audit logging en DB
    - Export controls activos
    """

    def __init__(self) -> None:
        self._reload()

    def _reload(self) -> None:
        """Recarga desde env (útil en tests)."""
        raw_dev = os.getenv("ELECTSIM_DEV_MODE", "true").lower()
        self.dev_mode: bool = raw_dev in ("true", "1", "yes", "on")

        raw_auth = os.getenv("ELECTSIM_AUTH_REQUIRED", "").lower()
        if raw_auth in ("true", "1", "yes"):
            self.auth_required: bool = True
        elif raw_auth in ("false", "0", "no"):
            self.auth_required = False
        else:
            # Por defecto: auth requerida solo si no estamos en dev mode
            self.auth_required = not self.dev_mode

        self.jwt_secret: str | None = os.getenv("ELECTSIM_API_JWT_SECRET")
        self.jwt_algorithm: str = os.getenv("ELECTSIM_JWT_ALGORITHM", "HS256")
        self.session_ttl_minutes: int = int(
            os.getenv("ELECTSIM_SESSION_TTL_MINUTES", "480")
        )

        self.default_tenant_id: str = os.getenv(
            "ELECTSIM_DEFAULT_CLIENTE_ID", "default"
        )
        self.default_tenant_name: str = os.getenv(
            "ELECTSIM_DEFAULT_TENANT_NAME", "ElectSim Dev"
        )

        self.feature_multicliente: bool = os.getenv(
            "ELECTSIM_FEATURE_MULTICLIENTE", "false"
        ).lower() in ("true", "1", "yes")

        self.feature_rbac: bool = os.getenv(
            "ELECTSIM_FEATURE_RBAC", "false"
        ).lower() in ("true", "1", "yes")

        self.feature_audit: bool = os.getenv(
            "ELECTSIM_FEATURE_AUDIT", str(not self.dev_mode)
        ).lower() in ("true", "1", "yes")

        self.feature_export_controls: bool = os.getenv(
            "ELECTSIM_FEATURE_EXPORT_CONTROLS", "false"
        ).lower() in ("true", "1", "yes")

        self.feature_pii_detection: bool = os.getenv(
            "ELECTSIM_FEATURE_PII_DETECTION", "false"
        ).lower() in ("true", "1", "yes")

        self.feature_ai_guardrails: bool = os.getenv(
            "ELECTSIM_FEATURE_AI_GUARDRAILS", "false"
        ).lower() in ("true", "1", "yes")

        self.pii_action: str = os.getenv(
            "ELECTSIM_PII_ACTION", "warn"
        )  # warn, redact, block

        self.export_require_approval_threshold: int = int(
            os.getenv("ELECTSIM_EXPORT_APPROVAL_THRESHOLD", "10000")
        )  # registros

        self.max_export_records: int = int(
            os.getenv("ELECTSIM_MAX_EXPORT_RECORDS", "100000")
        )

        self.allowed_export_formats: list[str] = os.getenv(
            "ELECTSIM_ALLOWED_EXPORT_FORMATS", "csv,json,markdown"
        ).split(",")

        self.admin_email: str | None = os.getenv("ELECTSIM_ADMIN_EMAIL")

        if self.dev_mode:
            logger.debug("SecuritySettings: DEV_MODE=true — restricciones relajadas")
        else:
            if not self.jwt_secret:
                logger.warning(
                    "SecuritySettings: PRODUCCIÓN sin ELECTSIM_API_JWT_SECRET — auth desactivada"
                )

    @property
    def is_prod(self) -> bool:
        return not self.dev_mode

    @property
    def jwt_configured(self) -> bool:
        return bool(self.jwt_secret)

    def get_dev_user(self) -> dict:
        """Usuario por defecto en DEV_MODE."""
        return {
            "id": "dev-user-001",
            "email": "dev@electsim.local",
            "nombre": "Dev User",
            "tenant_id": self.default_tenant_id,
            "is_superadmin": True,
            "roles": ["super_admin"],
            "activo": True,
        }

    def get_default_tenant(self) -> dict:
        """Tenant por defecto."""
        return {
            "id": self.default_tenant_id,
            "nombre": self.default_tenant_name,
            "slug": self.default_tenant_id,
            "plan": "enterprise" if self.dev_mode else "starter",
            "activo": True,
        }

    def __repr__(self) -> str:
        return (
            f"SecuritySettings(dev_mode={self.dev_mode}, "
            f"auth_required={self.auth_required}, "
            f"multicliente={self.feature_multicliente})"
        )


# Singleton global
settings = SecuritySettings()
