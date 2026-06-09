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
import { AREAS_AGRO, EMPRESAS_PRODUCTORAS } from '@/lib/agro/catalogos'
import { NUTS2_TO_INE } from '@/lib/agro/catalogos/ccaa-map'
import { Panel, SectorHero, Skeleton, Vacio, RankChart } from '@/lib/sectores/charts'
import ChoroplethCCAA, { type ChoroplethValue } from '@/components/maps/ChoroplethCCAA'

const ACCENT = '#16A34A'

interface CosechaCultivo {
  code: string
  nombre: string
  color: string
  anio: string | null
  produccion_t: number | null
  produccion_yoy_pct: number | null
  rendimiento_t_ha: number | null
  rendimiento_yoy_pct: number | null
  estado: string
  estado_label: string
}
interface CosechaEnvelope {
  ok: boolean
  data: { cultivos: CosechaCultivo[]; n_con_dato: number } | null
  fuente: string
  fuente_url: string
  fuentes_error?: string[]
}
const ESTADO_COLOR: Record<string, string> = {
  record: '#15803D',
  buena: '#16A34A',
  normal: '#86868b',
  floja: '#F59E0B',
  mala: '#DC2626',
  sin_dato: '#9CA3AF',
}

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
  const [cosecha, setCosecha] = useState<CosechaEnvelope | null>(null)
  const [loadingCos, setLoadingCos] = useState(true)
  const [empFiltro, setEmpFiltro] = useState<string>('todas')

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

  useEffect(() => {
    let alive = true
    fetch('/api/agro/cosecha', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: CosechaEnvelope | null) => alive && setCosecha(j))
      .catch(() => {})
      .finally(() => alive && setLoadingCos(false))
    return () => {
      alive = false
    }
  }, [])

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

      {/* Cómo ha ido la cosecha (derivado de producción nacional YoY) */}
      <Panel
        titulo="¿Cómo ha ido la cosecha? · producción y rendimiento nacional"
        fuente={cosecha?.fuente || 'Eurostat · apro_cpshr'}
        url={cosecha?.fuente_url || 'https://ec.europa.eu/eurostat/databrowser/view/apro_cpshr'}
      >
        {loadingCos ? (
          <Skeleton h={180} />
        ) : !cosecha?.ok || !cosecha.data ? (
          <Vacio msg={`Eurostat sin datos de cosecha · ${cosecha?.fuentes_error?.join(' · ') || 'sin detalle'}`} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
            {cosecha.data.cultivos.filter((c) => c.produccion_t != null).map((c) => {
              const col = ESTADO_COLOR[c.estado] || '#86868b'
              const up = (c.produccion_yoy_pct ?? 0) >= 0
              return (
                <div key={c.code} style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderLeft: `3px solid ${col}`, borderRadius: 10, padding: '11px 13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>{c.nombre}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: col, background: `${col}1A`, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      {c.estado_label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#1d1d1f' }}>
                      {c.produccion_t != null ? (c.produccion_t >= 1e6 ? `${(c.produccion_t / 1e6).toFixed(2)} Mt` : `${(c.produccion_t / 1e3).toFixed(0)} kt`) : '—'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: up ? '#16A34A' : '#DC2626' }}>
                      {c.produccion_yoy_pct != null ? `${up ? '↑' : '↓'} ${up ? '+' : ''}${c.produccion_yoy_pct}%` : '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#86868b', marginTop: 4 }}>
                    Producción {c.anio ?? ''} · rendimiento {c.rendimiento_t_ha != null ? `${c.rendimiento_t_ha} t/ha` : '—'}
                    {c.rendimiento_yoy_pct != null ? ` (${c.rendimiento_yoy_pct > 0 ? '+' : ''}${c.rendimiento_yoy_pct}%)` : ''}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p style={{ fontSize: 10, color: '#86868b', marginTop: 8, lineHeight: 1.5 }}>
          El estado de la cosecha se calcula a partir de la variación interanual de la producción nacional (Eurostat), no de
          una valoración cualitativa. Una caída fuerte señala mala campaña (sequía, calor); una subida, recuperación o récord.
        </p>
      </Panel>

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

      {/* Quién cosecha · empresas y cooperativas */}
      <Panel titulo="¿Quién cosecha? · empresas y cooperativas productoras" fuente="Catálogo Politeia · entidades reales" url="https://www.agro-alimentarias.coop">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'cooperativa', label: 'Cooperativas' },
            { id: 'sa', label: 'Empresas (S.A.)' },
            { id: 'federacion', label: 'Federaciones' },
          ].map((f) => {
            const active = empFiltro === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setEmpFiltro(f.id)}
                style={{ cursor: 'pointer', border: `1px solid ${active ? ACCENT : '#ECECEF'}`, background: active ? '#F0FDF4' : '#fff', color: active ? '#166534' : '#3a3a3d', borderRadius: 999, padding: '5px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}
              >
                {f.label}
              </button>
            )
          })}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10.5, color: '#86868b', alignSelf: 'center' }}>{EMPRESAS_PRODUCTORAS.length} entidades</span>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {EMPRESAS_PRODUCTORAS.filter((e) => empFiltro === 'todas' || e.tipo === empFiltro).map((e) => (
            <li key={e.id} style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderLeft: `3px solid ${e.tipo === 'cooperativa' ? '#16A34A' : e.tipo === 'federacion' ? '#7C3AED' : '#1F4E8C'}`, borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>{e.nombre}</span>
                <span style={{ fontSize: 8.5, fontWeight: 800, color: e.tipo === 'cooperativa' ? '#16A34A' : e.tipo === 'federacion' ? '#7C3AED' : '#1F4E8C', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  {e.tipo === 'sa' ? 'S.A.' : e.tipo}
                </span>
              </div>
              <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 1 }}>{e.ccaa}</div>
              <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 5, lineHeight: 1.45 }}>{e.rol}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {e.productos.slice(0, 4).map((p) => (
                  <span key={p} style={{ fontSize: 8.5, fontWeight: 700, background: '#ECECEF', color: '#3a3a3d', padding: '2px 7px', borderRadius: 999 }}>{p}</span>
                ))}
              </div>
              {e.web && (
                <a href={e.web} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: ACCENT, fontWeight: 700, marginTop: 6, display: 'inline-block', textDecoration: 'none' }}>
                  {e.web.replace('https://www.', '').replace('https://', '')} ›
                </a>
              )}
            </li>
          ))}
        </ul>
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
