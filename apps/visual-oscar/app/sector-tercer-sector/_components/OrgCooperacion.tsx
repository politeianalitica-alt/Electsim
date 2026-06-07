'use client'
/**
 * <OrgCooperacion /> · Dossier · Sección 4 · Cooperación internacional (IATI).
 *
 * Perfil IATI de la entidad (cuando es publisher y hay clave): nº actividades,
 * desembolso total EUR (solo si la fuente lo da), top países receptores y top
 * sectores DAC. Degrada honestamente: sin iati_ref curado → mensaje; con ref
 * pero sin clave de API (`no_key`) → explica que requiere configurar IATI_API_KEY.
 */
import { fmtEur, fmtNum } from './OrgShared'
import {
  dacFacetLabel,
  DossierKpi,
  DossierNote,
  DossierSection,
  type BlockMeta,
  type DossierFacet,
  type DossierIati,
} from './OrgDossierShared'

/** Mini barra horizontal de una faceta (país/sector) por nº de actividades. */
function FacetBar({ label, count, max, title }: { label: string; count: number; max: number; title?: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0
  return (
    <div title={title} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <span
        style={{
          fontSize: 11,
          color: '#475569',
          width: 130,
          flexShrink: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 7, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#16A34A', borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </span>
    </div>
  )
}

function FacetGroup({ title, facets }: { title: string; facets: { label: string; count: number; code: string }[] }) {
  if (facets.length === 0) return null
  const max = Math.max(...facets.map((f) => f.count), 1)
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#94a3b8',
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {facets.slice(0, 6).map((f) => (
        <FacetBar key={f.code} label={f.label} count={f.count} max={max} title={`${f.label} · ${f.count} actividades`} />
      ))}
    </div>
  )
}

export function OrgCooperacion({
  iati,
  block,
  iatiRef,
}: {
  iati: DossierIati | null
  block?: BlockMeta
  iatiRef: string | null
}) {
  const ok = (block?.ok ?? false) && !!iati
  const noRef = block?.error === 'sin_iati_ref' || !iatiRef
  const noKey = block?.error === 'no_key' || (block?.error || '').startsWith('no_key')

  const countries: { label: string; count: number; code: string }[] = (iati?.top_countries ?? []).map(
    (f: DossierFacet) => ({ label: f.name || f.code, count: f.count, code: f.code }),
  )
  const sectors: { label: string; count: number; code: string }[] = (iati?.top_sectors ?? []).map((f: DossierFacet) => ({
    label: dacFacetLabel(f),
    count: f.count,
    code: f.code,
  }))

  return (
    <DossierSection
      glyph="⬡"
      title="Cooperación internacional · IATI"
      note={iatiRef ? `Reporting org IATI · ${iatiRef}` : 'Estándar IATI de transparencia de la ayuda'}
      count={iati?.total_activities ?? null}
    >
      {noRef && (
        <DossierNote>
          Esta entidad no tiene identificador IATI curado: no es publisher de cooperación o no está mapeada al estándar
          IATI. No se listan actividades internacionales.
        </DossierNote>
      )}

      {!noRef && noKey && (
        <DossierNote tone="muted">
          La entidad figura como publisher IATI ({iatiRef}), pero el Datastore requiere clave de API (configurar
          IATI_API_KEY) para listar sus actividades. No se inventan datos.
        </DossierNote>
      )}

      {!noRef && !noKey && !ok && (
        <DossierNote tone="error">
          No se pudo obtener el perfil IATI{block?.error ? ` (${block.error})` : ''}. Reintente más tarde.
        </DossierNote>
      )}

      {ok && iati && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <DossierKpi label="Actividades" value={fmtNum(iati.total_activities)} />
            <DossierKpi
              label="Desembolsado (EUR)"
              value={iati.total_disbursed_eur != null ? fmtEur(iati.total_disbursed_eur) : 'n/d'}
              accent
            />
          </div>

          <FacetGroup title="Países receptores (top)" facets={countries} />
          <FacetGroup title="Sectores DAC (top)" facets={sectors} />

          {iati.total_disbursed_eur == null && (
            <DossierNote>
              Desembolsos no expresados en EUR por el publisher (IATI no asume tipo de cambio): se omite el total.
            </DossierNote>
          )}

          <p style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 8 }}>
            Fuente: IATI Datastore (estándar de transparencia de la ayuda al desarrollo).
          </p>
        </>
      )}
    </DossierSection>
  )
}

export default OrgCooperacion
