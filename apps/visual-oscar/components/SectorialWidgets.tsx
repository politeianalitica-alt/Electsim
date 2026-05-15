'use client'
/**
 * Componentes reutilizables para los dashboards sectoriales:
 *   - HeroKPI · KPI con valor + unidad + accent color
 *   - Panel · contenedor con header
 *   - EmpresasGrid · 2-col grid de empresas
 *   - RegLista · lista de reguladores
 *   - ProgramasGrid · grid de programas
 *   - AreasTematicas · 4-col grid de áreas
 *   - LicitacionesShortcut · top 5 contratos por CPV
 *   - SerieLineChart · gráfica de línea con tooltip hover interactivo
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { SectorEmpresa, SectorRegulador, SectorPrograma, SectorArea } from '@/lib/sources/sectorial-data'
import { ChartTooltip, useChartTooltip } from '@/components/ChartTooltip'

export function HeroKPI({ label, value, unit, accent, sub, decimals = 0 }: {
  label: string; value: number | null | undefined; unit: string; accent: string; sub?: string; decimals?: number
}) {
  const display = value == null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
  return (
    <div style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:12, padding:'12px 14px' }}>
      <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', opacity:0.72, marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, letterSpacing:'-0.02em', color: accent }}>
        {display}<span style={{ fontSize:11, fontWeight:600, marginLeft:5, opacity:0.85 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize:10, opacity:0.6, marginTop:2 }}>{sub}</div>}
    </div>
  )
}

export function Panel({ title, subtitle, children, marginBottom }: {
  title: string; subtitle?: string; children: React.ReactNode; marginBottom?: boolean
}) {
  return (
    <section style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px',
      marginBottom: marginBottom ? 14 : 0,
    }}>
      <header style={{ marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'baseline', flexWrap:'wrap', gap:8 }}>
        <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600, letterSpacing:'-0.013em', color:'#1d1d1f' }}>{title}</h2>
        {subtitle && <p style={{ margin:0, fontSize:11, color:'#6e6e73' }}>{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

export function EmpresasGrid({ empresas, accent }: { empresas: readonly SectorEmpresa[]; accent: string }) {
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
      {empresas.map(e => (
        <li key={e.nombre}>
          <a href={e.web} target="_blank" rel="noreferrer" style={{
            display:'block', padding:'10px 12px', background:'#FAFAFA', borderRadius:10,
            border:'1px solid #ECECEF', textDecoration:'none', color:'inherit',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:6, flexWrap:'wrap' }}>
              <span style={{ fontWeight:700, fontFamily:'var(--font-display)', fontSize:13.5, color:'#1d1d1f' }}>{e.nombre}</span>
              <div style={{ display:'flex', gap:4 }}>
                {e.ibex && <span style={{ fontSize:8.5, fontWeight:800, padding:'2px 6px', borderRadius:4, background:'#FCD34D', color:'#92400E' }}>IBEX 35</span>}
                {e.publica && <span style={{ fontSize:8.5, fontWeight:800, padding:'2px 6px', borderRadius:4, background:'#1F4E8C', color:'#fff' }}>PÚBLICA</span>}
              </div>
            </div>
            {e.ticker !== '—' && <div style={{ fontSize:10, color:'#86868b', fontFamily:'monospace', marginTop:2 }}>{e.ticker} {e.capitalizacion_b > 0 && `· ${e.capitalizacion_b}b€`}</div>}
            <div style={{ fontSize:11, color:'#3a3a3d', marginTop:4, lineHeight:1.4 }}>{e.descripcion}</div>
            <div style={{ fontSize:9.5, color: accent, fontWeight:700, marginTop:5, letterSpacing:'0.04em', textTransform:'uppercase' }}>{e.segmento}</div>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function RegLista({ reguladores }: { reguladores: readonly SectorRegulador[] }) {
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8 }}>
      {reguladores.map(r => (
        <li key={r.nombre}>
          <a href={r.web} target="_blank" rel="noreferrer" style={{
            display:'block', padding:'10px 12px', background:'#FAFAFA', borderRadius:10,
            border:'1px solid #ECECEF', textDecoration:'none', color:'inherit',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:6, alignItems:'baseline' }}>
              <span style={{ fontWeight:700, fontSize:12.5, color:'#1d1d1f' }}>{r.nombre}</span>
              <span style={{ fontSize:10, color:'#86868b', maxWidth:200, textAlign:'right' }}>{r.full}</span>
            </div>
            <div style={{ fontSize:11, color:'#3a3a3d', marginTop:4, lineHeight:1.4 }}>{r.competencias}</div>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function ProgramasGrid({ programas, columns = 3 }: { programas: readonly SectorPrograma[]; columns?: number }) {
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gridTemplateColumns:`repeat(${columns},1fr)`, gap:10 }}>
      {programas.map(p => (
        <li key={p.programa} style={{
          padding:'12px 16px', background:'#FAFAFA', borderRadius:10, border:'1px solid #ECECEF',
          borderLeft:`4px solid ${p.color}`,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:3, gap:6 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f' }}>{p.programa}</span>
            <span style={{
              fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999,
              background:`${p.color}20`, color: p.color, letterSpacing:'0.04em', whiteSpace:'nowrap',
            }}>{p.estado.toUpperCase()}</span>
          </div>
          <div style={{ fontSize:11.5, color:'#3a3a3d', lineHeight:1.4, margin:'4px 0' }}>{p.descripcion}</div>
          {p.presupuesto_b > 0 && (
            <div style={{ textAlign:'right', fontSize:10.5, color:'#1F4E8C', fontFamily:'var(--font-display)', fontWeight:700 }}>
              {p.presupuesto_b}b € presupuesto
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export function AreasTematicas({ areas }: { areas: readonly SectorArea[] }) {
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
      {areas.map(a => (
        <li key={a.titulo} style={{
          padding:'12px 14px', background:'#FAFAFA', borderRadius:10, border:'1px solid #ECECEF',
          borderTop:`3px solid ${a.color}`,
        }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f', letterSpacing:'-0.01em' }}>{a.titulo}</div>
          <div style={{ fontSize:11, color:'#3a3a3d', marginTop:5, lineHeight:1.4 }}>{a.desc}</div>
        </li>
      ))}
    </ul>
  )
}

export function LicitacionesShortcut({ cpv_div, label }: { cpv_div: string; label: string }) {
  const [count, setCount] = useState<number | null>(null)
  const [items, setItems] = useState<Array<{ id: string; objeto: string; organo: string; importe?: number; url?: string }>>([])
  useEffect(() => {
    fetch(`/api/licitaciones/buscar?cpv_div=${cpv_div}&page_size=5&sort=date_desc`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setCount(d.pagination?.total_estimado ?? d.stats?.total ?? 0)
        setItems((d.items || []).slice(0, 5).map((it: { id: string; objeto: string; organo: string; importe_adjudicacion?: number; importe_licitacion?: number; url?: string }) => ({
          id: it.id, objeto: it.objeto, organo: it.organo,
          importe: it.importe_adjudicacion ?? it.importe_licitacion,
          url: it.url,
        })))
      })
  }, [cpv_div])
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
        <span style={{ fontSize:11, color:'#6e6e73' }}>Últimos contratos · {label}</span>
        <Link href={`/licitaciones?cpv_div=${cpv_div}`} style={{ fontSize:11, color:'#1F4E8C', textDecoration:'none', fontWeight:600 }}>
          Ver buscador {count != null && `· ${count.toLocaleString('es-ES')} en total ›`}
        </Link>
      </div>
      <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8 }}>
        {items.length === 0 && <li style={{ fontSize:11, color:'#86868b' }}>Cargando…</li>}
        {items.map(it => (
          <li key={it.id} style={{ padding:'8px 10px', background:'#FAFAFA', borderRadius:8, border:'1px solid #ECECEF' }}>
            <a href={it.url || '#'} target="_blank" rel="noreferrer" style={{ color:'inherit', textDecoration:'none' }}>
              <div style={{ fontSize:11.5, color:'#1d1d1f', fontWeight:600, lineHeight:1.4 }}>{it.objeto.length > 90 ? it.objeto.slice(0, 89) + '…' : it.objeto}</div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:10.5 }}>
                <span style={{ color:'#86868b' }}>{it.organo}</span>
                {it.importe && (
                  <span style={{ fontFamily:'var(--font-display)', color:'#1F4E8C', fontWeight:700 }}>
                    {(it.importe / 1_000_000).toFixed(2)}M €
                  </span>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Línea SVG con tooltip hover interactivo (HTML overlay). Cada punto
 * tiene una hover-zone amplia (rect transparente) + circle highlight
 * al pasar el ratón. El tooltip muestra etiqueta + valor + extra.
 */
