'use client'
/**
 * <TiposCruceros /> · Turismo v3 · Sprint T7 · DATO VIVO (cross-source)
 *
 * Cruceros: España es la primera potencia del Mediterráneo (Barcelona, Baleares,
 * Canarias, Málaga, Valencia, Cádiz). Consume `/api/turismo/cruceros`
 *   → { puertos:[{ puerto, pasajeros_crucero, escalas, homeport_pct, ccaa,
 *       port_slug }], total_pasajeros, anio_ref }.
 *
 * ── PRINCIPIO ANTI-DUPLICACIÓN (spec / CLAUDE.md) ──────────────────────────
 * NO se duplica el módulo de Puertos. Este panel muestra el ÁNGULO TURÍSTICO
 * (pasajeros de crucero por puerto) y ENLAZA al módulo /puertos para el detalle
 * portuario (tráfico, AIS, terminales). Cada puerto con `port_slug` enlaza a
 * /puertos/[slug]; el resto, a /puertos. Cero emojis · Unicode.
 */
import Link from 'next/link'
import {
  ACCENT,
  ACCENT_DARK,
  TiposPanelHeader,
  TiposStatGrid,
  TiposBar,
  TiposCard,
  TiposNote,
  TiposErrorState,
  useEnvelope,
  fmt,
  fmtCompact,
  type Stat,
  type BarDatum,
} from './TiposShared'

interface CruisePort {
  puerto: string
  pasajeros_crucero: number | null
  escalas?: number | null
  homeport_pct?: number | null
  ccaa?: string
  port_slug?: string | null
}
interface CrucerosData {
  anio_ref: number | null
  puertos: CruisePort[]
  total_pasajeros: number | null
  cruzados_con_puertos: number
  nota: string
}

export function TiposCruceros() {
  const q = useEnvelope<CrucerosData>('/api/turismo/cruceros')
  const failed = q.state === 'error' && !q.data
  const puertos = (q.data?.puertos ?? []).slice().sort((a, b) => (b.pasajeros_crucero ?? 0) - (a.pasajeros_crucero ?? 0))
  const lider = puertos[0]
  const totalEscalas = puertos.reduce((s, p) => s + (p.escalas ?? 0), 0) || null

  const stats: Stat[] = [
    {
      label: `Pasajeros de crucero (${q.data?.anio_ref ?? '—'})`,
      value: fmtCompact(q.data?.total_pasajeros),
      foot: 'suma puertos del top',
    },
    {
      label: 'Puerto líder',
      value: lider?.puerto ?? '—',
      foot: lider ? `${fmtCompact(lider.pasajeros_crucero)} pax` : undefined,
      color: ACCENT,
    },
    {
      label: 'Escalas de crucero',
      value: fmtCompact(totalEscalas),
      foot: 'buques · año de ref.',
      color: '#0E7490',
    },
    {
      label: 'Homeport líder (Barcelona)',
      value: lider?.homeport_pct != null ? `${fmt(lider.homeport_pct, 0)}%` : '—',
      foot: 'embarque/desembarque',
      color: '#B45309',
    },
  ]

  const bars: BarDatum[] = puertos
    .filter((p) => p.pasajeros_crucero != null)
    .slice(0, 12)
    .map((p) => ({ name: p.puerto, value: p.pasajeros_crucero as number }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TiposCard>
        <TiposPanelHeader
          glyph="⚓"
          title="Cruceros"
          desc="Tráfico de pasajeros de crucero por puerto español. Barcelona es el principal homeport de Europa; junto con Baleares, Canarias, Málaga, Valencia y Cádiz concentra el grueso del crucerismo mediterráneo. El detalle portuario (tráfico, AIS, terminales) vive en el módulo Puertos."
          kind="live"
          fuentes={['Puertos del Estado · tráfico de pasajeros', 'Módulo Puertos (cross-link)']}
        />
        {failed ? <TiposErrorState fuente="Puertos del Estado (cruceros)" /> : <TiposStatGrid items={stats} loading={q.state === 'loading' && !q.data} />}
        <div style={{ marginTop: 12 }}>
          <Link
            href="/puertos"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              fontWeight: 600,
              color: '#fff',
              background: ACCENT_DARK,
              borderRadius: 999,
              padding: '7px 14px',
              textDecoration: 'none',
            }}
          >
            Abrir módulo Puertos ⟶
          </Link>
          <span style={{ marginLeft: 10, fontSize: 10.5, color: '#86868b' }}>
            tráfico marítimo, AIS y terminales (no se duplica aquí)
          </span>
        </div>
      </TiposCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <TiposCard>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>
            Pasajeros de crucero por puerto
          </div>
          {failed ? <TiposErrorState fuente="Puertos del Estado (cruceros)" /> : <TiposBar data={bars} unit="pasajeros" />}
          <TiposNote>{q.data?.nota ?? 'Puertos del Estado · tráfico de pasajeros de crucero.'}</TiposNote>
        </TiposCard>

        <TiposCard>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>
            Detalle por puerto
          </div>
          {failed ? (
            <TiposErrorState fuente="Puertos del Estado (cruceros)" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#86868b', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '5px 6px', fontWeight: 700 }}>Puerto</th>
                    <th style={{ padding: '5px 6px', fontWeight: 700, textAlign: 'right' }}>Pasajeros</th>
                    <th style={{ padding: '5px 6px', fontWeight: 700, textAlign: 'right' }}>Escalas</th>
                    <th style={{ padding: '5px 6px', fontWeight: 700, textAlign: 'right' }}>Homeport</th>
                    <th style={{ padding: '5px 6px', fontWeight: 700, textAlign: 'right' }}>Puertos</th>
                  </tr>
                </thead>
                <tbody>
                  {puertos.map((p) => (
                    <tr key={p.puerto} style={{ borderTop: '1px solid #F0F0F1' }}>
                      <td style={{ padding: '6px', fontWeight: 600, color: '#1d1d1f' }}>
                        {p.puerto}
                        {p.ccaa && <span style={{ display: 'block', fontSize: 9, color: '#a1a1aa', fontWeight: 400 }}>{p.ccaa}</span>}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: ACCENT_DARK, fontWeight: 600 }}>
                        {fmtCompact(p.pasajeros_crucero)}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#52525B' }}>
                        {fmt(p.escalas ?? null, 0)}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#52525B' }}>
                        {p.homeport_pct != null ? `${fmt(p.homeport_pct, 0)}%` : '—'}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>
                        {p.port_slug ? (
                          <Link href={`/puertos/${p.port_slug}`} style={{ fontSize: 10, fontWeight: 600, color: ACCENT_DARK, textDecoration: 'none', borderBottom: `1px solid ${ACCENT}` }}>
                            ver ↗
                          </Link>
                        ) : (
                          <span style={{ fontSize: 10, color: '#cbcbd1' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TiposNote>
            Homeport = proporción de pasajeros que embarcan/desembarcan (vs tránsito). Los puertos con enlace tienen
            ficha en el módulo Puertos. Cruzados con Puertos: {q.data?.cruzados_con_puertos ?? 0}.
          </TiposNote>
        </TiposCard>
      </div>
    </div>
  )
}

export default TiposCruceros
