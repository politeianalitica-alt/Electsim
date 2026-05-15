import { redirect } from 'next/navigation'

/**
 * /workspace · ruta legacy redirigida al nuevo War Room unificado.
 * El contenido del Command Center vive ahora en /war-room (Estudio · War Room).
 */
export default function WorkspaceRedirectPage() {
  redirect('/war-room')
}
