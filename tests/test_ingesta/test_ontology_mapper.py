"""Tests del OntologyMapper · P-INGESTA Sprint 3.

Tests puros (sin BD) que validan que `map_item` produce las ops correctas
a partir de un EnrichedItem. La parte `persist` se testea aparte con un
mock de EntityRepository.
"""
from __future__ import annotations

from datetime import datetime

import pytest

from agents.entities.mapper import (
    OntologyMapper,
    VALID_ENTITY_KINDS,
    VALID_LINK_KINDS,
    _canonical_kind,
    _canonical_link_kind,
)
from packages.types import (
    EnrichedItem,
    ExtractedEntity,
    ExtractedLink,
)


# ── Canonicalización de kinds ─────────────────────────────────────

def test_canonical_kind_passthrough():
    """Kinds válidos pasan tal cual."""
    for k in VALID_ENTITY_KINDS:
        assert _canonical_kind(k) == k


def test_canonical_kind_aliases():
    """Aliases comunes (NER spaCy + LLM) se normalizan."""
    cases = {
        "PER": "actor_person",
        "Person": "actor_person",
        "persona": "actor_person",
        "ORG": "actor_org",
        "Organization": "actor_org",
        "LOC": "territory",
        "GPE": "territory",
        "empresa": "actor_org",
        "real-decreto": "law",
        "real_decreto": "law",
    }
    for raw, expected in cases.items():
        assert _canonical_kind(raw) == expected, f"{raw} → {expected}"


def test_canonical_kind_invalid_returns_none():
    """Kinds desconocidos → None (entidad se descarta)."""
    assert _canonical_kind("PRODUCT") is None
    assert _canonical_kind("xyz") is None
    assert _canonical_kind("") is None
    assert _canonical_kind("   ") is None


def test_canonical_link_kind():
    """Link kinds: passthrough válidos + aliases ES."""
    for k in VALID_LINK_KINDS:
        assert _canonical_link_kind(k) == k
    assert _canonical_link_kind("miembro_de") == "member_of"
    assert _canonical_link_kind("vota_a_favor") == "votes_for"
    assert _canonical_link_kind("critica") == "criticizes"
    assert _canonical_link_kind("inventado") is None


# ── map_item (puro) ───────────────────────────────────────────────

@pytest.fixture
def mapper():
    return OntologyMapper()


@pytest.fixture
def basic_item():
    return EnrichedItem(
        source="boe",
        item_id="BOE-A-2026-12345",
        title="Real Decreto 234/2026 · prestaciones por desempleo",
        body="El Ministerio de Trabajo aprueba...",
        published_at=datetime(2026, 5, 19),
        url="https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-12345",
        iptc_topics=["politics/government"],
        sentiment={"label": "neutral", "score": 0.9},
        keywords=["desempleo", "prestaciones", "Trabajo"],
        relevance_score=0.8,
    )


def test_map_item_creates_document_entity(mapper, basic_item):
    """Cada item se materializa como una entity de kind=document."""
    result = mapper.map_item(basic_item)
    docs = [op for op in result.entity_ops if op.kind == "document"]
    assert len(docs) == 1
    doc = docs[0]
    assert doc.slug.startswith("boe-")
    assert "Real Decreto" in doc.display_name
    assert doc.payload["source"] == "boe"
    assert "politics/government" in doc.tags


def test_map_item_extracted_entities_become_ops(mapper):
    """ExtractedEntity con kind válido → EntityUpsertOp."""
    item = EnrichedItem(
        source="rss",
        item_id="art-99",
        title="Pedro Sánchez visita Cataluña",
        published_at=datetime(2026, 5, 19),
        entities_extracted=[
            ExtractedEntity(kind="person", display_name="Pedro Sánchez", qid="Q1112"),
            ExtractedEntity(kind="GPE", display_name="Cataluña"),
            ExtractedEntity(kind="PRODUCT", display_name="iPhone"),  # ← debe descartarse
        ],
    )
    result = mapper.map_item(item)
    # Esperamos 1 document + 2 entities válidas (Sánchez y Cataluña)
    assert result.total_entities_extracted == 3
    assert result.total_entities_mapped == 2
    assert len(result.skipped_entities) == 1
    assert "iPhone" in result.skipped_entities[0]

    # Comprobar kinds canónicos
    kinds = {op.kind for op in result.entity_ops if op.kind != "document"}
    assert kinds == {"actor_person", "territory"}

    # QID preservado
    sanchez = next(op for op in result.entity_ops if op.slug == "pedro-sanchez")
    assert sanchez.qid == "Q1112"


