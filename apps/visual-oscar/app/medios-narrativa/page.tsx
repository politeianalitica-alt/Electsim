'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useMediosNarrativa } from '@/hooks/narrativa/useMediosNarrativa'
import type { NarrativaMedio, FrameNarrativo } from '@/types/narrativa'

// ── tokens ──────────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)',
}
const INK1 = '#0f172a'
const INK2 = '#1f2937'
const INK3 = '#64748b'
const INK4 = '#94a3b8'

const LINEA_COLOR: Record<string, string> = {
  'Izquierda':        '#dc2626',
  'Centro-izquierda': '#f87171',
  'Centro':           '#94a3b8',
  'Centro-derecha':   '#60a5fa',
  'Derecha':          '#1d4ed8',
  'Independiente':    '#64748b',
}
const SENT_COLOR: Record<string, string> = {
  'Positivo': '#16a34a', 'Negativo': '#dc2626', 'Neutro': '#94a3b8', 'Mixto': '#f59e0b',
}

function ideologyPos(linea: string): number {
  // 0 = full left, 100 = full right
  if (linea === 'Izquierda') return 10
  if (linea === 'Centro-izquierda') return 30
  if (linea === 'Centro') return 50
  if (linea === 'Centro-derecha') return 70
  if (linea === 'Derecha') return 90
  return 50
}

