'use client'
/**
 * <TSGlobalAlertasAnalista /> · Tercer Sector v3 · cockpit · Visión Global (W2)
 *
 * FILA SUPERIOR de 4 tarjetas de ALERTA ACCIONABLE del cuadro ejecutivo. Es lo
 * primero que ve el analista: titulares + un gesto («ver detalle →») que conmuta
 * de pestaña dentro del shell (mismo `?ts=`, sin recargar). No replica el detalle
 * (vive en sus pestañas); aquí solo el veredicto operativo de hoy.
 *
 * Las 4 tarjetas (todas en VIVO, degradación honesta):
 *   1. «Oportunidades de alta prioridad» — consume
 *      `/api/tercer-sector/oportunidades?scoreMin=55&pageSize=5`: nº total +
 *      top-3 (título + plazo). Enlaza a «Financiación» / «Licitaciones».
 *   2. «Territorios calientes» — de `/api/tercer-sector/territorio`: top CCAA por
 *      oportunidades abiertas (convocatorias) + nº de alertas de hueco. → «Contexto».
 *   3. «Financiadores más activos» — de oportunidades, top organismo por nº.
 *   4. «Riesgo de concentración / dependencia pública» — señal SINTÉTICA derivada
 *      del reparto por fuente de las oportunidades (¿muchas de pocas fuentes?,
 *      ¿peso de BDNS?), con una línea de lectura. Sin inventar cifras.
 *
 * HACE SU PROPIO FETCH (2 endpoints) en `useEffect` con `cache: 'no-store'`, para
 * no ensanchar el Promise.all de la vista madre con datos que solo usa esta fila.
 * Degradación honesta: envelope no ok / vacío → '—' + nota; nunca datos inventados.
 * Cero emojis · Unicode geométrico (CLAUDE.md §0.5).
 */
import { useEffect, useState } from 'react'
import type { TercerSectorTab } from './TercerSectorShell'
import type { OportunidadesResponse } from '@/lib/tercer-sector/oportunidades/types'
import type { TerritorioTS } from '@/lib/tercer-sector/territorio'
import { TS_ACCENT_DARK } from './TSGlobalShared'

const REFRESH_MS = 60 * 60 * 1000

// ── Envelopes (shape mínimo consumido) ────────────────────────────────────
interface OportunidadesEnvelope {
  ok: boolean
  data: OportunidadesResponse | null
  error?: string | null
}
interface TerritorioResumen {
  total_entidades?: number
  total_concesiones?: number
  total_convocatorias?: number
  total_licitaciones?: number
  total_alertas?: number
  ccaa_con_alertas?: number
}
interface TerritorioEnvelope {
  ok: boolean
  data: {
    territorios?: TerritorioTS[]
    resumen?: TerritorioResumen
    fuentes_error?: { fuente: string; error: string }[]
  } | null
  error?: string | null
}

/** Etiqueta legible de fuente para «Financiadores más activos». */
const FUENTE_LABEL: Record<string, string> = {
  'bdns-convocatorias': 'BDNS (subvenciones)',
  bdns: 'BDNS',
  place: 'PLACE (Estado ES)',
  ted: 'TED (UE)',
  sedia: 'SEDIA (grants UE)',
  worldbank: 'World Bank',
}

