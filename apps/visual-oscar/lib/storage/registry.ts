/**
 * Registro central de claves de localStorage — Fase 2.
 *
 * El trabajo del analista vive repartido en 20+ claves sin catálogo: este
 * registro documenta qué guarda cada familia y alimenta la copia de
 * seguridad (lib/storage/backup.ts) y el diagnóstico de uso del hub.
 *
 * Convención de claves NUEVAS: `politeia.<dominio>.<nombre>.vN`
 * (las históricas con `:` se conservan tal cual hasta su migración).
 */

export interface StorageFamily {
  /** Prefijo exacto con el que empiezan las claves de la familia. */
  prefix: string
  /** Qué contiene, en humano. */
  descripcion: string
  /** Dónde se escribe. */
  owner: string
}

export const STORAGE_FAMILIES: StorageFamily[] = [
  { prefix: 'politeia.cuaderno.',        descripcion: 'Notas del Cuaderno (markdown, wikilinks)',        owner: 'lib/cuaderno/store.ts' },
  { prefix: 'politeia.cama.',            descripcion: 'Macroargumentos de la Cama (versionados)',        owner: 'lib/cama/store.ts' },
  { prefix: 'politeia.preinformes.',     descripcion: 'Preinformes (borradores y generados)',            owner: 'lib/preinformes/store.ts' },
  { prefix: 'politeia.workspace.',       descripcion: 'Preferencias de workspace (último espacio…)',     owner: 'lib/workspace/last-space.ts' },
  { prefix: 'politeia.modules.',         descripcion: 'Favoritos y recientes del inicio',                owner: 'lib/home/modules-access.ts' },
  { prefix: 'politeia:ws:',              descripcion: 'Contenido del Command Center (docs, tablas, canvas, research, projects, knowledge, inbox…)', owner: 'lib/workspace/persist.ts + repositorios' },
  { prefix: 'politeia:simulator:',       descripcion: 'Historial del simulador por workspace',           owner: 'app/workspaces/[id]/simulator' },
  { prefix: 'politeia:terminal:',        descripcion: 'Layout del terminal por workspace',               owner: 'app/workspaces/[id]/terminal' },
  { prefix: 'politeia:inbox:',           descripcion: 'Estados/asignaciones/comentarios del inbox',      owner: 'components/inbox/inbox-view.tsx' },
  { prefix: 'politeia.recent_invs',      descripcion: 'Investigaciones recientes',                       owner: 'app/investigations' },
  { prefix: 'cuaderno_client_id',        descripcion: 'Identidad de dispositivo del sync del Cuaderno',  owner: 'lib/cuaderno/cloud-sync.ts' },
]

/** ¿Pertenece la clave al ecosistema Politeia? (para backup/diagnóstico) */
export function isPoliteiaKey(key: string): boolean {
  return key.startsWith('politeia') || STORAGE_FAMILIES.some(f => key.startsWith(f.prefix))
}

/** Lista las claves Politeia presentes ahora mismo en localStorage. */
export function listPoliteiaKeys(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  const out: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && isPoliteiaKey(k)) out.push(k)
  }
  return out.sort()
}
