'use client'

/**
 * Error boundary del Cuaderno. Las notas viven en localStorage: un throw en
 * cliente no las toca — el panel lo deja claro. Panel unificado: ErrorPanel.
 */

import ErrorPanel, { type ErrorBoundaryProps } from '@/app/_components/ErrorPanel'

export default function CuadernoError({ error, reset }: ErrorBoundaryProps) {
  return (
    <ErrorPanel
      error={error}
      reset={reset}
      scope="cuaderno"
      titulo="El Cuaderno ha fallado"
      descripcion="Tus notas siguen guardadas en este navegador. Reintenta; si persiste, recarga la página."
    />
  )
}
