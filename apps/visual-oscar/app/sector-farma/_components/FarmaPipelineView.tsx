'use client'
/**
 * <FarmaPipelineView /> · Farma v3 · Sprint F5
 *
 * Vista de pipeline I+D. Cruza:
 *   - ClinicalTrials.gov v2 · ensayos en España (estado RECRUITING + ACTIVE)
 *   - Distribución por fase, sponsor, condición
 *   - % sponsor industria vs académico
 *
 * Cero datos inventados. Si la API cae, degradación honesta.
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel, Mini, RankChart, Skeleton, Vacio, SectorHero, Th, Td } from '@/lib/sectores/charts'

const ACCENT = '#7C3AED'

interface EnsayoStudy {
  nct_id: string
  titulo: string
  estado: string
  fase: string[]
  condiciones: string[]
  sponsor_principal: string
  sponsor_clase: string
  paises: string[]
  fecha_inicio: string | null
  fecha_fin: string | null
  tipo: string
  url: string
}
interface EnsayosEnvelope {
  ok: boolean
  data: {
    studies: EnsayoStudy[]
    total: number
    kpis: {
      n_listados: number
      n_total: number
      n_industria: number
      por_fase: Record<string, number>
      top_sponsors: Array<{ name: string; n: number }>
      top_condiciones: Array<{ name: string; n: number }>
    }
  } | null
  fuente: string
  fuente_url: string
  fuentes_error: string[]
}

export function FarmaPipelineView() {
  const [activos, setActivos] = useState<EnsayosEnvelope | null>(null)
  const [reclutando, setReclutando] = useState<EnsayosEnvelope | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/farma/ensayos?pais=Spain&estado=ACTIVE_NOT_RECRUITING&pageSize=100', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/farma/ensayos?pais=Spain&estado=RECRUITING&pageSize=100', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([a, r]) => {
      if (!alive) return
      setActivos(a)
      setReclutando(r)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const fuentes_error = useMemo(
    () => [
      ...(activos?.fuentes_error ?? []),
      ...(reclutando?.fuentes_error ?? []),
    ],
    [activos, reclutando]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="FARMA · PIPELINE I+D · ENSAYOS CLÍNICOS ESPAÑA"
        titulo="¿Qué hay en marcha y quién lo financia?"
        descripcion="Ensayos clínicos en estado activo + reclutando en España según ClinicalTrials.gov. Tres lecturas: tamaño del pipeline (cuántos hay), por fase clínica (1-4) y top sponsors / condiciones (qué empresas / áreas terapéuticas concentran la actividad)."
        colorFrom={ACCENT}
        colorTo="#4C1D95"
      />

      <PanelHeroKpis activos={activos} reclutando={reclutando} loading={loading} />
      <PanelFases recl={reclutando} act={activos} />
      <PanelSponsors recl={reclutando} act={activos} />
      <PanelCondiciones recl={reclutando} act={activos} />
      <PanelListaRecientes recl={reclutando} />

      {fuentes_error.length > 0 && (
        <p style={{ fontSize: 10.5, color: '#B45309', margin: 0 }}>
          ! Degradación honesta · {fuentes_error.join(' · ')}
        </p>
      )}
    </div>
  )
}

function PanelHeroKpis({
  activos,
  reclutando,
  loading,
}: {
  activos: EnsayosEnvelope | null
  reclutando: EnsayosEnvelope | null
  loading: boolean
}) {
  const nRecl = reclutando?.data?.kpis?.n_total ?? null
  const nAct = activos?.data?.kpis?.n_total ?? null
  const total = (nRecl ?? 0) + (nAct ?? 0)
  const nInd = (reclutando?.data?.kpis?.n_industria ?? 0) + (activos?.data?.kpis?.n_industria ?? 0)
  const nLis = (reclutando?.data?.kpis?.n_listados ?? 0) + (activos?.data?.kpis?.n_listados ?? 0)
  const pctIndustria = nLis > 0 ? Number(((nInd / nLis) * 100).toFixed(1)) : null
  return (
    <Panel
      titulo="KPIs del pipeline en España"
      fuente="ClinicalTrials.gov API v2"
      url="https://clinicaltrials.gov/search?country=Spain"
    >
      {loading ? (
        <Skeleton h={90} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <Mini label="Ensayos reclutando" value={nRecl} unit="" color={ACCENT} decimals={0} />
          <Mini label="Ensayos activos (no reclutando)" value={nAct} unit="" color="#1F4E8C" decimals={0} />
          <Mini label="Total cobertura ES" value={total > 0 ? total : null} unit="" color="#0F766E" decimals={0} />
          <Mini
            label="% sponsor industria (muestra)"
            value={pctIndustria}
            unit="%"
            color="#DC2626"
            decimals={1}
            sub={`Sobre ${nLis} estudios analizados`}
          />
        </div>
      )}
    </Panel>
  )
}

function PanelFases({ recl, act }: { recl: EnsayosEnvelope | null; act: EnsayosEnvelope | null }) {
  const merged: Record<string, number> = {}
  for (const src of [recl, act]) {
    const m = src?.data?.kpis?.por_fase ?? {}
    for (const [k, v] of Object.entries(m)) merged[k] = (merged[k] ?? 0) + v
  }
  // Ordenar por etiqueta lógica
  const ORDER = ['PHASE1', 'PHASE1·PHASE2', 'PHASE2', 'PHASE2·PHASE3', 'PHASE3', 'PHASE4', 'EARLY_PHASE1', 'N/A']
  const rows = ORDER.filter((k) => merged[k] != null).map((k) => ({
    geo: k,
    label: prettyFase(k),
    value: merged[k],
  }))
  // Añadir el resto que no esté en ORDER
  for (const [k, v] of Object.entries(merged)) {
    if (!ORDER.includes(k)) rows.push({ geo: k, label: prettyFase(k), value: v })
  }
  return (
    <Panel titulo="Distribución por fase clínica" fuente="ClinicalTrials.gov · sample" url="https://clinicaltrials.gov/">
      {rows.length === 0 ? (
        <Vacio msg="Sin distribución disponible." />
      ) : (
        <RankChart rows={rows} highlight="PHASE3" baseColor={ACCENT} highlightColor="#DC2626" unit="" decimals={0} />
      )}
      <p style={{ fontSize: 11, color: '#86868b', margin: '10px 0 0' }}>
        Resaltado · Fase 3 · ensayos pivotales de eficacia previos a la autorización regulatoria.
      </p>
    </Panel>
  )
}

function prettyFase(k: string): string {
  if (k === 'N/A') return 'No aplica'
  return k
    .replace(/EARLY_PHASE1/g, 'Fase 1 temprana')
    .replace(/PHASE/g, 'Fase ')
    .replace(/·/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim()
}

function PanelSponsors({ recl, act }: { recl: EnsayosEnvelope | null; act: EnsayosEnvelope | null }) {
  // Mergea top sponsors de ambas listas, suma counts
  const map = new Map<string, number>()
  for (const src of [recl, act]) {
    for (const item of src?.data?.kpis?.top_sponsors ?? []) {
      map.set(item.name, (map.get(item.name) ?? 0) + item.n)
    }
  }
  const rows = Array.from(map.entries())
    .map(([name, n]) => ({ geo: name, label: name, value: n }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12)
  return (
    <Panel
      titulo="Top sponsors activos en España"
      fuente="ClinicalTrials.gov · agregado por leadSponsorName"
      url="https://clinicaltrials.gov/"
    >
      {rows.length === 0 ? (
        <Vacio msg="Sin sponsors listados en la muestra." />
      ) : (
        <RankChart rows={rows} highlight="" baseColor={ACCENT} unit="" decimals={0} />
      )}
      <p style={{ fontSize: 11, color: '#86868b', margin: '10px 0 0' }}>
        Suma de ensayos reclutando + activos (no reclutando) por sponsor principal. Los nombres no
        están normalizados — distintas razones sociales del mismo grupo (p. ej. AstraZeneca AB,
        AstraZeneca Pharmaceuticals) cuentan por separado.
      </p>
    </Panel>
  )
}

function PanelCondiciones({ recl, act }: { recl: EnsayosEnvelope | null; act: EnsayosEnvelope | null }) {
  const map = new Map<string, number>()
  for (const src of [recl, act]) {
    for (const item of src?.data?.kpis?.top_condiciones ?? []) {
      map.set(item.name, (map.get(item.name) ?? 0) + item.n)
    }
  }
  const rows = Array.from(map.entries())
    .map(([name, n]) => ({ geo: name, label: name, value: n }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12)
  return (
    <Panel
      titulo="Top condiciones investigadas"
      fuente="ClinicalTrials.gov · agregado por condition"
      url="https://clinicaltrials.gov/"
    >
      {rows.length === 0 ? (
        <Vacio msg="Sin condiciones listadas en la muestra." />
      ) : (
        <RankChart rows={rows} highlight="" baseColor="#0F766E" unit="" decimals={0} />
      )}
    </Panel>
  )
}

function PanelListaRecientes({ recl }: { recl: EnsayosEnvelope | null }) {
  const items = recl?.data?.studies ?? []
  return (
    <Panel
      titulo="Ensayos reclutando · listado reciente"
      fuente="ClinicalTrials.gov · Estado: Recruiting · País: Spain"
      url="https://clinicaltrials.gov/search?country=Spain&aggFilters=status:rec"
    >
      {items.length === 0 ? (
        <Vacio msg="Sin ensayos reclutando en la muestra recibida." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #ECECEF' }}>
                <th style={Th}>NCT id</th>
                <th style={Th}>Título</th>
                <th style={Th}>Fase</th>
                <th style={Th}>Sponsor</th>
                <th style={Th}>Inicio</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 24).map((s) => (
                <tr key={s.nct_id} style={{ borderBottom: '1px solid #F2F2F4' }}>
                  <td style={{ ...Td, fontFamily: 'monospace', fontSize: 11 }}>
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
                      {s.nct_id}
                    </a>
                  </td>
                  <td style={{ ...Td, maxWidth: 360 }}>{s.titulo}</td>
                  <td style={Td}>{s.fase.length > 0 ? s.fase.join(' / ') : '—'}</td>
                  <td style={{ ...Td, fontWeight: 600 }}>{s.sponsor_principal || '—'}</td>
                  <td style={Td}>{s.fecha_inicio || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
