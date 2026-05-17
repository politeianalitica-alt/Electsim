/**
 * Perfil ENRIQUECIDO de Municipio (8.132 cubiertos).
 *
 * Combina dinámicamente:
 *   - Wikipedia REST API (bio + foto)
 *   - Wikidata SPARQL (alcalde actual + foto + partido)
 *   - RSS news (50 medios filtrados por tokens del municipio)
 *   - INE: pirámide poblacional + renta media + extranjeros
 *   - Narrativas IA (clustering de noticias)
 *   - Score de estabilidad política
 *   - Preocupaciones detectadas
 *   - Tags clave en cobertura
 *   - Resumen IA del municipio
 */

import { getMunicipioBySlug, type Municipio } from './municipios-catalog'
import { getCCAABySlug } from './ccaa-catalog'
import { fetchWikipediaSummary } from '@/lib/figures/wikipedia'
import { getAggregatedNews, type AggregatedArticle } from '@/lib/news-aggregator'
import { fetchAlcaldePorIne, fetchFotoPersona, fetchCoordenadasMunicipio, type WikidataGobernante } from './sources/wikidata'
import { fetchTiempo, type CondicionMeteo } from './sources/weather'
import { fetchTejidoEmpresarial, type TejidoEmpresarial } from './sources/empresas'
import { fetchPatrimonioMunicipio, type PatrimonioCultural } from './sources/cultura'
import { getAgendaMunicipio, type EventoAgenda } from './sources/agenda'
import { fetchHistoricoAlcaldes, type AlcaldeHistorico } from './sources/historico-alcaldes'
import { fetchSerieHistoricaPoblacion, type SerieHistoricaPoblacion } from './sources/poblacion-historica'
import { estimarPresupuestoMunicipal, type PresupuestoMunicipal } from './sources/presupuesto-municipal'
import { fetchPiramide, fetchRentaMedia, fetchExtranjeros, type INEPiramide, type INERentaMedia, type INEExtranjeros } from './sources/ine'
import { detectarNarrativas, scoreEstabilidad, type Narrativa } from './ai/narrativas'
import { analizarIntegral, type AnalisisIntegral } from './ai/analisis-integral'
import { getMunicipioElectoralLinks } from './sources/electoral'

export interface MunicipioProfile {
  meta: Municipio
  ccaaNombre: string
  ccaaColor: string
  bio: { extract: string; sourceUrl: string | null }
  alcalde: WikidataGobernante | null
  alcaldeFoto: string | null
  noticias: Array<{
    titulo: string; medio: string; fecha: string | null; url: string
    sentiment: string; sentiment_score: number; descripcion: string
  }>
  sentimientoAgregado: {
    positivo: number; negativo: number; neutral: number
    score: number; tendencia: 'up' | 'down' | 'stable'
  }
  narrativas: Narrativa[]
  estabilidad: { score: number; banda: 'baja' | 'media' | 'alta'; razones: string[] }
  tagsCobertura: string[]
  preocupaciones: string[]
  resumenIA: string
  /** Análisis integral IA (riesgo, oportunidades, amenazas, prioridades) */
  analisisIntegral: AnalisisIntegral
  /** Enlaces oficiales a resultados electorales municipales */
  enlacesElectorales: {
    consultaMir: string; wikipedia: string; junta: string; cpro: string
  }
  /** Coordenadas geográficas (Wikidata P625) */
  coords: { lat: number; lon: number } | null
  /** Condiciones meteorológicas actuales (Open-Meteo) */
  tiempo: CondicionMeteo | null
  // INE
  piramide: INEPiramide | null
  rentaMedia: INERentaMedia | null
  extranjeros: INEExtranjeros | null
  /** Tejido empresarial (INE DIRCE) */
  empresas: TejidoEmpresarial | null
  /** Patrimonio cultural y BIC (Wikidata) */
  patrimonio: PatrimonioCultural | null
  /** Agenda y próximas citas */
  agenda: EventoAgenda[]
  /** Histórico de alcaldes (Wikidata) */
  historicoAlcaldes: AlcaldeHistorico[]
  /** Serie histórica de población (INE Padrón) */
  seriePoblacion: SerieHistoricaPoblacion | null
  /** Presupuesto municipal estimado (Mº Hacienda benchmarks) */
  presupuesto: PresupuestoMunicipal | null
  metrics: {
    nNoticias7d: number
    densidadHabKm2: number
  }
  updatedAt: string
}

