# Auditoría de contenido · 5 módulos críticos · 2026-05-31

> **Foco**: contenido (texto / copy / claridad) en los 5 módulos más visibles del dashboard.
> **No incluye**: análisis de fuentes ni metodología (esos son auditorías separadas).
> **Out of scope**: ejecutar cambios — esto es **plan + propuestas**, el usuario decide qué priorizar.
>
> Auditoría realizada con 5 agentes en paralelo (uno por módulo), validado contra código real.
> Cada hallazgo cita `archivo:línea` con copy literal del repo, no inventado.

---

## 0 · Resumen ejecutivo

**El problema raíz no es la falta de contenido, es que el contenido habla el idioma del
sistema, no del analista.** El dashboard expone al usuario:

- Nombres de funciones (`assessSentiment`)
- Campos de API en snake_case (`regional_signal_score`, `scope_level`, `last_30d`, `derived_from_news`)
- Variables de entorno (`ESIOS_API_KEY`)
- Paths de endpoints (`/api/esios/snapshot`)
- Números de sprint internos (`Sprint 6+`, `Sprint Coverage`)
- Nombre del proveedor LLM (`Groq`, `Anthropic Claude`)
- Referencias internas (`CLAUDE.md A2`, `Sprint G15 FASE D4`)
- Nombre del fundador + email personal (en producción, sección `EntsoeSpainPanel.tsx`)

**Es lo mismo problema en los 5 módulos.** Cada sub-equipo construyó su sección
asumiendo un lector que ya conocía el sistema. La home Apple-Newsroom-style se rompe
en cuanto el usuario entra dos niveles.

### Hallazgos P0 (críticos · arreglar primero)

| # | Módulo | Hallazgo | Riesgo |
|---|--------|----------|--------|
| **P0-1** | Sector-Energía | Email personal `politeianalitica@gmail.com` + nombre `Antonio` visible en producción | Credibilidad / privacidad |
| **P0-2** | Estudio | 17+ pestañas del navegador siguen mostrando `· Domo`  | Viola CLAUDE.md §0.5 frontalmente |
| **P0-3** | Sector-Energía | Empty state filtra `ESIOS_API_KEY`, paths `/api/esios/...`, instrucciones Vercel | Filtra infraestructura, rompe ilusión de producto |
| **P0-4** | Geopolítica | Banner Diplomacia: «¿con quién puede tratar España **sin riesgo legal**?» | Claim de compliance grave |
| **P0-5** | Macro | Contradicción 60% Maastricht (caption KPI) vs 100/120% umbrales (interpretación) | Decisión analítica sobre dato inconsistente |

### Patrón sistémico transversal

> El contenido sirve más para auditar el sistema (snake_case visible, nombres de
> función, IDs de sprint, env vars) que para guiar al analista. Lo que falta
> es una **capa de traducción "interno → analista"** consistente y un
> **glosario único** para los 50+ acrónimos del dashboard
> (BERD, NAIRU, FCI, ULC, REER, BDI, ESIOS, OMIE, MAPE, V-Dem, SIPRI, ACLED,
> GDELT, AGNU, AOD, NATO, EDA, OFAC, FSF, UNSC, OFSI, PERE, CESCE, AECID,
> FONPRODE, IRC, IRPC, IPI, BCE, BdE, AIReF, EUA, MI1, PVPC, B2B, BIS, RSF).

---

## 1 · Hallazgos por módulo

### 1.1 · Prensa

#### Top 5 críticos

| # | Hallazgo | Archivo:línea |
|---|----------|---------------|
| 1 | Hero "Mapas" usa `narrative attribution` y `regional_signal_score` sin glosario | `app/prensa/page.tsx:644-645` |
| 2 | Explainer "Pulso" enumera componentes técnicos (`feed por tiers`, `topic × partido`) en vez de responder qué verá el analista | `app/prensa/page.tsx:493-496` |
| 3 | Viralidad expone nota release-log (`first_movers ya integrados`) + métrica sin ventana (`vs ventana anterior`) | `app/prensa/page.tsx:275-277` |
| 4 | TendenciasImpactoView menciona nombre de función `assessSentiment` y labels EN (`beneficial/harmful/neutral/uncertain`) al usuario ES | `_components/TendenciasImpactoView.tsx:282-286` |
| 5 | MapasImpacto: el componente explica bien en español pero el header lo rompe con jerga inglesa | `_components/MapasImpacto.tsx:76-78` vs `page.tsx:644` |

