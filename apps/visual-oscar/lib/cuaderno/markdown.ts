/**
 * Markdown → HTML render minimalista (sin dependencias) + soporte de wikilinks.
 *
 * No es exhaustivo pero cubre lo que un analista necesita:
 *   - Headings #..######
 *   - **bold**, *italic*, `code`
 *   - Bloques de código ```
 *   - Listas - y 1.
 *   - Tablas | a | b |
 *   - Citas >
 *   - Links [texto](url)
 *   - Wikilinks [[Nota]] o [[Nota|texto]] → onclick handler externo
 *   - Tags #foo → span class="tag"
 */

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Sprint Cuaderno N1 · resolver entidades del registry · lazy require evita ciclos
let _resolveEntity: ((s: string) => any) | null = null
let _kindColors: Record<string, { bg: string; fg: string; border: string; glyph: string }> | null = null
function _loadEntityRegistry() {
  if (_resolveEntity) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('./entity-registry')
    _resolveEntity = m.resolveEntity
    _kindColors = m.KIND_COLORS
  } catch {
    _resolveEntity = () => null
    _kindColors = {}
  }
}

function renderInline(line: string): string {
  let out = escape(line)
  // Sprint Cuaderno N1 · embed placeholders {source:key} → span placeholder hidratado por DataEmbed
  out = out.replace(/\{(macro|cis|stats|gov|wb|undp):([a-zA-Z0-9_.-]+)\}/g, (_, source, key) =>
    `<span class="cuad-embed" data-source="${escape(source)}" data-key="${escape(key)}" style="display:inline-block; min-width:120px; padding:6px 10px; margin:0 2px; border-radius:6px; border:1px dashed #cbd5e1; background:#f8fafc; vertical-align:middle; font-size:11px; color:#64748b;">⊡ ${escape(source)}:${escape(key)}…</span>`
  )
  // wikilinks [[slug]] o [[slug|texto]] · Sprint N1: si resuelve a entidad, badge coloreado con enlace al dashboard
  out = out.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, slug, text) => {
    const safe = String(slug).trim()
    const display = text ? String(text).trim() : safe
    _loadEntityRegistry()
    const entity = _resolveEntity?.(safe)
    if (entity && _kindColors) {
      const c = _kindColors[entity.kind]
      const tooltip = entity.role ? ` title="${escape(entity.role)}"` : ''
      return `<a href="${escape(entity.link)}" class="cuad-entity-badge" data-kind="${escape(entity.kind)}" data-slug="${escape(entity.slug)}"${tooltip} style="display:inline-flex; align-items:center; gap:4px; padding:1px 6px; margin:0 1px; border-radius:4px; background:${c.bg}; color:${c.fg}; border:1px solid ${c.border}; font-size:0.92em; font-weight:600; text-decoration:none;"><span style="font-size:0.85em;">${c.glyph}</span>${escape(display)}</a>`
    }
    return `<a href="#" class="cuad-wikilink" data-slug="${escape(safe)}">${escape(display)}</a>`
  })
  // markdown link [texto](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) =>
    `<a href="${escape(url)}" target="_blank" rel="noopener" class="cuad-link">${escape(text)}</a>`)
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // italic
  out = out.replace(/(^|[^\w*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
  // code inline
  out = out.replace(/`([^`]+)`/g, '<code class="cuad-code-inline">$1</code>')
  // tags #foo
  out = out.replace(/(^|[\s])(#[a-zA-Z0-9_-]{2,30})/g, '$1<span class="cuad-tag">$2</span>')
  return out
}

export function renderMarkdown(md: string): string {
  if (!md) return ''
  const lines = md.split(/\r?\n/)
  const out: string[] = []
  let inCode = false
  let inList: 'ul' | 'ol' | null = null
  let inTable = false
  let inQuote = false

  function closeAll() {
    if (inList) { out.push(`</${inList}>`); inList = null }
    if (inTable) { out.push('</tbody></table>'); inTable = false }
    if (inQuote) { out.push('</blockquote>'); inQuote = false }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw

    // Fenced code block
    if (line.startsWith('```')) {
      if (inCode) { out.push('</code></pre>'); inCode = false }
      else { closeAll(); out.push('<pre class="cuad-pre"><code>'); inCode = true }
      continue
    }
    if (inCode) { out.push(escape(line)); continue }

    // Table heuristic: a line of |...| followed by |---|---|
    if (line.includes('|') && lines[i + 1] && /^\s*\|?[\s:-]+\|/.test(lines[i + 1])) {
      closeAll()
      const headers = line.split('|').map(s => s.trim()).filter(Boolean)
      out.push('<table class="cuad-table"><thead><tr>')
      headers.forEach(h => out.push(`<th>${renderInline(h)}</th>`))
      out.push('</tr></thead><tbody>')
      i++ // skip separator
      inTable = true
      continue
    }
    if (inTable) {
      if (!line.includes('|')) { out.push('</tbody></table>'); inTable = false; }
      else {
        const cells = line.split('|').map(s => s.trim())
        // remove leading/trailing empty cells from outer pipes
        if (cells[0] === '') cells.shift()
        if (cells[cells.length - 1] === '') cells.pop()
        out.push('<tr>' + cells.map(c => `<td>${renderInline(c)}</td>`).join('') + '</tr>')
        continue
      }
    }

    // Headings
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      closeAll()
      const lvl = h[1].length
      out.push(`<h${lvl} class="cuad-h${lvl}">${renderInline(h[2])}</h${lvl}>`)
      continue
    }

    // Quote
    if (line.startsWith('> ')) {
      if (!inQuote) { closeAll(); out.push('<blockquote class="cuad-quote">'); inQuote = true }
      out.push(renderInline(line.slice(2)) + '<br/>')
      continue
    } else if (inQuote) { out.push('</blockquote>'); inQuote = false }

    // Lists
    const ul = /^[-*]\s+(.*)$/.exec(line)
    const ol = /^\d+\.\s+(.*)$/.exec(line)
    if (ul || ol) {
      const want = ul ? 'ul' : 'ol'
      if (inList !== want) {
        if (inList) out.push(`</${inList}>`)
        out.push(`<${want} class="cuad-${want}">`)
        inList = want
      }
      const itemRaw = (ul ? ul[1] : ol![1])
      // Task: - [ ] xxx ó - [x] xxx
      const task = /^\[( |x|X)\]\s+(.*)$/.exec(itemRaw)
      if (task) {
        const done = task[1].toLowerCase() === 'x'
        out.push(
          `<li class="cuad-task ${done ? 'cuad-task-done' : ''}">` +
          `<span class="cuad-task-checkbox" data-line="${i}" data-done="${done ? '1' : '0'}">${done ? '☑' : '☐'}</span> ` +
          renderInline(task[2]) +
          `</li>`
        )
      } else {
        out.push(`<li>${renderInline(itemRaw)}</li>`)
      }
      continue
    } else if (inList) { out.push(`</${inList}>`); inList = null }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) { closeAll(); out.push('<hr class="cuad-hr"/>'); continue }

    // Blank line = paragraph break
    if (line.trim() === '') { closeAll(); continue }

    // Regular paragraph
    out.push(`<p class="cuad-p">${renderInline(line)}</p>`)
  }
  closeAll()
  if (inCode) out.push('</code></pre>')
  return out.join('\n')
}
