'use client'
/**
 * <LicAnalisisPliego /> · Tercer Sector v3 · Sprint TS7 (análisis de pliegos · IA)
 *
 * El "cerebro" del centerpiece: dado un documento de licitación (URL del pliego /
 * anexo de la ficha), llama a POST /api/tercer-sector/licitaciones/analizar y
 * renderiza los REQUISITOS ESTRUCTURADOS que extrae Gemini (objeto, presupuesto,
 * valor estimado, plazos, criterios con sus pesos, solvencia, CPV, lotes,
 * garantías, lugar, idioma, resumen y un veredicto "apto para ONG").
 *
 * Shape REAL: `AnalizarPliegoResponse` (lib/tercer-sector/analizar-pliego.ts).
 * Degradación honesta (CLAUDE.md): muestra estado loading; ante `ok:false`
 * traduce el error (no_key / formato_desconocido / parser_unavailable / http_* /
 * timeout…) a un mensaje claro y NO inventa requisitos. Disclaimer permanente:
 * `generado por IA · verificar contra el pliego oficial`.
 *
 * Es controlado: el padre (LicFicha) le pasa el estado del análisis por URL para
 * que se conserve al re-renderizar y no se relance solo. Cero emojis · Unicode.
 */
import type { AnalizarPliegoResponse, AptoParaOng } from '@/lib/tercer-sector/analizar-pliego'
import { ACCENT } from './LicShared'

/** Estado de un análisis (lo gestiona el padre por URL de documento). */
export interface AnalisisState {
  loading: boolean
  res: AnalizarPliegoResponse | null
  /** Error de transporte (fetch caído); los errores de negocio van en res.error. */
  netError: string | null
}

interface Props {
  state: AnalisisState | undefined
  onAnalizar: () => void
  onReintentar: () => void
}

// Traducción honesta de los códigos de error del lib a mensajes para el analista.
const ERROR_MSG: Record<string, string> = {
  no_key: 'Análisis por IA no configurado en este entorno (falta GEMINI_API_KEY, server-side).',
  formato_desconocido: 'No se pudo determinar el formato del documento (ni por tipo MIME ni por extensión).',
  formato_no_soportado: 'Formato de documento no soportado para extracción de texto.',
  parser_unavailable: 'Extracción no disponible en el runtime (falta la librería de parsing para este formato).',
  sin_texto: 'El documento se descargó pero no contenía texto analizable.',
  demasiado_grande: 'El documento supera el límite de tamaño (15 MB).',
  timeout: 'La descarga del documento agotó el tiempo de espera.',
  url_invalida: 'La URL del documento no es válida.',
  protocolo_no_soportado: 'La URL del documento usa un protocolo no soportado.',
  base64_failed: 'No se pudo preparar el PDF para el análisis.',
  parse_failed: 'La IA respondió pero no se pudo interpretar como requisitos estructurados.',
  extraccion_fallida: 'La IA no devolvió requisitos para este documento.',
  descarga_fallida: 'No se pudo descargar el documento desde la fuente.',
}

function errorLabel(code: string | undefined): string {
  if (!code) return 'No se pudo analizar el documento.'
  if (ERROR_MSG[code]) return ERROR_MSG[code]
  if (code.startsWith('http_')) return `La fuente devolvió un error HTTP (${code.replace('http_', '')}) al descargar el documento.`
  if (code.startsWith('gemini_')) return 'El servicio de IA (Gemini) devolvió un error al analizar el documento.'
  return code
}

// ── Veredicto apto-para-ONG ──────────────────────────────────────
const VEREDICTO_META: Record<AptoParaOng['veredicto'], { label: string; color: string; glyph: string }> = {
  apto: { label: 'Apto para ONG', color: '#16A34A', glyph: '✓' },
  apto_con_reservas: { label: 'Apto con reservas', color: '#CA8A04', glyph: '◐' },
  no_apto: { label: 'No apto', color: '#DC2626', glyph: '✕' },
  indeterminado: { label: 'Indeterminado', color: '#64748b', glyph: '◦' },
}

