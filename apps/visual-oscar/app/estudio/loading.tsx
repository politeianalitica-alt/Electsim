import Skeleton from '@/components/Skeleton'

export default function DomoLoading() {
  return (
 <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
 <Skeleton style={{ height: 32, width: 280, marginBottom: 8 }} />
 <Skeleton style={{ height: 18, width: 420, marginBottom: 32 }} />
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
 <Skeleton key={i} style={{ height: 96, borderRadius: 12 }} />
        ))}
 </div>
 </div>
  )
}
