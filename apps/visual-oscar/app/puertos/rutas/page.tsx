'use client'
/**
 * /puertos/rutas · Sprint 2 Fase D
 *
 * Visualización de rutas marítimas de las navieras top mundial. El usuario
 * puede filtrar por:
 *   - Naviera (MSC, Maersk, CMA CGM…)
 *   - Trade lane (asia_eu, transpac, transatlantic…)
 *   - Chokepoint (suez, malacca, gibraltar…)
 *
 * Renderiza:
 *   1. Mapa mundial con líneas Bezier conectando port_rotation
 *   2. Tabla de servicios filtrados (port_rotation expandida)
 *   3. Lista de navieras con badges de alianza + LEI + sanctions risk
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import MaritimoShell from '../_components/MaritimoShell'
import { isAuthenticated } from '@/lib/auth'
import {
  useShippingLines,
  useCarrierServices,
  usePortCatalog,
} from '@/hooks/usePorts'
import { DataQualityBadge } from '@/components/ports/DataQualityBadge'
import { fmtInt } from '@/lib/ports-utils'

const ACCENT = '#0e7490'
const WORLD_GEOJSON = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const TRADE_LANES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todas las rutas' },
  { value: 'asia_eu', label: 'Asia ↔ Europa Norte (vía Suez)' },
  { value: 'asia_med', label: 'Asia ↔ Mediterráneo' },
  { value: 'transpac', label: 'Asia ↔ USA West Coast' },
  { value: 'transpac_east', label: 'Asia ↔ USA East Coast (Panama)' },
  { value: 'transatlantic', label: 'Europa ↔ USA East Coast' },
  { value: 'me_eu', label: 'Middle East ↔ Europa' },
  { value: 'intra_eu', label: 'Intra-Europa (incl. Med)' },
  { value: 'intra_asia', label: 'Intra-Asia (feeders)' },
  { value: 'africa', label: 'África Oeste / Sur' },
  { value: 'latin_america', label: 'Latinoamérica' },
]

const CHOKEPOINTS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos los chokepoints' },
  { value: 'suez_canal', label: 'Canal de Suez' },
  { value: 'malacca', label: 'Estrecho de Malacca' },
  { value: 'gibraltar', label: 'Estrecho de Gibraltar' },
  { value: 'bab_el_mandeb', label: 'Bab-el-Mandeb' },
  { value: 'hormuz', label: 'Estrecho de Ormuz' },
  { value: 'panama', label: 'Canal de Panamá' },
]

const ALLIANCE_STYLE: Record<string, { bg: string; fg: string }> = {
  gemini: { bg: '#dbeafe', fg: '#1e3a8a' },
  ocean: { bg: '#dcfce7', fg: '#14532d' },
  premier: { bg: '#fef3c7', fg: '#92400e' },
  the_alliance: { bg: '#ede9fe', fg: '#5b21b6' },
  standalone: { bg: '#f3f4f6', fg: '#374151' },
}

const SANCTIONS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  none: { bg: '#dcfce7', fg: '#166534', label: 'CLEAR' },
  monitor: { bg: '#fef3c7', fg: '#92400e', label: 'MONITOR' },
  sanctioned: { bg: '#fee2e2', fg: '#991b1b', label: 'SANCTIONED' },
}

export default function RutasPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [selectedLine, setSelectedLine] = useState<string>('')
  const [selectedLane, setSelectedLane] = useState<string>('')
  const [selectedChokepoint, setSelectedChokepoint] = useState<string>('')

  const { items: lines, dataQuality: linesQ } = useShippingLines()
  const { items: services, dataQuality: svcQ } = useCarrierServices({
    line: selectedLine || undefined,
    trade_lane: selectedLane || undefined,
  })
  const { items: catalog } = usePortCatalog()

  // Coords por slug para dibujar Bezier · falla cerrado con (0,0)
  const portCoords = useMemo(() => {
    const m = new Map<string, { lat: number; lon: number; name: string }>()
    for (const p of catalog) {
      m.set(p.slug, { lat: p.lat, lon: p.lon, name: p.name })
    }
    return m
  }, [catalog])

  // Servicios filtrados por chokepoint (cliente · backend no expone aún)
  const filteredServices = useMemo(() => {
    if (!selectedChokepoint) return services
    return services.filter((s: any) =>
      (s.main_chokepoints || []).includes(selectedChokepoint),
    )
  }, [services, selectedChokepoint])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <MaritimoShell />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 20px' }}>
        <Link
          href="/puertos"
          style={{ color: ACCENT, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}
        >
          ← Puertos & Comercio Global
        </Link>
        <header style={{ marginTop: 10 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              color: ACCENT,
              fontWeight: 700,
              margin: 0,
            }}
          >
            RUTAS MARÍTIMAS · NAVIERAS · ALIANZAS
          </p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#0f172a',
              margin: '4px 0',
            }}
          >
            Red de servicios mundial
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            {lines.length} navieras · {services.length} servicios curados ·{' '}
            {filteredServices.length} filtrados
          </p>
        </header>

        {/* Filtros */}
        <section
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            padding: 12,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
          }}
        >
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            style={selectStyle}
          >
            <option value="">Todas las navieras</option>
            {lines.map((l: any) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            value={selectedLane}
            onChange={(e) => setSelectedLane(e.target.value)}
            style={selectStyle}
          >
            {TRADE_LANES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={selectedChokepoint}
            onChange={(e) => setSelectedChokepoint(e.target.value)}
            style={selectStyle}
          >
            {CHOKEPOINTS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {svcQ && <DataQualityBadge quality={svcQ} />}
          </div>
        </section>

        {/* Mapa con rutas */}
        <section
          style={{
            marginTop: 16,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: 0.8,
              color: '#64748b',
              fontWeight: 700,
              margin: '0 0 10px',
            }}
          >
            MAPA MUNDIAL · ROTACIONES
          </p>
          <RoutesMap services={filteredServices} portCoords={portCoords} />
        </section>

        {/* Tabla servicios */}
        <section
          style={{
            marginTop: 16,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: 0.8,
              color: '#64748b',
              fontWeight: 700,
              margin: '0 0 10px',
            }}
          >
            SERVICIOS ({filteredServices.length})
          </p>
          {filteredServices.length === 0 ? (
            <p style={{ fontSize: 12, color: '#94a3b8' }}>
              Sin servicios para esos filtros.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}
              >
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={th}>Código</th>
                    <th style={th}>Servicio</th>
                    <th style={th}>Naviera</th>
                    <th style={th}>Alianza</th>
                    <th style={th}>Lane</th>
                    <th style={{ ...th, textAlign: 'right' }}>Cap. TEU</th>
                    <th style={{ ...th, textAlign: 'right' }}>Tránsito</th>
                    <th style={th}>Escalas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((s: any) => (
                    <tr
                      key={s.service_code}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 600 }}>
                        {s.service_code}
                      </td>
                      <td style={td}>{s.service_name}</td>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {s.shipping_line_slug}
                      </td>
                      <td style={td}>
                        {s.alliance && (
                          <AllianceChip alliance={s.alliance} />
                        )}
                      </td>
                      <td style={{ ...td, color: '#64748b' }}>{s.trade_lane}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {fmtInt(s.avg_capacity_teu)}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {s.estimated_transit_days
                          ? `${s.estimated_transit_days}d`
                          : '—'}
                      </td>
                      <td style={{ ...td, color: '#475569', fontSize: 11 }}>
                        {(s.port_rotation || [])
                          .map((r: any) => r.port_slug)
                          .join(' → ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Lista navieras */}
        <section
          style={{
            marginTop: 16,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: 0.8,
              color: '#64748b',
              fontWeight: 700,
              margin: '0 0 10px',
            }}
          >
            NAVIERAS ({lines.length})
            {linesQ && <span style={{ marginLeft: 8 }}><DataQualityBadge quality={linesQ} /></span>}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 10,
            }}
          >
            {lines.map((l: any) => {
              const sanc = SANCTIONS_STYLE[l.sanctions_risk ?? 'none']
              return (
                <div
                  key={l.slug}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 10,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedLine(l.slug)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#111827',
                          margin: 0,
                        }}
                      >
                        {l.name}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: '#6b7280',
                          margin: '2px 0 0',
                        }}
                      >
                        {l.country_iso} ·{' '}
                        {l.lei ? <code style={{ fontSize: 10 }}>{l.lei.slice(0, 8)}…</code> : 'sin LEI'}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        padding: '2px 6px',
                        background: sanc.bg,
                        color: sanc.fg,
                        borderRadius: 4,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                      }}
                    >
                      {sanc.label}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {l.alliance && <AllianceChip alliance={l.alliance} />}
                    <span style={{ fontSize: 11, color: '#374151' }}>
                      {fmtInt(l.fleet_teu)} TEU
                    </span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      {fmtInt(l.fleet_size)} buques
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: 12,
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  background: '#fff',
  minWidth: 180,
}
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 11,
  fontWeight: 700,
  color: '#475569',
}
const td: React.CSSProperties = { padding: '8px 10px', color: '#1e293b' }

function AllianceChip({ alliance }: { alliance: string }) {
  const sty = ALLIANCE_STYLE[alliance] ?? ALLIANCE_STYLE.standalone
  return (
    <span
      style={{
        fontSize: 9,
        padding: '2px 6px',
        background: sty.bg,
        color: sty.fg,
        borderRadius: 999,
        fontWeight: 700,
        letterSpacing: 0.5,
      }}
    >
      {alliance.toUpperCase()}
    </span>
  )
}

/**
 * RoutesMap · mapa mundial con líneas Bezier conectando port_rotation.
 * Reutiliza react-simple-maps (ya integrado en WorldShippingMap).
 */
function RoutesMap({
  services,
  portCoords,
}: {
  services: any[]
  portCoords: Map<string, { lat: number; lon: number; name: string }>
}) {
  const [Lib, setLib] = useState<any | null>(null)
  const [topology, setTopology] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    import('react-simple-maps')
      .then((mod) => !cancel && setLib(mod))
      .catch((e) => !cancel && setError(String(e)))
    fetch(WORLD_GEOJSON)
      .then((r) => r.json())
      .then((j) => !cancel && setTopology(j))
      .catch(() => !cancel && setError('GeoJSON no disponible'))
    return () => {
      cancel = true
    }
  }, [])

  if (error || !Lib || !topology) {
    return (
      <div
        style={{
          height: 480,
          background: '#f9fafb',
          border: '1px dashed #d1d5db',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: 13,
        }}
      >
        {error ?? 'Cargando mapa mundial…'}
      </div>
    )
  }

  const { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup } = Lib

  // Colores por trade_lane · permite distinguir capas
  const LANE_COLOR: Record<string, string> = {
    asia_eu: '#2563eb',
    asia_med: '#0891b2',
    transpac: '#dc2626',
    transpac_east: '#b91c1c',
    transatlantic: '#7c3aed',
    me_eu: '#ea580c',
    intra_eu: '#16a34a',
    intra_asia: '#0d9488',
    africa: '#a16207',
    latin_america: '#9333ea',
  }

  // Junta todos los port_slugs activos para puntos
  const activeSlugs = new Set<string>()
  for (const svc of services) {
    for (const r of svc.port_rotation || []) activeSlugs.add(r.port_slug)
  }

  return (
    <div style={{ width: '100%', height: 520 }}>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 160 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup center={[10, 25]} zoom={1}>
          <Geographies geography={topology}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: {
                      fill: '#e5e7eb',
                      stroke: '#cbd5e1',
                      strokeWidth: 0.4,
                      outline: 'none',
                    },
                    hover: { fill: '#d1d5db', outline: 'none' },
                    pressed: { fill: '#9ca3af', outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Líneas geodésicas para cada par consecutivo de port_rotation */}
          {services.map((svc: any) => {
            const color = LANE_COLOR[svc.trade_lane] ?? '#475569'
            const rot = svc.port_rotation || []
            return rot.slice(0, -1).map((stop: any, i: number) => {
              const a = portCoords.get(stop.port_slug)
              const b = portCoords.get(rot[i + 1].port_slug)
              if (!a || !b) return null
              return (
                <Line
                  key={`${svc.service_code}-${i}`}
                  from={[a.lon, a.lat]}
                  to={[b.lon, b.lat]}
                  stroke={color}
                  strokeWidth={0.8}
                  strokeOpacity={0.55}
                  strokeLinecap="round"
                />
              )
            })
          })}

          {/* Puntos en cada puerto activo */}
          {Array.from(activeSlugs).map((slug) => {
            const c = portCoords.get(slug)
            if (!c) return null
            return (
              <Marker key={slug} coordinates={[c.lon, c.lat]}>
                <circle r={2.6} fill="#0f172a" stroke="#fff" strokeWidth={0.8} />
                <title>{c.name}</title>
              </Marker>
            )
          })}
        </ZoomableGroup>
      </ComposableMap>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          padding: '6px 4px',
          fontSize: 11,
          color: '#475569',
        }}
      >
        {Object.entries(LANE_COLOR).map(([k, v]) => (
          <span
            key={k}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span
              style={{
                width: 14,
                height: 2,
                background: v,
                display: 'inline-block',
              }}
            />
            {k.replace('_', ' ')}
          </span>
        ))}
      </div>
    </div>
  )
}
