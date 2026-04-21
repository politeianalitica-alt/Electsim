# Migraciones del esquema

El DDL inicial se aplica con `db/schema.sql` (init Docker). Los modelos ORM viven
en `db/models.py` y `env.py` ignora tablas solo presentes en BD para no generar
`DROP` accidentales (Timescale, tablas no modeladas).

## Estrategia oficial

- `db/migrations/versions/*.py` es la unica via canónica para cambios futuros.
- `alembic upgrade head` es el comando operativo para actualizar cualquier entorno.
- `db/migrations/*.sql` queda como bootstrap/manual legacy congelado para
  recuperaciones o entornos historicos.
- `sql/migrations/*.sql` queda archivado y no debe ser referenciado por código
  runtime ni por nueva documentación.

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

## Scripts legacy

Los scripts SQL heredados se mantienen solo por compatibilidad y trazabilidad
historica. Si un flujo runtime todavia depende de uno de ellos, debe migrarse a
una revision Alembic antes de ampliar o modificar el esquema.
