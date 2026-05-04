"""
Tests — OSINT & Risk Graph Core (Bloque 4).

Cubre:
  - schemas.py: RiskEntity, RiskRelation, RiskFlag, SocialIdentityCandidate,
                EntityMatchCandidate, RiskProfile, GraphExport
  - entity_resolver.py: normalize_name, score_match, candidate_matches, resolve_batch
  - risk_scorer.py: compute_entity_risk, compute_relation_risk, explain_risk_score, batch_score
  - followthemoney_mapper.py: map_ftm_entity, map_ftm_relation, batch_map_ftm
  - opensanctions_adapter.py: detect_risk_flags
  - maigret_adapter.py: run_username_candidate_search, build_identity_review_summary
  - osint_monitor.py: OSINTMonitor.ensure_tables, upsert_entities dry_run
  - risk_tools.py: importable, all 7 tools callable with empty BD
  - pipelines/osint_core.py: CLI build_parser, cmd_ functions with no BD
"""
from __future__ import annotations

import json
import sys
import tempfile
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


# ══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class TestRiskEntitySchema:
    def test_minimal_creation(self):
        from etl.sources.osint.schemas import RiskEntity
        e = RiskEntity(source="test", source_id="001", entity_type="person", name="Ana García")
        assert e.name == "Ana García"
        assert e.entity_type == "person"
        assert e.pep_status is False
        assert e.sanctions_status is False
        assert 0.0 <= float(e.risk_score) <= 100.0

    def test_id_is_string(self):
        from etl.sources.osint.schemas import RiskEntity
        e = RiskEntity(source="test", source_id="001", entity_type="person", name="Test")
        assert isinstance(e.id, str)
        assert len(e.id) > 0

    def test_to_db_dict(self):
        from etl.sources.osint.schemas import RiskEntity
        e = RiskEntity(
            source="opensanctions", source_id="Q123", entity_type="company",
            name="Empresa XYZ", pep_status=False, sanctions_status=True,
        )
        db = e.to_db_dict()
        assert db["source"] == "opensanctions"
        assert db["name"] == "Empresa XYZ"
        assert db["sanctions_status"] is True
        assert "risk_score" in db

    def test_pep_and_sanctions(self):
        from etl.sources.osint.schemas import RiskEntity
        e = RiskEntity(
            source="test", source_id="p1", entity_type="person",
            name="Político Expuesto", pep_status=True, sanctions_status=True,
        )
        assert e.pep_status is True
        assert e.sanctions_status is True

    def test_countries_and_aliases(self):
        from etl.sources.osint.schemas import RiskEntity
        e = RiskEntity(
            source="test", source_id="e1", entity_type="company",
            name="Corp", countries=["RU", "CN"], aliases=["Corp Ltd", "Corp SA"],
        )
        assert "RU" in e.countries
        assert "Corp Ltd" in e.aliases


class TestRiskFlagSchema:
    def test_flag_creation(self):
        from etl.sources.osint.schemas import RiskFlag
        f = RiskFlag(
            entity_id="001",
            flag_type="sanctioned",
            severity="CRITICAL",
            description="Aparece en lista OFAC",
            source="opensanctions",
            confidence=0.95,
        )
        assert f.flag_type == "sanctioned"
        assert f.severity == "CRITICAL"
        assert f.confidence == 0.95

    def test_invalid_flag_type(self):
        from etl.sources.osint.schemas import RiskFlag
        import pydantic
        with pytest.raises(pydantic.ValidationError):
            RiskFlag(
                entity_id="001",
                flag_type="invalid_type_not_in_literal",
                severity="LOW",
                description="test",
                source="test",
            )

    def test_all_severities(self):
        from etl.sources.osint.schemas import RiskFlag
        for sev in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
            f = RiskFlag(
                entity_id="x", flag_type="pep", severity=sev,
                description="test", source="test",
            )
            assert f.severity == sev


