/**
 * /ficha/politico/[id] · Página pública de ficha de político dinámica.
 *
 * `id` puede ser:
 *   - QID Wikidata: /ficha/politico/Q186200 (Pedro Sánchez)
 *   - Slug: /ficha/politico/yolanda_diaz?nombre=Yolanda%20Díaz
 *     (en slug, ?nombre= es necesario para resolver vía Wikidata)
 */
import AppHeader from '../../../_components/AppHeader'
import FichaPoliticoView from '../../../_components/fichas/ficha-politico-view'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function Page({
  params, searchParams,
}: {
  params: { id: string }
  searchParams: { nombre?: string }
}) {
  return (
    <div style={{ background: '#F5F5F7', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 80px' }}>
        <FichaPoliticoView id={params.id} nombre={searchParams.nombre} />
      </main>
    </div>
  )
}
