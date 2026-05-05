"""
Comms Guardrails — Bloque 16.

Validación de riesgos comunicativos: claims sin evidencia, datos personales,
lenguaje defamatorio, microtargeting sensible, confidencialidad.
"""
from __future__ import annotations

import logging
import re
from typing import Any

from communications.schemas import ContentAsset, ContentRiskCheck

logger = logging.getLogger(__name__)

# Patrones de riesgo (regex sobre contenido)
_RISK_PATTERNS: dict[str, list[str]] = {
    "personal_data": [
        r"\b\d{8}[A-Za-z]\b",            # DNI
        r"\b[A-Z]{1,2}\d{7}[A-Z]\b",     # NIE
        r"\bES\d{22}\b",                  # IBAN
        r"\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b",  # tarjeta
    ],
    "overconfident_forecast": [
        r"\bseguramente\s+(ganará|perderá|subirá|bajará)\b",
        r"\b(garantizamos?|aseguramos?)\s+que\b",
        r"\b100%\s+(seguro|cierto|confirmado)\b",
    ],
    "defamatory_language": [
        r"\b(corrupto|ladrón|criminal|delincuente)\s+(el|la|los|las|este|esta)\b",
        r"\(comprobadamente\s+(falso|mentira)\)",
    ],
}

_SENSITIVE_TOPICS = [
    "geopolítica", "osint", "inteligencia militar", "fuente confidencial",
    "dato personal", "cliente confidencial",
]

_EVIDENCE_CLAIM_KEYWORDS = [
    "según estudios", "los datos muestran", "las estadísticas indican",
    "el informe confirma", "fuentes oficiales señalan",
]


def check_content_risks(content: str, context: dict[str, Any] | None = None) -> list[str]:
    """Analiza el contenido y devuelve lista de flags de riesgo."""
    flags: list[str] = []
    content_lower = content.lower()

    for flag, patterns in _RISK_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                if flag not in flags:
                    flags.append(flag)

    for topic in _SENSITIVE_TOPICS:
        if topic in content_lower:
            if "osint_sensitive_reference" not in flags:
                flags.append("osint_sensitive_reference")
            break

    if any(kw in content_lower for kw in _EVIDENCE_CLAIM_KEYWORDS):
        if "claim_without_evidence" not in flags:
            if not context or not context.get("evidence_ids"):
                flags.append("claim_without_evidence")

    return flags


def detect_unsupported_claims(content: str, evidence_ids: list[str]) -> list[str]:
    """Detecta afirmaciones que requieren evidencia pero no la tienen."""
    unsupported = []
    if not evidence_ids:
        for kw in _EVIDENCE_CLAIM_KEYWORDS:
            if kw in content.lower():
                unsupported.append(f"Afirmación sin evidencia: '{kw}'")
    return unsupported


def detect_sensitive_targeting(content_asset: ContentAsset) -> list[str]:
    """Detecta indicadores de microtargeting sensible."""
    flags: list[str] = []
    payload = content_asset.raw_payload or {}
    sensitive_keys = {"religion", "ethnicity", "health", "sexual_orientation", "political_affiliation"}
    if any(k in payload for k in sensitive_keys):
        flags.append("sensitive_political_targeting")
    if content_asset.asset_type in ("email", "newsletter") and not content_asset.evidence_ids:
        if any(w in content_asset.body_markdown.lower() for w in ["confidencial", "solo para ti", "tu perfil"]):
            flags.append("sensitive_political_targeting")
    return flags


def require_human_approval(content_asset_id: str) -> bool:
    """Determina si el contenido requiere aprobación humana obligatoria."""
    from communications.message_studio import get_asset
    asset = get_asset(content_asset_id)
    if asset is None:
        return True
    flags = check_content_risks(asset.body_markdown)
    if flags:
        return True
    if asset.asset_type in ("press_note", "speech", "thread"):
        return True
    return False


def sanitize_for_publication(content: str) -> str:
    """Elimina datos personales detectados del contenido."""
    for pattern in _RISK_PATTERNS.get("personal_data", []):
        content = re.sub(pattern, "[DATO REDACTADO]", content, flags=re.IGNORECASE)
    return content


def run_full_guardrail_check(content_asset: ContentAsset) -> ContentRiskCheck:
    """Ejecuta todos los guardrails y devuelve un ContentRiskCheck."""
    flags = check_content_risks(content_asset.body_markdown, {"evidence_ids": content_asset.evidence_ids})
    flags += detect_sensitive_targeting(content_asset)
    unsupported = detect_unsupported_claims(content_asset.body_markdown, content_asset.evidence_ids)
    if unsupported:
        flags.append("claim_without_evidence")

    legal = any(f in flags for f in ("defamatory_language", "personal_data", "unverified_accusation"))
    risk = len(flags) > 0

    return ContentRiskCheck(
        content_asset_id=content_asset.asset_id,
        flags=list(set(flags)),
        requires_approval=risk or legal,
        requires_legal_review=legal,
        requires_risk_review=risk,
    )
