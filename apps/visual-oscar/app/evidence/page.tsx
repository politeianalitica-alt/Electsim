'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import IntelHero from '../_components/intel/IntelHero'
import IntelTabs from '../_components/intel/IntelTabs'
import IntelCard from '../_components/intel/IntelCard'
import IntelEmpty from '../_components/intel/IntelEmpty'
import IntelBadge from '../_components/intel/IntelBadge'
import AdmiraltyBadge from '../_components/intel/AdmiraltyBadge'
import { isAuthenticated } from '@/lib/auth'
import { useEvidencias } from '@/hooks/intelligence'
import type { Evidencia, TipoFuente, ClasificacionDraft, EvidenciaDraft } from '@/types/intelligence'
import { intelligenceApi } from '@/lib/api/intelligence'

const FUENTE_LABEL: Record<TipoFuente, string> = {
  oficial: 'Oficial', medio: 'Medios', osint: 'OSINT', humint: 'HUMINT',
  sigint: 'SIGINT', datos_abiertos: 'Datos abiertos', redes_sociales: 'Redes',
  documento: 'Documento', otro: 'Otro',
}
const FUENTE_COLOR: Record<TipoFuente, string> = {
  oficial: '#1F4E8C', medio: '#5B21B6', osint: '#0F766E', humint: '#DC2626',
  sigint: '#F97316', datos_abiertos: '#0EA5E9', redes_sociales: '#7C3AED',
  documento: '#16A34A', otro: '#6e6e73',
}
const CLAS_LABEL: Record<ClasificacionDraft, string> = {
  publica: 'Publica', interna: 'Interna', confidencial: 'Confidencial', restringida: 'Restringida',
}

function FuenteIcon({ tipo }: { tipo: TipoFuente }) {
  const stroke = FUENTE_COLOR[tipo]
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9 L16 9 M8 13 L16 13 M8 17 L13 17" />
    </svg>
  )
}

type TabId = 'locker' | 'ingesta' | 'vinculos'

