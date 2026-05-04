"""
etl/sources/osint — Bloque 4: OSINT & Risk Graph Core.

Principio de diseño: OSINT defensivo, verificable y auditable.
  - Fuentes públicas (sanciones, PEPs, organismos, empresas, cargos)
  - No scraping agresivo ni vigilancia personal
  - Candidatos de identidad social nunca asumidos como verdad
  - Todo resultado requiere revisión humana antes de uso en informes

Módulos:
  schemas.py                  Pydantic: RiskEntity, RiskRelation, RiskFlag, etc.
  opensanctions_adapter.py    Parsea exports de OpenSanctions → RiskEntity/RiskRelation
  followthemoney_mapper.py    Mapea esquemas FollowTheMoney a modelos ElectSim
  entity_resolver.py          Deduplicación y matching de entidades
  risk_scorer.py              Cálculo explicable de risk score
  maigret_adapter.py          Candidatos de identidad social (verificación manual requerida)
  spiderfoot_adapter.py       Importador de exports externos JSON/GEXF
  osint_monitor.py            Monitor ETL que persiste entidades en BD
"""
from .schemas import (
    RiskEntity, RiskRelation, RiskFlag,
    SocialIdentityCandidate, EntityMatchCandidate,
    RiskProfile, GraphExport,
)

__all__ = [
    "RiskEntity", "RiskRelation", "RiskFlag",
    "SocialIdentityCandidate", "EntityMatchCandidate",
    "RiskProfile", "GraphExport",
]