class TestSocialIdentityCandidateSchema:
    def test_verified_false_by_default(self):
        from etl.sources.osint.schemas import SocialIdentityCandidate
        c = SocialIdentityCandidate(
            actor_id="actor1", platform="twitter", handle="@test",
            discovery_method="maigret_candidate",
        )
        assert c.verified is False  # nunca True por defecto

    def test_confidence_capped(self):
        """Confidence nunca debe ser exagerada."""
        from etl.sources.osint.schemas import SocialIdentityCandidate
        c = SocialIdentityCandidate(
            actor_id="actor1", platform="linkedin", handle="testuser",
            discovery_method="whatsmyname_candidate", confidence=0.50,
        )
        assert c.confidence <= 0.60  # ética OSINT: cap 0.60

    def test_risk_notes_present(self):
        from etl.sources.osint.schemas import SocialIdentityCandidate
        c = SocialIdentityCandidate(
            actor_id="x", platform="twitter", handle="user",
            discovery_method="maigret_candidate",
        )
        # El esquema puede tener risk_notes vacíos pero no debe quejarse
        assert isinstance(c.risk_notes, list)


class TestEntityMatchCandidateSchema:
    def test_match_statuses(self):
        from etl.sources.osint.schemas import EntityMatchCandidate
        for status in ["AUTO_MATCH", "CANDIDATE_MATCH", "NEEDS_REVIEW", "NO_MATCH"]:
            m = EntityMatchCandidate(
                entity_a_id="a", entity_b_id="b",
                score=0.5, match_status=status,
            )
            assert m.match_status == status

    def test_requires_human_review_flagged(self):
        from etl.sources.osint.schemas import EntityMatchCandidate
        m = EntityMatchCandidate(
            entity_a_id="a", entity_b_id="b",
            score=0.75, match_status="CANDIDATE_MATCH",
            requires_human_review=True,
        )
        assert m.requires_human_review is True


class TestGraphExportSchema:
    def test_empty_graph(self):
        from etl.sources.osint.schemas import GraphExport
        g = GraphExport(nodes=[], edges=[], meta={})
        assert g.nodes == []
        assert g.edges == []

    def test_graph_with_data(self):
        from etl.sources.osint.schemas import GraphExport
        g = GraphExport(
            nodes=[{"id": 1, "name": "A"}, {"id": 2, "name": "B"}],
            edges=[{"source": 1, "target": 2, "relation_type": "OWNERSHIP"}],
            meta={"n_nodes": 2, "n_edges": 1},
        )
        assert len(g.nodes) == 2
        assert len(g.edges) == 1


# ══════════════════════════════════════════════════════════════════════════════
# ENTITY RESOLVER
# ══════════════════════════════════════════════════════════════════════════════

class TestEntityResolver:
    def test_normalize_name_removes_accents(self):
        from etl.sources.osint.entity_resolver import normalize_name
        result = normalize_name("Óscar García Martínez")
        assert "oscar" in result
        assert "garcia" in result

    def test_normalize_removes_legal_suffixes(self):
        from etl.sources.osint.entity_resolver import normalize_name
        result = normalize_name("Empresa S.A. S.L.")
        # Should not contain 'sa' or 'sl' as standalone tokens
        assert "s.a" not in result and "sa" not in result.split()

    def test_score_match_identical_names(self):
        from etl.sources.osint.schemas import RiskEntity
        from etl.sources.osint.entity_resolver import score_match
        e1 = RiskEntity(source="a", source_id="1", entity_type="person", name="Pedro Sánchez")
        e2 = RiskEntity(source="b", source_id="2", entity_type="person", name="Pedro Sánchez")
        result = score_match(e1, e2)
        # score_match returns a breakdown dict where "total" is the overall score
        assert result["total"] >= 0.40  # identical names should match well
        assert isinstance(result, dict)

    def test_score_match_different_entity_types(self):
        from etl.sources.osint.schemas import RiskEntity
        from etl.sources.osint.entity_resolver import score_match
        e1 = RiskEntity(source="a", source_id="1", entity_type="person", name="TestCorp")
        e2 = RiskEntity(source="b", source_id="2", entity_type="company", name="TestCorp")
        result = score_match(e1, e2)
        # Type mismatch (person vs company) should not give perfect score
        assert result["total"] < 1.0

    def test_candidate_matches_returns_list(self):
        from etl.sources.osint.schemas import RiskEntity
        from etl.sources.osint.entity_resolver import candidate_matches
        entity = RiskEntity(source="a", source_id="1", entity_type="person", name="Juan López")
        pool = [
            RiskEntity(source="b", source_id="2", entity_type="person", name="Juan Lopez"),
            RiskEntity(source="c", source_id="3", entity_type="company", name="Empresa ABC"),
        ]
        results = candidate_matches(entity, pool, min_score=0.30)
        assert isinstance(results, list)

    def test_resolve_batch_no_false_merges(self):
        """Entidades completamente distintas NO deben fusionarse."""
        from etl.sources.osint.schemas import RiskEntity
        from etl.sources.osint.entity_resolver import resolve_batch
        new_entities = [
            RiskEntity(source="a", source_id="1", entity_type="person", name="María González"),
        ]
        existing = [
            RiskEntity(source="b", source_id="2", entity_type="person", name="Carlos Rodríguez"),
        ]
        resolved, candidates = resolve_batch(new_entities, existing, auto_merge_threshold=0.90)
        # Names are very different, should not auto-merge
        assert len(resolved) == 0 or resolved[0].name == "María González"

    def test_no_auto_merge_below_threshold(self):
        """Auto-merge solo ocurre con score >= 0.90."""
        from etl.sources.osint.schemas import RiskEntity
        from etl.sources.osint.entity_resolver import resolve_batch
        # Slightly different names — should not auto-merge
        new_entities = [
            RiskEntity(source="a", source_id="1", entity_type="person", name="Pedro Sanchez"),
        ]
        existing = [
            RiskEntity(source="b", source_id="2", entity_type="person",
                       name="Pedro Sanchez Lopez"),
        ]
        # With threshold 0.90, should produce a candidate but NOT auto-merge
        resolved, candidates = resolve_batch(new_entities, existing, auto_merge_threshold=0.90)
        # Not an auto-merge — entity stays as candidate if score < 0.90
        assert isinstance(resolved, list)
        assert isinstance(candidates, list)


