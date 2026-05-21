import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AgendaItem {
  id: string
  fecha: string
  organo: string
  tipo: 'votacion' | 'debate' | 'comparecencia' | 'sesion'
  asunto: string
  expedientes_relacionados: string[]
  dias_hasta: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function slugId(s: string, i: number): string {
  return `agenda-${i}-${s.slice(0, 8).replace(/\s+/g, '-').toLowerCase()}`
}

function detectTipo(text: string): AgendaItem['tipo'] {
  const t = text.toLowerCase()
  if (t.includes('votaci') || t.includes('vot.')) return 'votacion'
  if (t.includes('comparec')) return 'comparecencia'
  if (t.includes('debate') || t.includes('pleno') || t.includes('plenario')) return 'debate'
  return 'sesion'
}

function extractExpedientes(text: string): string[] {
  // Match patterns like 121/000034 or 122/000019
  const matches = text.match(/\d{3}\/\d{6}/g)
  if (!matches) return []
  return matches.filter((v, i, a) => a.indexOf(v) === i)
}

// ─── Scrape Congreso agenda ───────────────────────────────────────────────────

async function scrapeCongresoAgenda(): Promise<AgendaItem[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch('https://www.congreso.es/es/agenda-parlamentaria', {
      signal: controller.signal,
      headers: {
 'Accept': 'text/html,application/xhtml+xml',
 'User-Agent': 'Mozilla/5.0 (compatible; ElectSim/1.0)',
      },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const html = await res.text()

    const items: AgendaItem[] = []

    // Try to find date+event patterns in the HTML
    // Congreso agenda uses ISO dates in data attributes or structured content
    // Regex patterns for Spanish date formats: "dd de MMMM" or "dd/MM/yyyy"
    const MONTHS: Record<string, string> = {
 'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05','junio':'06',
 'julio':'07','agosto':'08','septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12',
    }

    // Pattern: <time datetime="YYYY-MM-DD"> or text like "9 de mayo"
    const timeRegex = /<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"[^>]*>([\s\S]*?)<\/time>/gi
    const spanDateRegex = /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/gi
    const timeMatches: RegExpExecArray[] = []
    const spanDateMatches: RegExpExecArray[] = []
    let _m: RegExpExecArray | null
    while ((_m = timeRegex.exec(html)) !== null) timeMatches.push(_m)
    while ((_m = spanDateRegex.exec(html)) !== null) spanDateMatches.push(_m)

    // Build dates from <time> tags
    for (const m of timeMatches) {
      const fecha = m[1]
      const content = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (!content || content.length < 5) continue
      const tipo = detectTipo(content)
      const expedientes = extractExpedientes(content)
      items.push({
        id: slugId(fecha, items.length),
        fecha,
        organo: guessOrgano(content),
        tipo,
        asunto: content.slice(0, 200),
        expedientes_relacionados: expedientes,
        dias_hasta: daysUntil(fecha),
      })
    }

    // Build dates from text patterns
    const year = new Date().getFullYear()
    for (const m of spanDateMatches) {
      const day = m[1].padStart(2, '0')
      const month = MONTHS[m[2].toLowerCase()] || '01'
      const fecha = `${year}-${month}-${day}`

      // Get surrounding context (100 chars after match)
      const idx = m.index ?? 0
      const context = html.slice(idx, idx + 200).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const tipo = detectTipo(context)

      items.push({
        id: slugId(fecha, items.length),
        fecha,
        organo: guessOrgano(context),
        tipo,
        asunto: context.slice(0, 200),
        expedientes_relacionados: extractExpedientes(context),
        dias_hasta: daysUntil(fecha),
      })
    }

    // Dedup by fecha+asunto similarity, keep future items
    const seen = new Set<string>()
    return items
      .filter(it => it.dias_hasta >= -1) // show past day too
      .filter(it => {
        const key = `${it.fecha}|${it.asunto.slice(0, 40)}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => a.dias_hasta - b.dias_hasta)
      .slice(0, 20)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

function guessOrgano(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('pleno')) return 'Pleno del Congreso'
  if (t.includes('comisión de hacienda') || t.includes('comision de hacienda')) return 'Comisión de Hacienda'
  if (t.includes('comisión de justicia') || t.includes('comision de justicia')) return 'Comisión de Justicia'
  if (t.includes('comisión de sanidad') || t.includes('comision de sanidad')) return 'Comisión de Sanidad'
  if (t.includes('comisión de vivienda') || t.includes('comision de vivienda')) return 'Comisión de Vivienda'
  if (t.includes('comisión') || t.includes('comision')) return 'Comisión Parlamentaria'
  if (t.includes('diputación permanente') || t.includes('diputacion')) return 'Diputación Permanente'
  if (t.includes('senado')) return 'Senado'
  return 'Congreso de los Diputados'
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

function mockAgenda(): AgendaItem[] {
  const today = new Date()
  const addDays = (d: number) => {
    const dt = new Date(today)
    dt.setDate(dt.getDate() + d)
    return dt.toISOString().split('T')[0]
  }

  return [
    {
      id: 'agenda-pleno-votacion-irpf',
      fecha: addDays(3),
      organo: 'Pleno del Congreso',
      tipo: 'votacion',
      asunto: 'Votación de enmiendas al Proyecto de Ley de Reforma del IRPF (121/000034) · Tramo de rentas del capital',
      expedientes_relacionados: ['121/000034'],
      dias_hasta: 3,
    },
    {
      id: 'agenda-comision-hacienda',
      fecha: addDays(5),
      organo: 'Comisión de Hacienda',
      tipo: 'debate',
      asunto: 'Debate del dictamen final de la Comisión de Hacienda sobre el IRPF · Votos particulares PP, VOX y Sumar',
      expedientes_relacionados: ['121/000034'],
      dias_hasta: 5,
    },
    {
      id: 'agenda-senado-vivienda',
      fecha: addDays(7),
      organo: 'Senado · Comisión General CCAA',
      tipo: 'debate',
      asunto: 'Dictamen de la Comisión General de las Comunidades Autónomas sobre la Ley de Vivienda (121/000041)',
      expedientes_relacionados: ['121/000041'],
      dias_hasta: 7,
    },
    {
      id: 'agenda-comision-justicia-cgpj',
      fecha: addDays(2),
      organo: 'Comisión de Justicia',
      tipo: 'comparecencia',
      asunto: 'Comparecencias de expertos sobre el sistema de nombramiento de vocales del CGPJ · sesión 3ª',
      expedientes_relacionados: ['122/000022'],
      dias_hasta: 2,
    },
  ]
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const scraped = await scrapeCongresoAgenda()

  if (scraped.length > 0) {
    return NextResponse.json({
      items: scraped,
      fuente: 'congreso',
    })
  }

  const items = mockAgenda()
  return NextResponse.json({
    items,
    fuente: 'mock',
  })
}
