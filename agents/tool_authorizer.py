"""
agents/tool_authorizer.py — Autorización de Brain tools.

Garantiza que el agente Brain no puede ejecutar tools sin permiso.
En modo dev permite con warning. En modo prod bloquea.

Uso:
    from agents.tool_authorizer import authorize_tool_call, filter_tools_for_user

    # Antes de ejecutar una tool:
    authorize_tool_call(user, "search_contacts", args)  # lanza ToolNotAuthorizedError

    # Filtrar tools disponibles:
    allowed = filter_tools_for_user(user, all_tools)
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class ToolNotAuthorizedError(PermissionError):
    """Lanzado cuando un usuario no tiene permiso para una tool."""
    def __init__(self, tool_name: str, required_permission: str, user_id: str = "unknown"):
        self.tool_name = tool_name
        self.required_permission = required_permission
        self.user_id = user_id
        super().__init__(
            f"Usuario '{user_id}' no tiene permiso '{required_permission}' para tool '{tool_name}'"
        )


def _get_dev_mode() -> bool:
    """Retorna True si estamos en modo desarrollo."""
    try:
        from security.settings import settings
        return settings.dev_mode
    except Exception:
        return True


def _has_permission(user: dict[str, Any], permission: str) -> bool:
    """Verifica si el usuario tiene un permiso específico."""
    if not user:
        return _get_dev_mode()
    try:
        from security.rbac import has_permission
        return has_permission(user, permission)
    except Exception:
        return _get_dev_mode()


def get_required_permissions(tool_name: str) -> list[str]:
    """Retorna permisos requeridos para una tool Brain."""
    try:
        from core.module_registry import get_tool_permissions
        return get_tool_permissions(tool_name)
    except Exception:
        return ["data_ops:read"]


def authorize_tool_call(
    user: dict[str, Any] | None,
    tool_name: str,
    args: dict[str, Any] | None = None,
) -> None:
    """
    Verifica que el usuario puede ejecutar la tool.

    En modo dev: permite con warning si no hay user.
    En modo prod: lanza ToolNotAuthorizedError si no tiene permiso.

    Args:
        user: dict del usuario con roles/permissions
        tool_name: nombre de la tool
        args: argumentos (para audit)

    Raises:
        ToolNotAuthorizedError si no tiene permiso en modo prod.
    """
    dev_mode = _get_dev_mode()

    # En dev con user None: permitir con warning
    if user is None:
        if dev_mode:
            logger.warning(
                "tool_authorizer: DEV_MODE — tool '%s' ejecutada sin usuario", tool_name
            )
            return
        raise ToolNotAuthorizedError(tool_name, "authenticated_user", "anonymous")

    required_perms = get_required_permissions(tool_name)
    user_id = user.get("id") or user.get("user_id") or "unknown"

    missing = []
    for perm in required_perms:
        if not _has_permission(user, perm):
            missing.append(perm)

    if not missing:
        return  # autorizado

    if dev_mode:
        logger.warning(
            "tool_authorizer: DEV_MODE — tool '%s' ejecutada sin permiso '%s' (usuario: %s)",
            tool_name, missing[0], user_id,
        )
        return

    # Modo prod: bloquear
    raise ToolNotAuthorizedError(tool_name, missing[0], user_id)


def filter_tools_for_user(
    user: dict[str, Any] | None,
    tools: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Filtra la lista de tools a las que el usuario tiene permiso.

    Args:
        user: dict del usuario
        tools: lista de tool definitions (dicts con 'name')

    Returns:
        Lista de tools permitidas.
    """
    if _get_dev_mode():
        return tools  # en dev todas las tools disponibles

    if not user:
        return []

    allowed = []
    for tool in tools:
        tool_name = tool.get("name", "")
        required = get_required_permissions(tool_name)
        if all(_has_permission(user, p) for p in required):
            allowed.append(tool)

    return allowed


