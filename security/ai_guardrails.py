"""
AI Guardrails — Bloque 13.

Guardrails para el uso del Brain (agente LLM).
Controla qué herramientas puede usar cada rol,
detecta prompts potencialmente dañinos y audita llamadas.
"""
from __future__ import annotations

import logging
import re
from typing import Any

from security.settings import settings

logger = logging.getLogger(__name__)

# ── Configuración de herramientas por rol ──────────────────────────────────────

# Herramientas bloqueadas por rol
ROLE_TOOL_RESTRICTIONS: dict[str, list[str]] = {
    "client_viewer": [
        "run_pipeline",
        "trigger_etl",
        "delete_scenario",
        "seed_roles",
        "create_admin",
        "osint_enrichment",
        "geopolitica_enrichment",
    ],
    "read_only": [
        "run_pipeline",
        "trigger_etl",
        "delete_scenario",
        "seed_roles",
        "create_admin",
        "osint_enrichment",
        "geopolitica_enrichment",
        "export_full",
        "create_document",
        "run_simulation",
    ],
    "analyst": [
        "seed_roles",
        "create_admin",
        "delete_scenario",
    ],
}

# Herramientas que siempre requieren auditoría
ALWAYS_AUDIT_TOOLS = {
    "osint_enrichment",
    "geopolitica_enrichment",
    "risk_actores",
    "export_full",
    "run_pipeline",
    "trigger_etl",
    "boe_search",
    "get_security_status",
    "get_audit_summary",
    "get_secret_configuration_status",
}

# Patrones de prompts potencialmente problemáticos
_PROMPT_RISK_PATTERNS: list[tuple[str, str, int]] = [
    # (pattern, category, risk_score)
    (r"ignora\s+(tus\s+)?instrucciones", "jailbreak", 80),
    (r"forget\s+your\s+instructions", "jailbreak", 80),
    (r"actúa\s+como\s+si\s+no\s+tuvieras\s+restricciones", "jailbreak", 75),
    (r"eres\s+libre\s+de\s+decir\s+cualquier\s+cosa", "jailbreak", 70),
    (r"modo\s+dev(eloper)?\s+sin\s+restricciones", "jailbreak", 70),
    (r"dump\s+all\s+(data|secrets?|passwords?|env)", "data_exfil", 85),
    (r"show\s+me\s+all\s+env(ironment)?\s+variables?", "data_exfil", 75),
    (r"print\s+os\.environ", "data_exfil", 90),
    (r"database\s+credentials?", "data_exfil", 60),
    (r"api[\s_]?keys?", "data_exfil", 40),
    (r"rm\s+-rf", "system_abuse", 95),
    (r"drop\s+table", "sql_injection", 70),
    (r"delete\s+from\s+\w+\s+where", "sql_injection", 65),
    (r"exec\s*\(|eval\s*\(|subprocess", "code_execution", 75),
    (r"import\s+subprocess", "code_execution", 70),
    (r"__import__", "code_execution", 80),
]


def check_tool_access(
    user: dict[str, Any],
    tool_name: str,
) -> dict[str, Any]:
    """
    Verifica si el usuario puede acceder a una herramienta del Brain.

    Args:
        user: Dict de usuario.
        tool_name: Nombre de la herramienta.

    Returns:
        Dict con {allowed, reason, requires_audit}.
    """
    if settings.dev_mode:
        return {
            "allowed": True,
            "reason": "DEV_MODE",
            "requires_audit": tool_name in ALWAYS_AUDIT_TOOLS,
        }

    if not settings.feature_ai_guardrails:
        return {
            "allowed": True,
            "reason": "Guardrails desactivados",
            "requires_audit": tool_name in ALWAYS_AUDIT_TOOLS,
        }

    # Super admin puede todo
    if user.get("is_superadmin", False):
        return {
            "allowed": True,
            "reason": "super_admin",
            "requires_audit": tool_name in ALWAYS_AUDIT_TOOLS,
        }

    # Verificar restricciones por rol
    user_roles = user.get("roles", [])
    for role in user_roles:
        restricted = ROLE_TOOL_RESTRICTIONS.get(role, [])
        if tool_name in restricted:
            return {
                "allowed": False,
                "reason": f"Herramienta '{tool_name}' no disponible para rol '{role}'",
                "requires_audit": True,
            }

    # Verificar permiso brain:use
    from security.rbac import has_permission
    if not has_permission(user, "brain:use"):
        return {
            "allowed": False,
            "reason": "Sin permiso brain:use",
            "requires_audit": True,
        }

    return {
        "allowed": True,
        "reason": "Permitido",
        "requires_audit": tool_name in ALWAYS_AUDIT_TOOLS,
    }


