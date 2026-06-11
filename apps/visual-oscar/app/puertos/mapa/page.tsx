'use client'
/**
 * /puertos/mapa · Mapa del sector marítimo.
 *
 * Reutiliza el MAPA CENTRAL de Politeia sin arrastrar el chrome pesado de
 * <OsirisDashboard /> (MapLibre + capas + paneles). En su lugar monta el
 * mapa SVG ligero <WorldShippingMap /> (react-simple-maps, sin token)
 * alimentado con los datos vivos del MISMO endpoint que usa el mapa central:
 * `/api/osiris/maritime` (puertos + buques AIS en vivo + chokepoints).
 *
 * Para el mapa central completo —con TODAS las capas (MapLibre, anclajes,
 * dark-fleet, geofences, capas geopolíticas…)— hay un CTA explícito a
 * /osint-global (la ruta "Mapa Politeia" de la navegación).
 *
 * Degradación honesta: si el endpoint falla o no hay AIS (las IP de
 * datacenter de Vercel no reciben el stream global), caemos a los puertos
 * seed embebidos (PORTS_SEED) y mostramos 0 buques en vivo con un aviso, sin
 * inventar posiciones. Marca portuaria teal ACCENT '#0e7490'. Cero emojis.
 */
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import MaritimoShell from '../_components/MaritimoShell'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { WorldShippingMap } from '@/components/ports/WorldShippingMap'
import { PORTS_SEED } from '@/lib/ports-seed'

/** Teal portuario · marca del sector marítimo. */
const ACCENT = '#0e7490'

/** Endpoint vivo (mismo que alimenta el mapa central de Politeia). */
const MARITIME_URL = '/api/osiris/maritime'

// ── Shapes mínimas del payload de /api/osiris/maritime ──────────────────────
interface OsirisPort {
  name: string
  country?: string
  lat: number
  lng: number
  type?: string
}
interface OsirisShip {
  id?: number
  mmsi?: number
  name?: string
  lat: number
  lng: number
  type?: string
}
interface MaritimePayload {
  ports?: OsirisPort[]
  ships?: OsirisShip[]
  chokepoints?: Array<{ name: string }>
  total_ports?: number
  total_ships?: number
  total_chokepoints?: number
  ships_source?: string
  timestamp?: string
}

/** Tipos canónicos del WorldShippingMap (catalog.py:PORT_TYPES). El endpoint
 *  osiris usa otra taxonomía (container/energy/naval/port) → la mapeamos. */
function normalizePortType(t?: string): string {
  switch (t) {
    case 'container': return 'container'
    case 'energy':    return 'energy'
    case 'naval':     return 'multipurpose'
    case 'port':      return 'multipurpose'
    default:          return 'multipurpose'
  }
}