#### Propuestas concretas

**P1 (Hero Mapas)** — `app/prensa/page.tsx:644-645`
```diff
- "¿Dónde impacta? España/CCAA + Global con narrative attribution"
- "Modo ESPAÑA · separa CCAA del medio vs mencionada vs afectada políticamente con regional_signal_score. Modo GLOBAL · país/evento con severidad + narrativa + relevancia ES + fuente + confianza."
+ "¿Dónde tiene impacto político esta cobertura?"
+ "Modo España: distingue origen del medio, territorio mencionado y territorio afectado políticamente. Modo Global: severidad, exposición de España y frame dominante por país."
```

**P2 (Explainer Pulso)** — `app/prensa/page.tsx:493-496`
```diff
- "Narrativas auditables emergentes · feed por tiers nacional/europeo/regional/local · agenda topic × partido · historias que aceleran · contexto GDELT global · Lectura IA con todo lo anterior."
+ "Las narrativas dominantes y los titulares por ámbito (nacional, europeo, regional, local), qué temas concentra cada partido y qué historias están acelerando ahora. Análisis IA opcional."
```

**P3 (Viralidad)** — `app/prensa/page.tsx:275-277`
```diff
- "Narrativas con velocity ≥ 0.5 art/h o aceleración ≥ +10% vs ventana anterior · first_movers ya integrados."
+ "Narrativas que publican más de 0,5 artículos/hora o han acelerado un 10% respecto a la ventana previa (24 h vs 24 h anteriores). Incluye los medios que arrancaron la ola."
```

**P4 (Tendencias)** — `_components/TendenciasImpactoView.tsx:282-286`
```diff
- "...su impacto político (beneficial / harmful / neutral / uncertain) calculado por assessSentiment, NO sólo polaridad plana."
+ "...su impacto político (le beneficia, le perjudica, neutral o sin lectura clara) leído por nuestro motor de sentimiento, no como simple polaridad positivo/negativo."
```

**P5 (Mapas header)** — eliminar menciones internas en `app/prensa/page.tsx:644` y dejar:
```diff
+ "Mapas de impacto · atribución por territorio"
```
(el detalle metodológico ya vive en `MapasImpacto.tsx:76-78`, donde está bien redactado).

#### Hallazgos menores Prensa (resumen)
- `page.tsx:400` — "MEDIOS · INTELLIGENCE · Tab 1/7" → "Inteligencia de medios"
- `page.tsx:414` — `modo 'pluralism'` expone ID técnico → "modo plural"
- `page.tsx:447-454` — botones de balance truncados (`m.slice(0,6)`)
- `page.tsx:606` — "rol narrativo · medios que amplifican" sin definir
- `NarrativesFramingWorkbench.tsx:228` — "clusters sin masa crítica" no se define
- `NarrativesFramingWorkbench.tsx:412-414` — "(conf velocity 70% · accel 50%)" abreviaturas sin glosario
- `TendenciasImpactoView.tsx:373-376` — "derivado de pos/neg/neu (heurística aprox)" expuesto al analista
- `MapaMediosView.tsx:262` — "bucket" sin traducir; falta cómo se asignó la ideología
- `LecturaPoliteia.tsx:88-90` — "CLAUDE.md A2 disclaimer" filtra referencia interna
- `ObservatorioInformacionView.tsx:238-240` — "feeds RSS oficiales · agregado en backend" jerga ingeniería

---

### 1.2 · Macro / Pulso

#### Top 5 críticos

| # | Hallazgo | Archivo:línea |
|---|----------|---------------|
| 1 | Mezcla obligatoria ES + EN sin justificar (`FX matrix`, `sector breakdown`, `IBEX live`) | `components/macro/pulso/DomainHero.tsx:185` |
| 2 | Contradicción Maastricht 60% (caption KPI) vs 100/120% (umbrales interpretación) | `components/macro/pulso/DomainHero.tsx:104,111` |
| 3 | Inconsistencia unidades "Spread ES-DE" — KPI dice `pb` con valores 0–2; interpretación con `*100` da 0–200pb | `components/macro/pulso/DomainHero.tsx:178,184` |
| 4 | Claim normativo "modelo productivo poco intensivo en tecnología" sin marco económico | `components/macro/pulso/DomainHero.tsx:238` |
| 5 | KPI REER con 3 captions distintos para misma métrica (`>100 = apreciación` / `competitividad EA` / `>100 = pérdida comp.`) | `components/macro/pulso/DomainHero.tsx:85,130,180,234` |

