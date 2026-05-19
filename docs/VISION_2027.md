# Politeia 2026 → 2027 · de plataforma a sistema operativo de la decisión política

> Documento estratégico interno. No marketing. Basado en auditoría del código
> real (mayo 2026), no en aspiraciones. Las recomendaciones tienen archivos,
> métricas y secuencias concretas.

---

## 0. Resumen en tres frases

1. **Tienes el 80 % de la infraestructura ya construida** — 82 rutas, 43 routers FastAPI con 335 endpoints, 27 tools Groq Brain, ontología de actores, tokens design system v1.0, workspace con 12 secciones. No te falta cantidad.
2. **Te falta coherencia y profundidad** — 8 535 usos de `style={{...}}` inline vs 1 729 de `className=` (ratio 5:1) significa que el design system existe pero no se aplica; las 12 secciones del workspace son prototipos de 100-300 líneas cada uno; el cerebro Groq vive en `/agente-ia` aislado del flujo analítico real.
3. **El techo no es "ser otra plataforma de BI"** — es ser **el sistema operativo de la decisión política en español**: el sitio donde un analista, consultor o decisor *piensa, construye, defiende y comunica* un análisis completo sin salir del workspace. Eso es defensible. Lo demás es commodity.

---

## 1. Lo que eres (auditoría honesta · mayo 2026)

| Capa | Lo que tienes | Lo que no |
|------|--------------|-----------|
| **Backend Python** | 43 routers FastAPI · 335 endpoints · pipelines BOE/Congreso/PLACSP/RSS · 27 tools Brain Groq · ontología de actores (Wikidata + RSS + grafo) · fichas territoriales + políticos persistidas en Postgres | Ontología **unificada** (un objeto Actor referenciable desde cualquier capa) · event sourcing (sin trazabilidad de cambios analíticos) · temporalidad (no hay `valid_from`/`valid_to`) · capa de permisos por objeto |
| **Frontend Next.js** | 82 rutas · 436 archivos `.tsx` · 77 componentes · tokens.css v1.0 con paleta política · Tailwind con preflight desactivado · Cmd+K en 5 sitios · App Router · Server Components disponibles pero apenas usados | Disciplina de tokens (8 535 inline > 1 729 className · 5x peor de lo aceptable) · sistema de motion · keyboard navigation transversal · density toggles · URL como estado · parallel routes |
| **Workspace** | 12 secciones (canvas, docs, inbox, projects, radar, reporting, research, simulator, slides, crm, knowledge, overview) · Cuaderno tipo Obsidian | Profundidad real (la mayoría son demos 100-300 LOC) · contexto persistente entre secciones · presencia/colaboración · split views configurables · backlinks entre artefactos |
| **IA Brain** | 27 tools Groq en 7 bloques (Ingestion, Analysis, Forecasting, Intelligence, Content, Memory, Orchestrator) · audit trail en `opposition_research` · rate-limiter · circuit breaker · disclaimers en outputs generativos | Memoria persistente por analista (cada sesión empieza en cero) · workflows agentic (las tools no se componen) · razonamiento visible (no se enseña la cadena ReAct) · embeddings de los propios análisis del usuario |
| **Datos** | Fichas dinámicas de 8 132 municipios + 17 CCAA + Wikidata políticos · BOE indexado · contratos PLACSP · 219 medios RSS · catálogo 200+ figuras | Series temporales largas (datos como snapshot, no como serie) · versioning de los análisis del propio usuario · backups frecuentes |
| **Deploy** | Vercel `apps/visual-oscar/` con `vercel.json` y crons · backend Railway/Render con Dockerfile · pre-warmup nocturno · sectorial intel router | Observabilidad real (logs estructurados pero sin dashboards Grafana/Sentry · alertas) · CI con tests obligatorios · rollback de un click |

**Lectura honesta**: no es un MVP, es un **producto con muchas piezas pero sin tejido conectivo**. La fragmentación es el enemigo principal. Cada parte funciona; juntas no forman un sistema.

