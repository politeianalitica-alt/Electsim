# Workspaces — Auditoría de mejoras profundas

> Generado el 11 jun 2026 mediante auditoría multiagente (6 lentes + crítico de
> completitud, 91 hallazgos verificados contra el código con archivo:línea).
> Ámbito: los 5 espacios (Estudio, War Room, Toolbox, Cuaderno, Command Center
> `/workspaces/[id]`) y los módulos transversales Cama y Preinformes.

---

## Resumen ejecutivo

El módulo de Workspaces tiene una superficie funcional enorme (18 vistas en el
Command Center + 4 espacios hermanos) pero tres problemas estructurales le
restan utilidad real:

1. **Cosas rotas en silencio.** El BI del Estudio entero hace 404 (`/api/domo`
   no existe), el middleware no verifica la firma de la sesión, el hub muestra
   KPIs inventados sin avisar, y "Ajustes" del sidebar es un 404. Nada de esto
   da error visible: los fallbacks mock lo enmascaran.
2. **Cinco apps, no un producto.** Tres "Command Center" distintos, dos
   workspace IDs contradictorios (`spain-energy` vs `ws_espana_2026`), cuatro
   sidebars con patrones distintos, cinco sistemas de estilo y dos azules
   corporativos conviviendo.
3. **Todo es local y de un solo dispositivo.** Más de 20 silos de
   localStorage sin usuario ni tenant: las narrativas de la Cama, los
   preinformes y los docs del Command Center se pierden al limpiar el
   navegador y ningún compañero ve el trabajo de otro — pese a que el FastAPI
   ya tiene multitenancy completa (Bloque 5) esperando a ser conectada.

### Top 10 quick-wins (impacto alto, esfuerzo bajo)

| # | Mejora | Dónde |
|---|--------|-------|
| 1 | ~~CTA "Entrar al workspace" + accesos a espacios en el hub~~ **HECHO 11 jun** | `app/workspaces/page.tsx` |
| 2 | Arreglar `BASE='/api/domo'` → `/api/estudio` (todo el BI hace 404) | `lib/estudio/api-client.ts:19` |
| 3 | Verificar la firma de sesión en el middleware (`verifyToken` existe y nadie lo llama) | `middleware.ts:90` |
| 4 | Unificar `DEFAULT_WORKSPACE` del Toolbox con `ws_espana_2026` | `ToolboxShell.tsx:41` |
| 5 | `moduleOfPath` por prefijo más largo (el subnav desaparece en subrutas) | `navigation.ts:220-239` |
| 6 | Resolver el workspace real por `workspaceId` en el shell (hoy siempre "España 2026") | `workspace-shell.tsx:21` |
| 7 | Añadir la vista CRM (existe, está huérfana) a `WORKSPACE_VIEWS` | `lib/workspace/navigation.ts` |
| 8 | `error.tsx`/`loading.tsx` en `/workspaces/[id]`, Cuaderno y Toolbox | segmentos App Router |
| 9 | Vincular Cmd+K y atajos (anunciados en la UI, ninguno cableado) | `shortcut-registry.ts` |
| 10 | `safeSetItem` + banner cuando localStorage se llena (hoy pérdida silenciosa) | todos los stores |

### Hoja de ruta sugerida

- **Fase 0 · Reparar lo roto (días). — COMPLETADA 12 jun 2026** (commits
  `232680c9`…`e7cda1dd`): quick-wins 2-8 de la tabla, error+reintento en War
  Room, rollback en optimistic updates, código muerto eliminado (GraphView,
  `/operaciones` → redirect, palette global) y hardening extra surgido de la
  revisión adversarial (`verifyToken` nunca lanza ante cookies malformadas).
- **Fase 1 · Un solo producto (1-2 semanas).** Tokens únicos en
  `tokens.css` consumidos por WS/Domo/war-room (un solo azul); cabecera de
  espacio compartida con breadcrumb y salida común al hub; renombrar los tres
  "Command Center"; el Toolbox pasa a launcher puro o reutiliza vistas
  compartidas; labels en español coherente; vista en URL para Cuaderno y
  Toolbox (`useUrlState` ya existe).
- **Fase 2 · Persistencia de verdad (2-4 semanas).** Registro central de
  claves + export/import global; generalizar `/api/cuaderno/sync` a
  `/api/sync/[namespace]` (Cama y Preinformes primero: son el entregable);
  identidad única derivada de la sesión; después, tablas con RLS en el FastAPI
  y repositorios contra React Query con mutaciones optimistas.
- **Fase 3 · Funcionalidad diferencial (en paralelo por piezas).** Agente IA
  real en el workspace (la cascada de modelos y las 14 tools ya existen);
  Preinformes que redacta secciones con IA desde las fuentes seleccionadas;
  Inbox con señal real BOE+RSS+OSINT; export PDF server-side con plantilla
  corporativa; búsqueda global federada; comentarios y menciones; automations
  ejecutables; RBAC cableado (la matriz de permisos ya está escrita).

---

# Hallazgos completos por lente

## 1. Navegación y arquitectura de información

### El hub /workspaces es un callejón sin salida: no se puede entrar al workspace seleccionado

**Impacto:** ALTO · **Esfuerzo:** bajo · **Tipo:** quick-win

La página hub tiene un <select> nativo que solo cambia los KPIs y briefings mostrados, pero no existe NINGÚN enlace para entrar al Command Center del workspace elegido ni a los otros 4 espacios (Estudio, War Room, Toolbox, Cuaderno). El comentario del AppHeader promete lo contrario ('Desde ahí se entra a Command Center, Estudio, War Room, Toolbox y Cuaderno'), pero la única salida real del hub es el chip 'Continuar donde lo dejaste' (condicional a localStorage). Añadir un CTA 'Entrar al workspace' → /workspaces/{activeId}/overview y una fila de accesos a los 5 espacios convierte el hub en el conmutador que el botón azul del header presupone.

> Evidencia: app/workspaces/page.tsx (líneas 92-104 selector sin enlace de entrada; 59-206 sin ningún Link a [workspaceId]); app/_components/AppHeader.tsx (líneas 171-176 comentario y 175-193 botón Workspace → /workspaces)

### IDs de workspace contradictorios: 'spain-energy' (Toolbox) vs 'ws_espana_2026' (AppHeader y mock-data)

**Impacto:** ALTO · **Esfuerzo:** bajo · **Tipo:** quick-win

ToolboxShell hardcodea DEFAULT_WORKSPACE='spain-energy' para 11 deep-links (Docs, Tables, Slides, Canvas…), pero el único workspace con datos en mock-data.ts es 'ws_espana_2026' (el que usa AppHeader en su menú móvil). Resultado: cada herramienta no-inline del Toolbox aterriza en un workspace vacío que muestra el empty state 'Workspace sin datos' mientras su sidebar dice 'España 2026'. Crear una constante única (p. ej. DEFAULT_WORKSPACE_ID en lib/workspace/workspace-utils.ts) y, mejor aún, leer el último workspace visitado de localStorage como ya anticipa el propio comentario del archivo.

> Evidencia: app/extras/_components/ToolboxShell.tsx (línea 41 y 59-95); app/_components/AppHeader.tsx (línea 89); lib/workspace/mock-data.ts (líneas 25-40, solo existe ws_espana_2026); app/workspaces/[workspaceId]/overview/page.tsx (líneas 44-50 empty state)

### WorkspaceShell ignora el workspaceId: sidebar y topbar siempre muestran 'España 2026'

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

El shell hace `const workspace = demoWorkspace` sin mirar el parámetro de ruta, así que al entrar en /workspaces/banking-eu/overview la cabecera del sidebar, los mini-KPIs (Issues/Acciones/Decisiones/Equipo) y el breadcrumb del topbar muestran datos de 'España 2026' aunque el contenido central esté vacío. Basta usar workspaceRepository.getWorkspaceById(workspaceId) con fallback explícito (o un estado 'workspace no encontrado') para que el chrome y el contenido cuenten la misma historia.

> Evidencia: app/_components/workspace/workspace-shell.tsx (línea 21); app/_components/workspace/workspace-sidebar.tsx (líneas 43-55, 102-105); app/_components/workspace/workspace-topbar.tsx (línea 65); lib/workspace/workspace-repository.ts (líneas 53-62 ya existe getWorkspaceById)

### Tres 'Command Center' distintos compiten por el mismo nombre

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

