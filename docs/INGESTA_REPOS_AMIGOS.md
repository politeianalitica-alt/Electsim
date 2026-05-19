# Repos amigos · Mapeo técnico para el pipeline de ingesta de Politeia

> **Audiencia**: ingeniería de datos / NLP de Politeia.
> **Premisa**: el código ajeno es 80 % inútil y 20 % oro. Este informe separa lo uno de lo otro.
> **Inventario base**: 330 carpetas en `/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/gits amigos/`.
> **Foco**: qué resuelve cada repo para nuestras 7 fases de ingesta (conectores → orquestación → análisis político).
> Las menciones a archivos concretos son rutas relativas al repo amigo, no a Politeia.

---

## 1. Inventario por fase del pipeline

### Fase 1 · Conectores de fuentes

| Repo (carpeta) | Tecnología clave | Aporte real para Politeia | Esfuerzo | Prioridad |
|---|---|---|---|---|
| `MCP-BOE-main` | Python 3.10 + `httpx` async + MCP server | Cliente robusto y completo de la **API oficial del BOE** (`legislacion-consolidada`, `boe/sumario`, `borme/sumario`, tablas auxiliares) ya con timeouts/retries/parseo. Modelos Pydantic completos en `src/mcp_boe/models/boe_models.py`. 3.059 líneas de tools (`legislation.py`, `summaries.py`, `auxiliary.py`, `documents.py`). | BAJO | **MUST** |
| `BOE-master` | R · paquete CRAN | Tablas y vignettes con la nomenclatura oficial del BOE (códigos de sección, materia, rango normativo). NO se adopta el código (R), se ROBA el `inst/extdata/` con los códigos del vocabulario controlado. | BAJO | **NICE** (extraer CSVs y traducir a YAML) |
| `Congreso-Scrapper-main 3` | Python sin async, `requests` + BeautifulSoup, PostgreSQL/MongoDB | Lógica de descarga de votaciones del Congreso de los Diputados desde `https://www.congreso.es/opendata/votaciones` con manejo de legislaturas y ficheros ZIP. Sólo 335 líneas, fácil de leer. Lógica útil en `requestutils.py` (form_url, get_download_link) y `votesutils.py`. | MEDIO | **MUST** (re-escribir en `apps/workers/connectors/congreso/`) |
| `congreso-scrapper-main`, `congreso-scrapper-main 2`, `Congreso-Scrapper-main 3` | (variantes) | Tres clones casi idénticos. Quedarse con la versión 3 (la más reciente, con `votes-stats-generator.py`). Borrar las otras del análisis. | — | SKIP duplicados |
| `Spanish-Newspapers-Scraper-master` | Python 3.x · `requests` + BeautifulSoup | Scrapers de **2019/2020** para El País, El Mundo, El Periódico, ABC. Sólo 1 archivo (`news_scraper.py`). PROBLEMA: los selectores CSS (`.articulo-titulo`, `.titular`) están desactualizados — los webs cambiaron desde 2020. Útil sólo como referencia de URLs base y patrones de paginación por medio. | BAJO (referencia) | **SKIP** (código muerto) → ROBAR rutas base |
| `fundus-master` | Python 3.8+ · librería pip mantenida (Humboldt Univ. Berlin) | **Crawler de noticias profesional** con parsers ya escritos para 7 medios españoles: El País, El Mundo, ABC, La Vanguardia, El Diario, Público + 2 mallorquines. Usa RSS + Sitemaps + News-Maps. Manejo de fechas históricas hasta 1976 para El País. Código en `src/fundus/publishers/es/`. | BAJO | **MUST** (mejor opción para prensa española) |
| `FreshRSS-edge` | PHP · self-hosted RSS aggregator | App entera escrita en PHP. NO interesa adoptar. ROBAR: la lista de feeds curados (`opml.default.xml`), su política de WebSub (push instantáneo) y su soporte de XPath para sitios sin RSS. | ALTO (PHP, no encaja) | **SKIP código** · NICE patrón |
| `newsfeed-main`, `newslinkrss-master`, `newspaper-scraping-master`, `news-crawlers-main` | varios | `newspaper-scraping-master` es un Procfile-Heroku con `feedparser` (40 líneas reales). `news-crawlers-main` es sólo un README comparativo (sin código). `newsfeed-main` y `newslinkrss-master` son CLI pequeños. Ninguno aporta más que feedparser. | — | **SKIP** |
| `European-Parliament-MCP-Server-main` | TypeScript + MCP | Servidor MCP de calidad enterprise para EP (62 tools, 1.130 tests). Aporta: tools como `mep_influence_scoring` (modelo 5-dim), `coalition_cohesion`, `party_defection_detection`, `committee_workload`. Útil como **referencia arquitectónica** para nuestros futuros MCP servers sobre Congreso/BOE. | ALTO (TS, no Python) | NICE (patrón) |
| `euparliamentmonitor-main` | Vanilla JS + 18 langs HTML | Frontend dashboard del EP. NO aporta nada al pipeline de ingesta (es UI). | — | **SKIP** |
| `parltrack-master` | Python · scrapers EP + webapp Flask | Scrapers maduros del Parlamento Europeo (`scrapers/`, `scraper_service.py`). Patrón de notificaciones diferenciales (`utils/contextdiff.py`, `utils/notif_mail.py`) interesante para alertas legislativas. | MEDIO | **NICE** (ROBAR patrón de notificaciones) |
| `openstates-scrapers-main` | Python · framework Pupa | Framework de scrapers parlamentarios maduro de US states. Patrón: cada legislatura es un módulo separado, schema común. Aplicable a CCAA españolas. | MEDIO | **NICE** (patrón para CCAA) |
| `eurlex-master` | R | Cliente R para EUR-Lex. Sólo R. Útil como referencia de endpoints pero ya tenemos `mcp-eu-ai-act-main` en Python. | — | **SKIP** (lenguaje) |
| `mcp-eu-ai-act-main` | Python · MCP server | Conector específico para EU AI Act. Si Politeia necesita seguimiento de regulación europea de IA, integrarlo tal cual. | BAJO | NICE |
| `qhld-backend-main`, `qhld.es-main`, `qhld-data-main` | Python + Flask · proyecto `politicalwatch` real | "Que Hacen Los Diputados" — backend real y operativo de Política Watch. Modelos de iniciativas, tags temáticos, alertas por email. Es **el patrón más cercano a lo que Politeia hace** en monitoring del Congreso. | MEDIO | **MUST** (estudiar y modelar nuestra ontología sobre la suya) |

