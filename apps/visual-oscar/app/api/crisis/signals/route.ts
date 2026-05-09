import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ─── tipos ────────────────────────────────────────────────────────────────────
export type SignalType =
  | 'conflicto' | 'sismo' | 'ciberataque' | 'desinformacion'
  | 'parlamentario' | 'diplomatico' | 'social' | 'economico' | 'energia'

export type SignalSeverity = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'

export interface CrisisSignal {
  id: string
  tipo: SignalType
  titulo: string
  descripcion: string
  fuente: string
  severidad: SignalSeverity
  score: number           // 0-100
  lat?: number
  lon?: number
  pais?: string
  region?: string
  timestamp: string
  url?: string
  tags: string[]
}

// ─── helpers ──────────────────────────────────────────────────────────────────
async function safeFetch(url: string, timeoutMs = 7000): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Politeia/1.0 (intelligence collector)' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function scoreFromGdeltTone(tone: number): number {
  // tone is negative = bad. Range roughly -20..+20
  const normalized = Math.min(100, Math.max(0, 50 - tone * 2))
  return Math.round(normalized)
}

function severityFromScore(score: number): SignalSeverity {
  if (score >= 80) return 'CRITICO'
  if (score >= 60) return 'ALTO'
  if (score >= 40) return 'MEDIO'
  return 'BAJO'
}

// ─── GDELT 2.0 ────────────────────────────────────────────────────────────────
async function fetchGdelt(): Promise<CrisisSignal[]> {
  // GDELT Doc 2.0 — artículos sobre España últimas 24h
  const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=spain%20crisis%20OR%20spain%20conflict%20OR%20spain%20attack%20OR%20espa%C3%B1a%20crisis&mode=artlist&maxrecords=15&format=json&timespan=1440'
  const raw = await safeFetch(url, 9000)
  if (!raw) return []
  try {
    const json = JSON.parse(raw) as {
      articles?: Array<{ title: string; url: string; seendate: string; sourcecountry: string; language: string; tone: number }>
    }
    const articles = json.articles ?? []
    return articles.slice(0, 10).map((a, i) => {
      const score = scoreFromGdeltTone(a.tone ?? 0)
      const isSpanish = a.language === 'Spanish'
      const title = a.title?.slice(0, 120) ?? 'Sin título'
      return {
        id: `gdelt_${i}_${Date.now()}`,
        tipo: 'diplomatico' as SignalType,
        titulo: title,
        descripcion: `Fuente: ${a.sourcecountry ?? 'global'} · Tono: ${(a.tone ?? 0).toFixed(1)} · ${isSpanish ? 'ES' : a.language}`,
        fuente: 'GDELT 2.0',
        severidad: severityFromScore(score),
        score,
        pais: a.sourcecountry ?? 'global',
        timestamp: a.seendate ? new Date(
          a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
        ).toISOString() : new Date().toISOString(),
        url: a.url,
        tags: ['gdelt', 'internacional', score >= 60 ? 'urgente' : 'monitor'],
      }
    })
  } catch {
    return []
  }
}

// ─── GDELT GEO ────────────────────────────────────────────────────────────────
async function fetchGdeltGeo(): Promise<CrisisSignal[]> {
  // GDELT GEO 2.0 — eventos geolocalizados en España
  const url = 'https://api.gdeltproject.org/api/v2/geo/geo?query=spain&mode=pointdata&maxpoints=20&format=json&timespan=720'
  const raw = await safeFetch(url, 9000)
  if (!raw) return []
  try {
    const json = JSON.parse(raw) as {
      features?: Array<{ geometry?: { coordinates?: number[] }; properties?: { name?: string; shareimage?: string; tone?: number; numarts?: number; date?: string } }>
    }
    const features = json.features ?? []
    return features.slice(0, 8).map((f, i) => {
      const props = f.properties ?? {}
      const coords = f.geometry?.coordinates
      const score = scoreFromGdeltTone(props.tone ?? 0)
      return {
        id: `gdelt_geo_${i}`,
        tipo: 'conflicto' as SignalType,
        titulo: props.name?.slice(0, 100) ?? 'Evento geolocalizado',
        descripcion: `${props.numarts ?? 0} artículos · tono ${(props.tone ?? 0).toFixed(1)}`,
        fuente: 'GDELT GEO',
        severidad: severityFromScore(score),
        score,
        lat: coords?.[1],
        lon: coords?.[0],
        pais: 'España',
        timestamp: new Date().toISOString(),
        tags: ['gdelt', 'geo', 'españa'],
      }
    })
  } catch {
    return []
  }
}