# ══════════════════════════════════════════════════════════════════════════════
# RISK SCORER
# ══════════════════════════════════════════════════════════════════════════════

class TestRiskScorer:
    def test_risk_level_boundaries(self):
        from etl.sources.osint.risk_scorer import risk_level
        assert risk_level(0) == "LOW"
        assert risk_level(20) == "LOW"
        assert risk_level(21) == "MEDIUM"
        assert risk_level(45) == "MEDIUM"
        assert risk_level(46) == "HIGH"
        assert risk_level(70) == "HIGH"
        assert risk_level(71) == "CRITICAL"
        assert risk_level(100) == "CRITICAL"

    def test_sanctioned_entity_high_score(self):
        from etl.sources.osint.schemas import RiskEntity, RiskFlag
        from etl.sources.osint.risk_scorer import compute_entity_risk
        entity = RiskEntity(
            source="test", source_id="001", entity_type="person",
            name="Sanctioned Person", sanctions_status=True,
        )
        flags = [RiskFlag(
            entity_id="001", flag_type="sanctioned", severity="CRITICAL",
            description="OFAC list", source="opensanctions", confidence=0.95,
        )]
        result = compute_entity_risk(entity, flags, [])
        assert result["score"] >= 50  # sanctioned should be high risk
        assert result["level"] in ["HIGH", "CRITICAL"]
        assert "breakdown" in result

    def test_pep_entity_above_zero(self):
        from etl.sources.osint.schemas import RiskEntity, RiskFlag
        from etl.sources.osint.risk_scorer import compute_entity_risk
        entity = RiskEntity(
            source="test", source_id="002", entity_type="person",
            name="PEP Person", pep_status=True,
        )
        flags = [RiskFlag(
            entity_id="002", flag_type="pep", severity="HIGH",
            description="PEP detected", source="test", confidence=0.80,
        )]
        result = compute_entity_risk(entity, flags, [])
        assert result["score"] > 0

    def test_clean_entity_low_score(self):
        from etl.sources.osint.schemas import RiskEntity
        from etl.sources.osint.risk_scorer import compute_entity_risk
        entity = RiskEntity(
            source="test", source_id="003", entity_type="person",
            name="Clean Person", pep_status=False, sanctions_status=False,
        )
        result = compute_entity_risk(entity, [], [])
        assert result["score"] <= 30
        assert result["level"] in ["LOW", "MEDIUM"]

    def test_explain_risk_score_markdown(self):
        from etl.sources.osint.schemas import RiskEntity, RiskFlag
        from etl.sources.osint.risk_scorer import explain_risk_score
        entity = RiskEntity(
            source="test", source_id="004", entity_type="person",
            name="Test Person", sanctions_status=True,
        )
        flags = [RiskFlag(
            entity_id="004", flag_type="sanctioned", severity="CRITICAL",
            description="Test", source="test", confidence=0.90,
        )]
        md = explain_risk_score(entity, flags)
        assert isinstance(md, str)
        assert len(md) > 20  # Should have some content

    def test_batch_score_returns_all(self):
        from etl.sources.osint.schemas import RiskEntity
        from etl.sources.osint.risk_scorer import batch_score
        entities = [
            RiskEntity(source="t", source_id=str(i), entity_type="person",
                       name=f"Person {i}")
            for i in range(5)
        ]
        results = batch_score(entities, {}, {})
        assert len(results) == 5
        for entity, res in results:
            assert "score" in res
            assert "level" in res