function fechaCorta(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

/** Texto de plazo legible a partir de días restantes / fecha límite. */
function plazoTexto(dias: number | null, fechaLimite: string | null): string {
  if (dias != null && Number.isFinite(dias)) {
    if (dias < 0) return 'vencida'
    if (dias === 0) return 'cierra hoy'
    return `${dias} d`
  }
  return fechaCorta(fechaLimite) ?? 'sin plazo'
}

// ── Tarjeta genérica de alerta (número grande + líneas + «ver detalle →») ──
function AlertCard({
  eyebrow,
  glyph,
  bigValue,
  bigUnit,
  bigColor,
  children,
  detalleLabel,
  onClick,
  note,
  loading,
}: {
  eyebrow: string
  glyph: string
  bigValue: string
  bigUnit?: string
  bigColor: string
  children?: React.ReactNode
  detalleLabel: string
  onClick: () => void
  note?: string | null
  loading?: boolean
}) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ fontSize: 13, color: bigColor, opacity: 0.9 }}>
          {glyph}
        </span>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#64748B',
            lineHeight: 1.2,
          }}
        >
          {eyebrow}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: loading ? '#CBD5E1' : bigColor,
            lineHeight: 1,
          }}
        >
          {loading ? '·' : bigValue}
        </span>
        {bigUnit && !loading && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>{bigUnit}</span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0 }}>Cargando…</p>
        ) : (
          children
        )}
      </div>

      {note && !loading && (
        <p
          style={{
            fontSize: 10,
            color: '#B45309',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 8,
            padding: '5px 8px',
            margin: '8px 0 0',
            lineHeight: 1.35,
          }}
        >
          {note}
        </p>
      )}

      <footer style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #F1F5F9', textAlign: 'right' }}>
        <button
          type="button"
          onClick={onClick}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 11,
            fontWeight: 700,
            color: TS_ACCENT_DARK,
            letterSpacing: '0.01em',
            padding: 0,
          }}
        >
          {detalleLabel} <span aria-hidden="true">→</span>
        </button>
      </footer>
    </section>
  )
}

