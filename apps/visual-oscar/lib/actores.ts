// ─────────────────────────────────────────────────────────────────────
// Thin re-export del dataset canónico de actores (data/actores-fixture.ts).
//
// Antes había duplicación de ~700 líneas entre este archivo y el fixture,
// causando que cambios en uno no se reflejaran en el otro. Ahora todo
// vive en `data/actores-fixture.ts` y este módulo solo re-exporta para
// preservar los imports existentes que usan `@/lib/actores`.
//
// Si necesitas modificar actores → editar `data/actores-fixture.ts`.
// ─────────────────────────────────────────────────────────────────────

export {
  ACTORES,
  ACTOR_ENRICHMENT,
  CAT_LABEL,
  CATS,
  initials,
  type Actor,
  type Categoria,
} from '@/data/actores-fixture'
