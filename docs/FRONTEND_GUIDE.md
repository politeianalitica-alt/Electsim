# Frontend Guide — ElectSim (apps/web)

> Estado: Pendiente (Bloque 9). Este documento define las convenciones.

## Stack

- **Next.js 14** App Router (no Pages Router)
- **TypeScript** estricto (`strict: true`)
- **Tailwind CSS** v3 + **Radix UI** (primitivos accesibles)
- **Zustand** para estado cliente
- **React Query v5** (@tanstack/react-query) para server state
- **Plotly.js**, **deck.gl**, **D3** para visualizaciones

## Estructura de rutas

```
apps/web/app/
  (auth)/
    login/
    callback/
  (workspace)/
    [workspaceId]/
      page.tsx                    ← Command Center (dashboard principal)
      actors/page.tsx             ← Mapa de Actores
      legislative/page.tsx        ← Monitor Legislativo
      media/page.tsx              ← Medios & Narrativa
      risk/page.tsx               ← Termómetro de Riesgo
      alerts/page.tsx             ← Centro de Alertas
      intelligence/page.tsx       ← Intelligence Notebook
      canvas/page.tsx             ← Investigation Canvas
      drafts/page.tsx             ← Draft Studio
  admin/
    provisioning/page.tsx
    settings/page.tsx
  api/                            ← Next.js API routes (proxy hacia FastAPI)
    [...path]/route.ts
```

## Componentes de packages/ui

| Componente | Props clave | Descripción |
|-----------|-------------|-------------|
| `RiskGauge` | `score`, `trend`, `label` | Gauge de riesgo político 0-100 |
| `NarrativeClusterList` | `clusters`, `onSelect` | Lista de clusters narrativos |
| `MediaFeed` | `items`, `filter` | Feed de noticias con filtros |
| `ActorGraph` | `actors`, `relations` | Grafo de relaciones (deck.gl) |
| `AlertFeed` | `alerts`, `onDismiss` | Feed de alertas con acciones |
| `WorkspaceTimeline` | `events` | Timeline de eventos del workspace |
| `PoliticalCalendarGrid` | `events`, `month` | Calendario político mensual |

## Convenciones

- Componentes funcionales + hooks; cero clases
- `use client` solo donde estrictamente necesario
- Server Components por defecto (mejor para SEO y TTI)
- Rutas Next.js: `app/(grupo)/[paramDinamico]/page.tsx`
- Naming: `PascalCase.tsx` para componentes, `camelCase.ts` para utils

## Autenticación

JWT almacenado en cookie `httpOnly` (seteado por el proxy API).
El workspace activo se obtiene de la ruta dinámica `[workspaceId]`.

## Testing

- **Vitest** para unitarios y componentes (con Testing Library)
- **Playwright** para e2e (flujos: login, Command Center, alertas)
