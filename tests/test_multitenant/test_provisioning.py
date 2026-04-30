"""
Tests de TenantProvisioningService.
Mock-based: la sesion SQLAlchemy se simula con MagicMock.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict
from unittest.mock import MagicMock, patch, call

import pytest

from services.tenant_provisioning import (
    ProvisioningError,
    PlanNotFoundError,
    RoleNotFoundError,
    SlugAlreadyExistsError,
    TenantProvisioningService,
    _validate_slug,
)
from config.product_loader import load_product_config
from config.product_models import ProductConfig
from db.models import (
    Organisation,
    OrganisationMember,
    Plan,
    Role,
    Subscription,
    UserAccount,
    Workspace,
    WorkspaceMember,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ORG_ID = uuid.uuid4()
_WS_ID = uuid.uuid4()
_PLAN_ID = uuid.uuid4()
_ROLE_ORG_ADMIN_ID = uuid.uuid4()
_ROLE_ANALYST_SENIOR_ID = uuid.uuid4()
_USER_ID = uuid.uuid4()


def _make_plan(code: str = "pro") -> MagicMock:
    p = MagicMock(spec=["id", "code", "name", "max_users", "max_workspaces",
                        "max_alerts_per_day", "is_default"])
    p.id = _PLAN_ID
    p.code = code
    p.name = code.capitalize()
    p.max_users = 10
    p.max_workspaces = 5
    p.max_alerts_per_day = 500
    p.is_default = False
    return p


def _make_role(code: str, rid=None) -> MagicMock:
    r = MagicMock(spec=["id", "code", "name", "description"])
    r.id = rid or uuid.uuid4()
    r.code = code
    r.name = code
    r.description = None
    return r


def _make_user(auth_subject: str = "sub-001", email: str = "a@b.com") -> MagicMock:
    u = MagicMock(spec=["id", "auth_subject", "email", "full_name"])
    u.id = _USER_ID
    u.auth_subject = auth_subject
    u.email = email
    u.full_name = None
    return u


def _make_session(
    *,
    plan: Plan = None,
    role_org_admin: Role = None,
    role_analyst_senior: Role = None,
    user: UserAccount = None,
    slug_taken: bool = False,
) -> MagicMock:
    """
    Crea un MagicMock de Session con comportamiento configurable.
    """
    session = MagicMock()

    plan = plan or _make_plan()
    role_oa = role_org_admin or _make_role("ORG_ADMIN", _ROLE_ORG_ADMIN_ID)
    role_as = role_analyst_senior or _make_role("ANALYST_SENIOR", _ROLE_ANALYST_SENIOR_ID)
    user = user or _make_user()

    def _execute(stmt, params=None):
        params = params or {}
        stmt_str = str(stmt)

        # slug check
        if "organisation WHERE slug" in stmt_str:
            mock_row = MagicMock() if slug_taken else None
            result = MagicMock()
            result.fetchone.return_value = mock_row
            return result

        # plan lookup
        if "FROM plan WHERE code" in stmt_str:
            row = MagicMock()
            row.__getitem__ = lambda self, k: {
                "id": plan.id, "code": plan.code, "name": plan.name
            }.get(k)
            result = MagicMock()
            result.mappings.return_value.fetchone.return_value = row
            return result

        # role lookup
        if "FROM role WHERE code" in stmt_str:
            code = params.get("c", "")
            role = role_oa if code == "ORG_ADMIN" else role_as
            row = MagicMock()
            row.__getitem__ = lambda self, k: {
                "id": role.id, "code": role.code, "name": role.name,
            }.get(k)
            result = MagicMock()
            result.mappings.return_value.fetchone.return_value = row
            return result

        # user lookup
        if "FROM user_account WHERE auth_subject" in stmt_str:
            result = MagicMock()
            result.fetchone.return_value = None  # usuario no existe -> se crea
            return result

        return MagicMock()

    session.execute.side_effect = _execute

    def _get(cls, pk):
        if cls is Plan and pk == plan.id:
            return plan
        if cls is Role and pk == role_oa.id:
            return role_oa
        if cls is Role and pk == role_as.id:
            return role_as
        if cls is UserAccount and pk == user.id:
            return user
        return None

    session.get.side_effect = _get
    session.add = MagicMock()
    session.flush = MagicMock()

    return session


# ---------------------------------------------------------------------------
# Tests de _validate_slug
# ---------------------------------------------------------------------------

class TestValidateSlug:
    def test_valid_slug(self):
        assert _validate_slug("consultora-demo") == "consultora-demo"

    def test_alphanumeric_slug(self):
        assert _validate_slug("org123") == "org123"

    def test_uppercase_fails(self):
        with pytest.raises(ProvisioningError):
            _validate_slug("OrgDemo")

    def test_spaces_fail(self):
        with pytest.raises(ProvisioningError):
            _validate_slug("org demo")

    def test_leading_hyphen_fails(self):
        with pytest.raises(ProvisioningError):
            _validate_slug("-org-demo")

    def test_trailing_hyphen_fails(self):
        with pytest.raises(ProvisioningError):
            _validate_slug("org-demo-")


# ---------------------------------------------------------------------------
# Tests de load_product_config
# ---------------------------------------------------------------------------

class TestLoadProductConfig:
    def test_known_product_returns_config(self):
        cfg = load_product_config("war_room_electoral_spain")
        assert isinstance(cfg, ProductConfig)
        assert cfg.code == "war_room_electoral_spain"

    def test_unknown_product_raises(self):
        from config.product_loader import ProductNotFoundError
        with pytest.raises(ProductNotFoundError):
            load_product_config("nonexistent-product-xyz")

    def test_regulatory_radar_has_modules(self):
        cfg = load_product_config("regulatory_radar_spain")
        assert len(cfg.modules) > 0

    def test_war_room_has_client_profile(self):
        cfg = load_product_config("war_room_electoral_spain")
        assert cfg.default_workspace is not None
        assert "sector" in cfg.default_workspace.client_profile


# ---------------------------------------------------------------------------
# Tests de TenantProvisioningService
# ---------------------------------------------------------------------------

class TestTenantProvisioningService:
    def _make_svc(self, **kwargs) -> tuple[TenantProvisioningService, MagicMock]:
        session = _make_session(**kwargs)
        svc = TenantProvisioningService(session)
        return svc, session

    def _call_create(self, svc: TenantProvisioningService, **overrides) -> Organisation:
        defaults = dict(
            org_name="Consultora Test",
            org_slug="consultora-test",
            market_code="spain",
            plan_code="pro",
            admin_auth_subject="sub-001",
            admin_email="admin@test.com",
        )
        defaults.update(overrides)
        with patch(
            "services.tenant_provisioning.TenantProvisioningService._load_market",
            return_value=MagicMock(code="spain"),
        ):
            return svc.create_organisation_with_workspace(**defaults)

    # ------------------------------------------------------------------
    # Retorno y estructura
    # ------------------------------------------------------------------

    def test_returns_organisation_instance(self):
        svc, _ = self._make_svc()
        result = self._call_create(svc)
        assert isinstance(result, Organisation)

    def test_organisation_has_correct_name(self):
        svc, _ = self._make_svc()
        result = self._call_create(svc, org_name="Mi Consultora")
        assert result.name == "Mi Consultora"

    def test_organisation_has_correct_slug(self):
        svc, _ = self._make_svc()
        result = self._call_create(svc, org_slug="mi-consultora")
        assert result.slug == "mi-consultora"

    def test_organisation_has_market_code(self):
        svc, _ = self._make_svc()
        result = self._call_create(svc)
        assert result.market_code == "spain"

    # ------------------------------------------------------------------
    # Objetos creados (session.add llamado)
    # ------------------------------------------------------------------

    def test_organisation_added_to_session(self):
        svc, session = self._make_svc()
        self._call_create(svc)
        added_types = [type(c[0][0]).__name__ for c in session.add.call_args_list]
        assert "Organisation" in added_types

    def test_subscription_added_to_session(self):
        svc, session = self._make_svc()
        self._call_create(svc)
        added_types = [type(c[0][0]).__name__ for c in session.add.call_args_list]
        assert "Subscription" in added_types

    def test_workspace_added_to_session(self):
        svc, session = self._make_svc()
        self._call_create(svc)
        added_types = [type(c[0][0]).__name__ for c in session.add.call_args_list]
        assert "Workspace" in added_types

    def test_user_account_added_to_session(self):
        svc, session = self._make_svc()
        self._call_create(svc)
        added_types = [type(c[0][0]).__name__ for c in session.add.call_args_list]
        assert "UserAccount" in added_types

    def test_org_member_added_to_session(self):
        svc, session = self._make_svc()
        self._call_create(svc)
        added_types = [type(c[0][0]).__name__ for c in session.add.call_args_list]
        assert "OrganisationMember" in added_types

    def test_workspace_member_added_to_session(self):
        svc, session = self._make_svc()
        self._call_create(svc)
        added_types = [type(c[0][0]).__name__ for c in session.add.call_args_list]
        assert "WorkspaceMember" in added_types

    def test_flush_called(self):
        svc, session = self._make_svc()
        self._call_create(svc)
        session.flush.assert_called_once()

    # ------------------------------------------------------------------
    # Workspace con product_config
    # ------------------------------------------------------------------

    def test_workspace_uses_product_default_name(self):
        svc, session = self._make_svc()
        self._call_create(svc, product_code="war_room_electoral_spain")
        ws_args = [
            c[0][0] for c in session.add.call_args_list
            if isinstance(c[0][0], Workspace)
        ]
        assert len(ws_args) == 1
        assert ws_args[0].name == "War Room Electoral"

    def test_workspace_custom_name_overrides_product(self):
        svc, session = self._make_svc()
        self._call_create(svc, product_code="war_room_electoral_spain", workspace_name="Mi Workspace Custom")
        ws_args = [
            c[0][0] for c in session.add.call_args_list
            if isinstance(c[0][0], Workspace)
        ]
        assert ws_args[0].name == "Mi Workspace Custom"

    def test_product_alert_topics_in_workspace_profile(self):
        svc, session = self._make_svc()
        self._call_create(svc, product_code="war_room_electoral_spain")
        ws_args = [
            c[0][0] for c in session.add.call_args_list
            if isinstance(c[0][0], Workspace)
        ]
        profile = ws_args[0].client_profile
        # El producto war_room_electoral_spain tiene sector en client_profile
        assert "sector" in profile

    # ------------------------------------------------------------------
    # Errores de negocio
    # ------------------------------------------------------------------

    def test_slug_already_taken_raises(self):
        svc, _ = self._make_svc(slug_taken=True)
        with pytest.raises(SlugAlreadyExistsError):
            self._call_create(svc)

    def test_invalid_slug_raises_provisioning_error(self):
        svc, _ = self._make_svc()
        with pytest.raises(ProvisioningError):
            self._call_create(svc, org_slug="INVALID SLUG!")

    def test_plan_not_found_raises(self):
        session = MagicMock()

        def _execute(stmt, params=None):
            params = params or {}
            stmt_str = str(stmt)
            if "organisation WHERE slug" in stmt_str:
                r = MagicMock()
                r.fetchone.return_value = None
                return r
            if "FROM plan WHERE code" in stmt_str:
                r = MagicMock()
                r.mappings.return_value.fetchone.return_value = None
                return r
            return MagicMock()

        session.execute.side_effect = _execute

        svc = TenantProvisioningService(session)
        with pytest.raises(PlanNotFoundError):
            with patch(
                "services.tenant_provisioning.TenantProvisioningService._load_market",
                return_value=MagicMock(code="spain"),
            ):
                svc.create_organisation_with_workspace(
                    org_name="X",
                    org_slug="x-slug",
                    market_code="spain",
                    plan_code="nonexistent",
                    admin_auth_subject="sub",
                    admin_email="a@b.com",
                    product_code="war_room_electoral_spain",
                )

    def test_market_not_found_raises_provisioning_error(self):
        svc, _ = self._make_svc()
        with patch(
            "services.tenant_provisioning.TenantProvisioningService._load_market",
            side_effect=ProvisioningError("Mercado 'xyz' no disponible"),
        ):
            with pytest.raises(ProvisioningError):
                svc.create_organisation_with_workspace(
                    org_name="X",
                    org_slug="x-slug",
                    market_code="xyz",
                    plan_code="pro",
                    admin_auth_subject="sub",
                    admin_email="a@b.com",
                    product_code="war_room_electoral_spain",
                )


# ---------------------------------------------------------------------------
# Tests de RLS conceptual (aislamiento de datos)
# ---------------------------------------------------------------------------

class TestRLSConceptual:
    """
    Verifica el comportamiento de enforce_tenancy desde el punto de vista
    de aislamiento: dos usuarios con orgs distintas no comparten datos.
    """

    def test_two_users_different_set_config_values(self):
        from api.tenancy import enforce_tenancy
        from api.auth import AuthenticatedUser

        user_a = AuthenticatedUser(
            user_id="u-a", org_id="org-A", workspace_id="ws-A", role_code="ORG_ADMIN"
        )
        user_b = AuthenticatedUser(
            user_id="u-b", org_id="org-B", workspace_id="ws-B", role_code="ORG_ADMIN"
        )

        session_a = MagicMock()
        session_b = MagicMock()

        enforce_tenancy(user=user_a, db=session_a)
        enforce_tenancy(user=user_b, db=session_b)

        # Los valores fijados son distintos para cada sesion
        org_a = session_a.execute.call_args_list[1][0][1]["val"]
        org_b = session_b.execute.call_args_list[1][0][1]["val"]
        assert org_a == "org-A"
        assert org_b == "org-B"
        assert org_a != org_b

    def test_workspace_isolation_values(self):
        from api.tenancy import enforce_tenancy
        from api.auth import AuthenticatedUser

        user_a = AuthenticatedUser(
            user_id="u-a", org_id="org-X", workspace_id="ws-001", role_code="ANALYST_JUNIOR"
        )
        user_b = AuthenticatedUser(
            user_id="u-b", org_id="org-X", workspace_id="ws-002", role_code="ANALYST_JUNIOR"
        )

        # Misma org, workspaces distintos
        session_a = MagicMock()
        session_b = MagicMock()

        enforce_tenancy(user=user_a, db=session_a)
        enforce_tenancy(user=user_b, db=session_b)

        ws_a = session_a.execute.call_args_list[2][0][1]["val"]
        ws_b = session_b.execute.call_args_list[2][0][1]["val"]
        assert ws_a == "ws-001"
        assert ws_b == "ws-002"
        assert ws_a != ws_b
