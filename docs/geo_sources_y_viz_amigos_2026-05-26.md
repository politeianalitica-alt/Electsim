# `/geopolitica` — Fuentes y patrones de visualización a extraer de `gits amigos`

Fecha: 2026-05-26 · Autor: análisis 4-agente sobre 342 repos · Para: Sprint G14+

## Lectura ejecutiva

El módulo `/geopolitica` ya tiene base sólida (ontología `GeoSignalReading`, 9 dimensiones de riesgo, ACLED/GDELT/OpenSanctions/ReliefWeb/UCDP integrados, badges de fuente y `GeoAuditDrawer`). Lo que falta es **profundidad de fuentes** (terceros países, infraestructura crítica, narrativa internacional) y **profundidad visual** (mapa global real, flujos, heatmaps, comparador multi-país).

La carpeta `gits amigos` aporta 4 palancas:

1. **5 fuentes nuevas verificables** que doblan el alcance de señales débiles: OpenSky (vuelos militares), EIA (energía mundial), AIS marítimo, Polymarket (mercado predictivo), GEM (infraestructura energética por país).
2. **1 MCP que desbloquea 330k indicadores macro** (FRED+WB+IMF+Eurostat+OECD) con 1 sola integración (`openecon-data`).
3. **1 dataset MBFC con 3 920 medios** etiquetados por `bias`+`factual_reporting`+`country`+`press_freedom` que habilita el badge "narrativa viene de fuente régimen autoritario X" sobre cualquier URL.
4. **Stack de viz** (deck.gl + echarts + AG Grid + giscoR) que cubre los 4 huecos visuales actuales: mapamundi, sankey/heatmap, tabla maestra densa, comparador multi-país.

Total estimado: **18 integraciones** distribuidas en 4 sprints (G14-G17), todas con esfuerzo S/M (ninguna L), reusando lo existente sin reemplazar.

---

## Top 18 prioritizado cross-bucket

Ordenado por **ratio impacto/esfuerzo** combinando los 4 análisis. Columna *Bucket* = origen (OSINT / VIZ / ECON / MEDIA).

| # | Acción | Bucket | Tipo | Esfuerzo | Sprint sugerido | Justificación 1-línea |
|---|---|---|---|---|---|---|
| 1 | **openecon-data MCP** (FRED+WB+IMF+Eurostat+OECD) | ECON | Fuente | S | G14 | Una integración → 330k indicadores macro de todos los países de la watchlist |
| 2 | **MBFC media bias registry** (3 920 medios) | MEDIA | Dataset | S | G14 | Badge "fuente régimen X" en cualquier URL; transforma `narrative_pressure` |
| 3 | **RSSHub state-media bundle** (Xinhua, CGTN, Sputnik ES, TASS, AlJazeera) | MEDIA | Fuente | S | G14 | Resuelve feeds inalcanzables hoy; Sputnik en español = vector clave para hispanohablantes |
| 4 | **globalthreatmap `event-classifier.ts` + BOILERPLATE_PATTERNS** | OSINT | Lib | S | G14 | 200 LoC de regex que limpian TODOS los feeds existentes antes de NLP |
| 5 | **tariff-rate-tracker + trade-war-redux** | ECON | Fuente | S | G14 | Arancel-del-día US/UE × producto → alerta exposure ES cuantificada |
| 6 | **GEM `gem_per_country` GeoJSON** (plantas eléctricas + acero) | OSINT/ECON | Fuente | S | G14 | Infraestructura crítica geolocalizada → capa "qué se rompe si país X cae" |
| 7 | **agent-fridays/worldmonitor feeds**: OpenSky, EIA, AIS, Polymarket | OSINT | Fuente | M | G15 | 4 fuentes verificables con código Next.js portable directo a Route Handlers |
| 8 | **deck.gl IconLayer+HexagonLayer+ArcLayer** sobre MapLibre actual | VIZ | Lib | M | G15 | Mapamundi de señales sin descartar MapLibre; resuelve gap visual #1 |
| 9 | **giscoR GeoJSON países** (Eurostat NUTS-0/1/2) | VIZ | Dataset | S | G15 | Geometrías oficiales para los polígonos del mapa global |
| 10 | **echarts Sankey ES↔países** | VIZ | Lib | S | G15 | Flujos comerciales/diplomáticos/conflicto sin nueva fuente |
| 11 | **echarts heatmap calendario** | VIZ | Lib | S | G15 | Densidad de eventos por día en un año, de un vistazo |
| 12 | **AG Grid React** para tabla maestra de eventos | VIZ | Lib | M | G15 | Filtrado/orden/virtualización en >5k eventos; reemplaza listas HTML actuales |
| 13 | **CausalPy** (synthetic control + DiD + ITS) | ECON | Lib | M | G16 | Eleva briefings de "correlación" a "estimación causal con CI" defensible |
| 14 | **OpenSanctions ownership graph** (FtM dump completo) | ECON | Fuente | M | G16 | Nueva sub-dimensión `sanctions_secondary_exposure` para empresas ES |
| 15 | **fundus publishers no-Western** (CN/IL/IND/ID/JP/LB) | MEDIA | Fuente | S | G16 | Activar lo ya integrado (S2.4) para framing cross-país |
| 16 | **news-title-bias UI pattern** ("mismo evento × N medios") | MEDIA | UX | S | G16 | Vista comparativa de framing geo dentro de `/geopolitica/eventos/[id]` |
| 17 | **brag-fake-news Balanced RAG** (FIMI/astroturfing) | MEDIA | Lib | M | G17 | Detector de campañas coordinadas usando politeia-brain (sin coste LLM externo) |
| 18 | **deepdarkCTI + APIs-for-OSINT consolidados** → YAML curado | OSINT | Catálogo | S | G17 | Catálogo de feeds y fuentes documentado dentro de `/geopolitica/fuentes` |

