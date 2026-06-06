'use client'
/**
 * <H2ProjectsMap /> · Vista Hidrógeno · Sprint Energía E8
 *
 * Mapa de los proyectos de hidrógeno renovable de España POSICIONADOS por
 * lat/lon sobre una silueta SVG procedural de la península + Baleares, con
 * color por FASE (planificado → desarrollo → FID → construcción → operación),
 * leyenda con el conteo `por_fase` y un timeline de horizonte (año objetivo).
 *
 * Consume el endpoint NUEVO `GET /api/energia/h2-projects-status` (que enriquece
 * el catálogo curado con fase canónica, ultima_revision, fuente_url y coords).
 * Cada proyecto enlaza a su `fuente_url`. No hay API live de proyectos H2 → el
 * dato es CURADO pero datado (cada chincheta lleva su fecha de revisión y fuente).
 *
 * Degradación honesta (CLAUDE.md · spec §"Degradación honesta"): si el endpoint
 * responde `ok:false` o sin proyectos con coords, se muestra un empty-state claro
 * en vez de un mapa vacío. Cero emojis · Unicode geométrico (◆ ⬢ ⟶).
 *
 * NO toca EnergiaShell / catalog / types / shared / lib / app/api: solo CONSUME
 * el endpoint y dibuja. Los tipos de la respuesta se declaran aquí (locales).
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'

const H2 = '#0D9488'
const H2_DARK = '#115E59'

// ── Tipos locales (espejo de la respuesta del endpoint · no se importa lib) ──
type H2Fase = 'planificado' | 'desarrollo' | 'fid' | 'construccion' | 'operacion'

interface H2ProjectStatus {
  nombre: string
  promotor: string
  ubicacion: string
  capacidad_mw: number
  estado: string
  horizonte?: number
  fase: H2Fase
  fase_label: string
  ultima_revision: string
  fuente_url: string
  lat: number | null
  lon: number | null
  enriched: boolean
}

interface H2StatusData {
  proyectos: H2ProjectStatus[]
  por_fase: Record<H2Fase, number>
  capacidad_total_mw: number
  enriched_count: number
  total_count: number
  ultima_revision_global: string | null
}

interface H2StatusResponse {
  ok: boolean
  error?: string
  data?: H2StatusData
  fetched_at?: string
  source_url?: string
}

// ── Color + orden + etiqueta por fase (orden de madurez) ────────────────────
const FASE_ORDER: H2Fase[] = ['planificado', 'desarrollo', 'fid', 'construccion', 'operacion']
const FASE_COLOR: Record<H2Fase, string> = {
  planificado: '#F59E0B',
  desarrollo: '#8B5CF6',
  fid: '#6366F1',
  construccion: '#0EA5E9',
  operacion: '#16A34A',
}
const FASE_LABEL: Record<H2Fase, string> = {
  planificado: 'Planificado',
  desarrollo: 'En desarrollo',
  fid: 'Decisión de inversión (FID)',
  construccion: 'En construcción',
  operacion: 'En operación',
}

// ── Proyección lon/lat → x/y del viewBox del mapa ───────────────────────────
// Caja geográfica que cubre península + Baleares + Canarias (estas últimas se
// re-encajan abajo a la izquierda como inset, convención cartográfica española).
const MAP_W = 720
const MAP_H = 520
// Península + Baleares.
const LON_MIN = -9.8
const LON_MAX = 4.6
const LAT_MIN = 35.6
const LAT_MAX = 43.9

function projectMain(lon: number, lat: number): { x: number; y: number } {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_W
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H
  return { x, y }
}

// Canarias (lon ~ -18..-13.4, lat ~ 27.6..29.5) → inset abajo izquierda.
const CAN_LON_MIN = -18.3
const CAN_LON_MAX = -13.3
const CAN_LAT_MIN = 27.5
const CAN_LAT_MAX = 29.5
const CAN_BOX = { x: 18, y: 392, w: 150, h: 96 }

function isCanarias(lon: number, lat: number): boolean {
  return lon <= -13 && lat <= 30
}

function projectCanarias(lon: number, lat: number): { x: number; y: number } {
  const x = CAN_BOX.x + ((lon - CAN_LON_MIN) / (CAN_LON_MAX - CAN_LON_MIN)) * CAN_BOX.w
  const y = CAN_BOX.y + ((CAN_LAT_MAX - lat) / (CAN_LAT_MAX - CAN_LAT_MIN)) * CAN_BOX.h
  return { x, y }
}

function projectPoint(lon: number, lat: number): { x: number; y: number } {
  return isCanarias(lon, lat) ? projectCanarias(lon, lat) : projectMain(lon, lat)
}

// Silueta SVG aproximada de la España peninsular (path estilizado, no
// cartográficamente exacto: orienta la posición relativa de las chinchetas).
// Coordenadas en el espacio del viewBox MAP_W×MAP_H.
const PENINSULA_PATH =
  'M 95 96 ' +
  'L 175 70 L 250 72 L 318 60 L 372 70 L 420 64 L 470 96 ' +
  'L 520 120 L 560 150 L 588 150 L 612 178 L 600 210 ' +
  'L 628 236 L 612 270 L 560 300 L 520 318 L 470 360 ' +
  'L 420 392 L 372 410 L 320 420 L 268 414 L 232 430 ' +
  'L 196 420 L 150 392 L 120 350 L 96 300 L 78 250 ' +
  'L 66 200 L 72 150 L 95 96 Z'
// Baleares (bloque estilizado a la derecha).
const BALEARES_PATH = 'M 632 300 l 30 -6 l 14 14 l -10 18 l -26 6 l -14 -16 Z'

interface H2ProjectsMapProps {
  /** Notifica al padre la última revisión global (para badges de frescura). */
  onLoaded?: (d: H2StatusData | null) => void
}

