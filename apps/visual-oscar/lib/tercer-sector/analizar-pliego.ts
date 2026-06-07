/**
 * Análisis de pliegos de licitación por IA · Tercer Sector v3 · Sprint TS2-lic-doc
 *
 * Procesa documentos de licitación pública (PCAP/PPT/anexos) en TODOS los
 * formatos habituales y extrae los REQUISITOS de forma estructurada para que una
 * ONG pueda evaluar de un vistazo si le interesa concurrir.
 *
 * ── Pipeline ──────────────────────────────────────────────────────────────
 *   1. fetchDocumento(url)  → descarga bytes, detecta formato por content-type +
 *      extensión. Timeout 20s · límite de tamaño 15MB.
 *   2. Conversión a "contenido analizable":
 *        · PDF  → Gemini MULTIMODAL NATIVO: el PDF se envía como `inline_data`
 *                 (base64, mime application/pdf) al endpoint generateContent de
 *                 Gemini (gemini-2.0-flash). NO se extrae texto en Node: Gemini
 *                 lee el PDF entero (incluye tablas e imágenes escaneadas).
 *        · DOCX → texto plano con `mammoth` (si está instalado; si no, degrada).
 *        · XLSX → texto/tablas con `xlsx`/SheetJS (si está; si no, degrada).
 *        · HTML → strip de tags a texto.
 *        · TXT  → texto tal cual.
 *   3. extraerRequisitos(...) → prompt a Gemini que devuelve JSON ESTRUCTURADO
 *      con los requisitos del pliego (ver `RequisitosPliego`). System prompt en
 *      español, rol de experto en contratación pública. Parseo robusto del JSON
 *      (quita fences ```). disclaimer `generated_by_llm: true`.
 *
 * ── Degradación honesta (patrón Politeia) ───────────────────────────────────
 *   - Sin GEMINI_API_KEY → { ok:false, error:'no_key', ... } (no lanza).
 *   - Formato sin librería de parsing disponible → { ok:false, error:'parser_unavailable' }.
 *   - Descarga/Gemini falla → { ok:false, error, ... }. NUNCA inventa datos.
 *   - Caché en memoria TTL 12h por URL (el contenido de un pliego no cambia).
 *
 * IMPORTANTE: GEMINI_API_KEY es server-side (Vercel env). NUNCA exponer al
 * cliente; estas funciones se llaman desde el route handler
 * (app/api/tercer-sector/licitaciones/analizar).
 *
 * Helpers PUROS (sin red) exportados para tests con fixtures:
 *   - detectarFormato()       · content-type/extensión → formato
 *   - construirPromptUsuario() · contexto del pliego → texto user para Gemini
 *   - SYSTEM_PROMPT_PLIEGO     · system prompt (experto contratación pública)
 *   - REQUISITOS_JSON_SCHEMA   · responseSchema (subset Gemini)
 *   - parseRequisitosJSON()    · respuesta cruda del LLM → RequisitosPliego
 *   - stripHtml()              · HTML → texto
 *
 * Docs OCDS `tender.documents[]`: cada doc trae url + format + documentType;
 * este módulo recibe la URL directa del documento (la resuelve el agregador).
 */

// ─────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────

/** Formatos de documento de pliego soportados. */
export type FormatoDocumento = 'pdf' | 'docx' | 'xlsx' | 'html' | 'txt' | 'desconocido'

/** Un criterio de adjudicación con su peso (% sobre 100 si se conoce). */
export interface CriterioAdjudicacion {
  nombre: string
  /** Peso del criterio en puntos/porcentaje. null si el pliego no lo cuantifica. */
  peso: number | null
}

/** Un lote del expediente. */
export interface LotePliego {
  numero: string
  descripcion: string
}

/** Veredicto sintético de idoneidad para una ONG. */
export interface AptoParaOng {
  /** 'apto' | 'apto_con_reservas' | 'no_apto' | 'indeterminado'. */
  veredicto: 'apto' | 'apto_con_reservas' | 'no_apto' | 'indeterminado'
  /** Motivo en una o dos frases. */
  motivo: string
}

/**
 * Requisitos estructurados extraídos de un pliego por IA. Todos los campos son
 * "best-effort": el LLM rellena lo que encuentra y deja null/[]/"" lo que no.
 */
