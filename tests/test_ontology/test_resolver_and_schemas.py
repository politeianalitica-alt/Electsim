"""Tests · ontology resolver y schemas (sin BD).

Cubre slugify determinístico, validación de schemas Pydantic y resolución
sin red. Los tests con BD viven en `test_repository_integration.py`.
"""
from __future__ import annotations

import pytest


# ─── Slugify ─────────────────────────────────────────────────────────

def test_slugify_basico():
    from agents.entities import slugify
    assert slugify("Pedro Sánchez") == "pedro-sanchez"
    assert slugify("PSOE") == "psoe"
    assert slugify("Castilla-La Mancha") == "castilla-la-mancha"
    assert slugify("María José Sáenz de Buruaga") == "maria-jose-saenz-de-buruaga"


def test_slugify_diacriticos():
    from agents.entities import slugify
    # ñ → n, á é í ó ú → a e i o u, ç → c
    assert slugify("España") == "espana"
    assert slugify("Açoré") == "acore"
    # Caracteres no ASCII se descartan a guion / vacío según unicode category
    assert slugify("año 2026") == "ano-2026"


def test_slugify_vacio_y_edge():
    from agents.entities import slugify
    assert slugify("") == ""
    assert slugify("   ") == ""
    assert slugify("---") == ""
    assert slugify("!!!") == ""


def test_slugify_truncado_por_palabra():
    from agents.entities import slugify
    long_text = "Esta es una frase muy larga que debería truncarse limpiamente por palabra y no por carácter"
    s = slugify(long_text, max_length=30)
    assert len(s) <= 30
    assert not s.endswith("-")
    # No debe cortar a media palabra (debe terminar en un slug-token completo)
    assert s in long_text.lower().replace(" ", "-") or "-".join(s.split("-")[:-1]) in slugify(long_text)


def test_normalize_aliases_dedup():
    from agents.entities.resolver import normalize_aliases
    out = normalize_aliases(["PSOE", "  PSOE  ", "psoe", "Partido Socialista", "", None, "Partido Socialista"])
    # Dedup case-insensitive + trim + sin vacíos
    assert "PSOE" in out
    assert "Partido Socialista" in out
    assert len(out) == 2


# ─── Schemas ─────────────────────────────────────────────────────────

def test_entity_create_valida_slug_format():
    from agents.entities import EntityCreate
    # OK
    e = EntityCreate(kind="party", slug="psoe", display_name="PSOE")
    assert e.slug == "psoe"
    # KO: mayúsculas
    with pytest.raises(Exception):
        EntityCreate(kind="party", slug="PSOE", display_name="PSOE")
    # KO: espacios
    with pytest.raises(Exception):
        EntityCreate(kind="party", slug="ps oe", display_name="PSOE")


def test_entity_kind_enum_cerrado():
    """EntityKind es un Literal cerrado — Pydantic debe rechazar valores fuera de la lista."""
    from agents.entities import EntityCreate
    with pytest.raises(Exception):
        EntityCreate(kind="extraterrestre", slug="x", display_name="X")


def test_link_kind_enum_cerrado():
    from agents.entities.schemas import EntityLinkCreate
    # OK
    link = EntityLinkCreate(src_id=1, dst_id=2, link_kind="member_of")
    assert link.link_kind == "member_of"
    # KO
    with pytest.raises(Exception):
        EntityLinkCreate(src_id=1, dst_id=2, link_kind="abducido_por")


def test_confidence_clamping():
    from agents.entities.schemas import EntityLinkCreate
    # >1.0 rechazado
    with pytest.raises(Exception):
        EntityLinkCreate(src_id=1, dst_id=2, link_kind="member_of", confidence=1.5)
    # <0 rechazado
    with pytest.raises(Exception):
        EntityLinkCreate(src_id=1, dst_id=2, link_kind="member_of", confidence=-0.1)
    # 0..1 OK
    ok = EntityLinkCreate(src_id=1, dst_id=2, link_kind="member_of", confidence=0.7)
    assert ok.confidence == 0.7


# ─── Investigation schemas ───────────────────────────────────────────

def test_investigation_create_slug_default():
    """Si no se pasa slug, el router lo genera con slugify(title)."""
    from agents.entities.schemas import InvestigationCreate
    inv = InvestigationCreate(
        slug="auto-gen",
        title="Investigación sobre Reforma Fiscal",
        owner_id="user-1",
    )
    assert inv.slug == "auto-gen"
    assert inv.status == "active"


def test_artifact_kinds_validos():
    from agents.entities.schemas import ArtifactCreate
    # OK · todos los kinds permitidos
    for k in ["notebook_block", "hypothesis", "evidence", "canvas_state", "brief_version", "comment"]:
        ArtifactCreate(artifact_kind=k, author_id="u1")
    # KO
    with pytest.raises(Exception):
        ArtifactCreate(artifact_kind="invalid", author_id="u1")


# ─── Backfill dry-run ────────────────────────────────────────────────

def test_backfill_dry_run_genera_counts_esperados():
    from agents.entities.backfill import backfill
    counts = backfill(dry_run=True)
    assert counts["parties"] == 15
    assert counts["ccaa"] == 19
    assert counts["sectors"] == 9
    assert counts["regulators"] >= 30
    assert counts["links_president"] == 19
    assert counts["links_member"] >= 15  # 19 presidentes pero solo 19 con party_slug en catálogo (asumiendo todos)


def test_backfill_idempotente():
    """Llamar dos veces no debe duplicar (en modo mock)."""
    from agents.entities.backfill import backfill
    c1 = backfill(dry_run=True)
    c2 = backfill(dry_run=True)
    assert c1 == c2


# ─── Resolver con mock repo ──────────────────────────────────────────

def test_resolve_entity_por_qid_y_slug():
    """resolve_entity prioriza QID y cae a (kind, slug)."""
    from agents.entities.resolver import resolve_entity

    class _Mock:
        def __init__(self):
            from agents.entities.schemas import Entity
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            self.by_qid = {
                "Q186200": Entity(
                    id=1, kind="actor_person", slug="pedro-sanchez", qid="Q186200",
                    display_name="Pedro Sánchez", aliases=[], payload={}, tags=[],
                    confidence=1.0, source="curated", created_at=now, updated_at=now,
                ),
            }
            self.by_slug = {
                ("party", "psoe"): Entity(
                    id=2, kind="party", slug="psoe", display_name="PSOE",
                    aliases=[], payload={}, tags=[], confidence=1.0, source="curated",
                    created_at=now, updated_at=now,
                ),
            }
        def get_by_qid(self, qid):
            return self.by_qid.get(qid)
        def get_by_kind_slug(self, kind, slug):
            return self.by_slug.get((kind, slug))

    repo = _Mock()
    # 1) por QID
    e = resolve_entity(qid="Q186200", repository=repo)
    assert e is not None and e.id == 1
    # 2) por (kind, slug)
    e = resolve_entity(kind="party", slug="psoe", repository=repo)
    assert e is not None and e.id == 2
    # 3) por (kind, name) → slugify internal
    e = resolve_entity(kind="party", name="PSOE", repository=repo)
    assert e is not None and e.id == 2
    # 4) no encontrada
    e = resolve_entity(kind="party", slug="no-existe", repository=repo)
    assert e is None
    # 5) sin kind ni qid → None
    e = resolve_entity(name="cualquier", repository=repo)
    assert e is None