### Skips explícitos (no añaden a /geopolitica)

| Repo | Motivo del skip |
|---|---|
| spiderfoot, recon-ng | Frameworks de pentest, no de inteligencia geopolítica |
| maigret, holehe, WhatsMyName, AutoProfiler, deepkrak3n, gvision, Osintgraph | OSINT a personas — riesgo reputacional + GDPR, fuera del producto B2B/político |
| kepler.gl embeddable | Pesado; copiar UX, no embeber |
| Leaflet | Redundante con MapLibre |
| sigma.js, gephi, reactodia | Sobre-ingeniería para escala actual |
| plotly.py, dash, streamlit | Python, no embebibles en Next |
| Spanish-Newspapers-Scraper, newspaper-scraping, robertuito, news-briefing-generator | Política doméstica ES → mejor `/prensa` |
| FreshRSS, twitterbot, newslinkrss | Operativos puros, no aportan inteligencia |
| markitdown, docling, pdfplumber, unstructured | Ya cubre Bloque 9 Document Intelligence |
| graphrag, ragflow, FlashRAG, gpt-rag-ingestion | RAG genérico; ya tienes ChromaDB+politeia-brain |
| tidyBdE, ineapir, istacbaser, scraper-pge, gobierto-budgets, spain-datasets | España doméstica → `/macro` lo cubre |
| legalize-{ar,co,pt} | Jurisdicciones no relevantes para ES |
| FinanceToolkit | Subset de OpenBB |
| supplychainpy | Librería sin datos |
| cia-master, riksdagsmonitor | Java/Spring, no portable; solo extraer DATA_MODEL como concept |

---

## Roadmap detallado por sprint

### Sprint G14 · Quick wins (1 semana · todo esfuerzo S)

**Objetivo**: 6 integraciones de bajo riesgo que multiplican el dato disponible y la calidad de feeds existentes.

