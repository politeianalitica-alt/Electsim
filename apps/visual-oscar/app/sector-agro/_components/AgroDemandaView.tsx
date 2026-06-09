'use client'
/**
 * <AgroDemandaView /> · Agro v4 · Demanda y Mercados
 *
 * Responde a "muestra la demanda de las zonas tanto nacionales de otros países
 * como regionales de España":
 *   · INTERNACIONAL → qué países compran cada producto agro español
 *     (UN Comtrade, exportaciones por país-destino, HS4). Mapa mundial + ranking.
 *   · REGIONAL ES   → dónde se produce la oferta exportable, por CCAA
 *     (Eurostat apro_cpshr, coropleta).
 *
 * Cero datos inventados: cada bloque degrada por separado y etiqueta la forma
 * exacta del producto medido (demanda_label = código HS).
 */
import { useEffect, useMemo, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { PRODUCTOS_AGRO } from '@/lib/agro/catalogos'
import { NUTS2_TO_INE } from '@/lib/agro/catalogos/ccaa-map'
import { CULTIVOS_EUROSTAT } from '@/lib/agro/sources/eurostat-agro'
import { Panel, SectorHero, Skeleton, Vacio, RankChart } from '@/lib/sectores/charts'
import ChoroplethCCAA, { type ChoroplethValue } from '@/components/maps/ChoroplethCCAA'

const ACCENT = '#16A34A'

const PRODUCTOS_DEMANDA = PRODUCTOS_AGRO.filter((p) => p.hs4)

interface Destino {
  partner: string
  partner_iso: number | null
  partner_alpha: string | null
  value_usd: number
  value_fmt: string
  net_weight_kg: number | null
  share_pct: number | null
}
interface DemandaEnvelope {
  ok: boolean
  data: {
    producto: { id: string; nombre: string; categoria: string; hs4: string; hs_chapter: string; demanda_label: string; rol_espana: string; color: string }
    year: number
    total_export_usd: number
    total_export_fmt: string
    n_destinos: number
    destinos: Destino[]
  } | null
  fuente: string
  fuente_url: string
  fuentes_error?: string[]
}

// ── Mapa mundial de destinos (d3-geo · escala verde por valor exportado) ──
function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
// Alias Comtrade → nombre común (para casar con world-countries.geojson).
const COMTRADE_ALIAS: Record<string, string> = {
  'rep. of korea': 'south korea',
  'china, hong kong sar': 'hong kong',
  'china, macao sar': 'macao',
  'czechia': 'czech republic',
  'russian federation': 'russia',
  'united states of america': 'united states',
  'viet nam': 'vietnam',
  'bolivia (plurinational state of)': 'bolivia',
  'united rep. of tanzania': 'tanzania',
  'iran (islamic republic of)': 'iran',
  'syrian arab republic': 'syria',
  "côte d'ivoire": 'ivory coast',
  'türkiye': 'turkey',
  'state of palestine': 'palestine',
}
function aliasName(s: string): string {
  const n = normName(s)
  return COMTRADE_ALIAS[n] ?? n
}

interface GeoFC {
  type: 'FeatureCollection'
  features: Array<{ type: 'Feature'; properties: { name?: string } | null; geometry: unknown }>
}

const MAP_W = 900
const MAP_H = 440

function DemandWorldMap({ destinos }: { destinos: Destino[] }) {
  const [geo, setGeo] = useState<GeoFC | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number; name: string; val: string; share: string } | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/geodata/world-countries.geojson')
      .then((r) => r.json())
      .then((j) => alive && setGeo(j))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const byName = useMemo(() => {
    const m = new Map<string, Destino>()
    destinos.forEach((d) => m.set(aliasName(d.partner), d))
    return m
  }, [destinos])
  const maxVal = useMemo(() => Math.max(1, ...destinos.map((d) => d.value_usd)), [destinos])

  const pathFn = useMemo(() => {
    const proj = geoNaturalEarth1().scale(150).translate([MAP_W / 2, MAP_H / 2])
    return geoPath(proj)
  }, [])

  function matchDest(featName: string): Destino | null {
    const n = normName(featName)
    if (byName.has(n)) return byName.get(n)!
    // substring tolerante (United States vs United States of America, etc.)
    for (const [k, v] of byName) {
      if (k.length >= 4 && (k.includes(n) || n.includes(k))) return v
    }
    return null
  }

  if (!geo) return <Skeleton h={MAP_H} />

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: '100%', display: 'block', background: 'linear-gradient(180deg,#f0f9ff,#e0f2fe)' }} onMouseLeave={() => setHover(null)}>
        {geo.features.map((f, i) => {
          const d = pathFn(f as never)
          if (!d) return null
          const name = String(f.properties?.name ?? '')
          const dest = matchDest(name)
          const t = dest ? Math.max(0.12, Math.sqrt(dest.value_usd / maxVal)) : 0
          const fill = dest ? `rgba(22,101,52,${t})` : '#e2e8f0'
          return (
            <path
              key={i}
              d={d}
              fill={fill}
              stroke="#fff"
              strokeWidth={0.4}
              style={{ cursor: dest ? 'pointer' : 'default' }}
              onMouseEnter={(e) => {
                if (!dest) return
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, name, val: `$${dest.value_fmt}`, share: dest.share_pct != null ? `${dest.share_pct}%` : '—' })
              }}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setHover((h) => (h ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top } : h))
              }}
            />
          )
        })}
      </svg>
      {hover && (
        <div style={{ position: 'absolute', left: Math.min(hover.x + 12, MAP_W - 160), top: hover.y - 8, pointerEvents: 'none', background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 18px rgba(0,0,0,0.12)', zIndex: 30 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{hover.name}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: ACCENT, marginTop: 2 }}>{hover.val}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>{hover.share} de la exportación</div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderTop: `3px solid ${color}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color, marginTop: 2, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#86868b', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function AgroDemandaView() {
  const [slug, setSlug] = useState(PRODUCTOS_DEMANDA.find((p) => p.id === 'porcino')?.id || PRODUCTOS_DEMANDA[0].id)
  const [env, setEnv] = useState<DemandaEnvelope | null>(null)
  const [loading, setLoading] = useState(true)

  // Regional ES (oferta exportable por CCAA)
  const [crop, setCrop] = useState('C1110')
  const [reg, setReg] = useState<{ values: Array<{ nuts2: string; nombre: string; value: number | null; share_pct: number | null }>; cultivo_nombre: string; cultivo_color: string; year: string } | null>(null)
  const [regLoading, setRegLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/agro/demanda/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: DemandaEnvelope | null) => alive && setEnv(j))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [slug])

  useEffect(() => {
    let alive = true
    setRegLoading(true)
    fetch(`/api/agro/regional?crop=${crop}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ok: boolean; data: typeof reg } | null) => alive && setReg(j?.ok ? j.data : null))
      .catch(() => {})
      .finally(() => alive && setRegLoading(false))
    return () => {
      alive = false
    }
  }, [crop])

  const data = env?.data
  const destinos = data?.destinos ?? []
  const top5Share = useMemo(() => {
    const s = destinos.slice(0, 5).reduce((a, d) => a + (d.share_pct ?? 0), 0)
    return Number(s.toFixed(0))
  }, [destinos])

  const rankRows = destinos.map((d) => ({ geo: d.partner, label: d.partner, value: d.value_usd }))

  const choro: ChoroplethValue[] = useMemo(
    () =>
      (reg?.values ?? [])
        .filter((v) => NUTS2_TO_INE[v.nuts2])
        .map((v) => ({ code: NUTS2_TO_INE[v.nuts2], label: v.nombre, value: v.value, sub: v.share_pct != null ? `${v.share_pct}% nacional` : undefined })),
    [reg]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="AGRO · DEMANDA Y MERCADOS · COMTRADE + EUROSTAT"
        titulo="Quién compra lo que produce España y dónde se produce"
        descripcion="Demanda internacional por país-destino (UN Comtrade, exportaciones oficiales) y oferta regional por Comunidad Autónoma (Eurostat). Selecciona un producto para ver el mapa de países compradores y el ranking; abajo, el origen regional de la oferta exportable. Cada producto indica la forma exacta medida (código HS)."
        colorFrom={ACCENT}
        colorTo="#166534"
      />

      {/* Selector producto */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: '10px 12px' }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginRight: 4, alignSelf: 'center' }}>Producto</span>
        {PRODUCTOS_DEMANDA.map((p) => {
          const active = p.id === slug
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSlug(p.id)}
              style={{
                cursor: 'pointer',
                border: `1px solid ${active ? p.color : '#ECECEF'}`,
                background: active ? `${p.color}18` : '#FAFAFA',
                color: '#1d1d1f',
                borderRadius: 999,
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                fontFamily: 'inherit',
              }}
            >
              {p.nombre}
            </button>
          )
        })}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <KpiCard label="Exportación total" value={data ? `$${data.total_export_fmt}` : '—'} color={ACCENT} sub={data ? `año ${data.year}` : undefined} />
        <KpiCard label="Países compradores" value={data ? String(data.n_destinos) : '—'} color="#1d1d1f" />
        <KpiCard label="Top destino" value={destinos[0]?.partner ?? '—'} color="#1d1d1f" sub={destinos[0]?.share_pct != null ? `${destinos[0].share_pct}% del total` : undefined} />
        <KpiCard label="Concentración top-5" value={data ? `${top5Share}%` : '—'} color={top5Share >= 60 ? '#DC2626' : '#16A34A'} sub="cuota de los 5 primeros" />
      </div>

      {/* Mapa mundial + ranking */}
      <Panel
        titulo={`Demanda internacional · ${data?.producto?.demanda_label || 'producto'}`}
        fuente={env?.fuente || 'UN Comtrade'}
        url={env?.fuente_url || 'https://comtradeplus.un.org'}
      >
        {loading ? (
          <Skeleton h={440} />
        ) : !env?.ok || destinos.length === 0 ? (
          <Vacio msg={`UN Comtrade sin datos · ${env?.fuentes_error?.join(' · ') || 'prueba otro producto o año'}`} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(280px, 1fr)', gap: 18, alignItems: 'start' }}>
            <DemandWorldMap destinos={destinos} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Top países compradores (USD)</div>
              <RankChart rows={rankRows.slice(0, 15)} highlight="" unit="USD" baseColor={data?.producto?.color || ACCENT} format={(v) => `$${v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : (v / 1e3).toFixed(0) + 'K'}`} />
            </div>
          </div>
        )}
        <p style={{ fontSize: 10, color: '#86868b', marginTop: 10, lineHeight: 1.5 }}>
          Datos oficiales declarados a Naciones Unidas. El color del mapa es proporcional al valor exportado por España a
          cada país. Algunos países pueden no colorearse si su nombre no casa con el mapa base; consúltalos en el ranking.
        </p>
      </Panel>

      {/* Regional ES · oferta exportable por CCAA */}
      <Panel
        titulo="Oferta regional · dónde se produce en España"
        fuente={reg ? `Eurostat · apro_cpshr · ${reg.year}` : 'Eurostat · apro_cpshr'}
        url="https://ec.europa.eu/eurostat/databrowser/view/apro_cpshr/default/table"
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {CULTIVOS_EUROSTAT.map((c) => {
            const active = c.code === crop
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => setCrop(c.code)}
                style={{ cursor: 'pointer', border: `1px solid ${active ? c.color : '#ECECEF'}`, background: active ? `${c.color}18` : '#fff', color: '#1d1d1f', borderRadius: 999, padding: '5px 12px', fontSize: 11, fontWeight: active ? 700 : 500, fontFamily: 'inherit' }}
              >
                {c.nombre}
              </button>
            )
          })}
        </div>
        {regLoading ? (
          <Skeleton h={400} />
        ) : !reg || choro.length === 0 ? (
          <Vacio msg="Eurostat sin datos regionales para este cultivo · prueba otro" />
        ) : (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <ChoroplethCCAA
              values={choro}
              unidad="t"
              colorLow="#EAF7EE"
              colorHigh={reg.cultivo_color || ACCENT}
              formatValue={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)} Mt` : v >= 1e3 ? `${(v / 1e3).toFixed(0)} kt` : `${v.toFixed(0)} t`)}
              height={400}
            />
          </div>
        )}
        <p style={{ fontSize: 10, color: '#86868b', marginTop: 10, lineHeight: 1.5 }}>
          La oferta regional se mide como producción del cultivo por Comunidad Autónoma (Eurostat NUTS2). Para el desglose
          completo por cultivo, ver la pestaña <strong>Producción</strong>.
        </p>
      </Panel>
    </div>
  )
}
