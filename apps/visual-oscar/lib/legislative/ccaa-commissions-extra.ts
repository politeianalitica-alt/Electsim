/**
 * Comisiones de los 10 parlamentos autonómicos restantes.
 *
 * Cobertura:
 *   - Cortes de Aragón
 *   - Junta General del Principado de Asturias
 *   - Parlament de les Illes Balears
 *   - Parlamento de Canarias
 *   - Parlamento de Cantabria
 *   - Cortes de Castilla-La Mancha
 *   - Asamblea de Extremadura
 *   - Parlamento de La Rioja
 *   - Asamblea Regional de Murcia
 *   - Parlamento de Navarra (vía Wayback)
 *
 * Cada uno expone: list() para listado + composition(code) para detalle.
 */

import type { Commission, CCAA } from './types'
import type { CommissionMember, CommissionComposition } from './congreso'

const UA_DEFAULT = 'Mozilla/5.0 (compatible; PoliteiaAnalitica/1.0; +https://politeia-visual-oscar.vercel.app)'
const UA_FIREFOX = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:120.0) Gecko/20100101 Firefox/120.0'

async function fetchHtml(url: string, opts: { encoding?: string; ua?: string; timeoutMs?: number } = {}): Promise<string | null> {
  const { encoding = 'utf-8', ua = UA_DEFAULT, timeoutMs = 12000 } = opts
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': ua, Accept: 'text/html' },
      signal: controller.signal,
      next: { revalidate: 21600 },
      redirect: 'follow',
    })
    if (!res.ok) return null
    if (encoding === 'utf-8') return await res.text()
    const buf = await res.arrayBuffer()
    return new TextDecoder(encoding).decode(buf)
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function dedup<T>(arr: T[], keyFn: (t: T) => string): T[] {
  const seen = new Map<string, T>()
  for (const it of arr) {
    const k = keyFn(it)
    if (!seen.has(k)) seen.set(k, it)
  }
  return Array.from(seen.values())
}

// ─── 1. Cortes de Aragón ────────────────────────────────────────────────────

export async function listAragonCommissions(): Promise<Commission[]> {
  const html = await fetchHtml('https://www.cortesaragon.es/Comisiones-permanentes.2265.0.html')
  if (!html) return []
  // href slug+id+.0.html
  const re = /href="([A-Z][A-Za-z0-9-]+\.(\d+)\.0\.html\?[^"]*)"[^>]*>([^<]{5,150}?)</g
  const out: Commission[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const path = m[1]
    const codigo = m[2]
    const nombre = m[3].replace(/\s+/g, ' ').trim()
    // Filtrar enlaces no-comisión
    if (/comisi/i.test(nombre) || /Hacienda|Sanidad|Educaci|Industria|Vertebraci|Agricultur|Ciencia|Ciudadan|Comparec|Desarroll|Econom|Ord(?:enaci)?|Reglament/i.test(nombre)) {
      out.push({
        id: `ccaa-aragon-${codigo}`,
        codigo,
        nombre,
        camara: 'autonomico',
        ccaa: 'aragon',
        kind: /investigaci/i.test(nombre) ? 'investigacion' : 'permanente',
        active: true,
        isInvestigation: /investigaci/i.test(nombre),
        url: `https://www.cortesaragon.es/${path}`,
      })
    }
  }
  return dedup(out, c => c.codigo)
}