| Item | Archivos a crear/modificar | Verificación |
|---|---|---|
| openecon-data MCP | `agents/brain/tools/openecon_tools.py` + wire en `llm_tools_registry.py` | `chat: PIB Argelia 2024` devuelve dato WB |
| MBFC media registry | Migración `0081_media_bias_registry.sql` (3920 filas seed) + JOIN en `/api/geopolitica/[...path]/route.ts` cuando enriquezca URLs | URL `xinhuanet.com` → badge `press_freedom: not_free` |
| RSSHub bundle | `docker-compose.rsshub.yml` self-host + 5 feeds nuevos en `lib/geopolitica/geo-rss-catalog.ts` | `/geopolitica` muestra eventos con `source_country: CN, RU, QA` |
| event-classifier | Port a `lib/geopolitica/event-classifier.ts` + aplicar en `buildSpainRiskIndex` previo a NLP | Snapshot test: titular con boilerplate "Read more · Subscribe" → limpio |
| tariff-rate-tracker | Cron diario en `apps/workers/` que pulle CSV → tabla `geo_tariff_panel` + nuevo `impact_channel: 'tariff_secondary'` | Subida arancel US → alerta `/geopolitica` con productos ES expuestos |
| GEM GeoJSON | Snapshot trimestral en `data/geo_infra_energy/{country}_power.geojson` + capa opcional en mapa | Mapa de Argelia muestra plantas LNG |

### Sprint G15 · Visualización (1 semana · esfuerzo S-M)

**Objetivo**: cerrar los 4 huecos visuales actuales (mapamundi, sankey, heatmap, tabla densa).

| Item | Archivos | Verificación |
|---|---|---|
| deck.gl sobre MapLibre | `components/geopolitica/GeoWorldMap.tsx` + `IconLayer` eventos ACLED + `HexagonLayer` densidad + `ArcLayer` flujos ES→países | Tab "Mapa Global" en `/geopolitica` |
| giscoR GeoJSON países | `public/geo/world-countries.geo.json` (NUTS-0) + `lib/geopolitica/country-shapes.ts` | Polígonos países pintables por score |
| Sankey ES↔países | `components/geopolitica/GeoFlowsSankey.tsx` (echarts) | Hover sobre nodo "Marruecos" muestra flujos: comercio + migración + cooperación |
| Heatmap calendario | `components/geopolitica/GeoEventCalendarHeatmap.tsx` (echarts) | 365 celdas color-coded por densidad de eventos críticos |
| AG Grid eventos | `components/geopolitica/GeoEventsTable.tsx` (`ag-grid-react`) reemplaza listas en `GeoEventStream` | Filtros país/tipo/intensidad/fecha sobre 10k filas sin lag |
| Observable Plot timeline | `components/geopolitica/GeoCountryTimelinePlot.tsx` (mejora `GeoCountryTimeline` actual con dot+rule+band) | Timeline 5 años Marruecos con bandas tono GDELT |

### Sprint G16 · Profundidad analítica (1 semana · esfuerzo M)

**Objetivo**: rigor causal + sanciones secundarias + framing cross-país.

| Item | Archivos | Verificación |
|---|---|---|
| CausalPy synthetic control | `packages/causal/__init__.py` + endpoint `/api/v1/geopolitica/causal_impact` | Pregunta "impacto de cierre frontera Argelia en GLP ES" → synthetic control con CI 95% |
| OpenSanctions ownership graph | Job semanal worker ingest FtM dump → tabla `entity_ownership` + nuevo score `sanctions_secondary_exposure` en `geo-risk-engine.ts` | Empresa ES con matriz sancionada aparece flagged |
| fundus no-Western | Activar publishers CN/IL/IND/ID/JP/LB en `etl/sources/news/fundus_adapter.py` + tag `regime_type` por publisher | `/geopolitica` muestra artículos Xinhua con badge `regime_type: authoritarian` |
| news-title-bias UI pattern | `components/geopolitica/GeoSameEventFraming.tsx` (timeline horizontal, mismo evento × N medios, color por MBFC bias) | Click en evento "ataque Houthis Mar Rojo" → 5 framings comparados |

### Sprint G17 · Detección de campañas + catálogo (1-2 semanas · esfuerzo M-S)

