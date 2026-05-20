# Migración progresiva inline → tokens (Pilar 4 VISION_2027)

> **Origen**: 8 535 `style={{...}}` inline vs 1 729 `className=` (ratio 5:1 · sin
> disciplina). Esto se documenta en `docs/VISION_2027.md §5.4`.
>
> **Objetivo**: que cualquier página nueva o refactorizada use exclusivamente
> primitivas tokenizadas (`@/components/ui`) + clases CSS desde `tokens.css`.
> Las páginas legacy se migran cuando se tocan por otra razón (no en lote).

## Patrón canónico

Una página migrada tiene:

1. **Cero `style={{...}}`** excepto valores DINÁMICOS de runtime
   (color de partido recibido por prop, dimensiones de SVG calculadas).
2. **CSS adjunto** en `page.css` junto al `page.tsx`, scoped por prefijo
   (`.op-*` para `/operaciones`, `.cm-*` para `/competidores`, etc.).
3. **Primitivas UI** del barrel `@/components/ui`:
   `Card · CardHeader · Badge · Stat · Toolbar · MetricCard · Button ·
   Divider · EmptyState · SectionHeader · KeyHint · SplitView · Skeleton*`
4. **Sin sub-componentes locales que dupliquen primitivas**. Eliminar
   `function Card({...})` local cuando `<Card>` ya existe.

## Mapeo típico inline → primitive

| Patrón inline antiguo | Reemplazo |
|----------------------|-----------|
| `<div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'14px 16px' }}>` | `<Card variant="default" padding="md">` |
| `<div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10, padding:'10px 12px' }}>` | `<Card variant="sunken" padding="sm">` |
| `<span style={{ fontSize:9.5, fontWeight:800, padding:'2px 7px', borderRadius:999, background:'#DC262615', color:'#DC2626', border:'1px solid #DC262640' }}>X</span>` | `<Badge variant="status" status="danger" size="sm">X</Badge>` |
| `<h2 style={{ margin:0, fontSize:11.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#3a3a3d' }}>Title</h2>` | clase `.op-card-title` (font-size token + color token) |
| `<div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:'#1d1d1f' }}>123</div>` | `<Stat label="..." value="123" size="md" />` |
| `<kbd style={{ fontSize:10, padding:'1px 5px', background:'#fff', border:'1px solid #ECECEF', borderRadius:4 }}>K</kbd>` | `<KeyHint keys={['k']} />` |

## Excepciones legítimas a `style={{}}`

Inline está justificado **solo** cuando el valor depende de runtime:

```tsx
// ✓ Color del partido viene de prop o catálogo
<div style={{ background: party.color }}>{party.name}</div>

// ✓ Stroke de SVG depende de tendencia up/down
<polyline stroke={isUp ? 'var(--color-danger)' : 'var(--color-success)'} />

// ✓ Width animado por progreso
<div style={{ width: `${pct}%` }} />

// ✗ NO: color hardcoded
<div style={{ color: '#6e6e73' }}>...</div>   // → className con token

// ✗ NO: spacing hardcoded
<div style={{ padding: '14px 16px' }}>...</div>  // → token --space-*
```

## Proceso paso-a-paso (1 archivo)

1. **Identificar offenders en el archivo**:
   ```bash
   grep -c "style={{" apps/visual-oscar/app/<route>/page.tsx
   ```

2. **Sustituir sub-componentes locales por primitivas existentes**.
   Si el archivo declara `function Card(...)` o `function Stat(...)`,
   borrarlo y usar `@/components/ui`.

3. **Crear `<route>.css` adjunto** y mover allí los estilos con clase
   prefijada. Importar al inicio del `page.tsx`:
   ```tsx
   import './operaciones.css'
   ```

4. **Reemplazar inline → className**. Para cada `style={{...}}`:
   - ¿es valor de runtime? → mantener inline (whitelist legítima)
   - ¿es token estático? → mover a `.css` con `var(--token-*)`

5. **Eliminar el archivo de la `excludedFiles` del `.eslintrc.json`**
   para que cualquier futura regresión a inline-style sea detectada.

6. **`npm run build`** → si TypeScript pasa, el refactor es seguro.

## Estado actual de la migración