#### Propuestas concretas

**M1 (Maastricht)** — `DomainHero.tsx:104,111` — añadir tooltip en caption:
```diff
- caption="Maastricht criterion"
+ caption="Maastricht ≤60% PIB · umbral de referencia"
+ tooltip="Umbrales interpretativos: AIReF/Comisión Europea consideran sostenibilidad bajo presión por encima del 100%. El criterio Maastricht (60%) es de referencia, no aplicable como techo desde la crisis 2010."
```

**M2 (Spread pb)** — unificar `DomainHero.tsx:178,184`:
```diff
- <BigMetric label="Spread ES-DE" value={slope} unit="pb" decimals={0} ...>
+ <BigMetric label="Spread ES-DE" value={slope * 100} unit="pb" decimals={0}
+   caption="diferencial vs Bund · pb = puntos básicos (100 pb = 1 pp)" />
```

**M3 (BERD)** — `DomainHero.tsx:238` — separar dato de juicio:
```diff
- "BERD empresarial ${berd}% PIB. ${berd < 1 ? '▲ Gap esencial en I+D PRIVADA · refleja modelo productivo poco intensivo en tecnología.' : 'Esfuerzo en I+D empresarial mejorando.'} La competitividad se juega en cerrar el gap BERD vs UE."
+ "BERD (gasto privado en I+D) ${berd}% PIB · por debajo de la media UE-27 (~1,5%). La literatura económica asocia BERD bajo con menor productividad total de los factores, aunque la magnitud y la causalidad son debatidas."
```

**M4 (REER)** — unificar 4 captions de DomainHero a una sola línea:
```diff
+ caption="Tipo de cambio efectivo real (base 100). >100 = encarecimiento relativo de exportaciones"
```

**M5 (proveedor LLM expuesto)** — `RegionLanding.tsx:231` y `AIInsightPanel.tsx:93`:
```diff
- "Groq está sintetizando un diagnóstico regional..."
- "Groq GPT-OSS" + "Anthropic Claude"
+ "Sintetizando un diagnóstico regional..."
+ "Análisis IA · revisar antes de citar"
```

#### Hallazgos menores Macro (resumen)
- `DomainHero.tsx:67` — umbral PIB > 1.5 sin definir vs potencial AIReF (~1.8%)
- `DomainHero.tsx:134` — "transferencia inmediata al IPC" → realmente lag 1-3 meses
- `DomainHero.tsx:282` — `unit=" €/mes"` con `etcl` ambiguo (índice o euros)
- `DomainHero.tsx:201` — `void yield10; void cc;` código muerto
- `DomainHero.tsx:311` — "España en cola UE" con umbral fertilidad <1.3 sin fuente Eurostat
- `DomainHero.tsx:368` — claim "2º país en llegadas turísticas" puede caducar (2024 ES adelantó FR)
- `AlertasMacro.tsx:88` — "criterio académico" sin enlazar
- `InsightsBlock.tsx:116` — score `<30 CRÍTICO` sin definir si es z-score/percentil/promedio
- `InsightsBlock.tsx:247` — "Sin IA · lógica determinista" contradice AIInsightPanel
- `MacroThermometer.tsx:28-31` — cortes 70/55/40 sin justificación documentada

---

### 1.3 · Geopolítica

#### Top 5 críticos

| # | Hallazgo | Archivo:línea |
|---|----------|---------------|
| 1 | Hero "Presencia España" con gradient rojo intenso (`#aa0000→#d50000`) sugiere amenaza para sección de socios comerciales | `app/geopolitica/page.tsx:1062` |
| 2 | IRC vs IRPC: dos métricas distintas, ningún tooltip explica la fórmula | `app/geopolitica/page.tsx:588-589,730-737` |
| 3 | Labels snake_case crudos en UI (`last_30d`, `derived_from_news`, `llm_cluster`, `analytical_model`) | `components/geopolitica/GeoAuditDrawer.tsx:161-164`, `GeoConvergenceAlerts.tsx:175,205-211` |
| 4 | "Régimen autoritario" como flag binario que mete a Pyongyang, Doha y Ankara en el mismo cubo | `GeoStateMediaFeeds.tsx:123-128`, `GeoThemeClusters.tsx:215-220` |
| 5 | Banner Diplomacia: «¿con quién puede tratar España **sin riesgo legal**?» — claim de compliance grave | `app/geopolitica/page.tsx:1001-1008` |