export async function fetchAragonComposition(codigoUrl: string, slug?: string): Promise<CommissionComposition | null> {
  // codigoUrl puede venir como `codigo` o como `codigo-slug`. Reconstruimos URL.
  // Si no tenemos slug, intentamos buscar desde la lista.
  let url: string
  if (slug) {
    url = `https://www.cortesaragon.es/${slug}.${codigoUrl}.0.html`
  } else {
    // Necesitamos refetch la lista para obtener la URL completa
    const list = await listAragonCommissions()
    const found = list.find(c => c.codigo === codigoUrl)
    if (!found || !found.url) return null
    url = found.url
  }
  const html = await fetchHtml(url)
  if (!html) return null

  const re = /<div class="team-title"><h4[^>]*><a[^>]*tx_t3comunicacion_pi3%5Buiddip%5D=(\d+)"[^>]*>([^<]+)<\/a><\/h4><span>([^<]+)<\/span>/g
  const members: CommissionMember[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const id = Number(m[1])
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    const cargoGrupo = m[3].replace(/\s+/g, ' ').trim()
    // "Presidenta (GPVOX)" o "G.P. Popular de las Cortes de Aragón"
    const cargoMatch = cargoGrupo.match(/^([^(]+?)\s*\(([^)]+)\)$/)
    const cargo = cargoMatch ? cargoMatch[1].trim() : 'Vocal'
    const grupoRaw = cargoMatch ? cargoMatch[2] : cargoGrupo
    members.push({
      id, nombre, cargo, grupo: normalizeAragonGroup(grupoRaw),
      fechaAlta: '', fechaBaja: '',
      urlFicha: `https://www.cortesaragon.es/Ficha-personal.2370.0.html?tx_t3comunicacion_pi3%5Buiddip%5D=${id}`,
    })
  }

  const byGroup: Record<string, number> = {}
  for (const mb of members) byGroup[mb.grupo || '—'] = (byGroup[mb.grupo || '—'] || 0) + 1

  return { codigo: codigoUrl, fechaConstitucion: null, fechaDisolucion: null, members, byGroup, total: members.length, active: true }
}

function normalizeAragonGroup(s: string): string {
  const t = s.toLowerCase()
  if (/gpp\b|popular/.test(t)) return 'PP'
  if (/gpsoc|sociali|psoe|gpps/.test(t)) return 'PSOE'
  if (/gpvox|vox/.test(t)) return 'VOX'
  if (/gpcha|chunta/.test(t)) return 'CHA'
  if (/gppar\b|partido aragones|par/.test(t)) return 'PAR'
  if (/gpaca|aragon[\s-]*existe/.test(t)) return 'AE'
  if (/gpiu|izquierda unida/.test(t)) return 'IU'
  if (/gpteruel/.test(t)) return 'TE'
  if (/gpmx|mixt/.test(t)) return 'Mixto'
  return s.replace(/g\.?p\.?\s+/i, '').slice(0, 15)
}

// ─── 2. Asturias (JGPA) ────────────────────────────────────────────────────

export async function listAsturiasCommissions(): Promise<Commission[]> {
  const html = await fetchHtml('https://www.jgpa.es/comisiones')
  if (!html) return []
  const re = /organoParlamentarioIdAgora=(\d+)[\s\S]{0,500}?class="name block title">\s*([^<]+?)\s*</g
  const out: Commission[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const codigo = m[1]
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    if (nombre.length < 5) continue
    out.push({
      id: `ccaa-asturias-${codigo}`,
      codigo,
      nombre,
      camara: 'autonomico',
      ccaa: 'asturias',
      kind: /investigaci/i.test(nombre) ? 'investigacion' : 'permanente',
      active: true,
      isInvestigation: /investigaci/i.test(nombre),
      url: `https://www.jgpa.es/comisiones?p_p_id=jgpaportlet_WAR_jgpaportlet_INSTANCE_1I2kbk1FAoOP&p_p_lifecycle=0&_jgpaportlet_WAR_jgpaportlet_INSTANCE_1I2kbk1FAoOP_organoParlamentarioIdAgora=${codigo}&_jgpaportlet_WAR_jgpaportlet_INSTANCE_1I2kbk1FAoOP_display=6`,
    })
  }
  return dedup(out, c => c.codigo)
}

