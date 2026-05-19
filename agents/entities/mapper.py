"""OntologyMapper · cierra el ciclo del pipeline de ingesta.

> **Pilar Ingesta · Sprint 3** (`docs/INGESTA_PROPUESTA.md §5`)

**Posición en el pipeline:**

    Connector → NormalizedItem → Enrichment (NLP) → EnrichedItem
                                                       │
                                                       ▼
                                              ╔═══════════════════╗
                                              ║  OntologyMapper   ║ ← este módulo
                                              ╚═══════╤═══════════╝
                                                      │
                                          ┌───────────┴───────────┐
                                          ▼                       ▼
                                  EntityUpsertOp[]         EntityLinkOp[]
                                          │                       │
                                          ▼                       ▼
                                   tabla entities         tabla entity_links

**Por qué existe:**

Antes (auditoría · `docs/INGESTA_AUDIT.md §6`):
  - Tres ontologías paralelas (`persona_publica`/`organizacion`,
    `entities_canonical`, `entities` nueva).
  - Ninguno de los 3 pipelines escribía en la `entities` nueva.
  - Cada conector inventaba su propia normalización ad-hoc.

Después:
  - **Toda fuente que entra acaba ground sobre `entities` + `entity_links`**.
  - Las entidades extraídas (NER/LLM) se canonicalizan a `(kind, slug)` o
    `(qid)` antes de tocar la BD.
  - Operaciones idempotentes: el mismo NormalizedItem ejecutado N veces
    produce el mismo estado en BD.
  - Audit trail en `analyst_events` (verbo `entity_upserted`/`link_added`).

**Filosofía:**

1. **Determinista cuando se puede**: si una entidad ya tiene QID o slug
   conocido, no se llama al LLM, se resuelve directamente.
2. **LLM solo para extracción ambigua** (texto libre → entidades nuevas).
   Reflection loop al estilo OneKE para validar contra el schema LinkML.
3. **Falla cerrado**: si una entidad extraída no se puede ground a un kind
   válido de la ontología, se descarta con audit log — NO se inventa una
   categoría nueva.
4. **Trace completo**: cada `OntologyMapResult` lleva contadores y skipped
   lists para auditoría.

**Cómo usarlo:**

```python
from agents.entities.mapper import OntologyMapper
from packages.types import EnrichedItem

mapper = OntologyMapper()
result = mapper.map_item(enriched_item)
mapper.persist(result)   # opcional · se puede separar map/persist para batching
```
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Iterable

from agents.entities.repository import EntityRepository, get_entity_repository
from agents.entities.resolver import slugify
from agents.entities.schemas import (
    EntityCreate,
    EntityLinkCreate,
    EntityKind,
    LinkKind,
)
from packages.types import (
    EnrichedItem,
    EntityLinkOp,
    EntityUpsertOp,
    ExtractedEntity,
    ExtractedLink,
    OntologyMapResult,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Validación de kinds · sólo aceptamos los del schema LinkML v1
# ─────────────────────────────────────────────────────────────────

VALID_ENTITY_KINDS: frozenset[str] = frozenset({
    "actor_person", "actor_org", "institution", "party", "government",
    "law", "event", "territory", "media", "document", "sector",
    "narrative", "theme",
})
"""Sincronizado con `EntityKind` en `agents/entities/schemas.py`
y `politeia_v1.yaml`."""

VALID_LINK_KINDS: frozenset[str] = frozenset({
    "member_of", "leads", "president_of", "minister_of", "succeeds",
    "proposes", "votes_for", "votes_against", "abstains_on", "regulates",
    "located_in", "covers",
    "participated_in", "caused", "responded_to",
    "allied_with", "rival_of", "coalition_with", "criticizes", "supports",
    "mentions", "frames", "attacks", "promotes",
    "issued_by", "cites",
})
"""Sincronizado con `LinkKind`."""


# ─────────────────────────────────────────────────────────────────
# Heurísticas de kind · normalización flexible de salidas LLM
# ─────────────────────────────────────────────────────────────────

# Alias que los modelos LLM/NER tienden a producir → kind canónico
_KIND_ALIASES: dict[str, str] = {
    # NER spaCy es_core_news
    "per":         "actor_person",
    "person":      "actor_person",
    "persona":     "actor_person",
    "loc":         "territory",
    "location":    "territory",
    "gpe":         "territory",
    "org":         "actor_org",
    "organization": "actor_org",
    "organizacion": "actor_org",
    # Variantes politicas
    "politician":  "actor_person",
    "político":    "actor_person",
    "politico":    "actor_person",
    "company":     "actor_org",
    "empresa":     "actor_org",
    # Leyes
    "norma":       "law",
    "regulation":  "law",
    "decree":      "law",
    "real_decreto": "law",
    # Eventos
    "evento":      "event",
    # Documentos
    "doc":         "document",
    "contract":    "document",
    "sentence":    "document",
}


def _canonical_kind(raw: str) -> str | None:
    """Devuelve EntityKind válido a partir de cualquier alias razonable.

    None si no se puede resolver → la entidad se descarta con audit log.
    """
    if not raw:
        return None
    k = raw.lower().strip().replace(" ", "_").replace("-", "_")
    if k in VALID_ENTITY_KINDS:
        return k
    return _KIND_ALIASES.get(k)


def _canonical_link_kind(raw: str) -> str | None:
    """Devuelve LinkKind válido o None."""
    if not raw:
        return None
    k = raw.lower().strip().replace(" ", "_").replace("-", "_")
    if k in VALID_LINK_KINDS:
        return k
    # Aliases comunes
    aliases = {
        "miembro_de":      "member_of",
        "lidera":          "leads",
        "presidente":      "president_of",
        "ministro":        "minister_of",
        "vota_a_favor":    "votes_for",
        "vota_en_contra":  "votes_against",
        "menciona":        "mentions",
        "critica":         "criticizes",
        "apoya":           "supports",
        "aliado":          "allied_with",
        "rival":           "rival_of",
        "emitido_por":     "issued_by",
        "ubicado_en":      "located_in",
        "cubre":           "covers",
        "propone":         "proposes",
        "regula":          "regulates",
    }
    return aliases.get(k)


# ─────────────────────────────────────────────────────────────────
# OntologyMapper
# ─────────────────────────────────────────────────────────────────

class OntologyMapper:
    """Convierte EnrichedItem → operaciones sobre `entities` + `entity_links`.

    Estado: sin estado mutable (es seguro instanciar uno por request o
    reutilizar una instancia global).
    """

    VERSION = "v1"

    def __init__(self, repository: EntityRepository | None = None) -> None:
        self._repo = repository  # lazy · solo se usa en persist()

    # ── Map (puro · sin BD) ───────────────────────────────────────

    def map_item(self, item: EnrichedItem) -> OntologyMapResult:
        """Convierte un EnrichedItem en operaciones (sin tocar BD).

        Idempotente · puro · testeable sin engine.
        """
        result = OntologyMapResult(
            item_id=item.item_id,
            source=item.source,
            mapper_version=self.VERSION,
        )

        # 1) Crear la entity DOCUMENT del propio item (siempre)
        doc_op = self._build_document_op(item)
        if doc_op:
            result.entity_ops.append(doc_op)

        # 2) Mapear cada ExtractedEntity → EntityUpsertOp
        index_to_slug: dict[int, tuple[str, str]] = {}  # idx → (kind, slug)
        for idx, ext in enumerate(item.entities_extracted):
            result.total_entities_extracted += 1
            op = self._build_entity_op(ext, item)
            if op is None:
                result.skipped_entities.append(
                    f"#{idx} kind_invalid={ext.kind!r} name={ext.display_name!r}"
                )
                continue
            result.entity_ops.append(op)
            index_to_slug[idx] = (op.kind, op.slug)
            result.total_entities_mapped += 1

        # 3) Mapear cada ExtractedLink → EntityLinkOp
        for lnk in item.links_extracted:
            result.total_links_extracted += 1
            op = self._build_link_op(lnk, index_to_slug, item)
            if op is None:
                result.skipped_links.append(
                    f"src={lnk.source_idx} dst={lnk.target_idx} kind={lnk.kind!r}"
                )
                continue
            result.link_ops.append(op)
            result.total_links_mapped += 1

        # 4) Link implícito · document mentions entity (siempre que doc_op existe)
        if doc_op:
            for (kind, slug) in index_to_slug.values():
                result.link_ops.append(EntityLinkOp(
                    source_kind="document",
                    source_slug=doc_op.slug,
                    target_kind=kind,
                    target_slug=slug,
                    link_kind="mentions",
                    confidence=0.9,
                    evidence_doc_id=item.item_id,
                    evidence_url=str(item.url) if item.url else "",
                ))
                result.total_links_mapped += 1

        return result

    # ── Construcción de ops ───────────────────────────────────────

    def _build_document_op(self, item: EnrichedItem) -> EntityUpsertOp | None:
        """Cada NormalizedItem se materializa como una entity de kind=document
        para que el grafo tenga el nodo fuente y los `mentions` puedan
        anclarse a algo persistente.
        """
        doc_slug = f"{item.source}-{slugify(item.item_id)[:100]}"
        return EntityUpsertOp(
            kind="document",
            slug=doc_slug,
            display_name=item.title[:240] or item.item_id,
            payload={
                "source": item.source,
                "url": str(item.url) if item.url else "",
                "published_at": item.published_at.isoformat(),
                "iptc_topics": item.iptc_topics,
                "sentiment_label": (item.sentiment or {}).get("label", ""),
                "relevance_score": item.relevance_score,
                "topic_label": item.topic_label,
                "categories": item.categories,
                "raw_hash": item.raw_hash,
            },
            tags=item.iptc_topics + item.keywords[:5],
            confidence=1.0,
            source=f"ingesta:{item.source}",
            valid_from=item.published_at,
        )

    def _build_entity_op(
        self,
        ext: ExtractedEntity,
        item: EnrichedItem,
    ) -> EntityUpsertOp | None:
        """Convierte ExtractedEntity → EntityUpsertOp, con kind canonicalizado.

        Devuelve None si el kind no resuelve a un EntityKind válido.
        """
        canonical = _canonical_kind(ext.kind)
        if canonical is None:
            return None
        if not ext.display_name or not ext.display_name.strip():
            return None

        slug = slugify(ext.display_name)
        if not slug:
            return None

        return EntityUpsertOp(
            kind=canonical,
            slug=slug,
            display_name=ext.display_name.strip()[:240],
            qid=ext.qid,
            aliases=ext.aliases or [],
            payload={
                **ext.payload,
                "extracted_from": item.item_id,
                "extracted_from_source": item.source,
                "extraction_confidence": ext.confidence,
            },
            tags=[],
            confidence=ext.confidence,
            source=f"ingesta:{item.source}",
            valid_from=item.published_at,
        )

    def _build_link_op(
        self,
        lnk: ExtractedLink,
        index_to_slug: dict[int, tuple[str, str]],
        item: EnrichedItem,
    ) -> EntityLinkOp | None:
        """Convierte ExtractedLink → EntityLinkOp · None si no resuelve."""
        canonical = _canonical_link_kind(lnk.kind)
        if canonical is None:
            return None

        src = index_to_slug.get(lnk.source_idx)
        dst = index_to_slug.get(lnk.target_idx)
        if src is None or dst is None:
            return None  # alguna entidad referenciada fue descartada

        src_kind, src_slug = src
        dst_kind, dst_slug = dst

        return EntityLinkOp(
            source_kind=src_kind,
            source_slug=src_slug,
            target_kind=dst_kind,
            target_slug=dst_slug,
            link_kind=canonical,
            confidence=lnk.confidence,
            evidence_doc_id=item.item_id,
            evidence_url=str(item.url) if item.url else "",
            valid_from=item.published_at,
            payload={"snippet": lnk.evidence_snippet[:600]} if lnk.evidence_snippet else {},
        )

    # ── Persist (efectos · usa repository) ────────────────────────

    def persist(self, result: OntologyMapResult) -> dict[str, int]:
        """Aplica las ops a BD via EntityRepository.

        Devuelve resumen `{entities_upserted, links_added, errors}`.
        Idempotente: el repo hace UPSERT por (kind, slug) para entities y
        evita duplicados por (src, dst, link_kind, valid_from) para links.
        """
        repo = self._repo or get_entity_repository()
        summary = {"entities_upserted": 0, "links_added": 0, "errors": 0}

        if repo is None:
            logger.warning("OntologyMapper.persist · sin engine, skipping")
            return summary

        # 1) Upsert entities (resolvemos slug→id mientras)
        slug_to_id: dict[tuple[str, str], int] = {}
        for op in result.entity_ops:
            try:
                ent = repo.upsert(EntityCreate(
                    kind=op.kind,  # type: ignore[arg-type]
                    slug=op.slug,
                    qid=op.qid,
                    display_name=op.display_name,
                    aliases=op.aliases,
                    payload=op.payload,
                    tags=op.tags,
                    confidence=op.confidence,
                    source=op.source,
                    valid_from=op.valid_from,
                    valid_to=op.valid_to,
                ))
                if ent and ent.id:
                    slug_to_id[(op.kind, op.slug)] = ent.id
                    summary["entities_upserted"] += 1
            except Exception as exc:
                logger.error(
                    "OntologyMapper.persist · entity upsert fallo "
                    "kind=%s slug=%s: %s", op.kind, op.slug, exc,
                )
                summary["errors"] += 1

        # 2) Add links (resolviendo slug→id; saltamos si alguno no se conoce)
        for op in result.link_ops:
            src_id = slug_to_id.get((op.source_kind, op.source_slug))
            dst_id = slug_to_id.get((op.target_kind, op.target_slug)) if op.target_slug else None

            # Fallback · si la entidad ya estaba en BD de antes del map,
            # buscamos por (kind, slug) o por qid
            if src_id is None:
                ent = repo.get_by_kind_slug(op.source_kind, op.source_slug)
                if ent:
                    src_id = ent.id
            if dst_id is None and op.target_slug:
                ent = repo.get_by_kind_slug(op.target_kind, op.target_slug)
                if ent:
                    dst_id = ent.id
            if dst_id is None and op.target_qid:
                ent = repo.get_by_qid(op.target_qid)
                if ent:
                    dst_id = ent.id

            if src_id is None or dst_id is None:
                summary["errors"] += 1
                continue

            try:
                repo.add_link(EntityLinkCreate(
                    src_id=src_id,
                    dst_id=dst_id,
                    link_kind=op.link_kind,  # type: ignore[arg-type]
                    confidence=op.confidence,
                    evidence_url=op.evidence_url or None,
                    payload=op.payload,
                    valid_from=op.valid_from,
                    valid_to=op.valid_to,
                ))
                summary["links_added"] += 1
            except Exception as exc:
                logger.error(
                    "OntologyMapper.persist · link add fallo "
                    "%s→%s kind=%s: %s",
                    op.source_slug, op.target_slug, op.link_kind, exc,
                )
                summary["errors"] += 1

        return summary

    # ── Bulk · pipeline real ──────────────────────────────────────

    def map_and_persist(
        self,
        items: Iterable[EnrichedItem],
    ) -> dict[str, int]:
        """Pipeline completo · map + persist + métricas agregadas.

        Es lo que se llama desde el step ETL final.
        """
        totals = {"items": 0, "entities_upserted": 0, "links_added": 0, "errors": 0}
        for item in items:
            result = self.map_item(item)
            s = self.persist(result)
            totals["items"] += 1
            totals["entities_upserted"] += s["entities_upserted"]
            totals["links_added"] += s["links_added"]
            totals["errors"] += s["errors"]
        return totals


# ─────────────────────────────────────────────────────────────────
# Singleton de conveniencia
# ─────────────────────────────────────────────────────────────────

_DEFAULT: OntologyMapper | None = None


def get_ontology_mapper() -> OntologyMapper:
    global _DEFAULT
    if _DEFAULT is None:
        _DEFAULT = OntologyMapper()
    return _DEFAULT
