# Modos de Datos: Real / Demo / Fallback / Unavailable / Error

## Modelo

Ver `core/service_result.py` → `ServiceResult[T]` con campo `mode: DataMode`.

## Modos

| Modo | Descripción | Icono |
|------|-------------|-------|
| real | Datos de PostgreSQL activos | 🟢 |
| demo | Datos de demostración estáticos | 🟡 |
| fallback | DB no disponible, usando memoria | 🟠 |
| unavailable | Tabla o servicio no disponible | ⚫ |
| error | Error inesperado | 🔴 |
| stale | Datos desactualizados (> umbral) | 🟤 |

## Cómo un service reporta su modo

```python
from core.service_result import ServiceResult

def cargar_crm_kpis(tenant_id: str) -> ServiceResult[dict]:
    try:
        conn = get_db_connection()
        # ... query ...
        return ServiceResult.ok_real(data, source="postgres.crm_contacts")
    except TableNotFoundError:
        return ServiceResult.err_unavailable({}, table="crm_contacts")
    except Exception as exc:
        return ServiceResult.err_db({}, exc)
```

## Visualización en UI

En D10/N9, cada módulo muestra su modo con `data_mode_badge()`:

```python
from dashboard.ui.badges import data_mode_badge
badge = data_mode_badge("real", inline=True)  # → 🟢 REAL badge HTML
```

## Regla de degradación

```
1. PostgreSQL disponible + tabla existe → REAL
2. PostgreSQL disponible + tabla falta → UNAVAILABLE (correr migraciones)
3. PostgreSQL no disponible + hay cache → FALLBACK
4. Sin nada → DEMO (datos estáticos de ejemplo)
5. Error inesperado → ERROR
```
