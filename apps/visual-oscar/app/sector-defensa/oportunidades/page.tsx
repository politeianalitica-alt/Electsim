'use client'
/**
 * /sector-defensa/oportunidades
 *
 * Oportunidades de negocio extraídas del catálogo militar mundial:
 *   - Programas activos por país, tipo y horizonte
 *   - Filtros por tipo (aeronaves/naval/terrestre/misiles/...)
 *   - Filtros por estado (planificación/desarrollo/producción/despliegue)
 *   - Buscador semántico libre
 *   - Top contratistas internacionales potenciales
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { SectorMapPreview } from '@/components/SectorMapPreview'
import { PAISES_MILITARES, type PaisMilitar, type ProgramaActivo } from '@/lib/defense/military-catalog'

interface OportunidadEnriquecida extends ProgramaActivo {
  paisIso3: string
  pais: string
  region: PaisMilitar['region']
  presupuestoNacional_M?: number
}

const TIPO_COLOR: Record<string, string> = {
  'aeronaves': '#0EA5E9',
  'naval': '#1F4E8C',
  'terrestre': '#5D4037',
  'misiles': '#DC2626',
  'C4ISR': '#7C3AED',
  'espacial': '#7C3AED',
  'ciber': '#16A34A',
  'logística': '#F59E0B',
  'industrial': '#F97316',
}

const ESTADO_COLOR: Record<string, string> = {
  'planificación': '#9CA3AF',
  'desarrollo': '#F59E0B',
  'producción': '#16A34A',
  'despliegue': '#0EA5E9',
}

export default function OportunidadesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState<string>('todos')
  const [estado, setEstado] = useState<string>('todos')
  const [region, setRegion] = useState<string>('todas')
  const [minM, setMinM] = useState<number>(0)

  // Aplanar todas las oportunidades de todos los países
  const todas: OportunidadEnriquecida[] = useMemo(() => {
    const arr: OportunidadEnriquecida[] = []
    for (const p of PAISES_MILITARES) {
      for (const prog of p.programas) {
        arr.push({
          ...prog,
          paisIso3: p.iso3, pais: p.pais, region: p.region,
          presupuestoNacional_M: p.ministerio.presupuesto_anual_M,
        })
      }
    }
    return arr
  }, [])

  const filtradas = useMemo(() => {
    const ql = q.toLowerCase().trim()
    return todas.filter(o => {
      if (tipo !== 'todos' && o.tipo !== tipo) return false
      if (estado !== 'todos' && o.estado !== estado) return false
      if (region !== 'todas' && o.region !== region) return false
      if (minM > 0 && (o.cuantia_estimada_M || 0) < minM) return false
      if (!ql) return true
      return o.nombre.toLowerCase().includes(ql) ||
             o.descripcion.toLowerCase().includes(ql) ||
             o.pais.toLowerCase().includes(ql) ||
             o.socios.some(s => s.toLowerCase().includes(ql))
    }).sort((a, b) => (b.cuantia_estimada_M || 0) - (a.cuantia_estimada_M || 0))
  }, [todas, q, tipo, estado, region, minM])

  // Stats agregadas
  const stats = useMemo(() => {
    const cuantiaTotal = filtradas.reduce((s, o) => s + (o.cuantia_estimada_M || 0), 0)
    const porTipo: Record<string, number> = {}
    const porEstado: Record<string, number> = {}
    const porPais: Record<string, number> = {}
    for (const o of filtradas) {
      porTipo[o.tipo] = (porTipo[o.tipo] || 0) + 1
      porEstado[o.estado] = (porEstado[o.estado] || 0) + 1
      porPais[o.pais] = (porPais[o.pais] || 0) + (o.cuantia_estimada_M || 0)
    }
    return { cuantiaTotal, porTipo, porEstado, porPais }
  }, [filtradas])

  const topPaisesPorCuantia = Object.entries(stats.porPais).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const tiposUnicos = Object.keys(stats.porTipo).sort()

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
          DEFENSE INTELLIGENCE · BUSINESS DEVELOPMENT
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
          Oportunidades de negocio · Programas activos
        </h1>
        <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
          {todas.length} programas mundiales en planificación, desarrollo, producción o despliegue ·
          identificación de ventanas competitivas para industria española y europea
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
        <KPI label="OPORTUNIDADES" value={String(filtradas.length)} color="#1d1d1f"/>
        <KPI label="CUANTÍA TOTAL" value={`${(stats.cuantiaTotal / 1000).toFixed(1)} bn$`} color="#1F4E8C"/>
        <KPI label="EN PRODUCCIÓN" value={String(stats.porEstado['producción'] || 0)} color="#16A34A"/>
        <KPI label="EN DESARROLLO" value={String(stats.porEstado['desarrollo'] || 0)} color="#F59E0B"/>
        <KPI label="EN PLANIFICACIÓN" value={String(stats.porEstado['planificación'] || 0)} color="#9CA3AF"/>
      </div>

      {/* FILTROS */}
      <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 0.7fr', gap: 10 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>BUSCAR</p>
            <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Programa, descripción, prime contractor…"
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit' }}/>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>TIPO</p>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
              <option value="todos">Todos</option>
              {tiposUnicos.map(t => <option key={t} value={t}>{t} ({stats.porTipo[t]})</option>)}
            </select>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ESTADO</p>
            <select value={estado} onChange={e => setEstado(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
              <option value="todos">Todos</option>
              <option value="planificación">Planificación</option>
              <option value="desarrollo">Desarrollo</option>
              <option value="producción">Producción</option>
              <option value="despliegue">Despliegue</option>
            </select>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>REGIÓN</p>
            <select value={region} onChange={e => setRegion(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
              <option value="todas">Todas</option>
              <option value="Europa Occidental">Europa Occidental</option>
              <option value="Europa Oriental">Europa Oriental</option>
              <option value="Norteamérica">Norteamérica</option>
              <option value="Asia-Pacífico">Asia-Pacífico</option>
              <option value="Oriente Medio">Oriente Medio</option>
              <option value="Oceanía">Oceanía</option>
            </select>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>MIN. M$</p>
            <input type="number" value={minM} min={0} onChange={e => setMinM(+e.target.value || 0)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit' }}/>
          </div>
        </div>
      </div>

      {/* TOP PAÍSES POR CUANTÍA */}
      <Panel title="Top mercados por cuantía agregada" subtitle="Programas filtrados · suma de cuantías estimadas en M$ por país" marginBottom>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {topPaisesPorCuantia.map(([pais, cuantia]) => {
            const maxC = topPaisesPorCuantia[0][1]
            return (
              <li key={pais} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 120px', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{pais}</span>
                <div style={{ height: 14, background: '#F5F5F7', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(cuantia / maxC) * 100}%`, height: '100%', background: '#1F4E8C' }}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1F4E8C', textAlign: 'right', fontFamily: 'var(--font-display)' }}>
                  {(cuantia / 1000).toFixed(1)} bn$
                </span>
              </li>
            )
          })}
        </ul>
      </Panel>

      {/* LISTA DE OPORTUNIDADES */}
      <Panel title={`${filtradas.length} oportunidades`} subtitle={`Cuantía total ${(stats.cuantiaTotal / 1000).toFixed(1)} bn$ · ordenadas por valor`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 10 }}>
          {filtradas.map((o, i) => (
            <Link key={i} href={`/sector-defensa/paises/${o.paisIso3}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: 14, background: '#FAFAFA', borderRadius: 10, border: '1px solid #ECECEF', borderTop: `3px solid ${TIPO_COLOR[o.tipo] || '#525258'}`, transition: 'border 0.15s, transform 0.15s', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>{o.nombre}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${ESTADO_COLOR[o.estado]}20`, color: ESTADO_COLOR[o.estado], textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{o.estado}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#6e6e73', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ width: 22, height: 14, background: '#525258', color: '#fff', fontSize: 8.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, fontFamily: 'monospace' }}>{o.paisIso3}</span>
                    <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{o.pais}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${TIPO_COLOR[o.tipo]}20`, color: TIPO_COLOR[o.tipo], fontWeight: 700, textTransform: 'capitalize' }}>{o.tipo}</span>
                    <span style={{ color: '#86868b' }}>{o.horizonte}</span>
                  </div>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 11.5, color: '#1d1d1f', lineHeight: 1.5 }}>{o.descripcion}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px dashed #ECECEF', fontSize: 10.5 }}>
                  <span style={{ color: '#6e6e73' }}>Socios: <strong>{o.socios.join(', ')}</strong></span>
                  {o.cuantia_estimada_M && (
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1F4E8C', fontFamily: 'var(--font-display)' }}>
                      {o.cuantia_estimada_M >= 1000 ? `${(o.cuantia_estimada_M / 1000).toFixed(1)} bn$` : `${o.cuantia_estimada_M} M$`}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
        {filtradas.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#86868b', fontSize: 12 }}>Sin oportunidades para los filtros seleccionados</div>
        )}
      </Panel>

      <SectorMapPreview sector="defensa" marginTop={28} />
    </div>
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
