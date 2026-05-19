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

| Archivo | Inline antes | Inline después | Reducción | Estado |
|---------|-------------:|---------------:|-----------|--------|
| `app/operaciones/page.tsx` | 50 | ~3 | -94% | ✅ Migrado |
| `app/competidores/page.tsx` | 304 | 126 | -58% | ✅ Migrado |
| `app/war-room/page.tsx` | 235 | 33 | -86% | ✅ Migrado |
| `app/geopolitica/page.tsx` | 223 | 57 | -74% | ✅ Migrado |
| `app/config-cliente/page.tsx` | 188 | 10 | -95% | ✅ Migrado |
| `app/instituciones/page.tsx` | 243 | — | — | ⏳ Pendiente (datos críticos) |

**Total Pilar 4 (top 5):** 1 000 inline → 229 (-77%). Los 229 restantes son
todos legítimamente dinámicos: colores por rol/estado/severidad/partido, width
porcentajes de progreso, conic-gradient angles, animaciones condicionales por
flags de runtime.

**CSS tokenizado generado:** 5 archivos `<route>.css` con ~600 clases prefijadas
(`.op-`, `.cm-`, `.wr-`, `.geo-`, `.cfg-`).

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
