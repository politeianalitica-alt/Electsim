'use client'
import { useState } from 'react'
import { useApi } from '@/lib/useApi'

type Briefing = {
  id: string
  title?: string
  date?: string
  created_at?: string
  type?: 'matinal' | 'semanal' | 'mensual' | 'flash' | string
  format?: 'pdf' | 'html' | 'docx'
  size_kb?: number
  download_url?: string
  highlights?: string[]
  bytes_b64?: string
}

const FALLBACK: Briefing[] = [
  { id: '2026-05-08-matinal', title: 'Briefing matinal', date: '2026-05-08', type: 'matinal', format: 'pdf', size_kb: 412,
    highlights: ['Prima riesgo >100pb por 3er día', 'Junts condiciona Presupuestos', 'BCE actas hawkish'] },
  { id: '2026-05-07-semanal', title: 'Briefing semanal · Mayo S1', date: '2026-05-07', type: 'semanal', format: 'pdf', size_kb: 980,
    highlights: ['PP +5.3pp sobre PSOE', '38% mayoría derecha', 'Crisis migratoria Canarias +34%'] },
  { id: '2026-05-06-matinal', title: 'Briefing matinal', date: '2026-05-06', type: 'matinal', format: 'pdf', size_kb: 388,
    highlights: ['CIS junio: PSOE recorta 0.8pp', 'IBEX +1.2%', 'EPA 11.1% paro'] },
  { id: '2026-05-05-flash', title: 'Flash · Sentencia TS', date: '2026-05-05', type: 'flash', format: 'pdf', size_kb: 122,
    highlights: ['TS confirma anulación amnistía Puigdemont', 'Reacción Gobierno: recurso constitucional'] },
  { id: '2026-05-02-matinal', title: 'Briefing matinal', date: '2026-05-02', type: 'matinal', format: 'pdf', size_kb: 405,
    highlights: ['Gasto defensa +0.3pp PIB', 'Ayuso encuesta Madrid +8.1', 'Spread Italia 142pb'] },
  { id: '2026-04-30-mensual', title: 'Briefing mensual · Abril 2026', date: '2026-04-30', type: 'mensual', format: 'pdf', size_kb: 2240,
    highlights: ['Resumen abril: 12 alertas críticas', 'Volatilidad Pedersen 4.2', 'Cobertura 414 fuentes'] },
]

function typeStyle(t?: string): { color: string; bg: string; label: string } {
  if (t === 'flash') return { color: '#c42c2c', bg: 'rgba(196,44,44,0.10)', label: 'FLASH' }
  if (t === 'semanal') return { color: '#5B21B6', bg: 'rgba(91,33,182,0.10)', label: 'SEMANAL' }
  if (t === 'mensual') return { color: '#0071e3', bg: 'rgba(0,113,227,0.10)', label: 'MENSUAL' }
  return { color: '#1F4E8C', bg: 'rgba(31,78,140,0.10)', label: 'MATINAL' }
}

function downloadFromB64(bytesB64: string, filename: string) {
  try {
    const bin = atob(bytesB64)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    const blob = new Blob([arr], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5_000)
  } catch (e) {
    console.error('PDF decode failed', e)
  }
}

async function fetchAndDownloadPDF(id: string) {
  try {
    const r = await fetch(`/api/briefings/${id}/pdf`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('application/pdf')) {
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${id}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5_000)
    } else {
      const j = await r.json()
      if (j.bytes_b64) downloadFromB64(j.bytes_b64, `${id}.pdf`)
      else if (j.download_url) window.open(j.download_url, '_blank')
    }
  } catch {
    // Demo fallback: generate trivial PDF with filename info
    const txt = `%PDF-1.4\n%Demo briefing ${id}\n%EOF`
    const blob = new Blob([txt], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${id}-demo.pdf`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5_000)
  }
}

export default function BriefingArchive() {
  const [filter, setFilter] = useState<string>('all')
  const [downloading, setDownloading] = useState<string | null>(null)

  const { data } = useApi<{ items?: Briefing[] } | Briefing[]>('/api/briefings/archive', { refreshInterval: 0 })
  const arr = (Array.isArray(data) ? data : data?.items) ?? []
  const items = arr.length > 0 ? arr : FALLBACK
  const filtered = filter === 'all' ? items : items.filter(it => it.type === filter)

  return (
    <section style={{
      background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '24px 28px', marginTop: 22,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
            Archivo
          </p>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Briefings anteriores
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { v: 'all', l: 'Todos' },
            { v: 'matinal', l: 'Matinal' },
            { v: 'semanal', l: 'Semanal' },
            { v: 'mensual', l: 'Mensual' },
            { v: 'flash', l: 'Flash' },
          ].map(t => (
            <button key={t.v} onClick={() => setFilter(t.v)} style={{
              padding: '6px 12px', borderRadius: 999, border: '1px solid #e8e8ed',
              background: filter === t.v ? '#1d1d1f' : '#fff',
              color: filter === t.v ? '#fff' : '#6e6e73',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((b) => {
          const ts = typeStyle(b.type)
          const isDl = downloading === b.id
          return (
            <div key={b.id} style={{
              display: 'grid', gridTemplateColumns: '90px 1fr 130px 70px 110px',
              gap: 14, alignItems: 'center', padding: '14px 16px',
              background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12,
            }}>
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                color: ts.color, background: ts.bg, textAlign: 'center', letterSpacing: '0.06em',
              }}>{ts.label}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{b.title ?? b.id}</div>
                {b.highlights && b.highlights.length > 0 && (
                  <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 4, lineHeight: 1.5 }}>
                    {b.highlights.slice(0, 3).map((h, i) => <span key={i}>{i > 0 ? ' · ' : ''}{h}</span>)}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 12, color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>
                {b.date ?? (b.created_at ? new Date(b.created_at).toLocaleDateString('es-ES') : '—')}
              </span>
              <span style={{ fontSize: 11, color: '#6e6e73', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {b.size_kb ? `${(b.size_kb / 1024).toFixed(1)} MB` : '—'}
              </span>
              <button
                onClick={async () => {
                  if (isDl) return
                  setDownloading(b.id)
                  if (b.bytes_b64) {
                    downloadFromB64(b.bytes_b64, `${b.id}.pdf`)
                  } else if (b.download_url) {
                    window.open(b.download_url, '_blank')
                  } else {
                    await fetchAndDownloadPDF(b.id)
                  }
                  setDownloading(null)
                }}
                disabled={isDl}
                style={{
                  padding: '7px 14px', borderRadius: 999, border: 'none',
                  background: isDl ? '#e8e8ed' : '#1d1d1f', color: isDl ? '#6e6e73' : '#fff',
                  fontSize: 11, fontWeight: 600, cursor: isDl ? 'wait' : 'pointer', fontFamily: 'inherit',
                }}>
                {isDl ? 'Descargando…' : `↓ ${(b.format ?? 'PDF').toUpperCase()}`}
              </button>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p style={{ fontSize: 12, color: '#6e6e73', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
          No hay briefings de tipo "{filter}".
        </p>
      )}

      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f5f5f7', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6e6e73' }}>
        <span>{filtered.length} briefings · ordenados por fecha desc.</span>
        <a href="/api/briefings/archive.zip" style={{ color: '#1F4E8C', fontWeight: 600, textDecoration: 'none' }}>
          ↓ Descargar todo (ZIP)
        </a>
      </div>
    </section>
  )
}
