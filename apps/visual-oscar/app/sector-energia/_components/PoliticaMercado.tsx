'use client'
/**
 * <PoliticaMercado /> · Sprint Energía · EN4
 *
 * Bloque MERCADO REGULADO de la pestaña Política energética. Catálogo CURADO +
 * DATADO (lib/energia/politica-data.ts): PVPC, peajes/cargos, impuestos
 * energéticos (IEE 5,11 %, IVA, IVPEE "impuesto de generación" 7 %) y bono
 * social. Recibe la data por prop (orquestada en PoliticaView) o la auto-fetchea
 * de /api/energia/politica.
 *
 * Un Panel con tabla agrupada por bloque: concepto / valor / descripción /
 * fecha de referencia, con enlace oficial por concepto. Degradación honesta
 * (CLAUDE.md). Cero emojis · Unicode (◦ ↗). ACCENT verde energía '#16A34A'.
 */
import { useEffect, useState } from 'react'
import { Panel } from '@/components/SectorPanel'

const ACCENT = '#16A34A'

// ─── Tipos del envelope (espejo de lib/energia/politica-data.ts) ─────────────
interface ConceptoMercado {
  concepto: string
  valor_actual: string
  descripcion: string
  fecha_ref: string
  url: string
}
interface MercadoData {
  pvpc: ConceptoMercado[]
  peajes: ConceptoMercado[]
  impuestos: ConceptoMercado[]
  bono_social: ConceptoMercado[]
}
interface PoliticaData {
  ok: boolean
  mercado: MercadoData
  fetched_at: string
}
interface PoliticaEnvelope {
  ok: boolean
  data: PoliticaData | null
  error: string | null
}

const GRUPOS: Array<{ key: keyof MercadoData; label: string }> = [
  { key: 'pvpc', label: 'PVPC · Precio Voluntario para el Pequeño Consumidor' },
  { key: 'peajes', label: 'Peajes de acceso y cargos del sistema' },
  { key: 'impuestos', label: 'Impuestos energéticos' },
  { key: 'bono_social', label: 'Bono social eléctrico y térmico' },
]

export function PoliticaMercado({ data }: { data?: PoliticaData | null }) {
  const [self, setSelf] = useState<PoliticaData | null>(data ?? null)
  const [loading, setLoading] = useState(data == null)

  useEffect(() => {
    if (data !== undefined) {
      setSelf(data ?? null)
      setLoading(false)
      return
    }
    let cancelled = false
    fetch('/api/energia/politica', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<PoliticaEnvelope>) : null))
      .then((j) => {
        if (cancelled) return
        setSelf(j?.data ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const mercado = self?.mercado
  const hayDatos =
    mercado != null &&
    GRUPOS.some((g) => (mercado[g.key] ?? []).length > 0)

  return (
    <Panel
      title="Mercado regulado e impuestos de la energía"
      subtitle="PVPC, peajes y cargos, impuestos (IEE 5,11 % · IVA · IVPEE 7 %) y bono social · valores oficiales vigentes con fecha de referencia"
      marginBottom
      sourceUrl="https://www.miteco.gob.es/es/energia/electricidad.html"
      sourceLabel="MITECO · electricidad"
      sourceTooltip="Mercado eléctrico regulado, peajes, impuestos y bono social"
    >
      {loading ? (
        <div style={{ fontSize: 12, color: '#86868b' }}>Cargando mercado regulado…</div>
      ) : !hayDatos ? (
        <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
          Catálogo de mercado regulado no disponible ahora. Reintenta más tarde.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {GRUPOS.map((g) => {
            const filas = mercado?.[g.key] ?? []
            if (filas.length === 0) return null
            return (
              <div key={g.key}>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: ACCENT,
                  }}
                >
                  ◦ {g.label}
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <Th w={260}>Concepto</Th>
                      <Th w={180}>Valor actual</Th>
                      <Th>Descripción</Th>
                      <Th w={92}>Fecha ref.</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((c, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #F1F1F3' }}>
                        <Td>
                          <a href={c.url} target="_blank" rel="noreferrer" style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 600, lineHeight: 1.35 }}>
                            {c.concepto} <span style={{ fontSize: 9, color: ACCENT, opacity: 0.8 }}>↗</span>
                          </a>
                        </Td>
                        <Td>
                          <span style={{ fontWeight: 700, color: ACCENT, fontFamily: 'var(--font-display)', fontSize: 12.5 }}>{c.valor_actual}</span>
                        </Td>
                        <Td dim>{c.descripcion}</Td>
                        <Td mono>{c.fecha_ref}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
          <p style={{ margin: 0, fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
            Valores oficiales vigentes a la fecha de referencia indicada en cada fila (catálogo curado
            y datado; no se calculan en runtime). Si una cifra oficial cambia, se actualiza la fuente.
          </p>
        </div>
      )}
    </Panel>
  )
}

export default PoliticaMercado

// ─── Tabla ───────────────────────────────────────────────────────────────────
function Th({ children, w }: { children: React.ReactNode; w?: number }) {
  return (
    <th
      style={{
        textAlign: 'left',
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#86868b',
        padding: '0 10px 8px 0',
        width: w,
      }}
    >
      {children}
    </th>
  )
}
function Td({ children, mono, dim }: { children: React.ReactNode; mono?: boolean; dim?: boolean }) {
  return (
    <td
      style={{
        padding: '9px 10px 9px 0',
        verticalAlign: 'top',
        color: dim ? '#6e6e73' : '#3a3a3d',
        fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: mono ? 11 : 12,
        lineHeight: 1.45,
      }}
    >
      {children}
    </td>
  )
}
