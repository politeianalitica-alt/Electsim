/**
 * Extraccion determinista de pliegos de licitacion.
 * Sprint TS-Deep B2.
 *
 * Capa de regex que extrae campos estructurados del texto plano
 * de un pliego (PCAP/PPT/anuncio) ANTES de enviar nada al LLM.
 *
 * El LLM solo se usa para:
 * - resumir objeto
 * - interpretar elegibilidad ambigua
 * - sintetizar riesgos
 * - redactar recomendacion
 *
 * Si el regex encuentra un campo, se marca en evidencia.campos_extraidos_por_regex.
 * Si el LLM encuentra un campo que el regex no encontro, se marca en
 * evidencia.campos_extraidos_por_llm.
 * Si ambos encuentran un campo pero discrepan, se marca conflicto.
 *
 * Regla: "no declares apto si no puedes ensenar evidencia".
 */

import type {
  CriterioAdjudicacion,
  CriterioTipo,
  EconomiaInfo,
  ElegibilidadInfo,
  ExpedienteInfo,
  LoteInfo,
  PlazosInfo,
  SolvenciaInfo,
  TipoDocumentoPliego,
  ClausulasSocialesInfo,
  GarantiasInfo,
} from './analizar-types'

// ─── Document classification ────────────────────────────────────────

/** Classify a document by its filename/title into pliego types. */
export function classifyDocumento(nombre: string): TipoDocumentoPliego {
  const n = (nombre || '').toLowerCase()
  if (/pcap|clausulas?\s*administrativas?|pliego.*administrativ/i.test(n)) return 'pcap'
  if (/ppt|prescripciones?\s*t[eé]cnicas?|pliego.*t[eé]cnic/i.test(n)) return 'ppt'
  if (/anuncio|publicaci[oó]n|boe|diari|bolet[ií]n/i.test(n)) return 'anuncio'
  if (/anexo/i.test(n)) return 'anexo'
  if (/memoria|justificativa|descriptiva/i.test(n)) return 'memoria'
  if (/deuc|espd|documento.*europeo.*[uú]nico/i.test(n)) return 'deuc'
  return 'otro'
}

/** Priority order for analysis: PCAP first, then PPT, then others. */
export function prioritizeDocuments(
  docs: { nombre: string; url: string; tipo_clasificado?: TipoDocumentoPliego }[],
): typeof docs {
  const order: Record<TipoDocumentoPliego, number> = {
    pcap: 0,
    ppt: 1,
    anuncio: 2,
    memoria: 3,
    anexo: 4,
    deuc: 5,
    otro: 6,
  }
  return docs
    .map((d) => ({ ...d, tipo_clasificado: d.tipo_clasificado || classifyDocumento(d.nombre) }))
    .sort((a, b) => (order[a.tipo_clasificado!] ?? 9) - (order[b.tipo_clasificado!] ?? 9))
}

// ─── Spanish number parsing ─────────────────────────────────────────

/** Parse Spanish-format number: 1.234.567,89 → 1234567.89 */
export function parseSpanishNumber(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isFinite(n) && n > 0 ? n : null
}

// ─── CPV extraction ─────────────────────────────────────────────────

/** Extract CPV codes from text. Returns unique codes. */
export function extractCpv(text: string): string[] {
  if (!text) return []
  // CPV format: 8 digits + optional check digit (e.g., 85311000-3)
  const rx = /\b(\d{8})(?:-\d)?\b/g
  const found = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = rx.exec(text)) !== null) {
    const code = m[1]
    // Valid CPV codes start with specific divisions (03-98)
    const div = parseInt(code.slice(0, 2), 10)
    if (div >= 3 && div <= 98) found.add(code)
  }
  return [...found]
}

// ─── Budget extraction ──────────────────────────────────────────────

/**
 * Extract presupuesto base and valor estimado from text.
 * Looks for specific Spanish procurement terms.
 */
