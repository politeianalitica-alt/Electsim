// Persistencia ligera en localStorage para los repositorios del workspace.
// Patrón: hidratar el array semilla (mock) en su sitio al cargar el módulo en el
// cliente; persistir tras cada mutación. En el servidor (SSR) es no-op, así que
// el HTML inicial usa la semilla y el cliente reconcilia con lo guardado.

const isBrowser = typeof window !== "undefined";
const hydrated = new Set<string>();

/** Rellena `seed` (in-place) desde localStorage. Solo cliente, una vez por clave. */
export function hydrate<T>(key: string, seed: T[]): void {
  if (!isBrowser || hydrated.has(key)) return;
  hydrated.add(key);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const stored = JSON.parse(raw);
      if (Array.isArray(stored)) {
        seed.length = 0;
        seed.push(...stored);
      }
    }
  } catch {
    /* localStorage no disponible o JSON corrupto: nos quedamos con la semilla */
  }
}

/** Guarda el array completo bajo `key`. No-op en servidor. */
export function persist<T>(key: string, data: T[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* cuota llena o modo privado: lo ignoramos */
  }
}