function eur(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${Math.round(v).toLocaleString('es-ES')} €`
}

export function LicAnalisisPliego({ state, onAnalizar, onReintentar }: Props) {
  // Sin análisis aún → botón disparador.
  if (!state) {
    return (
      <button
        type="button"
        onClick={onAnalizar}
        style={{
          background: ACCENT,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        ◈ Analizar pliego (IA)
      </button>
    )
  }

  if (state.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#64748b', padding: '4px 0' }}>
        <span
          aria-hidden="true"
          style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}
        />
        Analizando el documento con IA… (descarga + lectura del pliego)
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // Error de transporte (fetch caído).
  if (state.netError) {
    return <AnalisisError msg={`No se pudo contactar con el servicio de análisis: ${state.netError}`} onReintentar={onReintentar} />
  }

  const res = state.res
  if (!res) return <AnalisisError msg="Sin respuesta del análisis." onReintentar={onReintentar} />

  // Error de negocio (ok:false).
  if (!res.ok || !res.data) {
    const nota = res.nota && res.nota !== errorLabel(res.error) ? res.nota : undefined
    return <AnalisisError msg={errorLabel(res.error)} nota={nota} onReintentar={onReintentar} />
  }

  const d = res.data
  const ver = VEREDICTO_META[d.apto_para_ong.veredicto] ?? VEREDICTO_META.indeterminado

  return (
    <div
      style={{
        marginTop: 8,
        border: `1px solid ${ACCENT}33`,
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: 10,
        background: '#F6FDF9',
        padding: '14px 16px',
      }}
    >
      {/* Cabecera del análisis · vía + disclaimer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: ACCENT, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          ◈ Requisitos extraídos por IA
          {res.via && <span style={{ fontWeight: 500, opacity: 0.7 }}> · vía {res.via === 'pdf_nativo' ? 'PDF nativo' : 'texto'}</span>}
          {res.formato && <span style={{ fontWeight: 500, opacity: 0.7 }}> · {res.formato.toUpperCase()}</span>}
        </p>
        <button
          type="button"
          onClick={onReintentar}
          title="Volver a analizar (ignora caché)"
          style={{ background: 'transparent', border: '1px solid #CBD5E1', borderRadius: 7, padding: '3px 9px', fontSize: 10, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ↻ Reanalizar
        </button>
      </div>

      {/* Veredicto apto-para-ONG */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '10px 12px',
          background: `${ver.color}10`,
          border: `1px solid ${ver.color}33`,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <span aria-hidden="true" style={{ color: ver.color, fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{ver.glyph}</span>
        <div>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: ver.color }}>{ver.label}</p>
          {d.apto_para_ong.motivo && (
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>{d.apto_para_ong.motivo}</p>
          )}
        </div>
      </div>

      {/* Objeto + resumen */}
      {d.objeto && <Bloque label="Objeto del contrato">{d.objeto}</Bloque>}
      {d.resumen && d.resumen !== d.objeto && <Bloque label="Resumen ejecutivo">{d.resumen}</Bloque>}

      {/* Cifras clave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, margin: '10px 0' }}>
        <Cifra label="Presupuesto base (c/IVA)" value={eur(d.presupuesto_base)} />
        <Cifra label="Valor estimado (s/IVA)" value={eur(d.valor_estimado)} />
        <Cifra label="Plazo presentación" value={d.plazos.presentacion || '—'} small />
        <Cifra label="Plazo ejecución" value={d.plazos.ejecucion || '—'} small />
      </div>

      {/* Criterios de adjudicación con pesos */}
      {d.criterios.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={subLabel}>Criterios de adjudicación</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
            {(() => {
              const maxPeso = Math.max(1, ...d.criterios.map((c) => c.peso ?? 0))
              return d.criterios.map((c, i) => {
                const pct = c.peso != null ? Math.round((c.peso / maxPeso) * 100) : 0
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: '#334155', flex: 1, minWidth: 0 }}>{c.nombre}</span>
                    <span style={{ width: 90, height: 6, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: ACCENT, borderRadius: 999 }} />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.peso != null ? ACCENT : '#94a3b8', fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'right' }}>
                      {c.peso != null ? `${c.peso}` : '—'}
                    </span>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Solvencia */}
      {(d.solvencia.economica || d.solvencia.tecnica) && (
        <div style={{ marginBottom: 12 }}>
          <p style={subLabel}>Solvencia exigida</p>
          {d.solvencia.economica && <Bloque label="Económica y financiera">{d.solvencia.economica}</Bloque>}
          {d.solvencia.tecnica && <Bloque label="Técnica y profesional">{d.solvencia.tecnica}</Bloque>}
        </div>
      )}

      {/* Lotes */}
      {d.lotes.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={subLabel}>Lotes ({d.lotes.length})</p>
          <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.lotes.map((l, i) => (
              <li key={i} style={{ fontSize: 11.5, color: '#334155', display: 'flex', gap: 8 }}>
                <span style={{ fontWeight: 700, color: ACCENT, minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>{l.numero || `#${i + 1}`}</span>
                <span style={{ flex: 1 }}>{l.descripcion || '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pie de datos: CPV · garantías · lugar · idioma */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {d.cpv.map((c) => (
          <span key={c} style={chipMono}>CPV {c}</span>
        ))}
        {d.lugar && <span style={chipMeta}>Lugar: {d.lugar}</span>}
        {d.idioma && <span style={chipMeta}>Idioma: {d.idioma}</span>}
      </div>
      {d.garantias && <Bloque label="Garantías">{d.garantias}</Bloque>}

      {/* Disclaimer permanente */}
      <p style={{ margin: '10px 0 0', fontSize: 9.5, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.5, borderTop: '1px dashed #E2E8F0', paddingTop: 8 }}>
        Contenido generado por IA (Google Gemini) a partir del documento. Orientativo: verificar siempre contra el pliego oficial antes de tomar decisiones.
        {res.fetched_at ? ` · ${new Date(res.fetched_at).toLocaleString('es-ES')}` : ''}
      </p>
    </div>
  )
}