**Objetivo**: detectar amplificación coordinada y dejar la metodología documentada.

| Item | Archivos | Verificación |
|---|---|---|
| brag-fake-news Balanced RAG | `agents/detection/coordinated_campaigns.py` + endpoint `/api/v1/geopolitica/coordination_score` | Cluster de >50 posts iguales sobre tema X en 24h dispara alerta `narrative_coordination` |
| phrasemachine + yake multilingüe | Reemplazar single-word en `GeoThemeClusters` por multiword phrases | Cluster "orden basado en reglas" cross-link con "rules-based order" + "基于规则的秩序" |
| China-Media CFC anomaly | Load 1993-2022 baseline + comparador en `lib/geopolitica/cn-coverage-anomaly.ts` | Si People's Daily cubre ES >2σ vs baseline → alerta |
| deepdarkCTI + APIs-OSINT consolidados | `data/geopolitica/sources_catalog.yaml` + página `/geopolitica/fuentes` | Sección "Fuentes documentadas" con 100+ feeds catalogados |
| g-apt-monitor APT seed | Migración `0082_cyber_threat_actors.sql` (50 APTs lat/lon) + sub-tab "Ciber-amenazas relevantes ES" | Tab muestra APT28/Lazarus etc. con targeting + relevancia ES |

---

## Detalle por bucket (referencia completa)

### Bucket A — OSINT + threat/intel monitoring

**Top 5 acciones (todas en G14-G15-G17):**

1. **agent-fridays/worldmonitor** (`gits amigos/agent-fridays-global-intelligence-monitor-main/`) — Stack Next.js idéntico al nuestro. Las APIs `api/opensky.js`, `api/eia/`, `api/polymarket.js`, `api/ais-snapshot.js`, `api/rss-proxy.js` son copy-paste directo a Route Handlers. Plus: `data/telegram-channels.json` con canales OSINT curados.
2. **globalthreatmap** (`globalthreatmap-main/`) — `lib/event-classifier.ts` con regex de boilerplate + keywords por categoría. Limpia feeds RSS antes de NLP. Plus: patrón Mapbox + clustering + heatmap reusable (en deck.gl sobre nuestro MapLibre).
3. **G-APT-Monitor** (`G-APT-Monitor-main/`) — `seed_full_db.py` con 50 APTs reales (lat, lon, origen, objetivos). Sub-tab "Ciber-amenazas con relevancia ES" en 1h de trabajo.
4. **deepdarkCTI** (`deepdarkCTI-main/`) — 21 listas markdown curadas: `telegram_threat_actors.md`, `ransomware_gang.md`, `cve_most_exploited.md`. Parser → YAML único.
5. **osint-geo-extractor + geospatial-intelligence-library** — `pip install osint-geo-extractor` extrae eventos verificados de Bellingcat, Cen4InfoRes, GeoConfirmed. Enriquece `GeoAuditDrawer` con "verificación independiente disponible".

### Bucket B — Visualización geoespacial + dashboards

**Stack a adoptar:**

- **deck.gl** (`deck.gl-master/`) + `@deck.gl/react`: composable sobre MapLibre (vía `MapboxOverlay`). Capas: `IconLayer`, `HexagonLayer`, `ArcLayer`, `HeatmapLayer`, `GeoJsonLayer`. No descarta MapLibre actual.
- **echarts** (`echarts-master/`) + `echarts-for-react`: Sankey, heatmap calendario, themeRiver, chord, treemap, parallel coords. Tema dark out-of-box.
- **giscoR** (`giscoR-main/`): GeoJSON oficiales Eurostat (NUTS-0/1/2 países UE + mundo). CDN: `gisco-services.ec.europa.eu`.
- **AG Grid React** (`ag-grid-latest/`): tabla densa con virtualización, filtros, orden, agrupado. Community = free.
- **Observable Plot** (`plot-main/`): timeline `dot`+`rule`+`band` ligera, SSR-friendly.
- **Vega-Lite** (`vega-lite-main/`) + `react-vega`: small-multiples para comparador multi-país (3×3 grid de mini-charts).