export interface RequisitosPliego {
  /** Objeto del contrato (qué se licita). */
  objeto: string
  /** Presupuesto base de licitación (con IVA), en euros. null si no consta. */
  presupuesto_base: number | null
  /** Valor estimado del contrato (sin IVA, con prórrogas), en euros. */
  valor_estimado: number | null
  plazos: {
    /** Fecha/plazo límite de presentación de ofertas (texto tal cual). */
    presentacion: string | null
    /** Plazo de ejecución del contrato (texto tal cual). */
    ejecucion: string | null
  }
  /** Criterios de adjudicación con sus pesos. */
  criterios: CriterioAdjudicacion[]
  solvencia: {
    /** Solvencia económica y financiera exigida. */
    economica: string | null
    /** Solvencia técnica y profesional exigida. */
    tecnica: string | null
  }
  /** Códigos CPV (Common Procurement Vocabulary) del expediente. */
  cpv: string[]
  /** Lotes en que se divide el expediente (vacío si lote único). */
  lotes: LotePliego[]
  /** Garantías exigidas (provisional/definitiva), texto. */
  garantias: string | null
  /** Idioma de presentación / del pliego. */
  idioma: string | null
  /** Lugar de ejecución / prestación. */
  lugar: string | null
  /** Resumen ejecutivo del pliego en 2-3 frases. */
  resumen: string
  /** Veredicto de idoneidad para una ONG del tercer sector. */
  apto_para_ong: AptoParaOng
}

/** Envelope de respuesta del análisis (patrón Politeia · nunca lanza). */
export interface AnalizarPliegoResponse {
  ok: boolean
  data: RequisitosPliego | null
  error?: string
  /** Nota honesta de degradación (ej. parser ausente, formato no soportado). */
  nota?: string
  fetched_at: string
  /** URL del documento analizado. */
  source_url: string
  /** Formato detectado del documento. */
  formato?: FormatoDocumento
  /** Vía usada para enviar a Gemini: 'pdf_nativo' | 'texto'. */
  via?: 'pdf_nativo' | 'texto'
  /** Disclaimer: el contenido lo ha generado un LLM. */
  generated_by_llm: boolean
}

// ─────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 20_000
const MAX_BYTES = 15 * 1024 * 1024 // 15 MB
const CACHE_TTL_MS = 12 * 3600_000 // 12h · un pliego publicado no cambia
/** Máx. de caracteres de texto enviados a Gemini (DOCX/XLSX/HTML/TXT grandes). */
const MAX_TEXT_CHARS = 120_000
/** Modelo Gemini con soporte multimodal (PDF nativo). Override por env. */
const GEMINI_MULTIMODAL_MODEL =
  process.env.GEMINI_MODEL_MULTIMODAL || 'gemini-2.0-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria (proceso) · TTL 12h · clave = URL
// ─────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  expires: number
  value: AnalizarPliegoResponse
}
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearPliegoCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (sin red · testeables con fixtures)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Detecta el formato de un documento a partir del content-type HTTP y/o la URL.
 * El content-type tiene prioridad; si es genérico (octet-stream) o ausente, se
 * cae a la extensión de la URL. Pura.
 */
export function detectarFormato(
  contentType: string | null | undefined,
  url: string,
): FormatoDocumento {
  const ct = (contentType || '').toLowerCase().split(';')[0].trim()

  // 1) Por content-type explícito
  if (ct) {
    if (ct === 'application/pdf' || ct === 'application/x-pdf') return 'pdf'
    if (
      ct === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ct === 'application/msword'
    ) {
      return 'docx'
    }
    if (
      ct === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      ct === 'application/vnd.ms-excel' ||
      ct === 'application/excel'
    ) {
      return 'xlsx'
    }
    if (ct === 'text/html' || ct === 'application/xhtml+xml') return 'html'
    if (ct === 'text/plain') return 'txt'
    // octet-stream / otros genéricos → seguimos a la extensión
  }

  // 2) Por extensión de la URL (ignora query/fragment)
  const path = extractPath(url).toLowerCase()
  const ext = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1) : ''
  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'docx':
    case 'doc':
      return 'docx'
    case 'xlsx':
    case 'xls':
    case 'xlsm':
      return 'xlsx'
    case 'html':
    case 'htm':
    case 'xhtml':
      return 'html'
    case 'txt':
    case 'text':
      return 'txt'
    default:
      // Páginas web sin extensión: si el content-type era html lo cogimos arriba.
      // Por defecto, desconocido (el caller degrada honestamente).
      return 'desconocido'
  }
}

/** Extrae el path de una URL tolerando URLs relativas/raras. Pura. */
function extractPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    // No es una URL absoluta válida: quitamos query/fragment a mano.
    const noFrag = url.split('#')[0]
    return noFrag.split('?')[0]
  }
}

