/**
 * Análisis integral IA del sector defensa español.
 *
 * Sin LLM externo: heurísticas estructuradas sobre datos ya recopilados
 * (gasto militar, contratos, OTAN, programas, sanciones).
 *
 * Genera:
 *   - Score de posicionamiento estratégico (0-100)
 *   - Brechas industriales clave
 *   - Oportunidades sectoriales
 *   - Riesgos de cumplimiento
 *   - Briefing diario sintetizado
 *   - Threat Radar (6 dimensiones)
 */

export interface PosicionamientoDefensa {
  score: number                        // 0-100 (alto = bien posicionado)
  banda: 'crítico' | 'rezagado' | 'aceptable' | 'avanzado' | 'líder'
  factores: Array<{ nombre: string; valor: number; peso: number; interpretacion: string }>
  brechasClave: string[]
  oportunidades: string[]
  riesgos: string[]
  prioridades: string[]
  contextoEstrategico: string
}

interface InputsAnalisis {
  gastoPctPib: number | null
  gastoUsdB: number | null
  gapOtanPp: number | null              // diferencia vs 2%
  compromisoOtanPct: number             // 2 o 5
  nContratosUltimos90d: number
  importeContratos90dM: number
  nSancionesRelevantes: number
  nProgramasActivos: number
  nProgramasEnRiesgo: number
  cumplenOtanPct: number                // % países OTAN que cumplen 2%
  mediaOtan: number
}

