import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface NarrativeFrameAnalysis {
  problem_definition?: string
  causal_interpretation?: string
  moral_evaluation?: string
  treatment_recommendation?: string
  dominant_metaphor?: string
  frame_label?: string
  actors_protagonist?: string[]
  actors_antagonist?: string[]
  ideological_lean?: string
  narrative_velocity?: string
  counter_frame_suggested?: string
  strategic_recommendation?: string
  error?: string
}

export interface Narrative {
  topic: string
  category: string
  n_articles: number
  n_sources: number
  dominant_sentiment: string
  sentiment_polarity: number
  avg_relevance: number
  high_impact_count: number
  velocity: 'subiendo' | 'estable' | 'bajando'
  recent_24h: number
  top_personas: { name: string; cnt: number }[]
  top_orgs:     { name: string; cnt: number }[]
  countries:    { name: string; cnt: number }[]
  samples: Array<{ id: number; title: string; source: string; summary: string; sentiment: string; relevance: number; spain_impact: string }>
  framework_analysis?: NarrativeFrameAnalysis
  first_seen?: string
  last_seen?: string
}

const ISO_3H_AGO = () => new Date(Date.now() - 3 * 3600_000).toISOString()
const ISO_24H_AGO = () => new Date(Date.now() - 24 * 3600_000).toISOString()
const ISO_72H_AGO = () => new Date(Date.now() - 72 * 3600_000).toISOString()