export async function fetchAsturiasComposition(codigo: string): Promise<CommissionComposition | null> {
  const url = `https://www.jgpa.es/comisiones?p_p_id=jgpaportlet_WAR_jgpaportlet_INSTANCE_1I2kbk1FAoOP&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&p_p_col_id=column-2&p_p_col_pos=2&p_p_col_count=3&_jgpaportlet_WAR_jgpaportlet_INSTANCE_1I2kbk1FAoOP_organoParlamentarioIdAgora=${codigo}&_jgpaportlet_WAR_jgpaportlet_INSTANCE_1I2kbk1FAoOP_display=6`
  const html = await fetchHtml(url)
  if (!html) return null

  // El patrón es <span class="pagesubtitle">CARGO</span> seguido de <a class="entry-inner" ... title='Ir a, NOMBRE'>
  // Pero también hay otra estructura sin cargo. Capturamos pares con regex global.
  const members: CommissionMember[] = []
  const re = /(?:<span[^>]*class="pagesubtitle"[^>]*>([^<]+)<\/span>[\s\S]*?)?<a[^>]*class="entry-inner"[^>]*href="[^"]*diputadoId=(\d+)[^"]*"[^>]*title=['"]Ir a,\s*([^'"]+)['"]/g
  let m
  let currentCargo = 'Vocal'
  while ((m = re.exec(html)) !== null) {
    if (m[1]) currentCargo = m[1].trim()
    const id = Number(m[2])
    const nombre = m[3].replace(/\s+/g, ' ').trim()
    if (members.some(x => x.id === id)) continue
    members.push({
      id, nombre, cargo: currentCargo,
      grupo: '',
      fechaAlta: '', fechaBaja: '',
      urlFicha: '',
    })
  }
  return { codigo, fechaConstitucion: null, fechaDisolucion: null, members, byGroup: { '—': members.length }, total: members.length, active: true }
}

// ─── 3. Parlament de les Illes Balears ──────────────────────────────────────

export async function listBalearesCommissions(): Promise<Commission[]> {
  const html = await fetchHtml('https://www.parlamentib.es/Representants/Comissions.aspx')
  if (!html) return []
  const re = /javascript:\s*showComision\('([A-Z0-9]{4,6})'\)"[^>]*>([^<]+)</g
  const out: Commission[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const codigo = m[1]
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    out.push({
      id: `ccaa-baleares-${codigo}`,
      codigo,
      nombre,
      camara: 'autonomico',
      ccaa: 'baleares',
      kind: /investigaci/i.test(nombre) ? 'investigacion' : 'permanente',
      active: true,
      isInvestigation: /investigaci/i.test(nombre),
      url: `http://web.parlamentib.es/webgtp/scripts/UnRegOrg.asp?CFcodOrg=${codigo}&CFtipOrg=CO&CFimprimir=0`,
    })
  }
  return dedup(out, c => c.codigo)
}

export async function fetchBalearesComposition(codigo: string): Promise<CommissionComposition | null> {
  const html = await fetchHtml(
    `http://web.parlamentib.es/webgtp/scripts/UnRegOrg.asp?CFcodOrg=${codigo}&CFtipOrg=CO&CFimprimir=0`,
    { encoding: 'iso-8859-1' }
  )
  if (!html) return null

  const re = /<a href="javascript:passaParam\('(\d+)'[^)]*\)">\s*([^<]+?)\s*<\/a>\s*<\/td>\s*<td>([A-ZÀ-ÝÇ]+)<\/td>/g
  const members: CommissionMember[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const id = Number(m[1])
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    const cargo = titleCaseEs(m[3].trim())
    if (members.some(x => x.id === id)) continue
    members.push({ id, nombre, cargo, grupo: '', fechaAlta: '', fechaBaja: '', urlFicha: '' })
  }
  return { codigo, fechaConstitucion: null, fechaDisolucion: null, members, byGroup: { '—': members.length }, total: members.length, active: true }
}

// ─── 4. Parlamento de Canarias ──────────────────────────────────────────────

export async function listCanariasCommissions(): Promise<Commission[]> {
  const html = await fetchHtml('https://www.parcan.es/composicion/comisiones.py')
  if (!html) return []
  const re = /href="\/composicion\/organo\.py\?ID_ORGANO=(\d+)">([^<]+)</g
  const out: Commission[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const codigo = m[1]
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    out.push({
      id: `ccaa-canarias-${codigo}`,
      codigo,
      nombre,
      camara: 'autonomico',
      ccaa: 'canarias',
      kind: /investigaci/i.test(nombre) ? 'investigacion' : 'permanente',
      active: true,
      isInvestigation: /investigaci/i.test(nombre),
      url: `https://www.parcan.es/composicion/organo.py?ID_ORGANO=${codigo}`,
    })
  }
  return dedup(out, c => c.codigo)
}

