# Modelo de Seguridad

## Capas

1. **Autenticación** (`security/auth.py`): JWT/SSO
2. **RBAC** (`security/rbac.py`): roles y permisos por módulo
3. **Tenant isolation** (`security/tenant_context.py`): datos por tenant
4. **Page guards** (`security/middleware.py`): acceso a páginas
5. **Tool authorizer** (`agents/tool_authorizer.py`): Brain tools
6. **Audit** (`security/audit.py`): trazabilidad

## Roles del sistema

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| super_admin | Todo | Todos |
| platform_admin | Gestión plataforma | Todos |
| tenant_admin | Gestión tenant | Todo en su tenant |
| analyst_senior | Analista sénior | Leer+escribir+exportar |
| analyst | Analista | Leer+escribir básico |
| viewer | Solo lectura | Solo lectura |
| brain_user | Uso Brain | brain:use_tools + lectura |
| data_ops | Operaciones datos | data_ops:* + pipeline:run |
| security_auditor | Auditoría | audit:read + security:read |

## Datos privados (requieren tenant)

- CRM: contactos, organizaciones, interacciones, tareas
- Comunicaciones: content_assets, message_frames, distribution_lists
- Documentos: source_documents, document_chunks
- Simulaciones: scenarios
- Workspace: saved_views, widget_configs

## Datos públicos (sin tenant)

- BOE, INE, Eurostat (open data)
- ACLED/GDELT público
- Resultados electorales públicos
- Legislación pública

## Clasificación de datos

| Nivel | Ejemplo | Quién accede |
|-------|---------|--------------|
| public | Datos INE, BOE | Todos |
| internal | Análisis interno | Usuarios tenant |
| client_confidential | Estrategia cliente | Analistas + admin |
| sensitive | PII, nóminas | Solo admin |
| restricted | Secretos, tokens | Solo super_admin |
