'use client'
/**
 * <TiposUrbano /> · Turismo v3 · Sprint T7 · DATO VIVO
 *
 * Turismo urbano (ciudad): grandes capitales y city-breaks (Madrid, Barcelona,
 * Sevilla, València, Bilbao, Málaga, Granada…). Consume
 * `/api/turismo/destinos?tipo=ciudad`, que enriquece el catálogo de destinos con
 * pernoctaciones por CCAA en vivo (Eurostat NUTS2). Cada destino marca `live` →
 * la tabla distingue honestamente dato vivo vs solo catálogo.
 *
 * Nota anti-duplicación: la pernoctación es a nivel de CCAA (no de ciudad: no hay
 * fuente pública abierta de pernoctaciones por municipio armonizada), por eso se
 * etiqueta como "pernoct. CCAA". Cero emojis · Unicode.
 */
import {
  ACCENT,
  ACCENT_DARK,
  TiposPanelHeader,
  TiposStatGrid,
  TiposCard,
  TiposNote,
  TiposErrorState,
  useEnvelope,
  fmtCompact,
  type Stat,
} from './TiposShared'

interface DestinoEnriquecido {
  slug: string
  nombre: string
  ccaa: string
  tipo: string[]
  pernoctaciones_ccaa: number | null
  pernoctaciones_period: string | null
  live: boolean
}
interface DestinosData {
  destinos: DestinoEnriquecido[]
  n_live: number
  n_total: number
  pernoctaciones_source: 'eurostat' | 'ccaa-lib' | 'unavailable'
  nota: string
}

export function TiposUrbano() {
  const q = useEnvelope<DestinosData>('/api/turismo/destinos?tipo=ciudad')
  const destinos = (q.data?.destinos ?? []).slice().sort(
    (a, b) => (b.pernoctaciones_ccaa ?? -1) - (a.pernoctaciones_ccaa ?? -1),
  )
  const failed = q.state === 'error' && !q.data

  const stats: Stat[] = [
    { label: 'Ciudades en catálogo', value: String(q.data?.n_total ?? '—'), foot: 'destinos urbanos Politeia' },
    { label: 'Con pernoctaciones vivas', value: String(q.data?.n_live ?? '—'), foot: 'Eurostat NUTS2', color: '#047857' },
    {
      label: 'Fuente de demanda',
      value: q.data?.pernoctaciones_source === 'unavailable' ? 'No disp.' : 'Eurostat',
      foot: q.data?.pernoctaciones_source === 'unavailable' ? 'degradado a catálogo' : 'pernoct. por CCAA',
      color: ACCENT,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TiposCard>
        <TiposPanelHeader
          glyph="◳"
          title="Turismo urbano"
          desc="City-breaks y turismo de capital. Las grandes ciudades concentran turismo cultural, de negocios y de compras, y desestacionalizan la demanda frente al sol y playa. La demanda se mide por pernoctaciones de la CCAA del destino (Eurostat, dato vivo)."
          kind="live"
          degraded={q.data?.pernoctaciones_source === 'unavailable'}
          fuentes={['Catálogo destinos Politeia', 'Eurostat · tour_occ_nin2c (NUTS2)']}
        />
        {failed ? <TiposErrorState fuente="catálogo + Eurostat destinos" /> : <TiposStatGrid items={stats} loading={q.state === 'loading' && !q.data} />}
      </TiposCard>

      <TiposCard>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>
          Destinos urbanos
        </div>
        {failed ? (
          <TiposErrorState fuente="catálogo + Eurostat destinos" />
        ) : q.state === 'loading' && !q.data ? (
          <div style={{ color: '#86868b', fontSize: 12, padding: 16 }}>Cargando destinos…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#86868b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 700 }}>Destino</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700 }}>Comunidad</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700 }}>Perfil</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right' }}>Pernoct. CCAA</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right' }}>Dato</th>
                </tr>
              </thead>
              <tbody>
                {destinos.map((d) => (
                  <tr key={d.slug} style={{ borderTop: '1px solid #F0F0F1' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 600, color: '#1d1d1f' }}>{d.nombre}</td>
                    <td style={{ padding: '7px 8px', color: '#52525B' }}>{d.ccaa}</td>
                    <td style={{ padding: '7px 8px', color: '#86868b', fontSize: 11 }}>
                      {d.tipo.filter((t) => t !== 'ciudad').join(' · ') || '—'}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: ACCENT_DARK, fontWeight: 600 }}>
                      {fmtCompact(d.pernoctaciones_ccaa)}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 999,
                          background: d.live ? '#ECFDF5' : '#F5F5F7',
                          color: d.live ? '#047857' : '#a1a1aa',
                          border: `1px solid ${d.live ? '#A7F3D0' : '#E4E4E7'}`,
                        }}
                      >
                        {d.live ? `◉ ${d.pernoctaciones_period ?? 'vivo'}` : '◍ catálogo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TiposNote>
          La pernoctación se atribuye a la CCAA del destino (Eurostat tour_occ_nin2c, NUTS2): no existe una fuente pública
          armonizada de pernoctaciones por municipio. El detalle por comunidad y la presión turística se exploran en la
          pestaña Destinos. {q.data?.nota}
        </TiposNote>
      </TiposCard>
    </div>
  )
}

export default TiposUrbano