---

## 2. Quiénes son los referentes (qué robar y de quién)

Estudio comparativo de los productos cuya filosofía deberías canibalizar selectivamente. Lo que tu producto no necesita es ser una copia — necesita absorber **un principio rector de cada uno**.

### 2.1 Palantir Gotham · ontología object-centric

**Lo que hacen bien**: cada cosa (persona, evento, lugar, documento, organización) es un **Object** con propiedades, conexiones tipadas y atributos temporales. Una investigación se hace navegando objetos, no consultando tablas. El histograma temporal y el grafo de relaciones son la interfaz primaria, no un widget secundario.

**Qué robar**: el modelo mental Object-Property-Link. En Politeia ya tienes Actor, Ley, Evento, Territorio, Medio, Documento — falta la abstracción común que diga "todos son entidades de primera clase, todos son linkables, todos tienen historia". Sin esto, cada router devuelve una forma distinta y el frontend nunca puede tratar las cosas como objetos coherentes.

**Concreto**: tabla `entities` única con `kind`, `qid`, `display_name`, `payload jsonb`, `valid_from`, `valid_to`. Tabla `entity_links` con `source_id`, `target_id`, `link_kind`, `confidence`, `evidence_doc_id`. Toda página nueva consume entities + links, no endpoints específicos.

### 2.2 Bloomberg Terminal · keyboard como interfaz primaria

**Lo que hacen bien**: el analista experto no usa el ratón. Comandos de 4 letras (`HELP`, `WEI`, `GOVT`, `LIVE`), saltos entre paneles con Tab, atajos para todo. Densidad de información altísima sin que parezca caos.

**Qué robar**: convertir Cmd+K en algo más ambicioso que el actual buscador. Debería ser **el cursor principal**: "abre la ficha de Yolanda Díaz en split derecho", "compara escenarios 23J vs nowcast", "genera SITREP del último mes en sector farma". La barra de Politeia ya existe en 5 sitios — falta unificarla y darle verbos, no solo nombres.

**Concreto**: Cmd+K transversal con command palette estilo Linear/Superhuman. Cada acción del usuario es expresable como comando (`ficha pedro sanchez`, `compara cataluña galicia renta`, `briefing sector defensa última semana`). Atajos: `g` `f` `p` (`go fichas políticos`), `g` `b` (`go briefing`), `?` para mostrar mapa de teclas.

### 2.3 Notion / Linear · velocidad percibida + composición por bloques

**Lo que hacen bien**: la app se siente instantánea aunque haya peticiones de red. Optimistic UI por defecto, transiciones de 150-200ms, ningún spinner si la respuesta llega < 200ms. Notion compone páginas como bloques arbitrariamente ordenables; Linear permite navegar todo con teclado y mostrarlo en density alta o baja.

**Qué robar**: los documentos/canvas/briefings deberían ser composiciones de **bloques tipados** (cita-evidencia, ficha-actor, gráfico-embebido, query-agente, hipótesis-ACH). Un párrafo de texto puede contener `@Pedro Sánchez` que se renderiza como chip con ficha al hover. La página entera es serializable y versionable.

**Concreto**: tu cuaderno (`/cuaderno/_components/CuadernoClient.tsx`) ya empieza por aquí pero falta tipar los bloques y conectarlos al backend de fichas. Y la app entera necesita un audit de velocidad: prefetch agresivo, optimistic UI en todas las mutaciones, skeleton placeholders dimensionados (no spinners genéricos).

### 2.4 Recorded Future · señales sobre datos

**Lo que hacen bien**: no muestran "datos crudos", muestran **señales** con score, dominio (cyber, geopolítico, narrativo) y trayectoria temporal. Un analista entra a la mañana y ve "30 señales nuevas, ordenadas por relevancia para tu portfolio de teatros".

