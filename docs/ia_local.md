# IA local Politeia

La capa `agents.local_intelligence` convierte salidas de scrapers en conocimiento consultable:

- carga CSV, JSON, JSONL/NDJSON, Parquet, TXT y HTML;
- clasifica cada documento en dominios electoral, política, economía, social, institucional o medios;
- extrae partidos, personas, organizaciones, lugares, métricas, eventos y temas;
- genera hechos normalizados y un grafo ontológico local;
- expone búsqueda, chatbot y acciones por FastAPI.

## Inspiración de `gits amigos`

La implementación adopta patrones útiles de los repos locales sin copiar dependencias pesadas:

- OSINT/news crawling: normalización flexible de salidas de scrapers.
- `group_mention_detection`, NER y análisis de prensa: detección local de entidades y grupos.
- `rdflib`/knowledge graph, `FinDKG` y `ERKG`: hechos sujeto-predicado-objeto y grafo de entidades.
- `anything-llm`, `Local-NotebookLM`, `ollama`: RAG local con LLM opcional.
- `dbt`/Great Expectations/Prefect: trazabilidad, almacenamiento reproducible y resultados auditables.

## Uso local

```bash
python -m agents.local_intelligence ingest data/raw --max-records 500
python -m agents.local_intelligence summary
python -m agents.local_intelligence search "encuesta vivienda paro"
python -m agents.local_intelligence chat "¿Qué señales electorales y económicas son relevantes?" --no-llm
```

## Motor IA operativo

El cerebro local común vive en `agents.ai_engine` y se usa desde API, dashboard, pipelines y scrapers:

- Ollama como LLM local (`politeia-brain:latest`) para razonamiento y chatbot.
- `nomic-embed-text` vía Ollama para embeddings locales sin API externa.
- ChromaDB persistente en `data/processed/chroma_store` como memoria vectorial.
- spaCy en español para entidades políticas, institucionales y territoriales.
- `cardiffnlp/twitter-xlm-roberta-base-sentiment` como sentimiento multilingüe, con fallback léxico.

Reindexar documentos ya ingeridos hacia la memoria semántica:

```bash
python - <<'PY'
from dataclasses import asdict
from agents.ai_engine import get_ai_engine
from agents.local_intelligence import get_local_store

store = get_local_store()
docs = [asdict(doc) for doc in store.documents.values()]
print(get_ai_engine().upsert_documents(docs))
print(get_ai_engine().status())
PY
```

Variables de control:

```bash
export ELECTSIM_AI_EMBEDDING_BACKEND=ollama
export ELECTSIM_AI_SEMANTIC_SEARCH=1
export ELECTSIM_AI_VECTOR_SYNC=1
export ELECTSIM_AI_ENRICH_SCRAPERS=1
export ELECTSIM_AI_REASON_PIPELINES=1
export ELECTSIM_SENTIMENT_BACKEND=auto
```

## Gerente backend con `gits amigos`

El agente `agents.backend_manager` es la IA gerente funcional del backend. Usa:

- LLM configurable por Ollama, OpenAI, Anthropic o stub;
- índice local de `gits amigos`;
- herramientas read-only sobre el backend actual (`git status`, rutas API y búsqueda de código);
- memoria local de scrapers y ontología.

Indexar la carpeta completa:

```bash
python -m agents.git_amigos_indexer build
python -m agents.git_amigos_indexer summary
```

Modo rápido si se quiere arrancar en segundos, leyendo documentación y metadatos principales:

```bash
python -m agents.git_amigos_indexer build --docs-only --max-files-per-repo 80
```

Chat por CLI:

```bash
python -m agents.backend_manager chat "Qué repos de gits amigos debo usar para el chatbot local del backend?"
python -m agents.backend_manager chat "Diseña la integración de scrapers electorales" --provider ollama
python -m agents.backend_manager chat "Resume opciones OSINT" --no-llm
```

Variables útiles:

```bash
export ELECTSIM_BACK_MANAGER_PROVIDER=ollama
export ELECTSIM_OLLAMA_MODEL=politeia-brain:latest
export ELECTSIM_OLLAMA_NUM_CTX=8192
export ELECTSIM_OLLAMA_KEEP_ALIVE=30m
export OLLAMA_BASE_URL=http://localhost:11434
```

También se puede usar `ELECTSIM_BACK_MANAGER_PROVIDER=openai` o `anthropic` si las claves `OPENAI_API_KEY` o `ANTHROPIC_API_KEY` están configuradas.

Por defecto guarda en `data/processed/ai_knowledge/`. Se puede cambiar con:

```bash
export ELECTSIM_AI_STORE=/ruta/a/store
```

Para usar LLM local:

```bash
export ELECTSIM_LOCAL_AI_PROVIDER=ollama
export ELECTSIM_OLLAMA_MODEL=politeia-brain:latest
ollama serve
```

Si Ollama o el proveedor configurado no responde, el chatbot devuelve una síntesis heurística basada en la evidencia local.

Reparación/arranque completo de Ollama para Politeia:

```bash
python bin/setup_ollama_brain.py
```

Ese script instala Ollama con Homebrew si falta, arranca `brew services start ollama`, descarga `qwen2.5:7b` y `nomic-embed-text`, crea el modelo local `politeia-brain:latest`, actualiza `.env` y ejecuta una prueba contra `http://localhost:11434/api/chat`.

## API

Con `ELECTSIM_DEV_MODE=true` para desarrollo:

```bash
uvicorn api.main:app --reload
```

Endpoints principales:

- `POST /ai/ingest/path`
- `POST /ai/ingest/records`
- `POST /ai/search`
- `GET /ai/search?q=...`
- `POST /ai/chat`
- `GET /ai/engine/status`
- `POST /ai/engine/reindex-local`
- `POST /ai/insight`
- `GET /ai/ontology/summary`
- `GET /ai/manager/ui`
- `POST /ai/manager/chat`
- `GET /ai/manager/status`
- `POST /ai/manager/reindex-gits`

Ejemplo:

```bash
curl -X POST http://localhost:8000/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"Resume vivienda, paro y voto joven","use_llm":false}'
```

## Dashboard

La página `Cerebro Ollama` permite:

- conversar con el gerente Ollama del backend usando `gits amigos`, API y memoria local;
- ingerir rutas locales de scrapers;
- inspeccionar dominios, temas y tipos de nodo de la ontología.
