# ETL Pipelines — ElectSim

## Fuentes de datos

| Fuente | Tipo | Frecuencia | Módulo |
|--------|------|-----------|--------|
| BOE | Legislativo | Diario | `legislative_core` |
| BOCG | Legislativo | Diario | `legislative_advanced` |
| Congreso | Iniciativas | Diario | `legislative_core` |
| Senado | Sesiones | Semanal | `legislative_advanced` |
| RSS medios | Noticias | 15min | `media_narrative` |
| CIS | Encuestas | Mensual | `electoral_core` |
| Microdatos electorales | Electoral | Por elección | `electoral_core` |
| OSINT geopolítico | Geopolítica | 6h | `geopolitics` |
| ACLED | Conflictos | Diario | `geopolitics` |

## Pipeline NLP (pasos por item)

```
1. Extracción (HTTP/RSS/PDF)
2. Limpieza (normalize_text)
3. Detección de idioma
4. NER (entidades: PER, ORG, LOC, PARTY, NORM)
5. Clasificación de tipo de contenido
6. Análisis de sentimiento
7. Embedding (nomic-embed-text via Ollama)
8. Deduplicación (hash de contenido + similaridad vectorial)
9. Indexación en PostgreSQL + pgvector
```

## Métricas ETL (OTel)

```python
ETLMetrics.record_step(source_id="boe", step="ner", success=True, duration_ms=120.0)
```

Métricas disponibles:
- `electsim.etl.items_processed` (counter)
- `electsim.etl.errors` (counter)
- `electsim.etl.duplicates` (counter)
- `electsim.etl.pipeline_duration_ms` (histogram)

## Intelligence Layer Jobs

| Job | Descripción | Trigger |
|-----|-------------|---------|
| `morning_briefing` | Briefing ejecutivo matutino | 07:00 CET |
| `risk_scoring` | Actualizar scores de riesgo | Cada 4h |
| `narrative_tracker` | Identificar clusters narrativos | Cada 2h |
| `alert_engine` | Evaluar condiciones de alerta | Cada 15min |

## Scheduling

Los jobs corren via APScheduler (dev) o Celery Beat (producción).
Ver `scheduler/` para configuración actual.
