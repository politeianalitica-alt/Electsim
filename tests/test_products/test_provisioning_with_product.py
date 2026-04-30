"""
Tests de TenantProvisioningService con productos YAML reales (Bloque 6).
Mock-based: la sesion SQLAlchemy se simula con MagicMock.
Integra product_loader real + provisioning service.
"""
from __future__ import annotations

import uuid
from typing import Any, List
from unittest.mock import MagicMock, patch

import pytest

from config.product_loader import invalidate_cache, load_product_config
from config.product_models import ProductConfig
from services.tenant_provisioning import (
    ProductMarketMismatchError,
    ProvisioningError,
    TenantProvisioningService,
)
from db.models import (
    Organisation,
    OrganisationMember,
    Workspace,
    WorkspaceAlertConfig,
    WorkspaceMember,
    WorkspaceModule,
    WorkspaceSavedSearch,
)


# ---------------------------------------------------------------------------
# Fixtures y helpers
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _clear_product_cache():
    invalidate_cache()
    yield
    invalidate_cache()


_PLAN_ID = uuid.uuid4()
_ROLE_ORG_ADMIN_ID = uuid.uuid4()
_ROLE_ANALYST_SENIOR_ID = uuid.uuid4()


def _make_mock_plan(code: str = "pro") -> MagicMock:
    p = MagicMock()
    p.id = _PLAN_ID
    p.code = code
    p.name = code.capitalize()
    return p


def _make_mock_role(code: str, rid=None) -> MagicMock:
    r = MagicMock()
    r.id = rid or uuid.uuid4()
    r.code = code
    r.name = code
    return r


def _make_session(
    *,
    plan=None,
    slug_taken: bool = False,
) -> MagicMock:
    session = MagicMock()
    plan = plan or _make_mock_plan()
    role_oa = _make_mock_role("ORG_ADMIN", _ROLE_ORG_ADMIN_ID)
    role_as = _make_mock_role("ANALYST_SENIOR", _ROLE_ANALYST_SENIOR_ID)

    def _execute(stmt, params=None):
        params = params or {}
        stmt_str = str(stmt)

        if "organisation WHERE slug" in stmt_str:
            r = MagicMock()
            r.fetchone.return_value = MagicMock() if slug_taken else None
            return r

        if "FROM plan WHERE code" in stmt_str:
            row = MagicMock()
            row.__getitem__ = lambda s, k: {"id": plan.id, "code": plan.code, "name": plan.name}.get(k)
            r = MagicMock()
            r.mappings.return_value.fetchone.return_value = row
            return r

        if "FROM role WHERE code" in stmt_str:
            code = params.get("c", "")
            role = role_oa if code == "ORG_ADMIN" else role_as
            row = MagicMock()
            row.__getitem__ = lambda s, k: {"id": role.id, "code": role.code, "name": role.name}.get(k)
            r = MagicMock()
            r.mappings.return_value.fetchone.return_value = row
            return r

        if "FROM user_account WHERE auth_subject" in stmt_str:
            r = MagicMock()
            r.fetchone.return_value = None
            return r

        return MagicMock()

    session.execute.side_effect = _execute

    def _get(cls, pk):
        if cls.__name__ == "Plan" and pk == plan.id:
            return plan
        return None

    session.get.side_effect = _get
    session.add = MagicMock()
    session.flush = MagicMock()
    return session


def _make_svc(session=None, **kwargs) -> TenantProvisioningService:
    return TenantProvisioningService(session or _make_session(**kwargs))


def _call_create(svc, *, product_code="war_room_electoral_spain", **overrides):
    defaults = dict(
        org_name="Test Org",
        org_slug="test-org",
        market_code="spain",
        plan_code="pro",
        admin_auth_subject="sub-test",
        admin_email="test@test.com",
        product_code=product_code,
    )
    defaults.update(overrides)
    with patch(
        "services.tenant_provisioning.TenantProvisioningService._load_market",
        return_value=MagicMock(code="spain"),
    ):
        return svc.create_organisation_with_workspace_and_product(**defaults) if False \
            else svc.create_organisation_with_product(**defaults)


# ---------------------------------------------------------------------------
# Tests de create_organisation_with_product
# ---------------------------------------------------------------------------