def redact_tool_result_for_user(
    user: dict[str, Any] | None,
    tool_name: str,
    result: dict[str, Any],
) -> dict[str, Any]:
    """
    Redacta campos sensibles del resultado de una tool para el usuario.

    Por ahora redacta:
    - Campos marcados como 'restricted' o 'client_confidential'
    - PII si el usuario no tiene permiso risk:read_sensitive

    Returns:
        Resultado redactado (nunca modifica el original).
    """
    if _get_dev_mode():
        return result

    if user is None:
        return {"error": "No autorizado"}

    # Verificar si puede ver datos sensibles
    can_read_sensitive = _has_permission(user, "risk:read_sensitive")

    redacted = {}
    sensitive_keys = {"email", "phone", "dni", "nif", "passport", "address", "bank_account"}

    for k, v in result.items():
        if not can_read_sensitive and k in sensitive_keys:
            redacted[k] = "[REDACTED]"
        else:
            redacted[k] = v

    return redacted


def audit_tool_call(
    user: dict[str, Any] | None,
    tool_name: str,
    args: dict[str, Any] | None = None,
    result_summary: dict[str, Any] | None = None,
) -> None:
    """
    Registra en auditoría la ejecución de una tool Brain.
    Nunca lanza excepción.
    """
    try:
        from security.audit import log_event
        user_id = (user or {}).get("id") or (user or {}).get("user_id") or "anonymous"
        tenant_id = (user or {}).get("tenant_id", "default")
        log_event(
            event_type="brain_tool_call",
            user_id=user_id,
            tenant_id=tenant_id,
            resource_type="brain_tool",
            resource_id=tool_name,
            action="execute",
            result=result_summary or {},
            metadata={"args_keys": list((args or {}).keys())},
        )
    except Exception as exc:
        logger.debug("audit_tool_call failed: %s", exc)


def authorized_tool_call(
    tool_name: str,
    args: dict[str, Any],
    user: dict[str, Any] | None = None,
    *,
    audit: bool = True,
) -> dict[str, Any]:
    """
    Wrapper completo: autoriza + ejecuta + audita una Brain tool.

    Args:
        tool_name: nombre de la tool
        args: argumentos para la tool
        user: usuario actual
        audit: si registrar en auditoría

    Returns:
        Resultado de la tool o dict de error.
    """
    try:
        authorize_tool_call(user, tool_name, args)
    except ToolNotAuthorizedError as exc:
        if audit:
            audit_tool_call(user, tool_name, args, {"result": "denied", "reason": str(exc)})
        return {"error": str(exc), "code": "TOOL_NOT_AUTHORIZED"}

    # Buscar la tool en los registros
    try:
        result = _execute_tool(tool_name, args)
    except Exception as exc:
        logger.warning("authorized_tool_call '%s' error: %s", tool_name, exc)
        result = {"error": str(exc), "code": "TOOL_EXECUTION_ERROR"}

    if audit:
        result_summary = {"result": "ok" if "error" not in result else "error"}
        audit_tool_call(user, tool_name, args, result_summary)

    return result


def _execute_tool(tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Busca y ejecuta una tool por nombre."""
    # Importar todos los registros de tools
    all_tools: list[dict] = []
    tool_modules = [
        "agents.tools.crm_tools",
        "agents.tools.comms_tools",
        "agents.tools.document_tools",
        "agents.tools.security_tools",
        "agents.tools.opendata_tools",
        "agents.tools.simulation_tools",
        "agents.tools.geopolitics_tools",
        "agents.tools.data_ops_tools",
        "agents.tools.legislative_tools",
        "agents.tools.media_tools",
        "agents.tools.risk_tools",
        "agents.tools.electoral_tools",
        "agents.tools.campaign_tools",
        "agents.tools.economy_tools",
    ]
    for mod_path in tool_modules:
        try:
            import importlib
            mod = importlib.import_module(mod_path)
            for attr in dir(mod):
                if attr.endswith("_TOOLS") or attr == "TOOLS":
                    tools_list = getattr(mod, attr, [])
                    if isinstance(tools_list, list):
                        all_tools.extend(tools_list)
        except Exception:
            pass

    # Buscar tool por nombre
    for tool in all_tools:
        if tool.get("name") == tool_name:
            fn = tool.get("function")
            if callable(fn):
                return fn(**args)

    return {"error": f"Tool '{tool_name}' no encontrada", "code": "TOOL_NOT_FOUND"}
