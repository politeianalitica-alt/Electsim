'use client'
/**
 * Dashboard Sector Defensa & Industria — Pestaña: Situación
 *
 * Datos en vivo desde:
 *   - World Bank (gasto militar % PIB y absoluto USD · serie histórica + comparativa OTAN)
 *   - TED v3 + PLACSP + Catalunya Socrata (contratos defensa CPV 35)
 *
 * Auto-refresh cada 60 min (datos anuales mayoritariamente).
 * Layout y AppHeader provistos por layout.tsx — no duplicar aquí.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { EMPRESAS_DEFENSA, REGULADORES_DEFENSA, PROGRAMAS_DEFENSA } from '@/lib/sources/worldbank'
import { Panel } from '@/components/SectorPanel'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
import { analizarPosicionamientoDefensa, calcularThreatRadar, generarBriefingDiario } from '@/lib/defense/analisis-defensa'
import { ThreatRadarChart } from './_components/ThreatRadar'
import { DailyBriefingCard } from './_components/DailyBriefing'
import { PosicionamientoCard } from './_components/PosicionamientoCard'
import { EmpresasCotizadasStrip, BriefingAudio } from './_components/EmpresasCotizadasStrip'

interface ResumenResp {
  kpis: {
    gasto_pct_pib: number | null
    gasto_pct_pib_year?: number
    gasto_usd_b: number | null
    gasto_usd_b_year?: number
    gap_otan_pp: number | null
    compromiso_otan_pct: number
    contratos_defensa_90d: number
  }
  fetch_ms: number
}
interface GastoResp {
  points: Array<{ year: number; pct_pib: number | null; usd_b: number | null }>
}
interface OtanResp {
  items: Array<{ iso3: string; pais: string; pct_pib: number | null; year: number | null; cumple_otan: boolean | null; destacado?: boolean }>
  year: number
  media_otan: number
  cumplen_pct: number
  no_cumplen_pct: number
}
interface ContratosResp {
  items: Array<{
    id: string; fuente: string; fuente_label: string
    objeto: string; organo: string; cpv?: string
    importe_licitacion?: number; importe_adjudicacion?: number
    fecha_publicacion?: string; url?: string; expediente?: string
    adjudicatario?: string
  }>
  stats: { por_fuente: Record<string, number>; importe_total_M: number; sources: Array<{ fuente: string; ok: boolean; items: number; ms: number }> }
}

const ACCENT = '#525258'
const ACCENT_DARK = '#1d1d1f'
const REFRESH_MS = 60 * 60 * 1000

const FUENTE_COLOR: Record<string, string> = {
  CATALUNYA_SOCRATA: '#F97316',
  PLACSP: '#1F4E8C',
  VALENCIA_CKAN: '#DC2626',
  TED: '#0EA5E9',
}

export default function SectorDefensaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [resumen, setResumen] = useState<ResumenResp | null>(null)
  const [gasto, setGasto] = useState<GastoResp | null>(null)
  const [otan, setOtan] = useState<OtanResp | null>(null)
  const [contratos, setContratos] = useState<ContratosResp | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [r, g, o, c] = await Promise.all([
      fetch('/api/sectores/defensa/resumen').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/defensa/gasto-militar?from=2000').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/defensa/comparativa-otan').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/defensa/contratos?days=180&limit=15').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    setResumen(r); setGasto(g); setOtan(o); setContratos(c)
    setUpdatedAt(new Date()); setLoading(false)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ paddingTop: 24 }}>
      {/* HERO */}
      <section style={{
        background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`,
        borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
        display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:32, alignItems:'center',
      }}>
        <div>
          <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.16em', opacity:0.8, textTransform:'uppercase', margin:'0 0 8px' }}>
            SECTORIAL · DEFENSA & INDUSTRIA · GASTO MILITAR + CONTRATACIÓN
          </p>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 10px', lineHeight:1.05 }}>
            Industria de defensa española <em style={{ fontWeight:300, fontStyle:'italic', opacity:0.75 }}>en datos abiertos</em>
          </h1>
          <p style={{ fontSize:13.5, opacity:0.8, margin:0, lineHeight:1.5 }}>
            Gasto militar % PIB · comparativa OTAN · contratos públicos defensa (CPV 35) ·
            programas estratégicos en curso · empresas tractoras del sector. Series del Banco Mundial
            y feeds en vivo TED + PLACSP + Catalunya.
          </p>
          {updatedAt && (
            <div style={{ marginTop:14, display:'flex', gap:10, alignItems:'center', fontSize:11, opacity:0.7 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#86EFAC', boxShadow:'0 0 8px #86EFAC' }}/>
              Última actualización · {updatedAt.toLocaleTimeString('es-ES')}
              {resumen?.fetch_ms ? ` · ${resumen.fetch_ms} ms` : ''}
              <button onClick={refresh} style={{
                marginLeft:8, fontSize:10.5, padding:'4px 12px', borderRadius:999,
                border:'1px solid rgba(255,255,255,0.35)', background:'transparent', color:'#fff',
                cursor:'pointer', fontFamily:'inherit',
              }}>↻ Actualizar</button>
            </div>
          )}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
          <HeroKPI label={`Gasto militar (${resumen?.kpis.gasto_pct_pib_year || ''})`}
            value={resumen?.kpis.gasto_pct_pib} unit="% PIB" accent="#FCD34D" decimals={2}/>
          <HeroKPI label={`Gasto absoluto (${resumen?.kpis.gasto_usd_b_year || ''})`}
            value={resumen?.kpis.gasto_usd_b} unit="b USD" accent="#7DD3FC" decimals={1}/>
          <HeroKPI label="Brecha objetivo OTAN" value={resumen?.kpis.gap_otan_pp} unit="pp" accent="#FCA5A5" decimals={2}
            sub={`vs ${resumen?.kpis.compromiso_otan_pct || 2}% comprometido`}/>
          <HeroKPI label="Contratos CPV 35" value={resumen?.kpis.contratos_defensa_90d} unit=""
            accent="#86EFAC" sub="últimos 90 días"/>
        </div>
      </section>

      {/* MERCADOS DE DEFENSA · EMPRESAS COTIZADAS EUROPA + GLOBAL */}
      <Panel title="Mercados de defensa · cotización en vivo" subtitle="Empresas cotizadas europeas + USA + Israel · 23 fichas con estructura completa · click para abrir ficha detallada (estructura · programas · joint ventures · sanciones · cultura)" marginBottom>
        <EmpresasCotizadasStrip/>
      </Panel>

      {/* BRIEFING DEL DÍA (con audio TTS) */}
      {(() => {
        if (!resumen || !contratos) return null
        const fechaHoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        const textoBriefing = `Briefing del sector defensa, ${fechaHoy}. ` +
          `España gasta el ${resumen.kpis.gasto_pct_pib?.toFixed(2) || '?'} por ciento del PIB en defensa, ` +
          `con ${resumen.kpis.contratos_defensa_90d || 0} contratos publicados en los últimos 90 días por valor de ${contratos.stats.importe_total_M?.toFixed(0) || 0} millones de euros. ` +
          `La brecha respecto al objetivo OTAN del ${resumen.kpis.compromiso_otan_pct || 2} por ciento es de ${resumen.kpis.gap_otan_pp?.toFixed(2) || '?'} puntos. ` +
          `Programas estratégicos en curso: FCAS, S-80 Plus, Fragatas F-110, VCR Dragón, NASAMS y Eurodrone.`
        return (
          <Panel title="Briefing del día · resumen ejecutivo" subtitle={fechaHoy} marginBottom>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.6 }}>{textoBriefing}</p>
              <BriefingAudio texto={textoBriefing}/>
            </div>
          </Panel>
        )
      })()}

      {/* ANÁLISIS IA + THREAT RADAR + BRIEFING */}
      {(() => {
        if (!resumen || !contratos) return null
        const pos = analizarPosicionamientoDefensa({
          gastoPctPib: resumen.kpis.gasto_pct_pib,
          gastoUsdB: resumen.kpis.gasto_usd_b,
          gapOtanPp: resumen.kpis.gap_otan_pp,
          compromisoOtanPct: resumen.kpis.compromiso_otan_pct,
          nContratosUltimos90d: resumen.kpis.contratos_defensa_90d,
          importeContratos90dM: contratos.stats.importe_total_M,
          nSancionesRelevantes: 0,
          nProgramasActivos: PROGRAMAS_DEFENSA.filter(p => p.estado === 'activo').length,
          nProgramasEnRiesgo: PROGRAMAS_DEFENSA.filter(p => p.estado !== 'activo').length,
          cumplenOtanPct: otan?.cumplen_pct || 0,
          mediaOtan: otan?.media_otan || 0,
        })
        const radar = calcularThreatRadar({
          nSancionesRusia: 25,
          programasCiber: 3,
          contratosCiber90d: contratos.items.filter(c => /ciber|cyber|TIC|telecom/i.test(c.objeto)).length,
          paisesAltoRiesgo: 6,
        })
        const topContrato = contratos.items.filter(c => c.importe_adjudicacion || c.importe_licitacion)
          .sort((a, b) => (b.importe_adjudicacion || b.importe_licitacion || 0) - (a.importe_adjudicacion || a.importe_licitacion || 0))[0]
        const programaCritico = PROGRAMAS_DEFENSA.find(p => p.estado !== 'activo')
        const briefing = generarBriefingDiario({
          posicionamiento: pos,
          threatRadar: radar,
          topContrato: topContrato ? { objeto: topContrato.objeto, importe: topContrato.importe_adjudicacion || topContrato.importe_licitacion, adjudicatario: topContrato.adjudicatario, fuente_label: topContrato.fuente_label } : undefined,
          programaCritico: programaCritico ? { nombre: programaCritico.programa, estado: programaCritico.estado } : undefined,
        })
        return (
          <>
            <Panel title="Análisis estratégico IA · Posicionamiento España" subtitle="Score multifactor sobre 5 dimensiones · OTAN + contratación + programas" marginBottom>
              <PosicionamientoCard pos={pos}/>
            </Panel>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
              <Panel title="Threat Radar · 6 dominios operacionales OTAN" subtitle={`Nivel global ${radar.nivelGlobal}/100 · doctrina multi-dominio`}>
                <ThreatRadarChart radar={radar}/>
              </Panel>
              <Panel title="Briefing diario IA · Defensa España" subtitle="Síntesis ejecutiva automática">
                <DailyBriefingCard briefing={briefing}/>
              </Panel>
            </div>
          </>
        )
      })()}

      {/* ROW 1: Evolución gasto militar + Comparativa OTAN */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
        <Panel
          title="Evolución del gasto militar · 25 años"
          subtitle="% PIB y absoluto en miles de millones USD · Banco Mundial"
          sourceUrl="https://datos.bancomundial.org/indicador/MS.MIL.XPND.GD.ZS?locations=ES"
          sourceLabel="Banco Mundial"
          sourceTooltip="Gasto militar · % PIB · serie España"
          apiUrl="/api/sectores/defensa/gasto-militar?from=2000"
        >
          {gasto && <GastoLineChart data={gasto.points}/>}
        </Panel>
        <Panel
          title="Comparativa OTAN"
          subtitle={otan ? `Año ${otan.year} · ${otan.cumplen_pct} de ${otan.items.length} cumplen 2 % PIB · media ${otan.media_otan?.toFixed(2)} %` : 'Cargando…'}
          sourceUrl="https://www.nato.int/cps/en/natohq/topics_49198.htm"
          sourceLabel="OTAN"
          sourceTooltip="Defence Expenditure · NATO Annual Report"
          apiUrl="/api/sectores/defensa/comparativa-otan"
        >
          {otan && <OtanComparativa items={otan.items}/>}
        </Panel>
      </div>

      {/* ROW 2: Contratos recientes defensa */}
      <Panel
        title="Últimos contratos del sector defensa"
        subtitle={contratos ? `${contratos.items.length} contratos · ${contratos.stats.importe_total_M} M€ · ${contratos.stats.sources.filter(s => s.ok).length}/${contratos.stats.sources.length} fuentes activas` : 'Cargando…'}
        marginBottom
        sourceUrl="https://www.contrataciondelestado.gob.es/"
        sourceLabel="PLACSP"
        sourceTooltip="Plataforma de Contratación del Sector Público · CPV 35"
        apiUrl="/api/sectores/defensa/contratos?days=180&limit=15"
      >
        {contratos && <ContratosList items={contratos.items}/>}
      </Panel>

      {/* ROW 3: Programas estratégicos */}
      <Panel title="Programas estratégicos en curso" subtitle="FCAS, S-80, F-110, Eurofighter, NH-90, Spainsat, A400M, VCR Dragón" marginBottom>
        <ProgramasGrid/>
      </Panel>

      {/* ROW 4: Empresas + Reguladores */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
        <Panel title="Empresas tractoras del sector" subtitle={`${EMPRESAS_DEFENSA.length} compañías · IBEX y públicas + privadas tier 1`}>
          <EmpresasGrid/>
        </Panel>
        <Panel title="Reguladores y operadores" subtitle="Marco institucional defensa">
          <RegLista/>
        </Panel>
      </div>

      {/* ROW 5: Áreas estratégicas */}
      <Panel title="Áreas estratégicas del sector" subtitle="Topic taxonomy · Politeia">
        <AreasTematicas/>
      </Panel>

      {/* Politeia intel · defense_programs próximos hitos · compact (la página ya tiene programas/presupuestos) */}
      <SectorIntelPanel
        sector="defensa"
        compact
        detailHref="/sector-defensa/programas"
        detailLabel="Ver programas completos →"
      />

      {loading && <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'#86868b' }}>Cargando datos…</div>}
    </div>
  )
}

// ─── Componentes internos ─────────────────────────────────────────

function HeroKPI({ label, value, unit, accent, sub, decimals = 0 }: { label: string; value: number | null | undefined; unit: string; accent: string; sub?: string; decimals?: number }) {
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

function GastoLineChart({ data }: { data: Array<{ year: number; pct_pib: number | null; usd_b: number | null }> }) {
  const valid = data.filter(d => d.pct_pib != null)
  if (!valid.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin datos</div>

  const W = 700, H = 220, P = 30
  const minY = 1.0
  const maxY = Math.max(2.5, ...valid.map(d => d.pct_pib || 0))
  const minX = valid[0].year
  const maxX = valid[valid.length - 1].year

  const path = valid.map((d, i) => {
    const x = P + ((d.year - minX) / (maxX - minX)) * (W - 2 * P)
    const y = P + (1 - ((d.pct_pib || 0) - minY) / (maxY - minY)) * (H - 2 * P)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const maxUsd = Math.max(1, ...valid.map(d => d.usd_b || 0))

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 40}`} style={{ display:'block' }}>
        {(() => {
          const y2 = P + (1 - (2.0 - minY) / (maxY - minY)) * (H - 2 * P)
          return <>
            <line x1={P} x2={W - P} y1={y2} y2={y2} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="6 4"/>
            <text x={W - P - 4} y={y2 - 4} textAnchor="end" style={{ fontSize:9, fill:'#DC2626', fontWeight:700 }}>2 % OTAN</text>
          </>
        })()}
        {[0, 0.25, 0.5, 0.75, 1].map(g => (
          <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7"/>
        ))}
        {valid.map((d) => {
          if (!d.usd_b) return null
          const cw = (W - 2 * P) / valid.length - 2
          const x = P + ((d.year - minX) / (maxX - minX)) * (W - 2 * P) - cw / 2
          const h = (d.usd_b / maxUsd) * 30
          return (
            <rect key={d.year} x={x} y={H - P + 4} width={cw} height={h} fill="#1F4E8C30">
              <title>{d.year}: {d.usd_b}b USD</title>
            </rect>
          )
        })}
        <path d={path} fill="none" stroke="#525258" strokeWidth={2}/>
        {valid.map((d) => {
          const x = P + ((d.year - minX) / (maxX - minX)) * (W - 2 * P)
          const y = P + (1 - ((d.pct_pib || 0) - minY) / (maxY - minY)) * (H - 2 * P)
          return <circle key={d.year} cx={x} cy={y} r={3} fill="#525258"><title>{d.year}: {d.pct_pib?.toFixed(2)}% PIB</title></circle>
        })}
        {valid.filter((_, i) => i % 4 === 0).map(d => {
          const x = P + ((d.year - minX) / (maxX - minX)) * (W - 2 * P)
          return <text key={d.year} x={x} y={H + 14} textAnchor="middle" style={{ fontSize:9.5, fill:'#86868b' }}>{d.year}</text>
        })}
        {[1.0, 1.5, 2.0, 2.5].filter(v => v <= maxY).map(v => {
          const y = P + (1 - (v - minY) / (maxY - minY)) * (H - 2 * P)
          return <text key={v} x={4} y={y + 3} style={{ fontSize:9, fill:'#86868b' }}>{v.toFixed(1)}%</text>
        })}
      </svg>
      <div style={{ display:'flex', gap:14, fontSize:11, marginTop:8 }}>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:14, height:2, background:'#525258' }}/>
          <span style={{ color:'#3a3a3d', fontWeight:600 }}>% PIB</span>
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:14, height:6, background:'#1F4E8C30' }}/>
          <span style={{ color:'#3a3a3d', fontWeight:600 }}>USD absoluto (escala secundaria)</span>
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:14, height:2, background:'#DC2626' }}/>
          <span style={{ color:'#DC2626', fontWeight:700 }}>Compromiso OTAN 2 %</span>
        </span>
      </div>
    </div>
  )
}