class TestCreateOrganisationWithProduct:
    def test_returns_organisation(self):
        svc = _make_svc()
        result = _call_create(svc)
        assert isinstance(result, Organisation)

    def test_organisation_has_correct_name(self):
        svc = _make_svc()
        result = _call_create(svc, org_name="Mi Consultora")
        assert result.name == "Mi Consultora"

    def test_organisation_has_correct_market(self):
        svc = _make_svc()
        result = _call_create(svc)
        assert result.market_code == "spain"

    def test_flush_called(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc)
        session.flush.assert_called_once()

    def test_workspace_added(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc)
        types = [type(c[0][0]).__name__ for c in session.add.call_args_list]
        assert "Workspace" in types

    def test_workspace_has_product_name(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc, product_code="war_room_electoral_spain")
        ws_instances = [c[0][0] for c in session.add.call_args_list if isinstance(c[0][0], Workspace)]
        assert len(ws_instances) == 1
        assert ws_instances[0].name == "War Room Electoral"

    def test_workspace_client_profile_from_product(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc, product_code="war_room_electoral_spain")
        ws_instances = [c[0][0] for c in session.add.call_args_list if isinstance(c[0][0], Workspace)]
        profile = ws_instances[0].client_profile
        assert profile.get("sector") == "electoral"

    def test_org_member_added_as_org_admin(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc)
        types = [type(c[0][0]).__name__ for c in session.add.call_args_list]
        assert "OrganisationMember" in types

    def test_workspace_member_added(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc)
        types = [type(c[0][0]).__name__ for c in session.add.call_args_list]
        assert "WorkspaceMember" in types

    # ------------------------------------------------------------------
    # Modulos del producto
    # ------------------------------------------------------------------

    def test_workspace_modules_added(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc, product_code="war_room_electoral_spain")
        module_instances = [c[0][0] for c in session.add.call_args_list
                            if isinstance(c[0][0], WorkspaceModule)]
        assert len(module_instances) > 0

    def test_electoral_core_module_added(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc, product_code="war_room_electoral_spain")
        module_codes = [c[0][0].module_code for c in session.add.call_args_list
                        if isinstance(c[0][0], WorkspaceModule)]
        assert "electoral_core" in module_codes

    def test_all_product_modules_added(self):
        product = load_product_config("war_room_electoral_spain")
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc, product_code="war_room_electoral_spain")
        module_codes = {c[0][0].module_code for c in session.add.call_args_list
                        if isinstance(c[0][0], WorkspaceModule)}
        for m in product.modules:
            assert m in module_codes, f"Modulo '{m}' no encontrado en workspace_module"

    def test_modules_tagged_with_source_product(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc, product_code="war_room_electoral_spain")
        modules = [c[0][0] for c in session.add.call_args_list
                   if isinstance(c[0][0], WorkspaceModule)]
        for m in modules:
            assert m.source_product == "war_room_electoral_spain"

    # ------------------------------------------------------------------
    # Alertas del producto
    # ------------------------------------------------------------------

    def test_alerts_added(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc, product_code="war_room_electoral_spain")
        alert_instances = [c[0][0] for c in session.add.call_args_list
                           if isinstance(c[0][0], WorkspaceAlertConfig)]
        assert len(alert_instances) >= 2

    def test_poll_movement_alert_created(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc, product_code="war_room_electoral_spain")
        alert_codes = [c[0][0].alert_code for c in session.add.call_args_list
                       if isinstance(c[0][0], WorkspaceAlertConfig)]
        assert "poll_movement_2pp" in alert_codes

    def test_all_product_alerts_added(self):
        product = load_product_config("war_room_electoral_spain")
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc, product_code="war_room_electoral_spain")
        alert_codes = {c[0][0].alert_code for c in session.add.call_args_list
                       if isinstance(c[0][0], WorkspaceAlertConfig)}
        for a in product.alert_codes:
            assert a in alert_codes, f"Alerta '{a}' no creada"

    # ------------------------------------------------------------------
    # Saved searches del producto
    # ------------------------------------------------------------------

    def test_saved_searches_added(self):
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc, product_code="war_room_electoral_spain")
        search_instances = [c[0][0] for c in session.add.call_args_list
                            if isinstance(c[0][0], WorkspaceSavedSearch)]
        assert len(search_instances) >= 2

    def test_all_product_searches_added(self):
        product = load_product_config("war_room_electoral_spain")
        session = _make_session()
        svc = _make_svc(session)
        _call_create(svc, product_code="war_room_electoral_spain")
        search_codes = {c[0][0].search_code for c in session.add.call_args_list
                        if isinstance(c[0][0], WorkspaceSavedSearch)}
        for s in product.saved_search_codes:
            assert s in search_codes, f"Saved search '{s}' no creada"

    # ------------------------------------------------------------------
    # Validaciones de compatibilidad
    # ------------------------------------------------------------------

    def test_dlc_as_base_product_raises(self):
        svc = _make_svc()
        with pytest.raises(ProvisioningError, match="DLC"):
            _call_create(svc, product_code="dlc_energy_spain")

    def test_market_mismatch_raises(self):
        svc = _make_svc()
        with patch(
            "services.tenant_provisioning.TenantProvisioningService._load_market",
            return_value=MagicMock(code="france"),
        ):
            with pytest.raises(ProductMarketMismatchError):
                svc.create_organisation_with_product(
                    org_name="X",
                    org_slug="x-org",
                    market_code="france",
                    plan_code="pro",
                    admin_auth_subject="sub",
                    admin_email="a@b.com",
                    product_code="war_room_electoral_spain",
                )


# ---------------------------------------------------------------------------
# Tests de apply_dlc_to_workspace
# ---------------------------------------------------------------------------