export function extractBudget(text: string): {
  presupuesto_base_eur: number | null
  valor_estimado_eur: number | null
} {
  let presupuesto_base_eur: number | null = null
  let valor_estimado_eur: number | null = null

  if (!text) return { presupuesto_base_eur, valor_estimado_eur }

  // Presupuesto base de licitacion
  const pblRx =
    /presupuesto\s+(?:base\s+)?(?:de\s+)?licitaci[oó]n[^0-9]*?([0-9][0-9.,]*)\s*(?:euros?|EUR|€)/gi
  const pblMatch = pblRx.exec(text)
  if (pblMatch) presupuesto_base_eur = parseSpanishNumber(pblMatch[1])

  // Valor estimado del contrato
  const veRx =
    /valor\s+estimado[^0-9]*?([0-9][0-9.,]*)\s*(?:euros?|EUR|€)/gi
  const veMatch = veRx.exec(text)
  if (veMatch) valor_estimado_eur = parseSpanishNumber(veMatch[1])

  // Fallback: "importe" if no specific found
  if (!presupuesto_base_eur && !valor_estimado_eur) {
    const impRx = /importe[^0-9]*?([0-9][0-9.,]*)\s*(?:euros?|EUR|€)/gi
    const impMatch = impRx.exec(text)
    if (impMatch) presupuesto_base_eur = parseSpanishNumber(impMatch[1])
  }

  return { presupuesto_base_eur, valor_estimado_eur }
}

// ─── Deadline extraction ────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04',
  mayo: '05', junio: '06', julio: '07', agosto: '08',
  septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
}

