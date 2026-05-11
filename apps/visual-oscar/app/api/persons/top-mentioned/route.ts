import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface TopPerson {
  name: string
  label: string
  mentions: number
  pos: number
  neg: number
  neu: number
  sent_polarity: number
  avg_relevance: number
  last_seen: string | null
}

const HOURS_AGO = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

const MOCK_PERSONS: TopPerson[] = [
  { name: 'pedro-sanchez',       label: 'Pedro Sánchez',          mentions: 187, pos: 38, neg: 102, neu: 47, sent_polarity: -0.34, avg_relevance: 0.81, last_seen: HOURS_AGO(2) },
  { name: 'alberto-feijoo',      label: 'Alberto Núñez Feijóo',   mentions: 142, pos: 51, neg:  58, neu: 33, sent_polarity: -0.05, avg_relevance: 0.78, last_seen: HOURS_AGO(3) },
  { name: 'santiago-abascal',    label: 'Santiago Abascal',       mentions:  98, pos: 22, neg:  56, neu: 20, sent_polarity: -0.35, avg_relevance: 0.69, last_seen: HOURS_AGO(5) },
  { name: 'yolanda-diaz',        label: 'Yolanda Díaz',           mentions:  87, pos: 36, neg:  31, neu: 20, sent_polarity: +0.06, avg_relevance: 0.72, last_seen: HOURS_AGO(4) },
  { name: 'isabel-diaz-ayuso',   label: 'Isabel Díaz Ayuso',      mentions:  79, pos: 28, neg:  37, neu: 14, sent_polarity: -0.11, avg_relevance: 0.74, last_seen: HOURS_AGO(6) },
  { name: 'miriam-nogueras',     label: 'Miriam Nogueras',        mentions:  68, pos: 14, neg:  36, neu: 18, sent_polarity: -0.32, avg_relevance: 0.76, last_seen: HOURS_AGO(2) },
  { name: 'aitor-esteban',       label: 'Aitor Esteban',          mentions:  54, pos: 21, neg:  18, neu: 15, sent_polarity: +0.06, avg_relevance: 0.70, last_seen: HOURS_AGO(8) },
  { name: 'gabriel-rufian',      label: 'Gabriel Rufián',         mentions:  51, pos: 18, neg:  22, neu: 11, sent_polarity: -0.08, avg_relevance: 0.68, last_seen: HOURS_AGO(10) },
  { name: 'salvador-illa',       label: 'Salvador Illa',          mentions:  42, pos: 17, neg:  16, neu:  9, sent_polarity: +0.02, avg_relevance: 0.65, last_seen: HOURS_AGO(12) },
  { name: 'juan-manuel-moreno',  label: 'Juan Manuel Moreno',     mentions:  38, pos: 18, neg:  12, neu:  8, sent_polarity: +0.16, avg_relevance: 0.66, last_seen: HOURS_AGO(7) },
  { name: 'maria-jesus-montero', label: 'María Jesús Montero',    mentions:  36, pos: 12, neg:  17, neu:  7, sent_polarity: -0.14, avg_relevance: 0.67, last_seen: HOURS_AGO(5) },
  { name: 'felix-bolanos',       label: 'Félix Bolaños',          mentions:  34, pos: 11, neg:  16, neu:  7, sent_polarity: -0.15, avg_relevance: 0.68, last_seen: HOURS_AGO(9) },
  { name: 'juan-lobato',         label: 'Juan Lobato',            mentions:  28, pos: 10, neg:  12, neu:  6, sent_polarity: -0.07, avg_relevance: 0.61, last_seen: HOURS_AGO(14) },
  { name: 'pere-aragones',       label: 'Pere Aragonès',          mentions:  24, pos: 10, neg:   9, neu:  5, sent_polarity: +0.04, avg_relevance: 0.63, last_seen: HOURS_AGO(11) },
  { name: 'arnaldo-otegi',       label: 'Arnaldo Otegi',          mentions:  21, pos:  6, neg:  11, neu:  4, sent_polarity: -0.24, avg_relevance: 0.64, last_seen: HOURS_AGO(15) },
]

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/persons/top-mentioned${params ? '?' + params : ''}`
  const real = await fromBackend<{ persons: TopPerson[]; total_unique: number }>(path)
  if (real && Array.isArray(real.persons) && real.persons.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({
    persons: MOCK_PERSONS,
    total_unique: MOCK_PERSONS.length,
  }, 'mock'))
}
