'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ── Importación bulk desde CSV ──────────────────────────────────────────
// Permite pegar un CSV con N filas (una por persona/entidad) y genera
// los dossieres mínimos correspondientes — todos juntos en un array
// JSON que el usuario descarga y pega en data/...
//
// Columnas reconocidas (cabecera obligatoria):
//   nombre          (obligatorio · si no, fila descartada)
//   slug            (auto desde nombre si vacío)
//   alias           opcional
//   cargo           opcional
//   partido         opcional (PSOE / PP / Vox / Sumar / …)
//   bio_corta       opcional
//   foto_url        opcional
//   tags            opcional (separadas por |)
//   fuente_principal opcional
//   tipo            'politico' (default) / 'actor' / 'medio' / 'issue'

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Parser CSV simple con manejo de comillas y separadores ; o ,
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return []
  // Detectar separador: si primera línea tiene más ';' que ',', usa ';'
  const first = lines[0]
  const sep = (first.split(';').length - 1) > (first.split(',').length - 1) ? ';' : ','

  const rows: string[][] = []
  for (const line of lines) {
    const cells: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === sep && !inQuotes) {
        cells.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur)
    rows.push(cells.map(c => c.trim()))
  }
  return rows
}

// Construir un dossier mínimo desde una fila normalizada
function buildDossier(row: Record<string, string>): Record<string, unknown> {
  const nombre = row.nombre || ''
  const slug = row.slug?.trim() || slugify(nombre)
  const tags = (row.tags || '').split('|').map(t => t.trim()).filter(Boolean)
  return {
    slug,
    tipo: row.tipo?.trim() || 'politico',
    nombre,
    alias: row.alias || null,
    cargo: row.cargo || null,
    partido: row.partido?.trim() || null,
    foto_url: row.foto_url || null,
    bio_corta: row.bio_corta || null,
    tags,
    fuente_principal: row.fuente_principal || null,
    confidence: 0.6,
    completeness: 0.2,  // mínimo: solo bio
    apartados: row.bio_corta ? [
      {
        tipo: 'identidad',
        titulo: null,
        resumen: null,
        orden: 0,
        items: [
          {
            tipo: 'dato',
            titulo: 'Perfil general',
            contenido: row.bio_corta,
            fecha: null,
            fuente_url: row.fuente_principal || null,
            fuente_titulo: null,
            tags: [],
            orden: 0,
          },
        ],
      },
    ] : [],
  }
}

const EJEMPLO_CSV = `nombre,partido,cargo,bio_corta,tags
María Pérez García,PSOE,Diputada autonómica por Sevilla,Diputada en el Parlamento de Andalucía desde 2022. Especializada en sanidad pública.,politico|andalucia
Juan López Sánchez,PP,Alcalde de Pueblo Pequeño,Alcalde de Pueblo Pequeño desde 2019. Trayectoria municipal previa de 12 años.,politico|alcalde
Ana Martín Ortiz,Vox,Concejala en Madrid,Concejala en el Ayuntamiento de Madrid. Anteriormente abogada del Estado.,politico|madrid|concejal`