**Qué robar**: la diferencia entre noticia y señal. Politeia ya ingesta 219 medios pero los presenta como listas planas. Cada item debería pasar por un scoring (riesgo · novedad · cercanía a tus actores seguidos) y aparecer como señal en un feed personalizado, no como artículo en una lista RSS. Tu router `/api/v1/sectores/{id}/signals` recién creado va en esta dirección — falta extenderlo a toda la ingesta.

### 2.5 Figma · presencia + colaboración como capa, no como añadido

**Lo que hacen bien**: ver el cursor de tu compañero en tiempo real, sus comentarios anclados al objeto exacto, el historial reproducible. La colaboración no es un módulo, es la sensación de fondo.

**Qué robar**: cuando dos analistas trabajan en el mismo briefing, deberían verse mutuamente. Cuando uno hace un comentario sobre una hipótesis ACH, queda anclado al bloque exacto. Esto no es Liveblocks por capricho — es la diferencia entre "herramienta individual" y "infraestructura de equipo de inteligencia".

### 2.6 Obsidian / Roam · backlinks y memoria institucional

**Lo que hacen bien**: cada nota tiene `[[backlinks]]` automáticos. Buscas un actor y ves todos los análisis donde aparece. La memoria del usuario se convierte en knowledge graph propio.

**Qué robar**: cada briefing/canvas/notebook que crea el analista debe indexarse en pgvector y aparecer como backlink en la ficha de la entidad mencionada. La ficha de "María Jesús Montero" debería mostrar al final: "Mencionada en 14 briefings tuyos · 7 análisis ACH · 3 dossiers de oposición."

### 2.7 Stripe · documentación como producto, calidad técnica como brand

**Lo que hacen bien**: cada endpoint tiene example payloads, errores documentados, SDK tipado. La calidad técnica es señal externa de la calidad interna.

**Qué robar**: tus 335 endpoints FastAPI necesitan un portal `/api/docs` decente (FastAPI ya genera OpenAPI — exponlo en `politeia-analitica.es/api`). Un cliente externo (consultora, empresa Ibex) que pueda integrar Politeia vía API tiene 10x más valor que uno que solo usa la UI.

---

## 3. La tesis de producto en una frase

> **Politeia es el sistema operativo donde un analista político español piensa, construye, defiende y comunica un análisis completo — desde la señal cruda hasta el briefing entregable — sin salir del workspace, con un copiloto de IA que razona en su contexto.**

Notar lo que **no es**:

- No es un dashboard de visualización
- No es un buscador de actores
- No es un chat con un LLM sobre política española
- No es una alternativa a Bloomberg / Palantir / Recorded Future

