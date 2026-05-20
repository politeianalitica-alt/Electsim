import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface ImpactoItem {
  id: string
  titulo: string
  dimension: 'seguridad' | 'economica' | 'energetica' | 'diplomatica' | 'social'
  severidad: number  // 1-5
  horizonte: 'corto' | 'medio' | 'largo'
  descripcion: string
  paises_origen: string[]
  url?: string
}

const DIM_KEYWORDS: Record<ImpactoItem['dimension'], string[]> = {
  seguridad:    ['migración', 'frontera', 'terrorismo', 'narcotráfico', 'delincuencia', 'sahel', 'mafia'],
  economica:    ['arancel', 'comercio', 'exportación', 'inversión', 'pib', 'recesión', 'inflación', 'crisis económica'],
  energetica:   ['gas', 'petróleo', 'nuclear', 'electricidad', 'gnl', 'renovable', 'argelia', 'opep'],
  diplomatica:  ['embajador', 'cumbre', 'tratado', 'sanción', 'expulsión', 'ruptura', 'visita oficial'],
  social:       ['refugiado', 'asilo', 'cooperación', 'derechos humanos', 'desigualdad'],
}

function detectDimension(text: string): ImpactoItem['dimension'] | null {
  const lower = text.toLowerCase()
  for (const [dim, kws] of Object.entries(DIM_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return dim as ImpactoItem['dimension']
  }
  return null
}

function detectHorizonte(text: string): ImpactoItem['horizonte'] {
  const lower = text.toLowerCase()
  if (/\b(inmediato|hoy|esta semana|próximos días)\b/.test(lower)) return 'corto'
  if (/\b(2027|2028|2029|2030|próxima década)\b/.test(lower)) return 'largo'
  return 'medio'
}

const COUNTRY_KW: Record<string, string> = {
  marruecos: 'Marruecos', argelia: 'Argelia', francia: 'Francia', alemania: 'Alemania',
  rusia: 'Rusia', ucrania: 'Ucrania', china: 'China', israel: 'Israel', irán: 'Irán', iran: 'Irán',
 'estados unidos': 'EE.UU.', 'ee.uu.': 'EE.UU.', 'eeuu': 'EE.UU.', portugal: 'Portugal',
  italia: 'Italia', 'reino unido': 'Reino Unido',
}

function detectPaises(text: string): string[] {
  const lower = text.toLowerCase()
  const found = new Set<string>()
  for (const [k, v] of Object.entries(COUNTRY_KW)) {
    if (lower.includes(k)) found.add(v)
  }
  return Array.from(found)
}

export async function GET() {
  // 1. Backend real
  const real = await fromBackend<{ data?: unknown[] }>('/api/geopolitica/impactos-geo?limite=20')
  if (real && Array.isArray(real.data) && real.data.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  // 2. Derivar de feeds RSS
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: 96 })
    const items: ImpactoItem[] = []
    for (const a of articles) {
      const text = `${a.title} ${a.description}`
      const dim = detectDimension(text)
      if (!dim) continue
      const paises = detectPaises(text)
      if (paises.length === 0) continue
      // Severidad heurística: combina sentiment y palabras críticas
      let sev = 2
      const lowered = text.toLowerCase()
      if (a.sentiment === 'negative') sev += 1
      if (/\b(crisis|emergencia|colapso|guerra|invasión|invasion)\b/.test(lowered)) sev += 2
      else if (/\b(tensión|tension|conflicto|amenaza)\b/.test(lowered)) sev += 1
      items.push({
        id: a.link || `${a.medio.id}-${a.title.slice(0, 40)}`,
        titulo: a.title,
        dimension: dim,
        severidad: Math.min(5, sev),
        horizonte: detectHorizonte(text),
        descripcion: a.description.slice(0, 280),
        paises_origen: paises,
        url: a.link,
      })
    }
    // Ordenar por severidad y dedupe rough
    const sorted = items
      .sort((a, b) => b.severidad - a.severidad)
      .slice(0, 25)
    if (sorted.length > 0) {
      return NextResponse.json(withMeta({
        data: sorted,
        total: sorted.length,
        derived_from_feeds: true,
      }, 'backend'))
    }
  } catch (e) {
    console.error('[impactos-geo] feed derivation failed:', e)
  }

  // 3. Fallback
  const mock = {
    data: [
      { id: '1', titulo: 'Presión migratoria sobre agenda política', dimension: 'seguridad', severidad: 4, horizonte: 'corto', descripcion: 'Principal vector narrativo de VOX.', paises_origen: ['Marruecos'] },
      { id: '2', titulo: 'Impacto aranceles en sector agroexportador', dimension: 'economica', severidad: 3, horizonte: 'medio', descripcion: 'Exportaciones agroalimentarias en riesgo.', paises_origen: ['EE.UU.'] },
      { id: '3', titulo: 'Diversificación energética post-Argelia', dimension: 'energetica', severidad: 2, horizonte: 'largo', descripcion: 'España acelera GNL y renovables.', paises_origen: ['Argelia'] },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
