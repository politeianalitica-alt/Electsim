'use client'
/**
 * Dashboard Sector Infraestructuras & Movilidad · WB transporte + INE IPCO.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
// Sprint Cuaderno N2-wire · notas que mencionan "Infraestructuras"
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import {
  EMPRESAS_INFRA, REGULADORES_INFRA, AREAS_INFRA, PROGRAMAS_INFRA,
} from '@/lib/sources/sectorial-data'
import {
  HeroKPI, Panel, EmpresasGrid, RegLista, ProgramasGrid, AreasTematicas,
  LicitacionesShortcut, SerieLineChart, SectorHero,
} from '@/components/SectorialWidgets'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'

const ACCENT = '#F97316'
const ACCENT_DARK = '#7c2d12'

/** Estado de carga/error/vacío para los paneles de gráficas (tarea B2). */
function ChartFallback({ status, onRetry }: { status: 'loading' | 'ok' | 'error'; onRetry: () => void }) {
  if (status === 'error') {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, minHeight:160, color:'#86868b', fontSize:12.5, textAlign:'center' }}>
        <span>No se pudo cargar la serie. Comprueba tu conexión e inténtalo de nuevo.</span>
        <button onClick={onRetry} style={{ fontSize:11.5, fontWeight:700, padding:'5px 12px', borderRadius:8, border:'1px solid #ECECEF', background:'#FAFAFA', color:'#1d1d1f', cursor:'pointer' }}>
          Reintentar
        </button>
      </div>
    )
  }
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:160, color:'#9ca3af', fontSize:12.5 }}>
      Cargando serie…
    </div>
  )
}

interface Resumen {
  kpis: {
    pasajeros_aereo: number | null; pasajeros_year?: number
    carga_aerea_mtonkm: number | null; carga_year?: number
    ipco_indice: number | null; ipco_periodo?: string
  }
  serie_pasajeros: Array<{ t: string; v: number | null }>
  serie_ipco: Array<{ t: string; v: number | null }>
  fetch_ms: number
}

export default function SectorInfraestructurasPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  const [data, setData] = useState<Resumen | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  const refresh = async () => {
    setStatus(s => (s === 'ok' ? 'ok' : 'loading'))
    const r = await fetch('/api/sectores/infraestructuras/resumen').then(r => r.ok ? r.json() : null).catch(() => null)
    if (r) { setData(r); setStatus('ok') } else { setStatus('error') }
    setUpdatedAt(new Date())
  }
  useEffect(() => { refresh(); const t = setInterval(refresh, 60 * 60 * 1000); return () => clearInterval(t) }, [])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
        <SectorHero
          accent={ACCENT} accentDark={ACCENT_DARK}
          eyebrow="SECTORIAL · INFRAESTRUCTURAS & MOVILIDAD · WB + INE IPCO"
          title="Infraestructuras y movilidad española"
          sub="Pasajeros aéreos · carga aérea · índice producción construcción ingeniería civil. Empresas líderes (ACS, Ferrovial, Sacyr, FCC, Acciona, Aena IBEX, Adif, Renfe, IAG) y marco regulatorio (Mitma, CNMC, Aena, Adif, Puertos Estado, DGT, AESA)."
          updatedAt={updatedAt} fetchMs={data?.fetch_ms}
          onRefresh={refresh}
          kpis={<>
            <HeroKPI label={`Pasajeros aéreos (${data?.kpis.pasajeros_year || ''})`}
              value={data?.kpis.pasajeros_aereo != null ? Math.round(data.kpis.pasajeros_aereo / 1_000_000) : null}
              unit="M" accent="#7DD3FC" sub="Último dato disponible (Banco Mundial)"/>
            <HeroKPI label={`Carga aérea (${data?.kpis.carga_year || ''})`}
              value={data?.kpis.carga_aerea_mtonkm} unit="M ton-km" decimals={0} accent="#86EFAC" sub="Último dato disponible (Banco Mundial)"/>
            <HeroKPI label={`IPCO ingeniería civil (${data?.kpis.ipco_periodo || ''})`}
              value={data?.kpis.ipco_indice} unit="" decimals={1} accent="#FCD34D" sub="Base 2021=100"/>
            <HeroKPI label="Empresas tractoras" value={EMPRESAS_INFRA.length} unit="" accent="#FCA5A5"/>
          </>}
        />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Pasajeros aéreos transportados · serie histórica"
            subtitle="Banco Mundial · IS.AIR.PSGR (anual)"
            sourceUrl="https://datos.bancomundial.org/indicador/IS.AIR.PSGR?locations=ES"
            sourceLabel="Banco Mundial"
            sourceTooltip="Air transport · passengers carried · serie España"
            apiUrl="/api/sectores/infraestructuras/resumen">
            {data ? <SerieLineChart
              points={data.serie_pasajeros.map(p => ({ t: p.t, v: p.v != null ? p.v / 1_000_000 : null }))}
              color={ACCENT}
              formatY={n => `${n.toFixed(0)}M`}/>
              : <ChartFallback status={status} onRetry={refresh}/>}
          </Panel>
          <Panel title="IPCO · Índice Producción Construcción"
            subtitle="INE · ingeniería civil mensual base 2021=100"
            sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=5803"
            sourceLabel="INE"
            sourceTooltip="Índice Producción Construcción · INE · mensual"
            apiUrl="/api/sectores/infraestructuras/resumen">
            {data ? <SerieLineChart points={data.serie_ipco} color="#7C3AED" formatY={n => n.toFixed(1)}/>
              : <ChartFallback status={status} onRetry={refresh}/>}
          </Panel>
        </div>

        <Panel title="Programas y políticas activas" subtitle="PRTR Movilidad · DORA III · MOVES III · Reversión peajes" marginBottom>
          <ProgramasGrid programas={PROGRAMAS_INFRA} columns={4}/>
        </Panel>

        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Empresas tractoras del sector" subtitle={`${EMPRESAS_INFRA.length} compañías · construcción + concesiones + transporte`}>
            <EmpresasGrid empresas={EMPRESAS_INFRA} accent={ACCENT}/>
          </Panel>
          <Panel title="Reguladores y operadores" subtitle="Marco institucional infraestructuras + transporte">
            <RegLista reguladores={REGULADORES_INFRA}/>
          </Panel>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginBottom:14 }}>
          <Panel title="Licitaciones del sector" subtitle="CPV 45 · Construcción + obras">
            <LicitacionesShortcut cpv_div="45" label="construcción y obras"/>
          </Panel>
          <Panel title="Áreas estratégicas del sector" subtitle="Topic taxonomy · Politeia">
            <AreasTematicas areas={AREAS_INFRA}/>
          </Panel>
        </div>

        {/* Politeia intel · infra_projects + TED + PLACE */}
        <SectorIntelPanel sector="infraestructuras" accent={ACCENT} />

        {/* Sprint Cuaderno N2-wire · notas del Cuaderno sobre sector Infraestructuras */}
        <div style={{ marginTop: 18 }}>
          <CuadernoEntityWidget slug="infraestructuras" name="Sector Infraestructuras" accentColor="#475569" />
        </div>
      </main>
    </div>
  )
}
