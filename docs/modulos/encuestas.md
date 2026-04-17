# Encuestas y microdatos

- Metadatos: `fuentes_encuesta`, `encuestas`, `preguntas_encuesta`.
- Individuales: `microdatos_encuesta`, `respuestas_encuesta`, `resultados_agregados_encuesta`.

Los extractores CIS leen `.sav` con `pyreadstat` y aplican el mapeo en `etl/sources/cis_barometro.py`.
