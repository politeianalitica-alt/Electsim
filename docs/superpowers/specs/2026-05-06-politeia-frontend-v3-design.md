# Politeia Frontend v3 — Diseño del Bloque 9

**Fecha:** 2026-05-06  
**Estado:** Aprobado — listo para implementación  
**Enfoque:** Value Sprints (Enfoque 2) — 4 semanas, valor desde el día 5

---

## 1. Contexto y problema

El backend de Politeia tiene 16 bloques implementados con más de 450 tests pasando. Incluye ETL en tiempo real, motor semántico con pgvector, embeddings, alertas, briefings LLM, simulación electoral, CRM, comunicaciones y multi-tenancy completo con RLS.

El frontend (`apps/web`) tiene 19 rutas Next.js con un design system sólido pero con dos problemas críticos:

1. **Casi todos los datos son demo hardcodeados.** Las constantes `DEMO_*` reemplazan llamadas reales a la API en la mayoría de páginas. El motor existe pero el volante controla una maqueta.
2. **No hay objetos conectados.** Un actor no lleva a sus alertas, sus alertas no llevan a sus narrativas, sus narrativas no llevan a sus iniciativas legislativas. El valor central de la plataforma —convertir inteligencia en contexto accionable— no existe en la UI.

El objetivo de este bloque es convertir el frontend en un sistema operativo de inteligencia funcional: datos reales, objetos interconectados, alertas en tiempo real y un canvas de investigación.

---

## 2. Decisiones de diseño aprobadas

| Decisión | Elección |
|---|---|
| Arquitectura | A+B — Object Graph + Intelligence Feed |
| Usuarios objetivo | Todos (consultor, gabinete, corporativo, periodista/OSINT) — inicial: consultor político |
| Momentos prioritarios | B+C primero (alertas RT + dossier actor), luego A+D |
| Modelo de navegación | D — Slide-over contextual con botón "Investigar en canvas" |
| Alcance | C — Reestructuración completa en 4 sprints |
| Emojis en UI | Prohibidos — usar iconos Lucide exclusivamente |

---

## 3. Arquitectura del sistema

### 3.1 Estructura de archivos — estado final

```
apps/web/
  app/
    (auth)/
      login/page.tsx
      callback/page.tsx
    (workspace)/
      [workspaceId]/                  # Sprint 3 — multi-tenant routing
        layout.tsx                    # WorkspaceProvider + sidebar contextual
        page.tsx                      # Command center
        alertas/page.tsx
        actores/
          page.tsx
          [actorId]/page.tsx          # Sprint 1 — dossier completo
        briefings/page.tsx
        medios/page.tsx
        riesgo/page.tsx
        legislativo/page.tsx
        coalicion/page.tsx
        geopolitica/page.tsx
        comms/page.tsx
        draft/page.tsx
        workspace/page.tsx
        buscar/page.tsx
        canvas/page.tsx              # Sprint 4
        brain/page.tsx
        settings/page.tsx
    globals.css
    layout.tsx
  components/
    layout/
      app-shell.tsx
      sidebar.tsx                    # Actualizar para [workspaceId]
      top-bar.tsx                    # Sprint 1: notification bell SSE
    intelligence/                    # Sprint 1 — nuevo módulo
      slide-over.tsx                 # Panel contextual deslizante
      slide-over-store.ts            # Estado Zustand
      object-card.tsx                # Tarjeta de objeto enlazado
      object-link.tsx                # Link clickable a cualquier objeto
    canvas/                          # Sprint 4 — nuevo módulo
      canvas.tsx                     # React Flow wrapper
      canvas-node.tsx                # Nodo base con variantes por tipo
      canvas-toolbar.tsx
      canvas-store.ts                # Estado Zustand
    dashboard/
      hero-briefing.tsx              # Sprint 2: datos reales
      live-ticker.tsx                # Sprint 1: SSE
      kpi-strip.tsx
      intel-grid.tsx
      module-grid.tsx
    command/
      command-palette.tsx
  lib/
    api/
      client.ts
      endpoints.ts                   # Ampliar con todos los endpoints
    realtime/                        # Sprint 1 — nuevo
      sse-client.ts
      use-sse.ts
    store/
      workspace.ts                   # Sprint 3 — WorkspaceStore
      slide-over.ts                  # Sprint 1
      canvas.ts                      # Sprint 4
    utils.ts
    query/
      provider.tsx
```

