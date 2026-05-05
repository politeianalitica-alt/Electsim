"""
core/evidence_policy.py — Política de evidencias para afirmaciones analíticas.

Reglas:
  - Contenido público analítico: requiere evidencia.
  - Contenido interno exploratorio: puede tener warning.
  - Predicción/simulación: requiere supuestos visibles.
  - OSINT/riesgo: requiere fuente y confianza.

Uso:
    from core.evidence_policy import requires_evidence, validate_claims_against_evidence

    if requires_evidence("content_asset", "press_note"):
        result = validate_claims_against_evidence(body, evidence_ids)
        if not result["ok"]:
            show_warning(result["missing_claims"])
"""
from __future__ import annotations

import re
from typing import Any

# ── Tipos de objeto/contenido que requieren evidencia ─────────────────────────

EVIDENCE_REQUIRED: dict[str, set[str]] = {
    "content_asset": {"press_note", "thread", "speech", "briefing", "newsletter"},
    "brain_response": {"analysis", "forecast", "recommendation", "risk_assessment"},
    "document": {"report", "policy_brief", "research"},
    "comms": {"press_note", "reactive_statement"},
}

EVIDENCE_RECOMMENDED: dict[str, set[str]] = {
    "content_asset": {"linkedin_post", "email", "q_and_a"},
    "brain_response": {"summary", "explanation"},
    "comms": {"newsletter", "stakeholder_update"},
}

# ── Patrones que indican afirmaciones cuantitativas ───────────────────────────

_QUANTITATIVE_PATTERNS = [
    re.compile(r"\b\d+[\.,]?\d*\s*%", re.IGNORECASE),              # 3.5%
    re.compile(r"\b\d+\s*(puntos|millones|miles|euros|USD)", re.IGNORECASE),
    re.compile(r"(sube|baja|aumenta|decrece|cae|crece)\s+\d+", re.IGNORECASE),
    re.compile(r"(intención de voto|sondeo|encuesta|barómetro)", re.IGNORECASE),
    re.compile(r"(con una probabilidad|con un \d+%|con certeza)", re.IGNORECASE),
    re.compile(r"(récord|máximo histórico|mínimo histórico)", re.IGNORECASE),
    re.compile(r"\b(PIB|IPC|Euríbor|prima de riesgo)\b.*\d", re.IGNORECASE),
]

# Palabras clave que sugieren afirmaciones sin fuente
_UNSUPPORTED_CLAIM_KEYWORDS = [
    "está probado", "se ha demostrado", "los datos muestran",
    "según las últimas cifras", "los expertos afirman",
    "definitivamente", "con total certeza", "inevitablemente",
    "siempre", "nunca", "todos", "nadie", "el 100%",
    "es corrupto", "ha cometido", "es culpable",
]


def requires_evidence(object_type: str, content_type: str) -> bool:
    """
    Retorna True si este tipo de contenido REQUIERE evidencia.

    Args:
        object_type: "content_asset", "brain_response", "document", "comms"
        content_type: tipo específico ("press_note", "analysis", etc.)

    Returns:
        True si es obligatorio tener evidencia.
    """
    required = EVIDENCE_REQUIRED.get(object_type, set())
    return content_type in required


def recommends_evidence(object_type: str, content_type: str) -> bool:
    """Retorna True si la evidencia es recomendada (no obligatoria)."""
    recommended = EVIDENCE_RECOMMENDED.get(object_type, set())
    return content_type in recommended


def validate_evidence_ids(evidence_ids: list[str]) -> dict[str, Any]:
    """
    Valida que los evidence_ids son strings no vacíos.

    Para validación real contra DB usar evidence_store.py.

    Returns:
        dict con ok, valid_count, invalid_ids, warning
    """
    if not evidence_ids:
        return {
            "ok": False,
            "valid_count": 0,
            "invalid_ids": [],
            "warning": "No se proporcionaron evidencias.",
        }
    valid = [e for e in evidence_ids if e and isinstance(e, str) and len(e) > 2]
    invalid = [e for e in evidence_ids if e not in valid]
    return {
        "ok": len(valid) > 0,
        "valid_count": len(valid),
        "invalid_ids": invalid,
        "warning": f"{len(invalid)} IDs de evidencia inválidos." if invalid else "",
    }


def detect_quantitative_claims(text: str) -> list[str]:
    """
    Detecta afirmaciones cuantitativas en el texto.

    Returns:
        Lista de fragmentos que contienen afirmaciones cuantitativas.
    """
    if not text:
        return []
    claims = []
    sentences = re.split(r"[.!?]\s+", text)
    for sentence in sentences:
        for pattern in _QUANTITATIVE_PATTERNS:
            if pattern.search(sentence):
                claims.append(sentence.strip()[:200])
                break
    return claims


def detect_unsupported_claim_keywords(text: str) -> list[str]:
    """
    Detecta frases que sugieren afirmaciones sin fuente.

    Returns:
        Lista de frases problemáticas encontradas.
    """
    if not text:
        return []
    found = []
    text_lower = text.lower()
    for keyword in _UNSUPPORTED_CLAIM_KEYWORDS:
        if keyword.lower() in text_lower:
            found.append(keyword)
    return found


def validate_claims_against_evidence(
    text: str,
    evidence_ids: list[str],
    strict: bool = False,
) -> dict[str, Any]:
    """
    Valida que las afirmaciones del texto tienen evidencias de respaldo.

    Args:
        text: texto a validar
        evidence_ids: lista de IDs de evidencia aportados
        strict: si True, falla con afirmaciones cuantitativas sin evidencia

    Returns:
        dict con: ok, quantitative_claims, unsupported_keywords,
                  has_evidence, warnings, recommendation
    """
    quantitative = detect_quantitative_claims(text)
    unsupported = detect_unsupported_claim_keywords(text)
    ev_check = validate_evidence_ids(evidence_ids)

    has_evidence = ev_check["valid_count"] > 0
    warnings = []

    if quantitative and not has_evidence:
        warnings.append(
            f"Detectadas {len(quantitative)} afirmación(es) cuantitativa(s) sin evidencia documental."
        )

    if unsupported:
        warnings.append(
            f"Detectadas frases de riesgo sin evidencia: {', '.join(unsupported[:3])}"
        )

    ok = True
    if strict and quantitative and not has_evidence:
        ok = False

    return {
        "ok": ok,
        "quantitative_claims": quantitative,
        "unsupported_keywords": unsupported,
        "has_evidence": has_evidence,
        "evidence_count": ev_check["valid_count"],
        "warnings": warnings,
        "recommendation": (
            "Añade evidencias o cita la fuente de las afirmaciones cuantitativas."
            if warnings else "OK — contenido validado."
        ),
    }
