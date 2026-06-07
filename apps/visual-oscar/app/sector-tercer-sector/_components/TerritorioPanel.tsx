'use client'
/**
 * <TerritorioPanel /> · Tercer Sector v3 · Cockpit W2 · capa TERRITORIAL
 *
 * Responde a "¿dónde hay actividad, financiación, compradores, concentración de
 * entidades y HUECOS por CCAA?". Consume el endpoint EXISTENTE
 * `GET /api/tercer-sector/territorio` → `{ ok, data:{ territorios, resumen, ... } }`
 * (degradación honesta por fuente; el catálogo de ONGs es local → siempre hay al
 * menos la foto de presencia). NUNCA inventa: importes `null` se muestran como '—'.
 *
 * Componente REUTILIZABLE: lo monta esta vista de Contexto y también la vista de
 * Visión Global (de ahí el export con nombre estable `TerritorioPanel` + la prop
 * `compact`):
 *   - full (default): KPIs nacionales + mapa CCAA choropleth (reusa
 *     <CCAAHexmap />, solo se le pasa data; NO se toca) con selector
 *     subvenciones / entidades · ranking CCAA por subvenciones · ranking CCAA por
 *     oportunidades abiertas (convocatorias + licitaciones) · panel de ALERTAS de
 *     hueco con el texto que ya calcula el backend.
 *   - compact: solo KPIs + top-5 alertas (para incrustar en otra vista).
 *
 * Cero emojis · Unicode geométrico (⬡ ◧ ◨ ⇡ →). Mismo lenguaje visual sobrio que
 * el resto del sector (acento verde #16A34A).
 */
import { useEffect, useMemo, useState } from 'react'
import { CCAAHexmap, type CCAADatum } from '../../../components/macro/charts/CCAAHexmap'
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'

const ACCENT = '#16A34A'
const ACCENT_DARK = '#15803D'

// ─────────────────────────────────────────────────────────────────────────
// Contrato del endpoint (subset de TerritorioTS · ver territorio-core.ts).
// Se redeclara local y plano para no acoplar el componente cliente al módulo
// de servidor; el shape es el del spec.
// ─────────────────────────────────────────────────────────────────────────

interface TerritorioRankItem {
  nombre: string
  count: number
  importe_eur: number | null
}

export interface TerritorioTS {
  ccaa: string
  ccaa_nombre: string
  provincia?: string
  entidades: number
  ingresos_eur: number | null
  empleados: number | null
  subvenciones_eur: number | null
  concesiones: number
  convocatorias_abiertas: number
  licitaciones: number
  licitaciones_valor_eur: number | null
  sectores_top: TerritorioRankItem[]
  compradores_top: TerritorioRankItem[]
  beneficiarios_top: TerritorioRankItem[]
  alertas: string[]
}

interface TerritorioResumen {
  total_entidades: number
  total_concesiones: number
  total_convocatorias: number
  total_licitaciones: number
  total_alertas: number
  ccaa_con_alertas: number
}

interface TerritorioEnvelope {
  ok: boolean
  data: {
    territorios: TerritorioTS[]
    total_ccaa?: number
    fuentes_ok?: string[]
    fuentes_error?: { fuente: string; error: string }[]
    resumen?: TerritorioResumen
  } | null
  error?: string
  fetched_at?: string
}

type LoadState = 'loading' | 'ready' | 'error'

export interface TerritorioPanelProps {
  /** Modo compacto para incrustar en otra vista: solo KPIs + top-5 alertas. */
  compact?: boolean
}

/** Cubo residual (filas sin CCAA atribuible). No tiene posición en el mapa. */
const CCAA_DESCONOCIDA = 'desconocida'

/**
 * Mapea la clave de CCAA del backend (`TerritorioTS.ccaa`) al `id` que entiende
 * <CCAAHexmap /> (catálogo macro). Casi todas coinciden; la única divergencia es
 * Valencia: backend `comunidad-valenciana` → hexmap `valencia`. El resto se pasa
 * tal cual. Si el id no existe en el mapa (p. ej. el cubo residual), el hexmap
 * simplemente no lo pinta (no hay posición), sin romper.
 */