function AnalisisError({ msg, nota, onReintentar }: { msg: string; nota?: string; onReintentar: () => void }) {
  return (
    <div style={{ marginTop: 8, padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '3px solid #DC2626', borderRadius: 8 }}>
      <p style={{ margin: 0, fontSize: 11.5, color: '#991B1B', fontWeight: 600 }}>
        <span aria-hidden="true">▲</span> {msg}
      </p>
      {nota && <p style={{ margin: '4px 0 0', fontSize: 10.5, color: '#B91C1C', opacity: 0.85 }}>{nota}</p>}
      <button
        type="button"
        onClick={onReintentar}
        style={{ marginTop: 8, background: '#fff', border: '1px solid #FECACA', borderRadius: 7, padding: '4px 10px', fontSize: 10.5, color: '#991B1B', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        ↻ Reintentar
      </button>
    </div>
  )
}

function Bloque({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#1e293b', lineHeight: 1.5 }}>{children}</p>
    </div>
  )
}

function Cifra({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 10px' }}>
      <p style={{ margin: 0, fontSize: 8.5, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '3px 0 0', fontSize: small ? 11.5 : 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.25, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  )
}

const subLabel: React.CSSProperties = { margin: 0, fontSize: 9.5, color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }
const chipMono: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: '#475569', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: '2px 8px', fontVariantNumeric: 'tabular-nums' }
const chipMeta: React.CSSProperties = { fontSize: 10, color: '#64748b', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 6, padding: '2px 8px' }

export default LicAnalisisPliego