### Fase 2 · Parsing y normalización

| Repo | Tecnología | Aporte | Esfuerzo | Prioridad |
|---|---|---|---|---|
| `docling-main` | Python · IBM Research, mantenido | Parser de documentos enterprise: PDF (tablas, layout), DOCX, HTML, audio. Pydantic v2, ruff, mypy. 132 MB de código. Soporta extracción de tablas y figuras con OCR. | MEDIO | **MUST** para PDFs del BOE/Moncloa/Congreso |
| `markitdown-main` | Python · Microsoft AutoGen team | Convierte a Markdown: PDF, PPT, Word, Excel, imágenes (EXIF + OCR), audio, HTML, CSV/JSON/XML, ZIP, YouTube, EPub. Diseñado pensando en LLMs. Menos potente que docling para tablas pero más ligero y rápido. | BAJO | **MUST** (capa rápida para textos planos) |
| `unstructured-main` | Python · Unstructured.io | Industria, 173 MB. Madurísimo pero pesado y con muchas deps. Si docling+markitdown cubren el caso, NO añadir. | ALTO | SKIP (dependencia excesiva) |
| `pdfplumber-stable` | Python · 20 MB | Extracción precisa de tablas y texto de PDFs. Más bajo nivel que docling, mejor cuando necesitas control total. | BAJO | NICE (fallback) |
| `panda-etl-main` | FastAPI + Next.js | App entera de "ETL para PDFs". Demasiado opinionada y monolítica para integrar. ROBAR: la idea de "campos extraídos como columnas" sobre PDFs. | ALTO | SKIP código |
| `gpt-rag-ingestion-main` | Azure-centric Python | Pipeline de ingesta para Azure Cognitive Search. Acoplado a Azure. Sólo robar el patrón de chunking (`chunking/` directory). | ALTO | SKIP (vendor lock-in) |

### Fase 3 · NLP (NER, clasificación, topics)

| Repo | Tecnología | Aporte | Esfuerzo | Prioridad |
|---|---|---|---|---|
| `pysentimiento-master` | Python · transformers + PyTorch · mantenido por finiteautomata | **Toolkit NLP en español** (es/en/it/pt): sentiment, hate speech, irony, emotion, NER+POS, hate **contextualizado**, **targeted sentiment**. Modelos finetuned beto/robertuito ya entrenados y publicados en HuggingFace. La pieza más importante para análisis político ES. | BAJO | **MUST** |
| `BERTopic-master` (preferir master, descartar `BERTopic-master 2` duplicado) | Python · MIT · activo | **Topic modeling moderno**: c-TF-IDF + transformers embeddings. Soporta zero-shot, supervised, hierarchical, online/incremental, multilingüe, dynamic (topics over time), guided (seed words). Componibles backends: `vectorizers/`, `cluster/`, `dimensionality/`, `representation/` (incluye `_openai`, `_litellm`, `_llamacpp` para hacer label-LLM). | BAJO | **MUST** (sustituye al stack actual de topics) |
| `IPTC-Media-Topic-Classification-main` | Python · XLM-RoBERTa fine-tuned · HuggingFace `classla/multilingual-IPTC-news-topic-classifier` | Clasificador multilingüe de tópicos según **estándar IPTC NewsCodes** (17 top-level: política, economía, deportes, etc.). F1 macro 0.746. Inferencia con 1 línea de `transformers.pipeline`. La gracia: **estándar internacional** auditable. | BAJO | **MUST** (etiqueta cross-medio defendible) |
| `NER-for-News-Headlines-main` | spaCy + CoNLL-2003 (ENG) | Es un **notebook Jupyter** único entrenando spaCy en titulares en inglés. NO sirve para español sin reentrenamiento. Patrón didáctico. | — | **SKIP** |
| `Real-Time-News-Article-Analysis-with-NER-main` | NER · Elastic + Redpanda + Kibana | Es un **README arquitectónico** sin código Python real (sólo `automation/`, `elasticsearch/`, `kibana/`, `redpanda/` con configs). ROBAR: el patrón de pipeline Kafka-like → NER inline en ingest pipeline de Elastic. | — | NICE (patrón) |
| `KeywordExplorer-main` | Python desktop tkinter · deprecado X/Twitter API | 6 apps de escritorio. 3 deprecadas por cambios de X. La parte viva (`ContextExplorer`, `NarrativeExplorer2`, `WikiPageviewExplorer`) usa OpenAI y Wikipedia. No es una librería: es un set de apps GUI. ROBAR: `keyword_explorer/` (módulo Python) sólo si se ve útil para extracción de keywords stand-alone. | ALTO (acoplamiento UI) | SKIP |
| `yake-master` | Python · unsupervised keyword extraction | YAKE! es un clásico y funciona bien para español sin entrenamiento. Una sola dependencia. | BAJO | **MUST** (keywords baseline) |
| `phrasemachine-master` | Python · POS-tagged noun phrase extraction | Útil cuando se necesita extraer noun phrases sintácticamente correctas. Más viejo, pero estable. | BAJO | NICE |
| `robertuito-main` | Python · ya cubierto por `pysentimiento` | RoBERTuito = backbone del social-NLP en español. Si se usa `pysentimiento` ya viene incluido. | — | SKIP (dup) |
| `beto-master` | Python · BETO base | Modelo BERT en español. Lo siguiente está en `pysentimiento`/transformers, no hace falta clonar. | — | SKIP |
| `Factual-Reporting-and-Political-Bias-Web-Interactions-main` | Python · CLEF 2023 | Dataset `data/mbfc.csv` con 3.920 fuentes etiquetadas (bias left/right/neutral + factuality high/mixed/low) + raw dataset de MBFC. **Lo importante es el CSV**, no el código de reinforcement learning del paper. ROBAR el dataset. | BAJO | **MUST** (etiqueta de fiabilidad de medio) |
| `news-title-bias-master` | Python | Detección de sesgo en titulares. Echar un ojo. (Está en la lista pero no en los priorios). | — | NICE |

### Fase 4 · Extracción a ontología (KG)

