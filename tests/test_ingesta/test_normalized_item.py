"""Tests del contrato NormalizedItem · P-INGESTA Sprint 1.

Valida que el contrato Pydantic falla rápido en violaciones (extra='forbid',
tipos estrictos, validación de formato) — esto es el "guardrail" del
pipeline contra conectores mal formados.
"""
from __future__ import annotations

from datetime import datetime

import pytest
from pydantic import ValidationError

from packages.types import (
    NormalizedItem,
    EnrichedItem,
    ExtractedEntity,
    ExtractedLink,
    EntityUpsertOp,
    EntityLinkOp,
    OntologyMapResult,
)


# ── Construcción válida ───────────────────────────────────────────

def test_normalized_item_minimal_valid():
    """Caso mínimo · solo campos obligatorios."""
    item = NormalizedItem(
        source="boe",
        item_id="BOE-A-2026-12345",
        title="Real Decreto 234/2026",
        published_at=datetime(2026, 5, 19),
    )
    assert item.source == "boe"
    assert item.body == ""           # default vacío
    assert item.language == "es"     # default
    assert item.payload == {}         # default
    assert item.ingested_at is not None  # auto-set


def test_normalized_item_full_valid():
    """Caso completo con todos los campos opcionales."""
    item = NormalizedItem(
        source="placsp",
        item_id="2026/MIN-INF-001",
        title="Concurso conservación A-2",
        body="Descripción del contrato...",
        summary="Resumen breve",
        url="https://contrataciondelestado.es/wps/portal/expediente?id=12345",
        canonical_url="https://contrataciondelestado.es/expediente/12345",
        pdf_url="https://contrataciondelestado.es/pliego.pdf",
        published_at=datetime(2026, 5, 19, 10, 30),
        author="Ministerio de Transportes",
        language="es",
        raw_hash="abc123",
        categories=["Conservación", "Carreteras"],
        payload={"importe": 84.4, "tipo": "abierto"},
    )
    assert item.payload["importe"] == 84.4
    assert "Conservación" in item.categories


# ── Strict validation · extra='forbid' ────────────────────────────

def test_normalized_item_extra_field_forbidden():
    """Campo no contemplado debe fallar la validación."""
    with pytest.raises(ValidationError) as exc_info:
        NormalizedItem(
            source="boe",
            item_id="BOE-A-2026-1",
            title="Test",
            published_at=datetime(2026, 5, 19),
            inventado="campo no en el schema",  # ← debe fallar
        )
    errors = exc_info.value.errors()
    assert any(e.get("type") == "extra_forbidden" for e in errors)


def test_normalized_item_invalid_source_kind():
    """source debe ser uno del catálogo cerrado SourceKind."""
    with pytest.raises(ValidationError):
        NormalizedItem(
            source="fuente_imaginaria",  # ← no en SourceKind
            item_id="x",
            title="Test",
            published_at=datetime.utcnow(),
        )


def test_normalized_item_invalid_language():
    """language debe ser ISO 639-1 (es, en) o con región (es-ES, pt-BR)."""
    with pytest.raises(ValidationError):
        NormalizedItem(
            source="boe",
            item_id="x",
            title="t",
            published_at=datetime.utcnow(),
            language="ESPAÑOL",  # ← no match al pattern
        )


def test_normalized_item_item_id_no_whitespace_control():
    """item_id no permite \\n / \\r / \\t para evitar problemas downstream."""
    with pytest.raises(ValidationError):
        NormalizedItem(
            source="boe",
            item_id="bad\nid",
            title="Test",
            published_at=datetime.utcnow(),
        )


def test_normalized_item_title_required():
    """title obligatorio y no vacío."""
    with pytest.raises(ValidationError):
        NormalizedItem(
            source="boe",
            item_id="x",
            title="",  # ← vacío
            published_at=datetime.utcnow(),
        )


# ── EnrichedItem hereda y añade ───────────────────────────────────

def test_enriched_item_inherits_normalized():
    enriched = EnrichedItem(
        source="rss",
        item_id="art-123",
        title="Sánchez anuncia plan vivienda",
        body="Texto del artículo...",
        published_at=datetime(2026, 5, 19),
        iptc_topics=["politics/government"],
        sentiment={"label": "neutral", "score": 0.8},
        keywords=["vivienda", "Sánchez", "plan"],
        relevance_score=0.78,
        relevance_breakdown={"actor": 0.9, "sector": 0.6},
        enrichment_trace=["iptc", "pysentimiento", "yake"],
    )
    assert enriched.relevance_score == 0.78
    assert "iptc" in enriched.enrichment_trace
    # Sigue siendo extra=forbid
    with pytest.raises(ValidationError):
        EnrichedItem(
            source="rss", item_id="x", title="t",
            published_at=datetime.utcnow(),
            campo_inventado="x",
        )


def test_enriched_item_relevance_score_bounds():
    """relevance_score ∈ [0, 1]."""
    with pytest.raises(ValidationError):
        EnrichedItem(
            source="rss", item_id="x", title="t",
            published_at=datetime.utcnow(),
            relevance_score=1.5,  # ← fuera de rango
        )


# ── ExtractedEntity / ExtractedLink ──────────────────────────────

def test_extracted_entity_minimal():
    ee = ExtractedEntity(
        kind="person",
        display_name="Pedro Sánchez",
    )
    assert ee.confidence == 1.0  # default
    assert ee.aliases == []


def test_extracted_link_indices_non_negative():
    with pytest.raises(ValidationError):
        ExtractedLink(
            source_idx=-1,  # ← negativo
            target_idx=0,
            kind="member_of",
        )


# ── EntityUpsertOp / EntityLinkOp ─────────────────────────────────

def test_entity_upsert_op_valid():
    op = EntityUpsertOp(
        kind="actor_person",
        slug="pedro-sanchez",
        display_name="Pedro Sánchez",
        qid="Q1112",
    )
    assert op.kind == "actor_person"
    assert op.confidence == 1.0


def test_entity_link_op_target_can_be_slug_or_qid():
    """target puede venir por slug, por qid o ambos."""
    op1 = EntityLinkOp(
        source_kind="actor_person",
        source_slug="pedro-sanchez",
        target_kind="party",
        target_slug="psoe",
        link_kind="member_of",
    )
    assert op1.target_qid is None

    op2 = EntityLinkOp(
        source_kind="actor_person",
        source_slug="x",
        target_kind="actor_org",
        target_qid="Q42302",
        link_kind="leads",
    )
    assert op2.target_slug is None


# ── OntologyMapResult ─────────────────────────────────────────────

def test_ontology_map_result_defaults():
    r = OntologyMapResult(item_id="BOE-1", source="boe")
    assert r.entity_ops == []
    assert r.link_ops == []
    assert r.total_entities_extracted == 0
    assert r.mapper_version == "v1"
    assert r.skipped_entities == []
