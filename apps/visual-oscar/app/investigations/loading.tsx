/**
 * /investigations · loading dimensionado (Pilar 5 VISION_2027)
 */
import { SkeletonLine, SkeletonCard } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ height: 56, borderBottom: '1px solid var(--color-hairline)', background: 'var(--color-surface)' }} />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 36px 64px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SkeletonLine width="35%" height={24} />
        <SkeletonLine width="55%" height={14} />
        {/* Cards list */}
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} rows={3} />
        ))}
      </main>
    </div>
  )
}
