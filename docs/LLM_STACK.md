# LLM Stack — ElectSim

## Arquitectura

```
LLMClient (services/llm_client.py)
    ↓
LiteLLM Proxy (http://litellm-proxy:4000)
    ├── vLLM → electsim-analysis (Qwen 72B, 128K ctx)
    ├── vLLM → electsim-fast (Qwen 14B, latencia baja)
    └── Ollama → electsim-embed (nomic-embed-text)
         (fallback directo si LiteLLM no disponible)
```

## Routing de modelos

| Task Type | Modelo | Latencia objetivo |
|-----------|--------|------------------|
| `analysis`, `plan` | electsim-analysis (72B) | <30s |
| `classification`, `summary` | electsim-fast (14B) | <5s |
| `chat` | electsim-analysis (72B) | <30s |
| Contexto >16K tokens | electsim-analysis (72B) | — |
| Embeddings | electsim-embed | <1s |

## API de uso

```python
from services.llm_client import get_llm_client

client = get_llm_client()

# Análisis estructurado (retorna Pydantic model)
result = await client.analyze_structured(
    prompt="Analiza el riesgo...",
    schema=MyOutputSchema,
    task_type="analysis",
)

# Chat libre
text = await client.chat(messages=[{"role": "user", "content": "..."}])

# Clasificación rápida
result = await client.classify(text="...", schema=CategorySchema)
```

## Prompts (packages/prompts/)

```python
from packages.prompts import load_prompt, render_prompt

template = load_prompt("intelligence.morning_briefing")
text = render_prompt(template, date="2026-05-01", org_context="Demo Corp")
result = await client.analyze_structured(text, schema=BriefingSchema)
```

## Eval Pipeline (B7)

El 5% de las llamadas LLM se evalúan automáticamente con LLM-as-judge:
- **coherence**: ¿El texto tiene estructura lógica?
- **relevance**: ¿La respuesta es relevante al prompt?
- **factuality**: ¿Hay alucinaciones evidentes?

Scores almacenados en `llm_eval` tabla y exportados como métrica OTel.

```python
from services.llm_eval import LLMEvalService

svc = LLMEvalService(session)
trace_id = svc.log_trace(model="electsim-fast", task_type="classification", ...)
if svc.should_eval(trace_id):
    await svc.run_eval(trace_id, prompt=..., response=...)
```

## Configuración

```env
LITELLM_BASE_URL=http://litellm-proxy:4000
LLM_MODEL_ANALYSIS=electsim-analysis
LLM_MODEL_FAST=electsim-fast
LLM_MODEL_EMBED=electsim-embed
LLM_EVAL_SAMPLE_RATE=0.05
```
