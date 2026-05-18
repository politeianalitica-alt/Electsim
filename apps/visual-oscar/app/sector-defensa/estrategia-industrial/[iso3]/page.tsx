'use client'
/**
 * /sector-defensa/estrategia-industrial/[iso3]
 * Ficha completa: estrategia + organigrama SVG + empresas + objetivos.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { getEstrategiaPorIso3, type OrgNode } from '@/lib/defense/estrategias'

const TIPO_COLOR: Record<string, string> = {
  'ministerio': '#1F4E8C',
  'agencia_adquisicion': '#F97316',
  'estado_mayor': '#5D4037',
  'rama_militar': '#16A34A',
  'agencia_exportacion': '#7C3AED',
  'organismo_id': '#0EA5E9',
  'empresa_publica': '#DC2626',
  'prime_contractor': '#525258',
  'tier1': '#6B7280',
}

const DOC_TIPO_COLOR: Record<string, string> = {
  'ley_programacion': '#7F1D1D',
  'concepto_defensa': '#1F4E8C',
  'estrategia_seguridad': '#5B21B6',
  'white_paper': '#0F766E',
  'plan_industrial': '#F97316',
  'directiva_politica': '#5D4037',
}

const ESTADO_COLOR: Record<string, string> = {
  'en_plazo': '#16A34A', 'con_retraso': '#F97316', 'cancelado': '#DC2626', 'completado': '#0EA5E9',
}

export default function EstrategiaFichaPage({ params }: { params: { iso3: string } }) {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null)

  const pais = useMemo(() => getEstrategiaPorIso3(params.iso3), [params.iso3])

  if (!pais) {
    return (
      <div style={{ paddingTop: 24, textAlign: 'center', color: '#86868b' }}>
        <p>País {params.iso3} no encontrado en el catálogo de estrategias.</p>
        <Link href="/sector-defensa/estrategia-industrial" style={{ color: '#1d1d1f' }}>← Volver al selector</Link>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 24 }}>
      {/* BREADCRUMB */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', fontSize: 11.5, color: '#6e6e73' }}>
        <Link href="/sector-defensa/estrategia-industrial" style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 600 }}>← Estrategias industriales</Link>
        <span>·</span><span>{pais.nombre}</span>
      </div>

      {/* HERO */}
      <section style={{
        background: 'linear-gradient(135deg, #1F4E8C 0%, #1d1d1f 100%)',
        borderRadius: 16, padding: '24px 30px', marginBottom: 14, color: '#fff',
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.85, textTransform: 'uppercase', margin: '0 0 6px' }}>
          ESTRATEGIA INDUSTRIAL · {pais.iso3}
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.022em', margin: '0 0 8px' }}>{pais.nombre}</h1>
        <p style={{ fontSize: 13, opacity: 0.92, margin: 0, lineHeight: 1.5 }}>
          {pais.documentos_estrategicos.length} documentos estratégicos · {pais.organigrama.nodos.length} nodos institucionales ·
          {pais.empresas_clave.length} empresas tractoras · {pais.objetivos_capacidad.length} objetivos declarados
        </p>
      </section>

      {/* DOCUMENTOS ESTRATÉGICOS */}
      <Panel title="Documentos estratégicos oficiales" subtitle="Marco doctrinario actual del país · enlaces a PDFs oficiales" marginBottom>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 10 }}>
          {pais.documentos_estrategicos.map((d, i) => (
            <div key={i} style={{ padding: 14, background: '#FAFAFA', borderRadius: 10, borderLeft: `4px solid ${DOC_TIPO_COLOR[d.tipo] || '#525258'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: DOC_TIPO_COLOR[d.tipo] || '#525258', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {d.tipo.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 11, color: '#6e6e73', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  {d.año}{d.vigencia_hasta ? `–${d.vigencia_hasta}` : ''}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1d1d1f' }}>{d.titulo}</p>
              {d.presupuesto_previsto_usd_m && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#1F4E8C' }}>
                  Presupuesto: <strong style={{ fontFamily: 'var(--font-display)' }}>{(d.presupuesto_previsto_usd_m / 1000).toFixed(0)} bn$</strong>
                  {d.periodo && <span style={{ color: '#9CA3AF' }}> · {d.periodo}</span>}
                </p>
              )}
              <p style={{ margin: '8px 0 6px', fontSize: 12, color: '#3a3a3d', lineHeight: 1.5 }}>{d.resumen}</p>
              {d.objetivos_clave && d.objetivos_clave.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 11, color: '#1d1d1f', lineHeight: 1.5 }}>
                  {d.objetivos_clave.map((o, j) => <li key={j}>{o}</li>)}
                </ul>
              )}
              {d.url_oficial && (
                <a href={d.url_oficial} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, display: 'inline-block', fontSize: 10.5, color: '#1F4E8C', fontWeight: 600, textDecoration: 'none' }}>
                  Descargar PDF oficial ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* ORGANIGRAMA SVG */}
      <Panel title="Organigrama institucional + cadena de adquisiciones" subtitle="Click en cualquier nodo para ver detalle · color por tipo de organismo" marginBottom>
        <OrganigramaSVG nodos={pais.organigrama.nodos} onSelectNode={setSelectedNode}/>
        {/* Detalle nodo seleccionado */}
        {selectedNode && (
          <div style={{ marginTop: 12, padding: 14, background: `${TIPO_COLOR[selectedNode.tipo] || '#525258'}10`, borderRadius: 10, borderLeft: `3px solid ${TIPO_COLOR[selectedNode.tipo] || '#525258'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <p style={{ margin: 0, fontSize: 9.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {selectedNode.tipo.replace(/_/g, ' ')}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>{selectedNode.nombre}</p>
              </div>
              {selectedNode.presupuesto_usd_m && (
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1F4E8C', fontFamily: 'var(--font-display)' }}>
                  {selectedNode.presupuesto_usd_m >= 1000 ? `${(selectedNode.presupuesto_usd_m / 1000).toFixed(1)} bn$` : `${selectedNode.presupuesto_usd_m} M$`}
                </span>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#3a3a3d', lineHeight: 1.4 }}>{selectedNode.descripcion_corta}</p>
            {selectedNode.url_oficial && (
              <a href={selectedNode.url_oficial} target="_blank" rel="noopener noreferrer" style={{ marginTop: 6, display: 'inline-block', fontSize: 11, color: TIPO_COLOR[selectedNode.tipo], fontWeight: 600 }}>
                Web oficial ↗
              </a>
            )}
          </div>
        )}
        {/* Leyenda */}
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10, padding: 10, background: '#FAFAFB', borderRadius: 8, fontSize: 10.5 }}>
          {Object.entries(TIPO_COLOR).map(([tipo, color]) => (
            <span key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: color, borderRadius: 2 }}/>
              <span style={{ color: '#3a3a3d', textTransform: 'capitalize' }}>{tipo.replace(/_/g, ' ')}</span>
            </span>
          ))}
        </div>
      </Panel>

      {/* EMPRESAS CLAVE */}
      <Panel title={`Base industrial · ${pais.empresas_clave.length} empresas tractoras`} subtitle="Primes + tier1 con revenue defensa, capacidades y exportaciones" marginBottom>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
          {pais.empresas_clave.map(e => (
            <div key={e.nombre} style={{ padding: 12, background: '#FAFAFA', borderRadius: 10, border: '1px solid #ECECEF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{e.nombre}</p>
                  {e.ticker && <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}>{e.ticker}</p>}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: e.tipo === 'prime_contractor' ? '#1F4E8C' : e.tipo === 'empresa_publica' ? '#DC2626' : '#525258', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {e.tipo.replace(/_/g, ' ')}
                </span>
              </div>
              {e.revenue_defensa_usd_m && (
                <p style={{ margin: '4px 0', fontSize: 11, color: '#1F4E8C' }}>
                  Revenue defensa: <strong style={{ fontFamily: 'var(--font-display)' }}>{(e.revenue_defensa_usd_m / 1000).toFixed(1)} bn$</strong>
                </p>
              )}
              <p style={{ margin: '6px 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>CAPACIDADES</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                {e.capacidades.map(c => (
                  <span key={c} style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 4, background: '#fff', border: '1px solid #ECECEF', color: '#3a3a3d' }}>{c}</span>
                ))}
              </div>
              {e.programas_activos && e.programas_activos.length > 0 && (
                <>
                  <p style={{ margin: '4px 0 2px', fontSize: 9, color: '#16A34A', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>PROGRAMAS ACTIVOS</p>
                  <p style={{ margin: 0, fontSize: 10.5, color: '#3a3a3d' }}>{e.programas_activos.join(' · ')}</p>
                </>
              )}
              {e.exporta_a && e.exporta_a.length > 0 && (
                <p style={{ margin: '6px 0 0', fontSize: 10, color: '#7C3AED' }}>
                  Exporta a: <strong>{e.exporta_a.join(', ')}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* OBJETIVOS DE CAPACIDAD */}
      <Panel title="Objetivos de capacidad declarados" subtitle="Estado actual de los compromisos de modernización" marginBottom>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 8 }}>
          {pais.objetivos_capacidad.map((o, i) => (
            <div key={i} style={{ padding: 12, background: '#FAFAFA', borderRadius: 10, borderLeft: `3px solid ${ESTADO_COLOR[o.estado] || '#525258'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: '#1d1d1f', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {o.dominio}
                </span>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: `${ESTADO_COLOR[o.estado]}20`, color: ESTADO_COLOR[o.estado], fontWeight: 700, textTransform: 'uppercase' }}>
                  {o.estado.replace(/_/g, ' ')}
                </span>
              </div>
              <p style={{ margin: '4px 0', fontSize: 12, color: '#1d1d1f', lineHeight: 1.4 }}>{o.meta}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6e6e73', marginTop: 4 }}>
                {o.programa_vinculado && <span>Programa: <strong>{o.programa_vinculado}</strong></span>}
                {o.plazo_declarado && <span>Plazo: <strong>{o.plazo_declarado}</strong></span>}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

// ─── ORGANIGRAMA SVG ────────────────────────────────────────────────────

function OrganigramaSVG({ nodos, onSelectNode }: { nodos: OrgNode[]; onSelectNode: (n: OrgNode) => void }) {
  // Agrupar por nivel
  const nodosPorNivel: Record<number, OrgNode[]> = {}
  for (const n of nodos) {
    if (!nodosPorNivel[n.nivel]) nodosPorNivel[n.nivel] = []
    nodosPorNivel[n.nivel].push(n)
  }
  const niveles = Object.keys(nodosPorNivel).map(Number).sort()

  const W = 1100
  const NIVEL_H = 110
  const H = niveles.length * NIVEL_H + 40

  // Calcular posiciones
  const posiciones = new Map<string, { x: number; y: number; w: number }>()
  for (const nivel of niveles) {
    const nodosNivel = nodosPorNivel[nivel]
    const espacio = W / (nodosNivel.length + 1)
    nodosNivel.forEach((n, i) => {
      const x = espacio * (i + 1)
      const y = (nivel - 1) * NIVEL_H + 50
      const w = Math.min(160, espacio - 10)
      posiciones.set(n.id, { x, y, w })
    })
  }

  return (
    <div style={{ overflowX: 'auto', background: '#FAFAFB', borderRadius: 10, padding: 8 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Conexiones (líneas) */}
        {nodos.filter(n => n.parent_id).map(n => {
          const a = posiciones.get(n.parent_id!)
          const b = posiciones.get(n.id)
          if (!a || !b) return null
          // Curva: bajar de a, ir horizontal, subir a b
          const midY = (a.y + b.y) / 2 + 18
          const path = `M ${a.x} ${a.y + 18} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y - 18}`
          return <path key={n.id} d={path} fill="none" stroke="#CBD5E0" strokeWidth={1.2}/>
        })}

        {/* Nodos */}
        {nodos.map(n => {
          const p = posiciones.get(n.id)
          if (!p) return null
          const color = TIPO_COLOR[n.tipo] || '#525258'
          const w = p.w
          const h = 36
          return (
            <g key={n.id} style={{ cursor: 'pointer' }} onClick={() => onSelectNode(n)}>
              <rect x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} fill="#fff" stroke={color} strokeWidth={2} rx={6}/>
              <text x={p.x} y={p.y - 2} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: color }}>
                {n.nombre_corto.length > 16 ? n.nombre_corto.slice(0, 15) + '…' : n.nombre_corto}
              </text>
              <text x={p.x} y={p.y + 11} textAnchor="middle" style={{ fontSize: 8.5, fill: '#6e6e73' }}>
                {n.presupuesto_usd_m ? `${(n.presupuesto_usd_m / 1000).toFixed(1)}bn$` : n.tipo.replace(/_/g, ' ').slice(0, 16)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
