export function SKpi({ label, value, sub, delta, deltaPos, color, big = false }: {
  label: string; value: string; sub?: string; delta?: string; deltaPos?: boolean; color: string; big?: boolean
}) {
  return (
 <div style={{ background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 10, padding: big ? '12px 14px' : '10px 12px' }}>
 <div style={{ fontSize: 9, fontWeight: 800, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
 <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 3 }}>
 <span style={{ fontFamily: 'var(--font-display)', fontSize: big ? 24 : 18, fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</span>
        {sub && <span style={{ fontSize: 10, color: '#86868b', fontWeight: 600 }}>{sub}</span>}
 </div>
      {delta && (
 <div style={{ fontSize: 10, fontWeight: 700, color: deltaPos ? '#16A34A' : '#DC2626', marginTop: 3 }}>
          {deltaPos ? '▲' : '▼'} {delta}
 </div>
      )}
 </div>
  )
}
