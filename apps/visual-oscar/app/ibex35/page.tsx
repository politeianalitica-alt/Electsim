import { redirect } from 'next/navigation'

// UNIFICACIÓN · el listado de IBEX 35 ya no es una página aparte: todas las
// personas y empresas viven en /dosieres ("Personas"), con barra de tipos y
// subcategoría (Empresarios -> IBEX 35). Redirigimos para que todo esté en un
// único sitio. El detalle /ibex35/[slug] sigue redirigiendo a /dosieres/[slug].
export default function IbexRedirect() {
  redirect('/dosieres')
}
