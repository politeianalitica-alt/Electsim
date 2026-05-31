import type { Metadata } from 'next'
import FuenteDetalleClient from './_components/FuenteDetalleClient'

export const metadata: Metadata = { title: 'Detalle de fuente · Estudio | Politeia Analítica' }

export default function FuenteDetallePage({ params }: { params: { id: string } }) {
  return <FuenteDetalleClient id={params.id} />
}
