/**
 * <SourceFooter /> · Sprint Geo-FIX
 *
 * Footer compacto que se renderiza al pie de cada bloque del perfil país
 * con la metadata de la fuente: nombre, tipo de acceso, qué mide,
 * confianza y URL original. Persigue el "diseño de producto profesional"
 * que pidió el usuario: cada dato debe poder auditarse.
 */
'use client'

interface SourceMeta {
  id: string
  name: string
  access_type: string
  source_url: string
  last_updated?: string
  what_it_measures: string
  confidence: 'high' | 'medium' | 'low' | 'unknown'
}

interface Props {
  source: SourceMeta
  /** Si tu bloque tiene su propio timestamp, pásalo aquí. Sobreescribe el del source. */
  customLastUpdated?: string
}

function accessTypeLabel(t: string): string {
  const m: Record<string, string> = {
    public_api_no_key: 'API pública',
    public_feed_no_key: 'RSS público',
    public_static_file: 'Archivo público',
    requires_api_key: 'Requiere API key',
    requires_token: 'Requiere token',
    requires_appname: 'Requiere appname',
    internal_derived: 'Cálculo interno',
    curated_baseline: 'Baseline curado',
    optional_llm_key: 'LLM opcional',
  }
  return m[t] || t
}

function confidenceLabel(c: string): { label: string; color: string } {
  if (c === 'high') return { label: 'Alta', color: '#16a34a' }
  if (c === 'medium') return { label: 'Media', color: '#f59e0b' }
  if (c === 'low') return { label: 'Baja', color: '#dc2626' }
  return { label: 'Desconocida', color: '#94a3b8' }
}

export function SourceFooter({ source, customLastUpdated }: Props) {
  const conf = confidenceLabel(source.confidence)
  const updated = customLastUpdated || source.last_updated
  return (
    <div style={{
      marginTop: 12,
      paddingTop: 8,
      borderTop: '1px dashed #e5e7eb',
      fontSize: 9.5,
      color: '#64748b',
      lineHeight: 1.45,
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
        <span>
          <strong style={{ color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 9 }}>
            Fuente:
          </strong>{' '}
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{source.name}</span>
        </span>
        <span>
          <strong style={{ color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 9 }}>
            Acceso:
          </strong>{' '}
          {accessTypeLabel(source.access_type)}
        </span>
        <span>
          <strong style={{ color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 9 }}>
            Confianza:
          </strong>{' '}
          <span style={{ color: conf.color, fontWeight: 600 }}>{conf.label}</span>
        </span>
        {updated && (
          <span>
            <strong style={{ color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 9 }}>
              Actualizado:
            </strong>{' '}
            <span style={{ fontFamily: 'ui-monospace, monospace' }}>{updated.slice(0, 10)}</span>
          </span>
        )}
      </div>
      <p style={{ margin: '4px 0 0', color: '#64748b', fontStyle: 'italic' }}>
        Qué mide: {source.what_it_measures}
      </p>
      {source.source_url && (
        <p style={{ margin: '3px 0 0' }}>
          <a
            href={source.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1e40af', fontSize: 9.5, textDecoration: 'underline' }}
          >
            ↗ Fuente original
          </a>
        </p>
      )}
    </div>
  )
}

export default SourceFooter
