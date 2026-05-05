"""
CRM — Stakeholder CRM & Mobilization Core — Bloque 15.

CRM institucional y de campaña responsable para ElectSim.
Contactos · Organizaciones · Stakeholders · Relaciones ·
Interacciones · Tareas · Segmentos · Movilización.

Principios éticos:
- Solo contactos profesionales/institucionales
- Consentimiento y opt-in cuando aplique
- Sin microtargeting político opaco
- Sin inferencia de ideología individual sin consentimiento
- Auditable y multi-tenant
"""
from __future__ import annotations

__all__ = [
    "schemas", "contacts", "organizations", "stakeholders",
    "relationships", "interactions", "tasks", "consent",
    "outreach", "segments", "mobilization", "field_operations",
    "crm_scoring", "crm_recommender", "crm_importer",
    "crm_exporter", "crm_monitor",
]