### 3.2 Flujo de datos

```
PostgreSQL + pgvector
        |
    Redis cache
        |
    FastAPI (apps/api)
       / \
      /   \
REST API  SSE stream
(React    (/alerts/stream,
 Query)    /ticker/stream)
      \   /
    Zustand stores
    (workspace, slideOver, alerts, canvas)
        |
    Pages + SlideOver + Canvas
```

### 3.3 Estado global (Zustand)

```typescript
// lib/store/workspace.ts
interface WorkspaceStore {
  workspaceId: string;
  config: WorkspaceConfig;        // módulos activos, producto YAML
  user: AuthUser;
  setWorkspace: (id: string) => void;
}

// lib/store/slide-over.ts
interface SlideOverStore {
  isOpen: boolean;
  objectType: "actor" | "alerta" | "narrativa" | "iniciativa" | "documento" | null;
  objectId: string | null;
  history: Array<{ type: string; id: string }>;  // navegación hacia atrás
  open: (type: string, id: string) => void;
  close: () => void;
  goBack: () => void;
}

// lib/store/canvas.ts  (Sprint 4)
interface CanvasStore {
  canvasId: string | null;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  addNode: (obj: IntelObject) => void;
  addEdge: (source: string, target: string) => void;
  save: () => Promise<void>;
}
```

---

## 4. Sprint 1 — Alertas en tiempo real + dossier de actor + slide-over

**Duración:** Semana 1  
**Entregable:** El consultor recibe alertas en vivo y puede investigar cualquier actor con un click.

### 4.1 SSE — Capa de tiempo real

**Nuevo endpoint FastAPI** (`apps/api/routers/system.py` o `alerts.py`):

```python
# GET /api/v1/alerts/stream
# GET /api/v1/ticker/stream
# Content-Type: text/event-stream
# Autenticación: JWT en header Authorization o cookie
```

El endpoint emite eventos cada vez que el motor de alertas (`services/alert_engine.py`) genera una alerta nueva. Usa `asyncio` + `asyncpg` o polling Redis pub/sub.

**Nuevo hook React** (`lib/realtime/use-sse.ts`):

```typescript
interface UseSSEOptions<T> {
  url: string;
  onMessage: (data: T) => void;
  enabled?: boolean;
}

function useSSE<T>(options: UseSSEOptions<T>): {
  connected: boolean;
  error: string | null;
}
```

- Reconexión automática con backoff exponencial (1s → 2s → 4s → max 30s)
- Limpieza del `EventSource` en `useEffect` cleanup
- `connected` expuesto para mostrar el indicador de estado en top-bar

**Actualización de `AlertasPage`:**

- Usa `useSSE` para añadir alertas al store en tiempo real
- Las alertas nuevas aparecen en la parte superior con animación de entrada (CSS transition, sin librerías)
- El contador de no leídas en el sidebar se actualiza en vivo
- `LiveTicker` en homepage usa `/ticker/stream` para actualización continua

### 4.2 SlideOver — Componente central

`components/intelligence/slide-over.tsx` — panel deslizante desde la derecha, ancho fijo 280px, z-index sobre el contenido principal.

**Anatomía del componente:**

```
SlideOver (controlled por slideOverStore)
  SlideOverHeader
    tipo de objeto (ACTOR / ALERTA / NARRATIVA...)
    nombre del objeto
    tags de contexto
    botón cerrar
    botón volver (si history.length > 0)
  SlideOverBody
    sección: métricas clave (riesgo, exposición, sentimiento...)
    sección: objetos relacionados (ObjectLink[])
    sección: acciones rápidas
  SlideOverFooter
    botón primario: "Investigar en canvas" (Sprint 4: abre canvas con nodo)
    botón secundario: "Generar nota" (abre draft con contexto)
    botón terciario: "Ir a dossier completo" (navega a /<tipo>/<id>)
```

**ObjectLink** (`components/intelligence/object-link.tsx`):

Componente reutilizable que cualquier página puede usar para hacer cualquier entidad clickable:

```typescript
interface ObjectLinkProps {
  type: "actor" | "alerta" | "narrativa" | "iniciativa" | "documento";
  id: string;
  label: string;
  meta?: string;
  variant?: "inline" | "card" | "badge";
}

// Al hacer click abre el slideOver con ese objeto
// Al hacer Cmd+click navega a la página completa del objeto
```

