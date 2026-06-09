'use client'
/**
 * <AgroProduccionView /> · Agro v4 · Producción regional (coropleta CCAA)
 *
 * Producción de cultivos por Comunidad Autónoma desde Eurostat apro_cpshr
 * (NUTS2). Selector de cultivo + coropleta CCAA + ranking. Responde a la
 * petición de mostrar la oferta regional de España por zonas. Debajo, áreas
 * estratégicas y fuentes oficiales (preservadas de v3).
 *
 * Cero datos inventados: si Eurostat no devuelve un cultivo, se degrada con
 * mensaje honesto.
 */
import { useEffect, useMemo, useState } from 'react'
import { AREAS_AGRO } from '@/lib/agro/catalogos'
import { NUTS2_TO_INE } from '@/lib/agro/catalogos/ccaa-map'
import { Panel, SectorHero, Skeleton, Vacio, RankChart } from '@/lib/sectores/charts'
import ChoroplethCCAA, { type ChoroplethValue } from '@/components/maps/ChoroplethCCAA'

const ACCENT = '#16A34A'

interface CultivoMeta {
  code: string
  nombre: string
  color: string
}
interface RegionalValue {
  nuts2: string
  nombre: string
  value: number | null
  time: string
  share_pct: number | null
}
interface RegionalEnvelope {
  ok: boolean
  data: {
    crop: string
    cultivo_nombre: string
    cultivo_color: string
    year: string
    unidad: string
    total_es: number
    values: RegionalValue[]
    cultivos: CultivoMeta[]
  } | null
  fuente: string
  fuente_url: string
  fuentes_error?: string[]
}

function fmtT(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} Mt`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} kt`
  return `${v.toFixed(0)} t`
}

export function AgroProduccionView() {
  const relevantes = AREAS_AGRO.filter((a) => ['ganaderia_extensiva', 'frutas_hortalizas', 'vino_do'].includes(a.id))
  const [crop, setCrop] = useState('C1110')
  const [env, setEnv] = useState<RegionalEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  const [cultivos, setCultivos] = useState<CultivoMeta[]>([])

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/agro/regional?crop=${crop}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: RegionalEnvelope | null) => {
        if (!alive) return
        setEnv(j)
        if (j?.data?.cultivos?.length) setCultivos(j.data.cultivos)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [crop])

  const values = env?.data?.values ?? []
  const choroValues: ChoroplethValue[] = useMemo(
    () =>
      values
        .filter((v) => NUTS2_TO_INE[v.nuts2])
        .map((v) => ({
          code: NUTS2_TO_INE[v.nuts2],
          label: v.nombre,
          value: v.value,
          sub: v.share_pct != null ? `${v.share_pct}% del total nacional` : undefined,
        })),
    [values]
  )
  const rankRows = useMemo(
    () => values.map((v) => ({ geo: v.nuts2, label: v.nombre, value: v.value })),
    [values]
  )

  const cultivoColor = env?.data?.cultivo_color || ACCENT
  const listaCultivos = cultivos.length ? cultivos : [{ code: crop, nombre: 'Cultivo', color: ACCENT }]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="AGRO · PRODUCCIÓN REGIONAL · EUROSTAT NUTS2"
        titulo="Qué produce cada Comunidad Autónoma"
        descripcion="Producción de los principales cultivos por Comunidad Autónoma (Eurostat apro_cpshr, NUTS2). Selecciona un cultivo para ver el mapa de intensidad productiva y el ranking de CCAA. Complementa la exportación por país-destino de la pestaña Demanda y Mercados."
        colorFrom={ACCENT}
        colorTo="#14532D"
      />

      <Panel
        titulo="Producción por Comunidad Autónoma"
        fuente={env?.fuente || 'Eurostat · apro_cpshr'}
        url={env?.fuente_url || 'https://ec.europa.eu/eurostat/databrowser/view/apro_cpshr'}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {listaCultivos.map((c) => {
            const active = c.code === crop
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => setCrop(c.code)}
                style={{
                  cursor: 'pointer',
                  border: `1px solid ${active ? c.color : '#ECECEF'}`,
                  background: active ? `${c.color}18` : '#fff',
                  color: active ? '#1d1d1f' : '#3a3a3d',
                  borderRadius: 999,
                  padding: '5px 13px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                }}
              >
                {c.nombre}
              </button>
            )
          })}
        </div>

        {loading ? (
          <Skeleton h={420} />
        ) : !env?.ok || choroValues.length === 0 ? (
          <Vacio msg={`Eurostat sin datos para este cultivo · ${env?.fuentes_error?.join(' · ') || 'prueba otro cultivo'}`} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(300px, 1.1fr)', gap: 18, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 11, color: '#86868b', marginBottom: 6 }}>
                {env.data?.cultivo_nombre} · {env.data?.year} · total ES {env.data ? fmtT(env.data.total_es) : '—'}
              </div>
              <ChoroplethCCAA
                values={choroValues}
                unidad="t"
                colorLow="#EAF7EE"
                colorHigh={cultivoColor}
                formatValue={fmtT}
                height={400}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Ranking de CCAA productoras</div>
              <RankChart rows={rankRows} highlight="" unit="t" format={fmtT} baseColor={cultivoColor} />
            </div>
          </div>
        )}
      </Panel>

      <Panel titulo="Áreas estratégicas de producción" fuente="Catálogo Politeia" url="https://www.mapa.gob.es/es/estadistica/">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {relevantes.map((a) => (
            <li key={a.id} style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderLeft: `3px solid ${a.color}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{a.titulo}</div>
              <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 5, lineHeight: 1.45 }}>{a.descripcion}</div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel titulo="Fuentes oficiales de producción y exportación" fuente="MAPA · Eurostat · Comext" url="https://www.mapa.gob.es/">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { t: 'MAPA · Anuario de Estadística Agraria', d: 'Producción, superficies cultivadas, censos ganaderos. Series anuales nacionales con desglose por provincia y CCAA.', url: 'https://www.mapa.gob.es/es/estadistica/temas/publicaciones/anuario-de-estadistica/' },
            { t: 'Eurostat · apro_cpshr (producción regional)', d: 'Producción de cultivos en humedad estándar por región NUTS2. Es la fuente de la coropleta de esta página.', url: 'https://ec.europa.eu/eurostat/databrowser/view/apro_cpshr/default/table' },
            { t: 'Comext · estadísticas de comercio exterior UE', d: 'Exportaciones e importaciones agroalimentarias por código HS, país de destino, valor y volumen. Series mensuales.', url: 'https://ec.europa.eu/eurostat/web/international-trade-in-goods/data/database' },
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