export function TSGlobalAlertasAnalista({
  onNavigate,
}: {
  onNavigate: (tab: TercerSectorTab) => void
}) {
  const [oport, setOport] = useState<OportunidadesEnvelope | null>(null)
  const [territorio, setTerritorio] = useState<TerritorioEnvelope | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancel = false
    const run = async () => {
      const [o, t] = await Promise.all([
        fetch('/api/tercer-sector/oportunidades?scoreMin=55&pageSize=5', { cache: 'no-store' })
          .then((r) => (r.ok ? (r.json() as Promise<OportunidadesEnvelope>) : null))
          .catch(() => null),
        fetch('/api/tercer-sector/territorio', { cache: 'no-store' })
          .then((r) => (r.ok ? (r.json() as Promise<TerritorioEnvelope>) : null))
          .catch(() => null),
      ])
      if (cancel) return
      setOport(o)
      setTerritorio(t)
      setLoaded(true)
    }
    run()
    const id = setInterval(run, REFRESH_MS)
    return () => {
      cancel = true
      clearInterval(id)
    }
  }, [])

  // ── 1) Oportunidades de alta prioridad ──────────────────────────────────
  const od = oport?.ok ? oport.data : null
  const oportTotal = od?.total ?? null
  const oportTop = (od?.oportunidades ?? []).slice(0, 3)
  // ¿el grueso del top viene de licitaciones/grants o de subvenciones? → decide
  // la pestaña de destino más útil.
  const porTipo = od?.por_tipo ?? {}
  const subv = porTipo['subvencion'] ?? 0
  const noSubv =
    (porTipo['licitacion'] ?? 0) +
    (porTipo['grant_ue'] ?? 0) +
    (porTipo['cooperacion_internacional'] ?? 0)
  const oportTab: TercerSectorTab = noSubv > subv ? 'licitaciones' : 'financiacion'
  const oportNote =
    loaded && (oport == null || !oport.ok || (oportTotal ?? 0) === 0)
      ? oport?.error
        ? `Agregador no disponible · ${oport.error}`
        : 'Sin oportunidades de alta prioridad ahora mismo o fuentes no disponibles.'
      : null

  // ── 2) Territorios calientes ────────────────────────────────────────────
  const td = territorio?.ok ? territorio.data : null
  const terrList = td?.territorios ?? []
  const resumen = td?.resumen ?? {}
  const ccaaConAlertas = resumen.ccaa_con_alertas ?? null
  const totalAlertas = resumen.total_alertas ?? null
  // Top CCAA por convocatorias abiertas (oportunidad activa de subvención).
  const topCcaa = [...terrList]
    .filter((t) => (t.convocatorias_abiertas ?? 0) > 0)
    .sort((a, b) => (b.convocatorias_abiertas ?? 0) - (a.convocatorias_abiertas ?? 0))
    .slice(0, 3)
  const terrBig = topCcaa[0]?.convocatorias_abiertas ?? null
  const terrNote =
    loaded && (territorio == null || !territorio.ok || terrList.length === 0)
      ? territorio?.error
        ? `Foto territorial no disponible · ${territorio.error}`
        : 'Foto territorial no disponible ahora mismo (BDNS / PLACE).'
      : null

  // ── 3) Financiadores más activos ────────────────────────────────────────
  // Top organismo por nº de oportunidades, derivado de la lista del top (la fila
  // pide pageSize=5; agregamos sobre lo que hay sin inventar).
  const orgCounts = new Map<string, number>()
  for (const o of od?.oportunidades ?? []) {
    const k = (o.organismo || '').trim()
    if (k) orgCounts.set(k, (orgCounts.get(k) ?? 0) + 1)
  }
  const finRank = Array.from(orgCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const finTop = finRank[0] ?? null

  // ── 4) Riesgo de concentración / dependencia pública ────────────────────
  // Señal sintética sobre el reparto por FUENTE del conjunto filtrado (sin
  // inventar): cuota de la fuente dominante y peso de BDNS (dependencia pública).
  const porFuente = od?.por_fuente ?? {}
  const fuenteEntries = Object.entries(porFuente).sort((a, b) => b[1] - a[1])
  const totalFuente = fuenteEntries.reduce((s, [, n]) => s + n, 0)
  const fuenteTop = fuenteEntries[0] ?? null
  const cuotaTop = fuenteTop && totalFuente > 0 ? Math.round((fuenteTop[1] / totalFuente) * 100) : null
  const bdnsCount = (porFuente['bdns'] ?? 0) + (porFuente['bdns-convocatorias'] ?? 0)
  const cuotaBdns = totalFuente > 0 ? Math.round((bdnsCount / totalFuente) * 100) : null
  const nFuentes = fuenteEntries.length
  const riesgoLinea =
    cuotaTop == null
      ? '—'
      : cuotaTop >= 60
        ? `Concentración alta: ${cuotaTop}% de las oportunidades vienen de una sola fuente (${FUENTE_LABEL[fuenteTop![0]] ?? fuenteTop![0]}).`
        : (cuotaBdns ?? 0) >= 60
          ? `Dependencia pública: ${cuotaBdns}% del flujo es BDNS (subvención estatal/autonómica).`
          : `Reparto diversificado entre ${nFuentes} fuentes (líder ${cuotaTop}%). Riesgo de concentración bajo.`
  const riesgoColor =
    cuotaTop == null ? '#94A3B8' : cuotaTop >= 60 || (cuotaBdns ?? 0) >= 60 ? '#DC2626' : '#16A34A'
  const riesgoBig = cuotaTop == null ? '—' : `${Math.max(cuotaTop, cuotaBdns ?? 0)}`

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 12,
      }}
    >
      {/* 1) Oportunidades de alta prioridad */}
      <AlertCard
        eyebrow="Oportunidades de alta prioridad"
        glyph="◉"
        bigValue={oportTotal != null ? oportTotal.toLocaleString('es-ES') : '—'}
        bigColor="#16A34A"
        detalleLabel={oportTab === 'licitaciones' ? 'Ver en Licitaciones' : 'Ver en Financiación'}
        onClick={() => onNavigate(oportTab)}
        note={oportNote}
        loading={!loaded}
      >
        {oportTop.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {oportTop.map((o) => (
              <li key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <span
                  style={{
                    fontSize: 11,
                    color: '#0f172a',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}
                  title={o.titulo}
                >
                  {o.titulo || 'Oportunidad sin título'}
                </span>
                <span style={{ fontSize: 10, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                  {plazoTexto(o.dias_restantes, o.fecha_limite)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          !oportNote && <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>score ≥ 55 · aptitud ONG</p>
        )}
      </AlertCard>

      {/* 2) Territorios calientes */}
      <AlertCard
        eyebrow="Territorios calientes"
        glyph="◍"
        bigValue={terrBig != null ? terrBig.toLocaleString('es-ES') : '—'}
        bigUnit={terrBig != null ? 'convoc.' : undefined}
        bigColor="#0EA5E9"
        detalleLabel="Ver en Contexto"
        onClick={() => onNavigate('contexto')}
        note={terrNote}
        loading={!loaded}
      >
        {topCcaa.length > 0 ? (
          <>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topCcaa.map((t) => (
                <li key={t.ccaa} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#0f172a',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                    }}
                    title={t.ccaa_nombre}
                  >
                    {t.ccaa_nombre}
                  </span>
                  <span style={{ fontSize: 10.5, color: '#475569', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {(t.convocatorias_abiertas ?? 0).toLocaleString('es-ES')} abiertas
                  </span>
                </li>
              ))}
            </ul>
            {(ccaaConAlertas ?? 0) > 0 && (
              <p style={{ fontSize: 10, color: '#B45309', margin: '7px 0 0', lineHeight: 1.35 }}>
                ! {ccaaConAlertas} CCAA con alerta de hueco
                {totalAlertas != null ? ` · ${totalAlertas} señales` : ''}
              </p>
            )}
          </>
        ) : (
          !terrNote && <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>oportunidades abiertas por CCAA</p>
        )}
      </AlertCard>

      {/* 3) Financiadores más activos */}
      <AlertCard
        eyebrow="Financiadores más activos"
        glyph="◈"
        bigValue={finTop ? finTop[1].toLocaleString('es-ES') : '—'}
        bigUnit={finTop ? 'oport.' : undefined}
        bigColor="#7C3AED"
        detalleLabel="Ver en Financiación"
        onClick={() => onNavigate('financiacion')}
        note={
          loaded && !finTop && (od == null || (oportTotal ?? 0) === 0)
            ? 'Sin financiadores activos detectados ahora mismo.'
            : null
        }
        loading={!loaded}
      >
        {finRank.length > 0 ? (
          <>
            <p
              style={{
                fontSize: 11.5,
                color: '#0f172a',
                fontWeight: 700,
                margin: '0 0 6px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={finTop![0]}
            >
              {finTop![0]}
            </p>
            {finRank.length > 1 && (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {finRank.slice(1).map(([org, n]) => (
                  <li key={org} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span
                      style={{ fontSize: 10.5, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                      title={org}
                    >
                      {org}
                    </span>
                    <span style={{ fontSize: 10, color: '#94A3B8', whiteSpace: 'nowrap' }}>{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          !(loaded && (oportTotal ?? 0) === 0) && (
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>órgano convocante / financiador</p>
          )
        )}
      </AlertCard>

      {/* 4) Riesgo de concentración / dependencia pública */}
      <AlertCard
        eyebrow="Concentración / dependencia pública"
        glyph="◔"
        bigValue={riesgoBig === '—' ? '—' : riesgoBig}
        bigUnit={riesgoBig === '—' ? undefined : '%'}
        bigColor={riesgoColor}
        detalleLabel="Ver en Contexto"
        onClick={() => onNavigate('contexto')}
        note={
          loaded && cuotaTop == null
            ? 'Sin datos suficientes para evaluar concentración ahora mismo.'
            : null
        }
        loading={!loaded}
      >
        {cuotaTop != null ? (
          <p style={{ fontSize: 11, color: '#334155', margin: 0, lineHeight: 1.4 }}>{riesgoLinea}</p>
        ) : (
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>reparto por fuente del flujo de oportunidades</p>
        )}
      </AlertCard>
    </div>
  )
}

export default TSGlobalAlertasAnalista
