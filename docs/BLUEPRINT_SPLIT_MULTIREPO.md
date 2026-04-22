# Blueprint de Split Multi-repo (preparación)

## Objetivo
Separar el monolito en dominios mantenibles sin romper operación actual.

## Repos destino
- `electsim-domain`
- `electsim-microdata`
- `electsim-pipelines`
- `electsim-analytics`
- `electsim-agents`
- `electsim-infra`
- `electsim-docs`
- `electsim-ui` (dashboard + gateway API)

## Matriz de movimiento
- `db/`, `ontology/`, `models/` -> `electsim-domain`
- `etl/`, `pipelines/` -> `electsim-pipelines`
- `agents/` -> `electsim-agents`
- `analytics/`, `compute/` -> `electsim-analytics`
- `docker/`, `docker-compose.yml` -> `electsim-infra`
- `docs/`, `mkdocs.yml` -> `electsim-docs`
- `dashboard/`, `app.py`, `api/` -> `electsim-ui`

## Interfaces entre repos
- `electsim-domain` expone modelos/esquemas SQLAlchemy + cliente de sesión.
- `electsim-pipelines` consume `electsim-domain` para escribir/leer datos.
- `electsim-ui` consume `electsim-domain` (lectura) y `electsim-agents`/`electsim-analytics` vía API.
- `electsim-infra` define imágenes y despliegues de todos los repos.

## Criterios GO para ejecutar split
1. Entorno reproducible fijado en Python 3.11 y lockfile estable.
2. Una sola capa de acceso BD (`db/session.py`) en monolito.
3. Validación mínima integrada en ETL crítico.
4. Smoke tests de Streamlit/API/ETL en verde.

## Fases de split sugeridas
1. `electsim-domain`
2. `electsim-pipelines`
3. `electsim-agents` + `electsim-analytics`
4. `electsim-infra` + `electsim-docs`
5. `electsim-ui`
