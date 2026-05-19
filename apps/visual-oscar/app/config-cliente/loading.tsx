/**
 * /config-cliente · loading dimensionado (Pilar 5 VISION_2027)
 */
import { SkeletonLine, SkeletonCard } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ height: 56, borderBottom: '1px solid var(--color-hairline)', background: 'var(--color-surface)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 'calc(100vh - 56px)' }}>
        {/* Sidebar */}
        <aside style={{ padding: '20px 14px', borderRight: '1px solid var(--color-hairline)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: 6 }).map((_, group) => (
            <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SkeletonLine width="55%" height={9} />
              {Array.from({ length: 3 }).map((__, item) => (
                <SkeletonLine key={item} width="92%" height={11} />
              ))}
            </div>
          ))}
        </aside>
        {/* Main */}
        <main style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SkeletonLine width="30%" height={24} />
          <SkeletonLine width="60%" height={14} />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} rows={4} />
          ))}
        </main>
      </div>
    </div>
  )
}