export function analizarPosicionamientoDefensa(input: InputsAnalisis): PosicionamientoDefensa {
  // === Factores ponderados (suma de pesos = 100) ===
  // 1. Compromiso OTAN (30%)
  const gastoPib = input.gastoPctPib ?? 0
  const factorOtan = Math.min(100, (gastoPib / 2.0) * 100)

  // 2. Volumen contratación reciente (20%) — proxy de actividad industrial
  const factorContratacion = Math.min(100, (input.nContratosUltimos90d / 30) * 100)

  // 3. Programas activos vs en riesgo (20%)
  const totalProgramas = input.nProgramasActivos + input.nProgramasEnRiesgo
  const factorProgramas = totalProgramas > 0
    ? (input.nProgramasActivos / totalProgramas) * 100
    : 50

  // 4. Posicionamiento vs OTAN (15%)
  const factorRelativo = gastoPib > 0 && input.mediaOtan > 0
    ? Math.min(100, (gastoPib / input.mediaOtan) * 80)
    : 50

  // 5. Gasto absoluto (15%) — capacidad inversora
  const factorAbsoluto = input.gastoUsdB ? Math.min(100, (input.gastoUsdB / 30) * 100) : 0

  const score = Math.round(
    factorOtan * 0.30 +
    factorContratacion * 0.20 +
    factorProgramas * 0.20 +
    factorRelativo * 0.15 +
    factorAbsoluto * 0.15
  )

  const banda: PosicionamientoDefensa['banda'] =
    score >= 80 ? 'líder' :
    score >= 65 ? 'avanzado' :
    score >= 50 ? 'aceptable' :
    score >= 30 ? 'rezagado' :
                  'crítico'

  // === Factores con interpretación ===
  const factores = [
    {
      nombre: 'Compromiso OTAN',
      valor: Math.round(factorOtan),
      peso: 30,
      interpretacion: gastoPib >= 2.0
        ? `Cumple el 2% PIB (${gastoPib.toFixed(2)}%)`
        : `Brecha de ${input.gapOtanPp?.toFixed(2) || '?'} pp para alcanzar el 2%`,
    },
    {
      nombre: 'Actividad contratación',
      valor: Math.round(factorContratacion),
      peso: 20,
      interpretacion: `${input.nContratosUltimos90d} contratos en 90d · ${input.importeContratos90dM.toFixed(0)} M€`,
    },
    {
      nombre: 'Programas estratégicos',
      valor: Math.round(factorProgramas),
      peso: 20,
      interpretacion: `${input.nProgramasActivos} activos · ${input.nProgramasEnRiesgo} en riesgo`,
    },
    {
      nombre: 'Posición vs OTAN',
      valor: Math.round(factorRelativo),
      peso: 15,
      interpretacion: input.mediaOtan > 0
        ? `${gastoPib >= input.mediaOtan ? 'Por encima' : 'Por debajo'} de la media OTAN (${input.mediaOtan.toFixed(2)}%)`
        : 'Sin datos comparativos',
    },
    {
      nombre: 'Capacidad inversora',
      valor: Math.round(factorAbsoluto),
      peso: 15,
      interpretacion: input.gastoUsdB ? `${input.gastoUsdB.toFixed(1)} bUSD anuales` : 'Sin datos',
    },
  ]

  // === Brechas clave ===
  const brechasClave: string[] = []
  if (gastoPib < 2.0) brechasClave.push(`Brecha ${input.gapOtanPp?.toFixed(2)} pp para el objetivo OTAN del 2% PIB`)
  if (gastoPib < input.mediaOtan && input.mediaOtan > 0) brechasClave.push(`Gasto inferior a la media OTAN (${input.mediaOtan.toFixed(2)}% vs ${gastoPib.toFixed(2)}%)`)
  if (input.nProgramasEnRiesgo > input.nProgramasActivos * 0.3) brechasClave.push(`${input.nProgramasEnRiesgo} programas estratégicos en riesgo`)
  if (input.compromisoOtanPct === 5) brechasClave.push('Nuevo objetivo OTAN 5% PIB (2024): brecha actual estructural')
  if (input.nContratosUltimos90d < 5) brechasClave.push('Baja densidad de contratación reciente')
  if (brechasClave.length === 0) brechasClave.push('Sin brechas estructurales mayores detectadas')

  // === Oportunidades ===
  const oportunidades: string[] = []
  if (gastoPib >= 1.5 && gastoPib < 2.0) oportunidades.push('Trayectoria de aumento de gasto: ventana para ganar cuota industrial')
  if (input.compromisoOtanPct === 5 && gastoPib < 2.5) oportunidades.push('Compromiso 5% OTAN: triplicación potencial del mercado nacional')
  if (input.nProgramasActivos >= 5) oportunidades.push('Múltiples programas en curso: oportunidades de subcontratación tier-1/2')
  if (input.nContratosUltimos90d > 20) oportunidades.push('Alta actividad licitatoria: ventana competitiva activa')
  if (oportunidades.length === 0) oportunidades.push('Monitorizar evolución licitatoria para detectar nichos')

  // === Riesgos ===
  const riesgos: string[] = []
  if (input.nSancionesRelevantes > 0) riesgos.push(`${input.nSancionesRelevantes} entidades sancionadas detectadas: riesgo compliance proveedores`)
  if (input.nProgramasEnRiesgo >= 3) riesgos.push('Concentración de programas en riesgo: posibles cancelaciones')
  if (gastoPib < 1.5) riesgos.push('Gasto militar bajo: limitada autonomía estratégica')
  if (input.cumplenOtanPct < 50) riesgos.push('Más del 50% de aliados OTAN no cumplen 2%: presión política por equiparación')
  if (riesgos.length === 0) riesgos.push('Riesgo de cumplimiento bajo en el contexto actual')

  // === Prioridades estratégicas ===
  const prioridades: string[] = []
  if (gastoPib < 2.0) prioridades.push('Acelerar plan de inversión hacia el 2% PIB OTAN')
  if (input.nProgramasEnRiesgo >= 2) prioridades.push(`Estabilizar ${input.nProgramasEnRiesgo} programas en riesgo (FCAS, Tigre, PERTE)`)
  prioridades.push('Reforzar capacidades soberanas en ciber, espacio y autonomía')
  if (input.compromisoOtanPct === 5) prioridades.push('Diseñar roadmap industrial al 5% PIB (2024-2035)')

  // === Contexto estratégico ===
  const tono = banda === 'líder' ? 'En la vanguardia' :
               banda === 'avanzado' ? 'Posición sólida' :
               banda === 'aceptable' ? 'Posición intermedia' :
               banda === 'rezagado' ? 'Posición rezagada' : 'Situación crítica'
  const contextoEstrategico = `${tono} dentro de la OTAN con ${gastoPib.toFixed(2)}% PIB en defensa. ` +
    `${input.nProgramasActivos} programas estratégicos activos y ${input.nContratosUltimos90d} contratos en los últimos 90 días. ` +
    `Media aliados: ${input.mediaOtan.toFixed(2)}%. ` +
    `${input.cumplenOtanPct}% de aliados cumplen el objetivo del 2%.`

  return {
    score, banda, factores,
    brechasClave: brechasClave.slice(0, 5),
    oportunidades: oportunidades.slice(0, 4),
    riesgos: riesgos.slice(0, 4),
    prioridades: prioridades.slice(0, 4),
    contextoEstrategico,
  }
}

// ─── THREAT RADAR ────────────────────────────────────────────────────────

