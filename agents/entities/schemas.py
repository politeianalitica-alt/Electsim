"""Pydantic schemas para entidades del modelo ontológico unificado.

Estos schemas son la fuente de verdad del contrato API/DB. El frontend
genera tipos TypeScript a partir de estos.

Diseño:
  - `EntityKind` y `LinkKind` son Literal/Enum cerrados — añadir un kind
    nuevo es una decisión consciente (no se hace por error).
  - `Entity` siempre tiene `kind + slug` como par único humano-legible
    (`actor_person + pedro-sanchez`, `party + psoe`, `law + ley-amnistia-2024`).
  - `qid` es opcional pero unique cuando existe (Wikidata).
  - `payload` jsonb libre para campos específicos del kind (sin schema rígido —
    el caller del kind sabe qué hay dentro).
  - `valid_from`/`valid_to` para temporalidad real.
  - `EntityLink` siempre tiene direccionalidad (src → dst) y confidence.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ─────────────────────────────────────────────────────────────────
# Enums cerrados · una decisión consciente cada vez que se amplían
# ─────────────────────────────────────────────────────────────────

EntityKind = Literal[
    "actor_person",     # política · individuo (Pedro Sánchez, Ayuso...)
    "actor_org",        # organización política (PSOE, Junts, Junta Andalucía...)
    "institution",      # institución del Estado (Congreso, Senado, TS, TC...)
    "party",            # partido · subkind de actor_org para retrocompat
    "government",       # gobierno (central, autonómico, local)
    "law",              # ley, RDL, decreto, dictamen
    "event",            # hecho político (investidura, DANA, ruptura...)
    "territory",        # CCAA, provincia, municipio
    "media",            # medio (El País, ABC, Cadena Ser...)
    "document",         # BOE, BOCG, contrato PLACSP, sentencia...
    "sector",           # sector económico (banca, energía, farma...)
    "narrative",        # narrativa identificada (ataques al CGPJ...)
    "theme",            # tema / agenda (vivienda, IA Act...)
]


LinkKind = Literal[
    # Pertenencia / rol
    "member_of",         # actor_person → party / actor_org
    "leads",             # actor_person → actor_org / government
    "president_of",      # actor_person → territory / government / institution
    "minister_of",       # actor_person → institution (cartera)
    "succeeds",          # actor_person → actor_person (sucesión cargo)
    # Acción legislativa
    "proposes",          # actor → law
    "votes_for",         # actor → law
    "votes_against",     # actor → law
    "abstains_on",       # actor → law
    "regulates",         # institution → sector / theme
    # Geografía
    "located_in",        # entity → territory
    "covers",            # media → territory / sector / theme
    # Eventos
    "participated_in",   # actor → event
    "caused",            # event → event
    "responded_to",      # actor → event
    # Relaciones políticas
    "allied_with",       # actor → actor
    "rival_of",          # actor → actor
    "coalition_with",    # party → party
    "criticizes",        # actor → actor / law / event
    "supports",          # actor → actor / law / event
    # Narrativa / cobertura
    "mentions",          # document/media → entity
    "frames",            # narrative → actor / law / event
    "attacks",           # narrative → actor (ataque narrativo)
    "promotes",          # actor → narrative
    # Documentos
    "issued_by",         # document → institution
    "cites",             # document → document / law
]


# ─────────────────────────────────────────────────────────────────
# Entity
# ─────────────────────────────────────────────────────────────────

class EntityBase(BaseModel):
    """Campos compartidos entre create/update/out."""
    kind: EntityKind
    slug: str = Field(min_length=2, max_length=120)
    qid: str | None = Field(default=None, max_length=40, description="QID de Wikidata si existe")
    display_name: str = Field(min_length=1, max_length=240)
    aliases: list[str] = Field(default_factory=list)
    payload: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    source: str = Field(default="curated", max_length=60)
    valid_from: datetime | None = None
    valid_to: datetime | None = None

    @field_validator("slug")
    @classmethod
    def _slug_format(cls, v: str) -> str:
        if not v:
            raise ValueError("slug no puede estar vacío")
        if " " in v or v.lower() != v:
            raise ValueError(f"slug debe estar en minúsculas y sin espacios: {v!r}")
        return v


class EntityCreate(EntityBase):
    """Payload de creación."""
    pass


class EntityUpdate(BaseModel):
    """Payload de update parcial · todos los campos opcionales."""
    display_name: str | None = None
    aliases: list[str] | None = None
    payload: dict[str, Any] | None = None
    tags: list[str] | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    valid_from: datetime | None = None
    valid_to: datetime | None = None


class Entity(EntityBase):
    """Entity completa (con id + timestamps)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class EntitySummary(BaseModel):
    """Vista compacta para listados / autocomplete / chips."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: EntityKind
    slug: str
    qid: str | None = None
    display_name: str
    tags: list[str] = Field(default_factory=list)


class EntitySearchResult(BaseModel):
    """Resultado de búsqueda con scoring."""
    entity: EntitySummary
    score: float = Field(ge=0.0, le=1.0)
    matched_via: Literal["slug", "qid", "display_name", "alias", "tag", "payload"]


# ─────────────────────────────────────────────────────────────────
# EntityLink
# ─────────────────────────────────────────────────────────────────

class EntityLinkBase(BaseModel):
    """Campos comunes."""
    src_id: int
    dst_id: int
    link_kind: LinkKind
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_url: str | None = None
    evidence_id: int | None = None  # entity_id del documento que evidencia
    payload: dict[str, Any] = Field(default_factory=dict)
    valid_from: datetime | None = None
    valid_to: datetime | None = None


class EntityLinkCreate(EntityLinkBase):
    """Payload creación."""
    pass


class EntityLink(EntityLinkBase):
    """EntityLink con id + timestamp."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class EntityWithLinks(Entity):
    """Entity + sus links salientes y entrantes."""
    outgoing_links: list[EntityLink] = Field(default_factory=list)
    incoming_links: list[EntityLink] = Field(default_factory=list)


