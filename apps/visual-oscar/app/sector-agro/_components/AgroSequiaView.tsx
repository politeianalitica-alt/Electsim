'use client'
/**
 * <AgroSequiaView /> · Agro v4 · Sequía y Agua (mapa vivo)
 *
 * Capa de mapa que MEJOR encaja con la pestaña: precipitación. Superpone el
 * radar de precipitación en vivo (RainViewer, sin key) sobre un mapa base y
 * marca las zonas agrícolas de referencia con el pronóstico de lluvia a 7 días
 * (Open-Meteo, sin key). Debajo: pronóstico por zona + ranking de zonas más
 * secas (déficit hídrico de 30 días) + fuentes oficiales para profundizar.
 *
 * Cero datos inventados: cada faceta degrada por separado.
 */
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { AREAS_AGRO } from '@/lib/agro/catalogos'
import { Panel, SectorHero, Skeleton, Vacio } from '@/lib/sectores/charts'
import type { RasterMarker } from '@/components/maps/SectorRasterMap'

const SectorRasterMap = dynamic(() => import('@/components/maps/SectorRasterMap'), {
  ssr: false,
  loading: () => <Skeleton h={460} />,
})

const ACCENT = '#B45309'

interface PrecipForecastPoint {
  fecha: string
  precip_mm: number | null
  prob_max: number | null
}
interface PrecipPunto {
  id: string
  nombre: string
  ccaa: string
  lat: number
  lon: number
  contexto: string
  forecast: PrecipForecastPoint[]
  precip_7d_mm: number | null
  precip_30d_mm: number | null
}
interface PrecipEnvelope {
  ok: boolean
  data: {
    puntos: PrecipPunto[]
    n_total: number
    n_con_dato: number
    ventana_archivo: { inicio: string; fin: string }
    mas_secos: Array<{ id: string; nombre: string; ccaa: string; precip_30d_mm: number | null }>
  } | null
  fuente: string
  fuente_url: string
  fuentes_error: string[]
}

interface RainViewerMeta {
  host: string | null
  path: string | null
  time: number | null
}