export interface ThreatRadarDimension {
  dimension: string
  nivel: number              // 0-100
  banda: 'baja' | 'media' | 'elevada' | 'alta' | 'crítica'
  factores: string[]
  color: string
}

export interface ThreatRadar {
  dimensiones: ThreatRadarDimension[]
  nivelGlobal: number
  fechaCalculo: string
}

/**
 * Calcula el Threat Radar de 6 dimensiones a partir de datos contextuales.
 * No requiere datos en vivo de GDELT/ACLED; se basa en estado actual
 * conocido del entorno geopolítico 2024-2026 + señales del módulo.
 */
export function calcularThreatRadar(input: {
  nSancionesRusia: number
  programasCiber: number
  contratosCiber90d: number
  paisesAltoRiesgo: number
}): ThreatRadar {
  // Dimensiones basadas en doctrina OTAN: 6 dominios operacionales
  const dimensiones: ThreatRadarDimension[] = [
    {
      dimension: 'Ciberespacio',
      nivel: Math.min(100, 65 + input.contratosCiber90d * 2 + input.programasCiber * 3),
      banda: 'alta',
      factores: ['Aumento ataques estatales', 'Mando Conjunto Ciberespacio activo', 'INCIBE-CERT 24/7'],
      color: '#16A34A',
    },
    {
      dimension: 'Espacial',
      nivel: 55,
      banda: 'elevada',
      factores: ['Spainsat NG operativo', 'Paz/Ingenio observación', 'CESAEROD coordinación'],
      color: '#7C3AED',
    },
    {
      dimension: 'Marítimo',
      nivel: 70,
      banda: 'alta',
      factores: ['Tensión Mediterráneo + Atlántico', 'Programa F-110 + BAM IS', 'Vigilancia Estrecho'],
      color: '#0EA5E9',
    },
    {
      dimension: 'Aéreo',
      nivel: 60,
      banda: 'elevada',
      factores: ['Defensa aérea OTAN', 'NASAMS + Patriot', 'Programa FCAS'],
      color: '#F97316',
    },
    {
      dimension: 'Terrestre',
      nivel: 50,
      banda: 'media',
      factores: ['Programa VCR Dragón', 'Tigre HAD operativo', 'Brigada VJTF OTAN'],
      color: '#5D4037',
    },
    {
      dimension: 'Híbrido',
      nivel: Math.min(100, 75 + input.nSancionesRusia * 0.5 + input.paisesAltoRiesgo * 2),
      banda: 'crítica',
      factores: ['Desinformación Rusia/Irán', 'Subversión digital', 'Coerción económica'],
      color: '#DC2626',
    },
  ]

  // Recalcular bandas según nivel
  for (const d of dimensiones) {
    d.nivel = Math.round(d.nivel)
    d.banda = d.nivel >= 85 ? 'crítica' : d.nivel >= 70 ? 'alta' : d.nivel >= 55 ? 'elevada' : d.nivel >= 35 ? 'media' : 'baja'
  }

  const nivelGlobal = Math.round(dimensiones.reduce((s, d) => s + d.nivel, 0) / dimensiones.length)

  return { dimensiones, nivelGlobal, fechaCalculo: new Date().toISOString() }
}

// ─── BRIEFING DIARIO ────────────────────────────────────────────────────

export interface BriefingDiario {
  fecha: string
  titulo: string
  resumen: string
  highlights: Array<{ icono: string; texto: string }>
  recomendaciones: string[]
  fuentes: string[]
}

interface InputsBriefing {
  posicionamiento: PosicionamientoDefensa
  threatRadar: ThreatRadar
  topContrato?: { objeto: string; importe?: number; adjudicatario?: string; fuente_label: string }
  topSancion?: { nombre: string; programa?: string }
  programaCritico?: { nombre: string; estado: string }
}