export async function fetchCanariasComposition(codigo: string): Promise<CommissionComposition | null> {
  const html = await fetchHtml(`https://www.parcan.es/composicion/organo.py?ID_ORGANO=${codigo}`)
  if (!html) return null

  const re = /<tr valign="top">\s*<td><a href="\/composicion\/diputados\/diputado\/(\d+)\/">([^<]+)<\/a><\/td>\s*<td>([^<]+?)(?:<br>\([^)]+\))?<\/td>\s*<td>([^<]+)<\/td>/g
  const members: CommissionMember[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const id = Number(m[1])
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    const cargo = m[3].replace(/\s+/g, ' ').trim()
    const grupoRaw = m[4].replace(/\s+/g, ' ').trim()
    const grupo = normalizeCanariasGroup(grupoRaw)
    members.push({ id, nombre, cargo, grupo, fechaAlta: '', fechaBaja: '', urlFicha: `https://www.parcan.es/composicion/diputados/diputado/${id}/` })
  }
  const byGroup: Record<string, number> = {}
  for (const mb of members) byGroup[mb.grupo || '—'] = (byGroup[mb.grupo || '—'] || 0) + 1
  return { codigo, fechaConstitucion: null, fechaDisolucion: null, members, byGroup, total: members.length, active: true }
}

function normalizeCanariasGroup(s: string): string {
  const t = s.toLowerCase()
  if (/popular|pp/.test(t)) return 'PP'
  if (/sociali|psoe/.test(t)) return 'PSOE'
  if (/vox/.test(t)) return 'VOX'
  if (/cc[a]?\)|nacionalista canario/.test(t)) return 'CC'
  if (/asg|agrupaci.n.*gomera/.test(t)) return 'ASG'
  if (/nueva canarias|nca?\)/.test(t)) return 'NC'
  if (/mixt/.test(t)) return 'Mixto'
  return s.slice(0, 15)
}

// ─── 5. Parlamento de Cantabria ─────────────────────────────────────────────

export async function listCantabriaCommissions(): Promise<Commission[]> {
  const urls = [
    'https://parlamento-cantabria.es/informacion-general/comisiones-permanentes',
    'https://parlamento-cantabria.es/informacion-general/comisiones-no-permanentes',
  ]
  const all: Commission[] = []
  for (const url of urls) {
    const html = await fetchHtml(url)
    if (!html) continue
    const re = /href="(\/informacion-general\/composicion\/11l-comisi%C3%B3n-[^"]+)">([^<]+)</g
    let m
    while ((m = re.exec(html)) !== null) {
      const slug = m[1]
      const nombre = decodeURIComponent(m[2].replace(/\s+/g, ' ').trim())
      all.push({
        id: `ccaa-cantabria-${slug.split('/').pop()}`,
        codigo: slug.split('/').pop()!,
        nombre,
        camara: 'autonomico',
        ccaa: 'cantabria',
        kind: /investigaci/i.test(nombre) ? 'investigacion'
          : /no permanente/i.test(url) ? 'no-permanente'
          : 'permanente',
        active: true,
        isInvestigation: /investigaci/i.test(nombre),
        url: `https://parlamento-cantabria.es${slug}`,
      })
    }
  }
  return dedup(all, c => c.codigo)
}

export async function fetchCantabriaComposition(slug: string): Promise<CommissionComposition | null> {
  const html = await fetchHtml(`https://parlamento-cantabria.es/informacion-general/composicion/${slug}`)
  if (!html) return null

  const re = /<a href="\/informacion-general\/composicion\/(11l-[^"]+)">([^<]+)<\/a><br\/>\s*<span class="label label-[a-z]+">([^<]+)<\/span>[\s\S]{0,800}?<img[^>]*src="[^"]*\/([^/"]+?)\.(?:png|jpg|jpeg)"/gi
  const members: CommissionMember[] = []
  let m
  let i = 1
  while ((m = re.exec(html)) !== null) {
    const slugPersona = m[1]
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    const cargo = m[3].trim()
    const logo = m[4].toLowerCase()
    const grupo = normalizeCantabriaGroup(logo)
    members.push({
      id: i++, nombre, cargo, grupo,
      fechaAlta: '', fechaBaja: '',
      urlFicha: `https://parlamento-cantabria.es/informacion-general/composicion/${slugPersona}`,
    })
  }
  const byGroup: Record<string, number> = {}
  for (const mb of members) byGroup[mb.grupo || '—'] = (byGroup[mb.grupo || '—'] || 0) + 1
  return { codigo: slug, fechaConstitucion: null, fechaDisolucion: null, members, byGroup, total: members.length, active: true }
}

