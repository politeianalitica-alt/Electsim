import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import type { IniciativaLegislativa } from '@/types/legislativo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function makeMockMonitor(): IniciativaLegislativa[] {
  return [
    {
      id: 'ini001',
      titulo: 'Proyecto de Ley de Regulación de la Inteligencia Artificial',
      tipo: 'proyecto_de_ley',
      estado: 'en_comision',
      fecha_presentacion: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      fecha_ultima_actualizacion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      grupo_proponente: 'GPS',
      comision_tramitacion: 'Economía, Comercio y Transformación Digital',
      descripcion: 'Transpone el Reglamento Europeo de IA y establece el marco regulatorio nacional para sistemas de IA de alto riesgo.',
      etiquetas: ['tecnología', 'IA', 'regulación'],
      relevancia_score: 9.2,
      dias_en_tramite: 45,
      probabilidad_aprobacion: 0.72,
    },
    {
      id: 'ini002',
      titulo: 'Proposición de Ley de Acceso a la Vivienda (reforma)',
      tipo: 'proposicion_de_ley',
      estado: 'en_tramite',
      fecha_presentacion: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      fecha_ultima_actualizacion: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      grupo_proponente: 'GSUMAR',
      grupos_apoyo: ['GPS'],
      descripcion: 'Ampliación de la ley de vivienda de 2023 con topes de alquiler en zonas tensionadas adicionales.',
      etiquetas: ['vivienda', 'alquiler', 'social'],
      relevancia_score: 8.7,
      dias_en_tramite: 120,
      probabilidad_aprobacion: 0.41,
    },
    {
      id: 'ini003',
      titulo: 'Reforma de la Ley de Financiación Autonómica',
      tipo: 'proyecto_de_ley',
      estado: 'en_tramite',
      fecha_presentacion: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
      fecha_ultima_actualizacion: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      grupo_proponente: 'GPS',
      descripcion: 'Nueva fórmula de reparto de recursos entre Estado y Comunidades Autónomas, con tratamiento singular para Catalunya.',
      etiquetas: ['financiación', 'CCAA', 'fiscal'],
      relevancia_score: 9.8,
      dias_en_tramite: 200,
      probabilidad_aprobacion: 0.28,
    },
  ]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? 20)

  const real = await fromBackend<IniciativaLegislativa[] | { data?: IniciativaLegislativa[] }>(
 `/api/legislativo/monitor?limit=${limit}`
  )

  if (Array.isArray(real) && real.length > 0) {
    return NextResponse.json(withMeta({ data: real.slice(0, limit) }, 'backend'))
  }
  if (real && !Array.isArray(real) && Array.isArray((real as { data?: IniciativaLegislativa[] }).data)) {
    return NextResponse.json(withMeta({ data: (real as { data: IniciativaLegislativa[] }).data }, 'backend'))
  }
  return NextResponse.json(withMeta({ data: makeMockMonitor() }, 'mock'))
}
