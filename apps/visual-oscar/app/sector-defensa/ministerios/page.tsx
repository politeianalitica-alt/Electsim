'use client'
/**
 * /sector-defensa/ministerios
 *
 * Estructura de los Ministerios de Defensa del mundo:
 *   - Buscador por país, ministro o agencia
 *   - Filtro por región / alianza
 *   - Tabla compacta con ministro · presupuesto · agencias clave
 *   - Comparador 4 ministerios simultáneos
 *   - Acceso a ficha de país para detalle completo
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { PAISES_MILITARES, type Alianza } from '@/lib/defense/military-catalog'

const REGIONES = ['todas', 'Europa Occidental', 'Europa Oriental', 'Norteamérica', 'Latinoamérica', 'Oriente Medio', 'Asia-Pacífico', 'África', 'Oceanía']
const ALIANZAS: Array<'todas' | Alianza> = ['todas', 'OTAN', 'EU', 'UE-PESCO', 'OCS', 'ANZUS', 'AUKUS', 'QUAD', 'BRICS']

export default function MinisteriosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [q, setQ] = useState('')
  const [region, setRegion] = useState('todas')
  const [alianza, setAlianza] = useState<'todas' | Alianza>('todas')

  const filtrados = useMemo(() => {
    const ql = q.toLowerCase().trim()
    return PAISES_MILITARES.filter(p => {
      if (region !== 'todas' && p.region !== region) return false
      if (alianza !== 'todas' && !p.alianzas.includes(alianza as Alianza)) return false
      if (!ql) return true
      return p.pais.toLowerCase().includes(ql) ||
             p.ministerio.nombre.toLowerCase().includes(ql) ||
             p.ministerio.ministro.toLowerCase().includes(ql) ||
             p.ministerio.agencias_clave.some(a => a.toLowerCase().includes(ql))
    }).sort((a, b) => (b.ministerio.presupuesto_anual_M || 0) - (a.ministerio.presupuesto_anual_M || 0))
  }, [q, region, alianza])

  // KPIs agregados
  const stats = useMemo(() => {
    const presup = filtrados.reduce((s, p) => s + (p.ministerio.presupuesto_anual_M || 0), 0)
    const agencias = new Set<string>()
    for (const p of filtrados) p.ministerio.agencias_clave.forEach(a => agencias.add(a))
    return {
      n: filtrados.length,
      presupuestoTotal_M: presup,
      agenciasUnicas: agencias.size,
    }
  }, [filtrados])

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
          DEFENSE INTELLIGENCE · MINISTRIES
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
          Ministerios de Defensa del mundo
        </h1>
        <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
          Estructura, ministros en funciones, presupuestos anuales y agencias clave de los {PAISES_MILITARES.length} ministerios cubiertos ·
          buscador semántico y filtros por región/alianza
        </p>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <KPI label="MINISTERIOS MOSTRADOS" value={String(stats.n)} color="#1d1d1f"/>
        <KPI label="PRESUPUESTO AGREGADO" value={`${(stats.presupuestoTotal_M / 1000).toFixed(0)} bn$`} color="#1F4E8C"/>
        <KPI label="AGENCIAS ÚNICAS" value={String(stats.agenciasUnicas)} color="#7C3AED"/>
      </div>

      {/* FILTROS */}
      <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>BUSCAR</p>
            <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="País, ministro, ministerio, agencia (DARPA, DGA, BAAINBw...)…"
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit' }}/>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>REGIÓN</p>
            <select value={region} onChange={e => setRegion(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
              {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ALIANZA</p>
            <select value={alianza} onChange={e => setAlianza(e.target.value as 'todas' | Alianza)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
              {ALIANZAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <Panel title={`${filtrados.length} ministerios`} subtitle="Ordenados por presupuesto anual">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 10 }}>
          {filtrados.map(p => (
            <Link key={p.iso3} href={`/sector-defensa/paises/${p.iso3}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: 14, background: '#FAFAFA', borderRadius: 10, border: '1px solid #ECECEF', borderLeft: '3px solid #1F4E8C', minHeight: 220, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 30, height: 18, background: '#525258', color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontFamily: 'monospace' }}>{p.iso3}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{p.pais}</span>
                  </div>
                  {p.ministerio.presupuesto_anual_M && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1F4E8C', fontFamily: 'var(--font-display)' }}>
                      {p.ministerio.presupuesto_anual_M >= 1000 ? `${(p.ministerio.presupuesto_anual_M / 1000).toFixed(1)} bn$` : `${p.ministerio.presupuesto_anual_M} M$`}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.4 }}>{p.ministerio.nombre}</p>
                <p style={{ margin: '4px 0', fontSize: 11, color: '#3a3a3d' }}>
                  Ministro: <strong>{p.ministerio.ministro}</strong>
                </p>
                <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px dashed #ECECEF' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>AGENCIAS CLAVE</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {p.ministerio.agencias_clave.slice(0, 5).map(a => (
                      <span key={a} style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 4, background: '#fff', border: '1px solid #ECECEF', color: '#3a3a3d' }}>{a}</span>
                    ))}
                    {p.ministerio.agencias_clave.length > 5 && (
                      <span style={{ fontSize: 9.5, color: '#9CA3AF' }}>+{p.ministerio.agencias_clave.length - 5}</span>
                    )}
                  </div>
                </div>
                {p.ministerio.url_oficial && (
                  <p style={{ margin: '6px 0 0', fontSize: 10, color: '#0EA5E9' }}>
                    Web oficial: <span style={{ color: '#0EA5E9', textDecoration: 'underline' }}>{new URL(p.ministerio.url_oficial).host}</span>
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
        {filtrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: 30, color: '#86868b', fontSize: 12 }}>Sin ministerios para los filtros</div>
        )}
      </Panel>
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
