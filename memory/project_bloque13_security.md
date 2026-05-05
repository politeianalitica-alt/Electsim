# Bloque 13 — Security, Tenant & Deployment Core

## Objetivo
Convertir ElectSim en una plataforma enterprise-ready con seguridad real:
autenticación, RBAC, auditoría, clasificación de datos, PII, secretos,
deployment checks y guardrails para el Brain LLM.

## Principio clave
**DEV_MODE=true** (por defecto local) relaja TODAS las restricciones.
**DEV_MODE=false** (producción) activa auth, RBAC, audit y controles.
Nunca rompe la app en dev — degradación siempre graciosa.

## Archivos creados

### security/ (17 módulos)

| Archivo | Contenido |
|---------|-----------|
| `__init__.py` | Package init |
| `schemas.py` | 10 modelos Pydantic: User, Tenant, Workspace, Role, Permission, AuditEvent, DataClassification, SecretReference, ExportJob, SecurityCheckResult + Enums |
| `settings.py` | SecuritySettings singleton: lee 15+ env vars, proporciona get_dev_user(), get_default_tenant() |
| `password.py` | hash_password/verify_password (bcrypt via passlib, fallback SHA-256), generate_api_token, is_strong_password |
| `jwt.py` | create_access_token, decode_token, is_token_valid (PyJWT opcional) |
| `auth.py` | get_current_user, get_current_user_from_streamlit, require_permission, require_role, login_with_password |
| `sessions.py` | init_session, get_session_user, set_session_user, clear_session, is_session_valid, require_login |
| `rbac.py` | 9 roles de sistema + SYSTEM_PERMISSIONS, has_permission, get_user_roles, get_effective_permissions, assign_role, revoke_role |
| `tenants.py` | get_tenant, get_default_tenant, list_tenants, create_tenant, check_tenant_feature, get_tenant_context |
| `audit.py` | log_audit_event, log_login, log_export, log_brain_tool, log_permission_denied, get_recent_events, get_audit_summary |
| `data_classification.py` | classify_resource, get_classification, get_effective_level, can_export, list_classifications, auto_classify_text |
| `pii.py` | detect_pii (11 patrones regex: email, phone, DNI/NIE, IBAN, CC, IP, postal), redact_pii, check_and_act |
| `secrets.py` | check_secret, check_all_secrets, get_secrets_summary, register_secret (SECRET_REGISTRY con 11 secretos) |
| `deployment_checks.py` | run_all_checks (14 checks), get_security_score |
| `export_controls.py` | can_export, create_export_job, approve_export_job, get_export_job, list_export_jobs |
| `ai_guardrails.py` | check_tool_access, analyze_prompt (15 patrones de riesgo), guardrail_check, get_allowed_tools_for_user |
| `policies.py` | can_access_module, can_access_resource, enforce_module_access, get_visible_modules, apply_tenant_filter |
| `middleware.py` | security_context, require_module_access (decorador), log_page_access, render_security_badge, get_request_ip |

### db/migrations/versions/
- `0050_security_core.py` — 9 tablas: tenants, users, workspaces, roles, user_roles, audit_events, data_classifications, api_tokens, export_jobs. RLS en users.

### dashboard/services/
- `security_core.py` — 10 funciones: cargar_usuarios, cargar_tenants, cargar_workspaces, cargar_roles, cargar_audit_events, cargar_security_kpis, cargar_data_classifications, cargar_export_jobs, cargar_deployment_checks, cargar_secret_status

### dashboard/components/
- `security_components.py` — render_user_card, render_tenant_card, render_role_matrix, render_audit_event_card, render_secret_status_panel, render_deployment_check_panel, render_data_classification_badge, render_export_job_panel

### Páginas adaptadas
- `dashboard/pages/N9_Command_Center.py` — Tab 10 🔒 Seguridad añadido (6 sub-tabs: Auditoría, Secretos, Deployment, Usuarios, Roles, Exports)
- `dashboard/pages/D10_Workspace.py` — Tab 🔒 SEGURIDAD añadido con security posture summary

### agents/tools/
- `security_tools.py` — 6 herramientas: get_security_status, get_current_user_permissions, get_audit_summary, get_deployment_security_checks, get_secret_configuration_status, explain_access_to_object

### pipelines/
- `security_core.py` — CLI con 7 comandos: --seed-roles, --seed-default-tenant, --create-admin, --check-secrets, --deployment-checks, --audit-summary, --source all

### tests/
- `test_security_core.py` — 59 tests / 59 pasando

## 9 Roles del sistema

| Rol | Descripción |
|-----|-------------|
| super_admin | Acceso total a toda la plataforma y todos los tenants |
| platform_admin | Admin de plataforma sin acceso cross-tenant |
| senior_analyst | Analista con capacidades completas incluyendo simulación |
| analyst | Analista con lectura y análisis básico |
| campaign_manager | Gestor de campañas electorales |
| data_operator | Operador de pipelines y datos |
| client_viewer | Solo lectura de datos propios del cliente |
| security_admin | Admin de seguridad y auditoría |
| read_only | Solo lectura de módulos públicos |

## 14 Deployment Checks

| Check | Categoría | Severidad |
|-------|-----------|-----------|
| dev_mode | auth | critical |
| jwt_secret | auth | critical |
| default_passwords | auth | critical |
| secret_placeholders | secrets | critical |
| https | network | high |
| database_url | database | high |
| audit_logging | compliance | high |
| rls_enabled | data | high |
| allowed_hosts | network | medium |
| debug_flags | network | medium |
| security_deps | compliance | medium |
| python_version | compliance | medium |
| cors | network | medium |
| log_level | compliance | low |

## Variables de entorno clave

| Variable | Default | Descripción |
|----------|---------|-------------|
| ELECTSIM_DEV_MODE | true | Modo desarrollo (relaja restricciones) |
| ELECTSIM_AUTH_REQUIRED | auto | Auth obligatoria |
| ELECTSIM_API_JWT_SECRET | — | Secreto JWT (obligatorio en prod) |
| ELECTSIM_DEFAULT_CLIENTE_ID | default | ID del tenant por defecto |
| ELECTSIM_FEATURE_MULTICLIENTE | false | Activar multi-tenant |
| ELECTSIM_FEATURE_RBAC | false | Activar RBAC |
| ELECTSIM_FEATURE_AUDIT | auto | Activar audit logging |
| ELECTSIM_FEATURE_EXPORT_CONTROLS | false | Activar control de exportaciones |
| ELECTSIM_FEATURE_PII_DETECTION | false | Activar detección PII |
| ELECTSIM_FEATURE_AI_GUARDRAILS | false | Activar guardrails Brain |
| ELECTSIM_PII_ACTION | warn | Acción PII: warn/redact/block |

## Tests: 59/59 passing