def analyze_prompt(prompt: str) -> dict[str, Any]:
    """
    Analiza un prompt en busca de patrones problemáticos.

    Args:
        prompt: El prompt a analizar.

    Returns:
        Dict con {risk_score, categories, patterns_found, safe}.
    """
    if not prompt:
        return {"risk_score": 0, "categories": [], "patterns_found": [], "safe": True}

    try:
        patterns_found = []
        categories_found: set[str] = set()
        max_risk = 0

        prompt_lower = prompt.lower()
        for pattern_str, category, risk_score in _PROMPT_RISK_PATTERNS:
            if re.search(pattern_str, prompt_lower, re.IGNORECASE):
                patterns_found.append({
                    "pattern": pattern_str,
                    "category": category,
                    "risk_score": risk_score,
                })
                categories_found.add(category)
                max_risk = max(max_risk, risk_score)

        # También detectar PII en el prompt
        from security.pii import detect_pii
        pii_result = detect_pii(prompt)
        if pii_result.get("has_pii"):
            categories_found.add("pii_in_prompt")
            max_risk = max(max_risk, 30)

        safe = max_risk < 50

        return {
            "risk_score": max_risk,
            "categories": sorted(categories_found),
            "patterns_found": patterns_found,
            "pii_detected": pii_result.get("has_pii", False),
            "safe": safe,
        }
    except Exception as exc:
        logger.debug("analyze_prompt error: %s", exc)
        return {"risk_score": 0, "categories": [], "patterns_found": [], "safe": True}


def guardrail_check(
    user: dict[str, Any],
    tool_name: str,
    prompt: str | None = None,
    context: str = "",
) -> dict[str, Any]:
    """
    Check completo de guardrail para una llamada al Brain.

    Combina: acceso a herramienta + análisis de prompt.

    Returns:
        Dict con {allowed, reason, risk_score, should_audit}.
    """
    # Verificar acceso
    access = check_tool_access(user, tool_name)
    if not access["allowed"]:
        _audit_blocked_access(user, tool_name, access["reason"])
        return {
            "allowed": False,
            "reason": access["reason"],
            "risk_score": 100,
            "should_audit": True,
        }

    # Analizar prompt si se proporciona
    risk_score = 0
    prompt_analysis: dict[str, Any] = {}
    if prompt and settings.feature_ai_guardrails:
        prompt_analysis = analyze_prompt(prompt)
        risk_score = prompt_analysis.get("risk_score", 0)

        if risk_score >= 80:
            _audit_blocked_access(user, tool_name, "Prompt de alto riesgo detectado")
            return {
                "allowed": False,
                "reason": f"Prompt bloqueado (risk_score={risk_score}): {prompt_analysis.get('categories', [])}",
                "risk_score": risk_score,
                "should_audit": True,
                "prompt_analysis": prompt_analysis,
            }

        if risk_score >= 50:
            logger.warning(
                "Prompt de riesgo medio: tool=%s user=%s risk=%d categories=%s",
                tool_name, user.get("id"), risk_score, prompt_analysis.get("categories"),
            )

    should_audit = access.get("requires_audit", False) or risk_score > 20

    return {
        "allowed": True,
        "reason": "Permitido",
        "risk_score": risk_score,
        "should_audit": should_audit,
        "prompt_analysis": prompt_analysis,
    }


def get_allowed_tools_for_user(user: dict[str, Any]) -> list[str]:
    """
    Devuelve lista de herramientas disponibles para el usuario.

    Solo útil cuando feature_ai_guardrails está activo.
    """
    from security.rbac import has_permission
    if settings.dev_mode or user.get("is_superadmin", False):
        return ["*"]  # Todas

    if not has_permission(user, "brain:use"):
        return []

    # Acumular restricciones de todos sus roles
    all_restricted: set[str] = set()
    for role in user.get("roles", []):
        all_restricted.update(ROLE_TOOL_RESTRICTIONS.get(role, []))

    return [f"!{t}" for t in all_restricted]  # Formato: !tool_name = bloqueado


# ── Helpers privados ───────────────────────────────────────────────────────────

def _audit_blocked_access(user: dict[str, Any], tool_name: str, reason: str) -> None:
    """Registra un intento bloqueado en auditoría."""
    try:
        from security.audit import log_audit_event
        log_audit_event(
            event_type="permission_denied",
            user_id=user.get("id"),
            tenant_id=user.get("tenant_id"),
            resource_type="brain_tool",
            resource_id=tool_name,
            action=f"call_{tool_name}",
            result="denied",
            details={"reason": reason},
            risk_score=50,
        )
    except Exception:
        pass
