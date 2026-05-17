/**
 * Comisiones de parlamentos autonómicos via scraping HTML.
 *
 * Cobertura inicial:
 *   - Parlament de Catalunya
 *   - Eusko Legebiltzarra (País Vasco) — incluye HISTÓRICO L01-L12
 *   - Parlamento de Andalucía
 *   - Corts Valencianes
 *   - Parlamento de Galicia (via Wayback Machine)
 *
 * Para cada CCAA se exporta:
 *   - listCommissions() — lista de comisiones activas con codigo + nombre
 *   - fetchComposition(codigo) — composición real con miembros y grupos
 */

import type { Commission, CCAA } from './types'
import type { CommissionMember, CommissionComposition } from './congreso'

const UA = 'Mozilla/5.0 (compatible; PoliteiaAnalitica/1.0; +https://politeia-visual-oscar.vercel.app)'

async function fetchHtml(url: string, encoding: string = 'utf-8', timeoutMs = 10000): Promise<string | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
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

// ─── 1. Parlament de Catalunya ──────────────────────────────────────────────
// HTML ISO-8859-1. Listado en /web/composicio/comissions/index.html
// Detalle en /web/composicio/comissions/informacio-comissio/index.html?p_codi=NNN

export async function listCatalunyaCommissions(): Promise<Commission[]> {
  const html = await fetchHtml('https://www.parlament.cat/web/composicio/comissions/index.html', 'iso-8859-1')
  if (!html) return []

  // Extraer hrefs con p_codi=NNN + nombre del link
  const re = /href="[^"]*?(?:informacio-comissio|comissio-fitxa)[^"]*?p_codi=(\d+)[^"]*"[^>]*>\s*([^<]+?)\s*</g
  const seen = new Map<string, string>()
  let m
  while ((m = re.exec(html)) !== null) {
    const codigo = m[1]
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    if (nombre.length < 5) continue
    if (!seen.has(codigo) || seen.get(codigo)!.length < nombre.length) seen.set(codigo, nombre)
  }

  const out: Commission[] = []
  for (const [codigo, nombre] of seen) {
    const lower = nombre.toLowerCase()
    const isInvestigation = /investigaci/.test(lower)
    out.push({
      id: `ccaa-cataluna-${codigo}`,
      codigo,
      nombre,
      camara: 'autonomico',
      ccaa: 'cataluna',
      kind: isInvestigation ? 'investigacion'
        : /no permanent/.test(lower) ? 'no-permanente'
        : 'permanente',
      active: true,
      isInvestigation,
      url: `https://www.parlament.cat/web/composicio/comissions/informacio-comissio/index.html?p_legislatura=15&p_tipus=COM&p_codi=${codigo}`,
    })
  }
  return out
}

export async function fetchCatalunyaComposition(codigo: string): Promise<CommissionComposition | null> {
  const html = await fetchHtml(
    `https://www.parlament.cat/web/composicio/comissions/informacio-comissio/index.html?p_legislatura=15&p_tipus=COM&p_codi=${codigo}`,
    'iso-8859-1'
  )
  if (!html) return null

  // Patrón: <a href=".../diputats-fitxa/index.html?p_codi=NNN"><img alt="Fotografia de NOMBRE">
  // Luego en bloque: <p class="marg-0">CARGO</p> <p class="marg-1">GRUPO</p>
  const memberRe = /href="\/web\/composicio\/diputats-fitxa\/index\.html\?p_codi=(\d+)"[^>]*>\s*<img[^>]*alt="Fotografia de ([^"]+)"/g
  const members: CommissionMember[] = []
  let m
  while ((m = memberRe.exec(html)) !== null) {
    const id = Number(m[1])
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    // Buscar cargo/grupo en los siguientes 800 chars
    const slice = html.slice(m.index, m.index + 1500)
    const cargoMatch = slice.match(/<p class="marg-0">\s*([^<]+?)\s*<\/p>/)
    const grupoMatch = slice.match(/<p class="marg-1">\s*([^<]+?)\s*<\/p>/)
    const cargo = cargoMatch ? cargoMatch[1].trim() : 'Vocal'
    const grupoRaw = grupoMatch ? grupoMatch[1].trim() : ''
    // Normalizar grupo: "Grup Parlamentari Socialistes…" → "PSC"
    const grupo = normalizeCatalanGroup(grupoRaw)
    if (members.some(mb => mb.id === id)) continue
    members.push({
      id, nombre, cargo, grupo,
      fechaAlta: '', fechaBaja: '',
      urlFicha: `https://www.parlament.cat/web/composicio/diputats-fitxa/index.html?p_codi=${id}`,
    })
  }

  const byGroup: Record<string, number> = {}
  for (const m of members) byGroup[m.grupo || '—'] = (byGroup[m.grupo || '—'] || 0) + 1

  return {
    codigo, fechaConstitucion: null, fechaDisolucion: null,
    members, byGroup, total: members.length, active: true,
  }
}

