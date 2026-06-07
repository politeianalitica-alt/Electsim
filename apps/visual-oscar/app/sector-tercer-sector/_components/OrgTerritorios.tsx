'use client'
/**
 * <OrgTerritorios /> · Dossier · Sección 5 · Territorios de actividad.
 *
 * Dónde opera la entidad: sede (CCAA), presencia territorial curada (CCAA) y
 * países de intervención (cooperación). Todo del catálogo (no inventado): si
 * solo hay sede conocida, se dice; si no hay países, se omite el bloque.
 */
import { ambitoLabel } from './OrgShared'
import {
  DossierNote,
  DossierPill,
  DossierSection,
  type BlockMeta,
  type DossierTerritorios,
} from './OrgDossierShared'

export function OrgTerritorios({
  territorios,
  block,
}: {
  territorios: DossierTerritorios
  block?: BlockMeta
}) {
  const ccaa = territorios.ccaa_presencia ?? []
  const paises = territorios.paises_intervencion ?? []
  const sede = territorios.sede_ccaa
  const soloSede = ccaa.length <= 1 && paises.length === 0

  return (
    <DossierSection
      glyph="◧"
      title="Territorios de actividad"
      note={block?.note ?? (soloSede ? 'Solo sede conocida (sin mapa de presencia curado).' : 'Presencia territorial curada.')}
      count={ccaa.length || null}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#64748b' }}>Sede:</span>
        {sede ? (
          <DossierPill tone="accent">{sede.name}</DossierPill>
        ) : (
          <span style={{ fontSize: 11.5, color: '#94a3b8' }}>no consta</span>
        )}
        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>Ámbito:</span>
        <DossierPill tone="neutral">{ambitoLabel(territorios.ambito)}</DossierPill>
      </div>

      {ccaa.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#94a3b8',
              marginBottom: 6,
            }}
          >
            Presencia en CCAA ({ccaa.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ccaa.map((c) => (
              <DossierPill key={c.key} tone={sede && c.key === sede.key ? 'accent' : 'neutral'}>
                {c.name}
              </DossierPill>
            ))}
          </div>
        </div>
      )}

      {paises.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#94a3b8',
              marginBottom: 6,
            }}
          >
            Países / regiones de intervención
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {paises.map((p) => (
              <DossierPill key={p} tone="neutral" title="Intervención en cooperación">
                {p}
              </DossierPill>
            ))}
          </div>
        </div>
      )}

      {ccaa.length === 0 && paises.length === 0 && !sede && (
        <DossierNote>Sin datos de territorio para esta entidad en el catálogo.</DossierNote>
      )}
    </DossierSection>
  )
}

export default OrgTerritorios
