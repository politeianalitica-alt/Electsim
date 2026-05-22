'use client'
/**
 * `<DomainHero subtabSlug overview />` · Sprint M F1.
 *
 * Bloque hero específico del dominio que cada subtab muestra ENCIMA del
 * contenido genérico. Cada slug tiene su propio diseño visual + métricas
 * destacadas + lectura específica del dominio, en lugar de la misma
 * estructura genérica para todos.
 *
 * - demografia-territorio: pirámide edad + fertilidad + paro joven + saldo migratorio
 * - sociedad-bienestar: AROPE + Gini + paro joven · gauge de desigualdad
 * - medio-rural: Frontur rural + renta agraria + SAU + IPC alimentos
 * - cultura-ocio: turistas + pernoctaciones + IPC servicios + edad media
 * - instituciones-estado: deuda + saldo + I+D + inversión pública
 * - resto: null (fallback genérico)
 */
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'

interface Props {
  subtabSlug: string
  byId: Record<string, PulsoFetchResult>
  accent: string
}

// Helpers
const findValue = (byId: Record<string, PulsoFetchResult>, id: string): number | null => {
  const r = byId[id]
  return r?.last?.value != null && Number.isFinite(r.last.value) ? r.last.value : null
}

const findPeriod = (byId: Record<string, PulsoFetchResult>, id: string): string | null => {
  return byId[id]?.last?.period ?? null
}

// Color semantic helper
function colorForValue(v: number | null, good: 'high' | 'low', amberThreshold: number, redThreshold: number): string {
  if (v == null) return '#94a3b8'
  if (good === 'high') {
    if (v >= amberThreshold) return '#16a34a'
    if (v >= redThreshold) return '#eab308'
    return '#dc2626'
  } else {
    if (v <= amberThreshold) return '#16a34a'
    if (v <= redThreshold) return '#eab308'
    return '#dc2626'
  }
}

