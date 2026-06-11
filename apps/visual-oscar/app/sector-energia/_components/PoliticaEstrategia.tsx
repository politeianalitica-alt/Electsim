'use client'
/**
 * <PoliticaEstrategia /> · Sprint Energía · EN4
 *
 * Bloque ESTRATEGIA de la pestaña Política energética. Catálogo CURADO + DATADO
 * (lib/energia/politica-data.ts): PNIEC 2030, programas/PERTE, subastas REER.
 * Recibe la data por prop (orquestada en PoliticaView) o la auto-fetchea de
 * /api/energia/politica.
 *
 * Panels:
 *   1) PNIEC 2030 · objetivos · barras por indicador con valor + horizonte.
 *   2) Programas y PERTE · tarjetas (REPowerEU, PERTE ERHA, Hoja Ruta H2,
 *      Almacenamiento…) con dotación/estado/horizonte.
 *   3) Subastas renovables (REER) · tabla histórico + previstas.
 *
 * Degradación honesta (CLAUDE.md): el catálogo curado es determinista (siempre
 * presente); si por algún motivo no llega, se muestra un estado vacío claro.
 * Cero emojis · Unicode (◆ ◦ ⟶ ↗). ACCENT verde energía '#16A34A'.
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'

const ACCENT = '#16A34A'

// ─── Tipos del envelope (espejo de lib/energia/politica-data.ts) ─────────────
interface ObjetivoPniec {
  indicador: string
  valor_objetivo: string
  horizonte: string
  fuente: string
  fecha_ref: string
  url: string
}
interface ProgramaEstrategico {
  nombre: string
  organismo: string
  ambito: 'ES' | 'UE'
  objetivo: string
  dotacion_eur?: number
  horizonte: string
  estado: string
  fecha_ref: string
  url: string
}
interface SubastaRenovable {
  nombre: string
  fecha: string
  estado: 'Celebrada' | 'Prevista' | 'Convocada' | 'Cancelada'
  potencia_mw?: number
  tecnologia: string
  precio_medio_eur_mwh?: number
  fuente: string
  url: string
}
interface EstrategiaData {
  pniec: ObjetivoPniec[]
  programas: ProgramaEstrategico[]
  subastas: SubastaRenovable[]
}
interface PoliticaData {
  ok: boolean
  estrategia: EstrategiaData
  fetched_at: string
}
interface PoliticaEnvelope {
  ok: boolean
  data: PoliticaData | null
  error: string | null
}

export function PoliticaEstrategia({ data }: { data?: PoliticaData | null }) {
  const [self, setSelf] = useState<PoliticaData | null>(data ?? null)
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
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const est = self?.estrategia
  const pniec = est?.pniec ?? []
  const programas = est?.programas ?? []
  const subastas = est?.subastas ?? []

  // Para dibujar barras comparables, extraemos el primer número del valor objetivo.
  const pniecRows = useMemo(
    () =>
      pniec.map((p) => ({
        ...p,
        num: parseFirstNumber(p.valor_objetivo),
        esGW: /\bGW\b/i.test(p.valor_objetivo),
        esPct: /%/.test(p.valor_objetivo),
      })),
    [pniec],
  )
  const maxPct = Math.max(1, ...pniecRows.filter((r) => r.esPct).map((r) => r.num ?? 0))
  const maxGw = Math.max(1, ...pniecRows.filter((r) => r.esGW).map((r) => r.num ?? 0))

  return (
    <>
      {/* ── 1) PNIEC 2030 · objetivos ── */}
      <Panel
        title="PNIEC 2023-2030 · objetivos clave"
        subtitle="Metas cuantitativas de la versión actualizada del Plan Nacional Integrado de Energía y Clima (aprobada 24-09-2024)"
        marginBottom
        sourceUrl="https://www.miteco.gob.es/es/prensa/pniec.html"
        sourceLabel="MITECO · PNIEC"
        sourceTooltip="Plan Nacional Integrado de Energía y Clima 2023-2030"
      >
        {loading ? (
          <Loading label="Cargando objetivos del PNIEC…" />
        ) : pniecRows.length === 0 ? (
          <Empty msg="Catálogo de objetivos PNIEC no disponible ahora." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pniecRows.map((r, i) => {
              const ref = r.esPct ? maxPct : r.esGW ? maxGw : null
              const pct = r.num != null && ref ? Math.max(4, Math.min(100, (r.num / ref) * 100)) : null
              return (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>{r.indicador}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: ACCENT, fontFamily: 'var(--font-display)' }}>
                      {r.valor_objetivo}
                      <span style={{ fontSize: 9.5, color: '#A0A0A5', fontWeight: 600, marginLeft: 6 }}>{r.horizonte}</span>
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#F1F5F9', borderRadius: 6, overflow: 'hidden' }}>
                    {pct != null ? (
                      <div style={{ width: `${pct}%`, height: '100%', background: ACCENT, borderRadius: 6, transition: 'width 300ms ease' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(90deg,#E2E8F0 0 6px,transparent 6px 12px)' }} />
                    )}
                  </div>
                </a>
              )
            })}
            <p style={{ margin: '4px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
              Barras normalizadas dentro de cada unidad (% sobre el mayor porcentaje; GW sobre la mayor
              potencia). Las metas sin componente numérico simple se muestran rayadas. Fuente: MITECO.
            </p>
          </div>
        )}
      </Panel>

      {/* ── 2) Programas y PERTE ── */}
      <Panel
        title="Programas y PERTE de energía"
        subtitle="REPowerEU · PERTE ERHA · Descarbonización industrial · Hoja de Ruta del Hidrógeno · Estrategia de Almacenamiento"
        marginBottom
        sourceUrl="https://planderecuperacion.gob.es/como-acceder-a-los-fondos/pertes"
        sourceLabel="Plan de Recuperación"
        sourceTooltip="PERTEs y programas del Plan de Recuperación, Transformación y Resiliencia"
      >
        {loading ? (
          <Loading label="Cargando programas estratégicos…" />
        ) : programas.length === 0 ? (
          <Empty msg="Catálogo de programas no disponible ahora." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {programas.map((p, i) => (
              <ProgramaCard key={i} p={p} />
            ))}
          </div>
        )}
      </Panel>

      {/* ── 3) Subastas REER ── */}
      <Panel
        title="Subastas renovables · REER"
        subtitle="Régimen Económico de Energías Renovables · histórico de subastas celebradas y próximas convocatorias"
        marginBottom
        sourceUrl="https://www.miteco.gob.es/es/energia/renovables/subastas.html"
        sourceLabel="MITECO · subastas"
        sourceTooltip="Régimen Económico de Energías Renovables (REER)"
      >
        {loading ? (
          <Loading label="Cargando subastas REER…" />
        ) : subastas.length === 0 ? (
          <Empty msg="Catálogo de subastas no disponible ahora." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <Th>Subasta</Th>
                <Th w={92}>Fecha</Th>
                <Th w={110}>Estado</Th>
                <Th w={100} right>Potencia</Th>
                <Th w={110} right>Precio medio</Th>
                <Th>Tecnología</Th>
              </tr>
            </thead>
            <tbody>
              {subastas.map((s, i) => (
                <tr key={i} style={{ borderTop: '1px solid #F1F1F3' }}>
                  <Td>
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 600 }}>
                      {s.nombre} <span style={{ fontSize: 9, color: ACCENT, opacity: 0.8 }}>↗</span>
                    </a>
                  </Td>
                  <Td mono>{s.fecha}</Td>
                  <Td>
                    <SubastaEstado estado={s.estado} />
                  </Td>
                  <Td right mono>{s.potencia_mw != null ? `${s.potencia_mw.toLocaleString('es-ES')} MW` : '—'}</Td>
                  <Td right mono>{s.precio_medio_eur_mwh != null ? `${s.precio_medio_eur_mwh.toLocaleString('es-ES', { maximumFractionDigits: 1 })} €/MWh` : '—'}</Td>
                  <Td dim>{s.tecnologia}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  )
}

export default PoliticaEstrategia

// ─── Tarjeta de programa ─────────────────────────────────────────────────────
function ProgramaCard({ p }: { p: ProgramaEstrategico }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block',
        border: '1px solid #ECECEF',
        borderRadius: 12,
        padding: '14px 16px',
        background: '#FAFAFA',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>
          ◆ {p.nombre}
        </span>
        <span style={{ fontSize: 8.5, fontWeight: 800, color: p.ambito === 'UE' ? '#1e3a8a' : ACCENT, background: p.ambito === 'UE' ? 'rgba(30,58,138,0.08)' : 'rgba(22,163,74,0.08)', padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>
          {p.ambito}
        </span>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: '#6e6e73', lineHeight: 1.45 }}>{p.objetivo}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {p.dotacion_eur != null && (
          <Metric label="Dotación" value={formatEur(p.dotacion_eur)} accent />
        )}
        <Metric label="Estado" value={p.estado} />
        <Metric label="Horizonte" value={p.horizonte} />
      </div>
      <div style={{ marginTop: 8, fontSize: 9.5, color: '#A0A0A5' }}>{p.organismo}</div>
    </a>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 8.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: accent ? ACCENT : '#1d1d1f', letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  )
}

function SubastaEstado({ estado }: { estado: SubastaRenovable['estado'] }) {
  const celebrada = estado === 'Celebrada'
  const cancelada = estado === 'Cancelada'
  const col = cancelada ? '#DC2626' : celebrada ? ACCENT : '#D97706'
  const bg = cancelada ? 'rgba(220,38,38,0.07)' : celebrada ? 'rgba(22,163,74,0.07)' : 'rgba(217,119,6,0.07)'
  return (
    <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: bg, color: col }}>
      {estado}
    </span>
  )
}

// ─── Estados y primitivas ────────────────────────────────────────────────────
function Loading({ label }: { label: string }) {
  return <div style={{ fontSize: 12, color: '#86868b' }}>{label}</div>
}
function Empty({ msg }: { msg: string }) {
  return <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>{msg}</div>
}

function Th({ children, w, right }: { children: React.ReactNode; w?: number; right?: boolean }) {
  return (
    <th
      style={{
        textAlign: right ? 'right' : 'left',
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
function Td({ children, mono, dim, right }: { children: React.ReactNode; mono?: boolean; dim?: boolean; right?: boolean }) {
  return (
    <td
      style={{
        padding: '9px 10px 9px 0',
        verticalAlign: 'top',
        textAlign: right ? 'right' : 'left',
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Extrae el primer número de un string (soporta coma decimal española). */
function parseFirstNumber(s: string): number | null {
  const m = /-?\d+(?:[.,]\d+)?/.exec(s)
  if (!m) return null
  const n = parseFloat(m[0].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Formatea euros a una escala legible (M€/MM€). */
function formatEur(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MM€`
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} M€`
  return `${v.toLocaleString('es-ES')} €`
}
