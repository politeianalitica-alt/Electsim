'use client'
/**
 * <TSGlobalLicitacionesSnapshot /> · Tercer Sector v3 · Sprint TS3 (Visión Global)
 *
 * SNAPSHOT de la pieza central de la sección: el agregador MULTINIVEL de
 * licitaciones (CCAA → Estado → UE → otros países → regional extranjero →
 * organizaciones internacionales). Consume `/api/tercer-sector/licitaciones?
 * pageSize=5`, que devuelve un envelope PLANO (`{ licitaciones, total, por_nivel,
 * fuentes_ok, fuentes_error, ... }`, NO `{ ok, data }`).
 *
 * Titulares: total de oportunidades, distribución por nivel (mini-barras) y las
 * 5 licitaciones más recientes (título + nivel + comprador). El buscador
 * exhaustivo con filtros, el detalle por licitación y el análisis de pliegos por
 * IA viven en la pestaña «Licitaciones» y NO se replican aquí.
 *
 * Degradación honesta: si una fuente cae se anota; sin resultados → aviso. Cero
 * emojis · Unicode geométrico.
 *
 * No hace fetch: recibe la respuesta ya resuelta por <TSVisionGlobalView />.
 */
import type { TercerSectorTab } from './TercerSectorShell'
import { SnapshotCard, MiniBar, NIVEL_LABEL, NIVEL_COLOR } from './TSGlobalShared'

// ── Shape mínimo consumido del envelope PLANO ─────────────────────────────
export interface Licitacion {
  id: string
  titulo: string
  comprador: string
  nivel: string
  pais: string
  fecha_pub: string | null
  url: string
}
export interface LicitacionesResponse {
  licitaciones?: Licitacion[]
  total?: number
  por_nivel?: Record<string, number>
  fuentes_ok?: string[]
  fuentes_error?: Array<{ fuente: string; error: string }>
  error?: string
}

function fechaCorta(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

export function TSGlobalLicitacionesSnapshot({
  res,
  loading,
  onNavigate,
}: {
  res: LicitacionesResponse | null
  loading: boolean
  onNavigate: (tab: TercerSectorTab) => void
}) {
  const items = res?.licitaciones ?? []
  const total = res?.total ?? 0
  const porNivel = res?.por_nivel ?? {}
  const fuentesError = res?.fuentes_error ?? []

  // Orden de niveles para la barra (de lo más local a lo internacional).
  const nivelesOrden = ['ccaa', 'nacional_es', 'ue', 'pais_extranjero', 'regional_extranjero', 'org_internacional']
  const niveles = nivelesOrden.filter((n) => (porNivel[n] ?? 0) > 0)

  const degradedNote =
    !loading && items.length === 0
      ? res?.error
        ? `Licitaciones no disponibles · ${res.error}`
        : 'Sin oportunidades en este momento o fuentes no disponibles. Reintenta más tarde.'
      : !loading && fuentesError.length > 0
        ? `Parcial · sin respuesta de: ${fuentesError.map((f) => f.fuente).join(', ')}.`
        : null

  return (
    <SnapshotCard
      title="Licitaciones multinivel"
      subtitle={total > 0 ? `${total.toLocaleString('es-ES')} oportunidades · CCAA → org. internacionales` : 'CCAA → Estado → UE → org. internacionales'}
      sourceLabel="Agregador"
      sourceUrl="https://contrataciondelestado.es/"
      detalleTab="licitaciones"
      detalleLabel="Abrir buscador + análisis de pliegos"
      onNavigate={onNavigate}
      loading={loading}
      degradedNote={degradedNote}
    >
      {/* Distribución por nivel (mini-barras) */}
      {niveles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {niveles.map((n) => (
            <MiniBar
              key={n}
              label={NIVEL_LABEL[n] ?? n}
              count={porNivel[n] ?? 0}
              total={total || 1}
              color={NIVEL_COLOR[n] ?? '#16A34A'}
            />
          ))}
        </div>
      )}

      {/* Top 5 recientes (titular + nivel + comprador) */}
      {items.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.slice(0, 5).map((l) => (
            <li key={l.id} style={{ borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>
              <a
                href={l.url || '#'}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                title={l.titulo}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 8.5,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: '#fff',
                      background: NIVEL_COLOR[l.nivel] ?? '#16A34A',
                      borderRadius: 4,
                      padding: '2px 6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {NIVEL_LABEL[l.nivel] ?? l.nivel}
                  </span>
                  <span style={{ fontSize: 10, color: '#94A3B8', whiteSpace: 'nowrap' }}>{fechaCorta(l.fecha_pub)}</span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0f172a',
                    marginTop: 3,
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {l.titulo || 'Licitación sin título'}
                </div>
                {l.comprador && (
                  <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.comprador}
                    {l.pais ? ` · ${l.pais}` : ''}
                  </div>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </SnapshotCard>
  )
}

export default TSGlobalLicitacionesSnapshot
