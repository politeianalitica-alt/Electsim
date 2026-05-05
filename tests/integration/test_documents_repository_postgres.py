"""
tests/integration/test_documents_repository_postgres.py
"""
from __future__ import annotations
import pytest


@pytest.mark.integration
class TestDocumentRepositoryRoundtrip:
    def test_register_and_get_document(self, skip_if_no_db):
        from etl.sources.documents.repository import DocumentRepository
        repo = DocumentRepository()

        doc = {
            "document_id": "int_test_doc_001",
            "title": "Integration Test Document",
            "doc_type": "report",
            "tenant_id": "docs_int_test",
            "language": "es",
            "status": "draft",
        }
        created = repo.register_document(doc)
        assert created is True

        fetched = repo.get_document("int_test_doc_001", "docs_int_test")
        assert fetched is not None
        assert fetched["title"] == "Integration Test Document"
