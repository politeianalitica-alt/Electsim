'use client'

/**
 * SentimentMapInteractive — mapa de España con sentimiento por CCAA.
 *
 * Click en CCAA → carga drill detail desde /api/medios/ccaa?ccaa=X con:
 *   - Top noticias (sentiment, link al medio)
 *   - Top medios cubriendo
 *   - Topics dominantes
 *   - Polaridad y distribución
 *
 * Mejora sobre RegionalNewsMaps:
 *   - Bicolor scale (rojo↔verde según polaridad, no solo volumen)
 *   - Click abre panel con noticias REALES
 *   - Vista provincial cuando se selecciona (placeholder con explicación)
 */

import { useState, useEffect, useMemo } from 'react'
import { geoConicConformal, geoMercator, geoPath } from 'd3-geo'
import type { ExtendedFeatureCollection, GeoPermissibleObjects } from 'd3-geo'
import { useApi } from '@/lib/useApi'
import type { CCAARegionStat } from '@/lib/news-aggregator'

interface CCAADetail {
  ccaa: string
  total: number
  polarity: number
  topTopics: { topic: string; n: number }[]
  topNews: { title: string; medio: string; link: string; sentiment: number; date: string | null }[]
  topMedios: { id: string; nombre: string; n: number }[]
  updatedAt?: string
}

interface GeoFeature { type: 'Feature'; properties: Record<string, unknown> | null; geometry: unknown }
interface GeoFC { type: 'FeatureCollection'; features: GeoFeature[] }

const API_TO_GEO: Record<string, string> = {
  'Madrid': 'Madrid', 'Cataluña': 'Cataluña', 'Andalucía': 'Andalucia',
  'Galicia': 'Galicia', 'Castilla y León': 'Castilla-Leon', 'Castilla-La Mancha': 'Castilla-La Mancha',
  'Valencia': 'Valencia', 'C. Valenciana': 'Valencia', 'País Vasco': 'Pais Vasco',
  'Aragón': 'Aragon', 'Asturias': 'Asturias', 'Cantabria': 'Cantabria', 'La Rioja': 'La Rioja',
  'Navarra': 'Navarra', 'Extremadura': 'Extremadura', 'Murcia': 'Murcia',
  'Baleares': 'Baleares', 'Canarias': 'Canarias',
}
const GEO_TO_API: Record<string, string> = Object.fromEntries(Object.entries(API_TO_GEO).map(([a, g]) => [g, a]))

// Color scale bicolor según polaridad (-1..+1)
function polarityColor(pol: number, volume: number, maxVol: number): string {
  if (volume === 0) return '#e2e8f0'
  const intensity = Math.min(1, 0.3 + 0.7 * (volume / maxVol))
  if (pol > 0.10) {
    const a = Math.round(intensity * 200)
    return `rgba(34, 197, 94, ${(a/255).toFixed(2)})`     // verde
  }
  if (pol < -0.10) {
    const a = Math.round(intensity * 200)
    return `rgba(220, 38, 38, ${(a/255).toFixed(2)})`     // rojo
  }
  const a = Math.round(intensity * 180)
  return `rgba(100, 116, 139, ${(a/255).toFixed(2)})`     // gris
}

