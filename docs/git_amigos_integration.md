# Plan de integración — `gits amigos` (304 repositorios)

> Banco de patrones para acelerar ElectSim. **No copiar código sin entender**. Verificar licencia antes de adaptar. Documentar origen y cambios en cada adaptación.

## Leyenda

- **Prioridad**: P0 (crítica), P1 (alta), P2 (media), P3 (baja/referencia)
- **Estado**: `analyzed` (estudiado), `adopted` (patrón aplicado), `partial` (parcial), `rejected` (descartado), `later` (futuro)
- **Riesgo**: licencia, calidad del código, mantenimiento, dependencias pesadas

---

## A) Frontend / Visualización / Mapas / Grafos

| Repo | Tecnología | Utilidad para ElectSim | Módulo destino | Patrón aprovechable | Riesgo | Prioridad | Estado |
|------|-----------|------------------------|----------------|---------------------|--------|-----------|--------|
| `globalthreatmap-main` | JS/D3 | Mapa de amenazas geopolíticas en tiempo real | `apps/web/components/maps/threat-map` | Animaciones de eventos sobre mundo, color scaling por severidad | bajo | P1 | analyzed |
| `deck.gl-master` | WebGL/JS | Capas geoespaciales de alto rendimiento | `apps/web/components/maps` | Heatmap layers, scatter, arc para flujos electorales | MIT, bajo | P0 | adopted |
| `kepler.gl-master` | React/deck.gl | Exploración interactiva de datos geoespaciales | Migración riesgo, electoral | Filtros temporales, time playback | MIT, medio | P2 | analyzed |
| `echarts-master` | JS | Visualizaciones premium completas | `apps/web/components/charts` | Sankey, Sunburst, Treemap, themes oscuros | Apache, bajo | P0 | adopted |
| `cytoscape.js-unstable` | JS | Grafos de actores, citation networks | `apps/web/components/graphs/actor-graph` | Layouts cose-bilkent, dagre para jerarquías | MIT, bajo | P1 | adopted |
| `plot-main` (Observable Plot) | JS | Gráficos editorial y data journalism | charts page, briefings | Faceting, marks combinables | ISC, bajo | P1 | analyzed |
| `plotly.py-main` | Python | Stack ya en uso (Streamlit) | `dashboard/ui/premium_charts.py` | Themes dark | MIT | P0 | adopted |
| `civio-graphs-public-main` | JS | Gráficos de periodismo de datos español | briefings, riesgo | Estilo editorial, etiquetado claro | bajo | P2 | analyzed |
| `dash-dev` | Python/React | Dashboards interactivos | referencia | Patrón component-tree | MIT | P3 | rejected (preferimos Next) |
| `gipt-dashboard-main` | dashboard | Patrón legislativo | legislativo | Layouts de monitor parlamentario | bajo | P2 | analyzed |
| `everypolitician.org-main` | datos | Estructura de actores políticos | mapa de actores | Schema everypolitician para perfiles | CC0 | P1 | adopted |
| `Leaflet-main` | JS | Mapas web ligeros | mapas, alternativa a maplibre | Polígonos por CCAA | BSD-2 | P2 | analyzed |
| `vega-lite-main` | JS | Grammar of graphics | charts narrativos | Especificaciones declarativas | BSD-3 | P3 | later |
| `sigma.js-main` | JS | Grafos masivos | grafos memoria | Renderizado WebGL | MIT | P2 | analyzed |
| `rawgraphs-app-master` | JS/Svelte | Visualización experimental | exploración | Layouts originales | Apache | P3 | analyzed |

## B) Media scraping / Ingesta / Prensa / Narrativas

