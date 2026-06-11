/**
 * md-to-blocks — convierte el Markdown de Cama/Preinformes al spec de
 * bloques del renderer PDF server-side (lib/render/pdf-renderer).
 *
 * Cobertura deliberadamente acotada al Markdown que GENERAN nuestros
 * stores (toMarkdown de la Cama, buildMarkdown de Preinformes): cabeceras,
 * párrafos, bullets, blockquotes, divisores y tablas simples (las filas se
 * aplanan a bullets "celda · celda · celda").
 */

type PdfBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'callout'; text: string; tone?: 'info' | 'warn' | 'danger' }
  | { type: 'divider' }
  | { type: 'footer'; text: string }

/** Quita marcado inline que el PDF no renderiza (negritas, código, links). */
function plain(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim()
}

export function mdToBlocks(md: string, opts: { skipFirstH1?: boolean } = {}): PdfBlock[] {
  const blocks: PdfBlock[] = []
  let firstH1Skipped = !opts.skipFirstH1
  let para: string[] = []

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: plain(para.join(' ')) })
      para = []
    }
  }

  for (const lineRaw of md.split(/\r?\n/)) {
    const line = lineRaw.trimEnd()
    if (!line.trim()) { flushPara(); continue }

    if (line.startsWith('# ')) {
      flushPara()
      if (!firstH1Skipped) { firstH1Skipped = true; continue }
      blocks.push({ type: 'h1', text: plain(line.slice(2)) })
    } else if (line.startsWith('## ')) {
      flushPara()
      blocks.push({ type: 'h2', text: plain(line.slice(3)) })
    } else if (line.startsWith('### ')) {
      flushPara()
      blocks.push({ type: 'h3', text: plain(line.slice(4)) })
    } else if (line.startsWith('- ')) {
      flushPara()
      blocks.push({ type: 'bullet', text: plain(line.slice(2)) })
    } else if (line.startsWith('> ')) {
      flushPara()
      blocks.push({ type: 'callout', text: plain(line.slice(2)), tone: 'info' })
    } else if (/^-{3,}$/.test(line.trim())) {
      flushPara()
      blocks.push({ type: 'divider' })
    } else if (line.startsWith('|')) {
      flushPara()
      // Tabla: salta separadores |---|; las filas pasan a bullets
      if (/^\|[\s:-]+\|/.test(line.replace(/[^|\s:-]/g, ''))) continue
      const cells = line.split('|').map(c => plain(c)).filter(Boolean)
      if (cells.length) blocks.push({ type: 'bullet', text: cells.join(' · ') })
    } else {
      para.push(line.trim())
    }
  }
  flushPara()
  return blocks
}