export default function SentimentMapInteractive({ ccaaData }: { ccaaData?: Record<string, CCAARegionStat> }) {
  const [geoData, setGeoData] = useState<GeoFC | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => {
    fetch('/geodata/spain-ccaa.geojson')
      .then(r => r.json())
      .then(setGeoData)
      .catch(() => setGeoData(null))
  }, [])

  // Drill detail cuando se selecciona una CCAA
  const { data: detail, loading: detailLoading } = useApi<CCAADetail>(
    selected ? `/api/medios/ccaa?ccaa=${encodeURIComponent(selected)}` : '/api/medios/ccaa?ccaa=Madrid',
    { refreshInterval: 0 },
  )

  const spain = ccaaData ?? {}
  const maxVol = Math.max(1, ...Object.values(spain).map(v => v.n))
  const totalArticles = Object.values(spain).reduce((s, v) => s + v.n, 0)

  const MAP_W = 660, MAP_H = 420, INS_W = 130, INS_H = 78

  const peninsulaFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => !String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null
  const canariasFC: GeoFC | null = geoData
    ? { type: 'FeatureCollection', features: geoData.features.filter(f => String(f.properties?.name ?? '').toLowerCase().includes('canar')) }
    : null

  const mainProj = peninsulaFC
    ? geoConicConformal().parallels([36, 44]).rotate([4, 0]).fitSize([MAP_W, MAP_H], peninsulaFC as unknown as ExtendedFeatureCollection)
    : null
  const canProj = canariasFC && canariasFC.features.length > 0
    ? geoMercator().fitSize([INS_W, INS_H], canariasFC as unknown as ExtendedFeatureCollection)
    : null
  const mainPath = mainProj ? geoPath(mainProj) : null
  const canPath  = canProj  ? geoPath(canProj)  : null

  const sortedRegions = useMemo(() => {
    return Object.entries(spain)
      .map(([name, info]) => ({
        name,
        n: info.n,
        sent: info.sent_score,
        polarity: info.pos + info.neg > 0 ? (info.pos - info.neg) / (info.pos + info.neg + info.neu) : 0,
        topics: info.top_topics,
      }))
      .sort((a, b) => b.n - a.n)
  }, [spain])

  return (
    <div>
      {/* Banner ─────────────────────────────────────────────── */}
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Geografía del sentimiento <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#6e6e73' }}>en vivo</em>
        </h2>
        <p style={{ fontSize: 13, color: '#515154', margin: 0 }}>
          {totalArticles} noticias regionales · color por polaridad media (verde = positiva, rojo = negativa, gris = neutra) · intensidad por volumen
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        {/* Mapa */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid #ECECEF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Mapa de España · click para detalle
            </span>
            {hover && spain[GEO_TO_API[hover] || hover] && (() => {
              const api = GEO_TO_API[hover] || hover
              const r = spain[api]
              return (
                <span style={{ fontSize: 11.5, color: '#1F4E8C', fontWeight: 600 }}>
                  {api} · {r.n} noticias · polaridad {r.sent_score > 0 ? '+' : ''}{r.sent_score.toFixed(2)}
                </span>
              )
            })()}
          </div>

          {!geoData ? (
            <div style={{ height: 420, background: '#FAFAFB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
              Cargando mapa…
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: '100%', height: 'auto' }} role="img">
                {peninsulaFC && mainPath && peninsulaFC.features.map((f, i) => {
                  const d = mainPath(f as unknown as GeoPermissibleObjects)
                  if (!d) return null
                  const geoName = String(f.properties?.name ?? '')
                  const apiName = GEO_TO_API[geoName] ?? geoName
                  const region = spain[apiName]
                  const n = region?.n ?? 0
                  const isSel = selected === apiName
                  const isHover = hover === geoName
                  const fill = polarityColor(region?.sent_score ?? 0, n, maxVol)
                  return (
                    <path
                      key={i} d={d} fill={fill}
                      stroke={isSel ? '#1d1d1f' : isHover ? '#1F4E8C' : '#cbd5e1'}
                      strokeWidth={isSel ? 2.2 : isHover ? 1.6 : 0.7}
                      style={{ cursor: n > 0 ? 'pointer' : 'default', transition: 'stroke 120ms' }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${apiName}: ${n} artículos`}
                      onMouseEnter={() => setHover(geoName)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => n > 0 && setSelected(apiName)}
                      onKeyDown={e => e.key === 'Enter' && n > 0 && setSelected(apiName)}
                    >
                      <title>{`${apiName} · ${n} arts · sentimiento ${region?.sent_score?.toFixed(2) ?? '—'}`}</title>
                    </path>
                  )
                })}
              </svg>

              {/* Canarias inset */}
              {canariasFC && canPath && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0,
                  background: 'rgba(255,255,255,0.94)', borderRadius: 6, border: '1px solid #cbd5e1', padding: 3,
                }}>
                  <div style={{ fontSize: 8, color: '#6e6e73', textAlign: 'center', fontWeight: 600, marginBottom: 1 }}>Canarias</div>
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
                              stroke={selected === apiName ? '#1d1d1f' : '#cbd5e1'}
                              strokeWidth={selected === apiName ? 1.5 : 0.6}
                              style={{ cursor: n > 0 ? 'pointer' : 'default' }}
                              onClick={() => n > 0 && setSelected(apiName)}>
                          <title>{`${apiName} · ${n} arts`}</title>
                        </path>
                      )
                    })}
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* Leyenda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid #ECECEF', fontSize: 11, color: '#6e6e73' }}>
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
            <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
              Intensidad ≈ volumen de noticias
            </span>
          </div>
        </div>

        {/* Panel detalle */}
        <aside style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid #ECECEF', minHeight: 480 }}>
          {!selected ? (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                Top CCAA por volumen
              </h3>
              <p style={{ fontSize: 11.5, color: '#6e6e73', margin: '0 0 12px' }}>
                Click en una región del mapa o aquí abajo para ver la realidad local.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sortedRegions.slice(0, 12).map(r => (
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
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>
                    Realidad local · {detail?.total ?? 0} noticias
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.018em' }}>{selected}</h3>
                </div>
                <button onClick={() => setSelected(null)} style={{
                  background: 'transparent', border: '1px solid #ECECEF', borderRadius: 8,
                  padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#6e6e73', fontFamily: 'inherit',
                }}>‹ volver</button>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                <KPI label="Noticias" value={String(detail?.total ?? 0)} accent="#1F4E8C" />
                <KPI label="Polaridad"
                     value={(detail?.polarity ?? 0).toFixed(2)}
                     accent={(detail?.polarity ?? 0) > 0.10 ? '#16A34A' : (detail?.polarity ?? 0) < -0.10 ? '#DC2626' : '#6e6e73'} />
                <KPI label="Medios activos" value={String(detail?.topMedios.length ?? 0)} accent="#7C3AED" />
              </div>

              {/* Topics dominantes */}
              {detail && detail.topTopics.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>
                    Temas dominantes
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {detail.topTopics.slice(0, 6).map(t => (
                      <span key={t.topic} style={{
                        background: 'rgba(31,78,140,0.10)', color: '#1F4E8C',
                        padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                      }}>{t.topic} <span style={{ opacity: 0.6 }}>{t.n}</span></span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top noticias REALES */}
              {detailLoading ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Cargando…</div>
              ) : (
                <div>
                  <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>
                    Lo más destacado
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(detail?.topNews ?? []).slice(0, 6).map((n, i) => {
                      const sentColor = n.sentiment > 0.10 ? '#16A34A' : n.sentiment < -0.10 ? '#DC2626' : '#6e6e73'
                      return (
                        <a key={i} href={n.link} target="_blank" rel="noopener" style={{
                          background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 8,
                          padding: '8px 10px', textDecoration: 'none', color: 'inherit', display: 'block',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 10.5, color: '#1F4E8C', fontWeight: 700 }}>{n.medio}</span>
                            <span style={{
                              fontSize: 9.5, fontWeight: 700, color: sentColor,
                              background: `${sentColor}1A`, padding: '1px 6px', borderRadius: 999,
                            }}>
                              {n.sentiment > 0 ? '+' : ''}{n.sentiment.toFixed(2)}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.35, fontWeight: 500 }}>
                            {n.title}
                          </div>
                          {n.date && (
                            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                              {new Date(n.date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </a>
                      )
                    })}
                    {(!detail?.topNews || detail.topNews.length === 0) && (
                      <div style={{ padding: 18, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                        Sin noticias recientes de esta CCAA en el feed RSS.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Top medios */}
              {detail && detail.topMedios.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #ECECEF' }}>
                  <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>
                    Medios cubriendo
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {detail.topMedios.map(m => (
                      <span key={m.id} style={{
                        background: '#fff', border: '1px solid #ECECEF',
                        padding: '3px 9px', borderRadius: 999, fontSize: 11, color: '#3a3a3d',
                      }}>
                        {m.nombre} <span style={{ color: '#9ca3af' }}>{m.n}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(31,78,140,0.06)', borderRadius: 8, fontSize: 11.5, color: '#1F4E8C', lineHeight: 1.45 }}>
                <strong>Drill provincial · próximamente</strong><br/>
                <span style={{ color: '#3a3a3d' }}>
                  Cuando hagamos click sobre una provincia concreta dentro de {selected}, abriremos un mapa
                  provincial con noticias locales (ayuntamiento, diputación, comarca). Requiere
                  geojson provincial + clasificador local del feed regional.
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>
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
