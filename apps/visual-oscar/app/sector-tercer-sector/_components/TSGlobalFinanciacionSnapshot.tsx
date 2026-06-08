'use client'
/**
 * <TSGlobalFinanciacionSnapshot /> · Tercer Sector v3 · Sprint TS3 (Visión Global)
 *
 * SNAPSHOT del dinero HACIA el tercer sector. Consume
 * `/api/tercer-sector/financiacion` (envelope `{ ok, data, ... }`): subvenciones
 * BDNS (convocatorias + concesiones a entidades no lucrativas), grants UE SEDIA
 * (CERV / ESF+ / Horizon social) y la asignación del IRPF 0,7% Fines Sociales
 * (curado + datado).
 *
 * Titulares: nº de convocatorias, nº de concesiones, total concedido y la
 * recaudación del IRPF 0,7%. El desglose por convocatoria, beneficiario, nivel
 * y la lista completa de grants UE viven en la pestaña «Financiación» y NO se
 * replican aquí.
 *
 * Robustez: el total concedido se recalcula sobre `concesiones[].importe_eur`
 * (campo real del conector BDNS), con `resumen.total_concedido_eur` como
 * respaldo. Degradación honesta: campos no disponibles → '—'. Cero emojis.
 *
 * No hace fetch: recibe el envelope ya resuelto por <TSVisionGlobalView />.
 */
import type { TercerSectorTab } from './TercerSectorShell'
import { SnapshotCard, SnapStat, fmtEur, fmtInt, TS_ACCENT_DARK } from './TSGlobalShared'

// ── Shape mínimo consumido del envelope ───────────────────────────────────
export interface Irpf07 {
  ejercicio?: number
  recaudacion_estimada_meur?: number | null
  beneficiarias_aprox?: number | null
  fuente_url?: string
}
export interface FinanciacionData {
  concesiones?: Array<{ importe_eur?: number | null; es_tercer_sector?: boolean }>
  irpf_07?: Irpf07 | null
  resumen?: {
    n_convocatorias?: number
    n_concesiones?: number
    n_concesiones_ts?: number
    n_grants_ue?: number
    total_concedido_eur?: number | null
    total_concedido_ts_eur?: number | null
  }
  financiadores_activos?: Array<{ organo: string; count: number; total_eur: number }>
  fuentes_error?: Array<{ fuente: string; error: string }>
}
export interface FinanciacionEnvelope {
  ok: boolean
  data: FinanciacionData | null
  error?: string
}

export function TSGlobalFinanciacionSnapshot({
  env,
  loading,
  onNavigate,
}: {
  env: FinanciacionEnvelope | null
  loading: boolean
  onNavigate: (tab: TercerSectorTab) => void
}) {
  const data = env?.data ?? null
  const resumen = data?.resumen ?? {}

  // Total concedido robusto: sumar importe_eur (campo real del conector) y, si
  // no hay concesiones cargadas, caer al resumen del endpoint.
  const concesiones = data?.concesiones ?? []
  const sumImporte = concesiones.reduce((s, c) => s + (typeof c.importe_eur === 'number' ? c.importe_eur : 0), 0)
  const totalConcedido = sumImporte > 0 ? sumImporte : resumen.total_concedido_eur ?? null

  const irpf = data?.irpf_07 ?? null
  const irpfMeur = irpf?.recaudacion_estimada_meur ?? null

  const hayDatos =
    (resumen.n_convocatorias ?? 0) > 0 ||
    (resumen.n_concesiones ?? 0) > 0 ||
    (resumen.n_grants_ue ?? 0) > 0

  const fuentesError = data?.fuentes_error ?? []
  const degradedNote =
    !loading && !hayDatos
      ? env?.error
        ? `Financiación no disponible · ${env.error}`
        : 'Fuentes de financiación no disponibles ahora mismo (BDNS / SEDIA). Reintenta más tarde.'
      : !loading && fuentesError.length > 0
        ? `Parcial · sin respuesta de: ${fuentesError.map((f) => f.fuente).join(', ')}.`
        : null

  return (
    <SnapshotCard
      title="Financiación al tercer sector"
      subtitle="Subvenciones BDNS · grants UE · IRPF 0,7%"
      sourceLabel="BDNS"
      sourceUrl="https://www.infosubvenciones.es/"
      detalleTab="financiacion"
      detalleLabel="Ver financiación a fondo"
      onNavigate={onNavigate}
      loading={loading}
      degradedNote={degradedNote}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
        <SnapStat label="Concesiones TS" value={fmtInt(resumen.n_concesiones_ts ?? resumen.n_concesiones ?? null)} color={TS_ACCENT_DARK} />
        <SnapStat label="Total al tercer sector" value={fmtEur(resumen.total_concedido_ts_eur ?? totalConcedido)} color="#B45309" />
        <SnapStat label="Convocatorias abiertas" value={fmtInt(resumen.n_convocatorias ?? null)} />
        <SnapStat
          label="Financiadores activos"
          value={fmtInt((data?.financiadores_activos ?? []).length || (resumen.n_grants_ue ?? null))}
        />
      </div>

      {/* IRPF 0,7% Fines Sociales · dato curado+datado */}
      <div
        style={{
          marginTop: 4,
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 8,
          padding: '9px 11px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#15803D' }}>
            IRPF 0,7% Fines Sociales{irpf?.ejercicio ? ` · ${irpf.ejercicio}` : ''}
          </div>
          <div style={{ fontSize: 10.5, color: '#166534', marginTop: 2 }}>
            {irpf?.beneficiarias_aprox != null ? `~${fmtInt(irpf.beneficiarias_aprox)} entidades beneficiarias` : 'Tramo estatal'}
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#15803D', whiteSpace: 'nowrap' }}>
          {irpfMeur != null ? `${fmtInt(irpfMeur)} M€` : '—'}
        </span>
      </div>
    </SnapshotCard>
  )
}

export default TSGlobalFinanciacionSnapshot