export async function buildMunicipioProfile(slug: string): Promise<MunicipioProfile | null> {
  const meta = getMunicipioBySlug(slug)
  if (!meta) return null
  const ccaa = getCCAABySlug(meta.ccaa)

  const [bio, articles, alcalde, piramide, rentaMedia, extranjeros, coords, empresas, patrimonio, historicoAlcaldes, seriePoblacion] = await Promise.all([
    fetchBio(meta),
    getAggregatedNews({ maxSources: 40, hoursBack: 168 }).catch(() => [] as AggregatedArticle[]),
    fetchAlcaldePorIne(meta.ine).catch(() => null),
    fetchPiramide(meta.ine).catch(() => null),
    fetchRentaMedia(meta.ine).catch(() => null),
    fetchExtranjeros(meta.ine).catch(() => null),
    fetchCoordenadasMunicipio(meta.ine).catch(() => null),
    fetchTejidoEmpresarial(meta.ine, meta.poblacion).catch(() => null),
    fetchPatrimonioMunicipio(meta.ine).catch(() => null),
    fetchHistoricoAlcaldes(meta.ine).catch(() => [] as AlcaldeHistorico[]),
    fetchSerieHistoricaPoblacion(meta.ine, 20).catch(() => null),
  ])
  const agenda = getAgendaMunicipio(meta.webAyuntamiento || undefined)
  const presupuesto = estimarPresupuestoMunicipal(meta.ine, meta.poblacion)

  const [alcaldeFoto, tiempo] = await Promise.all([
    alcalde?.qid ? fetchFotoPersona(alcalde.qid).catch(() => null) : Promise.resolve(null),
    coords ? fetchTiempo(coords.lat, coords.lon).catch(() => null) : Promise.resolve(null),
  ])

  // Tokens con word-boundary para evitar falsos positivos
  const tokens = meta.tokens || [meta.nombre.toLowerCase()]
  const tokenPatterns = tokens.map(t => {
    try { return new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i') } catch { return null }
  }).filter((r): r is RegExp => !!r)
  const noticiasMatched = articles.filter(a => {
    const txt = (a.title + ' ' + a.description).toLowerCase()
    return tokenPatterns.some(re => re.test(txt))
  })

  const sentimientoAgregado = computeAgregado(noticiasMatched)
  const tagsCobertura = extractTags(noticiasMatched)
  const preocupaciones = analyzePreocupaciones(noticiasMatched)
  const narrativas = detectarNarrativas(noticiasMatched, 6)
  const estabilidad = scoreEstabilidad({
    noticiasNegativas: sentimientoAgregado.negativo,
    noticiasTotal: noticiasMatched.length,
    preocupaciones: preocupaciones.length,
    narrativas,
  })
  const resumenIA = sintesisMunicipio(meta, alcalde, sentimientoAgregado, preocupaciones, narrativas, rentaMedia)
  const analisisIntegral = analizarIntegral({
    noticiasTotal: noticiasMatched.length,
    sentimientoScore: sentimientoAgregado.score,
    sentimientoNegativo: sentimientoAgregado.negativo,
    preocupaciones, narrativas, estabilidadScore: estabilidad.score,
    rentaMedia, extranjeros, tendenciaSentimiento: sentimientoAgregado.tendencia,
    poblacion: meta.poblacion,
  })

  return {
    meta,
    ccaaNombre: ccaa?.nombre || meta.ccaa,
    ccaaColor: ccaa?.color || '#525258',
    bio,
    alcalde,
    alcaldeFoto,
    noticias: noticiasMatched.slice(0, 30).map(a => ({
      titulo: a.title, medio: a.medio.nombre, fecha: a.pub_date_iso, url: a.link,
      sentiment: a.sentiment, sentiment_score: a.sentiment_score,
      descripcion: (a.description || '').slice(0, 180),
    })),
    sentimientoAgregado,
    narrativas,
    estabilidad,
    tagsCobertura,
    preocupaciones,
    resumenIA,
    analisisIntegral,
    enlacesElectorales: getMunicipioElectoralLinks(meta.ine, meta.nombre),
    coords,
    tiempo,
    piramide,
    rentaMedia,
    extranjeros,
    empresas,
    patrimonio,
    agenda,
    historicoAlcaldes,
    seriePoblacion,
    presupuesto,
    metrics: {
      nNoticias7d: noticiasMatched.length,
      densidadHabKm2: meta.superficie && meta.superficie > 0 ? Math.round(meta.poblacion / meta.superficie) : 0,
    },
    updatedAt: new Date().toISOString(),
  }
}

async function fetchBio(meta: Municipio) {
  const candidatos = [
    meta.nombre,
    `${meta.nombre} (${meta.provincia})`,
    meta.nombre.split('/')[0].trim(),
    meta.nombre.replace(/^.+\s+de\s+/i, '').trim(),
  ]
  for (const candidato of candidatos) {
    const summary = await fetchWikipediaSummary(candidato)
    if (summary?.extract && summary.extract.length > 100) {
      return {
        extract: summary.extract,
        sourceUrl: summary.content_urls?.desktop?.page || meta.wikipedia || null,
      }
    }
  }
  return { extract: '', sourceUrl: meta.wikipedia || null }
}

function computeAgregado(noticias: AggregatedArticle[]) {
  if (noticias.length === 0) return { positivo: 0, negativo: 0, neutral: 0, score: 0, tendencia: 'stable' as const }
  let pos = 0, neg = 0, neu = 0, sum = 0
  for (const a of noticias) {
    if (a.sentiment === 'positive') pos++
    else if (a.sentiment === 'negative') neg++
    else neu++
    sum += a.sentiment_score
  }
  const score = +(sum / noticias.length).toFixed(2)
  const half = Math.floor(noticias.length / 2)
  const rec = noticias.slice(0, half)
  const ant = noticias.slice(half)
  const ar = rec.length ? rec.reduce((s, x) => s + x.sentiment_score, 0) / rec.length : 0
  const aa = ant.length ? ant.reduce((s, x) => s + x.sentiment_score, 0) / ant.length : 0
  const tendencia: 'up' | 'down' | 'stable' = ar - aa > 0.1 ? 'up' : ar - aa < -0.1 ? 'down' : 'stable'
  return { positivo: pos, negativo: neg, neutral: neu, score, tendencia }
}

function extractTags(noticias: AggregatedArticle[]): string[] {
  const STOP = new Set(['sobre','desde','hasta','según','tras','ante','entre','durante','esta','este','estos','estas',
    'también','aunque','mientras','porque','cuando','donde','quien','cómo','país','nuevo','nueva','última',
    'primera','segundo','pacto','acuerdo','dice','asegura','alcalde','ayuntamiento','ciudad'])
  const freq: Record<string, number> = {}
  for (const a of noticias) {
    for (const w of a.title.toLowerCase().split(/\W+/)) {
      if (w.length >= 5 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0])
}

function analyzePreocupaciones(noticias: AggregatedArticle[]): string[] {
  const out = new Set<string>()
  const PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /vivienda|alquiler|precio.*vivienda/i, label: 'Vivienda asequible' },
    { pattern: /movilidad|tr[áa]fico|transporte p[úu]blico|metro|bus|peat/i, label: 'Movilidad y transporte' },
    { pattern: /turismo|turistas|saturaci[óo]n/i, label: 'Turismo y saturación' },
    { pattern: /seguridad|delincuencia|asalto|robo/i, label: 'Seguridad ciudadana' },
    { pattern: /limpieza|basura|residuos/i, label: 'Limpieza y residuos' },
    { pattern: /sanidad|hospital|atenci[óo]n primaria/i, label: 'Sanidad local' },
    { pattern: /educa(?:ci[óo]n|tivo)|escuelas/i, label: 'Educación' },
    { pattern: /protesta|huelga|manifestaci[óo]n/i, label: 'Protestas' },
    { pattern: /empleo|paro|desempleo/i, label: 'Empleo' },
    { pattern: /obras|infraestructura/i, label: 'Obras públicas' },
    { pattern: /agua|sequ[íi]a/i, label: 'Recursos hídricos' },
    { pattern: /emergencia|incendio|inundaci[óo]n|dana/i, label: 'Emergencias' },
    { pattern: /cultura|festival|patrimonio/i, label: 'Cultura y patrimonio' },
  ]
  for (const a of noticias) {
    const txt = a.title + ' ' + a.description
    for (const { pattern, label } of PATTERNS) {
      if (pattern.test(txt)) out.add(label)
    }
  }
  return Array.from(out).slice(0, 7)
}

