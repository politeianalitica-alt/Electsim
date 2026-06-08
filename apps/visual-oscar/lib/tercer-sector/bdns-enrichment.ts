/**
 * BDNS Deep Enrichment Pipeline.
 * Sprint TS-Deep B1.
 *
 * Enriquece convocatorias BDNS crudas con:
 * 1. Clasificacion sectorial determinista (no LLM).
 * 2. Deteccion de beneficiarios elegibles por regex.
 * 3. Deteccion de colectivos objetivo.
 * 4. Extraccion de plazo (fecha_fin_solicitud / dias_restantes).
 * 5. Intento de lectura de ficha publica (infosubvenciones.es).
 * 6. Scoring ONG auditable con razones.
 * 7. Documentacion de calidad del dato.
 *
 * Regla central: "no declares aptitud si no puedes ensenar evidencia".
 * Si un campo no puede determinarse, queda null y aparece en
 * fuente_calidad.campos_faltantes. NUNCA se inventa.
 */

import type {
  BdnsConvocatoriaEnriquecida,
  BdnsConcesionEnriquecida,
  ColectivoObjetivo,
  FichaCalidad,
  NivelAdministrativo,
  ScoreLabelConv,
  SectorTercerSector,
  Territorialidad,
} from './bdns-types'

// ─── Re-export types for consumers ──────────────────────────────────
export type { BdnsConvocatoriaEnriquecida, BdnsConcesionEnriquecida }

// ─── In-memory cache for fichas (12h TTL) ───────────────────────────
const fichaCache = new Map<string, { html: string; ts: number }>()
const FICHA_TTL = 12 * 60 * 60 * 1000

// ─── Sector classification rules ────────────────────────────────────
const SECTOR_RULES: { sector: SectorTercerSector; patterns: RegExp }[] = [
  { sector: 'discapacidad', patterns: /discapacidad|diversidad funcional|accesibilidad|dependencia.*discapacidad/i },
  { sector: 'infancia_juventud', patterns: /infancia|menores|juventud|adolescen|tutela|acogimiento|menor(?:es)? (?:de edad|en riesgo)|proteccion.*menor/i },
  { sector: 'migracion_refugio', patterns: /migraci[oó]n|refugiad|asilo|inmigrante|acogida.*(?:refugiad|migrante)|protecci[oó]n internacional|desplazad/i },
  { sector: 'igualdad_genero', patterns: /igualdad.*g[eé]nero|violencia.*g[eé]nero|mujer|feminismo|brecha.*salarial|conciliaci[oó]n/i },
  { sector: 'cooperacion_internacional', patterns: /cooperaci[oó]n.*(?:internacional|desarrollo)|ayuda.*humanitaria|acci[oó]n.*exterior|ONG[Dd]|pa[ií]ses en (?:v[ií]as de )?desarrollo/i },
  { sector: 'salud', patterns: /salud|sanitari|hospital|enfermedad|paciente|prevenci[oó]n.*salud|salud.*mental|drogodependencia|adicci[oó]n/i },
  { sector: 'educacion', patterns: /educaci[oó]n|formaci[oó]n|escolar|becas?(?:.*estudio)|alfabetizaci[oó]n|inclusi[oó]n.*educativa/i },
  { sector: 'empleo_insercion', patterns: /empleo|inserci[oó]n.*laboral|exclusi[oó]n.*social|inserci[oó]n.*sociolaboral|empresa.*social|econom[ií]a.*social/i },
  { sector: 'vivienda_sinhogarismo', patterns: /vivienda|sinhogarismo|sin.*hogar|persona.*sin.*techo|alojamiento.*social|emergencia.*habitacional/i },
  { sector: 'medio_ambiente', patterns: /medio.*ambiente|sostenibilidad|cambio.*clim[aá]tico|ecolog[ií]a|biodiversidad|transici[oó]n.*ecol[oó]gica/i },
  { sector: 'dependencia_mayores', patterns: /dependencia|mayores|tercera.*edad|envejecimiento|geriatr|cuidados.*larga.*duraci[oó]n|residencia.*mayores/i },
  { sector: 'emergencia_humanitaria', patterns: /emergencia|cat[aá]strofe|desastre|crisis.*humanitaria|ayuda.*urgente/i },
  { sector: 'derechos_humanos', patterns: /derechos.*humanos|libertad|dignidad|participaci[oó]n.*ciudadana|defensa.*derechos/i },
  { sector: 'voluntariado', patterns: /voluntariado|acci[oó]n.*voluntaria|servicio.*civil/i },
  { sector: 'cultura_deporte', patterns: /cultura|deporte|ocio|tiempo.*libre|actividad.*cultural|patrimonio/i },
  { sector: 'investigacion_social', patterns: /investigaci[oó]n.*social|estudio.*social|observatorio|an[aá]lisis.*social/i },
  { sector: 'accion_social', patterns: /acci[oó]n.*social|servicios.*sociales|bienestar.*social|protecci[oó]n.*social|inclusi[oó]n|vulnerabilidad|pobreza|caritas|cruz.*roja/i },
]