function normalizeCantabriaGroup(s: string): string {
  if (/pp/.test(s)) return 'PP'
  if (/psoe/.test(s)) return 'PSOE'
  if (/vox/.test(s)) return 'VOX'
  if (/prc|regionalista/.test(s)) return 'PRC'
  if (/mixt/.test(s)) return 'Mixto'
  return s.slice(0, 12)
}

// ─── 6. Cortes de Castilla-La Mancha ────────────────────────────────────────

export async function listClmCommissions(): Promise<Commission[]> {
  const html = await fetchHtml('https://www.cortesclm.es/web2/paginas/comisiones.php', { encoding: 'iso-8859-1' })
  if (!html) return []
  const re = /<a href="vercomisiones\.php\?organo=(\d+)">([^<]+?)(?:<br>|<i>|<\/a>)/g
  const out: Commission[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const codigo = m[1]
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    if (nombre.length < 5) continue
    out.push({
      id: `ccaa-castilla-mancha-${codigo}`,
      codigo,
      nombre,
      camara: 'autonomico',
      ccaa: 'castilla-mancha',
      kind: /investigaci/i.test(nombre) ? 'investigacion' : 'permanente',
      active: true,
      isInvestigation: /investigaci/i.test(nombre),
      url: `https://www.cortesclm.es/web2/paginas/vercomisiones.php?organo=${codigo}`,
    })
  }
  return dedup(out, c => c.codigo)
}

export async function fetchClmComposition(codigo: string): Promise<CommissionComposition | null> {
  const html = await fetchHtml(
    `https://www.cortesclm.es/web2/paginas/vercomisiones.php?organo=${codigo}`,
    { encoding: 'iso-8859-1' }
  )
  if (!html) return null

  const re = /<td><p><strong>(Presidente|Vicepresidenta|Vicepresidente|Presidenta|Secretario|Secretaria|Miembro)<\/strong><\/p><\/td>\s*<td><p>\s*<a[^>]*mostrar\((\d+),\d+\);"[^>]*>\s*(?:D\.|D&ntilde;a\.)?\s*([^<]+?)\s*<\/a>[\s\S]{0,200}?<td><p style="text-align:center">(GP[A-Z]+)<\/p><\/td>/g
  const members: CommissionMember[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const cargo = m[1]
    const id = Number(m[2])
    const nombre = m[3].replace(/&ntilde;/gi, 'ñ').replace(/\s+/g, ' ').trim()
    const grupo = normalizeClmGroup(m[4])
    if (members.some(x => x.id === id)) continue
    members.push({ id, nombre, cargo, grupo, fechaAlta: '', fechaBaja: '', urlFicha: '' })
  }
  const byGroup: Record<string, number> = {}
  for (const mb of members) byGroup[mb.grupo || '—'] = (byGroup[mb.grupo || '—'] || 0) + 1
  return { codigo, fechaConstitucion: null, fechaDisolucion: null, members, byGroup, total: members.length, active: true }
}

function normalizeClmGroup(s: string): string {
  const map: Record<string, string> = { 'GPP': 'PP', 'GPS': 'PSOE', 'GPV': 'VOX', 'GPM': 'Mixto', 'GPI': 'IU' }
  return map[s] || s
}

// ─── 7. Asamblea de Extremadura ─────────────────────────────────────────────

export async function listExtremaduraCommissions(): Promise<Commission[]> {
  const html = await fetchHtml('https://www.asambleaex.es/orgcomis-12', { encoding: 'iso-8859-1', timeoutMs: 25000 })
  if (!html) return []
  const re = /href="(dipsorgano-(\d+)-12)">([^<]+)<\/a>/g
  const out: Commission[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const codigo = m[2]
    const nombre = m[3].replace(/\s+/g, ' ').trim()
    out.push({
      id: `ccaa-extremadura-${codigo}`,
      codigo,
      nombre,
      camara: 'autonomico',
      ccaa: 'extremadura',
      kind: /investigaci/i.test(nombre) ? 'investigacion' : 'permanente',
      active: true,
      isInvestigation: /investigaci/i.test(nombre),
      url: `https://www.asambleaex.es/dipsorgano-${codigo}-12`,
    })
  }
  return dedup(out, c => c.codigo)
}

