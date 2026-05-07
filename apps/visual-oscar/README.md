# @politeia/visual-oscar

**Frontend Next.js 14 · diseño Apple-like** ("Visual Oscar")

Politeia Analítica · plataforma de inteligencia política y de contratación pública con 68 páginas funcionales.

## Stack

- Next.js 14.2 · App Router
- React 18
- TypeScript estricto
- Inline styles (sin Tailwind) para máxima portabilidad
- SVG + CSS para gráficos y visualizaciones

## Arrancar en local

Desde la raíz del monorepo:

```bash
# Opción A — desde la raíz del monorepo (turbo)
npm install
npm run dev --workspace=@politeia/visual-oscar

# Opción B — directamente en el workspace
cd apps/visual-oscar
npm install
npm run dev
```

Por defecto sirve en `http://localhost:3001` (el puerto 3000 lo usa `@politeia/web`).

## Estructura

```
app/
├── _components/         · Header, navegación, banners
├── dashboard/           · Panel ejecutivo
├── briefing/            · Briefing diario con audio podcast (1/5/10 min)
├── mapa-actores/        · 318 actores políticos · cuadrante + buscador
├── partidos/            · 25 partidos · grupos parlamentarios · tabla comparativa
├── instituciones/       · CCAA · diputaciones · capitales · cabildos
├── escenarios/          · Simulador estratégico (hemiciclo + mapa provincias)
├── microdatos/          · Perfiles de votante (constructor multi-eje)
├── war-room/            · War room de campaña con countdown
├── adversarios/         · Inteligencia de adversarios (DAFO + voceros)
├── competidores/        · Inteligencia competitiva (genera informes Politeia 2 o 10 págs)
├── adjudicaciones/      · Inteligencia de adjudicaciones
├── licitaciones/        · Agregador feed multi-fuente
├── contratos-vigentes/  · Monitor de cartera y modificaciones
├── litigios-contratacion/ · Riesgo y litigios
├── fondos-europeos/     · PRTR + MFP 2021-2027
├── crisis/              · Crisis Intelligence
├── ataques-narrativos/  · Detección de ataques narrativos
├── trazabilidad/        · Trazabilidad legislativa
├── monitor-legislativo/ · Monitor en tiempo real
├── huella-legislativa/  · Huella e influencia externa
└── ... 50+ páginas más
components/
├── HemicycleAdvanced.tsx · Hemiciclo SVG con cálculo coalición
├── MapaProvincias.tsx    · Cartograma 52 provincias
├── VotacionSimulator.tsx · Simulador de votación
├── BrainBriefing.tsx     · Chat IA con preguntas pre-cargadas
└── ...
lib/
└── actores.ts            · Dataset compartido de 318 actores políticos
```

## Backend

El frontend habla con el FastAPI a través de **rutas proxy en el propio Next.js** (`app/api/...`).
Esto permite tres modos de funcionamiento sin cambiar código:

| Modo | Configuración | Comportamiento |
|------|---------------|----------------|
| Demo | (sin env) | Las rutas `/api/*` devuelven mocks. Las páginas hacen fetch real con auto-refresh — útil para ver la UI viva sin backend. |
| Conectado | `BACKEND_URL=https://tu-fastapi.com` | Las rutas `/api/*` reenvían al FastAPI. Si éste responde se usa su data; si falla o tarda > 4s se cae a mock. |
| Directo | `NEXT_PUBLIC_API_URL=https://...` | El cliente llama al backend sin pasar por el proxy (útil para `/api/v1/auth/login`). |

### Endpoints proxy disponibles

Cada uno tiene fallback mock que respeta el shape del backend:

