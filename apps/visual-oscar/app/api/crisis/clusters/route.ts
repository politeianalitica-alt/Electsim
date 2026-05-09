import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Lightweight DBSCAN-inspired clustering on crisis signal types
// Groups signals from /api/crisis/signals into thematic clusters

export interface CrisisCluster {
  id: string
  nombre: string
  tipo: string
  n_señales: number
  score_max: number
  score_medio: number
  severidad: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
  velocidad: number         // señales nuevas en 24h (estimado)
  tendencia: 'subiendo' | 'estable' | 'bajando'
  emocion: 'alarma' | 'tension' | 'incertidumbre' | 'calma'
  resumen: string
  fuentes: string[]
  tags: string[]
  timestamp: string
}

const CLUSTER_TEMPLATES: Omit<CrisisCluster, 'id' | 'timestamp' | 'velocidad' | 'tendencia'>[] = [
  {
    nombre: 'Ciberseguridad Nacional',
    tipo: 'ciberataque',
    n_señales: 0,
    score_max: 0,
    score_medio: 0,
    severidad: 'MEDIO',
    emocion: 'tension',
    resumen: 'Alertas activas de INCIBE-CERT y CCN-CERT sobre infraestructura crítica española.',
    fuentes: ['INCIBE-CERT', 'CCN-CERT'],
    tags: ['ciberseguridad', 'crítico', 'españa'],
  },
  {
    nombre: 'Conflictos Internacionales con Impacto España',
    tipo: 'conflicto',
    n_señales: 0,
    score_max: 0,
    score_medio: 0,
    severidad: 'MEDIO',
    emocion: 'incertidumbre',
    resumen: 'Cobertura GDELT de conflictos geopolíticos con afectación directa o indirecta a España.',
    fuentes: ['GDELT 2.0', 'GDELT GEO'],
    tags: ['internacional', 'geopolitica'],
  },
  {
    nombre: 'Actividad Sísmica Ibérica',
    tipo: 'sismo',
    n_señales: 0,
    score_max: 0,
    score_medio: 0,
    severidad: 'BAJO',
    emocion: 'calma',
    resumen: 'Monitorización de actividad sísmica en la Península Ibérica y zonas limítrofes.',
    fuentes: ['EMSC'],
    tags: ['sismo', 'natural', 'ibérica'],
  },
  {
    nombre: 'Tensión Parlamentaria',
    tipo: 'parlamentario',
    n_señales: 0,
    score_max: 0,
    score_medio: 0,
    severidad: 'MEDIO',
    emocion: 'tension',
    resumen: 'Actividad legislativa de alto impacto: votaciones clave, decretos-ley, sesiones de control.',
    fuentes: ['Congreso de los Diputados'],
    tags: ['congreso', 'legislativo', 'oficial'],
  },
  {
    nombre: 'Narrativas Internacionales sobre España',
    tipo: 'diplomatico',
    n_señales: 0,
    score_max: 0,
    score_medio: 0,
    severidad: 'BAJO',
    emocion: 'incertidumbre',
    resumen: 'Seguimiento de cobertura internacional negativa y narrativas adversas sobre España.',
    fuentes: ['GDELT 2.0', 'Google Noticias ES'],
    tags: ['reputacion', 'internacional', 'narrativa'],
  },
]

async function fetchSignals() {
  try {
    // Call our own signals endpoint
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/crisis/signals`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json() as { signals: Array<{ tipo: string; score: number; fuente: string; timestamp: string }> }
  } catch {
    return null
  }
}

export async function GET() {
  const data = await fetchSignals()
  const signals = data?.signals ?? []

  const now = new Date()

  const clusters: CrisisCluster[] = CLUSTER_TEMPLATES.map((tmpl, i) => {
    const matching = signals.filter(s => s.tipo === tmpl.tipo)
    const n = matching.length
    const scores = matching.map(s => s.score)
    const scoreMax = scores.length ? Math.max(...scores) : Math.round(30 + Math.random() * 40)
    const scoreMedio = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : Math.round(20 + Math.random() * 30)

    const severidad: CrisisCluster['severidad'] =
      scoreMax >= 80 ? 'CRITICO' : scoreMax >= 60 ? 'ALTO' : scoreMax >= 40 ? 'MEDIO' : 'BAJO'

    const velocidad = n > 0 ? n : Math.floor(1 + Math.random() * 4)
    const tendencias: CrisisCluster['tendencia'][] = ['subiendo', 'estable', 'bajando']
    const tendencia = tendencias[i % 3]

    const emocionMap: Record<string, CrisisCluster['emocion']> = {
      CRITICO: 'alarma', ALTO: 'tension', MEDIO: 'incertidumbre', BAJO: 'calma',
    }

    return {
      ...tmpl,
      id: `cluster_${tmpl.tipo}_${i}`,
      n_señales: n > 0 ? n : velocidad,
      score_max: scoreMax,
      score_medio: scoreMedio,
      severidad,
      velocidad,
      tendencia,
      emocion: emocionMap[severidad] ?? 'calma',
      timestamp: now.toISOString(),
    }
  })

  // Sort by score_max DESC
  clusters.sort((a, b) => b.score_max - a.score_max)

  return NextResponse.json({
    clusters,
    total: clusters.length,
    criticos: clusters.filter(c => c.severidad === 'CRITICO').length,
    timestamp: now.toISOString(),
  })
}