// ─── Colectivo detection rules ──────────────────────────────────────
const COLECTIVO_RULES: { col: ColectivoObjetivo; patterns: RegExp }[] = [
  { col: 'personas_discapacidad', patterns: /discapacidad|diversidad funcional/i },
  { col: 'menores', patterns: /menores|infancia|ni[nñ]o|ni[nñ]a|tutela|acogimiento/i },
  { col: 'jovenes', patterns: /j[oó]venes|juventud|adolescen/i },
  { col: 'mayores', patterns: /mayores|tercera edad|persona.*mayor|ancian|envejecimiento/i },
  { col: 'migrantes', patterns: /migrante|inmigrante|emigrante|extranjero/i },
  { col: 'refugiados', patterns: /refugiad|asilo|protecci[oó]n internacional|desplazad/i },
  { col: 'mujeres_victimas_violencia', patterns: /mujer.*v[ií]ctima|violencia.*g[eé]nero|violencia.*machista/i },
  { col: 'personas_sin_hogar', patterns: /sin.*hogar|sin.*techo|sinhogarismo/i },
  { col: 'personas_drogodependientes', patterns: /drogodependien|adicci[oó]n|sustancias|toxicoman/i },
  { col: 'reclusos_exreclusos', patterns: /reclus|exreclus|preso|penitenciari|reinserci[oó]n/i },
  { col: 'minoria_etnica', patterns: /minor[ií]a.*[eé]tnica|roman[ií]|gitano|pueblo.*ind[ií]gena/i },
  { col: 'familias_vulnerables', patterns: /familia.*vulnerab|familia.*riesgo|monoparental/i },
  { col: 'desempleados', patterns: /desemplead|parad|sin.*empleo/i },
  { col: 'poblacion_rural', patterns: /rural|despoblaci[oó]n|medio.*rural/i },
  { col: 'comunidad_lgbtiq', patterns: /lgbti|lgtbi|diversidad.*sexual|orientaci[oó]n.*sexual/i },
]

// ─── Beneficiarios elegibles detection ──────────────────────────────
const BENEFICIARIO_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: 'entidades sin animo de lucro', pattern: /entidad(?:es)? sin [aá]nimo de lucro/i },
  { label: 'asociaciones', pattern: /asociacion(?:es)?(?:.*declarad(?:a|as) de utilidad p[uú]blica)?/i },
  { label: 'fundaciones', pattern: /fundacion(?:es)?/i },
  { label: 'ONG', pattern: /ONG(?:D)?(?:s)?|organizaci[oó]n(?:es)? no gubernamental/i },
  { label: 'cooperativas', pattern: /cooperativa(?:s)?/i },
  { label: 'empresas de insercion', pattern: /empresa(?:s)? de inserci[oó]n/i },
  { label: 'centros especiales de empleo', pattern: /centro(?:s)? especial(?:es)? de empleo/i },
  { label: 'entidades de voluntariado', pattern: /entidad(?:es)? de voluntariado/i },
  { label: 'entidades religiosas', pattern: /entidad(?:es)? religiosa(?:s)?|congregaci[oó]n|orden religiosa/i },
  { label: 'personas fisicas', pattern: /persona(?:s)? f[ií]sica(?:s)?/i },
  { label: 'administraciones publicas', pattern: /administraci[oó]n(?:es)? p[uú]blica(?:s)?|corporaci[oó]n(?:es)? local/i },
  { label: 'universidades', pattern: /universidad(?:es)?|centro(?:s)? de investigaci[oó]n/i },
  { label: 'empresas', pattern: /empresa(?:s)?(?:.*peque[nñ]a)?|(?:pyme|micropyme|aut[oó]nomo)/i },
]

