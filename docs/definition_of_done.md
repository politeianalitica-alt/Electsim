# Definition of Done — ElectSim

> Un módulo/bloque se considera **DONE** cuando cumple todos los criterios.
> Criterios obligatorios: 1-9. Criterios recomendados: 10-14.

## Checklist

### Obligatorios

- [ ] **1. Schemas**: Modelos Pydantic v2 en `<módulo>/schemas.py` o `etl/sources/<módulo>/schemas.py`
- [ ] **2. Migración**: `db/migrations/versions/NNNN_<módulo>.py` con columnas alineadas con schemas
- [ ] **3. Repository**: `<módulo>/repository.py` con create/get/list básicos, try/except en todo
- [ ] **4. Service**: Lógica de negocio en `<módulo>/<módulo>_service.py` (o similar)
- [ ] **5. Dashboard service**: `dashboard/services/<módulo>_core.py` con `cargar_*()` functions
- [ ] **6. Tests unitarios**: `tests/test_<módulo>_core.py` — pasan sin DB (in-memory fallback)
- [ ] **7. Tests integración**: `tests/integration/test_<módulo>_repository_postgres.py` — skip sin PostgreSQL
- [ ] **8. Permisos**: Permisos definidos en `security/rbac.py` y `core/module_registry.py`
- [ ] **9. Schema contract**: Columnas migración == campos schema Pydantic (verificar con `check_schema_contracts.py`)

### Recomendados

- [ ] **10. Audit**: Si modifica datos, registra en `audit_events`
- [ ] **11. Tenant**: Si maneja datos privados, filtra por `tenant_id` en todo acceso
- [ ] **12. Modo real/demo/fallback**: Dashboard service usa `ServiceResult` o informa modo
- [ ] **13. Documentación**: Entrada en `docs/architecture/01_module_registry.md`
- [ ] **14. Panel N9/D10**: Estado visible en Command Center o Centro de Operaciones
- [ ] **15. Brain tools**: Si tiene tools, autorizadas en `core/module_registry.py` TOOL_PERMISSIONS

## Estado de bloques

| Bloque | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|--------|---|---|---|---|---|---|---|---|---|----|----|----|----|----|----|
| CRM | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | — | ✅ | — | ✅ |
| Comms | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | ✅ |
| Security | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | — |
| Geopolitics | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | — | ✅ |
| Documents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | ✅ | — | ✅ |
| Simulation | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | ✅ |

**Leyenda**: ✅ Completo | ⚠️ Parcial | — Pendiente

> ⚠️ CRM: la migración 0054 alinea los contratos. Verificar con `check_schema_contracts.py` tras `alembic upgrade head`.