**Layout de referencia**: `europe-gas-tracker-dashboard-main/app.py` — hero map + 4 tiles KPI + 2 bar charts horizontales sorted-desc + tabla detalle. Estructura copiable tal cual.

**Patrón UX**: `goit-tracker-greeninfo-map-main/src/modules/` — basemap switcher (claro/oscuro/satélite) + URL state sincronizado + back button geocontextual.

### Bucket C — Económico / sanciones / energía

**Top 5 fuentes:**

1. **openecon-data** (`openecon-data-main/`) — **MCP server**. Una llamada → 330k indicadores de FRED, WB, IMF, Eurostat, OECD + 6 más. Reemplaza varios conectores manuales. Cero almacenamiento (es cliente).
2. **tariff-rate-tracker + trade-war-redux** (`tariff-rate-tracker-master/`, `trade-war-redux-2025-main/`) — CSV diarios listos: `country-by-time.csv` + `daily-tariff-latest-data.csv`. Cron-pull → tabla `geo_tariff_panel`. Trigger de alerta `trade_war`.
3. **GEM `gem_per_country`** (`gem_per_country-main/`) — GeoJSON plantas eléctricas + acero por país. Capa de infraestructura crítica para cruzar con eventos ACLED.
4. **europe-gas-tracker** (`europe-gas-tracker-dashboard-main/`) — Inventario pipelines + LNG europeos. Crítico dado peso ES en re-exportación LNG (~30% UE). Datos GEM Europe Gas Tracker.
5. **OpenSanctions ownership graph** (`opensanctions-main/`) — Ya tenéis filtros país. Falta explotar el grafo FtM de propiedad: empresas ES con matriz/contrato a entidad sancionada → nueva sub-dimensión.

**Analítica causal:**

- **CausalPy** (`CausalPy-main/`) — Bayesiano, synthetic control + DiD + regresión discontinua + ITS. Defiende afirmaciones tipo "el ataque hutí causó +12% LNG ES".
- **dowhy** (`dowhy-main/`) — Alternativa Microsoft con identificación + refutation.
- **statsforecast** (`statsforecast-main/`) — Ya integrado; reutilizar para proyecciones contrafactuales.

**Mercados:**

- **tradingeconomics** — Spread bonos soberanos + CDS como early-warning crisis país. Free tier limitado pero útil.
- **Global-Food-Supply-Chain-Resilience-Analyzer** — ETL clima+gobierno+geopolítica + LSTM/ARIMA. Vector hoy ausente: shock alimentario → migración + inflación ES.

### Bucket D — Medios internacionales / narrativa / desinfo

**Joya crítica #1: MBFC dataset** (`Factual-Reporting-and-Political-Bias-Web-Interactions-main/`)
- 3 920 medios con `bias`, `factual_reporting`, `country`, `press_freedom` (free/mostly_free/partly_free/not_free/total_oppression), `media_type`, `popularity`, `credibility_rating`.
- HuggingFace dataset disponible. Script `scrape_mbfc.py` reproducible.
- Migración: tabla `media_bias_registry` + JOIN por dominio en cada URL que aparezca en convergencia narrativa → badge inmediato.

**Joya crítica #2: RSSHub** (`RSSHub-master/`)
- Self-host Docker. Routes para state-media régimen autoritario:
  - `/aljazeera/*` (EN/AR/ZH)
  - `/cgtn/podcast`, `/chinadaily`, `/chinafactcheck`, `/chinanews`
  - `/sputniknews` (18 idiomas, **incluido español: mundo.sputniknews.com**)
  - `/tass/news`
  - `/cna` (Taiwán)
- Resuelve feeds que hoy no son trivialmente parseables.

**Joya crítica #3: fundus activar no-Western**
- Ya adoptado en S2.4 pero solo para 7 medios ES profesionales.
- Activar publishers ya soportados: `People` (CN), `IsraelNachrichten` (IL), `TimesOfIndia`/`DainikBhaskar` (IND), publishers ID/JP/KR/LB/MX/FR/DE/IT.
- Tag `country` + `regime_type` (democracy/hybrid/authoritarian) en cada artículo.

