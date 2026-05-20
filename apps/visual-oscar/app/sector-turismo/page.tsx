'use client'
/**
 * Dashboard Sector Turismo & Hostelería · INE FRONTUR + EOH.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  EMPRESAS_TURISMO, REGULADORES_TURISMO, AREAS_TURISMO, PROGRAMAS_TURISMO,
} from '@/lib/sources/sectorial-data'
import {
  HeroKPI, Panel, EmpresasGrid, RegLista, ProgramasGrid, AreasTematicas,
  LicitacionesShortcut, SerieLineChart, SectorHero,
} from '@/components/SectorialWidgets'

const ACCENT = '#0EA5E9'
const ACCENT_DARK = '#075985'

interface Resumen {
  kpis: {
    turistas_mes: number | null; turistas_periodo?: string
    turistas_var_anual: number | null
    pernoctaciones_mes: number | null; pernoctaciones_periodo?: string
    viajeros_mes: number | null; viajeros_periodo?: string
  }
  serie_turistas: Array<{ t: string; v: number | null }>
  serie_pernoctaciones: Array<{ t: string; v: number | null }>
  serie_viajeros: Array<{ t: string; v: number | null }>
  fetch_ms: number
}

export default function SectorTurismoPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  const [data, setData] = useState<Resumen | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = async () => {
    const r = await fetch('/api/sectores/turismo/resumen').then(r => r.ok ? r.json() : null).catch(() => null)
    setData(r); setUpdatedAt(new Date())
  }
  useEffect(() => { refresh(); const t = setInterval(refresh, 60 * 60 * 1000); return () => clearInterval(t) }, [])

  return (
 <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
 <AppHeader/>
 <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
 <SectorHero
          accent={ACCENT} accentDark={ACCENT_DARK}
          eyebrow="SECTORIAL · TURISMO & HOSTELERÍA · INE FRONTUR + EOH"
          title="Mercado turístico español en tiempo real"
          sub="Turistas internacionales (Frontur) · pernoctaciones y viajeros hoteleros (EOH) · 10 empresas cotizadas (IAG, Meliá, Amadeus IBEX, NH, Aena IBEX, eDreams, Globalia, Barceló, RIU, Iberostar) y marco regulatorio (Turespaña, CCAA, Exceltur, OMT, AESA)."
          updatedAt={updatedAt} fetchMs={data?.fetch_ms}
          onRefresh={refresh}
          kpis={<>
 <HeroKPI label={`Turistas mes (${data?.kpis.turistas_periodo || ''})`}
              value={data?.kpis.turistas_mes != null ? Math.round(data.kpis.turistas_mes / 1000) : null}
              unit="k" accent="#86EFAC"/>
 <HeroKPI label="Variación anual" value={data?.kpis.turistas_var_anual} unit="%" decimals={1} accent="#FCD34D"/>
 <HeroKPI label={`Pernoctaciones (${data?.kpis.pernoctaciones_periodo || ''})`}
              value={data?.kpis.pernoctaciones_mes != null ? Math.round(data.kpis.pernoctaciones_mes / 1000) : null}
              unit="k" accent="#7DD3FC"/>
 <HeroKPI label={`Viajeros hoteles (${data?.kpis.viajeros_periodo || ''})`}
              value={data?.kpis.viajeros_mes != null ? Math.round(data.kpis.viajeros_mes / 1000) : null}
              unit="k" accent="#FCA5A5"/>
 </>}
        />

 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
 <Panel title="Turistas internacionales · serie mensual"
            subtitle="INE FRONTUR · Total Nacional dato base"
            sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=10256"
            sourceLabel="INE"
            sourceTooltip="FRONTUR · Estadística de Movimientos Turísticos · INE">
            {data && <SerieLineChart
              points={data.serie_turistas.map(p => ({ t: p.t, v: p.v != null ? p.v / 1_000_000 : null }))}
              color={ACCENT}
              formatY={n => `${n.toFixed(1)}M`}/>}
 </Panel>
 <Panel title="Pernoctaciones hoteleras · serie mensual"
            subtitle="INE EOH · Total Nacional"
            sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=10257"
            sourceLabel="INE"
            sourceTooltip="EOH · Encuesta Ocupación Hotelera · INE">
            {data && <SerieLineChart
              points={data.serie_pernoctaciones.map(p => ({ t: p.t, v: p.v != null ? p.v / 1000 : null }))}
              color="#7C3AED"
              formatY={n => `${n.toFixed(0)}k`}/>}
 </Panel>
 </div>

 <Panel title="Programas y políticas activas" subtitle="Estrategia Turismo Sostenible 2030 · PERTE Turismo · Plan VUT" marginBottom>
 <ProgramasGrid programas={PROGRAMAS_TURISMO} columns={4}/>
 </Panel>

 <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
 <Panel title="Empresas líderes del sector" subtitle={`${EMPRESAS_TURISMO.length} compañías · aerolíneas + hoteles + OTAs`}>
 <EmpresasGrid empresas={EMPRESAS_TURISMO} accent={ACCENT}/>
 </Panel>
 <Panel title="Reguladores y operadores" subtitle="Marco institucional turismo nacional + UE">
 <RegLista reguladores={REGULADORES_TURISMO}/>
 </Panel>
 </div>

 <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginBottom:14 }}>
 <Panel title="Licitaciones del sector" subtitle="CPV 55 · Servicios hostelería, catering">
 <LicitacionesShortcut cpv_div="55" label="hostelería y catering"/>
 </Panel>
 <Panel title="Áreas estratégicas del sector" subtitle="Topic taxonomy · Politeia">
 <AreasTematicas areas={AREAS_TURISMO}/>
 </Panel>
 </div>
 </main>
 </div>
  )
}