export function H2ProjectsMap({ onLoaded }: H2ProjectsMapProps) {
  const [data, setData] = useState<H2StatusData | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch('/api/energia/h2-projects-status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j: H2StatusResponse | null) => {
        if (!alive) return
        if (j?.ok && j.data) {
          setData(j.data)
          setErr(null)
          onLoaded?.(j.data)
        } else {
          setData(null)
          setErr(j?.error ?? 'sin datos')
          onLoaded?.(null)
        }
        setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Proyectos con coordenadas (los únicos posicionables en el mapa).
  const located = useMemo(
    () => (data?.proyectos ?? []).filter((p) => p.lat != null && p.lon != null),
    [data],
  )
  const sinCoords = (data?.proyectos.length ?? 0) - located.length

  // Radio de la chincheta ∝ capacidad (infra = radio mínimo fijo).
  const maxCap = useMemo(() => Math.max(1, ...located.map((p) => p.capacidad_mw)), [located])
  const radiusOf = (mw: number) => {
    if (mw <= 0) return 5
    return 6 + Math.sqrt(mw / maxCap) * 12
  }

  // Timeline: años-horizonte presentes en el conjunto (con coords o no).
  const horizonYears = useMemo(() => {
    const ys = (data?.proyectos ?? [])
      .map((p) => p.horizonte)
      .filter((y): y is number => typeof y === 'number' && y > 0)
    return Array.from(new Set(ys)).sort((a, b) => a - b)
  }, [data])

  return (
    <Panel
      title="Mapa de proyectos de hidrógeno por fase"
      subtitle="Proyectos H2 verde ES posicionados por coordenadas · color por fase (planificado ⟶ operación) · cada chincheta enlaza a su fuente"
      marginBottom
      sourceUrl={data ? undefined : 'https://www.miteco.gob.es/es/energia/estrategia-normativa/hoja-de-ruta-hidrogeno.html'}
      sourceTooltip="PERTE ERHA (MITECO) + anuncios de promotores · proyectos curados y datados (no hay API pública en vivo)"
    >
      {loading ? (
        <div style={{ height: 360, borderRadius: 12, background: '#F0FDFA', border: '1px solid #CCFBF1' }} />
      ) : !data || located.length === 0 ? (
        <EmptyState err={err} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(220px, 1fr)', gap: 16 }}>
          {/* ── Mapa SVG ── */}
          <div style={{ position: 'relative', background: '#F8FAFC', border: '1px solid #ECECEF', borderRadius: 12, overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Mapa de proyectos de hidrógeno en España">
              <defs>
                <linearGradient id="h2-land" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ECFEFF" />
                  <stop offset="100%" stopColor="#CFFAFE" />
                </linearGradient>
              </defs>
              {/* Silueta península + Baleares */}
              <path d={PENINSULA_PATH} fill="url(#h2-land)" stroke="#99F6E4" strokeWidth={1.5} />
              <path d={BALEARES_PATH} fill="url(#h2-land)" stroke="#99F6E4" strokeWidth={1.5} />
              {/* Inset Canarias */}
              <rect x={CAN_BOX.x - 6} y={CAN_BOX.y - 6} width={CAN_BOX.w + 12} height={CAN_BOX.h + 12} rx={8} fill="#F0FDFA" stroke="#CCFBF1" strokeDasharray="3 3" />
              <text x={CAN_BOX.x - 2} y={CAN_BOX.y - 11} fontSize={9} fill="#86868b" fontWeight={700}>
                CANARIAS
              </text>

              {/* Chinchetas de proyectos */}
              {located.map((p) => {
                const { x, y } = projectPoint(p.lon as number, p.lat as number)
                const col = FASE_COLOR[p.fase]
                const r = radiusOf(p.capacidad_mw)
                const active = hover === p.nombre
                return (
                  <a key={p.nombre} href={p.fuente_url} target="_blank" rel="noreferrer">
                    <g
                      onMouseEnter={() => setHover(p.nombre)}
                      onMouseLeave={() => setHover(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx={x} cy={y} r={r + 4} fill={col} opacity={active ? 0.28 : 0.14} />
                      <circle cx={x} cy={y} r={r} fill={col} stroke="#fff" strokeWidth={2} opacity={0.95} />
                      {active && (
                        <g>
                          <rect x={x + 10} y={y - 30} width={Math.max(120, p.nombre.length * 6.2)} height={40} rx={6} fill="#1d1d1f" opacity={0.94} />
                          <text x={x + 18} y={y - 15} fontSize={10.5} fontWeight={700} fill="#fff">
                            {p.nombre.length > 26 ? p.nombre.slice(0, 25) + '…' : p.nombre}
                          </text>
                          <text x={x + 18} y={y - 2} fontSize={9} fill="#A7F3D0">
                            {p.fase_label}
                            {p.capacidad_mw > 0 ? ` · ${p.capacidad_mw.toLocaleString('es-ES')} MW` : ' · infraestructura'}
                          </text>
                        </g>
                      )}
                    </g>
                  </a>
                )
              })}
            </svg>
            <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 9, color: '#94A3B8' }}>
              Silueta esquemática · posición por lat/lon
            </div>
          </div>

          {/* ── Leyenda + frescura + proyectos sin coords ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 10 }}>
                Proyectos por fase
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {FASE_ORDER.map((f) => {
                  const n = data.por_fase?.[f] ?? 0
                  return (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 999, background: FASE_COLOR[f], flexShrink: 0, border: '2px solid #fff', boxShadow: `0 0 0 1px ${FASE_COLOR[f]}55` }} />
                      <span style={{ fontSize: 11.5, color: '#1d1d1f', flex: 1 }}>{FASE_LABEL[f]}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: n > 0 ? H2_DARK : '#C0C0C5' }}>{n}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10.5, color: '#6e6e73' }}>Electrólisis catalogada</span>
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: H2_DARK }}>
                  {(data.capacidad_total_mw / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} <span style={{ fontSize: 9, color: '#9CA3AF' }}>GW</span>
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 9.5, color: '#94A3B8', lineHeight: 1.4 }}>
                El radio de cada chincheta es proporcional a la capacidad de electrólisis del proyecto.
              </p>
            </div>

            {/* Frescura · honestidad de datos */}
            <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#134E4A', lineHeight: 1.5 }}>
                <span aria-hidden="true" style={{ color: H2, marginRight: 5 }}>⬢</span>
                <strong>Catálogo curado y datado.</strong> {data.enriched_count} de {data.total_count} proyectos con coordenadas + fuente verificada.
                {data.ultima_revision_global && (
                  <>
                    {' '}Última revisión: <strong>{data.ultima_revision_global}</strong>.
                  </>
                )}
                {sinCoords > 0 && (
                  <>
                    {' '}{sinCoords} sin coordenadas (no aparecen en el mapa).
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Timeline de horizonte ── */}
      {!loading && data && horizonYears.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 10 }}>
            Horizonte de puesta en marcha (año objetivo)
          </div>
          <HorizonTimeline years={horizonYears} proyectos={data.proyectos} />
        </div>
      )}
    </Panel>
  )
}

export default H2ProjectsMap

// ── Timeline de horizonte: agrupa proyectos por año objetivo ────────────────
function HorizonTimeline({ years, proyectos }: { years: number[]; proyectos: H2ProjectStatus[] }) {
  const minY = years[0]
  const maxY = years[years.length - 1]
  const span = Math.max(1, maxY - minY)
  return (
    <div style={{ position: 'relative', padding: '4px 0 0' }}>
      {/* Eje */}
      <div style={{ position: 'relative', height: 2, background: '#E2E8F0', margin: '20px 12px 0' }}>
        {years.map((y) => {
          const left = ((y - minY) / span) * 100
          const enYear = proyectos.filter((p) => p.horizonte === y)
          const dominante = pickDominantFase(enYear)
          return (
            <div key={y} style={{ position: 'absolute', left: `${left}%`, top: -6, transform: 'translateX(-50%)', textAlign: 'center' }}>
              <span style={{ display: 'block', width: 14, height: 14, borderRadius: 999, background: FASE_COLOR[dominante], border: '2px solid #fff', boxShadow: '0 0 0 1px #CBD5E1', margin: '0 auto' }} />
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>{y}</div>
              <div style={{ fontSize: 9, color: '#86868b' }}>{enYear.length} {enYear.length === 1 ? 'proy.' : 'proy.'}</div>
            </div>
          )
        })}
      </div>
      <div style={{ height: 48 }} />
    </div>
  )
}

function pickDominantFase(ps: H2ProjectStatus[]): H2Fase {
  if (ps.length === 0) return 'planificado'
  const counts: Record<H2Fase, number> = { planificado: 0, desarrollo: 0, fid: 0, construccion: 0, operacion: 0 }
  for (const p of ps) counts[p.fase] += 1
  // El más maduro presente con mayor recuento.
  let best: H2Fase = 'planificado'
  let bestN = -1
  for (const f of FASE_ORDER) {
    if (counts[f] >= bestN) {
      bestN = counts[f]
      best = f
    }
  }
  return best
}

// ── Empty-state honesto ─────────────────────────────────────────────────────
function EmptyState({ err }: { err: string | null }) {
  return (
    <div style={{ padding: '28px 20px', textAlign: 'center', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 12 }}>
      <div style={{ fontSize: 22, color: H2, marginBottom: 6 }} aria-hidden="true">⬢</div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>Sin proyectos posicionables</p>
      <p style={{ margin: '6px auto 0', fontSize: 11, color: '#6e6e73', maxWidth: 420, lineHeight: 1.5 }}>
        El servicio de estado de proyectos de hidrógeno no devolvió datos con coordenadas
        {err ? ` (${err})` : ''}. El mapa requiere proyectos curados con lat/lon; el resto de la
        vista (subastas, backbone, empresas) sigue disponible.
      </p>
    </div>
  )
}
