'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { SectorMapPreview } from '@/components/SectorMapPreview'
import { ContractsTable } from './_components/ContractsTable'
import { ContractDetail } from './_components/ContractDetail'
import { ContractAlerts } from './_components/ContractAlerts'
import { ContractSourceBadge } from './_components/ContractSourceBadge'
import { MarketConcentrationCard } from './_components/MarketConcentration'
import { calcularConcentracion } from '@/lib/defense/analisis-defensa'

interface Contrato {
  id: string
  fuente: string
  fuente_label: string
  objeto: string
  organo: string
  adjudicatario?: string
  cpv?: string
  importe_licitacion?: number
  importe_adjudicacion?: number
  fecha_publicacion?: string
  url?: string
  expediente?: string
  pais_iso2?: string
  lugar_ejecucion?: string
  estado?: string
}

interface ContratosResp {
  items: Contrato[]
  total: number
  stats: {
    importe_total_M: number
    por_fuente: Record<string, number>
    sources: Array<{ fuente: string; ok: boolean; items: number }>
    fetch_ms: number
  }
}

type Subtab = 'monitor' | 'alertas'

export default function ContratosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [data, setData]           = useState<ContratosResp | null>(null)
  const [selected, setSelected]   = useState<Contrato | null>(null)
  const [loading, setLoading]     = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [subtab, setSubtab]       = useState<Subtab>('monitor')
  const [days, setDays]           = useState(90)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/sectores/defensa/contratos-global?days=${days}&limit=60`)
      .then(r => r.ok ? r.json() : null).catch(() => null)
    setData(res); setUpdatedAt(new Date()); setLoading(false)
  }, [days])

  useEffect(() => { refresh() }, [refresh])

  const stats = data?.stats

  return (
    <div style={{ paddingTop: 24 }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
            DEFENSA · MONITOR DE CONTRATOS
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
            Licitaciones y adjudicaciones
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Ventana temporal */}
          {([30,90,180,365] as const).map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: '1px solid',
                borderColor: days === d ? '#1d1d1f' : '#DDDDE3',
                background: days === d ? '#1d1d1f' : '#fff',
                color: days === d ? '#fff' : '#6e6e73',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {d}d
            </button>
          ))}
          {updatedAt && (
            <span style={{ fontSize: 11, color: '#86868b' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px #34D399', display: 'inline-block', marginRight: 5 }} />
              {updatedAt.toLocaleTimeString('es-ES')}
            </span>
          )}
          <button onClick={refresh} style={{ fontSize: 11, padding: '6px 14px', borderRadius: 999, border: '1px solid #DDDDE3', background: '#fff', color: '#3a3a3d', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'Total contratos', value: String(data!.total), color: '#1d1d1f' },
            { label: 'Importe total', value: `${stats.importe_total_M} M`, color: '#1F4E8C' },
            ...stats.sources.map(s => ({
              label: s.fuente === 'USASPENDING' ? 'DoD USA' : s.fuente === 'CATALUNYA_SOCRATA' ? 'Catalunya' : s.fuente,
              value: String(s.items),
              color: s.ok ? '#16A34A' : '#DC2626',
            }))
          ].map(k => (
            <div key={k.label} style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TABS: Monitor / Alertas */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #ECECEF', marginBottom: 16 }}>
        {(['monitor', 'alertas'] as Subtab[]).map(t => (
          <button
            key={t}
            onClick={() => setSubtab(t)}
            style={{
              padding: '9px 18px', fontSize: 12.5, fontWeight: subtab === t ? 600 : 400,
              color: subtab === t ? '#1d1d1f' : '#6e6e73',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${subtab === t ? '#1d1d1f' : 'transparent'}`,
              cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
              textTransform: 'capitalize',
            }}
          >
            {t === 'monitor' ? 'Monitor en vivo' : 'Alertas'}
          </button>
        ))}
      </div>

      {/* ANÁLISIS DE CONCENTRACIÓN — visible siempre antes de los tabs */}
      {subtab === 'monitor' && data && data.items.length > 0 && (() => {
        const concentracion = calcularConcentracion(data.items)
        return (
          <Panel
            title="Análisis de concentración de mercado"
            subtitle={`HHI ${concentracion.hhi.toLocaleString('es-ES')} · ${concentracion.bandaHHI} · ${concentracion.topAdjudicatarios.length} adjudicatarios identificados`}
            marginBottom
          >
            <MarketConcentrationCard contratos={data.items} concentracion={concentracion}/>
          </Panel>
        )
      })()}

      {/* MONITOR TAB */}
      {subtab === 'monitor' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
          <Panel
            title="Contratos de defensa"
            subtitle={data ? `${data.total} contratos · últimos ${days} días · TED EU + PLACSP + DoD USA` : 'Cargando…'}
            sourceUrl="https://ted.europa.eu/en/"
            sourceLabel="TED + USASpending"
            sourceTooltip="TED EU + PLACSP + USASpending.gov · CPV 35"
            apiUrl={`/api/sectores/defensa/contratos-global?days=${days}`}
          >
            {data && (
              <ContractsTable
                items={data.items}
                onSelect={setSelected}
                selectedId={selected?.id ?? null}
              />
            )}
            {loading && <div style={{ textAlign:'center', padding:24, color:'#86868b', fontSize:12 }}>Cargando contratos…</div>}
          </Panel>

          {/* Panel lateral de detalle */}
          <div style={{
            background: '#fff', border: '1px solid #ECECEF', borderRadius: 16,
            minHeight: 400, overflow: 'hidden',
          }}>
            <ContractDetail
              contrato={selected}
              onClose={() => setSelected(null)}
            />
          </div>
        </div>
      )}

      {/* ALERTAS TAB */}
      {subtab === 'alertas' && (
        <Panel title="Configuración de alertas" subtitle="Notificaciones automáticas cuando se publiquen contratos relevantes">
          <ContractAlerts />
        </Panel>
      )}

      <SectorMapPreview sector="defensa" marginTop={28} />
    </div>
  )
}