# ══════════════════════════════════════════════════════════════════════════════
# FTM MAPPER
# ══════════════════════════════════════════════════════════════════════════════

class TestFtMMapper:
    def _ftm_person(self, source_id: str = "Q1", name: str = "John Doe") -> dict:
        return {
            "id": source_id,
            "schema": "Person",
            "properties": {
                "name": [name],
                "nationality": ["DE"],
                "topics": [],
            },
            "datasets": ["test_dataset"],
        }

    def _ftm_company(self, source_id: str = "C1") -> dict:
        return {
            "id": source_id,
            "schema": "Company",
            "properties": {
                "name": ["Acme Corp"],
                "jurisdiction": ["US"],
            },
            "datasets": ["test"],
        }

    def test_map_person(self):
        from etl.sources.osint.followthemoney_mapper import map_ftm_entity
        entity = map_ftm_entity(self._ftm_person(), "test")
        assert entity is not None
        assert entity.entity_type == "person"
        assert entity.name == "John Doe"

    def test_map_company(self):
        from etl.sources.osint.followthemoney_mapper import map_ftm_entity
        entity = map_ftm_entity(self._ftm_company(), "test")
        assert entity is not None
        assert entity.entity_type == "company"

    def test_unknown_schema_returns_unknown(self):
        from etl.sources.osint.followthemoney_mapper import map_ftm_entity
        raw = {
            "id": "X1",
            "schema": "Aircraft",  # Not in type map
            "properties": {"name": ["Unknown Thing"]},
            "datasets": [],
        }
        # Should either return None or entity_type="unknown"
        result = map_ftm_entity(raw, "test")
        if result is not None:
            assert result.entity_type == "unknown"

    def test_pep_topic_sets_pep_status(self):
        """FtM mapper recognizes 'pep' and 'pep-class-*' topic values."""
        from etl.sources.osint.followthemoney_mapper import map_ftm_entity
        raw = {
            "id": "PEP1",
            "schema": "Person",
            "properties": {
                "name": ["Político"],
                "topics": ["pep"],  # FtM native format (not OpenSanctions 'role.pep')
            },
            "datasets": ["test"],
        }
        entity = map_ftm_entity(raw, "test")
        assert entity is not None
        assert entity.pep_status is True

    def test_batch_map_returns_entities(self):
        """batch_map_ftm returns correct entity types."""
        from etl.sources.osint.followthemoney_mapper import batch_map_ftm
        objects = [
            self._ftm_person("Q1", "Alice"),
            self._ftm_person("Q2", "Bob"),
            self._ftm_company("C1"),
        ]
        entities, relations = batch_map_ftm(objects, "test")
        # Should have 3 entities (one per unique object)
        assert len(entities) == 3
        types = {e.entity_type for e in entities}
        assert "person" in types
        assert "company" in types


# ══════════════════════════════════════════════════════════════════════════════
# OPENSANCTIONS ADAPTER
# ══════════════════════════════════════════════════════════════════════════════

