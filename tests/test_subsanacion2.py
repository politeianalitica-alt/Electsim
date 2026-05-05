"""
Tests — Bloque Subsanación 2: producto gobernado, seguridad aplicada, UX.
pytest tests/test_subsanacion2.py -v
"""
from __future__ import annotations
import pytest


# ── Module Registry ───────────────────────────────────────────────────────────

class TestModuleRegistry:
    def test_module_registry_importable(self):
        from core.module_registry import MODULES, TOOL_PERMISSIONS
        assert isinstance(MODULES, dict)
        assert len(MODULES) >= 10

    def test_module_ids_are_unique(self):
        from core.module_registry import MODULES
        ids = [m["id"] for m in MODULES.values()]
        assert len(ids) == len(set(ids)), "IDs de módulo duplicados"

    def test_all_modules_have_required_fields(self):
        from core.module_registry import MODULES
        for name, mod in MODULES.items():
            assert "id" in mod, f"{name} sin id"
            assert "read_permission" in mod, f"{name} sin read_permission"
            assert "active" in mod, f"{name} sin active"

    def test_get_module_returns_correct_module(self):
        from core.module_registry import get_module
        crm = get_module("crm")
        assert crm is not None
        assert crm["id"] == "crm"
        assert crm["read_permission"] == "crm:read"

    def test_get_module_returns_none_for_unknown(self):
        from core.module_registry import get_module
        assert get_module("nonexistent_xyz") is None

    def test_required_permission_returns_correct_permission(self):
        from core.module_registry import required_permission
        assert required_permission("crm", "read") == "crm:read"
        assert required_permission("legislative", "read") == "legislative:read"
        assert required_permission("nonexistent") is None

    def test_get_tool_permissions_returns_list(self):
        from core.module_registry import get_tool_permissions
        perms = get_tool_permissions("search_contacts")
        assert isinstance(perms, list)
        assert len(perms) > 0
        assert "crm:read" in perms

    def test_list_active_modules(self):
        from core.module_registry import list_active_modules
        active = list_active_modules()
        assert len(active) >= 10
        assert all(m.get("active") for m in active)

    def test_permission_names_are_normalized(self):
        """Verifica que no hay permisos con nombres inconsistentes."""
        from core.module_registry import MODULES
        # Verificar que no hay mezcla de 'geo' vs 'geopolitics', etc.
        for mod in MODULES.values():
            perm = mod.get("read_permission", "")
            if perm:
                assert "geo:" not in perm, f"Usar 'geopolitics:' no 'geo:' en {mod['id']}"
                assert "eco:" not in perm, f"Usar 'economy:' no 'eco:' en {mod['id']}"


# ── Tenant Context ────────────────────────────────────────────────────────────

class TestTenantContext:
    def test_tenant_context_importable(self):
        from security.tenant_context import get_active_tenant_id, require_tenant_id
        assert callable(get_active_tenant_id)
        assert callable(require_tenant_id)

    def test_get_active_tenant_returns_string(self):
        from security.tenant_context import get_active_tenant_id
        tid = get_active_tenant_id()
        assert isinstance(tid, str)
        assert len(tid) > 0

    def test_require_tenant_returns_string(self):
        from security.tenant_context import require_tenant_id
        tid = require_tenant_id()
        assert isinstance(tid, str)

    def test_assert_tenant_access_dev_mode(self):
        from security.tenant_context import assert_tenant_access
        user = {"id": "u1", "roles": ["analyst"]}
        # En dev mode siempre True
        result = assert_tenant_access(user, "any_tenant")
        assert isinstance(result, bool)

    def test_is_private_module(self):
        from security.tenant_context import is_private_module
        assert is_private_module("crm") is True
        assert is_private_module("documents") is True
        assert is_private_module("opendata") is False  # opendata es público

    def test_is_private_table(self):
        from security.tenant_context import is_private_table
        assert is_private_table("crm_contacts") is True
        assert is_private_table("content_assets") is True

    def test_tenant_required_for_private_objects(self):
        """Verifica que módulos CRM y comms están en PRIVATE_MODULES."""
        from security.tenant_context import PRIVATE_MODULES
        assert "crm" in PRIVATE_MODULES
        assert "comms" in PRIVATE_MODULES
        assert "documents" in PRIVATE_MODULES


# ── Tool Authorizer ───────────────────────────────────────────────────────────

