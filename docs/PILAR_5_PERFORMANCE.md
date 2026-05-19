# Pilar 5 · Velocidad percibida + URL como estado

> Cierra el Pilar 5 de `docs/VISION_2027.md §4`. La diferencia entre
> "esta app se siente lenta" y "esta app es snappy" no se decide con
> microoptimizaciones — se decide con cuatro patrones aplicados con
> disciplina en las rutas más visitadas.

## Los cuatro patrones canónicos

### 1 · URL como estado · `useUrlState`

Cada filtro, tab activo, sección o vista temporal debe vivir en
`searchParams`. Esto habilita:

- **Compartir vistas concretas**: pegar un Slack `/war-room?section=crisis`
  abre exactamente esa sección.
- **Deep-linking desde briefings**: un párrafo de un INTSUM puede
  citar `/competidores?competidor=ferrovial&tab=pricing` y abre la
  vista exacta.
- **Persistencia tras refresh**: cerrar y abrir el navegador respeta
  el contexto del analista.

Hook canónico: `lib/useUrlState.ts`

```tsx
import { useUrlState, useUrlStateMulti } from '@/lib/useUrlState'

// Caso simple · una clave + un default
const [section, setSection] = useUrlState<SectionId>('section', 'dashboard')

// Caso múltiple · varios filtros que comparten URL
const [filters, patch] = useUrlStateMulti({ tab: 'all', sort: 'recent', period: '7d' })
patch({ tab: 'crisis' })   // → ?tab=crisis (sort y period se mantienen si difieren del default)
```

Implementación: usa `router.replace` con `scroll:false` (no `push`) para
no contaminar el history. Cuando el valor coincide con el default, se
**borra** del query string para mantener URLs limpias.

### 2 · `loading.tsx` con skeletons dimensionados

Cada ruta pesada tiene un `loading.tsx` adjunto que renderiza un
esqueleto **del tamaño exacto** del contenido que viene. No spinners
genéricos. El usuario nunca ve un layout que "salta" cuando los datos
llegan.

Primitivas disponibles en `@/components/ui/skeletons`:

```tsx
import {
  SkeletonLine,    // barra con shimmer (width × height)
  SkeletonCard,    // card con header + N rows
  SkeletonGrid,    // grid de N SkeletonCard
  SkeletonTable,   // tabla con N rows simulando columnas
  SkeletonChart,   // bloque rectangular animado (para gráficos)
} from '@/components/ui/skeletons'
```

Ejemplo (`app/war-room/loading.tsx`):

```tsx
export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ height: 56, /* matches AppHeader */ }} />
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr' }}>
        <aside>...sidebar 7 grupos × 3 items...</aside>
        <main>
          <div style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {/* 5 KPI cards · el mismo número que la página real */}
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} rows={2} />)}
          </div>
          <SkeletonGrid count={6} columns={3} />
        </main>
      </div>
    </div>
  )
}
```

**Regla**: el esqueleto debe ocupar el mismo nº de filas/columnas que el
contenido real. Si la página real tiene 5 KPIs, el esqueleto tiene 5
cards. Si tiene un sidebar de 260px, el esqueleto tiene un sidebar de
260px.

### 3 · Prefetch agresivo · `<Link>` por todas partes

Next.js 14 App Router prefetcha automáticamente cualquier `<Link>` que
entre en el viewport (en producción). El enemigo es `<a href="/ruta">`
para navegación interna: hace una recarga completa que tira al traste
toda la caché del cliente.

**Política**:
- Para navegación interna: **siempre** `<Link>`, nunca `<a>`.
- Para enlaces externos: `<a target="_blank" rel="noopener noreferrer">` es correcto.
- `prefetch={false}` solo si la ruta destino es muy pesada y la
  probabilidad de click es baja (p.ej. enlaces a dashboards de admin).

Auditoría: `grep -rln '<a href="/' apps/visual-oscar/app/` debe
devolver vacío para navegación interna (excepción: anchors `#fragment`).

### 4 · Optimistic UI en mutaciones críticas

Pendiente como mejora continua — aplicar cuando una mutación
(toggle de favorito, comentario, edición de bloque) genera latencia
visible:

```tsx
function toggleFavorito(id: string) {
  // 1. Actualiza UI inmediatamente
  setFavoritos(prev => ({ ...prev, [id]: !prev[id] }))
  // 2. Mutación al backend (no await)
  api.toggleFavorito(id).catch(() => {
    // 3. Rollback en caso de error
    setFavoritos(prev => ({ ...prev, [id]: !prev[id] }))
    toast.error('No se pudo guardar el favorito')
  })
}
```

## Aplicación en este sprint

| Ruta | URL state | loading.tsx | Notas |
|------|-----------|-------------|-------|
| `/war-room` | `?section=<id>` (20 secciones) | ✅ sidebar + 5 KPI strip + grid 3×2 | |
| `/config-cliente` | `?section=<id>` (17 secciones) | ✅ sidebar + 4 section cards | |
| `/geopolitica` | `?tab=<slug>` (teatro/alertas/osint/impacto/presencia/ia) | ✅ KPIs + tabbar + map + grid 3×3 | |
| `/competidores` | `?competidor=<id>&tab=<perfil\|winloss\|pricing\|historico>` | ✅ hero + grid selector + tabs | |
| `/operaciones` | — (vista única) | ✅ command bar + 5 metric strip + grid 3×2 | |
| `/investigations` | — (lista) | ✅ cards stack | |

## Antipatrones a evitar

- **`useState` para algo bookmarkable** → usa `useUrlState`.
- **Spinner genérico centrado** → siempre `loading.tsx` con skeletons dimensionados.
- **`<a href="/ruta">` para navegación interna** → siempre `<Link>`.
- **`router.push` para cambiar filtros** → usa `router.replace({ scroll: false })`.
- **Esqueleto con altura distinta al contenido real** → produce salto visual al cargar.

## Métricas de éxito

- LCP (Largest Contentful Paint) de las 6 rutas top < 1.2s en 4G simulada.
- CLS (Cumulative Layout Shift) ≈ 0 (los skeletons dimensionados garantizan esto).
- Tiempo entre click en `<Link>` y vista nueva visible < 200ms (prefetch hit).
- Compartir una URL siempre reproduce la vista exacta del emisor.

## Siguientes pasos (no en este sprint)

- **Optimistic UI** en mutaciones del workspace (canvas, docs, investigations).
- **Server Components agresivo**: migrar shells de las 5 páginas top a
  Server Components, dejando `'use client'` solo en los widgets
  interactivos. Reduce el JS shipped y mejora FCP.
- **View Transitions API** para animar el cambio entre vistas pesadas.
- **Audit con Lighthouse** en CI bloqueando merges con regresión > 5%
  sobre la baseline.
