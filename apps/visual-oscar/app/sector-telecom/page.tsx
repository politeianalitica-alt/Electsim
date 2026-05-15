'use client'
/**
 * Dashboard Sector Telecom & Digital · World Bank ICT indicators.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  EMPRESAS_TELECOM, REGULADORES_TELECOM, AREAS_TELECOM, PROGRAMAS_TELECOM,
} from '@/lib/sources/sectorial-data'
import {
  HeroKPI, Panel, EmpresasGrid, RegLista, ProgramasGrid, AreasTematicas,
  LicitacionesShortcut, SerieLineChart, SectorHero,
} from '@/components/SectorialWidgets'

const ACCENT = '#5B21B6'
const ACCENT_DARK = '#2e1065'

interface Resumen {
  kpis: {
    broadband_p100: number | null; broadband_year?: number
    mobile_p100: number | null; mobile_year?: number
    internet_users_pct: number | null; internet_users_year?: number
  }
  serie_broadband: Array<{ t: string; v: number | null }>
  serie_mobile: Array<{ t: string; v: number | null }>
  serie_internet: Array<{ t: string; v: number | null }>
  fetch_ms: number
}

export default function SectorTelecomPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  const [data, setData] = useState<Resumen | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = async () => {
    const r = await fetch('/api/sectores/telecom/resumen').then(r => r.ok ? r.json() : null).catch(() => null)
    setData(r); setUpdatedAt(new Date())
  }
  useEffect(() => { refresh(); const t = setInterval(refresh, 60 * 60 * 1000); return () => clearInterval(t) }, [])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>
        <SectorHero
          accent={ACCENT} accentDark={ACCENT_DARK}
          eyebrow="SECTORIAL · TELECOM & DIGITAL · WORLD BANK ICT"
          title="Sector telecomunicaciones y digital español"
          sub="Banda ancha fija · suscriptores móviles · usuarios internet · 8 empresas líderes (Telefónica, Cellnex IBEX, MasOrange, Vodafone, Indra, Amadeus) y marco regulatorio (CNMC, SETELECO, AEPD, BEREC, INCIBE)."
          updatedAt={updatedAt} fetchMs={data?.fetch_ms}
          onRefresh={refresh}
          kpis={<>
            <HeroKPI label={`Banda ancha fija (${data?.kpis.broadband_year || ''})`} value={data?.kpis.broadband_p100} unit="/100 hab" decimals={1} accent="#86EFAC"/>
            <HeroKPI label={`Móvil (${data?.kpis.mobile_year || ''})`} value={data?.kpis.mobile_p100} unit="/100 hab" decimals={1} accent="#7DD3FC"/>
            <HeroKPI label={`Internet (${data?.kpis.internet_users_year || ''})`} value={data?.kpis.internet_users_pct} unit="%" decimals={1} accent="#FCD34D" sub="Población usuaria"/>
            <HeroKPI label="Empresas IBEX + selectivos" value={EMPRESAS_TELECOM.filter(e => e.ticker !== '—').length} unit="" accent="#FCA5A5"/>
          </>}
        />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Banda ancha fija · suscripciones por 100 hab."
            subtitle="Banco Mundial · serie histórica desde 2005"
            sourceUrl="https://datos.bancomundial.org/indicador/IT.NET.BBND.P2?locations=ES"
            sourceLabel="Banco Mundial"
            sourceTooltip="Fixed broadband subscriptions per 100 people · España">
            {data && <SerieLineChart points={data.serie_broadband} color={ACCENT} formatY={n => `${n.toFixed(1)}`}/>}
          </Panel>
          <Panel title="Usuarios de internet · % población"
            subtitle="Banco Mundial · % de individuos"
            sourceUrl="https://datos.bancomundial.org/indicador/IT.NET.USER.ZS?locations=ES"
            sourceLabel="Banco Mundial"
            sourceTooltip="Individuals using the internet · % población · España">
            {data && <SerieLineChart points={data.serie_internet} color="#0EA5E9" formatY={n => `${n.toFixed(1)}%`}/>}
          </Panel>
        </div>

        <Panel title="Programas y políticas activas" subtitle="UNICO · KitDigital · PERTE Chip · Estrategia 6G" marginBottom>
          <ProgramasGrid programas={PROGRAMAS_TELECOM} columns={4}/>
        </Panel>

        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14, marginBottom:14 }}>
          <Panel title="Empresas líderes del sector" subtitle={`${EMPRESAS_TELECOM.length} compañías · operadoras + tecnológicas`}>
            <EmpresasGrid empresas={EMPRESAS_TELECOM} accent={ACCENT}/>
          </Panel>
          <Panel title="Reguladores y operadores" subtitle="Marco institucional telecom + digital">
            <RegLista reguladores={REGULADORES_TELECOM}/>
          </Panel>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:14, marginBottom:14 }}>
          <Panel title="Licitaciones del sector" subtitle="CPV 72 · Servicios TI">
            <LicitacionesShortcut cpv_div="72" label="servicios TI"/>
          </Panel>
          <Panel title="Áreas estratégicas del sector" subtitle="Topic taxonomy · Politeia">
            <AreasTematicas areas={AREAS_TELECOM}/>
          </Panel>
        </div>
      </main>
    </div>
  )
}