#### Propuestas concretas

**G1 (Banner Diplomacia)** — `app/geopolitica/page.tsx:1001-1008`:
```diff
- "Diplomacia & Sanciones · ¿con quién puede tratar España sin riesgo legal? [...] screening fuzzy 333+ fuentes OpenSanctions (OFAC SDN + EU FSF + UNSC + UK OFSI)"
+ "Diplomacia y sanciones · screening de contraparte. Cruza listas EU (FSF), ONU (UNSC), EE.UU. (OFAC SDN) y UK (OFSI) sobre 333+ datasets. NO sustituye dictamen jurídico ni due diligence KYC; un resultado positivo requiere validación legal antes de cualquier decisión comercial."
```

**G2 (Hero Presencia España)** — `app/geopolitica/page.tsx:1062`:
```diff
- gradient: '#aa0000 → #d50000'  // rojo sangre
+ gradient: '#1F4E8C → #0c4a6e'  // azul institucional
- subtitle: "¿Dónde está España realmente y qué está pasando en esos lugares?"
+ subtitle: "Mapa operativo de proyección exterior: comercio, inversión, diplomacia y exposición consular."
```

**G3 (snake_case → labels humanos)** — crear mapping centralizado:
```ts
// lib/geopolitica/label-mappings.ts (NEW)
export const TEMPORAL_LABELS = {
  last_30d: 'últimos 30 días',
  annual: 'serie anual estructural',
  realtime: 'tiempo real',
  // ...
}
export const SOURCE_MODE_LABELS = {
  derived_from_news: 'inferido de prensa',
  llm_cluster: 'agrupado por IA',
  analytical_model: 'modelo Politeia',
  curated: 'catálogo curado',
  // ...
}
```
Aplicar en `GeoAuditDrawer.tsx:161-164` y `GeoConvergenceAlerts.tsx:175,205-211`.

**G4 (Régimen autoritario binario)** — `GeoStateMediaFeeds.tsx:123-128`:
```diff
- "▲ Cobertura medios estatales · régimen autoritario"
+ "Cobertura de medios de Estado con baja libertad de prensa"
- subtitle: "Moscú · Pekín · Teherán · Doha · Ankara · La Habana · Caracas"
+ subtitle: "Medios públicos o cuasi-estatales en jurisdicciones con índice RSF/Freedom House en banda baja. NO equivalente a propaganda; el sesgo varía por país."
```

**G5 (IRC vs IRPC tooltip)** — `app/geopolitica/page.tsx:588-589`:
```diff
+ <Tooltip>
+   IRC = Índice de Riesgo Compuesto Politeia (0-100) · combina V-Dem
+   (democracia), SIPRI (militarización), GDELT (tono mediático) y volumen
+   de conflictos. NO es rating soberano tipo Moody's/S&P. Se actualiza
+   diariamente.
+ </Tooltip>
```

#### Hallazgos menores Geopolítica (resumen)
- `page.tsx:432` — "Señales OSINT 24h" sin definir qué cuenta como señal
- `page.tsx:1156` — strings al LLM sin glosario (`interés España 9`)
- `GeoTermometro.tsx:194` — tooltips densos ilegibles (`tipParts.join(' · ')`)
- `GeoConvergenceAlerts.tsx:105-108` — auto-elogio ("senior intel analyst") en componente serio
- `GeoConflictsMap.tsx:214` — atribuir ausencia a "censura informativa" es sesgo
- `GeoStateMediaFeeds.tsx:131` — léxico "opresión/no-libres" injustificado
- `SubEconomia.tsx:171-173` — "Q1 2026" fecha futura como pseudo-fuente
- `SubEspana.tsx:113` — regla "Presencia crítica >10% revenue" sin metodología
- `GeoMilitaryDrawer.tsx:127-133` — IISS Military Balance sin explicar
- `ActivosRiesgoPanel.tsx:116-118` — 6 acrónimos crudos: `PERE/AECID/FONPRODE/CESCE`

---

### 1.4 · Estudio (BI)

> **CRÍTICO §0.5**: este módulo tiene contaminación masiva de "Domo" en UI.

#### Top 5 críticos