export default function EvidencePage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<TabId>('locker')
  const [filterFuente, setFilterFuente] = useState<TipoFuente | ''>('')
  const [filterClas, setFilterClas] = useState<ClasificacionDraft | ''>('')
  const [query, setQuery] = useState('')
  const filters = useMemo(() => ({
    fuente_tipo: filterFuente || undefined,
    clasificacion: filterClas || undefined,
    q: query || undefined,
  }), [filterFuente, filterClas, query])

  const { data, isLoading } = useEvidencias(filters)
  const items = data?.items ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = items.find(e => e.id === selectedId) ?? items[0]

  const totals = useMemo(() => {
    const all = data?.items ?? []
    return {
      total: all.length,
      ofi: all.filter(e => e.fuente_tipo === 'oficial').length,
      med: all.filter(e => e.fuente_tipo === 'medio').length,
      conf: all.filter(e => e.clasificacion === 'confidencial' || e.clasificacion === 'restringida').length,
    }
  }, [data])

  // Ingesta tab state
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scraped, setScraped] = useState<EvidenciaDraft | null>(null)

  async function handleScrape() {
    if (!scrapeUrl) return
    setScraping(true)
    try {
      const draft = await intelligenceApi.scrapeUrl(scrapeUrl)
      setScraped(draft)
    } catch {
      setScraped(null)
    } finally {
      setScraping(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        <IntelHero
          eyebrow="EVIDENCE LOCKER · CADENA DE CUSTODIA"
          title={`${totals.total} evidencias indexadas`}
          subtitle="Repositorio centralizado con escala NATO Admiralty (A-F) y confianza 1-6. Ingesta desde URLs, documentos y feeds OSINT."
          kpis={[
            { label: 'Oficiales', value: totals.ofi, accent: '#86EFAC' },
            { label: 'Medios', value: totals.med, accent: '#C4B5FD' },
            { label: 'Confidencial', value: totals.conf, accent: '#FCD34D' },
            { label: 'Total', value: totals.total, accent: '#7DD3FC' },
          ]}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
          <IntelTabs<TabId>
            tabs={[
              { id: 'locker', label: 'Locker', count: items.length },
              { id: 'ingesta', label: 'Ingesta URL' },
              { id: 'vinculos', label: 'Vinculos' },
            ]}
            active={tab}
            onChange={setTab}
          />
          {tab === 'locker' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por titulo, tag, entidad"
                style={{
                  padding: '7px 12px', border: '1px solid #ECECEF', borderRadius: 999, background: '#fff',
                  fontSize: 12, fontFamily: 'inherit', color: '#1d1d1f', minWidth: 220,
                }}
              />
              <select value={filterFuente} onChange={e => setFilterFuente(e.target.value as TipoFuente | '')}
                style={{ padding: '7px 12px', border: '1px solid #ECECEF', borderRadius: 999, background: '#fff', fontSize: 12, fontFamily: 'inherit', color: '#1d1d1f' }}>
                <option value="">Todas las fuentes</option>
                {(Object.keys(FUENTE_LABEL) as TipoFuente[]).map(t => (
                  <option key={t} value={t}>{FUENTE_LABEL[t]}</option>
                ))}
              </select>
              <select value={filterClas} onChange={e => setFilterClas(e.target.value as ClasificacionDraft | '')}
                style={{ padding: '7px 12px', border: '1px solid #ECECEF', borderRadius: 999, background: '#fff', fontSize: 12, fontFamily: 'inherit', color: '#1d1d1f' }}>
                <option value="">Toda clasificacion</option>
                {(Object.keys(CLAS_LABEL) as ClasificacionDraft[]).map(c => (
                  <option key={c} value={c}>{CLAS_LABEL[c]}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {tab === 'locker' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
            <div>
              {isLoading && <IntelEmpty title="Cargando evidencias" description="Obteniendo registros del locker." />}
              {!isLoading && items.length === 0 && <IntelEmpty title="Sin evidencias" description="No hay evidencias que cumplan los filtros actuales." />}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
                {items.map(e => (
                  <EvidenciaCard key={e.id} ev={e} active={selected?.id === e.id} onSelect={() => setSelectedId(e.id)} />
                ))}
              </div>
            </div>
            <div style={{ position: 'sticky', top: 100, alignSelf: 'flex-start' }}>
              <DetailPanel ev={selected} />
            </div>
          </div>
        )}

        {tab === 'ingesta' && (
          <IntelCard padding="22px 26px">
            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Ingesta automatica desde URL</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#6e6e73' }}>Pega una URL de un articulo, BOE, comunicado o documento publico. El sistema generara un borrador de evidencia con metadatos.</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="https://www.boe.es/diario_boe/..."
                style={{ flex: 1, padding: '10px 14px', border: '1px solid #ECECEF', borderRadius: 10, background: '#fff', fontSize: 13, fontFamily: 'inherit' }} />
              <button onClick={handleScrape} disabled={scraping || !scrapeUrl}
                style={{ padding: '10px 18px', borderRadius: 10, background: '#1F4E8C', color: '#fff', fontWeight: 600, fontSize: 12.5, border: 'none', cursor: 'pointer', opacity: scraping ? 0.6 : 1 }}>
                {scraping ? 'Procesando...' : 'Extraer'}
              </button>
            </div>
            {scraped && (
              <div style={{ background: '#F5F5F7', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>Borrador generado</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{scraped.titulo}</div>
                <div style={{ fontSize: 12, color: '#3a3a3d', marginBottom: 12 }}>{scraped.resumen}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <AdmiraltyBadge credibilidad={scraped.credibilidad} confianza={scraped.confianza} />
                  <IntelBadge color="#1F4E8C">{CLAS_LABEL[scraped.clasificacion]}</IntelBadge>
                  {scraped.url && <span style={{ fontSize: 11, color: '#6e6e73' }}>{scraped.url}</span>}
                </div>
              </div>
            )}
          </IntelCard>
        )}

        {tab === 'vinculos' && (
          <IntelCard padding="22px 26px">
            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Mapa de vinculos</h3>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#6e6e73' }}>Relaciones entre evidencias, entidades y canvas asociados.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
              {items.slice(0, 9).map(e => (
                <div key={e.id} style={{ background: '#F5F5F7', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#1d1d1f', lineHeight: 1.35 }}>{e.titulo.slice(0, 60)}{e.titulo.length > 60 ? '...' : ''}</div>
                  <div style={{ fontSize: 11, color: '#6e6e73' }}>
                    Entidades: {e.entidades.slice(0, 3).join(', ') || '-'}
                  </div>
                </div>
              ))}
            </div>
          </IntelCard>
        )}
      </main>
    </div>
  )
}

function EvidenciaCard({ ev, active, onSelect }: { ev: Evidencia; active: boolean; onSelect: () => void }) {
  return (
    <IntelCard hoverable onClick={onSelect} padding="14px 16px"
      style={{ borderColor: active ? '#1F4E8C' : '#ECECEF', boxShadow: active ? '0 4px 14px rgba(31,78,140,0.10)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <FuenteIcon tipo={ev.fuente_tipo} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.35, letterSpacing: '-0.005em' }}>
            {ev.titulo}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: '#3a3a3d', margin: '0 0 12px', lineHeight: 1.45,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {ev.resumen}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <AdmiraltyBadge credibilidad={ev.credibilidad} confianza={ev.confianza} />
        <IntelBadge color={FUENTE_COLOR[ev.fuente_tipo]}>{FUENTE_LABEL[ev.fuente_tipo]}</IntelBadge>
        {ev.tags.slice(0, 2).map(t => <IntelBadge key={t} color="#6e6e73" variant="outline" size="xs">{t}</IntelBadge>)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#86868b', borderTop: '1px solid #F5F5F7', paddingTop: 8 }}>
        <span>{ev.fuente_nombre}</span>
        <span>{ev.fecha_documento ?? ev.fecha_ingestion.slice(0, 10)}</span>
      </div>
    </IntelCard>
  )
}

function DetailPanel({ ev }: { ev: Evidencia | undefined }) {
  if (!ev) return <IntelEmpty title="Selecciona una evidencia" description="Elige un registro del listado para ver los detalles." />
  return (
    <IntelCard padding="20px 22px">
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 8 }}>Detalle de evidencia</div>
      <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 600, letterSpacing: '-0.012em', lineHeight: 1.3 }}>{ev.titulo}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <AdmiraltyBadge credibilidad={ev.credibilidad} confianza={ev.confianza} />
        <IntelBadge color={FUENTE_COLOR[ev.fuente_tipo]}>{FUENTE_LABEL[ev.fuente_tipo]}</IntelBadge>
        <IntelBadge color="#5B21B6">{CLAS_LABEL[ev.clasificacion]}</IntelBadge>
      </div>
      <p style={{ fontSize: 13, color: '#3a3a3d', margin: '0 0 14px', lineHeight: 1.55 }}>{ev.resumen}</p>
      {ev.url && (
        <a href={ev.url} target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', fontSize: 12, color: '#1F4E8C', fontWeight: 600, marginBottom: 14 }}>
          Ver fuente original
        </a>
      )}
      {ev.entidades.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Entidades</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ev.entidades.map(en => <IntelBadge key={en} color="#3a3a3d" variant="soft" size="xs">{en}</IntelBadge>)}
          </div>
        </div>
      )}
      {ev.tags.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ev.tags.map(t => <IntelBadge key={t} color="#1F4E8C" variant="outline" size="xs">{t}</IntelBadge>)}
          </div>
        </div>
      )}
      <div style={{ borderTop: '1px solid #ECECEF', paddingTop: 10, fontSize: 11, color: '#86868b', display: 'flex', justifyContent: 'space-between' }}>
        <span>Fuente: {ev.fuente_nombre}</span>
        <span>Ingesta: {new Date(ev.fecha_ingestion).toLocaleString('es-ES')}</span>
      </div>
    </IntelCard>
  )
}