// ─── Keywords for MRR detection ─────────────────────────────────────
const MRR_PATTERNS = /(?:mecanismo.*recuperaci[oó]n|plan.*recuperaci[oó]n|MRR|NextGen(?:eration)?.*EU|fondos.*europeos.*recuperaci[oó]n|PRTR|componente.*\d+)/i

// ─── NIF classification ─────────────────────────────────────────────
export function classifyNifTipo(nif: string | null): BdnsConcesionEnriquecida['nif_tipo'] {
  if (!nif) return null
  const first = nif.charAt(0).toUpperCase()
  if (first === 'G') return 'G'
  if (first === 'R') return 'R'
  if (first === 'F') return 'F'
  if (first === 'V') return 'V'
  if (first === 'Q') return 'Q'
  if (first === 'A') return 'A'
  if (first === 'B') return 'B'
  return 'otro'
}

// ─── Nivel detection ────────────────────────────────────────────────
export function detectNivel(organo: string | null): NivelAdministrativo {
  if (!organo) return 'otro'
  const o = organo.toLowerCase()
  if (/ministerio|secretar[ií]a.*estado|gobierno.*espa[nñ]a|jefatura.*estado|agencia.*estatal/i.test(o)) return 'estatal'
  if (/junta|generalitat|gobierno.*(?:vasco|navarra|canaria|arag[oó]n|asturias|cantabria|rioja|extremadura|murcia|baleares)/i.test(o)) return 'autonomico'
  if (/comunidad.*(?:madrid|castilla|valenciana|andaluc[ií]a|galicia|catal)/i.test(o)) return 'autonomico'
  if (/xunta|eusko.*jaurlaritza|govern.*illes/i.test(o)) return 'autonomico'
  if (/ayuntamiento|diputaci[oó]n|cabildo|consejo.*insular|mancomunidad|concejo/i.test(o)) return 'local'
  if (/universidad/i.test(o)) return 'universitario'
  if (/comisi[oó]n.*europea|uni[oó]n.*europea|parlamento.*europeo/i.test(o)) return 'ue'
  return 'otro'
}

// ─── CCAA detection from organo/territorio ──────────────────────────
const CCAA_MAP: [RegExp, string][] = [
  [/andaluc[ií]a|junta de andaluc/i, 'Andalucia'],
  [/arag[oó]n|gobierno de arag/i, 'Aragon'],
  [/asturias|principado/i, 'Asturias'],
  [/baleares|illes balears|govern.*illes/i, 'Illes Balears'],
  [/canarias|gobierno de canarias|cabildo/i, 'Canarias'],
  [/cantabria/i, 'Cantabria'],
  [/castilla.*la.*mancha/i, 'Castilla-La Mancha'],
  [/castilla.*le[oó]n/i, 'Castilla y Leon'],
  [/catalu[nñ]a|generalitat de catalu/i, 'Cataluna'],
  [/valenciana|generalitat valenciana/i, 'Comunitat Valenciana'],
  [/extremadura/i, 'Extremadura'],
  [/galicia|xunta/i, 'Galicia'],
  [/madrid|comunidad de madrid/i, 'Comunidad de Madrid'],
  [/murcia|regi[oó]n de murcia/i, 'Region de Murcia'],
  [/navarra|comunidad foral/i, 'Navarra'],
  [/pa[ií]s vasco|eusko|gobierno vasco/i, 'Pais Vasco'],
  [/rioja/i, 'La Rioja'],
  [/ceuta/i, 'Ceuta'],
  [/melilla/i, 'Melilla'],
]

