# Política de Brain Tools

## Principio

Brain (N8) puede ejecutar tools para acceder a datos y generar respuestas.
Cada tool requiere un permiso explícito. Sin permiso, la tool no se ejecuta.

## Autorización

Ver `agents/tool_authorizer.py` y `core/module_registry.py` (TOOL_PERMISSIONS).

## Mapeo tool → permiso

| Tool | Permiso requerido |
|------|-------------------|
| search_contacts | crm:read |
| get_contact_profile | crm:read |
| prepare_meeting_pack | crm:read |
| generate_linkedin_post | comms:create |
| generate_twitter_thread | comms:create |
| fetch_acled_events | geopolitics:read |
| get_country_risk | geopolitics:read |
| run_pipeline | data_ops:run_pipeline |
| get_audit_events | audit:read |
| run_deployment_check | security:admin |

## Modo dev

En `DEV_MODE=true`: todas las tools se permiten con warning en log.
En producción: el bloqueo es estricto.

## Resultado denegado

```python
{
    "error": "Usuario 'user_id' no tiene permiso 'crm:read' para tool 'search_contacts'",
    "code": "TOOL_NOT_AUTHORIZED"
}
```

## Auditoría

Toda llamada a Brain tool se registra en `audit_events` con:
- `resource_type = "brain_tool"`
- `resource_id = tool_name`
- `action = "execute"`
- `result = "ok" | "denied" | "error"`