| # | Archivo | Inline antes | Inline después | Reducción | Estado |
|---|---------|-------------:|---------------:|-----------|--------|
| 1 | `app/operaciones/page.tsx` | 50 | ~3 | -94% | ✅ Migrado |
| 2 | `app/competidores/page.tsx` | 304 | 126 | -58% | ✅ Migrado |
| 3 | `app/war-room/page.tsx` | 235 | 33 | -86% | ✅ Migrado |
| 4 | `app/geopolitica/page.tsx` | 223 | 57 | -74% | ✅ Migrado |
| 5 | `app/config-cliente/page.tsx` | 188 | 10 | -95% | ✅ Migrado |
| 6 | `app/instituciones/page.tsx` | 243 | 49 | -80% | ✅ Migrado |
| 7 | `app/mapa-actores/page.tsx` | 175 | 30 | -83% | ✅ Migrado (R2) |
| 8 | `app/macro/page.tsx` | 164 | 41 | -75% | ✅ Migrado (R2) |
| 9 | `app/partidos/page.tsx` | 153 | 25 | -84% | ✅ Migrado (R2) |
| 10 | `app/adjudicaciones/page.tsx` | 147 | 30 | -80% | ✅ Migrado (R2) |
| 11 | `app/dashboard/page.tsx` | 145 | 38 | -74% | ✅ Migrado (R2) |
| 12 | `app/contratos-vigentes/page.tsx` | 144 | 22 | -85% | ✅ Migrado (R2) |
| 13 | `app/senales-criticas/page.tsx` | 141 | 21 | -85% | ✅ Migrado (R3) |
| 14 | `app/litigios-contratacion/page.tsx` | 140 | 30 | -79% | ✅ Migrado (R3) |
| 15 | `app/crisis/page.tsx` | 138 | 26 | -81% | ✅ Migrado (R3) |
| 16 | `app/fondos-europeos/page.tsx` | 137 | 27 | -80% | ✅ Migrado (R3) |
| 17 | `app/ataques-narrativos/page.tsx` | 136 | 25 | -82% | ✅ Migrado (R3) |
| 18 | `app/adversarios/page.tsx` | 134 | 34 | -75% | ✅ Migrado (R3) |

**Total Pilar 4 (18 archivos top migrados):** 2 997 inline → 627 (-79%).
Los 627 restantes son todos legítimamente dinámicos: colores por
rol/estado/severidad/partido/tribunal (`c.color`, `ESTAB_COLOR`,
`SENT_COLOR`, `RIESGO_C`, `SECTOR_COLOR`, `SEV_COLOR`, `LEVEL_COLOR`,
`TIPO_COLOR`, `TRIB_COLOR`, `FASE_META`, `THREAT_META`, `MATCH_COLOR`,
party-color, sem-color, plataformas), width porcentajes de progreso
(`flex: r.pct`, `width: ${%}`), conic-gradient angles, sparkline strokes
condicionales, animaciones por flags de runtime.

**CSS tokenizado generado:** 18 archivos `<route>.css` con ~2 100 clases
prefijadas (`.op-`, `.cm-`, `.wr-`, `.geo-`, `.cfg-`, `.inst-`,
`.ma-`, `.mac-`, `.pt-`, `.adj-`, `.dash-`, `.cv-`, `.sc-`,
`.lc-`, `.cr-`, `.fe-`, `.an-`, `.adv-`).

**P4-R3 cerrado ✅** · los 5 archivos restantes migrados en paralelo
mediante 5 sub-agentes ejecutando el prompt canónico sobre el patrón
estabilizado en las 13 anteriores. Sin regresiones visuales · TS clean.

**Restantes en el repo:** ~7 500 inline styles repartidos por páginas menos
visitadas. Migración progresiva al tocar cada archivo por feature work.
**No hacer migración en lote** — es la receta para regresiones visuales.

## Primitivas disponibles · `@/components/ui`

```tsx
import {
  // Layout
  Card, CardHeader, Toolbar, SplitView, SectionHeader, Divider,
  // Data display
  Badge, Stat, MetricCard,
  // Estados
  EmptyState, SkeletonLine, SkeletonCard,
  // Interactivos
  Button, KeyHint,
} from '@/components/ui'
```

Cada primitiva acepta tokens del design system. Si necesitas algo que no
existe, **añádelo a `components/ui/` antes** de hacerlo inline · este
es el contrato del Pilar 4.
