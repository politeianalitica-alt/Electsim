"""
Modelos Pydantic normalizados para el módulo legislativo.

Esquema unificado para datos de BOE, Congreso y fuentes futuras
(Senado, EUR-Lex, contratación pública).
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Enumeraciones de dominio ───────────────────────────────────────────────────

IMPACT_LEVELS = ("CRÍTICO", "ALTO", "MEDIO", "BAJO", "INFORMATIVO")

LEGAL_RANKS = (
    "Ley Orgánica", "Ley", "Real Decreto-ley", "Real Decreto Legislativo",
    "Real Decreto", "Orden Ministerial", "Orden", "Resolución",
    "Instrucción", "Acuerdo", "Convenio", "Anuncio", "Convocatoria",
    "Licitación", "Corrección de errores", "Disposición", "Otro",
)

SECTORS = (
    "energía", "defensa", "vivienda", "fiscalidad", "contratación pública",
    "tecnología", "sanidad", "justicia", "trabajo", "educación",
    "agricultura", "industria", "medioambiente", "transporte",
    "exteriores", "hacienda", "interior", "cultura", "igualdad",
    "economía", "digitalización", "infraestructuras",
)


# ── Modelos ───────────────────────────────────────────────────────────────────

class LegalDocumentRef(BaseModel):
    """Referencia a un documento legal externo (BOE-A-*, DOUE, etc.)."""

    source: str
    doc_id: str
    url: str | None = None
    doc_type: str | None = None
    fecha: date | None = None

    model_config = {"from_attributes": True}


class LegalRelation(BaseModel):
    """Relación entre dos ítems legales (modifica, deroga, desarrolla…)."""

    from_id: str
    to_id: str
    relation_type: str  # "modifica" | "deroga" | "desarrolla" | "complementa"
    note: str | None = None


class LegislativeImpact(BaseModel):
    """Análisis de impacto para un ítem legislativo."""

    source_id: str
    impact_level: str = "INFORMATIVO"
    sectors: list[str] = Field(default_factory=list)
    actors: list[str] = Field(default_factory=list)
    summary: str | None = None
    confidence: float = 0.5
    analysis_method: str = "rules"  # "rules" | "llm"
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("impact_level")
    @classmethod
    def validate_impact(cls, v: str) -> str:
        if v not in IMPACT_LEVELS:
            return "INFORMATIVO"
        return v


class LegalItem(BaseModel):
    """
    Ítem legislativo normalizado — unión de BOE + Congreso + fuentes futuras.

    source: 'boe' | 'congreso' | 'senado' | 'eurlex' | 'borme'
    """

    source: str = "boe"
    source_id: str
    title: str
    legal_rank: str | None = None
    department: str | None = None
    section: str | None = None
    publication_date: date | None = None
    effective_date: date | None = None
    status: str = "vigente"
    impact_level: str = "INFORMATIVO"
    sectors: list[str] = Field(default_factory=list)
    actors: list[str] = Field(default_factory=list)
    subjects: list[str] = Field(default_factory=list)
    summary: str | None = None
    url_html: str | None = None
    url_pdf: str | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)
    text_hash: str | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"from_attributes": True}

    @field_validator("impact_level")
    @classmethod
    def validate_impact(cls, v: str) -> str:
        return v if v in IMPACT_LEVELS else "INFORMATIVO"

    @field_validator("legal_rank")
    @classmethod
    def normalize_rank(cls, v: str | None) -> str | None:
        if not v:
            return None
        return v

    def to_db_dict(self) -> dict[str, Any]:
        """Convierte a dict listo para INSERT en tabla legal_items."""
        return {
            "source": self.source,
            "source_id": self.source_id,
            "title": self.title[:2000],
            "legal_rank": self.legal_rank,
            "department": self.department,
            "section": self.section,
            "publication_date": self.publication_date,
            "effective_date": self.effective_date,
            "status": self.status,
            "impact_level": self.impact_level,
            "sectors": self.sectors,
            "actors": self.actors,
            "subjects": self.subjects,
            "summary": self.summary,
            "url_html": self.url_html,
            "url_pdf": self.url_pdf,
            "raw_payload": self.raw_payload,
            "text_hash": self.text_hash,
            "fetched_at": self.fetched_at,
        }
