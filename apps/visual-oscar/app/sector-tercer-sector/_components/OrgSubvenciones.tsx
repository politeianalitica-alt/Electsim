'use client'
/**
 * <OrgSubvenciones /> · Dossier · Sección 2 · Financiación pública detectada.
 *
 * Subvenciones BDNS atribuidas a la entidad (por NIF exacto o por nombre
 * normalizado vía matchOrganizacion en el endpoint). Tabla de concesiones +
 * total localizado. Honesto: muestra reciente, NO histórico; importes null →
 * «n/d»; degrada con la nota de bloque (`blockNote`).
 */
import { fmtEur, fmtFecha } from './OrgShared'
import {
  DossierCard,
  DossierKpi,
  DossierNote,
  DossierPill,
  DossierSection,
  nivelLabel,
  type BlockMeta,
  type DossierSubvencion,
} from './OrgDossierShared'

export function OrgSubvenciones({
  subvenciones,
  totalEur,
  block,
}: {
  subvenciones: DossierSubvencion[]
  totalEur: number | null
  block?: BlockMeta
}) {
  const ok = block?.ok ?? true
  const conImporte = subvenciones.filter((s) => s.importe_eur != null).length

  return (
    <DossierSection
      glyph="◈"
      title="Financiación pública detectada"
      note={block?.note ?? 'Muestra reciente de concesiones BDNS (no histórico completo).'}
      count={subvenciones.length}
    >
      {!ok && (
        <DossierNote tone="error">
          No se pudo consultar BDNS en este momento{block?.error ? ` (${block.error})` : ''}. Reintente más tarde.
        </DossierNote>
      )}

      {ok && subvenciones.length === 0 && (
        <DossierNote>
          Sin concesiones de esta entidad en la muestra reciente de BDNS. No implica ausencia de financiación
          histórica: revise el histórico en infosubvenciones.es antes de concluir.
        </DossierNote>
      )}

      {ok && subvenciones.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <DossierKpi label="Concesiones casadas" value={String(subvenciones.length)} />
            <DossierKpi
              label="Importe localizado"
              value={totalEur != null ? fmtEur(totalEur) : 'n/d'}
              accent
            />
          </div>

          {conImporte < subvenciones.length && (
            <DossierNote>
              {subvenciones.length - conImporte} de {subvenciones.length} concesiones sin importe publicado por el
              organismo (se muestran como «n/d»).
            </DossierNote>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subvenciones.slice(0, 14).map((s) => (
              <DossierCard key={s.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11.5, color: '#1d1d1f', fontWeight: 600, lineHeight: 1.35 }}>
                    {s.convocatoria || s.organo || 'Concesión BDNS'}
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: s.importe_eur != null ? '#15803D' : '#cbd5e1',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--font-display)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmtEur(s.importe_eur)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7, alignItems: 'center' }}>
                  {s.nivel && <DossierPill tone="neutral">{nivelLabel(s.nivel)}</DossierPill>}
                  {s.territorio && <DossierPill tone="neutral">{s.territorio}</DossierPill>}
                  <DossierPill
                    tone={s.match === 'nif' ? 'accent' : 'amber'}
                    title={
                      s.match === 'nif'
                        ? 'Atribuida por coincidencia exacta de NIF'
                        : 'Atribuida por coincidencia de nombre normalizado (menor confianza)'
                    }
                  >
                    {s.match === 'nif' ? 'Match NIF' : 'Match nombre'}
                  </DossierPill>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>
                    {s.organo ? `${s.organo} · ` : ''}
                    {fmtFecha(s.fecha)}
                  </span>
                </div>
              </DossierCard>
            ))}
          </div>

          {subvenciones.length > 14 && (
            <DossierNote>+{subvenciones.length - 14} concesiones más en la muestra (no listadas aquí).</DossierNote>
          )}

          <p style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 8 }}>
            Fuente: BDNS (Base de Datos Nacional de Subvenciones). Importes tal cual los publica el organismo.
          </p>
        </>
      )}
    </DossierSection>
  )
}

export default OrgSubvenciones
