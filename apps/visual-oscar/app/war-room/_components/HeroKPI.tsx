export function HeroKPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '9px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: `1px solid ${accent}55` }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, lineHeight: 1, color: '#fff', letterSpacing: '-0.018em' }}>
        {value}
      </div>
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.75, marginTop: 4, color: accent }}>
        {label}
      </div>
    </div>
  )
}
