/**
 * OSINT External Tools Catalog · Sprint G14 cierre · enlaces curados
 *
 * Catálogo de herramientas OSINT externas accesibles desde el panel
 * "Investigar más" del dossier de cualquier PEP catalogado.
 *
 * IMPORTANTE - DESIGN CHOICES de diseño legal:
 *
 *  1. POLITEIA NO ES PROCESADOR · sólo redirige al analista a herramientas
 *     externas. No envía ni almacena datos del sujeto a estas herramientas
 *     (cada herramienta tiene su propia política y operates fuera del
 *     producto). Esto deja a Politeia fuera del rol "data processor" RGPD.
 *
 *  2. SOLO PEPs · el panel únicamente se renderiza si el sujeto del dossier
 *     tiene cargo + partido (o es entity catalogada como politician/executive/
 *     journalist/judge). Base legal: interés legítimo periodístico Art. 6(1)(f)
 *     RGPD aplicado a figuras públicas.
 *
 *  3. AUDIT LOG OBLIGATORIO · cada click ABRE primero un modal pidiendo
 *     justificación textual ≥50 chars. Se persiste en localStorage (MVP) o
 *     /api/dossier/osint-audit POST si backend disponible. Retención 2 años.
 *
 *  4. SIN HERRAMIENTAS PROFUNDAS · este catálogo excluye explícitamente
 *     Spiderfoot / Osintgraph / deepkrak3n / maigret-local. Esas son
 *     suites de surveillance, fuera de scope.
 *
 * Procedencia análisis: gits amigos · awesome-osint-master + API-s-for-OSINT.
 */

export type OSINTToolCategory =
  | 'identity'           // username/email/phone search
  | 'corporate'          // empresa/registro mercantil
  | 'archive'            // wayback, archive.today
  | 'media'              // perfiles periodísticos, prensa
  | 'public_records'     // catastro, BOE, contratación pública
  | 'investigative'      // OCCRP Aleph, ICIJ, lectura periodística
  | 'sanctions'          // OFAC/EU sanctions search externo
  | 'search_operators'   // Google dorks templates

export interface OSINTTool {
  id: string
  name: string
  category: OSINTToolCategory
  /**
   * Función que construye la URL externa dado un sujeto.
   * Devuelve null si los datos del sujeto no permiten un query útil.
   */
  buildUrl: (subject: OSINTSubject) => string | null
  /** Una línea: qué responde esta herramienta. */
  what_it_answers: string
  /** Caveat: cómo interpretar/limitaciones. */
  caveat: string
  /** Es gratis (no requiere registro/coste). */
  free: boolean
  /** Idiomas relevantes de la herramienta (para priorizar ES). */
  language: 'es' | 'en' | 'multi'
}

export interface OSINTSubject {
  /** Nombre completo · ej. "Pedro Sánchez Pérez-Castejón" */
  full_name: string
  /** Cargo actual · ej. "Presidente del Gobierno" */
  cargo?: string | null
  /** Partido · ej. "PSOE" */
  partido?: string | null
  /** Username típico social (si conocido) */
  username?: string | null
  /** Empresa asociada (si aplica) */
  organization?: string | null
  /** Domain web (si aplica) */
  domain?: string | null
}

/** URL-encode helper que también limpia espacios extra. */
const enc = (s: string | null | undefined) => encodeURIComponent((s || '').trim())

/**
 * Catálogo curado · 18 herramientas en 8 categorías. Mantener pequeño y
 * trazable. Cada adición requiere justificación de scope.
 */
