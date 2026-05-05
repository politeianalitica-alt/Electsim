"""
PII Detection — Bloque 13.

Detección de Información Personalmente Identificable (PII) en textos.
Usa expresiones regulares. Puede extenderse con spaCy NER si está disponible.

Acción configurable: warn (por defecto), redact, block.
Nunca lanza excepciones — la detección no debe romper el flujo.
"""
from __future__ import annotations

import logging
import re
from typing import Any

from security.settings import settings

logger = logging.getLogger(__name__)

# ── Patrones de PII ────────────────────────────────────────────────────────────

_PATTERNS: dict[str, re.Pattern[str]] = {
    "email": re.compile(
        r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b"
    ),
    "phone_es": re.compile(
        r"\b(?:\+34\s?)?(?:6|7|8|9)\d{8}\b"
    ),
    "phone_intl": re.compile(
        r"\+\d{1,3}[\s\-]?\d{6,14}\b"
    ),
    "dni": re.compile(
        r"\b\d{8}[A-HJ-NP-TV-Z]\b"
    ),
    "nie": re.compile(
        r"\b[XYZ]\d{7}[A-Z]\b"
    ),
    "passport": re.compile(
        r"\b[A-Z]{2}\d{6}\b"
    ),
    "iban_es": re.compile(
        r"\bES\d{2}\s?\d{4}\s?\d{4}\s?\d{2}\s?\d{10}\b"
    ),
    "credit_card": re.compile(
        r"\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6011)[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b"
    ),
    "ip_address": re.compile(
        r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"
    ),
    "postal_code_es": re.compile(
        r"\b(?:0[1-9]|[1-4]\d|5[0-2])\d{3}\b"
    ),
    "health_id": re.compile(
        r"\b[A-Z]{4}\d{6}\d{2}\b"  # Tarjeta sanitaria (aproximación)
    ),
}

# Redacción
_REDACT_PLACEHOLDER = "[REDACTADO]"


def detect_pii(text: str) -> dict[str, Any]:
    """
    Detecta PII en un texto.

    Args:
        text: Texto a analizar.

    Returns:
        Dict con:
        - has_pii: bool
        - types: list[str] — tipos de PII encontrados
        - count: int — número total de matches
        - matches: list[dict] — cada match con tipo, valor parcial y posición
        - risk_level: str — "none", "low", "medium", "high"
    """
    if not text:
        return {"has_pii": False, "types": [], "count": 0, "matches": [], "risk_level": "none"}

    try:
        matches: list[dict[str, Any]] = []
        found_types: set[str] = set()

        for pii_type, pattern in _PATTERNS.items():
            for match in pattern.finditer(text):
                found_types.add(pii_type)
                value = match.group()
                # Enmascarar el valor para no exponer PII en logs
                masked = _mask_value(value, pii_type)
                matches.append({
                    "type": pii_type,
                    "masked_value": masked,
                    "start": match.start(),
                    "end": match.end(),
                })

        count = len(matches)
        has_pii = count > 0

        # Nivel de riesgo
        high_risk_types = {"dni", "nie", "passport", "credit_card", "iban_es", "health_id"}
        if found_types & high_risk_types:
            risk_level = "high"
        elif count > 5:
            risk_level = "high"
        elif count > 2:
            risk_level = "medium"
        elif has_pii:
            risk_level = "low"
        else:
            risk_level = "none"

        return {
            "has_pii": has_pii,
            "types": sorted(found_types),
            "count": count,
            "matches": matches[:50],  # Limitar para no sobrecargar
            "risk_level": risk_level,
        }
    except Exception as exc:
        logger.debug("detect_pii error: %s", exc)
        return {"has_pii": False, "types": [], "count": 0, "matches": [], "risk_level": "none"}


def redact_pii(text: str, types_to_redact: list[str] | None = None) -> str:
    """
    Redacta PII en un texto, reemplazando por [REDACTADO].

    Args:
        text: Texto original.
        types_to_redact: Lista de tipos a redactar. None = todos.

    Returns:
        Texto con PII redactada.
    """
    if not text:
        return text

    try:
        result = text
        for pii_type, pattern in _PATTERNS.items():
            if types_to_redact is not None and pii_type not in types_to_redact:
                continue
            result = pattern.sub(_REDACT_PLACEHOLDER, result)
        return result
    except Exception as exc:
        logger.debug("redact_pii error: %s", exc)
        return text


def check_and_act(
    text: str,
    context: str = "unknown",
    user_id: str | None = None,
) -> dict[str, Any]:
    """
    Detecta PII y aplica la acción configurada (warn/redact/block).

    Args:
        text: Texto a verificar.
        context: Contexto descriptivo (para auditoría).
        user_id: Usuario que genera el texto.

    Returns:
        Dict con:
        - allowed: bool — si el texto puede procesarse
        - text: str — texto (posiblemente redactado)
        - pii_result: dict — resultado de detección
        - action_taken: str — "none", "warned", "redacted", "blocked"
    """
    if not settings.feature_pii_detection:
        return {
            "allowed": True,
            "text": text,
            "pii_result": {"has_pii": False, "types": [], "count": 0},
            "action_taken": "none",
        }

    pii_result = detect_pii(text)

    if not pii_result["has_pii"]:
        return {
            "allowed": True,
            "text": text,
            "pii_result": pii_result,
            "action_taken": "none",
        }

    action = settings.pii_action
    pii_types = pii_result.get("types", [])

    # Loguear en auditoría
    try:
        from security.audit import log_audit_event
        log_audit_event(
            event_type="data_classified",
            user_id=user_id,
            resource_type="text",
            resource_id=context,
            action="pii_detected",
            result="ok" if action != "block" else "denied",
            details={
                "pii_types": pii_types,
                "pii_count": pii_result.get("count", 0),
                "action": action,
            },
            risk_score=50 if pii_result.get("risk_level") == "high" else 25,
        )
    except Exception:
        pass

    if action == "block":
        logger.warning(
            "PII detectada en contexto=%s — acción=block — tipos=%s",
            context, pii_types,
        )
        return {
            "allowed": False,
            "text": text,
            "pii_result": pii_result,
            "action_taken": "blocked",
        }

    if action == "redact":
        redacted = redact_pii(text)
        logger.info("PII redactada en contexto=%s — tipos=%s", context, pii_types)
        return {
            "allowed": True,
            "text": redacted,
            "pii_result": pii_result,
            "action_taken": "redacted",
        }

    # warn (default)
    logger.warning(
        "PII detectada en contexto=%s — acción=warn — tipos=%s",
        context, pii_types,
    )
    return {
        "allowed": True,
        "text": text,
        "pii_result": pii_result,
        "action_taken": "warned",
    }


def _mask_value(value: str, pii_type: str) -> str:
    """Enmascara un valor PII para logging seguro."""
    if len(value) <= 4:
        return "****"
    if pii_type == "email":
        parts = value.split("@")
        if len(parts) == 2:
            local = parts[0]
            masked_local = local[0] + "***" if len(local) > 1 else "***"
            return f"{masked_local}@{parts[1]}"
    if pii_type in ("credit_card", "iban_es"):
        return value[-4:].zfill(len(value)).replace("0", "*")[:-4] + value[-4:]
    # Por defecto: mostrar primeros 2 y últimos 2
    return value[:2] + "***" + value[-2:]