Toda página de la plataforma debe envolver sus referencias a entidades con `ObjectLink`. Esto convierte el grafo de objetos en algo navegable sin trabajo adicional por módulo.

### 4.3 Página de dossier de actor

**Ruta:** `app/(workspace)/[workspaceId]/actores/[actorId]/page.tsx`

**Layout en tres columnas:**

```
| Perfil (240px) | Tabs + contenido (flex-1) | Grafo de relaciones (180px) |
```

**Columna izquierda — Perfil:**
- Avatar con iniciales + color de partido
- Nombre, rol, partido
- Métricas: exposición, aprobación, riesgo global, alertas activas, narrativas
- Timeline de actividad reciente (últimos 5 eventos)

**Columna central — Tabs:**
- Narrativas: lista de narrativas en que aparece con velocidad (subiendo/estable/bajando)
- Alertas: alertas activas vinculadas al actor (ObjectLink a cada una)
- Legislativo: iniciativas donde es ponente, portavoz o actor afectado
- Posiciones: historial de posiciones declaradas sobre temas clave
- Declaraciones: últimas declaraciones recogidas por el ETL

**Columna derecha — Grafo:**
- Visualización con D3 force-directed o React Flow en modo compacto
- Nodos: aliados, adversarios, neutrales
- Click en nodo abre slideOver del actor relacionado
- Botón "Ver en canvas completo" (Sprint 4)

**Fuente de datos:**

```typescript
// endpoints.ts — ampliar
actorById: (id: string) => api.get<Actor>(`/actors/${id}`),
actorNarratives: (id: string) => api.get<NarrativeCluster[]>(`/actors/${id}/narratives`),
actorAlerts: (id: string) => api.get<AlertItem[]>(`/actors/${id}/alerts`),
actorLegislative: (id: string) => api.get<Initiative[]>(`/actors/${id}/legislative`),
actorRelations: (id: string) => api.get<ActorRelation[]>(`/actors/${id}/relations`),
```

### 4.4 Integración del slide-over en páginas existentes

Una vez construido el SlideOver, activar ObjectLink en:
- `AlertasPage` — cada alerta tiene actores y narrativas como ObjectLink
- `MediosPage` — cada historia tiene actores y narrativas clickables
- `LegislativoPage` — cada iniciativa tiene actores ponentes clickables
- `HomePage` — el HeroBriefing enlaza actores y alertas mencionados
- `BriefingsPage` — el texto del briefing tiene entidades resaltadas como ObjectLink

### 4.5 Top-bar: notification bell en vivo

`components/layout/top-bar.tsx`:
- Campana con badge de contador (no leídas) actualizado por SSE
- Click abre un dropdown con las últimas 5 alertas + link a página completa
- Indicador de conexión SSE (punto verde animado cuando conectado)

---

## 5. Sprint 2 — Feed completo con datos reales

**Duración:** Semana 2  
**Entregable:** Cero constantes DEMO_ en toda la aplicación.

### 5.1 Eliminar todos los stubs de demo

Recorrer todas las páginas y reemplazar:
- `DEMO_ALERTS` → `useQuery({ queryKey: ["alerts"], queryFn: endpoints.alertsList })`
- `DEMO_SOURCES` → `useQuery({ queryKey: ["media", "health"], queryFn: endpoints.mediaSourceHealth })`
- `DEMO_NARRATIVES` → `useQuery({ queryKey: ["narratives"], queryFn: endpoints.mediaNarratives })`
- `DEMO_BRIEFING` en HeroBriefing → ya usa React Query con fallback; eliminar el fallback hardcodeado
- `DEMO_ISSUES`, `DEMO_ACTIONS`, `DEMO_DECISIONS` en WorkspacePage → nuevos endpoints
- Constantes hardcodeadas en `RiesgoPage`, `GeopoliticaPage`, `LegislativoPage`, `CoalicionPage`

Cada página en estado de carga debe mostrar un skeleton (no spinner genérico) que preserve la forma del layout.

### 5.2 Búsqueda semántica con pgvector

**Ruta:** `app/(workspace)/[workspaceId]/buscar/page.tsx`

Conectar a endpoint que ejecuta búsqueda híbrida:

```typescript
semanticSearch: (query: string, filters?: SearchFilters) =>
  api.get<SearchResult[]>(`/search/semantic?q=${encodeURIComponent(query)}&types=${filters?.types?.join(",")}`),
```

