"""
Deployment checks — Bloque 13.

Verificaciones de seguridad del despliegue.
Detecta configuraciones inseguras antes de ir a producción.
Nunca lanza excepciones — degrada a warning.
"""
from __future__ import annotations

import logging
import os
import sys
from typing import Any

from security.settings import settings
from security.schemas import SecurityCheckResult

logger = logging.getLogger(__name__)


def run_all_checks() -> list[dict[str, Any]]:
    """
    Ejecuta todas las verificaciones de seguridad del despliegue.

    Returns lista de SecurityCheckResult como dicts, ordenados por severidad.
    """
    checks = [
        _check_dev_mode(),
        _check_jwt_secret(),
        _check_database_url(),
        _check_debug_flags(),
        _check_allowed_hosts(),
        _check_https_enforcement(),
        _check_secret_placeholders(),
        _check_rls_enabled(),
        _check_audit_logging(),
        _check_python_version(),
        _check_dependency_security(),
        _check_default_passwords(),
        _check_cors_config(),
        _check_log_level(),
    ]

    # Ordenar por severidad: critical > high > medium > low > info
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    checks.sort(key=lambda c: (severity_order.get(c["severity"], 5), c["check_id"]))
    return checks


def get_security_score(checks: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """
    Calcula la puntuación de seguridad del despliegue.

    Returns dict con score (0-100) y resumen.
    """
    if checks is None:
        checks = run_all_checks()

    total = len(checks)
    if total == 0:
        return {"score": 100, "passed": 0, "failed": 0, "health": "unknown"}

    passed = sum(1 for c in checks if c["passed"])
    failed = total - passed

    # Peso por severidad
    penalties = 0
    for c in checks:
        if not c["passed"]:
            sev = c.get("severity", "medium")
            if sev == "critical":
                penalties += 30
            elif sev == "high":
                penalties += 15
            elif sev == "medium":
                penalties += 8
            elif sev == "low":
                penalties += 3
            else:
                penalties += 1

    score = max(0, 100 - penalties)

    health = "excellent" if score >= 90 else \
             "good" if score >= 75 else \
             "fair" if score >= 50 else \
             "poor" if score >= 25 else "critical"

    return {
        "score": score,
        "passed": passed,
        "failed": failed,
        "total": total,
        "health": health,
        "critical_failures": sum(1 for c in checks if not c["passed"] and c.get("severity") == "critical"),
    }


# ── Checks individuales ────────────────────────────────────────────────────────

def _check_dev_mode() -> dict[str, Any]:
    """Verifica que DEV_MODE esté desactivado en producción."""
    is_dev = settings.dev_mode
    # Si hay indicadores de que es producción
    is_prod_env = os.getenv("ENVIRONMENT", "").lower() in ("prod", "production", "staging")

    passed = not (is_dev and is_prod_env)
    return _result(
        check_id="dev_mode",
        name="Modo DEV desactivado",
        category="auth",
        passed=passed,
        severity="critical",
        message="ELECTSIM_DEV_MODE=true en entorno de producción" if not passed else "DEV_MODE correcto",
        recommendation="Establecer ELECTSIM_DEV_MODE=false en producción" if not passed else "",
    )


def _check_jwt_secret() -> dict[str, Any]:
    """Verifica que JWT secret esté configurado y sea suficientemente largo."""
    secret = os.getenv("ELECTSIM_API_JWT_SECRET", "")
    if settings.dev_mode:
        return _result(
            check_id="jwt_secret",
            name="JWT Secret configurado",
            category="auth",
            passed=True,
            severity="info",
            message="DEV_MODE: JWT no requerido",
        )

    if not secret:
        passed = False
        message = "ELECTSIM_API_JWT_SECRET no configurado"
    elif len(secret) < 32:
        passed = False
        message = "JWT secret demasiado corto (mínimo 32 caracteres)"
    else:
        passed = True
        message = f"JWT secret configurado ({len(secret)} chars)"

    return _result(
        check_id="jwt_secret",
        name="JWT Secret configurado",
        category="auth",
        passed=passed,
        severity="critical",
        message=message,
        recommendation="Generar con: python -c \"import secrets; print(secrets.token_urlsafe(48))\"" if not passed else "",
    )


def _check_database_url() -> dict[str, Any]:
    """Verifica que DATABASE_URL esté configurado y no use credenciales por defecto."""
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return _result(
            check_id="database_url",
            name="DATABASE_URL configurado",
            category="database",
            passed=False,
            severity="critical",
            message="DATABASE_URL no configurado",
            recommendation="Configurar DATABASE_URL con conexión PostgreSQL",
        )

    # Detectar credenciales por defecto
    insecure_patterns = ["password=password", ":password@", ":postgres@", "password=postgres"]
    has_insecure = any(p in db_url.lower() for p in insecure_patterns)

    return _result(
        check_id="database_url",
        name="DATABASE_URL configurado",
        category="database",
        passed=not has_insecure,
        severity="high" if has_insecure else "info",
        message="Credenciales DB por defecto detectadas" if has_insecure else "DATABASE_URL configurado",
        recommendation="Cambiar credenciales de DB por defecto" if has_insecure else "",
    )


def _check_debug_flags() -> dict[str, Any]:
    """Verifica que no haya flags de debug activos en producción."""
    debug_flags = {
        "DEBUG": os.getenv("DEBUG", "").lower() in ("true", "1"),
        "FLASK_DEBUG": os.getenv("FLASK_DEBUG", "").lower() in ("true", "1"),
        "STREAMLIT_SERVER_HEADLESS": os.getenv("STREAMLIT_SERVER_HEADLESS", "true").lower() == "false",
    }
    active_flags = [k for k, v in debug_flags.items() if v]
    passed = len(active_flags) == 0 or settings.dev_mode

    return _result(
        check_id="debug_flags",
        name="Debug desactivado",
        category="network",
        passed=passed,
        severity="medium",
        message=f"Flags de debug activos: {active_flags}" if not passed else "Sin flags de debug",
        recommendation="Desactivar flags de debug en producción" if not passed else "",
    )


def _check_allowed_hosts() -> dict[str, Any]:
    """Verifica configuración de hosts permitidos."""
    allowed = os.getenv("ALLOWED_HOSTS", os.getenv("ELECTSIM_ALLOWED_HOSTS", ""))
    if settings.dev_mode:
        return _result(
            check_id="allowed_hosts",
            name="Allowed hosts configurados",
            category="network",
            passed=True,
            severity="info",
            message="DEV_MODE: hosts no restringidos",
        )

    passed = bool(allowed) and allowed != "*"
    return _result(
        check_id="allowed_hosts",
        name="Allowed hosts configurados",
        category="network",
        passed=passed,
        severity="medium",
        message="ALLOWED_HOSTS no configurado o demasiado permisivo" if not passed else f"Hosts: {allowed[:50]}",
        recommendation="Configurar ELECTSIM_ALLOWED_HOSTS con dominios específicos" if not passed else "",
    )


def _check_https_enforcement() -> dict[str, Any]:
    """Verifica si HTTPS está forzado."""
    force_https = os.getenv("FORCE_HTTPS", os.getenv("ELECTSIM_FORCE_HTTPS", "")).lower()
    if settings.dev_mode:
        return _result(
            check_id="https",
            name="HTTPS forzado",
            category="network",
            passed=True,
            severity="info",
            message="DEV_MODE: HTTPS no requerido",
        )

    passed = force_https in ("true", "1", "yes")
    return _result(
        check_id="https",
        name="HTTPS forzado",
        category="network",
        passed=passed,
        severity="high",
        message="HTTPS no forzado" if not passed else "HTTPS habilitado",
        recommendation="Configurar ELECTSIM_FORCE_HTTPS=true en producción" if not passed else "",
    )


def _check_secret_placeholders() -> dict[str, Any]:
    """Verifica que no haya placeholders en secretos requeridos."""
    from security.secrets import check_all_secrets
    secrets = check_all_secrets()
    placeholder_required = [
        s for s in secrets
        if s.get("required") and s.get("status") in ("placeholder", "missing")
    ]
    passed = len(placeholder_required) == 0

    return _result(
        check_id="secret_placeholders",
        name="Secretos sin placeholders",
        category="secrets",
        passed=passed,
        severity="critical" if not passed else "info",
        message=f"{len(placeholder_required)} secretos requeridos sin configurar" if not passed else "Secretos configurados",
        recommendation="Configurar secretos requeridos antes de ir a producción" if not passed else "",
        details={"missing_secrets": [s["key"] for s in placeholder_required]},
    )


def _check_rls_enabled() -> dict[str, Any]:
    """Verifica que RLS esté habilitado en tablas sensibles."""
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return _result(
                check_id="rls_enabled",
                name="RLS habilitado",
                category="data",
                passed=True,
                severity="info",
                message="Sin conexión DB — no se puede verificar RLS",
            )

        cursor = conn.cursor()
        cursor.execute(
            "SELECT tablename, rowsecurity FROM pg_tables "
            "WHERE schemaname = 'public' AND tablename IN "
            "('saved_views', 'audit_events', 'users') "
            "AND rowsecurity = false"
        )
        tables_without_rls = [row[0] for row in cursor.fetchall()]
        passed = len(tables_without_rls) == 0

        return _result(
            check_id="rls_enabled",
            name="RLS habilitado en tablas sensibles",
            category="data",
            passed=passed,
            severity="high",
            message=f"Tablas sin RLS: {tables_without_rls}" if not passed else "RLS activo",
            recommendation="Habilitar RLS en todas las tablas con datos sensibles" if not passed else "",
        )
    except Exception as exc:
        return _result(
            check_id="rls_enabled",
            name="RLS habilitado",
            category="data",
            passed=True,
            severity="info",
            message=f"No se pudo verificar RLS: {exc}",
        )


def _check_audit_logging() -> dict[str, Any]:
    """Verifica que el audit logging esté habilitado en producción."""
    if settings.dev_mode:
        return _result(
            check_id="audit_logging",
            name="Audit logging activo",
            category="compliance",
            passed=True,
            severity="info",
            message="DEV_MODE: audit opcional",
        )

    passed = settings.feature_audit
    return _result(
        check_id="audit_logging",
        name="Audit logging activo",
        category="compliance",
        passed=passed,
        severity="high",
        message="Audit logging desactivado en producción" if not passed else "Audit logging activo",
        recommendation="Activar ELECTSIM_FEATURE_AUDIT=true en producción" if not passed else "",
    )


def _check_python_version() -> dict[str, Any]:
    """Verifica que la versión de Python sea soportada."""
    version = sys.version_info
    passed = version >= (3, 11)
    return _result(
        check_id="python_version",
        name="Python 3.11+",
        category="compliance",
        passed=passed,
        severity="medium",
        message=f"Python {version.major}.{version.minor}.{version.micro}",
        recommendation="Actualizar a Python 3.11+" if not passed else "",
    )


def _check_dependency_security() -> dict[str, Any]:
    """Verifica dependencias críticas de seguridad."""
    missing_security_deps = []
    optional_deps = [
        ("passlib", "Hashing seguro de contraseñas"),
        ("jwt", "Tokens JWT"),
    ]

    for module_name, description in optional_deps:
        try:
            __import__(module_name)
        except ImportError:
            missing_security_deps.append(f"{module_name} ({description})")

    passed = len(missing_security_deps) == 0 or settings.dev_mode
    return _result(
        check_id="security_deps",
        name="Dependencias de seguridad",
        category="compliance",
        passed=passed,
        severity="medium" if not settings.dev_mode else "low",
        message=f"Dependencias opcionales no instaladas: {missing_security_deps}" if missing_security_deps else "Dependencias presentes",
        recommendation="pip install passlib[bcrypt] PyJWT" if missing_security_deps and not settings.dev_mode else "",
    )


def _check_default_passwords() -> dict[str, Any]:
    """Verifica que no haya contraseñas por defecto en variables de entorno."""
    default_passwords = ["password", "admin", "secret", "1234", "changeme", "pass"]
    found_defaults = []
    for key, value in os.environ.items():
        if "password" in key.lower() or "secret" in key.lower() or "key" in key.lower():
            if value.lower() in default_passwords:
                found_defaults.append(key)

    passed = len(found_defaults) == 0
    return _result(
        check_id="default_passwords",
        name="Sin contraseñas por defecto",
        category="auth",
        passed=passed,
        severity="critical",
        message=f"Variables con contraseñas por defecto: {found_defaults}" if not passed else "Sin contraseñas por defecto",
        recommendation="Cambiar todas las contraseñas por defecto" if not passed else "",
    )


def _check_cors_config() -> dict[str, Any]:
    """Verifica configuración CORS."""
    cors_origins = os.getenv("CORS_ORIGINS", os.getenv("ALLOWED_ORIGINS", "*"))
    if settings.dev_mode:
        return _result(
            check_id="cors",
            name="CORS configurado",
            category="network",
            passed=True,
            severity="info",
            message="DEV_MODE: CORS permisivo aceptable",
        )

    passed = cors_origins != "*"
    return _result(
        check_id="cors",
        name="CORS configurado",
        category="network",
        passed=passed,
        severity="medium",
        message="CORS permite cualquier origen (*)" if not passed else f"CORS: {cors_origins[:50]}",
        recommendation="Configurar CORS_ORIGINS con dominios específicos" if not passed else "",
    )


def _check_log_level() -> dict[str, Any]:
    """Verifica que el nivel de log no sea DEBUG en producción."""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    if settings.dev_mode:
        return _result(
            check_id="log_level",
            name="Log level apropiado",
            category="compliance",
            passed=True,
            severity="info",
            message=f"DEV_MODE: LOG_LEVEL={log_level}",
        )

    passed = log_level not in ("DEBUG", "TRACE")
    return _result(
        check_id="log_level",
        name="Log level apropiado",
        category="compliance",
        passed=passed,
        severity="low",
        message=f"LOG_LEVEL={log_level} expone información sensible" if not passed else f"LOG_LEVEL={log_level}",
        recommendation="Usar LOG_LEVEL=INFO o WARNING en producción" if not passed else "",
    )


def _result(
    check_id: str,
    name: str,
    category: str,
    passed: bool,
    severity: str = "medium",
    message: str = "",
    recommendation: str = "",
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Helper para crear un resultado de check."""
    return {
        "check_id": check_id,
        "name": name,
        "category": category,
        "passed": passed,
        "severity": severity,
        "message": message,
        "recommendation": recommendation,
        "details": details or {},
    }
