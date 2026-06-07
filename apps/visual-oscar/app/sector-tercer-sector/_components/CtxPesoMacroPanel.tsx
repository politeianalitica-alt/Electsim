'use client'
/**
 * <CtxPesoMacroPanel /> · Tercer Sector v3 · Sprint TS8 · Contexto e impacto
 *
 * Peso MACRO del tercer sector, con LENTE SOCIAL (no repite el cuadro macro
 * general de /macro). Tres magnitudes que sitúan al sector social en la economía,
 * TODAS en vivo desde Eurostat vía el endpoint EXISTENTE `/api/eurostat/dataset`:
 *
 *   - Gasto público en protección social · % del PIB (COFOG GF10)
 *     Eurostat gov_10a_exp · cofog99=GF10 · sector=S13 · na_item=TE · unit=PC_GDP.
 *     Es el termómetro del Estado del bienestar dentro del que opera el tercer
 *     sector (concierta, complementa y a veces sustituye la provisión pública).
 *   - Gasto en protección social · absoluto (M€) · mismo dataset, unit=MIO_EUR.
 *   - Empleo en salud y trabajo social (CNAE Q) · miles de personas
 *     Eurostat nama_10_a64_e · nace_r2=Q · na_item=EMP_DC · unit=THS_PER, y su
 *     % sobre el empleo total (nace_r2=TOTAL). Es el mejor PROXY macro disponible
 *     del peso laboral de la economía del cuidado donde se concentra el tercer
 *     sector de acción social (Eurostat no publica una serie "entidades sin ánimo
 *     de lucro" homogénea para España; se dice explícitamente).
 *
 * Además, una comparativa UE del gasto en protección social (%PIB) para situar a
 * España frente a la media y a los grandes (FR/DE/IT/PT), con una llamada por país
 * (el endpoint no admite multi-geo).
 *
 * Reusa la primitiva compartida <HeroKpis />. Degradación honesta por bloque
 * (CLAUDE.md): si una métrica no responde, queda '—' con su nota de fuente; nunca
 * se inventan cifras. Cero emojis · Unicode geométrico (◔ ⇡ ⇣ →).
 */
import { useEffect, useState } from 'react'
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'
import { fetchLatest, fetchComparison, GEO_NAMES, type EsLatest, type EsComparison } from './CtxEurostat'

const ACCENT = '#16A34A'
const ACCENT_DARK = '#15803D'

// Datasets/filtros (verificados en vivo, abr–jun 2026). geo=ES se añade por llamada.
const COFOG_BASE = { cofog99: 'GF10', sector: 'S13', na_item: 'TE' } as const
const NACE_BASE = { na_item: 'EMP_DC', unit: 'THS_PER' } as const
// Países de la comparativa social europea (modelos de bienestar contrastados).
const PEER_GEOS = ['ES', 'FR', 'DE', 'IT', 'PT', 'SE']

type LoadState = 'loading' | 'ready' | 'error'

interface MacroState {
  gastoPct: EsLatest | null // % PIB protección social
  gastoMeur: EsLatest | null // M€ protección social
  empleoQ: EsLatest | null // miles ocupados CNAE Q
  empleoTotal: EsLatest | null // miles ocupados total (para el %)
  comp: EsComparison | null // comparativa UE %PIB
}

function pctOf(part: number | null | undefined, whole: number | null | undefined): number | null {
  if (part == null || whole == null || whole === 0) return null
  return +((part / whole) * 100).toFixed(1)
}

