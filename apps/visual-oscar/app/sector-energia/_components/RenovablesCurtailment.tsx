'use client'
/**
 * <RenovablesCurtailment /> · Energía v3 · Sprint E4 (Renovables profundo)
 *
 * Curtailment (energía renovable vertida): energía que se podría haber generado
 * pero el operador NO admite por restricciones técnicas de red o exceso de oferta.
 *
 * IMPORTANTE — honestidad de datos (CLAUDE.md §0.4):
 *   ESIOS/REE NO publican un indicador directo de "MWh renovables vertidos" en la
 *   API pública. Por eso esta sección NO inventa una cifra de curtailment. En su
 *   lugar:
 *     1) Explica qué es el curtailment y por qué importa.
 *     2) Si está disponible, muestra como SEÑAL PROXY el coste de restricciones
 *        técnicas (ESIOS id 10095, vía /api/energia/esios-financial) — el coste de
 *        redespacho por congestiones de red, que sube cuando hay más vertido. Se
 *        etiqueta explícitamente como proxy de coste, NO como MWh vertidos.
 *
 * Cero emojis · Unicode.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#16A34A'

interface FinIndicator {
  slug: string
  short: string
  unit: string
  ok: boolean
  last_value: number | null
  last_ts: string | null
  change_24h_pct: number | null
  source_url?: string
}
interface FinResp {
  ok: boolean
  error?: string
  data?: { ajuste?: FinIndicator[]; bilateral?: FinIndicator[] }
}

export function RenovablesCurtailment() {
  const [restr, setRestr] = useState<FinIndicator | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/energia/esios-financial?hours=48', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<FinResp>) : null))
      .then((j) => {
        if (!alive) return
        const hit = j?.data?.ajuste?.find((i) => i.slug === 'restricciones_tecnicas') ?? null
        setRestr(hit && hit.ok && hit.last_value != null ? hit : null)
        setLoaded(true)
      })
      .catch(() => { if (alive) { setRestr(null); setLoaded(true) } })
    return () => { alive = false }
  }, [])

  return (
    <div style={{ fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.6 }}>
      <p style={{ margin: '0 0 10px' }}>
        El <strong style={{ color: '#1d1d1f' }}>curtailment</strong> (o energía vertida) es la generación
        renovable que <em>podría</em> producirse pero el operador del sistema <strong>no admite</strong>:
        bien porque la red no puede evacuarla (congestión de transporte), bien porque en ese instante hay más
        oferta que demanda y no hay dónde almacenarla. Importa porque es energía limpia y barata desperdiciada,
        encarece la transición (peor retorno de las plantas) y es un síntoma de que la red y el almacenamiento
        van por detrás del despliegue renovable.
      </p>

      {/* Señal proxy honesta: coste de restricciones técnicas (NO MWh vertidos). */}
      {restr ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '12px 14px', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: 3 }}>
              Señal proxy · coste de restricciones técnicas
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#1d1d1f', lineHeight: 1 }}>
              {restr.last_value!.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
              <span style={{ fontSize: 11, fontWeight: 600, color: '#86868b', marginLeft: 5 }}>{restr.unit}</span>
            </div>
            {restr.change_24h_pct != null && (
              <div style={{ fontSize: 10, color: restr.change_24h_pct > 0 ? '#92400e' : '#15803d', marginTop: 3 }}>
                {restr.change_24h_pct > 0 ? '+' : ''}{restr.change_24h_pct.toFixed(1)}% vs 24 h antes
              </div>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 10.5, color: '#6e6e73', maxWidth: 380, lineHeight: 1.5 }}>
            Coste de redespacho por congestiones de red (ESIOS · id 10095). Sube cuando hay más restricciones,
            que es cuando suele aumentar el vertido renovable. <strong style={{ color: '#92400e' }}>No es la
            cifra de MWh vertidos</strong> (ESIOS no la publica): solo un indicador correlacionado.
          </p>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#86868b', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '10px 14px' }}>
          {loaded
            ? 'ESIOS no publica el volumen de energía renovable vertida (MWh) en su API pública, y el coste de restricciones técnicas (indicador proxy) tampoco está disponible ahora mismo. No se muestra ninguna cifra de curtailment para no inventarla.'
            : 'Cargando indicador proxy (coste de restricciones técnicas)…'}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 9.5, color: '#86868b', lineHeight: 1.5 }}>
        Nota de honestidad: no existe un indicador público REE/ESIOS de MWh renovables vertidos; esta tarjeta
        es explicativa y, cuando hay dato, usa el coste de restricciones técnicas (
        <a href="https://www.esios.ree.es/es/analisis/10095" target="_blank" rel="noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>ESIOS · id 10095</a>
        ) como señal proxy, sin presentarlo como volumen vertido.
      </div>
    </div>
  )
}

export default RenovablesCurtailment
