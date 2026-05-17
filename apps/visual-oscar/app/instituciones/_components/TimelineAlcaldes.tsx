'use client'
/**
 * Timeline vertical de alcaldes históricos.
 * Cada hito muestra foto, nombre, partido, periodo.
 */
interface AlcaldeHistorico {
  qid: string
  nombre: string
  partido: string | null
  inicio: string | null
  fin: string | null
  fotoUrl: string | null
  wikipediaUrl: string | null
}

const PARTY_COLOR: Record<string, string> = {
  'PP': '#1F4E8C', 'Partido Popular': '#1F4E8C',
  'PSOE': '#E1322D', 'Partido Socialista': '#E1322D', 'PSC': '#E1322D', 'PSE-EE': '#E1322D', 'PSdeG': '#E1322D',
  'VOX': '#5BA02E',
  'Sumar': '#D43F8D', 'Podemos': '#7C3AED',
  'Junts': '#1FA89B', 'ERC': '#E8A030', 'CUP': '#FFCC00',
  'PNV': '#7DB94B', 'EH Bildu': '#3F7A3A',
  'BNG': '#5BB3D9', 'CC': '#F2C43A', 'CiU': '#1FA89B', 'CDC': '#1FA89B',
  'IU': '#A02525', 'UCD': '#FF6F00', 'AP': '#1F4E8C',
}

function colorPartido(p: string | null): string {
  if (!p) return '#9CA3AF'
  for (const k of Object.keys(PARTY_COLOR)) {
    if (p.includes(k)) return PARTY_COLOR[k]
  }
  return '#525258'
}

function fmtFecha(d: string | null, fallback: string): string {
  if (!d) return fallback
  const año = d.slice(0, 4)
  return año
}

export function TimelineAlcaldes({ alcaldes }: { alcaldes: AlcaldeHistorico[] }) {
  if (alcaldes.length === 0) {
    return <p style={{ fontSize: 11.5, color: '#9CA3AF', fontStyle: 'italic' }}>Sin histórico disponible en Wikidata</p>
  }
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', position: 'relative' }}>
      {/* Línea vertical */}
      <div style={{ position: 'absolute', left: 24, top: 8, bottom: 8, width: 2, background: '#ECECEF' }}/>
      {alcaldes.map((a, i) => {
        const colorP = colorPartido(a.partido)
        const enActivo = !a.fin
        return (
          <li key={a.qid + i} style={{ position: 'relative', paddingLeft: 60, paddingBottom: 14, minHeight: 60 }}>
            {/* Dot + foto */}
            <div style={{ position: 'absolute', left: 8, top: 0, width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: `2.5px solid ${colorP}`, background: '#fff', boxShadow: '0 0 0 2px #fff' }}>
              {a.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.fotoUrl} alt={a.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colorP, color: '#fff', fontSize: 12, fontWeight: 700 }}>
                  {a.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
              )}
            </div>
            {/* Card */}
            <div style={{ padding: '8px 12px', background: enActivo ? `${colorP}10` : '#FAFAFA', borderRadius: 8, borderLeft: `3px solid ${colorP}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>
                  {a.wikipediaUrl ? (
                    <a href={a.wikipediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{a.nombre}</a>
                  ) : a.nombre}
                </span>
                {enActivo && (
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: '#16A34A', color: '#fff', fontWeight: 700, letterSpacing: '0.04em' }}>EN ACTIVO</span>
                )}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 10.5, color: '#3a3a3d', display: 'flex', gap: 6, alignItems: 'center' }}>
                {a.partido && <span style={{ padding: '1px 5px', borderRadius: 3, background: `${colorP}25`, color: colorP, fontWeight: 700, fontSize: 9.5 }}>{a.partido}</span>}
                <span style={{ color: '#6e6e73' }}>
                  {fmtFecha(a.inicio, '?')} – {fmtFecha(a.fin, 'actualidad')}
                </span>
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
