'use client'
/**
 * <LicFicha /> · Tercer Sector v3 · Sprint TS7 (Licitaciones · ficha + análisis)
 *
 * Panel de detalle de una licitación seleccionada. Muestra TODOS los datos
 * normalizados (comprador, nivel, país/región, valor, plazo, fecha de pub, CPV,
 * idioma, fuente, enlace al detalle oficial) y, lo más importante, la lista de
 * DOCUMENTOS (pliego / anexos / aclaraciones) con su formato; cada documento
 * lleva un botón "Analizar pliego" que llama a la IA y despliega los requisitos
 * estructurados (<LicAnalisisPliego>).
 *
 * El estado de análisis se guarda por URL de documento (Map) para que: (a) no se
 * relance al re-render, (b) puedas analizar varios documentos de la misma ficha y
 * verlos a la vez. Al cambiar de licitación se limpia. POST a
 * /api/tercer-sector/licitaciones/analizar (pasa título + comprador como contexto
 * del prompt). Degradación honesta: el componente de análisis traduce los errores.
 *
 * Cero emojis · Unicode geométrico.
 */
import { useEffect, useRef, useState } from 'react'
import type { LicitacionNormalizada } from '@/lib/tercer-sector/licitaciones/types'
import type { AnalizarPliegoResponse } from '@/lib/tercer-sector/analizar-pliego'
import {
  ACCENT,
  NivelBadge,
  PlazoPill,
  fuenteLabel,
  FUENTES,
  formatMoneda,
  formatFecha,
  idiomaLabel,
} from './LicShared'
import { LicAnalisisPliego, type AnalisisState } from './LicAnalisisPliego'

interface Props {
  lic: LicitacionNormalizada | null
  onClose: () => void
}

const TIPO_LABEL: Record<string, string> = {
  pliego: 'Pliego',
  anuncio: 'Anuncio',
  anexo: 'Anexo',
  aclaracion: 'Aclaración',
  adjudicacion: 'Adjudicación',
  otro: 'Documento',
}

const ANALIZABLE = new Set(['pdf', 'docx', 'doc', 'xlsx', 'xls', 'html', 'htm', 'txt'])

