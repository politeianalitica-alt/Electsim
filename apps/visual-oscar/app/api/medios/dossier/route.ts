/**
 * /api/medios/dossier · Exporta una búsqueda como dossier Markdown.
 *
 * POST body: respuesta completa de /api/medios/search + metadata
 * Devuelve: text/markdown con título, sumario ejecutivo, métricas,
 * artículos clasificados por bloque ideológico, fuente y exportable.
 *
 * El export es Markdown (vs PDF) porque:
 *   - No requiere libs binarias (WeasyPrint pesa demasiado en Vercel)
 *   - El analista puede convertir a PDF en su pipeline preferido
 *   - Es legible directamente en GitHub, Notion, Obsidian
 *
 * Soporta ?format=html para HTML standalone también.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface DossierRequest {
  query: string
  generated_at?: string
  search_response: any // shape de /api/medios/search
  brain_lectura?: string // resumen LLM opcional
  notes?: string // notas del analista
}

function fmtPct(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${(v * 100).toFixed(decimals)}%`
}

function buildMarkdown(req: DossierRequest): string {
  const ts = new Date(req.generated_at || Date.now())
  const r = req.search_response || {}
  const lines: string[] = []
  lines.push(`# Dossier · ${req.query}`)
  lines.push('')
  lines.push(`**Generado:** ${ts.toLocaleString('es-ES')} · Politeia Media Intelligence`)
  lines.push(`**Volumen:** ${r.totalResults?.toLocaleString('es-ES') ?? '—'} artículos totales · ${r.n_articles ?? 0} analizados`)
  if (r.params_applied?.from) lines.push(`**Ventana:** ${r.params_applied.from} → ${r.params_applied.to || 'ahora'}`)
  if (r.params_applied?.language) lines.push(`**Idioma:** ${r.params_applied.language}`)
  lines.push('')

  if (req.brain_lectura) {
    lines.push('## Lectura Politeia · síntesis IA')
    lines.push('')
    lines.push(req.brain_lectura)
    lines.push('')
    lines.push('> *Generado por IA · revisar antes de citar. CLAUDE.md A2.*')
    lines.push('')
  }

  if (r.sentiment) {
    lines.push('## Sentimiento agregado')
    lines.push('')
    lines.push(`- Tono medio: **${fmtPct(r.sentiment.score, 0)}**`)
    lines.push(`- Positivos: ${r.sentiment.positive}`)
    lines.push(`- Negativos: ${r.sentiment.negative}`)
    lines.push(`- Neutrales: ${r.sentiment.neutral}`)
    lines.push('')
  }

  if (r.ideologicalComparison?.length) {
    lines.push('## Cobertura por bloque ideológico')
    lines.push('')
    lines.push('| Bloque | Artículos | Sentimiento | Frames dominantes |')
    lines.push('| --- | --- | --- | --- |')
    for (const b of r.ideologicalComparison) {
      lines.push(`| ${b.bucket} | ${b.count} | ${fmtPct(b.sentiment, 0)} | ${(b.dominantFrames || []).join(', ') || '—'} |`)
    }
    lines.push('')
  }

  if (r.actors?.length) {
    lines.push('## Top actores mencionados')
    lines.push('')
    lines.push('| Actor | Menciones | Tono |')
    lines.push('| --- | --- | --- |')
    for (const a of (r.actors || []).slice(0, 15)) {
      lines.push(`| ${a.name} | ${a.mentions} | ${fmtPct(a.sentiment, 0)} |`)
    }
    lines.push('')
  }

  if (r.topics?.length) {
    lines.push('## Topics emergentes (bigrams)')
    lines.push('')
    for (const t of (r.topics || []).slice(0, 12)) {
      lines.push(`- **${t.label}** · ${t.count} menciones`)
    }
    lines.push('')
  }

  if (r.narratives?.length) {
    lines.push('## Frames narrativos detectados')
    lines.push('')
    for (const n of r.narratives || []) {
      lines.push(`### ${n.frame} (${n.count})`)
      for (const ex of (n.examples || []).slice(0, 3)) {
        lines.push(`> ${ex}`)
      }
      lines.push('')
    }
  }

  if (r.timeline?.length) {
    lines.push('## Timeline')
    lines.push('')
    lines.push('| Fecha | Artículos |')
    lines.push('| --- | --- |')
    for (const p of r.timeline) {
      lines.push(`| ${p.date} | ${p.count} |`)
    }
    lines.push('')
  }

  if (r.topSources?.length) {
    lines.push('## Top medios cubriendo el tema')
    lines.push('')
    lines.push('| Medio | Cobertura |')
    lines.push('| --- | --- |')
    for (const s of (r.topSources || []).slice(0, 15)) {
      lines.push(`| ${s.source} | ${s.count} |`)
    }
    lines.push('')
  }

  if (r.articles?.length) {
    lines.push('## Artículos clave')
    lines.push('')
    for (const a of (r.articles || []).slice(0, 30)) {
      const date = new Date(a.published).toLocaleDateString('es-ES')
      const senTag = a.sentiment_score > 0.1 ? ' ●' : a.sentiment_score < -0.1 ? ' ●' : ''
      lines.push(`- **[${a.title}](${a.url})** · ${a.source} · ${date}${senTag}`)
      if (a.description) {
        lines.push(`  > ${a.description.slice(0, 200)}${a.description.length > 200 ? '…' : ''}`)
      }
    }
    lines.push('')
  }

  if (req.notes) {
    lines.push('## Notas del analista')
    lines.push('')
    lines.push(req.notes)
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push('*Politeia · Media Intelligence Hub · politeia-visual-oscar.vercel.app/prensa*')
  lines.push('')
  lines.push('Fuentes utilizadas: NewsAPI · RSS interno · catálogo medios.json con bucketing ideológico.')

  return lines.join('\n')
}

function buildHtml(md: string, query: string): string {
  // Conversión markdown → HTML mínima (headings, tablas, listas, links, blockquotes)
  // Suficiente para PDF browser-print.
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const lines = md.split('\n')
  const out: string[] = []
  let inTable = false
  let tableHeader = false
  for (const raw of lines) {
    const line = raw
    if (/^### /.test(line)) out.push(`<h3>${esc(line.replace(/^### /, ''))}</h3>`)
    else if (/^## /.test(line)) out.push(`<h2>${esc(line.replace(/^## /, ''))}</h2>`)
    else if (/^# /.test(line)) out.push(`<h1>${esc(line.replace(/^# /, ''))}</h1>`)
    else if (/^\| /.test(line) && /\| --- /.test(lines[lines.indexOf(line) + 1] || '')) {
      inTable = true; tableHeader = true
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean)
      out.push('<table><thead><tr>' + cells.map((c) => `<th>${esc(c)}</th>`).join('') + '</tr></thead><tbody>')
    } else if (/^\| --- /.test(line)) {
      // skip separator row
    } else if (inTable && /^\| /.test(line)) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean)
      out.push('<tr>' + cells.map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>')
    } else if (inTable) {
      out.push('</tbody></table>'); inTable = false; tableHeader = false
      if (line.trim()) out.push(`<p>${esc(line)}</p>`)
    } else if (/^- /.test(line)) {
      const item = line.replace(/^- /, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      out.push(`<li>${item}</li>`)
    } else if (/^> /.test(line)) {
      out.push(`<blockquote>${esc(line.replace(/^> /, ''))}</blockquote>`)
    } else if (line.trim() === '---') {
      out.push('<hr/>')
    } else if (line.trim()) {
      const p = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      out.push(`<p>${p}</p>`)
    } else {
      out.push('')
    }
  }
  if (inTable) out.push('</tbody></table>')

  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"/>
<title>${esc(query)} · Dossier Politeia</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #0f172a; line-height: 1.6; }
  h1 { font-size: 28px; border-bottom: 2px solid #DC2626; padding-bottom: 6px; }
  h2 { font-size: 18px; margin-top: 28px; color: #0f172a; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  h3 { font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 18px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f8fafc; font-weight: 600; }
  blockquote { border-left: 3px solid #DC2626; padding-left: 12px; margin: 8px 0; color: #475569; font-style: italic; }
  a { color: #1F4E8C; text-decoration: none; }
  a:hover { text-decoration: underline; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
  ul { padding-left: 20px; }
  li { margin: 4px 0; }
  @media print { body { max-width: none; } }
</style>
</head><body>
${out.join('\n')}
</body></html>`
}

export async function POST(req: Request) {
  let body: DossierRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 })
  }
  if (!body.query) {
    return NextResponse.json({ ok: false, error: 'query required' }, { status: 400 })
  }
  const url = new URL(req.url)
  const format = url.searchParams.get('format') || 'markdown'
  const md = buildMarkdown(body)
  const slug = body.query.toLowerCase().replace(/[^\w]+/g, '-').slice(0, 60)
  const dateStamp = new Date().toISOString().slice(0, 10)

  if (format === 'html') {
    return new NextResponse(buildHtml(md, body.query), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="politeia-dossier-${slug}-${dateStamp}.html"`,
      },
    })
  }
  return new NextResponse(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="politeia-dossier-${slug}-${dateStamp}.md"`,
    },
  })
}

export async function GET() {
  return NextResponse.json({
    ok: false,
    error: 'Use POST',
    body_schema: {
      query: 'string · query original',
      search_response: 'object · respuesta /api/medios/search completa',
      brain_lectura: 'string opcional · resumen LLM',
      notes: 'string opcional · notas del analista',
    },
    query_params: { format: 'markdown (default) | html' },
  }, { status: 405 })
}