| # | Hallazgo | Archivo:línea |
|---|----------|---------------|
| 1 | **17+ pestañas del navegador** muestran `· Domo` en `<title>` | Todos los `app/estudio/*/page.tsx` con metadata |
| 2 | Health/page muestra `<h1>System Health</h1>` + tabla `Módulos Domo — Sprint Coverage` (jerga interna) | `app/estudio/health/_components/HealthClient.tsx:73,74,134` |
| 3 | ComingSoon expone `"En desarrollo · Sprint 6+"` al usuario final | `app/estudio/_components/ComingSoon.tsx:38,41` |
| 4 | `error.tsx` muestra `"Error en el módulo Domo"` | `app/estudio/error.tsx:13` |
| 5 | Query page: `<h2>AI Query — Pregunta en lenguaje natural</h2>` + jerga SQL en vacío inicial | `app/estudio/query/_components/QueryClient.tsx:139,178` |

#### Propuestas concretas

**E1 (Pestañas navegador)** — script de reemplazo masivo en `app/estudio/*/page.tsx`:
```diff
- title: 'Fuentes de Datos · Domo | Politeia'
+ title: 'Fuentes · Estudio | Politeia Analítica'
- title: 'Pipelines ETL · Domo | Politeia'
+ title: 'Limpieza y cruces · Estudio | Politeia'
- title: 'AI Query · Domo | Politeia'
+ title: 'Preguntar a los datos · Estudio | Politeia'
- title: 'System Health · Domo | Politeia'
+ title: 'Estado del sistema · Estudio | Politeia'
```
(17 títulos en total — script Python en 1 pasada).

**E2 (Health)** — `HealthClient.tsx:73,74,134`:
```diff
- <h1>System Health</h1>
- "Estado en tiempo real de todos los servicios del módulo Domo"
- <h2>Módulos Domo — Sprint Coverage</h2>
+ <h1>Estado del sistema</h1>
+ "Estado en tiempo real de todos los servicios del Estudio."
+ <h2>Cobertura por módulo</h2>  // eliminar referencia a "Sprint"
```

**E3 (ComingSoon)** — `ComingSoon.tsx:38,41`:
```diff
- "● En desarrollo · {sprint}"
- "Este módulo se completará en sprints posteriores."
+ "Próximamente"
+ "Estamos puliendo esta sección. Avisaremos cuando esté lista."
```
+ subtítulo Warehouse: `"Capa unificada de almacenamiento (PostgreSQL, Parquet en object store, caché columnar)"` → `"Aquí guardaremos tus tablas históricas para que puedas consultarlas a años vista."`

**E4 (error.tsx)** — `app/estudio/error.tsx:13`:
```diff
- "Error en el módulo Domo"
- "Ha ocurrido un error inesperado."
+ "Algo ha fallado en el Estudio"
+ "No hemos podido cargar esta sección. Vuelve a intentarlo o contacta con soporte si persiste."
```

**E5 (Query empty state)** — `QueryClient.tsx:139,178`:
```diff
- <h2>AI Query — Pregunta en lenguaje natural</h2>
- "El motor generará el SQL, ejecutará la consulta y te mostrará los resultados con sugerencias de visualización."
- "Haz una pregunta sobre los datos o escribe una consulta SQL directamente."
+ "Pregúntale a tus datos"
+ "Escribe la pregunta en español. Te devolvemos la tabla y la mejor visualización para responderla."
+ "(Detalle SQL disponible en 'Ver SQL generado')"
```

#### Hallazgos menores Estudio (resumen)
- `pipeline/PipelineListClient.tsx:55-56` — hub dice "Limpieza y cruces", página dice "Pipelines ETL"
- `dataset/DatasetListClient.tsx:81-82` — hub dice "Mis tablas", página dice "Datasets"
- `dashboard/DashboardListClient.tsx:60` — hub dice "Mis paneles", página dice "Dashboards"
- `gobernanza/GovernanceClient.tsx:14-19` — roles mezclan EN (`Owner`, `Admin`) y ES (`Analista`)
- `gobernanza/GovernanceClient.tsx:230` — `! Guarda esta clave ahora` (signo solto, parece glitch)
- `health/HealthClient.tsx:11-16` — etiquetas técnicas (`Cache (Redis)`, `Pipeline Runner`)
- `health/HealthClient.tsx:93` — mensaje instruye a sysadmin no a analista
- `query/QueryClient.tsx:30,33,98,107` — sidebar "Consultas" vs nav "Pregúntale a los datos"
- `gobernanza/GovernanceClient.tsx:240` — `(ej: CI/CD pipeline)` jerga devops
- `gobernanza/GovernanceClient.tsx:111` — falta alinear con copy del hub ("Equipo y permisos")