/** Extract presentation deadline from pliego text. */
export function extractPlazo(text: string): PlazosInfo {
  const result: PlazosInfo = {
    presentacion: null,
    apertura: null,
    ejecucion: null,
    dias_restantes: null,
  }
  if (!text) return result

  // Presentacion: "plazo de presentacion de ofertas: hasta el DD/MM/YYYY"
  // The [^0-9]*? allows filler words like "de ofertas:" between keyword and date
  const patterns = [
    /(?:plazo.*presentaci[oó]n|fecha.*l[ií]mite.*presentaci[oó]n|presentar.*(?:hasta|antes))[^0-9]*?(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/i,
    /(?:plazo.*presentaci[oó]n|fecha.*l[ií]mite.*presentaci[oó]n|presentar.*(?:hasta|antes))[^0-9]*?(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,
    /(?:plazo.*presentaci[oó]n|fecha.*l[ií]mite)[^0-9]*?(20\d{2}-\d{2}-\d{2})/i,
  ]

  for (const rx of patterns) {
    const m = rx.exec(text)
    if (m) {
      let dateStr: string | null = null
      if (m.length === 2) {
        // ISO
        dateStr = m[1]
      } else if (m.length === 4) {
        const [, dd, mmOrMonth, yyyy] = m
        const mm = MONTH_MAP[mmOrMonth.toLowerCase()] || mmOrMonth.padStart(2, '0')
        dateStr = `${yyyy}-${mm}-${dd.padStart(2, '0')}`
      }
      if (dateStr) {
        const d = new Date(dateStr)
        if (!isNaN(d.getTime())) {
          result.presentacion = d.toISOString().slice(0, 10)
          result.dias_restantes = Math.ceil(
            (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          )
          break
        }
      }
    }
  }

  // Ejecucion: "plazo de ejecucion: N meses/dias"
  const ejRx = /plazo.*ejecuci[oó]n[:\s]*(\d+)\s*(meses?|d[ií]as?|a[nñ]os?)/i
  const ejM = ejRx.exec(text)
  if (ejM) {
    result.ejecucion = `${ejM[1]} ${ejM[2]}`
  }

  return result
}

// ─── Criteria extraction ────────────────────────────────────────────

function classifyCriterio(nombre: string): CriterioTipo {
  const n = nombre.toLowerCase()
  if (/precio|oferta.*econ[oó]mica|baja|rebaja/i.test(n)) return 'precio'
  if (/social|inserci[oó]n|discapacidad|igualdad|conciliaci[oó]n/i.test(n)) return 'social'
  if (/medioambiental|sostenibilidad|ecol[oó]gic|verde/i.test(n)) return 'medioambiental'
  if (/experiencia|equipo.*trabajo|personal|curriculum/i.test(n)) return 'experiencia'
  if (/calidad|t[eé]cnic|memoria|proyecto|metodolog[ií]a|propuesta/i.test(n)) return 'calidad'
  return 'otro'
}

/** Extract adjudication criteria with weights. */
export function extractCriterios(text: string): CriterioAdjudicacion[] {
  if (!text) return []
  const criterios: CriterioAdjudicacion[] = []

  // Pattern: "Criterio N: Nombre ... peso/puntuacion: NN puntos"
  const rx =
    /(?:criterio|concepto)[^:]*?[:.]?\s*([^\n.]+?)(?:\s*[-–:]\s*|\s+)(\d+)\s*(?:puntos?|%|pts)/gi
  let m: RegExpExecArray | null
  while ((m = rx.exec(text)) !== null) {
    const nombre = m[1].trim()
    const peso = parseInt(m[2], 10)
    if (nombre.length > 3 && nombre.length < 200 && isFinite(peso) && peso > 0) {
      criterios.push({ nombre, peso, tipo: classifyCriterio(nombre) })
    }
  }

  // Alternative: table-like "Oferta economica 60 puntos, Calidad tecnica 40 puntos"
  if (criterios.length === 0) {
    const altRx = /([A-ZÀ-ÿ][^0-9\n]{5,60}?)\s+(\d{1,3})\s*(?:puntos?|%|pts)/g
    while ((m = altRx.exec(text)) !== null) {
      const nombre = m[1].trim()
      const peso = parseInt(m[2], 10)
      if (nombre.length > 5 && peso > 0 && peso <= 100) {
        criterios.push({ nombre, peso, tipo: classifyCriterio(nombre) })
      }
    }
  }

  return criterios
}

// ─── Solvencia extraction ───────────────────────────────────────────

/** Extract solvency requirements. */
export function extractSolvencia(text: string): SolvenciaInfo {
  const result: SolvenciaInfo = {
    economica: null,
    economica_importe_min_eur: null,
    tecnica: null,
    experiencia_previa: null,
    personal_minimo: null,
    certificados: [],
  }
  if (!text) return result

  // Economic solvency
  const ecoRx =
    /solvencia\s+econ[oó]mica[^.]*?(?:cifra.*negocios|volumen.*anual|facturaci[oó]n)[^0-9]*?([0-9][0-9.,]*)\s*(?:euros?|EUR|€)/i
  const ecoM = ecoRx.exec(text)
  if (ecoM) {
    result.economica_importe_min_eur = parseSpanishNumber(ecoM[1])
    result.economica = `Cifra de negocios minima: ${ecoM[1]} EUR`
  }

  // Technical solvency
  const tecRx =
    /solvencia\s+t[eé]cnica[^.]*?((?:experiencia|trabajos|servicios|contratos)[^.]{10,200})/i
  const tecM = tecRx.exec(text)
  if (tecM) result.tecnica = tecM[1].trim().slice(0, 300)

  // Experience
  const expRx =
    /(?:experiencia.*(?:previa|m[ií]nima)|trabajos.*realizados)[^.]*?(\d+)\s*(?:a[nñ]os?|contratos?|servicios?)/i
  const expM = expRx.exec(text)
  if (expM) result.experiencia_previa = expM[0].trim().slice(0, 200)

  // Personal minimo
  const persRx = /(?:personal|equipo|plantilla)\s*m[ií]nim[oa][^.]*?(\d+)/i
  const persM = persRx.exec(text)
  if (persM) result.personal_minimo = persM[0].trim().slice(0, 200)

  // Certificados
  const certPatterns = [
    /ISO\s*\d{4,5}/gi,
    /UNE[- ]EN[- ]\d+/gi,
    /EFQM/gi,
    /certificad[oa]\s+(?:de\s+)?calidad/gi,
    /sistema.*gesti[oó]n.*(?:calidad|ambiental|seguridad)/gi,
  ]
  for (const rx of certPatterns) {
    let cm: RegExpExecArray | null
    while ((cm = rx.exec(text)) !== null) {
      result.certificados.push(cm[0].trim())
    }
  }

  return result
}

// ─── Elegibilidad extraction ────────────────────────────────────────

/** Extract eligibility requirements. */
export function extractElegibilidad(text: string): ElegibilidadInfo {
  const result: ElegibilidadInfo = {
    admite_entidades_sin_animo_lucro: null,
    requiere_clasificacion_empresarial: null,
    requiere_ute: null,
    permite_subcontratacion: null,
    exige_inscripcion_registro: [],
    restricciones_territoriales: [],
  }
  if (!text) return result

  // Nonprofit eligibility
  if (/entidad(?:es)?\s+sin\s+[aá]nimo\s+de\s+lucro/i.test(text)) {
    // Check if it's "admite" or "no admite"
    if (/no\s+(?:se\s+)?admit(?:e|ir[aá]n?)\s+.*sin\s+[aá]nimo/i.test(text)) {
      result.admite_entidades_sin_animo_lucro = false
    } else {
      result.admite_entidades_sin_animo_lucro = true
    }
  }
  if (/persona(?:s)?\s+jur[ií]dica(?:s)?.*(?:p[uú]blica|privada)/i.test(text)) {
    // Generic: any legal entity — likely admits nonprofits
    if (result.admite_entidades_sin_animo_lucro === null) {
      result.admite_entidades_sin_animo_lucro = true
    }
  }

  // Clasificacion empresarial
  if (/clasificaci[oó]n\s+empresarial/i.test(text)) {
    result.requiere_clasificacion_empresarial = true
    // Check if not required
    if (/no\s+(?:se\s+)?exig(?:e|ir[aá])\s+clasificaci[oó]n/i.test(text)) {
      result.requiere_clasificacion_empresarial = false
    }
  }

  // UTE
  if (/uni[oó]n\s+temporal/i.test(text)) {
    if (/no\s+(?:se\s+)?admitir[aá]n?\s+.*uni[oó]n\s+temporal/i.test(text)) {
      result.requiere_ute = false
    } else {
      result.requiere_ute = null // mentioned but not clear if required
    }
  }

  // Subcontratacion
  if (/subcontrataci[oó]n/i.test(text)) {
    if (/(?:no\s+)?(?:se\s+)?permit(?:e|ir[aá])\s+(?:la\s+)?subcontrataci[oó]n/i.test(text)) {
      result.permite_subcontratacion = !/no\s+(?:se\s+)?permit/i.test(text)
    }
  }

  // Registros
  const regRx =
    /inscri(?:pci[oó]n|t[oa])\s+(?:en\s+(?:el\s+)?)?(?:registro|ROLECE|RELI|REA)[^.]{5,100}/gi
  let rm: RegExpExecArray | null
  while ((rm = regRx.exec(text)) !== null) {
    result.exige_inscripcion_registro.push(rm[0].trim().slice(0, 150))
  }

  return result
}

// ─── Garantias extraction ───────────────────────────────────────────

export function extractGarantias(text: string): GarantiasInfo {
  const result: GarantiasInfo = { provisional: null, definitiva: null }
  if (!text) return result

  const provRx =
    /garant[ií]a\s+provisional[^.]*?([0-9][0-9.,]*)\s*(?:euros?|EUR|€|%)/i
  const provM = provRx.exec(text)
  if (provM) result.provisional = provM[0].trim().slice(0, 200)

  const defRx =
    /garant[ií]a\s+definitiva[^.]*?([0-9][0-9.,]*)\s*(?:euros?|EUR|€|%)/i
  const defM = defRx.exec(text)
  if (defM) result.definitiva = defM[0].trim().slice(0, 200)

  return result
}

// ─── Clausulas sociales ─────────────────────────────────────────────

export function extractClausulasSociales(text: string): ClausulasSocialesInfo {
  const result: ClausulasSocialesInfo = {
    tiene_clausulas_sociales: false,
    resumen: null,
    evidencias: [],
  }
  if (!text) return result

  const socialPatterns = [
    /cl[aá]usula(?:s)?\s+social(?:es)?/i,
    /condici[oó]n(?:es)?\s+(?:especial(?:es)?\s+)?(?:de\s+)?ejecuci[oó]n\s+(?:de\s+)?car[aá]cter\s+social/i,
    /inserci[oó]n\s+(?:socio)?laboral/i,
    /contrataci[oó]n\s+(?:de\s+)?persona(?:s)?\s+(?:con\s+)?(?:discapacidad|en\s+(?:situaci[oó]n\s+)?exclusi[oó]n)/i,
    /subcontrataci[oó]n\s+(?:a|con)\s+(?:empresa(?:s)?\s+de\s+inserci[oó]n|centro(?:s)?\s+especial)/i,
    /igualdad\s+(?:de\s+)?(?:oportunidades|g[eé]nero)/i,
    /plan\s+de\s+igualdad/i,
    /reserva(?:do)?\s+(?:a|para)\s+(?:centro(?:s)?\s+especial|empresa(?:s)?\s+de\s+inserci[oó]n)/i,
  ]

  for (const rx of socialPatterns) {
    const m = rx.exec(text)
    if (m) {
      result.tiene_clausulas_sociales = true
      // Extract surrounding context (100 chars before and after)
      const start = Math.max(0, (m.index || 0) - 50)
      const end = Math.min(text.length, (m.index || 0) + m[0].length + 100)
      result.evidencias.push(text.slice(start, end).replace(/\s+/g, ' ').trim())
    }
  }

  if (result.evidencias.length > 0) {
    result.resumen = `${result.evidencias.length} clausula(s) social(es) detectada(s)`
  }

  return result
}

// ─── Lots extraction ────────────────────────────────────────────────

export function extractLotes(text: string): LoteInfo[] {
  if (!text) return []
  const lotes: LoteInfo[] = []
  const seen = new Set<string>()

  // Pass 1: lots WITH explicit amount (non-optional → lazy title stops correctly)
  const rxA =
    /lote\s+(?:n[uú]mero\s+)?(\d+)[:\s.-]*(.+?)\s*[-–:]\s*([0-9][0-9.,]*)\s*(?:euros?|EUR|€)/gi
  let m: RegExpExecArray | null
  while ((m = rxA.exec(text)) !== null) {
    seen.add(m[1])
    lotes.push({
      numero: m[1],
      titulo: m[2].trim(),
      importe_eur: parseSpanishNumber(m[3]),
      cpv: [],
    })
  }

  // Pass 2: lots WITHOUT amount (fallback, skip already captured)
  const rxB = /lote\s+(?:n[uú]mero\s+)?(\d+)[:\s.-]*([^\n]{5,100})/gi
  while ((m = rxB.exec(text)) !== null) {
    if (!seen.has(m[1])) {
      lotes.push({
        numero: m[1],
        titulo: m[2].trim(),
        importe_eur: null,
        cpv: [],
      })
    }
  }

  return lotes
}

// ─── Orchestrator: full deterministic extraction ────────────────────

export interface DeterministicResult {
  expediente: Partial<ExpedienteInfo>
  economia: Partial<EconomiaInfo>
  plazos: PlazosInfo
  elegibilidad: ElegibilidadInfo
  solvencia: SolvenciaInfo
  criterios: CriterioAdjudicacion[]
  clausulas_sociales: ClausulasSocialesInfo
  garantias: GarantiasInfo
  lotes: LoteInfo[]
  /** Names of fields successfully extracted by regex */
  campos_extraidos: string[]
}

/**
 * Run all deterministic extractors on plain text.
 * Returns structured data + list of fields found.
 */
export function extractDeterminista(text: string): DeterministicResult {
  const campos_extraidos: string[] = []

  // CPV
  const cpv = extractCpv(text)
  if (cpv.length > 0) campos_extraidos.push('cpv')

  // Budget
  const budget = extractBudget(text)
  if (budget.presupuesto_base_eur) campos_extraidos.push('presupuesto_base_eur')
  if (budget.valor_estimado_eur) campos_extraidos.push('valor_estimado_eur')

  // Plazos
  const plazos = extractPlazo(text)
  if (plazos.presentacion) campos_extraidos.push('plazo_presentacion')
  if (plazos.ejecucion) campos_extraidos.push('plazo_ejecucion')

  // Criterios
  const criterios = extractCriterios(text)
  if (criterios.length > 0) campos_extraidos.push('criterios_adjudicacion')

  // Solvencia
  const solvencia = extractSolvencia(text)
  if (solvencia.economica_importe_min_eur) campos_extraidos.push('solvencia_economica')
  if (solvencia.tecnica) campos_extraidos.push('solvencia_tecnica')
  if (solvencia.experiencia_previa) campos_extraidos.push('experiencia_previa')
  if (solvencia.certificados.length > 0) campos_extraidos.push('certificados')

  // Elegibilidad
  const elegibilidad = extractElegibilidad(text)
  if (elegibilidad.admite_entidades_sin_animo_lucro !== null) campos_extraidos.push('admite_sin_animo_lucro')
  if (elegibilidad.requiere_clasificacion_empresarial !== null) campos_extraidos.push('clasificacion_empresarial')
  if (elegibilidad.permite_subcontratacion !== null) campos_extraidos.push('subcontratacion')

  // Garantias
  const garantias = extractGarantias(text)
  if (garantias.provisional) campos_extraidos.push('garantia_provisional')
  if (garantias.definitiva) campos_extraidos.push('garantia_definitiva')

  // Clausulas sociales
  const clausulas_sociales = extractClausulasSociales(text)
  if (clausulas_sociales.tiene_clausulas_sociales) campos_extraidos.push('clausulas_sociales')

  // Lotes
  const lotes = extractLotes(text)
  if (lotes.length > 0) campos_extraidos.push('lotes')

  return {
    expediente: { cpv },
    economia: {
      presupuesto_base_eur: budget.presupuesto_base_eur,
      valor_estimado_eur: budget.valor_estimado_eur,
    },
    plazos,
    elegibilidad,
    solvencia,
    criterios,
    clausulas_sociales,
    garantias,
    lotes,
    campos_extraidos,
  }
}

// ─── Aptitud ONG scoring (from extracted data) ──────────────────────

export function scoreAptitudOng(
  det: DeterministicResult,
  extra?: {
    titulo?: string
    comprador?: string
    hasPcap?: boolean
    hasPpt?: boolean
    hasDocumentos?: boolean
  },
): {
  score: number
  label: 'alta' | 'media' | 'baja' | 'incierta'
  razones: string[]
  blockers: string[]
  recomendacion: string
} {
  let score = 0
  const razones: string[] = []
  const blockers: string[] = []

  // +25 CPV social
  const socialCpvPrefixes = ['85', '80', '75', '98']
  const hasSocialCpv = (det.expediente.cpv || []).some((c) =>
    socialCpvPrefixes.some((p) => c.startsWith(p)),
  )
  if (hasSocialCpv) {
    score += 25
    razones.push(`CPV social: ${(det.expediente.cpv || []).filter((c) => socialCpvPrefixes.some((p) => c.startsWith(p))).join(', ')}`)
  }

  // +20 objeto social claro (from titulo)
  if (extra?.titulo) {
    const socialKw =
      /servicios?\s*social|inclusi[oó]n|vulnerab|discapacidad|infancia|migrante|refugiad|cooperaci[oó]n|humanitari|voluntariado|igualdad/i
    if (socialKw.test(extra.titulo)) {
      score += 20
      razones.push('Objeto social claro en titulo')
    }
  }

  // +15 admite entidades sin animo de lucro
  if (det.elegibilidad.admite_entidades_sin_animo_lucro === true) {
    score += 15
    razones.push('Admite entidades sin animo de lucro')
  }

  // +15 criterios sociales/calidad pesan mas que precio
  const totalSocial = det.criterios
    .filter((c) => c.tipo === 'social' || c.tipo === 'calidad' || c.tipo === 'medioambiental')
    .reduce((s, c) => s + (c.peso || 0), 0)
  const totalPrecio = det.criterios
    .filter((c) => c.tipo === 'precio')
    .reduce((s, c) => s + (c.peso || 0), 0)
  if (totalSocial > totalPrecio && totalSocial > 0) {
    score += 15
    razones.push(`Criterios calidad/social (${totalSocial}pts) > precio (${totalPrecio}pts)`)
  }

  // +10 contrato por lotes o importe < 300k
  if (det.lotes.length > 0) {
    score += 10
    razones.push(`Contrato por lotes (${det.lotes.length})`)
  } else if (
    det.economia.presupuesto_base_eur &&
    det.economia.presupuesto_base_eur < 300_000
  ) {
    score += 10
    razones.push('Importe < 300k EUR (accesible)')
  }

  // +10 plazo > 10 dias
  if (det.plazos.dias_restantes !== null && det.plazos.dias_restantes > 10) {
    score += 10
    razones.push(`Plazo: ${det.plazos.dias_restantes} dias`)
  }

  // +10 clausulas sociales
  if (det.clausulas_sociales.tiene_clausulas_sociales) {
    score += 10
    razones.push('Tiene clausulas sociales')
  }

  // ── Blockers / penalizaciones ──

  // -25 requiere clasificacion empresarial
  if (det.elegibilidad.requiere_clasificacion_empresarial) {
    score -= 25
    blockers.push('Requiere clasificacion empresarial (la mayoria de ONGs no la tienen)')
  }

  // -20 solvencia economica alta
  if (
    det.solvencia.economica_importe_min_eur &&
    det.economia.presupuesto_base_eur &&
    det.solvencia.economica_importe_min_eur > det.economia.presupuesto_base_eur * 0.5
  ) {
    score -= 20
    blockers.push(
      `Solvencia economica alta (${det.solvencia.economica_importe_min_eur.toLocaleString('es-ES')} EUR minimo)`,
    )
  }

  // -20 obra/suministro industrial
  if (extra?.titulo && /obra|construcci[oó]n|suministro.*industrial/i.test(extra.titulo)) {
    score -= 20
    blockers.push('Contrato de obra/suministro industrial')
  }

  // -15 no hay documentos
  if (!extra?.hasDocumentos) {
    score -= 15
    blockers.push('Sin documentos disponibles para analizar')
  }

  // -15 plazo vencido o muy corto
  if (det.plazos.dias_restantes !== null && det.plazos.dias_restantes < 0) {
    score -= 30
    blockers.push('Plazo vencido')
  } else if (det.plazos.dias_restantes !== null && det.plazos.dias_restantes <= 3) {
    score -= 10
    blockers.push(`Cierra en ${det.plazos.dias_restantes} dia(s)`)
  }

  // -10 precio > 70% si servicio social complejo
  if (totalPrecio > 70 && hasSocialCpv) {
    score -= 10
    blockers.push('Precio pesa > 70% en servicio social complejo')
  }

  // Clamp
  score = Math.max(0, Math.min(100, score))

  // Label
  let label: 'alta' | 'media' | 'baja' | 'incierta'
  const lacksKeyData = !extra?.hasPcap && !extra?.hasPpt && det.campos_extraidos.length < 3
  if (lacksKeyData) {
    label = 'incierta'
  } else if (score >= 55) {
    label = 'alta'
  } else if (score >= 35) {
    label = 'media'
  } else if (score > 0) {
    label = 'baja'
  } else {
    label = 'incierta'
  }

  // Recomendacion
  let recomendacion: string
  if (blockers.length > 0 && label === 'baja') {
    recomendacion = `Licitacion con bloqueantes para ONG: ${blockers[0]}. Verificar en el PCAP si hay excepciones.`
  } else if (label === 'alta') {
    recomendacion = 'Alta aptitud para ONG. Revisar requisitos de solvencia y preparar documentacion.'
  } else if (label === 'media') {
    recomendacion = 'Aptitud media. Analizar PCAP y PPT para confirmar que los requisitos son asumibles.'
  } else if (label === 'incierta') {
    recomendacion = 'Datos insuficientes para evaluar aptitud. Localizar PCAP y PPT del expediente.'
  } else {
    recomendacion = 'Baja aptitud para ONG segun los datos disponibles.'
  }

  return { score, label, razones, blockers, recomendacion }
}