// ─── INCIBE / CCN-CERT (RSS) ──────────────────────────────────────────────────
async function fetchIncibeCert(): Promise<CrisisSignal[]> {
  const feeds = [
    { nombre: 'INCIBE-CERT', url: 'https://www.incibe.es/incibe-cert/alerta-temprana/avisos/rss' },
    { nombre: 'CCN-CERT',    url: 'https://www.ccn-cert.cni.es/seguridad-al-dia/comunicados-ccn-cert.feed?type=rss' },
  ]
  const signals: CrisisSignal[] = []
  for (const feed of feeds) {
    const xml = await safeFetch(feed.url, 6000)
    if (!xml) continue
    const itemRe = /<item>([\s\S]*?)<\/item>/g
    let m: RegExpExecArray | null
    let count = 0
    while ((m = itemRe.exec(xml)) !== null && count < 4) {
      const block = m[1]
      const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1]?.trim()
      if (!title || title.length < 5) continue
      const link = block.match(/<link>(https?[^<]+)<\/link>/)?.[1]?.trim() ?? ''
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]
      const descRaw = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/))?.[1] ?? ''
      const desc = descRaw.replace(/<[^>]+>/g, ' ').trim().slice(0, 200)

      // Classify severity based on title keywords
      const titleUp = title.toUpperCase()
      let score = 50
      if (/CRÍTICA|CRÍTICO|CRITICAL/.test(titleUp)) score = 90
      else if (/ALTA|HIGH|IMPORTANTE/.test(titleUp)) score = 70
      else if (/MEDIA|MEDIUM/.test(titleUp)) score = 50
      else if (/BAJA|LOW/.test(titleUp)) score = 30

      signals.push({
        id: `incibe_${Buffer.from(title).toString('base64').slice(0, 8)}`,
        tipo: 'ciberataque',
        titulo: title.slice(0, 120),
        descripcion: desc || `Alerta de ${feed.nombre}`,
        fuente: feed.nombre,
        severidad: severityFromScore(score),
        score,
        pais: 'España',
        timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        url: link,
        tags: ['ciberseguridad', 'cert', 'españa'],
      })
      count++
    }
  }
  return signals
}

// ─── EMSC (sismos) ────────────────────────────────────────────────────────────
async function fetchEmsc(): Promise<CrisisSignal[]> {
  const url = 'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=8&minmagnitude=3.0&minlatitude=35.0&maxlatitude=44.5&minlongitude=-10.0&maxlongitude=5.0&orderby=time'
  const raw = await safeFetch(url, 6000)
  if (!raw) return []
  try {
    const json = JSON.parse(raw) as {
      features?: Array<{
        properties?: { mag?: number; place?: string; time?: number; flynn_region?: string }
        geometry?: { coordinates?: number[] }
      }>
    }
    const features = json.features ?? []
    return features.slice(0, 5).map((f, i) => {
      const p = f.properties ?? {}
      const coords = f.geometry?.coordinates ?? []
      const mag = p.mag ?? 3
      const score = Math.min(100, Math.round(mag * 12))
      return {
        id: `emsc_${i}_${p.time}`,
        tipo: 'social' as SignalType,
        titulo: `Sismo M${mag.toFixed(1)} — ${p.place ?? p.flynn_region ?? 'Península Ibérica'}`,
        descripcion: `Magnitud ${mag.toFixed(1)} · ${p.place ?? 'región'}`,
        fuente: 'EMSC (European-Mediterranean Seismological Centre)',
        severidad: severityFromScore(score),
        score,
        lat: coords[1],
        lon: coords[0],
        pais: 'España / Portugal',
        timestamp: p.time ? new Date(p.time).toISOString() : new Date().toISOString(),
        url: 'https://www.emsc-csem.org/Earthquake/',
        tags: ['sismo', 'ibérica', 'natural'],
      }
    })
  } catch {
    return []
  }
}