/**
 * Convierte HTML a texto plano legible: elimina script/style, sustituye tags por
 * espacios/saltos, decodifica entidades básicas y colapsa espacios. Pura.
 */
export function stripHtml(html: string): string {
  if (!html) return ''
  let s = html
  // Quitar bloques no-texto
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  s = s.replace(/<!--[\s\S]*?-->/g, ' ')
  // Saltos de bloque → \n para preservar algo de estructura
  s = s.replace(/<\/(p|div|li|tr|h[1-6]|br|table|thead|tbody)>/gi, '\n')
  s = s.replace(/<br\s*\/?>/gi, '\n')
  // Resto de tags → nada
  s = s.replace(/<[^>]+>/g, ' ')
  // Entidades comunes
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&euro;/gi, '€')
  // Decodificar entidades numéricas decimales/hex
  s = s.replace(/&#(\d+);/g, (_m, d) => safeFromCodePoint(parseInt(d, 10)))
  s = s.replace(/&#x([0-9a-f]+);/gi, (_m, h) => safeFromCodePoint(parseInt(h, 16)))
  // Colapsar espacios y líneas en blanco
  s = s.replace(/[ \t\f\r]+/g, ' ')
  s = s.replace(/\n{3,}/g, '\n\n')
  return s.trim()
}

function safeFromCodePoint(cp: number): string {
  if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return ''
  try {
    return String.fromCodePoint(cp)
  } catch {
    return ''
  }
}

/** Recorta texto a un máximo de caracteres añadiendo marca de truncado. Pura. */
export function recortarTexto(texto: string, max = MAX_TEXT_CHARS): string {
  if (texto.length <= max) return texto
  return texto.slice(0, max) + '\n\n[…documento truncado por longitud…]'
}

/**
 * System prompt: rol de experto en contratación pública española/europea que
 * extrae requisitos de pliegos para una ONG del tercer sector. En español.
 */
export const SYSTEM_PROMPT_PLIEGO = [
  'Eres un experto en contratación pública española y europea (Ley 9/2017 LCSP,',
  'Directivas UE 2014/24, OCDS) especializado en asesorar a ONG y entidades del',
  'tercer sector que estudian si concurrir a una licitación.',
  '',
  'Tu tarea: leer el documento de licitación (pliego de cláusulas administrativas,',
  'pliego de prescripciones técnicas, anuncio o anexo) y extraer sus requisitos de',
  'forma ESTRUCTURADA y fiel al documento. NO inventes datos: si un campo no aparece',
  'en el documento, déjalo a null (o lista vacía). Importes en euros como número',
  '(sin símbolos ni separadores de miles). Resume en castellano de España, claro y',
  'profesional. Para "apto_para_ong" valora si una ONG sin ánimo de lucro de tamaño',
  'medio podría concurrir de forma realista (objeto social compatible, solvencia',
  'exigida asumible, no reservado a otro tipo de operador), con veredicto y motivo.',
  '',
  'Devuelve EXCLUSIVAMENTE un objeto JSON válido conforme al esquema indicado, sin',
  'texto antes ni después y sin envoltorio markdown.',
].join('\n')

/**
 * Construye el mensaje de usuario para Gemini. Para PDF nativo `contenido` se deja
 * vacío (el PDF va como inline_data aparte) y se pasa solo el contexto. Pura.
 */
export function construirPromptUsuario(opts: {
  /** Texto extraído del documento (DOCX/XLSX/HTML/TXT). Vacío si es PDF nativo. */
  contenido?: string
  /** Formato detectado, para dar contexto al modelo. */
  formato?: FormatoDocumento
  /** Metadatos opcionales de la licitación (título/comprador) si se conocen. */
  titulo?: string
  comprador?: string
}): string {
  const ctx: string[] = []
  if (opts.titulo) ctx.push(`Título de la licitación (referencia): ${opts.titulo}`)
  if (opts.comprador) ctx.push(`Órgano de contratación: ${opts.comprador}`)
  if (opts.formato) ctx.push(`Formato del documento: ${opts.formato.toUpperCase()}`)

  const header = ctx.length ? ctx.join('\n') + '\n\n' : ''

  const instruccion =
    'Analiza el documento de licitación y extrae sus requisitos en el JSON pedido.'

  if (opts.contenido && opts.contenido.trim()) {
    return (
      header +
      instruccion +
      '\n\n=== CONTENIDO DEL DOCUMENTO ===\n' +
      recortarTexto(opts.contenido.trim())
    )
  }
  // PDF nativo: el documento viaja como adjunto inline_data.
  return (
    header +
    instruccion +
    '\n\nEl documento de licitación se adjunta en este mensaje (PDF). Léelo íntegro,' +
    ' incluidas tablas y anexos.'
  )
}

/**
 * responseSchema para Gemini (subset de JSON Schema · uppercase types los aplica
 * geminiizeSchema en gemini-client). Lo definimos en estilo OpenAI/Gemini.
 */
export const REQUISITOS_JSON_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    objeto: { type: 'STRING' },
    presupuesto_base: { type: 'NUMBER', nullable: true },
    valor_estimado: { type: 'NUMBER', nullable: true },
    plazos: {
      type: 'OBJECT',
      properties: {
        presentacion: { type: 'STRING', nullable: true },
        ejecucion: { type: 'STRING', nullable: true },
      },
    },
    criterios: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          nombre: { type: 'STRING' },
          peso: { type: 'NUMBER', nullable: true },
        },
      },
    },
    solvencia: {
      type: 'OBJECT',
      properties: {
        economica: { type: 'STRING', nullable: true },
        tecnica: { type: 'STRING', nullable: true },
      },
    },
    cpv: { type: 'ARRAY', items: { type: 'STRING' } },
    lotes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          numero: { type: 'STRING' },
          descripcion: { type: 'STRING' },
        },
      },
    },
    garantias: { type: 'STRING', nullable: true },
    idioma: { type: 'STRING', nullable: true },
    lugar: { type: 'STRING', nullable: true },
    resumen: { type: 'STRING' },
    apto_para_ong: {
      type: 'OBJECT',
      properties: {
        veredicto: {
          type: 'STRING',
          enum: ['apto', 'apto_con_reservas', 'no_apto', 'indeterminado'],
        },
        motivo: { type: 'STRING' },
      },
    },
  },
  required: ['objeto', 'resumen', 'apto_para_ong'],
}

