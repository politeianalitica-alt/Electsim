# ElectSim España

Digital twin de datos **ideológicos, sociales, económicos y políticos** de España.

Esta documentación cubre la **fase 1**: arquitectura de datos, esquema PostgreSQL/TimescaleDB, ETL y orquestación con Prefect.

## Inicio rápido

1. Copie `.env.example` a `.env` y ajuste credenciales.
2. `docker compose up -d postgres minio`
3. Instale dependencias: `pip install -r requirements.txt`
4. Ejecute tests: `pytest`

Para generar el sitio estático: `mkdocs serve` (desde la raíz del proyecto).
