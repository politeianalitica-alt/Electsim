'use client'
/**
 * <TSFinanciacionView /> · Tercer Sector v3 · TercerSectorShell · Sprint TS6
 *
 * Dinero HACIA el tercer sector, en vivo. Sustituye el stub de TS1 (Ola 2). Lee
 * `/api/tercer-sector/financiacion?pages=2` (envelope `{ok,data,...}`) que agrega:
 *   - BDNS convocatorias (subvenciones públicas abiertas, sesgo tercer sector)
 *   - BDNS concesiones (quién recibió qué — ranking de beneficiarios)
 *   - SEDIA grants UE (CERV / ESF+ / Horizon social)
 *   - IRPF 0,7% fines sociales (curado + datado)
 *
 * KPIs hero: total concedido · convocatorias · concesiones · grants UE · IRPF
 * 0,7%. Degradación HONESTA por fuente (CLAUDE.md): banda `fuentes_error` visible
 * y paneles que muestran lo que cada fuente sí trae, sin inventar. Cross-links a
 * /fondos-europeos (grants UE a fondo) y /licitaciones (contratación general),
 * sin duplicar esos exploradores aquí. Cero emojis · Unicode geométrico.
 */
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Panel, SectorHero } from '@/components/SectorialWidgets'
// Primitiva GENÉRICA reutilizada (CLAUDE.md: una sola implementación de HeroKpis).
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'
import {
  ACCENT,
  ACCENT_DARK,
  fmtEur as fmtEurShared,
  sumImportes,
  toMeur,
  type FinEnvelope,
  type FinPayload,
  type FinanciadorActivoRow,
  type TerritorioFinRow,
} from './FinShared'
import { FinFuentesError } from './FinFuentesError'
import { FinConvocatoriasTable } from './FinConvocatoriasTable'
import { FinConcesiones } from './FinConcesiones'
import { FinGrantsUe } from './FinGrantsUe'
import { FinIrpfCard } from './FinIrpfCard'
import { FinPipelineOportunidades } from './FinPipelineOportunidades'
import { FinanciadoresActivos } from './FinanciadoresActivos'
import { SectorMapPreview } from '@/components/SectorMapPreview'

const ENDPOINT = '/api/tercer-sector/financiacion?pages=2'