export const OSINT_TOOLS: OSINTTool[] = [
  // ─────────── INVESTIGATIVE (prioridad alta · profesional) ───────────
  {
    id: 'occrp-aleph',
    name: 'OCCRP Aleph',
    category: 'investigative',
    buildUrl: (s) => `https://aleph.occrp.org/search?q=${enc(s.full_name)}`,
    what_it_answers: 'Investigaciones periodísticas, leaks (Panama/Paradise/Pandora Papers), procedimientos judiciales internacionales',
    caveat: 'Cobertura desigual por país. Ausencia ≠ inocencia. Presencia = mención en investigación, no condena.',
    free: true,
    language: 'multi',
  },
  {
    id: 'icij-offshore',
    name: 'ICIJ Offshore Leaks',
    category: 'investigative',
    buildUrl: (s) => `https://offshoreleaks.icij.org/search?q=${enc(s.full_name)}`,
    what_it_answers: 'Estructuras offshore vinculadas: Panama Papers, Pandora Papers, Paradise Papers',
    caveat: 'Mención NO implica ilegalidad. Muchas estructuras offshore son legales. Contextualizar.',
    free: true,
    language: 'multi',
  },

  // ─────────── PUBLIC RECORDS ES ───────────
  {
    id: 'boe-buscador',
    name: 'BOE · Buscador',
    category: 'public_records',
    buildUrl: (s) => `https://www.boe.es/buscar/boe.php?campo[0]=TIT&dato[0]=${enc(s.full_name)}`,
    what_it_answers: 'Disposiciones, nombramientos, ceses, sanciones, indultos publicados en BOE',
    caveat: 'Solo el BOE oficial (no autonómicos). Coverage del nombre depende de exactitud literal.',
    free: true,
    language: 'es',
  },
  {
    id: 'place-contratos',
    name: 'PLACE · Contratación Sector Público',
    category: 'public_records',
    buildUrl: (s) => s.organization
      ? `https://contrataciondelestado.es/wps/portal/searchresults?searchString=${enc(s.organization)}`
      : `https://contrataciondelestado.es/wps/portal/searchresults?searchString=${enc(s.full_name)}`,
    what_it_answers: 'Licitaciones, adjudicaciones, contratos del sector público español ≥18k €',
    caveat: 'Bajo umbral excluye micro-contratos. Solo Administración Pública estatal/autonómica.',
    free: true,
    language: 'es',
  },
  {
    id: 'bdns-subvenciones',
    name: 'BDNS · Subvenciones Estado',
    category: 'public_records',
    buildUrl: (s) => `https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias?beneficiario=${enc(s.organization || s.full_name)}`,
    what_it_answers: 'Subvenciones públicas recibidas (España completa)',
    caveat: 'Beneficiario debe coincidir literal. Búsqueda alternativa por NIF si conocido.',
    free: true,
    language: 'es',
  },
  {
    id: 'congreso-iniciativas',
    name: 'Congreso · Iniciativas + votaciones',
    category: 'public_records',
    buildUrl: (s) => `https://www.congreso.es/es/cem/iniciativas-vot?p_p_id=iniciativas&_iniciativas_busqueda=true&_iniciativas_tipo=todas&_iniciativas_text=${enc(s.full_name)}`,
    what_it_answers: 'Iniciativas firmadas, votos en pleno, intervenciones',
    caveat: 'Sólo diputados activos. Histórico parcial.',
    free: true,
    language: 'es',
  },

  // ─────────── CORPORATE ───────────
  {
    id: 'opencorporates',
    name: 'OpenCorporates',
    category: 'corporate',
    buildUrl: (s) => s.organization
      ? `https://opencorporates.com/companies?q=${enc(s.organization)}`
      : `https://opencorporates.com/officers?q=${enc(s.full_name)}`,
    what_it_answers: '120M+ empresas en 130 jurisdicciones · directivos, cargos, vínculos',
    caveat: 'Datos del registro oficial · NO incluye empresas off-shore opacas. Algunas búsquedas requieren registro.',
    free: true,
    language: 'multi',
  },
  {
    id: 'crunchbase',
    name: 'Crunchbase · perfil corporativo',
    category: 'corporate',
    buildUrl: (s) => s.organization
      ? `https://www.crunchbase.com/textsearch?q=${enc(s.organization)}`
      : `https://www.crunchbase.com/textsearch?q=${enc(s.full_name)}`,
    what_it_answers: 'Perfiles de fundadores, inversores, M&A, rondas de financiación',
    caveat: 'Sesgo USA-tech. Cobertura ES limitada. Datos parcialmente registro-libre.',
    free: true,
    language: 'en',
  },

  // ─────────── SANCTIONS ───────────
  {
    id: 'opensanctions',
    name: 'OpenSanctions',
    category: 'sanctions',
    buildUrl: (s) => `https://www.opensanctions.org/search/?q=${enc(s.full_name)}`,
    what_it_answers: '90+ listas de sanciones consolidadas (OFAC, EU, UN, UK, Suiza, etc.) + PEPs',
    caveat: 'Match por nombre puede dar falsos positivos. Verificar fecha nacimiento + país.',
    free: true,
    language: 'multi',
  },
  {
    id: 'sec-edgar',
    name: 'SEC EDGAR (USA)',
    category: 'sanctions',
    buildUrl: (s) => s.organization
      ? `https://efts.sec.gov/LATEST/search-index?q=${enc(s.organization)}&dateRange=custom`
      : `https://efts.sec.gov/LATEST/search-index?q=${enc(s.full_name)}`,
    what_it_answers: 'Filings ante la SEC USA (empresas cotizadas, 10-K, 10-Q, 13F, insider trading)',
    caveat: 'Solo empresas con presencia USA. Útil para tracking de holdings, directivos cross-Atlantic.',
    free: true,
    language: 'en',
  },

  // ─────────── ARCHIVE ───────────
  {
    id: 'wayback-machine',
    name: 'Wayback Machine',
    category: 'archive',
    buildUrl: (s) => s.domain
      ? `https://web.archive.org/web/*/${s.domain}`
      : `https://web.archive.org/web/*/${enc(s.full_name)}*`,
    what_it_answers: 'Histórico de versiones de páginas web (declaraciones eliminadas, cambios de bio, etc.)',
    caveat: 'Cobertura desigual. Pages dinámicas mal capturadas. JS reciente no archivado.',
    free: true,
    language: 'multi',
  },
  {
    id: 'archive-today',
    name: 'archive.today',
    category: 'archive',
    buildUrl: (s) => s.domain
      ? `https://archive.ph/${s.domain}`
      : null,
    what_it_answers: 'Snapshots alternativos (mejor con paywalls que Wayback)',
    caveat: 'Requiere dominio · no funciona por nombre.',
    free: true,
    language: 'multi',
  },

  // ─────────── MEDIA ───────────
  {
    id: 'google-news-es',
    name: 'Google News (España)',
    category: 'media',
    buildUrl: (s) => `https://news.google.com/search?q=${enc(s.full_name)}&hl=es&gl=ES&ceid=ES%3Aes`,
    what_it_answers: 'Cobertura mediática reciente en español',
    caveat: 'Sesgo de algoritmo Google. NO usar como inventario exhaustivo. Filtra por fecha si necesitas histórico.',
    free: true,
    language: 'es',
  },
  {
    id: 'mediacloud',
    name: 'MediaCloud · análisis cobertura',
    category: 'media',
    buildUrl: (s) => `https://search.mediacloud.org/search?q=${enc(s.full_name)}&platform=onlinenews-mediacloud`,
    what_it_answers: 'Volumen de cobertura cross-medio, comparativas históricas',
    caveat: 'Cobertura ES limitada. Mejor para EN. Requiere cuenta gratuita.',
    free: true,
    language: 'multi',
  },

  // ─────────── IDENTITY (link, no procesamiento Politeia) ───────────
  {
    id: 'sherlock-search',
    name: 'Sherlock · username search',
    category: 'identity',
    buildUrl: (s) => s.username
      ? `https://sherlock-project.github.io/?username=${enc(s.username)}`
      : null,
    what_it_answers: 'Cuentas con el mismo username en 400+ sitios',
    caveat: 'Username debe ser conocido. Falsos positivos altos para nombres comunes. Politeia NO ejecuta · solo enlaza.',
    free: true,
    language: 'multi',
  },
  {
    id: 'hunter-io',
    name: 'Hunter.io · email by domain',
    category: 'identity',
    buildUrl: (s) => s.domain
      ? `https://hunter.io/search/${enc(s.domain)}`
      : null,
    what_it_answers: 'Emails públicos asociados a un dominio empresarial',
    caveat: 'Sólo dominios corporativos. NO usar contra emails personales. Requiere registro Hunter.',
    free: false,
    language: 'multi',
  },

  // ─────────── SEARCH OPERATORS ───────────
  {
    id: 'google-dork-cv',
    name: 'Google · CV/PDF filetype',
    category: 'search_operators',
    buildUrl: (s) => `https://www.google.com/search?q=%22${enc(s.full_name)}%22+filetype%3Apdf+(CV+OR+curriculum+OR+biograf%C3%ADa)`,
    what_it_answers: 'Documentos PDF públicos con CV o biografía del sujeto',
    caveat: 'Google dork básico. Resultados ruidosos. Mejor con nombre exacto entre comillas.',
    free: true,
    language: 'multi',
  },
  {
    id: 'google-dork-linkedin',
    name: 'Google · LinkedIn directo',
    category: 'search_operators',
    buildUrl: (s) => `https://www.google.com/search?q=site%3Alinkedin.com%2Fin+%22${enc(s.full_name)}%22`,
    what_it_answers: 'Perfil LinkedIn público sin necesidad de login',
    caveat: 'Solo info que el sujeto haya hecho pública. Verifica que el match es la persona correcta.',
    free: true,
    language: 'multi',
  },
]