---

### 1.5 · Sector-Energía

#### Top 5 críticos

| # | Hallazgo | Archivo:línea |
|---|----------|---------------|
| 1 | **PVPC** (acrónimo del KPI estrella del hero) nunca se explica | `app/sector-energia/page.tsx:164` |
| 2 | 5 acrónimos en 2 líneas (`ESIOS, OMIE, PVPC, D+1`) sin glosa la 1ª vez | `components/energy/EsiosPreciosHeatmap.tsx:78-83` |
| 3 | Empty state filtra `ESIOS_API_KEY`, paths `/api/esios/...`, Vercel Settings | `components/energy/EsiosLivePanel.tsx:131-137` |
| 4 | **CRÍTICO PRIVACIDAD**: panel muestra email personal `politeianalitica@gmail.com` + nombre `Antonio` + plantilla email a `transparency@entsoe.eu` | `components/energy/EntsoeSpainPanel.tsx:99-127` |
| 5 | `MAPE`, `bias`, `p10/p50/p90` sin tooltip ni equivalente humano | `EsiosHistoricoExplorer.tsx:193-197`, `EsiosPrediccionesPanel.tsx:60` |

#### Propuestas concretas

**S1 (PVPC + acrónimos)** — `page.tsx:164`:
```diff
- <HeroKPI label="PVPC" value={resumen?.kpis.precio_pvpc_eur} unit="€/MWh" />
+ <HeroKPI
+   label="PVPC · tarifa regulada hogar"
+   value={resumen?.kpis.precio_pvpc_eur}
+   unit="€/MWh"
+   tooltip="Precio Voluntario Pequeño Consumidor — tarifa eléctrica regulada para hogares con potencia ≤10 kW. Publicado por REE cada día a las 20:15."
+ />
```

**S2 (Empty state ESIOS)** — `EsiosLivePanel.tsx:131-137`:
```diff
- "! Configuración pendiente · El endpoint /api/esios/snapshot está listo pero ESIOS_API_KEY no está en variables de entorno de Vercel. Una vez añadida (Project Settings → Environment Variables → Production), aparecerán los 6 indicadores en directo..."
+ "Datos en directo no disponibles temporalmente. Estamos reactivando la conexión con ESIOS (REE). Vuelve en unos minutos o consulta el visor oficial: esios.ree.es."
```

**S3 (EntsoeSpainPanel — P0)** — `EntsoeSpainPanel.tsx:99-127`:
```diff
- "Escribir a transparency@entsoe.eu con la plantilla siguiente"
- <pre>...Best regards, Antonio...politeianalitica@gmail.com...</pre>
+ "Datos ENTSO-E (precios UE-27, mix, flujos transfronterizos) en activación. Disponibles próximamente."
```
+ mover la plantilla de email a `docs/internal/entsoe-activation.md` (NO en repo público).

**S4 (MAPE/bias tooltips)** — `EsiosHistoricoExplorer.tsx:193-197`:
```diff
- "MAPE = error medio % · bias = sesgo (positivo = sobreestima)."
+ "Error medio (MAPE)"  + tooltip: "Mean Absolute Percentage Error. <5% = excelente, 5-15% = razonable, >15% = mal."
+ "Sesgo del modelo"    + tooltip: "Diferencia media predicción − real. Positivo = sobreestima sistemáticamente."
```

**S5 (Convención exportación/importación)** — alinear `EsiosIntercambiosMap.tsx:78` con `page.tsx:236`:
```diff
- "Verde = exportación · rojo = importación"
+ Usar convención: importación + / exportación − (consistente con page.tsx:236)
```

#### Hallazgos menores Sector-Energía (resumen)
- `EsiosTabsSection.tsx:43,47-48` — "tech" + "Can/Bal/Ceu/Mel" siglas crudas
- `EsiosLivePanel.tsx:106-112` — "operador del sistema" sin definir (REE)
- `EsiosLivePanel.tsx:241` — formato fecha mezcla 24h-castellano con ISO
- `EsiosAjustesPanel.tsx:75-80` — "banda secundaria · terciaria · desvíos" sin explicación
- `EsiosAjustesPanel.tsx:41,44` — "tensionado" sin definir (¿caro? ¿riesgo apagón?)
- `EsiosHistoricoExplorer.tsx:233` — "(downsampled)" término inglés crudo
- `EsiosPrediccionesPanel.tsx:107-111` — slugs internos `prediccion_eolica/solar/renovable`
- `page.tsx:138` — banner "UTILITIES" anglicismo sin equivalente español