| Repo | Tecnología | Utilidad | Módulo destino | Patrón aprovechable | Riesgo | Prioridad | Estado |
|------|-----------|----------|----------------|---------------------|--------|-----------|--------|
| `fundus-master` | Python | Crawler robusto de prensa | `media_intelligence/acquisition.py` | Extractores específicos por outlet, retries inteligentes | MIT | P0 | adopted |
| `FreshRSS-edge` | PHP/RSS | Validador y aggregator RSS | `media_intelligence/rss_validator.py` | Detección de feeds rotos, redirects | AGPL (no copiar) | P1 | analyzed |
| `api-client-main` (Media Cloud) | Python | API client maduro | media intelligence | Rate limiting, normalización | MIT | P1 | adopted |
| `Spanish-Newspapers-Scraper-master` | Python | Scrapers específicos España | `etl/ingestion/connectors/spanish_press` | Selectores por medio español | bajo | P0 | partial |
| `IPTC-Media-Topic-Classification-main` | Python/ML | Taxonomía estándar IPTC | `analytics/topic_modeling` | Vocabulario controlado, jerarquía | bajo | P1 | adopted |
| `BERTopic-master` | Python/transformers | Topic modeling de calidad | `analytics/big_data_engine.py` | C-TF-IDF, hierarchical topics | MIT | P0 | adopted |
| `phrasemachine-master` | Python | Extracción de frases nominales | `media_intelligence/article_quality.py` | POS-based phrase extraction | MIT | P1 | partial |
| `group_mention_detection-main` | Python | Menciones a grupos en texto | sentiment v2 | Patrones para colectivos | bajo | P2 | analyzed |
| `involvement_polarization-main` | Python | Polarización por implicación | `analytics/big_data_engine.py` | Métrica de polarization_index | bajo | P1 | adopted |
| `Factual-Reporting-and-Political-Bias-Web-Interactions-main` | Python | Sesgo mediático | source quality | Score por outlet | bajo | P1 | analyzed |
| `brag-fake-news-campaigns-main` | Python | Campañas coordinadas | `analytics/social_listening_engine.py` | Detección coordinated_amplification | bajo | P1 | adopted |
| `auritus-master` | Python | Análisis editorial | media | Métricas editoriales | bajo | P2 | analyzed |
| `pysentimiento-master` | Python | Sentiment ES/PT/EN | `analytics/sentiment_engine_v2.py` | Modelos ya entrenados español | MIT | P0 | adopted |
| `robertuito-main` | Python | Sentiment español | sentiment | Modelo BETO | bajo | P2 | analyzed |
| `beto-master` | Python | BERT español | NER, sentiment | Embeddings ES | bajo | P2 | later |
| `NER-for-News-Headlines-main` | Python | NER en titulares | `etl/ingestion/enrichment.py` | Patrones titulares | bajo | P2 | analyzed |
| `Real-Time-News-Article-Analysis-with-NER-main` | Python | Pipeline NER tiempo real | enrichment | Patrón pipeline | bajo | P2 | analyzed |
| `pyJedAI-main` | Python | Entity resolution y deduplicación | `etl/ingestion/dedup_engine.py` | Blocking + matching | bajo | P1 | adopted |

## C) LLM / RAG / Agentes / Ollama

| Repo | Tecnología | Utilidad | Módulo destino | Patrón aprovechable | Riesgo | Prioridad | Estado |
|------|-----------|----------|----------------|---------------------|--------|-----------|--------|
| `langchain-master` | Python/JS | Framework LLM completo | referencia, no migrar | Prompt templates, chain patterns | MIT | P0 | analyzed |
| `crewAI-main` | Python | Multi-agent orchestration | workflows engine | Crew/agent abstractions | MIT | P1 | partial |
| `autogen-main` | Python | Multi-agent conversacional | brain, comms | Agent-to-agent patterns | MIT | P1 | analyzed |
| `FlashRAG-main` | Python | RAG eficiente | document QA | Retrieval pipelines | MIT | P0 | adopted |
| `anything-llm-master` | TS/React | LLM frontend + RAG | apps/web/brain | Chat UI patterns, document mgmt | MIT | P1 | adopted |
| `chroma-main` | Python | Vector DB | document embeddings | Persistencia local, hybrid search | Apache | P0 | adopted |
| `qdrant-master` | Rust | Vector DB performante | producción | Mejor que chroma para escala | Apache | P2 | later |
| `verba-master` | Python | RAG de Weaviate | referencia | UI patterns para retrieval | BSD-3 | P3 | analyzed |
| `graphiti-main` | Python | Graph memory para agentes | `memory_engine/knowledge_graph.py` | Episodic/semantic graph patterns | Apache | P0 | adopted |
| `composio-next` | TS/Python | Tool calling integraciones | brain, integrations | Tool definitions estandarizadas | Apache | P1 | analyzed |
| `awesome-mcp-servers-main` | docs | Lista MCP servers | referencia | Inspiración integraciones | CC0 | P1 | analyzed |
| `European-Parliament-MCP-Server-main` | Python | MCP server PE | legislativo | Patrón para Congreso/Senado MCP | bajo | P0 | adopted |
| `MCP-BOE-main` | Python | MCP server BOE | legislativo | Acceso BOE estructurado | bajo | P0 | adopted |
| `agent-fridays-global-intelligence-monitor-main` | Python | Monitor inteligencia global | command center | Patrón global signals | bajo | P1 | analyzed |
| `HARK-main` | Python | Macro modeling con agentes | simulación | Heterogeneous agents | Apache | P2 | analyzed |
| `KeywordExplorer-main` | Python | Keyword expansion | search, narratives | Sinónimos contextuales | bajo | P2 | analyzed |
| `AgentTorch-master` | Python | Large population models | simulation engine | Agentes a gran escala | MIT | P1 | analyzed |
| `gpt4all-main` | C++/Python | LLM local | brain | Alternativa Ollama | MIT | P3 | rejected (Ollama suficiente) |
| `chainlit-main` | Python | Chat UI rápido | brain | Streamline chat patterns | Apache | P3 | rejected (preferimos Next) |
| `pydantic-ai-main` | Python | Agentes con Pydantic | brain | Tool calling type-safe | MIT | P1 | adopted |
| `ragflow-main` | Python | RAG completo | document QA | Patrón pipeline RAG | Apache | P2 | analyzed |
| `Local-NotebookLM-main` | Python | NotebookLM local | briefing audio | Audio summarization | bajo | P1 | adopted |
| `open-webui-main` | TS/Svelte | UI para Ollama | referencia | Patrones UX chat | MIT | P2 | analyzed |
| `reportAI-main` | Python | Generación reportes | briefings | Templates report | bajo | P2 | analyzed |

