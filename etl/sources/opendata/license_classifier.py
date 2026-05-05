"""
License Classifier — Bloque 10.

Clasifica la licencia de un dataset y evalúa su riesgo de uso.
"""
from __future__ import annotations

import logging

from etl.sources.opendata.schemas import DataLicenseAssessment, OpenDataset

logger = logging.getLogger(__name__)

# Licencias conocidas → perfil de uso
_LICENSE_PROFILES: dict[str, dict] = {
    # Open / Creative Commons
    "cc-by": {"commercial": True, "attribution": True, "redistribution": True, "risk": "LOW"},
    "cc-by-sa": {"commercial": True, "attribution": True, "redistribution": True, "risk": "LOW"},
    "cc-by-nc": {"commercial": False, "attribution": True, "redistribution": True, "risk": "MEDIUM"},
    "cc-by-nc-sa": {"commercial": False, "attribution": True, "redistribution": True, "risk": "MEDIUM"},
    "cc-by-nd": {"commercial": True, "attribution": True, "redistribution": False, "risk": "MEDIUM"},
    "cc0": {"commercial": True, "attribution": False, "redistribution": True, "risk": "LOW"},
    "cc-zero": {"commercial": True, "attribution": False, "redistribution": True, "risk": "LOW"},
    "pddl": {"commercial": True, "attribution": False, "redistribution": True, "risk": "LOW"},
    "odc-by": {"commercial": True, "attribution": True, "redistribution": True, "risk": "LOW"},
    "odc-odbl": {"commercial": True, "attribution": True, "redistribution": True, "risk": "LOW"},
    # Licencias españolas
    "reutilizacion": {"commercial": True, "attribution": True, "redistribution": True, "risk": "LOW"},
    "rdl": {"commercial": True, "attribution": True, "redistribution": True, "risk": "LOW"},
    "risp": {"commercial": True, "attribution": True, "redistribution": True, "risk": "LOW"},
    # MIT / Apache / GPL — para APIs abiertas
    "mit": {"commercial": True, "attribution": True, "redistribution": True, "risk": "LOW"},
    "apache-2.0": {"commercial": True, "attribution": True, "redistribution": True, "risk": "LOW"},
    # Government Open Data
    "uk-ogl": {"commercial": True, "attribution": True, "redistribution": True, "risk": "LOW"},
    "fr-lo": {"commercial": True, "attribution": True, "redistribution": True, "risk": "LOW"},
    # Restricciones
    "copyright": {"commercial": False, "attribution": True, "redistribution": False, "risk": "HIGH"},
    "all rights reserved": {"commercial": False, "attribution": True, "redistribution": False, "risk": "HIGH"},
}

# Palabras que sugieren riesgo
_HIGH_RISK_TERMS = frozenset([
    "personal", "privado", "confidencial", "restringido",
    "copyright", "todos los derechos", "all rights reserved",
])
_MEDIUM_RISK_TERMS = frozenset([
    "nc", "no comercial", "no commercial", "nd", "no derivadas",
    "share alike", "compartir igual",
])
_LOW_RISK_TERMS = frozenset([
    "abierta", "libre", "cc by", "cc0", "cc-by", "zero", "public domain",
    "reutilizacion", "open data", "gobierno abierto",
])


def classify_license(dataset: OpenDataset) -> DataLicenseAssessment:
    """
    Clasifica la licencia de un dataset.

    Args:
        dataset: OpenDataset a evaluar.

    Returns:
        DataLicenseAssessment con nivel de riesgo y restricciones.
    """
    license_id = (dataset.license_id or "").lower().strip()
    license_title = (dataset.license_title or "").lower().strip()
    license_url = (dataset.license_url or "").lower().strip()

    combined = f"{license_id} {license_title} {license_url}"

    # Buscar perfil exacto — ordenar por longitud de clave desc para mayor especificidad
    for key, profile in sorted(_LICENSE_PROFILES.items(), key=lambda x: len(x[0]), reverse=True):
        if key in combined:
            return DataLicenseAssessment(
                license_id=dataset.license_id,
                license_title=dataset.license_title,
                license_url=dataset.license_url,
                commercial_use_allowed=profile["commercial"],
                attribution_required=profile["attribution"],
                redistribution_allowed=profile["redistribution"],
                risk_level=profile["risk"],
                notes=f"Perfil conocido: {key}",
            )

    # Sin licencia → UNKNOWN
    if not combined.strip():
        return DataLicenseAssessment(
            license_id=None,
            risk_level="UNKNOWN",
            notes="Sin información de licencia.",
        )

    # Inferencia por términos
    if any(t in combined for t in _HIGH_RISK_TERMS):
        return DataLicenseAssessment(
            license_id=dataset.license_id,
            license_title=dataset.license_title,
            license_url=dataset.license_url,
            commercial_use_allowed=False,
            attribution_required=True,
            redistribution_allowed=False,
            risk_level="HIGH",
            notes="Términos restrictivos detectados.",
        )

    if any(t in combined for t in _MEDIUM_RISK_TERMS):
        return DataLicenseAssessment(
            license_id=dataset.license_id,
            license_title=dataset.license_title,
            license_url=dataset.license_url,
            commercial_use_allowed=False,
            attribution_required=True,
            redistribution_allowed=True,
            risk_level="MEDIUM",
            notes="Posibles restricciones de uso comercial.",
        )

    if any(t in combined for t in _LOW_RISK_TERMS):
        return DataLicenseAssessment(
            license_id=dataset.license_id,
            license_title=dataset.license_title,
            license_url=dataset.license_url,
            commercial_use_allowed=True,
            attribution_required=True,
            redistribution_allowed=True,
            risk_level="LOW",
            notes="Términos de licencia abierta detectados.",
        )

    # No se puede determinar
    return DataLicenseAssessment(
        license_id=dataset.license_id,
        license_title=dataset.license_title,
        license_url=dataset.license_url,
        risk_level="UNKNOWN",
        notes="Licencia no reconocida — revisión manual recomendada.",
    )


def is_freely_usable(assessment: DataLicenseAssessment) -> bool:
    """Devuelve True si el dataset puede usarse libremente."""
    return assessment.risk_level == "LOW"


def requires_legal_review(assessment: DataLicenseAssessment) -> bool:
    """Devuelve True si el dataset requiere revisión legal antes de usar."""
    return assessment.risk_level in ("HIGH", "UNKNOWN")