export function LicFicha({ lic, onClose }: Props) {
  // Estado de análisis por URL de documento.
  const [analisis, setAnalisis] = useState<Record<string, AnalisisState>>({})

  // Guards de carrera: el POST de análisis puede tardar; descartamos la
  // respuesta si se cambió de licitación o se desmontó el componente entretanto.
  const activeLicId = useRef(lic?.id)
  const mounted = useRef(true)
  // Al cambiar de licitación, limpia los análisis previos.
  useEffect(() => {
    activeLicId.current = lic?.id
    setAnalisis({})
  }, [lic?.id])
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )

  if (!lic) {
    return (
      <section style={{ background: '#fff', border: '1px dashed #D6D6DA', borderRadius: 14, padding: '28px 22px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 12.5, color: '#94a3b8' }}>
          Selecciona una licitación para ver su ficha completa y analizar sus pliegos con IA.
        </p>
      </section>
    )
  }

  const analizar = async (url: string, noCache: boolean) => {
    const myLic = lic.id
    setAnalisis((prev) => ({ ...prev, [url]: { loading: true, res: prev[url]?.res ?? null, netError: null } }))
    try {
      const r = await fetch('/api/tercer-sector/licitaciones/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, titulo: lic.titulo, comprador: lic.comprador, noCache }),
      })
      const j = (await r.json()) as AnalizarPliegoResponse
      if (!mounted.current || activeLicId.current !== myLic) return
      setAnalisis((prev) => ({ ...prev, [url]: { loading: false, res: j, netError: null } }))
    } catch (e: unknown) {
      if (!mounted.current || activeLicId.current !== myLic) return
      setAnalisis((prev) => ({ ...prev, [url]: { loading: false, res: null, netError: String((e as Error)?.message ?? e) } }))
    }
  }

  const fuenteUrl = (FUENTES as Record<string, { url: string }>)[lic.fuente]?.url
  const docs = lic.documentos ?? []

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderLeft: `4px solid ${ACCENT}`,
        borderRadius: 14,
        padding: '18px 22px',
      }}
    >
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <NivelBadge nivel={lic.nivel} />
            <PlazoPill plazo={lic.plazo} />
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.015em', lineHeight: 1.25 }}>
            {lic.titulo || 'Licitación sin título'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569' }}>{lic.comprador || '—'}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ficha"
          style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#64748b', fontSize: 14, lineHeight: 1, flexShrink: 0 }}
        >
          ✕
        </button>
      </div>

      {/* Datos clave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 14 }}>
        <Dato label="Valor estimado" value={formatMoneda(lic.valor_eur, lic.moneda)} strong />
        <Dato label="Plazo presentación" value={formatFecha(lic.plazo)} />
        <Dato label="Publicación" value={formatFecha(lic.fecha_pub)} />
        <Dato label="País" value={lic.pais || '—'} />
        {lic.region && <Dato label="Región" value={lic.region} />}
        {lic.cpv && <Dato label="CPV principal" value={lic.cpv} mono />}
        <Dato label="Idioma" value={idiomaLabel(lic.idioma)} />
        <Dato label="Fuente" value={fuenteLabel(lic.fuente)} />
      </div>

      {/* Enlaces */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {lic.url && (
          <a href={lic.url} target="_blank" rel="noreferrer" style={linkBtn(ACCENT)}>
            Ver ficha oficial <span aria-hidden="true">↗</span>
          </a>
        )}
        {fuenteUrl && (
          <a href={fuenteUrl} target="_blank" rel="noreferrer" style={linkBtnGhost}>
            Portal {fuenteLabel(lic.fuente)} <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>

      {/* Documentos */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 10.5, color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Documentos {docs.length > 0 ? `(${docs.length})` : ''}
        </p>

        {docs.length === 0 ? (
          <p style={{ margin: 0, fontSize: 11.5, color: '#94a3b8' }}>
            Esta fuente no expone documentos descargables en el listado. Abre la ficha oficial para acceder a los pliegos.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {docs.map((doc, i) => {
              const st = analisis[doc.url]
              const fmt = (doc.formato || '').toLowerCase()
              const analizable = ANALIZABLE.has(fmt)
              return (
                <div key={`${doc.url}-${i}`} style={{ border: '1px solid #ECECEF', borderRadius: 10, padding: '10px 12px', background: '#FAFAFA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <FormatoTag formato={fmt} />
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        title={doc.url}
                        style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', textDecoration: 'none' }}
                      >
                        {doc.nombre || TIPO_LABEL[doc.tipo] || 'Documento'} <span aria-hidden="true" style={{ opacity: 0.5 }}>↗</span>
                      </a>
                      <p style={{ margin: '1px 0 0', fontSize: 10, color: '#94a3b8' }}>{TIPO_LABEL[doc.tipo] ?? doc.tipo}</p>
                    </div>
                    {/* Acción inline: el botón disparador solo aparece si aún no
                        se ha lanzado el análisis. Con estado, el detalle (loading
                        / requisitos / error) se pinta a ancho completo debajo. */}
                    {analizable ? (
                      !st ? (
                        <LicAnalisisPliego
                          state={undefined}
                          onAnalizar={() => analizar(doc.url, false)}
                          onReintentar={() => analizar(doc.url, true)}
                        />
                      ) : null
                    ) : (
                      <span
                        title="Formato no analizable automáticamente (zip / xml / desconocido)"
                        style={{ fontSize: 10, color: '#94a3b8', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 8px', whiteSpace: 'nowrap' }}
                      >
                        No analizable
                      </span>
                    )}
                  </div>
                  {/* Detalle del análisis a ancho completo (loading / requisitos / error). */}
                  {analizable && st && (
                    <LicAnalisisPliego
                      state={st}
                      onAnalizar={() => analizar(doc.url, false)}
                      onReintentar={() => analizar(doc.url, true)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function Dato({ label, value, strong = false, mono = false }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '8px 10px' }}>
      <p style={{ margin: 0, fontSize: 8.5, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '3px 0 0', fontSize: strong ? 15 : 12.5, fontWeight: strong ? 700 : 600, color: strong ? ACCENT : '#1e293b', lineHeight: 1.3, fontVariantNumeric: mono ? 'tabular-nums' : undefined }}>
        {value}
      </p>
    </div>
  )
}

function FormatoTag({ formato }: { formato: string }) {
  const f = (formato || 'doc').toUpperCase()
  const palette: Record<string, string> = {
    PDF: '#DC2626', DOCX: '#2563EB', DOC: '#2563EB', XLSX: '#16A34A', XLS: '#16A34A',
    HTML: '#EA580C', HTM: '#EA580C', TXT: '#64748b', XML: '#7C3AED', ZIP: '#92400E',
  }
  const color = palette[f] ?? '#64748b'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 42,
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '0.03em',
        color,
        background: `${color}12`,
        border: `1px solid ${color}33`,
        borderRadius: 6,
        padding: '4px 6px',
      }}
    >
      {f === 'DESCONOCIDO' ? '?' : f}
    </span>
  )
}

function linkBtn(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 700,
    textDecoration: 'none',
    fontFamily: 'inherit',
  }
}

const linkBtnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  background: '#fff',
  color: '#475569',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 600,
  textDecoration: 'none',
}

export default LicFicha