**Otros:**
- **China-Media CFC v.1** — Dataset cobertura People's Daily 1993-2022 × país × año. Baseline para detectar **anomalías** en cobertura china sobre España.
- **China-TIES** — 135 episodios sanciones China-sender 1949-2020. Catálogo de coerción económica china.
- **brag-fake-news** — Framework Balanced RAG + LLM para detectar astroturfing en X bajo extreme class imbalance. F1 2-3x sobre baselines de grafos. Adaptable con politeia-brain (Ollama local, cero coste API).
- **news-title-bias** — Dataset allsides.com (mismo evento, mismos titulares por medio izq/centro/der). UI pattern replicable: horizontal timeline cross-source.
- **phrasemachine + yake** — Multiword phrases multilingües para Theme Clusters cross-idioma.
- **auditing_targeted_political_advertising** — Pipeline Meta Ad Library (80k ads). Adaptable a ES para detectar anuncios políticos foráneos.

---

## Notas de implementación transversales

### Seguridad / compliance
- **No integrar OSINT-a-personas** (maigret, holehe, WhatsMyName, AutoProfiler, gvision, deepkrak3n). Riesgo GDPR + reputacional. Fuera del producto B2B/político.
- **No exponer keys de APIs comerciales** (Polymarket OK porque es libre; Mapbox OK con token público restringido; OpenSky libre).
- **MBFC dataset** — verificar licencia (uso interno + atribución probablemente OK; redistribución no).

### Arquitectura
- **Convertir en adaptadores, no copiar repos enteros**: openecon-data como cliente MCP, no fork; deck.gl como dependencia npm, no copia.
- **Cero pesado en frontend**: el bundle de `/geopolitica` no debe crecer >200kb gzip. echarts modular import only, deck.gl tree-shaken, AG Grid solo features usadas.
- **Cron pulls a Vercel-friendly cadence**: tariff-rate-tracker = 1×/día; GEM = 1×/trimestre; OpenSanctions ownership dump = 1×/semana en worker dedicado, no en Vercel.

### Calidad de fuentes
- **Etiquetar `regime_type` y `press_freedom`** en todo lo nuevo desde día 1 (consistencia con `geo-methodology-v1`).
- **`source_mode` siempre declarado**: live_api (OpenSky, EIA, Polymarket) / rss_media (RSSHub bundle) / curated_baseline (MBFC, GEM) / derived_from_news (Bellingcat) / analytical_model (CausalPy).
- **Disclaimers** "Qué mide / Qué NO mide" mantenidos. Ej: "Polymarket mide consenso de apostadores, no probabilidad real" / "MBFC es heurística periodística agregada, no auditoría independiente".

### Métricas de éxito post-implementación
- **+10 países** con `structural_risk.available=true` (objetivo G14 vía openecon-data).
- **+50%** de URLs con `media_bias_known=true` (G14 vía MBFC).
- **<2σ false positives** en `narrative_coordination` (G17 vía brag-fake-news adaptado).
- **>5k eventos/día** renderizados en `GeoEventsTable` sin lag (G15 vía AG Grid).

---

## Apéndice · enlaces a referencias originales

- Repos: `/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/gits amigos/`
- Knowledge pre-indexada: `/Users/antoniolegaz/Downloads/Politeria/electsim-espana 2/data/processed/git_amigos_knowledge/repositories.jsonl`
- Inventario exhaustivo previo (más amplio, menos focalizado): `docs/inventario_gits_amigos_exhaustivo_visual_oscar_2026-05-19.md`
- Plan integración previo: `docs/git_amigos_integration.md`
- Estado actual `/geopolitica`: `apps/visual-oscar/app/geopolitica/page.tsx` + `lib/geopolitica/geo-methodology.ts` + `lib/geopolitica/geo-risk-engine.ts`
