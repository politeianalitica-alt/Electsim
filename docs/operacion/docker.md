# Docker

- **postgres**: imagen `timescale/timescaledb:latest-pg16`; monta `db/schema.sql` y `db/seeds/02_seeds.sql` en `docker-entrypoint-initdb.d`.
- **minio**: almacenamiento objeto compatible S3 (puertos 9000/9001).
- **prefect**: servidor UI en el puerto 4200 (opcional en desarrollo).

Tras el primer arranque, la base `electsim_espana` incluye extensiones Timescale y datos mínimos de referencia (CCAA, CIS, partidos).
