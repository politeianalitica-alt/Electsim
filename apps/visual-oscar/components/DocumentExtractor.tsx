'use client'

/**
 * <DocumentExtractor> — Componente reutilizable para extraer texto y datos
 * de documentos en cualquier formato (PDF, DOCX, XLSX, CSV, XML, JSON, HTML).
 *
 * Modos de entrada:
 *   1. URL: textarea + botón "Extraer"
 *   2. Subida de archivo (drag & drop o click)
 *
 * Output:
 *   - Texto plano (siempre)
 *   - Metadata (título, autor, fechas, páginas)
 *   - Tablas estructuradas si las hay (CSV/XLSX/HTML)
 *   - Callback opcional onExtract para handler propio
 */

import { useState, useRef } from 'react'

interface ExtractedDoc {
  format: string
  text: string
  units: number
  metadata: {
    title?: string
    author?: string
    creator?: string
    creationDate?: string
    pageCount?: number
    wordCount?: number
    sourceSize?: number
  }
  rows?: Array<Record<string, unknown>>
  sheets?: string[]
  tables?: Array<{ headers: string[]; rows: (string | number)[][] }>
  warnings: string[]
  extractionMs: number
  filename?: string
  error?: string
}

interface Props {
  /** Callback opcional cuando se extrae exitosamente */
  onExtract?: (doc: ExtractedDoc) => void
  /** Mostrar también previsualización de texto extraído */
  showPreview?: boolean
  /** Texto del placeholder */
  placeholder?: string
  /** Compacto (sin metadata visible) */
  compact?: boolean
  /** Color de acento */
  accent?: string
}