## D) ETL / Orquestación / Calidad / Memoria

| Repo | Tecnología | Utilidad | Módulo destino | Patrón aprovechable | Riesgo | Prioridad | Estado |
|------|-----------|----------|----------------|---------------------|--------|-----------|--------|
| `airbyte-master` | Python/Java | Conectores ETL maduros | `etl/ingestion/connectors` | Conectores estandarizados | MIT | P1 | analyzed |
| `dagster-master` | Python | Orquestación con software-defined assets | pipelines | Asset materialization | Apache | P0 | adopted |
| `prefect-main` | Python | Workflow orchestration | `pipelines/` | Tasks, flows, deployments | Apache | P0 | adopted |
| `dbt-core-main` | Python/SQL | Transformaciones SQL | analytics | dbt models pattern | Apache | P1 | analyzed |
| `dlt-devel` | Python | Data loading tool | ingesta | Schema inference, incremental | Apache | P1 | analyzed |
| `great_expectations-develop` | Python | Data quality | tests pipelines | Expectations DSL | Apache | P1 | adopted |
| `airflow-main` | Python | Orquestación tradicional | referencia | DAG patterns | Apache | P3 | rejected (preferimos Prefect) |
| `kafka-master` | Java | Streaming | producción futuro | Event streaming | Apache | P3 | later |
| `datahub-master` | Python/Java | Catálogo de datos | data governance | Lineage, ownership | Apache | P2 | later |
| `alembic-main` | Python | Migraciones DB | `db/migrations/` | Ya en uso | MIT | P0 | adopted |
| `sqlmodel-main` | Python | ORM moderno | refactor models | Pydantic + SQLAlchemy | MIT | P1 | analyzed |

## E) Legislativo / Parlamento / BOE / UE

| Repo | Tecnología | Utilidad | Módulo destino | Patrón aprovechable | Riesgo | Prioridad | Estado |
|------|-----------|----------|----------------|---------------------|--------|-----------|--------|
| `BOE-master` | Python | Scraper BOE | `etl/sources/boe.py` | Extracción de boletines | bajo | P0 | adopted |
| `congreso-scrapper-main` | Python | Scraper Congreso ES | `etl/sources/congreso.py` | Iniciativas, votaciones | bajo | P0 | adopted |
| `Congreso-Scrapper-main 3` | Python | Variante reciente | congreso | Mejoras vs anterior | bajo | P1 | partial |
| `parltrack-master` | Python | Tracking PE | `etl/sources/europarl.py` | MEP votes, dossiers | AGPL (sólo patrón) | P1 | analyzed |
| `eurlex-master` | Python | EUR-Lex parser | europa | Documentos UE | bajo | P1 | adopted |
| `euparliamentmonitor-main` | dashboard | Monitor PE | europarl | UI patterns | bajo | P2 | analyzed |
| `European-Parliament-MCP-Server-main` | Python | MCP server | brain tools | Tool integration | bajo | P1 | adopted |
| `openstates-scrapers-main` | Python | Scrapers estatales US | referencia | Patrón scraper genérico | GPL (no copiar) | P2 | analyzed |
| `theyworkforyou-master` | Perl/Python | Parlamento UK | referencia | Roll call analysis | bajo | P2 | analyzed |
| `senadoRES-master` | R | Senado España | data import | Datasets ya generados | bajo | P1 | adopted |
| `MiCongreso-gh-pages` | datos | Congreso ES | data import | Estructura de actores | bajo | P2 | analyzed |
| `congress-main` | Python | Congress US | referencia | API client patrón | MIT | P3 | analyzed |
| `riksdagsmonitor-main` | Python | Monitor SE | referencia | Patrón monitor parlamentario | bajo | P3 | analyzed |
| `seguimiento-politico.github.io-master` | dashboard | Seguimiento político ES | referencia | Casos de uso | bajo | P2 | analyzed |