function normalizeCatalanGroup(s: string): string {
  const lower = s.toLowerCase()
  if (/socialistes/.test(lower)) return 'PSC'
  if (/junts/.test(lower)) return 'Junts'
  if (/esquerra|erc/.test(lower)) return 'ERC'
  if (/comuns/.test(lower)) return 'Comuns'
  if (/aliança/.test(lower) || /aliança catalana/.test(lower)) return 'AC'
  if (/vox/.test(lower)) return 'VOX'
  if (/popular|partit popular/.test(lower)) return 'PPC'
  if (/cup/.test(lower)) return 'CUP'
  if (/mixt/.test(lower)) return 'Mixt'
  return s.replace(/grup\s+parlamentari\s+/i, '').slice(0, 20)
}

// ─── 2. Eusko Legebiltzarra (País Vasco) ────────────────────────────────────
// HTML UTF-8 con tablas semánticas: td.miembro_persona, td.miembro_grupo, td.miembro_cargo
// Endpoint estable: /comorga/c_comorga_com_ACT_NN.html (01..20)
// Histórico: /comorga/c_comorga_com_LNN.html (L01..L12)

export async function listPaisVascoCommissions(): Promise<Commission[]> {
  const html = await fetchHtml('https://www.legebiltzarra.eus/comorga/c_comorga_com_ACT.html')
  if (!html) return []

  // Extraer enlaces a comisiones individuales
  const re = /href="c_comorga_com_ACT_(\d{2})\.html"[^>]*>\s*([^<]+?)\s*</g
  const seen = new Map<string, string>()
  let m
  while ((m = re.exec(html)) !== null) {
    const codigo = m[1]
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    if (nombre.length < 5) continue
    if (!seen.has(codigo)) seen.set(codigo, nombre)
  }

  const out: Commission[] = []
  for (const [codigo, nombre] of seen) {
    const isInvestigation = /ikerketa|investigaci/.test(nombre.toLowerCase())
    out.push({
      id: `ccaa-pais-vasco-${codigo}`,
      codigo,
      nombre,
      camara: 'autonomico',
      ccaa: 'pais-vasco',
      kind: isInvestigation ? 'investigacion' : 'permanente',
      active: true,
      isInvestigation,
      url: `https://www.legebiltzarra.eus/comorga/c_comorga_com_ACT_${codigo}.html`,
    })
  }
  return out
}

export async function fetchPaisVascoComposition(codigo: string): Promise<CommissionComposition | null> {
  const html = await fetchHtml(`https://www.legebiltzarra.eus/comorga/c_comorga_com_ACT_${codigo}.html`)
  if (!html) return null

  const memberRe = /<td class="miembro_persona"[^>]*>\s*<a[^>]+>([^<]+)<\/a><\/td>\s*<td class="miembro_grupo"[^>]*>\s*<a[^>]+>([^<]+)<\/a><\/td>\s*<td class="miembro_cargo"[^>]*>\s*\(([^)]+)\)\s*<\/td>/g
  const members: CommissionMember[] = []
  let m
  let i = 1
  while ((m = memberRe.exec(html)) !== null) {
    const nombre = m[1].replace(/\s+/g, ' ').trim()
    const grupoRaw = m[2].replace(/\s+/g, ' ').trim()
    const fechas = m[3].trim()  // formato: "28.06.2024 - " o "28.06.2024 - 15.02.2025"
    const [altaRaw, bajaRaw] = fechas.split('-').map(s => s.trim())
    members.push({
      id: i++,
      nombre,
      cargo: 'Vocal',  // País Vasco no marca cargo en la tabla
      grupo: normalizeBasqueGroup(grupoRaw),
      fechaAlta: altaRaw || '',
      fechaBaja: bajaRaw || '',
      urlFicha: '',
    })
  }

  // Detectar Presidente y Vicepresidentes desde <th class="nivelx">
  // y asignar al primer miembro siguiente
  const cargoRoleRe = /<th class="nivel\d+"[^>]*>([^<]+)<\/th>([\s\S]*?)<td class="miembro_persona"[^>]*>\s*<a[^>]+>([^<]+)<\/a>/g
  while ((m = cargoRoleRe.exec(html)) !== null) {
    const rol = m[1].trim()
    const nombre = m[3].replace(/\s+/g, ' ').trim()
    const member = members.find(mb => mb.nombre === nombre)
    if (member && rol.length > 0 && rol !== 'Vocal') member.cargo = rol
  }

  const byGroup: Record<string, number> = {}
  for (const mb of members) if (!mb.fechaBaja) byGroup[mb.grupo || '—'] = (byGroup[mb.grupo || '—'] || 0) + 1

  return {
    codigo, fechaConstitucion: null, fechaDisolucion: null,
    members: members.filter(mb => !mb.fechaBaja),
    byGroup,
    total: members.filter(mb => !mb.fechaBaja).length,
    active: true,
  }
}

