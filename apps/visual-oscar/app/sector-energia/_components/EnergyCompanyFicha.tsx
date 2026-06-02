'use client'
/**
 * <EnergyCompanyFicha /> · Sprint Energía S9
 *
 * Ficha drill-down de una empresa energética. Renderiza:
 *   - Hero · nombre + ticker + país + cotización (Finnhub) con var.
 *   - KPIs · precio, var día, rango día, cierre anterior.
 *   - En qué energías opera (tags) + segmentos de negocio.
 *   - Estructura societaria (OpenCorporates): razón social, jurisdicción, nº
 *     registro, estado, constitución, tipo legal, dirección, directivos,
 *     empresas relacionadas del grupo + link OpenCorporates.
 *   - Empty-state honesto si OpenCorporates degrada (sin key / sin match /
 *     major sin jurisdicción configurada).
 *
 * Cero emojis · Unicode (⇡ ⇣ → ◆). Patrón visual de la ficha de defensa.
 */
import { Panel } from '@/components/SectorPanel'
import type { EnergyCompanyFichaData, EnergiaTipo } from '@/lib/energia/types'

const ACCENT = '#16A34A'
const ACCENT_DARK = '#166534'

const ENERGIA_LABEL: Record<EnergiaTipo, string> = {
  global: 'Global',
  electrico: 'Eléctrico',
  renovables: 'Renovables',
  nuclear: 'Nuclear',
  petroleo: 'Petróleo',
  gas: 'Gas',
  hidrogeno: 'Hidrógeno',
}

const STRUCTURE_NOTE: Record<string, string> = {
  no_jurisdiction:
    'Empresa internacional sin jurisdicción OpenCorporates configurada en el catálogo. La estructura societaria detallada se ofrece para las españolas y europeas con jurisdicción conocida.',
  no_key:
    'OpenCorporates no está disponible (falta OPENCORPORATES_API_KEY o se agotó la cuota de 500 consultas/mes del free tier).',
  rate_limited: 'OpenCorporates devolvió rate-limit (cuota mensual agotada). Reintenta más adelante.',
  no_match: 'OpenCorporates no devolvió una coincidencia clara para esta empresa en su jurisdicción.',
  no_response: 'OpenCorporates no respondió. Reintenta más adelante.',
  auth_failed: 'La API key de OpenCorporates es inválida o expiró.',
}

