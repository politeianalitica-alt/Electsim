// Heurística de scoring para contratos públicos (PLACSP).
//
// Score 0-100 ponderado:
//   - 50% importe (logarítmico · saturación a 50M€)
//   - 20% recencia (decay 7 días)
//   - 15% estado (ADJ/RES > PUB > otros)
//   - 15% organismo (gobierno central + grandes ayuntamientos > pequeños)
//
// Tags automáticos:
//   💰 GRAN IMPORTE (>1M€)        🚨 MEGAPROYECTO (>10M€)
//   🏛 GOBIERNO CENTRAL            🏘 LOCAL
//   ⚡ NUEVA / RECIENTE             ✓ ADJUDICADA
//   🚫 ANULADA                      ⚠ DESIERTA

import type { ContratoItem } from './placsp'

export interface ScoredContrato extends ContratoItem {
  importance: number
  components: {
    importe: number
    recency: number
    estado: number
    organismo: number
  }
  tags: string[]
  organismo_tipo: 'central' | 'autonomico' | 'provincial' | 'local' | 'otro'
}

// Detectar tipo de organismo por nombre (heurística sobre el nombre)
function detectOrganismoTipo(nombre: string): ScoredContrato['organismo_tipo'] {
  const n = nombre.toLowerCase()
  if (/^(ministerio|secretar[íi]a de estado|gobierno de españa|presidencia del gobierno|moncloa|consejo de ministros|aeat|seguridad social|mutua|ineco|adif|aena|renfe|enaire|correos|paradores|navantia|hunosa|tragsa|enusa|enagas|sepi|fcc|red eléctrica|enresa)/.test(n)) return 'central'
  if (/junta de andaluc|generalitat|gobierno vasco|gobierno de navarra|xunta de galicia|gobierno de canarias|gobierno de cantabria|gobierno de arag|gobierno de la rioja|gobierno del principado|gobierno de las illes|gobierno de extremadura|comunidad de madrid|región de murcia|junta de castilla|junta de comunidades|conselleria|conselleir|conseller|departamento de|sociedad pública.+(aut|reg)/.test(n)) return 'autonomico'
  if (/diputaci[oó]n provincial|diputaci[oó]n foral|cabildo insular|consell insular/.test(n)) return 'provincial'
  if (/ayuntamiento|junta de gobierno local|alcald[íi]a|concejal[íi]a|mancomunidad de municipios|consorcio.+local/.test(n)) return 'local'
  return 'otro'
}

function importeWeight(importe: number): number {
  if (importe <= 0) return 0
  // log10 saturado: 1k=0.18, 10k=0.36, 100k=0.55, 1M=0.73, 10M=0.91, 50M=1.0
  return Math.min(1, Math.log10(importe + 1) / 7.7)
}

function recencyWeight(fechaIso: string): number {
  if (!fechaIso) return 0.3
  const ageDays = (Date.now() - new Date(fechaIso).getTime()) / 86_400_000
  if (ageDays < 0) return 1
  if (ageDays > 30) return 0
  // f(0)=1 · f(7)=0.5 · f(14)=0.25 · f(30)=0.06
  return Math.pow(0.5, ageDays / 7)
}

function estadoWeight(estado: string): number {
  switch (estado) {
    case 'ADJ': return 1.0   // adjudicada · máxima relevancia
    case 'FORM': return 0.95 // formalizada
    case 'RES': return 0.85
    case 'PUB': return 0.55
    case 'EV':  return 0.45
    case 'PRE': return 0.40
    case 'CREA': return 0.30
    case 'DESI': return 0.50 // desierta tiene interés (revela problemas)
    case 'ANUL': return 0.15
    default: return 0.25
  }
}

function organismoWeight(tipo: ScoredContrato['organismo_tipo']): number {
  switch (tipo) {
    case 'central':     return 1.0
    case 'autonomico':  return 0.8
    case 'provincial':  return 0.55
    case 'local':       return 0.35
    default:            return 0.25
  }
}

export function scoreContrato(item: ContratoItem): ScoredContrato {
  const orgTipo = detectOrganismoTipo(item.organismo)

  const imp = importeWeight(item.importe)
  const rec = recencyWeight(item.fecha)
  const est = estadoWeight(item.estado)
  const org = organismoWeight(orgTipo)

  const importance = Math.round(
    (imp * 0.50 + rec * 0.20 + est * 0.15 + org * 0.15) * 100
  )

  const tags: string[] = []
  if (item.importe > 10_000_000) tags.push('🚨 MEGAPROYECTO')
  else if (item.importe > 1_000_000) tags.push('💰 GRAN IMPORTE')
  if (orgTipo === 'central') tags.push('🏛 GOBIERNO CENTRAL')
  else if (orgTipo === 'autonomico') tags.push('🏛 CCAA')
  else if (orgTipo === 'local') tags.push('🏘 LOCAL')
  if (rec >= 0.85) tags.push('⚡ RECIENTE')
  if (item.estado === 'ADJ' || item.estado === 'FORM') tags.push('✓ ADJUDICADA')
  if (item.estado === 'ANUL') tags.push('🚫 ANULADA')
  if (item.estado === 'DESI') tags.push('⚠ DESIERTA')

  return {
    ...item,
    importance,
    components: {
      importe: Math.round(imp * 100),
      recency: Math.round(rec * 100),
      estado: Math.round(est * 100),
      organismo: Math.round(org * 100),
    },
    tags,
    organismo_tipo: orgTipo,
  }
}

// Formato europeo para importes
export function formatEUR(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M€`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)} k€`
  return `${n.toFixed(2)} €`
}
