/**
 * /inicio · LEGACY · esta ruta ha sido reemplazada por /dashboard como
 * pantalla de inicio única. Mantenemos la URL viva con un redirect
 * server-side para no romper bookmarks ni links antiguos.
 */

import { redirect } from 'next/navigation'

export default function InicioRedirect() {
  redirect('/dashboard')
}
