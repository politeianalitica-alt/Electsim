'use client'
/**
 * <OrgRiesgos /> · Dossier · Sección 7 · Riesgos y observaciones para el analista.
 *
 * Lista las `alertas` derivadas por el endpoint (honestas, no inventadas):
 * acreditaciones, recurrencia de financiación pública, ausencia de concesiones
 * en la muestra reciente, IATI sin clave, falta de enlaces de transparencia…
 * Cada alerta es una observación accionable, no un juicio normativo.
 */
import { DossierNote, DossierSection } from './OrgDossierShared'
import { ACCENT } from './OrgShared'

export function OrgRiesgos({ alertas }: { alertas: string[] }) {
  const items = alertas ?? []
  return (
    <DossierSection
      glyph="◐"
      title="Riesgos y observaciones para el analista"
      note="Señales derivadas de los datos (no son un juicio sobre la entidad)."
      count={items.length}
    >
      {items.length === 0 && (
        <DossierNote>Sin observaciones automáticas relevantes para esta entidad en este corte.</DossierNote>
      )}

      {items.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((a, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                fontSize: 11.5,
                color: '#334155',
                lineHeight: 1.45,
                border: '1px solid #ECECEF',
                borderRadius: 10,
                padding: '9px 12px',
                background: '#FAFAFA',
              }}
            >
              <span aria-hidden="true" style={{ color: ACCENT, fontWeight: 800, flexShrink: 0, transform: 'translateY(1px)' }}>
                !
              </span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}
    </DossierSection>
  )
}

export default OrgRiesgos