function normalizeBasqueGroup(s: string): string {
  const t = s.toLowerCase()
  if (/eaj|pnv/.test(t)) return 'PNV'
  if (/sociali|psoe|socialistas/.test(t)) return 'PSE-EE'
  if (/eh bildu|bildu/.test(t)) return 'EH Bildu'
  if (/popular|pp/.test(t)) return 'PP'
  if (/elkarrekin|podem/.test(t)) return 'Elkarrekin'
  if (/vox/.test(t)) return 'VOX'
  if (/mixt/.test(t)) return 'Mixto'
  return s.slice(0, 15)
}

// ─── 3. Parlamento de Andalucía ─────────────────────────────────────────────
// HTML ISO-8859-1. Listado en /webdinamica/.../comisiones.do
// Detalle: ...comisiones.do?codorg=N&nlegis=12&modo=confoto

export async function listAndaluciaCommissions(): Promise<Commission[]> {
  const html = await fetchHtml(
    'https://www.parlamentodeandalucia.es/webdinamica/portal-web-parlamento/composicionyfuncionamiento/organosparlamentarios/comisiones.do',
    'iso-8859-1'
  )
  if (!html) return []

  const re = /codorg=(\d+)[^"]*"[^>]*>\s*([^<]+?)\s*</g
  const seen = new Map<string, string>()
  let m
  while ((m = re.exec(html)) !== null) {
    const codigo = m[1]
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    if (nombre.length < 5 || /vacante|—/.test(nombre.toLowerCase())) continue
    if (!seen.has(codigo) || seen.get(codigo)!.length < nombre.length) seen.set(codigo, nombre)
  }

  const out: Commission[] = []
  for (const [codigo, nombre] of seen) {
    const isInvestigation = /investigaci/.test(nombre.toLowerCase())
    out.push({
      id: `ccaa-andalucia-${codigo}`,
      codigo,
      nombre,
      camara: 'autonomico',
      ccaa: 'andalucia',
      kind: isInvestigation ? 'investigacion' : 'permanente',
      active: true,
      isInvestigation,
      url: `https://www.parlamentodeandalucia.es/webdinamica/portal-web-parlamento/composicionyfuncionamiento/organosparlamentarios/comisiones.do?codorg=${codigo}&nlegis=12&modo=confoto`,
    })
  }
  return out
}

export async function fetchAndaluciaComposition(codigo: string): Promise<CommissionComposition | null> {
  const html = await fetchHtml(
    `https://www.parlamentodeandalucia.es/webdinamica/portal-web-parlamento/composicionyfuncionamiento/organosparlamentarios/comisiones.do?codorg=${codigo}&nlegis=12&modo=confoto`,
    'iso-8859-1'
  )
  if (!html) return null

  const memberRe = /codmie=(\d+)[^"]*"\s*alt="Fotograf[íi]a de ([^"]+)"/g
  const members: CommissionMember[] = []
  let m
  while ((m = memberRe.exec(html)) !== null) {
    const id = Number(m[1])
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    // Cargo en card-text cercano
    const slice = html.slice(m.index, m.index + 1500)
    const cargoMatch = slice.match(/<p class="card-text"[^>]*>\s*([^<]+?)\s*</)
    const cargo = cargoMatch ? cargoMatch[1].trim() : 'Vocal'
    if (members.some(mb => mb.id === id)) continue
    members.push({
      id, nombre, cargo,
      grupo: '',  // Andalucía no lo muestra inline · habría que cruzar con ficha del diputado
      fechaAlta: '', fechaBaja: '',
      urlFicha: `https://www.parlamentodeandalucia.es/webdinamica/portal-web-parlamento/composicionyfuncionamiento/composicion/diputados/diputado.do?codmie=${id}&nlegis=12`,
    })
  }

  return {
    codigo, fechaConstitucion: null, fechaDisolucion: null,
    members, byGroup: { '—': members.length }, total: members.length, active: true,
  }
}

