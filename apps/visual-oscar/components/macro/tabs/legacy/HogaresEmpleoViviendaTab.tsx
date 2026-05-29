'use client'
/**
 * `<HogaresEmpleoViviendaTab />` · Tab 10 · Hogares, empleo, vivienda PROFUNDO.
 *
 * Fuentes vivas:
 *  - INE EPA86913 paro general + breakdown edad
 *  - INE IPV tabla 76201 (precio vivienda)
 *  - INE ETCL coste laboral
 *  - IMF LUR paro % activos
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { DeepLineChart } from '../DeepLineChart'
import { TrendNarrative } from '../TrendNarrative'
import { CountryCompareBars } from '../CountryCompareBars'
import { IndicatorDrill } from '../IndicatorDrill'
import { EncuestaConsumoPanel } from '../EncuestaConsumoPanel'
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

// Sprint M9 S5 · shape común a FRED · Alpha Vantage · NewsAPI (newest-first natural)
interface FredSeriesResponse {
  ok: boolean
  series: { period: string; value: number | null }[]
  last?: { period: string; value: number | null }
}

export function HogaresEmpleoViviendaTab() {
  const tab = getTab('hogares-empleo-vivienda')
  const { openDrill } = useMacroDrawer()
  const [epa, setEpa] = useState<any>(null)
  const [ipv, setIpv] = useState<any>(null)
  const [etcl, setEtcl] = useState<any>(null)
  const [imfUnemp, setImfUnemp] = useState<any>(null)
  // Sprint M9 S5 · 10 estados nuevos (todos pueden ser null sin romper render)
  const [fredParo, setFredParo] = useState<FredSeriesResponse | null>(null)         // LRHUTTTTESM156S
  const [, setHorasTrab] = useState<FredSeriesResponse | null>(null)                // ESPATOTLWHPN (reservado)
  const [ulc, setUlc] = useState<FredSeriesResponse | null>(null)                   // LCEATT02ESQ661S
  const [ipcFred, setIpcFred] = useState<FredSeriesResponse | null>(null)           // CPALTT01ESM659N
  const [remuneracion, setRemuneracion] = useState<FredSeriesResponse | null>(null) // LCEATT01ESQ660S
  const [epaBreakdown, setEpaBreakdown] = useState<any>(null)                       // INE EPA por sector/sexo/CCAA
  const [afiliados, setAfiliados] = useState<any>(null)                             // TGSS afiliados SS
  const [productividad, setProductividad] = useState<FredSeriesResponse | null>(null) // NAEXKP01ESQ657S
  const [, setImfEmpleo] = useState<any>(null)                                      // IMF LE (reservado)
  const [newsEmpleo, setNewsEmpleo] = useState<any>(null)                           // NewsAPI
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/ine/epa?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/ipv?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/etcl?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=LUR', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      // Sprint M9 S5 · 10 fuentes nuevas. Spec marca alpha-vantage EUR/USD como ignorable → omitido.
      // Patrón: si endpoint 404/error → catch → null → panel/drill no se renderiza.
      fetch('/api/fred/series?id=LRHUTTTTESM156S&n=60', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // paro mensual harmonizado
      fetch('/api/fred/series?id=ESPATOTLWHPN&n=48', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),    // horas trabajadas (reservado)
      fetch('/api/fred/series?id=LCEATT02ESQ661S&n=32', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // ULC trimestral
      fetch('/api/fred/series?id=CPALTT01ESM659N&n=60', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // IPC mensual (para salario real)
      fetch('/api/fred/series?id=LCEATT01ESQ660S&n=32', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // remuneración/asalariado
      fetch('/api/ine/epa-breakdown?n=16', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),              // EPA por sector/sexo/CCAA
      fetch('/api/ine/afiliados-ss?n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),               // TGSS afiliados
      fetch('/api/fred/series?id=NAEXKP01ESQ657S&n=32', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // PIB/ocupado productividad
      fetch('/api/imf/country?iso=ESP&indicator=LE', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),    // empleo IMF (reservado)
      fetch('/api/newsapi/headlines?q=empleo+paro+España&n=5', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // noticias
    ]).then(([e, i, et, u, fp, ht, ul, ic, rem, eb, af, pr, ie, nw]) => {
      if (!alive) return
      setEpa(e); setIpv(i); setEtcl(et); setImfUnemp(u)
      setFredParo(fp); setHorasTrab(ht); setUlc(ul); setIpcFred(ic); setRemuneracion(rem)
      setEpaBreakdown(eb); setAfiliados(af); setProductividad(pr); setImfEmpleo(ie); setNewsEmpleo(nw)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const rev = (pts: any[] = []) => pts.slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const epaGeneralSeries = rev(epa?.general?.points)
  const epaJovenesSeries = rev(epa?.menores_25?.points)
  const epaGeneralLast = epa?.general?.points?.[0]
  const epaJovenesLast = epa?.menores_25?.points?.[0]
  const ipvGeneralSeries = rev(ipv?.general?.points)
  const ipvNuevaSeries = rev(ipv?.nueva?.points)
  const ipvSegundaSeries = rev(ipv?.segunda?.points)
  const ipvLast = ipv?.general?.points?.[0]
  const etclSeries = rev(etcl?.total?.points)
  const etclLast = etcl?.total?.points?.[0]

  const cy = new Date().getFullYear()
  const imfHist = (imfUnemp?.series || []).filter((s: any) => s.value != null && s.year <= cy).map((s: any) => ({ period: String(s.year), value: s.value }))
  const imfFc = (imfUnemp?.series || []).filter((s: any) => s.value != null && s.year > cy).map((s: any) => ({ period: String(s.year), value: s.value }))

  // Sprint M9 S5 · helpers + series cronológicas FRED (newest-first natural → revert)
  const fredSeriesChrono = (r?: FredSeriesResponse | null) =>
    (r?.series || []).slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const fredParoSeries = fredSeriesChrono(fredParo)
  const ulcSeries = fredSeriesChrono(ulc)
  const ipcFredSeries = fredSeriesChrono(ipcFred)
  const remuneracionSeries = fredSeriesChrono(remuneracion)
  const productividadSeries = fredSeriesChrono(productividad)
  const fredParoLast = fredParo?.last ?? fredParoSeries[fredParoSeries.length - 1]
  const ulcLast = ulc?.last ?? ulcSeries[ulcSeries.length - 1]
  const remuneracionLast = remuneracion?.last ?? remuneracionSeries[remuneracionSeries.length - 1]

  // Salario real (calculado FUERA del JSX para poder usarlo en aiAnalysis del panel)
  // Real = (remuneración nominal / IPC) × IPC_base, donde IPC_base es el IPC más reciente disponible.
  // Eso reescala todas las observaciones a precios "de hoy" → un valor real más alto en el pasado
  // significa que entonces los trabajadores tenían más poder adquisitivo equivalente al presente.
  const salarioRealSeries: { period: string; value: number }[] = (() => {
    if (!remuneracionSeries.length || !ipcFredSeries.length) return []
    const ipcMap: Record<string, number> = {}
    ipcFredSeries.forEach((p) => {
      if (p.value != null && Number.isFinite(p.value)) ipcMap[p.period] = p.value
    })
    // IPC base = último IPC disponible (más reciente) · si serie es cronológica, el último elemento
    const ipcBase = ipcFredSeries[ipcFredSeries.length - 1]?.value ?? 100
    if (!ipcBase) return []
    return remuneracionSeries
      .map((p) => {
        // Buscar IPC del mismo period o del mes truncado YYYY-MM si la freq difiere
        const periodKey = p.period
        const truncKey = periodKey ? periodKey.slice(0, 7) : ''
        const ipcVal = ipcMap[periodKey] ?? ipcMap[truncKey]
        if (ipcVal == null || p.value == null) return null
        return { period: periodKey, value: (p.value / ipcVal) * ipcBase }
      })
      .filter((x): x is { period: string; value: number } => x != null)
  })()
  const salarioRealLast = salarioRealSeries[salarioRealSeries.length - 1]

  // Sprint M9 S5 C3 · openEpaDrill enriquecido (mantenemos la firma) ·
  // tres medidas paro + breakdown edad/sexo (si epaBreakdown disponible) + contexto NAIRU.
  const openEpaDrill = () => {
    const sepeReg = (afiliados as any)?.sepe_registered ?? null
    const tresMedidas = [
      {
        label: 'EPA (INE)',
        value: epaGeneralLast?.value,
        freq: 'Trimestral',
        metodo: 'Encuesta hogares ~65k. Estándar OIT. Referencia política.',
        color: tab.themeAccent,
      },
      {
        label: 'Harmonizada (FRED)',
        value: fredParoLast?.value,
        freq: 'Mensual',
        metodo: 'OECD/Eurostat harmonized. Comparable internacionalmente. Más reciente.',
        color: '#f59e0b',
      },
      {
        label: 'Paro registrado SEPE',
        value: sepeReg,
        freq: 'Mensual',
        metodo: 'Solo desempleados inscritos en oficinas de empleo. Subestima paro real.',
        color: '#64748b',
      },
    ]
    openDrill({
      title: 'EPA · Tasa de paro · análisis completo',
      subtitle: 'INE EPA86913 · trimestral + IMF LUR anual + FRED mensual',
      accent: tab.themeAccent,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <IndicatorDrill
            label="Tasa paro general"
            unit="%"
            decimals={2}
            series={epaGeneralSeries}
            sourceCode="EPA86913"
            sourceName="INE EPA"
            imfCompareIndicator="LUR"
            threshold={{ amber: 12, red: 18, goodAbove: false }}
            accent={tab.themeAccent}
          />
          <div style={{ background: '#fafafa', borderRadius: 8, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Tres medidas del paro · mismo fenómeno, distintas metodologías
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {tresMedidas.map((m, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 6, padding: '10px 12px', border: `1px solid ${m.color}30` }}>
                  <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{m.label}</p>
                  <p style={{ margin: '4px 0 2px', fontSize: 20, fontWeight: 700, color: m.color, fontVariantNumeric: 'tabular-nums' }}>
                    {m.value != null ? `${m.value.toFixed(1)}%` : '—'}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>{m.freq}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>{m.metodo}</p>
                </div>
              ))}
            </div>
          </div>
          {Array.isArray(epaBreakdown?.edad) && epaBreakdown.edad.length > 0 && (
            <div style={{ background: '#fff7ed', borderRadius: 8, padding: '12px 14px', border: '1px solid #fed7aa' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Paro por grupos de edad · último trimestre
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {epaBreakdown.edad.map((g: { label: string; value: number | null }, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#78350f', width: 100, flexShrink: 0 }}>{g.label}</span>
                    <div style={{ flex: 1, background: '#fed7aa', borderRadius: 4, height: 8 }}>
                      <div
                        style={{
                          width: `${Math.min((g.value ?? 0) * 2.5, 100)}%`,
                          height: '100%',
                          background: (g.value ?? 0) > 20 ? '#dc2626' : (g.value ?? 0) > 12 ? '#f59e0b' : '#16a34a',
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#92400e',
                        fontVariantNumeric: 'tabular-nums',
                        width: 50,
                        textAlign: 'right',
                      }}
                    >
                      {g.value != null ? `${g.value.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(epaBreakdown?.sexo) && epaBreakdown.sexo.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              {epaBreakdown.sexo.map((s: { label: string; value: number | null }, i: number) => (
                <div
                  key={i}
                  style={{
                    background: i === 0 ? '#eff6ff' : '#fdf4ff',
                    borderRadius: 8,
                    padding: '10px 14px',
                    border: `1px solid ${i === 0 ? '#bfdbfe' : '#e9d5ff'}`,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 10, color: i === 0 ? '#1e40af' : '#6d28d9', fontWeight: 700, textTransform: 'uppercase' }}>
                    {s.label}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 22,
                      fontWeight: 700,
                      color: i === 0 ? '#2563eb' : '#7c3aed',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.value != null ? `${s.value.toFixed(1)}%` : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 14px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              ¿Cuánto paro es "normal" para España?
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#166534', lineHeight: 1.6 }}>
              La NAIRU (Non-Accelerating Inflation Rate of Unemployment) de España se estima en
              ~11-13%, muy superior a la media UE (~6-7%). Esto significa que reducir el paro por
              debajo de ese umbral genera presiones inflacionistas. El alto paro estructural español
              refleja rigideces del mercado laboral, dualidad temporal/fijo y desajuste
              formación-empleo, no solo el ciclo económico.
            </p>
          </div>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
            Fuentes · INE EPA · FRED LRHUTTTTESM156S · IMF LUR
          </p>
        </div>
      ),
      source: { name: 'INE EPA', url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=4247' },
    })
  }

  // Sprint M9 S5 C4 · 3 drills nuevos (Afiliados SS · ULC · Salario real)
  const openAfiliadosDrill = () => {
    const last = afiliados?.last as { period?: string; value?: number } | undefined
    const mom = afiliados?.mom as number | undefined
    const yoy = afiliados?.yoy as number | undefined
    const regimenes = afiliados?.regimenes as Array<{ label: string; value: number; share_pct?: number }> | undefined
    openDrill({
      title: 'Afiliados Seguridad Social · indicador líder del empleo',
      subtitle: 'TGSS · mensual · 36 meses',
      accent: '#10b981',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.isArray(afiliados?.series) && afiliados.series.length > 3 && (
            <DeepLineChart
              series={[{ id: 'afil', label: 'Afiliados SS (M)', color: '#10b981', points: afiliados.series, fillBelow: true }]}
              height={180}
              yLabel="Millones"
              formatValue={(v: number) => `${v.toFixed(2)}M`}
            />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {[
              {
                label: 'Nivel actual',
                value: last?.value != null ? `${last.value.toFixed(2)}M` : '—',
                color: '#10b981',
                note: 'Afiliados activos último mes disponible',
              },
              {
                label: 'Variación mensual',
                value: mom != null ? `${mom > 0 ? '+' : ''}${(mom / 1000).toFixed(0)}K` : '—',
                color: mom != null && mom >= 0 ? '#16a34a' : '#dc2626',
                note: 'Var. vs mes anterior',
              },
              {
                label: 'Variación anual',
                value: yoy != null ? `${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%` : '—',
                color: yoy != null && yoy >= 0 ? '#16a34a' : '#dc2626',
                note: 'Var. vs mismo mes año anterior',
              },
            ].map((s, i) => (
              <div key={i} style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', border: '1px solid #86efac' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</p>
                <p style={{ margin: '4px 0 2px', fontSize: 18, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                  {s.value}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: '#4ade80' }}>{s.note}</p>
              </div>
            ))}
          </div>
          {Array.isArray(regimenes) && regimenes.length > 0 && (
            <div style={{ background: '#fafafa', borderRadius: 8, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Por régimen de afiliación
              </p>
              {regimenes.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 11, color: '#374151' }}>{r.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                    {(r.value / 1e6).toFixed(2)}M{r.share_pct != null ? ` (${r.share_pct.toFixed(1)}%)` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '12px 14px', border: '1px solid #a7f3d0' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Por qué importa más que el paro
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#047857', lineHeight: 1.6 }}>
              Los afiliados SS se publican el día 2 del mes siguiente, con solo 2 semanas de desfase.
              La EPA tarda hasta 6 semanas. Los afiliados capturan tendencias intra-trimestre antes
              que ningún otro indicador oficial. Una caída de afiliados no captada por la EPA
              anticipa un empeoramiento que saldrá en la siguiente encuesta.
            </p>
          </div>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
            Fuente · TGSS Ministerio de Inclusión · Seguridad Social
          </p>
        </div>
      ),
      source: {
        name: 'TGSS · Seguridad Social',
        url: 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas',
      },
    })
  }

  const openUlcDrill = () => {
    openDrill({
      title: 'Coste Laboral Unitario · competitividad-coste España',
      subtitle: 'FRED LCEATT02ESQ661S · trimestral · variación interanual',
      accent: '#f97316',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ulcSeries.length > 3 && (
            <DeepLineChart
              series={[{ id: 'ulc', label: 'ULC var YoY %', color: '#f97316', points: ulcSeries, fillBelow: true }]}
              height={160}
              yLabel="%"
              zeroLine
              formatValue={(v: number) => `${v.toFixed(2)}%`}
            />
          )}
          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '12px 14px', border: '1px solid #fed7aa' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              ULC y la competitividad de España
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#78350f', lineHeight: 1.6 }}>
              España perdió competitividad-coste entre 2000-2008 por ULC muy superior a Alemania.
              La devaluación interna 2010-2014 (bajada de salarios reales) recuperó esa brecha.
              Desde 2022, la subida del SMI y los convenios colectivos están presionando el ULC al alza.
              Si el ULC sube más que en los peers europeos, las exportaciones españolas se encarecen.
            </p>
          </div>
          {remuneracionSeries.length > 3 && productividadSeries.length > 3 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Componentes: remuneración vs productividad
              </p>
              <DeepLineChart
                series={[
                  { id: 'rem', label: 'Remuneración/asalariado (var)', color: '#f97316', points: remuneracionSeries },
                  { id: 'prod', label: 'Productividad/ocupado (var)', color: '#16a34a', points: productividadSeries, dashed: true },
                ]}
                height={160}
                yLabel="%"
                zeroLine
                formatValue={(v: number) => `${v.toFixed(2)}%`}
              />
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
                Cuando la barra naranja (remuneración) supera consistentemente a la verde (productividad),
                el ULC aumenta y la competitividad se deteriora. La clave es que las subidas salariales
                estén respaldadas por ganancias de productividad equivalentes.
              </p>
            </div>
          )}
          <CountryCompareBars
            indicator="LCEATT02"
            countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'POL']}
            spainColor="#f97316"
            unit="%"
            decimals={2}
            title="ULC variación · peers UE (si disponible IMF)"
          />
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
            Fuentes · FRED LCEATT02ESQ661S · LCEATT01ESQ660S · NAEXKP01ESQ657S
          </p>
        </div>
      ),
      source: { name: 'FRED · St. Louis Fed', url: 'https://fred.stlouisfed.org/series/LCEATT02ESQ661S' },
    })
  }

  const openSalarioRealDrill = () => {
    openDrill({
      title: 'Salario real · poder adquisitivo del trabajador',
      subtitle: 'Remuneración/asalariado deflactada por IPC · FRED',
      accent: '#7c3aed',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {salarioRealSeries.length > 3 ? (
            <div>
              <DeepLineChart
                series={[
                  { id: 'real', label: 'Salario real (índice)', color: '#7c3aed', points: salarioRealSeries, fillBelow: true },
                  { id: 'nom', label: 'Salario nominal (índice)', color: '#f97316', points: remuneracionSeries, dashed: true },
                ]}
                height={180}
                yLabel="Índice"
                formatValue={(v: number) => v.toFixed(1)}
              />
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
                El salario real (púrpura) muestra el poder adquisitivo real. Cuando diverge hacia
                abajo del nominal (naranja), los trabajadores ganan más en términos de papel pero
                compran menos. Los episodios de alta inflación 2022-2023 comprimieron el salario real
                aunque los salarios nominales subían.
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#64748b' }}>Datos insuficientes para calcular salario real.</p>
          )}
          <div style={{ background: '#faf5ff', borderRadius: 8, padding: '12px 14px', border: '1px solid #e9d5ff' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Salario nominal vs real · la trampa de la inflación
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#5b21b6', lineHeight: 1.6 }}>
              Los trabajadores perciben el salario nominal. Los economistas y los políticos deben
              usar el real. Una subida del SMI del 10% con inflación del 8% es una mejora real del 2%.
              Una congelación salarial con inflación del 6% es una bajada real del 6%. El debate sobre
              el SMI solo tiene sentido si se compara con la inflación del período.
            </p>
          </div>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
            Fuentes · FRED LCEATT01ESQ660S (remuneración) · CPALTT01ESM659N (IPC) · cálculo Politeia
          </p>
        </div>
      ),
      source: { name: 'FRED · St. Louis Fed', url: 'https://fred.stlouisfed.org/series/LCEATT01ESQ660S' },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <a
        href="/macro/hogares-empleo-vivienda"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(90deg, #faf5ff 0%, #fef2f2 100%)',
          border: '1px solid #e9d5ff', borderLeft: `4px solid ${tab.themeAccent}`,
          borderRadius: 10, padding: '12px 16px', color: '#0f172a', textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · /macro/hogares-empleo-vivienda
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            Score de presión hogares · EPA · IPC · vivienda · hipotecas · coste laboral · análisis IA Groq por gráfica
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {epaGeneralLast && (
          <MacroKpiCard
            label="Tasa paro general"
            value={epaGeneralLast.value}
            color={tab.themeAccent}
            spark={epaGeneralSeries.slice(-12).map((p: any) => p.value).filter((v: any) => v != null)}
            footer={`INE EPA86913 · ${epaGeneralLast.period}`}
            onClick={epaGeneralSeries.length > 1 ? openEpaDrill : undefined}
            loading={loading}
          />
        )}
        {epaJovenesLast && (
          <MacroKpiCard
            label="Paro juvenil <25"
            value={epaJovenesLast.value}
            color="#dc2626"
            spark={epaJovenesSeries.slice(-12).map((p: any) => p.value).filter((v: any) => v != null)}
            footer={`INE EPA86912 · ${epaJovenesLast.period}`}
            loading={loading}
          />
        )}
        {ipvLast && (
          <MacroKpiCard
            label="IPV vivienda"
            value={ipvLast.value}
            unit=""
            color="#16a34a"
            spark={ipvGeneralSeries.slice(-12).map((p: any) => p.value).filter((v: any) => v != null)}
            decimals={1}
            footer={`INE IPV · ${ipvLast.period} · base 2015`}
            loading={loading}
          />
        )}
        {etclLast && (
          <MacroKpiCard
            label="Coste laboral / mes"
            value={etclLast.value}
            unit=" €"
            color="#7c3aed"
            decimals={0}
            footer={`INE ETCL · ${etclLast.period}`}
            loading={loading}
          />
        )}
        {/* Sprint M9 S5 C2 · 4 KPIs nuevos · cada uno condicional al dato */}
        {afiliados?.last?.value != null && (
          <div title="Los afiliados a la Seguridad Social son el indicador de empleo más inmediato de España. Se publica mensualmente con solo 2 semanas de desfase. Un afiliado más = un cotizante más. Es el proxy más rápido del ciclo laboral antes de que salga la EPA (trimestral).">
            <MacroKpiCard
              label="Afiliados SS"
              value={afiliados.last.value}
              unit=" M"
              color="#10b981"
              decimals={2}
              spark={Array.isArray(afiliados?.series)
                ? afiliados.series.slice(-24).map((p: { value: number | null }) => p.value).filter((v: number | null): v is number => v != null)
                : undefined}
              footer={`TGSS · ${afiliados.last.period ?? 'mensual'}`}
              loading={loading}
              onClick={Array.isArray(afiliados?.series) && afiliados.series.length > 3 ? openAfiliadosDrill : undefined}
            />
          </div>
        )}
        {fredParoLast?.value != null && (
          <div title="Tasa de paro mensual harmonizada (OECD/Eurostat). Más reciente que la EPA trimestral. Útil para detectar tendencias intra-trimestre antes de que salga la encuesta oficial.">
            <MacroKpiCard
              label="Paro mensual FRED"
              value={fredParoLast.value}
              unit="%"
              color={tab.themeAccent}
              decimals={1}
              spark={fredParoSeries.slice(-24).map((p) => p.value!).filter((v) => v != null)}
              footer={`FRED LRHUTTTTESM156S · ${fredParoLast.period ?? 'mensual'}`}
              loading={loading}
            />
          </div>
        )}
        {salarioRealLast?.value != null && (
          <div title="El salario real mide el poder adquisitivo efectivo. Si el salario nominal sube un 3% pero el IPC sube un 4%, el salario real cae un 1%. Este indicador es más relevante para el bienestar del hogar que el salario nominal.">
            <MacroKpiCard
              label="Salario real (estimado)"
              value={salarioRealLast.value}
              unit=" índice"
              color="#7c3aed"
              decimals={1}
              spark={salarioRealSeries.slice(-12).map((p) => p.value)}
              footer="Remuneración/asalariado deflactada por IPC · FRED"
              loading={loading}
              onClick={salarioRealSeries.length > 3 ? openSalarioRealDrill : undefined}
            />
          </div>
        )}
        {ulcLast?.value != null && (
          <div title="El Coste Laboral Unitario mide cuánto cuesta producir una unidad de output con trabajo. Si los salarios suben más que la productividad, el ULC aumenta y la competitividad-coste se deteriora. Es el indicador que sigue el BCE para evaluar presiones inflacionistas salariales.">
            <MacroKpiCard
              label="Coste Lab. Unit. (ULC)"
              value={ulcLast.value}
              unit="%"
              color="#f97316"
              decimals={2}
              spark={ulcSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
              footer={`FRED LCEATT02ESQ661S · ${ulcLast.period ?? 'var YoY'}`}
              loading={loading}
              onClick={ulcSeries.length > 3 ? openUlcDrill : undefined}
            />
          </div>
        )}
      </div>

      {/* Sprint M9 S5 C5 · Afiliados SS · indicador líder del empleo (TGSS · 36m) */}
      {Array.isArray(afiliados?.series) && afiliados.series.length > 3 && (() => {
        const last = afiliados.last as { period?: string; value?: number } | undefined
        const mom = afiliados.mom as number | undefined
        const yoy = afiliados.yoy as number | undefined
        return (
          <MacroPanel
            accent="#10b981"
            title="Afiliados Seguridad Social · indicador líder del empleo"
            subtitle="TGSS · mensual · 36 meses · más reciente que la EPA"
            status="live"
            aiAnalysis={{
              indicator: 'Afiliados Seguridad Social España · TGSS',
              indicatorId: 'tgss.afiliados.esp',
              tabSlug: 'hogares-empleo-vivienda',
              series: aiSeries(afiliados.series),
              metadata: {
                unit: 'Millones',
                source: 'TGSS Ministerio de Inclusión',
                sourceCode: 'TGSS_AFIL',
                lastUpdate: last?.period,
                frequency: 'monthly',
                notes: [
                  'Publicado día 2 del mes siguiente (menor desfase de todos los indicadores laborales).',
                  'Incluye todos los regímenes: general, autónomos, empleadas hogar, agrario.',
                  'Un afiliado puede tener varios contratos; un contrato no = un afiliado.',
                  `Variación mensual: ${mom != null ? `${mom > 0 ? '+' : ''}${(mom / 1000).toFixed(0)}K` : '—'}.`,
                  `Variación anual: ${yoy != null ? `${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%` : '—'}.`,
                ],
              },
            } as ChartAnalysisInput}
          >
            <DeepLineChart
              series={[{ id: 'afil', label: 'Afiliados SS', color: '#10b981', points: afiliados.series, fillBelow: true }]}
              height={200}
              yLabel="Millones"
              formatValue={(v) => `${v.toFixed(2)}M`}
            />
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', border: '1px solid #86efac' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Nivel actual</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                  {last?.value != null ? `${last.value.toFixed(2)}M` : '—'}
                </p>
              </div>
              <div
                style={{
                  background: (mom ?? 0) >= 0 ? '#f0fdf4' : '#fef2f2',
                  borderRadius: 8,
                  padding: '10px 12px',
                  border: `1px solid ${(mom ?? 0) >= 0 ? '#86efac' : '#fecaca'}`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: (mom ?? 0) >= 0 ? '#166534' : '#991b1b',
                  }}
                >
                  Var. mensual
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 20,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: (mom ?? 0) >= 0 ? '#16a34a' : '#dc2626',
                  }}
                >
                  {mom != null ? `${mom > 0 ? '+' : ''}${(mom / 1000).toFixed(0)}K` : '—'}
                </p>
              </div>
              <div
                style={{
                  background: (yoy ?? 0) >= 0 ? '#f0fdf4' : '#fef2f2',
                  borderRadius: 8,
                  padding: '10px 12px',
                  border: `1px solid ${(yoy ?? 0) >= 0 ? '#86efac' : '#fecaca'}`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: (yoy ?? 0) >= 0 ? '#166534' : '#991b1b',
                  }}
                >
                  Var. anual
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 20,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: (yoy ?? 0) >= 0 ? '#16a34a' : '#dc2626',
                  }}
                >
                  {yoy != null ? `${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <TrendNarrative
                label="Afiliados Seguridad Social"
                unit=" M"
                decimals={2}
                series={afiliados.series as any}
                accent="#10b981"
              />
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={openAfiliadosDrill}
                type="button"
                style={{
                  fontSize: 11,
                  padding: '6px 12px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 6,
                  color: '#065f46',
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
        )
      })()}

      {/* EPA serie larga + breakdown edad */}
      {epaGeneralSeries.length > 5 && (
        <MacroPanel
          accent={tab.themeAccent}
          title="EPA · Paro España · 24 trimestres"
          subtitle="Tasa paro general vs juvenil <25 · INE trimestral nacional"
          status="live"
          aiAnalysis={{
            indicator: 'Tasa paro general EPA · INE 86913',
            indicatorId: 'ine.epa86913.general',
            tabSlug: 'hogares-empleo-vivienda',
            series: aiSeries(epaGeneralSeries),
            metadata: {
              unit: '%',
              source: 'INE WSTempus · EPA',
              sourceCode: 'EPA86913',
              lastUpdate: epaGeneralLast?.period,
              frequency: 'quarterly',
              threshold: { amber: 12, red: 18, goodAbove: false },
              notes: [
                `Paro juvenil <25 último (EPA86912): ${epaJovenesLast?.value ?? '?'}% en ${epaJovenesLast?.period ?? '?'}.`,
                'EPA es muestra (~65k hogares). Diferencias con paro registrado SEPE habituales.',
              ],
            },
            windowLabel: '24 trimestres',
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'g', label: 'General', color: tab.themeAccent, points: epaGeneralSeries, fillBelow: true },
              { id: 'j', label: '<25 años', color: '#dc2626', points: epaJovenesSeries, dashed: true },
            ]}
            height={220}
            yLabel="Tasa paro %"
            formatValue={(v) => `${v.toFixed(1)}%`}
            onPointClick={openEpaDrill}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Tasa paro general"
              unit="%"
              decimals={2}
              series={epaGeneralSeries as any}
              threshold={{ amber: 12, red: 18, goodAbove: false }}
              accent={tab.themeAccent}
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 S5 C8 · Paro mensual FRED harmonizado · 5y · más reciente que EPA */}
      {fredParoSeries.length > 3 && (
        <MacroPanel
          accent="#f59e0b"
          title="Paro mensual · FRED harmonizado · 5 años"
          subtitle="FRED LRHUTTTTESM156S · harmonizado OECD/Eurostat · más reciente que EPA"
          status="live"
          aiAnalysis={{
            indicator: 'Paro mensual harmonizado · FRED LRHUTTTTESM156S',
            indicatorId: 'fred.lrhuttttesm156s.esp',
            tabSlug: 'hogares-empleo-vivienda',
            series: aiSeries(fredParoSeries),
            metadata: {
              unit: '%',
              source: 'FRED St. Louis · OECD',
              sourceCode: 'LRHUTTTTESM156S',
              lastUpdate: fredParoLast?.period,
              frequency: 'monthly',
              threshold: { amber: 12, red: 18, goodAbove: false },
              notes: [
                'Harmonizado OECD/Eurostat · comparable internacionalmente.',
                'Publicación con desfase ~6 semanas · más reciente que EPA trimestral.',
                'Diferencias con EPA por método y semana de referencia.',
                `Último: ${fredParoLast?.value != null ? `${fredParoLast.value.toFixed(1)}%` : '—'}.`,
              ],
            },
            windowLabel: `${fredParoSeries.length} meses`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'fred', label: 'Paro mensual harmonizado', color: '#f59e0b', points: fredParoSeries, fillBelow: true },
              ...(epaGeneralSeries.length > 3
                ? [{ id: 'epa', label: 'EPA trimestral (ref)', color: tab.themeAccent, points: epaGeneralSeries, dashed: true }]
                : []),
            ]}
            height={200}
            yLabel="%"
            formatValue={(v) => `${v.toFixed(1)}%`}
            annotations={[{ period: '2020', label: 'COVID', color: '#dc2626' }]}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Paro mensual harmonizado"
              unit="%"
              decimals={1}
              series={fredParoSeries as any}
              threshold={{ amber: 12, red: 18, goodAbove: false }}
              accent="#f59e0b"
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <CountryCompareBars
              indicator="LUR"
              countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC', 'POL', 'SWE']}
              spainColor={tab.themeAccent}
              unit="%"
              decimals={2}
              title="Paro · España vs Europa ampliada"
            />
          </div>
        </MacroPanel>
      )}

      {/* IMF Paro 20y + forecast */}
      {imfHist.length > 5 && (
        <MacroPanel
          accent="#f59e0b"
          title="IMF WEO · Paro España 20y + forecast"
          subtitle="LUR · histórica + proyección 5y · % población activa"
          status="live"
          aiAnalysis={{
            indicator: 'Tasa paro · IMF LUR (vista hogares)',
            indicatorId: 'imf.weo.lur.esp.hogares',
            tabSlug: 'hogares-empleo-vivienda',
            series: [
              ...aiSeries(imfHist),
              ...aiSeries(imfFc.map((p: any) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '%',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'LUR',
              lastUpdate: imfHist[imfHist.length - 1]?.period,
              frequency: 'annual',
              threshold: { amber: 12, red: 18, goodAbove: false },
              notes: ['Pico 26.1% (2013). NAIRU España estimada ~13%.'],
            },
            windowLabel: `${imfHist.length}y hist + ${imfFc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{
              id: 'imf',
              label: 'Tasa paro %',
              color: '#f59e0b',
              points: [...imfHist, ...imfFc],
              forecastFromIndex: imfHist.length,
              fillBelow: true,
            }]}
            height={220}
            yLabel="Tasa paro %"
            annotations={[
              { period: '2013', label: '26% pico', color: '#dc2626' },
              { period: '2020', label: 'COVID', color: '#dc2626' },
            ]}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Tasa paro IMF"
              unit="%"
              decimals={2}
              series={imfHist}
              forecast={imfFc}
              threshold={{ amber: 12, red: 18, goodAbove: false }}
              accent="#f59e0b"
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 S5 C6 · Salario real vs IPC · poder adquisitivo (FRED deflactado) */}
      {salarioRealSeries.length > 3 && ipcFredSeries.length > 3 && (
        <MacroPanel
          accent="#7c3aed"
          title="Salario real vs Inflación · poder adquisitivo"
          subtitle="Remuneración/asalariado (FRED) deflactada por IPC (FRED) · trimestral"
          status="live"
          aiAnalysis={{
            indicator: 'Salario real · remuneración deflactada por IPC',
            indicatorId: 'fred.lceatt01.deflated.cpaltt01.esp',
            tabSlug: 'hogares-empleo-vivienda',
            series: aiSeries(salarioRealSeries),
            metadata: {
              unit: 'índice',
              source: 'FRED LCEATT01ESQ660S deflactado por CPALTT01ESM659N',
              sourceCode: 'CALC.REAL_WAGE',
              lastUpdate: salarioRealLast?.period,
              frequency: 'quarterly/monthly aligned',
              threshold: { amber: -2, red: -5, goodAbove: true },
              notes: [
                'Salario real = (remuneración nominal / IPC) × IPC_base (base = IPC más reciente).',
                'Una caída sostenida indica pérdida de poder adquisitivo aunque el nominal suba.',
                'Periodo 2022-2023: máxima presión inflacionaria sobre salarios reales en España desde 1980.',
                `Salario real último: ${salarioRealLast?.value != null ? salarioRealLast.value.toFixed(1) : '—'} (índice).`,
              ],
            },
            windowLabel: `${salarioRealSeries.length} obs alineadas`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'real', label: 'Salario real', color: '#7c3aed', points: salarioRealSeries, fillBelow: true },
              { id: 'ipc', label: 'IPC (ref)', color: '#dc2626', points: ipcFredSeries, dashed: true },
            ]}
            height={220}
            yLabel="Índice (base dinámica)"
            formatValue={(v) => v.toFixed(1)}
            annotations={[{ period: '2022', label: 'Shock inflación', color: '#dc2626' }]}
          />
          <div
            style={{
              marginTop: 10,
              background: '#faf5ff',
              borderRadius: 8,
              padding: '12px 14px',
              border: '1px solid #e9d5ff',
            }}
          >
            <p
              style={{
                margin: '0 0 4px',
                fontSize: 11,
                fontWeight: 700,
                color: '#6d28d9',
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              SMI y salario real · la aritmética que importa
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#5b21b6', lineHeight: 1.6 }}>
              El Salario Mínimo Interprofesional ha subido de 735€/mes (2018) a más de 1.184€/mes (2024),
              un +61% nominal. La inflación acumulada del mismo período fue ~20-25%. El aumento real
              fue por tanto ~30-35%. Este es el dato relevante para el debate político sobre el SMI:
              no la subida nominal, sino la comparación con la inflación del período.
            </p>
          </div>
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Salario real"
              unit=" índice"
              decimals={1}
              series={salarioRealSeries as any}
              threshold={{ amber: -2, red: -5, goodAbove: true }}
              accent="#7c3aed"
            />
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={openSalarioRealDrill}
              type="button"
              style={{
                fontSize: 11,
                padding: '6px 12px',
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: 6,
                color: '#6d28d9',
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

      {/* Sprint M9 S5 C7 · Coste Laboral Unitario · competitividad-coste España */}
      {ulcSeries.length > 3 && (
        <MacroPanel
          accent="#f97316"
          title="Coste Laboral Unitario · competitividad-coste"
          subtitle="FRED LCEATT02ESQ661S · var YoY % · el indicador que sigue el BCE"
          status="live"
          aiAnalysis={{
            indicator: 'Coste Laboral Unitario (ULC) España · FRED',
            indicatorId: 'fred.lceatt02.esp',
            tabSlug: 'hogares-empleo-vivienda',
            series: aiSeries(ulcSeries),
            metadata: {
              unit: '% var YoY',
              source: 'FRED LCEATT02ESQ661S · OECD',
              sourceCode: 'LCEATT02ESQ661S',
              lastUpdate: ulcLast?.period,
              frequency: 'quarterly',
              threshold: { amber: 3, red: 6, goodAbove: false },
              notes: [
                'ULC = (Remuneración total) / (Productividad real).',
                'Sube si los salarios crecen más rápido que la productividad.',
                'El BCE usa el ULC como indicador de presiones inflacionistas salariales.',
                'España tuvo ULC muy alto 2000-2008 → pérdida competitividad → crisis deuda.',
              ],
            },
            windowLabel: `${ulcSeries.length} trimestres`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{ id: 'ulc', label: 'ULC var YoY %', color: '#f97316', points: ulcSeries, fillBelow: true }]}
            height={200}
            yLabel="%"
            zeroLine
            annotations={[{ period: '2008', label: 'ULC pico crisis', color: '#dc2626' }]}
            formatValue={(v) => `${v.toFixed(2)}%`}
          />
          {remuneracionSeries.length > 3 && productividadSeries.length > 3 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Componentes: remuneración vs productividad
              </p>
              <DeepLineChart
                series={[
                  { id: 'rem', label: 'Remuneración/asalariado (var)', color: '#f97316', points: remuneracionSeries },
                  { id: 'prod', label: 'Productividad/ocupado (var)', color: '#16a34a', points: productividadSeries, dashed: true },
                ]}
                height={160}
                yLabel="%"
                zeroLine
                formatValue={(v) => `${v.toFixed(2)}%`}
              />
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Coste Laboral Unitario"
              unit="%"
              decimals={2}
              series={ulcSeries as any}
              threshold={{ amber: 3, red: 6, goodAbove: false }}
              accent="#f97316"
            />
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={openUlcDrill}
              type="button"
              style={{
                fontSize: 11,
                padding: '6px 12px',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 6,
                color: '#9a3412',
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

      {/* IPV serie larga + breakdown */}
      {ipvGeneralSeries.length > 5 && (
        <MacroPanel
          accent="#16a34a"
          title="IPV · Índice Precio Vivienda España"
          subtitle="INE base 2015 · trimestral · general + nueva + segunda mano"
          status="live"
          aiAnalysis={{
            indicator: 'IPV general · INE 76201',
            indicatorId: 'ine.ipv76201.general',
            tabSlug: 'hogares-empleo-vivienda',
            series: aiSeries(ipvGeneralSeries),
            metadata: {
              unit: 'índice',
              source: 'INE WSTempus · IPV',
              sourceCode: 'IPV76201',
              lastUpdate: ipvLast?.period,
              frequency: 'quarterly',
              notes: [
                'Base 2015=100. IPV mide precio de transacciones efectivas.',
                'No incluye alquiler ni stock; sólo compraventa registrada.',
              ],
            },
            windowLabel: '24 trimestres',
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'g', label: 'IPV general', color: '#16a34a', points: ipvGeneralSeries, fillBelow: true },
              ...(ipvNuevaSeries.length > 0 ? [{ id: 'n', label: 'Vivienda nueva', color: '#10b981', points: ipvNuevaSeries }] : []),
              ...(ipvSegundaSeries.length > 0 ? [{ id: 's', label: 'Segunda mano', color: '#0d9488', points: ipvSegundaSeries, dashed: true }] : []),
            ]}
            height={220}
            yLabel="IPV (base 2015=100)"
            formatValue={(v) => v.toFixed(1)}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="IPV general"
              unit=""
              decimals={1}
              series={ipvGeneralSeries as any}
              accent="#16a34a"
            />
          </div>
        </MacroPanel>
      )}

      {/* ETCL coste laboral */}
      {etclSeries.length > 5 && (
        <MacroPanel
          accent="#7c3aed"
          title="ETCL · Coste laboral medio por trabajador y mes"
          subtitle="INE ETCL trimestral · euros · serie 24 trimestres"
          status="live"
          aiAnalysis={{
            indicator: 'Coste laboral medio · INE ETCL',
            indicatorId: 'ine.etcl.total',
            tabSlug: 'hogares-empleo-vivienda',
            series: aiSeries(etclSeries),
            metadata: {
              unit: '€/mes',
              source: 'INE WSTempus · ETCL',
              sourceCode: 'ETCL',
              lastUpdate: etclLast?.period,
              frequency: 'quarterly',
              notes: ['Coste por trabajador y mes (incluye salarios brutos + cotizaciones empresariales).'],
            },
            windowLabel: '24 trimestres',
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{ id: 'etcl', label: 'Coste laboral', color: '#7c3aed', points: etclSeries, fillBelow: true }]}
            height={200}
            yLabel="€/mes"
            formatValue={(v) => `${Math.round(v).toLocaleString('es-ES')}€`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Coste laboral medio"
              unit=" €"
              decimals={0}
              series={etclSeries as any}
              accent="#7c3aed"
            />
          </div>
        </MacroPanel>
      )}

      {/* CountryCompare paro */}
      <MacroPanel accent="#f59e0b" title="Paro · España vs peers UE" subtitle="IMF LUR · último año disponible" status="live">
        <CountryCompareBars
          indicator="LUR"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC']}
          spainColor={tab.themeAccent}
          unit="%"
          decimals={2}
        />
      </MacroPanel>

      {/* EPF · Encuesta Presupuestos Familiares · comportamiento gasto hogares */}
      <EncuestaConsumoPanel />

      {/* Sprint M9 S5 C9 · Últimas noticias empleo España (NewsAPI) */}
      {Array.isArray(newsEmpleo?.articles) && newsEmpleo.articles.length > 0 && (
        <MacroPanel
          accent="#64748b"
          title="Noticias empleo · España"
          subtitle="NewsAPI · últimas 5 noticias relevantes · paro + salarios + mercado laboral"
          status="live"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {newsEmpleo.articles.slice(0, 5).map((a: { title?: string; url?: string; source?: { name?: string }; publishedAt?: string }, i: number) => (
              <a
                key={i}
                href={a.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
                    {a.title ?? '—'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
                    {a.source?.name ?? 'Fuente desconocida'} · {a.publishedAt?.slice(0, 10) ?? ''}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, flexShrink: 0 }}>→</span>
              </a>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>
            NewsAPI · actualización automática · últimas 24h
          </p>
        </MacroPanel>
      )}
    </div>
  )
}

export default HogaresEmpleoViviendaTab
