'use client'
/**
 * <TSGlobalTerritorioSnapshot /> · Tercer Sector v3 · cockpit · Visión Global (W2)
 *
 * SNAPSHOT TERRITORIAL del cuadro ejecutivo: top-5 CCAA del tercer sector por
 * actividad (entidades + financiación reciente + oportunidades abiertas), con el
 * nº de CCAA que disparan alerta de hueco. Da el titular geográfico; el detalle
 * por comunidad (rankings de compradores/beneficiarios, mapa, alertas concretas)
 * vive en la pestaña «Contexto e impacto» y NO se replica aquí.
 *
 * Sobre el reuso de <TerritorioPanel />: el spec prefiere reusar el panel del
 * agente de Contexto con `compact`. Ese componente se crea EN PARALELO, así que
 * para que esta entrega compile de forma independiente (sin acoplarme a una API
 * que aún no existe) se implementa el mini-snapshot propio que el spec admite
 * como alternativa: consume el MISMO endpoint canónico (`/api/tercer-sector/
 * territorio`) y muestra el top-5. Una sola fuente de verdad, sin duplicar datos.
 *
 * HACE SU PROPIO FETCH (1 endpoint) con `cache: 'no-store'`. Reutiliza el cromo
 * de <SnapshotCard /> (cabecera + «ver detalle →» a Contexto). Degradación
 * honesta: envelope no ok / vacío → nota; importes null → '—'. Cero emojis.
 */
import { useEffect, useState } from 'react'
import type { TercerSectorTab } from './TercerSectorShell'
import type { TerritorioTS } from '@/lib/tercer-sector/territorio'
import { SnapshotCard, fmtEur, fmtInt } from './TSGlobalShared'

const REFRESH_MS = 60 * 60 * 1000

interface TerritorioEnvelope {
  ok: boolean
  data: {
    territorios?: TerritorioTS[]
    total_ccaa?: number
    resumen?: {
      total_entidades?: number
      ccaa_con_alertas?: number
      total_alertas?: number
    }
  } | null
  error?: string | null
}

/**
 * Score de actividad para ordenar CCAA (combina presencia + flujo de dinero +
 * oportunidades activas). NO inventa importes: solo pondera contadores reales y
 * trata los importes desconocidos como 0 a efectos de ranking (sin mostrarlos
 * como cifra). Devuelve un número adimensional solo para ordenar.
 */
function actividadScore(t: TerritorioTS): number {
  const subv = t.subvenciones_eur ?? 0
  const lic = t.licitaciones_valor_eur ?? 0
  return (
    t.entidades * 3 +
    t.convocatorias_abiertas * 4 +
    t.concesiones * 2 +
    t.licitaciones * 2 +
    (subv + lic) / 1_000_000
  )
}

export function TSGlobalTerritorioSnapshot({
  onNavigate,
}: {
  onNavigate: (tab: TercerSectorTab) => void
}) {
  const [env, setEnv] = useState<TerritorioEnvelope | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancel = false
    const run = async () => {
      const t = await fetch('/api/tercer-sector/territorio', { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<TerritorioEnvelope>) : null))
        .catch(() => null)
      if (cancel) return
      setEnv(t)
      setLoaded(true)
    }
    run()
    const id = setInterval(run, REFRESH_MS)
    return () => {
      cancel = true
      clearInterval(id)
    }
  }, [])

  const data = env?.ok ? env.data : null
  const territorios = data?.territorios ?? []
  const resumen = data?.resumen ?? {}
  const top5 = [...territorios].sort((a, b) => actividadScore(b) - actividadScore(a)).slice(0, 5)
  const maxEntidades = Math.max(1, ...top5.map((t) => t.entidades))

  const degradedNote =
    loaded && (env == null || !env.ok || territorios.length === 0)
      ? env?.error
        ? `Foto territorial no disponible · ${env.error}`
        : 'Foto territorial no disponible ahora mismo (catálogo + BDNS + PLACE). Reintenta más tarde.'
      : null

  const subtitle =
    territorios.length > 0
      ? `${(resumen.total_entidades ?? 0).toLocaleString('es-ES')} entidades · ${(data?.total_ccaa ?? territorios.length).toLocaleString('es-ES')} CCAA`
      : 'Presencia · financiación · oportunidades por CCAA'

  return (
    <SnapshotCard
      title="Snapshot territorial"
      subtitle={subtitle}
      sourceLabel="Catálogo + BDNS"
      sourceUrl="https://www.infosubvenciones.es/"
      detalleTab="contexto"
      detalleLabel="Ver territorio a fondo"
      onNavigate={onNavigate}
      loading={!loaded}
      degradedNote={degradedNote}
    >
      {top5.length > 0 && (
        <>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {top5.map((t) => {
              const pct = Math.round((t.entidades / maxEntidades) * 100)
              const tieneAlerta = (t.alertas?.length ?? 0) > 0
              return (
                <li key={t.ccaa}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', marginBottom: 3 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                      title={t.ccaa_nombre}
                    >
                      {tieneAlerta && (
                        <span
                          aria-hidden="true"
                          title="Alerta de hueco en esta CCAA"
                          style={{ color: '#DC2626', fontWeight: 800, fontSize: 11 }}
                        >
                          !
                        </span>
                      )}
                      {t.ccaa_nombre}
                    </span>
                    <span style={{ fontSize: 10.5, color: '#475569', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtInt(t.entidades)} ent. · {fmtInt(t.convocatorias_abiertas)} convoc.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, height: 7, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                      <span
                        style={{
                          display: 'block',
                          width: `${pct}%`,
                          height: '100%',
                          background: tieneAlerta ? '#F59E0B' : '#16A34A',
                          borderRadius: 999,
                        }}
                      />
                    </span>
                    <span style={{ flex: '0 0 auto', fontSize: 9.5, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                      {t.subvenciones_eur != null ? fmtEur(t.subvenciones_eur) : '—'}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>

          {(resumen.ccaa_con_alertas ?? 0) > 0 && (
            <p
              style={{
                fontSize: 10.5,
                color: '#B45309',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: 8,
                padding: '6px 9px',
                margin: '12px 0 0',
                lineHeight: 1.4,
              }}
            >
              ! {resumen.ccaa_con_alertas} CCAA con alerta de hueco
              {resumen.total_alertas != null ? ` · ${resumen.total_alertas} señales en total` : ''} (oferta y demanda desalineadas).
            </p>
          )}
        </>
      )}
    </SnapshotCard>
  )
}

export default TSGlobalTerritorioSnapshot
