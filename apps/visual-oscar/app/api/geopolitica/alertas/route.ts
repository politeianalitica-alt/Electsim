import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const real = await fromBackend<Record<string, unknown>>('/api/geopolitica/alertas-geo?limite=40')
  if (real && typeof real === 'object') return NextResponse.json(withMeta(real, 'backend'))

  const now = new Date().toISOString()
  const mock = {
    data: [
      {
        id: '1', nivel: 'CRITICO', titulo: 'Crisis migratoria Canarias — llegadas en máximo histórico',
        descripcion: 'Las llegadas irregulares a Canarias superan el récord de 2023, con 2.400 personas en la última semana. Presión extrema en centros de acogida.',
        fecha: now, paises: ['Marruecos', 'Senegal', 'Mali'],
        fuente: 'FRONTEX + ACLED',
        cadena_causal: 'Inestabilidad Sahel → Desplazamiento masivo poblaciones → Rutas Atlántico activadas → Llegadas Canarias +340% → Crisis acogida España',
        fuentes_evidencia: [
          { titulo: 'FRONTEX Report: Western Mediterranean Route Q1 2026', fuente: 'FRONTEX', url: 'https://frontex.europa.eu', fecha: now, confianza: 0.92 },
          { titulo: 'Mali security deterioration: ACLED data', fuente: 'ACLED', url: 'https://acleddata.com', fecha: now, confianza: 0.88 },
          { titulo: 'Mixed Migration Monitor March 2026', fuente: 'Mixed Migration Centre', url: 'https://mixedmigration.org', fecha: now, confianza: 0.85 },
        ],
        probabilidad: 0.92, horizonte: 'inmediato', confianza_sistema: 0.89,
      },
      {
        id: '2', nivel: 'ALTO', titulo: 'Escalada tensión energética — suministro gas Argelia',
        descripcion: 'Incidentes diplomáticos con Argelia ponen en riesgo el 45% del suministro de gas natural de España a través del Medgaz.',
        fecha: now, paises: ['Argelia'],
        fuente: 'OIES + Reuters',
        cadena_causal: 'Tensión diplomática ESP-DZA → Amenaza interrupción Medgaz → 45% gas nacional en riesgo → Subida precios energía → Impacto industria española',
        fuentes_evidencia: [
          { titulo: 'Algeria-Spain gas relations: risks and alternatives', fuente: 'OIES Oxford', url: 'https://www.oxfordenergy.org', fecha: now, confianza: 0.85 },
          { titulo: 'Medgaz pipeline: operational status update', fuente: 'Naturgy', url: 'https://www.naturgy.com', fecha: now, confianza: 0.82 },
        ],
        probabilidad: 0.65, horizonte: 'corto', confianza_sistema: 0.80,
      },
      {
        id: '3', nivel: 'ALTO', titulo: 'Aranceles EE.UU. a productos agroalimentarios españoles',
        descripcion: 'La nueva política arancelaria de Washington afecta exportaciones españolas por valor estimado de 2.800M€: aceite de oliva, vino, automóviles.',
        fecha: now, paises: ['EE.UU.'],
        fuente: 'Comisión Europea',
        cadena_causal: 'Política comercial EE.UU. → Aranceles 25% agroalimentario → Pérdida competitividad exportaciones → Impacto 2.800M€ balanza comercial',
        fuentes_evidencia: [
          { titulo: 'EU-US trade tensions: Spanish exposure assessment', fuente: 'Bruegel', url: 'https://www.bruegel.org', fecha: now, confianza: 0.80 },
          { titulo: 'Spanish agricultural exports at risk', fuente: 'ICEX', url: 'https://www.icex.es', fecha: now, confianza: 0.88 },
        ],
        probabilidad: 0.72, horizonte: 'corto', confianza_sistema: 0.82,
      },
      {
        id: '4', nivel: 'MEDIO', titulo: 'Ciberataques a infraestructura crítica — atribución APT ruso',
        descripcion: 'El CCN-CERT detecta campaña coordinada contra sistemas de gestión de red eléctrica y puertos. Patrones consistentes con APT28.',
        fecha: now, paises: ['Rusia'],
        fuente: 'CCN-CERT',
        cadena_causal: 'APT28 Rusia → Intrusión sistemas SCADA → Potencial interrupción servicios → Riesgo infraestructura crítica España',
        fuentes_evidencia: [
          { titulo: 'Russian cyber operations against NATO southern flank', fuente: 'EUISS', url: 'https://www.iss.europa.eu', fecha: now, confianza: 0.75 },
        ],
        probabilidad: 0.55, horizonte: 'inmediato', confianza_sistema: 0.72,
      },
      {
        id: '5', nivel: 'MEDIO', titulo: 'Tensión Marruecos-España — activación narrativa Ceuta/Melilla',
        descripcion: 'Incremento de retórica soberanista marroquí sobre Ceuta y Melilla coincide con acumulación de efectivos en frontera norte.',
        fecha: now, paises: ['Marruecos'],
        fuente: 'ACLED + Elcano',
        cadena_causal: 'Discurso soberanista MAR → Presión fronteriza Ceuta/Melilla → Tensión bilateral → Riesgo incidente diplomatic',
        fuentes_evidencia: [
          { titulo: 'Morocco security dynamics: border pressure analysis', fuente: 'Real Instituto Elcano', url: 'https://www.realinstitutoelcano.org', fecha: now, confianza: 0.82 },
          { titulo: 'ACLED North Africa: March 2026', fuente: 'ACLED', url: 'https://acleddata.com', fecha: now, confianza: 0.78 },
        ],
        probabilidad: 0.45, horizonte: 'medio', confianza_sistema: 0.77,
      },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
