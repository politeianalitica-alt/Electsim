"""
tests/integration/test_crm_repository_postgres.py

Tests de round-trip para CRMRepository contra PostgreSQL real.
"""
from __future__ import annotations

import pytest
from datetime import datetime


@pytest.mark.integration
class TestCRMRepositoryRoundtrip:
    def test_create_and_get_contact(self, skip_if_no_db):
        from crm.repository import CRMRepository
        from crm.schemas import Contact
        repo = CRMRepository()

        contact = Contact(
            full_name="Test Integration Contact",
            contact_type="other",
            tenant_id="integration_test",
        )
        created = repo.create_contact(contact)
        assert created is True, "create_contact debe retornar True si DB disponible"

        fetched = repo.get_contact(contact.contact_id, "integration_test")
        assert fetched is not None
        assert fetched["full_name"] == "Test Integration Contact"
        assert fetched["tenant_id"] == "integration_test"

    def test_list_contacts_by_tenant(self, skip_if_no_db):
        from crm.repository import CRMRepository
        from crm.schemas import Contact
        repo = CRMRepository()

        # Crear contacto
        c = Contact(full_name="Listable Contact", contact_type="journalist",
                    tenant_id="list_test_tenant")
        repo.create_contact(c)

        contacts = repo.list_contacts("list_test_tenant")
        assert isinstance(contacts, list)
        assert any(x["full_name"] == "Listable Contact" for x in contacts)

    def test_update_consent(self, skip_if_no_db):
        from crm.repository import CRMRepository
        from crm.schemas import Contact
        repo = CRMRepository()

        c = Contact(full_name="Consent Test", contact_type="other",
                    tenant_id="consent_int_test")
        repo.create_contact(c)
        updated = repo.update_contact_consent(c.contact_id, "consented", "consent_int_test")
        assert updated is True

        fetched = repo.get_contact(c.contact_id, "consent_int_test")
        assert fetched["consent_status"] == "consented"

    def test_create_organization_roundtrip(self, skip_if_no_db):
        from crm.repository import CRMRepository
        from crm.schemas import Organization
        repo = CRMRepository()

        org = Organization(
            name="Test Org Integration",
            organization_type="association",
            tenant_id="org_int_test",
        )
        created = repo.create_organization(org)
        assert created is True

        fetched = repo.get_organization(org.organization_id, "org_int_test")
        assert fetched is not None
        assert fetched["name"] == "Test Org Integration"

    def test_create_interaction_roundtrip(self, skip_if_no_db):
        from crm.repository import CRMRepository
        from crm.schemas import Contact, Interaction
        repo = CRMRepository()

        c = Contact(full_name="Interaction Subject", contact_type="other",
                    tenant_id="int_test_tenant")
        repo.create_contact(c)

        interaction = Interaction(
            contact_id=c.contact_id,
            interaction_type="meeting",
            title="Test Meeting Integration",
            tenant_id="int_test_tenant",
        )
        created = repo.create_interaction(interaction)
        assert created is True

        interactions = repo.list_interactions(c.contact_id, "int_test_tenant")
        assert len(interactions) >= 1
        assert interactions[0]["title"] == "Test Meeting Integration"
