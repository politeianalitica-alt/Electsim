/**
 * GET /api/desinformacion/bulos
 *
 * Catálogo de bulos detectados con TRAZABILIDAD COMPLETA de origen:
 *   - Texto del bulo + variantes detectadas
 *   - Estado de verificación (DESMENTIDO · EN INVESTIGACIÓN · CONFIRMADO FALSO)
 *   - Paciente cero · primer emisor identificado
 *   - Timeline · primer post → viralización → fact-check → respuesta
 *   - Red de propagación · top amplificadores (cuentas, medios, influencers)
 *   - Trayectoria multicanal · X, Telegram, WhatsApp, TikTok, prensa
 *   - Métricas de impacto · alcance estimado, reach, sentiment
 *   - Fact-checkers que han actuado · Maldita, Newtral, AFP, EFE Verifica
 *   - Patrones · similar a bulos anteriores, países donde apareció primero
 *
 * Calibrado para escenario plausible España Q2 2026.
 */
import { NextResponse } from 'next/server'
import { fetchAllBulosLive, type BuloDetectado } from '@/lib/sources/maldita'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export type EstadoBulo = 'CONFIRMADO_FALSO' | 'DESMENTIDO' | 'EN_INVESTIGACION' | 'PARCIAL'
export type CanalBulo = 'X' | 'Facebook' | 'Telegram' | 'WhatsApp' | 'TikTok' | 'YouTube' | 'Instagram' | 'Foros' | 'Prensa' | 'TV' | 'Radio' | 'Mail'
export type CategoriaBulo = 'Política' | 'Migración' | 'Sanidad' | 'Económica' | 'Electoral' | 'Climática' | 'Internacional' | 'Justicia'
export type OrigenBulo = 'Cuenta anónima' | 'Foro' | 'Bot/granja' | 'Medio extranjero' | 'Político' | 'Influencer' | 'Telegram channel' | 'Mensaje WhatsApp' | 'Operación coordinada'

const COLOR_ESTADO: Record<EstadoBulo, string> = {
  CONFIRMADO_FALSO: '#7C2D12',
  DESMENTIDO:       '#DC2626',
  EN_INVESTIGACION: '#F59E0B',
  PARCIAL:          '#0EA5E9',
}
export const COLOR_CANAL: Record<CanalBulo, string> = {
  X: '#000000', Facebook: '#1877F2', Telegram: '#0088CC', WhatsApp: '#25D366',
  TikTok: '#FF0050', YouTube: '#FF0000', Instagram: '#E4405F', Foros: '#525258',
  Prensa: '#1F4E8C', TV: '#7C3AED', Radio: '#0F766E', Mail: '#86868b',
}
const COLOR_CATEGORIA: Record<CategoriaBulo, string> = {
  Política: '#1F4E8C', Migración: '#DC2626', Sanidad: '#0EA5E9',
  Económica: '#16A34A', Electoral: '#7C3AED', Climática: '#0F766E',
  Internacional: '#F59E0B', Justicia: '#525258',
}

interface EventoTimeline {
  t: string                    // ISO datetime
  tipo: 'origen' | 'viral' | 'pico' | 'factcheck' | 'desmentido' | 'replica'
  canal: CanalBulo | string
  desc: string
  reach?: number
}
interface Amplificador {
  nombre: string
  canal: CanalBulo
  seguidores: number
  reach_aportado: number
  perfil: 'Bot' | 'Anónimo' | 'Medio' | 'Influencer' | 'Político' | 'Periodista' | 'Cuenta verificada'
  posicion: 'Origen' | 'Amplificador' | 'Replicador'
}
interface FactChecker {
  nombre: string
  fecha: string
  veredicto: 'FALSO' | 'ENGAÑOSO' | 'PARCIAL' | 'EN ANÁLISIS'
  url?: string
}
interface Bulo {
  id: string
  titulo: string
  categoria: CategoriaBulo
  estado: EstadoBulo
  primera_deteccion: string
  ultima_actividad: string
  texto_principal: string
  variantes: string[]
  alcance_estimado: number
  paciente_cero: {
    cuenta: string
    canal: CanalBulo
    perfil: string
    seguidores: number
    fecha_primer_post: string
    pais_origen: string
  }
  origen_tipo: OrigenBulo
  similar_a?: string                  // ID de bulo similar
  pais_aparicion_previa?: string      // dónde apareció primero (otro país)
  timeline: EventoTimeline[]
  amplificadores: Amplificador[]
  canales_activos: Array<{ canal: CanalBulo; menciones: number; pico_h: string }>
  factcheckers: FactChecker[]
  beneficiarios: string[]
  daño_estimado: number               // 0-100
  viralidad: number                   // 0-100
}

// ─── Helpers ────────────────────────────────────────────────────────────
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600 * 1000).toISOString()
}

/**
 * Genera URL pública de un perfil/canal según su naturaleza.
 *   @cuenta  · X      → https://x.com/cuenta
 *   @cuenta  · TikTok → https://tiktok.com/@cuenta
 *   Canal X  · Telegram → https://t.me/s/canal-slug
 *   Cadenas  · WhatsApp/Mail → null (no tienen URL pública)
 *   Medio    · Prensa/TV/Radio/YouTube → home conocida o búsqueda
 *
 * Si el nombre empieza por '@' es una cuenta (handle limpio).
 * Si no, asumimos canal/medio y lo slugifimos.
 */
function urlForCuenta(nombre: string, canal: CanalBulo | string): string | null {
  if (!nombre) return null
  const handle = nombre.startsWith('@') ? nombre.slice(1) : nombre
  const slug = handle.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '-').replace(/^-+|-+$/g, '')

  switch (canal) {
    case 'X':         return `https://x.com/${nombre.startsWith('@') ? handle : slug}`
    case 'TikTok':    return `https://www.tiktok.com/@${slug}`
    case 'Telegram':  return `https://t.me/s/${slug}`
    case 'Facebook':  return `https://www.facebook.com/${slug}`
    case 'Instagram': return `https://www.instagram.com/${slug}/`
    case 'YouTube':   return `https://www.youtube.com/@${slug}`
    case 'Foros':     return `https://www.google.com/search?q=${encodeURIComponent(nombre)}+forocoches`
    case 'WhatsApp':  return null
    case 'Mail':      return null
    case 'Prensa':    return urlMedio(nombre)
    case 'TV':        return urlMedio(nombre)
    case 'Radio':     return urlMedio(nombre)
    default:          return `https://www.google.com/search?q=${encodeURIComponent(nombre)}`
  }
}

