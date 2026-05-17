/**
 * Análisis integral IA · Bloque 11 del spec.
 *
 * Sin LLM externo (latencia/coste): heurísticas sobre los datos ya recopilados
 * (sentiment + narrativas + preocupaciones + estabilidad + INE + electoral)
 * generan:
 *   - Score de riesgo político 0-100
 *   - Oportunidades detectadas
 *   - Amenazas inmediatas
 *   - Comparativas (vs media nacional CCAA, vs ciclo electoral)
 *   - Top 3 prioridades estratégicas
 */
import type { Narrativa } from './narrativas'
import type { INERentaMedia, INEExtranjeros } from '../sources/ine'
import type { ResultadoEleccion } from '../sources/electoral'

export interface AnalisisIntegral {
  scoreRiesgoPolitico: number   // 0-100 (alto = riesgo alto)
  bandaRiesgo: 'baja' | 'media' | 'alta' | 'crítica'
  oportunidades: string[]
  amenazas: string[]
  prioridadesEstrategicas: string[]
  contextoMacro: string
  alertasSituacionales: string[]
}

const MEDIA_NACIONAL_RENTA_HOGAR = 33500  // INE 2022 aprox
const MEDIA_NACIONAL_EXTRANJEROS = 11.9   // %

interface InputsAnalisis {
  noticiasTotal: number
  sentimientoScore: number
  sentimientoNegativo: number
  preocupaciones: string[]
  narrativas: Narrativa[]
  estabilidadScore: number
  rentaMedia?: INERentaMedia | null
  extranjeros?: INEExtranjeros | null
  historicoElectoral?: ResultadoEleccion[]
  tendenciaSentimiento?: 'up' | 'down' | 'stable'
  nIniciativas?: number
  poblacion?: number
}