const MOCK_NARRATIVES: Narrative[] = [
  {
    topic: 'Ruptura Junts y bloqueo presupuestario',
    category: 'institucional',
    n_articles: 64, n_sources: 18, dominant_sentiment: 'negative', sentiment_polarity: -0.42,
    avg_relevance: 0.84, high_impact_count: 28, velocity: 'subiendo', recent_24h: 22,
    top_personas: [{ name: 'Miriam Nogueras', cnt: 18 }, { name: 'Pedro Sánchez', cnt: 14 }, { name: 'Carles Puigdemont', cnt: 11 }],
    top_orgs:     [{ name: 'Junts per Catalunya', cnt: 32 }, { name: 'PSOE', cnt: 22 }, { name: 'Moncloa', cnt: 18 }],
    countries:    [{ name: 'España', cnt: 56 }, { name: 'Francia', cnt: 4 }, { name: 'Bélgica', cnt: 4 }],
    samples: [
      { id: 101, title: 'Junts retira su apoyo a la legislatura y exige transferencia integral del IRPF', source: 'El Mundo',     summary: 'El comunicado oficial de Junts condiciona su reincorporación a una concesión fiscal antes del 30 de junio.', sentiment: 'negative', relevance: 0.92, spain_impact: 'high' },
      { id: 102, title: 'Sánchez convoca reunión bilateral urgente con Junts',                                              source: 'La Vanguardia', summary: 'Moncloa busca un acuerdo de mínimos para salvar los Presupuestos 2026.',                              sentiment: 'mixed',    relevance: 0.84, spain_impact: 'high' },
      { id: 103, title: 'Feijóo: "Sánchez está rehén de Junts y de la amnistía"',                                            source: 'ABC',          summary: 'El líder del PP llama a un adelanto electoral inmediato.',                                            sentiment: 'negative', relevance: 0.78, spain_impact: 'medium' },
    ],
    framework_analysis: {
      frame_label: 'Bloqueo institucional · presión territorial',
      problem_definition: 'Junts utiliza la mayoría parlamentaria condicional para forzar concesiones fiscales asimétricas.',
      causal_interpretation: 'Debilidad estructural de la coalición de gobierno · dependencia de 7 escaños decisivos.',
      moral_evaluation: 'Disputa entre legitimidad del Estado y aspiración soberanista de fondo.',
      treatment_recommendation: 'Mesa de diálogo formal con concesión parcial en cupo catalán o adelanto electoral.',
      dominant_metaphor: '"Equilibrio en la cuerda floja"',
      actors_protagonist: ['Junts per Catalunya', 'Generalitat'],
      actors_antagonist: ['PSOE', 'Moncloa', 'PP'],
      ideological_lean: 'multipolar', narrative_velocity: 'alta',
      counter_frame_suggested: 'Lealtad constitucional y solidaridad interterritorial · respuesta del PSOE.',
      strategic_recommendation: 'Cerrar bilateral con acuerdo simbólico antes del 30 mayo · evita escalada al pleno.',
    },
    first_seen: ISO_72H_AGO(), last_seen: ISO_3H_AGO(),
  },
  {
    topic: 'Crisis de vivienda · pico mediático',
    category: 'social',
    n_articles: 58, n_sources: 22, dominant_sentiment: 'negative', sentiment_polarity: -0.51,
    avg_relevance: 0.76, high_impact_count: 19, velocity: 'subiendo', recent_24h: 24,
    top_personas: [{ name: 'Isabel Rodríguez', cnt: 12 }, { name: 'Yolanda Díaz', cnt: 9 }, { name: 'Ada Colau', cnt: 7 }],
    top_orgs:     [{ name: 'Ministerio de Vivienda', cnt: 28 }, { name: 'Sindicato Vivienda Madrid', cnt: 16 }, { name: 'PSOE', cnt: 11 }],
    countries:    [{ name: 'España', cnt: 54 }, { name: 'Portugal', cnt: 3 }],
    samples: [
      { id: 201, title: 'La narrativa de vivienda alcanza pico histórico de menciones',                  source: 'Politeia · Monitor RRSS', summary: '1.240 menciones en 24h · 78% asociado a PSOE.',                                  sentiment: 'negative', relevance: 0.91, spain_impact: 'high' },
      { id: 202, title: 'Convocatoria masiva por colectivos urbanos antes de junio',                     source: 'eldiario.es',             summary: 'Sindicatos de inquilinos planean concentraciones en 12 capitales.',                sentiment: 'negative', relevance: 0.82, spain_impact: 'medium' },
      { id: 203, title: 'Banco de España: el alquiler sube +3.8% en zonas tensionadas',                  source: 'Cinco Días',              summary: 'Nuevo informe rompe la narrativa de moderación del Gobierno.',                       sentiment: 'mixed',    relevance: 0.74, spain_impact: 'medium' },
    ],
    framework_analysis: {
      frame_label: 'Emergencia habitacional · responsabilidad política',
      problem_definition: 'La oferta no responde a la demanda · zonas tensionadas con presión inversora.',
      causal_interpretation: 'Décadas de subinversión pública en vivienda asequible.',
      moral_evaluation: 'Derecho social básico amenazado · injusticia generacional.',
      treatment_recommendation: 'Ampliar zonas tensionadas + plan acelerado de rehabilitación.',
      dominant_metaphor: '"Burbuja que no estalla"',
      actors_protagonist: ['Inquilinos', 'Sindicato Vivienda', 'Sumar'],
      actors_antagonist: ['Fondos buitre', 'CCAA conservadoras'],
      ideological_lean: 'progresista', narrative_velocity: 'muy alta',
      counter_frame_suggested: 'Falta de oferta por intervencionismo · marco PP / fondos.',
      strategic_recommendation: 'Anuncio de medidas concretas con calendario claro antes del 15 junio.',
    },
    first_seen: ISO_72H_AGO(), last_seen: ISO_3H_AGO(),
  },
  {
    topic: 'Espiral de prima de riesgo',
    category: 'económica',
    n_articles: 41, n_sources: 14, dominant_sentiment: 'negative', sentiment_polarity: -0.38,
    avg_relevance: 0.81, high_impact_count: 18, velocity: 'subiendo', recent_24h: 14,
    top_personas: [{ name: 'Carlos Cuerpo', cnt: 9 }, { name: 'Pablo Hernández de Cos', cnt: 6 }, { name: 'Christine Lagarde', cnt: 5 }],
    top_orgs:     [{ name: 'Tesoro Público', cnt: 18 }, { name: 'Banco de España', cnt: 12 }, { name: 'BCE', cnt: 9 }],
    countries:    [{ name: 'España', cnt: 28 }, { name: 'Alemania', cnt: 7 }, { name: 'Bélgica', cnt: 5 }],
    samples: [
      { id: 301, title: 'Prima de riesgo supera los 100 pb por tercer día consecutivo',                source: 'Bloomberg',    summary: 'El diferencial con el Bund alcanza 102 pb · Tesoro convoca reunión técnica.',  sentiment: 'negative', relevance: 0.89, spain_impact: 'high' },
      { id: 302, title: 'BCE publica actas de abril con tono moderadamente hawkish',                   source: 'Reuters',      summary: 'Mercados descuentan recorte de tipos solo en septiembre · prob. 38%.',          sentiment: 'mixed',    relevance: 0.72, spain_impact: 'medium' },
      { id: 303, title: 'Cuerpo: "Los fundamentos económicos siguen sólidos"',                         source: 'Expansión',    summary: 'El ministro responde a la subida de la prima con datos de PIB y déficit.',      sentiment: 'mixed',    relevance: 0.66, spain_impact: 'medium' },
    ],
    framework_analysis: {
      frame_label: 'Riesgo soberano · presión sobre el déficit',
      problem_definition: 'Subida sostenida del spread agrava el coste de la deuda.',
      causal_interpretation: 'Inestabilidad política amplifica la prima sobre los fundamentales.',
      moral_evaluation: 'Coste real para el contribuyente · trasvase de recursos del Estado.',
      treatment_recommendation: 'Coordinación BdE-Moncloa-AIReF y mensaje técnico unificado.',
      dominant_metaphor: '"Hoguera de los nervios"',
      actors_protagonist: ['Tesoro', 'BdE', 'Moncloa'],
      actors_antagonist: ['Mercado', 'Inestabilidad política'],
      ideological_lean: 'técnico', narrative_velocity: 'alta',
      counter_frame_suggested: 'Fundamentos sólidos · contención narrativa.',
      strategic_recommendation: 'Subasta extraordinaria con buena ratio de demanda esta semana.',
    },
    first_seen: ISO_72H_AGO(), last_seen: ISO_24H_AGO(),
  },
  {
    topic: '#MociónCensura',
    category: 'electoral',
    n_articles: 37, n_sources: 19, dominant_sentiment: 'negative', sentiment_polarity: -0.46,
    avg_relevance: 0.72, high_impact_count: 12, velocity: 'estable', recent_24h: 9,
    top_personas: [{ name: 'Alberto Núñez Feijóo', cnt: 15 }, { name: 'Santiago Abascal', cnt: 8 }, { name: 'Pedro Sánchez', cnt: 7 }],
    top_orgs:     [{ name: 'PP', cnt: 19 }, { name: 'VOX', cnt: 12 }, { name: 'Congreso', cnt: 9 }],
    countries:    [{ name: 'España', cnt: 35 }],
    samples: [
      { id: 401, title: '#MociónCensura trending top 1 nacional · 56k tweets en 4h', source: 'X (antes Twitter)', summary: 'Sentimiento neto -0.42 · pico tras intervención de Feijóo.', sentiment: 'negative', relevance: 0.82, spain_impact: 'medium' },
      { id: 402, title: 'Feijóo amaga con moción de censura constructiva',           source: 'ABC',               summary: 'El PP estudia los números pero PNV mantiene cautela.',         sentiment: 'mixed',    relevance: 0.71, spain_impact: 'medium' },
    ],
    first_seen: ISO_24H_AGO(), last_seen: ISO_3H_AGO(),
  },
]

const MOCK_CATEGORIES = {
  institucional: 64,
  social: 58,
  económica: 41,
  electoral: 37,
  geopolítica: 18,
  media: 22,
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/narratives/analysis${params ? '?' + params : ''}`
  const real = await fromBackend<{ narratives: Narrative[]; categories_dist: Record<string, number>; total_clusters: number }>(path)
  if (real && Array.isArray(real.narratives) && real.narratives.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({
    narratives: MOCK_NARRATIVES,
    categories_dist: MOCK_CATEGORIES,
    total_clusters: MOCK_NARRATIVES.length,
  }, 'mock'))
}