/** URL home de medios conocidos (fallback Google si no listado) */
function urlMedio(nombre: string): string {
  const map: Record<string, string> = {
    'OkDiario':           'https://okdiario.com/',
    'El Confidencial':    'https://www.elconfidencial.com/',
    'El País':            'https://elpais.com/',
    'El Mundo':           'https://www.elmundo.es/',
    'ABC':                'https://www.abc.es/',
    'La Razón':           'https://www.larazon.es/',
    'El Debate':          'https://www.eldebate.com/',
    'Cadena SER':         'https://cadenaser.com/',
    'eldiario.es':        'https://www.eldiario.es/',
    '13TV Tertulia':      'https://www.trecetv.es/',
    'La Sexta':           'https://www.lasexta.com/',
    'Caso Aislado':       'https://casoaislado.com/',
    'EFE':                'https://www.efe.com/',
    'Europa Press':       'https://www.europapress.es/',
    'Política Hoy':       'https://www.youtube.com/results?search_query=' + encodeURIComponent('Política Hoy YouTube'),
  }
  // Buscar por inclusión (ej. "OkDiario" matchea "OkDiario.com")
  for (const k of Object.keys(map)) {
    if (nombre.toLowerCase().includes(k.toLowerCase())) return map[k]
  }
  return `https://www.google.com/search?q=${encodeURIComponent(nombre)}`
}

/** URL de búsqueda en el canal con el texto del bulo · permite verificar */
function busquedaCanal(canal: CanalBulo, query: string): string | null {
  const q = encodeURIComponent(query)
  switch (canal) {
    case 'X':         return `https://x.com/search?q=${q}&src=typed_query`
    case 'TikTok':    return `https://www.tiktok.com/search?q=${q}`
    case 'Telegram':  return `https://www.google.com/search?q=site:t.me+${q}`
    case 'Facebook':  return `https://www.facebook.com/search/posts/?q=${q}`
    case 'Instagram': return `https://www.instagram.com/explore/tags/${encodeURIComponent(query.replace(/[^a-z0-9]+/gi, ''))}/`
    case 'YouTube':   return `https://www.youtube.com/results?search_query=${q}`
    case 'Foros':     return `https://www.google.com/search?q=site:forocoches.com+${q}`
    case 'WhatsApp':  return null
    case 'Mail':      return null
    case 'Prensa':    return `https://www.google.com/search?q=${q}&tbm=nws`
    case 'TV':        return `https://www.youtube.com/results?search_query=${q}`
    case 'Radio':     return `https://www.google.com/search?q=${q}+radio+podcast`
    default:          return `https://www.google.com/search?q=${q}`
  }
}

/** URLs públicas de los principales fact-checkers españoles · con
 *  buscador integrado para localizar el desmentido específico */
function urlFactchecker(nombre: string, query?: string): { home: string; search?: string } {
  const q = query ? encodeURIComponent(query) : ''
  const map: Record<string, { home: string; searchTpl?: string }> = {
    'Maldita.es':         { home: 'https://maldita.es/',           searchTpl: 'https://maldita.es/buscador/?q={q}' },
    'Maldita Migración':  { home: 'https://maldita.es/migracion/', searchTpl: 'https://maldita.es/buscador/?q={q}' },
    'Maldita Ciencia':    { home: 'https://maldita.es/malditaciencia/', searchTpl: 'https://maldita.es/buscador/?q={q}' },
    'Maldita IA':         { home: 'https://maldita.es/malditatecnologia/', searchTpl: 'https://maldita.es/buscador/?q={q}' },
    'Newtral':            { home: 'https://www.newtral.es/',       searchTpl: 'https://www.newtral.es/?s={q}' },
    'EFE Verifica':       { home: 'https://verifica.efe.com/',     searchTpl: 'https://verifica.efe.com/?s={q}' },
    'AFP Verifica':       { home: 'https://factual.afp.com/factuel-es', searchTpl: 'https://factual.afp.com/search?keys={q}' },
    'Verifica RTVE':      { home: 'https://www.rtve.es/verifica/', searchTpl: 'https://www.rtve.es/buscador/?q={q}' },
  }
  const entry = map[nombre] || { home: `https://www.google.com/search?q=${encodeURIComponent(nombre + ' fact check')}` }
  return {
    home: entry.home,
    search: q && entry.searchTpl ? entry.searchTpl.replace('{q}', q) : undefined,
  }
}