El backend (`apps/api/routers/`) debe exponer un endpoint que:
1. Genera embedding del query con el mismo modelo usado en ingesta
2. Ejecuta `SELECT ... ORDER BY embedding <-> $1 LIMIT 20` en pgvector
3. Combina con búsqueda full-text (tsvector) con peso configurable
4. Devuelve resultados tipados con `type`, `id`, `title`, `excerpt`, `score`

Los resultados son clickables como ObjectLink — abren el slideOver del objeto correspondiente.

### 5.3 Briefing matinal con datos reales

`HeroBriefing` ya llama a `endpoints.morningBriefing()`. El problema es el fallback a `DEMO_BRIEFING`. Eliminar el fallback; si la API falla, mostrar un estado de error claro con botón de reintento.

Asegurar que el endpoint `/briefings/morning` en FastAPI funciona end-to-end: llama a `services/brain_service.py` → LiteLLM → modelo LLM → respuesta estructurada.

### 5.4 Riesgo con scoring real

`RiesgoPage` tiene `GLOBAL_RISK = 67` hardcodeado. Conectar a:

```typescript
riskScore: (workspaceId: string) => api.get<RiskScore>(`/risk/score?workspace_id=${workspaceId}`),
riskSignals: (workspaceId: string) => api.get<RiskSignal[]>(`/risk/signals?workspace_id=${workspaceId}`),
```

El servicio `services/actor_risk_core.py` ya calcula estos scores — solo falta el endpoint de router y la conexión frontend.

---

## 6. Sprint 3 — Multi-tenant workspace routing

**Duración:** Semana 3  
**Entregable:** Cada cliente tiene su propio workspace con su configuración, módulos y datos aislados.

### 6.1 Migración de rutas a [workspaceId]

**Estrategia de migración sin romper nada:**

1. Crear `app/(workspace)/[workspaceId]/layout.tsx` con `WorkspaceProvider`
2. Mover páginas una a una: crear la versión en `[workspaceId]/` y añadir redirect desde la ruta antigua
3. Una vez todas migradas, eliminar las rutas antiguas
4. Actualizar el sidebar para construir href con `workspaceId` del store

```typescript
// app/(workspace)/[workspaceId]/layout.tsx
export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceId: string };
}) {
  return (
    <WorkspaceProvider workspaceId={params.workspaceId}>
      {children}
    </WorkspaceProvider>
  );
}
```

### 6.2 WorkspaceProvider

`components/layout/workspace-provider.tsx`:

- Al montar, llama a `GET /workspaces/{workspaceId}` para cargar config
- Valida que el JWT del usuario tiene acceso a ese workspace
- Si no tiene acceso → redirect a `/` con mensaje de error
- Expone `useWorkspace()` hook para cualquier componente hijo
- Carga la configuración de producto (módulos activos, tema, preferencias)

### 6.3 WorkspaceSwitcher en sidebar

Si el usuario tiene acceso a más de un workspace:
- Aparece un switcher en la parte superior del sidebar (dropdown)
- Click en workspace → navega a `/{workspaceId}/`
- El workspace activo queda marcado visualmente

### 6.4 Módulos por producto

Cada workspace tiene un producto asociado (`config/products/*.yaml`). El layout del workspace lee qué módulos están activos y:
- Muestra solo esos módulos en el sidebar
- Oculta rutas inactivas (retorna 404 si se accede directamente)
- Puede tener un tema visual diferente por producto (colores de acento configurables)

---

## 7. Sprint 4 — Canvas de investigación + Draft studio

**Duración:** Semana 4  
**Entregable:** El analista puede ir de una alerta al canvas, construir el mapa de objetos, anotar hipótesis y exportar el informe desde la misma pantalla.

### 7.1 Canvas con React Flow

**Dependencia:** `@xyflow/react` (React Flow v12)

**Ruta:** `app/(workspace)/[workspaceId]/canvas/page.tsx`

**Tipos de nodos:**

