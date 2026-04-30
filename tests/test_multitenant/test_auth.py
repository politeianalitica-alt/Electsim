"""
Tests de api.auth (AuthenticatedUser, get_current_user, require_role).
Mock-based, sin BD ni servidor real.
"""
from __future__ import annotations

import os
from unittest.mock import patch

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from fastapi import FastAPI, Depends

from api.auth import (
    ROLE_CODES,
    AuthenticatedUser,
    _decode_jwt,
    _dev_user,
    get_current_user,
    require_role,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SECRET = "test-secret-bloque5"


def _make_token(
    sub: str = "user-abc",
    org_id: str = "org-001",
    workspace_id: str = "ws-001",
    role: str = "ORG_ADMIN",
    **extra,
) -> str:
    payload = {"sub": sub, "org_id": org_id, "workspace_id": workspace_id, "role": role}
    payload.update(extra)
    return jwt.encode(payload, _SECRET, algorithm="HS256")


# ---------------------------------------------------------------------------
# Tests de ROLE_CODES
# ---------------------------------------------------------------------------

class TestRoleCodes:
    def test_five_roles_defined(self):
        assert len(ROLE_CODES) == 5

    def test_all_expected_codes_present(self):
        expected = {
            "SUPERADMIN", "ORG_ADMIN",
            "ANALYST_SENIOR", "ANALYST_JUNIOR", "CLIENT_VIEW",
        }
        assert ROLE_CODES == expected


# ---------------------------------------------------------------------------
# Tests de AuthenticatedUser
# ---------------------------------------------------------------------------

class TestAuthenticatedUser:
    def test_fields_stored(self):
        user = AuthenticatedUser(
            user_id="u1", org_id="o1", workspace_id="w1", role_code="ORG_ADMIN"
        )
        assert user.user_id == "u1"
        assert user.org_id == "o1"
        assert user.workspace_id == "w1"
        assert user.role_code == "ORG_ADMIN"

    def test_dev_user_defaults(self):
        u = _dev_user()
        assert u.role_code == "ORG_ADMIN"
        assert u.user_id == "dev-user"
        assert u.org_id
        assert u.workspace_id


# ---------------------------------------------------------------------------
# Tests de _decode_jwt
# ---------------------------------------------------------------------------

class TestDecodeJWT:
    def test_valid_token_returns_user(self):
        token = _make_token()
        with patch.dict(os.environ, {"ELECTSIM_API_JWT_SECRET": _SECRET}):
            user = _decode_jwt(token)
        assert user.user_id == "user-abc"
        assert user.org_id == "org-001"
        assert user.workspace_id == "ws-001"
        assert user.role_code == "ORG_ADMIN"

    def test_missing_secret_raises_500(self):
        token = _make_token()
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("ELECTSIM_API_JWT_SECRET", None)
            with pytest.raises(HTTPException) as exc:
                _decode_jwt(token)
            assert exc.value.status_code == 500

    def test_invalid_signature_raises_401(self):
        token = jwt.encode({"sub": "x", "org_id": "o", "workspace_id": "w", "role": "CLIENT_VIEW"}, "wrong-secret")
        with patch.dict(os.environ, {"ELECTSIM_API_JWT_SECRET": _SECRET}):
            with pytest.raises(HTTPException) as exc:
                _decode_jwt(token)
            assert exc.value.status_code == 401

    def test_missing_org_id_raises_401(self):
        token = jwt.encode({"sub": "x", "workspace_id": "w", "role": "CLIENT_VIEW"}, _SECRET)
        with patch.dict(os.environ, {"ELECTSIM_API_JWT_SECRET": _SECRET}):
            with pytest.raises(HTTPException) as exc:
                _decode_jwt(token)
            assert exc.value.status_code == 401
            assert "org_id" in exc.value.detail

    def test_missing_workspace_id_raises_401(self):
        token = jwt.encode({"sub": "x", "org_id": "o", "role": "CLIENT_VIEW"}, _SECRET)
        with patch.dict(os.environ, {"ELECTSIM_API_JWT_SECRET": _SECRET}):
            with pytest.raises(HTTPException) as exc:
                _decode_jwt(token)
            assert exc.value.status_code == 401
            assert "workspace_id" in exc.value.detail

    def test_unknown_role_raises_401(self):
        token = _make_token(role="UNKNOWN_ROLE")
        with patch.dict(os.environ, {"ELECTSIM_API_JWT_SECRET": _SECRET}):
            with pytest.raises(HTTPException) as exc:
                _decode_jwt(token)
            assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Tests de get_current_user
# ---------------------------------------------------------------------------

class TestGetCurrentUser:
    def test_no_header_dev_mode_returns_dev_user(self):
        with patch.dict(os.environ, {"ELECTSIM_DEV_MODE": "true"}):
            user = get_current_user(authorization=None)
        assert user.user_id == "dev-user"

    def test_no_header_prod_mode_raises_401(self):
        with patch.dict(os.environ, {"ELECTSIM_DEV_MODE": "false", "ELECTSIM_API_JWT_SECRET": _SECRET}):
            with pytest.raises(HTTPException) as exc:
                get_current_user(authorization=None)
            assert exc.value.status_code == 401

    def test_bearer_token_decoded(self):
        token = _make_token(sub="real-user", org_id="org-99", workspace_id="ws-99")
        with patch.dict(os.environ, {"ELECTSIM_DEV_MODE": "false", "ELECTSIM_API_JWT_SECRET": _SECRET}):
            user = get_current_user(authorization=f"Bearer {token}")
        assert user.user_id == "real-user"
        assert user.org_id == "org-99"

    def test_dev_token_in_dev_mode_returns_dev_user(self):
        with patch.dict(os.environ, {"ELECTSIM_DEV_MODE": "true"}):
            user = get_current_user(authorization="Bearer dev")
        assert user.user_id == "dev-user"

    def test_malformed_header_without_bearer_prod_raises_401(self):
        with patch.dict(os.environ, {"ELECTSIM_DEV_MODE": "false", "ELECTSIM_API_JWT_SECRET": _SECRET}):
            with pytest.raises(HTTPException) as exc:
                get_current_user(authorization="Token abc")
            assert exc.value.status_code == 401


# ---------------------------------------------------------------------------
# Tests de require_role
# ---------------------------------------------------------------------------

class TestRequireRole:
    def _user(self, role: str) -> AuthenticatedUser:
        return AuthenticatedUser(
            user_id="u", org_id="o", workspace_id="w", role_code=role
        )

    def test_allowed_role_passes(self):
        dep = require_role(["ORG_ADMIN", "SUPERADMIN"])
        with patch("api.auth.get_current_user", return_value=self._user("ORG_ADMIN")):
            result = dep(user=self._user("ORG_ADMIN"))
        assert result.role_code == "ORG_ADMIN"

    def test_forbidden_role_raises_403(self):
        dep = require_role(["SUPERADMIN"])
        with pytest.raises(HTTPException) as exc:
            dep(user=self._user("CLIENT_VIEW"))
        assert exc.value.status_code == 403

    def test_multiple_roles_any_passes(self):
        dep = require_role(["ANALYST_SENIOR", "ANALYST_JUNIOR", "ORG_ADMIN"])
        for role in ("ANALYST_SENIOR", "ANALYST_JUNIOR", "ORG_ADMIN"):
            result = dep(user=self._user(role))
            assert result.role_code == role
