'use client'
/**
 * Card de posicionamiento estratégico · score 0-100 con factores ponderados.
 */
import type { PosicionamientoDefensa } from '@/lib/defense/analisis-defensa'

export function PosicionamientoCard({ pos }: { pos: PosicionamientoDefensa }) {
  const colorBanda = pos.banda === 'líder' ? '#16A34A'
                   : pos.banda === 'avanzado' ? '#0EA5E9'
                   : pos.banda === 'aceptable' ? '#F59E0B'
                   : pos.banda === 'rezagado' ? '#F97316'
                   : '#DC2626'

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18, alignItems: 'center', marginBottom: 14 }}>
        {/* Score circular */}
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <svg width={120} height={120} viewBox="0 0 120 120">
            <circle cx={60} cy={60} r={50} fill="none" stroke="#ECECEF" strokeWidth={10}/>
            <circle cx={60} cy={60} r={50} fill="none" stroke={colorBanda} strokeWidth={10}
              strokeDasharray={`${(pos.score / 100) * (2 * Math.PI * 50)} ${2 * Math.PI * 50}`}
              strokeDashoffset={2 * Math.PI * 50 * 0.25}
              transform={`rotate(-90 60 60)`}
              strokeLinecap="round"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: colorBanda, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{pos.score}</span>
            <span style={{ fontSize: 10, color: '#6e6e73', marginTop: 2 }}>/100</span>
          </div>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>POSICIONAMIENTO ESTRATÉGICO</p>
          <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: colorBanda, fontFamily: 'var(--font-display)', textTransform: 'capitalize' }}>{pos.banda}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5 }}>{pos.contextoEstrategico}</p>
        </div>
      </div>

      {/* Factores ponderados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 12 }}>
        {pos.factores.map((f, i) => {
          const cf = f.valor >= 80 ? '#16A34A' : f.valor >= 60 ? '#0EA5E9' : f.valor >= 40 ? '#F59E0B' : '#DC2626'
          return (
            <div key={i} style={{ padding: 8, background: '#FAFAFA', borderRadius: 6, border: '1px solid #ECECEF' }}>
              <p style={{ margin: 0, fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{f.nombre}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: cf, fontFamily: 'var(--font-display)' }}>{f.valor}</span>
                <span style={{ fontSize: 9, color: '#9CA3AF' }}>/100 · peso {f.peso}%</span>
              </div>
              <div style={{ height: 3, background: '#ECECEF', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ width: `${f.valor}%`, height: '100%', background: cf }}/>
              </div>
              <p style={{ margin: '5px 0 0', fontSize: 9.5, color: '#3a3a3d', lineHeight: 1.3 }}>{f.interpretacion}</p>
            </div>
          )
        })}
      </div>

      {/* Brechas + Oportunidades + Riesgos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div style={{ padding: 10, background: 'rgba(220,38,38,0.05)', borderRadius: 8, borderLeft: '3px solid #DC2626' }}>
          <p style={{ margin: 0, fontSize: 10, color: '#DC2626', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>⚠ BRECHAS CLAVE</p>
          <ul style={{ margin: '5px 0 0', paddingLeft: 16, fontSize: 11, color: '#1d1d1f', lineHeight: 1.5 }}>
            {pos.brechasClave.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
        <div style={{ padding: 10, background: 'rgba(22,163,74,0.05)', borderRadius: 8, borderLeft: '3px solid #16A34A' }}>
          <p style={{ margin: 0, fontSize: 10, color: '#16A34A', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>★ OPORTUNIDADES</p>
          <ul style={{ margin: '5px 0 0', paddingLeft: 16, fontSize: 11, color: '#1d1d1f', lineHeight: 1.5 }}>
            {pos.oportunidades.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
        <div style={{ padding: 10, background: 'rgba(124,58,237,0.05)', borderRadius: 8, borderLeft: '3px solid #7C3AED' }}>
          <p style={{ margin: 0, fontSize: 10, color: '#7C3AED', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>◉ PRIORIDADES</p>
          <ol style={{ margin: '5px 0 0', paddingLeft: 18, fontSize: 11, color: '#1d1d1f', lineHeight: 1.5 }}>
            {pos.prioridades.map((p, i) => <li key={i}>{p}</li>)}
          </ol>
        </div>
      </div>
    </div>
  )
}
