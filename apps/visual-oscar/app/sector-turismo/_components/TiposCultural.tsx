'use client'
/**
 * <TiposCultural /> · Turismo v3 · Sprint T7 · DATO VIVO + CURADO
 *
 * Turismo cultural: ciudades patrimonio, museos y festivales. Mixto:
 *   - DATO VIVO: `/api/turismo/destinos?tipo=cultural` (destinos culturales del
 *     catálogo enriquecidos con pernoctaciones por CCAA, Eurostat).
 *   - CURADO + DATADO: contexto de patrimonio (50 bienes UNESCO) y grandes
 *     museos (CULTURAL_FICHAS), con fuente + fecha.
 *
 * Cero emojis · Unicode.
 */
import {
  ACCENT_DARK,
  TiposPanelHeader,
  TiposStatGrid,
  TiposCard,
  TiposNote,
  TiposErrorState,
  TiposFicha,
  TiposFichaGrid,
  useEnvelope,
  fmtCompact,
  type Stat,
} from './TiposShared'
import { CULTURAL_FICHAS } from './TiposCatalog'

interface DestinoEnriquecido {
  slug: string
  nombre: string
  ccaa: string
  tipo: string[]
  pernoctaciones_ccaa: number | null
  live: boolean
}
interface DestinosData {
  destinos: DestinoEnriquecido[]
  n_live: number
  n_total: number
}

export function TiposCultural() {
  const q = useEnvelope<DestinosData>('/api/turismo/destinos?tipo=cultural')
  const destinos = (q.data?.destinos ?? []).slice().sort(
    (a, b) => (b.pernoctaciones_ccaa ?? -1) - (a.pernoctaciones_ccaa ?? -1),
  )
  const failed = q.state === 'error' && !q.data

  const stats: Stat[] = [
    { label: 'Destinos culturales', value: String(q.data?.n_total ?? '—'), foot: 'catálogo de destinos' },
    { label: 'Con demanda viva', value: String(q.data?.n_live ?? '—'), foot: 'Eurostat NUTS2', color: '#047857' },
    { label: 'Bienes UNESCO en España', value: '50', foot: 'Patrimonio Mundial', color: ACCENT_DARK },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TiposCard>
        <TiposPanelHeader
          glyph="◈"
          title="Turismo cultural"
          desc="Ciudades patrimonio, museos y festivales. España es una de las grandes potencias mundiales de patrimonio (50 bienes UNESCO). Se combinan los destinos culturales con demanda viva (Eurostat) y el contexto curado de patrimonio y museos."
          kind="mixto"
          fuentes={['Catálogo destinos + Eurostat NUTS2', 'UNESCO', 'Museos nacionales']}
        />
        {failed ? <TiposErrorState fuente="catálogo + Eurostat destinos" /> : <TiposStatGrid items={stats} loading={q.state === 'loading' && !q.data} />}
      </TiposCard>

      <TiposCard>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>
          Destinos culturales · demanda por CCAA
        </div>
        {failed ? (
          <TiposErrorState fuente="catálogo + Eurostat destinos" />
        ) : !destinos.length ? (
          <div style={{ color: '#86868b', fontSize: 12, padding: 16 }}>Cargando destinos…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {destinos.map((d) => (
              <div
                key={d.slug}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 11px', background: '#F8FAFC', border: '1px solid #ECECEF', borderRadius: 9 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nombre}</div>
                  <div style={{ fontSize: 9.5, color: '#86868b' }}>{d.ccaa}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT_DARK, fontVariantNumeric: 'tabular-nums' }}>{fmtCompact(d.pernoctaciones_ccaa)}</div>
                  <div style={{ fontSize: 8.5, color: d.live ? '#047857' : '#a1a1aa' }}>{d.live ? '◉ vivo' : '◍ catálogo'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <TiposNote>
          Pernoctaciones de la CCAA del destino (Eurostat tour_occ_nin2c). No existe una serie pública abierta de
          visitantes por monumento o museo armonizada; el contexto curado de patrimonio y museos se muestra abajo.
        </TiposNote>
      </TiposCard>

      <TiposCard>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>
          Patrimonio y museos · contexto curado
        </div>
        <TiposFichaGrid>
          {CULTURAL_FICHAS.map((f) => (
            <TiposFicha key={f.titulo} {...f} />
          ))}
        </TiposFichaGrid>
      </TiposCard>
    </div>
  )
}

export default TiposCultural
