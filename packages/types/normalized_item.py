"""NormalizedItem · contrato único entre conectores y el resto del pipeline.

> **Pilar Ingesta · Sprint 1** (`docs/INGESTA_PROPUESTA.md §3 capa 1`)

**Problema que resuelve**:
Antes, cada conector devolvía un `dict[str, Any]` con campos arbitrarios.
La auditoría (`docs/INGESTA_AUDIT.md §1`) identificó **3 clases base
incompatibles** de conector y **3 schemas distintos** para "noticia procesada"
(`media_items`, `news_articles`, `strategic_articles`). Sin contrato, cada
consumidor (NLP, OntologyMapper, persistencia) tenía que adivinar la forma.

**Solución**:
Un único `NormalizedItem(BaseModel, extra='forbid')` que TODOS los conectores
deben producir. Pydantic v2 falla rápido en violaciones de contrato — un
campo no contemplado o un tipo equivocado y el conector deja de ser válido.

**Filosofía**:
  - Strict by default (`extra='forbid'`, `validate_assignment=True`)
  - Sin "campos misc" — si necesitas algo nuevo, se añade al schema con PR
  - jsonb libre solo en `payload` para datos de subtipo específico del conector
  - Identidad estable: `(source, item_id)` es la clave única natural
  - Tiempo explícito: cada ítem tiene `published_at` (cuando ocurrió) y
    `ingested_at` (cuando lo capturamos)
  - Procedencia: `source` siempre identifica la fuente origen para audit trail

**Cómo se usa en el pipeline**:
```
Connector → NormalizedItem ──▶ Enrichment (NLP) ──▶ OntologyMapper ──▶ entities
                              │                    │
                              ▼                    ▼
                         EnrichedItem        EntityUpsertOp +
                                             EntityLinkOp
```
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


# ─────────────────────────────────────────────────────────────────
# Tipos auxiliares
# ─────────────────────────────────────────────────────────────────

SourceKind = Literal[
    # Legislación · normativa
    "boe", "bocg", "borme", "doue", "eur_lex", "ccaa_boletin",
    # Parlamento
    "congreso", "senado", "europarl", "ccaa_parlamento",
    # Contratación
    "placsp", "ted_eu", "ccaa_contratacion",
    # Datos abiertos
    "ine", "bde", "eurostat", "datos_gob", "ckan_ccaa",
    # Política
    "cis", "interior_elecciones", "tribunal_cuentas",
    # Geopolítica
    "gdelt", "acled", "ucdp", "opensanctions", "opencorporates",
    # Medios
    "rss", "rss_global", "scraping_html",
    # Economía / mercados
    "ree", "ecb", "world_bank", "openbb",
    # OSINT / redes
    "telegram", "x", "fact_check_rss",
    # Puertos & comercio global (Módulo Puertos · MVP P1)
    "ais_position", "port_call", "comtrade", "eurostat_comext",
    "freight_rate", "sanctions_maritime",
    # Otros
    "wikidata", "manual", "import",
]
"""Identificador de la fuente. Lista cerrada para que añadir uno sea
una decisión consciente (no se hace por error)."""


# Tipos de entidad y de enlace los REUTILIZAMOS de agents.entities.schemas
# para evitar drift. Se importan tarde para no crear ciclos en tiempo de import.


# ─────────────────────────────────────────────────────────────────
# NormalizedItem · entrada del pipeline
# ─────────────────────────────────────────────────────────────────

class NormalizedItem(BaseModel):
    """Item canónico que produce CADA conector. Contrato inmutable.

    Tests de contrato en `tests/test_ingesta/test_normalized_item.py`
    validan que los conectores existentes producen instancias válidas.
    """
    model_config = ConfigDict(
        extra="forbid",         # campo no contemplado → ValidationError
        validate_assignment=True,
        frozen=False,           # se permite mutar tras validación
        str_strip_whitespace=True,
    )

    # ── Identidad (clave única natural: source + item_id) ──
    source: SourceKind = Field(description="Fuente origen · catálogo cerrado")
    item_id: str = Field(
        min_length=1,
        max_length=512,
        description="Identificador estable dentro de la fuente. Ej: BOE-A-2026-12345, "
                    "expediente PLACSP, GUID del feed RSS, hash si no hay ID natural.",
    )

    # ── Contenido ──
    title: str = Field(min_length=1, max_length=2000)
    body: str = Field(
        default="",
        description="Cuerpo del ítem. Vacío si solo hay título (caso RSS sin descripción).",
    )
    summary: str = Field(
        default="",
        max_length=4000,
        description="Resumen breve si la fuente lo provee (ej. <description> RSS).",
    )

    # ── URLs ──
    url: HttpUrl | None = Field(
        default=None,
        description="URL canónica del item original (no la URL del feed).",
    )
    canonical_url: HttpUrl | None = Field(
        default=None,
        description="URL canónica si la fuente la provee (rel=canonical).",
    )
    pdf_url: HttpUrl | None = Field(
        default=None,
        description="Si el ítem está respaldado por un PDF (BOE, contratos), URL aquí.",
    )

    # ── Tiempo ──
    published_at: datetime = Field(description="Cuando ocurrió/se publicó en la fuente")
    ingested_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Cuando lo capturamos (default=ahora UTC)",
    )

    # ── Procedencia y trazabilidad ──
    author: str = Field(default="", description="Autor o emisor si aplica")
    language: str = Field(
        default="es",
        pattern=r"^[a-z]{2}(-[A-Z]{2})?$",
        description="ISO 639-1 + opcional región. Default 'es'.",
    )
    raw_hash: str = Field(
        default="",
        description="SHA-256 del raw para dedup determinístico. Vacío = no calculado.",
    )

    # ── Categorías de procedencia ──
    categories: list[str] = Field(
        default_factory=list,
        description="Categorías nativas de la fuente (ej. 'Disposiciones generales' "
                    "para BOE, sección RSS para medios). NO IPTC — eso lo añade Enrichment.",
    )

    # ── Payload libre del subtipo ──
    payload: dict[str, Any] = Field(
        default_factory=dict,
        description="Campos específicos del conector que no caben en el schema "
                    "(ej. departamento BOE, importe contrato, geo coords del feed). "
                    "Convención: claves snake_case, sin nested >2 niveles.",
    )

    @field_validator("item_id")
    @classmethod
    def _item_id_format(cls, v: str) -> str:
        # No permitimos saltos de línea ni tabs en item_id
        if any(c in v for c in "\n\r\t"):
            raise ValueError("item_id no puede contener whitespace control chars")
        return v

    @field_validator("body", "summary")
    @classmethod
    def _trim_long_whitespace(cls, v: str) -> str:
        # Colapsa múltiples espacios pero preserva newlines (necesarios para
        # parser de Markdown del body en NLP/LLM)
        return v


# ─────────────────────────────────────────────────────────────────
# ExtractedEntity / ExtractedLink · salida de la fase NLP/LLM
# ─────────────────────────────────────────────────────────────────

class ExtractedEntity(BaseModel):
    """Entidad detectada en el texto por NER/LLM.

    Aún no está mapeada al `entities` canónico — eso lo hace OntologyMapper.
    """
    model_config = ConfigDict(extra="forbid")

    kind: str = Field(
        description="Kind tentativo (person, organization, party, law, event, "
                    "territory, media, document, sector). Debe ser un EntityKind "
                    "válido — se valida en OntologyMapper.",
    )
    display_name: str = Field(min_length=1, max_length=240)
    qid: str | None = Field(
        default=None,
        description="Wikidata QID si el extractor lo identifica.",
    )
    aliases: list[str] = Field(default_factory=list)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    span: tuple[int, int] | None = Field(
        default=None,
        description="Offset (start, end) en el body donde se extrajo (NER).",
    )
    payload: dict[str, Any] = Field(default_factory=dict)


class ExtractedLink(BaseModel):
    """Relación entre dos entidades extraídas (mismas indices)."""
    model_config = ConfigDict(extra="forbid")

    source_idx: int = Field(ge=0, description="Índice en entities_extracted[] del item enriquecido")
    target_idx: int = Field(ge=0)
    kind: str = Field(description="LinkKind tentativo · se valida en OntologyMapper")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_snippet: str = Field(default="", max_length=600)


# ─────────────────────────────────────────────────────────────────
# EnrichedItem · NormalizedItem + NLP/LLM analysis
# ─────────────────────────────────────────────────────────────────

class EnrichedItem(NormalizedItem):
    """NormalizedItem tras pasar por la fase Enrichment.

    Hereda todos los campos del NormalizedItem y añade los análisis.
    Sigue siendo `extra='forbid'` — si un análisis nuevo necesita
    persistirse, se añade explícitamente al schema.
    """

    # NLP determinista
    iptc_topics: list[str] = Field(
        default_factory=list,
        description="Tópicos IPTC estándar (ej. 'politics/government'). "
                    "Etiquetado por XLM-RoBERTa multilingual.",
    )
    sentiment: dict[str, Any] = Field(
        default_factory=dict,
        description="{label: 'positivo'|'neutral'|'negativo', positivo: float, "
                    "negativo: float, neutral: float, score: float, backend: str}. "
                    "Producido por pysentimiento (RoBERTuito ES finetuned) si esta "
                    "instalado, fallback a transformers cardiffnlp, fallback a lexicon.",
    )
    emotion: dict[str, Any] = Field(
        default_factory=dict,
        description="{label: 'joy'|'sadness'|'anger'|'fear'|'surprise'|'disgust'|'others', "
                    "probas: dict, backend: str}. Solo si pysentimiento esta instalado. "
                    "Vacio en otros backends.",
    )
    hate: dict[str, Any] = Field(
        default_factory=dict,
        description="{label, probas: {hateful, targeted, aggressive}, backend}. "
                    "Solo si pysentimiento esta instalado.",
    )
    irony: dict[str, Any] = Field(
        default_factory=dict,
        description="{label: 'ironic'|'not_ironic', probas, backend}. "
                    "Solo si pysentimiento esta instalado.",
    )
    keywords: list[str] = Field(
        default_factory=list,
        description="Keywords extraidas por YAKE! (sin modelo · estadistico).",
    )

    # NER · entidades detectadas (aún no ground en ontología)
    entities_extracted: list[ExtractedEntity] = Field(default_factory=list)
    links_extracted: list[ExtractedLink] = Field(default_factory=list)

    # Scoring estratégico Politeia (mantener StrategicRelevanceFilter)
    relevance_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Score 0-1 de relevancia estratégica (5 ejes ponderados).",
    )
    relevance_breakdown: dict[str, float] = Field(
        default_factory=dict,
        description="Desglose del score por eje (actor, territorio, sector, ...).",
    )

    # Topic modeling (BERTopic asignación)
    topic_id: int | None = None
    topic_label: str = ""

    # Embedding semántico (pgvector) · solo metadata, el vector va aparte
    embedding_model: str = Field(default="", description="Modelo usado · ej. 'jinaai/jina-embeddings-v3'")
    embedding_dim: int = Field(default=0, ge=0)

    # Trace de la fase
    enrichment_trace: list[str] = Field(
        default_factory=list,
        description="Pasos aplicados en orden (ej. ['iptc', 'pysentimiento', 'yake', 'bertopic']). "
                    "Permite auditar qué se hizo sobre cada ítem.",
    )


# ─────────────────────────────────────────────────────────────────
# OntologyMapper · output (operaciones a ejecutar sobre la BD)
# ─────────────────────────────────────────────────────────────────

class EntityUpsertOp(BaseModel):
    """Operación de upsert sobre `entities`.

    Si existe (`kind`, `slug`) o (`qid`), update parcial. Si no, insert.
    """
    model_config = ConfigDict(extra="forbid")

    kind: str = Field(description="EntityKind válido (validado en mapper)")
    slug: str = Field(min_length=2, max_length=120)
    display_name: str = Field(min_length=1, max_length=240)
    qid: str | None = None
    aliases: list[str] = Field(default_factory=list)
    payload: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    source: str = Field(default="ingesta", max_length=60)
    valid_from: datetime | None = None
    valid_to: datetime | None = None


class EntityLinkOp(BaseModel):
    """Operación de inserción de un EntityLink.

    Las entidades se referencian por slug (no por id, porque la id
    todavía no existe en el momento del map para entidades nuevas).
    El runner del mapper resuelve slug→id tras los upserts.
    """
    model_config = ConfigDict(extra="forbid")

    source_kind: str
    source_slug: str
    target_kind: str
    target_slug: str | None = None
    target_qid: str | None = None  # Alternativa si conocemos QID pero no slug
    link_kind: str = Field(description="LinkKind válido")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_doc_id: str = Field(default="", description="item_id del NormalizedItem fuente")
    evidence_url: str = Field(default="")
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class OntologyMapResult(BaseModel):
    """Resultado completo del OntologyMapper sobre un EnrichedItem."""
    model_config = ConfigDict(extra="forbid")

    item_id: str = Field(description="item_id del NormalizedItem fuente")
    source: SourceKind

    entity_ops: list[EntityUpsertOp] = Field(default_factory=list)
    link_ops: list[EntityLinkOp] = Field(default_factory=list)

    # Estadísticas para audit
    total_entities_extracted: int = 0
    total_entities_mapped: int = 0
    total_links_extracted: int = 0
    total_links_mapped: int = 0
    skipped_entities: list[str] = Field(
        default_factory=list,
        description="Entidades que no pudieron mapearse (kind inválido, sin slug, etc).",
    )
    skipped_links: list[str] = Field(default_factory=list)

    mapper_version: str = Field(
        default="v1",
        description="Versión del OntologyMapper que produjo este resultado.",
    )
