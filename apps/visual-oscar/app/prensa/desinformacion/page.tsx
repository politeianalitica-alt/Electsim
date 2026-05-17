'use client'
/**
 * /prensa/desinformacion
 *
 * Análisis de desinformación · feeds reales EFE Verifica + Newtral + Maldita.
 * Incluye:
 *   - Feed de fact-checks recientes con veredicto + alcance
 *   - Distribución por fuente + tipo de veredicto
 *   - Tendencias de tema (qué temas concentran más desinfo)
 *   - Actores negativamente afectados (ranking de víctimas de bulos)
 *   - Buscador y filtros
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import AppHeader from '../../_components/AppHeader'
import { Panel } from '@/components/SectorPanel'

interface FactCheck {
  id: string
  titulo: string
  afirmacion: string
  veredicto: string
  veredictoLabel: string
  descripcion: string
  fuente: string
  fuenteColor: string
  url: string
  fecha: string | null
  temas: string[]
  actoresAfectados: string[]
  alcanceEstimado: 'bajo' | 'medio' | 'alto' | 'viral'
}

interface DesinformacionReport {
  items: FactCheck[]
  agregado: {
    totalItems: number
    porFuente: Record<string, number>
    porVeredicto: Record<string, number>
    porTema: Array<{ tema: string; n: number }>
    actoresAfectados: Array<{ actor: string; n: number; veredictosNegativos: number }>
    alcanceViral: number
  }
  ts: string
}

const VEREDICTO_COLOR: Record<string, string> = {
  'bulo': '#7F1D1D',
  'engañoso': '#F97316',
  'sin_contexto': '#F59E0B',
  'parcialmente_cierto': '#0EA5E9',
  'cierto': '#16A34A',
  'sin_clasificar': '#9CA3AF',
}

const ALCANCE_COLOR: Record<string, string> = {
  'bajo': '#9CA3AF', 'medio': '#0EA5E9', 'alto': '#F97316', 'viral': '#DC2626',
}

export default function DesinformacionPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [data, setData] = useState<DesinformacionReport | null>(null)
  const [q, setQ] = useState('')
  const [vFilter, setVFilter] = useState<string>('todos')
  const [loading, setLoading] = useState(true)
  const [updated, setUpdated] = useState<Date | null>(null)

  const refresh = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('limit', '80')
    if (q) params.set('q', q)
    if (vFilter !== 'todos') params.set('v', vFilter)
    const r = await fetch(`/api/news/desinformacion?${params}`).then(r => r.ok ? r.json() : null).catch(() => null)
    setData(r); setLoading(false); setUpdated(new Date())
  }

  useEffect(() => { refresh() }, [vFilter])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* HERO */}
        <section style={{ background: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)', borderRadius: 18, padding: '28px 36px', marginBottom: 18, color: '#fff' }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', opacity: 0.85, textTransform: 'uppercase', margin: '0 0 6px' }}>
            INTELIGENCIA INFORMATIVA · DESINFORMACIÓN
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 8px', lineHeight: 1.05 }}>
            Observatorio de bulos y desinformación
          </h1>
          <p style={{ fontSize: 13.5, opacity: 0.92, margin: 0, lineHeight: 1.5 }}>
            Agregador en vivo de fact-checkers oficiales · EFE Verifica · Newtral · Maldita.es ·
            Análisis de patrones, temas y actores negativamente afectados por la desinformación.
            <span style={{ marginLeft: 8, opacity: 0.7 }}>{updated && `Última sync: ${updated.toLocaleTimeString('es-ES')}`}</span>
          </p>
        </section>

        {/* KPIs AGREGADOS */}
        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
            <KPI label="VERIFICACIONES" value={String(data.agregado.totalItems)} color="#1d1d1f"/>
            <KPI label="BULOS DETECTADOS" value={String(data.agregado.porVeredicto.bulo || 0)} color="#7F1D1D"/>
            <KPI label="ENGAÑOSOS" value={String(data.agregado.porVeredicto.engañoso || 0)} color="#F97316"/>
            <KPI label="SIN CONTEXTO" value={String(data.agregado.porVeredicto.sin_contexto || 0)} color="#F59E0B"/>
            <KPI label="VIRALIDAD ALTA" value={String(data.agregado.alcanceViral)} color="#DC2626"/>
          </div>
        )}

        {/* FILTROS */}
        <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>BUSCAR</p>
              <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && refresh()}
                placeholder="Bulo, tema, actor afectado (ej: PSOE, vacunas, inmigración)…"
                style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit' }}/>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>VEREDICTO</p>
              <select value={vFilter} onChange={e => setVFilter(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
                <option value="todos">Todos</option>
                <option value="bulo">Bulos</option>
                <option value="engañoso">Engañosos</option>
                <option value="sin_contexto">Sin contexto</option>
                <option value="parcialmente_cierto">Parcialmente cierto</option>
                <option value="cierto">Ciertos</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={refresh} style={{ width: '100%', padding: '8px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid #1d1d1f', background: '#1d1d1f', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
            {/* COLUMNA IZQUIERDA: Feed */}
            <div>
              <Panel title={`${data.items.length} verificaciones recientes`} subtitle="Fact-checks publicados por EFE Verifica, Newtral y Maldita en últimas 72-96 horas">
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.items.map(fc => (
                    <FactCheckCard key={fc.id} fc={fc}/>
                  ))}
                </ul>
                {loading && <p style={{ textAlign: 'center', padding: 16, color: '#6e6e73' }}>Cargando…</p>}
                {!loading && data.items.length === 0 && <p style={{ textAlign: 'center', padding: 16, color: '#9CA3AF' }}>Sin resultados</p>}
              </Panel>
            </div>

            {/* COLUMNA DERECHA: Análisis agregado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Por fuente */}
              <Panel title="Distribución por fuente">
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {Object.entries(data.agregado.porFuente).map(([fuente, n]) => {
                    const color = fuente === 'EFE Verifica' ? '#0EA5E9' : fuente === 'Newtral' ? '#7C3AED' : '#DC2626'
                    return (
                      <li key={fuente} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 30px', gap: 8, alignItems: 'center', fontSize: 11.5 }}>
                        <span style={{ color, fontWeight: 700 }}>{fuente}</span>
                        <div style={{ height: 8, background: '#F5F5F7', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${(n / data.agregado.totalItems) * 100}%`, height: '100%', background: color }}/>
                        </div>
                        <span style={{ textAlign: 'right', color: '#1d1d1f', fontWeight: 700 }}>{n}</span>
                      </li>
                    )
                  })}
                </ul>
              </Panel>

              {/* Por veredicto */}
              <Panel title="Distribución por veredicto">
                <div style={{ display: 'flex', height: 32, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                  {Object.entries(data.agregado.porVeredicto).sort((a, b) => b[1] - a[1]).map(([v, n]) => (
                    <div key={v} style={{ flex: n, background: VEREDICTO_COLOR[v] || '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 24 }} title={`${v}: ${n}`}>
                      {n > 2 && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{n}</span>}
                    </div>
                  ))}
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {Object.entries(data.agregado.porVeredicto).sort((a, b) => b[1] - a[1]).map(([v, n]) => (
                    <li key={v} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      <span style={{ width: 9, height: 9, background: VEREDICTO_COLOR[v] || '#9CA3AF', borderRadius: 2 }}/>
                      <span style={{ color: '#1d1d1f', flex: 1, textTransform: 'capitalize' }}>{v.replace(/_/g, ' ')}</span>
                      <span style={{ fontWeight: 700, color: VEREDICTO_COLOR[v] || '#9CA3AF' }}>{n}</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              {/* Temas dominantes */}
              <Panel title="Temas más afectados por desinformación">
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {data.agregado.porTema.slice(0, 10).map(t => (
                    <li key={t.tema} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 30px', gap: 6, alignItems: 'center', fontSize: 11.5 }}>
                      <span style={{ color: '#1d1d1f' }}>{t.tema}</span>
                      <div style={{ height: 6, background: '#F5F5F7', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(t.n / data.agregado.porTema[0].n) * 100}%`, height: '100%', background: '#DC2626' }}/>
                      </div>
                      <span style={{ textAlign: 'right', color: '#DC2626', fontWeight: 700 }}>{t.n}</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              {/* Actores afectados */}
              <Panel title="Quién es negativamente afectado" subtitle="Actores / colectivos mencionados en bulos y desinformación (ranking)">
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {data.agregado.actoresAfectados.slice(0, 12).map(a => {
                    const pctNeg = a.n > 0 ? (a.veredictosNegativos / a.n) * 100 : 0
                    return (
                      <li key={a.actor} style={{ padding: '6px 9px', background: '#FAFAFA', borderRadius: 6, borderLeft: `3px solid ${pctNeg > 70 ? '#7F1D1D' : pctNeg > 50 ? '#DC2626' : pctNeg > 30 ? '#F97316' : '#9CA3AF'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1d1d1f' }}>{a.actor}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#7F1D1D' }}>{a.veredictosNegativos}/{a.n}</span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
                          {pctNeg.toFixed(0)}% bulos/engañosos · {a.n} menciones totales
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </Panel>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function FactCheckCard({ fc }: { fc: FactCheck }) {
  const colorV = VEREDICTO_COLOR[fc.veredicto] || '#9CA3AF'
  const colorA = ALCANCE_COLOR[fc.alcanceEstimado] || '#9CA3AF'
  return (
    <li style={{ padding: 12, background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, borderLeft: `4px solid ${colorV}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: colorV, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {fc.veredictoLabel}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: fc.fuenteColor, color: '#fff', letterSpacing: '0.03em' }}>{fc.fuente}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: `${colorA}20`, color: colorA }}>Alcance {fc.alcanceEstimado}</span>
            {fc.fecha && <span style={{ fontSize: 9.5, color: '#86868b' }}>{new Date(fc.fecha).toLocaleDateString('es-ES')}</span>}
          </div>
          <a href={fc.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.4 }}>{fc.titulo}</p>
          </a>
        </div>
      </div>
      {fc.descripcion && (
        <p style={{ margin: '4px 0 6px', fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5 }}>{fc.descripcion}</p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
        {fc.temas.map(t => (
          <span key={t} style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 4, background: '#F5F5F7', color: '#3a3a3d' }}>{t}</span>
        ))}
        {fc.actoresAfectados.length > 0 && (
          <span style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 4, background: '#FFF1F2', color: '#7F1D1D', fontWeight: 600 }}>
            Afecta: {fc.actoresAfectados.slice(0, 2).join(', ')}{fc.actoresAfectados.length > 2 ? ` +${fc.actoresAfectados.length - 2}` : ''}
          </span>
        )}
      </div>
    </li>
  )
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