export function generarBriefingDiario(input: InputsBriefing): BriefingDiario {
  const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const dimensionMax = input.threatRadar.dimensiones.reduce((max, d) => d.nivel > max.nivel ? d : max)

  const highlights: Array<{ icono: string; texto: string }> = []
  if (input.topContrato) {
    const imp = input.topContrato.importe ? `${(input.topContrato.importe / 1_000_000).toFixed(1)} M€` : 'importe no público'
    highlights.push({
      icono: '◈',
      texto: `Mayor contrato reciente: ${input.topContrato.objeto.slice(0, 80)}${input.topContrato.objeto.length > 80 ? '…' : ''} (${imp}, ${input.topContrato.fuente_label})`,
    })
  }
  highlights.push({
    icono: '◉',
    texto: `Amenaza prioritaria: ${dimensionMax.dimension} (nivel ${dimensionMax.nivel}/100 · ${dimensionMax.banda})`,
  })
  if (input.topSancion) {
    highlights.push({
      icono: '⚠',
      texto: `Nueva entidad sancionada relevante: ${input.topSancion.nombre}${input.topSancion.programa ? ` (${input.topSancion.programa})` : ''}`,
    })
  }
  if (input.programaCritico) {
    highlights.push({
      icono: '⚙',
      texto: `Programa a vigilar: ${input.programaCritico.nombre} · estado ${input.programaCritico.estado}`,
    })
  }
  highlights.push({
    icono: '★',
    texto: `Score de posicionamiento estratégico: ${input.posicionamiento.score}/100 (${input.posicionamiento.banda})`,
  })

  const recomendaciones: string[] = []
  if (input.posicionamiento.prioridades.length > 0) recomendaciones.push(...input.posicionamiento.prioridades.slice(0, 3))
  if (dimensionMax.banda === 'crítica') recomendaciones.push(`Reforzar capacidades en dominio ${dimensionMax.dimension}`)
  if (input.posicionamiento.riesgos.length > 0) recomendaciones.push(`Mitigar: ${input.posicionamiento.riesgos[0]}`)

  const resumen = `${input.posicionamiento.contextoEstrategico} Nivel global de amenaza ${input.threatRadar.nivelGlobal}/100, ` +
    `con ${dimensionMax.dimension.toLowerCase()} como dominio de mayor exposición. ` +
    (input.programaCritico ? `Atención a ${input.programaCritico.nombre}.` : '')

  return {
    fecha: hoy,
    titulo: `Briefing diario · Defensa España · ${hoy}`,
    resumen,
    highlights,
    recomendaciones: recomendaciones.slice(0, 4),
    fuentes: ['Banco Mundial', 'NATO Annual Report', 'PLACSP', 'TED EU', 'USASpending DoD', 'OpenSanctions', 'OCCAR'],
  }
}

// ─── PROYECCIONES PRESUPUESTARIAS ────────────────────────────────────────

export interface ProyeccionPresupuesto {
  serieHistorica: Array<{ year: number; valor: number }>
  proyecciones: Array<{ year: number; tendencial: number; objetivo2: number; objetivo5: number }>
  fechaAlcance2pct: number | null
  fechaAlcance5pct: number | null
  cagr: number                  // Compound Annual Growth Rate
  brechaActual2pct: number
  brechaActual5pct: number
}

/**
 * Proyección presupuestaria basada en CAGR de los últimos N años.
 * Genera escenarios:
 *   - Tendencial (CAGR observado)
 *   - Trayectoria al 2% en 5 años
 *   - Trayectoria al 5% en 10 años
 */
export function proyectarPresupuesto(
  serie: Array<{ year: number; pct_pib: number | null }>,
  añoHasta = 2030,
): ProyeccionPresupuesto {
  const limpia = serie.filter(p => p.pct_pib != null).map(p => ({ year: p.year, valor: p.pct_pib! }))
  if (limpia.length < 5) {
    return {
      serieHistorica: limpia,
      proyecciones: [],
      fechaAlcance2pct: null, fechaAlcance5pct: null,
      cagr: 0, brechaActual2pct: 2, brechaActual5pct: 5,
    }
  }

  // CAGR últimos 5 años
  const last5 = limpia.slice(-5)
  const cagr = Math.pow(last5[last5.length - 1].valor / last5[0].valor, 1 / 4) - 1

  const ultimoAño = limpia[limpia.length - 1].year
  const ultimoValor = limpia[limpia.length - 1].valor

  const proyecciones: ProyeccionPresupuesto['proyecciones'] = []
  let valorTendencial = ultimoValor

  // Trayectorias al 2% y 5% — interpolación lineal
  const añosAl2 = 5  // alcance en 5 años
  const añosAl5 = 10 // alcance en 10 años
  const incrAnual2 = (2.0 - ultimoValor) / añosAl2
  const incrAnual5 = (5.0 - ultimoValor) / añosAl5

  let fechaAlcance2pct: number | null = null
  let fechaAlcance5pct: number | null = null

  for (let y = ultimoAño + 1; y <= añoHasta; y++) {
    valorTendencial = +(valorTendencial * (1 + cagr)).toFixed(2)
    const dy = y - ultimoAño
    const objetivo2 = Math.min(2.5, +(ultimoValor + incrAnual2 * dy).toFixed(2))
    const objetivo5 = Math.min(6, +(ultimoValor + incrAnual5 * dy).toFixed(2))
    proyecciones.push({ year: y, tendencial: valorTendencial, objetivo2, objetivo5 })
    if (!fechaAlcance2pct && valorTendencial >= 2.0) fechaAlcance2pct = y
    if (!fechaAlcance5pct && valorTendencial >= 5.0) fechaAlcance5pct = y
  }

  return {
    serieHistorica: limpia,
    proyecciones,
    fechaAlcance2pct,
    fechaAlcance5pct,
    cagr: +(cagr * 100).toFixed(2),
    brechaActual2pct: +(2.0 - ultimoValor).toFixed(2),
    brechaActual5pct: +(5.0 - ultimoValor).toFixed(2),
  }
}