# ─────────────────────────────────────────────────────────────────
# Investigation schemas (Pilar 2)
# ─────────────────────────────────────────────────────────────────

InvStatus = Literal["active", "archived", "shared"]
ArtifactKind = Literal[
    "notebook_block",   # bloque de texto/cita/embed dentro del notebook
    "hypothesis",       # hipótesis ACH con scoring
    "evidence",         # evidencia ingresada con Admiralty
    "canvas_state",     # estado del canvas (stakeholder/causal/timeline)
    "brief_version",    # versión de un briefing/SITREP/INTSUM
    "comment",          # comentario anclado a otro artefacto
]


class InvestigationBase(BaseModel):
    slug: str = Field(min_length=2, max_length=120)
    title: str = Field(min_length=1, max_length=240)
    description: str = ""
    status: InvStatus = "active"
    tags: list[str] = Field(default_factory=list)
    payload: dict[str, Any] = Field(default_factory=dict)
    collaborators: list[str] = Field(default_factory=list)


class InvestigationCreate(InvestigationBase):
    owner_id: str


class InvestigationUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: InvStatus | None = None
    tags: list[str] | None = None
    payload: dict[str, Any] | None = None
    collaborators: list[str] | None = None


class Investigation(InvestigationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_id: str
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None


class PinnedEntity(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    investigation_id: int
    entity_id: int
    position: int = 0
    note: str = ""
    pinned_by: str
    pinned_at: datetime
    # Joined fields (opcional, cuando se sirve con join)
    entity: EntitySummary | None = None


class Artifact(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    investigation_id: int
    artifact_kind: ArtifactKind
    title: str = ""
    payload: dict[str, Any]
    position: int = 0
    entity_refs: list[int] = Field(default_factory=list)
    author_id: str
    version: int = 1
    parent_id: int | None = None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None


class ArtifactCreate(BaseModel):
    artifact_kind: ArtifactKind
    title: str = ""
    payload: dict[str, Any] = Field(default_factory=dict)
    position: int = 0
    entity_refs: list[int] = Field(default_factory=list)
    author_id: str
    parent_id: int | None = None


class AnalystEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    investigation_id: int | None = None
    actor_id: str
    verb: str
    target_kind: str | None = None
    target_id: int | None = None
    entity_id: int | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    ts: datetime


class InvestigationDetail(Investigation):
    """Vista hidratada de una investigación con todos sus artefactos."""
    pinned: list[PinnedEntity] = Field(default_factory=list)
    artifacts: list[Artifact] = Field(default_factory=list)
    recent_events: list[AnalystEvent] = Field(default_factory=list)
    counts: dict[str, int] = Field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────
# Backlinks · Pilar 1 + 2 conectados (memoria institucional propia)
# ─────────────────────────────────────────────────────────────────

class InvestigationRef(BaseModel):
    """Referencia compacta a una investigación (para backlinks)."""
    id: int
    slug: str
    title: str
    status: str
    updated_at: datetime
    pinned_position: int | None = None  # null si solo se referencia desde artifacts
    pinned_note: str = ""


class ArtifactRef(BaseModel):
    """Referencia a un artifact que menciona la entidad."""
    id: int
    investigation_id: int
    investigation_slug: str
    investigation_title: str
    artifact_kind: ArtifactKind
    title: str
    updated_at: datetime


class EntityBacklinks(BaseModel):
    """Backlinks de una entity: dónde aparece dentro de Politeia.

    Esto convierte cada ficha (Pedro Sánchez, PSOE, Madrid…) en un nodo
    de memoria institucional: muestra todas las investigaciones donde
    está pinned + todos los artifacts (notebook, hipótesis, evidencias)
    que la referencian. Backlinks estilo Obsidian/Roam para el workspace
    investigativo.
    """
    entity_id: int
    investigations: list[InvestigationRef] = Field(default_factory=list)
    artifact_refs: list[ArtifactRef] = Field(default_factory=list)
    total_pinned: int = 0
    total_artifact_refs: int = 0