class TestApplyDLCToWorkspace:
    def _make_dlc_session(self) -> MagicMock:
        session = MagicMock()
        session.add = MagicMock()
        session.flush = MagicMock()
        return session

    def _call_apply_dlc(self, svc, dlc_code="dlc_energy_spain", market_code="spain"):
        ws_id = uuid.uuid4()
        org_id = uuid.uuid4()
        with patch(
            "services.tenant_provisioning.TenantProvisioningService._load_market",
            return_value=MagicMock(code=market_code),
        ):
            svc.apply_dlc_to_workspace(
                workspace_id=ws_id,
                organisation_id=org_id,
                market_code=market_code,
                dlc_code=dlc_code,
            )
        return ws_id, org_id

    def test_dlc_modules_added(self):
        session = self._make_dlc_session()
        svc = TenantProvisioningService(session)
        self._call_apply_dlc(svc, dlc_code="dlc_energy_spain")
        module_codes = {c[0][0].module_code for c in session.add.call_args_list
                        if isinstance(c[0][0], WorkspaceModule)}
        assert "regulatory_energy" in module_codes
        assert "geopolitics" in module_codes
        assert "macro_energy" in module_codes

    def test_dlc_alerts_added(self):
        session = self._make_dlc_session()
        svc = TenantProvisioningService(session)
        self._call_apply_dlc(svc, dlc_code="dlc_energy_spain")
        alert_codes = {c[0][0].alert_code for c in session.add.call_args_list
                       if isinstance(c[0][0], WorkspaceAlertConfig)}
        assert "cnmc_resolution_energy" in alert_codes

    def test_dlc_searches_added(self):
        session = self._make_dlc_session()
        svc = TenantProvisioningService(session)
        self._call_apply_dlc(svc, dlc_code="dlc_energy_spain")
        search_codes = {c[0][0].search_code for c in session.add.call_args_list
                        if isinstance(c[0][0], WorkspaceSavedSearch)}
        assert "energy_regulation" in search_codes

    def test_non_dlc_raises(self):
        session = self._make_dlc_session()
        svc = TenantProvisioningService(session)
        with pytest.raises(ProvisioningError, match="DLC"):
            self._call_apply_dlc(svc, dlc_code="war_room_electoral_spain")

    def test_defence_dlc_modules_added(self):
        session = self._make_dlc_session()
        svc = TenantProvisioningService(session)
        self._call_apply_dlc(svc, dlc_code="dlc_defence_spain")
        module_codes = {c[0][0].module_code for c in session.add.call_args_list
                        if isinstance(c[0][0], WorkspaceModule)}
        assert "crisis_intel" in module_codes

    def test_flush_called(self):
        session = self._make_dlc_session()
        svc = TenantProvisioningService(session)
        self._call_apply_dlc(svc)
        session.flush.assert_called_once()


# ---------------------------------------------------------------------------
# Tests de require_modules
# ---------------------------------------------------------------------------

class TestRequireModules:
    def _make_db_with_modules(self, modules: list[str]) -> MagicMock:
        db = MagicMock()
        rows = [(m,) for m in modules]
        db.execute.return_value.fetchall.return_value = rows
        return db

    def test_allowed_module_passes(self):
        from api.modules import get_active_modules, require_modules
        from api.auth import AuthenticatedUser
        from unittest.mock import patch as mpatch

        user = AuthenticatedUser(
            user_id="u", org_id="org-1", workspace_id="ws-1", role_code="ANALYST_JUNIOR"
        )
        db = self._make_db_with_modules(["electoral_core", "electoral_nowcasting"])

        with mpatch("api.tenancy.enforce_tenancy", return_value=user), \
             mpatch("api.auth.get_db", return_value=iter([db])):
            modules = get_active_modules(user=user, db=db)

        dep = require_modules("electoral_core")
        result = dep(modules=modules)
        assert "electoral_core" in result

    def test_missing_module_raises_403(self):
        from api.modules import require_modules
        from fastapi import HTTPException

        dep = require_modules("electoral_nowcasting")
        with pytest.raises(HTTPException) as exc:
            dep(modules=["electoral_core"])  # nowcasting no esta activo
        assert exc.value.status_code == 403

    def test_all_required_present_passes(self):
        from api.modules import require_modules

        dep = require_modules("electoral_core", "media_narrative")
        result = dep(modules=["electoral_core", "media_narrative", "alerts_core"])
        assert "electoral_core" in result

    def test_partial_required_raises(self):
        from api.modules import require_modules
        from fastapi import HTTPException

        dep = require_modules("electoral_core", "electoral_nowcasting")
        with pytest.raises(HTTPException) as exc:
            dep(modules=["electoral_core"])  # falta nowcasting
        assert exc.value.status_code == 403
        assert "electoral_nowcasting" in str(exc.value.detail)

    def test_empty_modules_any_required_raises(self):
        from api.modules import require_modules
        from fastapi import HTTPException

        dep = require_modules("electoral_core")
        with pytest.raises(HTTPException):
            dep(modules=[])
