'use client'

/**
 * /monitor-legislativo — Monitor en Tiempo Real.
 *
 * Pestaña 1 del módulo Legislativo.
 *
 * Contenido:
 *   1. Hero · KPIs en vivo
 *   2. Iniciativas en tramitación · TODAS (Congreso + Senado + 8+ CCAA)
 *   3. Leyes publicadas (BOE) · filtros por tipo, materia, fecha, búsqueda
 *
 * Sin datos hardcodeados. Sin mapa (eliminado por petición del analista).
 * Todo derivado de APIs oficiales (Congreso opendata, Senado XML, BOE JSON,
 * RSS parlamentos autonómicos).
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

// ─── Tipos de las APIs ─────────────────────────────────────────────────────

interface LegislativeInitiative {
  id: string
  ambito: 'nacional-congreso' | 'nacional-senado' | 'autonomico' | 'ue'
  ccaa?: string | null
  expediente: string
  titulo: string
  kind: 'PL' | 'PPL' | 'RDL' | 'RD' | 'LO' | 'PROP' | 'MOCI' | 'INTE' | 'REFC' | 'OTHER'
  materia: string
  promotor: string
  stage: 'registrado' | 'calificacion' | 'comision' | 'enmiendas' | 'ponencia' | 'dictamen' | 'pleno-origen' | 'pleno-revision' | 'aprobado' | 'rechazado' | 'caducado' | 'publicado' | 'desconocido'
  fechaRegistro: string | null
  fechaActualizacion: string | null
  urlOficial: string | null
  fuente: string
  tags: string[]
}

interface InitiativesResponse {
  items: LegislativeInitiative[]
  stats: {
    total: number
    porAmbito: Record<string, number>
    porKind: Record<string, number>
    porMateria: Record<string, number>
    porStage: Record<string, number>
    enTramitacion: number
    aprobadas: number
    fetchedAt: string
  }
  total: number
  returned: number
}

interface PublishedLaw {
  id: string
  fecha: string
  titulo: string
  departamento: string
  seccion_codigo: string
  seccion_nombre: string
  tipo: string
  materia: string
  importance: number
  url_html: string
  url_pdf: string
  tags: string[]
}

interface PublishedResponse {
  items: PublishedLaw[]
  stats: {
    total: number
    returned: number
    days: number
    porTipo: Record<string, number>
    porMateria: Record<string, number>
    porDept: Record<string, number>
    highImpact: number
    fetchedAt: string
  }
}

interface LlmAnalysis {
  id?: string
  resumen?: string
  sectores_afectados?: string[]
  actores_politicos?: string[]
  impacto_politico?: number
  urgencia?: string
  pronostico?: string
  llm_source?: 'ollama' | 'backend' | 'fallback'
  ms?: number
}

// ─── Constantes UI ─────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, { label: string; color: string }> = {
  'PL':    { label: 'Proyecto de Ley',         color: '#1F4E8C' },
  'PPL':   { label: 'Proposición de Ley',      color: '#5B21B6' },
  'RDL':   { label: 'Real Decreto-Ley',        color: '#DC2626' },
  'RD':    { label: 'Real Decreto',            color: '#0F766E' },
  'LO':    { label: 'Ley Orgánica',            color: '#BE123C' },
  'PROP':  { label: 'Propuesta autonómica',    color: '#7C3AED' },
  'MOCI':  { label: 'Moción',                  color: '#0891B2' },
  'INTE':  { label: 'Interpelación',           color: '#0D9488' },
  'REFC':  { label: 'Reforma constitucional',  color: '#9333EA' },
  'OTHER': { label: 'Otro',                    color: '#6E6E73' },
}

const STAGE_META: Record<string, { label: string; color: string; pct: number }> = {
  'registrado':     { label: 'Registrado',           color: '#6E6E73', pct: 10 },
  'calificacion':   { label: 'Calificación Mesa',    color: '#94A3B8', pct: 18 },
  'comision':       { label: 'En comisión',          color: '#F97316', pct: 35 },
  'enmiendas':      { label: 'Enmiendas',            color: '#FB923C', pct: 45 },
  'ponencia':       { label: 'Ponencia',             color: '#EAB308', pct: 55 },
  'dictamen':       { label: 'Dictamen',             color: '#A3A3A3', pct: 60 },
  'pleno-origen':   { label: 'Pleno · origen',       color: '#1F4E8C', pct: 70 },
  'pleno-revision': { label: 'Pleno · revisora',     color: '#5B21B6', pct: 85 },
  'aprobado':       { label: 'Aprobado',             color: '#16A34A', pct: 100 },
  'rechazado':      { label: 'Rechazado',            color: '#DC2626', pct: 100 },
  'caducado':       { label: 'Caducado',             color: '#525252', pct: 100 },
  'publicado':      { label: 'Publicado',            color: '#16A34A', pct: 100 },
  'desconocido':    { label: 'Estado desconocido',   color: '#94A3B8', pct: 20 },
}

const AMBITO_LABEL: Record<string, { label: string; short: string; color: string }> = {
  'nacional-congreso': { label: 'Congreso de los Diputados', short: 'Congreso', color: '#1F4E8C' },
  'nacional-senado':   { label: 'Senado',                    short: 'Senado',   color: '#5B21B6' },
  'autonomico':        { label: 'Parlamento autonómico',     short: 'CCAA',     color: '#0F766E' },
  'ue':                { label: 'Unión Europea',             short: 'UE',       color: '#1E40AF' },
}

const MATERIAS = ['Todas','Económica','Social','Justicia','Educación','Sanidad','Territorial','Energía','Defensa','Vivienda','Migración','Digital','Agraria','Cultura','Internacional','Otro'] as const

// ─── Página ────────────────────────────────────────────────────────────────

export default function MonitorLegislativoPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Filtros iniciativas
  const [fAmbito, setFAmbito] = useState<string>('todos')
  const [fMateria, setFMateria] = useState<typeof MATERIAS[number]>('Todas')
  const [fStage, setFStage] = useState<string>('todos')
  const [qInit, setQInit] = useState('')

  // Filtros publicadas
  const [pDays, setPDays] = useState<7 | 15 | 30 | 60>(30)
  const [pMateria, setPMateria] = useState<typeof MATERIAS[number]>('Todas')
  const [qPub, setQPub] = useState('')

  const { data: initData, source: initSource, updatedAt: initTs, refresh: initRefresh, loading: initLoading } =
    useApi<InitiativesResponse>('/api/legislativo/initiatives?limit=300', { refreshInterval: 600_000 })

  const { data: pubData, source: pubSource, updatedAt: pubTs, refresh: pubRefresh, loading: pubLoading } =
    useApi<PublishedResponse>(`/api/legislativo/published?days=${pDays}&limit=120`, { refreshInterval: 600_000 })

  const initiatives = initData?.items || []
  const stats = initData?.stats

  const filtered = useMemo(() => initiatives.filter(it => {
    if (fAmbito !== 'todos' && it.ambito !== fAmbito) return false
    if (fMateria !== 'Todas' && it.materia !== fMateria) return false
    if (fStage !== 'todos' && it.stage !== fStage) return false
    if (qInit && !(it.titulo.toLowerCase().includes(qInit.toLowerCase()) || it.expediente.includes(qInit))) return false
    return true
  }), [initiatives, fAmbito, fMateria, fStage, qInit])

  const published = pubData?.items || []
  const pubFiltered = useMemo(() => published.filter(p => {
    if (pMateria !== 'Todas' && p.materia !== pMateria) return false
    if (qPub && !(p.titulo.toLowerCase().includes(qPub.toLowerCase()) || p.departamento.toLowerCase().includes(qPub.toLowerCase()))) return false
    return true
  }), [published, pMateria, qPub])

  // Análisis IA por norma publicada
  const [analyses, setAnalyses] = useState<Record<string, LlmAnalysis>>({})
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({})

  async function analyze(item: PublishedLaw) {
    if (analyzing[item.id] || analyses[item.id]) return
    setAnalyzing(a => ({ ...a, [item.id]: true }))
    try {
      const res = await fetch('/api/legislativo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          titulo: item.titulo,
          departamento: item.departamento,
          tipo: item.tipo,
          materia: item.materia,
        }),
      })
      const json: LlmAnalysis = await res.json()
      setAnalyses(a => ({ ...a, [item.id]: json }))
    } catch {
      setAnalyses(a => ({ ...a, [item.id]: { id: item.id, llm_source: 'fallback', resumen: 'Error al analizar' } }))
    } finally {
      setAnalyzing(a => ({ ...a, [item.id]: false }))
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>

      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ───── Hero ────────────────────────────────────────────────────── */}
        <section style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
          padding: '24px 32px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>MONITOR LEGISLATIVO · EN TIEMPO REAL</span>
              <LiveStatusBadge updatedAt={initTs} source={initSource} refreshIntervalSec={600} onRefresh={initRefresh}/>
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.022em', margin: '0 0 6px', lineHeight: 1.1 }}>
              {stats?.enTramitacion ?? '…'} normas <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#5B21B6' }}>en tramitación</em>
            </h1>
            <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, lineHeight: 1.45 }}>
              Congreso, Senado y parlamentos autonómicos · {stats?.total ?? '…'} expedientes monitorizados ·
              {' '}{pubData?.stats.total ?? '…'} disposiciones publicadas en BOE últimos {pDays} días
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <KPI label="CONGRESO"  value={String(stats?.porAmbito['nacional-congreso'] ?? 0)} color="#1F4E8C"/>
            <KPI label="SENADO"    value={String(stats?.porAmbito['nacional-senado']   ?? 0)} color="#5B21B6"/>
            <KPI label="CCAA"      value={String(stats?.porAmbito['autonomico']        ?? 0)} color="#0F766E"/>
          </div>
        </section>

        {/* ───── Iniciativas en tramitación ────────────────────────────── */}
        <section style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
          padding: '20px 28px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#5B21B6', textTransform: 'uppercase', margin: '0 0 4px' }}>
                INICIATIVAS EN TRAMITACIÓN · TODAS LAS FUENTES
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: 0 }}>
                {filtered.length} resultados · ordenados por última actualización
              </h2>
            </div>
            <button onClick={initRefresh} disabled={initLoading} style={{
              background: '#fff', border: '1px solid #ECECEF', borderRadius: 8, padding: '7px 12px',
              fontSize: 12, fontWeight: 600, color: '#3a3a3d', cursor: 'pointer', fontFamily: 'inherit',
            }}>↻ Refrescar feeds</button>
          </div>

          {/* Filtros iniciativas */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14, alignItems: 'center' }}>
            <Select label="Ámbito" value={fAmbito} onChange={setFAmbito} options={[
              { v: 'todos', l: 'Todos' },
              { v: 'nacional-congreso', l: 'Congreso' },
              { v: 'nacional-senado',   l: 'Senado'   },
              { v: 'autonomico',        l: 'CCAA'     },
            ]}/>
            <Select label="Materia" value={fMateria} onChange={(v) => setFMateria(v as typeof MATERIAS[number])} options={MATERIAS.map(m => ({ v: m, l: m }))}/>
            <Select label="Estado" value={fStage} onChange={setFStage} options={[
              { v: 'todos', l: 'Todos' },
              ...(Object.entries(STAGE_META).map(([k, v]) => ({ v: k, l: v.label }))),
            ]}/>
            <input
              type="text" value={qInit} onChange={e => setQInit(e.target.value)}
              placeholder="Buscar título o expediente…"
              style={{
                flex: 1, minWidth: 200,
                padding: '7px 12px', fontSize: 12.5, borderRadius: 8,
                border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Lista iniciativas */}
          {initLoading && initiatives.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Agregando feeds del Congreso, Senado y parlamentos autonómicos…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#6e6e73', fontSize: 13, background: '#FAFAFB', borderRadius: 12, border: '1px solid #ECECEF' }}>
              Sin iniciativas que coincidan con el filtro actual.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.slice(0, 80).map(it => <InitiativeRow key={it.id} it={it}/>)}
              {filtered.length > 80 && (
                <p style={{ textAlign: 'center', fontSize: 11.5, color: '#6e6e73', padding: 8 }}>
                  Mostrando 80 de {filtered.length} · refina filtros para reducir
                </p>
              )}
            </div>
          )}
        </section>

        {/* ───── Leyes publicadas (BOE) ────────────────────────────────── */}
        <section style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
          padding: '20px 28px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#0F766E', textTransform: 'uppercase', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>LEYES PUBLICADAS · BOE</span>
                <LiveStatusBadge updatedAt={pubTs} source={pubSource} refreshIntervalSec={600} onRefresh={pubRefresh}/>
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: 0 }}>
                {pubFiltered.length} disposiciones · API Datos Abiertos del BOE
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <KPI label="ALTO IMPACTO" value={String(pubData?.stats.highImpact ?? 0)} color="#DC2626"/>
              <KPI label="LEYES"        value={String((pubData?.stats.porTipo.Ley ?? 0) + (pubData?.stats.porTipo.LO ?? 0))} color="#1F4E8C"/>
              <KPI label="RDL"          value={String(pubData?.stats.porTipo.RDL ?? 0)} color="#DC2626"/>
            </div>
          </div>

          {/* Filtros publicadas */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14, alignItems: 'center' }}>
            <FilterChips label="Ventana"
              options={[{v:'7',l:'7d'},{v:'15',l:'15d'},{v:'30',l:'30d'},{v:'60',l:'60d'}]}
              value={String(pDays)}
              onChange={v => setPDays(Number(v) as 7|15|30|60)}/>
            <Select label="Materia" value={pMateria} onChange={(v) => setPMateria(v as typeof MATERIAS[number])} options={MATERIAS.map(m => ({ v: m, l: m }))}/>
            <input
              type="text" value={qPub} onChange={e => setQPub(e.target.value)}
              placeholder="Buscar en título o departamento…"
              style={{
                flex: 1, minWidth: 200,
                padding: '7px 12px', fontSize: 12.5, borderRadius: 8,
                border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit',
              }}
            />
          </div>

          {pubLoading && published.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Cargando sumario del BOE…
            </div>
          ) : pubFiltered.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#6e6e73', fontSize: 13, background: '#FAFAFB', borderRadius: 12, border: '1px solid #ECECEF' }}>
              Sin disposiciones que coincidan con el filtro actual.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pubFiltered.slice(0, 60).map(p => (
                <PublishedRow
                  key={p.id} item={p}
                  analysis={analyses[p.id]}
                  busy={!!analyzing[p.id]}
                  onAnalyze={() => analyze(p)}
                />
              ))}
              {pubFiltered.length > 60 && (
                <p style={{ textAlign: 'center', fontSize: 11.5, color: '#6e6e73', padding: 8 }}>
                  Mostrando 60 de {pubFiltered.length} · refina filtros
                </p>
              )}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}

