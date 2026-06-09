'use client'
/**
 * <AgroPoliticaView /> · Agro v3 · Sprint A5
 *
 * Tabla de programas activos del sector agroalimentario español + UE
 * leída desde `lib/agro/catalogos/programas.json` con BOE / DOUE.
 */
import { PROGRAMAS_AGRO, REGULADORES_AGRO } from '@/lib/agro/catalogos'
import { Panel, SectorHero, Th, Td } from '@/lib/sectores/charts'

const ACCENT = '#16A34A'

export function AgroPoliticaView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectorHero
        tag="AGRO · POLÍTICA · PAC + PERTE + LEY CADENA"
        titulo="Qué políticas mueven hoy al sector"
        descripcion="PAC 2023-2027, PERTE Agroalimentario, Ley de la Cadena Alimentaria, Estrategia europea Farm to Fork y respuesta a la sequía. Cada programa enlaza al BOE/DOUE/portal ministerial · presupuestos verificados."
        colorFrom={ACCENT}
        colorTo="#14532D"
      />

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
    </div>
  )
}
