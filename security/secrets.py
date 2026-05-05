"""
Secret management — Bloque 13.

Gestión y verificación de secretos de configuración.
NUNCA expone valores reales — solo su estado (present/missing/placeholder).
"""
from __future__ import annotations

import logging
import os
from typing import Any

from security.schemas import SecretStatus

logger = logging.getLogger(__name__)

# Definición de secretos requeridos/opcionales por categoría
SECRET_REGISTRY: list[dict[str, Any]] = [
    # Auth
    {
        "key": "ELECTSIM_API_JWT_SECRET",
        "descripcion": "Clave secreta para firmar tokens JWT",
        "required": True,
        "category": "auth",
        "hint": "Mínimo 32 caracteres aleatorios",
    },
    {
        "key": "ELECTSIM_ADMIN_EMAIL",
        "descripcion": "Email del administrador inicial",
        "required": False,
        "category": "auth",
        "hint": "Usado para setup inicial",
    },
    # Base de datos
    {
        "key": "DATABASE_URL",
        "descripcion": "URL de conexión a PostgreSQL",
        "required": True,
        "category": "database",
        "hint": "postgresql://user:pass@host:5432/dbname",
    },
    # LLM
    {
        "key": "ANTHROPIC_API_KEY",
        "descripcion": "API key de Anthropic (Claude)",
        "required": False,
        "category": "llm",
        "hint": "sk-ant-...",
    },
    {
        "key": "OPENAI_API_KEY",
        "descripcion": "API key de OpenAI (alternativa)",
        "required": False,
        "category": "llm",
        "hint": "sk-...",
    },
    {
        "key": "LITELLM_BASE_URL",
        "descripcion": "URL del proxy LiteLLM",
        "required": False,
        "category": "llm",
        "hint": "http://litellm-proxy:4000",
    },
    # Observabilidad
    {
        "key": "OTEL_EXPORTER_OTLP_ENDPOINT",
        "descripcion": "Endpoint del colector OTel",
        "required": False,
        "category": "observability",
        "hint": "http://otel-collector:4317",
    },
    # Fuentes de datos externas
    {
        "key": "BOE_API_KEY",
        "descripcion": "API key del BOE (si aplica)",
        "required": False,
        "category": "external",
        "hint": "Opcional — el BOE es público",
    },
    {
        "key": "GDELT_API_KEY",
        "descripcion": "API key de GDELT",
        "required": False,
        "category": "external",
        "hint": "Opcional — GDELT tiene endpoint público",
    },
    # Seguridad
    {
        "key": "ELECTSIM_DEV_MODE",
        "descripcion": "Modo de desarrollo (true/false)",
        "required": False,
        "category": "security",
        "hint": "Debe ser false en producción",
    },
    {
        "key": "ELECTSIM_FEATURE_MULTICLIENTE",
        "descripcion": "Activar modo multi-tenant",
        "required": False,
        "category": "security",
        "hint": "Requiere configuración adicional",
    },
]

# Valores placeholder que no son secretos reales
_PLACEHOLDER_PATTERNS = [
    "your_secret_here",
    "change_me",
    "placeholder",
    "xxx",
    "yyy",
    "todo",
    "fixme",
    "your-",
    "my-secret",
    "example",
    "test123",
    "password123",
]


def check_secret(key: str) -> dict[str, Any]:
    """
    Verifica el estado de un secreto.

    NUNCA devuelve el valor real — solo metadata.

    Returns:
        Dict con {key, status, has_value, descripcion, hint}.
    """
    value = os.getenv(key)
    registry_entry = next((s for s in SECRET_REGISTRY if s["key"] == key), {})

    if value is None or value.strip() == "":
        status = SecretStatus.MISSING
    elif _is_placeholder(value):
        status = SecretStatus.PLACEHOLDER
    elif key == "ELECTSIM_API_JWT_SECRET" and len(value) < 32:
        status = SecretStatus.INVALID
    else:
        status = SecretStatus.PRESENT

    return {
        "key": key,
        "status": status.value,
        "has_value": status == SecretStatus.PRESENT,
        "required": registry_entry.get("required", False),
        "category": registry_entry.get("category", "unknown"),
        "descripcion": registry_entry.get("descripcion", ""),
        "hint": registry_entry.get("hint", ""),
        "length": len(value) if value else 0,
    }


def check_all_secrets() -> list[dict[str, Any]]:
    """
    Verifica todos los secretos registrados.

    Returns lista ordenada: requeridos primero, luego opcionales.
    """
    results = []
    for secret_def in SECRET_REGISTRY:
        result = check_secret(secret_def["key"])
        results.append(result)

    # Ordenar: requeridos primero, luego por categoría
    results.sort(key=lambda x: (not x["required"], x["category"], x["key"]))
    return results


def get_secrets_summary() -> dict[str, Any]:
    """
    Resumen del estado de secretos.

    Returns dict con counts por estado.
    """
    results = check_all_secrets()

    total = len(results)
    required = [r for r in results if r["required"]]
    present = sum(1 for r in results if r["status"] == "present")
    missing_required = sum(1 for r in required if r["status"] != "present")
    placeholder = sum(1 for r in results if r["status"] == "placeholder")
    invalid = sum(1 for r in results if r["status"] == "invalid")

    health = "ok"
    if missing_required > 0 or invalid > 0:
        health = "critical"
    elif placeholder > 0:
        health = "warning"

    return {
        "total": total,
        "present": present,
        "missing": sum(1 for r in results if r["status"] == "missing"),
        "missing_required": missing_required,
        "placeholder": placeholder,
        "invalid": invalid,
        "health": health,
        "by_category": _group_by_category(results),
    }


def get_secret_value(key: str) -> str | None:
    """
    Obtiene el valor real de un secreto (solo para uso interno).

    ADVERTENCIA: Nunca loguear ni exponer el resultado.
    """
    value = os.getenv(key)
    if not value or _is_placeholder(value):
        return None
    return value


def register_secret(
    key: str,
    descripcion: str,
    required: bool = False,
    category: str = "custom",
    hint: str = "",
) -> None:
    """
    Registra un nuevo secreto en el registry.

    Útil para plugins o módulos externos.
    """
    # Evitar duplicados
    existing = next((s for s in SECRET_REGISTRY if s["key"] == key), None)
    if existing:
        return

    SECRET_REGISTRY.append({
        "key": key,
        "descripcion": descripcion,
        "required": required,
        "category": category,
        "hint": hint,
    })


def _is_placeholder(value: str) -> bool:
    """Detecta si un valor es un placeholder, no un secreto real."""
    v = value.lower().strip()
    return any(p in v for p in _PLACEHOLDER_PATTERNS)


def _group_by_category(results: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    """Agrupa resultados por categoría."""
    by_cat: dict[str, dict[str, int]] = {}
    for r in results:
        cat = r["category"]
        if cat not in by_cat:
            by_cat[cat] = {"total": 0, "present": 0, "missing": 0}
        by_cat[cat]["total"] += 1
        status = r["status"]
        if status == "present":
            by_cat[cat]["present"] += 1
        else:
            by_cat[cat]["missing"] += 1
    return by_cat
