# Guía para Desarrolladores

## Antes de añadir código nuevo

1. Leer `CLAUDE.md` — arquitectura y reglas de dependencias.
2. Verificar en `core/module_registry.py` si el módulo existe.
3. Verificar en `docs/definition_of_done.md` qué se necesita para que esté "done".

## Patrones obligatorios

### Repository pattern
```python
# MAL: SQL en lógica de negocio
def get_contacts():
    conn = get_db_connection()
    cur.execute("SELECT * FROM crm_contacts")

# BIEN: Repository separado
class CRMRepository:
    def list_contacts(self, tenant_id: str) -> list[dict]: ...
```

### ServiceResult
```python
# MAL: return [] (silencioso)
except Exception:
    return []

# BIEN: ServiceResult explícito
except Exception as exc:
    return ServiceResult.err_db([], exc, source="crm_contacts")
```

### Tenant obligatorio
```python
# MAL: sin tenant
contacts = repo.list_contacts()

# BIEN: siempre tenant
from security.tenant_context import require_tenant_id
tenant = require_tenant_id()
contacts = repo.list_contacts(tenant_id=tenant)
```

### Safe rendering
```python
# MAL: interpolar datos externos
st.markdown(f"<div>{contact['notes']}</div>", unsafe_allow_html=True)

# BIEN: escapar siempre
from dashboard.ui.safe_render import escape_user_text
safe_notes = escape_user_text(contact["notes"])
st.markdown(f"<div>{safe_notes}</div>", unsafe_allow_html=True)
```

### Brain tools con autorización
```python
# MAL: ejecutar tool directamente
result = tool_function(**args)

# BIEN: con autorización
from agents.tool_authorizer import authorized_tool_call
result = authorized_tool_call(tool_name, args, user=current_user)
```

## Estructura mínima de un módulo nuevo

```
<modulo>/
  __init__.py
  schemas.py       # Pydantic models
  repository.py    # DB access
  <modulo>_service.py  # Business logic

db/migrations/versions/NNNN_<modulo>.py
dashboard/services/<modulo>_core.py
dashboard/components/<modulo>_components.py
agents/tools/<modulo>_tools.py
tests/test_<modulo>_core.py
tests/integration/test_<modulo>_repository_postgres.py
```

## Comandos frecuentes

```bash
# Tests unitarios
.venv/bin/pytest tests/ -m "not integration" -q

# Tests integración (con PostgreSQL)
.venv/bin/pytest tests/integration/ -m integration -v

# Contratos schema<->DB
.venv/bin/python scripts/check_schema_contracts.py

# Lint
.venv/bin/ruff check . --fix && .venv/bin/ruff format .

# Migraciones
alembic upgrade head
alembic revision --autogenerate -m "descripcion"
```
