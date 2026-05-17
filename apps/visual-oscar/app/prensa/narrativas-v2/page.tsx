'use client'
/**
 * /prensa/narrativas-v2
 *
 * Framework multidimensional de narrativas mediáticas.
 * Cada narrativa se descompone en 6 dimensiones:
 *   1. Tema · 2. Actores · 3. Frame · 4. Emoción · 5. Evidencia · 6. Persistencia
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import AppHeader from '../../_components/AppHeader'
import { Panel } from '@/components/SectorPanel'

interface ActorDetectado { nombre: string; tipo: string; menciones: number; sentimientoMedio: number }
interface NarrativaV2 {
  id: string; tema: string; subtemas: string[]; actores: ActorDetectado[]
  frameDominante: string; framesSecundarios: string[]
  emocionDominante: string; emocionesSecundarias: string[]
  tipoEvidenciaDominante: string; fuentesCitadas: string[]
  fuerza: number; diasActiva: number; crescendo: number; polarizacion: number
  sentimientoMedio: number; tono: string
  color: string; ejemplos: Array<{ titulo: string; medio: string; url: string; fecha: string | null }>
  mediosCubriendo: string[]
}

const FRAME_COLOR: Record<string, string> = {
  'conflicto': '#DC2626', 'responsabilidad': '#F97316', 'consecuencias económicas': '#0F766E',
  'moralidad': '#7C3AED', 'interés humano': '#0EA5E9', 'estratégico': '#5D4037',
}
const EMOCION_COLOR: Record<string, string> = {
  'ira': '#DC2626', 'miedo': '#F59E0B', 'esperanza': '#16A34A', 'desprecio': '#7F1D1D',
  'orgullo': '#7C3AED', 'tristeza': '#0EA5E9', 'neutral': '#9CA3AF',
}
const ACTOR_TIPO_COLOR: Record<string, string> = {
  'protagonista': '#1F4E8C', 'antagonista': '#DC2626', 'víctima': '#7C3AED',
  'observador': '#9CA3AF', 'institución': '#0F766E', 'colectivo': '#F97316',
}

export default function NarrativasV2Page() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [narrativas, setNarrativas] = useState<NarrativaV2[]>([])
  const [totalArt, setTotalArt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState(168)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/news/narrativas-v2?max=10&hours=${hours}&sources=50`)
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(d => {
        if (d) { setNarrativas(d.narrativas || []); setTotalArt(d.totalArticulos || 0) }
        setLoading(false)
      })
  }, [hours])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* HERO */}
        <section style={{ background: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)', borderRadius: 18, padding: '28px 36px', marginBottom: 18, color: '#fff' }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', opacity: 0.85, textTransform: 'uppercase', margin: '0 0 6px' }}>
            INTELIGENCIA INFORMATIVA · NARRATIVAS V2
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 8px', lineHeight: 1.05 }}>
            Análisis multidimensional de narrativas
          </h1>
          <p style={{ fontSize: 13, opacity: 0.92, margin: 0, lineHeight: 1.5 }}>
            Framework de 6 dimensiones (tema + actores + frame + emoción + evidencia + persistencia) ·
            Cluster TF-IDF sobre {totalArt} artículos · Identificación NER de actores · Clasificación Iyengar/Entman
          </p>
        </section>

        {/* CONTROLES */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[72, 168, 336, 720].map(h => (
            <button key={h} onClick={() => setHours(h)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                       border: '1px solid', borderColor: hours === h ? '#7C3AED' : '#DDDDE3',
                       background: hours === h ? '#7C3AED' : '#fff', color: hours === h ? '#fff' : '#3a3a3d',
                       cursor: 'pointer', fontFamily: 'inherit' }}>
              {h === 72 ? '3 días' : h === 168 ? '7 días' : h === 336 ? '14 días' : '30 días'}
            </button>
          ))}
        </div>

        {/* MARCO TEÓRICO */}
        <Panel title="Marco teórico · qué es una narrativa" subtitle="Las narrativas mediáticas se descomponen en 6 dimensiones interdependientes" marginBottom>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {[
              { n: '1', titulo: 'TEMA', d: 'Asunto principal (vivienda, justicia...)', color: '#1F4E8C' },
              { n: '2', titulo: 'ACTORES', d: 'Protagonistas vs antagonistas + víctimas', color: '#7C3AED' },
              { n: '3', titulo: 'FRAME', d: 'Marco interpretativo (Iyengar/Entman)', color: '#F97316' },
              { n: '4', titulo: 'EMOCIÓN', d: 'Registro afectivo dominante (ira, miedo...)', color: '#DC2626' },
              { n: '5', titulo: 'EVIDENCIA', d: 'Tipo de soporte (datos, declaración, opinión)', color: '#0F766E' },
              { n: '6', titulo: 'PERSISTENCIA', d: 'Duración + crescendo + polarización', color: '#5D4037' },
            ].map(d => (
              <div key={d.n} style={{ padding: 10, background: `${d.color}10`, borderLeft: `3px solid ${d.color}`, borderRadius: 6 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: d.color, fontFamily: 'var(--font-display)' }}>{d.n}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 700, color: '#1d1d1f', letterSpacing: '0.05em' }}>{d.titulo}</p>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#3a3a3d', lineHeight: 1.3 }}>{d.d}</p>
              </div>
            ))}
          </div>
        </Panel>

        {loading && <p style={{ textAlign: 'center', padding: 32, color: '#6e6e73' }}>Cargando narrativas… (consultando 50 medios RSS)</p>}

        {/* NARRATIVAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {narrativas.map((n, i) => <NarrativaCard key={n.id} n={n} rank={i + 1}/>)}
        </div>

        {!loading && narrativas.length === 0 && (
          <p style={{ textAlign: 'center', padding: 32, color: '#9CA3AF', fontSize: 12 }}>
            Sin narrativas suficientes en el periodo. Aumenta la ventana temporal.
          </p>
        )}
      </main>
    </div>
  )
}

function NarrativaCard({ n, rank }: { n: NarrativaV2; rank: number }) {
  const tonoColor = n.tono === 'positivo' ? '#16A34A' : n.tono === 'negativo' ? '#DC2626' : n.tono === 'polarizado' ? '#F59E0B' : '#9CA3AF'

  return (
    <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: 18, borderLeft: `5px solid ${n.color}` }}>
      {/* HEADER */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: n.color, fontFamily: 'var(--font-display)' }}>#{rank}</span>
            <p style={{ margin: 0, fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>TEMA</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>{n.tema}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {n.subtemas.map(s => (
              <span key={s} style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 999, background: `${n.color}15`, color: n.color, fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Metric label="FUERZA" value={String(n.fuerza)} color="#1d1d1f" sub="artículos"/>
          <Metric label="DÍAS" value={String(n.diasActiva)} color="#1F4E8C"/>
          <Metric label="CRESC" value={n.crescendo > 1 ? `+${n.crescendo}x` : `${n.crescendo}x`} color={n.crescendo > 1.5 ? '#16A34A' : n.crescendo < 0.7 ? '#DC2626' : '#9CA3AF'}/>
          <Metric label="POLAR" value={`${(n.polarizacion * 100).toFixed(0)}%`} color={n.polarizacion > 0.5 ? '#F59E0B' : '#9CA3AF'}/>
        </div>
      </div>

      {/* 6 DIMENSIONES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        {/* Frame */}
        <DimensionCard titulo="FRAME (marco)" color={FRAME_COLOR[n.frameDominante] || '#525258'}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{n.frameDominante}</span>
          {n.framesSecundarios.length > 0 && (
            <p style={{ margin: '3px 0 0', fontSize: 10, color: '#6e6e73' }}>
              Sec.: {n.framesSecundarios.join(', ')}
            </p>
          )}
        </DimensionCard>

        {/* Emoción */}
        <DimensionCard titulo="EMOCIÓN" color={EMOCION_COLOR[n.emocionDominante] || '#525258'}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{n.emocionDominante}</span>
          {n.emocionesSecundarias.length > 0 && (
            <p style={{ margin: '3px 0 0', fontSize: 10, color: '#6e6e73' }}>
              + {n.emocionesSecundarias.join(', ')}
            </p>
          )}
        </DimensionCard>

        {/* Evidencia */}
        <DimensionCard titulo="EVIDENCIA" color="#0F766E">
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{n.tipoEvidenciaDominante}</span>
          {n.fuentesCitadas.length > 0 && (
            <p style={{ margin: '3px 0 0', fontSize: 10, color: '#6e6e73' }}>
              Fuentes: {n.fuentesCitadas.slice(0, 3).join(', ')}
            </p>
          )}
        </DimensionCard>
      </div>

      {/* ACTORES */}
      {n.actores.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 6px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>ACTORES DETECTADOS</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {n.actores.map(a => {
              const tipoColor = ACTOR_TIPO_COLOR[a.tipo] || '#525258'
              const sentColor = a.sentimientoMedio > 0.15 ? '#16A34A' : a.sentimientoMedio < -0.15 ? '#DC2626' : '#9CA3AF'
              return (
                <div key={a.nombre} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', background: `${tipoColor}10`, borderRadius: 999, border: `1px solid ${tipoColor}30` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: tipoColor }}>{a.nombre}</span>
                  <span style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase' }}>{a.tipo}</span>
                  <span style={{ fontSize: 9, color: '#6e6e73' }}>·</span>
                  <span style={{ fontSize: 9, color: sentColor, fontWeight: 700 }}>{a.sentimientoMedio > 0 ? '+' : ''}{a.sentimientoMedio}</span>
                  <span style={{ fontSize: 9, color: '#9CA3AF' }}>{a.menciones}m</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TONO + EJEMPLOS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 12, paddingTop: 10, borderTop: '1px dashed #ECECEF' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>TONO + COBERTURA</p>
          <span style={{ fontSize: 12, fontWeight: 700, color: tonoColor, textTransform: 'capitalize' }}>
            {n.tono} · {n.sentimientoMedio > 0 ? '+' : ''}{n.sentimientoMedio.toFixed(2)}
          </span>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#3a3a3d' }}>
            <strong>{n.mediosCubriendo.length}</strong> medios cubriendo:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
            {n.mediosCubriendo.slice(0, 8).map(m => (
              <span key={m} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#F5F5F7', color: '#3a3a3d' }}>{m}</span>
            ))}
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>EJEMPLOS REPRESENTATIVOS</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {n.ejemplos.map((e, i) => (
              <li key={i} style={{ fontSize: 11, lineHeight: 1.4 }}>
                <a href={e.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 600 }}>{e.titulo}</a>
                <span style={{ color: '#6e6e73', fontSize: 10 }}> · {e.medio}{e.fecha ? ` · ${new Date(e.fecha).toLocaleDateString('es-ES')}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function DimensionCard({ titulo, color, children }: { titulo: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 10, background: '#FAFAFA', borderRadius: 8, borderTop: `2px solid ${color}` }}>
      <p style={{ margin: '0 0 4px', fontSize: 9, color, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{titulo}</p>
      <div style={{ color: '#1d1d1f' }}>{children}</div>
    </div>
  )
}

function Metric({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ padding: '5px 9px', background: '#FAFAFA', borderRadius: 6, textAlign: 'center', minWidth: 50 }}>
      <p style={{ margin: 0, fontSize: 8, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 8, color: '#9CA3AF' }}>{sub}</p>}
    </div>
  )
}