Existen simultáneamente: (1) la vista overview del workspace con label 'Command Center' en WORKSPACE_VIEWS; (2) el CommandCenter inline del Toolbox que 'replica el Command Center del workspace' con sus propios mocks; y (3) el hero del War Room que se autodenomina 'WAR ROOM · COMMAND CENTER · LIVE'. Además last-space.ts etiqueta todo /workspaces/* como 'Command Center'. Para un usuario nuevo es imposible saber cuál es el 'mando' canónico. Propuesta: reservar 'Command Center' para el overview del workspace, renombrar la vista del Toolbox (p. ej. 'Panel operativo') y quitar 'COMMAND CENTER' del eyebrow del War Room.

> Evidencia: lib/workspace/navigation.ts (línea 14); app/extras/_components/CommandCenter.tsx (líneas 4-12); app/war-room/page.tsx (línea ~263 eyebrow del hero); lib/workspace/last-space.ts (línea 25)

### El Toolbox replica vistas enteras del Command Center con datos divergentes (dos verdades)

**Impacto:** ALTO · **Esfuerzo:** alto · **Tipo:** profunda

Command Center, Inbox y Terminal del Toolbox son reimplementaciones inline (CommandCenter.tsx, InboxView.tsx, TerminalView.tsx) de las vistas homónimas de /workspaces/[id]/{overview,inbox,terminal}, pero alimentadas con otra fuente: el store del Cuaderno + mocks propios (ISSUES y TEAM duplican a mano los members de lib/workspace/mock-data.ts). El mismo analista ve dos 'inbox' con contenidos distintos según por dónde entre. Decisión de producto necesaria: o el Toolbox es un launcher puro (todo deep-links, eliminando las réplicas) o las vistas inline se extraen a componentes compartidos parametrizados por workspaceId como ya se hizo con CamaModule/PreinformesModule.

> Evidencia: app/extras/_components/CommandCenter.tsx (líneas 43-60 mocks duplicados, 16-17 lee store de Cuaderno); app/extras/_components/InboxView.tsx y TerminalView.tsx; app/workspaces/[workspaceId]/inbox y terminal; lib/workspace/mock-data.ts (líneas 42-48)

### Enlace roto en el sidebar del workspace: 'Ajustes' apunta a una ruta que no existe (404)

**Impacto:** BAJO · **Esfuerzo:** bajo · **Tipo:** quick-win

El footer del workspace-sidebar enlaza a /workspaces/{id}/settings, pero no existe carpeta settings dentro de app/workspaces/[workspaceId]/ (sí existe /settings global, destino del icono 'Perfil'). Todo usuario que pulse 'Ajustes' cae en el not-found. Quick-win: crear una página de ajustes del workspace (aunque sea placeholder con los datos del workspace) o retirar el icono hasta que exista.

> Evidencia: app/_components/workspace/workspace-sidebar.tsx (línea 115); app/workspaces/[workspaceId]/ (sin directorio settings, verificado con ls); app/settings/page.tsx (sí existe)

### Vista CRM huérfana: existe la ruta completa pero no aparece en ninguna navegación

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

app/workspaces/[workspaceId]/crm/ tiene página índice, detalle de actor ([actorId]), mapa y matriz, pero 'crm' no está en WORKSPACE_VIEWS, así que no sale en el sidebar, ni en las tabs, ni en las acciones de navegación de la paleta; el breadcrumb del topbar tampoco la resuelve (getViewBySegment('crm') devuelve undefined). Hoy solo se llega vía resultados de búsqueda de la paleta (searchEntities genera enlaces crm/{actorId}). Añadirla a WORKSPACE_VIEWS (grupo 'inteligencia') la integra en sidebar, tabs, breadcrumb y paleta de golpe.

> Evidencia: app/workspaces/[workspaceId]/crm/ (page.tsx, [actorId], map, matrix); lib/workspace/navigation.ts (líneas 12-38, sin entrada crm); app/_components/workspace/workspace-command-palette.tsx (líneas 28-30 únicos enlaces a crm); app/_components/workspace/workspace-topbar.tsx (líneas 24-26)

### moduleOfPath usa match exacto: el header pierde el contexto del módulo en cualquier subruta

**Impacto:** ALTO · **Esfuerzo:** bajo · **Tipo:** quick-win

HREF_TO_MODULE se consulta con lookup exacto del pathname, así que en /estudio se ven las pills del subnav Workspace (Estudio · War Room · Toolbox · Cuaderno · Cama · Preinformes) pero al hacer clic en 'Mis fuentes' (/estudio/fuentes) desaparecen subnav y resaltado del módulo: el usuario siente que ha cambiado de aplicación. Pasa igual en cualquier ruta profunda no registrada item a item (/dosieres/[id], /estudio/dashboard…). Implementar resolución por prefijo más largo en moduleOfPath/itemOfPath (los matchers startsWith ya existen para activeSubItem) cose los 5 espacios bajo un mismo chrome persistente.

> Evidencia: app/_components/navigation.ts (líneas 220-239, lookup exacto en HREF_TO_MODULE); app/_components/AppHeader.tsx (líneas 63-65 y 77-82, 307-329 subnav condicionado a activeModule)

### Cuaderno y Toolbox no persisten su vista en la URL (War Room sí): sin deep-links ni supervivencia a F5

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

War Room usa useUrlState('section') y por tanto ?section=crisis es enlazable y sobrevive a recargas; en cambio CuadernoClient guarda view/mode en useState (recargar siempre vuelve a 'Hoy', imposible enlazar el Grafo o Tareas) y ToolboxShell guarda la herramienta activa en useState (no existe /extras?tool=inbox). Para una plataforma donde los analistas se comparten enlaces, migrar ambos al hook useUrlState ya existente es directo y unifica el patrón de estado-en-URL de los 5 espacios.

> Evidencia: app/war-room/page.tsx (línea 224, useUrlState de lib/useUrlState); app/cuaderno/_components/CuadernoClient.tsx (líneas 90-91); app/extras/_components/ToolboxShell.tsx (línea 101)

### Cuatro sidebars con patrones y salidas inconsistentes: cada espacio 'vuelve' a un sitio distinto

**Impacto:** ALTO · **Esfuerzo:** alto · **Tipo:** profunda

DomoSidebar (CSS module, footer '← Volver a Politeia' → /dashboard), workspace-sidebar (estilos inline + hover por JS, back del topbar → /workspaces), rail del Cuaderno (sin salida propia, solo AppHeader) y wr-sidebar del War Room (war-room.css, sin salida). Solo el Command Center tiene breadcrumb; Estudio, Cuaderno, War Room y Toolbox carecen de él. Propuesta profunda: una cabecera de espacio compartida (nombre del espacio + breadcrumb + enlace al hub /workspaces) montada por los 4 layouts, y consolidar el patrón visual del sidebar (aunque cada espacio mantenga sus grupos). Esto es lo que más contribuye a que hoy se perciban '5 apps' en vez de un producto.

> Evidencia: app/estudio/_components/DomoSidebar.tsx (líneas 92-96); app/_components/workspace/workspace-sidebar.tsx + workspace-topbar.tsx (líneas 49-61 back); app/cuaderno/_components/CuadernoClient.tsx (líneas 424-437 rail); app/war-room/page.tsx (líneas 294-305 sidebar)

### Tres command palettes desconectadas y la global está muerta (nunca se monta)

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

app/_components/CommandPalette.tsx implementa una paleta ⌘K global que indexa MODULES, pero ningún archivo la importa: es código muerto. Las que funcionan son DomoCommandPalette (solo dentro de /estudio) y workspace-command-palette (solo dentro de /workspaces/[id]); War Room, Cuaderno y Toolbox no tienen ⌘K. Además ninguna paleta indexa las vistas de las otras: desde Estudio no puedes saltar a Radar del workspace. Quick-win inicial: montar la paleta global en el layout raíz extendiéndola con WORKSPACE_VIEWS y los 5 espacios, y que las paletas locales deleguen en ella fuera de su ámbito (o eliminar la muerta si se decide no usarla).

> Evidencia: app/_components/CommandPalette.tsx (líneas 47-65, sin imports en todo el repo — verificado con grep); app/estudio/_components/DomoChrome.tsx (líneas 26-36); app/_components/workspace/workspace-command-palette.tsx + hooks/use-command-palette.ts (línea 11)

### Las 18 vistas del Command Center no se autoexplican: descripciones existentes que nunca se muestran

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

WORKSPACE_VIEWS tiene una description cuidada por vista ('Señal sin ruido · RSS · BOE…') pero el sidebar solo pinta el label, sin tooltip ni subtítulo, y el overview no ofrece ningún 'mapa de vistas' para el onboarding. Con 18 entradas en 4 grupos, un usuario nuevo no distingue Radar de Vigilancia ni Knowledge de Guardados. Quick-win doble: añadir title={view.description} al NavLink del sidebar y un widget 'Explorar el workspace' en overview que liste las vistas con su descripción (los datos ya están en navigation.ts; cero modelado nuevo).

> Evidencia: lib/workspace/navigation.ts (líneas 12-38, campo description); app/_components/workspace/workspace-sidebar.tsx (líneas 122-158, NavLink sin title ni descripción)

### Idioma y claves de persistencia inconsistentes entre espacios

**Impacto:** BAJO · **Esfuerzo:** bajo · **Tipo:** quick-win

El sidebar del workspace mezcla inglés y español sin criterio (Docs, Tables, Slides, Knowledge, Projects, Automations junto a Vigilancia, Guardados, Simulador, Cama, Preinformes) en un producto 100% en español para consultora española; el Estudio en cambio traduce todo ('Mis fuentes', 'Pregúntale a los datos'). En paralelo, las claves de localStorage siguen tres convenciones distintas: 'politeia.workspace.last-space.v1' y 'politeia.cama.v1' (puntos+versión), 'politeia:ws:recents' (dos puntos), 'politeia.recent_invs' (sin versión), lo que complica futuras migraciones a backend. Unificar el glosario de labels y adoptar una convención única 'politeia.<dominio>.<nombre>.vN' documentada.

> Evidencia: lib/workspace/navigation.ts (líneas 12-38); app/estudio/_components/DomoSidebar.tsx (líneas 15-45); lib/workspace/last-space.ts (línea 15); lib/workspace/recents.ts (líneas 9-10); lib/cama/store.ts (línea 22); app/_components/CommandPalette.tsx (línea 39)


## 2. Datos, estado y persistencia

### Cliente de Estudio apunta a /api/domo, ruta inexistente: todo el BI hace 404

**Impacto:** ALTO · **Esfuerzo:** bajo · **Tipo:** quick-win

lib/estudio/api-client.ts define BASE = '/api/domo' (85 llamadas fetchDomo), pero los route handlers reales viven en app/api/estudio/* y no existe ni app/api/domo, ni catch-all global, ni rewrite en next.config.mjs ni en middleware.ts. Resultado: todas las pantallas de Estudio que usan React Query (fuentes, pipeline, dataset, alertas, health, dashboard, query, gobernanza) reciben 404 y muestran su estado de error, sin llegar siquiera al fallback mock que esas rutas ya implementan server-side. Arreglo: cambiar BASE a '/api/estudio' (1 línea) y añadir un smoke-test que recorra los endpoints del catálogo.

> Evidencia: lib/estudio/api-client.ts:19 (BASE='/api/domo'); app/api/estudio/fuentes/route.ts (ruta real con fallback mock); app/estudio/fuentes/_components/FuentesClient.tsx:29-43; next.config.mjs y middleware.ts sin rewrite de /api/domo

### Más de 20 silos de localStorage sin usuario ni tenant: pérdida garantizada y cero compartición

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

El trabajo del analista vive repartido en 20+ claves de localStorage sin namespacing por usuario ni organización: politeia.cuaderno.v1, politeia.cama.v1, politeia.preinformes.v1, politeia:ws:{docs,tables,canvas,research,projects,knowledge,inbox,recents,favorites}, politeia:simulator:log:*, politeia:terminal:layout:*, politeia:inbox:status:* (+:assignee,+:comments), politeia:ws:*:user-automations, politeia.workspace.last-space.v1, politeia.modules.{favorites,recents}, media-prefs, monitors de medios, etc. Limpiar el navegador, cambiar de máquina o usar modo privado destruye narrativas de campaña (Cama), preinformes y documentos del Command Center; ningún compañero ve nada de lo que produce otro. Primer paso realista: catálogo central de claves en lib/storage/registry.ts con versión y owner, prefijo derivado de la sesión (tenant/user), y export/import JSON global como backup manual mientras no haya backend.

> Evidencia: lib/cama/store.ts:22; lib/preinformes/store.ts:22; lib/cuaderno/store.ts:44; lib/workspace/persist.ts; lib/workspace/{recents.ts:9-10, map-inbox.ts:15, automations-store.ts:7, last-space.ts:15}; app/workspaces/[workspaceId]/{simulator,terminal}/page.tsx:10/32; components/inbox/inbox-view.tsx:9; lib/home/modules-access.ts

### Vistas del Command Center sobre mocks mutados in-place, sin versión ni migración de esquema

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

docs, tables, canvas, research y projects usan el patrón hydrate/persist: arrays semilla a nivel de módulo que se sobrescriben enteros desde localStorage al importar, y se reescriben completos tras cada mutación. workspace-repository.ts solo persiste knowledge (issues, actions, decisions, alerts, documents, datasets son mock puro y cualquier cambio muere al recargar), el inbox guarda overrides de status/assignee/comments en 3 claves encima de inboxMock (si cambian los ids del mock, quedan huérfanos) y getVersionsMock devuelve historial inventado. Además las claves politeia:ws:* no llevan versión: cualquier cambio de shape en types/workspace.ts deja JSON antiguo que se parsea sin validar. Mejora: interfaz Repository única con validación de shape al hidratar (como hace validateAndNormalizeNotes en cuaderno), versión en la clave y un flag de implementación local/remota por vista, que es justo el seam que el propio código anuncia ('Cuando se conecte el backend, se sustituye el cuerpo de cada método').

> Evidencia: lib/workspace/persist.ts:10-25; lib/workspace/workspace-repository.ts:40-45,159-166; lib/docs/doc-repository.ts:6-7,93-99; lib/inbox/inbox-repository.ts:1-21; components/inbox/inbox-view.tsx:50-78; lib/{tables/table-repository.ts, canvas/canvas-repository.ts, research/research-repository.ts, projects/project-repository.ts}

### WorkspaceContext es solo cáscara de UI: ni datos, ni identidad, y las pestañas se pierden al recargar

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

context/WorkspaceContext.tsx gestiona únicamente tabs, panel del agente, paleta y contextItems con useReducer; no expone workspaceId, miembro actual, permisos ni acceso a datos, así que cada vista importa repositorios sueltos y no hay punto único donde enchufar backend o caché. Además tabs/activeTabId no se persisten: un F5 en mitad del trabajo cierra todas las pestañas abiertas (workspace-tabs.tsx las renderiza desde estado en memoria). Quick win: persistir {tabs, activeTabId} por workspace en sessionStorage al estilo de terminal/page.tsx, y añadir al provider workspaceId + usuario actual (aunque sea el mock u1) como preparación para permisos reales.

> Evidencia: context/WorkspaceContext.tsx:12-27,71-77; app/_components/workspace/workspace-tabs.tsx:18; app/workspaces/[workspaceId]/layout.tsx:13; app/workspaces/[workspaceId]/terminal/page.tsx:32-54 (patrón de persistencia ya existente)

### Tres paradigmas de datos conviven: React Query (solo Estudio), useApi casero (26 ficheros) y repositorios síncronos

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

QueryProvider está montado globalmente en app/layout.tsx, pero fuera de /estudio nadie lo usa: 26 ficheros consumen el hook casero useApi (polling de 30s por defecto, sin caché compartida ni dedupe entre componentes) y las vistas de workspace llaman repositorios síncronos con CustomEvent para refrescar. El wrapper tipado useApiQuery existe desde hace tiempo y tiene cero adopciones en app/. Consecuencia: el hub /workspaces dispara varios useApi con intervalos propios y cada navegación re-fetch-ea todo. Migración incremental: empezar por app/workspaces/page.tsx y las vistas radar/overview, dejando useApi solo para legacy, como ya recomienda el propio header del hook.

> Evidencia: lib/api/query-provider.tsx; app/layout.tsx:48; lib/useApi.ts:8-11 (nota de deprecación); lib/api/use-api-query.ts (0 usos en app/); app/workspaces/page.tsx:32,52-53 (useApi con polling)

### La sincronización entre pestañas no funciona en Cuaderno: CustomEvent no cruza pestañas

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

Los stores comentan que el CustomEvent notifica 'a otras pestañas' (cuaderno store.ts:154, cama store.ts:5-6), pero CustomEvent solo se propaga dentro de la misma pestaña; lo que cruza pestañas es el evento nativo 'storage'. CamaModule y PreinformesModule sí escuchan ambos, pero el Cuaderno no escucha 'storage' en ningún sitio: dos pestañas abiertas con el Cuaderno se pisan la clave politeia.cuaderno.v1 al guardar (última escritura gana sobre estado desactualizado, perdiendo ediciones). Quick win: helper único subscribeToStore(key, event, cb) en lib/storage que registre CustomEvent + 'storage', usado por los tres módulos y por CuadernoClient.

> Evidencia: lib/cuaderno/store.ts:150-159 (comentario engañoso); lib/cama/store.ts:4-6,49; app/_components/cama/CamaModule.tsx:72-76 y app/_components/preinformes/PreinformesModule.tsx:88-91 (sí escuchan 'storage'); ausencia de listener 'storage' en app/cuaderno/**

### Cloud-sync del Cuaderno: las notas borradas resucitan y la identidad es un UUID compartible sin auth

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** quick-win

El merge LWW de cloud-sync conserva toda nota que exista solo en un lado, así que una nota eliminada en el dispositivo A vuelve desde el snapshot de B en el siguiente sync (el propio código lo admite: 'Notas borradas no se reconcilian · TODO tombstones'). Como ya existe soft-delete (campo archived), el arreglo es contenido: añadir deletedAt como tombstone, propagarlo en mergeLastWriteWins y purgar tombstones a los N días. Aparte, la identidad es un client_id en localStorage que se comparte pegándolo a mano: cualquiera con el UUID lee y escribe el snapshot del Blob, sin vínculo con la sesión (cookie de lib/auth/session que ya valida el middleware) — al menos derivar el client_id del usuario de sesión en el route handler.

> Evidencia: lib/cuaderno/cloud-sync.ts:140-147 (TODO tombstones), 286-302 (merge), 10-17 (identidad de conveniencia); app/api/cuaderno/sync/route.ts:8-14,33-39; lib/cuaderno/store.ts:39-41 (archived ya existe)

### Cama y Preinformes (entregables de cliente) no tienen ninguna sincronización: generalizar el endpoint de snapshots

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

Cama versiona macroargumentos (hasta 20 snapshots) y Preinformes compone informes para cliente, pero ambos viven solo en localStorage del dispositivo: son los datos de mayor valor de negocio y los únicos transversales a los 5 espacios, sin el sync que sí tiene el Cuaderno. La infraestructura ya está: convertir /api/cuaderno/sync en /api/sync/[namespace] (validando namespace contra una allowlist: cuaderno, cama, preinformes, ws-docs...), reutilizando Vercel Blob, el client_id y el patrón pull→merge LWW→push. Los stores ya emiten CustomEvent al guardar, así que startAutoSync se engancha igual que en CuadernoClient.

> Evidencia: lib/cama/store.ts:1-12 (store compartido por todos los espacios, sin sync); lib/preinformes/store.ts:1-12; app/api/cuaderno/sync/route.ts (endpoint a generalizar, PREFIX hardcodeado 'cuaderno/'); lib/cuaderno/cloud-sync.ts:219-248 (startAutoSync reutilizable)

### Los 'Guardados del mapa' son globales: la misma bandeja aparece en todos los workspaces

**Impacto:** BAJO · **Esfuerzo:** bajo · **Tipo:** quick-win

map-inbox.ts usa la clave fija politeia:ws:inbox sin workspaceId, de modo que las entidades guardadas desde el mapa OSINT aparecen en la vista Guardados de cualquier workspace, mezclando casos de clientes distintos — inconsistente con automations, simulator, terminal e inbox-status, que sí van namespaceados por workspace. Quick win: clave politeia:ws:{id}:map-inbox, pasar workspaceId a saveToInbox/readInbox (o pedir destino al guardar desde el mapa global) y una migración one-shot que mueva la clave vieja al workspace por defecto.

> Evidencia: lib/workspace/map-inbox.ts:15 (KEY global); app/workspaces/[workspaceId]/guardados/page.tsx:13-23 (lee la bandeja global ignorando params.workspaceId); contraste con lib/workspace/automations-store.ts:7 y app/workspaces/[workspaceId]/simulator/page.tsx:10 (por-workspace)

### Dos fuentes de verdad de workspaces: el hub pide /api/workspaces (inexistente en Next) y cae a un fallback distinto del mock del Command Center

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

app/workspaces/page.tsx llama a /api/workspaces, /api/workspaces/{id}/kpis y /briefings, pero no existe app/api/workspaces/*: siempre cae a FALLBACK_WORKSPACES hardcodeado en la página, mientras el Command Center lee sus workspaces de lib/workspace/mock-data.ts — dos catálogos que pueden divergir (hoy coinciden solo en ws_espana_2026). El FastAPI ya expone GET /workspaces y /workspaces/me/config. Quick win: crear app/api/workspaces/route.ts que proxee vía lib/backend.ts con fallback al listado único de mock-data, eliminando FALLBACK_WORKSPACES de la página.

> Evidencia: app/workspaces/page.tsx:14-20,32-36,52 (fetch + fallback local); app/api/ sin directorio workspaces (solo workspace/{agent,radar,...}); lib/workspace/mock-data.ts:27 (ws_espana_2026); (raíz del repo) api/routers/politeia_v3.py:298-310 y api/routers/workspace_config.py

### Errores de cuota de localStorage silenciados en todos los stores: pérdida de trabajo sin aviso

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

Todos los caminos de escritura tragan la excepción con catch vacío y comentario 'localStorage lleno o modo privado: silencioso': cama, cuaderno, preinformes, persist.ts, recents, map-inbox, automations y las páginas simulator/terminal/slides. Con docs por bloques, canvas, notas con markdown e historiales, los ~5MB de cuota son alcanzables, y cuando se llenen el analista seguirá editando creyendo que guarda. Quick win: wrapper safeSetItem en lib/storage que detecte QuotaExceededError, emita un CustomEvent politeia:storage:error y muestre un banner persistente en AppHeader (más un medidor de bytes por clave en una página de diagnóstico).

> Evidencia: lib/cama/store.ts:50-52; lib/cuaderno/store.ts:156-158; lib/workspace/persist.ts:32-34; lib/workspace/recents.ts:26 (catch {}); lib/workspace/map-inbox.ts:42; app/workspaces/[workspaceId]/slides/page.tsx:64

### Identidad de cliente fragmentada: user_id 'demo', client_id del Cuaderno, tokens y cookie de sesión sin unificar

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

Conviven cuatro mecanismos de identidad: politeia.user_id en localStorage con fallback 'demo' (investigations, EntityBacklinks, BrainCopilot), cuaderno_client_id (UUID por dispositivo), tokens de lib/auth.ts en localStorage y la cookie de sesión que valida middleware.ts. Para cualquier paso hacia multiusuario hace falta un hook useSession único que derive user_id y tenant de la sesión del servidor y los exponga al cliente, dejando de escribir identidad en localStorage; el propio cloud-sync documenta esa intención ('cuando el backend Python esté integrado podemos derivar el client_id del JWT'). Es prerequisito de los namespaces por usuario del hallazgo de silos.

> Evidencia: lib/api/investigations.ts:11 (user_id || 'demo'); components/EntityBacklinks.tsx:285-316; lib/auth.ts:1-15; middleware.ts:1-2 (COOKIE_NAME de lib/auth/session); lib/cuaderno/cloud-sync.ts:15-17,22

### Arquitectura de persistencia unificada por fases, conectando con la multitenancy ya hecha del FastAPI

**Impacto:** ALTO · **Esfuerzo:** alto · **Tipo:** profunda

El backend ya tiene el Bloque 5 completo (api/tenancy.py con enforce_tenancy fijando app.current_{user,org,workspace}_id para RLS, api/auth.py, provisioning), y el frontend ya tiene el seam (lib/backend.ts hacia BACKEND_URL + proxies en app/api/*): falta usarlos para los datos del analista. Plan por fases: F0 (días) wrapper de storage común con registro de claves, versión y export/import global. F1 (1-2 semanas) endpoint genérico /api/sync/[namespace] sobre Vercel Blob con identidad de sesión, cubriendo cuaderno/cama/preinformes/politeia:ws:* — sync entre dispositivos sin tocar Python. F2 (un mes) tablas notes/macroargumentos/preinformes/ws_docs con workspace_id y RLS en packages/migrations, routers service-repository en FastAPI, y los repositorios del frontend pasan a React Query con mutaciones optimistas y localStorage como caché offline (el cuerpo de cada método de repositorio cambia sin tocar componentes, como ya prevé workspace-repository.ts:40-42). F3 colaboración: invalidaciones por polling/SSE y presencia por workspace.

> Evidencia: (raíz del repo) api/tenancy.py:1-45, api/auth.py; lib/backend.ts:1-13 (BACKEND_URL); lib/workspace/workspace-repository.ts:40-42 (seam declarado); lib/api/{client.ts,use-api-query.ts,query-provider.tsx} (capa React Query lista); app/api/cuaderno/sync/route.ts (base de F1); CLAUDE.md §6 B5 completo


## 3. Rendimiento y arquitectura de componentes

### War Room: CSR bailout total — la página entera se renderiza en cliente por useSearchParams sin Suspense

**Impacto:** ALTO · **Esfuerzo:** bajo · **Tipo:** quick-win

app/war-room/page.tsx es 'use client' y llama a useUrlState (que usa useSearchParams) en el propio componente de página, sin boundary de Suspense. Verificado en el build: .next/server/app/war-room.html contiene <template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"> justo tras <div id="main">, es decir, el HTML servido es solo el skeleton de loading.tsx y todo el contenido (hero, sidebar, 22 secciones) espera a hidratar ~523kB de JS. Mejora concreta: convertir page.tsx en server component que renderice el chrome estático y monte <Suspense fallback={skeleton}><WarRoomClient/></Suspense> con el client component movido a _components/WarRoomClient.tsx. Así Next prerenderiza el shell y el bailout queda acotado al subárbol que lee la URL (mismo patrón que ya usa AppHeader.tsx:324 con SubnavPills).

> Evidencia: app/war-room/page.tsx:1,13,224 · lib/useUrlState.ts:31,70 · .next/server/app/war-room.html (template BAILOUT_TO_CLIENT_SIDE_RENDERING) · patrón correcto en app/_components/AppHeader.tsx:14-15,324-326

### War Room: 22 secciones + ~120 líneas de mock data en un único chunk de cliente sin code-splitting

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

Aunque solo se monta la sección activa (page.tsx:320-341 renderiza condicionalmente), las 22 funciones Sec* (1.121 líneas) más los datasets DECISIONES, ADVERSARIO_FEED, MEDIA_MONITOR, WAR_GAMES, TALKING_POINTS y ENDORSEMENTS viajan completos en el bundle del route (~225kB raw sobre los 297kB compartidos, medido en app-build-manifest.json). SecCama y SecPreinformes además arrastran estáticamente CamaModule (639 líneas) y PreinformesModule (615 líneas). Mejora: extraer cada Sec* a app/war-room/_components/sections/ y cargarlas con next/dynamic() con un fallback de Card skeleton — al menos las de cola larga (cama, preinformes, wargames, fundraising); el usuario típico solo visita 2-3 secciones por sesión. Los datos mock pueden pasarse como props desde un page.tsx server (viajan en el RSC payload, no como JS ejecutable).

> Evidencia: app/war-room/page.tsx:19-20,82-200,320-341,687-711 · app/_components/cama/CamaModule.tsx (639 líneas) · app/_components/preinformes/PreinformesModule.tsx (615 líneas) · .next/app-build-manifest.json (/war-room/page = 522.8kB raw)

### War Room: re-render del árbol completo cada 30s (useCountdown) y cada 60s (useApi) desde la raíz

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

useCountdown hace setState con un objeto nuevo cada 30s (useCountdown.ts:22) y useApi('/api/war-room/snapshot', { refreshInterval: 60_000 }) otro en la raíz de WarRoomPage (page.tsx:214-215,221). Cada tick re-renderiza el hero, el sidebar de 22 botones y la sección activa entera — incluyendo CamaModule/PreinformesModule si están abiertos. Mejora: mover el countdown a un subcomponente <HeroCountdown targetDate={...}/> que contenga su propio useCountdown, y encapsular el useApi del snapshot dentro de LiveStatusBadge (o un wrapper), de forma que los ticks periódicos solo re-rendericen esos dos islotes. Complemento barato: React.memo en las Sec* con props.

> Evidencia: hooks/war-room/useCountdown.ts:12-24 · app/war-room/page.tsx:211-224,274-280 · lib/useApi.ts:45 (refreshInterval default 30s)

### Cuaderno: persistencia O(corpus completo) en cada pulsación de tecla del editor

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

CodeMirror dispara onChange en cada keystroke sin debounce (MarkdownEditor.tsx:281-285) → handleEdit → updateNote, que hace loadAll() (JSON.parse de TODAS las notas) + saveAll() (JSON.stringify de todas + dispatchEvent 'cuaderno:change') → el listener de CuadernoClient hace refresh() = otro loadAll(). Con un corpus de cientos de notas esto es parse+stringify de megabytes en el main thread por tecla, más recálculo de todos los useMemo dependientes de notes. Mejora: (1) debounce de 400-600ms en handleEdit manteniendo el draft en estado local del editor; (2) caché en memoria del array de notas en lib/cuaderno/store.ts (módulo-level) con write-through, de modo que loadAll() solo parsee localStorage una vez y las mutaciones operen sobre la caché.

> Evidencia: app/cuaderno/_components/MarkdownEditor.tsx:281-285 · app/cuaderno/_components/CuadernoClient.tsx:196,243-256 · lib/cuaderno/store.ts:137-159,175-176

### Cuaderno: grafo híbrido, tareas y tags se recalculan en cada cambio de notas aunque su vista no esté abierta

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

CuadernoClient computa graphData = buildHybridGraph() con useMemo([notes]) incondicionalmente (línea 406), y buildHybridGraph ejecuta extractEntityMentions (regex de wikilinks + resolveEntity) sobre el contenido de TODAS las notas; ídem allTasks() y allTags() (líneas 411-415). Combinado con el refresh por keystroke del hallazgo anterior, se reescanea el corpus completo mientras se escribe, aun con la vista 'graph'/'tasks' cerrada. Mejora: gatear el cálculo por vista activa (view === 'graph' ? buildHybridGraph() : EMPTY) o, mejor, mover esos useMemo a los componentes de vista (GraphView ya es dynamic) para que solo se computen al montar la vista.

> Evidencia: app/cuaderno/_components/CuadernoClient.tsx:406,411-417 · lib/cuaderno/store.ts:425-484 (buildHybridGraph, extractEntityMentions:74-85) · lib/cuaderno/queries.ts:100,158

### CuadernoTracker global: cada navegación de toda la app paga parse+stringify del corpus del Cuaderno

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

El root layout monta CuadernoTracker (app/layout.tsx:9), que en cada cambio de pathname llama a logAction → store de cuaderno → loadAll() + saveAll() completos (parse/stringify de todas las notas) + dispatch 'cuaderno:change', de forma síncrona durante la transición de ruta. Además mete lib/cuaderno/store + entity-registry + 3 catálogos macro en el grafo compartido de todos los routes. Mejora: diferir el log con requestIdleCallback/setTimeout(0) para sacarlo del camino de la navegación, y escribir las visitas en una cola ligera con su propia key de localStorage (append-only) que el Cuaderno consolide en Bitácora al abrirse — elimina el coste O(corpus) por navegación y rompe la dependencia del store pesado en el layout raíz.

> Evidencia: app/layout.tsx:9 · components/CuadernoTracker.tsx:76-106 · lib/cuaderno/store.ts:150-159,494+ (logAction) · lib/cuaderno/entity-registry.ts:12-14

### Vigilancia (44kB): framer-motion entra al bundle por IntelFeed/LiveAlerts importados estáticamente

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

La página de vigilancia es trivial (71 líneas, fetch + grid) pero importa IntelFeed y LiveAlerts, que traen framer-motion (motion + AnimatePresence) y lucide-react — de ahí los 44kB de first-load específico del route (471.9kB raw total medidos). Mejora: cargar ambos paneles con next/dynamic(() => import(...), { ssr: false, loading: skeleton }) para sacar framer-motion del camino crítico, o sustituir las animaciones de lista por transiciones CSS (el resto de la plataforma no usa framer-motion en listas). Si se mantiene framer-motion, usar LazyMotion + domAnimation reduce ~25kB.

> Evidencia: app/workspaces/[workspaceId]/vigilancia/page.tsx:4-6,66-67 · components/osiris/IntelFeed.tsx:4-5 · components/osiris/LiveAlerts.tsx:4 · .next/app-build-manifest.json

### ToolboxShell importa estáticamente las 5 vistas inline aunque solo se muestra una

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

ToolboxShell (app/extras) importa CommandCenter, InboxView, TerminalView, CamaModule y PreinformesModule de forma estática (líneas 14-19) y las renderiza condicionalmente por useState (161-173): todo el código viaja en el chunk inicial de /extras (~495.7kB raw) aunque el usuario aterriza siempre en 'command-center'. Mejora: convertir las 4 vistas no-default a next/dynamic() con loading fallback — patrón que el propio repo ya aplica bien en CuadernoClient (GraphView/MarkdownEditor dynamic, líneas 65-70).

> Evidencia: app/extras/_components/ToolboxShell.tsx:14-19,161-178 · patrón de referencia: app/cuaderno/_components/CuadernoClient.tsx:65-70

### Patrón de store duplicado 5 veces: 'CustomEvent window → setItems(loadAll())' sin caché ni suscripción granular

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

Cama, Preinformes, Cuaderno, map-inbox y media-prefs reimplementan el mismo patrón: saveAll → JSON.stringify completo + dispatchEvent, y cada componente suscrito responde con su propio loadAll() (JSON.parse completo). Con Cama/Preinformes montados a la vez en varios espacios (War Room, Toolbox, Cuaderno, Command Center), un solo cambio provoca N parses del store completo y N re-renders. Mejora profunda: un helper compartido createLocalStore<T>(key) en lib/ con caché en memoria, useSyncExternalStore para suscripción (evita tearing y el doble loadAll), y snapshot inmutable compartido entre suscriptores. API retrocompatible con loadAll/saveAll para migración incremental — y deja un único punto donde enchufar el backend cuando llegue.

> Evidencia: lib/cama/store.ts:33-53 · lib/preinformes/store.ts:141 · lib/cuaderno/store.ts:137-159 · lib/workspace/map-inbox.ts:41,51 · lib/media-prefs.ts:41 · consumidores: app/_components/cama/CamaModule.tsx:68-78, app/_components/preinformes/PreinformesModule.tsx:85-88, app/workspaces/[workspaceId]/guardados/page.tsx:16-17

### WorkspaceContext: value sin memoizar y sin slicing — abrir la command palette re-renderiza todo el shell

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

WorkspaceProvider construye el value con spread ({ ...state, openTab, ... }) sin useMemo (WorkspaceContext.tsx:90-96): cualquier dispatch (abrir/cerrar palette, toggle agent, tabs) crea un objeto nuevo y re-renderiza TODOS los consumidores de useWorkspaceStore — WorkspaceShell, sidebar, topbar, tabs y agent panel — aunque solo cambie isCommandPaletteOpen. Mejora: (1) useMemo del value con deps [state]; (2) separar en dos contexts (UiContext: palette/agent · TabsContext: tabs/activeTabId) para que la palette no arrastre al resto del chrome del Command Center en cada apertura (Cmd+K es ruta caliente).

> Evidencia: context/WorkspaceContext.tsx:79-97 · consumidores: app/_components/workspace/workspace-shell.tsx:20, workspace-command-palette.tsx, workspace-tabs.tsx

### CuadernoClient: monolito de 1.310 líneas con 10 vistas inline en un solo client component

**Impacto:** MEDIO · **Esfuerzo:** alto · **Tipo:** profunda

CuadernoClient gestiona en un único componente las vistas today/notes/tasks/calendar/tags/graph/insights/templates/cama/preinformes más omni-search, sync panel, AI panel, picker y navegación con historial: ~30 useState/useRef en el mismo scope, de modo que cualquier cambio (query del buscador, saveStatus, focusMode) re-renderiza el shell entero. GraphView y MarkdownEditor ya son dynamic, pero las vistas restantes y los paneles laterales no. Mejora: extraer cada vista a su propio componente bajo _components/views/ con dynamic() y mover el estado local de cada vista hacia abajo (query → sidebar, saveStatus → toolbar). Reduce el route de 28.6kB y convierte los re-renders por tecleo en locales.

> Evidencia: app/cuaderno/_components/CuadernoClient.tsx (1.310 líneas; vistas en 421-1100; estados 75-119) · dynamic ya aplicado solo en líneas 65-70

### Overview del Command Center: hook síncrono disfrazado de async y cabecera de 764 líneas sin split

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

useWorkspaceOverview devuelve datos del repositorio mock de forma síncrona con isLoading:false hardcodeado (use-workspace-overview.ts:7-17), así que el OverviewSkeleton de la línea 43 es código muerto; mientras, WorkspacePoliticalOverview (764 líneas con datos políticos inline) + 11 widgets viajan en el client bundle del route (22.1kB). Mejora: cargar WorkspacePoliticalOverview con next/dynamic() (es contenido bajo el fold del grid operativo), y cuando se conecte backend, migrar el hook a useApiQuery/React Query (el QueryProvider con staleTime 60s ya está montado en app/layout.tsx:48) en lugar del patrón ad-hoc — el skeleton volverá a tener sentido con streaming real.

> Evidencia: hooks/workspace/use-workspace-overview.ts:7-17 · app/workspaces/[workspaceId]/overview/page.tsx:21,43,57 · app/_components/workspace/political-overview.tsx (764 líneas) · lib/api/query-provider.tsx:20

### estudio/page.tsx es 'use client' sin necesitarlo: página estática de cards con hover en JS

**Impacto:** BAJO · **Esfuerzo:** bajo · **Tipo:** quick-win

La home del Estudio (317 líneas) es un grid de Links 100% estático; el único motivo del 'use client' es un onMouseEnter/onMouseLeave que cambia borderColor (línea 261). Convertirla a server component sustituyendo el hover por una clase CSS (:hover en un CSS module o Tailwind) elimina el JS del route, la hace prerenderizable como HTML puro y mejora el TTI del punto de entrada del módulo BI. Quick win representativo: el mismo patrón (página de navegación estática marcada client por un hover) conviene auditarlo en otros hubs.

> Evidencia: app/estudio/page.tsx:1,261

### Toolbox deep-linka a un workspace hardcodeado 'spain-energy' distinto del canónico 'ws_espana_2026' del header

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

ToolboxShell define DEFAULT_WORKSPACE = 'spain-energy' (línea 41) y genera 9 deep-links (/workspaces/spain-energy/docs, /tables, /slides…), mientras AppHeader enlaza el Command Center a /workspaces/ws_espana_2026/overview (AppHeader.tsx:89): el usuario que salta desde el Toolbox aterriza en un workspace distinto (o vacío) al que usa desde la nav global, duplicando datos de recents/tabs por workspaceId. El propio comentario del archivo (líneas 38-40) ya propone la solución: leer el último workspace de lib/workspace/last-space (que AppHeader ya escribe en cada navegación, AppHeader.tsx:98-100) con fallback al canónico.

> Evidencia: app/extras/_components/ToolboxShell.tsx:38-41,59-95 · app/_components/AppHeader.tsx:89,98-100 · lib/workspace/last-space.ts


## 4. Diseño visual y accesibilidad

### Cinco sistemas de estilo conviviendo sin fuente única de tokens

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

Conviven: (1) tokens WS inline en JS que duplican a mano los valores de tokens.css (WS.bg #fbfbfd = --color-bg, WS.surface2 = --color-surface-raised… y con un desliz: WS.ink3 #6e6e73 corresponde en realidad a --color-ink-4, no a --color-ink-3 #515154); (2) CSS modules de Estudio con su propio namespace de variables; (3) war-room.css con hex propios; (4) Tailwind con valores arbitrarios (~270 usos de text-[#6e6e73], border-[#e8e8ed]…) pese a que tailwind.config.ts YA expone clases ink/ink-3/accent/hairline mapeadas a tokens, que casi nadie usa; (5) la capa de overrides [data-workspace-light] en globals.css que repinta clases slate oscuras con !important. Mejora: convertir WS en referencias a variables (WS.accent = 'var(--color-accent)' …), codemod de los hex arbitrarios de Tailwind a las clases-token ya definidas, y regla de lint que prohíba hex nuevos fuera de tokens.css.

> Evidencia: lib/workspace/workspace-utils.ts:9-48; styles/tokens.css:6-104; tailwind.config.ts (theme.extend.colors); styles/globals.css:200-233; salida de grep: 90× text-[#6e6e73], 58× text-[#1d1d1f], 47× border-[#e8e8ed] en app/workspaces y components/{tables,projects,crm,canvas,inbox}

### Doble accent corporativo: #1F4E8C (652 usos) vs #0071e3 (133 usos)

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

El header global, el hub /workspaces y el hero del War Room usan el azul corporativo #1F4E8C; el Command Center, Toolbox, Cuaderno y tokens.css usan el azul Apple #0071e3. En el mismo viaje (hub → Command Center) el usuario ve cambiar el color de marca, los botones primarios y los estados activos. Mejora: declarar en tokens.css una semántica doble explícita (--color-brand: #1F4E8C para identidad/navegación y --color-accent: #0071e3 para interacción) o consolidar en uno, y sustituir los literales por la variable empezando por AppHeader, workspaces/page.tsx y workspace-utils.ts.

> Evidencia: app/_components/AppHeader.tsx:53,132,160-161,180,204 (#1F4E8C hardcodeado); app/workspaces/page.tsx:84-85,113,165-166,183; lib/workspace/workspace-utils.ts:26 (#0071e3); recuento: 652 ocurrencias de 1F4E8C vs 133 de 0071e3 en app/, lib/, components/

### Estudio (Domo*) usa variables CSS que no existen: siempre cae a fallbacks grises Tailwind

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

DomoSidebar.module.css y DomoChrome.module.css consumen --bg-primary, --bg-secondary, --color-border, --color-muted, --bg-hover y --color-accent-bg, que no están definidas en tokens.css ni globals.css (solo osiris.css las define para su scope). Resultado: Estudio renderiza siempre con la paleta fallback gray de Tailwind (#e5e7eb, #f9fafb, #9ca3af) en vez de los hairlines/inks de la plataforma (#d2d2d7, #6e6e73), y el item activo mezcla texto #0071e3 (token sí definido) sobre tinte rgba(59,130,246,…) de blue-500. Quick-win: añadir esas 6 variables como alias en tokens.css o renombrarlas a las existentes.

> Evidencia: app/estudio/_components/DomoSidebar.module.css:6-7,61,92,101,106-107; app/estudio/_components/DomoChrome.module.css:6,19,23,28; styles/tokens.css (no las define); app/osint-global/osiris.css:16-17,158-159 (única definición, scoped)

### Dark mode: ~40 líneas de tokens muertos + toggle huérfano con el tema bloqueado en claro

**Impacto:** BAJO · **Esfuerzo:** bajo · **Tipo:** quick-win

ThemeProvider está bloqueado en light (setters no-op) por decisión de producto, pero tokens.css mantiene el bloque completo [data-theme="dark"] (108-145), tailwind.config.ts declara darkMode con selector data-theme, globals.css conserva reglas dark (.nav línea 98) y components/ThemeToggle.tsx sigue en el árbol. Es peso muerto que confunde a cada sesión nueva (¿hay dark o no?). Quick-win: borrar el bloque dark, el darkMode de Tailwind y ThemeToggle.tsx (recuperables de git si se reactiva), o documentar en tokens.css que el dark es WIP intencional.

> Evidencia: components/ThemeProvider.tsx:3-14,25-29; styles/tokens.css:106-145; tailwind.config.ts (darkMode); styles/globals.css:98; components/ThemeToggle.tsx

### War Room y Cuaderno sin un solo @media: rotos en móvil y tablet

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

war-room.css (1.414 líneas) tiene 0 media queries y su layout es grid fijo 240px+1fr con sidebar sticky; Cuaderno.module.css (0 media queries) usa grid 64px+260px+1fr. En ≤640px el rescate genérico de globals.css no los alcanza porque apila por selectores de atributo sobre style inline, no sobre clases .wr-main/.shell. Además no existe ningún breakpoint tablet (641-1024px) en toda la capa global: el único de ancho es max-width:640px. Mejora: añadir a war-room.css y Cuaderno.module.css un breakpoint ~900px que colapse el sidebar a un select/drawer horizontal (patrón que ya tiene DomoSidebar en 768px) y definir un breakpoint tablet global.

> Evidencia: app/war-room/war-room.css:18-25,136-146 (grid 240px 1fr, sticky, 0 @media); app/cuaderno/_components/Cuaderno.module.css:4-16 (grid 64px 260px 1fr, 0 @media); styles/globals.css:251 (único breakpoint de ancho); app/estudio/_components/DomoSidebar.module.css:142-164 (patrón a replicar)

### Command Center en móvil se queda sin navegación: sidebar y agente ocultos sin alternativa

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

En ≤640px globals.css hace display:none de .ws-sidebar-wrap y .ws-agent-wrap; el comentario dice que la navegación queda 'en las pestañas', pero WorkspaceTabs solo muestra tabs YA abiertas (se siembran al navegar), así que un usuario móvil que entra en overview no puede llegar a inbox, docs ni a las otras ~16 vistas. Mejora: en móvil renderizar un selector de vista (select o bottom-sheet con los WORKSPACE_VIEWS agrupados) en WorkspaceTopbar, reutilizando lib/workspace/navigation.ts.

> Evidencia: styles/globals.css:357-360 (.ws-sidebar-wrap/.ws-agent-wrap display:none); app/_components/workspace/workspace-shell.tsx:40-43,69-74; app/_components/workspace/workspace-tabs.tsx:20-64 (tabs solo de vistas visitadas); lib/workspace/navigation.ts (WORKSPACE_VIEWS)

### El 'responsive' global depende de selectores [style*="grid-template-columns:1.6fr 1fr"] con !important

**Impacto:** ALTO · **Esfuerzo:** alto · **Tipo:** profunda

El bloque móvil de globals.css (115 líneas) enumera ~30 combinaciones literales de grid-template-columns y 12 paddings exactos como selectores de subcadena sobre el atributo style. Cualquier variación trivial (un espacio, 1.55fr, padding:24px 31px) escapa de la red; y es imposible de razonar al editar una página. Mejora profunda: introducir 3-4 clases utilitarias de layout (.split-2, .kpi-grid, .section-pad) con sus breakpoints en CSS, y migrar las páginas del workspace gradualmente; congelar el bloque de atributos como legacy y prohibir nuevos grids inline en el módulo.

> Evidencia: styles/globals.css:235-326 (bloque móvil completo con [style*=…] + !important); 743 ocurrencias de style={{ solo en app/workspaces + app/_components/{workspace,cama,preinformes}

### Cero aria-labels en el chrome del workspace y sin aria-current en ninguna sidebar

**Impacto:** ALTO · **Esfuerzo:** bajo · **Tipo:** quick-win

Los 24 archivos de app/_components/workspace no contienen ni un aria-label: el <aside> y el <nav> de la sidebar van sin nombre, los NavLink activos no llevan aria-current="page" (solo 8 archivos lo usan en toda la app), los botones de icono (Ajustes, Perfil, cerrar tab, '+') solo llevan title, y la tira de tabs no usa semántica de tablist. El botón '+' (Nueva vista) además no tiene onClick: es un control muerto. Quick-win: pasada de 1-2 h añadiendo aria-label/aria-current en sidebar, tabs, topbar y rail del Cuaderno, y ocultar o implementar el botón '+'.

> Evidencia: app/_components/workspace/workspace-sidebar.tsx:20,61,122-157,173-196; app/_components/workspace/workspace-tabs.tsx:83-102 (botón sin onClick),140-161; grep aria-label en app/_components/workspace = 0; aria-current en todo el repo = 8 archivos

### Command palette del workspace sin semántica de diálogo ni gestión de foco completa

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

WorkspaceCommandPalette enfoca el input y gestiona flechas/Enter, pero no tiene role="dialog" ni aria-modal, el handleKeyDown no captura Escape, no hay focus-trap (Tab se escapa al fondo) ni aria-activedescendant para anunciar la opción seleccionada, y el botón de cierre no tiene aria-label. El menú de herramientas del AppHeader sí hace bien aria-expanded/haspopup/role=menu: úsalo de patrón. Mejora: añadir role/aria-modal/Escape/trap al palette (y al DomoCommandPalette de Estudio, que comparte patrón).

> Evidencia: app/_components/workspace/workspace-command-palette.tsx:104,126-141,146-200; components/DomoCommandPalette.tsx; contraste con app/_components/AppHeader.tsx:196-215 (patrón correcto)

### Hover implementado con onMouseEnter/onMouseLeave mutando el DOM en todo el Command Center

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

Sidebar, tabs y topbar implementan el hover con listeners JS que escriben style directamente (12+ puntos solo en el chrome). Consecuencias: el estado hover no existe para teclado (focus no recibe el mismo feedback más allá del outline global), no se limpia si el nodo se re-renderiza con el ratón encima, y añade listeners por cada item. Mejora: 4-5 clases CSS compartidas (.ws-navlink, .ws-iconbtn, .ws-tab…) en un workspace.css con :hover/:focus-visible equivalentes, eliminando los handlers.

> Evidencia: app/_components/workspace/workspace-sidebar.tsx:139-150,184-191; app/_components/workspace/workspace-tabs.tsx:92-99,150-157; app/_components/workspace/workspace-topbar.tsx:57-58

### Dos componentes de empty state y tres sistemas de skeleton divergentes

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

Empty states: components/EmptyState.tsx usa una paleta semántica propia hardcodeada de Tailwind (#B45309/#FEF3C7, #B91C1C/#FEE2E2, #15803D/#DCFCE7) que no coincide con los tokens (--color-warn #d97706, --color-danger #c42c2c, --color-success #2d8a39), mientras workspace-empty-state.tsx usa WS con otro layout; además EmptyState inyecta un <style> basura para 'keep eslint happy'. Skeletons: components/Skeleton.tsx (shimmer + inyección de keyframes en head), components/ui/skeletons (SkeletonLine/Card) y OverviewSkeleton (Tailwind animate-pulse con border-[#e8e8ed]); solo Estudio y War Room tienen loading.tsx, las ~18 vistas del Command Center no tienen ninguno. Mejora: un único EmptyState con prop variant (full-page/card) tokenizado, un único primitivo Skeleton, y loading.tsx por vista del Command Center.

> Evidencia: components/EmptyState.tsx:56-61,91; app/_components/workspace/workspace-empty-state.tsx; components/Skeleton.tsx:15-28; components/ui/skeletons; app/_components/workspace/overview-skeleton.tsx; find loading.tsx → solo app/estudio/loading.tsx y app/war-room/loading.tsx

### WS.font ignora Inter (next/font): el workspace renderiza con otra tipografía en Windows/Linux

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

app/fonts.ts carga Inter/Source Serif/JetBrains via next/font y tokens.css los encadena en --font-text para identidad cross-platform; pero WS.font hardcodea "'SF Pro Text', -apple-system, …" sin var(--font-inter), así que todo el Command Center, Cama y Preinformes caen a Helvetica/Segoe en no-macOS mientras el resto de la app usa Inter (métricas y pesos distintos, posible CLS). Quick-win de una línea: WS.font = "var(--font-text)" y WS.fontDisplay = "var(--font-display)".

> Evidencia: lib/workspace/workspace-utils.ts:46-47; app/fonts.ts:1-40; styles/tokens.css:56-69; consumo en app/_components/workspace/workspace-shell.tsx:31 y CamaModule/PreinformesModule

### Microtipografía por debajo de 10px en chrome y badges (49 puntos)

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

Hay 49 usos de fontSize 8.5-9.5px solo en el chrome del workspace y war-room.css: labels de grupo de la sidebar (9.5px uppercase + letter-spacing 0.10em), badge 'DATOS DEMO' a 8.5px, railSub del Cuaderno a 9px, eyebrows del hero del War Room a 9.5px. En uppercase con tracking ancho, por debajo de ~10px la legibilidad cae para cualquier usuario con visión reducida (y son textos informativos, no decorativos). Quick-win: definir --text-2xs: 10.5px como suelo tipográfico y subir esos puntos; reservar <10px solo para elementos aria-hidden.

> Evidencia: app/_components/workspace/workspace-sidebar.tsx:69,166; app/_components/workspace/workspace-topbar.tsx:66-69; app/cuaderno/_components/Cuaderno.module.css:51-52; app/war-room/war-room.css:83-94,109-115; grep fontSize 8.5-9.5 → 49 resultados

### Tarjetas KPI reimplementadas 4+ veces con jerarquías distintas

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

El mismo patrón 'label uppercase + número grande coloreado' está reimplementado en el hub /workspaces (inline, accent #1F4E8C/#5B21B6), en MiniKpi de la sidebar, en workspace-kpi-strip, en .kpi de globals.css y en los kpiBlock del Toolbox — cada uno con tamaños (24/16/32px), radios (14/10/16px) y colores semánticos propios. Además el hub muestra KPIs fallback inventados (12 alertas, riesgo 64) indistinguibles de datos reales, sin el badge 'DATOS DEMO' que sí usa el topbar del Command Center. Mejora: extraer un KpiCard compartido (size: sm/md/lg, tone semántico desde tokens) y propagar el indicador de demo/fallback.

> Evidencia: app/workspaces/page.tsx:56,108-129 (fallback kpis hardcoded); app/_components/workspace/workspace-sidebar.tsx:160-171 (MiniKpi); app/_components/workspace/workspace-kpi-strip.tsx; styles/globals.css:117-122 (.kpi); app/extras/_components/Toolbox.module.css:251-257; contraste con badge demo en workspace-topbar.tsx:66-69

### Capa [data-workspace-light]: componentes aún escritos en dark-slate repintados con !important

**Impacto:** MEDIO · **Esfuerzo:** alto · **Tipo:** profunda

components/tables, crm, projects, canvas, editor y doc-context-panel siguen escritos con clases Tailwind oscuras (bg-slate-800/900, text-slate-300…) y globals.css los 'traduce' al tema claro con ~30 overrides !important bajo [data-workspace-light]. Cualquier clase slate nueva que no esté en la lista (p.ej. bg-slate-700/50, ring-slate-*) se escapa y aparece un parche oscuro en la UI clara; además impide reactivar un dark mode real. Mejora: migrar esos componentes a las clases-token de tailwind.config (ink, hairline, accent) y eliminar la capa de overrides al terminar.

> Evidencia: styles/globals.css:194-233; grep slate → components/tables/{cells,politeia-table,table-chart-panel}.tsx, components/crm/*.tsx, components/projects/{kanban-view,gantt-view,dynamic-views,project-summary}.tsx, components/canvas/*.tsx, components/editor/*.tsx, app/_components/docs/doc-context-panel.tsx


## 5. Nuevas funcionalidades (producto)

### Conectar el agente del workspace a la capa de IA real (hoy es un mock)

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

El panel de agente del Command Center responde siempre con respuestas falsas: el hook llama a un orquestador local con delay() simulado y la route handler devuelve literalmente '[Mock] Procesando…'. Sin embargo el repo ya tiene una capa de IA completa con cascada Gemini>Groq>Anthropic>Ollama y 14 herramientas reales (get_boe_today, get_polls, get_actor_profile, web_search…) que ya alimentan el chat del Cuaderno vía /api/brain/chat. Primer paso: reescribir app/api/workspace/agent/route.ts usando generateWithTools de lib/ai (igual que /api/brain/chat-stream) inyectando como contexto los datos del workspaceRepository (issues, decisiones, docs), y cambiar use-workspace-agent.ts para hacer fetch a esa ruta en vez de llamar a agentOrchestrator. Es el agente transversal que cruza paneles, Cuaderno y Cama que pide el producto, y el 80% de la infraestructura ya existe.

> Evidencia: hooks/workspace/use-workspace-agent.ts:82 (llama a agentOrchestrator); lib/workspace/agent-orchestrator.ts:21 (delay simulado, respuestas enlatadas); app/api/workspace/agent/route.ts (devuelve '[Mock]'); lib/ai/index.ts, lib/ai/tools.ts:33-225 (herramientas reales), app/cuaderno/_components/CuadernoAIPanel.tsx (patrón ya funcionando)

### Las acciones de 'Agente IA' del command palette no hacen nada al pulsarlas

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

El palette (Cmd+K) ofrece 'Generar briefing', 'Resumir vista actual' y 'Análisis de riesgos' en el grupo Agente IA, pero esas acciones no tienen href y execute() solo hace router.push si existe href: al pulsarlas el modal se cierra en silencio. Quick win: hacer que abran el workspace-agent-panel con el prompt precargado (o como mínimo eliminarlas hasta que el agente sea real). Es un fallo de confianza visible en la función más promocionada del producto.

> Evidencia: app/_components/workspace/workspace-command-palette.tsx:61-65 (agentActions sin href) y :138-141 (execute solo navega si hay href)

### Preinformes: redactar secciones con IA usando el contenido real de las fuentes seleccionadas

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

El asistente de Preinformes ya hace lo difícil (paso 2 selecciona notas reales del Cuaderno y macroargumentos reales de la Cama vía fuentesDisponibles()), pero luego desperdicia ese trabajo: buildMarkdown() solo imprime las ETIQUETAS de las fuentes en una lista final y las secciones quedan en '_Pendiente de redactar._' hasta que el analista escribe a mano. Propuesta diferencial: botón 'Redactar con IA' por sección que haga POST a una nueva ruta /api/preinformes/draft pasando la guía de la sección + el CONTENIDO real de las fuentes (note.content del Cuaderno, resumen/puntosClave/evidencias de la Cama) y rellene contenido con generateText de lib/ai (con fallback mock como hace /api/workspace/executive-summary). Convierte un formulario en un generador de borradores real, que es exactamente lo que vende el módulo.

> Evidencia: lib/preinformes/store.ts:102-117 (fuentesDisponibles cruza Cuaderno+Cama), :212-234 (buildMarkdown ignora el contenido de las fuentes); app/_components/preinformes/PreinformesModule.tsx; patrón de ruta IA con fallback en app/api/workspace/executive-summary/route.ts

### Inbox del workspace con señal real: BOE + RSS + OSINT (hoy 100% mock)

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

El Inbox promete 'Señal sin ruido · RSS · BOE · Alerts · X' pero inboxRepository lee exclusivamente de inboxMock (193 líneas estáticas); solo el status persiste en localStorage. El repo ya tiene todas las piezas: parser RSS propio sin dependencias (lib/rss.ts), cliente real de la API del BOE con caché (lib/ai/boe-client.ts), scoring de noticias (lib/news-scoring.ts) y feeds OSINT (/api/osiris/news). Primer paso: ruta /api/workspace/inbox que agregue sumario BOE del día + 4-6 feeds RSS configurables + noticias OSINT, puntúe con news-scoring y devuelva InboxItem[]; el cliente mantiene overrides de estado en localStorage como hoy. Esto convierte la vista diaria principal del analista en una herramienta real en lugar de una demo.

> Evidencia: lib/inbox/inbox-repository.ts:15-20 (solo inboxMock), lib/inbox/inbox-mock.ts; components/inbox/inbox-view.tsx:128 (alert '(En producción → POST /api/workspace/issues)'); piezas reales en lib/rss.ts, lib/ai/boe-client.ts, lib/news-scoring.ts

### Búsqueda global unificada cross-espacios en el AppHeader

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

Cada espacio tiene su buscador aislado: el palette del Command Center solo busca docs/actores/research/knowledge de ese workspace, CuadernoOmniSearch solo entidades y data-embeds del Cuaderno, y el AppHeader global no tiene búsqueda ninguna; Cama y Preinformes no aparecen en ningún buscador pese a ser stores compartidos. Propuesta: un palette global (Cmd+K fuera del workspace) montado en AppHeader que federe los stores locales ya existentes — loadAll() de Cama, de Preinformes y del Cuaderno, docRepository, más las rutas de navigation.ts — devolviendo resultados agrupados por espacio con deep-link. Primer paso: extraer searchEntities del palette de workspace a lib/search/global-search.ts y añadir los tres stores localStorage, que comparten el mismo patrón de carga.

> Evidencia: app/_components/workspace/workspace-command-palette.tsx:17-39 (búsqueda solo workspace, sin Cama/Preinformes/Cuaderno); app/cuaderno/_components/CuadernoOmniSearch.tsx:98-109 (solo cuaderno); app/_components/AppHeader.tsx (413 líneas, sin búsqueda); stores federables en lib/cama/store.ts:33, lib/preinformes/store.ts:125, lib/cuaderno/store.ts

### Export server-side con plantilla corporativa para Cama, Preinformes y Reporting

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

Hoy los entregables al cliente salen con window.print() del navegador (Cama y Preinformes abren una ventana y llaman a w.print()) o con un PDF cliente minimalista que solo distingue heading/paragraph, sin tablas, listas, portada ni branding. Para una consultora, el PDF es EL producto. Propuesta: ruta /api/export/pdf que renderice server-side con @react-pdf/renderer (ya está en serverComponentsExternalPackages de next.config.js, listo para runtime nodejs) una plantilla corporativa única — portada, cabecera/pie 'Politeia · Confidencial', tablas de evidencias, sección de fuentes — reutilizable por docs, macroargumentos (toMarkdown ya estructura los datos) y preinformes. Segunda fase: DOCX con la librería docx en la misma ruta.

> Evidencia: app/_components/cama/CamaModule.tsx:419-435 (exportarPdf = w.print()); app/_components/preinformes/PreinformesModule.tsx:584 (w.print()); lib/docs/pdf-generator.tsx:107-148 (PDF cliente solo heading/paragraph); next.config.js (@react-pdf/renderer ya externalizado para server)

### Comentarios y menciones @ sobre docs, macroargumentos y preinformes

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

No existe ningún sistema de comentarios en toda la plataforma: la Cama versiona con nota de cambio pero no permite discutir un argumentario, y los docs no tienen hilo de revisión, pese a que el dominio (aprobar mensajes de campaña, validar informes antes de distribución) es inherentemente colaborativo y ya hay 5 miembros mock con roles en workspaceRepository.getMembers(). Primer paso encajando con el stack actual: lib/comments/store.ts con el mismo patrón localStorage+CustomEvent de lib/cama/store.ts, claveado por entidad ('doc:id', 'cama:id', 'pre:id'), y un componente CommentsPanel reutilizado en docs/[docId] y en el detalle de CamaModule, con autocompletado de @menciones contra getMembers() que emita una notificación al store del hallazgo de notificaciones unificadas. Cuando llegue el backend, se sustituye el store sin tocar la UI (mismo contrato que ya usan los repositorios).

> Evidencia: lib/cama/store.ts:91-131 (versionado sin discusión); lib/docs/doc-repository.ts (sin comentarios); lib/workspace/mock-data.ts:42 (members u1-u5 con roles); patrón de store replicable en lib/cama/store.ts:45-53

### Centro de notificaciones unificado con digest diario (hoy: campana con mocks + terremotos)

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

La campana del workspace solo mezcla alertas mock estáticas y terremotos USGS ≥4.5, y Estudio tiene su propia página de notificaciones desconectada; los eventos que sí genera el producto (nueva versión de macroargumento, preinforme generado, item guardado desde el mapa OSINT, automatización 'ejecutada') no notifican a nadie. Propuesta: lib/notifications/store.ts compartido (localStorage + CustomEvent, patrón Cama) al que todos los módulos hagan push de eventos tipados, con la campana del AppHeader leyendo de ahí y una vista 'Digest de hoy' que agrupe por módulo lo ocurrido desde la última visita. Primer paso: instrumentar los emisores que ya disparan CustomEvents (cama:change, preinformes:change, politeia:inbox:changed) para que además escriban en el store de notificaciones.

> Evidencia: app/_components/workspace/workspace-notifications.tsx:58-107 (solo mock-data alerts + /api/osiris/earthquakes); eventos ya emitidos pero huérfanos en lib/cama/store.ts:25,49, lib/preinformes/store.ts:24,141, lib/workspace/map-inbox.ts:41; app/estudio/notificaciones (silo aparte)

### Automations ejecutables: motor mínimo para 2-3 triggers reales

**Impacto:** ALTO · **Esfuerzo:** alto · **Tipo:** profunda

Las automatizaciones son decorativas: el builder guarda dos strings (triggerLabel/actionLabel) en localStorage y no hay ningún runner — runCount nace en 0 y nunca cambia. Propuesta pragmática sin backend nuevo: (1) un evaluador cliente en el layout del workspace que al cargar compruebe los triggers con datos ya disponibles ('Llega un item BOE al Inbox' contra el sumario del BOE de lib/ai/boe-client.ts, 'pico de menciones' contra /api/osiris/news) y ejecute acciones reales (crear notificación en el store unificado, crear doc con docRepository.createDocFromText); (2) para 'Cada día laborable a las 8:00 → generar briefing', engancharlo al cron de Vercel ya configurado (daily-refresh 7:00) que deje el briefing listo. Primer paso: definir triggers/acciones como objetos tipados con id en automation-builder.tsx en lugar de strings sueltos.

> Evidencia: lib/workspace/automations-store.ts:37-49 (solo persiste labels, runCount:0 fijo); app/_components/workspace/automation-builder.tsx:8-22 (TRIGGERS/ACTIONS como strings); vercel.json (crons daily-ingest/daily-refresh ya operativos); acciones reales disponibles en lib/docs/doc-repository.ts:createDocFromText

### Versionado real de Docs reutilizando el patrón de snapshots de la Cama

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

El historial de versiones de los documentos es teatro: getVersionsMock() devuelve 3 versiones inventadas con blocks vacíos, así que restaurar es imposible, mientras que la Cama ya implementa versionado real (snapshot en cada cambio de contenido, máx. 20, con restaurarVersion). Quick win de alto retorno: replicar ese patrón en docRepository.saveDoc — snapshotear blocks anteriores cuando cambian, persistir con el helper persist() que ya usa, y exponer restore. Para una consultora donde el doc pasa por borrador→revisión→cliente, poder volver atrás es básico y aquí cuesta poco porque el patrón está escrito y probado en el mismo repo.

> Evidencia: lib/docs/doc-repository.ts (getVersionsMock con blocks: [] hardcodeados); patrón completo a copiar en lib/cama/store.ts:91-152 (snapshot + MAX_VERSIONES + restaurarVersion); persistencia ya disponible en lib/workspace/persist.ts

### Modo cliente: compartir doc/preinforme/slides como vista read-only

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

No hay forma de enseñar un entregable a un cliente sin darle la plataforma entera: los docs tienen flag clientVisible que nada usa, los tipos de Estudio ya definen DashboardShare/ShareLinkMeta/ShareRole sin implementación, y Slides solo tiene modo presentación local. Propuesta: ruta /share/[token] fuera del shell de navegación que renderice una vista read-only con marca 'Confidencial · preparado para cliente'. Primer paso sin backend: serializar el snapshot (doc blocks o markdown del preinforme) y guardarlo bajo politeia:share:[token] en localStorage para presentar desde el mismo equipo en reuniones (modo presentación cliente); segundo paso, persistir el snapshot vía @vercel/blob (ya externalizado en next.config.js y usado por el sync del Cuaderno) para enlaces compartibles de verdad.

> Evidencia: lib/docs/doc-repository.ts (clientVisible:false sin consumidores); types/domo importados en lib/estudio/api-client.ts:8 (DashboardShare/ShareLinkMeta/ShareRole sin backend); app/workspaces/[workspaceId]/slides/page.tsx:105,216 (modo presentación solo local); next.config.js (@vercel/blob disponible)

### Estudio: alertas y vigilantes apuntan a /api/domo, que no existe en el repo

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

Todo el cliente API del Estudio (alertas, notificaciones, fuentes, datasets, dashboards, shares…) hace fetch a /api/domo/*, pero no existe ninguna route handler bajo app/api/domo ni rewrites en next.config.js/vercel.json/middleware.ts: cada llamada devuelve 404 y las vistas quedan en estado vacío/error permanente. Los 'vigilantes' que Preinformes y Cama referencian como fuentes son por tanto inoperantes. Decisión a tomar: o implementar un /api/domo mínimo (alertas y notificaciones primero, persistencia en KV/blob o incluso in-memory con seed) o refactorizar api-client.ts a modo local con stores localStorage como el resto de módulos. Primer paso: app/api/domo/alerts/route.ts con GET/POST/PATCH sobre un store sencillo para que el ciclo crear→disparar→notificar funcione de extremo a extremo.

> Evidencia: lib/estudio/api-client.ts:19 (const BASE = '/api/domo') y todas las *Api; ausencia verificada de app/api/domo/** y de rewrites en next.config.js, vercel.json y middleware.ts; consumidores en app/estudio/alertas/_components/AlertsClient.tsx:40-62 y app/estudio/notificaciones

### Vista 'Mi día': tareas y vencimientos unificados de Workspace + Cuaderno + War Room

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

Existen tres sistemas de tareas que no se ven entre sí: las actions del workspace con dueDate (las usa el Morning Brief para contar vencidas), las tareas extraídas de notas del Cuaderno con responsable/prioridad/fecha (lib/cuaderno/queries.ts ya las parsea como base de datos), y las 'Tareas críticas' hardcodeadas del War Room. Un jefe de equipo no tiene ningún sitio donde ver todo lo que vence hoy. Primer paso barato: widget 'Mi día' en el overview del Command Center que agregue en lectura las tres fuentes (getActions del repo, getTasks de queries.ts del Cuaderno, sección tareas del War Room) ordenadas por vencimiento, con deep-link a su origen; después, permitir reasignar contra los members del workspace.

> Evidencia: lib/workspace/morning-brief-builder.ts:15-17 (overdueActions ya calculadas); lib/cuaderno/queries.ts:43-50 (NoteTask con responsible/dueDate/priority); app/war-room/page.tsx:72 (sección 'tareas' aislada); hueco en app/_components/workspace/widgets/ (existe actions-widget pero solo workspace)

### Cama: panel de 'salud del argumentario' cruzando evidencias con vigilantes y prensa

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

La Cama guarda evidencias con fuerza (alta/media/baja) y métricas de impacto (penetración/resonancia/riesgo) que hoy se rellenan a mano con sliders y se quedan congeladas, perdiendo valor a los días. Mejora diferencial: un chequeo 'Refrescar señales' por macroargumento que consulte las fuentes vivas ya disponibles — get_narrative_trends y search_news de lib/ai/tools.ts, pulso de prensa del context-builder — y marque qué evidencias siguen vigentes, cuáles han caducado y si el frame del adversario sube o baja, sugiriendo actualizar resumen/puntos (lo que dispararía el versionado existente). Primer paso: ruta /api/cama/health que reciba el macroargumento y devuelva un JSON validado (patrón generateJSON + Zod ya usado por /api/workspace/radar) con señales y recomendación.

> Evidencia: lib/cama/store.ts:75,160-208 (impacto estático y evidencias sin refresco); lib/ai/tools.ts:56,163 (search_news, get_narrative_trends); patrón JSON validado en app/api/workspace/radar/route.ts:1-50 con lib/radar/radar-schema.ts


## 6. Robustez, seguridad y calidad

### Estudio roto de raíz: api-client apunta a /api/domo pero los handlers viven en /api/estudio

**Impacto:** ALTO · **Esfuerzo:** bajo · **Tipo:** quick-win

Todo el CRUD del módulo BI (fuentes, pipelines, datasets, dashboards, alertas, gobernanza) usa `const BASE = '/api/domo'`, pero no existe ningún handler bajo app/api/domo: los route handlers reales están en app/api/estudio/*. Cada fetch devuelve el 404 HTML de Next, fetchDomo lanza error y las listas quedan en defaults vacíos (`data = []`), sin que nadie lo note porque varias pantallas no muestran isError. El fix es cambiar BASE a '/api/estudio' (los segmentos /fuentes, /pipeline, /dataset, /alert ya coinciden) y añadir un smoke test que falle si el contrato URL cliente-handler vuelve a divergir.

> Evidencia: lib/estudio/api-client.ts:19 (BASE='/api/domo'), app/api/estudio/fuentes/route.ts, app/api/estudio/{alert,dataset,pipeline,dashboard}/ (existen), ausencia total de app/api/domo/

### El middleware no verifica la firma de la sesión: cualquier cookie con cualquier valor pasa

**Impacto:** ALTO · **Esfuerzo:** bajo · **Tipo:** quick-win

middleware.ts solo comprueba la PRESENCIA de la cookie politeia_session (`if (!session) redirect`), nunca su validez: `verifyToken()` existe en lib/auth/session.ts pero no tiene ni un solo caller en todo el repo. Basta con setear manualmente `politeia_session=x` para acceder a toda la plataforma (workspaces, war-room, estudio incluidos). Además getSecret() tiene fallback hardcodeado 'politeia-dev-secret-2026' si AUTH_SECRET no está en env. Hardening: llamar a verifyToken (ya es Edge-compatible, usa WebCrypto) en el middleware, redirigir si la firma o el exp fallan, y hacer fail-fast en producción si AUTH_SECRET no está definida.

> Evidencia: middleware.ts:90-95, lib/auth/session.ts:44-46 (getSecret fallback) y :71 (verifyToken sin callers — verificado con grep en app/ y lib/)

### Doble sistema de auth divergente: cookie en middleware + localStorage en 123 páginas

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

Conviven dos fuentes de verdad: la cookie politeia_session (middleware) y los tokens electsim_access en localStorage que 123 páginas comprueban con `isAuthenticated()` en un useEffect propio. Divergen con facilidad: el logout disperso (p.ej. nowcasting, coaliciones, escenarios) llama a clearTokens() pero nunca a POST /api/auth/logout, así que la cookie sigue válida 30 días y el 'desconectado' puede volver a entrar; al revés, si se limpia localStorage con cookie viva, cada página redirige en cliente a /login tras renderizar. Además login/page.tsx hace push a /dashboard cuando CLAUDE.md §0.6 dice que post-login es /inicio. Propuesta: una sola fuente (la cookie verificada por middleware), eliminar los 123 checks por página (o reducirlos a un AuthProvider en el layout raíz) y un logout único que limpie ambos lados.

> Evidencia: lib/auth.ts:18, middleware.ts:90, app/login/page.tsx:30-31, app/nowcasting/page.tsx:116, app/api/auth/logout/route.ts (nunca invocado desde la UI), grep isAuthenticated → 123 archivos en app/

### Hub /workspaces consume 4 endpoints que no existen y lo enmascara con datos inventados

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** quick-win

app/workspaces/page.tsx llama a /api/workspaces, /api/workspaces/{id}/kpis, /api/system/kpis y /api/briefings/archive: ninguno tiene route handler (existe app/api/workspace/* en singular y app/api/briefings/{morning,generate}). Resultado: el hub muestra SIEMPRE FALLBACK_WORKSPACES y KPIs ficticios ('12 alertas activas', 'riesgo 64') como si fueran reales, porque el `error` y el `source` de useApi se descartan en el destructuring. Una consultora que enseña esto a un cliente está enseñando datos falsos sin saberlo. Quick-win: crear los handlers (aunque devuelvan mock con _meta.source='mock') y pintar el DataSourceBadge/aviso 'demo' que ya existe en components/ cuando source !== 'backend'.

> Evidencia: app/workspaces/page.tsx:14-25 (FALLBACK_*), :31, :49-56 (error ignorado, kpis hardcoded), ausencia de app/api/workspaces/ y app/api/system/kpis/ y app/api/briefings/archive/

### War Room: si /api/war-room/snapshot falla, spinner eterno sin error ni reintento

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

warRoomApi.getSnapshot() traga todos los errores y devuelve null; useWarRoom hace setData(null) + setLoading(false), y la página renderiza `if (loading || !data) → 'Cargando War Room...'` para siempre. El analista en plena campaña ve un loading infinito sin mensaje, sin botón de reintentar y sin pista de qué falló. Quick-win: distinguir error de loading en el hook (estado `error` + función `retry`) y renderizar un estado de fallo con botón Reintentar reutilizando el patrón del app/error.tsx existente.

> Evidencia: hooks/war-room/useWarRoom.ts:9-14, lib/api/war-room.ts:6-12 (catch → null), app/war-room/page.tsx:231-240

### Optimistic updates sin rollback en crisis y tareas del War Room

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

useWarRoomCrisis.updateEstado y useWarRoomTareas.cycleEstado aplican el cambio optimista en estado local y luego hacen el PATCH, pero patchCrisisEstado/patchTareaEstado devuelven null en fallo y nadie lo comprueba: la UI confirma un cambio que el servidor no guardó, y el poll de 60-120s lo revierte en silencio (flicker desconcertante y decisiones tomadas sobre estado falso). Fix barato: capturar el resultado, revertir el estado anterior si es null y avisar con un toast/banner.

> Evidencia: hooks/war-room/useWarRoomCrisis.ts:23-27, hooks/war-room/useWarRoomTareas.ts:25-32, lib/api/war-room.ts:22-32 (PATCH catch → null)

### Stores de Cama, Cuaderno y Workspace: quota llena = pérdida de trabajo sin aviso

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

Todos los stores locales (lib/cama/store.ts, lib/cuaderno/store.ts, lib/preinformes/store.ts, lib/workspace/persist.ts, agent-storage.ts, automations-store.ts) hacen `localStorage.setItem` dentro de un catch vacío comentado como 'silencioso'. Con QuotaExceededError (notas largas + 20 versiones por macroargumento + decks de slides por workspace compiten por los ~5MB del mismo origen), el analista sigue escribiendo creyendo que guarda y lo pierde todo al recargar. Propuesta: un helper común `safeSetItem` en lib/ que detecte QuotaExceeded, emita un CustomEvent 'politeia:storage:error' y un banner global 'No se está guardando — exporta tu trabajo'; como mejora profunda, migrar Cuaderno/Cama a IndexedDB o a backend (ya hay drizzle/postgres como deps opcionales).

> Evidencia: lib/cama/store.ts:45-53, lib/cuaderno/store.ts:149-157, lib/preinformes/store.ts:132-142, lib/workspace/persist.ts:28-35, lib/workspace/agent-storage.ts:6-13, lib/workspace/automations-store.ts:21

### Mutaciones del Estudio sin onError y confirmaciones con window.confirm/alert

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

Los delete/toggle/sync de Estudio usan useMutation sin onError: si el API falla, no pasa nada visible (ni toast, ni revert, ni log). Las confirmaciones destructivas usan window.confirm nativo (PipelineListClient, DatasetListClient, FuentesClient, DashboardListClient, GovernanceClient, CuadernoClient '¿Borrar la nota?') y los resultados se comunican con alert() (AlertsClient 'Alerta disparada', slides 'Error al renderizar PDF'), que bloquea el hilo y rompe la estética Apple-like del producto. Propuesta: un ConfirmDialog y un useToast ligeros (Radix ya está en el stack) + onError por defecto en un wrapper de useMutation que invalide queries y notifique.

> Evidencia: app/estudio/alertas/_components/AlertsClient.tsx:51-64,160, app/estudio/pipeline/_components/PipelineListClient.tsx:135, app/estudio/dataset/_components/DatasetListClient.tsx:172, app/estudio/fuentes/_components/FuentesClient.tsx:188, app/cuaderno/_components/CuadernoClient.tsx:286, app/workspaces/[workspaceId]/slides/page.tsx:97

### Build ciego: ignoreBuildErrors + ignoreDuringBuilds anulan el único gate de deploy

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

next.config.mjs lleva `typescript: { ignoreBuildErrors: true }` y `eslint: { ignoreDuringBuilds: true }`, y el protocolo de deploy (CLAUDE.md §0.4) usa 'npm run build pasa' como único gate antes de `vercel --prod`: hoy un error de tipos o un import roto compilan y se despliegan. Además `npm run test:unit` ejecuta UN solo archivo (medios-methodology) y tsc --noEmit no se ejerce en ningún flujo. Propuesta: mantener los ignore en build si hace falta para velocidad, pero añadir `npm run typecheck` + `npm run test:units` al checklist pre-deploy (o un script `predeploy` que encadene build+typecheck) e ir saneando errores por módulo.

> Evidencia: next.config.mjs:7-8, package.json:11-14 (scripts typecheck/test:unit)

### Smoke tests del workspace rotos por el middleware de auth (posibles falsos verdes)

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

tests/smoke/workspace.spec.ts navega a /workspaces/ws_espana_2026/* sin cookie politeia_session; el middleware redirige a /login porque no tiene bypass por DEV_MODE (DEV_MODE solo afecta a lib/auth/auth-config.ts, no al middleware). El primer test ('h1 visible') puede dar verde falso sobre la página de login, y los que buscan textos concretos fallan siempre. Fix: un global-setup de Playwright que haga POST /api/auth/login y persista storageState con la cookie, o aceptar un bypass explícito de middleware cuando DEV_MODE==='true' (solo en local). Es la base para poder ampliar cobertura del Command Center, hoy ≈ 0 (ningún test unitario toca lib/cama, lib/preinformes, lib/cuaderno ni lib/workspace, que son funciones puras fáciles de testear con un mock de localStorage).

> Evidencia: tests/smoke/workspace.spec.ts:6-29, middleware.ts:82-98 (sin DEV_MODE), playwright.config.ts:42 (env DEV_MODE), lib/auth/auth-config.ts:18

### WorkspaceShell ignora el workspaceId: cualquier id muestra el demo 'España 2026'

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

workspace-shell.tsx hace `const workspace = demoWorkspace` sin mirar el id de la URL, y ninguna vista llama a notFound(): /workspaces/lo-que-sea/overview renderiza el shell del demo con topbar 'España 2026'. Combinado con el hub que ofrece spain-energy/banking-eu/health-public en FALLBACK_WORKSPACES, el usuario 'cambia' de workspace y ve exactamente los mismos datos (getMembers devuelve [] para cualquier id distinto de ws_espana_2026, el resto filtra por workspaceId contra mocks de un solo workspace). Fix: resolver el workspace vía workspaceRepository.getWorkspaceById(workspaceId), notFound() si no existe, y badge 'workspace demo' cuando los datos sean mock.

> Evidencia: app/_components/workspace/workspace-shell.tsx:21, lib/workspace/workspace-repository.ts (getMembers: ws_espana_2026 hardcoded), app/workspaces/page.tsx:14-20

### Código muerto: GraphView del Cuaderno y la ruta huérfana /operaciones

**Impacto:** BAJO · **Esfuerzo:** bajo · **Tipo:** quick-win

CuadernoClient importa dinámicamente GraphView (247 líneas) pero solo renderiza HybridGraphView: import muerto que genera chunk y confunde a quien mantenga el grafo. /operaciones (354 líneas + 327 de CSS) no aparece en navigation.ts pero sigue viva y AppHeader aún la trata como ruta workspace activa (path === '/operaciones'); /workspace ya es solo un redirect correcto a /war-room. Limpieza: borrar GraphView.tsx y su import, y convertir /operaciones en redirect (como /workspace) o eliminarla tras backup.

> Evidencia: app/cuaderno/_components/CuadernoClient.tsx:65 (import) vs :524 (solo HybridGraphView), app/cuaderno/_components/GraphView.tsx, app/operaciones/page.tsx, app/_components/AppHeader.tsx:93

### Tipos débiles (any) en vistas del Command Center que ningún gate detecta

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

vigilancia/page.tsx tipa sus feeds como `{ news: any[]; earthquakes: any[] }` y `stats: any`, terminal/page.tsx tiene `radarTop: any[]` y slides/page.tsx `const out: any[]`. Como el build ignora errores de tipos, cualquier cambio en la forma de /api/osiris/* (news, stats) rompería en runtime sin aviso (p.ej. `stats?.flights` undefined → '—' silencioso o crash en .toLocaleString si cambia a string). Fix: definir/reusar los tipos de respuesta osiris (existen en lib/osiris) y tipar las tres vistas; son cuatro casts localizados.

> Evidencia: app/workspaces/[workspaceId]/vigilancia/page.tsx:14-15, app/workspaces/[workspaceId]/terminal/page.tsx:222, app/workspaces/[workspaceId]/slides/page.tsx:81

### Migración a useApiQuery estancada: 62 páginas en el hook legacy que invita a ignorar errores

**Impacto:** MEDIO · **Esfuerzo:** alto · **Tipo:** profunda

lib/useApi.ts se autodeclara legacy ('para componentes nuevos, prefiere useApiQuery') y lib/api/use-api-query.ts es el patrón oficial con React Query, pero solo app/dashboard/page.tsx lo ha adoptado: 62 archivos siguen importando el hook casero, y el patrón dominante es destructurar solo `data` descartando error/source/warnings (workspaces/page.tsx es el ejemplo canónico). El hook además mete `headers` (objeto) en las deps de useCallback: un caller que pase headers inline entraría en bucle infinito de refetch. Propuesta profunda: plan de migración por espacio (empezando por workspaces y war-room), y mientras tanto serializar headers en las deps y exponer un componente estándar <ApiErrorBanner error source /> para que ignorar el error deje de ser el camino fácil.

> Evidencia: lib/useApi.ts:8-10 y :84 (headers en deps), lib/api/use-api-query.ts:10-12, grep "from '@/lib/useApi'" → 62 archivos vs 1 adoptante de useApiQuery (app/dashboard/page.tsx)


## 7. Ángulos adicionales (crítico de completitud)

### RBAC completo escrito pero muerto: ningún permiso se comprueba en rutas ni en UI

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

Existe una matriz de permisos completa con 4 roles (owner/admin/analyst/viewer) y 13 permisos, con helpers can(), assertCan() y withPermission() listos para envolver route handlers. Cero importadores en todo el repo: ninguna API route los usa y ninguna vista oculta acciones por rol, así que un 'viewer' puede borrar contenido, ejecutar el agente y exportar igual que un 'owner'. El SessionUser ya trae role desde auth-config (DEV_USER es 'owner'). Mejora: envolver las mutaciones de /api/workspace-sync, snapshots y export con withPermission(), y condicionar botones destructivos del Command Center con can(user, perm); es cablear lo que ya está escrito.

> Evidencia: lib/auth/rbac.ts (líneas 33-90: MATRIX, can, withPermission sin un solo import en app/ ni components/), lib/auth/auth-config.ts (líneas 26-44: DEV_USER y WorkspaceRole)

### Telemetría PostHog cableada de punta a punta pero con cero eventos emitidos

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

Hay un pipeline completo de analítica de uso: cliente server-side con timeout (lib/analytics/analytics-client.ts), endpoint /api/analytics/track que enriquece con user/tenant/role, y hook useTrack() listo para componentes. Ningún componente llama a useTrack: el producto no sabe cuáles de las 18 vistas del Command Center o los 5 espacios se usan, justo cuando se debaten duplicidades (Toolbox vs Command Center). Mejora quick-win: instrumentar 10-15 eventos clave (cambio de vista del workspace, creación de preinforme/macroargumento, ejecución del agente, export) y un pageview en WorkspaceShell.

> Evidencia: hooks/use-track.ts (hook sin call sites), lib/analytics/analytics-client.ts, app/api/analytics/track/route.ts (única referencia al cliente)

### No existe gestión de workspaces: imposible crear, renombrar o archivar un espacio de cliente

**Impacto:** ALTO · **Esfuerzo:** alto · **Tipo:** profunda

Para una consultora que vende 'un workspace por cliente/proyecto', el ciclo de vida del workspace no existe: workspaceRepository.listWorkspaces() devuelve un array estático de mock-data.ts, no hay createWorkspace/archiveWorkspace en ningún sitio, y el hub /workspaces (208 líneas) no tiene CTA de 'Nuevo workspace'. Curiosamente drizzle/schema.ts ya define la tabla workspaces para Postgres/Neon con el cliente lazy preparado. Mejora profunda: formulario de alta en el hub + métodos create/rename/archive en el repositorio (primero sobre localStorage con el patrón persist.ts existente, después sobre el endpoint que active el schema Drizzle).

> Evidencia: lib/workspace/workspace-repository.ts (líneas 53-58: solo lectura sobre mocks), lib/workspace/mock-data.ts (línea 25: array fijo), app/workspaces/page.tsx (sin acción de creación), drizzle/schema.ts (tabla workspaces ya modelada)

### Más de 40 proxies API públicos sin sesión ni rate-limit que consumen claves de pago

**Impacto:** ALTO · **Esfuerzo:** medio · **Tipo:** profunda

El middleware whitelista ~45 prefijos /api/* como públicos (acled, finnhub, newsapi, entsoe, esios, aemet, comtrade...). Varios de esos handlers firman las peticiones upstream con claves del servidor (FINNHUB_API_KEY, NEWSAPI_KEY, ENTSOE_API_KEY, ESIOS_API_KEY, AEMET_API_KEY): cualquiera en internet puede agotar la cuota o el presupuesto de esas APIs llamando al dominio de producción sin autenticarse. El motivo del whitelist fue que los fetch server-to-server internos no llevan cookie. Mejora: sustituir el whitelist por un header secreto interno (x-internal-token) que el middleware acepte para fetches servidor-a-servidor, dejando las rutas con clave detrás de sesión, o como mínimo un rate-limit por IP en el middleware.

> Evidencia: middleware.ts (líneas 5-80: PUBLIC_PREFIXES y comentario 'Sprint W.1' explicando la causa), app/api/finnhub/[...path]/route.ts (línea 73), app/api/newsapi/[...path]/route.ts (línea 27), app/api/entsoe/[...path]/route.ts (línea 98), app/api/aemet/[...path]/route.ts (línea 49)

### Cero error.tsx y loading.tsx en los segmentos de Workspaces, Cuaderno y Toolbox

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

Bajo app/workspaces/** (18 vistas), app/cuaderno y app/extras no hay ni un error.tsx, loading.tsx o not-found.tsx (War Room solo tiene loading.tsx). Cualquier throw en una vista del Command Center hace bubble hasta app/error.tsx raíz: el usuario pierde el sidebar, el topbar y el contexto del workspace entero, y un workspaceId inexistente nunca produce un 404 controlado. Mejora quick-win: un error.tsx en app/workspaces/[workspaceId]/ (mantiene el chrome y ofrece 'Reintentar'), un loading.tsx por segmento y notFound() cuando el id no resuelva.

> Evidencia: find sobre app/workspaces, app/cuaderno, app/extras: 0 resultados de error/loading/not-found; únicos existentes: app/error.tsx, app/loading.tsx, app/estudio/error.tsx, app/war-room/loading.tsx

### Atajos de teclado anunciados en la UI pero ninguno está vinculado: ni siquiera Cmd+K

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

lib/shortcuts/shortcut-registry.ts declara 10 atajos ('cmd+k', 'g o', 'g r', '?') y la command palette del workspace los pinta como badges (combo.split → 'CMD+K', 'G O'). Pero no existe ningún listener de keydown en todo el chrome del workspace ni en WorkspaceContext: la palette solo se abre con el botón del topbar, y los combos mostrados son pura decoración que engaña al analista. Mejora quick-win: un hook useGlobalShortcuts en WorkspaceShell que escuche keydown, abra la palette con Cmd+K, implemente las secuencias 'g x' contra los href del registry (usando el workspaceId real, no el hardcodeado ws_espana_2026) y '?' para la hoja de atajos.

> Evidencia: lib/shortcuts/shortcut-registry.ts (líneas 17-28), app/_components/workspace/workspace-command-palette.tsx (líneas 73-75: solo render del combo, sin keydown), app/_components/workspace/workspace-topbar.tsx (línea 90: único trigger, onClick), grep 'keydown' en app/_components/workspace y context: 0 resultados

### Web Push ya construido (service worker + VAPID) pero cableado solo a alertas de Commodities

**Impacto:** MEDIO · **Esfuerzo:** medio · **Tipo:** profunda

Existe infraestructura completa de notificaciones push: public/sw-push.js (service worker con notificationclick que abre data.url), hooks/useWebPush.ts (registro, permiso, subscribe/unsubscribe) y endpoints /api/commodities/push/*. Su único consumidor es PushToggle de commodities: las alertas del workspace, la vigilancia, el Estudio y el centro de notificaciones (que otros auditores ya señalan como mock) no aprovechan un canal que ya funciona. Mejora: parametrizar useWebPush (las URLs están hardcodeadas en las líneas 47-49), crear /api/push/* genérico por tópico y ofrecer el toggle en la vista vigilancia y en workspace-notifications.

> Evidencia: public/sw-push.js, hooks/useWebPush.ts (líneas 47-49: CONFIG_URL/SUBSCRIBE_URL hardcodeadas a /api/commodities/push/*), app/commodities/alerts/_components/PushToggle.tsx (único call site)

### Imprimir cualquier entregable produce basura: cero @media print y export limitado a .md

**Impacto:** MEDIO · **Esfuerzo:** bajo · **Tipo:** quick-win

No hay una sola regla @media print en styles/globals.css ni en ningún componente del workspace, y ningún window.print en el repo: Ctrl+P sobre un doc, un preinforme o el reporting imprime el sidebar, el topbar, los botones y los fondos tal cual. El único export del wizard de Preinformes es descargar Markdown crudo (descargarMd), inutilizable como entregable de cliente. Mejora quick-win complementaria al export server-side ya propuesto: bloque @media print global (ocultar nav/aside/buttons, forzar fondo blanco y tinta negra) + botón 'Imprimir' con window.print en docs, reporting y la vista previa de preinformes, que de paso da 'guardar como PDF' gratis.

> Evidencia: grep '@media print' en styles/ y app/: 0 resultados; grep 'window.print': 0 resultados; app/_components/preinformes/PreinformesModule.tsx (líneas 224, 516, 558: descargarMd como única salida)