export async function fetchExtremaduraComposition(codigo: string): Promise<CommissionComposition | null> {
  const html = await fetchHtml(
    `https://www.asambleaex.es/dipsorgano-${codigo}-12`,
    { encoding: 'iso-8859-1', timeoutMs: 25000 }
  )
  if (!html) return null

  const re = /<li><a class="pn-title" href="verdiputado-(\d+)">([^<]+)<\/a> - <strong>([^<]+)<\/strong>/g
  const members: CommissionMember[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const id = Number(m[1])
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    const cargo = m[3].trim()
    if (members.some(x => x.id === id)) continue
    members.push({ id, nombre, cargo, grupo: '', fechaAlta: '', fechaBaja: '', urlFicha: `https://www.asambleaex.es/verdiputado-${id}` })
  }
  return { codigo, fechaConstitucion: null, fechaDisolucion: null, members, byGroup: { '—': members.length }, total: members.length, active: true }
}

// ─── 8. Parlamento de La Rioja ──────────────────────────────────────────────

export async function listRiojaCommissions(): Promise<Commission[]> {
  const html = await fetchHtml('https://www.parlamento-larioja.org/composicion-y-organos/legislatura-11/organos/comisiones')
  if (!html) return []
  const re = /href="(https:\/\/www\.parlamento-larioja\.org\/composicion-y-organos\/legislatura-11\/organos\/comisiones\/(\d+\w*))"[^>]*>([\s\S]{0,200}?)<\/a>/g
  const out: Commission[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const url = m[1]
    const codigo = m[2]
    let nombre = m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (nombre.length < 5 || /^[\d\s]+$/.test(nombre)) continue
    out.push({
      id: `ccaa-rioja-${codigo}`,
      codigo,
      nombre,
      camara: 'autonomico',
      ccaa: 'rioja',
      kind: /investigaci/i.test(nombre) ? 'investigacion' : 'permanente',
      active: true,
      isInvestigation: /investigaci/i.test(nombre),
      url,
    })
  }
  return dedup(out, c => c.codigo)
}