## F) Electoral / Actores / Encuestas

| Repo | Tecnología | Utilidad | Módulo destino | Patrón aprovechable | Riesgo | Prioridad | Estado |
|------|-----------|----------|----------------|---------------------|--------|-----------|--------|
| `infoelectoral-main` | R/datos | Resultados electorales ES | `data_seeds/electoral_results` | Datos JE-Central oficiales | bajo | P0 | adopted |
| `infoelectoral-master` | R | Variante | electoral | Histórico | bajo | P0 | adopted |
| `SpainPoliticsAnalytics-master` | Python/Jupyter | Análisis política ES | analytics, briefings | Notebooks de análisis | bajo | P1 | analyzed |
| `manifestoR-master` | R | Manifestos | actores | Posiciones programáticas | GPL (sólo datos/patrón) | P1 | analyzed |
| `coalitions-master` | Python/R | Análisis coaliciones | `analytics/coalition_finder.py` | Power index Banzhaf | bajo | P0 | adopted |
| `abcvoting-master` | Python | Aprobación de votación | simulator | Métodos electorales | MIT | P2 | analyzed |
| `anesr-master` | R | ANES surveys | encuestas, ciencia política | Patrón análisis encuestas | bajo | P2 | analyzed |
| `pewmethods-master` | R | Pew methods | weighted analysis | Ponderación de encuestas | bajo | P1 | analyzed |
| `everypolitician-data-master` | datos | Políticos por país | `data_seeds/political_actors.py` | Schema common | CC0 | P0 | adopted |
| `candidator-master` | datos | Candidatos | actores | Datos electoral | bajo | P2 | analyzed |
| `poli-sci-kit-main` | Python | Toolkit ciencia política | analytics | Funciones base | MIT | P1 | adopted |
| `votainteligente-portal-electoral-master` | Django | Portal electoral CL | referencia | Patrones UX electoral | GPL | P3 | analyzed |
| `valkompass-ai-main` | Python | Voto compass AI | candidato selector | Encuesta + matching | bajo | P2 | analyzed |
| `us-potus-model-master` | R/Stan | Modelo electoral US | nowcasting | Modelos jerárquicos | bajo | P2 | analyzed |
| `sentiment-elecciones-master` | Python | Sentiment electoral ES | sentiment | Específico ES | bajo | P2 | analyzed |
| `polldis-master` / `poldis-master` | Python | Análisis de polls | nowcasting | Patrones de aggregation | bajo | P2 | analyzed |

## G) Geoespacial / Territorio

| Repo | Tecnología | Utilidad | Módulo destino | Patrón aprovechable | Riesgo | Prioridad | Estado |
|------|-----------|----------|----------------|---------------------|--------|-----------|--------|
| `giscoR-main` | R | Datos GISCO Eurostat | mapas EU | Polígonos Europa | bajo | P1 | adopted |
| `caRtociudad-master` | R | Geocoding ES | actor location | API CartoCiudad | bajo | P1 | adopted |
| `LAU2boundaries4spain-master` | datos | Límites municipios ES | mapas territoriales | Geometrías oficiales | bajo | P0 | adopted |
| `CatastRo-main` | R | Catastro ES | territorio | Datos catastrales | bajo | P2 | analyzed |
| `geopy-master` | Python | Geocoding genérico | actor location | Múltiples backends | MIT | P1 | adopted |
| `geosnap-main` | Python | Análisis geográfico longitudinal | territorial | Cambio temporal | BSD-3 | P2 | analyzed |
| `geoai-main` | Python | GeoAI utils | mapas | Embeddings geo | bajo | P3 | later |
| `gaia-main` | Python | Geo analytics | territorial | Patrones | bajo | P3 | analyzed |
| `geemap-master` | Python | Earth Engine | satellite | Imagery (no prioritario) | MIT | P3 | rejected |
| `Awesome-Electrical-Grid-Mapping-main` | docs | Mapping eléctrico | crisis energía | Datos infraestructura | CC | P2 | analyzed |
| `pysal-main` | Python | Spatial analysis | territorial | Autocorrelación espacial | BSD-3 | P1 | analyzed |
| `splot-main` | Python | Spatial plots | mapas | Visualización pysal | BSD-3 | P2 | analyzed |
| `Siane-master` | Python | Geocoding INE ES | territorial | Patrones específicos | bajo | P1 | adopted |
| `spanishoddata-main` | Python | Datos OD ES | mobilidad | Origin-destination | bajo | P2 | analyzed |

