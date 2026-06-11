'use client'
/**
 * <PoliticaRegulacion /> · Sprint Energía · EN4
 *
 * Bloque REGULACIÓN VIVA de la pestaña Política energética. Consume la
 * orquestación /api/energia/politica (lib/energia/politica-data.ts):
 *
 *   GET /api/energia/politica
 *     → { ok, data: PoliticaEnergeticaResult, error, fetched_at, source_url }
 *   donde data.regulacion = { boe, eurlex, cnmc }, cada uno con su propio
 *   { ok, live, items, n, error, source_url }.
 *
 * Tres Panels:
 *   1) Normativa BOE de energía (7 días) · tabla título/fecha/depto, enlaces BOE.
 *   2) Legislación UE clave (EUR-Lex) · curado o live, con estado.
 *   3) CNMC · circulares y resoluciones.
 *
 * Cada bloque marca LIVE vs CURADO con un chip discreto (live=true → "en vivo";
 * live=false → "catálogo curado"). Degradación honesta (CLAUDE.md): si una
 * fuente cae, se muestra su mensaje de error sin inventar datos. Cero emojis ·
 * Unicode (◉ ◇ ↗). ACCENT verde energía '#16A34A'.
 */
import { useEffect, useState } from 'react'
import { Panel } from '@/components/SectorPanel'

const ACCENT = '#16A34A'

// ─── Tipos del envelope (espejo de lib/energia/politica-data.ts) ─────────────
interface BoeItem {
  id: string
  titulo: string
  url: string
  fecha: string
  seccion: string
  departamento: string
  materia: string
}
interface EurLexItem {
  titulo: string
  referencia: string
  fecha: string
  estado: string
  url: string
  materia?: string
}
interface CnmcItem {
  titulo: string
  referencia: string
  fecha: string
  tipo: string
  url: string
  materia?: string
}
interface Bloque<T> {
  ok: boolean
  live: boolean
  items: T[]
  n: number
  error?: string
  source_url?: string
}
interface PoliticaData {
  ok: boolean
  regulacion: { boe: Bloque<BoeItem>; eurlex: Bloque<EurLexItem>; cnmc: Bloque<CnmcItem> }
  fuentes_error: string[]
  fetched_at: string
}
interface PoliticaEnvelope {
  ok: boolean
  data: PoliticaData | null
  error: string | null
  fetched_at: string
  source_url: string
}

