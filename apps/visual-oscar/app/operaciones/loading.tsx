/**
 * /operaciones · loading dimensionado (Pilar 5 VISION_2027)
 */
import { SkeletonLine, SkeletonCard, SkeletonGrid } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ height: 56, borderBottom: '1px solid var(--color-hairline)', background: 'var(--color-surface)' }} />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '28px 36px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Command bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonLine width="22%" height={11} />
            <SkeletonLine width="50%" height={22} />
          </div>
          <SkeletonLine width={180} height={36} />
        </div>
        {/* Metric strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} rows={2} />
          ))}
        </div>
        {/* Atajos grid */}
        <SkeletonGrid count={6} columns={3} />
      </main>
    </div>
  )
}
