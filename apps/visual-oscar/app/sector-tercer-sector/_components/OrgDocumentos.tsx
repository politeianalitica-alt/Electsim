'use client'
/**
 * <OrgDocumentos /> · Dossier · Sección 6 · Transparencia y documentos.
 *
 * Enlaces de transparencia/rendición de cuentas curados (memoria, cuentas,
 * auditoría, portal de transparencia, web) con URLs reales del catálogo. Si no
 * hay enlaces curados (solo web, o nada), se dice claramente. No se inventan URLs.
 */
import {
  DossierNote,
  DossierSection,
  type BlockMeta,
  type DossierDocumento,
} from './OrgDossierShared'
import { ACCENT, ACCENT_DARK } from './OrgShared'

const DOC_META: Record<DossierDocumento['tipo'], { label: string; glyph: string }> = {
  memoria: { label: 'Memoria de actividades', glyph: '▤' },
  cuentas: { label: 'Cuentas anuales', glyph: '▦' },
  auditoria: { label: 'Informe de auditoría', glyph: '◳' },
  transparencia: { label: 'Portal de transparencia', glyph: '◉' },
  web: { label: 'Sitio web oficial', glyph: '⟁' },
}

export function OrgDocumentos({
  documentos,
  block,
}: {
  documentos: DossierDocumento[]
  block?: BlockMeta
}) {
  const docs = documentos ?? []
  const soloWeb = docs.length > 0 && docs.every((d) => d.tipo === 'web')

  return (
    <DossierSection
      glyph="▤"
      title="Transparencia y documentos"
      note={block?.note ?? (soloWeb ? 'Sin enlaces de transparencia curados (solo web).' : 'Enlaces de transparencia curados.')}
      count={docs.length}
    >
      {docs.length === 0 && (
        <DossierNote>
          No hay enlaces de transparencia curados para esta entidad. Verifique memoria, cuentas y auditoría en su web
          oficial.
        </DossierNote>
      )}

      {docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {docs.map((d, i) => {
            const meta = DOC_META[d.tipo] ?? { label: d.nombre, glyph: '▤' }
            return (
              <a
                key={`${d.url}-${i}`}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: '1px solid #ECECEF',
                  borderRadius: 10,
                  padding: '9px 12px',
                  background: '#FAFAFA',
                  textDecoration: 'none',
                }}
              >
                <span aria-hidden="true" style={{ color: ACCENT, fontSize: 14, flexShrink: 0 }}>
                  {meta.glyph}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{d.nombre}</span>
                  <span style={{ display: 'block', fontSize: 9.5, color: '#94a3b8', marginTop: 1 }}>
                    {meta.label} · {d.fuente}
                  </span>
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: ACCENT_DARK, flexShrink: 0 }}>Abrir ⟶</span>
              </a>
            )
          })}
        </div>
      )}
    </DossierSection>
  )
}

export default OrgDocumentos