// ─── 4. Corts Valencianes ────────────────────────────────────────────────────

export async function listValencianasCommissions(): Promise<Commission[]> {
  const html = await fetchHtml('https://www.cortsvalencianes.es/es/composicion/organos/comisiones')
  if (!html) return []

  // Extraer enlaces a comisiones individuales: /es/composicion/organos/comisiones/xi/{slug}
  const re = /href="(\/es\/composicion\/organos\/comisiones\/xi\/([a-z0-9-]+))"[^>]*>\s*([^<]+?)\s*</gi
  const seen = new Map<string, { nombre: string; slug: string }>()
  let m
  while ((m = re.exec(html)) !== null) {
    const slug = m[2]
    const nombre = m[3].replace(/\s+/g, ' ').trim()
    if (slug === 'diputados' || nombre.length < 5) continue
    if (!seen.has(slug)) seen.set(slug, { nombre, slug })
  }

  const out: Commission[] = []
  for (const [slug, { nombre }] of seen) {
    const isInvestigation = /investigaci|dana/.test(nombre.toLowerCase())
    out.push({
      id: `ccaa-valenciana-${slug}`,
      codigo: slug,
      nombre,
      camara: 'autonomico',
      ccaa: 'valenciana',
      kind: isInvestigation ? 'investigacion' : 'permanente',
      active: true,
      isInvestigation,
      url: `https://www.cortsvalencianes.es/es/composicion/organos/comisiones/xi/${slug}`,
    })
  }
  return out
}

export async function fetchValencianasComposition(slug: string): Promise<CommissionComposition | null> {
  const html = await fetchHtml(`https://www.cortsvalencianes.es/es/composicion/organos/comisiones/xi/${slug}/diputados`)
  if (!html) return null

  // Patrón: <tr><td>ROL</td><td><img alt="Foto de NOMBRE"></td><td><a>NOMBRE</a></td><td><a ...gp=CODIGO>...
  const memberRe = /<tr[^>]*>\s*<td>([^<]+)<\/td>\s*<td>\s*<img[^>]*alt="Foto de ([^"]+)"/g
  const members: CommissionMember[] = []
  let m
  let i = 1
  while ((m = memberRe.exec(html)) !== null) {
    const cargo = m[1].replace(/\s+/g, ' ').trim()
    const nombre = m[2].replace(/\s+/g, ' ').trim()
    // Grupo en gp=CODIGO próximo
    const slice = html.slice(m.index, m.index + 2000)
    const grupoMatch = slice.match(/gp=([0-9A-Z]+)/)
    const grupo = normalizeValencianGroup(grupoMatch ? grupoMatch[1] : '')
    members.push({
      id: i++,
      nombre,
      cargo,
      grupo,
      fechaAlta: '', fechaBaja: '',
      urlFicha: '',
    })
  }

  const byGroup: Record<string, number> = {}
  for (const mb of members) byGroup[mb.grupo || '—'] = (byGroup[mb.grupo || '—'] || 0) + 1

  return {
    codigo: slug, fechaConstitucion: null, fechaDisolucion: null,
    members, byGroup, total: members.length, active: true,
  }
}

function normalizeValencianGroup(code: string): string {
  // Códigos típicos: 1P (PP), 1V (VOX), 2P (PSPV-PSOE), CM (Compromís)
  const map: Record<string, string> = {
    '1P': 'PP', '1V': 'VOX', '2P': 'PSPV', 'CM': 'Compromís',
    'MX': 'Mixto', 'PP': 'PP', 'VX': 'VOX', 'PS': 'PSPV',
  }
  return map[code] || code || '—'
}

// ─── 5. Galicia (via Wayback Machine) ───────────────────────────────────────

const WAYBACK_BASE = 'https://web.archive.org/web/2026/'

