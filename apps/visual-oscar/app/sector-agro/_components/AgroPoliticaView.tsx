'use client'
/**
 * <AgroPoliticaView /> · Agro v3 · Sprint A5
 *
 * Tabla de programas activos del sector agroalimentario español + UE
 * leída desde `lib/agro/catalogos/programas.json` con BOE / DOUE.
 */
import { PROGRAMAS_AGRO, REGULADORES_AGRO, PAC_DETALLE, LEGISLACION_AGRO } from '@/lib/agro/catalogos'
import { Panel, SectorHero, Th, Td } from '@/lib/sectores/charts'

const ACCENT = '#16A34A'

export function AgroPoliticaView() {
  const pacMax = Math.max(...PAC_DETALLE.pilares.map((p) => p.eur ?? 0), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="AGRO · POLÍTICA · PAC 2023-2027 + LEGISLACIÓN"
        titulo="Qué políticas y normas mueven al sector"
        descripcion="Plan Estratégico de la PAC 2023-2027 de España (≈47.700 M€), sus ecorregímenes, los programas activos (PERTE, sequía) y el marco legislativo nacional y europeo (Ley de la Cadena, EUDR, Farm to Fork). Cada cifra y norma enlaza a su fuente oficial (FEGA, BOE, EUR-Lex)."
        colorFrom={ACCENT}
        colorTo="#14532D"
      />

      {/* PAC 2023-2027 · dotación por pilares */}
      <Panel
        titulo={`PAC ${PAC_DETALLE.periodo} · dotación para España · ≈${(PAC_DETALLE.total_eur / 1e9).toFixed(1)} bn €`}
        fuente="FEGA + MAPA + Comisión Europea"
        url="https://www.fega.gob.es/"
      >
        <p style={{ fontSize: 11.5, color: '#3a3a3d', margin: '0 0 12px', lineHeight: 1.5 }}>{PAC_DETALLE.total_nota}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PAC_DETALLE.pilares.map((p) => (
            <div key={p.nombre} style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>{p.nombre}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#1F4E8C', whiteSpace: 'nowrap' }}>
                  {p.eur ? `${(p.eur / 1e9).toFixed(1)} bn €` : '—'}
                </span>
              </div>
              <div style={{ height: 6, background: '#ECECEF', borderRadius: 3, overflow: 'hidden', margin: '6px 0' }}>
                <div style={{ height: '100%', width: `${((p.eur ?? 0) / pacMax) * 100}%`, background: ACCENT, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10.5, color: '#86868b', lineHeight: 1.45 }}>{p.nota}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Ecorregímenes */}
      <Panel
        titulo={`Ecorregímenes · ${PAC_DETALLE.ecorregimenes.length} prácticas retribuidas`}
        fuente="MAPA · Plan Estratégico PAC"
        url="https://www.mapa.gob.es/es/pac/pac-2023-2027/"
      >
        <p style={{ fontSize: 11.5, color: '#3a3a3d', margin: '0 0 12px', lineHeight: 1.5 }}>
          Los ecorregímenes son pagos voluntarios anuales (≈1.107 M€/año) que retribuyen prácticas agronómicas beneficiosas
          para el clima, el suelo y la biodiversidad. El agricultor elige las que mejor encajan en su explotación.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {PAC_DETALLE.ecorregimenes.map((e) => (
            <div key={e.nombre} style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>{e.nombre}</div>
              <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 4, lineHeight: 1.45 }}>{e.practica}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        titulo={`Programas activos · ${PROGRAMAS_AGRO.length} líneas`}
        fuente="Catálogo Politeia · BOE + DOUE + portales ministeriales"
        url="https://www.fega.gob.es/"
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #ECECEF' }}>
                <th style={Th}>Programa</th>
                <th style={Th}>Eje</th>
                <th style={{ ...Th, textAlign: 'right' }}>Presupuesto</th>
                <th style={Th}>Vigencia</th>
                <th style={Th}>Fuente</th>
              </tr>
            </thead>
            <tbody>
              {PROGRAMAS_AGRO.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F2F2F4' }}>
                  <td style={{ ...Td, fontWeight: 700, fontFamily: 'var(--font-display)', borderLeft: `3px solid ${p.color}` }}>
                    {p.programa}
                    <div style={{ fontSize: 10.5, color: '#86868b', fontWeight: 400, marginTop: 2 }}>{p.descripcion}</div>
                  </td>
                  <td style={Td}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        background: `${p.color}20`,
                        color: p.color,
                        padding: '2px 7px',
                        borderRadius: 999,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {p.eje.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ ...Td, textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1F4E8C' }}>
                    {p.presupuesto_eur != null ? `${(p.presupuesto_eur / 1_000_000_000).toFixed(2)} bn €` : '—'}
                    <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 400 }}>{p.presupuesto_descripcion}</div>
                  </td>
                  <td style={Td}>
                    {p.fecha_inicio || '—'}
                    {p.fecha_fin ? <> → {p.fecha_fin}</> : null}
                    {p.ministerio && <div style={{ fontSize: 10, color: '#86868b' }}>{p.ministerio}</div>}
                  </td>
                  <td style={Td}>
                    <a
                      href={p.fuente_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: ACCENT, textDecoration: 'none', fontWeight: 700, fontSize: 11 }}
                    >
                      {p.fuente_label} ›
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        titulo={`Marco institucional · ${REGULADORES_AGRO.length} entidades`}
        fuente="Catálogo Politeia"
        url="https://www.mapa.gob.es/"
      >
        {(['estatal', 'ue'] as const).map((ambito) => {
          const arr = REGULADORES_AGRO.filter((r) => r.ambito === ambito)
          if (arr.length === 0) return null
          return (
            <div key={ambito} style={{ marginBottom: 14 }}>
              <h4
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#6e6e73',
                  margin: '0 0 8px',
                }}
              >
                {ambito === 'estatal' ? 'Ámbito estatal' : 'Ámbito UE'} · {arr.length}
              </h4>
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 8,
                }}
              >
                {arr.map((r) => (
                  <li key={r.id}>
                    <a
                      href={r.web}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'block',
                        padding: '10px 14px',
                        background: '#FAFAFA',
                        borderRadius: 10,
                        border: '1px solid #ECECEF',
                        borderLeft: `3px solid ${ACCENT}`,
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 12.5, fontFamily: 'var(--font-display)' }}>{r.siglas}</span>
                        <span style={{ fontSize: 10, color: '#86868b', textAlign: 'right', maxWidth: 200 }}>{r.nombre}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 4, lineHeight: 1.45 }}>{r.competencias}</div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </Panel>

      {/* Marco legislativo */}
      <Panel
        titulo={`Marco legislativo · ${LEGISLACION_AGRO.length} normas clave`}
        fuente="BOE + EUR-Lex"
        url="https://www.boe.es/"
      >
        {(['es', 'ue'] as const).map((amb) => {
          const arr = LEGISLACION_AGRO.filter((n) => n.ambito === amb)
          if (arr.length === 0) return null
          return (
            <div key={amb} style={{ marginBottom: 14 }}>
              <h4 style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6e6e73', margin: '0 0 8px' }}>
                {amb === 'es' ? 'Normativa española' : 'Normativa de la UE'} · {arr.length}
              </h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {arr.map((n, i) => (
                  <li key={i} style={{ padding: '10px 12px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #ECECEF', borderLeft: `3px solid ${amb === 'ue' ? '#7C3AED' : ACCENT}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 12.5, color: '#1d1d1f' }}>{n.titulo}</span>
                      <span style={{ fontSize: 9, fontWeight: 800, color: amb === 'ue' ? '#7C3AED' : ACCENT, background: amb === 'ue' ? '#F5F3FF' : '#F0FDF4', padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                        {n.tipo}{n.anio ? ` · ${n.anio}` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#3a3a3d', marginTop: 4, lineHeight: 1.45 }}>{n.resumen}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 5, alignItems: 'baseline' }}>
                      <span style={{ fontSize: 9.5, color: '#86868b', fontStyle: 'italic' }}>{n.estado}</span>
                      {n.url && (
                        <a href={n.url} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: ACCENT, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          Texto oficial ›
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </Panel>
    </div>
  )
}
