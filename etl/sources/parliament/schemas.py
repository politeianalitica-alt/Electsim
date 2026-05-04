"""
Modelos Pydantic para el módulo parlamentario (Congreso, Senado).

Portado desde congreso-scrapper (Node/MongoDB) a Python/PostgreSQL.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ── Sub-modelos ───────────────────────────────────────────────────────────────

class ParliamentaryActorRef(BaseModel):
    """Referencia a un parlamentario en una iniciativa."""

    actor_id: str | None = None
    name: str
    party: str | None = None
    role: str | None = None  # "firmante" | "portavoz" | "ponente"


class ParliamentaryBodyRef(BaseModel):
    """Referencia a un órgano parlamentario (comisión, subcomisión, etc.)."""

    body_id: str | None = None
    name: str
    body_type: str | None = None  # "comision" | "subcomision" | "pleno"
    competency: str | None = None  # competencia sobre la iniciativa


class ParliamentaryDocumentRef(BaseModel):
    """Referencia a un documento publicado (boletín, diario de sesiones, BOE)."""

    doc_type: str  # "boletin" | "diario" | "boe"
    number: str | None = None
    date_published: date | None = None
    url: str | None = None
    boe_ref: str | None = None  # "BOE-A-YYYY-XXXXX"


# ── Modelo principal ──────────────────────────────────────────────────────────

class ParliamentaryInitiative(BaseModel):
    """
    Iniciativa parlamentaria normalizada.

    Tipos: PL (Proyecto de Ley), PPL (Proposición de Ley), PNL (Proposición No de Ley),
           MOCI (Moción), INTER (Interpelación), PREG (Pregunta oral/escrita),
           ENMI (Enmienda), RDL (Real Decreto-ley para convalidar).
    """

    source: str = "congreso"
    source_id: str
    legislature: str | None = None
    initiative_type: str | None = None
    initiative_type_label: str | None = None
    title: str
    presented_date: date | None = None
    qualified_date: date | None = None
    status: str | None = None
    result: str | None = None
    tramitation_type: str | None = None
    authors: list[ParliamentaryActorRef] = Field(default_factory=list)
    competent_commissions: list[ParliamentaryBodyRef] = Field(default_factory=list)
    rapporteurs: list[str] = Field(default_factory=list)
    bulletins: list[ParliamentaryDocumentRef] = Field(default_factory=list)
    diaries: list[ParliamentaryDocumentRef] = Field(default_factory=list)
    boe_refs: list[str] = Field(default_factory=list)  # BOE-A-* refs
    related_legal_items: list[str] = Field(default_factory=list)
    impact_level: str = "INFORMATIVO"
    sectors: list[str] = Field(default_factory=list)
    raw_url: str | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"from_attributes": True}

    def to_db_dict(self) -> dict[str, Any]:
        """Convierte a dict para INSERT en parliamentary_initiatives."""
        import json

        def _ser(obj: Any) -> Any:
            if isinstance(obj, BaseModel):
                return obj.model_dump()
            if isinstance(obj, (date, datetime)):
                return obj.isoformat()
            return obj

        return {
            "source": self.source,
            "source_id": self.source_id,
            "legislature": self.legislature,
            "initiative_type": self.initiative_type,
            "title": self.title[:2000],
            "presented_date": self.presented_date,
            "qualified_date": self.qualified_date,
            "status": self.status,
            "result": self.result,
            "tramitation_type": self.tramitation_type,
            "authors": json.dumps([_ser(a) for a in self.authors], default=str),
            "competent_commissions": json.dumps([_ser(c) for c in self.competent_commissions], default=str),
            "rapporteurs": self.rapporteurs,
            "bulletins": json.dumps([_ser(b) for b in self.bulletins], default=str),
            "diaries": json.dumps([_ser(d) for d in self.diaries], default=str),
            "boe_refs": self.boe_refs,
            "related_legal_items": self.related_legal_items,
            "impact_level": self.impact_level,
            "sectors": self.sectors,
            "raw_url": self.raw_url,
            "raw_payload": json.dumps(self.raw_payload, default=str),
            "fetched_at": self.fetched_at,
        }
