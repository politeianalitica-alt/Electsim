"""
tests/integration/test_comms_repository_postgres.py
"""
from __future__ import annotations

import pytest


@pytest.mark.integration
class TestCommsRepositoryRoundtrip:
    def test_create_and_get_content_asset(self, skip_if_no_db):
        from communications.repository import CommsRepository
        from communications.schemas import ContentAsset
        repo = CommsRepository()

        asset = ContentAsset(
            asset_type="linkedin_post",
            title="Test Post Integration",
            body="Test body for integration test",
            tenant_id="comms_int_test",
        )
        created = repo.create_content_asset(asset)
        assert created is True

        fetched = repo.get_content_asset(asset.asset_id, "comms_int_test")
        assert fetched is not None
        assert fetched["title"] == "Test Post Integration"

    def test_list_content_assets_by_status(self, skip_if_no_db):
        from communications.repository import CommsRepository
        from communications.schemas import ContentAsset
        repo = CommsRepository()

        asset = ContentAsset(
            asset_type="tweet",
            title="Draft Tweet Integration",
            body="Draft content",
            status="draft",
            tenant_id="comms_list_test",
        )
        repo.create_content_asset(asset)

        assets = repo.list_content_assets("comms_list_test", status="draft")
        assert isinstance(assets, list)
        assert any(a["title"] == "Draft Tweet Integration" for a in assets)

    def test_create_message_frame_roundtrip(self, skip_if_no_db):
        from communications.repository import CommsRepository
        from communications.schemas import MessageFrame
        repo = CommsRepository()

        frame = MessageFrame(
            title="Test Frame Integration",
            core_claim="Test claim",
            tenant_id="frame_int_test",
        )
        created = repo.create_message_frame(frame)
        assert created is True