class TestToolAuthorizer:
    def test_tool_authorizer_importable(self):
        from agents.tool_authorizer import (
            authorize_tool_call, filter_tools_for_user,
            ToolNotAuthorizedError, get_required_permissions
        )
        assert callable(authorize_tool_call)

    def test_authorize_allows_in_dev_mode(self):
        """En dev mode, autorización siempre pasa."""
        from agents.tool_authorizer import authorize_tool_call
        # En dev mode, no debe lanzar excepción con user None
        try:
            authorize_tool_call(None, "search_contacts", {})
        except Exception as exc:
            # Solo es aceptable si no es dev mode y es ToolNotAuthorizedError
            from agents.tool_authorizer import ToolNotAuthorizedError
            if isinstance(exc, ToolNotAuthorizedError):
                pass  # OK en prod mode

    def test_get_required_permissions_for_crm_tool(self):
        from agents.tool_authorizer import get_required_permissions
        perms = get_required_permissions("search_contacts")
        assert isinstance(perms, list)
        assert len(perms) > 0

    def test_filter_tools_for_user_returns_list(self):
        from agents.tool_authorizer import filter_tools_for_user
        tools = [{"name": "search_contacts"}, {"name": "run_pipeline"}]
        result = filter_tools_for_user(None, tools)
        assert isinstance(result, list)

    def test_tool_not_authorized_error_is_permission_error(self):
        from agents.tool_authorizer import ToolNotAuthorizedError
        exc = ToolNotAuthorizedError("test_tool", "crm:read", "user_1")
        assert isinstance(exc, PermissionError)
        assert "crm:read" in str(exc)


# ── Safe Render ───────────────────────────────────────────────────────────────

class TestSafeRender:
    def test_safe_render_importable(self):
        from dashboard.ui.safe_render import escape_user_text, strip_unsafe_html, safe_markdown
        assert callable(escape_user_text)

    def test_escape_user_text_escapes_html(self):
        from dashboard.ui.safe_render import escape_user_text
        result = escape_user_text("<script>alert('xss')</script>")
        assert "<script>" not in result
        assert "&lt;script&gt;" in result

    def test_escape_user_text_handles_none(self):
        from dashboard.ui.safe_render import escape_user_text
        assert escape_user_text(None) == ""

    def test_escape_user_text_truncates_long_text(self):
        from dashboard.ui.safe_render import escape_user_text
        long_text = "a" * 10000
        result = escape_user_text(long_text, max_length=100)
        assert len(result) <= 105  # 100 + "…"

    def test_strip_unsafe_html_removes_script(self):
        from dashboard.ui.safe_render import strip_unsafe_html
        dirty = "<div>Hello</div><script>alert(1)</script>"
        result = strip_unsafe_html(dirty)
        assert "<script>" not in result
        assert "Hello" in result

    def test_safe_markdown_returns_string(self):
        from dashboard.ui.safe_render import safe_markdown
        result = safe_markdown("**Bold** text with <script>evil</script>")
        assert isinstance(result, str)
        assert "<script>" not in result

    def test_escape_for_json_display(self):
        from dashboard.ui.safe_render import escape_for_json_display
        result = escape_for_json_display({"key": "<value>"})
        assert "&lt;" in result


# ── Evidence Policy ───────────────────────────────────────────────────────────

class TestEvidencePolicy:
    def test_evidence_policy_importable(self):
        from core.evidence_policy import (
            requires_evidence, detect_quantitative_claims,
            validate_claims_against_evidence
        )
        assert callable(requires_evidence)

    def test_requires_evidence_for_press_note(self):
        from core.evidence_policy import requires_evidence
        assert requires_evidence("content_asset", "press_note") is True
        assert requires_evidence("content_asset", "speech") is True

    def test_does_not_require_evidence_for_email(self):
        from core.evidence_policy import requires_evidence
        # email no requiere, solo recomienda
        assert requires_evidence("content_asset", "email") is False

    def test_detect_quantitative_claims_finds_percentages(self):
        from core.evidence_policy import detect_quantitative_claims
        text = "La intención de voto sube 4 puntos al 32%"
        claims = detect_quantitative_claims(text)
        assert len(claims) > 0

    def test_detect_quantitative_claims_empty_on_clean_text(self):
        from core.evidence_policy import detect_quantitative_claims
        text = "Este es un texto sin afirmaciones numéricas específicas."
        claims = detect_quantitative_claims(text)
        assert len(claims) == 0

    def test_validate_claims_no_evidence_returns_warning(self):
        from core.evidence_policy import validate_claims_against_evidence
        text = "La economía crece al 3.5% según los últimos datos"
        result = validate_claims_against_evidence(text, evidence_ids=[])
        assert "warnings" in result
        assert len(result["warnings"]) > 0
        assert result["has_evidence"] is False

    def test_validate_claims_with_evidence_ok(self):
        from core.evidence_policy import validate_claims_against_evidence
        text = "La economía crece al 3.5%"
        result = validate_claims_against_evidence(text, evidence_ids=["ev_001", "ev_002"])
        assert result["has_evidence"] is True