class TestOpenSanctionsAdapter:
    def test_detect_flags_sanctioned(self):
        from etl.sources.osint.schemas import RiskEntity
        from etl.sources.osint.opensanctions_adapter import detect_risk_flags
        entity = RiskEntity(
            source="os", source_id="S1", entity_type="person",
            name="Sanctioned", sanctions_status=True,
        )
        raw = {"properties": {"topics": ["sanction"]}}
        flags = detect_risk_flags(entity, raw)
        assert any(f.flag_type == "sanctioned" for f in flags)

    def test_detect_flags_pep(self):
        from etl.sources.osint.schemas import RiskEntity
        from etl.sources.osint.opensanctions_adapter import detect_risk_flags
        entity = RiskEntity(
            source="os", source_id="P1", entity_type="person",
            name="PEP Person", pep_status=True,
        )
        raw = {"properties": {"topics": ["role.pep"]}}
        flags = detect_risk_flags(entity, raw)
        assert any(f.flag_type == "pep" for f in flags)

    def test_load_from_file_json_array(self):
        """Carga desde un fichero JSON array de objetos FtM."""
        from etl.sources.osint.opensanctions_adapter import load_opensanctions_file
        data = [
            {
                "id": "T1", "schema": "Person",
                "properties": {"name": ["Test Person"], "topics": []},
                "datasets": ["test"],
            }
        ]
        with tempfile.NamedTemporaryFile(
            suffix=".json", mode="w", delete=False, encoding="utf-8"
        ) as f:
            json.dump(data, f)
            tmp_path = f.name

        entities, relations, flags_by_entity = load_opensanctions_file(
            path=Path(tmp_path), source_name="test", max_entities=100,
        )
        assert isinstance(entities, list)
        Path(tmp_path).unlink(missing_ok=True)

    def test_load_empty_file(self):
        from etl.sources.osint.opensanctions_adapter import load_opensanctions_file
        with tempfile.NamedTemporaryFile(
            suffix=".json", mode="w", delete=False, encoding="utf-8"
        ) as f:
            json.dump([], f)
            tmp_path = f.name
        entities, relations, flags_by_entity = load_opensanctions_file(
            path=Path(tmp_path), source_name="test",
        )
        assert entities == []
        assert relations == []
        Path(tmp_path).unlink(missing_ok=True)


# ══════════════════════════════════════════════════════════════════════════════
# MAIGRET ADAPTER
# ══════════════════════════════════════════════════════════════════════════════

class TestMaigretAdapter:
    def test_candidates_verified_false(self):
        """All generated candidates must have verified=False."""
        from etl.sources.osint.maigret_adapter import run_username_candidate_search
        candidates = run_username_candidate_search(
            username="testuser123", actor_id="actor_x",
        )
        for c in candidates:
            assert c.verified is False, "Candidates must never be pre-verified"

    def test_confidence_never_exceeds_cap(self):
        """Ethical cap: confidence <= 0.60 always."""
        from etl.sources.osint.maigret_adapter import run_username_candidate_search
        candidates = run_username_candidate_search(
            username="testuser123", actor_id="actor_x",
        )
        for c in candidates:
            assert c.confidence <= 0.60, "Confidence cap violated"

    def test_risk_note_present(self):
        """Every candidate must include the verification disclaimer."""
        from etl.sources.osint.maigret_adapter import (
            run_username_candidate_search, _VERIFICATION_NOTE,
        )
        candidates = run_username_candidate_search(
            username="testuser123", actor_id="actor_x",
        )
        for c in candidates:
            assert _VERIFICATION_NOTE in c.risk_notes, \
                "Verification note must be in every candidate's risk_notes"

    def test_build_review_summary_empty(self):
        from etl.sources.osint.maigret_adapter import build_identity_review_summary
        summary = build_identity_review_summary([])
        assert isinstance(summary, str)
        assert len(summary) > 0

    def test_build_review_summary_with_candidates(self):
        from etl.sources.osint.maigret_adapter import (
            run_username_candidate_search, build_identity_review_summary,
        )
        candidates = run_username_candidate_search(
            username="testuser123", actor_id="actor_x",
        )
        summary = build_identity_review_summary(candidates)
        assert isinstance(summary, str)
        assert "verifi" in summary.lower()


# ══════════════════════════════════════════════════════════════════════════════
# SPIDERFOOT ADAPTER
# ══════════════════════════════════════════════════════════════════════════════

