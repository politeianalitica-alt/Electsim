// Stub creado durante merge Visual_Oscar → main · 21 may 2026.
// Original a subir por el socio en commit fa682e8 — nunca llegó al repo.

export function MiniKPI({ label, value, delta, color }: { label: string; value: string | number; delta?: string; color?: string }) {
  return (
    <div style={{ padding: '8px 12px', background: '#FAFAFB', borderRadius: 8, border: '1px solid #ECECEF' }}>
      <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display, inherit)', fontSize: 18, fontWeight: 700, color: color || '#1d1d1f', marginTop: 2 }}>{value}</div>
      {delta && <div style={{ fontSize: 11, color: color || '#6e6e73', marginTop: 2 }}>{delta}</div>}
    </div>
  )
}