/** Convierte cualquier valor a número finito o null (tolera "1.234,56 €"). Pura. */
function toNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v).trim()
  if (!s) return null
  // Quitar símbolos de moneda y texto
  s = s.replace(/[€$£\s]/g, '').replace(/eur(os)?/gi, '')
  // Normalizar separadores: "1.234.567,89" → "1234567.89"; "1,234,567.89" → idem
  if (/,\d{1,2}$/.test(s) && s.includes('.')) {
    // formato europeo con miles "." y decimal ","
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/\.\d{1,2}$/.test(s) && s.includes(',')) {
    // formato anglosajón con miles "," y decimal "."
    s = s.replace(/,/g, '')
  } else {
    // sin decimales claros: quitar separadores de miles de ambos tipos
    s = s.replace(/[,.](?=\d{3}(\D|$))/g, '')
    // un único "," restante como decimal
    if (/^\d+,\d+$/.test(s)) s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function toStrOrNull(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s : null
}

function toStr(v: unknown, fallback = ''): string {
  if (v == null) return fallback
  const s = String(v).trim()
  return s || fallback
}

/**
 * Parsea la respuesta cruda del LLM a `RequisitosPliego` de forma robusta:
 *   - quita fences ```json … ``` y texto envolvente
 *   - extrae el primer objeto JSON exterior
 *   - normaliza tipos (números, arrays, enums) y rellena defaults seguros
 * Devuelve null si no hay JSON parseable. Pura (sin red).
 */
export function parseRequisitosJSON(raw: string): RequisitosPliego | null {
  if (!raw || typeof raw !== 'string') return null

  // 1) Limpiar fences markdown
  let cleaned = raw
    .replace(/^﻿/, '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  // 2) Acotar al primer objeto exterior { ... }
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  cleaned = cleaned.slice(start, end + 1)

  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    return null
  }
  if (!obj || typeof obj !== 'object') return null

  // 3) Normalizar campos
  const plazosRaw = (obj.plazos || {}) as Record<string, unknown>
  const solvenciaRaw = (obj.solvencia || {}) as Record<string, unknown>
  const aptoRaw = (obj.apto_para_ong || {}) as Record<string, unknown>

  const criterios = normalizarCriterios(obj.criterios)
  const lotes = normalizarLotes(obj.lotes)
  const cpv = normalizarStringArray(obj.cpv)

  const veredictoIn = toStr(aptoRaw.veredicto, 'indeterminado').toLowerCase()
  const veredicto: AptoParaOng['veredicto'] =
    veredictoIn === 'apto' ||
    veredictoIn === 'apto_con_reservas' ||
    veredictoIn === 'no_apto'
      ? (veredictoIn as AptoParaOng['veredicto'])
      : 'indeterminado'

  return {
    objeto: toStr(obj.objeto),
    presupuesto_base: toNum(obj.presupuesto_base),
    valor_estimado: toNum(obj.valor_estimado),
    plazos: {
      presentacion: toStrOrNull(plazosRaw.presentacion),
      ejecucion: toStrOrNull(plazosRaw.ejecucion),
    },
    criterios,
    solvencia: {
      economica: toStrOrNull(solvenciaRaw.economica),
      tecnica: toStrOrNull(solvenciaRaw.tecnica),
    },
    cpv,
    lotes,
    garantias: toStrOrNull(obj.garantias),
    idioma: toStrOrNull(obj.idioma),
    lugar: toStrOrNull(obj.lugar),
    resumen: toStr(obj.resumen),
    apto_para_ong: {
      veredicto,
      motivo: toStr(aptoRaw.motivo),
    },
  }
}

function normalizarCriterios(v: unknown): CriterioAdjudicacion[] {
  if (!Array.isArray(v)) return []
  const out: CriterioAdjudicacion[] = []
  for (const c of v) {
    if (c && typeof c === 'object') {
      const o = c as Record<string, unknown>
      const nombre = toStr(o.nombre)
      if (!nombre) continue
      out.push({ nombre, peso: toNum(o.peso) })
    } else if (typeof c === 'string' && c.trim()) {
      out.push({ nombre: c.trim(), peso: null })
    }
  }
  return out
}

function normalizarLotes(v: unknown): LotePliego[] {
  if (!Array.isArray(v)) return []
  const out: LotePliego[] = []
  for (const l of v) {
    if (l && typeof l === 'object') {
      const o = l as Record<string, unknown>
      const numero = toStr(o.numero)
      const descripcion = toStr(o.descripcion)
      if (!numero && !descripcion) continue
      out.push({ numero, descripcion })
    }
  }
  return out
}

function normalizarStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => toStr(x)).filter((x) => x.length > 0)
  }
  if (typeof v === 'string' && v.trim()) {
    // CSV o separado por espacios
    return v
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

// ─────────────────────────────────────────────────────────────────────────
// Descarga del documento (con red · timeout + límite de tamaño)
// ─────────────────────────────────────────────────────────────────────────

export interface DocumentoDescargado {
  ok: boolean
  bytes?: Uint8Array
  formato: FormatoDocumento
  contentType: string | null
  error?: string
}

/**
 * Descarga un documento de licitación con timeout y límite de tamaño (15MB).
 * Detecta el formato por content-type + extensión. Nunca lanza: ante fallo
 * devuelve `{ ok:false, error, formato }`.
 */
export async function fetchDocumento(
  url: string,
  opts: { timeoutMs?: number; maxBytes?: number } = {},
): Promise<DocumentoDescargado> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxBytes = opts.maxBytes ?? MAX_BYTES

  // Validar URL http(s) antes de tocar la red.
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, formato: 'desconocido', contentType: null, error: 'url_invalida' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      formato: 'desconocido',
      contentType: null,
      error: 'protocolo_no_soportado',
    }
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // Algunos portales (PLACE/TED) requieren un UA "de navegador".
        'User-Agent':
          'Mozilla/5.0 (compatible; PoliteiaBot/1.0; +https://politeia-visual-oscar.vercel.app)',
        Accept: '*/*',
      },
      redirect: 'follow',
    })
    clearTimeout(timer)

    const contentType = res.headers.get('content-type')
    const formato = detectarFormato(contentType, url)

    if (!res.ok) {
      return { ok: false, formato, contentType, error: `http_${res.status}` }
    }

    // Comprobar Content-Length si viene (evita descargar gigantes).
    const lenHeader = res.headers.get('content-length')
    if (lenHeader) {
      const len = parseInt(lenHeader, 10)
      if (Number.isFinite(len) && len > maxBytes) {
        return { ok: false, formato, contentType, error: 'demasiado_grande' }
      }
    }

    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    if (bytes.byteLength > maxBytes) {
      return { ok: false, formato, contentType, error: 'demasiado_grande' }
    }

    return { ok: true, bytes, formato, contentType }
  } catch (e: unknown) {
    clearTimeout(timer)
    const msg =
      (e as Error)?.name === 'AbortError'
        ? 'timeout'
        : String((e as Error)?.message ?? e).slice(0, 160)
    return { ok: false, formato: detectarFormato(null, url), contentType: null, error: msg }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Conversión bytes → texto analizable (DOCX/XLSX/HTML/TXT)
// ─────────────────────────────────────────────────────────────────────────

export interface ConversionTexto {
  ok: boolean
  texto?: string
  /** Nota de degradación si la librería de parsing no está disponible. */
  nota?: string
  error?: string
}

/**
 * Convierte los bytes de un documento NO-PDF a texto plano analizable según su
 * formato. DOCX usa `mammoth`, XLSX usa `xlsx`/SheetJS; ambas se importan de
 * forma dinámica para que su ausencia degrade en vez de romper el build/test.
 * HTML/TXT no necesitan librería. Nunca lanza.
 */
export async function convertirATexto(
  bytes: Uint8Array,
  formato: FormatoDocumento,
): Promise<ConversionTexto> {
  try {
    if (formato === 'txt') {
      return { ok: true, texto: bytesToUtf8(bytes) }
    }
    if (formato === 'html') {
      return { ok: true, texto: stripHtml(bytesToUtf8(bytes)) }
    }
    if (formato === 'docx') {
      const mammoth = await loadMammoth()
      if (!mammoth || typeof mammoth.extractRawText !== 'function') {
        return {
          ok: false,
          error: 'parser_unavailable',
          nota: 'Extracción DOCX no disponible (falta la librería mammoth en el runtime).',
        }
      }
      const buf = toNodeBuffer(bytes)
      const result = await mammoth.extractRawText({ buffer: buf })
      return { ok: true, texto: (result?.value || '').trim() }
    }
    if (formato === 'xlsx') {
      const xlsx = await loadXlsx()
      if (!xlsx || typeof xlsx.read !== 'function') {
        return {
          ok: false,
          error: 'parser_unavailable',
          nota: 'Extracción XLSX no disponible (falta la librería xlsx/SheetJS en el runtime).',
        }
      }
      const texto = xlsxToText(xlsx, bytes)
      return { ok: true, texto }
    }
    return {
      ok: false,
      error: 'formato_no_soportado',
      nota: `Formato ${formato} no soportado para extracción de texto.`,
    }
  } catch (e: unknown) {
    return {
      ok: false,
      error: 'conversion_failed',
      nota: String((e as Error)?.message ?? e).slice(0, 160),
    }
  }
}

/** Tipo mínimo de la API de SheetJS que usamos. */
interface XlsxLike {
  read: (data: Uint8Array, opts: { type: string }) => {
    SheetNames: string[]
    Sheets: Record<string, unknown>
  }
  utils: {
    sheet_to_csv: (ws: unknown) => string
  }
}

/** Convierte un workbook XLSX a texto (CSV por hoja). */
function xlsxToText(xlsx: XlsxLike, bytes: Uint8Array): string {
  const wb = xlsx.read(bytes, { type: 'array' })
  const parts: string[] = []
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    if (!ws) continue
    const csv = xlsx.utils.sheet_to_csv(ws)
    if (csv && csv.trim()) {
      parts.push(`# Hoja: ${name}\n${csv}`)
    }
  }
  return parts.join('\n\n')
}