export function CtxPesoMacroPanel() {
  const [s, setS] = useState<MacroState>({
    gastoPct: null,
    gastoMeur: null,
    empleoQ: null,
    empleoTotal: null,
    comp: null,
  })
  const [state, setState] = useState<LoadState>('loading')

  useEffect(() => {
    const ctrl = new AbortController()
    async function load() {
      const [gastoPct, gastoMeur, empleoQ, empleoTotal, comp] = await Promise.all([
        fetchLatest('gov_10a_exp', { ...COFOG_BASE, unit: 'PC_GDP', geo: 'ES' }, ctrl.signal),
        fetchLatest('gov_10a_exp', { ...COFOG_BASE, unit: 'MIO_EUR', geo: 'ES' }, ctrl.signal),
        fetchLatest('nama_10_a64_e', { ...NACE_BASE, nace_r2: 'Q', geo: 'ES' }, ctrl.signal),
        fetchLatest('nama_10_a64_e', { ...NACE_BASE, nace_r2: 'TOTAL', geo: 'ES' }, ctrl.signal),
        fetchComparison('gov_10a_exp', { ...COFOG_BASE, unit: 'PC_GDP' }, PEER_GEOS, 'EU27_2020', ctrl.signal),
      ])
      if (ctrl.signal.aborted) return
      setS({ gastoPct, gastoMeur, empleoQ, empleoTotal, comp })
      const anyLive = gastoPct || gastoMeur || empleoQ || comp
      setState(anyLive ? 'ready' : 'error')
    }
    load()
    return () => ctrl.abort()
  }, [])

  const empleoSharePct = pctOf(s.empleoQ?.value, s.empleoTotal?.value)

  // Frescura agregada del bloque Eurostat.
  const liveCount = [s.gastoPct, s.gastoMeur, s.empleoQ, s.comp].filter(Boolean).length
  const chip =
    liveCount >= 3
      ? { label: 'Eurostat · en vivo', color: '#16A34A' }
      : liveCount >= 1
        ? { label: 'Eurostat · parcial', color: '#D97706' }
        : { label: 'Eurostat · no disponible', color: '#DC2626' }

  const heroItems: HeroKpiItem[] = [
    {
      label: 'Gasto protección social',
      value: s.gastoPct?.value ?? null,
      unit: '% PIB',
      color: '#86EFAC',
      decimals: 1,
      footer: s.gastoPct
        ? `Eurostat gov_10a_exp · COFOG GF10 · ${s.gastoPct.period}`
        : 'Eurostat gov_10a_exp · COFOG GF10',
    },
    {
      label: 'Gasto protección social',
      value: s.gastoMeur?.value != null ? Math.round(s.gastoMeur.value / 1000) : null,
      unit: 'mil M€',
      color: '#FCD34D',
      decimals: 0,
      footer: s.gastoMeur
        ? `Eurostat gov_10a_exp · ${s.gastoMeur.period} · administración pública`
        : 'Eurostat gov_10a_exp · absoluto',
    },
    {
      label: 'Empleo salud y trabajo social',
      value: s.empleoQ?.value != null ? Math.round(s.empleoQ.value) : null,
      unit: 'mil',
      color: '#7DD3FC',
      decimals: 0,
      footer: s.empleoQ
        ? `Eurostat nama_10_a64_e · CNAE Q · ${s.empleoQ.period}`
        : 'Eurostat nama_10_a64_e · CNAE Q',
    },
    {
      label: '% del empleo total',
      value: empleoSharePct,
      unit: '%',
      color: '#C4B5FD',
      decimals: 1,
      footer:
        empleoSharePct != null && s.empleoQ
          ? `CNAE Q sobre empleo total · ${s.empleoQ.period}`
          : 'CNAE Q sobre empleo total nacional',
    },
  ]

  // Comparativa UE: barras horizontales sobrias (España resaltada · media UE como línea).
  const comp = s.comp
  const compMax = comp ? Math.max(...comp.items.map((i) => i.value), comp.euValue ?? 0) : 0

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
            <span aria-hidden="true" style={{ marginRight: 6 }}>◔</span>
            TERCER SECTOR · PESO MACRO
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
            El tercer sector dentro de la economía
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.85, maxWidth: 600, lineHeight: 1.5 }}>
            Lente social del cuadro macro: gasto público en protección social (el Estado del bienestar dentro del que
            opera el sector) y empleo en salud y trabajo social como proxy de la economía del cuidado. El cuadro macro
            general (PIB, déficit, IPC) vive en /macro.
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
          No se pudo cargar el peso macro del tercer sector en este momento (Eurostat no respondió). Reintenta más tarde;
          los datos no se inventan.
        </p>
      ) : (
        <HeroKpis items={heroItems} loading={state === 'loading'} />
      )}

      {/* Comparativa UE · gasto en protección social (% PIB) */}
      {comp && comp.items.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.78,
            }}
          >
            Gasto en protección social · % PIB · España frente a Europa
            {comp.esRank != null && comp.esValue != null && (
              <span style={{ marginLeft: 8, opacity: 0.85, fontWeight: 700, letterSpacing: 0 }}>
                · España {comp.esValue.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%
                {comp.euValue != null && (
                  <>
                    {' '}
                    {comp.esValue >= comp.euValue ? '⇡' : '⇣'} media UE{' '}
                    {comp.euValue.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%
                  </>
                )}
              </span>
            )}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {comp.items.map((it) => {
              const isEs = it.geo === 'ES'
              const w = compMax > 0 ? (it.value / compMax) * 100 : 0
              return (
                <div key={it.geo} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 96, fontSize: 11, opacity: isEs ? 1 : 0.82, fontWeight: isEs ? 800 : 600, whiteSpace: 'nowrap' }}>
                    {GEO_NAMES[it.geo] ?? it.geo}
                  </span>
                  <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.14)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                    <div
                      style={{
                        width: `${w}%`,
                        height: '100%',
                        background: isEs ? '#FCD34D' : 'rgba(255,255,255,0.55)',
                        borderRadius: 999,
                      }}
                    />
                    {/* línea de media UE */}
                    {comp.euValue != null && compMax > 0 && (
                      <span
                        title={`Media UE-27 · ${comp.euValue}%`}
                        style={{
                          position: 'absolute',
                          left: `${(comp.euValue / compMax) * 100}%`,
                          top: -2,
                          bottom: -2,
                          width: 2,
                          background: '#fff',
                          opacity: 0.85,
                        }}
                      />
                    )}
                  </div>
                  <span style={{ width: 44, textAlign: 'right', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isEs ? '#FCD34D' : '#fff' }}>
                    {it.value.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                  </span>
                </div>
              )
            })}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 9.5, opacity: 0.62, lineHeight: 1.5 }}>
            Eurostat gov_10a_exp · COFOG GF10 · gasto de la administración pública en protección social. La línea blanca
            marca la media UE-27. Una llamada por país (el endpoint no admite multi-país).
          </p>
        </div>
      )}

      {/* Honestidad: no hay serie homogénea de "entidades sin ánimo de lucro" */}
      {state !== 'loading' && (
        <p style={{ margin: '14px 0 0', fontSize: 10, opacity: 0.66, lineHeight: 1.5 }}>
          Nota metodológica: Eurostat no publica una serie homogénea de empleo en entidades sin ánimo de lucro para
          España. Se usa el empleo en salud y trabajo social (CNAE Q) como proxy macro de la economía del cuidado donde
          se concentra el tercer sector de acción social. El empleo directo declarado por las propias entidades cumbre
          vive en la pestaña «Visión Global» (seed curado).
        </p>
      )}
    </section>
  )
}

export default CtxPesoMacroPanel
