# pysentimiento — Patrones extraídos

**Repo de referencia:** `gits amigos/pysentimiento-master/`
**Lenguaje:** Python (PyTorch + HuggingFace transformers)
**Licencia:** **NON-COMMERCIAL / scientific research only**
(`LICENSE.md`: "open-source library for non-commercial use and scientific research
purposes only. […] models are trained with third-party datasets and are subject
to their respective licenses").

> **Importante:** pysentimiento puede usarse para investigación interna, pero
> **no podemos integrarlo en SaaS comercial**. Las opciones son:
> 1. Usarlo solo en notebooks/research / pipelines internas no facturadas.
> 2. Reentrenar modelos propios sobre los mismos datasets pero con licencia
>    compatible (TASS y similares tienen licencias mixtas — revisar caso a caso).
> 3. Sustituir por modelos con licencia comercial (BETO base = MIT, RoBERTuito
>    base = MIT) + cabeza de clasificación entrenada por nosotros.

## API surface (referencia, no para producción)

Archivos clave:

- `pysentimiento-master/pysentimiento/analyzer.py` — `create_analyzer(...)`,
  registro `models` con todos los nombres HuggingFace por idioma/tarea
- `pysentimiento-master/pysentimiento/preprocessing.py` — `preprocess_tweet`
  (limpia menciones, URLs, emojis, hashtags)
- `pysentimiento-master/pysentimiento/sentiment.py`, `emotion.py`, `hate.py`,
  `irony.py`, `targeted_sa.py` — entrenamiento por tarea

Uso típico:

```python
from pysentimiento import create_analyzer

sentiment = create_analyzer(task="sentiment", lang="es")
out = sentiment.predict("Qué buena ley, por fin progresamos")
# AnalyzerOutput(output='POS', probas={'NEG': 0.02, 'NEU': 0.10, 'POS': 0.88})

hate = create_analyzer(task="hate_speech", lang="es")
out = hate.predict("[texto]")
# multilabel: out.output = ['hateful', 'targeted', 'aggressive'] (lista)
```

## Modelos usados (referencia HuggingFace)

Para español todos los registros apuntan a checkpoints `pysentimiento/robertuito-*`:

| Tarea | Modelo HF | Tamaño | Tipo |
|---|---|---|---|
| sentiment | `pysentimiento/robertuito-sentiment-analysis` | ~140 MB | 3-class POS/NEU/NEG |
| emotion | `pysentimiento/robertuito-emotion-analysis` | ~140 MB | 7 emociones (joy, anger, sadness, fear, disgust, surprise, others) |
| hate_speech | `pysentimiento/robertuito-hate-speech` | ~140 MB | multilabel (hateful, targeted, aggressive) |
| irony | `pysentimiento/robertuito-irony` | ~140 MB | binario |
| ner | `pysentimiento/robertuito-ner` | ~140 MB | PER, ORG, LOC, EVENT, PROD |
| pos | `pysentimiento/robertuito-pos` | ~140 MB | UD POS tags |
| targeted_sa | `pysentimiento/roberta-targeted-sentiment-analysis` | ~500 MB (BETO/RoBERTa-large) | sentiment hacia un target |
| context_hate | `piuba-bigdata/beto-contextualized-hate-speech` | ~440 MB | hate condicionado al tweet padre |

**RoBERTuito** = RoBERTa-base entrenado sobre 500M tweets en español
(licencia base MIT). Las cabezas de clasificación finetuneadas en TASS,
HatEval, etc. son las que arrastran restricciones non-commercial.

## Performance & footprint

- CPU: ~50-200 ms/inferencia con batch=1 en M2 / Xeon moderno; ~10-30 ms con
  batch=32.
- GPU: ~3-5 ms/inferencia. RoBERTuito-base cabe en 1 GB VRAM.
- Memoria RAM al cargar el analyzer: ~600 MB por tarea (modelo + tokenizer +
  pipeline). Cargar todas las tareas a la vez ≈ 4 GB RAM.

## Plan de migración para `analytics/sentiment_engine_v2.py`

El motor actual es **rule-based** (lexicón + heurísticas). Plan:

### Opción A — Investigación interna (corto plazo)
Usar pysentimiento detrás de un flag `RESEARCH_MODE` que no facture al cliente:

```python
# analytics/sentiment_engine_v2.py
from typing import Protocol
import os

class SentimentBackend(Protocol):
    def score(self, text: str) -> dict[str, float]: ...

class RuleBased:           # actual, comercial-safe
    def score(self, text): ...

class PySentimientoBackend:  # research-only
    def __init__(self):
        from pysentimiento import create_analyzer
        self._a = create_analyzer(task="sentiment", lang="es")
    def score(self, text):
        out = self._a.predict(text)
        return out.probas      # {'NEG': .., 'NEU': .., 'POS': ..}

def get_backend() -> SentimentBackend:
    if os.getenv("POLITEIA_RESEARCH_MODE") == "1":
        return PySentimientoBackend()
    return RuleBased()
```

### Opción B — Modelo propio con licencia comercial (medio plazo)
1. Tomar `PlanTL-GOB-ES/roberta-base-bne` (Apache-2.0) o `dccuchile/bert-base-spanish-wwm-uncased` (MIT) como base.
2. Finetunear sobre datasets con licencia compatible: SemEval-2017 task 4 (CC-BY),
   IberLEF emotion (revisar términos), datos propios anotados.
3. Servir vía vLLM o `transformers` directamente.

### Opción C — API externa con SLA (más rápido para producción)
- **Cohere Classify** (clasificación custom, comercial OK, ~$0.05/1k tokens).
- **OpenAI moderation + GPT-4o** para sentiment fino (más caro pero zero-ops).
- **Azure Cognitive Services** Text Analytics para sentiment ES.

## Patrón de preprocesado (reutilizable, comercial-safe)

`preprocessing.py` implementa heurísticas útiles que sí podemos adaptar:

- Sustitución de menciones por `@USER` / token configurable
- Sustitución de URLs por `http` o token configurable
- Demojización con `emoji.demojize` (envuelta en marcadores `[EMOJI]…[/EMOJI]`)
- Lowercasing opcional
- Reemplazo de hashtags por separación CamelCase → palabras

Estas son utilidades genéricas; reescribirlas idiomáticamente está bien (no son
copyright fuerte). El registro `models` con nombres HF se puede consultar pero
no copiar como tabla literal — los IDs de modelo son hechos públicos.

## Dependencias (si se usa en research)

```
torch>=2.0
transformers>=4.30
datasets>=2.10
pysentimiento>=0.7
emoji>=2.0
# opcional para acelerar:
accelerate>=0.20
optimum>=1.13
```

## Integración con observabilidad (cuando se entre en prod con backend propio)

```python
from observability.metrics import LLMMetrics

with LLMMetrics.timer("sentiment.predict", model="robertuito-es"):
    probas = backend.score(text)
LLMMetrics.record_classification("sentiment", label=max(probas, key=probas.get))
```

## Hallazgos / blockers

- **Blocker comercial:** licencia non-commercial. No usar en producción facturada
  sin sustituir modelo o tener acuerdo con autores (Pérez et al., UBA-PLN).
- **Datos de entrenamiento:** TASS (los corpora ES) tienen ToS restrictivos.
  Para reentrenar comercialmente conviene usar SemEval-2017 (CC-BY) o
  generar dataset interno.
- El registro `models` documenta exactamente qué checkpoint usar para cada
  combinación (lang × task) — útil como referencia incluso si no usamos el
  paquete.
- `AnalyzerOutput` usa convenio claro: `output` = label top1 (o lista en
  multilabel), `probas` = dict completo. Replicar este contrato en nuestro
  backend simplifica la migración.