/** URL externa de búsqueda del bulo en Google · permite ver evidencia */
function urlBusquedaBulo(titulo: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`"${titulo}" bulo OR desmentido`)}&tbm=nws`
}

/** URL de Maldita filtrando categoría · útil para "ver todos los bulos" */
function urlMalditaCategoria(categoria: string): string {
  const map: Record<string, string> = {
    'Política':       'https://maldita.es/politica/',
    'Migración':      'https://maldita.es/migracion/',
    'Sanidad':        'https://maldita.es/malditaciencia/',
    'Económica':      'https://maldita.es/economia/',
    'Electoral':      'https://maldita.es/elecciones/',
    'Climática':      'https://maldita.es/medioambiente/',
    'Internacional':  'https://maldita.es/internacional/',
    'Justicia':       'https://maldita.es/justicia/',
  }
  return map[categoria] || 'https://maldita.es/'
}

/** URL del partido en su web oficial (para beneficiarios) */
function urlPartido(nombre: string): string | null {
  const map: Record<string, string> = {
    'PP':   'https://www.pp.es/',
    'PSOE': 'https://www.psoe.es/',
    'VOX':  'https://www.voxespana.es/',
    'Sumar': 'https://movimientosumar.es/',
    'Junts': 'https://www.junts.cat/',
    'ERC':  'https://www.esquerra.cat/',
    'PNV':  'https://www.eaj-pnv.eus/',
    'Bildu': 'https://www.ehbildu.eus/',
  }
  for (const k of Object.keys(map)) {
    if (nombre.toLowerCase().includes(k.toLowerCase())) return map[k]
  }
  return null
}

// ─── Catálogo de bulos · escenario Q2 2026 ──────────────────────────────
const BULOS: Bulo[] = [
  {
    id: 'b-001',
    titulo: 'El Gobierno enviará una "tasa europea" a todos los autónomos',
    categoria: 'Económica',
    estado: 'CONFIRMADO_FALSO',
    primera_deteccion: hoursAgo(38),
    ultima_actividad: hoursAgo(2),
    texto_principal: 'Captura supuesta carta de la AEAT anunciando una "tasa europea armonizada" de 350€/mes a autónomos a partir de junio.',
    variantes: [
      '"La AEAT te enviará una carta de 350€ por la nueva tasa UE"',
      '"Bruselas obliga a España a crear una tasa especial para autónomos"',
      '"Hacienda pasa el cobro de la tasa europea desde junio"',
    ],
    alcance_estimado: 4_200_000,
    paciente_cero: {
      cuenta: '@Verdad_Pat_ES',
      canal: 'X',
      perfil: 'Cuenta anónima creada en marzo · 12.4k seguidores',
      seguidores: 12_400,
      fecha_primer_post: hoursAgo(38),
      pais_origen: 'España (geo IP probable)',
    },
    origen_tipo: 'Cuenta anónima',
    timeline: [
      { t: hoursAgo(38), tipo: 'origen',     canal: 'X',         desc: 'Primer post @Verdad_Pat_ES con captura falsa', reach: 8_400 },
      { t: hoursAgo(36), tipo: 'viral',      canal: 'WhatsApp',  desc: 'Reenvío masivo en grupos pymes Andalucía',     reach: 240_000 },
      { t: hoursAgo(34), tipo: 'viral',      canal: 'Telegram',  desc: 'Canal "Autónomos Indignados" publica imagen', reach: 180_000 },
      { t: hoursAgo(28), tipo: 'pico',       canal: 'X',         desc: 'Trending #TasaEuropea · 14.2k tweets/h',      reach: 1_840_000 },
      { t: hoursAgo(24), tipo: 'replica',    canal: 'Prensa',    desc: 'OkDiario titula "Indignación entre autónomos"', reach: 420_000 },
      { t: hoursAgo(20), tipo: 'replica',    canal: 'TV',        desc: 'Tertulia 13TV recoge el bulo sin contrastar', reach: 380_000 },
      { t: hoursAgo(18), tipo: 'factcheck',  canal: 'Maldita',   desc: 'Maldita publica desmentido · sin existencia tasa', reach: 220_000 },
      { t: hoursAgo(14), tipo: 'factcheck',  canal: 'Newtral',   desc: 'Newtral confirma falso · cita fuentes oficiales', reach: 180_000 },
      { t: hoursAgo(8),  tipo: 'desmentido', canal: 'Prensa',    desc: 'AEAT emite comunicado oficial desmintiendo',  reach: 740_000 },
      { t: hoursAgo(2),  tipo: 'replica',    canal: 'WhatsApp',  desc: 'Aún circula en cadenas pese al desmentido',   reach: 80_000 },
    ],
    amplificadores: [
      { nombre: '@Verdad_Pat_ES',     canal: 'X',        seguidores: 12_400, reach_aportado: 240_000, perfil: 'Anónimo',     posicion: 'Origen' },
      { nombre: 'Autónomos Indignados', canal: 'Telegram', seguidores: 38_000, reach_aportado: 420_000, perfil: 'Anónimo',     posicion: 'Amplificador' },
      { nombre: '@JLuis_Patriota',    canal: 'X',        seguidores: 184_000, reach_aportado: 680_000, perfil: 'Influencer',  posicion: 'Amplificador' },
      { nombre: 'OkDiario',           canal: 'Prensa',   seguidores: 1_200_000, reach_aportado: 920_000, perfil: 'Medio',     posicion: 'Replicador' },
      { nombre: 'Política Hoy',       canal: 'YouTube',  seguidores: 240_000, reach_aportado: 380_000, perfil: 'Influencer',  posicion: 'Amplificador' },
      { nombre: '13TV Tertulia',      canal: 'TV',       seguidores: 0,       reach_aportado: 480_000, perfil: 'Medio',       posicion: 'Replicador' },
    ],
    canales_activos: [
      { canal: 'X',         menciones: 18_400, pico_h: hoursAgo(28) },
      { canal: 'WhatsApp',  menciones: 12_000, pico_h: hoursAgo(30) },
      { canal: 'Telegram',  menciones:  8_400, pico_h: hoursAgo(28) },
      { canal: 'Prensa',    menciones:    420, pico_h: hoursAgo(20) },
      { canal: 'TV',        menciones:     12, pico_h: hoursAgo(20) },
    ],
    factcheckers: [
      { nombre: 'Maldita.es', fecha: hoursAgo(18), veredicto: 'FALSO', url: 'https://maldita.es' },
      { nombre: 'Newtral',    fecha: hoursAgo(14), veredicto: 'FALSO', url: 'https://newtral.es' },
      { nombre: 'EFE Verifica', fecha: hoursAgo(10), veredicto: 'FALSO', url: 'https://verifica.efe.com' },
    ],
    beneficiarios: ['Oposición · descrédito gestión económica', 'Plataformas anti-fiscalidad'],
    daño_estimado: 78,
    viralidad: 91,
  },
  {
    id: 'b-002',
    titulo: 'Vacuna gripe 2026 contiene microchips de seguimiento',
    categoria: 'Sanidad',
    estado: 'CONFIRMADO_FALSO',
    primera_deteccion: hoursAgo(72),
    ultima_actividad: hoursAgo(4),
    texto_principal: 'Vídeo TikTok afirmando que el lote vacunal de la campaña gripe-COVID 2026 lleva nano-tracker patentado por farma.',
    variantes: [
      '"Las vacunas de septiembre llevan microchips ARN+grafeno"',
      '"Han confesado: la vacuna sirve para geolocalizar tras la inyección"',
      '"Doctor explica el chip cuántico de la vacuna 2026"',
    ],
    alcance_estimado: 2_800_000,
    paciente_cero: {
      cuenta: '@DespiertaYa_Tk',
      canal: 'TikTok',
      perfil: 'Cuenta antivacunas · 84k seguidores · activa desde 2021',
      seguidores: 84_000,
      fecha_primer_post: hoursAgo(72),
      pais_origen: 'EEUU (geo IP) → traducción al ES',
    },
    origen_tipo: 'Telegram channel',
    similar_a: 'Misma estructura narrativa que bulos COVID-19 2021',
    pais_aparicion_previa: 'EEUU · QAnon ecosystem · febrero 2026',
    timeline: [
      { t: hoursAgo(72), tipo: 'origen',     canal: 'TikTok',   desc: 'Vídeo subido en EEUU · 1.2M views en 24h', reach: 1_200_000 },
      { t: hoursAgo(58), tipo: 'viral',      canal: 'TikTok',   desc: 'Subtítulos español + tu narrador en VPN', reach: 380_000 },
      { t: hoursAgo(48), tipo: 'viral',      canal: 'Telegram', desc: 'Canal "Resistencia Sanitaria" comparte',   reach: 220_000 },
      { t: hoursAgo(42), tipo: 'pico',       canal: 'WhatsApp', desc: 'Reenvío en grupos familiares 50+',         reach: 480_000 },
      { t: hoursAgo(36), tipo: 'replica',    canal: 'Foros',    desc: 'Forocoches hilo "¿Es verdad lo del chip?"', reach: 84_000 },
      { t: hoursAgo(30), tipo: 'factcheck',  canal: 'Maldita',  desc: 'Maldita Ciencia desmonta vídeo + análisis composición', reach: 280_000 },
      { t: hoursAgo(20), tipo: 'desmentido', canal: 'Prensa',   desc: 'AEMPS comunicado oficial · composición pública', reach: 540_000 },
      { t: hoursAgo(4),  tipo: 'replica',    canal: 'WhatsApp', desc: 'Sigue circulando en cadenas ancianos',     reach: 38_000 },
    ],
    amplificadores: [
      { nombre: '@DespiertaYa_Tk',  canal: 'TikTok',   seguidores: 84_000, reach_aportado: 1_200_000, perfil: 'Anónimo', posicion: 'Origen' },
      { nombre: 'Resistencia Sanitaria', canal: 'Telegram', seguidores: 28_000, reach_aportado: 220_000, perfil: 'Anónimo', posicion: 'Amplificador' },
      { nombre: '@Doctor_Verdad',   canal: 'X',        seguidores: 64_000, reach_aportado: 180_000, perfil: 'Influencer', posicion: 'Amplificador' },
      { nombre: 'Cadenas WhatsApp',  canal: 'WhatsApp', seguidores: 0,      reach_aportado: 480_000, perfil: 'Anónimo', posicion: 'Amplificador' },
    ],
    canales_activos: [
      { canal: 'TikTok',    menciones: 12_400, pico_h: hoursAgo(58) },
      { canal: 'WhatsApp',  menciones:  8_400, pico_h: hoursAgo(42) },
      { canal: 'Telegram',  menciones:  4_200, pico_h: hoursAgo(48) },
      { canal: 'X',         menciones:  3_800, pico_h: hoursAgo(36) },
    ],
    factcheckers: [
      { nombre: 'Maldita Ciencia', fecha: hoursAgo(30), veredicto: 'FALSO' },
      { nombre: 'Newtral',         fecha: hoursAgo(24), veredicto: 'FALSO' },
      { nombre: 'AFP Verifica',    fecha: hoursAgo(28), veredicto: 'FALSO' },
    ],
    beneficiarios: ['Movimiento antivacunas global', 'Cuentas con monetización antivax'],
    daño_estimado: 64,
    viralidad: 84,
  },
  {
    id: 'b-003',
    titulo: 'Migrantes reciben "ayuda mensual de 1.200€" del Gobierno',
    categoria: 'Migración',
    estado: 'DESMENTIDO',
    primera_deteccion: hoursAgo(96),
    ultima_actividad: hoursAgo(6),
    texto_principal: 'Captura BOE manipulada · supuesta orden ministerial concediendo 1.200€/mes a inmigrantes recién llegados.',
    variantes: [
      '"BOE confirma: 1.200€ a cada migrante africano que llega"',
      '"Mientras a ti te dan 480€, ellos cobran 1.200"',
      '"La orden está en el BOE de ayer · disposición 4521"',
    ],
    alcance_estimado: 5_200_000,
    paciente_cero: {
      cuenta: '@PatriaPrimera2026',
      canal: 'X',
      perfil: 'Cuenta crítica migración · 240k seguidores · activa 2024',
      seguidores: 240_000,
      fecha_primer_post: hoursAgo(96),
      pais_origen: 'España',
    },
    origen_tipo: 'Cuenta anónima',
    similar_a: 'Patrón clásico de bulo migración (recurrente desde 2018)',
    timeline: [
      { t: hoursAgo(96), tipo: 'origen',     canal: 'X',         desc: 'Post con captura BOE manipulada (PDF falso)', reach: 320_000 },
      { t: hoursAgo(94), tipo: 'viral',      canal: 'X',         desc: '14k retweets en 2h · trending nacional',     reach: 1_240_000 },
      { t: hoursAgo(88), tipo: 'viral',      canal: 'Telegram',  desc: 'Canal Vox patriotas comparte',                reach: 380_000 },
      { t: hoursAgo(84), tipo: 'replica',    canal: 'Facebook',  desc: 'Memes virales en grupos cerrados +50',       reach: 680_000 },
      { t: hoursAgo(72), tipo: 'pico',       canal: 'WhatsApp',  desc: 'Cadena masiva en grupos jubilados',          reach: 1_800_000 },
      { t: hoursAgo(60), tipo: 'factcheck',  canal: 'Maldita',   desc: 'Maldita Migración desmonta · BOE 4521 inexistente', reach: 280_000 },
      { t: hoursAgo(48), tipo: 'desmentido', canal: 'Prensa',    desc: 'Ministerio Inclusión emite desmentido',       reach: 420_000 },
      { t: hoursAgo(6),  tipo: 'replica',    canal: 'X',         desc: 'Sigue compartiéndose pese al desmentido',     reach: 120_000 },
    ],
    amplificadores: [
      { nombre: '@PatriaPrimera2026', canal: 'X',        seguidores: 240_000, reach_aportado: 1_240_000, perfil: 'Anónimo',  posicion: 'Origen' },
      { nombre: '@Diputado_Reaccion', canal: 'X',        seguidores: 380_000, reach_aportado: 880_000,   perfil: 'Político', posicion: 'Amplificador' },
      { nombre: 'Vox Patriotas',      canal: 'Telegram', seguidores:  84_000, reach_aportado: 380_000,   perfil: 'Anónimo',  posicion: 'Amplificador' },
      { nombre: 'Caso Aislado',       canal: 'Prensa',   seguidores: 320_000, reach_aportado: 620_000,   perfil: 'Medio',    posicion: 'Replicador' },
    ],
    canales_activos: [
      { canal: 'WhatsApp',  menciones: 24_000, pico_h: hoursAgo(72) },
      { canal: 'X',         menciones: 18_400, pico_h: hoursAgo(94) },
      { canal: 'Facebook',  menciones: 12_000, pico_h: hoursAgo(84) },
      { canal: 'Telegram',  menciones:  6_800, pico_h: hoursAgo(88) },
    ],
    factcheckers: [
      { nombre: 'Maldita Migración', fecha: hoursAgo(60), veredicto: 'FALSO' },
      { nombre: 'Newtral',           fecha: hoursAgo(54), veredicto: 'FALSO' },
      { nombre: 'EFE Verifica',      fecha: hoursAgo(48), veredicto: 'FALSO' },
    ],
    beneficiarios: ['Partidos antiinmigración', 'Cuentas con monetización política'],
    daño_estimado: 86,
    viralidad: 94,
  },
  {
    id: 'b-004',
    titulo: 'El presidente del Gobierno tiene una cuenta secreta en Suiza',
    categoria: 'Política',
    estado: 'EN_INVESTIGACION',
    primera_deteccion: hoursAgo(20),
    ultima_actividad: hoursAgo(1),
    texto_principal: 'Hilo X afirmando "filtración interna" UBS sobre cuenta de €4.5M a nombre de testaferro vinculado al presidente.',
    variantes: [
      '"Filtración UBS: cuenta de 4.5M en Suiza"',
      '"El testaferro es su exjefe de gabinete"',
      '"Documentos fechados en 2023 demuestran la transferencia"',
    ],
    alcance_estimado: 1_840_000,
    paciente_cero: {
      cuenta: 'Canal "Investigación Política"',
      canal: 'Telegram',
      perfil: 'Canal Telegram · 28k miembros · creado en 2023',
      seguidores: 28_000,
      fecha_primer_post: hoursAgo(20),
      pais_origen: 'Desconocido (VPN)',
    },
    origen_tipo: 'Telegram channel',
    timeline: [
      { t: hoursAgo(20), tipo: 'origen',    canal: 'Telegram', desc: 'Post canal con "documentos PDF" sin metadatos',  reach: 28_000 },
      { t: hoursAgo(18), tipo: 'viral',     canal: 'X',        desc: 'Hilo de cuenta anónima 80k seguidores',         reach: 240_000 },
      { t: hoursAgo(14), tipo: 'viral',     canal: 'X',        desc: 'Trending #CuentaSuiza · 6.4k tweets/h',          reach: 580_000 },
      { t: hoursAgo(10), tipo: 'replica',   canal: 'YouTube',  desc: 'Vídeo "explicación" de canal patriota 84k subs', reach: 220_000 },
      { t: hoursAgo(6),  tipo: 'replica',   canal: 'Prensa',   desc: 'OkDiario "se hace eco" sin verificación',         reach: 480_000 },
      { t: hoursAgo(3),  tipo: 'factcheck', canal: 'Maldita',  desc: 'Maldita en análisis · documentos sin firmas',    reach: 80_000 },
      { t: hoursAgo(1),  tipo: 'pico',      canal: 'X',        desc: 'Trending sigue activo · 14.8k menciones/h',      reach: 240_000 },
    ],
    amplificadores: [
      { nombre: 'Investigación Política',  canal: 'Telegram', seguidores:  28_000, reach_aportado:  84_000, perfil: 'Anónimo',     posicion: 'Origen' },
      { nombre: '@Investigador_Anon',      canal: 'X',        seguidores:  84_000, reach_aportado: 380_000, perfil: 'Anónimo',     posicion: 'Amplificador' },
      { nombre: '@LiderOposicion',         canal: 'X',        seguidores: 1_200_000, reach_aportado: 540_000, perfil: 'Político',  posicion: 'Amplificador' },
      { nombre: 'OkDiario',                canal: 'Prensa',   seguidores: 1_200_000, reach_aportado: 480_000, perfil: 'Medio',     posicion: 'Replicador' },
    ],
    canales_activos: [
      { canal: 'X',         menciones: 24_000, pico_h: hoursAgo(14) },
      { canal: 'Telegram',  menciones:  8_400, pico_h: hoursAgo(18) },
      { canal: 'YouTube',   menciones:    240, pico_h: hoursAgo(10) },
      { canal: 'Prensa',    menciones:     38, pico_h: hoursAgo(6)  },
    ],
    factcheckers: [
      { nombre: 'Maldita.es', fecha: hoursAgo(3), veredicto: 'EN ANÁLISIS' },
      { nombre: 'Newtral',    fecha: hoursAgo(2), veredicto: 'EN ANÁLISIS' },
    ],
    beneficiarios: ['Oposición política', 'Medios afines a oposición'],
    daño_estimado: 72,
    viralidad: 81,
  },
  {
    id: 'b-005',
    titulo: 'Un nuevo "test PCR obligatorio" en aeropuertos para cobrar 80€',
    categoria: 'Sanidad',
    estado: 'CONFIRMADO_FALSO',
    primera_deteccion: hoursAgo(56),
    ultima_actividad: hoursAgo(8),
    texto_principal: 'Cadena WhatsApp con audio supuestamente de un sanitario AENA anunciando "obligación PCR pago 80€" para todos los vuelos a partir de mayo.',
    variantes: [
      '"Audio sanitario AENA: vuelven los PCR de 80€"',
      '"Te van a cobrar 80€ en el aeropuerto antes de volar"',
      '"AENA confirma test obligatorio en 2026"',
    ],
    alcance_estimado: 1_240_000,
    paciente_cero: {
      cuenta: 'Mensaje WhatsApp anónimo',
      canal: 'WhatsApp',
      perfil: 'Audio sin atribuir · primera circulación grupo familiar Murcia',
      seguidores: 0,
      fecha_primer_post: hoursAgo(56),
      pais_origen: 'España',
    },
    origen_tipo: 'Mensaje WhatsApp',
    similar_a: 'Mismo formato que bulos COVID restricciones 2021',
    timeline: [
      { t: hoursAgo(56), tipo: 'origen',     canal: 'WhatsApp', desc: 'Audio originario · grupo familiar Murcia',     reach: 0 },
      { t: hoursAgo(52), tipo: 'viral',      canal: 'WhatsApp', desc: 'Reenvío masivo en grupos vacacionales',         reach: 480_000 },
      { t: hoursAgo(44), tipo: 'viral',      canal: 'X',        desc: 'Cuenta amplifica audio en post viral',          reach: 240_000 },
      { t: hoursAgo(36), tipo: 'pico',       canal: 'WhatsApp', desc: 'Pico de circulación en cadenas',                reach: 380_000 },
      { t: hoursAgo(28), tipo: 'factcheck',  canal: 'Maldita',  desc: 'Maldita audio · análisis acústico · falso',    reach: 140_000 },
      { t: hoursAgo(24), tipo: 'desmentido', canal: 'Prensa',   desc: 'AENA emite comunicado · ningún PCR previsto',  reach: 320_000 },
      { t: hoursAgo(8),  tipo: 'replica',    canal: 'WhatsApp', desc: 'Aún circula previo Semana Santa',               reach: 80_000 },
    ],
    amplificadores: [
      { nombre: 'Cadenas WhatsApp', canal: 'WhatsApp', seguidores: 0,       reach_aportado: 860_000, perfil: 'Anónimo',     posicion: 'Origen' },
      { nombre: '@Vuelos_ESP',      canal: 'X',        seguidores: 84_000,  reach_aportado: 240_000, perfil: 'Influencer',  posicion: 'Amplificador' },
    ],
    canales_activos: [
      { canal: 'WhatsApp',  menciones: 18_400, pico_h: hoursAgo(36) },
      { canal: 'X',         menciones:  3_200, pico_h: hoursAgo(44) },
      { canal: 'Facebook',  menciones:  1_200, pico_h: hoursAgo(40) },
    ],
    factcheckers: [
      { nombre: 'Maldita.es',   fecha: hoursAgo(28), veredicto: 'FALSO' },
      { nombre: 'EFE Verifica', fecha: hoursAgo(20), veredicto: 'FALSO' },
    ],
    beneficiarios: ['Cuentas que monetizan miedo viaje'],
    daño_estimado: 42,
    viralidad: 68,
  },
  {
    id: 'b-006',
    titulo: 'Una sentencia "secreta" del TS prohibe el toro en toda España',
    categoria: 'Justicia',
    estado: 'CONFIRMADO_FALSO',
    primera_deteccion: hoursAgo(120),
    ultima_actividad: hoursAgo(24),
    texto_principal: 'Imagen supuestamente de la portada de El País anunciando una "sentencia confidencial" del TS que prohibiría las corridas de toros en toda España.',
    variantes: [
      '"El País filtra: el TS prohibe los toros"',
      '"Sentencia confidencial declara ilegal la tauromaquia"',
      '"Llegó el día: prohibición nacional"',
    ],
    alcance_estimado: 980_000,
    paciente_cero: {
      cuenta: '@Espana_Sin_Toros',
      canal: 'X',
      perfil: 'Cuenta proanimalista · 18k seguidores · creada 2025',
      seguidores: 18_000,
      fecha_primer_post: hoursAgo(120),
      pais_origen: 'España',
    },
    origen_tipo: 'Cuenta anónima',
    timeline: [
      { t: hoursAgo(120), tipo: 'origen',    canal: 'X',        desc: 'Post con portada El País photoshopeada',        reach:  84_000 },
      { t: hoursAgo(108), tipo: 'viral',     canal: 'Facebook', desc: 'Comparte en grupos animalistas y antitaurinos', reach: 220_000 },
      { t: hoursAgo(96),  tipo: 'replica',   canal: 'TikTok',   desc: 'Vídeos celebración + comentarios',              reach: 380_000 },
      { t: hoursAgo(84),  tipo: 'pico',      canal: 'X',        desc: 'Grupos taurinos lo viralizan para indignación', reach: 280_000 },
      { t: hoursAgo(72),  tipo: 'factcheck', canal: 'Maldita',  desc: 'Maldita · El País no ha publicado nada · falso', reach: 180_000 },
      { t: hoursAgo(60),  tipo: 'desmentido', canal: 'Prensa',  desc: 'CGPJ · ninguna sentencia conocida',             reach: 140_000 },
      { t: hoursAgo(24),  tipo: 'replica',   canal: 'WhatsApp', desc: 'Sigue circulando aunque ya residual',           reach:  20_000 },
    ],
    amplificadores: [
      { nombre: '@Espana_Sin_Toros', canal: 'X',        seguidores:  18_000, reach_aportado:  84_000, perfil: 'Anónimo',  posicion: 'Origen' },
      { nombre: '@TaurinoIndig',     canal: 'X',        seguidores: 124_000, reach_aportado: 280_000, perfil: 'Influencer', posicion: 'Amplificador' },
    ],
    canales_activos: [
      { canal: 'X',         menciones:  6_400, pico_h: hoursAgo(84) },
      { canal: 'Facebook',  menciones:  4_200, pico_h: hoursAgo(108) },
      { canal: 'TikTok',    menciones:  3_800, pico_h: hoursAgo(96) },
    ],
    factcheckers: [
      { nombre: 'Maldita.es', fecha: hoursAgo(72), veredicto: 'FALSO' },
      { nombre: 'Newtral',    fecha: hoursAgo(60), veredicto: 'FALSO' },
    ],
    beneficiarios: ['Cuentas polarizadoras de ambos bandos'],
    daño_estimado: 38,
    viralidad: 54,
  },
  {
    id: 'b-007',
    titulo: 'España "obligada" a pagar 80M a Marruecos por una sentencia europea',
    categoria: 'Internacional',
    estado: 'PARCIAL',
    primera_deteccion: hoursAgo(48),
    ultima_actividad: hoursAgo(6),
    texto_principal: 'Titular distorsionado sobre una sentencia del TJUE: presenta como "indemnización a Marruecos" lo que es realmente devolución de aranceles al sector pesquero.',
    variantes: [
      '"España pagará 80M a Marruecos por orden de la UE"',
      '"Indemnización a Mohamed VI por la pesca"',
      '"Bruselas obliga a indemnizar al rey alauí"',
    ],
    alcance_estimado: 740_000,
    paciente_cero: {
      cuenta: '@Patria_Mediterranea',
      canal: 'X',
      perfil: 'Cuenta nacionalista · 84k seguidores · activa desde 2022',
      seguidores: 84_000,
      fecha_primer_post: hoursAgo(48),
      pais_origen: 'España',
    },
    origen_tipo: 'Cuenta anónima',
    timeline: [
      { t: hoursAgo(48), tipo: 'origen',    canal: 'X',       desc: 'Post con titular distorsionado de noticia real', reach: 240_000 },
      { t: hoursAgo(42), tipo: 'viral',     canal: 'X',       desc: '8.4k retweets · indignación movilización',       reach: 380_000 },
      { t: hoursAgo(38), tipo: 'replica',   canal: 'Foros',   desc: 'Forocoches y burbuja debaten',                   reach:  80_000 },
      { t: hoursAgo(28), tipo: 'factcheck', canal: 'Newtral', desc: 'Newtral · matiz importante · es devolución arancel', reach: 120_000 },
      { t: hoursAgo(20), tipo: 'pico',      canal: 'X',       desc: 'Sigue trending pese al matiz',                  reach: 220_000 },
      { t: hoursAgo(6),  tipo: 'replica',   canal: 'X',       desc: 'Continúa circulando con framing distorsionado',  reach:  84_000 },
    ],
    amplificadores: [
      { nombre: '@Patria_Mediterranea', canal: 'X', seguidores:  84_000, reach_aportado: 380_000, perfil: 'Anónimo',  posicion: 'Origen' },
      { nombre: '@MarroquíaFuera',      canal: 'X', seguidores: 124_000, reach_aportado: 280_000, perfil: 'Influencer', posicion: 'Amplificador' },
    ],
    canales_activos: [
      { canal: 'X',     menciones: 14_000, pico_h: hoursAgo(20) },
      { canal: 'Foros', menciones:  4_200, pico_h: hoursAgo(38) },
    ],
    factcheckers: [
      { nombre: 'Newtral',    fecha: hoursAgo(28), veredicto: 'ENGAÑOSO' },
      { nombre: 'Maldita.es', fecha: hoursAgo(24), veredicto: 'PARCIAL' },
    ],
    beneficiarios: ['Cuentas nacionalistas anti-magrebíes', 'Partidos antiinmigración'],
    daño_estimado: 52,
    viralidad: 64,
  },
  {
    id: 'b-008',
    titulo: 'Una candidata de Vox dijo "queremos campos de exterminio para inmigrantes"',
    categoria: 'Electoral',
    estado: 'CONFIRMADO_FALSO',
    primera_deteccion: hoursAgo(30),
    ultima_actividad: hoursAgo(2),
    texto_principal: 'Vídeo manipulado con cortes de audio fuera de contexto · IA atribuye frase nunca pronunciada a candidata autonómica.',
    variantes: [
      '"Vox propone campos de exterminio · vídeo viral"',
      '"Confesión de candidata Vox sobre inmigrantes"',
    ],
    alcance_estimado: 1_640_000,
    paciente_cero: {
      cuenta: '@Antifacha2026',
      canal: 'TikTok',
      perfil: 'Cuenta antifascista · 38k seguidores · activa desde 2024',
      seguidores: 38_000,
      fecha_primer_post: hoursAgo(30),
      pais_origen: 'España',
    },
    origen_tipo: 'Cuenta anónima',
    timeline: [
      { t: hoursAgo(30), tipo: 'origen',     canal: 'TikTok',  desc: 'Vídeo subido · 320k views en 4h',              reach: 320_000 },
      { t: hoursAgo(26), tipo: 'viral',      canal: 'X',       desc: 'Reposts masivos · 18k retweets',                reach: 480_000 },
      { t: hoursAgo(20), tipo: 'replica',    canal: 'Prensa',  desc: 'Medios afines izquierda lo recogen sin verificar', reach: 280_000 },
      { t: hoursAgo(14), tipo: 'factcheck',  canal: 'Maldita', desc: 'Maldita IA · audio manipulado con TTS', reach: 220_000 },
      { t: hoursAgo(10), tipo: 'desmentido', canal: 'Prensa',  desc: 'Vox emite desmentido · presenta vídeo original', reach: 180_000 },
      { t: hoursAgo(4),  tipo: 'replica',    canal: 'TikTok',  desc: 'Cuenta original elimina pero sigue copiado',   reach: 120_000 },
      { t: hoursAgo(2),  tipo: 'pico',       canal: 'X',       desc: 'Aún viral · debate sobre IA en política',       reach:  80_000 },
    ],
    amplificadores: [
      { nombre: '@Antifacha2026',     canal: 'TikTok', seguidores: 38_000,  reach_aportado: 320_000, perfil: 'Anónimo',  posicion: 'Origen' },
      { nombre: '@Resistencia_ES',    canal: 'X',      seguidores: 184_000, reach_aportado: 380_000, perfil: 'Influencer', posicion: 'Amplificador' },
    ],
    canales_activos: [
      { canal: 'TikTok',  menciones:  8_400, pico_h: hoursAgo(26) },
      { canal: 'X',       menciones: 18_400, pico_h: hoursAgo(2)  },
      { canal: 'Prensa',  menciones:    140, pico_h: hoursAgo(20) },
    ],
    factcheckers: [
      { nombre: 'Maldita IA',       fecha: hoursAgo(14), veredicto: 'FALSO' },
      { nombre: 'Newtral',          fecha: hoursAgo(12), veredicto: 'FALSO' },
      { nombre: 'AFP Verifica',     fecha: hoursAgo(10), veredicto: 'FALSO' },
    ],
    beneficiarios: ['Bloque progresista', 'Antifascistas independientes'],
    daño_estimado: 68,
    viralidad: 78,
  },
]

// ─── Top fuentes (cuentas/medios que más bulos originan o amplifican) ───
const TOP_FUENTES = [
  { fuente: '@PatriaPrimera2026', tipo: 'Cuenta anónima X', n_bulos_origen: 4, n_bulos_amplif: 12, score_riesgo: 92 },
  { fuente: 'OkDiario',           tipo: 'Medio digital',     n_bulos_origen: 0, n_bulos_amplif: 18, score_riesgo: 78 },
  { fuente: 'Investigación Política', tipo: 'Canal Telegram', n_bulos_origen: 3, n_bulos_amplif:  8, score_riesgo: 84 },
  { fuente: '@Verdad_Pat_ES',     tipo: 'Cuenta anónima X', n_bulos_origen: 2, n_bulos_amplif:  6, score_riesgo: 76 },
  { fuente: '@DespiertaYa_Tk',    tipo: 'Cuenta antivax TikTok', n_bulos_origen: 5, n_bulos_amplif:  9, score_riesgo: 81 },
  { fuente: 'Resistencia Sanitaria', tipo: 'Canal Telegram', n_bulos_origen: 1, n_bulos_amplif: 11, score_riesgo: 72 },
  { fuente: 'Caso Aislado',       tipo: 'Medio digital',     n_bulos_origen: 0, n_bulos_amplif: 14, score_riesgo: 70 },
  { fuente: 'Cadenas WhatsApp',   tipo: 'Canal anónimo',     n_bulos_origen: 0, n_bulos_amplif: 24, score_riesgo: 88 },
]

// ─── Heatmap canales × días (intensidad de bulos detectados) ────────────
function buildCanalesHeatmap() {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400 * 1000)
    return d.toISOString().slice(0, 10)
  })
  const canales: CanalBulo[] = ['X', 'WhatsApp', 'Telegram', 'TikTok', 'Facebook', 'YouTube', 'Foros', 'Prensa']
  const baseline: Record<CanalBulo, number[]> = {
    X:        [12, 18, 24, 32, 28, 22, 38],
    WhatsApp: [22, 28, 32, 38, 34, 28, 42],
    Telegram: [ 8, 12, 14, 18, 16, 14, 22],
    TikTok:   [18, 22, 28, 24, 32, 28, 34],
    Facebook: [ 6,  8,  9, 11, 12, 10, 14],
    YouTube:  [ 4,  5,  6,  7,  8,  6,  9],
    Foros:    [ 8, 10, 12,  9, 14, 11, 12],
    Prensa:   [ 2,  3,  4,  5,  6,  4,  8],
    Instagram: [], TV: [], Radio: [], Mail: [],
  }
  return {
    days,
    canales,
    matrix: canales.map(c => baseline[c]),
  }
}

export async function GET() {
  const t0 = Date.now()
  const total = BULOS.length
  const desmentidos = BULOS.filter(b => b.estado === 'CONFIRMADO_FALSO' || b.estado === 'DESMENTIDO').length
  const en_invest = BULOS.filter(b => b.estado === 'EN_INVESTIGACION').length
  const alcance_total = BULOS.reduce((s, b) => s + b.alcance_estimado, 0)
  const viralidad_max = BULOS.reduce((max, b) => Math.max(max, b.viralidad), 0)

  // Enriquecimiento: añadir URLs auto-generadas a TODOS los elementos
  const bulosConLinks = BULOS.map(b => ({
    ...b,
    busqueda_url: urlBusquedaBulo(b.titulo),
    categoria_url: urlMalditaCategoria(b.categoria),
    paciente_cero: {
      ...b.paciente_cero,
      url: urlForCuenta(b.paciente_cero.cuenta, b.paciente_cero.canal),
    },
    amplificadores: b.amplificadores.map(a => ({
      ...a,
      url: urlForCuenta(a.nombre, a.canal),
    })),
    canales_activos: b.canales_activos.map(c => ({
      ...c,
      url: busquedaCanal(c.canal, b.titulo),
    })),
    factcheckers: b.factcheckers.map(f => {
      const provided = f.url
      const auto = urlFactchecker(f.nombre, b.titulo)
      return { ...f, url: provided || auto.search || auto.home }
    }),
    beneficiarios: b.beneficiarios.map(name => ({
      nombre: name,
      url: urlPartido(name),
    })),
    timeline: b.timeline.map(ev => ({
      ...ev,
      // Para eventos de tipo 'replica/viral/pico' en un canal, link a búsqueda en el canal
      url: ev.canal in COLOR_CANAL
        ? busquedaCanal(ev.canal as CanalBulo, b.titulo)
        : null,
    })),
  }))

  // Top fuentes con URL
  const topFuentesConLinks = TOP_FUENTES.map(f => {
    // Detectar canal por tipo
    let canal: CanalBulo | string = 'X'
    if (f.tipo.includes('Telegram')) canal = 'Telegram'
    else if (f.tipo.includes('TikTok')) canal = 'TikTok'
    else if (f.tipo.includes('Medio')) canal = 'Prensa'
    else if (f.tipo.includes('WhatsApp')) canal = 'WhatsApp'
    return {
      ...f,
      url: urlForCuenta(f.fuente, canal),
    }
  })

  // ── BULOS LIVE de Maldita.es + Newtral RSS ────────────────────────
  // Combinamos los bulos detallados (mock con timeline completa) con
  // los bulos en vivo de los feeds reales para tener cobertura actualizada.
  let bulosLive: BuloDetectado[] = []
  try {
    bulosLive = await fetchAllBulosLive(15)
  } catch { /* ignore · seguimos solo con mock */ }

  return NextResponse.json({
    kpis: {
      bulos_activos: total + bulosLive.length,
      desmentidos: desmentidos + bulosLive.filter(b => b.veredicto === 'FALSO' || b.veredicto === 'ENGAÑOSO').length,
      en_investigacion: en_invest + bulosLive.filter(b => b.veredicto === 'EN ANÁLISIS').length,
      alcance_total,
      viralidad_max,
      delta_24h: bulosLive.filter(b => Date.now() - new Date(b.fecha).getTime() < 86400000).length,
    },
    bulos: bulosConLinks,
    bulos_live: bulosLive,                       // NUEVOS · feeds Maldita+Newtral en vivo
    top_fuentes: topFuentesConLinks,
    canales_heatmap: buildCanalesHeatmap(),
    color_estado: COLOR_ESTADO,
    color_canal: COLOR_CANAL,
    color_categoria: COLOR_CATEGORIA,
    fact_checkers: ['Maldita.es', 'Newtral', 'EFE Verifica', 'AFP Verifica', 'Verifica RTVE', 'Maldita Migración', 'Maldita Ciencia'].map(n => ({
      nombre: n,
      url: urlFactchecker(n).home,
      twitter: `https://x.com/${n.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    })),
    fetched_at: new Date().toISOString(),
    fetch_ms: Date.now() - t0,
    fuentes: 'Maldita.es RSS + Newtral RSS (live) + catálogo curado (timeline trazabilidad)',
    _meta: {
      source: bulosLive.length > 0 ? 'aggregator' : 'mock',
      ts: new Date().toISOString(),
      live_feeds_ok: bulosLive.length,
    },
  }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } })
}
