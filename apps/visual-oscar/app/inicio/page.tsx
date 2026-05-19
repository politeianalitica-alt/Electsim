/**
 * /inicio · pantalla de inicio · ahora apunta al Panel Ejecutivo.
 *
 * Mantenemos la ruta viva con un redirect server-side para no romper
 * el flujo de login (router.push('/inicio') sigue funcionando) ni los
 * bookmarks o links antiguos.
 */

import { redirect } from 'next/navigation'

export default function InicioRedirect() {
  redirect('/dashboard')
}
