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

El frontend está pensado para consumir la API FastAPI ya disponible en `backend/`. La autenticación usa JWT (login en `/login` mockeado en cliente).

## Notas

Esta app coexiste con `@politeia/web` (politeia v3, en `apps/web/`) sin sobreescribir nada. La estrategia es ofrecer dos vistas del mismo dominio para que el equipo elija o consolide.
