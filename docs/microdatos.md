# Microdatos propios (CIS/cliente)

Esta capa permite cargar microdatos locales para:

- alimentar `microdatos_encuesta`,
- construir cohortes multidimensionales,
- medir asociaciones con intención de voto (χ² y Cramér's V),
- poblar `microdatos_ai_pool` para prompts/personas de IA,
- actualizar `perfiles_votante` con datos reales.

## Carpeta origen

Por defecto:

`/Users/antoniolegaz/Downloads/Politeria/Microdatos`

Soporta:

- `*.csv` (prioriza `*_num.csv`),
- `*.sav` (si `pyreadstat` está instalado),
- `*.dta`,
- `*.xlsx`.

## Ejecución por terminal

```bash
cd "/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2"
./.venv/bin/python -m etl.ingest_microdatos --source "/Users/antoniolegaz/Downloads/Politeria/Microdatos"
```

Opcional (limitar volumen de prueba):

```bash
./.venv/bin/python -m etl.ingest_microdatos --source "/Users/antoniolegaz/Downloads/Politeria/Microdatos" --max-files 20
```

## Ejecución desde dashboard

Pestaña `Agentes LLM` → subpestaña `Microdatos Reales`:

1. Define carpeta de microdatos.
2. Pulsa `Ingerir microdatos`.
3. Revisa:
   - resumen del run,
   - asociaciones predictor→voto,
   - cohortes,
   - pool IA,
   - perfiles de usuario guardados en BD.

## Tablas nuevas

- `microdatos_cis_raw`
- `microdatos_cohortes`
- `microdatos_asociaciones`
- `microdatos_ai_pool`
- `perfil_usuario_custom`

En entornos gestionados, la vía oficial es `alembic upgrade head`. El script
`db/migrations/0010_microdatos_pipeline.sql` se conserva solo como bootstrap
manual legado para recuperaciones o instalaciones antiguas.
