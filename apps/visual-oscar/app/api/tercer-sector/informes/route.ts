/**
 * /api/tercer-sector/informes · Biblioteca curada de informes y evidencia del
 * tercer sector · Sprint TS-Cockpit W1d (route).
 *
 * Sirve el catálogo de `lib/tercer-sector/informes-catalog.ts` con filtros
 * (tema, anio, entidad, ambito, tipo, q) + facetas. Es ESTÁTICO (datos curados
 * en código, sin red), así que NO declara `maxDuration` (config serverless `{}`
 * — LEY VERCEL HOBBY del spec: no crear una config nueva). Cero emojis.
 *
 * Envelope Politeia: { ok, data:{ informes, total, facetas }, fetched_at,
 * source_url, _meta }.
 */
import { NextResponse } from 'next/server'
import {
  INFORMES,
  INFORMES_COUNT,
  catalogAmbitos,
  catalogAnios,
  catalogEntidades,
  catalogTemas,
  catalogTipos,
  type InformeTS,
} from '@/lib/tercer-sector/informes-catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// NOTA: SIN `export const maxDuration` a propósito → config `{}` (estático).

const SOURCE_URL = 'https://www.plataformatercersector.es/publicaciones/'

export async function GET(req: Request) {
  const fetched_at = new Date().toISOString()
  try {
    const sp = new URL(req.url).searchParams
    const tema = (sp.get('tema') || '').trim().toLowerCase()
    const entidad = (sp.get('entidad') || '').trim().toLowerCase()
    const ambito = (sp.get('ambito') || '').trim().toLowerCase()
    const tipo = (sp.get('tipo') || '').trim().toLowerCase()
    const anioRaw = (sp.get('anio') || '').trim()
    const anio = Number(anioRaw)
    const hasAnio = anioRaw !== '' && Number.isFinite(anio)
    const q = (sp.get('q') || '').trim().toLowerCase()

    const informes: InformeTS[] = INFORMES.filter((i) => {
      if (tema && !i.temas.some((t) => t.toLowerCase() === tema)) return false
      if (entidad && i.entidad.toLowerCase() !== entidad) return false
      if (ambito && i.ambito !== ambito) return false
      if (tipo && i.tipo !== tipo) return false
      if (hasAnio && i.anio !== anio) return false
      if (q) {
        const hay = `${i.titulo} ${i.entidad} ${i.resumen} ${i.utilidad_analista} ${i.temas.join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
      // Orden por defecto: año desc, luego título.
      .slice()
      .sort((a, b) => b.anio - a.anio || a.titulo.localeCompare(b.titulo))

    return NextResponse.json(
      {
        ok: true,
        data: {
          informes,
          total: informes.length,
          catalogo_total: INFORMES_COUNT,
          facetas: {
            temas: catalogTemas(),
            entidades: catalogEntidades(),
            anios: catalogAnios(),
            ambitos: catalogAmbitos(),
            tipos: catalogTipos(),
          },
          source: 'catalog',
        },
        fetched_at,
        source_url: SOURCE_URL,
        _meta: {
          source: 'tercer-sector/informes',
          cache_ttl_seconds: 86400,
          note: 'Biblioteca curada y datada de evidencia (cada informe con entidad/año/URL real). Estático: sin maxDuration (LEY VERCEL HOBBY).',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at,
        source_url: SOURCE_URL,
      },
      { status: 200 },
    )
  }
}