export default function ImportarCSVPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [csvText, setCsvText] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  // Parsear el CSV
  const parsed = useMemo(() => {
    if (!csvText.trim()) return { rows: [] as Record<string, string>[], errors: [] as string[], headers: [] as string[] }
    const matrix = parseCSV(csvText)
    if (matrix.length < 1) return { rows: [], errors: ['CSV vacío.'], headers: [] }
    const headers = matrix[0].map(h => h.toLowerCase().trim())
    if (!headers.includes('nombre')) {
      return { rows: [], errors: ['Falta la columna obligatoria "nombre" en la cabecera.'], headers }
    }
    const rows: Record<string, string>[] = []
    const errors: string[] = []
    for (let r = 1; r < matrix.length; r++) {
      const row = matrix[r]
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = row[i] || '' })
      if (!obj.nombre) { errors.push(`Fila ${r + 1}: nombre vacío, descartada.`); continue }
      rows.push(obj)
    }
    return { rows, errors, headers }
  }, [csvText])

  const dossieres = useMemo(() => parsed.rows.map(buildDossier), [parsed])

  // Acciones
  const cargarEjemplo = () => setCsvText(EJEMPLO_CSV)
  const limpiar = () => setCsvText('')

  const copiarJSON = async () => {
    if (dossieres.length === 0) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(dossieres, null, 2))
      setSavedMsg(`${dossieres.length} dossieres copiados al portapapeles`)
      setTimeout(() => setSavedMsg(''), 2800)
    } catch {
      setSavedMsg('No se pudo copiar (usa Descargar)')
      setTimeout(() => setSavedMsg(''), 2800)
    }
  }
  const descargarJSON = () => {
    if (dossieres.length === 0) return
    const blob = new Blob([JSON.stringify(dossieres, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dossieres-bulk-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setSavedMsg(`Descargados ${dossieres.length} dossieres`)
    setTimeout(() => setSavedMsg(''), 2800)
  }

  return (
    <div style={{ background: '#FBFBFD', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px 80px' }}>
        <nav style={{ marginBottom: 16, fontSize: 12 }}>
          <Link href="/dosieres" style={{ color: '#86868b', textDecoration: 'none' }}>← Volver a Personas</Link>
        </nav>

        {/* Hero */}
        <header style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 10, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Importación bulk
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0 6px', color: '#1d1d1f' }}>
            Importar CSV
          </h1>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, maxWidth: 720, lineHeight: 1.5 }}>
            Pega un CSV con una persona por fila. Genera un único JSON con todos los
            dossieres mínimos. Útil para cargar diputados, concejales o bases corporativas
            desde una hoja de cálculo. El JSON resultante se pega en{' '}
            <code style={{ background: '#F4F4F6', padding: '1px 5px', borderRadius: 3 }}>data/...</code>
            o se carga por la API.
          </p>
        </header>

        {/* ═══ Columnas reconocidas ═══ */}
        <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '20px 24px', marginBottom: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px', color: '#1d1d1f' }}>
            Columnas reconocidas
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {[
              { col: 'nombre', desc: 'Obligatorio. Si vacío, fila descartada.' },
              { col: 'slug', desc: 'Auto-generado del nombre si está vacío.' },
              { col: 'alias', desc: 'Opcional.' },
              { col: 'cargo', desc: 'Opcional. Ej. "Diputada por Sevilla".' },
              { col: 'partido', desc: 'Opcional. PSOE / PP / Vox / Sumar / …' },
              { col: 'bio_corta', desc: 'Opcional. Genera el primer item de identidad.' },
              { col: 'foto_url', desc: 'Opcional.' },
              { col: 'tags', desc: 'Opcional. Separadas por barras (|).' },
              { col: 'fuente_principal', desc: 'Opcional. URL biográfica.' },
              { col: 'tipo', desc: '"politico" (default) / "actor" / "medio" / "issue".' },
            ].map(c => (
              <div key={c.col} style={{ fontSize: 12 }}>
                <code style={{ background: '#F4F4F6', padding: '1px 6px', borderRadius: 3, fontWeight: 700, color: '#1F4E8C' }}>{c.col}</code>
                <span style={{ color: '#6e6e73', marginLeft: 8 }}>{c.desc}</span>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 14, fontSize: 11.5, color: '#86868b', lineHeight: 1.5 }}>
            <strong>Separadores soportados:</strong> coma o punto y coma (autodetecta).
            Los valores con coma deben ir entre comillas dobles.
          </p>
        </section>

        {/* ═══ Editor CSV ═══ */}
        <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '20px 24px', marginBottom: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px', color: '#1d1d1f' }}>
            CSV a importar
          </h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={cargarEjemplo} style={{
              background: '#fff', border: '1px solid #ECECEF', color: '#1d1d1f',
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Cargar ejemplo
            </button>
            <button type="button" onClick={limpiar} style={{
              background: '#fff', border: '1px solid #ECECEF', color: '#525258',
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Limpiar
            </button>
          </div>
          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            rows={10}
            placeholder="Pega aquí el CSV con cabecera en la primera línea..."
            style={{
              width: '100%', padding: '10px 12px', fontSize: 12,
              border: '1px solid #ECECEF', borderRadius: 8,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              lineHeight: 1.5, outline: 'none', resize: 'vertical', minHeight: 200,
              background: '#FBFBFD',
            }}
          />
        </section>

        {/* ═══ Errores ═══ */}
        {parsed.errors.length > 0 && (
          <div style={{
            background: '#FFF4F4', border: '1px solid #FCDADA', borderRadius: 12,
            padding: 14, marginBottom: 16, fontSize: 12,
          }}>
            <strong style={{ color: '#DC2626' }}>Avisos:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#7B1D1D' }}>
              {parsed.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* ═══ Preview ═══ */}
        {dossieres.length > 0 && (
          <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECEF', padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, color: '#1d1d1f' }}>
                Preview ({dossieres.length} dossier{dossieres.length === 1 ? '' : 'es'})
              </h2>
              {parsed.errors.length === 0 && (
                <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>✓ Sin errores</span>
              )}
            </div>

            {/* Tabla compacta con los primeros 8 */}
            <div style={{ overflow: 'auto', marginBottom: 14, border: '1px solid #ECECEF', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#FBFBFD' }}>
                    <th style={th()}>#</th>
                    <th style={th()}>Nombre</th>
                    <th style={th()}>Slug</th>
                    <th style={th()}>Partido</th>
                    <th style={th()}>Cargo</th>
                    <th style={th()}>Items</th>
                  </tr>
                </thead>
                <tbody>
                  {dossieres.slice(0, 8).map((d: any, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #ECECEF' }}>
                      <td style={td()}>{i + 1}</td>
                      <td style={{ ...td(), fontWeight: 600 }}>{d.nombre}</td>
                      <td style={{ ...td(), fontFamily: 'monospace', fontSize: 11, color: '#525258' }}>{d.slug}</td>
                      <td style={td()}>
                        {d.partido && (
                          <span style={{
                            fontSize: 10.5, padding: '2px 8px', borderRadius: 4,
                            background: '#F4F4F6', fontWeight: 600, color: '#1d1d1f',
                          }}>{d.partido}</span>
                        )}
                      </td>
                      <td style={{ ...td(), color: '#525258', fontSize: 11.5 }}>{d.cargo || '—'}</td>
                      <td style={{ ...td(), textAlign: 'center', color: '#86868b' }}>{(d.apartados as any[]).reduce((s: number, a: any) => s + a.items.length, 0)}</td>
                    </tr>
                  ))}
                  {dossieres.length > 8 && (
                    <tr><td colSpan={6} style={{ ...td(), textAlign: 'center', color: '#86868b', fontStyle: 'italic' }}>
                      …y {dossieres.length - 8} más
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={copiarJSON} style={{
                background: '#0071e3', border: 'none', color: '#fff',
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Copiar {dossieres.length} JSON
              </button>
              <button type="button" onClick={descargarJSON} style={{
                background: '#fff', border: '1px solid #ECECEF', color: '#1d1d1f',
                padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Descargar .json
              </button>
            </div>

            {savedMsg && (
              <p style={{ marginTop: 10, fontSize: 12, color: '#16A34A', fontWeight: 600 }}>
                ✓ {savedMsg}
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

function th(): React.CSSProperties {
  return {
    padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: '#525258', textTransform: 'uppercase', letterSpacing: '0.04em',
    borderBottom: '1px solid #ECECEF',
  }
}
function td(): React.CSSProperties {
  return {
    padding: '8px 10px', verticalAlign: 'top',
  }
}
