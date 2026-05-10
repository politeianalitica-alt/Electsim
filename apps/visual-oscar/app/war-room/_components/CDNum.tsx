export function CDNum({ n, label, big = false }: { n: number; label: string; big?: boolean }) {
  return (
    <div style={{ textAlign: 'center', minWidth: big ? 70 : 50 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: big ? 48 : 28, fontWeight: 700, lineHeight: 1, color: '#fff', letterSpacing: '-0.04em' }}>
        {String(n).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.6, marginTop: 6, color: '#fff' }}>
        {label}
      </div>
    </div>
  )
}