export function EnergyCompanyFicha({ company }: { company: EnergyCompanyFichaData }) {
  const q = company.quote
  const hasQuote = !!q?.available && q.price != null
  const chg = q?.change_percent ?? null
  const varColor = chg == null ? '#9CA3AF' : chg >= 0 ? '#86EFAC' : '#FCA5A5'
  const s = company.structure

  return (
    <div>
      {/* HERO */}
      <section
        style={{
          background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`,
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 14,
          color: '#fff',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.8, textTransform: 'uppercase', margin: 0 }}>
              EMPRESA ENERGÉTICA{company.exchange ? ` · ${company.exchange}` : ''}
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, margin: '6px 0 4px', letterSpacing: '-0.02em' }}>
              {company.nombre}
            </h1>
            <p style={{ fontSize: 13, opacity: 0.92, margin: 0 }}>
              {company.ticker && <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{company.ticker} · </span>}
              {company.pais}
              {company.es_espanola && ' · española'}
            </p>
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {company.energias.map((e) => (
                <span key={e} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.20)', fontWeight: 700 }}>
                  {ENERGIA_LABEL[e] ?? e}
                </span>
              ))}
            </div>
          </div>
          {/* Cotización */}
          <div style={{ textAlign: 'right', minWidth: 200 }}>
            <p style={{ margin: 0, fontSize: 9, opacity: 0.7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>COTIZACIÓN</p>
            {hasQuote ? (
              <>
                <p style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                  {q!.price!.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                </p>
                {chg != null && (
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: varColor, fontWeight: 700 }}>
                    {chg >= 0 ? '⇡' : '⇣'} {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                    {q!.change != null && ` (${q!.change >= 0 ? '+' : ''}${q!.change.toFixed(2)})`}
                  </p>
                )}
                <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.7 }}>Finnhub · tiempo real</p>
              </>
            ) : (
              <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.7 }}>
                {company.ticker ? 'Sin cotización disponible' : 'No cotiza (privada)'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* KPIs cotización */}
      {hasQuote && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
          <KPI label="PRECIO" value={fmt(q!.price)} color="#1d1d1f" />
          <KPI label="VARIACIÓN DÍA" value={chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : '—'} color={chg != null && chg >= 0 ? ACCENT : '#DC2626'} />
          <KPI label="RANGO DÍA" value={q!.low != null && q!.high != null ? `${fmt(q!.low)} – ${fmt(q!.high)}` : '—'} color="#0EA5E9" />
          <KPI label="CIERRE ANTERIOR" value={fmt(q!.previous_close)} color="#7C3AED" />
        </div>
      )}

      {/* Segmentos + energías */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="Segmentos de negocio">
          {company.segmentos.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {company.segmentos.map((seg) => (
                <li key={seg} style={{ fontSize: 11.5, padding: '4px 10px', background: `${ACCENT}15`, color: ACCENT_DARK, borderRadius: 6, fontWeight: 600 }}>
                  {seg}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: '#86868b' }}>Sin segmentos en catálogo.</p>
          )}
        </Panel>
        <Panel title="En qué energías opera" subtitle="Tipos de energía cubiertos por la compañía">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {company.energias.map((e) => (
              <span
                key={e}
                style={{
                  fontSize: 11.5,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: `${ACCENT}14`,
                  color: ACCENT_DARK,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span aria-hidden="true" style={{ color: ACCENT }}>◆</span> {ENERGIA_LABEL[e] ?? e}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      {/* ESTRUCTURA SOCIETARIA · OpenCorporates */}
      <Panel
        title="Estructura societaria"
        subtitle="Registro mercantil vía OpenCorporates · jurisdicción, nº de registro, estado y grupo"
        marginBottom
        sourceUrl={s.opencorporates_url ?? 'https://opencorporates.com'}
        sourceTooltip="OpenCorporates · base de datos global de empresas"
      >
        {s.available ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
              <Field label="Razón social" value={s.legal_name} />
              <Field label="Jurisdicción" value={s.jurisdiction?.toUpperCase() ?? null} />
              <Field label="Nº de registro" value={s.company_number} mono />
              <Field label="Estado" value={s.status} highlight={s.status?.toLowerCase().includes('active') ? ACCENT : undefined} />
              <Field label="Constitución" value={s.incorporation_date} />
              <Field label="Tipo legal" value={s.company_type} />
            </div>
            {s.registered_address && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: '0 0 4px', fontSize: 9.5, color: '#86868b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>DOMICILIO REGISTRADO</p>
                <p style={{ margin: 0, fontSize: 12, color: '#3a3a3d', lineHeight: 1.45 }}>{s.registered_address}</p>
              </div>
            )}

            {/* Directivos */}
            {s.officers.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: '0 0 6px', fontSize: 9.5, color: ACCENT_DARK, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  DIRECTIVOS / OFFICERS ({s.officers.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 6 }}>
                  {s.officers.map((o, i) => (
                    <div key={`${o.name}-${i}`} style={{ padding: '8px 10px', background: '#FAFAFA', borderRadius: 8, borderLeft: `3px solid ${ACCENT}` }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{o.name}</p>
                      {o.position && <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#6e6e73', textTransform: 'capitalize' }}>{o.position}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empresas relacionadas del grupo */}
            {s.related.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <p style={{ margin: '0 0 6px', fontSize: 9.5, color: '#7C3AED', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  OTRAS ENTIDADES EN LA MISMA JURISDICCIÓN ({s.related.length})
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {s.related.map((r) => (
                    <li key={r.company_number} style={{ fontSize: 11, padding: '5px 9px', background: '#FAFAFA', borderRadius: 6, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: '#3a3a3d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      <span style={{ color: '#9CA3AF', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{r.company_number}</span>
                    </li>
                  ))}
                </ul>
                <p style={{ margin: '6px 0 0', fontSize: 9.5, color: '#A0A0A5', lineHeight: 1.4 }}>
                  Coincidencias de nombre en el mismo registro mercantil; no implican necesariamente vínculo societario directo.
                </p>
              </div>
            )}

            {s.opencorporates_url && (
              <a
                href={s.opencorporates_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, fontWeight: 700, color: ACCENT_DARK, textDecoration: 'none' }}
              >
                <span aria-hidden="true">→</span> Ver ficha completa en OpenCorporates
              </a>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.55 }}>
            {STRUCTURE_NOTE[s.note ?? ''] ?? 'Estructura societaria no disponible ahora.'}
            <p style={{ margin: '8px 0 0', fontSize: 10.5, color: '#A0A0A5' }}>
              Fuente: OpenCorporates (base de datos global de empresas, 130 jurisdicciones).
            </p>
          </div>
        )}
      </Panel>

      {/* FOOTER */}
      <div style={{ padding: 10, background: '#FAFAFB', borderRadius: 8, fontSize: 10.5, color: '#6e6e73', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>Cotización: Finnhub · tiempo real</span>
        <span>Estructura societaria: OpenCorporates · Datos de mercado: catálogo curado</span>
      </div>
    </div>
  )
}

export default EnergyCompanyFicha

// ─── Primitivas ──────────────────────────────────────────────────────────
function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '10px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function Field({ label, value, mono, highlight }: { label: string; value: string | null; mono?: boolean; highlight?: string }) {
  return (
    <div>
      <p style={{ margin: '0 0 3px', fontSize: 9, color: '#86868b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: highlight ?? '#1d1d1f', fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function fmt(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('es-ES', { maximumFractionDigits: 2 })
}
