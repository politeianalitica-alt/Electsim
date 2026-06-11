import { redirect } from 'next/navigation'

/**
 * /operaciones — ruta legacy del "Centro de Operaciones del Analista".
 * La página original (354 líneas + CSS) llevaba meses fuera de la
 * navegación; su sucesor funcional es el Toolbox. Redirect permanente
 * para no romper bookmarks (mismo patrón que /workspace → /war-room).
 */
export default function OperacionesRedirect() {
  redirect('/extras')
}
