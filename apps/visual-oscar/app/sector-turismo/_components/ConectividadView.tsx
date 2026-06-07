'use client'
/**
 * <ConectividadView /> · Turismo v3 · TurismoShell · Sprint T8 (Conectividad)
 *
 * La conectividad es el cuello de botella físico del turismo receptor español:
 * ~80% de las llegadas internacionales entran por avión y España es la primera
 * potencia de cruceros del Mediterráneo. Esta vista reúne, sin duplicar otros
 * módulos:
 *
 *   1. Tráfico aéreo (AENA) · ranking de aeropuertos por pasajeros (barras),
 *      % internacional y total nacional. Enlace a /sector-infraestructuras
 *      (inversión Aena) sin replicarlo. → <ConectAeropuertos />
 *   2. Cruceros · ranking de puertos por pasajeros + % homeport. Enlace a
 *      /puertos sin duplicar el módulo. → <ConectCruceros />
 *   3. Aerolíneas · cotización de IAG y aéreas (+ operadores aeroportuarios) y
 *      contexto de capacidad/conectividad. → <ConectAerolineas />
 *   4. Coste de conectividad · combustible de aviación vía proxies Brent +
 *      diésel/heating oil (no hay fuente gratuita de jet fuel). → <ConectCosteCombustible />
 *
 * Datos vivos (envelope `{ok,data,...}`): /api/turismo/aena, /api/turismo/cruceros
 * y /api/energia/commodities?category=oil (para el coste). Las aerolíneas las
 * carga su propio sub-componente desde /api/turismo/empresas. Un solo Promise.all
 * para los tres primeros (lazy-mount de la pestaña ya lo da el shell).
 *
 * REGLAS T8: edita SOLO esta vista + sus sub-componentes Conect*. No toca
 * TurismoShell, lib/, app/api/, sectorial-data.ts. Degradación honesta. Cero
 * emojis · Unicode geométrico (⟶ ◉ ◐).
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'
import { HeroKpis } from '../../sector-energia/_components/shared/HeroKpis'
import { ConectAeropuertos, type AenaPayload } from './ConectAeropuertos'
import { ConectCruceros, type CrucerosPayload } from './ConectCruceros'
import { ConectAerolineas } from './ConectAerolineas'
import { ConectCosteCombustible } from './ConectCosteCombustible'
import type { EnergyCommodityResponse } from '@/lib/energia/types'

const SKY = '#0EA5E9'
const SKY_DARK = '#075985'

type CommodityMap = Record<string, EnergyCommodityResponse>

export function ConectividadView() {
  const [aena, setAena] = useState<AenaPayload | null>(null)
  const [cruceros, setCruceros] = useState<CrucerosPayload | null>(null)
  const [oil, setOil] = useState<CommodityMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = async () => {
    setLoading(true)
    const [aenaJson, cruceJson, oilJson] = await Promise.all([
      fetch('/api/turismo/aena?limit=20', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/turismo/cruceros?limit=15', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/energia/commodities?category=oil&days=90', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
    setAena((aenaJson?.data as AenaPayload) ?? null)
    setCruceros((cruceJson?.data as CrucerosPayload) ?? null)
    setOil((oilJson?.data as CommodityMap) ?? null)
    setUpdatedAt(new Date())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── KPIs hero ────────────────────────────────────────────────────────────
  const topAirport = aena?.aeropuertos?.[0] ?? null
  const airTotalM = useMemo(() => {
    const t = aena?.total_pasajeros
    return t != null && Number.isFinite(t) ? t / 1_000_000 : null
  }, [aena])
  const cruiseTotalM = useMemo(() => {
    const t = cruceros?.total_pasajeros
    return t != null && Number.isFinite(t) ? t / 1_000_000 : null
  }, [cruceros])
  const brent = oil?.brent?.ok ? oil.brent.data ?? null : null

  return (
    <>
      {/* ───── HERO ───── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${SKY} 0%, ${SKY_DARK} 100%)`,
          borderRadius: 18,
          padding: '28px 36px',
          marginBottom: 18,
          color: '#fff',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 32,
          alignItems: 'center',
        }}
      >
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', opacity: 0.8, textTransform: 'uppercase', margin: '0 0 8px' }}>
            SECTORIAL · TURISMO · CONECTIVIDAD
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 10px', lineHeight: 1.05 }}>
            Conectividad <em style={{ fontWeight: 300, fontStyle: 'italic', opacity: 0.75 }}>aérea y marítima de España</em>
          </h1>
          <p style={{ fontSize: 13, opacity: 0.82, margin: 0, lineHeight: 1.5 }}>
            El cuello de botella físico del turismo receptor: ~80% de las llegadas internacionales entran
            por avión (red AENA) y España lidera los cruceros del Mediterráneo. Tráfico de aeropuertos,
            puertos de crucero, cotización de aerolíneas y el coste del combustible de aviación.
          </p>
          {updatedAt && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, opacity: 0.72, flexWrap: 'wrap' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7DD3FC', boxShadow: '0 0 8px #7DD3FC' }} />
              Última actualización · {updatedAt.toLocaleTimeString('es-ES')}
              <button
                onClick={refresh}
                style={{ marginLeft: 8, fontSize: 10.5, padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ↻ Actualizar
              </button>
            </div>
          )}
        </div>
        <HeroKpis
          loading={loading && !aena}
          items={[
            {
              label: 'Aeropuerto top',
              value: topAirport ? topAirport.codigo : null,
              color: '#fff',
              footer: topAirport?.pasajeros != null ? `${(topAirport.pasajeros / 1_000_000).toFixed(1)} M pax` : 'sin dato',
            },
            {
              label: 'Pasajeros aéreos (top)',
              value: airTotalM,
              unit: 'M',
              color: '#E0F2FE',
              footer: aena?.source === 'live' ? 'AENA · vivo' : 'AENA · curado+datado',
            },
            {
              label: 'Pasajeros crucero (top)',
              value: cruiseTotalM,
              unit: 'M',
              decimals: 1,
              color: '#BAE6FD',
              footer: 'Puertos del Estado · curado',
            },
            {
              label: 'Brent (coste jet)',
              value: brent?.latest ?? null,
              unit: '$/bbl',
              color: '#A7F3D0',
              footer: brent?.change_24h != null ? `${brent.change_24h >= 0 ? '⇡' : '⇣'} ${Math.abs(brent.change_24h).toFixed(2)}% · 24h` : 'sin serie',
            },
          ]}
        />
      </section>

      {/* ───── 1 · Tráfico aéreo (AENA) ───── */}
      <Panel
        title="Tráfico aéreo · red AENA"
        subtitle="Ranking de aeropuertos por pasajeros · % internacional · total nacional"
        marginBottom
        sourceUrl="https://www.aena.es/es/estadisticas/inicio.html"
        sourceTooltip="AENA · Estadísticas de tráfico aéreo"
      >
        <ConectAeropuertos data={aena} loading={loading && !aena} />
      </Panel>

      {/* ───── 2 · Cruceros ───── */}
      <Panel
        title="Cruceros · puertos de España"
        subtitle="Ranking de puertos por pasajeros de crucero · cuota de homeport vs tránsito"
        marginBottom
        sourceUrl="https://www.puertos.es/es-es/estadisticas"
        sourceTooltip="Puertos del Estado · tráfico de pasajeros de crucero"
      >
        <ConectCruceros data={cruceros} loading={loading && !cruceros} />
      </Panel>

      {/* ───── 3 · Aerolíneas + operadores aeroportuarios ───── */}
      <Panel
        title="Aerolíneas y operadores · cotización y conectividad"
        subtitle="IAG y aéreas relevantes + Aena/Fraport · cotización como proxy de capacidad y salud del mercado"
        marginBottom
        sourceUrl="https://finnhub.io"
        sourceTooltip="Finnhub · cotización en tiempo real (free tier)"
      >
        <ConectAerolineas />
      </Panel>

      {/* ───── 4 · Coste de conectividad (combustible de aviación) ───── */}
      <Panel
        title="Coste de conectividad · combustible de aviación"
        subtitle="Jet fuel vía proxies Brent + diésel/heating oil · mayor partida variable de coste aéreo"
        marginBottom
        sourceUrl="https://finance.yahoo.com/commodities"
        sourceTooltip="Alpha Vantage / Nasdaq Data Link / Yahoo Finance · crudo y destilados"
      >
        <ConectCosteCombustible data={oil} loading={loading && !oil} />
      </Panel>
    </>
  )
}

export default ConectividadView
