# packages/ontology

Modelo de dominio y repositorios de datos para ElectSim.

## Contenido

```
src/
  models/           ← SQLAlchemy ORM models (importados desde db/models.py durante migración)
  repositories/     ← Repositorios de alto nivel por entidad
    actor_repo.py
    media_repo.py
    legislative_repo.py
    electoral_repo.py
    workspace_repo.py
  schemas/          ← Pydantic schemas para serialización
```

## Estado de migración

Durante el Bloque 8, `db/models.py` es la fuente de verdad.
Este paquete irá recibiendo los modelos y repositorios progresivamente.

## Dependencias permitidas

- `packages/types` (solo)
- `sqlalchemy`, `pydantic`
- NO: `packages/nlp`, `packages/electoral`, `apps/*`