export function DomainHero({ subtabSlug, byId, accent }: Props) {
  if (subtabSlug === 'demografia-territorio') {
    const edadMedia = findValue(byId, 'dt-poblacion-eurostat')
    const fertilidad = findValue(byId, 'dt-fertilidad-eurostat')
    const paroJoven = findValue(byId, 'dt-paro-epa-jovenes')
    const pibPc = findValue(byId, 'dt-pib-percapita')

    return (
      <DomainPanel accent={accent} title="Pirámide demográfica · estado estructural" subtitle="Indicadores que definen la sostenibilidad poblacional de España">
        <div style={gridStyle}>
          <BigMetric label="Edad media" value={edadMedia} unit=" años" decimals={1} color={colorForValue(edadMedia, 'low', 44, 47)} caption={fertilidad ? `vs UE-27 ~44 años` : null} period={findPeriod(byId, 'dt-poblacion-eurostat')} />
          <BigMetric label="Fertilidad" value={fertilidad} unit=" h/m" decimals={2} color={colorForValue(fertilidad, 'high', 1.5, 1.3)} caption="reemplazo 2.1" period={findPeriod(byId, 'dt-fertilidad-eurostat')} />
          <BigMetric label="Paro <25" value={paroJoven} unit="%" decimals={1} color={colorForValue(paroJoven, 'low', 25, 35)} caption="drivers migración interna" period={findPeriod(byId, 'dt-paro-epa-jovenes')} />
          <BigMetric label="PIB pc" value={pibPc} unit=" USD" decimals={0} color="#0F766E" caption="renta media por habitante" period={findPeriod(byId, 'dt-pib-percapita')} />
        </div>
        <Interpretation>
          {fertilidad != null && fertilidad < 1.3 ? '⚠️ Fertilidad por debajo de 1.3 — España en cola UE. Combinado con envejecimiento y emigración juvenil, la pirámide no se sostiene sin saldo migratorio neto positivo.' : 'Pirámide demográfica con riesgo estructural. Vigilar fertilidad y saldo migratorio para entender presión sobre pensiones y mercado laboral.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'sociedad-bienestar') {
    const arope = findValue(byId, 'sb-arope-eurostat')
    const gini = findValue(byId, 'sb-gini-eurostat')
    const paroGeneral = findValue(byId, 'sb-paro-epa-general')
    const paroJoven = findValue(byId, 'sb-paro-epa-jovenes')

    return (
      <DomainPanel accent={accent} title="Termómetro social · pobreza, desigualdad, exclusión" subtitle="Métricas EU-armonizadas que determinan el bienestar agregado">
        <div style={gridStyle}>
          <BigMetric label="AROPE" value={arope} unit="%" decimals={1} color={colorForValue(arope, 'low', 22, 28)} caption="riesgo pobreza+exclusión" period={findPeriod(byId, 'sb-arope-eurostat')} />
          <BigMetric label="Gini" value={gini} unit="" decimals={1} color={colorForValue(gini, 'low', 32, 36)} caption="0=igualdad / 100=desigualdad" period={findPeriod(byId, 'sb-gini-eurostat')} />
          <BigMetric label="Paro general" value={paroGeneral} unit="%" decimals={1} color={colorForValue(paroGeneral, 'low', 12, 18)} caption="EPA armonizada" period={findPeriod(byId, 'sb-paro-epa-general')} />
          <BigMetric label="Paro <25" value={paroJoven} unit="%" decimals={1} color={colorForValue(paroJoven, 'low', 25, 35)} caption="exclusión juvenil" period={findPeriod(byId, 'sb-paro-epa-jovenes')} />
        </div>
        <Interpretation>
          {arope != null && gini != null
            ? `${arope.toFixed(1)}% de la población en riesgo de pobreza/exclusión y Gini ${gini.toFixed(1)} — España persiste por encima de la media UE en ambos. Vigilar evolución de salarios reales y prestaciones sociales como mitigantes.`
            : 'Bienestar agregado con tensiones distributivas. España estructuralmente >UE en desigualdad y pobreza laboral.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'medio-rural') {
    const frontur = findValue(byId, 'mr-frontur-rural')
    const rentaAgraria = findValue(byId, 'mr-aei-eurostat')
    const sau = findValue(byId, 'mr-sau-eurostat')
    const ipcAlim = findValue(byId, 'mr-ipc-anual')

    return (
      <DomainPanel accent={accent} title="Vertebración rural · ingresos del campo y presión territorial" subtitle="Indicadores que miden la viabilidad del medio rural español">
        <div style={gridStyle}>
          <BigMetric label="Turistas (mes)" value={frontur} unit="" decimals={0} color="#16a34a" caption="turismo rural ~15%" period={findPeriod(byId, 'mr-frontur-rural')} />
          <BigMetric label="Renta agraria" value={rentaAgraria} unit="" decimals={0} color="#84cc16" caption="Eurostat AEI índice" period={findPeriod(byId, 'mr-aei-eurostat')} />
          <BigMetric label="SAU" value={sau} unit=" ha" decimals={0} color="#16a34a" caption="superficie agraria útil" period={findPeriod(byId, 'mr-sau-eurostat')} />
          <BigMetric label="IPC alimentos" value={ipcAlim} unit="%" decimals={2} color={colorForValue(ipcAlim, 'low', 2, 4)} caption="presión sobre rentas" period={findPeriod(byId, 'mr-ipc-anual')} />
        </div>
        <Interpretation>
          El medio rural depende de tres equilibrios: <strong>renta agraria</strong> sostenida (PAC + climatología + precios), <strong>turismo rural</strong> como diversificación (Frontur), y <strong>territorio</strong> útil (SAU + agua). Vigilar abandono SAU y dependencia PAC.
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'cultura-ocio') {
    const frontur = findValue(byId, 'co-frontur')
    const pernoct = findValue(byId, 'co-tourism-nights-eurostat')
    const exports = findValue(byId, 'co-exports-yoy')
    const ipc = findValue(byId, 'co-ipc-anual')

    return (
      <DomainPanel accent={accent} title="Pulso turismo + cultura · sector clave 12-13% PIB" subtitle="España es el 2º país del mundo en llegadas turísticas y el 1º en estancia media">
        <div style={gridStyle}>
          <BigMetric label="Turistas (mes)" value={frontur} unit="" decimals={0} color="#8b5cf6" caption="INE Frontur" period={findPeriod(byId, 'co-frontur')} />
          <BigMetric label="Pernoctaciones" value={pernoct} unit="" decimals={0} color="#a855f7" caption="Eurostat hostelería" period={findPeriod(byId, 'co-tourism-nights-eurostat')} />
          <BigMetric label="Exports YoY" value={exports} unit="%" decimals={2} color={colorForValue(exports, 'high', 2, 0)} caption="turismo = export servicios" period={findPeriod(byId, 'co-exports-yoy')} />
          <BigMetric label="IPC general" value={ipc} unit="%" decimals={2} color={colorForValue(ipc, 'low', 2, 4)} caption="coste turístico para visitantes" period={findPeriod(byId, 'co-ipc-anual')} />
        </div>
        <Interpretation>
          {frontur && pernoct
            ? `${frontur.toLocaleString('es-ES', { maximumFractionDigits: 0 })} turistas internacionales y ${pernoct.toLocaleString('es-ES', { maximumFractionDigits: 0 })} pernoctaciones. La estacionalidad jul-ago concentra ~30% de la demanda anual; presión sobre vivienda en costa y grandes ciudades.`
            : 'Sector turístico-cultural · alta dependencia de demanda exterior. Vigilar pernoctaciones vs llegadas (estancia media) y precios sector servicios.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'instituciones-estado') {
    const deuda = findValue(byId, 'ie-deuda-imf')
    const saldo = findValue(byId, 'ie-saldo-imf')
    const gasto = findValue(byId, 'ie-gasto-aapp')
    const id = findValue(byId, 'ie-id-rd-eurostat')
    const inversion = findValue(byId, 'ie-inversion-publica-eurostat')

    return (
      <DomainPanel accent={accent} title="Capacidad estatal · ¿con cuánto margen actúa el Estado?" subtitle="Espacio fiscal real, capacidad inversora pública e innovación">
        <div style={gridStyle}>
          <BigMetric label="Deuda %PIB" value={deuda} unit="%" decimals={1} color={colorForValue(deuda, 'low', 100, 120)} caption="Maastricht criterion" period={findPeriod(byId, 'ie-deuda-imf')} />
          <BigMetric label="Saldo fiscal" value={saldo} unit="%" decimals={2} color={colorForValue(saldo, 'high', -3, -6)} caption="déficit/superávit AAPP" period={findPeriod(byId, 'ie-saldo-imf')} />
          <BigMetric label="Gasto AAPP" value={gasto} unit="%" decimals={1} color="#0891b2" caption="tamaño efectivo Estado" period={findPeriod(byId, 'ie-gasto-aapp')} />
          <BigMetric label="I+D pública" value={id} unit="%" decimals={2} color={colorForValue(id, 'high', 0.6, 0.4)} caption="capacidad innovadora" period={findPeriod(byId, 'ie-id-rd-eurostat')} />
          <BigMetric label="Inversión pub." value={inversion} unit="%" decimals={2} color={colorForValue(inversion, 'high', 3, 2)} caption="FBCF AAPP" period={findPeriod(byId, 'ie-inversion-publica-eurostat')} />
        </div>
        <Interpretation>
          {deuda != null && saldo != null
            ? `Deuda en ${deuda.toFixed(1)}% PIB con saldo ${saldo.toFixed(2)}% — el espacio fiscal depende de mantener el saldo primario contenido y la prima de riesgo baja. La inversión pública (${inversion?.toFixed(2) ?? '?'}%) y la I+D (${id?.toFixed(2) ?? '?'}%) son los multiplicadores futuros de capacidad estatal.`
            : 'Margen fiscal vs capacidad inversora del Estado. Tensión entre sostenibilidad de deuda y necesidad de inversión productiva.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  return null
}

// ─── Helpers compartidos ────────────────────────────────────────────────

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
  marginBottom: 12,
}

function DomainPanel({ accent, title, subtitle, children }: { accent: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: `linear-gradient(180deg, ${accent}08 0%, #fff 60%)`,
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${accent}`,
        borderRadius: 10,
        padding: 18,
      }}
    >
      <header style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: accent, textTransform: 'uppercase' }}>
          {title}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569', maxWidth: 760 }}>{subtitle}</p>
      </header>
      {children}
    </section>
  )
}

function BigMetric({ label, value, unit, decimals = 2, color, caption, period }: { label: string; value: number | null; unit: string; decimals?: number; color: string; caption?: string | null; period?: string | null }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '10px 12px',
      }}
    >
      <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p
        style={{
          margin: '4px 0 0',
          fontSize: 22,
          fontWeight: 700,
          color: value != null ? color : '#cbd5e1',
          fontVariantNumeric: 'tabular-nums' as any,
          lineHeight: 1.1,
        }}
      >
        {value != null
          ? `${decimals === 0 ? Math.round(value).toLocaleString('es-ES') : value.toFixed(decimals)}${unit}`
          : '—'}
      </p>
      {caption && (
        <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8', lineHeight: 1.3 }}>{caption}</p>
      )}
      {period && (
        <p style={{ margin: '2px 0 0', fontSize: 8, color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' as any }}>
          {period}
        </p>
      )}
    </div>
  )
}

function Interpretation({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#f8fafc',
        borderLeft: '3px solid #cbd5e1',
        padding: '8px 12px',
        marginTop: 8,
        fontSize: 12,
        color: '#475569',
        lineHeight: 1.55,
        borderRadius: '0 6px 6px 0',
      }}
    >
      {children}
    </div>
  )
}

export default DomainHero
