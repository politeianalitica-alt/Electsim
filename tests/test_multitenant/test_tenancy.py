"""
Tests de api.tenancy (enforce_tenancy / set_config RLS).
Mock-based, sin BD real.
"""
from __future__ import annotations

from unittest.mock import MagicMock, call, patch

import pytest

from api.auth import AuthenticatedUser
from api.tenancy import enforce_tenancy


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(
    user_id: str = "u-001",
    org_id: str = "org-001",
    workspace_id: str = "ws-001",
    role_code: str = "ORG_ADMIN",
) -> AuthenticatedUser:
    return AuthenticatedUser(
        user_id=user_id,
        org_id=org_id,
        workspace_id=workspace_id,
        role_code=role_code,
    )


def _make_session() -> MagicMock:
    session = MagicMock()
    session.execute = MagicMock(return_value=None)
    return session


# ---------------------------------------------------------------------------
# Tests de enforce_tenancy
# ---------------------------------------------------------------------------

class TestEnforceTenancy:
    def test_returns_authenticated_user(self):
        user = _make_user()
        session = _make_session()
        result = enforce_tenancy(user=user, db=session)
        assert result is user

    def test_set_config_called_three_times(self):
        user = _make_user()
        session = _make_session()
        enforce_tenancy(user=user, db=session)
        assert session.execute.call_count == 3

    def test_user_id_set_correctly(self):
        user = _make_user(user_id="subject-xyz")
        session = _make_session()
        enforce_tenancy(user=user, db=session)
        first_call = session.execute.call_args_list[0]
        # El primer argumento posicional es el TextClause; el segundo es el dict de params
        sql_text = str(first_call[0][0])
        assert "current_user_id" in sql_text
        assert first_call[0][1]["val"] == "subject-xyz"

    def test_org_id_set_correctly(self):
        user = _make_user(org_id="org-999")
        session = _make_session()
        enforce_tenancy(user=user, db=session)
        second_call_kwargs = session.execute.call_args_list[1]
        assert second_call_kwargs[0][1]["val"] == "org-999"

    def test_workspace_id_set_correctly(self):
        user = _make_user(workspace_id="ws-888")
        session = _make_session()
        enforce_tenancy(user=user, db=session)
        third_call_kwargs = session.execute.call_args_list[2]
        assert third_call_kwargs[0][1]["val"] == "ws-888"

    def test_set_config_calls_in_order(self):
        """user_id -> org_id -> workspace_id (en ese orden)."""
        user = _make_user(user_id="u", org_id="o", workspace_id="w")
        session = _make_session()
        enforce_tenancy(user=user, db=session)
        calls = session.execute.call_args_list
        assert calls[0][0][1]["val"] == "u"
        assert calls[1][0][1]["val"] == "o"
        assert calls[2][0][1]["val"] == "w"

    def test_different_orgs_set_different_values(self):
        """Dos usuarios con distintas orgs fijan valores distintos."""
        user_a = _make_user(org_id="org-A", workspace_id="ws-A")
        user_b = _make_user(org_id="org-B", workspace_id="ws-B")
        session_a = _make_session()
        session_b = _make_session()

        enforce_tenancy(user=user_a, db=session_a)
        enforce_tenancy(user=user_b, db=session_b)

        org_val_a = session_a.execute.call_args_list[1][0][1]["val"]
        org_val_b = session_b.execute.call_args_list[1][0][1]["val"]
        assert org_val_a == "org-A"
        assert org_val_b == "org-B"
        assert org_val_a != org_val_b

    def test_set_config_uses_text_sql(self):
        """Las llamadas a execute deben usar objetos sqlalchemy.text."""
        from sqlalchemy import text as sa_text
        user = _make_user()
        session = _make_session()
        enforce_tenancy(user=user, db=session)
        for c in session.execute.call_args_list:
            sql_arg = c[0][0]
            # sqlalchemy text() produce un objeto con .text o .__class__.__name__ == 'TextClause'
            assert hasattr(sql_arg, "text") or "TextClause" in type(sql_arg).__name__