export function TSFinanciacionView() {
  const [data, setData] = useState<FinPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    fetch(ENDPOINT, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: FinEnvelope) => {
        if (!alive) return
        if (j && j.data) {
          setData(j.data)
          setUpdatedAt(new Date())
        } else {
          setError(true)
        }
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [reloadKey])

  // total concedido: sumamos `importe_eur` de las concesiones en cliente y
  // caemos al valor del resumen del endpoint solo si no hay concesiones. (El
  // endpoint ya calcula `resumen.total_concedido_eur` sobre `importe_eur`, así
  // que ambos coinciden; este recompute es solo un respaldo defensivo.)
  const totalConcedido = useMemo(() => {
    if (!data) return null
    const fromConcesiones = sumImportes(data.concesiones)
    if (fromConcesiones > 0) return fromConcesiones
    return data.resumen?.total_concedido_eur ?? null
  }, [data])

  // TS-Deep B6: enriched data from endpoint
  const totalConcedidoTs = data?.resumen?.total_concedido_ts_eur ?? null
  const financiadoresActivos = data?.financiadores_activos ?? []
  const porTerritorio = data?.por_territorio ?? {}
  const rankingBeneficiarios = data?.ranking_beneficiarios ?? []
  const nConcesionesTs = data?.resumen?.n_concesiones_ts ?? null

  const heroItems: HeroKpiItem[] = useMemo(() => {
    const r = data?.resumen
    return [
      {
        label: 'Total concedido',
        value: toMeur(totalConcedido),
        unit: 'M€',
        decimals: totalConcedido != null && Math.abs(totalConcedido) >= 100_000_000 ? 0 : 1,
        color: '#FCD34D',
        footer: 'BDNS · muestra reciente',
      },
      {
        label: 'Al tercer sector',
        value: toMeur(totalConcedidoTs),
        unit: 'M€',
        decimals: 1,
        color: '#86EFAC',
        footer: nConcesionesTs != null ? `${nConcesionesTs} concesiones TS (NIF+keyword)` : 'Filtrado NIF/keyword',
      },
      {
        label: 'Convocatorias',
        value: r?.n_convocatorias ?? null,
        decimals: 0,
        color: '#7DD3FC',
        footer: 'BDNS · abiertas recientes',
      },
      {
        label: 'Grants UE',
        value: r?.n_grants_ue ?? null,
        decimals: 0,
        color: '#C4B5FD',
        footer: 'SEDIA · CERV/ESF+/Horizon',
      },
      {
        label: 'Financiadores activos',
        value: financiadoresActivos.length > 0 ? financiadoresActivos.length : null,
        decimals: 0,
        color: '#FDBA74',
        footer: 'Organismos que financian TS ahora',
      },
      {
        label: 'IRPF 0,7%',
        value: data?.irpf_07 ? data.irpf_07.recaudacion_estimada_meur : null,
        unit: 'M€',
        decimals: 0,
        color: '#FDA4AF',
        footer: data?.irpf_07 ? `≈ ${data.irpf_07.beneficiarias_aprox.toLocaleString('es-ES')} entidades` : 'fines sociales',
      },
    ]
  }, [data, totalConcedido, totalConcedidoTs, nConcesionesTs, financiadoresActivos.length])

  const convocatorias = data?.convocatorias ?? []
  const concesiones = data?.concesiones ?? []
  const grants = data?.grants_ue ?? []
  const fuentesError = data?.fuentes_error ?? []

  return (
    <div>
      <SectorHero
        accent={ACCENT}
        accentDark={ACCENT_DARK}
        eyebrow="TERCER SECTOR · FINANCIACIÓN · DINERO HACIA LAS ENTIDADES"
        title="Financiación del tercer sector"
        sub="Subvenciones públicas (BDNS), grants europeos (SEDIA · CERV/ESF+/Horizon social) y el 0,7% del IRPF a fines sociales. Quién convoca, quién recibe y cuánto. Datos en vivo con degradación honesta por fuente."
        updatedAt={updatedAt}
        onRefresh={() => setReloadKey((k) => k + 1)}
        kpis={
          <div style={{ gridColumn: '1 / -1' }}>
            <HeroKpis items={heroItems} loading={loading && !data} />
          </div>
        }
      />

      {/* Pipeline de oportunidades · panel superior del cockpit (fuente propia) */}
      <FinPipelineOportunidades />

      {/* Degradación honesta por fuente */}
      <FinFuentesError errores={fuentesError} />

      {error && !data && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 12,
            padding: '14px 16px',
            color: '#991B1B',
            fontSize: 12.5,
            marginBottom: 14,
          }}
        >
          No se pudo cargar la financiación ahora mismo. Reintenta con ↻ Actualizar.
        </div>
      )}

      {/* Convocatorias abiertas (BDNS) */}
      <div style={{ marginBottom: 14 }}>
        <Panel
          title="Convocatorias abiertas · BDNS"
          subtitle="Subvenciones públicas con sesgo de tercer sector"
          sourceUrl="https://www.infosubvenciones.es/bdnstrans/GE/es/index"
          sourceLabel="BDNS"
          sourceTooltip="Base de Datos Nacional de Subvenciones · Ministerio de Hacienda"
        >
          {loading && !data ? (
            <div style={{ height: 220, background: 'rgba(0,0,0,0.04)', borderRadius: 10 }} />
          ) : (
            <FinConvocatoriasTable convocatorias={convocatorias} />
          )}
        </Panel>
      </div>

      {/* Concesiones recientes (ranking beneficiarios + por nivel) */}
      <div style={{ marginBottom: 14 }}>
        <Panel
          title="Concesiones recientes · beneficiarios del tercer sector"
          subtitle="Quién recibió cuánto · ranking por importe"
          sourceUrl="https://www.infosubvenciones.es/bdnstrans/GE/es/index"
          sourceLabel="BDNS"
          sourceTooltip="Resoluciones de concesión de subvenciones · Ministerio de Hacienda"
        >
          {loading && !data ? (
            <div style={{ height: 260, background: 'rgba(0,0,0,0.04)', borderRadius: 10 }} />
          ) : (
            <FinConcesiones concesiones={concesiones} />
          )}
        </Panel>
      </div>

      {/* Financiadores activos · quién financia más AHORA (group by organismo) */}
      <div style={{ marginBottom: 14 }}>
        <Panel
          title="Financiadores activos · quién financia más ahora"
          subtitle="Agregado por organismo · oportunidades abiertas + concesiones recientes"
          sourceUrl="https://www.infosubvenciones.es/bdnstrans/GE/es/index"
          sourceLabel="BDNS · SEDIA · cooperación"
          sourceTooltip="Agregación de oportunidades del cockpit + concesiones BDNS"
        >
          <FinanciadoresActivos
            concesiones={concesiones}
            precomputed={financiadoresActivos}
          />
        </Panel>
      </div>

      {/* TS-Deep B6: Territorio — desglose CCAA del dinero al tercer sector */}
      {Object.keys(porTerritorio).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <Panel
            title="Distribucion territorial · concesiones al tercer sector"
            subtitle="Desglose CCAA por numero de concesiones e importe"
            sourceUrl="https://www.infosubvenciones.es/bdnstrans/GE/es/index"
            sourceLabel="BDNS"
            sourceTooltip="Concesiones BDNS enriquecidas · clasificacion NIF + keyword + territorio"
          >
            <TerritorioFinTable porTerritorio={porTerritorio} />
          </Panel>
        </div>
      )}

      {/* Grants UE + IRPF 0,7%, en paralelo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Grants UE · financiación europea directa"
          subtitle="CERV · ESF+ · Horizon social (SEDIA)"
          sourceUrl="https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home"
          sourceLabel="EU F&T"
          sourceTooltip="EU Funding & Tenders Portal · Comisión Europea"
        >
          {loading && !data ? (
            <div style={{ height: 200, background: 'rgba(0,0,0,0.04)', borderRadius: 10 }} />
          ) : (
            <FinGrantsUe grants={grants} />
          )}
        </Panel>

        <Panel
          title="IRPF 0,7% · fines sociales"
          subtitle="Tramo estatal · curado + datado"
          sourceUrl={data?.irpf_07?.fuente_url || 'https://www.mdsocialesa2030.gob.es/derechos-sociales/ong/subvenciones.htm'}
          sourceLabel="Mº Derechos Sociales"
          sourceTooltip="Convocatoria estatal del 0,7% del IRPF a fines sociales"
        >
          <FinIrpfCard irpf={data?.irpf_07 ?? null} />
        </Panel>
      </div>

      {/* Puentes a vistas dedicadas, sin duplicar exploradores */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          background: '#fff',
          border: '1px solid #ECECEF',
          borderRadius: 14,
          padding: '14px 18px',
        }}
      >
        <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 600 }}>
          ¿Buscas el detalle completo?
        </span>
        <Link
          href="/fondos-europeos"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: ACCENT,
            textDecoration: 'none',
            border: '1px solid #BBF7D0',
            background: '#F0FDF4',
            borderRadius: 999,
            padding: '6px 14px',
          }}
        >
          Fondos europeos →
        </Link>
        <Link
          href="/licitaciones"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#1F4E8C',
            textDecoration: 'none',
            border: '1px solid #D8E5F4',
            background: '#F5F8FC',
            borderRadius: 999,
            padding: '6px 14px',
          }}
        >
          Licitaciones (contratación) →
        </Link>
        <span style={{ fontSize: 10.5, color: '#9CA3AF', marginLeft: 'auto', maxWidth: 420, lineHeight: 1.5 }}>
          Esta vista resume el dinero que llega al tercer sector; el explorador de fondos europeos y
          el de contratación pública viven en sus propias secciones.
        </span>
      </div>

      {/* Mapa OSINT del sector (último · abajo del todo). */}
      <SectorMapPreview sector="tercer-sector" marginTop={28} />
    </div>
  )
}