function sintesisMunicipio(
  meta: Municipio,
  alcalde: WikidataGobernante | null,
  s: { positivo: number; negativo: number; score: number; tendencia: string },
  preocupaciones: string[],
  narrativas: Narrativa[],
  renta: INERentaMedia | null,
): string {
  const total = s.positivo + s.negativo
  const tonoLabel = s.score > 0.1 ? 'positivo' : s.score < -0.1 ? 'negativo' : 'mixto'

  let r = `${meta.nombre} (${meta.provincia}, INE ${meta.ine}) `
  if (alcalde) {
    r += `está gobernado por ${alcalde.nombre}`
    if (alcalde.partidoNombre) r += ` (${alcalde.partidoNombre})`
    if (alcalde.inicioCargo) r += ` desde ${alcalde.inicioCargo}`
    r += `. `
  }
  r += `Tiene ${meta.poblacion.toLocaleString('es-ES')} habitantes`
  if (renta?.rentaMediaHogar) r += ` con renta media por hogar de ${renta.rentaMediaHogar.toLocaleString('es-ES')} € (${renta.año})`
  r += `. `

  if (total > 0) {
    r += `Cobertura mediática últimos 7 días: ${total} noticias con tono ${tonoLabel}.`
  }
  if (narrativas.length > 0) {
    r += ` Narrativas dominantes: ${narrativas.slice(0, 3).map(n => n.nombre).join(', ')}.`
  }
  if (preocupaciones.length > 0) {
    r += ` Preocupaciones detectadas: ${preocupaciones.slice(0, 3).join(', ')}.`
  }
  return r
}
