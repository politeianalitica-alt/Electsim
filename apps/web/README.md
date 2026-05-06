# Politeia — Web (Next.js 14)

Frontend principal de la plataforma Politeia. Reemplaza progresivamente las páginas Streamlit en `dashboard/pages/` (que quedan como laboratorio interno).

## Stack

- Next.js 14 (App Router)
- TypeScript strict
- TanStack Query
- Tailwind CSS con tokens corporativos
- Framer Motion (animaciones)
- Lucide icons (sin emojis)
- Recharts / Plotly (gráficos)

## Estructura

```
apps/web/
  app/                         # App Router pages
    page.tsx                   # Home — Hero briefing + KPIs + Intel grid
    briefings/                 # D1
    medios/                    # D7 + narrativas
    alertas/                   # D6
    workspace/                 # D10 War Room
    brain/                     # N8 Politeia Brain
  components/
    layout/                    # AppShell, Sidebar, TopBar
    command/                   # Command Palette (Cmd+K)
    dashboard/                 # Hero, KPIs, Intel grid, Module grid
  lib/
    api/                       # client.ts + endpoints.ts
    query/                     # React Query provider
    utils.ts                   # formateadores
```

## Desarrollo local

```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev      # http://localhost:3000
```

El backend FastAPI debe estar corriendo en `http://localhost:8000`. El proxy de Next reescribe `/api/*` hacia el backend.

```bash
# En otra terminal
cd ../..
.venv/bin/uvicorn api.main:app --reload --port 8000
```

## Endpoints API consumidos

Todos bajo `/api/*` (proxy a FastAPI):

- `GET  /api/system/health`
- `GET  /api/system/status` — KPIs sistema
- `GET  /api/system/ticker` — items del ticker en vivo
- `GET  /api/briefings/morning` — briefing del día
- `GET  /api/briefings` — historial
- `GET  /api/briefings/{id}/pdf` — exporta PDF
- `GET  /api/media/top-stories?n=10`
- `GET  /api/media/source-health`
- `GET  /api/media/narratives`
- `GET  /api/alerts?unread=false`
- `POST /api/brain/chat` — chat con contexto
- `GET  /api/brain/status`
- `GET  /api/workspaces`
- `GET  /api/workspaces/{id}/overview`
- `POST /api/comms/strategy`
- `GET  /api/workflows`

## Diseño

- Modo oscuro siempre. BG `#080C14`, acento cian `#00D4FF`.
- **Sin emojis** en ningún elemento de la UI.
- Español en toda la UX.
- Cada elemento debe tener un estado para `real`, `demo`, `fallback`, `error`.

## Atajos de teclado

- `Cmd+K` / `Ctrl+K` — Command Palette
- `Esc` — Cerrar modal / palette
- `↑↓` — Navegar resultados palette

## Páginas pendientes de migración (de Streamlit)

- `/actores` — Mapa de Actores (D2)
- `/riesgo` — Termómetro de Riesgo (D3)
- `/legislativo` — Monitor Legislativo (D4)
- `/coalicion` — Gobierno y Coalición (D5)
- `/geopolitica` — Geopolítica (D8)
- `/comms` — Communication Intel (D9) — Strategy Room
- `/draft` — Draft Studio
- `/workflows` — Workflows guiados
- `/buscar` — Búsqueda Global
- `/memoria` — Memoria del Workspace
- `/integraciones` — Conectar Drive/GitHub/Slack
- `/settings` — Preferencias

Las páginas Streamlit existentes siguen accesibles en `dashboard/pages/` para uso interno mientras se completa la migración.
