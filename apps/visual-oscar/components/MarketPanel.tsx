'use client'
import { useApi } from '@/lib/useApi'

interface MarketInfo { market_code: string; name: string; parties_count: number; media_outlets_count: number; ingestion_sources_count: number; dlcs_available?: string[] }
interface Party { slug: string; name: string; color_hex: string; ideology_axes?: { economic?: number; social?: number } }
interface Source { id: string; type: string; enabled: boolean; description?: string; schedule_cron?: string }

const FALLBACK_INFO: MarketInfo = {
  market_code: 'ES', name: 'España', parties_count: 18, media_outlets_count: 25, ingestion_sources_count: 47, dlcs_available: ['BOE', 'Congreso', 'Senado', 'CIS', 'INE', 'Eurostat'],
}
const FALLBACK_PARTIES: Party[] = [
  { slug: 'pp', name: 'Partido Popular', color_hex: '#1F4E8C', ideology_axes: { economic: 4.2, social: 2.5 } },
  { slug: 'psoe', name: 'PSOE', color_hex: '#E1322D', ideology_axes: { economic: -3.5, social: -1.0 } },
  { slug: 'vox', name: 'VOX', color_hex: '#5BA02E', ideology_axes: { economic: 7.8, social: 7.2 } },
  { slug: 'sumar', name: 'Sumar', color_hex: '#D43F8D', ideology_axes: { economic: -7.0, social: -4.5 } },
  { slug: 'junts', name: 'Junts per Catalunya', color_hex: '#1FA89B', ideology_axes: { economic: 1.2, social: 1.8 } },
  { slug: 'erc', name: 'ERC', color_hex: '#E8A030', ideology_axes: { economic: -4.0, social: -3.0 } },
  { slug: 'pnv', name: 'PNV', color_hex: '#4D9E33', ideology_axes: { economic: 0.5, social: 1.0 } },
  { slug: 'ehbildu', name: 'EH Bildu', color_hex: '#A9C55A', ideology_axes: { economic: -6.5, social: -3.5 } },
]
const FALLBACK_SOURCES: Source[] = [
  { id: 'boe-rss', type: 'rss', enabled: true, description: 'BOE — Diario Oficial', schedule_cron: '0 7 * * *' },
  { id: 'congreso-iniciativas', type: 'api', enabled: true, description: 'Congreso · iniciativas legislativas', schedule_cron: '0 */6 * * *' },
  { id: 'senado-feed', type: 'api', enabled: true, description: 'Senado · BOCG', schedule_cron: '0 8 * * *' },
  { id: 'cis-barometro', type: 'pdf', enabled: true, description: 'CIS · barómetros mensuales', schedule_cron: '0 10 5 * *' },
  { id: 'elpais-rss', type: 'rss', enabled: true, description: 'El País', schedule_cron: '*/30 * * * *' },
  { id: 'elmundo-rss', type: 'rss', enabled: true, description: 'El Mundo', schedule_cron: '*/30 * * * *' },
  { id: 'okdiario-rss', type: 'rss', enabled: false, description: 'OK Diario (paused)', schedule_cron: '*/30 * * * *' },
  { id: 'gdelt', type: 'api', enabled: true, description: 'GDELT geopolítico', schedule_cron: '15 */3 * * *' },
  { id: 'acled', type: 'api', enabled: true, description: 'ACLED conflictos', schedule_cron: '0 4 * * *' },
  { id: 'eurostat-macro', type: 'api', enabled: true, description: 'Eurostat macro', schedule_cron: '0 6 * * 1' },
]