// ─── Google News España (crisis/seguridad) ─────────────────────────────────────
async function fetchGoogleNewsCrisis(): Promise<CrisisSignal[]> {
  const queries = [
    { q: 'crisis+espa%C3%B1a+seguridad', tag: 'seguridad' },
    { q: 'ciberataque+espa%C3%B1a', tag: 'ciberataque' },
    { q: 'emergencia+espa%C3%B1a', tag: 'emergencia' },
  ]
  const signals: CrisisSignal[] = []
  for (const { q, tag } of queries) {
    const url = `https://news.google.com/rss/search?q=${q}&hl=es&gl=ES&ceid=ES:es`
    const xml = await safeFetch(url, 6000)
    if (!xml) continue
    const itemRe = /<item>([\s\S]*?)<\/item>/g
    let m: RegExpExecArray | null
    let count = 0
    while ((m = itemRe.exec(xml)) !== null && count < 3) {
      const block = m[1]
      const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1]?.trim()
      if (!title || title.length < 10) continue
      const link = block.match(/<link>(https?[^<]+)<\/link>/)?.[1]?.trim() ?? ''
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]
      const descRaw = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/))?.[1] ?? ''
      const desc = descRaw.replace(/<[^>]+>/g, ' ').trim().slice(0, 180)

      let age = 0
      if (pubDate) { try { age = (Date.now() - new Date(pubDate).getTime()) / 3600000 } catch { age = 99 } }
      if (age > 12) { count++; continue }

      // Score based on age (fresh = higher) + keyword severity
      const ageScore = Math.max(0, (1 - age / 12)) * 50
      const keyScore = /ataque|hack|emergencia|crítico|grave/i.test(title) ? 30 : 10
      const score = Math.round(ageScore + keyScore + 20)

      const tipoMap: Record<string, SignalType> = {
        ciberataque: 'ciberataque', seguridad: 'diplomatico', emergencia: 'social',
      }

      signals.push({
        id: `gnews_${tag}_${Buffer.from(title).toString('base64').slice(0, 6)}`,
        tipo: tipoMap[tag] ?? 'social',
        titulo: title.slice(0, 120),
        descripcion: desc || title,
        fuente: 'Google Noticias ES',
        severidad: severityFromScore(score),
        score,
        pais: 'España',
        timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        url: link,
        tags: ['noticias', tag, 'españa'],
      })
      count++
    }
  }
  return signals
}

// ─── Wikipedia Recent Changes (vigilancia) ────────────────────────────────────
async function fetchWikiChanges(): Promise<CrisisSignal[]> {
  // Artículos de Wikipedia ES recientemente editados sobre política/crisis
  const url = 'https://es.wikipedia.org/w/api.php?action=query&list=recentchanges&rcnamespace=0&rclimit=30&rcprop=title|timestamp|user|comment&format=json&origin=*'
  const raw = await safeFetch(url, 6000)
  if (!raw) return []
  try {
    const json = JSON.parse(raw) as {
      query?: { recentchanges?: Array<{ title: string; timestamp: string; comment?: string }> }
    }
    const changes = json.query?.recentchanges ?? []
    const POLITICAL_KEYWORDS = /elección|gobierno|congreso|senado|partido|ministro|crisis|huelga|manifestación|corrupción|juicio|atentado|militar|policía|terrorismo|pandemia|accidente/i
    const relevant = changes.filter(c => POLITICAL_KEYWORDS.test(c.title + ' ' + (c.comment ?? '')))
    return relevant.slice(0, 5).map((c, i) => ({
      id: `wiki_${i}_${c.timestamp}`,
      tipo: 'parlamentario' as SignalType,
      titulo: `Wikipedia actualizada: ${c.title}`,
      descripcion: `Edición reciente detectada · ${c.comment?.slice(0, 100) ?? 'sin comentario'}`,
      fuente: 'Wikipedia ES (cambios recientes)',
      severidad: 'BAJO' as SignalSeverity,
      score: 25,
      pais: 'España',
      timestamp: c.timestamp,
      url: `https://es.wikipedia.org/wiki/${encodeURIComponent(c.title)}`,
      tags: ['wikipedia', 'política', 'monitor'],
    }))
  } catch {
    return []
  }
}

// ─── Congreso — actividad parlamentaria ──────────────────────────────────────
async function fetchCongresoActivity(): Promise<CrisisSignal[]> {
  // Votaciones recientes del Congreso
  const url = 'https://api.hacienda.gob.es/consultas-estado-ejecucion-presupuestaria/api/v1/expedientes?page=1&size=5'
  // Fallback: use RSS from Congreso
  const rssUrl = 'https://www.congreso.es/rss/cgbin/rss.py?id=10'
  const xml = await safeFetch(rssUrl, 6000)
  if (!xml) return []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  const signals: CrisisSignal[] = []
  let m: RegExpExecArray | null
  let count = 0
  while ((m = itemRe.exec(xml)) !== null && count < 4) {
    const block = m[1]
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1]?.trim()
    if (!title || title.length < 5) continue
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]
    const link = block.match(/<link>(https?[^<]+)<\/link>/)?.[1]?.trim() ?? ''
    signals.push({
      id: `congreso_${count}`,
      tipo: 'parlamentario',
      titulo: title.slice(0, 120),
      descripcion: 'Actividad del Congreso de los Diputados',
      fuente: 'Congreso de los Diputados',
      severidad: 'BAJO',
      score: 35,
      pais: 'España',
      lat: 40.417,
      lon: -3.694,
      timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      url: link,
      tags: ['congreso', 'parlamentario', 'oficial'],
    })
    count++
  }
  return signals
}