const CCAA_KEY_TO_HEX_ID: Record<string, string> = {
  'comunidad-valenciana': 'valencia',
}
function hexIdFor(ccaaKey: string): string {
  return CCAA_KEY_TO_HEX_ID[ccaaKey] ?? ccaaKey
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers de formato (es-ES, null-safe · '—' = sin dato, nunca 0 inventado)
// ─────────────────────────────────────────────────────────────────────────

function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('es-ES', { maximumFractionDigits: 0 })
}

/** Euros legibles compactos: €, mil €, M€ según magnitud. '—' si null. */
function fmtEur(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M€`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} mil €`
  return `${n.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €`
}

/** Total de oportunidades abiertas de una CCAA (convocatorias + licitaciones). */
function oportunidades(t: TerritorioTS): number {
  return t.convocatorias_abiertas + t.licitaciones
}

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────

export function TerritorioPanel({ compact = false }: TerritorioPanelProps) {
  const [territorios, setTerritorios] = useState<TerritorioTS[]>([])
  const [resumen, setResumen] = useState<TerritorioResumen | null>(null)
  const [fuentesError, setFuentesError] = useState<{ fuente: string; error: string }[]>([])
  const [state, setState] = useState<LoadState>('loading')
  // Métrica activa del choropleth (solo modo full).
  const [metric, setMetric] = useState<'subvenciones' | 'entidades'>('subvenciones')

  useEffect(() => {
    const ctrl = new AbortController()
    async function load() {
      try {
        const res = await fetch('/api/tercer-sector/territorio', { signal: ctrl.signal })
        const json: TerritorioEnvelope = await res.json()
        if (ctrl.signal.aborted) return
        const rows = json.data?.territorios ?? []
        setTerritorios(rows)
        setResumen(json.data?.resumen ?? null)
        setFuentesError(json.data?.fuentes_error ?? [])
        setState(rows.length > 0 ? 'ready' : 'error')
      } catch {
        if (ctrl.signal.aborted) return
        setState('error')
      }
    }
    load()
    return () => ctrl.abort()
  }, [])

  // CCAA reales (excluye el cubo residual) para mapa y rankings.
  const reales = useMemo(
    () => territorios.filter((t) => t.ccaa !== CCAA_DESCONOCIDA),
    [territorios],
  )

  // Datos del choropleth según métrica activa. Reusa <CCAAHexmap /> tal cual.
  const hexData: CCAADatum[] = useMemo(() => {
    return reales.map((t) => {
      const value =
        metric === 'subvenciones'
          ? t.subvenciones_eur != null
            ? t.subvenciones_eur / 1_000_000 // M€ para una escala legible
            : null
          : t.entidades
      return {
        id: hexIdFor(t.ccaa),
        value,
        tooltipLabel: t.ccaa_nombre,
      }
    })
  }, [reales, metric])

  // Ranking CCAA por subvenciones (solo las que tienen importe conocido, desc).
  const rankSubvenciones = useMemo(
    () =>
      reales
        .filter((t) => t.subvenciones_eur != null)
        .slice()
        .sort((a, b) => (b.subvenciones_eur ?? 0) - (a.subvenciones_eur ?? 0))
        .slice(0, 8),
    [reales],
  )

  // Ranking CCAA por oportunidades abiertas (convocatorias + licitaciones, desc).
  const rankOportunidades = useMemo(
    () =>
      reales
        .slice()
        .sort((a, b) => oportunidades(b) - oportunidades(a))
        .filter((t) => oportunidades(t) > 0)
        .slice(0, 8),
    [reales],
  )

  // Alertas de hueco aplanadas (texto + CCAA de origen). El texto lo calcula el backend.
  const alertasFlat = useMemo(() => {
    const out: { ccaa: string; ccaa_nombre: string; texto: string }[] = []
    for (const t of reales) {
      for (const a of t.alertas) out.push({ ccaa: t.ccaa, ccaa_nombre: t.ccaa_nombre, texto: a })
    }
    return out
  }, [reales])

  // KPIs nacionales (contadores reales del resumen del endpoint; null-safe).
  const heroItems: HeroKpiItem[] = useMemo(() => {
    const totalSubv = reales.reduce<number | null>((acc, t) => {
      if (t.subvenciones_eur == null) return acc
      return (acc ?? 0) + t.subvenciones_eur
    }, null)
    return [
      {
        label: 'Entidades (catálogo)',
        value: resumen?.total_entidades ?? null,
        color: '#86EFAC',
        decimals: 0,
        footer: `${reales.length} CCAA con señal`,
      },
      {
        label: 'Subvenciones recientes',
        value: totalSubv != null ? Math.round(totalSubv / 1_000_000) : null,
        unit: 'M€',
        color: '#FCD34D',
        decimals: 0,
        footer: 'BDNS · concesiones agregadas',
      },
      {
        label: 'Oportunidades abiertas',
        value:
          resumen != null
            ? (resumen.total_convocatorias ?? 0) + (resumen.total_licitaciones ?? 0)
            : null,
        color: '#7DD3FC',
        decimals: 0,
        footer: 'Convocatorias BDNS + licitaciones',
      },
      {
        label: 'Alertas de hueco',
        value: resumen?.total_alertas ?? alertasFlat.length,
        color: '#FDA4AF',
        decimals: 0,
        footer: `${resumen?.ccaa_con_alertas ?? new Set(alertasFlat.map((a) => a.ccaa)).size} CCAA afectadas`,
      },
    ]
  }, [reales, resumen, alertasFlat])

  // Procedencia agregada (chip de frescura honesto).
  const chip =
    state === 'ready'
      ? fuentesError.length === 0
        ? { label: 'Territorio · en vivo', color: '#16A34A' }
        : { label: 'Territorio · parcial', color: '#D97706' }
      : { label: 'Territorio · no disponible', color: '#DC2626' }

  // ─── Cabecera común (sobre banda verde, igual que el peso macro) ──────────
  const header = (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
      }}
    >
      <div>
        <p
          style={{
            margin: '0 0 4px',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            opacity: 0.82,
          }}
        >
          <span aria-hidden="true" style={{ marginRight: 6 }}>⬡</span>
          TERCER SECTOR · TERRITORIO
        </p>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: compact ? 17 : 20,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          Dónde hay tejido, dinero y huecos
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.85, maxWidth: 620, lineHeight: 1.5 }}>
          Foto por comunidad autónoma: presencia de entidades del catálogo, subvenciones recientes (BDNS),
          oportunidades abiertas (convocatorias + licitaciones) y alertas de hueco. Los importes que la fuente no
          informa se muestran como «—» (no se inventan).
        </p>
      </div>
      <span
        title="Procedencia agregada de la foto territorial"
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.16)',
          border: '1px solid rgba(255,255,255,0.28)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
        }}
      >
        <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: chip.color, display: 'inline-block' }} />
        {chip.label}
      </span>
    </header>
  )

  // ─── Estado de error honesto ──────────────────────────────────────────────
  if (state === 'error') {
    return (
      <section
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${ACCENT}33`,
          background: `linear-gradient(135deg, ${ACCENT_DARK} 0%, ${ACCENT} 100%)`,
          color: '#fff',
          padding: '20px 22px',
        }}
      >
        {header}
        <p style={{ fontSize: 12.5, opacity: 0.9, margin: 0, lineHeight: 1.55 }}>
          No se pudo cargar la foto territorial en este momento (las fuentes no respondieron). Reintenta más tarde;
          los datos no se inventan.
        </p>
      </section>
    )
  }

  // ─── KPIs + (compact: top-5 alertas | full: mapa + rankings + alertas) ─────
  return (
    <section
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        border: `1px solid ${ACCENT}33`,
        background: `linear-gradient(135deg, ${ACCENT_DARK} 0%, ${ACCENT} 100%)`,
        color: '#fff',
        padding: '20px 22px',
      }}
    >
      {header}

      <HeroKpis items={heroItems} loading={state === 'loading'} />

      {compact ? (
        // ── COMPACT: solo top-5 alertas de hueco ──────────────────────────────
        state !== 'loading' && (
          <div style={{ marginTop: 16 }}>
            <AlertasBlock alertas={alertasFlat.slice(0, 5)} total={alertasFlat.length} compact />
          </div>
        )
      ) : (
        // ── FULL: mapa choropleth + rankings + panel de alertas ──────────────
        state !== 'loading' && (
          <>
            {/* Mapa CCAA choropleth · selector métrica */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    opacity: 0.78,
                  }}
                >
                  Mapa por comunidad autónoma
                </p>
                <div role="tablist" aria-label="Métrica del mapa" style={{ display: 'inline-flex', gap: 4, background: 'rgba(255,255,255,0.14)', borderRadius: 999, padding: 3 }}>
                  <MetricTab active={metric === 'subvenciones'} onClick={() => setMetric('subvenciones')} symbol="◧" label="Subvenciones (M€)" />
                  <MetricTab active={metric === 'entidades'} onClick={() => setMetric('entidades')} symbol="◨" label="Entidades" />
                </div>
              </div>

              {/* Lienzo blanco para el hexmap (lo consume tal cual; no se toca). */}
              <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
                <CCAAHexmap
                  data={hexData}
                  accent={ACCENT}
                  unit={metric === 'subvenciones' ? ' M€' : ''}
                  formatValue={(v) => (metric === 'subvenciones' ? v.toLocaleString('es-ES', { maximumFractionDigits: 1 }) : v.toLocaleString('es-ES', { maximumFractionDigits: 0 }))}
                />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 9.5, opacity: 0.62, lineHeight: 1.5 }}>
                {metric === 'subvenciones'
                  ? 'Color por subvenciones recientes concedidas (BDNS, M€) atribuidas a la CCAA del convocante. Las CCAA sin importe conocido quedan sin color.'
                  : 'Color por número de entidades del catálogo con sede en la CCAA.'}
              </p>
            </div>

            {/* Rankings: subvenciones · oportunidades */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 18 }}>
              <RankList
                title="CCAA por subvenciones recientes"
                subtitle="Dinero concedido (BDNS) · M€"
                rows={rankSubvenciones}
                value={(t) => fmtEur(t.subvenciones_eur)}
                meta={(t) => `${fmtInt(t.concesiones)} conc. · ${fmtInt(t.entidades)} entidades`}
                emptyText="Ninguna CCAA con importe de subvención conocido en la ventana cargada."
              />
              <RankList
                title="CCAA por oportunidades abiertas"
                subtitle="Convocatorias BDNS + licitaciones"
                rows={rankOportunidades}
                value={(t) => fmtInt(oportunidades(t))}
                meta={(t) => `${fmtInt(t.convocatorias_abiertas)} convoc. · ${fmtInt(t.licitaciones)} licit.`}
                emptyText="No hay convocatorias ni licitaciones abiertas atribuidas a CCAA ahora mismo."
              />
            </div>

            {/* Panel de alertas de hueco */}
            <div style={{ marginTop: 18 }}>
              <AlertasBlock alertas={alertasFlat} total={alertasFlat.length} />
            </div>
          </>
        )
      )}

      {/* Honestidad: fuentes caídas */}
      {state !== 'loading' && fuentesError.length > 0 && (
        <p style={{ margin: '14px 0 0', fontSize: 10, opacity: 0.66, lineHeight: 1.5 }}>
          Degradación honesta: {fuentesError.map((f) => f.fuente).join(', ')} no respondió(eron). La foto se construye
          con las fuentes disponibles; las cifras afectadas pueden quedar incompletas.
        </p>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-componentes (privados · solo se usan aquí)
// ─────────────────────────────────────────────────────────────────────────

/** Pestaña de métrica del mapa (selector segmentado sobre la banda verde). */
function MetricTab({ active, onClick, symbol, label }: { active: boolean; onClick: () => void; symbol: string; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        border: 'none',
        cursor: 'pointer',
        borderRadius: 999,
        padding: '4px 11px',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.02em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: active ? '#fff' : 'transparent',
        color: active ? ACCENT_DARK : 'rgba(255,255,255,0.92)',
        transition: 'background 120ms ease',
      }}
    >
      <span aria-hidden="true">{symbol}</span>
      {label}
    </button>
  )
}

/** Lista de ranking sobria (barras de proporción + valor + metadato). */
function RankList({
  title,
  subtitle,
  rows,
  value,
  meta,
  emptyText,
}: {
  title: string
  subtitle: string
  rows: TerritorioTS[]
  value: (t: TerritorioTS) => string
  meta: (t: TerritorioTS) => string
  emptyText: string
}) {
  // Magnitud para las barras: usamos el primer valor numérico derivable del
  // propio ranking (subvenciones u oportunidades) para escalar la barra.
  const magnitudes = rows.map((t) =>
    t.subvenciones_eur != null && value(t).includes('€')
      ? t.subvenciones_eur
      : oportunidades(t),
  )
  const max = magnitudes.length ? Math.max(...magnitudes) : 0

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>{title}</p>
      <p style={{ margin: '2px 0 12px', fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{subtitle}</p>

      {rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 11.5, opacity: 0.78, lineHeight: 1.5 }}>{emptyText}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rows.map((t, i) => {
            const w = max > 0 ? (magnitudes[i] / max) * 100 : 0
            return (
              <div key={t.ccaa} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.ccaa_nombre}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#FCD34D', whiteSpace: 'nowrap' }}>{value(t)}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.14)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${w}%`, height: '100%', background: 'rgba(255,255,255,0.6)', borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 9.5, opacity: 0.62 }}>{meta(t)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Panel de alertas de hueco (texto curado por el backend; cero emojis). */
function AlertasBlock({
  alertas,
  total,
  compact = false,
}: {
  alertas: { ccaa: string; ccaa_nombre: string; texto: string }[]
  total: number
  compact?: boolean
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
        Alertas de hueco {total > 0 && <span style={{ opacity: 0.7, fontWeight: 600 }}>· {total}</span>}
      </p>
      <p style={{ margin: '2px 0 12px', fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        Tejido sin financiación · oferta sin presencia
      </p>

      {alertas.length === 0 ? (
        <p style={{ margin: 0, fontSize: 11.5, opacity: 0.78, lineHeight: 1.5 }}>
          No hay alertas de hueco con los umbrales actuales: la presencia de entidades y la financiación reciente están
          razonablemente alineadas por CCAA en la ventana cargada.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alertas.map((a, i) => (
            <li
              key={`${a.ccaa}-${i}`}
              style={{
                display: 'flex',
                gap: 9,
                alignItems: 'flex-start',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 9,
                padding: '9px 11px',
                borderLeft: '3px solid #FCD34D',
              }}
            >
              <span aria-hidden="true" style={{ color: '#FCD34D', fontSize: 12, fontWeight: 800, lineHeight: 1.5, flexShrink: 0 }}>!</span>
              <span style={{ fontSize: 11.5, lineHeight: 1.5, opacity: 0.95 }}>{a.texto}</span>
            </li>
          ))}
        </ul>
      )}

      {compact && total > alertas.length && (
        <p style={{ margin: '10px 0 0', fontSize: 10, opacity: 0.66 }}>
          {total - alertas.length} alerta(s) más en la vista de Territorio completa →
        </p>
      )}
    </div>
  )
}

export default TerritorioPanel