/** Helper · agrupa tools por categoría para render. */
export function groupOSINTToolsByCategory(): Record<OSINTToolCategory, OSINTTool[]> {
  const out = {} as Record<OSINTToolCategory, OSINTTool[]>
  for (const t of OSINT_TOOLS) {
    if (!out[t.category]) out[t.category] = []
    out[t.category].push(t)
  }
  return out
}

/** Labels human-readable por categoría. */
export const CATEGORY_LABEL: Record<OSINTToolCategory, string> = {
  investigative: 'Investigación periodística',
  public_records: 'Registros públicos ES',
  corporate: 'Datos corporativos',
  sanctions: 'Sanciones y compliance',
  archive: 'Archivo histórico web',
  media: 'Cobertura mediática',
  identity: 'Identidad digital (solo enlace, sin procesar)',
  search_operators: 'Búsquedas avanzadas Google',
}

/** Detecta si una entity es elegible para mostrar el panel OSINT. */
export function isEligiblePEP(subject: {
  cargo?: string | null
  partido?: string | null
  tipo?: string | null
  organizacion?: string | null
  afiliacion?: string | null
}): boolean {
  // Tiene cargo + partido (político ES)
  if (subject.cargo && subject.partido) return true
  // O cargo + afiliación política
  if (subject.cargo && subject.afiliacion) return true
  // O type explícitamente PEP-like (mapeo a categorías Politeia + estándar internacional)
  const t = (subject.tipo || '').toLowerCase()
  const PEP_TYPES = [
    'politician', 'politico', 'pep',
    'judge', 'judicial',
    'executive', 'empresario',
    'journalist', 'periodista', 'mediatico',
    'lobbista', 'consultor',
    'institucional', 'sindical', 'patronal',
    'fondo',  // fondo de inversión
  ]
  if (PEP_TYPES.some((x) => t.includes(x))) return true
  return false
}

export const OSINT_CATALOG_VERSION = 'osint-external-tools-v1'