export function AgroSequiaView() {
  const sequia = AREAS_AGRO.find((a) => a.id === 'sequia_agua')
  const [env, setEnv] = useState<PrecipEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  const [rv, setRv] = useState<RainViewerMeta | null>(null)
  const [showRadar, setShowRadar] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/agro/precipitacion', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: PrecipEnvelope | null) => alive && setEnv(j))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    fetch('/api/osiris/rainviewer', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: RainViewerMeta | null) => alive && setRv(j))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const puntos = env?.data?.puntos ?? []

  const markers: RasterMarker[] = useMemo(() => {
    const max7 = Math.max(1, ...puntos.map((p) => p.precip_7d_mm ?? 0))
    return puntos
      .filter((p) => p.lat && p.lon)
      .map((p) => ({
        id: p.id,
        nombre: `${p.nombre} · ${p.ccaa}`,
        lat: p.lat,
        lon: p.lon,
        value: p.precip_7d_mm,
        valueLabel: p.precip_7d_mm != null ? `Lluvia 7d: ${p.precip_7d_mm} mm` : 'sin pronóstico',
        sub: (p.precip_30d_mm != null ? `30d acumulado: ${p.precip_30d_mm} mm · ` : '') + p.contexto,
        intensity: Math.min(1, (p.precip_7d_mm ?? 0) / max7),
      }))
  }, [puntos])

  const rasterTiles = useMemo(() => {
    if (!showRadar || !rv?.host || !rv?.path) return null
    return [`${rv.host}${rv.path}/256/{z}/{x}/{y}/4/1_1.png`]
  }, [rv, showRadar])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="AGRO · SEQUÍA · AGUA · PRECIPITACIÓN EN VIVO"
        titulo="Sequía, agua y pronóstico de precipitación"
        descripcion="Radar de precipitación en vivo (RainViewer) sobre las zonas agrícolas de referencia, con el pronóstico de lluvia a 7 días y el déficit hídrico de los últimos 30 días (Open-Meteo). Debajo, el seguimiento por zona y las fuentes oficiales (MITECO, ENESA, AEMET) para profundizar. Sin métricas inventadas."
        colorFrom={ACCENT}
        colorTo="#78350F"
      />

      <Panel
        titulo="Mapa de precipitación · radar en vivo + pronóstico 7 días por zona agrícola"
        fuente={`RainViewer + Open-Meteo${rv?.time ? ' · radar actualizado' : ''}`}
        url="https://www.rainviewer.com"
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setShowRadar((v) => !v)}
            style={{
              cursor: 'pointer',
              border: `1px solid ${showRadar ? ACCENT : '#ECECEF'}`,
              background: showRadar ? '#FEF3C7' : '#fff',
              color: showRadar ? '#78350F' : '#3a3a3d',
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'inherit',
            }}
          >
            {showRadar ? '◐ Radar de lluvia: ON' : '○ Radar de lluvia: OFF'}
          </button>
        </div>
        <SectorRasterMap
          markers={markers}
          rasterTiles={rasterTiles}
          rasterOpacity={0.55}
          rasterAttribution="RainViewer"
          markerColor="#0EA5E9"
          height={460}
          center={[-3.7, 40.0]}
          zoom={5}
        />
        <p style={{ fontSize: 10.5, color: '#86868b', marginTop: 8, lineHeight: 1.5 }}>
          Las burbujas marcan zonas agrícolas clave; su tamaño es proporcional a la lluvia prevista en 7 días. El radar
          (capa azul translúcida) muestra la precipitación detectada en tiempo casi real. Click en una burbuja para ver el
          detalle de la zona.
        </p>
      </Panel>

      <Panel titulo="Pronóstico y déficit por zona agrícola" fuente={env?.fuente || 'Open-Meteo'} url={env?.fuente_url || 'https://open-meteo.com'}>
        {loading ? (
          <Skeleton h={200} />
        ) : puntos.length === 0 ? (
          <Vacio msg={`Open-Meteo sin respuesta · ${env?.fuentes_error?.join(' · ') || 'sin detalle'}`} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {puntos.map((p) => (
              <ZonaCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </Panel>

      {env?.data?.mas_secos && env.data.mas_secos.length > 0 && (
        <Panel
          titulo="Zonas con mayor déficit hídrico · 30 días"
          fuente={`Open-Meteo archive ERA5 · ${env.data.ventana_archivo.inicio} → ${env.data.ventana_archivo.fin}`}
          url="https://open-meteo.com"
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {env.data.mas_secos.map((z, i) => (
              <li
                key={z.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#FEF3C7', borderRadius: 8, border: '1px solid #FDE68A' }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: '#78350F' }}>
                  {i + 1}. {z.nombre} <span style={{ color: '#92400E', fontWeight: 500 }}>· {z.ccaa}</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>{z.precip_30d_mm != null ? `${z.precip_30d_mm} mm` : '—'}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {sequia && (
        <Panel titulo={sequia.titulo} fuente="Catálogo áreas · resumen sectorial" url="https://www.miteco.gob.es/">
          <p style={{ fontSize: 12.5, color: '#3a3a3d', margin: 0, lineHeight: 1.55 }}>{sequia.descripcion}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {sequia.keywords.map((k) => (
              <span key={k} style={{ fontSize: 9, fontWeight: 700, background: `${ACCENT}20`, color: ACCENT, padding: '2px 7px', borderRadius: 999 }}>
                {k}
              </span>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        titulo="Fuentes oficiales para el seguimiento de la sequía"
        fuente="MITECO + ENESA + AEMET"
        url="https://www.miteco.gob.es/es/agua/temas/sistema-espaniol-gestion-agua/"
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            {
              t: 'MITECO · Boletín hidrológico semanal',
              d: 'Estado de las reservas de las cuencas hidrográficas españolas y porcentaje de llenado por confederación. Publicación semanal en abierto.',
              url: 'https://www.miteco.gob.es/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico/',
            },
            {
              t: 'Confederación Hidrográfica del Guadalquivir',
              d: 'Confederación crítica para la sequía en Andalucía. Datos de embalses y restricciones de regadío.',
              url: 'https://www.chguadalquivir.es/saih/',
            },
            {
              t: 'Confederación Hidrográfica del Júcar',
              d: 'Estado de embalses y declaraciones de emergencia en el sureste peninsular.',
              url: 'https://aps.chj.es/idejucar/apps/portal/',
            },
            {
              t: 'ENESA · estadísticas del sistema de seguros agrarios',
              d: 'Pólizas, capital asegurado e indemnizaciones por sequía, helada, pedrisco y otros riesgos. Series anuales por comunidad autónoma y por línea de seguro.',
              url: 'https://www.enesa.gob.es/web/en/area-estadistica/',
            },
            {
              t: 'AEMET · resumen climático y mapas de sequía (SPI/SPEI)',
              d: 'Resumen meteorológico mensual y trimestral con anomalías de precipitación y temperatura. Mapas de indicadores de sequía (SPI, SPEI).',
              url: 'https://www.aemet.es/es/serviciosclimaticos/vigilancia_clima/vigilancia_sequia',
            },
            {
              t: 'BOE · Real Decreto-ley 4/2023 (sequía)',
              d: 'Marco normativo del paquete de respuesta a la sequía estructural: ayudas, flexibilidad PAC, infraestructuras de desalación, transferencias hidrológicas.',
              url: 'https://www.boe.es/eli/es/rdl/2023/05/11/4/con',
            },
          ].map((f, i) => (
            <li key={i} style={{ padding: '10px 12px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #ECECEF' }}>
              <a href={f.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: '#1d1d1f' }}>{f.t}</div>
                <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 3, lineHeight: 1.45 }}>{f.d}</div>
                <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, marginTop: 5 }}>{f.url}</div>
              </a>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function ZonaCard({ p }: { p: PrecipPunto }) {
  const fc = p.forecast.filter((f) => f.precip_mm != null)
  const maxMm = Math.max(1, ...fc.map((f) => f.precip_mm ?? 0))
  const seco30 = p.precip_30d_mm != null && p.precip_30d_mm < 15
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderLeft: `3px solid ${seco30 ? '#DC2626' : '#0EA5E9'}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>{p.nombre}</span>
        <span style={{ fontSize: 9.5, color: '#86868b' }}>{p.ccaa}</span>
      </div>
      <div style={{ fontSize: 10, color: '#86868b', marginTop: 1, lineHeight: 1.35 }}>{p.contexto}</div>
      {/* mini-barras forecast 7d */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginTop: 8 }}>
        {p.forecast.map((f, i) => {
          const h = f.precip_mm != null ? Math.max(2, (f.precip_mm / maxMm) * 34) : 2
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={`${f.fecha}: ${f.precip_mm ?? '—'} mm`}>
              <div style={{ width: '100%', height: h, background: '#0EA5E9', borderRadius: 2, opacity: 0.85 }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5 }}>
        <span style={{ color: '#3a3a3d' }}>
          7d: <strong style={{ color: '#0EA5E9' }}>{p.precip_7d_mm != null ? `${p.precip_7d_mm} mm` : '—'}</strong>
        </span>
        <span style={{ color: '#3a3a3d' }}>
          30d: <strong style={{ color: seco30 ? '#DC2626' : '#3a3a3d' }}>{p.precip_30d_mm != null ? `${p.precip_30d_mm} mm` : '—'}</strong>
        </span>
      </div>
    </div>
  )
}