export default function DocumentExtractor({
  onExtract,
  showPreview = true,
  placeholder = 'Pega una URL de PDF, DOCX, XLSX… o sube un archivo',
  compact = false,
  accent = '#0F766E',
}: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [doc, setDoc] = useState<ExtractedDoc | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  async function extractByUrl() {
    if (!url || loading) return
    setLoading(true)
    setDoc(null)
    try {
      const res = await fetch(`/api/documents/extract?url=${encodeURIComponent(url)}&metadata=true`)
      const json = await res.json()
      setDoc(json)
      if (onExtract && !json.error) onExtract(json)
    } catch (e) {
      setDoc({ format: 'unknown', text: '', units: 0, metadata: {}, warnings: [], extractionMs: 0, error: String(e) })
    } finally { setLoading(false) }
  }

  async function extractFile(file: File) {
    if (!file) return
    setLoading(true)
    setDoc(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/documents/extract', { method: 'POST', body: form })
      const json = await res.json()
      setDoc(json)
      if (onExtract && !json.error) onExtract(json)
    } catch (e) {
      setDoc({ format: 'unknown', text: '', units: 0, metadata: {}, warnings: [], extractionMs: 0, error: String(e) })
    } finally { setLoading(false) }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) extractFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) extractFile(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') extractByUrl() }}
          placeholder={placeholder}
          style={{
            flex: 1, minWidth: 220,
            padding: '8px 12px', fontSize: 12.5, borderRadius: 8,
            border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit',
          }}
        />
        <button onClick={extractByUrl} disabled={loading || !url} style={{
          background: accent, color: '#fff', border: 'none',
          padding: '8px 14px', borderRadius: 8, fontSize: 12,
          fontWeight: 700, cursor: loading || !url ? 'not-allowed' : 'pointer',
          opacity: loading || !url ? 0.5 : 1, fontFamily: 'inherit',
        }}>
          {loading ? 'Extrayendo…' : 'Extraer URL'}
        </button>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInput.current?.click()}
        style={{
          padding: '14px 16px', borderRadius: 10,
          border: `1.5px dashed ${dragOver ? accent : '#ECECEF'}`,
          background: dragOver ? `${accent}08` : '#FAFAFB',
          fontSize: 12, color: '#6e6e73',
          cursor: 'pointer', textAlign: 'center',
          transition: 'all 120ms',
        }}>
        <strong style={{ color: accent }}>↑ Subir archivo</strong> o arrastra aquí
        <span style={{ marginLeft: 8, fontSize: 10.5, opacity: 0.7 }}>PDF · DOCX · XLSX · CSV · XML · JSON · HTML</span>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.tsv,.xml,.json,.html,.htm,.md,.txt"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
      </div>

      {doc?.error && (
        <p style={{ margin: 0, padding: '8px 10px', fontSize: 11.5, color: '#DC2626', background: 'rgba(220,38,38,0.08)', borderRadius: 8 }}>
          Error: {doc.error.slice(0, 200)}
        </p>
      )}

      {doc && !doc.error && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid #ECECEF' }}>
          {/* Header con metadata */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: accent, color: '#fff', letterSpacing: '0.05em' }}>
              {doc.format.toUpperCase()}
            </span>
            {doc.filename && <span style={{ fontSize: 11, fontWeight: 600, color: '#1d1d1f' }}>{doc.filename}</span>}
            {doc.metadata.pageCount && <span style={{ fontSize: 10, color: '#6e6e73' }}>{doc.metadata.pageCount} págs.</span>}
            {doc.units > 0 && doc.format !== 'pdf' && <span style={{ fontSize: 10, color: '#6e6e73' }}>{doc.units} unidades</span>}
            {doc.metadata.wordCount != null && <span style={{ fontSize: 10, color: '#6e6e73' }}>{doc.metadata.wordCount.toLocaleString()} palabras</span>}
            {doc.metadata.sourceSize != null && <span style={{ fontSize: 10, color: '#6e6e73' }}>{(doc.metadata.sourceSize / 1024).toFixed(0)} KB</span>}
            <span style={{ fontSize: 10, color: '#6e6e73', marginLeft: 'auto' }}>{doc.extractionMs} ms</span>
          </div>

          {!compact && doc.metadata.title && (
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{doc.metadata.title}</p>
          )}
          {!compact && (doc.metadata.author || doc.metadata.creator) && (
            <p style={{ margin: '0 0 6px', fontSize: 10.5, color: '#6e6e73' }}>
              {doc.metadata.author && <>Autor: <strong style={{ color: '#3a3a3d' }}>{doc.metadata.author}</strong></>}
              {doc.metadata.creator && <> · Aplicación: {doc.metadata.creator}</>}
              {doc.metadata.creationDate && <> · {doc.metadata.creationDate}</>}
            </p>
          )}

          {/* Tablas detectadas (si las hay) */}
          {doc.tables && doc.tables.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: '0 0 4px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: accent, textTransform: 'uppercase' }}>
                {doc.tables.length} TABLA(S) DETECTADA(S)
              </p>
              <div style={{ overflowX: 'auto', maxHeight: 280, borderRadius: 6, border: '1px solid #ECECEF' }}>
                <table style={{ width: '100%', fontSize: 10.5, borderCollapse: 'collapse', fontFamily: 'inherit' }}>
                  <thead style={{ background: '#FAFAFB', position: 'sticky', top: 0 }}>
                    <tr>{doc.tables[0].headers.slice(0, 8).map((h, i) => (
                      <th key={i} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#3a3a3d', borderBottom: '1px solid #ECECEF' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {doc.tables[0].rows.slice(0, 20).map((row, i) => (
                      <tr key={i}>
                        {row.slice(0, 8).map((cell, j) => (
                          <td key={j} style={{ padding: '4px 8px', color: '#1d1d1f', borderBottom: '1px solid #F5F5F7' }}>
                            {String(cell).slice(0, 80)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {doc.tables[0].rows.length > 20 && (
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#6e6e73' }}>
                  Mostrando 20 de {doc.tables[0].rows.length} filas
                </p>
              )}
            </div>
          )}

          {/* Preview de texto */}
          {showPreview && doc.text && (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: '0 0 4px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: accent, textTransform: 'uppercase' }}>
                TEXTO EXTRAÍDO
              </p>
              <pre style={{
                margin: 0, padding: '8px 10px', fontSize: 10.5, color: '#3a3a3d',
                background: '#FAFAFB', borderRadius: 6, border: '1px solid #ECECEF',
                maxHeight: 280, overflowY: 'auto', whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
                lineHeight: 1.45,
              }}>
                {doc.text.slice(0, 5000)}{doc.text.length > 5000 ? '\n\n[…texto truncado, descarga para ver completo…]' : ''}
              </pre>
            </div>
          )}

          {doc.warnings.length > 0 && (
            <details style={{ marginTop: 6 }}>
              <summary style={{ fontSize: 10, color: '#F97316', cursor: 'pointer', fontWeight: 600 }}>
                {doc.warnings.length} aviso(s)
              </summary>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 10, color: '#6e6e73' }}>
                {doc.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
