'use client'
/**
 * <OrgOportunidades /> · Dossier · Sección 3 · Licitaciones/subvenciones
 * relacionadas (oportunidades abiertas con encaje ONG).
 *
 * Lista las `oportunidades_relacionadas` (OportunidadTS) que el endpoint trae
 * filtradas por sector/CCAA de la org, con el SCORING ONG ya calculado en la
 * fuente única (scoring.ts) — aquí NO se recalcula. Muestra aptitud, riesgo,
 * plazo, importe (o «n/d»), tipo y razones. Ordenadas por score desc.
 */
import { fmtEur } from './OrgShared'
import {
  DossierCard,
  DossierNote,
  DossierPill,
  DossierSection,
  riesgoTone,
  scoreTone,
  tipoOportunidadLabel,
  type BlockMeta,
} from './OrgDossierShared'
import type { OportunidadTS } from '@/lib/tercer-sector/oportunidades/types'

/** Pastilla de plazo con urgencia (vencido/hoy/pronto/abierto). */
function PlazoPill({ dias }: { dias: number | null }) {
  if (dias == null) {
    return <DossierPill tone="neutral" title="Sin plazo declarado">Plazo n/d</DossierPill>
  }
  let tone: 'accent' | 'amber' | 'red' = 'accent'
  let txt = `${dias} d`
  if (dias < 0) {
    tone = 'red'
    txt = 'Vencida'
  } else if (dias === 0) {
    tone = 'red'
    txt = 'Hoy'
  } else if (dias <= 7) {
    tone = 'red'
  } else if (dias <= 21) {
    tone = 'amber'
  }
  return (
    <DossierPill tone={tone} title="Días hasta el plazo límite">
      ◴ {txt}
    </DossierPill>
  )
}

export function OrgOportunidades({
  oportunidades,
  block,
}: {
  oportunidades: OportunidadTS[]
  block?: BlockMeta
}) {
  const ok = block?.ok ?? true
  // Defensa: ordenar por score desc por si el endpoint cambia el orden.
  const items = [...oportunidades].sort((a, b) => (b.score_ong ?? 0) - (a.score_ong ?? 0))
  const aptas = items.filter((o) => o.score_label === 'alta' || o.score_label === 'media').length

  return (
    <DossierSection
      glyph="⊞"
      title="Oportunidades relacionadas"
      note={block?.note ?? 'Convocatorias y licitaciones del sector/territorio de la entidad, con encaje ONG.'}
      count={items.length}
    >
      {!ok && (
        <DossierNote tone={block?.error === 'oportunidades_no_disponible' ? 'muted' : 'error'}>
          {block?.error === 'oportunidades_no_disponible'
            ? 'El agregador de oportunidades no está disponible en este despliegue. Consulte la pestaña de Licitaciones/Financiación.'
            : `No se pudieron cargar oportunidades relacionadas${block?.error ? ` (${block.error})` : ''}.`}
        </DossierNote>
      )}

      {ok && items.length === 0 && (
        <DossierNote>
          Sin oportunidades abiertas detectadas para el sector y territorio de esta entidad en el corte actual.
        </DossierNote>
      )}

      {ok && items.length > 0 && (
        <>
          {aptas > 0 && (
            <DossierNote>
              {aptas} de {items.length} con encaje ONG alto/medio (scoring sobre CPV, colectivo, tipo, plazo y docs).
            </DossierNote>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.slice(0, 10).map((o) => {
              const st = scoreTone(o.score_label)
              const rt = riesgoTone(o.riesgo)
              return (
                <DossierCard key={o.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <a
                      href={o.url || o.fuente_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.35, textDecoration: 'none', flex: 1 }}
                    >
                      {o.titulo}
                    </a>
                    <span
                      title={`Aptitud ONG ${o.score_ong}/100`}
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: st.color,
                        background: st.bg,
                        borderRadius: 999,
                        padding: '2px 8px',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {st.txt} · {o.score_ong}
                    </span>
                  </div>

                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>
                    {o.organismo}
                    {o.pais ? ` · ${o.pais}` : ''}
                    {o.region ? ` · ${o.region}` : ''}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7, alignItems: 'center' }}>
                    <DossierPill tone="neutral">{tipoOportunidadLabel(o.tipo)}</DossierPill>
                    <PlazoPill dias={o.dias_restantes} />
                    <DossierPill tone="neutral" title="Riesgo de encaje/ejecución para una ONG">
                      <span style={{ color: rt.color }}>{rt.txt}</span>
                    </DossierPill>
                    {o.cpv && <DossierPill tone="neutral" title="Código CPV principal">CPV {o.cpv}</DossierPill>}
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: o.importe_eur != null ? '#15803D' : '#cbd5e1',
                        fontFamily: 'var(--font-display)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmtEur(o.importe_eur)}
                    </span>
                  </div>

                  {o.razones_score?.length > 0 && (
                    <p style={{ fontSize: 10, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                      {o.razones_score.slice(0, 2).join(' · ')}
                    </p>
                  )}
                </DossierCard>
              )
            })}
          </div>

          {items.length > 10 && (
            <DossierNote>+{items.length - 10} oportunidades más (afine en la pestaña de Licitaciones/Financiación).</DossierNote>
          )}
        </>
      )}
    </DossierSection>
  )
}

export default OrgOportunidades
