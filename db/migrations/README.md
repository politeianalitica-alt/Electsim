# Migraciones Alembic

El DDL inicial se aplica con `db/schema.sql` (init Docker). Los modelos ORM viven en `db/models.py` y `env.py` ignora tablas solo presentes en BD para no generar `DROP` accidentales (Timescale, tablas no modeladas).

## Baseline (esquema ya creado)

```bash
cd electsim-espana
export DATABASE_URL=postgresql+psycopg://electsim:password@localhost:5432/electsim_espana
alembic stamp 0001_baseline
```

## Cambios futuros

```bash
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
```

Revise siempre el diff autogenerado antes de aplicar.
