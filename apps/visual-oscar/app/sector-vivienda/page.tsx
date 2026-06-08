/**
 * /sector-vivienda · Politeia Vivienda v3 · Sprint V1
 *
 * Página delgada: delega TODA la lógica en <ViviendaShell />. La página vieja
 * de 581 líneas con KPIs+IPV+compraventas+IPVA+programas+empresas+reguladores
 * + áreas + licitaciones + sector intel + cuaderno se ha reestructurado:
 *
 *   - Shell con 8 sub-tabs (Visión Global, Precios, Mercado, Alquiler,
 *     Política, Vivienda social, Turística, Sostenibilidad).
 *   - Visión Global preserva 100% del contenido visible anterior.
 *   - Vivienda social (V1 preview) ya entrega el directorio de 12 ONGs
 *     curadas con scope, ámbito, NIF público, memoria anual y keywords BDNS.
 *   - El resto de sub-tabs son stubs honestos hasta los sprints V2-V10.
 *
 * Catálogos hardcoded (programas, empresas, reguladores, áreas) trasladados
 * a `lib/vivienda/catalogos/*.json` con fuente verificable en cada entrada.
 */
import ViviendaShell from './_components/ViviendaShell'

export default function SectorViviendaPage() {
  return <ViviendaShell />
}
