# API Guide — ElectSim

## Autenticación

Todas las rutas (excepto `/health`) requieren un JWT Bearer token:

```http
Authorization: Bearer <token>
```

El token debe contener claims:
- `sub`: user_id
- `org_id`: UUID de la organización
- `workspace_id`: UUID del workspace
- `role`: uno de `ORG_ADMIN`, `ANALYST_SENIOR`, `ANALYST_JUNIOR`, `VIEWER`, `API_SERVICE`

En modo desarrollo (`DEV_MODE=true`), se usa un usuario ficticio sin validar JWT.

## Tenancy y RLS

Cada request activa automáticamente:
```sql
SET LOCAL app.current_user_id = '<user_id>';
SET LOCAL app.current_org_id = '<org_id>';
SET LOCAL app.current_workspace_id = '<workspace_id>';
```

Las políticas RLS de PostgreSQL usan estos valores para aislar datos.

## Endpoints clave

### Workspace

```
GET  /workspaces/me/config       — Configuración completa del workspace
GET  /workspaces/me/modules      — Módulos activos
GET  /workspaces/me/alerts       — Configuración de alertas
GET  /workspaces/me/searches     — Saved searches
```

### Provisioning (solo ORG_ADMIN)

```
POST /admin/organisations        — Crear organización
POST /admin/workspaces/{id}/dlc  — Aplicar DLC
POST /admin/workspaces/{id}/members — Añadir miembro
```

## Control de módulos

Los módulos se activan por producto. Para requerir un módulo en un endpoint:

```python
from api.modules import require_modules

@router.get("/electoral/nowcast")
async def get_nowcast(
    modules: list[str] = Depends(require_modules("electoral_nowcasting"))
):
    ...
```

## Roles y permisos

```python
from api.auth import require_role

@router.post("/admin/provisioning")
async def provision(
    user: AuthenticatedUser = Depends(require_role(["ORG_ADMIN"]))
):
    ...
```

## Versionado

La API actualmente no versiona por URL. El plan para v2:
- Prefijo `/v2/` en todas las rutas nuevas con cambios breaking
- Soporte paralelo durante 3 meses
- Deprecation notices en headers `Sunset` y `Deprecation`

## Observabilidad

Cada request emite:
- Log JSON estructurado (via `RequestLoggingMiddleware`)
- Métrica `electsim.api.requests` y `electsim.api.latency_ms`
- Atributos de tenant en el span OTel activo

## Rate limiting (pendiente B9)

Pendiente implementación. Plan:
- Por `org_id`: 1000 req/min en plan Pro, 5000 en Enterprise
- Por endpoint costoso (LLM): 100 req/min
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`