| Repo | Tecnología | Aporte | Esfuerzo | Prioridad |
|---|---|---|---|---|
| `OneKE-main` | Python · LangChain + LLMs (OpenAI/vLLM/DeepSeek) + Neo4j + Gradio + Docker | **El más maduro del grupo**: extracción schema-guided con multi-agent (`SchemaAgent`, `ExtractionAgent`, `ReflectionAgent`). Soporta NER + RE + EE + Triple Extraction + KG building. Constraints por tipo de entidad/relación/evento. Pipeline en `src/pipeline.py` (líneas 1-100 muestran un diseño limpio: 4 agentes orquestados). Repositorios de schema y de cases reutilizables en `src/modules/knowledge_base/`. Deps razonables (`requirements.txt` 47 paquetes), aunque incluye `vllm==0.6.0` y `torch==2.4.0` (instalación pesada en GPU). | ALTO (vllm/torch) | **MUST** (idea + schema agent + reflection loop) |
| `ontogpt-main` | Python · monarch-initiative + LinkML | **OntoGPT extrae entidades grounded sobre ontologías existentes**. Pensado para biomedicina pero el patrón es transferible: defines un schema LinkML, OntoGPT corre el LLM y devuelve instancias validadas contra la ontología. Muy bien empaquetado. | MEDIO | **MUST** (patrón de extracción ontology-grounded) |
| `ERKG-main` | Python notebooks · Senzing + Neo4j | Tutorial: entity resolution + KG en Neo4j. 3 notebooks (`datasets.ipynb`, `graph.ipynb`, `impact.ipynb`). No es una librería. ROBAR: el patrón de "ER antes del KG" — resolver duplicados de personas/empresas/cargos **antes** de meter en el grafo. | BAJO (idea) | **MUST** (patrón ER → KG) |
| `FinDKG-main` | Python · PyTorch + DGL + KGTransformer | KG dinámico financiero con temporal link prediction. ML pesado (DGL, GNN). NO adoptar el modelo. ROBAR: la idea de que el KG tiene **tiempo como dimensión** (no sólo timestamps, sino que las relaciones cambian de validez). | ALTO (DGL/GPU) | NICE (idea, no código) |
| `graphiti-main` | Python · Zep · MIT · activo | **Temporal context graphs**: KG que evoluciona en el tiempo con bi-temporal validity (`valid_at`, `invalid_at`). Construido para agentes de IA. Soporta MCP server. Reemplaza patrones manuales de versionado en grafos. | MEDIO | **MUST** (alternativa moderna a custom KG) |
| `followthemoney-main` | Python · OpenSanctions | Modelo de datos pragmático para investigación: `Person`, `Company`, `Asset`, `Payment`, `Ownership`, `CourtCase`. Schemas validables, exportable a JSON/CSV. Es la base sobre la que construye OpenSanctions. | BAJO | **MUST** (schema reusable para actores políticos) |
| `opensanctions-main` | Python + zavod + Docker | Aggregator de PEPs, sanciones, listas de control. Si necesitamos enriquecer actores políticos con sanciones internacionales, integramos las datasets vía `followthemoney`. Aprovechar **datasets**, no el código de crawler. | MEDIO | NICE (datos) |
| `cidoccrm-llm-extractor-main` | Python · CIDOC-CRM | Extracción de eventos hacia CIDOC-CRM (estándar cultural). Si necesitamos rigor museológico de eventos políticos, útil. Más nicho. | MEDIO | SKIP por ahora |
| `rdflib-main` | Python · librería oficial | RDF y SPARQL. Si optamos por triple store. | BAJO | NICE (sólo si elegimos RDF) |
| `owlready2-master`, `owlapy-develop`, `ontoenv-main` | Python · OWL ontologies | Manejo de ontologías OWL. Sólo si Politeia opta por OWL formal — probablemente no. | — | SKIP |

### Fase 5 · RAG / Recuperación

| Repo | Tecnología | Aporte | Esfuerzo | Prioridad |
|---|---|---|---|---|
| `FlashRAG-main` | Python · LangChain-style · activo (WWW 2025) | **23 algoritmos RAG SOTA + 7 reasoning-based** ya implementados (R1-Searcher, Search-R1, etc.) + 36 benchmarks. Estructura modular: `retriever`, `generator`, `judger`, `refiner`, `pipeline`, `prompt`. Soporta vLLM, FastChat, Faiss. UI incluida. Sirve como **banco de evaluación** de qué RAG aplicar a qué fase política. | MEDIO | **MUST** (eval + baselines) |
| `OpenDocuments-main` | Node 20+ TypeScript + LanceDB · MIT · activo | **RAG de producción** con citas: chunking estructural, contextual prefixes, HyDE + multi-query, parent-doc recall, proposition augmentation, reranking, adaptive context fitting. CLI + plugins + Ollama auto-detect. Conectores GitHub/Notion/Drive. | ALTO (TS, otro stack) | NICE (referencia arquitectónica; el equipo está en Python) |
| `Local-NotebookLM-main` | Python · OpenAI-compat (Groq, LMStudio, Ollama, Azure) | **PDF → audio podcast** con multi-speaker, estilos (formal/casual/genz), formatos (interview/debate/lecture/panel). Útil si Politeia añade producto "briefing en audio". Sólo 7 archivos Python. | BAJO | NICE (producto derivado, no ingesta) |
| `ragflow-main` | Python · OpenSource RAG enterprise | Plataforma RAG completa con UI, multi-lang. Pesada. Alternativa a FlashRAG si se quiere algo más usable de la caja, menos investigador. | ALTO | SKIP (FlashRAG suficiente) |
| `graphrag-main` | Python · Microsoft Research | RAG sobre KG. Si Politeia construye KG con Graphiti, GraphRAG es el siguiente paso. Pipeline en `graphrag/` que extrae entidades, comunidades (Leiden) y summaries jerárquicos. | MEDIO | **MUST** (cuando KG esté) |
| `verba-master` | Node/Elastic · proyecto antiguo en español | README en español, parece proyecto regional inactivo. Mejor evaluación rápida y descartar. | — | SKIP |
| `txtai-master.zip` | Python · ZIP no extraído | Está zipeado, sospechoso. txtai es válido pero ya hay opciones más explícitas. Si se necesita all-in-one embeddings + KG ligero, descomprimir y evaluar. | — | SKIP por defecto |
| `chroma-main`, `qdrant-master` | vector stores | Cliente de Chroma y Qdrant. Si ya hay un vector store en Politeia (ChromaDB usado según MEMORY), mantenerlo. | — | (ya en uso) |

### Fase 6 · Orquestación y monitorización

