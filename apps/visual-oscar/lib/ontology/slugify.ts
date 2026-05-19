/**
 * slugify · mirror del helper Python `agents/entities/resolver.slugify`.
 *
 * Reglas idénticas al backend:
 *   - NFD normalize + descarta diacríticos (ñ → n, á → a, ç → c)
 *   - minúsculas
 *   - todo no-alfanumérico → espacio
 *   - colapsa espacios/guiones en un único guión
 *   - trim por palabra al maxLength
 *
 * Ejemplos:
 *   slugify("Pedro Sánchez Pérez-Castejón") → "pedro-sanchez-perez-castejon"
 *   slugify("PSOE")                         → "psoe"
 *   slugify("Castilla-La Mancha")           → "castilla-la-mancha"
 */
export function slugify(text: string, maxLength = 120): string {
  if (!text) return ''
  const nfd = text.normalize('NFD')
  const noDiacritics = nfd.replace(/[̀-ͯ]/g, '')
  const lowered = noDiacritics.toLowerCase().trim()
  const cleaned = lowered.replace(/[^a-z0-9\s-]+/g, ' ')
  const slug = cleaned.replace(/[-\s]+/g, '-').replace(/^-|-$/g, '')
  if (slug.length <= maxLength) return slug
  const cut = slug.slice(0, maxLength)
  const lastDash = cut.lastIndexOf('-')
  if (lastDash > maxLength * 0.5) return cut.slice(0, lastDash)
  return cut
}

/**
 * Mapea categorías del catálogo de figuras al kind canónico de la ontología.
 * El catálogo de figuras (lib/figures/catalog-extended.ts) usa category:
 *   politico | empresario | mediatico | periodista | lobbista | religioso
 * Todos resuelven a `actor_person` en la ontología — el detalle queda en
 * el payload + tags de la entity.
 */
export function figureCategoryToEntityKind(category: string): 'actor_person' | 'actor_org' {
  // Si en el futuro hay categorías de organización, las separamos.
  return 'actor_person'
}