export function analizarIntegral(input: InputsAnalisis): AnalisisIntegral {
  // === Score riesgo político (0-100) ===
  // Factores: sentimiento + estabilidad + nº preocupaciones + nº narrativas negativas
  let riesgo = 50
  if (input.sentimientoScore < -0.3) riesgo += 20
  else if (input.sentimientoScore < -0.1) riesgo += 10
  else if (input.sentimientoScore > 0.2) riesgo -= 15
  if (input.estabilidadScore < 4) riesgo += 18
  else if (input.estabilidadScore > 7) riesgo -= 15
  riesgo += Math.min(15, input.preocupaciones.length * 2)
  const narrNeg = input.narrativas.filter(n => n.tono === 'negativo').length
  riesgo += narrNeg * 4
  if (input.tendenciaSentimiento === 'down') riesgo += 8
  else if (input.tendenciaSentimiento === 'up') riesgo -= 6
  riesgo = Math.max(0, Math.min(100, Math.round(riesgo)))
  const bandaRiesgo: 'baja' | 'media' | 'alta' | 'crítica' =
    riesgo < 35 ? 'baja' : riesgo < 55 ? 'media' : riesgo < 75 ? 'alta' : 'crítica'

  // === Oportunidades ===
  const oportunidades: string[] = []
  if (input.sentimientoScore > 0.15) oportunidades.push('Ventana mediática favorable: aprovechar comunicación proactiva')
  if (input.estabilidadScore >= 7) oportunidades.push('Alta estabilidad: contexto adecuado para acuerdos plurianuales')
  if (input.tendenciaSentimiento === 'up') oportunidades.push('Tendencia al alza en cobertura: reforzar narrativa actual')
  if (input.rentaMedia?.rentaMediaHogar && input.rentaMedia.rentaMediaHogar > MEDIA_NACIONAL_RENTA_HOGAR * 1.15)
    oportunidades.push(`Renta media (${input.rentaMedia.rentaMediaHogar.toLocaleString('es-ES')}€) muy por encima de la media nacional`)
  if (input.extranjeros && input.extranjeros.porcentaje > MEDIA_NACIONAL_EXTRANJEROS * 1.3)
    oportunidades.push('Alta diversidad: nicho para políticas de integración y mercado multicultural')
  if (input.nIniciativas && input.nIniciativas > 30) oportunidades.push(`Parlamento activo (${input.nIniciativas} iniciativas): canal abierto para incidencia política`)
  if (oportunidades.length === 0) oportunidades.push('Mantener monitorización para detectar ventanas de oportunidad')

  // === Amenazas ===
  const amenazas: string[] = []
  if (input.sentimientoScore < -0.2) amenazas.push(`Sentimiento mediático negativo (${input.sentimientoScore.toFixed(2)}): riesgo reputacional`)
  if (input.estabilidadScore < 4) amenazas.push(`Inestabilidad detectada (score ${input.estabilidadScore}/10): atención a conflictos abiertos`)
  if (narrNeg >= 2) amenazas.push(`${narrNeg} narrativas críticas activas en cobertura mediática`)
  if (input.preocupaciones.length >= 4) amenazas.push(`Múltiples temas de preocupación simultáneos (${input.preocupaciones.length})`)
  if (input.tendenciaSentimiento === 'down') amenazas.push('Cobertura mediática en deterioro · vigilar próximos 7 días')
  if (input.rentaMedia?.rentaMediaHogar && input.rentaMedia.rentaMediaHogar < MEDIA_NACIONAL_RENTA_HOGAR * 0.75)
    amenazas.push(`Renta media (${input.rentaMedia.rentaMediaHogar.toLocaleString('es-ES')}€) significativamente por debajo de la media`)
  if (amenazas.length === 0) amenazas.push('Sin amenazas críticas detectadas en cobertura reciente')

  // === Prioridades estratégicas ===
  const prioridadesEstrategicas: string[] = []
  // Las 3 preocupaciones más prominentes se traducen en prioridades
  for (const p of input.preocupaciones.slice(0, 3)) {
    prioridadesEstrategicas.push(`Atender: ${p}`)
  }
  // Si hay menos de 3, completa con generales
  if (prioridadesEstrategicas.length < 3) {
    if (input.sentimientoScore < 0) prioridadesEstrategicas.push('Reforzar comunicación institucional')
    if (input.nIniciativas && input.nIniciativas > 20) prioridadesEstrategicas.push('Hacer seguimiento de iniciativas legislativas en tramitación')
    if (prioridadesEstrategicas.length < 3) prioridadesEstrategicas.push('Monitorizar evolución cobertura mediática')
  }

  // === Contexto macro ===
  const partes: string[] = []
  if (input.poblacion) partes.push(`Población de ${input.poblacion.toLocaleString('es-ES')} habitantes`)
  if (input.rentaMedia?.rentaMediaHogar) {
    const ratio = (input.rentaMedia.rentaMediaHogar / MEDIA_NACIONAL_RENTA_HOGAR * 100).toFixed(0)
    partes.push(`renta hogar ${ratio}% de la media nacional`)
  }
  if (input.historicoElectoral && input.historicoElectoral.length > 0) {
    const ult = input.historicoElectoral[input.historicoElectoral.length - 1]
    if (ult) partes.push(`última votación dominada por ${ult.ganador.partido} (${ult.ganador.pct.toFixed(1)}%)`)
  }
  const contextoMacro = partes.length > 0 ? partes.join(' · ') : 'Datos macro limitados'

  // === Alertas situacionales ===
  const alertasSituacionales: string[] = []
  if (bandaRiesgo === 'crítica') alertasSituacionales.push('⚠ ESTADO CRÍTICO · activar protocolo de crisis')
  else if (bandaRiesgo === 'alta') alertasSituacionales.push('⚠ Riesgo alto · seguimiento diario recomendado')
  if (narrNeg >= 3) alertasSituacionales.push('⚠ Múltiples narrativas negativas simultáneas')
  if (input.noticiasTotal > 30 && input.sentimientoScore < -0.2) alertasSituacionales.push('⚠ Pico de cobertura con tono adverso')
  if (input.preocupaciones.length >= 6) alertasSituacionales.push('⚠ Concentración inusual de preocupaciones detectadas')

  return {
    scoreRiesgoPolitico: riesgo,
    bandaRiesgo,
    oportunidades: oportunidades.slice(0, 5),
    amenazas: amenazas.slice(0, 5),
    prioridadesEstrategicas: prioridadesEstrategicas.slice(0, 3),
    contextoMacro,
    alertasSituacionales,
  }
}