| Repo | Tecnología | Aporte | Esfuerzo | Prioridad |
|---|---|---|---|---|
| `airflow-main`, `airflow-ext-main`, `files-airflow-main` | Apache Airflow 2/3 | Estándar de la industria, pesado (Java/Gradle build incluido). Para CCD/Politeia probablemente sea over-engineering. **NO clonar**; aprender el patrón DAG. | — | SKIP código · referencia |
| `prefect-main` (×3 copias) | Python · Prefect 2 | Más ligero que Airflow, async-native, observabilidad incluida. **Mejor encaje** para nuestro stack Python async + FastAPI. | MEDIO | **MUST** (sustituir crons + APScheduler) |
| `dagster-master` | Python · Dagster | Asset-oriented (los datasets son ciudadanos de primera clase). Patrón limpio para nuestra ingesta. Si no se elige Prefect, ésta es la opción. | MEDIO | NICE (alternativa a Prefect) |
| `airbyte-master` (×2) | Java + Python connectors · enterprise | Plataforma ELT madura. 600+ connectors. No tiene sentido adoptarla entera. ROBAR: el **CDK low-code/no-code** para conectores como patrón (`airbyte-cdk/`). | — | SKIP código · referencia patrón |
| `meltano_example_implementations-main` | Singer.io specs · DBT | Stack ELT alternativo. Sólo ejemplos. Útil para entender el spec Singer si se acaba implementando conectores estilo Airbyte. | — | SKIP |
| `dbt-core-main` | Python · transformaciones SQL | Si Politeia tiene transformaciones SQL importantes (warehouse), dbt es el estándar. Para nuestro caso (más Pydantic/Python que SQL), probablemente no. | — | NICE |
| `great_expectations-develop` | Python · data quality | Validaciones automáticas sobre datasets ingeridos (esperar tipos, rangos, distribuciones). Útil para el bloque de calidad de Politeia. | MEDIO | NICE |
| `dlt-devel` (×2) | Python · `dlt` data load tool | Librería ligera de ingesta — pip install y listo. **Buen encaje** para conectores Python sin la complejidad de Airbyte. | BAJO | NICE (alternativa simple) |
| `datahub-master` | LinkedIn DataHub · Java | Data catalog enterprise. Demasiado para Politeia. | — | SKIP |
| `kafka-master` | Java | Streaming. Si se necesita ingesta real-time. Probablemente sobredimensionado. | — | SKIP |

### Fase 7 · Análisis político específico

| Repo | Tecnología | Aporte | Esfuerzo | Prioridad |
|---|---|---|---|---|
| `SpainPoliticsAnalytics-master` | Python notebooks · 2017 antiguo · sentiment FB/YouTube | Proyecto estudiantil de 2017 con scraping de Facebook (API ya muerta) + análisis de sentimiento. Resultados gráficos en notebooks. ROBAR: nada en código (deps muertas). Sólo referencia conceptual de qué se hizo en su día. | — | **SKIP** (código no recuperable) |
| `PolData-master` | R + CSV · catálogo curado | Catálogo en CSV/Excel de **datasets políticos del mundo** (parlamentos, elecciones, encuestas, encuestas barómetro, sanciones, etc.) con URLs, licencias, ISO 3166. **Es el .csv lo importante** — un mapa de fuentes externas para alimentar Politeia. | BAJO | **MUST** (lista de fuentes) |
| `auditing_targeted_political_advertising-main` | Python notebooks · 2021 elecciones Alemania · Meta Ad Library | Pipeline reproducible para análisis de anuncios políticos vía Meta Ad Library API (no es scraping). Patrón aplicable a España: monitor de Meta/Google Ads políticos. | MEDIO | **MUST** (módulo "ads políticos") |
| `Social-Network-Analysis-master` | Gephi, NodeXL · 2016 US elections | Proyecto académico con GML files y screenshots. Sin código Python. Conceptual. | — | SKIP |
| `Osintgraph-master` | Python · Neo4j + Instagram scraping | OSINT focalizado en Instagram. Útil **únicamente si** Politeia añade el módulo de monitoring de cuentas IG de políticos. Riesgo legal-ToS. | ALTO (legal+técnico) | SKIP (legal) |
| `OSINT-main`, `Awesome-OSINT-For-Everything-main`, `API-s-for-OSINT-main`, `awesome-osint-master` | listas curadas Markdown | **No son código** — son listas masivas de herramientas OSINT externas. Útiles para descubrir APIs (verificación de identidad, OSINT financiero, etc.). Uso: una hora de lectura, no integración. | — | NICE (research) |
| `China-Media-main` | Stata + CSVs | Dataset de cobertura de prensa china + script Stata. NO es código Python adoptable. ROBAR: el **patrón de columnas/variables** (cobertura por país × año × diplomatic engagement × trade × media count). Aplicable a "cobertura de medios española por tema × actor × tiempo". | BAJO (concepto) | **NICE** (modelo de datos) |
| `China-TIES-main` | Solo CSVs + PDF | Dataset sin código. Inspiración de variables. | — | SKIP código · NICE concepto |
| `CausalPy-main` (PyMC Labs) | Python · PyMC + scikit-learn · activo, mantenido | **Causal inference**: DiD, synthetic control, regression discontinuity, ITS, IV. Outputs Bayesianos con HDI/ROPE. **Pieza clave** para análisis político riguroso (¿cuánto subió el voto del PP después del evento X?). | MEDIO | **MUST** (lo usamos en Bloque 11 ya, validar consistencia) |
| `agent-fridays-global-intelligence-monitor-main` | TypeScript Vite + Tauri + Convex + deck.gl + Playwright · activo (AGPL) | **El más impresionante visualmente** de los repos del grupo: 100+ feeds RSS, NER en navegador con `@xenova/transformers`, mapa 3D WebGL deck.gl, 36+ capas (conflictos, bases, datacenters, etc.), agentes en Tauri desktop. Servicios en `src/services/` (analysis-core, entity-extraction, focal-point-detector, clustering, correlation, etc.) son referencias arquitectónicas valiosas. **NO adoptable directamente** (TS+Tauri), pero ROBAR ideas: focal-point-detector, NER en cliente, capas geo. | ALTO (stack distinto) | NICE (patrones UX) |
| `worldmonitor-main` (sin `agent-fridays-` prefix) | (variante del anterior) | Misma cosa, una copia. | — | SKIP dup |
| `legislative-master` | Ruby on Rails · 2014 · Chile | **Marcado como DEPRECATED por sus propios autores** ("USE UNDER YOUR OWN RESPONSIBILITY"). No tocar. | — | **SKIP** (oficialmente muerto) |
| `congress-main` (`unitedstates/congress`) | Python · US Congress scraper | Estándar de facto para US. Buen ejemplo de organización (`congress/`, `run`, `scripts/`). Patrón aplicable a Congreso de los Diputados. | BAJO (referencia) | NICE (patrón) |
| `everypolitician-data-master` | Ruby + datos | "Project on hold" según ellos. Sin actualizaciones desde 2019. ROBAR el dataset `countries.json` para enlazar políticos. | — | SKIP código · NICE datos |
| `poli-sci-kit-main` | Python · ya integrado según MEMORY | Ya está en el stack actual de Politeia (gits amigos integration). | — | (ya en uso) |
| `manifestoR-master`, `manifestos-converter-main` | R · Manifesto Project | Datos del Manifesto Project (textos de programas electorales codificados). El **dataset** es oro para análisis de ideología. El código R no se adopta. | BAJO (datos) | **MUST** (datos) |
| `pewmethods-master` | R · Pew Research | Métodos de muestreo de Pew (poststratification, weighting). Sólo R. Conceptos transferibles. | — | SKIP código |
| `coalitions-master` | R · ya integrado según MEMORY | Ya está en el stack actual. | — | (ya en uso) |
| `votainteligente-portal-electoral-master` | Django · Chile · 2014 | Portal antiguo. Patrón conceptual (perfiles de candidatos), código no adoptable. | — | SKIP |
| `seguimiento-politico.github.io-master` | sitio estático | Sin código de pipeline. | — | SKIP |
| `licitaciones-espana-main`, `licitaciones-contratos-menores-comunidad-de-madrid-master`, `contrataciondelestado-master`, `contractacio.cat-main` | varios Python | Conectores de contratación pública (licitaciones, contratos menores). Si Politeia tiene módulo de contratación (lo tiene según CLAUDE.md), evaluar uno por uno. | MEDIO | **MUST** revisión individual |
| `infoelectoral-main`, `infoelectoral-master` (×2) | Python · datos electorales españoles | Cliente Python para datos del Ministerio del Interior. Estándar de facto. | BAJO | **MUST** (datos) |
| `civio-graphs-public-main` | (Civio) | Visualizaciones públicas de Civio. Patrón de visualización, no de pipeline. | — | NICE |
| `gobierto-budgets-data-master` | Datos presupuestos municipales | Datos. | BAJO | NICE |