// ─── AGGREGATE ────────────────────────────────────────────────────────────────
export async function GET() {
  const [gdelt, gdeltGeo, incibe, emsc, gnews, wiki, congreso] = await Promise.allSettled([
    fetchGdelt(),
    fetchGdeltGeo(),
    fetchIncibeCert(),
    fetchEmsc(),
    fetchGoogleNewsCrisis(),
    fetchWikiChanges(),
    fetchCongresoActivity(),
  ])

  const all: CrisisSignal[] = [
    ...(gdelt.status === 'fulfilled' ? gdelt.value : []),
    ...(gdeltGeo.status === 'fulfilled' ? gdeltGeo.value : []),
    ...(incibe.status === 'fulfilled' ? incibe.value : []),
    ...(emsc.status === 'fulfilled' ? emsc.value : []),
    ...(gnews.status === 'fulfilled' ? gnews.value : []),
    ...(wiki.status === 'fulfilled' ? wiki.value : []),
    ...(congreso.status === 'fulfilled' ? congreso.value : []),
  ]

  // Deduplicate by title similarity
  const seen = new Set<string>()
  const deduped = all.filter(s => {
    const key = s.titulo.toLowerCase().slice(0, 50)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by score DESC
  deduped.sort((a, b) => b.score - a.score)

  // Stats
  const stats = {
    total: deduped.length,
    criticos: deduped.filter(s => s.severidad === 'CRITICO').length,
    altos: deduped.filter(s => s.severidad === 'ALTO').length,
    por_tipo: Object.fromEntries(
      ['conflicto', 'ciberataque', 'desinformacion', 'parlamentario', 'diplomatico', 'social', 'economico', 'sismo', 'energia'].map(t => [
        t, deduped.filter(s => s.tipo === t).length,
      ])
    ),
    fuentes_activas: new Set(deduped.map(s => s.fuente)).size,
  }

  if (deduped.length > 0) {
    return NextResponse.json({ signals: deduped.slice(0, 50), stats, source: 'real', timestamp: new Date().toISOString() })
  }

  // Fallback mock
  const mock: CrisisSignal[] = [
    { id:'m1', tipo:'ciberataque', titulo:'Alerta INCIBE: vulnerabilidad crítica en infraestructura bancaria española', descripcion:'CCN-CERT emite aviso de nivel alto sobre exploit activo en sistemas de autenticación de banca en línea.', fuente:'INCIBE-CERT', severidad:'CRITICO', score:88, pais:'España', lat:40.4, lon:-3.7, timestamp:new Date().toISOString(), tags:['ciberseguridad', 'banca', 'crítico'] },
    { id:'m2', tipo:'diplomatico', titulo:'GDELT detecta 847 artículos negativos sobre España en 6h', descripcion:'Clúster de cobertura internacional negativa vinculado a tensiones migratorias en Canarias.', fuente:'GDELT 2.0', severidad:'ALTO', score:72, pais:'Internacional', timestamp:new Date().toISOString(), tags:['gdelt', 'migracion', 'internacional'] },
    { id:'m3', tipo:'social', titulo:'Sismo M3.8 — Mar de Alborán', descripcion:'Magnitud 3.8 · profundidad 12 km · sin daños reportados.', fuente:'EMSC', severidad:'MEDIO', score:46, lat:36.1, lon:-2.8, pais:'España', timestamp:new Date().toISOString(), tags:['sismo', 'alborán'] },
    { id:'m4', tipo:'parlamentario', titulo:'Congreso: votación decreto-ley convalidación mañana', descripcion:'Sesión plenaria programada. Margen estimado: ±2 escaños.', fuente:'Congreso de los Diputados', severidad:'ALTO', score:65, pais:'España', lat:40.417, lon:-3.694, timestamp:new Date().toISOString(), tags:['congreso', 'votación'] },
    { id:'m5', tipo:'desinformacion', titulo:'Campaña de desinformación sobre reforma educativa detectada', descripcion:'Google News detecta 3 narrativas falsas sobre la nueva ley educativa en redes sociales.', fuente:'Google Noticias ES', severidad:'MEDIO', score:50, pais:'España', timestamp:new Date().toISOString(), tags:['desinformacion', 'educacion'] },
  ]
  return NextResponse.json({ signals: mock, stats: { total: mock.length, criticos: 1, altos: 2, por_tipo: {}, fuentes_activas: 4 }, source: 'mock', timestamp: new Date().toISOString() })
}