def test_map_item_links_resolved(mapper):
    """ExtractedLink se resuelve a EntityLinkOp con kinds y slugs canónicos."""
    item = EnrichedItem(
        source="rss",
        item_id="art-100",
        title="Test",
        published_at=datetime.utcnow(),
        entities_extracted=[
            ExtractedEntity(kind="person", display_name="Pedro Sánchez"),
            ExtractedEntity(kind="party", display_name="PSOE"),
        ],
        links_extracted=[
            ExtractedLink(source_idx=0, target_idx=1, kind="miembro_de"),
        ],
    )
    result = mapper.map_item(item)
    # Buscamos el link entre Pedro Sánchez y PSOE
    user_links = [
        l for l in result.link_ops
        if l.source_slug == "pedro-sanchez" and l.target_slug == "psoe"
    ]
    assert len(user_links) == 1
    assert user_links[0].link_kind == "member_of"  # canonicalizado del alias ES


def test_map_item_link_invalid_kind_skipped(mapper):
    """Link con kind desconocido se descarta sin tumbar el resto."""
    item = EnrichedItem(
        source="rss", item_id="x", title="t",
        published_at=datetime.utcnow(),
        entities_extracted=[
            ExtractedEntity(kind="person", display_name="Alpha Persona"),
            ExtractedEntity(kind="person", display_name="Beta Persona"),
        ],
        links_extracted=[
            ExtractedLink(source_idx=0, target_idx=1, kind="hace_amistad_con"),
        ],
    )
    result = mapper.map_item(item)
    # No hay link entre las dos personas (skipped por kind inválido)
    assert all(
        not (l.source_slug == "alpha-persona" and l.target_slug == "beta-persona")
        for l in result.link_ops
    )
    assert any("hace_amistad_con" in s for s in result.skipped_links)


def test_map_item_link_to_skipped_entity_also_skipped(mapper):
    """Si una entidad referenciada por un link fue descartada (kind inválido),
    el link también se descarta — no se inventan IDs."""
    item = EnrichedItem(
        source="rss", item_id="x", title="t",
        published_at=datetime.utcnow(),
        entities_extracted=[
            ExtractedEntity(kind="person", display_name="Alpha Persona"),
            ExtractedEntity(kind="PRODUCT", display_name="ProductoY"),  # ← se descarta
        ],
        links_extracted=[
            ExtractedLink(source_idx=0, target_idx=1, kind="member_of"),
        ],
    )
    result = mapper.map_item(item)
    # El link Alpha → ProductoY no debe existir
    bad = [l for l in result.link_ops if "productoy" in (l.target_slug or "")]
    assert bad == []


def test_map_item_implicit_mentions_link(mapper):
    """Cada entidad extraída genera un link implícito document→entity (mentions)."""
    item = EnrichedItem(
        source="rss",
        item_id="art-200",
        title="Test",
        published_at=datetime.utcnow(),
        entities_extracted=[
            ExtractedEntity(kind="person", display_name="Pedro García"),
            ExtractedEntity(kind="party", display_name="Partido Demo"),
        ],
    )
    result = mapper.map_item(item)
    # 2 links implícitos · document → Pedro García, document → Partido Demo
    mentions = [l for l in result.link_ops if l.link_kind == "mentions"]
    assert len(mentions) == 2
    assert {l.target_slug for l in mentions} == {"pedro-garcia", "partido-demo"}


def test_map_item_empty_extraction_only_produces_document(mapper, basic_item):
    """Item sin entidades extraídas solo genera el document op."""
    result = mapper.map_item(basic_item)  # basic_item no tiene entities_extracted
    assert len([op for op in result.entity_ops if op.kind != "document"]) == 0
    assert result.total_entities_extracted == 0
    assert result.total_entities_mapped == 0
    assert len(result.link_ops) == 0


# ── Idempotencia ──────────────────────────────────────────────────

def test_map_item_idempotent(mapper, basic_item):
    """Mismo input → misma estructura de output (ordenamiento estable)."""
    r1 = mapper.map_item(basic_item)
    r2 = mapper.map_item(basic_item)
    assert len(r1.entity_ops) == len(r2.entity_ops)
    assert [op.slug for op in r1.entity_ops] == [op.slug for op in r2.entity_ops]
    assert r1.mapper_version == r2.mapper_version == "v1"


# ── Edge cases · entidades raras ───────────────────────────────────

def test_map_item_empty_display_name_skipped(mapper):
    item = EnrichedItem(
        source="rss", item_id="x", title="t",
        published_at=datetime.utcnow(),
        entities_extracted=[
            ExtractedEntity(kind="person", display_name="   "),  # whitespace
        ],
    )
    result = mapper.map_item(item)
    # No produce entity_op para nombre vacío (excepto el document)
    non_doc = [op for op in result.entity_ops if op.kind != "document"]
    assert non_doc == []


def test_map_item_display_name_max_240(mapper):
    """ExtractedEntity ya rechaza >240 en validación · max permitido = 240."""
    near_max = "A" * 240
    item = EnrichedItem(
        source="rss", item_id="x", title="t",
        published_at=datetime.utcnow(),
        entities_extracted=[
            ExtractedEntity(kind="person", display_name=near_max),
        ],
    )
    result = mapper.map_item(item)
    non_doc = [op for op in result.entity_ops if op.kind != "document"]
    assert len(non_doc) == 1
    assert len(non_doc[0].display_name) == 240
