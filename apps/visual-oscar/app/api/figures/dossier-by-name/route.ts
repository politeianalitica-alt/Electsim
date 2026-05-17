/**
 * /api/figures/dossier-by-name?name=NOMBRE&cargo=...&afiliacion=...&category=...
 *
 * Devuelve un dossier rico para CUALQUIER nombre de persona pública.
 * Si está en el catálogo expandido, usa todos sus datos.
 * Si no, construye una figura ligera y enriquece igualmente con noticias
 * + Wikipedia + intervenciones.
 *
 * Útil para integrar con el catálogo legacy /lib/actores.ts (300+ políticos)
 * sin tener que asignar manualmente un id de figure.
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildDossierByName } from '@/lib/figures/dossier'
import type { Figure } from '@/lib/figures/types'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const name = params.get('name')
  if (!name) return NextResponse.json(withMeta({ error: 'missing_name' }, 'error'), { status: 400 })

  const hints: Partial<Pick<Figure, 'cargo' | 'organizacion' | 'afiliacion' | 'category' | 'color'>> = {}
  const cargo = params.get('cargo'); if (cargo) hints.cargo = cargo
  const org = params.get('organizacion'); if (org) hints.organizacion = org
  const af = params.get('afiliacion'); if (af) hints.afiliacion = af
  const cat = params.get('category'); if (cat) hints.category = cat as Figure['category']
  const color = params.get('color'); if (color) hints.color = color

  try {
    const dossier = await buildDossierByName(name, hints)
    if (!dossier) return NextResponse.json(withMeta({ error: 'not_found' }, 'error'), { status: 404 })
    return NextResponse.json(withMeta(dossier, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