export function detectCcaa(text: string): string | null {
  if (!text) return null
  for (const [rx, ccaa] of CCAA_MAP) {
    if (rx.test(text)) return ccaa
  }
  return null
}

// ─── Public API ─────────────────────────────────────────────────────

/** Classify sectors from free text. Returns ALL matching (not first-wins). */
export function classifySectorTS(text: string): SectorTercerSector[] {
  if (!text) return []
  const sectors: SectorTercerSector[] = []
  for (const rule of SECTOR_RULES) {
    if (rule.patterns.test(text)) sectors.push(rule.sector)
  }
  return sectors.length > 0 ? sectors : ['otro']
}

/** Detect target groups from free text. Returns ALL matching. */
export function detectColectivoObjetivo(text: string): ColectivoObjetivo[] {
  if (!text) return []
  const cols: ColectivoObjetivo[] = []
  for (const rule of COLECTIVO_RULES) {
    if (rule.patterns.test(text)) cols.push(rule.col)
  }
  return cols.length > 0 ? cols : ['general']
}

/** Detect eligible beneficiary types from text. Returns labels. */
export function detectBeneficiariosElegibles(text: string): string[] {
  if (!text) return []
  const found: string[] = []
  for (const rule of BENEFICIARIO_PATTERNS) {
    if (rule.pattern.test(text)) found.push(rule.label)
  }
  return found
}

