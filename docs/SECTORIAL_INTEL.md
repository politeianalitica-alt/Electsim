# Módulo Sectorial Intel · Inteligencia transversal de 9 sectores

Capa unificada de inteligencia que cruza BOE + prensa + señales económicas
para los 9 sectores económicos clave en España (Defensa, Banca, Energía,
Agro, Farma, Telecom, Infraestructuras, Turismo, Vivienda).

Implementa el Bloque 10 del plan AIS (Sectorial Stubs + Cron + Middleware
+ Deploy) adaptado a la arquitectura existente Politeia (FastAPI +
Next.js App Router + Visual_Oscar).

## Arquitectura

```
agents/brain/pipelines/
├── data_sources/sector_taxonomy.py    ← taxonomía 9 sectores · keywords · CPV · CNAE
└── sectorial_intel_builder.py         ← construye SectorReport (score, KPIs, eventos, signals)

api/routers/sectores.py                ← FastAPI /api/v1/sectores/* (9 endpoints)

apps/visual-oscar/
├── types/sector-signals.ts            ← tipos SectorSignal (PDF Bloque 10)
├── lib/api/sectores.ts                ← sectoresApi.getSignals()
├── hooks/sectores/useSectorSignals.ts ← hook con auto-fetch
├── app/api/sectores/[id]/signals/     ← proxy Next.js → FastAPI
└── app/sector/[id]/_components/
    └── SectorSignalsPanel.tsx          ← UI panel transversal
```

## Endpoints FastAPI

| Endpoint | Devuelve |
|----------|----------|
| `GET /api/v1/sectores/index` | SectoresIndex (todos · scores + alertas) |
| `GET /api/v1/sectores/{id}` | SectorReport completo |
| `GET /api/v1/sectores/{id}/kpis` | KPIs derivados (BOE, news, signals counts) |
| `GET /api/v1/sectores/{id}/actores` | Reguladores conocidos del sector |
| `GET /api/v1/sectores/{id}/eventos` | BOE + news del sector (filtros desde/hasta/tipo) |
| `GET /api/v1/sectores/{id}/signals` | Señales unificadas con scoring 0-100 |
| `GET /api/v1/sectores/taxonomy/list` | Metadata de los 9 sectores |
| `GET /api/v1/sectores/taxonomy/{id}` | Metadata del sector |
| `GET /api/v1/sectores/match/text?q=…` | Tagging automático texto → sectores |

Sectores soportados: `agro`, `banca`, `defensa`, `energia`, `farma`,
`infraestructuras`, `telecom`, `turismo`, `vivienda`.

## Schema SectorReport

Coincide 1:1 con `apps/visual-oscar/types/sectores.ts`:

```ts
interface SectorReport {
  sector_id: string
  generado_en: string                 // ISO 8601
  score: ScoreSectorial               // { score_riesgo, score_actividad_legislativa, ... }
  kpis: KPISectorial[]
  actores: ActorSectorial[]
  eventos_recientes: EventoSectorial[]
  iniciativas_legislativas_ids: string[]
  alertas: string[]
  resumen_ia?: string
}
```

## Fuentes de datos

| Fuente | Cómo se usa | Disponibilidad |
|--------|-------------|----------------|
| BOE | `dashboard.services.legislative_core.cargar_boe_reciente` filtra por keywords | Requiere Postgres con tabla `legal_items` |
| Google News + prensa ES | feedparser sobre `news.google.com/rss/search` | Always-on (red abierta) |
| Economy Core | `dashboard.services.economy_core.cargar_sectorial_risk` | Requiere data warehouse |

Todas las fuentes son opcionales — el builder degrada con gracia y
devuelve un `SectorReport` con score 0 cuando todo falla.

## Scoring

```python
score_actividad_legislativa = min(100, len(boe) * 100 / 30)
news_score = min(100, len(news) * 100 / 50)
signals_score = mean(severity) * 20  # severity 0-5 → 0-100
score_riesgo = 0.4 * news_score + 0.6 * signals_score
score_volatilidad = abs(news_score - actividad_legislativa) / 2
```

Niveles: `critico` ≥ 75 · `alto` ≥ 50 · `medio` ≥ 25 · `bajo` < 25.

## Frontend · panel SectorSignalsPanel

Renderizado en `/sector/[id]` debajo de SectorIniciativas. Muestra
hasta 20 señales recientes con:
- Badge de dominio (REGUL · POLÍT · NARRAT · CONTR · GEOPOL · REPUT)
- Título con link a la fuente original
- Score 0-100 + barra visual coloreada
- Fuente (BOE / google_news / …) + fecha relativa

## Coexistencia con router legacy `/api/sectors`

El router legacy `api/routers/sectors.py` (inglés, sin `/v1`) sigue
funcionando para compatibilidad con páginas viejas. El nuevo router
`api/routers/sectores.py` (español, con `/v1`) es la fuente de verdad
para el módulo unificado consumido por `/sector/[id]`.

## Tests

```bash
.venv/bin/pytest tests/test_brain/test_sectorial_intel.py -v
```

8 tests · 100 % pasan · cubre taxonomía, builder, signals, index, y
rutas del router.

## Roadmap

- [ ] Persistencia Postgres del SectorReport (cache 5min como las fichas)
- [ ] CPV-aware: filtrar contratos PLACSP por prefijos CPV del sector
- [ ] Pipeline LLM para `resumen_ia` con Groq (similar a fichas territoriales)
- [ ] Backfill nocturno GitHub Actions equivalente a fichas-backfill.yml
- [ ] Signals scoring real (D'Hondt-style attention model)