| Ruta Next.js | Endpoint FastAPI · backend |
|--------------|---------------------------|
| `GET /api/health` | (interno) ping al backend, indica si está reachable |
| `GET /api/system/status` | `GET /api/system/status` (politeia_v3) |
| `GET /api/system/ticker` | `GET /api/system/ticker` (politeia_v3) |
| `GET /api/intelligence/signals` | `GET /intelligence/signals` |
| `GET /api/analytics/nowcast` | `GET /analytics/nowcast` |
| `GET /api/briefings/morning` | `GET /api/briefings/morning` |
| `GET /api/alerts` | `GET /api/alerts` |
| `* /api/proxy/{path}` | `* /{path}` — pasarela genérica para cualquier endpoint del FastAPI |

Cada respuesta lleva un campo `_meta = { source: 'backend'|'mock', ts }` que el cliente usa para mostrar el badge "BACKEND CONECTADO" / "DATOS DE DEMO" en la UI.

### Hook de fetching · `useApi`

```tsx
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

const { data, source, updatedAt, refresh } = useApi('/api/intelligence/signals', {
  initialData: INITIAL,           // fallback síncrono para el primer paint
  refreshInterval: 30_000,        // ms · 0 desactiva auto-refresh
  refreshOnFocus: true,           // refresca al volver el foco a la pestaña
})

<LiveStatusBadge updatedAt={updatedAt} source={source} onRefresh={refresh}/>
```

Páginas ya cableadas: **`/alertas`**, **`/nowcasting`**. Las demás siguen usando mocks inline — para wirearlas basta crear (si hace falta) un `app/api/<path>/route.ts` con su mock fallback y reemplazar la constante en la página por `useApi(...)`.

### Desplegar el backend FastAPI

El FastAPI vive en `api/` y necesita Postgres + Python 3.11+. Opciones probadas:

- **Railway** — `railway up` desde `api/`, añade plugin Postgres, copia `DATABASE_URL` de las variables.
- **Fly.io** — `fly launch` con un `Dockerfile` que instale `requirements.txt`, añade `fly postgres create`.
- **Render** — Web Service apuntando a `api/`, plan free incluye Postgres.

Una vez desplegado:

1. En Vercel · **Project Settings → Environment Variables** añade `BACKEND_URL = https://tu-fastapi.com` (sin slash final).
2. Redeploy. Las rutas `/api/*` empezarán a devolver `{ _meta: { source: 'backend' } }` y el badge cambiará a verde.

### Login

`POST /api/v1/auth/login` se llama directamente desde el cliente (no por proxy). En modo demo (sin `NEXT_PUBLIC_API_URL`) el login devuelve tokens fake al instante y acepta cualquier credencial.

## Deploy en Vercel · 2 minutos

1. Entra en **https://vercel.com** y haz login con GitHub (autoriza `politeianalitica-alt`).
2. **«Add New… → Project»** → busca el repo `Electsim` → **«Import»**.
3. En el formulario de configuración:
   - **Framework Preset:** Next.js (auto-detectado)
   - **Root Directory:** pulsa **«Edit»** y pon `apps/visual-oscar`  ← *crítico*
   - **Build Command, Install Command, Output:** déjalos por defecto (los lee de `vercel.json`)
4. Pulsa **«Deploy»**. En 60–90 s tienes URL de producción.

### Modo demo (sin backend)

Si **no** configuras `NEXT_PUBLIC_API_URL` en Vercel, la app entra automáticamente en **modo demo**:
- En `/login` aparece un aviso amarillo y un botón **«Entrar como demo»**.
- Cualquier credencial funciona · los tokens son fake locales.
- Toda la UI es navegable (los datos son mocks embebidos en cada página).

### Modo producción (con backend)

Cuando despliegues el backend FastAPI (Railway, Fly.io, Render…):
1. En Vercel · **Project Settings → Environment Variables** añade:
   ```
   NEXT_PUBLIC_API_URL = https://tu-backend.com
   ```
2. Re-deploy. El login pasa a llamar al backend real (`POST /api/v1/auth/login`).

## Notas

Esta app coexiste con `@politeia/web` (politeia v3, en `apps/web/`) sin sobreescribir nada. La estrategia es ofrecer dos vistas del mismo dominio para que el equipo elija o consolide.
