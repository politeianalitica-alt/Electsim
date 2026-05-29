'use client'
/**
 * `<MargenFiscalTab />` · Tab 3 · Margen fiscal PROFUNDO.
 *
 * Fuentes vivas:
 *  - IMF GGXWDG_NGDP deuda %PIB · serie histórica + forecast
 *  - IMF GGXCNL_NGDP saldo total %PIB
 *  - IMF GGXONLB_NGDP saldo primario %PIB
 *  - IMF GGR_NGDP ingresos %PIB
 *  - IMF GGX_NGDP gasto %PIB
 *
 * No más empty states de AIReF/IGAE (regla del usuario).
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { DeepLineChart } from '../DeepLineChart'
import { TrendNarrative } from '../TrendNarrative'
import { CountryCompareBars } from '../CountryCompareBars'
import { IndicatorDrill } from '../IndicatorDrill'
import { getTab } from '@/lib/macro/sources-matrix'
import { useMacroDrawer } from '../MacroDrawerProvider'
import type { ChartAnalysisInput } from '@/lib/macro/ai-schema'

function aiSeries(
  pts: { period: string; value: number | null; forecast?: boolean }[],
): { period: string; value: number; forecast?: boolean }[] {
  return pts
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .map((p) => ({ period: p.period, value: p.value as number, ...(p.forecast ? { forecast: true } : {}) }))
}

// Sprint M9 S4 · shape común a FRED · Eurostat NASDAQ DL
interface FredSeriesResponse {
  ok: boolean
  series: { period: string; value: number | null }[]
  last?: { period: string; value: number | null }
}

export function MargenFiscalTab() {
  const tab = getTab('margen-fiscal')
  const { openDrill } = useMacroDrawer()

  const [deuda, setDeuda] = useState<any>(null)
  const [saldo, setSaldo] = useState<any>(null)
  const [primary, setPrimary] = useState<any>(null)
  const [ingresos, setIngresos] = useState<any>(null)
  const [gasto, setGasto] = useState<any>(null)
  // Sprint M9 S4 · 5 estados nuevos (todos pueden ser null sin romper render)
  const [structural, setStructural] = useState<any>(null)       // GGSB_NPGDP saldo estructural
  const [deudaNeta, setDeudaNeta] = useState<any>(null)         // GGXWDN_NGDP deuda neta
  const [, setGdpReal] = useState<any>(null)                    // NGDP_R reservado para futuros sprints
  const [tipoEfectivo, setTipoEfectivo] = useState<FredSeriesResponse | null>(null) // FRED INTGSBESP193N
  const [edpt, setEdpt] = useState<any>(null)                   // Procedimiento déficit excesivo Eurostat
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGXCNL_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGXONLB_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGR_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=GGX_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      // Sprint M9 S4 · 8 fuentes nuevas. Patrón: si endpoint 404/error → catch → null → panel/drill no se renderiza.
      fetch('/api/imf/country?iso=ESP&indicator=GGXWDG_NGDP&peers=DEU,FRA,ITA,PRT', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // deuda peers inline (reservado)
      fetch('/api/fred/series?id=GGGDTAESP188N&n=40', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),                              // deuda bruta FRED 40y (reservado)
      fetch('/api/fred/series?id=ESPCBISCBIS&n=60', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),                                // crédito privado BIS/FRED (reservado)
      fetch('/api/imf/country?iso=ESP&indicator=GGSB_NPGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),                       // saldo estructural
      fetch('/api/imf/country?iso=ESP&indicator=GGXWDN_NGDP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),                      // deuda neta
      fetch('/api/imf/country?iso=ESP&indicator=NGDP_R', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),                           // PIB real (reservado)
      fetch('/api/fred/series?id=INTGSBESP193N&n=30', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),                              // tipo efectivo deuda
      fetch('/api/nasdaq-data-link/series?code=EUROSTAT/GOV_10DD_EDPT1_ESP&n=20', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),  // procedimiento déficit excesivo
    ]).then(([d, s, p, i, g, _peers, _fredD, _bisCr, st, dn, gr, te, ed]) => {
      if (!alive) return
      setDeuda(d); setSaldo(s); setPrimary(p); setIngresos(i); setGasto(g)
      setStructural(st); setDeudaNeta(dn); setGdpReal(gr); setTipoEfectivo(te); setEdpt(ed)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const splitImf = (d: any) => {
    const all = (d?.series || []).filter((s: any) => s.value != null) as { year: number; value: number }[]
    const cy = new Date().getFullYear()
    return {
      hist: all.filter((x) => x.year <= cy).map((x) => ({ period: String(x.year), value: x.value })),
      fc: all.filter((x) => x.year > cy).map((x) => ({ period: String(x.year), value: x.value })),
    }
  }

  const deudaSplit = splitImf(deuda)
  const saldoSplit = splitImf(saldo)
  const primarySplit = splitImf(primary)
  const ingresosSplit = splitImf(ingresos)
  const gastoSplit = splitImf(gasto)

  const deudaLast = deudaSplit.hist[deudaSplit.hist.length - 1]
  const saldoLast = saldoSplit.hist[saldoSplit.hist.length - 1]
  const primaryLast = primarySplit.hist[primarySplit.hist.length - 1]
  const ingLast = ingresosSplit.hist[ingresosSplit.hist.length - 1]
  const gastoLast = gastoSplit.hist[gastoSplit.hist.length - 1]

  // Intereses derivados: primary - total
  const intereses = primaryLast && saldoLast ? primaryLast.value - saldoLast.value : null

  // Sprint M9 S4 · splits y últimos para nuevos indicadores
  const structuralSplit = splitImf(structural)
  const deudaNetaSplit = splitImf(deudaNeta)
  const structuralLast = structuralSplit.hist[structuralSplit.hist.length - 1]
  const deudaNetaLast = deudaNetaSplit.hist[deudaNetaSplit.hist.length - 1]

  // FRED · tipo efectivo viene newest-first como en otros tabs
  const fredSeriesChrono = (r?: FredSeriesResponse | null) =>
    (r?.series || []).slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const tipoEfectivoSeries = fredSeriesChrono(tipoEfectivo)
  const tipoEfectivoLast = tipoEfectivo?.last ?? tipoEfectivoSeries[tipoEfectivoSeries.length - 1]

  // Serie histórica de intereses implícitos (primary − total año a año)
  const interesesSeries = primarySplit.hist
    .map((p: { period: string; value: number }) => {
      const s = saldoSplit.hist.find((s: { period: string; value: number }) => s.period === p.period)
      if (!s) return null
      return { period: p.period, value: p.value - s.value }
    })
    .filter((x): x is { period: string; value: number } => x != null)

  // Componente cíclico saldo (total − estructural) para drill de saldo estructural
  const cicloSeries = saldoSplit.hist
    .map((s: { period: string; value: number }) => {
      const e = structuralSplit.hist.find((x: { period: string; value: number }) => x.period === s.period)
      if (!e) return null
      return { period: s.period, value: s.value - e.value }
    })
    .filter((x): x is { period: string; value: number } => x != null)

  // Snowball effect: r vs g (crecimiento nominal estimado España 2025-2026: 4%)
  // TODO: sustituir gNominal por FRED NGDP growth real cuando endpoint disponible
  const gNominal = 4.0 // %
  const rEfectivo = tipoEfectivoLast?.value ?? null
  const rMinusG = rEfectivo != null ? rEfectivo - gNominal : null
  const autoDebtAnnual = rMinusG != null && deudaLast?.value != null
    ? (rMinusG * deudaLast.value) / 100
    : null
  const spStar = rEfectivo != null && deudaLast?.value != null
    ? ((rEfectivo - gNominal) * (deudaLast.value / 100))
    : null

  const openDrill1 = (label: string, indicator: string, split: any, threshold?: any, color = tab.themeAccent) => () => {
    openDrill({
      title: `${label} · IMF WEO`,
      subtitle: `IMF DataMapper · ${indicator}`,
      accent: color,
      content: (
        <IndicatorDrill
          label={label}
          unit="%"
          decimals={2}
          series={split.hist}
          forecast={split.fc}
          sourceCode={indicator}
          sourceName="IMF DataMapper"
          imfCompareIndicator={indicator}
          threshold={threshold}
          accent={color}
        />
      ),
      source: { name: 'IMF DataMapper', url: `https://www.imf.org/external/datamapper/${indicator}@WEO/ESP` },
    })
  }

  // Sprint M9 S4 C3 · 6 drills detallados con contexto fiscal completo
  // (sustituyen las llamadas a openDrill1 en los KPIs correspondientes).
  // Mantenemos openDrill1 para drills simples como Deuda neta.

  const openDeudaDrill = () => {
    const netaUltimo = deudaNetaLast?.value
    const brutoUltimo = deudaLast?.value
    const activosFin = brutoUltimo != null && netaUltimo != null ? brutoUltimo - netaUltimo : null
    openDrill({
      title: 'Deuda pública · análisis completo',
      subtitle: 'IMF GGXWDG_NGDP · Maastricht · sostenibilidad',
      accent: tab.themeAccent,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <IndicatorDrill
            label="Deuda %PIB"
            unit="%"
            decimals={1}
            series={deudaSplit.hist}
            forecast={deudaSplit.fc}
            sourceCode="GGXWDG_NGDP"
            sourceName="IMF DataMapper"
            imfCompareIndicator="GGXWDG_NGDP"
            threshold={{ amber: 100, red: 120, goodAbove: false }}
            accent={tab.themeAccent}
          />
          {netaUltimo != null && brutoUltimo != null && (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Bruta vs Neta
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>Bruta (Maastricht)</p>
                  <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: tab.themeAccent, fontVariantNumeric: 'tabular-nums' }}>
                    {brutoUltimo.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>Neta (activos descontados)</p>
                  <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#0891b2', fontVariantNumeric: 'tabular-nums' }}>
                    {netaUltimo.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>Diferencia (activos financieros)</p>
                  <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                    {activosFin != null ? `${activosFin.toFixed(1)}pp` : '—'}
                  </p>
                </div>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                La diferencia entre deuda bruta y neta refleja los activos financieros del sector público
                (reservas, fondos soberanos, participaciones en empresas públicas). España tiene activos
                equivalentes a ~{activosFin?.toFixed(0) ?? '?'}pp del PIB.
              </p>
            </div>
          )}
          {rEfectivo != null && (
            <div
              style={{
                background: rEfectivo > 4 ? '#fef2f2' : '#f0fdf4',
                borderRadius: 8,
                padding: '12px 14px',
                border: `1px solid ${rEfectivo > 4 ? '#fecaca' : '#86efac'}`,
              }}
            >
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: rEfectivo > 4 ? '#991b1b' : '#166534',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                Efecto bola de nieve (r − g)
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                Tipo efectivo medio deuda:{' '}
                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{rEfectivo.toFixed(2)}%</strong>.
                Si el crecimiento nominal del PIB está por debajo de este nivel, la deuda crece de forma
                autónoma incluso con presupuesto equilibrado. La sostenibilidad requiere superávit primario
                suficiente para compensar la diferencia r−g.
              </p>
            </div>
          )}
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '12px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Marco regulatorio UE
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                {
                  regla: 'Límite Maastricht',
                  valor: '60% PIB',
                  estado: brutoUltimo != null && brutoUltimo > 60 ? '! Incumplido' : '✓ Cumplido',
                  ok: brutoUltimo != null && brutoUltimo <= 60,
                },
                {
                  regla: 'Trayectoria reducción (Nuevo Marco)',
                  valor: 'Deuda decreciente',
                  estado: 'Ver forecast',
                  ok: true,
                },
                {
                  regla: 'Procedimiento déficit excesivo',
                  valor: 'PDE',
                  estado: edpt ? 'Vigilancia activa (Eurostat)' : 'Comprobar Eurostat',
                  ok: false,
                },
              ].map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 0',
                    borderBottom: '1px solid #fde68a',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#78350f' }}>{r.regla}</span>
                  <span style={{ fontSize: 10, color: '#92400e', fontWeight: 600 }}>{r.valor}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: r.ok ? '#16a34a' : '#dc2626' }}>{r.estado}</span>
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
            Fuentes · IMF DataMapper GGXWDG_NGDP · GGXWDN_NGDP · FRED INTGSBESP193N
          </p>
        </div>
      ),
      source: { name: 'IMF DataMapper', url: 'https://www.imf.org/external/datamapper/GGXWDG_NGDP@WEO/ESP' },
    })
  }

  const openSaldoDrill = () => {
    openDrill({
      title: 'Saldo fiscal · descomposición completa',
      subtitle: 'IMF GGXCNL_NGDP · saldo total · primario · estructural',
      accent: '#f59e0b',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <IndicatorDrill
            label="Saldo fiscal total"
            unit="%"
            decimals={2}
            series={saldoSplit.hist}
            forecast={saldoSplit.fc}
            sourceCode="GGXCNL_NGDP"
            sourceName="IMF DataMapper"
            imfCompareIndicator="GGXCNL_NGDP"
            threshold={{ amber: -3, red: -6, goodAbove: true }}
            accent="#f59e0b"
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {[
              {
                label: 'Total',
                value: saldoLast?.value,
                unit: '%',
                color: '#f59e0b',
                note: 'Incluye pago de intereses. El que mide Maastricht (límite −3%).',
              },
              {
                label: 'Primario',
                value: primaryLast?.value,
                unit: '%',
                color: '#10b981',
                note: 'Excluye intereses. Refleja el esfuerzo fiscal real del gobierno actual.',
              },
              {
                label: 'Estructural',
                value: structuralLast?.value,
                unit: '% PIB pot.',
                color: '#7c3aed',
                note: 'Ajustado por ciclo económico. Usado por la Comisión Europea para evaluar cumplimiento.',
              },
            ].map((s, i) => (
              <div key={i} style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 12px', border: `1px solid ${s.color}30` }}>
                <p style={{ margin: 0, fontSize: 10, color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</p>
                <p style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                  {s.value != null ? `${s.value.toFixed(2)}%` : '—'}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: '#78350f', lineHeight: 1.4 }}>{s.note}</p>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff1f2', borderRadius: 8, padding: '12px 14px', border: '1px solid #fecdd3' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Carga de intereses implícita
            </p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
              {intereses != null ? `${intereses.toFixed(2)}%` : '—'} PIB
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9f1239', lineHeight: 1.5 }}>
              Calculado como: Saldo Primario ({primaryLast?.value?.toFixed(2) ?? '?'}%) − Saldo Total ({saldoLast?.value?.toFixed(2) ?? '?'}%).
              Representa los intereses que España paga sobre su deuda acumulada. Con la subida de tipos BCE,
              esta cifra ha aumentado desde ~2.5% hasta valores más altos, reduciendo el margen para inversión
              o rebajas de impuestos.
            </p>
          </div>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
            Fuentes · IMF GGXCNL_NGDP · GGXONLB_NGDP · GGSB_NPGDP
          </p>
        </div>
      ),
      source: { name: 'IMF DataMapper', url: 'https://www.imf.org/external/datamapper/GGXCNL_NGDP@WEO/ESP' },
    })
  }

  const openPrimaryDrill = () => {
    openDrill({
      title: 'Saldo primario · ¿Es España fiscalmente sostenible?',
      subtitle: 'IMF GGXONLB_NGDP · análisis de sostenibilidad',
      accent: '#10b981',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <IndicatorDrill
            label="Saldo primario"
            unit="%"
            decimals={2}
            series={primarySplit.hist}
            forecast={primarySplit.fc}
            sourceCode="GGXONLB_NGDP"
            sourceName="IMF DataMapper"
            imfCompareIndicator="GGXONLB_NGDP"
            accent="#10b981"
          />
          {deudaLast && rEfectivo != null && spStar != null && (
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 14px', border: '1px solid #86efac' }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Superávit primario de equilibrio
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: spStar > 0 ? '#dc2626' : '#16a34a',
                }}
              >
                {spStar > 0 ? '+' : ''}{spStar.toFixed(2)}% PIB
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#166534', lineHeight: 1.5 }}>
                Para que la deuda no aumente como % del PIB, España necesita un saldo primario de al menos{' '}
                <strong>{spStar.toFixed(2)}%</strong> del PIB (dado r≈{rEfectivo.toFixed(1)}%, g nominal≈
                {gNominal.toFixed(1)}%, deuda={deudaLast.value.toFixed(0)}%).
                Saldo primario actual: <strong>{primaryLast?.value?.toFixed(2) ?? '?'}%</strong>.
                {primaryLast?.value != null && primaryLast.value > spStar
                  ? ' ✓ España supera el umbral de equilibrio.'
                  : ' ! España aún no cubre el coste dinámico de su deuda.'}
              </p>
            </div>
          )}
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
            Fuentes · IMF GGXONLB_NGDP · FRED INTGSBESP193N · cálculo interno Politeia
          </p>
        </div>
      ),
      source: { name: 'IMF DataMapper', url: 'https://www.imf.org/external/datamapper/GGXONLB_NGDP@WEO/ESP' },
    })
  }

  const openInteresesDrill = () => {
    openDrill({
      title: 'Carga de intereses · análisis histórico',
      subtitle: 'Primario − Total · + FRED tipo efectivo',
      accent: '#dc2626',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {interesesSeries.length > 3 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Serie histórica carga de intereses
              </p>
              <DeepLineChart
                series={[{ id: 'int', label: 'Intereses implícitos %PIB', color: '#dc2626', points: interesesSeries, fillBelow: true }]}
                height={160}
                yLabel="% PIB"
                formatValue={(v: number) => `${v.toFixed(2)}%`}
                zeroLine
              />
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
                El pico histórico de intereses fue durante la crisis 2012-2014, cuando la prima de
                riesgo disparó el coste de refinanciación. La política de BCE tipo cero comprimió los
                intereses a mínimos históricos 2016-2022. La subida de tipos 2022-2023 está
                encareciendo progresivamente el stock de deuda a medida que vence y se refinancia.
              </p>
            </div>
          )}
          {tipoEfectivoSeries.length > 3 && tipoEfectivoLast?.value != null && (
            <div style={{ background: '#fff1f2', borderRadius: 8, padding: '12px 14px', border: '1px solid #fecdd3' }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Tipo efectivo medio deuda · FRED
              </p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                {tipoEfectivoLast.value.toFixed(2)}%
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9f1239', lineHeight: 1.5 }}>
                El tipo efectivo es el coste medio ponderado de TODA la deuda viva (no solo la nueva).
                Se mueve lentamente porque la mayor parte de la deuda española es a largo plazo (vida
                media ~8 años). El tipo de nuevas emisiones ya está por encima de este nivel.
              </p>
            </div>
          )}
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
            Fuentes · IMF GGXCNL_NGDP · GGXONLB_NGDP · FRED INTGSBESP193N
          </p>
        </div>
      ),
      source: { name: 'FRED · IMF DataMapper', url: 'https://fred.stlouisfed.org/series/INTGSBESP193N' },
    })
  }

  const openStructuralDrill = () => {
    openDrill({
      title: 'Saldo estructural · posición fiscal real',
      subtitle: 'IMF GGSB_NPGDP · ajustado por ciclo económico',
      accent: '#7c3aed',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <IndicatorDrill
            label="Saldo estructural"
            unit="% PIB pot."
            decimals={2}
            series={structuralSplit.hist}
            forecast={structuralSplit.fc}
            sourceCode="GGSB_NPGDP"
            sourceName="IMF DataMapper"
            imfCompareIndicator="GGSB_NPGDP"
            threshold={{ amber: -1, red: -3, goodAbove: true }}
            accent="#7c3aed"
          />
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '12px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Por qué es el indicador más honesto
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#5b21b6', lineHeight: 1.6 }}>
              El saldo observable mejora automáticamente en bonanza (más ingresos fiscales, menos
              desempleo) y empeora en recesión, sin que el gobierno haga nada. El saldo estructural
              elimina este efecto cíclico. Un gobierno que solo mejora en bonanza pero no reduce su
              déficit estructural, en realidad no está consolidando; simplemente se está beneficiando
              del ciclo. La Comisión Europea usa este indicador para el Procedimiento de Déficit Excesivo.
            </p>
          </div>
          {cicloSeries.length > 3 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Diferencia total − estructural (componente cíclico)
              </p>
              <DeepLineChart
                series={[{ id: 'ciclo', label: 'Componente cíclico', color: '#7c3aed', points: cicloSeries, fillBelow: true }]}
                height={140}
                yLabel="pp PIB"
                zeroLine
                formatValue={(v: number) => `${v.toFixed(2)}pp`}
              />
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
                Valores positivos: el ciclo económico favorable está ayudando al saldo observado
                (cuidado — en recesión este colchón desaparece). Valores negativos: el ciclo está
                perjudicando las cuentas públicas (recesión o desaceleración en curso).
              </p>
            </div>
          )}
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
            Fuente · IMF DataMapper GGSB_NPGDP · Potential GDP Output Gap
          </p>
        </div>
      ),
      source: { name: 'IMF DataMapper', url: 'https://www.imf.org/external/datamapper/GGSB_NPGDP@WEO/ESP' },
    })
  }

  const openIngGastoDrill = () => {
    const diffIngGasto = ingLast && gastoLast ? ingLast.value - gastoLast.value : null
    openDrill({
      title: 'Estructura fiscal AAPP · ingresos y gasto',
      subtitle: 'IMF GGR_NGDP · GGX_NGDP · tamaño del Estado',
      accent: '#0891b2',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {[
              { label: 'Ingresos AAPP', value: ingLast?.value, color: '#16a34a', note: 'Impuestos + cotizaciones + otros. % PIB.' },
              { label: 'Gasto AAPP', value: gastoLast?.value, color: '#dc2626', note: 'Prestaciones + salarios + inversión + intereses. % PIB.' },
              {
                label: 'Diferencia (proxy saldo)',
                value: diffIngGasto,
                color: diffIngGasto != null && diffIngGasto >= 0 ? '#16a34a' : '#dc2626',
                note: 'Diferencia directa · no idéntica al saldo oficial por ajustes metodológicos.',
              },
            ].map((s, i) => (
              <div key={i} style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #bae6fd' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#075985', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</p>
                <p style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                  {s.value != null ? `${s.value.toFixed(1)}%` : '—'}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: '#0369a1', lineHeight: 1.4 }}>{s.note}</p>
              </div>
            ))}
          </div>
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 14px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              ¿Es grande el Estado español?
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#1d4ed8', lineHeight: 1.6 }}>
              El gasto público español (~{gastoLast?.value?.toFixed(0) ?? '46'}% PIB) se sitúa por debajo
              de la media de la UE-27 (~47%) y muy por debajo de Francia (~57%) o Bélgica (~55%),
              pero por encima de Irlanda (~25%) o Países Bajos (~42%). La discusión no es si el Estado
              es grande o pequeño en términos absolutos, sino la eficiencia del gasto: retorno
              social de cada euro gastado respecto a outcomes en educación, sanidad e infraestructuras.
            </p>
          </div>
          <CountryCompareBars
            indicator="GGR_NGDP"
            countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'BEL', 'IRL']}
            spainColor="#16a34a"
            unit="%"
            decimals={1}
            title="Ingresos AAPP · peers UE"
          />
          <CountryCompareBars
            indicator="GGX_NGDP"
            countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'BEL', 'IRL']}
            spainColor="#dc2626"
            unit="%"
            decimals={1}
            title="Gasto AAPP · peers UE"
          />
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
            Fuentes · IMF DataMapper GGR_NGDP · GGX_NGDP
          </p>
        </div>
      ),
      source: { name: 'IMF DataMapper', url: 'https://www.imf.org/external/datamapper/GGR_NGDP@WEO/ESP' },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a
        href="/macro/margen-fiscal"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(90deg, #faf5ff 0%, #fff7ed 100%)',
          border: '1px solid #e9d5ff',
          borderLeft: `4px solid ${tab.themeAccent}`,
          borderRadius: 10,
          padding: '12px 16px',
          color: '#0f172a',
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · /macro/margen-fiscal
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            7 indicadores fiscales IMF · deuda/saldos/ingresos/gasto con histórica 30y + forecast · lectura ejecutiva IA · drill por indicador
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard
          label="Deuda %PIB"
          value={deudaLast?.value ?? null}
          color={tab.themeAccent}
          spark={deudaSplit.hist.slice(-20).map((p) => p.value)}
          footer={deudaLast ? `IMF GGXWDG_NGDP · ${deudaLast.period}` : 'IMF GGXWDG_NGDP'}
          loading={loading}
          onClick={deudaSplit.hist.length > 1 ? openDeudaDrill : undefined}
        />
        <MacroKpiCard
          label="Saldo fiscal %PIB"
          value={saldoLast?.value ?? null}
          color="#f59e0b"
          spark={saldoSplit.hist.slice(-20).map((p) => p.value)}
          footer={saldoLast ? `IMF GGXCNL_NGDP · ${saldoLast.period}` : 'IMF GGXCNL_NGDP'}
          loading={loading}
          onClick={saldoSplit.hist.length > 1 ? openSaldoDrill : undefined}
        />
        <MacroKpiCard
          label="Saldo primario"
          value={primaryLast?.value ?? null}
          color="#10b981"
          spark={primarySplit.hist.slice(-20).map((p) => p.value)}
          footer="IMF GGXONLB_NGDP"
          loading={loading}
          onClick={primarySplit.hist.length > 1 ? openPrimaryDrill : undefined}
        />
        <MacroKpiCard
          label="Intereses (derivado)"
          value={intereses}
          color="#dc2626"
          footer="Primario − Total"
          decimals={2}
          loading={loading}
          onClick={interesesSeries.length > 3 || (tipoEfectivoLast?.value != null) ? openInteresesDrill : undefined}
        />
        {/* Sprint M9 S4 C2 · 3 KPIs nuevos · cada uno condicional al dato */}
        {structuralLast?.value != null && (
          <div title="El saldo estructural elimina el efecto del ciclo económico. Es el indicador que usa la Comisión Europea para evaluar el esfuerzo fiscal real de cada gobierno.">
            <MacroKpiCard
              label="Saldo estructural"
              value={structuralLast.value}
              unit="% PIB pot."
              color="#7c3aed"
              decimals={2}
              spark={structuralSplit.hist.slice(-15).map((p) => p.value)}
              footer={`IMF GGSB_NPGDP · ${structuralLast.period}`}
              loading={loading}
              onClick={structuralSplit.hist.length > 1 ? openStructuralDrill : undefined}
            />
          </div>
        )}
        {deudaNetaLast?.value != null && (
          <div title="Deuda bruta menos activos financieros del sector público. Más conservador que la deuda bruta. Alemania tiene deuda neta negativa (acreedor neto).">
            <MacroKpiCard
              label="Deuda neta %PIB"
              value={deudaNetaLast.value}
              unit="%"
              color="#0891b2"
              decimals={1}
              spark={deudaNetaSplit.hist.slice(-15).map((p) => p.value)}
              footer={`IMF GGXWDN_NGDP · ${deudaNetaLast.period}`}
              loading={loading}
              onClick={deudaNetaSplit.hist.length > 1 ? openDrill1('Deuda neta %PIB', 'GGXWDN_NGDP', deudaNetaSplit, undefined, '#0891b2') : undefined}
            />
          </div>
        )}
        {tipoEfectivoLast?.value != null && (
          <div title="Coste medio ponderado de toda la deuda viva. Si este tipo supera el crecimiento nominal del PIB (r > g), la deuda crece de forma autónoma aunque haya superávit primario.">
            <MacroKpiCard
              label="Tipo efectivo deuda"
              value={tipoEfectivoLast.value}
              unit="%"
              color="#dc2626"
              decimals={2}
              spark={tipoEfectivoSeries.slice(-15).map((p) => p.value!).filter((v) => v != null)}
              footer={`FRED INTGSBESP193N · ${tipoEfectivoLast.period ?? 'anual'}`}
              loading={loading}
              onClick={interesesSeries.length > 3 ? openInteresesDrill : undefined}
            />
          </div>
        )}
      </div>

      {/* Trayectoria deuda · serie 30y + forecast */}
      {deudaSplit.hist.length > 5 && (
        <MacroPanel
          accent={tab.themeAccent}
          title="Trayectoria deuda pública · 30 años + forecast"
          subtitle="IMF GGXWDG_NGDP · stock deuda Maastricht %PIB · histórica + proyección 5y"
          status="live"
          aiAnalysis={{
            indicator: 'Deuda pública %PIB · IMF GGXWDG_NGDP',
            indicatorId: 'imf.weo.ggxwdg_ngdp.esp',
            tabSlug: 'margen-fiscal',
            series: [
              ...aiSeries(deudaSplit.hist),
              ...aiSeries(deudaSplit.fc.map((p: any) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '% PIB',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'GGXWDG_NGDP',
              lastUpdate: deudaLast?.period,
              frequency: 'annual',
              threshold: { amber: 100, red: 120, goodAbove: false },
              notes: [
                'Regla Maastricht: 60% PIB.',
                '2008-2014 explosión por crisis financiera; 2020 salto COVID +20pp.',
              ],
            },
            windowLabel: `${deudaSplit.hist.length}y hist + ${deudaSplit.fc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{
              id: 'd',
              label: 'Deuda %PIB',
              color: tab.themeAccent,
              points: [...deudaSplit.hist, ...deudaSplit.fc],
              forecastFromIndex: deudaSplit.hist.length,
              fillBelow: true,
            }]}
            height={240}
            yLabel="Deuda %PIB"
            annotations={[
              { period: '2008', label: 'Crisis', color: '#dc2626' },
              { period: '2020', label: 'COVID', color: '#dc2626' },
            ]}
            formatValue={(v) => `${v.toFixed(0)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Deuda pública %PIB"
              unit="%"
              decimals={1}
              series={deudaSplit.hist as any}
              forecast={deudaSplit.fc}
              threshold={{ amber: 100, red: 120, goodAbove: false }}
              accent={tab.themeAccent}
            />
          </div>
        </MacroPanel>
      )}

      {/* Saldo descompuesto · primary vs total · area chart */}
      {saldoSplit.hist.length > 5 && primarySplit.hist.length > 5 && (
        <MacroPanel
          accent="#f59e0b"
          title="Saldo fiscal · descompuesto"
          subtitle="Saldo total vs Saldo primario · intereses = diferencia · regla Maastricht 3%"
          status="live"
          aiAnalysis={{
            indicator: 'Saldo fiscal · IMF GGXCNL_NGDP',
            indicatorId: 'imf.weo.ggxcnl_ngdp.esp',
            tabSlug: 'margen-fiscal',
            series: [
              ...aiSeries(saldoSplit.hist),
              ...aiSeries(saldoSplit.fc.map((p: any) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '% PIB',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'GGXCNL_NGDP',
              lastUpdate: saldoLast?.period,
              frequency: 'annual',
              threshold: { amber: -3, red: -6, goodAbove: true },
              notes: [
                `Saldo primario último (GGXONLB_NGDP): ${primaryLast?.value?.toFixed?.(2) ?? '?'}% en ${primaryLast?.period ?? '?'}.`,
                `Intereses derivados (primario − total): ${intereses?.toFixed?.(2) ?? '?'}% PIB.`,
                'Regla Maastricht: déficit máximo 3% PIB.',
              ],
            },
            windowLabel: `${saldoSplit.hist.length}y hist + ${saldoSplit.fc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 's', label: 'Saldo total (GGXCNL_NGDP)', color: '#f59e0b', points: [...saldoSplit.hist, ...saldoSplit.fc], forecastFromIndex: saldoSplit.hist.length, fillBelow: true },
              { id: 'p', label: 'Saldo primario (GGXONLB_NGDP)', color: '#10b981', points: [...primarySplit.hist, ...primarySplit.fc], forecastFromIndex: primarySplit.hist.length },
            ]}
            height={240}
            yLabel="% PIB"
            zeroLine
            annotations={[
              { period: '2008', label: '−11% pico crisis', color: '#dc2626' },
            ]}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Saldo fiscal total"
              unit="%"
              decimals={2}
              series={saldoSplit.hist as any}
              forecast={saldoSplit.fc}
              threshold={{ amber: -3, red: -6, goodAbove: true }}
              accent="#f59e0b"
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 S4 C4 · Saldo estructural · indicador que usa la Comisión Europea (PDE) */}
      {structuralSplit.hist.length > 5 && (
        <MacroPanel
          accent="#7c3aed"
          title="Saldo estructural · posición fiscal ajustada"
          subtitle="IMF GGSB_NPGDP · elimina efecto cíclico · el indicador que usa Bruselas"
          status="live"
          aiAnalysis={{
            indicator: 'Saldo estructural · IMF GGSB_NPGDP',
            indicatorId: 'imf.weo.ggsb_npgdp.esp',
            tabSlug: 'margen-fiscal',
            series: [
              ...aiSeries(structuralSplit.hist),
              ...aiSeries(structuralSplit.fc.map((p: { period: string; value: number }) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '% PIB potencial',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'GGSB_NPGDP',
              lastUpdate: structuralLast?.period,
              frequency: 'annual',
              threshold: { amber: -1, red: -3, goodAbove: true },
              notes: [
                'Ajustado por output gap (brecha producción vs potencial).',
                'Un saldo estructural negativo implica déficit incluso en pleno empleo.',
                'La Comisión Europea lo usa para el Procedimiento de Déficit Excesivo.',
                `Último estructural: ${structuralLast?.value?.toFixed(2) ?? '?'}% PIB potencial.`,
                `Saldo total comparable: ${saldoLast?.value?.toFixed(2) ?? '?'}% PIB.`,
              ],
            },
            windowLabel: `${structuralSplit.hist.length}y hist + ${structuralSplit.fc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              {
                id: 'struct',
                label: 'Saldo estructural',
                color: '#7c3aed',
                points: [...structuralSplit.hist, ...structuralSplit.fc],
                forecastFromIndex: structuralSplit.hist.length,
                fillBelow: true,
              },
              {
                id: 'total',
                label: 'Saldo total (ref)',
                color: '#f59e0b',
                points: saldoSplit.hist,
                dashed: true,
              },
            ]}
            height={220}
            yLabel="% PIB pot."
            zeroLine
            annotations={[{ period: '2010', label: 'Corte con total', color: '#7c3aed' }]}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Saldo estructural"
              unit="%"
              decimals={2}
              series={structuralSplit.hist}
              forecast={structuralSplit.fc}
              threshold={{ amber: -1, red: -3, goodAbove: true }}
              accent="#7c3aed"
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 S4 C5 · Dinámica de la deuda · efecto bola de nieve (r − g) */}
      {tipoEfectivoSeries.length > 3 && deudaLast?.value != null && (() => {
        // Serie referencia g=4% al mismo periodo del tipo efectivo para visualización comparada
        const gReferenceSeries = tipoEfectivoSeries.map((p) => ({ period: p.period, value: gNominal }))
        return (
          <MacroPanel
            accent="#dc2626"
            title="Dinámica de la deuda · efecto bola de nieve"
            subtitle="Tipo efectivo medio vs crecimiento PIB · sostenibilidad automática"
            status="live"
            aiAnalysis={{
              indicator: 'Efecto bola de nieve r − g · FRED INTGSBESP193N',
              indicatorId: 'fred.intgsbesp193n.snowball',
              tabSlug: 'margen-fiscal',
              series: aiSeries(tipoEfectivoSeries),
              metadata: {
                unit: '%',
                source: 'FRED St. Louis · OECD',
                sourceCode: 'INTGSBESP193N',
                lastUpdate: tipoEfectivoLast?.period,
                frequency: 'annual',
                notes: [
                  `Tipo efectivo actual: ${rEfectivo?.toFixed(2) ?? '?'}%.`,
                  `Crecimiento nominal estimado: ${gNominal.toFixed(1)}% (proxy · pendiente FRED real).`,
                  `r − g: ${rMinusG != null ? `${rMinusG > 0 ? '+' : ''}${rMinusG.toFixed(2)}pp` : '—'}.`,
                  `Deuda actual: ${deudaLast?.value?.toFixed(0) ?? '?'}% PIB.`,
                  autoDebtAnnual != null
                    ? `Acumulación autónoma estimada: ${autoDebtAnnual > 0 ? '+' : ''}${autoDebtAnnual.toFixed(2)}pp PIB/año.`
                    : 'Acumulación autónoma: sin dato.',
                ],
              },
              windowLabel: `${tipoEfectivoSeries.length}y tipo efectivo`,
            } as ChartAnalysisInput}
          >
            <DeepLineChart
              series={[
                { id: 'r', label: 'Tipo efectivo (r)', color: '#dc2626', points: tipoEfectivoSeries, fillBelow: true },
                { id: 'g', label: `Crec. nominal est. (g=${gNominal.toFixed(1)}%)`, color: '#16a34a', points: gReferenceSeries, dashed: true },
              ]}
              height={180}
              yLabel="%"
              formatValue={(v) => `${v.toFixed(2)}%`}
            />
            {rEfectivo != null && rMinusG != null && autoDebtAnnual != null && (
              <div
                style={{
                  marginTop: 10,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 10,
                }}
              >
                {[
                  { label: 'r (tipo efectivo)', value: `${rEfectivo.toFixed(2)}%`, color: '#dc2626' },
                  { label: 'g (crec. nominal est.)', value: `${gNominal.toFixed(1)}%`, color: '#16a34a' },
                  {
                    label: 'r − g',
                    value: `${rMinusG > 0 ? '+' : ''}${rMinusG.toFixed(2)}pp`,
                    color: rMinusG > 0 ? '#dc2626' : '#16a34a',
                  },
                  { label: 'Deuda actual', value: `${deudaLast.value.toFixed(0)}%`, color: '#64748b' },
                  {
                    label: 'Acumulación autónoma anual',
                    value: `${autoDebtAnnual > 0 ? '+' : ''}${autoDebtAnnual.toFixed(2)}pp PIB`,
                    color: autoDebtAnnual > 0 ? '#dc2626' : '#16a34a',
                  },
                  {
                    label: 'Superávit primario necesario',
                    value: rMinusG > 0 ? `+${((rMinusG * deudaLast.value) / 100).toFixed(2)}%` : 'No requerido',
                    color: rMinusG > 0 ? '#f59e0b' : '#16a34a',
                  },
                ].map((item, i) => (
                  <div key={i} style={{ background: '#fef2f2', borderRadius: 6, padding: '8px 10px', border: '1px solid #fecaca' }}>
                    <p style={{ margin: 0, fontSize: 10, color: '#9f1239', textTransform: 'uppercase', fontWeight: 700 }}>
                      {item.label}
                    </p>
                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: 16,
                        fontWeight: 700,
                        color: item.color,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
              <strong>r &gt; g</strong>: el coste de la deuda supera el crecimiento → la deuda crece
              automáticamente aunque el gobierno no gaste de más. Para estabilizar la ratio deuda/PIB,
              el gobierno necesita generar un superávit primario igual a (r−g)×d. Esto limita el
              espacio para bajadas de impuestos o expansión del gasto.
            </p>
            <div style={{ marginTop: 12 }}>
              <TrendNarrative
                label="Tipo efectivo deuda"
                unit="%"
                decimals={2}
                series={tipoEfectivoSeries as any}
                accent="#dc2626"
              />
            </div>
          </MacroPanel>
        )
      })()}

      {/* Ingresos vs Gasto · serie */}
      {ingresosSplit.hist.length > 5 && gastoSplit.hist.length > 5 && (
        <MacroPanel
          accent="#0891b2"
          title="Ingresos vs Gasto AAPP"
          subtitle="Tamaño Estado %PIB · GGR_NGDP vs GGX_NGDP"
          status="live"
          aiAnalysis={{
            indicator: 'Ingresos AAPP %PIB · IMF GGR_NGDP',
            indicatorId: 'imf.weo.ggr_ngdp.esp',
            tabSlug: 'margen-fiscal',
            series: [
              ...aiSeries(ingresosSplit.hist),
              ...aiSeries(ingresosSplit.fc.map((p: any) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '% PIB',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'GGR_NGDP',
              lastUpdate: ingLast?.period,
              frequency: 'annual',
              notes: [
                `Gasto AAPP (GGX_NGDP) último: ${gastoLast?.value?.toFixed?.(2) ?? '?'}% en ${gastoLast?.period ?? '?'}.`,
                `Diferencia ingresos − gasto = ${ingLast && gastoLast ? (ingLast.value - gastoLast.value).toFixed(2) : '?'}pp PIB (proxy saldo).`,
              ],
            },
            windowLabel: `${ingresosSplit.hist.length}y hist + ${ingresosSplit.fc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'r', label: 'Ingresos (GGR_NGDP)', color: '#16a34a', points: [...ingresosSplit.hist, ...ingresosSplit.fc], forecastFromIndex: ingresosSplit.hist.length },
              { id: 'x', label: 'Gasto (GGX_NGDP)', color: '#dc2626', points: [...gastoSplit.hist, ...gastoSplit.fc], forecastFromIndex: gastoSplit.hist.length },
            ]}
            height={220}
            yLabel="% PIB"
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Ingresos AAPP"
              unit="%"
              decimals={2}
              series={ingresosSplit.hist as any}
              forecast={ingresosSplit.fc}
              accent="#0891b2"
            />
          </div>
          {/* Sprint M9 S4 C3 · botón para abrir drill completo (MacroPanel no acepta onClick) */}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={openIngGastoDrill}
              type="button"
              style={{
                fontSize: 11,
                padding: '6px 12px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 6,
                color: '#1e40af',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              Ver análisis completo →
            </button>
          </div>
        </MacroPanel>
      )}

      {/* Comparativa peers UE */}
      <MacroPanel accent="#7c3aed" title="Deuda pública · España vs peers UE" subtitle="IMF GGXWDG_NGDP · último año disponible" status="live">
        <CountryCompareBars
          indicator="GGXWDG_NGDP"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC', 'BEL', 'AUT']}
          spainColor={tab.themeAccent}
          unit="%"
          decimals={1}
        />
      </MacroPanel>

      <MacroPanel accent="#7c3aed" title="Saldo fiscal · España vs peers UE" subtitle="IMF GGXCNL_NGDP · último año disponible" status="live">
        <CountryCompareBars
          indicator="GGXCNL_NGDP"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC']}
          spainColor="#f59e0b"
          unit="%"
          decimals={2}
        />
      </MacroPanel>

      {/* Sprint M9 S4 C6 · 2 CountryCompareBars adicionales (primario + estructural peers UE) */}
      <MacroPanel
        accent="#10b981"
        title="Saldo primario · España vs peers UE"
        subtitle="IMF GGXONLB_NGDP · esfuerzo fiscal real excluyendo intereses"
        status="live"
      >
        <CountryCompareBars
          indicator="GGXONLB_NGDP"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC', 'BEL', 'POL']}
          spainColor="#10b981"
          unit="%"
          decimals={2}
          title="Saldo primario peers UE"
        />
      </MacroPanel>

      <MacroPanel
        accent="#7c3aed"
        title="Saldo estructural · España vs peers UE"
        subtitle="IMF GGSB_NPGDP · posición fiscal ajustada por ciclo · indicador PDE"
        status="live"
      >
        <CountryCompareBars
          indicator="GGSB_NPGDP"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC', 'BEL']}
          spainColor="#7c3aed"
          unit="%"
          decimals={2}
          title="Saldo estructural peers UE"
        />
      </MacroPanel>
    </div>
  )
}

export default MargenFiscalTab
