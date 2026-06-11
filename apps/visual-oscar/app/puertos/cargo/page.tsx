'use client'
/**
 * /puertos/cargo · Capa de CARGO / MERCANCÍAS — ¿qué se transporta por mar?
 *
 * Cruza dos planos servidos por GET /api/maritimo/cargo?reporter=ESP:
 *   1. Comercio declarado real (UN Comtrade · capítulos HS2) agregado a grandes
 *      categorías de carga marítima (contenedor, granel seco, granel líquido,
 *      GNL/GLP, químicos, vehículos/ro-ro, reefer…) con barras de valor.
 *   2. Catálogo curado de tipos de carga marítima (descripción, buque típico,
 *      unidad, ejemplos) que SIEMPRE está disponible (es seed, no red).
 *
 * Selector de país reporter (Combobox, default ESP, extensible). Degradación
 * honesta: si Comtrade falla, las barras y la tabla quedan vacías con aviso,
 * pero el catálogo de tipos de carga sigue mostrándose. Cero datos inventados.
 *
 * Marca portuaria teal ACCENT '#0e7490'. Cero emojis: solo glifos Unicode.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import MaritimoShell from '../_components/MaritimoShell'
import { Panel } from '@/components/SectorPanel'
import { Combobox } from '@/components/ports/Combobox'
import { isAuthenticated } from '@/lib/auth'
import type {
  CargoCategoryAggregate,
  CargoCatalogEntry,
  CargoProduct,
  CargoQuality,
} from '@/lib/maritimo/cargo'

const ACCENT = '#0e7490'

// ── Reporters soportados por el endpoint · alpha-3 → nombre legible. ──────────
// El back-end (lib/maritimo/cargo.ts · REPORTER_ISO) admite estos; ESP es el
// default. La lista es deliberadamente extensible: añadir aquí + en el back.
const REPORTERS: { code: string; label: string }[] = [
  { code: 'ESP', label: 'España (ESP)' },
  { code: 'DEU', label: 'Alemania (DEU)' },
  { code: 'FRA', label: 'Francia (FRA)' },
  { code: 'ITA', label: 'Italia (ITA)' },
  { code: 'PRT', label: 'Portugal (PRT)' },
  { code: 'NLD', label: 'Países Bajos (NLD)' },
  { code: 'GBR', label: 'Reino Unido (GBR)' },
  { code: 'USA', label: 'Estados Unidos (USA)' },
  { code: 'CHN', label: 'China (CHN)' },
]

const REPORTER_LABEL: Record<string, string> = Object.fromEntries(
  REPORTERS.map((r) => [r.code, r.label]),
)

interface CargoApiData {
  reporter: string
  reporter_iso: string
  year: number
  por_categoria: CargoCategoryAggregate[]
  top_productos: CargoProduct[]
  catalogo: CargoCatalogEntry[]
  data_quality: CargoQuality
}

interface CargoEnvelope {
  ok: boolean
  data: CargoApiData
  error: string | null
  fetched_at: string
  source_url: string
}

/** Formatea un valor USD compacto sin inventar (— si no hay dato). */
function fmtUsd(v: number | undefined | null): string {
  if (v == null || isNaN(v) || v <= 0) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} B$`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} M$`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} K$`
  return `${v.toFixed(0)} $`
}

export default function CargoPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [reporter, setReporter] = useState('ESP')
  const [env, setEnv] = useState<CargoEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setFetchError(null)
    fetch(`/api/maritimo/cargo?reporter=${encodeURIComponent(reporter)}`)
      .then((r) => r.json())
      .then((j: CargoEnvelope) => {
        if (!alive) return
        setEnv(j)
      })
      .catch((e) => {
        if (!alive) return
        setFetchError(String(e?.message ?? e).slice(0, 160))
        setEnv(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [reporter])

  const data = env?.data
  const ok = !!env?.ok
  const quality = data?.data_quality

  // El catálogo siempre debería venir (seed). Si por lo que sea no, vacío.
  const catalogo = data?.catalogo ?? []
  const categorias = data?.por_categoria ?? []
  const productos = data?.top_productos ?? []

  const maxCatValue = useMemo(
    () => categorias.reduce((m, c) => Math.max(m, c.total_usd || 0), 0),
    [categorias],
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <MaritimoShell subtitle="Qué se transporta por mar · capítulos HS2 declarados mapeados a tipos de carga marítima (UN Comtrade), más el catálogo curado de modalidades de carga." />

      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '20px 28px 48px' }}>
        {/* ───── Cabecera de sección ───── */}
        <header style={{ marginBottom: 16 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              color: ACCENT,
              fontWeight: 700,
              margin: 0,
            }}
          >
            CARGO · MERCANCÍAS POR MAR
          </p>
          <h1
            style={{
              margin: '4px 0 0',
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: '#1d1d1f',
            }}
          >
            ⛴ Qué se transporta por mar
          </h1>
        </header>

        {/* ───── Selector de país reporter + estado de la fuente ───── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#6e6e73',
                marginBottom: 5,
              }}
            >
              PAÍS DECLARANTE
            </label>
            <Combobox<{ code: string; label: string }>
              value={reporter}
              onChange={(v) => setReporter(v || 'ESP')}
              options={REPORTERS}
              getValue={(o) => o.code}
              getLabel={(o) => o.label}
              placeholder="Buscar país…"
              width={240}
            />
          </div>

          <div style={{ fontSize: 11.5, color: '#6e6e73', lineHeight: 1.5 }}>
            <SourcePill loading={loading} ok={ok} quality={quality} year={data?.year} />
            {quality?.note && (
              <div style={{ marginTop: 4, maxWidth: 560 }}>{quality.note}</div>
            )}
            {fetchError && (
              <div style={{ marginTop: 4, color: '#b91c1c' }}>
                Error de red al consultar el endpoint: {fetchError}. El catálogo
                de tipos de carga sigue disponible abajo.
              </div>
            )}
          </div>
        </div>

        {/* ───── Panel 1 · Desglose por categoría marítima (barras de valor) ───── */}
        <div style={{ marginBottom: 14 }}>
          <Panel
            title="Desglose por categoría de carga marítima"
            subtitle={
              ok
                ? `Comercio declarado ${data?.year ?? ''} (export + import) por modalidad`
                : 'Sin datos de comercio · ver catálogo de tipos abajo'
            }
            sourceUrl={env?.source_url || 'https://comtradeplus.un.org/'}
            sourceLabel="UN Comtrade"
            sourceTooltip="Abrir UN Comtrade (comercio internacional declarado)"
          >
            {loading ? (
              <Placeholder text="Cargando comercio declarado…" />
            ) : categorias.length === 0 ? (
              <Placeholder
                text={
                  quality?.source_type === 'rate_limited'
                    ? 'UN Comtrade limitó la petición (tier anónimo). El desglose por valor no está disponible ahora, pero el catálogo de tipos de carga sí (abajo).'
                    : 'No hay desglose de comercio declarado disponible para este país/año. El catálogo curado de tipos de carga sigue disponible más abajo.'
                }
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {categorias.map((c) => {
                  const pct = maxCatValue > 0 ? (c.total_usd / maxCatValue) * 100 : 0
                  return (
                    <div key={c.key}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          gap: 10,
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: '#1d1d1f',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{ color: ACCENT, fontSize: 13 }}
                          >
                            {c.glyph}
                          </span>
                          {c.label}
                          <span style={{ fontWeight: 400, color: '#86868b', fontSize: 10.5 }}>
                            {c.label_en} · {c.n_chapters} cap. HS2
                          </span>
                        </span>
                        <span style={{ fontSize: 12, color: '#6e6e73', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: '#1d1d1f' }}>{c.total_fmt}</strong>
                          {' · '}
                          {c.share_pct}%
                        </span>
                      </div>
                      <div
                        style={{
                          position: 'relative',
                          height: 9,
                          borderRadius: 5,
                          background: '#eef2f4',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: `${Math.max(pct, 1.5)}%`,
                            background: `linear-gradient(90deg, ${ACCENT}, #22a3bf)`,
                            borderRadius: 5,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 14,
                          marginTop: 3,
                          fontSize: 10.5,
                          color: '#86868b',
                        }}
                      >
                        <span>⇡ Export {fmtUsd(c.export_usd)}</span>
                        <span>⇣ Import {fmtUsd(c.import_usd)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* ───── Panel 2 · Top productos comerciados (tabla HS + valor + %) ───── */}
        <div style={{ marginBottom: 14 }}>
          <Panel
            title="Top productos comerciados por mar"
            subtitle={
              productos.length > 0
                ? `${productos.length} capítulos HS2 con mayor valor (export e import)`
                : 'Sin productos declarados disponibles'
            }
            sourceUrl={env?.source_url || 'https://comtradeplus.un.org/'}
            sourceLabel="UN Comtrade"
            sourceTooltip="Abrir UN Comtrade (comercio internacional declarado)"
          >
            {loading ? (
              <Placeholder text="Cargando productos…" />
            ) : productos.length === 0 ? (
              <Placeholder text="No hay productos declarados disponibles para este país/año." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12,
                    fontFamily: 'var(--font-text)',
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#86868b' }}>
                      <Th>HS2</Th>
                      <Th>Producto</Th>
                      <Th>Categoría marítima</Th>
                      <Th align="center">Flujo</Th>
                      <Th align="right">Valor</Th>
                      <Th align="right">% del flujo</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((p, i) => (
                      <tr
                        key={`${p.hs2}-${p.flow}-${i}`}
                        style={{ borderTop: '1px solid #f0f0f2' }}
                      >
                        <Td>
                          <code
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: ACCENT,
                              fontFamily: 'var(--font-mono, monospace)',
                            }}
                          >
                            {p.hs2}
                          </code>
                        </Td>
                        <Td>
                          <span style={{ color: '#1d1d1f' }}>{p.hs2_desc || '—'}</span>
                        </Td>
                        <Td>
                          <span style={{ color: '#6e6e73' }}>{p.category_label}</span>
                        </Td>
                        <Td align="center">
                          <FlowBadge flow={p.flow} />
                        </Td>
                        <Td align="right">
                          <strong style={{ color: '#1d1d1f' }}>{p.value_fmt}</strong>
                        </Td>
                        <Td align="right">
                          <span style={{ color: '#6e6e73' }}>{p.share_pct}%</span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* ───── Panel 3 · Catálogo de tipos de carga (SIEMPRE disponible) ───── */}
        <Panel
          title="Catálogo de tipos de carga marítima"
          subtitle="Conocimiento de dominio · qué se mueve y cómo (independiente de la red)"
        >
          {catalogo.length === 0 ? (
            <Placeholder text="Catálogo no disponible en esta respuesta." />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
                gap: 12,
              }}
            >
              {catalogo.map((c) => (
                <article
                  key={c.key}
                  style={{
                    border: '1px solid #ECECEF',
                    borderRadius: 11,
                    padding: '13px 15px',
                    background: '#fbfdfe',
                  }}
                >
                  <header
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <span aria-hidden="true" style={{ fontSize: 15, color: ACCENT }}>
                      {c.glyph}
                    </span>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: '#1d1d1f',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {c.label}
                    </h3>
                    <span style={{ fontSize: 10.5, color: '#86868b' }}>{c.label_en}</span>
                  </header>
                  <p
                    style={{
                      margin: '0 0 9px',
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      color: '#515157',
                    }}
                  >
                    {c.descripcion}
                  </p>
                  <dl style={{ margin: 0, fontSize: 11, color: '#6e6e73' }}>
                    <CatalogRow label="Buque" value={c.buque_tipo} />
                    <CatalogRow label="Unidad" value={c.unidad} />
                  </dl>
                  {c.ejemplos.length > 0 && (
                    <div
                      style={{
                        marginTop: 9,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 5,
                      }}
                    >
                      {c.ejemplos.map((e) => (
                        <span
                          key={e}
                          style={{
                            fontSize: 10,
                            color: ACCENT,
                            background: '#e9f5f8',
                            border: '1px solid #cfe9ef',
                            borderRadius: 999,
                            padding: '2px 8px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </Panel>

        {/* ───── Volver ───── */}
        <div style={{ marginTop: 18 }}>
          <Link
            href="/puertos"
            style={{
              color: ACCENT,
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            ← Volver a Visión global
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Subcomponentes de presentación
// ─────────────────────────────────────────────────────────────────

function SourcePill({
  loading,
  ok,
  quality,
  year,
}: {
  loading: boolean
  ok: boolean
  quality?: CargoQuality
  year?: number
}) {
  let glyph = '◦'
  let text = 'Consultando fuente…'
  let color = '#6e6e73'
  let bg = '#f0f0f1'
  if (!loading) {
    if (ok) {
      glyph = '●'
      text = `${quality?.source_name ?? 'UN Comtrade'} · ${year ?? ''} en vivo`
      color = '#0f7a4a'
      bg = '#e8f6ee'
    } else if (quality?.source_type === 'rate_limited') {
      glyph = '◐'
      text = `${quality?.source_name ?? 'UN Comtrade'} · rate-limited`
      color = '#b45309'
      bg = '#fdf2e3'
    } else {
      glyph = '◌'
      text = `${quality?.source_name ?? 'Comtrade'} · sin datos · solo catálogo`
      color = '#9a3412'
      bg = '#fdeee6'
    }
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        color,
        background: bg,
        borderRadius: 999,
        padding: '3px 10px',
      }}
    >
      <span aria-hidden="true">{glyph}</span>
      {text}
    </span>
  )
}

function FlowBadge({ flow }: { flow: 'export' | 'import' }) {
  const isExport = flow === 'export'
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.03em',
        color: isExport ? '#0f7a4a' : '#1d4e8c',
        background: isExport ? '#e8f6ee' : '#eef3fb',
        border: `1px solid ${isExport ? '#c7e8d4' : '#d4e2f5'}`,
        borderRadius: 999,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {isExport ? '⇡ EXPORT' : '⇣ IMPORT'}
    </span>
  )
}

function CatalogRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
      <dt style={{ fontWeight: 600, color: '#86868b', minWidth: 48 }}>{label}</dt>
      <dd style={{ margin: 0, color: '#515157' }}>{value}</dd>
    </div>
  )
}

function Placeholder({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '22px 16px',
        textAlign: 'center',
        fontSize: 12,
        color: '#86868b',
        background: '#fafafa',
        border: '1px dashed #e2e2e6',
        borderRadius: 10,
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  )
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <th
      style={{
        padding: '7px 10px',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        textAlign: align,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <td style={{ padding: '8px 10px', textAlign: align, verticalAlign: 'middle' }}>
      {children}
    </td>
  )
}