export default function PuertosMapaPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [payload, setPayload] = useState<MaritimePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)

  // Carga viva del endpoint maritime + refresh cada 30s (el endpoint cachea
  // ~20s, así que cada poll es barato). Degrada a seeds si falla.
  useEffect(() => {
    let cancel = false
    const load = async () => {
      try {
        const r = await fetch(MARITIME_URL, { cache: 'no-store' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j: MaritimePayload = await r.json()
        if (cancel) return
        setPayload(j)
        setError(null)
        setFetchedAt(j.timestamp ?? new Date().toISOString())
      } catch (e: any) {
        if (cancel) return
        setError(String(e?.message ?? e))
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => {
      cancel = true
      clearInterval(id)
    }
  }, [])

  // Puertos para el mapa · vivos si llegan, si no los seed embebidos.
  const mapPorts = useMemo(() => {
    const live = payload?.ports ?? []
    if (live.length > 0) {
      return live.map((p, i) => ({
        slug: `osiris-${i}`,
        name: p.name,
        lat: p.lat,
        lon: p.lng,
        type: normalizePortType(p.type),
        country_iso: p.country ?? '',
      }))
    }
    // Fallback honesto: catálogo seed (sin posiciones inventadas de buques).
    return (PORTS_SEED as Array<any>).map((p) => ({
      slug: p.slug,
      name: p.name,
      lat: p.lat,
      lon: p.lon,
      type: p.type,
      country_iso: p.country_iso,
    }))
  }, [payload])

  // Buques en vivo (AIS). NUNCA sintetizamos posiciones: si no hay, 0 buques.
  const mapVessels = useMemo(() => {
    const ships = payload?.ships ?? []
    const ts = fetchedAt ?? new Date().toISOString()
    return ships
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
      .map((s) => ({
        imo: String(s.mmsi ?? s.id ?? ''),
        name: s.name,
        ts,
        lat: s.lat,
        lon: s.lng,
        is_synthetic: false as const,
      }))
  }, [payload, fetchedAt])

  const usingSeed = (payload?.ports?.length ?? 0) === 0
  const nVessels = payload?.total_ships ?? mapVessels.length
  const nPorts = payload?.total_ports ?? mapPorts.length
  const nChokepoints = payload?.total_chokepoints ?? (payload?.chokepoints?.length ?? 0)
  const live = !usingSeed && nVessels > 0

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis: Array<{ glyph: string; label: string; value: string; tone?: 'live' | 'warn' }> = [
    {
      glyph: '⛴\uFE0E',
      label: 'Buques en vivo (AIS)',
      value: loading && !payload ? '…' : nVessels.toLocaleString('es-ES'),
      tone: live ? 'live' : 'warn',
    },
    {
      glyph: '⚓\uFE0E',
      label: 'Puertos en mapa',
      value: loading && !payload ? '…' : nPorts.toLocaleString('es-ES'),
    },
    {
      glyph: '◈',
      label: 'Corredores críticos',
      value: loading && !payload ? '…' : nChokepoints.toLocaleString('es-ES'),
    },
    {
      glyph: '◉',
      label: 'Estado del feed',
      value: usingSeed ? 'Seed' : live ? 'LIVE' : 'Cache',
      tone: live ? 'live' : 'warn',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <MaritimoShell subtitle="Mapa marítimo mundial · puertos críticos y buques AIS en vivo, alimentado por el mismo feed que el mapa central de Politeia." />

      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '20px 28px 40px' }}>
        {/* ── Cabecera + CTA al mapa central completo ─────────────────────── */}
        <header
          style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 14, marginBottom: 18,
          }}
        >
          <div>
            <p style={{ fontSize: 11, letterSpacing: 1.2, color: ACCENT, fontWeight: 700, margin: 0 }}>
              MAPA · PUERTOS · BUQUES AIS · CHOKEPOINTS
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
              Mapa marítimo mundial
            </h1>
          </div>
          <Link
            href="/osint-global"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', fontSize: 13, fontWeight: 700,
              color: '#fff', background: ACCENT, borderRadius: 8,
              textDecoration: 'none', whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(14,116,144,0.25)',
            }}
            title="Mapa central completo · MapLibre con todas las capas (anclajes, dark fleet, geofences, capas geopolíticas)"
          >
            Abrir Mapa Politeia completo
            <span aria-hidden="true" style={{ fontSize: 15 }}>⟶</span>
          </Link>
        </header>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12, marginBottom: 16,
          }}
        >
          {kpis.map((k) => {
            const accent = k.tone === 'live' ? '#16a34a' : k.tone === 'warn' ? '#b45309' : ACCENT
            return (
              <div
                key={k.label}
                style={{
                  background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
                  padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 20, lineHeight: 1, color: accent,
                    width: 34, height: 34, borderRadius: 9,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: k.tone === 'live' ? '#ecfdf5' : k.tone === 'warn' ? '#fffbeb' : '#ecfeff',
                  }}
                >
                  {k.glyph}
                </span>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                    {k.value}
                  </div>
                  <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>{k.label}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Aviso de degradación honesta ─────────────────────────────────── */}
        {(usingSeed || error) && (
          <div
            style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
              padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e',
            }}
          >
            {error
              ? `Feed marítimo no disponible (${error}). `
              : 'Sin buques AIS en vivo desde el servidor (las IP de datacenter de Vercel no reciben el stream global; el mapa central de Politeia los recibe en el navegador). '}
            Mostrando el catálogo de puertos seed sin posiciones de buques inventadas. Para el feed completo en vivo, abre el mapa central.
          </div>
        )}

        {/* ── Mapa mundial (ligero, SVG) ───────────────────────────────────── */}
        <Panel
          title="Tráfico marítimo global"
          subtitle={
            usingSeed
              ? 'Puertos seed · sin AIS en vivo'
              : `${nVessels.toLocaleString('es-ES')} buques · ${nPorts.toLocaleString('es-ES')} puertos${
                  fetchedAt ? ` · act. ${new Date(fetchedAt).toLocaleTimeString('es-ES')}` : ''
                }`
          }
          sourceUrl="/osint-global"
          sourceLabel="Mapa Politeia"
          sourceTooltip="Abrir el mapa central completo con todas las capas (MapLibre)"
        >
          <WorldShippingMap ports={mapPorts as any} vessels={mapVessels as any} height={560} />

          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, marginBottom: 0 }}>
            Este es el mapa ligero del módulo. El mapa central de Politeia (MapLibre)
            con todas las capas vivas —anclajes, dark fleet, geofences y capas
            geopolíticas— está en{' '}
            <Link href="/osint-global" style={{ color: ACCENT, fontWeight: 600 }}>
              /osint-global
            </Link>
            .
          </p>
        </Panel>
      </div>
    </div>
  )
}