export function SerieLineChart({ points, color = '#1F4E8C', height = 180, formatY, unit, label }: {
  points: Array<{ t: string; v: number | null }>
  color?: string
  height?: number
  formatY?: (n: number) => string
  unit?: string
  label?: string
}) {
  const { tooltip, show, hide } = useChartTooltip()
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const valid = points.filter(p => p.v != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12, padding:20, textAlign:'center' }}>Sin datos disponibles</div>

  const W = 520
  const H = height
  const P = 28
  const values = valid.map(p => p.v as number)
  const maxY = Math.max(...values) * 1.05
  const minY = Math.min(...values) * 0.95
  const range = maxY - minY || 1

  const path = valid.map((p, i) => {
    const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
    const y = P + (1 - ((p.v as number) - minY) / range) * (H - 2 * P)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const fmt = formatY || ((n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 }))
  const step = Math.max(1, Math.ceil(valid.length / 6))
  const hoverWidth = (W - 2 * P) / Math.max(1, valid.length - 1)

  return (
    <div style={{ position:'relative' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 22}`} style={{ display:'block', overflow:'visible' }}>
        {[0, 0.5, 1].map(g => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth={2.5}/>
        {/* Línea vertical de hover */}
        {hoverIdx != null && (() => {
          const x = P + (hoverIdx / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return <line x1={x} x2={x} y1={P} y2={H - P} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4}/>
        })()}
        {/* Puntos · highlight si hover */}
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          const y = P + (1 - ((p.v as number) - minY) / range) * (H - 2 * P)
          const active = hoverIdx === i
          return (
            <g key={p.t}>
              <circle cx={x} cy={y} r={active ? 5 : 2.5} fill={color} stroke="#fff" strokeWidth={active ? 2 : 0}/>
              <title>{p.t}: {fmt(p.v as number)}{unit ? ` ${unit}` : ''}</title>
            </g>
          )
        })}
        {/* Hover zones invisibles · una por punto */}
        {valid.map((p, i) => {
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return (
            <rect
              key={`h-${p.t}`}
              x={x - hoverWidth / 2} y={P}
              width={hoverWidth} height={H - 2 * P}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => {
                setHoverIdx(i)
                const xPct = (x / W) * 100
                const yVal = (p.v as number)
                const yPct = (P + (1 - (yVal - minY) / range) * (H - 2 * P)) / (H + 22) * 100
                show({
                  x: xPct, y: yPct,
                  label: label ? `${label} · ${p.t}` : p.t,
                  value: fmt(yVal),
                  unit, color,
                })
              }}
              onMouseLeave={() => { setHoverIdx(null); hide() }}
            />
          )
        })}
        {valid.filter((_, i) => i % step === 0).map(p => {
          const i = valid.findIndex(v => v.t === p.t)
          const x = P + (i / Math.max(1, valid.length - 1)) * (W - 2 * P)
          return <text key={p.t} x={x} y={H + 12} textAnchor="middle" style={{ fontSize:9, fill:'#86868b' }}>{p.t}</text>
        })}
        <text x={4} y={P + 4} style={{ fontSize:9, fill:'#86868b' }}>{fmt(maxY)}</text>
        <text x={4} y={H - P + 4} style={{ fontSize:9, fill:'#86868b' }}>{fmt(minY)}</text>
      </svg>
      <ChartTooltip tooltip={tooltip}/>
    </div>
  )
}

export function SectorHero({ accent, accentDark, eyebrow, title, sub, updatedAt, fetchMs, onRefresh, kpis }: {
  accent: string; accentDark: string; eyebrow: string; title: string; sub: string
  updatedAt: Date | null; fetchMs?: number
  onRefresh: () => void
  kpis: React.ReactNode
}) {
  return (
    <section style={{
      background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)`,
      borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
      display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:32, alignItems:'center',
    }}>
      <div>
        <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.16em', opacity:0.8, textTransform:'uppercase', margin:'0 0 8px' }}>
          {eyebrow}
        </p>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 10px', lineHeight:1.05 }}>
          {title}
        </h1>
        <p style={{ fontSize:13.5, opacity:0.8, margin:0, lineHeight:1.5 }}>{sub}</p>
        {updatedAt && (
          <div style={{ marginTop:14, display:'flex', gap:10, alignItems:'center', fontSize:11, opacity:0.7 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#86EFAC', boxShadow:'0 0 8px #86EFAC' }}/>
            Última actualización · {updatedAt.toLocaleTimeString('es-ES')}{fetchMs ? ` · ${fetchMs} ms` : ''}
            <button onClick={onRefresh} style={{
              marginLeft:8, fontSize:10.5, padding:'4px 12px', borderRadius:999,
              border:'1px solid rgba(255,255,255,0.35)', background:'transparent', color:'#fff',
              cursor:'pointer', fontFamily:'inherit',
            }}>↻ Actualizar</button>
          </div>
        )}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>{kpis}</div>
    </section>
  )
}
