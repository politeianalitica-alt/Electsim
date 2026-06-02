'use client'
/**
 * <LoadFactorChart /> · Sprint Energía S5
 *
 * Factor de carga (capacity factor) por tecnología renovable:
 *
 *     factor_carga = generación media (MW) / capacidad instalada (MW)
 *
 * - Generación media real: ESIOS (`/api/esios/mix` · campo `avg_24h_mw` por
 *   tecnología, media de las últimas 24 h). Datos cada 10 min agregados a hora.
 * - Capacidad instalada: catálogo curado `CAPACIDAD_RENOVABLE_ES` (REE/MITECO).
 *
 * El cálculo puro vive en `lib/energia/renovables-calc.ts` (testeable). Aquí
 * solo mapeamos catálogo↔ESIOS, hacemos fetch y pintamos barras horizontales.
 *
 * Empty-state honesto: si ESIOS_API_KEY no está o no llega `avg_24h_mw`, la
 * fila muestra "—" en lugar de inventar un factor (CLAUDE.md). Cero emojis.
 */
import { useEffect, useState } from 'react'
import { CAPACIDAD_RENOVABLE_ES } from '@/lib/energia/catalog'
import { computeLoadFactor } from '@/lib/energia/renovables-calc'
import { ESIOS_TECH_COLORS } from '@/lib/esios/catalog'

const ACCENT = '#16A34A'

// Respuesta /api/esios/mix (subset usado aquí).
interface MixTech {
  slug: string
  ok: boolean
  short: string
  now_mw: number | null
  avg_24h_mw: number | null
}
interface EsiosMixResp {
  ok: boolean
  error?: string
  tech: Record<string, MixTech>
}

/**
 * Mapa tecnología de catálogo → slug ESIOS de generación. Las tecnologías
 * del catálogo se nombran en español largo; ESIOS usa slugs `gen_*`. Biomasa y
 * residuos renovables del catálogo se aproximan con `gen_biomasa` (ESIOS no
 * separa "biogás" aparte; residuos renovables tienen peso menor).
 */
const CAT_TO_ESIOS: Record<string, string> = {
  'Eólica': 'gen_eolica',
  'Solar fotovoltaica': 'gen_solar_fv',
  'Hidráulica': 'gen_hidraulica',
  'Solar térmica (CSP)': 'gen_solar_termica',
  'Biomasa, biogás y residuos renovables': 'gen_biomasa',
}

interface Row {
  tecnologia: string
  capacidad_mw: number
  esios_slug: string | null
  color: string
  gen_media_mw: number | null
  factor_pct: number | null
}

export default function LoadFactorChart() {
  const [mix, setMix] = useState<EsiosMixResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/esios/mix', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<EsiosMixResp>) : null))
      .then((j) => { if (alive) { setMix(j); setLoading(false) } })
      .catch(() => { if (alive) { setMix(null); setLoading(false) } })
    return () => { alive = false }
  }, [])

  const rows: Row[] = CAPACIDAD_RENOVABLE_ES.map((c) => {
    const slug = CAT_TO_ESIOS[c.tecnologia] ?? null
    const tech = slug ? mix?.tech?.[slug] : undefined
    // Preferimos media 24h; si no, el valor instantáneo; si nada, null.
    const genMedia = tech ? (tech.avg_24h_mw ?? tech.now_mw ?? null) : null
    const lf = computeLoadFactor(genMedia, c.capacidad_mw)
    return {
      tecnologia: c.tecnologia,
      capacidad_mw: c.capacidad_mw,
      esios_slug: slug,
      color: (slug && ESIOS_TECH_COLORS[slug]) || ACCENT,
      gen_media_mw: genMedia,
      factor_pct: lf.factor_pct,
    }
  })

  // Orden descendente por factor (los null al final).
  const sorted = [...rows].sort((a, b) => (b.factor_pct ?? -1) - (a.factor_pct ?? -1))
  const noKey = mix && mix.ok === false && /no_key|ESIOS_API_KEY/i.test(mix.error || '')

  return (
    <div>
      {noKey ? (
        <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5, padding: '4px 0 8px' }}>
          Generación real no disponible (ESIOS_API_KEY no configurada). Se muestran las capacidades
          instaladas del catálogo, pero el factor de carga requiere datos de generación en vivo.
        </div>
      ) : null}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((r) => {
          const pct = r.factor_pct
          // Escala visual: 60 % de factor llena la barra (ningún renovable medio supera ~55 %).
          const widthPct = pct == null ? 0 : Math.min(100, (pct / 60) * 100)
          return (
            <li key={r.tecnologia}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#3a3a3d', fontWeight: 600 }}>
                  <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                  {r.tecnologia}
                </span>
                <span style={{ fontSize: 12.5, fontFamily: 'var(--font-display)', fontWeight: 700, color: pct == null ? '#C0C0C5' : '#1d1d1f' }}>
                  {pct == null ? '—' : `${pct.toFixed(1)}%`}
                </span>
              </div>
              <div style={{ height: 8, background: '#F5F5F7', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  title={
                    pct == null
                      ? `${r.tecnologia} · factor de carga no disponible`
                      : `${r.tecnologia}: ${pct.toFixed(1)}% · ${Math.round(r.gen_media_mw ?? 0).toLocaleString('es-ES')} MW medios / ${r.capacidad_mw.toLocaleString('es-ES')} MW instalados`
                  }
                  style={{ width: `${widthPct}%`, height: '100%', background: r.color, transition: 'width 250ms ease' }}
                />
              </div>
              <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 3 }}>
                {r.gen_media_mw != null
                  ? `${Math.round(r.gen_media_mw).toLocaleString('es-ES')} MW medios (24h) · ${(r.capacidad_mw / 1000).toFixed(1)} GW instalados`
                  : `${(r.capacidad_mw / 1000).toFixed(1)} GW instalados · generación pendiente`}
              </div>
            </li>
          )
        })}
      </ul>

      {loading && (
        <div style={{ marginTop: 10, fontSize: 11, color: '#86868b' }}>Cargando generación ESIOS…</div>
      )}

      <div style={{ marginTop: 12, fontSize: 9.5, color: '#86868b', lineHeight: 1.5 }}>
        Factor de carga = generación media (últimas 24 h) / potencia instalada. Generación:{' '}
        <a href="https://www.esios.ree.es/" target="_blank" rel="noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          ESIOS · REE
        </a>
        . Capacidad: REE / MITECO (catálogo ~2024). La barra se llena al 60 %.
      </div>
    </div>
  )
}
