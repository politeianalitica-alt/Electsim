'use client'
/**
 * <ImpactoMacroPanel /> · Turismo v3 · Sprint T9 · Impacto económico
 *
 * Peso MACRO del turismo, pero con LENTE TURÍSTICA (no repite el panel macro
 * general de /macro): solo las magnitudes que miden la dependencia económica del
 * turismo en España.
 *
 *   - %PIB turístico · exports de servicios turísticos / PIB
 *     (Eurostat bop_its6_det · bop_item=SC "Travel"). El más alto del mundo.
 *   - Empleo HORECA · ocupados en hostelería+restauración
 *     (Eurostat lfsq_egan2 · NACE I), en miles.
 *   - Gasto turístico total (EGATUR · INE), como contribución del gasto receptor.
 *
 * Reusa la primitiva compartida <HeroKpis /> (label·value·unit·color·footer) en
 * una banda hero sobria, en vez de duplicar tarjetas. Consume el envelope
 * `{ ok, data, ... }` de dos endpoints y degrada por bloque (CLAUDE.md): si
 * Eurostat falla, los % quedan '—' con nota; EGATUR es independiente.
 *
 * Cero emojis · Unicode geométrico (◈ ⇡ ⇣ →). No inventa valores.
 */
import { useEffect, useState } from 'react'
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'

const ACCENT = '#0EA5E9'
const ACCENT_DARK = '#075985'

// ── Contratos consumidos (subconjunto · ver lib/turismo/*) ─────────────────
interface ImpactoData {
  pib_turistico_pct: number | null
  pib_turistico_period: string | null
  empleo_horeca: number | null
  empleo_horeca_period: string | null
  empleo_horeca_unit: string
  gasto_publico_total_meur: number
  eurostat_source: 'live' | 'partial' | 'unavailable'
  nota: string
}
interface ImpactoEnvelope {
  ok: boolean
  data: ImpactoData | null
  fetched_at?: string
}

interface InePoint {
  period: string
  value: number | null
}
interface EgaturMetric {
  last: InePoint | null
  yoy_pct: number | null
  unit: string
}
interface EgaturData {
  gasto_total: EgaturMetric
  estancia_media: EgaturMetric
  last_period: string | null
}
interface EgaturEnvelope {
  ok: boolean
  data: EgaturData | null
}

type LoadState = 'loading' | 'ready' | 'error'

/** Etiqueta + color del estado de frescura del bloque Eurostat. */
function sourceChip(src: ImpactoData['eurostat_source'] | undefined): { label: string; color: string } {
  switch (src) {
    case 'live':
      return { label: 'Eurostat · en vivo', color: '#16A34A' }
    case 'partial':
      return { label: 'Eurostat · parcial', color: '#D97706' }
    case 'unavailable':
      return { label: 'Eurostat · no disponible', color: '#DC2626' }
    default:
      return { label: 'Eurostat', color: '#86868b' }
  }
}

export function ImpactoMacroPanel() {
  const [impacto, setImpacto] = useState<ImpactoData | null>(null)
  const [egatur, setEgatur] = useState<EgaturData | null>(null)
  const [state, setState] = useState<LoadState>('loading')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [iRes, eRes] = await Promise.all([
          fetch('/api/turismo/impacto-economico', { cache: 'no-store' })
            .then((r) => r.json() as Promise<ImpactoEnvelope>)
            .catch(() => null),
          fetch('/api/turismo/egatur?n=12', { cache: 'no-store' })
            .then((r) => r.json() as Promise<EgaturEnvelope>)
            .catch(() => null),
        ])
        if (!alive) return
        setImpacto(iRes?.ok ? iRes.data : null)
        setEgatur(eRes?.ok ? eRes.data : null)
        // Solo es error duro si AMBOS bloques caen.
        setState(iRes?.ok || eRes?.ok ? 'ready' : 'error')
      } catch {
        if (alive) setState('error')
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  const chip = sourceChip(impacto?.eurostat_source)
  const gastoTotal = egatur?.gasto_total?.last ?? null
  const gastoYoY = egatur?.gasto_total?.yoy_pct ?? null
  const estancia = egatur?.estancia_media?.last ?? null

  // KPIs hero · lente turística (NO PIB general, NO déficit, NO IPC general).
  const heroItems: HeroKpiItem[] = [
    {
      label: '% PIB turístico',
      value: impacto?.pib_turistico_pct ?? null,
      unit: '% PIB',
      color: '#86EFAC',
      decimals: 2,
      footer: impacto?.pib_turistico_period
        ? `Eurostat bop_its6_det · ${impacto.pib_turistico_period}`
        : 'Eurostat bop_its6_det · ingresos receptor',
    },
    {
      label: 'Empleo HORECA',
      value:
        impacto?.empleo_horeca != null ? Math.round(impacto.empleo_horeca) : null,
      unit: 'mil',
      color: '#7DD3FC',
      decimals: 0,
      footer: impacto?.empleo_horeca_period
        ? `Eurostat lfsq_egan2 NACE I · ${impacto.empleo_horeca_period}`
        : 'Eurostat lfsq_egan2 · hostelería',
    },
    {
      label: 'Gasto turístico total',
      value: gastoTotal?.value != null ? gastoTotal.value : null,
      unit: 'M€',
      color: '#FCD34D',
      decimals: 0,
      footer:
        gastoTotal?.period != null
          ? `INE EGATUR · receptor · ${gastoTotal.period}${gastoYoY != null ? ` · ${gastoYoY >= 0 ? '⇡' : '⇣'} ${Math.abs(gastoYoY).toFixed(1)}% a/a` : ''}`
          : 'INE EGATUR · gasto del turismo receptor',
    },
    {
      label: 'Estancia media',
      value: estancia?.value != null ? estancia.value : null,
      unit: 'noches',
      color: '#FCA5A5',
      decimals: 2,
      footer:
        estancia?.period != null
          ? `INE EGATUR · duración media · ${estancia.period}`
          : 'INE EGATUR · duración media del viaje',
    },
  ]

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
            <span aria-hidden="true" style={{ marginRight: 6 }}>◈</span>
            TURISMO · PESO MACRO
          </p>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Dependencia económica del turismo
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.85, maxWidth: 560, lineHeight: 1.5 }}>
            Lente turística del cuadro macro: peso en PIB, empleo en hostelería y gasto del turismo receptor. El cuadro
            macro general (crecimiento, déficit, IPC) vive en /macro.
          </p>
        </div>
        <span
          title="Procedencia del bloque de datos vivos de Eurostat"
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

      {state === 'error' ? (
        <p style={{ fontSize: 12.5, opacity: 0.9, margin: 0, lineHeight: 1.55 }}>
          No se pudo cargar el peso macro del turismo en este momento (Eurostat e INE EGATUR no respondieron). Reintenta
          más tarde; los datos no se inventan.
        </p>
      ) : (
        <HeroKpis items={heroItems} loading={state === 'loading'} />
      )}

      {state === 'ready' && impacto?.nota && (
        <p style={{ margin: '12px 0 0', fontSize: 10.5, opacity: 0.72, lineHeight: 1.5 }}>{impacto.nota}</p>
      )}
    </section>
  )
}

export default ImpactoMacroPanel
