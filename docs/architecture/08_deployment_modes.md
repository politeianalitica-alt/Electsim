# Modos de Despliegue

## Variables clave

| Variable | Dev | Prod |
|----------|-----|------|
| `DEV_MODE` | `true` | `false` |
| `DATABASE_URL` | postgresql://localhost/dev | postgresql://prod/electsim |
| `AUTH_REQUIRED` | `false` | `true` |
| `FEATURE_RBAC` | `false` | `true` |
| `OTEL_SDK_DISABLED` | `true` | `false` |
| `LOG_FORMAT` | `text` | `json` |
| `ELECTSIM_TENANT_ID` | `default` | ID real del tenant |

## Comportamiento por modo

### DEV_MODE=true
- Permisos: todos permitidos (RBAC bypasseado)
- Brain tools: todas disponibles
- Tenant: "default"
- DB: puede no existir (fallback silencioso)
- Auth: no requerida

### DEV_MODE=false (producción)
- Permisos: RBAC estricto
- Brain tools: solo con permiso
- Tenant: obligatorio
- DB: obligatoria (sin DB = error visible, no silencioso)
- Auth: JWT requerida

## Checklist de despliegue

Ver `security/deployment_checks.py` y `core/health.py`.

```bash
# Verificar
python scripts/check_schema_contracts.py
python -m core.health

# Migrar
alembic upgrade head

# Tests integración
pytest tests/integration/ -m integration
```
