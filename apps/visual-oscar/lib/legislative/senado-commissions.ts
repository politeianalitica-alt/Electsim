/**
 * Composición REAL de comisiones del Senado via scraping HTML.
 *
 * Endpoint correcto verificado:
 *   https://www.senado.es/web/actividadparlamentaria/sesionescomision/
 *     detallecomisiones/composicion/index.html?id={codigo}&legis=15&esMixta={S|N}
 *
 * Extrae miembros con regex desde las <li> que tienen
 *   <a title="Ficha de NOMBRE (GRUPO)" ...>...</a>
 *   <span class="...cargo...">PRESIDENTA</span>
 */

import type { CommissionMember, CommissionComposition } from './congreso'

const UA = 'Mozilla/5.0 (compatible; PoliteiaAnalitica/1.0; +https://politeia-visual-oscar.vercel.app)'

const SEN_GROUP_LABEL: Record<string, { label: string; color: string }> = {
  'GPP':    { label: 'PP',       color: '#1F4E8C' },
  'GPS':    { label: 'PSOE',     color: '#E1322D' },
  'GPV':    { label: 'VOX',      color: '#5BA02E' },
  'GPIC':   { label: 'IU Confederal', color: '#D43F8D' },
  'GPN':    { label: 'Nacionalistas',  color: '#E8A030' },
  'GPER':   { label: 'ERC',      color: '#E8A030' },
  'GPJ':    { label: 'Junts',    color: '#1FA89B' },
  'GPMX':   { label: 'Mixto',    color: '#94A3B8' },
  'GPCC':   { label: 'CC',       color: '#F2C43A' },
  'GPS-D':  { label: 'PSOE-D',   color: '#E1322D' },
  '':       { label: '—',        color: '#525252' },
}

export function senadoGroupInfo(siglas: string): { label: string; color: string } {
  return SEN_GROUP_LABEL[siglas] || { label: siglas, color: '#6E6E73' }
}

/**
 * Descarga el HTML de composición y extrae los miembros.
 *
 * Patrón HTML típico:
 *   <a href="/web/composicionorganizacion/composicion/.../fichasenador.html?id1=14145..."
 *      title="Ficha de MARÍA DEL CARMEN LEYTE COELLO (GPP)">
 *     Apellidos y Nombre <span>(Foto)</span>
 *   </a>
 *   <span class="cargo">PRESIDENTA</span>
 */
export async function fetchSenadoCommissionComposition(
  codigo: string,
  esMixta: boolean = false,
): Promise<CommissionComposition | null> {
  const url = `https://www.senado.es/web/actividadparlamentaria/sesionescomision/detallecomisiones/composicion/index.html?id=${encodeURIComponent(codigo)}&legis=15&esMixta=${esMixta ? 'S' : 'N'}`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: controller.signal,
      next: { revalidate: 7200 },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = await res.text()

    // Patrón principal: title="Ficha de NOMBRE (GRUPO)" + opcional <span class="cargo">
    // Manejamos también casos sin cargo (vocales)
    const memberRe = /fichasenador[^"]*?id1=(\d+)[^"]*?"[^>]*?title="Ficha de ([^"]+?)\s*\(([^)]+)\)"/g
    const matches: Array<{ id: number; nombre: string; grupo: string; cargo: string }> = []

    let m
    while ((m = memberRe.exec(html)) !== null) {
      const id = Number(m[1])
      const nombre = cleanText(m[2])
      const grupo = m[3].trim()
      // Buscar cargo asociado: hasta 600 caracteres después debería estar el <span class="cargo">
      const slice = html.slice(m.index, m.index + 800)
      const cargoMatch = slice.match(/<span[^>]*class="[^"]*cargo[^"]*"[^>]*>\s*([^<]+?)\s*</i)
      const cargo = cargoMatch
        ? cargoMatch[1].trim().toLowerCase().replace(/(?:^|\s)\S/g, t => t.toUpperCase())
        : 'Vocal'
      matches.push({ id, nombre, grupo, cargo })
    }

    // Dedup por id
    const seen = new Map<number, typeof matches[0]>()
    for (const member of matches) {
      if (!seen.has(member.id)) seen.set(member.id, member)
    }
    const dedup = Array.from(seen.values())

    const members: CommissionMember[] = dedup.map(m => ({
      id: m.id,
      nombre: titleCase(m.nombre),
      cargo: m.cargo,
      grupo: m.grupo,
      fechaAlta: '',
      fechaBaja: '',
      urlFicha: `https://www.senado.es/web/composicionorganizacion/composicion/composiciondelorganos/fichasenador/index.html?id1=${m.id}&legis=15`,
    }))

    const byGroup: Record<string, number> = {}
    for (const m of members) {
      byGroup[m.grupo || '—'] = (byGroup[m.grupo || '—'] || 0) + 1
    }

    return {
      codigo,
      fechaConstitucion: null,
      fechaDisolucion: null,
      members,
      byGroup,
      total: members.length,
      active: true,
    }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function titleCase(s: string): string {
  return s.toLowerCase().split(/\s+/)
    .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ')
}