// ── Ideological spectrum ────────────────────────────────────────────────────
function IdeologySpectrum({ medios }: { medios: NarrativaMedio[] }) {
  // group medios by ideology bin (5 bins)
  const bins = ['Izquierda', 'Centro-izquierda', 'Centro', 'Centro-derecha', 'Derecha']
  const grouped = bins.map(b => medios.filter(m => m.linea_editorial === b))

  return (
    <div style={{ ...CARD, padding: '22px 26px', marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: INK4, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 14 }}>
        Espectro ideológico
      </div>
      <div style={{ position: 'relative', height: 6, background: 'linear-gradient(90deg, #dc2626 0%, #f87171 25%, #94a3b8 50%, #60a5fa 75%, #1d4ed8 100%)', borderRadius: 3, marginBottom: 28 }}>
        <div style={{ position: 'absolute', top: -12, left: 0, fontSize: 9, color: INK3, fontWeight: 700, letterSpacing: '0.07em' }}>IZQ</div>
        <div style={{ position: 'absolute', top: -12, right: 0, fontSize: 9, color: INK3, fontWeight: 700, letterSpacing: '0.07em' }}>DER</div>
        {medios.map((m, i) => {
          const x = ideologyPos(m.linea_editorial)
          return (
            <div key={`${m.medio}-${i}`} title={`${m.medio} · ${m.linea_editorial}`}
              style={{
                position: 'absolute', left: `${x}%`, top: '50%', transform: 'translate(-50%, -50%)',
                width: 8, height: 8, borderRadius: '50%',
                background: LINEA_COLOR[m.linea_editorial] ?? INK4,
                border: '1.5px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, fontSize: 10, color: INK3 }}>
        {bins.map((b, i) => (
          <div key={b} style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: LINEA_COLOR[b], marginBottom: 2 }}>{b}</div>
            <div style={{ color: INK4, fontSize: 9 }}>{grouped[i].length} medios</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Medio card ──────────────────────────────────────────────────────────────
function MedioCard({ m }: { m: NarrativaMedio }) {
  return (
    <div style={{ ...CARD, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: LINEA_COLOR[m.linea_editorial] ?? INK4,
        }} />
        <h3 style={{ fontSize: 14, fontWeight: 700, color: INK1, margin: 0, flex: 1 }}>{m.medio}</h3>
        <span style={{
          background: 'rgba(0,0,0,0.05)', color: INK3, padding: '2px 7px',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', borderRadius: 4,
        }}>{m.tipo}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: LINEA_COLOR[m.linea_editorial] ?? INK4, fontWeight: 700 }}>
          {m.linea_editorial}
        </span>
        <span style={{ fontSize: 10, color: INK4 }}>·</span>
        <span style={{ fontSize: 10, color: SENT_COLOR[m.sentimiento] ?? INK4, fontWeight: 700 }}>
          {m.sentimiento}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: INK3, fontWeight: 700 }}>
          {m.menciones_semana} arts.
        </span>
      </div>
      <div style={{ fontSize: 12, color: INK2, lineHeight: 1.5, marginBottom: 8, minHeight: 32 }}>
        {m.titular_destacado === '—' ? <span style={{ color: INK4, fontStyle: 'italic' }}>Sin titular destacado</span> : m.titular_destacado}
      </div>
      {m.temas_principales.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {m.temas_principales.slice(0, 4).map((t, i) => (
            <span key={i} style={{
              fontSize: 9, padding: '2px 6px', borderRadius: 4,
              background: 'rgba(31,78,140,0.08)', color: '#1F4E8C', fontWeight: 600,
            }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Frame card ──────────────────────────────────────────────────────────────
function FrameCard({ f }: { f: FrameNarrativo }) {
  const tendIcon = f.tendencia === 'creciente' ? '▲' : f.tendencia === 'decreciente' ? '▼' : '●'
  const tendColor = f.tendencia === 'creciente' ? '#dc2626' : f.tendencia === 'decreciente' ? '#16a34a' : '#94a3b8'
  return (
    <div style={{ ...CARD, padding: '16px 18px', borderLeft: `4px solid ${f.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: INK1, margin: 0, flex: 1 }}>{f.nombre}</h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: tendColor }}>{tendIcon} {f.tendencia}</span>
      </div>
      <div style={{ position: 'relative', height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, marginBottom: 8 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(100, f.presencia_pct)}%`, background: f.color, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 10, color: INK4, marginBottom: 8, fontWeight: 700 }}>{f.presencia_pct}% de la cobertura</div>
      <div style={{ fontSize: 12, color: INK3, lineHeight: 1.5 }}>{f.descripcion}</div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function MediosNarrativaPage() {
  const router = useRouter()
  const { snapshot, loading } = useMediosNarrativa()
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const filteredMedios = useMemo(() => {
    if (!snapshot) return []
    return filter ? snapshot.medios.filter(m => m.linea_editorial === filter) : snapshot.medios
  }, [snapshot, filter])

  if (loading) {
    return (
      <div style={{ background: 'var(--bg, #f9fafb)', minHeight: '100vh' }}>
        <AppHeader />
        <div style={{ maxWidth: 1500, margin: '0 auto', padding: '80px 28px', textAlign: 'center', color: INK3, fontSize: 13 }}>
          Cargando análisis de medios y narrativa…
        </div>
      </div>
    )
  }
  if (!snapshot) {
    return (
      <div style={{ background: 'var(--bg, #f9fafb)', minHeight: '100vh' }}>
        <AppHeader />
        <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
          <div style={{ ...CARD, padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📰</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: INK1, margin: '0 0 8px' }}>Sin datos en este momento</h3>
            <p style={{ fontSize: 13, color: INK3 }}>Los conectores de prensa están sincronizando. Vuelve en unos minutos.</p>
          </div>
        </main>
      </div>
    )
  }

  const top10Medios = [...snapshot.medios].sort((a, b) => b.menciones_semana - a.menciones_semana).slice(0, 12)

  return (
    <div style={{ background: 'var(--bg, #f9fafb)', minHeight: '100vh', fontFamily: 'var(--font-body, -apple-system, system-ui, sans-serif)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        <header style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Narrativa pública · Medios
          </span>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0', color: INK1, fontFamily: 'var(--font-display, inherit)' }}>
            Monitor de Medios
          </h1>
          <div style={{ fontSize: 13, color: INK3 }}>
            <strong>{snapshot.medios.length} medios</strong> analizados ·{' '}
            <strong>{snapshot.frames.length} clusters narrativos</strong> · período {snapshot.periodo}
          </div>
        </header>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 22 }}>
          {[
            { label: 'Medios activos',     value: snapshot.medios.length, color: '#1F4E8C' },
            { label: 'Clusters narrativos', value: snapshot.frames.length, color: '#7c3aed' },
            { label: 'Términos calientes', value: snapshot.terminos_calientes.length, color: '#dc2626' },
            { label: 'Sentimiento neto',   value: (() => {
              if (snapshot.medios.length === 0) return '—'
              const pos = snapshot.medios.filter(m => m.sentimiento === 'Positivo').length
              const neg = snapshot.medios.filter(m => m.sentimiento === 'Negativo').length
              const score = ((pos - neg) / snapshot.medios.length * 100).toFixed(0)
              return Number(score) >= 0 ? `+${score}` : score
            })(), color: '#16a34a' },
          ].map(k => (
            <div key={k.label} style={{ ...CARD, padding: '14px 18px' }}>
              <div style={{ fontSize: 9, color: INK4, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: k.color, letterSpacing: '-0.03em' }}>{k.value}</div>
            </div>
          ))}
        </div>

        <IdeologySpectrum medios={snapshot.medios} />

        {/* Hot terms */}
        {snapshot.terminos_calientes.length > 0 && (
          <div style={{ ...CARD, padding: '18px 22px', marginBottom: 22 }}>
            <div style={{ fontSize: 10, color: INK4, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 12 }}>
              Términos / actores más mencionados
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {snapshot.terminos_calientes.map((t, i) => (
                <div key={t.termino} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: i < 3 ? 'rgba(31,78,140,0.1)' : 'rgba(0,0,0,0.04)',
                  border: i < 3 ? '1px solid rgba(31,78,140,0.2)' : '1px solid rgba(0,0,0,0.08)',
                  padding: '5px 12px', borderRadius: 999,
                  fontSize: 12, fontWeight: 700, color: i < 3 ? '#1F4E8C' : INK2,
                }}>
                  {t.termino}
                  <span style={{ fontSize: 9, color: INK4, fontWeight: 600 }}>{t.volumen}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Narrative frames */}
        {snapshot.frames.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: INK4, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Clusters narrativos · {snapshot.frames.length} categorías
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {snapshot.frames.map(f => <FrameCard key={f.id} f={f} />)}
            </div>
          </section>
        )}

        {/* Medios grid with filter */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10, gap: 10 }}>
            <div style={{ fontSize: 11, color: INK4, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Medios por línea editorial
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setFilter(null)} style={{
                border: !filter ? '1px solid #1F4E8C' : '1px solid rgba(0,0,0,0.1)',
                background: !filter ? '#1F4E8C' : 'white',
                color: !filter ? 'white' : INK3,
                borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Todos</button>
              {Object.keys(LINEA_COLOR).map(linea => (
                <button key={linea} onClick={() => setFilter(linea)} style={{
                  border: filter === linea ? `1px solid ${LINEA_COLOR[linea]}` : '1px solid rgba(0,0,0,0.1)',
                  background: filter === linea ? LINEA_COLOR[linea] : 'white',
                  color: filter === linea ? 'white' : LINEA_COLOR[linea],
                  borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{linea}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {filteredMedios.map(m => <MedioCard key={m.medio} m={m} />)}
          </div>
        </section>

        {/* Top medios by volume */}
        <section style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, color: INK4, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Top medios por volumen reciente
          </div>
          <div style={{ ...CARD, padding: '14px 18px' }}>
            {top10Medios.map((m, i) => (
              <div key={m.medio} style={{
                display: 'grid', gridTemplateColumns: '24px 1fr 110px 60px 70px',
                gap: 10, alignItems: 'center', padding: '8px 0',
                borderBottom: i < top10Medios.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              }}>
                <span style={{ fontSize: 10, color: INK4, fontWeight: 700 }}>{i + 1}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: INK1 }}>{m.medio}</span>
                <span style={{ fontSize: 10, color: LINEA_COLOR[m.linea_editorial] ?? INK4, fontWeight: 700 }}>{m.linea_editorial}</span>
                <span style={{ fontSize: 10, color: SENT_COLOR[m.sentimiento] ?? INK4, fontWeight: 700 }}>{m.sentimiento}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: INK2, textAlign: 'right' }}>{m.menciones_semana}</span>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}
