import { redirect } from 'next/navigation'

// UNIFICACIÓN · el listado de Diputaciones ya no es una página aparte: todas
// las personas viven en /dosieres ("Personas"), con barra de tipos y filtros.
// Redirigimos para que todo esté en un único sitio. El detalle
// /diputaciones/[slug] sigue redirigiendo a /dosieres/[slug].
export default function DiputacionesRedirect() {
  redirect('/dosieres')
}
