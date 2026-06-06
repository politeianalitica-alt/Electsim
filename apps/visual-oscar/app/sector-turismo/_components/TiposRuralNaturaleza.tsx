'use client'
/**
 * <TiposRuralNaturaleza /> · Turismo v3 · Sprint T7 · DATO VIVO
 *
 * Turismo rural y de naturaleza. Combina:
 *   - `/api/turismo/ocupacion` → tipo 'rural' (EOTR · Encuesta de Ocupación en
 *     Alojamientos de Turismo Rural): pernoctaciones + serie, grado de ocupación
 *     y estancia media (INE, dato vivo mensual).
 *   - `/api/turismo/destinos?tipo=rural` + `?tipo=naturaleza` → destinos de
 *     interior y espacios naturales (Picos de Europa, Rías Baixas, Sierra de
 *     Cazorla, La Rioja enoturística…), enriquecidos con pernoct. por CCAA.
 *
 * Degradación honesta por bloque. Cero emojis · Unicode.
 */
import { SerieLineChart } from '@/components/SectorialWidgets'
import {
  ACCENT,
  ACCENT_DARK,
  TiposPanelHeader,
  TiposStatGrid,
  TiposCard,
  TiposNote,
  TiposErrorState,
  useEnvelope,
  fmt,
  fmtCompact,
  type Stat,
} from './TiposShared'

interface InePoint {
  period: string
  value: number | null
}
interface OcupacionTipo {
  tipo: string
  label: string
  pernoctaciones: number | null
  serie_pernoctaciones: InePoint[]
  grado_ocupacion_pct: number | null
  estancia_media: number | null
  last_period: string | null
}
interface OcupacionData {
  tipos: OcupacionTipo[]
  last_period: string | null
}

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
}

export function TiposRuralNaturaleza() {
  const ocupQ = useEnvelope<OcupacionData>('/api/turismo/ocupacion')
  const ruralQ = useEnvelope<DestinosData>('/api/turismo/destinos?tipo=rural')
  const natQ = useEnvelope<DestinosData>('/api/turismo/destinos?tipo=naturaleza')

  const rural = ocupQ.data?.tipos?.find((t) => t.tipo === 'rural') ?? null
  const ocupFailed = ocupQ.state === 'error' && !ocupQ.data

  // Unión de destinos rural + naturaleza (sin duplicar por slug).
  const dest = new Map<string, DestinoEnriquecido>()
  for (const d of ruralQ.data?.destinos ?? []) dest.set(d.slug, d)
  for (const d of natQ.data?.destinos ?? []) if (!dest.has(d.slug)) dest.set(d.slug, d)
  const destinos = Array.from(dest.values()).sort(
    (a, b) => (b.pernoctaciones_ccaa ?? -1) - (a.pernoctaciones_ccaa ?? -1),
  )

  const stats: Stat[] = [
    {
      label: `Pernoctaciones rural (${rural?.last_period ?? '—'})`,
      value: fmtCompact(rural?.pernoctaciones),
      foot: 'INE EOTR · turismo rural',
    },
    {
      label: 'Grado de ocupación',
      value: rural?.grado_ocupacion_pct != null ? `${fmt(rural.grado_ocupacion_pct, 1)}%` : '—',
      foot: 'por plazas',
      color: '#0E7490',
    },
    {
      label: 'Estancia media',
      value: rural?.estancia_media != null ? `${fmt(rural.estancia_media, 1)}` : '—',
      foot: 'noches',
      color: ACCENT,
    },
    {
      label: 'Destinos rural / naturaleza',
      value: String(destinos.length || '—'),
      foot: 'catálogo de destinos',
      color: '#15803D',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TiposCard>
        <TiposPanelHeader
          glyph="⬡"
          title="Turismo rural y de naturaleza"
          desc="Casas rurales, interior y espacios naturales. Es el contrapunto desestacionalizador y de menor presión del modelo turístico. La ocupación de los alojamientos de turismo rural se mide en vivo con la EOTR del INE."
          kind="live"
          degraded={ocupQ.env?.partial}
          fuentes={['INE EOTR (ocupación rural)', 'Catálogo destinos + Eurostat NUTS2']}
        />
        {ocupFailed && !destinos.length ? (
          <TiposErrorState fuente="INE EOTR / catálogo destinos" />
        ) : (
          <TiposStatGrid items={stats} loading={ocupQ.state === 'loading' && !ocupQ.data} />
        )}
      </TiposCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <TiposCard>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>
            Pernoctaciones en turismo rural · serie INE
          </div>
          {ocupFailed ? (
            <TiposErrorState fuente="INE EOTR" />
          ) : (
            <SerieLineChart
              points={(rural?.serie_pernoctaciones ?? []).map((p) => ({ t: p.period, v: p.value }))}
              color="#15803D"
              height={170}
              formatY={(n) => `${(n / 1000).toFixed(0)}k`}
              unit="pernoct."
              label="Rural"
            />
          )}
          <TiposNote>
            INE · Encuesta de Ocupación en Alojamientos de Turismo Rural (EOTR), dato mensual nacional.
            La comparativa con hoteles, apartamentos y campings vive en la pestaña Alojamiento.
          </TiposNote>
        </TiposCard>

        <TiposCard>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>
            Destinos de interior y naturaleza
          </div>
          {ruralQ.state === 'error' && natQ.state === 'error' && !destinos.length ? (
            <TiposErrorState fuente="catálogo destinos" />
          ) : !destinos.length ? (
            <div style={{ color: '#86868b', fontSize: 12, padding: 16 }}>Cargando destinos…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {destinos.map((d) => (
                <div
                  key={d.slug}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#F8FAFC', border: '1px solid #ECECEF', borderRadius: 9 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f' }}>{d.nombre}</div>
                    <div style={{ fontSize: 10, color: '#86868b' }}>{d.ccaa} · {d.tipo.join(' · ')}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: ACCENT_DARK, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtCompact(d.pernoctaciones_ccaa)}
                    </div>
                    <div style={{ fontSize: 9, color: d.live ? '#047857' : '#a1a1aa' }}>
                      {d.live ? '◉ pernoct. CCAA' : '◍ catálogo'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <TiposNote>
            Destinos de los tipos rural y naturaleza del catálogo, enriquecidos con pernoctaciones por CCAA en vivo
            (Eurostat). La pernoctación es a nivel de comunidad, no del paraje concreto.
          </TiposNote>
        </TiposCard>
      </div>
    </div>
  )
}

export default TiposRuralNaturaleza