| Tipo | Color | Datos mostrados |
|---|---|---|
| `actor` | Azul (#1F77FF) | Nombre, partido, exposición, riesgo |
| `alerta` | Rojo (#EF4444) | Nivel, título, fuente, tiempo |
| `narrativa` | Violeta (#8B5CF6) | Label, velocidad, volumen |
| `iniciativa` | Cyan (#00D4FF) | Título, estado, deadline |
| `documento` | Ámbar (#F59E0B) | Título, tipo, fecha |
| `simulacion` | Verde (#10B981) | Escenario, resultado clave |
| `hipotesis` | Gris dashed | Texto libre, estado (confirmada/descartada/pendiente) |

**Interacciones:**
- Doble click en espacio vacío → añadir nodo tipo hipótesis
- Drag desde ObjectLink en slideOver → añade ese objeto como nodo
- Click en nodo → abre slideOver del objeto (misma lógica que en páginas)
- Click derecho en nodo → menu contextual: eliminar, anotar, cambiar tipo
- Botón "Investigar en canvas" en slideOver → añade nodo al canvas activo o crea canvas nuevo

**Persistencia:**

```typescript
// endpoints.ts
canvasList: (workspaceId: string) => api.get<Canvas[]>(`/workspaces/${workspaceId}/canvases`),
canvasById: (id: string) => api.get<Canvas>(`/canvases/${id}`),
canvasSave: (id: string, state: CanvasState) => api.put(`/canvases/${id}`, state),
canvasCreate: (workspaceId: string, title: string) => api.post<Canvas>(`/workspaces/${workspaceId}/canvases`, { title }),
```

El estado del canvas (nodos + aristas + posiciones) se serializa como JSON y se guarda en la tabla `canvases` de PostgreSQL (migración necesaria).

### 7.2 Draft studio integrado

Panel derecho del canvas (220px) siempre visible cuando el canvas tiene nodos.

**Funcionamiento:**
1. El usuario selecciona nodos en el canvas (multi-select con Shift+click)
2. El draft studio muestra los objetos seleccionados como contexto
3. Click "Generar con LLM" → llama a `/brain/chat` con el contexto de los nodos seleccionados + prompt de plantilla
4. El texto generado es editable directamente en el panel
5. Cada afirmación tiene un ancla visual a la evidencia que la sustenta (ObjectLink inline)

**Tipos de draft disponibles:**
- Nota ejecutiva (1 página, estructura: resumen → contexto → análisis → recomendación)
- Briefing de cliente (formato briefing matinal personalizado)
- Q&A para portavoz (pregunta → respuesta → evidencia)
- Argumentario (afirmación → desarrollo → fuente)

**Export:**
- PDF: via endpoint `/export/pdf` que usa WeasyPrint (ya implementado en `services/document_core.py`)
- DOCX: via endpoint `/export/docx`
- Share link: URL con canvas ID que cualquier miembro del workspace puede abrir

---

## 8. Contratos de API — nuevos endpoints necesarios

Todos van en `apps/api/routers/`. Los servicios backend ya existen.

### Sprint 1

Los endpoints de workspace y workspace/overview ya existen en `api/routers/politeia_v3.py` y `api/routers/workspace_signals.py`. Los siguientes son genuinamente nuevos:

```
GET  /api/v1/alerts/stream                          SSE — alertas en vivo (nuevo)
GET  /api/v1/ticker/stream                          SSE — ticker en vivo (nuevo)
GET  /api/v1/actors/{actor_id}                      Perfil completo del actor (nuevo — /actors lista ya existe)
GET  /api/v1/actors/{actor_id}/narratives           Narrativas del actor (nuevo)
GET  /api/v1/actors/{actor_id}/alerts               Alertas relacionadas (nuevo)
GET  /api/v1/actors/{actor_id}/legislative          Iniciativas relacionadas (nuevo)
GET  /api/v1/actors/{actor_id}/relations            Red de relaciones (nuevo)
```

### Sprint 2

El endpoint de búsqueda semántica existe como POST en `api/routers/search.py`. Ampliar con soporte de filtros por tipo de objeto:

```
POST /api/v1/search/semantic                        Búsqueda semántica pgvector (ampliar el existente)
GET  /api/v1/risk/score?workspace_id=...            Score de riesgo global (nuevo)
GET  /api/v1/risk/signals?workspace_id=...          Señales de riesgo activas (nuevo)
```

### Sprint 3

Los endpoints de workspace config existen en `api/routers/workspace_config.py` bajo el patrón `/workspaces/me/*` (basado en JWT). En Sprint 3 se añaden los de canvas que requieren `{id}` explícito:

```
GET  /api/v1/workspaces/me/config                   Ya existe — usar en WorkspaceProvider
GET  /api/v1/workspaces/me/modules                  Ya existe — para sidebar condicional
GET  /api/v1/workspaces/                            Ya existe — para workspace switcher
```

### Sprint 4

```
GET  /api/v1/workspaces/{id}/canvases               Lista de canvas
POST /api/v1/workspaces/{id}/canvases               Crear canvas
GET  /api/v1/canvases/{id}                          Estado del canvas
PUT  /api/v1/canvases/{id}                          Guardar estado
GET  /api/v1/export/pdf                             Export PDF (ya existe)
GET  /api/v1/export/docx                            Export DOCX (ya existe)
```

---

## 9. Migración de base de datos

### Sprint 4 — nueva tabla `canvases`

```sql
-- packages/migrations/versions/0058_canvas.py
CREATE TABLE canvases (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    state       JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_canvases ON canvases
    USING (workspace_id = current_setting('app.current_workspace_id')::uuid);
```

---

## 10. Estándares de implementación

### Sin emojis

Ningún componente React, archivo de texto visible al usuario ni mensaje de la UI puede contener emojis. Usar iconos Lucide exclusivamente.

```typescript
// Correcto
import { AlertTriangle, User, FileText } from "lucide-react";

// Incorrecto
<div>TC admite recurso amnistía</div>
```

### Skeletons en lugar de spinners

Cada sección con datos asíncronos tiene su propio skeleton que preserva la forma del layout. No usar `<Spinner />` genérico.

### Server Components por defecto

Usar `"use client"` solo donde sea estrictamente necesario (interactividad, hooks de estado, SSE). Las páginas que solo muestran datos del servidor deben ser Server Components.

### React Query — configuración

```typescript
// lib/query/provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s para datos que cambian frecuentemente
      gcTime: 5 * 60_000,      // 5min en cache
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});
```

### TypeScript estricto

Todo componente nuevo tiene sus props tipadas. No usar `any`. Los tipos compartidos van en `packages/types/`.

---

## 11. Tests

| Módulo | Framework | Qué cubrir |
|---|---|---|
| `useSSE` | Vitest + mocks | Reconexión, parsing de eventos, limpieza |
| `SlideOver` | Vitest + Testing Library | Apertura, cierre, navegación histórica, variantes |
| `actores/[actorId]` | Vitest | Renderizado con datos, estado de carga, error |
| Canvas | Vitest | Añadir nodo, guardar, persistencia |
| SSE endpoints | pytest | Emisión de eventos, autenticación, cierre |
| Actor endpoints | pytest | Datos correctos, RLS por tenant |
| Search semántico | pytest | Resultados relevantes, filtros por tipo |

---

## 12. Criterios de aceptación por sprint

### Sprint 1 — Semana 1
- [ ] Las alertas nuevas aparecen en `AlertasPage` sin refrescar la página
- [ ] El contador de alertas en top-bar se actualiza en vivo
- [ ] Click en cualquier actor en cualquier página abre el slideOver con su contexto
- [ ] El slideOver muestra narrativas, alertas y riesgo relacionados
- [ ] `actores/[actorId]` carga datos reales con tres columnas funcionales
- [ ] El grafo de relaciones muestra actores conectados y es clickable

### Sprint 2 — Semana 2
- [ ] Ninguna página contiene constantes `DEMO_` o datos hardcodeados
- [ ] La búsqueda en `/buscar` devuelve resultados semánticos reales
- [ ] El briefing matinal en homepage tiene contenido generado por LLM con datos reales
- [ ] Los scores de riesgo en `RiesgoPage` vienen de `actor_risk_core.py`
- [ ] Cada página tiene skeletons correctos en estado de carga

### Sprint 3 — Semana 3
- [ ] Todas las rutas funcionan bajo `/(workspace)/[workspaceId]/`
- [ ] El workspace switcher en sidebar funciona si el usuario tiene más de un workspace
- [ ] Los módulos inactivos no aparecen en el sidebar
- [ ] La autenticación valida acceso al workspace antes de renderizar
- [ ] Las rutas antiguas redirigen a las nuevas correctamente

### Sprint 4 — Semana 4
- [ ] El canvas carga desde la BD y persiste cambios automáticamente
- [ ] Se pueden añadir nodos de tipo actor, alerta, narrativa y documento
- [ ] El botón "Investigar en canvas" en el slideOver abre el canvas con el nodo añadido
- [ ] El draft studio genera texto con LLM usando el contexto de los nodos seleccionados
- [ ] El export a PDF funciona desde el draft studio
- [ ] La migración 0058 corre limpia con RLS activado