export async function fetchRiojaComposition(codigo: string): Promise<CommissionComposition | null> {
  // Buscar URL exacta desde el listado
  const list = await listRiojaCommissions()
  const c = list.find(x => x.codigo === codigo)
  if (!c || !c.url) return null
  const html = await fetchHtml(c.url)
  if (!html) return null

  const re = /<h3>(Presidenta?|Vicepresidenta?|Secretari[oa]|Diputado\/a|Vocal)<\/h3>[\s\S]{0,200}?<div class="float-right">\(([^)]+)\)<\/div>\s*<a href="[^"]*\/diputados\/([^"]+)">([^<]+)<\/a>/g
  const members: CommissionMember[] = []
  let m
  let i = 1
  while ((m = re.exec(html)) !== null) {
    const cargo = m[1].trim()
    const grupo = normalizeRiojaGroup(m[2].trim())
    const slug = m[3]
    const nombre = m[4].replace(/\s+/g, ' ').trim()
    members.push({
      id: i++, nombre, cargo, grupo,
      fechaAlta: '', fechaBaja: '',
      urlFicha: `https://www.parlamento-larioja.org/composicion-y-organos/legislatura-11/diputados/${slug}`,
    })
  }
  const byGroup: Record<string, number> = {}
  for (const mb of members) byGroup[mb.grupo || '—'] = (byGroup[mb.grupo || '—'] || 0) + 1
  return { codigo, fechaConstitucion: null, fechaDisolucion: null, members, byGroup, total: members.length, active: true }
}

function normalizeRiojaGroup(s: string): string {
  const map: Record<string, string> = { 'GPP': 'PP', 'GPS': 'PSOE', 'GPV': 'VOX', 'GPM': 'Mixto' }
  return map[s] || s
}

// ─── 9. Asamblea Regional de Murcia ─────────────────────────────────────────

export async function listMurciaCommissions(): Promise<Commission[]> {
  const html = await fetchHtml('https://www.asambleamurcia.es/arm/organos-xi', { ua: UA_FIREFOX })
  if (!html) return []
  const re = /href="(\/arm\/organos-xi\/no-rectores\/comisiones\/(legislativas|no-legislativas)\/([a-z_0-9]+))"[^>]*>([^<]+)/g
  const out: Commission[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const path = m[1]
    const tipo = m[2]
    const slug = m[3]
    const nombre = m[4].replace(/\s+/g, ' ').trim()
    out.push({
      id: `ccaa-murcia-${slug}`,
      codigo: slug,
      nombre,
      camara: 'autonomico',
      ccaa: 'murcia',
      kind: /investigaci/i.test(nombre) ? 'investigacion'
        : tipo === 'no-legislativas' ? 'no-permanente'
        : 'permanente',
      active: true,
      isInvestigation: /investigaci/i.test(nombre),
      url: `https://www.asambleamurcia.es${path}`,
    })
  }
  return dedup(out, c => c.codigo)
}

export async function fetchMurciaComposition(slug: string): Promise<CommissionComposition | null> {
  // Necesitamos URL completa - intentar ambos tipos
  for (const tipo of ['legislativas', 'no-legislativas']) {
    const html = await fetchHtml(
      `https://www.asambleamurcia.es/arm/organos-xi/no-rectores/comisiones/${tipo}/${slug}`,
      { ua: UA_FIREFOX }
    )
    if (!html) continue
    const re = /<a href="\/diputado\/(\d+)\/([^"]+)"[^>]*>([^<]+?)\s*\(([^)]+)\)<\/a>/g
    const members: CommissionMember[] = []
    let m
    while ((m = re.exec(html)) !== null) {
      const id = Number(m[1])
      const nombre = m[3].replace(/\s+/g, ' ').trim()
      const cargoGrupo = m[4].trim()
      // "Portavoz G.P. Popular" o "G.P. Socialista"
      const cargoMatch = cargoGrupo.match(/^(Presidenta?|Vicepresidenta?|Secretari[oa]|Portavoz)\s+(.+)$/)
      const cargo = cargoMatch ? cargoMatch[1] : 'Vocal'
      const grupoRaw = cargoMatch ? cargoMatch[2] : cargoGrupo
      if (members.some(x => x.id === id)) continue
      members.push({
        id, nombre, cargo, grupo: normalizeMurciaGroup(grupoRaw),
        fechaAlta: '', fechaBaja: '',
        urlFicha: `https://www.asambleamurcia.es/diputado/${id}/${m[2]}`,
      })
    }
    if (members.length > 0) {
      const byGroup: Record<string, number> = {}
      for (const mb of members) byGroup[mb.grupo || '—'] = (byGroup[mb.grupo || '—'] || 0) + 1
      return { codigo: slug, fechaConstitucion: null, fechaDisolucion: null, members, byGroup, total: members.length, active: true }
    }
  }
  return null
}

function normalizeMurciaGroup(s: string): string {
  const t = s.toLowerCase()
  if (/popular|pp\b/.test(t)) return 'PP'
  if (/sociali|psoe/.test(t)) return 'PSOE'
  if (/vox/.test(t)) return 'VOX'
  if (/podemos/.test(t)) return 'Podemos'
  if (/mixt/.test(t)) return 'Mixto'
  return s.slice(0, 15)
}

// ─── 10. Parlamento de Navarra (vía Wayback) ────────────────────────────────

const WAYBACK = 'https://web.archive.org/web/2025/'

export async function listNavarraCommissions(): Promise<Commission[]> {
  const html = await fetchHtml(`${WAYBACK}https://parlamentodenavarra.es/es/composicion-organos/organos-parlamento`)
  if (!html) return []
  const re = /href="\/web\/\d+\/https:\/\/parlamentodenavarra\.es\/es\/composicion-organos\/(comisi%C3%B3n-[^"]+|comisi%C3%B3n-espec%C3%ADfica[^"]+)">([^<]+)</g
  const out: Commission[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const slug = m[1]
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    out.push({
      id: `ccaa-navarra-${slug}`,
      codigo: slug,
      nombre,
      camara: 'autonomico',
      ccaa: 'navarra',
      kind: /investigaci/i.test(nombre) ? 'investigacion' : 'permanente',
      active: true,
      isInvestigation: /investigaci/i.test(nombre),
      url: `${WAYBACK}https://parlamentodenavarra.es/es/composicion-organos/${slug}`,
    })
  }
  return dedup(out, c => c.codigo)
}