---

## 2. Top 10 adopciones recomendadas

### #1 · `pysentimiento-master` — Toolkit NLP en español

- **URL**: `gits amigos/pysentimiento-master/`
- **Licencia**: ver `LICENSE.md` (basado en datasets/modelos académicos; uso comercial → revisar caso por caso)
- **Qué resuelve**: Politeia analiza texto en español (BOE, Congreso, prensa, redes). Necesita sentiment + hate + emotion + NER + targeted sentiment **en español** con modelos finetuned. `pysentimiento` los trae listos vía HuggingFace.
- **Esfuerzo**: 4–8 horas-persona. `pip install pysentimiento`, integrar en `packages/nlp/` como capa abstracta sobre HF.
- **Riesgo**: deps de transformers/torch pesadas (~3 GB modelos). Mitigar: cargar modelos lazy, cache en disco, posiblemente quantizar.
- **Integración pseudo-arquitectónica**:
  ```
  packages/nlp/spanish_social_nlp.py
    └─ wraps pysentimiento.create_analyzer(task="sentiment", lang="es")
    └─ expone: analyze_sentiment(text) → SentimentResult(score, label, confidence)
    └─ apps/workers/pipelines/media_pipeline.py llama esto tras NER
  ```

### #2 · `MCP-BOE-main` — Cliente del BOE production-ready

- **URL**: `gits amigos/MCP-BOE-main/`, repo original `github.com/ComputingVictor/MCP-BOE`
- **Licencia**: MIT (en README)
- **Qué resuelve**: el conector BOE actual de Politeia (referenciado en MEMORY) se beneficia de un cliente HTTP async robusto con retries, modelos Pydantic completos y handling de PDFs. Este repo lo trae hecho.
- **Esfuerzo**: 6–10 horas. Extraer `src/mcp_boe/utils/http_client.py` + `src/mcp_boe/models/boe_models.py` + lógica de `tools/legislation.py`. Reescribir como repository/service en `apps/api/services/boe_service.py` desacoplando MCP.
- **Riesgo**: bajo. Es Python 3.10+, httpx, Pydantic — lo mismo que usa Politeia. La capa MCP es removible.
- **Integración**:
  ```
  apps/api/clients/boe_client.py     ← copia de http_client.py + boe_models.py
  apps/api/services/boe_service.py   ← métodos: search_legislation, get_summary, read_pdf
  apps/api/routers/boe.py            ← endpoints REST
  apps/workers/connectors/boe/       ← worker que llama el service para backfill
  ```

### #3 · `fundus-master` — Crawler de prensa española

- **URL**: `gits amigos/fundus-master/`, repo `github.com/flairNLP/fundus`
- **Licencia**: MIT
- **Qué resuelve**: ya hay 7 parsers escritos y mantenidos para los principales medios españoles (`src/fundus/publishers/es/`). Cada parser implementa `BaseParser` con extracción robusta de body, autor, fecha, imágenes. Los selectores se actualizan con la comunidad. Sustituye al `Spanish-Newspapers-Scraper-master` (que está roto).
- **Esfuerzo**: 4–8 horas. `pip install fundus`. Adaptar entrada/salida a nuestro schema. Considerar contribuir nuevos publishers (eldiario.es, RTVE, 20minutos).
- **Riesgo**: bajo. Activo, MIT. Dependencias: lxml, dateutil. Cambios en HTML de medios requieren bump del paquete (no nuestro problema).
- **Integración**:
  ```
  apps/workers/connectors/prensa/fundus_adapter.py
    └─ from fundus import PublisherCollection, Crawler
    └─ por cada artículo → packages/types/Article (campos comunes)
    └─ pipeline llama pysentimiento + IPTC clasificador en cascada
  ```

### #4 · `BERTopic-master` — Topic modeling moderno

- **URL**: `gits amigos/BERTopic-master/`, repo `github.com/MaartenGr/BERTopic`
- **Licencia**: MIT
- **Qué resuelve**: clustering temático de noticias y discursos políticos. Soporta dynamic topics (topics over time) y guided (con seed words por dominio: "energía", "vivienda", "migración"). Genera labels con LLM. Output interpretable (c-TF-IDF da palabras representativas por topic).
- **Esfuerzo**: 8–16 horas. `pip install bertopic`. Pipeline: embeddings → reducción → cluster → c-TF-IDF → representación opcional con LLM. Persistir modelos por mercado/dominio.
- **Riesgo**: bajo. Activo, MIT, comunidad grande. Dependencias: sentence-transformers, umap-learn, hdbscan.
- **Integración**:
  ```
  packages/nlp/topic_modeling.py
    └─ from bertopic import BERTopic
    └─ modelos guardados en packages/nlp/models/topics/{mercado}_{periodo}.pkl
    └─ servicio para entrenar incrementalmente (BERTopic.partial_fit)
  apps/workers/pipelines/topic_pipeline.py
    └─ corrida diaria sobre nuevos artículos
  ```

