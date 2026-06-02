/**
 * Sprint 2 C4 · entityDensityScore = unique_entities / article_count,
 * saturado en 5 entidades/artículo → 1.
 *
 * Función pura — sin acceso a DB ni a `Date.now()`. Recibe una lista de
 * artículos con su array de `entities` (ya extraído por la Layer 1 NER en
 * processArticle()) y devuelve un score normalizado en [0, 1].
 *
 * Fórmula:
 *   unique_entities = |{ "type:id" : (type, id) ∈ entities }|
 *   density         = unique_entities / article_count
 *   score           = min(density / 5, 1)
 *
 * Interpretación:
 *   · density = 0 (artículos sin entidades) → score = 0 (topic muy genérico)
 *   · density = 5 (5 entidades únicas por artículo) → score = 1 (riqueza
 *     factual saturada; más allá no aporta señal extra)
 *   · density entre 0 y 5 → escalado lineal
 *
 * Casos especiales:
 *   · articles vacío → 0
 *   · article.entities ausente o no-array → tratado como [] para robustez
 *     frente a artículos legacy pre-Sprint 2 que aún no tienen NER.
 *
 * El de-duplicado por `type:id` evita inflar la densidad por menciones
 * repetidas de la misma entidad en distintos artículos (p.ej. PSOE
 * mencionado en los 50 artículos del topic → cuenta 1).
 */

export interface ArticleEntities {
  entities: Array<{ type: string; id: string }>
}

/**
 * Calcula entityDensityScore ∈ [0, 1] a partir de los artículos del topic
 * y sus entidades extraídas.
 *
 * @param articles Lista de artículos (sólo necesitamos el campo entities).
 * @returns Score normalizado: 0 = sin entidades, 1 = ≥5 únicas por artículo.
 */
export function computeEntityDensity(articles: ArticleEntities[]): number {
  if (articles.length === 0) return 0
  const uniqueSet = new Set<string>()
  for (const a of articles) {
    const entities = Array.isArray(a.entities) ? a.entities : []
    for (const e of entities) {
      // type:id es la PK semántica — si dos artículos mencionan "ORG:psoe"
      // sólo cuenta una vez para diversidad de entidades del topic.
      uniqueSet.add(`${e.type}:${e.id}`)
    }
  }
  const density = uniqueSet.size / articles.length
  // Saturación en 5: por encima de 5 entidades únicas/artículo el topic
  // ya es factualmente rico; más entidades no incrementan la señal de
  // prominence (sí podrían en otros scores, pero no aquí).
  return Math.min(density / 5, 1)
}
