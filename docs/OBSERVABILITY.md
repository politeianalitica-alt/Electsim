# Observabilidad — ElectSim

## Stack (Bloque 7)

```
App (Python)
  ↓ OTLP gRPC :4317
OTel Collector
  ├── Trazas → Tempo (retención 72h)
  ├── Métricas → Prometheus (retención 30d)
  └── Logs → Loki (retención 7d)
              ↓
            Grafana (dashboards + alertas)
```

## Inicialización

```python
# En startup de FastAPI/worker:
from observability.logging import configure_logging
configure_logging()  # Lee LOG_FORMAT y LOG_LEVEL del entorno
```

## Logging estructurado

```python
from observability.logging import get_logger

log = get_logger("services.mi_servicio")
log.info("item_procesado", source_id="boe", items=42, latency_ms=120.5)
log.warning("rate_limit", service="litellm", retry_after=5)
log.error("db_error", query="SELECT...", error="timeout")
```

Campos automáticos: `timestamp`, `level`, `component`, `trace_id`, `span_id`.
Sin PII: no loguear prompts, respuestas LLM ni datos de usuario.

## Métricas

```python
from observability.metrics import ETLMetrics, LLMMetrics, APIMetrics, measure_ms

# ETL
ETLMetrics.record_step(source_id="boe", step="ner", success=True, duration_ms=120.0)

# LLM
LLMMetrics.record_call(model="electsim-fast", task_type="classification",
                        tokens_in=120, tokens_out=40, latency_ms=350.0)

# API (automático via RequestLoggingMiddleware)
APIMetrics.record_request(route="/api/alerts", method="GET",
                          status_code=200, latency_ms=45.0)

# Medir tiempo
with measure_ms() as t:
    result = do_work()
print(f"Tardó {t.elapsed_ms:.1f}ms")
```

## Trazas

```python
from observability.otel import get_tracer

_tracer = get_tracer(__name__)

def my_function():
    with _tracer.start_as_current_span("mi.operacion") as span:
        span.set_attribute("param.key", "value")
        do_work()
```

## Dashboards Grafana

| Dashboard | URL | Descripción |
|-----------|-----|-------------|
| Command Center | `/d/electsim-command-center` | API + ETL overview |
| LLM Quality | `/d/electsim-llm-quality` | Latencia, tokens, eval scores |

Acceso: http://localhost:3000 (dev, sin auth)

## Alertas SLO

| Alerta | Condición | Severidad |
|--------|-----------|-----------|
| `APILatencyP95High` | P95 > 500ms por 5min | warning |
| `APILatencyP99Critical` | P99 > 2s por 2min | critical |
| `APIErrorRateHigh` | error_rate > 5% por 3min | critical |
| `LLMLatencyP95High` | P95 > 10s por 5min | warning |
| `LLMQualityScoreLow` | avg_score < 0.6 por 15min | warning |
| `ETLErrorRateHigh` | error_rate > 5% por 10min | warning |

## Tests en CI

```bash
OTEL_SDK_DISABLED=true pytest tests/test_observability/ -v
```

Todos los tests del módulo usan NoOp providers (sin red, sin exportadores).
