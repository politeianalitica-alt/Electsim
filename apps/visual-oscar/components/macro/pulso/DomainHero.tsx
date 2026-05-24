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
  // ─── Sprint N2 · 10 primeras subtabs ──────────────────────────────────

  if (subtabSlug === 'pulso-macro') {
    const pib = findValue(byId, 'pib-yoy')
    const paro = findValue(byId, 'paro-epa-general')
    const ipc = findValue(byId, 'ipc-anual')
    const cc = findValue(byId, 'cuenta-corriente')
    return (
      <DomainPanel accent={accent} title="Régimen macro · radiografía del ciclo" subtitle="Las 4 variables que definen el estado actual del cuadro macroeconómico español">
        <div style={gridStyle}>
          <BigMetric label="PIB YoY" value={pib} unit="%" decimals={2} color={colorForValue(pib, 'high', 0.5, -1)} caption="crecimiento real" period={findPeriod(byId, 'pib-yoy')} />
          <BigMetric label="Paro EPA" value={paro} unit="%" decimals={2} color={colorForValue(paro, 'low', 12, 18)} caption="armonizado UE" period={findPeriod(byId, 'paro-epa-general')} />
          <BigMetric label="IPC YoY" value={ipc} unit="%" decimals={2} color={colorForValue(ipc, 'low', 2, 4)} caption="objetivo BCE 2%" period={findPeriod(byId, 'ipc-anual')} />
          <BigMetric label="CC %PIB" value={cc} unit="%" decimals={2} color={colorForValue(cc, 'high', -2, -4)} caption="financiación neta exterior" period={findPeriod(byId, 'cuenta-corriente')} />
        </div>
        <Interpretation>
          {pib != null && paro != null && ipc != null
            ? `PIB ${pib >= 0 ? '+' : ''}${pib.toFixed(1)}% · Paro ${paro.toFixed(1)}% · IPC ${ipc.toFixed(1)}%. ${pib > 1.5 && paro < 13 && ipc < 3 ? 'Expansión sólida con inflación contenida.' : pib > 0 && ipc < 4 ? 'Crecimiento moderado, vigilar persistencia inflacionaria.' : 'Cuadro mixto con riesgos asimétricos.'}`
            : 'Cuadro macro español · cruzar PIB, paro y precios para identificar régimen.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'regimen-monetario') {
    const hicp = findValue(byId, 'rm-hicp-eurostat') ?? findValue(byId, 'rm-ipc-anual')
    const tipo10y = findValue(byId, 'rm-tipos-largo-eurostat')
    const conf = findValue(byId, 'rm-confianza-consumidor-eurostat')
    const reer = findValue(byId, 'rm-reer-bis')
    return (
      <DomainPanel accent={accent} title="Régimen monetario · transmisión BCE → economía real" subtitle="Inflación armonizada, coste financiación soberana, confianza y competitividad-precio">
        <div style={gridStyle}>
          <BigMetric label="HICP YoY" value={hicp} unit="%" decimals={2} color={colorForValue(hicp, 'low', 2, 4)} caption="armonizada UE · target BCE 2%" period={findPeriod(byId, 'rm-hicp-eurostat') || findPeriod(byId, 'rm-ipc-anual')} />
          <BigMetric label="10Y yield" value={tipo10y} unit="%" decimals={2} color={colorForValue(tipo10y, 'low', 3.5, 5)} caption="coste financiación" period={findPeriod(byId, 'rm-tipos-largo-eurostat')} />
          <BigMetric label="Conf. consumidor" value={conf} unit="" decimals={1} color="#8b5cf6" caption="balance opiniones" period={findPeriod(byId, 'rm-confianza-consumidor-eurostat')} />
          <BigMetric label="REER" value={reer} unit="" decimals={1} color={colorForValue(reer, 'low', 105, 115)} caption=">100 = apreciación" period={findPeriod(byId, 'rm-reer-bis')} />
        </div>
        <Interpretation>
          {hicp != null
            ? `Inflación armonizada ${hicp.toFixed(1)}% ${hicp > 4 ? '— por encima del umbral BCE, presión persistente' : hicp > 2 ? '— por encima del target 2% pero contenida' : '— consistente con target BCE'}. ${tipo10y != null ? `Yield 10Y ${tipo10y.toFixed(2)}% refleja primas de riesgo.` : ''}`
            : 'Marco monetario · cruzar HICP, yields y competitividad para entender postura BCE y transmisión.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'margen-fiscal') {
    const deuda = findValue(byId, 'mf-deuda-imf')
    const saldo = findValue(byId, 'mf-saldo-total')
    const primario = findValue(byId, 'mf-saldo-primario')
    const deudaNeta = findValue(byId, 'mf-deuda-neta-eurostat') ?? findValue(byId, 'mf-deuda-neta-imf')
    return (
      <DomainPanel accent={accent} title="Margen fiscal · espacio para actuar del Estado" subtitle="Stock de deuda, saldo total, saldo primario y deuda neta — métricas Maastricht + AIReF">
        <div style={gridStyle}>
          <BigMetric label="Deuda %PIB" value={deuda} unit="%" decimals={1} color={colorForValue(deuda, 'low', 100, 120)} caption="Maastricht criterion" period={findPeriod(byId, 'mf-deuda-imf')} />
          <BigMetric label="Saldo total" value={saldo} unit="%" decimals={2} color={colorForValue(saldo, 'high', -3, -6)} caption="déficit/superávit AAPP" period={findPeriod(byId, 'mf-saldo-total')} />
          <BigMetric label="Saldo primario" value={primario} unit="%" decimals={2} color={colorForValue(primario, 'high', 0, -2)} caption="ex-intereses" period={findPeriod(byId, 'mf-saldo-primario')} />
          <BigMetric label="Deuda neta" value={deudaNeta} unit="%" decimals={1} color={colorForValue(deudaNeta, 'low', 90, 110)} caption="bruta menos activos" period={findPeriod(byId, 'mf-deuda-neta-eurostat') || findPeriod(byId, 'mf-deuda-neta-imf')} />
        </div>
        <Interpretation>
          {deuda != null && saldo != null
            ? `Deuda ${deuda.toFixed(1)}% PIB con saldo ${saldo >= 0 ? '+' : ''}${saldo.toFixed(2)}%. ${deuda > 120 ? '⚠️ Espacio fiscal limitado, sostenibilidad bajo presión si suben tipos.' : deuda > 100 ? 'Espacio fiscal estrecho; vigilar prima de riesgo y refinanciación.' : 'Posición fiscal razonable dentro del rango Maastricht.'}`
            : 'Margen fiscal español · cruzar deuda + saldo + intereses para evaluar sostenibilidad.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'dependencias-externas') {
    // Sprint N6.2: refundación · indicadores estructura comercio exterior
    const apertura = findValue(byId, 'de-apertura-exports')
    const turistas = findValue(byId, 'de-turistas-anual')
    const energia = findValue(byId, 'de-energia-dependence')
    const reer = findValue(byId, 'de-reer-narrow')
    return (
      <DomainPanel accent={accent} title="Dependencias externas · estructura del comercio español" subtitle="Apertura X%PIB, turismo (driver clave), dependencia energética crítica, REER narrow intra-eurozona">
        <div style={gridStyle}>
          <BigMetric label="X %PIB" value={apertura} unit="%" decimals={1} color={colorForValue(apertura, 'high', 35, 30)} caption="apertura comercial" period={findPeriod(byId, 'de-apertura-exports')} />
          <BigMetric label="Turistas" value={turistas} unit="M" decimals={1} color="#0F766E" caption="non-resident llegadas" period={findPeriod(byId, 'de-turistas-anual')} />
          <BigMetric label="Dep. energía" value={energia} unit="%" decimals={1} color={colorForValue(energia, 'low', 60, 75)} caption="imports/consumo bruto" period={findPeriod(byId, 'de-energia-dependence')} />
          <BigMetric label="REER narrow" value={reer} unit="" decimals={1} color={colorForValue(reer, 'low', 105, 115)} caption="competitividad EA" period={findPeriod(byId, 'de-reer-narrow')} />
        </div>
        <Interpretation>
          {apertura != null && energia != null
            ? `Apertura comercial ${apertura.toFixed(1)}% PIB · dependencia energética ${energia.toFixed(1)}%. ${energia > 70 ? '⚠️ Alta vulnerabilidad energética: shock precios = transferencia inmediata al IPC y déficit corriente.' : 'Estructura comercio: 60% intra-EA, turismo motor del superávit servicios.'}`
            : 'Estructura del comercio exterior español · cruzar apertura, partners y dependencia energética para evaluar vulnerabilidad sectorial.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'riesgo-sistemico') {
    // Sprint N6.2: refundación · estresores financieros específicos
    const yieldES = findValue(byId, 'rs-yield-10y-es')
    const yieldIT = findValue(byId, 'rs-yield-10y-it')
    const hpi = findValue(byId, 'rs-hpi-es')
    const credito = findValue(byId, 'rs-credito-pib-es')
    const paroLD = findValue(byId, 'rs-paro-larga-duracion')
    return (
      <DomainPanel accent={accent} title="Riesgo sistémico · estresores financieros y estructurales" subtitle="Yields ES vs IT (contagio), HPI inmobiliario, crédito MFI, paro larga duración">
        <div style={gridStyle}>
          <BigMetric label="10Y ES" value={yieldES} unit="%" decimals={2} color={colorForValue(yieldES, 'low', 3.5, 5)} caption="estrés soberano" period={findPeriod(byId, 'rs-yield-10y-es')} />
          <BigMetric label="10Y IT" value={yieldIT} unit="%" decimals={2} color={colorForValue(yieldIT, 'low', 4, 6)} caption="contagio EA periférica" period={findPeriod(byId, 'rs-yield-10y-it')} />
          <BigMetric label="HPI YoY" value={hpi} unit="%" decimals={1} color={colorForValue(hpi, 'low', 7, 12)} caption="ciclo inmobiliario" period={findPeriod(byId, 'rs-hpi-es')} />
          <BigMetric label="Crédito MFI" value={credito} unit="%" decimals={1} color={colorForValue(credito, 'high', 2, 0)} caption="canal bancario" period={findPeriod(byId, 'rs-credito-pib-es')} />
          <BigMetric label="Paro LD" value={paroLD} unit="%" decimals={1} color={colorForValue(paroLD, 'low', 5, 8)} caption="vulnerabilidad social" period={findPeriod(byId, 'rs-paro-larga-duracion')} />
        </div>
        <Interpretation>
          {yieldES != null && hpi != null
            ? `Estrés sistémico · 10Y ES ${yieldES.toFixed(2)}% · HPI ${hpi.toFixed(1)}% YoY · crédito ${credito?.toFixed(1) ?? '?'}%. ${yieldES > 5 || hpi > 12 || (credito != null && credito < 0) ? '⚠️ Al menos un estresor crítico activo · revisar exposición.' : 'Estresores financieros contenidos · monitorizar contagio italiano y dinámica inmobiliaria.'}`
            : 'Termómetro de estrés sistémico · yields soberanos, inmobiliario, crédito y empleo estructural.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'mercados-activos') {
    // Sprint N6.2: refundación · cuadro de mando trader/analista
    const yieldES = findValue(byId, 'ma-yield-10y-es')
    const yieldDE = findValue(byId, 'ma-yield-10y-de')
    const eurusd = findValue(byId, 'ma-eurusd')
    const reer = findValue(byId, 'ma-reer-bis')
    const slope = (yieldES != null && yieldDE != null) ? yieldES - yieldDE : null
    return (
      <DomainPanel accent={accent} title="Mercados · cuadro de mando trader/analista España" subtitle="Yields ES vs Bund (spread), EUR/USD, REER, agregados monetarios y crédito MFI">
        <div style={gridStyle}>
          <BigMetric label="10Y ES" value={yieldES} unit="%" decimals={2} color={colorForValue(yieldES, 'low', 3.5, 5)} caption="benchmark coste capital" period={findPeriod(byId, 'ma-yield-10y-es')} />
          <BigMetric label="10Y DE" value={yieldDE} unit="%" decimals={2} color="#94a3b8" caption="risk-free eurozona" period={findPeriod(byId, 'ma-yield-10y-de')} />
          <BigMetric label="Spread ES-DE" value={slope} unit="pb" decimals={0} color={colorForValue(slope, 'low', 1.0, 1.5)} caption="prima riesgo país" period={findPeriod(byId, 'ma-yield-10y-es')} />
          <BigMetric label="EUR/USD" value={eurusd} unit="" decimals={4} color="#0891b2" caption="cross divisas" period={findPeriod(byId, 'ma-eurusd')} />
          <BigMetric label="REER ES" value={reer} unit="" decimals={1} color={colorForValue(reer, 'low', 105, 115)} caption="competitividad" period={findPeriod(byId, 'ma-reer-bis')} />
        </div>
        <Interpretation>
          {yieldES != null && yieldDE != null
            ? `Spread ES-DE ${((yieldES - yieldDE) * 100).toFixed(0)}pb. ${(yieldES - yieldDE) > 1.5 ? '⚠️ Prima de riesgo elevada · activos ES descuentan stress.' : 'Prima riesgo contenida vs Bund · entorno benigno para equity y deuda corporativa ES.'}`
            : 'Lectura macro-financiera España · yields, FX, agregados monetarios. Debajo: panel enriquecido con IBEX live, sector breakdown, FX matrix y commodity heatmap.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'flujos-capital') {
    // Sprint N6.2: refundación · BoP por componente
    const iip = findValue(byId, 'fc-iip-neta')
    const iedIn = findValue(byId, 'fc-ied-inbound')
    const iedOut = findValue(byId, 'fc-ied-outbound')
    const portfolio = findValue(byId, 'fc-portfolio-net')
    const ctaFin = findValue(byId, 'fc-cuenta-financiera')
    // Aliases por compatibilidad con interpretación heredada
    const yield10: number | null = null
    const cc: number | null = null
    void yield10; void cc; // marcadores compatibilidad legacy
    return (
      <DomainPanel accent={accent} title="Flujos de capital · BoP descompuesta por tipo de flujo" subtitle="IED inbound/outbound (estable), portfolio investment (hot money), other investment (banca cross-border), IIP neta">
        <div style={gridStyle}>
          <BigMetric label="IIP neta" value={iip} unit="%" decimals={1} color={colorForValue(iip, 'high', -50, -80)} caption="stock pasivos netos" period={findPeriod(byId, 'fc-iip-neta')} />
          <BigMetric label="IED in" value={iedIn} unit="%" decimals={2} color={colorForValue(iedIn, 'high', 1, 0)} caption="capital long-term entrante" period={findPeriod(byId, 'fc-ied-inbound')} />
          <BigMetric label="IED out" value={iedOut} unit="%" decimals={2} color="#f59e0b" caption="multinacionales ES fuera" period={findPeriod(byId, 'fc-ied-outbound')} />
          <BigMetric label="Portfolio" value={portfolio} unit="%" decimals={2} color="#dc2626" caption="hot money cartera" period={findPeriod(byId, 'fc-portfolio-net')} />
          <BigMetric label="Cta financiera" value={ctaFin} unit="%" decimals={2} color="#0EA5E9" caption="flujos netos BoP" period={findPeriod(byId, 'fc-cuenta-financiera')} />
        </div>
        <Interpretation>
          {iip != null && iedIn != null
            ? `Posición externa neta ${iip.toFixed(1)}% PIB · IED inbound ${iedIn.toFixed(2)}% PIB. ${(iedIn > 1 && portfolio != null && portfolio > 0) ? 'Capital estable entrando y portfolio neutro/positivo · entorno favorable.' : 'Composición BoP volátil · revisar dominio portfolio vs IED.'}`
            : 'Balanza de pagos descompuesta · IED (estable, long-term) vs portfolio (volátil) vs other investment (banca cross-border).'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'productividad-competitividad') {
    const pibPc = findValue(byId, 'pc-pib-percapita')
    const inversion = findValue(byId, 'pc-inversion-bruta')
    const idGdp = findValue(byId, 'pc-id-pib-eurostat')
    const reer = findValue(byId, 'pc-reer-bis')
    return (
      <DomainPanel accent={accent} title="Productividad & competitividad · capacidad estructural" subtitle="Renta por habitante, inversión productiva, esfuerzo I+D y competitividad-precio internacional">
        <div style={gridStyle}>
          <BigMetric label="PIB pc" value={pibPc} unit=" USD" decimals={0} color="#0F766E" caption="renta media" period={findPeriod(byId, 'pc-pib-percapita')} />
          <BigMetric label="Inversión %PIB" value={inversion} unit="%" decimals={2} color={colorForValue(inversion, 'high', 22, 18)} caption="FBCF total" period={findPeriod(byId, 'pc-inversion-bruta')} />
          <BigMetric label="I+D %PIB" value={idGdp} unit="%" decimals={2} color={colorForValue(idGdp, 'high', 2, 1.5)} caption="vs UE-27 ~2.3%" period={findPeriod(byId, 'pc-id-pib-eurostat')} />
          <BigMetric label="REER" value={reer} unit="" decimals={1} color={colorForValue(reer, 'low', 105, 115)} caption=">100 = pérdida competitividad" period={findPeriod(byId, 'pc-reer-bis')} />
        </div>
        <Interpretation>
          {idGdp != null && pibPc != null
            ? `Renta ${(pibPc / 1000).toFixed(1)}k USD pc · I+D ${idGdp.toFixed(2)}% PIB ${idGdp < 1.5 ? '— gap estructural con UE de ~0.8 pp' : '— en mejora, pero aún por debajo de la media UE'}. La competitividad estructural se juega en cerrar el gap de inversión y I+D.`
            : 'Competitividad estructural · cruzar renta + inversión + I+D + REER para evaluar capacidad de crecimiento sostenible.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'empresas-beneficios') {
    const pib = findValue(byId, 'eb-pib-imf')
    const costeLaboral = findValue(byId, 'eb-etcl-coste-laboral')
    const inversion = findValue(byId, 'eb-inversion-bruta')
    const confianza = findValue(byId, 'eb-confianza-empresarial-eurostat')
    return (
      <DomainPanel accent={accent} title="Empresas & beneficios · salud del tejido empresarial" subtitle="Crecimiento, costes laborales, inversión y confianza industrial — los drivers de márgenes y empleo">
        <div style={gridStyle}>
          <BigMetric label="PIB YoY" value={pib} unit="%" decimals={2} color={colorForValue(pib, 'high', 1, 0)} caption="ciclo económico" period={findPeriod(byId, 'eb-pib-imf')} />
          <BigMetric label="Coste laboral" value={costeLaboral} unit=" €/mes" decimals={0} color="#7c3aed" caption="ETCL trimestral" period={findPeriod(byId, 'eb-etcl-coste-laboral')} />
          <BigMetric label="Inversión %PIB" value={inversion} unit="%" decimals={2} color={colorForValue(inversion, 'high', 22, 18)} caption="capex empresarial" period={findPeriod(byId, 'eb-inversion-bruta')} />
          <BigMetric label="Conf. industrial" value={confianza} unit="" decimals={1} color={colorForValue(confianza, 'high', 0, -10)} caption="balance opiniones" period={findPeriod(byId, 'eb-confianza-empresarial-eurostat')} />
        </div>
        <Interpretation>
          {pib != null && inversion != null
            ? `Ciclo PIB ${pib >= 0 ? '+' : ''}${pib.toFixed(1)}% · inversión ${inversion.toFixed(1)}% PIB. ${pib > 1.5 && inversion > 22 ? 'Tejido empresarial expansivo con capex sólido.' : 'Crecimiento moderado, vigilar capex como anticipador de empleo y márgenes.'}`
            : 'Salud corporativa española · cruzar PIB + capex + costes laborales + confianza para anticipar márgenes y empleo futuro.'}
        </Interpretation>
      </DomainPanel>
    )
  }

  if (subtabSlug === 'hogares-empleo-vivienda') {
    const paro = findValue(byId, 'hev-paro-epa-general')
    const paroJoven = findValue(byId, 'hev-paro-epa-jovenes')
    const ipv = findValue(byId, 'hev-ipv-general')
    const etcl = findValue(byId, 'hev-etcl-coste-laboral')
    const ipc = findValue(byId, 'hev-ipc-anual')
    return (
      <DomainPanel accent={accent} title="Hogares · ¿llega la mejora macro a la vida material?" subtitle="Empleo + salarios + vivienda + inflación cruzados — el termómetro real del bienestar agregado">
        <div style={gridStyle}>
          <BigMetric label="Paro EPA" value={paro} unit="%" decimals={1} color={colorForValue(paro, 'low', 12, 18)} caption="armonizado UE" period={findPeriod(byId, 'hev-paro-epa-general')} />
          <BigMetric label="Paro <25" value={paroJoven} unit="%" decimals={1} color={colorForValue(paroJoven, 'low', 25, 35)} caption="exclusión juvenil" period={findPeriod(byId, 'hev-paro-epa-jovenes')} />
          <BigMetric label="IPV vivienda" value={ipv} unit="" decimals={1} color="#dc2626" caption="precio vivienda" period={findPeriod(byId, 'hev-ipv-general')} />
          <BigMetric label="Coste laboral" value={etcl} unit=" €/mes" decimals={0} color="#0F766E" caption="ETCL salario+cot." period={findPeriod(byId, 'hev-etcl-coste-laboral')} />
          <BigMetric label="IPC YoY" value={ipc} unit="%" decimals={2} color={colorForValue(ipc, 'low', 2, 4)} caption="erosión poder adquisitivo" period={findPeriod(byId, 'hev-ipc-anual')} />
        </div>
        <Interpretation>
          {paro != null && paroJoven != null && ipc != null
            ? `Paro ${paro.toFixed(1)}% · juvenil ${paroJoven.toFixed(1)}% · IPC ${ipc.toFixed(1)}%. ${paro < 14 && paroJoven > 25 ? 'Empleo agregado mejora pero la presión sobre jóvenes y rentas reales sigue activa. Vigilar alquiler/renta y AROPE como termómetros sociales.' : 'Cuadro de hogares · vigilar cruce empleo–vivienda–salarios reales para evaluar si la macro está llegando a la vida material.'}`
            : 'Termómetro de bienestar agregado · empleo + vivienda + salarios reales + percepción CIS. Próximas secciones: segmentos y CIS-cruces (Sprint N4).'}
        </Interpretation>
      </DomainPanel>
    )
  }

  // ─── Sprint F · 5 nuevas subtabs (mantenidas igual) ────────────────────

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