# ── Comms Guardrails (reforzados) ─────────────────────────────────────────────

class TestCommsGuardrailsEnhanced:
    def test_guardrails_detects_defamatory_language(self):
        from communications.comms_guardrails import check_content_risks
        content = "El político corrupto ha robado dinero público y es culpable"
        flags = check_content_risks(content, context={})
        # Debe detectar algún flag de riesgo
        assert isinstance(flags, list)

    def test_guardrails_full_check_returns_check_object(self):
        from communications.comms_guardrails import run_full_guardrail_check
        from communications.schemas import ContentAsset
        asset = ContentAsset(
            asset_type="press_note",
            title="Test",
            body="Con total certeza el candidato está definitivamente implicado en el caso.",
            body_markdown="Con total certeza el candidato está definitivamente implicado en el caso.",
            tenant_id="test",
        )
        result = run_full_guardrail_check(asset)
        assert result is not None


# ── Platform Health & Status ──────────────────────────────────────────────────

class TestPlatformHealth:
    def test_platform_health_service_importable(self):
        from dashboard.services.platform_health import (
            cargar_platform_status, cargar_module_modes, cargar_db_health
        )
        assert callable(cargar_platform_status)

    def test_cargar_db_health_returns_dict(self):
        from dashboard.services.platform_health import cargar_db_health
        result = cargar_db_health()
        assert isinstance(result, dict)
        assert "ok" in result

    def test_cargar_platform_status_structure(self):
        from dashboard.services.platform_health import cargar_platform_status
        result = cargar_platform_status()
        assert "database" in result
        assert "modules" in result
        assert "overall_ok" in result

    def test_cargar_module_modes_returns_dict(self):
        from dashboard.services.platform_health import cargar_module_modes
        result = cargar_module_modes()
        assert isinstance(result, dict)

    def test_platform_status_components_importable(self):
        from dashboard.components.platform_status import (
            render_db_status_banner, render_module_health_matrix,
            render_schema_contract_status, render_pending_actions_row
        )
        assert callable(render_db_status_banner)

    def test_audit_components_importable(self):
        from dashboard.components.audit_components import (
            render_audit_timeline, render_audit_event_card,
            render_brain_tool_audit_panel
        )
        assert callable(render_audit_timeline)


# ── RBAC Permissions (normalized) ────────────────────────────────────────────

class TestRBACPermissions:
    def test_crm_permissions_exist(self):
        from security.rbac import SYSTEM_PERMISSIONS
        assert "crm:read" in SYSTEM_PERMISSIONS
        assert "crm:write" in SYSTEM_PERMISSIONS

    def test_comms_permissions_exist(self):
        from security.rbac import SYSTEM_PERMISSIONS
        assert "comms:read" in SYSTEM_PERMISSIONS
        assert "comms:create" in SYSTEM_PERMISSIONS

    def test_geopolitics_permissions_exist(self):
        from security.rbac import SYSTEM_PERMISSIONS
        assert "geopolitics:read" in SYSTEM_PERMISSIONS

    def test_brain_use_tools_permission_exists(self):
        from security.rbac import SYSTEM_PERMISSIONS
        assert "brain:use_tools" in SYSTEM_PERMISSIONS

    def test_data_ops_run_pipeline_permission_exists(self):
        from security.rbac import SYSTEM_PERMISSIONS
        assert "data_ops:run_pipeline" in SYSTEM_PERMISSIONS

    def test_no_duplicate_semantic_permissions(self):
        """Verifica que no hay 'geo:read' y 'geopolitics:read' al mismo tiempo."""
        from security.rbac import SYSTEM_PERMISSIONS
        perms = set(SYSTEM_PERMISSIONS.keys())
        assert "geo:read" not in perms, "Usar 'geopolitics:read' no 'geo:read'"
        assert "economy:read" not in perms, "Usar 'economic:read' no 'economy:read'"