### #5 · `IPTC-Media-Topic-Classification-main` — Clasificador IPTC

- **URL**: `gits amigos/IPTC-Media-Topic-Classification-main/`
- **Licencia**: CC-BY-NC (probable, verificar). Modelo en HF: `classla/multilingual-IPTC-news-topic-classifier`
- **Qué resuelve**: etiquetar cada noticia con un código IPTC estándar (17 top-level). Esto es defensible ante auditoría ("clasificamos según estándar internacional IPTC") y permite cruzar con otras fuentes que usen el mismo schema.
- **Esfuerzo**: 2–4 horas. Es un `transformers.pipeline("text-classification", model="classla/multilingual-IPTC-news-topic-classifier")`. Wrapper de batch + cache.
- **Riesgo**: muy bajo. Inferencia, no entrenamiento. F1 0.746 publicado. Sólo XLM-R-large (1.7GB GPU/CPU).
- **Integración**:
  ```
  packages/nlp/iptc_classifier.py
    └─ encapsula el pipeline HF
    └─ devuelve (label, score) con threshold configurable
    └─ se llama tras NER+sentiment, antes de BERTopic
  ```

### #6 · `OneKE-main` — Schema-guided IE multi-agent

- **URL**: `gits amigos/OneKE-main/`, repo `github.com/zjunlp/OneKE`
- **Licencia**: ver `LICENSE` del repo (académico, revisar)
- **Qué resuelve**: extracción de NER + RE + EE + Triples **guiada por schema definido por el analista**. Politeia ya tiene ontología de actores/eventos políticos (CLAUDE.md menciona `packages/ontology`). OneKE permite extraer instancias de esa ontología desde texto crudo con un loop de reflection (auto-crítica del LLM).
- **Esfuerzo**: 16–40 horas. Es complejo y trae deps pesadas (vllm, torch). **Estrategia recomendada**: ROBAR la arquitectura (`SchemaAgent` + `ExtractionAgent` + `ReflectionAgent` + `case_repository`) y reescribir sin vllm/gradio, usando LiteLLM (Politeia ya lo usa) y `pydantic` + `langchain` directamente.
- **Riesgo**: alto si se intenta integrar el repo tal cual (vllm, gradio, demasiadas piezas). Bajo si se ROBAN los conceptos. La parte de "case repository" (memoria de extracciones previas como few-shot) es especialmente valiosa.
- **Integración**:
  ```
  packages/nlp/schema_guided_ie/
    ├─ schema_agent.py     ← lee packages/ontology/* y produce JSON schema
    ├─ extraction_agent.py ← LLM call con prompts en packages/prompts/ie/
    ├─ reflection_agent.py ← segundo LLM call que critica el output
    └─ case_repository.py  ← memoria local de extracciones validadas (SQLite)
  ```

### #7 · `docling-main` + `markitdown-main` — Parsing universal de documentos

- **URLs**: `docling-main/` (IBM Research, MIT) y `markitdown-main/` (Microsoft AutoGen, MIT)
- **Qué resuelve**: BOE, Moncloa, Congreso, EUR-Lex publican PDFs/DOCXs/HTMLs. Necesitamos convertir todo a markdown estructurado para LLMs.
- **Esfuerzo**: 6–10 horas para integrar ambos. Capa rápida = markitdown (Office, PDFs simples, JSON, ZIP). Capa rigurosa = docling (PDFs complejos con tablas, layout, OCR).
- **Riesgo**: bajo (ambos MIT, mantenidos por gigantes). Docling pesa más, considerar instalación opcional.
- **Integración**:
  ```
  packages/ingestion/document_parser.py
    └─ def parse_to_markdown(file: bytes, mime: str) -> Document:
        if mime == "application/pdf" and is_complex(file): docling
        else: markitdown
    └─ Document = TextChunks + Tables + Figures + Metadata
  ```

### #8 · `CausalPy-main` — Causal inference riguroso

- **URL**: `gits amigos/CausalPy-main/`, `github.com/pymc-labs/CausalPy`
- **Licencia**: Apache 2.0
- **Qué resuelve**: Politeia hace claims causales (ej: "el debate del 12-N subió el PP 2 puntos"). Necesita métodos quasi-experimentales con incertidumbre (HDI, ROPE).
- **Esfuerzo**: ya está en uso (Bloque 11 según MEMORY). Acción: auditar que se usan correctamente las APIs (`cp.RegressionDiscontinuity`, `cp.DifferenceInDifferences`, `cp.SyntheticControl`).
- **Riesgo**: bajo (Apache 2.0, mantenido por PyMC Labs). Dependencia de PyMC = MCMC pesado.
- **Integración**: ya está integrado.

### #9 · `Factual-Reporting-and-Political-Bias-Web-Interactions-main` — Dataset MBFC de fiabilidad

- **URL**: `gits amigos/Factual-Reporting-and-Political-Bias-Web-Interactions-main/`
- **Licencia**: el CSV está en HuggingFace `sergioburdisso/news_media_bias_and_factuality`
- **Qué resuelve**: 3.920 fuentes con etiquetas `bias` (left/right/neutral/center) y `factual_reporting` (high/mixed/low). Cuando un medio aparece como fuente en Politeia, podemos enriquecerlo con esta etiqueta y mostrar un "fiabilidad: alta" en UI. Auditable.
- **Esfuerzo**: 2–4 horas. Importar el CSV, normalizar dominios, hacer join con `media_sources` table de Politeia.
- **Riesgo**: dataset puede tener sesgos del propio MBFC (es una fuente curada). Mitigar: mostrar la procedencia ("según MBFC") y combinar con otras señales.
- **Integración**:
  ```
  packages/data_seeds/media_factuality_mbfc.csv  ← copia + normalización del CSV
  packages/migrations/NNNN_media_factuality.py    ← columna en media_sources
  apps/api/services/media_service.py              ← cruza dominio → etiqueta
  ```

### #10 · `qhld-backend-main` (politicalwatch / TIPI) — Patrón de monitoring del Congreso