/** Decodifica bytes UTF-8 a string (TextDecoder está en Node y en el runtime edge/node). */
function bytesToUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch {
    // Fallback latin1 → string
    let s = ''
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
    return s
  }
}

/** Convierte Uint8Array a Buffer si Buffer existe (Node); si no, devuelve el array. */
function toNodeBuffer(bytes: Uint8Array): unknown {
  const B = (globalThis as { Buffer?: { from: (a: Uint8Array) => unknown } }).Buffer
  return B ? B.from(bytes) : bytes
}

/**
 * Import dinámico tolerante: devuelve el módulo (default o namespace) o null si
 * no está instalado. Permite que el build/test no rompa cuando la librería falta.
 */
async function importOptional(name: string): Promise<unknown | null> {
  try {
    const mod = (await import(/* @vite-ignore */ /* webpackIgnore: true */ name)) as {
      default?: unknown
    }
    return mod?.default ?? mod
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Llamadas a Gemini
// ─────────────────────────────────────────────────────────────────────────

/** base64 de un Uint8Array sin depender de Buffer (funciona en cualquier runtime). */
export function bytesToBase64(bytes: Uint8Array): string {
  const B = (globalThis as { Buffer?: { from: (a: Uint8Array) => { toString: (e: string) => string } } })
    .Buffer
  if (B) return B.from(bytes).toString('base64')
  // Fallback puro (sin Buffer): chunked btoa.
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  // btoa existe en runtimes web/edge.
  const b64 = (globalThis as { btoa?: (s: string) => string }).btoa
  return b64 ? b64(binary) : ''
}

/** Respuesta cruda mínima del endpoint generateContent. */
interface GeminiGenResp {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  error?: { message?: string; status?: string }
}

/**
 * Inyectable para tests: firma genérica para llamar a Gemini generateContent.
 * En producción usa `defaultGeminiCall` (REST con la GEMINI_API_KEY de env).
 */
export type GeminiContentCaller = (
  payload: Record<string, unknown>,
  signal?: AbortSignal,
) => Promise<string>

/**
 * Llamada REST mínima al endpoint generateContent de Gemini con la key de env.
 * Se añade aquí (en vez de en gemini-client.ts) porque ese cliente solo maneja
 * `parts:[{text}]` y necesitamos enviar `inline_data` (PDF nativo). NO duplica
 * la key: la lee de process.env.GEMINI_API_KEY igual que el cliente compartido.
 */
async function defaultGeminiCall(
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || ''
  if (!apiKey) throw new Error('no_key')
  const url = `${GEMINI_BASE}/models/${GEMINI_MULTIMODAL_MODEL}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`gemini_http_${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as GeminiGenResp
  if (json.error) {
    throw new Error(`gemini_error: ${json.error.message || json.error.status || 'unknown'}`)
  }
  const parts = json.candidates?.[0]?.content?.parts || []
  const text = parts.map((p) => p.text || '').join('')
  if (!text) throw new Error('gemini_empty')
  return text
}

/** Construye el payload generateContent para PDF nativo (inline_data). Pura. */
export function buildPdfPayload(
  pdfBase64: string,
  promptUsuario: string,
): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT_PLIEGO }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
          { text: promptUsuario },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: REQUISITOS_JSON_SCHEMA,
    },
  }
}

