# etl/sources/legislative
from .schemas import LegalItem, LegalRelation, LegalDocumentRef, LegislativeImpact
from .boe_client import BOEClient
from .boe_adapter import BOEAdapter
from .boe_monitor import BOEMonitor

__all__ = [
    "LegalItem", "LegalRelation", "LegalDocumentRef", "LegislativeImpact",
    "BOEClient", "BOEAdapter", "BOEMonitor",
]