- **URL**: `gits amigos/qhld-backend-main/`, `github.com/politicalwatch/tipi-backend`
- **Licencia**: ver `LICENSE` (probable AGPL u open).
- **Qué resuelve**: es el proyecto de referencia en España para "que hacen los diputados". Backend Flask + MongoDB con: iniciativas, votaciones, tags temáticos, alertas por email, **API REST documentada**. Politeia construye algo similar (módulo legislativo).
- **Esfuerzo**: 8–16 horas de estudio (no de copia). Comparar su `tipi_backend/api/business.py` con nuestro `apps/api/services/legislative_service.py`. Adoptar su taxonomía de iniciativas, su sistema de **tagging temático automático** (clave para Politeia) y su patrón de alertas.
- **Riesgo**: Flask + MongoDB (Politeia usa FastAPI + Postgres). NO adoptar el código tal cual. ROBAR: el dominio (qué entidades modelan), las URLs API, el sistema de alertas.
- **Integración**: documentar diferencias en `docs/COMPARATIVO_TIPI.md` y planificar paridad funcional sobre nuestra stack.

---

## 3. Patrones a ROBAR (sin adoptar el repo)

Patrones de alta señal que NO requieren importar el código entero. Implementar nativamente en Politeia.

### Patrón 1 · Schema-guided extraction con reflection loop  (de `OneKE-main`)

**Archivo testigo**: `OneKE-main/src/pipeline.py` líneas 1-100 y `OneKE-main/src/modules/{schema,extraction,reflection}_agent.py`.

**La idea**: en lugar de un único prompt LLM que extrae entidades, encadenar tres agentes:

1. **SchemaAgent** lee la definición de la ontología (en JSON Schema o LinkML) y produce instrucciones específicas y few-shot examples.
2. **ExtractionAgent** ejecuta la extracción con esas instrucciones.
3. **ReflectionAgent** vuelve a llamar al LLM con `(texto original, schema, extracción)` y le pide que critique y corrija.

Adicionalmente: una **CaseRepository** que guarda extracciones humano-validadas, indexadas por embedding, para usarse como few-shot dinámico (el equivalente a RAG sobre nuestras propias correcciones pasadas).

**Por qué importa para Politeia**: reduce alucinaciones del LLM en extracción de actores/leyes/eventos, sin costar reentrenamiento. La case repository convierte el feedback de analistas en mejora pasiva del sistema.

**Implementación nativa**: 200–400 líneas en `packages/nlp/schema_guided_ie/`, usando LiteLLM como cliente.

### Patrón 2 · Entity Resolution antes del Knowledge Graph  (de `ERKG-main` + `followthemoney-main`)

**Archivo testigo**: notebooks de `ERKG-main/examples/` muestran ER (Senzing) → grafo (Neo4j). `followthemoney-main` proporciona el schema (`Person`, `Company`, etc.).

**La idea**: NO meter nombres de personas/partidos/empresas en el KG sin antes resolver duplicados ("Pedro Sánchez Pérez-Castejón" ≡ "Pedro Sánchez" ≡ "P. Sánchez"). Crear una capa `entity_resolution` con:

- Normalización (lowercase, accents, prefixes oficiales como "Dn.", "Excmo.").
- Blocking con n-grams de tokens.
- Scoring por (string similarity + contexto + atributos).
- Identificadores estables (`opensanctions_id`, `wikidata_qid`, identificadores propios `politeia_actor_id`).

**Por qué importa**: en política los nombres se repiten, se cambian, se traducen. Sin ER, todas las consultas tipo "menciones de Sánchez" dan ruido.

**Implementación nativa**: usar `rapidfuzz` (ya en deps de Politeia probablemente) + reglas + lookup tables. 100–300 líneas en `packages/ontology/entity_resolver.py`.

### Patrón 3 · NER + clasificación en el ingest pipeline  (de `Real-Time-News-Article-Analysis-with-NER-main`)

**Archivo testigo**: arquitectura README de Real-Time NER muestra ingest pipeline de Elasticsearch llamando a un modelo NER **inline** sobre cada documento durante la ingesta.

**La idea**: en lugar de batch jobs nocturnos que enriquezcan documentos a posteriori, hacer NER (+ sentiment + clasificación) **en el momento de la ingesta**. Cada artículo entra ya enriquecido. Ventaja: simplicidad operativa, fresh data inmediato. Coste: latencia de ingesta sube ~200ms/doc.

**Por qué importa**: Politeia tiene SLAs de "noticia → alerta" cortos. Si la NER es eager, las alertas pueden disparar inmediatamente.

**Implementación nativa**: en `apps/workers/pipelines/media_pipeline.py` orquestar:
```
fetch → parse → NER → sentiment → IPTC topic → BERTopic assign → persist (todo en una transacción)
```
Con fallbacks: si NER falla, persistir el doc sin labels y reintentar async.

### Patrón 4 · Bi-temporal validity en el KG  (de `graphiti-main` + `FinDKG-main`)

**Archivo testigo**: README de `graphiti-main` describe `valid_at` + `invalid_at` por arista. FinDKG hace lo mismo con timestamps por relación.

**La idea**: cada hecho en el KG tiene DOS tiempos:

- `system_time` = cuándo lo supimos.
- `valid_time` = cuándo es/fue cierto en el mundo.

Ej: "Pedro Sánchez es presidente" tiene `valid_time = [2018-06-02, ∞)` pero también un `system_time` (cuando lo ingerimos). Si en 2026 deja de serlo, no borramos la arista: cerramos su `valid_time = [2018-06-02, 2026-XX-XX)`. Las queries pueden preguntar "qué era cierto el 2020-03-14".

**Por qué importa**: política y derecho son temporales por naturaleza. Una pregunta como "¿quién era ministro de Sanidad cuando el COVID?" requiere bi-temporal.

**Implementación nativa**: añadir columnas `valid_from`, `valid_to`, `recorded_at` a las tablas de relaciones del KG, y un router `apps/api/routers/kg_temporal.py` con queries point-in-time.

### Patrón 5 · Diff-based notifications  (de `parltrack-master`)

**Archivo testigo**: `parltrack-master/utils/contextdiff.py` + `utils/notif_mail.py` + `notification_model.py`.

**La idea**: cuando una iniciativa parlamentaria cambia (fase, votación, enmienda), generar un **diff estructurado** y notificar sólo a los suscriptores que tienen filtros que matchean el cambio. NO emails masivos: notificación dirigida por contexto.