export async function fetchNavarraComposition(slug: string): Promise<CommissionComposition | null> {
  const html = await fetchHtml(`${WAYBACK}https://parlamentodenavarra.es/es/composicion-organos/${slug}`)
  if (!html) return null

  const re = /<div class="nombrelargodos">\s*<a href="[^"]*\/persona\/([^"]+)">([^<]+)<\/a>[\s\S]{0,500}?\/composicion-organos\/(gp-[^"]+)"[\s\S]{0,300}?<div class="cargo">([^<]+)<\/div>/g
  const members: CommissionMember[] = []
  let m
  let i = 1
  while ((m = re.exec(html)) !== null) {
    const slugP = m[1]
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    const grupoSlug = decodeURIComponent(m[3])
    const cargo = m[4].trim()
    members.push({
      id: i++, nombre, cargo,
      grupo: normalizeNavarraGroup(grupoSlug),
      fechaAlta: '', fechaBaja: '',
      urlFicha: '',
    })
  }
  const byGroup: Record<string, number> = {}
  for (const mb of members) byGroup[mb.grupo || '—'] = (byGroup[mb.grupo || '—'] || 0) + 1
  return { codigo: slug, fechaConstitucion: null, fechaDisolucion: null, members, byGroup, total: members.length, active: true }
}

function normalizeNavarraGroup(s: string): string {
  const t = s.toLowerCase()
  if (/psn|partido-socialista/.test(t)) return 'PSN'
  if (/upn|uni.n-del-pueblo/.test(t)) return 'UPN'
  if (/bildu/.test(t)) return 'EH Bildu'
  if (/geroa-bai/.test(t)) return 'Geroa Bai'
  if (/podemos|contigo-navarra/.test(t)) return 'Contigo'
  if (/vox/.test(t)) return 'VOX'
  if (/pp/.test(t)) return 'PP'
  if (/mixt/.test(t)) return 'Mixto'
  return s.replace(/^gp-/, '').slice(0, 15)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function titleCaseEs(s: string): string {
  return s.toLowerCase().split(/\s+/)
    .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ')
}

// ─── Agregador ──────────────────────────────────────────────────────────────

const LISTERS: Record<string, () => Promise<Commission[]>> = {
  'aragon': listAragonCommissions,
  'asturias': listAsturiasCommissions,
  'baleares': listBalearesCommissions,
  'canarias': listCanariasCommissions,
  'cantabria': listCantabriaCommissions,
  'castilla-mancha': listClmCommissions,
  'extremadura': listExtremaduraCommissions,
  'rioja': listRiojaCommissions,
  'murcia': listMurciaCommissions,
  'navarra': listNavarraCommissions,
}

interface Cache { ts: number; data: Commission[] }
let cache: Cache | null = null
const TTL = 6 * 60 * 60 * 1000

export async function fetchExtraCCAACommissions(): Promise<Commission[]> {
  if (cache && Date.now() - cache.ts < TTL) return cache.data
  const settled = await Promise.allSettled(Object.values(LISTERS).map(fn => fn()))
  const all: Commission[] = []
  for (const r of settled) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }
  cache = { ts: Date.now(), data: all }
  return all
}

export async function fetchExtraCCAAComposition(
  ccaa: CCAA,
  codigo: string,
): Promise<CommissionComposition | null> {
  switch (ccaa) {
    case 'aragon':          return fetchAragonComposition(codigo)
    case 'asturias':        return fetchAsturiasComposition(codigo)
    case 'baleares':        return fetchBalearesComposition(codigo)
    case 'canarias':        return fetchCanariasComposition(codigo)
    case 'cantabria':       return fetchCantabriaComposition(codigo)
    case 'castilla-mancha': return fetchClmComposition(codigo)
    case 'extremadura':     return fetchExtremaduraComposition(codigo)
    case 'rioja':           return fetchRiojaComposition(codigo)
    case 'murcia':          return fetchMurciaComposition(codigo)
    case 'navarra':         return fetchNavarraComposition(codigo)
    default: return null
  }
}
