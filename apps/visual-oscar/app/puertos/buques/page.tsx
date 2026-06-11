'use client'
/**
 * /puertos/buques · "Buques en vivo" · módulo marítimo.
 *
 * Lee AIS en vivo desde '/api/osiris/maritime' ({ ships, ports, chokepoints }).
 * Cada buque se enriquece en cliente con:
 *   - bandera (flagFromMmsi · MID del MMSI → país, '@/lib/maritimo/flags')
 *   - tipo  (shipTypeInfo · código AIS → categoría/label/color, cuando el
 *            backend trae el code; si solo trae la categoría inglesa ya
 *            colapsada, la mapeamos a la categoría canónica española).
 *
 * Degrada con honestidad: si AIS no devuelve datos (IP de datacenter sin
 * cobertura global, key ausente, red), mostramos un mensaje claro en lugar de
 * inventar buques. Estados loading / error / empty explícitos.
 *
 * Cero emojis (CLAUDE.md §0.5): glifos Unicode (⛴ ◉ ⬡ ◐ ● ◦ ⇡ ⟶). Marca
 * portuaria teal ACCENT '#0e7490'.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../../_components/AppHeader'
import MaritimoShell from '../_components/MaritimoShell'
import { Panel } from '@/components/SectorPanel'
import { SanctionsBadge } from '@/components/ports/SanctionsBadge'
import { isAuthenticated } from '@/lib/auth'
import { flagFromMmsi, isFlagOfConvenience, type FlagInfo } from '@/lib/maritimo/flags'
import {
  shipTypeInfo,
  SHIP_CATEGORY_COLOR,
  SHIP_CATEGORY_LABEL,
  type ShipCategory,
  type ShipTypeInfo,
} from '@/lib/maritimo/ship-types'
import type { SanctionsScreenResult } from '@/types/ports'

const ACCENT = '#0e7490' // teal portuario
const MARITIME_URL = '/api/osiris/maritime'

/**
 * Banderas bajo régimen de sanciones / alto escrutinio (OFAC, EU, UN, UK).
 * Lista conservadora · alimenta el <SanctionsBadge> a nivel de bandera cuando
 * NO hay screening por IMO disponible en esta vista. Indicativa, no exhaustiva.
 */
const SANCTIONED_FLAGS: Record<string, { level: SanctionsScreenResult['risk_level']; score: number }> = {
  RU: { level: 'HIGH', score: 85 },   // Rusia
  IR: { level: 'HIGH', score: 90 },   // Irán
  KP: { level: 'HIGH', score: 95 },   // Corea del Norte
  SY: { level: 'MEDIUM', score: 60 }, // Siria
  VE: { level: 'MEDIUM', score: 55 }, // Venezuela
}