## H) Economía / Estadística / Causalidad

| Repo | Tecnología | Utilidad | Módulo destino | Patrón aprovechable | Riesgo | Prioridad | Estado |
|------|-----------|----------|----------------|---------------------|--------|-----------|--------|
| `eurostat-master` | R/Python | Eurostat client | `etl/ingestion/connectors/eurostat_connector.py` | API mature | bajo | P0 | adopted |
| `ineapir-main` | R | INE ES | `etl/ingestion/connectors/ine_connector.py` | API client INE | bajo | P0 | adopted |
| `censosine21-master` | datos | Censo 21 ES | demografia | Microdata estructura | bajo | P1 | adopted |
| `tidyBdE-main` | R | Banco de España | `etl/ingestion/connectors/bde_connector.py` | Series macro | bajo | P0 | adopted |
| `OpenBB-develop` | Python | Plataforma financial open | finanzas | API uniforme | AGPL (sólo patrón) | P1 | analyzed |
| `FinanceToolkit-main` | Python | Toolkit financiero | macro | Ratios estandarizados | MIT | P1 | adopted |
| `CausalPy-main` | Python | Causal inference Bayesian | `analytics/causal_impact` | DiD, RDD, ITS | Apache | P0 | adopted |
| `dowhy-main` | Python | Causal inference | causal | Causal graphs | MIT | P1 | analyzed |
| `statsforecast-main` | Python | Forecasting fast | `analytics/big_data_engine.py` | AutoARIMA, ETS | Apache | P0 | adopted |
| `statsmodels-main` | Python | Modelos estadísticos | analytics | Ya en uso | BSD-3 | P0 | adopted |
| `forecast_evaluation-main` | Python | Evaluation forecasting | model eval | Métricas estandarizadas | bajo | P2 | analyzed |
| `mesa-main` | Python | Agent-based modeling | simulación | Framework ABM | Apache | P1 | analyzed |
| `pymc-6` | Python | Bayesian | nowcasting | Modelos jerárquicos | Apache | P1 | analyzed |
| `BDA_course_Aalto-master` | docs | Curso Bayesian | referencia | Patrones modelado | bajo | P3 | analyzed |
| `weightedcalcs-master` | Python | Cálculos ponderados | encuestas | Survey weights | MIT | P2 | adopted |
| `QuantEcon.py-main` | Python | Quant economics | macro | Modelos formales | BSD-3 | P2 | analyzed |
| `Quantitative-Macroeconomics-main` | Python | Quant macro | referencia | Patrones | bajo | P3 | analyzed |
| `prince-master` | Python | MCA, PCA | dim reduction | Reducción dimensional | MIT | P3 | analyzed |
| `tradingeconomics-master` | Python | Datos macro | economic | API client | bajo | P2 | analyzed |
| `world-development-indicators-main` | datos | WDI | macro | Datasets banco mundial | bajo | P2 | analyzed |

## I) OSINT / Riesgo / Compliance

