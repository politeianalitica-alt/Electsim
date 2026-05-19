/**
 * /competidores · loading dimensionado (Pilar 5 VISION_2027)
 */
import { SkeletonLine, SkeletonCard, SkeletonGrid } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ height: 56, borderBottom: '1px solid var(--color-hairline)', background: 'var(--color-surface)' }} />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '28px 36px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Hero competidores · 4 KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, padding: 28, borderRadius: 16, border: '1px solid var(--color-hairline)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SkeletonLine width="35%" height={11} />
            <SkeletonLine width="80%" height={28} />
            <SkeletonLine width="60%" height={12} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} rows={1} />
            ))}
          </div>
        </div>
        {/* Selector grid · 8 cards */}
        <SkeletonGrid count={8} columns={4} />
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLine key={i} width={100} height={32} />
          ))}
        </div>
        {/* Section card */}
        <SkeletonCard rows={5} />
      </main>
    </div>
  )
}