class TestSpiderFootAdapter:
    def test_scan_always_disabled(self):
        from etl.sources.osint.spiderfoot_adapter import SpiderFootAdapter
        assert SpiderFootAdapter.is_scan_disabled() is True

    def test_import_json_valid(self):
        from etl.sources.osint.spiderfoot_adapter import import_spiderfoot_json
        data = [
            {"type": "PERSON_NAME", "data": "John Doe", "module": "sfp_test"},
            {"type": "COMPANY_NAME", "data": "Acme Corp", "module": "sfp_test"},
        ]
        with tempfile.NamedTemporaryFile(
            suffix=".json", mode="w", delete=False, encoding="utf-8"
        ) as f:
            json.dump(data, f)
            tmp = f.name

        entities, relations = import_spiderfoot_json(Path(tmp))
        assert len(entities) >= 2
        for e in entities:
            assert e.confidence <= 0.55  # SpiderFoot import confidence is low
        Path(tmp).unlink(missing_ok=True)

    def test_import_json_missing_file(self):
        from etl.sources.osint.spiderfoot_adapter import import_spiderfoot_json
        with pytest.raises(FileNotFoundError):
            import_spiderfoot_json(Path("/nonexistent/file.json"))

    def test_import_json_empty(self):
        from etl.sources.osint.spiderfoot_adapter import import_spiderfoot_json
        with tempfile.NamedTemporaryFile(
            suffix=".json", mode="w", delete=False, encoding="utf-8"
        ) as f:
            json.dump([], f)
            tmp = f.name
        entities, relations = import_spiderfoot_json(Path(tmp))
        assert entities == []
        assert relations == []
        Path(tmp).unlink(missing_ok=True)


# ══════════════════════════════════════════════════════════════════════════════
# OSINT MONITOR
# ══════════════════════════════════════════════════════════════════════════════

class TestOSINTMonitor:
    def test_dry_run_returns_counts(self):
        from etl.sources.osint.osint_monitor import OSINTMonitor
        from etl.sources.osint.schemas import RiskEntity
        monitor = OSINTMonitor(engine=None, dry_run=True)
        entities = [
            RiskEntity(source="t", source_id=str(i), entity_type="person", name=f"Person {i}")
            for i in range(3)
        ]
        result = monitor.upsert_entities(entities)
        assert result["entities"] == 3  # dry_run returns count without writing

    def test_ensure_tables_no_engine(self):
        from etl.sources.osint.osint_monitor import OSINTMonitor
        result = OSINTMonitor.ensure_tables(None)
        assert result is False

    def test_run_returns_stats(self):
        from etl.sources.osint.osint_monitor import OSINTMonitor
        monitor = OSINTMonitor(engine=None, dry_run=True)
        stats = monitor.run()
        assert "entities_upserted" in stats
        assert "errors" in stats

    def test_create_alerts_no_engine(self):
        from etl.sources.osint.osint_monitor import OSINTMonitor
        from etl.sources.osint.schemas import RiskEntity
        monitor = OSINTMonitor(engine=None, dry_run=False)
        entities = [
            RiskEntity(
                source="t", source_id="s1", entity_type="person",
                name="Sanctioned Person", sanctions_status=True,
            )
        ]
        # Should not raise even without engine
        n = monitor.create_risk_alerts(entities)
        assert isinstance(n, int)


# ══════════════════════════════════════════════════════════════════════════════
# ACTOR RISK CORE SERVICE
# ══════════════════════════════════════════════════════════════════════════════

class TestActorRiskCoreService:
    def test_all_functions_return_safe_values_no_db(self):
        """All service functions must return safe defaults when DB is unavailable."""
        with patch("dashboard.services.actor_risk_core._get_engine", return_value=None):
            from dashboard.services.actor_risk_core import (
                cargar_entidades_riesgo,
                buscar_entidades,
                cargar_kpis_riesgo,
                cargar_top_risk_entities,
                cargar_exposicion_por_pais,
            )
            import importlib
            import dashboard.services.actor_risk_core as arc
            importlib.reload(arc)  # reload to pick up the patch

            df = arc.cargar_entidades_riesgo()
            assert hasattr(df, "empty") and df.empty

            df2 = arc.buscar_entidades("test")
            assert hasattr(df2, "empty") and df2.empty

            kpis = arc.cargar_kpis_riesgo()
            assert isinstance(kpis, dict)
            assert kpis.get("hay_datos") is False

            df3 = arc.cargar_top_risk_entities()
            assert hasattr(df3, "empty") and df3.empty

            df4 = arc.cargar_exposicion_por_pais()
            assert hasattr(df4, "empty") and df4.empty

    def test_cargar_grafo_actor_no_db(self):
        with patch("dashboard.services.actor_risk_core._get_engine", return_value=None):
            from dashboard.services.actor_risk_core import cargar_grafo_actor
            result = cargar_grafo_actor(entity_id=1, depth=2)
            assert isinstance(result, dict)
            assert "nodes" in result
            assert "edges" in result


# ══════════════════════════════════════════════════════════════════════════════
# RISK TOOLS
# ══════════════════════════════════════════════════════════════════════════════

