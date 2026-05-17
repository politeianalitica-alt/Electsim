'use client'

/**
 * CuadernoTracker — escucha la navegación y registra cada visita a módulos
 * relevantes como una entrada en la "Bitácora" del Cuaderno.
 *
 * Se monta una sola vez en el layout raíz. Es totalmente no intrusivo:
 *   - Solo registra rutas con un mapa de etiquetas humanas conocidas.
 *   - Throttle: ignora la misma ruta si se repite en <2 min.
 *   - Skip rutas internas (/api, /login, /cuaderno mismo).
 */

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { logAction } from '@/lib/cuaderno/store'

const ROUTE_LABELS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^\/inicio$/,                () => 'Inicio'],
  [/^\/dashboard$/,             () => 'Panel Ejecutivo'],
  [/^\/briefing$/,              () => 'Morning Briefing'],
  [/^\/alertas$/,               () => 'Alertas Prioritarias'],

  [/^\/mapa-actores/,           () => 'Mapa de Actores'],
  [/^\/partidos/,               () => 'Partidos y Grupos'],
  [/^\/gobierno-coalicion/,     () => 'Gobierno y Coaliciones'],
  [/^\/instituciones/,          () => 'Instituciones Locales y Regionales'],

  [/^\/monitor-legislativo/,    () => 'Monitor Legislativo'],
  [/^\/trazabilidad/,           () => 'Trazabilidad Legislativa'],
  [/^\/huella-legislativa/,     () => 'Huella Legislativa'],

  [/^\/riesgo/,                 () => 'Termómetro de Riesgo'],
  [/^\/crisis/,                 () => 'Crisis Intelligence'],
  [/^\/ataques-narrativos/,     () => 'Detección de Ataques'],

  [/^\/nowcasting/,             () => 'Módulo Electoral'],
  [/^\/escenarios/,             () => 'Simulador Estratégico'],
  [/^\/microdatos/,             () => 'Perfiles de Votante'],
  [/^\/adversarios/,            () => 'Inteligencia Adversarios'],
  [/^\/war-room/,               () => 'War Room'],

  [/^\/geopolitica/,            () => 'Geopolítica y RRII'],
  [/^\/macro/,                  () => 'Macro-Political & Economic'],

  [/^\/prensa/,                 () => 'Pulso de Prensa'],
  [/^\/medios-narrativa/,       () => 'Mapa de Medios'],

  [/^\/licitaciones(\/.*)?$/,   () => 'Licitaciones'],
  [/^\/adjudicaciones/,         () => 'Adjudicaciones'],
  [/^\/contratos-vigentes/,     () => 'Contratos Vigentes'],
  [/^\/competidores/,           () => 'Competidores'],
  [/^\/fondos-europeos/,        () => 'Fondos Europeos'],
  [/^\/litigios-contratacion/,  () => 'Litigios de Contratación'],
  [/^\/sector-(\w+)/,           m => `Sector — ${m[1].charAt(0).toUpperCase() + m[1].slice(1)}`],

  [/^\/workspaces\/[^/]+\/(\w+)/, m => `Workspace · ${m[1].charAt(0).toUpperCase() + m[1].slice(1)}`],
  [/^\/estudio\/(\w+)/,         m => `Estudio · ${m[1].charAt(0).toUpperCase() + m[1].slice(1)}`],
  [/^\/estudio$/,               () => 'Estudio'],
  [/^\/extras$/,                () => 'Toolbox'],
]

function labelFor(path: string): string | null {
  for (const [re, fn] of ROUTE_LABELS) {
    const m = path.match(re)
    if (m) return fn(m)
  }
  return null
}

const SKIP = /^\/(api|login|cuaderno|favicon|_next)/

export default function CuadernoTracker() {
  const pathname = usePathname()
  const lastLogged = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    if (!pathname) return
    if (SKIP.test(pathname)) return

    const label = labelFor(pathname)
    if (!label) return

    // Throttle: misma ruta en <2 min → no re-logear
    const now = Date.now()
    const prev = lastLogged.current.get(pathname) ?? 0
    if (now - prev < 2 * 60 * 1000) return
    lastLogged.current.set(pathname, now)

    // Slug útil para wikilink: nombre del módulo en lowercase-kebab
    const slug = label
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    try {
      logAction({
        kind:  'visit',
        title: `Visitaste ${label}`,
        href:  pathname,
        link:  slug,
      })
    } catch {
      // silent: si localStorage no está disponible, no rompemos nada
    }
  }, [pathname])

  return null
}