export default function MarketPanel() {
  const { data: iData } = useApi<MarketInfo>('/api/market/info', { refreshInterval: 0 })
  const { data: pData } = useApi<Party[]>('/api/market/parties', { refreshInterval: 0 })
  const { data: sData } = useApi<Source[]>('/api/market/sources', { refreshInterval: 0 })

  const info = iData ?? FALLBACK_INFO
  const parties = (Array.isArray(pData) && pData.length > 0) ? pData : FALLBACK_PARTIES
  const sources = (Array.isArray(sData) && sData.length > 0) ? sData : FALLBACK_SOURCES

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Section 1: Market info KPIs */}
      <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
        <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Mercado activo</p>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>{info.name} ({info.market_code})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { l: 'Mercado', v: info.market_code, c: '#1F4E8C' },
            { l: 'Partidos', v: info.parties_count, c: '#5B21B6' },
            { l: 'Medios', v: info.media_outlets_count, c: '#b25000' },
            { l: 'Fuentes ingesta', v: info.ingestion_sources_count, c: '#2d8a39' },
          ].map(k => (
            <div key={k.l} style={{ background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>
        {(info.dlcs_available?.length ?? 0) > 0 && (
          <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 600 }}>DLCs disponibles:</span>
            {info.dlcs_available!.map(d => (
              <span key={d} style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 999, background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontWeight: 600 }}>{d}</span>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Parties */}
      <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
        <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Partidos</p>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Partidos en el mercado</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {parties.map(p => {
            const econ = p.ideology_axes?.economic ?? 0
            const soc = p.ideology_axes?.social ?? 0
            const econPct = ((econ + 10) / 20) * 100
            const socPct = ((soc + 10) / 20) * 100
            return (
              <div key={p.slug} style={{ padding: '14px 18px', background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12, borderLeft: `3px solid ${p.color_hex}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{p.name}</div>
                    <div style={{ fontSize: 10.5, color: '#6e6e73', fontFamily: 'ui-monospace,monospace' }}>{p.slug}</div>
                  </div>
                  <span style={{ width: 16, height: 16, borderRadius: 999, background: p.color_hex, border: '2px solid #fff', boxShadow: '0 0 0 1px #e8e8ed' }} />
                </div>
                {/* Economic axis */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#6e6e73', marginBottom: 3 }}>
                    <span>← Izquierda</span>
                    <span style={{ fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, color: '#1d1d1f' }}>X: {econ.toFixed(1)}</span>
                    <span>Derecha →</span>
                  </div>
                  <div style={{ position: 'relative', height: 6, background: '#e8e8ed', borderRadius: 999 }}>
                    <div style={{ position: 'absolute', left: '50%', top: -2, width: 1, height: 10, background: '#6e6e73' }} />
                    <div style={{ position: 'absolute', left: `${Math.min(Math.max(econPct, 0), 100)}%`, top: -3, width: 10, height: 12, transform: 'translateX(-50%)', background: p.color_hex, borderRadius: 3 }} />
                  </div>
                </div>
                {/* Social axis */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#6e6e73', marginBottom: 3 }}>
                    <span>← Libertario</span>
                    <span style={{ fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, color: '#1d1d1f' }}>Y: {soc.toFixed(1)}</span>
                    <span>Autoritario →</span>
                  </div>
                  <div style={{ position: 'relative', height: 6, background: '#e8e8ed', borderRadius: 999 }}>
                    <div style={{ position: 'absolute', left: '50%', top: -2, width: 1, height: 10, background: '#6e6e73' }} />
                    <div style={{ position: 'absolute', left: `${Math.min(Math.max(socPct, 0), 100)}%`, top: -3, width: 10, height: 12, transform: 'translateX(-50%)', background: p.color_hex, borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 3: Sources */}
      <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
        <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Fuentes</p>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Fuentes de ingesta · {sources.length}</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f3', textAlign: 'left', color: '#6e6e73' }}>
              {['ID', 'Tipo', 'Habilitada', 'Descripción', 'Cron'].map(h => (
                <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: i < sources.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
                <td style={{ padding: '8px 10px', fontFamily: 'ui-monospace,monospace', color: '#1d1d1f' }}>{s.id}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(91,33,182,0.10)', color: '#5B21B6', fontSize: 10.5, fontWeight: 600 }}>{s.type}</span>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    background: s.enabled ? 'rgba(45,138,57,0.12)' : 'rgba(178,80,0,0.10)',
                    color: s.enabled ? '#2d8a39' : '#b25000',
                  }}>{s.enabled ? 'Sí' : 'No'}</span>
                </td>
                <td style={{ padding: '8px 10px', color: '#424245' }}>{s.description}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'ui-monospace,monospace', color: '#6e6e73', fontSize: 11 }}>{s.schedule_cron}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
