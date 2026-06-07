'use client'
/**
 * <FinGrantsUe /> · Tercer Sector v3 · vista Financiación (Sprint TS6)
 *
 * Convocatorias de financiación directa de la UE (SEDIA · EU Funding & Tenders)
 * relevantes para el tercer sector: CERV (Ciudadanía, Igualdad, Derechos y
 * Valores), ESF+ (Fondo Social Europeo+) y Horizon con vertiente social. Cada
 * call enlaza a su ficha (topic page) en la Comisión. Es un PUENTE, no un
 * explorador: el detalle completo de fondos europeos vive en /fondos-europeos.
 *
 * Degradación honesta: si SEDIA falló (ver banda de fuentes_error) la lista llega
 * vacía y se muestra el atajo a /fondos-europeos. Cero emojis · Unicode geométrico.
 */
import Link from 'next/link'
import { ACCENT, fmtEur, fmtFecha, diasHasta, type FinGrantUe } from './FinShared'

/** Etiqueta de programa a partir del comprador ("Comisión Europea · CERV"). */
function programaTag(comprador: string): string | null {
  const c = comprador.toUpperCase()
  if (c.includes('CERV')) return 'CERV'
  if (c.includes('ESF') || c.includes('SOCIAL FUND')) return 'ESF+'
  if (c.includes('HORIZON')) return 'Horizon'
  if (c.includes('ERASMUS')) return 'Erasmus+'
  if (c.includes('LIFE')) return 'LIFE'
  // Si no se reconoce, usamos lo que venga tras el "·".
  const parts = comprador.split('·')
  const tail = parts.length > 1 ? parts[parts.length - 1].trim() : ''
  return tail ? tail.slice(0, 18) : null
}

function plazoBadge(plazo: string | null) {
  const d = diasHasta(plazo)
  if (d == null) return null
  const abierta = d >= 0
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        color: abierta ? '#15803D' : '#9CA3AF',
        background: abierta ? '#F0FDF4' : '#F4F4F5',
        border: `1px solid ${abierta ? '#BBF7D0' : '#E4E4E7'}`,
        borderRadius: 999,
        padding: '1px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {abierta ? `cierra en ${d} d` : 'cerrada'}
    </span>
  )
}

export function FinGrantsUe({ grants, limit = 10 }: { grants: FinGrantUe[]; limit?: number }) {
  // Abiertas primero, después por plazo más próximo; sin plazo al final.
  const rows = [...grants]
    .sort((a, b) => {
      const da = diasHasta(a.plazo)
      const db = diasHasta(b.plazo)
      const ka = da == null ? Infinity : da < 0 ? 1e9 - da : da
      const kb = db == null ? Infinity : db < 0 ? 1e9 - db : db
      return ka - kb
    })
    .slice(0, limit)

  return (
    <div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: '#9CA3AF', padding: '6px 0 12px' }}>
          SEDIA no devolvió calls UE ahora mismo. Consulta el catálogo completo de fondos europeos.
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((g) => {
            const tag = programaTag(g.comprador)
            return (
              <li
                key={g.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 10,
                  alignItems: 'start',
                  background: '#f8fafc',
                  borderRadius: 10,
                  padding: '11px 13px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                    {tag && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          color: '#1D4ED8',
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          borderRadius: 999,
                          padding: '1px 7px',
                        }}
                      >
                        {tag}
                      </span>
                    )}
                    {plazoBadge(g.plazo)}
                  </div>
                  <a
                    href={g.url}
                    target="_blank"
                    rel="noreferrer"
                    title={g.titulo}
                    style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', textDecoration: 'none', display: 'block' }}
                  >
                    {g.titulo}
                  </a>
                  <div style={{ fontSize: 10, color: '#86868b', marginTop: 2 }}>
                    {g.comprador}
                    {g.plazo ? ` · plazo ${fmtFecha(g.plazo)}` : ''}
                    {g.cpv ? ` · CPV ${g.cpv}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtEur(g.valor_eur)}
                  </div>
                  <a
                    href={g.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 10.5, color: '#1D4ED8', textDecoration: 'none', fontWeight: 700 }}
                  >
                    Topic ↗
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5, maxWidth: 460 }}>
          SEDIA · EU Funding &amp; Tenders Portal. Selección con vertiente social (CERV / ESF+ /
          Horizon). El presupuesto de cada call es texto libre en la fuente; puede faltar.
        </p>
        <Link
          href="/fondos-europeos"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: ACCENT,
            textDecoration: 'none',
            border: '1px solid #BBF7D0',
            background: '#F0FDF4',
            borderRadius: 999,
            padding: '5px 12px',
            whiteSpace: 'nowrap',
          }}
        >
          Ver fondos europeos →
        </Link>
      </div>
    </div>
  )
}

export default FinGrantsUe
