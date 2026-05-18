'use client'
/**
 * /sector-defensa/grupos-trabajo
 * CapTechs EDA + Comités OTAN + STO RTGs + OSCE FSC + Eventos + Calls
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import grupos from '@/data/defense/grupos-trabajo.json'

interface CapTech { id: string; nombre: string; dominio: string; relevancia_es: string; descripcion: string; actividades_2026?: string[] }
interface ComiteOtan { id: string; nombre: string; tipo: string; descripcion: string; url?: string }
interface STOGroup { id: string; nombre: string; panel: string; estado: string; duracion: string }
interface OSCEForo { id: string; nombre: string; descripcion: string; url?: string }
interface Evento { id: string; nombre: string; tipo: string; fecha: string; ubicacion: string; organizador: string; url?: string; descripcion: string; publico: string; relevancia: string }
interface Call { id: string; nombre: string; organizador: string; tipo: string; fecha_apertura: string; fecha_cierre: string; cuantia_total_M?: number; url?: string; descripcion: string; elegibles_es?: string[]; relevancia: string }

const RELEV_COLOR: Record<string, string> = {
  'muy_alta': '#7F1D1D', 'alta': '#DC2626', 'media': '#F97316', 'baja': '#9CA3AF',
}

type SubTab = 'eventos' | 'calls' | 'captechs' | 'otan' | 'sto' | 'osce'

export default function GruposPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<SubTab>('eventos')

  const data = grupos as {
    _meta: Record<string, string>
    captechs_eda: CapTech[]
    comites_otan: ComiteOtan[]
    sto_rtg: STOGroup[]
    osce_foros: OSCEForo[]
    eventos_2026: Evento[]
    calls_activas: Call[]
  }

  // Stats
  const stats = {
    captechs: data.captechs_eda.length,
    comites: data.comites_otan.length + data.sto_rtg.length + data.osce_foros.length,
    eventos: data.eventos_2026.length,
    calls: data.calls_activas.length,
    cuantia_calls_M: data.calls_activas.reduce((s, c) => s + (c.cuantia_total_M || 0), 0),
  }

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
          DEFENSE INTELLIGENCE · GRUPOS DE TRABAJO + EVENTOS + CALLS
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
          Inteligencia institucional pre-licitación
        </h1>
        <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
          {stats.captechs} CapTechs EDA · {stats.comites} grupos OTAN/OSCE · {stats.eventos} eventos confirmados 2026 · {stats.calls} convocatorias activas · {(stats.cuantia_calls_M / 1000).toFixed(1)} bn$ en juego
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        <KPI label="CAPTECHS EDA" value={String(stats.captechs)} color="#1F4E8C"/>
        <KPI label="COMITÉS OTAN/OSCE" value={String(stats.comites)} color="#5D4037"/>
        <KPI label="EVENTOS 2026" value={String(stats.eventos)} color="#F97316"/>
        <KPI label="CALLS ACTIVAS" value={String(stats.calls)} color="#16A34A"/>
        <KPI label="CUANTÍA EN JUEGO" value={`${(stats.cuantia_calls_M / 1000).toFixed(1)} bn$`} color="#7F1D1D"/>
      </div>

      {/* SUB-TABS */}
      <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ECECEF', marginBottom: 16, overflowX: 'auto' }}>
        {([
          { id: 'eventos',  label: `Eventos · ${data.eventos_2026.length}` },
          { id: 'calls',    label: `Calls activas · ${data.calls_activas.length}` },
          { id: 'captechs', label: `CapTechs EDA · ${data.captechs_eda.length}` },
          { id: 'otan',     label: `Comités OTAN · ${data.comites_otan.length}` },
          { id: 'sto',      label: `STO RTGs · ${data.sto_rtg.length}` },
          { id: 'osce',     label: `OSCE · ${data.osce_foros.length}` },
        ] as Array<{ id: SubTab; label: string }>).map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background: 'transparent', color: active ? '#1d1d1f' : '#6e6e73', border: 0,
                       borderBottom: active ? '2px solid #1d1d1f' : '2px solid transparent',
                       padding: '9px 16px', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          )
        })}
      </nav>

      {tab === 'eventos' && <EventosView eventos={data.eventos_2026}/>}
      {tab === 'calls' && <CallsView calls={data.calls_activas}/>}
      {tab === 'captechs' && <CapTechsView caps={data.captechs_eda}/>}
      {tab === 'otan' && <OtanView comites={data.comites_otan}/>}
      {tab === 'sto' && <StoView grupos={data.sto_rtg}/>}
      {tab === 'osce' && <OsceView foros={data.osce_foros}/>}
    </div>
  )
}

