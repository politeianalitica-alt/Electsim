/**
 * /ficha/territorio/[cod] · Página pública de ficha territorial dinámica.
 *
 * `cod` puede ser:
 *   - Código INE de 5 dígitos (municipio): /ficha/territorio/30027
 *   - Código con prefijo ccaa: /ficha/territorio/ccaa-Andalucía
 *
 * La construcción de la ficha es on-demand: la primera carga puede
 * tardar 15-40s (Wikidata + INE + Google News + Groq). Subsecuentes
 * cargas se sirven de caché.
 */
import AppHeader from '../../../_components/AppHeader'
import FichaTerritorialView from '../../../_components/fichas/ficha-territorial-view'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function Page({ params }: { params: { cod: string } }) {
  return (
    <div style={{ background: '#F5F5F7', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 80px' }}>
        <FichaTerritorialView cod={params.cod} />
      </main>
    </div>
  )
}