// ─── CONCENTRACIÓN DE MERCADO ────────────────────────────────────────────

export interface ConcentracionContratacion {
  hhi: number                  // Herfindahl-Hirschman Index (0-10000)
  bandaHHI: 'fragmentado' | 'moderado' | 'concentrado' | 'altamente concentrado'
  topAdjudicatarios: Array<{ nombre: string; importeM: number; nContratos: number; cuota: number }>
  porFuente: Record<string, { nContratos: number; importeM: number; cuota: number }>
  totalImporteM: number
  totalContratos: number
  conImporte: number
}

/**
 * Calcula concentración de mercado tipo HHI sobre contratos.
 * HHI < 1500: fragmentado
 * HHI 1500-2500: moderado
 * HHI 2500-4000: concentrado
 * HHI > 4000: altamente concentrado
 */
export function calcularConcentracion(contratos: Array<{
  adjudicatario?: string
  importe_adjudicacion?: number
  importe_licitacion?: number
  fuente: string
  fuente_label: string
}>): ConcentracionContratacion {
  const conImporte = contratos.filter(c => c.importe_adjudicacion || c.importe_licitacion)
  const totalImporte = conImporte.reduce((s, c) => s + (c.importe_adjudicacion || c.importe_licitacion || 0), 0)

  // Agrupar por adjudicatario
  const porEmpresa: Record<string, { importe: number; nContratos: number }> = {}
  for (const c of conImporte) {
    const nom = c.adjudicatario?.trim() || 'No especificado'
    const imp = c.importe_adjudicacion || c.importe_licitacion || 0
    if (!porEmpresa[nom]) porEmpresa[nom] = { importe: 0, nContratos: 0 }
    porEmpresa[nom].importe += imp
    porEmpresa[nom].nContratos++
  }

  // HHI: suma de (cuota%)^2
  let hhi = 0
  if (totalImporte > 0) {
    for (const e of Object.values(porEmpresa)) {
      const cuota = (e.importe / totalImporte) * 100
      hhi += cuota * cuota
    }
  }
  hhi = Math.round(hhi)
  const bandaHHI: ConcentracionContratacion['bandaHHI'] =
    hhi >= 4000 ? 'altamente concentrado' :
    hhi >= 2500 ? 'concentrado' :
    hhi >= 1500 ? 'moderado' :
                  'fragmentado'

  const topAdjudicatarios = Object.entries(porEmpresa)
    .map(([nombre, v]) => ({
      nombre: nombre.length > 50 ? nombre.slice(0, 49) + '…' : nombre,
      importeM: +(v.importe / 1_000_000).toFixed(2),
      nContratos: v.nContratos,
      cuota: totalImporte > 0 ? +(v.importe / totalImporte * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.importeM - a.importeM)
    .slice(0, 10)

  // Por fuente
  const porFuente: Record<string, { nContratos: number; importeM: number; cuota: number }> = {}
  for (const c of contratos) {
    const imp = c.importe_adjudicacion || c.importe_licitacion || 0
    if (!porFuente[c.fuente_label]) porFuente[c.fuente_label] = { nContratos: 0, importeM: 0, cuota: 0 }
    porFuente[c.fuente_label].nContratos++
    porFuente[c.fuente_label].importeM += imp / 1_000_000
  }
  for (const k of Object.keys(porFuente)) {
    porFuente[k].importeM = +porFuente[k].importeM.toFixed(2)
    porFuente[k].cuota = totalImporte > 0 ? +(porFuente[k].importeM * 1_000_000 / totalImporte * 100).toFixed(1) : 0
  }

  return {
    hhi, bandaHHI,
    topAdjudicatarios,
    porFuente,
    totalImporteM: +(totalImporte / 1_000_000).toFixed(2),
    totalContratos: contratos.length,
    conImporte: conImporte.length,
  }
}
