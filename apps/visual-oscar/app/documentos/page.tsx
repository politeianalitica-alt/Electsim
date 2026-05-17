'use client'

/**
 * /documentos — Hub central de extracción de documentos.
 *
 * Permite al analista:
 *   1. Pegar URL de PDF/DOCX/XLSX/CSV/XML/JSON y extraer texto + estructura
 *   2. Subir archivo local
 *   3. Ver metadata + tablas detectadas + texto extraído
 *   4. Pasar resultado a Cuaderno como nota, o a otros módulos
 *
 * El sistema soporta:
 *   - PDF (texto, metadata, hasta 50 páginas)
 *   - DOCX (texto plano vía Mammoth)
 *   - XLSX/XLS/CSV/TSV (hojas, filas estructuradas)
 *   - XML/JSON (estructura)
 *   - HTML (texto + tablas detectadas)
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import DocumentExtractor from '@/components/DocumentExtractor'

interface SavedExtract {
  ts: number
  source: string
  format: string
  units: number
  text: string
}

const EXAMPLES = [
  { label: 'BOE — Ley orgánica', url: 'https://www.boe.es/boe/dias/2025/03/15/pdfs/BOE-A-2025-5234.pdf', accent: '#1F4E8C' },
  { label: 'Senado · iniciativas XML', url: 'https://www.senado.es/web/ficopendataservlet?tipoFich=9&legis=15', accent: '#5B21B6' },
  { label: 'INE · CSV indicadores', url: 'https://www.ine.es/jaxiT3/files/t/es/csv/2853.csv', accent: '#0F766E' },
  { label: 'Banco España · informe PDF', url: 'https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/InformesBoletinesRevistas/InformesEstabilidadFinancera/24/Primavera/IEFPrimavera2024.pdf', accent: '#DC2626' },
]

export default function DocumentosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [history, setHistory] = useState<SavedExtract[]>([])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero */}
        <section style={{
          background: 'linear-gradient(135deg,#0F766E 0%,#064E47 100%)',
          borderRadius: 22, padding: '28px 36px', marginBottom: 18, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32, alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.78, margin: '0 0 6px', textTransform: 'uppercase' }}>
              EXTRACCIÓN DE DOCUMENTOS · MOTOR UNIVERSAL
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
              Lee cualquier formato <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)' }}>y conviértelo en datos.</em>
            </h1>
            <p style={{ fontSize: 13, opacity: 0.8, margin: 0, lineHeight: 1.5, maxWidth: 580 }}>
              PDF · DOCX · XLSX · CSV · XML · JSON · HTML — todo a texto plano + estructura.
              Pega una URL del BOE, una hoja de Excel del INE, un acta del Congreso, una resolución del Banco de España. Obtienes metadata + tablas + texto listo para análisis.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {['PDF', 'DOCX', 'XLSX', 'CSV', 'XML', 'JSON', 'HTML', 'TXT'].map(f => (
              <div key={f} style={{
                textAlign: 'center', padding: '10px 6px', borderRadius: 8,
                background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              }}>{f}</div>
            ))}
          </div>
        </section>

        {/* Extractor principal */}
        <section style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
          padding: '24px 28px', marginBottom: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#0F766E', textTransform: 'uppercase', margin: '0 0 14px' }}>
            EXTRAER DOCUMENTO
          </p>
          <DocumentExtractor
            onExtract={doc => {
              setHistory(h => [
                { ts: Date.now(), source: doc.filename || 'URL', format: doc.format, units: doc.units, text: doc.text.slice(0, 500) },
                ...h.slice(0, 9),
              ])
            }}
          />
        </section>

        {/* Ejemplos rápidos */}
        <section style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
          padding: '20px 28px', marginBottom: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 10px' }}>
            EJEMPLOS · prueba con datos reales
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {EXAMPLES.map(ex => (
              <a key={ex.url} href={`?url=${encodeURIComponent(ex.url)}`}
                onClick={e => {
                  e.preventDefault()
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement | null
                  if (input) {
                    input.value = ex.url
                    input.focus()
                  }
                }}
                style={{
                  padding: '10px 12px', borderRadius: 10,
                  background: `${ex.accent}08`, border: `1px solid ${ex.accent}30`,
                  textDecoration: 'none', fontFamily: 'inherit',
                  borderLeft: `3px solid ${ex.accent}`,
                  cursor: 'pointer',
                }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: ex.accent }}>{ex.label}</p>
                <p style={{ margin: '3px 0 0', fontSize: 10, color: '#6e6e73', wordBreak: 'break-all' }}>{ex.url.slice(0, 80)}…</p>
              </a>
            ))}
          </div>
        </section>

        {/* Historial de la sesión */}
        {history.length > 0 && (
          <section style={{
            background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
            padding: '20px 28px', marginBottom: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 10px' }}>
              HISTORIAL DE ESTA SESIÓN · {history.length}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map(h => (
                <div key={h.ts} style={{
                  padding: '8px 10px', borderRadius: 8,
                  background: '#FAFAFB', border: '1px solid #ECECEF',
                }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: '#0F766E', color: '#fff', letterSpacing: '0.05em' }}>
                      {h.format.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1d1d1f', flex: 1 }}>{h.source}</span>
                    <span style={{ fontSize: 10, color: '#6e6e73' }}>{h.units} unidades</span>
                    <span style={{ fontSize: 10, color: '#6e6e73' }}>{new Date(h.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 10.5, color: '#6e6e73', lineHeight: 1.4 }}>{h.text.slice(0, 200)}…</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Dónde se usa */}
        <section style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 18,
          padding: '20px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 10px' }}>
            DÓNDE SE USA AUTOMÁTICAMENTE
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#3a3a3d', lineHeight: 1.6 }}>
            <li><strong>Trazabilidad legislativa</strong>: PDFs de BOCG y Diarios de Sesiones del Congreso se descargan y se extraen comparecientes, enmiendas y acuerdos automáticamente.</li>
            <li><strong>Monitor legislativo</strong>: PDFs del BOE se procesan para metadata y previsualización.</li>
            <li><strong>Adjudicaciones y licitaciones</strong>: documentos técnicos en PDF/DOCX de pliegos.</li>
            <li><strong>Estudio</strong>: importación de datasets CSV/XLSX a paneles.</li>
            <li><strong>Cuaderno</strong>: subida de PDFs convertidos en notas estructuradas.</li>
            <li><strong>Briefings y reports</strong>: documentos de gobierno, BdE, INE, Comisión Europea.</li>
          </ul>
          <p style={{ margin: '12px 0 0', fontSize: 11, color: '#6e6e73', fontStyle: 'italic' }}>
            Endpoint API: <code style={{ background: '#FAFAFB', padding: '2px 6px', borderRadius: 4, fontSize: 10.5 }}>GET /api/documents/extract?url=&lt;URL&gt;</code>
            {' · '}<code style={{ background: '#FAFAFB', padding: '2px 6px', borderRadius: 4, fontSize: 10.5 }}>POST /api/documents/extract</code> (multipart con file)
          </p>
        </section>
      </main>
    </div>
  )
}
