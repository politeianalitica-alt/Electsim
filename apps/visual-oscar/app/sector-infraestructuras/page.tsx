'use client'
/**
 * Dashboard Sector Infraestructuras & Movilidad · WB transporte + INE IPCO.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  EMPRESAS_INFRA, REGULADORES_INFRA, AREAS_INFRA, PROGRAMAS_INFRA,
} from '@/lib/sources/sectorial-data'
import {
  HeroKPI, Panel, EmpresasGrid, RegLista, ProgramasGrid, AreasTematicas,
  LicitacionesShortcut, SerieLineChart, SectorHero,
} from '@/components/SectorialWidgets'

const ACCENT = '#F97316'
const ACCENT_DARK = '#7c2d12'

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

  const refresh = async () => {
    const r = await fetch('/api/sectores/infraestructuras/resumen').then(r => r.ok ? r.json() : null).catch(() => null)
    setData(r); setUpdatedAt(new Date())
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
              unit="M" accent="#7DD3FC"/>
            <HeroKPI label={`Carga aérea (${data?.kpis.carga_year || ''})`}
              value={data?.kpis.carga_aerea_mtonkm} unit="M ton-km" decimals={0} accent="#86EFAC"/>
            <HeroKPI label={`IPCO ingeniería civil (${data?.kpis.ipco_periodo || ''})`}
              value={data?.kpis.ipco_indice} unit="" decimals={1} accent="#FCD34D" sub="Base 2021=100"/>
            <HeroKPI label="Empresas tractoras" value={EMPRESAS_INFRA.length} unit="" accent="#FCA5A5"/>
          </>}
        />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Pasajeros aéreos transportados · serie histórica" subtitle="Banco Mundial · IS.AIR.PSGR (anual)">
            {data && <SerieLineChart
              points={data.serie_pasajeros.map(p => ({ t: p.t, v: p.v != null ? p.v / 1_000_000 : null }))}
              color={ACCENT}
              formatY={n => `${n.toFixed(0)}M`}/>}
          </Panel>
          <Panel title="IPCO · Índice Producción Construcción" subtitle="INE · ingeniería civil mensual base 2021=100">
            {data && <SerieLineChart points={data.serie_ipco} color="#7C3AED" formatY={n => n.toFixed(1)}/>}
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
      </main>
    </div>
  )
}