/** Mapa categoría inglesa del backend → categoría canónica ES de ship-types. */
const BACKEND_CAT_TO_CANON: Record<string, ShipCategory> = {
  cargo: 'carga',
  tanker: 'tanque',
  passenger: 'pasaje',
  fishing: 'pesca',
  tug: 'remolcador',
  highspeed: 'alta_velocidad',
  military: 'militar',
  other: 'otro',
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos · forma del buque ya enriquecido para la tabla / KPIs.
// ─────────────────────────────────────────────────────────────────────────────
interface RawShip {
  id?: number | string
  mmsi?: number
  name?: string
  lat?: number
  lon?: number
  lng?: number
  sog?: number
  cog?: number | null
  speed?: number
  course?: number | null
  heading?: number
  type?: string | number // categoría inglesa colapsada o código AIS crudo
  shipType?: number       // código AIS crudo (si el backend lo expone)
  type_code?: number
  flag?: string
  destination?: string
  imo?: number
  moored?: boolean
}

interface EnrichedShip {
  mmsi?: number
  name: string
  lat: number | null
  lon: number | null
  speedKn: number | null
  courseDeg: number | null
  destination: string
  flag: FlagInfo | null
  flagIso: string
  foc: boolean // flag of convenience (open registry)
  category: ShipCategory
  typeLabel: string
  typeColor: string
  sanctions?: SanctionsScreenResult
}

interface MaritimeEnvelope {
  ships?: RawShip[]
  ports?: unknown[]
  chokepoints?: unknown[]
  total_ships?: number
  ships_source?: string
  timestamp?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Enriquecimiento (puro, sin red).
// ─────────────────────────────────────────────────────────────────────────────
function resolveType(s: RawShip): ShipTypeInfo {
  // 1) Código AIS numérico explícito → decodifica con la lib oficial.
  const code =
    typeof s.shipType === 'number'
      ? s.shipType
      : typeof s.type_code === 'number'
        ? s.type_code
        : typeof s.type === 'number'
          ? s.type
          : null
  if (code != null) return shipTypeInfo(code)

  // 2) Categoría inglesa ya colapsada por el backend → mapeo canónico.
  if (typeof s.type === 'string') {
    const canon = BACKEND_CAT_TO_CANON[s.type] ?? 'otro'
    return { categoria: canon, label: SHIP_CATEGORY_LABEL[canon], color: SHIP_CATEGORY_COLOR[canon] }
  }
  return { categoria: 'desconocido', label: SHIP_CATEGORY_LABEL.desconocido, color: SHIP_CATEGORY_COLOR.desconocido }
}

function sanctionsFor(flagIso: string, name: string, imo?: number): SanctionsScreenResult | undefined {
  const hit = SANCTIONED_FLAGS[flagIso]
  if (!hit) return undefined
  return {
    ok: true,
    imo: imo != null ? String(imo) : '',
    vessel_name: name,
    flag_iso: flagIso,
    hit: true,
    risk_score: hit.score,
    risk_level: hit.level,
    sources: [{ note: 'Bandera bajo régimen de sanciones (OFAC/EU/UN/UK)' }],
    checks: [],
  }
}

function enrich(s: RawShip): EnrichedShip {
  const flag = flagFromMmsi(s.mmsi)
  const flagIso = flag?.iso2 ?? (typeof s.flag === 'string' ? s.flag.toUpperCase() : '')
  const t = resolveType(s)
  const lat = typeof s.lat === 'number' ? s.lat : null
  const lon = typeof s.lon === 'number' ? s.lon : typeof s.lng === 'number' ? s.lng : null
  const speed =
    typeof s.speed === 'number' ? s.speed : typeof s.sog === 'number' ? s.sog : null
  const course =
    typeof s.course === 'number'
      ? s.course
      : typeof s.cog === 'number'
        ? s.cog
        : typeof s.heading === 'number'
          ? s.heading
          : null
  const name = (s.name && String(s.name).trim()) || (s.mmsi ? `MMSI ${s.mmsi}` : 'Sin nombre')
  return {
    mmsi: s.mmsi,
    name,
    lat,
    lon,
    speedKn: speed != null && Number.isFinite(speed) ? Math.round(speed * 10) / 10 : null,
    courseDeg: course != null && Number.isFinite(course) ? Math.round(course) : null,
    destination: (s.destination && String(s.destination).trim()) || '',
    flag,
    flagIso,
    foc: isFlagOfConvenience(s.mmsi),
    category: t.categoria,
    typeLabel: t.label,
    typeColor: t.color,
    sanctions: sanctionsFor(flagIso, name, s.imo),
  }
}

/** Rumbo en grados → punto cardinal de 8 sectores (no emoji). */
function cardinal(deg: number | null): string {
  if (deg == null) return '—'
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  return dirs[Math.round((deg % 360) / 45) % 8]
}

type SortKey = 'name' | 'flag' | 'type' | 'speed' | 'course' | 'destination'
type SortDir = 'asc' | 'desc'

// ─────────────────────────────────────────────────────────────────────────────
// Página.
// ─────────────────────────────────────────────────────────────────────────────
export default function BuquesEnVivoPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ships, setShips] = useState<EnrichedShip[]>([])
  const [source, setSource] = useState<string>('')
  const [fetchedAt, setFetchedAt] = useState<string>('')

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [flagFilter, setFlagFilter] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('speed')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(MARITIME_URL, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as MaritimeEnvelope
      })
      .then((data) => {
        if (cancelled) return
        const raw = Array.isArray(data.ships) ? data.ships : []
        setShips(raw.map(enrich))
        setSource(typeof data.ships_source === 'string' ? data.ships_source : '')
        setFetchedAt(typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString())
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Error desconocido')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // ── Desgloses por bandera / tipo (sobre el universo completo, no filtrado) ──
  const flagBreakdown = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of ships) {
      const k = s.flagIso || '??'
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return Array.from(m.entries()).map(([iso, n]) => ({ iso, n })).sort((a, b) => b.n - a.n)
  }, [ships])

  const typeBreakdown = useMemo(() => {
    const m = new Map<ShipCategory, number>()
    for (const s of ships) m.set(s.category, (m.get(s.category) ?? 0) + 1)
    return Array.from(m.entries())
      .map(([cat, n]) => ({ cat, n, label: SHIP_CATEGORY_LABEL[cat], color: SHIP_CATEGORY_COLOR[cat] }))
      .sort((a, b) => b.n - a.n)
  }, [ships])

  // ── KPIs ──
  const kpis = useMemo(() => {
    const total = ships.length
    const withDest = ships.filter((s) => s.destination).length
    const pctDest = total > 0 ? Math.round((withDest / total) * 100) : 0
    const sanctioned = ships.filter((s) => s.sanctions).length
    return {
      total,
      pctDest,
      sanctioned,
      topFlag: flagBreakdown[0] ?? null,
      topType: typeBreakdown[0] ?? null,
    }
  }, [ships, flagBreakdown, typeBreakdown])

  // ── Tabla filtrada + ordenada ──
  const filtered = useMemo(() => {
    const ql = query.trim().toLowerCase()
    let out = ships.filter((s) => {
      if (ql) {
        const hay =
          s.name.toLowerCase().includes(ql) ||
          (s.destination && s.destination.toLowerCase().includes(ql)) ||
          (s.flag?.pais.toLowerCase().includes(ql) ?? false) ||
          String(s.mmsi ?? '').includes(ql)
        if (!hay) return false
      }
      if (typeFilter && s.category !== typeFilter) return false
      if (flagFilter && s.flagIso !== flagFilter) return false
      return true
    })
    const dir = sortDir === 'asc' ? 1 : -1
    out = out.slice().sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name) * dir
        case 'flag':
          return (a.flag?.pais ?? a.flagIso).localeCompare(b.flag?.pais ?? b.flagIso) * dir
        case 'type':
          return a.typeLabel.localeCompare(b.typeLabel) * dir
        case 'destination':
          return a.destination.localeCompare(b.destination) * dir
        case 'course':
          return ((a.courseDeg ?? -1) - (b.courseDeg ?? -1)) * dir
        case 'speed':
        default:
          return ((a.speedKn ?? -1) - (b.speedKn ?? -1)) * dir
      }
    })
    return out
  }, [ships, query, typeFilter, flagFilter, sortKey, sortDir])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(k)
      setSortDir(k === 'name' || k === 'flag' || k === 'type' || k === 'destination' ? 'asc' : 'desc')
    }
  }

  const maxFlag = flagBreakdown[0]?.n ?? 1
  const maxType = typeBreakdown[0]?.n ?? 1

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd' }}>
      <AppHeader />
      <MaritimoShell subtitle="Buques en vivo · posiciones AIS, bandera y tipo en tiempo real" />

      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '20px 28px 48px' }}>
        <header style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, letterSpacing: 1.2, color: ACCENT, fontWeight: 700, margin: 0 }}>
            ⛴ AIS EN VIVO · POSICIÓN · BANDERA · TIPO · DESTINO
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1d1d1f', margin: '4px 0 0' }}>
            Buques en vivo
          </h1>
          <p style={{ fontSize: 13, color: '#6e6e73', marginTop: 6 }}>
            {loading
              ? 'Recogiendo posiciones AIS…'
              : error
                ? 'AIS no disponible en este momento.'
                : `${ships.length.toLocaleString('es-ES')} buques con posición · ${kpis.pctDest}% con destino declarado`}
            {fetchedAt && !loading && !error ? (
              <span style={{ color: '#86868b' }}>
                {' '}
                · {new Date(fetchedAt).toLocaleString('es-ES')}
              </span>
            ) : null}
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              style={{
                marginLeft: 10,
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                background: ACCENT,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              ↻ Actualizar
            </button>
          </p>
          {source && !loading && !error ? (
            <p style={{ fontSize: 11, color: '#86868b', margin: '6px 0 0' }}>Fuente: {source}</p>
          ) : null}
        </header>

        {/* ───────────────────────── Estado: LOADING ───────────────────────── */}
        {loading ? (
          <Panel title="Cargando AIS">
            <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>
              Abriendo el stream AIS y uniendo posiciones por MMSI. Esto puede tardar unos segundos.
            </p>
          </Panel>
        ) : error ? (
          /* ──────────────────────── Estado: ERROR ─────────────────────────── */
          <Panel title="AIS no disponible">
            <p style={{ fontSize: 13, color: '#991b1b', margin: 0, fontWeight: 600 }}>
              No se pudo recoger el feed AIS ({error}).
            </p>
            <p style={{ fontSize: 12.5, color: '#6e6e73', margin: '8px 0 0' }}>
              El endpoint degrada a HTTP 200 con lista vacía cuando no hay cobertura. Sin datos
              inventados: vuelve a intentarlo con el botón Actualizar. La cobertura global del
              stream se recibe desde el navegador; las IP de datacenter pueden no obtener barcos
              fuera del Báltico.
            </p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              style={{
                marginTop: 12,
                padding: '7px 16px',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                background: ACCENT,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              ↻ Reintentar
            </button>
          </Panel>
        ) : ships.length === 0 ? (
          /* ──────────────────────── Estado: EMPTY ─────────────────────────── */
          <Panel title="Sin buques AIS ahora mismo">
            <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>
              El feed respondió correctamente pero no devolvió posiciones en esta ventana de
              recogida. Esto es esperable desde IP de datacenter (cobertura global del stream solo
              en cliente). Pulsa Actualizar para reintentar; no se muestran buques sintéticos.
            </p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              style={{
                marginTop: 12,
                padding: '7px 16px',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                background: ACCENT,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              ↻ Reintentar
            </button>
          </Panel>
        ) : (
          /* ──────────────────────── Estado: DATOS ─────────────────────────── */
          <>
            {/* KPIs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <Kpi label="Buques en vivo" value={kpis.total.toLocaleString('es-ES')} glyph="⛴" />
              <Kpi label="Con destino AIS" value={`${kpis.pctDest}%`} glyph="⟶" />
              <Kpi
                label="Bandera dominante"
                value={kpis.topFlag ? `${kpis.topFlag.iso} · ${kpis.topFlag.n}` : '—'}
                glyph="◉"
              />
              <Kpi
                label="Tipo dominante"
                value={kpis.topType ? `${kpis.topType.label} · ${kpis.topType.n}` : '—'}
                glyph="◧"
                accent={kpis.topType?.color}
              />
              <Kpi
                label="Banderas sancionadas"
                value={kpis.sanctioned.toLocaleString('es-ES')}
                glyph="!"
                accent={kpis.sanctioned > 0 ? '#dc2626' : undefined}
              />
            </div>

            {/* Tabla de buques */}
            <Panel
              title="Buques en vivo · tabla"
              subtitle={`${filtered.length.toLocaleString('es-ES')} de ${ships.length.toLocaleString('es-ES')}`}
              marginBottom
            >
              {/* Buscador + filtros */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar nombre, país, destino, MMSI…"
                  style={inputStyle}
                />
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
                  <option value="">Todos los tipos</option>
                  {typeBreakdown.map((t) => (
                    <option key={t.cat} value={t.cat}>
                      {t.label} ({t.n})
                    </option>
                  ))}
                </select>
                <select value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)} style={selectStyle}>
                  <option value="">Todas las banderas</option>
                  {flagBreakdown.map((f) => (
                    <option key={f.iso} value={f.iso}>
                      {f.iso} ({f.n})
                    </option>
                  ))}
                </select>
                {(query || typeFilter || flagFilter) && (
                  <button
                    onClick={() => {
                      setQuery('')
                      setTypeFilter('')
                      setFlagFilter('')
                    }}
                    style={{
                      padding: '7px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {filtered.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                  Ningún buque coincide con los filtros actuales.
                </p>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: 620, overflowY: 'auto', border: '1px solid #eef0f2', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: '#f6f7f9', position: 'sticky', top: 0, zIndex: 1 }}>
                        <Th label="Buque" k="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                        <Th label="Bandera · país" k="flag" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                        <Th label="Tipo" k="type" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                        <Th label="Velocidad" k="speed" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                        <Th label="Rumbo" k="course" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                        <Th label="Destino AIS" k="destination" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 600).map((s, i) => (
                        <tr key={`${s.mmsi ?? 'x'}-${i}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={td}>
                            <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{s.name}</span>
                            {s.mmsi ? (
                              <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 6 }}>· {s.mmsi}</span>
                            ) : null}
                            {s.sanctions ? (
                              <div style={{ marginTop: 4 }}>
                                <SanctionsBadge result={s.sanctions} />
                              </div>
                            ) : null}
                          </td>
                          <td style={td}>
                            {s.flagIso ? (
                              <span>
                                <strong style={{ color: '#334155' }}>{s.flagIso}</strong>
                                {s.flag ? <span style={{ color: '#6e6e73' }}> · {s.flag.pais}</span> : null}
                                {s.foc ? (
                                  <span
                                    title="Bandera de conveniencia (registro abierto)"
                                    style={{ marginLeft: 6, fontSize: 10, color: '#b45309', fontWeight: 700 }}
                                  >
                                    ◦ FOC
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td style={td}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontWeight: 600,
                                color: s.typeColor,
                              }}
                            >
                              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: s.typeColor, display: 'inline-block' }} />
                              {s.typeLabel}
                            </span>
                          </td>
                          <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {s.speedKn != null ? `${s.speedKn.toFixed(1)} kn` : '—'}
                          </td>
                          <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {s.courseDeg != null ? `${s.courseDeg}° ${cardinal(s.courseDeg)}` : '—'}
                          </td>
                          <td style={td}>
                            {s.destination ? (
                              <span style={{ color: '#334155' }}>{s.destination}</span>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>sin declarar</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length > 600 ? (
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 10px' }}>
                      Mostrando los primeros 600 de {filtered.length.toLocaleString('es-ES')}. Afina con el buscador o los filtros.
                    </p>
                  ) : null}
                </div>
              )}
            </Panel>

            {/* Desgloses por bandera y por tipo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              <Panel title="Desglose por bandera" subtitle={`${flagBreakdown.length} países`}>
                <Bars
                  items={flagBreakdown.slice(0, 14).map((f) => ({
                    key: f.iso,
                    label: f.iso,
                    n: f.n,
                    color: ACCENT,
                  }))}
                  max={maxFlag}
                  total={ships.length}
                  onClick={(iso) => setFlagFilter((cur) => (cur === iso ? '' : iso))}
                  active={flagFilter}
                />
              </Panel>

              <Panel title="Desglose por tipo" subtitle={`${typeBreakdown.length} categorías`}>
                <Bars
                  items={typeBreakdown.map((t) => ({ key: t.cat, label: t.label, n: t.n, color: t.color }))}
                  max={maxType}
                  total={ships.length}
                  onClick={(cat) => setTypeFilter((cur) => (cur === cat ? '' : cat))}
                  active={typeFilter}
                />
              </Panel>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes locales.
// ─────────────────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 220,
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#fff',
}
const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#fff',
}
const td: React.CSSProperties = { padding: '8px 10px', color: '#1e293b', verticalAlign: 'top' }

function Kpi({ label, value, glyph, accent }: { label: string; value: string; glyph: string; accent?: string }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#86868b', textTransform: 'uppercase' }}>
        <span aria-hidden style={{ color: accent ?? ACCENT, marginRight: 6 }}>
          {glyph}
        </span>
        {label}
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 800, color: accent ?? '#1d1d1f', letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  )
}

function Th({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  align,
}: {
  label: string
  k: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onSort: (k: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sortKey === k
  return (
    <th
      onClick={() => onSort(k)}
      style={{
        textAlign: align ?? 'left',
        padding: '9px 10px',
        fontSize: 11,
        fontWeight: 700,
        color: active ? ACCENT : '#475569',
        letterSpacing: 0.4,
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <span aria-hidden style={{ marginLeft: 4, opacity: active ? 1 : 0.25 }}>
        {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  )
}

function Bars({
  items,
  max,
  total,
  onClick,
  active,
}: {
  items: Array<{ key: string; label: string; n: number; color: string }>
  max: number
  total: number
  onClick: (key: string) => void
  active: string
}) {
  if (items.length === 0) return <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Sin datos.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {items.map((it) => {
        const pct = max > 0 ? (it.n / max) * 100 : 0
        const share = total > 0 ? Math.round((it.n / total) * 100) : 0
        const isActive = active === it.key
        return (
          <button
            key={it.key}
            onClick={() => onClick(it.key)}
            title={`Filtrar por ${it.label}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '92px 1fr 70px',
              alignItems: 'center',
              gap: 8,
              padding: '2px 4px',
              border: isActive ? `1px solid ${it.color}` : '1px solid transparent',
              borderRadius: 6,
              background: isActive ? '#f8fafc' : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {it.label}
            </span>
            <span style={{ height: 10, background: '#eef0f2', borderRadius: 999, overflow: 'hidden', display: 'block' }}>
              <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: it.color, borderRadius: 999 }} />
            </span>
            <span style={{ fontSize: 11.5, color: '#6e6e73', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {it.n.toLocaleString('es-ES')} · {share}%
            </span>
          </button>
        )
      })}
    </div>
  )
}
