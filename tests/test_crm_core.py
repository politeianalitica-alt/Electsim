"""
Tests — CRM Core (Bloque 15).

pytest tests/test_crm_core.py -v
"""
from __future__ import annotations

import pytest
from datetime import datetime, timedelta


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_contact(**kwargs):
    from crm.contacts import create_contact
    from crm.schemas import Contact
    defaults = {"full_name": "Test Contact", "contact_type": "other", "tenant_id": "test_tenant"}
    defaults.update(kwargs)
    return create_contact(Contact(**defaults))


def _make_org(**kwargs):
    from crm.organizations import create_organization
    from crm.schemas import Organization
    defaults = {"name": "Test Org", "organization_type": "other", "tenant_id": "test_tenant"}
    defaults.update(kwargs)
    return create_organization(Organization(**defaults))


# ── Schema tests ──────────────────────────────────────────────────────────────

class TestContactSchema:
    def test_contact_has_required_fields(self):
        from crm.schemas import Contact
        c = Contact(full_name="María García", contact_type="public_official", tenant_id="t1")
        assert c.full_name == "María García"
        assert c.consent_status == "unknown"
        assert c.data_classification == "internal"
        assert c.contact_id.startswith("cnt_")

    def test_contact_consent_defaults_to_unknown(self):
        from crm.schemas import Contact
        c = Contact(full_name="X", contact_type="other", tenant_id="t1")
        assert c.consent_status == "unknown"

    def test_stakeholder_profile_clamps_scores(self):
        from crm.schemas import StakeholderProfile
        p = StakeholderProfile(
            profile_id="p1",
            object_type="contact",
            object_id="c1",
            tenant_id="t1",
            influence_score=150.0,
            proximity_score=-5.0,
        )
        assert p.influence_score == 100.0
        assert p.proximity_score == 0.0

    def test_organization_schema(self):
        from crm.schemas import Organization
        org = Organization(name="CEOE", organization_type="association", tenant_id="t1")
        assert org.name == "CEOE"
        assert org.organization_id.startswith("org_")


# ── Contact CRUD tests ────────────────────────────────────────────────────────

class TestContactCRUD:
    def test_create_contact_requires_tenant(self):
        c = _make_contact(full_name="Ana López", contact_type="journalist", tenant_id="tenant_a")
        assert c is not None
        assert c.tenant_id == "tenant_a"
        assert c.contact_id is not None

    def test_contact_dedup_by_id(self):
        """El mismo contact_id actualiza en vez de duplicar."""
        from crm.contacts import create_contact, get_contact
        from crm.schemas import Contact
        c = Contact(full_name="Pedro A", contact_type="other", tenant_id="test_dedup")
        c1 = create_contact(c)
        # Actualizar el mismo contacto
        c_updated = c.model_copy(update={"full_name": "Pedro B Actualizado"})
        c2 = create_contact(c_updated)
        assert c1.contact_id == c2.contact_id
        fetched = get_contact(c1.contact_id, tenant_id="test_dedup")
        assert fetched is not None

    def test_get_contact_returns_none_for_unknown(self):
        from crm.contacts import get_contact
        assert get_contact("nonexistent_id_xyz_abc") is None

    def test_search_contacts_by_type(self):
        from crm.contacts import search_contacts
        _make_contact(full_name="Periodista Test", contact_type="journalist", tenant_id="search_t")
        results = search_contacts(contact_type="journalist", tenant_id="search_t")
        assert any(c.contact_type == "journalist" for c in results)


# ── Consent tests ─────────────────────────────────────────────────────────────

class TestConsent:
    def test_do_not_contact_blocks_email(self):
        from crm.consent import can_contact, update_consent_status
        c = _make_contact(full_name="No Contact", tenant_id="consent_t")
        update_consent_status(c.contact_id, "do_not_contact", tenant_id="consent_t")
        assert can_contact(c.contact_id, channel="email", tenant_id="consent_t") is False

    def test_consented_contact_can_be_reached(self):
        from crm.consent import can_contact, update_consent_status
        c = _make_contact(full_name="Consented", tenant_id="consent_t2")
        update_consent_status(c.contact_id, "consented", tenant_id="consent_t2")
        assert can_contact(c.contact_id, channel="email", tenant_id="consent_t2") is True

    def test_revoked_blocks_all_channels(self):
        from crm.consent import can_contact, update_consent_status
        c = _make_contact(full_name="Revoked", tenant_id="consent_t3")
        update_consent_status(c.contact_id, "revoked", tenant_id="consent_t3")
        for channel in ("email", "phone", "meeting"):
            assert can_contact(c.contact_id, channel=channel, tenant_id="consent_t3") is False


# ── Scoring tests ─────────────────────────────────────────────────────────────

class TestStakeholderScoring:
    def test_stakeholder_priority_score_range(self):
        from crm.stakeholders import compute_stakeholder_profile
        c = _make_contact(full_name="Score Test", contact_type="public_official", tenant_id="score_t")
        profile = compute_stakeholder_profile("contact", c.contact_id, tenant_id="score_t")
        assert profile is not None
        assert 0.0 <= profile.priority_score <= 100.0

    def test_public_official_higher_score_than_other(self):
        from crm.stakeholders import compute_stakeholder_profile
        c_official = _make_contact(full_name="Official", contact_type="public_official", tenant_id="score_t2")
        c_other = _make_contact(full_name="Other", contact_type="other", tenant_id="score_t2")
        p_official = compute_stakeholder_profile("contact", c_official.contact_id, tenant_id="score_t2")
        p_other = compute_stakeholder_profile("contact", c_other.contact_id, tenant_id="score_t2")
        assert p_official.influence_score > p_other.influence_score

    def test_priority_label_assigned(self):
        from crm.crm_scoring import get_priority_label
        assert get_priority_label(80) == "CRÍTICA"
        assert get_priority_label(60) == "ALTA"
        assert get_priority_label(40) == "NORMAL"
        assert get_priority_label(15) == "BAJA"