**Por qué importa**: Politeia ofrece alertas. La diferencia entre una buena UX y spam es **qué cambió exactamente** (no "este expediente fue actualizado", sino "se añadió enmienda 47 del grupo X al artículo 12").

**Implementación nativa**: helper `packages/ontology/diff.py` que recibe `(old_state, new_state)` y devuelve `DiffEvent(field, old, new, severity)`. El router de notificaciones cruza con filtros del usuario.

---

## 4. Repos a DESCARTAR (aparentemente útiles, en realidad no)

| Repo | Razón |
|---|---|
| `Spanish-Newspapers-Scraper-master` | Selectores CSS de 2019/2020, los medios cambiaron. Sustituido por `fundus-master`. |
| `SpainPoliticsAnalytics-master` | Proyecto estudiantil de 2017, scraping de Facebook (API muerta), notebooks sin pipeline. |
| `KeywordExplorer-main` | 3 de 6 apps deprecadas por X API. App de escritorio tkinter, no librería. |
| `China-Media-main`, `China-TIES-main` | Datasets en CSV + Stata. Sin código adoptable. La idea (variables) sí, el código no. |
| `Social-Network-Analysis-master` | Proyecto académico 2016 con Gephi/NodeXL. Sin código Python real. |
| `legislative-master` | Marcado DEPRECATED por los propios autores ("USE AT YOUR OWN RISK"). Ruby on Rails 2014. |
| `everypolitician-data-master` | "Project on hold" según los autores. Datos sí (countries.json), código no. |
| `votainteligente-portal-electoral-master` | Django 2014, Chile, abandonado. |
| `NER-for-News-Headlines-main` | Notebook único, entrenando spaCy en inglés sobre CoNLL-2003. No reutilizable en español sin reentrenar. |
| `Real-Time-News-Article-Analysis-with-NER-main` | Sin código Python real, sólo configs de Elastic/Kibana/Redpanda. Sólo el README arquitectónico es interesante. |
| `KeywordExplorer-main` (segunda mención por enfasis) | Apps GUI tkinter, no librería. Acoplamiento alto. |
| `unstructured-main` | 173 MB, deps enormes. Sustituido por `docling` + `markitdown`. |
| `panda-etl-main` | App entera FastAPI+Next.js opinionada. No es una librería. |
| `verba-master` | Proyecto regional inactivo en español, README escueto. Stack Elastic+Node. |
| `airbyte-master` (×2) | Enterprise platform Java+Python. Demasiado para Politeia. ROBAR sólo el patrón CDK. |
| `kafka-master` | Streaming Java. Sobre-dimensionado para los volúmenes actuales. |
| `datahub-master` | Catálogo enterprise LinkedIn. Demasiado para Politeia. |
| `Osintgraph-master` | Scraping Instagram. Riesgo legal-ToS alto. Sólo si hay caso de uso justificado por Legal. |
| `txtai-master.zip` | Está zipeado, no extraído. Si lo necesitamos, descomprimir y evaluar — por defecto skip. |
| `BERTopic-master 2`, `airflow-main 2`, `prefect-main 2` y `3`, `dlt-devel 2`, `awesome-mcp-servers-main 2`, etc. | Duplicados literales de carpeta. Eliminar la copia tras confirmar. |
| `opensanctions-main 2`, `opensanctions-main 3` | Triplicado del mismo repo. Eliminar las copias. |
| `congreso-scrapper-main`, `congreso-scrapper-main 2` | Versiones antiguas de `Congreso-Scrapper-main 3`. Quedarse con la más reciente. |
| `anything-llm-master`, `anything-llm-master 2` | App de chat, no pipeline de ingesta. Fuera del scope de este informe. |
| `awesome-mcp-servers-main` | Lista Markdown. Útil para descubrimiento, no integración. |
| `OSINT-main`, `Awesome-OSINT-For-Everything-main`, `API-s-for-OSINT-main`, `awesome-osint-master`, `Social-Media-OSINT-Tools-Collection-main` (×2) | Listas curadas. No es código. |
| `eurlex-master`, `BOE-master`, `manifestoR-master`, `pewmethods-master`, `senadoRES-master`, `mapSpain-main`, `tidyBdE-main`, `climaemet-main`, `pxweb-master`, `LAU2boundaries4spain-master` | Paquetes R. Politeia es Python. Robar datos/conceptos si aplica. |
| `valkompass-ai-main` | No verificado en este pass, baja probabilidad de aporte directo. |
| `agent-fridays-global-intelligence-monitor-main` / `worldmonitor-main` | Stack TS+Tauri, no integrable directamente. Sólo ROBAR ideas de UX y de servicios (`src/services/focal-point-detector.ts`, `entity-extraction.ts`, `clustering.ts`). |

---

## 5. Resumen ejecutivo de decisiones

| Acción | Cuántos repos |
|---|---|
| **MUST adopt** | 10 (los 10 del top) |
| **NICE** | ~15 |
| **SKIP código pero ROBAR patrón** | ~10 |
| **SKIP completo** | ~280 (resto del inventario, incluidos duplicados literales) |

**Coste estimado para integrar el Top 10**: 80–140 horas-persona (2–3.5 sprints de un ingeniero senior).

**Orden de adopción sugerido** (cada uno desbloquea al siguiente):

1. `MCP-BOE-main` (1 día) — fortalece el conector BOE.
2. `fundus-master` (1 día) — sustituye scrapers de prensa.
3. `docling`/`markitdown` (1 día) — parser universal de docs.
4. `pysentimiento` + `IPTC classifier` (1 día) — enrichment NLP en español.
5. `BERTopic` (2 días) — topic modeling.
6. `OneKE` patterns + `followthemoney` schema + ER de `ERKG` (5 días) — extracción a ontología.
7. Patrón 3 (NER en ingest) y Patrón 4 (bi-temporal KG) (2 días) — refactor del pipeline.
8. Dataset MBFC y Patrón 5 (diff-based alerts) (2 días) — calidad y UX.
9. Estudio comparativo con `qhld-backend` (1 día) — auditoría del módulo legislativo.
10. CausalPy: ya en uso, sólo auditar (0.5 días).

**Riesgos transversales**:

- Modelos transformers grandes (XLM-R, RoBERTuito): pre-cargar y cachear. Considerar onnxruntime para inferencia.
- Licencias: revisar cada uno antes de uso comercial (especialmente datasets académicos como MBFC e IPTC).
- Mantenimiento: los repos no son nuestros. Versionar lo que adoptamos (pin versions, smoke tests al actualizar).

---

*Fin del informe.*