| Repo | Tecnología | Utilidad | Módulo destino | Patrón aprovechable | Riesgo | Prioridad | Estado |
|------|-----------|----------|----------------|---------------------|--------|-----------|--------|
| `spiderfoot-master` | Python | OSINT framework | risk profiling | Modular OSINT scans | MIT | P1 | analyzed |
| `recon-ng-master` | Python | Recon framework | risk | Patrón recon | GPL (no copiar) | P2 | analyzed |
| `WhatsMyName-main` | datos | Username enum | OSINT | Datos de plataformas | MIT | P2 | analyzed |
| `opensanctions-main` | Python/datos | Sanctions data | risk, KYC | Listas sanciones | CC | P0 | adopted |
| `followthemoney-main` | Python | FtM ontology | actores económicos | Schema entidades | MIT | P0 | adopted |
| `awesome-compliance-main` | docs | Compliance lists | governance | Frameworks | CC | P2 | analyzed |
| `contractacio.cat-main` | datos | Contratación CAT | corruption signals | Open contracting | bajo | P1 | adopted |
| `contrataciondelestado-master` | Python | Contratación estatal ES | corruption signals | PLACE scraper | bajo | P0 | adopted |
| `Awesome-OSINT-For-Everything-main` | docs | OSINT lists | referencia | Recursos | CC | P2 | analyzed |
| `awesome-osint-master` | docs | OSINT classic list | referencia | Recursos | CC | P3 | analyzed |
| `API-s-for-OSINT-main` | docs | APIs OSINT | conectores | Lista APIs | CC | P2 | analyzed |
| `osint_stuff_tool_collection-main` | docs | OSINT tools | referencia | Inventario | CC | P3 | analyzed |
| `Social-Media-OSINT-Tools-Collection-main` | docs | RRSS OSINT | social listening | Tools | CC | P3 | analyzed |
| `osbex-main` | Python | OSINT base | referencia | Patrones | bajo | P3 | analyzed |
| `auditing_targeted_political_advertising-main` | Python | Audit ads políticos | trasparencia | Patrón auditoría | bajo | P2 | analyzed |
| `Osintgraph-master` | JS/D3 | Grafos OSINT | actor relations | Visualización | bajo | P2 | analyzed |
| `osint-geo-extractor-master` | Python | Geo OSINT | territorio | Extracción geo de texto | bajo | P2 | analyzed |
| `deepdarkCTI-main` | docs | Cyber threat intel | referencia | Sólo referencia | CC | P3 | analyzed |
| `G-APT-Monitor-main` | Python | APT monitor | cyber risk | Patrón monitoreo | bajo | P3 | later |

## Repos descartados o de baja prioridad

| Repo | Razón |
|------|-------|
| `dash-dev` | Reemplazado por Next.js |
| `chainlit-main` | Brain ya implementado en Next |
| `airflow-main` | Preferencia por Prefect |
| `gpt4all-main` | Ollama suficiente |
| `geemap-master` | No necesitamos satellite imagery |
| `kafka-master` | Sobreingeniería para etapa actual |
| `qdrant-master` | Chroma suficiente para etapa actual |
| `recon-ng-master` | Licencia GPL |
| Repos duplicados (con sufijos " 2", " 3") | Usar solo la versión principal |

---

## Adopciones críticas para el sprint actual (P0)

1. **`pysentimiento-master`** → reemplazar lexicon manual de `analytics/sentiment_engine_v2.py` por modelo entrenado ES.
2. **`fundus-master`** → patrones de extractor por outlet en `media_intelligence/acquisition.py`.
3. **`BERTopic-master`** → backbone de `analytics/big_data_engine.py:topic_modeling`.
4. **`graphiti-main`** → patrones de graph memory en `memory_engine/knowledge_graph.py`.
5. **`opensanctions-main`** + **`followthemoney-main`** → integrar para risk profiling de actores.
6. **`statsforecast-main`** → AutoARIMA en `analytics/big_data_engine.py:forecast_series`.
7. **`coalitions-master`** → power index en `analytics/coalition_finder.py`.
8. **`MCP-BOE-main`** + **`European-Parliament-MCP-Server-main`** → MCP servers nativos para brain tools.
9. **`echarts-master`** → migrar `apps/web/components/charts` a ECharts cuando se necesiten Sankey/Sunburst pesados.
10. **`anything-llm-master`** → patterns de chat doc-grounded para `apps/web/app/brain`.

## Roadmap por fases

- **Fase actual (sprint sub3 + Gotham core)**: P0 marcados como "adopted" o "partial" arriba.
- **Fase próxima**: P1 marcados "analyzed" → migrar a "adopted".
- **Fase trimestre**: P2 según prioridad de producto.
- **Backlog**: P3 y "later".

## Notas de licencia

- **No copiar**: AGPL, GPL → solo estudiar patrones, escribir código original.
- **OK con atribución**: MIT, BSD, Apache, ISC, BSD-3 → puede adaptarse con cita en docstring.
- **Datos públicos**: CC0, CC-BY → usables con atribución.

Cualquier código adaptado debe llevar comentario:
```python
# Pattern adaptado de gits amigos/<repo>/<archivo> — licencia <X>
# Original: <url> · Modificado para Politeia <fecha>
```