export async function listGaliciaCommissions(): Promise<Commission[]> {
  const html = await fetchHtml(`${WAYBACK_BASE}https://www.parlamentodegalicia.gal/Composicion`)
  if (!html) return []

  // Patrón Wayback prefix: /web/TIMESTAMP/...
  const re = /href="(?:https?:\/\/web\.archive\.org\/web\/\d+\/)?https:\/\/www\.parlamentodegalicia\.gal\/Composicion\/Organos\/(\d+)\/([a-z0-9-]+)"[^>]*>\s*([^<]+?)\s*</gi
  const seen = new Map<string, { nombre: string; slug: string }>()
  let m
  while ((m = re.exec(html)) !== null) {
    const codigo = m[1]
    const slug = m[2]
    const nombre = m[3].replace(/\s+/g, ' ').trim()
    if (nombre.length < 5) continue
    if (!seen.has(codigo)) seen.set(codigo, { nombre, slug })
  }

  const out: Commission[] = []
  for (const [codigo, { nombre, slug }] of seen) {
    const isInvestigation = /investigaci/.test(nombre.toLowerCase())
    out.push({
      id: `ccaa-galicia-${codigo}`,
      codigo: `${codigo}/${slug}`,
      nombre,
      camara: 'autonomico',
      ccaa: 'galicia',
      kind: isInvestigation ? 'investigacion' : 'permanente',
      active: true,
      isInvestigation,
      url: `${WAYBACK_BASE}https://www.parlamentodegalicia.gal/Composicion/Organos/${codigo}/${slug}`,
    })
  }
  return out
}

export async function fetchGaliciaComposition(codigoSlug: string): Promise<CommissionComposition | null> {
  const [codigo, slug] = codigoSlug.split('/')
  if (!codigo) return null
  const html = await fetchHtml(`${WAYBACK_BASE}https://www.parlamentodegalicia.gal/Composicion/Organos/${codigo}/${slug || 'comision'}`)
  if (!html) return null

  // Patrón tarjeta: href Deputados/ID/slug + nombre + grupos/X_50x50.png + rol
  const memberRe = /href="(?:https?:\/\/web\.archive\.org\/web\/\d+\/)?https?:\/\/www\.parlamentodegalicia\.gal\/Composicion\/Deputados\/(\d+)\/[^"]+"[^>]*>([\s\S]*?)<\/a>/g
  const members: CommissionMember[] = []
  let m
  while ((m = memberRe.exec(html)) !== null) {
    const id = Number(m[1])
    const block = m[2]
    const nombreMatch = block.match(/<span[^>]*>\s*([A-ZÁÉÍÓÚÑa-záéíóúñ,. ]{5,})\s*</)
    const grupoMatch = block.match(/grupos\/(\w+)_\d+x\d+\.png/)
    const cargoMatch = block.match(/<span[^>]+(?:bg-success|bg-info)[^>]*>\s*(\w+)\s*</)
    if (!nombreMatch) continue
    if (members.some(mb => mb.id === id)) continue
    members.push({
      id,
      nombre: nombreMatch[1].replace(/\s+/g, ' ').trim(),
      cargo: cargoMatch ? cargoMatch[1] : 'Vocal',
      grupo: grupoMatch ? grupoMatch[1] : '',
      fechaAlta: '', fechaBaja: '',
      urlFicha: '',
    })
  }

  const byGroup: Record<string, number> = {}
  for (const mb of members) byGroup[mb.grupo || '—'] = (byGroup[mb.grupo || '—'] || 0) + 1

  return {
    codigo: codigoSlug, fechaConstitucion: null, fechaDisolucion: null,
    members, byGroup, total: members.length, active: true,
  }
}

// ─── Agregador ──────────────────────────────────────────────────────────────

const CCAA_LISTERS: Record<string, () => Promise<Commission[]>> = {
  'cataluna': listCatalunyaCommissions,
  'pais-vasco': listPaisVascoCommissions,
  'andalucia': listAndaluciaCommissions,
  'valenciana': listValencianasCommissions,
  'galicia': listGaliciaCommissions,
}

interface Cache { ts: number; data: Commission[] }
let cache: Cache | null = null
const TTL = 6 * 60 * 60 * 1000 // 6h

export async function fetchAllCCAACommissions(): Promise<Commission[]> {
  if (cache && Date.now() - cache.ts < TTL) return cache.data

  const settled = await Promise.allSettled(Object.values(CCAA_LISTERS).map(fn => fn()))
  const all: Commission[] = []
  for (const r of settled) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }
  cache = { ts: Date.now(), data: all }
  return all
}

/** Devuelve composición real de cualquier comisión autonómica soportada */
export async function fetchCCAAComposition(
  ccaa: CCAA,
  codigo: string,
): Promise<CommissionComposition | null> {
  switch (ccaa) {
    case 'cataluna':    return fetchCatalunyaComposition(codigo)
    case 'pais-vasco':  return fetchPaisVascoComposition(codigo)
    case 'andalucia':   return fetchAndaluciaComposition(codigo)
    case 'valenciana':  return fetchValencianasComposition(codigo)
    case 'galicia':     return fetchGaliciaComposition(codigo)
    default: return null
  }
}
