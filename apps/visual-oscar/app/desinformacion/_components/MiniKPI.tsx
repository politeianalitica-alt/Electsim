interface MiniKPIProps { label: string; value: string; sub: string; color: string }

export function MiniKPI({ label, value, sub, color }: MiniKPIProps) {
  return (
 <div style={{ background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
        {sub && <span style={{ fontSize: 9, color: '#86868b', marginLeft: 1, fontWeight: 600 }}>{sub}</span>}
 </div>
 <div style={{ fontSize: 8.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 3 }}>
        {label}
 </div>
 </div>
  )
}