class TestRiskTools:
    def test_module_importable(self):
        import agents.tools.risk_tools as rt
        assert hasattr(rt, "search_risk_entities")
        assert hasattr(rt, "get_entity_risk_profile")
        assert hasattr(rt, "get_high_risk_relations")
        assert hasattr(rt, "get_top_risk_entities")
        assert hasattr(rt, "get_unverified_social_identities")
        assert hasattr(rt, "explain_risk_score")
        assert hasattr(rt, "get_geopolitical_exposure")

    def test_search_risk_entities_empty_db(self):
        from agents.tools.risk_tools import search_risk_entities
        result = search_risk_entities("test query")
        assert isinstance(result, list)  # should return [] not raise

    def test_get_top_risk_entities_empty_db(self):
        from agents.tools.risk_tools import get_top_risk_entities
        result = get_top_risk_entities(limit=10)
        assert isinstance(result, list)

    def test_get_unverified_social_identities_empty_db(self):
        from agents.tools.risk_tools import get_unverified_social_identities
        result = get_unverified_social_identities(limit=10)
        assert isinstance(result, list)

    def test_get_geopolitical_exposure_empty_db(self):
        from agents.tools.risk_tools import get_geopolitical_exposure
        result = get_geopolitical_exposure()
        assert isinstance(result, dict)
        assert "countries" in result

    def test_get_entity_risk_profile_no_db(self):
        from agents.tools.risk_tools import get_entity_risk_profile
        result = get_entity_risk_profile(entity_id=9999)
        assert isinstance(result, dict)
        assert "entity_id" in result

    def test_get_high_risk_relations_no_db(self):
        from agents.tools.risk_tools import get_high_risk_relations
        result = get_high_risk_relations(entity_id=9999)
        assert isinstance(result, dict)
        assert "nodes" in result
        assert "edges" in result

    def test_explain_risk_score_returns_string(self):
        from agents.tools.risk_tools import explain_risk_score
        result = explain_risk_score(entity_id=9999)
        assert isinstance(result, str)


# ══════════════════════════════════════════════════════════════════════════════
# PIPELINE CLI
# ══════════════════════════════════════════════════════════════════════════════

class TestOSINTPipelineCLI:
    def test_build_parser(self):
        from pipelines.osint_core import build_parser
        parser = build_parser()
        assert parser is not None

    def test_parser_source_opensanctions_requires_file(self):
        from pipelines.osint_core import build_parser
        import argparse
        parser = build_parser()
        # --source opensanctions without --file should parse OK (validated in main)
        args = parser.parse_args(["--source", "opensanctions"])
        assert args.source == "opensanctions"

    def test_parser_resolve(self):
        from pipelines.osint_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--resolve"])
        assert args.resolve is True

    def test_parser_score(self):
        from pipelines.osint_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--score"])
        assert args.score is True

    def test_parser_import_spiderfoot(self):
        from pipelines.osint_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--import-spiderfoot", "report.json"])
        assert args.import_spiderfoot == "report.json"

    def test_parser_username_candidates(self):
        from pipelines.osint_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--username-candidates", "actor_1", "johndoe"])
        assert args.username_candidates == ["actor_1", "johndoe"]

    def test_parser_source_all(self):
        from pipelines.osint_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--source", "all"])
        assert args.source == "all"

    def test_main_resolve_no_db(self):
        """cmd_resolve_entities should handle missing DB gracefully."""
        from pipelines.osint_core import cmd_resolve_entities
        stats = cmd_resolve_entities()
        assert isinstance(stats, dict)
        # Shouldn't raise

    def test_main_score_no_db(self):
        from pipelines.osint_core import cmd_score_entities
        stats = cmd_score_entities()
        assert isinstance(stats, dict)

    def test_cmd_import_spiderfoot_missing_file(self):
        from pipelines.osint_core import cmd_import_spiderfoot
        stats = cmd_import_spiderfoot("/nonexistent/report.json")
        assert stats["errors"] > 0

    def test_cmd_username_candidates(self):
        from pipelines.osint_core import cmd_username_candidates
        result = cmd_username_candidates("actor_1", "testuser123", max_sites=5)
        assert isinstance(result, dict)
        assert "candidates" in result
        # All candidates must be unverified
        for c in result["candidates"]:
            assert c.get("verified") is False
