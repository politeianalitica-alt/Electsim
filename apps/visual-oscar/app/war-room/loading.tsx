/**
 * /war-room · loading dimensionado (Pilar 5 VISION_2027)
 *
 * Esqueleto que ocupa el espacio real del Command Center con sidebar
 * y vista central. No es un spinner — es un placeholder que evita
 * el "salto" cuando los datos llegan.
 */
import { SkeletonLine, SkeletonCard, SkeletonGrid } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Top header placeholder (matches AppHeader 56px) */}
      <div style={{ height: 56, borderBottom: '1px solid var(--color-hairline)', background: 'var(--color-surface)' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 0, minHeight: 'calc(100vh - 56px)' }}>
        {/* Sidebar placeholder */}
        <aside style={{ padding: '20px 14px', borderRight: '1px solid var(--color-hairline)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: 7 }).map((_, group) => (
            <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SkeletonLine width="60%" height={9} />
              {Array.from({ length: 3 }).map((__, item) => (
                <SkeletonLine key={item} width="90%" height={11} />
              ))}
            </div>
          ))}
        </aside>

        {/* Main central content placeholder */}
        <main style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Hero · 5 KPIs strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} rows={2} />
            ))}
          </div>
          {/* Section title */}
          <SkeletonLine width="40%" height={20} />
          {/* Card grid */}
          <SkeletonGrid count={6} columns={3} />
        </main>
      </div>
    </div>
  )
}
