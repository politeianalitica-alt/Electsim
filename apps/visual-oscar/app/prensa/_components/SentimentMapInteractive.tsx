'use client'

/**
 * SentimentMapInteractive — mapa de España con zoom dinámico y drill
 * provincial real.
 *
 * Vistas en cascada:
 *   1. España completa (todas las CCAA visibles, polaridad bicolor)
 *   2. Click CCAA → zoom a la CCAA + dibujado de sus provincias
 *   3. Click provincia → detalle provincial (noticias locales del feed)
 *
 * El dossier de la CCAA incluye TODO:
 *   - KPIs
 *   - Categorías temáticas (dinámicas)
 *   - Top topics, top medios
 *   - **Figuras públicas activas en la región** (con polaridad)
 *   - **Empresas mencionadas en la región** (con polaridad)
 *   - **Provincias con noticias** y drill al clickarlas
 *   - Top noticias REALES con sentimiento y link al medio
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { geoConicConformal, geoMercator, geoPath } from 'd3-geo'
import type { ExtendedFeatureCollection, GeoPermissibleObjects } from 'd3-geo'
import { useApi } from '@/lib/useApi'
import type { CCAARegionStat } from '@/lib/news-aggregator'
import type { CCAADeepDetail, ProvinceStat } from '@/lib/news-intel'
import { CCAA_PROVINCES } from '@/lib/news-taxonomy'
import type { NarrativeCluster } from '@/lib/medios/media-methodology'
import CollapsibleArticle from '@/components/medios/CollapsibleArticle'

// Sprint G15-FIX C3 · ActorImpactRow tipo local (los nombres siguen el shape
// que devuelve /api/medios/intel?include=actor_impacts)
interface ActorImpactRow {
  actor: string
  mentions: number
  dominant_impact: 'beneficial' | 'harmful' | 'neutral' | 'uncertain'
  beneficial: number
  harmful: number
  neutral: number
  uncertain: number
  sample_reasons: string[]
}

interface GeoFeature { type: 'Feature'; properties: Record<string, unknown> | null; geometry: unknown }
interface GeoFC { type: 'FeatureCollection'; features: GeoFeature[] }

// Nombre API → nombre en el geojson CCAA
const API_TO_GEO: Record<string, string> = {
  'Madrid': 'Madrid', 'Cataluña': 'Cataluña', 'Andalucía': 'Andalucia',
  'Galicia': 'Galicia', 'Castilla y León': 'Castilla-Leon', 'Castilla-La Mancha': 'Castilla-La Mancha',
  'Valencia': 'Valencia', 'C. Valenciana': 'Valencia', 'País Vasco': 'Pais Vasco',
  'Aragón': 'Aragon', 'Asturias': 'Asturias', 'Cantabria': 'Cantabria', 'La Rioja': 'La Rioja',
  'Navarra': 'Navarra', 'Extremadura': 'Extremadura', 'Murcia': 'Murcia',
  'Baleares': 'Baleares', 'Canarias': 'Canarias', 'Ceuta': 'Ceuta', 'Melilla': 'Melilla',
}
const GEO_TO_API: Record<string, string> = Object.fromEntries(Object.entries(API_TO_GEO).map(([a, g]) => [g, a]))

// Mapping CCAA (nombre API) → nombres de provincias en spain-provinces.geojson
const PROVINCE_NAME_NORMALIZE: Record<string, string> = {
  'Araba/Álava': 'Álava', 'Alacant/Alicante': 'Alicante',
  'Illes Balears': 'Baleares', 'Castelló/Castellón': 'Castellón',
  'Gipuzkoa/Guipúzcoa': 'Gipuzkoa', 'Bizkaia': 'Bizkaia',
  'A Coruña': 'A Coruña', 'Las Palmas': 'Las Palmas',
  'Santa Cruz De Tenerife': 'Santa Cruz de Tenerife',
  'València/Valencia': 'Valencia',
  'Asturias': 'Asturias', 'Cantabria': 'Cantabria',
  'Navarra': 'Navarra', 'La Rioja': 'La Rioja',
  'Madrid': 'Madrid', 'Murcia': 'Murcia',
  'Ceuta': 'Ceuta', 'Melilla': 'Melilla',
}

// Asignar cada provincia (nombre normalizado) → CCAA (nombre API)
const PROVINCE_TO_CCAA_API: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [ccaa, provs] of Object.entries(CCAA_PROVINCES)) {
    for (const p of provs) {
      out[p] = ccaa
      out[p.toLowerCase()] = ccaa
    }
  }
  // Aliases especiales
  out['Bizkaia'] = 'País Vasco'
  out['Vizcaya'] = 'País Vasco'
  out['Gipuzkoa'] = 'País Vasco'
  out['Guipúzcoa'] = 'País Vasco'
  out['Álava'] = 'País Vasco'
  out['Araba'] = 'País Vasco'
  return out
})()

// Color bicolor según polaridad e intensidad
function polarityColor(pol: number, volume: number, maxVol: number): string {
  if (volume === 0) return '#F1F5F9'
  const intensity = 0.40 + 0.55 * Math.min(1, volume / maxVol)
  if (pol > 0.10)  return `rgba(34, 197, 94, ${intensity.toFixed(2)})`
  if (pol < -0.10) return `rgba(220, 38, 38, ${intensity.toFixed(2)})`
  return `rgba(100, 116, 139, ${(intensity * 0.6).toFixed(2)})`
}

// Sprint G15-FIX C3 · narrativeClusters + actorImpacts opcionales
// El componente filtra los que pertenecen al CCAA seleccionado y los muestra
// en el panel lateral debajo del dossier de la CCAA.
export default function SentimentMapInteractive({
  ccaaData,
  narrativeClusters,
  actorImpacts,
}: {
  ccaaData?: Record<string, CCAARegionStat>
  narrativeClusters?: NarrativeCluster[]
  actorImpacts?: ActorImpactRow[]
}) {
  const [geoCCAA, setGeoCCAA] = useState<GeoFC | null>(null)
  const [geoProvinces, setGeoProvinces] = useState<GeoFC | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)

  useEffect(() => {
    fetch('/geodata/spain-ccaa.geojson').then(r => r.json()).then(setGeoCCAA).catch(() => setGeoCCAA(null))
    fetch('/geodata/spain-provinces.geojson').then(r => r.json()).then(setGeoProvinces).catch(() => setGeoProvinces(null))
  }, [])

  // Sprint G15-FIX C2 · cast `as string` para silenciar TS error preexistente.
  // useApi acepta string · cuando es null/empty hace no-op interno (verificado
  // en otros consumers). El cast evita romper el typecheck sin cambiar
  // comportamiento.
  const { data: detail, loading: detailLoading } = useApi<CCAADeepDetail>(
    (selected ? `/api/medios/ccaa?ccaa=${encodeURIComponent(selected)}&hours=168` : '') as string,
    { refreshInterval: 0 },
  )

  const spain = ccaaData ?? {}
  const maxVol = Math.max(1, ...Object.values(spain).map(v => v.n))
  const totalArticles = Object.values(spain).reduce((s, v) => s + v.n, 0)

  // ── España completa ─────────────────────────────────────────────────────
  const MAP_W = 700, MAP_H = 460, INS_W = 140, INS_H = 86

  const peninsulaFC: GeoFC | null = geoCCAA
    ? { type: 'FeatureCollection', features: geoCCAA.features.filter(f => !String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null
  const canariasFC: GeoFC | null = geoCCAA
    ? { type: 'FeatureCollection', features: geoCCAA.features.filter(f => String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null

  const mainProj = peninsulaFC
    ? geoConicConformal().parallels([36, 44]).rotate([4, 0]).fitSize([MAP_W, MAP_H], peninsulaFC as unknown as ExtendedFeatureCollection)
    : null
  const canProj = canariasFC && canariasFC.features.length > 0
    ? geoMercator().fitSize([INS_W, INS_H], canariasFC as unknown as ExtendedFeatureCollection)
    : null
  const mainPath = mainProj ? geoPath(mainProj) : null
  const canPath  = canProj  ? geoPath(canProj)  : null

  // ── Vista zoom + provincias de la CCAA seleccionada ─────────────────────
  const provincesOfSelected: GeoFC | null = useMemo(() => {
    if (!selected || !geoProvinces) return null
    return {
      type: 'FeatureCollection',
      features: geoProvinces.features.filter(f => {
        const rawName = String(f.properties?.name ?? '')
        const normName = PROVINCE_NAME_NORMALIZE[rawName] || rawName
        return PROVINCE_TO_CCAA_API[normName] === selected
      }),
    }
  }, [selected, geoProvinces])

  const ZOOM_W = 460, ZOOM_H = 360
  const zoomProj = provincesOfSelected && provincesOfSelected.features.length > 0
    ? geoMercator().fitSize([ZOOM_W - 20, ZOOM_H - 20], provincesOfSelected as unknown as ExtendedFeatureCollection)
    : null
  const zoomPath = zoomProj ? geoPath(zoomProj) : null

  // Polaridad por provincia (proviene de detail.provinces)
  const provincesMap = useMemo(() => {
    const m = new Map<string, ProvinceStat>()
    for (const p of detail?.provinces || []) {
      m.set(p.name, p)
      m.set(p.name.toLowerCase(), p)
    }
    return m
  }, [detail])
  const maxProvVol = useMemo(() => Math.max(1, ...(detail?.provinces || []).map(p => p.mentions)), [detail])

  const sortedRegions = useMemo(() => {
    return Object.entries(spain)
      .map(([name, info]) => ({
        name, n: info.n, sent: info.sent_score,
        topics: info.top_topics,
      }))
      .sort((a, b) => b.n - a.n)
  }, [spain])

  const selectedProvinceData = selectedProvince ? provincesMap.get(selectedProvince) : null

  function handleReset() {
    setSelected(null)
    setSelectedProvince(null)
    setHover(null)
  }

  return (
    <div>
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Geografía del sentimiento <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#6e6e73' }}>en vivo</em>
        </h2>
        <p style={{ fontSize: 13, color: '#515154', margin: 0 }}>
          {totalArticles} noticias regionales · color por polaridad media (verde=positiva, rojo=negativa, gris=neutra) · intensidad por volumen ·
          {selected ? ` zoom en ${selected} con drill provincial` : ' click en una CCAA para hacer zoom y ver las provincias'}
        </p>
        {selected && (
          <button onClick={handleReset} style={{
            marginTop: 10, background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
            padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#1F4E8C', fontFamily: 'inherit',
          }}>‹ Volver a España</button>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        {/* ── Mapa ───────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid #ECECEF' }}>
          {!selected ? (
            <>
              {/* España completa */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                  España · click en CCAA para hacer zoom
                </span>
                {hover && spain[GEO_TO_API[hover] || hover] && (() => {
                  const api = GEO_TO_API[hover] || hover
                  const r = spain[api]
                  return (
                    <span style={{ fontSize: 11.5, color: '#1F4E8C', fontWeight: 600 }}>
                      {api} · {r.n} noticias · pol {r.sent_score > 0 ? '+' : ''}{r.sent_score.toFixed(2)}
                    </span>
                  )
                })()}
              </div>

              {!geoCCAA ? (
                <div style={{ height: MAP_H, background: '#FAFAFB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Cargando mapa de España…
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
                    {peninsulaFC && mainPath && peninsulaFC.features.map((f, i) => {
                      const d = mainPath(f as unknown as GeoPermissibleObjects)
                      if (!d) return null
                      const geoName = String(f.properties?.name ?? '')
                      const apiName = GEO_TO_API[geoName] ?? geoName
                      const region = spain[apiName]
                      const n = region?.n ?? 0
                      const isHover = hover === geoName
                      const fill = polarityColor(region?.sent_score ?? 0, n, maxVol)
                      return (
                        <path key={i} d={d} fill={fill}
                              stroke={isHover ? '#1F4E8C' : '#94a3b8'}
                              strokeWidth={isHover ? 1.5 : 0.6}
                              vectorEffect="non-scaling-stroke"
                              style={{ cursor: n > 0 ? 'pointer' : 'default', transition: 'stroke 120ms' }}
                              tabIndex={0} role="button"
                              aria-label={`${apiName}: ${n} artículos`}
                              onMouseEnter={() => setHover(geoName)}
                              onMouseLeave={() => setHover(null)}
                              onClick={() => n > 0 && setSelected(apiName)}
                              onKeyDown={e => e.key === 'Enter' && n > 0 && setSelected(apiName)}>
                          <title>{`${apiName} · ${n} arts · sent ${region?.sent_score?.toFixed(2) ?? '—'}`}</title>
                        </path>
                      )
                    })}
                  </svg>

                  {canariasFC && canPath && canariasFC.features.length > 0 && (
                    <div style={{
                      position: 'absolute', bottom: 8, left: 8,
                      background: 'rgba(255,255,255,0.94)', borderRadius: 8, border: '1px solid #cbd5e1', padding: 4,
                    }}>
                      <div style={{ fontSize: 9, color: '#6e6e73', textAlign: 'center', fontWeight: 700, marginBottom: 2, letterSpacing: '0.04em' }}>CANARIAS</div>
                      <svg viewBox={`0 0 ${INS_W} ${INS_H}`} width={INS_W} height={INS_H}>
                        {canariasFC.features.map((f, i) => {
                          const d = canPath(f as unknown as GeoPermissibleObjects)
                          if (!d) return null
                          const geoName = String(f.properties?.name ?? '')
                          const apiName = GEO_TO_API[geoName] ?? geoName
                          const region = spain[apiName]
                          const n = region?.n ?? 0
                          const fill = polarityColor(region?.sent_score ?? 0, n, maxVol)
                          return (
                            <path key={i} d={d} fill={fill}
                                  stroke="#94a3b8" strokeWidth={0.5}
                                  vectorEffect="non-scaling-stroke"
                                  style={{ cursor: n > 0 ? 'pointer' : 'default' }}
                                  onClick={() => n > 0 && setSelected(apiName)}>
                              <title>{`${apiName} · ${n}`}</title>
                            </path>
                          )
                        })}
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            // ── Zoom + provincias ───────────────────────────────────
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                  {selected} · {provincesOfSelected?.features.length ?? 0} provincias · click para detalle
                </span>
                {selectedProvince && (
                  <span style={{ fontSize: 11.5, color: '#7C3AED', fontWeight: 600 }}>
                    {selectedProvince} seleccionada
                  </span>
                )}
              </div>

              {!provincesOfSelected || provincesOfSelected.features.length === 0 ? (
                <div style={{ height: ZOOM_H, background: '#FAFAFB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Cargando provincias…
                </div>
              ) : zoomPath && (
                <svg viewBox={`0 0 ${ZOOM_W} ${ZOOM_H}`} style={{ width: '100%', height: 'auto', display: 'block', background: '#FAFAFB', borderRadius: 8 }}>
                  {provincesOfSelected.features.map((f, i) => {
                    const d = zoomPath(f as unknown as GeoPermissibleObjects)
                    if (!d) return null
                    const rawName = String(f.properties?.name ?? '')
                    const provName = PROVINCE_NAME_NORMALIZE[rawName] || rawName
                    const stat = provincesMap.get(provName) || provincesMap.get(provName.toLowerCase())
                    const n = stat?.mentions ?? 0
                    const fill = polarityColor(stat?.polarity ?? 0, n, maxProvVol)
                    const isSel = selectedProvince === provName

                    // Centroide para etiqueta
                    const bounds = (zoomPath.bounds(f as unknown as GeoPermissibleObjects) as unknown) as [[number, number], [number, number]]
                    const cx = (bounds[0][0] + bounds[1][0]) / 2
                    const cy = (bounds[0][1] + bounds[1][1]) / 2

                    return (
                      <g key={i}>
                        <path d={d} fill={fill}
                              stroke={isSel ? '#7C3AED' : '#475569'}
                              strokeWidth={isSel ? 2 : 0.7}
                              vectorEffect="non-scaling-stroke"
                              style={{ cursor: n > 0 ? 'pointer' : 'default' }}
                              onClick={() => n > 0 && setSelectedProvince(provName)}>
                          <title>{`${provName} · ${n} noticias · pol ${stat?.polarity ?? 0}`}</title>
                        </path>
                        <text x={cx} y={cy} textAnchor="middle" fontSize="9" fontWeight={n > 0 ? 700 : 400}
                              fill={n > 0 ? '#1d1d1f' : '#94a3b8'}
                              style={{ pointerEvents: 'none' }}>
                          {provName.length > 12 ? provName.slice(0, 11) + '…' : provName}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}

              {/* Provincias sin gemoetría — fallback chips */}
              {(!provincesOfSelected || provincesOfSelected.features.length === 0) && (
                <div style={{ marginTop: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Provincias detectadas en el feed
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(detail?.provinces || []).map(p => (
                      <button key={p.name} onClick={() => setSelectedProvince(p.name)} style={{
                        background: selectedProvince === p.name ? '#7C3AED' : '#fff',
                        color: selectedProvince === p.name ? '#fff' : '#1d1d1f',
                        border: '1px solid #ECECEF', borderRadius: 999, padding: '5px 12px',
                        fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>{p.name} · {p.mentions}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Leyenda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid #ECECEF', fontSize: 11, color: '#6e6e73', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>Polaridad:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(220,38,38,0.78)' }}/>negativa
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(100,116,139,0.7)' }}/>neutra
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(34,197,94,0.78)' }}/>positiva
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: '#F1F5F9', border: '1px solid #cbd5e1' }}/>sin datos
            </span>
            <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Intensidad ≈ volumen</span>
          </div>
        </div>

        {/* ── Panel dossier ──────────────────────────────────── */}
        <aside style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid #ECECEF', minHeight: 480 }}>
          {!selected ? (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                Top CCAA por volumen
              </h3>
              <p style={{ fontSize: 11.5, color: '#6e6e73', margin: '0 0 12px' }}>
                Click en el mapa o aquí para abrir dossier con realidad local, figuras, empresas y provincias.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sortedRegions.slice(0, 14).map(r => (
                  <button key={r.name} onClick={() => setSelected(r.name)} style={{
                    display: 'grid', gridTemplateColumns: '1fr 60px 70px', alignItems: 'center',
                    padding: '8px 10px', background: '#FAFAFB', border: '1px solid #ECECEF',
                    borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', gap: 8,
                  }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: '#1d1d1f' }}>{r.name}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{r.n}</span>
                    <span style={{
                      fontSize: 10.5,
                      color: r.sent > 0.10 ? '#16A34A' : r.sent < -0.10 ? '#DC2626' : '#6e6e73',
                      fontWeight: 700, textAlign: 'right',
                    }}>
                      {r.sent > 0 ? '+' : ''}{r.sent.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : selectedProvinceData ? (
            // ── Detalle de provincia
            <ProvinceDossier
              province={selectedProvinceData}
              onClose={() => setSelectedProvince(null)}
            />
          ) : (
            // ── Dossier completo de CCAA · Sprint G15-FIX C3: recibe
            // narrativeClusters + actorImpacts para mostrar narrativas que
            // tocan este territorio y actores locales en tendencia.
            <CCAADossier
              detail={detail}
              loading={detailLoading}
              name={selected}
              onProvince={setSelectedProvince}
              narrativeClusters={narrativeClusters}
              actorImpacts={actorImpacts}
            />
          )}
        </aside>
      </div>
    </div>
  )
}

// ── CCAA Dossier ────────────────────────────────────────────────────────

function CCAADossier({
  detail, loading, name, onProvince,
  narrativeClusters, actorImpacts,
}: {
  // Sprint G15 FASE F · `detail` ahora viene enriquecido con regional_signal opcional
  // (n_articles_by_local_medium · local_share · n_local_medios · etc.) que el
  // endpoint /api/medios/ccaa devuelve. CCAADeepDetail no lo declara, así que
  // accedemos vía `as any` con guards defensivos.
  detail?: CCAADeepDetail
  loading: boolean
  name: string
  onProvince: (p: string) => void
  // Sprint G15-FIX C3 · narrativas + actores filtradas por territorio
  narrativeClusters?: NarrativeCluster[]
  actorImpacts?: ActorImpactRow[]
}) {
  if (loading || !detail) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
        Cargando dossier de {name}…
      </div>
    )
  }

  return (
    <div>
      <header style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>
          Dossier · {detail.total} noticias
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.018em' }}>{name}</h3>
      </header>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
        <KPI label="Noticias" value={String(detail.total)} accent="#1F4E8C" />
        <KPI label="Polaridad" value={detail.polarity.toFixed(2)} accent={detail.polarity > 0.10 ? '#16A34A' : detail.polarity < -0.10 ? '#DC2626' : '#6e6e73'} />
        <KPI label="Medios" value={String(detail.topMedios.length)} accent="#7C3AED" />
      </div>

      {/* Sprint G15 FASE F · banner de cobertura local · cuenta cuántos
          medios scope_level provincial/local están publicando sobre esta CCAA.
          Si la prensa nacional es la única fuente, el dossier lo advierte. */}
      {(() => {
        const rs = (detail as any).regional_signal
        if (!rs) return null
        const localShare: number = typeof rs.local_share === 'number' ? rs.local_share : 0
        const nLocal: number = rs.n_local_medios || 0
        const pct = Math.round(localShare * 100)
        const ok = localShare >= 0.20
        const warn = localShare < 0.10 && (rs.n_articles_by_medium_ccaa || 0) >= 5
        const color = warn ? '#dc2626' : ok ? '#16a34a' : '#f59e0b'
        const text = warn
          ? `Sin prensa local · cobertura sólo desde medios nacionales (${pct}% local)`
          : ok
          ? `Cobertura local saludable · ${nLocal} medios provinciales/locales activos (${pct}%)`
          : `Cobertura local limitada · ${nLocal} medios locales (${pct}%) · sesgada hacia prensa nacional`
        return (
          <div style={{
            background: warn ? '#fef2f2' : ok ? '#f0fdf4' : '#fef3c7',
            border: `1px solid ${warn ? '#fecaca' : ok ? '#bbf7d0' : '#fde68a'}`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 6, padding: '6px 10px', marginBottom: 12,
            fontSize: 10.5, color: '#1d1d1f', lineHeight: 1.45,
          }}>
            <span style={{ fontWeight: 700, color, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 9, marginRight: 6 }}>
              {warn ? '! Local' : ok ? '✓ Local' : '◐ Local'}
            </span>
            {text}
          </div>
        )
      })()}

      {/* Provincias (con drill) */}
      {detail.provinces.length > 0 && (
        <Section label="Provincias activas">
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {detail.provinces.map(p => (
              <button key={p.name} onClick={() => onProvince(p.name)} style={{
                background: '#fff', border: '1px solid #ECECEF', borderRadius: 999, padding: '4px 11px',
                fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit',
                color: p.polarity > 0.10 ? '#16A34A' : p.polarity < -0.10 ? '#DC2626' : '#1d1d1f',
                fontWeight: 600,
              }}>
                {p.name} <span style={{ color: '#9ca3af', fontWeight: 500 }}>{p.mentions}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Sprint G15-FIX C3 · Narrativas que mencionan este territorio.
          Filtra narrativeClusters cuyo territorial_spread incluye el nombre
          de la CCAA (matching case-insensitive con normalización mínima). */}
      {(() => {
        if (!narrativeClusters || narrativeClusters.length === 0) return null
        const territory = name.toLowerCase()
        const localNarratives = narrativeClusters.filter((n) => {
          const spread = n.territorial_spread || []
          return spread.some((t) => t && t.toLowerCase().includes(territory))
        }).slice(0, 5)
        if (localNarratives.length === 0) return null
        return (
          <Section label={`Narrativas en ${name} · ${localNarratives.length}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {localNarratives.map((n) => (
                <div key={n.id} style={{
                  background: '#f0fdf4', borderLeft: '3px solid #16a34a',
                  padding: '6px 8px', borderRadius: 4, fontSize: 11.5,
                }}>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 600, lineHeight: 1.3 }}>
                    {n.title}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 10, color: '#475569' }}>
                    {n.frame_type} · {n.articles?.length || 0} artículos ·
                    confianza {Math.round((n.confidence?.overall || 0) * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )
      })()}

      {/* Sprint G15-FIX C3 · Actores locales en tendencia.
          Filtra actorImpacts cuyo sample_reasons o actor menciona el
          nombre de la CCAA, o que también está en regional_actors del
          regional_signal (más fiable). Top 8 por menciones. */}
      {(() => {
        if (!actorImpacts || actorImpacts.length === 0) return null
        const territory = name.toLowerCase()
        const rs = (detail as any).regional_signal
        const regionalSet = new Set<string>(
          (rs?.regional_actors as string[] | undefined ?? []).map((s) => s.toLowerCase()),
        )
        const local = actorImpacts.filter((a) => {
          const txt = `${a.actor} ${(a.sample_reasons || []).join(' ')}`.toLowerCase()
          return txt.includes(territory) || regionalSet.has(a.actor.toLowerCase())
        }).slice(0, 8)
        if (local.length === 0) return null
        return (
          <Section label={`Actores en tendencia · ${local.length}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {local.map((a) => {
                const color = a.dominant_impact === 'beneficial' ? '#16a34a'
                  : a.dominant_impact === 'harmful' ? '#dc2626' : '#64748b'
                return (
                  <div key={a.actor} style={{
                    display: 'grid', gridTemplateColumns: '1fr 50px 80px',
                    gap: 6, alignItems: 'center', fontSize: 11,
                    padding: '3px 6px', background: '#f8fafc', borderRadius: 3,
                  }}>
                    <span style={{ color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.actor}
                    </span>
                    <span style={{ color: '#475569', fontFamily: 'ui-monospace, monospace', textAlign: 'right', fontSize: 10 }}>
                      {a.mentions} men.
                    </span>
                    <span style={{ color, fontWeight: 700, fontSize: 9, letterSpacing: 0.4, textTransform: 'uppercase', textAlign: 'right' }}>
                      ● {a.dominant_impact === 'beneficial' ? 'beneficioso' : a.dominant_impact === 'harmful' ? 'perjudicial' : a.dominant_impact === 'uncertain' ? 'incierto' : 'neutral'}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>
        )
      })()}

      {/* Categorías temáticas */}
      {detail.categories.length > 0 && (
        <Section label="Categorías temáticas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {detail.categories.slice(0, 6).map(c => (
              <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                <span style={{ flex: 1, color: '#1d1d1f' }}>{c.category}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1F4E8C' }}>{c.n}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: c.polarity > 0.10 ? '#16A34A' : c.polarity < -0.10 ? '#DC2626' : '#6e6e73', minWidth: 36, textAlign: 'right' }}>
                  {c.polarity > 0 ? '+' : ''}{c.polarity.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Figuras públicas en la región */}
      {detail.topFigures.length > 0 && (
        <Section label="Figuras activas en la región">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {detail.topFigures.slice(0, 6).map(f => (
              <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                <span style={{ flex: 1, color: '#1d1d1f' }}>{f.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1F4E8C' }}>{f.n}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: f.polarity > 0.10 ? '#16A34A' : f.polarity < -0.10 ? '#DC2626' : '#6e6e73', minWidth: 36, textAlign: 'right' }}>
                  {f.polarity > 0 ? '+' : ''}{f.polarity.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Empresas */}
      {detail.topCompanies.length > 0 && (
        <Section label="Empresas mencionadas">
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {detail.topCompanies.map(c => (
              <span key={c.name} style={{
                background: 'rgba(124,58,237,0.10)', color: '#7C3AED',
                padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              }}>
                {c.name} <span style={{ opacity: 0.65, fontWeight: 500 }}>{c.n}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Topics dominantes */}
      {detail.topTopics.length > 0 && (
        <Section label="Temas dominantes">
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {detail.topTopics.slice(0, 6).map(t => (
              <span key={t.topic} style={{
                background: 'rgba(31,78,140,0.10)', color: '#1F4E8C',
                padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              }}>
                {t.topic} <span style={{ opacity: 0.6 }}>{t.n}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Top noticias */}
      <Section label="Lo más destacado">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {detail.topNews.slice(0, 12).map((n, i) => {
            const sColor = n.sentiment > 0.10 ? '#16A34A' : n.sentiment < -0.10 ? '#DC2626' : '#6e6e73'
            return (
              <CollapsibleArticle key={i} title={n.title} href={n.link} medio={n.medio} accent={sColor} titleSize={12.5}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{ color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontSize: 9.5 }}>Sentimiento</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: sColor, background: `${sColor}1A`, padding: '1px 6px', borderRadius: 999 }}>
                    {n.sentiment > 0 ? '+' : ''}{n.sentiment.toFixed(2)}
                  </span>
                </div>
              </CollapsibleArticle>
            )
          })}
        </div>
      </Section>

      {/* Medios cubriendo */}
      <Section label="Medios cubriendo">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {detail.topMedios.map(m => (
            <span key={m.id} style={{
              background: '#fff', border: '1px solid #ECECEF', padding: '3px 9px',
              borderRadius: 999, fontSize: 11, color: '#3a3a3d',
            }}>
              {m.nombre} <span style={{ color: '#9ca3af' }}>{m.n}</span>
            </span>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ── Province Dossier (drill) ─────────────────────────────────────────────

function ProvinceDossier({ province, onClose }: { province: ProvinceStat; onClose: () => void }) {
  const [showAll, setShowAll] = useState(false)
  useEffect(() => { setShowAll(false) }, [province.name]) // reiniciar al cambiar de provincia
  const visibleNews = showAll ? province.topNews : province.topNews.slice(0, 7)
  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>
            Provincia · {province.ccaa}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.018em' }}>{province.name}</h3>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: '1px solid #ECECEF', borderRadius: 8,
          padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#6e6e73', fontFamily: 'inherit',
        }}>‹ volver CCAA</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 14 }}>
        <KPI label="Menciones" value={String(province.mentions)} accent="#7C3AED" />
        <KPI label="Polaridad" value={province.polarity.toFixed(2)}
             accent={province.polarity > 0.10 ? '#16A34A' : province.polarity < -0.10 ? '#DC2626' : '#6e6e73'} />
      </div>

      <Section label={`Noticias locales · ${province.topNews.length}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {province.topNews.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Sin noticias específicas detectadas en el feed.</div>
          ) : visibleNews.map((n, i) => {
            const sColor = n.sentiment > 0.10 ? '#16A34A' : n.sentiment < -0.10 ? '#DC2626' : '#6e6e73'
            const when = n.date
              ? new Date(n.date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
              : undefined
            return (
              <CollapsibleArticle key={i} title={n.title} href={n.link} medio={n.medio} when={when} accent={sColor} titleSize={13}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{ color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontSize: 9.5 }}>Sentimiento</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: sColor, background: `${sColor}1A`, padding: '1px 6px', borderRadius: 999 }}>
                    {n.sentiment > 0 ? '+' : ''}{n.sentiment.toFixed(2)}
                  </span>
                </div>
              </CollapsibleArticle>
            )
          })}
        </div>
        {!showAll && province.topNews.length > 7 && (
          <button onClick={() => setShowAll(true)} style={{
            marginTop: 8, width: '100%', padding: '8px 12px', background: '#FAFAFB',
            border: '1px solid #ECECEF', borderRadius: 8, fontSize: 12, fontWeight: 600,
            color: '#7C3AED', cursor: 'pointer', fontFamily: 'inherit',
          }}>Ver todas las {province.topNews.length} noticias →</button>
        )}
      </Section>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

function KPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: '#FAFAFB', border: '1px solid #ECECEF', borderLeft: `3px solid ${accent}`,
      borderRadius: 10, padding: '8px 10px',
    }}>
      <div style={{ fontSize: 9.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{value}</div>
    </div>
  )
}