// ─── Componentes ───────────────────────────────────────────────────────────

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 12px', borderRadius: 10, background: '#FAFAFB', border: `1px solid ${color}33` }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6e6e73', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ v: string; l: string }> }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#6e6e73', fontWeight: 600 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: '#6e6e73', textTransform: 'uppercase' }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding: '6px 28px 6px 10px', fontSize: 12, borderRadius: 8,
        border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit',
        color: '#1d1d1f', cursor: 'pointer',
      }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  )
}

function FilterChips({ label, options, value, onChange }: { label: string; options: Array<{ v: string; l: string }>; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: '#6e6e73', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
        {options.map(o => {
          const active = value === o.v
          return (
            <button key={o.v} onClick={() => onChange(o.v)} style={{
              background: active ? '#fff' : 'transparent',
              color: active ? '#1F4E8C' : '#6e6e73',
              border: 'none', borderRadius: 999, padding: '4px 11px',
              fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>{o.l}</button>
          )
        })}
      </div>
    </div>
  )
}

function InitiativeRow({ it }: { it: LegislativeInitiative }) {
  const kind = KIND_LABEL[it.kind] || KIND_LABEL.OTHER
  const stage = STAGE_META[it.stage] || STAGE_META.desconocido
  const ambito = AMBITO_LABEL[it.ambito] || AMBITO_LABEL['nacional-congreso']

  return (
    <article style={{
      display: 'grid', gridTemplateColumns: '4px 1fr 180px 160px',
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 12,
      overflow: 'hidden', alignItems: 'stretch',
    }}>
      <div style={{ background: stage.color }}/>
      <div style={{ padding: '12px 16px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: ambito.color, color: '#fff', letterSpacing: '0.05em' }}>{ambito.short}</span>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: kind.color, color: '#fff', letterSpacing: '0.05em' }}>{it.kind}</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${stage.color}15`, color: stage.color, border: `1px solid ${stage.color}40`, letterSpacing: '0.04em' }}>{stage.label.toUpperCase()}</span>
          <span style={{ fontSize: 10, color: '#6e6e73' }}>· {it.materia}</span>
          {it.ccaa && <span style={{ fontSize: 10, color: '#6e6e73', fontStyle: 'italic' }}>· {it.ccaa}</span>}
        </div>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.008em', color: '#1d1d1f', lineHeight: 1.35 }}>
          {it.titulo}
        </h3>
        <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 10.5, color: '#6e6e73', flexWrap: 'wrap' }}>
          <span><strong style={{ color: '#1d1d1f' }}>Exp.</strong> {it.expediente}</span>
          <span><strong style={{ color: '#1d1d1f' }}>Promotor</strong> {it.promotor}</span>
          {it.fechaRegistro && <span><strong style={{ color: '#1d1d1f' }}>Registro</strong> {it.fechaRegistro.slice(0, 10)}</span>}
        </div>
        {it.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
            {it.tags.slice(0, 5).map(t => (
              <span key={t} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: 'rgba(0,0,0,0.04)', color: '#3a3a3d' }}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px', borderLeft: '1px solid #ECECEF', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
        <span style={{ fontSize: 9.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Avance</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: '#F5F5F7', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${stage.pct}%`, height: '100%', background: stage.color, borderRadius: 3 }}/>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: stage.color, fontVariantNumeric: 'tabular-nums' }}>{stage.pct}%</span>
        </div>
      </div>
      <div style={{ padding: '12px 14px', borderLeft: '1px solid #ECECEF', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
        <Link href={`/trazabilidad?id=${encodeURIComponent(it.id)}`} style={{
          background: '#5B21B6', color: '#fff', border: 'none',
          borderRadius: 8, padding: '6px 10px',
          fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          textAlign: 'center', textDecoration: 'none',
        }}>Trazabilidad →</Link>
        {it.urlOficial && (
          <a href={it.urlOficial} target="_blank" rel="noopener noreferrer" style={{
            background: '#fff', color: '#3a3a3d', border: '1px solid #ECECEF',
            borderRadius: 8, padding: '6px 10px',
            fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            textDecoration: 'none', textAlign: 'center',
          }}>Fuente ↗</a>
        )}
      </div>
    </article>
  )
}

function PublishedRow({ item, analysis, busy, onAnalyze }: {
  item: PublishedLaw
  analysis: LlmAnalysis | undefined
  busy: boolean
  onAnalyze: () => void
}) {
  const impColor = item.importance >= 70 ? '#DC2626' : item.importance >= 50 ? '#F97316' : item.importance >= 30 ? '#5B21B6' : '#9CA3AF'

  return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: '#fafafa', border: '1px solid #ECECEF', borderLeft: `3px solid ${impColor}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ background: impColor, color: '#fff', borderRadius: 10, padding: '8px 12px', textAlign: 'center', minWidth: 48, flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{item.importance}</div>
          <div style={{ fontSize: 8, marginTop: 2, opacity: 0.85, fontWeight: 700, letterSpacing: '0.08em' }}>SCORE</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: '#1F4E8C', color: '#fff', letterSpacing: '0.05em' }}>{item.tipo}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#0F766E15', color: '#0F766E', border: '1px solid #0F766E40' }}>{item.materia}</span>
            <span style={{ fontSize: 10, color: '#6e6e73' }}>{item.fecha}</span>
            <span style={{ fontSize: 10, color: '#6e6e73' }}>· {item.id}</span>
          </div>
          <a href={item.url_html} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#1d1d1f' }}>
            <p style={{ margin: '0 0 4px', fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{item.titulo}</p>
          </a>
          <p style={{ margin: '0 0 4px', fontSize: 10.5, color: '#6e6e73' }}>{item.departamento}</p>

          {analysis && (
            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.20)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, color: '#fff',
                  background: analysis.llm_source === 'ollama' ? '#7C3AED' : analysis.llm_source === 'backend' ? '#10b981' : '#9CA3AF',
                  padding: '2px 6px', borderRadius: 3, letterSpacing: '0.04em',
                }}>
                  {analysis.llm_source === 'ollama' ? 'OLLAMA' : analysis.llm_source === 'backend' ? 'BACKEND' : 'IA'}
                </span>
                {analysis.urgencia && <span style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED' }}>Urgencia: {analysis.urgencia}</span>}
                {typeof analysis.impacto_politico === 'number' && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: analysis.impacto_politico < -10 ? '#DC2626' : analysis.impacto_politico > 10 ? '#16A34A' : '#6e6e73' }}>
                    Impacto: {analysis.impacto_politico > 0 ? '+' : ''}{analysis.impacto_politico}
                  </span>
                )}
                {analysis.pronostico && <span style={{ fontSize: 10, color: '#6e6e73' }}>· Pronóstico: <strong style={{ color: '#1d1d1f' }}>{analysis.pronostico}</strong></span>}
              </div>
              {analysis.resumen && <p style={{ margin: '0 0 4px', fontSize: 11.5, lineHeight: 1.45, color: '#1d1d1f' }}>{analysis.resumen}</p>}
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {(analysis.sectores_afectados || []).map(s => <span key={s} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#0F766E15', color: '#0F766E' }}>{s}</span>)}
                {(analysis.actores_politicos || []).map(s => <span key={s} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#5B21B615', color: '#5B21B6' }}>{s}</span>)}
              </div>
            </div>
          )}
        </div>
        <button onClick={onAnalyze} disabled={busy || !!analysis} style={{
          background: analysis ? '#16A34A' : busy ? '#9CA3AF' : 'linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)',
          color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px',
          fontSize: 11, fontWeight: 700, cursor: busy || analysis ? 'default' : 'pointer',
          fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {analysis ? 'Analizado' : busy ? 'Analizando…' : 'Analizar con IA'}
        </button>
      </div>
    </div>
  )
}
