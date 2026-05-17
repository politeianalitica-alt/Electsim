'use client'
/**
 * /sector-defensa/paises/[iso3]
 * Ficha completa de un país militar · estilo IISS country profile.
 */
import { use, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { getPaisByIso3, type PaisMilitar } from '@/lib/defense/military-catalog'

export default function PaisFichaPage({ params }: { params: Promise<{ iso3: string }> }) {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { iso3 } = use(params)
  const pais = getPaisByIso3(iso3.toUpperCase())

  if (!pais) {
    return (
      <div style={{ paddingTop: 24, textAlign: 'center', color: '#86868b' }}>
        <p>País {iso3} no encontrado en el catálogo.</p>
        <Link href="/sector-defensa/paises" style={{ color: '#1d1d1f', textDecoration: 'underline' }}>← Volver al catálogo</Link>
      </div>
    )
  }

  const banda = pais.postura.nivel_riesgo
  const colorRiesgo = banda === 'crítico' ? '#7F1D1D' : banda === 'alto' ? '#DC2626' : banda === 'elevado' ? '#F97316' : banda === 'moderado' ? '#F59E0B' : '#16A34A'

  return (
    <div style={{ paddingTop: 24 }}>
      {/* BREADCRUMB + BACK */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', fontSize: 11.5, color: '#6e6e73' }}>
        <Link href="/sector-defensa/paises" style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 600 }}>← Catálogo militar mundial</Link>
        <span>·</span>
        <span>{pais.region}</span>
      </div>

      {/* HERO PAÍS */}
      <section style={{
        background: `linear-gradient(135deg, ${colorRiesgo}DD 0%, ${colorRiesgo}88 100%)`,
        borderRadius: 16, padding: '24px 32px', marginBottom: 14, color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32, marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.8, textTransform: 'uppercase', margin: '0 0 6px' }}>
              FICHA · {pais.iso3} · MILITARY BALANCE
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 8px', lineHeight: 1.05 }}>
              {pais.pais}
            </h1>
            <p style={{ fontSize: 13, opacity: 0.92, margin: 0, lineHeight: 1.5 }}>
              {pais.capital} · {pais.poblacion_M} M habitantes · PIB {pais.pib_USD_b.toLocaleString('es-ES')} bn USD ·
              Ranking militar #{pais.ranking_global}
            </p>
            <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
              {pais.alianzas.map(a => (
                <span key={a} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', letterSpacing: '0.05em' }}>{a}</span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 9.5, opacity: 0.75, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>NIVEL DE RIESGO</p>
            <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'capitalize' }}>{pais.postura.nivel_riesgo}</p>
          </div>
        </div>

        {/* KPIs HERO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          <HeroKpi label="GASTO MILITAR" value={`${pais.gasto_militar_USD_b.toFixed(1)} bn$`} sub={`${pais.variacion_yoy_pct > 0 ? '+' : ''}${pais.variacion_yoy_pct.toFixed(1)}% YoY`}/>
          <HeroKpi label="% PIB DEFENSA" value={`${pais.gasto_militar_pct_pib.toFixed(2)}%`} sub={pais.alianzas.includes('OTAN') ? (pais.gasto_militar_pct_pib >= 2 ? 'Cumple OTAN 2%' : `Brecha ${(2 - pais.gasto_militar_pct_pib).toFixed(2)}pp`) : ''}/>
          <HeroKpi label="EFECTIVOS ACTIVOS" value={(pais.efectivos_activos / 1000).toFixed(0) + 'k'} sub={`Reserva ${(pais.efectivos_reserva / 1000).toFixed(0)}k`}/>
          <HeroKpi label="PROGRAMAS ACTIVOS" value={String(pais.programas.length)}/>
          <HeroKpi label="DESPLIEGUES EXT." value={String(pais.despliegues.length)} sub={`${pais.despliegues.reduce((s, d) => s + d.efectivos, 0).toLocaleString('es-ES')} efectivos`}/>
          <HeroKpi label="POSTURA" value={pais.capacidades.expedicionaria} sub={pais.capacidades.nuclear ? 'Nuclear · ' + (pais.inventario.cabezas_nucleares ?? 0) + ' cabezas' : 'No-nuclear'}/>
        </div>
      </section>

      {/* RAMAS ARMADAS */}
      <Panel title="Fuerzas armadas · ramas y equipo principal" subtitle={`${pais.ramas.length} ramas · ${pais.efectivos_activos.toLocaleString('es-ES')} efectivos en activo`} marginBottom>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {pais.ramas.map(r => (
            <div key={r.rama} style={{ padding: 14, background: '#FAFAFA', borderRadius: 10, border: '1px solid #ECECEF', borderTop: `3px solid ${colorRama(r.rama)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{r.rama}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: colorRama(r.rama), fontFamily: 'var(--font-display)' }}>{(r.efectivos / 1000).toFixed(0)}k</span>
              </div>
              {r.unidades && r.unidades.length > 0 && (
                <p style={{ margin: '4px 0', fontSize: 10.5, color: '#3a3a3d' }}>
                  <strong>Unidades clave:</strong> {r.unidades.join(' · ')}
                </p>
              )}
              {r.equipoClave && r.equipoClave.length > 0 && (
                <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {r.equipoClave.map((e, i) => (
                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: '#1d1d1f', borderTop: i > 0 ? '1px dashed #ECECEF' : 'none', paddingTop: i > 0 ? 4 : 0 }}>
                      <span style={{ flex: 1 }}>{e.tipo}{e.nota ? <span style={{ color: '#6e6e73', fontSize: 9.5 }}> · {e.nota}</span> : null}</span>
                      <span style={{ fontWeight: 700, color: colorRama(r.rama) }}>{typeof e.cantidad === 'number' ? e.cantidad.toLocaleString('es-ES') : e.cantidad}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* INVENTARIO + CAPACIDADES + POSTURA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="Inventario agregado">
          <table style={{ width: '100%', fontSize: 11.5 }}>
            <tbody>
              {Object.entries(pais.inventario).filter(([_, v]) => v != null).map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #F5F5F7' }}>
                  <td style={{ padding: '5px 8px', color: '#6e6e73', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>{typeof v === 'number' ? v.toLocaleString('es-ES') : v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Capacidades estratégicas">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Cap label="Nuclear" value={pais.capacidades.nuclear ? 'Sí' : 'No'} color={pais.capacidades.nuclear ? '#7C3AED' : '#9CA3AF'}/>
            <Cap label="Espacial militar" value={pais.capacidades.espacial ? 'Sí' : 'No'} color={pais.capacidades.espacial ? '#0EA5E9' : '#9CA3AF'}/>
            <Cap label="Capacidad ciber" value={pais.capacidades.ciber} color={pais.capacidades.ciber === 'líder' ? '#16A34A' : pais.capacidades.ciber === 'avanzada' ? '#0EA5E9' : pais.capacidades.ciber === 'desarrollada' ? '#F59E0B' : '#9CA3AF'}/>
            <Cap label="Postura exterior" value={pais.capacidades.expedicionaria} color="#525258"/>
            <Cap label="Portaaviones" value={String(pais.capacidades.portaaviones)} color="#F97316"/>
            <Cap label="SSN/SSBN" value={String(pais.capacidades.submarinos_nucleares)} color="#1F4E8C"/>
          </ul>
        </Panel>

        <Panel title="Postura y riesgo">
          <p style={{ margin: 0, padding: 8, background: `${colorRiesgo}10`, borderLeft: `3px solid ${colorRiesgo}`, borderRadius: 6, fontSize: 11, fontWeight: 700, color: colorRiesgo, textTransform: 'capitalize' }}>
            Riesgo {pais.postura.nivel_riesgo}
          </p>
          <p style={{ margin: '10px 0 4px', fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>FACTORES</p>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#1d1d1f', lineHeight: 1.5 }}>
            {pais.postura.factores.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
          {pais.postura.conflictos_activos.length > 0 && (
            <>
              <p style={{ margin: '10px 0 4px', fontSize: 10, color: '#DC2626', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>CONFLICTOS ACTIVOS</p>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#1d1d1f', lineHeight: 1.5 }}>
                {pais.postura.conflictos_activos.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </>
          )}
        </Panel>
      </div>

      {/* PROGRAMAS ACTIVOS */}
      <Panel title="Programas activos de adquisición" subtitle={`${pais.programas.length} programas en curso o planificación`} marginBottom>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
          {pais.programas.map(p => (
            <div key={p.nombre} style={{ padding: 12, background: '#FAFAFA', borderRadius: 8, border: '1px solid #ECECEF', borderLeft: `3px solid ${estadoColor(p.estado)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>{p.nombre}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${estadoColor(p.estado)}20`, color: estadoColor(p.estado), letterSpacing: '0.04em', textTransform: 'uppercase' }}>{p.estado}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#6e6e73', marginBottom: 6 }}>
                <span style={{ textTransform: 'capitalize' }}>{p.tipo}</span>
                <span>{p.horizonte}</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#1d1d1f', lineHeight: 1.4 }}>{p.descripcion}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, paddingTop: 6, borderTop: '1px dashed #ECECEF' }}>
                <span style={{ fontSize: 10, color: '#6e6e73' }}>Socios: <strong>{p.socios.join(', ')}</strong></span>
                {p.cuantia_estimada_M && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1F4E8C', fontFamily: 'var(--font-display)' }}>
                    {p.cuantia_estimada_M >= 1000 ? `${(p.cuantia_estimada_M / 1000).toFixed(1)} bn$` : `${p.cuantia_estimada_M} M$`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* DOCTRINA + MINISTERIO + INDUSTRIA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="Doctrina y estrategia">
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{pais.doctrina.documento_clave}</p>
          <p style={{ margin: '2px 0 8px', fontSize: 10, color: '#6e6e73' }}>{pais.doctrina.año}</p>
          <p style={{ margin: 0, fontSize: 11.5, color: '#1d1d1f', lineHeight: 1.55 }}>{pais.doctrina.enfoque}</p>
          {pais.doctrina.url && (
            <a href={pais.doctrina.url} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: 'inline-block', fontSize: 10.5, color: '#1F4E8C', fontWeight: 600 }}>Documento oficial ↗</a>
          )}
        </Panel>

        <Panel title="Ministerio de Defensa">
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{pais.ministerio.nombre}</p>
          <p style={{ margin: '4px 0 8px', fontSize: 11, color: '#3a3a3d' }}>Ministro: <strong>{pais.ministerio.ministro}</strong></p>
          {pais.ministerio.presupuesto_anual_M && (
            <p style={{ margin: 0, fontSize: 11, color: '#3a3a3d' }}>Presupuesto: <strong style={{ color: '#1F4E8C', fontFamily: 'var(--font-display)' }}>{(pais.ministerio.presupuesto_anual_M / 1000).toFixed(1)} bn$</strong></p>
          )}
          <p style={{ margin: '8px 0 4px', fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>AGENCIAS CLAVE</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {pais.ministerio.agencias_clave.map(a => (
              <span key={a} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: '#fff', border: '1px solid #ECECEF', color: '#1d1d1f' }}>{a}</span>
            ))}
          </div>
          {pais.ministerio.url_oficial && (
            <a href={pais.ministerio.url_oficial} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: 'inline-block', fontSize: 10.5, color: '#1F4E8C', fontWeight: 600 }}>Web oficial ↗</a>
          )}
        </Panel>

        <Panel title="Industria nacional de defensa">
          <p style={{ margin: 0, fontSize: 11, color: '#3a3a3d' }}>Nivel: <strong style={{ textTransform: 'capitalize' }}>{pais.industria.nivel}</strong></p>
          {pais.industria.exportacion_USD_b != null && (
            <p style={{ margin: '4px 0', fontSize: 11, color: '#3a3a3d' }}>
              Exportación: <strong style={{ color: '#16A34A', fontFamily: 'var(--font-display)' }}>{pais.industria.exportacion_USD_b.toFixed(1)} bn$</strong>
              {pais.industria.cuota_global_pct && <span style={{ color: '#6e6e73' }}> · cuota global {pais.industria.cuota_global_pct}%</span>}
            </p>
          )}
          <p style={{ margin: '8px 0 4px', fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>EMPRESAS TRACTORAS</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {pais.industria.empresas_top.map(e => (
              <li key={e} style={{ fontSize: 10.5, padding: '3px 8px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 6, color: '#1d1d1f', fontWeight: 600 }}>{e}</li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* DESPLIEGUES */}
      {pais.despliegues.length > 0 && (
        <Panel title="Despliegues exteriores" subtitle={`${pais.despliegues.length} despliegues · ${pais.despliegues.reduce((s, d) => s + d.efectivos, 0).toLocaleString('es-ES')} efectivos`} marginBottom>
          <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '2px solid #ECECEF' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase' }}>País</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase' }}>Tipo</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 9.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase' }}>Efectivos</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase' }}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {pais.despliegues.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F5F5F7' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 700, color: '#1d1d1f' }}>{d.pais}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: d.tipo === 'permanente' ? '#1F4E8C20' : d.tipo === 'OTAN' ? '#16A34A20' : '#F9731620', color: d.tipo === 'permanente' ? '#1F4E8C' : d.tipo === 'OTAN' ? '#16A34A' : '#F97316', fontWeight: 700, textTransform: 'capitalize' }}>{d.tipo}</span>
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#1F4E8C', fontFamily: 'var(--font-display)' }}>{d.efectivos.toLocaleString('es-ES')}</td>
                  <td style={{ padding: '7px 10px', fontSize: 10.5, color: '#6e6e73' }}>{d.nota || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* FUENTES + METADATA */}
      <div style={{ padding: 12, background: '#FAFAFB', borderRadius: 8, fontSize: 10.5, color: '#6e6e73', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <strong>Fuentes:</strong> {pais.fuentes.join(' · ')}
        </div>
        <span>Última actualización: <strong>{pais.actualizado}</strong></span>
      </div>
    </div>
  )
}

function colorRama(rama: PaisMilitar['ramas'][0]['rama']): string {
  switch (rama) {
    case 'Ejército': return '#5D4037'
    case 'Armada': return '#1F4E8C'
    case 'Fuerza Aérea': return '#0EA5E9'
    case 'Marines': return '#F97316'
    case 'Fuerzas Espaciales': return '#7C3AED'
    case 'Guardia Costera': return '#0F766E'
    case 'Ciberdefensa': return '#16A34A'
    case 'Operaciones Especiales': return '#DC2626'
    default: return '#6e6e73'
  }
}

function estadoColor(estado: string): string {
  if (estado === 'producción') return '#16A34A'
  if (estado === 'despliegue') return '#0EA5E9'
  if (estado === 'desarrollo') return '#F59E0B'
  return '#9CA3AF'
}

function HeroKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 10, padding: '10px 12px', backdropFilter: 'blur(6px)' }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{value}</div>
      {sub && <div style={{ fontSize: 9.5, opacity: 0.7, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Cap({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#FAFAFA', borderRadius: 6, fontSize: 11 }}>
      <span style={{ color: '#3a3a3d' }}>{label}</span>
      <span style={{ fontWeight: 700, color, textTransform: 'capitalize' }}>{value}</span>
    </li>
  )
}