export function PoliticaRegulacion({ data }: { data?: PoliticaData | null }) {
  // Permite recibir la data por prop (orquestada en PoliticaView) o auto-fetch.
  const [self, setSelf] = useState<PoliticaData | null>(data ?? null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(data == null)

  useEffect(() => {
    if (data !== undefined) {
      setSelf(data ?? null)
      setLoading(false)
      return
    }
    let cancelled = false
    fetch('/api/energia/politica', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<PoliticaEnvelope>) : null))
      .then((j) => {
        if (cancelled) return
        setSelf(j?.data ?? null)
        setErr(j && !j.ok ? j.error ?? 'sin datos' : null)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setErr(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const boe = self?.regulacion.boe
  const eurlex = self?.regulacion.eurlex
  const cnmc = self?.regulacion.cnmc

  return (
    <>
      {/* ── 1) BOE energía (LIVE) ── */}
      <Panel
        title="Normativa BOE de energía · últimos 7 días"
        subtitle="Disposiciones del BOE filtradas a materia energética (electricidad, gas, renovables, hidrógeno…)"
        marginBottom
        sourceUrl={boe?.source_url || 'https://www.boe.es/datosabiertos/'}
        sourceLabel="BOE Datos Abiertos"
        sourceTooltip="Boletín Oficial del Estado · API de datos abiertos"
      >
        <LiveChip block={boe} loading={loading} />
        {loading ? (
          <Loading label="Cargando normativa del BOE…" />
        ) : !boe || boe.items.length === 0 ? (
          <Empty
            block={boe}
            fallbackErr={err}
            normalMsg="Sin normativa energética publicada en el BOE en los últimos 7 días. Es lo habitual en semanas sin actividad regulatoria; reintenta más tarde."
          />
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Disposición</Th>
                <Th w={92}>Fecha</Th>
                <Th w={180}>Departamento</Th>
                <Th w={130}>Materia</Th>
              </tr>
            </thead>
            <tbody>
              {boe.items.slice(0, 14).map((it) => (
                <tr key={it.id} style={rowStyle}>
                  <Td>
                    <a href={it.url} target="_blank" rel="noreferrer" style={linkStyle}>
                      {it.titulo} <span style={extLink}>↗</span>
                    </a>
                  </Td>
                  <Td mono>{it.fecha}</Td>
                  <Td dim>{it.departamento}</Td>
                  <Td>
                    <MateriaTag>{it.materia}</MateriaTag>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {/* ── 2) EUR-Lex (live o curado) ── */}
      <Panel
        title="Legislación UE clave · energía"
        subtitle="Reglamentos y directivas vigentes (mercado eléctrico, renovables, eficiencia, gas/H2, CBAM…)"
        marginBottom
        sourceUrl={eurlex?.source_url || 'https://eur-lex.europa.eu/'}
        sourceLabel="EUR-Lex"
        sourceTooltip="Portal oficial de la legislación de la Unión Europea"
      >
        <LiveChip block={eurlex} loading={loading} />
        {loading ? (
          <Loading label="Cargando legislación UE…" />
        ) : !eurlex || eurlex.items.length === 0 ? (
          <Empty block={eurlex} fallbackErr={err} normalMsg="Sin legislación UE disponible ahora." />
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Acto legislativo</Th>
                <Th w={210}>Referencia</Th>
                <Th w={92}>Fecha</Th>
                <Th w={150}>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {eurlex.items.slice(0, 12).map((it, i) => (
                <tr key={`${it.referencia}-${i}`} style={rowStyle}>
                  <Td>
                    <a href={it.url} target="_blank" rel="noreferrer" style={linkStyle}>
                      {it.titulo} <span style={extLink}>↗</span>
                    </a>
                  </Td>
                  <Td dim>{it.referencia || '—'}</Td>
                  <Td mono>{it.fecha || '—'}</Td>
                  <Td>
                    <EstadoTag>{it.estado}</EstadoTag>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {/* ── 3) CNMC (live o curado) ── */}
      <Panel
        title="CNMC · circulares y resoluciones"
        subtitle="Metodologías de peajes, acceso y conexión, retribución de redes y supervisión de mercado"
        marginBottom
        sourceUrl={cnmc?.source_url || 'https://www.cnmc.es/ambitos-de-actuacion/energia'}
        sourceLabel="CNMC"
        sourceTooltip="Comisión Nacional de los Mercados y la Competencia · energía"
      >
        <LiveChip block={cnmc} loading={loading} />
        {loading ? (
          <Loading label="Cargando documentos CNMC…" />
        ) : !cnmc || cnmc.items.length === 0 ? (
          <Empty block={cnmc} fallbackErr={err} normalMsg="Sin documentos CNMC disponibles ahora." />
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Documento</Th>
                <Th w={130}>Referencia</Th>
                <Th w={92}>Fecha</Th>
                <Th w={130}>Tipo</Th>
              </tr>
            </thead>
            <tbody>
              {cnmc.items.slice(0, 12).map((it, i) => (
                <tr key={`${it.referencia}-${i}`} style={rowStyle}>
                  <Td>
                    <a href={it.url} target="_blank" rel="noreferrer" style={linkStyle}>
                      {it.titulo} <span style={extLink}>↗</span>
                    </a>
                  </Td>
                  <Td dim>{it.referencia || '—'}</Td>
                  <Td mono>{it.fecha || '—'}</Td>
                  <Td>
                    <MateriaTag>{it.tipo}</MateriaTag>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  )
}

export default PoliticaRegulacion

// ─── Chip live vs curado ─────────────────────────────────────────────────────
function LiveChip({ block, loading }: { block?: { live: boolean; error?: string } | null; loading: boolean }) {
  if (loading || !block) return null
  const live = block.live
  return (
    <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span
        title={live ? 'Datos descargados en vivo en cada petición' : 'Catálogo curado y datado de fallback (fuente live no disponible)'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 10,
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: 999,
          letterSpacing: '0.02em',
          color: live ? ACCENT : '#92775a',
          background: live ? 'rgba(22,163,74,0.08)' : '#FBF6EC',
          border: `1px solid ${live ? 'rgba(22,163,74,0.25)' : '#EBDCC2'}`,
        }}
      >
        {live ? '◉ en vivo' : '◇ catálogo curado'}
      </span>
      {!live && block.error && (
        <span style={{ fontSize: 10, color: '#A0A0A5' }}>{block.error.split(';')[0]}</span>
      )}
    </div>
  )
}

// ─── Estados y primitivas ────────────────────────────────────────────────────
function Loading({ label }: { label: string }) {
  return <div style={{ fontSize: 12, color: '#86868b' }}>{label}</div>
}

function Empty({
  block,
  fallbackErr,
  normalMsg,
}: {
  block?: { ok: boolean; error?: string } | null
  fallbackErr: string | null
  normalMsg: string
}) {
  const e = block?.error ?? fallbackErr
  return (
    <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.55 }}>
      <p style={{ margin: 0 }}>{normalMsg}</p>
      {e && <p style={{ margin: '6px 0 0', fontSize: 10.5, color: '#A0A0A5' }}>{e}</p>}
    </div>
  )
}

function MateriaTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 9.5,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 999,
        background: 'rgba(22,163,74,0.07)',
        color: ACCENT,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function EstadoTag({ children }: { children: React.ReactNode }) {
  const txt = String(children)
  const enVigor = /vigor/i.test(txt)
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 9.5,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 999,
        background: enVigor ? 'rgba(22,163,74,0.07)' : '#F1F5F9',
        color: enVigor ? ACCENT : '#6e6e73',
      }}
    >
      {txt}
    </span>
  )
}

// ─── Tabla ───────────────────────────────────────────────────────────────────
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 }
const rowStyle: React.CSSProperties = { borderTop: '1px solid #F1F1F3' }
const linkStyle: React.CSSProperties = { color: '#1d1d1f', textDecoration: 'none', fontWeight: 600, lineHeight: 1.35 }
const extLink: React.CSSProperties = { fontSize: 9, color: ACCENT, opacity: 0.8 }

function Th({ children, w }: { children: React.ReactNode; w?: number }) {
  return (
    <th
      style={{
        textAlign: 'left',
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#86868b',
        padding: '0 10px 8px 0',
        width: w,
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, mono, dim }: { children: React.ReactNode; mono?: boolean; dim?: boolean }) {
  return (
    <td
      style={{
        padding: '9px 10px 9px 0',
        verticalAlign: 'top',
        color: dim ? '#6e6e73' : '#3a3a3d',
        fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: mono ? 11 : 12,
        lineHeight: 1.4,
      }}
    >
      {children}
    </td>
  )
}