/** TS-Deep B6: Territory breakdown table (CCAA) from enriched endpoint data. */
function TerritorioFinTable({ porTerritorio }: { porTerritorio: Record<string, TerritorioFinRow> }) {
  const rows = Object.entries(porTerritorio)
    .map(([ccaa, v]) => ({ ccaa, count: v.count, total_eur: v.total_eur }))
    .sort((a, b) => b.total_eur - a.total_eur)

  if (rows.length === 0) {
    return <div style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 0' }}>Sin desglose territorial.</div>
  }

  const maxEur = Math.max(1, ...rows.map((r) => r.total_eur))

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => {
          const pct = Math.round((r.total_eur / maxEur) * 100)
          return (
            <div key={r.ccaa} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#0f172a',
                  minWidth: 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={r.ccaa}
              >
                {r.ccaa}
              </span>
              <span style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                <span
                  style={{
                    display: 'block',
                    width: `${pct}%`,
                    height: '100%',
                    background: ACCENT,
                    borderRadius: 999,
                    minWidth: pct > 0 ? 4 : 0,
                  }}
                />
              </span>
              <span style={{ fontSize: 10.5, color: '#475569', fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right' }}>
                {fmtEurShared(r.total_eur)}
              </span>
              <span style={{ fontSize: 10, color: '#94A3B8', minWidth: 50, textAlign: 'right' }}>
                {r.count} conc.
              </span>
            </div>
          )
        })}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5 }}>
        Concesiones clasificadas como tercer sector (NIF G/R/F/V + terminos clave en razon social).
        La CCAA se detecta automaticamente del organo convocante. Heuristico documentado, no oficial.
      </p>
    </div>
  )
}

export default TSFinanciacionView
