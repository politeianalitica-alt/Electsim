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
        id: '1',
        titulo: 'Escalada en el Sahel: implicaciones para la seguridad de España',
        fuente: 'Real Instituto Elcano',
        fecha: new Date().toISOString(),
        urgencia: 4,
        categoria: 'militar',
        resumen: 'El deterioro de la situación en Mali, Burkina Faso y Níger amplifica los riesgos de tráfico de personas y armas hacia el Magreb. España, con sus enclaves en el norte de África y presencia en la misión EUTM Mali, queda directamente expuesta a la inestabilidad regional.',
      },
      {
        id: '2',
        titulo: 'Autonomía estratégica europea ante el nuevo ciclo electoral en EEUU',
        fuente: 'ECFR',
        fecha: new Date().toISOString(),
        urgencia: 3,
        categoria: 'diplomatica',
        resumen: 'El Consejo Europeo de Relaciones Exteriores analiza cómo el resultado de las elecciones estadounidenses redefine la agenda transatlántica y acelera el debate sobre la independencia defensiva de la UE. España aboga por un pilar europeo de la OTAN más robusto y una política industrial de defensa común.',
      },
      {
        id: '3',
        titulo: 'Tensión en Kosovo: riesgo de escalada tras incidentes fronterizos',
        fuente: 'ICG CrisisWatch',
        fecha: new Date().toISOString(),
        urgencia: 4,
        categoria: 'militar',
        resumen: 'El International Crisis Group registra un aumento de incidentes en la frontera norte de Kosovo con Serbia, con presencia de grupos paramilitares y retórica nacionalista elevada en Belgrado. La misión KFOR, donde participa España, permanece en alerta reforzada.',
      },
      {
        id: '4',
        titulo: 'Análisis del apoyo militar occidental a Ucrania: cuellos de botella logísticos',
        fuente: 'RUSI',
        fecha: new Date().toISOString(),
        urgencia: 5,
        categoria: 'militar',
        resumen: 'El Royal United Services Institute identifica déficits críticos en la cadena de suministro de artillería de 155 mm y sistemas de defensa aérea de medio alcance. España, que ha transferido material HAWK y obuses M109, se enfrenta a la presión de reponer sus propias reservas estratégicas.',
      },
      {
        id: '5',
        titulo: 'Diversificación energética española: reducción de la dependencia argelina',
        fuente: 'OIES',
        fecha: new Date().toISOString(),
        urgencia: 3,
        categoria: 'energia',
        resumen: 'El Oxford Institute for Energy Studies documenta cómo España ha reducido del 40% al 26% su cuota de gas argelino en dos años, mediante nuevos contratos de GNL con Nigeria, Qatar y EEUU. El gasoducto Medgaz sigue operativo pero su peso relativo en la cesta energética española disminuye progresivamente.',
      },
      {
        id: '6',
        titulo: 'Indo-Pacífico 2025: reposicionamiento de alianzas en el arco de islas',
        fuente: 'Atlantic Council',
        fecha: new Date().toISOString(),
        urgencia: 2,
        categoria: 'diplomatica',
        resumen: 'El Atlantic Council analiza el fortalecimiento del marco AUKUS y la ampliación del Quad como ejes de la nueva arquitectura de seguridad en el Indo-Pacífico. España, sin presencia directa en la región, sigue este proceso con interés por sus implicaciones para el comercio marítimo y las inversiones empresariales en Asia.',
      },
      {
        id: '7',
        titulo: 'Marruecos-España: nuevo acuerdo migratorio y sus contrapartidas políticas',
        fuente: 'CIDOB',
        fecha: new Date().toISOString(),
        urgencia: 4,
        categoria: 'migracion',
        resumen: 'El Barcelona Centre for International Affairs analiza el nuevo entendimiento bilateral que incluye financiación española para gestión de fronteras marroquíes a cambio de mayor cooperación en retornos. El acuerdo implica concesiones implícitas sobre el Sáhara Occidental que generan tensiones con Argelia y grupos de la sociedad civil española.',
      },
      {
        id: '8',
        titulo: 'Drones FPV y la transformación de la guerra de trincheras en Ucrania',
        fuente: 'War on the Rocks',
        fecha: new Date().toISOString(),
        urgencia: 3,
        categoria: 'militar',
        resumen: 'El análisis examina cómo los drones de primera persona han cambiado radicalmente la ecuación táctica en el frente oriental, reduciendo la eficacia de los blindados convencionales. Las fuerzas armadas españolas estudian las lecciones aprendidas para adaptar su doctrina de combate terrestre y sus programas de adquisición.',
      },
      {
        id: '9',
        titulo: 'Política de defensa europea: avances en PESCO y capacidades conjuntas',
        fuente: 'EUISS',
        fecha: new Date().toISOString(),
        urgencia: 2,
        categoria: 'diplomatica',
        resumen: 'El Instituto de Estudios de Seguridad de la UE evalúa los progresos en los 60 proyectos PESCO activos, destacando avances en vigilancia marítima, ciberdefensa y movilidad militar. España lidera el proyecto EUROSUR de vigilancia de fronteras y participa en ocho iniciativas adicionales de capacidades conjuntas.',
      },
      {
        id: '10',
        titulo: 'Ruta atlántica 2025: récord histórico de llegadas a Canarias',
        fuente: 'Mixed Migration Centre',
        fecha: new Date().toISOString(),
        urgencia: 5,
        categoria: 'migracion',
        resumen: 'El Mixed Migration Centre registra más de 42.000 llegadas irregulares a Canarias en los primeros cuatro meses de 2025, superando todos los registros previos. El colapso de los sistemas de acogida en las islas, unido a la presión diplomática sobre Mauritania y Senegal, sitúa la ruta atlántica como la crisis migratoria más urgente de España.',
      },
      {
        id: '11',
        titulo: 'Expansión del crimen organizado venezolano en Europa occidental',
        fuente: 'InSight Crime',
        fecha: new Date().toISOString(),
        urgencia: 4,
        categoria: 'seguridad',
        resumen: 'InSight Crime documenta cómo el Tren de Aragua y otras organizaciones criminales venezolanas han establecido redes en España, Portugal e Italia, aprovechando las comunidades diaspóricas y las rutas del narcotráfico atlántico. Las autoridades españolas han iniciado operaciones coordinadas con Europol para desmantelar células activas en Madrid, Valencia y Barcelona.',
      },
      {
        id: '12',
        titulo: 'Gasto en defensa europeo: España aumenta presupuesto hacia objetivo OTAN 2%',
        fuente: 'SIPRI',
        fecha: new Date().toISOString(),
        urgencia: 2,
        categoria: 'militar',
        resumen: 'El Instituto Internacional de Investigación para la Paz de Estocolmo constata que España incrementó su gasto en defensa un 12% en 2024, alcanzando el 1,28% del PIB. La hoja de ruta acordada con la OTAN prevé alcanzar el umbral del 2% antes de 2029 mediante un plan plurianual de inversión en capacidades estratégicas.',
      },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
