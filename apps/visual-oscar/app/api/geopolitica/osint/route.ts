import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  // Use the real events endpoint (queries news_articles with spain impact filter)
  const real = await fromBackend<Array<Record<string, unknown>>>('/geopolitica/events?limit=20')
  if (Array.isArray(real) && real.length > 0) {
    const data = real.map((e, i) => ({
      id: String(i + 1),
      titulo: String(e.title ?? e.description ?? ''),
      fuente: String(e.source ?? 'Internacional'),
      fecha: String(e.date ?? new Date().toISOString()),
      urgencia: Math.round(Math.min(5, (Number(e.impact ?? 50) / 100) * 5)),
      categoria: String(e.type ?? 'diplomatica').toLowerCase().replace(' ', '_'),
      resumen: String(e.description ?? e.title ?? ''),
    }))
    return NextResponse.json(withMeta({ data }, 'backend'))
  }
  const mock = {
    data: [
      {
        id: '1', titulo: 'Reunión bilateral España-Marruecos sobre migración',
        fuente: 'El País', fecha: new Date().toISOString(), urgencia: 4,
        categoria: 'migracion', resumen: 'Los ministros de exteriores acordaron nuevas medidas de control migratorio.',
      },
      {
        id: '2', titulo: 'OTAN reafirma compromiso con España en el Mediterráneo',
        fuente: 'ABC', fecha: new Date().toISOString(), urgencia: 3,
        categoria: 'militar', resumen: 'La alianza confirma presencia naval ampliada en aguas españolas.',
      },
      {
        id: '3', titulo: 'Tensión energética: España reduce dependencia del gas argelino',
        fuente: 'El Mundo', fecha: new Date().toISOString(), urgencia: 2,
        categoria: 'energia', resumen: 'El Gobierno diversifica proveedores con nuevos acuerdos de GNL.',
      },
      {
        id: '4', titulo: 'Aranceles EE.UU. impactan exportaciones agroalimentarias',
        fuente: 'Expansión', fecha: new Date().toISOString(), urgencia: 4,
        categoria: 'diplomatica', resumen: 'Exposición estimada de 4.200 M€ en vino, aceite y conservas.',
      },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