/** Construye el payload generateContent para texto plano. Pura. */
export function buildTextPayload(promptUsuario: string): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT_PLIEGO }] },
    contents: [{ role: 'user', parts: [{ text: promptUsuario }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: REQUISITOS_JSON_SCHEMA,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// extraerRequisitos · orquesta Gemini (PDF nativo o texto) → JSON estructurado
// ─────────────────────────────────────────────────────────────────────────

export interface ExtraerRequisitosOpts {
  /** PDF en base64 (vía nativa). Mutuamente excluyente con `contenido`. */
  pdfBase64?: string
  /** Texto extraído (DOCX/XLSX/HTML/TXT). Mutuamente excluyente con `pdfBase64`. */
  contenido?: string
  formato?: FormatoDocumento
  titulo?: string
  comprador?: string
  /** Inyectable para tests; default = REST real con la key de env. */
  geminiCall?: GeminiContentCaller
  signal?: AbortSignal
}

export interface ExtraerRequisitosResult {
  ok: boolean
  data: RequisitosPliego | null
  via: 'pdf_nativo' | 'texto'
  error?: string
}

/**
 * Envía el documento a Gemini y devuelve los requisitos parseados. Nunca lanza:
 * ante key ausente o fallo del modelo devuelve `{ ok:false, data:null, error }`.
 */
export async function extraerRequisitos(
  opts: ExtraerRequisitosOpts,
): Promise<ExtraerRequisitosResult> {
  const via: 'pdf_nativo' | 'texto' = opts.pdfBase64 ? 'pdf_nativo' : 'texto'
  const call = opts.geminiCall ?? defaultGeminiCall

  const promptUsuario = construirPromptUsuario({
    contenido: opts.contenido,
    formato: opts.formato,
    titulo: opts.titulo,
    comprador: opts.comprador,
  })

  const payload = opts.pdfBase64
    ? buildPdfPayload(opts.pdfBase64, promptUsuario)
    : buildTextPayload(promptUsuario)

  let raw: string
  try {
    raw = await call(payload, opts.signal)
  } catch (e: unknown) {
    return { ok: false, data: null, via, error: String((e as Error)?.message ?? e).slice(0, 200) }
  }

  const data = parseRequisitosJSON(raw)
  if (!data) {
    return { ok: false, data: null, via, error: 'parse_failed' }
  }
  return { ok: true, data, via }
}

// ─────────────────────────────────────────────────────────────────────────
// analizarPliego · pipeline completo (fetch → convertir → Gemini) + caché
// ─────────────────────────────────────────────────────────────────────────

export interface AnalizarPliegoOpts {
  /** Metadatos opcionales de la licitación (mejoran el contexto del prompt). */
  titulo?: string
  comprador?: string
  /** Forzar refetch/reanalisis ignorando la caché. */
  noCache?: boolean
  /** Timeout de descarga en ms. */
  timeoutMs?: number
  /** Inyectables para tests. */
  geminiCall?: GeminiContentCaller
  fetchDoc?: typeof fetchDocumento
}

/**
 * Pipeline completo de análisis de un pliego desde su URL:
 *   descarga → detección de formato → (PDF nativo | texto) → Gemini → JSON.
 *
 * Caché en memoria 12h por URL. Devuelve SIEMPRE un envelope (HTTP 200 aun
 * degradado en el route). Nunca lanza.
 */
export async function analizarPliego(
  url: string,
  opts: AnalizarPliegoOpts = {},
): Promise<AnalizarPliegoResponse> {
  const fetched_at = new Date().toISOString()
  const base: Omit<AnalizarPliegoResponse, 'ok' | 'data' | 'generated_by_llm'> = {
    fetched_at,
    source_url: url,
  }

  // Validación de URL temprana.
  if (!url || typeof url !== 'string') {
    return { ok: false, data: null, error: 'url_requerida', generated_by_llm: false, ...base }
  }

  // Caché (clave = URL · incluye metadatos de título/comprador para no mezclar).
  const cacheKey = `${url}::${opts.titulo || ''}::${opts.comprador || ''}`
  if (!opts.noCache) {
    const hit = _cache.get(cacheKey)
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  // Sin key → degradación honesta (no tocamos la red para nada de Gemini).
  if (!process.env.GEMINI_API_KEY && !opts.geminiCall) {
    return {
      ok: false,
      data: null,
      error: 'no_key',
      nota: 'Análisis por IA no disponible: configura GEMINI_API_KEY en el entorno (server-side).',
      generated_by_llm: false,
      ...base,
    }
  }

  // 1) Descargar el documento.
  const doFetch = opts.fetchDoc ?? fetchDocumento
  const doc = await doFetch(url, { timeoutMs: opts.timeoutMs })
  if (!doc.ok || !doc.bytes) {
    return {
      ok: false,
      data: null,
      error: doc.error || 'descarga_fallida',
      formato: doc.formato,
      generated_by_llm: false,
      ...base,
    }
  }

  const formato = doc.formato
  if (formato === 'desconocido') {
    return {
      ok: false,
      data: null,
      error: 'formato_desconocido',
      nota: 'No se pudo determinar el formato del documento (ni por content-type ni por extensión).',
      formato,
      generated_by_llm: false,
      ...base,
    }
  }

  // 2) Preparar entrada para Gemini según formato.
  let extraerOpts: ExtraerRequisitosOpts
  if (formato === 'pdf') {
    // PDF → multimodal nativo (base64 inline_data).
    const pdfBase64 = bytesToBase64(doc.bytes)
    if (!pdfBase64) {
      return {
        ok: false,
        data: null,
        error: 'base64_failed',
        formato,
        generated_by_llm: false,
        ...base,
      }
    }
    extraerOpts = {
      pdfBase64,
      formato,
      titulo: opts.titulo,
      comprador: opts.comprador,
      geminiCall: opts.geminiCall,
    }
  } else {
    // DOCX/XLSX/HTML/TXT → extraer texto y enviar como texto.
    const conv = await convertirATexto(doc.bytes, formato)
    if (!conv.ok || !conv.texto || !conv.texto.trim()) {
      return {
        ok: false,
        data: null,
        error: conv.error || 'sin_texto',
        nota: conv.nota,
        formato,
        via: 'texto',
        generated_by_llm: false,
        ...base,
      }
    }
    extraerOpts = {
      contenido: conv.texto,
      formato,
      titulo: opts.titulo,
      comprador: opts.comprador,
      geminiCall: opts.geminiCall,
    }
  }

  // 3) Extraer requisitos con Gemini.
  const extract = await extraerRequisitos(extraerOpts)
  if (!extract.ok || !extract.data) {
    return {
      ok: false,
      data: null,
      error: extract.error || 'extraccion_fallida',
      formato,
      via: extract.via,
      generated_by_llm: true,
      ...base,
    }
  }

  const result: AnalizarPliegoResponse = {
    ok: true,
    data: extract.data,
    formato,
    via: extract.via,
    generated_by_llm: true,
    ...base,
  }

  // Cachear solo resultados OK (los errores pueden ser transitorios).
  _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
  return result
}