---

## 2 · Plan de ejecución sugerido (4 sprints de 1-2 días)

### Sprint Q-A · P0 fixes (1 día)
> **Ejecutables sin discusión metodológica**

| Sprint | Tarea | Archivos | LoC est |
|--------|-------|----------|---------|
| Q-A.1 | Eliminar email personal de EntsoeSpainPanel | `EntsoeSpainPanel.tsx:99-127` | 30 |
| Q-A.2 | Renombrar "Domo" → "Estudio" en 17+ titles | `app/estudio/*/page.tsx`  | 20 (script) |
| Q-A.3 | Empty state ESIOS limpio (sin env vars) | `EsiosLivePanel.tsx:131-137` | 10 |
| Q-A.4 | error.tsx genérico + ComingSoon sin sprint | `ComingSoon.tsx`, `error.tsx` | 20 |
| Q-A.5 | "Sin riesgo legal" → claim atenuado | `app/geopolitica/page.tsx:1001-1008` | 5 |

### Sprint Q-B · Glosario unificado (1 día)
> **Crear infraestructura compartida**

| Sprint | Tarea | Output |
|--------|-------|--------|
| Q-B.1 | Crear `lib/glossary/index.ts` con 50+ términos | nuevo |
| Q-B.2 | Crear `<Glosa term="PVPC" />` component reutilizable | nuevo |
| Q-B.3 | Aplicar a 5 KPIs estrella por módulo (25 KPIs) | wire-up |
| Q-B.4 | Crear `/glosario` page accesible global desde footer | nuevo |

### Sprint Q-C · Translation pass por módulo (2 días)
> **Aplicar diff de copy módulo a módulo**

| Sprint | Módulo | Cambios | LoC est |
|--------|--------|---------|---------|
| Q-C.1 | Prensa: P1-P5 + 10 menores | 60 |
| Q-C.2 | Macro: M1-M5 + 10 menores | 80 |
| Q-C.3 | Geopolítica: G1-G5 + 10 menores (incl. mappings.ts) | 120 |
| Q-C.4 | Estudio: E1-E5 + 10 menores | 60 |
| Q-C.5 | Sector-Energía: S1-S5 + 8 menores | 40 |

### Sprint Q-D · Consistency pass (medio día)
> **Eliminar contradicciones internas**

| Sprint | Tarea |
|--------|-------|
| Q-D.1 | Alinear nav/hub/página: `Tablas/Datasets`, `Paneles/Dashboards`, `Pregúntale/Consultas` |
| Q-D.2 | Convención importación/exportación consistente en mapas energía |
| Q-D.3 | REER caption único en todos los lugares |
| Q-D.4 | Eliminar referencias a proveedores LLM (`Groq`, `Anthropic`) de UI |

---

## 3 · Lo que NO está en este plan

- **Auditoría de fuentes de datos**: APIs, periodicidad, fallback, attribution — sprint
  separado.
- **Auditoría de metodología analítica**: fórmulas, umbrales con literatura, sesgos —
  sprint separado.
- **Refactor visual**: ya cubierto en Sprint Quality-1..4 (tipografía, a11y, emojis).
- **Performance**: out of scope de calidad de contenido.
- **Modificar prompts del LLM**: requiere su propio cycle de evaluación.

---

## 4 · Cómo medir éxito

| Métrica | Antes | Objetivo post-Sprint Q |
|---------|-------|------------------------|
| Apariciones de "Domo" en UI | 17+ | 0 |
| Acrónimos sin tooltip/glosa | 50+ | <10 |
| Snake_case visible al usuario | ~15 | 0 |
| Referencias a Sprint/CLAUDE.md/proveedor LLM | 8+ | 0 |
| Inconsistencias nav vs página (mismo módulo) | 6 detectadas | 0 |
| Emails personales / PII en código de UI | 1 | 0 |

---

**Auditoría preparada por**: 5 agentes Claude paralelos · validados contra repo
`claude/sharp-keller-3d6d48 @ 252a8b09` el 2026-05-31.

Para ejecutar cualquiera de los sprints, ejecutar `/loop` con el sprint
correspondiente o pedir directamente: "Aplica Sprint Q-A".