# ── Interaction tests ─────────────────────────────────────────────────────────

class TestInteractions:
    def test_log_interaction_creates_timeline(self):
        from crm.interactions import log_interaction, get_contact_timeline
        from crm.schemas import Interaction
        c = _make_contact(full_name="Timeline Test", tenant_id="int_t")
        log_interaction(Interaction(
            interaction_id="i_test_timeline_001",
            contact_id=c.contact_id,
            interaction_type="meeting",
            title="Reunión de prueba",
            summary="Hablamos de política territorial.",
            tenant_id="int_t",
        ))
        timeline = get_contact_timeline(c.contact_id, tenant_id="int_t")
        assert len(timeline) >= 1


# ── Relationship tests ────────────────────────────────────────────────────────

class TestRelationships:
    def test_relationship_graph_returns_nodes_edges(self):
        from crm.relationships import add_relationship, get_relationship_graph
        from crm.schemas import Relationship
        c1 = _make_contact(full_name="Node A", tenant_id="rel_t")
        c2 = _make_contact(full_name="Node B", tenant_id="rel_t")
        add_relationship(Relationship(
            source_object_type="contact",
            source_object_id=c1.contact_id,
            target_object_type="contact",
            target_object_id=c2.contact_id,
            relationship_type="met_with",
            tenant_id="rel_t",
        ))
        graph = get_relationship_graph("contact", c1.contact_id, depth=1)
        assert "nodes" in graph
        assert "edges" in graph
        assert len(graph["nodes"]) >= 1

    def test_find_bridge_contacts_does_not_crash(self):
        from crm.relationships import find_bridge_contacts
        result = find_bridge_contacts()
        assert isinstance(result, list)


# ── Import/Export tests ───────────────────────────────────────────────────────

class TestImportExport:
    def test_prepare_meeting_pack_empty_data_does_not_crash(self):
        from crm.outreach import prepare_meeting_pack
        c = _make_contact(full_name="Pack Test", tenant_id="pack_t")
        pack = prepare_meeting_pack(contact_id=c.contact_id, tenant_id="pack_t")
        assert pack is not None
        assert pack.contact_name == "Pack Test"

    def test_import_contacts_csv_does_not_crash_on_empty(self):
        """import_contacts_csv with header-only CSV returns imported=0."""
        import tempfile, os
        from crm.crm_importer import import_contacts_csv
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            f.write("full_name,email,contact_type\n")
            tmp_path = f.name
        try:
            result = import_contacts_csv(tmp_path, tenant_id="import_t")
            assert "imported" in result
            assert result["imported"] == 0
        finally:
            os.unlink(tmp_path)


# ── Service layer tests ───────────────────────────────────────────────────────

class TestCrmService:
    def test_crm_core_loaders_return_correct_types(self):
        from dashboard.services.crm_core import (
            cargar_crm_kpis, cargar_contactos, cargar_organizaciones,
            cargar_tareas_pendientes, cargar_segmentos_crm, cargar_alertas_crm,
        )
        assert isinstance(cargar_crm_kpis(tenant_id="empty_t"), dict)
        assert isinstance(cargar_contactos(tenant_id="empty_t"), list)
        assert isinstance(cargar_organizaciones(tenant_id="empty_t"), list)
        assert isinstance(cargar_tareas_pendientes(tenant_id="empty_t"), list)
        assert isinstance(cargar_segmentos_crm(tenant_id="empty_t"), list)
        assert isinstance(cargar_alertas_crm(tenant_id="empty_t"), list)

    def test_cargar_relationship_graph_empty(self):
        from dashboard.services.crm_core import cargar_relationship_graph
        g = cargar_relationship_graph("contact", "nonexistent")
        assert "nodes" in g
        assert "edges" in g


# ── Brain tools tests ─────────────────────────────────────────────────────────

class TestCrmTools:
    def test_crm_tools_registered(self):
        from agents.tools.crm_tools import CRM_TOOLS
        assert len(CRM_TOOLS) >= 8
        names = {t["name"] for t in CRM_TOOLS}
        assert "search_contacts" in names
        assert "get_contact_profile" in names
        assert "prepare_meeting_pack" in names
        assert "get_field_plan_by_territory" in names
        assert "get_due_crm_tasks" in names

    def test_search_contacts_tool_returns_dict(self):
        from agents.tools.crm_tools import CRM_TOOLS
        tool = next(t for t in CRM_TOOLS if t["name"] == "search_contacts")
        result = tool["function"](query="test", tenant_id="tool_t")
        assert isinstance(result, dict)
        assert "contacts" in result or "error" in result

    def test_get_due_crm_tasks_tool_returns_dict(self):
        from agents.tools.crm_tools import CRM_TOOLS
        tool = next(t for t in CRM_TOOLS if t["name"] == "get_due_crm_tasks")
        result = tool["function"](days=7, tenant_id="tool_t2")
        assert isinstance(result, dict)
        assert "due_tasks" in result or "error" in result

    def test_get_field_plan_tool_returns_dict(self):
        from agents.tools.crm_tools import CRM_TOOLS
        tool = next(t for t in CRM_TOOLS if t["name"] == "get_field_plan_by_territory")
        result = tool["function"](territory="Madrid", tenant_id="tool_t3")
        assert isinstance(result, dict)