Es la primera categoría: **plataforma cognitiva para inteligencia política iberoamericana**. Es defensible porque el contenido (fuentes BOE/Congreso/PLACSP, catálogo de figuras, simulador electoral D'Hondt, taxonomía sectorial española) tarda años en replicarse incluso con dinero infinito.

---

## 4. Los 5 pilares estratégicos

### Pilar 1 · Ontología unificada (sin esto, nada escala)

Hoy cada router devuelve su propia forma. Una entidad "Pedro Sánchez" puede aparecer como `actor.qid`, `politico.id`, `figura.id`, `presidente.qid` y la lógica de unificación está dispersa.

**Acción**: una capa `packages/ontology` (ya existe el nombre — falta llenarla) con:

- Tabla `entities` con todos los objetos canónicos.
- Tabla `entity_links` tipada (`autor_de`, `vota_a_favor_de`, `presidente_de`, `criticado_por`, `aliado_de`, …).
- Resolución determinística desde QID Wikidata / DNI institucional / slug → entity_id interno.
- Toda nueva feature consume entities + links. Las migraciones legacy se mantienen pero apuntan al mismo entity_id por mapeo.

**Coste**: 2 sprints. **Impacto**: cada feature nueva tarda 30 % de lo que tardaba antes; los backlinks, las búsquedas y la IA se vuelven triviales.

### Pilar 2 · Workspace investigation-centric

Hoy `/workspaces/[workspaceId]/` tiene 12 secciones planas (canvas, docs, inbox, projects, …). Cada una es una página independiente. No hay **caso** ni **investigación** como concepto.

**Acción**: pivotar a un modelo Investigation:

```
Investigation (caso)
├── Objects pinned    ← entidades fijadas: actores, leyes, territorios
├── Evidence          ← URLs ingestadas + clasificadas (Admiralty F×C)
├── Hypotheses        ← ACH matrix · key assumptions check
├── Notebook          ← bloques tipados (texto, citas, gráficos, queries IA)
├── Canvas            ← stakeholder map, causal map, timeline
├── Brief             ← producto entregable (SITREP, INTSUM, policy_brief)
└── Audit             ← timeline de acciones del analista
```

Cada artefacto vive **dentro** de una investigación, no como página suelta. El sidebar muestra investigaciones activas, no menús abstractos.

**Coste**: 3-4 sprints. **Impacto**: el workspace deja de ser un menú de herramientas y se convierte en un contenedor de trabajo cognitivo.

### Pilar 3 · El brain Groq como copiloto persistente

Hoy `/agente-ia` y `/agentes` son pestañas. El brain tiene 27 tools que viven en el backend pero el frontend solo expone una fracción.

**Acción**: el brain debe estar **siempre presente** como capa:

- Barra inferior estilo Linear "comentar"/"resumir" sobre cualquier selección de texto.
- Cmd+J = invoca al agente con el contexto de la página actual (ficha abierta, objects seleccionados, briefing en edición).
- Memoria persistente por analista (`brain_user_memory` con pgvector + las últimas 50 sesiones).
- Workflows agentic: una acción del usuario puede disparar una **cadena** (ej. "analiza el sector farma 7d" → recoge BOE + noticias + signals + genera SITREP + lo pone en mi inbox como borrador).
- Cada output incluye traza visible: "qué tools usó, en qué orden, qué fuentes citó". Auditable.

**Coste**: 2 sprints (la infra ya existe — solo hay que conectarla). **Impacto**: el brain pasa de "feature" a "modo de trabajar".

### Pilar 4 · Disciplina de diseño aplicada

Esto es **el cambio de menor riesgo y mayor impacto visual inmediato**. 8 535 inline styles vs 1 729 className es una herida abierta.

**Acción** (orden estricto):

1. Convertir los 5 archivos top-offender (`competidores`, `instituciones`, `war-room`, `geopolitica`, `config-cliente`) a componentes con className + tokens. Eso solo elimina ~1 200 inline styles.
2. Crear `packages/ui` (ya tienes la carpeta) con 12 primitivas: `Card`, `Stat`, `Badge`, `Empty`, `Skeleton`, `Field`, `Toolbar`, `Pane`, `SplitView`, `KeyHint`, `Diff`, `Spark`.
3. Banear `style={{...}}` con regla ESLint en CI (excepción: cuando el valor sea dinámico de runtime — color del partido, etc., y solo via prop tipada).
4. Auditar tipografía: hoy hay 12 tamaños distintos en la app. Dejar 7 (`text-xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `display`) y prohibir font-size custom.

**Coste**: 1 sprint constante (mejora continua). **Impacto**: la app se siente súbitamente *coherente*. El cliente paga por sentirse en un sistema, no en un Frankenstein.

### Pilar 5 · Velocidad percibida + URL como estado ✅ (parcial · mayo 2026)

Hoy la app pierde 200-800ms en cada navegación. Los filtros no viven en la URL (se pierden al refrescar). Eso es el mayor gap vs Linear/Figma/Vercel dashboard.

**Acción**:

- ✅ **URL = estado global**: `lib/useUrlState.ts` aplicado en `/war-room`, `/config-cliente`, `/geopolitica`, `/competidores`. Bookmarkable, compartible, deep-linkable.
- ✅ **Skeleton dimensionados**: `loading.tsx` con SkeletonCard/SkeletonGrid en las 6 rutas top — `/war-room`, `/geopolitica`, `/competidores`, `/config-cliente`, `/operaciones`, `/investigations`. Ocupan el espacio real del contenido.
- ✅ **Prefetch agresivo**: AppHeader ya usa `<Link>` (prefetch por defecto en Next 14). Auditados y migrados los `<a href="/...">` residuales en `/crisis` y `/ataques-narrativos`.
- ⏳ **Server Components agresivo**: pendiente para sprint siguiente. Requiere migrar shells de las páginas pesadas (hoy `'use client'` enteras) a Server Components.
- ⏳ **Optimistic UI por defecto**: pendiente como mejora continua aplicada cuando una mutación tenga latencia visible.

Ver `docs/PILAR_5_PERFORMANCE.md` para el patrón canónico, ejemplos
y métricas de éxito.

**Coste real**: 1 sprint. **Impacto**: las 6 rutas top son bookmarkables;
ningún salto visual al cargar; navegación instantánea entre tabs sin
recarga.

---

## 5. Arquitectura técnica · decisiones concretas

### Backend

- **Mantener** FastAPI · ya tienes 335 endpoints y dependencias maduras.
- **Añadir** `packages/ontology` con SQLAlchemy 2.0 + Alembic + pgvector para embeddings.
- **Añadir** event store ligero: tabla `analyst_events` con `actor_id`, `verb`, `target_kind`, `target_id`, `payload jsonb`, `ts`. Toda acción del usuario (abre ficha, añade hipótesis, edita briefing) se persiste. Esto desbloquea: audit trail, undo/redo, replay de investigaciones, y entrenamiento futuro de IA.
- **No migrar** a microservicios. Tu monolito FastAPI con routers separados está bien. No le añadas complejidad sin razón de negocio.
- **Sí migrar** a typed responses: cada router debería devolver Pydantic models, no `dict[str, Any]`. El frontend tendrá tipos generados automáticamente.

### Frontend

- **Mantener** Next.js 14 App Router · es la decisión correcta y vas en la dirección de Vercel.
- **Adoptar** tRPC o `@tanstack/react-query` con tipos generados desde OpenAPI. Hoy los `fetch()` están sin tipar y los errores se pierden.
- **Adoptar** Server Actions para mutaciones simples; tRPC/REST para queries complejas.
- **Adoptar** una librería de iconos coherente (Phosphor o Lucide — no mezclar). Hoy hay Unicode geometric, emojis Apple, y SVG inline. Inconsistente.
- **Adoptar** `framer-motion` o (mejor) **View Transitions API** para transiciones entre rutas. Eleva la percepción de calidad sin coste de runtime.

### IA · Brain Groq

- **Mantener** Groq como provider primario (latencia + tier gratuito + tus 27 tools ya escritas).
- **Mantener** OpenAI/Anthropic como fallback (ya lo tienes en `llm_router.py`).
- **Añadir** memoria persistente por usuario: `brain_user_memory` con pgvector. Cada sesión empieza recuperando las últimas N notas relevantes del propio analista (no datos públicos — su contexto).
- **Añadir** workflows agentic con LangGraph o stack propio: cadenas de tools que se componen. Ya tienes Orchestrator mixin; falta exponerlo como "recipes" reutilizables.
- **Añadir** trace visible de cada llamada: cuando el brain produce un briefing, mostrar la cadena tool→tool→tool con sus inputs/outputs. Esto es lo que separa "magic black box" de "herramienta auditable para profesionales".

### Datos

- **Migrar** las tablas más vivas a temporal: `valid_from`, `valid_to` en `actors`, `parties`, `laws`, `governments`. Permite "estado del mundo hace 30 días" sin hacks.
- **Añadir** pgvector en las tablas de evidencias y briefings. Búsqueda semántica interna.
- **Añadir** snapshots periódicos a S3/R2 (no Postgres) de los artefactos del usuario.

### Observabilidad

- **Añadir** Sentry (frontend) + structured logs con Loki o Datadog (backend).
- **Añadir** un endpoint `/api/health/detailed` que diga qué pipelines están al día, qué fuentes RSS van retrasadas, qué tools del brain han fallado en 24h.

---

## 6. El workspace innovador · cómo se siente "trabajar dentro"

Esto es lo que diferencia a Politeia de cualquier dashboard. La promesa: **el analista entra a las 9:00 y no sale hasta las 18:00**. Si sale es a buscar contexto que falta — y cada vez sale menos.

### 6.1 Estructura visual

```
┌──────────────────────────────────────────────────────────┐
│ [⌘] Búsqueda · acciones · navegación      [Avatar · DM]  │ ← top bar (40px)
├──────┬────────────────────────────────────┬──────────────┤
│      │                                    │              │
│ Inv  │  Vista activa                       │   Brain      │
│ es-  │  (objeto · briefing · canvas · …)   │   copiloto   │
│ tig- │                                    │   contexto   │
│ ac-  │                                    │   con la     │
│ io-  │                                    │   vista      │
│ nes  │                                    │              │
│      │                                    │              │
├──────┴────────────────────────────────────┴──────────────┤
│  Inspector temporal · timeline · navegación lateral       │ ← bottom (60px)
└──────────────────────────────────────────────────────────┘
```

- **Sidebar izquierdo (220px)**: lista de investigaciones del analista, no de "secciones". Cada investigación = caso de trabajo.
- **Vista central (flex)**: el objeto que está mirando ahora (ficha, briefing, canvas, dossier). Puede dividirse en split horizontal o vertical (`Cmd+\`).
- **Panel derecho colapsable (320px · `Cmd+.`)**: copiloto Groq contextualizado en la vista actual. NO un chat genérico — un panel que **sabe qué estás viendo** y propone acciones.
- **Bottom bar (60px)**: timeline temporal de la investigación. "Hace 4 horas ingerí esta evidencia. Hace 1 hora añadí esta hipótesis. Hace 20 min generé este briefing." Reproducible.

### 6.2 Las acciones cardinales

Cinco verbos que el analista hace todo el día. Cada uno debe ser **a un comando de distancia**:

1. **Find** (`Cmd+K`): buscar objeto, abrir ficha, navegar.
2. **Pin** (`Cmd+P`): fijar un objeto a la investigación activa.
3. **Ask** (`Cmd+J`): preguntar al brain con el contexto actual.
4. **Note** (`Cmd+N`): añadir nota/hipótesis/evidencia al notebook activo.
5. **Brief** (`Cmd+B`): generar/abrir el producto entregable (SITREP, INTSUM, …).

Todo lo demás es ruido. Si el analista necesita 4 clics para hacer cualquiera de los 5, la app falla.

### 6.3 La vista de un objeto (ficha) reinventada

Hoy las fichas (`/instituciones`, `/figuras/[id]`, etc.) son páginas verticales con secciones apiladas. Cambiarlo a **tabs contextuales con backlinks visibles**:

```
[María Jesús Montero] · Vicepresidenta · PSOE
┌────────────────────────────────────────────────────────┐
│ Perfil · Posiciones · Trayectoria · Red · Cobertura    │ ← tabs
├────────────────────────────────────────────────────────┤
│  (contenido de la tab activa)                          │
│                                                        │
├────────────────────────────────────────────────────────┤
│ Aparece en tus investigaciones:                         │
│   · "PGE 2026" — 4 menciones                            │
│   · "Reforma fiscal" — 7 menciones                      │
│   · "OPA BBVA-Sabadell" — 2 menciones                   │
└────────────────────────────────────────────────────────┘
```

El bloque inferior (backlinks personales) es lo que convierte a Politeia en **memoria institucional**, no buscador.

### 6.4 El briefing como artefacto vivo

Hoy un briefing es markdown. Debería ser **un documento compuesto de bloques tipados**:

- Texto inline puede contener `@entidad` (chip) y `^evidencia` (footnote auditable).
- Embeds de gráficos que **siguen vivos** (si los datos cambian mañana, el gráfico se actualiza).
- Hipótesis ACH inline (con su scoring actual).
- Exportable a PDF/DOCX/HTML conservando los anclajes.
- Versionado: cada save crea un snapshot que se puede revivir.

Esto es **lo que ninguna BI tradicional tiene**. La intersección "documento + datos vivos + IA" es el moat.

---

## 7. El cerebro Groq · de 27 tools a sistema cognitivo

### 7.1 Lo que ya tienes

- 7 bloques (Ingestion · Analysis · Forecasting · Intelligence · Content · Memory · Orchestrator)
- 27 tools individuales
- Rate-limiter, circuit breaker, audit trail, disclaimers, cache con TTL
- Singleton bien construido
- Fallback OpenAI/Anthropic

Esto es más infraestructura LLM de la que tienen muchas startups con $20M de funding. Felicidades.

### 7.2 Lo que falta · "de tools a workflows"

Hoy una tool es atómica: input → llamada Groq → output. Lo siguiente es **componer**:

**Workflow ejemplo · "Briefing matinal sector defensa"**:
```
1. fetch_signals(dominio=defensa, days=1)        ← retrieval
2. classify_each(signals)                         ← AnalysisMixin
3. cluster_into_narratives(signals)               ← AnalysisMixin
4. detect_anomalies(signals)                      ← (nuevo)
5. cross_reference(signals, watched_actors)       ← (nuevo)
6. compose_brief(narratives, anomalies, refs)     ← ContentMixin
7. attach_evidence_with_admiralty(brief)          ← (nuevo)
8. save_to_inbox(brief, ttl=24h)                  ← MemoryMixin
```

Cada paso es una tool. El workflow es **declarativo**, no procedimental. Esto es exactamente lo que hace LangGraph (DAG de tools) o Inngest (workflows asíncronos durables).

**Decisión arquitectónica**: usar **Inngest o Trigger.dev** (durabilidad + retry + observability) o **LangGraph** (más AI-native) para orquestar workflows. No hacerlo a mano con cron + try/except.

### 7.3 Memoria persistente del analista

Hoy el brain trata cada llamada como si fuera la primera. Un analista experimentado **debería sentir que el sistema le conoce**:

- Sabe qué teatros lleva (España electoral, sector farma, geopolítica Magreb)
- Sabe qué actores siguió la semana pasada
- Sabe que el martes te preguntó por la DANA y hoy hay un update
- Cuando pides "análisis de oposición de Ayuso", el brain ya tiene el contexto de tus 3 briefings previos sobre Madrid

**Implementación**: tabla `brain_user_memory` con vectores de embeddings de cada interacción + retrieval híbrido (vector + BM25 + filtros de recency). Cada `_call()` del brain recupera las top-5 memorias relevantes y las añade al system prompt.

### 7.4 Razonamiento visible

Los profesionales no usan cajas negras. Cuando el brain produce un output crítico (forecast, dossier de oposición), debe enseñar:

- **Tool trace**: qué tools llamó, en qué orden.
- **Source list**: qué documentos/fichas/datos consumió.
- **Confidence breakdown**: por qué dice 0.78 y no 0.95.
- **Counterfactual**: qué evidencia movería esa confianza a la baja.

Esto eleva el producto de "demo de LLM" a "herramienta para profesionales que deben justificar decisiones". Es **el moat ético-regulatorio** ante RGPD y futuras regulaciones de IA en la UE (AI Act, ya en vigor).

---

## 8. Roadmap accionable · 90 días · 6 meses · 12 meses

### Días 1-30 · cimentar coherencia

| Semana | Entregable |
|--------|-----------|
| 1 | Auditoría de los 5 archivos con más inline styles → refactor a className + tokens. ESLint rule `no-inline-style` con whitelist controlada. |
| 2 | `packages/ui` con 8 primitivas iniciales (Card, Stat, Badge, Skeleton, Empty, Toolbar, KeyHint, SplitView). Migrar 10 páginas top-tráfico. |
| 3 | Cmd+K transversal en toda la app con command palette. Atajos `g` `f`, `g` `b`, `g` `s`. Doc de keymap en `?`. |
| 4 | Schema `entities` + `entity_links` + migración de Actor, Party, Law, Government a la tabla unificada. Endpoint `/api/v1/entities/{id}`. |

### Días 31-90 · workspace investigation-centric

| Mes | Entregable |
|-----|-----------|
| 2 | Modelo Investigation (caso) implementado. `/investigations/[id]` con sidebar de objects pinned + evidence + hypotheses + notebook + canvas + brief. Cada artefacto enlaza a entidades. |
| 2 | Brain copiloto en panel lateral (Cmd+. para mostrar/ocultar). Sabe qué hay en la vista. Sugiere acciones. |
| 3 | Briefings como documentos compuestos por bloques tipados. Versionado. Export PDF/DOCX. |
| 3 | Backlinks personales en cada ficha de entidad. |

### Meses 4-6 · IA agentic + colaboración

| Mes | Entregable |
|-----|-----------|
| 4 | Workflows agentic con LangGraph (o equivalente). 5 workflows iniciales: briefing matinal · monitor regulatorio · análisis adversarial · síntesis de oposición · evaluación de coalición. |
| 5 | Memoria persistente del analista. pgvector. Recall en cada llamada del brain. |
| 5 | Razonamiento visible: tool trace + source list + confidence breakdown en outputs críticos. |
| 6 | Colaboración tiempo real con Liveblocks o PartyKit. Presencia, cursores, comentarios anclados. RLS para teatros compartidos. |

### Meses 7-12 · convertirse en categoría

| Mes | Entregable |
|-----|-----------|
| 7-8 | API pública documentada (portal en `politeia-analitica.es/api`). SDK Python + TypeScript autogenerados. Primer cliente integrador (consultora). |
| 9 | Multi-tenant real: cada cliente (consultora, partido, empresa Ibex) tiene su workspace con sus teatros, sus usuarios, su billing. Tarjeta de precios. |
| 10 | Marketplace de plantillas: SITREPs, dossiers, ACH templates, canvas pre-armados para sectores específicos. |
| 11 | Modo "ejecutivo": vista comprimida con KPIs + alerta + 1 briefing/día. Para C-suite que no usan el workspace pero quieren el output. |
| 12 | Compliance + auditoría: ISO 27001 readiness · RGPD avanzado · audit trail completo. Necesario para vender a institucional. |

---

## 9. Lo que NO hay que hacer

Para cerrar — y porque las decisiones de no-hacer cuentan tanto como las de hacer:

- **No** añadir más rutas Next.js. Ya hay 82. La próxima feature va dentro de las existentes, no como página suelta.
- **No** añadir más routers FastAPI sin matar duplicados. Ya hay 43 — algunos hacen lo mismo con nombres distintos (`/api/sectors` vs `/api/v1/sectores` legacy vs nuevo, dashboard.* vs intelligence.*).
- **No** migrar a microservicios. No hay razón de negocio.
- **No** rehacer el design system desde cero. El `tokens.css v1.0` existe, está bien. El trabajo es **aplicarlo**, no rediseñarlo.
- **No** sustituir Groq por otro provider. Latencia + coste imbatibles. Si llega el día, la abstracción en `llm_router` ya está.
- **No** convertirse en "ChatGPT sobre política española". El chat es una superficie; el producto es el workspace.

---

## 10. Lo que sí hay que recordar siempre

> El analista no está pagando por datos (los hay gratis), ni por gráficos (los hay en Tableau), ni por IA (la hay en cualquier app). Está pagando por **un sitio donde su pensamiento adquiere estructura, se defiende, se persiste y se comparte**.
>
> Si Politeia es ese sitio, todo lo demás es decoración. Si no lo es, lo demás es ruido.

— Mayo 2026