function OtanComparativa({ items }: { items: Array<{ iso3: string; pais: string; pct_pib: number | null; cumple_otan: boolean | null; destacado?: boolean }> }) {
  const max = Math.max(2.5, ...items.map(i => i.pct_pib || 0))
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:7 }}>
      {items.map(it => {
        const v = it.pct_pib ?? 0
        const w = (v / max) * 100
        const colorBar = it.cumple_otan ? '#16A34A' : '#DC2626'
        return (
          <li key={it.iso3}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', fontSize:11, marginBottom:3 }}>
              <span style={{
                color: it.destacado ? '#1d1d1f' : '#3a3a3d',
                fontWeight: it.destacado ? 800 : 600,
                background: it.destacado ? '#FCD34D40' : 'transparent',
                padding: it.destacado ? '0 4px' : 0, borderRadius:3,
              }}>{it.pais}</span>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color: colorBar }}>
                {v.toFixed(2)}%
              </span>
            </div>
            <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden', position:'relative' }}>
              <div style={{ width:`${w}%`, height:'100%', background: colorBar }}/>
              <div style={{ position:'absolute', top:0, bottom:0, left:`${(2 / max) * 100}%`, width:1, background:'#1d1d1f' }}/>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function ContratosList({ items }: { items: ContratosResp['items'] }) {
  if (!items.length) return <div style={{ color:'#86868b', fontSize:12 }}>Sin contratos en el periodo</div>
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:7 }}>
      {items.map(c => {
        const importe = c.importe_adjudicacion ?? c.importe_licitacion
        return (
          <li key={c.id} style={{
            padding:'10px 14px', background:'#FAFAFA', borderRadius:10, border:'1px solid #ECECEF',
            borderLeft:`3px solid ${FUENTE_COLOR[c.fuente] || '#525258'}`,
            display:'grid', gridTemplateColumns:'1fr auto', gap:14,
          }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:3, flexWrap:'wrap' }}>
                <span style={{
                  fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:4,
                  background: FUENTE_COLOR[c.fuente] || '#525258', color:'#fff', letterSpacing:'0.04em',
                }}>{c.fuente_label}</span>
                {c.cpv && <span style={{ fontSize:9.5, color:'#5B21B6', fontFamily:'monospace', fontWeight:700 }}>CPV {c.cpv}</span>}
                {c.fecha_publicacion && <span style={{ fontSize:9.5, color:'#86868b' }}>{c.fecha_publicacion}</span>}
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, color:'#1d1d1f', lineHeight:1.4 }}>
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noreferrer" style={{ color:'inherit', textDecoration:'none' }}>
                    {c.objeto.length > 130 ? c.objeto.slice(0, 129) + '…' : c.objeto} <span style={{ fontSize:10, color:'#6e6e73' }}>↗</span>
                  </a>
                ) : (c.objeto.length > 130 ? c.objeto.slice(0, 129) + '…' : c.objeto)}
              </div>
              <div style={{ fontSize:11, color:'#3a3a3d', marginTop:3 }}>
                <strong>{c.organo}</strong>
                {c.expediente && <span style={{ color:'#86868b', marginLeft:6 }}>· EXP {c.expediente}</span>}
              </div>
            </div>
            <div style={{ textAlign:'right', minWidth:100 }}>
              {importe ? (
                <>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#1F4E8C' }}>
                    {importe >= 1_000_000 ? `${(importe / 1_000_000).toFixed(2)}M €` : importe >= 1000 ? `${(importe / 1000).toFixed(0)}k €` : `${importe.toFixed(0)} €`}
                  </div>
                  <div style={{ fontSize:9.5, color:'#86868b' }}>
                    {c.importe_adjudicacion != null ? 'adjudicado' : 'licitación'}
                  </div>
                </>
              ) : <span style={{ fontSize:10.5, color:'#86868b' }}>sin importe</span>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function ProgramasGrid() {
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
      {PROGRAMAS_DEFENSA.map(p => (
        <li key={p.programa} style={{
          padding:'12px 16px', background:'#FAFAFA', borderRadius:10, border:'1px solid #ECECEF',
          borderLeft:`4px solid ${p.color}`,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:3 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#1d1d1f' }}>{p.programa}</span>
            <span style={{
              fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999,
              background: `${p.color}20`, color: p.color, letterSpacing:'0.04em',
            }}>{p.estado.toUpperCase()}</span>
          </div>
          <div style={{ fontSize:11.5, color:'#3a3a3d', lineHeight:1.4, margin:'4px 0' }}>{p.descripcion}</div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color:'#6e6e73' }}>
            <span>Socios: <strong>{p.socios}</strong></span>
            {p.presupuesto_b > 0 && (
              <span style={{ fontFamily:'var(--font-display)', color:'#1F4E8C', fontWeight:700 }}>
                {p.presupuesto_b}b €
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function EmpresasGrid() {
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
      {EMPRESAS_DEFENSA.map(e => (
        <li key={e.nombre}>
          <a href={e.web} target="_blank" rel="noreferrer" style={{
            display:'block', padding:'10px 12px', background:'#FAFAFA', borderRadius:10,
            border:'1px solid #ECECEF', textDecoration:'none', color:'inherit',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:6, flexWrap:'wrap' }}>
              <span style={{ fontWeight:700, fontFamily:'var(--font-display)', fontSize:13.5, color:'#1d1d1f' }}>{e.nombre}</span>
              <div style={{ display:'flex', gap:4 }}>
                {e.ibex && <span style={{ fontSize:8.5, fontWeight:800, padding:'2px 6px', borderRadius:4, background:'#FCD34D', color:'#92400E' }}>IBEX 35</span>}
                {('publica' in e && e.publica) && <span style={{ fontSize:8.5, fontWeight:800, padding:'2px 6px', borderRadius:4, background:'#1F4E8C', color:'#fff' }}>PÚBLICA</span>}
              </div>
            </div>
            {e.ticker !== '—' && <div style={{ fontSize:10, color:'#86868b', fontFamily:'monospace', marginTop:2 }}>{e.ticker} {e.capitalizacion_b > 0 && `· ${e.capitalizacion_b}b€`}</div>}
            <div style={{ fontSize:11, color:'#3a3a3d', marginTop:4, lineHeight:1.4 }}>{e.descripcion}</div>
            <div style={{ fontSize:9.5, color:'#525258', fontWeight:700, marginTop:5, letterSpacing:'0.04em', textTransform:'uppercase' }}>{e.segmento}</div>
          </a>
        </li>
      ))}
    </ul>
  )
}

function RegLista() {
  return (
    <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8 }}>
      {REGULADORES_DEFENSA.map(r => (
        <li key={r.nombre}>
          <a href={r.web} target="_blank" rel="noreferrer" style={{
            display:'block', padding:'10px 12px', background:'#FAFAFA', borderRadius:10,
            border:'1px solid #ECECEF', textDecoration:'none', color:'inherit',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:6, alignItems:'baseline' }}>
              <span style={{ fontWeight:700, fontSize:12.5, color:'#1d1d1f' }}>{r.nombre}</span>
              <span style={{ fontSize:10, color:'#86868b' }}>{r.full}</span>
            </div>
            <div style={{ fontSize:11, color:'#3a3a3d', marginTop:4, lineHeight:1.4 }}>{r.competencias}</div>
          </a>
        </li>
      ))}
    </ul>
  )
}

function AreasTematicas() {
  const areas = [
    { titulo: 'Compromiso OTAN 2 % PIB', desc: 'Roadmap España hacia objetivo · presupuesto especial 2024-2028', color:'#DC2626' },
    { titulo: 'Programas Especiales Armamento', desc: 'PEA · plurianuales · F-110, S-80, Eurofighter, NH-90', color:'#1F4E8C' },
    { titulo: 'FCAS · sistema combate aéreo', desc: 'Sucesor Eurofighter 2040 · 100b€ · ES + FR + DE', color:'#5B21B6' },
    { titulo: 'Fondo Europeo Defensa (EDF)', desc: 'PESCO · I+D conjunto UE · participación industria ES', color:'#0EA5E9' },
    { titulo: 'Espacio militar', desc: 'Spainsat NG · Paz · Ingenio · CESAEROD · vigilancia espacial', color:'#7C3AED' },
    { titulo: 'Ciberdefensa', desc: 'Mando Conjunto Ciberespacio · INCIBE · Indra · Telefónica Tech', color:'#16A34A' },
    { titulo: 'Drones · RPAS', desc: 'Reaper · Atlantic 2 · Eurodrone · Tecnobit · Aertec · Sener', color:'#F97316' },
    { titulo: 'Industria naval estratégica', desc: 'Navantia · F-110 · S-80 · BAM IS · exportación FNGB', color:'#0F766E' },
  ]
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
