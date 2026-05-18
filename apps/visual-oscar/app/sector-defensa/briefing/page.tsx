'use client'
/**
 * /sector-defensa/briefing
 * Agregador en vivo de 8 medios especializados de defensa.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'

interface ArticuloDefensa {
  id: string; titulo: string; url: string; medio_id: string; medio_nombre: string; medio_color: string
  pais_origen_medio: string; fecha: string | null; excerpt: string
  dominios: string[]; paises_mencionados: string[]; tipo_contenido: string
  es_paywall: boolean; relevancia: number
}

interface BriefingResp {
  items: ArticuloDefensa[]
  agregado: { totalItems: number; porMedio: Record<string, number>; porDominio: Record<string, number>; porPais: Record<string, number>; porTipo: Record<string, number>; altaRelevancia: number }
  ts: string
}

const DOM_COLOR: Record<string, string> = {
  'aereo': '#0EA5E9', 'naval': '#1F4E8C', 'terrestre': '#5D4037', 'cyber': '#16A34A',
  'misiles': '#DC2626', 'espacial': '#7C3AED', 'drones': '#F97316', 'nuclear': '#7F1D1D',
  'industria': '#F59E0B', 'otros': '#9CA3AF',
}

export default function BriefingPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [data, setData] = useState<BriefingResp | null>(null)
  const [q, setQ] = useState('')
  const [domFilter, setDomFilter] = useState('todos')
  const [paisFilter, setPaisFilter] = useState('todos')
  const [minR, setMinR] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('limit', '120')
    if (q) params.set('q', q)
    if (domFilter !== 'todos') params.set('dom', domFilter)
    if (paisFilter !== 'todos') params.set('pais', paisFilter)
    if (minR > 0) params.set('minR', String(minR))
    const r = await fetch(`/api/defense/briefing?${params}`).then(r => r.ok ? r.json() : null).catch(() => null)
    setData(r); setLoading(false)
  }

  useEffect(() => { refresh() }, [domFilter, paisFilter, minR])

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
          DEFENSE INTELLIGENCE · BRIEFING ESPECIALIZADO
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
          Briefing medios especializados de defensa
        </h1>
        <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
          8 medios RSS en vivo · Infodefensa · Revista Ejércitos · Escudo Digital · Defense News · Breaking Defense · TWZ · EDA News · NATO Newsroom ·
          Clasificación automática por dominio (aéreo/naval/terrestre/cyber/misiles/espacial/drones/nuclear) + país + relevancia
        </p>
      </div>

      {/* KPIs */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          <KPI label="ARTÍCULOS HOY" value={String(data.agregado.totalItems)} color="#1d1d1f"/>
          <KPI label="ALTA RELEVANCIA" value={String(data.agregado.altaRelevancia)} color="#DC2626"/>
          <KPI label="MEDIOS ACTIVOS" value={String(Object.keys(data.agregado.porMedio).length)} color="#1F4E8C"/>
          <KPI label="DOMINIOS CUBIERTOS" value={String(Object.keys(data.agregado.porDominio).length)} color="#7C3AED"/>
          <KPI label="PAÍSES MENCIONADOS" value={String(Object.keys(data.agregado.porPais).length)} color="#16A34A"/>
        </div>
      )}

      {/* FILTROS */}
      <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 10 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>BUSCAR</p>
            <input type="text" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && refresh()}
              placeholder="Programa, equipo, contratista..."
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit' }}/>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>DOMINIO</p>
            <select value={domFilter} onChange={e => setDomFilter(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
              <option value="todos">Todos</option>
              <option value="aereo">Aéreo</option><option value="naval">Naval</option>
              <option value="terrestre">Terrestre</option><option value="cyber">Cyber</option>
              <option value="misiles">Misiles</option><option value="espacial">Espacial</option>
              <option value="drones">Drones</option><option value="nuclear">Nuclear</option>
              <option value="industria">Industria</option>
            </select>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>PAÍS</p>
            <select value={paisFilter} onChange={e => setPaisFilter(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
              <option value="todos">Todos</option>
              {['ES','US','GB','FR','DE','IT','PL','UA','RU','CN','IL','TR','SA','JP','KR'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>MIN RELEVANCIA</p>
            <select value={minR} onChange={e => setMinR(+e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
              <option value="0">0+</option><option value="50">50+</option>
              <option value="70">70+</option><option value="80">Alta (80+)</option>
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
          <div>
            <Panel title={`${data.items.length} artículos`} subtitle="Ordenados por fecha · click para abrir artículo original">
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.items.map(a => <ArtCard key={a.id} a={a}/>)}
              </ul>
              {loading && <p style={{ textAlign: 'center', padding: 16, color: '#6e6e73' }}>Cargando...</p>}
            </Panel>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Panel title="Por medio">
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(data.agregado.porMedio).sort((a, b) => b[1] - a[1]).map(([m, n]) => (
                  <li key={m} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                    <span style={{ color: '#1d1d1f' }}>{m}</span>
                    <span style={{ color: '#1F4E8C', fontWeight: 700 }}>{n}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Por dominio capacidad">
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {Object.entries(data.agregado.porDominio).sort((a, b) => b[1] - a[1]).map(([d, n]) => (
                  <li key={d} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 30px', gap: 6, alignItems: 'center', fontSize: 11 }}>
                    <span style={{ color: DOM_COLOR[d] || '#9CA3AF', fontWeight: 700, textTransform: 'capitalize' }}>{d}</span>
                    <div style={{ height: 6, background: '#F5F5F7', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(n / Math.max(...Object.values(data.agregado.porDominio))) * 100}%`, height: '100%', background: DOM_COLOR[d] || '#9CA3AF' }}/>
                    </div>
                    <span style={{ textAlign: 'right', fontWeight: 700, color: '#1d1d1f' }}>{n}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Por país mencionado">
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {Object.entries(data.agregado.porPais).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([p, n]) => (
                  <li key={p} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 6px', background: '#FAFAFA', borderRadius: 4 }}>
                    <span style={{ color: '#1d1d1f', fontFamily: 'monospace', fontWeight: 700 }}>{p}</span>
                    <span style={{ color: '#1F4E8C', fontWeight: 700 }}>{n}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}

function ArtCard({ a }: { a: ArticuloDefensa }) {
  const relColor = a.relevancia >= 80 ? '#DC2626' : a.relevancia >= 65 ? '#F97316' : '#9CA3AF'
  return (
    <li style={{ padding: 12, background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, borderLeft: `4px solid ${a.medio_color}` }}>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: a.medio_color, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{a.medio_nombre}</span>
        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#F5F5F7', color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{a.tipo_contenido}</span>
        {a.dominios.filter(d => d !== 'otros').slice(0, 3).map(d => (
          <span key={d} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${DOM_COLOR[d] || '#9CA3AF'}20`, color: DOM_COLOR[d] || '#9CA3AF', fontWeight: 700, textTransform: 'capitalize' }}>{d}</span>
        ))}
        {a.relevancia >= 80 && (
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: relColor, color: '#fff', fontWeight: 700 }}>Alta {a.relevancia}</span>
        )}
        {a.es_paywall && <span style={{ fontSize: 9, color: '#9CA3AF' }}>(paywall)</span>}
        {a.fecha && <span style={{ fontSize: 9.5, color: '#86868b' }}>{new Date(a.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
      </div>
      <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.4 }}>{a.titulo}</p>
      </a>
      {a.excerpt && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#3a3a3d', lineHeight: 1.5 }}>{a.excerpt}</p>}
      {a.paises_mencionados.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
          {a.paises_mencionados.map(p => (
            <span key={p} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#FAFAFA', color: '#3a3a3d', fontFamily: 'monospace', fontWeight: 700 }}>{p}</span>
          ))}
        </div>
      )}
    </li>
  )
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