/** Extract deadline from raw fields + text. */
export function extractDeadline(
  text: string | null,
  rawFields: {
    fecha_fin_solicitud?: string | null
    plazo_presentacion?: string | null
  },
): { fecha_fin: string | null; dias_restantes: number | null } {
  // 1. Explicit field
  const explicit = rawFields.fecha_fin_solicitud || rawFields.plazo_presentacion || null
  if (explicit) {
    const d = new Date(explicit)
    if (!isNaN(d.getTime())) {
      const now = new Date()
      const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return { fecha_fin: d.toISOString().slice(0, 10), dias_restantes: diff }
    }
  }
  // 2. Try regex on text
  if (text) {
    // "hasta el 30 de junio de 2026", "plazo: 15/07/2026", "fecha limite: 2026-07-15"
    const dateRx =
      /(?:hasta|plazo|fecha.*l[ií]mite|presentaci[oó]n.*hasta)[:\s]*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/i
    const m = dateRx.exec(text)
    if (m) {
      const [, dd, mm, yyyy] = m
      const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`)
      if (!isNaN(d.getTime())) {
        const now = new Date()
        const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return { fecha_fin: d.toISOString().slice(0, 10), dias_restantes: diff }
      }
    }
    // ISO format
    const isoRx = /(?:hasta|plazo|fecha.*l[ií]mite)[:\s]*(20\d{2}-\d{2}-\d{2})/i
    const m2 = isoRx.exec(text)
    if (m2) {
      const d = new Date(m2[1])
      if (!isNaN(d.getTime())) {
        const now = new Date()
        const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return { fecha_fin: d.toISOString().slice(0, 10), dias_restantes: diff }
      }
    }
    // Spanish month names
    const monthNames =
      /(?:hasta|plazo|fecha.*l[ií]mite)[:\s]*(?:el\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i
    const m3 = monthNames.exec(text)
    if (m3) {
      const months: Record<string, string> = {
        enero: '01', febrero: '02', marzo: '03', abril: '04',
        mayo: '05', junio: '06', julio: '07', agosto: '08',
        septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
      }
      const mo = months[m3[2].toLowerCase()]
      if (mo) {
        const d = new Date(`${m3[3]}-${mo}-${m3[1].padStart(2, '0')}`)
        if (!isNaN(d.getTime())) {
          const now = new Date()
          const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return { fecha_fin: d.toISOString().slice(0, 10), dias_restantes: diff }
        }
      }
    }
  }
  return { fecha_fin: null, dias_restantes: null }
}

// ─── Ficha publica fetch (infosubvenciones.es) ──────────────────────

/** Strip HTML tags and decode entities. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Fetch and parse the public ficha from infosubvenciones.es.
 * Returns plain text of the ficha or null if unreachable.
 * Caches for 12h per numero.
 */
export async function fetchFichaPublica(numero: string): Promise<string | null> {
  if (!numero) return null
  const cached = fichaCache.get(numero)
  if (cached && Date.now() - cached.ts < FICHA_TTL) return cached.html

  const url = `https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/${encodeURIComponent(numero)}`
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Politeia/1.0 (academic research)' },
    })
    if (!res.ok) return null
    const html = await res.text()
    const text = stripHtml(html)
    if (text.length < 50) return null // too short = error page
    fichaCache.set(numero, { html: text, ts: Date.now() })
    return text
  } catch {
    return null
  }
}

/**
 * Extract importe from ficha text.
 * Looks for "importe total", "dotacion", "credito presupuestario", "cuantia".
 */
export function extractImporte(text: string): number | null {
  if (!text) return null
  // Pattern: "123.456.789,00 euros" or "123.456,78 EUR" or "123456.78 euros"
  const patterns = [
    /(?:importe.*total|dotaci[oó]n|cr[eé]dito.*presupuestario|cuant[ií]a.*(?:total|m[aá]xima))[:\s]*([0-9.,]+)\s*(?:euros?|EUR|€)/i,
    /(?:importe)[:\s]*([0-9.,]+)\s*(?:euros?|EUR|€)/i,
  ]
  for (const rx of patterns) {
    const m = rx.exec(text)
    if (m) {
      // Spanish number: 1.234.567,89 → 1234567.89
      const raw = m[1].replace(/\./g, '').replace(',', '.')
      const n = parseFloat(raw)
      if (isFinite(n) && n > 0) return n
    }
  }
  return null
}

// ─── Enrichment pipeline ────────────────────────────────────────────

/**
 * Enrich a raw BDNS convocatoria with all available information.
 *
 * @param raw - Raw convocatoria from BDNS API
 * @param opts - Options (skipFicha to disable network fetch for tests)
 */
export async function enrichConvocatoria(
  raw: {
    codigo?: string
    numero?: string
    titulo?: string
    organo?: string
    organo_concedente?: string
    url?: string
    fecha_recepcion?: string
    [k: string]: unknown
  },
  opts?: { skipFicha?: boolean },
): Promise<BdnsConvocatoriaEnriquecida> {
  const numero = String(raw.numero || raw.codigo || '')
  const titulo = String(raw.titulo || '')
  const organo = String(raw.organo || raw.organo_concedente || '')
  const nivel = detectNivel(organo)
  const ccaa = detectCcaa(`${organo} ${titulo}`)

  // Text corpus for analysis
  let fichaText: string | null = null
  const camposFaltantes: string[] = []
  const origenCampos: Record<string, 'api' | 'ficha' | 'bases' | 'inferido' | null> = {}

  // Try fetching ficha publica
  if (!opts?.skipFicha && numero) {
    fichaText = await fetchFichaPublica(numero)
  }

  const allText = `${titulo} ${fichaText || ''}`

  // Sectors (from title + ficha)
  const sectores_ts = classifySectorTS(allText)
  origenCampos['sectores_ts'] = fichaText ? 'ficha' : 'inferido'

  // Colectivos
  const colectivo_objetivo = detectColectivoObjetivo(allText)
  origenCampos['colectivo_objetivo'] = fichaText ? 'ficha' : 'inferido'

  // Beneficiarios elegibles
  const beneficiarios_elegibles = detectBeneficiariosElegibles(allText)
  origenCampos['beneficiarios_elegibles'] = fichaText ? 'ficha' : (beneficiarios_elegibles.length > 0 ? 'inferido' : null)
  if (beneficiarios_elegibles.length === 0) camposFaltantes.push('beneficiarios_elegibles')

  // Objeto
  let objeto: string | null = null
  if (fichaText) {
    // Try to extract "Objeto" section from ficha
    const objRx = /(?:Objeto|Finalidad|Descripci[oó]n)[:\s]*(.*?)(?:(?:Beneficiario|Plazo|Importe|Requisitos|Bases)|$)/is
    const m = objRx.exec(fichaText)
    if (m && m[1].trim().length > 20) {
      objeto = m[1].trim().slice(0, 500)
      origenCampos['objeto'] = 'ficha'
    }
  }
  if (!objeto) {
    objeto = titulo.length > 20 ? titulo : null
    origenCampos['objeto'] = objeto ? 'api' : null
    if (!objeto) camposFaltantes.push('objeto')
  }

  // Importe
  let importe_total_eur: number | null = null
  if (fichaText) {
    importe_total_eur = extractImporte(fichaText)
    if (importe_total_eur) origenCampos['importe_total_eur'] = 'ficha'
  }
  if (!importe_total_eur) {
    camposFaltantes.push('importe_total_eur')
    origenCampos['importe_total_eur'] = null
  }

  // Deadline
  const deadlineInput = {
    fecha_fin_solicitud: (raw as Record<string, unknown>).fecha_fin_solicitud as string | null ?? null,
    plazo_presentacion: (raw as Record<string, unknown>).plazo_presentacion as string | null ?? null,
  }
  const { fecha_fin, dias_restantes } = extractDeadline(fichaText, deadlineInput)
  if (fecha_fin) {
    origenCampos['fecha_fin_solicitud'] = deadlineInput.fecha_fin_solicitud ? 'api' : 'ficha'
  } else {
    camposFaltantes.push('fecha_fin_solicitud')
    origenCampos['fecha_fin_solicitud'] = null
  }

  // MRR
  const mrr = MRR_PATTERNS.test(allText)

  // Bases reguladoras URL (try to extract from ficha)
  let url_bases_reguladoras: string | null = null
  if (fichaText) {
    const basesRx = /(?:bases reguladoras|normativa)[:\s]*(?:https?:\/\/[^\s]+)/i
    const m = basesRx.exec(fichaText)
    if (m) url_bases_reguladoras = m[0].match(/https?:\/\/[^\s]+/)?.[0] || null
  }

  // Territorialidad
  const territorialidad: Territorialidad = {
    pais: 'ES',
    ccaa,
    provincia: null,
    municipio: null,
  }

  // Quality
  const fuente_calidad: FichaCalidad = {
    ficha_leida: fichaText !== null,
    bases_leidas: false, // TODO: implement bases reguladoras parsing
    campos_faltantes: camposFaltantes,
    origen_campos: origenCampos,
  }

  // Scoring
  const { score, label, razones, riesgos } = scoreConvocatoriaOng({
    titulo,
    objeto,
    sectores_ts,
    colectivo_objetivo,
    beneficiarios_elegibles,
    importe_total_eur,
    dias_restantes,
    fichaLeida: fichaText !== null,
    mrr,
    nivel,
  })

  const urlFicha = numero
    ? `https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/${numero}`
    : (raw.url as string) || ''

  return {
    id: `bdns-conv-${numero || Math.random().toString(36).slice(2)}`,
    numero,
    titulo,
    organo,
    nivel,
    territorio: ccaa || (nivel === 'estatal' ? 'Nacional' : null),
    fecha_recepcion: (raw.fecha_recepcion as string) || null,
    fecha_publicacion: (raw.fecha_recepcion as string) || null,
    fecha_inicio_solicitud: null,
    fecha_fin_solicitud: fecha_fin,
    dias_restantes,
    importe_total_eur,
    beneficiarios_elegibles,
    objeto,
    sectores_ts,
    colectivo_objetivo,
    territorialidad,
    mrr,
    url_ficha: urlFicha,
    url_bases_reguladoras,
    url_extracto: null,
    score_ong: score,
    score_label: label,
    razones_score: razones,
    riesgos,
    fuente_calidad,
  }
}

// ─── Scoring ────────────────────────────────────────────────────────

interface ScoreConvInput {
  titulo: string
  objeto: string | null
  sectores_ts: SectorTercerSector[]
  colectivo_objetivo: ColectivoObjetivo[]
  beneficiarios_elegibles: string[]
  importe_total_eur: number | null
  dias_restantes: number | null
  fichaLeida: boolean
  mrr: boolean
  nivel: NivelAdministrativo
}

export function scoreConvocatoriaOng(input: ScoreConvInput): {
  score: number
  label: ScoreLabelConv
  razones: string[]
  riesgos: string[]
} {
  let score = 0
  const razones: string[] = []
  const riesgos: string[] = []

  // ── Positive signals ──
  // Sector social
  const socialSectors: SectorTercerSector[] = [
    'accion_social', 'discapacidad', 'infancia_juventud', 'migracion_refugio',
    'igualdad_genero', 'cooperacion_internacional', 'salud', 'educacion',
    'empleo_insercion', 'vivienda_sinhogarismo', 'dependencia_mayores',
    'emergencia_humanitaria', 'derechos_humanos', 'voluntariado',
  ]
  const hasSocialSector = input.sectores_ts.some((s) => socialSectors.includes(s))
  if (hasSocialSector) {
    score += 25
    razones.push(`Sector social: ${input.sectores_ts.filter((s) => socialSectors.includes(s)).join(', ')}`)
  }

  // Specific colectivo
  if (input.colectivo_objetivo.length > 0 && !input.colectivo_objetivo.includes('general')) {
    score += 15
    razones.push(`Colectivo objetivo: ${input.colectivo_objetivo.join(', ')}`)
  }

  // Explicit nonprofit eligibility
  const nonprofitTerms = ['entidades sin animo de lucro', 'asociaciones', 'fundaciones', 'ONG', 'cooperativas', 'empresas de insercion']
  const hasNonprofit = input.beneficiarios_elegibles.some((b) => nonprofitTerms.some((t) => b.toLowerCase().includes(t.toLowerCase())))
  if (hasNonprofit) {
    score += 25
    razones.push(`Beneficiarios incluyen: ${input.beneficiarios_elegibles.filter((b) => nonprofitTerms.some((t) => b.toLowerCase().includes(t.toLowerCase()))).join(', ')}`)
  }

  // MRR / NextGenEU
  if (input.mrr) {
    score += 10
    razones.push('Financiacion MRR/NextGenEU')
  }

  // Reasonable deadline
  if (input.dias_restantes !== null && input.dias_restantes > 10) {
    score += 10
    razones.push(`Plazo: ${input.dias_restantes} dias`)
  }

  // Has objeto text (data quality signal)
  if (input.objeto && input.objeto.length > 50) {
    score += 5
    razones.push('Objeto descrito')
  }

  // Ficha leida (data quality signal)
  if (input.fichaLeida) {
    score += 5
    razones.push('Ficha publica leida')
  }

  // ── Negative signals ──
  // Importe very large without indication of lots
  if (input.importe_total_eur !== null && input.importe_total_eur > 5_000_000) {
    score -= 15
    riesgos.push(`Importe alto (${(input.importe_total_eur / 1_000_000).toFixed(1)}M EUR) — puede requerir capacidad ONG grande`)
  }

  // Deadline passed
  if (input.dias_restantes !== null && input.dias_restantes < 0) {
    score -= 30
    riesgos.push('Plazo vencido')
  }

  // Deadline very short
  if (input.dias_restantes !== null && input.dias_restantes >= 0 && input.dias_restantes <= 3) {
    score -= 10
    riesgos.push(`Cierra en ${input.dias_restantes} dia(s)`)
  }

  // Only generic/empresas beneficiarios (no nonprofit mention)
  if (input.beneficiarios_elegibles.length > 0 && !hasNonprofit) {
    const onlyEmpresas = input.beneficiarios_elegibles.every((b) =>
      /empresa|persona.*f[ií]sica|universidad|administraci[oó]n/i.test(b),
    )
    if (onlyEmpresas) {
      score -= 20
      riesgos.push('Beneficiarios: solo empresas/administraciones/universidades')
    }
  }

  // No data quality
  if (!input.fichaLeida && input.beneficiarios_elegibles.length === 0 && !input.importe_total_eur && input.dias_restantes === null) {
    score -= 15
    riesgos.push('Datos insuficientes para evaluar aptitud')
  }

  // Construction / supply keywords in titulo
  if (/obra|construcci[oó]n|suministro.*industrial|infraestructura.*civil/i.test(input.titulo)) {
    score -= 20
    riesgos.push('Posible obra/suministro industrial')
  }

  // Clamp
  score = Math.max(0, Math.min(100, score))

  // Label - "incierta" if lacking key data
  let label: ScoreLabelConv
  const lacksKeyData = !input.fichaLeida && input.beneficiarios_elegibles.length === 0 && !input.importe_total_eur
  if (lacksKeyData) {
    label = 'incierta'
    if (!riesgos.includes('Datos insuficientes para evaluar aptitud')) {
      riesgos.push('Datos insuficientes para evaluar aptitud')
    }
  } else if (score >= 55) {
    label = 'alta'
  } else if (score >= 35) {
    label = 'media'
  } else if (score > 0) {
    label = 'baja'
  } else {
    label = 'incierta'
  }

  return { score, label, razones, riesgos }
}

// ─── Concesion enrichment ───────────────────────────────────────────

/**
 * Enrich a raw BDNS concesion with NIF classification and sector detection.
 */
export function enrichConcesion(raw: {
  codigo?: string
  convocatoria_id?: string
  beneficiario?: string
  nif?: string
  importe_eur?: number | null
  fecha?: string | null
  organo?: string | null
  url?: string
}): BdnsConcesionEnriquecida {
  const nif = (raw.nif || '').trim() || null
  const nifTipo = classifyNifTipo(nif)
  const beneficiario = String(raw.beneficiario || '')
  const organo = String(raw.organo || '')

  // TS classification
  let es_tercer_sector = false
  let confianza_ts: 'alta' | 'media' | 'baja' = 'baja'
  let razon_ts = 'Sin evidencia suficiente'

  // NIF G/R/F/V = high probability third sector
  if (nifTipo === 'G') {
    es_tercer_sector = true
    confianza_ts = 'alta'
    razon_ts = 'NIF tipo G (asociacion/fundacion)'
  } else if (nifTipo === 'R') {
    es_tercer_sector = true
    confianza_ts = 'alta'
    razon_ts = 'NIF tipo R (congregacion/entidad religiosa)'
  } else if (nifTipo === 'F') {
    es_tercer_sector = true
    confianza_ts = 'media'
    razon_ts = 'NIF tipo F (cooperativa — puede ser tercer sector)'
  } else if (nifTipo === 'V') {
    es_tercer_sector = true
    confianza_ts = 'media'
    razon_ts = 'NIF tipo V (agrupacion de interes economico — podria ser tercer sector)'
  } else if (nifTipo === 'Q') {
    // Q = public organism. Only TS if explicit keyword
    const kw = /fundaci[oó]n|ONG|asociaci[oó]n|voluntariado|cooperativa/i
    if (kw.test(beneficiario)) {
      es_tercer_sector = true
      confianza_ts = 'media'
      razon_ts = 'NIF tipo Q con keyword social en nombre'
    } else {
      razon_ts = 'NIF tipo Q (organismo publico) — no clasificado como TS'
    }
  } else if (/fundaci[oó]n|asociaci[oó]n|ONG|c[aá]ritas|cruz\s*roja|cooperativa/i.test(beneficiario)) {
    es_tercer_sector = true
    confianza_ts = 'media'
    razon_ts = 'Keyword social en nombre del beneficiario (sin NIF confirmatorio)'
  }

  const nivel = detectNivel(organo)
  const ccaa = detectCcaa(organo)

  // Sector from beneficiary name (rough, acknowledged as heuristic)
  const sector_ts: SectorTercerSector | null = classifySectorTS(beneficiario)[0] ?? null

  return {
    id: `bdns-conc-${raw.codigo || Math.random().toString(36).slice(2)}`,
    convocatoria_id: raw.convocatoria_id || null,
    beneficiario,
    nif,
    nif_tipo: nifTipo,
    es_tercer_sector,
    confianza_ts,
    razon_ts,
    importe_eur: raw.importe_eur ?? null,
    fecha: raw.fecha || null,
    organo,
    nivel,
    ccaa,
    sector_ts,
    url: raw.url || `https://www.infosubvenciones.es/bdnstrans/GE/es/concesion/${raw.codigo || ''}`,
  }
}
