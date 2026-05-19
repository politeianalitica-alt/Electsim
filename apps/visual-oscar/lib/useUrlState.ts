/**
 * Hook · estado persistido en URL via searchParams (Pilar 5 VISION_2027)
 *
 * Reemplaza `useState` para valores que el usuario necesita poder
 * compartir/bookmarkear: tab activo, sección de sidebar, filtros.
 *
 * Patrón canónico:
 * ```tsx
 * const [section, setSection] = useUrlState<SectionId>('section', 'dashboard')
 * ```
 *
 * - `key` = nombre del searchParam (ej. ?section=crisis)
 * - `defaultValue` = se usa si el param no existe (NO se escribe a URL hasta cambiar)
 * - `setSection(v)` hace `router.replace` con `scroll:false` (instantáneo, sin scroll-jump)
 *
 * Limitaciones intencionales:
 *  · solo strings (cast con `as T` si es union de literales)
 *  · si necesitas objetos complejos, serializa a JSON antes de pasar al setter
 *  · usa `replace` no `push` → no contamina el history (cada click crearía entrada)
 */
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'

export function useUrlState<T extends string = string>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const value = useMemo<T>(() => {
    const v = searchParams.get(key)
    return (v ?? defaultValue) as T
  }, [searchParams, key, defaultValue])

  const setValue = useCallback(
    (next: T) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === defaultValue) {
        params.delete(key)  // URL limpia si volvemos al default
      } else {
        params.set(key, next)
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams, key, defaultValue],
  )

  return [value, setValue]
}

/**
 * Variante para múltiples params en una página. Recibe un objeto
 * `{key: defaultValue}` y devuelve `[values, patchValues]`.
 *
 * ```tsx
 * const [filters, patch] = useUrlStateMulti({ tab: 'all', sort: 'recent' })
 * patch({ tab: 'crisis' })  // ?tab=crisis&sort=recent
 * patch({ tab: 'crisis', sort: 'recent' })  // ?tab=crisis (sort eliminado por ser default)
 * ```
 */
export function useUrlStateMulti<T extends Record<string, string>>(
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const values = useMemo<T>(() => {
    const result = { ...defaults }
    for (const k of Object.keys(defaults) as Array<keyof T>) {
      const v = searchParams.get(k as string)
      if (v !== null) result[k] = v as T[keyof T]
    }
    return result
  }, [searchParams, defaults])

  const patch = useCallback(
    (next: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries({ ...values, ...next })) {
        if (v === defaults[k]) {
          params.delete(k)
        } else {
          params.set(k, v as string)
        }
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams, defaults, values],
  )

  return [values, patch]
}