function EventosView({ eventos }: { eventos: Evento[] }) {
  const sorted = [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  return (
    <Panel title="Calendario de eventos · 2026-2027" subtitle="Ferias industriales, conferencias OTAN, industry days · ordenados por proximidad">
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(e => {
          const daysUntil = Math.ceil((new Date(e.fecha).getTime() - Date.now()) / 86400000)
          return (
            <li key={e.id} style={{ padding: 12, background: '#fff', border: '1px solid #ECECEF', borderRadius: 10, borderLeft: `4px solid ${RELEV_COLOR[e.relevancia] || '#9CA3AF'}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'baseline' }}>
                <div style={{ minWidth: 80, textAlign: 'center', padding: '6px 10px', background: '#FAFAFA', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>{e.fecha.slice(8, 10)}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#6e6e73' }}>{['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][parseInt(e.fecha.slice(5, 7)) - 1]} {e.fecha.slice(0, 4)}</p>
                  {daysUntil > 0 && daysUntil < 200 && <p style={{ margin: '2px 0 0', fontSize: 9, color: RELEV_COLOR[e.relevancia], fontWeight: 700 }}>en {daysUntil}d</p>}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: '#1d1d1f', color: '#fff', fontWeight: 700, textTransform: 'uppercase' }}>{e.tipo.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: `${RELEV_COLOR[e.relevancia] || '#9CA3AF'}20`, color: RELEV_COLOR[e.relevancia] || '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>{e.relevancia}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{e.nombre}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>{e.ubicacion} · org. {e.organizador} · público: {e.publico.replace(/_/g, ' ')}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.4 }}>{e.descripcion}</p>
                </div>
                {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1F4E8C', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>Web oficial ↗</a>}
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function CallsView({ calls }: { calls: Call[] }) {
  const sorted = [...calls].sort((a, b) => a.fecha_cierre.localeCompare(b.fecha_cierre))
  return (
    <Panel title="Convocatorias activas · I+D + producción + estudios" subtitle="Calls for proposals abiertas o próximas · ordenadas por fecha de cierre">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 10 }}>
        {sorted.map(c => {
          const closeIn = Math.ceil((new Date(c.fecha_cierre).getTime() - Date.now()) / 86400000)
          return (
            <div key={c.id} style={{ padding: 14, background: '#FAFAFA', borderRadius: 10, borderLeft: `4px solid ${RELEV_COLOR[c.relevancia] || '#9CA3AF'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: '#1F4E8C', color: '#fff', fontWeight: 700, textTransform: 'uppercase' }}>{c.tipo.replace(/_/g, ' ')}</span>
                {c.cuantia_total_M && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1F4E8C', fontFamily: 'var(--font-display)' }}>
                    {c.cuantia_total_M >= 1000 ? `${(c.cuantia_total_M / 1000).toFixed(1)} bn$` : `${c.cuantia_total_M} M$`}
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{c.nombre}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#6e6e73' }}>org. <strong>{c.organizador}</strong></p>
              <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.4 }}>{c.descripcion}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '6px 8px', background: '#fff', borderRadius: 6, fontSize: 10.5 }}>
                <span style={{ color: '#16A34A' }}>Abre: <strong>{c.fecha_apertura}</strong></span>
                <span style={{ color: closeIn < 30 ? '#DC2626' : '#F97316' }}>
                  Cierra: <strong>{c.fecha_cierre}</strong> {closeIn > 0 ? `(en ${closeIn}d)` : '(cerrada)'}
                </span>
              </div>
              {c.elegibles_es && c.elegibles_es.length > 0 && (
                <div style={{ marginTop: 8, padding: 6, background: '#EFF6FF', borderRadius: 6 }}>
                  <p style={{ margin: 0, fontSize: 9, color: '#1F4E8C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ELEGIBLES ESPAÑA</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#1d1d1f' }}>{c.elegibles_es.join(', ')}</p>
                </div>
              )}
              {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, display: 'inline-block', fontSize: 11, color: '#1F4E8C', fontWeight: 600, textDecoration: 'none' }}>Ver convocatoria ↗</a>}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function CapTechsView({ caps }: { caps: CapTech[] }) {
  return (
    <Panel title="16 CapTechs · grupos técnicos EDA" subtitle="Donde se decide qué tecnología comprar 3 años antes de la licitación · acceso para industria acreditada">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
        {caps.map(c => (
          <div key={c.id} style={{ padding: 12, background: '#FAFAFA', borderRadius: 10, borderLeft: `3px solid ${RELEV_COLOR[c.relevancia_es] || '#9CA3AF'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
              <div>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: '#1F4E8C', color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{c.id}</span>
                <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{c.nombre}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#6e6e73' }}>Dominio: <strong>{c.dominio}</strong></p>
              </div>
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${RELEV_COLOR[c.relevancia_es]}20`, color: RELEV_COLOR[c.relevancia_es], fontWeight: 700, textTransform: 'uppercase' }}>{c.relevancia_es.replace(/_/g, ' ')}</span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#3a3a3d', lineHeight: 1.4 }}>{c.descripcion}</p>
            {c.actividades_2026 && c.actividades_2026.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: 14, fontSize: 10.5, color: '#16A34A', lineHeight: 1.4 }}>
                {c.actividades_2026.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

function OtanView({ comites }: { comites: ComiteOtan[] }) {
  return (
    <Panel title="Comités y agencias clave OTAN" subtitle="Donde se aprueban STANAGs + se contratan capacidades + se relaciona industria con la Alianza">
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {comites.map(c => (
          <li key={c.id} style={{ padding: 12, background: '#FAFAFA', borderRadius: 10, borderLeft: '3px solid #5D4037' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: '#5D4037', color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{c.id}</span>
                <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{c.nombre}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9CA3AF', textTransform: 'capitalize' }}>{c.tipo}</p>
              </div>
              {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#5D4037', fontWeight: 600 }}>Web oficial ↗</a>}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.4 }}>{c.descripcion}</p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function StoView({ grupos }: { grupos: STOGroup[] }) {
  const porPanel: Record<string, STOGroup[]> = {}
  for (const g of grupos) {
    if (!porPanel[g.panel]) porPanel[g.panel] = []
    porPanel[g.panel].push(g)
  }
  return (
    <Panel title="NATO STO · Research Task Groups activos" subtitle="Equivalentes OTAN a los CapTechs EDA · papers + workshops · acreditación STO requerida">
      {Object.entries(porPanel).map(([panel, gs]) => (
        <div key={panel} style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: '#5D4037', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Panel {panel}</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 6 }}>
            {gs.map(g => (
              <li key={g.id} style={{ padding: 10, background: '#FAFAFA', borderRadius: 8 }}>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: '#5D4037', color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{g.id}</span>
                <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{g.nombre}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>Duración: <strong>{g.duracion}</strong> · Estado: <strong style={{ color: g.estado === 'activo' ? '#16A34A' : '#9CA3AF' }}>{g.estado}</strong></p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Panel>
  )
}

function OsceView({ foros }: { foros: OSCEForo[] }) {
  return (
    <Panel title="OSCE · foros de seguridad y verificación" subtitle="Marco multilateral 57 Estados · medidas de confianza + control armamentos">
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {foros.map(f => (
          <li key={f.id} style={{ padding: 12, background: '#FAFAFA', borderRadius: 10, borderLeft: '3px solid #7C3AED' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: '#7C3AED', color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{f.id}</span>
                <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{f.nombre}</p>
              </div>
              {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>↗</a>}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.4 }}>{f.descripcion}</p>
          </li>
        ))}
      </ul>
    </Panel>
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
