/**
 * /geopolitica · loading dimensionado (Pilar 5 VISION_2027)
 *
 * Esqueleto · hero KPIs + tabbar + grid de countries. Espacio real,
 * sin spinner genérico.
 */
import { SkeletonLine, SkeletonCard, SkeletonGrid, SkeletonChart } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ height: 56, borderBottom: '1px solid var(--color-hairline)', background: 'var(--color-surface)' }} />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '28px 36px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Hero · 4 KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} rows={2} />
          ))}
        </div>
        {/* Tabbar */}
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLine key={i} width={120} height={32} />
          ))}
        </div>
        {/* World map placeholder */}
        <SkeletonChart height={320} />
        {/* Country grid */}
        <SkeletonGrid count={9} columns={3} />
      </main>
    </div>
  )
}
