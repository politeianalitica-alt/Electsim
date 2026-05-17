'use client'
/**
 * /sector-defensa/paises
 *
 * DefenseIQ · Catálogo militar mundial estilo IISS Military Balance+
 * Buscador con filtros + tabla comparativa + acceso a ficha por país.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { PAISES_MILITARES, type Alianza, type PaisMilitar } from '@/lib/defense/military-catalog'

const REGIONES: Array<PaisMilitar['region'] | 'todas'> = [
  'todas', 'Europa Occidental', 'Europa Oriental', 'Norteamérica', 'Latinoamérica',
  'Oriente Medio', 'Asia-Pacífico', 'Asia Central', 'África', 'Oceanía',
]

const ALIANZAS_FILTRO: Array<Alianza | 'todas'> = ['todas', 'OTAN', 'EU', 'UE-PESCO', 'OCS', 'ANZUS', 'AUKUS', 'QUAD', 'BRICS']

type OrdenCol = 'gasto' | 'pib_pct' | 'efectivos' | 'ranking' | 'variacion'

export default function PaisesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [q, setQ] = useState('')
  const [region, setRegion] = useState<typeof REGIONES[number]>('todas')
  const [alianza, setAlianza] = useState<typeof ALIANZAS_FILTRO[number]>('todas')
  const [orden, setOrden] = useState<OrdenCol>('gasto')
  const [comparar, setComparar] = useState<string[]>([])

  const filtrados = useMemo(() => {
    const ql = q.toLowerCase().trim()
    return PAISES_MILITARES.filter(p => {
      if (region !== 'todas' && p.region !== region) return false
      if (alianza !== 'todas' && !p.alianzas.includes(alianza as Alianza)) return false
      if (!ql) return true
      return p.pais.toLowerCase().includes(ql) ||
             p.pais_en.toLowerCase().includes(ql) ||
             p.iso3.toLowerCase().includes(ql) ||
             p.capital.toLowerCase().includes(ql) ||
             p.industria.empresas_top.some(e => e.toLowerCase().includes(ql))
    }).sort((a, b) => {
      switch (orden) {
        case 'gasto':     return b.gasto_militar_USD_b - a.gasto_militar_USD_b
        case 'pib_pct':   return b.gasto_militar_pct_pib - a.gasto_militar_pct_pib
        case 'efectivos': return b.efectivos_activos - a.efectivos_activos
        case 'ranking':   return a.ranking_global - b.ranking_global
        case 'variacion': return b.variacion_yoy_pct - a.variacion_yoy_pct
      }
    })
  }, [q, region, alianza, orden])

  // KPIs agregados
  const totales = useMemo(() => ({
    n: filtrados.length,
    gastoTotal: filtrados.reduce((s, p) => s + p.gasto_militar_USD_b, 0),
    efectivosTotales: filtrados.reduce((s, p) => s + p.efectivos_activos, 0),
    nuclearN: filtrados.filter(p => p.capacidades.nuclear).length,
    portaaviones: filtrados.reduce((s, p) => s + p.capacidades.portaaviones, 0),
    cumplenOtan: filtrados.filter(p => p.alianzas.includes('OTAN') && p.gasto_militar_pct_pib >= 2).length,
    paisesOtan: filtrados.filter(p => p.alianzas.includes('OTAN')).length,
  }), [filtrados])

  function toggleComparar(iso3: string) {
    setComparar(c => c.includes(iso3)
      ? c.filter(x => x !== iso3)
      : c.length >= 4 ? c : [...c, iso3])
  }

  const paisesComparar = comparar.map(iso3 => PAISES_MILITARES.find(p => p.iso3 === iso3)!).filter(Boolean)

  return (
    <div style={{ paddingTop: 24 }}>
      {/* HERO */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
          DEFENSE INTELLIGENCE · MILITARY BALANCE
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
          Catálogo militar mundial
        </h1>
        <p style={{ fontSize: 12.5, color: '#86868b', margin: '6px 0 0', lineHeight: 1.5 }}>
          {PAISES_MILITARES.length} ejércitos cubiertos · perfil completo de fuerzas armadas, presupuesto, programas activos,
          doctrina, ministerio de defensa, industria nacional, despliegues exteriores y postura estratégica · datos públicos SIPRI + IISS + NATO + fuentes oficiales
        </p>
      </div>

      {/* KPI STRIP AGREGADOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 18 }}>
        <KPI label="PAÍSES MOSTRADOS" value={String(totales.n)} color="#1d1d1f"/>
        <KPI label="GASTO MILITAR" value={`${totales.gastoTotal.toFixed(0)} b$`} color="#1F4E8C"/>
        <KPI label="EFECTIVOS ACTIVOS" value={(totales.efectivosTotales / 1_000_000).toFixed(2) + ' M'} color="#0EA5E9"/>
        <KPI label="POTENCIAS NUCLEARES" value={String(totales.nuclearN)} color="#7C3AED"/>
        <KPI label="PORTAAVIONES" value={String(totales.portaaviones)} color="#F97316"/>
        <KPI label="OTAN ≥ 2% PIB" value={`${totales.cumplenOtan}/${totales.paisesOtan}`} color="#16A34A"/>
      </div>

      {/* FILTROS */}
      <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>BUSCAR</p>
            <input type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="País, capital, ministro, empresa…"
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit' }}/>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>REGIÓN</p>
            <select value={region} onChange={e => setRegion(e.target.value as typeof REGIONES[number])}
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
              {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ALIANZA</p>
            <select value={alianza} onChange={e => setAlianza(e.target.value as typeof ALIANZAS_FILTRO[number])}
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
              {ALIANZAS_FILTRO.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ORDENAR POR</p>
            <select value={orden} onChange={e => setOrden(e.target.value as OrdenCol)}
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '1px solid #DDDDE3', fontFamily: 'inherit', background: '#fff' }}>
              <option value="gasto">Gasto militar (USD)</option>
              <option value="pib_pct">% PIB en defensa</option>
              <option value="efectivos">Efectivos activos</option>
              <option value="ranking">Ranking global</option>
              <option value="variacion">Variación YoY (%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* COMPARADOR ACTIVO */}
      {comparar.length > 0 && (
        <Panel title={`Comparador (${comparar.length}/4)`} subtitle="Selección activa · click en una fila para añadir/quitar" marginBottom>
          <Comparator paises={paisesComparar} onRemove={(iso3) => setComparar(c => c.filter(x => x !== iso3))}/>
        </Panel>
      )}

      {/* TABLA PAÍSES */}
      <Panel title="Inventario militar comparado" subtitle={`${filtrados.length} países · ordenados por ${orden}`}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '2px solid #ECECEF' }}>
                <Th>País</Th>
                <Th>Región / Alianzas</Th>
                <Th right>Ranking</Th>
                <Th right>Gasto USD</Th>
                <Th right>% PIB</Th>
                <Th right>Δ YoY</Th>
                <Th right>Efectivos</Th>
                <Th right>Caza / Buques / Sub</Th>
                <Th right>Capacidades</Th>
                <Th right>Industria</Th>
                <Th right>Comparar</Th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const cumpleOtan = p.alianzas.includes('OTAN') && p.gasto_militar_pct_pib >= 2
                const cumple5 = p.gasto_militar_pct_pib >= 5
                const variacionColor = p.variacion_yoy_pct > 10 ? '#16A34A' : p.variacion_yoy_pct > 0 ? '#0EA5E9' : '#DC2626'
                return (
                  <tr key={p.iso3} style={{ borderBottom: '1px solid #F5F5F7' }}>
                    <Td>
                      <Link href={`/sector-defensa/paises/${p.iso3}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 28, height: 18, background: '#525258', color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontFamily: 'monospace' }}>{p.iso3}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1d1d1f' }}>{p.pais}</div>
                            <div style={{ fontSize: 9.5, color: '#6e6e73' }}>{p.capital}</div>
                          </div>
                        </div>
                      </Link>
                    </Td>
                    <Td>
                      <div style={{ fontSize: 10, color: '#6e6e73' }}>{p.region}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
                        {p.alianzas.map(a => (
                          <span key={a} style={{ fontSize: 8.5, padding: '1px 5px', borderRadius: 3, background: a === 'OTAN' ? '#1F4E8C' : a === 'EU' ? '#FCD34D' : '#525258', color: a === 'EU' ? '#92400E' : '#fff', fontWeight: 700, letterSpacing: '0.04em' }}>{a}</span>
                        ))}
                      </div>
                    </Td>
                    <Td right><span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{p.ranking_global}º</span></Td>
                    <Td right><span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1F4E8C' }}>{p.gasto_militar_USD_b.toFixed(1)} b</span></Td>
                    <Td right>
                      <span style={{ fontWeight: 700, color: cumple5 ? '#7C3AED' : cumpleOtan ? '#16A34A' : p.gasto_militar_pct_pib >= 2 ? '#16A34A' : '#DC2626' }}>
                        {p.gasto_militar_pct_pib.toFixed(2)}%
                      </span>
                    </Td>
                    <Td right><span style={{ fontWeight: 700, color: variacionColor }}>{p.variacion_yoy_pct > 0 ? '+' : ''}{p.variacion_yoy_pct.toFixed(1)}%</span></Td>
                    <Td right><span style={{ fontWeight: 600 }}>{(p.efectivos_activos / 1000).toFixed(0)}k</span></Td>
                    <Td right>
                      <span style={{ fontSize: 10.5, color: '#3a3a3d' }}>
                        {p.inventario.aeronaves_combate ?? '-'} / {p.inventario.buques_superficie ?? '-'} / {p.inventario.submarinos ?? '-'}
                      </span>
                    </Td>
                    <Td right>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        {p.capacidades.nuclear && <Chip color="#7C3AED" label="N"/>}
                        {p.capacidades.espacial && <Chip color="#0EA5E9" label="S"/>}
                        {p.capacidades.ciber === 'líder' && <Chip color="#16A34A" label="C+"/>}
                        {p.capacidades.ciber === 'avanzada' && <Chip color="#16A34A" label="C"/>}
                        {p.capacidades.portaaviones > 0 && <Chip color="#F97316" label={`CV${p.capacidades.portaaviones}`}/>}
                      </div>
                    </Td>
                    <Td right>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: p.industria.nivel === 'exportador líder' ? '#16A34A20' : p.industria.nivel === 'productor' ? '#0EA5E920' : p.industria.nivel === 'integrador' ? '#F5F5F7' : '#FAFAFA', color: p.industria.nivel === 'exportador líder' ? '#16A34A' : '#3a3a3d' }}>{p.industria.nivel}</span>
                    </Td>
                    <Td right>
                      <button onClick={() => toggleComparar(p.iso3)}
                        disabled={!comparar.includes(p.iso3) && comparar.length >= 4}
                        style={{
                          fontSize: 10, padding: '4px 10px', borderRadius: 6, border: '1px solid',
                          borderColor: comparar.includes(p.iso3) ? '#1d1d1f' : '#DDDDE3',
                          background: comparar.includes(p.iso3) ? '#1d1d1f' : '#fff',
                          color: comparar.includes(p.iso3) ? '#fff' : '#3a3a3d',
                          cursor: comparar.includes(p.iso3) || comparar.length < 4 ? 'pointer' : 'not-allowed',
                          fontWeight: 600, fontFamily: 'inherit',
                        }}>
                        {comparar.includes(p.iso3) ? '✓' : '+'}
                      </button>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* LEYENDA */}
      <div style={{ marginTop: 14, padding: 12, background: '#FAFAFB', borderRadius: 8, fontSize: 10.5, color: '#3a3a3d', display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        <span><strong>N</strong> = capacidad nuclear</span>
        <span><strong>S</strong> = espacial militar</span>
        <span><strong>C+/C</strong> = ciber líder / avanzada</span>
        <span><strong>CV</strong> = portaaviones</span>
        <span style={{ color: '#7C3AED' }}><strong>%PIB en violeta</strong> = ≥ 5% (objetivo OTAN 2024)</span>
        <span style={{ color: '#16A34A' }}><strong>verde</strong> = ≥ 2% (OTAN clásico)</span>
      </div>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th style={{ padding: '8px 10px', textAlign: right ? 'right' : 'left', fontSize: 9.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{children}</th>
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td style={{ padding: '8px 10px', textAlign: right ? 'right' : 'left', verticalAlign: 'middle' }}>{children}</td>
}

function Chip({ color, label }: { color: string; label: string }) {
  return <span style={{ fontSize: 8.5, padding: '1px 5px', borderRadius: 3, background: color, color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>{label}</span>
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function Comparator({ paises, onRemove }: { paises: PaisMilitar[]; onRemove: (iso3: string) => void }) {
  const filas: Array<{ label: string; get: (p: PaisMilitar) => string }> = [
    { label: 'Capital', get: p => p.capital },
    { label: 'PIB (USD bn)', get: p => p.pib_USD_b.toFixed(0) },
    { label: 'Gasto militar (USD bn)', get: p => p.gasto_militar_USD_b.toFixed(1) },
    { label: '% PIB defensa', get: p => p.gasto_militar_pct_pib.toFixed(2) + '%' },
    { label: 'Δ YoY', get: p => (p.variacion_yoy_pct > 0 ? '+' : '') + p.variacion_yoy_pct.toFixed(1) + '%' },
    { label: 'Efectivos activos', get: p => p.efectivos_activos.toLocaleString('es-ES') },
    { label: 'Efectivos reserva', get: p => p.efectivos_reserva.toLocaleString('es-ES') },
    { label: 'Carros de combate', get: p => String(p.inventario.carros_combate || '—') },
    { label: 'Aeronaves de combate', get: p => String(p.inventario.aeronaves_combate || '—') },
    { label: 'Buques de superficie', get: p => String(p.inventario.buques_superficie || '—') },
    { label: 'Submarinos', get: p => String(p.inventario.submarinos || '—') },
    { label: 'Portaaviones', get: p => String(p.capacidades.portaaviones || '—') },
    { label: 'Cabezas nucleares', get: p => String(p.inventario.cabezas_nucleares || '—') },
    { label: 'Capacidad ciber', get: p => p.capacidades.ciber },
    { label: 'Postura exterior', get: p => p.capacidades.expedicionaria },
    { label: 'Riesgo', get: p => p.postura.nivel_riesgo },
    { label: 'Industria', get: p => p.industria.nivel },
    { label: 'Exportación armas USD bn', get: p => p.industria.exportacion_USD_b?.toFixed(1) ?? '—' },
    { label: 'Programas activos', get: p => String(p.programas.length) },
    { label: 'Doctrina clave', get: p => `${p.doctrina.documento_clave} (${p.doctrina.año})` },
  ]

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #ECECEF', fontSize: 9.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Métrica</th>
            {paises.map(p => (
              <th key={p.iso3} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #ECECEF', minWidth: 160 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{p.pais}</div>
                    <div style={{ fontSize: 9.5, color: '#6e6e73' }}>{p.iso3} · ranking {p.ranking_global}º</div>
                  </div>
                  <button onClick={() => onRemove(p.iso3)} style={{ background: 'transparent', border: '1px solid #DDDDE3', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 11, color: '#6e6e73' }}>×</button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map(f => (
            <tr key={f.label} style={{ borderBottom: '1px solid #F5F5F7' }}>
              <td style={{ padding: '6px 10px', fontSize: 11, color: '#6e6e73', fontWeight: 600 }}>{f.label}</td>
              {paises.map(p => (
                <td key={p.iso3} style={{ padding: '6px 10px', fontSize: 11.5, color: '#1d1d1f' }}>{f.get(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
