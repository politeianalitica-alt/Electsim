'use client'

/** Error boundary del Toolbox (/extras). Panel unificado: ErrorPanel. */

import ErrorPanel, { type ErrorBoundaryProps } from '@/app/_components/ErrorPanel'

export default function ToolboxError({ error, reset }: ErrorBoundaryProps) {
  return (
    <ErrorPanel
      error={error}
      reset={reset}
      scope="toolbox"
      titulo="El Toolbox ha fallado"
      descripcion="Puedes reintentar o volver al panel ejecutivo desde la barra superior."
    />
  )
}
